/* eslint-disable */
// ClassAtelier — conferência de pacotes SCORM.
//
//  1) ScormCheck.validate(files)   — confere a ESTRUTURA do .zip (manifesto, arquivos, links, tamanho…)
//  2) ScormCheck.simulatorHtml(…)  — roda a aula dentro de uma "plataforma de mentira" (LMS simulado) e
//                                    registra tudo o que ela envia (Initialize, SetValue, Commit, Terminate…)
//
// O simulador roda num iframe isolado (sandbox, sem acesso à ferramenta): serve até para um .zip
// de origem desconhecida. O LMS de mentira vive DENTRO do iframe e avisa a janela por postMessage.
(function () {
  const NS12 = "http://www.imsproject.org/xsd/imscp_rootv1p1p2";
  const ADL12 = "http://www.adlnet.org/xsd/adlcp_rootv1p2";
  const NS2004 = "http://www.imsglobal.org/xsd/imscp_v1p1";
  const ADL2004 = "http://www.adlnet.org/xsd/adlcp_v1p3";

  const dec = new TextDecoder("utf-8");
  const text = (u8) => dec.decode(u8);
  const MB = 1048576;
  const sizeOf = (n) => (n < 1024 ? n + " B" : n < MB ? Math.round(n / 1024) + " KB" : (n / MB).toFixed(1) + " MB");

  async function readZip(source) {
    const zip = await JSZip.loadAsync(source);
    const files = new Map();
    for (const name of Object.keys(zip.files)) {
      const e = zip.files[name]; if (e.dir) continue;
      files.set(name, await e.async("uint8array"));
    }
    return files;
  }

  // caminho relativo (a partir de um arquivo) → caminho dentro do zip
  function resolve(fromFile, ref) {
    let r = ref; try { r = decodeURIComponent(ref); } catch (e) { /* mantém */ }
    const base = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")).split("/") : [];
    const parts = r.startsWith("/") ? r.slice(1).split("/") : base.concat(r.split("/"));
    const out = [];
    for (const p of parts) { if (!p || p === ".") continue; if (p === "..") out.pop(); else out.push(p); }
    return out.join("/");
  }
  const isLocalRef = (r) => r && !/^(data:|blob:|https?:|\/\/|mailto:|tel:|javascript:|#|about:)/i.test(r) && !/[{}$<>]/.test(r);

  // referências de um CSS: url(), @import
  function cssRefs(src) {
    const refs = []; let m;
    const url = /url\(\s*["']?([^"')\s]+)["']?\s*\)/gi;
    while ((m = url.exec(src))) refs.push(m[1]);
    const imp = /@import\s+["']([^"']+)["']/gi;
    while ((m = imp.exec(src))) refs.push(m[1]);
    return refs;
  }
  const stripQH = (r) => r.replace(/[?#].*$/, "");
  // referências de uma página HTML, lidas do DOM (ignora textos dentro de <script>)
  function htmlRefs(html) {
    const d = new DOMParser().parseFromString(html, "text/html");
    const all = [];
    d.querySelectorAll("[src],[href],[poster],[data-src]").forEach((el) => {
      if (el.tagName === "A") return; // links de navegação não são recursos
      ["src", "href", "poster", "data-src"].forEach((a) => { const v = el.getAttribute(a); if (v) all.push(v.trim()); });
    });
    d.querySelectorAll("style").forEach((st) => cssRefs(st.textContent).forEach((r) => all.push(r)));
    d.querySelectorAll("[style]").forEach((el) => cssRefs(el.getAttribute("style")).forEach((r) => all.push(r)));
    return {
      local: [...new Set(all.filter(isLocalRef).map(stripQH))],
      hosts: [...new Set(all.filter((r) => /^https?:\/\//i.test(r)).map((r) => { try { return new URL(r).hostname.toLowerCase(); } catch (e) { return ""; } }).filter(Boolean))],
    };
  }

  function validate(files) {
    const out = [];
    const add = (sev, id, title, detail, list) => out.push({ sev, id, title, detail: detail || "", list: list || null });
    const names = [...files.keys()];
    const total = names.reduce((n, k) => n + files.get(k).length, 0);

    // ── manifesto ──
    if (!files.has("imsmanifest.xml")) {
      add("error", "manifest-missing", "Falta o imsmanifest.xml na raiz do pacote", names.some((n) => n.endsWith("/imsmanifest.xml")) ? "Ele existe, mas dentro de uma pasta. Compacte o CONTEÚDO da pasta, não a pasta em si: o manifesto precisa estar na raiz do .zip." : "Sem esse arquivo o ambiente virtual não reconhece o .zip como SCORM.");
      return finish(out, files, total, null);
    }
    add("ok", "manifest-present", "imsmanifest.xml na raiz");
    const doc = new DOMParser().parseFromString(text(files.get("imsmanifest.xml")), "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
      add("error", "manifest-xml", "O imsmanifest.xml não é um XML válido", (doc.getElementsByTagName("parsererror")[0].textContent || "").replace(/\s+/g, " ").slice(0, 220));
      return finish(out, files, total, null);
    }
    add("ok", "manifest-xml", "imsmanifest.xml é um XML bem formado");
    const root = doc.documentElement;
    const L = (el, name) => [...el.getElementsByTagNameNS("*", name)];
    const ns = root.namespaceURI || "";
    const schemaversion = (L(root, "schemaversion")[0] || {}).textContent || "";
    let version = ns === NS12 ? "1.2" : ns === NS2004 ? "2004" : "";
    if (!version) add("error", "manifest-ns", "Versão do SCORM não reconhecida no manifesto", `O namespace «${ns}» não é o do SCORM 1.2 nem do SCORM 2004.`);
    else {
      add("ok", "manifest-version", `SCORM ${version === "2004" ? "2004 (4ª edição)" : "1.2"} detectado`);
      const declared = /2004/.test(schemaversion) ? "2004" : /1\.2/.test(schemaversion) ? "1.2" : "";
      if (declared && declared !== version) add("error", "manifest-schemaversion", "O manifesto se contradiz sobre a versão", `<schemaversion> diz «${schemaversion.trim()}», mas os namespaces são de SCORM ${version}. Algumas plataformas recusam o pacote.`);
      const adlNs = version === "1.2" ? ADL12 : ADL2004;
      if (!(root.getAttribute("xmlns:adlcp") === adlNs)) add("warn", "manifest-adlcp", "Namespace adlcp ausente ou de outra versão", `Para SCORM ${version} o esperado é xmlns:adlcp="${adlNs}".`);
    }
    if (!/^[A-Za-z_][\w.\-]*$/.test(root.getAttribute("identifier") || "")) add("warn", "manifest-id", "Identificador do manifesto inválido", "O atributo identifier deve começar com letra e não ter espaços.");

    // ── organizações, itens, recursos ──
    const orgs = L(root, "organization");
    const defOrg = (L(root, "organizations")[0] || {}).getAttribute ? L(root, "organizations")[0].getAttribute("default") : "";
    if (!orgs.length) add("error", "org-missing", "O manifesto não tem nenhuma organização", "É dela que sai a lista de aulas do pacote.");
    else if (defOrg && !orgs.some((o) => o.getAttribute("identifier") === defOrg)) add("error", "org-default", "A organização padrão não existe", `organizations default="${defOrg}" não corresponde a nenhuma <organization>.`);
    else add("ok", "org", `Organização «${((L(orgs[0], "title")[0] || {}).textContent || "").trim() || "sem título"}»`);

    const items = L(root, "item");
    const resources = L(root, "resource");
    const resById = new Map(resources.map((r) => [r.getAttribute("identifier"), r]));
    const allIds = [...L(root, "item"), ...resources, ...orgs].map((e) => e.getAttribute("identifier")).filter(Boolean);
    const dups = allIds.filter((id, i) => allIds.indexOf(id) !== i);
    if (dups.length) add("error", "ids-dup", "Identificadores repetidos no manifesto", "Cada item, recurso e organização precisa de um identifier único.", [...new Set(dups)]);
    else add("ok", "ids-unique", "Identificadores únicos");

    const leafItems = items.filter((i) => !L(i, "item").length && i.getAttribute("identifierref"));
    if (!leafItems.length) add("error", "items-none", "Nenhum item de aprendizagem aponta para um recurso", "Os <item> precisam de identifierref apontando para um <resource>.");
    items.forEach((it) => {
      if (!((L(it, "title")[0] || {}).textContent || "").trim()) add("warn", "item-title", "Item sem título", `O item ${it.getAttribute("identifier")} não tem <title>: aparece em branco no menu da plataforma.`);
      const ref = it.getAttribute("identifierref");
      if (ref && !resById.has(ref)) add("error", "item-ref", "Item aponta para um recurso que não existe", `identifierref="${ref}" não existe em <resources>.`);
    });
    if (leafItems.length) add("ok", "items", `${leafItems.length} aula${leafItems.length === 1 ? "" : "s"} (SCO) no menu do pacote`);

    const launchFiles = [];
    resources.forEach((r) => {
      const id = r.getAttribute("identifier"), href = r.getAttribute("href");
      const stAttr = version === "2004" ? "adlcp:scormType" : "adlcp:scormtype";
      const st = r.getAttribute(stAttr) || r.getAttributeNS(version === "2004" ? ADL2004 : ADL12, version === "2004" ? "scormType" : "scormtype");
      if (!st) {
        const wrong = r.getAttribute(version === "2004" ? "adlcp:scormtype" : "adlcp:scormType");
        add("error", "res-scormtype", `Recurso ${id}: falta ${stAttr}`, wrong ? `Existe «${version === "2004" ? "adlcp:scormtype" : "adlcp:scormType"}», mas a grafia certa para SCORM ${version} é «${stAttr}» (maiúsculas importam).` : "Sem ele a plataforma não sabe se o recurso é uma aula (sco) ou material de apoio (asset).");
      } else if (!/^(sco|asset)$/.test(st)) add("error", "res-scormtype", `Recurso ${id}: scormtype inválido`, `«${st}» — use "sco" ou "asset".`);
      if (href) {
        launchFiles.push(href);
        if (!files.has(resolve("", href).replace(/\?.*$/, ""))) add("error", "res-href", `Recurso ${id}: arquivo de abertura não existe`, `href="${href}" não está no .zip.`);
      } else add("error", "res-href", `Recurso ${id}: falta href`, "O recurso precisa indicar o arquivo que abre a aula.");
      const missing = L(r, "file").map((f) => f.getAttribute("href")).filter((h) => h && !files.has(resolve("", h)));
      if (missing.length) add("error", "file-missing", `Recurso ${id}: arquivos listados que não estão no .zip`, "O manifesto declara estes arquivos, mas eles não existem no pacote.", missing.slice(0, 12).concat(missing.length > 12 ? ["…e mais " + (missing.length - 12)] : []));
    });
    if (resources.length && !out.some((o) => o.id === "file-missing" || o.id === "res-href")) add("ok", "res-files", "Todos os arquivos declarados existem no .zip");

    // mastery score (1.2)
    if (version === "1.2") {
      L(root, "masteryscore").forEach((m) => {
        const v = parseFloat(m.textContent);
        if (isNaN(v) || v < 0 || v > 100) add("error", "mastery", "Nota mínima fora de 0–100", `masteryscore = «${m.textContent}».`);
        else add("info", "mastery", `Nota mínima de aprovação no manifesto: ${v}`, "A aula envia a nota em escala 0–10 e já informa aprovado/reprovado por conta própria; confira na plataforma se a nota final sai como esperado.");
      });
    }

    // ── conteúdo das páginas de abertura ──
    const launchPaths = [...new Set(launchFiles.map((h) => resolve("", h)))].filter((p) => files.has(p));
    const broken = new Map(); const hosts = new Set(); let hasBridge = 0, noTitle = 0, noLang = 0;
    const seenCss = new Set();
    const checkCss = (cp) => {
      if (seenCss.has(cp) || !files.has(cp)) return; seenCss.add(cp);
      cssRefs(text(files.get(cp))).forEach((r) => {
        if (/^https?:\/\//i.test(r)) { try { hosts.add(new URL(r).hostname.toLowerCase()); } catch (e) {} return; }
        if (!isLocalRef(r)) return;
        const t = resolve(cp, stripQH(r)); if (!files.has(t) && !broken.has(t)) broken.set(t, cp);
      });
    };
    launchPaths.forEach((p) => {
      const html = text(files.get(p));
      const refs = htmlRefs(html);
      refs.local.forEach((r) => { const t = resolve(p, r); if (!files.has(t) && !broken.has(t)) broken.set(t, p); });
      refs.local.filter((r) => /\.css$/i.test(r)).forEach((r) => checkCss(resolve(p, r)));
      refs.hosts.forEach((h) => { if (!/(^|\.)(w3|imsglobal|adlnet|imsproject)\.org$/.test(h)) hosts.add(h); });
      if (/API_1484_11|LMSInitialize|AulaSCORM/.test(html)) hasBridge += 1;
      if (!/<title>[^<]*\S[^<]*<\/title>/i.test(html)) noTitle += 1;
      if (!/<html[^>]*\blang=/i.test(html)) noLang += 1;
    });
    if (launchPaths.length) {
      if (broken.size) add("error", "refs-broken", "Há referências a arquivos que não estão no .zip", "A página aponta para estes caminhos, mas eles não existem no pacote: imagens, fontes ou estilos aparecem quebrados na plataforma.", [...broken.keys()].slice(0, 12).concat(broken.size > 12 ? ["…e mais " + (broken.size - 12)] : []));
      else add("ok", "refs-ok", "Imagens, fontes e estilos referenciados existem no pacote");
      if (!hasBridge) add("error", "bridge", "A aula não se comunica com a plataforma", "Não encontrei o código SCORM (API_1484_11 / LMSInitialize) na página de abertura. Sem ele, a plataforma nunca registra a conclusão.");
      else add("ok", "bridge", "Código de comunicação SCORM presente");
      if (noTitle) add("warn", "html-title", "Página sem <title>", "Preencha o título da aula.");
      if (noLang) add("tip", "html-lang", "Página sem idioma (lang)", "Acessibilidade: leitores de tela usam o atributo lang para escolher a pronúncia.");
      const cdn = [...hosts].filter((h) => /(googleapis|gstatic|cdnjs|jsdelivr|unpkg|fontawesome|bootstrapcdn|cloudflare)/.test(h));
      const media = [...hosts].filter((h) => /(youtube|youtu\.be|ytimg|spotify|vimeo)/.test(h));
      if (cdn.length) add("warn", "external-cdn", "A aula depende de bibliotecas baixadas da internet", "Estilos, ícones ou o código-base da aula (React) são carregados de servidores externos. Sem internet, ou se a rede da instituição bloquear esses endereços, a aula não abre. Teste dentro da rede do IFSC.", cdn);
      if (media.length) add("info", "external-media", "Mídias externas (vídeo/áudio)", "Vídeos e podcasts vêm de serviços externos: precisam de internet e de liberação na rede da instituição.", media);
    }

    // ── arquivos ──
    const bad = names.filter((n) => /[^\x21-\x7E]/.test(n) || /[\\:*?"<>|]/.test(n) || n.length > 140 || n.split("/").some((s) => s === ".." || s.startsWith("/")));
    if (bad.length) add("warn", "names", "Nomes de arquivo com espaço, acento ou caracteres especiais", "Alguns servidores e ambientes virtuais tratam mal esses nomes. Prefira letras sem acento, números e hífens.", bad.slice(0, 10).concat(bad.length > 10 ? ["…e mais " + (bad.length - 10)] : []));
    else add("ok", "names", "Nomes de arquivo seguros (sem espaços nem acentos)");
    const big = names.filter((n) => files.get(n).length > 2 * MB && !/\.(ttf|woff2?|otf)$/i.test(n)).sort((a, b) => files.get(b).length - files.get(a).length);
    if (big.length) add("warn", "big-files", "Arquivos grandes", "Imagens muito pesadas deixam a aula lenta no celular. Reduza para no máximo ~1 MB.", big.slice(0, 6).map((n) => `${n} (${sizeOf(files.get(n).length)})`));
    if (total > 100 * MB) add("error", "size", `Pacote muito grande: ${sizeOf(total)}`, "Acima de 100 MB muitas plataformas recusam o envio. Reduza imagens e mídias.");
    else if (total > 50 * MB) add("warn", "size", `Pacote grande: ${sizeOf(total)}`, "O limite de envio de arquivos costuma ser 50 a 100 MB; confira o da sua plataforma.");
    else add("ok", "size", `Tamanho do pacote: ${sizeOf(total)}`);

    return finish(out, files, total, { version, launchPaths });
  }
  function finish(out, files, total, info) {
    const rank = { error: 0, warn: 1, tip: 2, info: 3, ok: 4 };
    const sorted = out.map((o, i) => ({ ...o, n: i })).sort((a, b) => rank[a.sev] - rank[b.sev] || a.n - b.n);
    return { items: sorted, version: info && info.version, launchPaths: (info && info.launchPaths) || [], files: files.size, bytes: total,
      counts: { error: out.filter((o) => o.sev === "error").length, warn: out.filter((o) => o.sev === "warn").length } };
  }

  // ───────── simulador ─────────
  // O LMS de mentira (roda dentro do iframe). Escrito como função para ser serializado com toString().
  function lmsShim(VERSION) {
    var V12 = VERSION === "1.2";
    var data = V12
      ? { "cmi.core.student_id": "aluno-001", "cmi.core.student_name": "Estudante, Teste", "cmi.core.lesson_location": "", "cmi.core.credit": "credit", "cmi.core.lesson_status": "not attempted", "cmi.core.entry": "ab-initio", "cmi.core.score.raw": "", "cmi.core.score.min": "", "cmi.core.score.max": "", "cmi.core.total_time": "0000:00:00", "cmi.core.lesson_mode": "normal", "cmi.suspend_data": "", "cmi.launch_data": "" }
      : { "cmi.learner_id": "aluno-001", "cmi.learner_name": "Estudante, Teste", "cmi.location": "", "cmi.credit": "credit", "cmi.completion_status": "unknown", "cmi.success_status": "unknown", "cmi.entry": "ab-initio", "cmi.score.raw": "", "cmi.score.min": "", "cmi.score.max": "", "cmi.score.scaled": "", "cmi.progress_measure": "", "cmi.total_time": "PT0S", "cmi.mode": "normal", "cmi.suspend_data": "", "cmi.launch_data": "" };
    var RO = V12 ? ["cmi.core.student_id", "cmi.core.student_name", "cmi.core.credit", "cmi.core.entry", "cmi.core.total_time", "cmi.core.lesson_mode", "cmi.launch_data"] : ["cmi.learner_id", "cmi.learner_name", "cmi.credit", "cmi.entry", "cmi.total_time", "cmi.mode", "cmi.launch_data"];
    var WO = V12 ? ["cmi.core.exit", "cmi.core.session_time"] : ["cmi.exit", "cmi.session_time"];
    var VOCAB = V12
      ? { "cmi.core.lesson_status": ["passed", "completed", "failed", "incomplete", "browsed", "not attempted"], "cmi.core.exit": ["time-out", "suspend", "logout", ""] }
      : { "cmi.completion_status": ["completed", "incomplete", "not attempted", "unknown"], "cmi.success_status": ["passed", "failed", "unknown"], "cmi.exit": ["timeout", "suspend", "logout", "normal", ""] };
    var NUM = V12
      ? { "cmi.core.score.raw": [0, 100], "cmi.core.score.min": [0, 100], "cmi.core.score.max": [0, 100] }
      : { "cmi.score.raw": [-1e9, 1e9], "cmi.score.min": [-1e9, 1e9], "cmi.score.max": [-1e9, 1e9], "cmi.score.scaled": [-1, 1], "cmi.progress_measure": [0, 1] };
    var MAXLEN = V12 ? { "cmi.suspend_data": 4096, "cmi.core.lesson_location": 255 } : { "cmi.suspend_data": 64000, "cmi.location": 1000 };
    var state = "idle", err = "0", diag = "", t0 = Date.now();
    var MSG = { "0": "No error", "101": "General exception", "111": "General termination failure", "112": "Termination before initialization", "122": "Retrieve data before initialization", "132": "Store data before initialization", "142": "Commit before initialization", "201": "Invalid argument", "301": "Not initialized", "401": "Not implemented", "403": "Element is read only", "404": "Element is write only", "405": "Incorrect data type", "406": "Out of range", "407": "Out of range" };
    var log = function (fn, args, result, e) {
      try { parent.postMessage({ __scormsim: 1, t: Date.now() - t0, fn: fn, args: args, result: String(result), error: e || "0", state: state, cmi: JSON.parse(JSON.stringify(data)) }, "*"); } catch (x) {}
    };
    var fail = function (code, d) { err = String(code); diag = d || ""; return "false"; };
    var ok = function () { err = "0"; diag = ""; return "true"; };
    var needs = function (code) { if (state !== "running") { return fail(code, state === "idle" ? "Chamada antes de Initialize" : "Chamada depois de Terminate/Finish"); } return null; };
    var api = {
      init: function (a) { if (state === "running") return fail(V12 ? 101 : 103, "Já inicializado"); if (state === "ended") return fail(V12 ? 101 : 104, "Já finalizado"); if (a !== "") return fail(201, 'O argumento de Initialize deve ser ""'); state = "running"; return ok(); },
      fin: function (a) { var n = needs(V12 ? 301 : 112); if (n) return n; if (a !== "") return fail(201, 'O argumento deve ser ""'); state = "ended"; return ok(); },
      get: function (k) { var n = needs(V12 ? 301 : 122); if (n) return ""; if (WO.indexOf(k) >= 0) { fail(404, k + " é só de escrita"); return ""; } if (!(k in data)) { fail(401, "Elemento não existe: " + k); return ""; } ok(); return data[k]; },
      set: function (k, v) {
        var n = needs(V12 ? 301 : 132); if (n) return n;
        v = String(v);
        if (RO.indexOf(k) >= 0) return fail(403, k + " é só de leitura");
        var known = (k in data) || WO.indexOf(k) >= 0;
        if (!known) return fail(401, "Elemento não existe: " + k);
        if (VOCAB[k] && VOCAB[k].indexOf(v) < 0) return fail(405, "Valor «" + v + "» inválido para " + k + ". Aceitos: " + VOCAB[k].join(", "));
        if (NUM[k]) { var x = parseFloat(v); if (v === "" || isNaN(x)) return fail(405, k + " precisa ser número, recebeu «" + v + "»"); if (x < NUM[k][0] || x > NUM[k][1]) return fail(V12 ? 405 : 407, k + " fora do intervalo " + NUM[k][0] + " a " + NUM[k][1] + " (recebeu " + v + ")"); }
        if (MAXLEN[k] && v.length > MAXLEN[k]) return fail(405, k + " passou de " + MAXLEN[k] + " caracteres");
        data[k] = v; return ok();
      },
      commit: function (a) { var n = needs(V12 ? 301 : 142); if (n) return n; if (a !== "") return fail(201, 'O argumento deve ser ""'); return ok(); },
    };
    var wrap = function (name, fn, argnames) {
      return function () { var args = [].slice.call(arguments); var r = fn.apply(null, args); log(name, args, r, err); return r; };
    };
    var lastErr = function () { return err; };
    var errStr = function (c) { return MSG[String(c)] || "Unknown"; };
    var diagFn = function () { return diag; };
    if (V12) {
      window.API = { LMSInitialize: wrap("LMSInitialize", api.init), LMSFinish: wrap("LMSFinish", api.fin), LMSGetValue: wrap("LMSGetValue", api.get), LMSSetValue: wrap("LMSSetValue", api.set), LMSCommit: wrap("LMSCommit", api.commit), LMSGetLastError: lastErr, LMSGetErrorString: errStr, LMSGetDiagnostic: diagFn };
    } else {
      window.API_1484_11 = { Initialize: wrap("Initialize", api.init), Terminate: wrap("Terminate", api.fin), GetValue: wrap("GetValue", api.get), SetValue: wrap("SetValue", api.set), Commit: wrap("Commit", api.commit), GetLastError: lastErr, GetErrorString: errStr, GetDiagnostic: diagFn };
    }
    // comandos vindos da janela da ferramenta
    window.addEventListener("message", function (e) {
      var d = e.data || {}; if (!d.__scormcmd) return;
      try {
        if (d.cmd === "scroll") { window.scrollTo(0, document.documentElement.scrollHeight); document.querySelectorAll("*").forEach(function (el) { if (el.scrollHeight > el.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight; }); }
        if (d.cmd === "complete") { var b = document.querySelector(".aula-complete button, .aula-complete__btn, [data-complete]"); parent.postMessage({ __scormsim: 1, note: b ? "botão de conclusão clicado" : "botão de conclusão não encontrado" }, "*"); if (b) b.click(); }
      } catch (x) {}
    });
    parent.postMessage({ __scormsim: 1, note: "ambiente simulado pronto (SCORM " + VERSION + ")" }, "*");
  }

  // Monta o HTML da aula com o LMS simulado, assets embutidos (data:) e sem fontes pesadas.
  const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", css: "text/css", json: "application/json", mp3: "audio/mpeg", mp4: "video/mp4" };
  const b64 = (u8) => { let s = ""; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); };
  function simulatorHtml(files, entry, version) {
    const cache = new Map();
    const refRe = [
      /(\b(?:src|href|poster)\s*=\s*)(["'])([^"'#?]+)((?:[?#][^"']*)?)\2/gi,
      /(url\(\s*)(["']?)([^"')\s#?]+)((?:[?#][^"')]*)?)["']?(\s*\))/gi,
      /(@import\s+)(["'])([^"']+)()\2/gi,
    ];
    const asData = (path) => {
      if (cache.has(path)) return cache.get(path);
      const ext = path.split(".").pop().toLowerCase();
      let uri = "";
      if (/^(ttf|woff2?|otf|eot)$/.test(ext)) uri = "data:,";               // fontes: fora (a simulação testa SCORM, não tipografia)
      else if (ext === "css") uri = "data:text/css;base64," + btoa(unescape(encodeURIComponent(rewrite(text(files.get(path)), path))));
      else if (ext === "html" || ext === "htm") uri = "about:blank";
      else uri = "data:" + (MIME[ext] || "application/octet-stream") + ";base64," + b64(files.get(path));
      cache.set(path, uri); return uri;
    };
    function rewrite(src, from) {
      let o = src;
      o = o.replace(refRe[0], (m, pre, q, ref, tail) => { if (!isLocalRef(ref)) return m; const p = resolve(from, ref); return files.has(p) ? pre + q + asData(p) + q : m; });
      o = o.replace(refRe[1], (m, pre, q, ref, tail, post) => { if (!isLocalRef(ref)) return m; const p = resolve(from, ref); return files.has(p) ? pre + q + asData(p) + q + post : m; });
      o = o.replace(refRe[2], (m, pre, q, ref) => { if (!isLocalRef(ref)) return m; const p = resolve(from, ref); return files.has(p) ? pre + q + asData(p) + q : m; });
      return o;
    }
    let html = rewrite(text(files.get(entry)), entry);
    const shim = "<script>(" + lmsShim.toString() + ")(" + JSON.stringify(version === "2004" ? "2004" : "1.2") + ");<\/script>";
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + shim) : shim + html;
    return html;
  }

  // veredito a partir do registro de chamadas
  function verdict(log, version, canComplete) {
    const V12 = version !== "2004";
    const calls = log.filter((l) => l.fn);
    const has = (fn) => calls.some((l) => l.fn === fn);
    const fails = calls.filter((l) => l.result === "false");
    const st = V12 ? "cmi.core.lesson_status" : "cmi.completion_status";
    const sets = (el, vals) => calls.some((l) => /SetValue/.test(l.fn) && l.args[0] === el && l.result === "true" && (!vals || vals.indexOf(String(l.args[1])) >= 0));
    const lastCmi = calls.length ? calls[calls.length - 1].cmi : {};
    const checks = [];
    const add = (state, title, detail) => checks.push({ state, title, detail: detail || "" });
    add(has(V12 ? "LMSInitialize" : "Initialize") ? "ok" : "bad", "Inicia a sessão com a plataforma", has(V12 ? "LMSInitialize" : "Initialize") ? "" : "A aula nunca chamou " + (V12 ? "LMSInitialize" : "Initialize") + ": ela não achou a API da plataforma.");
    const done = sets(st, V12 ? ["completed", "passed"] : ["completed"]);
    add(done ? "ok" : (canComplete ? "bad" : "idle"), "Marca a aula como concluída", done ? "" : canComplete ? "Cliquei em “Marcar como concluída” e nenhum estado de conclusão foi enviado." : "Use “Simular conclusão” (ou o botão no fim da aula) para testar.");
    const score = V12 ? lastCmi["cmi.core.score.raw"] : lastCmi["cmi.score.raw"];
    if (score) add("ok", "Envia nota", "Nota registrada: " + score + " (mínimo " + (V12 ? lastCmi["cmi.core.score.min"] : lastCmi["cmi.score.min"]) + ", máximo " + (V12 ? lastCmi["cmi.core.score.max"] : lastCmi["cmi.score.max"]) + ")");
    add(has(V12 ? "LMSCommit" : "Commit") ? "ok" : (calls.length > 1 ? "warn" : "idle"), "Salva os dados (Commit)", "");
    add(has(V12 ? "LMSFinish" : "Terminate") ? "ok" : "idle", "Encerra a sessão ao sair", has(V12 ? "LMSFinish" : "Terminate") ? "" : "Clique em “Encerrar sessão” para simular o aluno fechando a aula.");
    add(fails.length ? "bad" : (calls.length ? "ok" : "idle"), fails.length ? fails.length + " chamada" + (fails.length > 1 ? "s" : "") + " recusada" + (fails.length > 1 ? "s" : "") + " pela plataforma" : "Nenhuma chamada recusada", fails.slice(0, 5).map((f) => f.fn + "(" + f.args.map((a) => JSON.stringify(a)).join(", ") + ") → erro " + f.error).join("\n"));
    return checks;
  }

  window.ScormCheck = { readZip, validate, simulatorHtml, verdict, sizeOf };
})();

// ── Diálogo ──
const SC_COLORS = { error: { c: "#b3372a", bg: "#f9e1dc", l: "Erro" }, warn: { c: "#8a5a00", bg: "#fbefcf", l: "Atenção" }, tip: { c: "#2c5b7a", bg: "#e3eef5", l: "Dica" }, info: { c: "#2c5b7a", bg: "#e3eef5", l: "Info" }, ok: { c: "#2f7d4f", bg: "#e3f1e7", l: "OK" } };

function ScormCheckDialog({ title, load, onClose }) {
  const [phase, setPhase] = React.useState("loading"); // loading | ready | error
  const [err, setErr] = React.useState("");
  const [files, setFiles] = React.useState(null);
  const [report, setReport] = React.useState(null);
  const [tab, setTab] = React.useState("pacote");
  const [entry, setEntry] = React.useState("");
  const [simVersion, setSimVersion] = React.useState("1.2");
  const [log, setLog] = React.useState([]);
  const [notes, setNotes] = React.useState([]);
  const [srcdoc, setSrcdoc] = React.useState("");
  const [running, setRunning] = React.useState(0);
  const frame = React.useRef(null);
  const [showAll, setShowAll] = React.useState(false);
  const [triedComplete, setTriedComplete] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        const blob = await load();
        const f = await window.ScormCheck.readZip(blob);
        if (!live) return;
        const r = window.ScormCheck.validate(f);
        setFiles(f); setReport(r); setEntry(r.launchPaths[0] || ""); setSimVersion(r.version || "1.2"); setPhase("ready");
      } catch (e) { if (live) { setErr(/zip|central directory|corrupt/i.test((e && e.message) || "") ? "O arquivo não é um .zip válido ou está corrompido. Gere o pacote de novo ou escolha outro arquivo." : ((e && e.message) || String(e))); setPhase("error"); } }
    })();
    return () => { live = false; };
  }, []);
  React.useEffect(() => {
    const on = (e) => {
      const d = e.data; if (!d || !d.__scormsim) return;
      if (frame.current && e.source !== frame.current.contentWindow) return;
      if (d.note) setNotes((n) => n.concat({ t: Date.now(), text: d.note }));
      if (d.fn) setLog((l) => l.concat(d));
    };
    window.addEventListener("message", on); return () => window.removeEventListener("message", on);
  }, []);

  const start = () => {
    if (!files || !entry) return;
    setLog([]); setNotes([]); setTriedComplete(false);
    try { setSrcdoc(window.ScormCheck.simulatorHtml(files, entry, simVersion)); setRunning((n) => n + 1); } catch (e) { setNotes([{ t: 0, text: "Falha ao preparar o simulador: " + e.message }]); }
  };
  const cmd = (c) => { try { frame.current && frame.current.contentWindow.postMessage({ __scormcmd: 1, cmd: c }, "*"); } catch (e) {} };
  const stop = () => { setSrcdoc(""); setRunning(0); };
  const entries = report ? report.launchPaths : [];
  const counts = report ? report.counts : { error: 0, warn: 0 };
  const verdict = window.ScormCheck.verdict(log, simVersion, triedComplete);

  const btn = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" };
  const tabBtn = (id, label) => <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} style={{ ...btn, border: 0, borderBottom: "3px solid " + (tab === id ? "var(--tool-accent)" : "transparent"), borderRadius: 0, background: "none", padding: "10px 14px", fontSize: 13.5, color: tab === id ? "var(--tool-ink)" : "var(--tool-ink-3)" }}>{label}</button>;
  const shown = report ? report.items.filter((i) => showAll || i.sev !== "ok") : [];
  const okCount = report ? report.items.filter((i) => i.sev === "ok").length : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(20,20,28,.48)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={onClose}>
      <section role="dialog" aria-label="Conferência do SCORM" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(1040px, 97vw)", height: "min(820px, 94vh)", display: "flex", flexDirection: "column", background: "var(--tool-surface)", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", padding: "16px 20px 0", background: "#fff", borderBottom: "1px solid var(--tool-line)" }}>
          <div style={{ paddingBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Conferência do SCORM</h2>
            <p style={{ margin: "4px 0 8px", fontSize: 12, color: "var(--tool-ink-3)" }}>{title || "Pacote"}{report ? ` · ${report.files} arquivos · ${window.ScormCheck.sizeOf(report.bytes)}${report.version ? " · SCORM " + report.version : ""}` : ""}</p>
            <div style={{ display: "flex", gap: 2 }}>{tabBtn("pacote", "1. Estrutura do pacote" + (report ? (counts.error ? ` · ${counts.error} erro${counts.error > 1 ? "s" : ""}` : counts.warn ? ` · ${counts.warn} atenção` : " · OK") : ""))}{tabBtn("sim", "2. Simulador de plataforma")}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </header>
        <div className="tool-scroll" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 18 }}>
          {phase === "loading" && <p style={{ fontSize: 14, color: "var(--tool-ink-2)" }}>Montando e abrindo o pacote…</p>}
          {phase === "error" && <div style={{ padding: 16, borderRadius: 10, background: SC_COLORS.error.bg, color: SC_COLORS.error.c, fontSize: 13.5 }}><b>Não consegui abrir este arquivo.</b><br />{err}</div>}
          {phase === "ready" && tab === "pacote" && (<>
            <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 14, background: counts.error ? SC_COLORS.error.bg : counts.warn ? SC_COLORS.warn.bg : SC_COLORS.ok.bg, color: counts.error ? SC_COLORS.error.c : counts.warn ? SC_COLORS.warn.c : SC_COLORS.ok.c, fontSize: 13.5, fontWeight: 650 }}>
              {counts.error ? `${counts.error} erro${counts.error > 1 ? "s" : ""} que podem impedir o envio ou o funcionamento na plataforma.` : counts.warn ? `Sem erros graves, mas ${counts.warn} ponto${counts.warn > 1 ? "s" : ""} de atenção.` : "A estrutura do pacote está correta."}
              <span style={{ fontWeight: 500 }}> Isto confere o pacote; o aceite final é sempre da sua plataforma, então teste o envio num curso de rascunho.</span>
            </div>
            {shown.map((i, k) => { const m = SC_COLORS[i.sev]; return (
              <div key={i.id + k} style={{ background: "#fff", border: "1px solid var(--tool-line)", borderLeft: "4px solid " + m.c, borderRadius: 9, padding: "9px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: m.c, background: m.bg, borderRadius: 5, padding: "2px 6px" }}>{m.l}</span><strong style={{ fontSize: 13 }}>{i.title}</strong></div>
                {i.detail && <p style={{ margin: "5px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--tool-ink-2)" }}>{i.detail}</p>}
                {i.list && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace", color: "var(--tool-ink-2)", wordBreak: "break-all" }}>{i.list.map((x, j) => <li key={j}>{x}</li>)}</ul>}
              </div>); })}
            {okCount > 0 && <button onClick={() => setShowAll((v) => !v)} style={{ ...btn, marginTop: 6 }}>{showAll ? "Esconder" : "Mostrar"} os {okCount} itens corretos</button>}
          </>)}
          {phase === "ready" && tab === "sim" && (<>
            <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "var(--tool-ink-2)" }}>Abre a aula numa <b>plataforma de mentira</b> e mostra, ao vivo, o que ela envia (estado, nota, salvar, encerrar) e se a plataforma aceitaria. A aula roda isolada, sem acesso à ferramenta. As fontes são omitidas aqui para ficar leve; a aparência final é a do pacote.</p>
            {!entries.length ? <p style={{ fontSize: 13, color: SC_COLORS.error.c }}>Não encontrei a página de abertura no pacote; corrija os erros da aba 1.</p> : (<>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                {entries.length > 1 && <select value={entry} onChange={(e) => setEntry(e.target.value)} style={{ ...btn, fontWeight: 500 }}>{entries.map((e) => <option key={e} value={e}>{e}</option>)}</select>}
                <div style={{ display: "flex", background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 8, padding: 2 }}>{["1.2", "2004"].map((v) => <button key={v} onClick={() => { setSimVersion(v); }} style={{ border: 0, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 650, cursor: "pointer", background: simVersion === v ? "#fff" : "transparent", boxShadow: simVersion === v ? "0 1px 2px rgba(0,0,0,.15)" : "none" }}>SCORM {v}</button>)}</div>
                <button onClick={start} style={{ ...btn, background: "var(--tool-accent)", color: "#fff", border: 0 }} data-sc="start">{running ? "Reiniciar" : "Iniciar simulação"}</button>
                {running > 0 && <><button onClick={() => { cmd("scroll"); }} style={btn} data-sc="scroll">Rolar até o fim</button><button onClick={() => { setTriedComplete(true); cmd("complete"); }} style={btn} data-sc="complete">Simular conclusão</button><button onClick={stop} style={btn} data-sc="stop">Encerrar sessão</button></>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
                <div style={{ border: "1px solid var(--tool-line)", borderRadius: 10, overflow: "hidden", background: "#fff", height: 520 }}>
                  {srcdoc ? <iframe key={running} ref={frame} title="Aula no simulador de plataforma" srcDoc={srcdoc} sandbox="allow-scripts allow-popups" style={{ width: "100%", height: "100%", border: 0 }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--tool-ink-3)", fontSize: 13 }}>Clique em “Iniciar simulação”.</div>}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 13.5 }}>O que a plataforma recebeu</h3>
                  {verdict.map((v, i) => { const col = v.state === "ok" ? SC_COLORS.ok : v.state === "bad" ? SC_COLORS.error : v.state === "warn" ? SC_COLORS.warn : { c: "#7a7d86", bg: "#eceef2" }; return (
                    <div key={i} data-verdict={v.state} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--tool-line)" }}>
                      <span aria-hidden="true" style={{ flex: "none", width: 20, height: 20, borderRadius: "50%", background: col.bg, color: col.c, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>{v.state === "ok" ? "✓" : v.state === "bad" ? "✕" : v.state === "warn" ? "!" : "·"}</span>
                      <div style={{ fontSize: 12.5, lineHeight: 1.4 }}><b>{v.title}</b>{v.detail && <div style={{ color: "var(--tool-ink-3)", whiteSpace: "pre-wrap" }}>{v.detail}</div>}</div>
                    </div>); })}
                  <h3 style={{ margin: "14px 0 6px", fontSize: 13.5 }}>Registro de chamadas</h3>
                  <div data-sc="log" style={{ maxHeight: 190, overflow: "auto", background: "#14161d", color: "#d7dae0", borderRadius: 8, padding: "8px 10px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, lineHeight: 1.55 }}>
                    {notes.map((n, i) => <div key={"n" + i} style={{ color: "#8f98a8" }}># {n.text}</div>)}
                    {log.map((l, i) => <div key={i} style={{ color: l.result === "false" ? "#ff8f84" : "#d7dae0" }}>{l.fn}({l.args.map((a) => JSON.stringify(a)).join(", ")}) → {l.result}{l.error !== "0" ? " · erro " + l.error : ""}</div>)}
                    {!log.length && !notes.length && <div style={{ color: "#8f98a8" }}>(vazio)</div>}
                  </div>
                </div>
              </div>
            </>)}
          </>)}
        </div>
      </section>
    </div>
  );
}
Object.assign(window, { ScormCheckDialog });
