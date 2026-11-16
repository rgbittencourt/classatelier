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
  const d = el.ownerDocument.defaultView.getComputedStyle(el).display;
  return d !== "inline" && d !== "contents" && d !== "none" && d.indexOf("inline-") !== 0;
}

// Mede a aula já desenhada e devolve as linhas de quebra: [{ y, manual, id, page, effective }] e o total de páginas.
function pvPaginate(sheet) {
  const app = sheet.querySelector("#app");
  if (!app) return { lines: [], pages: 1 };
  const base = sheet.getBoundingClientRect().top;
  const W = sheet.ownerDocument.defaultView;
  const probe = sheet.ownerDocument.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;height:297mm;width:1px";
  sheet.appendChild(probe);
  const P = probe.getBoundingClientRect().height || 1122.5;
  sheet.removeChild(probe);
  const atoms = [], markers = [];
  const walk = (el) => {
    for (const ch of el.children) {
      if (ch.classList && ch.classList.contains("pv-ui")) continue;
      const disp = W.getComputedStyle(ch).display;
      if (disp === "none") continue;
      if (disp === "contents") { walk(ch); continue; }
      const r = ch.getBoundingClientRect();
      if (r.height < 1) continue;
      const small = r.height <= P * 0.9;
      if (ch.matches(PV_UNBREAK) && small) { atoms.push({ top: r.top - base, bottom: r.bottom - base, head: PV_HEAD.test(ch.tagName), el: ch }); continue; }
      const kids = Array.prototype.filter.call(ch.children, (k) => !(k.classList && k.classList.contains("pv-ui")));
      if (!kids.some(pvBlocky)) { if (small) atoms.push({ top: r.top - base, bottom: r.bottom - base, head: false, el: ch }); continue; }
      walk(ch);
    }
  };
  app.querySelectorAll("[data-pv-break]").forEach((m) => {
    // No PDF, a quebra manual leva consigo a margem de cima do bloco que a guarda: ela se soma à do bloco seguinte.
    const it = m.closest(".aula-topic-item");
    const mt = it ? parseFloat(W.getComputedStyle(it).marginTop) || 0 : 0;
    markers.push({ y: m.getBoundingClientRect().top - base, id: m.getAttribute("data-pv-break"), mt });
  });
  walk(app);
  atoms.sort((a, b) => a.top - b.top);
  markers.sort((a, b) => a.y - b.y);
  const end = app.getBoundingClientRect().bottom - base;
  // Margem do PDF: cada faixa de cor (.aula-fullbleed) repete 15 mm de respiro no alto e no pé de CADA página em que continua
  // (box-decoration-break: clone). A prévia reserva o mesmo espaço, senão o texto vai até a borda da folha e pagina diferente do PDF.
  const PAD = P * 15 / 297;
  const bands = Array.prototype.map.call(app.querySelectorAll(".aula-fullbleed"), (b) => { const r = b.getBoundingClientRect(); return { top: r.top - base, bottom: r.bottom - base }; });
  const startsInBand = (y) => y > 2 && bands.some((b) => y > b.top + 2 && y < b.bottom - 2);
  const continuesPast = (y) => bands.some((b) => y > b.top + 2 && y < b.bottom - PAD - 2);
  const bounds = []; // limites efetivos de página, em ordem: { y, manual, id, el, off, padTop }
  let start = 0, guard = 0;
  const done = new Set();
  while (guard++ < 600 && start + 4 < end) {
    const topRes = startsInBand(start) ? PAD : 0;
    const e0 = start + P - topRes;
    const limit = e0 - (continuesPast(e0) ? PAD : 0);
    const m = markers.find((k) => !done.has(k.id) && k.y > start + 4 && k.y <= limit + 0.5);
    let y = null, id = null, el = null, off = 0, mt = 0;
    if (limit < end - 2) {
      const a = atoms.find((x) => x.bottom > limit + 0.5);
      if (a) {
        // o bloco cruza o limite (vai inteiro para a próxima página) ou já começa depois dele (a folha acabou antes)
        y = a.top;
        let first = a;
        // título nunca sozinho no pé da página: leva o título junto
        if (a.top < limit) { const prev = atoms.filter((x) => x.top < a.top).pop(); if (prev && prev.head && a.top - prev.bottom < 60) { y = prev.top; first = prev; } }
        if (a.top < limit && y - start < P * 0.15) { y = limit; first = null; }
        if (first) el = first.el;
      } else y = limit;
    }
    if (m && (y == null || m.y <= y)) {
      y = m.y; id = m.id;
      const nx = atoms.find((x) => x.top >= m.y - 1);
      el = nx ? nx.el : null; off = nx ? Math.max(0, nx.top - m.y) + m.mt : m.mt; mt = m.mt; done.add(m.id);
    }
    if (y == null) break;
    if (y <= start + 1) { y = start + P; el = null; off = 0; id = null; }
    bounds.push({ y, manual: !!id, id, el, off, padTop: startsInBand(y) ? PAD : 0 });
    start = id ? y - mt : y; // a margem extra da quebra manual ocupa o alto da página nova
  }
  const lines = [];
  const used = new Set();
  bounds.forEach((b, i) => { b.page = i + 1; if (b.id) used.add(b.id); lines.push({ y: b.y, manual: b.manual, id: b.id, page: i + 1, effective: true }); });
  markers.forEach((m) => { if (!used.has(m.id)) lines.push({ y: m.y, manual: true, id: m.id, page: null, effective: false }); });
  lines.sort((a, b) => a.y - b.y);
  return { lines, pages: bounds.length + 1, height: end, P, bounds };
}

