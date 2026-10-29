/* eslint-disable */
// ClassAtelier — verificador de acessibilidade (referência: WCAG 2.1, nível AA).
//
// Duas camadas:
//  1) Regras sobre o CONTEÚDO (alt de imagem, vídeo, áudio, tabelas, títulos, links…):
//     rápidas, apontam o bloco exato. window.A11y.audit(lesson).
//  2) Contraste de cores sobre a aula RENDERIZADA com o tema atual (fora da tela):
//     window.A11y.auditContrast(lesson).
//
// Severidades: "error" (barreira real), "warn" (provável problema), "tip" (boa prática).
(function () {
  const WCAG = {
    alt: "WCAG 1.1.1 · Conteúdo não textual",
    media: "WCAG 1.2.1 / 1.2.2 · Mídia temporal",
    heading: "WCAG 1.3.1 / 2.4.6 · Estrutura e títulos",
    title: "WCAG 2.4.2 · Página com título",
    link: "WCAG 2.4.4 · Finalidade do link",
    table: "WCAG 1.3.1 · Informação e relações",
    frame: "WCAG 4.1.2 · Nome, função, valor",
    contrast: "WCAG 1.4.3 · Contraste mínimo",
    content: "WCAG 3.1.5 · Nível de leitura",
  };

  const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
  const plain = (h) => String(h == null ? "" : h).replace(/<[^>]*>/g, " ").replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => entities[m]).replace(/\s+/g, " ").trim();
  const clip = (t, n = 60) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

  const TOPICS = ["topic", "topic-collapsible", "topic-slider"];

  // Filhos de um bloco (tópicos, colunas, accordion, linha do tempo).
  function childrenOf(b) {
    const p = b.props || {}, out = [];
    if (Array.isArray(p.children)) out.push(...p.children);
    (p.columns || []).forEach((c) => { if (c && Array.isArray(c.children)) out.push(...c.children); });
    (p.items || []).forEach((c) => { if (c && Array.isArray(c.children)) out.push(...c.children); });
    (p.eras || []).forEach((e) => (e.events || []).forEach((ev) => { if (ev && Array.isArray(ev.children)) out.push(...ev.children); }));
    return out.filter((c) => c && c.type);
  }
  function walk(blocks, fn, trail) {
    (blocks || []).forEach((b) => {
      const t = trail || [];
      fn(b, t);
      walk(childrenOf(b), fn, t.concat(b.id));
    });
  }
  // Procura strings com HTML (marca-texto, links) em qualquer profundidade das props.
  function eachRichString(value, fn) {
    if (typeof value === "string") { if (/<a\b/i.test(value)) fn(value); return; }
    if (Array.isArray(value)) { value.forEach((v) => eachRichString(v, fn)); return; }
    if (value && typeof value === "object") Object.keys(value).forEach((k) => { if (k !== "children" && k !== "src") eachRichString(value[k], fn); });
  }

  const GENERIC_LINK = /^(clique\s+aqui|clic(a|ar)\s+aqui|aqui|saiba\s+mais|veja\s+mais|leia\s+mais|mais|link|acesse|acessar|ver\s+mais|este\s+link|esse\s+link|click\s+here|here|read\s+more)\.?$/i;
  const PLACEHOLDER_HREF = (h) => { const s = String(h || "").trim(); return !s || s === "#" || /^https?:\/\/$/i.test(s); };

  const blocks0 = (l) => (l && l.blocks) || [];
  function audit(lesson) {
    const issues = [];
    const trailOf = new Map();
    walk(blocks0(lesson), (b, trail) => { trailOf.set(b.id, trail); });
    const add = (sev, rule, block, title, detail, wcag, extra) =>
      issues.push(Object.assign({ sev, rule, blockId: block ? block.id : null, trail: block ? (trailOf.get(block.id) || []) : [], title, detail, wcag: wcag || "" }, extra || {}));
    const L = lesson || {}, meta = L.meta || {}, blocks = L.blocks || [];

    // ── Aula como um todo ──
    if (!plain(meta.title)) add("error", "meta-title", null, "A aula não tem título", "Preencha o título da aula (no bloco de abertura). Ele aparece na aba do navegador e é a primeira coisa que um leitor de tela anuncia.", WCAG.title);
    if (!blocks.some((b) => b.type === "hero")) add("warn", "no-hero", null, "A aula não tem a abertura (Hero)", "Sem a abertura não existe o título principal visível (h1). Insira o bloco “Abertura (Hero)” no topo.", WCAG.heading);

    // ── Títulos, na ordem do documento ──
    const outline = [];
    walk(blocks, (b, trail) => {
      const p = b.props || {};
      if (b.type === "hero") outline.push({ lvl: 1, text: plain(p.title), b });
      else if (b.type === "divider") outline.push({ lvl: 2, text: plain(p.label), b, kind: "rótulo do capítulo" });
      else if (b.type === "titulo") outline.push({ lvl: Math.min(6, Math.max(1, parseInt(String(p.level || "h2").replace(/\D/g, ""), 10) || 2)), text: plain(p.text), b, kind: "título de seção" });
      else if (b.type === "sintese") outline.push({ lvl: 2, text: plain(p.title), b, kind: "síntese" });
      else if (b.type === "parallax" && plain(p.overlayTitle)) outline.push({ lvl: 2, text: plain(p.overlayTitle), b });
      else if (b.type === "referencias") outline.push({ lvl: 2, text: plain(p.title), b, kind: "referências" });
    });
    let prev = 0;
    outline.forEach((h) => {
      if (!h.text) add("error", "heading-empty", h.b, "Título vazio", `Há um ${h.kind || "título"} sem texto. Leitores de tela anunciam “título” sem dizer nada; preencha ou remova o bloco.`, WCAG.heading);
      if (prev && h.lvl > prev + 1) add("warn", "heading-skip", h.b, `Salto de nível de título (h${prev} → h${h.lvl})`, `“${clip(h.text)}” pula um nível. Use h${prev + 1} aqui (propriedade “Nível” do título de seção), para a navegação por títulos fazer sentido.`, WCAG.heading);
      if (h.text.length > 140) add("tip", "heading-long", h.b, "Título muito longo", `“${clip(h.text, 50)}” tem ${h.text.length} caracteres. Títulos curtos são mais fáceis de navegar e de ouvir.`, WCAG.heading);
      prev = h.lvl;
    });
    const totalBlocks = (() => { let n = 0; walk(blocks, () => { n += 1; }); return n; })();
    if (!outline.length && totalBlocks > 6) add("warn", "no-headings", null, "A aula não tem títulos de seção", "Quem usa leitor de tela navega por títulos. Divida a aula com blocos “Título de seção” ou “Divisor de capítulo”.", WCAG.heading);

    // ── Blocos ──
    walk(blocks, (b) => {
      const p = b.props || {};
      switch (b.type) {
        case "imagem":
        case "parallax":
        case "textoimagem": {
          const cap = plain(p.caption || p.legenda);
          if (!p.src) { add("warn", "img-empty", b, "Bloco de imagem sem imagem", "O espaço da imagem está vazio. Envie uma imagem ou remova o bloco.", WCAG.alt); break; }
          const alt = plain(p.alt);
          if (p.decorative) break;
          if (!alt) {
            if (!cap) add("error", "img-alt", b, "Imagem sem descrição", "Não há texto alternativo nem legenda. Quem não enxerga a imagem não recebe nada. Preencha “Texto alternativo” no painel, ou marque “Imagem decorativa” se ela só enfeita.", WCAG.alt);
            else add("tip", "img-alt-caption", b, "Imagem só com legenda", `A legenda (“${clip(cap, 40)}”) normalmente complementa a imagem, não a descreve. Acrescente um “Texto alternativo” com o que a imagem mostra.`, WCAG.alt);
          } else {
            if (alt.length > 160) add("tip", "img-alt-long", b, "Texto alternativo longo", `Com ${alt.length} caracteres. Prefira até ~150; se for um gráfico complexo, descreva os dados no texto da aula.`, WCAG.alt);
            if (/\.(jpe?g|png|gif|webp|svg)$/i.test(alt) || /^(img|dsc|image|foto|screenshot)[\s_-]?\d+/i.test(alt)) add("warn", "img-alt-file", b, "Texto alternativo parece nome de arquivo", `“${clip(alt, 40)}” não descreve a imagem.`, WCAG.alt);
            else if (/^(imagem|foto|figura|ilustra[cç][aã]o)\s+(de|do|da)\b/i.test(alt)) add("tip", "img-alt-prefix", b, "Texto alternativo começa com “imagem de…”", "O leitor de tela já diz que é uma imagem; comece direto pelo que ela mostra.", WCAG.alt);
          }
          break;
        }
        case "cases":
          (p.cards || []).forEach((c, i) => { if (c && c.mediaType === "image" && c.src && !plain(c.title)) add("warn", "img-alt", b, `Card ${i + 1}: imagem sem título`, "A imagem do card usa o título como descrição; sem título ela fica muda.", WCAG.alt); });
          break;
        case "filmstrip":
          (p.items || []).forEach((it, i) => { if (it && it.src && !plain(it.title)) add("warn", "img-alt", b, `Item ${i + 1} da galeria: imagem sem título`, "O título do item é a descrição da imagem para leitores de tela. Preencha-o.", WCAG.alt); });
          break;
        case "video": {
          if (!p.id || p.id === "dQw4w9WgXcQ") add("error", "video-placeholder", b, "Vídeo de exemplo ainda no lugar", "O endereço é o vídeo-modelo que vem com o bloco. Troque pelo seu vídeo.", WCAG.media);
          const t = plain(p.title);
          if (!t || /^v[ií]deo$/i.test(t)) add("warn", "video-title", b, "Vídeo sem título descritivo", "O título do vídeo é o nome que o leitor de tela anuncia no player. Use algo como “Entrevista com a coordenadora (8 min)”.", WCAG.frame);
          add("tip", "video-captions", b, "Confirme legendas ou transcrição", "Vídeos precisam de legendas (surdos e ensurdecidos) e de alternativa em texto. No YouTube, ative as legendas e, se possível, ofereça a transcrição na própria aula.", WCAG.media);
          break;
        }
        case "audio": {
          const d = plain(p.description);
          if (!p.src && !p.spotify) add("warn", "audio-empty", b, "Bloco de áudio sem arquivo", "Informe o arquivo ou o endereço do áudio.", WCAG.media);
          if (d.length < 250) add("warn", "audio-transcript", b, "Áudio sem transcrição", "Quem não ouve precisa de um texto equivalente. Cole a transcrição do episódio (ou um link para ela) na descrição ou em um bloco logo abaixo.", WCAG.media);
          break;
        }
        case "externalembed": {
          if (!p.embed) { add("warn", "embed-empty", b, "Conteúdo externo sem endereço", "Cole a URL ou o código de incorporação, ou remova o bloco.", WCAG.frame); break; }
          const t = plain(p.title);
          if (!t || /^conte[uú]do incorporado$/i.test(t)) add("warn", "embed-title", b, "Conteúdo externo sem título", "O iframe precisa de um título que diga o que ele contém (ex.: “Mapa interativo dos campi”).", WCAG.frame);
          add("tip", "embed-manual", b, "Teste o conteúdo externo com o teclado", "Não dá para verificar o que está dentro do iframe. Navegue com Tab e confirme que dá para entrar e sair dele.", WCAG.frame);
          break;
        }
        case "tabela": {
          const heads = (p.headers || []).map(plain);
          if (!heads.length || heads.every((h) => !h)) add("error", "table-headers", b, "Tabela sem cabeçalhos", "As colunas não têm título. Sem cabeçalho, o leitor de tela lê só uma sequência de células soltas.", WCAG.table);
          else if (heads.some((h) => !h)) add("warn", "table-header-cell", b, "Cabeçalho de coluna vazio", "Alguma coluna não tem título. Preencha todos os cabeçalhos.", WCAG.table);
          if (!plain(p.caption)) add("warn", "table-caption", b, "Tabela sem legenda", "A legenda diz do que trata a tabela e é anunciada antes dela.", WCAG.table);
          if (heads.length > 6) add("tip", "table-wide", b, "Tabela com muitas colunas", `${heads.length} colunas. No celular ela rola de lado e fica difícil de ler; considere dividir.`, WCAG.table);
          if (p.destacarPrimeira === false && (p.rows || []).length > 1) add("tip", "table-rowhead", b, "Primeira coluna não é cabeçalho de linha", "Se a primeira coluna nomeia a linha (ex.: nomes, anos), ative “destacar primeira coluna” para ela ser lida como cabeçalho.", WCAG.table);
          break;
        }
        case "materiais":
          (p.items || []).forEach((it, i) => {
            if (PLACEHOLDER_HREF(it.href)) add("error", "link-empty", b, `Material ${i + 1} sem endereço`, "O link está vazio ou ainda é “https://”. Cole o endereço real ou remova o item.", WCAG.link);
            if (!plain(it.title)) add("warn", "link-text", b, `Material ${i + 1} sem título`, "O título é o texto do link; sem ele o link fica sem nome.", WCAG.link);
          });
          break;
        case "prose": {
          const t = plain(p.body);
          if (!t) add("warn", "text-empty", b, "Parágrafo vazio", "Preencha ou remova o bloco.", WCAG.content);
          else if (t.length > 1400) add("tip", "text-long", b, "Parágrafo muito longo", `${t.length} caracteres seguidos. Quebre em parágrafos menores ou use um título; ajuda a todos, e muito quem tem dislexia ou baixa visão.`, WCAG.content);
          break;
        }
        case "forum":
          if (!plain(p.title)) add("warn", "text-empty", b, "Fórum sem título", "Dê um título ao fórum para o aluno saber do que se trata.", WCAG.content);
          if (!plain(p.prompt)) add("warn", "text-empty", b, "Fórum sem pergunta", "Escreva a pergunta ou o tema da discussão.", WCAG.content);
          if (PLACEHOLDER_HREF(p.href)) add("error", "link-empty", b, "Fórum sem endereço", "Cole no painel o link do fórum de verdade (ainda está vazio ou “https://”); sem ele o botão não leva a lugar nenhum.", WCAG.link);
          break;
        case "equacao": {
          const lx = String(p.latex || "").trim();
          if (!lx) add("warn", "text-empty", b, "Equação vazia", "Escreva a fórmula no painel ou remova o bloco.", WCAG.content);
          else { const r = window.renderEquation ? window.renderEquation(lx) : null; if (r && r.error) add("warn", "math-error", b, "Fórmula com erro de sintaxe", "O KaTeX não conseguiu desenhar a fórmula: " + r.error, WCAG.alt); }
          break;
        }
        case "citacao":
          if (!plain(p.quote)) add("warn", "text-empty", b, "Citação vazia", "Preencha ou remova o bloco.", WCAG.content);
          break;
        case "flashcards": case "slider": case "accordion":
          add("tip", "interactive-keyboard", b, "Teste este bloco só com o teclado", "Confirme que dá para abrir, virar e avançar usando Tab, Enter e as setas.", "WCAG 2.1.1 · Teclado", { once: b.type });
          break;
        default: break;
      }
      // links dentro de textos formatados
      eachRichString(p, (html) => {
        const box = document.createElement("div"); box.innerHTML = html;
        box.querySelectorAll("a").forEach((a) => {
          const txt = plain(a.textContent), href = (a.getAttribute("href") || "").trim();
          if (!txt) add("error", "link-noname", b, "Link sem texto", "Existe um link vazio. Leitores de tela anunciam apenas “link”.", WCAG.link);
          else if (GENERIC_LINK.test(txt)) add("warn", "link-generic", b, `Link “${txt}”`, "O texto do link deve dizer para onde ele leva (ex.: “relatório do INEP de 2024”), pois muita gente navega só pela lista de links.", WCAG.link);
          if (a.hasAttribute("href") && PLACEHOLDER_HREF(href) && !a.classList.contains("termo")) add("error", "link-empty", b, `Link sem destino${txt ? ` (“${clip(txt, 30)}”)` : ""}`, "O endereço está vazio ou é “#”.", WCAG.link);
        });
      });
    });

    // dicas por tipo aparecem uma vez só (evita lista repetida)
    const seen = new Set();
    const out = issues.filter((i) => { if (!i.once) return true; if (seen.has(i.once)) return false; seen.add(i.once); return true; });
    const order = { error: 0, warn: 1, tip: 2 };
    out.forEach((i, k) => { i.n = k; });
    out.sort((a, b) => order[a.sev] - order[b.sev] || a.n - b.n);
    return out;
  }

  // ── contraste ──
  function parseColor(s) {
    const m = /rgba?\(([^)]+)\)/.exec(s || ""); if (!m) return null;
    const v = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 && !isNaN(v[3]) ? v[3] : 1 };
  }
  const over = (top, bottom) => { const a = top.a + bottom.a * (1 - top.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; const f = (c) => (top[c] * top.a + bottom[c] * bottom.a * (1 - top.a)) / a; return { r: f("r"), g: f("g"), b: f("b"), a }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

  // fundo efetivo: camadas de baixo para cima; imagem/gradiente => desconhecido (null)
  function backdrop(el, rootBg) {
    const layers = []; let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      node = node.parentElement;
    }
    let acc = rootBg;
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  }

  function auditContrastIn(root) {
    const rootBg = (() => {
      const c = parseColor(getComputedStyle(document.body).backgroundColor);
      return c && c.a > 0 ? c : { r: 255, g: 255, b: 255, a: 1 };
    })();
    const groups = new Map();
    root.querySelectorAll("*").forEach((el) => {
      if (/^(SCRIPT|STYLE|SVG|IMAGE-SLOT|IFRAME|IMG|NOSCRIPT)$/i.test(el.tagName) || el.closest("svg,image-slot,iframe")) return;
      let hasText = false;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim().length > 1) { hasText = true; break; }
      if (!hasText) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      const fg0 = parseColor(cs.color); if (!fg0) return;
      const bg = backdrop(el, rootBg); if (!bg) return; // imagem ou gradiente: não dá para medir
      const op = parseFloat(cs.opacity); const fg = over({ ...fg0, a: fg0.a * (isNaN(op) ? 1 : op) }, bg);
      const size = parseFloat(cs.fontSize) || 16, bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold), need = large ? 3 : 4.5;
      const r = ratio(fg, bg); if (r >= need) return;
      const key = hex(fg) + "|" + hex(bg) + "|" + (large ? "L" : "N");
      const text = clip(plain(el.textContent), 70);
      let g = groups.get(key);
      if (!g) { g = { fg: hex(fg), bg: hex(bg), ratio: r, need, large, count: 0, samples: [] }; groups.set(key, g); }
      g.count += 1; if (g.samples.length < 3 && !g.samples.includes(text)) g.samples.push(text);
    });
    return [...groups.values()].sort((a, b) => a.ratio - b.ratio).slice(0, 12).map((g, i) => ({
      sev: g.ratio < 3 ? "error" : "warn", rule: "contrast", blockId: null, trail: [], n: i,
      title: `Contraste baixo: ${g.ratio.toFixed(1)}:1 (mínimo ${g.need}:1)`,
      detail: `Texto ${g.fg} sobre ${g.bg}${g.large ? " (texto grande)" : ""}, em ${g.count} ocorrência${g.count === 1 ? "" : "s"}. Exemplo${g.samples.length > 1 ? "s" : ""}: ${g.samples.map((s) => "“" + s + "”").join(" · ")}. Escureça o texto ou mude o fundo/tema.`,
      wcag: WCAG.contrast, find: g.samples[0], swatch: { fg: g.fg, bg: g.bg },
    }));
  }

  // Renderiza a aula (modo visualização, tema atual) fora da tela e mede o contraste.
  async function auditContrast(lesson) {
    if (!window.LessonRenderer || !window.ReactDOM) return [];
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:800px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(host);
    const mount = document.createElement("div"); mount.style.background = "var(--paper)"; host.appendChild(mount);
    let root;
    try {
      root = ReactDOM.createRoot(mount);
      ReactDOM.flushSync(() => root.render(React.createElement(window.LessonRenderer, { lesson, mode: "preview", chrome: false })));
      await new Promise((r) => setTimeout(r, 350));
      return auditContrastIn(mount);
    } catch (e) {
      console.warn("A11y contraste:", e); return null;
    } finally {
      try { root && root.unmount(); } catch (e) {}
      host.remove();
    }
  }

  // Chave estável de um item: o que a pessoa marcou como "OK" não volta a aparecer.
  // "regra|*" vale para todos os itens daquele tipo na aula.
  const keyOf = (i) => (i.rule === "contrast" && i.swatch ? "contrast|" + i.swatch.fg + "|" + i.swatch.bg : i.rule + "|" + (i.blockId || "") + "|" + i.title);
  const ruleKey = (i) => i.rule + "|*";
  const isIgnored = (i, list) => { const set = list instanceof Set ? list : new Set(list || []); return set.has(keyOf(i)) || set.has(ruleKey(i)); };
  window.A11y = { audit, auditContrast, plain, WCAG, keyOf, ruleKey, isIgnored };
})();

