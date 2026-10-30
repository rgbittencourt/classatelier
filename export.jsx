/* eslint-disable */
// ClassAtelier — export the authored lesson as HTML and SCORM packages.
// The exported file embeds the lesson data + the real kit components and
// renders with LessonRenderer in "preview" mode — so the output IS a Aula
// lesson (interactive, SCORM-ready, PDF-capable), not a flattened copy.

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Falha ao carregar " + url);
  return await r.text();
}

// Any inlined JS/JSON may itself contain the literal sequence "</script>"
// (e.g. usage examples in comments). Neutralise it so it doesn't close the
// host <script> tag early and break the whole file.
function safeInline(s) {
  return String(s || "").replace(/<\/(script)/gi, "<\\/$1");
}

// List the font files referenced by fonts/fonts.css (url(./Name.woff2)).
function fontFileList(fontsCss) {
  const out = [];
  const re = /url\(\s*['"]?\.\/([^)'"]+)['"]?\s*\)/g;
  let m;
  while ((m = re.exec(fontsCss))) { if (out.indexOf(m[1]) === -1) out.push(m[1]); }
  return out;
}
function fontMime(name) {
  if (/\.woff2$/i.test(name)) return "font/woff2";
  if (/\.woff$/i.test(name)) return "font/woff";
  if (/\.ttf$/i.test(name)) return "font/ttf";
  if (/\.otf$/i.test(name)) return "font/otf";
  return "application/octet-stream";
}
function assetMime(name) {
  if (/\.svg$/i.test(name)) return "image/svg+xml";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.gif$/i.test(name)) return "image/gif";
  return "application/octet-stream";
}
async function fetchBase64(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
// Rewrite fonts.css so every url(./X) becomes a base64 data: URL (self-contained).
async function inlineFontsCss(fontsDir) {
  const cssText = await fetchText(fontsDir + "fonts.css");
  const files = fontFileList(cssText);
  let out = cssText;
  for (const f of files) {
    const b64 = await fetchBase64(fontsDir + f);
    const dataUrl = `data:${fontMime(f)};base64,${b64}`;
    out = out.split("./" + f).join(dataUrl);
  }
  return out;
}

async function loadThemeAssets(theme, base) {
  return await Promise.all(((theme && theme.assets) || []).map(async (path) => {
    const response = await fetch(base + path);
    if (!response.ok) throw new Error("Falha ao carregar " + path);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return { path, buffer, dataUrl: `data:${assetMime(path)};base64,${btoa(binary)}` };
  }));
}

function rewriteThemeAssets(source, assets, mode) {
  let out = source;
  assets.forEach((asset) => {
    const replacement = mode === "external" ? asset.path : asset.dataUrl;
    ["../../" + asset.path, "../" + asset.path, asset.path].forEach((ref) => {
      out = out.split(ref).join(replacement);
    });
  });
  return out;
}

// Inline the kit so the exported file is self-contained and offline-capable.
// opts.fonts: "embed"  → fonts as base64 inside the HTML (single-file export)
//             "external" → keep @import url("fonts/fonts.css") (SCORM: fonts/ in zip)
// Bibliotecas que vão DENTRO dos pacotes .zip (pasta vendor/), para a aula abrir sem internet.
const VENDOR_FILES = [
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  "vendor/babel.min.js",
  "vendor/fontawesome/css/all.min.css",
  "vendor/fontawesome/webfonts/fa-brands-400.woff2",
  "vendor/fontawesome/webfonts/fa-regular-400.woff2",
  "vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "vendor/fontawesome/webfonts/fa-v4compatibility.woff2",
  // KaTeX (bloco Equação): só entra no pacote quando a aula tem equação
  "vendor/katex/katex.min.css",
  "vendor/katex/katex.min.js",
  ...["AMS-Regular","Caligraphic-Bold","Caligraphic-Regular","Fraktur-Bold","Fraktur-Regular","Main-Bold","Main-BoldItalic","Main-Italic","Main-Regular","Math-BoldItalic","Math-Italic","SansSerif-Bold","SansSerif-Italic","SansSerif-Regular","Script-Regular","Size1-Regular","Size2-Regular","Size3-Regular","Size4-Regular","Typewriter-Regular"].map((n) => "vendor/katex/fonts/KaTeX_" + n + ".woff2"),
];
const KATEX_VERSION = "0.19.1";
const KATEX_CDN_CSS = { href: "https://unpkg.com/katex@" + KATEX_VERSION + "/dist/katex.min.css", integrity: "sha384-WwGtaC6ywCHxA5cstpj/3+xIZvTez8dq2IcBQaXRkenHZ7FVVq1ZROtURwfbtTlG" };
const KATEX_CDN_JS = { src: "https://unpkg.com/katex@" + KATEX_VERSION + "/dist/katex.min.js", integrity: "sha384-a1WQdjRj162i159OYq041X6I4K8NenkrI09LlPmiHg0YOb7CR+wJOraXwK9abpnE" };
function lessonUsesMath(lesson) { return !!(window.listEquations && window.listEquations((lesson && lesson.blocks) || []).length); }
async function buildExportHTML(lesson, opts = {}) {
  const fontsMode = opts.fonts || "embed";
  // Pacote .zip (fontes externas) → bibliotecas locais em vendor/. Arquivo único → CDN (senão passaria de 3 MB).
  const localLibs = opts.vendor ? opts.vendor === "local" : fontsMode === "external";
  // Tema ativo (themes.js) decide O QUE carregar. base = raiz do projeto.
  const theme = window.AULA_ACTIVE_THEME || (window.resolveAulaTheme ? window.resolveAulaTheme() : null);
  const base = window.AULA_BASE != null ? window.AULA_BASE : "../";
  const kit = base + (theme ? theme.kit : "ui_kits/scorm_lesson/");
  const cssPath    = base + (theme ? theme.css : "colors_and_type.css");
  const fontsDir   = base + (theme ? theme.fontsDir : "fonts/");
  const compFiles  = (theme && theme.components) || ["components.jsx"];
  const globalFiles = (theme && theme.globals) || ["glossario.js"];
  const imgSlotFile = (theme && theme.imageSlot) || "image-slot.js";
  const scormFile   = (theme && theme.scorm) || "scorm.js";
  const pdfCssFile  = (theme && theme.pdfCss) || "aula-pdf.css";

  const [css, imgSlot, scorm, pdfCss, compBaseCss, compThemeCss] = await Promise.all([
    fetchText(cssPath),
    fetchText(kit + imgSlotFile),
    fetchText(kit + scormFile).catch(() => ""),
    fetchText(kit + pdfCssFile).catch(() => ""),
    // Anatomia dos componentes: defaults Aula + overrides do tema (cascata).
    theme && theme.componentsBase ? fetchText(base + theme.componentsBase).catch(() => "") : Promise.resolve(""),
    theme && theme.componentsCss ? fetchText(base + theme.componentsCss).catch(() => "") : Promise.resolve(""),
  ]);
  // Componentes (Babel) e globais clássicos: listas vindas do tema.
  const assetMode = opts.assets || (fontsMode === "external" ? "external" : "embed");
  const themeAssets = await loadThemeAssets(theme, base);
  const compSources = (await Promise.all(compFiles.map((f) => fetchText(kit + f))))
    .map((source) => rewriteThemeAssets(source, themeAssets, assetMode));
  const globalSources = (await Promise.all(globalFiles.map((f) => fetchText(base + f).catch(() => ""))))
    .map((source) => rewriteThemeAssets(source, themeAssets, assetMode));

  // Handle the fonts @import in colors_and_type.css per mode.
  const importRe = /@import\s+url\(['"]?\.?\/?fonts\/fonts\.css['"]?\);?/g;
  let cssClean, fontStyle = "";
  if (fontsMode === "external") {
    // SCORM: keep the @import; the zip ships fonts/fonts.css + the woff2/ttf files.
    cssClean = css;
  } else {
    // Single-file: strip the @import and inject a base64-embedded @font-face block.
    cssClean = css.replace(importRe, "/* fonts embedded below */");
    try { fontStyle = await inlineFontsCss(fontsDir); }
    catch (e) { fontStyle = ""; /* fall back to system fonts if embedding fails */ }
  }

  const data = JSON.stringify(lesson);
  const usesFontAwesome = !!(theme && theme.usesFontAwesome);
  const usesMath = lessonUsesMath(lesson);
  const forcePDF = opts.pdf === true;
  const forceAutoPrint = opts.autoPrint === true;

  return `<!doctype html>
<html lang="pt-BR" data-theme="${theme ? theme.id : "aula"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(lesson.meta?.title || "Aula")}</title>
${usesMath ? (localLibs ? '<link rel="stylesheet" href="vendor/katex/katex.min.css" />' : `<link rel="stylesheet" href="${KATEX_CDN_CSS.href}" integrity="${KATEX_CDN_CSS.integrity}" crossorigin="anonymous" />`) : ""}
${usesFontAwesome ? (localLibs ? '<link rel="stylesheet" href="vendor/fontawesome/css/all.min.css" />' : '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" referrerpolicy="no-referrer" />') : ""}
<style>
${fontStyle}
</style>
<style>
${cssClean}
</style>
<style>
/* anatomia dos componentes — defaults Aula + overrides do tema */
${compBaseCss}
${compThemeCss}
</style>
<style>
${pdfCss}
</style>
</head>
<body>
<button id="aula-print-button" type="button" data-pdf-hide aria-label="Imprimir versão PDF" title="Imprimir versão PDF" style="position:fixed;right:20px;bottom:20px;z-index:9999;width:48px;height:48px;border:0;border-radius:50%;display:grid;place-items:center;background:var(--ink);color:var(--paper);box-shadow:0 8px 28px rgba(0,0,0,.22);cursor:pointer;font:600 20px/1 sans-serif">&#128424;</button>
<div id="app-root"></div>

${usesMath ? (localLibs ? '<script src="vendor/katex/katex.min.js"><\/script>' : `<script src="${KATEX_CDN_JS.src}" integrity="${KATEX_CDN_JS.integrity}" crossorigin="anonymous"><\/script>`) : ""}
${localLibs ? `<script src="vendor/react.production.min.js"><\/script>
<script src="vendor/react-dom.production.min.js"><\/script>
<script src="vendor/babel.min.js"><\/script>` : `<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"><\/script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"><\/script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"><\/script>`}

<script>
${safeInline(imgSlot)}
<\/script>
<script>
${safeInline(scorm)}
<\/script>
${globalSources.map((g) => `<script>
${safeInline(g)}
<\/script>`).join("\n")}

<script>
window.AULA_ACTIVE_THEME = ${safeInline(JSON.stringify(theme || {}))};
<\/script>

${compSources.map((c) => `<script type="text/babel" data-presets="react">
${safeInline(c)}
<\/script>`).join("\n")}

<script type="application/json" id="aula-lesson">
${safeInline(data)}
<\/script>

<script type="text/babel" data-presets="react">
${RENDERER_SRC}

const lesson = JSON.parse(document.getElementById("aula-lesson").textContent);
const printParams = new URLSearchParams(location.search);
const isPDF = ${forcePDF ? "true" : "false"} || printParams.has("pdf");
const shouldAutoPrint = ${forceAutoPrint ? "true" : "false"} || printParams.has("print");
if (isPDF) document.documentElement.setAttribute("data-pdf", "");
ReactDOM.createRoot(document.getElementById("app-root")).render(
  React.createElement(ExportedLesson, { lesson: lesson, pdf: isPDF })
);

function waitForPrintableAssets() {
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const images = Array.from(document.images).map(function (img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function (resolve) {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  });
  return Promise.all([fonts].concat(images)).then(function () {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { setTimeout(resolve, 500); });
      });
    });
  });
}

