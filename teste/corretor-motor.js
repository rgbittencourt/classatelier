/* ClassAtelier — motor do corretor ortográfico.
 * Lê dicionários no formato Hunspell (.aff + .dic) sem expandir todas as formas de cada palavra
 * (o que levaria minutos no pt-BR): guarda só os radicais e confere cada palavra tirando prefixos e
 * sufixos. Cobre o que os dicionários pt-BR e en-US usam: PFX/SFX (com «combina com prefixo»),
 * FORBIDDENWORD, NEEDAFFIX, ONLYINCOMPOUND, KEEPCASE, ICONV, MAP, REP e TRY.
 * Sem DOM: roda no navegador (window.CorretorMotor) e no Node (module.exports), para teste. */
(function (root) {
  "use strict";

  function Dict(aff, dic) {
    this.words = new Map();          // radical -> string de flags
    this.sfx = new Map();            // texto do sufixo -> [regra]
    this.pfx = new Map();            // texto do prefixo -> [regra]
    this.maxSfx = 0; this.maxPfx = 0;
    this.forbidden = ""; this.needAffix = ""; this.onlyCompound = ""; this.keepCase = ""; this.noSuggest = "";
    this.iconv = []; this.map = []; this.rep = []; this.tryChars = "";
    this.extra = new Set();          // palavras do usuário (dicionário pessoal), em minúsculas
    this.extraExact = new Set();     // palavras do usuário com a caixa original (siglas, nomes)
    this._parseAff(aff);
    this._parseDic(dic);
  }

  Dict.prototype._parseAff = function (text) {
    var lines = String(text).split(/\r?\n/), cur = null;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/\s+#.*$/, "").trim();
      if (!l || l[0] === "#") continue;
      var p = l.split(/\s+/), k = p[0];
      if (k === "SFX" || k === "PFX") {
        if (p.length <= 4) { cur = { flag: p[1], cross: p[2] === "Y" }; continue; }     // cabeçalho do grupo
        var strip = p[2] === "0" ? "" : p[2], add = p[3], cont = "";
        var sl = add.indexOf("/"); if (sl >= 0) { cont = add.slice(sl + 1); add = add.slice(0, sl); }
        if (add === "0") add = "";
        var rule = { flag: cur.flag, cross: cur.cross, strip: strip, add: add, cont: cont, cond: p[4] || ".", re: null, pre: k === "PFX" };
        var m = k === "SFX" ? this.sfx : this.pfx;
        var arr = m.get(add); if (!arr) { arr = []; m.set(add, arr); } arr.push(rule);
        if (k === "SFX") { if (add.length > this.maxSfx) this.maxSfx = add.length; } else if (add.length > this.maxPfx) this.maxPfx = add.length;
      } else if (k === "FORBIDDENWORD") this.forbidden = p[1] || "";
      else if (k === "NEEDAFFIX" || k === "PSEUDOROOT") this.needAffix = p[1] || "";
      else if (k === "ONLYINCOMPOUND") this.onlyCompound = p[1] || "";
      else if (k === "KEEPCASE") this.keepCase = p[1] || "";
      else if (k === "NOSUGGEST") this.noSuggest = p[1] || "";
      else if (k === "TRY") this.tryChars = p[1] || "";
      else if (k === "ICONV" && p.length >= 3) this.iconv.push([p[1], p[2]]);
      else if (k === "MAP" && p.length === 2 && isNaN(+p[1])) this.map.push(p[1]);
      else if (k === "REP" && p.length >= 3) this.rep.push([p[1], p[2].replace(/_/g, " ")]);
    }
  };

  Dict.prototype._parseDic = function (text) {
    var lines = String(text).split(/\r?\n/);
    for (var i = 1; i < lines.length; i++) {
      var l = lines[i]; if (!l) continue;
      var sp = l.indexOf("\t"); if (sp > 0) l = l.slice(0, sp);                    // morfologia após TAB
      var sl = -1;
      for (var j = 0; j < l.length; j++) { if (l[j] === "/" && l[j - 1] !== "\\") { sl = j; break; } }
      var w = sl >= 0 ? l.slice(0, sl) : l, fl = sl >= 0 ? l.slice(sl + 1) : "";
      var sp2 = fl.indexOf(" "); if (sp2 > 0) fl = fl.slice(0, sp2);
      w = w.replace(/\\\//g, "/").trim(); if (!w) continue;
      var prev = this.words.get(w);
      this.words.set(w, prev !== undefined ? prev + fl : fl);
    }
  };

  function condRe(rule) {
    if (rule.re) return rule.re;
    try { rule.re = new RegExp(rule.pre ? "^(?:" + rule.cond + ")" : "(?:" + rule.cond + ")$"); }
    catch (e) { rule.re = /^/; }
    return rule.re;
  }

  // O radical `stem` existe no dicionário e aceita a regra (flag) — e não é «só afixo» nem proibido?
  Dict.prototype._stemOk = function (stem, flag, viaAffix) {
    var f = this.words.get(stem);
    if (f === undefined) return false;
    if (this.forbidden && f.indexOf(this.forbidden) >= 0) return false;
    if (this.onlyCompound && f.indexOf(this.onlyCompound) >= 0) return false;
    if (flag && f.indexOf(flag) < 0) return false;
    return true;
  };

  // Procura `word` como radical + sufixo (e prefixo). depth limita sufixos encadeados.
  Dict.prototype._viaAffixes = function (word, depth) {
    var self = this, n = word.length, k, rules, r, i, stem, f;
    // só sufixo
    for (k = 0; k <= Math.min(this.maxSfx, n - 1); k++) {
      rules = this.sfx.get(k ? word.slice(n - k) : "");
      if (!rules) continue;
      for (i = 0; i < rules.length; i++) {
        r = rules[i]; stem = word.slice(0, n - k) + r.strip;
        if (!stem || !condRe(r).test(stem)) continue;
        f = this.words.get(stem);
        if (f !== undefined && f.indexOf(r.flag) >= 0 && !(this.forbidden && f.indexOf(this.forbidden) >= 0) && !(this.onlyCompound && f.indexOf(this.onlyCompound) >= 0)) return true;
      }
    }
    // prefixo (e prefixo + sufixo quando a regra do prefixo é «combinável»)
    for (k = 1; k <= Math.min(this.maxPfx, n - 1); k++) {
      rules = this.pfx.get(word.slice(0, k));
      if (!rules) continue;
      for (i = 0; i < rules.length; i++) {
        r = rules[i]; stem = r.strip + word.slice(k);
        if (!stem || !condRe(r).test(stem)) continue;
        f = this.words.get(stem);
        if (f !== undefined && f.indexOf(r.flag) >= 0 && !(this.forbidden && f.indexOf(this.forbidden) >= 0) && !(this.onlyCompound && f.indexOf(this.onlyCompound) >= 0)) return true;
        if (r.cross) {            // stem ainda pode ter sufixo
          var m, n2 = stem.length, rs, j, r2, st2, f2;
          for (m = 1; m <= Math.min(this.maxSfx, n2 - 1); m++) {
            rs = this.sfx.get(stem.slice(n2 - m)); if (!rs) continue;
            for (j = 0; j < rs.length; j++) {
              r2 = rs[j]; if (!r2.cross) continue;
              st2 = stem.slice(0, n2 - m) + r2.strip;
              if (!st2 || !condRe(r2).test(st2)) continue;
              f2 = this.words.get(st2);
              if (f2 !== undefined && f2.indexOf(r.flag) >= 0 && f2.indexOf(r2.flag) >= 0 && !(this.forbidden && f2.indexOf(this.forbidden) >= 0)) return true;
            }
          }
        }
      }
    }
    return false;
  };

  function isUpper(c) { return c !== c.toLowerCase() && c === c.toUpperCase(); }
  function capitalize(w) { return w.charAt(0).toUpperCase() + w.slice(1); }

  // Uma palavra (sem espaços) está correta?
  Dict.prototype.check = function (word) {
    word = String(word);
    if (!word) return true;
    for (var q = 0; q < this.iconv.length; q++) if (word.indexOf(this.iconv[q][0]) >= 0) word = word.split(this.iconv[q][0]).join(this.iconv[q][1]);
    if (this.extraExact.has(word) || this.extra.has(word.toLowerCase())) return true;
    var lower = word.toLowerCase(), first = word.charAt(0);
    var allUpper = word.length > 1 && word === word.toUpperCase() && word !== lower;
    var initUpper = isUpper(first) && !allUpper && word.slice(1) === word.slice(1).toLowerCase();
    var cands = [word];
    if (allUpper) { cands.push(capitalize(lower), lower); } else if (initUpper) { cands.push(lower); }
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i], f = this.words.get(c);
      if (f !== undefined) {
        if (this.forbidden && f.indexOf(this.forbidden) >= 0) { continue; }
        if (this.onlyCompound && f.indexOf(this.onlyCompound) >= 0) { continue; }
        if (this.needAffix && f.indexOf(this.needAffix) >= 0) { /* só vale com afixo */ }
        else {
          // KEEPCASE: «ph» minúsculo não vira «Ph» sem estar escrito assim
          if (this.keepCase && f.indexOf(this.keepCase) >= 0 && c !== word) continue;
          // palavra de dicionário com maiúscula (nome próprio) não vale toda em minúscula
          return true;
        }
      }
      if (this._viaAffixes(c, 1)) return true;
    }
    // apóstrofo (d'água, don't sem entrada própria): cada parte precisa estar correta
    if (/['’]/.test(word) && !/^['’]|['’]$/.test(word)) {
      var ap = word.split(/['’]/), okA = true;
      for (var a2 = 0; a2 < ap.length; a2++) if (ap[a2].length > 1 && !this.check(ap[a2])) { okA = false; break; }
      if (okA) return true;
    }
    // hífen: cada parte precisa estar correta (guarda-chuva, bem-vindo se ambos existirem)
    if (word.indexOf("-") > 0 && !/^-|-$/.test(word)) {
      var parts = word.split("-"), ok = true;
      for (var p = 0; p < parts.length; p++) if (parts[p] && !this.check(parts[p])) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  };

  // Sugestões: distância 1 (troca, falta, sobra, inversão), variantes de acento (MAP) e REP, em ordem de afinidade
  // (acento e inversão de letras primeiro; trocar a 1ª letra é o palpite menos provável).
  Dict.prototype.suggest = function (word, max) {
    max = max || 6;
    var self = this, found = [], seen = Object.create(null);
    var lower = word.toLowerCase().replace(/’/g, "'"), isCap = isUpper(word.charAt(0)), isAll = word.length > 1 && word === word.toUpperCase();
    var keepSep = /[-']/.test(lower);
    function fit(w) { return isAll ? w.toUpperCase() : isCap ? capitalize(w) : w; }
    function add(w, tier) {
      if (!w || w === lower || seen[w]) return;
      seen[w] = 1;
      if (!keepSep && /[-']/.test(w)) return;
      var f = self.words.get(w);
      if (f !== undefined && self.noSuggest && f.indexOf(self.noSuggest) >= 0) return;
      if (self.check(w)) found.push({ w: fit(w), t: tier + (w[0] !== lower[0] ? 3 : 0) });
    }
    var i, j, c;
    var fam = Object.create(null);
    this.map.forEach(function (g) { for (var x = 0; x < g.length; x++) fam[g[x]] = g; });
    var pos = [];
    for (i = 0; i < lower.length; i++) if (fam[lower[i]]) pos.push(i);
    pos = pos.slice(0, 8);
    function sub(s, at, ch) { return s.slice(0, at) + ch + s.slice(at + 1); }
    for (i = 0; i < pos.length; i++) {
      var g = fam[lower[pos[i]]];
      for (c = 0; c < g.length; c++) if (g[c] !== lower[pos[i]] && g[c] === g[c].toLowerCase()) add(sub(lower, pos[i], g[c]), 0);
    }
    for (i = 0; i < pos.length; i++) for (j = i + 1; j < pos.length; j++) {
      var gi = fam[lower[pos[i]]], gj = fam[lower[pos[j]]];
      for (var a = 0; a < gi.length; a++) for (var b = 0; b < gj.length; b++) {
        if (gi[a] !== gi[a].toLowerCase() || gj[b] !== gj[b].toLowerCase()) continue;
        if (gi[a] === lower[pos[i]] && gj[b] === lower[pos[j]]) continue;
        add(sub(sub(lower, pos[i], gi[a]), pos[j], gj[b]), 0.5);
      }
    }
    this.rep.forEach(function (r) { var at = lower.indexOf(r[0]); while (at >= 0) { add(lower.slice(0, at) + r[1] + lower.slice(at + r[0].length), 1); at = lower.indexOf(r[0], at + 1); } });
    for (i = 0; i < lower.length - 1; i++) add(lower.slice(0, i) + lower[i + 1] + lower[i] + lower.slice(i + 2), 1);
    for (i = 0; i < lower.length; i++) add(lower.slice(0, i) + lower.slice(i + 1), 2);
    var T = this.tryChars.toLowerCase().replace(/[^\p{L}]/gu, "");
    for (i = 0; i <= lower.length; i++) for (c = 0; c < T.length; c++) add(lower.slice(0, i) + T[c] + lower.slice(i), 2.2);
    for (i = 0; i < lower.length; i++) for (c = 0; c < T.length; c++) add(sub(lower, i, T[c]), 2.4);
    for (i = 2; i < lower.length - 1; i++) { var l1 = lower.slice(0, i), l2 = lower.slice(i); if (this.check(l1) && this.check(l2)) { var s2 = fit(l1) + " " + l2; if (!seen[s2]) { seen[s2] = 1; found.push({ w: s2, t: 4 }); } } }
    found.sort(function (x, y) { return x.t - y.t; });
    return found.slice(0, max).map(function (x) { return x.w; });
  };

  Dict.prototype.addWord = function (w) {
    w = String(w || "").trim(); if (!w) return;
    if (w !== w.toLowerCase() && w !== capitalize(w.toLowerCase())) this.extraExact.add(w);   // sigla / CamelCase: valem só assim
    else this.extra.add(w.toLowerCase());
  };
  Dict.prototype.removeWord = function (w) { w = String(w || "").trim(); this.extraExact.delete(w); this.extra.delete(w.toLowerCase()); };

  // ── Separação do texto em palavras ────────────────────────────────────────────────────────────────
  // Devolve [{ start, end, word }] de cada palavra a conferir. Ignora o que não é palavra de dicionário:
  // números, endereços e e-mails, siglas curtas em maiúsculas (2–4 letras), códigos com dígitos, palavras de 1 letra.
  var WORD = /[\p{L}\p{M}][\p{L}\p{M}'’\-]*[\p{L}\p{M}]|[\p{L}\p{M}]/gu;
  var LINKS = /[^\s"'<>()]*:\/\/[^\s"'<>()]*|www\.[^\s"'<>()]+|[^\s@"'<>()]+@[^\s@"'<>()]+\.[^\s"'<>()]+/g;
  function tokenize(text) {
    var out = [], m, links = [];
    LINKS.lastIndex = 0;
    while ((m = LINKS.exec(text))) links.push([m.index, m.index + m[0].length]);
    function inLink(s) { for (var q = 0; q < links.length; q++) if (s >= links[q][0] && s < links[q][1]) return true; return false; }
    WORD.lastIndex = 0;
    while ((m = WORD.exec(text))) {
      var w = m[0], s = m.index, e = s + w.length;
      var pre = text.charAt(s - 1), post = text.charAt(e);
      if (/[0-9_@\/\\.#]/.test(pre) && /[A-Za-z0-9]/.test(text.charAt(s - 2) || "")) continue;      // pedaço de código/URL/e-mail
      if (/[0-9_@]/.test(post) || /[0-9_]/.test(pre)) continue;                                        // mistura com dígitos
      if (pre === "@" || post === "@") continue;
      if (w.length === 1 || inLink(s)) continue;
      if (w === w.toUpperCase() && w.length <= 5) continue;                                           // IFSC, EAD, PDF, SCORM
      if (/[\p{Ll}][\p{Lu}]/u.test(w) || /^\p{Lu}{2,}s$/u.test(w)) continue;                                                       // ClassAtelier, CPUs, iPhone
      if (post === ":" && text.slice(e, e + 3) === "://") continue;                                    // http://
      w = w.replace(/^['’\-]+|['’\-]+$/g, "");
      if (w.length < 2) continue;
      out.push({ start: s, end: s + m[0].length, word: m[0] });
    }
    return out;
  }

  var api = { Dict: Dict, tokenize: tokenize };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CorretorMotor = api;
})(typeof window !== "undefined" ? window : this);
