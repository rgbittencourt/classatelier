// Testes da importação do Moodle (importar.js): HTML colado e backup .mbz.
// Rodar:  NODE_PATH=/tmp/kx/node_modules node tests/importar.test.js
const assert = require("assert");
const { JSDOM } = require("jsdom");
const JSZip = require("jszip");
const win = new JSDOM("<!doctype html><body></body>").window;
globalThis.DOMParser = win.DOMParser;
globalThis.document = win.document;
const I = require("../importar.js");

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const types = (r) => r.children.map((b) => b.type);

// ── 1. Parágrafos, formatação e listas ──
let r = I.htmlParaBlocos('<p>Olá <strong>mundo</strong> e <em>você</em> <span style="color:red" class="x">cor</span>.</p><p>&nbsp;</p><ul><li>um</li><li>dois<ul><li>dois-a</li></ul></li></ul>');
eq(types(r), ["prose"]);
ok(r.children[0].props.body.includes("<strong>mundo</strong>"), "negrito");
ok(!/style|class/.test(r.children[0].props.body), "atributos removidos");
ok(r.children[0].props.body.includes("<ul><li>um</li><li>dois<ul><li>dois-a</li></ul></li></ul>"), "lista aninhada");
ok(!r.children[0].props.body.includes("<p></p>"), "parágrafo vazio sumiu");

// ── 2. Títulos ──
r = I.htmlParaBlocos("<h1>Aula 1</h1><p>a</p><h3>Sub</h3><p>b</p>");
eq(types(r), ["titulo", "prose", "titulo", "prose"]);
eq([r.children[0].props.level, r.children[2].props.level], ["h2", "h3"]);
r = I.htmlParaBlocos("<h2>R &amp; D</h2>");
eq(r.children[0].props.text, "R &amp; D", "título guarda HTML escapado");

// ── 3. Segurança ──
r = I.htmlParaBlocos('<p onclick="x()">oi<script>alert(1)</script><a href="javascript:alert(1)">mau</a> <a href="https://ok.com/a?b=1&c=2" target="_blank" onclick="x">bom</a></p><style>p{}</style>');
const b = r.children[0].props.body;
ok(!/script|onclick|javascript:|alert|style/i.test(b), "sem script/onclick/javascript: " + b);
ok(b.includes('<a href="https://ok.com/a?b=1&amp;c=2">bom</a>'), "link seguro mantido: " + b);

// ── 4. Imagens: importada, referenciada, reenviar ──
r = I.htmlParaBlocos('<p><img src="data:image/png;base64,AAAA" alt="Foto A"></p><img src="https://site.com/x.png" alt="X"><img src="@@PLUGINFILE@@/figura 1.png" alt="F"><img src="https://moodle.x/pluginfile.php/12/mod_page/content/1/f.jpg" alt="G"><figure><img src="data:image/png;base64,BBBB" alt="B"><figcaption>Figura 2. Legenda</figcaption></figure>');
eq(types(r), ["imagem", "imagem", "imagem", "imagem", "imagem"]);
eq(r.children[0].props.src, "data:image/png;base64,AAAA");
eq([r.children[0].props.alt, r.children[0].props.caption], ["Foto A", ""], "alt e legenda separados");
eq(r.children.map((c) => c._imp.img), ["importada", "referenciada", "reenviar", "reenviar", "importada"]);
eq(r.children[1].props.src, "https://site.com/x.png");
eq(r.children[2].props.src, "", "imagem do Moodle fica vazia");
eq(r.children[2].props.origemArquivo, "figura 1.png", "guarda a referência ao arquivo");
eq(r.children[3].props.origemArquivo, "https://moodle.x/pluginfile.php/12/mod_page/content/1/f.jpg");
eq(r.children[4].props.caption, "Figura 2. Legenda");
eq(r.children[2]._imp.status, "pendente");
eq(r.children[1]._imp.status, "ok");
ok(r.warnings.filter((w) => /vinculada ao curso de origem/.test(w)).length === 2, "dois avisos de imagem do Moodle: " + JSON.stringify(r.warnings));
ok(r.warnings.some((w) => /figura 1\.png/.test(w)), "aviso com o nome do arquivo");
ok(r.notes.some((w) => /só referenciada/.test(w)), "imagem referenciada vai nos ajustes");
r = I.htmlParaBlocos('<img src="data:image/png;base64,AA">');
ok(r.warnings.some((w) => /sem texto alternativo nem legenda/.test(w)), "aviso de imagem sem descrição");
r = I.htmlParaBlocos('<img class="icon" src="/x.gif" width="16" height="16"><img class="emoticon" src="/s.gif">');
eq(r.children.length, 0, "ícones e emoticons ignorados");

