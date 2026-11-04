/* eslint-disable */
// ════════════════════════════════════════════════════════════
// ClassAtelier — LEGENDAS (.srt / .vtt) → falas com tempo
// ────────────────────────────────────────────────────────────
// Lê o arquivo de legenda do vídeo e devolve:
//   cues : [[inicio, fim, "texto"], ...]  (segundos, em ordem crescente)
//   text : a mesma fala em parágrafos (vai para o campo Transcrição: PDF, leitor de tela, acessibilidade)
// Cuida das manias das legendas automáticas do YouTube: falas que se sobrepõem, etiquetas HTML,
// e falas com tempo fora de ordem (ex.: "00:00:00,330" no meio do minuto 5), que são reposicionadas.
// Roda só no editor; a aula exportada recebe as falas já prontas.
// ════════════════════════════════════════════════════════════
(function () {
  var ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  function decode(s) {
    function once(v) {
      return String(v).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, n) {
        if (n[0] === "#") {
          var c = n[1].toLowerCase() === "x" ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10);
          return isFinite(c) && c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m;
        }
        var r = ENT[n.toLowerCase()];
        return r === undefined ? m : r;
      });
    }
    return once(once(s));
  }
  var TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;
  function secs(h, m, s, ms) { return (+(h || 0)) * 3600 + (+m) * 60 + (+s) + (+("0." + String(ms).padEnd(3, "0"))); }
  var r2 = function (n) { return Math.round(n * 100) / 100; };

  // 1) Lê os blocos do arquivo
  function readBlocks(source) {
    var text = String(source || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    var out = [];
    text.split(/\n{2,}|\n(?=\d+\n\d{1,2}:\d{2})/).forEach(function (block) {
      var lines = block.split("\n");
      var at = -1;
      for (var i = 0; i < lines.length; i++) { if (TIME.test(lines[i])) { at = i; break; } }
      if (at < 0) return;
      var m = lines[at].match(TIME);
      var body = lines.slice(at + 1).join(" ")
        .replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "");
      body = decode(body).replace(/\s+/g, " ").trim();
      if (!body) return;
      out.push({ s: secs(m[1], m[2], m[3], m[4]), e: secs(m[5], m[6], m[7], m[8]), t: body });
    });
    return out;
  }

  // 2) Reposiciona falas com tempo fora de ordem (andam mais de 1 s para trás) entre as vizinhas corretas
  function fixOrder(list) {
    var bad = new Array(list.length).fill(false), top = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].s < top - 1) bad[i] = true; else top = Math.max(top, list[i].s);
    }
    for (var a = 0; a < list.length; a++) {
      if (!bad[a]) continue;
      var b = a; while (b < list.length && bad[b]) b++;
      var prev = a > 0 ? list[a - 1].s : 0;
      var next = b < list.length ? list[b].s : prev + (b - a) * 3;
      var n = b - a;
      for (var k = 0; k < n; k++) {
        list[a + k].s = prev + ((next - prev) * (k + 1)) / (n + 1);
        list[a + k].e = prev + ((next - prev) * (k + 2)) / (n + 1);
      }
      a = b - 1;
    }
    return list;
  }

  // 3) Faz cada fala ficar na tela até a próxima começar (no máximo 8 s depois do início)
  function holdTime(list) {
    for (var i = 0; i < list.length; i++) {
      var next = i + 1 < list.length ? list[i + 1].s : list[i].e;
      list[i].e = Math.max(list[i].e, Math.min(next, list[i].s + 8));
      if (list[i].e < list[i].s) list[i].e = list[i].s;
    }
    return list;
  }

  // 4) Junta as falas em parágrafos legíveis para o campo Transcrição
  function toParagraphs(list) {
    var paras = [], cur = "", lastEnd = 0;
    list.forEach(function (c) {
      if (cur && (c.s - lastEnd > 4 && cur.length >= 200)) { paras.push(cur); cur = ""; }
      cur = cur ? cur + " " + c.t : c.t;
      lastEnd = c.e;
      if ((cur.length >= 350 && /[.!?…]["')\]]?$/.test(cur)) || cur.length >= 900) { paras.push(cur); cur = ""; }
    });
    if (cur) paras.push(cur);
    return paras;
  }

  function parseSubtitles(source) {
    var raw = readBlocks(source);
    if (!raw.length) return { cues: [], text: "", paragraphs: 0, duration: 0, fixed: 0 };
    var before = raw.map(function (c) { return c.s; });
    var list = holdTime(fixOrder(raw.slice()));
    var fixed = 0; list.forEach(function (c, i) { if (Math.abs(c.s - before[i]) > 0.01) fixed++; });
    var paras = toParagraphs(list);
    return {
      cues: list.map(function (c) { return [r2(c.s), r2(c.e), c.t]; }),
      text: paras.join("\n\n"),
      paragraphs: paras.length,
      duration: r2(list[list.length - 1].e),
      fixed: fixed
    };
  }

  // Índice da fala que está no ar em `t` segundos (a última que já começou); -1 antes da primeira.
  function cueAt(cues, t) {
    var lo = 0, hi = cues.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (cues[mid][0] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }

  var api = { parseSubtitles: parseSubtitles, cueAt: cueAt };
  if (typeof window !== "undefined") Object.assign(window, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
