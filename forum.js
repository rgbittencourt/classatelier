/* ClassAtelier — bloco «Fórum de discussão».
 * Componente global (sem Babel) usado pelo editor e pelas aulas exportadas.
 * A aula é estática: o debate acontece no fórum de verdade (Moodle, Padlet, Teams…). O bloco apresenta a
 * pergunta, as regras, os prazos e os critérios, leva o aluno ao fórum por um botão e oferece um rascunho
 * local (salvo no navegador) para ele preparar a mensagem e copiar para o fórum.
 */
(function () {
  var CSS = [
    ".aula-forum{position:relative;margin:.6em 0;border:1.5px solid color-mix(in srgb,var(--ink,#1B1A17) 22%,transparent);border-radius:14px;background:color-mix(in srgb,var(--ink,#1B1A17) 3%,transparent);overflow:hidden}",
    ".aula-forum__head{display:flex;align-items:center;gap:10px;padding:12px 18px;background:color-mix(in srgb,var(--terracotta,#C4553A) 12%,transparent);border-bottom:1px solid color-mix(in srgb,var(--ink,#1B1A17) 14%,transparent)}",
    ".aula-forum__ic{flex:none;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--terracotta,#C4553A);color:#fff}",
    ".aula-forum__kicker{font:700 11.5px/1 var(--font-sans,system-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--terracotta-deep,#9a3b25)}",
    ".aula-forum__title{margin:2px 0 0;font:700 1.25em/1.25 var(--font-display,var(--font-sans,system-ui));color:var(--ink,#1B1A17)}",
    ".aula-forum__body{padding:16px 18px 18px;display:grid;gap:14px}",
    ".aula-forum__prompt{font-size:1.04em;line-height:1.6}",
    ".aula-forum__prompt p{margin:.3em 0}",
    ".aula-forum__meta{display:flex;flex-wrap:wrap;gap:8px}",
    ".aula-forum__chip{display:inline-flex;gap:6px;align-items:baseline;padding:5px 11px;border-radius:999px;border:1px solid color-mix(in srgb,var(--ink,#1B1A17) 20%,transparent);font-size:.88em;background:var(--paper,transparent)}",
    ".aula-forum__chip b{font-weight:700}",
    ".aula-forum h4{margin:0 0 4px;font:700 .8em/1.2 var(--font-sans,system-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute,#6b675d)}",
    ".aula-forum__rules{margin:0;padding-left:1.3em;line-height:1.55}",
    ".aula-forum__rules li{margin:.2em 0}",
    ".aula-forum__criteria{font-size:.96em;line-height:1.55}",
    ".aula-forum__criteria p{margin:.3em 0}",
    ".aula-forum__cta{display:flex;flex-wrap:wrap;gap:10px;align-items:center}",
    ".aula-forum__btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;border:0;background:var(--terracotta,#C4553A);color:#fff;font:700 14px/1 var(--font-sans,system-ui);text-decoration:none;cursor:pointer}",
    ".aula-forum__btn:hover{filter:brightness(.93)}",
    ".aula-forum__btn:focus-visible,.aula-forum__ghost:focus-visible,.aula-forum__ta:focus-visible{outline:3px solid color-mix(in srgb,var(--terracotta,#C4553A) 55%,transparent);outline-offset:2px}",
    ".aula-forum__btn[aria-disabled=true]{opacity:.55;cursor:not-allowed}",
    ".aula-forum__ghost{padding:8px 14px;border-radius:999px;border:1.5px solid color-mix(in srgb,var(--ink,#1B1A17) 30%,transparent);background:transparent;color:inherit;font:600 13px/1 var(--font-sans,system-ui);cursor:pointer}",
    ".aula-forum__draft label{display:block;margin-bottom:6px;font-weight:600}",
    ".aula-forum__ta{display:block;width:100%;min-height:120px;resize:vertical;padding:10px 12px;border-radius:10px;border:1.5px solid color-mix(in srgb,var(--ink,#1B1A17) 28%,transparent);background:var(--paper,#fff);color:inherit;font:inherit;line-height:1.55;box-sizing:border-box}",
    ".aula-forum__foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px;font-size:.88em;color:var(--ink-mute,#6b675d)}",
    "@media print{.aula-forum__cta,.aula-forum__draft{display:none}}"
  ].join("\n");
  if (!document.getElementById("aula-forum-css")) {
    var st = document.createElement("style"); st.id = "aula-forum-css"; st.textContent = CSS; document.head.appendChild(st);
  }

  var KEY = "classatelier.forum.";
  function load(k) { try { return window.localStorage.getItem(KEY + k) || ""; } catch (e) { return ""; } }
  function save(k, v) { try { if (v) window.localStorage.setItem(KEY + k, v); else window.localStorage.removeItem(KEY + k); } catch (e) { /* armazenamento bloqueado: segue só na memória */ } }
  function words(s) { var m = String(s || "").trim().match(/\S+/g); return m ? m.length : 0; }
  function isRealUrl(u) { return /^https?:\/\/[^\s/$.?#]+\.[^\s]*$/i.test(String(u || "").trim()); }

  function Forum(props) {
    var h = React.createElement, useState = React.useState, useRef = React.useRef;
    var editing = !!props.editing;
    var sk = String(props.storageKey || "forum");
    var st = useState(function () { return editing ? "" : load(sk); }), text = st[0], setText = st[1];
    var msg = useState(""), status = msg[0], setStatus = msg[1];
    var taRef = useRef(null);
    var onText = function (e) { setText(e.target.value); save(sk, e.target.value); };
    var copy = function () {
      var t = text; if (!t) { setStatus("Escreva algo no rascunho antes de copiar."); return; }
      var done = function () { setStatus("Rascunho copiado. Cole no fórum."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(); });
      else fallback();
      function fallback() { try { taRef.current.select(); document.execCommand("copy"); done(); } catch (e) { setStatus("Não consegui copiar sozinho. Selecione o texto e use Ctrl+C."); } }
    };
    var clear = function () { setText(""); save(sk, ""); setStatus("Rascunho apagado."); };
    var meta = [];
    if (props.dueInitial) meta.push(h("span", { key: "a", className: "aula-forum__chip" }, h("b", null, "Postagem inicial:"), h("span", null, props.dueInitial)));
    if (props.dueReplies) meta.push(h("span", { key: "b", className: "aula-forum__chip" }, h("b", null, "Respostas aos colegas:"), h("span", null, props.dueReplies)));
    var rules = (props.rules || []).filter(function (r) { return String(r || "").replace(/<[^>]+>/g, "").trim(); });
    var url = String(props.href || "").trim(), ok = isRealUrl(url);
    var btnProps = { className: "aula-forum__btn" };
    var btnLabel = props.buttonLabel || "Participar do fórum";
    var btn = (ok && !editing)
      ? h("a", Object.assign(btnProps, { href: url, target: "_blank", rel: "noopener noreferrer" }), btnLabel, h("span", { className: "sr-only", style: { position: "absolute", left: "-9999px" } }, " (abre em nova aba)"))
      : h("span", Object.assign(btnProps, { role: "link", "aria-disabled": "true", title: ok ? "O botão funciona na aula publicada." : "Cole o endereço do fórum no painel à direita." }), btnLabel);
    return h("section", { className: "aula-forum", "aria-label": "Fórum de discussão" },
      h("header", { className: "aula-forum__head" },
        h("span", { className: "aula-forum__ic", "aria-hidden": "true" },
          h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, h("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }))),
        h("div", null, h("div", { className: "aula-forum__kicker" }, "Fórum de discussão"), h("h3", { className: "aula-forum__title" }, props.title))),
      h("div", { className: "aula-forum__body" },
        h("div", { className: "aula-forum__prompt" }, props.prompt),
        meta.length || editing ? h("div", { className: "aula-forum__meta" }, editing ? [
          h("span", { key: "a", className: "aula-forum__chip" }, h("b", null, "Postagem inicial:"), props.dueInitialNode),
          h("span", { key: "b", className: "aula-forum__chip" }, h("b", null, "Respostas aos colegas:"), props.dueRepliesNode)
        ] : meta) : null,
        rules.length ? h("div", null, h("h4", null, "Como participar"), h("ul", { className: "aula-forum__rules" }, rules.map(function (r, i) { return h("li", { key: i, dangerouslySetInnerHTML: { __html: r } }); }))) : null,
        props.showCriteria ? h("div", null, h("h4", null, "Critérios de avaliação"), h("div", { className: "aula-forum__criteria" }, props.criteria)) : null,
        h("div", { className: "aula-forum__cta" }, btn),
        props.showDraft ? h("div", { className: "aula-forum__draft" },
          h("label", { htmlFor: "forum-ta-" + sk }, "Rascunho da sua mensagem"),
          h("textarea", { id: "forum-ta-" + sk, ref: taRef, className: "aula-forum__ta", value: text, onChange: onText, readOnly: editing, placeholder: editing ? "Aqui o aluno prepara a mensagem antes de postar. Fica salvo só no navegador dele." : "Escreva aqui o rascunho da sua mensagem. Ele fica salvo neste navegador." }),
          h("div", { className: "aula-forum__foot" },
            h("span", null, words(text) + " palavra" + (words(text) === 1 ? "" : "s")),
            h("button", { type: "button", className: "aula-forum__ghost", onClick: copy, disabled: editing }, "Copiar rascunho"),
            h("button", { type: "button", className: "aula-forum__ghost", onClick: clear, disabled: editing }, "Limpar"),
            h("span", { role: "status", "aria-live": "polite" }, status))) : null));
  }
  window.Forum = Forum;
  window.isForumUrl = isRealUrl;
})();
