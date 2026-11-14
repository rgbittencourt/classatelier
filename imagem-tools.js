/* ClassAtelier — ferramentas de imagem: ler tamanho/peso e reduzir o arquivo.
   Tudo no navegador (canvas). Só mexe em imagens guardadas na própria aula (data:);
   imagens apontando para outro site só informam as dimensões. */
(function () {
  "use strict";
  function load(src) {
    return new Promise(function (res, rej) {
      var i = new Image();
      i.onload = function () { res(i); };
      i.onerror = function () { rej(new Error("Não foi possível ler a imagem.")); };
      if (!/^data:/i.test(src)) i.crossOrigin = "anonymous";
      i.src = src;
    });
  }
  function isData(src) { return /^data:/i.test(String(src || "")); }
  function mimeOf(src) { var m = /^data:([^;,]+)/i.exec(String(src || "")); return m ? m[1].toLowerCase() : ""; }
  function bytesOf(src) {
    if (!isData(src)) return null;
    var c = src.indexOf(","); if (c < 0) return 0;
    if (/;base64/i.test(src.slice(0, c))) {
      var n = src.length - c - 1, pad = /==$/.test(src) ? 2 : /=$/.test(src) ? 1 : 0;
      return Math.max(0, Math.floor(n * 3 / 4) - pad);
    }
    try { return decodeURIComponent(src.slice(c + 1)).length; } catch (e) { return src.length - c - 1; }
  }
  function fmtBytes(n) {
    if (n == null) return "";
    if (n < 1024) return n + " B";
    if (n < 1048576) return Math.round(n / 1024) + " KB";
    return (n / 1048576).toFixed(1).replace(".", ",") + " MB";
  }
  function typeLabel(m) { return ({ "image/png": "PNG", "image/jpeg": "JPEG", "image/jpg": "JPEG", "image/webp": "WebP", "image/gif": "GIF", "image/svg+xml": "SVG" })[m] || ""; }
  function info(src) {
    return load(src).then(function (img) {
      var type = mimeOf(src);
      return { w: img.naturalWidth, h: img.naturalHeight, bytes: bytesOf(src), type: type, label: typeLabel(type), external: !isData(src) };
    });
  }
  // A imagem tem algum pixel transparente? (PNG/WebP opacos podem virar JPEG, bem mais leve)
  function hasAlpha(ctx, w, h) {
    try {
      var d = ctx.getImageData(0, 0, w, h).data;
      for (var i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
      return false;
    } catch (e) { return true; }
  }
  // Reduz o lado maior para `maxSide` px (se for maior) e recodifica. Devolve a menor das versões.
  function reduce(src, maxSide) {
    var orig = bytesOf(src), type = mimeOf(src);
    if (!isData(src)) return Promise.reject(new Error("Esta imagem está em outro site. Envie o arquivo para poder reduzi-lo."));
    if (type === "image/gif" || type === "image/svg+xml") return Promise.reject(new Error("GIF e SVG não são reduzidos aqui."));
    return load(src).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight, side = Math.max(w, h);
      var k = maxSide && side > maxSide ? maxSide / side : 1;
      var nw = Math.max(1, Math.round(w * k)), nh = Math.max(1, Math.round(h * k));
      var c = document.createElement("canvas"); c.width = nw; c.height = nh;
      var ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, nw, nh);
      var keepPng = (type === "image/png" || type === "image/webp") && hasAlpha(ctx, nw, nh);
      var out;
      if (keepPng) out = c.toDataURL("image/png");
      else {
        // fundo branco por segurança (JPEG não tem transparência)
        var c2 = document.createElement("canvas"); c2.width = nw; c2.height = nh;
        var x2 = c2.getContext("2d"); x2.fillStyle = "#fff"; x2.fillRect(0, 0, nw, nh); x2.drawImage(c, 0, 0);
        out = c2.toDataURL("image/jpeg", 0.88);
      }
      var nb = bytesOf(out);
      if (k === 1 && orig != null && nb >= orig) return { src: src, w: w, h: h, bytes: orig, changed: false };
      return { src: out, w: nw, h: nh, bytes: nb, changed: true };
    });
  }
  window.ImgTools = { info: info, reduce: reduce, bytesOf: bytesOf, fmtBytes: fmtBytes, isData: isData, mimeOf: mimeOf };
})();
