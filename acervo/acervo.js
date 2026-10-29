// ClassAcervo — administra, num repositório do GitHub, os cursos publicados no GitHub Pages
// (os que o ClassAtelier envia em "Curso e GitHub…"). Página estática: fala direto com a API do
// GitHub a partir do navegador; o token fica só na sessão (ou neste navegador, se você pedir).
const APP_NAME = "ClassAcervo";
const APP_VERSION = "1.0.0"; // Versionamento Semântico; igual ao número em index.html e CHANGELOG.md
const API = "https://api.github.com";
const MARKER = "gerado-pelo-classacervo";

const S = {
  token: "", owner: "", repo: "", branch: "",
  conn: null,            // { owner, repo, branch, canPush }
  head: null,            // { commit, tree }
  files: new Map(),      // caminho -> { sha, size, mode }
  dirs: new Set(),       // todas as pastas ("" não entra)
  pages: undefined,      // undefined = ainda não consultado, null = desligado, objeto = ligado
  courses: [],           // [{ path, title, lessons:[{n,file,title}], size, files }]
  titles: new Map(),     // sha do index.html -> título
  view: "cursos", selected: "", open: new Set(), openLessons: new Set(),
  checked: new Set(),    // itens marcados na árvore (exclusão em lote)
  loadedAt: null,
  loading: false, error: ""
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
const sizeOf = (n) => n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB";
const pad2 = (n) => String(n).padStart(2, "0");
const dirname = (p) => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
const basename = (p) => p.slice(p.lastIndexOf("/") + 1);

/* ───────────── API do GitHub ───────────── */
function friendly(status, message) {
  if (status === 401) return "O GitHub não aceitou o token (inválido ou expirado). Gere outro e tente de novo.";
  if (status === 403) return "O token não tem permissão para isso. Ele precisa de Contents (leitura e escrita) e Pages no repositório. " + (message || "");
  if (status === 404) return "Não encontrei o repositório, a branch ou o caminho. Confira conta e nome, e se o token tem acesso a este repositório.";
  if (status === 409 || status === 422) return "O repositório mudou enquanto você trabalhava. Clique em Recarregar e repita a ação. " + (message || "");
  return "Erro do GitHub (" + status + "): " + (message || "sem detalhes");
}
async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      cache: "no-store", // a API do GitHub envia max-age=60: sem isso o navegador reutiliza a leitura antiga
      headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + S.token, "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) { throw new Error("Sem conexão com o GitHub. Verifique a internet e tente de novo."); }
  if (!res.ok) {
    let message = "";
    try { message = (await res.json()).message || ""; } catch (e) { /* sem corpo */ }
    const err = new Error(friendly(res.status, message)); err.status = res.status; throw err;
  }
  return res.status === 204 ? null : res.json();
}
const repoPath = () => `/repos/${encodeURIComponent(S.conn.owner)}/${encodeURIComponent(S.conn.repo)}`;
const b64text = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

/* ───────────── carregar o repositório ───────────── */
async function loadRepo() {
  const base = repoPath();
  const ref = await api(`${base}/git/ref/heads/${enc(S.conn.branch)}`);
  const commit = await api(`${base}/git/commits/${ref.object.sha}`);
  const tree = await api(`${base}/git/trees/${commit.tree.sha}?recursive=1`);
  S.head = { commit: ref.object.sha, tree: commit.tree.sha, truncated: !!tree.truncated };
  S.files = new Map(); S.dirs = new Set();
  for (const e of tree.tree) {
    if (e.type !== "blob") continue;
    S.files.set(e.path, { sha: e.sha, size: e.size || 0, mode: e.mode || "100644" });
    let d = dirname(e.path);
    while (d) { S.dirs.add(d); d = dirname(d); }
  }
  try { S.pages = await api(`${base}/pages`); } catch (e) { S.pages = e.status === 404 ? null : S.pages === undefined ? null : S.pages; }
  await detectCourses();
  S.loadedAt = new Date();
  if (!S.treeInit) { S.treeInit = true; for (const d of S.dirs) if (!d.includes("/")) S.open.add(d); } // 1ª leitura: abre as pastas de cima, a árvore não parece vazia
  for (const p of [...S.checked]) if (!S.files.has(p) && !S.dirs.has(p)) S.checked.delete(p);
}

