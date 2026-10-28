/* eslint-disable */
// AulaStudio — block registry. The single source of truth for WHAT can be
// inserted and WITHIN WHICH LIMITS. Tone palette, default props, item
// templates and per-type editing affordances all live here.

// Fallback para temas que ainda nao implementaram `topicSurfaces`.
const LEGACY_BG_TONES = [
  // soft (dark text)
  { id: "paper",    label: "Papel",     swatch: "#FBF6EE", dark: false },
  { id: "sand",     label: "Areia",     swatch: "#F0E5CF", dark: false },
  { id: "sage",     label: "Sage",      swatch: "#DCE7D2", dark: false },
  { id: "lavender", label: "Lavanda",   swatch: "#E2DDF0", dark: false },
  { id: "coral",    label: "Coral",     swatch: "#F7DCD3", dark: false },
  { id: "ocean",    label: "Oceano",    swatch: "#CDDDE8", dark: false },
  { id: "marigold", label: "Marigold",  swatch: "#FFE8A8", dark: false },
  // strong / dark (light text)
  { id: "ink",              label: "Tinta",        swatch: "#1B1A17", dark: true },
  { id: "petrol",           label: "Petróleo",     swatch: "#143147", dark: true },
  { id: "ocean-vivid",      label: "Oceano vivo",  swatch: "#2C5B7A", dark: true },
  { id: "terracotta",       label: "Terracota",    swatch: "#D85C3C", dark: true },
  { id: "terracotta-deep",  label: "Terracota -",  swatch: "#8A2F18", dark: true },
  { id: "coral-deep",       label: "Coral -",      swatch: "#95412F", dark: true },
  { id: "marigold-deep",    label: "Marigold -",   swatch: "#B8821D", dark: true },
  { id: "sage-deep",        label: "Sage -",       swatch: "#2E4423", dark: true },
  { id: "sage-green",       label: "Sage vivo",    swatch: "#6E8B5C", dark: true },
  { id: "lavender-deep",    label: "Lavanda -",    swatch: "#3D3168", dark: true },
];
const BG_TONES = (window.AULA_ACTIVE_THEME && window.AULA_ACTIVE_THEME.topicSurfaces) || LEGACY_BG_TONES;
const TONE_BG = Object.fromEntries(BG_TONES.map((t) => [t.id, t.swatch]));

// ── Vertical-padding presets (band breathing room) ──
const PAD_PRESETS = [
  { id: "tight",  label: "Compacto", py: "clamp(24px,4vw,48px)" },
  { id: "normal", label: "Padrão",   py: "clamp(56px,8vw,96px)" },
  { id: "airy",   label: "Amplo",    py: "clamp(72px,10vw,128px)" },
];
const PAD_BY_ID = Object.fromEntries(PAD_PRESETS.map((p) => [p.id, p.py]));

