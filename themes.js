/* eslint-disable */
// Migração única: copia dados salvos com o nome antigo ("aulastudio.*") para "classatelier.*".
(function () {
  try {
    [localStorage, sessionStorage].forEach(function (st) {
      Object.keys(st).forEach(function (k) {
        if (k.indexOf("aulastudio.") !== 0) return;
        var nk = "classatelier." + k.slice("aulastudio.".length);
        if (st.getItem(nk) === null) st.setItem(nk, st.getItem(k));
        st.removeItem(k);
      });
    });
  } catch (e) {}
})();
// ════════════════════════════════════════════════════════════
// ClassAtelier — REGISTRO DE TEMAS (design systems)
// ────────────────────────────────────────────────────────────
// O builder é agnóstico de marca. Cada "tema" descreve QUAL design
// system carregar: tokens (CSS), fontes, kit de componentes e a cor
// da própria ferramenta. Trocar de tema = trocar tudo isso de uma vez.
//
// ▸ Os caminhos aqui são SEMPRE relativos à RAIZ do projeto
//   (ex.: "ui_kits/scorm_lesson/"), sem "../". Cada consumidor
//   (builder, export, deploy) prefixa a própria base via window.AULA_BASE.
//
// ▸ COMO CRIAR UM TEMA NOVO (cenário B — mesmo contrato de blocos):
//   1. Crie a pasta do kit, ex.: "ui_kits/<tema>/" com:
//        - colors_and_type.css  (os MESMOS nomes de variáveis: --paper,
//          --ink, --ocean, --terracotta…  só mudam os valores)
//        - fontes + fonts/fonts.css
//        - components.css (OPCIONAL) → tokens de ANATOMIA (--c-*) para
//          mudar a forma dos componentes (bordas, raios, ícones, botões).
//          Declare no tema via `componentsCss`. Só o que for redeclarado
//          muda; o resto cai nos defaults Aula de components.css (raiz).
//        - components*.jsx  → SÓ se quiser markup diferente. Se o visual
//          mudar apenas por cor/fonte/forma, REUTILIZE o kit "shared"
//          (não declare `kit`/`components` no tema) — os componentes já
//          leem tudo de variáveis CSS.
//   2. Adicione uma entrada em AULA_THEMES.list (copie a do Aula).
//   3. Pronto: o seletor no topo do builder mostra o tema novo.
//
//   Detalhe importante do contrato: um tema PRECISA implementar os
//   mesmos componentes/props que o builder chama (ParallaxImage, Tabela,
//   Filmstrip, LinhaDoTempo, TextoImagem, Quiz, …). A forma mais segura
//   de fazer um tema é COPIAR o kit Aula e re-pintar o CSS.
// ════════════════════════════════════════════════════════════

var TOPIC_SURFACE_ALIASES = {
  paper: "neutral-default", sand: "neutral-subtle", ink: "neutral-inverse",
  marigold: "accent-1-soft", terracotta: "accent-2-vivid",
  lavender: "accent-3-soft", sage: "accent-4-soft", ocean: "accent-5-soft", coral: "accent-6-soft",
  "ocean-vivid": "accent-5-vivid", petrol: "accent-5-deep",
  "marigold-deep": "accent-1-deep", "terracotta-deep": "accent-2-deep",
  "lavender-deep": "accent-3-deep", "sage-deep": "accent-4-deep",
  "sage-green": "accent-4-vivid", "coral-deep": "accent-6-deep",
};

function makeTopicSurfaces(config) {
  var surfaces = [
    { id: "neutral-default", label: config.neutrals.default.label, group: "Neutros", appearance: "neutral", cssVar: config.neutrals.default.cssVar, swatch: config.neutrals.default.swatch, contentTone: "dark" },
    { id: "neutral-subtle", label: config.neutrals.subtle.label, group: "Neutros", appearance: "neutral", cssVar: config.neutrals.subtle.cssVar, swatch: config.neutrals.subtle.swatch, contentTone: "dark" },
    { id: "neutral-inverse", label: config.neutrals.inverse.label, group: "Neutros", appearance: "deep", cssVar: config.neutrals.inverse.cssVar, swatch: config.neutrals.inverse.swatch, contentTone: "light" },
  ];
  config.accents.forEach(function (accent, index) {
    ["soft", "vivid", "deep"].forEach(function (appearance) {
      var tone = accent[appearance];
      surfaces.push({
        id: "accent-" + (index + 1) + "-" + appearance,
        label: tone.label,
        group: appearance === "soft" ? "Suaves" : appearance === "vivid" ? "Vivos" : "Profundos",
        appearance: appearance,
        cssVar: tone.cssVar,
        value: tone.value,
        swatch: tone.swatch,
        contentTone: tone.contentTone,
      });
    });
  });
  return surfaces;
}

