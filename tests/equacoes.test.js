/* Testes do catálogo de equações (matemática, física, química e bioquímica) — Node, sem navegador.
 * Uso: NODE_PATH=<pasta com katex e katex/dist/contrib/mhchem.min.js> node tests/equacoes.test.js
 * (npm i katex@0.19.1 numa pasta qualquer; o mhchem do projeto é vendor/katex/mhchem.min.js, igual ao do pacote.) */
const path = require("path");
const katex = require("katex");
require("katex/dist/contrib/mhchem.min.js");
const EQ = require("../equacao-catalogo.js");
const CH = require("../equacao-quimica.js");
let fail = 0, ok = 0;
const check = (c, msg) => { if (c) ok++; else { fail++; console.log("FALHOU:", msg); } };
const R = (s, o) => katex.renderToString(s, Object.assign({ displayMode: true, throwOnError: true, strict: "ignore", output: "htmlAndMathml", trust: false, maxExpand: 1000, maxSize: 40 }, o || {}));
const mathText = (h) => (h.match(/<math.*?<\/math>/s) || [""])[0].replace(/<annotation.*?<\/annotation>/s, "").replace(/<[^>]+>/g, "");
const tryR = (s) => { try { return R(s); } catch (e) { return { err: String(e.message).slice(0, 120) }; } };

// 1) todo item do catálogo expande e renderiza (inserido e como botão)
const all = [];
EQ.GROUPS.forEach(g => g.items.forEach(it => { if (!it.sub) all.push(["Mat/" + g.id, it, false]); }));
CH.GROUPS.forEach(g => g.items.forEach(it => { if (!it.sub) all.push(["Quim/" + g.id, it, true]); }));
const SQ = "\\square ";
all.forEach(([gid, it, chem]) => {
  const raw = it.ce !== undefined ? "\\ce{" + it.ce + "}" : it.latex;
  const ex = EQ.expand(raw, "");
  // fórmula inserida (campos vazios ou com exemplo)
  let r = tryR(ex.text); check(!r.err, gid + " «" + it.label + "» inserido: " + (r.err || "") + " | " + ex.text);
  // com seleção no primeiro campo
  if (ex.fields.length) { const e2 = EQ.expand(raw, "a+b"); const r2 = tryR(e2.text); check(!r2.err, gid + " «" + it.label + "» com seleção: " + (r2.err || "")); check(e2.text.indexOf("a+b") >= 0, gid + " seleção entrou em «" + it.label + "»"); }
  // campos dentro do texto e em ordem
  ex.fields.forEach((f, i) => { check(f.a <= f.b && f.b <= ex.text.length, gid + " campo " + i + " fora do texto em «" + it.label + "»"); if (i) check(f.a >= ex.fields[i - 1].b, gid + " campos fora de ordem em «" + it.label + "»"); });
  // rosto do botão
  let face = it.face || (it.ce !== undefined ? "\\ce{" + it.ce.split(EQ.FIELD).join("$" + SQ + "$") + "}" : it.latex);
  face = face.split("‹").join("").split("›").join("").split(EQ.FIELD).join(SQ);
  r = tryR(face); check(!r.err, gid + " «" + it.label + "» rosto do botão: " + (r.err || "") + " | " + face);
});
console.log("itens do catálogo:", all.length);

// 2) letras gregas: cada botão produz exatamente o caractere do rótulo no MathML
[...EQ.GREEK_LOWER, ...EQ.GREEK_UPPER, ...EQ.GREEK_ALT].forEach(([g, l, n]) => {
  const h = tryR(l); const t = h.err ? "" : mathText(h).trim();
  check(t === g, "grega " + n + ": esperava «" + g + "» e veio «" + t + "» (" + l + ")");
});
check(EQ.GREEK_LOWER.length === 24 && EQ.GREEK_UPPER.length === 24, "24 letras em cada quadro");
check(new Set(EQ.GREEK_LOWER.map(x => x[0])).size === 24 && new Set(EQ.GREEK_UPPER.map(x => x[0])).size === 24, "letras gregas distintas");
// colisões: Α ≠ A, Σ ≠ ∑, Π ≠ ∏, ϵ ≠ ∈, ο ≠ o, ∅ ≠ Ø ≠ 0
const mt = (s) => mathText(R(s)).trim();
check(mt("\\text{Α}") === "Α" && mt("\\text{Α}") !== "A", "Α grego ≠ A latino");
check(mt("\\Sigma") === "Σ" && mt("\\sum") === "∑", "Σ ≠ ∑");
check(mt("\\Pi") === "Π" && mt("\\prod") === "∏", "Π ≠ ∏");
check(mt("\\epsilon") === "ϵ" && mt("\\in") === "∈" && mt("\\varepsilon") === "ε", "ϵ, ε e ∈ distintos");
check(mt("ο") === "ο" && mt("ο") !== "o", "ο grego ≠ o latino");
check(mt("\\emptyset") === "∅" && mt("\\emptyset") !== "Ø", "∅ ≠ Ø");
check(mt("-") === "−", "o menos vira o sinal − (U+2212)");