function openPrintVersion() {
  const url = new URL(location.href);
  url.searchParams.set("pdf", "1");
  url.searchParams.set("print", "1");
  window.open(url.href, "_blank", "noopener");
}

const printButton = document.getElementById("aula-print-button");
if (printButton) printButton.addEventListener("click", openPrintVersion);
if (isPDF && shouldAutoPrint) waitForPrintableAssets().then(function () { window.print(); });
<\/script>
</body>
</html>`;
}

// Self-contained renderer string baked into the export (no builder deps).
const RENDERER_SRC = `
function ExportBand({ block, children }) {
  const PAD = { tight: "clamp(24px,4vw,48px)", normal: "clamp(56px,8vw,96px)", airy: "clamp(72px,10vw,128px)" };
  return React.createElement(window.FullBleedSection, { tone: block.bg, py: PAD[block.pad] || PAD.normal },
    React.createElement(window.Prose, null, children));
}
// Inner content of a block — NO band wrapper. Used at root (wrapped by
// ExportBlock) and inside a topic (compact, shared band).
function ExportCore({ block }) {
  const p = block.props, h = React.createElement, R = window;
  const html = (s) => h("div", { dangerouslySetInnerHTML: { __html: s || "" } });
  const htmlSpan = (s) => h("span", { dangerouslySetInnerHTML: { __html: s || "" } });
  const nested = (kids) => (kids||[]).length ? h("div", { className: "aula-embedded-blocks" }, (kids||[]).map((child)=>h("div", { key: child.id, className: "aula-embedded-block", "data-type": child.type }, h(ExportCore, { block: child })))) : null;
  const dropcapClass = (pp) => pp.dropcap ? ("dropcap" + (pp.dropcapTone && pp.dropcapTone !== "terracotta" ? " dropcap-" + pp.dropcapTone : "")) : undefined;
  switch (block.type) {
    case "hero": return h(R.LessonHero, { eyebrow: htmlSpan(p.eyebrow), title: htmlSpan(p.title), lead: htmlSpan(p.lead), author: p.author, authorImage: p.authorImage, readTime: p.readTime, date: p.date });
    case "divider": return h(R.ChapterDivider, { label: htmlSpan(p.label) });
    case "pagebreak": return h("div", { className: "aula-pagebreak-before aula-pagebreak-marker", "aria-hidden": "true" });
    case "collapsebreak": return null;
    case "titulo": { var Tag = p.level === "h3" ? "h3" : "h2"; return h(Tag, { style: { margin: 0 }, dangerouslySetInnerHTML: { __html: p.text || "" } }); }
    case "sintese": return h(R.Sintese, { eyebrow: htmlSpan(p.eyebrow), title: htmlSpan(p.title), tocLabel: (p.eyebrow || "").replace(/<[^>]+>/g, "") }, html(p.body));
    case "referencias": return h(R.ReferenciasABNT, { title: p.title, items: p.items });
    case "prose": {
      const inlineVideo = p.inlineVideo && p.inlineVideo.id ? h("div", { className: "aula-prose-inline-video" }, h(R.VideoYouTube, { id: p.inlineVideo.id, title: p.inlineVideo.title, caption: p.inlineVideo.caption, credit: p.inlineVideo.credit, start: p.inlineVideo.start })) : null;
      if (!inlineVideo) return h("div", { className: dropcapClass(p), dangerouslySetInnerHTML: { __html: p.body || "" } });
      return h("div", null, h("div", { className: dropcapClass(p), dangerouslySetInnerHTML: { __html: p.body || "" } }), inlineVideo);
    }
    case "eyebrow": return h(R.Eyebrow, { icon: p.icon }, htmlSpan(p.text));
    case "forum": return h(R.Forum, { storageKey: p.slotId || block.id, title: htmlSpan(p.title), prompt: html(p.prompt), dueInitial: (p.dueInitial || "").replace(/<[^>]*>/g, "").trim() ? htmlSpan(p.dueInitial) : null, dueReplies: (p.dueReplies || "").replace(/<[^>]*>/g, "").trim() ? htmlSpan(p.dueReplies) : null, rules: p.rules, showCriteria: !!p.showCriteria, criteria: html(p.criteria), href: p.href, buttonLabel: p.buttonLabel, showDraft: p.showDraft !== false });
    case "codigo": return h(R.Codigo, { code: p.code, language: p.language, title: p.title, showLineNumbers: p.showLineNumbers !== false, startLine: p.startLine, tabSize: p.tabSize, wrap: !!p.wrap, appearance: p.appearance, ariaLabel: p.ariaLabel });
    case "equacao": return h(R.Equacao, { latex: p.latex, number: htmlSpan(p.number), numberText: p.number, showNumber: p.showNumber !== false, ariaLabel: p.ariaLabel, size: p.size, autoFit: p.autoFit, framed: p.framed });
    case "citacao": return h(R.Citacao, { quote: htmlSpan(p.quote), author: htmlSpan(p.author), source: htmlSpan(p.source), showAttribution: p.showAttribution !== false });
    case "destaque": return h(R.Destaque, { title: htmlSpan(p.title), tone: p.tone, icon: p.icon }, html(p.body));
    case "atencao": return h(R.Atencao, { title: htmlSpan(p.title), tone: p.tone, icon: p.icon }, html(p.body));
    case "reflexao": return h(R.Reflexao, { title: htmlSpan(p.title), question: htmlSpan(p.question), tone: p.tone, icon: p.icon }, (p.body && p.body !== "<p></p>") ? html(p.body) : null);
    case "pitaco": return h(R.PitacoDo, { kicker: p.kicker, name: p.name, gender: p.gender, role: p.role, tone: p.tone, src: p.src, slotId: p.slotId || block.id }, html(p.body));
    case "imagem": return h(R.ImagemLegenda, { src: p.src, slotId: p.slotId || block.id, ratio: p.ratio, caption: htmlSpan(p.caption), credit: p.credit });
    case "parallax": return h(R.ParallaxImage, { src: p.src, slotId: p.slotId || block.id, height: p.height || "70vh", overlayTitle: htmlSpan(p.overlayTitle), caption: htmlSpan(p.caption), credit: p.credit });
    case "video": return h(R.VideoYouTube, { id: p.id, title: p.title, caption: p.caption, credit: p.credit, start: p.start });
    case "audio": return h(R.AudioPodcast, { spotify: p.spotify, src: p.src, title: p.title, show: p.show, description: p.description, duration: p.duration, slotId: block.id });
    case "externalembed": return h(R.ExternalEmbed, { embed: p.embed, title: p.title, responsive: p.responsive, useEmbedDimensions: p.useEmbedDimensions, width: p.width, height: p.height });
    case "cases": return h(R.CaseCards, { title: p.title, intro: p.intro, columns: p.columns, layout: p.layout, cards: (p.cards||[]).map((c,i)=>({ ...c, slotId: c.slotId || block.id+"-"+i })) });
    case "textoimagem": return h(R.TextoImagem, { ordem: p.ordem, largura: p.largura, sangria: p.sangria, src: p.src, slotId: p.slotId || block.id, fonte: p.fonte, legenda: htmlSpan(p.legenda) }, html(p.body));
    case "filmstrip": return h(R.Filmstrip, { mode: p.mode, label: p.label, ratio: p.ratio, items: (p.items||[]).map((it,i)=>({ ...it, slotId: it.slotId || block.id+"-"+i })) });
    case "tabela": return h(R.Tabela, { caption: p.caption, fonte: p.fonte, headers: p.headers, rows: p.rows, striped: p.striped, destacarPrimeira: p.destacarPrimeira, compact: p.compact });
    case "linhadotempo": return h(R.LinhaDoTempo, { title: p.title, eras: (p.eras||[]).map(function(era,ei){ return { ...era, events: (era.events||[]).map(function(ev,vi){ return { ...ev, slotId: ev.slotId || block.id+"-"+ei+"-"+vi }; }) }; }), renderBlocks: nested });
    case "feature": return h(R.FeatureGrid, { title: p.title, intro: p.intro, align: p.align, columns: p.columns, features: p.features });
    case "flashcards": return h(R.FlashCardDeck, { label: p.label || "Flashcards", cards: p.cards, sectionTone: block.bg });
    case "slider": return h(R.Slider, { label: p.label, steps: p.steps });
    case "accordion": return h(R.Accordion, { items: p.items, renderBlocks: nested });
    case "columns": return h(R.Columns, { gap: p.gap, emphasis: p.emphasis, columns: p.columns, renderBlocks: nested });
    case "quiz": return h(R.Quiz, { title: p.title, intro: p.intro, questions: p.questions, avaliativo: p.avaliativo, passMark: p.passMark });
    case "materiais": return h(R.MateriaisExtras, { title: p.title, items: p.items });
    default: return null;
  }
}
var EXPORT_FULLWIDTH = { hero: 1, divider: 1, pagebreak: 1, sintese: 1, parallax: 1 };
function ExportBlock({ block }) {
  var h = React.createElement;
  var pdf = window.usePDF();
  var state = React.useState(0), slide = state[0], setSlide = state[1];
  if (["topic", "topic-collapsible", "topic-slider"].indexOf(block.type) !== -1) {
    var kids = (block.props.children || []);
    var makeItem = function(c) { return h("div", { key: c.id, className: "aula-topic-item", "data-type": c.type }, h(ExportCore, { block: c })); };
    var items = kids.map(makeItem);
    var content = h("div", { className: "aula-topic" }, items);
    if (block.type === "topic-collapsible") {
      var marker=kids.findIndex(function(c){return c.type==="collapsebreak";}), before=marker>=0?kids.slice(0,marker):[], after=marker>=0?kids.slice(marker+1):kids;
      content=pdf
        ? h("div",{className:"aula-topic"},kids.filter(function(c){return c.type!=="collapsebreak";}).map(makeItem))
        : h(React.Fragment,null,h("div",{className:"aula-topic"},before.map(makeItem)),h("details",{className:"aula-topic-collapsible",open:block.props.defaultOpen===true},h("summary",null,h("span",null,block.props.triggerLabel||"Clique para expandir"),h("i",{className:"fa-solid fa-chevron-down"})),h("div",{className:"aula-topic"},after.map(makeItem))));
    }
    if (block.type === "topic-slider") {
      var count=kids.reduce(function(m,c){return Math.max(m,Number(c.slide)||0);},0)+1;
      if (pdf) {
        content=h("div",{className:"aula-topic-slider is-print"},Array.from({length:count},function(_,slideIndex){return h("section",{className:"aula-topic-slider__print-slide",key:slideIndex},h("div",{className:"aula-topic"},kids.filter(function(c){return (Number(c.slide)||0)===slideIndex;}).map(makeItem)));}));
      } else {
        var current=Math.min(slide,count-1), visible=kids.filter(function(c){return (Number(c.slide)||0)===current;}).map(makeItem), go=function(delta){setSlide(function(v){return block.props.loop===false?Math.max(0,Math.min(count-1,v+delta)):(v+delta+count)%count;});};
        content=h("div",{className:"aula-topic-slider"},h("div",{className:"aula-topic-slider__viewport"},h("div",{className:"aula-topic"},visible)),count>1?h(React.Fragment,null,h("button",{className:"aula-topic-slider__arrow is-prev",disabled:block.props.loop===false&&current===0,onClick:function(){go(-1);},"aria-label":"Slide anterior"},"←"),h("button",{className:"aula-topic-slider__arrow is-next",disabled:block.props.loop===false&&current===count-1,onClick:function(){go(1);},"aria-label":"Próximo slide"},"→"),h("div",{className:"aula-topic-slider__nav"},h("div",null,Array.from({length:count},function(_,i){return h("button",{key:i,className:i===current?"is-active":"",onClick:function(){setSlide(i);},"aria-label":"Ir para slide "+(i+1)});})),h("span",null,(current+1)+" / "+count))):null);
      }
    }
    return h(ExportBand, { block },
      content
    );
  }
  if (EXPORT_FULLWIDTH[block.type]) return h(ExportCore, { block: block });
  return h(ExportBand, { block }, h(ExportCore, { block: block }));
}
function ExportedLesson({ lesson, pdf }) {
  const h = React.createElement, R = window;
  const blocks = (lesson.blocks||[]).map((b) => h(ExportBlock, { key: b.id, block: b }));
  const m = lesson.meta || {};
  return h(R.PDFContext.Provider, { value: !!pdf },
    h("main", { id: "app" },
      h(R.ProgressBar, null),
      h(R.Sumario, null),
      blocks,
      pdf ? h(R.FullBleedSection, { tone: "paper", py: "24px" }, h(R.Prose, null, h(R.PDFGlossary, null))) : null,
      (!pdf && m.showComplete !== false) ? h(R.FullBleedSection, { tone: "sand", py: "clamp(48px,7vw,88px)" }, h(R.Prose, null, h(R.LessonComplete, null))) : null,
      h(R.CreditsFooter, { author: m.author, role: m.role, institution: m.institution, year: m.year, aiTool: m.aiTool, aiUse: m.aiUse, licenseHref: m.license })
    )
  );
}
`;

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function lessonSlug(title) {
  return (title || "classatelier").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "classatelier";
}

// Nome do arquivo de projeto: Semana01-titulo-da-aula-ClassAtelier.json (sem título, "aula").
// Curso organizado por aulas no ClassAuthor (meta.unit "aula"): Aula01-titulo-ClassAtelier.json.
function projectFileName(lesson, fallbackNumber) {
  const m = (lesson && lesson.meta) || {};
  let n = Number(m.weekNumber) || 0;
  const unitPrefix = m.unit === "aula" || /^aula\b/i.test(String(m.weekLabel || "")) ? "Aula" : "Semana";
  if (!n) { const found = /(?:semana|aula)\s*0*(\d+)/i.exec((m.weekLabel || "") + " " + (m.title || "")); if (found) n = Number(found[1]); }
  if (!n && fallbackNumber) n = Number(fallbackNumber) || 0;
  let slug = m.title ? lessonSlug(m.title) : "";
  slug = slug.replace(/^(?:semana|aula)-0*\d+-?/, "");
  if (slug.length > 60) slug = slug.slice(0, 60).replace(/-[^-]*$/, "") || slug.slice(0, 60);
  slug = slug.replace(/(-(de|da|do|das|dos|em|na|no|nas|nos|e|a|o|as|os|para|com|por|que|um|uma))+$/, "").replace(/-$/, "") || "aula";
  return (n ? unitPrefix + String(n).padStart(2, "0") + "-" : "") + slug + "-ClassAtelier.json";
}

function addProjectFile(zip, lesson, packagedFiles) {
  const path = projectFileName(lesson);
  zip.file(path, JSON.stringify(lesson, null, 2));
  if (packagedFiles) packagedFiles.push(path);
  return path;
}

async function downloadExport(lesson) {
  if (typeof JSZip === "undefined") throw new Error("Biblioteca de compactação (JSZip) não carregou.");
  const L = JSON.parse(JSON.stringify(lesson));
  const lessonImageAssets = externalizeLessonImages(L);
  const html = await buildExportHTML(L, { fonts: "external", assets: "external" });
  const zip = new JSZip();
  zip.file("index.html", html);
  addProjectFile(zip, lesson);
  lessonImageAssets.forEach((asset) => zip.file(asset.path, asset.base64, { base64: true }));
  await addPackageSupportFiles(zip, undefined, [lesson]);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const name = lessonSlug(lesson.meta?.title);
  a.href = url; a.download = (name || "classatelier") + "-html.zip";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Download a single, self-contained HTML file for opening directly in a
// browser or attaching to a site that does not accept a ZIP package. Fonts
// and theme assets are embedded; remote media links remain remote by design.
async function downloadStandaloneHTML(lesson) {
  const L = JSON.parse(JSON.stringify(lesson));
  const html = await buildExportHTML(L, { fonts: "embed", assets: "embed" });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = lessonSlug(lesson.meta?.title) + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function openPrintPreview(lesson) {
  const target = window.open("about:blank", "_blank");
  if (!target) throw new Error("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
  try {
    target.document.write("<!doctype html><title>Preparando PDF…</title><p style='font:16px sans-serif;padding:24px'>Preparando versão para impressão…</p>");
    const html = await buildExportHTML(lesson, { pdf: true, autoPrint: true, fonts: "embed", assets: "embed" });
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    target.location.replace(url);
    setTimeout(() => URL.revokeObjectURL(url), 300000);
  } catch (error) {
    target.close();
    throw error;
  }
}

// ── SCORM packaging ──────────────────────────────────────────
// Wraps the exported lesson HTML as index.html inside a .zip with an
// imsmanifest.xml so it can be uploaded to an LMS as a SCORM package.
function xmlEscape(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

// In a ZIP package, user-uploaded data URLs can become ordinary files. This
// keeps index.html small and makes the assets inspectable/reusable by authors.
function externalizeLessonImages(lesson, prefix) {
  const assets = [];
  const known = new Map();
  const extensions = { jpeg: "jpg", jpg: "jpg", png: "png", webp: "webp", gif: "gif", avif: "avif", svg: "svg" };
  const visit = (value) => {
    if (typeof value === "string") {
      const match = value.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/s);
      if (!match) return value;
      if (known.has(value)) return known.get(value);
      const subtype = match[1].toLowerCase().replace("svg+xml", "svg");
      const ext = extensions[subtype] || "bin";
      const path = `assets/images/${prefix || ""}image-${String(assets.length + 1).padStart(3, "0")}.${ext}`;
      assets.push({ path, base64: match[2] });
      known.set(value, path);
      return path;
    }
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      Object.keys(value).forEach((key) => { value[key] = visit(value[key]); });
    }
    return value;
  };
  visit(lesson);
  return assets;
}

async function addPackageSupportFiles(zip, packagedFiles, lessons) {
  const files = packagedFiles || [];
  const usesMath = (lessons || []).some(lessonUsesMath);
  const theme = window.AULA_ACTIVE_THEME || (window.resolveAulaTheme ? window.resolveAulaTheme() : null);
  const base = window.AULA_BASE != null ? window.AULA_BASE : "../";
  const themeAssets = await loadThemeAssets(theme, base);
  themeAssets.forEach((asset) => {
    zip.file(asset.path, asset.buffer);
    files.push(asset.path);
  });
  try {
    const fontsDir = base + (theme ? theme.fontsDir : "fonts/");
    const fontsCss = await fetchText(fontsDir + "fonts.css");
    zip.file("fonts/fonts.css", fontsCss);
    files.push("fonts/fonts.css");
    const fontFiles = fontFileList(fontsCss);
    await Promise.all(fontFiles.map(async (file) => {
      const buffer = await (await fetch(fontsDir + file)).arrayBuffer();
      zip.file("fonts/" + file, buffer);
      files.push("fonts/" + file);
    }));
  } catch (e) { /* packages still work with system fonts */ }
  // bibliotecas locais (React, Babel, Font Awesome): sem elas a aula não abre offline
  const usesFA = !!(theme && theme.usesFontAwesome);
  for (const f of VENDOR_FILES) {
    if (!usesFA && f.includes("fontawesome")) continue;
    if (!usesMath && f.includes("katex")) continue;
    const res = await fetch(base + f);
    if (!res.ok) throw new Error("Biblioteca não encontrada para o pacote: " + f);
    zip.file(f, await res.arrayBuffer());
    files.push(f);
  }
  return files;
}

function buildManifest(opts) {
  const title = xmlEscape(opts.title || "Aula");
  const id = "AULA_" + Math.random().toString(36).slice(2, 9).toUpperCase();
  const mastery = opts.avaliativo ? Number(opts.passMark) || 0 : null;
  const files = (opts.files || ["index.html"]).map((path) => `      <file href="${xmlEscape(path)}"/>`).join("\n");

  if (opts.version === "2004") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata>
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>${title}</title>
      <item identifier="ITEM1" identifierref="RES1"><title>${title}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" adlcp:scormType="sco" href="index.html">
${files}
    </resource>
  </resources>
</manifest>`;
  }

  // SCORM 1.2 (default, the most widely compatible)
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>${title}</title>
      <item identifier="ITEM1" identifierref="RES1" isvisible="true">
        <title>${title}</title>${mastery != null ? `\n        <adlcp:masteryscore>${mastery}</adlcp:masteryscore>` : ""}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${files}
    </resource>
  </resources>
