/* eslint-disable */
// ════════════════════════════════════════════════════════════
// ClassAtelier — IMPORTAR uma aula do Moodle
// ────────────────────────────────────────────────────────────
// Dois caminhos, os dois terminam em blocos do ClassAtelier:
//   • HTML colado (código-fonte do editor do Moodle, conteúdo copiado da página ou só texto)
//   • Backup do Moodle (.mbz): ZIP com XML, lido aqui mesmo no navegador
//
// Este arquivo é só lógica (sem React), para poder ser testado no node:
//   Importador.htmlParaModelo(html, opts)        → { model, warnings, notes, stats, plain }
//   Importador.lerBackup(buffer, opts)           → Promise<backup>
//   Importador.itensParaModelo(backup, keys, o)  → Promise<{ model, warnings, notes, stats }>
//   Importador.filtrar(model, excluidos)         → model sem os blocos desmarcados
//   Importador.avisos(model, excluidos)          → { warnings, notes } (recalculado)
//   Importador.montarAula(model, opts)           → { meta, blocks }
//
// Cada bloco convertido leva um `_imp` (só na prévia; montarAula o remove):
//   { status: "ok" | "revisar" | "pendente", notes: [{ msg, level, where }], img?: "importada" | "referenciada" | "reenviar" }
//
// Segurança: o HTML de entrada nunca é reaproveitado como está. Só passam
// negrito, itálico, links http(s), listas, sub/sobrescrito e código; scripts,
// estilos e atributos (style, class, on*) são descartados.
// ════════════════════════════════════════════════════════════
(function () {
  "use strict";
  var G = typeof window !== "undefined" ? window : globalThis;

  function rid(p) { return p + Math.random().toString(36).slice(2, 9); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }
  function unesc(s) { return String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&"); }
  function plain(s) { return String(s == null ? "" : s).replace(/[ \s]+/g, " ").trim(); }
  function isBlank(html) { return !String(html || "").replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").replace(/&nbsp;|[ \s]/g, "").length; }
  function strip(html) { return unesc(plain(String(html == null ? "" : html).replace(/<[^>]*>/g, " "))); }

  function defaults(type) {
    var d = G.BLOCK_BY_TYPE && G.BLOCK_BY_TYPE[type];
    return d && d.props ? JSON.parse(JSON.stringify(d.props)) : {};
  }
  // Bloco-filho (dentro de um tópico), já com todas as propriedades padrão do tipo.
  function mk(type, props) { return { id: rid("c"), type: type, props: Object.assign(defaults(type), props || {}) }; }
  // Bloco de primeiro nível (tópico, abertura, divisor).
  function mkRoot(type, props) {
    var b;
    if (G.newBlock && G.BLOCK_BY_TYPE && G.BLOCK_BY_TYPE[type]) b = G.newBlock(type);
    else b = { id: rid("b"), type: type, bg: "neutral-default", pad: "normal", props: {} };
    Object.assign(b.props, props || {});
    return b;
  }

  // ───────────── Endereços ─────────────
  var COURSE_LINK = /\/pluginfile\.php|\/draftfile\.php|\/course\/view\.php|\/mod\/[a-z0-9_]+\/|\/user\/|\/grade\/|\/enrol\/|\/calendar\/|\/group\/|\/blocks\//i;
  // Endereço que só funciona dentro do Moodle (arquivo, anexo, caminho relativo).
  function isMoodleLocal(u) {
    u = String(u || "").trim();
    if (!u) return true;
    if (/@@PLUGINFILE@@|\/pluginfile\.php|\/draftfile\.php|\/webservice\/pluginfile/i.test(u)) return true;
    if (/^(https?:)?\/\//i.test(u) || /^data:/i.test(u) || /^mailto:/i.test(u)) return false;
    return true;
  }
  // Completa um endereço relativo a partir da URL de origem (se houver). Devolve "" se não der.
  function absolute(u, base) {
    u = String(u || "").trim();
    if (!u || /@@PLUGINFILE@@/.test(u)) return "";
    if (/^(https?:|mailto:|data:)/i.test(u)) return u;
    if (/^\/\//.test(u)) return "https:" + u;
    if (!base) return "";
    try { return new URL(u, base).href; } catch (e) { return ""; }
  }
  function fileNameOf(u) {
    var s = String(u || "").split(/[?#]/)[0].split("/").pop();
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }
  function ytId(u) { var m = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?(?:[^#]*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(String(u || "")); return m ? m[1] : ""; }
  function ytStart(u) { var m = /[?&#](?:start|t)=(\d+)/.exec(String(u || "")); return m ? m[1] : ""; }

  // ───────────── Contexto de conversão (avisos presos ao bloco e ao lugar de origem) ─────────────
  var RANK = { ok: 0, info: 0, revisar: 1, pendente: 2 };
  function newCtx(opts) {
    return {
      out: [], buf: [], bufNotes: [], acc: null, accNotes: [], opts: opts || {}, orphans: [], lastTitle: "",
      where: function () { return this.lastTitle ? "em «" + this.lastTitle + "»" : "no início"; },
      // anexa um aviso a um bloco já criado
      tag: function (block, level, msg) {
        if (!block) return;
        var i = block._imp || (block._imp = { status: "ok", notes: [] });
        if (!i.notes.some(function (n) { return n.msg === msg; })) i.notes.push({ msg: msg, level: level, where: this.where() });
        if ((RANK[level] || 0) > (RANK[i.status] || 0)) i.status = level;
      },
      // aviso de um trecho de texto ainda sem bloco: vai para o próximo parágrafo criado
      note: function (msg, level) { this.bufNotes.push({ msg: msg, level: level || "revisar", where: this.where() }); },
      // aviso sem bloco (conteúdo que não pôde ser importado)
      orphan: function (msg, level) { var w = this.where(); if (!this.orphans.some(function (o) { return o.msg === msg && o.where === w; })) this.orphans.push({ msg: msg, level: level || "revisar", where: w }); },
    };
  }
  function flush(ctx) {
    if (ctx.buf.length) {
      var body = ctx.buf.join(""); ctx.buf = [];
      if (!isBlank(body)) {
        var b = mk("prose", { body: body });
        ctx.out.push(b);
        ctx.bufNotes.forEach(function (n) { ctx.tag(b, n.level, n.msg); });
        ctx.bufNotes = [];
      }
    }
    if (ctx.bufNotes.length && !ctx.buf.length && !ctx.pendingRun) {
      var last = ctx.out[ctx.out.length - 1];
      ctx.bufNotes.forEach(function (n) { if (last) ctx.tag(last, n.level, n.msg); else ctx.orphan(n.msg, n.level); });
      ctx.bufNotes = [];
    }
  }
  function closeAcc(ctx) {
    if (!ctx.acc) return;
    flush(ctx);
    var b = mk("accordion", { items: ctx.acc });
    ctx.out.push(b);
    ctx.accNotes.forEach(function (n) { ctx.tag(b, n.level, n.msg); });
    ctx.acc = null; ctx.accNotes = [];
  }
  function sub(el, ctx) {
    var s = newCtx(ctx.opts); s.lastTitle = ctx.lastTitle;
    walkChildren(el, s); closeAcc(s); flush(s);
    var notes = [];
    s.out.forEach(function (b) { if (b._imp) b._imp.notes.forEach(function (n) { notes.push(n); }); });
    s.orphans.forEach(function (n) { notes.push(n); });
    return { blocks: s.out, notes: notes };
  }
  function bodyOf(blocks) {
    var dropped = {};
    var body = blocks.map(function (b) {
      if (b.type === "prose") return b.props.body;
      if (b.type === "titulo") return "<p><strong>" + b.props.text + "</strong></p>";
      dropped[b.type] = 1;
      return "";
    }).join("");
    return { body: body, dropped: Object.keys(dropped) };
  }

  // ───────────── HTML → HTML limpo (só o que a aula aceita) ─────────────
  var SKIP = { script: 1, style: 1, noscript: 1, link: 1, meta: 1, head: 1, title: 1, button: 1, form: 1, input: 1, select: 1, textarea: 1, nav: 1, svg: 1, canvas: 1, object: 1, embed: 1, template: 1 };
  var INLINE = { a: 1, abbr: 1, b: 1, strong: 1, i: 1, em: 1, u: 1, sub: 1, sup: 1, br: 1, code: 1, mark: 1, small: 1, span: 1, font: 1, s: 1, del: 1, ins: 1, cite: 1, q: 1, kbd: 1, "var": 1, samp: 1, time: 1, label: 1, bdi: 1, wbr: 1, big: 1, tt: 1, strike: 1, dfn: 1 };
  var MEDIA_SEL = "img,iframe,video,audio,table,ul,ol,pre,blockquote,h1,h2,h3,h4,h5,h6,figure,div,p,details";

  function hasBlock(el) { return !!el.querySelector(MEDIA_SEL); }

  function chipOf(latex, ctx) {
    var chip = ctx.opts.chip || (G.InlineMath && G.InlineMath.chipHtml);
    return chip ? chip(latex) : "$" + esc(latex) + "$";
  }
  function mathInline(html, ctx) {
    if (html.indexOf("\\(") < 0) return html;
    return html.replace(/\\\(([\s\S]*?)\\\)/g, function (all, tex) {
      var latex = unesc(tex).replace(/<[^>]*>/g, "").trim();
      return latex ? chipOf(latex, ctx) : all;
    });
  }

  // Fórmula que o Moodle desenhou como imagem: o texto alternativo costuma trazer o LaTeX.
  function formulaImg(img) {
    var cls = img.getAttribute("class") || "", src = img.getAttribute("src") || "", alt = (img.getAttribute("alt") || "").trim();
    var isF = /\b(texrender|mathjax|latex|equation|math)\b/i.test(cls) || /filter\/tex|texrender|latex\.php|mathjax|\/tex\/pix/i.test(src);
    if (!isF) return null;
    var tex = alt.replace(/^\$\$?\s*|\s*\$\$?$/g, "").replace(/^\\\(|\\\)$/g, "").trim();
    return { latex: /[\\^_{}=]/.test(tex) ? tex : "" };
  }

  function inlineHtml(node, ctx) {
    var out = "";
    Array.prototype.forEach.call(node.childNodes, function (c) {
      if (c.nodeType === 3) { out += esc(c.nodeValue.replace(/ /g, " ")); return; }
      if (c.nodeType !== 1) return;
      var t = c.tagName.toLowerCase();
      if (SKIP[t]) return;
      if (t === "br") { out += "<br>"; return; }
      if (t === "img") {
        var f = formulaImg(c);
        if (f && f.latex) { out += chipOf(f.latex, ctx); return; }
        var nm = fileNameOf(c.getAttribute("src")) || "sem nome";
        ctx.note((f ? "fórmula como imagem sem código (" + nm + "): recrie a expressão" : "imagem dentro de lista, tabela ou texto corrido não veio (" + nm + ")"), "revisar");
        return;
      }
      var inner = inlineHtml(c, ctx);
      switch (t) {
        case "b": case "strong": out += isBlank(inner) ? inner : "<strong>" + inner + "</strong>"; break;
        case "i": case "em": case "cite": case "dfn": out += isBlank(inner) ? inner : "<em>" + inner + "</em>"; break;
        case "u": case "ins": out += isBlank(inner) ? inner : "<u>" + inner + "</u>"; break;
        case "sub": case "sup": case "mark": out += isBlank(inner) ? inner : "<" + t + ">" + inner + "</" + t + ">"; break;
        case "s": case "del": case "strike": out += isBlank(inner) ? inner : "<s>" + inner + "</s>"; break;
        case "code": case "kbd": case "samp": case "tt": out += isBlank(inner) ? inner : "<code>" + inner + "</code>"; break;
        case "a": {
          var raw = (c.getAttribute("href") || "").trim(), label = plain(c.textContent) || fileNameOf(raw);
          if (!raw || /^javascript:/i.test(raw)) { out += inner; break; }
          if (raw.charAt(0) === "#") { ctx.note("link interno para uma seção virou texto: «" + label + "»", "info"); out += inner; break; }
          if (/@@PLUGINFILE@@/.test(raw)) { ctx.note("anexo do Moodle não importado: " + (fileNameOf(raw) || label), "revisar"); out += inner; break; }
          var abs = absolute(raw, ctx.opts.baseUrl);
          if (!abs) { ctx.note("link sem endereço completo (" + raw + "): informe a URL original para resolver. Ficou só o texto «" + label + "»", "revisar"); out += inner; break; }
          if (!/^(https?:\/\/|mailto:)/i.test(abs)) { out += inner; break; }
          if (COURSE_LINK.test(abs)) ctx.note((/pluginfile|draftfile/i.test(abs) ? "anexo" : "link") + " do curso de origem (só abre com acesso a ele): «" + label + "»", "revisar");
          out += "<a href=\"" + escAttr(abs) + "\">" + inner + "</a>";
          break;
        }
        default: out += inner; // span, font, small… viram só o conteúdo
      }
    });
    return out;
  }

  function listHtml(el, ctx) {
    var tag = el.tagName.toLowerCase() === "ol" ? "ol" : "ul", out = "<" + tag + ">";
    Array.prototype.forEach.call(el.children, function (li) {
      if (li.tagName.toLowerCase() !== "li") return;
      var txt = "", nested = "";
      Array.prototype.forEach.call(li.childNodes, function (c) {
        if (c.nodeType === 1 && /^(ul|ol)$/i.test(c.tagName)) nested += listHtml(c, ctx);
        else if (c.nodeType === 1 && /^(p|div)$/i.test(c.tagName)) txt += (txt ? "<br>" : "") + inlineHtml(c, ctx);
        else txt += inlineHtml({ childNodes: [c] }, ctx);
      });
      out += "<li>" + mathInline(txt.trim(), ctx) + nested + "</li>";
    });
    return out + "</" + tag + ">";
  }

  // ───────────── Blocos ─────────────
  function addImage(ctx, img, caption) {
    var src = (img.getAttribute("src") || "").trim(), cls = (img.getAttribute("class") || "");
    var w = parseInt(img.getAttribute("width"), 10), h = parseInt(img.getAttribute("height"), 10);
    if (/\b(icon|emoticon|smiley)\b/i.test(cls) || (w && w <= 32) || (h && h <= 32)) return;
    var f = formulaImg(img);
    if (f && f.latex) { flush(ctx); var eq = mk("equacao", { latex: f.latex }); ctx.out.push(eq); ctx.tag(eq, "info", "fórmula que era imagem virou equação editável"); return; }
    var alt = plain(img.getAttribute("alt")), name = fileNameOf(src);
    flush(ctx);
    var shown = "", kind, origem = "";
    if (/^data:image\//i.test(src)) { shown = src; kind = "importada"; }
    else if (/^https?:\/\//i.test(src) && !isMoodleLocal(src)) { shown = src; kind = "referenciada"; }
    else {
      kind = "reenviar"; origem = absolute(src, ctx.opts.baseUrl) || name;
    }
    var block = mk("imagem", { src: shown, slotId: "", caption: esc(plain(caption)), alt: alt, credit: "", ratio: w && h ? Math.round(w) + "/" + Math.round(h) : "16/9" });
    if (kind === "reenviar" && origem) block.props.origemArquivo = origem;
    block._imp = { status: "ok", notes: [], img: kind };
    ctx.out.push(block);
    if (kind === "reenviar") ctx.tag(block, "pendente", (f ? "fórmula como imagem sem código" : "imagem vinculada ao curso de origem") + (name ? " (" + name + ")" : "") + ": reenvie o arquivo");
    else if (kind === "referenciada") ctx.tag(block, "info", "imagem só referenciada pelo endereço original: se o site sair do ar, ela some. Envie o arquivo para guardá-la na aula");
    if (f && kind !== "reenviar") ctx.tag(block, "revisar", "fórmula como imagem sem código" + (name ? " (" + name + ")" : "") + ": a imagem foi mantida; recrie a expressão para poder editá-la");
    if (!alt && !caption) ctx.tag(block, "revisar", "imagem sem texto alternativo nem legenda");
  }

  function linkBlock(ctx, rotulo, title, url, msg) {
    flush(ctx);
    var b = mk("prose", { body: "<p>" + esc(rotulo) + ": <a href=\"" + escAttr(url) + "\">" + esc(title || fileNameOf(url) || url) + "</a></p>" });
    ctx.out.push(b); ctx.tag(b, "revisar", msg);
  }

  function addEmbed(ctx, el) {
    var raw = (el.getAttribute("src") || "").trim(), title = plain(el.getAttribute("title")), src = absolute(raw, ctx.opts.baseUrl);
    flush(ctx);
    var isH5p = /\/h5p\/|h5p\.org|h5pactivity/i.test(raw);
    if (isH5p) {
      if (/^https?:/i.test(src)) linkBlock(ctx, "Atividade interativa (H5P)", title || "abrir no Moodle", src, "interação importada como link: recrie no ClassAtelier ou mantenha o H5P no Moodle");
      else ctx.orphan("H5P não importado" + (title ? ": " + title : "") + " (sem endereço utilizável: informe a URL original)", "pendente");
      return;
    }
    if (!src || isMoodleLocal(src)) {
      if (/^https?:/i.test(src)) linkBlock(ctx, "Conteúdo incorporado", title || "abrir", src, "conteúdo incorporado do Moodle virou link");
      else ctx.orphan("conteúdo incorporado do Moodle não importado" + (title ? ": " + title : ""), "pendente");
      return;
    }
    var id = ytId(src);
    if (id) { ctx.out.push(mk("video", { id: id, title: title || "Vídeo", caption: "", credit: "", start: ytStart(src) })); return; }
    var h = parseInt(el.getAttribute("height"), 10), w = el.getAttribute("width");
    var code = '<iframe src="' + escAttr(src) + '"' + (w ? ' width="' + escAttr(w) + '"' : "") + (h ? ' height="' + h + '"' : "") + (title ? ' title="' + escAttr(title) + '"' : "") + ' allowfullscreen></iframe>';
    ctx.out.push(mk("externalembed", { title: title || "Conteúdo incorporado", embed: code, height: h || 600 }));
  }

  function addMedia(ctx, el) {
    var t = el.tagName.toLowerCase(), raw = (el.getAttribute("src") || "").trim();
    if (!raw) { var s = el.querySelector("source[src]"); raw = s ? (s.getAttribute("src") || "").trim() : ""; }
    var src = absolute(raw, ctx.opts.baseUrl), nome = t === "audio" ? "Áudio" : "Vídeo";
    flush(ctx);
    if (t === "audio" && src && !isMoodleLocal(src)) { ctx.out.push(mk("audio", { src: src, spotify: "", title: plain(el.getAttribute("title")) || "Áudio", show: "", description: "", duration: "" })); return; }
    if (/^https?:/i.test(src)) { linkBlock(ctx, nome + " do curso de origem", fileNameOf(src), src, nome.toLowerCase() + " hospedado no Moodle virou link (só abre com acesso ao curso): envie o arquivo ou use o YouTube"); return; }
    ctx.orphan(nome.toLowerCase() + " do Moodle não importado" + (fileNameOf(raw) ? " (" + fileNameOf(raw) + ")" : "") + ": envie o arquivo ou use um vídeo do YouTube", "pendente");
  }

  function addTable(ctx, el) {
    flush(ctx);
    var carry = {}, rows = [], merged = false;
    Array.prototype.forEach.call(el.querySelectorAll("tr"), function (tr) {
      if (tr.closest("table") !== el) return;
      var cells = [], c = 0, isHead = false, any = false;
      var fillCarry = function () { while (carry[c] > 0) { cells.push(""); carry[c]--; c++; merged = true; } };
      Array.prototype.forEach.call(tr.children, function (cell) {
        if (!/^(td|th)$/i.test(cell.tagName)) return;
        any = true; fillCarry();
        var cs = Math.max(1, parseInt(cell.getAttribute("colspan"), 10) || 1), rs = Math.max(1, parseInt(cell.getAttribute("rowspan"), 10) || 1);
        cells.push(mathInline(inlineHtml(cell, ctx).replace(/(<br>)+$/, "").trim(), ctx));
        for (var k = 1; k < cs; k++) { cells.push(""); merged = true; }
        if (rs > 1) { for (var k2 = 0; k2 < cs; k2++) carry[c + k2] = rs - 1; merged = true; }
        c += cs;
      });
      fillCarry();
      if (any) { rows.push({ cells: cells, head: (!!tr.querySelector("th") && !tr.querySelector("td")) || !!tr.closest("thead") }); }
    });
    if (!rows.length) return;
    var headers = rows[0].cells, body = rows.slice(1), semCab = !rows[0].head;
    var n = Math.max.apply(null, [headers.length].concat(body.map(function (r) { return r.cells.length; })));
    var pad = function (a) { a = a.slice(); while (a.length < n) a.push(""); return a; };
    var cap = el.querySelector("caption");
    var b = mk("tabela", { caption: cap ? esc(plain(cap.textContent)) : "", fonte: "", headers: pad(headers), rows: body.map(function (r) { return pad(r.cells); }) });
    ctx.out.push(b);
    if (semCab) ctx.tag(b, "info", "tabela sem cabeçalho: a primeira linha virou cabeçalho");
    if (merged) ctx.tag(b, "revisar", "tabela com células mescladas requer revisão: o ClassAtelier não mescla células; o texto ficou na primeira célula e as outras estão vazias");
  }

  function addCode(ctx, el) {
    flush(ctx);
    var codeEl = el.querySelector("code"), cls = ((el.getAttribute("class") || "") + " " + (codeEl ? codeEl.getAttribute("class") || "" : "")),
      m = /(?:language|lang|brush)[-:\s]+([\w+#-]+)/i.exec(cls), lang = m ? m[1].toLowerCase() : "text";
    if (lang === "py") lang = "python"; if (lang === "js") lang = "javascript"; if (lang === "ts") lang = "typescript";
    if (G.CODE_LANGUAGES && !G.CODE_LANGUAGES.some(function (l) { return l[0] === lang; })) lang = "text";
    var code = (codeEl || el).textContent.replace(/ /g, " ").replace(/^\n+|\s+$/g, "");
    if (!code) return;
    var b = mk("codigo", { code: code, language: lang });
    ctx.out.push(b);
    if (!m) ctx.tag(b, "info", "linguagem do código não identificada na origem: confira no painel");
  }

  function addQuote(ctx, el) {
    flush(ctx);
    var author = "", c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll("footer,cite,figcaption"), function (n) { author = author || plain(n.textContent).replace(/^[—–-]\s*/, ""); n.parentNode.removeChild(n); });
    var q = plain(c.textContent);
    if (q) ctx.out.push(mk("citacao", { quote: esc(q), author: esc(author), source: "", showAttribution: !!author }));
  }

  function giveNotes(ctx, block, s, dropped, kind) {
    s.notes.forEach(function (n) { ctx.tag(block, n.level, n.msg); });
    if (dropped.length) ctx.tag(block, "revisar", "conteúdo dentro " + kind + " que não é texto (" + dropped.join(", ") + ") não foi importado");
  }

  function toneBlock(ctx, el, kind) {
    flush(ctx);
    var s = sub(el, ctx), blocks = s.blocks, title = "";
    if (blocks.length && blocks[0].type === "titulo") title = blocks.shift().props.text;
    var b = bodyOf(blocks);
    if (isBlank(b.body)) return;
    var block = mk(kind, { title: title || (kind === "atencao" ? "Atenção" : "Veja bem"), body: b.body });
    ctx.out.push(block);
    ctx.tag(block, "info", "caixa informativa convertida em " + (kind === "atencao" ? "Atenção" : "Destaque") + ": confira a escolha");
    giveNotes(ctx, block, s, b.dropped, "da caixa");
  }

  function handleP(el, ctx) {
    var imgs = Array.prototype.slice.call(el.querySelectorAll("img")), real = imgs.filter(function (i) { var f = formulaImg(i); return !(f && f.latex); });
    if (real.length || el.querySelector("iframe,video,audio,table,figure,pre")) { walkChildren(el, ctx); return; }
    // parágrafo só com a imagem de uma fórmula → bloco Equação
    if (imgs.length === 1 && !plain(el.textContent)) { addImage(ctx, imgs[0], ""); return; }
    var html = inlineHtml(el, ctx);
    if (isBlank(html)) return;
    var text = plain(el.textContent);
    var links = el.querySelectorAll("a[href]");
    if (links.length === 1 && ytId(links[0].getAttribute("href")) && plain(links[0].textContent) === text) {
      flush(ctx); var u = links[0].getAttribute("href");
      ctx.out.push(mk("video", { id: ytId(u), title: "Vídeo", caption: "", credit: "", start: ytStart(u) })); return;
    }
    var mm = /^(?:\$\$([\s\S]+)\$\$|\\\[([\s\S]+)\\\])$/.exec(text);
    if (mm) { flush(ctx); ctx.out.push(mk("equacao", { latex: (mm[1] || mm[2]).trim() })); return; }
    ctx.buf.push("<p>" + mathInline(html.trim(), ctx) + "</p>");
  }

  function handleBlock(el, ctx) {
    var t = el.tagName.toLowerCase();
    if (SKIP[t] || t === "hr") return;
    if (/^h[1-6]$/.test(t)) {
      var text = plain(inlineHtml(el, ctx).replace(/<[^>]*>/g, ""));
      if (text) { flush(ctx); ctx.out.push(mk("titulo", { text: text, level: t === "h1" || t === "h2" ? "h2" : "h3" })); ctx.lastTitle = unesc(text); }
      return;
    }
    switch (t) {
      case "p": return handleP(el, ctx);
      case "ul": case "ol": { var l = listHtml(el, ctx); if (!isBlank(l)) ctx.buf.push(l); return; }
      case "blockquote": return addQuote(ctx, el);
      case "table": return addTable(ctx, el);
      case "pre": return addCode(ctx, el);
      case "img": return addImage(ctx, el, "");
      case "iframe": return addEmbed(ctx, el);
      case "video": case "audio": return addMedia(ctx, el);
      case "figure": {
        var img = el.querySelector("img"), fc = el.querySelector("figcaption");
        if (img && !el.querySelector("iframe,video,audio,table")) { addImage(ctx, img, fc ? fc.textContent : ""); return; }
        return walkChildren(el, ctx);
      }
      case "details": {
        var sm = el.querySelector("summary"), clone = el.cloneNode(true), s2 = clone.querySelector("summary");
        if (s2) s2.parentNode.removeChild(s2);
        return addAccordionItem(ctx, sm ? inlineHtml(sm, ctx).trim() : "Detalhes", clone);
      }
      default: {
        var cls = (el.getAttribute("class") || "");
        if (/\bcard\b/.test(cls)) {
          var hd = el.querySelector(".card-header");
          if (hd && el.querySelector(".card-body, .collapse")) {
            var c2 = el.cloneNode(true), h2 = c2.querySelector(".card-header"); h2.parentNode.removeChild(h2);
            return addAccordionItem(ctx, esc(plain(hd.textContent)), c2);
          }
        }
        if (/\balert-(warning|danger)\b/.test(cls)) return toneBlock(ctx, el, "atencao");
        if (/\balert-(info|success|primary|secondary|light|dark)\b|\bcallout\b/.test(cls)) return toneBlock(ctx, el, "destaque");
        if (/\bnav-tabs\b|\btab-content\b|\bcarousel\b|\bswiper\b|\bslick-/.test(cls) || el.getAttribute("role") === "tablist") ctx.note("interação (abas ou carrossel) importada só como texto: recrie com Slider ou Accordion", "revisar");
        return walkChildren(el, ctx);
      }
    }
  }
  function addAccordionItem(ctx, title, bodyEl) {
    var s = sub(bodyEl, ctx), b = bodyOf(s.blocks);
    if (!ctx.acc) { flush(ctx); ctx.acc = []; ctx.accNotes = []; }
    ctx.acc.push({ title: title, body: isBlank(b.body) ? "<p></p>" : b.body, children: [] });
    s.notes.forEach(function (n) { ctx.accNotes.push(n); });
    if (b.dropped.length) ctx.accNotes.push({ msg: "conteúdo dentro do item recolhível que não é texto (" + b.dropped.join(", ") + ") não foi importado", level: "revisar", where: ctx.where() });
  }

  function walkChildren(el, ctx) {
    var run = "";
    var endRun = function () {
      if (!isBlank(run)) ctx.buf.push("<p>" + mathInline(run.trim(), ctx) + "</p>");
      run = "";
    };
    Array.prototype.forEach.call(el.childNodes, function (c) {
      if (c.nodeType === 3) {
        if (!/\S/.test(c.nodeValue.replace(/ /g, " "))) { run += " "; return; }
        closeAcc(ctx); run += esc(c.nodeValue.replace(/ /g, " ")); return;
      }
      if (c.nodeType !== 1) return;
      var t = c.tagName.toLowerCase();
      if (SKIP[t]) return;
      if (INLINE[t] && !hasBlock(c)) { closeAcc(ctx); run += inlineHtml({ childNodes: [c] }, ctx); return; }
      var isAcc = t === "details" || (/\bcard\b/.test(c.getAttribute("class") || "") && c.querySelector(".card-header") && c.querySelector(".card-body, .collapse"));
      if (!isAcc) closeAcc(ctx);
      endRun();
      handleBlock(c, ctx);
    });
    endRun();
  }

  function parseBody(html) {
    var DP = G.DOMParser;
    if (!DP) throw new Error("Este navegador não consegue ler HTML.");
    return new DP().parseFromString("<!doctype html><body>" + String(html || ""), "text/html").body;
  }

  // ───────────── Texto simples ─────────────
  function looksHtml(s) { return /<\s*(p|div|span|h[1-6]|ul|ol|li|table|br|img|a|strong|em|b|i|section|article|blockquote|pre|iframe|figure|details)\b[^>]*>/i.test(s); }
  // Sem HTML: parágrafos separados por linha em branco; linhas iniciadas por «-», «•» ou «1.» viram lista.
  function textoParaHtml(text) {
    var lines = String(text).replace(/\r\n?/g, "\n").split("\n"), out = "", para = [], list = null;
    var endPara = function () { if (para.length) { out += "<p>" + para.map(esc).join("<br>") + "</p>"; para = []; } };
    var endList = function () { if (list) { out += "<" + list.tag + ">" + list.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</" + list.tag + ">"; list = null; } };
    lines.forEach(function (ln) {
      var t = ln.trim(), mb = /^[-•*–]\s+(.*)$/.exec(t), mn = /^\d+[.)]\s+(.*)$/.exec(t);
      if (!t) { endPara(); endList(); return; }
      if (mb || mn) { endPara(); var tag = mb ? "ul" : "ol"; if (list && list.tag !== tag) endList(); if (!list) list = { tag: tag, items: [] }; list.items.push((mb || mn)[1]); return; }
      endList(); para.push(t);
    });
    endPara(); endList();
    return out;
  }

  // ───────────── Coleta dos avisos de um conjunto de blocos ─────────────
  function fmt(n) { return n.msg + (n.where ? " — " + n.where : ""); }
  function coletar(children, orphans, prefix, excl) {
    var warnings = [], notes = [], seen = {};
    var add = function (n) {
      var s = (prefix ? prefix + ": " : "") + fmt(n);
      if (seen[s]) return; seen[s] = 1;
      (n.level === "info" ? notes : warnings).push(s);
    };
    children.forEach(function (b) { if (excl && excl[b.id]) return; if (b._imp) b._imp.notes.forEach(add); });
    (orphans || []).forEach(add);
    return { warnings: warnings, notes: notes };
  }
  function contarTipos(children, excl) {
    var stats = {};
    children.forEach(function (b) { if (excl && excl[b.id]) return; stats[b.type] = (stats[b.type] || 0) + 1; });
    return stats;
  }

  // HTML do Moodle (ou texto simples) → lista de blocos-filhos (ainda sem tópicos).
  // opts: { baseUrl, chip, plain, detectPlain }
  function htmlParaBlocos(html, opts) {
    opts = opts || {};
    var plainMode = !!opts.plain || (!!opts.detectPlain && !looksHtml(String(html || "")));
    if (plainMode) html = textoParaHtml(html);
    var ctx = newCtx(opts), root = parseBody(html);
    walkChildren(root, ctx); closeAcc(ctx); flush(ctx);
    var c = coletar(ctx.out, ctx.orphans);
    return { children: ctx.out, orphans: ctx.orphans, warnings: c.warnings, notes: c.notes, stats: contarTipos(ctx.out), plain: plainMode };
  }

  // ───────────── Resumo de um bloco (para a prévia) ─────────────
  var TIPOS = { prose: "Parágrafo", titulo: "Título", imagem: "Imagem", video: "Vídeo", tabela: "Tabela", citacao: "Citação", codigo: "Código", accordion: "Accordion", equacao: "Equação", externalembed: "Incorporado", destaque: "Destaque", atencao: "Atenção", audio: "Áudio" };
  function resumo(b) {
    var p = b.props || {}, t = "";
    switch (b.type) {
      case "titulo": t = p.text; break;
      case "prose": t = p.body; break;
      case "imagem": t = p.caption || p.alt || (p.origemArquivo ? fileNameOf(p.origemArquivo) : "") || "(sem legenda)"; break;
      case "video": case "audio": case "externalembed": t = p.title; break;
      case "tabela": t = (p.headers || []).join(" · "); break;
      case "citacao": t = p.quote; break;
      case "codigo": t = String(p.code || "").split("\n")[0]; break;
      case "accordion": t = (p.items || []).map(function (i) { return i.title; }).join(" / "); break;
      case "equacao": t = p.latex; break;
      default: t = p.title || p.body || "";
    }
    if (G.InlineMath && G.InlineMath.htmlWithoutInlineMath && /aula-ieq/.test(String(t))) t = G.InlineMath.htmlWithoutInlineMath(String(t)); // fórmula na linha vira $latex$
    else t = String(t == null ? "" : t).replace(/<span class="aula-ieq[\s\S]*?<\/span><\/span><\/span>|<span class="aula-ieq[^>]*>[\s\S]*?<\/span>/g, "[fórmula]");
    t = strip(t);
    return { tipo: TIPOS[b.type] || b.type, texto: t.length > 90 ? t.slice(0, 89) + "…" : t };
  }

  // ───────────── Modelo: filtrar, avisos, montar a aula ─────────────
  function itensDoModelo(model) { var all = []; model.sections.forEach(function (s) { s.items.forEach(function (it) { all.push(it); }); }); return all; }
  function filtrar(model, excl) {
    excl = excl || {};
    var secs = [];
    model.sections.forEach(function (s) {
      var items = [];
      s.items.forEach(function (it) {
        var kids = it.children.filter(function (k) { return !excl[k.id]; });
        if (kids.length) items.push(Object.assign({}, it, { children: kids }));
      });
      if (items.length) secs.push(Object.assign({}, s, { items: items }));
    });
    return Object.assign({}, model, { sections: secs });
  }
  function avisos(model, excl) {
    var items = itensDoModelo(model), w = [], n = [];
    items.forEach(function (it) {
      var c = coletar(it.children, it.orphans, items.length > 1 && it.title ? it.title : "", excl);
      c.warnings.forEach(function (x) { if (w.indexOf(x) < 0) w.push(x); });
      c.notes.forEach(function (x) { if (n.indexOf(x) < 0) n.push(x); });
    });
    return { warnings: w, notes: n };
  }
  function contar(model, excl) {
    var stats = {};
    itensDoModelo(model).forEach(function (it) { var s = contarTipos(it.children, excl); Object.keys(s).forEach(function (k) { stats[k] = (stats[k] || 0) + s[k]; }); });
    return stats;
  }
  function limpo(k) { var c = Object.assign({}, k); delete c._imp; return c; }

  // model: { title, eyebrow, origem, sections: [{ name, items: [{ title, addTitle, children }] }] }
  // opts:  { hero: bool, baseMeta }
  function montarAula(model, opts) {
    opts = opts || {};
    var blocks = [], words = 0;
    model.sections.forEach(function (s) { s.items.forEach(function (it) { it.children.forEach(function (c) {
      if (c.type === "prose") words += plain(String(c.props.body).replace(/<[^>]*>/g, " ")).split(" ").length;
    }); }); });
    if (opts.hero) {
      blocks.push(mkRoot("hero", { eyebrow: esc(model.eyebrow || ""), title: esc(model.title || "Aula importada"), lead: "", author: "", authorImage: "", readTime: Math.max(1, Math.round(words / 180)) + " min", date: "" }));
    }
    var dividers = model.sections.filter(function (s) { return s.name; }).length > 1;
    model.sections.forEach(function (s) {
      if (s.name && dividers) blocks.push(mkRoot("divider", { label: esc(s.name) }));
      s.items.forEach(function (it) {
        var kids = it.children.map(limpo);
        if (it.addTitle && it.title) kids.unshift(mk("titulo", { text: esc(it.title), level: "h2" }));
        var cur = null;
        kids.forEach(function (k) {
          if (!cur || (k.type === "titulo" && k.props.level === "h2" && cur.length)) { cur = []; blocks.push({ __kids: cur }); }
          cur.push(k);
        });
      });
    });
    blocks = blocks.map(function (b) {
      if (!b.__kids) return b;
      var t = mkRoot("topic", {}); t.props.children = b.__kids; return t;
    });
    var meta = Object.assign({}, opts.baseMeta || {}, { title: model.title || "" });
    if (model.origem) meta.importedFrom = Object.assign({}, model.origem, { em: new Date().toISOString() });
    return { meta: meta, blocks: blocks };
  }

  // Colagem (HTML, conteúdo formatado ou texto simples): vira um modelo de uma seção e um item.
  // opts: { title, baseUrl, chip }
  function htmlParaModelo(html, opts) {
    opts = Object.assign({ detectPlain: true }, opts || {});
    var r = htmlParaBlocos(html, opts);
    var first = r.children.filter(function (b) { return b.type === "titulo"; })[0];
    var title = opts.title || (first ? unesc(first.props.text) : "") || "Aula importada";
    var model = { title: title, eyebrow: "", origem: opts.baseUrl ? { tipo: "moodle", url: opts.baseUrl } : null, fonte: r.plain ? "texto" : "html", sections: [{ name: "", items: [{ title: "", addTitle: false, children: r.children, orphans: r.orphans }] }] };
    return { model: model, warnings: r.warnings, notes: r.notes, stats: r.stats, plain: r.plain };
  }

  // ───────────── Backup do Moodle (.mbz) ─────────────
  function b64(u8) {
    var s = "", CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(s);
  }
  function octal(u8, a, b) { var s = ""; for (var i = a; i < b && u8[i]; i++) s += String.fromCharCode(u8[i]); return parseInt(s.trim() || "0", 8) || 0; }
  function cstr(u8, a, b) { var s = ""; for (var i = a; i < b && u8[i]; i++) s += String.fromCharCode(u8[i]); return s; }
  function untar(u8) {
    var map = {}, pos = 0;
    while (pos + 512 <= u8.length) {
      if (!u8[pos]) break;
      var name = cstr(u8, pos, pos + 100), size = octal(u8, pos + 124, pos + 136), type = String.fromCharCode(u8[pos + 156] || 48), prefix = cstr(u8, pos + 345, pos + 500);
      if (prefix) name = prefix + "/" + name;
      pos += 512;
      if (type === "0" || type === "\0") map[name] = u8.subarray(pos, pos + size);
      pos += Math.ceil(size / 512) * 512;
    }
    return map;
  }

  // Abre o .mbz (ZIP ou tar.gz) e devolve uma interface simples: has / text / base64 / names
  async function abrirArquivo(buffer, opts) {
    var u8 = new Uint8Array(buffer);
    if (u8[0] === 0x1f && u8[1] === 0x8b) {
      if (typeof DecompressionStream === "undefined") throw new Error("Este backup está em formato .tar.gz e o navegador não consegue abri-lo. Use um Chrome ou Edge atual.");
      var ds = new DecompressionStream("gzip"), resp = new Response(new Blob([u8]).stream().pipeThrough(ds));
      var tar = untar(new Uint8Array(await resp.arrayBuffer()));
      return {
        names: Object.keys(tar), has: function (n) { return !!tar[n]; },
        text: async function (n) { return new TextDecoder("utf-8").decode(tar[n]); },
        base64: async function (n) { return b64(tar[n]); },
      };
    }
    var JS = (opts && opts.JSZip) || G.JSZip;
    if (!JS) throw new Error("A biblioteca de compactação (JSZip) não carregou.");
    var zip;
    try { zip = await JS.loadAsync(u8); } catch (e) { throw new Error("Este arquivo não é um backup do Moodle (.mbz). Ele precisa ser um ZIP gerado pela opção Backup."); }
    return {
      names: Object.keys(zip.files), has: function (n) { return !!zip.files[n] && !zip.files[n].dir; },
      text: function (n) { return zip.file(n).async("string"); },
      base64: function (n) { return zip.file(n).async("base64"); },
    };
  }

  function xml(text) {
    var DP = G.DOMParser, d = new DP().parseFromString(String(text).replace(/^﻿/, ""), "text/xml");
    if (d.getElementsByTagName("parsererror").length) throw new Error("Um dos arquivos do backup está danificado.");
    return d;
  }
  function kid(el, tag) { if (!el) return null; for (var i = 0; i < el.children.length; i++) if (el.children[i].tagName === tag) return el.children[i]; return null; }
  function kt(el, tag) { var k = kid(el, tag); return k ? k.textContent : ""; }

  function asHtml(text, format) {
    text = String(text || "");
    if (!text.trim()) return "";
    if (String(format) === "2" || (String(format) === "0" && !/<[a-z][\s\S]*>/i.test(text))) return textoParaHtml(text);
    return text;
  }

  var MIME_IMG = /^image\/(png|jpe?g|gif|webp|svg\+xml)$/i;

  // Lê o backup e devolve o modelo: seções e itens (cada item com build() assíncrono → HTML).
  async function lerBackup(buffer, opts) {
    opts = opts || {};
    var arq = await abrirArquivo(buffer, opts);
    if (!arq.has("moodle_backup.xml")) throw new Error("Este arquivo não parece um backup do Moodle: falta o moodle_backup.xml.");
    var bk = xml(await arq.text("moodle_backup.xml"));
    var info = bk.getElementsByTagName("information")[0];
    var tipo = kt(info, "type") || "course";
    var tituloCurso = plain(kt(info, "original_course_fullname"));

    var files = {};
    if (arq.has("files.xml")) {
      Array.prototype.forEach.call(xml(await arq.text("files.xml")).getElementsByTagName("file"), function (f) {
        var name = kt(f, "filename");
        if (!name || name === ".") return;
        files[f.getAttribute("id")] = { id: f.getAttribute("id"), hash: kt(f, "contenthash"), name: name, mime: kt(f, "mimetype"), size: parseInt(kt(f, "filesize"), 10) || 0, area: kt(f, "filearea"), component: kt(f, "component") };
      });
    }
    var fileRefs = async function (dir) {
      var out = [];
      if (!arq.has(dir + "/inforef.xml")) return out;
      var d = xml(await arq.text(dir + "/inforef.xml")), fr = d.getElementsByTagName("fileref")[0];
      if (!fr) return out;
      Array.prototype.forEach.call(fr.getElementsByTagName("id"), function (i) { var f = files[i.textContent.trim()]; if (f) out.push(f); });
      return out;
    };
    var fileData = async function (f) {
      var path = "files/" + f.hash.slice(0, 2) + "/" + f.hash;
      if (!arq.has(path)) return null;
      var raw = await arq.base64(path);
      var url = "data:" + (f.mime || "application/octet-stream") + ";base64," + raw;
      return opts.shrink && /^image\/(png|jpe?g|webp)$/i.test(f.mime) ? await opts.shrink(url, f.mime) : url;
    };
    var resolveFiles = async function (html, refs) {
      var names = {}, re = /@@PLUGINFILE@@\/([^"'<>\s)]+)/g, m;
      while ((m = re.exec(html))) names[m[1]] = 1;
      for (var token in names) {
        var dec = token; try { dec = decodeURIComponent(token); } catch (e) {}
        var f = refs.filter(function (r) { return r.name === dec && MIME_IMG.test(r.mime); })[0] || Object.keys(files).map(function (k) { return files[k]; }).filter(function (r) { return r.name === dec && MIME_IMG.test(r.mime); })[0];
        if (!f) continue;
        var url = await fileData(f);
        if (url) html = html.split("@@PLUGINFILE@@/" + token).join(url);
      }
      return html;
    };

    var secs = [], secById = {};
    Array.prototype.forEach.call(bk.querySelectorAll("contents > sections > section"), function (s) {
      var o = { id: kt(s, "sectionid"), name: plain(kt(s, "title")), dir: kt(s, "directory"), items: [], sequence: [] };
      secs.push(o); secById[o.id] = o;
    });
    for (var si = 0; si < secs.length; si++) {
      var S = secs[si];
      if (!arq.has(S.dir + "/section.xml")) continue;
      var sx = xml(await arq.text(S.dir + "/section.xml")).documentElement;
      S.name = plain(kt(sx, "name")) || S.name; S.number = parseInt(kt(sx, "number"), 10) || 0;
      S.sequence = kt(sx, "sequence").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
      S.summary = kt(sx, "summary");
      S.name = plain(S.name.replace(/<[^>]*>/g, ""));
    }
    var acts = {};
    Array.prototype.forEach.call(bk.querySelectorAll("contents > activities > activity"), function (a) {
      acts[kt(a, "moduleid")] = { id: kt(a, "moduleid"), section: kt(a, "sectionid"), mod: kt(a, "modulename"), title: plain(kt(a, "title")), dir: kt(a, "directory") };
    });
    var SUPPORTED = { page: 1, label: 1, book: 1, url: 1, resource: 1 };
    var makeItem = function (a) {
      var base = { key: "m" + a.id, mod: a.mod, title: a.title, supported: !!SUPPORTED[a.mod], reason: "", addTitle: false };
      if (!SUPPORTED[a.mod]) { base.reason = "tipo «" + a.mod + "» não é importado"; return base; }
      base.build = async function () {
        var refs = await fileRefs(a.dir), x = xml(await arq.text(a.dir + "/" + a.mod + ".xml")).documentElement, html = "";
        var node = kid(x, a.mod) || x.getElementsByTagName(a.mod)[0] || x;
        if (a.mod === "page") {
          base.addTitle = true;
          html = asHtml(kt(node, "intro"), kt(node, "introformat")) + asHtml(kt(node, "content"), kt(node, "contentformat"));
        } else if (a.mod === "label") {
          html = asHtml(kt(node, "intro"), kt(node, "introformat"));
        } else if (a.mod === "book") {
          base.addTitle = true;
          html = asHtml(kt(node, "intro"), kt(node, "introformat"));
          var chs = Array.prototype.slice.call(node.getElementsByTagName("chapter")).sort(function (p, q) { return (parseInt(kt(p, "pagenum"), 10) || 0) - (parseInt(kt(q, "pagenum"), 10) || 0); });
          chs.forEach(function (c) {
            var sub = kt(c, "subchapter") === "1";
            html += "<h" + (sub ? 4 : 3) + ">" + esc(plain(kt(c, "title"))) + "</h" + (sub ? 4 : 3) + ">" + asHtml(kt(c, "content"), kt(c, "contentformat"));
          });
        } else if (a.mod === "url") {
          var u = plain(kt(node, "externalurl"));
          html = u ? "<p><a href=\"" + escAttr(u) + "\">" + esc(plain(kt(node, "name")) || u) + "</a></p>" : "";
        } else if (a.mod === "resource") {
          var img = refs.filter(function (r) { return MIME_IMG.test(r.mime) && r.area === "content"; })[0];
          if (img) { var data = await fileData(img); html = data ? "<p><img src=\"" + data + "\" alt=\"" + escAttr(a.title) + "\"></p>" : ""; }
        }
        return await resolveFiles(html, refs);
      };
      return base;
    };
    secs.forEach(function (S) {
      var seq = S.sequence.filter(function (id) { return acts[id]; });
      Object.keys(acts).forEach(function (id) { if (acts[id].section === S.id && seq.indexOf(id) < 0) seq.push(id); });
      if (S.summary && !isBlank(S.summary)) {
        S.items.push({ key: "s" + S.id, mod: "summary", title: "Resumo da seção" + (S.name ? " «" + S.name + "»" : ""), supported: true, reason: "", addTitle: false, build: async function () { return await resolveFiles(S.summary, []); } });
      }
      seq.forEach(function (id) { S.items.push(makeItem(acts[id])); });
    });
    var orphans = Object.keys(acts).filter(function (id) { return !secById[acts[id].section]; });
    if (orphans.length) secs.push({ id: "x", name: "", items: orphans.map(function (id) { return makeItem(acts[id]); }) });
    secs = secs.filter(function (S) { return S.items.length; });

    var title = tipo === "activity" && secs.length === 1 && secs[0].items.length === 1 ? secs[0].items[0].title : (tituloCurso || "Aula importada");
    return { kind: tipo, title: title, courseTitle: tituloCurso, sections: secs.map(function (S) { return { name: S.name, items: S.items }; }) };
  }

  // Converte os itens escolhidos (keys) do backup em modelo + avisos.
  async function itensParaModelo(backup, keys, opts) {
    var model = { title: backup.title, eyebrow: backup.courseTitle && backup.courseTitle !== backup.title ? backup.courseTitle : "", origem: { tipo: "backup .mbz", curso: backup.courseTitle || backup.title }, fonte: "mbz", sections: [] };
    var want = keys ? keys.reduce(function (o, k) { o[k] = 1; return o; }, {}) : null;
    for (var i = 0; i < backup.sections.length; i++) {
      var S = backup.sections[i], out = { name: S.name, items: [] };
      for (var j = 0; j < S.items.length; j++) {
        var it = S.items[j];
        if (!it.supported || !it.build || (want && !want[it.key])) continue;
        var html = await it.build(), r = htmlParaBlocos(html, opts);
        if (r.children.length) out.items.push({ title: it.title, addTitle: !!it.addTitle, children: r.children, orphans: r.orphans });
      }
      if (out.items.length) model.sections.push(out);
    }
    var a = avisos(model);
    return { model: model, warnings: a.warnings, notes: a.notes, stats: contar(model) };
  }

  // Redução de imagens grandes (só no navegador; no node as imagens passam como estão).
  function shrinkImage(dataUrl, mime, max) {
    max = max || 1600;
    return new Promise(function (resolve) {
      if (typeof Image === "undefined" || typeof document === "undefined") return resolve(dataUrl);
      var img = new Image();
      img.onerror = function () { resolve(dataUrl); };
      img.onload = function () {
        var side = Math.max(img.naturalWidth, img.naturalHeight);
        if (side <= max) return resolve(dataUrl);
        var k = max / side, c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL(/png/i.test(mime) ? "image/png" : "image/jpeg", 0.88)); } catch (e) { resolve(dataUrl); }
      };
      img.src = dataUrl;
    });
  }

  var API = { htmlParaBlocos: htmlParaBlocos, htmlParaModelo: htmlParaModelo, montarAula: montarAula, lerBackup: lerBackup, itensParaModelo: itensParaModelo, shrinkImage: shrinkImage, filtrar: filtrar, avisos: avisos, contar: contar, resumo: resumo, TIPOS: TIPOS, _ytId: ytId, _textoParaHtml: textoParaHtml };
  G.Importador = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
