/* eslint-disable */
// ════════════════════════════════════════════════════════════
// AulaStudio — BOOT LOADER
// ────────────────────────────────────────────────────────────
// Monta a página a partir do TEMA ATIVO (themes.js) em vez de tags
// fixas no index.html. Roda DURANTE o parse (script clássico no body),
// então usa document.write: as tags injetadas se comportam exatamente
// como estáticas — ordem garantida e o Babel as transpila no DOMContentLoaded.
//
//   window.AULA_BASE  → prefixo até a raiz do projeto ("../" no builder, "" no deploy)
//   window.AULA_ACTIVE_THEME → tema resolvido (lido também pelo export.jsx)
// ════════════════════════════════════════════════════════════
(function () {
  var BASE = window.AULA_BASE || "";
  var BUILD_REV = "20261028-credito7";
  var theme = window.resolveAulaTheme();
  window.AULA_ACTIVE_THEME = theme;

  var out = [];
  function w(s) { out.push(s); }
  function attr(s) { return String(s).replace(/"/g, "&quot;"); }
  function rev(s) { return s + (String(s).indexOf("?") >= 0 ? "&" : "?") + "v=" + BUILD_REV; }

  // 1) Tokens do tema (cores + tipografia), depois a ANATOMIA dos
  //    componentes: defaults Aula primeiro, overrides do tema por cima.
  //    Cascata = fallback automático para o Aula no que o tema não declarar.
  w('<link rel="stylesheet" href="' + attr(rev(BASE + theme.css)) + '" />');
  if (theme.componentsBase) {
    w('<link rel="stylesheet" href="' + attr(rev(BASE + theme.componentsBase)) + '" />');
  }
  if (theme.componentsCss) {
    w('<link rel="stylesheet" href="' + attr(rev(BASE + theme.componentsCss)) + '" />');
  }

  // 1b) Marca o tema no <html> — permite overrides estruturais por CSS
  //     (ex.: [data-theme="carbon"] .aula-fs-btn { border-radius: 0; }).
  try { document.documentElement.setAttribute("data-theme", theme.id); } catch (e) {}

  // 2) Preload das fontes mais visíveis (evita flash de fallback serifado)
  (theme.fontPreload || []).forEach(function (f) {
    var href = f[0], type = f[1] || "font/woff2";
    w('<link rel="preload" href="' + attr(BASE + href) + '" as="font" type="' + attr(type) + '" crossorigin="anonymous" />');
  });

  // 3) Font Awesome (apenas se o tema usar o bloco Destaques/FeatureGrid)
  if (theme.usesFontAwesome) {
    w('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" referrerpolicy="no-referrer" />');
  }

  // 4) "Pele" da ferramenta a partir do tema (sobrescreve os defaults do index.html)
  var t = theme.tool || {};
  var vars = [];
  if (t.accent)     vars.push("--tool-accent:" + t.accent);
  if (t.accentSoft) vars.push("--tool-accent-soft:" + t.accentSoft);
  if (t.sel)        vars.push("--tool-sel:" + t.sel);
  if (t.selSoft)    vars.push("--tool-sel-soft:" + t.selSoft);
  if (t.sans)       vars.push("--tool-sans:" + t.sans);
  if (vars.length) w("<style>:root{" + vars.join(";") + "}</style>");

  // 5) Globais clássicos do kit/projeto (custom elements + glossário)
  var kit = BASE + theme.kit;
  w('<script src="' + attr(rev(kit + theme.imageSlot)) + '"><\/script>');
  (theme.globals || []).forEach(function (g) {
    w('<script src="' + attr(rev(BASE + g)) + '"><\/script>');
  });

  // 6) Componentes do tema (Babel) — devem rodar antes dos módulos do builder
  (theme.components || []).forEach(function (c) {
    w('<script type="text/babel" src="' + attr(rev(kit + c)) + '"><\/script>');
  });

  // 7) Módulos do builder (agnósticos de tema — vivem ao lado do index.html)
  ["editable.jsx", "registry.jsx", "blocks.jsx", "panel.jsx", "export.jsx", "app.jsx", "mount.jsx"].forEach(function (m) {
    w('<script type="text/babel" src="' + attr(rev(m)) + '"><\/script>');
  });

  document.write(out.join("\n"));
})();
