/* ClassAtelier — corretor ortográfico próprio (só do editor; nada disto vai para a aula exportada).
 *  • Marca as palavras erradas com PONTILHADO VERMELHO (CSS Custom Highlight API), sem criar nenhum
 *    elemento no texto: o conteúdo da aula não muda, e no modo Visualizar não há marcação.
 *  • Idioma à escolha (pt-BR por padrão, en-US) ou desligado; dicionário pessoal («Adicionar ao dicionário»).
 *  • Clique com o botão direito numa palavra marcada: sugestões, Ignorar, Adicionar ao dicionário.
 *  Depende de corretor-motor.js e carrega vendor/dict/<idioma>.js só quando o idioma é usado. */
(function () {
  "use strict";
  var Motor = window.CorretorMotor;
  var SRC = (document.currentScript && document.currentScript.src) || "";
  var BASE = SRC.replace(/[?#].*$/, "").replace(/[^\/]*$/, "");
  var REV = (SRC.split("?")[1] || "");
  var LANGS = [{ id: "pt-BR", label: "Português (Brasil)" }, { id: "en-US", label: "English (US)" }];
  var KEY = "classatelier.speller.v1", KEYD = "classatelier.speller.dict.v1";
  var HL = "ca-erro";
  var supported = !!(window.CSS && CSS.highlights && window.Highlight);

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  var st = jget(KEY, {});
  var state = { on: st.on !== false, lang: LANGS.some(function (l) { return l.id === st.lang; }) ? st.lang : "pt-BR", status: "idle" };
  var userDict = jget(KEYD, {});                 // { "pt-BR": ["palavra", …], "en-US": […] }
  var dicts = {};                                // idioma → Motor.Dict
  var loading = {};                              // idioma → true
  var cache = {}, ignored = {};                  // idioma → Map / Set
  var errors = [];                               // [{ range, word }] da última varredura
  var subs = [];
  function emit() { subs.slice().forEach(function (f) { try { f(api.get()); } catch (e) { } }); }

  // ── CSS (marcação + menu) ─────────────────────────────────────────────────────────────────────────
  var css = document.createElement("style"); css.id = "ca-spell-css";
  css.textContent =
    "::highlight(" + HL + "){text-decoration:underline dotted #d92d20;text-decoration-thickness:2px;text-underline-offset:3px}" +
    ".ca-spell-menu{position:fixed;z-index:100000;min-width:190px;max-width:320px;background:#fff;border:1px solid #d8d4c8;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);padding:5px 0;font:13px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;color:#1b1a17;user-select:none;-webkit-user-select:none}" +
    ".ca-spell-menu .w{padding:5px 14px 6px;font-size:11px;color:#7a766b;border-bottom:1px solid #eee8da;margin-bottom:3px}" +
    ".ca-spell-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:7px 14px;font:inherit;color:inherit;cursor:pointer}" +
    ".ca-spell-menu button:hover,.ca-spell-menu button:focus{background:#f3efe4;outline:none}" +
    ".ca-spell-menu button.s{font-weight:700}" +
    ".ca-spell-menu button[disabled]{color:#9a968a;cursor:default;background:transparent}" +
    ".ca-spell-menu hr{display:block;width:auto;border:0;border-top:1px solid #eee8da;margin:4px 0}";
  document.head.appendChild(css);

  // ── Dicionários ───────────────────────────────────────────────────────────────────────────────────
  function addUserWords(d, lang) { (userDict[lang] || []).forEach(function (w) { d.addWord(w); }); }
  function load(lang, cb) {
    if (dicts[lang]) { cb && cb(true); return; }
    if (loading[lang]) { loading[lang].push(cb); return; }
    loading[lang] = [cb];
    function finish(ok) { var l = loading[lang] || []; delete loading[lang]; l.forEach(function (f) { f && f(ok); }); }
    function build() {
      var data = window.__CA_DICT && window.__CA_DICT[lang];
      if (!data) { finish(false); return; }
      try { var d = new Motor.Dict(data.aff, data.dic); addUserWords(d, lang); dicts[lang] = d; cache[lang] = new Map(); delete window.__CA_DICT[lang]; finish(true); }
      catch (e) { finish(false); }
    }
    if (window.__CA_DICT && window.__CA_DICT[lang]) { build(); return; }
    var s = document.createElement("script");
    s.src = BASE + "vendor/dict/" + lang + ".js" + (REV ? "?" + REV : "");
    s.onload = build; s.onerror = function () { finish(false); };
    document.head.appendChild(s);
  }

  function active() { return supported && state.on && !!dicts[state.lang]; }
  function isBad(word) {
    var d = dicts[state.lang], c = cache[state.lang], ig = ignored[state.lang];
    var key = word;
    var v = c.get(key);
    if (v === undefined) { v = !d.check(word); c.set(key, v); }
    return v && !(ig && ig.has(word.toLowerCase()));
  }

  // ── Texto das áreas editáveis ─────────────────────────────────────────────────────────────────────
  var BLOCK = { P: 1, DIV: 1, LI: 1, UL: 1, OL: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1, TR: 1, TD: 1, TH: 1, TABLE: 1, SECTION: 1, ARTICLE: 1, FIGCAPTION: 1, DT: 1, DD: 1 };
  var SKIPTAG = { CODE: 1, PRE: 1, KBD: 1, SAMP: 1, SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, SVG: 1, MATH: 1, IMG: 1 };
  function skipEl(n) {
    if (SKIPTAG[n.tagName] || (n.tagName || "").toLowerCase() === "svg") return true;
    var cl = n.classList;
    if (cl && (cl.contains("katex") || cl.contains("aula-eq") || cl.contains("ca-nospell"))) return true;
    if (n.hasAttribute && (n.hasAttribute("data-nospell") || n.getAttribute("contenteditable") === "false")) return true;
    return false;
  }
  function collect(root) {
    var text = "", segs = [];
    (function walk(n) {
      if (n.nodeType === 3) { segs.push({ node: n, start: text.length, len: n.nodeValue.length }); text += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      if (n !== root && skipEl(n)) { text += "\u0001"; return; }
      var blk = BLOCK[n.tagName];
      if (blk && text && text.charAt(text.length - 1) !== "\n") text += "\n";
      if (n.tagName === "BR") text += "\n";
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
      if (blk) text += "\n";
    })(root);
    return { text: text, segs: segs };
  }
  function segAt(segs, idx, atEnd) {          // segmento que contém idx (atEnd: idx é um fim exclusivo)
    var lo = 0, hi = segs.length - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1, s = segs[mid];
      if (idx < s.start) hi = mid - 1;
      else if (idx > s.start + s.len || (!atEnd && idx === s.start + s.len)) lo = mid + 1;
      else { best = mid; if (atEnd) { lo = mid + 1; } else break; }
    }
    return best < 0 ? null : segs[best];
  }
  function caretIndex(root, col) {
    var sel = window.getSelection && getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed || !root.contains(sel.anchorNode)) return -1;
    var n = sel.anchorNode, off = sel.anchorOffset;
    if (n.nodeType === 3) { for (var i = 0; i < col.segs.length; i++) if (col.segs[i].node === n) return col.segs[i].start + off; return -1; }
    var ch = n.childNodes[off] || null, prev = ch ? ch.previousSibling : n.lastChild;
    if (prev) { for (var j = col.segs.length - 1; j >= 0; j--) if (prev.contains(col.segs[j].node) || prev === col.segs[j].node) return col.segs[j].start + col.segs[j].len; }
    return -1;
  }

  var timer = 0, last = 0;
  function schedule() {
    if (!supported) return;
    if (timer) return;
    timer = setTimeout(function () { timer = 0; scan(); }, 320);
  }
  function scan() {
    last = Date.now();
    if (!supported) return;
    errors = [];
    if (state.on && dicts[state.lang]) {
      var roots = document.querySelectorAll('[contenteditable="true"],[contenteditable=""]');
      for (var r = 0; r < roots.length; r++) {
        var root = roots[r];
        if (root.hasAttribute("data-nospell") || (root.closest && root.closest("[data-nospell]"))) continue;
        var col = collect(root); if (!col.segs.length) continue;
        var caret = caretIndex(root, col);
        var toks = Motor.tokenize(col.text);
        for (var t = 0; t < toks.length; t++) {
          var tk = toks[t];
          if (caret >= tk.start && caret <= tk.end) continue;            // palavra que está sendo digitada
          if (!isBad(tk.word)) continue;
          var a = segAt(col.segs, tk.start, false), b = segAt(col.segs, tk.end, true);
          if (!a || !b) continue;
          try {
            var rg = document.createRange();
            rg.setStart(a.node, Math.min(tk.start - a.start, a.len));
            rg.setEnd(b.node, Math.min(tk.end - b.start, b.len));
            errors.push({ range: rg, word: tk.word, root: root });
          } catch (e) { }
        }
      }
    }
    try {
      if (errors.length) { var h = new Highlight(); errors.forEach(function (x) { h.add(x.range); }); CSS.highlights.set(HL, h); }
      else CSS.highlights.delete(HL);
    } catch (e) { }
  }

  // ── Menu de contexto ──────────────────────────────────────────────────────────────────────────────
  var menu = null, menuRoot = null;
  function closeMenu(refocus) {
    if (menu) { menu.remove(); menu = null; }
    document.removeEventListener("keydown", menuKey, true);
    if (refocus && menuRoot) { try { menuRoot.focus(); } catch (e) { } }
    menuRoot = null;
  }
  function menuKey(e) {
    if (!menu) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(true); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); e.stopPropagation();
      var bs = [].slice.call(menu.querySelectorAll("button:not([disabled])")); if (!bs.length) return;
      var i = bs.indexOf(document.activeElement); i = e.key === "ArrowDown" ? (i + 1) % bs.length : (i <= 0 ? bs.length - 1 : i - 1); bs[i].focus();
    }
  }
  function replaceWith(err, text) {
    var root = err.root; if (!root) return;
    try {
      root.focus();
      var sel = getSelection(); sel.removeAllRanges(); sel.addRange(err.range);
      document.execCommand("insertText", false, text);
    } catch (e) { }
    schedule();
  }
  function showMenu(err, x, y, byKeyboard) {
    closeMenu(false);
    var d = dicts[state.lang], sugg = [];
    try { sugg = d.suggest(err.word, 5); } catch (e) { }
    menu = document.createElement("div"); menu.className = "ca-spell-menu"; menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Corretor ortográfico");
    menuRoot = err.root;
    var head = document.createElement("div"); head.className = "w"; head.textContent = "“" + err.word + "” não está no dicionário (" + state.lang + ")"; menu.appendChild(head);
    function item(label, fn, cls, disabled) {
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem"); b.textContent = label; if (cls) b.className = cls; if (disabled) b.disabled = true;
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });         // não tira o foco do texto
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); closeMenu(false); fn && fn(); });
      menu.appendChild(b); return b;
    }
    if (sugg.length) sugg.forEach(function (s) { item(s, function () { replaceWith(err, s); }, "s"); });
    else item("Sem sugestões", null, "", true);
    menu.appendChild(document.createElement("hr"));
    item("Ignorar (nesta sessão)", function () { (ignored[state.lang] = ignored[state.lang] || new Set()).add(err.word.toLowerCase()); scan(); });
    item("Adicionar ao dicionário", function () { api.addWord(err.word); });
    document.body.appendChild(menu);
    var w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(6, Math.min(x, innerWidth - w - 6)) + "px";
    menu.style.top = Math.max(6, Math.min(y + 4, innerHeight - h - 6)) + "px";
    document.addEventListener("keydown", menuKey, true);
    if (byKeyboard) { var f = menu.querySelector("button:not([disabled])"); if (f) f.focus(); }
  }
  function pointCaret(x, y) {
    if (document.caretPositionFromPoint) { var p = document.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, offset: p.offset } : null; }
    if (document.caretRangeFromPoint) { var r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, offset: r.startOffset } : null; }
    return null;
  }
  function errorAtPoint(x, y) {
    var pc = pointCaret(x, y); if (!pc) return null;
    for (var i = 0; i < errors.length; i++) {
      var rg = errors[i].range;
      try { if (!rg.isPointInRange(pc.node, pc.offset)) continue; } catch (e) { continue; }
      var rects = rg.getClientRects();
      for (var k = 0; k < rects.length; k++) { var q = rects[k]; if (x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 3 && y <= q.bottom + 3) return errors[i]; }
    }
    return null;
  }
  function errorAtCaret() {
    var sel = getSelection(); if (!sel || !sel.rangeCount) return null;
    var n = sel.anchorNode, o = sel.anchorOffset;
    for (var i = 0; i < errors.length; i++) { try { if (errors[i].range.isPointInRange(n, o)) return errors[i]; } catch (e) { } }
    return null;
  }
  document.addEventListener("contextmenu", function (e) {
    if (!active() || !errors.length) return;
    var root = e.target && e.target.closest && e.target.closest('[contenteditable="true"],[contenteditable=""]'); if (!root) return;
    var kb = !e.clientX && !e.clientY, err = kb ? errorAtCaret() : errorAtPoint(e.clientX, e.clientY);
    if (!err) return;
    e.preventDefault();
    if (kb) { var rc = err.range.getBoundingClientRect(); showMenu(err, rc.left, rc.bottom, true); }
    else showMenu(err, e.clientX, e.clientY, false);
  }, true);
  document.addEventListener("mousedown", function (e) { if (menu && !menu.contains(e.target)) closeMenu(false); }, true);
  window.addEventListener("blur", function () { closeMenu(false); });
  window.addEventListener("scroll", function () { if (menu) closeMenu(false); }, true);

  // ── Gatilhos de nova conferência ──────────────────────────────────────────────────────────────────
  document.addEventListener("input", schedule, true);
  document.addEventListener("selectionchange", schedule);
  document.addEventListener("focusin", schedule);
  try { new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["contenteditable"] }); } catch (e) { }

  // ── API ───────────────────────────────────────────────────────────────────────────────────────────
  function persist() { jset(KEY, { on: state.on, lang: state.lang }); }
  function ensure() {
    if (!supported || !state.on) { state.status = supported ? "off" : "unsupported"; emit(); scan(); return; }
    if (dicts[state.lang]) { state.status = "ready"; emit(); scan(); return; }
    state.status = "loading"; emit();
    var want = state.lang;
    load(want, function (ok) { if (state.lang !== want) return; state.status = ok ? "ready" : "error"; emit(); scan(); });
  }
  var api = {
    LANGS: LANGS,
    supported: supported,
    get: function () { return { on: state.on, lang: state.lang, status: supported ? state.status : "unsupported", words: (userDict[state.lang] || []).slice(), errors: errors.length }; },
    set: function (o) {
      if (o && typeof o.on === "boolean") state.on = o.on;
      if (o && o.lang && LANGS.some(function (l) { return l.id === o.lang; })) state.lang = o.lang;
      persist(); ensure();
    },
    subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    addWord: function (w, lang) {
      lang = lang || state.lang; w = String(w || "").trim(); if (!w) return;
      var l = userDict[lang] = userDict[lang] || [];
      if (l.indexOf(w) < 0) { l.push(w); l.sort(function (a, b) { return a.localeCompare(b); }); jset(KEYD, userDict); }
      if (dicts[lang]) { dicts[lang].addWord(w); cache[lang] = new Map(); }
      emit(); scan();
    },
    removeWord: function (w, lang) {
      lang = lang || state.lang;
      userDict[lang] = (userDict[lang] || []).filter(function (x) { return x !== w; }); jset(KEYD, userDict);
      if (dicts[lang]) { dicts[lang].removeWord(w); cache[lang] = new Map(); }
      emit(); scan();
    },
    // Para testes e para quem quiser conferir um texto solto: palavras erradas (já com o dicionário carregado).
    check: function (text) { if (!dicts[state.lang]) return null; return Motor.tokenize(String(text)).filter(function (t) { return !dicts[state.lang].check(t.word); }).map(function (t) { return t.word; }); },
    suggest: function (w) { return dicts[state.lang] ? dicts[state.lang].suggest(w, 6) : []; },
    rescan: scan,
    _errors: function () { return errors.map(function (x) { return x.word; }); }
  };
  window.Corretor = api;
  ensure();
})();