// ── Painel lateral ──
function A11yPanel({ lesson, onClose, onGoto, ignored, onIgnored }) {
  const [tab, setTab] = React.useState("all");
  const [contrast, setContrast] = React.useState({ state: "idle", items: [] });
  const [tick, setTick] = React.useState(0);
  const base = React.useMemo(() => window.A11y.audit(lesson), [lesson]);
  React.useEffect(() => {
    let live = true; setContrast((c) => ({ state: "running", items: c.items }));
    const t = setTimeout(async () => {
      const items = await window.A11y.auditContrast(lesson);
      if (live) setContrast(items === null ? { state: "fail", items: [] } : { state: "done", items });
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [tick]); // contraste só roda ao abrir e ao pedir de novo
  const ignoredSet = React.useMemo(() => new Set(ignored || []), [ignored]);
  const rank = { error: 0, warn: 1, tip: 2 };
  const found = base.concat(contrast.items);
  found.sort((a, b) => rank[a.sev] - rank[b.sev]);
  const all = found.filter((i) => !window.A11y.isIgnored(i, ignoredSet));
  const hidden = found.filter((i) => window.A11y.isIgnored(i, ignoredSet));
  const count = (s) => all.filter((i) => i.sev === s).length;
  const shown = tab === "ok" ? hidden : tab === "all" ? all : all.filter((i) => i.sev === tab);
  const mark = (keys) => onIgnored(Array.from(new Set((ignored || []).concat(keys))));
  const unmark = (i) => onIgnored((ignored || []).filter((k) => k !== window.A11y.keyOf(i) && k !== window.A11y.ruleKey(i)));
  const sameRule = (i) => found.filter((x) => x.rule === i.rule).length;
  const meta = { error: { label: "Erro", color: "#b3372a", bg: "#f9e1dc" }, warn: { label: "Aviso", color: "#8a5a00", bg: "#fbefcf" }, tip: { label: "Sugestão", color: "#2c5b7a", bg: "#e3eef5" } };
  const chip = (id, label, n, color) => (
    <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
      style={{ border: "1px solid " + (tab === id ? "var(--tool-ink)" : "var(--tool-line-2)"), background: tab === id ? "var(--tool-ink)" : "#fff", color: tab === id ? "#fff" : (color || "var(--tool-ink)"), borderRadius: 999, padding: "4px 11px", fontSize: 12, fontWeight: 650, cursor: "pointer" }}>
      {label} · {n}
    </button>
  );
  const btn = { flex: "none", whiteSpace: "nowrap", border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 650, cursor: "pointer" };
  const goto = (i) => {
    if (i.blockId) onGoto(i.blockId, i.trail);
    else if (i.find) onGoto(null, [], i.find);
  };
  return (
    <aside role="complementary" aria-label="Verificação de acessibilidade" data-a11y-panel
      style={{ position: "fixed", top: 52, left: 0, bottom: 0, width: "min(330px, 94vw)", zIndex: 60, background: "var(--tool-surface)", borderRight: "1px solid var(--tool-line)", boxShadow: "12px 0 32px rgba(0,0,0,.12)", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "14px 16px 10px", background: "#fff", borderBottom: "1px solid var(--tool-line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>Acessibilidade</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tool-ink-3)", lineHeight: 1.4 }}>Confere a aula contra o WCAG 2.1 AA. “Ir ao bloco” seleciona o item; corrija no painel à direita.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar painel de acessibilidade" style={{ border: 0, background: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          {chip("all", "Todos", all.length)}{chip("error", "Erros", count("error"), meta.error.color)}{chip("warn", "Avisos", count("warn"), meta.warn.color)}{chip("tip", "Sugestões", count("tip"), meta.tip.color)}{hidden.length > 0 && chip("ok", "Marcados OK", hidden.length, "#2f7d4f")}
        </div>
      </header>
      <div className="tool-scroll" style={{ flex: 1, overflow: "auto", padding: "12px 14px 24px" }}>
        {contrast.state === "running" && <p style={{ fontSize: 12, color: "var(--tool-ink-3)", margin: "0 0 10px" }}>Medindo o contraste das cores…</p>}
        {contrast.state === "fail" && <p style={{ fontSize: 12, color: "var(--tool-ink-3)", margin: "0 0 10px" }}>Não consegui medir o contraste desta aula; as demais regras valem.</p>}
        {!shown.length && contrast.state !== "running" && (
          <div style={{ padding: 18, border: "1px dashed var(--tool-line-2)", borderRadius: 10, fontSize: 13, color: "var(--tool-ink-2)", background: "#fff" }}>
            {tab === "ok" ? "Nada marcado como OK." : all.length ? "Nada nesta categoria." : <><b>{hidden.length ? "Tudo revisado: o que sobrou foi marcado como OK." : "Nenhum problema encontrado nas regras automáticas."}</b><br />Isso não garante acessibilidade total: veja a lista de conferências manuais abaixo.</>}
          </div>
        )}
        {shown.map((i, k) => {
          const m = meta[i.sev];
          return (
            <div key={i.rule + ":" + (i.blockId || "x") + ":" + k} style={{ background: "#fff", border: "1px solid var(--tool-line)", borderLeft: "4px solid " + m.color, borderRadius: 9, padding: "10px 12px", marginBottom: 9 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: m.color, background: m.bg, borderRadius: 5, padding: "2px 6px" }}>{m.label}</span>
                {i.swatch && <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 18, borderRadius: 4, background: i.swatch.bg, color: i.swatch.fg, fontSize: 11, fontWeight: 700, border: "1px solid rgba(0,0,0,.18)" }}>Aa</span>}
                <strong style={{ fontSize: 13, lineHeight: 1.3 }}>{i.title}</strong>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12.5, lineHeight: 1.5, color: "var(--tool-ink-2)" }}>{i.detail}</p>
              <div style={{ fontSize: 10.5, color: "var(--tool-ink-3)", marginBottom: 8 }}>{i.wcag}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {(i.blockId || i.find) && <button onClick={() => goto(i)} style={btn}>Ir ao bloco</button>}
                {tab === "ok"
                  ? <button onClick={() => unmark(i)} style={btn}>Reativar</button>
                  : <button onClick={() => mark([window.A11y.keyOf(i)])} title="Já revisei: não apontar este item de novo" style={{ ...btn, borderColor: "#2f7d4f", color: "#2f7d4f" }}>✓ Está OK</button>}
                {tab !== "ok" && sameRule(i) > 1 && <button onClick={() => mark([window.A11y.ruleKey(i)])} title="Não apontar mais nenhum item deste tipo nesta aula" style={{ ...btn, border: 0, background: "none", color: "var(--tool-ink-3)", textDecoration: "underline", fontWeight: 600, padding: "4px 2px" }}>OK em todos deste tipo ({sameRule(i)})</button>}
              </div>
            </div>
          );
        })}
        <details style={{ marginTop: 14, background: "#fff", border: "1px solid var(--tool-line)", borderRadius: 9, padding: "10px 12px" }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 650 }}>Conferências que só uma pessoa faz</summary>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55, color: "var(--tool-ink-2)" }}>
            <li>Navegue pela aula exportada só com o teclado (Tab, Shift+Tab, Enter, setas).</li>
            <li>Aumente o zoom do navegador para 200% e confirme que nada fica cortado.</li>
            <li>Ouça um trecho com leitor de tela (NVDA, VoiceOver ou TalkBack).</li>
            <li>Veja se o significado não depende só de cor (ex.: “o item em vermelho”).</li>
            <li>Confirme legendas nos vídeos e transcrição nos áudios.</li>
            <li>Releia o texto: frases curtas, siglas explicadas na primeira vez.</li>
          </ul>
        </details>
        <button onClick={() => setTick((t) => t + 1)} style={{ marginTop: 14, width: "100%", border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontWeight: 650, cursor: "pointer" }}>Medir contraste de novo</button>
      </div>
    </aside>
  );
}
Object.assign(window, { A11yPanel });
