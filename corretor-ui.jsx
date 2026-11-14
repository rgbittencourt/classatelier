// ClassAtelier — janela «Corretor ortográfico» (idioma, liga/desliga e dicionário pessoal).
// A lógica fica em corretor.js (window.Corretor); aqui só a interface.
function SpellDialog({ onClose }) {
  const C = window.Corretor;
  const [st, setSt] = React.useState(() => C.get());
  const [word, setWord] = React.useState("");
  React.useEffect(() => C.subscribe(setSt), []);
  React.useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", k, true);
    return () => document.removeEventListener("keydown", k, true);
  }, []);
  const choice = st.on ? st.lang : "off";
  const pick = (v) => { if (v === "off") C.set({ on: false }); else C.set({ on: true, lang: v }); };
  const opt = (v, label, sub) => (
    <label key={v} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 12px", border: "1px solid " + (choice === v ? "var(--tool-accent)" : "var(--tool-line)"), background: choice === v ? "var(--tool-accent-soft, #fdf1ec)" : "#fff", borderRadius: 9, cursor: "pointer" }}>
      <input type="radio" name="ca-spell-lang" checked={choice === v} onChange={() => pick(v)} style={{ marginTop: 3 }} />
      <span><span style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</span>{sub ? <span style={{ display: "block", fontSize: 11.5, color: "var(--tool-ink-3)", marginTop: 2 }}>{sub}</span> : null}</span>
    </label>
  );
  const statusText = !C.supported
    ? "Este navegador não consegue marcar palavras sem alterar o texto (precisa de Chrome, Edge, Safari 17.2 ou mais novo, ou Firefox 140+). O corretor do próprio navegador continua valendo."
    : st.status === "loading" ? "Carregando o dicionário…"
    : st.status === "error" ? "Não consegui carregar o dicionário (sem conexão?). Tente de novo."
    : st.status === "ready" ? (st.errors ? st.errors + " palavra(s) marcada(s) na página." : "Nenhuma palavra marcada na página.")
    : "Corretor desligado.";
  const add = () => { const w = word.trim(); if (!w) return; C.addWord(w); setWord(""); };
  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,18,14,0.38)", display: "grid", placeItems: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Corretor ortográfico" style={{ background: "#fff", borderRadius: 14, width: "min(480px, 100%)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.28)", padding: 20, fontFamily: "inherit", color: "var(--tool-ink)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Corretor ortográfico</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "transparent", fontSize: 20, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--tool-ink-3)", lineHeight: 1.45 }}>
          Marca as palavras que não estão no dicionário com <b style={{ borderBottom: "2px dotted #d92d20" }}>pontilhado vermelho</b>, só no modo Editar. Nada disso vai para a aula publicada nem muda o texto. Clique com o botão direito numa palavra marcada para ver sugestões.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {opt("pt-BR", "Português (Brasil)", "Padrão")}
          {opt("en-US", "English (US)", "Inglês dos Estados Unidos")}
          {opt("off", "Desligado", "Sem marcação; use quando o texto tiver códigos ou erros de propósito.")}
        </div>
        <p role="status" style={{ margin: "10px 0 0", fontSize: 12, color: st.status === "error" ? "#9a2f1b" : "var(--tool-ink-3)" }}>{statusText}</p>
        <h3 style={{ margin: "16px 0 6px", fontSize: 13.5 }}>Meu dicionário ({C.LANGS.find((l) => l.id === st.lang).label})</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Palavra a aceitar, ex.: ClassAtelier" aria-label="Palavra a adicionar ao dicionário" spellCheck={false} style={{ flex: 1, border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13 }} />
          <button onClick={add} style={{ border: 0, background: "var(--tool-accent)", color: "#fff", borderRadius: 8, padding: "0 14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Adicionar</button>
        </div>
        {st.words.length ? (
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {st.words.map((w) => (
              <li key={w} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--tool-bg-2, #f3efe4)", borderRadius: 999, padding: "3px 4px 3px 10px", fontSize: 12.5 }}>
                {w}<button onClick={() => C.removeWord(w)} aria-label={"Remover " + w + " do dicionário"} title="Remover" style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "var(--tool-ink-3)" }}>×</button>
              </li>
            ))}
          </ul>
        ) : <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--tool-ink-3)" }}>Nenhuma palavra sua ainda. Siglas e nomes que você adiciona passam a valer em todas as aulas deste navegador.</p>}
      </div>
    </div>
  );
}
Object.assign(window, { SpellDialog });
