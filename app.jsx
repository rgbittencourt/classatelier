/* eslint-disable */
// AulaStudio — the application shell. Three columns (palette · canvas ·
// properties), drag-and-drop insert + reorder, edit/preview toggle,
// localStorage autosave, undo, and export.

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA, useCallback: useCb } = React;

const STORE_KEY = "aulastudio.lesson.v1";
const TOPIC_TYPES = ["topic", "topic-collapsible", "topic-slider"];
const isTopicType = (type) => TOPIC_TYPES.indexOf(type) !== -1;
const topicTargetKey = (id) => `topic:${id}`;
const accordionTargetKey = (id, itemIndex) => `accordion:${id}:${itemIndex}`;
const timelineTargetKey = (id, eraIndex, eventIndex) => `timeline:${id}:${eraIndex}:${eventIndex}`;
const columnsTargetKey = (id, columnIndex) => `columns:${id}:${columnIndex}`;

// Every place that can own blocks participates in the same editing model.
// `create` is used only on cloned state during structural operations, so old
// projects without `children` arrays are migrated lazily and safely.
function collectBlockLists(list, meta = { kind: "root", key: "root", owner: null }, out = [], create = false) {
  out.push({ list, meta });
  (list || []).forEach((block) => {
    if (isTopicType(block.type)) {
      if (create && !Array.isArray(block.props.children)) block.props.children = [];
      collectBlockLists(block.props.children || [], { kind: "topic", key: topicTargetKey(block.id), owner: block }, out, create);
    }
    if (block.type === "accordion") {
      (block.props.items || []).forEach((item, itemIndex) => {
        if (create && !Array.isArray(item.children)) item.children = [];
        collectBlockLists(item.children || [], { kind: "accordion", key: accordionTargetKey(block.id, itemIndex), owner: block, itemIndex }, out, create);
      });
    }
    if (block.type === "linhadotempo") {
      (block.props.eras || []).forEach((era, eraIndex) => (era.events || []).forEach((event, eventIndex) => {
        if (create && !Array.isArray(event.children)) event.children = [];
        collectBlockLists(event.children || [], { kind: "timeline", key: timelineTargetKey(block.id, eraIndex, eventIndex), owner: block, eraIndex, eventIndex }, out, create);
      }));
    }
    if (block.type === "columns") {
      (block.props.columns || []).forEach((column, columnIndex) => {
        if (create && !Array.isArray(column.children)) column.children = [];
        collectBlockLists(column.children || [], { kind: "columns", key: columnsTargetKey(block.id, columnIndex), owner: block, columnIndex }, out, create);
      });
    }
  });
  return out;
}
function mapBlockDeep(block, id, mapper) {
  let next = block.id === id ? mapper(block) : block;
  let props = next.props || {};
  if (isTopicType(next.type)) props = { ...props, children: (props.children || []).map((c) => mapBlockDeep(c, id, mapper)) };
  if (next.type === "accordion") props = { ...props, items: (props.items || []).map((item) => ({ ...item, children: (item.children || []).map((c) => mapBlockDeep(c, id, mapper)) })) };
  if (next.type === "linhadotempo") props = { ...props, eras: (props.eras || []).map((era) => ({ ...era, events: (era.events || []).map((event) => ({ ...event, children: (event.children || []).map((c) => mapBlockDeep(c, id, mapper)) })) })) };
  if (next.type === "columns") props = { ...props, columns: (props.columns || []).map((column) => ({ ...column, children: (column.children || []).map((c) => mapBlockDeep(c, id, mapper)) })) };
  return props === next.props ? next : { ...next, props };
}
function findBlockDeep(blocks, id) {
  for (const ref of collectBlockLists(blocks || [])) {
    const found = ref.list.find((b) => b.id === id);
    if (found) return found;
  }
  return null;
}
function renewBlockIds(block) {
  block.id = "c" + Math.random().toString(36).slice(2, 9);
  collectBlockLists([block], undefined, [], true).forEach((ref) => {
    if (ref.meta.kind !== "root") ref.list.forEach((child) => { if (child !== block) child.id = "c" + Math.random().toString(36).slice(2, 9); });
  });
  return block;
}

const STARTER = {
  meta: { title: "Nova aula", author: "", role: "", institution: "", year: "2026", aiTool: "", aiUse: "", license: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br" },
  blocks: [
    Object.assign(window.newBlock("hero"), {}),
  ],
};

const emptyLesson = () => ({
  meta: { title: "", author: "", role: "", institution: "", year: "", aiTool: "", aiUse: "", license: STARTER.meta.license },
  blocks: [],
});

function loadLesson() {
  try { const s = localStorage.getItem(STORE_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return JSON.parse(JSON.stringify(STARTER));
}

function transformRichStrings(value, fn) {
  if (typeof value === "string" && /<(a|span)\b/i.test(value)) return fn(value);
  if (Array.isArray(value)) return value.map((v) => transformRichStrings(v, fn));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, transformRichStrings(v, fn)]));
  return value;
}
function richNotesOf(blocks) {
  const glossary = new Map(), links = new Map();
  const scan = (value) => transformRichStrings(value, (html) => {
    const box = document.createElement("div"); box.innerHTML = html;
    box.querySelectorAll(".termo").forEach((el) => { const pop=el.querySelector(".termo__pop"), term=(pop?.querySelector(".termo__word")?.textContent || el.childNodes[0]?.textContent || "").trim(), def=(pop?.querySelector(".termo__def")?.textContent || "").trim(); if(term&&def) glossary.set(term+"\0"+def,{term,def}); });
    box.querySelectorAll("a[href]").forEach((el) => { const href=(el.getAttribute("href")||"").trim(), label=(el.textContent||href).trim(); if(href&&!href.startsWith("#")) links.set(href+"\0"+label,{href,label}); });
    return html;
  });
  (blocks||[]).forEach((b) => { scan(b.props); if(isTopicType(b.type)) (b.props.children||[]).forEach((c)=>scan(c.props)); });
  return { glossary:[...glossary.values()], links:[...links.values()] };
}
function normalizeTopicStructure(blocks) {
  const rootTypes = new Set(["hero","pagebreak","sintese","referencias","parallax","topic","topic-collapsible","topic-slider","divider"]);
  const out=[];
  (blocks||[]).forEach((b)=>{
    if(rootTypes.has(b.type)){ out.push(b); return; }
    const child={ id:String(b.id||"c"+Math.random().toString(36).slice(2,9)).replace(/^b/,"c"), type:b.type, props:b.props||{} };
    const last=out[out.length-1];
    if(last&&isTopicType(last.type)) last.props.children.push(child);
    else out.push({ id:"b"+Math.random().toString(36).slice(2,9), type:"topic", bg:b.bg||"neutral-default", pad:b.pad||"normal", wide:!!b.wide, props:{children:[child]} });
  });
  return out;
}
function extractProjectPayload(data) {
  const candidates = [
    data,
    data?.lesson,
    data?.project,
    ...(Array.isArray(data?.weeks) ? data.weeks : []),
  ].filter(Boolean);
  const project = candidates.find((candidate) => Array.isArray(candidate.blocks) && candidate.blocks.length > 0);
  if (!project) throw new Error("Este JSON não contém blocos editáveis. Abra o arquivo semana-XX-*.aula.json baixado em Baixar JSON, e não planejamento-geral.json ou o guia do professor.");
  return { meta: project.meta || {}, blocks: normalizeTopicStructure(project.blocks) };
}
function reviseRichNotes(blocks, kind, original, next) {
  const editHtml = (html) => { const box=document.createElement("div"); box.innerHTML=html;
    if(kind==="glossary") box.querySelectorAll(".termo").forEach((el)=>{ const pop=el.querySelector(".termo__pop"), term=(pop?.querySelector(".termo__word")?.textContent||el.childNodes[0]?.textContent||"").trim(), def=(pop?.querySelector(".termo__def")?.textContent||"").trim(); if(term!==original.term||def!==original.def)return; if(!next){ const text=document.createTextNode(term); el.replaceWith(text); return; } const word=pop?.querySelector(".termo__word"), definition=pop?.querySelector(".termo__def"); if(el.firstChild?.nodeType===3) el.firstChild.textContent=next.term; if(word) word.textContent=next.term; if(definition) definition.textContent=next.def; });
    else box.querySelectorAll("a[href]").forEach((el)=>{ if((el.getAttribute("href")||"").trim()!==original.href||(el.textContent||"").trim()!==original.label)return; if(!next){ el.replaceWith(document.createTextNode(original.label)); return; } el.setAttribute("href",next.href); el.textContent=next.label; }); return box.innerHTML; };
  return (blocks||[]).map((b)=>({ ...b, props: transformRichStrings(b.props,editHtml) }));
}