// ── 5. Texto + imagem no mesmo parágrafo ──
r = I.htmlParaBlocos('<p>Antes <img src="data:image/png;base64,CC"> depois</p>');
eq(types(r), ["prose", "imagem", "prose"]);

// ── 6. Vídeos e incorporados ──
r = I.htmlParaBlocos('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=30" title="Aula"></iframe><p><a href="https://youtu.be/abcdefghijk">https://youtu.be/abcdefghijk</a></p><iframe src="https://player.vimeo.com/video/123" width="640" height="360"></iframe><iframe src="https://moodle.x/h5p/embed.php?url=1" title="Quiz H5P"></iframe><video src="@@PLUGINFILE@@/aula.mp4"></video><audio src="https://x.com/a.mp3"></audio>');
eq(types(r), ["video", "video", "externalembed", "prose", "audio"]);
eq([r.children[0].props.id, r.children[0].props.start, r.children[1].props.id], ["dQw4w9WgXcQ", "30", "abcdefghijk"]);
ok(/^<iframe src="https:\/\/player\.vimeo\.com\/video\/123"/.test(r.children[2].props.embed), "embed vimeo");
eq(r.children[2].props.height, 360);
ok(r.children[3].props.body.includes('<a href="https://moodle.x/h5p/embed.php?url=1">Quiz H5P</a>'), "H5P com endereço vira link");
ok(r.warnings.some((w) => /interação importada como link/.test(w)), "aviso: interação como link");
ok(r.warnings.some((w) => /vídeo do Moodle não importado/.test(w) && /aula\.mp4/.test(w)), "vídeo sem endereço: aviso solto " + JSON.stringify(r.warnings));
r = I.htmlParaBlocos('<video src="https://moodle.x/pluginfile.php/9/mod_page/content/aula.mp4"></video><iframe src="/h5p/embed.php?url=2" title="H5P relativo"></iframe>', { baseUrl: "https://moodle.x/mod/page/view.php?id=5" });
eq(types(r), ["prose", "prose"], "com a URL de origem os dois viram link");
ok(r.children[0].props.body.includes('href="https://moodle.x/pluginfile.php/9/mod_page/content/aula.mp4"'), "vídeo do curso vira link: " + r.children[0].props.body);
ok(r.children[1].props.body.includes('href="https://moodle.x/h5p/embed.php?url=2"'), "H5P relativo resolvido pela URL de origem");
r = I.htmlParaBlocos('<iframe src="/h5p/embed.php?url=2" title="H5P relativo"></iframe>');
eq(r.children.length, 0);
ok(r.warnings.some((w) => /H5P não importado/.test(w) && /informe a URL original/.test(w)), "sem URL: pede a URL de origem");

// ── 7. Tabela ──
r = I.htmlParaBlocos("<table><caption>Tab 1</caption><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td><b>2</b></td></tr><tr><td>3</td></tr></tbody></table>");
eq(types(r), ["tabela"]);
eq(r.children[0].props.headers, ["A", "B"]);
eq(r.children[0].props.rows, [["1", "<strong>2</strong>"], ["3", ""]]);
eq(r.children[0].props.caption, "Tab 1");
r = I.htmlParaBlocos("<table><tr><td>x</td><td>y</td></tr><tr><td>1</td><td>2</td></tr></table>");
eq(r.children[0].props.headers, ["x", "y"], "sem cabeçalho: primeira linha");
ok(r.notes.some((x) => /sem cabeçalho/.test(x)));

