/* eslint-disable */
// ClassAtelier — inline rich-text editing + the approved-marks toolbar.
// Text blocks render the REAL Aula component with an <Editable> injected
// where the text goes, so editing is WYSIWYG and on-brand. The marks the
// author can apply are constrained to the design system (highlighter +
// scribble + emphasis) — no free font/colour control.

const { useState: useStateE, useRef: useRefE, useEffect: useEffectE } = React;

// ── Approved marks (design-system constrained) ──────────────
const AULA_MARKS = [
  { id: "hl",        label: "Marca-texto", swatch: "var(--hl-yellow)", tag: "mark", cls: "" },
  { id: "hl-pink",   label: "Rosa",        swatch: "var(--hl-pink)",   tag: "mark", cls: "hl-pink" },
  { id: "hl-green",  label: "Verde",       swatch: "var(--hl-green)",  tag: "mark", cls: "hl-green" },
  { id: "hl-blue",   label: "Azul",        swatch: "var(--hl-blue)",   tag: "mark", cls: "hl-blue" },
  { id: "scribble",  label: "Rabisco",     swatch: "transparent",      tag: "span", cls: "scribble" },
];

// Wrap the current selection in a mark element (or unwrap if already marked).
function applyMark(mark) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const host = closestEditable(range.commonAncestorContainer);
  if (!host) return;

  const startElement = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  const endElement = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
  const selector = mark.tag === "mark"
    ? (mark.cls ? `mark.${mark.cls}` : "mark:not([class])")
    : `${mark.tag}.${mark.cls}`;
  const active = startElement && startElement.closest(selector);
  if (active && host.contains(active) && active.contains(endElement)) {
    unwrap(active);
    sel.removeAllRanges();
    fireInput(host);
    return;
  }

  const el = document.createElement(mark.tag);
  if (mark.cls) el.className = mark.cls;
  try {
    el.appendChild(range.extractContents());
    // strip nested identical marks to avoid stacking
    el.querySelectorAll(mark.cls ? "." + mark.cls : "mark").forEach((n) => {
      if (n !== el) unwrap(n);
    });
    range.insertNode(el);
    // place caret after
    sel.removeAllRanges();
    const after = document.createRange();
    after.setStartAfter(el); after.collapse(true);
    sel.addRange(after);
  } catch (e) { /* cross-node selection — ignore */ }
  fireInput(host);
}

function applyEmphasis(cmd) {
  // Inline emphasis and block lists via execCommand (supported by contentEditable).
  document.execCommand(cmd, false, null);
  const sel = window.getSelection();
  const host = sel ? closestEditable(sel.anchorNode) : null;
  if (host) fireInput(host);
}

function applyLink() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0).cloneRange();
  const host = closestEditable(range.commonAncestorContainer);
  if (!host) return;
  const start = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  const current = start && start.closest("a");
  const value = window.prompt("URL do link (deixe vazio para remover):", current?.getAttribute("href") || "https://");
  if (value == null) return;
  sel.removeAllRanges(); sel.addRange(range);
  const href = value.trim();
  if (!href) document.execCommand("unlink", false, null);
  else {
    document.execCommand("createLink", false, href);
    const anchor = (sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement)?.closest?.("a");
    if (anchor && /^https?:\/\//i.test(href)) { anchor.target = "_blank"; anchor.rel = "noopener"; }
  }
  fireInput(host);
}

function clearMarks() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const host = closestEditable(range.commonAncestorContainer);
  if (!host) return;
  const frag = range.cloneContents();
  const tmp = document.createElement("div");
  tmp.appendChild(frag);
  tmp.querySelectorAll("mark, .scribble, b, strong, i, em, a, .termo").forEach(unwrap);
  range.deleteContents();
  range.insertNode(document.createRange().createContextualFragment(tmp.innerHTML));
  sel.removeAllRanges();
  fireInput(host);
}

