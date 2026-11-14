// ClassAtelier — janela «Importar do Moodle» (colar HTML, conteúdo copiado ou texto; ou backup .mbz).
// A conversão fica em importar.js (window.Importador); aqui só a interface.
const IMP_LABELS = { prose: ["parágrafo", "parágrafos"], titulo: ["título", "títulos"], imagem: ["imagem", "imagens"], video: ["vídeo", "vídeos"], tabela: ["tabela", "tabelas"], citacao: ["citação", "citações"], codigo: ["código", "códigos"], accordion: ["accordion", "accordions"], equacao: ["equação", "equações"], externalembed: ["conteúdo incorporado", "conteúdos incorporados"], destaque: ["destaque", "destaques"], atencao: ["alerta", "alertas"], audio: ["áudio", "áudios"] };
const IMP_IMG = { importada: ["Importada", "#e3f1e0", "#2e6b2a"], referenciada: ["Só referenciada", "#e6eef7", "#2a5b8a"], reenviar: ["Precisa reenviar", "#fbe3dc", "#9a2f1b"] };

function ImportDialog({ hasLesson, onClose, onApply }) {
  const I = window.Importador;
  const [tab, setTab] = React.useState("html");
  const [step, setStep] = React.useState("input");           // input → pick (só .mbz) → review
  const [html, setHtml] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [err, setErr] = React.useState("");
  const [bk, setBk] = React.useState(null);                   // backup lido
  const [sel, setSel] = React.useState({});                   // itens do backup marcados
  const [prep, setPrep] = React.useState(null);               // { model, warnings, notes, stats, plain }
  const [excl, setExcl] = React.useState({});                 // blocos desmarcados na revisão
  const [, setTick] = React.useState(0);                      // força redesenho depois de trocar uma imagem
  const [dest, setDest] = React.useState("new");
  const [title, setTitle] = React.useState("");
  const [drag, setDrag] = React.useState(false);
  const fileRef = React.useRef(null);
  const swapRef = React.useRef(null);
  const swapTarget = React.useRef(null);

  React.useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", k, true);
    return () => document.removeEventListener("keydown", k, true);
  }, []);

  const fail = (e) => { setErr(String((e && e.message) || e)); setBusy(""); };
  const goReview = (p) => { setPrep(p); setExcl({}); setTitle(p.model.title || ""); setDest("new"); setStep("review"); setBusy(""); };

  const analyzeHtml = () => {
    setErr("");
    const text = html.trim();
    if (!text) { setErr("Cole o conteúdo da aula na caixa."); return; }
    let base = baseUrl.trim();
    if (base) {
      if (!/^https?:\/\//i.test(base)) base = "https://" + base;
      try { new URL(base); } catch (e) { setErr("A URL original não parece um endereço válido. Exemplo: https://moodle.suainstituicao.edu.br/mod/page/view.php?id=123"); return; }
    }
    if (/id=["']aula-lesson["']/.test(text)) { onApply({ embedded: text }); return; }
    try { goReview(I.htmlParaModelo(text, { baseUrl: base })); } catch (e) { fail(e); }
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

  // Colar conteúdo formatado: usa o HTML da área de transferência; sem ele, segue o texto simples.
  const onPasteHtml = (e) => {
    const h = e.clipboardData && e.clipboardData.getData("text/html");
    if (!h) return;
    e.preventDefault();
    const m = /<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/.exec(h);
    setHtml(m ? m[1] : h);
  };

  // Substituir arquivo: troca a imagem de um bloco pelo arquivo escolhido (reduz fotos grandes a 1600 px).
  const swapImage = (block, file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { setErr("Escolha um arquivo de imagem (JPG, PNG, WebP, GIF ou SVG)."); return; }
    setErr("");
    const r = new FileReader();
    r.onerror = () => setErr("Não consegui ler o arquivo.");
    r.onload = async () => {
      let url = String(r.result);
      if (/^image\/(png|jpe?g|webp)$/i.test(file.type)) url = await I.shrinkImage(url, file.type);
      block.props.src = url;
      block.props.origemArquivo = "";
      block._imp.img = "importada";
      block._imp.notes = block._imp.notes.filter((n) => !/vinculada ao curso|só referenciada|fórmula como imagem sem código/.test(n.msg));
      block._imp.status = block._imp.notes.some((n) => n.level === "pendente") ? "pendente" : block._imp.notes.some((n) => n.level === "revisar") ? "revisar" : "ok";
      setTick((t) => t + 1);
    };
    r.readAsDataURL(file);
  };

  const view = prep ? { w: I.avisos(prep.model, excl), stats: I.contar(prep.model, excl) } : null;
  const total = view ? Object.keys(view.stats).reduce((n, k) => n + view.stats[k], 0) : 0;
  const statsText = view ? Object.keys(view.stats).map((k) => { const l = IMP_LABELS[k] || [k, k]; return view.stats[k] + " " + (view.stats[k] === 1 ? l[0] : l[1]); }).join(", ") : "";

  const apply = () => {
    const model = Object.assign({}, I.filtrar(prep.model, excl), { title: title.trim() || prep.model.title });
    onApply({ model, dest, warnCount: view.w.warnings.length, total });
  };

  const items = prep ? prep.model.sections.reduce((all, s) => all.concat(s.items), []) : [];
  const allBlocks = items.reduce((a, it) => a.concat(it.children), []);
  const setAll = (on) => { const e = {}; if (!on) allBlocks.forEach((b) => { e[b.id] = true; }); setExcl(e); };

  const box = { background: "#fff", borderRadius: 14, width: "min(680px, 100%)", maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.28)", padding: 20, fontFamily: "inherit", color: "var(--tool-ink)" };
  const small = { fontSize: 12.5, color: "var(--tool-ink-3)", lineHeight: 1.45 };
  const btn = (primary) => ({ border: primary ? 0 : "1px solid var(--tool-line-2)", background: primary ? "var(--tool-accent)" : "#fff", color: primary ? "#fff" : "var(--tool-ink)", borderRadius: 9, padding: "9px 16px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" });
  const chip = (txt, bg, fg) => <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: bg, color: fg, whiteSpace: "nowrap" }}>{txt}</span>;
  const tabBtn = (id, label) => (
    <button key={id} role="tab" aria-selected={tab === id} data-imp-tab={id} onClick={() => { setTab(id); setErr(""); }} style={{ flex: 1, padding: "9px 10px", border: 0, borderBottom: "2px solid " + (tab === id ? "var(--tool-accent)" : "var(--tool-line)"), background: "transparent", fontWeight: tab === id ? 700 : 500, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", color: "var(--tool-ink)" }}>{label}</button>
  );

  const blockRow = (b) => {
    const r = I.resumo(b), im = b._imp, off = !!excl[b.id], img = b.type === "imagem" && im && im.img ? IMP_IMG[im.img] : null;
    return (
      <div key={b.id} data-imp-block={b.type} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: "1px solid var(--tool-line)", opacity: off ? 0.45 : 1 }}>
        <input type="checkbox" aria-label={"Importar: " + r.tipo + " " + r.texto} checked={!off} onChange={(e) => setExcl({ ...excl, [b.id]: !e.target.checked })} style={{ marginTop: 4 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
            <b style={{ fontSize: 11.5, letterSpacing: "0.03em", color: "var(--tool-ink-2)", textTransform: "uppercase" }}>{r.tipo}</b>
            {img ? chip(img[0], img[1], img[2]) : null}
            {im && !img && im.status === "pendente" ? chip("Pendente", "#fbe3dc", "#9a2f1b") : null}
            {im && !img && im.status === "revisar" ? chip("Revisar", "#fff1cc", "#7a5a00") : null}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: "1 1 120px" }}>{r.texto}</span>
          </div>
          {im && im.notes.length ? <ul style={{ margin: "3px 0 0", paddingLeft: 16, ...small, fontSize: 12 }}>{im.notes.map((n, i) => <li key={i}>{n.msg}</li>)}</ul> : null}
        </div>
        {b.type === "imagem" ? <button data-imp-swap onClick={() => { swapTarget.current = b; swapRef.current && swapRef.current.click(); }} style={{ ...btn(false), padding: "4px 10px", fontSize: 12, whiteSpace: "nowrap" }}>{b.props.src ? "Trocar arquivo" : "Substituir arquivo"}</button> : null}
      </div>
    );
  };

  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,18,14,0.38)", display: "grid", placeItems: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Importar do Moodle" data-import-dialog style={box}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Importar do Moodle</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "transparent", fontSize: 20, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </div>

        {step === "input" && (<>
          <p style={{ ...small, margin: "0 0 10px" }}>Traz uma aula do Moodle (uma <b>Página</b> ou um <b>capítulo de Livro</b>) para o ClassAtelier, já em blocos que você pode editar. A importação cria uma aula nova em rascunho; nada muda até você confirmar. A leitura acontece neste navegador.</p>
          <div role="tablist" style={{ display: "flex", marginBottom: 12 }}>{tabBtn("html", "Colar HTML ou conteúdo")}{tabBtn("mbz", "Backup do Moodle (.mbz)")}</div>

          {tab === "html" && (<>
            <p style={{ ...small, margin: "0 0 8px" }}><b>HTML original:</b> na Página ou no capítulo, clique em <b>Editar</b> e, no editor de texto, no botão <b>{"<>"}</b> (<i>Código-fonte</i>; se não aparecer, abra <i>«Mostrar mais botões»</i>). Copie tudo e cole aqui. <b>Conteúdo formatado:</b> também vale selecionar o corpo da aula na tela, copiar e colar (aproveito a formatação). Texto simples é aceito, mas vem sem imagens, tabelas e links.</p>
            <textarea data-imp-html value={html} onChange={(e) => setHtml(e.target.value)} onPaste={onPasteHtml} spellCheck={false} placeholder="Cole aqui o HTML ou o conteúdo da aula…" aria-label="Conteúdo da aula" style={{ width: "100%", minHeight: 170, boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 9, padding: 10, font: "12.5px ui-monospace, Menlo, monospace", resize: "vertical" }} />
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, margin: "12px 0 4px" }}>URL original da aula <span style={{ fontWeight: 400, color: "var(--tool-ink-3)" }}>(opcional)</span></label>
            <input data-imp-url value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://moodle.suainstituicao.edu.br/mod/page/view.php?id=123" spellCheck={false} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13 }} />
            <p style={{ ...small, margin: "6px 0 0" }}>Serve para completar links e referências a arquivos que vêm sem o endereço inteiro e para registrar de onde a aula veio. Imagens e vídeos guardados no Moodle só abrem para quem está logado lá: eles aparecem na revisão como <b>«precisa reenviar»</b>. Para trazê-los de uma vez, use o backup.</p>
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

        {step === "review" && prep && view && (<>
          <p style={{ margin: "0 0 4px", fontSize: 14 }}><b>{total} {total === 1 ? "bloco" : "blocos"}</b> selecionados{statsText ? ": " + statsText + "." : "."}</p>
          {prep.plain && <p data-imp-plain style={{ ...small, margin: "6px 0", padding: "8px 10px", background: "#fff6e0", border: "1px solid #f0d58a", borderRadius: 8, color: "var(--tool-ink)" }}><b>A colagem trouxe só texto.</b> Não há formatação, imagens, tabelas nem links: tudo virou parágrafos e listas simples. Para trazer o resto, cole o HTML original ou use o backup.</p>}
          {view.w.warnings.length > 0 && (
            <div data-imp-warnings style={{ margin: "10px 0", padding: "10px 12px", background: "#fff6e0", border: "1px solid #f0d58a", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Precisa de você ({view.w.warnings.length})</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.5, maxHeight: 130, overflow: "auto" }}>{view.w.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {view.w.notes.length > 0 && <details style={{ ...small, margin: "6px 0" }}><summary style={{ cursor: "pointer" }}>Ajustes automáticos ({view.w.notes.length})</summary><ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{view.w.notes.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
          {total === 0 && allBlocks.length === 0 && <p style={{ ...small, margin: "6px 0", color: "#9a2f1b" }}>Não encontrei conteúdo para importar. Confira se colou o conteúdo da aula (e não só o endereço dela).</p>}

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, margin: "12px 0 4px" }}>Título da aula</label>
          <input data-imp-title value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13.5 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "14px 0 4px" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Blocos, na ordem da origem</span>
            <span style={{ ...small }}><button onClick={() => setAll(true)} style={{ border: 0, background: "none", color: "var(--tool-accent)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>marcar todos</button> · <button onClick={() => setAll(false)} style={{ border: 0, background: "none", color: "var(--tool-accent)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>desmarcar todos</button></span>
          </div>
          <div data-imp-blocks style={{ maxHeight: "34vh", overflow: "auto", border: "1px solid var(--tool-line)", borderRadius: 10, padding: "0 12px" }}>
            {prep.model.sections.map((s, si) => s.items.map((it, ii) => (
              <div key={si + "-" + ii}>
                {items.length > 1 && it.title ? <div style={{ fontWeight: 700, fontSize: 13, padding: "8px 0 2px", borderTop: si + ii ? "2px solid var(--tool-line)" : 0 }}>{(s.name ? s.name + " · " : "") + it.title}</div> : null}
                {it.children.map(blockRow)}
              </div>
            )))}
          </div>
          <input ref={swapRef} data-imp-swapfile type="file" accept="image/*" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (swapTarget.current) swapImage(swapTarget.current, f); }} style={{ display: "none" }} />

          <div role="radiogroup" aria-label="Onde colocar" style={{ display: "grid", gap: 8, margin: "14px 0 0" }}>
            {[["new", "Em uma aula nova (rascunho)", hasLesson ? "A aula que está aberta vai para a Biblioteca." : "Começa com uma abertura (Hero) com o título."], ["append", "No fim da aula aberta", "Os blocos entram depois do conteúdo atual (antes da síntese e das referências)."]].map(([v, l, s]) => {
              const off = v === "append" && !hasLesson;
              return (
                <label key={v} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 12px", border: "1px solid " + (dest === v ? "var(--tool-accent)" : "var(--tool-line)"), background: dest === v ? "var(--tool-accent-soft, #fdf1ec)" : "#fff", borderRadius: 9, cursor: off ? "default" : "pointer", opacity: off ? 0.45 : 1 }}>
                  <input type="radio" name="ca-imp-dest" disabled={off} checked={dest === v} onChange={() => setDest(v)} style={{ marginTop: 3 }} />
                  <span><span style={{ fontWeight: 600, fontSize: 13.5 }}>{l}</span><span style={{ display: "block", ...small, marginTop: 2 }}>{s}</span></span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 16 }}>
            <button onClick={() => { setPrep(null); setStep(bk ? "pick" : "input"); }} style={btn(false)}>Voltar</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button data-imp-cancel onClick={onClose} style={btn(false)}>Cancelar</button>
              <button data-imp-apply onClick={apply} disabled={total === 0} style={{ ...btn(true), opacity: total === 0 ? 0.45 : 1 }}>Importar</button>
            </div>
          </div>
        </>)}

        {err ? <p role="alert" data-imp-error style={{ margin: "12px 0 0", fontSize: 13, color: "#9a2f1b", background: "#fdecea", borderRadius: 8, padding: "8px 10px" }}>{err}</p> : null}
      </div>
    </div>
  );
}
Object.assign(window, { ImportDialog });