// ── 8. Citação, código, destaque/atenção, accordion ──
r = I.htmlParaBlocos("<blockquote><p>Frase <b>boa</b>.</p><footer>Autor X</footer></blockquote><pre><code class=\"language-python\">print(1)\n</code></pre><div class=\"alert alert-warning\"><strong>Cuidado</strong><p>Não faça.</p></div><div class=\"alert alert-info\"><p>Dica útil</p></div>");
eq(types(r), ["citacao", "codigo", "atencao", "destaque"]);
eq([r.children[0].props.quote, r.children[0].props.author], ["Frase boa.", "Autor X"]);
eq([r.children[1].props.language, r.children[1].props.code], ["python", "print(1)"]);
ok(r.children[2].props.body.includes("Não faça."), "corpo do alerta");
eq(r.children[3].props.title, "Veja bem");
r = I.htmlParaBlocos("<details><summary>P1?</summary><p>R1</p></details><details><summary>P2?</summary><p>R2</p></details><p>fim</p>");
eq(types(r), ["accordion", "prose"]);
eq(r.children[0].props.items.length, 2);
ok(r.children[0].props.items[1].body.includes("R2"));

// ── 9. Fórmulas ──
r = I.htmlParaBlocos("<p>Seja \\(x_i + 1\\) o valor.</p><p>\\[ \\sigma = 2 \\]</p><p>$$a+b$$</p>", { chip: (l) => "[[" + l + "]]" });
eq(types(r), ["prose", "equacao", "equacao"]);
ok(r.children[0].props.body.includes("[[x_i + 1]]"), "fórmula na linha");
eq([r.children[1].props.latex, r.children[2].props.latex], ["\\sigma = 2", "a+b"]);

// ── 10. Estrutura em tópicos ──
r = I.htmlParaBlocos("<p>intro</p><h2>Parte 1</h2><p>a</p><h3>Sub</h3><p>b</p><h2>Parte 2</h2><p>c</p>");
let aula = I.montarAula({ title: "Minha aula", eyebrow: "Curso", sections: [{ name: "", items: [{ title: "", addTitle: false, children: r.children }] }] }, { hero: true, baseMeta: { author: "" } });
eq(aula.blocks.map((x) => x.type), ["hero", "topic", "topic", "topic"]);
eq(aula.blocks[0].props.title, "Minha aula");
eq(aula.blocks[1].props.children.map((x) => x.type), ["prose"]);
eq(aula.blocks[2].props.children.map((x) => x.type), ["titulo", "prose", "titulo", "prose"]);
eq(aula.meta.title, "Minha aula");
aula = I.montarAula({ title: "T", sections: [{ name: "Semana 1", items: [{ title: "Pág A", addTitle: true, children: I.htmlParaBlocos("<p>x</p>").children }] }, { name: "Semana 2", items: [{ title: "Pág B", addTitle: true, children: I.htmlParaBlocos("<p>y</p>").children }] }] }, { hero: false });
eq(aula.blocks.map((x) => x.type), ["divider", "topic", "divider", "topic"], "divisores só com 2+ seções");
eq(aula.blocks[1].props.children[0].props.text, "Pág A");

// ── 11. Colar HTML (modelo) ──
let m = I.htmlParaModelo("<h1>Fundamentos</h1><p>texto</p>");
eq(m.model.title, "Fundamentos");

// ── 11b. Texto simples (sem HTML) ──
m = I.htmlParaModelo("Primeiro parágrafo\ncom segunda linha.\n\n- item um\n- item dois\n\n1. passo\n2. outro passo\n\nÚltimo & <fim>");
eq(m.plain, true, "detecta texto simples");
eq(m.model.fonte, "texto");
let kidsP = m.model.sections[0].items[0].children;
eq(kidsP.map((c) => c.type), ["prose"]);
const bp = kidsP[0].props.body;
ok(bp.includes("<p>Primeiro parágrafo<br>com segunda linha.</p>"), "parágrafo com quebra: " + bp);
ok(bp.includes("<ul><li>item um</li><li>item dois</li></ul>") && bp.includes("<ol><li>passo</li><li>outro passo</li></ol>"), "listas");
ok(bp.includes("Último &amp; &lt;fim&gt;"), "escapa o texto: " + bp);
eq(I.htmlParaModelo("<p>x</p>").plain, false, "HTML não é texto simples");

