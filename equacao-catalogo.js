/* ClassAtelier — catálogo da paleta do bloco «Equação» (só do editor; a aula exportada só precisa do KaTeX).
 *
 * Cada item é um símbolo («sym») ou um modelo com campos editáveis («tpl»). Nos modelos, «¤» marca um campo:
 *   · «{¤}» e «[¤]» viram «{}» e «[]» (campo vazio dentro das chaves);
 *   · «¤» solto vira «{}»;
 *   · o primeiro campo recebe o trecho selecionado, se houver.
 * No texto da fórmula, cada campo vazio é um «{}» (ou «[]» depois de \sqrt), e a tecla Tab pula de um para o outro.
 *
 * Também traz: a busca por nome/símbolo, e a montagem e a leitura de matrizes, sistemas, funções por partes e
 * equações alinhadas (para inserir e remover linhas e colunas sem perder as células).
 * Sem dependências: roda no navegador (window.EQ) e no Node (module.exports), para teste.
 */
(function (root) {
  "use strict";
  var F = "¤";

  // ── Auxiliares de definição ────────────────────────────────────────────────────────────────────
  function sym(latex, label, tags, face) { return { kind: "sym", latex: latex, label: label, tags: tags || "", face: face || latex }; }
  function tpl(latex, label, tags, face) { return { kind: "tpl", latex: latex, label: label, tags: tags || "", face: face || latex.split(F).join("\\square ") }; }
  function sub(label) { return { sub: label }; }

  // ── Letras gregas ──────────────────────────────────────────────────────────────────────────────
  // Maiúsculas que se parecem com as latinas não têm comando no LaTeX; entram como texto Unicode grego
  // (\text{Α}), que o KaTeX preserva no MathML. O «ο» também entra como a letra grega.
  var GREEK_LOWER = [
    ["α", "\\alpha ", "alfa"], ["β", "\\beta ", "beta"], ["γ", "\\gamma ", "gama"], ["δ", "\\delta ", "delta"], ["ε", "\\varepsilon ", "épsilon"],
    ["ζ", "\\zeta ", "zeta"], ["η", "\\eta ", "eta"], ["θ", "\\theta ", "teta"], ["ι", "\\iota ", "iota"], ["κ", "\\kappa ", "capa"],
    ["λ", "\\lambda ", "lambda"], ["μ", "\\mu ", "mi"], ["ν", "\\nu ", "ni"], ["ξ", "\\xi ", "csi"], ["ο", "ο", "ômicron"],
    ["π", "\\pi ", "pi"], ["ρ", "\\rho ", "rô"], ["σ", "\\sigma ", "sigma"], ["τ", "\\tau ", "tau"], ["υ", "\\upsilon ", "ípsilon"],
    ["φ", "\\varphi ", "fi"], ["χ", "\\chi ", "qui"], ["ψ", "\\psi ", "psi"], ["ω", "\\omega ", "ômega"]
  ];
  var GREEK_UPPER = [
    ["Α", "\\text{Α}", "Alfa"], ["Β", "\\text{Β}", "Beta"], ["Γ", "\\Gamma ", "Gama"], ["Δ", "\\Delta ", "Delta"], ["Ε", "\\text{Ε}", "Épsilon"],
    ["Ζ", "\\text{Ζ}", "Zeta"], ["Η", "\\text{Η}", "Eta"], ["Θ", "\\Theta ", "Teta"], ["Ι", "\\text{Ι}", "Iota"], ["Κ", "\\text{Κ}", "Capa"],
    ["Λ", "\\Lambda ", "Lambda"], ["Μ", "\\text{Μ}", "Mi"], ["Ν", "\\text{Ν}", "Ni"], ["Ξ", "\\Xi ", "Csi"], ["Ο", "\\text{Ο}", "Ômicron"],
    ["Π", "\\Pi ", "Pi"], ["Ρ", "\\text{Ρ}", "Rô"], ["Σ", "\\Sigma ", "Sigma"], ["Τ", "\\text{Τ}", "Tau"], ["Υ", "\\Upsilon ", "Ípsilon"],
    ["Φ", "\\Phi ", "Fi"], ["Χ", "\\text{Χ}", "Qui"], ["Ψ", "\\Psi ", "Psi"], ["Ω", "\\Omega ", "Ômega"]
  ];
  // Formas alternativas (não fazem parte das 24 letras de cada quadro)
  var GREEK_ALT = [
    ["ϵ", "\\epsilon ", "épsilon (forma lunar)"], ["ϑ", "\\vartheta ", "teta (forma cursiva)"], ["ϰ", "\\varkappa ", "capa (forma cursiva)"],
    ["ϖ", "\\varpi ", "pi (forma cursiva)"], ["ϱ", "\\varrho ", "rô (forma cursiva)"], ["ς", "\\varsigma ", "sigma final"],
    ["ϕ", "\\phi ", "fi (forma fechada)"], ["ϴ", "ϴ", "teta maiúsculo (variante)"]
  ];

  // ── Grupos da paleta ───────────────────────────────────────────────────────────────────────────
  var GROUPS = [
    { id: "estruturas", label: "Estruturas", open: true, items: [
      sub("Frações e raízes"),
      tpl("\\frac{¤}{¤}", "Fração empilhada", "fração dividir numerador denominador"),
      tpl("\\sqrt{¤}", "Raiz quadrada", "raiz radical"),
      tpl("\\sqrt[¤]{¤}", "Raiz com índice", "raiz enésima cúbica índice radical"),
      sub("Expoentes e índices"),
      tpl("^{¤}", "Expoente (do que vem antes)", "potência sobrescrito elevado"),
      tpl("_{¤}", "Subscrito (do que vem antes)", "índice subscrito"),
      tpl("_{¤}^{¤}", "Subscrito e expoente (do que vem antes)", "índice expoente juntos"),
      tpl("{¤}^{¤}", "Potência: base e expoente", "potência elevado base"),
      tpl("{¤}_{¤}", "Índice: base e subscrito", "subscrito base"),
      tpl("{¤}_{¤}^{¤}", "Base com subscrito e expoente", "xi ao quadrado índice expoente"),
      sub("Delimitadores (acompanham a altura)"),
      tpl("\\left( ¤ \\right)", "Parênteses", "parêntese ( )"),
      tpl("\\left[ ¤ \\right]", "Colchetes", "colchete [ ]"),
      tpl("\\left\\{ ¤ \\right\\}", "Chaves", "chave { }"),
      tpl("\\left| ¤ \\right|", "Módulo (valor absoluto)", "módulo absoluto barras |x|"),
      tpl("\\left\\| ¤ \\right\\|", "Norma", "norma de vetor barras duplas"),
      tpl("\\left\\langle ¤ \\right\\rangle", "Delimitadores angulares", "ângulo ⟨ ⟩ produto interno"),
      tpl("\\left\\lfloor ¤ \\right\\rfloor", "Piso", "chão arredondar para baixo"),
      tpl("\\left\\lceil ¤ \\right\\rceil", "Teto", "arredondar para cima"),
      tpl("\\left( ¤ , ¤ \\right)", "Intervalo aberto (a, b)", "intervalo aberto"),
      tpl("\\left[ ¤ , ¤ \\right]", "Intervalo fechado [a, b]", "intervalo fechado"),
      tpl("\\left[ ¤ , ¤ \\right)", "Intervalo fechado à esquerda [a, b)", "intervalo semiaberto"),
      tpl("\\left( ¤ , ¤ \\right]", "Intervalo fechado à direita (a, b]", "intervalo semiaberto"),
      sub("Marcas sobre expressões"),
      tpl("\\overline{¤}", "Barra superior", "barra sobrelinha média conjugado complementar"),
      tpl("\\widehat{¤}", "Chapéu (extensível)", "chapéu acento circunflexo"),
      tpl("\\hat{¤}", "Chapéu", "chapéu versor estimativa"),
      tpl("\\widetilde{¤}", "Til (extensível)", "til"),
      tpl("\\tilde{¤}", "Til", "til"),
      tpl("\\vec{¤}", "Seta vetorial", "vetor seta"),
      tpl("\\overrightarrow{¤}", "Seta vetorial longa", "vetor seta longa segmento AB"),
      tpl("\\dot{¤}", "Ponto (derivada no tempo)", "ponto derivada temporal"),
      tpl("\\ddot{¤}", "Ponto duplo", "dois pontos segunda derivada temporal"),
      tpl("\\underline{¤}", "Sublinhado da fórmula", "sublinhado"),
      tpl("\\overbrace{¤}^{¤}", "Chave superior com anotação", "chave em cima anotação"),
      tpl("\\underbrace{¤}_{¤}", "Chave inferior com anotação", "chave embaixo anotação"),
      sub("Outros modelos"),
      tpl("\\binom{¤}{¤}", "Coeficiente binomial", "binomial combinação n escolhe k"),
      tpl("\\left. ¤ \\right|_{¤}^{¤}", "Avaliação nos limites", "avaliar limites barra vertical teorema fundamental"),
      tpl("\\text{¤}", "Texto dentro da fórmula", "texto palavras", "\\text{Aa}"),
      tpl("¤ \\times 10^{¤}", "Notação científica (× 10 elevado a)", "notação científica potência de dez")
    ] },
    { id: "funcoes", label: "Funções", open: false, items: [
      sub("Funções elementares"),
      sym("\\operatorname{sen}", "Seno (sen)", "seno sen sin trigonometria"), sym("\\sin", "Seno (sin)", "seno sen sin trigonometria"),
      sym("\\cos", "Cosseno (cos)", "cosseno trigonometria"),
      sym("\\tan", "Tangente (tan)", "tangente trigonometria"), sym("\\operatorname{tg}", "Tangente (tg)", "tangente tg trigonometria"),
      sym("\\cot", "Cotangente (cot)", "cotangente"), sym("\\sec", "Secante (sec)", "secante"), sym("\\csc", "Cossecante (csc)", "cossecante"),
      sym("\\operatorname{arcsen}", "Arco seno (arcsen)", "arcseno arcsin inversa"), sym("\\arcsin", "Arco seno (arcsin)", "arcseno arcsin inversa"),
      sym("\\arccos", "Arco cosseno (arccos)", "arccosseno inversa"), sym("\\arctan", "Arco tangente (arctan)", "arcotangente inversa"),
      sym("\\sinh", "Seno hiperbólico (sinh)", "hiperbólico"), sym("\\cosh", "Cosseno hiperbólico (cosh)", "hiperbólico"), sym("\\tanh", "Tangente hiperbólica (tanh)", "hiperbólico"),
      sym("\\exp", "Exponencial (exp)", "exponencial e elevado"), sym("\\ln", "Logaritmo natural (ln)", "logaritmo neperiano"), sym("\\log", "Logaritmo (log)", "logaritmo base dez"),
      tpl("\\log_{¤} {¤}", "Logaritmo com base editável", "logaritmo base"),
      sub("Outros operadores nomeados"),
      sym("\\min", "Mínimo (min)", "mínimo"), sym("\\max", "Máximo (max)", "máximo"),
      tpl("\\operatorname*{arg\\,min}_{¤}", "Argumento do mínimo (arg min)", "argmin argumento mínimo"),
      tpl("\\operatorname*{arg\\,max}_{¤}", "Argumento do máximo (arg max)", "argmax argumento máximo"),
      tpl("\\inf_{¤}", "Ínfimo (inf)", "ínfimo infimo"), tpl("\\sup_{¤}", "Supremo (sup)", "supremo"),
      sym("\\gcd", "Máximo divisor comum (gcd)", "mdc gcd divisor"), sym("\\operatorname{mdc}", "Máximo divisor comum (mdc)", "mdc gcd divisor"),
      sym("\\operatorname{lcm}", "Mínimo múltiplo comum (lcm)", "mmc lcm múltiplo"), sym("\\operatorname{mmc}", "Mínimo múltiplo comum (mmc)", "mmc lcm múltiplo"),
      sym("\\bmod ", "Resto (mod, entre números)", "mod módulo resto a mod b"), tpl("\\pmod{¤}", "Congruência (mod n)", "módulo congruência"),
      sym("\\det", "Determinante (det)", "determinante"), sym("\\operatorname{tr}", "Traço (tr)", "traço matriz"),
      sym("\\operatorname{Re}", "Parte real (Re)", "real complexo"), sym("\\operatorname{Im}", "Parte imaginária (Im)", "imaginária complexo")
    ] },
    { id: "calculo", label: "Cálculo", open: false, items: [
      sub("Limites"),
      tpl("\\lim_{{¤} \\to {¤}} {¤}", "Limite", "limite tende"),
      tpl("\\lim_{{¤} \\to {¤}^{-}} {¤}", "Limite pela esquerda", "limite lateral esquerda"),
      tpl("\\lim_{{¤} \\to {¤}^{+}} {¤}", "Limite pela direita", "limite lateral direita"),
      tpl("\\lim_{{¤} \\to +\\infty} {¤}", "Limite para mais infinito", "limite infinito +∞"),
      tpl("\\lim_{{¤} \\to -\\infty} {¤}", "Limite para menos infinito", "limite infinito −∞"),
      sub("Derivadas"),
      tpl("\\frac{\\mathrm{d}{¤}}{\\mathrm{d}{¤}}", "Derivada ordinária (dy/dx)", "derivada ordinária"),
      tpl("\\frac{\\mathrm{d}^{2}{¤}}{\\mathrm{d}{¤}^{2}}", "Derivada de segunda ordem (d²y/dx²)", "derivada segunda ordem superior"),
      tpl("\\frac{\\mathrm{d}^{n}{¤}}{\\mathrm{d}{¤}^{n}}", "Derivada de ordem n", "derivada ordem superior enésima"),
      tpl("\\frac{\\partial {¤}}{\\partial {¤}}", "Derivada parcial (∂f/∂x)", "derivada parcial"),
      tpl("\\frac{\\partial^{2} {¤}}{\\partial {¤}^{2}}", "Derivada parcial de segunda ordem (∂²f/∂x²)", "derivada parcial segunda ordem superior"),
      tpl("\\frac{\\partial^{2} {¤}}{\\partial {¤}\\,\\partial {¤}}", "Derivada parcial mista (∂²f/∂x∂y)", "derivada parcial mista cruzada"),
      sym("\\partial ", "Derivada parcial: símbolo ∂", "del parcial"),
      sub("Somatórios, produtos, uniões e interseções indexados"),
      tpl("\\sum_{{¤}}^{{¤}} {¤}", "Somatório (∑)", "somatório soma sigma"),
      tpl("\\prod_{{¤}}^{{¤}} {¤}", "Produtório (∏)", "produtório produto pi"),
      tpl("\\bigcup_{{¤}}^{{¤}} {¤}", "União indexada (⋃)", "união de vários conjuntos"),
      tpl("\\bigcap_{{¤}}^{{¤}} {¤}", "Interseção indexada (⋂)", "interseção de vários conjuntos"),
      tpl("\\sum_{{¤}} {¤}", "Somatório com condição embaixo", "somatório condição índice"),
      sub("Integrais"),
      tpl("\\int {¤} \\, \\mathrm{d}{¤}", "Integral indefinida", "integral primitiva"),
      tpl("\\int_{{¤}}^{{¤}} {¤} \\, \\mathrm{d}{¤}", "Integral definida", "integral definida limites"),
      tpl("\\iint_{{¤}} {¤} \\, \\mathrm{d}{¤}", "Integral dupla (∬)", "integral dupla área região"),
      tpl("\\int_{{¤}}^{{¤}} \\int_{{¤}}^{{¤}} {¤} \\, \\mathrm{d}{¤} \\, \\mathrm{d}{¤}", "Integral dupla iterada (limites independentes)", "integral dupla aninhada iterada"),
      tpl("\\iiint_{{¤}} {¤} \\, \\mathrm{d}{¤}", "Integral tripla (∭)", "integral tripla volume"),
      tpl("\\oint_{{¤}} {¤} \\cdot \\mathrm{d}{¤}", "Integral de contorno (∮)", "integral de linha contorno circulação"),
      tpl("\\oiint_{{¤}} {¤} \\cdot \\mathrm{d}{¤}", "Integral de superfície fechada (∯)", "integral de superfície fluxo fechada"),
      sub("Cálculo vetorial"),
      sym("\\nabla ", "Nabla (∇)", "nabla del operador"),
      tpl("\\nabla {¤}", "Gradiente (∇f)", "gradiente"),
      tpl("\\nabla \\cdot \\vec{¤}", "Divergência (∇·F)", "divergente divergência"),
      tpl("\\nabla \\times \\vec{¤}", "Rotacional (∇×F)", "rotacional rot curl"),
      tpl("\\nabla^{2} {¤}", "Laplaciano (∇²f)", "laplaciano laplace")
    ] },
    { id: "simbolos", label: "Símbolos", open: false, items: [
      sub("Aritmética"),
      sym("+", "Mais", "soma adição"), sym("-", "Menos (sinal −)", "subtração menos negativo"), sym("\\pm ", "Mais ou menos (±)", "mais ou menos"), sym("\\mp ", "Menos ou mais (∓)", "menos ou mais"),
      sym("\\times ", "Vezes (×)", "multiplicação cruz produto vetorial"), sym("\\cdot ", "Ponto de multiplicação (·)", "multiplicação ponto produto escalar"),
      sym("\\div ", "Dividido por (÷)", "divisão"), sym("/", "Barra (/)", "divisão barra"), sym("\\%", "Porcentagem (%)", "porcento"), sym("!", "Fatorial (!)", "fatorial"),
      sym("\\circ ", "Composição (∘)", "composição de funções círculo"),
      sub("Comparação e relações"),
      sym("=", "Igual", "igualdade"), sym("\\neq ", "Diferente (≠)", "diferente"), sym("<", "Menor que", "menor"), sym(">", "Maior que", "maior"),
      sym("\\leq ", "Menor ou igual (≤)", "menor ou igual"), sym("\\geq ", "Maior ou igual (≥)", "maior ou igual"),
      sym("\\ll ", "Muito menor que (≪)", "muito menor"), sym("\\gg ", "Muito maior que (≫)", "muito maior"),
      sym("\\approx ", "Aproximadamente igual (≈)", "aproximado"), sym("\\simeq ", "Assintoticamente igual (≃)", "assintótico"), sym("\\cong ", "Congruente (≅)", "congruente isomorfo"),
      sym("\\sim ", "Semelhante, da ordem de (∼)", "til semelhante distribuição"), sym("\\equiv ", "Equivalente, idêntico (≡)", "equivalente idêntico congruente"),
      sym("\\propto ", "Proporcional a (∝)", "proporcional"), sym("\\coloneqq ", "Definido como (≔)", "definição atribuição"),
      sub("Setas"),
      sym("\\leftarrow ", "Seta para a esquerda (←)", "seta esquerda"), sym("\\leftrightarrow ", "Seta nos dois sentidos (↔)", "seta bidirecional"),
      tpl("{¤} \\colon {¤} \\to {¤}", "Aplicação (f: A → B)", "função aplicação domínio contradomínio seta", "f\\colon A \\to B"),
      tpl("{¤} \\to {¤}", "Tende a (limite: x → a)", "limite tende seta", "x \\to a"),
      sym("\\Rightarrow ", "Implica (⇒)", "implicação implica"), sym("\\Leftarrow ", "É implicado por (⇐)", "implicação reversa"), sym("\\Leftrightarrow ", "Se e somente se (⇔)", "equivalência bicondicional"),
      tpl("{¤} \\mapsto {¤}", "Leva a (x ↦ f(x))", "mapeia associa seta", "x \\mapsto y"),
      sym("\\uparrow ", "Seta para cima (↑)", "cresce seta cima"), sym("\\downarrow ", "Seta para baixo (↓)", "decresce seta baixo"),
      sub("Geometria e medidas"),
      sym("\\angle ", "Ângulo (∠)", "ângulo geometria"), sym("\\perp ", "Perpendicular (⟂)", "perpendicular ortogonal"), sym("\\parallel ", "Paralelo (∥)", "paralelo"),
      sym("^{\\circ}", "Grau (°)", "grau ângulo temperatura"), sym("^{\\prime}", "Minuto ou linha (′)", "minuto linha primo"), sym("^{\\prime\\prime}", "Segundo ou dupla linha (″)", "segundo duas linhas"),
      sym("\\triangle ", "Triângulo (△)", "triângulo"), sym("∆", "Incremento (∆)", "incremento operador delta variação"),
      sub("Reticências e constantes"),
      sym("\\ldots ", "Reticências baixas (…)", "reticências pontos"), sym("\\cdots ", "Reticências centrais (⋯)", "reticências pontos centrais"),
      sym("\\vdots ", "Reticências verticais (⋮)", "reticências verticais"), sym("\\ddots ", "Reticências diagonais (⋱)", "reticências diagonais"),
      sym("\\infty ", "Infinito (∞)", "infinito"), sym("\\pi ", "Pi (π)", "pi constante"), sym("\\mathrm{e}", "Número de Euler (e)", "euler constante e"), sym("\\mathrm{i}", "Unidade imaginária (i)", "imaginária complexo"),
      sub("Conjuntos numéricos (com expoente ou índice)"),
      sym("\\mathbb{N}", "Números naturais (ℕ)", "naturais"), sym("\\mathbb{Z}", "Números inteiros (ℤ)", "inteiros"), sym("\\mathbb{Q}", "Números racionais (ℚ)", "racionais"),
      sym("\\mathbb{R}", "Números reais (ℝ)", "reais"), sym("\\mathbb{C}", "Números complexos (ℂ)", "complexos"),
      tpl("\\mathbb{R}^{¤}", "ℝ elevado a n (ℝⁿ)", "reais espaço dimensão", "\\mathbb{R}^{3}"),
      tpl("\\mathbb{¤}_{¤}", "Conjunto numérico com índice", "conjunto numérico índice ℤ ₙ", "\\mathbb{Z}_{n}"),
      tpl("\\mathbb{¤}^{¤}", "Conjunto numérico com expoente", "conjunto numérico expoente ℝ⁺", "\\mathbb{R}^{+}")
    ] },
    { id: "conjuntos", label: "Conjuntos", open: false, items: [
      sub("Pertinência e inclusão"),
      sym("\\in ", "Pertence (∈)", "pertence elemento"), sym("\\notin ", "Não pertence (∉)", "não pertence"),
      sym("\\ni ", "Contém como elemento (∋)", "contém elemento"), sym("\\not\\ni ", "Não contém como elemento (∌)", "não contém elemento"),
      sym("\\subset ", "Subconjunto (⊂)", "contido subconjunto próprio"), sym("\\subseteq ", "Subconjunto ou igual (⊆)", "contido ou igual subconjunto"),
      sym("\\not\\subset ", "Não é subconjunto (⊄)", "não contido"), sym("\\nsubseteq ", "Não é subconjunto ou igual (⊈)", "não contido ou igual"),
      sym("\\supset ", "Superconjunto (⊃)", "contém superconjunto próprio"), sym("\\supseteq ", "Superconjunto ou igual (⊇)", "contém ou igual superconjunto"),
      sym("\\not\\supset ", "Não é superconjunto (⊅)", "não contém"), sym("\\nsupseteq ", "Não é superconjunto ou igual (⊉)", "não contém ou igual"),
      sub("Operações com conjuntos"),
      sym("\\emptyset ", "Conjunto vazio (∅)", "vazio"), sym("\\cup ", "União (A ∪ B)", "união"), sym("\\cap ", "Interseção (A ∩ B)", "interseção"),
      sym("\\setminus ", "Diferença de conjuntos (A ∖ B)", "diferença menos barra invertida"), sym("\\triangle ", "Diferença simétrica (△)", "diferença simétrica"),
      tpl("\\left\\{ ¤ , ¤ , \\dots , ¤ \\right\\}", "Conjunto por extensão {a, b, …}", "conjunto extensão enumerado chaves"),
      tpl("\\left\\{ {¤} \\mid {¤} \\right\\}", "Conjunto por compreensão {x | …}", "conjunto compreensão propriedade tal que"),
      tpl("{¤} \\setminus {¤}", "Diferença: A menos B", "diferença conjunto"),
      tpl("\\overline{¤}", "Complementar (barra)", "complemento complementar barra"), tpl("{¤}^{c}", "Complementar (expoente c)", "complemento complementar expoente c"),
      tpl("{¤} \\times {¤}", "Produto cartesiano (A × B)", "produto cartesiano"),
      tpl("\\left| ¤ \\right|", "Cardinalidade |A|", "cardinalidade número de elementos tamanho"),
      tpl("\\mathcal{P}\\left({¤}\\right)", "Conjunto das partes 𝒫(A)", "partes potência"),
      tpl("\\bigcup_{{¤}}^{{¤}} {¤}", "União indexada (⋃ de vários)", "união indexada de vários"), tpl("\\bigcap_{{¤}}^{{¤}} {¤}", "Interseção indexada (⋂ de vários)", "interseção indexada de vários")
    ] },
    { id: "logica", label: "Lógica", open: false, items: [
      sub("Conectivos"),
      sym("\\neg ", "Negação (¬)", "negação não"), sym("\\land ", "E, conjunção (∧)", "e conjunção"), sym("\\lor ", "OU, disjunção (∨)", "ou disjunção"),
      sym("\\oplus ", "OU exclusivo, XOR (⊕)", "xor ou exclusivo"), tpl("\\overline{¤}", "Negação com barra superior", "negação barra p"),
      sym("\\rightarrow ", "Implicação (→)", "implicação condicional"), sym("\\leftrightarrow ", "Bicondicional (↔)", "bicondicional se e somente se"),
      sym("\\Rightarrow ", "Implica (⇒)", "implica consequência"), sym("\\Leftrightarrow ", "Se e somente se (⇔)", "equivalência"), sym("\\equiv ", "Equivalência lógica (≡)", "equivalente"),
      sym("\\uparrow ", "NAND, barra de Sheffer (↑)", "nand sheffer"), sym("\\downarrow ", "NOR, seta de Peirce (↓)", "nor peirce"),
      sub("Quantificadores e constantes"),
      sym("\\forall ", "Para todo (∀)", "quantificador universal para todo"), sym("\\exists ", "Existe (∃)", "quantificador existencial existe"),
      sym("\\nexists ", "Não existe (∄)", "não existe"), sym("\\exists !", "Existe um único (∃!)", "existe único unicidade"),
      sym("\\top ", "Verdadeiro (⊤)", "verdadeiro tautologia"), sym("\\bot ", "Falso (⊥)", "falso contradição absurdo"),
      sub("Dedução"),
      sym("\\vdash ", "Dedutibilidade (⊢)", "dedutibilidade prova deriva demonstra"), sym("\\models ", "Consequência semântica (⊨)", "consequência semântica satisfaz modela"),
      sym("\\therefore ", "Portanto (∴)", "portanto logo"), sym("\\because ", "Pois, porque (∵)", "pois porque")
    ] },
    { id: "notacao", label: "Notação científica e unidades", open: false, adv: true, items: [
      sub("Números"),
      tpl("¤ \\times 10^{¤}", "Notação científica (× 10 elevado a)", "notação científica potência de dez"),
      tpl("{¤}{,}{¤}\\,\\mathrm{¤}", "Quantidade com unidade (9,81 m·s⁻²)", "quantidade grandeza unidade número vírgula decimal", "9{,}81\\,\\mathrm{m\\cdot s^{-2}}"),
      tpl("\\mathrm{¤}", "Texto reto (unidade livre)", "unidade livre fonte reta"),
      sym("\\,", "Espaço fino (entre número e unidade)", "espaço fino"),
      sub("Unidades (letra reta)"),
      sym("\\mathrm{m/s}", "Metro por segundo", "m/s velocidade"), sym("\\mathrm{m/s^{2}}", "Metro por segundo ao quadrado", "m/s² aceleração"),
      sym("\\mathrm{kg}", "Quilograma", "kg massa"), sym("\\mathrm{N}", "Newton", "força"), sym("\\mathrm{J}", "Joule", "energia trabalho"), sym("\\mathrm{W}", "Watt", "potência"),
      sym("\\mathrm{Pa}", "Pascal", "pressão"), sym("\\mathrm{Hz}", "Hertz", "frequência"), sym("\\mathrm{V}", "Volt", "tensão"), sym("\\mathrm{A}", "Ampère", "corrente"),
      sym("\\mathrm{\\Omega}", "Ohm (Ω)", "resistência ohm"), sym("\\mathrm{K}", "Kelvin", "temperatura"), sym("{}^{\\circ}\\mathrm{C}", "Grau Celsius (°C)", "celsius temperatura grau"),
      sym("\\text{µm}", "Micrômetro (µm)", "micrometro mícron"), sym("\\text{µs}", "Microssegundo (µs)", "microssegundo"),
      sub("Combinar unidades"),
      sym("\\cdot ", "Produto de unidades (m·s)", "produto unidades ponto"), sym("/", "Divisão de unidades (m/s)", "divisão unidades barra"),
      sym("^{-1}", "Expoente −1 (s⁻¹)", "inverso expoente negativo"), sym("^{-2}", "Expoente −2 (s⁻²)", "expoente negativo"), sym("^{2}", "Expoente 2 (m²)", "quadrado"), sym("^{3}", "Expoente 3 (m³)", "cubo")
    ] },
    { id: "fisica", label: "Física, estatística e álgebra linear", open: false, adv: true, items: [
      sub("Física"),
      tpl("\\vec{¤}", "Vetor com seta", "vetor seta física"), tpl("\\hat{¤}", "Versor com chapéu", "versor unitário chapéu"),
      tpl("\\left| \\vec{¤} \\right|", "Módulo de um vetor", "módulo vetor"), tpl("\\left\\| \\vec{¤} \\right\\|", "Norma de um vetor", "norma vetor"),
      tpl("\\vec{¤} \\cdot \\vec{¤}", "Produto escalar a·b", "produto escalar interno ponto"), tpl("\\vec{¤} \\times \\vec{¤}", "Produto vetorial a×b", "produto vetorial externo cruz"),
      tpl("\\dot{¤}", "Derivada no tempo (ẋ)", "velocidade ponto derivada tempo"), tpl("\\ddot{¤}", "Segunda derivada no tempo (ẍ)", "aceleração dois pontos segunda derivada tempo"),
      sub("Estatística e probabilidade"),
      tpl("\\bar{¤}", "Média (x̄)", "média amostral barra"), tpl("\\hat{¤}", "Estimativa (p̂)", "estimativa estimador chapéu proporção"),
      tpl("\\operatorname{Var}\\left({¤}\\right)", "Variância Var(X)", "variância"), tpl("\\operatorname{Cov}\\left({¤}, {¤}\\right)", "Covariância Cov(X, Y)", "covariância"),
      tpl("\\mathbb{E}\\left[ {¤} \\right]", "Esperança E[X]", "esperança valor esperado média"), tpl("P\\left( {¤} \\right)", "Probabilidade P(A)", "probabilidade"),
      tpl("P\\left( {¤} \\mid {¤} \\right)", "Probabilidade condicional P(A | B)", "probabilidade condicional dado"), tpl("\\binom{¤}{¤}", "Coeficiente binomial", "binomial combinação"),
      sub("Números complexos e álgebra linear"),
      tpl("\\overline{¤}", "Conjugado (z̄)", "conjugado complexo"), tpl("\\operatorname{Re}\\left({¤}\\right)", "Parte real Re(z)", "real"), tpl("\\operatorname{Im}\\left({¤}\\right)", "Parte imaginária Im(z)", "imaginária"),
      tpl("{¤}^{\\mathsf{T}}", "Matriz transposta (Aᵀ)", "transposta"), tpl("{¤}^{-1}", "Matriz inversa (A⁻¹)", "inversa"),
      tpl("\\det\\left( {¤} \\right)", "Determinante det(A)", "determinante"), tpl("\\operatorname{tr}\\left( {¤} \\right)", "Traço tr(A)", "traço"),
      tpl("\\left\\langle {¤}, {¤} \\right\\rangle", "Produto interno ⟨u, v⟩", "produto interno"), tpl("\\left\\| {¤} \\right\\|", "Norma ‖v‖", "norma")
    ] }
  ];

  // ── Exemplos prontos ───────────────────────────────────────────────────────────────────────────
  var EXAMPLES = [
    ["Teorema de Pitágoras", "a^{2} + b^{2} = c^{2}"],
    ["Fórmula de Bhaskara", "x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}"],
    ["Velocidade média", "v_m = \\frac{\\Delta s}{\\Delta t}"],
    ["2ª lei de Newton", "\\vec{F} = m\\,\\vec{a}"],
    ["Energia cinética", "E_c = \\frac{1}{2}\\, m\\, v^{2}"],
    ["Lei de Ohm", "V = R \\cdot I"],
    ["Gravitação universal", "F = G\\,\\frac{m_1\\, m_2}{r^{2}}"],
    ["Equivalência massa-energia", "E = mc^{2}"],
    ["Derivada (definição)", "\\frac{dy}{dx} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}"],
    ["Teorema fundamental do cálculo", "\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)"],
    ["Média aritmética", "\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i"],
    ["Aceleração da gravidade (unidade)", "g = 9{,}81\\,\\mathrm{m\\cdot s^{-2}}"],
    ["Integral de Gauss", "\\int_{-\\infty}^{+\\infty} e^{-x^{2}}\\,\\mathrm{d}x = \\sqrt{\\pi}"],
    ["Teorema da divergência", "\\iiint_{V} \\nabla \\cdot \\vec{F}\\,\\mathrm{d}V = \\oiint_{S} \\vec{F} \\cdot \\mathrm{d}\\vec{S}"],
    ["Conjuntos: união e interseção", "\\left| A \\cup B \\right| = \\left| A \\right| + \\left| B \\right| - \\left| A \\cap B \\right|"],
    ["Conjuntos: diferença", "A \\setminus B = \\left\\{ x \\mid x \\in A \\land x \\notin B \\right\\}"],
    ["Conjuntos: De Morgan", "\\overline{A \\cup B} = \\overline{A} \\cap \\overline{B}"],
    ["Lógica: De Morgan", "\\neg (p \\land q) \\equiv \\neg p \\lor \\neg q"],
    ["Lógica: condicional", "p \\rightarrow q \\equiv \\neg p \\lor q"],
    ["Lógica: quantificadores", "\\forall x \\in A,\\ \\exists y \\in B : P(x, y)"]
  ];

  // ── Expansão de um modelo em texto ─────────────────────────────────────────────────────────────
  // Marcas de campo: «¤» (campo vazio) e «‹texto›» (campo com um texto de exemplo, que fica selecionado).
  // Devolve { text, fields: [{a, b}, …] } (posições dentro de `text`, na ordem de preenchimento). O trecho
  // selecionado vai para o primeiro campo. Sem campos, `fields` fica vazio e o cursor vai para o fim.
  function expand(snippet, selected) {
    var s = String(snippet);
    s = s.replace(/\{¤\}/g, "{" + F + "}").replace(/\[¤\]/g, "[" + F + "]");
    var out = "", fields = [], used = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === "‹") {
        var j = s.indexOf("›", i); if (j < 0) { out += ch; continue; }
        var txt = s.slice(i + 1, j);
        if (!used && selected) txt = selected;
        used = true; fields.push({ a: out.length, b: out.length + txt.length }); out += txt; i = j; continue;
      }
      if (ch !== F) { out += ch; continue; }
      var inside = (s.charAt(i - 1) === "{" && s.charAt(i + 1) === "}") || (s.charAt(i - 1) === "[" && s.charAt(i + 1) === "]") || (s.charAt(i - 1) === "‹");
      if (!inside) out += "{";
      var txt2 = (!used && selected) ? selected : "";
      used = true; fields.push({ a: out.length, b: out.length + txt2.length }); out += txt2;
      if (!inside) out += "}";
    }
    return { text: out, fields: fields };
  }
  // Atualiza as posições dos campos depois de uma edição (compara o texto antigo com o novo).
  function adjustFields(fields, oldText, newText) {
    if (oldText === newText) return fields;
    var p = 0, max = Math.min(oldText.length, newText.length);
    while (p < max && oldText.charAt(p) === newText.charAt(p)) p++;
    var q = 0; while (q < max - p && oldText.charAt(oldText.length - 1 - q) === newText.charAt(newText.length - 1 - q)) q++;
    var oldEnd = oldText.length - q, delta = newText.length - oldText.length;
    var grown = false;
    return fields.map(function (f) {
      // A edição começa e termina dentro do campo (ou nas bordas dele): o campo cresce ou encolhe com ela.
      if (!grown && f.a <= p && oldEnd <= f.b) { grown = true; return { a: f.a, b: f.b + delta }; }
      if (f.b <= p) return f;
      if (f.a >= oldEnd) return { a: f.a + delta, b: f.b + delta };
      return { a: Math.min(f.a, p), b: Math.max(Math.min(f.a, p), f.b + delta) };
    });
  }
  // O cursor está dentro de um \ce{…}? Devolve { start, end } do miolo (entre as chaves) ou null.
  function insideCe(text, pos) {
    var re = /\\ce\s*\{/g, m, best = null;
    while ((m = re.exec(text))) {
      var start = m.index + m[0].length, depth = 0, end = -1;
      for (var i = start; i < text.length; i++) {
        var c = text.charAt(i);
        if (c === "\\") { i++; continue; }
        if (c === "{") depth++; else if (c === "}") { if (depth === 0) { end = i; break; } depth--; }
      }
      if (end < 0) end = text.length;
      if (pos >= start && pos <= end) best = { start: start, end: end };
      if (m.index > pos) break;
    }
    return best;
  }

  // Move uma posição do cursor (ou um marcador) depois de uma edição: o que está depois da edição desloca.
  function adjustPos(pos, oldText, newText) {
    if (oldText === newText) return pos;
    var p = 0, max = Math.min(oldText.length, newText.length);
    while (p < max && oldText.charAt(p) === newText.charAt(p)) p++;
    var q = 0; while (q < max - p && oldText.charAt(oldText.length - 1 - q) === newText.charAt(newText.length - 1 - q)) q++;
    var oldEnd = oldText.length - q, delta = newText.length - oldText.length;
    if (pos >= oldEnd) return pos + delta;
    if (pos <= p) return pos;
    return Math.max(p, Math.min(pos, newText.length - q));
  }

  // Depois da chave que fecha o grupo onde o cursor está (sair da estrutura). Devolve -1 se não há.
  function exitGroup(text, pos) {
    var depth = 0;
    for (var i = pos; i < text.length; i++) {
      var c = text.charAt(i);
      if (c === "\\") { i++; continue; }
      if (c === "{") depth++;
      else if (c === "}") { if (depth === 0) return i + 1; depth--; }
    }
    return -1;
  }

  // ── Busca ──────────────────────────────────────────────────────────────────────────────────────
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function allItems() {
    var out = [];
    GROUPS.forEach(function (g) {
      g.items.forEach(function (it) { if (!it.sub) out.push({ group: g.id, groupLabel: g.label, item: it }); });
    });
    GREEK_LOWER.concat(GREEK_UPPER, GREEK_ALT).forEach(function (r, i) {
      var upper = GREEK_UPPER.indexOf(r) >= 0, alt = GREEK_ALT.indexOf(r) >= 0;
      var it = sym(r[1], "Letra grega " + (upper || r[2] === "teta maiúsculo (variante)" ? "maiúscula " : "minúscula ") + r[2] + " (" + r[0] + ")", "grega letra grego " + r[2] + " " + r[0] + (alt ? " variante forma alternativa" : ""), r[1]);
      it.glyph = r[0];
      out.push({ group: "gregas", groupLabel: "Gregas", item: it });
    });
    return out;
  }
  function search(query) {
    var q = norm(query).trim();
    if (!q) return [];
    var words = q.split(/\s+/);
    return allItems().filter(function (e) {
      var hay = norm(e.item.label + " " + e.item.tags + " " + e.groupLabel + " " + (e.item.glyph || "")) + " " + e.item.latex.toLowerCase() + " " + (e.item.glyph || "");
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }

  // ── Tabelas de fórmulas: matriz, determinante, sistema, função por partes, equações alinhadas ──
  var TABLE_TYPES = [
    { id: "pmatrix", label: "Matriz com parênteses", env: "pmatrix", cols: [1, 12], rows: [1, 12] },
    { id: "bmatrix", label: "Matriz com colchetes", env: "bmatrix", cols: [1, 12], rows: [1, 12] },
    { id: "vmatrix", label: "Determinante (barras verticais)", env: "vmatrix", cols: [1, 12], rows: [1, 12] },
    { id: "colvec", label: "Vetor-coluna", env: "pmatrix", cols: [1, 1], rows: [1, 12] },
    { id: "rowvec", label: "Vetor-linha", env: "pmatrix", cols: [1, 12], rows: [1, 1] },
    { id: "system", label: "Sistema de equações (chave à esquerda)", env: "cases", cols: [1, 1], rows: [1, 12] },
    { id: "piecewise", label: "Função por partes (valor e condição)", env: "cases", cols: [2, 2], rows: [1, 12] },
    { id: "aligned", label: "Equações em várias linhas (alinhadas)", env: "aligned", cols: [2, 2], rows: [1, 20] }
  ];
  var ALIGN_OPS = [["=", "="], ["≈", "\\approx"], ["≤", "\\leq"], ["<", "<"], ["≥", "\\geq"], [">", ">"], ["≡", "\\equiv"], ["⇒", "\\Rightarrow"], ["⇔", "\\Leftrightarrow"], ["→", "\\to"]];

  function tableType(id) { for (var i = 0; i < TABLE_TYPES.length; i++) if (TABLE_TYPES[i].id === id) return TABLE_TYPES[i]; return TABLE_TYPES[0]; }
  function newTable(typeId) {
    var t = tableType(typeId), r = Math.max(t.rows[0], Math.min(t.rows[1], typeId === "system" ? 3 : 2)), c = Math.max(t.cols[0], Math.min(t.cols[1], 2));
    var cells = [];
    for (var i = 0; i < r; i++) { var row = []; for (var j = 0; j < c; j++) row.push(""); cells.push(row); }
    return { type: typeId, cells: cells, op: "=", se: true };
  }
  function resizeTable(tb, rows, cols) {
    var t = tableType(tb.type);
    rows = Math.max(t.rows[0], Math.min(t.rows[1], rows)); cols = Math.max(t.cols[0], Math.min(t.cols[1], cols));
    var cells = [];
    for (var i = 0; i < rows; i++) { var row = []; for (var j = 0; j < cols; j++) row.push((tb.cells[i] && tb.cells[i][j]) || ""); cells.push(row); }
    return { type: tb.type, cells: cells, op: tb.op, se: tb.se };
  }
  function changeTableType(tb, typeId) {
    var t = tableType(typeId);
    var rows = Math.max(t.rows[0], Math.min(t.rows[1], tb.cells.length)), cols = Math.max(t.cols[0], Math.min(t.cols[1], tb.cells[0] ? tb.cells[0].length : 1));
    return resizeTable({ type: typeId, cells: tb.cells, op: tb.op, se: tb.se }, rows, cols);
  }
  function cell(s) { s = String(s == null ? "" : s).trim(); return s; }
  function buildTable(tb) {
    var t = tableType(tb.type), n = tb.cells.length, rows = [];
    for (var i = 0; i < n; i++) {
      var c = tb.cells[i].map(cell);
      if (tb.type === "piecewise") {
        var cond = c[1];
        if (cond && tb.se !== false && !/^\\text\s*\{/.test(cond)) cond = "\\text{se } " + cond;
        else if (!cond && i === n - 1 && n > 1) cond = "\\text{caso contrário}";
        rows.push((c[0] || "{}") + " & " + (cond || "{}"));
      } else if (tb.type === "aligned") {
        var op = ((ALIGN_OPS.filter(function (o) { return o[0] === tb.op; })[0]) || [null, tb.op || "="])[1];
        rows.push(c[1] ? (c[0] ? c[0] + " " : "") + "&" + op + " " + c[1] : (c[0] || "{}"));
      } else {
        rows.push(c.map(function (x) { return x || "{}"; }).join(" & "));
      }
    }
    return "\\begin{" + t.env + "}\n  " + rows.join(" \\\\\n  ") + "\n\\end{" + t.env + "}";
  }

  // Divide o miolo de um ambiente em linhas e células (profundidade de chaves e de \begin/\end respeitada).
  function splitBody(body) {
    var rows = [[""]], brace = 0, env = 0;
    for (var i = 0; i < body.length; i++) {
      var c = body.charAt(i), cur = rows[rows.length - 1];
      if (c === "\\") {
        var nx = body.charAt(i + 1);
        if (nx === "\\" && brace === 0 && env === 0) {
          i++; var m = /^\[[^\]]*\]/.exec(body.slice(i + 1)); if (m) i += m[0].length;
          rows.push([""]); continue;
        }
        var cmd = /^\\(begin|end)\s*\{/.exec(body.slice(i));
        if (cmd) { if (cmd[1] === "begin") env++; else env--; }
        cur[cur.length - 1] += c + nx; i++; continue;
      }
      if (c === "{") brace++; else if (c === "}") brace--;
      if (c === "&" && brace === 0 && env === 0) { cur.push(""); continue; }
      cur[cur.length - 1] += c;
    }
    return rows.map(function (r) { return r.map(function (x) { return x.trim(); }); }).filter(function (r, k, a) { return !(k === a.length - 1 && r.length === 1 && r[0] === ""); });
  }
  // Acha o ambiente suportado que contém `pos` (o mais interno). Devolve { start, end, name, body } ou null.
  function findTable(text, pos) {
    var re = /\\(begin|end)\{(pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|array|matrix)\}/g, m, stack = [], best = null;
    while ((m = re.exec(text))) {
      if (m[1] === "begin") stack.push({ name: m[2], start: m.index, bodyStart: m.index + m[0].length });
      else {
        var open = stack.pop();
        if (open && open.name === m[2] && open.start <= pos && pos <= m.index + m[0].length) {
          if (!best || open.start >= best.start) best = { start: open.start, end: m.index + m[0].length, name: m[2], body: text.slice(open.bodyStart, m.index) };
        }
      }
    }
    return best;
  }
  var ENV_TYPE = { pmatrix: "pmatrix", bmatrix: "bmatrix", vmatrix: "vmatrix", cases: "system", aligned: "aligned" };
  function parseTable(found) {
    if (!found || !ENV_TYPE[found.name]) return null;
    var rows = splitBody(found.body), type = ENV_TYPE[found.name];
    var width = rows.reduce(function (a, r) { return Math.max(a, r.length); }, 1);
    var tb = { type: type, cells: [], op: "=", se: true };
    if (type === "system" && width >= 2) type = tb.type = "piecewise";
    if (type === "pmatrix" && width === 1 && rows.length > 1) tb.type = "colvec";
    else if (type === "pmatrix" && rows.length === 1 && width > 1) tb.type = "rowvec";
    rows.forEach(function (r) {
      var c = r.slice(); while (c.length < (type === "aligned" || type === "piecewise" ? 2 : width)) c.push("");
      c = c.map(function (x) { return x === "{}" ? "" : x; });
      if (type === "piecewise") {
        var m = /^\\text\{se\s*\}\s*(.*)$/.exec(c[1]); if (m) c[1] = m[1];
        if (/^\\text\{caso contrário\}$/.test(c[1])) c[1] = "";
      } else if (type === "aligned") {
        var rest = r.length > 1 ? c[1] : "";
        for (var k = 0; k < ALIGN_OPS.length; k++) {
          var o = ALIGN_OPS[k][1];
          if (rest.indexOf(o) === 0 && (rest.length === o.length || !/[A-Za-z]/.test(rest.charAt(o.length)) || o.charAt(o.length - 1) === "=")) { tb.op = ALIGN_OPS[k][0]; rest = rest.slice(o.length).trim(); break; }
        }
        c = [c[0], rest];
      }
      tb.cells.push(c);
    });
    if (!tb.cells.length) tb.cells.push(tb.type === "piecewise" || tb.type === "aligned" ? ["", ""] : [""]);
    return tb;
  }

  var API = {
    GROUPS: GROUPS, GREEK_LOWER: GREEK_LOWER, GREEK_UPPER: GREEK_UPPER, GREEK_ALT: GREEK_ALT, EXAMPLES: EXAMPLES,
    TABLE_TYPES: TABLE_TYPES, ALIGN_OPS: ALIGN_OPS, FIELD: F,
    expand: expand, adjustFields: adjustFields, adjustPos: adjustPos, insideCe: insideCe, exitGroup: exitGroup, search: search, allItems: allItems, norm: norm,
    newTable: newTable, resizeTable: resizeTable, changeTableType: changeTableType, tableType: tableType, buildTable: buildTable,
    splitBody: splitBody, findTable: findTable, parseTable: parseTable
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.EQ = API;
})(typeof window !== "undefined" ? window : globalThis);