// Curso = pasta com index.html e ao menos uma aula-NN.html (o que o ClassAtelier publica).
async function detectCourses() {
  const found = [];
  for (const dir of S.dirs) {
    if (!S.files.has(dir + "/index.html")) continue;
    // Aulas = os outros .html da pasta (o nome pode ser qualquer um: aula-01.html, semana-03-….html…)
    const htmls = [...S.files.keys()].filter((p) => dirname(p) === dir && /\.html?$/i.test(p) && basename(p).toLowerCase() !== "index.html");
    if (!htmls.length) continue;
    let size = 0, count = 0;
    for (const [p, f] of S.files) if (p.startsWith(dir + "/")) { size += f.size; count += 1; }
    found.push({ path: dir, title: "", lessons: [], files: count, size, htmls, broken: [], unlisted: [] });
  }
  found.sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));
  S.courses = found;
  await Promise.all(found.map(async (c) => {
    const info = await courseInfo(c.path);
    c.title = info.title;
    c.indexSha = info.sha;
    const weeks = weeksFromProjects(c.path); // [{week, slug}]
    const used = new Set(); const lessons = []; c.broken = [];
    const nameSlug = (f) => slugify(basename(f).replace(/\.html?$/i, "").replace(/^(aula|semana)[-_ ]?0*\d+[-_ ]?/i, ""));
    // 1) na ordem do índice: o arquivo existe? se não, procura o que tem o mesmo título no nome
    for (const e of info.entries) {
      let file = c.path + "/" + e.href;
      let fixable = false;
      if (!S.files.has(file) || used.has(file)) {
        file = "";
        const sl = slugify(e.label);
        if (sl) file = c.htmls.find((f) => !used.has(f) && !info.entries.some((x) => c.path + "/" + x.href === f) && (nameSlug(f).includes(sl) || (nameSlug(f) && sl.includes(nameSlug(f))))) || "";
        c.broken.push({ href: e.href, label: e.label, target: file ? basename(file) : "" });
        fixable = !!file;
      }
      if (file) { used.add(file); lessons.push({ file, title: e.label, fromIndex: !fixable }); }
    }
    // 2) arquivos que o índice não cita
    for (const f of c.htmls.slice().sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))) {
      if (used.has(f)) continue;
      used.add(f); c.unlisted.push(basename(f));
      const pretty = basename(f).replace(/\.html?$/i, "").replace(/^(aula|semana)[-_ ]?0*\d+[-_ ]?/i, "").replace(/[-_]+/g, " ").trim();
      lessons.push({ file: f, title: pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : "", unlisted: true });
    }
    lessons.forEach((l, k) => {
      l.n = k + 1;
      const fm = /semana[-_ ]?0*(\d+)/i.exec(basename(l.file));
      const sl = slugify(l.title);
      const w = sl && weeks.find((x) => x.slug && (sl.startsWith(x.slug) || x.slug.startsWith(sl)));
      l.week = fm ? Number(fm[1]) : (w ? w.week : 0);
    });
    c.lessons = lessons;
  }));
}
const slugify = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// Os arquivos em projetos/ se chamam SemanaNN-título-ClassAtelier.json: dali sai o número da semana de cada aula.
// (A semana NÃO é o número do aula-NN.html: aula-01 pode ser a Semana 3 se o curso começa nela.)
function weeksFromProjects(dir) {
  const out = [];
  for (const p of S.files.keys()) {
    if (dirname(p) !== dir + "/projetos") continue;
    const m = /^Semana(\d+)-(.+)-ClassAtelier\.json$/i.exec(basename(p));
    if (m) out.push({ week: Number(m[1]), slug: slugify(m[2]) });
  }
  return out;
}
const isGenericLabel = (t) => !t || /^aula\s*0*\d*$/i.test(t.trim());
const htmlText = (raw) => String(raw || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
// O index.html do curso é a fonte do que o site mostra: título do curso e o título de cada aula.
async function courseInfo(dir) {
  const f = S.files.get(dir + "/index.html");
  const info = { title: basename(dir), entries: [], html: "", sha: f ? f.sha : "" };
  if (!f) return info;
  if (S.titles.has(f.sha)) return S.titles.get(f.sha);
  try {
    const blob = await api(`${repoPath()}/git/blobs/${f.sha}`);
    const html = b64text(blob.content); info.html = html;
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html); const tt = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const clean = htmlText((h1 && h1[1]) || (tt && tt[1]));
    if (clean) info.title = clean;
    const re = /<a[^>]*href="([^"#?]+\.html?)"[^>]*>([\s\S]*?)<\/a>/gi; let m;
    while ((m = re.exec(html))) {
      let href = m[1]; if (/^[a-z]+:|^\//i.test(href) || href.startsWith("../")) continue;
      href = href.replace(/^\.\//, ""); if (href.includes("/")) continue;
      try { href = decodeURIComponent(href); } catch (e) { /* mantém */ }
      const st = /<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(m[2]);
      let label = htmlText(st ? st[1] : m[2].replace(/<span[^>]*>[\s\S]*?<\/span>/gi, ""));
      if (isGenericLabel(label)) label = "";
      if (href.toLowerCase() !== "index.html") info.entries.push({ href, label });
    }
  } catch (e) { /* mantém o nome da pasta */ }
  S.titles.set(f.sha, info);
  return info;
}

/* ───────────── links do site ───────────── */
function pagesBase() {
  const url = S.pages && S.pages.html_url;
  if (url) return url.endsWith("/") ? url : url + "/";
  const { owner, repo } = S.conn;
  return repo.toLowerCase() === (owner + ".github.io").toLowerCase() ? `https://${owner}.github.io/` : `https://${owner}.github.io/${repo}/`;
}
const siteUrl = (path, isDir) => pagesBase() + enc(path) + (isDir ? "/" : "");

/* ───────────── alterações em um único commit ───────────── */
async function commitChanges(entries, message) {
  const base = repoPath();
  const ref = await api(`${base}/git/ref/heads/${enc(S.conn.branch)}`);
  if (ref.object.sha !== S.head.commit) throw Object.assign(new Error("O repositório mudou desde a última leitura. Clique em Recarregar e repita a ação."), { status: 409 });
  const parent = await api(`${base}/git/commits/${ref.object.sha}`);
  const tree = await api(`${base}/git/trees`, { method: "POST", body: { base_tree: parent.tree.sha, tree: entries } });
  const commit = await api(`${base}/git/commits`, { method: "POST", body: { message, tree: tree.sha, parents: [ref.object.sha] } });
  await api(`${base}/git/refs/heads/${enc(S.conn.branch)}`, { method: "PATCH", body: { sha: commit.sha } });
  return { sha: commit.sha, url: `https://github.com/${S.conn.owner}/${S.conn.repo}/commit/${commit.sha}` };
}
const filesUnder = (dir) => [...S.files.entries()].filter(([p]) => p.startsWith(dir + "/"));
const isDirPath = (p) => S.dirs.has(p);

function validateDest(to, from) {
  let dest = String(to || "").trim().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  if (!dest) return { error: "Informe o novo caminho." };
  if (/[\\:*?"<>|]/.test(dest) || dest.split("/").some((s) => s === ".." || s === "." || s === ".git" || !s.trim())) return { error: "O caminho tem caracteres ou partes não permitidos." };
  if (/\s/.test(dest)) return { error: "Evite espaços: use hífens (ex.: tedpro/tge-2026). Assim o link do Moodle fica limpo." };
  if (dest === from) return { error: "O novo caminho é igual ao atual." };
  if (from && (dest + "/").startsWith(from + "/")) return { error: "Não dá para mover uma pasta para dentro dela mesma." };
  if (S.files.has(dest) || S.dirs.has(dest)) return { error: "Já existe algo em «" + dest + "». Escolha outro caminho." };
  let up = dirname(dest);
  while (up) { if (S.files.has(up)) return { error: "«" + up + "» é um arquivo, não uma pasta." }; up = dirname(up); }
  return { dest };
}
function planMove(from, dest, keepOld) {
  const entries = [];
  const items = isDirPath(from) ? filesUnder(from) : [[from, S.files.get(from)]];
  for (const [p, f] of items) {
    const np = isDirPath(from) ? dest + p.slice(from.length) : dest;
    entries.push({ path: np, mode: f.mode, type: "blob", sha: f.sha });
    if (!keepOld) entries.push({ path: p, mode: f.mode, type: "blob", sha: null });
  }
  return entries;
}
const planDelete = (path) => (isDirPath(path) ? filesUnder(path) : [[path, S.files.get(path)]]).map(([p, f]) => ({ path: p, mode: f.mode, type: "blob", sha: null }));

/* ───────────── índice do site ───────────── */
async function buildIndexHtml(folder, courses, { title, subtitle }) {
  const rel = (c) => (folder ? c.path.slice(folder.length + 1) : c.path);
  const groups = new Map();
  for (const c of courses) { const g = dirname(rel(c)); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c); }
  const keys = [...groups.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b, "pt-BR")));
  const today = new Date().toLocaleDateString("pt-BR");
  const body = keys.map((g) => {
    const items = groups.get(g).map((c) => {
      const n = c.lessons.length;
      return `<li><a href="./${enc(rel(c))}/"><span class="t">${esc(c.title)}</span><span class="m">${n} aula${n === 1 ? "" : "s"}</span></a></li>`;
    }).join("");
    return `<section>${g ? `<h2>${esc(g.split("/").join(" / "))}</h2>` : ""}<ul>${items}</ul></section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<!-- ${MARKER} -->
<title>${esc(title)}</title>
<style>
:root{--paper:#fbf6ee;--ink:#1c1a17;--mute:#7a7265;--line:#e6dcc8;--navy:#14213D;--coral:#bf4c34}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:56px 22px 72px}
.eyebrow{font:600 12px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--coral);margin:0 0 10px}
h1{font:600 clamp(30px,5vw,42px)/1.1 Georgia,"Times New Roman",serif;margin:0 0 8px;letter-spacing:-.01em}
.sub{color:var(--mute);margin:0 0 34px}
section{margin:0 0 30px}h2{font:600 13px/1.2 system-ui;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:0 0 10px;border-bottom:1px solid var(--line);padding-bottom:8px}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
a{display:flex;justify-content:space-between;align-items:center;gap:14px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;text-decoration:none;color:var(--ink)}
a:hover{border-color:var(--navy)}a:focus-visible{outline:2px solid var(--coral);outline-offset:2px}
.t{font:600 19px/1.25 Georgia,"Times New Roman",serif}.m{font-size:13px;color:var(--mute);white-space:nowrap}
footer{margin-top:44px;font-size:13px;color:var(--mute);border-top:1px solid var(--line);padding-top:16px}
</style></head><body><main>
<p class="eyebrow">Cursos</p><h1>${esc(title)}</h1>${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : `<p class="sub"></p>`}
${body || "<p>Nenhum curso publicado ainda.</p>"}
<footer>Índice gerado com ${APP_NAME} ${APP_VERSION} · desenvolvido pelo Prof. Rogério G. Bittencourt, INOVALAB - IFSC (Câmpus Florianópolis–Continente) · atualizado em ${today}</footer>
</main></body></html>
`;
}

/* ───────────── interface ───────────── */
const ICONS = {
  folder: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  file: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>',
  image: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>',
  code: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/></svg>'
};
const iconFor = (p) => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(p) ? ICONS.image : /\.(html?|css|js|json|md|xml|txt)$/i.test(p) ? ICONS.code : ICONS.file;

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}
async function copy(text, okMsg = "Copiado.") {
  try { await navigator.clipboard.writeText(text); }
  catch (e) { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e2) { /* sem permissão */ } ta.remove(); }
  toast(okMsg);
}

function renderTop() {
  const mark = '<img src="../assets/classacervo-mark.svg" alt="" width="34" height="34">';
  let right = "";
  if (S.conn) {
    const pages = S.pages === undefined ? "" : S.pages
      ? `<a class="chip ok" href="${esc(pagesBase())}" target="_blank" rel="noopener"><span class="dot"></span>Pages ligado</a>`
      : `<button class="chip warn" data-act="enable-pages" title="Ligar o GitHub Pages neste repositório"><span class="dot"></span>Pages desligado · ligar</button>`;
    right = `<div class="conn-info"><code>${esc(S.conn.owner)}/${esc(S.conn.repo)}@${esc(S.conn.branch)}</code>${pages}${S.loadedAt ? `<span title="Hora da última leitura do repositório">lido às ${S.loadedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>` : ""}</div>
      <button class="btn small" data-act="reload">Recarregar</button><button class="btn small ghost" data-act="logout">Sair</button>`;
  }
  $("#top").innerHTML = `<a class="brand" href="./" aria-label="${APP_NAME}">${mark}<span><span class="wordmark"><b>Class</b><i>Acervo</i></span><span class="tagline">cursos publicados no GitHub Pages · v${APP_VERSION}</span></span></a><span class="top-spacer"></span><a class="btn" href="../" target="_blank" rel="noopener" title="Abrir o ClassAtelier (editor das aulas) em outra aba">ClassAtelier ↗</a>${right}`;
}

function renderConnect() {
  $("#main").innerHTML = `<section class="connect">
    <h1>Seus cursos publicados, <i>num só lugar</i></h1>
    <p class="lead">Veja o que está no GitHub, renomeie, mova, duplique ou apague pastas de cursos, copie os links das aulas para o Moodle e gere uma página-índice do site.</p>
    <form class="panel" id="connect-form" autocomplete="off">
      ${S.error ? `<p class="err" role="alert">${esc(S.error)}</p>` : ""}
      <div class="row2">
        <label class="field"><span>Conta ou organização</span><input type="text" name="owner" value="${esc(S.owner)}" placeholder="rgbittencourt" required></label>
        <label class="field"><span>Repositório</span><input type="text" name="repo" value="${esc(S.repo)}" placeholder="moodle-ifsc" required></label>
      </div>
      <label class="field"><span>Branch (opcional)</span><input type="text" name="branch" value="${esc(S.branch)}" placeholder="main"><small>Deixe em branco para usar a branch principal.</small></label>
      <label class="field"><span>Token do GitHub</span><input type="password" name="token" value="${esc(S.token)}" placeholder="github_pat_…" required><small>Token fine-grained só deste repositório, com Contents e Pages em leitura e escrita.</small></label>
      <label class="check"><input type="checkbox" name="remember" ${localStorage.getItem("acervo.token") ? "checked" : ""}><span>Lembrar o token neste navegador (marque só em computador seu). Sem marcar, ele vale só enquanto a aba estiver aberta.</span></label>
      <button class="btn primary" type="submit" ${S.loading ? "disabled" : ""}>${S.loading ? '<span class="spinner"></span>Conectando…' : "Conectar"}</button>
      <p class="hint">O token vai direto do seu navegador para o GitHub e não passa por nenhum outro servidor. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Criar token</a></p>
    </form></section>`;
}

function courseCard(c) {
  const parent = dirname(c.path);
  const crumbs = (parent ? parent.split("/").map(esc).join(" / ") + " / " : "") + `<b>${esc(basename(c.path))}</b>`;
  const open = S.openLessons.has(c.path);
  const lessons = open ? `<div class="lessons"><ol>${c.lessons.map((l) => `<li><span class="t"><span class="n">${l.week ? "Semana " + l.week : "Aula " + pad2(l.n)}</span>${esc(l.title || "(sem título)")}</span><button class="btn small" data-act="copy-link" data-path="${esc(l.file)}">Copiar link</button><a class="btn small ghost" href="${esc(siteUrl(l.file))}" target="_blank" rel="noopener" aria-label="Abrir ${esc(lessonLabel(l))}">↗</a></li>`).join("")}</ol>
    <p style="margin:10px 0 0"><button class="btn small" data-act="copy-all-links" data-path="${esc(c.path)}">Copiar todos os links (lista para o Moodle)</button></p></div>` : "";
  return `<article class="course"><div class="crumbs">${crumbs}</div><h3>${esc(c.title)}</h3>
    <div class="meta"><span class="chip">${c.lessons.length} aula${c.lessons.length === 1 ? "" : "s"}</span><span class="chip">${sizeOf(c.size)}</span><span class="chip">${c.files} arquivos</span>${c.broken.length ? `<span class="chip bad" title="O índice do curso aponta para arquivos que não existem mais">${c.broken.length} link${c.broken.length === 1 ? "" : "s"} quebrado${c.broken.length === 1 ? "" : "s"} no índice</span>` : ""}</div>
    ${c.broken.length ? `<p class="note">O <code>index.html</code> do curso ainda aponta para nomes antigos de aula.${c.broken.some((b) => b.target) ? ` <button class="btn small" data-act="fix-index" data-path="${esc(c.path)}">Consertar links do índice</button>` : " Não achei os arquivos novos correspondentes; confira em «Arquivos»."}</p>` : ""}
    <div class="course-actions">
      <a class="btn small primary" href="${esc(siteUrl(c.path, true))}" target="_blank" rel="noopener">Abrir site ↗</a>
      <button class="btn small" data-act="copy-link" data-path="${esc(c.path)}" data-dir="1">Copiar link</button>
      <button class="btn small" data-act="toggle-lessons" data-path="${esc(c.path)}" aria-expanded="${open}">${open ? "Ocultar aulas" : "Links das aulas"}</button>
      <button class="btn small" data-act="goto-files" data-path="${esc(c.path)}">Arquivos</button>
      <button class="btn small" data-act="move" data-path="${esc(c.path)}">Renomear/mover</button>
      <button class="btn small" data-act="duplicate" data-path="${esc(c.path)}">Duplicar</button>
      <button class="btn small danger" data-act="delete" data-path="${esc(c.path)}">Excluir</button>
    </div>${lessons}</article>`;
}

function childrenOf(dir) {
  const names = new Map();
  const prefix = dir ? dir + "/" : "";
  for (const d of S.dirs) if (d.startsWith(prefix) && !d.slice(prefix.length).includes("/")) names.set(d, "dir");
  for (const p of S.files.keys()) if (p.startsWith(prefix) && !p.slice(prefix.length).includes("/")) names.set(p, "file");
  return [...names.entries()].sort((a, b) => (a[1] === b[1] ? basename(a[0]).localeCompare(basename(b[0]), "pt-BR") : a[1] === "dir" ? -1 : 1));
}
function dirSize(dir) { let n = 0; for (const [p, f] of S.files) if (p.startsWith(dir + "/")) n += f.size; return n; }
function treeRows(dir, depth) {
  return childrenOf(dir).map(([p, kind]) => {
    const isDir = kind === "dir"; const open = S.open.has(p);
    const isCourse = isDir && S.courses.some((c) => c.path === p);
    const row = `<div class="node ${isDir ? "dir" : "file"}" role="treeitem" tabindex="0" data-act="select" data-path="${esc(p)}" data-kind="${kind}" aria-selected="${S.selected === p}" ${isDir ? `aria-expanded="${open}"` : ""} style="padding-left:${6 + depth * 18}px"><input type="checkbox" class="pick" data-act="check" data-path="${esc(p)}" ${S.checked.has(p) ? "checked" : ""} aria-label="Marcar ${esc(basename(p))}"><span class="twisty" ${isDir ? `data-act="toggle" data-path="${esc(p)}" title="${open ? "Recolher" : "Expandir"}"` : ""}>${isDir ? (open ? "▾" : "▸") : ""}</span>${isDir ? ICONS.folder : iconFor(p)}<span class="name">${esc(basename(p))}</span>${isCourse ? '<span class="chip ok">curso</span>' : ""}<span class="size">${sizeOf(isDir ? dirSize(p) : S.files.get(p).size)}</span></div>`;
    return row + (isDir && open ? treeRows(p, depth + 1) : "");
  }).join("");
}

function detailPanel() {
  const p = S.selected;
  if (!p) return `<aside class="detail"><h3>Selecione um item</h3><p class="path">Clique em uma pasta ou arquivo da árvore para ver os detalhes, abrir o link e escolher o que fazer.</p><div class="actions"><button class="btn small" data-act="index" data-path="">Gerar índice do site…</button></div></aside>`;
  const isDir = isDirPath(p); const f = S.files.get(p);
  const course = S.courses.find((c) => c.path === p);
  const count = isDir ? filesUnder(p).length : 0;
  const url = siteUrl(p, isDir);
  return `<aside class="detail"><h3>${esc(basename(p))}</h3><p class="path">${esc(p)}</p>
    <dl class="kv">
      <dt>Tipo</dt><dd>${isDir ? (course ? "Pasta de curso (ClassAtelier)" : "Pasta") : "Arquivo"}</dd>
      <dt>Tamanho</dt><dd>${sizeOf(isDir ? dirSize(p) : f.size)}${isDir ? ` · ${count} arquivo${count === 1 ? "" : "s"}` : ""}</dd>
      <dt>Link no site</dt><dd><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></dd>
    </dl>
    <div class="actions">
      <a class="btn small primary" href="${esc(url)}" target="_blank" rel="noopener">Abrir ↗</a>
      <button class="btn small" data-act="copy-link" data-path="${esc(p)}" ${isDir ? 'data-dir="1"' : ""}>Copiar link</button>
      <button class="btn small" data-act="move" data-path="${esc(p)}">Renomear/mover</button>
      ${isDir ? `<button class="btn small" data-act="duplicate" data-path="${esc(p)}">Duplicar</button><button class="btn small" data-act="index" data-path="${esc(p)}">Gerar índice aqui…</button>` : ""}
      <button class="btn small danger" data-act="delete" data-path="${esc(p)}">Excluir</button>
    </div>
    <div id="preview-slot"></div></aside>`;
}

function bulkBar() {
  const n = S.checked.size;
  if (!n) return "";
  return `<div class="bulk" role="region" aria-label="Itens marcados"><span><b>${n}</b> ${n === 1 ? "item marcado" : "itens marcados"}</span><button class="btn small danger" data-act="delete-checked">Excluir marcados…</button><button class="btn small" data-act="clear-checked">Desmarcar tudo</button></div>`;
}
function renderMain() {
  if (!S.conn) { renderConnect(); return; }
  const warn = S.head && S.head.truncated ? '<p class="note">O repositório é muito grande e a lista veio incompleta. Alguns arquivos podem não aparecer aqui.</p>' : "";
  const readOnly = S.conn && !S.conn.canPush ? '<p class="note">O GitHub informa que sua conta não pode alterar este repositório: dá para olhar, mas não mexer.</p>' : "";
  const tabs = `<div class="tabs" role="tablist"><button class="tab" role="tab" data-act="tab" data-view="cursos" aria-selected="${S.view === "cursos"}">Cursos (${S.courses.length})</button><button class="tab" role="tab" data-act="tab" data-view="arquivos" aria-selected="${S.view === "arquivos"}">Todos os arquivos</button></div>`;
  let body;
  if (S.view === "cursos") {
    body = `<div class="section-head"><div><h2>Cursos publicados</h2><p>Cada curso é uma pasta com um <code>index.html</code> e as páginas das aulas (<code>.html</code>), como o ClassAtelier publica. Os nomes das aulas podem ser livres.</p></div><div class="actions"><button class="btn" data-act="index" data-path="">Gerar índice do site…</button><a class="btn" href="${esc(pagesBase())}" target="_blank" rel="noopener">Abrir o site ↗</a></div></div>` +
      (S.courses.length ? `<div class="grid">${S.courses.map(courseCard).join("")}</div>` : `<div class="empty"><h3>Nenhum curso encontrado neste repositório</h3><p>Publique pelo ClassAtelier em Exportar → Curso e GitHub…, ou use a aba de arquivos para ver tudo o que há aqui.</p></div>`);
  } else {
    body = `<div class="section-head"><div><h2>Todos os arquivos</h2><p>${S.files.size} arquivos em ${S.dirs.size} pastas. <b>Clique</b> em um item para ver detalhes e ações. <b>Marque as caixas</b> para excluir vários de uma vez.</p></div></div>${bulkBar()}<div class="explorer"><div class="tree" role="tree" aria-label="Arquivos do repositório">${treeRows("", 0) || '<div class="empty">Repositório vazio.</div>'}</div>${detailPanel()}</div>`;
  }
  const keep = $(".tree") ? $(".tree").scrollTop : 0;
  $("#main").innerHTML = warn + readOnly + tabs + body;
  if ($(".tree")) $(".tree").scrollTop = keep;
  if (S.view === "arquivos" && S.selected && S.files.has(S.selected)) showPreview(S.selected);
}
function render() { renderTop(); renderMain(); }

/* ───────────── pré-visualização ───────────── */
async function showPreview(path) {
  const slot = $("#preview-slot"); const f = S.files.get(path);
  if (!slot || !f) return;
  const isText = /\.(html?|css|js|json|md|xml|txt|svg|nojekyll)$/i.test(path) || basename(path) === ".nojekyll";
  const isImg = /\.(png|jpe?g|gif|webp|ico)$/i.test(path);
  if (!isText && !isImg) return;
  if (f.size > 400000 && !isImg) { slot.innerHTML = '<p class="hint">Arquivo grande demais para pré-visualizar aqui. Use Abrir ↗.</p>'; return; }
  slot.innerHTML = '<p class="hint"><span class="spinner"></span>Carregando pré-visualização…</p>';
  try {
    const blob = await api(`${repoPath()}/git/blobs/${f.sha}`);
    if (S.selected !== path) return;
    const html = isImg
      ? `<div class="preview"><img alt="" src="data:image/${path.split(".").pop().replace("jpg", "jpeg")};base64,${blob.content.replace(/\s/g, "")}"></div>`
      : `<div class="preview"><pre>${esc(b64text(blob.content).slice(0, 12000))}</pre></div>`;
    $("#preview-slot").innerHTML = html;
  } catch (e) { if ($("#preview-slot")) $("#preview-slot").innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
}

/* ───────────── diálogos ───────────── */
function dialog({ title, body, actions }) {
  const root = $("#dialog-root");
  root.innerHTML = `<div class="scrim" data-act="scrim"><section class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2></header><div class="body">${body}</div><footer>${(actions || []).map((a, i) => `<button class="btn ${a.kind || ""}" data-dlg="${i}" ${a.disabled ? "disabled" : ""}>${esc(a.label)}</button>`).join("")}</footer></section></div>`;
  dialog.actions = actions || [];
  const first = root.querySelector("input,button[data-dlg]"); if (first) first.focus();
}
const closeDialog = () => { $("#dialog-root").innerHTML = ""; dialog.actions = []; };
const dlgBusy = (msg) => dialog({ title: "Trabalhando…", body: `<p><span class="spinner"></span>${esc(msg)}</p>`, actions: [] });
function dlgDone(title, html) { dialog({ title, body: `<div class="result">${html}</div>`, actions: [{ label: "Fechar", kind: "primary", onClick: closeDialog }] }); }
function dlgError(e) { dialog({ title: "Não deu certo", body: `<p class="err">${esc(e.message || String(e))}</p>`, actions: [{ label: "Fechar", onClick: closeDialog }] }); }
const canWrite = () => { if (S.conn.canPush) return true; dlgError(new Error("Sua conta não tem permissão de escrita neste repositório.")); return false; };

async function afterChange(message, commit) {
  await loadRepo();
  if (S.selected && !S.files.has(S.selected) && !S.dirs.has(S.selected)) S.selected = "";
  render();
  dlgDone(message, `<p>Pronto, em um único commit. <a href="${esc(commit.url)}" target="_blank" rel="noopener">Ver no GitHub ↗</a></p><p class="hint">O GitHub Pages leva um ou dois minutos para refletir a mudança no site.</p>`);
}

function actMove(path, duplicate) {
  const isDir = isDirPath(path);
  const verb = duplicate ? "Duplicar" : "Renomear ou mover";
  const lessonIdx = !duplicate && !isDir && /\.html?$/i.test(path) && basename(path).toLowerCase() !== "index.html" && S.files.has(dirname(path) + "/index.html") && S.courses.some((c) => c.path === dirname(path)) ? dirname(path) + "/index.html" : "";
  dialog({
    title: `${verb} «${basename(path)}»`,
    body: `<p>${duplicate ? "Cria uma cópia completa, por exemplo para o próximo semestre." : "Os arquivos mudam de caminho em um único commit, sem perder nada."} Informe o <b>caminho novo</b> dentro do repositório.</p>
      <label class="field"><span>Novo caminho</span><input type="text" id="dest" value="${esc(path)}" spellcheck="false"></label>
      ${duplicate ? "" : `<p class="note">Os links do site mudam junto. Links já colados no Moodle para <code>${esc(path)}</code> deixam de funcionar até você trocá-los.</p>`}
      ${lessonIdx ? `<label class="check"><input type="checkbox" id="fix-idx" checked><span>Atualizar também o link desta aula no <code>index.html</code> do curso (recomendado).</span></label>` : ""}
      <div id="dest-err"></div>`,
    actions: [{ label: "Cancelar", onClick: closeDialog }, { label: verb, kind: "primary", onClick: async () => {
      if (!canWrite()) return;
      const v = validateDest($("#dest").value, path);
      if (v.error) { $("#dest-err").innerHTML = `<p class="err">${esc(v.error)}</p>`; return; }
      const entries = planMove(path, v.dest, duplicate);
      if (lessonIdx && $("#fix-idx") && $("#fix-idx").checked && dirname(v.dest) === dirname(path)) {
        try {
          const html = await indexHtmlOf(lessonIdx);
          const out = rewriteHref(html, basename(path), basename(v.dest));
          if (out !== html) entries.push({ path: lessonIdx, mode: S.files.get(lessonIdx).mode, type: "blob", content: out });
        } catch (e) { /* segue sem atualizar o índice; o aviso no cartão permite consertar depois */ }
      }
      dlgBusy("Enviando " + (entries.length / (duplicate ? 1 : 2)) + " arquivo(s)…");
      try {
        const commit = await commitChanges(entries, `${duplicate ? "Duplica" : "Move"} ${path} → ${v.dest} (${APP_NAME})`);
        S.selected = v.dest; if (isDir) S.open.add(dirname(v.dest));
        await afterChange(`${duplicate ? "Cópia criada" : "Movido"} para ${v.dest}`, commit);
      } catch (e) { dlgError(e); }
    } }]
  });
}
async function indexHtmlOf(path) {
  const f = S.files.get(path); const blob = await api(`${repoPath()}/git/blobs/${f.sha}`); return b64text(blob.content);
}
// troca href="antigo.html" (com ou sem ./, com ou sem %-escapes) por href="novo.html"
function rewriteHref(html, oldName, newName) {
  const olds = new Set([oldName, encodeURIComponent(oldName), enc(oldName)]);
  let out = html;
  for (const o of olds) for (const pre of ["", "./"]) out = out.split(`href="${pre}${o}"`).join(`href="${encodeURIComponent(newName).replace(/%28/g, "(").replace(/%29/g, ")")}"`);
  return out;
}
async function actFixIndex(coursePath) {
  const c = S.courses.find((x) => x.path === coursePath); if (!c || !canWrite()) return;
  const fixes = c.broken.filter((b) => b.target);
  dialog({
    title: "Consertar links do índice",
    body: `<p>Em <code>${esc(c.path)}/index.html</code>, vou trocar:</p><ul style="margin:0 0 12px;padding-left:20px">${fixes.map((b) => `<li><code>${esc(b.href)}</code> → <code>${esc(b.target)}</code></li>`).join("")}</ul><p class="hint">Só o índice do curso muda (um commit). As aulas não são tocadas.</p>`,
    actions: [{ label: "Cancelar", onClick: closeDialog }, { label: "Consertar", kind: "primary", onClick: async () => {
      dlgBusy("Atualizando o índice…");
      try {
        const idx = c.path + "/index.html"; let html = await indexHtmlOf(idx);
        for (const b of fixes) html = rewriteHref(html, b.href, b.target);
        const commit = await commitChanges([{ path: idx, mode: S.files.get(idx).mode, type: "blob", content: html }], `Conserta links do índice de ${c.path} (${APP_NAME})`);
        await afterChange("Índice consertado", commit);
      } catch (e) { dlgError(e); }
    } }]
  });
}
function actDelete(path) { actDeleteMany([path]); }
function actDeleteMany(paths) {
  // sem itens repetidos nem itens dentro de uma pasta que também será excluída
  const uniq = [...new Set(paths)].filter((p) => !paths.some((q) => q !== p && isDirPath(q) && p.startsWith(q + "/")));
  const entries = new Map();
  for (const p of uniq) for (const e of planDelete(p)) entries.set(e.path, e);
  const hasDir = uniq.some(isDirPath);
  const needType = hasDir || uniq.length > 1;
  const word = uniq.length === 1 ? basename(uniq[0]) : "excluir";
  const names = uniq.slice(0, 8).map((p) => `<li><code>${esc(p)}</code>${isDirPath(p) ? " (pasta)" : ""}</li>`).join("") + (uniq.length > 8 ? `<li>…e mais ${uniq.length - 8}</li>` : "");
  const courses = uniq.map((p) => S.courses.find((c) => c.path === p)).filter(Boolean);
  dialog({
    title: uniq.length === 1 ? `Excluir «${basename(uniq[0])}»` : `Excluir ${uniq.length} itens`,
    body: `<p>Vai remover <b>${entries.size}</b> arquivo(s) do repositório${courses.length ? `, incluindo ${courses.length === 1 ? "o curso" : "os cursos"} ${courses.map((c) => "“" + esc(c.title) + "”").join(", ")}` : ""}. Os links do site para eles deixam de funcionar.</p>
      <ul style="margin:0 0 12px;padding-left:20px">${names}</ul>
      <p class="hint">O histórico do GitHub guarda a versão anterior: dá para recuperar pelo GitHub se precisar.</p>
      ${needType ? `<label class="field"><span>Para confirmar, digite: <b>${esc(word)}</b></span><input type="text" id="confirm-name" spellcheck="false" autocomplete="off"></label>` : ""}<div id="del-err"></div>`,
    actions: [{ label: "Cancelar", onClick: closeDialog }, { label: "Excluir", kind: "danger", onClick: async () => {
      if (!canWrite()) return;
      if (needType && $("#confirm-name").value.trim().toLowerCase() !== word.toLowerCase()) { $("#del-err").innerHTML = `<p class="err">Digite exatamente “${esc(word)}” para confirmar.</p>`; return; }
      dlgBusy("Excluindo " + entries.size + " arquivo(s)…");
      try {
        const commit = await commitChanges([...entries.values()], uniq.length === 1 ? `Exclui ${uniq[0]} (${APP_NAME})` : `Exclui ${uniq.length} itens (${APP_NAME})`);
        uniq.forEach((p) => S.checked.delete(p));
        await afterChange("Excluído", commit);
      } catch (e) { dlgError(e); }
    } }]
  });
}
async function actIndex(folder) {
  const inside = S.courses.filter((c) => !folder || c.path.startsWith(folder + "/"));
  const target = (folder ? folder + "/" : "") + "index.html";
  const existing = S.files.get(target);
  let foreign = false;
  if (existing) { try { foreign = !b64text((await api(`${repoPath()}/git/blobs/${existing.sha}`)).content).includes(MARKER); } catch (e) { foreign = true; } }
  if (folder && S.courses.some((c) => c.path === folder)) { dlgError(new Error("Esta pasta já é um curso, com o próprio index.html. Gere o índice em uma pasta que contenha cursos.")); return; }
  dialog({
    title: "Gerar índice do site",
    body: `<p>Cria <code>${esc(target)}</code>: uma página com a lista dos cursos${folder ? ` de <code>${esc(folder)}</code>` : ""}, agrupados por pasta e com link para cada um.</p>
      ${foreign ? `<p class="note">Já existe um <code>${esc(target)}</code> que não foi gerado por esta ferramenta. Ele será <b>substituído</b>.</p>` : ""}
      <label class="field"><span>Título da página</span><input type="text" id="idx-title" value="Cursos publicados"></label>
      <label class="field"><span>Subtítulo (opcional)</span><input type="text" id="idx-sub" value="" placeholder="Ex.: TEDPRO · IFSC"></label>
      <p style="margin-bottom:6px"><b>Cursos no índice</b></p>
      ${inside.length ? `<div class="list-pick">${inside.map((c, i) => `<label><input type="checkbox" data-i="${i}" checked><span>${esc(c.title)}<br><code>${esc(c.path)}</code></span></label>`).join("")}</div>` : '<p class="hint">Nenhum curso encontrado nesta pasta.</p>'}`,
    actions: [{ label: "Cancelar", onClick: closeDialog }, { label: "Gerar e publicar", kind: "primary", disabled: !inside.length, onClick: async () => {
      if (!canWrite()) return;
      const chosen = inside.filter((_, i) => $(`input[data-i="${i}"]`).checked);
      if (!chosen.length) { toast("Marque ao menos um curso."); return; }
      const opts = { title: $("#idx-title").value.trim() || "Cursos publicados", subtitle: $("#idx-sub").value.trim() };
      dlgBusy("Montando e enviando o índice…");
      try {
        const html = await buildIndexHtml(folder, chosen, opts);
        const commit = await commitChanges([{ path: target, mode: "100644", type: "blob", content: html }], `Atualiza índice ${target} (${APP_NAME})`);
        await loadRepo(); render();
        dlgDone("Índice publicado", `<p>Endereço: <a href="${esc(siteUrl(target))}" target="_blank" rel="noopener">${esc(siteUrl(folder ? folder + "/" : "", false))}</a></p><p><a href="${esc(commit.url)}" target="_blank" rel="noopener">Ver o commit ↗</a></p><p class="hint">Rode de novo sempre que publicar ou mover um curso, para o índice acompanhar.</p>`);
      } catch (e) { dlgError(e); }
    } }]
  });
}
async function actEnablePages() {
  if (!canWrite()) return;
  dlgBusy("Ligando o GitHub Pages…");
  try {
    await api(`${repoPath()}/pages`, { method: "POST", body: { source: { branch: S.conn.branch, path: "/" } } });
    S.pages = await api(`${repoPath()}/pages`).catch(() => null);
    render(); dlgDone("Pages ligado", `<p>O site fica em <a href="${esc(pagesBase())}" target="_blank" rel="noopener">${esc(pagesBase())}</a> em um ou dois minutos.</p>`);
  } catch (e) { dlgError(e); }
}
const lessonLabel = (l) => (l.week ? `Semana ${l.week}` : `Aula ${pad2(l.n)}`) + (l.title ? ` — ${l.title}` : "");
function allLinksText(coursePath) {
  const c = S.courses.find((x) => x.path === coursePath);
  return c.lessons.map((l) => `${lessonLabel(l)}: ${siteUrl(l.file)}`).join("\n");
}

/* ───────────── conexão ───────────── */
async function connect(form) {
  const fd = new FormData(form);
  S.owner = String(fd.get("owner") || "").trim(); S.repo = String(fd.get("repo") || "").trim();
  S.branch = String(fd.get("branch") || "").trim(); S.token = String(fd.get("token") || "").trim();
  const remember = !!fd.get("remember");
  S.loading = true; S.error = ""; renderConnect();
  try {
    S.conn = { owner: S.owner, repo: S.repo, branch: S.branch, canPush: false };
    const info = await api(`${repoPath()}`);
    S.conn = { owner: info.owner && info.owner.login || S.owner, repo: info.name || S.repo, branch: S.branch || info.default_branch || "main", canPush: !(info.permissions && info.permissions.push === false) }; // tokens de granularidade fina muitas vezes não informam "permissions": só bloqueia se vier false explícito; no mais, tenta e mostra o erro real do GitHub
    try { localStorage.setItem("acervo.repo", JSON.stringify({ owner: S.owner, repo: S.repo, branch: S.branch })); } catch (e) { /* sem armazenamento */ }
    try { sessionStorage.setItem("acervo.token", S.token); if (remember) localStorage.setItem("acervo.token", S.token); else localStorage.removeItem("acervo.token"); } catch (e) { /* sem armazenamento */ }
    S.loading = true; $("#main").innerHTML = '<div class="loading"><span class="spinner"></span>Lendo o repositório…</div>'; renderTop();
    await loadRepo();
    S.loading = false; S.view = "cursos"; render();
  } catch (e) {
    S.loading = false; S.conn = null; S.error = e.message; render();
  }
}
function logout() {
  try { sessionStorage.removeItem("acervo.token"); localStorage.removeItem("acervo.token"); } catch (e) { /* ok */ }
  S.token = ""; S.conn = null; S.files = new Map(); S.dirs = new Set(); S.courses = []; S.selected = ""; S.error = ""; render();
}

/* ───────────── eventos ───────────── */
document.addEventListener("submit", (ev) => { if (ev.target.id === "connect-form") { ev.preventDefault(); connect(ev.target); } });
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && $("#dialog-root").innerHTML) closeDialog();
  if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches('.node[data-act="select"]')) { ev.preventDefault(); ev.target.click(); }
});
document.addEventListener("click", async (ev) => {
  const dlg = ev.target.closest("[data-dlg]");
  if (dlg) { const a = dialog.actions[Number(dlg.dataset.dlg)]; if (a && a.onClick) a.onClick(); return; }
  const el = ev.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act; const path = el.dataset.path;
  if (act === "scrim") { if (ev.target === el && !$("#dialog-root .spinner")) closeDialog(); return; }
  if (act === "tab") { S.view = el.dataset.view; renderMain(); return; }
  if (act === "reload") { $("#main").innerHTML = '<div class="loading"><span class="spinner"></span>Lendo o repositório…</div>'; try { await loadRepo(); render(); toast("Atualizado: " + S.courses.length + " curso(s), " + S.files.size + " arquivo(s)."); } catch (e) { render(); dlgError(e); } return; }
  if (act === "logout") { logout(); return; }
  if (act === "enable-pages") { actEnablePages(); return; }
  if (act === "toggle") { if (S.open.has(path)) S.open.delete(path); else S.open.add(path); renderMain(); return; }
  if (act === "check") { if (el.checked) S.checked.add(path); else S.checked.delete(path); renderMain(); return; }
  if (act === "clear-checked") { S.checked.clear(); renderMain(); return; }
  if (act === "delete-checked") { actDeleteMany([...S.checked]); return; }
  if (act === "select") {
    S.selected = path;
    if (el.dataset.kind === "dir") S.open.add(path); // clicar abre a pasta; para recolher, use a setinha
    renderMain(); return;
  }
  if (act === "goto-files") { S.view = "arquivos"; S.selected = path; let d = path; while (d) { S.open.add(d); d = dirname(d); } renderMain(); return; }
  if (act === "fix-index") { actFixIndex(path); return; }
  if (act === "toggle-lessons") { if (S.openLessons.has(path)) S.openLessons.delete(path); else S.openLessons.add(path); renderMain(); return; }
  if (act === "copy-link") { copy(siteUrl(path, el.dataset.dir === "1" || isDirPath(path)), "Link copiado."); return; }
  if (act === "copy-all-links") { copy(allLinksText(path), "Links de todas as aulas copiados."); return; }
  if (act === "move") { actMove(path, false); return; }
  if (act === "duplicate") { actMove(path, true); return; }
  if (act === "delete") { actDelete(path); return; }
  if (act === "index") { actIndex(path); return; }
});

/* ───────────── início ───────────── */
(function init() {
  try {
    const saved = JSON.parse(localStorage.getItem("acervo.repo") || "null");
    if (saved) { S.owner = saved.owner || ""; S.repo = saved.repo || ""; S.branch = saved.branch || ""; }
    S.token = sessionStorage.getItem("acervo.token") || localStorage.getItem("acervo.token") || "";
  } catch (e) { /* sem armazenamento */ }
  render();
})();