// ── 11c. URL de origem: links relativos e links do curso ──
r = I.htmlParaBlocos('<p><a href="/mod/page/view.php?id=7">Outra página</a> <a href="../x/y.html">rel</a> <a href="https://www.inpe.br">INPE</a> <a href="#sec2">ir</a></p>', { baseUrl: "https://moodle.ifsc.edu.br/mod/page/view.php?id=3" });
const lb = r.children[0].props.body;
ok(lb.includes('href="https://moodle.ifsc.edu.br/mod/page/view.php?id=7"'), "link relativo resolvido: " + lb);
ok(lb.includes('href="https://moodle.ifsc.edu.br/mod/x/y.html"'), "../ resolvido a partir da página de origem: " + lb);
ok(!lb.includes("#sec2"), "âncora interna vira texto");
ok(r.warnings.some((w) => /link do curso de origem/.test(w) && /Outra página/.test(w)), "aviso de link do curso: " + JSON.stringify(r.warnings));
ok(!r.warnings.some((w) => /INPE/.test(w)), "link externo não gera aviso");
ok(r.notes.some((w) => /link interno para uma seção virou texto/.test(w)), "âncora interna nos ajustes");
r = I.htmlParaBlocos('<p><a href="/mod/page/view.php?id=7">Outra página</a> <a href="https://m.x/pluginfile.php/1/mod_resource/content/1/aula.pdf">aula.pdf</a></p>');
ok(!r.children[0].props.body.includes("href=\"/mod"), "sem URL de origem o relativo não fica no HTML");
ok(r.warnings.some((w) => /sem endereço completo/.test(w) && /informe a URL original/.test(w)), "pede a URL de origem");
ok(r.children[0].props.body.includes('href="https://m.x/pluginfile.php/1/mod_resource/content/1/aula.pdf"'), "anexo com endereço completo mantém título e URL");
ok(r.warnings.some((w) => /anexo do curso de origem/.test(w)), "aviso de anexo");

// ── 11d. Tabelas com células mescladas ──
r = I.htmlParaBlocos('<table><tr><th colspan="2">Cabeça</th><th>C</th></tr><tr><td rowspan="2">A</td><td>B</td><td>C1</td></tr><tr><td>B2</td><td>C2</td></tr></table>');
eq(r.children[0].props.headers, ["Cabeça", "", "C"]);
eq(r.children[0].props.rows, [["A", "B", "C1"], ["", "B2", "C2"]], "rowspan ocupa a coluna da linha seguinte");
eq(r.children[0]._imp.status, "revisar");
ok(r.warnings.some((w) => /células mescladas requer revisão/.test(w)), "aviso de mescladas");
r = I.htmlParaBlocos("<table><tr><th>A</th></tr><tr><td>1</td></tr></table>");
ok(!r.warnings.some((w) => /mescladas/.test(w)), "tabela simples sem aviso");

// ── 11e. Fórmulas que vieram como imagem ──
r = I.htmlParaBlocos('<p><img class="texrender" src="https://m.x/filter/tex/pix.php/ab.gif" alt="\\frac{a}{b}"></p><p>Vale <img class="texrender" src="https://m.x/filter/tex/pix.php/cd.gif" alt="x^2"> aqui.</p><p><img class="texrender" src="https://m.x/filter/tex/pix.php/ef.gif" alt="figura"></p>', { chip: (l) => "[[" + l + "]]" });
eq(types(r), ["equacao", "prose", "imagem"]);
eq(r.children[0].props.latex, "\\frac{a}{b}");
ok(r.children[1].props.body.includes("[[x^2]]"), "fórmula-imagem dentro do texto vira fórmula na linha");
eq(r.children[2].props.src, "https://m.x/filter/tex/pix.php/ef.gif", "fórmula como imagem sem código: a imagem é preservada");
eq(r.children[2]._imp.img, "referenciada");
ok(r.warnings.some((w) => /fórmula como imagem sem código/.test(w)), "aviso de fórmula sem código");
ok(r.notes.some((w) => /virou equação editável/.test(w)), "ajuste informado");

