# Bibliotecas incluídas nos pacotes exportados

Estes arquivos são copiados para dentro dos pacotes .zip (HTML, SCORM, curso) para que as aulas abram **sem depender de servidores externos** (unpkg, cdnjs), mesmo com a rede da instituição bloqueando esses endereços.

| Arquivo | Versão | Licença |
|---|---|---|
| react.production.min.js | React 18.3.1 | MIT |
| react-dom.production.min.js | React DOM 18.3.1 | MIT |
| babel.min.js | @babel/standalone 7.29.0 | MIT |
| katex/ | KaTeX 0.19.1 (fórmulas; só woff2) | MIT — veja katex/LICENSE.txt. Entra no pacote só se a aula tiver equação |
| fontawesome/ | Font Awesome Free 6.5.2 (só woff2) | ícones CC BY 4.0, fontes SIL OFL 1.1, código MIT — veja fontawesome/LICENSE.txt |

Para atualizar, troque os arquivos e ajuste a lista em `export.jsx` (`VENDOR_FILES`).