// ── Block catalog ──
// kind: "text" → inline-editable via injected <Editable>
//       "list" → structural, edited in the side panel
// fields: inline text fields (for text blocks); items: array template (for list)
const BLOCKS = [
  // ───── Tópico de conteúdo (container) ─────
  {
    type: "topic", label: "Tópico de conteúdo", icon: "topic", cat: "Tópico de conteúdo",
    kind: "container", bg: "neutral-default", pad: "normal",
    props: { children: [] },
  },
  {
    type: "topic-collapsible", label: "Tópico retrátil", icon: "chevron-down", cat: "Tópico de conteúdo",
    kind: "container", bg: "neutral-default", pad: "normal",
    props: { triggerLabel: "Clique para expandir", defaultOpen: false, children: [] },
  },
  {
    type: "topic-slider", label: "Tópico slider", icon: "gallery-horizontal", cat: "Tópico de conteúdo",
    kind: "container", bg: "neutral-default", pad: "normal",
    props: { loop: true, editSlide: 0, children: [] },
  },

  // ───── Estrutura ─────
  {
    type: "hero", label: "Abertura (Hero)", icon: "book-open", cat: "Estrutura",
    kind: "text", bgLocked: true, bg: "neutral-default", pad: "normal",
    fields: [
      { key: "eyebrow", placeholder: "Sobrelinha (ex.: Biologia · Aula 3)", single: true },
      { key: "title",   placeholder: "Título da aula" },
      { key: "lead",    placeholder: "Linha de abertura, o gancho da aula." },
    ],
    props: {
      eyebrow: "Categoria · Aula",
      title: "Título da sua aula",
      lead: "Uma frase de abertura que fisga o aluno e prepara o tema.",
      author: "Autor", authorImage: "", readTime: "8 min", date: "2026",
    },
  },
  {
    type: "divider", label: "Divisor de capítulo", icon: "type", cat: "Estrutura",
    kind: "text", bg: "neutral-default", pad: "tight",
    fields: [{ key: "label", placeholder: "Rótulo do capítulo", single: true }],
    props: { label: "Parte 1" },
  },
  {
    type: "pagebreak", label: "Quebra de página (PDF)", icon: "file-text", cat: "Estrutura",
    kind: "marker", pdfOnly: true, bgLocked: true, bg: "neutral-default", pad: "tight",
    props: {},
  },
  {
    type: "titulo", label: "Título de seção", icon: "heading", cat: "Estrutura",
    kind: "text", bg: "neutral-default", pad: "tight",
    fields: [{ key: "text", placeholder: "Título da seção", single: true }],
    props: { text: "Título da seção", level: "h2" },
  },
  {
    type: "sintese", label: "Síntese (encerramento)", icon: "check-circle", cat: "Estrutura",
    kind: "text", bgLocked: true, bg: "sage-green", pad: "airy",
    fields: [
      { key: "eyebrow", placeholder: "Sobrelinha", single: true },
      { key: "title",   placeholder: "A grande ideia que fecha a aula." },
      { key: "body",    placeholder: "Recapitulação curta das ideias-chave." },
    ],
    props: { eyebrow: "Síntese", title: "A ideia que fecha a aula.", body: "Retome aqui, em poucas linhas, o essencial." },
  },
  {
    type: "referencias", label: "Referências (ABNT)", icon: "book-marked", cat: "Estrutura",
    kind: "list", bg: "neutral-default", pad: "normal",
    itemLabel: "Referência", itemFields: [{ key: "html", placeholder: "SOBRENOME, Nome. <strong>Título</strong>. Editora, ano.", rich: true }],
    props: { title: "Referências", items: ["SOBRENOME, Nome. <strong>Título da obra</strong>. Cidade: Editora, ano."] },
  },

  // ───── Texto ─────
  {
    type: "prose", label: "Parágrafo", icon: "type", cat: "Texto",
    kind: "text", bg: "neutral-default", pad: "normal",
    fields: [{ key: "body", placeholder: "Escreva o corpo do texto. Selecione palavras para aplicar marca-texto ou rabisco." }],
    props: { body: "<p>Escreva aqui. Selecione um trecho para aplicar marca-texto, rabisco ou ênfase.</p>", dropcap: false, dropcapTone: "terracotta" },
    rich: true,
  },
  {
    type: "citacao", label: "Citação", icon: "quote", cat: "Texto",
    kind: "text", bg: "accent-5-soft", pad: "normal",
    fields: [
      { key: "quote",  placeholder: "A citação, na voz de quem a disse." },
      { key: "author", placeholder: "Autor", single: true },
      { key: "source", placeholder: "Fonte / obra", single: true },
    ],
    props: { quote: "Uma frase marcante que merece destaque editorial.", author: "Autor", source: "Obra, ano", showAttribution: true },
  },
  {
    type: "eyebrow", label: "Eyebrow (sobrelinha)", icon: "heading", cat: "Texto",
    kind: "text", bg: "neutral-default", pad: "tight",
    fields: [{ key: "text", placeholder: "Sobrelinha", single: true }],
    props: { text: "Sobrelinha", icon: "" },
  },

  // ───── Destaques ─────
  {
    type: "destaque", label: "Destaque (Veja bem)", icon: "lightbulb", cat: "Destaques",
    kind: "text", bg: "neutral-default", pad: "tight",
    fields: [
      { key: "title", placeholder: "Veja bem", single: true },
      { key: "body",  placeholder: "O conceito-chave que o aluno não pode perder." },
    ],
    props: { title: "Veja bem", body: "<p>O conceito central que o aluno precisa reter.</p>", tone: "sage", icon: "" },
    rich: true,
  },
  {
    type: "atencao", label: "Atenção", icon: "alert-triangle", cat: "Destaques",
    kind: "text", bg: "neutral-default", pad: "tight",
    fields: [
      { key: "title", placeholder: "Atenção", single: true },
      { key: "body",  placeholder: "Um erro comum ou alerta importante." },
    ],
    props: { title: "Atenção", body: "<p>Um equívoco frequente — e como evitá-lo.</p>", tone: "coral", icon: "" },
    rich: true,
  },
  {
    type: "reflexao", label: "Reflexão", icon: "flower", cat: "Destaques",
    kind: "text", bg: "accent-3-soft", pad: "tight",
    fields: [
      { key: "title",    placeholder: "Para refletir", single: true },
      { key: "question", placeholder: "A pergunta que provoca o pensamento." },
      { key: "body",     placeholder: "Texto de apoio (opcional)." },
    ],
    props: { title: "Para refletir", question: "Uma pergunta aberta que conecta o tema à vida do aluno.", body: "", tone: "lavender", icon: "" },
    rich: true,
  },
  {
    type: "pitaco", label: "Balão de comentário", icon: "message-circle", cat: "Destaques",
    kind: "text", bg: "neutral-default", pad: "tight",
    fields: [{ key: "body", placeholder: "A observação do personagem, em tom de conversa." }],
    props: { kicker: "Pitaco do Nome", name: "Nome", role: "Cargo / papel", tone: "coral", src: "", slotId: "", body: "<p>Uma observação curta do personagem, como um comentário à margem.</p>" },
    rich: true,
  },

  // ───── Mídia ─────
  {
    type: "imagem", label: "Imagem com legenda", icon: "image", cat: "Mídia",
    kind: "text", bg: "neutral-default", pad: "normal",
    fields: [
      { key: "caption", placeholder: "Legenda da imagem", single: true },
      { key: "credit",  placeholder: "Crédito / fonte", single: true },
    ],
    props: { src: "", slotId: "", caption: "Legenda da imagem.", credit: "", ratio: "16/9" },
  },
  {
    type: "parallax", label: "Imagem Parallax", icon: "image", cat: "Mídia",
    kind: "text", bgLocked: true, bg: "neutral-default", pad: "normal",
    fields: [
      { key: "overlayTitle", placeholder: "Título sobre a imagem (opcional)", single: true },
      { key: "caption", placeholder: "Legenda da imagem", single: true },
      { key: "credit",  placeholder: "Crédito / fonte", single: true },
    ],
    props: { src: "", slotId: "", overlayTitle: "", caption: "Legenda da imagem parallax.", credit: "", height: "70vh" },
  },
  {
    type: "video", label: "Vídeo (YouTube)", icon: "play-circle", cat: "Mídia",
    kind: "list", bg: "neutral-default", pad: "normal",
    props: { id: "dQw4w9WgXcQ", title: "Vídeo", caption: "Legenda do vídeo.", credit: "", start: "" },
  },
  {
    type: "audio", label: "Áudio / Podcast", icon: "headphones", cat: "Mídia",
    kind: "list", bg: "neutral-default", pad: "normal",
    props: { spotify: "", src: "", title: "Título do episódio", show: "Podcast", description: "Breve descrição.", duration: "" },
  },
  {
    type: "cases", label: "Cards de casos", icon: "layers", cat: "Mídia",
    kind: "list", bg: "neutral-default", pad: "normal",
    itemLabel: "Card", itemFields: [
      { key: "mediaType", label: "Mídia", type: "select", options: [
        { id: "image", label: "Imagem" },
        { id: "none", label: "Sem mídia" },
        { id: "icon", label: "Ícone" },
      ] },
      { key: "src", label: "Imagem enviada", type: "image" },
      { key: "icon", label: "Ícone grande (Font Awesome)", single: true, placeholder: "ex.: scale-balanced, user-doctor, seedling" },
      { key: "tag",   placeholder: "Etiqueta", single: true, rich: true },
      { key: "title", placeholder: "Título do caso", single: true, rich: true },
      { key: "text",  placeholder: "Texto curto", rich: true },
    ],
    props: { title: "Casos reais", intro: "", columns: 2, layout: "vertical", cards: [
      { mediaType: "image", tag: "Exemplo", title: "Primeiro caso", text: "Uma situação concreta que ilustra o conceito.", src: "", slotId: "", icon: "lightbulb" },
    ] },
  },
  {
    type: "feature", label: "Destaques (ícones)", icon: "grid", cat: "Mídia",
    kind: "list", bg: "neutral-default", pad: "normal",
    itemLabel: "Destaque", itemsKey: "features",
    itemFields: [
      { key: "icon", label: "Ícone (Font Awesome)", single: true, placeholder: "ex.: dna, bolt, flask, leaf", hint: "Nome do ícone Font Awesome. Veja nomes em fontawesome.com/search (estilo sólido). Ex.: dna, bolt, flask, leaf, shield-halved, heart-pulse." },
      { key: "tone", label: "Cor do ícone", type: "swatch", options: [
        { id: "ocean", label: "Oceano", swatch: "#2C5B7A" },
        { id: "marigold", label: "Marigold", swatch: "#B8821D" },
        { id: "sage", label: "Sage", swatch: "#6E8B5C" },
        { id: "terracotta", label: "Terracota", swatch: "#D85C3C" },
        { id: "lavender", label: "Lavanda", swatch: "#7C6BAD" },
        { id: "coral", label: "Coral", swatch: "#D9645B" },
      ] },
      { key: "title", label: "Título", single: true, rich: true, placeholder: "Título curto" },
      { key: "text", label: "Texto", rich: true, placeholder: "Uma linha de explicação." },
    ],
    props: { title: "Por que isto importa", intro: "", align: "center", columns: 3, features: [
      { icon: "dna", tone: "ocean", title: "Código vivo", text: "O DNA guarda a receita de cada proteína." },
      { icon: "bolt", tone: "marigold", title: "Energia", text: "A mitocôndria converte alimento em ATP." },
      { icon: "shield-halved", tone: "sage", title: "Defesa", text: "A membrana decide o que entra e o que sai." },
    ] },
  },

  // ───── Interativos ─────
  {
    type: "textoimagem", label: "Texto + imagem", icon: "image", cat: "Mídia",
    kind: "text", bg: "neutral-default", pad: "normal",
    fields: [
      { key: "legenda", placeholder: "Legenda da figura", single: true },
      { key: "body",    placeholder: "Escreva o texto que contorna a imagem…" },
    ],
    props: {
      ordem: "texto-imagem", largura: "46%", sangria: "8%",
      src: "", slotId: "", legenda: "Figura 1. Legenda da imagem.", fonte: "",
      body: "<p>Escreva aqui o texto. Ele contorna a imagem e, quando passa da altura dela, volta a ocupar a largura inteira da coluna — como em uma revista bem diagramada.</p>",
    },
    rich: true,
  },
  {
    type: "filmstrip", label: "Filmstrip / carrossel", icon: "layers", cat: "Mídia",
    kind: "list", bg: "neutral-default", pad: "normal",
    itemLabel: "Item", itemsKey: "items", itemFields: [
      { key: "tag", label: "Etiqueta", single: true, rich: true },
      { key: "title", label: "Título", single: true, rich: true },
      { key: "text", label: "Texto", rich: true },
      { key: "back", label: "Verso / detalhe", rich: true },
    ],
    props: {
      mode: "hero", label: "Galeria", ratio: "3/2",
      items: [
        { tag: "01", title: "Primeiro item", text: "Uma legenda curta sobre a imagem.", back: "", tone: "ocean", src: "", slotId: "" },
        { tag: "02", title: "Segundo item", text: "Outra legenda curta.", back: "", tone: "terracotta", src: "", slotId: "" },
      ],
    },
  },
  {
    type: "tabela", label: "Tabela", icon: "grid", cat: "Mídia",
    kind: "list", bg: "neutral-default", pad: "normal",
    props: {
      caption: "Tabela 1. Título da tabela",
      fonte: "",
      striped: true, destacarPrimeira: true, compact: false,
      headers: ["Coluna A", "Coluna B", "Coluna C"],
      rows: [
        ["Linha 1", "Valor", "Valor"],
        ["Linha 2", "Valor", "Valor"],
      ],
    },
  },
  {
    type: "flashcards", label: "Flashcards", icon: "layers", cat: "Interativos",
    kind: "list", bg: "accent-1-soft", pad: "normal",
    itemLabel: "Card", itemFields: [
      { key: "front", placeholder: "Frente (pergunta)" },
      { key: "back",  placeholder: "Verso (resposta)" },
    ], itemsKey: "cards",
    props: { label: "Flashcards", cards: [
      { front: "Pergunta do card", back: "Resposta do card" },
      { front: "Outra pergunta", back: "Outra resposta" },
    ] },
  },
  {
    type: "slider", label: "Slider / sequência", icon: "arrow-right", cat: "Interativos",
    kind: "list", bg: "neutral-default", pad: "normal",
    itemLabel: "Slide", itemFields: [
      { key: "marker", label: "Número / marcador", placeholder: "Ex.: 01, A, Dica", single: true },
      { key: "icon", label: "Ícone (Font Awesome, substitui o marcador)", placeholder: "Ex.: lightbulb, route, check", single: true },
      { key: "title", placeholder: "Título do slide", single: true, rich: true },
      { key: "body",  placeholder: "Descrição do slide", rich: true },
    ], itemsKey: "steps",
    props: { label: "Passo a passo", steps: [
      { marker: "01", icon: "", title: "Primeiro passo", body: "Descrição do que acontece aqui." },
      { marker: "02", icon: "", title: "Segundo passo", body: "Continuação do processo." },
    ] },
  },
  {
    type: "accordion", label: "Accordion (FAQ)", icon: "list", cat: "Interativos",
    kind: "list", bg: "neutral-default", pad: "normal",
    itemLabel: "Item", itemFields: [
      { key: "title", placeholder: "Pergunta / título", single: true, rich: true },
      { key: "body", placeholder: "Resposta / conteúdo", rich: true },
    ], itemsKey: "items",
    props: { items: [
      { title: "Primeira pergunta?", body: "<p>Resposta correspondente.</p>", children: [] },
      { title: "Segunda pergunta?", body: "<p>Outra resposta.</p>", children: [] },
    ] },
  },
  {
    type: "collapsebreak", label: "Divisor retrátil", icon: "chevron-down", cat: "Estrutura",
    kind: "marker", internal: true, bgLocked: true, bg: "neutral-default", pad: "tight", props: {},
  },
  {
    type: "columns", label: "Colunas", icon: "columns", cat: "Interativos",
    kind: "list", bg: "neutral-default", pad: "normal", itemsKey: "columns",
    props: { gap: "normal", emphasis: "none", columns: [
      { title: "", body: "", children: [] },
      { title: "", body: "", children: [] },
    ] },
  },
  {
    type: "externalembed", label: "Conteúdo externo (iframe)", icon: "code", cat: "Mídia",
    kind: "list", bg: "neutral-default", pad: "normal",
    props: { title: "Conteúdo incorporado", embed: "", responsive: true, useEmbedDimensions: true, width: "", height: 600 },
  },
  {
    type: "linhadotempo", label: "Linha do tempo", icon: "list", cat: "Interativos",
    kind: "list", bg: "neutral-default", pad: "normal",
    props: {
      title: "Linha do tempo",
      eras: [
        { label: "Primeiro período", range: "ano – ano", tone: "ocean", events: [
          { date: "Ano", title: "Marco inicial", text: "Descrição do que aconteceu neste marco. Clique para abrir.", src: "", slotId: "", open: true, children: [] },
          { date: "Ano", title: "Outro marco", text: "Continuação dos acontecimentos.", src: "", slotId: "", open: false, children: [] },
        ] },
        { label: "Segundo período", range: "ano – hoje", tone: "terracotta", events: [
          { date: "Ano", title: "Marco recente", text: "O que mudou nesta fase.", src: "", slotId: "", open: false, children: [] },
        ] },
      ],
    },
  },
  {
    type: "quiz", label: "Quiz", icon: "graduation-cap", cat: "Interativos",
    kind: "list", bg: "neutral-subtle", pad: "normal",
    itemLabel: "Questão", itemsKey: "questions",
    props: {
      title: "Diagnóstico inicial", intro: "Uma atividade breve de aquecimento. Não vale nota.", avaliativo: false, passMark: 6,
      questions: [
        { objective: "", q: "Enunciado da questão?", options: ["Alternativa A", "Alternativa B", "Alternativa C"], answer: 0, explanation: "Por que a correta é a correta." },
      ],
    },
  },
  {
    type: "materiais", label: "Materiais extras", icon: "external-link", cat: "Interativos",
    kind: "list", bg: "neutral-default", pad: "normal",
    itemLabel: "Material", itemFields: [
      { key: "title", placeholder: "Título", single: true, rich: true },
      { key: "source", placeholder: "Fonte", single: true, rich: true },
      { key: "href", placeholder: "https://…", single: true },
    ], itemsKey: "items",
    props: { title: "Para ir além", items: [
      { type: "artigo", title: "Leitura recomendada", source: "Fonte", href: "https://" },
    ] },
  },
];
const BLOCK_BY_TYPE = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));
const BLOCK_CATS = ["Tópico de conteúdo", "Estrutura", "Texto", "Destaques", "Mídia", "Interativos"];