// ── 11f. Elementos retráteis do Bootstrap e abas ──
r = I.htmlParaBlocos('<div class="card"><div class="card-header"><a data-toggle="collapse">Pergunta A</a></div><div class="collapse"><div class="card-body"><p>Resposta A</p></div></div></div><div class="card"><div class="card-header">Pergunta B</div><div class="card-body"><p>Resposta B</p><img src="data:image/png;base64,AA"></div></div>');
eq(types(r), ["accordion"]);
eq(r.children[0].props.items.map((i) => i.title), ["Pergunta A", "Pergunta B"]);
ok(r.children[0].props.items[1].body.includes("Resposta B"));
ok(r.warnings.some((w) => /item recolhível que não é texto \(imagem\)/.test(w)), "imagem dentro de item recolhível: aviso " + JSON.stringify(r.warnings));
r = I.htmlParaBlocos('<div class="nav-nav-tabs tab-content nav-tabs"><p>Aba 1</p></div>');
ok(r.warnings.some((w) => /abas ou carrossel/.test(w)), "interação por abas: texto + aviso");

// ── 11g. Avisos presos ao bloco e ao lugar de origem ──
r = I.htmlParaBlocos('<h2>Ondas</h2><p>a</p><img src="@@PLUGINFILE@@/a.png" alt="A"><h2>Radar</h2><table><tr><td colspan="2">x</td></tr></table>');
const tIm = r.children.find((c) => c.type === "imagem"), tTab = r.children.find((c) => c.type === "tabela");
eq(tIm._imp.notes[0].where, "em «Ondas»");
eq(tTab._imp.notes.find((n) => /mescladas/.test(n.msg)).where, "em «Radar»");
ok(r.warnings.some((w) => /a\.png/.test(w) && /— em «Ondas»$/.test(w)), "localização no aviso: " + JSON.stringify(r.warnings));

// ── 11h. Seleção, avisos recalculados, resumo e montagem ──
m = I.htmlParaModelo('<h2>Ondas</h2><p>a</p><img src="@@PLUGINFILE@@/a.png" alt="A"><h2>Radar</h2><p>b</p>');
const kk = m.model.sections[0].items[0].children, imgBlk = kk.find((c) => c.type === "imagem");
eq(I.contar(m.model), { titulo: 2, prose: 2, imagem: 1 });
ok(I.avisos(m.model).warnings.length >= 1, "há aviso da imagem");
const excl = { [imgBlk.id]: true };
eq(I.avisos(m.model, excl).warnings, [], "desmarcar a imagem tira o aviso");
eq(I.contar(m.model, excl), { titulo: 2, prose: 2 });
eq(I.filtrar(m.model, excl).sections[0].items[0].children.map((c) => c.type), ["titulo", "prose", "titulo", "prose"]);
eq(kk.length, 5, "o modelo original não foi alterado");
eq(I.resumo(imgBlk), { tipo: "Imagem", texto: "A" }, "resumo da imagem usa legenda, texto alternativo ou nome do arquivo");
eq(I.resumo(kk[0]), { tipo: "Título", texto: "Ondas" });
let mont = I.montarAula(I.filtrar(m.model, excl), { hero: false, baseMeta: {} });
ok(JSON.stringify(mont).indexOf("_imp") < 0, "a aula montada não leva _imp");
m = I.htmlParaModelo("<p>x</p>", { baseUrl: "https://moodle.x/mod/page/view.php?id=3" });
mont = I.montarAula(m.model, { hero: true, baseMeta: {} });
eq([mont.meta.importedFrom.tipo, mont.meta.importedFrom.url], ["moodle", "https://moodle.x/mod/page/view.php?id=3"], "origem registrada");
ok(!!mont.meta.importedFrom.em);
eq(I.montarAula(I.htmlParaModelo("<p>x</p>").model, { hero: true, baseMeta: {} }).meta.importedFrom, undefined, "sem URL, sem origem");

