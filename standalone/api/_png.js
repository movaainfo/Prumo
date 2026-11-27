// PRUMO · ler PNG no servidor e fazer a SILHUETA de corpo inteiro de uma personagem (v3.91, para o jogo Sombras).
// A administração junta a imagem de corpo inteiro (PNG com fundo transparente, ou com fundo liso: o servidor recorta-o sozinho).
// O servidor faz 3 versões cada vez mais reveladoras (só a silhueta preta; a silhueta com os contornos de dentro; a silhueta com as cores
// em mosaico) e só manda ao app a que a pessoa já pode ver. A imagem original só aparece no fim do jogo. Sem dependências: só zlib.
'use strict';
const zlib = require('zlib');
const { png } = require('./_gif');
const erro = m => Object.assign(new Error(m), { png: true });

/* ---------- ler (tipos de cor 0, 2, 3, 4 e 6, 8 bits, sem entrelaçado) ---------- */
const ler = buf => { if (!buf || buf.length < 33 || buf.readUInt32BE(0) !== 0x89504E47) throw erro('Não é um PNG.');
  let p = 8, w = 0, h = 0, bd = 0, ct = 0, il = 0, pal = null, trns = null; const idat = [];
  while (p + 8 <= buf.length) { const n = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n); p += 12 + n;
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; }
    else if (t === 'PLTE') pal = d; else if (t === 'tRNS') trns = d; else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break; }
  if (!w || !h || w > 2400 || h > 2400) throw erro('A imagem é grande demais (máximo 2400 px).'); if (bd !== 8 || il) throw erro('Usa um PNG normal (8 bits, sem entrelaçado).');
  const cpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct]; if (!cpp) throw erro('Tipo de PNG não suportado.');
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * cpp, px = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], o = y * (st + 1) + 1, q = y * st;
    for (let x = 0; x < st; x++) { const a = x >= cpp ? px[q + x - cpp] : 0, b = y ? px[q - st + x] : 0, c = x >= cpp && y ? px[q - st + x - cpp] : 0, v = raw[o + x]; let r;
      if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      px[q + x] = r & 255; } }
  const rgb = Buffer.alloc(w * h * 3), al = Buffer.alloc(w * h, 255);
  for (let i = 0; i < w * h; i++) { let r, g, b, a = 255;
    if (ct === 2) { r = px[i * 3]; g = px[i * 3 + 1]; b = px[i * 3 + 2]; } else if (ct === 6) { r = px[i * 4]; g = px[i * 4 + 1]; b = px[i * 4 + 2]; a = px[i * 4 + 3]; }
    else if (ct === 0) { r = g = b = px[i]; } else if (ct === 4) { r = g = b = px[i * 2]; a = px[i * 2 + 1]; }
    else { const k = px[i]; r = pal ? pal[k * 3] : 0; g = pal ? pal[k * 3 + 1] : 0; b = pal ? pal[k * 3 + 2] : 0; if (trns && k < trns.length) a = trns[k]; }
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b; al[i] = a; }
  return { w, h, rgb, al }; };

/* ---------- recortar a personagem do fundo ---------- */
// com transparência: o que não é transparente; com fundo liso: tudo o que não se liga às bordas por cores parecidas com as do fundo
const recorte = im => { const { w, h, rgb, al } = im, n = w * h, M = new Uint8Array(n); let transp = 0; for (let i = 0; i < n; i++) if (al[i] < 128) transp++;
  const comAlfa = transp > n * .05; if (comAlfa) { for (let i = 0; i < n; i++) M[i] = al[i] >= 128 ? 1 : 0; }
  else { const B = []; for (let x = 0; x < w; x++) B.push(x, (h - 1) * w + x); for (let y = 0; y < h; y++) B.push(y * w, y * w + w - 1);
    const med = [0, 1, 2].map(j => { const v = B.map(i => rgb[i * 3 + j]).sort((a, b) => a - b); return v[v.length >> 1]; });
    const longe = i => Math.abs(rgb[i * 3] - med[0]) + Math.abs(rgb[i * 3 + 1] - med[1]) + Math.abs(rgb[i * 3 + 2] - med[2]) > 60;
    const fora = B.filter(i => longe(i)).length; if (fora > B.length * .25) throw erro('O fundo não é liso. Usa um PNG com fundo transparente ou de uma cor só.');
    const F = new Uint8Array(n), pilha = B.filter(i => !longe(i)); pilha.forEach(i => { F[i] = 1; });
    while (pilha.length) { const i = pilha.pop(), x = i % w, y = (i / w) | 0; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !F[j] && !longe(j)) { F[j] = 1; pilha.push(j); } }
    for (let i = 0; i < n; i++) M[i] = F[i] ? 0 : 1; }
  let c = 0, x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (M[y * w + x]) { c++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (c < n * .03 || x1 < 0) throw erro('Não encontrei a personagem na imagem.'); if (c > n * .92) throw erro('A personagem enche a imagem toda: precisa de fundo à volta (transparente ou liso).');
  return { M, x0, y0, x1, y1, comAlfa }; };

