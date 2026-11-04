/* eslint-disable */
// ClassAtelier — texto corrido da aula (para copiar, baixar ou devolver ao ClassAuthor).
// Percorre os blocos na ordem e escreve em Markdown simples: títulos com #, parágrafos, listas,
// perguntas do quiz com as alternativas. Não inclui endereços de imagem, códigos nem cores.
(function () {
  const plain = (h) => String(h == null ? "" : h)
    .replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const SKIP = new Set(["id", "type", "src", "url", "href", "link", "slotId", "tone", "icon", "bg", "pad", "level", "variant", "style", "color", "align", "ratio", "width", "height", "columns", "layout", "gap", "emphasis", "dropcap", "dropcapTone", "loop", "editSlide", "defaultOpen", "avaliativo", "passMark", "embed", "spotify", "start", "duration", "responsive", "useEmbedDimensions", "showAttribution", "triggerLabel", "answer", "correct", "correctIndex", "credit", "alt"]);
  const looksTechnical = (s) => /^(https?:|data:|blob:|#[0-9a-f]{3,8}$|\.{0,2}\/|[\w-]+\.(png|jpe?g|gif|svg|webp|mp3|mp4)$)/i.test(s.trim());
  const isText = (s) => typeof s === "string" && /[A-Za-zÀ-ÿ]/.test(s) && !looksTechnical(s);

  // Texto de um objeto qualquer: campos de texto na ordem em que aparecem; listas viram itens.
  function collect(v, out, depth) {
    if (depth > 6 || v == null) return;
    if (typeof v === "string") { if (isText(v)) { const t = plain(v); if (t) out.push(t); } return; }
    if (Array.isArray(v)) { v.forEach((x) => collect(x, out, depth + 1)); return; }
    if (typeof v === "object") {
      Object.keys(v).forEach((k) => { if (!SKIP.has(k)) collect(v[k], out, depth + 1); });
    }
  }
  const lines = (v) => { const o = []; collect(v, o, 0); return o; };
  const bullets = (arr) => arr.map((t) => "- " + t.replace(/\n+/g, " "));

  function blockToText(b) {
    const p = b.props || {};
    const T = b.type;
    const out = [];
    if (T === "topic" || T === "topic-collapsible" || T === "topic-slider") {
      (p.children || []).forEach((c) => { const t = blockToText(c); if (t) out.push(t); });
      return out.join("\n\n");
    }
    if (T === "hero") { const t = lines({ eyebrow: p.eyebrow, title: p.title }); if (t.length) out.push("# " + t.join(" — ")); const rest = lines({ lead: p.lead, subtitle: p.subtitle, body: p.body }); if (rest.length) out.push(rest.join("\n\n")); return out.join("\n\n"); }
    if (T === "titulo") { const t = plain(p.text); const lv = /^h([1-6])$/.test(p.level || "") ? Number(p.level[1]) : 2; return t ? "#".repeat(Math.min(Math.max(lv, 2), 4)) + " " + t : ""; }
    if (T === "divider") { const t = plain(p.label); return t ? "## " + t : ""; }
    if (T === "pagebreak" || T === "collapsebreak") return "";
    if (T === "sintese") { const t = lines({ eyebrow: p.eyebrow, title: p.title }); const b2 = lines(p.body); return [t.length ? "## " + t.join(": ") : "", b2.join("\n\n")].filter(Boolean).join("\n\n"); }
    if (T === "referencias") { const t = plain(p.title); const refs = lines(window.ABNT ? window.ABNT.prepareHtmlReferences(p.items) : p.items).map((r) => r.replace(/\n+/g, " ")); return ["## " + (t || "Referências"), refs.join("\n\n")].join("\n\n"); }
    if (T === "prose") return plain(p.body);
    if (T === "citacao") { const q = plain(p.quote); const a = [plain(p.author), plain(p.source)].filter(Boolean).join(", "); return q ? "> " + q.replace(/\n+/g, " ") + (a ? "\n> — " + a : "") : ""; }
    if (T === "forum") { const rs = (Array.isArray(p.rules) ? p.rules : []).map((r) => "- " + plain(r)).filter((x) => x.length > 2); return ["## Fórum: " + (plain(p.title) || "discussão"), plain(p.prompt), plain(p.dueInitial) ? "Postagem inicial: " + plain(p.dueInitial) : "", plain(p.dueReplies) ? "Respostas aos colegas: " + plain(p.dueReplies) : "", ...rs, p.showCriteria ? "Critérios: " + plain(p.criteria) : "", p.href && !/^https?:\/\/$/i.test(String(p.href).trim()) ? "Link: " + p.href : ""].filter(Boolean).join("\n"); }
    if (T === "codigo") { const c = String(p.code || ""); if (!c.trim()) return ""; return "```" + (p.language && p.language !== "text" ? p.language : "") + (p.title ? " " + plain(p.title) : "") + "\n" + c.replace(/\s+$/, "") + "\n```"; }
    if (T === "equacao") { const l = String(p.latex || "").trim(); if (!l) return ""; const n = plain(p.number); return "$$ " + l + " $$" + (p.showNumber !== false && n ? "  " + n : ""); }
    if (T === "eyebrow") return plain(p.text);
    if (T === "destaque" || T === "atencao" || T === "reflexao") {
      const head = plain(p.title) || (T === "atencao" ? "Atenção" : T === "reflexao" ? "Para refletir" : "Veja bem");
      const body = [plain(p.question), plain(p.body)].filter(Boolean).join("\n");
      return "**" + head + ".** " + body;
    }
    if (T === "pitaco") { const who = plain(p.kicker) || plain(p.name); return (who ? "**" + who + ":** " : "") + plain(p.body); }
    if (T === "imagem" || T === "parallax") { const c = [plain(p.overlayTitle), plain(p.caption)].filter(Boolean).join(" — "); return c ? "[Imagem: " + c + "]" : ""; }
    if (T === "video") { const c = [plain(p.title), plain(p.caption)].filter(Boolean).join(" — "); const tr = String(p.transcript || "").trim(); return c ? "[Vídeo: " + c + "]" + (tr ? "\n\nTranscrição:\n" + tr : "") : ""; }
    if (T === "audio") { const c = [plain(p.title), plain(p.show), plain(p.description)].filter(Boolean).join(" — "); const tr = String(p.transcript || "").trim(); return c ? "[Áudio: " + c + "]" + (tr ? "\n\nTranscrição:\n" + tr : "") : ""; }
    if (T === "quiz") {
      const qs = Array.isArray(p.questions) ? p.questions : [];
      const head = plain(p.title) || "Quiz";
      const rows = qs.map((q, i) => {
        const stem = plain(q.q || q.question || q.text || q.prompt || "");
        const opts = (q.options || q.alternatives || q.choices || []).map((o) => plain(typeof o === "string" ? o : (o && (o.text || o.label)) || ""));
        const ai = typeof q.answer === "number" ? q.answer : typeof q.correct === "number" ? q.correct : typeof q.correctIndex === "number" ? q.correctIndex : -1;
        return (i + 1) + ". " + stem + "\n" + opts.map((o, j) => "   " + String.fromCharCode(97 + j) + ") " + o + (j === ai ? "  (resposta)" : "")).join("\n");
      });
      return ["## " + head, ...rows].join("\n\n");
    }
    if (T === "flashcards") { const cards = Array.isArray(p.cards) ? p.cards : []; return ["## " + (plain(p.label) || "Flashcards"), ...cards.map((c) => "- " + [plain(c.front || c.q || c.term), plain(c.back || c.a || c.definition)].filter(Boolean).join(" → "))].join("\n"); }
    if (T === "tabela") {
      const rows = Array.isArray(p.rows) ? p.rows : [];
      const head = Array.isArray(p.headers) ? p.headers : Array.isArray(p.header) ? p.header : [];
      const toRow = (r) => (Array.isArray(r) ? r : (r && r.cells) || []).map((c) => plain(typeof c === "string" ? c : (c && (c.text || c.html)) || "")).join(" | ");
      const body = [head.length ? head.map((c) => plain(c)).join(" | ") : null, ...rows.map(toRow)].filter((x) => x != null && x !== "");
      const cap = plain(p.caption || p.title || "");
      return [cap ? "**" + cap + "**" : "", ...body].filter(Boolean).join("\n");
    }
    if (T === "accordion") { const items = Array.isArray(p.items) ? p.items : []; return items.map((it) => "**" + plain(it.title || it.q || it.question || it.label || "") + "**\n" + plain(it.body || it.a || it.answer || it.content || "")).join("\n\n"); }
    if (T === "slider") { const st = Array.isArray(p.steps) ? p.steps : []; return ["## " + (plain(p.label) || "Passo a passo"), ...st.map((s, i) => (i + 1) + ". " + lines(s).join(" — "))].join("\n"); }
    if (T === "linhadotempo") { return lines(p).length ? ["## " + (plain(p.title) || "Linha do tempo"), ...bullets(lines(p.items || p.events || p.entries || []))].join("\n") : ""; }
    if (T === "materiais") { const items = Array.isArray(p.items) ? p.items : []; return ["## " + (plain(p.title) || "Para ir além"), ...items.map((it) => "- " + [plain(it.title || it.label || ""), plain(it.description || it.desc || "")].filter(Boolean).join(": "))].join("\n"); }
    if (T === "externalembed") return plain(p.title) ? "[Conteúdo externo: " + plain(p.title) + "]" : "";
    // demais blocos (cards de casos, destaques com ícones, colunas, filmstrip, texto + imagem…)
    const l = lines(p);
    if (!l.length) return "";
    const title = plain(p.title);
    if (title) return ["## " + title, ...l.filter((x) => x !== title)].join("\n\n");
    return l.join("\n\n");
  }

  function lessonToText(lesson) {
    const blocks = (lesson && lesson.blocks) || [];
    const parts = blocks.map(blockToText).filter((t) => t && t.trim());
    const title = plain(lesson && lesson.meta && lesson.meta.title);
    const hasH1 = parts.length && /^# /.test(parts[0]);
    return ((title && !hasH1 ? "# " + title + "\n\n" : "") + parts.join("\n\n")).replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }
  window.lessonToText = lessonToText;

  // ── Fóruns da aula: o que é preciso para criar cada um no Moodle ──
  const realUrl = (u) => /^https?:\/\/[^\s/$.?#]+\.[^\s]*$/i.test(String(u || "").trim());
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function collectForums(lesson) {
    const found = [];
    const walk = (blocks, section) => (blocks || []).forEach((b) => {
      const p = b.props || {};
      const kids = Array.isArray(p.children) ? p.children : [];
      if (b.type === "forum") {
        found.push({
          id: b.id, section: section || "",
          title: plain(p.title) || "Fórum de discussão",
          promptHtml: String(p.prompt || ""), prompt: plain(p.prompt),
          dueInitial: plain(p.dueInitial), dueReplies: plain(p.dueReplies),
          rules: (p.rules || []).map((r) => plain(r)).filter(Boolean),
          criteriaHtml: p.showCriteria ? String(p.criteria || "") : "", criteria: p.showCriteria ? plain(p.criteria) : "",
          href: String(p.href || "").trim(), hasLink: realUrl(p.href)
        });
      }
      if (kids.length) { const t = kids.find((k) => k.type === "titulo"); walk(kids, section || (t ? plain((t.props || {}).text) : "") || plain(p.title)); }
    });
    walk((lesson && lesson.blocks) || [], "");
    return found;
  }
  // Descrição do fórum no formato do editor do Moodle (HTML simples).
  function forumDescriptionHtml(f) {
    const out = [];
    if (f.promptHtml) out.push(f.promptHtml);
    if (f.dueInitial || f.dueReplies) out.push("<p>" + [f.dueInitial ? "<strong>Contribuição inicial:</strong> " + esc(f.dueInitial) : "", f.dueReplies ? "<strong>Respostas aos colegas:</strong> " + esc(f.dueReplies) : ""].filter(Boolean).join("<br>") + "</p>");
    if (f.rules.length) out.push("<p><strong>Como participar</strong></p><ul>" + f.rules.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>");
    if (f.criteriaHtml) out.push("<p><strong>Como será avaliado</strong></p>" + f.criteriaHtml);
    return out.join("\n");
  }
  function forumDescriptionText(f) {
    const out = [];
    if (f.prompt) out.push(f.prompt);
    if (f.dueInitial) out.push("Contribuição inicial: " + f.dueInitial);
    if (f.dueReplies) out.push("Respostas aos colegas: " + f.dueReplies);
    if (f.rules.length) out.push("Como participar:\n" + f.rules.map((r) => "- " + r).join("\n"));
    if (f.criteria) out.push("Como será avaliado:\n" + f.criteria);
    return out.join("\n\n");
  }
  function forumsText(forums, title) {
    const L = ["FÓRUNS PARA CRIAR NO MOODLE — " + (title || "Aula"), "",
      "Para cada fórum: no curso do Moodle, Ativar edição → Adicionar uma atividade ou recurso → Fórum. Copie o Nome e a Descrição abaixo,",
      "ajuste as datas em «Disponibilidade» (e a nota, se o fórum for avaliativo) e salve. Depois abra o fórum, copie o endereço da barra do",
      "navegador e cole no campo «Endereço do fórum» do bloco no ClassAtelier. Publique a aula de novo para o botão levar ao fórum.", ""];
    if (!forums.length) L.push("Esta aula não tem bloco de fórum.");
    forums.forEach((f, n) => {
      L.push("── Fórum " + (n + 1) + " ──────────────────────────", "Nome: " + f.title, f.section ? "Seção da aula: " + f.section : "", "Situação: " + (f.hasLink ? "já tem endereço (" + f.href + ")" : "A CRIAR — o bloco ainda não tem o endereço do fórum"), "", "Descrição:", forumDescriptionText(f), "");
    });
    return L.filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n").trim() + "\n";
  }
  Object.assign(window, { collectForums, forumDescriptionHtml, forumDescriptionText, forumsText });
})();