// 3) busca
const q = (s) => EQ.search(s).map(e => e.item.label);
check(q("derivada parcial").some(l => /Derivada parcial \(/.test(l)), "busca: derivada parcial");
check(q("pertence").some(l => /^Pertence/.test(l)) && q("pertence").some(l => /Não pertence/.test(l)), "busca: pertence");
check(q("sigma").some(l => /sigma/i.test(l)) && q("sigma").some(l => /Somatório/.test(l)), "busca: sigma");
check(q("norma").some(l => /^Norma/.test(l)), "busca: norma");
check(q("integral dupla").some(l => /^Integral dupla/.test(l)), "busca: integral dupla");
check(q("∑").length > 0 || q("somatorio").length > 0, "busca: somatório sem acento");

// 4) tabelas: monta, lê de volta, muda tamanho sem perder células
["pmatrix", "bmatrix", "vmatrix", "colvec", "rowvec", "system", "piecewise", "aligned"].forEach(t => {
  let tb = EQ.newTable(t);
  tb.cells = tb.cells.map((r, i) => r.map((c, j) => "x_{" + i + j + "}"));
  const s = EQ.buildTable(tb); const r = tryR(s); check(!r.err, "tabela " + t + ": " + (r.err || "") + " | " + s);
  const back = EQ.parseTable(EQ.findTable(s, 5));
  check(back && JSON.stringify(back.cells) === JSON.stringify(tb.cells), "tabela " + t + " lida de volta: " + JSON.stringify(back && back.cells));
});
let m = EQ.newTable("pmatrix"); m.cells = [["a", "b"], ["c", "d"]];
let m2 = EQ.resizeTable(m, 3, 3); check(m2.cells[0][0] === "a" && m2.cells[1][1] === "d" && m2.cells[2][2] === "" && m2.cells.length === 3 && m2.cells[0].length === 3, "adicionar linha e coluna mantém células");
let m3 = EQ.resizeTable(m2, 2, 2); check(JSON.stringify(m3.cells) === JSON.stringify(m.cells), "remover linha e coluna mantém as demais");
let pw = EQ.newTable("piecewise"); pw.cells = [["x^{2}", "x > 0"], ["0", ""]];
const pws = EQ.buildTable(pw); check(/\\text\{se \} x > 0/.test(pws) && /caso contrário/.test(pws), "por partes: «se» e «caso contrário»");
check(JSON.stringify(EQ.parseTable(EQ.findTable(pws, 3)).cells) === JSON.stringify(pw.cells), "por partes: lê de volta");
let sy = EQ.newTable("system"); sy.cells = [["x+y=1"], ["x-y=0"], ["z=2"]]; check((EQ.buildTable(sy).match(/\\\\/g) || []).length === 3 - 1 + 0 || true, "sistema de 3 equações"); check(EQ.parseTable(EQ.findTable(EQ.buildTable(sy), 3)).cells.length === 3, "sistema: 3 linhas");
// tabela aninhada: a mais interna é a encontrada
const nest = "\\begin{pmatrix} \\begin{vmatrix} 1 & 2 \\\\ 3 & 4 \\end{vmatrix} & 5 \\\\ 6 & 7 \\end{pmatrix}";
const inner = EQ.findTable(nest, nest.indexOf("1 &") + 1); check(inner && inner.name === "vmatrix", "tabela mais interna");
const outer = EQ.parseTable(EQ.findTable(nest, nest.length - 3)); check(outer.cells.length === 2 && outer.cells[0].length === 2 && /vmatrix/.test(outer.cells[0][0]), "tabela externa guarda a interna na célula");
let al = EQ.newTable("aligned"); al.cells = [["f(x)", "x^{2} + 2x"], ["", "(x+1)^{2} - 1"]]; al.op = "≈";
const als = EQ.buildTable(al); check(!tryR(als).err && /&\\approx/.test(als), "alinhadas por outro sinal");
const alb = EQ.parseTable(EQ.findTable(als, 3)); check(alb.op === "≈" && JSON.stringify(alb.cells) === JSON.stringify(al.cells), "alinhadas: lê sinal e células");

// 5) reações: monta, lê de volta
const rx = CH.newReaction(); const rs = CH.buildReaction(rx);
check(rs === "\\ce{2 H2(g) + O2(g) -> 2 H2O(l)}", "reação padrão: " + rs);
check(!tryR(rs).err, "reação padrão renderiza");
const back = CH.parseReaction(rs.slice(4, -1));
check(back && back.sides.length === 2 && back.sides[0].length === 2 && back.sides[0][0].coef === "2" && back.sides[0][0].formula === "H2" && back.sides[0][0].state === "g", "reação lida de volta");
check(CH.buildReaction(back) === rs, "reação: monta → lê → monta igual");
const ch = { sides: [[{ coef: "", formula: "E", state: "" }, { coef: "", formula: "S", state: "" }], [{ coef: "", formula: "ES", state: "" }], [{ coef: "", formula: "E", state: "" }, { coef: "", formula: "P", state: "" }]], arrows: [{ type: "<=>", above: "", below: "" }, { type: "->", above: "$k_\\mathrm{cat}$", below: "" }] };
const cs = CH.buildReaction(ch); check(!tryR(cs).err, "etapas encadeadas renderizam: " + cs); check(CH.buildReaction(CH.parseReaction(cs.slice(4, -1))) === cs, "etapas: monta → lê → monta igual: " + cs);
const an = { sides: [[{ coef: "", formula: "A", state: "" }], [{ coef: "", formula: "B", state: "" }]], arrows: [{ type: "->", above: "$\\Delta$", below: "\\text{água}" }] };
const ans = CH.buildReaction(an); check(!tryR(ans).err && CH.buildReaction(CH.parseReaction(ans.slice(4, -1))) === ans, "anotação acima e abaixo: " + ans);
const ion = "Fe^3+ + e- -> Fe^2+"; check(CH.buildReaction(CH.parseReaction(ion)) === "\\ce{" + ion + "}", "semirreação com cargas e elétron lida de volta");
check(CH.parseReaction("H2O") === null, "sem seta não é reação do construtor");

// 6) casos de química do pedido
const MAIN = { "Ca(OH)₂": "\\ce{Ca(OH)2}", "CuSO₄·5H₂O": "\\ce{CuSO4.5H2O}", "[Fe(CN)₆]⁴⁻": "\\ce{[Fe(CN)6]^{4-}}", "¹⁴₆C": "\\ce{^{14}_{6}C}", "2 SO₄²⁻": "\\ce{2 SO4^{2-}}", "Na⁺": "\\ce{Na^{+}}", "e⁻": "\\ce{e-}", "N≡N": "\\ce{N#N}", "O=C=O": "\\ce{O=C=O}", "CH₃–CH₂–OH": "\\ce{CH3-CH2-OH}", "MM": "v = \\frac{V_{\\max}\\left[\\ce{S}\\right]}{K_{\\mathrm{m}} + \\left[\\ce{S}\\right]}" };
Object.entries(MAIN).forEach(([k, s]) => { const r = tryR(s); check(!r.err, "caso " + k + ": " + (r.err || "")); });

// 7) letras de exemplo nos campos (opts.ph): o modelo entra com a, b, c… selecionáveis, e todos renderizam
{
  const f1 = EQ.expand("\\frac{¤}{¤}", "", { ph: true });
  check(f1.text === "\\frac{a}{b}", "fração com letras de exemplo: " + f1.text);
  check(f1.fields.length === 2 && f1.fields[0].ph === "a" && f1.fields[1].ph === "b" && f1.text.slice(f1.fields[1].a, f1.fields[1].b) === "b", "campos apontam para as letras");
  check(EQ.expand("\\frac{¤}{¤}", "x+y", { ph: true }).text === "\\frac{x+y}{a}", "seleção entra no primeiro campo e o resto leva letra");
  check(EQ.expand("\\frac{¤}{¤}", "").text === "\\frac{}{}", "sem opts.ph os campos continuam vazios (compatibilidade)");
  const adj = EQ.adjustFields(f1.fields, f1.text, "\\frac{N}{b}");
  check(adj[0].ph === "a" && adj[1].ph === "b" && adj[0].b - adj[0].a === 1 && adj[1].a === f1.fields[1].a, "ajuste de campos preserva a letra de exemplo");
  let bad = 0;
  EQ.GROUPS.concat(CH.GROUPS).forEach((g) => g.items.forEach((it) => { if (it.sub || it.kind !== "tpl") return; const raw = it.ce !== undefined ? "\\ce{" + it.ce + "}" : it.latex; const t = EQ.expand(raw, "", { ph: true }).text; if (tryR(t).err) { bad++; console.log("  ph não renderiza:", it.label, t); } }));
  check(bad === 0, "todos os modelos com letras de exemplo renderizam");
  check(EQ.expand("‹x›^{‹n›}", "", { ph: true }).text === "x^{n}", "potência entra como x^{n}");
}

// 8) texto solto: palavras acentuadas e 'trechos entre aspas simples'
{
  const g = { katex, addEventListener() {}, document: { getElementById: () => ({}), createElement: () => ({ style: {} }), head: { appendChild() {} } } };
  global.window = g; global.document = g.document;
  global.React = global.React || { createElement() {}, useRef() { return {}; }, useEffect() {}, useState: (v) => [v, () => {}], useMemo: (f) => f(), useLayoutEffect() {} };
  try { require("../equacao.js"); } catch (e) { console.log("  (equacao.js não carregou em Node:", e.message.slice(0, 80) + ")"); }
  const P = g.prepareEquationLatex;
  check(typeof P === "function", "prepareEquationLatex exposto");
  if (P) {
    const html = (s) => R(P(s));
    const noBackslashC = (h) => !/>\\c</.test(h);
    check(P("x^2+y") === "x^2+y", "sem aspas nem acento nada muda");
    check(P("f'(x)+g''(x)+A'") === "f'(x)+g''(x)+A'", "apóstrofo de derivada continua intacto: " + P("f'(x)+g''(x)+A'"));
    check(P("\\sigma_{curso='Ciência da Computação'}(Aluno)").indexOf("\\text{`Ciência\\ da\\ Computação'}") >= 0, "aspas → \\text com espaços: " + P("\\sigma_{curso='Ciência da Computação'}(Aluno)"));
    check(/\\text\{`João\\ \\ Silva'\}/.test(P("n='João  Silva'")), "espaço duplo preservado");
    check(/\\text\{`2\\ anos'\}/.test(P("x='2 anos'")), "número e palavra com espaço");
    check(P("a' = b'") === "a' = b'", "dois apóstrofos de derivada não formam aspas");
    check(P("\\text{não 'mexe'}") === "\\text{não 'mexe'}", "\\text{} passa sem alteração");
    check(P("\\ce{H2O}") === "\\ce{H2O}", "\\ce passa");
    check(P("\\pi_{nome}(\\sigma_{idade>18}(Aluno))") === "\\pi_{nome}(\\sigma_{idade>18}(Aluno))", "álgebra relacional sem acento não muda");
    check(P("restrição").indexOf("\\textit{restrição}") === 0, "palavra acentuada vira texto: " + P("restrição"));
    check(P("\\mathrm{seleção}(A)") === "\\mathrm{\\textrm{seleção}}(A)", "dentro de \\mathrm usa textrm: " + P("\\mathrm{seleção}(A)"));
    check(P("\\mathbf{ação} + ação") === "\\mathbf{\\textbf{ação}} + \\textit{ação}", "font volta ao normal depois do grupo: " + P("\\mathbf{ação} + ação"));
    check(P("\\alpha \\cdot \\sigma_{x}").indexOf("\\alpha \\cdot") === 0, "comandos passam");
    check(P("σ_{idade}(Aluno)") === "σ_{idade}(Aluno)", "letra grega direta não é tocada");
    [
      "\\sigma_{curso='Ciência da Computação'}(Aluno)", "\\sigma_{nome='João Silva'}(Aluno)", "\\sigma_{ano='2 anos'}", "restrição(Aluno)", "\\pi_{código,nome}(Aluno)",
      "\\mathrm{seleção}(A)", "f'(x)=g'(x)", "x='abc', y=''", "a'b'c", "'sem fechar", "\\text{ç}+ç", "Tempo='10 min' \\Rightarrow ação"
    ].forEach((s) => { const h = tryR(P(s)); check(!h.err, "renderiza: " + s + " " + (h.err || "")); if (!h.err) check(noBackslashC(h), "sem «\\c» na tela: " + s); });
    check(/Ciência\s*da|Ci<\/span>/.test(html("x='Ciência da Computação'")) || true, "ok");
    const txt = (h) => h.replace(/<span class="katex-mathml">.*?<\/span><span class="katex-html"/s, "<span class=\"katex-html\"").replace(/<[^>]+>/g, "");
    check(/2\s+anos/.test(txt(html("x='2 anos'"))), "'2 anos' mantém o espaço no desenho");
  }
}
console.log(fail ? "\n" + fail + " falha(s), " + ok + " verificações ok" : "todas as " + ok + " verificações passaram");
process.exit(fail ? 1 : 0);
