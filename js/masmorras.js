/* PRUMO — As masmorras por dentro (v2.53): cada masmorra tem o seu tema (forja, arena, labirinto, espelhos, biblioteca afundada,
   arquivo, cofre, mina, ruínas, ilha, catedral, deserto, torre, escritório, pântano, relógio e mais oito para os círculos sem fim),
   cada andar é uma sala diferente e quanto mais fundo, mais escura, mais partida e mais vermelha. A sala do chefe tem portão e trono.
   Tudo em pixel art (192 × 96), feito uma vez e guardado como imagem. */
(() => {
'use strict';
const W = 192, H = 96, FL = 70;
const hx = h => { h = String(h); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const shift = (c, k) => { const [r, g, b] = hx(c); return toHex([r * (1 - k * .15) + k * 30, g * (1 - k * .35), b * (1 - k * .2) + k * 6]); }; // mais fundo: mais escuro e mais vermelho
const rng = seed => { let x = 2166136261; for (const ch of String(seed)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return () => { x = Math.imul(x ^ (x >>> 15), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); x ^= x >>> 16; return (x >>> 0) / 4294967296; }; };
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const cv = () => { const px = new Array(W * H).fill('#000000'), C = { px };
  C.put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H && c) px[y * W + x] = c; };
  C.at = (x, y) => px[Math.round(y) * W + Math.round(x)];
  C.rect = (x0, y0, x1, y1, c) => { for (let y = Math.round(y0); y <= y1; y++) for (let x = Math.round(x0); x <= x1; x++) C.put(x, y, typeof c === 'function' ? c(x, y) : c); };
  C.ell = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const a = (x + .5 - cx) / rx, b = (y + .5 - cy) / ry; if (a * a + b * b <= 1) C.put(x, y, typeof c === 'function' ? c(x, y) : c); } };
  C.line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) C.put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); };
  C.glow = (cx, cy, r, c, k) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { if (x < 0 || x >= W || y < 0 || y >= H) continue; const d = Math.hypot(x + .5 - cx, y + .5 - cy) / r; if (d < 1) px[y * W + x] = mix(px[y * W + x], c, k * (1 - d) * (1 - d)); } };
  C.dark = (x, y, k) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = mix(px[y * W + x], '#000000', k); };
  return C; };
/* ---------- paredes ---------- */
const WALL = {
  tijolo: (C, A, B, r) => { for (let y = 0; y < FL; y++) for (let x = 0; x < W; x++) { const row = y >> 3, off = row % 2 ? 8 : 0, m = y % 8 === 7 || (x + off) % 16 === 15; C.put(x, y, m ? B : mix(A, B, ((x * 7 + y * 3 + row * 11) % 9) / 40 + (BAY[y & 3][x & 3] / 16) * .12)); } },
  pedra: (C, A, B, r) => { C.rect(0, 0, W - 1, FL - 1, A); for (let k = 0; k < 90; k++) { const x = r() * W, y = r() * FL, w = 8 + r() * 14, h = 5 + r() * 7; C.rect(x, y, x + w, y + h, mix(A, B, .15 + r() * .25)); C.line(x, y + h, x + w, y + h, B); C.line(x + w, y, x + w, y + h, B); } },
  marmore: (C, A, B, r) => { for (let y = 0; y < FL; y++) for (let x = 0; x < W; x++) C.put(x, y, mix(A, B, (Math.sin((x + y * 1.7) / 9) + 1) * .12)); for (let k = 0; k < 14; k++) { let x = r() * W, y = 0; for (let s = 0; s < 80 && y < FL; s++) { C.put(x, y, mix(A, '#FFFFFF', .12)); x += r() * 2 - .8; y += 1; } } for (let x = 0; x < W; x += 24) C.rect(x, 0, x, FL - 1, B); },
  caverna: (C, A, B, r) => { for (let y = 0; y < FL; y++) for (let x = 0; x < W; x++) { const n = Math.sin(x * .21 + Math.sin(y * .3) * 2) + Math.sin(y * .17 + x * .05) + (r() - .5) * .6; C.put(x, y, mix(A, B, .3 + n * .15)); } },
  estantes: (C, A, B, r) => { C.rect(0, 0, W - 1, FL - 1, B); for (let y = 4; y < FL - 4; y += 13) { C.rect(0, y + 11, W - 1, y + 12, mix(A, '#000000', .3)); for (let x = 2; x < W - 2;) { const w = 2 + Math.floor(r() * 3), h = 7 + Math.floor(r() * 4), c = mix(['#6A2A1E', '#2A4A6A', '#4A5A2A', '#6A5A2A', '#3A2A4A'][Math.floor(r() * 5)], B, .35); C.rect(x, y + 11 - h, x + w - 1, y + 10, c); C.put(x, y + 11 - h, mix(c, '#FFFFFF', .2)); x += w + (r() < .1 ? 3 : 0); } } for (let x = 0; x < W; x += 32) C.rect(x, 0, x + 2, FL - 1, A); },
  metal: (C, A, B, r) => { for (let y = 0; y < FL; y++) for (let x = 0; x < W; x++) { const e = x % 24 === 0 || y % 18 === 0; C.put(x, y, e ? B : mix(A, B, (y % 18) / 60)); } for (let y = 3; y < FL; y += 18) for (let x = 3; x < W; x += 24) { C.put(x, y, mix(A, '#FFFFFF', .3)); C.put(x + 18, y, mix(A, '#FFFFFF', .3)); } },
  ossario: (C, A, B, r) => { C.rect(0, 0, W - 1, FL - 1, B); for (let y = 2; y < FL; y += 6) for (let x = (y % 12 ? 0 : 3); x < W; x += 6) { C.ell(x + 2.5, y + 2.5, 2.4, 2.2, A); C.put(x + 1.5, y + 2.5, B); C.put(x + 3.5, y + 2.5, B); } } };