// Blocks that may live INSIDE a "Tópico de conteúdo" (share its band, compact
// spacing). Excludes page-structure blocks (hero/divider/síntese/referências)
// and the topic container itself.
const CONTAINER_TYPES = ["topic", "topic-collapsible", "topic-slider"];
const STRUCTURAL_TYPES = CONTAINER_TYPES.concat(["hero", "pagebreak", "sintese", "referencias"]);
const CHILD_TYPES = BLOCKS.filter((b) => !b.internal).map((b) => b.type).filter((t) => STRUCTURAL_TYPES.indexOf(t) === -1);
// Nested item containers intentionally exclude themselves to keep the model
// finite and the authoring UI understandable.
const NESTED_CHILD_TYPES = CHILD_TYPES.filter((t) => ["accordion", "linhadotempo", "columns"].indexOf(t) === -1);

// A leaf block living inside a topic: no band of its own (no bg/pad).
function newChildBlock(type) {
  const def = BLOCK_BY_TYPE[type];
  return {
    id: "c" + Math.random().toString(36).slice(2, 9),
    type,
    props: JSON.parse(JSON.stringify(def.props || {})),
  };
}

function defaultSurfaceForTheme(id) {
  if (window.AULA_ACTIVE_THEME && window.AULA_ACTIVE_THEME.topicSurfaces) return id;
  const legacy = {
    "neutral-default": "paper", "neutral-subtle": "sand", "neutral-inverse": "ink",
    "accent-1-soft": "marigold", "accent-2-soft": "terracotta", "accent-3-soft": "lavender",
    "accent-4-soft": "sage", "accent-5-soft": "ocean", "accent-6-soft": "coral",
  };
  return legacy[id] || id;
}