// ── Biblioteca de aulas: cada aula editada fica guardada (IndexedDB) com nome e data ──
const LIB_DB = "classatelier", LIB_STORE = "lessons", CUR_KEY = "aulastudio.current.v1";
const libDB = () => new Promise((res, rej) => {
  if (typeof indexedDB === "undefined") { rej(new Error("IndexedDB indisponível")); return; }
  const r = indexedDB.open(LIB_DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(LIB_STORE, { keyPath: "id" });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const libTx = (mode, fn) => libDB().then((db) => new Promise((res, rej) => {
  const tx = db.transaction(LIB_STORE, mode); const out = fn(tx.objectStore(LIB_STORE));
  tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
}));
const libPut = (entry) => libTx("readwrite", (st) => st.put(entry));
const libAll = () => libTx("readonly", (st) => st.getAll()).then((all) => all || []);
const libDel = (id) => libTx("readwrite", (st) => st.delete(id));
const newLessonId = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isStarterLesson = (l) => JSON.stringify(l) === JSON.stringify(STARTER);
const isBlankLesson = (l) => !(l.blocks || []).length && !(l.meta && l.meta.title);
const makeLibEntry = (id, lesson, source) => ({ id, title: (lesson.meta && lesson.meta.title) || "Aula sem título", blocks: (lesson.blocks || []).length, updatedAt: Date.now(), source: source || null, lesson });
function loadCurrent() {
  try { const c = JSON.parse(localStorage.getItem(CUR_KEY) || "null"); if (c && c.id) return c; } catch (e) {}
  return { id: newLessonId(), source: null };
}

function AulaStudioApp() {
  const [lesson, setLesson] = useStateA(loadLesson);
  const [selected, setSelected] = useStateA(null);
  const [mode, setMode] = useStateA("edit"); // edit | preview
  const history = useRefA([]);
  const patchBurst = useRefA({ id: null, at: 0 });
  const [dragType, setDragType] = useStateA(null); // palette drag
  const [dropIdx, setDropIdx] = useStateA(null);
  const dragBlock = useRefA(null); // reorder drag (block id)
  const hasLessonContent = (lesson.blocks || []).length > 0 || Object.entries(lesson.meta || {}).some(([key, value]) => key !== "license" && value !== "" && value != null);

  // autosave
  const lessonRef = useRefA(lesson);
  lessonRef.current = lesson;
  const curRef = useRefA(null);
  if (!curRef.current) curRef.current = loadCurrent();
  const [libOpen, setLibOpen] = useStateA(false);
  const [courseEntries, setCourseEntries] = useStateA(null);
  const [toast, setToast] = useStateA(null);
  const toastTimer = useRefA(null);
  const showToast = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 7000); };
  useEffectA(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(lesson)); localStorage.setItem(CUR_KEY, JSON.stringify(curRef.current)); } catch (e) {}
      if (!isStarterLesson(lesson) && !isBlankLesson(lesson)) libPut(makeLibEntry(curRef.current.id, lesson, curRef.current.source)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [lesson]);
  // Guarda a aula atual na biblioteca e passa a editar outra (nunca perde a anterior).
  const flushCurrent = async () => {
    const cur = lessonRef.current;
    if (isStarterLesson(cur) || isBlankLesson(cur)) return;
    await libPut(makeLibEntry(curRef.current.id, cur, curRef.current.source));
  };
  const switchTo = async (project, id, source) => {
    try { await flushCurrent(); } catch (e) {}
    history.current = [];
    curRef.current = { id, source: source || null };
    try { localStorage.setItem(CUR_KEY, JSON.stringify(curRef.current)); } catch (e) {}
    setLesson(project);
    setSelected(null);
  };

  // ClassAuthor abre este editor em outra aba e envia a semana escolhida por postMessage.
  // Só aceita de quem abriu esta aba (window.opener). A aula que estava aberta vai para a biblioteca.
  useEffectA(() => {
    const opener = window.opener;
    const reply = (origin, msg) => { try { opener && opener.postMessage(msg, origin); } catch (e) {} };
    const fmt = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const onMessage = async (ev) => {
      const d = ev.data;
      if (!opener || ev.source !== opener || !d || d.type !== "classauthor:lesson") return;
      try {
        const project = extractProjectPayload(d.lesson);
        const key = d.fileName || "";
        const label = (project.meta && project.meta.title) || key || "a semana enviada";
        let existing = null, libOk = true;
        try { const all = await libAll(); existing = key ? all.find((e) => e.source && e.source.key === key) : null; } catch (e) { libOk = false; }
        const cur = lessonRef.current;
        const hasWork = !isStarterLesson(cur) && !isBlankLesson(cur);
        if (existing && !window.confirm("«" + label + "» já está na biblioteca (última edição em " + fmt(existing.updatedAt) + ").\n\nSubstituir pela versão que veio do ClassAuthor? As edições feitas aqui nessa aula serão perdidas.")) {
          reply(ev.origin, { type: "aulastudio:declined" });
          return;
        }
        if (!existing && !libOk && hasWork && !window.confirm("O ClassAuthor quer abrir «" + label + "» aqui.\n\nIsso substitui o projeto que está aberto neste editor. Continuar?")) {
          reply(ev.origin, { type: "aulastudio:declined" });
          return;
        }
        await switchTo(project, existing ? existing.id : newLessonId(), { app: "classauthor", key });
        const kept = libOk && hasWork;
        showToast("«" + label + "» aberta, vinda do ClassAuthor." + (kept ? " A aula que estava aberta ficou na Biblioteca." : ""));
        reply(ev.origin, { type: "aulastudio:loaded", title: (project.meta && project.meta.title) || "", savedPrevious: kept });
      } catch (err) {
        reply(ev.origin, { type: "aulastudio:error", message: String(err && err.message || err) });
      }
    };
    window.addEventListener("message", onMessage);
    reply("*", { type: "aulastudio:ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const pushHistory = useCb(() => {
    patchBurst.current = { id: null, at: 0 };
    history.current.push(JSON.stringify(lesson));
    if (history.current.length > 50) history.current.shift();
  }, [lesson]);
  const undo = () => {
    patchBurst.current = { id: null, at: 0 };
    const prev = history.current.pop();
    if (prev) setLesson(JSON.parse(prev));
  };

  const commit = (next) => { pushHistory(); setLesson(next); };

  // Children of a topic share its band; a topic-child id is found by scanning
  // each topic's props.children. These helpers keep root + child ops uniform.
  const childrenOf = (b) => (isTopicType(b.type) ? (b.props.children || []) : null);
  const setChildren = (b, kids) => ({ ...b, props: { ...b.props, children: kids } });

  const insertBlock = (type, idx) => {
    if (window.CHILD_TYPES && window.CHILD_TYPES.indexOf(type) !== -1) {
      const child = window.newChildBlock(type);
      const topic = window.newBlock("topic"); topic.props.children = [child];
      const blocks = [...lesson.blocks]; blocks.splice(idx == null ? blocks.length : idx, 0, topic);
      commit({ ...lesson, blocks }); setSelected(child.id); setMode("edit"); return;
    }
    const b = window.newBlock(type);
    const blocks = [...lesson.blocks];
    blocks.splice(idx == null ? blocks.length : idx, 0, b);
    commit({ ...lesson, blocks });
    // For a fresh topic, select the topic itself; for leaves, select the leaf.
    setSelected(type === "topic" ? b.id : b.id);
    setMode("edit");
  };
  // Insert a leaf into any block container (topic, column, accordion tab or timeline event).
  const insertInto = (targetKey, type, idx) => {
    const c = window.newChildBlock(type);
    const next = JSON.parse(JSON.stringify(lesson));
    const target = collectBlockLists(next.blocks, undefined, [], true).find((ref) => ref.meta.key === targetKey);
    if (!target || (window.NESTED_CHILD_TYPES && target.meta.kind !== "topic" && window.NESTED_CHILD_TYPES.indexOf(type) === -1)) return;
    if (target.meta.kind === "topic" && target.meta.owner.type === "topic-slider") c.slide = Number(target.meta.owner.props.editSlide) || 0;
    const at = idx == null ? target.list.length : Math.max(0, Math.min(idx, target.list.length));
    target.list.splice(at, 0, c);
    commit(next);
    setSelected(c.id);
    setMode("edit");
  };
  const insertChild = (topicId, type, idx) => insertInto(topicTargetKey(topicId), type, idx);

  // Merge a patch into a block whether it lives at root or inside a topic.
  const patchAnywhere = (id, patch) => {
    setLesson((L) => {
      const now = Date.now();
      if (patchBurst.current.id !== id || now - patchBurst.current.at > 800) {
        history.current.push(JSON.stringify(L));
        if (history.current.length > 50) history.current.shift();
      }
      patchBurst.current = { id, at: now };
      return {
        ...L,
        blocks: L.blocks.map((b) => mapBlockDeep(b, id, (found) => ({ ...found, ...patch }))),
      };
    });
  };
  const updateBlock = patchAnywhere;
  const updateBlockProps = patchAnywhere;

  const removeBlock = (id) => {
    pushHistory();
    setLesson((L) => {
      const next = JSON.parse(JSON.stringify(L));
      const source = collectBlockLists(next.blocks, undefined, [], true).find((ref) => ref.list.some((b) => b.id === id));
      if (!source) return L;
      source.list.splice(source.list.findIndex((b) => b.id === id), 1);
      return next;
    });
    if (selected === id) setSelected(null);
  };
  const duplicateBlock = (id) => {
    pushHistory();
    setLesson((L) => {
      const next = JSON.parse(JSON.stringify(L));
      const source = collectBlockLists(next.blocks, undefined, [], true).find((ref) => ref.list.some((b) => b.id === id));
      if (!source) return L;
      const i = source.list.findIndex((b) => b.id === id);
      const copy = renewBlockIds(JSON.parse(JSON.stringify(source.list[i])));
      if (source.meta.kind === "root") copy.id = "b" + Math.random().toString(36).slice(2, 9);
      source.list.splice(i + 1, 0, copy);
      return next;
    });
  };
  const moveBlock = (id, dir) => {
    pushHistory();
    setLesson((L) => {
      const next = JSON.parse(JSON.stringify(L));
      const refs = collectBlockLists(next.blocks, undefined, [], true);
      const source = refs.find((ref) => ref.list.some((b) => b.id === id));
      if (!source) return L;
      const i = source.list.findIndex((b) => b.id === id), ni = i + dir;
      if (ni >= 0 && ni < source.list.length) {
        const tmp = source.list[i]; source.list[i] = source.list[ni]; source.list[ni] = tmp;
        return next;
      }
      // Preserve the existing convenience: arrows at a topic boundary move
      // the child into the nearest topic above/below. Nested-item arrows stay
      // local; drag-and-drop is used to cross container boundaries.
      if (source.meta.kind !== "topic") return L;
      let rootIndex = next.blocks.findIndex((b) => b.id === source.meta.owner.id) + dir;
      while (rootIndex >= 0 && rootIndex < next.blocks.length && !isTopicType(next.blocks[rootIndex].type)) rootIndex += dir;
      if (rootIndex < 0 || rootIndex >= next.blocks.length) return L;
      const target = refs.find((ref) => ref.meta.key === topicTargetKey(next.blocks[rootIndex].id));
      if (!target) return L;
      const moved = source.list.splice(i, 1)[0];
      if (target.meta.owner.type === "topic-slider") moved.slide = Number(target.meta.owner.props.editSlide) || 0;
      else if (moved.slide != null) delete moved.slide;
      target.list.splice(dir > 0 ? 0 : target.list.length, 0, moved);
      return next;
    });
  };
  const reorderTo = (id, idx) => {
    pushHistory();
    setLesson((L) => {
      const from = L.blocks.findIndex((b) => b.id === id);
      if (from < 0) return L; // only root blocks reorder via drag
      const blocks = [...L.blocks];
      const [moved] = blocks.splice(from, 1);
      let target = idx; if (from < idx) target -= 1;
      blocks.splice(target, 0, moved);
      return { ...L, blocks };
    });
  };
  const moveChildTo = (id, targetKeyOrTopicId, idx) => {
    pushHistory();
    setLesson((L) => {
      const next = JSON.parse(JSON.stringify(L));
      const refs = collectBlockLists(next.blocks, undefined, [], true);
      const source = refs.find((ref) => ref.list.some((b) => b.id === id));
      const targetKey = String(targetKeyOrTopicId).includes(":") ? targetKeyOrTopicId : topicTargetKey(targetKeyOrTopicId);
      const target = refs.find((ref) => ref.meta.key === targetKey);
      if (!source || !target || source.meta.kind === "root") return L;
      const sourceIndex = source.list.findIndex((b) => b.id === id);
      const moving = source.list[sourceIndex];
      if (target.meta.owner && target.meta.owner.id === id) return L;
      if (target.meta.kind !== "topic" && window.NESTED_CHILD_TYPES && window.NESTED_CHILD_TYPES.indexOf(moving.type) === -1) return L;
      let at = idx == null ? target.list.length : idx;
      if (source.list === target.list && sourceIndex < at) at -= 1;
      let moved = source.list.splice(sourceIndex, 1)[0];
      if (target.meta.kind === "topic" && target.meta.owner.type === "topic-slider") moved.slide = Number(target.meta.owner.props.editSlide) || 0;
      else if (moved.slide != null) delete moved.slide;
      at = Math.max(0, Math.min(at, target.list.length));
      target.list.splice(at, 0, moved);
      return next;
    });
  };

  // Selected block: search root, then topic children.
  let selBlock = selected ? findBlockDeep(lesson.blocks, selected) : null;

  // ── project file (download / open) — images travel embedded in props ──
  const fileInputRef = useRefA(null);
  const [scormOpen, setScormOpen] = useStateA(false);
  const [clearOpen, setClearOpen] = useStateA(false);
  const [busyMsg, setBusyMsg] = useStateA(null);
  const [richOpen, setRichOpen] = useStateA(false);

  const slugName = (s) => (s || "classatelier").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "classatelier";

  const downloadProject = () => {
    const blob = new Blob([JSON.stringify(lesson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = slugName(lesson.meta?.title) + ".aula.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const openProjectClick = () => fileInputRef.current && fileInputRef.current.click();
  const onProjectFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-opening the same file
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        const project = extractProjectPayload(data);
        switchTo(project, newLessonId(), { app: "file", key: f.name }).then(() => showToast("Projeto aberto. A aula anterior ficou na Biblioteca."));
      } catch (err) { alert("Não consegui abrir o projeto: " + err.message); }
    };
    r.readAsText(f);
  };

  const exportHTML = async () => {
    try { await window.downloadExport(lesson); } catch (e) { alert("Erro ao exportar: " + e.message); }
  };
  const exportStandaloneHTML = async () => {
    try { await window.downloadStandaloneHTML(lesson); } catch (e) { alert("Erro ao exportar HTML: " + e.message); }
  };
  const printPDF = async () => {
    try { await window.openPrintPreview(lesson); } catch (e) { alert("Erro ao preparar PDF: " + e.message); }
  };
  // Reset the complete authoring state. The previous lesson remains undoable.
  const clearLesson = (saveCopy) => {
    if (saveCopy) downloadProject();
    pushHistory();
    const cleared = emptyLesson();
    setLesson(cleared);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cleared)); } catch (e) {}
    setSelected(null);
    setMode("edit");
    setDragType(null);
    setDropIdx(null);
    dragBlock.current = null;
    setClearOpen(false);
  };
  const exportSCORM = async (opts) => {
    try { await window.downloadSCORM(lesson, opts); setScormOpen(false); }
    catch (e) { alert("Erro ao gerar SCORM: " + e.message); }
  };

  // keyboard: delete selected, esc deselect, cmd+z undo
  useEffectA(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.key === "Escape") { setSelected(null); return; }
      const tag = (e.target.tagName || "").toLowerCase();
      const editing = e.target.isContentEditable || tag === "input" || tag === "textarea";
      if (!editing && selected && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); removeBlock(selected); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, lesson]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: mode === "preview" ? "1fr" : "248px 1fr 320px", height: "100vh", overflow: "hidden" }}>
      {mode === "edit" && (
        <Palette onDragType={setDragType} onAdd={(t) => insertBlock(t, null)} />
      )}

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden", borderLeft: mode === "edit" ? "1px solid var(--tool-line)" : "none", borderRight: mode === "edit" ? "1px solid var(--tool-line)" : "none" }}>
        <Topbar
          lesson={lesson} setLesson={commit} mode={mode} setMode={setMode}
          onUndo={undo} canUndo={history.current.length > 0}
          onExportHTML={exportHTML} onExportStandaloneHTML={exportStandaloneHTML} onExportSCORM={() => setScormOpen(true)} onPrintPDF={printPDF}
          onOpenProject={openProjectClick} onDownloadProject={downloadProject}
          onRichNotes={() => setRichOpen(true)} onLibrary={async () => { try { await flushCurrent(); } catch (e) {} setLibOpen(true); }}
          onClear={() => setClearOpen(true)} canClear={hasLessonContent}
        />
        <Canvas
          lesson={lesson} mode={mode} selected={selected} setSelected={setSelected}
          updateBlock={updateBlockProps}
          dragType={dragType} setDragType={setDragType}
          dropIdx={dropIdx} setDropIdx={setDropIdx}
          insertBlock={insertBlock} insertChild={insertChild} insertInto={insertInto} reorderTo={reorderTo} moveChildTo={moveChildTo}
          dragBlock={dragBlock}
          onRemove={removeBlock} onDuplicate={duplicateBlock} onMove={moveBlock}
        />
      </div>

      {mode === "edit" && (
        <aside style={{ background: "var(--tool-panel)", minWidth: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
          {selBlock
            ? <window.PropertiesPanel block={selBlock} update={(patch) => updateBlock(selBlock.id, patch)} />
            : <LessonMeta lesson={lesson} setLesson={(L) => setLesson(L)} />}
        </aside>
      )}

      {libOpen && <LibraryDialog currentId={curRef.current.id} onClose={() => setLibOpen(false)}
        onOpen={async (e) => { await switchTo(e.lesson, e.id, e.source); setLibOpen(false); setMode("edit"); }}
        onNew={async () => { await switchTo(emptyLesson(), newLessonId(), null); setLibOpen(false); setMode("edit"); }}
        onCourse={(entries) => setCourseEntries(entries)} />}
      {courseEntries && <CourseDialog entries={courseEntries} onClose={() => setCourseEntries(null)}
        onConfirm={async (opts) => { try { await window.downloadCourseSCORM(opts.lessons, opts); setCourseEntries(null); showToast("Pacote do curso gerado."); } catch (e) { alert("Erro ao gerar o pacote do curso: " + e.message); } }} />}
      {toast && <div role="status" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10000, maxWidth: 520, padding: "12px 18px", borderRadius: 12, background: "#14213D", color: "#fff", fontSize: 13, lineHeight: 1.5, boxShadow: "0 18px 44px rgba(20,33,61,.3)" }}>{toast}</div>}
      <window.MarkToolbar />
      <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={onProjectFile} style={{ display: "none" }} />
      {scormOpen && <ScormDialog lesson={lesson} onClose={() => setScormOpen(false)} onConfirm={exportSCORM} />}
      {clearOpen && <ClearDialog count={(lesson.blocks || []).length} onClose={() => setClearOpen(false)} onConfirm={clearLesson} />}
      {richOpen && <RichNotesDialog lesson={lesson} onClose={() => setRichOpen(false)} onUpdate={(kind, original, next) => { pushHistory(); setLesson((L) => ({ ...L, blocks: reviseRichNotes(L.blocks, kind, original, next) })); }} />}
    </div>
  );
}

