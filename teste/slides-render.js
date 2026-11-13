/* eslint-disable */
// ClassAtelier — gerador de slides: paletas, divisão da aula em seções e desenho do HTML.
//
// A IA (no ClassAuthor, rota /api/slides) escolhe só o CONTEÚDO de cada slide, dentro de um
// catálogo fechado de tipos. Tudo o que é visual mora aqui: paleta, tipografia (Space Grotesk,
// IBM Plex Sans, JetBrains Mono), grade 1920×1080, margens de 128 px e uma escala de cinco
// tamanhos (120/72/44/32/24). O resultado é um único arquivo .html que abre em qualquer navegador:
// setas ou espaço avançam, N mostra as notas do apresentador, F põe em tela cheia e
// Ctrl+P imprime um slide por página (salve como PDF).
//
// Para criar uma paleta nova: copie um item de PALETTES e troque as cores. Todas as cores de
// texto precisam de contraste de 4,5:1 sobre o fundo em que aparecem (3:1 a partir de 44 px).
(function (root) {
  const PALETTES = [
    {
      id: "descanso", name: "Descanso", hint: "Azul-marinho e terracota sobre papel claro",
      bg: "#F4F1EA", bg2: "#E6ECEE", card: "#FBFAF6", line: "#DDD6C9", rule: "#D8D2C6",
      dark: "#0F2233", dark2: "#17324A", title: "#0F2233", ink: "#3D4A56", muted: "#5E6975",
      accent: "#A84A27", accentLight: "#E59A72", accentSoft: "#F2E1D8", warn: "#FBEDE5",
      second: "#24707B", secondSoft: "#E3ECEE", onDark: "#C9D6DE", onDarkMuted: "#8FA3B2", onAccent: "#FBF7F0", onAccentMuted: "#F4E3D8"
    },
    {
      id: "floresta", name: "Floresta", hint: "Verde-escuro e ocre, tons de mata",
      bg: "#F5F3EC", bg2: "#E7EEE8", card: "#FBFAF5", line: "#DCD8CA", rule: "#D6D1C1",
      dark: "#14291F", dark2: "#1E3A2D", title: "#14291F", ink: "#3B4A42", muted: "#5B6B62",
      accent: "#8A5212", accentLight: "#E3B470", accentSoft: "#F1E4D0", warn: "#F8EEDF",
      second: "#2F6B4F", secondSoft: "#E1ECE5", onDark: "#CBDCD2", onDarkMuted: "#93AE9F", onAccent: "#FCF7EE", onAccentMuted: "#F3E5CF"
    },
    {
      id: "grafite", name: "Grafite", hint: "Cinza-grafite e azul, sóbrio e técnico",
      bg: "#F4F5F7", bg2: "#E8ECF1", card: "#FBFBFC", line: "#DADDE3", rule: "#D3D7DE",
      dark: "#1E2328", dark2: "#2A3138", title: "#1E2328", ink: "#3F4752", muted: "#5D6673",
      accent: "#2F5FA8", accentLight: "#8DB4F0", accentSoft: "#E1E9F6", warn: "#FDF0E3",
      second: "#4A5A6A", secondSoft: "#E6EAEF", onDark: "#CDD3DA", onDarkMuted: "#97A1AD", onAccent: "#F7FAFE", onAccentMuted: "#DCE6F5"
    },
    { id: "oceano", name: "Oceano", hint: "Azul-petróleo e coral, tons de mar",
    bg: "#F2F5F6", bg2: "#E2ECEF", card: "#FAFCFC", line: "#D3DEE2", rule: "#CCD8DC",
    dark: "#0A2A36", dark2: "#12404F", title: "#0A2A36", ink: "#34484F", muted: "#586B72",
    accent: "#A63B39", accentLight: "#F09A8C", accentSoft: "#F6DEDA", warn: "#FBEAE7",
    second: "#1F6F8B", secondSoft: "#DDEBF0", onDark: "#C5D8DE", onDarkMuted: "#8AA6AF", onAccent: "#FFF6F4", onAccentMuted: "#FBE6E2" },
    { id: "vinho", name: "Vinho", hint: "Bordô e dourado, tom acadêmico",
    bg: "#F6F2EE", bg2: "#EEE5E1", card: "#FCFAF8", line: "#E0D5CE", rule: "#D9CCC4",
    dark: "#3A1220", dark2: "#521B2E", title: "#3A1220", ink: "#4A3A3F", muted: "#6E5D62",
    accent: "#8C5A0E", accentLight: "#E6BC6A", accentSoft: "#F3E6CC", warn: "#F9EFDD",
    second: "#7A2E45", secondSoft: "#F0E0E5", onDark: "#E8D3D9", onDarkMuted: "#B793A0", onAccent: "#FFF9EE", onAccentMuted: "#F5E5C8" },
    { id: "lavanda", name: "Lavanda", hint: "Roxo profundo e verde-água",
    bg: "#F5F3F8", bg2: "#E9E5F1", card: "#FCFBFE", line: "#DCD6E6", rule: "#D4CDE0",
    dark: "#23173F", dark2: "#33245A", title: "#23173F", ink: "#403A4F", muted: "#635C73",
    accent: "#6B3FA0", accentLight: "#B79BE0", accentSoft: "#E9E0F5", warn: "#F3EDFA",
    second: "#1E7A72", secondSoft: "#DDEFEC", onDark: "#D4CCE6", onDarkMuted: "#9C91B8", onAccent: "#FAF7FF", onAccentMuted: "#E3D8F4" },
    { id: "areia", name: "Areia", hint: "Café e laranja queimado, tons de terra",
    bg: "#F7F2EA", bg2: "#EFE6D8", card: "#FCF9F4", line: "#E3D8C6", rule: "#DBCDB7",
    dark: "#2B1D12", dark2: "#3F2B1B", title: "#2B1D12", ink: "#4A3F35", muted: "#6E6255",
    accent: "#A8431A", accentLight: "#F0A274", accentSoft: "#F6E0D2", warn: "#FBEDE3",
    second: "#546E33", secondSoft: "#E7EEDC", onDark: "#E3D6C6", onDarkMuted: "#AE9A84", onAccent: "#FFF8F2", onAccentMuted: "#F7DFCF" },
    { id: "ipe", name: "Ipê", hint: "Magenta de ipê e verde-folha",
    bg: "#F8F3F4", bg2: "#F0E6EA", card: "#FDFAFB", line: "#E5D6DC", rule: "#DDCCD3",
    dark: "#2A1426", dark2: "#3E1E39", title: "#2A1426", ink: "#47394A", muted: "#6B5C6C",
    accent: "#A82D68", accentLight: "#F08DBB", accentSoft: "#F7DDE9", warn: "#FBEBF2",
    second: "#4F7A28", secondSoft: "#E5EEDA", onDark: "#E6D3E2", onDarkMuted: "#B394AD", onAccent: "#FFF6FA", onAccentMuted: "#F8D9E7" },
    { id: "contraste", name: "Alto contraste", hint: "Preto, azul e amarelo, para projetor fraco",
    bg: "#FFFFFF", bg2: "#EEF1F5", card: "#FFFFFF", line: "#C9D0D9", rule: "#BFC7D1",
    dark: "#0B0D12", dark2: "#1B2230", title: "#0B0D12", ink: "#1F2630", muted: "#3F4856",
    accent: "#0A4FB8", accentLight: "#FFD23F", accentSoft: "#E1ECFB", warn: "#FFF4CC",
    second: "#8A1C1C", secondSoft: "#F8E1E1", onDark: "#E6EAF0", onDarkMuted: "#AAB4C2", onAccent: "#FFFFFF", onAccentMuted: "#DCE8FB" },
    { id: "turquesa", name: "Turquesa", hint: "Verde-azulado profundo e âmbar",
    bg: "#F1F6F5", bg2: "#E0EDEB", card: "#FAFCFC", line: "#D1E0DD", rule: "#C9DAD6",
    dark: "#073B3A", dark2: "#0B5250", title: "#073B3A", ink: "#2F4644", muted: "#55696A",
    accent: "#7D5800", accentLight: "#F2C14E", accentSoft: "#F5EACB", warn: "#FAF1D9",
    second: "#0F6E67", secondSoft: "#DDEEEB", onDark: "#C8E0DD", onDarkMuted: "#8DB3AF", onAccent: "#FFFBF0", onAccentMuted: "#F6E8C4" },
    { id: "rubi", name: "Rubi", hint: "Carvão e vermelho-rubi, sóbrio e forte",
    bg: "#F6F4F3", bg2: "#ECE7E6", card: "#FCFBFA", line: "#DDD6D4", rule: "#D5CDCB",
    dark: "#1F1A1C", dark2: "#2F282B", title: "#1F1A1C", ink: "#3F3A3C", muted: "#655F61",
    accent: "#B0122E", accentLight: "#FF8A9A", accentSoft: "#F7DADF", warn: "#FCEBEE",
    second: "#35577D", secondSoft: "#E0E8F1", onDark: "#E3DCDE", onDarkMuted: "#A99FA3", onAccent: "#FFF5F6", onAccentMuted: "#FBD9DE" },
    { id: "nordico", name: "Nórdico", hint: "Azul-ardósia e verde-menta, claro e frio",
    bg: "#F3F5F7", bg2: "#E4E9EE", card: "#FBFCFD", line: "#D5DCE3", rule: "#CDD5DD",
    dark: "#1E2A38", dark2: "#2B3A4C", title: "#1E2A38", ink: "#3A4654", muted: "#5D6876",
    accent: "#2A7354", accentLight: "#8FE0B8", accentSoft: "#DCF0E6", warn: "#E9F6EF",
    second: "#6E4A93", secondSoft: "#ECE4F4", onDark: "#CFD8E2", onDarkMuted: "#95A4B5", onAccent: "#F5FFFA", onAccentMuted: "#D3EDE0" }
  ];
  const paletteById = (id) => PALETTES.find((p) => p.id === id) || PALETTES[0];

  // ───────────────────────── leitura da aula ─────────────────────────
  const plain = (h) => String(h == null ? "" : h)
    .replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const clip = (t, n) => { t = plain(t).replace(/\s+/g, " "); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; };
  const isPlaceholder = (s) => /^(autor|nome do autor|título da sua aula|categoria · aula)$/i.test(String(s || "").trim());
  const TOPIC = ["topic", "topic-collapsible", "topic-slider"];

  function blockText(b, toText) {
    try { return String(toText({ meta: {}, blocks: [b] }) || "").trim(); } catch (e) { return ""; }
  }
  function headingOf(b) {
    const p = b.props || {};
    if (b.type === "titulo" && /^h[3-6]$/i.test(String(p.level || ""))) return ""; // subtítulo: fica dentro da seção
    if (b.type === "titulo" || b.type === "divider") return plain(p.text || p.label);
    if (TOPIC.indexOf(b.type) >= 0) {
      if (p.title) return plain(p.title);
      const kids = Array.isArray(p.children) ? p.children : [];
      const t = kids.find((k) => k.type === "titulo" || k.type === "divider");
      if (t) return plain((t.props || {}).text || (t.props || {}).label);
    }
    return "";
  }
  function collectImages(b, out) {
    if (!b || typeof b !== "object") return;
    const p = b.props || {};
    if ((b.type === "imagem" || b.type === "parallax" || b.type === "textoimagem") && p.src && !/placeholder/i.test(String(p.src))) {
      out.push({ src: String(p.src), alt: plain(p.alt), caption: plain(p.caption || p.overlayTitle || p.title) });
    }
    (Array.isArray(p.children) ? p.children : []).forEach((k) => collectImages(k, out));
  }

  // Divide a aula em seções (cada Tópico, Título de seção ou Divisor começa uma), separa a
  // abertura, a síntese e as referências.
  function planLesson(lesson, toText) {
    const blocks = (lesson && lesson.blocks) || [];
    const meta = (lesson && lesson.meta) || {};
    const plan = { title: plain(meta.title), eyebrow: "", lead: "", author: plain(meta.author), role: plain(meta.role || meta.institution), year: plain(meta.year), sections: [], references: [], synthesis: "", license: meta.license || "" };
    let cur = null, imgN = 0;
    const open = (title) => { cur = { title: title || "", text: "", images: [], equations: [] }; plan.sections.push(cur); };
    // Tópicos de conteúdo são contêineres: os títulos de seção que estão dentro deles também abrem seção.
    const flat = [];
    const walk = (list) => (list || []).forEach((b) => {
      const p = (b && b.props) || {};
      if (b && TOPIC.indexOf(b.type) >= 0 && Array.isArray(p.children)) {
        if (plain(p.title)) flat.push({ type: "titulo", props: { text: p.title } });
        walk(p.children);
      } else if (b) flat.push(b);
    });
    walk(blocks);
    flat.forEach((b) => {
      const p = b.props || {};
      if (b.type === "hero") {
        if (!isPlaceholder(p.title) && plain(p.title)) plan.title = plan.title || plain(p.title);
        if (!isPlaceholder(p.eyebrow)) plan.eyebrow = plain(p.eyebrow);
        plan.lead = plain(p.lead);
        if (!plan.author && !isPlaceholder(p.author)) plan.author = plain(p.author);
        if (!plan.year && p.date) plan.year = plain(p.date);
        return;
      }
      if (b.type === "referencias") { (Array.isArray(p.items) ? p.items : []).forEach((it) => { const h = typeof it === "string" ? it : (it && it.html) || ""; if (plain(h)) plan.references.push(String(h)); }); return; }
      if (b.type === "sintese") { plan.synthesis += (plan.synthesis ? "\n\n" : "") + blockText(b, toText); return; }
      if (b.type === "pagebreak" || b.type === "collapsebreak") return;
      const head = headingOf(b);
      if (head || !cur) open(head || "Abertura");
      const t = blockText(b, toText);
      if (t) cur.text += (cur.text ? "\n\n" : "") + t;
      if (b.type === "equacao" && String(p.latex || "").trim()) cur.equations.push(String(p.latex).trim());
      const imgs = []; collectImages(b, imgs);
      imgs.forEach((im) => { imgN += 1; cur.images.push({ id: "img" + imgN, ...im }); });
    });
    // Seções curtas demais se juntam à anterior; títulos vazios ganham o primeiro título do texto.
    const merged = [];
    plan.sections.forEach((s) => {
      if (!s.title) { const m = /^#{1,4}\s+(.+)$/m.exec(s.text); s.title = m ? plain(m[1]) : ""; }
      if (merged.length && s.text.length < 160) { const prev = merged[merged.length - 1]; prev.text += "\n\n" + s.text; prev.images = prev.images.concat(s.images); prev.equations = prev.equations.concat(s.equations || []); }
      else merged.push(s);
    });
    merged.forEach((s, i) => { s.title = clip(s.title || "Seção " + (i + 1), 70); });
    plan.sections = merged.filter((s) => s.text.trim().length >= 40);
    if (!plan.title) plan.title = "Aula";
    return plan;
  }

  // Slides fixos, sempre os mesmos 8: capa, pergunta da aula, roteiro, objetivos, síntese,
  // a pergunta que fica, referências e créditos. A quantidade pedida é só de slides de conteúdo.
  const FIXED = 8;
  function fixedCount() { return FIXED; }
  // Slides de conteúdo pedidos (o total é 8 + isto): Enxuto 12, Completo 32, número digitado,
  // ou automático pelo tamanho do texto (cerca de um slide a cada 700 caracteres).
  function contentFor(plan, size, custom) {
    const chars = plan.sections.reduce((a, s) => a + s.text.length, 0);
    let c = size === "enxuto" ? 12 : size === "completo" ? 32 : size === "custom" ? Math.round(Number(custom)) || 20 : Math.round(chars / 700);
    if (size === "auto") c = Math.max(6, Math.min(50, c));
    return Math.max(plan.sections.length || 1, Math.min(150, c));
  }
  function targetFor(plan, size, custom) { return FIXED + contentFor(plan, size, custom); }
  // Partes a partir do plano do deck (mode "outline"): cada seção leva os seus itens do plano,
  // em blocos de até 8. Completa ou corta para bater a quantidade pedida e garante 1 slide por seção.
  function jobsFromOutline(plan, outline, content) {
    const n = plan.sections.length; if (!n) return [];
    const per = plan.sections.map(() => []);
    (outline || []).forEach((o) => { const i = Math.min(n, Math.max(1, Number(o.sec) || 1)) - 1; per[i].push({ type: o.type, title: o.title, idea: o.idea || "", ...(o.imageId ? { imageId: o.imageId } : {}) }); });
    per.forEach((l, i) => { if (!l.length) l.push({ type: "cards", title: plan.sections[i].title, idea: "As ideias centrais desta seção, com um exemplo concreto do texto." }); });
    let total = per.reduce((a, l) => a + l.length, 0);
    while (total > content) { const i = per.reduce((m, l, j) => (l.length > per[m].length ? j : m), 0); if (per[i].length <= 1) break; per[i].pop(); total -= 1; }
    const extra = ["Um exemplo concreto do texto, resolvido passo a passo.", "O erro mais comum sobre este assunto e como evitá-lo.", "Uma comparação que deixe a diferença clara.", "Uma pergunta para a turma refletir, com base no texto."];
    for (let k = 0; total < content; k += 1) { const i = per.reduce((m, l, j) => (plan.sections[j].text.length / (l.length + 1) > plan.sections[m].text.length / (per[m].length + 1) ? j : m), 0); per[i].push({ type: ["bignumber", "alert", "compare", "reflect"][k % 4], title: "Aprofundar: " + clip(plan.sections[i].title, 50), idea: extra[k % 4] }); total += 1; }
    const out = [];
    per.forEach((l, i) => {
      const k = Math.ceil(l.length / 8); const size = Math.ceil(l.length / k);
      for (let j = 0; j < k; j += 1) { const items = l.slice(j * size, j * size + size); if (items.length) out.push({ sec: i, part: k > 1 ? "parte " + (j + 1) + " de " + k : "", text: plan.sections[i].text, count: items.length, outline: items }); }
    });
    return out;
  }

  // Glossário, resumo e revisão repetem o que a aula já disse: recebem bem poucos slides.
  const isReview = (t) => /gloss[áa]rio|resumo|revis[ãa]o|conceitos?-chave|recapitula/i.test(String(t || ""));
  // Divide o texto em k partes de tamanho parecido, sem cortar parágrafos.
  function splitText(text, k) {
    if (k <= 1) return [text];
    const paras = text.split(/\n{2,}/); const goal = text.length / k; const out = []; let cur = "";
    paras.forEach((p) => { if (cur && cur.length >= goal && out.length < k - 1) { out.push(cur); cur = ""; } cur += (cur ? "\n\n" : "") + p; });
    if (cur) out.push(cur);
    while (out.length < k) { let i = out.reduce((m, x, j) => (x.length > out[m].length ? j : m), 0); const t = out[i]; const cut = t.lastIndexOf(". ", Math.floor(t.length / 2)) + 1 || Math.floor(t.length / 2); out.splice(i, 1, t.slice(0, cut).trim(), t.slice(cut).trim()); }
    return out;
  }
  // Quantos slides cada seção recebe (proporcional ao texto, pelo menos 1), e em quantas
  // chamadas: nenhuma chamada pede mais de 8 slides, então seções grandes viram partes.
  function jobs(plan, target) {
    const n = plan.sections.length; if (!n) return [];
    const content = Math.max(n, target - FIXED);
    const lens = plan.sections.map((s) => Math.max(1, s.text.length) * (isReview(s.title) ? 0.12 : 1)); const total = lens.reduce((a, b) => a + b, 0);
    const raw = lens.map((l) => content * l / total);
    const cnt = raw.map((x) => Math.max(1, Math.floor(x)));
    let left = content - cnt.reduce((a, b) => a + b, 0);
    const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
    for (let j = 0; left > 0; j = (j + 1) % n) { cnt[order[j][1]] += 1; left -= 1; }
    while (left < 0) { const i = cnt.indexOf(Math.max(...cnt)); if (cnt[i] <= 1) break; cnt[i] -= 1; left += 1; }
    const out = [];
    plan.sections.forEach((sec, i) => {
      const k = Math.ceil(cnt[i] / 8); const parts = splitText(sec.text, k);
      const base = Math.floor(cnt[i] / parts.length); let extra = cnt[i] - base * parts.length;
      parts.forEach((t, j) => { out.push({ sec: i, part: parts.length > 1 ? "parte " + (j + 1) + " de " + parts.length : "", text: t, count: base + (extra-- > 0 ? 1 : 0) }); });
    });
    return out;
  }

  // Texto resumido para a moldura (pergunta, objetivos e síntese).
  function frameText(plan) {
    const parts = [];
    if (plan.lead) parts.push(plan.lead);
    const per = Math.max(600, Math.floor(12000 / Math.max(1, plan.sections.length)));
    plan.sections.forEach((s, i) => parts.push("## " + (i + 1) + ". " + s.title + "\n" + s.text.slice(0, per)));
    if (plan.synthesis) parts.push("## Síntese\n" + plan.synthesis.slice(0, 3000));
    return parts.join("\n\n").slice(0, 16000);
  }

  // Slide de reserva, sem IA, quando uma seção falha duas vezes.
  function fallbackSlides(section, count, text) {
    const n = Math.max(1, count || 1);
    const src = text || section.text;
    const clean = plain(String(src).replace(/^#+\s.*$/gm, "")).replace(/#+\s/g, "");
    const sentences = clean.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 30);
    const per = Math.max(1, Math.min(4, Math.ceil(sentences.length / n)));
    return Array.from({ length: n }, (_, i) => {
      const part = sentences.slice(i * per, i * per + per);
      return { type: "list", title: section.title + (n > 1 ? " (" + (i + 1) + "/" + n + ")" : ""), items: part.length ? part.map((x) => clip(x, 140)) : [clip(sentences[i % Math.max(1, sentences.length)] || clean, 140)], notes: "Slide montado sem IA, a partir do texto da seção (a IA não respondeu). Revise antes de apresentar e explique cada item com exemplos:\n" + (part.length ? part.join("\n") : clip(clean, 600)) };
    });
  }

  // Junta tudo na ordem do deck.
  function buildDeck(plan, frame, sectionSlides) {
    const deck = { title: plan.title, eyebrow: plan.eyebrow, lead: plan.lead, author: plan.author, role: plan.role, year: plan.year, slides: [] };
    const S = deck.slides;
    const F = frame || {};
    const secTitles = plan.sections.map((s) => s.title);
    const question = F.question || (/\?\s*$/.test(plan.title) ? plan.title : "O que esta aula vai nos ajudar a entender?");
    const objectives = (F.objectives && F.objectives.length) ? F.objectives : secTitles.slice(0, 8).map((t) => ({ verb: "Compreender", text: t.charAt(0).toLowerCase() + t.slice(1) }));
    const synthesis = (F.synthesis && F.synthesis.length) ? F.synthesis : secTitles.slice(0, 6).map((t, i) => ({ title: String(i + 1).padStart(2, "0"), text: t }));
    const C = F.closing || {};
    S.push({ type: "cover", notes: "Abertura. Apresente-se, apresente a aula e o que vem pela frente." + (plan.lead ? "\n\n" + plan.lead : "") + (secTitles.length ? "\n\nA aula percorre " + secTitles.length + " seção(ões): " + secTitles.join("; ") + "." : "") });
    S.push({ type: "question", text: question, notes: "Lance a pergunta e deixe a turma arriscar hipóteses antes de qualquer conceito; anote as hipóteses no quadro e volte a elas no fim. A aula inteira responde a esta pergunta." + (F.questionAnswer ? "\n\nRESPOSTA: " + F.questionAnswer : "") });
    S.push({ type: "roteiro", items: secTitles.length ? secTitles : [plan.title], notes: "Apresente o caminho da aula antes de começar, para a turma saber onde está a cada momento:\n" + secTitles.map((t, i) => (i + 1) + ". " + t).join("\n") + "\nVolte a este roteiro nas transições entre as seções." });
    S.push({ type: "objetivos", items: objectives, notes: "Leia os objetivos com a turma e diga como cada um será verificado ao longo da aula. Ao final, a turma deve conseguir:\n" + objectives.map((o) => "• " + o.verb + " " + o.text).join("\n") + "\nRetome esta lista na síntese, conferindo um a um." });
    plan.sections.forEach((sec, i) => {
      const eyebrow = String(i + 1).padStart(2, "0") + " · " + clip(sec.title, 46);
      (sectionSlides[i] || []).forEach((sl) => {
        const s = { ...sl, eyebrow: sl.type === "statement" && sl.eyebrow ? sl.eyebrow : eyebrow };
        if (s.type === "image") { const im = sec.images.find((x) => x.id === sl.imageId); if (!im) return; s.src = im.src; s.alt = sl.caption || im.alt || im.caption; }
        S.push(s);
      });
    });
    S.push({ type: "sintese", items: synthesis, notes: "Amarre o fio da aula com as ideias centrais, uma por cartão, e peça à turma um exemplo de cada:\n" + synthesis.map((x) => "• " + x.title + ": " + x.text).join("\n") + "\nPara fechar, volte à pergunta da aula («" + question + "») e compare a resposta com as hipóteses do início." });
    S.push({ type: "fechamento", title: C.title || "O que levamos desta aula", question: C.question || "Onde, fora da sala de aula, você usaria o que vimos hoje?", hints: (C.hints && C.hints.length ? C.hints : secTitles.slice(0, 3)),
      notes: "A pergunta que fica: ela não se fecha nesta aula e abre a próxima conversa. Dê um minuto para a turma pensar em duplas e ouça duas ou três ideias." + (C.answer ? "\n\nRESPOSTA (orientação para o professor): " + C.answer : "") });
    S.push({ type: "referencias", items: plan.references, notes: plan.references.length ? "Referências citadas na aula (" + plan.references.length + "). Indique por onde a turma pode começar a ler." : "A aula não lista referências. Inclua-as no ClassAtelier (bloco Referências) e gere de novo." });
    S.push({ type: "creditos", notes: "Créditos da aula." });
    return deck;
  }

  // Pergunta contida num slide (para garantir a resposta detalhada nas notas).
  function questionOf(s) {
    if (!s) return "";
    if (s.type === "reflect") return [s.question, s.sub].filter(Boolean).join(" ");
    if (s.type === "question") return s.text || "";
    if (s.type === "fechamento") return s.question || "";
    const pool = [s.text, s.title, s.sub].concat((s.items || []).map((x) => (typeof x === "string" ? x : [x.title, x.text].join(" "))));
    const q = pool.find((t) => t && /\?/.test(t));
    return q || "";
  }
  const needsAnswer = (s) => { const q = questionOf(s); return Boolean(q) && (!/RESPOSTA\s*:/i.test(s.notes || "") || String(s.notes || "").length < 400); };
  // Roteiro do apresentador em texto: título de cada slide e as notas completas.
  function notesText(deck) {
    const L = [deck.title, "Notas do apresentador · " + deck.slides.length + " slides", ""];
    deck.slides.forEach((s, i) => {
      if (s.type === "fechamento") { L.push("── Slide " + (i + 1) + " · A pergunta que fica: " + clip(s.question, 90) + " ──", (s.notes || "").trim(), ""); return; }
      const t = s.type === "cover" ? "Capa" : s.type === "question" ? "A pergunta da aula: " + s.text : s.type === "reflect" ? "Para refletir: " + s.question : s.title || s.text || ({ roteiro: "Roteiro", objetivos: "Objetivos", sintese: "Síntese", referencias: "Referências", creditos: "Créditos" })[s.type] || s.type;
      L.push("── Slide " + (i + 1) + " · " + clip(t, 110) + " ──", (s.notes || "(sem notas)").trim(), "");
    });
    return L.join("\n");
  }

  // ───────────────────────── desenho ─────────────────────────
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // Referências: mantém só <b>, <strong>, <i>, <em> e escapa o resto.
  const safeRef = (h) => esc(plain(String(h).replace(/<\s*(\/?)(strong|b)\s*>/gi, "\u0001$1b\u0002").replace(/<\s*(\/?)(em|i)\s*>/gi, "\u0001$1i\u0002"))).replace(/\u0001(\/?)(b|i)\u0002/g, "<$1$2>");
  const svgBulb = (c) => '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z"/></svg>';
  const svgWarn = (c) => '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>';
  const arrow = '<span class="arr" aria-hidden="true"></span>';

  function head(eyebrow, title) {
    return '<div class="head">' + (eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + "</p>" : "") + (title ? "<h2>" + esc(title) + "</h2>" : "") + "</div>";
  }

  function slideBody(s, ctx) {
    const P = ctx.p;
    switch (s.type) {
      case "cover":
        return { cls: "dark cover", html:
          '<svg class="decor" viewBox="0 0 900 900" aria-hidden="true"><g fill="none" stroke="' + P.dark2 + '" stroke-width="3"><circle cx="900" cy="900" r="160"/><circle cx="900" cy="900" r="320"/><circle cx="900" cy="900" r="480"/><circle cx="900" cy="900" r="640"/><circle cx="900" cy="900" r="800"/></g><path d="M900,900 L180,900 A720,720 0 0,1 391,391 Z" fill="' + P.accentLight + '" opacity="0.10"/><line x1="900" y1="900" x2="391" y2="391" stroke="' + P.accentLight + '" stroke-width="4"/></svg>' +
          '<div class="frame cover-frame"><p class="eyebrow">' + esc(ctx.deck.eyebrow || "Aula") + "</p>" +
          '<div class="cover-mid"><h1>' + esc(ctx.deck.title) + "</h1>" + (ctx.deck.lead ? '<p class="lead">' + esc(clip(ctx.deck.lead, 160)) + "</p>" : "") + "</div>" +
          '<div class="cover-who">' + (ctx.deck.author ? '<p class="who">' + esc(ctx.deck.author) + "</p>" : "") + '<p class="who-sub">' + esc([ctx.deck.role, ctx.deck.year].filter(Boolean).join(" · ")) + "</p></div></div>" };
      case "question":
        return { cls: "center", html: '<div class="frame mid"><p class="eyebrow">A pergunta da aula</p><h1 class="q">' + esc(s.text) + "</h1></div>" };
      case "roteiro": {
        const rows = s.items.map((t, i) => '<div class="rrow"><span class="num">' + String(i + 1).padStart(2, "0") + "</span><span>" + esc(t) + "</span></div>");
        const half = s.items.length > 6 ? Math.ceil(s.items.length / 2) : s.items.length;
        const cols = s.items.length > 6 ? '<div class="rcol">' + rows.slice(0, half).join("") + '</div><div class="rcol">' + rows.slice(half).join("") + "</div>" : '<div class="rcol">' + rows.join("") + "</div>";
        return { cls: "", html: '<div class="frame">' + head("Roteiro", "O caminho de hoje") + '<div class="body"><div class="rcols">' + cols + "</div></div></div>" };
      }
      case "objetivos": {
        const n = s.items.length, cols = n <= 4 ? 2 : n <= 6 ? 3 : 4;
        return { cls: "", html: '<div class="frame">' + head("Objetivos de aprendizagem", "Ao final da aula, você vai…") + '<div class="body"><div class="grid g' + cols + '">' +
          s.items.map((o) => '<div class="card"><h3>' + esc(o.verb) + "</h3><p>" + esc(o.text) + "</p></div>").join("") + "</div></div></div>" };
      }
      case "statement": {
        ctx.statements += 1;
        const accent = ctx.statements % 2 === 0;
        return { cls: (accent ? "accent " : "") + "center", html: '<div class="frame mid"><p class="eyebrow">' + esc(s.eyebrow) + '</p><h2 class="big">' + esc(s.text) + "</h2>" + (s.sub ? '<p class="sub">' + esc(s.sub) + "</p>" : "") + "</div>" };
      }
      case "cards": {
        const n = s.items.length;
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="row' + (n >= 4 ? " four" : "") + '">' +
          s.items.map((it, i) => '<div class="card' + (i === n - 1 && n === 3 ? " ink" : "") + '">' + (it.title ? "<h3>" + esc(it.title) + "</h3>" : "") + (it.text ? "<p>" + esc(it.text) + "</p>" : "") + "</div>").join("") + "</div></div></div>" };
      }
      case "list":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><ul class="bul">' + s.items.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul></div></div>" };
      case "formula": {
        const long = s.formula.length > 11;
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="row stretch"><div class="card ink fbox"><p class="formula' + (long ? " long" : "") + '">' + esc(s.formula) + "</p></div>" +
          '<div class="legend">' + (s.legend || []).map((l) => '<div class="lg"><span class="sym">' + esc(l.sym) + "</span><span>" + esc(l.text) + "</span></div>").join("") + "</div></div>" +
          (s.note ? '<p class="callout">' + esc(s.note) + "</p>" : "") + "</div></div>" };
      }
      case "compare":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="row center-items">' +
          '<div class="card"><p class="kicker">' + esc(s.left.label) + "</p><h3>" + esc(s.left.title) + "</h3><p>" + esc(s.left.text) + "</p></div>" + arrow +
          '<div class="card ink"><p class="kicker">' + esc(s.right.label) + "</p><h3>" + esc(s.right.title) + "</h3><p>" + esc(s.right.text) + "</p></div></div></div></div>" };
      case "steps":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="row center-items">' +
          s.steps.map((st, i) => (i ? arrow : "") + '<div class="card' + (i === s.steps.length - 1 ? " ink" : "") + '"><p class="stepn">' + (i + 1) + "</p><h3>" + esc(st.title) + "</h3><p>" + esc(st.text) + "</p></div>").join("") + "</div></div></div>" };
      case "timeline":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="tl">' +
          s.events.map((e, i) => '<div class="ev' + (i === s.events.length - 1 ? " last" : "") + '"><p class="date">' + esc(e.date) + '</p><p class="evt">' + esc(e.title) + "</p><p>" + esc(e.text) + "</p></div>").join("") + "</div></div></div>" };
      case "table":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><table><thead><tr>' + s.headers.map((h) => "<th>" + esc(h) + "</th>").join("") + "</tr></thead><tbody>" +
          s.rows.map((r) => "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div></div>" };
      case "diagram": {
        const D = (typeof window !== "undefined" && window.ClassDiagram) || (typeof require === "function" ? require("./slides-diagram.js") : null);
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><figure class="diag">' + (D ? D.diagramSVG(s, P) : "") + (s.caption ? "<figcaption>" + esc(s.caption) + "</figcaption>" : "") + "</figure></div></div>" };
      }
      case "calc": {
        const given = (s.given || []).length ? '<div class="card cgiven"><p class="kicker">Dados</p>' + s.given.map((g) => '<div class="lg"><span class="sym">' + esc(g.sym) + "</span><span>" + esc(g.text) + "</span></div>").join("") + "</div>" : "";
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="row calc">' + given +
          '<div class="card csteps"><p class="kicker">Conta</p>' + s.steps.map((x, i) => '<p class="cline' + (i === s.steps.length - 1 ? " last" : "") + '">' + esc(x) + "</p>").join("") + "</div>" + arrow +
          '<div class="card ink cres"><p class="kicker">Resultado</p><p class="value">' + esc(s.result) + "</p>" + (s.unit ? '<p class="vlabel">' + esc(s.unit) + "</p>" : "") + "</div></div></div></div>" };
      }
      case "cycle": {
        const n = s.steps.length, R = 250, cx = 832, cy = 300;
        const pos = s.steps.map((_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [cx + R * 1.55 * Math.cos(a), cy + R * Math.sin(a)]; });
        const arcs = s.steps.map((_, i) => { const a1 = -Math.PI / 2 + (2 * Math.PI * (i + 0.28)) / n, a2 = -Math.PI / 2 + (2 * Math.PI * (i + 0.72)) / n; const p1 = [cx + R * 1.55 * Math.cos(a1), cy + R * Math.sin(a1)], p2 = [cx + R * 1.55 * Math.cos(a2), cy + R * Math.sin(a2)]; return '<path d="M' + p1[0].toFixed(0) + "," + p1[1].toFixed(0) + " A" + (R * 1.55).toFixed(0) + "," + R + " 0 0,1 " + p2[0].toFixed(0) + "," + p2[1].toFixed(0) + '" fill="none" stroke="' + P.accent + '" stroke-width="5" marker-end="url(#ah)"/>'; }).join("");
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="cyc"><svg viewBox="0 0 1664 600" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + P.accent + '"/></marker></defs>' + arcs + "</svg>" +
          s.steps.map((st, i) => '<div class="cnode' + (i === 0 ? " ink" : "") + '" style="left:' + (pos[i][0] / 16.64).toFixed(2) + "%;top:" + (pos[i][1] / 6).toFixed(2) + '%"><p class="stepn">' + (i + 1) + "</p><h3>" + esc(st.title) + "</h3>" + (st.text ? "<p>" + esc(st.text) + "</p>" : "") + "</div>").join("") + "</div></div></div>" };
      }
      case "scale": {
        const n = s.marks.length;
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="scl"><div class="sbar"></div>' +
          s.marks.map((m, i) => '<div class="smark" style="left:' + ((100 * (i + 0.5)) / n).toFixed(2) + '%"><p class="slabel">' + esc(m.label) + '</p><span class="stick"></span>' + (m.value ? '<p class="svalue">' + esc(m.value) + "</p>" : "") + (m.text ? '<p class="stext">' + esc(m.text) + "</p>" : "") + "</div>").join("") +
          '<p class="send l">' + esc(s.from || "") + '</p><p class="send r">' + esc(s.to || "") + "</p></div>" + (s.note ? '<p class="callout">' + esc(s.note) + "</p>" : "") + "</div></div>" };
      }
      case "chart": {
        const max = Math.max(...s.items.map((x) => Math.abs(x.value))) || 1;
        const fmt = (v) => String(v).replace(".", ",");
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="chart">' +
          s.items.map((x, i) => '<div class="crow"><span class="clabel">' + esc(x.label) + '</span><span class="ctrack"><span class="cbar' + (i === s.items.length - 1 ? " hi" : "") + '" style="width:' + Math.max(2, (100 * Math.abs(x.value)) / max).toFixed(1) + '%"></span></span><span class="cval">' + esc(fmt(x.value)) + (s.unit ? " " + esc(s.unit) : "") + "</span></div>").join("") +
          "</div>" + (s.note ? '<p class="callout">' + esc(s.note) + "</p>" : "") + "</div></div>" };
      }
      case "bignumber":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><div class="row center-items"><div class="card ink bign"><p class="value">' + esc(s.value) + '</p><p class="vlabel">' + esc(s.label) + "</p></div>" +
          (s.text ? '<p class="bigtext">' + esc(s.text) + "</p>" : "") + "</div></div></div>" };
      case "reflect":
        return { cls: "mist center", html: '<div class="frame mid"><div class="tag">' + svgBulb(P.accent) + '<p class="eyebrow">Para refletir</p></div><h2 class="big">' + esc(s.question) + "</h2>" + (s.sub ? '<p class="sub">' + esc(s.sub) + "</p>" : "") + "</div>" };
      case "alert":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, "") + '<div class="body"><div class="warnbox">' + svgWarn(P.accent) + "<div><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div></div></div></div>" };
      case "quote":
        return { cls: "center", html: '<div class="frame mid"><p class="eyebrow">' + esc(s.eyebrow) + '</p><blockquote>“' + esc(s.text.replace(/^["“]|["”]$/g, "")) + "”</blockquote>" + (s.author ? '<p class="sub">— ' + esc(s.author) + "</p>" : "") + "</div>" };
      case "image":
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title) + '<div class="body"><figure class="fig"><img src="' + esc(s.src) + '" alt="' + esc(s.alt || "") + '">' + (s.caption ? "<figcaption>" + esc(s.caption) + "</figcaption>" : "") + "</figure></div></div>" };
      case "sintese":
        return { cls: "dark", html: '<div class="frame">' + head("Síntese", "A ideia que fecha a aula") + '<div class="body"><div class="grid g3">' +
          s.items.map((it) => '<div class="card dk"><h3>' + esc(it.title) + "</h3><p>" + esc(it.text) + "</p></div>").join("") + "</div></div></div>" };
      case "fechamento":
        return { cls: "", html: '<div class="frame">' + head("A pergunta que fica", s.title) + '<div class="body"><div class="row center-items">' +
          '<div class="card ink" style="flex:1.5"><p class="kicker">Para levar adiante</p><h3>' + esc(s.question) + "</h3></div>" +
          '<div class="card"><p class="kicker">Por onde começar</p><ul class="bul">' + (s.hints || []).map((h) => "<li>" + esc(h) + "</li>").join("") + "</ul></div></div></div></div>" };
      case "referencias": {
        if (!s.items.length) return { cls: "", html: '<div class="frame">' + head("", "Referências") + '<div class="body"><p class="sub">A aula ainda não lista referências.</p></div></div>' };
        const half = Math.ceil(s.items.length / 2);
        const col = (a) => '<div class="refcol">' + a.map((r) => "<p>" + safeRef(r) + "</p>").join("") + "</div>";
        return { cls: "", html: '<div class="frame refs">' + head(s.part ? "Referências · " + s.part : "", "Referências") + '<div class="body"><div class="row refrow">' + col(s.items.slice(0, half)) + col(s.items.slice(half)) + "</div></div></div>" };
      }
      case "creditos": {
        const d = ctx.deck;
        return { cls: "", html: '<div class="frame">' + head("Créditos", "Autoria, apoio de IA e licença") + '<div class="body"><div class="row credits">' +
          '<div class="card"><p class="ctitle">Autoria</p><p>' + esc([d.author || "Autoria a preencher", d.role, d.year].filter(Boolean).join(" · ")) + "</p></div>" +
          '<div class="card wide"><p class="ctitle">Apoio de IA e licença</p><p>Produzido com apoio do <b>ClassAuthor</b> (INOVALAB – IFSC), ferramenta de planejamento pedagógico desenvolvida por Rogério Bittencourt.</p>' +
          "<p>Editado com o <b>ClassAtelier</b>, ferramenta de autoria de aulas interativas e pacotes SCORM, baseada no LumeAuthor, de Luís Lindner, e evoluída em coautoria com Rogério Bittencourt (INOVALAB – IFSC). Slides gerados pelo ClassAtelier com apoio de IA.</p>" +
          "<p>A curadoria, a revisão e a responsabilidade pelo conteúdo são humanas.</p><p><b>Licença CC BY-NC-SA 4.0:</b> você pode compartilhar e adaptar, citando a autoria, sem uso comercial e mantendo a mesma licença.</p></div></div></div></div>" };
      }
      default:
        return { cls: "", html: '<div class="frame">' + head(s.eyebrow, s.title || "") + "</div>" };
    }
  }

  function css(P) {
    return `
:root{--k:1}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#0b0d10;overflow:hidden}
body{font-family:'IBM Plex Sans',Arial,sans-serif}
#stage{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:0 0}
.slide{position:absolute;inset:0;width:1920px;height:1080px;background:${P.bg};color:${P.ink};overflow:hidden;display:none;--k:1}
.slide.on,.slide.measure{display:block}.slide.measure{visibility:hidden}
.slide.dark{background:${P.dark};color:${P.onDark}}
.slide.mist{background:${P.bg2}}
.slide.accent{background:${P.accent};color:${P.onAccent}}
.frame{position:absolute;left:128px;top:128px;right:128px;bottom:160px;display:flex;flex-direction:column;gap:calc(56px*var(--k));overflow:hidden}
.frame.mid{justify-content:center;gap:calc(40px*var(--k))}
.head{display:flex;flex-direction:column;gap:16px;flex-shrink:0}
.eyebrow{font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${P.accent}}
.dark .eyebrow{color:${P.accentLight}}.accent .eyebrow{color:${P.onAccentMuted}}
h1,h2,h3{font-family:'Space Grotesk',Arial,sans-serif;font-weight:600;color:${P.title}}
.dark h1,.dark h2{color:#F7F5F0}.accent h2{color:${P.onAccent}}
h1{font-size:calc(120px*var(--k));line-height:1.05}
h2{font-size:calc(72px*var(--k));line-height:1.1}
h2.big,h1.q{max-width:1600px}
h1.q{font-size:calc(96px*var(--k))}
h3{font-size:max(24px,calc(44px*var(--k)));line-height:1.15}
p{font-size:max(24px,calc(28px*var(--k)));line-height:1.45}
.sub{font-size:max(28px,calc(44px*var(--k)));line-height:1.3;color:${P.second};max-width:1560px}
.accent .sub{color:${P.onAccentMuted}}
.body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:calc(32px*var(--k));padding-bottom:calc(24px*var(--k))}
.refs .body,.rcols-wrap{justify-content:flex-start}
.row{display:flex;gap:calc(32px*var(--k));align-items:stretch}
.row.center-items{align-items:center}.row.stretch{align-items:stretch}
.row>.card{flex:1}
.row.four h3{font-size:max(24px,calc(32px*var(--k)))}
.card{background:${P.card};border:1px solid ${P.line};border-radius:16px;padding:calc(40px*var(--k));display:flex;flex-direction:column;gap:calc(14px*var(--k))}
.card.ink{background:${P.dark};border-color:${P.dark};color:${P.onDark}}
.card.ink h3{color:#F7F5F0}.card.ink .kicker{color:${P.accentLight}}
.card.dk{background:${P.dark2};border-color:${P.dark2};color:${P.onDark}}.card.dk h3{color:${P.accentLight};font-size:max(24px,calc(32px*var(--k)))}
.kicker{font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${P.muted}}
.stepn{font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:max(32px,calc(44px*var(--k)));color:${P.accent}}
.card.ink .stepn{color:${P.accentLight}}
.diag{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}.diag svg{width:100%;height:auto;max-height:100%;flex:1;min-height:0}.diag figcaption{font-size:24px;color:${P.muted};text-align:center}
.calc{align-items:stretch}.cgiven{flex:0.8!important}.csteps{flex:1.6!important;justify-content:center}.cres{flex:1!important;justify-content:center}
.cline{font-family:'JetBrains Mono','Courier New',monospace;font-size:max(24px,calc(40px*var(--k)));line-height:1.3;color:${P.title};border-bottom:2px dashed ${P.line};padding-bottom:calc(10px*var(--k))}.cline.last{border-bottom:0;color:${P.accent};font-weight:700}
.calc .arr{align-self:center}.cres .value{font-size:calc(96px*var(--k))}
.cyc{position:relative;width:100%;height:600px}.cyc svg{position:absolute;inset:0;width:100%;height:100%}
.cnode{position:absolute;transform:translate(-50%,-50%);width:400px;background:${P.card};border:1px solid ${P.line};border-radius:16px;padding:calc(24px*var(--k)) calc(28px*var(--k));text-align:center;display:flex;flex-direction:column;gap:6px}
.cnode.ink{background:${P.dark};border-color:${P.dark};color:${P.onDark}}.cnode.ink h3{color:#F7F5F0}.cnode.ink .stepn{color:${P.accentLight}}
.cnode h3{font-size:max(24px,calc(34px*var(--k)))}.cnode p{font-size:max(20px,calc(24px*var(--k)));line-height:1.35}.cnode .stepn{font-size:max(26px,calc(34px*var(--k)))}
.scl{position:relative;height:440px;margin:0 10px}.sbar{position:absolute;left:0;right:0;top:170px;height:28px;border-radius:14px;background:linear-gradient(90deg,${P.second},${P.accent})}
.smark{position:absolute;top:0;transform:translateX(-50%);width:200px;text-align:center;display:flex;flex-direction:column;align-items:center}
.slabel{font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:max(28px,calc(48px*var(--k)));color:${P.title};height:110px;display:flex;align-items:flex-end;line-height:1}
.stick{display:block;width:4px;height:86px;background:${P.dark};margin:12px 0 0}.svalue{font-weight:700;font-size:max(22px,calc(30px*var(--k)));color:${P.accent};margin-top:10px}.stext{font-size:max(18px,calc(22px*var(--k)));color:${P.muted};line-height:1.3;margin-top:4px}
.send{position:absolute;top:400px;font-size:22px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${P.muted}}.send.l{left:0}.send.r{right:0;text-align:right}
.scl .smark .svalue{margin-top:44px}
.chart{display:flex;flex-direction:column;gap:calc(22px*var(--k))}.crow{display:flex;align-items:center;gap:28px}
.clabel{flex:0 0 300px;text-align:right;font-family:'Space Grotesk',Arial,sans-serif;font-weight:600;font-size:max(22px,calc(32px*var(--k)));color:${P.title}}
.ctrack{flex:1;height:calc(48px*var(--k));min-height:24px;background:${P.bg2};border-radius:8px;overflow:hidden}.cbar{display:block;height:100%;background:${P.second};border-radius:8px}.cbar.hi{background:${P.accent}}
.cval{flex:0 0 220px;font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:max(22px,calc(32px*var(--k)));color:${P.title}}
.arr{flex:0 0 64px;height:32px;background:${P.second};clip-path:polygon(0 30%,60% 30%,60% 0,100% 50%,60% 100%,60% 70%,0 70%)}
.grid{display:grid;gap:calc(28px*var(--k))}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr 1fr}.g4{grid-template-columns:1fr 1fr 1fr 1fr}
.g4 h3{font-size:max(24px,calc(32px*var(--k)))}
.bul{list-style:none;display:flex;flex-direction:column;gap:calc(24px*var(--k))}
.bul li{font-size:max(24px,calc(32px*var(--k)));line-height:1.4;padding-left:44px;position:relative;color:${P.title}}
.bul li:before{content:"";position:absolute;left:0;top:.55em;width:22px;height:6px;border-radius:3px;background:${P.accent}}
.fbox{flex:0 0 auto;min-width:640px;max-width:900px;justify-content:center;align-items:center;padding:calc(56px*var(--k))}
.formula{font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:calc(104px*var(--k));line-height:1.1;color:#F7F5F0;text-align:center}
.formula.long{font-size:calc(64px*var(--k))}
.legend{flex:1;display:flex;flex-direction:column;justify-content:center;gap:calc(26px*var(--k))}
.lg{display:flex;gap:28px;align-items:baseline}.lg span:last-child{font-size:max(24px,calc(28px*var(--k)));line-height:1.4}
.sym{font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:max(28px,calc(44px*var(--k)));color:${P.accent};min-width:84px}
.callout,.warnbox{background:${P.warn};border-left:8px solid ${P.accent};border-radius:0 16px 16px 0;padding:calc(28px*var(--k)) calc(40px*var(--k));color:${P.title}}
.warnbox{display:flex;gap:40px;align-items:flex-start;padding:calc(48px*var(--k))}.warnbox svg{flex-shrink:0}
.warnbox h3{margin-bottom:calc(16px*var(--k))}.warnbox p{font-size:max(24px,calc(32px*var(--k)))}
.tl{display:flex;gap:24px}.ev{flex:1;border-top:6px solid ${P.dark};padding-top:calc(32px*var(--k));display:flex;flex-direction:column;gap:calc(14px*var(--k))}
.ev:nth-child(2){border-color:${P.second}}.ev.last{border-color:${P.accent}}
.date{font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:max(28px,calc(44px*var(--k)));color:${P.title}}
.evt{font-weight:600;color:${P.title}}
table{width:100%;border-collapse:collapse;font-size:max(24px,calc(30px*var(--k)));color:${P.title}}
th{background:${P.dark};color:#F7F5F0;text-align:left;font-weight:600;padding:calc(18px*var(--k)) calc(24px*var(--k))}
td{padding:calc(16px*var(--k)) calc(24px*var(--k));border-bottom:1px solid ${P.line}}
tbody tr:nth-child(even){background:${P.secondSoft}}
.bign{flex:0 0 auto;min-width:620px;align-items:flex-start;padding:calc(56px*var(--k))}
.value{font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:calc(120px*var(--k));line-height:1;color:${P.accentLight}}
.vlabel{color:${P.onDark}}
.bigtext{flex:1;font-size:max(24px,calc(32px*var(--k)));color:${P.title}}
.tag{display:flex;gap:20px;align-items:center}
blockquote{font-family:'Space Grotesk',Arial,sans-serif;font-size:calc(64px*var(--k));line-height:1.2;color:${P.title};max-width:1600px}
.fig{flex:1;min-height:0;display:flex;flex-direction:column;gap:16px;align-items:center;background:${P.card};border:1px solid ${P.line};border-radius:16px;padding:32px}
.fig img{flex:1;min-height:0;max-width:100%;object-fit:contain}
figcaption{font-size:24px;color:${P.muted};text-align:center}
.rcols{display:flex;gap:96px}.rcol{flex:1;display:flex;flex-direction:column;gap:calc(14px*var(--k))}
.rrow{display:flex;gap:28px;align-items:baseline;border-top:2px solid ${P.rule};padding-top:calc(18px*var(--k));font-size:max(24px,calc(32px*var(--k)));color:${P.title}}
.num{font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:max(28px,calc(40px*var(--k)));color:${P.accent}}
.refs .head h2{font-size:calc(72px*var(--k))}
.refrow{gap:64px;align-items:flex-start}.refcol{flex:1;display:flex;flex-direction:column;gap:calc(16px*var(--k))}
.refcol p{font-size:calc(24px*var(--k));line-height:1.32}
.credits{align-items:flex-start}.credits .card{padding:32px;gap:10px}.credits .card.wide{flex:1.4}.credits p{font-size:24px;line-height:1.4}
.ctitle{font-weight:600;color:${P.title}}
.cover .decor{position:absolute;right:0;bottom:0;width:900px;height:900px}
.cover-frame{justify-content:space-between;bottom:128px}
.cover-mid{display:flex;flex-direction:column;gap:32px;max-width:1300px}
.lead{font-size:44px;line-height:1.3;color:${P.onDark}}
.who{font-size:32px;font-weight:600;color:#F7F5F0}.who-sub{font-size:24px;color:${P.onDarkMuted}}
.foot{position:absolute;left:128px;right:128px;bottom:64px;display:flex;justify-content:space-between;gap:40px;font-size:24px;color:${P.muted}}
.foot span:first-child{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.dark .foot{color:${P.onDarkMuted}}.accent .foot{color:${P.onAccentMuted}}
.cover .foot{display:none}
.notes{display:none}
#hud{position:fixed;right:16px;bottom:14px;display:flex;gap:8px;align-items:center;font:600 13px system-ui,sans-serif;color:#cfd6dd;opacity:.0;transition:opacity .25s}
body:hover #hud,#hud:focus-within{opacity:.9}
#hud button{background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:7px;padding:6px 10px;font:inherit;cursor:pointer}
#notes{position:fixed;left:0;right:0;bottom:0;max-height:46vh;overflow:auto;background:rgba(10,12,16,.94);color:#e8ecef;font:17px/1.55 system-ui,sans-serif;padding:18px 26px 52px;white-space:pre-wrap;display:none}
#notes.on{display:block}
@page{size:1920px 1080px;margin:0}
@media print{html,body{background:none;overflow:visible;height:auto}#stage{position:static;transform:none!important;width:auto;height:auto}.slide{display:block!important;visibility:visible!important;position:relative;break-after:page;page-break-after:always}#hud,#notes{display:none!important}}
`;
  }

  const SCRIPT = `
(function(){
var slides=[].slice.call(document.querySelectorAll('.slide'));var i=0;var stage=document.getElementById('stage');var notes=document.getElementById('notes');var count=document.getElementById('count');
function fit(s){var f=s.querySelectorAll('.frame');var k=1;s.style.setProperty('--k',1);for(var n=0;n<12;n++){var over=false;for(var j=0;j<f.length;j++){if(f[j].scrollHeight>f[j].clientHeight+2||f[j].scrollWidth>f[j].clientWidth+2)over=true;}if(!over)break;k=Math.round((k-0.05)*100)/100;s.style.setProperty('--k',k);}}
function fitAll(){slides.forEach(function(s){var on=s.classList.contains('on');if(!on)s.classList.add('measure');fit(s);if(!on)s.classList.remove('measure');});}
function scale(){var k=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform='translate('+(-960*k)+'px,'+(-540*k)+'px) scale('+k+')';}
function show(n){i=Math.max(0,Math.min(slides.length-1,n));slides.forEach(function(s,j){s.classList.toggle('on',j===i);s.setAttribute('aria-hidden',j===i?'false':'true');});var a=slides[i].querySelector('.notes');notes.textContent=(i+1)+' / '+slides.length+'\\n\\n'+(a?a.textContent:'');count.textContent=(i+1)+' / '+slides.length;if(location.hash!=='#'+(i+1))history.replaceState(null,'','#'+(i+1));}
addEventListener('keydown',function(e){var k=e.key;if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '){e.preventDefault();show(i+1);}else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'){e.preventDefault();show(i-1);}else if(k==='Home')show(0);else if(k==='End')show(slides.length-1);else if(k==='n'||k==='N')notes.classList.toggle('on');else if(k==='f'||k==='F'){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();}});
stage.addEventListener('click',function(e){if(e.target.closest('a'))return;show(e.clientX>innerWidth/3?i+1:i-1);});
var tx=null;addEventListener('touchstart',function(e){tx=e.touches[0].clientX;},{passive:true});addEventListener('touchend',function(e){if(tx==null)return;var d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>50)show(d<0?i+1:i-1);tx=null;});
document.getElementById('prev').onclick=function(){show(i-1);};document.getElementById('next').onclick=function(){show(i+1);};document.getElementById('tnotes').onclick=function(){notes.classList.toggle('on');};document.getElementById('tfull').onclick=function(){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();};document.getElementById('tprint').onclick=function(){print();};
addEventListener('resize',scale);addEventListener('beforeprint',fitAll);
scale();var h=parseInt((location.hash||'').slice(1),10);show(h>0?h-1:0);fitAll();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitAll);
})();`;

  function renderDeckHTML(deck, paletteId) {
    const P = paletteById(paletteId);
    const ctx = { p: P, deck, statements: 0 };
    const total = deck.slides.length;
    const footTitle = clip(deck.title, 80);
    const parts = deck.slides.map((s, i) => {
      const b = slideBody(s, ctx);
      const left = s.source ? "Fonte: " + s.source : footTitle;
      return '<section class="slide ' + b.cls + '" aria-label="Slide ' + (i + 1) + " de " + total + '">' + b.html +
        '<div class="foot"><span>' + esc(left) + "</span><span>" + String(i + 1).padStart(2, "0") + "</span></div>" +
        '<aside class="notes">' + esc(s.notes || "") + "</aside></section>";
    });
    return "<!doctype html>\n<html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" + esc(deck.title) + " · slides</title>" +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400..700&family=IBM+Plex+Sans:wght@400;600&family=JetBrains+Mono:wght@500;700&display=swap">' +
      '<meta name="generator" content="ClassAtelier · slides (paleta ' + esc(P.name) + ')">' +
      "<style>" + css(P) + "</style></head><body>" +
      '<main id="stage" aria-live="polite">' + parts.join("\n") + "</main>" +
      '<div id="notes" role="region" aria-label="Notas do apresentador"></div>' +
      '<div id="hud"><span id="count"></span><button id="prev" aria-label="Slide anterior">‹</button><button id="next" aria-label="Próximo slide">›</button><button id="tnotes" title="Notas do apresentador (N)">Notas</button><button id="tfull" title="Tela cheia (F)">Tela cheia</button><button id="tprint" title="Imprimir ou salvar em PDF, um slide por página">PDF</button></div>' +
      "<script>" + SCRIPT + "</script></body></html>";
  }

  const api = { PALETTES, paletteById, planLesson, FIXED, fixedCount, contentFor, targetFor, jobs, jobsFromOutline, splitText, frameText, fallbackSlides, buildDeck, questionOf, needsAnswer, notesText, renderDeckHTML };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ClassSlides = api;
})(typeof window !== "undefined" ? window : this);
