/* ClassAtelier — fórmula na linha (no meio do parágrafo) e paleta de letras gregas e símbolos. Só do editor.
 *  • A fórmula na linha é um trechinho NÃO editável dentro do texto:
 *      <span class="aula-ieq" contenteditable="false" data-latex="\sigma_{idade>18}">…KaTeX já desenhado…</span>
 *    Fica guardada no próprio HTML do parágrafo, então vai igual para a aula exportada, o PDF e o Moodle
 *    (a exportação só precisa carregar o CSS do KaTeX).
 *  • Como criar: digitar $fórmula$ (vira fórmula ao digitar o segundo $), selecionar um trecho e usar o botão fx,
 *    ou «Fórmula na linha» no painel do parágrafo. Clicar numa fórmula abre a janelinha de edição.
 *  • Paleta Ω: letras gregas e símbolos, que entram no texto como caracteres comuns (σ, ≤, ∈…). */
(function () {
  "use strict";
  var OPTS = { displayMode: false, throwOnError: true, output: "htmlAndMathml", strict: "ignore", trust: false, maxExpand: 1000, maxSize: 40 };

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // ── Desenho ───────────────────────────────────────────────────────────────────────────────────────
  function renderInner(latex) {
    if (!window.katex) return { html: esc(latex), err: "O desenhador de fórmulas ainda está carregando." };
    var pre = window.prepareEquationLatex ? window.prepareEquationLatex(latex) : latex;
    try { return { html: window.katex.renderToString(pre, OPTS) }; }
    catch (e1) {
      if (pre !== latex) { try { return { html: window.katex.renderToString(latex, OPTS) }; } catch (e2) { e1 = e2; } }
      return { html: '<span class="aula-ieq__err">' + esc(latex) + "</span>", err: String((e1 && e1.message) || e1).replace(/^KaTeX parse error:\s*/i, "") };
    }
  }
  function chipHtml(latex) {
    latex = String(latex || "").trim();
    var r = renderInner(latex);
    return '<span class="aula-ieq' + (r.err ? " aula-ieq--err" : "") + '" contenteditable="false" data-latex="' + esc(latex) + '"' + (r.err ? ' title="' + esc("Fórmula com erro: " + r.err) + '"' : "") + ">" + r.html + "</span>";
  }

  // Texto simples de um HTML: cada fórmula na linha vira $latex$ (para texto corrido, resumos, acessibilidade).
  function htmlWithoutInlineMath(html) {
    html = String(html == null ? "" : html);
    var key = 'class="aula-ieq', out = "", i = 0;
    for (;;) {
      var k = html.indexOf(key, i); if (k < 0) { out += html.slice(i); break; }
      var s = html.lastIndexOf("<span", k);
      if (s < i) { out += html.slice(i); break; }
      var m = /data-latex="([^"]*)"/.exec(html.slice(s, html.indexOf(">", k) + 1));
      var depth = 0, re = /<(\/?)span\b[^>]*>/g, j; re.lastIndex = s;
      var mm, end = -1;
      while ((mm = re.exec(html))) { depth += mm[1] ? -1 : 1; if (depth === 0) { end = re.lastIndex; break; } }
      if (end < 0) { out += html.slice(i); break; }
      var latex = m ? m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : "";
      out += html.slice(i, s) + "$" + latex.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "$";
      i = end;
    }
    return out;
  }

  // ── CSS ───────────────────────────────────────────────────────────────────────────────────────────
  var css = document.createElement("style"); css.id = "ca-ieq-css";
  css.textContent =
    "[data-lz-editable] .aula-ieq{cursor:pointer;border-radius:5px;box-shadow:0 0 0 1px rgba(60,60,60,.18);background:rgba(120,120,120,.06)}" +
    "[data-lz-editable] .aula-ieq:hover{box-shadow:0 0 0 2px var(--tool-accent,#d8553a)}" +
    ".ca-pop{position:fixed;z-index:100001;background:#fff;color:#1b1a17;border:1px solid #d8d4c8;border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.22);font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;padding:12px;max-width:min(420px,calc(100vw - 16px))}" +
    ".ca-pop h4{margin:0 0 6px;font-size:12.5px}" +
    ".ca-pop textarea,.ca-pop input[type=search]{width:100%;box-sizing:border-box;border:1px solid #cfcabb;border-radius:8px;padding:7px 9px;font:13px ui-monospace,Menlo,Consolas,monospace;resize:vertical}" +
    ".ca-pop input[type=search]{font-family:inherit}" +
    ".ca-pop .prev{margin-top:8px;min-height:34px;border:1px dashed #cfcabb;border-radius:8px;padding:6px 10px;text-align:center;overflow-x:auto;background:#faf8f2}" +
    ".ca-pop .err{margin-top:6px;color:#9a2f1b;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}" +
    ".ca-pop .row{display:flex;gap:6px;align-items:center;margin-top:10px;flex-wrap:wrap}" +
    ".ca-pop .grow{flex:1}" +
    ".ca-pop button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid #cfcabb;background:#fff;padding:6px 10px;color:inherit}" +
    ".ca-pop button.pri{background:var(--tool-accent,#d8553a);border-color:transparent;color:#fff;font-weight:600}" +
    ".ca-pop button:hover{filter:brightness(.97)}" +
    ".ca-pop .tabs{display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 6px}" +
    ".ca-pop .tabs button{padding:3px 8px;font-size:12px}" +
    ".ca-pop .tabs button[aria-pressed=true]{background:#1b1a17;color:#fff;border-color:#1b1a17}" +
    ".ca-pop .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(36px,1fr));gap:4px;max-height:210px;overflow:auto;padding:2px}" +
    ".ca-pop .grid button{padding:0;height:34px;font-size:18px;line-height:1;font-family:'STIX Two Math','Cambria Math','Times New Roman',serif}" +
    ".ca-pop .hint{font-size:11.5px;color:#7a766b;margin-top:6px}";
  document.head.appendChild(css);

  function closestHost(node) {
    var n = node; while (n && n.nodeType === 3) n = n.parentNode;
    return n && n.closest ? n.closest("[contenteditable='true']") : null;
  }
  function fire(host) { host.dispatchEvent(new Event("input", { bubbles: true })); }
  function place(pop, rect) {
    document.body.appendChild(pop);
    var w = pop.offsetWidth, h = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
    var left = Math.max(8, Math.min(rect.left + (rect.width || 0) / 2 - w / 2, vw - w - 8));
    var top = rect.bottom + 8; if (top + h > vh - 8) top = Math.max(8, rect.top - h - 8);
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  var openPops = [];
  function closeAll() { openPops.slice().forEach(function (p) { p._close && p._close(); }); }

  // ── Paleta de letras gregas e símbolos ───────────────────────────────────────────────────────────
  var SET = [
    ["Gregas", "α alfa|β beta|γ gama|δ delta|ε épsilon|ζ zeta|η eta|θ teta|ι iota|κ capa|λ lambda|μ mi|ν ni|ξ csi|ο ômicron|π pi|ρ rô|σ sigma|ς sigma final|τ tau|υ ípsilon|φ fi|χ qui|ψ psi|ω ômega|ϑ teta alternativo|ϕ fi alternativo|ϵ épsilon alternativo|ϰ capa alternativo|ϱ rô alternativo|ϖ pi alternativo"],
    ["Maiúsculas", "Α Alfa|Β Beta|Γ Gama|Δ Delta|Ε Épsilon|Ζ Zeta|Η Eta|Θ Teta|Ι Iota|Κ Capa|Λ Lambda|Μ Mi|Ν Ni|Ξ Csi|Ο Ômicron|Π Pi|Ρ Rô|Σ Sigma|Τ Tau|Υ Ípsilon|Φ Fi|Χ Qui|Ψ Psi|Ω Ômega"],
    ["Operadores", "± mais ou menos|∓ menos ou mais|× vezes|÷ dividido|· ponto médio|∙ marcador|∘ composição|− menos|√ raiz quadrada|∛ raiz cúbica|∜ raiz quarta|∞ infinito|∑ somatório|∏ produtório|∫ integral|∬ integral dupla|∭ integral tripla|∮ integral de contorno|∂ derivada parcial|∇ nabla|∆ variação|≤ menor ou igual|≥ maior ou igual|≠ diferente|≈ aproximadamente|≅ congruente|≡ equivalente|∼ semelhante|∝ proporcional|≪ muito menor|≫ muito maior|⊥ perpendicular|∥ paralelo|∠ ângulo|° grau|′ minuto|″ segundo|‰ por mil|% por cento"],
    ["Setas", "← seta à esquerda|→ seta à direita|↑ seta para cima|↓ seta para baixo|↔ seta dupla|⇐ implicado por|⇒ implica|⇔ se e somente se|↦ mapeia para|⟶ seta longa|⟵ seta longa à esquerda|⟷ seta longa dupla|↗ seta diagonal|↘ seta diagonal|↩ retorno"],
    ["Lógica e conjuntos", "∧ e (conjunção)|∨ ou (disjunção)|¬ não (negação)|⊕ ou exclusivo|∀ para todo|∃ existe|∄ não existe|∈ pertence|∉ não pertence|∋ contém como elemento|⊂ está contido|⊃ contém|⊆ contido ou igual|⊇ contém ou igual|⊄ não está contido|∪ união|∩ interseção|∅ conjunto vazio|∖ diferença de conjuntos|ℕ naturais|ℤ inteiros|ℚ racionais|ℝ reais|ℂ complexos|⊤ verdadeiro|⊥ falso|⊢ prova|⊨ satisfaz|∴ portanto|∵ porque"],
    ["Outros", "² ao quadrado|³ ao cubo|¹ expoente 1|ⁿ expoente n|₀ índice 0|₁ índice 1|₂ índice 2|₃ índice 3|½ meio|¼ um quarto|¾ três quartos|µ micro|Å angstrom|ℓ litro|ℏ h cortado|℃ grau Celsius|℉ grau Fahrenheit|§ parágrafo|¶ fim de parágrafo|† adaga|‡ adaga dupla|• marcador|… reticências|– traço médio|— travessão|« aspas angulares|» aspas angulares|© copyright|® registrada|™ marca"]
  ].map(function (g) { return { name: g[0], items: g[1].split("|").map(function (x) { var sp = x.indexOf(" "); return { ch: x.slice(0, sp), nome: x.slice(sp + 1) }; }) }; });

  // anchor: retângulo (getBoundingClientRect) de onde a janelinha nasce; onPick(caractere)
  function openPalette(anchor, onPick, opts) {
    opts = opts || {};
    if (!opts.keep) closeAll();
    var pop = document.createElement("div"); pop.className = "ca-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Letras gregas e símbolos");
    pop.style.width = "min(380px,calc(100vw - 16px))";
    var cur = 0, q = "";
    pop.innerHTML = '<h4>Letras gregas e símbolos</h4><input type="search" placeholder="Buscar: sigma, pertence, seta…" aria-label="Buscar símbolo"><div class="tabs" role="group" aria-label="Grupos"></div><div class="grid" role="group"></div><div class="hint"></div>';
    var tabs = pop.querySelector(".tabs"), grid = pop.querySelector(".grid"), hint = pop.querySelector(".hint"), inp = pop.querySelector("input");
    hint.textContent = opts.hint || "Clique num símbolo para colocá-lo no texto. Ele entra como um caractere comum.";
    function draw() {
      tabs.innerHTML = ""; grid.innerHTML = "";
      var list;
      if (q) { var n = q.toLowerCase(); list = []; SET.forEach(function (g) { g.items.forEach(function (it) { if (it.ch === q || it.nome.toLowerCase().indexOf(n) >= 0 || g.name.toLowerCase().indexOf(n) >= 0) list.push(it); }); }); }
      else {
        SET.forEach(function (g, i) { var b = document.createElement("button"); b.type = "button"; b.textContent = g.name; b.setAttribute("aria-pressed", i === cur ? "true" : "false"); b.addEventListener("mousedown", function (e) { e.preventDefault(); }); b.addEventListener("click", function () { cur = i; draw(); }); tabs.appendChild(b); });
        list = SET[cur].items;
      }
      list.forEach(function (it) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = it.ch; b.title = it.nome; b.setAttribute("aria-label", it.nome);
        b.addEventListener("mousedown", function (e) { e.preventDefault(); });          // não tira o foco/seleção do texto
        b.addEventListener("click", function () { onPick(it.ch); });
        grid.appendChild(b);
      });
      if (!list.length) grid.innerHTML = '<div class="hint">Nada encontrado.</div>';
    }
    draw();
    inp.addEventListener("input", function () { q = inp.value.trim(); draw(); });
    function key(e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); pop._close(); } }
    function away(e) { if (!pop.contains(e.target) && !(e.target.closest && e.target.closest("[data-ca-keep]"))) pop._close(); }
    pop._close = function () { document.removeEventListener("keydown", key, true); document.removeEventListener("mousedown", away, true); pop.remove(); openPops = openPops.filter(function (x) { return x !== pop; }); opts.onClose && opts.onClose(); };
    document.addEventListener("keydown", key, true); setTimeout(function () { document.addEventListener("mousedown", away, true); }, 0);
    openPops.push(pop);
    // se não couber embaixo e for para cima, deixa passar a barra de seleção (≈ 52 px acima do trecho)
    place(pop, { left: anchor.left, width: anchor.width, bottom: anchor.bottom, top: anchor.top - (opts.keep ? 0 : 52) });
    return pop;
  }

  // Letra/símbolo no texto da aula: no cursor (ou no lugar da seleção), usando o último ponto de cursor salvo.
  function insertCharAtCaret(ch, saved) {
    var sel = getSelection(), host;
    if (saved && saved.host && saved.host.isConnected) {
      host = saved.host; host.focus();
      try { sel.removeAllRanges(); sel.addRange(saved.range); } catch (e) { }
    } else { host = sel.rangeCount ? closestHost(sel.getRangeAt(0).commonAncestorContainer) : null; }
    if (!host) return false;
    document.execCommand("insertText", false, ch);
    return true;
  }
  function selectionAnchorRect() {
    var sel = getSelection();
    if (sel && sel.rangeCount) { var r = sel.getRangeAt(0).getBoundingClientRect(); if (r && (r.width || r.height)) return r; }
    return { left: innerWidth / 2 - 190, right: innerWidth / 2 + 190, top: 120, bottom: 140, width: 380, height: 20 };
  }
  // Botão Ω da barra de seleção e botão do painel
  function openSymbolsForText(saved) {
    var s = saved || (function () { var sel = getSelection(); if (!sel.rangeCount) return null; var host = closestHost(sel.getRangeAt(0).commonAncestorContainer); return host ? { host: host, range: sel.getRangeAt(0).cloneRange() } : null; })();
    var rect = selectionAnchorRect();
    if (!s) { return { ok: false, msg: "Clique no texto, no ponto onde o símbolo deve entrar." }; }
    openPalette(rect, function (ch) { var ok = insertCharAtCaret(ch, s); if (ok) { var sel = getSelection(); if (sel.rangeCount) s = { host: s.host, range: sel.getRangeAt(0).cloneRange() }; } }, { hint: "Clique num símbolo: ele entra no texto, no ponto do cursor (no lugar do trecho selecionado, se houver)." });
    return { ok: true };
  }

  // ── Janela de edição de uma fórmula na linha ──────────────────────────────────────────────────────
  function openEditor(chip, isNew) {
    closeAll();
    var host = closestHost(chip); if (!host) return;
    var latex = chip.getAttribute("data-latex") || "";
    var pop = document.createElement("div"); pop.className = "ca-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Fórmula na linha");
    pop.style.width = "min(400px,calc(100vw - 16px))";
    pop.innerHTML = '<h4>Fórmula na linha (LaTeX)</h4><textarea rows="2" spellcheck="false" aria-label="Fórmula em LaTeX" data-nospell></textarea><div class="prev" aria-live="polite"></div><div class="err" role="alert"></div>' +
      '<div class="row"><button type="button" data-a="sym" data-ca-keep title="Letras gregas e símbolos">Ω</button><span class="grow"></span><button type="button" data-a="text" title="Troca a fórmula pelo texto $…$">Virar texto</button><button type="button" data-a="del">Excluir</button><button type="button" class="pri" data-a="ok">OK</button></div>' +
      '<div class="hint">Ex.: <code>\\sigma_{idade>18}</code>, <code>x^2</code>, <code>\\frac{a}{b}</code>. Enter confirma; Esc cancela.</div>';
    var ta = pop.querySelector("textarea"), prev = pop.querySelector(".prev"), err = pop.querySelector(".err");
    ta.value = latex;
    function live() {
      var v = ta.value.trim();
      if (!v) { prev.textContent = "(vazia)"; err.textContent = ""; return; }
      var r = renderInner(v);
      prev.innerHTML = r.err ? "" : r.html; err.textContent = r.err || "";
    }
    ta.addEventListener("input", live); live();
    var done = false;
    function restoreCaret(after) {
      host.focus();
      try { var sel = getSelection(), r = document.createRange(); if (after && after.isConnected) { r.setStartAfter(after); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); } } catch (e) { }
    }
    function close() { if (done) return; done = true; pop._close(); }
    function apply() {
      var v = ta.value.trim();
      if (!v) { remove(); return; }
      var tmp = document.createElement("div"); tmp.innerHTML = chipHtml(v);
      var neu = tmp.firstChild; var old = chip;
      mutate(host, function () { old.replaceWith(neu); });
      chip = neu; close(); restoreCaret(neu);
    }
    function remove() { var old = chip; mutate(host, function () { old.remove(); }); close(); host.focus(); }
    function toText() { var old = chip, t = document.createTextNode("$" + ta.value.trim() + "$"); mutate(host, function () { old.replaceWith(t); }); close(); host.focus(); try { var sel = getSelection(), r = document.createRange(); r.setStartAfter(t); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); } catch (e) { } }
    pop.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("[data-a]"); if (!a) return;
      var k = a.getAttribute("data-a");
      if (k === "ok") apply(); else if (k === "del") remove(); else if (k === "text") toText();
      else if (k === "sym") {
        var r = a.getBoundingClientRect();
        var p2 = openPalette(r, function (ch) { var s = ta.selectionStart, e2 = ta.selectionEnd; ta.value = ta.value.slice(0, s) + ch + ta.value.slice(e2); ta.selectionStart = ta.selectionEnd = s + ch.length; live(); ta.focus(); }, { keep: true, hint: "O símbolo entra no campo da fórmula, no cursor." });
      }
    });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); apply(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (isNew && !chip.getAttribute("data-latex")) remove(); else { close(); restoreCaret(chip); } }
    });
    function away(e) { if (!pop.contains(e.target) && !(e.target.closest && e.target.closest(".ca-pop"))) { if (isNew && !latex) remove(); else { close(); } } }
    pop._close = function () { document.removeEventListener("mousedown", away, true); pop.remove(); openPops = openPops.filter(function (x) { return x !== pop; }); };
    setTimeout(function () { document.addEventListener("mousedown", away, true); }, 0);
    openPops.push(pop); place(pop, chip.getBoundingClientRect());
    ta.focus(); ta.select();
  }


  // ── Inserção no texto (manual, com desfazer próprio) ─────────────────────────────────────────────
  // O insertHTML do navegador desfigura o que insere (tira class/data-*, joga o elemento para fora do parágrafo),
  // então a fórmula é inserida pelo DOM. Como isso não entra na pilha de desfazer do navegador, guardamos o
  // estado de antes/depois da última ação e tratamos Ctrl+Z / Ctrl+Y logo em seguida.
  var UND = null;
  function textOffset(host, node, off) {
    var w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), n, c = 0;
    while ((n = w.nextNode())) { if (n === node) return c + off; c += n.nodeValue.length; }
    if (node && node.nodeType === 1) { var r = document.createRange(); r.setStart(host, 0); try { r.setEnd(node, off); } catch (e) { return c; } return r.toString().length; }
    return c;
  }
  function setOffset(host, off) {
    var w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), n, c = 0, last = null;
    while ((n = w.nextNode())) { last = n; if (c + n.nodeValue.length >= off) { place(n, off - c); return; } c += n.nodeValue.length; }
    if (last) place(last, last.nodeValue.length); else place(host, 0);
    function place(node, o) { var r = document.createRange(); r.setStart(node, o); r.collapse(true); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  }
  function mutate(host, fn) {
    var sel = getSelection(), rg = sel.rangeCount ? sel.getRangeAt(0) : null;
    var before = host.innerHTML, caretBefore = rg ? textOffset(host, rg.startContainer, rg.startOffset) : 0;
    fn();
    var s2 = getSelection(), after = host.innerHTML, caretAfter = s2.rangeCount ? textOffset(host, s2.anchorNode, s2.anchorOffset) : 0;
    UND = { host: host, before: before, after: after, caretBefore: caretBefore, caretAfter: caretAfter, undone: false };
    fire(host);
  }
  document.addEventListener("keydown", function (e) {
    if (!UND || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    var k = (e.key || "").toLowerCase();
    var isUndo = k === "z" && !e.shiftKey, isRedo = (k === "z" && e.shiftKey) || k === "y";
    if (!isUndo && !isRedo) return;
    var host = closestHost(e.target); if (!host || host !== UND.host || !host.isConnected) return;
    if (isUndo && !UND.undone && host.innerHTML === UND.after) { e.preventDefault(); e.stopPropagation(); closeAll(); host.innerHTML = UND.before; setOffset(host, UND.caretBefore); UND.undone = true; fire(host); }
    else if (isRedo && UND.undone && host.innerHTML === UND.before) { e.preventDefault(); e.stopPropagation(); closeAll(); host.innerHTML = UND.after; setOffset(host, UND.caretAfter); UND.undone = false; fire(host); }
  }, true);
  function chipEl(latex) { var t = document.createElement("template"); t.innerHTML = chipHtml(latex); return t.content.firstChild; }
  // Troca o trecho `range` pela fórmula (+ um espaço) e deixa o cursor depois dela. Devolve o elemento da fórmula.
  function putChip(host, range, latex) {
    var chip = null;
    mutate(host, function () {
      range.deleteContents();
      chip = chipEl(latex);
      var sp = document.createTextNode("\u00a0");
      range.insertNode(sp); range.insertNode(chip);
      var r = document.createRange(); r.setStart(sp, 1); r.collapse(true);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    return chip;
  }

  // ── Criar fórmula na linha ────────────────────────────────────────────────────────────────────────
  // A partir da seleção (o texto selecionado vira a fórmula) ou do último cursor salvo (painel).
  function blockOf(n) { n = n && n.nodeType === 3 ? n.parentNode : n; return n && n.closest ? n.closest("p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,div,[data-lz-editable]") : null; }
  function insertFromSelection(saved) {
    var sel = getSelection(), host, range;
    if (saved && saved.host && saved.host.isConnected) { host = saved.host; host.focus(); try { sel.removeAllRanges(); sel.addRange(saved.range); } catch (e) { } range = sel.rangeCount ? sel.getRangeAt(0) : saved.range; }
    else if (sel.rangeCount) { range = sel.getRangeAt(0); host = closestHost(range.commonAncestorContainer); }
    if (!host || !range) return { ok: false, msg: "Clique no texto, no ponto onde a fórmula deve entrar." };
    if (!range.collapsed && blockOf(range.startContainer) !== blockOf(range.endContainer)) return { ok: false, msg: "Selecione um trecho dentro de um mesmo parágrafo." };
    var text = range.toString().replace(/\s+/g, " ").trim().replace(/^\$+|\$+$/g, "");
    var latex = text || "x";
    var chip = putChip(host, range.cloneRange(), latex);
    if (chip) openEditor(chip, !text);       // abre a janela já com a fórmula selecionada, para o autor ajustar
    return { ok: true };
  }

  // Digitou $fórmula$ → vira fórmula na linha
  var TYPED = /(^|[\s(\[{"'“‘>—–\-,;:])\$([^\s$](?:[^$\n]{0,300}[^\s$])?|[^\s$])\$$/;
  document.addEventListener("input", function (e) {
    if (e.inputType !== "insertText" || e.data !== "$") return;
    var host = closestHost(e.target); if (!host || !host.closest("[data-lz-canvas]")) return;
    var sel = getSelection(); if (!sel.rangeCount || !sel.isCollapsed) return;
    var n = sel.anchorNode, off = sel.anchorOffset; if (!n || n.nodeType !== 3) return;
    var before = n.nodeValue.slice(0, off), m = TYPED.exec(before); if (!m) return;
    var latex = m[2], start = off - latex.length - 2;
    if (m[1] === "" && start !== 0) return;
    var r = document.createRange(); r.setStart(n, start); r.setEnd(n, off);
    putChip(host, r, latex);
  }, true);

  // Clique numa fórmula (no modo Editar) abre a edição
  document.addEventListener("click", function (e) {
    var chip = e.target.closest && e.target.closest(".aula-ieq"); if (!chip) return;
    var host = closestHost(chip); if (!host || !host.closest("[data-lz-canvas]")) return;
    e.preventDefault(); e.stopPropagation();
    openEditor(chip, false);
  }, true);

  window.InlineMath = { chipHtml: chipHtml, htmlWithoutInlineMath: htmlWithoutInlineMath, insertFromSelection: insertFromSelection, openPalette: openPalette, openSymbolsForText: openSymbolsForText, insertCharAtCaret: insertCharAtCaret, openEditor: openEditor, closeAll: closeAll, SET: SET };
})();
