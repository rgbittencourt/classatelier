/* eslint-disable */
// ClassAtelier — exporta o deck de slides para PowerPoint (.pptx), editável, com as mesmas
// paletas, fontes (Space Grotesk, IBM Plex Sans, JetBrains Mono) e notas do apresentador.
// Usa o PptxGenJS (vendor/pptxgen.bundle.js), carregado só quando a pessoa pede o .pptx.
// A grade é a mesma do .html: 1920 × 1080 px = 13,333 × 7,5 pol (144 px por polegada).
(function () {
  const CS = window.ClassSlides || (typeof module !== "undefined" ? require("./slides-render.js") : null);
  const PX = 144;
  const W = 1920 / PX, H = 1080 / PX;
  const X0 = 128 / PX, Y0 = 128 / PX, CW = (1920 - 256) / PX, CH = (1080 - 128 - 160) / PX;
  const FT = "Space Grotesk", FB = "IBM Plex Sans", FM = "JetBrains Mono";
  const pt = (px) => Math.round(px * 0.5 * 10) / 10; // 1 px da grade = 0,5 pt
  const c = (hex) => String(hex || "#000000").replace("#", "").toUpperCase();
  const plain = (v) => String(v == null ? "" : v).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

  // Encolhe a letra até o texto caber na caixa (estimativa pela largura média dos caracteres).
  function fit(text, size, w, h, opt) {
    const o = opt || {};
    const lh = o.lh || 1.25, cw = o.cw || 0.52, min = o.min || 10;
    const parts = String(text || "").split("\n");
    let s = size;
    for (; s > min; s -= 1) {
      const cpl = Math.max(1, Math.floor((w * 72) / (s * cw)));
      const lines = parts.reduce((a, p) => a + Math.max(1, Math.ceil(p.length / cpl)), 0);
      if (lines * s * lh / 72 <= h) break;
    }
    return s;
  }

  async function loadLib() {
    if (window.PptxGenJS) return window.PptxGenJS;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "vendor/pptxgen.bundle.js?v=3.12.0";
      s.onload = res; s.onerror = () => rej(new Error("Não consegui carregar o gerador de PowerPoint (vendor/pptxgen.bundle.js)."));
      document.head.appendChild(s);
    });
    return window.PptxGenJS;
  }

  // Tamanho natural de cada figura (para manter a proporção no slide).
  function imgSize(src) {
    return new Promise((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth || 4, h: im.naturalHeight || 3 }); im.onerror = () => res(null); im.src = src; });
  }
  // O PowerPoint não lê SVG embutido em todas as versões: toda figura vira PNG (até 2400 px).
  async function toDataUrl(src) {
    let data = src;
    if (!/^data:/.test(src)) {
      try { const r = await fetch(src, { mode: "cors" }); const b = await r.blob(); data = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(""); fr.readAsDataURL(b); }); }
      catch (e) { return ""; }
    }
    if (/^data:image\/(png|jpe?g|gif)/i.test(data)) return data;
    return await new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        try {
          const w0 = im.naturalWidth || 1200, h0 = im.naturalHeight || 900; const k = Math.min(1, 2400 / Math.max(w0, h0)) * (Math.max(w0, h0) < 1200 ? 2 : 1);
          const cv = document.createElement("canvas"); cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
          const g = cv.getContext("2d"); g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
          res(cv.toDataURL("image/png"));
        } catch (e) { res(data); }
      };
      im.onerror = () => res("");
      im.src = data;
    });
  }

  // Referência em HTML (com <b>/<i>) vira trechos de texto com negrito e itálico.
  function runsOf(html, base) {
    const out = []; let b = false, i = false;
    String(html || "").replace(/<br\s*\/?>/gi, " ").split(/(<\/?(?:b|strong|i|em)\b[^>]*>)/i).forEach((tok) => {
      const m = /^<(\/?)(b|strong|i|em)\b/i.exec(tok);
      if (m) { const on = !m[1]; if (/^(b|strong)$/i.test(m[2])) b = on; else i = on; return; }
      const t = plain(tok.replace(/<[^>]*>/g, "")); if (!t && !/\s/.test(tok)) return;
      out.push({ text: plain(tok.replace(/<[^>]*>/g, " ")) ? tok.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ") : " ", options: { ...base, bold: b, italic: i } });
    });
    return out;
  }

  async function deckToPptx(deck, paletteId) {
    const PptxGenJS = await loadLib();
    const P = CS.paletteById(paletteId);
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = deck.title || "Slides";
    pptx.author = deck.author || "";
    pptx.company = "ClassAtelier";
    const SH = pptx.ShapeType;
    const total = deck.slides.length;

    // Figuras: carrega e mede antes de montar.
    const imgs = {};
    for (const s of deck.slides) if (s.type === "image" && s.src && !imgs[s.src]) { const data = await toDataUrl(s.src); const sz = data ? await imgSize(data) : null; imgs[s.src] = data && sz ? { data, ...sz } : null; }

    let statements = 0;
    deck.slides.forEach((s, idx) => {
      const sl = pptx.addSlide();
      let mode = "light";
      if (s.type === "cover" || s.type === "sintese") mode = "dark";
      if (s.type === "reflect") mode = "mist";
      if (s.type === "statement") { statements += 1; if (statements % 2 === 0) mode = "accent"; }
      sl.background = { color: c(mode === "dark" ? P.dark : mode === "accent" ? P.accent : mode === "mist" ? P.bg2 : P.bg) };
      const ink = mode === "dark" ? P.onDark : mode === "accent" ? P.onAccent : P.ink;
      const titleC = mode === "dark" ? "#F7F5F0" : mode === "accent" ? P.onAccent : P.title;
      const eyeC = mode === "dark" ? P.accentLight : mode === "accent" ? P.onAccentMuted : P.accent;
      const mutedC = mode === "dark" ? P.onDarkMuted : mode === "accent" ? P.onAccentMuted : P.muted;

      const T = (text, o) => sl.addText(text, { fontFace: FB, color: c(ink), margin: 0, valign: "top", ...o, color: c(o.color || ink) });
      const eyebrow = (text, y) => { if (text) T(String(text).toUpperCase(), { x: X0, y, w: CW, h: 0.3, fontSize: pt(24), bold: true, color: eyeC, charSpacing: 3 }); };
      const head = (eb, title) => {
        eyebrow(eb, Y0);
        if (title) T(title, { x: X0, y: Y0 + 0.36, w: CW, h: 1.05, fontFace: FT, bold: true, color: titleC, fontSize: fit(title, pt(72), CW, 1.05, { lh: 1.12, cw: 0.55, min: 20 }), lineSpacingMultiple: 0.95 });
        return { y: Y0 + (title ? 1.62 : 0.6), h: CH - (title ? 1.62 : 0.6) };
      };
      const box = (x, y, w, h, fill, line) => sl.addShape(SH.roundRect, { x, y, w, h, rectRadius: 16 / PX, fill: { color: c(fill) }, line: { color: c(line || fill), width: 0.75 } });
      // Cartão com título (h3) e texto, centralizado verticalmente.
      const card = (x, y, w, h, o) => {
        const k = o || {};
        const dark = k.ink || k.dk;
        box(x, y, w, h, k.ink ? P.dark : k.dk ? P.dark2 : P.card, k.ink ? P.dark : k.dk ? P.dark2 : P.line);
        const pad = Math.min(0.28, w * 0.08);
        const runs = [];
        if (k.kicker) runs.push({ text: String(k.kicker).toUpperCase(), options: { fontSize: pt(22), bold: true, color: c(dark ? P.accentLight : P.muted), charSpacing: 2, breakLine: true, paraSpaceAfter: 4 } });
        if (k.num) runs.push({ text: String(k.num), options: { fontFace: FM, fontSize: pt(40), bold: true, color: c(dark ? P.accentLight : P.accent), breakLine: true } });
        const tLen = (k.title || "").length + (k.text || "").length * 0.62;
        const hs = fit((k.title || "") + "\n" + (k.text || ""), k.titleSize || pt(40), w - 2 * pad, h - 2 * pad - (k.kicker ? 0.35 : 0) - (k.num ? 0.4 : 0), { min: 11, cw: 0.5, lh: 1.3 });
        if (k.title) runs.push({ text: k.title, options: { fontFace: FT, bold: true, fontSize: hs, color: c(k.dk ? P.accentLight : dark ? "#F7F5F0" : P.title), breakLine: Boolean(k.text), paraSpaceAfter: 6 } });
        if (k.text) runs.push({ text: k.text, options: { fontSize: Math.max(11, Math.min(pt(28), Math.round(hs * 0.66))), color: c(dark ? P.onDark : P.ink) } });
        if (runs.length) sl.addText(runs, { x: x + pad, y: y + pad, w: w - 2 * pad, h: h - 2 * pad, fontFace: FB, valign: k.top ? "top" : "middle", margin: 0, lineSpacingMultiple: 1.1 });
      };
      const arrow = (x, y, w) => sl.addShape(SH.rightArrow, { x, y: y - 0.13, w, h: 0.26, fill: { color: c(P.accent) }, line: { color: c(P.accent), width: 0 } });
      const foot = () => {
        if (s.type === "cover") return;
        T(deck.title || "", { x: X0, y: H - 64 / PX - 0.22, w: CW - 1, h: 0.25, fontSize: pt(22), color: mutedC });
        T(String(idx + 1).padStart(2, "0"), { x: X0 + CW - 1, y: H - 64 / PX - 0.22, w: 1, h: 0.25, fontSize: pt(22), color: mutedC, align: "right" });
      };
      const center = (eb, big, sub, o) => {
        const k = o || {};
        const bs = fit(big, k.size || pt(72), CW * 0.85, 3.2, { cw: 0.55, lh: 1.15, min: 22 });
        const subS = sub ? fit(sub, pt(44), CW * 0.82, 1.3, { min: 14 }) : 0;
        const hBig = Math.min(3.4, (Math.ceil(big.length / Math.max(1, Math.floor(CW * 0.85 * 72 / (bs * 0.55)))) * bs * 1.18) / 72 + 0.1);
        const tot = (eb ? 0.5 : 0) + hBig + (sub ? 0.25 + Math.min(1.3, subS * 1.35 * Math.ceil(sub.length / Math.floor(CW * 0.82 * 72 / (subS * 0.52))) / 72) : 0);
        let y = Y0 + Math.max(0, (CH - tot) / 2);
        if (k.tag) { sl.addShape(SH.ellipse, { x: X0, y: y - 0.02, w: 0.34, h: 0.34, fill: { color: c(P.accent) }, line: { color: c(P.accent), width: 0 } }); T("?", { x: X0, y: y - 0.02, w: 0.34, h: 0.34, fontFace: FT, bold: true, fontSize: 14, color: "#FFFFFF", align: "center", valign: "middle" }); }
        if (eb) { T(String(eb).toUpperCase(), { x: X0 + (k.tag ? 0.5 : 0), y, w: CW, h: 0.3, fontSize: pt(24), bold: true, color: eyeC, charSpacing: 3 }); y += 0.5; }
        T(big, { x: X0, y, w: CW * 0.85, h: hBig, fontFace: k.face || FT, bold: !k.light, italic: Boolean(k.italic), fontSize: bs, color: titleC, lineSpacingMultiple: 1.0 });
        y += hBig + 0.25;
        if (sub) T(sub, { x: X0, y, w: CW * 0.82, h: 1.3, fontSize: subS, color: mode === "accent" ? P.onAccentMuted : k.subColor || P.second });
      };
      const grid = (items, cols, y, h, render) => {
        const gap = 28 / PX, rows = Math.ceil(items.length / cols);
        const cw = (CW - gap * (cols - 1)) / cols, ch = Math.min(2.4, (h - gap * (rows - 1)) / rows);
        const y0 = y + Math.max(0, (h - (ch * rows + gap * (rows - 1))) / 2);
        items.forEach((it, i) => render(it, X0 + (i % cols) * (cw + gap), y0 + Math.floor(i / cols) * (ch + gap), cw, ch, i));
      };

      switch (s.type) {
        case "cover": {
          for (let r = 1; r <= 5; r += 1) { const R = (160 * r) / PX; sl.addShape(SH.arc, { x: W - R, y: H - R, w: 2 * R, h: 2 * R, angleRange: [180, 270], fill: { type: "none" }, line: { color: c(P.dark2), width: 1.5 } }); }
          sl.addShape(SH.line, { x: W - 509 / PX, y: H - 509 / PX, w: 509 / PX, h: 509 / PX, line: { color: c(P.accentLight), width: 2 } });
          eyebrow(deck.eyebrow || "Aula", Y0);
          const ts = fit(deck.title || "", pt(120), 1300 / PX, 2.9, { cw: 0.62, lh: 1.12, min: 28 });
          T(deck.title || "", { x: X0, y: 1.6, w: 1300 / PX, h: 2.9, fontFace: FT, bold: true, fontSize: ts, color: "#F7F5F0", valign: "bottom", lineSpacingMultiple: 0.95 });
          if (deck.lead) T(plain(deck.lead).slice(0, 170), { x: X0, y: 4.7, w: 1300 / PX, h: 0.85, fontSize: fit(plain(deck.lead).slice(0, 170), pt(44), 1300 / PX, 0.85, { min: 14 }), color: P.onDark });
          T(deck.author || "", { x: X0, y: H - 128 / PX - 0.62, w: 8, h: 0.32, fontSize: pt(32), bold: true, color: "#F7F5F0" });
          T([deck.role, deck.year].filter(Boolean).join(" · "), { x: X0, y: H - 128 / PX - 0.26, w: 8, h: 0.26, fontSize: pt(24), color: P.onDarkMuted });
          break;
        }
        case "question": center("A pergunta da aula", s.text || "", "", { size: pt(96) }); break;
        case "statement": center(s.eyebrow, s.text || "", s.sub || ""); break;
        case "reflect": center("Para refletir", s.question || "", s.sub || "", { tag: true }); break;
        case "quote": center(s.eyebrow, "“" + String(s.text || "").replace(/^["“]|["”]$/g, "") + "”", s.author ? "— " + s.author : "", { size: pt(64), light: true }); break;
        case "roteiro": {
          const b = head("Roteiro", "O caminho de hoje");
          const items = s.items || []; const two = items.length > 6; const per = two ? Math.ceil(items.length / 2) : items.length;
          const colW = two ? (CW - 0.6) / 2 : CW * 0.7; const rowH = Math.min(0.62, b.h / per);
          const fs = Math.min(pt(32), fit(items.reduce((a, t) => (t.length > a.length ? t : a), ""), pt(32), colW - 0.7, rowH - 0.12, { min: 11 }));
          items.forEach((t, i) => {
            const col = two && i >= per ? 1 : 0, r = col ? i - per : i;
            const x = X0 + col * (colW + 0.6), y = b.y + Math.max(0, (b.h - per * rowH) / 2) + r * rowH;
            sl.addShape(SH.line, { x, y, w: colW, h: 0, line: { color: c(P.rule), width: 1 } });
            T(String(i + 1).padStart(2, "0"), { x, y: y + 0.08, w: 0.6, h: rowH - 0.1, fontFace: FM, bold: true, fontSize: pt(40), color: P.accent });
            T(t, { x: x + 0.7, y: y + 0.1, w: colW - 0.7, h: rowH - 0.12, fontSize: fs, color: P.title });
          });
          break;
        }
        case "objetivos": {
          const b = head("Objetivos de aprendizagem", "Ao final da aula, você vai…");
          const n = (s.items || []).length, cols = n <= 4 ? 2 : n <= 6 ? 3 : 4;
          grid(s.items || [], cols, b.y, b.h, (o, x, y, w, h) => card(x, y, w, h, { title: o.verb, text: o.text, titleSize: pt(40) }));
          break;
        }
        case "cards": {
          const b = head(s.eyebrow, s.title); const items = s.items || []; const n = items.length;
          grid(items, n, b.y, b.h, (it, x, y, w, h, i) => card(x, y, w, h, { title: it.title, text: it.text, ink: i === n - 1 && n === 3, titleSize: n >= 4 ? pt(32) : pt(40) }));
          break;
        }
        case "list": {
          const b = head(s.eyebrow, s.title); const items = s.items || [];
          const fs = fit(items.join("\n"), pt(32), CW - 0.4, b.h, { min: 12, lh: 1.6 });
          sl.addText(items.map((t, i) => ({ text: t, options: { bullet: { code: "25AC", indent: 22 }, breakLine: i < items.length - 1, paraSpaceAfter: 10 } })), { x: X0, y: b.y, w: CW, h: b.h, fontFace: FB, fontSize: fs, color: c(P.title), valign: "middle", margin: 0 });
          break;
        }
        case "formula": {
          const b = head(s.eyebrow, s.title); const leg = s.legend || [];
          const hh = b.h - (s.note ? 0.95 : 0); const fw = CW * 0.46;
          box(X0, b.y, fw, hh, P.dark);
          const f = s.formula || ""; T(f, { x: X0 + 0.3, y: b.y + 0.2, w: fw - 0.6, h: hh - 0.4, fontFace: FM, bold: true, color: "#F7F5F0", align: "center", valign: "middle", fontSize: fit(f, f.length > 11 ? pt(64) : pt(104), fw - 0.6, hh - 0.4, { cw: 0.62, min: 18 }) });
          const lx = X0 + fw + 0.45, lw = CW - fw - 0.45, rh = Math.min(0.8, hh / Math.max(1, leg.length));
          leg.forEach((l, i) => {
            const y = b.y + Math.max(0, (hh - leg.length * rh) / 2) + i * rh;
            T(l.sym || "", { x: lx, y, w: 0.9, h: rh, fontFace: FM, bold: true, fontSize: pt(40), color: P.accent, valign: "middle" });
            T(l.text || "", { x: lx + 1, y, w: lw - 1, h: rh, fontSize: fit(l.text || "", pt(28), lw - 1, rh, { min: 11 }), color: P.ink, valign: "middle" });
          });
          if (s.note) { const y = b.y + hh + 0.2; sl.addShape(SH.rect, { x: X0, y, w: CW, h: 0.75, fill: { color: c(P.warn) }, line: { color: c(P.warn), width: 0 } }); sl.addShape(SH.rect, { x: X0, y, w: 8 / PX, h: 0.75, fill: { color: c(P.accent) }, line: { color: c(P.accent), width: 0 } }); T(s.note, { x: X0 + 0.3, y, w: CW - 0.5, h: 0.75, valign: "middle", fontSize: fit(s.note, pt(28), CW - 0.5, 0.75, { min: 11 }), color: P.title }); }
          break;
        }
        case "compare": {
          const b = head(s.eyebrow, s.title); const aw = 0.6, gw = (CW - aw - 0.4) / 2, ch = Math.min(b.h, 3.2), y = b.y + (b.h - ch) / 2;
          card(X0, y, gw, ch, { kicker: s.left && s.left.label, title: s.left && s.left.title, text: s.left && s.left.text });
          arrow(X0 + gw + 0.2, y + ch / 2, aw);
          card(X0 + gw + aw + 0.4, y, gw, ch, { kicker: s.right && s.right.label, title: s.right && s.right.title, text: s.right && s.right.text, ink: true });
          break;
        }
        case "steps": {
          const b = head(s.eyebrow, s.title); const st = s.steps || []; const n = st.length || 1; const aw = 0.42, gap = 0.12;
          const cw = (CW - (n - 1) * (aw + 2 * gap)) / n, ch = Math.min(b.h, 3.3), y = b.y + (b.h - ch) / 2;
          st.forEach((x, i) => { const cx = X0 + i * (cw + aw + 2 * gap); if (i) arrow(cx - aw - gap, y + ch / 2, aw); card(cx, y, cw, ch, { num: i + 1, title: x.title, text: x.text, ink: i === n - 1, titleSize: pt(36) }); });
          break;
        }
        case "timeline": {
          const b = head(s.eyebrow, s.title); const ev = s.events || []; const n = ev.length || 1; const gap = 24 / PX; const cw = (CW - gap * (n - 1)) / n;
          ev.forEach((e, i) => {
            const x = X0 + i * (cw + gap), y = b.y + 0.3; const col = i === n - 1 ? P.accent : i === 1 ? P.second : P.dark;
            sl.addShape(SH.rect, { x, y, w: cw, h: 6 / PX, fill: { color: c(col) }, line: { color: c(col), width: 0 } });
            T([{ text: e.date || "", options: { fontFace: FM, bold: true, fontSize: pt(40), color: c(P.title), breakLine: true, paraSpaceAfter: 6 } }, { text: e.title || "", options: { bold: true, fontSize: pt(30), color: c(P.title), breakLine: true, paraSpaceAfter: 4 } }, { text: e.text || "", options: { fontSize: fit(e.text || "", pt(28), cw, b.h - 1.6, { min: 11 }), color: c(P.ink) } }], { x, y: y + 0.25, w: cw, h: b.h - 0.6 });
          });
          break;
        }
        case "table": {
          const b = head(s.eyebrow, s.title); const hd = s.headers || []; const rows = s.rows || [];
          const fs = Math.max(11, Math.min(pt(28), Math.floor(pt(28) * Math.min(1, 7 / (rows.length + 1)))));
          const data = [hd.map((t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: c(P.dark) }, fontFace: FT } }))].concat(rows.map((r, i) => r.map((t) => ({ text: t, options: { color: c(P.ink), fill: { color: c(i % 2 ? P.bg : P.card) } } }))));
          sl.addTable(data, { x: X0, y: b.y, w: CW, fontFace: FB, fontSize: fs, border: { type: "solid", pt: 0.75, color: c(P.line) }, margin: 0.08, valign: "middle", autoPage: false });
          break;
        }
        case "bignumber": {
          const b = head(s.eyebrow, s.title); const bw = Math.max(620 / PX, CW * 0.42), ch = Math.min(b.h, 2.9), y = b.y + (b.h - ch) / 2;
          box(X0, y, bw, ch, P.dark);
          const v = s.value || ""; T([{ text: v, options: { fontFace: FM, bold: true, fontSize: fit(v, pt(120), bw - 0.7, 1.3, { cw: 0.62, min: 24 }), color: c(P.accentLight), breakLine: true, paraSpaceAfter: 8 } }, { text: s.label || "", options: { fontSize: pt(28), color: c(P.onDark) } }], { x: X0 + 0.38, y: y + 0.3, w: bw - 0.7, h: ch - 0.6, valign: "middle" });
          if (s.text) T(s.text, { x: X0 + bw + 0.45, y, w: CW - bw - 0.45, h: ch, valign: "middle", fontSize: fit(s.text, pt(32), CW - bw - 0.45, ch, { min: 12 }), color: P.title });
          break;
        }
        case "alert": {
          const b = head(s.eyebrow, ""); const ch = Math.min(b.h, 3), y = b.y + (b.h - ch) / 2;
          sl.addShape(SH.rect, { x: X0, y, w: CW, h: ch, fill: { color: c(P.warn) }, line: { color: c(P.warn), width: 0 } });
          sl.addShape(SH.rect, { x: X0, y, w: 8 / PX, h: ch, fill: { color: c(P.accent) }, line: { color: c(P.accent), width: 0 } });
          sl.addShape(SH.triangle, { x: X0 + 0.45, y: y + 0.45, w: 0.85, h: 0.75, fill: { type: "none" }, line: { color: c(P.accent), width: 3 } });
          T("!", { x: X0 + 0.45, y: y + 0.6, w: 0.85, h: 0.55, fontFace: FT, bold: true, fontSize: 24, color: P.accent, align: "center", valign: "middle" });
          const tw = CW - 1.9;
          T([{ text: s.title || "", options: { fontFace: FT, bold: true, fontSize: fit(s.title || "", pt(44), tw, 0.9, { min: 16 }), color: c(P.title), breakLine: true, paraSpaceAfter: 8 } }, { text: s.text || "", options: { fontSize: fit(s.text || "", pt(32), tw, ch - 1.4, { min: 12 }), color: c(P.title) } }], { x: X0 + 1.6, y: y + 0.4, w: tw, h: ch - 0.8, valign: "middle" });
          break;
        }
        case "image": {
          const b = head(s.eyebrow, s.title); const im = imgs[s.src];
          const capH = s.caption ? 0.4 : 0; const bh = b.h - capH;
          if (im) { const r = im.w / im.h; let w = CW, h = w / r; if (h > bh) { h = bh; w = h * r; } sl.addImage({ data: im.data, x: X0 + (CW - w) / 2, y: b.y + (bh - h) / 2, w, h, altText: s.alt || s.caption || "" }); }
          else T("(figura: " + (s.caption || s.alt || "sem legenda") + ")", { x: X0, y: b.y, w: CW, h: bh, align: "center", valign: "middle", color: P.muted, fontSize: 16 });
          if (s.caption) T(s.caption, { x: X0, y: b.y + bh + 0.05, w: CW, h: 0.35, align: "center", fontSize: pt(24), color: P.muted });
          break;
        }
        case "sintese": {
          const b = head("Síntese", "A ideia que fecha a aula"); const items = s.items || [];
          grid(items, 3, b.y, b.h, (it, x, y, w, h) => card(x, y, w, h, { title: it.title, text: it.text, dk: true, titleSize: pt(32) }));
          break;
        }
        case "fechamento": {
          const b = head("A pergunta que fica", s.title); const ch = Math.min(b.h, 3.2), y = b.y + (b.h - ch) / 2; const lw = CW * 0.58;
          card(X0, y, lw, ch, { kicker: "Para levar adiante", title: s.question, ink: true, titleSize: pt(44) });
          const rx = X0 + lw + 0.35, rw = CW - lw - 0.35;
          box(rx, y, rw, ch, P.card, P.line);
          const hints = s.hints || [];
          sl.addText([{ text: "POR ONDE COMEÇAR", options: { fontSize: pt(22), bold: true, color: c(P.muted), charSpacing: 2, breakLine: true, paraSpaceAfter: 8 } }].concat(hints.map((h, i) => ({ text: h, options: { bullet: { code: "25AC", indent: 18 }, fontSize: fit(hints.join("\n"), pt(30), rw - 0.8, ch - 1, { min: 11, lh: 1.5 }), color: c(P.title), breakLine: i < hints.length - 1, paraSpaceAfter: 6 } }))), { x: rx + 0.3, y: y + 0.3, w: rw - 0.6, h: ch - 0.6, fontFace: FB, valign: "middle", margin: 0 });
          break;
        }
        case "referencias": {
          const b = head("", "Referências"); const items = s.items || [];
          if (!items.length) { T("A aula ainda não lista referências.", { x: X0, y: b.y, w: CW, h: 0.6, fontSize: pt(36), color: P.second }); break; }
          const half = Math.ceil(items.length / 2); const colW = (CW - 0.45) / 2;
          const longest = Math.max(items.slice(0, half).map(plain).join("\n").length, items.slice(half).map(plain).join("\n").length);
          const fs = fit("x".repeat(longest), pt(24), colW, b.h + 0.4, { min: 7, lh: 1.45 });
          [items.slice(0, half), items.slice(half)].forEach((col, k) => {
            const runs = []; col.forEach((r, i) => { const rr = runsOf(r, { fontSize: fs, color: c(P.ink) }); if (rr.length) { rr[rr.length - 1].options.breakLine = i < col.length - 1; rr[rr.length - 1].options.paraSpaceAfter = 6; } runs.push(...rr); });
            if (runs.length) sl.addText(runs, { x: X0 + k * (colW + 0.45), y: b.y - 0.35, w: colW, h: b.h + 0.4, fontFace: FB, valign: "top", margin: 0, lineSpacingMultiple: 1.1 });
          });
          break;
        }
        case "creditos": {
          const b = head("Créditos", "Autoria, apoio de IA e licença"); const lw = CW * 0.32, ch = Math.min(b.h, 3.6), y = b.y + (b.h - ch) / 2;
          box(X0, y, lw, ch, P.card, P.line);
          T([{ text: "Autoria", options: { bold: true, fontSize: pt(28), color: c(P.title), breakLine: true, paraSpaceAfter: 6 } }, { text: [deck.author || "Autoria a preencher", deck.role, deck.year].filter(Boolean).join(" · "), options: { fontSize: pt(26), color: c(P.ink) } }], { x: X0 + 0.28, y: y + 0.28, w: lw - 0.56, h: ch - 0.56 });
          const rx = X0 + lw + 0.3, rw = CW - lw - 0.3; box(rx, y, rw, ch, P.card, P.line);
          const fs = pt(24);
          T([
            { text: "Apoio de IA e licença", options: { bold: true, fontSize: pt(28), color: c(P.title), breakLine: true, paraSpaceAfter: 6 } },
            { text: "Produzido com apoio do ", options: { fontSize: fs } }, { text: "ClassAuthor", options: { fontSize: fs, bold: true } }, { text: " (INOVALAB – IFSC), ferramenta de planejamento pedagógico desenvolvida por Rogério Bittencourt.", options: { fontSize: fs, breakLine: true, paraSpaceAfter: 6 } },
            { text: "Editado com o ", options: { fontSize: fs } }, { text: "ClassAtelier", options: { fontSize: fs, bold: true } }, { text: ", ferramenta de autoria de aulas interativas e pacotes SCORM, baseada no LumeAuthor, de Luís Lindner, e evoluída em coautoria com Rogério Bittencourt (INOVALAB – IFSC). Slides gerados pelo ClassAtelier com apoio de IA.", options: { fontSize: fs, breakLine: true, paraSpaceAfter: 6 } },
            { text: "A curadoria, a revisão e a responsabilidade pelo conteúdo são humanas.", options: { fontSize: fs, breakLine: true, paraSpaceAfter: 6 } },
            { text: "Licença CC BY-NC-SA 4.0:", options: { fontSize: fs, bold: true } }, { text: " você pode compartilhar e adaptar, citando a autoria, sem uso comercial e mantendo a mesma licença.", options: { fontSize: fs } }
          ], { x: rx + 0.28, y: y + 0.28, w: rw - 0.56, h: ch - 0.56, color: c(P.ink) });
          break;
        }
        default: head(s.eyebrow, s.title || "");
      }
      if (s.source) T("Fonte: " + s.source, { x: X0 + CW - 4.5, y: H - 64 / PX - 0.55, w: 4.5, h: 0.25, fontSize: pt(20), color: mutedC, align: "right" });
      foot();
      if (s.notes) sl.addNotes(String(s.notes));
    });
    return pptx.write({ outputType: "blob" });
  }

  const api = { deckToPptx, fit };
  if (typeof window !== "undefined") window.ClassSlidesPptx = api;
  if (typeof module !== "undefined") module.exports = api;
})();
