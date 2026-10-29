# Histórico de versões

Este repositório tem dois aplicativos, cada um com a própria versão, em [Versionamento Semântico](https://semver.org/lang/pt-BR/) (MAIOR.MENOR.CORREÇÃO): **MAIOR** quebra o que já existia, **MENOR** traz recurso novo sem quebrar nada, **CORREÇÃO** é conserto sem recurso novo.

| Aplicativo | Versão atual | Onde o número aparece |
|---|---|---|
| ClassAtelier | **1.0.0** | canto da paleta de blocos (ao lado do nome) e `window.CLASSATELIER_VERSION`, definido em `boot.js` |
| ClassAcervo | **1.0.0** | subtítulo do cabeçalho, rodapé de créditos e rodapé dos índices que ele gera; constante `APP_VERSION` em `acervo/acervo.js` |

Ao mudar a versão, altere os dois lugares de cada aplicativo e a data abaixo.

## ClassAtelier

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
