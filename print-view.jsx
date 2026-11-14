// ── Visualizar impressão ───────────────────────────────────────────────────────
// A aula corrida, no tamanho de uma folha A4, com linhas pontilhadas mostrando onde cada página termina:
//   • cinza  = fim automático da página (o navegador quebra ali ao imprimir);
//   • azul   = quebra de página que você mesmo marcou (arraste a alça para mudá-la de lugar).
// Nada é impresso aqui: é só o espelho do que o botão «Imprimir / salvar PDF» vai produzir.
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP, useCallback: useCallbackP } = React;

// Peças que o CSS de impressão (aula-pdf.css) não deixa partir ao meio.
const PV_UNBREAK = "figure, table, tr, p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, .aula-flashcard-print, .aula-quiz-q, .aula-video-print, .aula-audio-print, .aula-fs-print-item, .aula-tl-event, .aula-case-card, .aula-feature, .aula-material-item, .aula-figura, .aula-texto-imagem, .aula-card, .aula-destaque, .aula-reflexao, .aula-atencao, .aula-pitaco";
const PV_HEAD = /^H[1-6]$/;

function pvBlocky(el) {
  const d = getComputedStyle(el).display;
  return d !== "inline" && d !== "contents" && d !== "none" && d.indexOf("inline-") !== 0;
}

// Mede a aula já desenhada e devolve as linhas de quebra: [{ y, manual, id, page, effective }] e o total de páginas.
function pvPaginate(sheet) {
  const app = sheet.querySelector("#app");
  if (!app) return { lines: [], pages: 1 };
  const base = sheet.getBoundingClientRect().top;
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;height:297mm;width:1px";
  sheet.appendChild(probe);
  const P = probe.getBoundingClientRect().height || 1122.5;
  sheet.removeChild(probe);
  const atoms = [], markers = [];
  const walk = (el) => {
    for (const ch of el.children) {
      if (ch.classList && ch.classList.contains("pv-ui")) continue;
      const disp = getComputedStyle(ch).display;
      if (disp === "none") continue;
      if (disp === "contents") { walk(ch); continue; }
      const r = ch.getBoundingClientRect();
      if (r.height < 1) continue;
      const small = r.height <= P * 0.9;
      if (ch.matches(PV_UNBREAK) && small) { atoms.push({ top: r.top - base, bottom: r.bottom - base, head: PV_HEAD.test(ch.tagName) }); continue; }
      const kids = Array.prototype.filter.call(ch.children, (k) => !(k.classList && k.classList.contains("pv-ui")));
      if (!kids.some(pvBlocky)) { if (small) atoms.push({ top: r.top - base, bottom: r.bottom - base, head: false }); continue; }
      walk(ch);
    }
  };
  app.querySelectorAll("[data-pv-break]").forEach((m) => markers.push({ y: m.getBoundingClientRect().top - base, id: m.getAttribute("data-pv-break") }));
  walk(app);
  atoms.sort((a, b) => a.top - b.top);
  markers.sort((a, b) => a.y - b.y);
  const end = app.getBoundingClientRect().bottom - base;
  const bounds = []; // limites efetivos de página, em ordem
  let start = 0, guard = 0;
  while (guard++ < 600 && start + 4 < end) {
    const limit = start + P;
    const m = markers.find((k) => k.y > start + 4 && k.y <= limit + 0.5);
    let y = null, id = null;
    if (limit < end - 2) {
      const a = atoms.find((x) => x.bottom > limit + 0.5);
      if (a) {
        y = a.top < limit ? a.top : limit;
        // título nunca sozinho no pé da página: leva o título junto
        if (y === a.top) { const prev = atoms.filter((x) => x.top < a.top).pop(); if (prev && prev.head && a.top - prev.bottom < 60) y = prev.top; }
        if (y - start < P * 0.15) y = limit;
      } else y = limit;
    }
    if (m && (y == null || m.y <= y)) { y = m.y; id = m.id; }
    if (y == null) break;
    if (y <= start + 1) y = start + P;
    bounds.push({ y, manual: !!id, id });
    start = y;
  }
  const lines = [];
  const used = new Set();
  bounds.forEach((b, i) => { b.page = i + 1; if (b.id) used.add(b.id); lines.push({ y: b.y, manual: b.manual, id: b.id, page: i + 1, effective: true }); });
  markers.forEach((m) => { if (!used.has(m.id)) lines.push({ y: m.y, manual: true, id: m.id, page: null, effective: false }); });
  lines.sort((a, b) => a.y - b.y);
  return { lines, pages: bounds.length + 1, height: end, P };
}

// Quantos caracteres de texto existem de `item` até o ponto (node, off) — sem contar o balão dos termos.
function pvTextOffset(item, node, off) {
  const r = document.createRange();
  r.setStart(item, 0); r.setEnd(node, off);
  const frag = r.cloneContents();
  frag.querySelectorAll && frag.querySelectorAll(".termo__pop").forEach((n) => n.remove());
  return (frag.textContent || "").length;
}