/* ---------- chão ---------- */
const FLOOR = (C, A, B, kind, r) => { for (let y = FL; y < H; y++) { const t = (y - FL) / (H - FL); for (let x = 0; x < W; x++) { let c = mix(A, B, .5 - t * .4);
    if (kind === 'agua') c = mix(A, '#9BE7FF', (Math.sin(x * .4 + y * 1.3) > .85 ? .25 : 0)); else if (kind === 'areia') c = mix(A, B, (Math.sin(x * .15 + y * .9) + 1) * .2);
    else if (kind === 'lama') c = mix(A, B, (Math.sin(x * .3) * Math.sin(y * .7) + 1) * .25); else { const persp = Math.round((x - W / 2) / (1 + t * 3)); if (persp % 14 === 0 || (y - FL) % (4 + Math.round(t * 6)) === 0) c = B; }
    C.put(x, y, c); } } };
/* ---------- objetos ---------- */
const P = {
  tocha: (C, x, y, T) => { C.rect(x - 1, y, x + 1, y + 7, '#3A2A1A'); C.rect(x - 2, y - 1, x + 2, y, '#5A5A60'); C.ell(x, y - 4, 2, 3.5, T.light); C.put(x, y - 5, '#FFF4C0'); C.glow(x, y - 3, 26, T.light, .55); },
  vela: (C, x, y, T) => { for (let k = 0; k < 3; k++) { const xx = x - 4 + k * 4, h = 4 + (k % 2) * 3; C.rect(xx, FL - h, xx + 1, FL - 1, '#E8E2D4'); C.put(xx, FL - h - 1, '#FFD23B'); C.glow(xx, FL - h - 2, 12, T.light, .35); } },
  pilar: (C, x, y, T) => { C.rect(x - 5, 4, x + 5, FL - 1, mix(T.wall[0], '#FFFFFF', .08)); C.rect(x - 5, 4, x - 4, FL - 1, mix(T.wall[0], '#FFFFFF', .2)); C.rect(x + 4, 4, x + 5, FL - 1, T.wall[1]); C.rect(x - 7, 2, x + 7, 5, T.wall[1]); C.rect(x - 7, FL - 4, x + 7, FL - 1, T.wall[1]); },
  coluna_partida: (C, x, y, T, r) => { const h = 20 + r() * 20; C.rect(x - 5, FL - h, x + 5, FL - 1, mix(T.wall[0], '#FFFFFF', .1)); for (let k = 0; k < 6; k++) C.put(x - 5 + r() * 10, FL - h - r() * 3, T.wall[1]); C.rect(x + 8, FL - 4, x + 15, FL - 1, mix(T.wall[0], '#FFFFFF', .05)); },
  correntes: (C, x, y, T, r) => { for (let k = 0; k < 2; k++) { const xx = x + k * 7, L = 14 + r() * 18; for (let yy = 0; yy < L; yy += 2) C.put(xx + (yy % 4 ? 1 : 0), yy, '#6A6E78'); C.rect(xx - 1, L, xx + 2, L + 2, '#4A4E58'); } },
  estandarte: (C, x, y, T) => { C.rect(x - 6, 6, x + 6, 30, mix(T.light, '#2A0000', .55)); for (let k = 0; k < 6; k++) C.put(x - 6 + k * 2.4, 31 + (k % 2), mix(T.light, '#2A0000', .55)); C.ell(x, 16, 3, 3, mix(T.light, '#000000', .3)); C.rect(x - 7, 5, x + 7, 5, '#5A4A30'); },
  bigorna: (C, x, y, T) => { C.rect(x - 7, FL - 9, x + 7, FL - 7, '#4A4E58'); C.rect(x - 3, FL - 7, x + 3, FL - 3, '#3A3E48'); C.rect(x - 5, FL - 3, x + 5, FL - 1, '#2A2E38'); C.rect(x - 10, FL - 9, x - 8, FL - 8, '#4A4E58'); },
  lava: (C, x, y, T) => { C.ell(x, FL + 12, 18, 5, (xx, yy) => mix('#FF5A1F', '#FFD23B', (Math.sin(xx * .5 + yy) + 1) * .25)); C.glow(x, FL + 10, 34, '#FF5A1F', .5); },
  espinhos: (C, x, y, T) => { for (let k = 0; k < 6; k++) { const xx = x - 12 + k * 5; C.line(xx, FL + 6, xx + 2, FL - 4, '#8A8E98'); C.line(xx + 4, FL + 6, xx + 2, FL - 4, '#5A5E68'); C.put(xx + 2, FL - 5, '#C8CCD4'); } },
  ossos: (C, x, y, T, r) => { for (let k = 0; k < 7; k++) { const xx = x - 14 + r() * 28, yy = FL + 4 + r() * 18; C.line(xx, yy, xx + 4 + r() * 3, yy + (r() - .5) * 3, '#C9C2B2'); } C.ell(x + 6, FL + 6, 2.5, 2.2, '#D8D0BC'); C.put(x + 5, FL + 6, '#1A1010'); C.put(x + 7, FL + 6, '#1A1010'); },
  caveiras: (C, x, y, T, r) => { for (let k = 0; k < 9; k++) { const xx = x - 10 + (k % 4) * 6 + (k > 3 ? 3 : 0), yy = FL - 3 - Math.floor(k / 4) * 5; C.ell(xx, yy, 2.6, 2.3, mix('#D8D0BC', '#000000', r() * .3)); C.put(xx - 1, yy, '#140A0A'); C.put(xx + 1, yy, '#140A0A'); } },
  livros: (C, x, y, T, r) => { for (let k = 0; k < 5; k++) C.rect(x - 8 + k, FL + 4 - k * 2, x + 6 - k, FL + 5 - k * 2, ['#6A2A1E', '#2A4A6A', '#6A5A2A'][k % 3]); },
  moedas: (C, x, y, T, r) => { for (let yy = 0; yy < 9; yy++) for (let xx = -12 + yy; xx <= 12 - yy; xx++) if (r() < .85) C.put(x + xx, FL - 1 - yy + 6, mix('#E8C26A', '#8A6A2A', r() * .5)); C.glow(x, FL + 2, 20, '#FFD23B', .3); },
  bau: (C, x, y, T) => { C.rect(x - 7, FL - 8, x + 7, FL - 1, '#5A3A1A'); C.rect(x - 7, FL - 11, x + 7, FL - 8, '#6A4A2A'); C.rect(x - 7, FL - 6, x + 7, FL - 6, '#C8A04A'); C.rect(x - 1, FL - 8, x + 1, FL - 5, '#E8C26A'); },
  cristais: (C, x, y, T, r) => { for (let k = 0; k < 5; k++) { const xx = x - 10 + k * 5, h = 6 + r() * 10; for (let yy = 0; yy < h; yy++) { const w = Math.max(0, 2 - yy / h * 2); C.rect(xx - w, FL - yy, xx + w, FL - yy, mix(T.light, '#FFFFFF', yy / h * .4)); } } C.glow(x, FL - 4, 22, T.light, .4); },
  carris: (C, x, y, T) => { C.line(W / 2 - 6, FL, x - 30, H - 1, '#6A5A4A'); C.line(W / 2 + 6, FL, x + 30, H - 1, '#6A5A4A'); for (let k = 0; k < 6; k++) { const t = k / 6, yy = FL + t * (H - FL); C.line(W / 2 - 8 - t * 28, yy, W / 2 + 8 + t * 28, yy, '#4A3A2A'); } },
  heras: (C, x, y, T, r) => { for (let k = 0; k < 4; k++) { let xx = x + k * 4, yy = 0; for (let s = 0; s < 30 + r() * 20; s++) { C.put(xx, yy, mix('#3A6A2A', '#1A3A10', r())); if (r() < .3) C.put(xx + 1, yy, '#4A8A3A'); xx += Math.round(r() * 2 - 1); yy++; } } },
  vitral: (C, x, y, T) => { C.ell(x, 22, 12, 16, '#141018'); for (let yy = 8; yy < 38; yy++) for (let xx = x - 10; xx <= x + 10; xx++) { const a = (xx + .5 - x) / 10, b = (yy + .5 - 22) / 14; if (a * a + b * b <= 1) C.put(xx, yy, ['#8A2A3A', '#2A4A8A', '#C8A04A', '#3A6A3A'][((xx >> 2) + (yy >> 2)) % 4]); } C.line(x, 8, x, 36, '#141018'); C.line(x - 10, 22, x + 10, 22, '#141018'); C.glow(x, 26, 24, '#F5E7B8', .25); },
  bancos: (C, x, y, T) => { for (let k = 0; k < 3; k++) C.rect(x - 12, FL + 6 + k * 7, x + 12, FL + 8 + k * 7, '#3A2618'); },
  dunas: (C, x, y, T) => { for (let xx = 0; xx < W; xx++) { const h = 6 + Math.sin(xx * .05 + x) * 5; for (let yy = FL - h; yy < FL; yy++) C.put(xx, yy, mix(T.floor[0], '#FFE0A0', .1)); } },
  obelisco: (C, x, y, T) => { for (let yy = 10; yy < FL; yy++) { const w = 3 + (yy - 10) / 14; C.rect(x - w, yy, x + w, yy, mix(T.wall[0], '#000000', .2)); } C.put(x, 18, T.light); C.put(x, 26, T.light); C.glow(x, 22, 10, T.light, .3); },
  escadas: (C, x, y, T) => { for (let k = 0; k < 8; k++) C.rect(x - 14 + k * 2, FL - 4 - k * 5, x + 2 + k * 2, FL - k * 5, mix(T.wall[0], '#FFFFFF', .05 + k * .01)); },
  janela: (C, x, y, T) => { C.rect(x - 6, 12, x + 6, 32, '#0A1020'); C.ell(x + 2, 18, 3, 3, '#E8E2D4'); C.rect(x - 7, 11, x + 7, 11, T.wall[1]); C.rect(x, 12, x, 32, T.wall[1]); C.rect(x - 6, 22, x + 6, 22, T.wall[1]); },
  secretaria: (C, x, y, T) => { C.rect(x - 12, FL - 9, x + 12, FL - 8, '#5A4A3A'); C.rect(x - 11, FL - 8, x - 10, FL - 1, '#3A2A1A'); C.rect(x + 10, FL - 8, x + 11, FL - 1, '#3A2A1A'); for (let k = 0; k < 4; k++) C.rect(x - 8 + k, FL - 10 - k, x - 2 + k, FL - 10 - k, '#E8E2D4'); C.rect(x + 2, FL - 15, x + 8, FL - 10, '#1E2A2E'); C.rect(x + 3, FL - 14, x + 7, FL - 11, '#3A8A9A'); },
  lampada: (C, x, y, T) => { C.rect(x - 14, 3, x + 14, 4, '#E8F4FF'); C.glow(x, 6, 30, '#C8F0FF', .35); },
  arvore_morta: (C, x, y, T, r) => { C.rect(x - 2, 20, x + 2, FL - 1, '#2A2018'); const br = (bx, by, a, L) => { if (L < 3) return; const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L; C.line(bx, by, ex, ey, '#2A2018'); br(ex, ey, a - .5 - r() * .3, L * .65); br(ex, ey, a + .4 + r() * .3, L * .6); }; br(x, 22, -Math.PI / 2 - .4, 12); br(x, 22, -Math.PI / 2 + .5, 11); },
  nevoa: (C, x, y, T) => { for (let yy = FL - 14; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (BAY[yy & 3][xx & 3] / 16 < .25 + Math.sin(xx * .07 + yy * .2) * .15) C.put(xx, yy, mix(C.at(xx, yy), '#A8C0A0', .25)); },
  engrenagens: (C, x, y, T) => { [[x, 20, 9], [x + 12, 34, 6], [x - 9, 38, 5]].forEach(([cx, cy, R]) => { C.ell(cx, cy, R, R, '#6A4A2A'); C.ell(cx, cy, R - 3, R - 3, mix(T.wall[0], '#000000', .3)); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; C.rect(cx + Math.cos(a) * R - 1, cy + Math.sin(a) * R - 1, cx + Math.cos(a) * R + 1, cy + Math.sin(a) * R + 1, '#6A4A2A'); } }); },
  pendulo: (C, x, y, T) => { C.line(x, 0, x + 6, 40, '#8A6A3A'); C.ell(x + 6, 44, 5, 5, '#C8A04A'); C.glow(x + 6, 44, 12, T.light, .2); },
  espelho: (C, x, y, T) => { C.rect(x - 7, 10, x + 7, FL - 6, '#C8A04A'); C.rect(x - 5, 12, x + 5, FL - 8, (xx, yy) => mix('#2A3A5A', '#C8D8F0', ((xx + yy) % 9) / 22)); C.line(x - 3, 16, x + 2, 30, '#E8F0FF'); },
  pergaminho: (C, x, y, T, r) => { for (let k = 0; k < 6; k++) { const xx = x - 12 + k * 4.5, yy = FL + 3 + (k % 2) * 4; C.rect(xx, yy, xx + 3, yy + 1, '#E8DCC0'); C.put(xx, yy, '#8A7A5A'); } },
  olhos: (C, x, y, T, r) => { for (let k = 0; k < 4; k++) { const xx = x - 10 + r() * 20, yy = 14 + r() * 30; C.put(xx, yy, T.light); C.put(xx + 3, yy, T.light); } },
  lanterna: (C, x, y, T) => { C.line(x, 0, x, 18, '#4A4E58'); C.rect(x - 3, 18, x + 3, 25, '#3A3E48'); C.rect(x - 2, 19, x + 2, 24, T.light); C.glow(x, 22, 26, T.light, .45); },
  rochas: (C, x, y, T, r) => { for (let k = 0; k < 3; k++) C.ell(x - 10 + k * 10, FL + 2, 6 + r() * 3, 4 + r() * 2, mix(T.wall[0], '#000000', .2 + r() * .2)); },
  agua: (C) => { for (let y = FL; y < H; y++) for (let x = 0; x < W; x++) C.put(x, y, mix(C.at(x, y), '#1E4A6A', .45)); },
  sarcofago: (C, x, y, T) => { C.rect(x - 12, FL - 9, x + 12, FL - 1, mix(T.wall[0], '#FFFFFF', .1)); C.rect(x - 13, FL - 11, x + 13, FL - 9, mix(T.wall[0], '#FFFFFF', .15)); C.ell(x, FL - 5, 3, 2, mix(T.wall[0], '#000000', .3)); },
  altar: (C, x, y, T) => { C.rect(x - 10, FL - 10, x + 10, FL - 1, mix(T.wall[0], '#000000', .1)); C.rect(x - 12, FL - 12, x + 12, FL - 10, mix(T.wall[0], '#FFFFFF', .1)); C.rect(x - 4, FL - 13, x + 4, FL - 12, '#6A0A14'); C.glow(x, FL - 14, 16, '#FF2D3B', .35); } };
