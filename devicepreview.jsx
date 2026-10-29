/* eslint-disable */
// ClassAtelier — prévia da aula em tablet e celular.
// Roda a aula num iframe com a largura REAL do aparelho, então os breakpoints responsivos (CSS
// @media) disparam como no celular do aluno. É a mesma página que a exportação gera.
const DEVICES = [
  { id: "desktop", label: "Computador", w: 0, h: 0 },
  { id: "tablet", label: "Tablet", w: 820, h: 1180 },
  { id: "phone", label: "Celular", w: 390, h: 844 },
  { id: "phone-s", label: "Celular pequeno", w: 360, h: 640 },
];
window.PREVIEW_DEVICES = DEVICES;

function DevicePreview({ lesson, device, landscape, reloadKey }) {
  const dev = DEVICES.find((d) => d.id === device) || DEVICES[2];
  const W = landscape ? dev.h : dev.w, H = landscape ? dev.w : dev.h;
  const [html, setHtml] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [box, setBox] = React.useState({ w: 900, h: 700 });
  const wrap = React.useRef(null);
  React.useEffect(() => {
    let live = true; setHtml(null); setErr("");
    (async () => {
      try {
        const out = await window.buildExportHTML(JSON.parse(JSON.stringify(lesson)), { fonts: "embed", assets: "embed", vendor: "local" });
        if (live) setHtml(out);
      } catch (e) { if (live) setErr((e && e.message) || String(e)); }
    })();
    return () => { live = false; };
  }, [reloadKey]);
  React.useEffect(() => {
    const el = wrap.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setBox({ w: el.clientWidth, h: el.clientHeight }); return () => ro.disconnect();
  }, []);
  const pad = 28, bar = 34;
  const scale = Math.min(1, (box.w - pad * 2) / (W + 24), (box.h - pad * 2 - bar) / (H + 24));
  const s = Math.max(0.2, scale);
  return (
    <div ref={wrap} data-dp="wrap" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: pad }}>
      <div style={{ width: (W + 24) * s, height: (H + 24) * s + bar, flex: "none" }}>
        <div style={{ height: bar, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--tool-ink-3)" }} data-dp="label">{dev.label} · {W} × {H} px{landscape ? " (deitado)" : ""}{s < 1 ? " · reduzido a " + Math.round(s * 100) + "% para caber" : ""}</div>
        <div style={{ width: W + 24, height: H + 24, transform: "scale(" + s + ")", transformOrigin: "top left", boxSizing: "border-box", padding: 12, background: "#1b1a17", borderRadius: dev.id === "tablet" ? 28 : 38, boxShadow: "0 18px 50px rgba(0,0,0,.28)" }}>
          <div style={{ width: W, height: H, borderRadius: dev.id === "tablet" ? 18 : 28, overflow: "hidden", background: "#fff", position: "relative" }}>
            {html && <iframe key={reloadKey} data-dp="frame" title={"Prévia da aula em " + dev.label} srcDoc={html} sandbox="allow-scripts allow-same-origin allow-popups" style={{ width: W, height: H, border: 0, display: "block" }} />}
            {!html && !err && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13, color: "#6b6558" }}>Montando a prévia…</div>}
            {err && <div role="alert" style={{ position: "absolute", inset: 0, padding: 18, fontSize: 13, color: "#8a2f18" }}>Não consegui montar a prévia: {err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { DevicePreview });
