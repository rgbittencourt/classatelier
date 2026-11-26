/* Testes do motor do corretor (Node, sem navegador). Uso: node tests/corretor.test.js */
const path = require("path");
const M = require("../corretor-motor.js");
global.window = {};
require("../vendor/dict/pt-BR.js"); require("../vendor/dict/en-US.js");
let ok = 0, fail = 0;
const check = (c, m) => { if (c) ok++; else { fail++; console.log("FALHOU:", m); } };
const t0 = Date.now();
const pt = new M.Dict(window.__CA_DICT["pt-BR"].aff, window.__CA_DICT["pt-BR"].dic);
const en = new M.Dict(window.__CA_DICT["en-US"].aff, window.__CA_DICT["en-US"].dic);
check(Date.now() - t0 < 4000, "dicionários carregam em menos de 4 s (levou " + (Date.now() - t0) + " ms)");
// português: certas
["restrição", "seleção", "equações", "você", "não", "é", "São", "Florianópolis", "Computação", "falávamos", "recebêssemos", "professores", "reaprender", "guarda-chuva", "d'água", "Aluno", "Aluna", "ortografia", "algoritmo", "relacional", "ÁLGEBRA", "Álgebra"]
  .forEach((w) => check(pt.check(w), "pt deveria aceitar «" + w + "»"));
// português: erradas
["xablau", "restriçao", "conexao", "algorítmo", "portugues", "errro", "florianópolis", "tambem", "voce"]
  .forEach((w) => check(!pt.check(w), "pt deveria rejeitar «" + w + "»"));
// inglês
["hello", "color", "spelling", "don't", "Don't", "running", "unhappiness", "reread", "Lessons"].forEach((w) => check(en.check(w), "en deveria aceitar «" + w + "»"));
["teh", "colour", "recieve", "definately", "seperate"].forEach((w) => check(!en.check(w), "en deveria rejeitar «" + w + "»"));
// sugestões
const has = (d, w, s) => d.suggest(w, 6).indexOf(s) >= 0;
check(has(pt, "restriçao", "restrição"), "sugere restrição");
check(has(pt, "conexao", "conexão"), "sugere conexão");
check(has(pt, "tambem", "também"), "sugere também");
check(has(pt, "voce", "você"), "sugere você");
check(has(pt, "aprendisado", "aprendizado"), "sugere aprendizado");
check(has(pt, "portugues", "português"), "sugere português");
check(pt.suggest("Restriçao")[0] === "Restrição", "mantém a maiúscula inicial: " + pt.suggest("Restriçao")[0]);
check(has(en, "recieve", "receive") && has(en, "seperate", "separate") && has(en, "definately", "definitely"), "sugestões em inglês");
check(pt.suggest("errro").every((s) => !/[-']/.test(s)), "sem sugestões com hífen ou apóstrofo inventado");
// dicionário pessoal
pt.addWord("ClassAtelier"); pt.addWord("moodle");
check(pt.check("ClassAtelier") && !pt.check("classatelier"), "sigla/CamelCase só vale como foi escrita");
check(pt.check("moodle") && pt.check("Moodle"), "palavra comum do usuário vale com maiúscula");
pt.removeWord("moodle"); check(!pt.check("moodle"), "remover do dicionário pessoal");
// separação do texto
const toks = (s) => M.tokenize(s).map((t) => t.word);
check(JSON.stringify(toks("Olá, mundo! IFSC 2026 x2 ação")) === JSON.stringify(["Olá", "mundo", "ação"]), "tokens: " + toks("Olá, mundo! IFSC 2026 x2 ação"));
check(toks("veja http://exemplo.com/abc e a@b.com").join() === "veja", "URLs e e-mails ignorados: " + toks("veja http://exemplo.com/abc e a@b.com"));
check(toks("ClassAtelier iPhone CPUs").length === 0, "CamelCase ignorado");
check(toks("guarda-chuva d'água").join() === "guarda-chuva,d'água", "hífen e apóstrofo ficam na palavra");
// texto corrido: poucos falsos positivos
const txt = "Os fundamentos de radar aplicados à oceanografia por satélites permitem medir a altura das ondas, o vento e a salinidade. Neste tópico, o professor apresenta equações, gráficos e atividades avaliativas, além de metodologia ativa, plataforma, interatividade, acessibilidade, síntese, referências, glossário, fórum, questionário, estudantes, aprendizagem, também, através, porém, às, àquele, aquilo, quê, você, vocês, seguintes, últimos, informações, conteúdos, objetivos, competências, avaliação, diagnóstica, formativa, somativa, autoavaliação, multidisciplinar, desenvolvimento, implementação, projeção, junção, cartesiano, seleção, álgebra, tupla, atributo, relação";
const bad = toks(txt).filter((w) => !pt.check(w));
check(bad.length === 0, "texto acadêmico sem falsos positivos: " + bad.join(", "));
console.log(fail ? fail + " falha(s), " + ok + " ok" : "todas as " + ok + " verificações do corretor passaram");
process.exit(fail ? 1 : 0);
