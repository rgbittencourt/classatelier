/* eslint-disable */
// ClassAtelier — modo apresentação.
//
// Mostra a aula em tela cheia, uma seção (bloco de nível mais alto) por vez, para projetar em sala
// ou numa videochamada. É a mesma aula da prévia, só que fatiada: nada é exportado nem gravado.
// Teclado: → ↓ PageDown Espaço = próxima · ← ↑ PageUp = anterior · Home / End · I = índice ·
// + / − = tamanho do texto · F = tela cheia · Esc = sair. Celular e tablet: deslizar para os lados.
(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const LS_ZOOM = "classatelier.present.zoom";
  const ZOOMS = [1, 1.15, 1.3, 1.5, 1.75, 2];

  const safeGet = (k) => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
  const plain = (h) => String(h == null ? "" : h).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  const clip = (t, n = 70) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

  // Nome da seção para o índice e para o leitor de tela: título do bloco, ou do primeiro título dentro dele.
  function slideTitle(block, index) {
    const p = block.props || {};
    const own = plain(p.title || p.heading || p.text || p.eyebrow || p.question);
    if (own) return clip(own);
    const kids = Array.isArray(p.children) ? p.children : [];
    for (const k of kids) {
      const kp = k.props || {};
      const t = plain(kp.text || kp.title || kp.heading);
      if (t && (k.type === "titulo" || k.type === "heading")) return clip(t);
    }
    for (const k of kids) { const t = plain((k.props || {}).text || (k.props || {}).title || (k.props || {}).body); if (t) return clip(t); }
    const def = window.BLOCK_BY_TYPE && window.BLOCK_BY_TYPE[block.type];
    return (def && def.label) || "Seção " + (index + 1);
  }

  function containsId(block, id) {
    if (!id) return false;
    if (block.id === id) return true;
    const kids = block.props && Array.isArray(block.props.children) ? block.props.children : [];
    return kids.some((k) => containsId(k, id));
  }

  // Índice da seção que contém o bloco selecionado no editor (ou 0).
  function startIndexFor(lesson, selectedId) {
    const i = (lesson.blocks || []).findIndex((b) => containsId(b, selectedId));
    return i < 0 ? 0 : i;
  }

  const isTyping = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

  function PresentMode({ lesson, startAt = 0, onClose }) {
    const blocks = lesson.blocks || [];
    const total = blocks.length;
    const [i, setI] = useState(Math.max(0, Math.min(total - 1, startAt)));
    const [zoomIdx, setZoomIdx] = useState(() => { const z = Number(safeGet(LS_ZOOM)); const k = ZOOMS.indexOf(z); return k < 0 ? 0 : k; });
    const [chrome, setChrome] = useState(true);
    const [index, setIndex] = useState(false);
    const [full, setFull] = useState(false);
    const root = useRef(null), scroller = useRef(null), hideTimer = useRef(null), touch = useRef(null), wantFull = useRef(false), opener = useRef(null);
    const titles = useMemo(() => blocks.map(slideTitle), [lesson]);
    const go = useCallback((n) => setI((cur) => { const t = typeof n === "function" ? n(cur) : n; return Math.max(0, Math.min(total - 1, t)); }), [total]);
    const zoom = ZOOMS[zoomIdx];
    const setZoom = (k) => { const n = Math.max(0, Math.min(ZOOMS.length - 1, k)); setZoomIdx(n); safeSet(LS_ZOOM, String(ZOOMS[n])); };

    const toggleFull = useCallback(async () => {
      try {
        if (document.fullscreenElement) { wantFull.current = false; await document.exitFullscreen(); }
        else if (root.current && root.current.requestFullscreen) { wantFull.current = true; await root.current.requestFullscreen(); }
      } catch (e) { wantFull.current = false; }
    }, []);

    // Abre em tela cheia (quando o navegador deixa) e devolve o foco ao botão que abriu.
    useEffect(() => {
      opener.current = document.activeElement;
      if (root.current) root.current.focus();
      if (root.current && root.current.requestFullscreen) { wantFull.current = true; root.current.requestFullscreen().catch(() => { wantFull.current = false; }); }
      const onFs = () => {
        const on = !!document.fullscreenElement; setFull(on);
        if (!on && wantFull.current) { wantFull.current = false; onClose(); } // Esc no modo tela cheia: sai da apresentação também
      };
      document.addEventListener("fullscreenchange", onFs);
      const prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("fullscreenchange", onFs); document.body.style.overflow = prevOverflow;
        wantFull.current = false; if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        try { opener.current && opener.current.focus && opener.current.focus(); } catch (e) {}
      };
    }, []);

    // Ao trocar de seção, volta ao topo.
    useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [i]);

    // Barra de controles some depois de 3 s sem movimento (some também o cursor).
    const wake = useCallback(() => {
      setChrome(true); clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setChrome(false), 3200);
    }, []);
    useEffect(() => { wake(); return () => clearTimeout(hideTimer.current); }, []);

    useEffect(() => {
      const onKey = (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target; wake();
        if (e.key === "Escape") { if (index) { setIndex(false); e.preventDefault(); return; } if (!document.fullscreenElement) { e.preventDefault(); onClose(); } return; }
        if (isTyping(t)) return;
        const onButton = t && t.tagName === "BUTTON";
        const k = e.key;
        if (k === "ArrowRight" || k === "PageDown" || (k === " " && !onButton) || (k === "Enter" && !onButton && !index)) { e.preventDefault(); go((n) => n + 1); }
        else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") { e.preventDefault(); go((n) => n - 1); }
        else if (k === "ArrowDown" && !index) { const s = scroller.current; if (s && s.scrollTop + s.clientHeight < s.scrollHeight - 4) return; e.preventDefault(); go((n) => n + 1); }
        else if (k === "ArrowUp" && !index) { const s = scroller.current; if (s && s.scrollTop > 4) return; e.preventDefault(); go((n) => n - 1); }
        else if (k === "Home") { e.preventDefault(); go(0); }
        else if (k === "End") { e.preventDefault(); go(total - 1); }
        else if (k === "i" || k === "I") { e.preventDefault(); setIndex((v) => !v); }
        else if (k === "f" || k === "F") { e.preventDefault(); toggleFull(); }
        else if (k === "+" || k === "=") { e.preventDefault(); setZoom(zoomIdx + 1); }
        else if (k === "-" || k === "_") { e.preventDefault(); setZoom(zoomIdx - 1); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [index, total, zoomIdx, go, onClose, toggleFull, wake]);

    // Deslizar para os lados (toque).
    const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY, t: Date.now() }; };
    const onTouchEnd = (e) => {
      const s = touch.current; touch.current = null; if (!s) return;
      const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - s.t < 800) go((n) => n + (dx < 0 ? 1 : -1));
    };

    const bar = { position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 3, display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 999, background: "rgba(24,22,19,.88)", color: "#fff", boxShadow: "0 8px 28px rgba(0,0,0,.35)", transition: "opacity .25s", opacity: chrome || index ? 1 : 0, pointerEvents: chrome || index ? "auto" : "none", fontFamily: "var(--font-sans, system-ui)", maxWidth: "calc(100vw - 16px)" };
    const btn = (disabled) => ({ border: 0, background: "transparent", color: "#fff", minWidth: 38, height: 38, padding: "0 10px", borderRadius: 999, fontSize: 14, fontWeight: 650, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, fontFamily: "inherit", whiteSpace: "nowrap" });
    const block = blocks[i];

    return (
      <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Modo apresentação" data-present="root"
        onMouseMove={wake} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position: "fixed", inset: 0, zIndex: 10050, background: "var(--paper, #fbf9f4)", outline: "none", cursor: chrome || index ? "default" : "none" }}>
        <div aria-hidden="true" style={{ position: "fixed", left: 0, top: 0, height: 4, zIndex: 3, width: total > 1 ? (i / (total - 1)) * 100 + "%" : "100%", background: "var(--tool-accent, #D85C3C)", transition: "width .25s" }} />
        <div ref={scroller} data-present="scroller" tabIndex={-1} style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden" }}>
          {total === 0
            ? <p style={{ padding: 48, fontSize: 18 }}>A aula ainda não tem blocos. Volte ao editor e acrescente conteúdo.</p>
            : <div key={block.id} data-present="slide" style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", zoom: zoom, paddingBottom: 72 }}>
                <window.BlockView block={{ ...block, onChange: () => {} }} mode="preview" />
              </div>}
        </div>
        <div role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{total ? "Seção " + (i + 1) + " de " + total + ": " + titles[i] : ""}</div>

        <div role="toolbar" aria-label="Controles da apresentação" data-present="bar" style={bar} onFocus={wake}>
          <button type="button" data-present="prev" onClick={() => go(i - 1)} disabled={i <= 0} aria-label="Seção anterior" title="Anterior (←)" style={btn(i <= 0)}>←</button>
          <button type="button" data-present="count" onClick={() => setIndex((v) => !v)} aria-expanded={index} aria-label={"Índice das seções. Seção " + (i + 1) + " de " + total} title="Índice (I)" style={{ ...btn(false), minWidth: 90 }}>{total ? (i + 1) + " / " + total : "—"}</button>
          <button type="button" data-present="next" onClick={() => go(i + 1)} disabled={i >= total - 1} aria-label="Próxima seção" title="Próxima (→ ou espaço)" style={btn(i >= total - 1)}>→</button>
          <span aria-hidden="true" style={{ width: 1, height: 22, background: "rgba(255,255,255,.25)", margin: "0 2px" }} />
          <button type="button" data-present="zoom-out" onClick={() => setZoom(zoomIdx - 1)} disabled={zoomIdx <= 0} aria-label="Diminuir o texto" title="Diminuir (−)" style={btn(zoomIdx <= 0)}>A−</button>
          <button type="button" data-present="zoom-in" onClick={() => setZoom(zoomIdx + 1)} disabled={zoomIdx >= ZOOMS.length - 1} aria-label="Aumentar o texto" title="Aumentar (+)" style={btn(zoomIdx >= ZOOMS.length - 1)}>A+</button>
          <button type="button" data-present="full" onClick={toggleFull} aria-pressed={full} title="Tela cheia (F)" style={btn(false)}>{full ? "Sair da tela cheia" : "Tela cheia"}</button>
          <button type="button" data-present="exit" onClick={onClose} title="Sair da apresentação (Esc)" style={{ ...btn(false), background: "var(--tool-accent, #D85C3C)" }}>Sair</button>
        </div>

        {index && (
          <div data-present="index" role="dialog" aria-label="Índice das seções" style={{ position: "fixed", left: "50%", bottom: 74, transform: "translateX(-50%)", zIndex: 4, width: "min(440px, calc(100vw - 24px))", maxHeight: "60vh", overflowY: "auto", background: "#fff", color: "#1b1a17", border: "1px solid rgba(0,0,0,.12)", borderRadius: 14, boxShadow: "0 16px 44px rgba(0,0,0,.35)", padding: 6, fontFamily: "var(--font-sans, system-ui)" }}>
            {blocks.map((b, n) => (
              <button key={b.id} type="button" data-present="goto" onClick={() => { setI(n); setIndex(false); }} aria-current={n === i ? "true" : undefined}
                style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", border: 0, borderRadius: 9, padding: "9px 12px", background: n === i ? "#f3e4dc" : "transparent", color: "inherit", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                <span style={{ minWidth: 26, color: "#8a8478", fontWeight: 650 }}>{n + 1}</span><span style={{ flex: 1 }}>{titles[n]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  Object.assign(window, { PresentMode, presentStartIndex: startIndexFor });
})();