</manifest>`;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function downloadSCORM(lesson, opts) {
  const { blob, name } = await buildSCORMBlob(lesson, opts);
  saveBlob(blob, (name || "classatelier") + "-scorm.zip");
}
// Monta o pacote em memória (para baixar ou para conferir antes).
async function buildSCORMBlob(lesson, opts) {
  if (typeof JSZip === "undefined") throw new Error("Biblioteca de compactação (JSZip) não carregou.");
  // If marked avaliativo, ensure every quiz reports its grade (0–10).
  const L = JSON.parse(JSON.stringify(lesson));
  L.meta = L.meta || {};
  if (opts.title) L.meta.title = opts.title;
  const lessonBlocks = L.blocks.flatMap((b) => ["topic","topic-collapsible","topic-slider"].indexOf(b.type) !== -1 ? [b].concat(b.props.children || []) : [b]);
  const finalQuizzes = lessonBlocks.filter((b) => b.type === "quiz" && b.props.avaliativo);
  if (finalQuizzes.length > 1) {
    throw new Error("Mantenha apenas um quiz marcado como avaliação final.");
  }
  if (opts.avaliativo) {
    finalQuizzes.forEach((quiz) => { quiz.props.passMark = Number(opts.passMark) || 0; });
  }
  const projectLesson = JSON.parse(JSON.stringify(L));
  const lessonImageAssets = externalizeLessonImages(L);
  const html = await buildExportHTML(L, { fonts: "external", assets: "external" });

  const zip = new JSZip();
  zip.file("index.html", html);
  const packagedFiles = ["index.html"];
  addProjectFile(zip, projectLesson, packagedFiles);

  lessonImageAssets.forEach((asset) => {
    zip.file(asset.path, asset.base64, { base64: true });
    packagedFiles.push(asset.path);
  });

  await addPackageSupportFiles(zip, packagedFiles, [lesson]);

  zip.file("imsmanifest.xml", buildManifest({ ...opts, files: packagedFiles }));

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, name: lessonSlug(opts.title) };
}

// ── Curso completo: um único pacote SCORM com uma aula (SCO) por semana ──
function buildCourseManifest(opts) {
  const title = xmlEscape(opts.title || "Curso");
  const id = "CURSO_" + Math.random().toString(36).slice(2, 9).toUpperCase();
  const is2004 = opts.version === "2004";
  const fileTags = (files) => files.map((path) => `      <file href="${xmlEscape(path)}"/>`).join("\n");
  const items = opts.items.map((it, i) => `      <item identifier="ITEM${i + 1}" identifierref="RES${i + 1}"${is2004 ? "" : ' isvisible="true"'}>
        <title>${xmlEscape(it.title)}</title>${!is2004 && it.mastery != null ? `\n        <adlcp:masteryscore>${it.mastery}</adlcp:masteryscore>` : ""}
      </item>`).join("\n");
  const resources = opts.items.map((it, i) => `    <resource identifier="RES${i + 1}" type="webcontent" adlcp:scorm${is2004 ? "Type" : "type"}="sco" href="${xmlEscape(it.href)}">
