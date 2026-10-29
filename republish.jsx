/* eslint-disable */
// ClassAtelier — atualizar UMA aula já publicada no GitHub, sem mexer nas outras.
//
// Troca só os arquivos daquela aula (página .html, imagens, projeto .json e, se pedido, o nome na
// página do curso) num único commit. Os endereços das demais aulas e os links do Moodle ficam
// intactos. Usa a mesma conta/repositório/pasta/token da publicação do curso.
(function () {
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const enc = (b) => encodeURIComponent(b).replace(/%2F/g, "/");
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function cleanOpts(o) {
    const token = String(o.token || "").trim();
    const owner = String(o.owner || "").trim().replace(/^@/, "");
    const repo = String(o.repo || "").trim().replace(/\.git$/, "");
    const branch = String(o.branch || "").trim() || "main";
    const folder = String(o.folder || "").trim().replace(/^\/+|\/+$/g, "");
    if (!token) throw new Error("Cole o token de acesso do GitHub.");
    if (!owner || !repo) throw new Error("Informe a conta (ou organização) e o nome do repositório.");
    if (!/^[A-Za-z0-9._-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo)) throw new Error("Conta e repositório só podem ter letras, números, ponto, hífen e sublinhado.");
    if (folder && !/^[A-Za-z0-9._\/-]+$/.test(folder)) throw new Error("O nome da pasta só pode ter letras, números, ponto, hífen, sublinhado e barra.");
    return { token, owner, repo, branch, folder, prefix: folder ? folder + "/" : "" };
  }

  // lê o estado atual do repositório (nada é criado aqui)
  async function openRepo(o) {
    const c = cleanOpts(o);
    const api = (m, p, b) => ghApi(c.token, m, `/repos/${c.owner}/${c.repo}${p}`, b);
    const ref = await api("GET", `/git/ref/heads/${enc(c.branch)}`).catch((e) => { if (e.status === 404) throw new Error("A branch «" + c.branch + "» não existe neste repositório. Publique o curso uma primeira vez pelo botão «Publicar no GitHub»."); throw e; });
    const headSha = ref.object.sha;
    const head = await api("GET", `/git/commits/${headSha}`);
    const tree = await api("GET", `/git/trees/${head.tree.sha}?recursive=1`);
    if (tree.truncated) throw new Error("O repositório é grande demais para eu listar de uma vez. Use o ClassAcervo ou o botão «Publicar no GitHub».");
    const existing = new Map(); (tree.tree || []).forEach((t) => { if (t.type === "blob") existing.set(t.path, t.sha); });
    return { ...c, api, headSha, baseTree: head.tree.sha, existing };
  }

  async function readBlobText(ctx, sha) {
    const b = await ctx.api("GET", `/git/blobs/${sha}`);
    const bin = atob((b.content || "").replace(/\n/g, ""));
    const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // aulas já publicadas na pasta: páginas .html (fora o index) + nome mostrado na página do curso
  async function listPublished(o, currentLesson) {
    const ctx = await openRepo(o);
    const inFolder = [...ctx.existing.keys()].filter((p) => p.startsWith(ctx.prefix) && !p.slice(ctx.prefix.length).includes("/"));
    const htmls = inFolder.map((p) => p.slice(ctx.prefix.length)).filter((n) => /\.html?$/i.test(n) && n.toLowerCase() !== "index.html").sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    const labels = new Map();
    const idxSha = ctx.existing.get(ctx.prefix + "index.html");
    if (idxSha) {
      try {
        const doc = new DOMParser().parseFromString(await readBlobText(ctx, idxSha), "text/html");
        doc.querySelectorAll("a[href]").forEach((a) => { const h = decodeURIComponent((a.getAttribute("href") || "").replace(/^\.\//, "")); const t = (a.querySelector("strong") || a).textContent.replace(/\s+/g, " ").trim(); if (h && !labels.has(h)) labels.set(h, t); });
      } catch (e) { /* sem rótulos: usa o nome do arquivo */ }
    }
    const meta = (currentLesson && currentLesson.meta) || {};
    const nowTitle = norm(meta.title);
    const week = (/^Semana0*(\d+)-/.exec(window.projectFileName(currentLesson || {}, 0)) || [])[1];
    const isUserSite = ctx.repo.toLowerCase() === (ctx.owner + ".github.io").toLowerCase();
    const siteBase = `https://${ctx.owner.toLowerCase()}.github.io/${isUserSite ? "" : ctx.repo + "/"}${ctx.prefix}`;
    const list = htmls.map((file) => {
      const label = labels.get(file) || file;
      const digits = (/(\d+)/.exec(file) || [])[1];
      const same = nowTitle && norm(label) && (norm(label) === nowTitle || norm(label).includes(nowTitle) || nowTitle.includes(norm(label)));
      return { file, label, url: siteBase + encodeURI(file), suggested: !!same || (!!week && digits != null && Number(digits) === Number(week) && !nowTitle) };
    });
    // se nenhuma bateu pelo título, sugere pelo número da semana
    if (!list.some((x) => x.suggested) && week) list.forEach((x) => { const d = (/(\d+)/.exec(x.file) || [])[1]; if (d != null && Number(d) === Number(week)) x.suggested = true; });
    return { ctx, list, hasIndex: !!idxSha };
  }

  // calcula o que seria enviado/apagado (sem enviar nada)
  async function plan(ctx, lesson, targetFile, opts) {
    const base = targetFile.replace(/\.html?$/i, "");
    // imagens que a página publicada usa hoje: mantém o mesmo prefixo e depois apaga as que sobrarem
    const oldImgs = [];
    const oldSha = ctx.existing.get(ctx.prefix + targetFile);
    let imgPrefix = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") + "-";
    if (oldSha) {
      try {
        const old = await readBlobText(ctx, oldSha); const re0 = /assets\/images\/([^"'()\s<>]*?)image-\d+\.[A-Za-z0-9]+/g; let m0;
        while ((m0 = re0.exec(old))) { if (!oldImgs.includes(m0[0])) oldImgs.push(m0[0]); if (oldImgs.length === 1) imgPrefix = m0[1]; }
      } catch (e) { /* segue com o prefixo padrão */ }
    }
    const L = JSON.parse(JSON.stringify(lesson)); L.meta = L.meta || {};
    const n = Number((/(\d+)/.exec(base) || [])[1]) || 0;
    const projectLesson = JSON.parse(JSON.stringify(L));
    const images = externalizeLessonImages(L, imgPrefix);
    const html = await buildExportHTML(L, { fonts: "external", assets: "external" });
    const zip = { files: [], file(path, data, o2) { this.files.push({ path, data, base64: !!(o2 && o2.base64) }); } };
    zip.file(targetFile, html);
    const projName = "projetos/" + window.projectFileName(L, n);
    zip.file(projName, JSON.stringify(projectLesson, null, 2));
    images.forEach((a) => zip.file(a.path, a.base64, { base64: true }));
    await addPackageSupportFiles(zip, []);   // fontes, bibliotecas e imagens do tema: só vão se faltarem
    const changes = []; const send = [];
    for (const f of zip.files) {
      const bytes = toBytes(f); const path = ctx.prefix + f.path; const sha = await gitBlobSha(bytes);
      const old = ctx.existing.get(path);
      if (old === sha) continue;
      const main = f.path === targetFile;
      changes.push({ path, rel: f.path, kind: old ? "alterado" : "novo", bytes: bytes.length, main });
      send.push({ path, bytes });
    }
    const keep = new Set(zip.files.map((f) => ctx.prefix + f.path));
    const del = [];
    // imagens antigas desta aula que não são mais usadas
    oldImgs.forEach((rel) => { const p = ctx.prefix + rel; if (ctx.existing.has(p) && !keep.has(p) && !del.includes(p)) del.push(p); });
    // projeto antigo da mesma semana com outro nome (o título mudou)
    const sem = /^Semana\d+-/.exec(projName.slice("projetos/".length));
    if (sem) ctx.existing.forEach((sha, p) => { if (p.startsWith(ctx.prefix + "projetos/" + sem[0]) && p.endsWith("-ClassAtelier.json") && !keep.has(p)) del.push(p); });
    del.forEach((p) => changes.push({ path: p, rel: p.slice(ctx.prefix.length), kind: "apagar", bytes: 0 }));

    // nome na página do curso
    let indexNote = "";
    const newLabel = L.meta.title || "";
    const idxPath = ctx.prefix + "index.html";
    if (opts && opts.updateIndex && ctx.existing.has(idxPath) && newLabel) {
      const src = await readBlobText(ctx, ctx.existing.get(idxPath));
      const re = new RegExp("(<a\\s[^>]*href=\"(?:" + esc(targetFile) + "|" + esc(encodeURI(targetFile)) + ")\"[^>]*>(?:(?!<\\/a>)[\\s\\S])*?<strong>)([\\s\\S]*?)(</strong>)", "i");
      const m = re.exec(src);
      if (m) {
        const safe = xmlEscape(newLabel);
        if (m[2].trim() !== safe) {
          const next = src.replace(re, (all, a, mid, c3) => a + safe + c3);
          const bytes = new TextEncoder().encode(next);
          changes.push({ path: idxPath, rel: "index.html", kind: "alterado", bytes: bytes.length, note: "nome da aula na página do curso: «" + m[2].replace(/<[^>]*>/g, "").trim() + "» → «" + newLabel + "»" });
          send.push({ path: idxPath, bytes });
        }
      } else indexNote = "Esta aula não aparece na página do curso (index.html); ela não foi alterada.";
    }
    return { ctx, changes, send, del, indexNote, targetFile, title: newLabel };
  }

  async function apply(p, onProgress) {
    const say = (m) => { try { onProgress && onProgress(m); } catch (e) {} };
    const { ctx } = p;
    if (!p.changes.length) return { sent: 0, deleted: 0, commitUrl: null, url: null };
    const entries = []; let i = 0;
    for (const f of p.send) {
      i++; say("Enviando arquivos… " + i + " de " + p.send.length);
      const blob = await ctx.api("POST", "/git/blobs", { content: bytesToBase64(f.bytes), encoding: "base64" });
      entries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
    }
    p.del.forEach((path) => entries.push({ path, mode: "100644", type: "blob", sha: null }));
    say("Gravando a atualização…");
    // confere se alguém mexeu no repositório desde que listamos
    const ref = await ctx.api("GET", `/git/ref/heads/${enc(ctx.branch)}`);
    if (ref.object.sha !== ctx.headSha) throw new Error("O repositório mudou enquanto você preparava a atualização (outra publicação ou edição). Feche e abra de novo para ver a situação atual.");
    const tree = await ctx.api("POST", "/git/trees", { base_tree: ctx.baseTree, tree: entries });
    const commit = await ctx.api("POST", "/git/commits", { message: `Atualiza a aula "${p.title || p.targetFile}" (ClassAtelier)`, tree: tree.sha, parents: [ctx.headSha] });
    await ctx.api("PATCH", `/git/refs/heads/${enc(ctx.branch)}`, { sha: commit.sha, force: false });
    const isUserSite = ctx.repo.toLowerCase() === (ctx.owner + ".github.io").toLowerCase();
    const url = `https://${ctx.owner.toLowerCase()}.github.io/${isUserSite ? "" : ctx.repo + "/"}${ctx.prefix}${encodeURI(p.targetFile)}`;
    return { sent: p.send.length, deleted: p.del.length, commitUrl: `https://github.com/${ctx.owner}/${ctx.repo}/commit/${commit.sha}`, url };
  }

  window.Republish = { listPublished, plan, apply };
})();

// ── Diálogo ──
function RepublishDialog({ lesson, onClose }) {
  const PUB_KEY = "aulastudio.publish.v1";
  const [gh, setGh] = React.useState(() => {
    let s = {}; try { s = JSON.parse(localStorage.getItem(PUB_KEY) || "{}") || {}; } catch (e) {}
    return { owner: s.owner || "", repo: s.repo || "", branch: s.branch || "main", folder: s.folder || "", token: s.token || "", remember: !!s.token };
  });
  const setG = (k, v) => setGh((g) => ({ ...g, [k]: v }));
  const [busy, setBusy] = React.useState("");
  const [err, setErr] = React.useState("");
  const [found, setFound] = React.useState(null);   // {ctx, list, hasIndex}
  const [pick, setPick] = React.useState("");
  const [updIdx, setUpdIdx] = React.useState(true);
  const [pl, setPl] = React.useState(null);
  const [done, setDone] = React.useState(null);
  const [moodle, setMoodle] = React.useState(null);

  const save = () => { try { const keep = { owner: gh.owner, repo: gh.repo, branch: gh.branch, folder: gh.folder }; let old = {}; try { old = JSON.parse(localStorage.getItem(PUB_KEY) || "{}") || {}; } catch (e) {} localStorage.setItem(PUB_KEY, JSON.stringify({ ...old, ...keep, ...(gh.remember ? { token: gh.token } : { token: undefined }) })); } catch (e) {} };
  const search = async () => {
    setErr(""); setFound(null); setPl(null); setDone(null); setBusy("Procurando as aulas publicadas…");
    try { const r = await window.Republish.listPublished(gh, lesson); setFound(r); const s = r.list.find((x) => x.suggested); setPick(s ? s.file : ""); save(); }
    catch (e) { setErr(e.message || String(e)); } finally { setBusy(""); }
  };
  const preview = async () => {
    setErr(""); setPl(null); setBusy("Calculando o que mudou…");
    try { setPl(await window.Republish.plan(found.ctx, lesson, pick, { updateIndex: updIdx })); } catch (e) { setErr(e.message || String(e)); } finally { setBusy(""); }
  };
  const go = async () => {
    setErr(""); setBusy("Enviando…");
    try { setDone(await window.Republish.apply(pl, setBusy)); setPl(null); } catch (e) { setErr(e.message || String(e)); } finally { setBusy(""); }
  };
  const kb = (n) => n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB";
  const lab = { display: "block", fontSize: 12, fontWeight: 650, margin: "0 0 4px", color: "var(--tool-ink-2)" };
  const inp = { width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit" };
  const btn = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" };
  const primary = { ...btn, background: "var(--tool-accent)", color: "#fff", border: 0 };
  const title = (lesson.meta && lesson.meta.title) || "Aula sem título";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(20,20,28,.48)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={onClose}>
      <section role="dialog" aria-label="Atualizar uma aula publicada" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(640px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
        <header style={{ padding: "16px 20px", borderBottom: "1px solid var(--tool-line)", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>Atualizar uma aula já publicada</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>Envia só «{title}» para o lugar dela no GitHub. As outras aulas e os links do Moodle não são tocados.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </header>
        <div className="tool-scroll" style={{ padding: 20, overflow: "auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}><label style={lab}>Conta ou organização</label><input value={gh.owner} onChange={(e) => setG("owner", e.target.value)} autoComplete="off" style={inp} data-rp="owner" /></div>
            <div style={{ flex: 1 }}><label style={lab}>Repositório</label><input value={gh.repo} onChange={(e) => setG("repo", e.target.value)} autoComplete="off" style={inp} data-rp="repo" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}><label style={lab}>Branch</label><input value={gh.branch} onChange={(e) => setG("branch", e.target.value)} autoComplete="off" style={inp} /></div>
            <div style={{ flex: 1 }}><label style={lab}>Pasta do curso no repositório</label><input value={gh.folder} onChange={(e) => setG("folder", e.target.value)} placeholder="ex.: TEDPRO/TGE101" autoComplete="off" style={inp} data-rp="folder" /></div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={lab}>Token de acesso do GitHub</label>
            <input type="password" value={gh.token} onChange={(e) => setG("token", e.target.value)} placeholder="github_pat_…" autoComplete="off" spellCheck={false} style={inp} data-rp="token" />
          </div>
          <label style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--tool-ink-3)", margin: "0 0 12px" }}><input type="checkbox" checked={gh.remember} onChange={(e) => setG("remember", e.target.checked)} /> Lembrar o token neste navegador (não use em computador compartilhado)</label>
          <button onClick={search} disabled={!!busy} style={btn} data-rp="search">Procurar aulas publicadas</button>

          {busy && <p role="status" style={{ fontSize: 12.5, color: "var(--tool-ink-2)", margin: "12px 0 0" }}>{busy}</p>}
          {err && <div role="alert" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#fdecea", color: "#8a2f18", fontSize: 12.5, lineHeight: 1.5 }}>{err}</div>}

          {found && !found.list.length && <p style={{ marginTop: 14, fontSize: 13, color: "var(--tool-ink-2)", lineHeight: 1.5 }}>Não encontrei nenhuma aula (.html) nesta pasta. Confira o nome da pasta, ou publique o curso pela primeira vez em «Curso e GitHub…».</p>}
          {found && found.list.length > 0 && (<div style={{ marginTop: 16 }}>
            <label style={lab}>Qual aula publicada será substituída por «{title}»?</label>
            <div role="radiogroup" style={{ display: "grid", gap: 6 }}>
              {found.list.map((x) => (
                <label key={x.file} data-rp="opt" style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 12px", border: "1px solid " + (pick === x.file ? "var(--tool-accent)" : "var(--tool-line)"), borderRadius: 9, background: pick === x.file ? "var(--tool-surface)" : "#fff", cursor: "pointer" }}>
                  <input type="radio" name="rp-file" checked={pick === x.file} onChange={() => { setPick(x.file); setPl(null); setDone(null); }} />
                  <span style={{ flex: 1, minWidth: 0 }}><strong style={{ fontSize: 13 }}>{x.label}</strong><br /><span style={{ fontSize: 11.5, color: "var(--tool-ink-3)", fontFamily: "ui-monospace, Menlo, monospace" }}>{x.file}</span></span>
                  {x.suggested && <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", color: "#2f7d4f", background: "#e3f1e7", borderRadius: 5, padding: "2px 6px" }}>parece ser esta</span>}
                </label>))}
            </div>
            {found.hasIndex && <label style={{ display: "flex", gap: 8, fontSize: 12.5, margin: "12px 0 0" }}><input type="checkbox" checked={updIdx} onChange={(e) => { setUpdIdx(e.target.checked); setPl(null); }} /> Atualizar também o nome da aula na página do curso (index.html), se o título mudou</label>}
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => setMoodle(found.list.map((x) => ({ label: x.label, url: x.url })))} style={btn} data-rp="moodle-all">Código para o Moodle (todas as aulas da pasta)</button><button onClick={preview} disabled={!pick || !!busy} style={{ ...btn, opacity: pick ? 1 : 0.5 }} data-rp="preview">Ver o que será enviado</button></div>
          </div>)}

          {pl && (<div style={{ marginTop: 14 }} data-rp="plan">
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 650 }}>{pl.changes.length ? "Esta atualização envia " + pl.send.length + " arquivo" + (pl.send.length === 1 ? "" : "s") + (pl.del.length ? " e apaga " + pl.del.length : "") + ":" : "Nada a enviar: a aula publicada já está igual a esta."}</p>
            {pl.changes.map((c, i) => (<div key={i} style={{ display: "flex", gap: 8, fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--tool-line)", alignItems: "baseline" }}>
              <span style={{ flex: "none", width: 56, fontWeight: 800, textTransform: "uppercase", fontSize: 10.5, color: c.kind === "apagar" ? "#b3372a" : c.kind === "novo" ? "#2c5b7a" : "#8a5a00" }}>{c.kind}</span>
              <span style={{ flex: 1, minWidth: 0, wordBreak: "break-all", fontFamily: "ui-monospace, Menlo, monospace" }}>{c.rel}{c.note ? <span style={{ fontFamily: "inherit", color: "var(--tool-ink-3)" }}> — {c.note}</span> : null}</span>
              <span style={{ flex: "none", color: "var(--tool-ink-3)" }}>{c.bytes ? kb(c.bytes) : ""}</span>
            </div>))}
            {pl.indexNote && <p style={{ fontSize: 12, color: "#8a5a00", margin: "8px 0 0" }}>{pl.indexNote}</p>}
            {pl.changes.length > 0 && <div style={{ marginTop: 14 }}><button onClick={go} disabled={!!busy} style={primary} data-rp="go">Publicar só esta aula</button></div>}
          </div>)}

          {done && (<div role="status" data-rp="done" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "#e8f5ee", color: "#1b4d36", fontSize: 12.5, lineHeight: 1.6 }}>
            <b>Aula atualizada.</b> {done.sent} arquivo(s) enviado(s){done.deleted ? ", " + done.deleted + " apagado(s)" : ""}. O GitHub Pages pode levar alguns minutos para mostrar a mudança.<br />
            <a href={done.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", wordBreak: "break-all" }}>{done.url}</a>{" · "}
            <a href={done.commitUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>ver no GitHub</a>
            <div style={{ marginTop: 8 }}><button onClick={() => setMoodle([{ label: title, url: done.url }])} style={{ ...btn, padding: "5px 11px", fontSize: 12 }} data-rp="moodle">Código para o Moodle desta aula</button></div>
          </div>)}
        </div>
        <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end" }}><button onClick={onClose} style={btn}>{done ? "Fechar" : "Cancelar"}</button></footer>
      </section>
      {moodle && <MoodleDialog links={moodle} onClose={() => setMoodle(null)} />}
    </div>
  );
}
Object.assign(window, { RepublishDialog });