function newBlock(type) {
  const def = BLOCK_BY_TYPE[type];
  const b = {
    id: "b" + Math.random().toString(36).slice(2, 9),
    type,
    bg: defaultSurfaceForTheme(def.bg),
    pad: def.pad || "normal",
    props: JSON.parse(JSON.stringify(def.props || {})),
  };
  // A fresh topic starts with a heading + a paragraph so it's usable at once.
  if (CONTAINER_TYPES.indexOf(type) !== -1) {
    b.props = { children: [newChildBlock("titulo"), newChildBlock("prose")] };
    if (type === "topic-collapsible") { Object.assign(b.props, { triggerLabel: "Clique para expandir", defaultOpen: false }); b.props.children.push(newChildBlock("collapsebreak")); }
    if (type === "topic-slider") {
      Object.assign(b.props, { loop: true, editSlide: 0 });
      b.props.children.forEach((c) => (c.slide = 0));
      const t = newChildBlock("titulo"), p = newChildBlock("prose"); t.slide = 1; p.slide = 1; b.props.children.push(t, p);
    }
  }
  return b;
}

// ── Tool-chrome icons (builder UI only; kit Icon is for block glyphs) ──
function TIcon({ name, size = 16, color = "currentColor", stroke = 1.9 }) {
  const P = {
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    grip: <><circle cx="9" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="15" cy="18" r="1.4"/></>,
    up: <><polyline points="18 15 12 9 6 15"/></>,
    down: <><polyline points="6 9 12 15 18 9"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    pencil: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    printer: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
    sliders: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></>,
    undo: <><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></>,
    layout: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      {P[name] || null}
    </svg>
  );
}

Object.assign(window, { BLOCKS, BLOCK_BY_TYPE, BLOCK_CATS, CHILD_TYPES, NESTED_CHILD_TYPES, STRUCTURAL_TYPES, CONTAINER_TYPES, BG_TONES, TONE_BG, PAD_PRESETS, PAD_BY_ID, newBlock, newChildBlock, TIcon });