/* ---------- as 3 versões ---------- */
// recorta à volta da personagem (com margem) e reduz para caber em 300×420
const enquadra = (im, R) => { const pad = Math.round(Math.max(R.x1 - R.x0, R.y1 - R.y0) * .06), X0 = Math.max(0, R.x0 - pad), Y0 = Math.max(0, R.y0 - pad), X1 = Math.min(im.w - 1, R.x1 + pad), Y1 = Math.min(im.h - 1, R.y1 + pad);
  const cw = X1 - X0 + 1, ch = Y1 - Y0 + 1, k = Math.min(1, 300 / cw, 420 / ch), W = Math.max(1, Math.round(cw * k)), H = Math.max(1, Math.round(ch * k)), rgb = Buffer.alloc(W * H * 3), M = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let r = 0, g = 0, b = 0, m = 0, t = 0; const sx0 = X0 + Math.floor(x / k), sy0 = Y0 + Math.floor(y / k), sx1 = Math.min(X1, X0 + Math.floor((x + 1) / k)), sy1 = Math.min(Y1, Y0 + Math.floor((y + 1) / k));
    for (let sy = sy0; sy <= Math.max(sy0, sy1 - 1); sy++) for (let sx = sx0; sx <= Math.max(sx0, sx1 - 1); sx++) { const i = sy * im.w + sx; r += im.rgb[i * 3]; g += im.rgb[i * 3 + 1]; b += im.rgb[i * 3 + 2]; m += R.M[i]; t++; }
    const o = y * W + x; rgb[o * 3] = r / t; rgb[o * 3 + 1] = g / t; rgb[o * 3 + 2] = b / t; M[o] = m * 2 >= t ? 1 : 0; }
  return { w: W, h: H, rgb, M }; };
const FUNDO = (x, y, w, h) => { const t = y / h; return [Math.round(232 - 18 * t), Math.round(226 - 22 * t), Math.round(214 - 30 * t)]; };   // papel claro, um pouco mais quente em baixo
const SOMBRA = [14, 12, 20];
const versao = (E, nivel) => { const { w, h, rgb, M } = E, out = Buffer.alloc(w * h * 3), lum = i => .299 * rgb[i * 3] + .587 * rgb[i * 3 + 1] + .114 * rgb[i * 3 + 2], B = 8;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; let c;
    if (!M[i]) c = FUNDO(x, y, w, h);
    else if (nivel === 0) c = SOMBRA;
    else if (nivel === 1) { // os contornos de dentro (onde a luz muda muito) a cinzento, sobre a silhueta preta
      const gx = x > 0 && x < w - 1 ? Math.abs(lum(i + 1) - lum(i - 1)) : 0, gy = y > 0 && y < h - 1 ? Math.abs(lum(i + w) - lum(i - w)) : 0, e = Math.min(1, Math.max(0, (gx + gy - 30) / 140));
      c = [0, 1, 2].map(j => Math.round(SOMBRA[j] + (120 - SOMBRA[j]) * e)); }
    else { const bx = Math.floor(x / B) * B, by = Math.floor(y / B) * B; let r = 0, g = 0, b = 0, t = 0;   // as cores em mosaico, só dentro da silhueta
      for (let yy = by; yy < Math.min(h, by + B); yy++) for (let xx = bx; xx < Math.min(w, bx + B); xx++) { const j = yy * w + xx; if (!M[j]) continue; r += rgb[j * 3]; g += rgb[j * 3 + 1]; b += rgb[j * 3 + 2]; t++; }
      c = t ? [r, g, b].map(v => Math.min(255, Math.round(v / t / 40) * 40)) : SOMBRA; }
    out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2]; }
  return png(w, h, out); };
// a imagem para o fim do jogo (a personagem recortada sobre o mesmo papel claro)
const revelada = E => { const { w, h, rgb, M } = E, out = Buffer.alloc(w * h * 3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, c = M[i] ? [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]] : FUNDO(x, y, w, h); out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2]; } return png(w, h, out); };
// tudo de uma vez: as 3 versões e a imagem final, em base64 (PNG)
const silhuetas = buf => { const im = ler(buf), R = recorte(im), E = enquadra(im, R); return { lv: [0, 1, 2].map(n => versao(E, n).toString('base64')), fim: revelada(E).toString('base64'), w: E.w, h: E.h, comAlfa: R.comAlfa }; };
module.exports = { ler, recorte, silhuetas };