const PV_GAP = 28; // faixa cinza entre uma folha e outra, em px

function pvClearGaps(sheet) { sheet.querySelectorAll(".pv-gapel").forEach((g) => g.remove()); sheet.style.minHeight = ""; }

// Folhas A4: empurra o conteúdo para que cada limite de página caia no começo de uma folha nova.
// Os vãos são só espaçadores; a faixa cinza e o número de página são desenhados por cima, em posição exata.
function pvApplyGaps(sheet, bounds, P) {
  const base = sheet.getBoundingClientRect().top;
  const app = sheet.querySelector("#app");
  bounds.forEach((b, i) => {
    if (!b.el || !b.el.isConnected) return;
    let ref = b.el;
    while (ref.parentElement && ref.parentElement !== app && ref.parentElement !== sheet && /flex|grid|table/.test(sheet.ownerDocument.defaultView.getComputedStyle(ref.parentElement).display)) ref = ref.parentElement;
    const g = sheet.ownerDocument.createElement("div");
    g.className = "pv-gapel pv-ui";
    g.setAttribute("aria-hidden", "true");
    g.style.cssText = "height:1px;margin:0;padding:0;border:0;pointer-events:none;flex:none;width:100%";
    ref.parentNode.insertBefore(g, ref);
    const t0 = b.el.getBoundingClientRect().top - base;
    const desired = (i + 1) * (P + PV_GAP) + (b.padTop || 0) + (b.off || 0);
    g.style.height = Math.max(1, desired - t0 + 1) + "px"; // 1px de partida: um vão vazio deixaria a margem do bloco se fundir com ele
  });
}

// Quantos caracteres de texto existem de `item` até o ponto (node, off) — sem contar o balão dos termos.
function pvTextOffset(item, node, off) {
  const r = item.ownerDocument.createRange();
  r.setStart(item, 0); r.setEnd(node, off);
  const frag = r.cloneContents();
  frag.querySelectorAll && frag.querySelectorAll(".termo__pop").forEach((n) => n.remove());
  return (frag.textContent || "").length;
}

