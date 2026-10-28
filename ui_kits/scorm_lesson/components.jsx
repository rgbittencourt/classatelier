/* eslint-disable */
// ════════════════════════════════════════════════════════════
// Aula — KIT DE COMPONENTES (arquivo único)
// ────────────────────────────────────────────────────────────
// Este arquivo contém APENAS estrutura e comportamento (markup
// semântico + lógica React). TODA a formatação visual vive em
// /components.css (camada de anatomia, com tokens --c-*), que os
// temas sobrescrevem — por token OU por classe.
//
// Convenções de markup (para temas novos):
//   · Todo componente tem uma classe raiz `aula-<nome>`;
//     subpartes usam `aula-<nome>__<parte>` (BEM).
//   · Estados são classes `is-*` (is-open, is-flipped, is-done…)
//     ou atributos `data-*` (data-state, data-tone, data-dark).
//   · Cores de acento por matiz usam `data-tone="sage|ocean|…"`,
//     mapeadas em CSS para os primitivos --<tone>/-soft/-deep.
//   · Estilos inline restantes são SÓ valores dinâmicos
//     (largura de progresso, transform de carrossel, props de
//     geometria como ratio/altura) — nunca cor/fonte/raio.
//
// Ordem das seções: PDF/ícones · chrome · layout · callouts ·
// mídia · interativos · dados · fechamento · exports.
// ════════════════════════════════════════════════════════════

const { useState, useRef, useEffect, useCallback } = React;

// ────────────────────────────────────────────────────────────
// PDF MODE — distribuído por contexto: qualquer componente pode
// renderizar a variante de impressão (tudo expandido). Definido
// pela montagem quando a URL tem ?pdf=1 (ou window.AULA_PDF).
// ────────────────────────────────────────────────────────────
const PDFContext = React.createContext(false);
const usePDF = () => React.useContext(PDFContext);

// Paleta de acento reaproveitável (base / soft / deep por matiz)
const AULA_TONES = {
  marigold:   { base: "var(--marigold)",   soft: "var(--marigold-soft)",   deep: "var(--marigold-deep)" },
  terracotta: { base: "var(--terracotta)", soft: "var(--terracotta-soft)", deep: "var(--terracotta-deep)" },
  lavender:   { base: "var(--lavender)",   soft: "var(--lavender-soft)",   deep: "var(--lavender-deep)" },
  sage:       { base: "var(--sage)",       soft: "var(--sage-soft)",       deep: "var(--sage-deep)" },
  ocean:      { base: "var(--ocean)",      soft: "var(--ocean-soft)",      deep: "var(--ocean-deep)" },
  coral:      { base: "var(--coral)",      soft: "var(--coral-soft)",      deep: "var(--coral-deep)" },
};

function fontAwesomeClass(icon, fallback = "star") {
  if (!icon) return `fa-solid fa-${fallback}`;
  return /\bfa-(solid|regular|brands|light|thin|duotone|sharp)\b|\bfas\b|\bfar\b|\bfab\b/.test(icon)
    ? icon
    : `fa-solid fa-${icon}`;
}

// Lucide icon helper — emits an <svg> with stroke setup
function Icon({ name, size = 22, stroke = 1.75, color = "currentColor", style, tokens }) {
  // `tokens` liga o ícone aos tokens de anatomia do tema:
  // tokens="c-dest-icon" → lê --c-dest-icon-size/-color/-stroke,
  // caindo nos valores das props (Aula) quando o tema não define.
  const tokenStyle = tokens ? {
    width: `var(--${tokens}-size, ${size}px)`,
    height: `var(--${tokens}-size, ${size}px)`,
    stroke: `var(--${tokens}-color, ${color})`,
    strokeWidth: `var(--${tokens}-stroke, ${stroke})`,
  } : null;
  // Inline SVG paths for the small set we use. Keeps the kit self-contained
  // even if the CDN script tag is absent.
  const paths = {
    "lightbulb": <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></>,
    "alert-triangle": <><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></>,
    "flower": <><circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/><path d="M12 7.5V9"/><path d="M7.5 12H9"/><path d="M16.5 12H15"/><path d="M12 16.5V15"/><path d="m8 8 1.88 1.88"/><path d="M14.12 9.88 16 8"/><path d="m8 16 1.88-1.88"/><path d="M14.12 14.12 16 16"/></>,
    "quote": <><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1Z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 .25 0 .5 0 1 0v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1Z"/></>,
    "chevron-down": <><polyline points="6 9 12 15 18 9"/></>,
    "chevron-left": <><polyline points="15 18 9 12 15 6"/></>,
    "chevron-right": <><polyline points="9 18 15 12 9 6"/></>,
    "bookmark": <><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></>,
    "share": <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></>,
    "type": <><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></>,
    "heading": <><path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/></>,
    "topic": <><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="11" width="18" height="3" rx="1"/><rect x="3" y="17" width="12" height="3" rx="1"/></>,
    "sun": <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>,
    "rotate-ccw": <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>,
    "book-open": <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    "arrow-right": <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    "arrow-left": <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    "play": <><polygon points="6 3 20 12 6 21 6 3"/></>,
    "image": <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></>,
    "layers": <><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></>,
    "grid": <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "external-link": <><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
    "file-text": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>,
    "headphones": <><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></>,
    "check": <><polyline points="20 6 9 17 4 12"/></>,
    "check-circle": <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    "x": <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    "refresh-cw": <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></>,
    "link": <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    "pause": <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
    "play-fill": <><polygon points="6 3 20 12 6 21 6 3"/></>,
    "play-circle": <><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></>,
    "download": <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    "award": <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></>,
    "graduation-cap": <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    "book-marked": <><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l5-3 5 3z"/><path d="M10 2v8l3-2 3 2V2"/></>,
    "arrow-up-right": <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></>,
    "newspaper": <><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></>,
    "volume-2": <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></>,
    "message-circle": <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></>,
    "list": <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...tokenStyle, ...style }}
      aria-hidden="true"
    >
      {paths[name] || null}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════
// CHROME — barra superior, progresso de leitura, sumário
// ════════════════════════════════════════════════════════════