window.AULA_THEMES = {
  // Defaults herdados por todos os temas (sobrescreva no tema só o que mudar).
  shared: {
    kit: "ui_kits/scorm_lesson/",
    imageSlot: "image-slot.js",   // dentro do kit
    scorm: "scorm.js",            // dentro do kit
    pdfCss: "aula-pdf.css",       // dentro do kit
    components: ["components.jsx"],
    globals: ["glossario.js", "equacao.js", "forum.js"],    // na raiz do projeto
    assets: ["assets/classatelier-mark.svg"],
    // Tokens de ANATOMIA dos componentes (defaults Aula) — carregado
    // SEMPRE, em todo tema, logo após o CSS do tema. O que o tema não
    // redeclarar no próprio componentsCss cai nestes defaults.
    componentsBase: "components.css",
  },

  list: [
    {
      id: "aula",
      label: "Aula (padrão)",
      // 2–3 cores que representam o tema no seletor visual.
      swatches: ["#D85C3C", "#2C5B7A", "#FBF6EE"],

      css: "colors_and_type.css",
      fontsDir: "fonts/",
      fontPreload: [
        ["fonts/BricolageGrotesque-VariableFont_opsz_wdth_wght.ttf", "font/ttf"],
        ["fonts/Newsreader-VariableFont_opsz_wght.ttf", "font/ttf"],
        ["fonts/Geist-VariableFont_wght.ttf", "font/ttf"],
      ],
      usesFontAwesome: true,

      // kit / components / globals: herdados de `shared` (não declarados).

      // Superficies disponiveis para topicos e bandas de conteudo. O ID e
      // estrutural e persiste no documento; nome, cor e contraste pertencem
      // ao tema. Assim outro tema pode usar matizes completamente diferentes.
      topicSurfaces: [
        { id: "neutral-default", label: "Papel", group: "Neutros", appearance: "neutral", cssVar: "--paper", swatch: "#FBF6EE", contentTone: "dark" },
        { id: "neutral-subtle", label: "Areia", group: "Neutros", appearance: "neutral", cssVar: "--sand", swatch: "#F0E5CF", contentTone: "dark" },
        { id: "neutral-inverse", label: "Tinta", group: "Neutros", appearance: "deep", cssVar: "--ink", swatch: "#1B1A17", contentTone: "light" },

        { id: "accent-1-soft", label: "Marigold suave", group: "Suaves", appearance: "soft", cssVar: "--marigold-soft", swatch: "#FFE8A8", contentTone: "dark" },
        { id: "accent-2-soft", label: "Terracota suave", group: "Suaves", appearance: "soft", cssVar: "--terracotta-soft", swatch: "#F6D5C8", contentTone: "dark" },
        { id: "accent-3-soft", label: "Lavanda suave", group: "Suaves", appearance: "soft", cssVar: "--lavender-soft", swatch: "#E2DDF0", contentTone: "dark" },
        { id: "accent-4-soft", label: "Sage suave", group: "Suaves", appearance: "soft", cssVar: "--sage-soft", swatch: "#DCE7D2", contentTone: "dark" },
        { id: "accent-5-soft", label: "Oceano suave", group: "Suaves", appearance: "soft", cssVar: "--ocean-soft", swatch: "#CDDDE8", contentTone: "dark" },
        { id: "accent-6-soft", label: "Coral suave", group: "Suaves", appearance: "soft", cssVar: "--coral-soft", swatch: "#F7DCD3", contentTone: "dark" },

        { id: "accent-1-vivid", label: "Marigold", group: "Vivos", appearance: "vivid", cssVar: "--marigold", swatch: "#FFCB47", contentTone: "dark" },
        { id: "accent-2-vivid", label: "Terracota", group: "Vivos", appearance: "vivid", cssVar: "--terracotta", swatch: "#D85C3C", contentTone: "dark" },
        { id: "accent-3-vivid", label: "Lavanda", group: "Vivos", appearance: "vivid", cssVar: "--lavender", swatch: "#7C6BAD", contentTone: "light" },
        { id: "accent-4-vivid", label: "Sage", group: "Vivos", appearance: "vivid", cssVar: "--sage", swatch: "#6E8B5C", contentTone: "dark" },
        { id: "accent-5-vivid", label: "Oceano", group: "Vivos", appearance: "vivid", cssVar: "--ocean", swatch: "#2C5B7A", contentTone: "light" },
        { id: "accent-6-vivid", label: "Coral", group: "Vivos", appearance: "vivid", cssVar: "--coral", swatch: "#E89F8E", contentTone: "dark" },

        { id: "accent-1-deep", label: "Marigold profundo", group: "Profundos", appearance: "deep", cssVar: "--marigold-deep", swatch: "#B8821D", contentTone: "dark" },
        { id: "accent-2-deep", label: "Terracota profunda", group: "Profundos", appearance: "deep", cssVar: "--terracotta-deep", swatch: "#8A2F18", contentTone: "light" },
        { id: "accent-3-deep", label: "Lavanda profunda", group: "Profundos", appearance: "deep", cssVar: "--lavender-deep", swatch: "#3D3168", contentTone: "light" },
        { id: "accent-4-deep", label: "Sage profundo", group: "Profundos", appearance: "deep", cssVar: "--sage-deep", swatch: "#2E4423", contentTone: "light" },
        { id: "accent-5-deep", label: "Petroleo", group: "Profundos", appearance: "deep", cssVar: "--ocean-deep", swatch: "#143147", contentTone: "light" },
        { id: "accent-6-deep", label: "Coral profundo", group: "Profundos", appearance: "deep", cssVar: "--coral-deep", swatch: "#95412F", contentTone: "light" },
      ],
      topicSurfaceAliases: {
        paper: "neutral-default", sand: "neutral-subtle", ink: "neutral-inverse",
        marigold: "accent-1-soft", terracotta: "accent-2-vivid",
        lavender: "accent-3-soft", sage: "accent-4-soft", ocean: "accent-5-soft", coral: "accent-6-soft",
        "ocean-vivid": "accent-5-vivid", petrol: "accent-5-deep",
        "marigold-deep": "accent-1-deep", "terracotta-deep": "accent-2-deep",
        "lavender-deep": "accent-3-deep", "sage-deep": "accent-4-deep",
        "sage-green": "accent-4-vivid", "coral-deep": "accent-6-deep",
      },

      // Paleta de acento que os editores do painel oferecem (bolinhas).
      // Nomes batem com as variáveis --<nome> do CSS do tema.
      tones: {
        ocean:      "#2C5B7A",
        terracotta: "#D85C3C",
        sage:       "#6E8B5C",
        marigold:   "#FFCB47",
        lavender:   "#7C6BAD",
        coral:      "#E89F8E",
      },

      // "Pele" da própria ferramenta (chrome neutro + acento da marca).
      tool: {
        accent:     "#D85C3C",
        accentSoft: "#FBE7E0",
        sel:        "#2C5B7A",
        selSoft:    "#E2EEF5",
        sans:       '"Geist", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "cedar",
      label: "Cedar — REI Co-op",
      // Blue Spruce Green · Alpine Lake Blue · Warm Grey 100
      swatches: ["#1f513f", "#406eb5", "#edeae3"],

      css: "cedar/colors_and_type.css",
      // Anatomia dos componentes no estilo Cedar (callouts, botões, raios).
      // O que não estiver declarado lá cai nos defaults Aula (components.css).
      componentsCss: "cedar/components.css",
      fontsDir: "cedar/fonts/",
      fontPreload: [
        ["cedar/fonts/HankenGrotesk-var.ttf", "font/ttf"],
        ["cedar/fonts/SourceSerif4-Roman-var.woff2", "font/woff2"],
      ],
      usesFontAwesome: true,

      // Reutiliza os componentes do kit Aula (re-skin via CSS) — não declara
      // kit/components/globals: herdados de `shared`.

      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Branco", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Cinza quente", cssVar: "--sand", swatch: "#edeae3" },
          inverse: { label: "Carvao", cssVar: "--ink", swatch: "#2e2e2b" },
        },
        accents: [
          { soft: { label: "Golden Yellow suave", cssVar: "--marigold-soft", swatch: "#fff8e0", contentTone: "dark" }, vivid: { label: "Golden Yellow", cssVar: "--marigold", swatch: "#ffbf59", contentTone: "dark" }, deep: { label: "Golden Yellow profundo", cssVar: "--marigold-deep", swatch: "#814c18", contentTone: "light" } },
          { soft: { label: "Smoked Salmon suave", cssVar: "--terracotta-soft", swatch: "#feeae1", contentTone: "dark" }, vivid: { label: "Smoked Salmon", cssVar: "--terracotta", swatch: "#fa6f5a", contentTone: "dark" }, deep: { label: "Smoked Salmon profundo", cssVar: "--terracotta-deep", swatch: "#851414", contentTone: "light" } },
          { soft: { label: "Info Teal suave", cssVar: "--lavender-soft", swatch: "#e4f8fc", contentTone: "dark" }, vivid: { label: "Info Teal", value: "#307383", swatch: "#307383", contentTone: "light" }, deep: { label: "Info Blue profundo", cssVar: "--lavender-deep", swatch: "#174b80", contentTone: "light" } },
          { soft: { label: "Blue Spruce suave", cssVar: "--sage-soft", swatch: "#e9f7eb", contentTone: "dark" }, vivid: { label: "Blue Spruce", value: "#376F62", swatch: "#376F62", contentTone: "light" }, deep: { label: "Blue Spruce profundo", cssVar: "--sage-deep", swatch: "#1f513f", contentTone: "light" } },
          { soft: { label: "Alpine Lake suave", cssVar: "--ocean-soft", swatch: "#e2f4fe", contentTone: "dark" }, vivid: { label: "Alpine Lake", cssVar: "--ocean", swatch: "#406eb5", contentTone: "light" }, deep: { label: "Alpine Lake profundo", cssVar: "--ocean-deep", swatch: "#0b2d60", contentTone: "light" } },
          { soft: { label: "Sale Red suave", cssVar: "--coral-soft", swatch: "#fde2e2", contentTone: "dark" }, vivid: { label: "Sale Red", value: "#C44848", swatch: "#C44848", contentTone: "light" }, deep: { label: "Sale Red profundo", cssVar: "--coral-deep", swatch: "#990000", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      // Acentos = hues oficiais do Cedar (@rei/cdr-tokens).
      tones: {
        ocean:      "#406eb5",  // alpine-lake-blue (link)
        terracotta: "#fa6f5a",  // smoked-salmon-red
        sage:       "#469178",  // blue-spruce-green (assinatura REI)
        marigold:   "#ffbf59",  // golden-yellow
        lavender:   "#408e86",  // info-blue (teal)
        coral:      "#f16363",  // sale-red
      },

      // Pele da ferramenta no verde spruce de marca.
      tool: {
        accent:     "#1f513f",  // blue-spruce-green-1000
        accentSoft: "#e9f7eb",
        sel:        "#406eb5",  // alpine lake blue
        selSoft:    "#e2f4fe",
        sans:       '"Hanken Grotesk", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "carbon",
      label: "Carbon — IBM",
      // IBM Blue 60 · Gray 100 · Gray 10
      swatches: ["#0f62fe", "#161616", "#f4f4f4"],

      css: "carbon/colors_and_type.css",
      // Anatomia dos componentes no estilo Carbon (notifications, botões retos…).
      // O que não estiver declarado lá cai nos defaults Aula (components.css).
      componentsCss: "carbon/components.css",
      fontsDir: "carbon/fonts/",
      fontPreload: [
        ["carbon/fonts/IBMPlexSans-Regular.woff2", "font/woff2"],
        ["carbon/fonts/IBMPlexSans-Light.woff2", "font/woff2"],
        ["carbon/fonts/IBMPlexSans-SemiBold.woff2", "font/woff2"],
      ],
      usesFontAwesome: true,

      // Reutiliza os componentes do kit Aula (re-skin via CSS) — não declara
      // kit/components/globals: herdados de `shared`.

      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "White", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Gray 20", cssVar: "--sand", swatch: "#e0e0e0" },
          inverse: { label: "Gray 100", cssVar: "--ink", swatch: "#161616" },
        },
        accents: [
          { soft: { label: "Yellow 10", cssVar: "--marigold-soft", swatch: "#fcf4d6", contentTone: "dark" }, vivid: { label: "Yellow 30", cssVar: "--marigold", swatch: "#f1c21b", contentTone: "dark" }, deep: { label: "Yellow 70", cssVar: "--marigold-deep", swatch: "#684e00", contentTone: "light" } },
          { soft: { label: "Red 10", cssVar: "--terracotta-soft", swatch: "#fff1f1", contentTone: "dark" }, vivid: { label: "Red 60", cssVar: "--terracotta", swatch: "#da1e28", contentTone: "light" }, deep: { label: "Red 80", cssVar: "--terracotta-deep", swatch: "#750e13", contentTone: "light" } },
          { soft: { label: "Purple 10", cssVar: "--lavender-soft", swatch: "#f6f2ff", contentTone: "dark" }, vivid: { label: "Purple 60", cssVar: "--lavender", swatch: "#8a3ffc", contentTone: "light" }, deep: { label: "Purple 80", cssVar: "--lavender-deep", swatch: "#491d8b", contentTone: "light" } },
          { soft: { label: "Green 10", cssVar: "--sage-soft", swatch: "#defbe6", contentTone: "dark" }, vivid: { label: "Green 50", cssVar: "--sage", swatch: "#24a148", contentTone: "dark" }, deep: { label: "Green 80", cssVar: "--sage-deep", swatch: "#044317", contentTone: "light" } },
          { soft: { label: "Blue 10", cssVar: "--ocean-soft", swatch: "#edf5ff", contentTone: "dark" }, vivid: { label: "Blue 60", cssVar: "--ocean", swatch: "#0f62fe", contentTone: "light" }, deep: { label: "Blue 90", cssVar: "--ocean-deep", swatch: "#001d6c", contentTone: "light" } },
          { soft: { label: "Teal 10", cssVar: "--coral-soft", swatch: "#d9fbfb", contentTone: "dark" }, vivid: { label: "Teal 50", cssVar: "--coral", swatch: "#009d9a", contentTone: "dark" }, deep: { label: "Teal 80", cssVar: "--coral-deep", swatch: "#004144", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      // Acentos = hues oficiais do Carbon (@carbon/colors).
      tones: {
        ocean:      "#0f62fe",  // blue 60 (IBM)
        terracotta: "#da1e28",  // red 60
        sage:       "#24a148",  // green 50
        marigold:   "#f1c21b",  // yellow 30
        lavender:   "#8a3ffc",  // purple 60
        coral:      "#009d9a",  // teal 50
      },

      // Pele da ferramenta em azul IBM.
      tool: {
        accent:     "#0f62fe",
        accentSoft: "#d0e2ff",
        sel:        "#0043ce",
        selSoft:    "#edf5ff",
        sans:       '"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "intergalactic",
      label: "Intergalactic — Semrush",
      // Brand orange · info blue · gray 800
      swatches: ["#ff642d", "#008ff8", "#191b23"],

      css: "intergalactic/colors_and_type.css",
      componentsCss: "intergalactic/components.css",
      // Inter e a familia oficial. Geist e o fallback local e exportavel.
      fontsDir: "fonts/",
      fontPreload: [
        ["fonts/Geist-VariableFont_wght.ttf", "font/ttf"],
      ],
      usesFontAwesome: true,

      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Primary neutral", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Secondary neutral", cssVar: "--sand", swatch: "#e0e1e9" },
          inverse: { label: "Primary invert", cssVar: "--ink", swatch: "#191b23" },
        },
        accents: [
          { soft: { label: "Highlight 50", cssVar: "--marigold-soft", swatch: "#fdf7c8", contentTone: "dark" }, vivid: { label: "Highlight 200", cssVar: "--marigold", swatch: "#fdc23c", contentTone: "dark" }, deep: { label: "Highlight 600", cssVar: "--marigold-deep", swatch: "#743a00", contentTone: "light" } },
          { soft: { label: "Brand suave", cssVar: "--terracotta-soft", swatch: "#fff3d9", contentTone: "dark" }, vivid: { label: "Brand primary", cssVar: "--terracotta", swatch: "#ff642d", contentTone: "dark" }, deep: { label: "Brand active", cssVar: "--terracotta-deep", swatch: "#8b1500", contentTone: "light" } },
          { soft: { label: "Advertising 50", cssVar: "--lavender-soft", swatch: "#f9f2ff", contentTone: "dark" }, vivid: { label: "Advertising 500", cssVar: "--lavender", swatch: "#8649e1", contentTone: "light" }, deep: { label: "Brand secondary", cssVar: "--lavender-deep", swatch: "#421983", contentTone: "light" } },
          { soft: { label: "Success suave", cssVar: "--sage-soft", swatch: "#dbfee8", contentTone: "dark" }, vivid: { label: "Success", cssVar: "--sage", swatch: "#009f81", contentTone: "dark" }, deep: { label: "Success active", cssVar: "--sage-deep", swatch: "#055345", contentTone: "light" } },
          { soft: { label: "Info suave", cssVar: "--ocean-soft", swatch: "#e9f7ff", contentTone: "dark" }, vivid: { label: "Info", cssVar: "--ocean", swatch: "#008ff8", contentTone: "dark" }, deep: { label: "Info active", cssVar: "--ocean-deep", swatch: "#044792", contentTone: "light" } },
          { soft: { label: "Critical suave", cssVar: "--coral-soft", swatch: "#fff0f7", contentTone: "dark" }, vivid: { label: "Critical", cssVar: "--coral", swatch: "#ff4953", contentTone: "dark" }, deep: { label: "Critical active", cssVar: "--coral-deep", swatch: "#8e0016", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        ocean:      "#008ff8",
        terracotta: "#ff642d",
        sage:       "#009f81",
        marigold:   "#fdc23c",
        lavender:   "#8649e1",
        coral:      "#ff4953",
      },

      tool: {
        accent:     "#ff642d",
        accentSoft: "#fff3d9",
        sel:        "#008ff8",
        selSoft:    "#e9f7ff",
        sans:       '"Inter", "Geist", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "persona",
      label: "Persona — Privy",
      // Azul accent · Tinta gray.95 · Ground gray.5
      swatches: ["#008AFF", "#1F2329", "#F4F5F7"],

      css: "persona/colors_and_type.css",
      // Anatomia Persona: cards quase-brancos com borda subtle +
      // sombra sm, banners tint "0", botões azuis raio 8px.
      componentsCss: "persona/components.css",
      fontsDir: "persona/fonts/",
      fontPreload: [
        ["persona/fonts/DMSans-var.ttf", "font/ttf"],
        ["persona/fonts/DMSans-Italic-var.ttf", "font/ttf"],
      ],
      usesFontAwesome: true,

      // Reutiliza os componentes do kit Aula (re-skin via CSS) — não declara
      // kit/components/globals: herdados de `shared`.

      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Ground", cssVar: "--paper", swatch: "#F4F5F7" },
          subtle: { label: "Gray 15", cssVar: "--sand", swatch: "#D9DDE3" },
          inverse: { label: "Gray 95", cssVar: "--ink", swatch: "#1F2329" },
        },
        accents: [
          { soft: { label: "Orange 0", cssVar: "--marigold-soft", swatch: "#FFF5E5", contentTone: "dark" }, vivid: { label: "Orange 40", cssVar: "--marigold", swatch: "#FF9E00", contentTone: "dark" }, deep: { label: "Orange 70", cssVar: "--marigold-deep", swatch: "#8C5700", contentTone: "light" } },
          { soft: { label: "Red 0", cssVar: "--terracotta-soft", swatch: "#FCEAE9", contentTone: "dark" }, vivid: { label: "Red 50", value: "#C22725", swatch: "#C22725", contentTone: "light" }, deep: { label: "Red 60", cssVar: "--terracotta-deep", swatch: "#9F201F", contentTone: "light" } },
          { soft: { label: "Purple 0", cssVar: "--lavender-soft", swatch: "#F2E5FF", contentTone: "dark" }, vivid: { label: "Purple 40", cssVar: "--lavender", swatch: "#8000FF", contentTone: "light" }, deep: { label: "Purple 70", cssVar: "--lavender-deep", swatch: "#46008C", contentTone: "light" } },
          { soft: { label: "Green 0", cssVar: "--sage-soft", swatch: "#EAF9EE", contentTone: "dark" }, vivid: { label: "Green 40", cssVar: "--sage", swatch: "#34C759", contentTone: "dark" }, deep: { label: "Green 70", cssVar: "--sage-deep", swatch: "#1D6D31", contentTone: "light" } },
          { soft: { label: "Blue 0", cssVar: "--ocean-soft", swatch: "#E5F3FF", contentTone: "dark" }, vivid: { label: "Blue 40", cssVar: "--ocean", swatch: "#008AFF", contentTone: "dark" }, deep: { label: "Blue 70", cssVar: "--ocean-deep", swatch: "#004C8C", contentTone: "light" } },
          { soft: { label: "Teal 0", cssVar: "--coral-soft", swatch: "#E5F9F6", contentTone: "dark" }, vivid: { label: "Teal 40", cssVar: "--coral", swatch: "#00C7A9", contentTone: "dark" }, deep: { label: "Teal 70", cssVar: "--coral-deep", swatch: "#006D5D", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      // Acentos = hues 40 ("emphasis") do tailwind-preset do Persona.
      tones: {
        ocean:      "#008AFF",  // blue.40 — brand-accent
        terracotta: "#E42E2C",  // red.40 — brand-action Privy
        sage:       "#34C759",  // green.40 (success)
        marigold:   "#FF9E00",  // orange.40 (warning)
        lavender:   "#8000FF",  // purple.40
        coral:      "#00C7A9",  // teal.40
      },

      // Pele da ferramenta em azul accent.
      tool: {
        accent:     "#008AFF",  // blue.40
        accentSoft: "#E5F3FF",  // blue.0
        sel:        "#0075D9",  // blue.50
        selSoft:    "#F5FAFF",  // blue.milk
        sans:       '"DM Sans", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "material",
      label: "Material 3 — Google",
      swatches: ["#6750a4", "#fef7ff", "#ece6f0"],

      css: "material/colors_and_type.css",
      componentsCss: "material/components.css",
      fontsDir: "material/fonts/",
      fontPreload: [
        ["material/fonts/roboto-400-normal.woff2", "font/woff2"],
        ["material/fonts/roboto-500-normal.woff2", "font/woff2"],
      ],
      usesFontAwesome: true,
      
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Surface", cssVar: "--paper", swatch: "#fef7ff" },
          subtle: { label: "Surface container", cssVar: "--sand", swatch: "#ece6f0" },
          inverse: { label: "Inverse surface", cssVar: "--ink", swatch: "#1d1b20" },
        },
        accents: [
          { soft: { label: "Amarelo claro", cssVar: "--marigold-soft", swatch: "#fff0b8", contentTone: "dark" }, vivid: { label: "Amarelo", cssVar: "--marigold", swatch: "#fbc02d", contentTone: "dark" }, deep: { label: "Amarelo escuro", cssVar: "--marigold-deep", swatch: "#5f4300", contentTone: "light" } },
          { soft: { label: "Vermelho claro", cssVar: "--terracotta-soft", swatch: "#f9dedc", contentTone: "dark" }, vivid: { label: "Vermelho", cssVar: "--terracotta", swatch: "#b3261e", contentTone: "light" }, deep: { label: "Vermelho escuro", cssVar: "--terracotta-deep", swatch: "#601410", contentTone: "light" } },
          { soft: { label: "Roxo claro", cssVar: "--lavender-soft", swatch: "#eaddff", contentTone: "dark" }, vivid: { label: "Roxo", cssVar: "--lavender", swatch: "#6750a4", contentTone: "light" }, deep: { label: "Roxo escuro", cssVar: "--lavender-deep", swatch: "#21005d", contentTone: "light" } },
          { soft: { label: "Verde claro", cssVar: "--sage-soft", swatch: "#c3efad", contentTone: "dark" }, vivid: { label: "Verde", cssVar: "--sage", swatch: "#386a20", contentTone: "light" }, deep: { label: "Verde escuro", cssVar: "--sage-deep", swatch: "#072100", contentTone: "light" } },
          { soft: { label: "Azul claro", cssVar: "--ocean-soft", swatch: "#d1e4ff", contentTone: "dark" }, vivid: { label: "Azul", cssVar: "--ocean", swatch: "#0061a4", contentTone: "light" }, deep: { label: "Azul escuro", cssVar: "--ocean-deep", swatch: "#001d36", contentTone: "light" } },
          { soft: { label: "Rosa claro", cssVar: "--coral-soft", swatch: "#ffd9e2", contentTone: "dark" }, vivid: { label: "Rosa", cssVar: "--coral", swatch: "#984061", contentTone: "light" }, deep: { label: "Rosa escuro", cssVar: "--coral-deep", swatch: "#3e001d", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#fbc02d",
        terracotta: "#b3261e",
        lavender:   "#6750a4",
        sage:       "#386a20",
        ocean:      "#0061a4",
        coral:      "#984061",
      },

      tool: {
        accent:     "#6750a4",
        accentSoft: "#eaddff",
        sel:        "#21005d",
        selSoft:    "#f3edff",
        sans:       '"Roboto", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "govuk",
      label: "GOV.UK — inspirado",
      swatches: ["#1d70b8", "#0b0c0c", "#ffdd00"],

      css: "govuk/colors_and_type.css",
      componentsCss: "govuk/components.css",
      fontsDir: "govuk/fonts/",
      fontPreload: [
      ],
      usesFontAwesome: true,
      // Inspirado no GOV.UK Design System (MIT). Sem a fonte GDS Transport nem o logotipo (uso restrito).
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Branco", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Cinza claro (light-grey)", cssVar: "--sand", swatch: "#f3f2f1" },
          inverse: { label: "Preto (black)", cssVar: "--ink", swatch: "#0b0c0c" },
        },
        accents: [
          { soft: { label: "Yellow tint", cssVar: "--marigold-soft", swatch: "#fff7bf", contentTone: "dark" }, vivid: { label: "Yellow", cssVar: "--marigold", swatch: "#ffdd00", contentTone: "dark" }, deep: { label: "Yellow shade", cssVar: "--marigold-deep", swatch: "#594d00", contentTone: "light" } },
          { soft: { label: "Red tint", cssVar: "--terracotta-soft", swatch: "#f6d7d2", contentTone: "dark" }, vivid: { label: "Red", cssVar: "--terracotta", swatch: "#d4351c", contentTone: "light" }, deep: { label: "Red shade", cssVar: "--terracotta-deep", swatch: "#942514", contentTone: "light" } },
          { soft: { label: "Purple tint", cssVar: "--lavender-soft", swatch: "#dbd5e9", contentTone: "dark" }, vivid: { label: "Purple", cssVar: "--lavender", swatch: "#4c2c92", contentTone: "light" }, deep: { label: "Purple shade", cssVar: "--lavender-deep", swatch: "#3d2375", contentTone: "light" } },
          { soft: { label: "Green tint", cssVar: "--sage-soft", swatch: "#cce2d8", contentTone: "dark" }, vivid: { label: "Green", cssVar: "--sage", swatch: "#00703c", contentTone: "light" }, deep: { label: "Green shade", cssVar: "--sage-deep", swatch: "#005a30", contentTone: "light" } },
          { soft: { label: "Blue tint", cssVar: "--ocean-soft", swatch: "#d2e2f1", contentTone: "dark" }, vivid: { label: "Blue", cssVar: "--ocean", swatch: "#1d70b8", contentTone: "light" }, deep: { label: "Dark blue", cssVar: "--ocean-deep", swatch: "#003078", contentTone: "light" } },
          { soft: { label: "Turquoise tint", cssVar: "--coral-soft", swatch: "#bfe3e0", contentTone: "dark" }, vivid: { label: "Turquoise", cssVar: "--coral", swatch: "#28a197", contentTone: "dark" }, deep: { label: "Turquoise shade", cssVar: "--coral-deep", swatch: "#10403c", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#ffdd00",
        terracotta: "#d4351c",
        lavender:   "#4c2c92",
        sage:       "#00703c",
        ocean:      "#1d70b8",
        coral:      "#28a197",
      },

      tool: {
        accent:     "#1d70b8",
        accentSoft: "#d2e2f1",
        sel:        "#003078",
        selSoft:    "#e8f1f8",
        sans:       'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif',
      },
    },

    {
      id: "atlassian",
      label: "Atlassian — inspirado",
      swatches: ["#0c66e4", "#172b4d", "#f7f8f9"],

      css: "atlassian/colors_and_type.css",
      componentsCss: "atlassian/components.css",
      fontsDir: "atlassian/fonts/",
      fontPreload: [
        ["atlassian/fonts/inter-wght-normal.woff2", "font/woff2"],
      ],
      usesFontAwesome: true,
      // Inspirado no Atlassian Design System. A fonte oficial é proprietária: aqui Inter (OFL).
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Neutral 0", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Neutral 100", cssVar: "--sand", swatch: "#f1f2f4" },
          inverse: { label: "Neutral 1000", cssVar: "--ink", swatch: "#172b4d" },
        },
        accents: [
          { soft: { label: "Yellow subtle", cssVar: "--marigold-soft", swatch: "#fff7d6", contentTone: "dark" }, vivid: { label: "Yellow", cssVar: "--marigold", swatch: "#f5cd47", contentTone: "dark" }, deep: { label: "Yellow bolder", cssVar: "--marigold-deep", swatch: "#7f5f01", contentTone: "light" } },
          { soft: { label: "Red subtle", cssVar: "--terracotta-soft", swatch: "#ffd5d2", contentTone: "dark" }, vivid: { label: "Red", cssVar: "--terracotta", swatch: "#c9372c", contentTone: "light" }, deep: { label: "Red bolder", cssVar: "--terracotta-deep", swatch: "#5d1f1a", contentTone: "light" } },
          { soft: { label: "Purple subtle", cssVar: "--lavender-soft", swatch: "#f3f0ff", contentTone: "dark" }, vivid: { label: "Purple", cssVar: "--lavender", swatch: "#6e5dc6", contentTone: "light" }, deep: { label: "Purple bolder", cssVar: "--lavender-deep", swatch: "#352c63", contentTone: "light" } },
          { soft: { label: "Green subtle", cssVar: "--sage-soft", swatch: "#dcfff1", contentTone: "dark" }, vivid: { label: "Green", cssVar: "--sage", swatch: "#1f845a", contentTone: "light" }, deep: { label: "Green bolder", cssVar: "--sage-deep", swatch: "#164b35", contentTone: "light" } },
          { soft: { label: "Blue subtle", cssVar: "--ocean-soft", swatch: "#e9f2ff", contentTone: "dark" }, vivid: { label: "Blue", cssVar: "--ocean", swatch: "#0c66e4", contentTone: "light" }, deep: { label: "Blue bolder", cssVar: "--ocean-deep", swatch: "#09326c", contentTone: "light" } },
          { soft: { label: "Teal subtle", cssVar: "--coral-soft", swatch: "#e7f9ff", contentTone: "dark" }, vivid: { label: "Teal", cssVar: "--coral", swatch: "#1d7f8c", contentTone: "light" }, deep: { label: "Teal bolder", cssVar: "--coral-deep", swatch: "#1d474c", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#f5cd47",
        terracotta: "#c9372c",
        lavender:   "#6e5dc6",
        sage:       "#1f845a",
        ocean:      "#0c66e4",
        coral:      "#1d7f8c",
      },

      tool: {
        accent:     "#0c66e4",
        accentSoft: "#cfe1fd",
        sel:        "#0055cc",
        selSoft:    "#e9f2ff",
        sans:       '"Inter", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "fluent",
      label: "Fluent — Microsoft (inspirado)",
      swatches: ["#0f6cbd", "#242424", "#f5f5f5"],

      css: "fluent/colors_and_type.css",
      componentsCss: "fluent/components.css",
      fontsDir: "fluent/fonts/",
      fontPreload: [
      ],
      usesFontAwesome: true,
      // Inspirado no Fluent 2 (MIT). Sem a Segoe UI embutida (fonte proprietária).
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "White", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Neutral 4", cssVar: "--sand", swatch: "#f5f5f5" },
          inverse: { label: "Neutral 14", cssVar: "--ink", swatch: "#242424" },
        },
        accents: [
          { soft: { label: "Yellow", cssVar: "--marigold-soft", swatch: "#fffbd6", contentTone: "dark" }, vivid: { label: "Yellow", cssVar: "--marigold", swatch: "#fde300", contentTone: "dark" }, deep: { label: "Yellow dark", cssVar: "--marigold-deep", swatch: "#835b00", contentTone: "light" } },
          { soft: { label: "Red", cssVar: "--terracotta-soft", swatch: "#fdf3f4", contentTone: "dark" }, vivid: { label: "Red", cssVar: "--terracotta", swatch: "#c50f1f", contentTone: "light" }, deep: { label: "Red dark", cssVar: "--terracotta-deep", swatch: "#6e0811", contentTone: "light" } },
          { soft: { label: "Purple", cssVar: "--lavender-soft", swatch: "#f6f2fa", contentTone: "dark" }, vivid: { label: "Purple", cssVar: "--lavender", swatch: "#7a5ab0", contentTone: "light" }, deep: { label: "Purple dark", cssVar: "--lavender-deep", swatch: "#4b3867", contentTone: "light" } },
          { soft: { label: "Green", cssVar: "--sage-soft", swatch: "#f1faf1", contentTone: "dark" }, vivid: { label: "Green", cssVar: "--sage", swatch: "#107c10", contentTone: "light" }, deep: { label: "Green dark", cssVar: "--sage-deep", swatch: "#094509", contentTone: "light" } },
          { soft: { label: "Brand", cssVar: "--ocean-soft", swatch: "#ebf3fc", contentTone: "dark" }, vivid: { label: "Brand", cssVar: "--ocean", swatch: "#0f6cbd", contentTone: "light" }, deep: { label: "Brand dark", cssVar: "--ocean-deep", swatch: "#0a2e4a", contentTone: "light" } },
          { soft: { label: "Teal", cssVar: "--coral-soft", swatch: "#e6f6f6", contentTone: "dark" }, vivid: { label: "Teal", cssVar: "--coral", swatch: "#038387", contentTone: "light" }, deep: { label: "Teal dark", cssVar: "--coral-deep", swatch: "#014446", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#fde300",
        terracotta: "#c50f1f",
        lavender:   "#7a5ab0",
        sage:       "#107c10",
        ocean:      "#0f6cbd",
        coral:      "#038387",
      },

      tool: {
        accent:     "#0f6cbd",
        accentSoft: "#cfe4fa",
        sel:        "#115ea3",
        selSoft:    "#ebf3fc",
        sans:       '"Segoe UI", -apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans, Roboto, Helvetica Neue, Arial, sans-serif',
      },
    },

    {
      id: "polaris",
      label: "Polaris — Shopify (inspirado)",
      swatches: ["#004c3f", "#303030", "#f1f1f1"],

      css: "polaris/colors_and_type.css",
      componentsCss: "polaris/components.css",
      fontsDir: "polaris/fonts/",
      fontPreload: [
        ["polaris/fonts/inter-wght-normal.woff2", "font/woff2"],
      ],
      usesFontAwesome: true,
      // Inspirado no Polaris (MIT). Fonte Inter (OFL), não a Inter da Shopify.
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "White", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Surface secondary", cssVar: "--sand", swatch: "#f1f1f1" },
          inverse: { label: "Text", cssVar: "--ink", swatch: "#303030" },
        },
        accents: [
          { soft: { label: "Yellow", cssVar: "--marigold-soft", swatch: "#fff5ea", contentTone: "dark" }, vivid: { label: "Yellow", cssVar: "--marigold", swatch: "#ffb800", contentTone: "dark" }, deep: { label: "Yellow dark", cssVar: "--marigold-deep", swatch: "#5e4200", contentTone: "light" } },
          { soft: { label: "Red", cssVar: "--terracotta-soft", swatch: "#fff4f4", contentTone: "dark" }, vivid: { label: "Red", cssVar: "--terracotta", swatch: "#d72c0d", contentTone: "light" }, deep: { label: "Red dark", cssVar: "--terracotta-deep", swatch: "#8e1f0b", contentTone: "light" } },
          { soft: { label: "Purple", cssVar: "--lavender-soft", swatch: "#f6f1ff", contentTone: "dark" }, vivid: { label: "Purple", cssVar: "--lavender", swatch: "#7051d8", contentTone: "light" }, deep: { label: "Purple dark", cssVar: "--lavender-deep", swatch: "#3b2a7a", contentTone: "light" } },
          { soft: { label: "Green", cssVar: "--sage-soft", swatch: "#cdfee1", contentTone: "dark" }, vivid: { label: "Green", cssVar: "--sage", swatch: "#008060", contentTone: "light" }, deep: { label: "Verde-escuro", cssVar: "--sage-deep", swatch: "#0c5132", contentTone: "light" } },
          { soft: { label: "Blue", cssVar: "--ocean-soft", swatch: "#eaf4ff", contentTone: "dark" }, vivid: { label: "Blue", cssVar: "--ocean", swatch: "#005bd3", contentTone: "light" }, deep: { label: "Blue dark", cssVar: "--ocean-deep", swatch: "#00287a", contentTone: "light" } },
          { soft: { label: "Teal", cssVar: "--coral-soft", swatch: "#ebf7f8", contentTone: "dark" }, vivid: { label: "Teal", cssVar: "--coral", swatch: "#007d87", contentTone: "light" }, deep: { label: "Teal dark", cssVar: "--coral-deep", swatch: "#004f55", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#ffb800",
        terracotta: "#d72c0d",
        lavender:   "#7051d8",
        sage:       "#008060",
        ocean:      "#005bd3",
        coral:      "#007d87",
      },

      tool: {
        accent:     "#004c3f",
        accentSoft: "#cdfee1",
        sel:        "#008060",
        selSoft:    "#f1fbf6",
        sans:       '"Inter", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    {
      id: "primer",
      label: "Primer — GitHub (inspirado)",
      swatches: ["#0969da", "#1f2328", "#f6f8fa"],

      css: "primer/colors_and_type.css",
      componentsCss: "primer/components.css",
      fontsDir: "primer/fonts/",
      fontPreload: [
      ],
      usesFontAwesome: true,
      // Inspirado no Primer (MIT). Esquema claro; letra do sistema.
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Canvas default", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Canvas subtle", cssVar: "--sand", swatch: "#f6f8fa" },
          inverse: { label: "Fg default", cssVar: "--ink", swatch: "#1f2328" },
        },
        accents: [
          { soft: { label: "Attention", cssVar: "--marigold-soft", swatch: "#fff8c5", contentTone: "dark" }, vivid: { label: "Attention", cssVar: "--marigold", swatch: "#d4a72c", contentTone: "dark" }, deep: { label: "Attention fg", cssVar: "--marigold-deep", swatch: "#7d4e00", contentTone: "light" } },
          { soft: { label: "Danger", cssVar: "--terracotta-soft", swatch: "#ffebe9", contentTone: "dark" }, vivid: { label: "Danger", cssVar: "--terracotta", swatch: "#cf222e", contentTone: "light" }, deep: { label: "Danger fg", cssVar: "--terracotta-deep", swatch: "#82071e", contentTone: "light" } },
          { soft: { label: "Done", cssVar: "--lavender-soft", swatch: "#fbefff", contentTone: "dark" }, vivid: { label: "Done", cssVar: "--lavender", swatch: "#8250df", contentTone: "light" }, deep: { label: "Done fg", cssVar: "--lavender-deep", swatch: "#512a97", contentTone: "light" } },
          { soft: { label: "Success", cssVar: "--sage-soft", swatch: "#dafbe1", contentTone: "dark" }, vivid: { label: "Success", cssVar: "--sage", swatch: "#1a7f37", contentTone: "light" }, deep: { label: "Success fg", cssVar: "--sage-deep", swatch: "#0f5323", contentTone: "light" } },
          { soft: { label: "Accent", cssVar: "--ocean-soft", swatch: "#ddf4ff", contentTone: "dark" }, vivid: { label: "Accent", cssVar: "--ocean", swatch: "#0969da", contentTone: "light" }, deep: { label: "Accent fg", cssVar: "--ocean-deep", swatch: "#0a3069", contentTone: "light" } },
          { soft: { label: "Sponsors", cssVar: "--coral-soft", swatch: "#ffeff7", contentTone: "dark" }, vivid: { label: "Sponsors", cssVar: "--coral", swatch: "#bf3989", contentTone: "light" }, deep: { label: "Sponsors fg", cssVar: "--coral-deep", swatch: "#99286e", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#d4a72c",
        terracotta: "#cf222e",
        lavender:   "#8250df",
        sage:       "#1a7f37",
        ocean:      "#0969da",
        coral:      "#bf3989",
      },

      tool: {
        accent:     "#0969da",
        accentSoft: "#ddf4ff",
        sel:        "#0550ae",
        selSoft:    "#f6f8fa",
        sans:       '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
    },

    {
      id: "antd",
      label: "Ant Design (inspirado)",
      swatches: ["#1668dc", "#141414", "#f5f5f5"],

      css: "antd/colors_and_type.css",
      componentsCss: "antd/components.css",
      fontsDir: "antd/fonts/",
      fontPreload: [
      ],
      usesFontAwesome: true,
      // Inspirado no Ant Design (MIT). Letra do sistema; tamanhos compactos.
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "White", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Fill quaternary", cssVar: "--sand", swatch: "#f5f5f5" },
          inverse: { label: "Text", cssVar: "--ink", swatch: "#141414" },
        },
        accents: [
          { soft: { label: "Gold", cssVar: "--marigold-soft", swatch: "#fffbe6", contentTone: "dark" }, vivid: { label: "Gold", cssVar: "--marigold", swatch: "#faad14", contentTone: "dark" }, deep: { label: "Gold dark", cssVar: "--marigold-deep", swatch: "#613400", contentTone: "light" } },
          { soft: { label: "Red", cssVar: "--terracotta-soft", swatch: "#fff1f0", contentTone: "dark" }, vivid: { label: "Red", cssVar: "--terracotta", swatch: "#d9232d", contentTone: "light" }, deep: { label: "Red dark", cssVar: "--terracotta-deep", swatch: "#820014", contentTone: "light" } },
          { soft: { label: "Purple", cssVar: "--lavender-soft", swatch: "#f9f0ff", contentTone: "dark" }, vivid: { label: "Purple", cssVar: "--lavender", swatch: "#722ed1", contentTone: "light" }, deep: { label: "Purple dark", cssVar: "--lavender-deep", swatch: "#22075e", contentTone: "light" } },
          { soft: { label: "Green", cssVar: "--sage-soft", swatch: "#f6ffed", contentTone: "dark" }, vivid: { label: "Green", cssVar: "--sage", swatch: "#2a850a", contentTone: "light" }, deep: { label: "Green dark", cssVar: "--sage-deep", swatch: "#135200", contentTone: "light" } },
          { soft: { label: "Blue", cssVar: "--ocean-soft", swatch: "#e6f4ff", contentTone: "dark" }, vivid: { label: "Blue", cssVar: "--ocean", swatch: "#1668dc", contentTone: "light" }, deep: { label: "Blue dark", cssVar: "--ocean-deep", swatch: "#002c8c", contentTone: "light" } },
          { soft: { label: "Cyan", cssVar: "--coral-soft", swatch: "#e6fffb", contentTone: "dark" }, vivid: { label: "Cyan", cssVar: "--coral", swatch: "#087f85", contentTone: "light" }, deep: { label: "Cyan dark", cssVar: "--coral-deep", swatch: "#00474f", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#faad14",
        terracotta: "#d9232d",
        lavender:   "#722ed1",
        sage:       "#2a850a",
        ocean:      "#1668dc",
        coral:      "#087f85",
      },

      tool: {
        accent:     "#1668dc",
        accentSoft: "#bae0ff",
        sel:        "#0958d9",
        selSoft:    "#e6f4ff",
        sans:       '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
    },

    {
      id: "lightning",
      label: "Lightning — Salesforce (inspirado)",
      swatches: ["#0176d3", "#032d60", "#f3f3f3"],

      css: "lightning/colors_and_type.css",
      componentsCss: "lightning/components.css",
      fontsDir: "lightning/fonts/",
      fontPreload: [
      ],
      usesFontAwesome: true,
      // Inspirado no SLDS (BSD-3). Sem a Salesforce Sans nem o logotipo.
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "White", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Surface 2", cssVar: "--sand", swatch: "#f3f3f3" },
          inverse: { label: "Text default", cssVar: "--ink", swatch: "#181818" },
        },
        accents: [
          { soft: { label: "Warning", cssVar: "--marigold-soft", swatch: "#fff3df", contentTone: "dark" }, vivid: { label: "Warning", cssVar: "--marigold", swatch: "#ffb75d", contentTone: "dark" }, deep: { label: "Warning dark", cssVar: "--marigold-deep", swatch: "#6b3f00", contentTone: "light" } },
          { soft: { label: "Error", cssVar: "--terracotta-soft", swatch: "#fef1ee", contentTone: "dark" }, vivid: { label: "Error", cssVar: "--terracotta", swatch: "#ba0517", contentTone: "light" }, deep: { label: "Error dark", cssVar: "--terracotta-deep", swatch: "#6b0a12", contentTone: "light" } },
          { soft: { label: "Violet", cssVar: "--lavender-soft", swatch: "#f6efff", contentTone: "dark" }, vivid: { label: "Violet", cssVar: "--lavender", swatch: "#7f4bd6", contentTone: "light" }, deep: { label: "Violet dark", cssVar: "--lavender-deep", swatch: "#4b2490", contentTone: "light" } },
          { soft: { label: "Success", cssVar: "--sage-soft", swatch: "#ebf7e6", contentTone: "dark" }, vivid: { label: "Success", cssVar: "--sage", swatch: "#2e844a", contentTone: "light" }, deep: { label: "Success dark", cssVar: "--sage-deep", swatch: "#194e31", contentTone: "light" } },
          { soft: { label: "Brand", cssVar: "--ocean-soft", swatch: "#eef4ff", contentTone: "dark" }, vivid: { label: "Brand", cssVar: "--ocean", swatch: "#0176d3", contentTone: "light" }, deep: { label: "Brand dark", cssVar: "--ocean-deep", swatch: "#014486", contentTone: "light" } },
          { soft: { label: "Teal", cssVar: "--coral-soft", swatch: "#e0f7f6", contentTone: "dark" }, vivid: { label: "Teal", cssVar: "--coral", swatch: "#06847c", contentTone: "light" }, deep: { label: "Teal dark", cssVar: "--coral-deep", swatch: "#0b5c55", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#ffb75d",
        terracotta: "#ba0517",
        lavender:   "#7f4bd6",
        sage:       "#2e844a",
        ocean:      "#0176d3",
        coral:      "#06847c",
      },

      tool: {
        accent:     "#0176d3",
        accentSoft: "#d8e6fe",
        sel:        "#014486",
        selSoft:    "#eef4ff",
        sans:       '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
    },

    {
      id: "spectrum",
      label: "Spectrum — Adobe (inspirado)",
      swatches: ["#1473e6", "#2c2c2c", "#f8f8f8"],

      css: "spectrum/colors_and_type.css",
      componentsCss: "spectrum/components.css",
      fontsDir: "spectrum/fonts/",
      fontPreload: [
        ["spectrum/fonts/source-sans-3-wght-normal.woff2", "font/woff2"],
      ],
      usesFontAwesome: true,
      // Inspirado no Spectrum (Apache-2.0). Fonte Source Sans 3 (OFL).
      topicSurfaces: makeTopicSurfaces({
        neutrals: {
          default: { label: "Gray 50", cssVar: "--paper", swatch: "#ffffff" },
          subtle: { label: "Gray 100", cssVar: "--sand", swatch: "#f0f0f0" },
          inverse: { label: "Gray 900", cssVar: "--ink", swatch: "#2c2c2c" },
        },
        accents: [
          { soft: { label: "Yellow", cssVar: "--marigold-soft", swatch: "#fff8cc", contentTone: "dark" }, vivid: { label: "Yellow", cssVar: "--marigold", swatch: "#f8d904", contentTone: "dark" }, deep: { label: "Yellow dark", cssVar: "--marigold-deep", swatch: "#5e4b00", contentTone: "light" } },
          { soft: { label: "Red", cssVar: "--terracotta-soft", swatch: "#fdecef", contentTone: "dark" }, vivid: { label: "Red", cssVar: "--terracotta", swatch: "#d7373f", contentTone: "light" }, deep: { label: "Red dark", cssVar: "--terracotta-deep", swatch: "#7e1018", contentTone: "light" } },
          { soft: { label: "Purple", cssVar: "--lavender-soft", swatch: "#f6eefd", contentTone: "dark" }, vivid: { label: "Purple", cssVar: "--lavender", swatch: "#9256d9", contentTone: "light" }, deep: { label: "Purple dark", cssVar: "--lavender-deep", swatch: "#4b2a7b", contentTone: "light" } },
          { soft: { label: "Green", cssVar: "--sage-soft", swatch: "#e0f5ec", contentTone: "dark" }, vivid: { label: "Green", cssVar: "--sage", swatch: "#1f8260", contentTone: "light" }, deep: { label: "Green dark", cssVar: "--sage-deep", swatch: "#0d4d38", contentTone: "light" } },
          { soft: { label: "Blue", cssVar: "--ocean-soft", swatch: "#e5f0fd", contentTone: "dark" }, vivid: { label: "Blue", cssVar: "--ocean", swatch: "#1473e6", contentTone: "light" }, deep: { label: "Blue dark", cssVar: "--ocean-deep", swatch: "#0b3f8a", contentTone: "light" } },
          { soft: { label: "Fuchsia", cssVar: "--coral-soft", swatch: "#fdeaf4", contentTone: "dark" }, vivid: { label: "Fuchsia", cssVar: "--coral", swatch: "#cc2f86", contentTone: "light" }, deep: { label: "Fuchsia dark", cssVar: "--coral-deep", swatch: "#7a1a50", contentTone: "light" } },
        ],
      }),
      topicSurfaceAliases: Object.assign({}, TOPIC_SURFACE_ALIASES),

      tones: {
        marigold:   "#f8d904",
        terracotta: "#d7373f",
        lavender:   "#9256d9",
        sage:       "#1f8260",
        ocean:      "#1473e6",
        coral:      "#cc2f86",
      },

      tool: {
        accent:     "#1473e6",
        accentSoft: "#cae1fb",
        sel:        "#0d66d0",
        selSoft:    "#e5f0fd",
        sans:       '"Source Sans 3", -apple-system, "Segoe UI", system-ui, sans-serif',
      },
    },

    // ▼ EXEMPLO de tema novo — descomente, crie o kit e ajuste:
    // {
    //   id: "minha-marca",
    //   label: "Minha Marca",
    //   swatches: ["#1B4D3E", "#C7A046", "#F4F1EA"],
    //   css: "ui_kits/minha-marca/colors_and_type.css",
    //   fontsDir: "ui_kits/minha-marca/fonts/",
    //   fontPreload: [],
    //   // Reutiliza os componentes Aula (só muda cor/fonte): NÃO declare kit.
    //   // Para markup próprio: kit: "ui_kits/minha-marca/", components: [...].
    //   tones: { ocean:"#1B4D3E", terracotta:"#C7A046", sage:"#6E8B5C", marigold:"#C7A046", lavender:"#7C6BAD", coral:"#B05B3B" },
    //   tool: { accent:"#1B4D3E", accentSoft:"#DDEAE3", sel:"#C7A046", selSoft:"#F3EAD0", sans:'"Geist", system-ui, sans-serif' },
    // },
  ],
};

// Resolve o tema ativo (URL ?theme= › localStorage › primeiro da lista),
// já mesclado com os defaults de `shared`. Usado pelo boot e pelo export.
window.resolveAulaTheme = function (forcedId) {
  var T = window.AULA_THEMES;
  var id = forcedId;
  if (!id) {
    try { id = new URL(location.href).searchParams.get("theme"); } catch (e) {}
  }
  if (!id) {
    try { id = localStorage.getItem("classatelier.theme"); } catch (e) {}
  }
  var found = T.list.find(function (t) { return t.id === id; }) || T.list[0];
  return Object.assign({}, T.shared, found, {
    kit:        found.kit        || T.shared.kit,
    imageSlot:  found.imageSlot  || T.shared.imageSlot,
    scorm:      found.scorm      || T.shared.scorm,
    pdfCss:     found.pdfCss     || T.shared.pdfCss,
    components: found.components || T.shared.components,
    globals:    found.globals    || T.shared.globals || [],
    assets:     found.assets     || T.shared.assets || [],
    componentsBase: found.componentsBase || T.shared.componentsBase || null,
    componentsCss:  found.componentsCss  || null,
  });
};