// Início da linha de texto onde o ponteiro está: devolve { node, off } dentro de `item`.
function pvLineStart(item, node, off) {
  const D = item.ownerDocument;
  const tw = D.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  if (node.nodeType !== 3) {
    // contêiner de elemento: usa o primeiro texto depois do ponto
    let n = node.childNodes[off] || node;
    const w = D.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    w.currentNode = n;
    const t = n.nodeType === 3 ? n : w.nextNode();
    if (!t || !item.contains(t)) return null;
    node = t; off = 0;
  }
  const charTop = (tn, o) => {
    const r = D.createRange();
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

function pvCaretFromPoint(document, x, y) {
  if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, off: p.offset } : null; }
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, off: r.startOffset } : null; }
  return null;
}

// Alvo da quebra sob o ponteiro: { kind: "prose", id, textOffset, y } | { kind: "before", id, y } | null.
function pvTargetAt(sheet, x, y) {
  const document = sheet.ownerDocument;
  const base = sheet.getBoundingClientRect().top;
  const els = document.elementsFromPoint(x, y);
  let item = null;
  for (const el of els) { if (el.closest && el.closest(".pv-ui")) continue; const it = el.closest && el.closest("[data-pv-bid]"); if (it && sheet.contains(it)) { item = it; break; } }
  if (!item) return null;
  const id = item.getAttribute("data-pv-bid");
  if (item.getAttribute("data-type") === "prose") {
    const c = pvCaretFromPoint(document, x, y);
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
  const frameRef = useRefP(null);
  const sheet = useRefP(null);
  const [host, setHost] = useStateP(null);   // <div> dentro do iframe: é lá que a aula é desenhada
  const [ready, setReady] = useStateP(false); // estilos do iframe carregados
  const [info, setInfo] = useStateP({ lines: [], pages: 1 });
  const [hover, setHover] = useStateP(null);
  const [drag, setDrag] = useStateP(null);
  const dragRef = useRefP(null);
  const ptr = useRefP({ x: 0, y: 0 });

  // A prévia mora num iframe com a largura exata de uma folha A4 (210 mm): assim as unidades vw e as media queries da aula
  // valem o que valem no PDF, e não o que valeria na janela larga do editor. O CSS de impressão (aula-pdf.css) entra com
  // «@media print» trocado por «@media all», para a tela mostrar as mesmas regras que o papel.
  useEffectP(() => {
    const fr = frameRef.current;
    if (!fr || !fr.contentDocument) return;
    const doc = fr.contentDocument;
    doc.open(); doc.write("<!doctype html><html><head><meta charset=\"utf-8\"></head><body></body></html>"); doc.close();
    const pending = [];
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
      if (n.closest && n.closest("iframe")) return;
      const c = n.cloneNode(true);
      if (c.tagName === "LINK") pending.push(new Promise((ok) => { c.addEventListener("load", ok); c.addEventListener("error", ok); }));
      doc.head.appendChild(c);
    });
    Array.from(document.documentElement.attributes).forEach((a) => { if (a.name !== "style") doc.documentElement.setAttribute(a.name, a.value); });
    doc.documentElement.style.cssText = document.documentElement.style.cssText;
    doc.documentElement.setAttribute("data-pdf", ""); doc.documentElement.setAttribute("data-pv", "");
    doc.documentElement.style.setProperty("height", "auto"); doc.documentElement.style.setProperty("background", "var(--paper,#fff)"); doc.documentElement.style.setProperty("overflow", "hidden");
    Array.from(document.body.classList).forEach((c) => doc.body.classList.add(c));
    doc.body.style.cssText = "margin:0;height:auto;overflow:hidden;background:var(--paper,#fff)";
    const st = doc.createElement("style"); st.setAttribute("data-pv-css", "");
    doc.head.appendChild(st);
    const url = (window.AULA_BASE || "") + "ui_kits/scorm_lesson/aula-pdf.css?v=" + (window.CLASSATELIER_VERSION || "1");
    pending.push(fetch(url).then((r) => r.text()).then((t) => { st.textContent = t.replace(/@media print/g, "@media all"); }).catch(() => {}));
    const div = doc.createElement("div"); doc.body.appendChild(div);
    setHost(div);
    let alive = true;
    Promise.all(pending).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const [view, setViewState] = useStateP(() => { try { return localStorage.getItem("classatelier.pv.view") === "flow" ? "flow" : "sheets"; } catch (e) { return "sheets"; } });
  const setView = (v) => { setViewState(v); try { localStorage.setItem("classatelier.pv.view", v); } catch (e) {} };
  const busy = useRefP(false);
  const measure = useCallbackP(() => {
    const sh = sheet.current;
    if (!sh) return;
    busy.current = true;
    pvClearGaps(sh);
    let r = pvPaginate(sh);
    if (view === "sheets") {
      pvApplyGaps(sh, r.bounds, r.P);
      sh.style.minHeight = (r.pages * r.P + (r.pages - 1) * PV_GAP) + "px";
      const base = sh.getBoundingClientRect().top, ys = {};
      sh.querySelectorAll("[data-pv-break]").forEach((m) => { ys[m.getAttribute("data-pv-break")] = m.getBoundingClientRect().top - base; });
      r = { ...r, lines: r.lines.filter((l) => l.manual).map((l) => ({ ...l, y: ys[l.id] != null ? ys[l.id] : l.y })) };
    }
    const height = Math.ceil(sh.getBoundingClientRect().height);
    if (frameRef.current) frameRef.current.style.height = height + "px";
    const out = { lines: r.lines, pages: r.pages, height, P: r.P, view };
    setInfo((old) => (JSON.stringify(old.lines) === JSON.stringify(out.lines) && old.pages === out.pages && old.height === out.height && old.view === out.view ? old : out));
    requestAnimationFrame(() => requestAnimationFrame(() => { busy.current = false; }));
  }, [view]);

  useEffectP(() => {
    const sh = sheet.current;
    if (!sh || !ready) return;
    const doc = sh.ownerDocument;
    let raf = 0;
    const later = () => { if (busy.current) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    const ro = new ResizeObserver(later);
    ro.observe(sh);
    const app = sh.querySelector("#app");
    if (app) ro.observe(app);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(later);
    const t1 = setTimeout(later, 120), t2 = setTimeout(later, 900), t3 = setTimeout(later, 2500);
    const imgs = Array.from(sh.querySelectorAll("img"));
    imgs.forEach((im) => { if (!im.complete) im.addEventListener("load", later, { once: true }); });
    later();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [lesson, measure, ready, host]);

  useEffectP(() => { onLayout && onLayout(info); }, [info]);
  useEffectP(() => {
    window.__pvJump = (id) => {
      const ln = info.lines.find((l) => l.id === id);
      const sc = scroller.current, fr = frameRef.current;
      if (ln && sc && fr) {
        const top = fr.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop + ln.y;
        sc.scrollTo({ top: Math.max(0, top + 20 - sc.clientHeight / 2), behavior: "smooth" });
      }
    };
    return () => { delete window.__pvJump; };
  }, [info]);

  // passar o mouse mostra «+ Quebra aqui» no começo da linha (as coordenadas são as do iframe)
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
    const fw = sheet.current.ownerDocument.defaultView;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    dragRef.current = { id, target: null };
    setDrag({ id, target: null }); setHover(null);
    let raf = 0;
    const update = () => {
      const t = pvTargetAt(sheet.current, ptr.current.x, ptr.current.y);
      dragRef.current.target = t;
      setDrag({ id, target: t });
    };
    const auto = () => {
      const sc = scroller.current, fr = frameRef.current; if (!sc || !fr || !dragRef.current) return;
      const rc = sc.getBoundingClientRect(), y = fr.getBoundingClientRect().top + ptr.current.y; // y do ponteiro na janela do editor
      let dy = 0;
      if (y < rc.top + 70) dy = -Math.ceil((rc.top + 70 - y) / 5); else if (y > rc.bottom - 70) dy = Math.ceil((y - (rc.bottom - 70)) / 5);
      if (dy) { sc.scrollTop += dy; update(); }
      raf = requestAnimationFrame(auto);
    };
    const mv = (ev) => { ptr.current = { x: ev.clientX, y: ev.clientY }; update(); };
    const up = () => {
      fw.removeEventListener("pointermove", mv); fw.removeEventListener("pointerup", up); fw.removeEventListener("pointercancel", up);
      cancelAnimationFrame(raf);
      const d = dragRef.current; dragRef.current = null; setDrag(null);
      if (d && d.target) onMove(id, d.target);
    };
    fw.addEventListener("pointermove", mv); fw.addEventListener("pointerup", up); fw.addEventListener("pointercancel", up);
    ptr.current = { x: e.clientX, y: e.clientY };
    raf = requestAnimationFrame(auto);
    update();
  };

  const manualCount = info.lines.filter((l) => l.manual).length;
  const ui = (
    <div ref={sheet} className="pv-sheet" data-pv-sheet onMouseMove={onMove_} onMouseLeave={onLeave} style={{ position: "relative", width: "210mm", margin: 0, background: "var(--paper)" }}>
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
  );
  return (
    <div className="pv" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: "var(--tool-canvas, #D9DBE0)" }}>
      <div className="pv-bar">
        <b>Visualizar impressão</b>
        <div role="group" aria-label="Modo da visualização" className="pv-seg">
          <button type="button" data-pv-view="flow" aria-pressed={view === "flow"} onClick={() => setView("flow")} title="A aula corrida, com linhas pontilhadas nos limites de página">Aula corrida</button>
          <button type="button" data-pv-view="sheets" aria-pressed={view === "sheets"} onClick={() => setView("sheets")} title="Cada página numa folha A4 separada, com o espaço que sobra em branco">Folhas A4</button>
        </div>
        <span>Folha A4 · {info.pages} {info.pages === 1 ? "página" : "páginas"}{manualCount ? " · " + manualCount + (manualCount === 1 ? " quebra sua" : " quebras suas") : ""}</span>
        <span className="pv-hint">{view === "sheets" ? "Azul: sua quebra (arraste a alça) · Passe o mouse no texto para criar uma" : "Cinza: fim da página · Azul: sua quebra (arraste a alça) · Passe o mouse no texto para criar uma"}</span>
        <button data-act="pv-print" className="pv-primary" onClick={onPrint} title="Abre a janela de impressão do navegador, onde também dá para salvar como PDF">Imprimir / salvar PDF</button>
        <button data-act="pv-close" onClick={onClose} title="Voltar à aula">Fechar</button>
      </div>
      <div ref={scroller} className="tool-scroll pv-scroll" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "18px 0 120px" }}>
        <div className="pv-wrap" style={{ position: "relative", width: "210mm", margin: "0 auto", background: "var(--paper, #fff)", boxShadow: "0 2px 14px rgba(0,0,0,.22)" }}>
          <iframe ref={frameRef} className="pv-frame" data-pv-frame title="Visualização da impressão" style={{ display: "block", width: "100%", height: 1123, border: 0, background: "var(--paper, #fff)" }} />
          <div className="pv-ui pv-overlay" aria-hidden="true">
            {info.view === "sheets" && Array.from({ length: Math.max(0, info.pages - 1) }, (_, k) => (
              <div key={"band" + k} className="pv-band" data-pv-band style={{ top: (k + 1) * info.P + k * PV_GAP, height: PV_GAP }}>
                <span>fim da página {k + 1} · começa a página {k + 2}</span>
              </div>
            ))}
            {info.view === "sheets" && <div className="pv-pn" style={{ top: 6 }}>Página 1 de {info.pages}</div>}
            {info.view === "sheets" && Array.from({ length: Math.max(0, info.pages - 1) }, (_, k) => (
              <div key={"pn" + k} className="pv-pn" style={{ top: (k + 1) * (info.P + PV_GAP) + 6 }}>Página {k + 2} de {info.pages}</div>
            ))}
          </div>
        </div>
      </div>
      {host && ready && ReactDOM.createPortal(ui, host)}
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
