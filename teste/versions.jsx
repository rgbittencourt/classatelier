/* eslint-disable */
// ClassAtelier — histórico de versões.
//
// Cada aula ganha versões guardadas neste navegador (IndexedDB, loja "versions"):
//   auto    — gravada sozinha depois de uns 45 s sem editar; no máximo uma a cada 5 min (as de
//             um mesmo intervalo se fundem na última). Guardamos as 30 mais recentes.
//   manual  — gravada pelo usuário ("Guardar versão agora"), com nome. Nunca é apagada sozinha.
//   safety  — gravada antes de uma ação arriscada (restaurar, limpar a página, trocar pela versão
//             do ClassAuthor). Entra na mesma regra de 30 das automáticas.
(function () {
  const DB = "classatelier", LESSONS = "lessons", VERS = "versions";
  const KEEP_AUTO = 30, COALESCE_MS = 5 * 60 * 1000;

  // Banco único (versão 2): lojas lessons + versions. Usado também pela biblioteca (app.jsx).
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (typeof indexedDB === "undefined") { rej(new Error("IndexedDB indisponível")); return; }
      const r = indexedDB.open(DB, 2);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(LESSONS)) db.createObjectStore(LESSONS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(VERS)) { const s = db.createObjectStore(VERS, { keyPath: "id" }); s.createIndex("byLesson", "lessonId"); }
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
      r.onblocked = () => { dbp = null; rej(new Error("Banco bloqueado por outra aba")); };
    });
    return dbp;
  }
  const tx = (store, mode, fn) => open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(store, mode); const out = fn(t.objectStore(store));
    t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));

  const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + "." + str.length.toString(36); };
  const plain = (h) => String(h == null ? "" : h).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

  async function list(lessonId) {
    const all = await tx(VERS, "readonly", (st) => st.index("byLesson").getAll(IDBKeyRange.only(lessonId)));
    return (all || []).sort((a, b) => b.at - a.at);
  }
  const put = (rec) => tx(VERS, "readwrite", (st) => st.put(rec));
  const remove = (id) => tx(VERS, "readwrite", (st) => st.delete(id));
  async function removeAll(lessonId) { const l = await list(lessonId); for (const r of l) await remove(r.id); }
  async function rename(id, label) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(VERS, "readwrite"); const st = t.objectStore(VERS); const g = st.get(id);
      g.onsuccess = () => { const r = g.result; if (r) { r.label = label; r.kind = label ? "manual" : r.kind; st.put(r); } };
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    });
  }
  const blocksOf = (l) => (l && l.blocks) || [];
  const countAll = (blocks) => blocks.reduce((n, b) => n + 1 + (b.props && Array.isArray(b.props.children) ? b.props.children.length : 0), 0);

  // Grava uma versão. Devolve a gravada, ou null se nada mudou desde a última.
  async function snapshot(lessonId, lesson, opts) {
    opts = opts || {};
    if (!lessonId || !lesson) return null;
    const json = JSON.stringify(lesson);
    const h = hash(json);
    const all = await list(lessonId);
    const latest = all[0];
    const now = Date.now();
    if (latest && latest.hash === h) {
      // igual à última: se o usuário a nomeou agora, só promove a nomeada
      if (opts.kind === "manual" && opts.label) { await rename(latest.id, opts.label); return { ...latest, label: opts.label, kind: "manual" }; }
      return null;
    }
    const base = {
      lessonId, at: now, kind: opts.kind || "auto", label: opts.label || "", hash: h,
      title: (lesson.meta && lesson.meta.title) || "Aula sem título", blocks: blocksOf(lesson).length, size: json.length, lesson,
    };
    let rec;
    if (base.kind === "auto" && latest && latest.kind === "auto" && now - (latest.createdAt || latest.at) < COALESCE_MS) {
      rec = { ...latest, ...base, id: latest.id, createdAt: latest.createdAt || latest.at }; // funde na última automática
    } else {
      rec = { ...base, id: lessonId + ":" + now.toString(36) + Math.random().toString(36).slice(2, 5), createdAt: now };
    }
    await put(rec);
    // poda: só automáticas e de segurança; as nomeadas ficam
    const fresh = (await list(lessonId)).filter((r) => r.kind !== "manual");
    for (const old of fresh.slice(KEEP_AUTO)) await remove(old.id);
    return rec;
  }

  // ── comparação por bloco (primeiro nível; um tópico conta com seus filhos) ──
  function blockText(b) {
    const p = b.props || {};
    const pick = p.title || p.text || p.eyebrow || p.heading || p.label || p.body || p.question || p.quote || p.caption || "";
    let t = plain(pick);
    if (!t && Array.isArray(p.children)) {
      for (const c of p.children) { const cp = c.props || {}; t = plain(cp.title || cp.text || cp.body || cp.eyebrow || ""); if (t) break; }
    }
    return t.length > 90 ? t.slice(0, 88) + "…" : t;
  }
  const typeLabel = (b) => { const d = window.BLOCK_BY_TYPE && window.BLOCK_BY_TYPE[b.type]; return (d && d.label) || b.type; };
  function compare(version, current) {
    const vb = blocksOf(version), cb = blocksOf(current);
    const cById = new Map(cb.map((b) => [b.id, b]));
    const vById = new Map(vb.map((b) => [b.id, b]));
    const rows = vb.map((b, i) => {
      const c = cById.get(b.id);
      let status = "removed";
      if (c) status = JSON.stringify(c) === JSON.stringify(b) ? "same" : "changed";
      return { id: b.id, status, idx: i, old: b, now: c || null, label: typeLabel(b), text: blockText(b) };
    });
    const added = cb.filter((b) => !vById.has(b.id)).map((b) => ({ id: b.id, status: "added", old: null, now: b, label: typeLabel(b), text: blockText(b) }));
    const mv = (version.meta || {}), mc = (current.meta || {});
    const metaChanged = [...new Set(Object.keys(mv).concat(Object.keys(mc)))].filter((k) => k !== "a11yIgnored" && JSON.stringify(mv[k]) !== JSON.stringify(mc[k]));
    return { rows, added, metaChanged, counts: { same: rows.filter((r) => r.status === "same").length, changed: rows.filter((r) => r.status === "changed").length, removed: rows.filter((r) => r.status === "removed").length, added: added.length } };
  }
  // Recoloca no lugar um bloco removido (depois do bloco anterior que ainda existe) ou troca um alterado.
  function applyBlock(current, version, blockId) {
    const vb = blocksOf(version); const idx = vb.findIndex((b) => b.id === blockId); if (idx < 0) return current;
    const old = vb[idx]; const cb = blocksOf(current).slice();
    const at = cb.findIndex((b) => b.id === blockId);
    if (at >= 0) cb[at] = old;
    else {
      let pos = 0;
      for (let i = idx - 1; i >= 0; i--) { const j = cb.findIndex((b) => b.id === vb[i].id); if (j >= 0) { pos = j + 1; break; } }
      cb.splice(pos, 0, old);
    }
    return { ...current, blocks: cb };
  }

  window.Versions = { open, list, snapshot, rename, remove, removeAll, compare, applyBlock, blockText, countAll, KEEP_AUTO };
})();

