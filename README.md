# ClassAtelier

Editor de aulas interativas, com blocos editáveis, pré-visualização e exportação para diferentes destinos. É a etapa de acabamento da aula: o texto nasce no [ClassAuthor](https://github.com/rgbittencourt/aula-generator), que também pode abrir uma semana direto aqui. (Antes se chamava Aula Studio; o endereço e o formato `.aula.json` continuam os mesmos.)

## Formatos de saída

No menu **Exportar**, escolha o formato adequado:

- **Projeto JSON (`Semana01-título-ClassAtelier.json`)**: arquivo editável para reabrir e continuar no ClassAtelier (é também o arquivo do botão **Salvar**);
- **Arquivo HTML (`.html`)**: aula renderizada em um único arquivo autocontido para abrir no navegador;
- **Pacote HTML (`.html.zip`)**: `index.html`, JSON do projeto, imagens, fontes e assets do tema;
- **Curso e GitHub…**: abre a Biblioteca com a aula atual já marcada; marque outras aulas e escolha *Montar curso* (site, SCORM ou publicação direta no GitHub);
- **Pacote SCORM (`.scorm.zip`)**: pacote com `imsmanifest.xml`, aula HTML e ponte SCORM para Moodle ou outro LMS;
- **Imprimir PDF**: versão estática produzida pela janela de impressão do navegador.

O SCORM pode ser configurado como **1.2** — padrão de maior compatibilidade — ou **2004**. Quizzes avaliativos podem enviar nota e status de aprovação para o LMS.

## Biblioteca e pacote do curso

O botão **Biblioteca** guarda, neste navegador, todas as aulas que você edita ou abre (inclusive as semanas enviadas pelo ClassAuthor), com nome e data da última edição. Marque várias aulas e use **Montar curso**: o formato **Site HTML (GitHub Pages)** gera `index.html` + `aula-01.html`, `aula-02.html`… (endereços estáveis, com LEIA-ME de publicação e links para o Moodle); o formato **Pacote SCORM** gera um único pacote com uma aula por item, na ordem escolhida, e cada aula mantém a própria avaliação final e a nota enviada ao LMS. A biblioteca é por navegador; para levar uma aula a outro computador, use **Salvar** (`.aula.json`).

### Publicar direto no GitHub

Em **Montar curso → Publicar no GitHub**, informe a conta (ou organização), o repositório, a branch e, se quiser, uma **pasta** (um repositório pode hospedar vários cursos, ex.: `tedpro/TGE`). O ClassAtelier envia o site num único commit, só com os arquivos que mudaram, e mostra os links de cada aula para colar no Moodle. O token de acesso é digitado a cada uso (ou lembrado neste navegador, se você marcar) e vai direto do navegador para `api.github.com`. Token fino (*fine-grained*) com **Contents** e **Pages** em *Read and write* serve para repositórios da própria conta; para repositório de outra pessoa ou organização onde você é colaborador, use token clássico com o escopo `repo`.

## Origem e créditos

**Toda a base do ClassAtelier é do LumeAuthor**, ferramenta de autoria SCORM criada pelo **Prof. Luís Lindner** ([luislindner.github.io/lumeauthor](https://luislindner.github.io/lumeauthor/)): o editor de blocos, os temas, os componentes das aulas e a exportação SCORM. O ClassAtelier é uma evolução dessa base, feita em coautoria com **Rogério Bittencourt (INOVALAB – IFSC)**: biblioteca de aulas, pacote do curso, publicação no GitHub, integração com o ClassAuthor e nova identidade. O LumeAuthor original segue sendo desenvolvido por Luís Lindner, sem alterações vindas daqui.

O rodapé das aulas exportadas traz a atribuição: *"…baseada integralmente no LumeAuthor, ferramenta de autoria SCORM criada por Luís Lindner, e evoluída em coautoria com Rogério Bittencourt (INOVALAB - IFSC)."* (com link para o LumeAuthor).

## ClassAcervo: administrar o que está publicado

Em `acervo/` (endereço `…/aula-studio/acervo/`) há uma ferramenta gráfica separada para cuidar dos cursos publicados no GitHub Pages. Conecte-se ao repositório (conta, repositório, branch e token) e use:

- **Cursos**: cartões com os cursos encontrados (pasta com `index.html` e `aula-NN.html`), link do site, link de cada aula e botão para copiar todos os links para o Moodle;
- **Todos os arquivos**: árvore de pastas e arquivos, com tamanho, link no site e pré-visualização;
- **Renomear/mover, duplicar e excluir** pastas e arquivos, sempre em um único commit (o histórico do GitHub guarda o anterior);
- **Gerar índice do site**: cria um `index.html` listando os cursos (na raiz ou em qualquer pasta), marcado como gerado pela ferramenta;
- **Ligar o GitHub Pages**, quando estiver desligado.

O token vai direto do navegador ao GitHub; fica só na aba, ou neste navegador se você marcar "lembrar".

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

## Receber uma semana do ClassAuthor

O ClassAuthor abre esta página em outra aba e envia a semana por `postMessage` (mensagens `aulastudio:ready`, `classauthor:lesson`, `aulastudio:loaded`). Só aceita de quem abriu a aba e pergunta antes de substituir um projeto em andamento.
