# Histórico de versões

Este repositório tem o ClassAtelier. O ClassAcervo, que morava aqui na pasta `acervo/`, tem repositório próprio desde 29/10/2026 ([rgbittencourt/classacervo](https://github.com/rgbittencourt/classacervo)); o histórico dele está lá. Cada aplicativo tem a própria versão, em [Versionamento Semântico](https://semver.org/lang/pt-BR/) (MAIOR.MENOR.CORREÇÃO): **MAIOR** quebra o que já existia, **MENOR** traz recurso novo sem quebrar nada, **CORREÇÃO** é conserto sem recurso novo.

| Aplicativo | Versão atual | Onde o número aparece |
|---|---|---|
| ClassAtelier | **1.4.0** (em teste) | canto da paleta de blocos (ao lado do nome) e `window.CLASSATELIER_VERSION`, definido em `boot.js` |
| ClassAcervo | **1.2.0** | repositório próprio: [`rgbittencourt/classacervo`](https://github.com/rgbittencourt/classacervo) |

Ao mudar a versão do ClassAtelier, altere os dois lugares e a data abaixo.

## ClassAtelier

### 1.4.0 · em teste (ramo `codigo`, cópia em `/teste/`) · bloco de código

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