// ── Left: block palette ──
function Palette({ onDragType, onAdd }) {
  return (
    <aside className="tool-scroll" style={{ background: "var(--tool-panel)", overflowY: "auto", height: "100vh", padding: "14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px 14px" }}>
          <img src={(window.AULA_BASE || "") + "assets/brand/classatelier-mark.png"} alt="" width="26" height="26" style={{ display: "block", borderRadius: 7 }} />
        <span style={{ fontSize: 17, lineHeight: 1, whiteSpace: "nowrap" }}><b style={{ fontWeight: 800, letterSpacing: "-.045em" }}>Class</b><i style={{ fontFamily: "var(--font-serif, Newsreader, Georgia, serif)", fontStyle: "italic", fontWeight: 400, letterSpacing: "-.02em", color: "#BF4C34" }}>Atelier</i></span>
      </div>
      {window.BLOCK_CATS.map((cat) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--tool-ink-3)", margin: "0 4px 8px" }}>{cat}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {window.BLOCKS.filter((b) => b.cat === cat).map((b) => (
              <div key={b.type} className="palette-item" draggable
                onDragStart={(e) => { onDragType(b.type); e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", b.type); }}
                onDragEnd={() => onDragType(null)}
                onDoubleClick={() => onAdd(b.type)}
                title={"Arraste para a página · ou clique duas vezes para inserir"}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 8, border: "1px solid var(--tool-line)", background: "var(--tool-surface)", cursor: "grab" }}>
                <window.Icon name={b.icon} size={16} stroke={1.8} color="var(--tool-ink-2)" />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--tool-ink)" }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function LibraryDialog({ currentId, onClose, onOpen, onNew, onCourse }) {
  const [items, setItems] = useStateA(null);
  const [picked, setPicked] = useStateA({});
  const [failed, setFailed] = useStateA(false);
  const load = () => libAll().then((all) => setItems(all.sort((a, b) => b.updatedAt - a.updatedAt))).catch(() => setFailed(true));
  useEffectA(() => { load(); }, []);
  const remove = async (e) => {
    if (!window.confirm("Excluir «" + e.title + "» da biblioteca?\n\nIsso não pode ser desfeito. Para guardar uma cópia, abra a aula e use Salvar.")) return;
    try { await libDel(e.id); } catch (err) {}
    load();
  };
  const fmt = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const pickedList = (items || []).filter((e) => picked[e.id]).sort((a, b) => String((a.source && a.source.key) || a.title).localeCompare(String((b.source && b.source.key) || b.title), "pt-BR", { numeric: true }));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,20,28,.48)", display: "grid", placeItems: "center", padding: 20 }} onMouseDown={onClose}>
      <section onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(720px,96vw)", maxHeight: "86vh", display: "flex", flexDirection: "column", background: "var(--tool-surface)", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, padding: "18px 22px", background: "#fff", borderBottom: "1px solid var(--tool-line)" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Biblioteca de aulas</h2>
            <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--tool-ink-3)" }}>Tudo o que você edita fica guardado neste navegador. As semanas que chegam do ClassAuthor entram aqui, sem apagar as outras.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={{ ...ghostBtn, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }} onClick={onNew}>+ Nova aula</button>
            <button style={ghostBtn} onClick={onClose} title="Fechar">×</button>
          </div>
        </header>
        <div className="tool-scroll" style={{ overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {failed && <p style={emptyNote}>Este navegador não permite guardar a biblioteca (modo privado ou armazenamento bloqueado). Use <b>Salvar</b> para baixar cada aula.</p>}
          {!failed && items && !items.length && <p style={emptyNote}>Nenhuma aula guardada ainda. Comece a editar, abra um projeto ou envie uma semana pelo ClassAuthor.</p>}
          {!failed && !items && <p style={emptyNote}>Carregando…</p>}
          {(items || []).map((e) => {
            const here = e.id === currentId;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid " + (here ? "var(--tool-sel)" : "var(--tool-line)"), borderRadius: 10, background: here ? "var(--tool-sel-soft)" : "#fff" }}>
                <input type="checkbox" checked={!!picked[e.id]} onChange={(ev) => setPicked((p) => ({ ...p, [e.id]: ev.target.checked }))} title="Incluir no pacote do curso" style={{ width: 16, height: 16, flexShrink: 0, cursor: "pointer" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--tool-ink-3)", marginTop: 3 }}>
                    {e.blocks} {e.blocks === 1 ? "bloco" : "blocos"} · editada em {fmt(e.updatedAt)}{e.source && e.source.app === "classauthor" ? " · veio do ClassAuthor" : ""}{here ? " · aberta agora" : ""}
                  </div>
                </div>
                {!here && <button style={{ ...ghostBtn, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 600 }} onClick={() => onOpen(e)}>Abrir</button>}
                {!here && <button style={{ ...ghostBtn, color: "var(--coral-deep)" }} title="Excluir da biblioteca" onClick={() => remove(e)}><window.TIcon name="trash" size={15} /></button>}
              </div>
            );
          })}
        </div>
        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderTop: "1px solid var(--tool-line)", background: "#fff" }}>
          <span style={{ fontSize: 12, color: "var(--tool-ink-3)" }}>{pickedList.length ? pickedList.length + (pickedList.length === 1 ? " aula marcada" : " aulas marcadas") : "Marque as aulas para montar um pacote do curso."}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...ghostBtn, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }} onClick={() => { const all = (items || []).length && pickedList.length === (items || []).length; setPicked(all ? {} : Object.fromEntries((items || []).map((e) => [e.id, true]))); }}>Marcar todas</button>
            <button disabled={!pickedList.length} onClick={() => onCourse(pickedList)} style={{ ...primaryBtn, opacity: pickedList.length ? 1 : 0.45, cursor: pickedList.length ? "pointer" : "default" }}>Montar curso (SCORM)…</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function CourseDialog({ entries, onClose, onConfirm }) {
  const [list, setList] = useStateA(entries);
  const [title, setTitle] = useStateA("");
  const [version, setVersion] = useStateA("1.2");
  const [busy, setBusy] = useStateA(false);
  const move = (i, d) => setList((L) => { const n = L.slice(); const j = i + d; if (j < 0 || j >= n.length) return L; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const go = async () => {
    if (!title.trim()) { alert("Dê um nome ao curso."); return; }
    setBusy(true);
    try { await onConfirm({ title: title.trim(), version, lessons: list.map((e) => e.lesson) }); } finally { setBusy(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(20,20,28,0.42)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 94vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden", fontFamily: "var(--tool-sans)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--tool-line)", fontSize: 15, fontWeight: 700 }}>Montar o curso em um pacote SCORM</div>
        <div className="tool-scroll" style={{ padding: 20, overflow: "auto" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={dlgLabel}>Nome do curso</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Tecnologias para Gestão Educacional" style={dlgInput} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={dlgLabel}>Ordem das aulas no pacote</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tool-ink-3)", width: 20 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Subir" style={{ ...ghostBtn, width: 28, height: 28, opacity: i === 0 ? 0.35 : 1 }}><window.TIcon name="up" size={14} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === list.length - 1} title="Descer" style={{ ...ghostBtn, width: 28, height: 28, opacity: i === list.length - 1 ? 0.35 : 1 }}><window.TIcon name="down" size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={dlgLabel}>Versão SCORM</label>
            <div style={{ display: "flex", gap: 4, background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, padding: 3 }}>
              {[{ id: "1.2", label: "SCORM 1.2 (recomendado)" }, { id: "2004", label: "SCORM 2004" }].map((o) => (
                <button key={o.id} onClick={() => setVersion(o.id)} style={{ flex: 1, padding: "7px 6px", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: version === o.id ? "#fff" : "transparent", color: version === o.id ? "var(--tool-ink)" : "var(--tool-ink-3)" }}>{o.label}</button>
              ))}
            </div>
            <p style={{ ...menuSub, marginTop: 8 }}>Cada aula vira um item do curso, na ordem acima. A avaliação final de cada aula (quiz marcado como avaliativo) continua enviando nota de 0 a 10 à plataforma.</p>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ ...ghostBtn, width: "auto", padding: "0 16px", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
          <button onClick={go} disabled={busy} style={primaryBtn}>{busy ? "Gerando…" : "Gerar pacote do curso (.zip)"}</button>
        </div>
      </div>
    </div>
  );
}

function RichNotesDialog({ lesson, onClose, onUpdate }) {
  const notes = richNotesOf(lesson.blocks);
  const Row = ({ kind, note }) => { const [a,setA]=useStateA(kind==="glossary"?note.term:note.label), [b,setB]=useStateA(kind==="glossary"?note.def:note.href); return <div style={{ border:"1px solid var(--tool-line)", borderRadius:10, padding:12, background:"#fff", marginBottom:10 }}><label style={dlgLabel}>{kind==="glossary"?"Termo":"Texto do link"}</label><input style={dlgInput} value={a} onChange={(e)=>setA(e.target.value)} /><label style={{...dlgLabel,marginTop:9}}>{kind==="glossary"?"Definição":"Endereço"}</label><textarea style={{...dlgInput,minHeight:58,resize:"vertical"}} value={b} onChange={(e)=>setB(e.target.value)} /><div style={{display:"flex",justifyContent:"space-between",marginTop:9}}><button style={{...ghostBtn,width:"auto",padding:"0 10px",color:"var(--coral-deep)"}} onClick={()=>onUpdate(kind,note,null)}>Remover</button><button style={{...primaryBtn,height:32}} onClick={()=>onUpdate(kind,note,kind==="glossary"?{term:a.trim(),def:b.trim()}:{label:a.trim(),href:b.trim()})}>Salvar</button></div></div> };
  return <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(20,20,28,.48)",display:"grid",placeItems:"center",padding:20}} onMouseDown={onClose}><section onMouseDown={(e)=>e.stopPropagation()} style={{width:"min(980px,96vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",background:"var(--tool-surface)",borderRadius:14,overflow:"hidden",boxShadow:"0 24px 70px rgba(0,0,0,.3)"}}><header style={{display:"flex",justifyContent:"space-between",alignItems:"start",padding:"18px 22px",background:"#fff",borderBottom:"1px solid var(--tool-line)"}}><div><h2 style={{margin:0,fontSize:18}}>Termos e links</h2><p style={{margin:"5px 0 0",fontSize:12,color:"var(--tool-ink-3)"}}>Revise, edite ou remova todas as ocorrências do conteúdo.</p></div><button style={ghostBtn} onClick={onClose}>×</button></header><div className="tool-scroll" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,padding:18,overflow:"auto"}}><section><h3 style={{fontSize:14}}>Glossário · {notes.glossary.length}</h3>{notes.glossary.map((n,i)=><Row key={i} kind="glossary" note={n} />)}{!notes.glossary.length&&<p style={emptyNote}>Nenhum termo encontrado.</p>}</section><section><h3 style={{fontSize:14}}>Links · {notes.links.length}</h3>{notes.links.map((n,i)=><Row key={i} kind="link" note={n} />)}{!notes.links.length&&<p style={emptyNote}>Nenhum link encontrado.</p>}</section></div></section></div>;
}
const emptyNote={padding:18,border:"1px dashed var(--tool-line-2)",borderRadius:9,color:"var(--tool-ink-3)",fontSize:12};

// ── Top bar ──
function Topbar({ onLibrary, lesson, mode, setMode, onUndo, canUndo, onExportHTML, onExportStandaloneHTML, onExportSCORM, onPrintPDF, onOpenProject, onDownloadProject, onRichNotes, onClear, canClear }) {
  const [busy, setBusy] = useStateA(false);
  const [menu, setMenu] = useStateA(false);
  const wrap = async (fn) => { setBusy(true); setMenu(false); try { await fn(); } finally { setBusy(false); } };
  return (
    <header style={{ height: 52, flexShrink: 0, background: "var(--tool-panel)", borderBottom: "1px solid var(--tool-line)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", position: "relative", zIndex: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 0" }}>
        <ThemePicker />
        <span className="tb-title" style={{ width: 1, height: 22, background: "var(--tool-line)" }} />
        <span className="tb-title" style={{ fontWeight: 600, fontSize: 14, color: "var(--tool-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 40 }}>{lesson.meta?.title || "Nova aula"}</span>
        <span className="tb-title" style={{ fontSize: 12, color: "var(--tool-ink-3)", whiteSpace: "nowrap", flexShrink: 0 }}>· {lesson.blocks.length} blocos</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={onUndo} disabled={!canUndo} title="Desfazer (⌘Z)" style={{ ...ghostBtn, opacity: canUndo ? 1 : 0.4 }}><window.TIcon name="undo" size={15} /></button>
        <button onClick={onClear} disabled={!canClear} title="Limpar página" style={{ ...ghostBtn, opacity: canClear ? 1 : 0.4, color: canClear ? "var(--coral-deep)" : "var(--tool-ink-3)" }}><window.TIcon name="trash" size={15} /></button>
        <button onClick={onLibrary} title="Biblioteca: todas as aulas guardadas neste navegador (as semanas do ClassAuthor entram aqui)" style={textBtn}><window.TIcon name="library" size={15} /><span className="tb-label">Biblioteca</span></button>
        <button onClick={onOpenProject} title="Abrir projeto (.aula.json)" style={textBtn}><window.TIcon name="folder" size={15} /><span className="tb-label">Abrir</span></button>
        <button onClick={onDownloadProject} title="Salvar projeto: baixa o arquivo para continuar depois ou em outro computador" style={textBtn}><window.TIcon name="save" size={15} /><span className="tb-label">Salvar</span></button>
        <button onClick={onRichNotes} title="Termos e links: revisar glossário e links de toda a aula" style={textBtn}><window.TIcon name="link" size={15} /><span className="tb-label">Termos e links</span></button>
        <div style={{ display: "flex", background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, padding: 3 }}>
          <button onClick={() => setMode("edit")} style={segBtn(mode === "edit")}><window.TIcon name="pencil" size={13} /> <span className="tb-seg-label">Editar</span></button>
          <button onClick={() => setMode("preview")} style={segBtn(mode === "preview")}><window.TIcon name="eye" size={13} /> <span className="tb-seg-label">Visualizar</span></button>
        </div>
        <button onClick={onPrintPDF} title="Imprimir PDF: abre a versão expandida da aula para imprimir" style={textBtn}><window.TIcon name="printer" size={15} /><span className="tb-label">Imprimir PDF</span></button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenu((v) => !v)} disabled={busy} style={primaryBtn}>
            <window.TIcon name="download" size={14} color="#fff" /> {busy ? "Gerando…" : "Exportar"} <span style={{ fontSize: 10, opacity: 0.8 }}>▾</span>
          </button>
          {menu && (
            <>
              <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 41 }} />
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 42, background: "#fff", border: "1px solid var(--tool-line)", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", width: 248, overflow: "hidden" }}>
                <button onClick={() => { setMenu(false); onDownloadProject(); }} style={menuItem}>
                  <span style={{ fontWeight: 600 }}>Projeto JSON (.aula.json)</span>
                  <span style={menuSub}>Editável e próprio para reabrir no ClassAtelier.</span>
                </button>
                <button onClick={() => wrap(onExportStandaloneHTML)} style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}>
                  <span style={{ fontWeight: 600 }}>Arquivo HTML (.html)</span>
                  <span style={menuSub}>Um único arquivo para abrir diretamente no navegador.</span>
                </button>
                <button onClick={() => wrap(onExportHTML)} style={menuItem}>
                  <span style={{ fontWeight: 600 }}>Pacote HTML (.zip)</span>
                  <span style={menuSub}>Inclui index.html, imagens, fontes e assets do tema.</span>
                </button>
                <button onClick={onExportSCORM} style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}>
                  <span style={{ fontWeight: 600 }}>Pacote SCORM (.zip)</span>
                  <span style={menuSub}>Para subir no seu ambiente virtual (LMS). Pergunta as opções.</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
const menuItem = { display: "flex", flexDirection: "column", gap: 2, width: "100%", textAlign: "left", padding: "11px 14px", border: 0, background: "#fff", cursor: "pointer", fontSize: 13, color: "var(--tool-ink)", fontFamily: "inherit" };
const menuSub = { fontSize: 11.5, color: "var(--tool-ink-3)", lineHeight: 1.35 };

// ── Theme picker (visual) — swaps the whole design system at the root ──
// Persists the choice and reloads: tokens, fonts, kit and tool skin are all
// (re)injected by boot.js for the chosen theme, so a reload is the clean swap.
function ThemePicker() {
  const themes = (window.AULA_THEMES && window.AULA_THEMES.list) || [];
  const active = (window.AULA_ACTIVE_THEME && window.AULA_ACTIVE_THEME.id) || (themes[0] && themes[0].id);
  const [open, setOpen] = useStateA(false);
  const current = themes.find((t) => t.id === active) || themes[0];
  if (!current) return null;
  const pick = (id) => {
    if (id === active) { setOpen(false); return; }
    try { localStorage.setItem("aulastudio.theme", id); } catch (e) {}
    const url = new URL(location.href); url.searchParams.set("theme", id); location.href = url.toString();
  };
  const Swatches = ({ list, size }) => (
    <span style={{ display: "inline-flex", borderRadius: 5, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)" }}>
      {(list || []).slice(0, 3).map((c, i) => (<span key={i} style={{ width: size, height: size, background: c }} />))}
    </span>
  );
  return (
    <div className="tb-theme" style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen((v) => !v)} title="Trocar tema (design system)"
        style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 9px", background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
        <Swatches list={current.swatches} size={13} />
        <span className="tb-theme-name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tool-ink)", whiteSpace: "nowrap" }}>{current.label}</span>
        <span style={{ fontSize: 10, color: "var(--tool-ink-3)" }}>▾</span>
      </button>
      {open && (<>
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 41 }} />
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 42, background: "#fff", border: "1px solid var(--tool-line)", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", width: 240, overflow: "hidden" }}>
          <div style={{ padding: "9px 13px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--tool-ink-3)", borderBottom: "1px solid var(--tool-line)" }}>Tema (design system)</div>
          {themes.map((t) => (
            <button key={t.id} onClick={() => pick(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 13px", border: 0, background: t.id === active ? "var(--tool-sel-soft)" : "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              <Swatches list={t.swatches} size={16} />
              <span style={{ fontSize: 13, fontWeight: t.id === active ? 700 : 500, color: "var(--tool-ink)", flex: 1 }}>{t.label}</span>
              {t.id === active && <window.TIcon name="check" size={15} color="var(--tool-sel)" />}
            </button>
          ))}
          <div style={{ padding: "9px 13px", fontSize: 11, color: "var(--tool-ink-3)", lineHeight: 1.4, borderTop: "1px solid var(--tool-line)", background: "var(--tool-surface)" }}>Trocar o tema recarrega o builder. Sua aula em andamento é preservada.</div>
        </div>
      </>)}
    </div>
  );
}

// ── SCORM options dialog ──
function ScormDialog({ lesson, onClose, onConfirm }) {
  const allBlocks = (lesson.blocks || []).flatMap((b) => isTopicType(b.type) ? [b].concat(b.props.children || []) : [b]);
  const quizzes = allBlocks.filter((b) => b.type === "quiz");
  const finalQuizzes = quizzes.filter((b) => b.props.avaliativo);
  const firstFinal = finalQuizzes[0];
  const [title, setTitle] = useStateA(lesson.meta?.title || "Aula");
  const [version, setVersion] = useStateA("1.2");
  const [passMark, setPassMark] = useStateA(firstFinal ? (firstFinal.props.passMark || 6) : 6);
  const [busy, setBusy] = useStateA(false);
  const diagnosticCount = quizzes.length - finalQuizzes.length;
  const go = async () => {
    if (finalQuizzes.length > 1) {
      alert("Mantenha apenas um quiz marcado como avaliação final. Os demais devem ser diagnósticos sem nota.");
      return;
    }
    setBusy(true);
    await onConfirm({ title, version, avaliativo: finalQuizzes.length > 0, passMark: Number(passMark) || 0 });
    setBusy(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(20,20,28,0.42)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 92vw)", background: "#fff", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden", fontFamily: "var(--tool-sans)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--tool-line)", fontSize: 15, fontWeight: 700 }}>Empacotar como SCORM</div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={dlgLabel}>Título do pacote</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={dlgInput} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={dlgLabel}>Versão SCORM</label>
            <div style={{ display: "flex", gap: 4, background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, padding: 3 }}>
              {[{ id: "1.2", label: "SCORM 1.2 (recomendado)" }, { id: "2004", label: "SCORM 2004" }].map((o) => (
                <button key={o.id} onClick={() => setVersion(o.id)} style={{ flex: 1, padding: "7px 6px", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: version === o.id ? "#fff" : "transparent", color: version === o.id ? "var(--tool-ink)" : "var(--tool-ink-2)", boxShadow: version === o.id ? "0 1px 2px rgba(0,0,0,0.12)" : "none" }}>{o.label}</button>
              ))}
            </div>
            <p style={{ ...menuSub, marginTop: 6 }}>A plataforma costuma aceitar as duas; 1.2 é o mais compatível.</p>
          </div>
          <div style={{ marginBottom: finalQuizzes.length ? 14 : 4, padding: "12px 14px", border: "1px solid var(--tool-line)", borderRadius: 10, background: "var(--tool-surface)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tool-ink)" }}>
              {finalQuizzes.length === 1 ? "1 avaliação final" : (finalQuizzes.length > 1 ? `${finalQuizzes.length} avaliações finais — ajuste necessário` : "Pacote sem avaliação final")}
            </div>
            <p style={{ ...menuSub, marginTop: 6, marginBottom: 0 }}>{diagnosticCount ? `${diagnosticCount} quiz${diagnosticCount > 1 ? "zes" : ""} diagnóstico${diagnosticCount > 1 ? "s" : ""} não registra${diagnosticCount > 1 ? "m" : ""} nota.` : "Nenhum diagnóstico inicial foi incluído."}</p>
            {finalQuizzes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label style={dlgLabel}>Nota mínima para aprovação (escala 0–10)</label>
                <input value={passMark} onChange={(e) => setPassMark(e.target.value)} inputMode="decimal" style={dlgInput} />
                <p style={{ ...menuSub, marginTop: 6 }}>Somente a avaliação final envia nota de 0 a 10 à plataforma.</p>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ ...ghostBtn, width: "auto", padding: "0 16px", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
          <button onClick={go} disabled={busy} style={primaryBtn}>{busy ? "Gerando…" : "Gerar pacote .zip"}</button>
        </div>
      </div>
    </div>
  );
}
// ── Confirm clearing the whole page ──
function ClearDialog({ count, onClose, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(20,20,28,0.42)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)", background: "#fff", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden", fontFamily: "var(--tool-sans)" }}>
        <div style={{ padding: "22px 22px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: "var(--coral-soft)", display: "grid", placeItems: "center" }}>
            <window.TIcon name="trash" size={19} color="var(--coral-deep)" />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tool-ink)", marginBottom: 5 }}>Limpar a página inteira?</div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--tool-ink-2)", margin: 0 }}>
              {count > 0 ? `Isto remove ${count === 1 ? "o bloco" : ("os " + count + " blocos")} e também limpa` : "Isto limpa"} título, autoria, instituição e os demais dados da aula.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--tool-ink-3)", margin: "8px 0 0" }}>
              O site não cria um arquivo permanente automaticamente. Baixe uma cópia local antes de limpar caso queira conservar esta versão.
            </p>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onClose} style={{ ...ghostBtn, width: "auto", padding: "0 16px", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
          <button onClick={() => onConfirm(false)} style={{ ...ghostBtn, width: "auto", padding: "0 16px", fontSize: 13, fontWeight: 600, color: "var(--coral-deep)" }}>Limpar sem salvar</button>
          <button onClick={() => onConfirm(true)} style={primaryBtn}><window.TIcon name="download" size={14} color="#fff" /> Baixar cópia e limpar</button>
        </div>
      </div>
    </div>
  );
}

const dlgLabel = { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--tool-ink-2)", margin: "0 0 5px" };
const dlgInput = { width: "100%", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13, color: "var(--tool-ink)", boxSizing: "border-box" };
const textBtn = { display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 11px", border: "1px solid var(--tool-line)", background: "#fff", borderRadius: 8, cursor: "pointer", color: "var(--tool-ink-2)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 };
const ghostBtn = { display: "grid", placeItems: "center", width: 34, height: 34, border: "1px solid var(--tool-line)", background: "#fff", borderRadius: 8, cursor: "pointer", color: "var(--tool-ink-2)" };
const segBtn = (on) => ({ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: 0, borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: on ? "#fff" : "transparent", color: on ? "var(--tool-ink)" : "var(--tool-ink-2)", boxShadow: on ? "0 1px 2px rgba(0,0,0,0.12)" : "none" });
const primaryBtn = { display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", border: 0, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "var(--tool-accent)", color: "#fff" };

// ── Center: canvas ──
function Canvas({ lesson, mode, selected, setSelected, updateBlock, dragType, setDragType, dropIdx, setDropIdx, insertBlock, insertChild, insertInto, reorderTo, moveChildTo, dragBlock, onRemove, onDuplicate, onMove }) {
  const isEdit = mode === "edit";
  const [inserterAt, setInserterAt] = useStateA(null);

  const handleDropAt = (idx) => {
    if (dragType) { insertBlock(dragType, idx); setDragType(null); }
    else if (dragBlock.current) { reorderTo(dragBlock.current, idx); dragBlock.current = null; }
    setDropIdx(null);
  };

  if (mode === "preview") {
    return (
      <div className="tool-scroll canvas-mat" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div data-lz-canvas style={{ background: "var(--paper)" }}>
          <window.LessonRenderer lesson={lesson} mode="preview" chrome={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="tool-scroll canvas-mat" data-lz-canvas style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "28px 0 160px" }}
      onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
      <div className="lesson-paper" style={{ width: "min(880px, 92%)", margin: "0 auto", minHeight: 200, borderRadius: 4 }}
        onDragOver={(e) => e.preventDefault()}>
        {lesson.blocks.length === 0 && (
          <DropZone idx={0} active={dropIdx === 0} setDrop={setDropIdx} onDrop={handleDropAt} onInsert={insertBlock} openAt={inserterAt} setOpenAt={setInserterAt} empty />
        )}
        {lesson.blocks.map((b, i) => (
          <React.Fragment key={b.id}>
            <DropZone idx={i} active={dropIdx === i} setDrop={setDropIdx} onDrop={handleDropAt} onInsert={insertBlock} openAt={inserterAt} setOpenAt={setInserterAt} />
            <BlockShell
              block={b} mode={mode}
              selected={selected === b.id}
              selectedId={selected} setSelected={setSelected}
              onSelect={() => setSelected(b.id)}
              onChange={(props) => updateBlock(b.id, { props })}
              onChildChange={(cid, props) => updateBlock(cid, { props })}
              insertChild={insertChild}
              insertInto={insertInto} dragType={dragType} setDragType={setDragType}
              moveChildTo={moveChildTo} dragBlock={dragBlock}
              onRemove={(id) => onRemove(id || b.id)} onDuplicate={(id) => onDuplicate(id || b.id)}
              onMove={(d, id) => onMove(id || b.id, d)}
              onDragStart={(e) => { dragBlock.current = b.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", b.id); }}
              onDragEnd={() => { dragBlock.current = null; setDropIdx(null); }}
              canMoveChildUpOut={lesson.blocks.slice(0, i).some((x) => isTopicType(x.type))}
              canMoveChildDownOut={lesson.blocks.slice(i + 1).some((x) => isTopicType(x.type))}
              isFirst={i === 0} isLast={i === lesson.blocks.length - 1}
            />
          </React.Fragment>
        ))}
        <DropZone idx={lesson.blocks.length} active={dropIdx === lesson.blocks.length} setDrop={setDropIdx} onDrop={handleDropAt} onInsert={insertBlock} openAt={inserterAt} setOpenAt={setInserterAt} tail />
      </div>
    </div>
  );
}

function DropZone({ idx, active, setDrop, onDrop, onInsert, openAt, setOpenAt, empty, tail }) {
  const dragProps = {
    onDragOver: (e) => { e.preventDefault(); setDrop(idx); },
    onDrop: (e) => { e.preventDefault(); onDrop(idx); },
  };
  const picker = openAt === idx && (
    <BlockPicker onPick={(t) => { onInsert(t, idx); setOpenAt(null); }} onClose={() => setOpenAt(null)} />
  );

  // Empty page: a clear, always-visible insert affordance.
  if (empty) {
    return (
      <div {...dragProps} className="lz-dropline" style={{ minHeight: 168, display: "grid", placeItems: "center", gap: 12 }}>
        <button onClick={(e) => { e.stopPropagation(); setOpenAt(idx); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 20px", borderRadius: 10, border: "1.5px dashed var(--tool-line-2)", background: "#fff", color: "var(--tool-ink-2)", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}>
          <window.TIcon name="plus" size={16} /> Inserir um bloco
        </button>
        <span style={{ color: "var(--ink-faint)", fontFamily: "var(--font-sans)", fontSize: 12.5 }}>ou arraste um bloco da biblioteca à esquerda</span>
        {picker}
      </div>
    );
  }

  // Between / tail: thin hover strip with a centered "+" (always shown on tail).
  return (
    <div {...dragProps} className={"lz-dropline lz-insert" + (active ? " active" : "")}
      style={{ minHeight: tail ? 60 : 22, position: "relative" }}>
      <button
        className={"lz-add" + (tail ? " always" : "") + (openAt === idx ? " is-open" : "")}
        title="Inserir bloco aqui"
        onClick={(e) => { e.stopPropagation(); setOpenAt(idx); }}>
        <window.TIcon name="plus" size={15} color="#fff" />
      </button>
      {picker}
    </div>
  );
}

// ── A block on the canvas, with hover/selected controls ──
function BlockShell({ block, mode, selected, selectedId, setSelected, onSelect, onChange, onChildChange, insertChild, insertInto, dragType, setDragType, moveChildTo, dragBlock, onRemove, onDuplicate, onMove, onDragStart, onDragEnd, canMoveChildUpOut, canMoveChildDownOut, isFirst, isLast }) {
  const isEdit = mode === "edit";
  const isTopic = isTopicType(block.type);
  const [childAddAt, setChildAddAt] = useStateA(null);
  const [topicDragOver, setTopicDragOver] = useStateA(false);
  const [nestedAddAt, setNestedAddAt] = useStateA(null);

  // Floating control bar for a block (root or child).
  const Controls = ({ onUp, onDown, upDis, downDis, onDup, onDel, drag, dragStart = onDragStart }) => (
    <div style={{ position: "absolute", top: 0, right: 0, transform: "translateY(-100%)", zIndex: 30, display: "flex", gap: 3, background: "var(--tool-sel)", padding: "4px 5px", borderRadius: "8px 8px 0 0" }}
      onClick={(e) => e.stopPropagation()}>
      {drag && <span draggable onDragStart={dragStart} onDragEnd={onDragEnd} title="Arraste para reordenar" style={{ ...shellBtn, cursor: "grab" }}><window.TIcon name="grip" size={14} color="#fff" /></span>}
      <button title="Mover para cima" disabled={upDis} onClick={onUp} style={{ ...shellBtn, opacity: upDis ? 0.4 : 1 }}><window.TIcon name="up" size={14} color="#fff" /></button>
      <button title="Mover para baixo" disabled={downDis} onClick={onDown} style={{ ...shellBtn, opacity: downDis ? 0.4 : 1 }}><window.TIcon name="down" size={14} color="#fff" /></button>
      <button title="Duplicar" onClick={onDup} style={shellBtn}><window.TIcon name="copy" size={14} color="#fff" /></button>
      <button title="Remover" onClick={onDel} style={shellBtn}><window.TIcon name="trash" size={14} color="#fff" /></button>
    </div>
  );

  // Renders one topic child inside its own selectable shell. The inline "+"
  // is absolutely positioned at the item's top edge so it never breaks the
  // .aula-topic-item adjacency the spacing CSS relies on (WYSIWYG with export).
  const kids = isTopic ? (block.props.children || []) : [];
  const renderChild = (c, i) => (
    <div
      key={c.id}
      className={"aula-topic-item lz-child" + (selectedId === c.id ? " is-selected" : "")}
      data-type={c.type}
      onClick={(e) => { e.stopPropagation(); setSelected(c.id); }}>
      <ChildInsert at={i} topicId={block.id} dragBlock={dragBlock} moveChildTo={moveChildTo} openAt={childAddAt} setOpenAt={setChildAddAt} onPick={(t) => { insertChild(block.id, t, i); setChildAddAt(null); }} />
      {selectedId === c.id && isEdit && (
        <Controls
          drag dragStart={(e) => { dragBlock.current = c.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); }}
          onUp={() => onMove(-1, c.id)} onDown={() => onMove(1, c.id)}
          upDis={i === 0 && !canMoveChildUpOut} downDis={i === kids.length - 1 && !canMoveChildDownOut}
          onDup={() => onDuplicate(c.id)} onDel={() => onRemove(c.id)}
        />
      )}
      <window.BlockCore block={{ ...c, onChange: (props) => onChildChange(c.id, props) }} mode={mode} renderNestedList={renderNestedList} />
    </div>
  );

  function renderNestedList(targetKey, nestedKids, label) {
    const kidsList = nestedKids || [];
    const canDropPalette = !dragType || !window.NESTED_CHILD_TYPES || window.NESTED_CHILD_TYPES.indexOf(dragType) !== -1;
    return <div className="lz-nested-list" data-nested-target={targetKey}
      onDragOver={(e)=>{if((dragBlock.current||dragType)&&canDropPalette)e.preventDefault();}}
      onDrop={(e)=>{if((!dragBlock.current&&!dragType)||!canDropPalette)return;e.preventDefault();e.stopPropagation();if(dragBlock.current){moveChildTo(dragBlock.current,targetKey,kidsList.length);dragBlock.current=null;}else{insertInto(targetKey,dragType,kidsList.length);setDragType(null);}}}>
      <div className="lz-nested-list__label">{label || "Blocos desta área"}</div>
      {kidsList.map((child, index) => <React.Fragment key={child.id}>
        <NestedInsert targetKey={targetKey} at={index} dragBlock={dragBlock} dragType={dragType} setDragType={setDragType} moveChildTo={moveChildTo} insertInto={insertInto} openAt={nestedAddAt} setOpenAt={setNestedAddAt} />
        <div className={"lz-nested-child" + (selectedId === child.id ? " is-selected" : "")} onClick={(e)=>{e.stopPropagation();setSelected(child.id);}}>
          {selectedId === child.id && <Controls drag dragStart={(e)=>{dragBlock.current=child.id;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",child.id);}} onUp={()=>onMove(-1,child.id)} onDown={()=>onMove(1,child.id)} upDis={index===0} downDis={index===kidsList.length-1} onDup={()=>onDuplicate(child.id)} onDel={()=>onRemove(child.id)} />}
          <window.BlockCore block={{...child,onChange:(props)=>onChildChange(child.id,props)}} mode={mode} />
        </div>
      </React.Fragment>)}
      <NestedInsert targetKey={targetKey} at={kidsList.length} tail dragBlock={dragBlock} dragType={dragType} setDragType={setDragType} moveChildTo={moveChildTo} insertInto={insertInto} openAt={nestedAddAt} setOpenAt={setNestedAddAt} />
    </div>;
  }

  return (
    <div
      className={"lz-block" + (selected ? " is-selected" : "") + (isTopic ? " lz-topic-block" : "") + (topicDragOver ? " is-child-dragover" : "")}
      onDragOver={(e) => { if (isTopic && dragBlock.current) { e.preventDefault(); setTopicDragOver(true); } }}
      onDragLeave={(e) => { if (isTopic && !e.currentTarget.contains(e.relatedTarget)) setTopicDragOver(false); }}
      onDrop={(e) => {
        if (!isTopic || !dragBlock.current) return;
        e.preventDefault(); e.stopPropagation();
        moveChildTo(dragBlock.current, block.id, kids.length);
        dragBlock.current = null; setTopicDragOver(false);
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {selected && isEdit && (
        <Controls
          drag
          onUp={() => onMove(-1, block.id)} onDown={() => onMove(1, block.id)}
          upDis={isFirst} downDis={isLast}
          onDup={() => onDuplicate(block.id)} onDel={() => onRemove(block.id)}
        />
      )}
      {isTopic && isEdit ? (
        <window.BlockView block={{ ...block, onChange }} mode={mode} renderChild={renderChild} />
      ) : (
        <window.BlockView block={{ ...block, onChange }} mode={mode} renderNestedList={renderNestedList} />
      )}
      {isTopic && isEdit && (
        <ChildInsert at={kids.length} topicId={block.id} dragBlock={dragBlock} moveChildTo={moveChildTo} tail openAt={childAddAt} setOpenAt={setChildAddAt} onPick={(t) => { insertChild(block.id, t, kids.length); setChildAddAt(null); }} />
      )}
    </div>
  );
}
const shellBtn = { display: "grid", placeItems: "center", width: 26, height: 24, border: 0, background: "transparent", borderRadius: 5, cursor: "pointer" };

// Inline "+" to add a block INSIDE a topic. Absolutely positioned at the top
// edge of the item it precedes (insert at that index), so it doesn't disturb
// the topic's flow spacing. `tail` variant sits at the topic's bottom.
function ChildInsert({ at, topicId, dragBlock, moveChildTo, tail, openAt, setOpenAt, onPick }) {
  const [dragOver, setDragOver] = useStateA(false);
  return (
    <div
      className={"lz-child-insert" + (tail ? " is-tail" : "") + (dragOver ? " is-dragover" : "")}
      onDragEnter={(e) => { if (dragBlock.current) { e.preventDefault(); setDragOver(true); } }}
      onDragOver={(e) => { if (dragBlock.current) e.preventDefault(); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!dragBlock.current) return;
        e.preventDefault(); e.stopPropagation();
        moveChildTo(dragBlock.current, topicId, at);
        dragBlock.current = null; setDragOver(false);
      }}>
      <button className={"lz-add lz-add-child" + (tail ? " always" : "") + (openAt === at ? " is-open" : "")}
        title="Inserir bloco no tópico"
        onClick={(e) => { e.stopPropagation(); setOpenAt(at); }}>
        <window.TIcon name="plus" size={13} color="#fff" />
      </button>
      {openAt === at && (
        <BlockPicker only={window.CHILD_TYPES} title="Inserir no tópico"
          onPick={onPick} onClose={() => setOpenAt(null)} />
      )}
    </div>
  );
}

// Insert/drop target inside a column, accordion tab or timeline event. It accepts
// both existing canvas blocks (move) and palette items (copy/new block).
function NestedInsert({ targetKey, at, dragBlock, dragType, setDragType, moveChildTo, insertInto, tail, openAt, setOpenAt }) {
  const [dragOver, setDragOver] = useStateA(false);
  const canDropType = !dragType || !window.NESTED_CHILD_TYPES || window.NESTED_CHILD_TYPES.indexOf(dragType) !== -1;
  const slotKey = `${targetKey}@${at}`;
  return <div className={"lz-nested-insert"+(tail?" is-tail":"")+(dragOver?" is-dragover":"")}
    onDragEnter={(e)=>{if((dragBlock.current||dragType)&&canDropType){e.preventDefault();setDragOver(true);}}}
    onDragOver={(e)=>{if((dragBlock.current||dragType)&&canDropType)e.preventDefault();}}
    onDragLeave={()=>setDragOver(false)}
    onDrop={(e)=>{if((!dragBlock.current&&!dragType)||!canDropType)return;e.preventDefault();e.stopPropagation();if(dragBlock.current){moveChildTo(dragBlock.current,targetKey,at);dragBlock.current=null;}else{insertInto(targetKey,dragType,at);setDragType(null);}setDragOver(false);}}>
    <button className="lz-nested-add" onClick={(e)=>{e.stopPropagation();setOpenAt(slotKey);}}>
      <window.TIcon name="plus" size={13}/> {tail?"Adicionar bloco ao item":"Inserir bloco aqui"}
    </button>
    {openAt===slotKey&&<BlockPicker only={window.NESTED_CHILD_TYPES} title="Adicionar bloco ao item" onPick={(type)=>{insertInto(targetKey,type,at);setOpenAt(null);}} onClose={()=>setOpenAt(null)}/>}
  </div>;
}
// Compact block catalog popover — insert a block at a given position.
// `only` (array of types) restricts the list (used inside topics).
function BlockPicker({ onPick, onClose, only, title }) {
  const allow = only ? new Set(only) : null;
  const cats = window.BLOCK_CATS.filter((cat) => window.BLOCKS.some((b) => b.cat === cat && (!allow || allow.has(b.type))));
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "auto", background: "rgba(20,20,28,0.34)", display: "grid", placeItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="tool-scroll"
        style={{ width: "min(460px, 92vw)", maxHeight: "78vh", overflowY: "auto", background: "#fff", border: "1px solid var(--tool-line)", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", padding: "14px 16px 18px", fontFamily: "var(--tool-sans)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{title || "Inserir bloco"}</span>
          <button onClick={onClose} title="Fechar" style={{ ...ghostBtn, width: 30, height: 30 }}>✕</button>
        </div>
        {cats.map((cat) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--tool-ink-3)", margin: "0 2px 7px" }}>{cat}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {window.BLOCKS.filter((b) => b.cat === cat && (!allow || allow.has(b.type))).map((b) => (
                <button key={b.type} onClick={() => onPick(b.type)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, border: "1px solid var(--tool-line)", background: "var(--tool-surface)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <window.Icon name={b.icon} size={16} stroke={1.8} color="var(--tool-ink-2)" />
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--tool-ink)" }}>{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lesson metadata (shown when nothing selected) ──
function LessonMeta({ lesson, setLesson }) {
  const m = lesson.meta || {};
  const set = (k, v) => setLesson({ ...lesson, meta: { ...m, [k]: v } });
  const F = (label, key, ph) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--tool-ink-2)", margin: "0 0 5px" }}>{label}</label>
      <input value={m[key] || ""} placeholder={ph} onChange={(e) => set(key, e.target.value)}
        style={{ width: "100%", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13 }} />
    </div>
  );
  return (
    <div className="tool-scroll" style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--tool-line)", fontSize: 14, fontWeight: 700 }}>Dados da aula</div>
      <div style={{ padding: 16 }}>
        {F("Título da aula", "title", "Ex.: A célula")}
        {F("Autor(a)", "author", "Nome do autor")}
        {F("Papel / função", "role", "Ex.: Professor de Biologia")}
        {F("Instituição", "institution", "Ex.: IFSC")}
        {F("Ano", "year", "2026")}
        {F("Ferramenta de IA (opcional)", "aiTool", "Ex.: Claude")}
        {F("Uso da IA (opcional)", "aiUse", "Ex.: na estruturação do layout.")}

        <div style={{ marginTop: 20, marginBottom: 4, paddingTop: 16, borderTop: "1px solid var(--tool-line)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--tool-ink-3)", margin: "0 0 12px" }}>Conclusão da aula</p>
          <button onClick={() => set("showComplete", m.showComplete === false ? true : false)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: 0, cursor: "pointer", color: "var(--tool-ink)", padding: 0, textAlign: "left" }}>
            <span style={{ width: 38, height: 22, borderRadius: 999, background: m.showComplete !== false ? "var(--tool-accent)" : "var(--tool-line-2)", position: "relative", flexShrink: 0, transition: "background 140ms" }}>
              <span style={{ position: "absolute", top: 2, left: m.showComplete !== false ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 140ms", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Botão de conclusão no fim da aula</span>
          </button>
          <p style={{ fontSize: 11.5, color: "var(--tool-ink-3)", lineHeight: 1.5, margin: "8px 0 0" }}>Mostra o CTA <strong>“Marcar aula como concluída”</strong> ao final. Em pacotes SCORM, registra a conclusão na plataforma. Desligue se a conclusão for controlada de outro modo.</p>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--tool-ink-3)", lineHeight: 1.5, marginTop: 18 }}>Estes dados alimentam o rodapé de créditos (licença CC BY-NC-SA) da aula exportada.</p>
      </div>
    </div>
  );
}

Object.assign(window, { AulaStudioApp });
