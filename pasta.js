/* Pasta do projeto do ClassAtelier.
   Tudo o que o ClassAtelier salva (projeto, HTML, pacotes, SCORM, site do curso, texto) vai para uma
   pasta no computador, separada em subpastas. Se a pasta escolhida for a de um projeto do ClassAuthor,
   o ClassAtelier trabalha dentro da subpasta classatelier/ dela. Usa a File System Access API
   (Chrome e Edge no computador). Nos outros navegadores, nada muda: os arquivos vão para Downloads. */
(function () {
  if (window.PastaProjeto) return;
  var DB = "classatelier-pasta", STORE = "handles", KEY = "pasta";
  var AUTHOR_MARKER = ".classauthor-projeto.json";
  var OWN_MARKER = ".classatelier-pasta.json";
  var SUB = [
    ["projetos", "Projetos salvos e editados no ClassAtelier (…-ClassAtelier.json), gravados também automaticamente a cada alteração"],
    ["html", "Aulas em HTML: arquivo único (.html) e pacote HTML (…-html.zip)"],
    ["scorm", "Pacotes SCORM para o Moodle ou outro AVA (…-scorm.zip)"],
    ["site", "Site do curso inteiro (…-site.zip)"],
    ["pdf", "PDFs: na janela de impressão, escolha “Salvar como PDF” e salve aqui"],
    ["textos", "Texto da aula (…-texto.txt)"],
    ["outros", "Qualquer outro arquivo"]
  ];

  var supported = typeof window.showDirectoryPicker === "function";
  var current = null;      // { handle, name, inAuthor, authorName }
  var state = "none";      // none | prompt | granted
  var listeners = [];
  function emit() { var s = status(); listeners.forEach(function (fn) { try { fn(s); } catch (e) {} }); }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }
  function idb(mode, run) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode), req = run(tx.objectStore(STORE));
        tx.oncomplete = function () { db.close(); resolve(req && req.result); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  }
  function has(dir, name) { return dir.getFileHandle(name).then(function () { return true; }, function () { return false; }); }
  function writeText(dir, name, text) {
    return dir.getFileHandle(name, { create: true }).then(function (f) { return f.createWritable(); }).then(function (w) { return w.write(text).then(function () { return w.close(); }); });
  }

  function subfolderFor(filename) {
    var n = String(filename || "").toLowerCase();
    if (/-scorm\.zip$/.test(n)) return "scorm";
    if (/-site\.zip$/.test(n)) return "site";
    if (/-html\.zip$|\.html?$/.test(n)) return "html";
    if (/\.json$/.test(n)) return "projetos";
    if (/\.pdf$/.test(n)) return "pdf";
    if (/\.txt$|\.md$/.test(n)) return "textos";
    if (/\.zip$/.test(n)) return "outros";
    return "outros";
  }

  function status() {
    return { supported: supported, connected: !!current, state: state, name: current ? current.name : "", inAuthor: !!(current && current.inAuthor), authorName: current ? current.authorName || "" : "", subfolders: SUB.map(function (s) { return s[0]; }) };
  }

  function checkPermission(interactive) {
    if (!current) { state = "none"; return Promise.resolve(state); }
    var opts = { mode: "readwrite" };
    return current.handle.queryPermission(opts).then(function (s) {
      if (s !== "granted" && interactive) return current.handle.requestPermission(opts);
      return s;
    }).then(function (s) { state = s === "granted" ? "granted" : "prompt"; emit(); return state; }, function () { state = "prompt"; emit(); return state; });
  }

  function prepare(base, info) {
    var chain = Promise.resolve();
    SUB.forEach(function (s) { chain = chain.then(function () { return base.getDirectoryHandle(s[0], { create: true }); }); });
    return chain.then(function () {
      return writeText(base, OWN_MARKER, JSON.stringify({ app: "classatelier", insideClassAuthorProject: info.inAuthor, createdAt: new Date().toISOString() }, null, 2));
    }).then(function () {
      var head = info.inAuthor
        ? "Esta é a parte do ClassAtelier dentro da pasta do projeto \"" + info.authorName + "\" do ClassAuthor.\n\nOs arquivos …-ClassAtelier.json soltos aqui vieram do ClassAuthor. O que o ClassAtelier salva vai para as subpastas:\n\n"
        : "Pasta do ClassAtelier. Tudo o que ele salva vem para cá, separado assim:\n\n";
      return writeText(base, "LEIA-ME.txt", head + SUB.map(function (s) { return s[0] + "/  " + s[1]; }).join("\n") + "\n");
    });
  }

  // O professor escolhe a pasta. Pasta de projeto do ClassAuthor → usa a subpasta classatelier/ dela.
  // Pasta já preparada pelo ClassAtelier → reaproveita. Outra pasta → cria classatelier/ dentro dela.
  function choose() {
    if (!supported) return Promise.reject(new Error("Este navegador não deixa o site gravar numa pasta. Use o Chrome ou o Edge no computador."));
    return window.showDirectoryPicker({ id: "classauthor-projetos", mode: "readwrite", startIn: "documents" }).then(function (picked) {
      return Promise.all([has(picked, AUTHOR_MARKER), has(picked, OWN_MARKER)]).then(function (r) {
        var info = { inAuthor: r[0], authorName: r[0] ? picked.name : "" };
        if (r[1]) return { base: picked, info: info };
        if (r[0]) return picked.getDirectoryHandle("classatelier", { create: true }).then(function (d) { return { base: d, info: info }; });
        if (picked.name.toLowerCase() === "classatelier") return { base: picked, info: info };
        return picked.getDirectoryHandle("classatelier", { create: true }).then(function (d) { return { base: d, info: info }; });
      });
    }).then(function (x) {
      return prepare(x.base, x.info).then(function () {
        current = { handle: x.base, name: x.info.inAuthor ? x.info.authorName + "/" + x.base.name : x.base.name, inAuthor: x.info.inAuthor, authorName: x.info.authorName };
        state = "granted";
        return idb("readwrite", function (s) { return s.put(current, KEY); });
      });
    }).then(function () { emit(); return status(); });
  }
  function reconnect() { return checkPermission(true).then(status); }
  function forget() { current = null; state = "none"; emit(); return idb("readwrite", function (s) { return s.delete(KEY); }).catch(function () {}); }

  function save(blob, filename, subfolder) {
    if (!current || state !== "granted") return Promise.resolve(null);
    var folder = subfolder || subfolderFor(filename);
    return current.handle.getDirectoryHandle(folder, { create: true })
      .then(function (d) { return d.getFileHandle(filename, { create: true }); })
      .then(function (f) { return f.createWritable(); })
      .then(function (w) { return w.write(blob).then(function () { return w.close(); }); })
      .then(function () { return current.name + "/" + folder + "/" + filename; });
  }

  // Salvamento automático do projeto aberto em projetos/ (a cada alteração, com 2 s de folga).
  var autoTimer = null;
  function autosave(lesson) {
    if (!current || state !== "granted" || !lesson || !lesson.blocks || !lesson.blocks.length) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      var name = window.projectFileName ? window.projectFileName(lesson) : "aula-ClassAtelier.json";
      save(new Blob([JSON.stringify(lesson, null, 2)], { type: "application/json" }), name, "projetos").catch(function () { state = "prompt"; emit(); });
    }, 2000);
  }

  function notify(text) {
    var t = document.createElement("div");
    t.setAttribute("role", "status");
    t.textContent = text;
    t.style.cssText = "position:fixed;left:50%;bottom:calc(var(--credits-h,0px) + 18px);transform:translateX(-50%);z-index:100000;background:#23262B;color:#fff;font:600 12.5px/1.35 system-ui,sans-serif;padding:9px 14px;border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:min(92vw,620px)";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3800);
  }

  // Todo download do ClassAtelier passa por <a download href="blob:…">.click(). Com a pasta ligada,
  // o arquivo é gravado na subpasta certa; se algo falhar, o download normal acontece.
  var nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var a = this;
    if (!current || state !== "granted" || !a.download || !/^blob:/.test(a.href || "")) return nativeClick.call(a);
    var filename = a.download, href = a.href;
    fetch(href).then(function (r) { return r.blob(); }).then(function (blob) {
      return save(blob, filename).then(function (path) {
        if (path) { notify("Salvo na pasta: " + path); return; }
        throw new Error("sem pasta");
      }, function (e) {
        var url = URL.createObjectURL(blob), b = document.createElement("a");
        b.href = url; b.download = filename; document.body.appendChild(b); nativeClick.call(b); b.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        state = "prompt"; emit();
      });
    }).catch(function () { nativeClick.call(a); });
  };

  function load() {
    if (!supported) return Promise.resolve(status());
    return idb("readonly", function (s) { return s.get(KEY); }).then(function (v) { current = v || null; return checkPermission(false); }, function () { return "none"; }).then(status);
  }

  window.PastaProjeto = { supported: supported, status: status, choose: choose, reconnect: reconnect, forget: forget, save: save, autosave: autosave, subfolderFor: subfolderFor, SUBFOLDERS: SUB, ready: load(), subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; } };
})();