// ── Diálogo ──
function vsRel(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "agora há pouco";
  const m = Math.round(s / 60); if (m < 60) return "há " + m + " min";
  const h = Math.round(m / 60); if (h < 24) return "há " + h + " h";
  const d = Math.round(h / 24); return "há " + d + (d === 1 ? " dia" : " dias");
}
const vsFmt = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const VS_KIND = { auto: "Automática", manual: "Nomeada", safety: "De segurança" };
const VS_ST = {
  same: { l: "igual", c: "#5b6270", bg: "#eceef2" },
  changed: { l: "alterado depois", c: "#8a5a00", bg: "#fbefcf" },
  removed: { l: "removido depois", c: "#b3372a", bg: "#f9e1dc" },
  added: { l: "novo (não existia)", c: "#2c5b7a", bg: "#e3eef5" },
};

function VersionsDialog({ lessonId, lesson, onClose, onRestore, onApplyBlock }) {
  const [items, setItems] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [sel, setSel] = React.useState(null);
  const [name, setName] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [renaming, setRenaming] = React.useState(null);
  const [showSame, setShowSame] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const reload = async (keep) => {
    try { const l = await window.Versions.list(lessonId); setItems(l); setSel((cur) => (keep && l.find((x) => x.id === keep)) ? keep : (cur && l.find((x) => x.id === cur) ? cur : (l[0] && l[0].id) || null)); }
    catch (e) { setErr((e && e.message) || String(e)); setItems([]); }
  };
  React.useEffect(() => { reload(); }, [lesson]);
  const cur = items && items.find((x) => x.id === sel);
  const cmp = cur ? window.Versions.compare(cur.lesson, lesson) : null;
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 4000); };

  const saveNow = async () => {
    try {
      const r = await window.Versions.snapshot(lessonId, lesson, { kind: "manual", label: name.trim() || "Versão guardada" });
      setName("");
      if (!r) flash("Nada mudou desde a última versão: ela já está guardada."); else flash("Versão guardada.");
      await reload(r && r.id);
    } catch (e) { setErr((e && e.message) || String(e)); }
  };
  const doRename = async () => { await window.Versions.rename(renaming.id, renaming.text.trim()); setRenaming(null); reload(); };
  const del = async () => { if (!cur) return; if (!window.confirm("Excluir esta versão? Isso não pode ser desfeito.")) return; await window.Versions.remove(cur.id); setSel(null); reload(); };
  const download = () => {
    const blob = new Blob([JSON.stringify(cur.lesson, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (window.projectFileName ? window.projectFileName(cur.lesson) : "versao-ClassAtelier.json"); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const btn = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 650, cursor: "pointer", fontFamily: "inherit", color: "var(--tool-ink)" };
  const primary = { ...btn, background: "var(--tool-accent)", color: "#fff", border: 0 };
  const rows = cmp ? cmp.rows.concat(cmp.added).filter((r) => showSame || r.status !== "same") : [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(20,20,28,.48)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={onClose}>
      <section role="dialog" aria-label="Histórico de versões" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(1060px, 97vw)", height: "min(800px, 94vh)", display: "flex", flexDirection: "column", background: "var(--tool-surface)", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", padding: "16px 20px", background: "#fff", borderBottom: "1px solid var(--tool-line)" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Histórico de versões</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tool-ink-3)", maxWidth: 760, lineHeight: 1.45 }}>«{(lesson.meta && lesson.meta.title) || "Aula sem título"}». O ClassAtelier guarda versões sozinho, enquanto você edita (as {window.Versions.KEEP_AUTO} mais recentes). As que você nomeia nunca são apagadas. Ficam só neste navegador: para levar para outro computador, use <b>Baixar</b> ou <b>Salvar</b>.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(250px, 320px) 1fr", flex: 1, minHeight: 0 }}>
          <aside style={{ borderRight: "1px solid var(--tool-line)", background: "#fff", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: 12, borderBottom: "1px solid var(--tool-line)" }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--tool-ink-2)", marginBottom: 5 }}>Guardar a aula como está agora</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveNow(); }} placeholder="Nome (ex.: antes da revisão)" style={{ flex: 1, minWidth: 0, border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit" }} />
                <button onClick={saveNow} style={primary} data-vs="save">Guardar</button>
              </div>
              {msg && <p role="status" style={{ margin: "7px 0 0", fontSize: 12, color: "#2f7d4f", fontWeight: 600 }}>{msg}</p>}
            </div>
            <div className="tool-scroll" style={{ flex: 1, overflow: "auto" }} data-vs="list">
              {items === null && <p style={{ padding: 14, fontSize: 13, color: "var(--tool-ink-3)" }}>Carregando…</p>}
              {items && !items.length && <p style={{ padding: 14, fontSize: 13, color: "var(--tool-ink-3)", lineHeight: 1.5 }}>Ainda não há versões desta aula. A primeira é guardada depois de uma pausa na edição, ou agora, pelo botão acima.</p>}
              {(items || []).map((v) => (
                <button key={v.id} data-vs="item" onClick={() => { setSel(v.id); setConfirm(false); setRenaming(null); }} aria-pressed={sel === v.id} style={{ display: "block", width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid var(--tool-line)", borderLeft: "4px solid " + (sel === v.id ? "var(--tool-accent)" : "transparent"), background: sel === v.id ? "var(--tool-surface)" : "#fff", padding: "10px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 13, color: "var(--tool-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.label || vsFmt(v.at)}</strong>
                    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase", color: v.kind === "manual" ? "#2f7d4f" : v.kind === "safety" ? "#8a5a00" : "#5b6270", flex: "none" }}>{VS_KIND[v.kind]}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--tool-ink-3)", marginTop: 2 }}>{v.label ? vsFmt(v.at) + " · " : ""}{vsRel(v.at)} · {v.blocks} bloco{v.blocks === 1 ? "" : "s"}</div>
                </button>
              ))}
            </div>
          </aside>
          <div className="tool-scroll" style={{ overflow: "auto", padding: 18, minHeight: 0 }}>
            {err && <div role="alert" style={{ padding: 12, borderRadius: 9, background: "#f9e1dc", color: "#b3372a", fontSize: 13, marginBottom: 12 }}>Não consegui acessar o histórico: {err}</div>}
            {!cur && !err && <p style={{ fontSize: 13.5, color: "var(--tool-ink-3)" }}>Escolha uma versão à esquerda para comparar com a aula atual.</p>}
            {cur && cmp && (<>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  {renaming && renaming.id === cur.id
                    ? <div style={{ display: "flex", gap: 6 }}><input autoFocus value={renaming.text} onChange={(e) => setRenaming({ id: cur.id, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") doRename(); if (e.key === "Escape") setRenaming(null); }} style={{ border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "6px 9px", fontSize: 14, fontFamily: "inherit", width: 260 }} /><button onClick={doRename} style={primary}>OK</button></div>
                    : <h3 style={{ margin: 0, fontSize: 16 }}>{cur.label || vsFmt(cur.at)}</h3>}
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--tool-ink-3)" }}>{vsFmt(cur.at)} · {VS_KIND[cur.kind]} · «{cur.title}» · {cur.blocks} bloco{cur.blocks === 1 ? "" : "s"}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setRenaming({ id: cur.id, text: cur.label || "" })} style={btn}>{cur.label ? "Renomear" : "Dar nome"}</button>
                  <button onClick={download} style={btn}>Baixar .json</button>
                  <button onClick={del} style={{ ...btn, color: "#b3372a" }}>Excluir</button>
                </div>
              </div>

              <div style={{ margin: "14px 0", padding: "11px 14px", borderRadius: 10, background: cmp.counts.changed + cmp.counts.removed + cmp.counts.added + cmp.metaChanged.length ? "#fff" : "#e3f1e7", border: "1px solid var(--tool-line)", fontSize: 13, lineHeight: 1.55 }} data-vs="summary">
                {cmp.counts.changed + cmp.counts.removed + cmp.counts.added + cmp.metaChanged.length === 0
                  ? <b style={{ color: "#2f7d4f" }}>Esta versão é igual à aula atual.</b>
                  : <><b>Comparada com a aula atual:</b> {[
                    cmp.counts.changed && cmp.counts.changed + " bloco" + (cmp.counts.changed > 1 ? "s" : "") + " alterado" + (cmp.counts.changed > 1 ? "s" : ""),
                    cmp.counts.removed && cmp.counts.removed + " removido" + (cmp.counts.removed > 1 ? "s" : ""),
                    cmp.counts.added && cmp.counts.added + " novo" + (cmp.counts.added > 1 ? "s" : "") + " (criado" + (cmp.counts.added > 1 ? "s" : "") + " depois)",
                    cmp.metaChanged.length && "dados da aula mudaram (" + cmp.metaChanged.slice(0, 4).join(", ") + (cmp.metaChanged.length > 4 ? "…" : "") + ")",
                  ].filter(Boolean).join(" · ")}.</>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 13.5 }}>Blocos desta versão</h4>
                <label style={{ fontSize: 12, color: "var(--tool-ink-2)", display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} /> mostrar também os iguais ({cmp.counts.same})</label>
              </div>
              {!rows.length && <p style={{ fontSize: 12.5, color: "var(--tool-ink-3)" }}>Nenhum bloco diferente.</p>}
              {rows.map((r, i) => { const s = VS_ST[r.status]; return (
                <div key={r.id + i} data-vs-row={r.status} style={{ display: "flex", gap: 10, alignItems: "center", background: "#fff", border: "1px solid var(--tool-line)", borderLeft: "4px solid " + s.c, borderRadius: 9, padding: "8px 10px", marginBottom: 6 }}>
                  <span style={{ flex: "none", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: s.c, background: s.bg, borderRadius: 5, padding: "2px 6px", minWidth: 96, textAlign: "center" }}>{s.l}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 650 }}>{r.label}</div>{r.text && <div style={{ fontSize: 12, color: "var(--tool-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>}</div>
                  {r.status === "removed" && <button data-vs="recover" onClick={() => { onApplyBlock(cur, r.id, "Antes de recuperar um bloco"); flash("Bloco recuperado na aula."); }} style={btn}>Recuperar bloco</button>}
                  {r.status === "changed" && <button data-vs="useold" onClick={() => { onApplyBlock(cur, r.id, "Antes de trocar um bloco"); flash("Bloco trocado pela versão antiga."); }} style={btn}>Usar esta versão do bloco</button>}
                </div>); })}

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--tool-line)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {!confirm
                  ? <button onClick={() => setConfirm(true)} style={primary} data-vs="restore">Restaurar esta versão inteira</button>
                  : <><button onClick={() => { onRestore(cur); setConfirm(false); flash("Versão restaurada. A aula anterior foi guardada no histórico."); }} style={{ ...primary, background: "#b3372a" }} data-vs="restore-yes">Confirmar: substituir a aula atual</button><button onClick={() => setConfirm(false)} style={btn}>Cancelar</button></>}
                <span style={{ fontSize: 12, color: "var(--tool-ink-3)" }}>A aula atual é guardada antes como versão de segurança, e você ainda pode desfazer com ⌘Z.</span>
              </div>
            </>)}
          </div>
        </div>
      </section>
    </div>
  );
}
Object.assign(window, { VersionsDialog });