// Início da linha de texto onde o ponteiro está: devolve { node, off } dentro de `item`.
function pvLineStart(item, node, off) {
  const tw = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  if (node.nodeType !== 3) {
    // contêiner de elemento: usa o primeiro texto depois do ponto
    let n = node.childNodes[off] || node;
    const w = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    w.currentNode = n;
    const t = n.nodeType === 3 ? n : w.nextNode();
    if (!t || !item.contains(t)) return null;
    node = t; off = 0;
  }
  const charTop = (tn, o) => {
    const r = document.createRange();
    const len = tn.nodeValue.length;
    if (!len) return null;
    const a = Math.min(Math.max(o, 0), len - 1);
    r.setStart(tn, a); r.setEnd(tn, a + 1);
    const rc = r.getClientRects()[0] || r.getBoundingClientRect();
    return rc && rc.height ? rc : null;
  };
  let cur = charTop(node, Math.min(off, node.nodeValue.length - 1));
  if (!cur) return { node, off };
  const top0 = cur.top, tol = Math.max(3, cur.height * 0.5);
  let tn = node, o = off, steps = 0;
  tw.currentNode = tn;
  while (steps++ < 3000) {
    if (o <= 0) {
      const prev = tw.previousNode();
      if (!prev || !item.contains(prev)) return { node: tn, off: 0 };
      tn = prev; o = tn.nodeValue.length;
      if (!o) continue;
    }
    const rc = charTop(tn, o - 1);
    if (rc && Math.abs(rc.top - top0) > tol) return { node: tn, off: o };
    o--;
  }
  return { node: tn, off: o };
}

// Divide o HTML de um parágrafo no caractere `off` do texto: { before, after, mid } (ou null).
function pvSplitBody(body, off) {
  const host = document.createElement("div");
  host.innerHTML = body || "";
  const tw = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let n, acc = 0, hit = null;
  while ((n = tw.nextNode())) {
    const len = n.nodeValue.length;
    if (acc + len > off) { hit = { node: n, off: off - acc }; break; }
    acc += len;
  }
  const r = document.createRange();
  if (hit) r.setStart(hit.node, hit.off); else r.setStart(host, host.childNodes.length);
  r.collapse(true);
  const html = (frag) => { const d = document.createElement("div"); d.appendChild(frag); return d.innerHTML; };
  const a = document.createRange(); a.setStart(host, 0); a.setEnd(r.startContainer, r.startOffset);
  const b = document.createRange(); b.setStart(r.startContainer, r.startOffset); b.setEnd(host, host.childNodes.length);
  return { before: html(a.cloneContents()), after: html(b.cloneContents()), mid: window.rangeIsMidBlock ? window.rangeIsMidBlock(r, host) : false };
}

function pvCaretFromPoint(x, y) {
  if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, off: p.offset } : null; }
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, off: r.startOffset } : null; }
  return null;
}

// Alvo da quebra sob o ponteiro: { kind: "prose", id, textOffset, y } | { kind: "before", id, y } | null.
function pvTargetAt(sheet, x, y) {
  const base = sheet.getBoundingClientRect().top;
  const els = document.elementsFromPoint(x, y);
  let item = null;
  for (const el of els) { if (el.closest && el.closest(".pv-ui")) continue; const it = el.closest && el.closest("[data-pv-bid]"); if (it && sheet.contains(it)) { item = it; break; } }
  if (!item) return null;
  const id = item.getAttribute("data-pv-bid");
  if (item.getAttribute("data-type") === "prose") {
    const c = pvCaretFromPoint(x, y);
    if (c && item.contains(c.node)) {
      const ls = pvLineStart(item, c.node, c.off);
      if (ls) {
        const r = document.createRange();
        const len = ls.node.nodeValue ? ls.node.nodeValue.length : 0;
        let top = null;
        if (len) { r.setStart(ls.node, Math.min(ls.off, len - 1)); r.setEnd(ls.node, Math.min(ls.off, len - 1) + 1); const rc = r.getClientRects()[0]; if (rc) top = rc.top; }
        if (top == null) top = item.getBoundingClientRect().top;
        return { kind: "prose", id, textOffset: pvTextOffset(item, ls.node, ls.off), y: top - base - 2 };
      }
    }
  }
  return { kind: "before", id, y: item.getBoundingClientRect().top - base - 2 };
}

