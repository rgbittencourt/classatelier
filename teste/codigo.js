/* ClassAtelier — bloco «Código».
 * Componente global (sem Babel) usado pelo editor e pelas aulas exportadas.
 * O código é guardado como TEXTO puro (props.code) com a linguagem (props.language). O destaque de
 * sintaxe é só visual: um analisador léxico simples transforma o texto em <span>s; nada é executado.
 * Editor: uma <textarea> transparente sobre o código destacado (mesma fonte e métricas), com Tab,
 * Enter com recuo e saída do bloco por Ctrl/⌘+Enter ou pelo botão «Continuar o texto».
 */
(function () {
  var LANGS = [
    ["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["html", "HTML"], ["css", "CSS"],
    ["sql", "SQL"], ["java", "Java"], ["c", "C"], ["cpp", "C++"], ["csharp", "C#"], ["php", "PHP"], ["json", "JSON"],
    ["xml", "XML"], ["bash", "Bash"], ["text", "Texto simples"]
  ];
  var LANG_LABEL = {}; LANGS.forEach(function (l) { LANG_LABEL[l[0]] = l[1]; });

  // ───────────── Estilos (claro e escuro) ─────────────
  var CSS = [
    ".aula-code{--c-bg:#f6f8fa;--c-head:#eaeef2;--c-line:#d0d7de;--c-ink:#1f2328;--c-mute:#6e7781;--c-kw:#cf222e;--c-str:#0a3069;--c-com:#6e7781;--c-num:#0550ae;--c-fn:#8250df;--c-type:#953800;--c-op:#cf222e;--c-tag:#116329;--c-attr:#0550ae;--c-var:#953800;--c-meta:#8250df;--c-sel:rgba(84,174,255,.35);",
    "margin:.6em 0;border:1px solid var(--c-line);border-radius:10px;background:var(--c-bg);color:var(--c-ink);overflow:hidden;max-width:100%;text-align:left}",
    ".aula-code--escuro{--c-bg:#0d1117;--c-head:#161b22;--c-line:#30363d;--c-ink:#e6edf3;--c-mute:#8b949e;--c-kw:#ff7b72;--c-str:#a5d6ff;--c-com:#8b949e;--c-num:#79c0ff;--c-fn:#d2a8ff;--c-type:#ffa657;--c-op:#ff7b72;--c-tag:#7ee787;--c-attr:#79c0ff;--c-var:#ffa657;--c-meta:#d2a8ff;--c-sel:rgba(56,139,253,.4)}",
    "@media (prefers-color-scheme:dark){.aula-code--auto{--c-bg:#0d1117;--c-head:#161b22;--c-line:#30363d;--c-ink:#e6edf3;--c-mute:#8b949e;--c-kw:#ff7b72;--c-str:#a5d6ff;--c-com:#8b949e;--c-num:#79c0ff;--c-fn:#d2a8ff;--c-type:#ffa657;--c-op:#ff7b72;--c-tag:#7ee787;--c-attr:#79c0ff;--c-var:#ffa657;--c-meta:#d2a8ff;--c-sel:rgba(56,139,253,.4)}}",
    ".aula-code__head{display:flex;align-items:center;gap:10px;min-height:36px;padding:4px 8px 4px 14px;background:var(--c-head);border-bottom:1px solid var(--c-line);font:600 12px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--c-mute)}",
    ".aula-code__lang{letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}",
    ".aula-code__title{color:var(--c-ink);font-weight:500;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}",
    ".aula-code__sp{flex:1}",
    ".aula-code__btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--c-line);border-radius:7px;background:transparent;color:var(--c-ink);font:600 12px system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer;white-space:nowrap}",
    ".aula-code__btn:hover{background:var(--c-bg)}.aula-code__btn:focus-visible{outline:2px solid #2f81f7;outline-offset:1px}",
    ".aula-code__select{height:28px;border:1px solid var(--c-line);border-radius:7px;background:var(--c-bg);color:var(--c-ink);font:600 12px system-ui,sans-serif;padding:0 6px}",
    ".aula-code__body{position:relative;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}",
    ".aula-code pre,.aula-code textarea{margin:0;padding:12px 16px;font:13.5px/1.6 ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;letter-spacing:0;tab-size:var(--c-tab,4);-moz-tab-size:var(--c-tab,4);white-space:pre;word-wrap:normal;border:0;box-sizing:border-box}",
    ".aula-code pre{color:var(--c-ink);background:transparent;min-width:100%;width:max-content}",
    ".aula-code--wrap pre,.aula-code--wrap textarea{white-space:pre-wrap;word-break:break-word;width:auto}",
    ".aula-code code{font:inherit;background:none;padding:0;color:inherit}",
    ".aula-code__ln{display:block;min-height:1.6em}",
    ".aula-code--num .aula-code__ln{position:relative;padding-left:var(--c-gutter,3.2em)}",
    ".aula-code--num pre{counter-reset:aula-code-ln var(--c-start,0)}",
    ".aula-code--num .aula-code__ln::before{counter-increment:aula-code-ln;content:counter(aula-code-ln);position:absolute;left:0;width:calc(var(--c-gutter,3.2em) - 1.1em);text-align:right;color:var(--c-mute);opacity:.75;-webkit-user-select:none;user-select:none}",
    ".aula-code ::selection{background:var(--c-sel)}",
    ".aula-code .tk-kw{color:var(--c-kw)}.aula-code .tk-str{color:var(--c-str)}.aula-code .tk-com{color:var(--c-com);font-style:italic}.aula-code .tk-num{color:var(--c-num)}",
    ".aula-code .tk-fn{color:var(--c-fn)}.aula-code .tk-type{color:var(--c-type)}.aula-code .tk-op{color:var(--c-op)}.aula-code .tk-tag{color:var(--c-tag)}.aula-code .tk-attr{color:var(--c-attr)}",
    ".aula-code .tk-var{color:var(--c-var)}.aula-code .tk-meta{color:var(--c-meta)}.aula-code .tk-prop{color:var(--c-attr)}.aula-code .tk-const{color:var(--c-num)}",
    /* editor */
    ".aula-code__edit{position:relative;min-width:100%;width:max-content}",
    ".aula-code--wrap .aula-code__edit{width:auto}",
    ".aula-code__edit pre{pointer-events:none}",
    ".aula-code__edit textarea{position:absolute;inset:0;width:100%;height:100%;resize:none;overflow:hidden;background:transparent;color:transparent;-webkit-text-fill-color:transparent;caret-color:var(--c-ink);outline:none}",
    ".aula-code--num .aula-code__edit textarea{padding-left:calc(16px + var(--c-gutter,3.2em))}",
    ".aula-code__edit textarea::selection{background:var(--c-sel);-webkit-text-fill-color:transparent}",
    ".aula-code__hint{padding:6px 14px;border-top:1px solid var(--c-line);font:12px/1.4 system-ui,sans-serif;color:var(--c-mute)}",
    ".aula-code__hint kbd{font:600 11px ui-monospace,monospace;border:1px solid var(--c-line);border-bottom-width:2px;border-radius:4px;padding:0 4px;background:var(--c-bg)}",
    ".aula-code__sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(1px,1px,1px,1px);white-space:nowrap}",
    "@media (max-width:560px){.aula-code pre,.aula-code textarea{font-size:12.5px;padding:10px 12px}.aula-code--num .aula-code__edit textarea{padding-left:calc(12px + var(--c-gutter,3.2em))}.aula-code__btn span{display:none}}",
    "@media print{.aula-code{break-inside:avoid;border-color:#999}.aula-code pre{white-space:pre-wrap;width:auto}.aula-code__btn,.aula-code__hint{display:none}}"
  ].join("\n");

  function injectCss() {
    if (document.getElementById("aula-codigo-css")) return;
    var st = document.createElement("style"); st.id = "aula-codigo-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }
  injectCss();

  // ───────────── Analisador léxico ─────────────
  function words(s) { var o = {}; s.split(/\s+/).forEach(function (w) { if (w) o[w] = true; }); return o; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var C_LIKE_OPS = /(?:>>>=|<<=|>>=|===|!==|\*\*=|&&=|\|\|=|\?\?=|=>|->|::|\+\+|--|&&|\|\||\?\?|<=|>=|==|!=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|[+\-*\/%=<>!&|^~?:])/y;
  var NUM = /(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?)[a-zA-Z]*/y;
  var IDENT = /[A-Za-z_$][\w$]*/y;

  var DEFS = {
    python: {
      lineComment: "#", strings: ["'''", '"""', "'", '"'], stringPrefix: /[rRbBuUfF]{1,2}(?=['"])/y,
      keywords: words("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case"),
      consts: words("True False None"), types: words("int float str bool list dict tuple set bytes object type Exception ValueError TypeError KeyError IndexError"),
      builtins: words("print len range input open enumerate zip map filter sorted sum min max abs round isinstance super self cls"),
      decorator: true, ops: /(?:\*\*=|\/\/=|->|:=|\*\*|\/\/|<<|>>|<=|>=|==|!=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|[+\-*\/%=<>&|^~@])/y
    },
    javascript: {
      lineComment: "//", blockComment: ["/*", "*/"], strings: ["`", "'", '"'],
      keywords: words("async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield get set"),
      consts: words("true false null undefined NaN Infinity"), types: words("Array Object String Number Boolean Promise Map Set Date RegExp Error JSON Math Symbol BigInt"),
      builtins: words("console window document globalThis require module exports"), ops: C_LIKE_OPS
    },
    java: {
      lineComment: "//", blockComment: ["/*", "*/"], strings: ['"""', '"', "'"], annotation: true,
      keywords: words("abstract assert break case catch class continue default do else enum extends final finally for if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while var record yield sealed permits non-sealed"),
      consts: words("true false null"), types: words("int long short byte char boolean float double void String Integer Long Double Float Boolean Character Object List ArrayList Map HashMap Set HashSet System Exception"),
      ops: C_LIKE_OPS
    },
    c: {
      lineComment: "//", blockComment: ["/*", "*/"], strings: ['"', "'"], preprocessor: true,
      keywords: words("auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while _Bool _Complex"),
      consts: words("NULL true false EOF stdin stdout stderr"), types: words("int long short char float double void signed unsigned size_t FILE bool uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t"),
      builtins: words("printf scanf malloc calloc realloc free strlen strcpy strcmp memcpy memset fopen fclose fprintf puts gets getchar putchar exit"), ops: C_LIKE_OPS
    },
    cpp: {
      lineComment: "//", blockComment: ["/*", "*/"], strings: ['"', "'"], preprocessor: true,
      keywords: words("alignas alignof and asm auto break case catch class const constexpr const_cast continue decltype default delete do dynamic_cast else enum explicit export extern for friend goto if inline mutable namespace new noexcept not operator or private protected public register reinterpret_cast return sizeof static static_assert static_cast struct switch template this thread_local throw try typedef typeid typename union using virtual volatile while override final co_await co_return co_yield concept requires"),
      consts: words("true false nullptr NULL"), types: words("int long short char float double void bool signed unsigned size_t wchar_t string vector map set unordered_map pair std"),
      builtins: words("cout cin cerr endl printf"), ops: C_LIKE_OPS
    },
    csharp: {
      lineComment: "//", blockComment: ["/*", "*/"], strings: ['@"', '$"', '"', "'"], preprocessor: true, attributeBrackets: true,
      keywords: words("abstract as base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using virtual volatile while async await var get set init record yield where when"),
      consts: words("true false null"), types: words("int long short byte sbyte char bool float double decimal void string object uint ulong ushort dynamic List Dictionary Task Console String Exception"),
      ops: C_LIKE_OPS
    },
    php: {
      lineComment: "//", hashComment: true, blockComment: ["/*", "*/"], strings: ['"', "'"], variables: /\$[A-Za-z_]\w*/y,
      keywords: words("abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield"),
      consts: words("true false null TRUE FALSE NULL"), types: words("int float string bool array object void mixed self parent"), ops: C_LIKE_OPS, phpTags: true
    },
    sql: {
      lineComment: "--", blockComment: ["/*", "*/"], strings: ["'"], quotedIdent: true, caseInsensitive: true,
      keywords: words("select from where and or not in is null like between as join inner left right full outer cross on using group by order having limit offset union all distinct insert into values update set delete create table view index drop alter add column primary key foreign references unique default check constraint exists case when then else end asc desc with recursive returning begin commit rollback transaction grant revoke truncate explain analyze if replace procedure function trigger declare cascade"),
      consts: words("true false null"), types: words("int integer bigint smallint decimal numeric real float double varchar char text date time timestamp boolean serial blob json jsonb uuid"),
      builtins: words("count sum avg min max coalesce nullif cast now concat substring length upper lower round abs row_number rank dense_rank over partition"),
      ops: /(?:<>|<=|>=|!=|\|\||::|[+\-*\/%=<>])/y
    },
    bash: {
      hashComment: true, strings: ['"', "'"], variables: /\$(?:\{[^}\n]*\}|\(\(?|[A-Za-z_]\w*|[0-9#?@*$!-])/y,
      keywords: words("if then else elif fi for while until do done case esac in function select return break continue local export readonly declare unset shift source alias time"),
      consts: words("true false"), builtins: words("echo printf cd ls pwd cat grep sed awk find mkdir rm cp mv chmod chown touch sudo apt pip npm git curl wget read test exit tar ssh python python3 node"),
      ops: /(?:&&|\|\||;;|>>|<<|[|&;<>=!])/y
    },
    json: { strings: ['"'], jsonKeys: true, consts: words("true false null"), ops: /[:,]/y }
  };
  DEFS.typescript = Object.assign({}, DEFS.javascript, {
    keywords: Object.assign({}, DEFS.javascript.keywords, words("interface type enum implements private protected public readonly abstract declare namespace module keyof infer is as satisfies override")),
    types: Object.assign({}, DEFS.javascript.types, words("string number boolean any unknown never void object bigint symbol Record Partial Readonly Pick Omit")),
    decorator: true
  });

  // Lê uma string a partir de i, com o delimitador `q`, respeitando escapes (exceto em strings "cruas").
  function readString(src, i, q, raw) {
    var j = i + q.length, close = q.length > 1 && q !== '@"' && q !== '$"' ? q : q.charAt(q.length - 1);
    while (j < src.length) {
      var ch = src.charAt(j);
      if (!raw && ch === "\\") { j += 2; continue; }
      if (src.substr(j, close.length) === close) { if (q === '@"' && src.charAt(j + 1) === '"') { j += 2; continue; } return j + close.length; }
      if (close.length === 1 && close !== "`" && ch === "\n" && q !== '@"') return j; // string simples não atravessa linha
      j++;
    }
    return src.length;
  }

  function sticky(re, src, i) { re.lastIndex = i; var m = re.exec(src); return m && m.index === i ? m[0] : null; }

  // Linguagens "C-like" e afins: devolve [{t: tipo, v: texto}].
  function tokenizeGeneric(src, d) {
    var out = [], i = 0, n = src.length, plain = "";
    function push(t, v) { if (plain) { out.push({ t: "", v: plain }); plain = ""; } out.push({ t: t, v: v }); }
    var lineStart = true;
    while (i < n) {
      var ch = src.charAt(i), m;
      if (ch === "\n") { plain += ch; i++; lineStart = true; continue; }
      if (d.phpTags && (m = sticky(/<\?(?:php|=)?|\?>/y, src, i))) { push("meta", m); i += m.length; lineStart = false; continue; }
      if (d.preprocessor && lineStart && ch === "#") { var e0 = src.indexOf("\n", i); e0 = e0 < 0 ? n : e0; push("meta", src.slice(i, e0)); i = e0; continue; }
      if (ch !== " " && ch !== "\t") lineStart = false;
      if (d.lineComment && src.substr(i, d.lineComment.length) === d.lineComment) { var e1 = src.indexOf("\n", i); e1 = e1 < 0 ? n : e1; push("com", src.slice(i, e1)); i = e1; continue; }
      if (d.hashComment && ch === "#" && (d === DEFS.php ? src.charAt(i + 1) !== "[" : (i === 0 || /[\s;|&(]/.test(src.charAt(i - 1))))) {
        var e2 = src.indexOf("\n", i); e2 = e2 < 0 ? n : e2; push(i === 0 && src.charAt(i + 1) === "!" ? "meta" : "com", src.slice(i, e2)); i = e2; continue;
      }
      if (d.blockComment && src.substr(i, d.blockComment[0].length) === d.blockComment[0]) { var e3 = src.indexOf(d.blockComment[1], i + 2); e3 = e3 < 0 ? n : e3 + d.blockComment[1].length; push("com", src.slice(i, e3)); i = e3; continue; }
      if (d.stringPrefix && (m = sticky(d.stringPrefix, src, i))) {
        var after = i + m.length, raw = /r/i.test(m);
        var q0 = (d.strings || []).filter(function (q) { return src.substr(after, q.length) === q; })[0];
        if (q0) { var e4 = readString(src, after, q0, raw); push("str", src.slice(i, e4)); i = e4; continue; }
      }
      var q = (d.strings || []).filter(function (s) { return src.substr(i, s.length) === s; })[0];
      if (q) { var e5 = readString(src, i, q, q === '@"'); var sv = src.slice(i, e5); if (d.jsonKeys && /^\s*:/.test(src.slice(e5, e5 + 20))) push("prop", sv); else push("str", sv); i = e5; continue; }
      if (d.quotedIdent && (ch === '"' || ch === "`")) { var e6 = src.indexOf(ch, i + 1); e6 = e6 < 0 ? n : e6 + 1; push("var", src.slice(i, e6)); i = e6; continue; }
      if (d.variables && (m = sticky(d.variables, src, i))) { push("var", m); i += m.length; continue; }
      if ((d.decorator || d.annotation) && ch === "@" && (m = sticky(/@[A-Za-z_][\w.]*/y, src, i))) { push("meta", m); i += m.length; continue; }
      if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src.charAt(i + 1)))) { if ((m = sticky(NUM, src, i))) { push("num", m); i += m.length; continue; } }
      if ((m = sticky(IDENT, src, i))) {
        var w = d.caseInsensitive ? m.toLowerCase() : m, next = src.slice(i + m.length).match(/^\s*\(/);
        var t = d.keywords && d.keywords[w] ? "kw" : d.consts && d.consts[w] ? "const" : d.types && d.types[w] ? "type" : d.builtins && d.builtins[w] ? "fn" : next ? "fn" : (/^[A-Z][a-z0-9]+[A-Z]?\w*$/.test(m) && !d.caseInsensitive && d !== DEFS.bash ? "type" : "");
        if (t) push(t, m); else plain += m;
        i += m.length; continue;
      }
      if (d.ops && (m = sticky(d.ops, src, i))) { push("op", m); i += m.length; continue; }
      plain += ch; i++;
    }
    if (plain) out.push({ t: "", v: plain });
    return out;
  }

  // CSS: seletores, propriedades, valores, @regras, cores e unidades.
  function tokenizeCss(src) {
    var out = [], i = 0, n = src.length, inValue = false, plain = "", m;
    function push(t, v) { if (plain) { out.push({ t: "", v: plain }); plain = ""; } out.push({ t: t, v: v }); }
    // Uma declaração (propriedade: valor) termina em ";" ou "}" antes de abrir "{"; um seletor abre "{".
    function isDeclaration(at) { for (var k = at; k < n; k++) { var c = src.charAt(k); if (c === "{") return false; if (c === ";" || c === "}") return true; } return true; }
    while (i < n) {
      var ch = src.charAt(i);
      if (src.substr(i, 2) === "/*") { var e = src.indexOf("*/", i + 2); e = e < 0 ? n : e + 2; push("com", src.slice(i, e)); i = e; continue; }
      if (ch === '"' || ch === "'") { var e2 = readString(src, i, ch, false); push("str", src.slice(i, e2)); i = e2; continue; }
      if (ch === "{" || ch === "}" || ch === ";") { inValue = false; push("op", ch); i++; continue; }
      if (ch === "@" && (m = sticky(/@[\w-]+/y, src, i))) { push("kw", m); i += m.length; continue; }
      if (!inValue && (m = sticky(/-{0,2}[A-Za-z_][\w-]*(?=\s*:)/y, src, i)) && isDeclaration(i)) { push("prop", m); i += m.length; var c2 = sticky(/\s*:/y, src, i); push("op", c2); i += c2.length; inValue = true; continue; }
      if (inValue) {
        if ((m = sticky(/#[0-9a-fA-F]{3,8}\b/y, src, i))) { push("num", m); i += m.length; continue; }
        if ((m = sticky(/-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/y, src, i))) { push("num", m); i += m.length; continue; }
        if ((m = sticky(/!important/y, src, i))) { push("kw", m); i += m.length; continue; }
        if ((m = sticky(/[A-Za-z-]+(?=\()/y, src, i))) { push("fn", m); i += m.length; continue; }
      } else {
        if ((m = sticky(/[.#][A-Za-z_][\w-]*|::?[A-Za-z-]+(?:\([^)\n]*\))?|\[[^\]\n]*\]/y, src, i))) { push("tag", m); i += m.length; continue; }
        if ((m = sticky(/-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/y, src, i))) { push("num", m); i += m.length; continue; }
        if ((m = sticky(/[A-Za-z][\w-]*/y, src, i))) { push("type", m); i += m.length; continue; }
      }
      plain += ch; i++;
    }
    if (plain) out.push({ t: "", v: plain });
    return out;
  }

  // HTML/XML: comentários, doctype, CDATA, tags com atributos; <script>/<style> com JS/CSS.
  function tokenizeMarkup(src, isHtml) {
    var out = [], i = 0, n = src.length, plain = "", m;
    function flush() { if (plain) { out.push({ t: "", v: plain }); plain = ""; } }
    function push(t, v) { flush(); out.push({ t: t, v: v }); }
    while (i < n) {
      if (src.substr(i, 4) === "<!--") { var e = src.indexOf("-->", i + 4); e = e < 0 ? n : e + 3; push("com", src.slice(i, e)); i = e; continue; }
      if (src.substr(i, 9) === "<![CDATA[") { var e1 = src.indexOf("]]>", i); e1 = e1 < 0 ? n : e1 + 3; push("str", src.slice(i, e1)); i = e1; continue; }
      if ((m = sticky(/<[!?][^>]*>?/y, src, i))) { push("meta", m); i += m.length; continue; }
      if ((m = sticky(/<\/?[A-Za-z][\w:.-]*/y, src, i))) {
        var tagName = m.replace(/^<\/?/, "").toLowerCase(), closing = m.charAt(1) === "/";
        push("tag", m); i += m.length;
        while (i < n && src.charAt(i) !== ">" && src.substr(i, 2) !== "/>") {
          var a;
          if ((a = sticky(/\s+/y, src, i))) { plain += a; i += a.length; continue; }
          if ((a = sticky(/[^\s=>"'/]+/y, src, i))) { push("attr", a); i += a.length; continue; }
          if (src.charAt(i) === "=") { push("op", "="); i++; continue; }
          if (src.charAt(i) === '"' || src.charAt(i) === "'") { var q = src.charAt(i), e2 = src.indexOf(q, i + 1); e2 = e2 < 0 ? n : e2 + 1; push("str", src.slice(i, e2)); i = e2; continue; }
          plain += src.charAt(i); i++;
        }
        if (src.substr(i, 2) === "/>") { push("tag", "/>"); i += 2; }
        else if (src.charAt(i) === ">") { push("tag", ">"); i++; }
        if (isHtml && !closing && (tagName === "script" || tagName === "style")) {
          var endRe = new RegExp("</" + tagName + "\\s*>", "i"), rest = src.slice(i), idx = rest.search(endRe), inner = idx < 0 ? rest : rest.slice(0, idx);
          flush();
          out.push.apply(out, tagName === "style" ? tokenizeCss(inner) : tokenizeGeneric(inner, DEFS.javascript));
          i += inner.length;
        }
        continue;
      }
      if ((m = sticky(/&[#\w]+;/y, src, i))) { push("const", m); i += m.length; continue; }
      plain += src.charAt(i); i++;
    }
    flush();
    return out;
  }

  function tokenize(code, lang) {
    var src = String(code == null ? "" : code).replace(/\r\n?/g, "\n");
    if (lang === "html") return tokenizeMarkup(src, true);
    if (lang === "xml") return tokenizeMarkup(src, false);
    if (lang === "css") return tokenizeCss(src);
    var d = DEFS[lang];
    return d ? tokenizeGeneric(src, d) : [{ t: "", v: src }];
  }

  // Tokens → HTML por linha (os spans são fechados e reabertos em cada quebra, para numerar linhas).
  function highlightLines(code, lang) {
    var lines = [""];
    tokenize(code, lang).forEach(function (tk) {
      var parts = tk.v.split("\n");
      parts.forEach(function (part, k) {
        if (k > 0) lines.push("");
        if (part) lines[lines.length - 1] += tk.t ? '<span class="tk-' + tk.t + '">' + esc(part) + "</span>" : esc(part);
      });
    });
    return lines;
  }
  function highlight(code, lang) { return highlightLines(code, lang).join("\n"); }

  // ───────────── Componentes ─────────────
  function linesMarkup(code, lang) {
    return highlightLines(code, lang).map(function (l) { return '<span class="aula-code__ln">' + (l || "​") + "</span>"; }).join("");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext !== false) return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
  }

  function blockClass(props) {
    var ap = props.appearance === "escuro" ? " aula-code--escuro" : props.appearance === "auto" ? " aula-code--auto" : "";
    return "aula-code" + ap + (props.showLineNumbers !== false ? " aula-code--num" : "") + (props.wrap ? " aula-code--wrap" : "");
  }
  function blockStyle(props, code) {
    var count = String(code || "").split("\n").length + Math.max(0, (Number(props.startLine) || 1) - 1);
    var digits = String(Math.max(1, count)).length;
    return { "--c-tab": Math.max(1, Math.min(8, Number(props.tabSize) || 4)), "--c-start": Math.max(0, (Number(props.startLine) || 1) - 1), "--c-gutter": (digits + 2.2) + "ch" };
  }

  function CopyButton(props) {
    var h = React.createElement, st = React.useState(false), copied = st[0], setCopied = st[1];
    return h("button", {
      type: "button", className: "aula-code__btn", "aria-label": copied ? "Código copiado" : "Copiar código", title: "Copiar código",
      onClick: function (e) { e.stopPropagation(); copyText(props.text).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 1800); }); }
    }, h("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": "true" },
      copied ? h("path", { d: "M20 6 9 17l-5-5" }) : [h("rect", { key: 1, x: 9, y: 9, width: 13, height: 13, rx: 2 }), h("path", { key: 2, d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })]),
      h("span", null, copied ? "Copiado!" : "Copiar código"));
  }

  // Visualização (aula exportada e modo Visualizar): somente leitura, com seleção e cópia.
  function Codigo(props) {
    var h = React.createElement, lang = LANG_LABEL[props.language] ? props.language : "text", code = String(props.code == null ? "" : props.code);
    var label = props.ariaLabel || ("Código em " + LANG_LABEL[lang] + (props.title ? ": " + props.title : ""));
    return h("figure", { className: blockClass(props), style: blockStyle(props, code), role: "group", "aria-label": label },
      h("div", { className: "aula-code__head" },
        h("span", { className: "aula-code__lang" }, LANG_LABEL[lang]),
        props.title ? h("span", { className: "aula-code__title" }, props.title) : null,
        h("span", { className: "aula-code__sp" }),
        h(CopyButton, { text: code })),
      h("div", { className: "aula-code__body", tabIndex: 0, "aria-label": "Rolagem do código" },
        h("pre", null, h("code", { className: "language-" + lang, dangerouslySetInnerHTML: { __html: linesMarkup(code, lang) } }))));
  }

  // Recuo da linha em que o cursor está.
  function lineIndent(value, pos) { var start = value.lastIndexOf("\n", pos - 1) + 1; return (/^[ \t]*/.exec(value.slice(start, pos)) || [""])[0]; }
  function insertAtCursor(ta, text) {
    ta.focus();
    var ok = false;
    try { ok = document.execCommand && document.execCommand("insertText", false, text); } catch (e) { ok = false; }
    if (!ok) { var s = ta.selectionStart, e2 = ta.selectionEnd; ta.setRangeText(text, s, e2, "end"); ta.dispatchEvent(new Event("input", { bubbles: true })); }
  }

  // Editor (modo Editar do ClassAtelier).
  function CodigoEditor(props) {
    var h = React.createElement, lang = LANG_LABEL[props.language] ? props.language : "text";
    var code = String(props.code == null ? "" : props.code);
    var taRef = React.useRef(null);
    var tab = Math.max(1, Math.min(8, Number(props.tabSize) || 4));
    var unit = props.useTabs ? "\t" : new Array(tab + 1).join(" ");
    var onKeyDown = function (e) {
      var ta = e.currentTarget, v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      e.stopPropagation(); // atalhos do editor (Delete remove bloco etc.) não valem dentro do código
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (props.onExit) props.onExit(); return; }
      if (e.key === "Escape") { ta.blur(); return; }
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        var ind = lineIndent(v, s), before = v.slice(0, s).replace(/[ \t]+$/, ""), last = before.charAt(before.length - 1);
        var opens = lang === "python" ? last === ":" : (last === "{" || last === "[" || last === "(" || (lang === "bash" && /\b(then|do)$/.test(before)));
        var extra = opens ? unit : "";
        var closer = v.charAt(en);
        if (opens && lang !== "python" && ((last === "{" && closer === "}") || (last === "[" && closer === "]") || (last === "(" && closer === ")"))) {
          insertAtCursor(ta, "\n" + ind + extra + "\n" + ind);
          var p = s + 1 + ind.length + extra.length; ta.setSelectionRange(p, p);
        } else insertAtCursor(ta, "\n" + ind + extra);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        var ls = v.lastIndexOf("\n", s - 1) + 1, multi = v.slice(s, en).indexOf("\n") >= 0;
        if (!multi && !e.shiftKey) { insertAtCursor(ta, unit); return; }
        var le = v.indexOf("\n", en - (en > s && v.charAt(en - 1) === "\n" ? 1 : 0)); le = le < 0 ? v.length : le;
        var block = v.slice(ls, le), lines = block.split("\n");
        var changed = lines.map(function (l) {
          if (!e.shiftKey) return unit + l;
          if (l.charAt(0) === "\t") return l.slice(1);
          var sp = (/^ */.exec(l) || [""])[0].length; return l.slice(Math.min(sp, tab));
        }).join("\n");
        ta.setSelectionRange(ls, le); insertAtCursor(ta, changed); ta.setSelectionRange(ls, ls + changed.length);
      }
    };
    return h("figure", { className: blockClass(props), style: blockStyle(props, code), role: "group", "aria-label": "Editor de código em " + LANG_LABEL[lang] },
      h("div", { className: "aula-code__head" },
        h("select", { className: "aula-code__select", value: lang, "aria-label": "Linguagem do código", onChange: function (e) { props.onLanguage && props.onLanguage(e.target.value); }, onClick: function (e) { e.stopPropagation(); } },
          LANGS.map(function (l) { return h("option", { key: l[0], value: l[0] }, l[1]); })),
        props.title ? h("span", { className: "aula-code__title" }, props.title) : null,
        h("span", { className: "aula-code__sp" }),
        h(CopyButton, { text: code }),
        props.onExit ? h("button", { type: "button", className: "aula-code__btn", title: "Sair do código e continuar escrevendo o texto abaixo (Ctrl/⌘ + Enter)", onClick: function (e) { e.stopPropagation(); props.onExit(); } },
          h("span", null, "Continuar o texto"), " ↵") : null),
      h("div", { className: "aula-code__body" },
        h("div", { className: "aula-code__edit" },
          h("pre", { "aria-hidden": "true" }, h("code", { dangerouslySetInnerHTML: { __html: linesMarkup(code, lang) } })),
          h("textarea", {
            ref: taRef, value: code, spellCheck: false, autoCapitalize: "off", autoComplete: "off", autoCorrect: "off", wrap: props.wrap ? "soft" : "off",
            "aria-label": "Código-fonte (" + LANG_LABEL[lang] + "). Tab recua, Enter mantém o recuo, Ctrl ou ⌘ + Enter sai do bloco.",
            placeholder: "Digite ou cole o código aqui…",
            onChange: function (e) { props.onChange && props.onChange(e.target.value); },
            onKeyDown: onKeyDown,
            onPaste: function (e) { e.stopPropagation(); }
          }))),
      h("div", { className: "aula-code__hint" }, h("kbd", null, "Tab"), " recua · ", h("kbd", null, "Enter"), " mantém o recuo · ", h("kbd", null, "Ctrl/⌘ + Enter"), " ou «Continuar o texto» sai do bloco"));
  }

  window.Codigo = Codigo;
  window.CodigoEditor = CodigoEditor;
  window.CODE_LANGUAGES = LANGS;
  window.highlightCode = highlight;
  window.tokenizeCode = tokenize;
})();
