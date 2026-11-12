/* eslint-disable */
// ClassAtelier — botão «Slides»: gera uma apresentação profissional a partir da aula aberta.
//
// A aula é dividida em seções (slides-render.js). Para cada seção, o ClassAuthor (/api/slides,
// com o mesmo endereço e código de acesso das figuras) devolve o conteúdo dos slides dentro de
// um catálogo fechado de tipos; a moldura (pergunta, objetivos, síntese) vem numa chamada à parte.
// O desenho fica todo aqui: a pessoa escolhe só a paleta. Trocar a paleta depois não gasta IA.
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const CS = window.ClassSlides;
  const LS_PAL = "classatelier.slides.palette";
  const LS_SIZE = "classatelier.slides.size";
  const LS_CUSTOM = "classatelier.slides.custom";
  const safeGet = (k) => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };

  async function askSlides(body) {
    const A = window.aulaAccess ? window.aulaAccess.get() : {};
    const base = String(A.base || "https://classauthor.vercel.app").trim().replace(/\/+$/, "");
    const url = base + "/api/slides";
    const code = String(A.code || "").trim();
    const headers = { "Content-Type": "application/json", ...(code ? { "x-aula-access-code": code } : {}), ...(window.aulaAccess ? window.aulaAccess.keyHeaders(A.aiKey) : {}) };
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 240000);
    let res;
    try { res = await fetch(url, { method: "POST", signal: ctl.signal, headers, body: JSON.stringify({ action: "slides", ...body }) }); }
    catch (e) { const err = new Error(e && e.name === "AbortError" ? "A IA demorou demais nesta parte." : "Não consegui falar com o ClassAuthor em " + base + ". Confira o endereço, a conexão e se essa versão do ClassAuthor já tem os slides (1.17.0 ou mais nova)."); err.retry = true; throw err; }
    finally { clearTimeout(timer); }
    let data = null; try { data = await res.json(); } catch (e) { /* sem JSON */ }
    if (!res.ok || !data || !data.ok) {
      const err = new Error(res.status === 401 ? "O código de acesso do ClassAuthor não foi aceito. Sem o código? Cole a sua chave de IA em «Acesso ao ClassAuthor»." : res.status === 404 ? "Esta versão do ClassAuthor ainda não tem a geração de slides." : (data && data.error) || "O ClassAuthor respondeu com erro " + res.status + ".");
      err.retry = res.status >= 500 || res.status === 429 || Boolean(data && data.retryable);
      err.fatal = res.status === 401 || res.status === 404 || res.status === 503;
      throw err;
    }
    return data;
  }
  async function withRetry(fn) { try { return await fn(); } catch (e) { if (e.fatal || !e.retry) throw e; await new Promise((r) => setTimeout(r, 1500)); return fn(); } }
  async function pool(items, limit, worker) {
    let next = 0; const run = async () => { while (next < items.length) { const k = next++; await worker(items[k], k); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  }
  const fileBase = (lesson) => (window.projectFileName ? window.projectFileName(lesson) : "aula-ClassAtelier.json").replace(/-ClassAtelier\.json$/, "");

  function PaletteCard({ p, on, onPick }) {
    const sw = [p.dark, p.accent, p.second, p.bg, p.accentLight];
    return (
      <button type="button" role="radio" aria-checked={on} data-sl={"pal-" + p.id} onClick={() => onPick(p.id)} style={{ minWidth: 0, textAlign: "left", cursor: "pointer", border: on ? "2px solid var(--tool-accent)" : "1px solid var(--tool-line-2)", borderRadius: 10, padding: on ? 9 : 10, background: "#fff", fontFamily: "inherit" }}>
        <div style={{ height: 46, borderRadius: 6, background: p.dark, position: "relative", overflow: "hidden", marginBottom: 8 }}>
          <div style={{ position: "absolute", left: 10, top: 10, width: 44, height: 5, borderRadius: 3, background: p.accentLight }} />
          <div style={{ position: "absolute", left: 10, top: 22, width: 92, height: 9, borderRadius: 3, background: "#F7F5F0" }} />
          <div style={{ position: "absolute", left: 10, bottom: 10, right: 10, height: 12, borderRadius: 3, background: p.bg }} />
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>{sw.map((c, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: "1px solid rgba(0,0,0,.08)" }} />)}</div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--tool-ink-3)", lineHeight: 1.35 }}>{p.hint}</div>
      </button>
    );
  }

  function SlidesDialog({ lesson, onClose }) {
    const plan = useMemo(() => CS.planLesson(lesson, window.lessonToText), [lesson]);
    const [pal, setPal] = useState(() => CS.paletteById(safeGet(LS_PAL)).id);
    const [size, setSize] = useState(() => safeGet(LS_SIZE) || "auto");
    const [custom, setCustom] = useState(() => Number(safeGet(LS_CUSTOM)) || 20);
    const [busy, setBusy] = useState(false);
    const [steps, setSteps] = useState([]); // { label, state: "wait"|"run"|"ok"|"warn" }
    const [err, setErr] = useState("");
    const [deck, setDeck] = useState(null);
    const [saved, setSaved] = useState("");
    const [warns, setWarns] = useState([]);
    const cancel = useRef(false);
    const doneRef = useRef(null);
    useEffect(() => { if (deck && doneRef.current) doneRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [deck]);
    useEffect(() => { const k = (e) => { if (e.key === "Escape" && !busy) onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [busy]);
    useEffect(() => () => { cancel.current = true; }, []);

    const html = useMemo(() => (deck ? CS.renderDeckHTML(deck, pal) : ""), [deck, pal]);
    const fname = fileBase(lesson) + "-slides-" + pal + ".html";
    const blob = () => new Blob([html], { type: "text/html;charset=utf-8" });
    const open = () => { const u = URL.createObjectURL(blob()); const w = window.open(u, "_blank"); if (!w) setErr("O navegador bloqueou a nova aba. Permita pop-ups para este site ou use «Baixar .html»."); setTimeout(() => URL.revokeObjectURL(u), 600000); };
    const download = () => { const u = URL.createObjectURL(blob()); const a = document.createElement("a"); a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); };
    const saveFolder = async (h, name) => {
      try { if (window.PastaProjeto && window.PastaProjeto.status().state === "granted") { const p = await window.PastaProjeto.save(new Blob([h], { type: "text/html;charset=utf-8" }), name, "slides"); setSaved(p ? "Cópia gravada em " + p : ""); } } catch (e) { setSaved(""); }
    };
    useEffect(() => { if (deck && html) saveFolder(html, fname); }, [pal]);

    const setStep = (i, state, label) => setSteps((st) => st.map((s, k) => (k === i ? { ...s, state, ...(label ? { label } : {}) } : s)));
    const content = CS.contentFor(plan, size, custom);
    const minContent = Math.max(1, plan.sections.length);
    const generate = async () => {
      setErr(""); setDeck(null); setSaved(""); setWarns([]); cancel.current = false;
      safeSet(LS_PAL, pal); safeSet(LS_SIZE, size); if (size === "custom") safeSet(LS_CUSTOM, String(custom));
      const n = plan.sections.length;
      setSteps([{ label: "Pergunta da aula, objetivos, síntese e pergunta final", state: "wait" }, { label: "Plano do deck: a IA lê a aula inteira e distribui os " + content + " slides", state: "wait" }]);
      setBusy(true);
      if (window.aulaAccess) window.aulaAccess.persist();
      let frame = null; const w = []; let J = []; let deckTitles = []; let got = []; let ANS = 0;
      try {
        const frameJob = (async () => {
          setStep(0, "run");
          try { frame = await withRetry(() => askSlides({ mode: "frame", lessonTitle: plan.title, sectionTitles: plan.sections.map((s) => s.title), text: CS.frameText(plan) })); setStep(0, "ok"); }
          catch (e) { if (e.fatal) throw e; frame = null; setStep(0, "warn"); w.push("Pergunta, objetivos e síntese: usei uma versão simples, a partir dos títulos. " + e.message); }
        })();
        setStep(1, "run");
        try {
          const r = await withRetry(() => askSlides({ mode: "outline", lessonTitle: plan.title, count: content, sections: plan.sections.map((s) => ({ title: s.title, text: s.text, images: s.images.map((im) => ({ id: im.id, caption: im.caption || im.alt })) })) }));
          J = CS.jobsFromOutline(plan, r.outline, content);
          deckTitles = J.reduce((a, j) => a.concat(j.outline.map((o) => o.title)), []);
          setStep(1, "ok");
        } catch (e) {
          if (e.fatal) throw e;
          J = CS.jobs(plan, CS.FIXED + content); setStep(1, "warn");
          w.push("O plano do deck falhou; dividi a aula pelo tamanho de cada seção. " + e.message);
        }
        if (cancel.current) return;
        got = new Array(J.length); ANS = J.length + 2;
        setSteps((st) => st.slice(0, 2).concat(J.map((j) => ({ label: "Seção " + (j.sec + 1) + " de " + n + (j.part ? " (" + j.part + ")" : "") + ": " + plan.sections[j.sec].title + " · " + j.count + " slide(s)", state: "wait" }))).concat([{ label: "Respostas detalhadas das perguntas, nas notas", state: "wait" }]));
        const firstPart = {};
        const secJob = pool(J, 3, async (j, k) => {
          if (cancel.current) return;
          setStep(k + 2, "run");
          const sec = plan.sections[j.sec];
          const planned = j.outline ? j.outline.map((o) => o.imageId).filter(Boolean) : null;
          const withImages = planned ? planned.length > 0 : firstPart[j.sec] === undefined; firstPart[j.sec] = k;
          const imgs = sec.images.filter((im) => !planned || planned.indexOf(im.id) >= 0);
          const body = { mode: "section", lessonTitle: plan.title, sectionTitle: sec.title, sectionIndex: j.sec + 1, sectionCount: n, part: j.part, text: j.text, images: withImages ? imgs.map((im) => ({ id: im.id, caption: im.caption, alt: im.alt })) : [], count: j.count, min: j.count, max: j.count, ...(j.outline ? { outline: j.outline, deck: deckTitles } : {}) };
          try {
            let sl = ((await withRetry(() => askSlides(body))).slides || []).filter((x) => x.type !== "image" || sec.images.some((im) => im.id === x.imageId));
            if (sl.length < j.count) {
              const miss = j.count - sl.length;
              try { const r2 = await askSlides({ ...body, images: [], outline: j.outline ? j.outline.slice(sl.length) : undefined, count: miss, min: miss, max: miss, avoid: sl.map((x) => x.title || x.text || x.question).filter(Boolean) }); sl = sl.concat((r2.slides || []).filter((x) => x.type !== "image")); }
              catch (e) { if (e.fatal) throw e; }
            }
            if (sl.length < j.count) sl = sl.concat(CS.fallbackSlides(sec, j.count - sl.length, j.text));
            got[k] = sl.slice(0, j.count).map((x) => ({ ...x, _job: k }));
            setStep(k + 2, "ok");
          } catch (e) {
            if (e.fatal) throw e;
            got[k] = CS.fallbackSlides(sec, j.count, j.text).map((x) => ({ ...x, _job: k })); setStep(k + 2, "warn");
            w.push("Seção " + (j.sec + 1) + " (" + sec.title + "): montei " + j.count + " slide(s) simples sem IA. " + e.message);
          }
        });
        await Promise.all([frameJob, secJob]);
        if (cancel.current) return;
        const out = plan.sections.map(() => []);
        J.forEach((j, k) => { out[j.sec] = out[j.sec].concat(got[k] || []); });
        const d = CS.buildDeck(plan, frame, out);
        // Garante a RESPOSTA detalhada em todo slide que faz uma pergunta.
        const pend = d.slides.map((s, i) => [s, i]).filter(([s]) => CS.needsAnswer(s));
        setStep(ANS, pend.length ? "run" : "ok", pend.length ? "Respostas detalhadas: " + pend.length + " pergunta(s)" : "Respostas detalhadas: todas já vieram nas notas");
        let failed = 0;
        await pool(pend, 3, async ([s]) => {
          if (cancel.current) return;
          const ctxText = s._job !== undefined ? J[s._job].text : CS.frameText(plan);
          try { const r = await withRetry(() => askSlides({ mode: "answer", lessonTitle: plan.title, question: CS.questionOf(s), context: ctxText })); s.notes = (s.notes ? s.notes.replace(/\n*RESPOSTA\s*:[\s\S]*$/i, "") + "\n\n" : "") + "RESPOSTA: " + r.answer; }
          catch (e) { if (e.fatal) throw e; failed += 1; }
        });
        if (pend.length) setStep(ANS, failed ? "warn" : "ok");
        if (failed) w.push(failed + " pergunta(s) ficaram sem a resposta detalhada nas notas (a IA não respondeu). Gere de novo ou complete à mão.");
        d.slides.forEach((s) => { delete s._job; });
        setDeck(d); setWarns(w);
        saveFolder(CS.renderDeckHTML(d, pal), fileBase(lesson) + "-slides-" + pal + ".html");
      } catch (e) { setErr(e.message || String(e)); }
      finally { setBusy(false); }
    };
    const [pptxBusy, setPptxBusy] = useState(false);
    const downloadPptx = async () => {
      setErr(""); setPptxBusy(true);
      try {
        const b = await window.ClassSlidesPptx.deckToPptx(deck, pal);
        const name = fileBase(lesson) + "-slides-" + pal + ".pptx";
        const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000);
        try { if (window.PastaProjeto && window.PastaProjeto.status().state === "granted") await window.PastaProjeto.save(b, name, "slides"); } catch (e) { /* sem pasta */ }
      } catch (e) { setErr("Não consegui montar o PowerPoint: " + (e.message || e)); }
      finally { setPptxBusy(false); }
    };
    const downloadNotes = () => { const u = URL.createObjectURL(new Blob([CS.notesText(deck)], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = u; a.download = fileBase(lesson) + "-notas-do-apresentador.txt"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); };

    const btn = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" };
    const primary = { ...btn, background: "var(--tool-accent)", color: "#fff", border: 0 };
    const sizeBtn = (id, label, sub) => (
      <button type="button" role="radio" aria-checked={size === id} data-sl={"size-" + id} onClick={() => setSize(id)} disabled={busy} style={{ ...btn, flex: "1 1 140px", textAlign: "left", padding: "8px 10px", border: size === id ? "2px solid var(--tool-accent)" : "1px solid var(--tool-line-2)" }}>
        <div style={{ fontWeight: 700 }}>{label}</div><div style={{ fontSize: 11.5, fontWeight: 400, color: "var(--tool-ink-3)" }}>{sub}</div>
      </button>
    );
    const icon = { wait: "○", run: "◌", ok: "✓", warn: "!" };
    const color = { wait: "var(--tool-ink-3)", run: "var(--tool-accent)", ok: "#1f7a4d", warn: "#a1580f" };
    const noSections = !plan.sections.length;

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(20,20,28,.48)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={() => { if (!busy) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-label="Gerar slides" data-sl="dialog" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(680px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
          <header style={{ padding: "16px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "start", borderBottom: "1px solid var(--tool-line)" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>Gerar slides</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>A IA lê a aula como está no editor e escolhe o conteúdo de cada slide, com notas do apresentador. O visual segue a paleta escolhida.</p>
            </div>
            <button type="button" aria-label="Fechar" onClick={onClose} disabled={busy} style={{ ...btn, padding: "4px 10px", fontSize: 16, lineHeight: 1 }}>×</button>
          </header>
          <div className="tool-scroll" style={{ padding: "14px 20px 18px", overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 6, color: "var(--tool-ink-2)" }}>Paleta de cores</div>
              <div role="radiogroup" aria-label="Paleta de cores" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>{CS.PALETTES.map((p) => <PaletteCard key={p.id} p={p} on={pal === p.id} onPick={setPal} />)}</div>
              {deck && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--tool-ink-3)" }}>Trocar a paleta agora refaz o visual na hora, sem chamar a IA de novo.</p>}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 6, color: "var(--tool-ink-2)" }}>Quantidade de slides</div>
              <div role="radiogroup" aria-label="Tamanho" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sizeBtn("auto", "Automático", "Conforme o tamanho do texto")}
                {sizeBtn("enxuto", "Enxuto", "12 de conteúdo · 20 no total")}
                {sizeBtn("completo", "Completo", "32 de conteúdo · 40 no total")}
                {sizeBtn("custom", "Quantos eu quiser", "Digite o número abaixo")}
              </div>
              {size === "custom" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}>
                  Slides de conteúdo:
                  <input type="number" data-sl="count" min={minContent} max={150} step={1} value={custom} disabled={busy} onChange={(e) => setCustom(Math.max(1, Math.min(150, parseInt(e.target.value, 10) || 1)))} style={{ width: 80, padding: "6px 8px", border: "1px solid var(--tool-line-2)", borderRadius: 7, fontSize: 14, fontFamily: "inherit" }} />
                </label>
              )}
              <p data-sl="total" style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--tool-ink-2)", lineHeight: 1.45 }}>
                <b>{content + CS.FIXED} slides no total</b> = {content} de conteúdo + {CS.FIXED} fixos (capa, pergunta da aula, roteiro, objetivos, síntese, a pergunta que fica, referências e créditos).
                {size === "custom" && custom < minContent ? " A aula tem " + minContent + " seções e cada uma recebe pelo menos 1 slide, por isso o mínimo de conteúdo é " + minContent + "." : ""}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>{noSections ? "A aula ainda não tem texto suficiente para gerar slides." : "Encontrei " + plan.sections.length + " seção(ões)" + (plan.references.length ? ", " + plan.references.length + " referência(s)" : "") + ". Todo slide sai com notas do apresentador completas; perguntas e reflexões trazem a RESPOSTA detalhada nas notas."}</p>
            {window.AccessBox && <window.AccessBox />}
            {steps.length > 0 && (
              <ol data-sl="steps" style={{ listStyle: "none", margin: 0, padding: "10px 12px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)", display: "flex", flexDirection: "column", gap: 4 }}>
                {steps.map((s, i) => <li key={i} style={{ fontSize: 12.5, display: "flex", gap: 8, color: s.state === "wait" ? "var(--tool-ink-3)" : "var(--tool-ink)" }}><span style={{ width: 14, fontWeight: 800, color: color[s.state] }}>{icon[s.state]}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span></li>)}
              </ol>
            )}
            {busy && <p style={{ margin: 0, fontSize: 12.5, color: "var(--tool-ink-2)" }}>Gerando… leva de 1 a 5 minutos, conforme a quantidade, com até três partes ao mesmo tempo.</p>}
            {err && <p role="alert" data-sl="error" style={{ margin: 0, padding: "8px 10px", borderRadius: 8, background: "#fdecea", color: "#8c2318", fontSize: 12.5, lineHeight: 1.45 }}>{err}</p>}
            {deck && (
              <div data-sl="done" ref={doneRef} style={{ padding: "12px 14px", borderRadius: 10, background: "#eef7f1", border: "1px solid #cfe8d8", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1f5e3c" }}>{deck.slides.length} slides prontos ({deck.slides.length - CS.FIXED} de conteúdo + {CS.FIXED} fixos) · paleta {CS.paletteById(pal).name}</div>
                <div style={{ fontSize: 12, color: "#2f5a43", lineHeight: 1.45 }}>O PowerPoint sai editável, com as notas do apresentador e as fontes Space Grotesk, IBM Plex Sans e JetBrains Mono. Se elas não estiverem instaladas no computador, o PowerPoint troca por uma parecida; são gratuitas no <a href="https://fonts.google.com/?query=Space+Grotesk" target="_blank" rel="noopener noreferrer">Google Fonts</a>.</div>
                <div style={{ fontSize: 12, color: "#2f5a43", lineHeight: 1.45 }}>Na apresentação: setas ou espaço avançam, <b>N</b> mostra as notas, <b>F</b> põe em tela cheia e o botão <b>PDF</b> (ou Ctrl+P) imprime um slide por página.</div>
                {saved && <div style={{ fontSize: 12, color: "#2f5a43" }}>{saved}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" data-sl="open" onClick={open} style={primary}>Abrir apresentação</button>
                  <button type="button" data-sl="download" onClick={download} style={btn}>Baixar .html</button>
                  <button type="button" data-sl="pptx" onClick={downloadPptx} disabled={pptxBusy} style={btn}>{pptxBusy ? "Montando o PowerPoint…" : "Baixar PowerPoint (.pptx)"}</button>
                  <button type="button" data-sl="notes" onClick={downloadNotes} style={btn}>Baixar notas (.txt)</button>
                </div>
                {warns.length > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#7a4a0c", lineHeight: 1.45 }}>{warns.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              </div>
            )}
          </div>
          <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} disabled={busy} style={btn}>Fechar</button>
            <button type="button" data-sl="generate" onClick={generate} disabled={busy || noSections} style={{ ...primary, opacity: busy || noSections ? 0.55 : 1 }}>{busy ? "Gerando…" : deck ? "Gerar de novo" : "Gerar slides"}</button>
          </footer>
        </section>
      </div>
    );
  }

  Object.assign(window, { SlidesDialog });
})();