// ── 12. Backup .mbz sintético ──
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const hash = "ab" + "c".repeat(38);
async function sample() {
  const z = new JSZip();
  z.file("moodle_backup.xml", `<?xml version="1.0"?><moodle_backup><information><original_course_fullname>Radar 101</original_course_fullname><type>course</type></information><contents>
<activities>
<activity><moduleid>11</moduleid><sectionid>5</sectionid><modulename>page</modulename><title>Fundamentos</title><directory>activities/page_11</directory></activity>
<activity><moduleid>12</moduleid><sectionid>5</sectionid><modulename>label</modulename><title>Texto solto</title><directory>activities/label_12</directory></activity>
<activity><moduleid>13</moduleid><sectionid>6</sectionid><modulename>book</modulename><title>Livro</title><directory>activities/book_13</directory></activity>
<activity><moduleid>14</moduleid><sectionid>6</sectionid><modulename>url</modulename><title>Link bom</title><directory>activities/url_14</directory></activity>
<activity><moduleid>15</moduleid><sectionid>6</sectionid><modulename>forum</modulename><title>Fórum</title><directory>activities/forum_15</directory></activity>
<activity><moduleid>16</moduleid><sectionid>6</sectionid><modulename>resource</modulename><title>Figura solta</title><directory>activities/resource_16</directory></activity>
</activities>
<sections><section><sectionid>5</sectionid><title>1</title><directory>sections/section_5</directory></section><section><sectionid>6</sectionid><title>2</title><directory>sections/section_6</directory></section></sections></contents></moodle_backup>`);
  z.file("sections/section_5/section.xml", `<section id="5"><number>1</number><name>Semana 1</name><summary>&lt;p&gt;Resumo da semana&lt;/p&gt;</summary><sequence>11,12</sequence></section>`);
  z.file("sections/section_6/section.xml", `<section id="6"><number>2</number><name>Semana 2</name><summary></summary><sequence>13,14,15,16</sequence></section>`);
  z.file("activities/page_11/page.xml", `<activity id="11" modulename="page"><page id="1"><name>Fundamentos</name><intro></intro><introformat>1</introformat><content>&lt;h2&gt;Ondas&lt;/h2&gt;&lt;p&gt;Veja &lt;img src="@@PLUGINFILE@@/onda%20um.png" alt="Onda"&gt; e \\(\\lambda\\).&lt;/p&gt;&lt;img src="@@PLUGINFILE@@/faltando.png"&gt;</content><contentformat>1</contentformat></page></activity>`);
  z.file("activities/page_11/inforef.xml", `<inforef><fileref><file><id>100</id></file></fileref></inforef>`);
  z.file("activities/label_12/label.xml", `<activity id="12" modulename="label"><label id="1"><name>Texto</name><intro>&lt;p&gt;Rótulo com &lt;b&gt;ênfase&lt;/b&gt;&lt;/p&gt;</intro><introformat>1</introformat></label></activity>`);
  z.file("activities/book_13/book.xml", `<activity id="13" modulename="book"><book id="1"><name>Livro</name><intro></intro><introformat>1</introformat><chapters><chapter id="2"><pagenum>2</pagenum><subchapter>0</subchapter><title>Cap 2</title><content>&lt;p&gt;dois&lt;/p&gt;</content><contentformat>1</contentformat></chapter><chapter id="1"><pagenum>1</pagenum><subchapter>0</subchapter><title>Cap 1</title><content>&lt;p&gt;um&lt;/p&gt;</content><contentformat>1</contentformat></chapter></chapters></book></activity>`);
  z.file("activities/url_14/url.xml", `<activity id="14" modulename="url"><url id="1"><name>Site do INPE</name><externalurl>https://www.inpe.br</externalurl></url></activity>`);
  z.file("activities/forum_15/forum.xml", `<activity id="15" modulename="forum"><forum id="1"><name>Fórum</name></forum></activity>`);
  z.file("activities/resource_16/resource.xml", `<activity id="16" modulename="resource"><resource id="1"><name>Figura solta</name></resource></activity>`);
  z.file("activities/resource_16/inforef.xml", `<inforef><fileref><file><id>101</id></file></fileref></inforef>`);
  z.file("files.xml", `<files>
<file id="100"><contenthash>${hash}</contenthash><contextid>1</contextid><component>mod_page</component><filearea>content</filearea><itemid>0</itemid><filepath>/</filepath><filename>onda um.png</filename><filesize>${PNG.length}</filesize><mimetype>image/png</mimetype></file>
<file id="101"><contenthash>${hash}</contenthash><contextid>2</contextid><component>mod_resource</component><filearea>content</filearea><itemid>0</itemid><filepath>/</filepath><filename>fig.png</filename><filesize>${PNG.length}</filesize><mimetype>image/png</mimetype></file>
<file id="102"><contenthash>da39a3ee</contenthash><contextid>2</contextid><component>mod_resource</component><filearea>content</filearea><itemid>0</itemid><filepath>/</filepath><filename>.</filename><filesize>0</filesize><mimetype>$@NULL@$</mimetype></file>
</files>`);
  z.file("files/ab/" + hash, PNG);
  return z.generateAsync({ type: "nodebuffer" });
}

