# ClassAtelier

Editor de aulas interativas, com blocos editáveis, pré-visualização e exportação para diferentes destinos. É a etapa de acabamento da aula: o texto nasce no [ClassAuthor](https://github.com/rgbittencourt/classauthor), que também pode abrir uma semana direto aqui. O formato de projeto continua sendo o `.aula.json`.

## Formatos de saída

No menu **Exportar**, escolha o formato adequado:

- **Projeto JSON (`Semana01-título-ClassAtelier.json`)**: arquivo editável para reabrir e continuar no ClassAtelier (é também o arquivo do botão **Salvar**);
- **Arquivo HTML (`.html`)**: aula renderizada em um único arquivo autocontido para abrir no navegador;
- **Pacote HTML (`.html.zip`)**: `index.html`, JSON do projeto, imagens, fontes e assets do tema;
- **Curso e GitHub…**: abre a Biblioteca com a aula atual já marcada; marque outras aulas e escolha *Montar curso* (site, SCORM ou publicação direta no GitHub);
- **Pacote SCORM (`.scorm.zip`)**: pacote com `imsmanifest.xml`, aula HTML e ponte SCORM para Moodle ou outro LMS;
- **Imprimir PDF**: versão estática produzida pela janela de impressão do navegador.

O SCORM pode ser configurado como **1.2** — padrão de maior compatibilidade — ou **2004**. Quizzes avaliativos podem enviar nota e status de aprovação para o LMS.

## Versão do aplicativo

ClassAtelier **1.0.0** e ClassAcervo **1.0.0** (Versionamento Semântico, cada um com a sua). O histórico está em [`CHANGELOG.md`](CHANGELOG.md).

## Biblioteca e pacote do curso

O botão **Biblioteca** guarda, neste navegador, todas as aulas que você edita ou abre (inclusive as semanas enviadas pelo ClassAuthor), com nome e data da última edição. Marque várias aulas e use **Montar curso**: o formato **Site HTML (GitHub Pages)** gera `index.html` + `aula-01.html`, `aula-02.html`… (endereços estáveis, com LEIA-ME de publicação e links para o Moodle); o formato **Pacote SCORM** gera um único pacote com uma aula por item, na ordem escolhida, e cada aula mantém a própria avaliação final e a nota enviada ao LMS. A biblioteca é por navegador; para levar uma aula a outro computador, use **Salvar** (`.aula.json`).

### Publicar direto no GitHub

Em **Montar curso → Publicar no GitHub**, informe a conta (ou organização), o repositório, a branch e, se quiser, uma **pasta** (um repositório pode hospedar vários cursos, ex.: `tedpro/TGE`). O ClassAtelier envia o site num único commit, só com os arquivos que mudaram, e mostra os links de cada aula para colar no Moodle. O token de acesso é digitado a cada uso (ou lembrado neste navegador, se você marcar) e vai direto do navegador para `api.github.com`. Token fino (*fine-grained*) com **Contents** e **Pages** em *Read and write* serve para repositórios da própria conta; para repositório de outra pessoa ou organização onde você é colaborador, use token clássico com o escopo `repo`.

## Origem e créditos

**Toda a base do ClassAtelier é do LumeAuthor**, ferramenta de autoria SCORM criada pelo **Prof. Luís Lindner** ([luislindner.github.io/lumeauthor](https://luislindner.github.io/lumeauthor/)): o editor de blocos, os temas, os componentes das aulas e a exportação SCORM. O ClassAtelier é uma evolução dessa base, feita em coautoria com **Rogério Bittencourt (INOVALAB – IFSC)**: biblioteca de aulas, pacote do curso, publicação no GitHub, integração com o ClassAuthor e nova identidade. O LumeAuthor original segue sendo desenvolvido por Luís Lindner, sem alterações vindas daqui.

O rodapé das aulas exportadas traz a atribuição: *"…baseada integralmente no LumeAuthor, ferramenta de autoria SCORM criada por Luís Lindner, e evoluída em coautoria com Rogério Bittencourt (INOVALAB - IFSC)."* (com link para o LumeAuthor).

## ClassAcervo: administrar o que está publicado

Em `acervo/` (endereço `…/classatelier/acervo/`) há uma ferramenta gráfica separada para cuidar dos cursos publicados no GitHub Pages. Conecte-se ao repositório (conta, repositório, branch e token) e use:

- **Cursos**: cartões com os cursos encontrados (pasta com `index.html` e `aula-NN.html`), link do site, link de cada aula e botão para copiar todos os links para o Moodle;
- **Todos os arquivos**: árvore de pastas e arquivos, com tamanho, link no site e pré-visualização;
- **Renomear/mover, duplicar e excluir** pastas e arquivos, sempre em um único commit (o histórico do GitHub guarda o anterior);
- **Gerar índice do site**: cria um `index.html` listando os cursos (na raiz ou em qualquer pasta), marcado como gerado pela ferramenta;
- **Ligar o GitHub Pages**, quando estiver desligado.

O token vai direto do navegador ao GitHub; fica só na aba, ou neste navegador se você marcar "lembrar".

O rodapé do ClassAcervo traz os créditos de autoria, no mesmo desenho da capa do ClassAuthor: marca do IFSC (Câmpus Florianópolis–Continente), «Desenvolvido pelo Prof. Rogério G. Bittencourt», assinatura do INOVALAB e o link do GitHub. O índice gerado para o site também leva o crédito, em texto.

## Acessibilidade

O botão **Acessibilidade** (barra superior, com o número de itens a revisar) abre um painel à esquerda que confere a aula contra o WCAG 2.1 AA. Cada item tem a gravidade (Erro, Aviso ou Sugestão), a explicação, a referência do WCAG e **Ir ao bloco**, que seleciona o bloco para você corrigir no painel da direita.

O que é verificado automaticamente:

- **Imagens:** sem texto alternativo nem legenda (erro); só com legenda (sugestão); texto alternativo que parece nome de arquivo, longo ou começando com “imagem de…”. Os blocos Imagem, Parallax e Texto + imagem ganharam o campo **Texto alternativo** e a opção **Imagem decorativa**.
- **Vídeo e áudio:** vídeo-modelo ainda no lugar, título genérico, lembrete de legendas; áudio sem transcrição.
- **Títulos:** título vazio, salto de nível (h1 → h3), aula sem título ou sem abertura.
- **Tabelas:** sem cabeçalhos, sem legenda, muitas colunas.
- **Links:** vazios, “#”, “https://” sozinho, e textos como “clique aqui”.
- **Conteúdo externo (iframe):** sem título.
- **Contraste de cores:** mede o texto da aula **renderizada com o tema atual** (4,5:1; 3:1 para texto grande). Fundos com imagem ou gradiente não são medidos.

**Marcar como OK:** cada item tem **✓ Está OK** (e, quando há vários do mesmo tipo, **OK em todos deste tipo**). O item some da lista e do número do botão e **não é apontado de novo**, mesmo que você não o corrija. A aba **Marcados OK** mostra tudo o que foi dispensado e permite **Reativar**. A marcação fica guardada na própria aula (no projeto `…-ClassAtelier.json`), então acompanha o arquivo.

Não substitui o teste humano: o painel traz a lista do que só uma pessoa confere (teclado, zoom, leitor de tela, legendas).

## Conferência do SCORM

Antes de subir um pacote ao ambiente virtual, dá para conferi-lo dentro do ClassAtelier. Em **Exportar → Pacote SCORM**, clique em *confira o pacote* (ou em *confira um .zip que você já tem*, para qualquer pacote, mesmo de outra ferramenta). Em **Curso e GitHub… → Pacote SCORM**, use *Conferir pacote antes de gerar*.

- **1. Estrutura do pacote** — abre o .zip de verdade e confere: `imsmanifest.xml` na raiz e bem formado; versão (1.2 ou 2004) coerente em namespaces e `schemaversion`; organização, itens e recursos; grafia de `adlcp:scormtype`/`scormType`; arquivos declarados e imagens/estilos referenciados que faltam no .zip; página de abertura com o código SCORM; nomes de arquivo com acento ou espaço; arquivos pesados e tamanho total; dependências externas (bibliotecas e mídias da internet).
- **2. Simulador de plataforma** — roda a aula num LMS de mentira (SCORM 1.2 ou 2004) dentro de um iframe isolado e mostra, ao vivo, o que a aula envia: `Initialize`, estado, nota, `Commit`, `Terminate`. O LMS de mentira recusa o que a norma proíbe (valor fora do vocabulário, nota fora da faixa, escrita em campo só de leitura, chamada antes de `Initialize`) e o registro destaca essas recusas. Botões: *Rolar até o fim*, *Simular conclusão*, *Encerrar sessão*.

Os pacotes .zip (HTML, SCORM, curso, GitHub) já levam React, Babel e Font Awesome na pasta `vendor/`, então a aula abre **sem internet** e sem depender de unpkg/cdnjs (o pacote fica uns 3 MB maior). Só o *arquivo HTML único* continua buscando essas bibliotecas na internet.

Limite: isto confere o pacote e o comportamento da aula, não substitui o aceite da sua plataforma. O teste final é subir num curso de rascunho do Moodle.

## Histórico de versões

O botão **Histórico** (ou ⋯ → Histórico de versões) guarda e recupera versões da aula, neste navegador.

- **Automáticas:** o ClassAtelier grava uma versão quando você para de editar por cerca de 45 segundos, ao esconder a aba e ao abrir a aula. No máximo uma a cada 5 minutos (as de um mesmo intervalo se fundem). Ficam as 30 mais recentes.
- **Nomeadas:** *Guardar a aula como está agora* cria uma versão com o nome que você quiser (ex.: «antes da revisão»). Nunca são apagadas sozinhas.
- **De segurança:** antes de restaurar, recuperar um bloco, limpar a página ou substituir pela versão vinda do ClassAuthor, a aula atual é guardada.
- **Comparação:** ao escolher uma versão, o ClassAtelier mostra bloco a bloco o que mudou depois (alterado, removido, novo). Dá para **recuperar um bloco apagado**, **usar a versão antiga de um bloco** ou **restaurar a versão inteira**. Tudo isso também pode ser desfeito com ⌘Z.
- **Baixar .json** leva a versão para outro computador. Excluir a aula da Biblioteca apaga também o histórico dela.

Limite: o histórico vive no navegador (IndexedDB). Limpar os dados do site apaga tudo; para ter cópia fora dele, use **Salvar**.

## Atualizar uma aula já publicada

Em **Exportar → Atualizar uma aula já publicada…**, o ClassAtelier troca no GitHub só a aula que está aberta, sem republicar o curso inteiro:

1. Informe conta, repositório, branch, pasta do curso e token (os mesmos de «Curso e GitHub…»; ficam guardados neste navegador).
2. *Procurar aulas publicadas* lista as páginas .html da pasta, com o nome que aparece na página do curso. A que parece ser a aula atual vem marcada (pelo título ou pelo número da semana).
3. *Ver o que será enviado* mostra, antes de enviar, os arquivos novos, alterados e apagados.
4. *Publicar só esta aula* faz um único commit.

Só mexe nos arquivos daquela aula: a página, as imagens dela, o projeto `projetos/SemanaNN-…json` e, se você deixar marcado, o nome dela na página do curso (`index.html`). Imagens e projeto antigos que deixaram de ser usados são apagados. As outras aulas e **os endereços usados no Moodle não mudam**, mesmo que você tenha renomeado os arquivos à mão. Se o repositório mudar enquanto você prepara a atualização, nada é enviado e o ClassAtelier avisa.

## Colocar no Moodle

Depois de publicar (em «Curso e GitHub…» ou «Atualizar uma aula já publicada…»), o botão **Colocar no Moodle** mostra, para cada aula:

- **A) Recurso URL (recomendado):** o endereço para colar em *Adicionar uma atividade ou recurso → URL*, com *Exibir* em «Incorporar» ou «Em uma nova janela».
- **B) Código iframe:** para colar no modo HTML do editor de uma Página ou Rótulo, com a altura da janela à escolha (600 a 1500 px). Alguns Moodles bloqueiam iframe em textos; nesse caso use a opção A.

Também está em **Exportar → Colocar no Moodle…**, onde basta colar o endereço de uma aula já publicada. Como o Moodle só aponta para a página do GitHub Pages, ao atualizar a aula lá o Moodle já mostra a versão nova.

## Buscar blocos

No alto da coluna de blocos há uma caixa de busca (atalho: tecle **/**). Ela acha pelo nome e pelo que o bloco faz: «pergunta» leva a Reflexão, Accordion e Quiz; «sanfona», aos blocos retráteis; «iframe», ao conteúdo externo; «cronologia», à linha do tempo. Ignora acentos e maiúsculas, casa no começo das palavras e destaca o trecho. **Enter** insere o primeiro resultado, **Esc** limpa a busca.

## Prévia em celular e tablet

No modo **Visualizar**, a barra «Ver como» troca o aparelho: Computador, Tablet (820 × 1180), Celular (390 × 844) e Celular pequeno (360 × 640). **Deitar** gira o aparelho; **Recarregar** volta ao começo da aula. A aula roda num quadro com a largura real do aparelho, então o layout responsivo (menu, colunas, tamanhos) aparece como no celular do aluno. É a mesma página que a exportação gera, montada com a aula como está agora (para ver uma edição nova, volte a Editar e entre em Visualizar de novo). A escolha do aparelho fica guardada neste navegador.

## Temas (design systems)

O botão no canto esquerdo da barra troca o visual da aula inteira (cores, letras e formato dos componentes). O tema escolhido vai junto no pacote exportado, com as fontes dentro, e a aula abre igual sem internet.

| Tema | Letra | Jeito |
|---|---|---|
| Aula (padrão) | Fraunces e Instrument Sans | editorial, do LumeAuthor |
| Cedar, Carbon, Intergalactic, Persona | as dos próprios sistemas | já existiam |
| **Material 3** (Google) | Roboto | cores tonais, cantos arredondados, botões em pílula |
| **Fluent** (Microsoft) | Segoe UI do aparelho | limpo e corporativo, azul de marca, cantos de 4 a 8 px |
| **Polaris** (Shopify) | Inter | muito espaço em branco, verde-escuro como cor de ação |
| **Atlassian** | Inter | azul e cinza, funcional, bom para conteúdo técnico |
| **Primer** (GitHub) | letra do sistema | minimalista, bom para código |
| **Ant Design** | letra do sistema | denso e organizado, para aulas com muita tabela e dado |
| **GOV.UK** | Arial do aparelho | foco máximo em leitura e acessibilidade: cantos retos, foco amarelo, contraste altíssimo |
| **Lightning** (Salesforce) | letra do sistema | corporativo, azul de marca, cantos pequenos |
| **Spectrum** (Adobe) | Source Sans 3 | botões em pílula, azul Adobe |

**Miniaturas e personalidade.** O seletor mostra uma miniatura de cada tema (abertura, texto, destaque, botão e cores). Além de cor e letra, cada tema novo tem seu jeito próprio nos componentes: a abertura (cartão tonal no Material, faixa azul-marinho no Lightning, barra em degradê no Spectrum, filete no Primer), a etiqueta de seção (pílula, lozenge, tag ou texto simples) e o cabeçalho das tabelas. Isso fica numa seção «PERSONALIDADE DO TEMA» no fim do `colors_and_type.css` de cada tema, com variáveis `--p-*` que a miniatura também lê.

O texto principal de todos os temas novos passa de 13:1 de contraste, o texto de apoio passa de 6:1 e os botões e fundos de acento passam de 4,5:1.

**Marcas e licenças.** Com exceção do Material 3, os nomes terminam em «inspirado» no seletor: usam as cores e o estilo dos componentes de cada sistema (todos de código aberto: MIT, Apache-2.0 ou BSD), mas **não trazem logotipo nem a fonte oficial**, que em vários casos é proprietária (Segoe UI, Salesforce Sans, Adobe Clean, GDS Transport, Atlassian Sans). Onde precisou de uma fonte embutida, usei Roboto, Inter ou Source Sans 3 (licença livre OFL), guardadas em `<tema>/fonts/`. Onde a fonte é a do sistema, a aula usa a do aparelho do aluno, então o tamanho do pacote não aumenta. Os temas são só no claro; o modo escuro do Primer ainda não foi feito. Para criar mais um tema, copie uma das pastas e registre em `themes.js`.

## Identidade visual

- `assets/classatelier-mark.svg`: símbolo do ClassAtelier (janela em arco);
- `assets/brand/classatelier-mark.png`: símbolo raster de alta resolução;
- `assets/brand/classatelier-logo.svg`: logo horizontal;
- `assets/brand/classatelier-logo.png`: logo raster para documentos e apresentações;
- `assets/brand/classatelier-cover.svg`: capa editorial horizontal;
- `assets/brand/classatelier-cover.png`: capa PNG para redes sociais e compartilhamento;
- `assets/favicon.svg` e `assets/favicon-32.png`: favicons SVG e PNG;
- `assets/apple-touch-icon.png`: ícone para iPhone/iPad;
- `assets/site.webmanifest`: metadados de instalação como aplicativo.

O **ClassAcervo** tem identidade própria, da mesma família: um arquivo em arco com três gavetas, a do meio acesa em coral. Arquivos: `assets/classacervo-mark.svg`, `assets/classacervo-favicon.svg` (+ `-32.png` e `classacervo-apple-touch-icon.png`), `assets/classacervo.webmanifest`, `assets/brand/classacervo-mark.png`, `classacervo-logo.svg/.png` e `classacervo-cover.svg/.png`. O nome se escreve **Class** (negrito) + ***Acervo*** (itálico).

O símbolo e a capa do ClassAtelier usam a janela de ateliê em arco, com o vidro dividido em quatro e um painel aceso, em azul-marinho, papel e coral. O nome se escreve **Class** (negrito) + ***Atelier*** (itálico).

## Receber uma semana do ClassAuthor e devolvê-la editada

O ClassAuthor abre esta página em outra aba e envia a semana por `postMessage` (mensagens `classatelier:ready`, `classauthor:lesson`, `classatelier:loaded`). Só aceita de quem abriu a aba e pergunta antes de substituir um projeto em andamento.

**Devolver o texto.** Em **Exportar → Enviar de volta ao ClassAuthor**, a aula editada volta para a aba do ClassAuthor que a abriu (mensagem `classatelier:lesson`, com o projeto e o texto corrido; resposta `classauthor:received`). O ClassAuthor guarda essa versão na semana de origem e passa a usá-la ao reabrir, baixar o JSON ou montar o ZIP. O item só funciona quando a aula foi aberta pelo ClassAuthor e a aba dele continua aberta; do contrário o aviso diz o que fazer. Duas saídas sempre disponíveis, que não dependem do ClassAuthor: **Copiar o texto da aula** e **Baixar o texto (.txt)** (só as palavras, em ordem, com títulos, destaques, perguntas do quiz e tabelas; sem endereços de imagem nem códigos).
