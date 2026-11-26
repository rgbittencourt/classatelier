/* eslint-disable */
// ClassAtelier — diagramas dos slides, montados a partir de peças prontas.
// A IA escolhe o tipo (kind) e os rótulos; o desenho é sempre este, nas cores da paleta.
// Sai um SVG (1600 × 620) usado no .html e, convertido em PNG, no PowerPoint.
(function (root) {
  const W = 1600, H = 620;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const FT = "'Space Grotesk', Arial, sans-serif", FB = "'IBM Plex Sans', Arial, sans-serif", FM = "'JetBrains Mono', 'Courier New', monospace";
  const f = (n) => Number(n).toFixed(1);

  let seq = 0;
  function diagramSVG(s, P) {
    const out = [];
    const uid = "d" + (++seq) + "-"; // ids próprios: slides escondidos não podem levar as setas dos outros
    const txt = (x, y, t, o) => { const k = o || {}; if (!t) return; out.push('<text x="' + f(x) + '" y="' + f(y) + '" font-family="' + (k.font || FB) + '" font-size="' + (k.size || 30) + '" font-weight="' + (k.bold ? 700 : 500) + '" fill="' + (k.color || P.title) + '" text-anchor="' + (k.anchor || "middle") + '"' + (k.italic ? ' font-style="italic"' : "") + ">" + esc(t) + "</text>"); };
    const line = (x1, y1, x2, y2, col, w, o) => { const k = o || {}; out.push('<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + col + '" stroke-width="' + (w || 3) + '"' + (k.dash ? ' stroke-dasharray="' + k.dash + '"' : "") + (k.arrow ? ' marker-end="url(#' + uid + k.arrow + ')"' : "") + (k.cap ? ' stroke-linecap="round"' : "") + "/>"); };
    const path = (d, col, w, o) => { const k = o || {}; out.push('<path d="' + d + '" fill="' + (k.fill || "none") + '" stroke="' + col + '" stroke-width="' + (w || 3) + '"' + (k.dash ? ' stroke-dasharray="' + k.dash + '"' : "") + (k.arrow ? ' marker-end="url(#' + uid + k.arrow + ')"' : "") + ' stroke-linecap="round" stroke-linejoin="round"/>'); };
    const rect = (x, y, w, h, fill, o) => { const k = o || {}; out.push('<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + (k.rx == null ? 14 : k.rx) + '" fill="' + fill + '"' + (k.stroke ? ' stroke="' + k.stroke + '" stroke-width="' + (k.sw || 2) + '"' : "") + "/>"); };
    const wave = (x1, x2, y, amp, period, phase) => { let d = ""; for (let x = x1; x <= x2 + 0.1; x += 4) { const yy = y - amp * Math.sin(((x - x1) / period) * 2 * Math.PI + (phase || 0)); d += (d ? " L" : "M") + f(x) + "," + f(yy); } return d; };
    const dish = (x, y, col) => { // antena do radar
      path("M" + (x - 34) + "," + (y + 80) + " L" + x + "," + (y + 10) + " L" + (x + 34) + "," + (y + 80) + " Z", col, 4, { fill: col });
      path("M" + (x - 70) + "," + (y - 60) + " Q" + (x - 10) + "," + (y + 40) + " " + (x + 60) + "," + (y - 20), col, 8);
      line(x - 5, y - 10, x + 30, y - 45, col, 5);
      out.push('<circle cx="' + (x + 32) + '" cy="' + (y - 47) + '" r="9" fill="' + P.accent + '"/>');
    };
    const sat = (x, y) => { rect(x - 40, y - 26, 80, 52, P.dark, { rx: 8 }); rect(x - 150, y - 16, 96, 32, P.second, { rx: 4 }); rect(x + 54, y - 16, 96, 32, P.second, { rx: 4 }); line(x - 54, y, x - 40, y, P.dark, 4); line(x + 40, y, x + 54, y, P.dark, 4); };

    switch (s.kind) {
      case "echo": {
        dish(190, 330, P.dark);
        rect(1340, 250, 170, 160, P.dark, { rx: 18 }); txt(1425, 345, s.target, { color: "#F7F5F0", bold: true, size: 32, font: FT });
        path(wave(300, 1300, 255, 26, 70), P.accent, 6, { arrow: "aA" }); txt(800, 195, s.out || "pulso", { color: P.accent, bold: true, size: 32 });
        let d = ""; for (let x = 1300; x >= 300; x -= 4) { const yy = 405 - 16 * Math.sin(((1300 - x) / 70) * 2 * Math.PI); d += (d ? " L" : "M") + f(x) + "," + f(yy); }
        path(d, P.second, 5, { arrow: "aS" }); txt(800, 470, s.back || "eco", { color: P.second, bold: true, size: 32 });
        txt(190, 470, s.source, { bold: true, size: 32, font: FT });
        line(190, 545, 1425, 545, P.muted, 3); line(190, 525, 190, 565, P.muted, 3); line(1425, 525, 1425, 565, P.muted, 3);
        if (s.measure) { rect(620, 520, 360, 52, P.bg, { rx: 10 }); txt(800, 558, s.measure, { font: FM, bold: true, size: 32 }); }
        break;
      }
      case "wave": {
        const ws = s.waves || []; const n = ws.length || 1; const rowH = 560 / n;
        ws.forEach((w, i) => {
          const y = 40 + rowH * i + rowH / 2; const per = 1240 / Math.max(1, w.cycles); const amp = Math.min(70, rowH * 0.32);
          txt(250, y + 10, w.label, { anchor: "end", bold: true, size: 32, font: FT });
          path(wave(300, 1540, y, amp, per), i === n - 1 ? P.accent : i === 0 ? P.second : P.dark, 6);
          if (i === 0 && s.measure) {
            const x1 = 300 + per / 4, x2 = x1 + per, yb = y - amp - 22;
            line(x1, yb, x2, yb, P.title, 3); line(x1, yb - 12, x1, yb + 12, P.title, 3); line(x2, yb - 12, x2, yb + 12, P.title, 3);
            txt((x1 + x2) / 2, yb - 14, s.measure, { font: FM, bold: true, size: 30 });
          }
        });
        break;
      }
      case "curve": {
        const x0 = 200, y0 = 540, x1 = 1480, y1 = 50;
        line(x0, y0, x1 + 20, y0, P.title, 4, { arrow: "aT" }); line(x0, y0, x0, y1 - 10, P.title, 4, { arrow: "aT" });
        txt((x0 + x1) / 2, 600, s.x, { size: 30, color: P.muted, bold: true });
        out.push('<text transform="translate(140,' + (y0 + y1) / 2 + ') rotate(-90)" font-family="' + FB + '" font-size="30" font-weight="700" fill="' + P.muted + '" text-anchor="middle">' + esc(s.y) + "</text>");
        const F = { decreasing: (t) => 0.9 * Math.exp(-2.2 * t) + 0.06, increasing: (t) => 0.96 - 0.9 * Math.exp(-2.2 * t), peak: (t) => 0.08 + 0.82 * Math.exp(-Math.pow((t - 0.5) / 0.17, 2)), valley: (t) => 0.92 - 0.82 * Math.exp(-Math.pow((t - 0.5) / 0.17, 2)), flat: () => 0.5, steep: (t) => 0.86 * Math.exp(-7 * t) + 0.12 - 0.06 * t };
        const cols = [P.accent, P.second, P.dark];
        (s.marks || []).forEach((m) => { const x = x0 + 30 + m.at * (x1 - x0 - 60); line(x, y0, x, y1 + 30, P.muted, 2, { dash: "10 10" }); txt(x, y1 + 18, m.label, { size: 26, color: P.muted, bold: true }); });
        (s.series || []).forEach((sr, i) => {
          const fn = F[sr.shape] || F.decreasing; let d = ""; let last = [0, 0];
          for (let k = 0; k <= 120; k += 1) { const t = k / 120; const x = x0 + 30 + t * (x1 - x0 - 60); const y = y0 - 20 - fn(t) * (y0 - y1 - 60); d += (d ? " L" : "M") + f(x) + "," + f(y); last = [x, y]; }
          path(d, cols[i % 3], 7);
          const lt = sr.shape === "increasing" ? 0.12 : 0.62; const lx = x0 + 30 + lt * (x1 - x0 - 60), ly = y0 - 20 - fn(lt) * (y0 - y1 - 60);
          txt(lx + 14, ly - 22 - i * 4, sr.label, { anchor: "start", color: cols[i % 3], bold: true, size: 30 });
        });
        break;
      }
      case "reflection": {
        [s.left, s.right].forEach((side, k) => {
          const ox = k * 800; const sy = 470;
          rect(ox + 30, 20, 740, 580, k ? P.bg2 : P.card, { rx: 18 });
          dish(ox + 130, 140, P.dark);
          // superfície
          if (side.rough) { let d = ""; for (let x = ox + 60; x <= ox + 740; x += 20) d += (d ? " L" : "M") + x + "," + (sy + ((x / 20) % 2 ? -14 : 14)); path(d, P.second, 5); }
          else line(ox + 60, sy, ox + 740, sy, P.second, 6);
          const hx = ox + 420;
          line(ox + 180, 150, hx - 8, sy - 12, P.accent, 6, { arrow: "aA" });
          if (!side.rough) { line(hx, sy - 10, ox + 680, 150, P.accent, 6, { arrow: "aA" }); txt(ox + 600, 330, "vai embora", { anchor: "start", size: 26, color: P.muted, bold: true }); }
          else {
            [[-150, -170], [-60, -230], [60, -230], [150, -170], [230, -90], [-230, -90]].forEach((v) => line(hx, sy - 18, hx + v[0], sy - 18 + v[1], P.accent, 4, { arrow: "aA" }));
            line(hx - 30, sy - 40, ox + 200, 200, P.dark, 7, { arrow: "aD" }); txt(ox + 330, 260, "parte volta", { size: 26, color: P.dark, bold: true });
          }
          txt(ox + 400, 560, side.label, { bold: true, size: 34, font: FT });
        });
        break;
      }
      case "geometry": {
        const sx = 520, sy = 90, gy = 540;
        rect(0, gy, W, 80, P.bg2, { rx: 0 }); line(0, gy, W, gy, P.second, 5);
        sat(sx, sy); txt(sx, sy - 45, s.platform, { bold: true, size: 30, font: FT });
        line(sx, sy + 30, sx, gy, P.dark, 4, { dash: "14 12" }); txt(sx - 20, gy - 20, s.nadir || "nadir", { anchor: "end", size: 28, color: P.muted, bold: true });
        line(sx, sy + 30, 1220, gy - 6, P.accent, 7, { arrow: "aA" }); txt(1230, gy - 30, s.oblique || "visada oblíqua", { anchor: "start", size: 28, color: P.accent, bold: true });
        const r = 150, a2 = Math.atan2(gy - 6 - (sy + 30), 1220 - sx);
        path("M" + sx + "," + (sy + 30 + r) + " A" + r + "," + r + " 0 0,0 " + f(sx + r * Math.cos(a2)) + "," + f(sy + 30 + r * Math.sin(a2)), P.title, 4);
        txt(sx + 70, sy + 30 + r + 40, s.angle, { font: FM, bold: true, size: 40 });
        break;
      }
      case "layers": {
        const L = s.layers || []; const n = L.length; const top = 20, bot = 600, lh = (bot - top) / n;
        L.forEach((l, i) => {
          const y = top + i * lh; rect(0, y, W, lh - 6, i % 2 ? P.bg2 : P.card, { rx: 12, stroke: P.line });
          txt(40, y + lh / 2 + 2, l.label, { anchor: "start", bold: true, size: 32, font: FT });
          if (l.text) txt(40, y + lh / 2 + 38, l.text, { anchor: "start", size: 24, color: P.muted });
        });
        let x = 900; L.forEach((_, i) => { const y = top + i * lh; const w = Math.max(3, 10 - i * 2); line(x, y + 8, x + 120, y + lh - 14, P.accent, w, { arrow: i === n - 1 ? "aA" : "", cap: true }); x += 120; });
        if (s.ray) txt(880, top + 50, s.ray, { anchor: "end", size: 28, color: P.accent, bold: true });
        break;
      }
      case "bragg": {
        const gy = 430, per = 260;
        rect(0, gy, W, H - gy, P.bg2, { rx: 0 });
        path(wave(0, W, gy, 26, per, Math.PI / 2) + " L" + W + "," + H + " L0," + H + " Z", P.second, 4, { fill: P.secondSoft });
        const crests = [per * 2, per * 3, per * 4];
        crests.forEach((cx) => line(cx - 300, gy - 300, cx - 8, gy - 34, P.accent, 5, { arrow: "aA" }));
        txt(crests[0] - 300, 100, s.lambdaRadar, { font: FM, bold: true, size: 30, color: P.accent, anchor: "start" });
        const yb = gy + 110; line(crests[0], yb, crests[1], yb, P.title, 3); line(crests[0], yb - 12, crests[0], yb + 12, P.title, 3); line(crests[1], yb - 12, crests[1], yb + 12, P.title, 3);
        txt((crests[0] + crests[1]) / 2, yb + 44, s.lambdaB, { font: FM, bold: true, size: 32 });
        line(crests[2], gy - 30, crests[2], gy - 290, P.muted, 3, { dash: "12 10" });
        txt(crests[2] - 60, gy - 210, s.angle, { font: FM, bold: true, size: 38 });
        txt(1330, 150, "os ecos das cristas", { size: 28, bold: true, color: P.dark });
        txt(1330, 190, "voltam em fase e se somam", { size: 28, bold: true, color: P.dark });
        break;
      }
      default: txt(W / 2, H / 2, "(diagrama)", { color: P.muted });
    }
    const mk = (id, col) => '<marker id="' + uid + id + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + col + '"/></marker>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '"><defs>' + mk("aA", P.accent) + mk("aS", P.second) + mk("aD", P.dark) + mk("aT", P.title) + "</defs>" + out.join("") + "</svg>";
  }

  const api = { diagramSVG, W, H };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ClassDiagram = api;
})(typeof window !== "undefined" ? window : this);
