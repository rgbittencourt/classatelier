/* ClassAtelier — bloco «Equação».
 * Componente global (sem Babel) usado pelo editor e pelas aulas exportadas.
 * A fórmula é escrita em LaTeX e desenhada pelo KaTeX (vendor/katex/), que também gera MathML
 * para leitores de tela. Layout: fórmula centralizada, dentro de uma caixa com borda visível;
 * o número fica na extremidade direita da mesma linha, FORA da caixa.
 */
(function () {
  var KATEX_OPTS = { displayMode: true, throwOnError: true, output: "htmlAndMathml", strict: "ignore", trust: false, maxExpand: 1000, maxSize: 40 };

  var CSS = [
    ".aula-eq{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:16px;margin:.4em 0;max-width:100%}",
    ".aula-eq__box{grid-column:2;min-width:0;max-width:100%;overflow-x:auto;overflow-y:hidden;border:1.5px solid var(--ink,#1B1A17);border-radius:6px;padding:.55em 1.1em;text-align:center;background:transparent}",
    ".aula-eq__math{font-size:1.2em;line-height:1.3}",
    ".aula-eq .katex-display{margin:0;overflow:visible}",
    ".aula-eq .katex-mathml{position:absolute!important;clip:rect(1px,1px,1px,1px);padding:0!important;border:0!important;height:1px!important;width:1px!important;overflow:hidden}",
    ".aula-eq .katex-display>.katex{white-space:nowrap}",
    ".aula-eq__num{grid-column:3;justify-self:end;font-variant-numeric:tabular-nums;font-size:1em;color:var(--ink,#1B1A17);white-space:nowrap;min-width:2ch;text-align:right}",
    ".aula-eq__err{font:12.5px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#9a2f1b;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}",
    ".aula-eq__err b{display:block;font-family:inherit;margin-bottom:2px}",
    "@media (max-width:560px){.aula-eq{grid-template-columns:minmax(0,1fr);row-gap:4px}.aula-eq__box{grid-column:1;justify-self:center}.aula-eq__num{grid-column:1;justify-self:end}}",
    "@media print{.aula-eq__box{border-color:#000;overflow:visible}.aula-eq{break-inside:avoid}}"
  ].join("\n");

  function injectCss() {
    if (document.getElementById("aula-equacao-css")) return;
    var st = document.createElement("style"); st.id = "aula-equacao-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }
  injectCss();

  // Devolve { html } ou { error }. Nunca lança.
  function renderEquation(latex) {
    var src = String(latex == null ? "" : latex).trim();
    if (!src) return { empty: true };
    if (!window.katex) return { loading: true };
    try { return { html: window.katex.renderToString(src, KATEX_OPTS) }; }
    catch (e) { return { error: String((e && e.message) || e).replace(/^KaTeX parse error:\s*/i, "") }; }
  }

  // Número seguinte ao anterior, mantendo o formato: "(1)" → "(2)", "(1.1)" → "(1.2)", "Eq. 3" → "Eq. 4".
  function nextEquationNumber(prev, count) {
    var plain = String(prev == null ? "" : prev).replace(/<[^>]+>/g, "").trim();
    var m = /(\d+)(?!.*\d)/.exec(plain);
    if (!m) return "(" + ((count || 0) + 1) + ")";
    return plain.slice(0, m.index) + (parseInt(m[1], 10) + 1) + plain.slice(m.index + m[1].length);
  }

  // Todas as equações do documento, em ordem de leitura (percorre blocos aninhados).
  function listEquations(blocks) {
    var out = [];
    (function walk(o) {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) walk(o[i]); return; }
      if (o.type === "equacao" && o.props) out.push(o);
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && o[k] && typeof o[k] === "object") walk(o[k]);
    })(blocks);
    return out;
  }

  // Dá número às equações recém-criadas (props.autoNumber), seguindo a anterior no texto. Devolve o mesmo
  // objeto se nada mudou. `force` renumera TODAS em sequência, a partir da primeira.
  function autoNumberEquations(lesson, force) {
    if (!lesson || !lesson.blocks) return lesson;
    var eqs = listEquations(lesson.blocks);
    var need = force || eqs.some(function (e) { return e.props.autoNumber; });
    if (!need) return lesson;
    var next = JSON.parse(JSON.stringify(lesson));
    var list = listEquations(next.blocks), prev = null;
    list.forEach(function (e, i) {
      if (i > 0 && (force || e.props.autoNumber)) e.props.number = nextEquationNumber(prev, i);
      else if (i === 0 && e.props.autoNumber) e.props.number = e.props.number || "(1)";
      delete e.props.autoNumber;
      prev = e.props.number;
    });
    return next;
  }

  function Equacao(props) {
    var h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect;
    var tick = useState(0), setTick = tick[1];
    var r = renderEquation(props.latex);
    // O KaTeX pode chegar depois (CDN): tenta de novo por alguns segundos.
    useEffect(function () {
      if (!r.loading) return;
      var n = 0, t = setInterval(function () { n++; if (window.katex || n > 40) { clearInterval(t); setTick(function (x) { return x + 1; }); } }, 250);
      return function () { clearInterval(t); };
    }, [r.loading]);
    var showNumber = props.showNumber !== false;
    var plainNum = String(typeof props.numberText === "string" ? props.numberText : "").replace(/<[^>]+>/g, "").trim();
    var label = props.ariaLabel || ("Equação" + (showNumber && plainNum ? " " + plainNum : ""));
    var inner;
    if (r.html) inner = h("div", { className: "aula-eq__math", dangerouslySetInnerHTML: { __html: r.html } });
    else if (r.error) inner = h("div", { className: "aula-eq__err", role: "note" }, h("b", null, "Fórmula com erro de sintaxe"), r.error, "\n\n", String(props.latex || ""));
    else if (r.empty) inner = h("div", { className: "aula-eq__err", style: { color: "inherit", opacity: .6 } }, "Escreva a fórmula no painel à direita.");
    else inner = h("div", { className: "aula-eq__err", style: { color: "inherit", opacity: .7 } }, String(props.latex || ""));
    return h("figure", { className: "aula-eq", role: "group", "aria-label": label, style: { margin: ".4em 0" } },
      h("div", { className: "aula-eq__box" }, inner),
      showNumber ? h("div", { className: "aula-eq__num" }, props.number) : null
    );
  }

  window.Equacao = Equacao;
  window.renderEquation = renderEquation;
  window.nextEquationNumber = nextEquationNumber;
  window.listEquations = listEquations;
  window.autoNumberEquations = autoNumberEquations;
})();
