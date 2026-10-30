/* eslint-disable */
// ClassAtelier — «Inserir imagem no cursor» (painel do Parágrafo).
//
// Janela com duas abas: escolher um arquivo de imagem ou pedir à IA que crie a figura na hora.
// A IA é a do ClassAuthor (o editor não guarda chave de IA): o pedido vai para
// {endereço do ClassAuthor}/api/figure com o código de acesso e volta um diagrama/ilustração
// em SVG, sempre rotulado "Ilustração criada por IA". Quem insere no texto é o app.jsx.
(function () {
  const { useState, useRef, useEffect } = React;
  const LS_BASE = "classatelier.ai.base", LS_CODE = "classatelier.ai.code";
  const DEFAULT_BASE = "https://classauthor.vercel.app";
  const MAX_SIDE = 1600;

  const safeGet = (store, key) => { try { return window[store].getItem(key) || ""; } catch (e) { return ""; } };
  const safeSet = (store, key, value) => { try { if (value) window[store].setItem(key, value); else window[store].removeItem(key); } catch (e) { /* sem armazenamento */ } };

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

  async function askFigure({ base, code, prompt, context, title }) {
    const url = String(base || DEFAULT_BASE).trim().replace(/\/+$/, "") + "/api/figure";
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 170000);
    let res;
    try {
      res = await fetch(url, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", ...(code ? { "x-aula-access-code": code } : {}) }, body: JSON.stringify({ action: "figure", prompt, context, title }) });
    } catch (e) {
      throw new Error(e && e.name === "AbortError" ? "A IA demorou demais. Tente de novo, com uma descrição mais simples." : "Não consegui falar com o ClassAuthor em " + url.replace(/\/api\/figure$/, "") + ". Confira o endereço e a conexão (e se esta versão do ClassAuthor já tem a criação de figuras).");
    } finally { clearTimeout(timer); }
    let data = null; try { data = await res.json(); } catch (e) { /* resposta sem JSON */ }
    if (!res.ok || !data || !data.ok) {
      if (res.status === 401) throw new Error("O código de acesso do ClassAuthor não foi aceito. É o mesmo que você digita na entrada do ClassAuthor.");
      if (res.status === 503) throw new Error("O ClassAuthor está sem chave de IA configurada. " + ((data && data.error) || ""));
      throw new Error((data && data.error) || "O ClassAuthor respondeu com erro " + res.status + ".");
    }
    return data;
  }

  function InsertImageDialog({ title, context, onInsert, onClose }) {
    const [tab, setTab] = useState("arquivo");
    const [img, setImg] = useState(null); // { src, alt, caption, credit, ai }
    const [decor, setDecor] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [base, setBase] = useState(safeGet("localStorage", LS_BASE) || DEFAULT_BASE);
    const [code, setCode] = useState(safeGet("localStorage", LS_CODE) || safeGet("sessionStorage", LS_CODE));
    const [remember, setRemember] = useState(!!safeGet("localStorage", LS_CODE));
    const [busy, setBusy] = useState("");
    const [err, setErr] = useState("");
    const fileRef = useRef(null);
    useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

    const set = (k, v) => setImg((x) => ({ ...x, [k]: v }));
    const pick = async (file) => {
      setErr("");
      try { const src = await readImage(file); setImg({ src, alt: "", caption: "", credit: "", ai: false }); }
      catch (e) { setErr(e.message); }
    };
    const create = async () => {
      setErr("");
      if (String(prompt).trim().length < 4) { setErr("Descreva o que a imagem deve mostrar (uma ideia por figura)."); return; }
      setBusy("Criando a figura… leva de 20 a 60 segundos.");
      try {
        const r = await askFigure({ base, code: code.trim(), prompt: prompt.trim(), context, title });
        safeSet("localStorage", LS_BASE, base.trim() === DEFAULT_BASE ? "" : base.trim());
        safeSet("sessionStorage", LS_CODE, code.trim()); safeSet("localStorage", LS_CODE, remember ? code.trim() : "");
        setImg({ src: r.src, alt: r.alt || "", caption: r.caption || "", credit: r.credit || "", ai: true });
      } catch (e) { setErr(e.message); }
      finally { setBusy(""); }
    };
    const ready = img && img.src && (decor || String(img.alt || "").trim());
    const insert = () => { if (ready) onInsert({ src: img.src, alt: decor ? "" : img.alt.trim(), decorative: decor, caption: img.caption || "", credit: img.credit || "" }); };

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
  Object.assign(window, { InsertImageDialog });
})();