${fileTags(it.files.concat(opts.shared))}
    </resource>`).join("\n");
  const head = is2004
    ? `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>`;
  return `${head}
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>${title}</title>
${items}
    </organization>
  </organizations>
  <resources>
${resources}
  </resources>
</manifest>`;
}

async function downloadCourseSCORM(lessons, opts) {
  const { blob, name } = await buildCourseSCORMBlob(lessons, opts);
  saveBlob(blob, (name || "curso") + "-scorm.zip");
}
async function buildCourseSCORMBlob(lessons, opts) {
  if (typeof JSZip === "undefined") throw new Error("Biblioteca de compactação (JSZip) não carregou.");
  if (!lessons || !lessons.length) throw new Error("Escolha pelo menos uma aula.");
  const zip = new JSZip();
  const items = [];
  for (let i = 0; i < lessons.length; i++) {
    const n = String(i + 1).padStart(2, "0");
    const L = JSON.parse(JSON.stringify(lessons[i]));
    L.meta = L.meta || {};
    const label = L.meta.title || "Aula " + n;
    const flat = (L.blocks || []).flatMap((b) => ["topic", "topic-collapsible", "topic-slider"].indexOf(b.type) !== -1 ? [b].concat(b.props.children || []) : [b]);
    const finals = flat.filter((b) => b.type === "quiz" && b.props.avaliativo);
    if (finals.length > 1) throw new Error("A aula «" + label + "» tem mais de um quiz marcado como avaliação final. Mantenha apenas um.");
    const mastery = finals.length ? (Number(finals[0].props.passMark) || 6) : null;
    const projectLesson = JSON.parse(JSON.stringify(L));
    const images = externalizeLessonImages(L, "aula-" + n + "-");
    const html = await buildExportHTML(L, { fonts: "external", assets: "external" });
    const href = "aula-" + n + ".html";
    const files = [href];
    zip.file(href, html);
    const projectPath = "projetos/" + projectFileName(L, Number(n));
    zip.file(projectPath, JSON.stringify(projectLesson, null, 2));
    files.push(projectPath);
    images.forEach((a) => { zip.file(a.path, a.base64, { base64: true }); files.push(a.path); });
    items.push({ title: label, href, files, mastery });
  }
  const shared = await addPackageSupportFiles(zip, [], lessons);
  zip.file("imsmanifest.xml", buildCourseManifest({ title: opts.title, version: opts.version, items, shared }));
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, name: lessonSlug(opts.title) };
}

// ── Site do curso (GitHub Pages): aula-01.html, aula-02.html… + índice, com endereços estáveis ──
async function buildCourseSiteFiles(lessons, opts) {
  if (!lessons || !lessons.length) throw new Error("Escolha pelo menos uma aula.");
  const zip = { files: [], file(path, data, o) { this.files.push({ path, data, base64: !!(o && o.base64) }); } };
  const entries = [];
  for (let i = 0; i < lessons.length; i++) {
    const n = String(i + 1).padStart(2, "0");
    const L = JSON.parse(JSON.stringify(lessons[i]));
    L.meta = L.meta || {};
    const label = L.meta.title || "Aula " + n;
    const projectLesson = JSON.parse(JSON.stringify(L));
    const images = externalizeLessonImages(L, "aula-" + n + "-");
    const html = await buildExportHTML(L, { fonts: "external", assets: "external" });
    zip.file("aula-" + n + ".html", html);
    zip.file("projetos/" + projectFileName(L, Number(n)), JSON.stringify(projectLesson, null, 2));
    images.forEach((a) => zip.file(a.path, a.base64, { base64: true }));
    entries.push({ n, label, href: "aula-" + n + ".html" });
  }
  await addPackageSupportFiles(zip, [], lessons);
  const title = opts.title || "Curso";
  const list = entries.map((e) => `<li><a href="${xmlEscape(e.href)}"><span>${e.n}</span><strong>${xmlEscape(e.label)}</strong><i aria-hidden="true">→</i></a></li>`).join("\n");
  zip.file("index.html", `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xmlEscape(title)}</title><link rel="stylesheet" href="fonts/fonts.css">
