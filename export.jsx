/* eslint-disable */
// AulaStudio — export the authored lesson as HTML and SCORM packages.
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
async function buildExportHTML(lesson, opts = {}) {
  const fontsMode = opts.fonts || "embed";
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
  const forcePDF = opts.pdf === true;
  const forceAutoPrint = opts.autoPrint === true;

  return `<!doctype html>
<html lang="pt-BR" data-theme="${theme ? theme.id : "aula"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(lesson.meta?.title || "Aula")}</title>
${usesFontAwesome ? '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" referrerpolicy="no-referrer" />' : ""}
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

<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"><\/script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"><\/script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"><\/script>

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

function addProjectFile(zip, lesson, packagedFiles) {
  const path = lessonSlug(lesson.meta?.title) + ".aula.json";
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
  await addPackageSupportFiles(zip);
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

async function addPackageSupportFiles(zip, packagedFiles) {
  const files = packagedFiles || [];
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

async function downloadSCORM(lesson, opts) {
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

  await addPackageSupportFiles(zip, packagedFiles);

  zip.file("imsmanifest.xml", buildManifest({ ...opts, files: packagedFiles }));

  const blob = await zip.generateAsync({ type: "blob" });

  const name = lessonSlug(opts.title);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (name || "classatelier") + "-scorm.zip";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
    const projectPath = "projetos/aula-" + n + "-" + lessonSlug(label) + ".aula.json";
    zip.file(projectPath, JSON.stringify(projectLesson, null, 2));
    files.push(projectPath);
    images.forEach((a) => { zip.file(a.path, a.base64, { base64: true }); files.push(a.path); });
    items.push({ title: label, href, files, mastery });
  }
  const shared = await addPackageSupportFiles(zip, []);
  zip.file("imsmanifest.xml", buildCourseManifest({ title: opts.title, version: opts.version, items, shared }));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (lessonSlug(opts.title) || "curso") + "-scorm.zip";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ── Site do curso (GitHub Pages): aula-01.html, aula-02.html… + índice, com endereços estáveis ──
async function downloadCourseSite(lessons, opts) {
  if (typeof JSZip === "undefined") throw new Error("Biblioteca de compactação (JSZip) não carregou.");
  if (!lessons || !lessons.length) throw new Error("Escolha pelo menos uma aula.");
  const zip = new JSZip();
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
    zip.file("projetos/aula-" + n + "-" + lessonSlug(label) + ".aula.json", JSON.stringify(projectLesson, null, 2));
    images.forEach((a) => zip.file(a.path, a.base64, { base64: true }));
    entries.push({ n, label, href: "aula-" + n + ".html" });
  }
  await addPackageSupportFiles(zip, []);
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

A pasta \`projetos/\` guarda o \`.aula.json\` de cada aula, para reabrir e editar no ClassAtelier.
`);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = (lessonSlug(title) || "curso") + "-site.zip";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

Object.assign(window, { downloadExport, downloadStandaloneHTML, buildExportHTML, downloadSCORM, downloadCourseSCORM, downloadCourseSite, openPrintPreview });
