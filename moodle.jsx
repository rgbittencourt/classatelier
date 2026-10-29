/* eslint-disable */
// ClassAtelier — como colocar uma aula publicada no Moodle:
//   A) Recurso URL (recomendado) — só o endereço;
//   B) código iframe — para colar numa Página ou Rótulo (editor em modo HTML).
// Usado depois de publicar (curso inteiro ou uma aula) e também avulso (cole o endereço).
window.moodleIframeCode = function (url, title, height) {
  const t = String(title || "Aula").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const h = Math.max(300, Math.round(Number(height) || 900));
  return '<iframe src="' + String(url).replace(/"/g, "%22") + '" title="' + t + '" width="100%" height="' + h + '" style="border:0;width:100%;height:' + h + 'px" loading="lazy" allowfullscreen></iframe>';
};

function MoodleDialog({ links, onClose }) {
  const [own, setOwn] = React.useState("");
  const [height, setHeight] = React.useState(900);
  const [msg, setMsg] = React.useState("");
  const list = (links && links.length) ? links : (/^https?:\/\/\S+$/i.test(own.trim().replace(/\s/g, "%20")) ? [{ label: "Aula", url: own.trim().replace(/\s/g, "%20") }] : []);
  const copy = async (text, what) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove(); } catch (e2) {}
    }
    setMsg(ok ? what + " copiado." : "Não consegui copiar sozinho: selecione o texto e use Ctrl+C.");
    setTimeout(() => setMsg(""), 3500);
  };
  const btn = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: "inherit", flex: "none" };
  const h3 = { margin: "0 0 6px", fontSize: 14.5 };
  const p = { margin: "0 0 10px", fontSize: 12.5, lineHeight: 1.55, color: "var(--tool-ink-2)" };
  const box = { width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "7px 9px", fontSize: 11.5, fontFamily: "ui-monospace, Menlo, monospace", background: "#fbfaf7", color: "var(--tool-ink)", resize: "none" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10003, background: "rgba(20,20,28,.48)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={(e) => { e.stopPropagation(); onClose(); }}>
      <section role="dialog" aria-label="Colocar no Moodle" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(720px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }}>
        <header style={{ padding: "16px 20px", borderBottom: "1px solid var(--tool-line)", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div><h2 style={{ margin: 0, fontSize: 17 }}>Colocar no Moodle</h2><p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--tool-ink-3)" }}>A aula fica no GitHub Pages e o Moodle só aponta para ela. Quando você atualizar a aula lá, o Moodle já mostra a versão nova.</p></div>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 0, background: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "var(--tool-ink-2)" }}>×</button>
        </header>
        <div className="tool-scroll" style={{ padding: 20, overflow: "auto" }}>
          {!(links && links.length) && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 4 }}>Endereço da aula publicada</label>
              <input value={own} onChange={(e) => setOwn(e.target.value)} placeholder="https://usuario.github.io/repositorio/pasta/aula-01.html" style={{ ...box, fontFamily: "inherit", fontSize: 13 }} data-mo="own" />
              {!list.length && <p style={{ ...p, marginTop: 6 }}>Cole o endereço da página da aula (o mesmo que abre no navegador).</p>}
            </div>
          )}
          {list.length > 0 && (<>
            <h3 style={h3}>A) Recurso URL <span style={{ fontSize: 11, fontWeight: 800, color: "#2f7d4f", background: "#e3f1e7", borderRadius: 5, padding: "2px 6px", textTransform: "uppercase", marginLeft: 6 }}>recomendado</span></h3>
            <p style={p}>No curso do Moodle: <b>Ativar edição → Adicionar uma atividade ou recurso → URL</b>. Cole o endereço abaixo e, em <b>Aparência → Exibir</b>, escolha <b>Incorporar</b> (a aula aparece dentro da página do Moodle) ou <b>Em uma nova janela</b> (melhor para celular).</p>
            {list.map((l) => (
              <div key={l.url} data-mo="url-row" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ flex: "none", maxWidth: 190, fontSize: 12.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
                <input readOnly value={l.url} onFocus={(e) => e.target.select()} style={{ ...box, flex: 1, minWidth: 0, padding: "6px 8px" }} />
                <button onClick={() => copy(l.url, "Endereço")} style={btn} data-mo="copy-url">Copiar</button>
              </div>))}

            <h3 style={{ ...h3, marginTop: 22 }}>B) Código iframe</h3>
            <p style={p}>Para a aula aparecer <b>no meio de uma Página ou Rótulo</b>: no editor de texto do Moodle, abra o modo HTML (botão <b>&lt;/&gt;</b>, em «mostrar mais botões») e cole o código. Se o iframe sumir ao salvar, o seu Moodle bloqueia esse recurso em textos: use a opção A.</p>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, marginBottom: 10 }}>Altura da janela
              <select value={height} onChange={(e) => setHeight(Number(e.target.value))} style={{ ...btn, fontWeight: 500 }} data-mo="height">{[600, 700, 800, 900, 1000, 1200, 1500].map((h) => <option key={h} value={h}>{h} px</option>)}</select>
              <span style={{ color: "var(--tool-ink-3)" }}>A aula rola dentro da janela quando é mais comprida.</span></label>
            {list.map((l) => { const code = window.moodleIframeCode(l.url, l.label, height); return (
              <div key={l.url} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 12.5, fontWeight: 650 }}>{l.label}</span><button onClick={() => copy(code, "Código")} style={btn} data-mo="copy-code">Copiar código</button></div>
                <textarea readOnly rows={3} value={code} onFocus={(e) => e.target.select()} style={box} data-mo="code" />
              </div>); })}
            <p style={{ ...p, color: "var(--tool-ink-3)", marginBottom: 0 }}>O Moodle precisa estar em https (o GitHub Pages já é). Para o aluno ver o resultado, teste logado como estudante ou com «Mudar de papel».</p>
          </>)}
          {msg && <p role="status" style={{ position: "sticky", bottom: 0, margin: "12px 0 0", padding: "8px 12px", borderRadius: 8, background: "#14213D", color: "#fff", fontSize: 12.5, width: "fit-content" }}>{msg}</p>}
        </div>
        <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--tool-line)", display: "flex", justifyContent: "flex-end" }}><button onClick={onClose} style={{ ...btn, padding: "8px 16px", fontSize: 13 }}>Fechar</button></footer>
      </section>
    </div>
  );
}
Object.assign(window, { MoodleDialog });
