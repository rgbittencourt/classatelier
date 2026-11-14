// ClassAtelier — janela «Importar do Moodle» (colar HTML ou subir um backup .mbz).
// A conversão fica em importar.js (window.Importador); aqui só a interface.
const IMP_LABELS = { prose: ["parágrafo", "parágrafos"], titulo: ["título", "títulos"], imagem: ["imagem", "imagens"], video: ["vídeo", "vídeos"], tabela: ["tabela", "tabelas"], citacao: ["citação", "citações"], codigo: ["código", "códigos"], accordion: ["accordion", "accordions"], equacao: ["equação", "equações"], externalembed: ["conteúdo incorporado", "conteúdos incorporados"], destaque: ["destaque", "destaques"], atencao: ["alerta", "alertas"], audio: ["áudio", "áudios"] };

function ImportDialog({ hasLesson, onClose, onApply }) {
  const I = window.Importador;
  const [tab, setTab] = React.useState("html");
  const [step, setStep] = React.useState("input");           // input → pick (só .mbz) → review
  const [html, setHtml] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [err, setErr] = React.useState("");
  const [bk, setBk] = React.useState(null);                   // backup lido
  const [sel, setSel] = React.useState({});                   // itens marcados
  const [prep, setPrep] = React.useState(null);               // { model, warnings, notes, stats } ou { embedded }
  const [dest, setDest] = React.useState("new");
  const [title, setTitle] = React.useState("");
  const [drag, setDrag] = React.useState(false);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", k, true);
    return () => document.removeEventListener("keydown", k, true);
  }, []);

  const fail = (e) => { setErr(String((e && e.message) || e)); setBusy(""); };
  const goReview = (p) => { setPrep(p); setTitle(p.embedded ? "" : p.model.title || ""); setDest(hasLesson && !p.embedded ? "new" : "new"); setStep("review"); setBusy(""); };

  const analyzeHtml = () => {
    setErr("");
    const text = html.trim();
    if (!text) { setErr("Cole o HTML da aula na caixa."); return; }
    if (/id=["']aula-lesson["']/.test(text)) { goReview({ embedded: text, stats: {}, warnings: [], notes: [] }); return; }
    try { goReview(I.htmlParaModelo(text)); } catch (e) { fail(e); }
  };

  const readFile = async (f) => {
    if (!f) return;
    setErr(""); setBusy("Lendo o backup…");
    try {
      const buf = await f.arrayBuffer();
      const b = await I.lerBackup(buf, { shrink: I.shrinkImage });
      const keys = {};
      b.sections.forEach((s) => s.items.forEach((it) => { if (it.supported) keys[it.key] = true; }));
      setBk(b); setSel(keys); setStep("pick"); setBusy("");
    } catch (e) { fail(e); }
  };

  const analyzeBackup = async () => {
    setErr(""); setBusy("Convertendo…");
    try {
      const keys = Object.keys(sel).filter((k) => sel[k]);
      if (!keys.length) throw new Error("Marque pelo menos um item para importar.");
      goReview(await I.itensParaModelo(bk, keys, {}));
    } catch (e) { fail(e); }
  };

  const onPasteHtml = (e) => {
    const h = e.clipboardData && e.clipboardData.getData("text/html");
    if (!h) return;                        // texto puro (código-fonte colado): segue o fluxo normal
    e.preventDefault();
    const m = /<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/.exec(h);
    setHtml(m ? m[1] : h);
  };

  const apply = () => {
    if (prep.embedded) { onApply({ embedded: prep.embedded }); return; }
    const model = Object.assign({}, prep.model, { title: title.trim() || prep.model.title });
    onApply({ model, dest, warnCount: prep.warnings.length, total });
  };

  const total = prep && prep.stats ? Object.keys(prep.stats).reduce((n, k) => n + prep.stats[k], 0) : 0;
  const statsText = prep && prep.stats ? Object.keys(prep.stats).map((k) => { const l = IMP_LABELS[k] || [k, k]; return prep.stats[k] + " " + (prep.stats[k] === 1 ? l[0] : l[1]); }).join(", ") : "";

  const box = { background: "#fff", borderRadius: 14, width: "min(620px, 100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.28)", padding: 20, fontFamily: "inherit", color: "var(--tool-ink)" };
  const small = { fontSize: 12.5, color: "var(--tool-ink-3)", lineHeight: 1.45 };
  const btn = (primary) => ({ border: primary ? 0 : "1px solid var(--tool-line-2)", background: primary ? "var(--tool-accent)" : "#fff", color: primary ? "#fff" : "var(--tool-ink)", borderRadius: 9, padding: "9px 16px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" });
  const tabBtn = (id, label) => (
    <button key={id} role="tab" aria-selected={tab === id} data-imp-tab={id} onClick={() => { setTab(id); setErr(""); }} style={{ flex: 1, padding: "9px 10px", border: 0, borderBottom: "2px solid " + (tab === id ? "var(--tool-accent)" : "var(--tool-line)"), background: "transparent", fontWeight: tab === id ? 700 : 500, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", color: "var(--tool-ink)" }}>{label}</button>
  );

  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,18,14,0.38)", display: "grid", placeItems: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Importar do Moodle" data-import-dialog style={box}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Importar do Moodle</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "transparent", fontSize: 20, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </div>

        {step === "input" && (<>
          <p style={{ ...small, margin: "0 0 10px" }}>Traz uma aula pronta do Moodle para o ClassAtelier, já em blocos que você pode editar. Nada é enviado a servidor: a leitura acontece neste navegador.</p>
          <div role="tablist" style={{ display: "flex", marginBottom: 12 }}>{tabBtn("html", "Colar HTML")}{tabBtn("mbz", "Backup do Moodle (.mbz)")}</div>

          {tab === "html" && (<>
            <p style={{ ...small, margin: "0 0 8px" }}>No editor do Moodle, clique no botão de código-fonte (<b>{"<>"}</b>), copie tudo e cole aqui. Também vale copiar o texto direto da página da aula.</p>
            <textarea data-imp-html value={html} onChange={(e) => setHtml(e.target.value)} onPaste={onPasteHtml} spellCheck={false} placeholder="Cole aqui o HTML da aula…" aria-label="HTML da aula" style={{ width: "100%", minHeight: 190, boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 9, padding: 10, font: "12.5px ui-monospace, Menlo, monospace", resize: "vertical" }} />
            <p style={{ ...small, margin: "8px 0 0" }}>Imagens e vídeos que estão <b>guardados no Moodle</b> não vêm por esse caminho (só funcionam logado lá). Os blocos de imagem são criados vazios, para você enviar o arquivo. Vídeos do YouTube vêm normalmente. Para trazer tudo, use o backup.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={onClose} style={btn(false)}>Cancelar</button>
              <button data-imp-analyze onClick={analyzeHtml} style={btn(true)}>Analisar</button>
            </div>
          </>)}

          {tab === "mbz" && (<>
            <p style={{ ...small, margin: "0 0 8px" }}>No Moodle, abra a atividade (ou o curso), escolha <b>Backup</b> e baixe o arquivo <b>.mbz</b>. Ele traz o texto e também as imagens.</p>
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
              style={{ border: "2px dashed " + (drag ? "var(--tool-accent)" : "var(--tool-line-2)"), borderRadius: 12, padding: "28px 16px", textAlign: "center", background: drag ? "var(--tool-accent-soft, #fdf1ec)" : "var(--tool-bg-2, #faf7f0)" }}>
              <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>{busy || "Arraste o arquivo .mbz até aqui"}</p>
              <button data-imp-choose onClick={() => fileRef.current && fileRef.current.click()} disabled={!!busy} style={btn(true)}>Escolher arquivo…</button>
              <input ref={fileRef} data-imp-file type="file" accept=".mbz,.zip,.gz,.tgz,application/zip" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; readFile(f); }} style={{ display: "none" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><button onClick={onClose} style={btn(false)}>Cancelar</button></div>
          </>)}
        </>)}

        {step === "pick" && bk && (<>
          <p style={{ ...small, margin: "0 0 10px" }}>Backup de <b>{bk.title}</b>. Marque o que quer trazer. Itens em cinza são de tipos que ainda não são importados.</p>
          <div data-imp-list style={{ maxHeight: "46vh", overflow: "auto", border: "1px solid var(--tool-line)", borderRadius: 10, padding: "4px 12px" }}>
            {bk.sections.map((s, si) => (
              <div key={si} style={{ padding: "8px 0", borderTop: si ? "1px solid var(--tool-line)" : 0 }}>
                {s.name ? <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.name}</div> : null}
                {s.items.map((it) => (
                  <label key={it.key} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "3px 0", fontSize: 13.5, opacity: it.supported ? 1 : 0.5, cursor: it.supported ? "pointer" : "default" }}>
                    <input type="checkbox" disabled={!it.supported} checked={!!sel[it.key]} onChange={(e) => setSel({ ...sel, [it.key]: e.target.checked })} />
                    <span>{it.title}{!it.supported ? <span style={{ ...small, marginLeft: 6 }}>({it.reason})</span> : null}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 14 }}>
            <button onClick={() => { setStep("input"); setBk(null); }} style={btn(false)}>Voltar</button>
            <button data-imp-analyze onClick={analyzeBackup} disabled={!!busy} style={btn(true)}>{busy || "Continuar"}</button>
          </div>
        </>)}

        {step === "review" && prep && (<>
          {prep.embedded ? (
            <p style={{ ...small, margin: "0 0 12px" }}>Este HTML é de uma aula exportada pelo próprio ClassAtelier. Ela volta inteira, com todos os blocos e configurações, e abre como uma aula nova.</p>
          ) : (<>
            <p style={{ margin: "0 0 4px", fontSize: 14 }}><b>{total} {total === 1 ? "bloco" : "blocos"}</b> prontos para importar{statsText ? ": " + statsText + "." : "."}</p>
            {total === 0 && <p style={{ ...small, margin: "6px 0", color: "#9a2f1b" }}>Não encontrei conteúdo para importar. Confira se colou o HTML da aula (e não só o endereço dela).</p>}
            {prep.warnings.length > 0 && (
              <div data-imp-warnings style={{ margin: "10px 0", padding: "10px 12px", background: "#fff6e0", border: "1px solid #f0d58a", borderRadius: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Ficou de fora ou precisa de você ({prep.warnings.length})</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.5, maxHeight: 150, overflow: "auto" }}>{prep.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            {prep.notes && prep.notes.length > 0 && <p style={{ ...small, margin: "6px 0" }}>Ajustes automáticos: {prep.notes.join("; ")}.</p>}
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, margin: "12px 0 4px" }}>Título da aula</label>
            <input data-imp-title value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13.5 }} />
            <div role="radiogroup" aria-label="Onde colocar" style={{ display: "grid", gap: 8, margin: "14px 0 0" }}>
              {[["new", "Em uma aula nova", hasLesson ? "A aula que está aberta vai para a Biblioteca." : "Começa com uma abertura (Hero) com o título."], ["append", "No fim da aula aberta", "Os blocos entram depois do conteúdo atual (antes da síntese e das referências)."]].map(([v, l, s]) => {
                const off = v === "append" && !hasLesson;
                return (
                  <label key={v} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 12px", border: "1px solid " + (dest === v ? "var(--tool-accent)" : "var(--tool-line)"), background: dest === v ? "var(--tool-accent-soft, #fdf1ec)" : "#fff", borderRadius: 9, cursor: off ? "default" : "pointer", opacity: off ? 0.45 : 1 }}>
                    <input type="radio" name="ca-imp-dest" disabled={off} checked={dest === v} onChange={() => setDest(v)} style={{ marginTop: 3 }} />
                    <span><span style={{ fontWeight: 600, fontSize: 13.5 }}>{l}</span><span style={{ display: "block", ...small, marginTop: 2 }}>{s}</span></span>
                  </label>
                );
              })}
            </div>
          </>)}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 16 }}>
            <button onClick={() => { setPrep(null); setStep(bk ? "pick" : "input"); }} style={btn(false)}>Voltar</button>
            <button data-imp-apply onClick={apply} disabled={!prep.embedded && total === 0} style={{ ...btn(true), opacity: !prep.embedded && total === 0 ? 0.45 : 1 }}>Importar</button>
          </div>
        </>)}

        {err ? <p role="alert" data-imp-error style={{ margin: "12px 0 0", fontSize: 13, color: "#9a2f1b", background: "#fdecea", borderRadius: 8, padding: "8px 10px" }}>{err}</p> : null}
      </div>
    </div>
  );
}
Object.assign(window, { ImportDialog });
