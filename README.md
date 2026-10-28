# ClassAtelier

Editor de aulas interativas, com blocos editáveis, pré-visualização e exportação para diferentes destinos. É a etapa de acabamento da aula: o texto nasce no [ClassAuthor](https://github.com/rgbittencourt/aula-generator), que também pode abrir uma semana direto aqui. (Antes se chamava Aula Studio; o endereço e o formato `.aula.json` continuam os mesmos.)

## Formatos de saída

No menu **Exportar**, escolha o formato adequado:

- **Projeto JSON (`.aula.json`)**: arquivo editável para reabrir e continuar no ClassAtelier;
- **Arquivo HTML (`.html`)**: aula renderizada em um único arquivo autocontido para abrir no navegador;
- **Pacote HTML (`.html.zip`)**: `index.html`, JSON do projeto, imagens, fontes e assets do tema;
- **Pacote SCORM (`.scorm.zip`)**: pacote com `imsmanifest.xml`, aula HTML e ponte SCORM para Moodle ou outro LMS;
- **Imprimir PDF**: versão estática produzida pela janela de impressão do navegador.

O SCORM pode ser configurado como **1.2** — padrão de maior compatibilidade — ou **2004**. Quizzes avaliativos podem enviar nota e status de aprovação para o LMS.

## Biblioteca e pacote do curso

O botão **Biblioteca** guarda, neste navegador, todas as aulas que você edita ou abre (inclusive as semanas enviadas pelo ClassAuthor), com nome e data da última edição. Marque várias aulas e use **Montar curso**: o formato **Site HTML (GitHub Pages)** gera `index.html` + `aula-01.html`, `aula-02.html`… (endereços estáveis, com LEIA-ME de publicação e links para o Moodle); o formato **Pacote SCORM** gera um único pacote com uma aula por item, na ordem escolhida, e cada aula mantém a própria avaliação final e a nota enviada ao LMS. A biblioteca é por navegador; para levar uma aula a outro computador, use **Salvar** (`.aula.json`).

### Publicar direto no GitHub

Em **Montar curso → Publicar no GitHub**, informe a conta (ou organização), o repositório, a branch e, se quiser, uma **pasta** (um repositório pode hospedar vários cursos, ex.: `tedpro/TGE`). O ClassAtelier envia o site num único commit, só com os arquivos que mudaram, e mostra os links de cada aula para colar no Moodle. O token de acesso é digitado a cada uso (ou lembrado neste navegador, se você marcar) e vai direto do navegador para `api.github.com`. Token fino (*fine-grained*) com **Contents** e **Pages** em *Read and write* serve para repositórios da própria conta; para repositório de outra pessoa ou organização onde você é colaborador, use token clássico com o escopo `repo`.

## Origem e créditos

O ClassAtelier é desenvolvido em coautoria por **Rogério Bittencourt (INOVALAB – IFSC)** e **Luís Lindner**, a partir do **LumeAuthor**, criado pelo Prof. Luís Lindner ([luislindner.github.io/lumeauthor](https://luislindner.github.io/lumeauthor/)), que é a base do editor de blocos, dos temas e da exportação SCORM. O LumeAuthor original segue sendo desenvolvido por ele; o ClassAtelier é uma evolução independente (biblioteca de aulas, pacote do curso, publicação no GitHub, integração com o ClassAuthor, nova identidade). O rodapé das aulas exportadas traz a atribuição: *"…desenvolvida por Rogério Bittencourt (INOVALAB - IFSC) e Luís Lindner, a partir do LumeAuthor."* (com link para o LumeAuthor).

## Identidade visual

- `assets/classatelier-mark.svg`: símbolo do ClassAtelier (janela em arco);
- `assets/aula-mark.svg`: símbolo da marca "aula" usado dentro das aulas exportadas (tema);
- `assets/brand/classatelier-mark.png`: símbolo raster de alta resolução;
- `assets/brand/classatelier-logo.svg`: logo horizontal;
- `assets/brand/classatelier-logo.png`: logo raster para documentos e apresentações;
- `assets/brand/classatelier-cover.svg`: capa editorial horizontal;
- `assets/brand/classatelier-cover.png`: capa PNG para redes sociais e compartilhamento;
- `assets/favicon.svg` e `assets/favicon-32.png`: favicons SVG e PNG;
- `assets/apple-touch-icon.png`: ícone para iPhone/iPad;
- `assets/site.webmanifest`: metadados de instalação como aplicativo.

O símbolo e a capa usam a janela de ateliê em arco, com o vidro dividido em quatro e um painel aceso, em azul-marinho, papel e coral. O nome se escreve **Class** (negrito) + ***Atelier*** (itálico).

## Receber uma semana do ClassAuthor

O ClassAuthor abre esta página em outra aba e envia a semana por `postMessage` (mensagens `aulastudio:ready`, `classauthor:lesson`, `aulastudio:loaded`). Só aceita de quem abriu a aba e pergunta antes de substituir um projeto em andamento.