<style>
:root{--ink:#1b1a17;--muted:#6b6558;--paper:#fbf6ee;--line:#e5dccb;--accent:#bf4c34}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 Geist,system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:56px 22px 40px}
.eyebrow{margin:0 0 10px;font:600 12px/1 Geist,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
h1{margin:0 0 28px;font:500 clamp(30px,6vw,46px)/1.05 Newsreader,Georgia,serif;letter-spacing:-.02em}
ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
a{display:flex;align-items:center;gap:14px;padding:16px 18px;border:1px solid var(--line);border-radius:12px;background:#fff;color:inherit;text-decoration:none;transition:border-color .15s,transform .15s}
a:hover{border-color:var(--accent);transform:translateY(-1px)}a span{font:600 13px/1 Geist,system-ui,sans-serif;color:var(--accent);min-width:24px}
a strong{flex:1;font-weight:600}a i{font-style:normal;color:var(--muted)}
footer{margin-top:36px;font-size:12.5px;color:var(--muted)}
</style></head><body><main>
<p class="eyebrow">Curso</p><h1>${xmlEscape(title)}</h1>
<ol>
${list}
</ol>
<footer>Montado com ClassAtelier · INOVALAB - IFSC</footer>
</main></body></html>`);
  zip.file(".nojekyll", "");
  zip.file("LEIA-ME.md", `# ${title}

Site do curso, pronto para publicar no GitHub Pages.

## Publicar
1. Crie um repositório no GitHub (por exemplo \`${/^curso/.test(lessonSlug(title)) ? lessonSlug(title) : "curso-" + lessonSlug(title)}\`) e envie **todos** os arquivos desta pasta para a raiz dele.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch \`main\` e pasta \`/ (root)\`.
3. Em alguns minutos o site fica em \`https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/\`.

## Links para o Moodle
- Página do curso: \`.../index.html\`
${entries.map((e) => `- ${e.label}: \`.../${e.href}\``).join("\n")}

No Moodle, adicione cada link como recurso **URL** (ou incorpore em uma Página/Etiqueta com iframe).

## Atualizar
Gere o pacote de novo no ClassAtelier e substitua os arquivos no repositório. Os endereços (\`aula-01.html\`, \`aula-02.html\`…) seguem a **ordem das aulas**: mantendo a ordem, os links no Moodle continuam valendo.

A pasta \`projetos/\` guarda o arquivo \`SemanaNN-título-ClassAtelier.json\` de cada aula, para reabrir e editar no ClassAtelier.
`);
  return zip.files;
}

async function downloadCourseSite(lessons, opts) {
  if (typeof JSZip === "undefined") throw new Error("Biblioteca de compactação (JSZip) não carregou.");
  const files = await buildCourseSiteFiles(lessons, opts);
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.path, f.data, f.base64 ? { base64: true } : undefined));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (lessonSlug(opts.title || "") || "curso") + "-site.zip";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ── Publicação direta no GitHub (API REST, a partir do navegador) ──
// O token digitado pelo professor vai só para api.github.com. Um único commit atualiza o site inteiro.
function ghFriendly(status, data, path) {
  const msg = (data && data.message) || "";
  if (status === 401) return "O GitHub não aceitou o token (inválido, expirado ou digitado com espaço sobrando).";
  if (status === 403 && /rate limit/i.test(msg)) return "O GitHub pediu uma pausa por excesso de requisições. Tente de novo em alguns minutos.";
  if (status === 403) return "O token não tem permissão para isso. Ele precisa de \"Contents: Read and write\" neste repositório (e \"Pages: Read and write\" para ligar o site).";
  if (status === 404) return "Não encontrei o repositório ou o token não enxerga ele. Confira o nome (conta/repositório) e se o token foi liberado para esse repositório.";
  if (status === 409) return "O GitHub recusou por conflito (" + msg + "). Tente publicar de novo.";
  if (status === 422) return "O GitHub recusou os dados enviados: " + msg;
  return "Erro do GitHub (" + status + ") em " + path + (msg ? ": " + msg : "") + ".";
}
async function ghApi(token, method, path, body) {
  const res = await fetch("https://api.github.com" + path, {
    method,
    headers: Object.assign({ Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28" }, body ? { "Content-Type": "application/json" } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error(ghFriendly(res.status, data, path)); err.status = res.status; err.data = data; throw err; }
  return data;
}
function toBytes(f) {
  if (f.base64) { const bin = atob(f.data); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  if (typeof f.data === "string") return new TextEncoder().encode(f.data);
  return new Uint8Array(f.data);
}
function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function gitBlobSha(bytes) {
  const head = new TextEncoder().encode("blob " + bytes.length + "\0");
  const all = new Uint8Array(head.length + bytes.length); all.set(head); all.set(bytes, head.length);
  const digest = await crypto.subtle.digest("SHA-1", all);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function publishCourseToGitHub(lessons, opts, onProgress) {
  const say = (m) => { try { onProgress && onProgress(m); } catch (e) {} };
  const token = String(opts.token || "").trim();
  const owner = String(opts.owner || "").trim().replace(/^@/, "");
  const repo = String(opts.repo || "").trim().replace(/\.git$/, "");
  const branchWanted = String(opts.branch || "").trim() || "main";
  const folder = String(opts.folder || "").trim().replace(/^\/+|\/+$/g, "");
  if (!token) throw new Error("Cole o token de acesso do GitHub.");
  if (!owner || !repo) throw new Error("Informe a conta (ou organização) e o nome do repositório.");
  if (!/^[A-Za-z0-9._-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo)) throw new Error("Conta e repositório só podem ter letras, números, ponto, hífen e sublinhado.");
  if (folder && !/^[A-Za-z0-9._\/-]+$/.test(folder)) throw new Error("O nome da pasta só pode ter letras, números, ponto, hífen, sublinhado e barra.");

  say("Montando os arquivos do site…");
  const files = await buildCourseSiteFiles(lessons, opts);

  say("Conferindo o repositório…");
  let info;
  try { info = await ghApi(token, "GET", `/repos/${owner}/${repo}`); }
  catch (e) {
    if (e.status === 404 && opts.createRepo) {
      say("Criando o repositório…");
      const me = await ghApi(token, "GET", "/user");
      if (me.login.toLowerCase() !== owner.toLowerCase()) throw new Error("Só consigo criar o repositório na sua própria conta (" + me.login + "). Para uma organização, crie o repositório no GitHub e tente de novo.");
      info = await ghApi(token, "POST", "/user/repos", { name: repo, description: "Curso publicado com o ClassAtelier", private: false, auto_init: true });
    } else throw e;
  }
  if (info.permissions && info.permissions.push === false) throw new Error("O token enxerga o repositório, mas não pode escrever nele (precisa de \"Contents: Read and write\").");
  const defaultBranch = info.default_branch || "main";
  const branch = branchWanted;

  // commit de partida (cria a branch se faltar; inicia o repositório se estiver vazio)
  const getRef = async (b) => { try { return await ghApi(token, "GET", `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(b).replace(/%2F/g, "/")}`); } catch (e) { if (e.status === 404 || e.status === 409) return null; throw e; } };
  let ref = await getRef(branch);
  if (!ref) {
    let base = await getRef(defaultBranch);
    if (!base) {
      say("Iniciando o repositório vazio…");
      await ghApi(token, "PUT", `/repos/${owner}/${repo}/contents/.nojekyll`, { message: "Inicia o repositório (ClassAtelier)", content: "", branch: defaultBranch });
      base = await getRef(defaultBranch);
    }
    if (branch !== defaultBranch) {
      await ghApi(token, "POST", `/repos/${owner}/${repo}/git/refs`, { ref: "refs/heads/" + branch, sha: base.object.sha });
    }
    ref = await getRef(branch);
  }
  const headSha = ref.object.sha;
  const headCommit = await ghApi(token, "GET", `/repos/${owner}/${repo}/git/commits/${headSha}`);
  let existing = new Map();
  try {
    const tree = await ghApi(token, "GET", `/repos/${owner}/${repo}/git/trees/${headCommit.tree.sha}?recursive=1`);
    if (!tree.truncated) (tree.tree || []).forEach((t) => { if (t.type === "blob") existing.set(t.path, t.sha); });
  } catch (e) { existing = new Map(); }

  // só envia o que mudou
  const entries = [];
  let done = 0, sent = 0;
  const prefix = folder ? folder + "/" : "";
  for (const f of files) {
    const bytes = toBytes(f);
    const path = prefix + f.path;
    const sha = await gitBlobSha(bytes);
    done++;
    if (existing.get(path) === sha) { continue; }
    say(`Enviando arquivos… ${done} de ${files.length}`);
    const blob = await ghApi(token, "POST", `/repos/${owner}/${repo}/git/blobs`, { content: bytesToBase64(bytes), encoding: "base64" });
    entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
    sent++;
  }

  let commitUrl = null;
  if (entries.length) {
    say("Gravando a publicação…");
    const tree = await ghApi(token, "POST", `/repos/${owner}/${repo}/git/trees`, { base_tree: headCommit.tree.sha, tree: entries });
    const commit = await ghApi(token, "POST", `/repos/${owner}/${repo}/git/commits`, { message: `Publica "${opts.title || "curso"}" (ClassAtelier)`, tree: tree.sha, parents: [headSha] });
    await ghApi(token, "PATCH", `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch).replace(/%2F/g, "/")}`, { sha: commit.sha, force: false });
    commitUrl = `https://github.com/${owner}/${repo}/commit/${commit.sha}`;
  }

  // GitHub Pages
  let pages = "ignorado";
  try {
    try { await ghApi(token, "GET", `/repos/${owner}/${repo}/pages`); pages = "ativo"; }
    catch (e) {
      if (e.status === 404 && opts.enablePages) {
        say("Ligando o GitHub Pages…");
        await ghApi(token, "POST", `/repos/${owner}/${repo}/pages`, { source: { branch, path: "/" } });
        pages = "ligado agora";
      } else if (e.status === 404) pages = "desligado";
      else throw e;
    }
  } catch (e) { pages = "não consegui ligar (" + e.message + ")"; }

  const isUserSite = repo.toLowerCase() === (owner + ".github.io").toLowerCase();
  const base = `https://${owner.toLowerCase()}.github.io/${isUserSite ? "" : repo + "/"}${prefix}`;
  const links = [{ label: "Página do curso", url: base + "index.html" }].concat(files.filter((f) => /^aula-\d+\.html$/.test(f.path)).map((f, i) => ({ label: (lessons[i] && lessons[i].meta && lessons[i].meta.title) || "Aula " + String(i + 1).padStart(2, "0"), url: base + f.path })));
  return { sent, total: files.length, commitUrl, pages, links, repoUrl: `https://github.com/${owner}/${repo}`, branch };
}

Object.assign(window, { buildSCORMBlob, buildCourseSCORMBlob, projectFileName, downloadExport, downloadStandaloneHTML, buildExportHTML, downloadSCORM, downloadCourseSCORM, downloadCourseSite, publishCourseToGitHub, openPrintPreview });