function PrintView({ lesson, onAdd, onMove, onRemove, onPrint, onClose, onLayout }) {
  const scroller = useRefP(null);
  const sheet = useRefP(null);
  const [info, setInfo] = useStateP({ lines: [], pages: 1 });
  const [hover, setHover] = useStateP(null);
  const [drag, setDrag] = useStateP(null);
  const dragRef = useRefP(null);
  const ptr = useRefP({ x: 0, y: 0 });

  useEffectP(() => {
    const el = document.documentElement;
    // O editor não carrega o CSS de impressão (aula-pdf.css); ele entra só enquanto esta tela está aberta.
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.setAttribute("data-pv-css", "");
    link.href = (window.AULA_BASE || "") + "ui_kits/scorm_lesson/aula-pdf.css?v=" + (window.CLASSATELIER_VERSION || "1");
    link.addEventListener("load", () => { const e = new Event("resize"); window.dispatchEvent(e); });
    document.head.appendChild(link);
    el.setAttribute("data-pdf", ""); el.setAttribute("data-pv", "");
    return () => { el.removeAttribute("data-pdf"); el.removeAttribute("data-pv"); link.remove(); };
  }, []);

  const measure = useCallbackP(() => {
    if (!sheet.current) return;
    const r = pvPaginate(sheet.current);
    setInfo((old) => (JSON.stringify(old.lines) === JSON.stringify(r.lines) && old.pages === r.pages && old.height === r.height ? old : r));
  }, []);

  useEffectP(() => {
    let raf = 0;
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    const ro = new ResizeObserver(later);
    if (sheet.current) ro.observe(sheet.current);
    const app = sheet.current && sheet.current.querySelector("#app");
    if (app) ro.observe(app);
    window.addEventListener("resize", later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
    const t1 = setTimeout(later, 120), t2 = setTimeout(later, 900), t3 = setTimeout(later, 2500);
    const imgs = sheet.current ? Array.from(sheet.current.querySelectorAll("img")) : [];
    imgs.forEach((im) => { if (!im.complete) im.addEventListener("load", later, { once: true }); });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("resize", later); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [lesson, measure]);

  useEffectP(() => { onLayout && onLayout(info); }, [info]);
  useEffectP(() => {
    window.__pvJump = (id) => {
      const ln = info.lines.find((l) => l.id === id);
      if (ln && scroller.current) scroller.current.scrollTo({ top: Math.max(0, ln.y + 20 - scroller.current.clientHeight / 2), behavior: "smooth" });
    };
    return () => { delete window.__pvJump; };
  }, [info]);

  // passar o mouse mostra «+ Quebra aqui» no começo da linha
  const onMove_ = (e) => {
    ptr.current = { x: e.clientX, y: e.clientY };
    if (dragRef.current) return;
    if (e.target.closest && e.target.closest(".pv-ui")) return;
    const t = sheet.current ? pvTargetAt(sheet.current, e.clientX, e.clientY) : null;
    setHover(t);
  };
  const onLeave = (e) => { if (!(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".pv-ui"))) setHover(null); };

  // arrastar a alça de uma quebra manual
  const startDrag = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { id, target: null };
    setDrag({ id, target: null }); setHover(null);
    let raf = 0;
    const update = () => {
      const t = pvTargetAt(sheet.current, ptr.current.x, ptr.current.y);
      dragRef.current.target = t;
      setDrag({ id, target: t });
    };
    const auto = () => {
      const sc = scroller.current; if (!sc || !dragRef.current) return;
      const rc = sc.getBoundingClientRect(), y = ptr.current.y;
      let dy = 0;
      if (y < rc.top + 70) dy = -Math.ceil((rc.top + 70 - y) / 5); else if (y > rc.bottom - 70) dy = Math.ceil((y - (rc.bottom - 70)) / 5);
      if (dy) { sc.scrollTop += dy; update(); }
      raf = requestAnimationFrame(auto);
    };
    const mv = (ev) => { ptr.current = { x: ev.clientX, y: ev.clientY }; update(); };
    const sc = () => update();
    const up = () => {
      window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      scroller.current && scroller.current.removeEventListener("scroll", sc);
      cancelAnimationFrame(raf);
      const d = dragRef.current; dragRef.current = null; setDrag(null);
      if (d && d.target) onMove(id, d.target);
    };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    scroller.current && scroller.current.addEventListener("scroll", sc);
    ptr.current = { x: e.clientX, y: e.clientY };
    raf = requestAnimationFrame(auto);
    update();
  };

  const manualCount = info.lines.filter((l) => l.manual).length;
  return (
    <div className="pv" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: "var(--tool-canvas, #D9DBE0)" }}>
      <div className="pv-bar">
        <b>Visualizar impressão</b>
        <span>Folha A4 · {info.pages} {info.pages === 1 ? "página" : "páginas"}{manualCount ? " · " + manualCount + (manualCount === 1 ? " quebra sua" : " quebras suas") : ""}</span>
        <span className="pv-hint">Cinza: fim da página · Azul: sua quebra (arraste a alça) · Passe o mouse no texto para criar uma</span>
        <button data-act="pv-print" className="pv-primary" onClick={onPrint} title="Abre a janela de impressão do navegador, onde também dá para salvar como PDF">Imprimir / salvar PDF</button>
        <button data-act="pv-close" onClick={onClose} title="Voltar à aula">Fechar</button>
      </div>
      <div ref={scroller} className="tool-scroll pv-scroll" onMouseMove={onMove_} onMouseLeave={onLeave} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "18px 0 120px" }}>
        <div ref={sheet} className="pv-sheet" data-pv-sheet style={{ position: "relative", width: "210mm", margin: "0 auto", background: "var(--paper)", boxShadow: "0 2px 14px rgba(0,0,0,.22)" }}>
          <window.LessonRenderer lesson={lesson} mode="preview" chrome={true} pdf={true} />
          <div className="pv-ui pv-overlay" aria-hidden={drag ? "true" : undefined}>
            {info.lines.map((l, i) => (
              <div key={(l.id || "a") + i} className={"pv-line " + (l.manual ? "is-manual" : "is-auto") + (drag && drag.id === l.id ? " is-dragged" : "") + (l.effective ? "" : " is-idle")} style={{ top: l.y }} data-pv-line={l.manual ? "manual" : "auto"} data-pv-id={l.id || undefined}>
                {l.manual
                  ? <>
                      <span className="pv-grip" data-pv-grip onPointerDown={(e) => startDrag(e, l.id)} title="Arraste para mudar a quebra de lugar">⋮⋮</span>
                      <span className="pv-tag">{l.effective ? "Quebra de página · a página " + (l.page + 1) + " começa aqui" : "Quebra de página (já no começo de uma página)"}</span>
                      <button className="pv-x" data-pv-remove onClick={() => onRemove(l.id)} title="Tirar esta quebra de página">✕</button>
                    </>
                  : <span className="pv-tag">fim da página {l.page}</span>}
              </div>
            ))}
            {drag && drag.target && <div className="pv-line is-ghost" style={{ top: drag.target.y }}><span className="pv-tag">solte aqui</span></div>}
            {!drag && hover && <div className="pv-hoverline" style={{ top: hover.y }}>
              <button className="pv-add" data-pv-add onClick={() => { onAdd(hover); setHover(null); }}>＋ Quebra de página aqui</button>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Painel da direita (modo Editar): resumo e lista das quebras.
function PrintPanel({ info, onRemove, onPrint, onClose }) {
  const manual = (info.lines || []).filter((l) => l.manual);
  return (
    <div style={{ padding: 16, fontSize: 13, color: "var(--tool-ink)", overflow: "auto" }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>Impressão (A4)</div>
      <div style={{ color: "var(--tool-ink-2)", margin: "4px 0 12px" }}>{info.pages || 1} {(info.pages || 1) === 1 ? "página" : "páginas"} no PDF</div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: "var(--tool-ink-3)", margin: "12px 0 6px" }}>SUAS QUEBRAS DE PÁGINA</div>
      {manual.length === 0 && <div style={{ color: "var(--tool-ink-2)", lineHeight: 1.45 }}>Nenhuma ainda. Passe o mouse no texto e clique em «＋ Quebra de página aqui».</div>}
      {manual.map((l, i) => (
        <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--tool-line)", borderRadius: 8, padding: "7px 9px", marginBottom: 6 }}>
          <button onClick={() => window.__pvJump && window.__pvJump(l.id)} style={{ flex: 1, textAlign: "left", border: 0, background: "none", cursor: "pointer", font: "inherit", color: "inherit" }}>
            <b>Quebra {i + 1}</b><br /><span style={{ color: "var(--tool-ink-3)", fontSize: 12 }}>{l.effective ? "começa a página " + (l.page + 1) : "já no começo de uma página"}</span>
          </button>
          <button onClick={() => onRemove(l.id)} title="Tirar esta quebra" aria-label="Tirar esta quebra" style={{ border: "1px solid var(--tool-line)", background: "#fff", borderRadius: 6, width: 26, height: 26, cursor: "pointer" }}>✕</button>
        </div>
      ))}
      <div style={{ color: "var(--tool-ink-2)", lineHeight: 1.45, margin: "12px 0" }}>Arraste a alça azul para mudar a quebra de lugar. A linha cai no começo da linha de texto mais próxima; se for no meio de um parágrafo, ele se divide ali. Ctrl+Z desfaz.</div>
      <button data-act="pv-print-panel" onClick={onPrint} style={{ width: "100%", height: 36, border: 0, borderRadius: 8, background: "var(--tool-accent, #D9593B)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Imprimir / salvar PDF</button>
      <button onClick={onClose} style={{ width: "100%", height: 34, marginTop: 8, border: "1px solid var(--tool-line)", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Voltar à aula</button>
    </div>
  );
}

Object.assign(window, { PrintView, PrintPanel, pvSplitBody });
