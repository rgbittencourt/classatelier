/* eslint-disable */
// ClassAtelier — «Inserir imagem no cursor» (painel do Parágrafo).
//
// Janela com duas abas: escolher um arquivo de imagem ou pedir à IA que crie a figura na hora.
// A IA é a do ClassAuthor (o editor não guarda chave de IA): o pedido vai para
// {endereço do ClassAuthor}/api/figure com o código de acesso e volta um diagrama/ilustração
// em SVG, sempre rotulado "Ilustração criada por IA". Quem insere no texto é o app.jsx.
(function () {
  const { useState, useRef, useEffect } = React;
  const LS_BASE = "classatelier.ai.base", LS_CODE = "classatelier.ai.code", LS_KEY = "classatelier.ai.key";
  const DEFAULT_BASE = "https://classauthor.vercel.app";
  const MAX_SIDE = 1600;

  const safeGet = (store, key) => { try { return window[store].getItem(key) || ""; } catch (e) { return ""; } };
  const safeSet = (store, key, value) => { try { if (value) window[store].setItem(key, value); else window[store].removeItem(key); } catch (e) { /* sem armazenamento */ } };


  // Acesso ao ClassAuthor: UM só lugar de dados para figuras com IA, busca de legendas e resumo com IA.
  // O que se digita em qualquer campo vale para os outros; o código pode ser lembrado, a chave de IA fica só na sessão da aba.
  const accessStore = (() => {
    let state = {
      base: safeGet("localStorage", LS_BASE) || DEFAULT_BASE,
      code: safeGet("localStorage", LS_CODE) || safeGet("sessionStorage", LS_CODE),
      remember: !!safeGet("localStorage", LS_CODE),
      aiKey: safeGet("sessionStorage", LS_KEY)
    };
    const subs = new Set();
    return {
      get: () => state,
      set: (patch) => { state = { ...state, ...patch }; subs.forEach((fn) => fn()); },
      subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
      persist: () => {
        safeSet("localStorage", LS_BASE, state.base.trim() === DEFAULT_BASE ? "" : state.base.trim());
        safeSet("sessionStorage", LS_CODE, state.code.trim()); safeSet("localStorage", LS_CODE, state.remember ? state.code.trim() : "");
        safeSet("sessionStorage", LS_KEY, String(state.aiKey || "").trim());
      }
    };
  })();
  function useAccess() {
    const [, force] = useState(0);
    useEffect(() => accessStore.subscribe(() => force((n) => n + 1)), []);
    const a = accessStore.get();
    return { base: a.base, code: a.code, remember: a.remember, aiKey: a.aiKey,
      setBase: (v) => accessStore.set({ base: v }), setCode: (v) => accessStore.set({ code: v }),
      setRemember: (v) => accessStore.set({ remember: v }), setAiKey: (v) => accessStore.set({ aiKey: v }) };
  }

  // Chave de IA própria (para quem não tem o código de acesso): fica só na sessão desta aba, nunca em localStorage.
  // Vai ao servidor do ClassAuthor em cabeçalhos x-aula-*; o servidor a usa na hora, sem guardar nem registrar.
  const keyHeaders = (aiKey) => {
    const key = String(aiKey || "").trim();
    return /^[A-Za-z0-9._-]{16,300}$/.test(key) ? { "x-aula-ai-key": key, "x-aula-ai-provider": /^sk-ant-/.test(key) ? "anthropic" : "openai" } : {};
  };

  // Lê o arquivo e, se for foto grande, reduz o lado maior para 1600 px (a aula exportada fica leve).
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("Escolha um arquivo de imagem (JPG, PNG, WebP, GIF ou SVG)."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Não consegui ler o arquivo."));
      reader.onload = () => {
        const raw = String(reader.result);
        if (/svg|gif/.test(file.type)) return resolve(raw);
        const img = new Image();
        img.onerror = () => resolve(raw);
        img.onload = () => {
          const side = Math.max(img.naturalWidth, img.naturalHeight);
          if (side <= MAX_SIDE) return resolve(raw);
          const k = MAX_SIDE / side, c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          try { resolve(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.88)); } catch (e) { resolve(raw); }
        };
        img.src = raw;
      };
      reader.readAsDataURL(file);
    });
  }

  async function askFigure({ base, code, aiKey, prompt, context, title }) {
    const url = String(base || DEFAULT_BASE).trim().replace(/\/+$/, "") + "/api/figure";
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 170000);
    let res;
    try {
      res = await fetch(url, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", ...(code ? { "x-aula-access-code": code } : {}), ...keyHeaders(aiKey) }, body: JSON.stringify({ action: "figure", prompt, context, title }) });
    } catch (e) {
      throw new Error(e && e.name === "AbortError" ? "A IA demorou demais. Tente de novo, com uma descrição mais simples." : "Não consegui falar com o ClassAuthor em " + url.replace(/\/api\/figure$/, "") + ". Confira o endereço e a conexão (e se esta versão do ClassAuthor já tem a criação de figuras).");
    } finally { clearTimeout(timer); }
    let data = null; try { data = await res.json(); } catch (e) { /* resposta sem JSON */ }
    if (!res.ok || !data || !data.ok) {
      if (res.status === 401) throw new Error("O código de acesso do ClassAuthor não foi aceito. É o mesmo que você digita na entrada do ClassAuthor. Sem o código? Cole a sua chave de IA em «Acesso ao ClassAuthor».");
      if (res.status === 503) throw new Error("O ClassAuthor está sem chave de IA configurada. " + ((data && data.error) || ""));
      throw new Error((data && data.error) || "O ClassAuthor respondeu com erro " + res.status + ".");
    }
    return data;
  }

  function InsertImageDialog({ title, context, suggestions, onInsert, onClose }) {
    const [tab, setTab] = useState("arquivo");
    const [img, setImg] = useState(null); // { src, alt, caption, credit, ai }
    const [decor, setDecor] = useState(false);
    const [prompt, setPrompt] = useState("");
    const sugg = Array.isArray(suggestions) ? suggestions : [];
    const [figId, setFigId] = useState("");
    const [copied, setCopied] = useState(false);
    const fig = sugg.find((f) => f.id === figId) || null;
    const { base, code, remember, aiKey, setBase, setCode, setRemember, setAiKey } = useAccess();
    const [busy, setBusy] = useState("");
    const [err, setErr] = useState("");
    const fileRef = useRef(null);
    useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

    const set = (k, v) => setImg((x) => ({ ...x, [k]: v }));
    const pick = async (file) => {
      setErr("");
      try { const src = await readImage(file); setImg({ src, alt: fig ? (fig.description || "") : "", caption: fig ? (fig.caption || "") : "", credit: "", ai: false, file }); }
      catch (e) { setErr(e.message); }
    };
    const create = async () => {
      setErr("");
      if (String(prompt).trim().length < 4) { setErr("Descreva o que a imagem deve mostrar (uma ideia por figura)."); return; }
      setBusy("Criando a figura… leva de 20 a 60 segundos.");
      try {
        const r = await askFigure({ base, code: code.trim(), aiKey, prompt: prompt.trim(), context, title });
        accessStore.persist();
        let file = null; try { file = await (await fetch(r.src)).blob(); } catch (e) { /* sem cópia do SVG */ }
        setImg({ src: r.src, alt: r.alt || "", caption: r.caption || "", credit: r.credit || "", ai: true, file });
      } catch (e) { setErr(e.message); }
      finally { setBusy(""); }
    };
    const ready = img && img.src && (decor || String(img.alt || "").trim());
    const insert = () => { if (ready) onInsert({ src: img.src, alt: decor ? "" : img.alt.trim(), decorative: decor, caption: img.caption || "", credit: img.credit || "", file: img.file || null, figureId: fig ? fig.id : "", figureKind: fig ? fig.kind : "" }); };
    const kindName = { foto: "Foto", napkin: "Napkin", diagrama: "Diagrama" };
    const figText = (f) => (f.kind === "napkin" ? (f.napkinText || f.description) : (f.prompt || f.description)) || "";
    const chooseFig = (id) => {
      setFigId(id); setCopied(false);
      const f = sugg.find((x) => x.id === id);
      if (f && img) setImg((x) => ({ ...x, alt: x.alt || f.description || "", caption: x.caption || f.caption || "" }));
    };

    const lab = { display: "block", fontSize: 12, fontWeight: 650, margin: "0 0 4px", color: "var(--tool-ink-2)" };
    const inp = { width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit" };
    const btn = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" };
    const primary = { ...btn, background: "var(--tool-accent)", color: "#fff", border: 0 };
    const tabBtn = (id, text) => <button type="button" role="tab" aria-selected={tab === id} data-ii={"tab-" + id} onClick={() => { setTab(id); setErr(""); }} style={{ ...btn, borderRadius: "8px 8px 0 0", borderBottom: 0, background: tab === id ? "#fff" : "var(--tool-surface)", color: tab === id ? "var(--tool-ink)" : "var(--tool-ink-3)" }}>{text}</button>;

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(20,20,28,.48)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={onClose}>
        <section role="dialog" aria-modal="true" aria-label="Inserir imagem no cursor" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(620px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
          <header style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>Inserir imagem no cursor</h2>
              <p style={{ margin: "4px 0 10px", fontSize: 12.5, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>O parágrafo se divide no ponto do cursor e a imagem fica no meio, em linha própria.</p>
            </div>
            <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
          </header>
          {sugg.length > 0 && (<div data-ii="figbox" style={{ margin: "0 20px 12px", padding: "10px 12px", border: "1px solid #e1d6b8", borderRadius: 9, background: "#fffaf0" }}>
            <label style={lab}>Esta imagem é uma figura sugerida pelo ClassAuthor? ({sugg.length} ainda não inserida{sugg.length > 1 ? "s" : ""})</label>
            <select value={figId} onChange={(e) => chooseFig(e.target.value)} data-ii="fig" style={inp}>
              <option value="">Não, é uma imagem avulsa</option>
              {sugg.map((f) => <option key={f.id} value={f.id}>{kindName[f.kind] || "Imagem"} · seção {f.sectionNumber}{f.sectionTitle ? " — " + f.sectionTitle : ""}: {String(f.description || "").slice(0, 70)}</option>)}
            </select>
            {fig && (<div style={{ marginTop: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--tool-ink-2)", lineHeight: 1.45 }}>{fig.kind === "napkin" ? "Texto para colar no Napkin (napkin.ai):" : "Pedido para o ChatGPT ou outro gerador de imagens:"}</p>
              <textarea readOnly rows={3} value={figText(fig)} data-ii="figtext" style={{ ...inp, resize: "vertical", background: "#fff" }} />
              <button type="button" data-ii="figcopy" onClick={async () => { try { await navigator.clipboard.writeText(figText(fig)); setCopied(true); } catch (e) { /* sem permissão */ } }} style={{ ...btn, marginTop: 6, padding: "5px 10px", fontSize: 12 }}>{copied ? "Copiado!" : "Copiar"}</button>
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>Depois de criar a imagem, escolha o arquivo abaixo. O texto alternativo e a legenda já vêm preenchidos, e uma cópia do original vai para a pasta <strong>imagens/</strong> do projeto.</p>
            </div>)}
          </div>)}
          <div role="tablist" style={{ display: "flex", gap: 6, padding: "0 20px", borderBottom: "1px solid var(--tool-line)" }}>
            {tabBtn("arquivo", "Escolher imagem")}{tabBtn("ia", "Criar com IA")}
          </div>
          <div className="tool-scroll" style={{ padding: 20, overflow: "auto" }}>
            {tab === "arquivo" && (<div>
              <input ref={fileRef} type="file" accept="image/*" data-ii="file" onChange={(e) => { pick(e.target.files && e.target.files[0]); e.target.value = ""; }} style={{ display: "none" }} />
              <button type="button" onClick={() => fileRef.current && fileRef.current.click()} style={btn} data-ii="choose">{img && !img.ai ? "Trocar imagem" : "Escolher arquivo…"}</button>
              <p style={{ fontSize: 11.5, color: "var(--tool-ink-3)", margin: "8px 0 0", lineHeight: 1.45 }}>JPG, PNG, WebP, GIF ou SVG. Fotos grandes são reduzidas (lado maior de 1600 px) para a aula ficar leve.</p>
            </div>)}
            {tab === "ia" && (<div>
              <label style={lab}>O que a imagem deve mostrar?</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} data-ii="prompt" placeholder="Ex.: Fluxo de uma consulta SQL: o aluno escreve, o otimizador escolhe o plano, o motor executa e devolve as linhas." style={{ ...inp, resize: "vertical" }} />
              <p style={{ fontSize: 11.5, color: "var(--tool-ink-3)", margin: "6px 0 10px", lineHeight: 1.45 }}>A IA cria <strong>diagramas e ilustrações vetoriais</strong> (esquemas, fluxos, comparações, gráficos simples). Não faz fotos. O trecho em volta do cursor vai junto para ela usar os mesmos termos do texto. Confira o resultado antes de publicar.</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1.3 }}><label style={lab}>Endereço do ClassAuthor</label><input value={base} onChange={(e) => setBase(e.target.value)} autoComplete="off" spellCheck={false} style={inp} data-ii="base" /></div>
                <div style={{ flex: 1 }}><label style={lab}>Código de acesso</label><input type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} style={inp} data-ii="code" /></div>
              </div>
              <div style={{ marginBottom: 8 }}><label style={lab}>Sem o código? Use a sua chave de IA (Anthropic ou OpenAI)</label><input type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Opcional: cole a sua chave (sk-ant-… ou sk-…)" style={inp} data-ii="aikey" /><p style={{ fontSize: 11.5, color: "var(--tool-ink-3)", margin: "4px 0 0", lineHeight: 1.45 }}>O custo vai para a sua conta no provedor. A chave fica só nesta aba (some ao fechar), vai por conexão segura e o servidor não a guarda.</p></div>
              <label style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--tool-ink-3)", margin: "0 0 12px" }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Lembrar o código neste navegador (não use em computador compartilhado)</label>
              <button type="button" onClick={create} disabled={!!busy} style={primary} data-ii="create">{img && img.ai ? "Criar de novo" : "Criar imagem"}</button>
              {busy && <p role="status" style={{ fontSize: 12.5, color: "var(--tool-ink-2)", margin: "12px 0 0" }}>{busy}</p>}
            </div>)}
            {err && <div role="alert" data-ii="err" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#fdecea", color: "#8a2f18", fontSize: 12.5, lineHeight: 1.5 }}>{err}</div>}
            {img && img.src && (<div style={{ marginTop: 16, borderTop: "1px solid var(--tool-line)", paddingTop: 14 }}>
              <img src={img.src} alt="" data-ii="preview" style={{ display: "block", maxWidth: "100%", maxHeight: 240, margin: "0 auto 12px", borderRadius: 8, border: "1px solid var(--tool-line-2)", background: "#fbf9f4" }} />
              <label style={{ display: "flex", gap: 8, fontSize: 12.5, margin: "0 0 8px" }}><input type="checkbox" checked={decor} onChange={(e) => setDecor(e.target.checked)} data-ii="decor" /> Imagem decorativa (só enfeita, sem descrição)</label>
              {!decor && (<div style={{ marginBottom: 8 }}><label style={lab}>Texto alternativo (acessibilidade) <span style={{ color: "var(--tool-accent)" }}>*</span></label>
                <textarea value={img.alt} onChange={(e) => set("alt", e.target.value)} rows={2} data-ii="alt" placeholder="Descreva a informação que a imagem traz, em uma frase." style={{ ...inp, resize: "vertical" }} /></div>)}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1.4 }}><label style={lab}>Legenda (opcional)</label><input value={img.caption} onChange={(e) => set("caption", e.target.value)} style={inp} data-ii="caption" /></div>
                <div style={{ flex: 1 }}><label style={lab}>Crédito / fonte</label><input value={img.credit} onChange={(e) => set("credit", e.target.value)} style={inp} data-ii="credit" /></div>
              </div>
            </div>)}
          </div>
          <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={btn}>Cancelar</button>
            <button onClick={insert} disabled={!ready} style={{ ...primary, opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }} data-ii="insert">Inserir no cursor</button>
          </footer>
        </section>
      </div>
    );
  }

  // ── Legendas do YouTube → campo Transcrição (painel do bloco Vídeo) ──
  async function askCaptions({ base, code, aiKey, video }) {
    const url = String(base || DEFAULT_BASE).trim().replace(/\/+$/, "") + "/api/captions";
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 40000);
    let res;
    try {
      res = await fetch(url, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", ...(code ? { "x-aula-access-code": code } : {}), ...keyHeaders(aiKey) }, body: JSON.stringify({ action: "captions", video, language: "pt" }) });
    } catch (e) {
      throw new Error(e && e.name === "AbortError" ? "O YouTube demorou demais. Tente de novo." : "Não consegui falar com o ClassAuthor em " + url.replace(/\/api\/captions$/, "") + ". Confira o endereço e a conexão.");
    } finally { clearTimeout(timer); }
    let data = null; try { data = await res.json(); } catch (e) { /* sem JSON */ }
    if (!res.ok || !data || !data.ok) {
      if (res.status === 401) throw new Error("O código de acesso do ClassAuthor não foi aceito. É o mesmo que você digita na entrada do ClassAuthor. Sem o código? Cole a sua chave de IA em «Acesso ao ClassAuthor».");
      throw new Error((data && data.error) || "O ClassAuthor respondeu com erro " + res.status + ".");
    }
    return data;
  }

  function CaptionsFetcher({ video, hasText, onFill }) {
    const { base, code, aiKey } = useAccess();
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [note, setNote] = useState("");
    const [confirm, setConfirm] = useState(false);
    const inp = { width: "100%", boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--tool-line-2)", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", background: "#fff" };
    const go = async () => {
      setErr(""); setNote("");
      if (hasText && !confirm) { setConfirm(true); return; }
      setConfirm(false); setBusy(true);
      try {
        const r = await askCaptions({ base, code: code.trim(), aiKey, video });
        accessStore.persist();
        onFill(r);
        setNote((r.auto ? "Legenda automática do YouTube" : "Legenda do YouTube") + " (" + (r.languageName || r.language) + ", " + r.paragraphs + " parágrafos) colocada no campo. Leia e corrija antes de publicar.");
      } catch (e) { setErr(e.message); }
      finally { setBusy(false); }
    };
    return (
      <div data-cf="box" style={{ margin: "8px 0 10px", padding: "10px 12px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={go} disabled={busy || !video} data-cf="go" style={{ padding: "7px 12px", border: "1px solid var(--tool-accent)", borderRadius: 7, background: confirm ? "var(--tool-accent)" : "#fff", color: confirm ? "#fff" : "var(--tool-accent)", fontWeight: 600, fontSize: 12.5, cursor: busy || !video ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>{busy ? "Buscando…" : confirm ? "Substituir o texto" : "Buscar legendas do YouTube"}</button>
        </div>
        {confirm && <p role="status" style={{ fontSize: 12, margin: "6px 0 0", color: "var(--tool-ink-2)" }}>Já há texto no campo Transcrição. Clique de novo para substituir.</p>}
        {note && <p role="status" data-cf="note" style={{ fontSize: 12, margin: "8px 0 0", color: "var(--tool-ink-2)", lineHeight: 1.45 }}>{note}</p>}
        {err && <p role="alert" data-cf="err" style={{ fontSize: 12, margin: "8px 0 0", padding: "8px 10px", borderRadius: 8, background: "#fdecea", color: "#8a2f18", lineHeight: 1.45 }}>{err}</p>}
      </div>
    );
  }
  // ── Acesso ao ClassAuthor: preenchido uma vez, vale para tudo que usa o ClassAuthor ──
  // Passo a passo para criar a própria chave de IA (Anthropic ou OpenAI), com os links oficiais.
  const KEY_GUIDES = {
    anthropic: {
      name: "Claude (Anthropic)", prefix: "sk-ant-", url: "https://platform.claude.com/settings/keys", billing: "https://platform.claude.com/settings/billing",
      steps: [
        ["Abra o console de desenvolvedor", "Acesse platform.claude.com (o antigo console.anthropic.com leva para o mesmo lugar) e entre com seu e-mail ou conta Google. É uma conta separada da assinatura do Claude no app: ter o Claude Pro não dá créditos de API."],
        ["Coloque créditos", "Em Settings → Billing, cadastre um cartão e compre créditos (o valor mínimo é pequeno). Sem crédito, a chave existe mas o ClassAuthor recebe erro ao usar."],
        ["Crie a chave", "Em Settings → API keys, clique em «Create key», dê um nome (por exemplo, ClassAtelier), escolha a validade (se pedir) e confirme."],
        ["Copie na hora", "A chave começa com sk-ant- e aparece uma única vez. Copie e guarde num lugar seguro; se perder, é só apagar e criar outra."],
        ["Cole aqui", "Volte a esta janela e cole no campo «Sua chave de IA». Pronto: as gerações passam a ser cobradas na sua conta."]
      ]
    },
    openai: {
      name: "ChatGPT (OpenAI)", prefix: "sk-", url: "https://platform.openai.com/api-keys", billing: "https://platform.openai.com/settings/organization/billing/overview",
      steps: [
        ["Abra a plataforma de desenvolvedor", "Acesse platform.openai.com e entre com a mesma conta do ChatGPT ou crie uma. A cobrança da API é separada: o ChatGPT Plus não inclui créditos de API."],
        ["Coloque créditos", "Em Settings → Billing, adicione um cartão e compre créditos. Sem saldo, a chave é recusada."],
        ["Crie a chave", "Em API keys, clique em «Create new secret key», dê um nome (por exemplo, ClassAtelier) e confirme."],
        ["Copie na hora", "A chave começa com sk- e só é mostrada uma vez. Copie e guarde; se perder, crie outra."],
        ["Cole aqui", "Volte a esta janela e cole no campo «Sua chave de IA»."]
      ]
    }
  };
  function KeyHelp({ onClose }) {
    const [tab, setTab] = useState("anthropic");
    const g = KEY_GUIDES[tab];
    useEffect(() => { const k = (e) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, []);
    const tb = (id) => ({ border: tab === id ? "2px solid var(--tool-accent)" : "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, padding: tab === id ? "6px 11px" : "7px 12px", fontSize: 12.5, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" });
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(20,20,28,.5)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={(e) => { e.stopPropagation(); onClose(); }}>
        <section role="dialog" aria-modal="true" aria-label="Como gerar a chave de IA" data-ac="keyhelp" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(600px, 96vw)", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: "16px 20px 18px", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
            <div><h2 style={{ margin: 0, fontSize: 17 }}>Como gerar a sua chave de IA</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>Só é preciso se você não tem o código de acesso do ClassAuthor. Escolha um dos dois serviços; não precisa dos dois.</p></div>
            <button type="button" aria-label="Fechar" onClick={onClose} style={{ ...tb(""), padding: "4px 10px", fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
          <div role="tablist" style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            <button type="button" role="tab" aria-selected={tab === "anthropic"} data-ac="kh-anthropic" onClick={() => setTab("anthropic")} style={tb("anthropic")}>{KEY_GUIDES.anthropic.name}</button>
            <button type="button" role="tab" aria-selected={tab === "openai"} data-ac="kh-openai" onClick={() => setTab("openai")} style={tb("openai")}>{KEY_GUIDES.openai.name}</button>
          </div>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {g.steps.map(([t, d], i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ flex: "0 0 26px", height: 26, borderRadius: 13, background: "var(--tool-accent)", color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
                <div><div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div><div style={{ fontSize: 12.5, color: "var(--tool-ink-2)", lineHeight: 1.5 }}>{d}</div></div>
              </li>
            ))}
          </ol>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ background: "var(--tool-accent)", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 650, textDecoration: "none" }}>Abrir a página de chaves ↗</a>
            <a href={g.billing} target="_blank" rel="noopener noreferrer" style={{ border: "1px solid var(--tool-line-2)", color: "inherit", borderRadius: 8, padding: "7px 13px", fontSize: 13, fontWeight: 650, textDecoration: "none" }}>Abrir a página de créditos ↗</a>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>Segurança: a chave é como uma senha. Não a envie por e-mail nem a publique. Aqui ela fica só neste navegador e vai direto ao ClassAuthor a cada geração. Os menus desses sites mudam de vez em quando; se um nome não bater, procure por «API keys».</p>
        </section>
      </div>
    );
  }

  function AccessBox() {
    const { base, code, remember, aiKey, setBase, setCode, setRemember, setAiKey } = useAccess();
    const [help, setHelp] = useState(false);
    const [open] = useState(() => !(accessStore.get().code || accessStore.get().aiKey));
    const inp = { width: "100%", boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--tool-line-2)", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", background: "#fff" };
    const lab = { display: "block", fontSize: 11.5, fontWeight: 600, margin: "0 0 3px" };
    return (
      <details data-ac="box" open={open} style={{ margin: "8px 0 10px", padding: "10px 12px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)" }}>
        <summary style={{ fontSize: 12, fontWeight: 650, cursor: "pointer" }}>Acesso ao ClassAuthor{(code || aiKey) ? " ✓" : ""}</summary>
        <p style={{ fontSize: 11.5, margin: "6px 0 8px", color: "var(--tool-ink-3)", lineHeight: 1.45 }}>Preencha uma vez: vale para buscar legendas, gerar o resumo com IA e criar figuras com IA. Buscar legendas não usa IA e não tem custo; o resumo e as figuras têm.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div><label style={lab}>Código de acesso do ClassAuthor</label><input type="password" data-ac="code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck="false" style={inp} /></div>
          <div><label style={lab}>Sem o código? Sua chave de IA (o custo é da sua conta)</label><input type="password" data-ac="key" value={aiKey} onChange={(e) => setAiKey(e.target.value)} autoComplete="off" spellCheck="false" placeholder="Opcional (sk-ant-… ou sk-…)" style={inp} />
            <button type="button" data-ac="keyhelp-open" onClick={() => setHelp(true)} style={{ marginTop: 5, border: 0, background: "none", padding: 0, color: "var(--tool-accent)", fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Como gerar a chave de IA? (passo a passo)</button>
            {help && <KeyHelp onClose={() => setHelp(false)} />}</div>
          <label style={{ display: "flex", gap: 7, fontSize: 11.5, color: "var(--tool-ink-3)" }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Lembrar o código neste navegador</label>
          <div><label style={lab}>Endereço do ClassAuthor</label><input data-ac="base" value={base} onChange={(e) => setBase(e.target.value)} autoComplete="off" spellCheck="false" style={inp} /></div>
        </div>
      </details>
    );
  }

  // ── Resumo do vídeo: colar (Markdown simples) ou gerar com IA a partir da legenda ──
  async function askSummary({ base, code, aiKey, cues, text }) {
    const url = String(base || DEFAULT_BASE).trim().replace(/\/+$/, "") + "/api/video-summary";
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 120000);
    let res;
    try {
      res = await fetch(url, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", ...(code ? { "x-aula-access-code": code } : {}), ...keyHeaders(aiKey) }, body: JSON.stringify({ action: "videosummary", cues, text, language: "pt" }) });
    } catch (e) {
      throw new Error(e && e.name === "AbortError" ? "A IA demorou demais. Tente de novo." : "Não consegui falar com o ClassAuthor em " + url.replace(/\/api\/video-summary$/, "") + ". Confira o endereço e a conexão.");
    } finally { clearTimeout(timer); }
    let data = null; try { data = await res.json(); } catch (e) { /* sem JSON */ }
    if (!res.ok || !data || !data.ok) {
      if (res.status === 401) throw new Error("O código de acesso do ClassAuthor não foi aceito. Sem o código? Cole a sua chave de IA em «Acesso ao ClassAuthor».");
      if (res.status === 404) throw new Error("O ClassAuthor em uso ainda não tem o resumo de vídeo. Ele precisa estar na versão 1.13.0 ou mais nova.");
      throw new Error((data && data.error) || "O ClassAuthor respondeu com erro " + res.status + ".");
    }
    return data;
  }

  function SummaryBox({ value, cues, transcript, onChange }) {
    const { base, code, aiKey } = useAccess();
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [note, setNote] = useState("");
    const [confirm, setConfirm] = useState(false);
    const hasCues = Array.isArray(cues) && cues.length > 0;
    const text = String(transcript || "");
    const canAsk = hasCues || text.trim().length >= 400;
    const parsed = window.parseSummary ? window.parseSummary(value) : [];
    const topics = parsed.filter((i) => i.k === "p").length, timed = parsed.filter((i) => i.k === "p" && i.s !== null).length;
    const inp = { width: "100%", boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--tool-line-2)", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", background: "#fff" };
    const btn = { padding: "7px 12px", border: "1px solid var(--tool-accent)", borderRadius: 7, background: "#fff", color: "var(--tool-accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
    const go = async () => {
      setErr(""); setNote("");
      if (String(value || "").trim() && !confirm) { setConfirm(true); return; }
      setConfirm(false); setBusy(true);
      try {
        const r = await askSummary({ base, code: code.trim(), aiKey, cues: hasCues ? cues : undefined, text: hasCues ? undefined : text });
        accessStore.persist();
        onChange(window.summaryToMd ? window.summaryToMd(r.items) : "");
        const n = (r.items || []).filter((i) => i.k === "p").length;
        setNote("Resumo gerado por IA: " + n + " tópicos" + (r.parts > 1 ? " (vídeo longo, feito em " + r.parts + " partes)" : "") + ". Leia e confira o texto e os tempos antes de publicar: a IA pode errar.");
      } catch (e) { setErr(e.message); }
      finally { setBusy(false); }
    };
    return (
      <div data-sm="box" style={{ margin: "8px 0 10px", padding: "10px 12px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, margin: "0 0 4px" }}>Resumo do vídeo (tópicos com tempo)</div>
        <p style={{ fontSize: 11.5, margin: "0 0 8px", color: "var(--tool-ink-3)", lineHeight: 1.45 }}>Aparece na aula, abaixo do vídeo, antes da transcrição. Clicar no tempo leva o vídeo àquele trecho. Cole um resumo (por exemplo o do Video Highlight) ou gere com IA a partir da legenda carregada.</p>
        <textarea data-sm="text" value={value || ""} onChange={(e) => { setConfirm(false); onChange(e.target.value); }} rows={8} spellCheck="false" placeholder={"# Título da seção\n- [0:39] Primeiro tópico\n- [2:07] Segundo tópico\n## Subseção\n- [5:48] Outro tópico"} style={{ ...inp, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, lineHeight: 1.5, resize: "vertical" }} />
        {topics > 0 && <p role="status" data-sm="state" style={{ fontSize: 12, margin: "6px 0 0", color: "var(--tool-ink-2)" }}>{topics} tópicos, {timed} com tempo.{timed === 0 ? " Sem tempo, o aluno lê o resumo, mas não pula no vídeo." : ""}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" data-sm="go" onClick={go} disabled={busy || !canAsk} title={canAsk ? "" : "Carregue um arquivo de legenda (ou cole uma transcrição de 400 caracteres ou mais) primeiro."} style={{ ...btn, background: confirm ? "var(--tool-accent)" : "#fff", color: confirm ? "#fff" : "var(--tool-accent)", opacity: busy || !canAsk ? 0.55 : 1 }}>{busy ? "Gerando… (pode levar 1 a 2 minutos)" : confirm ? "Clique de novo para substituir o resumo" : "Gerar resumo com IA"}</button>
          {String(value || "").trim() && <button type="button" data-sm="clear" onClick={() => { onChange(""); setNote("Resumo removido."); setConfirm(false); }} style={{ ...btn, color: "#8a2f18", borderColor: "#d9b3a8" }}>Remover resumo</button>}
        </div>
        {!canAsk && <p style={{ fontSize: 11.5, margin: "6px 0 0", color: "var(--tool-ink-3)", lineHeight: 1.45 }}>Para gerar com IA, carregue antes o arquivo de legenda (assim o resumo sai com tempos) ou preencha a transcrição.</p>}
        {note && <p role="status" data-sm="note" style={{ fontSize: 12, margin: "8px 0 0", color: "var(--tool-ink-2)", lineHeight: 1.45 }}>{note}</p>}
        {err && <p role="alert" data-sm="err" style={{ fontSize: 12, margin: "8px 0 0", padding: "8px 10px", borderRadius: 8, background: "#fdecea", color: "#8a2f18", lineHeight: 1.45 }}>{err}</p>}
      </div>
    );
  }

  // ── Legenda sincronizada: escolhe um arquivo .srt/.vtt do computador ──
  function SubtitleFile({ cues, hasText, onLoad, onClear }) {
    const [err, setErr] = useState("");
    const [note, setNote] = useState("");
    const [pending, setPending] = useState(null);
    const inputRef = useRef(null);
    const count = Array.isArray(cues) ? cues.length : 0;
    const apply = (r) => { onLoad(r); setPending(null); setNote(r.cues.length + " falas (" + Math.floor(r.duration / 60) + " min) carregadas" + (r.fixed ? "; " + r.fixed + " com tempo fora de ordem foram reposicionadas" : "") + ". O texto também foi para o campo Transcrição."); };
    const read = (file) => {
      setErr(""); setNote("");
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { setErr("O arquivo passa de 5 MB. Confira se é mesmo uma legenda (.srt ou .vtt)."); return; }
      const reader = new FileReader();
      reader.onerror = () => setErr("Não consegui ler o arquivo.");
      reader.onload = () => {
        const r = window.parseSubtitles ? window.parseSubtitles(String(reader.result || "")) : { cues: [] };
        if (!r.cues.length) { setErr("Não encontrei falas nesse arquivo. Ele precisa ser uma legenda .srt ou .vtt (linhas como 00:00:05,000 --> 00:00:08,000)."); return; }
        if (hasText && !count) { setPending(r); return; }
        apply(r);
      };
      reader.readAsText(file, "utf-8");
    };
    const btn = { padding: "7px 12px", border: "1px solid var(--tool-accent)", borderRadius: 7, background: "#fff", color: "var(--tool-accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
    return (
      <div data-sf="box" style={{ margin: "8px 0 10px", padding: "10px 12px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, margin: "0 0 4px" }}>Legenda sincronizada (arquivo .srt ou .vtt)</div>
        <p style={{ fontSize: 11.5, margin: "0 0 8px", color: "var(--tool-ink-3)", lineHeight: 1.45 }}>A fala aparece sob o vídeo, em letras amarelas sobre fundo escuro, acompanhando o vídeo. A transcrição completa fica recolhida e o aluno pode clicar numa fala para ir até ela.</p>
        <input ref={inputRef} type="file" accept=".srt,.vtt,text/vtt,application/x-subrip,text/plain" data-sf="file" style={{ display: "none" }} onChange={(e) => { read(e.target.files && e.target.files[0]); e.target.value = ""; }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" data-sf="pick" style={btn} onClick={() => inputRef.current && inputRef.current.click()}>{count ? "Trocar arquivo de legenda" : "Escolher arquivo de legenda"}</button>
          {count > 0 && <button type="button" data-sf="clear" style={{ ...btn, color: "#8a2f18", borderColor: "#d9b3a8" }} onClick={() => { onClear(); setNote("Legenda sincronizada removida. O texto da transcrição continua no campo."); }}>Remover sincronia</button>}
        </div>
        {count > 0 && !note && <p role="status" data-sf="state" style={{ fontSize: 12, margin: "8px 0 0", color: "var(--tool-ink-2)" }}>Legenda sincronizada ativa: {count} falas.</p>}
        {pending && <div role="status" style={{ fontSize: 12, margin: "8px 0 0", lineHeight: 1.45 }}>Já há texto no campo Transcrição; ele será substituído pelo texto do arquivo. <button type="button" data-sf="confirm" style={{ ...btn, marginLeft: 6, padding: "4px 9px" }} onClick={() => apply(pending)}>Substituir</button> <button type="button" style={{ ...btn, padding: "4px 9px", color: "var(--tool-ink-3)", borderColor: "var(--tool-line)" }} onClick={() => setPending(null)}>Cancelar</button></div>}
        {note && <p role="status" data-sf="note" style={{ fontSize: 12, margin: "8px 0 0", color: "var(--tool-ink-2)", lineHeight: 1.45 }}>{note}</p>}
        {err && <p role="alert" data-sf="err" style={{ fontSize: 12, margin: "8px 0 0", padding: "8px 10px", borderRadius: 8, background: "#fdecea", color: "#8a2f18", lineHeight: 1.45 }}>{err}</p>}
      </div>
    );
  }
  // Acesso ao ClassAuthor para outros módulos (ex.: slides.jsx): endereço, código e chave própria.
  const aulaAccess = { get: () => accessStore.get(), persist: () => accessStore.persist(), keyHeaders, DEFAULT_BASE };
  Object.assign(window, { InsertImageDialog, CaptionsFetcher, askCaptions, SubtitleFile, SummaryBox, AccessBox, askSummary, aulaAccess });
})();
