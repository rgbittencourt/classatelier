/* ClassAtelier — paleta «Química e Bioquímica» do bloco «Equação» (só do editor).
 *
 * A notação química usa a sintaxe \ce{…} (extensão mhchem do KaTeX, em vendor/katex/mhchem.min.js, que
 * também vai no pacote exportado). A fórmula continua sendo texto LaTeX: o que se escreve aqui reabre,
 * edita e exporta como qualquer outra equação, e dá para misturar \ce{…} com matemática.
 *
 * Itens com `ce` são pedaços da notação química: dentro de um \ce{…} entram como estão; fora, o editor
 * os envolve em \ce{…}. Itens com `latex` são LaTeX comum (entram depois de um \ce{…} aberto).
 * Marcas de campo: «¤» (vazio) e «‹texto›» (com exemplo selecionado), como em equacao-catalogo.js.
 *
 * Também traz a montagem e a leitura de uma reação (reagentes, produtos, setas e anotações).
 * Sem dependências: roda no navegador (window.EQ.CHEM) e no Node (module.exports), para teste.
 */
(function (root) {
  "use strict";
  var NOTE = "\\;\\text{\\small (representação abreviada)}";
  function ce(token, label, tags, face) { return { kind: "sym", ce: token, label: label, tags: tags || "", face: face || null }; }
  function cet(token, label, tags, face) { return { kind: "tpl", ce: token, label: label, tags: tags || "", face: face || null }; }
  function lx(latex, label, tags, face) { return { kind: "sym", latex: latex, label: label, tags: tags || "", face: face || latex }; }
  function lxt(latex, label, tags, face) { return { kind: "tpl", latex: latex, label: label, tags: tags || "", face: face || null }; }
  function sub(label) { return { sub: label }; }

  var GROUPS = [
    { id: "q-formulas", label: "Fórmulas", open: true, items: [
      sub("Elementos, índices e grupos"),
      ce("Co", "Co: cobalto (C maiúsculo, o minúsculo)", "elemento símbolo cobalto maiúscula minúscula"),
      ce("CO", "CO: carbono e oxigênio (monóxido de carbono)", "carbono oxigênio monóxido"),
      cet("‹H›‹2›", "Elemento com índice (H₂)", "átomo índice subscrito número de átomos"),
      cet("‹Ca›(‹OH›)‹2›", "Grupo entre parênteses com índice (Ca(OH)₂)", "grupo parênteses índice hidróxido"),
      cet("[‹Fe›(‹CN›)‹6›]^{‹4›‹-›}", "Complexo entre colchetes com carga ([Fe(CN)₆]⁴⁻)", "complexo colchetes carga íon ferrocianeto"),
      sub("Cargas iônicas (magnitude antes do sinal)"),
      cet("‹Na›^{‹+›}", "Carga +1 ou −1 (Na⁺, Cl⁻)", "carga íon cátion ânion sobrescrito"),
      cet("‹Fe›^{‹3›‹+›}", "Carga com magnitude (Fe³⁺, SO₄²⁻)", "carga íon magnitude sinal sobrescrito"),
      cet("‹2› ‹SO›‹4›^{‹2›‹-›}", "Íon com coeficiente, índice e carga (2 SO₄²⁻)", "coeficiente índice carga íon sulfato"),
      ce("e-", "Elétron (e⁻)", "elétron semirreação"), ce("H+", "Próton (H⁺)", "próton hidrogênio cátion"), ce("OH-", "Hidroxila (OH⁻)", "hidróxido ânion"),
      sub("Isótopos, hidratos e adutos"),
      cet("^{‹14›}_{‹6›}‹C›", "Isótopo com massa e número atômico (¹⁴₆C)", "isótopo massa número atômico sobrescrito subscrito esquerdo nuclídeo"),
      cet("^{‹14›}‹C›", "Isótopo só com massa (¹⁴C)", "isótopo massa"),
      cet("‹CuSO4›.‹5›‹H2O›", "Hidrato ou aduto (CuSO₄·5H₂O)", "hidrato aduto ponto central água de cristalização"),
      sub("Coeficiente, fórmula e estado (campos independentes)"),
      cet("‹2› ‹H2O›(‹l›)", "Coeficiente, fórmula e estado (2 H₂O(l))", "coeficiente estequiométrico fórmula estado físico"),
      ce("(s)", "Estado sólido (s)", "sólido estado físico"), ce("(l)", "Estado líquido (l)", "líquido estado físico"),
      ce("(g)", "Estado gasoso (g)", "gasoso gás estado físico"), ce("(aq)", "Em solução aquosa (aq)", "aquoso aquosa solução estado físico")
    ] },
    { id: "q-reacoes", label: "Reações", open: false, items: [
      sub("Setas (reação, equilíbrio, ressonância)"),
      ce("->", "Seta de reação (→)", "seta reação produz"), ce("<=>", "Seta de equilíbrio (⇌)", "seta equilíbrio reversível"),
      ce("<->", "Seta de ressonância (↔)", "seta ressonância estruturas"), ce("<=>>", "Equilíbrio deslocado para os produtos (⇌)", "seta equilíbrio deslocado produtos"),
      ce("<<=>", "Equilíbrio deslocado para os reagentes (⇌)", "seta equilíbrio deslocado reagentes"), ce("<-", "Seta de reação para a esquerda (←)", "seta reação inversa"),
      sub("Anotações acima e abaixo da seta (a seta se ajusta)"),
      cet("->[‹acima›]", "Seta com anotação acima", "seta anotação acima catalisador enzima temperatura"),
      cet("->[‹acima›][‹abaixo›]", "Seta com anotação acima e abaixo", "seta anotação acima abaixo solvente catalisador"),
      cet("<=>[‹acima›][‹abaixo›]", "Equilíbrio com anotação acima e abaixo", "equilíbrio seta anotação acima abaixo"),
      ce("$\\Delta$", "Δ (calor) para a anotação", "calor aquecimento delta anotação"), ce("$h\\nu$", "hν (luz) para a anotação", "luz fóton hν hv anotação"),
      ce("$\\text{25 °C}$", "Temperatura (25 °C) para a anotação", "temperatura anotação"), ce("$\\text{1 atm}$", "Pressão (1 atm) para a anotação", "pressão anotação"),
      sub("Modelos de equação (edite espécies, cargas e elétrons)"),
      cet("‹AgNO3›(aq) + ‹NaCl›(aq) -> ‹AgCl›(s) + ‹NaNO3›(aq)", "Equação molecular", "equação molecular reação"),
      cet("‹Ag+›(aq) + ‹NO3^-›(aq) + ‹Na+›(aq) + ‹Cl^-›(aq) -> ‹AgCl›(s) + ‹Na+›(aq) + ‹NO3^-›(aq)", "Equação iônica", "equação iônica íons"),
      cet("‹Ag+›(aq) + ‹Cl^-›(aq) -> ‹AgCl›(s)", "Equação iônica líquida", "equação iônica líquida espectadores"),
      cet("‹Fe^3+› + ‹e-› -> ‹Fe^2+›", "Semirreação de redução (ganha elétrons)", "semirreação redução elétron oxirredução"),
      cet("‹Fe^2+› -> ‹Fe^3+› + ‹e-›", "Semirreação de oxidação (perde elétrons)", "semirreação oxidação elétron oxirredução"),
      sub("Etapas encadeadas e várias equações"),
      cet("‹E› + ‹S› <=> ‹ES› -> ‹E› + ‹P›", "Etapas encadeadas (equilíbrio e depois reação)", "etapas encadeadas mecanismo sequência"),
      lxt("\\begin{aligned}\n  \\ce{‹A› + ‹B›} &\\ce{-> ‹C›} \\\\\n  \\ce{‹C›} &\\ce{-> ‹D› + ‹E›}\n\\end{aligned}", "Equações alinhadas pela seta", "equações alinhadas seta várias linhas", "\\begin{aligned}\\ce{A + B} &\\ce{-> C} \\\\ \\ce{C} &\\ce{-> D}\\end{aligned}"),
      lxt("\\begin{aligned}\n  \\ce{‹A›} &\\ce{+ ‹B› -> ‹C›} \\\\\n  \\ce{‹D›} &\\ce{+ ‹F› -> ‹G›}\n\\end{aligned}", "Equações alinhadas pelo sinal de mais", "equações alinhadas sinal mais várias linhas", "\\begin{aligned}\\ce{A} &\\ce{+ B -> C} \\\\ \\ce{D} &\\ce{+ F -> G}\\end{aligned}")
    ] },
    { id: "q-organica", label: "Orgânica", open: false, items: [
      sub("Ligações em linha"),
      ce("-", "Ligação simples (–)", "ligação simples traço"), ce("=", "Ligação dupla (=)", "ligação dupla"), ce("#", "Ligação tripla (≡)", "ligação tripla"),
      sub("Fórmulas condensadas"),
      cet("‹CH3›-‹CH2›-‹OH›", "Fórmula condensada (CH₃–CH₂–OH)", "condensada orgânica etanol ligações"),
      cet("‹O›=‹C›=‹O›", "Ligações duplas (O=C=O)", "ligação dupla dióxido de carbono"),
      cet("‹N›#‹N›", "Ligação tripla (N≡N)", "ligação tripla nitrogênio"),
      cet("‹H2C›=‹CH2›", "Alceno (H₂C=CH₂)", "alceno eteno etileno ligação dupla"),
      cet("‹HC›#‹CH›", "Alcino (HC≡CH)", "alcino etino acetileno ligação tripla"),
      sub("Grupos funcionais"),
      ce("-OH", "Hidroxila (–OH)", "álcool hidroxila grupo funcional"), ce("-CHO", "Aldeído (–CHO)", "aldeído grupo funcional"),
      ce("-CO-", "Cetona (–CO–)", "cetona carbonila grupo funcional"), ce("-COOH", "Ácido carboxílico (–COOH)", "carboxila ácido grupo funcional"),
      ce("-COO-", "Éster (–COO–)", "éster grupo funcional"), ce("-NH2", "Amina (–NH₂)", "amina grupo funcional"),
      ce("-CONH2", "Amida (–CONH₂)", "amida grupo funcional"), ce("-O-", "Éter (–O–)", "éter grupo funcional"),
      ce("-CH3", "Metil (–CH₃)", "metil grupo"), ce("C6H5", "Fenil (C₆H₅)", "fenil grupo aromático benzeno"), ce("R", "Cadeia R", "radical R cadeia")
    ] },
    { id: "q-bio", label: "Bioquímica", open: false, items: [
      sub("Moléculas e cofatores"),
      ce("ATP", "ATP", "atp adenosina trifosfato energia"), ce("ADP", "ADP", "adp adenosina difosfato"), ce("AMP", "AMP", "amp adenosina monofosfato"),
      lx("\\mathrm{P_{i}}", "Fosfato inorgânico (Pᵢ)", "fosfato inorgânico pi"), lx("\\mathrm{PP_{i}}", "Pirofosfato (PPᵢ)", "pirofosfato ppi"),
      ce("NAD+", "NAD⁺", "nad cofator oxidado"), ce("NADH", "NADH", "nadh cofator reduzido"), ce("NADP+", "NADP⁺", "nadp cofator oxidado"), ce("NADPH", "NADPH", "nadph cofator reduzido"),
      ce("FAD", "FAD", "fad cofator oxidado"), ce("FADH2", "FADH₂", "fadh2 cofator reduzido"), ce("CoA", "CoA (coenzima A)", "coa coenzima a"),
      lx("\\text{acetil-}\\ce{CoA}", "Acetil-CoA", "acetil coa acetilcoa", "\\text{acetil-}\\ce{CoA}"),
      sub("Reações enzimáticas"),
      cet("‹E› + ‹S› <=> ‹ES›", "Enzima e substrato: E + S ⇌ ES", "enzima substrato complexo reversível"),
      cet("‹E› + ‹S› <=> ‹ES› -> ‹E› + ‹P›", "Em etapas: E + S ⇌ ES → E + P", "enzima substrato complexo produto etapas michaelis"),
      cet("‹S› ->[‹enzima›] ‹P›", "Substrato → produto, com a enzima acima da seta", "enzima acima da seta substrato produto catalisada"),
      cet("‹E› + ‹S› <=>[‹k_1›][‹k_{-1}›] ‹ES› ->[‹k_{cat}›] ‹E› + ‹P›", "Etapas com constantes de velocidade nas setas", "constantes velocidade k1 kcat setas"),
      sub("Transferência de grupos e oxirredução (representações abreviadas)"),
      lxt("\\ce{‹ATP› + H2O ->[‹enzima›] ‹ADP› + $\\mathrm{P_i}$}" + NOTE, "Hidrólise do ATP (abreviada)", "hidrólise atp água adp fosfato abreviada", "\\ce{ATP + H2O -> ADP + $\\mathrm{P_i}$}"),
      lxt("\\ce{‹Glc› + ATP ->[‹hexocinase›] ‹G6P› + ADP}" + NOTE, "Fosforilação com ATP (abreviada)", "fosforilação atp quinase transferência de fosfato glicose abreviada", "\\ce{Glc + ATP -> G6P + ADP}"),
      lxt("\\ce{‹Lactato› + NAD+ <=>[‹lactato desidrogenase›] ‹Piruvato› + NADH + H+}" + NOTE, "Oxirredução com NAD⁺/NADH (abreviada)", "oxirredução redox nad nadh desidrogenase lactato piruvato abreviada", "\\ce{Lactato + NAD+ <=> Piruvato + NADH + H+}"),
      lxt("\\ce{NAD+ + 2H+ + 2e- <=> NADH + H+}" + NOTE, "Semirreação do NAD⁺ (abreviada)", "semirreação nad redução elétrons abreviada", "\\ce{NAD+ + 2H+ + 2e- <=> NADH + H+}"),
      lxt("\\ce{FAD + 2H+ + 2e- <=> FADH2}" + NOTE, "Semirreação do FAD (abreviada)", "semirreação fad redução elétrons abreviada", "\\ce{FAD + 2H+ + 2e- <=> FADH2}"),
      sub("Cinética enzimática"),
      lx("v", "Velocidade da reação (v)", "velocidade inicial v"), lx("V_{\\max}", "Velocidade máxima (V máx)", "vmax velocidade máxima"),
      lx("K_{\\mathrm{m}}", "Constante de Michaelis (Kₘ)", "km constante de michaelis"), lx("k_{\\mathrm{cat}}", "Constante catalítica (k cat)", "kcat constante catalítica turnover"),
      lxt("\\left[\\ce{‹S›}\\right]", "Concentração entre colchetes ([S])", "concentração colchetes substrato [s]", "\\left[\\ce{S}\\right]"),
      lxt("v = \\frac{‹V_{\\max}›\\,\\left[\\ce{‹S›}\\right]}{‹K_{\\mathrm{m}}› + \\left[\\ce{‹S›}\\right]}", "Equação de Michaelis–Menten", "michaelis menten cinética enzimática fração vmax km", "v = \\frac{V_{\\max}\\,[\\ce{S}]}{K_{\\mathrm{m}} + [\\ce{S}]}"),
      lxt("\\frac{1}{v} = \\frac{‹K_{\\mathrm{m}}›}{‹V_{\\max}›}\\,\\frac{1}{\\left[\\ce{‹S›}\\right]} + \\frac{1}{‹V_{\\max}›}", "Lineweaver–Burk (duplo-recíproco)", "lineweaver burk duplo recíproco", "\\frac{1}{v} = \\frac{K_{\\mathrm{m}}}{V_{\\max}}\\frac{1}{[\\ce{S}]} + \\frac{1}{V_{\\max}}"),
      sub("Equilíbrio e pH"),
      lx("K_{\\mathrm{a}}", "Constante de acidez (Kₐ)", "ka constante de acidez"), lx("\\mathrm{p}K_{\\mathrm{a}}", "pKₐ", "pka"), lx("K_{\\mathrm{eq}}", "Constante de equilíbrio (K eq)", "keq constante de equilíbrio"),
      lxt("K_{\\mathrm{eq}} = \\frac{\\left[\\ce{‹C›}\\right]\\left[\\ce{‹D›}\\right]}{\\left[\\ce{‹A›}\\right]\\left[\\ce{‹B›}\\right]}", "Constante de equilíbrio como fração", "keq equilíbrio fração concentrações", "K_{\\mathrm{eq}} = \\frac{[\\ce{C}][\\ce{D}]}{[\\ce{A}][\\ce{B}]}"),
      lxt("K_{\\mathrm{a}} = \\frac{\\left[\\ce{‹H+›}\\right]\\left[\\ce{‹A-›}\\right]}{\\left[\\ce{‹HA›}\\right]}", "Constante de acidez como fração", "ka acidez fração", "K_{\\mathrm{a}} = \\frac{[\\ce{H+}][\\ce{A-}]}{[\\ce{HA}]}"),
      lxt("\\mathrm{pH} = -\\log\\left[\\ce{‹H+›}\\right]", "pH", "ph logaritmo concentração de hidrogênio", "\\mathrm{pH} = -\\log[\\ce{H+}]"),
      lxt("\\mathrm{pH} = \\mathrm{p}K_{\\mathrm{a}} + \\log \\frac{\\left[\\ce{‹A-›}\\right]}{\\left[\\ce{‹HA›}\\right]}", "Equação de Henderson–Hasselbalch", "henderson hasselbalch tampão ph pka logaritmo fração", "\\mathrm{pH} = \\mathrm{p}K_{\\mathrm{a}} + \\log\\frac{[\\ce{A-}]}{[\\ce{HA}]}")
    ] }
  ];

  var EXAMPLES = [
    ["Química: hidróxido de cálcio", "\\ce{Ca(OH)2}"],
    ["Química: sulfato de cobre hidratado", "\\ce{CuSO4.5H2O}"],
    ["Química: íon ferrocianeto", "\\ce{[Fe(CN)6]^4-}"],
    ["Química: carbono-14", "\\ce{^{14}_{6}C}"],
    ["Química: formação da água", "\\ce{2H2(g) + O2(g) -> 2H2O(l)}"],
    ["Química: semirreação do ferro", "\\ce{Fe^3+ + e- -> Fe^2+}"],
    ["Química: reação com calor e solvente", "\\ce{A + B ->[\\Delta][\\text{água}] C}"],
    ["Bioquímica: enzima e substrato", "\\ce{E + S <=> ES -> E + P}"],
    ["Bioquímica: hidrólise do ATP (abreviada)", "\\ce{ATP + H2O -> ADP + $\\mathrm{P_i}$}\\;\\text{\\small (representação abreviada)}"],
    ["Bioquímica: Michaelis–Menten", "v = \\frac{V_{\\max}\\,\\left[\\ce{S}\\right]}{K_{\\mathrm{m}} + \\left[\\ce{S}\\right]}"],
    ["Bioquímica: Henderson–Hasselbalch", "\\mathrm{pH} = \\mathrm{p}K_{\\mathrm{a}} + \\log \\frac{\\left[\\ce{A-}\\right]}{\\left[\\ce{HA}\\right]}"]
  ];

  // ── Reação: reagentes, produtos, setas e anotações ─────────────────────────────────────────────
  // Modelo: { sides: [[{coef, formula, state}, …], …], arrows: [{type, above, below}, …] }, com
  // arrows.length === sides.length − 1 (várias setas = etapas encadeadas).
  var ARROWS = [
    { id: "->", label: "Reação (→)", ce: "->" }, { id: "<=>", label: "Equilíbrio (⇌)", ce: "<=>" }, { id: "<->", label: "Ressonância (↔)", ce: "<->" },
    { id: "<=>>", label: "Equilíbrio → produtos", ce: "<=>>" }, { id: "<<=>", label: "Equilíbrio → reagentes", ce: "<<=>" }, { id: "<-", label: "Reação inversa (←)", ce: "<-" }
  ];
  var STATES = [["", "sem estado"], ["s", "(s) sólido"], ["l", "(l) líquido"], ["g", "(g) gasoso"], ["aq", "(aq) aquoso"]];
  function newSpecies() { return { coef: "", formula: "", state: "" }; }
  function newReaction() {
    return { sides: [[{ coef: "2", formula: "H2", state: "g" }, { coef: "", formula: "O2", state: "g" }], [{ coef: "2", formula: "H2O", state: "l" }]], arrows: [{ type: "->", above: "", below: "" }] };
  }
  function trim(s) { return String(s == null ? "" : s).trim(); }
  function speciesText(sp) {
    var f = trim(sp.formula); if (!f && !trim(sp.coef)) return "";
    return (trim(sp.coef) ? trim(sp.coef) + " " : "") + (f || "{}") + (sp.state ? "(" + sp.state + ")" : "");
  }
  function arrowText(a) {
    var t = a.type || "->", up = trim(a.above), dn = trim(a.below);
    if (up || dn) t += "[" + up + "]" + (dn ? "[" + dn + "]" : "");
    return t;
  }
  function buildReaction(r) {
    var out = [];
    for (var i = 0; i < r.sides.length; i++) {
      var side = r.sides[i].map(speciesText).filter(Boolean).join(" + ");
      if (side) out.push(side);
      if (i < r.arrows.length) out.push(arrowText(r.arrows[i]));
    }
    return "\\ce{" + out.join(" ") + "}";
  }
  // Divide no primeiro nível de colchetes/chaves/parênteses.
  function topSplit(s, re) {
    var out = [], depth = 0, last = 0, m;
    var g = new RegExp(re.source, "g");
    // marca profundidades
    var d = [], dd = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === "{" || c === "[" || c === "(") dd++;
      d.push(dd);
      if (c === "}" || c === "]" || c === ")") dd--;
    }
    while ((m = g.exec(s))) {
      if (d[m.index] > 0 && s.charAt(m.index) !== "<" && s.charAt(m.index) !== "-") continue;
      out.push(s.slice(last, m.index)); last = m.index + m[0].length;
      if (m[0].length === 0) g.lastIndex++;
    }
    out.push(s.slice(last)); return out;
  }
  var ARROW_RE = /(<=>>|<<=>|<=>|<->|<-->|<--|-->|->|<-)(\[[^\]]*\])?(\[[^\]]*\])?/;
  function parseSpecies(txt) {
    var t = trim(txt); if (!t) return null;
    var sp = newSpecies(), m;
    m = /^(\d+(?:\/\d+)?|\d*\.\d+)\s*(.*)$/.exec(t);
    if (m && m[2] && !/^[+\-=]/.test(m[2])) { sp.coef = m[1]; t = m[2]; }
    m = /^(.*?)\s*\((s|l|g|aq)\)$/.exec(t);
    if (m) { sp.state = m[2]; t = m[1]; }
    sp.formula = t === "{}" ? "" : t;
    return sp;
  }
  // Lê o miolo de um \ce{…}. Devolve null quando o texto não é uma reação que o construtor entende.
  function parseReaction(body) {
    var s = trim(body); if (!s) return null;
    var re = new RegExp(ARROW_RE.source, "g"), parts = [], last = 0, m, arrows = [], depth = 0;
    var d = [], dd = 0, i;
    for (i = 0; i < s.length; i++) { var c = s.charAt(i); if (c === "{" || c === "[" || c === "(") dd++; d.push(dd); if (c === "}" || c === "]" || c === ")") dd--; }
    while ((m = re.exec(s))) {
      var depthHere = m.index > 0 ? d[m.index - 1] : 0;
      if (depthHere > 0 && s.charAt(m.index - 1) !== " ") continue;
      parts.push(s.slice(last, m.index)); last = m.index + m[0].length;
      arrows.push({ type: m[1], above: m[2] ? m[2].slice(1, -1) : "", below: m[3] ? m[3].slice(1, -1) : "" });
    }
    parts.push(s.slice(last));
    var sides = parts.map(function (p) {
      return topSplit(trim(p), /\s\+\s/).map(parseSpecies).filter(Boolean);
    });
    if (!arrows.length) return null;
    sides = sides.map(function (sd) { return sd.length ? sd : [newSpecies()]; });
    return { sides: sides, arrows: arrows };
  }

  var API = { GROUPS: GROUPS, EXAMPLES: EXAMPLES, ARROWS: ARROWS, STATES: STATES, NOTE: NOTE,
    newSpecies: newSpecies, newReaction: newReaction, buildReaction: buildReaction, parseReaction: parseReaction, speciesText: speciesText };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.EQ = root.EQ || {};
  root.EQ.CHEM = API;
})(typeof window !== "undefined" ? window : globalThis);