// Hook compartilhado: progresso de rolagem da página (0–100)
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (h.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

// TOP BAR — sticky progress + lesson title + toolbar
function TopBar({ lessonTitle, chapter }) {
  const progress = useScrollProgress();
  return (
    <header className="aula-topbar">
      <div className="aula-topbar__progress" style={{ width: `${progress}%` }}></div>
      <div className="aula-topbar__row">
        <a href="#" className="aula-topbar__brand" aria-label="Aula">
          <img src="../../assets/aula-mark.svg" alt="" width="24" height="24" />
          <span className="aula-topbar__word">aula</span>
        </a>
        <div className="aula-topbar__crumbs">
          <span className="aula-topbar__chapter">{chapter}</span>
          <span className="aula-topbar__sep">·</span>
          <span className="aula-topbar__lesson">{lessonTitle}</span>
        </div>
        <div className="aula-topbar__tools">
          <ToolbarButton icon="type" label="Tipografia" />
          <ToolbarButton icon="sun" label="Contraste" />
          <ToolbarButton icon="bookmark" label="Salvar" />
          <ToolbarButton icon="share" label="Compartilhar" />
        </div>
      </div>
    </header>
  );
}
function ToolbarButton({ icon, label }) {
  return (
    <button type="button" className="aula-topbar__btn" title={label} aria-label={label}>
      <Icon name={icon} size={18} stroke={1.6} color="var(--ink-soft)" />
    </button>
  );
}

// PROGRESS BAR — progresso de leitura mínimo, sem marca.
// Usado no lugar do TopBar dentro de SCORM/Moodle.
function ProgressBar() {
  if (usePDF()) return null; // no reading-progress chrome on paper
  const progress = useScrollProgress();
  return (
    <div className="aula-progressbar" aria-hidden="true">
      <div className="aula-progressbar__fill" style={{ width: `${progress}%` }}></div>
    </div>
  );
}

// SUMÁRIO — menu de navegação oculto. Botão flutuante abre um
// painel lateral com as seções da aula (auto-detectadas dos <h2>
// dentro de #app). Oculto no modo PDF. Use UM <Sumario /> no topo.
function Sumario({ label = "Sumário", scope = "#app" }) {
  if (usePDF()) return null; // no floating nav on paper
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // Discover sections in document order: ChapterDivider labels become
  // group headers, <h2> headings become numbered items beneath them.
  useEffect(() => {
    const root = document.querySelector(scope) || document.body;
    const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
    const collect = () => {
      const used = {};
      const nodes = [...root.querySelectorAll("h2, [data-toc-section]")];
      const list = [];
      nodes.forEach((node) => {
        const isSection = node.matches("[data-toc-section]");
        const labelEl = isSection ? node.querySelector("[data-toc-label]") : node;
        // A node may override its index label via data-toc-text (e.g. Síntese,
        // whose visible <h2> is a full sentence but should read "Para fechar"
        // in the Sumário). Falls back to the element's own text content.
        const override = (node.getAttribute("data-toc-text") || "").trim();
        const text = override || (labelEl ? labelEl.textContent.trim() : "");
        if (!text) return;
        const anchor = node; // scroll target is the node itself
        if (!anchor.id) {
          let base = slug(text) || "secao";
          used[base] = (used[base] || 0) + 1;
          anchor.id = used[base] > 1 ? `${base}-${used[base]}` : base;
        }
        anchor.style.scrollMarginTop = "56px"; // clear the progress bar on jump
        list.push({ id: anchor.id, text, el: anchor, level: isSection ? "group" : "item" });
      });
      setItems(list);
      return list;
    };
    const list = collect();
    // Re-scan once more after late content (images/embeds) settle.
    const t = setTimeout(collect, 600);

    if (!("IntersectionObserver" in window) || !list.length) return () => clearTimeout(t);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-10% 0px -75% 0px", threshold: 0 }
    );
    list.forEach((it) => io.observe(it.el));
    return () => { clearTimeout(t); io.disconnect(); };
  }, [scope]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 48;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setOpen(false);
  };

  if (!items.length) return null;

  return (
    <React.Fragment>
      <button
        type="button"
        className="aula-sumario__fab"
        aria-label={open ? "Fechar sumário" : "Abrir sumário"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-pdf-hide=""
      >
        <Icon name={open ? "x" : "list"} size={20} stroke={2} color="var(--paper)" />
      </button>

      <div
        className={"aula-sumario__backdrop" + (open ? " is-open" : "")}
        onClick={() => setOpen(false)}
        aria-hidden="true"
        data-pdf-hide=""
      ></div>

      <nav
        className={"aula-sumario__panel" + (open ? " is-open" : "")}
        aria-label={label}
        data-pdf-hide=""
      >
        <div className="aula-sumario__head">
          <Icon name="list" size={16} stroke={2} color="var(--ink-mute)" />
          <span>{label}</span>
        </div>
        <ol className="aula-sumario__list">
          {(() => {
            let n = 0;
            return items.map((it) => {
              const on = active === it.id;
              if (it.level === "group") {
                return (
                  <li key={it.id}>
                    <button type="button" onClick={() => go(it.id)}
                      className={"aula-sumario__group" + (on ? " is-active" : "")}>
                      {it.text}
                    </button>
                  </li>
                );
              }
              n += 1;
              const num = n;
              return (
                <li key={it.id}>
                  <button type="button" onClick={() => go(it.id)}
                    className={"aula-sumario__item" + (on ? " is-active" : "")}>
                    <span className="aula-sumario__num">{String(num).padStart(2, "0")}</span>
                    <span className="aula-sumario__text">{it.text}</span>
                  </button>
                </li>
              );
            });
          })()}
        </ol>
      </nav>
    </React.Fragment>
  );
}

// ════════════════════════════════════════════════════════════
// LAYOUT — hero, medida de leitura, faixas, síntese, divisor
// ════════════════════════════════════════════════════════════

function LessonHero({ eyebrow, title, lead, author, authorImage, readTime, date }) {
  return (
    <section className="aula-hero">
      <div className="aula-hero__inner">
        <div className="aula-hero__eyebrow">
          <Icon name="book-open" size={14} stroke={2} color="var(--c-hero-eyebrow-icon, var(--terracotta))" />
          <span>{eyebrow}</span>
        </div>
        <h1 className="aula-hero__title">{title}</h1>
        <p className="aula-hero__lead">{lead}</p>
        <div className="aula-hero__meta">
          <div className="aula-hero__avatar" aria-hidden="true">
            {authorImage ? <img src={authorImage} alt="" className="aula-hero__avatar-img" /> : (author?.[0] || "L").toUpperCase()}
          </div>
          <div>
            <div className="aula-hero__author">{author}</div>
            <div className="aula-hero__byline">
              <span>{date}</span>
              <span className="aula-hero__byline-sep">·</span>
              <span>{readTime} de estudo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// PROSE — max-measure body wrapper
function Prose({ children, style }) {
  return (
    <div className="aula-prose" style={style}>
      {children}
    </div>
  );
}

// FULL-BLEED SECTION — 100vw colored band. New documents persist structural
// surface IDs from the active theme; legacy color names remain readable.
function FullBleedSection({ tone = "paper", children, py = "clamp(56px,8vw,96px)" }) {
  const legacy = {
    paper: { cssVar: "--paper", contentTone: "dark" },
    sand: { cssVar: "--sand", contentTone: "dark" },
    sage: { cssVar: "--sage-soft", contentTone: "dark" },
    lavender: { cssVar: "--lavender-soft", contentTone: "dark" },
    coral: { cssVar: "--coral-soft", contentTone: "dark" },
    ocean: { cssVar: "--ocean-soft", contentTone: "dark" },
    marigold: { cssVar: "--marigold-soft", contentTone: "dark" },
    "terracotta-soft": { cssVar: "--terracotta-soft", contentTone: "dark" },
    "marigold-vivid": { cssVar: "--marigold", contentTone: "dark" },
    "lavender-vivid": { cssVar: "--lavender", contentTone: "light" },
    "coral-vivid": { cssVar: "--coral", contentTone: "dark" },
    ink: { cssVar: "--ink", contentTone: "light" },
    petrol: { cssVar: "--ocean-deep", contentTone: "light" },
    "ocean-vivid": { cssVar: "--ocean", contentTone: "light" },
    terracotta: { cssVar: "--terracotta", contentTone: "dark" },
    "terracotta-deep": { cssVar: "--terracotta-deep", contentTone: "light" },
    "coral-deep": { cssVar: "--coral-deep", contentTone: "light" },
    "marigold-deep": { cssVar: "--marigold-deep", contentTone: "dark" },
    "sage-deep": { cssVar: "--sage-deep", contentTone: "light" },
    "sage-green": { cssVar: "--sage", contentTone: "dark" },
    "lavender-deep": { cssVar: "--lavender-deep", contentTone: "light" },
  };
  const theme = window.AULA_ACTIVE_THEME || {};
  const resolvedTone = (theme.topicSurfaceAliases && theme.topicSurfaceAliases[tone]) || tone;
  const surfaces = theme.topicSurfaces || [];
  const structuralFallback = {
    "neutral-default": "paper", "neutral-subtle": "sand", "neutral-inverse": "ink",
    "accent-1-soft": "marigold", "accent-2-soft": "terracotta-soft", "accent-3-soft": "lavender",
    "accent-4-soft": "sage", "accent-5-soft": "ocean", "accent-6-soft": "coral",
    "accent-1-vivid": "marigold-vivid", "accent-2-vivid": "terracotta", "accent-3-vivid": "lavender-vivid",
    "accent-4-vivid": "sage-green", "accent-5-vivid": "ocean-vivid", "accent-6-vivid": "coral-vivid",
    "accent-1-deep": "marigold-deep", "accent-2-deep": "terracotta-deep", "accent-3-deep": "lavender-deep",
    "accent-4-deep": "sage-deep", "accent-5-deep": "petrol", "accent-6-deep": "coral-deep",
  };
  const fallbackTone = structuralFallback[resolvedTone] || tone;
  const t = surfaces.find((surface) => surface.id === resolvedTone) || legacy[fallbackTone] || legacy.paper;
  const contentTone = t.contentTone || "dark";
  const background = t.value || `var(${t.cssVar})`;
  return (
    <section
      className="aula-fullbleed"
      data-content-tone={contentTone}
      data-dark={contentTone === "light" ? "" : undefined}
      style={{ "--fb-bg": background, "--fb-py": py }}
    >
      {children}
    </section>
  );
}

// SÍNTESE / ENCERRAMENTO — faixa de fechamento padronizada
// (sage-deep, tipo claro). Use como recapitulação que fecha a
// leitura, antes do quiz e do bloco de conclusão.
function Sintese({ eyebrow = "Síntese", title, children, py = "clamp(64px,9vw,120px)", tocLabel }) {
  // The visible <h2> is a full sentence; the Sumário should index the eyebrow
  // ("Para fechar") instead. Prefer an explicit plain-text label; otherwise use
  // the eyebrow when it's a string; never index the long title sentence.
  const tocText = (typeof tocLabel === "string" && tocLabel.trim()) ? tocLabel.trim()
    : (typeof eyebrow === "string" && eyebrow.trim()) ? eyebrow.trim()
    : "Síntese";
  return (
    <FullBleedSection tone="sage-deep" py={py}>
      <Prose>
        {eyebrow && <p className="eyebrow aula-sintese__eyebrow">{eyebrow}</p>}
        {title && <h2 className="aula-sintese__title" data-toc-text={tocText}>{title}</h2>}
        <div className="aula-sintese__body">{children}</div>
      </Prose>
    </FullBleedSection>
  );
}

// CHAPTER DIVIDER — ornamental section break
function ChapterDivider({ label }) {
  return (
    <div className="aula-chapter-divider" role="separator" data-toc-section="">
      <span className="aula-chapter-divider__line"></span>
      <span className="aula-chapter-divider__label" data-toc-label="">{label}</span>
      <span className="aula-chapter-divider__line"></span>
    </div>
  );
}

function Eyebrow({ icon, children }) {
  return (
    <p className="aula-topic-eyebrow">
      {icon && <i className={fontAwesomeClass(icon)} aria-hidden="true"></i>}
      <span>{children}</span>
    </p>
  );
}

// ════════════════════════════════════════════════════════════
// CALLOUTS — Destaque, Atenção, Reflexão compartilham a MESMA
// anatomia (aside > header(ícone+rótulo) > corpo); o que muda
// entre eles — e entre TEMAS — é só CSS (aula-destaque/-atencao/
// -reflexao + tokens --c-dest-*/--c-aten-*/--c-refl-*).
// ════════════════════════════════════════════════════════════

function Callout({ variant, ariaLabel, label, icon, defaultIcon, iconTokens, iconFallback, tone, question, children }) {
  const colors = AULA_TONES[tone];
  const style = colors ? {
    "--callout-base": colors.base,
    "--callout-soft": colors.soft,
    "--callout-deep": colors.deep,
    background: variant === "destaque" ? "var(--bone)" : colors.soft,
    borderColor: colors.base,
    borderLeftColor: colors.base,
  } : undefined;
  return (
    <aside className={"aula-callout aula-" + variant} aria-label={ariaLabel} data-tone={colors ? tone : undefined} style={style}>
      <header className="aula-callout__head">
        <span className="aula-callout__icon" style={colors ? { color: colors.deep } : undefined}>
          {icon ? <i className={fontAwesomeClass(icon)} aria-hidden="true"></i> : <Icon name={defaultIcon} size={iconFallback.size} stroke={iconFallback.stroke} color="currentColor" tokens={iconTokens} />}
        </span>
        <span className="aula-callout__label" style={colors ? { color: colors.deep } : undefined}>{label}</span>
      </header>
      {question && <p className="aula-callout__question">{question}</p>}
      {children && <div className="aula-callout__body">{children}</div>}
    </aside>
  );
}

function Destaque({ title = "Veja bem", tone, icon, children }) {
  return (
    <Callout variant="destaque" ariaLabel="Destaque" label={title}
      icon={icon} defaultIcon="lightbulb" tone={tone} iconTokens="c-dest-icon"
      iconFallback={{ size: 18, stroke: 1.8, color: "var(--sage-deep)" }}>
      {children}
    </Callout>
  );
}

function Atencao({ title = "Atenção", tone, icon, children }) {
  return (
    <Callout variant="atencao" ariaLabel="Atenção" label={title}
      icon={icon} defaultIcon="alert-triangle" tone={tone} iconTokens="c-aten-icon"
      iconFallback={{ size: 17, stroke: 2, color: "var(--terracotta-deep)" }}>
      {children}
    </Callout>
  );
}

function Reflexao({ title = "Para refletir", question, tone, icon, children }) {
  return (
    <Callout variant="reflexao" ariaLabel="Reflexão" label={title} question={question}
      icon={icon} defaultIcon="flower" tone={tone} iconTokens="c-refl-icon"
      iconFallback={{ size: 18, stroke: 1.8, color: "var(--lavender-deep)" }}>
      {children}
    </Callout>
  );
}

// CITAÇÃO — editorial pull-quote with attribution
function Citacao({ quote, author, source, showAttribution = true }) {
  return (
    <figure className="aula-citacao">
      <div className="aula-citacao__mark" aria-hidden="true">
        <Icon name="quote" size={48} stroke={0} color="currentColor" style={{ fill: "currentColor" }} />
      </div>
      <blockquote className="aula-citacao__quote">{quote}</blockquote>
      {showAttribution && (author || source) && <figcaption className="aula-citacao__cite">
        {author && <span className="aula-citacao__author">{author}</span>}
        {author && source && <span className="aula-citacao__dash">—</span>}
        {source && <span className="aula-citacao__source">{source}</span>}
      </figcaption>}
    </figure>
  );
}

// PITACO DO [AVATAR] — aside de um personagem recorrente.
// Balão de fala com avatar; artigo ("do"/"da") segue `gender`.
function PitacoDo({ kicker, name = "", gender = "m", role, src, slotId, children, tone = "coral" }) {
  const article = String(gender).toLowerCase().startsWith("f") ? "da" : "do";
  const heading = kicker || `Pitaco ${article} ${name}`;
  const headingText = richPlain(heading) || "Comentário";
  const safeTone = AULA_TONES[tone] ? tone : "coral";
  return (
    <aside className="aula-pitaco" data-tone={safeTone} aria-label={headingText}>
      <div className="aula-pitaco__avatar">
        {src ? (
          <img src={src} alt={name} className="aula-pitaco__img" />
        ) : (
          <image-slot id={slotId || `pitaco-${name.toLowerCase().replace(/\s+/g, "-") || "avatar"}`} shape="circle" placeholder={name ? `Foto de ${name}` : "Foto do avatar"} style={{ width: "100%", height: "100%" }}></image-slot>
        )}
      </div>
      <div className="aula-pitaco__bubble">
        <span className="aula-pitaco__tail" aria-hidden="true"></span>
        <div className="aula-pitaco__headcol">
          <div className="aula-pitaco__head">
            <Icon name="message-circle" size={15} stroke={1.9} color="currentColor" />
            <RichInline className="aula-pitaco__kicker" value={heading}/>
          </div>
          {role && <RichInline className="aula-pitaco__role" value={role}/>}
        </div>
        <div className="aula-pitaco__body">{children}</div>
      </div>
    </aside>
  );
}

// TERMO — glossary term with a click-to-open definition.
// Flui inline (sublinhado pontilhado); click/Enter abre popover.
// Estilos do popover vivem em colors_and_type.css (.termo*).
let _termoSetters = new Set();
function Termo({ children, def, termo, rotulo = "Glossário" }) {
  if (usePDF()) {
    // PDF: references are numbered by PDFGlossary and resolved at the end.
    return (
      <span className="aula-termo-print" data-glossary-term={termo || (typeof children === "string" ? children : undefined)} data-glossary-definition={def}>
        <span className="aula-termo-print__word">{children}</span>
        <sup className="aula-termo-print__ref" aria-label="Nota de glossário"></sup>
      </span>
    );
  }
  const [open, setOpen] = React.useState(false);
  const [below, setBelow] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const setter = (v) => setOpen(v);
    _termoSetters.add(setter);
    return () => _termoSetters.delete(setter);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const el = ref.current;
    const pop = el && el.querySelector(".termo__pop");
    if (el && pop) {
      const r = el.getBoundingClientRect();
      setBelow(r.top < pop.offsetHeight + 28);
    }
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (e) => {
    e.stopPropagation();
    const next = !open;
    if (next) _termoSetters.forEach((s) => s !== setOpen && s(false)); // close others
    setOpen(next);
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      toggle(e);
    }
  };

  return (
    <span
      ref={ref}
      className={"termo" + (below ? " termo--below" : "")}
      role="button"
      tabIndex={0}
      aria-expanded={open ? "true" : "false"}
      onClick={toggle}
      onKeyDown={onKey}
    >
      {children}
      <span className="termo__pop" role="tooltip">
        <span className="termo__label">{rotulo}</span>
        <span className="termo__word">{termo || children}</span>
        <span className="termo__def">{def}</span>
      </span>
    </span>
  );
}

function PDFGlossary({ title = "Glossário" }) {
  const pdf = usePDF();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!pdf) return;
    const found = [];
    const byKey = new Map();
    document.querySelectorAll(".aula-termo-print, .termo").forEach((node) => {
      if (node.closest(".aula-pdf-glossary")) return;
      const pop = node.querySelector(".termo__pop");
      const term = (node.dataset.glossaryTerm || pop?.querySelector(".termo__word")?.textContent || node.childNodes[0]?.textContent || "").trim();
      const definition = (node.dataset.glossaryDefinition || pop?.querySelector(".termo__def")?.textContent || "").trim();
      if (!term || !definition) return;
      const key = `${term.toLocaleLowerCase("pt-BR")}\u0000${definition}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { number: found.length + 1, term, definition };
        byKey.set(key, entry);
        found.push(entry);
      }
      let ref = node.querySelector(":scope > .aula-termo-print__ref");
      if (!ref) {
        ref = document.createElement("sup");
        ref.className = "aula-termo-print__ref";
        node.appendChild(ref);
      }
      ref.textContent = String(entry.number);
    });
    setEntries(found);
  }, [pdf]);

  if (!pdf || !entries.length) return null;
  return (
    <section className="aula-pdf-glossary" aria-label={title}>
      <h2>{title}</h2>
      <ol>
        {entries.map((entry) => (
          <li key={`${entry.number}-${entry.term}`}>
            <strong>{entry.term}.</strong> {entry.definition}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
// MÍDIA — imagem, vídeo, áudio, parallax, filmstrip, link impresso
// ════════════════════════════════════════════════════════════

// RECURSO LINK — legenda discreta sob mídia no modo PDF, com a
// URL pública em monoespaçada para transcrição no papel.
function RecursoLink({ rotulo = "Assista em", href }) {
  if (!href) return null;
  return (
    <div className="aula-recurso-link">
      <Icon name="link" size={13} stroke={1.8} color="var(--ink-mute)" />
      <span className="aula-recurso-link__label">{rotulo}:</span>
      <a href={href} className="aula-recurso-link__url">{href}</a>
    </div>
  );
}

// IMAGEM COM LEGENDA — image with serif italic caption
function ImagemLegenda({ src, slotId, caption, credit, ratio = "16/9" }) {
  return (
    <figure className="aula-figura">
      {src ? (
        // Real image: full width, height follows the image's own proportions.
        <div className="aula-figura__frame aula-figura__frame--auto">
          <img src={src} alt="" className="aula-figura__img" />
        </div>
      ) : (
        // Placeholder via image-slot web component keeps a ratio so it has height.
        <div className="aula-figura__frame" style={{ aspectRatio: ratio }}>
          <image-slot id={slotId || "img"} shape="rect" placeholder={richPlain(caption) || "Arraste uma imagem"} style={{ width: "100%", height: "100%" }}></image-slot>
        </div>
      )}
      {caption && <figcaption className="aula-media-cap"><RichInline value={caption}/>{credit && <span className="aula-media-credit"> — <RichInline value={credit}/></span>}</figcaption>}
    </figure>
  );
}

// VIDEO YOUTUBE — responsive 16:9 embed with caption
function parseExternalEmbed(value) {
  const raw = String(value || "").trim(); if (!raw) return {};
  let src = raw, width, height;
  if (/^<iframe\b/i.test(raw) && typeof DOMParser !== "undefined") {
    try { const frame = new DOMParser().parseFromString(raw, "text/html").querySelector("iframe"); if (frame) { src = frame.getAttribute("src") || ""; width = Number.parseFloat(frame.getAttribute("width") || "") || undefined; height = Number.parseFloat(frame.getAttribute("height") || "") || undefined; } } catch (e) {}
  }
  if (!/^https?:\/\//i.test(src)) return {};
  return { src, width, height };
}
function ExternalEmbed({ embed, title = "Conteúdo incorporado", responsive = true, useEmbedDimensions = true, width, height = 600 }) {
  const parsed = parseExternalEmbed(embed), intrinsicWidth = (useEmbedDimensions && parsed.width) || Number(width) || undefined, intrinsicHeight = (useEmbedDimensions && parsed.height) || Number(height) || 600;
  const titleText = typeof title === "string" ? title.replace(/<[^>]*>/g, "").trim() : "Conteúdo incorporado";
  if (!parsed.src) return <div className="aula-external-embed" style={{ maxWidth: intrinsicWidth }}><div className="aula-external-embed__empty">Cole uma URL pública ou o código de incorporação &lt;iframe&gt;.</div></div>;
  if (usePDF()) return <div className="aula-external-embed__print"><strong>{titleText}</strong><br/><a href={parsed.src}>{parsed.src}</a></div>;
  const frameStyle = responsive && intrinsicWidth && intrinsicHeight ? { aspectRatio: `${intrinsicWidth} / ${intrinsicHeight}` } : { height: intrinsicHeight, minHeight: 120 };
  return <div className="aula-external-embed" style={{ maxWidth: intrinsicWidth }}><div className="aula-external-embed__frame" style={frameStyle}><iframe src={parsed.src} title={titleText || "Conteúdo incorporado"} loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen /></div></div>;
}

// VIDEO YOUTUBE — responsive 16:9 embed with caption
function VideoYouTube({ id, title = "Vídeo", caption, credit, start }) {
  const titleText = richPlain(title) || "Vídeo";
  if (usePDF()) {
    // PDF: static poster + the public YouTube URL underneath.
    const url = `https://youtu.be/${id}${start ? `?t=${start}` : ""}`;
    const thumb = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    return (
      <figure className="aula-video-print">
        <div className="aula-video-print__frame">
          <img src={thumb} alt={titleText} onError={(e) => { e.target.style.display = "none"; }} />
          <span className="aula-video-print__overlay">
            <span className="aula-video__play aula-video__play--print">
              <Icon name="play-fill" size={24} stroke={0} color="var(--paper)" style={{ fill: "var(--paper)", marginLeft: 3 }} />
            </span>
          </span>
        </div>
        {caption && <figcaption className="aula-media-cap"><RichInline value={caption}/>{credit && <span className="aula-media-credit"> — <RichInline value={credit}/></span>}</figcaption>}
        <RecursoLink rotulo="Assista em" href={url} />
      </figure>
    );
  }
  const [playing, setPlaying] = useState(false);
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&autoplay=1${start ? `&start=${start}` : ""}`;
  const thumb = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  return (
    <figure className="aula-video">
      <div className="aula-video__frame">
        {playing ? (
          <iframe
            className="aula-video__iframe"
            src={src}
            title={titleText}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        ) : (
          <button type="button" className="aula-video__poster" onClick={() => setPlaying(true)} aria-label={`Reproduzir: ${titleText}`}>
            <img src={thumb} alt="" className="aula-video__thumb" onError={(e) => { e.target.style.display = "none"; }} />
            <span className="aula-video__scrim"></span>
            <span className="aula-video__play">
              <Icon name="play-fill" size={26} stroke={0} color="var(--paper)" style={{ fill: "var(--paper)", marginLeft: 3 }} />
            </span>
            <RichInline className="aula-video__poster-title" value={title} />
          </button>
        )}
      </div>
      {caption && (
        <figcaption className="aula-media-cap">
          <RichInline value={caption}/>{credit && <span className="aula-media-credit"> — <RichInline value={credit}/></span>}
        </figcaption>
      )}
    </figure>
  );
}

// AUDIO PODCAST — dois modos:
//   1. Anexo de áudio  → <AudioPodcast src="audio/ep03.mp3" ... />
//   2. Embed do Spotify → <AudioPodcast spotify="https://open.spotify.com/episode/XXXX" ... />
// O modo Spotify aceita URL (episode/show) ou URI (spotify:episode:XXXX).
function toSpotifyEmbed(input) {
  if (!input) return null;
  // spotify:episode:ID  |  spotify:show:ID
  var uri = input.match(/spotify:(episode|show|track|playlist):([A-Za-z0-9]+)/);
  if (uri) return { type: uri[1], id: uri[2] };
  // https://open.spotify.com/episode/ID  (optionally /intl-xx/)
  var url = input.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(episode|show|track|playlist)\/([A-Za-z0-9]+)/);
  if (url) return { type: url[1], id: url[2] };
  return null;
}

function AudioPodcast({ src, spotify, slotId, title, show, duration, description, tall = false }) {
  if (usePDF()) {
    // PDF: static podcast card + the public resource URL underneath.
    let href = null, rotulo = "Ouça em";
    if (spotify) {
      const sp0 = toSpotifyEmbed(spotify);
      href = sp0 ? `https://open.spotify.com/${sp0.type}/${sp0.id}` : spotify;
    } else if (src) {
      href = src;
      if (!/^https?:\/\//.test(src)) rotulo = "Arquivo de áudio"; // local path, informational
    }
    return (
      <div className="aula-audio-print">
        <div className="aula-audio-print__art">
          <Icon name="headphones" size={30} stroke={1.6} color="var(--paper)" />
        </div>
        <div className="aula-audio-print__body">
          <div className="aula-audio__kicker">
            <Icon name="volume-2" size={14} stroke={1.8} color="var(--ocean)" />
            <span>{show || "Podcast"}</span>
          </div>
          {title && <RichInline className="aula-audio__title" value={title}/>}
          {description && <RichContent className="aula-audio__desc" html={description}/>}
          <div className="aula-audio-print__link">
            <RecursoLink rotulo={rotulo} href={href} />
          </div>
        </div>
      </div>
    );
  }
  // ── Spotify embed mode ──────────────────────────────────
  const sp = toSpotifyEmbed(spotify);
  if (sp) {
    const embedSrc = `https://open.spotify.com/embed/${sp.type}/${sp.id}?utm_source=generator&theme=0`;
    return (
      <div className="aula-audio-sp">
        {(show || title) && (
          <div className="aula-audio-sp__head">
            <div className="aula-audio__kicker">
              <Icon name="volume-2" size={14} stroke={1.8} color="var(--ocean)" />
              <span>{show || "Podcast"}</span>
            </div>
            {title && <RichInline className="aula-audio__title" value={title}/>}
            {description && <RichContent className="aula-audio__desc aula-audio__desc--tight" html={description}/>}
          </div>
        )}
        <iframe
          title={richPlain(title) || "Spotify"}
          className="aula-audio-sp__frame"
          src={embedSrc}
          width="100%"
          height={tall ? 352 : 152}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        ></iframe>
      </div>
    );
  }
  // ── Native audio-file mode ──────────────────────────────
  return <AudioFilePlayer src={src} slotId={slotId} title={title} show={show} duration={duration} description={description} />;
}

function AudioFilePlayer({ src, slotId, title, show, duration, description }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  const onTime = () => { const a = audioRef.current; if (a) { setCur(a.currentTime); setDur(a.duration || 0); } };
  const seek = (e) => {
    const a = audioRef.current; if (!a || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * dur;
  };
  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };
  const pct = dur ? (cur / dur) * 100 : 0;

  return (
    <div className="aula-audio">
      <div className="aula-audio__cover">
        {src ? (
          <div className="aula-audio__cover-art"><Icon name="headphones" size={34} stroke={1.6} color="var(--paper)" /></div>
        ) : (
          <image-slot id={slotId || "podcast-cover"} shape="rounded" radius="12" placeholder="Capa" style={{ width: "100%", height: "100%" }}></image-slot>
        )}
      </div>
      <div className="aula-audio__body">
        <div className="aula-audio__kicker">
          <Icon name="volume-2" size={14} stroke={1.8} color="var(--ocean)" />
          <span>{show || "Podcast"}</span>
        </div>
        <RichInline className="aula-audio__title" value={title}/>
        {description && <RichContent className="aula-audio__desc" html={description}/>}
        <div className="aula-audio__player">
          <button type="button" className="aula-audio__play" onClick={toggle} aria-label={playing ? "Pausar" : "Reproduzir"}>
            <Icon name={playing ? "pause" : "play-fill"} size={18} stroke={0} color="var(--paper)" style={{ fill: "var(--paper)", marginLeft: playing ? 0 : 2 }} />
          </button>
          <div className="aula-audio__track" onClick={seek}>
            <div className="aula-audio__fill" style={{ width: `${pct}%` }}></div>
            <div className="aula-audio__handle" style={{ left: `${pct}%` }}></div>
          </div>
          <span className="aula-audio__time">{fmt(cur)} / {dur ? fmt(dur) : (duration || "—")}</span>
        </div>
        <audio
          ref={audioRef}
          {...(src ? { src } : {})}
          onTimeUpdate={onTime}
          onLoadedMetadata={onTime}
          onEnded={() => setPlaying(false)}
          preload="metadata"
        ></audio>
      </div>
    </div>
  );
}

// PARALLAX IMAGE — full-bleed image band with parallax + caption
function ParallaxImage({ src, slotId, caption, credit, overlayTitle, height = "70vh" }) {
  const pdf = usePDF();
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  useEffect(() => {
    if (pdf) return;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = wrapRef.current, img = imgRef.current;
        if (!el || !img) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) return;
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -.5..+.5-ish
        img.style.transform = `translate3d(0, ${progress * -14}%, 0) scale(1.18)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [pdf]);
  return (
    <figure className={"aula-parallax" + (pdf ? " is-pdf" : "")}>
      <div ref={wrapRef} className="aula-parallax__frame" style={{ height }}>
        <div ref={imgRef} className="aula-parallax__imgwrap">
          {src ? (
            <img src={src} alt="" className="aula-parallax__img" />
          ) : (
            <image-slot id={slotId || "parallax"} shape="rect" placeholder="Imagem de fundo (parallax)" style={{ width: "100%", height: "100%" }}></image-slot>
          )}
        </div>
        {overlayTitle && (
          <div className="aula-parallax__overlay">
            <span className="aula-parallax__scrim"></span>
            <h2 className="aula-parallax__title">{overlayTitle}</h2>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="aula-media-cap aula-parallax__cap">
          {caption}{credit && <span className="aula-media-credit"> — {credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}

// FILMSTRIP — carrossel com scroll-snap + setas + dots.
//   mode="hero"  → imagens grandes, título + legenda sobre a imagem
//   mode="cards" → cartões com imagem + texto; flipam com mais texto no verso
function Filmstrip({ items = [], mode = "hero", label = "Galeria", ratio = "3/2" }) {
  if (usePDF()) {
    return (
      <div className="aula-fs-print">
        <div className="aula-fs-label aula-kicker">
          <Icon name={mode === "cards" ? "layers" : "image"} size={15} stroke={1.8} color="var(--ink-mute)" />
          <span>{label}</span>
        </div>
        <div className="aula-fs-print-grid">
          {items.map((it, i) => (
            <figure key={i} className="aula-fs-print-item">
              <div className="aula-fs-print-img" style={{ aspectRatio: ratio }}>
                {it.src
                  ? <img src={it.src} alt={richPlain(it.title)} />
                  : <image-slot id={it.slotId || `fs-${i}`} shape="rect" placeholder={richPlain(it.tag || it.title) || "Imagem"} style={{ width: "100%", height: "100%" }}></image-slot>}
              </div>
              <figcaption>
                {it.tag && <RichInline className="aula-fs-print-tag" value={it.tag}/>}
                {it.title && <RichInline className="aula-fs-print-title" value={it.title}/>}
                {it.text && <RichContent className="aula-fs-print-text" html={it.text}/>}
                {it.back && <span className="aula-fs-print-back"><strong>Verso:</strong> <RichInline value={it.back}/></span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  }
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const max = items.length;

  const scrollToIdx = (i) => {
    const tr = trackRef.current; if (!tr) return;
    const child = tr.children[i]; if (!child) return;
    tr.scrollTo({ left: child.offsetLeft - tr.offsetLeft, behavior: "smooth" });
  };
  const onScroll = () => {
    const tr = trackRef.current; if (!tr) return;
    let best = 0, bestD = Infinity;
    Array.prototype.forEach.call(tr.children, (c, i) => {
      const d = Math.abs(c.offsetLeft - tr.offsetLeft - tr.scrollLeft);
      if (d < bestD) { bestD = d; best = i; }
    });
    setIdx(best);
  };
  const go = (dir) => scrollToIdx(Math.max(0, Math.min(max - 1, idx + dir)));

  return (
    <div className="aula-filmstrip">
      <div className="aula-fs-head">
        <span className="aula-fs-label aula-kicker">
          <Icon name={mode === "cards" ? "layers" : "image"} size={15} stroke={1.8} color="var(--ink-mute)" />
          <span>{label}</span>
        </span>
        <div className="aula-fs-nav">
          <button type="button" className="aula-fs-btn" onClick={() => go(-1)} disabled={idx === 0} aria-label="Anterior">
            <Icon name="arrow-left" size={18} stroke={1.8} />
          </button>
          <span className="aula-fs-counter">{idx + 1} / {max}</span>
          <button type="button" className="aula-fs-btn" onClick={() => go(1)} disabled={idx === max - 1} aria-label="Próximo">
            <Icon name="arrow-right" size={18} stroke={1.8} />
          </button>
        </div>
      </div>

      <div className={"aula-fs-track aula-fs-track--" + mode} ref={trackRef} onScroll={onScroll}>
        {items.map((it, i) =>
          mode === "cards"
            ? <FilmstripCard key={i} item={it} />
            : <FilmstripHero key={i} item={it} ratio={ratio} />
        )}
      </div>

      <div className="aula-fs-dots">
        {items.map((_, i) => (
          <button key={i} type="button" className={"aula-fs-dot" + (i === idx ? " is-active" : "")} aria-label={`Ir para ${i + 1}`} onClick={() => scrollToIdx(i)}></button>
        ))}
      </div>
    </div>
  );
}

function FilmstripHero({ item, ratio = "3/2" }) {
  return (
    <figure className="aula-fs-hero">
      <div className="aula-fs-hero-frame" style={{ aspectRatio: ratio }}>
        {item.src
          ? <img src={item.src} alt={richPlain(item.title)} />
          : <image-slot id={item.slotId || "fs-hero"} shape="rect" placeholder={richPlain(item.tag || item.title) || "Imagem"} style={{ width: "100%", height: "100%" }}></image-slot>}
        <span className="aula-fs-hero-scrim" aria-hidden="true"></span>
        {item.tag && <RichInline className="aula-fs-hero-tag" value={item.tag}/>}
        {(item.title || item.text) && (
          <figcaption className="aula-fs-hero-cap">
            {item.title && <RichInline className="aula-fs-hero-title" value={item.title}/>}
            {item.text && <RichContent className="aula-fs-hero-text" html={item.text}/>}
          </figcaption>
        )}
      </div>
    </figure>
  );
}

function FilmstripCard({ item }) {
  const [flipped, setFlipped] = useState(false);
  const safeTone = AULA_TONES[item.tone] ? item.tone : "ocean";
  const hasBack = !!item.back;
  return (
    <div className="aula-fs-cardwrap" data-tone={safeTone}>
      <div className={"aula-fs-card" + (flipped ? " is-flipped" : "")}>
        <div className="aula-fs-face aula-fs-front">
          <div className="aula-fs-card-img">
            {item.src
              ? <img src={item.src} alt={richPlain(item.title)} />
              : <image-slot id={item.slotId || "fs-card"} shape="rect" placeholder={richPlain(item.tag) || "Imagem"} style={{ width: "100%", height: "100%" }}></image-slot>}
            {item.tag && <RichInline className="aula-fs-card-tag" value={item.tag}/>}
          </div>
          <div className="aula-fs-card-body">
            {item.title && <RichInline className="aula-fs-card-title" value={item.title}/>}
            {item.text && <RichContent className="aula-fs-card-text" html={item.text}/>}
            {hasBack && (
              <button type="button" className="aula-fs-card-flip" onClick={() => setFlipped(true)}>
                <Icon name="rotate-ccw" size={13} stroke={1.9} color="var(--ink-mute)" />
                <span>ver mais</span>
              </button>
            )}
          </div>
        </div>
        {hasBack && (
          <div className="aula-fs-face aula-fs-back">
            <div className="aula-fs-back-head">
              <Icon name="layers" size={14} stroke={1.9} color="currentColor" />
              <RichInline value={item.title}/>
            </div>
            <RichContent className="aula-fs-back-text" html={item.back}/>
            <button type="button" className="aula-fs-card-flip aula-fs-card-flip--back" onClick={() => setFlipped(false)}>
              <Icon name="arrow-left" size={13} stroke={1.9} color="currentColor" />
              <span>voltar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// INTERATIVOS — flashcards, slider, accordion, quiz, linha do tempo
// ════════════════════════════════════════════════════════════

// FLASHCARD — single flippable card (click to flip)
function FlashCard({ front, back, tone = "marigold" }) {
  const [flipped, setFlipped] = useState(false);
  const safeTone = AULA_TONES[tone] ? tone : "marigold";
  return (
    <button
      type="button"
      className="aula-flash"
      data-tone={safeTone}
      onClick={() => setFlipped((f) => !f)}
      aria-label={`Flashcard. ${flipped ? "Mostrando resposta" : "Mostrando pergunta"}. Clique para virar.`}
    >
      <div className={"aula-flash__inner" + (flipped ? " is-flipped" : "")}>
        <div className="aula-flash__face aula-flash__front">
          <span className="aula-flash__tag">Pergunta</span>
          <RichContent className="aula-flash__front-text" html={front}/>
          <span className="aula-flash__hint"><Icon name="rotate-ccw" size={13} color="var(--ink-mute)" /> clique para virar</span>
        </div>
        <div className="aula-flash__face aula-flash__back">
          <span className="aula-flash__tag aula-flash__tag--back">Resposta</span>
          <RichContent className="aula-flash__back-text" html={back}/>
        </div>
      </div>
    </button>
  );
}

// FLASHCARD DECK — multiple flashcards as a swipeable strip
function FlashCardDeck({ cards = [], tones = [], sectionTone = "paper", label = "Flashcards" }) {
  if (usePDF()) {
    // PDF: the deck only mounts one card on screen, so render every card
    // from data, front AND back side by side.
    return (
      <div className="aula-deck-print">
        <div className="aula-deck__label aula-kicker">
          <Icon name="layers" size={16} stroke={1.8} />
          <span>{label}</span>
        </div>
        <div className="aula-deck-print__grid">
          {cards.map((c, idx) => (
            <div key={idx} className="aula-flashcard-print">
              <div className="aula-flashcard-print__side aula-flashcard-print__side--front">
                <div className="aula-flashcard-print__tag">Pergunta {idx + 1}</div>
                <RichContent className="aula-flashcard-print__front" html={c.front}/>
              </div>
              <div className="aula-flashcard-print__side aula-flashcard-print__side--back">
                <div className="aula-flashcard-print__tag">Resposta</div>
                <RichContent className="aula-flashcard-print__back" html={c.back}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const [i, setI] = useState(0);
  const max = cards.length;
  // No card may share the section's background colour — keep good contrast.
  const palette = (tones.length ? tones : ["marigold", "sage", "lavender", "coral", "ocean"]);
  const safeTones = palette.filter((t) => t !== sectionTone);
  const deckTones = safeTones.length ? safeTones : ["marigold", "sage", "lavender", "coral", "ocean"].filter((t) => t !== sectionTone);
  const toneFor = (idx) => {
    const explicit = cards[idx]?.tone;
    if (explicit && explicit !== sectionTone) return explicit;
    return deckTones[idx % deckTones.length] || "marigold";
  };
  return (
    <div className="aula-deck">
      <div className="aula-deck__head">
        <div className="aula-deck__label aula-kicker">
          <Icon name="layers" size={16} stroke={1.8} />
          <span>{label}</span>
        </div>
        <div className="aula-deck__counter">{i + 1} / {max}</div>
      </div>
      <div className="aula-deck__cardwrap">
        <FlashCard
          key={i}
          front={cards[i]?.front}
          back={cards[i]?.back}
          tone={toneFor(i)}
        />
      </div>
      <div className="aula-deck__controls">
        <button
          type="button"
          className="aula-deck__nav"
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          aria-label="Anterior"
        >
          <Icon name="arrow-left" size={18} stroke={1.8} />
        </button>
        <div className="aula-deck__dots">
          {cards.map((_, idx) => (
            <button key={idx} type="button" onClick={() => setI(idx)} aria-label={`Ir para card ${idx + 1}`}
              className={"aula-deck__dot" + (idx === i ? " is-active" : "")}></button>
          ))}
        </div>
        <button
          type="button"
          className="aula-deck__nav"
          onClick={() => setI((v) => Math.min(max - 1, v + 1))}
          disabled={i === max - 1}
          aria-label="Próximo"
        >
          <Icon name="arrow-right" size={18} stroke={1.8} />
        </button>
      </div>
    </div>
  );
}

// SLIDER — horizontal carousel of full panels (step-by-step)
function SliderMarker({ step, index, print = false }) {
  const className = print ? "aula-step-print__num" : "aula-slider__num";
  if (step.icon) return <span className={className}><i className={fontAwesomeClass(step.icon)} aria-hidden="true"></i></span>;
  return <span className={className}>{step.marker || String(index + 1).padStart(2, "0")}</span>;
}

function RichContent({ html, className, tag = "div" }) {
  if (React.isValidElement(html)) return React.createElement(tag, { className }, html);
  return React.createElement(tag, { className, dangerouslySetInnerHTML: { __html: html || "" } });
}
function richPlain(value) {
  const source = React.isValidElement(value) ? value.props?.html : value;
  return String(source || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}
function RichInline({ value, className }) {
  if (React.isValidElement(value)) return <span className={className}>{value}</span>;
  return <span className={className} dangerouslySetInnerHTML={{ __html: value || "" }} />;
}

function Slider({ steps = [], label = "Passo a passo" }) {
  if (usePDF()) {
    // PDF: stack every step vertically so nothing stays behind the carousel.
    return (
      <div className="aula-card aula-slider-print">
        {label && <div className="aula-slider__label aula-kicker">
          <Icon name="play" size={14} stroke={0} color="var(--ink-mute)" style={{ fill: "var(--ink-mute)" }} />
          <span>{label}</span>
        </div>}
        <ol className="aula-slider-print__list">
          {steps.map((s, idx) => (
            <li key={idx} className="aula-step-print">
              <SliderMarker step={s} index={idx} print />
              <div>
                <RichInline className="aula-step-print__title" value={s.title} />
                <RichContent className="aula-step-print__body" html={s.body} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  const [i, setI] = useState(0);
  const max = steps.length;
  return (
    <div className="aula-slider">
      <div className="aula-slider__head">
        {label && <div className="aula-slider__label aula-kicker">
          <Icon name="play" size={14} stroke={0} color="var(--ink-mute)" style={{ fill: "var(--ink-mute)" }} />
          <span>{label}</span>
        </div>}
        <div className="aula-slider__progress">
          {steps.map((_, idx) => (
            <span key={idx} className={"aula-slider__bar" + (idx <= i ? " is-on" : "")}></span>
          ))}
        </div>
        <div className="aula-slider__counter">{i + 1} / {max}</div>
      </div>
      <div className="aula-slider__frame">
        <div className="aula-slider__track" style={{ transform: `translateX(-${i * 100}%)` }}>
          {steps.map((s, idx) => (
            <div key={idx} className="aula-slider__slide">
              <SliderMarker step={s} index={idx} />
              <RichInline className="aula-slider__title" value={s.title} />
              <RichContent className="aula-slider__text" html={s.body} />
            </div>
          ))}
        </div>
      </div>
      <div className="aula-slider__controls">
        <button
          type="button"
          className="aula-slider__btn"
          onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}
        >
          <Icon name="chevron-left" size={16} stroke={2} />
          <span>Anterior</span>
        </button>
        <button
          type="button"
          className="aula-slider__btn aula-slider__btn--primary"
          onClick={() => setI((v) => Math.min(max - 1, v + 1))} disabled={i === max - 1}
        >
          <span>{i === max - 1 ? "Concluído" : "Próximo"}</span>
          <Icon name="chevron-right" size={16} stroke={2} />
        </button>
      </div>
    </div>
  );
}

// ACCORDION — vertical stack of collapsibles
function Accordion({ items = [], renderBlocks }) {
  if (usePDF()) {
    // PDF: every item open, question + answer visible.
    return (
      <div className="aula-accordion-print">
        {items.map((it, idx) => {
          const title = it.title != null ? it.title : it.q;
          const body = it.body != null ? it.body : it.a;
          return (
          <div key={idx} className="aula-card aula-accordion-print__item">
            <div className="aula-accordion-print__row">
              <span className="aula-acc__num">{String(idx + 1).padStart(2, "0")}</span>
              <div>
                <RichContent className="aula-accordion-print__q" html={title} />
                <RichContent className="aula-accordion-print__a" html={body} />
                {renderBlocks && renderBlocks(it.children || [])}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    );
  }
  const [open, setOpen] = useState(0);
  return (
    <div className="aula-accordion">
      {items.map((it, idx) => {
        const isOpen = open === idx;
        const title = it.title != null ? it.title : it.q;
        const body = it.body != null ? it.body : it.a;
        return (
          <div key={idx} className={"aula-acc__item" + (isOpen ? " is-open" : "")}>
            <button
              type="button"
              className="aula-acc__head"
              onClick={() => setOpen(isOpen ? -1 : idx)}
              aria-expanded={isOpen}
            >
              <span className="aula-acc__num">{String(idx + 1).padStart(2, "0")}</span>
              <RichContent className="aula-acc__q" html={title} tag="span" />
              <span className="aula-acc__chev">
                <Icon name="chevron-down" size={20} stroke={1.6} />
              </span>
            </button>
            <div className="aula-acc__bodywrap">
              <div className="aula-acc__clip">
                <RichContent className="aula-acc__body" html={body} />
                {renderBlocks && renderBlocks(it.children || [])}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// QUIZ — multiple questions, single-choice, submit + nova tentativa
function Quiz({ title = "Quiz", intro, questions = [], passMark = 0.6, avaliativo = false, pdfGabarito = true }) {
  if (usePDF()) {
    // PDF: questions stay clean; the compact answer key follows the activity.
    return (
      <section className="aula-card aula-quiz-print" aria-label="Quiz">
        <div className="aula-quiz__kicker aula-kicker">
          <Icon name="graduation-cap" size={16} stroke={1.8} color="var(--ink-mute)" />
          <RichInline value={title}/>
        </div>
        {intro && <RichContent className="aula-quiz__intro" html={intro} />}
        <ol className="aula-quiz-print__list">
          {questions.map((q, qi) => (
            <li key={qi} className="aula-quiz-q">
              <div className="aula-quiz__qhead">
                <span className="aula-quiz__qnum">{qi + 1}</span>
                <RichContent className="aula-quiz__qtext" html={q.q} />
              </div>
              <ul className="aula-quiz-print__options">
                {q.options.map((opt, oi) => {
                  return (
                    <li key={oi} className="aula-quiz-print__opt">
                      <span className="aula-quiz-print__letter">{String.fromCharCode(97 + oi) + ")"}</span>
                      <RichInline className="aula-quiz-print__opt-text" value={opt}/>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
        {pdfGabarito && questions.length > 0 && (
          <aside className="aula-quiz-print__answer-key" aria-label="Gabarito e feedback">
            <h3>Gabarito e feedback</h3>
            <ol>
              {questions.map((q, qi) => (
                <li key={qi}>
                  <strong>{qi + 1}. {String.fromCharCode(65 + q.answer)}</strong>
                  {q.explanation && <RichContent className="aula-quiz-print__answer-text" html={q.explanation} />}
                </li>
              ))}
            </ol>
          </aside>
        )}
      </section>
    );
  }
  const [answers, setAnswers] = useState(() => questions.map(() => -1));
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState(1);

  const total = questions.length;
  const correct = answers.reduce((n, a, i) => n + (a === questions[i].answer ? 1 : 0), 0);
  const ratio = total ? correct / total : 0;
  const threshold = Number(passMark) > 1 ? Number(passMark) / 10 : Number(passMark);
  const passed = ratio >= Math.max(0, Math.min(1, threshold || 0));
  const answeredAll = answers.every((a) => a >= 0);

  const choose = (qi, oi) => {
    if (submitted) return;
    setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)));
  };
  const submit = () => {
    if (!answeredAll) return;
    setSubmitted(true);
    // Avaliativo: report the grade to the LMS on a 0–10 scale.
    if (avaliativo && window.AulaSCORM && typeof window.AulaSCORM.score === "function") {
      const nota10 = total ? Math.round((correct / total) * 10 * 10) / 10 : 0; // 0–10, 1 decimal
      try { window.AulaSCORM.score(nota10, passed); } catch (e) { /* noop */ }
    }
  };
  const retry = () => { setAnswers(questions.map(() => -1)); setSubmitted(false); setAttempt((a) => a + 1); };

  return (
    <section className="aula-quiz" aria-label="Quiz">
      <div className="aula-quiz__head">
        <span className="aula-quiz__kicker aula-kicker">
          <Icon name="graduation-cap" size={16} stroke={1.8} color="var(--ink-mute)" />
          <RichInline value={title}/>
        </span>
        <span className="aula-quiz__attempt">Tentativa {attempt}</span>
      </div>
      {intro && <RichContent className="aula-quiz__intro" html={intro} />}

      <ol className="aula-quiz__list">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li key={qi} className="aula-quiz__q">
              <div className="aula-quiz__qhead">
                <span className="aula-quiz__qnum">{qi + 1}</span>
                <RichContent className="aula-quiz__qtext" html={q.q} />
              </div>
              <div className="aula-quiz__options">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isAnswer = q.answer === oi;
                  let state = "idle";
                  if (submitted) {
                    if (isAnswer) state = "correct";
                    else if (isChosen) state = "wrong";
                  } else if (isChosen) state = "chosen";
                  return (
                    <button
                      key={oi}
                      type="button"
                      className="aula-quiz__opt"
                      data-state={state}
                      onClick={() => choose(qi, oi)}
                      disabled={submitted}
                      aria-pressed={isChosen}
                    >
                      <span className="aula-quiz__radio" data-state={state}>
                        {submitted && isAnswer && <Icon name="check" size={13} stroke={3} color="var(--paper)" />}
                        {submitted && isChosen && !isAnswer && <Icon name="x" size={13} stroke={3} color="var(--paper)" />}
                        {!submitted && isChosen && <span className="aula-quiz__radio-dot"></span>}
                      </span>
                      <RichInline className="aula-quiz__opt-text" value={opt}/>
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <div className={"aula-quiz__explain" + (chosen === q.answer ? " is-ok" : " is-no")}>
                  <Icon name={chosen === q.answer ? "check-circle" : "alert-triangle"} size={15} stroke={1.9}
                        color={chosen === q.answer ? "var(--sage-deep)" : "var(--terracotta-deep)"} />
                  <RichContent html={q.explanation} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="aula-quiz__footer">
        {!submitted ? (
          <React.Fragment>
            <span className="aula-quiz__progress">
              {answers.filter((a) => a >= 0).length} de {total} respondidas
            </span>
            <button
              type="button"
              className="aula-quiz__submit"
              onClick={submit} disabled={!answeredAll}
            >
              Verificar respostas
              <Icon name="check" size={16} stroke={2.2} color="var(--paper)" />
            </button>
          </React.Fragment>
        ) : (
          <div className="aula-quiz__result">
            <div className={"aula-quiz__score" + (passed ? " is-pass" : " is-fail")}>
              <span className="aula-quiz__score-num">{correct}/{total}</span>
              <span className="aula-quiz__score-label">
                {avaliativo
                  ? `Nota ${(total ? Math.round((correct / total) * 100) / 10 : 0).toLocaleString("pt-BR")} \u2014 ${passed ? "aprovado" : "n\u00e3o atingiu a nota m\u00ednima"}`
                  : (passed ? "Voc\u00ea foi bem!" : "Vale revisar e tentar de novo")}
              </span>
            </div>
            <button type="button" className="aula-quiz__retry" onClick={retry}>
              <Icon name="refresh-cw" size={16} stroke={2} color="var(--ink)" />
              Nova tentativa
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// LINHA DO TEMPO — interativa, organizada em eras (períodos).
// Cada era tem rótulo + intervalo + cor (tone). Dentro dela,
// marcos por data; clicar abre texto e imagem opcional.
function LinhaDoTempo({ eras = [], title, renderBlocks }) {
  const pdf = usePDF();
  return (
    <div className="aula-timeline">
      {title && <RichInline className="aula-tl-toptitle" value={title}/>}
      {eras.map((era, ei) => {
        const tone = AULA_TONES[era.tone] || AULA_TONES.ocean;
        return (
          <section className="aula-tl-era" key={ei} style={{ "--tl-base": tone.base, "--tl-soft": tone.soft, "--tl-deep": tone.deep }}>
            <header className="aula-tl-era-head">
              <span className="aula-tl-era-dot" aria-hidden="true"></span>
              <RichInline className="aula-tl-era-label" value={era.label}/>
              {era.range && <RichInline className="aula-tl-era-range" value={era.range}/>}
            </header>
            <ol className="aula-tl-events">
              {(era.events || []).map((ev, vi) => (
                <TimelineEvent key={vi} ev={ev} defaultOpen={!!ev.open} print={pdf} renderBlocks={renderBlocks} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function TimelineEvent({ ev, defaultOpen = false, print = false, renderBlocks }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const hasImg = !!(ev.src || ev.slotId);
  const hasDetail = !!(ev.text || hasImg || (ev.children || []).length);
  const detailContent = hasDetail && (
    <React.Fragment>
      {hasImg && (
        <div className="aula-tl-img">
          {ev.src
            ? <img src={ev.src} alt={richPlain(ev.title)} />
            : <image-slot id={ev.slotId || "tl-img"} shape="rect" placeholder={richPlain(ev.title) || "Imagem do marco"} style={{ width: "100%", height: "100%" }}></image-slot>}
        </div>
      )}
      {ev.text && <RichContent className="aula-tl-text" html={ev.text}/>}
      {renderBlocks && renderBlocks(ev.children || [])}
    </React.Fragment>
  );
  if (print) {
    return (
      <li className="aula-tl-event aula-tl-event--print is-open">
        <div className="aula-tl-marker aula-tl-marker--print">
          <span className="aula-tl-dot" aria-hidden="true"></span>
          <span className="aula-tl-mk-main">
            <RichInline className="aula-tl-date" value={ev.date}/>
            <RichInline className="aula-tl-title" value={ev.title}/>
          </span>
        </div>
        {hasDetail && <div className="aula-tl-detail">{detailContent}</div>}
      </li>
    );
  }
  return (
    <li className={"aula-tl-event" + (open ? " is-open" : "")}>
      <button type="button" className="aula-tl-marker" onClick={() => hasDetail && setOpen((o) => !o)} aria-expanded={open} disabled={!hasDetail}>
        <span className="aula-tl-dot" aria-hidden="true"></span>
        <span className="aula-tl-mk-main">
          <RichInline className="aula-tl-date" value={ev.date}/>
          <RichInline className="aula-tl-title" value={ev.title}/>
        </span>
        {hasDetail && (
          <span className="aula-tl-chev" aria-hidden="true">
            <Icon name="chevron-down" size={18} stroke={1.7} color="var(--ink-mute)" />
          </span>
        )}
      </button>
      {hasDetail && (
        <div className="aula-tl-detailwrap">
          <div className="aula-tl-clip">
            <div className="aula-tl-detail">
              {detailContent}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

// ════════════════════════════════════════════════════════════
// DADOS & CONTEÚDO — tabela, cases, features, materiais,
// referências, texto+imagem
// ════════════════════════════════════════════════════════════

// TABELA — striped, otimizada para mobile.
//   No desktop: tabela normal com zebra striping discreto.
//   No mobile (<600px): cada linha vira um cartão e cada célula
//   exibe o rótulo da sua coluna (via data-label). Sem scroll-x.
function Tabela({ caption, fonte, headers = [], rows = [], striped = true, destacarPrimeira = true, compact = false }) {
  const cls = [
    "aula-tabela",
    striped ? "aula-tabela--striped" : "",
    compact ? "aula-tabela--compact" : "",
    destacarPrimeira ? "aula-tabela--rowhead" : "",
  ].filter(Boolean).join(" ");
  return (
    <figure className="aula-tabela-wrap">
      <table className={cls} style={{ "--table-columns": Math.max(headers.length, 1) }}>
        {caption && <caption className="aula-tabela-caption"><RichInline value={caption}/></caption>}
        <thead>
          <tr>
            {headers.map((h, i) => <th key={i} scope="col"><RichInline value={h}/></th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) =>
                ci === 0 && destacarPrimeira ? (
                  <th key={ci} scope="row" data-label={richPlain(headers[ci])}><RichInline value={cell}/></th>
                ) : (
                  <td key={ci} data-label={richPlain(headers[ci])}><RichInline value={cell}/></td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {fonte && <figcaption className="aula-tabela-fonte"><RichInline value={fonte}/></figcaption>}
    </figure>
  );
}

// CASE CARDS — cover image + title + short text
function CaseCards({ title, intro, cards = [], columns = 2, layout = "vertical" }) {
  const horizontal = layout === "horizontal";
  const cols = String(columns) === "3" ? "3" : "2";
  const mediaType = (card) => card.mediaType || card.media || "image";
  return (
    <section className="aula-cases">
      {title && <RichInline className="aula-cases__title" value={title} />}
      {intro && <RichContent className="aula-cases__intro" html={intro} />}
      <div className={"aula-cases-grid" + (horizontal ? " is-horizontal" : "")} data-cols={cols}>
        {cards.map((c, i) => {
          const kind = mediaType(c);
          return (
            <div key={i} className={"aula-case-card" + (kind === "none" ? " is-text-only" : "")}>
              {kind !== "none" && (
                <div className={"aula-case-cover" + (kind === "icon" ? " is-icon" : "")}>
                  {kind === "icon" ? (
                    <i className={`fa-solid fa-${c.icon || "lightbulb"}`} aria-hidden="true"></i>
                  ) : c.src ? (
                    <img src={c.src} alt="" className="aula-case-cover-img" />
                  ) : (
                    <image-slot id={c.slotId || `case-${i}`} shape="rect" placeholder={richPlain(c.tag) || "Imagem"} style={{ width: "100%", height: "100%" }}></image-slot>
                  )}
                  {c.tag && <RichInline className="aula-case-tag" value={c.tag} />}
                </div>
              )}
              <div className="aula-case-body">
                {kind === "none" && c.tag && <RichInline className="aula-case-tag aula-case-tag--inline" value={c.tag} />}
                <RichInline className="aula-case-title" value={c.title} />
                <RichContent className="aula-case-text" html={c.text} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// FEATURE GRID — célula de "feature": badge redondo colorido com
// ícone (Font Awesome) + título curto + linha de texto, em grade
// responsiva (1 / 2 / 3 por linha).
function FeatureGrid({ title, intro, features = [], align = "center", columns = 3 }) {
  const centered = align === "center";
  return (
    <section className={"aula-features" + (centered ? " aula-features--center" : " aula-features--left")}>
      {title && <RichInline className="aula-features__title" value={title} />}
      {intro && <RichContent className="aula-features__intro" html={intro} />}
      <div className="aula-feature-grid" style={{ "--feature-columns": Math.max(1, Math.min(4, Number(columns) || 3)) }}>
        {features.map((f, i) => {
          const safeTone = AULA_TONES[f.tone] ? f.tone : "ocean";
          return (
            <div key={i} className="aula-feature-item" data-tone={safeTone}>
              <span className="aula-feature__badge" aria-hidden="true">
                <i className={fontAwesomeClass(f.icon)}></i>
              </span>
              <RichInline className="aula-feature__title" value={f.title} />
              {f.text && <RichContent className="aula-feature__text" html={f.text} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// COLUNAS — conteúdo editorial paralelo; empilha no mobile e preserva HTML rico.
function Columns({ columns = [], gap = "normal", emphasis = "none", renderBlocks }) {
  const wideIndex = emphasis === "none" ? -1 : Number(emphasis);
  const layout = columns.map((_, index) => index === wideIndex ? "2fr" : "1fr").join(" ");
  return <div className="aula-columns" data-gap={gap} data-emphasis={emphasis} style={{ "--column-count": Math.max(1, Math.min(4, columns.length || 1)), "--column-layout": layout || "1fr" }}>
    {columns.map((column, index) => <section className="aula-column" key={index}>
      {column.title && <RichInline className="aula-column__title" value={column.title} />}
      {column.body && <RichContent className="aula-column__body" html={column.body} />}
      {renderBlocks && <div className="aula-column__blocks">{renderBlocks(column.children || [], index)}</div>}
    </section>)}
  </div>;
}

function CollapsibleSection({ title = "Saiba mais", summary, children, open = false }) {
  if (usePDF()) return <section className="aula-collapsible is-print"><h3>{title}</h3>{summary && <p className="aula-collapsible__summary">{summary}</p>}<div className="aula-collapsible__body">{children}</div></section>;
  return <details className="aula-collapsible" open={open}>
    <summary><span><strong>{title}</strong>{summary && <small>{summary}</small>}</span><Icon name="chevron-down" size={20} stroke={1.7} /></summary>
    <div className="aula-collapsible__body">{children}</div>
  </details>;
}

function SectionSlider({ label = "Explore", slides = [] }) {
  const [i, setI] = useState(0);
  const max = slides.length;
  if (usePDF()) return <div className="aula-section-slider is-print">{slides.map((s, idx) => <section key={idx}><span className="aula-kicker">{s.eyebrow}</span><h3>{s.title}</h3><RichContent html={s.body} /></section>)}</div>;
  const slide = slides[i] || {};
  return <section className="aula-section-slider">
    <div className="aula-section-slider__head"><span className="aula-kicker">{label}</span><span>{max ? i + 1 : 0} / {max}</span></div>
    <div className="aula-section-slider__panel"><span className="aula-kicker">{slide.eyebrow}</span><h3>{slide.title}</h3><RichContent html={slide.body} /></div>
    <div className="aula-section-slider__controls"><button disabled={i === 0} onClick={() => setI((v) => Math.max(0, v - 1))}><Icon name="arrow-left" size={17} /> Anterior</button><div>{slides.map((_, idx) => <button className={idx === i ? "is-active" : ""} key={idx} aria-label={`Ir para seção ${idx + 1}`} onClick={() => setI(idx)} />)}</div><button disabled={i >= max - 1} onClick={() => setI((v) => Math.min(max - 1, v + 1))}>Próxima <Icon name="arrow-right" size={17} /></button></div>
  </section>;
}

// MATERIAIS EXTRAS — leituras / links com tipo e fonte
function MateriaisExtras({ title = "Para ir além", items = [] }) {
  const iconFor = { pdf: "file-text", artigo: "newspaper", livro: "book-marked", video: "play-circle", site: "link", download: "download" };
  return (
    <section className="aula-materiais" aria-label={title}>
      <div className="aula-materiais__head">
        <Icon name="book-open" size={18} stroke={1.7} color="var(--marigold-deep)" />
        <RichInline className="aula-materiais__title" value={title} />
      </div>
      <ul className="aula-materiais__list">
        {items.map((it, i) => (
          <li key={i}>
            <a href={it.href || "#"} target="_blank" rel="noopener" className="aula-materiais__item">
              <span className="aula-materiais__icon">
                <Icon name={iconFor[it.type] || "link"} size={18} stroke={1.7} color="var(--ink-soft)" />
              </span>
              <span className="aula-materiais__body">
                <RichInline className="aula-materiais__item-title" value={it.title} />
                {it.source && <span className="aula-materiais__source"><RichInline value={it.source} />{it.kind ? ` · ${it.kind}` : ""}</span>}
              </span>
              <Icon name="arrow-up-right" size={16} stroke={1.8} color="var(--ink-mute)" style={{ flexShrink: 0 }} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// REFERÊNCIAS ABNT — collapsed list, hanging indent, NBR 6023
function ReferenciasABNT({ title = "Referências", items = [], defaultOpen = false, dark = false }) {
  if (usePDF()) {
    // PDF: always open, full list, optionally starting on a fresh page.
    return (
      <section className={"aula-pagebreak-before aula-refs-print" + (dark ? " aula-refs--dark" : "")}>
        <h2 className="aula-refs-print__title">{title}</h2>
        <ol className="aula-refs__list aula-refs-print__list">
          {items.map((r, i) => (
            <li key={i} className="aula-refs__ref" dangerouslySetInnerHTML={{ __html: r }}></li>
          ))}
        </ol>
      </section>
    );
  }
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={"aula-refs" + (dark ? " aula-refs--dark" : "") + (open ? " is-open" : "")}>
      <button type="button" className="aula-refs__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="aula-refs__head-left">
          <Icon name="book-marked" size={18} stroke={1.7} color="currentColor" />
          <span className="aula-refs__title">{title}</span>
          <span className="aula-refs__count">{items.length}</span>
        </span>
        <span className="aula-refs__chev">
          <Icon name="chevron-down" size={20} stroke={1.6} color="currentColor" />
        </span>
      </button>
      <div className="aula-refs__bodywrap">
        <div className="aula-refs__clip">
          <ol className="aula-refs__list">
            {items.map((r, i) => (
              <li key={i} className="aula-refs__ref" dangerouslySetInnerHTML={{ __html: r }}></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// TEXTO + IMAGEM — bloco de duas colunas com sangria.
//   A imagem flutua para um lado e PODE ultrapassar a coluna
//   container (sangria configurável). O texto contorna a imagem e,
//   quando é mais alto, segue por baixo ocupando a largura total.
//   ordem="texto-imagem" | "imagem-texto" · largura ex. "46%" · sangria ex. "8%"
function TextoImagem({ children, texto, src, slotId, legenda, fonte, ordem = "texto-imagem", largura = "46%", sangria = "8%" }) {
  const imgLeft = ordem === "imagem-texto";
  const pdf = usePDF();
  const cls = [
    "aula-texto-imagem",
    imgLeft ? "aula-ti--img-left" : "aula-ti--img-right",
    pdf ? "aula-ti--pdf" : "",
  ].filter(Boolean).join(" ");
  const style = { "--ti-w": largura, "--ti-bleed": "-" + sangria };

  const figura = (
    <figure className="aula-ti-fig">
      {src
        ? <img className="aula-ti-img" src={src} alt={richPlain(legenda)} />
        : <div className="aula-ti-slot"><image-slot id={slotId || "ti-img"} shape="rect" placeholder={richPlain(legenda) || "Imagem"} style={{ width: "100%", height: "100%" }}></image-slot></div>}
      {(legenda || fonte) && (
        <figcaption className="aula-ti-cap">
          <RichInline value={legenda}/>
          {fonte && <span className="aula-ti-fonte"> — <RichInline value={fonte}/></span>}
        </figcaption>
      )}
    </figure>
  );

  return (
    <div className={cls} style={style}>
      {figura}
      <div className="aula-ti-texto">
        {texto ? <p>{texto}</p> : children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FECHAMENTO — conclusão SCORM, créditos, marca AulaStudio
// ════════════════════════════════════════════════════════════

// LESSON COMPLETE — single SCORM-completion CTA.
// Calls window.AulaSCORM.complete() which sets completion +
// success status. No prev/next nav — the host LMS owns navigation.
function LessonComplete({ onComplete }) {
  if (usePDF()) return null; // the SCORM “mark complete” CTA has no meaning on paper
  const [done, setDone] = useState(false);
  const handle = () => {
    let ok = false;
    try {
      if (window.AulaSCORM && typeof window.AulaSCORM.complete === "function") {
        ok = window.AulaSCORM.complete();
      }
    } catch (e) { /* noop */ }
    setDone(true);
    if (onComplete) onComplete(ok);
  };
  return (
    <section className="aula-complete">
      <div className="aula-complete__inner">
        <div className={"aula-complete__ring" + (done ? " is-done" : "")}>
          <Icon name={done ? "check" : "award"} size={26} stroke={2} color={done ? "var(--paper)" : "var(--sage-deep)"} />
        </div>
        <h2 className="aula-complete__title">
          {done ? "Aula concluída — bom trabalho!" : "Você chegou ao fim desta aula"}
        </h2>
        <p className="aula-complete__sub">
          {done
            ? "Seu progresso foi registrado na plataforma."
            : "Ao marcar como concluída, sua conclusão deste conteúdo é registrada na plataforma."}
        </p>
        <button
          type="button"
          className={"aula-complete__btn" + (done ? " is-done" : "")}
          onClick={done ? undefined : handle}
          disabled={done}
        >
          {done ? "Aula concluída" : "Marcar aula como concluída"}
          <Icon name="check" size={18} stroke={2} color="var(--paper)" />
        </button>
      </div>
    </section>
  );
}

// CREDITS FOOTER — authorship, AI support, CC BY-NC-SA license.
// Sits at the very bottom of every Aula unit.
function CreditsFooter({ author, role, institution, year, aiTool, aiUse, licenseHref }) {
  const hasCredits = author || aiTool || licenseHref;
  return (
    <footer className="aula-credits">
      {hasCredits && (
        <div className="aula-credits__inner">
          {author && (
            <div className="aula-credits__block">
              <div className="aula-credits__label">Autoria</div>
              <p className="aula-credits__author">{author}</p>
              {(role || institution || year) && (
                <p className="aula-credits__meta">{role}{institution ? ` · ${institution}` : ""}{year ? ` · ${year}` : ""}</p>
              )}
            </div>
          )}

          {aiTool && (
            <div className="aula-credits__block">
              <div className="aula-credits__label">Apoio de IA</div>
              <p className="aula-credits__meta">
                Produzido com apoio de <strong className="aula-credits__strong">{aiTool}</strong>{(() => { const u = (aiUse || "").trim(); return u ? (/^[,;:.]/.test(u) ? "" : " ") + (/[.!?]$/.test(u) ? u : u + ".") : "."; })()} A curadoria, revisão e responsabilidade pelo conteúdo são humanas.
              </p>
            </div>
          )}

          <div className="aula-credits__block">
            <div className="aula-credits__label">Licença</div>
            <a href={licenseHref || "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br"} target="_blank" rel="noopener" className="aula-credits__license">
              <span className="aula-credits__cc-group" aria-hidden="true">
                <CCGlyph kind="cc" /><CCGlyph kind="by" /><CCGlyph kind="nc" /><CCGlyph kind="sa" />
              </span>
              <span className="aula-credits__cc-text">CC BY-NC-SA 4.0</span>
            </a>
            <p className="aula-credits__meta">
              Você pode compartilhar e adaptar, citando a autoria, sem uso comercial e
              mantendo a mesma licença.
            </p>
          </div>
        </div>
      )}

      <AulaStudioMark withRule={hasCredits} />
    </footer>
  );
}

// AULA AUTHOR MARK — mandatory attribution. Always rendered at the
// very bottom of every Aula unit; cannot be removed by the author.
function AulaStudioMark({ withRule = true }) {
  return (
    <p className={"aula-credits__mark" + (withRule ? " aula-credits__mark--rule" : "")}>
      Aula editada com <strong className="aula-credits__mark-name">Class<i style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 400 }}>Atelier</i></strong>, uma ferramenta de autoria de aulas interativas e pacotes SCORM, baseada integralmente no <a href="https://luislindner.github.io/lumeauthor/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>LumeAuthor</a>, ferramenta de autoria SCORM criada por Luís Lindner, e evoluída em coautoria com Rogério Bittencourt (INOVALAB - IFSC).
    </p>
  );
}
function CCGlyph({ kind }) {
  // Compact circular CC marks rendered as text labels for fidelity without external assets.
  const labels = { cc: "CC", by: "BY", nc: "NC", sa: "SA" };
  return (
    <span className="aula-credits__cc-chip">{labels[kind]}</span>
  );
}

// ════════════════════════════════════════════════════════════
// EXPORTS — expõe tudo no window para os demais scripts Babel
// (lesson-content, builder, export) usarem.
// ════════════════════════════════════════════════════════════
Object.assign(window, {
  // infra
  Icon, PDFContext, usePDF,
  // chrome
  TopBar, ProgressBar, Sumario,
  // layout
  LessonHero, Prose, FullBleedSection, Sintese, ChapterDivider, Eyebrow,
  // callouts & voz
  Destaque, Atencao, Reflexao, Citacao, PitacoDo, Termo, PDFGlossary,
  // mídia
  ImagemLegenda, VideoYouTube, AudioPodcast, ExternalEmbed, ParallaxImage,
  Filmstrip, FilmstripHero, FilmstripCard, RecursoLink,
  // interativos
  FlashCard, FlashCardDeck, Slider, Accordion, Quiz, Columns, CollapsibleSection, SectionSlider,
  LinhaDoTempo, TimelineEvent,
  // dados & conteúdo
  Tabela, CaseCards, FeatureGrid, MateriaisExtras,
  ReferenciasABNT, TextoImagem,
  // fechamento
  LessonComplete, CreditsFooter, AulaStudioMark,
});
