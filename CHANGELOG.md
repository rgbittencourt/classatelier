# Histórico de versões

Este repositório tem o ClassAtelier. O ClassAcervo, que morava aqui na pasta `acervo/`, tem repositório próprio desde 29/10/2026 ([rgbittencourt/classacervo](https://github.com/rgbittencourt/classacervo)); o histórico dele está lá. Cada aplicativo tem a própria versão, em [Versionamento Semântico](https://semver.org/lang/pt-BR/) (MAIOR.MENOR.CORREÇÃO): **MAIOR** quebra o que já existia, **MENOR** traz recurso novo sem quebrar nada, **CORREÇÃO** é conserto sem recurso novo.

| Aplicativo | Versão atual | Onde o número aparece |
|---|---|---|
| ClassAtelier | **1.18.3** | canto da paleta de blocos (ao lado do nome) e `window.CLASSATELIER_VERSION`, definido em `boot.js` |
| ClassAcervo | **1.2.1** | repositório próprio: [`rgbittencourt/classacervo`](https://github.com/rgbittencourt/classacervo) |

Ao mudar a versão do ClassAtelier, altere os dois lugares e a data abaixo.

## ClassAtelier

### 1.18.3 · 12/11/2026 · Títulos longos na lista de endereços

- Em **Montar o curso** (depois de publicar) e em **Colocar no Moodle**, o título comprido de uma aula agora **quebra em várias linhas**, em vez de passar por cima do endereço e dos botões.

### 1.18.2 · 12/11/2026 · Publicar no GitHub: avisos mais claros

- O aviso «GitHub Pages: não consegui ligar (O token não tem permissão para isso… Contents…)» enganava: aparecia quando o token (de escopo fino) **não tem a permissão «Pages»**, mas os arquivos já tinham sido publicados. Agora o app diz exatamente isso, **testa se o site já responde** e orienta: ligar em Settings → Pages ou acrescentar «Pages: Read and write» ao token.
- «Publicado: 2 arquivo(s) enviado(s) de 57» passa a dizer «2 arquivo(s) novo(s) ou alterado(s) enviado(s); os outros 55 já estavam iguais no GitHub». O app só envia o que mudou.

### 1.18.1 · 12/11/2026 · Foto do autor no cabeçalho não distorce mais

- No bloco Cabeçalho da aula, a **foto do autor** em retrato (mais alta que larga) saía esticada, como um oval, e vazava do círculo. Agora o círculo tem tamanho fixo (44 px) e a foto, de qualquer proporção, é recortada para preenchê-lo, sem deformar. Vale no editor, na prévia e nas aulas exportadas (HTML, SCORM, site). Aulas já exportadas precisam ser exportadas de novo para receber a correção.

### 1.18.0 · 12/11/2026 · Imagens inseridas guardam o original e se ligam à figura sugerida

- Em **«Inserir imagem no cursor»**, quando a aula veio do ClassAuthor com imagens sugeridas (foto, Napkin, diagrama), aparece a lista **«Esta imagem é uma figura sugerida pelo ClassAuthor?»**. Ao escolher uma, o pedido para o ChatGPT (ou o texto para o Napkin) fica ali para copiar, e o **texto alternativo e a legenda já vêm preenchidos**.
- A imagem inserida fica ligada à figura (`slotId` `figure-<id>`). Quando a semana volta ao ClassAuthor, essa figura sai da lista «Imagens sugeridas desta semana» sozinha, e já não aparece mais nesta lista do editor.
- **Cópia do original em `imagens/`**: com a pasta do projeto ligada, o arquivo original é gravado com o nome da semana e da figura (`S2-fig-1-napkin.png`; imagem avulsa: `S2-imagem-20261112-104500.png`). Se a pasta fizer parte de um projeto do ClassAuthor, vai para a pasta `imagens/` do projeto. Sem pasta ou sem permissão, um aviso diz que a cópia **não** foi guardada.
- Imagens criadas com IA (SVG) também ganham cópia em `imagens/`.

### 1.17.8 · 04/11/2026 · Seletor de ícones com busca em português e inglês

- O seletor de ícones (blocos Destaque, Atenção, Reflexão, Eyebrow, Destaques com ícones, Cards e Slider) agora pesquisa nos **1.392 ícones gratuitos do Font Awesome 6.5** (antes, cerca de 85). A busca entende **português e inglês** («saúde», «gato», «prova», «dinheiro», «graph», «wrench»…), ignora acentos e plural, aceita mais de uma palavra, mostra os mais parecidos primeiro e traz 48 por vez com «Mostrar mais». Sem resultado, o botão «Usar «nome» como nome do ícone» grava o que foi digitado.
- Novo arquivo `icones.js` (catálogo e termos de busca), gerado por `_build/mk_icones.py` a partir dos metadados oficiais do Font Awesome e de um dicionário em português.
- Referências: autor-entidade em minúsculas («gartner.») vai para MAIÚSCULAS com o título em negrito (motor da ClassAuthor 1.15.8).
- Manual Class com as capturas de tela refeitas.

### 1.17.7 · 04/11/2026 · Manual Class: Ficha do ClassAuthor com o botão «Organizar lista»

- Só o Manual Class mudou: descreve que o ClassAuthor também corrige as referências da Ficha da disciplina apenas pelo botão. O ClassAtelier em si não mudou.

### 1.17.6 · 04/11/2026 · Referências: só o botão corrige, conforme a NBR 6023:2025

- **Nada muda sozinho**: a correção e a ordenação só acontecem quando você clica em **«Organizar lista (corrigir e ordenar)»**. Colar, digitar ou adicionar uma referência não altera nada; o botão corrige tudo de uma vez e a lista «A conferir» mostra só o que não dá para resolver por falta de informação.
- O motor segue a **ABNT NBR 6023:2025**: endereço sem « < > »; obra sem autor entra pelo título (primeira palavra em maiúsculas, sem negrito); lei com a data no negrito; matéria de portal ou jornal com o negrito no nome do veículo; «[ano]» no lugar do antigo «[s. d.]» e «[S. l.: s. n.]» quando faltam local e editora.

### 1.17.5 · 04/11/2026 · Referências: título sempre em negrito

- O **título sai sempre em negrito**: a mensagem «falta o destaque (negrito) no título» deixou de existir. Com autor, o título é o trecho logo depois dele; sem autor, a obra entra pelo título (negrito e primeira palavra em maiúsculas).
- O que não existe ganha marcador no lugar certo, com a tipografia certa: **«[título]»** em negrito, «[ano]», «Acesso em: [dia mês ano].». Um endereço colado sozinho vira «**[TÍTULO]**, [ano]. Disponível em: <endereço>. Acesso em: [dia mês ano].».

### 1.17.4 · 04/11/2026 · Referências: sem editora, entidade como autor e o que falta à vista

- **Autor entidade** («Gartner.», «Google Cloud.») vai em MAIÚSCULAS; o negrito volta só ao título mesmo em referências **sem editora** («Autor. Título, ano.»), com **ano colado ao título**, com **aspas** no título (reportagem, o jornal fica em negrito) e com **data por extenso** («2 de fevereiro de 2025» vira «2 fev. 2025»; a data de leis fica por extenso).
- O que a norma pede e não dá para deduzir **aparece na própria referência, no lugar certo**: «[ano]» e «Acesso em: [dia mês ano].». A conferência lista o que trocar.

### 1.17.3 · 04/11/2026 · Referências: desfaz negrito fora do título e arruma digitação

- Negrito na **referência inteira**, no autor, na editora ou em vários trechos é desfeito e o negrito volta só ao título.
- Arruma **espaços e pontuação**, **caixa** (minúsculas, nome em MAIÚSCULAS, título todo em maiúsculas) e a forma **Autor (ano)**.

### 1.17.2 · 04/11/2026 · Referências: casos que a correção automática deixava passar

- A correção automática agora também atua em **referência com link** (o texto é corrigido e o link continua no lugar), em **autor entidade com órgão e documento online sem editora** (BRASIL. Ministério da Educação. **Título**. Brasília, 2018.) e em **editora com ponto antes do ano** («Campinas: Papirus. 2000» vira «Campinas: Papirus, 2000.»).
- **Obra sem autor** (Título. Local: Editora, ano.) entra pelo título: negrito e primeira palavra em maiúsculas.
- O **Manual Class** passa a citar o ClassAuthor 1.15.2.

### 1.17.1 · 04/11/2026 · Manual Class: capa atualizada

- A capa do **Manual Class** mostrava as versões da primeira edição, a data de 30/10/2026 e 105 capturas. Agora traz as versões atuais dos três aplicativos, a data e as 115 capturas de tela. O ClassAtelier em si não mudou.

### 1.17.0 · 04/11/2026 · Referências: correção automática do que a norma resolve sem dúvida

- O quadro ABNT do bloco Referências **corrige sozinho**, ao sair do campo ou ao abrir o bloco, sem apertar botão: acha o **título e põe o negrito** (livro, revista do artigo, obra de um capítulo, «Lei nº» de leis e normas), põe o **autor em «SOBRENOME, Nome»** quando o resto da referência confirma a estrutura («Paulo Freire.», «Silva, Ana.», «Ana Souza e Bia Lima.»), e segue com 4+ autores, *et al.*, «(Org.)», edição, `< >` na URL e data de acesso.
- **A conferir** passa a mostrar só o que sobrou depois da correção: falta informação que não dá para deduzir (ano, autor, «Acesso em») ou a referência não tem estrutura clara, e o app não adivinha.
- A prévia, o HTML exportado e o texto da aula já saem com as referências corrigidas e em ordem alfabética, mesmo em aulas que você nunca abriu no painel.
- Mesmo motor do ClassAuthor 1.15.0.

### 1.16.0 · 04/11/2026 · Referências na ABNT NBR 6023

- **Quadro «ABNT NBR 6023: organizar e conferir»** no painel do bloco Referências. **Organizar lista** corrige o que a norma decide sem dúvida e põe a lista em ordem alfabética: 4 ou mais autores viram o primeiro com *et al.* (sem itálico), o negrito sai do subtítulo, «(org.)» vira «(Org.)», «2ª ed.» vira «2. ed.», a 1ª edição deixa de ser indicada, a URL fica entre `< >` e a data de acesso segue «5 mar. 2026» (maio por extenso). **A conferir** mostra, por referência, o que falta ou destoa (forma, não verdade da obra).
- **Montar uma referência por campos** (livro, capítulo, artigo de periódico, site ou documento digital): o motor escreve o texto pelos modelos da norma. «Paulo Freire» vira «FREIRE, Paulo», instituição em maiúsculas, até 3 autores separados por «; », e faltando local, editora ou ano entram [S. l.], [s. n.] e [s. d.]. DOI vira URL e a data de acesso padrão é hoje.
- **Na aula** (prévia, HTML, SCORM, pacote e PDF) as referências saem sempre em **ordem alfabética**, alinhadas à esquerda, **sem recuo deslocado nem marcadores** e com uma linha em branco entre elas; o espaçamento dentro de cada uma é simples. O texto da aula (Copiar texto) também sai assim, sem «- ».
- O motor é o `abnt.js`, cópia do que o ClassAuthor 1.14.0 usa: os dois apps seguem as mesmas regras.

### 1.15.1 · 04/11/2026 · Um só quadro de acesso ao ClassAuthor

- O painel do bloco Vídeo pedia o código de acesso (e a chave de IA) em dois lugares, na busca de legendas e no resumo com IA. Agora há **um só quadro, «Acesso ao ClassAuthor»**, no começo dos recursos do vídeo: código, chave de IA própria, «Lembrar o código neste navegador» e endereço. Ele abre sozinho enquanto está vazio e fica recolhido, com ✓, depois de preenchido.
- O que se digita vale para **tudo que usa o ClassAuthor**: buscar legendas, resumo com IA e figuras com IA (a janela «Inserir imagem → Criar com IA» lê os mesmos dados). Quem trocar de professor só precisa preencher uma vez.
- A chave de IA continua só na sessão da aba; o código só é lembrado se a caixa estiver marcada. Sem mudança no que vai ao servidor.

### 1.15.0 · 04/11/2026 · Escolher o que aparece junto do vídeo

- No painel do bloco **Vídeo**, o grupo **O que aparece na aula, junto do vídeo** tem três interruptores: **Faixa de legenda** (letras amarelas sob o vídeo), **Resumo do vídeo** e **Transcrição**. Todos vêm ligados. Desligar esconde da aula (HTML, SCORM, pacote e PDF), mas **guarda o conteúdo** no painel, para ligar de novo quando quiser.
- Desligando a **Transcrição**, o verificador de acessibilidade deixa de contá-la como alternativa ao vídeo (e avisa de novo, se o vídeo também não tiver legendas conferidas). O campo e o arquivo de legenda continuam guardados.
- Quando só a faixa e a transcrição estão desligadas, a página não carrega o controle do player do YouTube à toa; o vídeo se comporta como o de antes.
- O aviso **«Vídeo sem título descritivo»** do verificador de acessibilidade agora também aceita o campo **Legenda** como nome do vídeo: só avisa quando o título sobre o vídeo **e** a Legenda estão vazios ou genéricos («Vídeo», «Legenda do vídeo.»). Na aula, o leitor de tela anuncia o título e, se ele for genérico, a Legenda.
- Aulas já feitas continuam iguais: sem nenhuma chave ainda gravada, os três aparecem como antes.

### 1.14.0 · 04/11/2026 · Resumo do vídeo (tópicos com tempo)

- No painel do bloco **Vídeo** há **Resumo do vídeo (tópicos com tempo)**. Na aula ele aparece abaixo do vídeo, aberto, **antes da Transcrição**: títulos, tópicos curtos e, em cada tópico, o tempo (ex.: 5:48). **Clicar no tempo leva o vídeo àquele trecho** (se o vídeo ainda não começou, começa dali) e o tópico em andamento fica destacado enquanto o vídeo toca. No PDF o resumo sai aberto, com os tempos em texto.
- **Colar o resumo**: formato Markdown simples (`# Seção`, `## Subseção`, `- [5:48] tópico`). Entende o resumo copiado do Video Highlight (tempo no fim, como `[5:48](link)`), tempos entre colchetes ou parênteses no começo, negrito e links. Linha sem tempo vira tópico comum. O campo mostra quantos tópicos têm tempo.
- **Gerar resumo com IA**: usa as falas do arquivo de legenda (com tempos) ou, sem ele, o texto da Transcrição (sem tempos). Passa pelo ClassAuthor 1.13.0 ou mais novo, com o código de acesso ou a chave de IA própria; tem custo, e o painel avisa para conferir texto e tempos, porque a IA pode errar. O resumo gerado vira texto no mesmo campo, então dá para corrigir à mão. Pede confirmação antes de substituir um resumo existente.
- Na aula exportada o resumo funciona igual (HTML, SCORM, pacote): a sincronia e o clique no tempo usam o mesmo controle do player do YouTube da legenda sincronizada.
- Aulas já feitas continuam iguais: sem resumo, nada muda.

### 1.13.0 · 04/11/2026 · Legenda sincronizada no bloco Vídeo

- No painel do bloco **Vídeo** há **Legenda sincronizada (arquivo .srt ou .vtt)**: o professor escolhe o arquivo de legenda do vídeo e a fala aparece **sob o vídeo, em letras amarelas sobre fundo escuro** (como legenda de cinema), acompanhando o que está sendo dito. Não mexe no player do YouTube.
- Abaixo fica a **Transcrição** recolhida: ao abrir, o aluno vê todas as falas com o tempo de cada uma, a fala atual destacada e a lista rolando sozinha; **clicar numa fala leva o vídeo àquele ponto** (se o vídeo ainda não começou, ele começa dali).
- O texto do arquivo também vai para o campo **Transcrição** (em parágrafos), que continua sendo o que sai no PDF, o que o leitor de tela lê e o que conta no verificador de acessibilidade. A faixa em si é escondida do leitor de tela (para não anunciar cada frase) e do PDF.
- Aceita as legendas automáticas do YouTube, que trazem falas sobrepostas e algumas com tempo fora de ordem; essas últimas são reposicionadas entre as vizinhas. O botão **Remover sincronia** apaga só as falas com tempo e mantém o texto.
- A sincronia usa a API oficial de controle do player do YouTube. Se a página bloquear `youtube.com/iframe_api` (algumas redes e plataformas) ou a aula for aberta direto do computador, a faixa avisa e a transcrição completa continua funcionando, sem sincronia.
- Aulas já feitas continuam iguais: sem arquivo de legenda, o bloco se comporta como antes.

### 1.12.0 · 03/11/2026 · Alinhamento do texto do Parágrafo

- O bloco **Parágrafo** ganhou **Alinhamento do texto** no painel: **Esquerda** (padrão), **Centro**, **Direita** e **Justificado**. Vale para o bloco inteiro e sai igual na aula exportada (HTML, pacote HTML, SCORM e curso).
- O justificado liga a hifenização automática. Como os espaços irregulares entre as palavras podem atrapalhar quem tem dislexia ou baixa visão, o painel avisa e o verificador de acessibilidade dá uma **dica** em parágrafos justificados com mais de 300 caracteres (WCAG 1.4.8).
- Ao quebrar um parágrafo (Quebrar parágrafo aqui, inserir bloco no cursor), a parte nova herda o alinhamento. Aulas antigas continuam à esquerda.
- Campo `align` nas propriedades do bloco (`left`, `center`, `right`, `justify`); o JSON da aula continua abrindo em versões anteriores, que ignoram o campo.

### 1.11.0 · 03/11/2026 · Chave de IA própria nas figuras e legendas

- Em **Inserir imagem → Criar com IA** e em **Buscar legendas do YouTube** há um campo novo, opcional: «Sem o código? Use a sua chave de IA (Anthropic ou OpenAI)». Quem não tem o código de acesso do ClassAuthor usa a própria chave; o servidor do ClassAuthor a usa na hora, sem guardar nem registrar, e nunca usa as chaves do dono sem o código.
- A chave fica só na sessão da aba (nunca em `localStorage`) e segue em cabeçalhos `x-aula-ai-key` e `x-aula-ai-provider`.
- Exige o ClassAuthor 1.12.0 ou mais novo.

### 1.10.1 · 03/11/2026 · Manual Class atualizado

**Acrescentado**
- O **Manual Class** (botão **Manual ↗**) descreve agora tudo o que entrou nas versões 1.6.0 a 1.10.0: Pacote de entrega, Transcrição e legendas do YouTube, Modo apresentação e a lista de fóruns para criar no Moodle, com capturas de tela novas. Também cobre as novidades do ClassAuthor 1.4.0 a 1.11.0 e do ClassAcervo 1.3.0 e 1.4.0.

### 1.10.0 · 03/11/2026 · Fóruns para criar no Moodle

**Acrescentado**
- Em **Exportar → Colocar no Moodle…**, nova seção **Fóruns desta aula para criar no Moodle**: lista cada bloco de fórum da aula com a situação («A CRIAR» ou «JÁ TEM ENDEREÇO»), a seção da aula e os prazos, com os botões **Copiar nome** e **Copiar descrição** (a descrição junta a pergunta, os prazos, as regras e os critérios, e vai formatada para colar no editor do Moodle) e **Baixar a lista (.txt)**.
- O **Pacote de entrega** ganhou a pasta **moodle/** com `foruns-para-criar.txt`, e o LEIA-ME avisa quantos fóruns ainda estão sem endereço.

**Por quê**
- O fórum de verdade é uma atividade do Moodle (o bloco da aula só apresenta e leva até ele). Agora a lista do que criar sai pronta; depois de criar, é só colar o endereço do fórum no bloco e publicar de novo.

### 1.9.0 · 03/11/2026 · Modo apresentação

**Acrescentado**
- Botão **Apresentar** na barra superior: abre a aula em **tela cheia, uma seção por vez** (cada bloco de nível mais alto é uma tela), para projetar em sala ou numa videochamada. Nada é exportado nem gravado.
- Teclado: **→ ↓ Page Down Espaço** avança; **← ↑ Page Up** volta; **Home / End** vão ao começo e ao fim; **I** abre o índice das seções; **+ / −** mudam o tamanho do texto; **F** alterna a tela cheia; **Esc** sai. Em celular e tablet, deslize para os lados.
- Barra de controles (anterior, contador, próxima, A−/A+, tela cheia, sair) que some depois de 3 segundos sem movimento. Barra de progresso fina no topo. Índice com o título de cada seção.
- No editor, a apresentação começa pela seção do bloco selecionado; na prévia, pela primeira.
- Tamanho do texto de 100% a 200%, lembrado neste navegador.
- Acessibilidade: janela com `role="dialog"`, aviso por leitor de tela a cada troca («Seção 3 de 12: título») e foco devolvido ao botão ao sair.

### 1.8.0 · 03/11/2026 · Buscar legendas do YouTube

**Acrescentado**
- No bloco **Vídeo (YouTube)**, o botão **Buscar legendas do YouTube** traz para o campo Transcrição o texto das legendas que o próprio YouTube publica para o vídeo (feitas por pessoa ou automáticas), já em parágrafos. Não usa IA e não gera custo. Se o vídeo não tem legenda, ou o YouTube não responde, o botão diz o motivo e o campo continua para colar à mão.
- Se o campo já tinha texto, o app pede um segundo clique antes de substituir.
- Legenda automática vem marcada como rascunho: aparece a opção **Revisei a transcrição automática** e o verificador mostra a dica «Transcrição automática sem revisão» até você marcá-la.
- Usa o mesmo endereço e o mesmo código de acesso do ClassAuthor das figuras (o serviço de legendas está no ClassAuthor 1.10.0).

### 1.7.0 · 03/11/2026 · Transcrição de vídeo e áudio

**Acrescentado**
- Blocos **Vídeo (YouTube)** e **Áudio / Podcast** ganharam o campo **Transcrição** (texto, com parágrafos separados por linha em branco) e o campo **Ou link da transcrição**. Na aula, a transcrição aparece como uma seção recolhida «Transcrição» logo abaixo do player (aberta no PDF); o link aparece como recurso. A transcrição também vai para a exportação de texto.
- Bloco de vídeo: opção **Conferi: o vídeo tem legendas**, para quando as legendas já estão ativas no YouTube.

**Mudou**
- Verificador de acessibilidade: «Vídeo sem legendas nem transcrição» passou de dica a **aviso** (some quando há legendas conferidas, transcrição com 80 caracteres ou mais, ou link). O aviso «Áudio sem transcrição» também reconhece o novo campo.

### 1.6.0 · 03/11/2026 · Pacote de entrega

- Novo item **Exportar → Pacote de entrega (.zip)**: reúne em um único ZIP a aula em HTML (`aula/`), o pacote SCORM 1.2 (`scorm/`), o projeto editável (`projeto/`), o texto da aula (`texto/`) e o relatório de acessibilidade (`acessibilidade/`).
- **LEIA-ME.txt** na raiz: diz o que há em cada pasta e **o que ainda está pendente** (barreiras e avisos de acessibilidade que você não marcou como OK, resultado da conferência do SCORM, mais de uma avaliação final).
- Na pasta do projeto, o pacote vai para a subpasta nova **entrega/**.

### 1.5.1 · 03/11/2026 · Manual Class dentro do app

**Acrescentado**
- Botão **Manual ↗** no topo da paleta de blocos (ao lado de «Acervo»): abre o Manual Class numa aba nova, direto no capítulo do ClassAtelier. O manual fica na pasta `manual/` do repositório.

**Mudou**
- O título da aba do navegador segue o padrão dos três apps: «ClassAtelier - Editor de aulas interativas».

### 1.5.0 · 30/10/2026 · pasta do projeto

- Botão **Pasta** na barra superior (Chrome e Edge no computador): liga uma pasta do computador e tudo o que o ClassAtelier salva vai para ela, separado em subpastas: `projetos/` (o projeto aberto, gravado sozinho a cada alteração, e o Salvar), `html/` (arquivo HTML e pacote HTML), `scorm/`, `site/` (site do curso), `textos/` (texto da aula), `pdf/` (para salvar o PDF pela janela de impressão) e `outros/`.
- Se a pasta escolhida for a pasta de projeto criada pelo ClassAuthor 1.3.0, o ClassAtelier trabalha na subpasta `classatelier/` dela, ao lado dos arquivos que vêm do ClassAuthor. Em outra pasta, cria `classatelier/` dentro.
- Depois de recarregar a página, o navegador pede a autorização de novo (bolinha amarela, "Reconectar pasta"). Sem pasta, ou em navegadores sem suporte, os arquivos vão para Downloads como antes.
- `pasta.js` carrega direto no `index.html`; não entra nos pacotes exportados.

### 1.4.2 · 30/10/2026 · correção no bloco de código

- **Shift+Tab** numa linha sem seleção desfazia o recuo, mas deixava os espaços restantes selecionados: a próxima tecla apagava o recuo inteiro. Agora o cursor fica no lugar, com um nível a menos de recuo.

### 1.4.1 · 30/10/2026 · cursos organizados por aula

- Aula vinda de um curso que o ClassAuthor organiza **por aula** é salva como `AulaNN-título-ClassAtelier.json` (antes virava `SemanaNN-…`). A republicação no GitHub reconhece os dois nomes ao trocar a versão antiga. Cursos por semana seguem iguais.

### 1.4.0 · 29/10/2026 · bloco de código

- **Novo bloco «Código»** (paleta, em Texto; busca por "código", "python", "sql"…), para aulas de programação. O código é digitado ou colado direto na página, com destaque de sintaxe, recuo preservado, numeração de linhas opcional, cabeçalho com a linguagem e botão **Copiar código**.
- **Botão `</>` na barra de ferramentas** («Inserir bloco de código»): no cursor do parágrafo selecionado (o parágrafo se divide ali), depois do bloco selecionado ou no fim da aula. O painel do Parágrafo também ganhou **Inserir bloco de código no cursor**.
- Linguagens: Python, JavaScript, TypeScript, HTML, CSS, SQL, Java, C, C++, C#, PHP, JSON, XML, Bash e Texto simples.
- Edição: **Tab** recua (2 ou 4 espaços, ou tabulação), **Shift+Tab** desfaz o recuo, **Enter** mantém o recuo (e acrescenta um nível depois de `:` no Python ou de `{`, `[`, `(`), **Ctrl/⌘ + Enter** ou **Continuar o texto** sai do bloco e abre um parágrafo logo abaixo.
- Aparência clara, escura ou do aparelho; quebra de linhas opcional (senão, rolagem lateral); título/nome do arquivo e descrição para leitor de tela.
- Aula exportada (HTML, SCORM, site) mantém o destaque e o botão de copiar; o aluno seleciona e copia, mas não edita. O destaque é só visual: o código nunca é executado. Texto da aula (copiar/baixar) leva o código em bloco ```.
- Verificação de acessibilidade avisa bloco de código vazio.

### 1.3.0 · 29/10/2026 · imagem e quebras no cursor; ClassAcervo com endereço próprio

**Acrescentado ao painel do Parágrafo** (clique no ponto do texto e use o botão; o painel lembra onde estava o cursor)
- **Inserir imagem no cursor**: janela com duas abas. **Escolher imagem** (JPG, PNG, WebP, GIF ou SVG; foto grande é reduzida a 1600 px no lado maior) ou **Criar com IA** (descreva a figura; a IA do ClassAuthor devolve um diagrama/ilustração em SVG, com legenda e crédito «Ilustração criada por IA»). O parágrafo se divide no cursor e a imagem entra no meio, em linha própria. O texto alternativo é obrigatório, a menos que a imagem seja marcada como decorativa.
- **Quebrar parágrafo aqui**: o parágrafo vira dois, no cursor (o segundo sem capitular). Avisa quando o cursor está no começo ou no fim.
- **Quebrar tópico aqui**: o Tópico de conteúdo vira dois, no cursor; o que vem depois passa para um novo tópico logo abaixo, com o mesmo fundo e espaçamento. O botão também está no painel do próprio tópico. Tópico retrátil e slider não se dividem assim (o aviso explica).
- Ícone novo `separator-horizontal`.

**Criar com IA exige o ClassAuthor 1.2.0 ou mais novo** (rota `/api/figure`), o endereço dele e o código de acesso, que o editor guarda só na sessão (ou neste navegador, se você marcar «lembrar»). O ClassAtelier continua sem chave de IA própria.

**Mudou**
- Os atalhos **ClassAcervo ↗** (barra de ferramentas, menu e aviso de publicação) abrem **https://rgbittencourt.github.io/classacervo/**, o novo endereço do ClassAcervo.
- A pasta `acervo/` deste repositório virou só um aviso com redirecionamento. O app (código, estilos e capturas) está agora no repositório [rgbittencourt/classacervo](https://github.com/rgbittencourt/classacervo).

### 1.2.1 · 29/10/2026 · crédito aos dois autores

**Corrigido**
- A barra de créditos passou a dizer **«Desenvolvido pelos Profs. Rogério G. Bittencourt & Luís Lindner»**, em vez de citar só o Prof. Rogério.

### 1.2.0 · 29/10/2026 · equações: tamanho, moldura, conjuntos e lógica

**Acrescentado ao bloco Equação**
- **Tamanho da letra** (40% a 160%, com atalhos Pequena, Normal e Grande) e **Reduzir sozinha para caber**: uma fórmula comprida diminui só o necessário para caber na largura da página, sem barra de rolagem (acompanha a largura da tela, inclusive no celular). Desligando o ajuste, vale exatamente o tamanho escolhido.
- **Moldura opcional**: a caixa com borda pode ser desligada; o número continua à direita.
- Novos grupos de botões no painel: **Operações de conjuntos** (união, interseção, diferença, diferença simétrica, complementar, vazio, pertence, contido, produto cartesiano, chaves, conjunto por propriedade, cardinalidade, união e interseção de vários conjuntos, conjunto das partes, ℕ ℤ ℚ ℝ ℂ) e **Operadores lógicos** (e, ou, não, XOR, implicação, bicondicional, equivalência, ∀, ∃, ∄, verdadeiro, falso, portanto, pois, prova, satisfaz, NAND, NOR, negação com barra).
- Seis exemplos prontos novos (união e interseção, diferença, De Morgan em conjuntos e em lógica, condicional, quantificadores).

### 1.1.0 · 29/10/2026 · equações, fórum e ícones

**Acrescentado**
- **Bloco Equação** (categoria Texto): fórmulas matemáticas, físicas e químicas escritas em LaTeX e desenhadas pelo KaTeX 0.19.1 (MIT, incluído em `vendor/katex/`). A fórmula fica centralizada em linha própria, dentro de uma **caixa de borda visível**; o **número** fica na extremidade direita da mesma linha, **fora da caixa**, em qualquer formato (`(1)`, `(1.1)`, `Eq. 1`) e editável direto na página. O painel traz botões de estruturas (fração, raiz, potência, somatório, integral, limite…), símbolos gregos e operadores, exemplos prontos e aviso de erro de sintaxe sem travar a aula.
- **Numeração automática**: a primeira equação é (1); cada equação nova na mesma aula recebe o número seguinte da sequência, mantendo o formato do número anterior; todos continuam editáveis, e o botão **Renumerar todas as equações** refaz a sequência.
- A equação entra dentro de **Tópico, Colunas, Acordeão e Linha do tempo**; e o painel do **Parágrafo** ganhou **Inserir equação no cursor**, que divide o parágrafo naquele ponto e coloca a fórmula no meio, em linha própria.
- **Bloco Fórum de discussão** (categoria Interativos): título, pergunta, prazos da postagem inicial e das respostas, regras de participação, critérios de avaliação opcionais, botão que abre o fórum de verdade (Moodle, Padlet, Teams…) em nova aba e **rascunho da mensagem** salvo no navegador do aluno, com contador de palavras e botão de copiar.
- A exportação inclui o KaTeX **só quando a aula tem equação** (arquivo único usa a CDN com SRI; pacotes `.zip`/SCORM levam os arquivos locais). Acessibilidade: a fórmula sai também em MathML (leitores de tela); o verificador avisa equação vazia ou com erro e fórum sem endereço.
- Texto da aula (.txt) e busca de blocos reconhecem os dois blocos novos.

**Corrigido**
- Faltavam os ícones de **Tópico slider**, **Conteúdo externo (iframe)** e **Colunas** na paleta de blocos.

### 1.0.0 · 29/10/2026 · primeira versão de produção

Marca a passagem para produção, com o nome ClassAtelier. Parte do LumeAuthor, do Prof. Luís Lindner; toda a base do editor (blocos, temas, componentes, exportação) vem dele.

**Acrescentado em relação à base**
- Pareamento com o ClassAuthor: receber a semana aberta por ele e **Enviar de volta** (mensagens entre abas com conferência de origem), com **Biblioteca** e **Histórico de versões** locais.
- **Publicação direta no GitHub** (um commit, GitHub Pages) e **Atualizar uma aula já publicada**, mantendo o endereço.
- **Conferência de pacote SCORM** (estrutura, manifesto, comportamento) antes de exportar; exportação em HTML, pacote HTML, SCORM 1.2/2004 e site ZIP.
- Verificação de acessibilidade, visualização em computador, tablet e celular, **Termos e links**, e temas adicionais (14 no total).
- Nome de arquivo `SemanaNN-título-ClassAtelier.json`; botão **Acervo ↗** para o ClassAcervo; instalável como aplicativo (manifesto, sem modo offline).

**Compatibilidade:** projetos e preferências salvos por versões anteriores são migrados ou aceitos na primeira abertura; nenhuma ação é necessária.

**Ainda não verificado:** publicação e atualização contra o repositório real, importação do SCORM em um Moodle real, instalação como aplicativo em aparelhos.

## ClassAcervo

### 1.0.0 · 29/10/2026 · primeira versão de produção

Primeira versão. Administra os cursos publicados no GitHub Pages direto do navegador, falando com a API do GitHub (sem servidor).

- Conexão por conta, repositório, branch e token do GitHub (o token fica só no navegador).
- Abas **Cursos** e **Todos os arquivos**; links das aulas e **Copiar todos os links (lista para o Moodle)**.
- **Renomear/mover**, **Duplicar**, **Excluir** (com confirmação digitando o nome, e exclusão em lote), cada operação em um único commit.
- **Gerar índice do site** em qualquer pasta e **Consertar links do índice** de cursos renomeados.
- Chip do GitHub Pages (liga o Pages se estiver desligado); botão **ClassAtelier ↗**; instalável como aplicativo.

**Ainda não verificado:** as operações foram testadas contra uma simulação da API do GitHub, não contra o repositório real.
