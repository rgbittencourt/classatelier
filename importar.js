/* eslint-disable */
// ════════════════════════════════════════════════════════════
// ClassAtelier — IMPORTAR uma aula do Moodle
// ────────────────────────────────────────────────────────────
// Dois caminhos, os dois terminam em blocos do ClassAtelier:
//   • HTML colado (código-fonte do editor do Moodle ou conteúdo copiado da página)
//   • Backup do Moodle (.mbz): ZIP com XML, lido aqui mesmo no navegador
//
// Este arquivo é só lógica (sem React), para poder ser testado no node:
//   Importador.htmlParaBlocos(html, opts)   → { children, warnings, stats }
//   Importador.montarAula(model, opts)      → { meta, blocks }
//   Importador.lerBackup(buffer, opts)      → Promise<modelo do backup>
//   Importador.itensParaModelo(backup, keys, opts) → Promise<{ model, warnings }>
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
  function isMoodleLocal(u) {
    u = String(u || "").trim();
    if (!u) return true;
    if (/@@PLUGINFILE@@|\/pluginfile\.php|\/draftfile\.php|\/webservice\/pluginfile/i.test(u)) return true;
    if (/^(https?:)?\/\//i.test(u) || /^data:/i.test(u) || /^mailto:/i.test(u)) return false;
    return true; // relativo (ex.: /mod/page/view.php) não funciona fora do Moodle
  }
  function fileNameOf(u) {
    var s = String(u || "").split(/[?#]/)[0].split("/").pop();
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }
  function ytId(u) { var m = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?(?:[^#]*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(String(u || "")); return m ? m[1] : ""; }
  function ytStart(u) { var m = /[?&#](?:start|t)=(\d+)/.exec(String(u || "")); return m ? m[1] : ""; }

  // ───────────── HTML → HTML limpo (só o que a aula aceita) ─────────────
  var SKIP = { script: 1, style: 1, noscript: 1, link: 1, meta: 1, head: 1, title: 1, button: 1, form: 1, input: 1, select: 1, textarea: 1, nav: 1, svg: 1, canvas: 1, object: 1, embed: 1, template: 1 };
  var INLINE = { a: 1, abbr: 1, b: 1, strong: 1, i: 1, em: 1, u: 1, sub: 1, sup: 1, br: 1, code: 1, mark: 1, small: 1, span: 1, font: 1, s: 1, del: 1, ins: 1, cite: 1, q: 1, kbd: 1, "var": 1, samp: 1, time: 1, label: 1, bdi: 1, wbr: 1, big: 1, tt: 1, strike: 1, dfn: 1 };
  var MEDIA_SEL = "img,iframe,video,audio,table,ul,ol,pre,blockquote,h1,h2,h3,h4,h5,h6,figure,div,p,details";

  function hasBlock(el) { return !!el.querySelector(MEDIA_SEL); }

  function mathInline(html, ctx) {
    if (html.indexOf("\\(") < 0) return html;
    var chip = ctx.opts.chip || (G.InlineMath && G.InlineMath.chipHtml);
    return html.replace(/\\\(([\s\S]*?)\\\)/g, function (all, tex) {
      var latex = unesc(tex).replace(/<[^>]*>/g, "").trim();
      if (!latex) return all;
      return chip ? chip(latex) : "$" + esc(latex) + "$";
    });
  }

  function inlineHtml(node, ctx) {
    var out = "";
    Array.prototype.forEach.call(node.childNodes, function (c) {
      if (c.nodeType === 3) { out += esc(c.nodeValue.replace(/ /g, " ")); return; }
      if (c.nodeType !== 1) return;
      var t = c.tagName.toLowerCase();
      if (SKIP[t]) return;
      if (t === "br") { out += "<br>"; return; }
      if (t === "img") { ctx.note("imagem dentro de lista ou tabela não vai junto (" + (fileNameOf(c.getAttribute("src")) || "sem nome") + ")"); return; }
      var inner = inlineHtml(c, ctx);
      switch (t) {
        case "b": case "strong": out += isBlank(inner) ? inner : "<strong>" + inner + "</strong>"; break;
        case "i": case "em": case "cite": case "dfn": out += isBlank(inner) ? inner : "<em>" + inner + "</em>"; break;
        case "u": case "ins": out += isBlank(inner) ? inner : "<u>" + inner + "</u>"; break;
        case "sub": case "sup": case "mark": out += isBlank(inner) ? inner : "<" + t + ">" + inner + "</" + t + ">"; break;
        case "s": case "del": case "strike": out += isBlank(inner) ? inner : "<s>" + inner + "</s>"; break;
        case "code": case "kbd": case "samp": case "tt": out += isBlank(inner) ? inner : "<code>" + inner + "</code>"; break;
        case "a": {
          var href = (c.getAttribute("href") || "").trim();
          if (/^(https?:\/\/|mailto:)/i.test(href) && !/\/pluginfile\.php|\/draftfile\.php/i.test(href)) out += "<a href=\"" + escAttr(href) + "\">" + inner + "</a>";
          else {
            if (/@@PLUGINFILE@@|\/pluginfile\.php|\/draftfile\.php/i.test(href)) ctx.warn("anexo do Moodle não importado: " + (fileNameOf(href) || plain(inner)));
            else if (href && href.charAt(0) !== "#") ctx.note("link interno do Moodle virou texto: " + plain(inner));
            out += inner;
          }
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
        else { var w = document_fragment_like(c); txt += inlineHtml(w, ctx); }
      });
      out += "<li>" + mathInline(txt.trim(), ctx) + nested + "</li>";
    });
    return out + "</" + tag + ">";
  }
  // Envolve um único nó para reaproveitar inlineHtml (que lê os filhos de um elemento).
  function document_fragment_like(n) { return { childNodes: [n] }; }

  // ───────────── Blocos ─────────────
  function newCtx(opts) {
    return { out: [], buf: [], acc: null, opts: opts || {}, warnings: [], notes: [],
      warn: function (m) { if (this.warnings.indexOf(m) < 0) this.warnings.push(m); },
      note: function (m) { if (this.notes.indexOf(m) < 0) this.notes.push(m); } };
  }
  function flush(ctx) {
    if (ctx.buf.length) {
      var body = ctx.buf.join(""); ctx.buf = [];
      if (!isBlank(body)) ctx.out.push(mk("prose", { body: body }));
    }
  }
  function closeAcc(ctx) {
    if (!ctx.acc) return;
    flush(ctx);
    ctx.out.push(mk("accordion", { items: ctx.acc }));
    ctx.acc = null;
  }
  function sub(el, ctx) {
    var s = newCtx(ctx.opts); s.warn = ctx.warn.bind(ctx); s.note = ctx.note.bind(ctx);
    walkChildren(el, s); closeAcc(s); flush(s);
    return s.out;
  }
  function bodyOf(blocks) {
    return blocks.map(function (b) {
      if (b.type === "prose") return b.props.body;
      if (b.type === "titulo") return "<p><strong>" + esc(b.props.text) + "</strong></p>";
      return "";
    }).join("");
  }

  function addImage(ctx, img, caption) {
    var src = (img.getAttribute("src") || "").trim();
    var cls = (img.getAttribute("class") || "");
    var w = parseInt(img.getAttribute("width"), 10), h = parseInt(img.getAttribute("height"), 10);
    if (/\b(icon|emoticon|smiley)\b/i.test(cls) || (w && w <= 32) || (h && h <= 32)) return;
    var alt = plain(img.getAttribute("alt"));
    flush(ctx);
    var shown = "";
    if (/^data:image\//i.test(src) || (/^https?:\/\//i.test(src) && !isMoodleLocal(src))) shown = src;
    else ctx.warn("imagem do Moodle não veio" + (fileNameOf(src) ? " (" + fileNameOf(src) + ")" : "") + ": o bloco foi criado vazio, envie o arquivo nele");
    ctx.out.push(mk("imagem", { src: shown, slotId: "", caption: esc(plain(caption) || alt), credit: "", ratio: w && h ? Math.round(w) + "/" + Math.round(h) : "16/9" }));
  }

  function addEmbed(ctx, el) {
    var src = (el.getAttribute("src") || "").trim(), title = plain(el.getAttribute("title"));
    flush(ctx);
    if (/\/h5p\/|h5p\.org|h5pactivity/i.test(src)) { ctx.warn("H5P não importado" + (title ? ": " + title : "")); return; }
    if (!src || isMoodleLocal(src)) { ctx.warn("conteúdo incorporado do Moodle não importado" + (title ? ": " + title : "")); return; }
    var id = ytId(src);
    if (id) { ctx.out.push(mk("video", { id: id, title: title || "Vídeo", caption: "", credit: "", start: ytStart(src) })); return; }
    var h = parseInt(el.getAttribute("height"), 10), w = el.getAttribute("width");
    var code = '<iframe src="' + escAttr(src) + '"' + (w ? ' width="' + escAttr(w) + '"' : "") + (h ? ' height="' + h + '"' : "") + (title ? ' title="' + escAttr(title) + '"' : "") + ' allowfullscreen></iframe>';
    ctx.out.push(mk("externalembed", { title: title || "Conteúdo incorporado", embed: code, height: h || 600 }));
  }

  function addMedia(ctx, el) {
    var t = el.tagName.toLowerCase(), src = (el.getAttribute("src") || "").trim();
    if (!src) { var s = el.querySelector("source[src]"); src = s ? (s.getAttribute("src") || "").trim() : ""; }
    flush(ctx);
    if (t === "audio" && src && !isMoodleLocal(src)) { ctx.out.push(mk("audio", { src: src, spotify: "", title: plain(el.getAttribute("title")) || "Áudio", show: "", description: "", duration: "" })); return; }
    ctx.warn((t === "audio" ? "áudio" : "vídeo") + " do Moodle não importado" + (fileNameOf(src) ? " (" + fileNameOf(src) + ")" : "") + ": envie o arquivo ou use um vídeo do YouTube");
  }

  function addTable(ctx, el) {
    flush(ctx);
    var rows = [];
    Array.prototype.forEach.call(el.querySelectorAll("tr"), function (tr) {
      if (tr.closest("table") !== el) return; // tabela dentro de tabela: ignora
      var cells = Array.prototype.map.call(tr.children, function (c) { return /^(td|th)$/i.test(c.tagName) ? mathInline(inlineHtml(c, ctx).replace(/(<br>)+$/, "").trim(), ctx) : null; }).filter(function (x) { return x !== null; });
      if (cells.length) rows.push({ cells: cells, head: !!tr.querySelector("th") && !tr.querySelector("td") || !!tr.closest("thead") });
    });
    if (!rows.length) return;
    var headers, body;
    if (rows[0].head) { headers = rows[0].cells; body = rows.slice(1); }
    else { headers = rows[0].cells; body = rows.slice(1); ctx.note("tabela sem cabeçalho: a primeira linha virou cabeçalho"); }
    var n = Math.max.apply(null, [headers.length].concat(body.map(function (r) { return r.cells.length; })));
    var pad = function (a) { a = a.slice(); while (a.length < n) a.push(""); return a; };
    var cap = el.querySelector("caption");
    ctx.out.push(mk("tabela", { caption: cap ? esc(plain(cap.textContent)) : "", fonte: "", headers: pad(headers), rows: body.map(function (r) { return pad(r.cells); }) }));
  }

  function addCode(ctx, el) {
    flush(ctx);
    var codeEl = el.querySelector("code"), cls = ((el.getAttribute("class") || "") + " " + (codeEl ? codeEl.getAttribute("class") || "" : "")),
      m = /(?:language|lang|brush)[-:\s]+([\w+#-]+)/i.exec(cls), lang = m ? m[1].toLowerCase() : "text";
    if (lang === "py") lang = "python"; if (lang === "js") lang = "javascript"; if (lang === "ts") lang = "typescript";
    if (G.CODE_LANGUAGES && !G.CODE_LANGUAGES.some(function (l) { return l[0] === lang; })) lang = "text";
    var code = (codeEl || el).textContent.replace(/ /g, " ").replace(/^\n+|\s+$/g, "");
    if (code) ctx.out.push(mk("codigo", { code: code, language: lang }));
  }

  function addQuote(ctx, el) {
    flush(ctx);
    var author = "", c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll("footer,cite,figcaption"), function (n) { author = author || plain(n.textContent).replace(/^[—–-]\s*/, ""); n.parentNode.removeChild(n); });
    var q = plain(c.textContent);
    if (q) ctx.out.push(mk("citacao", { quote: esc(q), author: esc(author), source: "", showAttribution: !!author }));
  }

  function toneBlock(ctx, el, kind) {
    flush(ctx);
    var blocks = sub(el, ctx), title = "";
    if (blocks.length && blocks[0].type === "titulo") title = blocks.shift().props.text;
    var body = bodyOf(blocks);
    if (isBlank(body)) return;
    ctx.out.push(mk(kind, { title: title || (kind === "atencao" ? "Atenção" : "Veja bem"), body: body }));
  }

  function handleP(el, ctx) {
    if (el.querySelector("img,iframe,video,audio,table,figure,pre")) { walkChildren(el, ctx); return; }
    var html = inlineHtml(el, ctx);
    if (isBlank(html)) return;
    var text = plain(el.textContent);
    // só um link do YouTube no parágrafo → bloco de vídeo
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
      if (text) { flush(ctx); ctx.out.push(mk("titulo", { text: text, level: t === "h1" || t === "h2" ? "h2" : "h3" })); }
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
        var body = bodyOf(sub(clone, ctx));
        if (!ctx.acc) { flush(ctx); ctx.acc = []; }
        ctx.acc.push({ title: sm ? inlineHtml(sm, ctx).trim() : "Detalhes", body: isBlank(body) ? "<p></p>" : body, children: [] });
        return;
      }
      default: {
        var cls = (el.getAttribute("class") || "");
        if (/\balert-(warning|danger)\b/.test(cls)) return toneBlock(ctx, el, "atencao");
        if (/\balert-(info|success|primary|secondary|light|dark)\b|\bcallout\b/.test(cls)) return toneBlock(ctx, el, "destaque");
        return walkChildren(el, ctx);
      }
    }
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
      if (INLINE[t] && !hasBlock(c)) { closeAcc(ctx); var w = inlineHtml({ childNodes: [c] }, ctx); run += w; return; }
      if (t !== "details") closeAcc(ctx);
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

  // HTML do Moodle → lista de blocos-filhos (ainda sem tópicos).
  function htmlParaBlocos(html, opts) {
    var ctx = newCtx(opts), root = parseBody(html);
    walkChildren(root, ctx); closeAcc(ctx); flush(ctx);
    var stats = {};
    ctx.out.forEach(function (b) { stats[b.type] = (stats[b.type] || 0) + 1; });
    return { children: ctx.out, warnings: ctx.warnings, notes: ctx.notes, stats: stats };
  }

  // ───────────── Monta a aula ─────────────
  // model: { title, eyebrow, sections: [{ name, items: [{ title, addTitle, children }] }] }
  // opts:  { hero: bool, baseMeta }
  function montarAula(model, opts) {
    opts = opts || {};
    var blocks = [];
    var words = 0;
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
        var kids = it.children.slice();
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
    return { meta: meta, blocks: blocks };
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
        size: function (n) { return tar[n] ? tar[n].length : 0; },
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
      size: function (n) { var f = zip.file(n); return f && f._data && f._data.uncompressedSize || 0; },
    };
  }

  function xml(text) {
    var DP = G.DOMParser, d = new DP().parseFromString(String(text).replace(/^﻿/, ""), "text/xml");
    if (d.getElementsByTagName("parsererror").length) throw new Error("Um dos arquivos do backup está danificado.");
    return d;
  }
  function kid(el, tag) { if (!el) return null; for (var i = 0; i < el.children.length; i++) if (el.children[i].tagName === tag) return el.children[i]; return null; }
  function kt(el, tag) { var k = kid(el, tag); return k ? k.textContent : ""; }

  function plainToHtml(text) {
    return String(text).split(/\n{2,}/).map(function (p) { return p.trim() ? "<p>" + esc(p.trim()).replace(/\n/g, "<br>") + "</p>" : ""; }).join("");
  }
  function asHtml(text, format) {
    text = String(text || "");
    if (!text.trim()) return "";
    if ((String(format) === "2" || (String(format) === "0" && !/<[a-z][\s\S]*>/i.test(text)))) return plainToHtml(text);
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

    // arquivos (para imagens)
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
    // troca @@PLUGINFILE@@/nome pelas imagens que vieram no backup
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

    // seções
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
    // atividades
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
      if (a.mod === "resource") base.supported = true;
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
    // atividades sem seção conhecida
    var orphans = Object.keys(acts).filter(function (id) { return !secById[acts[id].section]; });
    if (orphans.length) secs.push({ id: "x", name: "", items: orphans.map(function (id) { return makeItem(acts[id]); }) });
    secs = secs.filter(function (S) { return S.items.length; });

    var title = tipo === "activity" && secs.length === 1 && secs[0].items.length === 1 ? secs[0].items[0].title : (tituloCurso || "Aula importada");
    return { kind: tipo, title: title, courseTitle: tituloCurso, sections: secs.map(function (S) { return { name: S.name, items: S.items }; }) };
  }

  // Converte os itens escolhidos (keys) do backup em modelo + avisos.
  async function itensParaModelo(backup, keys, opts) {
    var warnings = [], notes = [], stats = {}, model = { title: backup.title, eyebrow: backup.courseTitle && backup.courseTitle !== backup.title ? backup.courseTitle : "", sections: [] };
    var want = keys ? keys.reduce(function (o, k) { o[k] = 1; return o; }, {}) : null;
    for (var i = 0; i < backup.sections.length; i++) {
      var S = backup.sections[i], out = { name: S.name, items: [] };
      for (var j = 0; j < S.items.length; j++) {
        var it = S.items[j];
        if (!it.supported || !it.build || (want && !want[it.key])) continue;
        var html = await it.build(), r = htmlParaBlocos(html, opts);
        r.warnings.forEach(function (w) { var m = it.title + ": " + w; if (warnings.indexOf(m) < 0) warnings.push(m); });
        r.notes.forEach(function (n) { if (notes.indexOf(n) < 0) notes.push(n); });
        Object.keys(r.stats).forEach(function (k) { stats[k] = (stats[k] || 0) + r.stats[k]; });
        if (r.children.length) out.items.push({ title: it.title, addTitle: !!it.addTitle, children: r.children });
      }
      if (out.items.length) model.sections.push(out);
    }
    return { model: model, warnings: warnings, notes: notes, stats: stats };
  }

  // Colagem simples (HTML): vira um modelo de uma seção e um item.
  function htmlParaModelo(html, opts) {
    opts = opts || {};
    var r = htmlParaBlocos(html, opts);
    var firstH = r.children.length && r.children[0].type === "titulo" ? unesc(r.children[0].props.text) : "";
    return { model: { title: opts.title || firstH || "Aula importada", eyebrow: "", sections: [{ name: "", items: [{ title: "", addTitle: false, children: r.children }] }] }, warnings: r.warnings, notes: r.notes, stats: r.stats };
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

  var API = { htmlParaBlocos: htmlParaBlocos, htmlParaModelo: htmlParaModelo, montarAula: montarAula, lerBackup: lerBackup, itensParaModelo: itensParaModelo, shrinkImage: shrinkImage, _ytId: ytId };
  G.Importador = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