// Wrap the current selection as a glossary term (.termo) with a click-to-open
// definition popover. The selected text becomes the term; the definition is
// asked for inline. Markup matches colors_and_type.css + glossario.js / <Termo>.
function applyTermo() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const host = closestEditable(range.commonAncestorContainer);
  if (!host) return;
  const word = sel.toString().trim();
  if (!word) return;
  // Capture the range BEFORE prompt() (which blurs the field but keeps the
  // Range object valid since it doesn't mutate the DOM).
  const def = window.prompt('Definição do termo \u201C' + word + '\u201D (1\u20132 frases):', "");
  if (def == null) return;            // cancelled
  const definition = def.trim();
  if (!definition) return;            // empty → no term
  const span = document.createElement("span");
  span.className = "termo";
  span.setAttribute("role", "button");
  span.setAttribute("tabindex", "0");
  span.setAttribute("aria-expanded", "false");
  try {
    span.appendChild(range.extractContents());
    // never nest terms
    span.querySelectorAll(".termo").forEach((n) => { if (n !== span) unwrap(n); });
    // Derive the displayed word from what was actually wrapped (robust against
    // any selection/offset drift between sel.toString() and the live range).
    const actualWord = (span.textContent || word).trim();
    const pop = document.createElement("span");
    pop.className = "termo__pop";
    pop.setAttribute("role", "tooltip");
    const mk = (cls, txt) => { const s = document.createElement("span"); s.className = cls; s.textContent = txt; return s; };
    pop.appendChild(mk("termo__label", "Glossário"));
    pop.appendChild(mk("termo__word", actualWord));
    pop.appendChild(mk("termo__def", definition));
    span.appendChild(pop);
    range.insertNode(span);
    sel.removeAllRanges();
    const after = document.createRange();
    after.setStartAfter(span); after.collapse(true);
    sel.addRange(after);
  } catch (e) { /* cross-node selection — ignore */ }
  fireInput(host);
}

function unwrap(node) {
  const p = node.parentNode; if (!p) return;
  while (node.firstChild) p.insertBefore(node.firstChild, node);
  p.removeChild(node);
}
function closestEditable(node) {
  let n = node;
  while (n && n.nodeType === 3) n = n.parentNode;
  return n ? n.closest("[contenteditable='true']") : null;
}
function fireInput(host) { host.dispatchEvent(new Event("input", { bubbles: true })); }

// ── The editable text region ────────────────────────────────
function Editable({ html, onChange, mode, tag = "div", single = false, placeholder, style, className }) {
  const ref = useRefE(null);
  const isEdit = mode === "edit";

  // keep DOM in sync only when value changed externally (avoid caret jump)
  useEffectE(() => {
    if (ref.current && ref.current.innerHTML !== (html || "")) {
      ref.current.innerHTML = html || "";
    }
  }, [html]);

  if (!isEdit) {
    return React.createElement(tag, {
      className, style,
      dangerouslySetInnerHTML: { __html: html || "" },
    });
  }

  const onPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  };
  const onKeyDown = (e) => {
    if (single && e.key === "Enter") { e.preventDefault(); ref.current && ref.current.blur(); }
  };

  return React.createElement(tag, {
    ref,
    className,
    style: { ...style, cursor: "text" },
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: true,
    "data-placeholder": placeholder || "",
    "data-lz-editable": "1",
    "data-lz-single": single ? "1" : undefined,
    onInput: (e) => onChange(e.currentTarget.innerHTML),
    onPaste,
    onKeyDown,
    // stop block-selection click from stealing focus mid-edit
    onMouseDown: (e) => e.stopPropagation(),
  });
}