(async () => {
  const buf = await sample();
  const bk = await I.lerBackup(buf, { JSZip, chip: (l) => "[[" + l + "]]" });
  eq(bk.kind, "course");
  eq(bk.title, "Radar 101");
  eq(bk.sections.map((s) => s.name), ["Semana 1", "Semana 2"]);
  eq(bk.sections[0].items.map((i) => i.title), ["Resumo da seção «Semana 1»", "Fundamentos", "Texto solto"], "ordem da sequência + resumo");
  eq(bk.sections[1].items.map((i) => [i.title, i.supported]), [["Livro", true], ["Link bom", true], ["Fórum", false], ["Figura solta", true]]);
  ok(/forum/.test(bk.sections[1].items[2].reason), "motivo do tipo não suportado");

  const res = await I.itensParaModelo(bk, null, { chip: (l) => "[[" + l + "]]" });
  const all = res.model.sections.flatMap((s) => s.items);
  eq(all.map((i) => i.title), ["Resumo da seção «Semana 1»", "Fundamentos", "Texto solto", "Livro", "Link bom", "Figura solta"]);
  const fund = all[1].children;
  eq(fund.map((c) => c.type), ["titulo", "prose", "imagem", "prose", "imagem"]);
  ok(/^data:image\/png;base64,/.test(fund[2].props.src), "imagem do backup virou data URL");
  eq([fund[2].props.alt, fund[2].props.caption], ["Onda", ""], "texto alternativo preservado");
  ok(fund[3].props.body.includes("[[\\lambda]]"), "fórmula do Moodle na linha");
  eq(fund[4].props.src, "", "imagem que faltou no backup");
  ok(res.warnings.some((w) => /^Fundamentos:/.test(w) && /faltando\.png/.test(w) && /reenvie/.test(w)), "aviso da imagem que faltou: " + JSON.stringify(res.warnings));
  // a imagem do <p> com texto: "Veja <img> e ..." → prose, imagem, prose; a prose "e [[λ]]." fica depois
  const book = all[3].children;
  eq(book.map((c) => c.type), ["titulo", "prose", "titulo", "prose"], "livro: um título por capítulo");
  eq([book[0].props.text, book[2].props.text], ["Cap 1", "Cap 2"], "capítulos ordenados por pagenum");
  eq(book[0].props.level, "h3");
  ok(all[4].children[0].props.body.includes('href="https://www.inpe.br"'), "url vira link");
  eq(all[5].children[0].type, "imagem", "resource de imagem");

  // só alguns itens
  const some = await I.itensParaModelo(bk, ["m12", "m14"], {});
  eq(some.model.sections.flatMap((s) => s.items).map((i) => i.title), ["Texto solto", "Link bom"]);

  // monta a aula toda
  const aula2 = I.montarAula(res.model, { hero: true, baseMeta: {} });
  eq(aula2.blocks[0].type, "hero");
  ok(aula2.blocks.some((b) => b.type === "divider"), "divisores de seção");
  ok(aula2.blocks.filter((b) => b.type === "topic").every((b) => Array.isArray(b.props.children) && b.props.children.length), "tópicos com filhos");
  const ids = new Set(); JSON.stringify(aula2, (k, v) => { if (k === "id") { ok(!ids.has(v), "id repetido " + v); ids.add(v); } return v; });

  // arquivo que não é backup
  const bad = new JSZip(); bad.file("x.txt", "oi");
  let err = null; try { await I.lerBackup(await bad.generateAsync({ type: "nodebuffer" }), { JSZip }); } catch (e) { err = e; }
  ok(err && /moodle_backup\.xml/.test(err.message), "mensagem para ZIP sem moodle_backup.xml");
  err = null; try { await I.lerBackup(Buffer.from("isto não é zip"), { JSZip }); } catch (e) { err = e; }
  ok(err && /não é um backup/.test(err.message), "mensagem para arquivo qualquer");

  console.log("importar: " + n + " verificações OK");
})().catch((e) => { console.error(e); process.exit(1); });
