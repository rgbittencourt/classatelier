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
  if (!project) throw new Error("Este JSON não contém blocos editáveis. Abra o arquivo Semana01-…-ClassAtelier.json (Salvar, ou o botão JSON ClassAtelier do ClassAuthor), e não planejamento-geral.json ou o guia do professor.");
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
const libDB = () => window.Versions.open(); // banco único (lojas lessons + versions), definido em versions.jsx
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
  // painel de propriedades (direita) recolhível; a escolha fica guardada neste navegador
  const [rightOpen, setRightOpenRaw] = useStateA(() => { try { return localStorage.getItem("aulastudio.rightOpen") !== "0"; } catch (e) { return true; } });
  const setRightOpen = (v) => { setRightOpenRaw(v); try { localStorage.setItem("aulastudio.rightOpen", v ? "1" : "0"); } catch (e) {} };
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
  const [libPre, setLibPre] = useStateA(false); // abriu pelo Exportar: já marca a aula atual
  const [courseEntries, setCourseEntries] = useStateA(null);
  const [toast, setToast] = useStateA(null);
  const toastTimer = useRefA(null);
  // origem do ClassAuthor que abriu esta aba (aprendida na primeira mensagem dele); permite devolver a aula editada
  const [authorOrigin, setAuthorOrigin] = useStateA(() => { try { return window.opener ? (sessionStorage.getItem("aulastudio.authorOrigin") || "") : ""; } catch (e) { return ""; } });
  const showToast = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 7000); };
  useEffectA(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(lesson)); localStorage.setItem(CUR_KEY, JSON.stringify(curRef.current)); } catch (e) {}
      if (!isStarterLesson(lesson) && !isBlankLesson(lesson)) libPut(makeLibEntry(curRef.current.id, lesson, curRef.current.source)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [lesson]);
  // Histórico de versões: grava sozinho depois de ~45 s sem editar, ao esconder a aba e ao abrir a aula.
  const snap = (kind, label, id, l) => {
    const cur = l || lessonRef.current;
    if (isStarterLesson(cur) || isBlankLesson(cur)) return Promise.resolve(null);
    return window.Versions.snapshot(id || curRef.current.id, cur, { kind, label }).catch(() => null);
  };
  useEffectA(() => {
    if (isStarterLesson(lesson) || isBlankLesson(lesson)) return;
    const id = curRef.current.id;
    const t = setTimeout(() => { snap("auto", "", id, lesson); }, 45000);
    return () => clearTimeout(t);
  }, [lesson]);
  useEffectA(() => {
    const first = setTimeout(() => snap("auto", ""), 4000); // guarda o estado em que a aula foi aberta
    const onHide = () => { if (document.visibilityState === "hidden") snap("auto", ""); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearTimeout(first); document.removeEventListener("visibilitychange", onHide); };
  }, []);
  // Guarda a aula atual na biblioteca e passa a editar outra (nunca perde a anterior).
  const flushCurrent = async () => {
    const cur = lessonRef.current;
    if (isStarterLesson(cur) || isBlankLesson(cur)) return;
    await libPut(makeLibEntry(curRef.current.id, cur, curRef.current.source));
    await snap("auto", "");
  };
  const switchTo = async (project, id, source) => {
    try { await flushCurrent(); } catch (e) {}
    history.current = [];
    curRef.current = { id, source: source || null };
    try { localStorage.setItem(CUR_KEY, JSON.stringify(curRef.current)); } catch (e) {}
    setLesson(project);
    setSelected(null);
    setTimeout(() => snap("auto", "", id, project), 1500); // estado em que a aula foi aberta
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
      try { sessionStorage.setItem("aulastudio.authorOrigin", ev.origin); } catch (e) {}
      setAuthorOrigin(ev.origin);
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
        if (existing) await snap("safety", "Antes de substituir pela versão do ClassAuthor", existing.id, existing.lesson);
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

  const restoreVersion = async (v) => {
    await snap("safety", "Antes de restaurar «" + (v.label || new Date(v.at).toLocaleString("pt-BR")) + "»");
    pushHistory(); setLesson(JSON.parse(JSON.stringify(v.lesson))); setSelected(null);
  };
  const applyVersionBlock = async (v, blockId, why) => {
    await snap("safety", why);
    pushHistory(); setLesson(window.Versions.applyBlock(lessonRef.current, v.lesson, blockId));
  };
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
  // Divide o tópico no ponto do "+" e põe um bloco de página inteira (abertura, quebra de página,
  // síntese, referências) entre as duas metades. Tópico retrátil/slide não se divide: o bloco vai
  // antes ou depois dele.
  const insertRootAtChild = (topicId, type, idx) => {
    const bi = lesson.blocks.findIndex((b) => b.id === topicId);
    if (bi < 0) return;
    const topic = lesson.blocks[bi];
    const kids = topic.props.children || [];
    const nb = window.newBlock(type);
    const at = idx == null ? kids.length : idx;
    let replacement;
    if (topic.type === "topic" && at > 0 && at < kids.length) {
      const before = setChildren(topic, kids.slice(0, at));
      const after = { ...setChildren(topic, kids.slice(at)), id: "b" + Math.random().toString(36).slice(2, 9) };
      replacement = [before, nb, after];
    } else replacement = at <= 0 ? [nb, topic] : [topic, nb];
    const blocks = [...lesson.blocks]; blocks.splice(bi, 1, ...replacement);
    commit({ ...lesson, blocks }); setSelected(nb.id); setMode("edit");
  };
  // Divisor retrátil: o que vem depois dele fica recolhido. Num tópico comum, vira tópico retrátil.
  const insertCollapseBreak = (topicId, idx) => {
    const bi = lesson.blocks.findIndex((b) => b.id === topicId);
    if (bi < 0) return;
    const topic = lesson.blocks[bi];
    if (topic.type === "topic-slider") return;
    const kids = (topic.props.children || []).filter((c) => c.type !== "collapsebreak");
    const old = (topic.props.children || []).findIndex((c) => c.type === "collapsebreak");
    let at = idx == null ? kids.length : idx;
    if (old >= 0 && old < at) at -= 1; // o divisor antigo saiu da lista
    const marker = window.newChildBlock("collapsebreak");
    kids.splice(Math.max(0, Math.min(at, kids.length)), 0, marker);
    const props = { ...topic.props, children: kids };
    if (topic.type === "topic") Object.assign(props, { triggerLabel: "Clique para expandir", defaultOpen: false });
    const blocks = [...lesson.blocks]; blocks[bi] = { ...topic, type: "topic-collapsible", props };
    commit({ ...lesson, blocks }); setSelected(marker.id); setMode("edit");
  };
  // Une o tópico ao anterior sem perder nenhum bloco. Se entre os dois houver uma quebra de página
  // (raiz), ela passa a ser um marcador dentro do tópico unido.
  const mergeInfo = (block) => {
    if (!block || block.type !== "topic") return null;
    const bi = lesson.blocks.findIndex((b) => b.id === block.id);
    if (bi < 1) return null;
    const prev = lesson.blocks[bi - 1];
    if (prev.type === "topic") return { from: bi - 1, withBreak: false };
    if (prev.type === "pagebreak" && bi >= 2 && lesson.blocks[bi - 2].type === "topic") return { from: bi - 2, withBreak: true };
    return null;
  };
  const mergeTopicWithPrevious = (block) => {
    const info = mergeInfo(block);
    if (!info) return;
    const A = lesson.blocks[info.from];
    const kids = [...(A.props.children || []), ...(info.withBreak ? [window.newChildBlock("pagebreak")] : []), ...(block.props.children || [])];
    const blocks = [...lesson.blocks];
    blocks.splice(info.from, info.withBreak ? 3 : 2, setChildren(A, kids));
    commit({ ...lesson, blocks }); setSelected(A.id);
  };
  const insertChild = (topicId, type, idx) => {
    if (window.ROOT_STRUCTURE_TYPES.indexOf(type) !== -1) return insertRootAtChild(topicId, type, idx);
    if (type === "collapsebreak") return insertCollapseBreak(topicId, idx);
    return insertInto(topicTargetKey(topicId), type, idx);
  };

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
  const [scormCheck, setScormCheck] = useStateA(null);
  const [versionsOpen, setVersionsOpen] = useStateA(false);
  const [republishOpen, setRepublishOpen] = useStateA(false);
  const [moodle, setMoodle] = useStateA(null); // {links}
  const [clearOpen, setClearOpen] = useStateA(false);
  const [busyMsg, setBusyMsg] = useStateA(null);
  const [richOpen, setRichOpen] = useStateA(false);
  const [a11yOpen, setA11yOpen] = useStateA(false);
  // contagem de erros+avisos (regras de conteúdo) para o selo do botão
  const a11yCount = React.useMemo(() => { try { const ig = new Set((lesson.meta && lesson.meta.a11yIgnored) || []); return window.A11y.audit(lesson).filter((i) => i.sev !== "tip" && !window.A11y.isIgnored(i, ig)).length; } catch (e) { return 0; } }, [lesson]);
  const gotoBlock = (id, trail, findText) => {
    setMode("edit"); if (id) setRightOpen(true); // para corrigir o item, o painel de propriedades precisa estar aberto
    setTimeout(() => {
      let el = null;
      if (id) { el = document.querySelector('[data-bid="' + id + '"]'); for (let k = (trail || []).length - 1; !el && k >= 0; k--) el = document.querySelector('[data-bid="' + trail[k] + '"]'); if (id) setSelected(el && el.getAttribute("data-bid") ? el.getAttribute("data-bid") : id); }
      else if (findText) {
        const root = document.querySelector("[data-lz-canvas]");
        if (root) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const needle = findText.replace(/…$/, "").slice(0, 30); while ((n = w.nextNode())) { if (n.textContent && n.textContent.replace(/\s+/g, " ").includes(needle)) { el = n.parentElement; break; } } }
      }
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.animate([{ outline: "3px solid #e76f51", outlineOffset: "4px" }, { outline: "3px solid transparent", outlineOffset: "4px" }], { duration: 1600 }); }
    }, 80);
  };

  const slugName = (s) => (s || "classatelier").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "classatelier";

  const downloadProject = () => {
    const blob = new Blob([JSON.stringify(lesson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = window.projectFileName(lesson);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const openProjectClick = () => fileInputRef.current && fileInputRef.current.click();
  // ── texto da aula: copiar, baixar e devolver ao ClassAuthor ──
  const copyLessonText = async () => {
    const text = window.lessonToText(lessonRef.current);
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove(); } catch (e2) {}
    }
    showToast(ok ? "Texto da aula copiado (" + text.split(/\s+/).filter(Boolean).length + " palavras)." : "Não consegui copiar sozinho. Use «Baixar o texto (.txt)».");
  };
  const downloadLessonText = () => {
    const blob = new Blob([window.lessonToText(lessonRef.current)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = window.projectFileName(lessonRef.current).replace(/(-ClassAtelier)?\.json$/i, "") + "-texto.txt";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const sendToAuthor = () => {
    const opener = window.opener;
    if (!opener || opener.closed || !authorOrigin) {
      showToast("Para devolver a aula, abra-a pelo botão «Abrir esta semana no ClassAtelier» do ClassAuthor e mantenha a aba dele aberta. Enquanto isso, use «Copiar o texto da aula».");
      return;
    }
    const lesson = lessonRef.current;
    const src = curRef.current.source;
    const fileName = src && src.app === "classauthor" ? src.key : "";
    const title = (lesson.meta && lesson.meta.title) || "";
    let done = false;
    const finish = (msg) => { if (done) return; done = true; window.removeEventListener("message", onReply); clearTimeout(timer); showToast(msg); };
    const onReply = (ev) => {
      const d = ev.data;
      if (ev.source !== opener || ev.origin !== authorOrigin || !d) return;
      if (d.type === "classauthor:received") finish("Enviada ao ClassAuthor" + (d.week ? " (semana " + d.week + ")" : "") + ". Lá, o cartão da semana passa a usar esta versão.");
      else if (d.type === "classauthor:error") finish("O ClassAuthor não aceitou a aula: " + (d.message || "erro desconhecido") + ". Use «Copiar o texto da aula» ou «Salvar».");
    };
    window.addEventListener("message", onReply);
    const timer = setTimeout(() => finish("O ClassAuthor não respondeu. A aba dele ainda está aberta? Use «Copiar o texto da aula» ou «Salvar» como alternativa."), 6000);
    try {
      opener.postMessage({ type: "classatelier:lesson", fileName, title, lesson: JSON.parse(JSON.stringify(lesson)), text: window.lessonToText(lesson) }, authorOrigin);
      snap("manual", "Enviada ao ClassAuthor").catch(() => {});
    } catch (e) { finish("Não consegui enviar ao ClassAuthor: " + String(e && e.message || e)); }
  };
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
    snap("safety", "Antes de limpar a página");
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
    <div style={{ display: "grid", gridTemplateColumns: mode === "preview" ? "1fr" : "248px 1fr " + (rightOpen ? "320px" : "40px"), height: "100vh", overflow: "hidden", transition: "grid-template-columns 160ms ease" }}>
      {mode === "edit" && (
        <Palette onDragType={setDragType} onAdd={(t) => insertBlock(t, null)} />
      )}

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden", borderLeft: mode === "edit" ? "1px solid var(--tool-line)" : "none", borderRight: mode === "edit" ? "1px solid var(--tool-line)" : "none" }}>
        <Topbar
          lesson={lesson} setLesson={commit} mode={mode} setMode={setMode}
          onUndo={undo} canUndo={history.current.length > 0}
          onExportHTML={exportHTML} onExportStandaloneHTML={exportStandaloneHTML} onExportSCORM={() => setScormOpen(true)} onPrintPDF={printPDF}
          onOpenProject={openProjectClick} onDownloadProject={downloadProject}
          onRichNotes={() => setRichOpen(true)} onA11y={() => setA11yOpen((v) => !v)} a11yOpen={a11yOpen} a11yCount={a11yCount} onLibrary={async () => { try { await flushCurrent(); } catch (e) {} setLibPre(false); setLibOpen(true); }} onCourse={async () => { try { await flushCurrent(); } catch (e) {} setLibPre(true); setLibOpen(true); }}
          onClear={() => setClearOpen(true)} canClear={hasLessonContent} onVersions={() => setVersionsOpen(true)} onRepublish={() => setRepublishOpen(true)} onMoodle={() => setMoodle({ links: [] })} onCopyText={copyLessonText} onDownloadText={downloadLessonText} onToAuthor={sendToAuthor} authorLinked={!!authorOrigin && !!window.opener}
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
        <aside aria-label="Propriedades" style={{ background: "var(--tool-panel)", minWidth: 0, height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
          {rightOpen ? (<>
            <button onClick={() => setRightOpen(false)} title="Recolher painel de propriedades" aria-label="Recolher painel de propriedades" aria-expanded="true"
              style={{ position: "absolute", top: 11, right: 10, zIndex: 6, width: 28, height: 28, display: "grid", placeItems: "center", border: "1px solid var(--tool-line)", background: "#fff", borderRadius: 7, cursor: "pointer", color: "var(--tool-ink-2)", fontSize: 15, lineHeight: 1 }}>»</button>
            {selBlock
              ? <window.PropertiesPanel block={selBlock} update={(patch) => updateBlock(selBlock.id, patch)} mergePrev={mergeInfo(selBlock) ? () => mergeTopicWithPrevious(selBlock) : null} />
              : <LessonMeta lesson={lesson} setLesson={(L) => setLesson(L)} />}
          </>) : (
            <button onClick={() => setRightOpen(true)} title="Abrir painel de propriedades" aria-label="Abrir painel de propriedades" aria-expanded="false"
              style={{ flex: 1, border: 0, background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 14, color: "var(--tool-ink-2)" }}>
              <span aria-hidden="true" style={{ width: 28, height: 28, display: "grid", placeItems: "center", border: "1px solid var(--tool-line)", background: "#fff", borderRadius: 7, fontSize: 15, lineHeight: 1 }}>«</span>
              <span style={{ writingMode: "vertical-rl", fontSize: 12, fontWeight: 650, letterSpacing: ".06em" }}>{selBlock ? "PROPRIEDADES DO BLOCO" : "DADOS DA AULA"}</span>
            </button>
          )}
        </aside>
      )}

      {libOpen && <LibraryDialog preselectCurrent={libPre} currentId={curRef.current.id} onClose={() => setLibOpen(false)}
        onOpen={async (e) => { await switchTo(e.lesson, e.id, e.source); setLibOpen(false); setMode("edit"); }}
        onNew={async () => { await switchTo(emptyLesson(), newLessonId(), null); setLibOpen(false); setMode("edit"); }}
        onCourse={(entries) => setCourseEntries(entries)} />}
      {courseEntries && <CourseDialog entries={courseEntries} onMoodle={(links) => setMoodle({ links })} onClose={() => setCourseEntries(null)} onCheck={(title, load) => setScormCheck({ title, load })}
        onConfirm={async (opts) => { try { await (opts.format === "site" ? window.downloadCourseSite : window.downloadCourseSCORM)(opts.lessons, opts); setCourseEntries(null); showToast("Pacote do curso gerado."); } catch (e) { alert("Erro ao gerar o pacote do curso: " + e.message); } }} />}
      {toast && <div role="status" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10000, maxWidth: 520, padding: "12px 18px", borderRadius: 12, background: "#14213D", color: "#fff", fontSize: 13, lineHeight: 1.5, boxShadow: "0 18px 44px rgba(20,33,61,.3)" }}>{toast}</div>}
      <window.MarkToolbar />
      <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={onProjectFile} style={{ display: "none" }} />
      {scormOpen && <ScormDialog lesson={lesson} onClose={() => setScormOpen(false)} onConfirm={exportSCORM} onCheck={(title, load) => setScormCheck({ title, load })} />}
      {moodle && <window.MoodleDialog links={moodle.links} onClose={() => setMoodle(null)} />}
      {republishOpen && <window.RepublishDialog lesson={lesson} onClose={() => setRepublishOpen(false)} />}
      {versionsOpen && <window.VersionsDialog lessonId={curRef.current.id} lesson={lesson} onClose={() => setVersionsOpen(false)} onRestore={restoreVersion} onApplyBlock={applyVersionBlock} />}
      {scormCheck && <ScormCheckDialog title={scormCheck.title} load={scormCheck.load} onClose={() => setScormCheck(null)} />}
      {clearOpen && <ClearDialog count={(lesson.blocks || []).length} onClose={() => setClearOpen(false)} onConfirm={clearLesson} />}
      {a11yOpen && <window.A11yPanel lesson={lesson} onClose={() => setA11yOpen(false)} onGoto={gotoBlock} ignored={(lesson.meta && lesson.meta.a11yIgnored) || []} onIgnored={(list) => setLesson((L) => ({ ...L, meta: { ...(L.meta || {}), a11yIgnored: list } }))} />}
      {richOpen && <RichNotesDialog lesson={lesson} onClose={() => setRichOpen(false)} onUpdate={(kind, original, next) => { pushHistory(); setLesson((L) => ({ ...L, blocks: reviseRichNotes(L.blocks, kind, original, next) })); }} />}
    </div>
  );
}

// ── Left: block palette ──
// Palavras-chave extras para achar o bloco pelo que ele FAZ (não só pelo nome).
const PALETTE_KEYS = {
  topic: "seção secao bloco container agrupar faixa fundo conteudo",
  "topic-collapsible": "recolher expandir abrir fechar sanfona colapsar esconder",
  "topic-slider": "carrossel deslizar passar páginas paginas",
  hero: "capa abertura início inicio topo título titulo cabeçalho cabecalho banner",
  divider: "capítulo capitulo separador separar seção secao",
  pagebreak: "pdf imprimir página pagina quebra impressão impressao",
  titulo: "heading subtítulo subtitulo h2 h3 h4 cabeçalho cabecalho",
  sintese: "resumo conclusão conclusao fim encerrar fechamento final",
  referencias: "bibliografia abnt citações citacoes livros artigos fontes",
  prose: "texto parágrafo paragrafo corpo escrever conteúdo conteudo",
  citacao: "frase autor epígrafe epigrafe aspas depoimento",
  eyebrow: "sobrelinha rótulo rotulo chamada pequeno",
  destaque: "nota importante veja bem dica caixa realçar realcar",
  atencao: "cuidado alerta aviso perigo warning",
  reflexao: "pergunta pensar refletir provocação provocacao questão questao",
  pitaco: "comentário comentario balão balao fala conversa opinião opiniao",
  imagem: "foto figura ilustração ilustracao imagem legenda picture",
  parallax: "foto fundo larga panorâmica panoramica efeito rolagem",
  video: "youtube vídeo filme assistir aula gravada",
  audio: "podcast som áudio mp3 ouvir episódio episodio",
  cases: "casos exemplos cartões cartoes cards estudo de caso",
  feature: "ícones icones destaques grade lista benefícios beneficios",
  textoimagem: "lado a lado imagem e texto duas colunas figura",
  filmstrip: "carrossel galeria fotos slides tira rolagem horizontal",
  tabela: "dados linhas colunas planilha quadro comparar comparativo",
  flashcards: "cartões cartoes memorizar revisar frente verso estudo",
  slider: "sequência sequencia passo a passo etapas deslizar slides",
  accordion: "faq perguntas frequentes sanfona expandir respostas dúvidas duvidas",
  collapsebreak: "retrátil retratil recolher esconder dividir expansível expansivel",
  columns: "colunas lado a lado layout duas três tres dividir",
  externalembed: "iframe incorporar embed site padlet google forms mapa miro jamboard externo",
  linhadotempo: "cronologia história historia datas marcos etapas tempo",
  quiz: "pergunta perguntas questões questoes avaliação avaliacao prova teste múltipla escolha multipla exercício exercicio nota",
  materiais: "links leitura complementar download arquivos pdf anexos recursos extras",
};
const palNorm = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function paletteMatches(b, q) {
  const terms = palNorm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  // casa no COMEÇO de uma palavra («vid» acha «vídeo», não «divisor»)
  const hay = " " + palNorm(b.label + " " + b.type + " " + b.cat + " " + (PALETTE_KEYS[b.type] || "")).replace(/[^a-z0-9]+/g, " ");
  return terms.every((t) => hay.includes(" " + t));
}
function Palette({ onDragType, onAdd }) {
  const [q, setQ] = useStateA("");
  const inputRef = useRefA(null);
  const searching = q.trim().length > 0;
  const groups = window.BLOCK_CATS.map((cat) => ({ cat, items: window.BLOCKS.filter((b) => b.cat === cat && paletteMatches(b, q)) })).filter((g) => g.items.length);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const first = groups[0] && groups[0].items[0];
  // atalho "/" foca a busca (fora de campos de texto)
  useEffectA(() => {
    const on = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target, tag = (t.tagName || "").toLowerCase();
      if (t.isContentEditable || tag === "input" || tag === "textarea" || tag === "select") return;
      e.preventDefault(); inputRef.current && inputRef.current.focus();
    };
    window.addEventListener("keydown", on); return () => window.removeEventListener("keydown", on);
  }, []);
  const mark = (text) => {
    if (!searching) return text;
    const terms = palNorm(q).split(/\s+/).filter(Boolean); const n = palNorm(text); const hit = new Array(text.length).fill(false);
    terms.forEach((t) => { let i = n.indexOf(t); while (i >= 0) { if (i === 0 || !/[a-z0-9]/.test(n[i - 1])) for (let k = i; k < i + t.length && k < hit.length; k++) hit[k] = true; i = n.indexOf(t, i + 1); } });
    const out = []; let buf = "", on = false;
    for (let i = 0; i < text.length; i++) { if (hit[i] !== on) { out.push(on ? <mark key={i} style={{ background: "var(--tool-accent-soft, #f7dcd3)", color: "inherit", borderRadius: 2 }}>{buf}</mark> : buf); buf = ""; on = hit[i]; } buf += text[i]; }
    out.push(on ? <mark key="e" style={{ background: "var(--tool-accent-soft, #f7dcd3)", color: "inherit", borderRadius: 2 }}>{buf}</mark> : buf);
    return out;
  };
  return (
    <aside className="tool-scroll" style={{ background: "var(--tool-panel)", overflowY: "auto", height: "100vh", padding: "14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px 12px" }}>
          <img src={(window.AULA_BASE || "") + "assets/brand/classatelier-mark.png"} alt="" width="26" height="26" style={{ display: "block", borderRadius: 7 }} />
        <span style={{ fontSize: 17, lineHeight: 1, whiteSpace: "nowrap" }}><b style={{ fontWeight: 800, letterSpacing: "-.045em" }}>Class</b><i style={{ fontFamily: "var(--font-serif, Newsreader, Georgia, serif)", fontStyle: "italic", fontWeight: 400, letterSpacing: "-.02em" }}>Atelier</i></span>
      </div>
      <div style={{ position: "sticky", top: -14, zIndex: 5, background: "var(--tool-panel)", margin: "0 -2px 12px", padding: "2px 2px 6px" }}>
        <div style={{ position: "relative" }}>
          <input ref={inputRef} value={q} data-pal="search" type="search" role="searchbox" aria-label="Buscar blocos" placeholder="Buscar bloco…  ( / )" autoComplete="off" spellCheck={false}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { if (q) setQ(""); else e.target.blur(); }
              if (e.key === "Enter" && first) { e.preventDefault(); onAdd(first.type); }
            }}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 9, padding: "8px 30px 8px 10px", fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "var(--tool-ink)", outline: "none" }} />
          {q && <button onClick={() => { setQ(""); inputRef.current && inputRef.current.focus(); }} aria-label="Limpar a busca" title="Limpar a busca" style={{ position: "absolute", right: 4, top: 4, width: 24, height: 24, border: 0, background: "none", fontSize: 17, lineHeight: 1, cursor: "pointer", color: "var(--tool-ink-3)" }}>×</button>}
        </div>
        {searching && <p data-pal="count" role="status" style={{ margin: "6px 4px 0", fontSize: 11.5, color: "var(--tool-ink-3)" }}>{total ? total + " bloco" + (total > 1 ? "s" : "") + " · Enter insere o primeiro" : "Nenhum bloco encontrado"}</p>}
      </div>
      {searching && !total && <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--tool-ink-3)", margin: "0 4px" }}>Tente outra palavra: o que o bloco faz (ex.: «pergunta», «linha do tempo», «vídeo», «tabela») ou o nome dele.</p>}
      {groups.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--tool-ink-3)", margin: "0 4px 8px" }}>{cat}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {items.map((b) => (
              <div key={b.type} className="palette-item" draggable data-pal-type={b.type}
                onDragStart={(e) => { onDragType(b.type); e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", b.type); }}
                onDragEnd={() => onDragType(null)}
                onDoubleClick={() => onAdd(b.type)}
                title={"Arraste para a página · ou clique duas vezes para inserir"}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 8, border: "1px solid " + (searching && b === first ? "var(--tool-accent)" : "var(--tool-line)"), background: "var(--tool-surface)", cursor: "grab" }}>
                <window.Icon name={b.icon} size={16} stroke={1.8} color="var(--tool-ink-2)" />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--tool-ink)" }}>{mark(b.label)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function LibraryDialog({ currentId, preselectCurrent, onClose, onOpen, onNew, onCourse }) {
  const [items, setItems] = useStateA(null);
  const [picked, setPicked] = useStateA(preselectCurrent && currentId ? { [currentId]: true } : {});
  const [failed, setFailed] = useStateA(false);
  const load = () => libAll().then((all) => setItems(all.sort((a, b) => b.updatedAt - a.updatedAt))).catch(() => setFailed(true));
  useEffectA(() => { load(); }, []);
  const remove = async (e) => {
    if (!window.confirm("Excluir «" + e.title + "» da biblioteca?\n\nIsso não pode ser desfeito. Para guardar uma cópia, abra a aula e use Salvar.")) return;
    try { await libDel(e.id); await window.Versions.removeAll(e.id); } catch (err) {}
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
          <span style={{ fontSize: 12, color: "var(--tool-ink-3)" }}>{pickedList.length ? pickedList.length + (pickedList.length === 1 ? " aula marcada" : " aulas marcadas") : "Marque as aulas para montar o site ou o pacote do curso."}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...ghostBtn, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }} onClick={() => { const all = (items || []).length && pickedList.length === (items || []).length; setPicked(all ? {} : Object.fromEntries((items || []).map((e) => [e.id, true]))); }}>Marcar todas</button>
            <button disabled={!pickedList.length} onClick={() => onCourse(pickedList)} style={{ ...primaryBtn, opacity: pickedList.length ? 1 : 0.45, cursor: pickedList.length ? "pointer" : "default" }}>Montar curso…</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function CourseDialog({ entries, onClose, onConfirm, onCheck, onMoodle }) {
  const [list, setList] = useStateA(entries);
  const [title, setTitle] = useStateA("");
  const [version, setVersion] = useStateA("1.2");
  const [format, setFormat] = useStateA("site");
  const [busy, setBusy] = useStateA(false);
  const PUB_KEY = "aulastudio.publish.v1";
  const [gh, setGh] = useStateA(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(PUB_KEY) || "{}") || {}; } catch (e) {}
    return { owner: saved.owner || "", repo: saved.repo || "", branch: saved.branch || "main", folder: saved.folder || "", token: saved.token || "", remember: !!saved.token, createRepo: saved.createRepo !== false, enablePages: saved.enablePages !== false };
  });
  const setG = (k, v) => setGh((g) => ({ ...g, [k]: v }));
  const [progress, setProgress] = useStateA("");
  const [published, setPublished] = useStateA(null);
  const [pubError, setPubError] = useStateA("");
  const publish = async () => {
    if (!title.trim()) { alert("Dê um nome ao curso."); return; }
    setBusy(true); setPubError(""); setPublished(null); setProgress("Começando…");
    try {
      const res = await window.publishCourseToGitHub(list.map((e) => e.lesson), { title: title.trim(), ...gh }, setProgress);
      try {
        const keep = { owner: gh.owner, repo: gh.repo, branch: gh.branch, folder: gh.folder, createRepo: gh.createRepo, enablePages: gh.enablePages };
        if (gh.remember) keep.token = gh.token;
        localStorage.setItem(PUB_KEY, JSON.stringify(keep));
      } catch (e) {}
      setPublished(res);
    } catch (e) { setPubError(e.message || String(e)); }
    finally { setBusy(false); setProgress(""); }
  };
  const copy = (text) => { try { navigator.clipboard.writeText(text); } catch (e) {} };
  const move = (i, d) => setList((L) => { const n = L.slice(); const j = i + d; if (j < 0 || j >= n.length) return L; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const checkCourse = () => {
    if (!title.trim()) { alert("Dê um nome ao curso."); return; }
    onCheck(title.trim() + " (SCORM " + version + ")", async () => (await window.buildCourseSCORMBlob(list.map((e) => e.lesson), { title: title.trim(), version })).blob);
  };
  const go = async () => {
    if (!title.trim()) { alert("Dê um nome ao curso."); return; }
    setBusy(true);
    try { await onConfirm({ title: title.trim(), version, format, lessons: list.map((e) => e.lesson) }); } finally { setBusy(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(20,20,28,0.42)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 94vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden", fontFamily: "var(--tool-sans)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--tool-line)", fontSize: 15, fontWeight: 700 }}>Montar o curso</div>
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
          <div style={{ marginBottom: 14 }}>
            <label style={dlgLabel}>Formato</label>
            <div style={{ display: "flex", gap: 4, background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, padding: 3 }}>
              {[{ id: "site", label: "Site HTML (.zip)" }, { id: "github", label: "Publicar no GitHub" }, { id: "scorm", label: "Pacote SCORM" }].map((o) => (
                <button key={o.id} onClick={() => setFormat(o.id)} style={{ flex: 1, padding: "7px 6px", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: format === o.id ? "#fff" : "transparent", color: format === o.id ? "var(--tool-ink)" : "var(--tool-ink-3)" }}>{o.label}</button>
              ))}
            </div>
            {format === "site" && <p style={{ ...menuSub, marginTop: 8 }}>Gera <b>index.html</b> (lista do curso) e <b>aula-01.html</b>, <b>aula-02.html</b>… com endereços que não mudam, mais um <b>LEIA-ME</b> com o passo a passo para publicar no GitHub e linkar no Moodle.</p>}
            {format === "github" && <p style={{ ...menuSub, marginTop: 8 }}>Envia o site do curso direto para um repositório seu no GitHub e liga o GitHub Pages. Você precisa de um <b>token de acesso</b> (passo a passo abaixo). Ele vai só do seu navegador para o GitHub.</p>}
          </div>
          {format === "github" && (
            <div style={{ marginBottom: 14, padding: "12px 14px", border: "1px solid var(--tool-line)", borderRadius: 10, background: "var(--tool-surface)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><label style={dlgLabel}>Conta ou organização</label><input value={gh.owner} onChange={(e) => setG("owner", e.target.value)} placeholder="usuario-ou-organizacao" autoComplete="off" style={dlgInput} /></div>
                <div style={{ flex: 1 }}><label style={dlgLabel}>Repositório</label><input value={gh.repo} onChange={(e) => setG("repo", e.target.value)} placeholder="meu-curso" autoComplete="off" style={dlgInput} /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><label style={dlgLabel}>Branch</label><input value={gh.branch} onChange={(e) => setG("branch", e.target.value)} placeholder="main" autoComplete="off" style={dlgInput} /></div>
                <div style={{ flex: 1 }}><label style={dlgLabel}>Pasta dentro do repositório (opcional)</label><input value={gh.folder} onChange={(e) => setG("folder", e.target.value)} placeholder="ex.: tge-2026" autoComplete="off" style={dlgInput} /></div>
              </div>
              <p style={{ ...menuSub, margin: 0 }}>Um repositório pode hospedar vários cursos: use uma <b>pasta</b> diferente para cada um.</p>
              <div>
                <label style={dlgLabel}>Token de acesso do GitHub</label>
                <input type="password" value={gh.token} onChange={(e) => setG("token", e.target.value)} placeholder="github_pat_…" autoComplete="off" spellCheck={false} style={dlgInput} />
                <p style={{ ...menuSub, marginTop: 6, marginBottom: 0 }}>Crie em <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">github.com/settings/personal-access-tokens/new</a>: escolha <b>Only select repositories</b> (o do curso) e, em Permissions, <b>Contents: Read and write</b> e <b>Pages: Read and write</b>. Defina um prazo curto de validade.</p>
                <p style={{ ...menuSub, marginTop: 6, marginBottom: 0 }}><b>Repositório de outra pessoa ou de uma organização onde você é colaborador?</b> O token fino não alcança esse caso. Use um token clássico, em <a href="https://github.com/settings/tokens/new?scopes=repo&description=ClassAtelier" target="_blank" rel="noopener noreferrer">github.com/settings/tokens/new</a>, marcando só a permissão <b>repo</b>.</p>
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}><input type="checkbox" checked={gh.createRepo} onChange={(e) => setG("createRepo", e.target.checked)} style={{ marginTop: 2 }} /><span>Criar o repositório (público) se ele ainda não existir, na minha conta</span></label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}><input type="checkbox" checked={gh.enablePages} onChange={(e) => setG("enablePages", e.target.checked)} style={{ marginTop: 2 }} /><span>Ligar o GitHub Pages, se estiver desligado</span></label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--tool-ink-3)" }}><input type="checkbox" checked={gh.remember} onChange={(e) => setG("remember", e.target.checked)} style={{ marginTop: 2 }} /><span>Lembrar o token neste navegador (não use em computador compartilhado). Se desmarcado, ele é esquecido ao fechar.</span></label>
              {pubError && <div role="alert" style={{ padding: "10px 12px", borderRadius: 9, background: "#fdecea", color: "#8a2f18", fontSize: 12.5, lineHeight: 1.5 }}>{pubError}</div>}
              {busy && progress && <div style={{ fontSize: 12.5, color: "var(--tool-ink-2)" }}>{progress}</div>}
              {published && (
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "#e8f5ee", color: "#1b4d36", fontSize: 12.5, lineHeight: 1.55 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{published.sent ? "Publicado: " + published.sent + " arquivo(s) enviado(s) de " + published.total + "." : "Nada mudou: tudo já estava publicado."}</div>
                  <div style={{ marginBottom: 6 }}>GitHub Pages: {published.pages}. {/desligado|não consegui/.test(published.pages) ? "Em Settings → Pages do repositório, escolha a branch e a pasta raiz." : "O site pode levar alguns minutos para aparecer na primeira vez."}</div>
                  {published.links.map((l) => (
                    <div key={l.url} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                      <span style={{ flexShrink: 0, fontWeight: 600 }}>{l.label}</span>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit" }}>{l.url}</a>
                      <button onClick={() => copy(l.url)} style={{ ...ghostBtn, width: "auto", height: 26, padding: "0 8px", fontSize: 11.5 }}>Copiar</button>
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}><button onClick={() => onMoodle && onMoodle(published.links)} data-act="moodle" style={{ ...ghostBtn, width: "auto", height: 30, padding: "0 12px", fontSize: 12.5, fontWeight: 700, background: "#fff", border: "1px solid #b9d9c7" }}>Colocar no Moodle: endereços e código iframe</button></div>
                  {published.commitUrl && <div style={{ marginTop: 6 }}><a href={published.commitUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>Ver a publicação no GitHub</a></div>}
                  <div style={{ marginTop: 6 }}><a href="./acervo/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>Administrar os cursos publicados no ClassAcervo ↗</a></div>
                </div>
              )}
            </div>
          )}
          {format === "scorm" && <div style={{ marginBottom: 6 }}>
            <label style={dlgLabel}>Versão SCORM</label>
            <div style={{ display: "flex", gap: 4, background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, padding: 3 }}>
              {[{ id: "1.2", label: "SCORM 1.2 (recomendado)" }, { id: "2004", label: "SCORM 2004" }].map((o) => (
                <button key={o.id} onClick={() => setVersion(o.id)} style={{ flex: 1, padding: "7px 6px", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: version === o.id ? "#fff" : "transparent", color: version === o.id ? "var(--tool-ink)" : "var(--tool-ink-3)" }}>{o.label}</button>
              ))}
            </div>
            <p style={{ ...menuSub, marginTop: 8 }}>Cada aula vira um item do curso, na ordem acima. A avaliação final de cada aula (quiz marcado como avaliativo) continua enviando nota de 0 a 10 à plataforma.</p>
            <button onClick={checkCourse} data-act="course-scorm-check" style={{ ...ghostBtn, width: "auto", padding: "0 12px", height: 32, fontSize: 12.5, fontWeight: 650, marginTop: 4, border: "1px solid var(--tool-line-2)" }}>Conferir pacote antes de gerar</button>
          </div>}
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ ...ghostBtn, width: "auto", padding: "0 16px", fontSize: 13, fontWeight: 600 }}>{published ? "Fechar" : "Cancelar"}</button>
          <button onClick={format === "github" ? publish : go} disabled={busy} style={primaryBtn}>{busy ? (format === "github" ? "Publicando…" : "Gerando…") : (format === "github" ? "Publicar no GitHub" : format === "site" ? "Gerar site do curso (.zip)" : "Gerar pacote SCORM (.zip)")}</button>
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
function Topbar({ onLibrary, onCourse, lesson, mode, setMode, onUndo, canUndo, onExportHTML, onExportStandaloneHTML, onExportSCORM, onPrintPDF, onOpenProject, onDownloadProject, onRichNotes, onA11y, a11yOpen, a11yCount, onClear, canClear, onVersions, onRepublish, onMoodle, onCopyText, onDownloadText, onToAuthor, authorLinked }) {
  const [busy, setBusy] = useStateA(false);
  const [menu, setMenu] = useStateA(false);
  const [more, setMore] = useStateA(false);
  const wrap = async (fn) => { setBusy(true); setMenu(false); try { await fn(); } finally { setBusy(false); } };
  return (
    <header className="tb" style={{ height: 52, flexShrink: 0, background: "var(--tool-panel)", borderBottom: "1px solid var(--tool-line)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", position: "relative", zIndex: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 0" }}>
        <ThemePicker />
        <span className="tb-title" style={{ width: 1, height: 22, background: "var(--tool-line)" }} />
        <span className="tb-title" style={{ fontWeight: 600, fontSize: 14, color: "var(--tool-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 40 }}>{lesson.meta?.title || "Nova aula"}</span>
        <span className="tb-title" style={{ fontSize: 12, color: "var(--tool-ink-3)", whiteSpace: "nowrap", flexShrink: 0 }}>· {lesson.blocks.length} blocos</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={onUndo} disabled={!canUndo} title="Desfazer (⌘Z)" style={{ ...ghostBtn, opacity: canUndo ? 1 : 0.4 }}><window.TIcon name="undo" size={15} /></button>
        <button className="tb-sec" onClick={onClear} disabled={!canClear} title="Limpar página" style={{ ...ghostBtn, opacity: canClear ? 1 : 0.4, color: canClear ? "var(--coral-deep)" : "var(--tool-ink-3)" }}><window.TIcon name="trash" size={15} /></button>
        <button onClick={onLibrary} title="Biblioteca: todas as aulas guardadas neste navegador (as semanas do ClassAuthor entram aqui)" style={textBtn}><window.TIcon name="library" size={15} /><span className="tb-label">Biblioteca</span></button>
        <button className="tb-sec" onClick={onOpenProject} title="Abrir projeto (…-ClassAtelier.json)" style={textBtn}><window.TIcon name="folder" size={15} /><span className="tb-label">Abrir</span></button>
        <button onClick={onDownloadProject} title="Salvar projeto: baixa o arquivo para continuar depois ou em outro computador" style={textBtn}><window.TIcon name="save" size={15} /><span className="tb-label">Salvar</span></button>
        <button className="tb-sec" onClick={onVersions} title="Histórico de versões: volte a uma versão anterior da aula ou recupere um bloco apagado" style={textBtn}><window.TIcon name="history" size={15} /><span className="tb-label">Histórico</span></button>
        <button className="tb-sec" onClick={onRichNotes} title="Termos e links: revisar glossário e links de toda a aula" style={textBtn}><window.TIcon name="link" size={15} /><span className="tb-label">Termos e links</span></button>
        <button onClick={onA11y} aria-pressed={!!a11yOpen} title="Acessibilidade: verifica imagens sem descrição, contraste, títulos, links, vídeos e tabelas" style={{ ...textBtn, position: "relative", background: a11yOpen ? "var(--tool-surface)" : undefined }}><window.TIcon name="a11y" size={15} /><span className="tb-label">Acessibilidade</span>{a11yCount > 0 && <span aria-label={a11yCount + " itens para revisar"} style={{ minWidth: 17, height: 17, padding: "0 5px", borderRadius: 999, background: "#b3372a", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "inline-grid", placeItems: "center", marginLeft: 2 }}>{a11yCount > 99 ? "99+" : a11yCount}</span>}</button>
        <div style={{ display: "flex", background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, padding: 3 }}>
          <button onClick={() => setMode("edit")} style={segBtn(mode === "edit")}><window.TIcon name="pencil" size={13} /> <span className="tb-seg-label">Editar</span></button>
          <button onClick={() => setMode("preview")} style={segBtn(mode === "preview")}><window.TIcon name="eye" size={13} /> <span className="tb-seg-label">Visualizar</span></button>
        </div>
        <button className="tb-sec" onClick={onPrintPDF} title="Imprimir PDF: abre a versão expandida da aula para imprimir" style={textBtn}><window.TIcon name="printer" size={15} /><span className="tb-label">Imprimir PDF</span></button>
        <div className="tb-more" style={{ position: "relative" }}>
          <button onClick={() => setMore((v) => !v)} title="Mais ações: abrir projeto, termos e links, imprimir PDF, limpar página" aria-haspopup="menu" aria-expanded={more} aria-label="Mais ações" style={{ ...ghostBtn, fontSize: 18, lineHeight: 1, paddingBottom: 5 }}>⋯</button>
          {more && (<>
            <div onClick={() => setMore(false)} style={{ position: "fixed", inset: 0, zIndex: 41 }} />
            <div role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 42, background: "#fff", border: "1px solid var(--tool-line)", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", width: 236, overflow: "hidden" }}>
              <button role="menuitem" onClick={() => { setMore(false); onOpenProject(); }} style={menuItem}><span style={{ fontWeight: 600 }}>Abrir projeto…</span><span style={menuSub}>Reabre um arquivo …-ClassAtelier.json.</span></button>
              <button role="menuitem" onClick={() => { setMore(false); onVersions(); }} style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}><span style={{ fontWeight: 600 }}>Histórico de versões</span><span style={menuSub}>Voltar a uma versão anterior ou recuperar um bloco.</span></button>
              <button role="menuitem" onClick={() => { setMore(false); onRichNotes(); }} style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}><span style={{ fontWeight: 600 }}>Termos e links</span><span style={menuSub}>Revisar glossário e links de toda a aula.</span></button>
              <button role="menuitem" onClick={() => { setMore(false); onPrintPDF(); }} style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}><span style={{ fontWeight: 600 }}>Imprimir PDF</span><span style={menuSub}>Abre a versão expandida para imprimir.</span></button>
              <button role="menuitem" disabled={!canClear} onClick={() => { setMore(false); onClear(); }} style={{ ...menuItem, borderTop: "1px solid var(--tool-line)", opacity: canClear ? 1 : 0.45, color: "var(--coral-deep)" }}><span style={{ fontWeight: 600 }}>Limpar página</span><span style={menuSub}>Remove todos os blocos (dá para desfazer).</span></button>
            </div>
          </>)}
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenu((v) => !v)} disabled={busy} style={primaryBtn}>
            <window.TIcon name="download" size={14} color="#fff" /> {busy ? "Gerando…" : "Exportar"} <span style={{ fontSize: 10, opacity: 0.8 }}>▾</span>
          </button>
          {menu && (
            <>
              <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 41 }} />
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 42, background: "#fff", border: "1px solid var(--tool-line)", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", width: 248, overflowX: "hidden", overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>
                <button onClick={() => { setMenu(false); onDownloadProject(); }} style={menuItem}>
                  <span style={{ fontWeight: 600 }}>Projeto JSON (…-ClassAtelier.json)</span>
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
                <button onClick={() => { setMenu(false); onCourse && onCourse(); }} style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}>
                  <span style={{ fontWeight: 600 }}>Curso e GitHub…</span>
                  <span style={menuSub}>Junta várias aulas da Biblioteca em um site, pacote SCORM ou publicação direta no GitHub (links para o Moodle).</span>
                </button>
                <button onClick={() => { setMenu(false); onMoodle && onMoodle(); }} data-act="moodle-menu" style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}>
                  <span style={{ fontWeight: 600 }}>Colocar no Moodle…</span>
                  <span style={menuSub}>Gera o link (Recurso URL) e o código iframe de uma aula publicada.</span>
                </button>
                <button onClick={() => { setMenu(false); onToAuthor && onToAuthor(); }} data-act="to-author" style={{ ...menuItem, borderTop: "1px solid var(--tool-line)", opacity: authorLinked ? 1 : 0.6 }}>
                  <span style={{ fontWeight: 600 }}>Enviar de volta ao ClassAuthor</span>
                  <span style={menuSub}>{authorLinked ? "Devolve a aula editada (projeto e texto) para a semana de origem." : "Disponível quando a aula é aberta pelo ClassAuthor."}</span>
                </button>
                <button onClick={() => { setMenu(false); onCopyText && onCopyText(); }} data-act="copy-text" style={menuItem}>
                  <span style={{ fontWeight: 600 }}>Copiar o texto da aula</span>
                  <span style={menuSub}>Só as palavras, em ordem, para colar onde quiser.</span>
                </button>
                <button onClick={() => { setMenu(false); onDownloadText && onDownloadText(); }} data-act="download-text" style={menuItem}>
                  <span style={{ fontWeight: 600 }}>Baixar o texto (.txt)</span>
                </button>
                <button onClick={() => { setMenu(false); onRepublish && onRepublish(); }} data-act="republish" style={{ ...menuItem, borderTop: "1px solid var(--tool-line)" }}>
                  <span style={{ fontWeight: 600 }}>Atualizar uma aula já publicada…</span>
                  <span style={menuSub}>Troca só esta aula no GitHub, sem mexer nas outras nem nos links do Moodle.</span>
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
        <span className="tb-theme-name" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tool-ink)", whiteSpace: "nowrap" }}>{String(current.label).split(" — ")[0].replace(/ \(inspirado\)$/, "")}</span>
        <span style={{ fontSize: 10, color: "var(--tool-ink-3)" }}>▾</span>
      </button>
      {open && (<>
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 41 }} />
        <div data-tp="panel" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 42, background: "#fff", border: "1px solid var(--tool-line)", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", width: "min(392px, calc(100vw - 24px))", overflow: "auto", maxHeight: "calc(100vh - 80px)" }}>
          <div style={{ padding: "9px 13px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--tool-ink-3)", borderBottom: "1px solid var(--tool-line)" }}>Tema (design system)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 10 }}>
            {themes.map((t) => {
              const parts = String(t.label).split(" — ");
              const paren = /^(.*?) \(([^)]*)\)$/.exec(parts[0]);
              const name = paren ? paren[1] : parts[0];
              const sub = parts[1] ? parts[1] : (paren ? paren[2] : "");
              const on = t.id === active;
              return (
                <button key={t.id} data-tp="tile" data-theme-id={t.id} onClick={() => pick(t.id)} aria-pressed={on} style={{ textAlign: "left", padding: 6, border: on ? "2px solid var(--tool-sel)" : "1px solid var(--tool-line)", margin: on ? 0 : 1, borderRadius: 10, background: on ? "var(--tool-sel-soft)" : "#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <ThemeThumb theme={t} />
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 2px 2px" }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: on ? 700 : 600, color: "var(--tool-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                      {sub && <span style={{ display: "block", fontSize: 10.5, color: "var(--tool-ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>}
                    </span>
                    {on && <window.TIcon name="check" size={15} color="var(--tool-sel)" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ padding: "9px 13px", fontSize: 11, color: "var(--tool-ink-3)", lineHeight: 1.4, borderTop: "1px solid var(--tool-line)", background: "var(--tool-surface)" }}>Cada miniatura usa as cores, a letra e o formato de botões e avisos do próprio tema. Trocar o tema recarrega o editor; sua aula em andamento é preservada.</div>
        </div>
      </>)}
    </div>
  );
}

// ── Miniatura de um tema: lê as variáveis dos próprios CSS do tema (nada é copiado à mão) ──
const themeTokenCache = {};
const themeFontsLoaded = {};
function themeCssVars(text) {
  const out = {};
  const clean = String(text).replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /:root\s*\{([^}]*)\}/g; let m;
  while ((m = re.exec(clean))) {
    m[1].split(";").forEach((decl) => { const i = decl.indexOf(":"); if (i > 0) { const k = decl.slice(0, i).trim(); if (k.startsWith("--")) out[k] = decl.slice(i + 1).trim(); } });
  }
  const h1 = /(?:^|\n)\s*h1[^{]*\{[^}]*font-weight:\s*(\d+)/.exec(clean);
  if (h1) out["--h1-weight"] = h1[1];
  return out;
}
function loadThemeTokens(t) {
  if (themeTokenCache[t.id]) return themeTokenCache[t.id];
  const base = window.AULA_BASE || "";
  const shared = (window.AULA_THEMES && window.AULA_THEMES.shared) || {};
  const files = [t.css, t.componentsBase || shared.componentsBase, t.componentsCss].filter(Boolean);
  themeTokenCache[t.id] = Promise.all(files.map((f) => fetch(base + f).then((r) => (r.ok ? r.text() : "")).catch(() => ""))).then((texts) => {
    const vars = Object.assign({}, ...texts.map(themeCssVars));
    const get = (name, depth) => {
      let v = vars[name]; if (v == null) return "";
      for (let i = 0; i < 6 && /var\(/.test(v); i++) v = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) => (vars[n] != null ? vars[n] : (fb || "")));
      return v.trim();
    };
    return new Proxy({}, { get: (_, k) => get(String(k)) });
  });
  return themeTokenCache[t.id];
}
function ThemeThumb({ theme }) {
  const [v, setV] = useStateA(null);
  useEffectA(() => {
    let live = true;
    const base = window.AULA_BASE || "";
    if (theme.fontsDir && !themeFontsLoaded[theme.id]) {
      themeFontsLoaded[theme.id] = true;
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = base + theme.fontsDir + "fonts.css"; document.head.appendChild(l);
    }
    loadThemeTokens(theme).then((tokens) => { if (live) setV(tokens); });
    return () => { live = false; };
  }, [theme.id]);
  if (!v) return <div style={{ height: 112, borderRadius: 7, background: "var(--tool-surface)" }} aria-hidden="true" />;
  const none = (s) => !s || s === "none";
  const withColor = (s, color) => (none(s) ? "none" : (/^\s*\d+(\.\d+)?px\s+(solid|dashed)\s*$/.test(s) ? s + " " + color : s));
  const accents = ["marigold", "terracotta", "lavender", "sage", "ocean", "coral"];
  const cardR = v["--c-card-radius"] || "6px";
  const atenR = v["--c-aten-radius"] || cardR;
  const atenBorder = withColor(v["--c-aten-border-left"], v["--marigold-deep"] || "#999");
  const w = v["--h1-weight"] || "600";
  return (
    <div data-tp="thumb" aria-hidden="true" style={{ height: 112, boxSizing: "border-box", background: v["--paper"], color: v["--ink"], border: "1px solid " + (v["--rule"] || "rgba(0,0,0,.12)"), borderRadius: 7, padding: "8px 9px", display: "flex", flexDirection: "column", gap: 4, overflow: "hidden", pointerEvents: "none" }}>
      <span style={{ fontFamily: v["--font-sans"], fontSize: 6.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: v["--c-hero-eyebrow-color"] || v["--c-accent"] }}>Semana 1</span>
      <span style={{ fontFamily: v["--font-display"], fontSize: 15, lineHeight: 1.05, fontWeight: Number(w), letterSpacing: v["--ls-display"] || "normal", color: v["--ink"] }}>Aula de leitura</span>
      <span style={{ fontFamily: v["--font-serif"], fontSize: 8.5, lineHeight: 1.25, color: v["--ink-soft"] }}>O texto corrido usa esta letra.</span>
      <span style={{ background: v["--marigold-soft"], borderLeft: atenBorder, borderRadius: atenR, fontFamily: v["--font-sans"], fontSize: 7.5, fontWeight: 600, color: v["--marigold-deep"], padding: "3px 6px" }}>Atenção</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
        <span style={{ background: v["--c-btn-primary-bg"], color: v["--c-btn-primary-fg"] || "#fff", borderRadius: v["--c-btn-radius"] || "4px", fontFamily: v["--font-sans"], fontSize: 7.5, fontWeight: 700, padding: "3px 9px" }}>Começar</span>
        <span style={{ display: "flex", gap: 2.5, marginLeft: "auto" }}>{accents.map((a) => <i key={a} style={{ width: 6, height: 6, borderRadius: "50%", background: v["--" + a] }} />)}</span>
      </span>
    </div>
  );
}

// ── SCORM options dialog ──
function ScormDialog({ lesson, onClose, onConfirm, onCheck }) {
  const allBlocks = (lesson.blocks || []).flatMap((b) => isTopicType(b.type) ? [b].concat(b.props.children || []) : [b]);
  const quizzes = allBlocks.filter((b) => b.type === "quiz");
  const finalQuizzes = quizzes.filter((b) => b.props.avaliativo);
  const firstFinal = finalQuizzes[0];
  const [title, setTitle] = useStateA(lesson.meta?.title || "Aula");
  const [version, setVersion] = useStateA("1.2");
  const [passMark, setPassMark] = useStateA(firstFinal ? (firstFinal.props.passMark || 6) : 6);
  const [busy, setBusy] = useStateA(false);
  const diagnosticCount = quizzes.length - finalQuizzes.length;
  const zipInput = React.useRef(null);
  const checkNow = () => {
    if (finalQuizzes.length > 1) { alert("Mantenha apenas um quiz marcado como avaliação final. Os demais devem ser diagnósticos sem nota."); return; }
    onCheck(title + " (SCORM " + version + ")", async () => (await window.buildSCORMBlob(lesson, { title, version, avaliativo: finalQuizzes.length > 0, passMark: Number(passMark) || 0 })).blob);
  };
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
        <div style={{ padding: "12px 20px 0", fontSize: 12.5, color: "var(--tool-ink-2)", borderTop: "1px solid var(--tool-line)" }}>
          Antes de enviar à plataforma, <button onClick={checkNow} data-act="scorm-check" style={{ border: 0, background: "none", padding: 0, color: "var(--tool-accent)", cursor: "pointer", textDecoration: "underline", font: "inherit", fontWeight: 700 }}>confira o pacote</button> (estrutura e simulador de plataforma) ou <button onClick={() => zipInput.current && zipInput.current.click()} data-act="scorm-check-file" style={{ border: 0, background: "none", padding: 0, color: "var(--tool-accent)", cursor: "pointer", textDecoration: "underline", font: "inherit", fontWeight: 700 }}>confira um .zip que você já tem</button>.
          <input ref={zipInput} type="file" accept=".zip,application/zip" style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onCheck(f.name, async () => f); }} />
        </div>
        <div style={{ padding: "14px 20px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
  // prévia em aparelhos (só no modo Visualizar); a escolha fica guardada neste navegador
  const [device, setDeviceRaw] = useStateA(() => { try { return localStorage.getItem("aulastudio.device") || "desktop"; } catch (e) { return "desktop"; } });
  const [landscape, setLandscape] = useStateA(false);
  const [devKey, setDevKey] = useStateA(0);
  const setDevice = (d) => { setDeviceRaw(d); try { localStorage.setItem("aulastudio.device", d); } catch (e) {} };

  const handleDropAt = (idx) => {
    if (dragType) { insertBlock(dragType, idx); setDragType(null); }
    else if (dragBlock.current) { reorderTo(dragBlock.current, idx); dragBlock.current = null; }
    setDropIdx(null);
  };

  if (mode === "preview") {
    const devs = window.PREVIEW_DEVICES || [];
    const tbtn = (on) => ({ border: 0, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: "inherit", background: on ? "#fff" : "transparent", color: on ? "var(--tool-ink)" : "var(--tool-ink-3)", boxShadow: on ? "0 1px 2px rgba(0,0,0,.15)" : "none" });
    return (
      <div className="canvas-mat" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div data-dp="bar" style={{ flex: "none", display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap", padding: "8px 12px", borderBottom: "1px solid var(--tool-line)", background: "var(--tool-panel)" }}>
          <span style={{ fontSize: 12, color: "var(--tool-ink-3)" }}>Ver como:</span>
          <div role="group" aria-label="Aparelho da prévia" style={{ display: "flex", background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 8, padding: 2 }}>
            {devs.map((d) => <button key={d.id} data-dev={d.id} onClick={() => setDevice(d.id)} aria-pressed={device === d.id} style={tbtn(device === d.id)}>{d.label}</button>)}
          </div>
          {device !== "desktop" && <>
            <button onClick={() => setLandscape((v) => !v)} aria-pressed={landscape} data-dp="rotate" title="Girar o aparelho" style={{ ...ghostBtn, width: "auto", height: 30, padding: "0 10px", fontSize: 12, fontWeight: 650 }}>{landscape ? "Em pé" : "Deitar"}</button>
            <button onClick={() => setDevKey((k) => k + 1)} data-dp="reload" title="Recarregar a prévia (volta ao começo da aula)" style={{ ...ghostBtn, width: "auto", height: 30, padding: "0 10px", fontSize: 12, fontWeight: 650 }}>Recarregar</button>
          </>}
        </div>
        {device === "desktop"
          ? <div className="tool-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><div data-lz-canvas style={{ background: "var(--paper)" }}><window.LessonRenderer lesson={lesson} mode="preview" chrome={true} /></div></div>
          : <window.DevicePreview lesson={lesson} device={device} landscape={landscape} reloadKey={devKey} />}
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
  const childPickerTypes = window.CHILD_PICKER_TYPES.filter((t) => !(t === "collapsebreak" && block.type === "topic-slider"));
  const renderChild = (c, i) => (
    <div
      key={c.id}
      className={"aula-topic-item lz-child" + (selectedId === c.id ? " is-selected" : "")}
      data-type={c.type} data-bid={c.id}
      onClick={(e) => { e.stopPropagation(); setSelected(c.id); }}>
      <ChildInsert types={childPickerTypes} at={i} topicId={block.id} dragBlock={dragBlock} moveChildTo={moveChildTo} openAt={childAddAt} setOpenAt={setChildAddAt} onPick={(t) => { insertChild(block.id, t, i); setChildAddAt(null); }} />
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
    <div data-bid={block.id}
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
        <ChildInsert types={childPickerTypes} at={kids.length} topicId={block.id} dragBlock={dragBlock} moveChildTo={moveChildTo} tail openAt={childAddAt} setOpenAt={setChildAddAt} onPick={(t) => { insertChild(block.id, t, kids.length); setChildAddAt(null); }} />
      )}
    </div>
  );
}
const shellBtn = { display: "grid", placeItems: "center", width: 26, height: 24, border: 0, background: "transparent", borderRadius: 5, cursor: "pointer" };

// Inline "+" to add a block INSIDE a topic. Absolutely positioned at the top
// edge of the item it precedes (insert at that index), so it doesn't disturb
// the topic's flow spacing. `tail` variant sits at the topic's bottom.
function ChildInsert({ at, topicId, dragBlock, moveChildTo, tail, openAt, setOpenAt, onPick, types }) {
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
        <BlockPicker only={types || window.CHILD_PICKER_TYPES} title="Inserir no tópico"
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