// ── Floating mark toolbar (shows on text selection inside canvas) ──
function MarkToolbar() {
  const [box, setBox] = useStateE(null); // {top,left,allowLists}
  useEffectE(() => {
    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { setBox(null); return; }
      const host = closestEditable(sel.getRangeAt(0).commonAncestorContainer);
      if (!host || !host.closest("[data-lz-canvas]")) { setBox(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r || (r.width === 0 && r.height === 0)) { setBox(null); return; }
      setBox({ top: r.top - 50, left: r.left + r.width / 2, allowLists: host.dataset.lzSingle !== "1" });
    };
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, true);
    return () => { document.removeEventListener("selectionchange", update); window.removeEventListener("scroll", update, true); };
  }, []);

  if (!box) return null;
  const hold = (e) => e.preventDefault(); // keep selection while clicking
  return (
    <div
      onMouseDown={hold}
      style={{
        position: "fixed", top: Math.max(8, box.top), left: box.left, transform: "translateX(-50%)",
        zIndex: 9999, display: "flex", alignItems: "center", gap: 2,
        background: "var(--tool-ink)", color: "#fff", padding: "5px 6px",
        borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
      }}
    >
      {AULA_MARKS.map((m) => (
        <button key={m.id} title={m.label} onClick={() => applyMark(m)} style={tbBtn}>
          {m.id === "scribble"
            ? <span style={{ fontWeight: 700, textDecoration: "underline", textDecorationColor: "var(--terracotta)", textDecorationThickness: 2 }}>S</span>
            : <span style={{ width: 16, height: 12, borderRadius: 3, background: m.swatch, border: m.id === "hl" ? "none" : "none", display: "block" }} />}
        </button>
      ))}
      <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.22)", margin: "0 3px" }} />
      <button title="Negrito" onClick={() => applyEmphasis("bold")} style={{ ...tbBtn, fontWeight: 800 }}>B</button>
      <button title="Itálico" onClick={() => applyEmphasis("italic")} style={{ ...tbBtn, fontStyle: "italic", fontFamily: "var(--font-serif)" }}>i</button>
      {box.allowLists && <>
        <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.22)", margin: "0 3px" }} />
        <button title="Lista com marcadores" aria-label="Lista com marcadores" onClick={() => applyEmphasis("insertUnorderedList")} style={tbBtn}>
          <span aria-hidden="true" style={listIconStyle}><b style={listLabelStyle}>•</b><i style={listLineStyle}></i><b style={listLabelStyle}>•</b><i style={listLineStyle}></i><b style={listLabelStyle}>•</b><i style={listLineStyle}></i></span>
        </button>
        <button title="Lista numerada" aria-label="Lista numerada" onClick={() => applyEmphasis("insertOrderedList")} style={tbBtn}>
          <span aria-hidden="true" style={listIconStyle}><b style={listLabelStyle}>1.</b><i style={listLineStyle}></i><b style={listLabelStyle}>2.</b><i style={listLineStyle}></i><b style={listLabelStyle}>3.</b><i style={listLineStyle}></i></span>
        </button>
      </>}
      <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.22)", margin: "0 3px" }} />
      <button title="Adicionar ou editar link" aria-label="Adicionar ou editar link" onClick={applyLink} style={tbBtn}>🔗</button>
      <button title="Termo de glossário" onClick={applyTermo} style={tbBtn}>
        <span style={{ borderBottom: "1.5px dotted rgba(255,255,255,0.85)", paddingBottom: 1, fontSize: 13, fontWeight: 600 }}>termo</span>
      </button>
      <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.22)", margin: "0 3px" }} />
      <button title="Limpar marcas" onClick={clearMarks} style={tbBtn}>✕</button>
    </div>
  );
}
const tbBtn = {
  display: "grid", placeItems: "center", minWidth: 26, height: 26, padding: "0 5px",
  background: "transparent", border: 0, borderRadius: 7, color: "#fff", cursor: "pointer",
  fontSize: 14, lineHeight: 1,
};
const listIconStyle = {
  display: "grid", gridTemplateColumns: "8px 13px", alignItems: "center", gap: "2px 2px",
  width: 23, height: 18, color: "#fff",
};
const listLabelStyle = { fontSize: 8, fontStyle: "normal", lineHeight: 1, textAlign: "right" };
const listLineStyle = { display: "block", width: 13, height: 1, background: "currentColor", opacity: 0.9 };

Object.assign(window, { Editable, MarkToolbar, AULA_MARKS, applyMark, applyLink, applyTermo });