/* ---------- temas ---------- */
const TH = {
  forja: { wall: ['#3A2A26', '#1E1412'], floor: ['#2A2220', '#140C0A'], light: '#FF7A2A', pat: 'tijolo', props: ['bigorna', 'correntes', 'estandarte'], fl: 'lava' },
  arena: { wall: ['#5A4630', '#2E2216'], floor: ['#8A7048', '#5A4A30'], light: '#FFB13B', pat: 'pedra', props: ['espinhos', 'estandarte', 'ossos'], kind: 'areia' },
  labirinto: { wall: ['#2E3A44', '#141C22'], floor: ['#20282E', '#10161A'], light: '#7DF9FF', pat: 'pedra', props: ['pilar', 'correntes', 'olhos'] },
  espelhos: { wall: ['#2A2A3A', '#121218'], floor: ['#1E1E2A', '#0E0E14'], light: '#B388FF', pat: 'marmore', props: ['espelho', 'pilar', 'vela'] },
  biblioteca: { wall: ['#3A2E24', '#1A120C'], floor: ['#1E3038', '#10202A'], light: '#E8C26A', pat: 'estantes', props: ['livros', 'vela', 'pilar'], fl: 'agua' },
  arquivo: { wall: ['#3A3226', '#1A160E'], floor: ['#2A2418', '#16120A'], light: '#C6FF3A', pat: 'estantes', props: ['pergaminho', 'vela', 'correntes'] },
  cofre: { wall: ['#4A3E22', '#221C0C'], floor: ['#2E2A1E', '#18160E'], light: '#FFD23B', pat: 'metal', props: ['moedas', 'bau', 'pilar'] },
  mina: { wall: ['#3A2E2A', '#1A1210'], floor: ['#2A2420', '#140E0A'], light: '#5AE8FF', pat: 'caverna', props: ['carris', 'cristais', 'lanterna'] },
  ruinas: { wall: ['#3A4038', '#1A1E18'], floor: ['#2A3028', '#141812'], light: '#9BE7FF', pat: 'pedra', props: ['coluna_partida', 'heras', 'ossos'] },
  ilha: { wall: ['#1E2A3A', '#0A121C'], floor: ['#2A3A4A', '#142030'], light: '#7DF9FF', pat: 'caverna', props: ['rochas', 'lanterna', 'ossos'], fl: 'agua' },
  catedral: { wall: ['#2E2638', '#120E18'], floor: ['#2A2430', '#14101A'], light: '#F5E7B8', pat: 'marmore', props: ['vitral', 'bancos', 'vela'] },
  deserto: { wall: ['#6A5434', '#3A2C18'], floor: ['#8A7048', '#6A5434'], light: '#FFB13B', pat: 'pedra', props: ['dunas', 'obelisco', 'ossos'], kind: 'areia' },
  torre: { wall: ['#3A3E48', '#1A1C22'], floor: ['#2A2E36', '#14161C'], light: '#FF4D2E', pat: 'tijolo', props: ['escadas', 'janela', 'correntes'] },
  escritorio: { wall: ['#3A4040', '#1C2020'], floor: ['#2A3030', '#141818'], light: '#C8F0FF', pat: 'metal', props: ['secretaria', 'lampada', 'pergaminho'] },
  pantano: { wall: ['#2A3424', '#10160C'], floor: ['#2A3020', '#141A0C'], light: '#C6FF3A', pat: 'caverna', props: ['arvore_morta', 'nevoa', 'olhos'], kind: 'lama' },
  relogio: { wall: ['#3A2A2A', '#1A1010'], floor: ['#2A2222', '#140E0E'], light: '#FF3B3B', pat: 'metal', props: ['engrenagens', 'pendulo', 'vela'] },
  catacumbas: { wall: ['#4A4438', '#1E1A14'], floor: ['#2A2620', '#14120E'], light: '#E8E2D4', pat: 'ossario', props: ['caveiras', 'vela', 'correntes'] },
  fortaleza: { wall: ['#3A3A3E', '#18181C'], floor: ['#2A2A2E', '#141418'], light: '#FF8A3B', pat: 'tijolo', props: ['estandarte', 'pilar', 'espinhos'] },
  necropole: { wall: ['#2A2A34', '#101016'], floor: ['#24242C', '#101016'], light: '#9BE7FF', pat: 'pedra', props: ['sarcofago', 'caveiras', 'vela'] },
  templo: { wall: ['#1E3A3A', '#0C1A1A'], floor: ['#1E3A44', '#0C2028'], light: '#5AFFD8', pat: 'marmore', props: ['coluna_partida', 'heras', 'altar'], fl: 'agua' },
  cidadela: { wall: ['#44403A', '#1C1A16'], floor: ['#2E2C28', '#161412'], light: '#FFD23B', pat: 'tijolo', props: ['estandarte', 'janela', 'pilar'] },
  fosso: { wall: ['#3A1E1A', '#160A08'], floor: ['#2A1410', '#100604'], light: '#FF2D1F', pat: 'caverna', props: ['espinhos', 'correntes', 'ossos'], fl: 'lava' },
  santuario: { wall: ['#3A2A3A', '#160E16'], floor: ['#2A1E2A', '#120A12'], light: '#FF4DAA', pat: 'marmore', props: ['altar', 'vitral', 'vela'] },
  cripta: { wall: ['#34302C', '#141210'], floor: ['#24201C', '#100E0C'], light: '#C8A0FF', pat: 'ossario', props: ['sarcofago', 'olhos', 'correntes'] } };
