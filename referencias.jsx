/* eslint-disable */
// ════════════════════════════════════════════════════════════
// ClassAtelier — bloco REFERÊNCIAS: conferência e montagem na ABNT NBR 6023.
// Usa window.ABNT (abnt.js, o mesmo motor do ClassAuthor). Os itens do bloco são HTML (<strong> no título).
//   · Organizar: corrige o que a norma decide sem dúvida (4+ autores, et al., (Org.), edição, data de acesso, < >)
//     e põe a lista em ordem alfabética.
//   · Conferir: mostra, por referência, o que ainda falta ou destoa (não verifica se a obra existe).
//   · Montar por campos: autor, título, edição, local, editora, ano... e o motor escreve a referência.
// ════════════════════════════════════════════════════════════
(function () {
  const { useState, useMemo } = React;
  const A = () => window.ABNT;
  const box = { margin: "10px 0", padding: "10px 12px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)" };
  const lab = { display: "block", fontSize: 11.5, fontWeight: 600, margin: "0 0 3px" };
  const inp = { width: "100%", boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--tool-line-2)", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", background: "#fff" };
  const btn = { padding: "8px 12px", border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "var(--tool-ink-2)" };
  const btnPrimary = { ...btn, background: "var(--tool-accent)", borderColor: "var(--tool-accent)", color: "#fff" };
  const note = { fontSize: 11.5, margin: "4px 0 0", color: "var(--tool-ink-3)", lineHeight: 1.45 };

  const TYPES = [["livro", "Livro"], ["capitulo", "Capítulo de livro"], ["artigo", "Artigo de periódico"], ["site", "Site ou documento digital"]];
  const MONTH_OPTIONS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const BLANK = { tipo: "livro", autores: "", entidade: false, titulo: "", subtitulo: "", edicao: "", local: "", editora: "", ano: "", capitulo: "", obraAutores: "", organizador: true, paginas: "", revista: "", volume: "", numero: "", mes: "", url: "", acesso: "" };

  function Row({ label, children }) {
    return <div style={{ marginBottom: 8 }}><label style={lab}>{label}</label>{children}</div>;
  }

  function ReferencesTool({ items, onChange }) {
    const [msg, setMsg] = useState("");
    const [f, setF] = useState(BLANK);
    const set = (patch) => setF((old) => ({ ...old, ...patch }));
    const list = Array.isArray(items) ? items : [];
    const abnt = A();
    if (!abnt) return null;

    const problems = useMemo(() => list.map((html, index) => ({ index, issues: abnt.abntIssues(abnt.citationFromHtml(html)) })).filter((entry) => String(list[entry.index] || "").trim() && entry.issues.length), [list]);

    const organize = () => {
      let changed = 0;
      const fixed = list.filter((html) => String(html || "").trim()).map((html) => {
        if (/<a[\s>]/i.test(html)) return html; // com link dentro: só entra na ordem, o texto fica como está
        const next = abnt.citationToHtml(abnt.normalizeAbntCitation(abnt.citationFromHtml(html)));
        if (next !== html && abnt.citationFromHtml(next) !== abnt.citationFromHtml(html)) changed += 1;
        return next;
      });
      const sorted = abnt.sortHtmlReferences(fixed);
      const moved = sorted.some((html, i) => html !== fixed[i]);
      onChange(sorted);
      setMsg(changed || moved ? `Pronto: ${changed} referência(s) corrigida(s)${moved ? " e a lista ficou em ordem alfabética" : ""}.` : "Já estava tudo certo: nada a corrigir e a lista já está em ordem.");
    };

    const built = useMemo(() => {
      const ok = String(f.titulo || "").trim() && (f.tipo !== "capitulo" || String(f.capitulo || "").trim()) && (f.tipo !== "artigo" || String(f.revista || "").trim());
      return ok ? abnt.formatAbnt(f) : "";
    }, [f]);

    const add = () => {
      if (!built) return;
      onChange(abnt.sortHtmlReferences(list.filter((html) => String(html || "").trim()).concat(abnt.citationToHtml(built))));
      setMsg("Referência adicionada e lista em ordem alfabética.");
      setF({ ...BLANK, tipo: f.tipo });
    };

    return (
      <div data-rf="box" style={box}>
        <div style={{ fontSize: 11.5, fontWeight: 600, margin: "0 0 2px" }}>ABNT NBR 6023: organizar e conferir</div>
        <p style={{ ...note, margin: "0 0 8px" }}>Na aula, as referências saem sempre em ordem alfabética, alinhadas à esquerda, sem marcadores e com uma linha em branco entre elas.</p>
        <button type="button" data-rf="organize" onClick={organize} style={btnPrimary}>Organizar lista (corrigir e ordenar)</button>
        {msg && <p data-rf="msg" style={{ ...note, color: "var(--tool-ink-2)" }}>{msg}</p>}
        {problems.length > 0 && (
          <div data-rf="issues" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>A conferir ({problems.length})</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, lineHeight: 1.45, color: "var(--tool-ink-2)" }}>
              {problems.slice(0, 8).map((entry) => <li key={entry.index}>Nº {entry.index + 1}: {entry.issues.join("; ")}.</li>)}
              {problems.length > 8 && <li>…e mais {problems.length - 8}.</li>}
            </ul>
            <p style={note}>A conferência olha a forma, não a verdade: confira se a obra existe e se autor, ano, edição e link estão certos.</p>
          </div>
        )}
        <details data-rf="builder" style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 12, fontWeight: 650, cursor: "pointer" }}>Montar uma referência por campos</summary>
          <p style={note}>Preencha o que sabe; o texto sai pronto, no padrão da norma. Nomes podem ser “Paulo Freire” ou “FREIRE, Paulo”.</p>
          <div style={{ marginTop: 8 }}>
            <Row label="Tipo da fonte">
              <select data-rf="tipo" value={f.tipo} onChange={(e) => set({ tipo: e.target.value })} style={inp}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </Row>
            <Row label="Autores (um por linha)"><textarea data-rf="autores" rows={2} value={f.autores} onChange={(e) => set({ autores: e.target.value })} style={inp} /></Row>
            <label style={{ display: "flex", gap: 7, fontSize: 11.5, color: "var(--tool-ink-3)", margin: "-2px 0 8px" }}><input type="checkbox" checked={f.entidade} onChange={(e) => set({ entidade: e.target.checked })} /> O autor é uma instituição (nome todo em maiúsculas)</label>
            {f.tipo === "capitulo" && <Row label="Título do capítulo"><input data-rf="capitulo" value={f.capitulo} onChange={(e) => set({ capitulo: e.target.value })} style={inp} /></Row>}
            {f.tipo === "capitulo" && <Row label="Autores ou organizadores da obra (um por linha)"><textarea rows={2} value={f.obraAutores} onChange={(e) => set({ obraAutores: e.target.value })} style={inp} /></Row>}
            {f.tipo === "capitulo" && <label style={{ display: "flex", gap: 7, fontSize: 11.5, color: "var(--tool-ink-3)", margin: "-2px 0 8px" }}><input type="checkbox" checked={f.organizador} onChange={(e) => set({ organizador: e.target.checked })} /> São organizadores: acrescentar (Org.)</label>}
            {f.tipo === "artigo"
              ? <Row label="Título do artigo"><input data-rf="titulo" value={f.titulo} onChange={(e) => set({ titulo: e.target.value })} style={inp} /></Row>
              : <Row label={f.tipo === "capitulo" ? "Título da obra" : f.tipo === "site" ? "Título da página ou matéria" : "Título"}><input data-rf="titulo" value={f.titulo} onChange={(e) => set({ titulo: e.target.value })} style={inp} /></Row>}
            {(f.tipo === "livro" || f.tipo === "site") && <Row label="Subtítulo (opcional)"><input value={f.subtitulo} onChange={(e) => set({ subtitulo: e.target.value })} style={inp} /></Row>}
            {f.tipo === "artigo" && <Row label="Nome da revista"><input data-rf="revista" value={f.revista} onChange={(e) => set({ revista: e.target.value })} style={inp} /></Row>}
            {f.tipo === "livro" && <Row label="Edição (só a partir da 2ª)"><input value={f.edicao} onChange={(e) => set({ edicao: e.target.value })} placeholder="2" style={inp} /></Row>}
            {f.tipo !== "site" && <Row label="Local (cidade)"><input value={f.local} onChange={(e) => set({ local: e.target.value })} style={inp} /></Row>}
            {(f.tipo === "livro" || f.tipo === "capitulo") && <Row label="Editora"><input value={f.editora} onChange={(e) => set({ editora: e.target.value })} style={inp} /></Row>}
            {f.tipo === "artigo" && <div style={{ display: "flex", gap: 8 }}><div style={{ flex: 1 }}><Row label="Volume"><input value={f.volume} onChange={(e) => set({ volume: e.target.value })} style={inp} /></Row></div><div style={{ flex: 1 }}><Row label="Número"><input value={f.numero} onChange={(e) => set({ numero: e.target.value })} style={inp} /></Row></div></div>}
            {(f.tipo === "capitulo" || f.tipo === "artigo") && <Row label="Páginas (ex.: 10-25)"><input value={f.paginas} onChange={(e) => set({ paginas: e.target.value })} style={inp} /></Row>}
            {f.tipo === "artigo" && <Row label="Mês (opcional)"><select value={f.mes} onChange={(e) => set({ mes: e.target.value })} style={inp}><option value="">—</option>{MONTH_OPTIONS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Row>}
            <Row label="Ano"><input data-rf="ano" value={f.ano} onChange={(e) => set({ ano: e.target.value })} style={inp} /></Row>
            {f.tipo === "site" && <Row label="Endereço (URL)"><input data-rf="url" value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" style={inp} /></Row>}
            {f.tipo === "site" && <Row label="Data de acesso (vazio: hoje)"><input type="date" value={f.acesso} onChange={(e) => set({ acesso: e.target.value })} style={inp} /></Row>}
          </div>
          <div data-rf="preview" style={{ margin: "6px 0 8px", padding: "8px 10px", background: "#fff", border: "1px dashed var(--tool-line-2)", borderRadius: 7, fontSize: 12.5, lineHeight: 1.45, minHeight: 20, textAlign: "left" }} dangerouslySetInnerHTML={{ __html: built ? abnt.citationToHtml(built) : '<span style="color:var(--tool-ink-3)">A referência aparece aqui quando houver o título.</span>' }} />
          <button type="button" data-rf="add" onClick={add} disabled={!built} style={{ ...btnPrimary, opacity: built ? 1 : 0.5, cursor: built ? "pointer" : "not-allowed" }}>Adicionar à lista</button>
          <p style={note}>Faltou local, editora ou ano? A norma manda [S. l.], [s. n.] e [s. d.]: o texto sai assim e fica para você completar.</p>
        </details>
      </div>
    );
  }

  Object.assign(window, { ReferencesTool });
})();