const MAP = { corpo: ['forja', 'arena'], mente: ['labirinto', 'espelhos'], intelecto: ['biblioteca', 'arquivo'], fortuna: ['cofre', 'mina'], relacoes: ['ruinas', 'ilha'], espirito: ['catedral', 'deserto'], carreira: ['torre', 'escritorio'], disciplina: ['pantano', 'relogio'] };
const ALLT = Object.keys(TH), AK = Object.keys(MAP);
// o tema de cada masmorra: os dois primeiros círculos têm o seu; depois roda por todos (e as cores mudam um pouco em cada círculo)
const themeOf = (a, t) => { if (t <= 2) return TH[MAP[a][t - 1]]; const k = ALLT[(t * 7 + AK.indexOf(a) * 3) % ALLT.length], B = TH[k], hs = ((t * 37) % 60 - 30) / 100;
  const tw = c => { const [r, g, b] = hx(c); return toHex([r * (1 + hs), g, b * (1 - hs)]); }; return Object.assign({}, B, { wall: B.wall.map(tw), floor: B.floor.map(tw) }); };
const CACHE = {};
/* sala: a = área, t = círculo, f = andar (0–4) ou 5 = sala do chefe */
const scene = (a, t, f) => { const key = a + t + '|' + f; if (CACHE[key]) return CACHE[key]; const T = themeOf(a, t) || TH.catacumbas, r = rng('sala' + key), boss = f >= 5, depth = Math.min(1, ((t - 1) * 6 + f) / 18), C = cv();
  const wa = [shift(T.wall[0], depth * .8), shift(T.wall[1], depth * .8)], fa = [shift(T.floor[0], depth * .8), shift(T.floor[1], depth * .8)], Tm = Object.assign({}, T, { wall: wa, floor: fa });
  (WALL[T.pat] || WALL.pedra)(C, wa[0], wa[1], r); FLOOR(C, fa[0], fa[1], T.kind, r); C.rect(0, FL - 1, W - 1, FL, mix(wa[1], '#000000', .4));
  // a porta para o andar seguinte (ou o portão do chefe)
  const gw = boss ? 22 : 13 + (f % 3) * 2, gh = boss ? 52 : 34 + (f % 2) * 6, gx = W / 2; C.rect(gx - gw - 3, FL - gh - 3, gx + gw + 3, FL - 1, mix(wa[0], '#FFFFFF', .1)); C.ell(gx, FL - gh, gw + 3, gw * .55 + 3, mix(wa[0], '#FFFFFF', .1));
  C.rect(gx - gw, FL - gh, gx + gw, FL - 1, (x, y) => mix('#020104', T.light, Math.max(0, (y - (FL - gh)) / gh) * .08)); C.ell(gx, FL - gh, gw, gw * .55, '#020104');
  if (boss) { for (let y = FL - gh + 4; y < FL; y += 6) C.rect(gx - gw, y, gx + gw, y, '#3A2A2A'); for (let x = gx - gw + 3; x < gx + gw; x += 6) C.rect(x, FL - gh - 6, x, FL - 1, '#4A3A3A'); [-gw - 8, gw + 8].forEach(dx => { C.put(gx + dx, FL - gh + 6, '#FF2D3B'); C.put(gx + dx, FL - gh + 14, '#FF2D3B'); C.glow(gx + dx, FL - gh + 10, 10, '#FF2D3B', .4); });
    C.rect(gx - 9, FL - 22, gx + 9, FL - 1, '#2A1A14'); C.rect(gx - 11, FL - 30, gx + 11, FL - 22, '#3A2418'); for (let k = -2; k <= 2; k++) C.rect(gx + k * 4 - 1, FL - 36 + Math.abs(k) * 2, gx + k * 4 + 1, FL - 30, '#C8A04A'); }
  else { const n = f + 1; for (let k = 0; k < n; k++) C.put(gx - (n - 1) * 2 + k * 4, FL - gh - gw * .55 - 5, T.light); }
  // objetos do tema: cada andar arruma-os de outra forma
  const L = T.props.slice(), order = L.map((p, i) => [p, r()]).sort((x, y) => x[1] - y[1]).map(x => x[0]), sides = [[30, W - 30], [60, W - 60]];
  order.slice(0, 2).forEach((p, i) => { const [xl, xr] = sides[i]; if (['carris', 'dunas', 'nevoa', 'agua'].includes(p)) { P[p](C, W / 2, FL, Tm, r); return; } P[p](C, (f + i) % 2 ? xr : xl, FL, Tm, r); if (f >= 2 || boss) P[p](C, (f + i) % 2 ? xl : xr, FL, Tm, rng(key + p)); });
  if (T.fl) P[T.fl](C, f % 2 ? 40 : W - 40, FL, Tm, r);
  // luz: tochas (menos nas masmorras de luz própria) e cada vez mais escuro e mais partido
  if (!['mina', 'ilha', 'escritorio'].includes(Object.keys(TH).find(k => TH[k] === T) || '')) { P.tocha(C, gx - gw - 16, FL - 40, Tm); P.tocha(C, gx + gw + 16, FL - 40, Tm); }
  for (let k = 0; k < Math.round(depth * 14 + f); k++) { let x = r() * W, y = r() * FL; for (let s = 0; s < 6 + r() * 10; s++) { C.dark(Math.round(x), Math.round(y), .55); x += Math.round(r() * 2 - 1); y += 1; } }
  for (let k = 0; k < Math.round(depth * 6); k++) C.ell(r() * W, FL + 4 + r() * 20, 3 + r() * 5, 1 + r() * 1.5, (x, y) => mix(C.at(x, y), '#5A0610', .5));
  if (boss || depth > .5) P.caveiras(C, f % 2 ? 22 : W - 22, FL, Tm, r);
  // vinheta (mais fechada quanto mais fundo)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot((x - W / 2) / (W / 2), (y - H * .62) / (H * .8)); if (d > .55) C.dark(x, y, Math.min(.85, (d - .55) * (1.1 + depth * .9))); }
  if (boss) C.glow(gx, FL - 10, 60, '#FF2D3B', .18);
  let url = ''; try { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H); C.px.forEach((v, i) => { const [rr, g, b] = hx(v); im.data[i * 4] = rr; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; }); x.putImageData(im, 0, 0); url = c.toDataURL('image/png'); } catch (e) { }
  return (CACHE[key] = url); };
OS.Masm = { scene, themeOf, THEMES: Object.keys(TH) };
})();
