/* PRUMO — o bestiário do Dominus: monstros e chefes em pixel art (64 × 64), sinistros, como os chefes do Terraria.
   Cada monstro é desenhado a partir de um corpo-base (golem, hidra, espectro, dragão, demónio, olho, aranha, lich, verme, lodo,
   titã, gárgula, vazio, lobo, cavaleiro oco) com a sua paleta, olhos que brilham, contorno escuro colorido e uma aura.
   Ferido ganha rachas; derrotado fica cinzento com os olhos apagados. A imagem é feita uma vez e guardada como PNG. */
(() => {
'use strict';
const W = 96, H = 96; // v2.53: mais resolução (os desenhos são feitos numa grelha de 64 e ampliados ×1,5 com o mesmo detalhe)
/* ---------- cor ---------- */
const hx = h => { h = String(h || '#000000'); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16) || 0, parseInt(h.slice(3, 5), 16) || 0, parseInt(h.slice(5, 7), 16) || 0]; }, toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v * (1 - t) + B[i] * t)); };
const toHsl = h => { let [r, g, b] = hx(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let Hh = 0, S = 0;
  if (mx !== mn) { const d = mx - mn; S = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); Hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; Hh *= 60; } return [Hh, S, l]; };
const fromHsl = (Hh, S, l) => { Hh = ((Hh % 360) + 360) % 360; S = Math.max(0, Math.min(1, S)); l = Math.max(0, Math.min(1, l)); const q = l < .5 ? l * (1 + S) : l + S - l * S, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return toHex([f(Hh / 360 + 1 / 3), f(Hh / 360), f(Hh / 360 - 1 / 3)].map(v => v * 255)); };
const toward = (h, T, a) => { const d = ((T - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), a); };
// rampa de 6 tons: contorno, sombra funda, sombra, base, luz, brilho (sombras para o violeta, luzes para o amarelo-pálido)
const RAMP = c => { const [h, s, l] = toHsl(c); return [fromHsl(toward(h, 265, 30), Math.min(1, s + .15), l * .22), fromHsl(toward(h, 265, 20), Math.min(1, s + .1), l * .48), fromHsl(toward(h, 265, 9), s, l * .74), c,
  fromHsl(toward(h, 60, 8), s * .92, l + (1 - l) * .2), fromHsl(toward(h, 60, 14), s * .75, l + (1 - l) * .45)]; };
const grey = c => { const [h, s, l] = toHsl(c); return fromHsl(h, s * .12, l * .7); };
const rng = seed => { let x = 2166136261; for (const ch of String(seed)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return () => { x = Math.imul(x ^ (x >>> 15), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); x ^= x >>> 16; return (x >>> 0) / 4294967296; }; };
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/* ---------- máscaras (conjuntos de píxeis) ---------- */
const ok = (x, y) => x >= 0 && x < W && y >= 0 && y < H, id = (x, y) => y * W + x;
const M = {
  ell: (cx, cy, rx, ry) => { const s = new Set(); for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const a = (x + .5 - cx) / rx, b = (y + .5 - cy) / ry; if (a * a + b * b <= 1 && ok(x, y)) s.add(id(x, y)); } return s; },
  rect: (x0, y0, x1, y1) => { const s = new Set(); for (let y = Math.round(y0); y <= y1; y++) for (let x = Math.round(x0); x <= x1; x++) if (ok(x, y)) s.add(id(x, y)); return s; },
  poly: pts => { const s = new Set(), ys = pts.map(p => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], yy = y + .5; if ((y0 <= yy && y1 > yy) || (y1 <= yy && y0 > yy)) xs.push(x0 + (yy - y0) / (y1 - y0) * (x1 - x0)); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x <= Math.floor(xs[k + 1] - .5); x++) if (ok(x, y)) s.add(id(x, y)); } return s; },
  // traço com espessura que afina (pescoços, patas, chifres, tentáculos)
  cap: (x0, y0, x1, y1, r0, r1 = r0) => { const s = new Set(), n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n; M.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.max(.5, r0 + (r1 - r0) * t), Math.max(.5, r0 + (r1 - r0) * t)).forEach(v => s.add(v)); } return s; },
  // curva (quadrática) com espessura
  curve: (p0, p1, p2, r0, r1 = r0) => { const s = new Set(), n = 24; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t, x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1], r = r0 + (r1 - r0) * t; M.ell(x, y, Math.max(.6, r), Math.max(.6, r)).forEach(v => s.add(v)); } return s; },
  U: (...a) => { const s = new Set(); a.forEach(t => t && t.forEach(i => s.add(i))); return s; },
  X: (a, ...b) => { const s = new Set(a); b.forEach(t => t && t.forEach(i => s.delete(i))); return s; },
  mir: a => new Set([...a].map(i => id(W - 1 - (i % W), (i / W) | 0))),
  both: a => M.U(a, M.mir(a)),
  where: (a, f) => new Set([...a].filter(i => f(i % W, (i / W) | 0))) };

/* ---------- tela ---------- */
const canvas = () => { const px = new Array(W * H).fill(null), C = { px, solid: new Set() };
  C.put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (c && ok(x, y)) { px[id(x, y)] = c; C.solid.add(id(x, y)); } };
  C.at = (x, y) => ok(x, y) ? px[id(x, y)] : null;
  C.line = (x0, y0, x1, y1, c) => { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (let k = 0; k < 400; k++) { C.put(x0, y0, typeof c === 'function' ? c(x0, y0) : c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
  // pinta com volume: luz de cima à esquerda, contorno com a cor mais escura da rampa
  C.vol = (m, col, o = {}) => { const R = Array.isArray(col) ? col : RAMP(col), h = i => m.has(i), lx = o.lx != null ? o.lx : .55;
    m.forEach(i => { const x = i % W, y = (i / W) | 0, L = x > 0 && h(i - 1), Rr = x < W - 1 && h(i + 1), Up = y > 0 && h(i - W), Dn = y < H - 1 && h(i + W);
      let c; if (!(L && Rr && Up && Dn) && !o.noline) c = R[0];
      else { let dl = 0, dr = 0, du = 0, dd = 0; while (x - dl - 1 >= 0 && h(i - dl - 1)) dl++; while (x + dr + 1 < W && h(i + dr + 1)) dr++; while (y - du - 1 >= 0 && h(i - (du + 1) * W)) du++; while (y + dd + 1 < H && h(i + (dd + 1) * W)) dd++;
        const v = lx * (dl / ((dl + dr) || 1)) + (1 - lx) * (du / ((du + dd) || 1)), b = BAY[y & 3][x & 3] / 16 * .08 - .04 + v;
        c = b < (o.hi || .1) && o.shine !== false ? R[5] : b < .28 ? R[4] : b < .55 ? R[3] : b < .8 ? R[2] : R[1]; }
      C.put(x, y, c); }); return R; };
  // brilho à volta (olhos, lava, runas): mistura a cor por cima do que lá está
  C.glow = (cx, cy, r, c, k = .55) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { if (!ok(x, y)) continue; const d = Math.hypot(x + .5 - cx, y + .5 - cy) / r; if (d > 1) continue; const t = k * (1 - d) * (1 - d), cur = px[id(x, y)];
    if (cur) px[id(x, y)] = mix(cur, c, t); } };
  // olho que brilha: núcleo claro, íris e halo
  C.eye = (x, y, r, c, o = {}) => { if (o.dead) { C.put(x, y, '#2A2A2E'); if (r >= 2) { C.put(x - 1, y - 1, '#2A2A2E'); C.put(x + 1, y + 1, '#2A2A2E'); C.put(x + 1, y - 1, '#2A2A2E'); C.put(x - 1, y + 1, '#2A2A2E'); } return; }
    C.glow(x + .5, y + .5, r + 3.5, c, .6); if (r <= 1) { C.put(x, y, mix(c, '#FFFFFF', .55)); if (o.wide) C.put(x + 1, y, c); return; }
    M.ell(x + .5, y + .5, r, o.slit ? r * .7 : r).forEach(i => C.put(i % W, (i / W) | 0, c)); C.put(x, y, mix(c, '#FFFFFF', .75)); if (o.slit) { C.put(x, y - 1, '#0A0508'); C.put(x, y + 1, '#0A0508'); } else C.put(x - 1, y - 1, '#FFFFFF'); };
  C.fill = (m, c) => m.forEach(i => C.put(i % W, (i / W) | 0, typeof c === 'function' ? c(i % W, (i / W) | 0) : c));
  return C; };

/* ---------- corpos-base ---------- */
// cada um recebe a tela C, as cores o.b (corpo), o.a (olhos/brilho), o.c (2.ª cor), o.r (aleatório), o.t (ameaça 0–3), o.dead
const fang = (C, x, y, len, c = '#E9E2CF', dir = 1) => { for (let k = 0; k < len; k++) C.put(x, y + k * dir, k === len - 1 ? mix(c, '#7A6E5A', .4) : c); };
const crack = (C, r, m, n, c) => { const L = [...m]; for (let k = 0; k < n; k++) { let i = L[Math.floor(r() * L.length)], x = i % W, y = (i / W) | 0; for (let s = 0; s < 6 + r() * 6; s++) { if (m.has(id(x, y))) C.put(x, y, c); x += Math.round(r() * 2 - 1); y += r() < .7 ? 1 : 0; } } };
const P = {
  golem: (C, o) => { const r = o.r, legs = M.both(M.rect(17, 48, 27, 61)), feet = M.both(M.rect(14, 58, 28, 62)), torso = M.poly([[11, 22], [24, 17], [40, 17], [53, 22], [55, 37], [49, 50], [15, 50], [9, 37]]);
    const arm = M.U(M.cap(12, 25, 7, 42, 6, 5), M.rect(1, 40, 13, 54)), arms = M.both(arm), head = M.poly([[25, 7], [39, 7], [41, 19], [23, 19]]);
    C.vol(M.U(legs, feet), mix(o.b, '#000000', .25)); C.vol(arms, o.b); C.vol(torso, o.b); C.vol(head, mix(o.b, '#FFFFFF', .06));
    // pedras soltas e musgo
    for (let k = 0; k < 14; k++) { const x = 12 + Math.floor(r() * 40), y = 20 + Math.floor(r() * 30); if (torso.has(id(x, y))) { C.put(x, y, RAMP(o.b)[1]); C.put(x + 1, y, RAMP(o.b)[4]); } }
    crack(C, r, torso, 4 + o.t, o.a); crack(C, r, arms, 2 + o.t, o.a); [[20, 30], [44, 32], [32, 42], [6, 47], [58, 47]].forEach(([x, y]) => C.glow(x, y, 6, o.a, .35));
    C.eye(28, 13, 1, o.a, { dead: o.dead, wide: 1 }); C.eye(35, 13, 1, o.a, { dead: o.dead, wide: 1 }); C.line(29, 16, 35, 16, RAMP(o.b)[0]);
    if (o.t >= 2) { C.vol(M.both(M.poly([[22, 18], [16, 8], [25, 15]])), mix(o.b, '#000000', .2)); } },
  hidra: (C, o) => { const r = o.r, n = 3 + Math.min(2, o.t), body = M.U(M.ell(32, 53, 21, 10), M.ell(32, 60, 26, 5)), xs = n === 3 ? [12, 32, 52] : n === 4 ? [9, 24, 40, 55] : [8, 20, 32, 44, 56];
    C.vol(body, mix(o.b, '#000000', .2));
    xs.forEach((hx2, k) => { const hy = k % 2 ? 14 : 20 - (hx2 === 32 ? 12 : 0), neck = M.curve([32 + (hx2 - 32) * .3, 50], [hx2 + (hx2 < 32 ? -6 : 6), 36], [hx2, hy + 5], 4.5, 3);
      C.vol(neck, o.b);
      neck.forEach(i => { const x = i % W, y = (i / W) | 0; if ((x + y * 2) % 5 === 0 && C.at(x, y) !== RAMP(o.b)[0]) C.put(x, y, RAMP(o.b)[2]); });
      const head = M.U(M.ell(hx2, hy, 6, 4.5), M.poly([[hx2 - 4, hy + 2], [hx2 + 4, hy + 2], [hx2 + 1, hy + 8], [hx2 - 1, hy + 8]])); C.vol(head, mix(o.b, '#FFFFFF', .05));
      C.fill(M.poly([[hx2 - 3, hy + 3], [hx2 + 3, hy + 3], [hx2, hy + 7]]), '#1A0408'); fang(C, hx2 - 2, hy + 3, 3); fang(C, hx2 + 2, hy + 3, 3); C.put(hx2, hy + 4, mix(o.a, '#FF0000', .5));
      C.vol(M.cap(hx2 - 4, hy - 2, hx2 - 7, hy - 7, 1.2, .5), RAMP(o.b)[1]); C.vol(M.cap(hx2 + 4, hy - 2, hx2 + 7, hy - 7, 1.2, .5), RAMP(o.b)[1]);
      C.eye(hx2 - 3, hy - 1, 1, o.a, { dead: o.dead }); C.eye(hx2 + 2, hy - 1, 1, o.a, { dead: o.dead }); }); },
  espectro: (C, o) => { const r = o.r, hem = [], N = 12; for (let k = 0; k <= N; k++) hem.push([6 + k * 52 / N, 56 + (k % 2 ? -6 : 3) + Math.round(r() * 3)]);
    const cloak = M.poly([[32, 3], [44, 12], [50, 30], [58, 50]].concat(hem.slice().reverse()).concat([[6, 50], [14, 30], [20, 12]])); C.vol(cloak, o.b, { lx: .7 });
    // rasgões
    for (let k = 0; k < 6; k++) { const x = 10 + Math.floor(r() * 44); for (let y = 48; y < 60; y++) if (r() < .55) C.px[id(x, y)] = null; }
    const void_ = M.ell(32, 18, 9, 10); C.fill(void_, (x, y) => mix('#020106', o.a, Math.max(0, .12 - Math.hypot(x - 32, y - 16) / 80)));
    C.eye(28, 17, 1, o.a, { dead: o.dead, wide: 1 }); C.eye(35, 17, 1, o.a, { dead: o.dead, wide: 1 });
    // mãos ossudas
    [[12, 36, -1], [52, 36, 1]].forEach(([x, y, s]) => { const bone = '#C9C2B2'; C.line(x, y, x + 6 * s, y + 4, bone); C.line(x + 6 * s, y + 4, x + 9 * s, y + 2, bone); C.line(x + 6 * s, y + 4, x + 10 * s, y + 6, bone); C.line(x + 6 * s, y + 4, x + 8 * s, y + 9, bone); });
    for (let k = 0; k < 30; k++) { const x = 4 + r() * 56, y = 40 + r() * 23; if (!C.at(x, y)) C.put(x, y, mix(o.a, '#000000', .55 + r() * .3)); }
    C.glow(32, 18, 14, o.a, .2); },
  dragao: (C, o) => { const r = o.r, wing = M.poly([[26, 24], [12, 6], [2, 4], [6, 14], [1, 22], [7, 28], [3, 36], [11, 38], [10, 46], [24, 40]]), wings = M.both(wing);
    C.vol(wings, mix(o.b, '#000000', .35), { lx: .3 }); [[12, 6, 24, 26], [6, 14, 24, 30], [7, 28, 25, 34], [11, 38, 25, 38]].forEach(([a, b, c, d]) => { C.line(a, b, c, d, RAMP(o.b)[1]); C.line(63 - a, b, 63 - c, d, RAMP(o.b)[1]); });
    const neck = M.cap(32, 50, 32, 28, 9, 6), chest = M.ell(32, 54, 14, 10); C.vol(M.U(chest, neck), o.b);
    neck.forEach(i => { const x = i % W, y = (i / W) | 0; if (Math.abs(x - 32) <= 3 && y % 3 === 0) C.put(x, y, mix(o.c || '#C9A060', '#000000', .3)); });
    const head = M.poly([[22, 14], [27, 9], [37, 9], [42, 14], [40, 24], [36, 32], [28, 32], [24, 24]]); C.vol(head, mix(o.b, '#FFFFFF', .05));
    C.vol(M.both(M.curve([25, 11], [16, 6], [14, -2], 2.2, .6)), mix(o.c || '#C9A060', '#000000', .2)); if (o.t >= 1) C.vol(M.both(M.curve([24, 16], [15, 15], [11, 10], 1.6, .5)), mix(o.c || '#C9A060', '#000000', .3));
    const maw = M.poly([[27, 25], [37, 25], [35, 32], [29, 32]]); C.fill(maw, (x, y) => mix('#2A0500', o.a, (y - 25) / 9)); fang(C, 28, 25, 3); fang(C, 36, 25, 3); fang(C, 30, 32, 2, '#E9E2CF', -1); fang(C, 34, 32, 2, '#E9E2CF', -1);
    C.glow(32, 31, 10, o.a, .55); C.eye(27, 17, 1, o.a, { dead: o.dead, slit: 1 }); C.eye(36, 17, 1, o.a, { dead: o.dead, slit: 1 }); C.put(30, 22, '#05020A'); C.put(33, 22, '#05020A'); },
  demonio: (C, o) => { const r = o.r, body = M.U(M.poly([[16, 26], [48, 26], [44, 48], [38, 58], [26, 58], [20, 48]]), M.ell(32, 30, 18, 8)), arm = M.U(M.cap(16, 28, 8, 44, 5, 4), M.cap(8, 44, 10, 54, 4, 3)), arms = M.both(arm);
    if (o.t >= 1) { const wing = M.poly([[20, 26], [6, 6], [0, 18], [3, 30], [8, 40]]); C.vol(M.both(wing), mix(o.b, '#000000', .45), { lx: .3 }); }
    C.vol(arms, o.b); C.vol(body, o.b);
    [[24, 34], [40, 34], [28, 42], [36, 42]].forEach(([x, y]) => C.put(x, y, RAMP(o.b)[1])); C.line(32, 32, 32, 50, RAMP(o.b)[1]);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) C.line(32 + s * (22 + k), 55, 32 + s * (24 + k), 59, '#E9E2CF');
    const head = M.U(M.ell(32, 18, 9, 9), M.poly([[26, 20], [38, 20], [35, 28], [29, 28]])); C.vol(head, mix(o.b, '#FFFFFF', .04));
    C.vol(M.both(M.curve([25, 12], [14, 10], [12, 0], 3, .6)), mix(o.c || '#2A2020', '#000000', .1)); if (o.t >= 2) C.vol(M.both(M.curve([27, 10], [23, 2], [26, -2], 1.5, .5)), mix(o.c || '#2A2020', '#000000', .1));
    C.eye(28, 17, 1, o.a, { dead: o.dead, wide: 1 }); C.eye(35, 17, 1, o.a, { dead: o.dead, wide: 1 }); C.line(28, 15, 30, 16, RAMP(o.b)[0]); C.line(34, 16, 36, 15, RAMP(o.b)[0]);
    C.fill(M.poly([[27, 23], [37, 23], [34, 27], [30, 27]]), '#120206'); for (let x = 28; x <= 36; x += 2) C.put(x, 23, '#EDE6D2'); C.glow(32, 26, 6, o.a, .3); },
  olho: (C, o) => { const r = o.r, n = 5 + o.t * 2, ball = M.ell(32, 34, 20, 19); for (let k = 0; k < n; k++) { const a = -Math.PI * (.12 + .76 * k / (n - 1)), x1 = 32 + Math.cos(a) * 30, y1 = 32 + Math.sin(a) * 30, stalk = M.curve([32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14], [32 + Math.cos(a + .3) * 24, 30 + Math.sin(a + .3) * 22], [x1, y1], 2, 1.2);
      C.vol(stalk, mix(o.b, '#000000', .15)); C.vol(M.ell(x1, y1, 2.6, 2.6), '#D8D0C8'); C.eye(Math.round(x1), Math.round(y1), 1, o.a, { dead: o.dead }); }
    C.vol(ball, o.b); const sc = M.ell(32, 33, 12, 10); C.fill(sc, (x, y) => mix('#E6DDD2', '#B88A8A', Math.hypot(x - 32, y - 33) / 14));
    for (let k = 0; k < 7; k++) { let x = 32 + Math.round((r() - .5) * 22), y = 33 + Math.round((r() - .5) * 18); for (let s = 0; s < 5; s++) { if (sc.has(id(x, y))) C.put(x, y, '#A33A3A'); x += Math.round((32 - x) / 6 + r() - .5); y += Math.round((33 - y) / 6 + r() - .5); } }
    if (o.dead) C.fill(M.ell(32, 33, 6, 6), '#5A5A5E'); else { C.fill(M.ell(32, 33, 6, 6), o.a); C.fill(M.ell(32, 33, 4, 4), mix(o.a, '#000000', .25)); C.fill(M.rect(31, 28, 32, 38), '#050208'); C.put(29, 30, '#FFFFFF'); C.glow(32, 33, 10, o.a, .3); }
    C.fill(M.where(M.ell(32, 33, 13, 11), (x, y) => y < 24 + Math.abs(x - 32) * .3), RAMP(o.b)[1]);
    const mouth = M.poly([[22, 46], [42, 46], [38, 51], [26, 51]]); C.fill(mouth, '#14030A'); for (let x = 23; x <= 41; x += 2) { C.put(x, 46, '#E9E2CF'); C.put(x + 1, 51, '#E9E2CF'); } },
  aranha: (C, o) => { const r = o.r; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const sx = 32 + s * 7, sy = 36 + k * 3, kx = 32 + s * (18 + k * 2), ky = 22 + k * 8, fx = 32 + s * (27 + k), fy = 46 + k * 4;
      C.vol(M.U(M.cap(sx, sy, kx, ky, 2, 1.6), M.cap(kx, ky, fx, fy, 1.6, .7)), mix(o.b, '#000000', .1)); C.put(kx, ky, RAMP(o.b)[4]); }
    const abd = M.ell(32, 18, 15, 13), tho = M.ell(32, 39, 10, 8); C.vol(abd, o.b); C.vol(tho, mix(o.b, '#FFFFFF', .04));
    // marca de caveira nas costas
    const sk = o.c || o.a; C.fill(M.ell(32, 16, 5, 4.5), mix(sk, '#000000', .25)); C.fill(M.rect(30, 19, 34, 22), mix(sk, '#000000', .25)); C.put(30, 16, RAMP(o.b)[0]); C.put(34, 16, RAMP(o.b)[0]); C.put(32, 21, RAMP(o.b)[0]);
    [[28, 36], [36, 36], [30, 34], [34, 34], [26, 38], [38, 38], [31, 38], [33, 38]].forEach(([x, y], k) => C.eye(x, y, k < 2 ? 1 : 0, o.a, { dead: o.dead }));
    C.vol(M.both(M.cap(30, 44, 28, 50, 1.6, .5)), '#2A1E1E'); for (let k = 0; k < 6; k++) C.put(20 + r() * 24, 58 + r() * 4, '#C8C0C8'); },
  caveira: (C, o) => { const r = o.r, robe = M.poly([[18, 30], [46, 30], [56, 62], [8, 62]]); C.vol(robe, o.c || '#2A1F3A', { lx: .7 });
    for (let y = 34; y <= 46; y += 3) { C.line(24, y, 40, y, '#BDB4A0'); C.put(23, y + 1, '#8E8674'); C.put(41, y + 1, '#8E8674'); } C.line(32, 32, 32, 48, '#D8D0BC');
    C.vol(M.cap(52, 10, 52, 62, 1.2), '#4A3424'); C.vol(M.ell(52, 8, 4, 4), o.a, { shine: true }); C.glow(52, 8, 9, o.a, .5); C.line(44, 40, 52, 38, '#D8D0BC');
    const skull = M.U(M.ell(32, 16, 11, 11), M.rect(26, 22, 38, 30)); C.vol(skull, o.bone || '#D6CDB6');
    C.fill(M.ell(27.5, 17, 3, 3.5), '#08040A'); C.fill(M.ell(36.5, 17, 3, 3.5), '#08040A'); C.eye(27, 17, 0, o.a, { dead: o.dead }); C.eye(36, 17, 0, o.a, { dead: o.dead });
    C.fill(M.poly([[31, 21], [33, 21], [32, 24]]), '#08040A'); for (let x = 26; x <= 38; x += 2) { C.put(x, 27, '#08040A'); C.put(x, 29, '#08040A'); }
    const crown = M.U(M.rect(22, 5, 42, 8), ...[22, 27, 32, 37, 42].map(x => M.poly([[x - 2, 6], [x + 2, 6], [x, 0 + (x === 32 ? -1 : 2)]]))); C.vol(crown, o.metal || '#9A7A30');
    C.put(32, 6, o.a); C.glow(32, 6, 4, o.a, .4); crack(C, r, skull, o.t, '#6E6656'); },
  verme: (C, o) => { const body = M.U(M.rect(10, 26, 54, 64), M.ell(32, 26, 22, 22)); C.vol(body, o.b, { lx: .6 }); for (let y = 32; y < 64; y += 5) { C.line(10, y, 54, y + 1, RAMP(o.b)[1]); C.line(11, y + 1, 53, y + 2, RAMP(o.b)[4]); }
    C.fill(M.ell(32, 26, 18, 17), (x, y) => mix('#5A0A14', '#1A0206', Math.min(1, Math.hypot(x - 32, y - 26) / 18 * .3 + .2)));
    [[17, 14], [11.5, 11]].forEach(([R, T], ring) => { for (let j = 0; j < T; j++) { const a = (j + ring * .5) / T * Math.PI * 2, w = Math.PI / T * .8, p = r => [32 + Math.cos(a) * r, 26 + Math.sin(a) * r * .95], q = (r, d) => [32 + Math.cos(a + d) * r, 26 + Math.sin(a + d) * r * .95];
      const tooth = M.poly([q(R, -w), q(R, w), p(R - (ring ? 5 : 6.5))]); C.fill(tooth, (x, y) => Math.hypot(x - 32, y - 26) > R - 2 ? '#E8DEC6' : '#B8AC92'); } });
    C.fill(M.ell(32, 26, 5.5, 5), '#050104'); C.glow(32, 26, 9, o.a, .5); C.eye(32, 26, 0, o.a, { dead: o.dead });
    for (let k = 0; k < 5; k++) { const x = 20 + k * 6; for (let d = 0; d < 3 + (k % 3); d++) C.put(x, 40 + d, mix('#C8E06A', o.b, .5)); } },
  lodo: (C, o) => { const r = o.r, blob = M.U(M.ell(32, 44, 25, 18), M.ell(32, 30, 17, 15), M.ell(22, 52, 14, 10), M.ell(44, 52, 14, 10)); C.vol(blob, o.b, { lx: .45 });
    blob.forEach(i => { const x = i % W, y = (i / W) | 0; if (y < 40 && x < 30 && (x + y) % 7 === 0) C.put(x, y, RAMP(o.b)[5]); });
    // ossos e caveiras lá dentro
    [[24, 46], [40, 50]].forEach(([x, y]) => { C.fill(M.ell(x, y, 3.5, 3), mix('#D8D0BC', o.b, .45)); C.put(x - 1, y, mix('#000000', o.b, .5)); C.put(x + 1, y, mix('#000000', o.b, .5)); }); C.line(30, 55, 37, 53, mix('#D8D0BC', o.b, .45));
    for (let k = 0; k < 7; k++) { const x = 10 + Math.floor(r() * 44); let y = 50; while (y < 63 && blob.has(id(x, y))) y++; for (let d = 0; d < 2 + r() * 4; d++) C.put(x, y + d, RAMP(o.b)[d ? 2 : 3]); }
    C.eye(26, 28, 1, o.a, { dead: o.dead }); C.eye(37, 27, 2, o.a, { dead: o.dead }); if (o.t >= 1) C.eye(32, 36, 1, o.a, { dead: o.dead });
    const mouth = M.poly([[21, 37], [43, 37], [38, 44], [26, 44]]); C.fill(mouth, '#0E0306'); for (let x = 22; x <= 42; x += 3) { C.put(x, 37, '#E2D8C0'); C.put(x + 1, 38, '#E2D8C0'); C.put(x - 1, 43, '#C8BEA6'); } C.glow(32, 41, 6, o.a, .2); },
  tita: (C, o) => { const body = M.poly([[14, 24], [50, 24], [46, 52], [18, 52]]), legs = M.both(M.rect(18, 50, 29, 63)), pauld = M.both(M.ell(13, 24, 11, 8)), arms = M.both(M.U(M.cap(10, 28, 6, 50, 5, 4.5), M.ell(6, 52, 5, 5)));
    C.vol(legs, mix(o.b, '#000000', .25)); C.vol(arms, o.b); C.vol(body, o.b); C.vol(pauld, mix(o.b, '#FFFFFF', .08));
    C.line(20, 38, 44, 38, RAMP(o.b)[1]); C.fill(M.rect(18, 44, 46, 47), mix(o.c || '#5A4A30', '#000000', .2)); C.put(32, 45, o.a);
    // runas a brilhar no peito
    [[32, 30], [26, 33], [38, 33], [32, 36]].forEach(([x, y]) => { C.put(x, y, o.a); C.glow(x, y, 4, o.a, .3); }); C.line(26, 33, 32, 30, mix(o.a, '#000000', .3)); C.line(38, 33, 32, 30, mix(o.a, '#000000', .3));
    const helm = M.U(M.poly([[23, 8], [41, 8], [43, 20], [38, 26], [26, 26], [21, 20]]), M.rect(30, 2, 34, 8)); C.vol(helm, mix(o.b, '#FFFFFF', .05));
    C.fill(M.rect(25, 15, 39, 16), '#050208'); C.fill(M.rect(31, 15, 32, 23), '#050208'); if (!o.dead) { C.line(26, 15, 38, 15, o.a); C.glow(32, 15, 8, o.a, .45); }
    if (o.t >= 2) C.vol(M.both(M.curve([22, 12], [12, 8], [10, -1], 2, .6)), mix(o.c || '#5A4A30', '#000000', .1)); },
  garg: (C, o) => { const r = o.r, wing = M.poly([[28, 26], [16, 8], [4, 4], [0, 16], [2, 30], [6, 26], [8, 34], [13, 29], [16, 38], [20, 32], [24, 40]]); C.vol(M.both(wing), mix(o.b, '#000000', .3), { lx: .3 });
    [[16, 8, 26, 28], [4, 4, 26, 30], [2, 30, 26, 32]].forEach(([a, b, c, d]) => { C.line(a, b, c, d, RAMP(o.b)[1]); C.line(63 - a, b, 63 - c, d, RAMP(o.b)[1]); });
    const body = M.U(M.ell(32, 40, 9, 13), M.both(M.cap(26, 50, 22, 60, 3, 2))); C.vol(body, o.b); const head = M.ell(32, 24, 8, 7); C.vol(head, mix(o.b, '#FFFFFF', .05));
    C.vol(M.both(M.poly([[25, 22], [21, 8], [29, 18]])), o.b); C.eye(28, 23, 1, o.a, { dead: o.dead }); C.eye(35, 23, 1, o.a, { dead: o.dead });
    C.fill(M.rect(29, 27, 35, 28), '#12040A'); fang(C, 30, 27, 3); fang(C, 34, 27, 3); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) C.line(32 + s * (20 + k), 60, 32 + s * (21 + k), 63, '#D8D0BC'); },
  vazio: (C, o) => { const r = o.r, blob = M.U(M.ell(32, 30, 24, 22), M.ell(18, 46, 12, 10), M.ell(46, 46, 12, 10)); for (let k = 0; k < 7; k++) { const x = 10 + k * 7.3; M.curve([x, 46], [x + (r() - .5) * 14, 54], [x + (r() - .5) * 10, 63], 3, .6).forEach(i => blob.add(i)); }
    C.vol(blob, o.b, { lx: .7, shine: false }); blob.forEach(i => { const x = i % W, y = (i / W) | 0; if (BAY[y & 3][x & 3] === 0 && C.at(x, y) !== RAMP(o.b)[0]) C.put(x, y, mix(o.b, o.a, .3)); });
    const n = 6 + o.t * 3, spots = []; for (let k = 0; k < 60 && spots.length < n; k++) { const x = 13 + Math.round(r() * 38), y = 12 + Math.round(r() * 34), s = spots.length === 0 ? 3 : r() < .3 ? 2 : 1;
      if (blob.has(id(x, y)) && blob.has(id(x - s - 2, y)) && blob.has(id(x + s + 2, y)) && spots.every(([a, b, z]) => Math.hypot(a - x, b - y) > z + s + 4)) spots.push([x, y, s]); }
    spots.forEach(([x, y, s]) => { const lid = M.ell(x + .5, y + .5, s + 2.2, s * .8 + 1); C.fill(lid, '#0A0410'); C.fill(M.ell(x + .5, y + .5, s + 1.5, s * .6 + .6), mix('#E8E2EE', o.a, .2)); if (o.dead) C.line(x - s - 1, y, x + s + 1, y, '#2A2A2E');
      else { C.fill(M.ell(x + .5, y + .5, Math.max(.8, s * .7), Math.max(.8, s * .6)), o.a); C.put(x, y, '#05020A'); if (s > 1) C.put(x, y - 1, '#05020A'); C.glow(x + .5, y + .5, s + 4, o.a, .35); } });
    C.glow(32, 30, 30, o.a, .14); },
  lobo: (C, o) => { const r = o.r, head = M.poly([[12, 18], [20, 12], [44, 12], [52, 18], [54, 32], [46, 44], [40, 56], [24, 56], [18, 44], [10, 32]]), ears = M.both(M.poly([[13, 20], [10, 0], [24, 13]]));
    C.vol(ears, mix(o.b, '#000000', .15)); C.fill(M.both(M.poly([[14, 16], [12, 5], [20, 13]])), '#3A1A1E'); C.vol(head, o.b);
    // pelo eriçado nos lados
    for (let y = 22; y < 46; y += 3) { C.line(10 - (y % 2), y, 6, y + 2, RAMP(o.b)[1]); C.line(53 + (y % 2), y, 57, y + 2, RAMP(o.b)[1]); }
    const muzzle = M.poly([[24, 34], [40, 34], [38, 50], [26, 50]]); C.vol(muzzle, mix(o.b, '#FFFFFF', .15)); C.fill(M.ell(32, 36, 3.5, 2.2), '#08040A');
    C.fill(M.poly([[25, 44], [39, 44], [36, 50], [28, 50]]), '#2A0206'); for (let x = 26; x <= 38; x += 3) fang(C, x, 44, x === 26 || x === 38 ? 4 : 2); fang(C, 29, 50, 2, '#E9E2CF', -1); fang(C, 35, 50, 2, '#E9E2CF', -1);
    C.eye(23, 26, 1, o.a, { dead: o.dead, slit: 1 }); C.eye(40, 26, 1, o.a, { dead: o.dead, slit: 1 }); C.line(19, 22, 26, 25, RAMP(o.b)[0]); C.line(44, 22, 37, 25, RAMP(o.b)[0]);
    if (o.t >= 1) C.line(42, 16, 48, 30, '#C9B8B8'); },
  oco: (C, o) => { const r = o.r, cape = M.poly([[16, 22], [48, 22], [56, 62], [8, 62]]); C.vol(cape, o.c || '#3A0E14', { lx: .7 }); for (let k = 0; k < 8; k++) { const x = 9 + Math.floor(r() * 46); for (let y = 54; y < 63; y++) if (r() < .5) C.px[id(x, y)] = null; }
    const body = M.poly([[18, 22], [46, 22], [44, 46], [20, 46]]), legs = M.both(M.rect(21, 46, 30, 62)), pauld = M.both(M.ell(17, 23, 7, 5)); C.vol(legs, mix(o.b, '#000000', .2)); C.vol(body, o.b); C.vol(pauld, mix(o.b, '#FFFFFF', .1));
    C.line(32, 24, 32, 44, RAMP(o.b)[1]); crack(C, r, body, 2 + o.t, '#0A0608');
    C.vol(M.rect(49, 4, 52, 46), '#9AA6B8'); C.vol(M.rect(45, 44, 56, 46), '#5A4A30'); C.vol(M.rect(49, 47, 52, 54), '#3A2A1A'); C.line(50, 6, 50, 42, '#E6EEFA');
    const helm = M.U(M.poly([[24, 4], [40, 4], [42, 18], [32, 22], [22, 18]])); C.vol(helm, mix(o.b, '#FFFFFF', .05)); C.fill(M.rect(25, 11, 39, 12), '#030104'); if (!o.dead) { C.line(26, 11, 30, 11, o.a); C.line(34, 11, 38, 11, o.a); C.glow(32, 11, 9, o.a, .4); }
    if (o.t >= 1) C.vol(M.both(M.curve([25, 6], [18, 2], [16, -4], 1.6, .5)), '#2A2420'); },
  // v2.53: corpos novos, mais sinistros
  ceifeiro: (C, o) => { const r = o.r, B = mix(o.b, '#000000', .1);
    C.vol(M.cap(53, 5, 13, 63, 1.1), '#3A2C20'); C.vol(M.curve([53, 5], [36, -3], [21, 13], 2.6, .5), '#AEB8C4'); C.line(52, 5, 24, 10, '#EEF4FA'); if (!o.dead) C.glow(36, 4, 10, o.a, .25);
    const robe = M.poly([[32, 5], [43, 11], [48, 30], [55, 63], [9, 63], [16, 30], [21, 11]]); C.vol(robe, B, { lx: .72 }); for (let k = 0; k < 9; k++) { const x = 10 + Math.floor(r() * 44); for (let y = 52; y < 64; y++) if (r() < .55) C.px[id(x, y)] = null; }
    C.vol(M.poly([[32, 3], [45, 13], [45, 27], [19, 27], [19, 13]]), mix(B, '#000000', .25), { lx: .7 }); C.fill(M.ell(32, 19, 7.5, 7.5), (x, y) => mix('#010003', o.a, Math.max(0, .1 - Math.hypot(x - 32, y - 18) / 90)));
    C.eye(29, 18, 1, o.a, { dead: o.dead, wide: 1 }); C.eye(35, 18, 1, o.a, { dead: o.dead, wide: 1 });
    const bone = '#CFC6B2'; [[40, 33], [41, 37]].forEach(([x, y]) => { C.line(x, y, x + 6, y - 1, bone); C.line(x + 6, y - 1, x + 7, y + 2, bone); }); C.line(24, 36, 30, 34, bone); C.line(24, 36, 22, 39, bone);
    C.line(20, 40, 44, 40, RAMP(B)[0]); for (let k = 0; k < 3 + o.t; k++) C.put(26 + k * 4, 41, '#8A7A5A');
    for (let k = 0; k < 26; k++) { const x = 4 + r() * 56, y = 46 + r() * 17; if (!C.at(x, y)) C.put(x, y, mix(o.a, '#000000', .6 + r() * .3)); } },
  polvo: (C, o) => { const r = o.r, n = 6 + Math.min(3, o.t), R = RAMP(mix(o.b, '#000000', .08));
    for (let k = 0; k < n; k++) { const sx = 13 + k * (38 / (n - 1)), mx = sx + (r() - .5) * 22, ex = sx + (r() - .5) * 30, t = M.curve([sx, 32], [mx, 48], [ex, 63], 3.6, .7); C.vol(t, R);
      for (let j = 0; j < 4; j++) { const tt = .3 + j * .17, u = 1 - tt, x = u * u * sx + 2 * u * tt * mx + tt * tt * ex, y = u * u * 32 + 2 * u * tt * 48 + tt * tt * 63; C.put(x, y, R[4]); } }
    const head = M.U(M.ell(32, 21, 21, 18), M.ell(32, 33, 15, 6)); C.vol(head, R, { lx: .6 }); crack(C, r, head, 3 + o.t, mix(o.a, '#000000', .35));
    const E = [[24, 17, 2], [38, 15, 2], [31, 26, 1], [19, 26, 1], [44, 25, 1], [31, 9, 1]].slice(0, 3 + Math.min(3, o.t + 1)); E.forEach(([x, y, s]) => C.eye(x, y, s, o.a, { dead: o.dead, slit: s > 1 }));
    C.fill(M.ell(32, 35, 6, 3.5), '#1A0208'); for (let x = 27; x <= 37; x += 2) fang(C, x, 33, 2); fang(C, 30, 38, 2, '#E9E2CF', -1); fang(C, 34, 38, 2, '#E9E2CF', -1); },
  besta: (C, o) => { const r = o.r, B = o.b, legs = M.both(M.poly([[10, 34], [22, 32], [23, 58], [12, 60]]));
    C.vol(legs, mix(B, '#000000', .18)); [12, 16, 20].forEach(x => { fang(C, x, 60, 3, '#D8D0BC'); fang(C, 63 - x, 60, 3, '#D8D0BC'); });
    const back = M.ell(32, 28, 25, 13); C.vol(back, B, { lx: .6 }); for (let k = 0; k < 7 + o.t; k++) { const x = 12 + k * (40 / (6 + o.t)), y = 28 - Math.sqrt(Math.max(0, 1 - Math.pow((x - 32) / 25, 2))) * 13; C.vol(M.poly([[x - 2.5, y + 2], [x + 2.5, y + 2], [x + (r() - .5) * 3, y - 7 - r() * 5]]), '#2A2226'); }
    const head = M.poly([[20, 28], [44, 28], [47, 40], [41, 54], [23, 54], [17, 40]]); C.vol(head, mix(B, '#FFFFFF', .06));
    C.fill(M.poly([[23, 42], [41, 42], [38, 55], [26, 55]]), '#22020A'); for (let x = 24; x <= 40; x += 3) fang(C, x, 42, x === 24 || x === 39 ? 5 : 3); for (let x = 27; x <= 37; x += 3) fang(C, x, 55, 3, '#E9E2CF', -1);
    if (!o.dead) for (let k = 0; k < 3; k++) { const x = 27 + k * 5; C.line(x, 55, x, 58 + Math.floor(r() * 4), mix(o.a, '#FFFFFF', .2)); }
    [[24, 33], [40, 33], [27, 37], [37, 37]].slice(0, 2 + Math.min(2, o.t + 1)).forEach(([x, y]) => C.eye(x, y, 1, o.a, { dead: o.dead, slit: 1 })); C.line(20, 30, 28, 34, RAMP(B)[0]); C.line(44, 30, 36, 34, RAMP(B)[0]); },
  cranio: (C, o) => { const r = o.r, F = o.dead ? '#3A3A40' : o.a;
    for (let k = 0; k < 16; k++) { const x = 18 + r() * 28, h = 10 + r() * 18; C.fill(M.cap(x, 30, x + (r() - .5) * 10, 30 - h, 4.2, .5), (xx, yy) => mix(F, '#FFF4C0', Math.max(0, (yy - 4) / 60) * .2 + .05)); }
    if (!o.dead) C.glow(32, 18, 26, F, .35);
    const bone = mix(o.b, '#D8D0BC', .62), sk = M.U(M.ell(32, 27, 16, 15), M.rect(22, 34, 42, 42)); C.vol(sk, bone, { lx: .55 }); crack(C, r, sk, 2 + o.t, '#3A2A20');
    C.fill(M.U(M.ell(25.5, 28, 5, 5.5), M.ell(38.5, 28, 5, 5.5)), '#050206'); C.eye(25, 29, 1, F, { dead: o.dead, wide: 1 }); C.eye(38, 29, 1, F, { dead: o.dead, wide: 1 });
    C.fill(M.poly([[30, 34], [34, 34], [32, 38]]), '#120608'); for (let x = 24; x <= 40; x += 2) { C.put(x, 41, '#F0E8D8'); C.put(x, 42, '#B8AE98'); }
    const jaw = M.poly([[23, 47], [41, 47], [38, 56], [26, 56]]); C.vol(jaw, mix(bone, '#000000', .1)); for (let x = 25; x <= 39; x += 2) C.put(x, 47, '#F0E8D8'); C.fill(M.rect(23, 43, 41, 46), '#1A0206');
    for (let k = 0; k < 14; k++) C.put(10 + r() * 44, 44 + r() * 18, mix(F, '#000000', .3 + r() * .4)); } };


/* ---------- o bestiário ---------- */
// [id, nome, atributo, corpo-base, cor do corpo, cor dos olhos/brilho, 2.ª cor, história]
const A = 'corpo mente intelecto fortuna relacoes espirito carreira disciplina'.split(' ');
const BOSSES = [
  ['golem', 'Golem da Preguiça', 'corpo', 'golem', '#4E4756', '#FF5A1F', '', 'Pesa toneladas e alimenta-se de sofá. Cada treino que falhas é mais uma pedra no corpo dele.'],
  ['hidra', 'Hidra da Distração', 'mente', 'hidra', '#2E5A4A', '#E8FF5A', '', 'Cada notificação faz-lhe nascer uma cabeça nova. Só o foco fundo lhe corta os pescoços.'],
  ['sombra', 'Sombra da Ignorância', 'intelecto', 'olho', '#3B2A4A', '#C6FF3A', '', 'Um olho que vê tudo o que não sabes. Cresce em cada página que não abres.'],
  ['dragao', 'Dragão do Desperdício', 'fortuna', 'dragao', '#5A1E24', '#FFB13B', '#B8925A', 'Dorme em cima do teu dinheiro mal gasto e cospe fogo em cada compra por impulso.'],
  ['espectro', 'Espectro do Isolamento', 'relacoes', 'espectro', '#26283A', '#7DF9FF', '', 'Afasta-te de quem gostas, um dia de cada vez, até ficares sozinho no escuro.'],
  ['vazio', 'O Vazio', 'espirito', 'vazio', '#140B22', '#B388FF', '', 'Enche-se quando deixas de alimentar a alma. Tem mil olhos e nenhum deles vê luz.'],
  ['tita', 'Titã da Estagnação', 'carreira', 'tita', '#3A4250', '#FF4D2E', '#5A4A30', 'Quer que fiques sempre no mesmo sítio. A armadura dele é feita dos teus "um dia".'],
  ['lorde', 'Lorde da Procrastinação', 'disciplina', 'demonio', '#3A1A2E', '#FF3B3B', '#2A1414', '"Amanhã." Sempre amanhã. Rei de todas as desculpas.']];
const MINIONS = [
  ['ghoul', 'Ghoul do Sofá', 'corpo', 'oco', '#5A5A48', '#C6FF3A', '#2A2A1E', 'Arrasta-se do sofá para a cama e de volta.'], ['lesma', 'Lodo da Inércia', 'corpo', 'lodo', '#4A5A2A', '#E8FF5A', '', 'Cola-te ao chão quando devias estar a correr.'],
  ['ogro', 'Verme do Açúcar', 'corpo', 'verme', '#7A4A5A', '#FF8AB0', '', 'Uma boca sem fundo que pede sempre mais um doce.'], ['gargula', 'Gárgula Atrofiada', 'corpo', 'garg', '#4A4A52', '#FF5A1F', '', 'Pedra parada. Músculos que esqueceram para que servem.'], ['lobo-c', 'Lobo do Cansaço', 'corpo', 'lobo', '#4A4038', '#FFB13B', '', 'Morde nas pernas ao fim do dia e diz-te para parar.'],
  ['morcego', 'Morcego da Insónia', 'mente', 'garg', '#2A2230', '#FF3B5C', '', 'Acorda-te às 3 da manhã com tudo o que não fizeste.'], ['enxame', 'Olho das Notificações', 'mente', 'olho', '#2A3A4A', '#5AE8FF', '', 'Cada vibração é um dos seus olhos a abrir-se.'],
  ['scroll', 'Verme do Scroll Infinito', 'mente', 'verme', '#2A3A5A', '#7DF9FF', '', 'Engole horas inteiras e nunca chega ao fim.'], ['aranha-a', 'Aranha da Ansiedade', 'mente', 'aranha', '#1E1A22', '#FF2D55', '#B33A50', 'Tece teias de "e se…" à volta da tua cabeça.'], ['ruido', 'Espírito do Ruído', 'mente', 'espectro', '#2E2A3A', '#E8FF5A', '', 'Fala alto dentro de ti para não ouvires o que importa.'],
  ['traca', 'Traça dos Livros Fechados', 'intelecto', 'garg', '#5A4A3A', '#C6FF3A', '', 'Come as páginas que nunca leste.'], ['lich-e', 'Lich do Esquecimento', 'intelecto', 'caveira', '#2A1F3A', '#4CFFB0', '#2A1F3A', 'Rouba o que estudaste e não reviste.'],
  ['verme-m', 'Lodo da Preguiça Mental', 'intelecto', 'lodo', '#3A2A5A', '#C6FF3A', '', 'Torna tudo difícil de pensar.'], ['esfinge', 'Olho da Dúvida Muda', 'intelecto', 'olho', '#4A3A2A', '#FFB13B', '', 'Faz perguntas e não te deixa responder.'], ['papel', 'Golem de Papel', 'intelecto', 'golem', '#6A6258', '#5AE8FF', '', 'Feito de fotocópias que nunca abriste.'],
  ['goblin', 'Demónio do Supérfluo', 'fortuna', 'demonio', '#3A4A1E', '#FFD23B', '#3A2A10', 'Ri-se cada vez que compras o que não precisas.'], ['mimico', 'Mímico do Impulso', 'fortuna', 'verme', '#5A3A1E', '#FFD23B', '', 'Parece uma promoção. É uma boca.'],
  ['sangue', 'Lodo das Subscrições', 'fortuna', 'lodo', '#5A1E2A', '#FF5A5A', '', 'Suga-te um pouco todos os meses sem fazer barulho.'], ['corvo', 'Gárgula das Dívidas', 'fortuna', 'garg', '#1E1E26', '#FFB13B', '', 'Pousa no teu ombro e não sai.'], ['slime-d', 'Aranha do Crédito', 'fortuna', 'aranha', '#2A1E14', '#FFD23B', '#8A6A2A', 'Prende-te com juros, fio a fio.'],
  ['lobo-s', 'Lobo Solitário', 'relacoes', 'lobo', '#3A3A44', '#9BE7FF', '', 'Convence-te de que não precisas de ninguém.'], ['banshee', 'Banshee do Silêncio', 'relacoes', 'espectro', '#3A2A3A', '#FF8AD8', '', 'Grita em silêncio as mensagens que não mandaste.'],
  ['distancia', 'Vazio da Distância', 'relacoes', 'vazio', '#1A1428', '#9BE7FF', '', 'Cresce entre ti e quem está longe.'], ['orgulho', 'Cavaleiro do Orgulho', 'relacoes', 'oco', '#4A4458', '#FF8AD8', '#2A1A3A', 'Nunca é o primeiro a pedir desculpa.'], ['rancor', 'Hidra do Rancor', 'relacoes', 'hidra', '#3A2A3A', '#FF5A5A', '', 'Cada mágoa guardada é uma cabeça nova.'],
  ['duvida', 'Demónio da Dúvida', 'espirito', 'demonio', '#2A1A3A', '#B388FF', '#1A1024', 'Sussurra que Deus se esqueceu de ti.'], ['serpente', 'Hidra da Tentação', 'espirito', 'hidra', '#2A3A1E', '#FFD23B', '', 'Uma serpente com muitas bocas e uma só mentira.'],
  ['abismo', 'Abismo Faminto', 'espirito', 'verme', '#1A1428', '#B388FF', '', 'Tudo o que lhe dás desaparece.'], ['oco-e', 'Cavaleiro Oco', 'espirito', 'oco', '#3A3E48', '#B388FF', '#1A1024', 'Uma armadura vazia que já foi fé.'], ['olho-v', 'Olho do Vazio', 'espirito', 'olho', '#1A1024', '#B388FF', '', 'Olha para dentro de ti e só vê o que falta.'],
  ['cav-est', 'Cavaleiro da Rotina Morta', 'carreira', 'oco', '#4A4A40', '#FF4D2E', '#3A2A10', 'Faz o mesmo todos os dias e chama-lhe estabilidade.'], ['golem-r', 'Golem do Comodismo', 'carreira', 'golem', '#5A5048', '#FFB13B', '', 'Confortável demais para se mexer.'],
  ['aranha-b', 'Aranha da Burocracia', 'carreira', 'aranha', '#2A2A2A', '#FF4D2E', '#6A6A6A', 'Prende os teus projetos em papelada.'], ['verme-c', 'Verme do "Está Bom Assim"', 'carreira', 'verme', '#4A4A3A', '#FFB13B', '', 'Come a ambição por dentro.'], ['tita-p', 'Titã de Pedra', 'carreira', 'tita', '#4A4A4E', '#FFB13B', '#3A3020', 'Bloqueia a porta da promoção.'],
  ['diabrete', 'Diabrete do Adiar', 'disciplina', 'demonio', '#4A1A1A', '#FF8A3B', '#2A1010', 'Pequeno, rápido, convincente: "só mais 5 minutos".'], ['hidra-a', 'Hidra do Amanhã', 'disciplina', 'hidra', '#4A2A2A', '#FF3B3B', '', 'Corta uma tarefa e nascem duas.'],
  ['snooze', 'Lodo do Snooze', 'disciplina', 'lodo', '#2A3A5A', '#FF3B3B', '', 'Prende-te na cama todas as manhãs.'], ['lich-d', 'Lich da Desculpa', 'disciplina', 'caveira', '#3A1A1A', '#FF3B3B', '#3A1A1A', 'Tem uma desculpa para cada dia do ano.'], ['morcego-a', 'Gárgula do Atraso', 'disciplina', 'garg', '#3A2A2A', '#FF8A3B', '', 'Chega sempre tarde e arrasta-te com ela.']];
const COLOSSI = [
  ['leviata', 'Leviatã do Abismo', 'verme', '#14324A', '#5AE8FF', '', 'Sobe das profundezas uma vez por mês para engolir quem parou de nadar.'], ['rei-cav', 'Rei Caveira', 'cranio', '#2A1F3A', '#4CFFB0', '#2A1F3A', 'Governa um exército de dias perdidos.'],
  ['kraken', 'Kraken das Profundezas', 'polvo', '#2A1A3A', '#FF2D55', '', 'Cada tentáculo é um vício que ainda não largaste.'], ['wyrm', 'Wyrm Ancestral', 'dragao', '#1E3A2A', '#C6FF3A', '#7A8A4A', 'Mais velho do que as tuas desculpas.'],
  ['moscas', 'Senhor das Moscas', 'demonio', '#2A2A14', '#E8FF5A', '#1A1A0A', 'Onde ele passa, tudo apodrece.'], ['obsidiana', 'Colosso de Obsidiana', 'tita', '#1A1A24', '#B388FF', '#2A2030', 'Não sente dor. Não se cansa. Não para.'],
  ['devorador', 'Devorador de Mundos', 'vazio', '#0E0618', '#FF3B3B', '', 'Já engoliu sonhos maiores do que o teu.'], ['caido', 'Anjo Caído', 'oco', '#2A2A3A', '#F2C48D', '#1A0A10', 'Já foi o que tu queres ser. Desistiu.'],
  ['behemoth', 'Behemoth', 'golem', '#3A2A20', '#FF5A1F', '', 'A soma de todos os teus maus hábitos.'], ['rainha', 'Rainha Aranha', 'aranha', '#140E18', '#FF2D55', '#FF2D55', 'Mãe de todas as ansiedades.'],
  ['ceifador', 'O Ceifador', 'ceifeiro', '#141418', '#E8E2EE', '', 'Lembra-te de que o tempo acaba.'], ['dominador', 'O Dominador Sombrio', 'demonio', '#0E0E18', '#38BDF8', '#14141E', 'A tua pior versão. O último chefe.']];
// v2.53: o segundo círculo de masmorras (abre com a insígnia da primeira de cada área): 40 monstros e 8 chefes novos
const MINIONS2 = [
  ['lesao', 'Espectro da Lesão', 'corpo', 'besta', '#3A2A2A', '#FF6A3B', '', 'Aparece quando treinas sem aquecer e levas semanas parado.'], ['fastfood', 'Lodo da Comida Rápida', 'corpo', 'polvo', '#6A4A1E', '#FFB13B', '', 'Cheira bem, pesa muito e nunca te enche.'],
  ['sedent', 'Golem da Cadeira', 'corpo', 'golem', '#4A4A4A', '#C6FF3A', '', 'Fica sentado oito horas e chama-lhe trabalho.'], ['desidr', 'Verme da Sede', 'corpo', 'verme', '#7A6A3A', '#7DF9FF', '', 'Seca-te por dentro enquanto bebes só café.'],
  ['ombro', 'Gárgula da Má Postura', 'corpo', 'garg', '#3A3A44', '#FF8A3B', '', 'Curva-te as costas um milímetro por dia.'],
  ['comparar', 'Espelho da Comparação', 'mente', 'olho', '#2A3A4A', '#9BE7FF', '', 'Só te mostra a vida dos outros, já editada.'], ['enxame-r', 'Enxame do Ruído', 'mente', 'aranha', '#1E2A2A', '#E8FF5A', '#4A5A3A', 'Mil vozes a falar ao mesmo tempo dentro da tua cabeça.'],
  ['pressa', 'Lobo da Pressa', 'mente', 'besta', '#3A3044', '#FF5A8A', '', 'Morde-te os calcanhares para nunca acabares nada com calma.'], ['culpa', 'Espectro da Culpa', 'mente', 'espectro', '#2A2438', '#B388FF', '', 'Repete-te o que correu mal até de madrugada.'],
  ['burnout', 'Cinza do Esgotamento', 'mente', 'cranio', '#3A3A3A', '#FF8A3B', '', 'Já foi fogo. Agora é cinza que não acende.'],
  ['decor', 'Papagaio da Decoreba', 'intelecto', 'garg', '#2A4A3A', '#C6FF3A', '', 'Repete fórmulas sem saber de onde vêm.'], ['cola', 'Diabrete da Cola', 'intelecto', 'demonio', '#3A3A1E', '#FFD23B', '#2A2A10', 'Promete-te a nota sem o saber.'],
  ['vespera', 'Lich da Véspera', 'intelecto', 'cranio', '#2A1F2A', '#FF8A3B', '#1A1418', 'Só estuda na noite antes do exame.'], ['resumo', 'Verme dos Resumos', 'intelecto', 'verme', '#3A3A5A', '#9BE7FF', '', 'Lê o resumo do resumo e acha que leu o livro.'],
  ['ego', 'Olho da Arrogância', 'intelecto', 'olho', '#4A2A3A', '#FFB13B', '', 'Já sabe tudo. Por isso não aprende nada.'],
  ['juros', 'Hidra dos Juros', 'fortuna', 'hidra', '#3A1E1E', '#FF5A5A', '', 'Cada prestação que falhas faz-lhe nascer outra cabeça.'], ['credito', 'Mímico do Crédito Fácil', 'fortuna', 'oco', '#3A3A2A', '#FFD23B', '#2A1A10', 'Parece um presente. É uma corrente.'],
  ['bolha', 'Lodo da Especulação', 'fortuna', 'cranio', '#2A4A3A', '#5AFF8A', '', 'Sobe, sobe, sobe… e rebenta-te na mão.'], ['taxas', 'Aranha das Comissões', 'fortuna', 'aranha', '#2A2A1E', '#FFB13B', '#6A6A3A', 'Tece taxas pequenas que comem anos de juros.'],
  ['ostent', 'Gárgula da Ostentação', 'fortuna', 'garg', '#4A3A1E', '#FFD23B', '', 'Compra para mostrar a quem nem gosta de ti.'],
  ['fantasma', 'Fantasma do Visto', 'relacoes', 'ceifeiro', '#2A2A3A', '#9BE7FF', '', 'Lê a tua mensagem e nunca responde. Ensinou-te a fazer o mesmo.'], ['ressent', 'Verme do Ressentimento', 'relacoes', 'verme', '#3A1E2A', '#FF5A8A', '', 'Guarda cada mágoa e alimenta-se delas.'],
  ['inveja', 'Olho da Inveja', 'relacoes', 'polvo', '#1E3A2A', '#5AFF8A', '', 'Não suporta ver os outros a crescer.'], ['fofoca', 'Diabrete da Intriga', 'relacoes', 'demonio', '#3A2A3A', '#FF8AD8', '#2A1A2A', 'Conta o segredo de um a outro e ri-se no meio.'],
  ['muro', 'Golem do Muro', 'relacoes', 'golem', '#4A4458', '#9BE7FF', '', 'Ergue paredes para ninguém te magoar. Nem chegar.'],
  ['miragem', 'Miragem do Sucesso', 'espirito', 'ceifeiro', '#3A3A2A', '#F5E7B8', '', 'Promete que o próximo degrau vai encher o vazio.'], ['cinismo', 'Lobo do Cinismo', 'espirito', 'besta', '#2A2A2A', '#B388FF', '', 'Ri-se de tudo o que é sagrado.'],
  ['idolo', 'Ídolo de Ouro', 'espirito', 'tita', '#5A4A1E', '#FFD23B', '#3A2A10', 'Ocupa o lugar do que devia estar no centro.'], ['amargura', 'Lodo da Amargura', 'espirito', 'lodo', '#2A1E1E', '#B388FF', '', 'Torna tudo azedo, até as bênçãos.'],
  ['soberba', 'Gárgula da Soberba', 'espirito', 'garg', '#3A2A4A', '#F5E7B8', '', 'Acha que já não precisa de ninguém, nem de Deus.'],
  ['reuniao', 'Hidra das Reuniões', 'carreira', 'hidra', '#3A4250', '#FF4D2E', '', 'Cada reunião inútil marca mais duas.'], ['impostor', 'Espectro do Impostor', 'carreira', 'ceifeiro', '#2A2A3A', '#FF8A3B', '', 'Sussurra que não mereces estar ali.'],
  ['email', 'Aranha da Caixa de Entrada', 'carreira', 'aranha', '#2A2A3A', '#7DF9FF', '#5A5A6A', 'Tece mil e-mails para nunca fazeres o trabalho a sério.'], ['microchefe', 'Demónio do Micro-chefe', 'carreira', 'demonio', '#3A2A2A', '#FF4D2E', '#2A1A1A', 'Vigia cada minuto e não te deixa crescer.'],
  ['medo-r', 'Lodo do Medo de Arriscar', 'carreira', 'lodo', '#3A3A30', '#FF4D2E', '', 'Prefere o salário certo ao sonho incerto.'],
  ['desvio', 'Lobo do Desvio', 'disciplina', 'besta', '#4A1A1A', '#FF8A3B', '', 'Leva-te para outra tarefa a meio desta.'], ['perfeito', 'Golem do Perfeccionismo', 'disciplina', 'golem', '#3A3A44', '#FF3B3B', '', 'Não começa porque ainda não está perfeito.'],
  ['segunda', 'Espectro da Segunda-feira', 'disciplina', 'ceifeiro', '#2A1A2A', '#FF3B3B', '', '"Começo na segunda." Há 52 segundas por ano.'], ['redes', 'Verme das Redes', 'disciplina', 'verme', '#1E2A4A', '#FF3B5C', '', 'Só cinco minutos. Três horas depois ainda está a comer.'],
  ['cansaco', 'Gárgula do Cansaço Fingido', 'disciplina', 'garg', '#3A2A2A', '#FF8A3B', '', 'Está cansada de não fazer nada.']];
const BOSSES2 = [
  ['minotauro', 'Minotauro do Platô', 'corpo', 'tita', '#4A2A1E', '#FF5A1F', '#6A4A30', 'Guarda o labirinto onde os teus números deixam de subir. Só cai com treino progressivo.'],
  ['quimera', 'Quimera da Ansiedade', 'mente', 'hidra', '#2A1E3A', '#FF2D55', '', 'Três cabeças: o passado, o futuro e o que os outros pensam. Corta-as com presença.'],
  ['esfinge-g', 'A Grande Esfinge', 'intelecto', 'tita', '#5A4A2A', '#E8C26A', '#3A2A10', 'Faz a pergunta que nunca estudaste. Só passa quem entende o porquê.'],
  ['mamon', 'Mâmon', 'fortuna', 'dragao', '#3A2A10', '#FFD23B', '#8A6A2A', 'O deus do dinheiro pelo dinheiro. Quer que trabalhes para ele para sempre.'],
  ['sereia', 'Sereia da Solidão', 'relacoes', 'polvo', '#14283A', '#7DF9FF', '', 'Canta que estás melhor sozinho. Quem a ouve não volta.'],
  ['serp-d', 'Serpente do Deserto', 'espirito', 'hidra', '#4A3A1E', '#F5E7B8', '', 'Enrola-se na tua fé até a apertar. Só a oração de todos os dias a solta.'],
  ['burocrata', 'O Grande Burocrata', 'carreira', 'caveira', '#2A2A2A', '#FF4D2E', '#3A3A3A', 'Carimba "indeferido" em todos os teus planos. Só cai com entregas reais.'],
  ['cronos', 'Cronos Corrompido', 'disciplina', 'ceifeiro', '#2A1A2A', '#FF3B3B', '#3A2A2A', 'O tempo que perdeste, de armadura. Só o vences com dias cumpridos.']];
const COLOSSI2 = [
  ['hidra-p', 'Hidra Primordial', 'hidra', '#0E2A1E', '#5AFF8A', '', 'Cada vício cortado deixa uma raiz. Ela é todas as raízes.'], ['tita-f', 'Titã do Fim do Mundo', 'tita', '#2A1A14', '#FF5A1F', '#3A2A20', 'Carrega todos os "nunca" que disseste a ti mesmo.'],
  ['olho-a', 'O Olho do Abismo', 'polvo', '#0E0E1E', '#FF2D55', '', 'Olha para ti há tanto tempo que já te conhece.'], ['fenrir', 'Fenrir', 'besta', '#1A1A24', '#7DF9FF', '', 'O lobo que engole o sol de quem desiste.'],
  ['garg-r', 'Rainha das Gárgulas', 'garg', '#1E1E2A', '#B388FF', '', 'Cada estátua do castelo dela foi alguém que parou.'], ['lodo-p', 'O Lodo Primordial', 'lodo', '#0E1A0E', '#C6FF3A', '', 'É dele que nascem todos os maus hábitos.']];
const ALL = {}; BOSSES.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: b[2], p: b[3], b: b[4], ac: b[5], c: b[6], lore: b[7], k: 'boss', tr: 1 }; }); BOSSES2.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: b[2], p: b[3], b: b[4], ac: b[5], c: b[6], lore: b[7], k: 'boss', tr: 2 }; });
MINIONS.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: b[2], p: b[3], b: b[4], ac: b[5], c: b[6], lore: b[7], k: 'min', tr: 1 }; }); MINIONS2.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: b[2], p: b[3], b: b[4], ac: b[5], c: b[6], lore: b[7], k: 'min', tr: 2 }; });
COLOSSI.push(...COLOSSI2); COLOSSI.forEach(b => { ALL[b[0]] = { id: b[0], n: b[1], a: '', p: b[2], b: b[3], ac: b[4], c: b[5], lore: b[6], k: 'col' }; });

// ameaça: quanto mais vezes já o venceste, mais forte (e mais escuro) ele volta
const THREAT = ['', 'Antigo', 'Corrompido', 'Supremo'];
/* ---------- v2.53: GERADOR DE MONSTROS ÚNICOS ----------
   Cada monstro é montado por peças: corpo (10), cabeça (13), braços (10) e base (9). Nenhum par corpo+cabeça se repete nos
   114 monstros com nome, e numa masmorra os 6 têm corpos, cabeças e braços todos diferentes. O "poder" sobe andar a andar
   (tamanho, chifres, espinhos, olhos, armadura, fendas de lava, coroa, chamas): cada um parece mais forte do que o anterior.
   Depois do 2.º círculo as masmorras continuam sem fim, com monstros gerados (sempre combinações novas e mais fortes). */
const GT = ['carcaca', 'peitoral', 'costelas', 'casulo', 'manto', 'barril', 'cristal', 'tronco', 'lodo', 'serpente'];
const GH = ['cranio', 'demonio', 'focinho', 'olhos', 'insecto', 'capuz', 'bico', 'tentaculos', 'boca', 'ciclope', 'mascara', 'chamas', 'hidra'];
const GA = ['nenhum', 'garras', 'laminas', 'tentaculos', 'ossos', 'pincas', 'espinhos', 'correntes', 'quatro', 'arma'];
const GL = { carcaca: ['pernas', 'cascos', 'aranha', 'raizes'], peitoral: ['pernas', 'cascos', 'flutua', 'aranha'], costelas: ['pernas', 'flutua', 'aranha', 'raizes', 'saia'], casulo: ['aranha', 'pernas', 'flutua'],
  manto: ['flutua', 'saia', 'raizes'], barril: ['pernas', 'aranha', 'cascos'], cristal: ['pernas', 'flutua', 'raizes'], tronco: ['raizes', 'pernas', 'aranha'], lodo: ['chao', 'saia', 'raizes'], serpente: ['cauda'] };
const mkZ = s0 => { const s = s0 * 1.5, tx = x => W / 2 + (x - 32) * s, ty = y => H - 2 - (62 - y) * s, R = v => Math.max(.6, v * s);
  return { s, tx, ty, ell: (x, y, rx, ry) => M.ell(tx(x), ty(y), R(rx), R(ry)), rect: (x0, y0, x1, y1) => M.rect(tx(x0), ty(y0), tx(x1), ty(y1)), poly: P => M.poly(P.map(([x, y]) => [tx(x), ty(y)])),
    cap: (x0, y0, x1, y1, r0, r1 = r0) => M.cap(tx(x0), ty(y0), tx(x1), ty(y1), R(r0), R(r1)), curve: (a, b, c, r0, r1 = r0) => M.curve([tx(a[0]), ty(a[1])], [tx(b[0]), ty(b[1])], [tx(c[0]), ty(c[1])], R(r0), R(r1)),
    line: (C, x0, y0, x1, y1, c) => C.line(tx(x0), ty(y0), tx(x1), ty(y1), c), put: (C, x, y, c) => C.put(tx(x), ty(y), c),
    eye: (C, x, y, r, c, o) => C.eye(Math.round(tx(x)), Math.round(ty(y)), Math.max(1, Math.round(r * Math.min(1.3, s * .9))), c, o), glow: (C, x, y, r, c, k) => C.glow(tx(x), ty(y), r * s, c, k),
    fang: (C, x, y, len, c, dir) => fang(C, Math.round(tx(x)), Math.round(ty(y)), Math.max(1, Math.round(len * s)), c, dir) }; };
const BONE = b => mix(b, '#D8D0BC', .6), METAL = '#5A6070', DK = '#06030A';
// ---- corpos: devolvem onde ligar a cabeça (neck), os ombros (sh), as ancas (hip) e o fundo (bot)
const TORSO = {
  carcaca: (C, o, Z) => { const m = M.U(Z.ell(32, 39, 17, 13), Z.ell(30, 29, 13, 9)); C.vol(m, o.b, { lx: .6 }); crack(C, o.r, m, 3, mix(o.b, '#3A0010', .6)); for (let k = 0; k < 4; k++) Z.put(C, 22 + o.r() * 20, 32 + o.r() * 14, mix(o.a, '#000000', .3)); return { neck: [30, 22], sh: [[16, 31], [47, 33]], hip: [[24, 48], [40, 48]], bot: 51 }; },
  peitoral: (C, o, Z) => { const m = Z.poly([[17, 24], [47, 24], [44, 47], [20, 47]]); C.vol(m, o.b); Z.line(C, 32, 26, 32, 45, RAMP(o.b)[1]); for (let y = 30; y < 46; y += 5) Z.line(C, 22, y, 42, y, RAMP(o.b)[1]);
    C.vol(M.U(Z.ell(15, 26, 7, 5), Z.ell(49, 26, 7, 5)), mix(o.b, '#FFFFFF', .08)); C.vol(Z.rect(20, 44, 44, 46), o.c || '#3A2A1A'); return { neck: [32, 22], sh: [[12, 29], [52, 29]], hip: [[24, 47], [40, 47]], bot: 48 }; },
  costelas: (C, o, Z) => { const bn = BONE(o.b); C.fill(Z.ell(32, 35, 10, 11), DK); C.vol(Z.rect(31, 21, 33, 49), bn); for (let k = 0; k < 5; k++) { const y = 25 + k * 4; C.vol(M.U(Z.curve([32, y], [19 + k, y + 3], [23 + k * 1.4, y + 8], 1.2), Z.curve([32, y], [45 - k, y + 3], [41 - k * 1.4, y + 8], 1.2)), bn, { noline: 1 }); }
    if (!o.dead) { C.fill(Z.ell(32, 33, 3, 3), o.a); Z.glow(C, 32, 33, 9, o.a, .5); } C.vol(Z.poly([[25, 46], [39, 46], [36, 52], [28, 52]]), bn); return { neck: [32, 20], sh: [[18, 25], [46, 25]], hip: [[26, 50], [38, 50]], bot: 52 }; },
  casulo: (C, o, Z) => { C.vol(Z.ell(32, 46, 12, 9), mix(o.b, '#000000', .15)); for (let k = 0; k < 3; k++) Z.line(C, 22, 42 + k * 3, 42, 42 + k * 3, RAMP(o.b)[0]); C.vol(Z.ell(32, 32, 10, 8), o.b, { hi: .2 }); Z.line(C, 32, 25, 32, 39, RAMP(o.b)[0]);
    return { neck: [32, 24], sh: [[22, 30], [42, 30]], hip: [[24, 42], [40, 42]], bot: 54 }; },
  manto: (C, o, Z) => { const m = Z.poly([[32, 18], [44, 24], [49, 40], [54, 58], [10, 58], [15, 40], [20, 24]]); C.vol(m, o.b, { lx: .7 }); for (let k = 0; k < 9; k++) { const x = Math.round(Z.tx(12 + o.r() * 40)); for (let y = Math.round(Z.ty(50)); y < Math.round(Z.ty(59)); y++) if (o.r() < .55) C.px[id(x, y)] = null; }
    Z.line(C, 32, 26, 30, 56, RAMP(o.b)[1]); Z.line(C, 24, 30, 18, 56, RAMP(o.b)[1]); Z.line(C, 40, 30, 46, 56, RAMP(o.b)[1]); return { neck: [32, 20], sh: [[17, 28], [47, 28]], hip: [[22, 57], [42, 57]], bot: 58 }; },
  barril: (C, o, Z) => { const m = Z.ell(32, 36, 23, 12); C.vol(m, o.b, { lx: .6 }); for (let k = 0; k < 9; k++) { const x = 13 + k * 4.7; C.vol(Z.poly([[x - 2, 27], [x + 2, 27], [x + (o.r() - .5) * 3, 21 - o.r() * 3]]), mix(o.b, '#000000', .25)); }
    return { neck: [32, 30], sh: [[13, 37], [51, 37]], hip: [[16, 44], [48, 44]], bot: 46 }; },
  cristal: (C, o, Z) => { const g = mix(o.b, '#9FE8FF', .2); C.vol(Z.poly([[22, 22], [42, 22], [46, 36], [40, 48], [24, 48], [18, 36]]), o.b); for (let k = 0; k < 6; k++) { const x = 20 + o.r() * 24, y = 24 + o.r() * 20, d = o.r() < .5 ? -1 : 1;
      C.vol(Z.poly([[x, y], [x + 4, y + 2], [x + d * (7 + o.r() * 5), y - 6 - o.r() * 6]]), g, { hi: .25 }); } if (!o.dead) Z.glow(C, 32, 34, 10, o.a, .3); return { neck: [32, 21], sh: [[15, 27], [49, 27]], hip: [[24, 48], [40, 48]], bot: 48 }; },
  tronco: (C, o, Z) => { const w = mix(o.b, '#3A2614', .45); C.vol(Z.poly([[24, 19], [40, 19], [43, 50], [21, 50]]), w); for (let x = 25; x < 40; x += 3) Z.line(C, x, 21, x + (o.r() - .5) * 2, 49, RAMP(w)[1]);
    [[24, 22, -1], [40, 22, 1]].forEach(([x, y, d]) => { C.vol(Z.curve([x, y], [x + d * 8, y - 2], [x + d * 13, y - 10], 2, .6), w); Z.line(C, x + d * 9, y - 3, x + d * 11, y + 1, RAMP(w)[1]); });
    C.fill(Z.ell(32, 38, 3, 4), DK); if (!o.dead) Z.eye(C, 32, 38, 1, o.a, {}); return { neck: [32, 18], sh: [[21, 27], [43, 27]], hip: [[24, 50], [40, 50]], bot: 50 }; },
  lodo: (C, o, Z) => { const m = M.U(Z.ell(32, 47, 21, 14), Z.ell(32, 34, 14, 12)); C.vol(m, o.b, { hi: .18 }); for (let k = 0; k < 5; k++) Z.put(C, 18 + o.r() * 28, 36 + o.r() * 20, mix(o.b, '#FFFFFF', .35));
    for (let k = 0; k < 3; k++) { const x = 22 + o.r() * 20, y = 42 + o.r() * 10; Z.line(C, x, y, x + 3, y + 1, '#C9C2B2'); } return { neck: [32, 24], sh: [[14, 42], [50, 42]], hip: [[20, 59], [44, 59]], bot: 61 }; },
  serpente: (C, o, Z) => { [[54, 19], [47, 16], [40, 12]].forEach(([y, rx]) => C.vol(Z.ell(32, y, rx, 6), o.b)); [[54, 19], [47, 16], [40, 12]].forEach(([y, rx]) => Z.line(C, 32 - rx * .6, y + 3, 32 + rx * .6, y + 3, mix(o.b, '#FFFFFF', .2)));
    C.vol(Z.curve([32, 38], [36, 30], [32, 22], 5, 4), o.b); return { neck: [32, 20], sh: [[22, 36], [42, 36]], hip: [[20, 59], [44, 59]], bot: 61 }; } };
// ---- cabeças (cx, cy: centro)
const horns = (C, o, Z, x, y, p) => { if (p < .22) return; const L = 5 + p * 12, c = '#2A2018'; C.vol(M.U(Z.curve([x - 5, y - 4], [x - 11, y - 6], [x - 10 - p * 4, y - 4 - L], 1.9, .5), Z.curve([x + 5, y - 4], [x + 11, y - 6], [x + 10 + p * 4, y - 4 - L], 1.9, .5)), c);
  if (p > .78) C.vol(M.U(Z.curve([x - 3, y - 6], [x - 5, y - 12], [x - 2, y - 14 - p * 4], 1.3, .4), Z.curve([x + 3, y - 6], [x + 5, y - 12], [x + 2, y - 14 - p * 4], 1.3, .4)), mix(c, o.a, .25)); };
const eyesN = (C, o, Z, pts) => pts.forEach(([x, y, r, sl]) => Z.eye(C, x, y, r, o.a, { dead: o.dead, slit: sl }));
const HEAD = {
  cranio: (C, o, Z, x, y, p) => { const bn = BONE(o.b); C.vol(M.U(Z.ell(x, y, 8, 7.5), Z.rect(x - 5, y + 3, x + 5, y + 7)), bn); C.fill(M.U(Z.ell(x - 3.2, y, 2.6, 2.8), Z.ell(x + 3.2, y, 2.6, 2.8)), DK); eyesN(C, o, Z, [[x - 3, y, 1], [x + 3, y, 1]]);
    C.fill(Z.poly([[x - 1, y + 3], [x + 1, y + 3], [x, y + 5]]), DK); const j = 1 + Math.round(p * 3); for (let k = -4; k <= 4; k += 2) { Z.put(C, x + k, y + 7, '#EEE6D6'); Z.put(C, x + k, y + 8 + j, '#EEE6D6'); } C.fill(Z.rect(x - 4, y + 8, x + 4, y + 7 + j), '#1A0206');
    C.vol(Z.poly([[x - 5, y + 8 + j], [x + 5, y + 8 + j], [x + 3, y + 12 + j], [x - 3, y + 12 + j]]), mix(bn, '#000000', .1)); horns(C, o, Z, x, y, p); },
  demonio: (C, o, Z, x, y, p) => { const f = mix(o.b, '#7A1010', .35); C.vol(Z.poly([[x - 7, y - 5], [x + 7, y - 5], [x + 8, y + 3], [x + 4, y + 9], [x - 4, y + 9], [x - 8, y + 3]]), f); horns(C, o, Z, x, y, Math.max(.4, p));
    C.fill(Z.poly([[x - 4, y + 4], [x + 4, y + 4], [x + 2, y + 8], [x - 2, y + 8]]), '#1A0206'); [-3, -1, 1, 3].forEach(k => Z.fang(C, x + k, y + 4, k === -3 || k === 3 ? 3 : 1)); eyesN(C, o, Z, [[x - 3, y - 1, 1, 1], [x + 3, y - 1, 1, 1]]); Z.line(C, x - 6, y - 3, x - 1, y - 1, RAMP(f)[0]); Z.line(C, x + 6, y - 3, x + 1, y - 1, RAMP(f)[0]); },
  focinho: (C, o, Z, x, y, p) => { C.vol(M.U(Z.poly([[x - 7, y - 4], [x - 9, y - 13], [x - 3, y - 6]]), Z.poly([[x + 7, y - 4], [x + 9, y - 13], [x + 3, y - 6]])), mix(o.b, '#000000', .2)); C.vol(Z.poly([[x - 8, y - 5], [x + 8, y - 5], [x + 9, y + 3], [x + 4, y + 12], [x - 4, y + 12], [x - 9, y + 3]]), o.b);
    C.fill(Z.poly([[x - 4, y + 6], [x + 4, y + 6], [x + 3, y + 13], [x - 3, y + 13]]), '#22020A'); for (let k = -3; k <= 3; k += 2) { Z.fang(C, x + k, y + 6, Math.abs(k) === 3 ? 4 : 2); Z.fang(C, x + k, y + 13, 2, '#E9E2CF', -1); } C.fill(Z.ell(x, y + 3, 2, 1.2), DK);
    eyesN(C, o, Z, [[x - 4, y - 1, 1, 1], [x + 4, y - 1, 1, 1]]); horns(C, o, Z, x, y, p - .1); },
  olhos: (C, o, Z, x, y, p) => { C.vol(Z.ell(x, y, 9, 8.5), mix(o.b, '#B07A7A', .25)); crack(C, o.r, Z.ell(x, y, 9, 8.5), 3, '#7A1020'); Z.eye(C, x, y, 3, o.a, { dead: o.dead, slit: 1 }); const n = 3 + Math.round(p * 6);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + .4, rr = 6.3; Z.eye(C, x + Math.cos(a) * rr, y + Math.sin(a) * rr * .9, 1, o.a, { dead: o.dead }); } },
  insecto: (C, o, Z, x, y, p) => { C.vol(Z.ell(x, y, 7, 6), o.b, { hi: .22 }); C.fill(M.U(Z.ell(x - 4, y - 1, 3, 3.4), Z.ell(x + 4, y - 1, 3, 3.4)), o.dead ? '#2A2A2E' : mix(o.a, '#000000', .2)); if (!o.dead) for (let k = 0; k < 6; k++) Z.put(C, x - 5 + (k % 3) * 1.3 + (k > 2 ? 8 : 0), y - 2 + (k % 2) * 2, mix(o.a, '#FFFFFF', .5));
    C.vol(M.U(Z.curve([x - 3, y + 4], [x - 8, y + 8], [x - 3, y + 11], 1.2, .4), Z.curve([x + 3, y + 4], [x + 8, y + 8], [x + 3, y + 11], 1.2, .4)), '#2A1A10'); Z.line(C, x - 2, y - 5, x - 7, y - 14 - p * 5, RAMP(o.b)[0]); Z.line(C, x + 2, y - 5, x + 7, y - 14 - p * 5, RAMP(o.b)[0]); },
  capuz: (C, o, Z, x, y, p) => { C.vol(Z.poly([[x, y - 10], [x + 10, y - 2], [x + 10, y + 9], [x - 10, y + 9], [x - 10, y - 2]]), mix(o.b, '#000000', .3), { lx: .7 }); C.fill(Z.ell(x, y + 2, 6.5, 6.5), mix(o.b, '#000000', .55)); C.vol(Z.ell(x, y + 3, 4.6, 5), mix(BONE(o.b), '#000000', .35), { shine: false }); C.fill(M.U(Z.ell(x - 2, y + 2, 1.6, 1.8), Z.ell(x + 2, y + 2, 1.6, 1.8)), DK);
    for (let k = -2; k <= 2; k++) Z.put(C, x + k, y + 7, k % 2 ? '#8A8070' : '#C8BEA8'); eyesN(C, o, Z, [[x - 2, y + 2, 1], [x + 2, y + 2, 1]].concat(p > .5 ? [[x, y - 3, 1]] : [])); },
  bico: (C, o, Z, x, y, p) => { C.vol(Z.ell(x, y, 7.5, 7), mix(o.b, '#1A1418', .45)); C.vol(Z.curve([x - 1, y + 2], [x + 3, y + 10], [x + 1, y + 17], 3, .6), '#2A2420', { hi: .3 }); C.fill(M.U(Z.ell(x - 3.5, y - 1, 2.6, 2.6), Z.ell(x + 3.5, y - 1, 2.6, 2.6)), '#1A1418');
    eyesN(C, o, Z, [[x - 3.5, y - 1, 2], [x + 3.5, y - 1, 2]]); C.vol(Z.rect(x - 11, y - 7, x + 11, y - 6), '#1A1418'); C.vol(Z.rect(x - 6, y - 13, x + 6, y - 7), '#1A1418'); },
  tentaculos: (C, o, Z, x, y, p) => { C.vol(M.U(Z.ell(x, y - 2, 9, 9), Z.ell(x, y + 4, 7, 4)), o.b); const n = 4 + Math.round(p * 3); for (let k = 0; k < n; k++) { const sx = x - 5 + k * (10 / (n - 1)); C.vol(Z.curve([sx, y + 4], [sx + (o.r() - .5) * 8, y + 10], [sx + (o.r() - .5) * 10, y + 16], 1.5, .5), mix(o.b, '#000000', .12)); }
    eyesN(C, o, Z, [[x - 4, y - 3, 1, 1], [x + 4, y - 3, 1, 1]].concat(p > .4 ? [[x, y - 7, 1, 1]] : [])); },
  boca: (C, o, Z, x, y, p) => { C.vol(Z.ell(x, y, 9, 10), o.b); C.fill(Z.ell(x, y + 1, 4.5, 7.5), '#1A0206'); for (let k = -6; k <= 6; k += 2) { Z.fang(C, x - 4, y + 1 + k, 2, '#EEE6D6', 1); Z.put(C, x + 4, y + 1 + k, '#EEE6D6'); Z.put(C, x + 3, y + 1 + k, '#EEE6D6'); }
    eyesN(C, o, Z, [[x - 6, y - 7, 1], [x - 3, y - 9, 1], [x + 3, y - 9, 1]].slice(0, 2 + Math.round(p))); },
  ciclope: (C, o, Z, x, y, p) => { C.vol(Z.ell(x, y, 8.5, 8), mix(o.b, '#FFFFFF', .05)); Z.eye(C, x, y - 1, 3 + Math.round(p), o.a, { dead: o.dead, slit: 1 }); for (let k = -6; k <= 6; k += 3) C.vol(Z.poly([[x + k - 1, y - 6], [x + k + 1, y - 6], [x + k * 1.3, y - 10 - p * 4]]), '#2A2018');
    C.fill(Z.rect(x - 4, y + 4, x + 4, y + 6), '#1A0206'); [-3, 0, 3].forEach(k => Z.fang(C, x + k, y + 4, 2)); },
  mascara: (C, o, Z, x, y, p) => { const w = '#E8E2D4'; C.vol(Z.poly([[x - 7, y - 7], [x + 7, y - 7], [x + 8, y + 2], [x + 4, y + 10], [x - 4, y + 10], [x - 8, y + 2]]), w); crack(C, o.r, Z.ell(x, y, 7, 8), 2 + Math.round(p * 3), '#5A4A4A');
    C.fill(M.U(Z.ell(x - 3.5, y - 1, 2.2, 3), Z.ell(x + 3.5, y - 1, 2.2, 3)), DK); eyesN(C, o, Z, [[x - 3.5, y - 1, 1], [x + 3.5, y - 1, 1]]); C.fill(Z.curve([x - 5, y + 4], [x, y + 9], [x + 5, y + 4], 1), '#1A0206'); Z.line(C, x - 3.5, y + 2, x - 3.5, y + 6, '#7A1010');
    C.vol(M.U(Z.curve([x - 6, y - 7], [x - 12, y - 12], [x - 14, y - 6], 1.6, .5), Z.curve([x + 6, y - 7], [x + 12, y - 12], [x + 14, y - 6], 1.6, .5)), o.c || '#5A1A2A'); },
  chamas: (C, o, Z, x, y, p) => { const F = o.dead ? '#3A3A40' : o.a; for (let k = 0; k < 9; k++) { const xx = x - 7 + o.r() * 14, h = 7 + o.r() * 9 + p * 6, dx = (o.r() - .5) * 7;
      C.fill(Z.cap(xx, y, xx + dx, y - h, 2.8, .4), mix(F, '#2A0000', .55)); C.fill(Z.cap(xx, y, xx + dx * .8, y - h * .78, 1.9, .4), F); C.fill(Z.cap(xx, y, xx + dx * .55, y - h * .45, 1, .3), mix(F, '#FFF4C0', .65)); } if (!o.dead) Z.glow(C, x, y - 4, 16, F, .35);
    C.vol(Z.ell(x, y + 1, 7, 7), mix(o.b, '#000000', .4)); eyesN(C, o, Z, [[x - 3, y, 1], [x + 3, y, 1]]); C.fill(Z.rect(x - 3, y + 4, x + 3, y + 5), mix(F, '#FFFFFF', .4)); },
  hidra: (C, o, Z, x, y, p) => { const n = 3 + Math.round(p * 2); for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (k - (n - 1) / 2) * .55, ex = x + Math.cos(a) * 13, ey = y + 4 + Math.sin(a) * 13;
      C.vol(Z.curve([x, y + 8], [x + (ex - x) * .4, ey + 6], [ex, ey], 2.6, 2), o.b); C.vol(Z.poly([[ex - 4, ey - 3], [ex + 4, ey - 3], [ex + 5, ey + 1], [ex + 2, ey + 4], [ex - 2, ey + 4], [ex - 5, ey + 1]]), o.b); C.vol(M.U(Z.cap(ex - 3, ey - 3, ex - 5, ey - 7, .9, .4), Z.cap(ex + 3, ey - 3, ex + 5, ey - 7, .9, .4)), '#2A2018');
      C.fill(Z.rect(ex - 2, ey + 1, ex + 2, ey + 3), '#1A0206'); Z.fang(C, ex - 2, ey + 1, 2); Z.fang(C, ex + 2, ey + 1, 2); Z.eye(C, ex - 2, ey - 1, 1, o.a, { dead: o.dead, slit: 1 }); Z.eye(C, ex + 2, ey - 1, 1, o.a, { dead: o.dead, slit: 1 }); } } };
// ---- braços
const ARMS = {
  nenhum: () => { },
  garras: (C, o, Z, sh, p, dy = 0) => sh.forEach(([x, y], i) => { const d = i ? 1 : -1, ex = x + d * 6, ey = y + 10 + dy, hx = x + d * 4, hy = y + 20 + dy; C.vol(M.U(Z.cap(x, y + dy, ex, ey, 3, 2.5), Z.cap(ex, ey, hx, hy, 2.5, 2)), mix(o.b, '#FFFFFF', .04)); [-2, 0, 2].forEach(k => Z.fang(C, hx + k, hy + 1, 2 + Math.round(p * 3), '#D8D0BC')); }),
  laminas: (C, o, Z, sh, p) => sh.forEach(([x, y], i) => { const d = i ? 1 : -1; C.vol(Z.cap(x, y, x + d * 5, y + 6, 2.6, 2), o.b); C.vol(Z.curve([x + d * 5, y + 6], [x + d * 14, y - 4], [x + d * 8, y - 14 - p * 4], 2.2, .4), '#B8C2CC', { hi: .3 }); }),
  tentaculos: (C, o, Z, sh, p) => sh.forEach(([x, y], i) => { const d = i ? 1 : -1; for (let k = 0; k < 2; k++) C.vol(Z.curve([x, y + k * 3], [x + d * (10 + o.r() * 6), y + 8 + k * 4], [x + d * (4 + o.r() * 8), y + 22 + k * 3], 2.4, .5), mix(o.b, '#000000', .1 + k * .1)); }),
  ossos: (C, o, Z, sh, p) => sh.forEach(([x, y], i) => { const d = i ? 1 : -1, bn = BONE(o.b), ex = x + d * 9, ey = y + 12, hx = x + d * 7, hy = y + 28; C.vol(M.U(Z.cap(x, y, ex, ey, 1.4), Z.cap(ex, ey, hx, hy, 1.2)), bn); Z.put(C, ex, ey, '#FFFFFF');
    for (let k = -2; k <= 2; k += 2) Z.line(C, hx, hy, hx + k, hy + 4 + p * 2, bn); }),
  pincas: (C, o, Z, sh, p) => sh.forEach(([x, y], i) => { const d = i ? 1 : -1, ex = x + d * 8, ey = y + 12; C.vol(Z.cap(x, y, ex, ey, 2.8, 2.4), o.b); const c = mix(o.b, '#7A1A1A', .3); C.vol(M.U(Z.ell(ex + d * 2, ey + 5, 4 + p * 2, 2.2), Z.ell(ex + d * 2, ey + 10, 4 + p * 2, 2)), c, { hi: .2 }); }),
  asas: (C, o, Z, sh, p) => sh.forEach(([x, y], i) => { const d = i ? 1 : -1, sp = 15 + p * 9, ax = x + d * 3, ay = y - 6, wx = x + d * sp * .45, wy = y - 15 - p * 3, F = [[sp, -12 - p * 3], [sp + 2, 0], [sp - 4, 9], [sp * .45, 12]].map(([a, b]) => [x + d * a, y + b]), mem = mix(o.b, '#000000', .12), bone = mix(o.b, '#FFFFFF', .18);
    let prev = [wx, wy]; F.forEach(([fx, fy], k) => { const mx = (prev[0] + fx) / 2 - d * 2.5, my = (prev[1] + fy) / 2 + 2.5; C.vol(Z.poly([[wx, wy], prev, [mx, my], [fx, fy]]), mix(mem, '#000000', k * .06), { lx: .7, shine: false }); prev = [fx, fy]; });
    C.vol(Z.poly([[ax, ay], [wx, wy], prev, [x, y + 6]]), mem, { lx: .7, shine: false }); C.vol(M.U(Z.cap(ax, ay, wx, wy, 1.6, 1.2)), bone); F.forEach(([fx, fy]) => C.vol(Z.cap(wx, wy, fx, fy, 1, .5), bone)); Z.fang(C, wx, wy - 1, 2, '#D8D0BC', -1); }),
  espinhos: (C, o, Z, sh, p) => { const bn = BONE(o.b), R = RAMP(bn); sh.forEach(([x, y], i) => { const d = i ? 1 : -1; for (let k = 0; k < 3 + Math.round(p * 2); k++) { const ex = x + d * (5 + k * 2.6), ey = y - 7 - k * 2.6 - p * 3, m = Z.cap(x - d * 2, y - 1, ex, ey, 2.4, .5);
    C.fill(m, (xx, yy) => (xx - Z.tx(x)) * d > (Z.ty(y) - yy) * .5 ? R[2] : R[4]); C.put(Z.tx(ex), Z.ty(ey), R[5]); } }); },
  correntes: (C, o, Z, sh, p) => { ARMS.garras(C, o, Z, sh, p * .5); sh.forEach(([x, y], i) => { const d = i ? 1 : -1; for (let k = 0; k < 6 + p * 4; k++) Z.put(C, x + d * 4 + (k % 2), y + 21 + k * 1.6, k % 2 ? '#8A8E98' : '#5A5E68'); }); },
  quatro: (C, o, Z, sh, p) => { ARMS.garras(C, o, Z, sh.map(([x, y]) => [x + (x < 32 ? 2 : -2), y + 7]), p * .7); ARMS.garras(C, o, Z, sh, p); },
  arma: (C, o, Z, sh, p) => { ARMS.garras(C, o, Z, [sh[0]], p); const [x, y] = sh[1], hx = x + 4, hy = y + 18, k = Math.floor(o.r() * 3); C.vol(Z.cap(x, y, hx, hy, 3, 2.3), o.b);
    if (k === 0) { C.vol(Z.rect(hx - 1, hy - 26, hx + 1, hy + 4), '#B8C2CC', { hi: .3 }); C.vol(Z.rect(hx - 4, hy + 1, hx + 4, hy + 2), '#5A4A30'); }
    else if (k === 1) { C.vol(Z.rect(hx, hy - 20, hx + 1, hy + 10), '#3A2A1A'); C.vol(Z.poly([[hx + 1, hy - 20], [hx + 9, hy - 24], [hx + 9, hy - 10], [hx + 1, hy - 14]]), METAL, { hi: .3 }); }
    else { C.vol(Z.rect(hx, hy - 22, hx + 1, hy + 10), '#3A2A1A'); C.vol(Z.curve([hx, hy - 22], [hx - 10, hy - 26], [hx - 16, hy - 16], 2, .4), '#B8C2CC'); } } };
// ---- bases
const LEGS = {
  pernas: (C, o, Z, hip, p) => hip.forEach(([x, y], i) => { const d = i ? 1 : -1; C.vol(M.U(Z.cap(x, y, x + d * 2, 55, 3.4, 2.8), Z.cap(x + d * 2, 55, x + d, 61, 2.8, 2.4)), mix(o.b, '#000000', .1)); [-2, 0, 2].forEach(k => Z.fang(C, x + d + k, 61, 2, '#C9C2B2')); }),
  cascos: (C, o, Z, hip, p) => hip.forEach(([x, y], i) => { const d = i ? 1 : -1; C.vol(M.U(Z.cap(x, y, x + d * 4, 54, 3.6, 2.4), Z.cap(x + d * 4, 54, x + d, 60, 2.2, 1.8)), mix(o.b, '#3A2010', .35)); C.vol(Z.rect(x + d - 2, 60, x + d + 2, 62), '#14100E'); }),
  aranha: (C, o, Z, hip, p) => [0, 1, 2].forEach(k => [-1, 1].forEach(d => { const x0 = 32 + d * (6 + k * 2), y0 = hip[0][1] - 4 + k * 2, kx = 32 + d * (16 + k * 4), ky = y0 - 6 + k * 2, fx = 32 + d * (13 + k * 6); C.vol(M.U(Z.cap(x0, y0, kx, ky, 1.7, 1.4), Z.cap(kx, ky, fx, 62, 1.4, .7)), mix(o.b, '#000000', .12)); })),
  raizes: (C, o, Z, hip, p) => { for (let k = 0; k < 7; k++) { const x = 22 + k * 3.3, ex = x + (x - 32) * 1.2 + (o.r() - .5) * 6; C.vol(Z.curve([x, hip[0][1] - 2], [x + (ex - x) * .3, 58], [ex, 62], 2, .5), mix(o.b, '#2A1A0E', .6)); } },
  flutua: (C, o, Z, hip, p) => { const y0 = hip[0][1] - 4, c = mix(o.b, o.a, .18); C.vol(Z.curve([32, y0], [36 + (o.r() - .5) * 6, 54], [32 + (o.r() - .5) * 10, 61], 7, .6), c, { shine: false });
    [-1, 1].forEach(d => C.vol(Z.curve([32 + d * 4, y0 + 2], [32 + d * 10, 52], [32 + d * 8, 58], 3, .4), mix(c, '#000000', .15), { shine: false })); },
  saia: (C, o, Z, hip, p) => { const n = 6 + Math.round(p * 2); for (let k = 0; k < n; k++) { const sx = 16 + k * (32 / (n - 1)); C.vol(Z.curve([sx, hip[0][1] - 3], [sx + (o.r() - .5) * 10, 58], [sx + (sx - 32) * .4 + (o.r() - .5) * 6, 62], 2.6, .6), mix(o.b, '#000000', .15)); } },
  chao: (C, o, Z) => C.fill(M.where(Z.ell(32, 62, 24, 2), (x, y) => !C.px[id(x, y)]), mix(o.b, '#000000', .55)),
  cauda: (C, o, Z) => C.vol(Z.curve([46, 56], [57, 60], [58, 49], 3, .6), o.b) };
// ---- montar: as costas e asas atrás, depois base, corpo, braços, cabeça e o que o poder acrescenta
const lift = (c, mn) => { if (!c) return c; const [h, sa, l] = toHsl(c); return fromHsl(h, Math.min(1, sa * 1.08), Math.max(l, mn)); };
const build = (C, o0, g, p) => { const o = Object.assign({}, o0, { b: lift(o0.b, o0.dead ? .34 : .4), c: lift(o0.c, .32) }); const s = .6 + .26 * Math.min(1, p), Z = mkZ(s), [tn, hn, an, ln] = g, P1 = Math.min(1, p), asc = Math.max(0, p - 1);
  let A;
  // halo de fogo e espinhos dorsais (atrás)
  const tmp = mkZ(s); const ghost = canvas(); A = TORSO[tn](ghost, Object.assign({}, o, { r: rng('a') }), tmp); // só para saber os pontos de ligação
  if (an === 'espinhos') ARMS.espinhos(C, o, Z, A.sh, P1);
  const sp = Math.floor(P1 * 9) + Math.round(asc * 6); for (let k = 0; k < sp; k++) { const t = (k + .5) / sp, x = A.sh[0][0] + (A.sh[1][0] - A.sh[0][0]) * t, y = A.sh[0][1] - 4 - Math.sin(t * Math.PI) * 6; C.vol(Z.poly([[x - 1.6, y + 3], [x + 1.6, y + 3], [x + (x - 32) * .15, y - 4 - P1 * 6 - o.r() * 3]]), '#241C20'); }
  (LEGS[ln] || LEGS.pernas)(C, o, Z, A.hip, P1);
  A = TORSO[tn](C, o, Z);
  if (P1 > .45 && !o.dead) { const m = new Set([...C.solid].filter(i => C.px[i])), L = [...m].filter(i => (i % W) < W / 2), lc = mix(o.a, '#FFE08A', .35);
    for (let k = 0; k < Math.round(P1 * 4) + Math.round(asc * 3); k++) { let i = L[Math.floor(o.r() * L.length)], x = i % W, y = (i / W) | 0; for (let st = 0; st < 5 + o.r() * 7; st++) { [x, W - 1 - x].forEach(xx => { if (m.has(id(xx, y))) C.put(xx, y, lc); }); x += Math.round(o.r() * 2 - 1); y += o.r() < .7 ? 1 : 0; } } }
  if (P1 > .62 && !o.dead && tn !== 'manto') { const n = Math.min(3, Math.round((P1 - .5) * 5)), y0 = A.sh[0][1] + 5; for (let k = 0; k < n; k++) { const y = y0 + k * 4; if (y < A.bot - 4) { Z.eye(C, 29, y, 1, o.a, { slit: 1 }); Z.eye(C, 35, y, 1, o.a, { slit: 1 }); } } }
  if (an === 'espinhos') ARMS.garras(C, o, Z, A.sh, P1); else (ARMS[an] || ARMS.nenhum)(C, o, Z, A.sh, P1);
  const [hx, hy] = A.neck, cy = hy - 7; (HEAD[hn] || HEAD.cranio)(C, o, Z, hx, cy, P1);
  if (P1 > .82 && hn !== 'chamas' && hn !== 'hidra') { const c = P1 > .93 ? '#E8C26A' : '#9AA0AA'; for (let k = -2; k <= 2; k++) C.vol(Z.poly([[hx + k * 3 - 1.4, cy - 9], [hx + k * 3 + 1.4, cy - 9], [hx + k * 3.4, cy - 13 - (2 - Math.abs(k)) * 2]]), c); C.vol(Z.rect(hx - 8, cy - 9, hx + 8, cy - 8), c); }
  if (asc > 0 && !o.dead) Z.glow(C, hx, cy, 10 + asc * 4, o.a, Math.min(.3, .1 + asc * .06)); };
/* ---------- quem é quem: peças únicas para cada monstro, poder sempre a subir ---------- */
const AKS = ['corpo', 'mente', 'intelecto', 'fortuna', 'relacoes', 'espirito', 'carreira', 'disciplina'];
const GENE = {}, POW = {};
// andar i (0–4) do círculo t: o chefe acima do 5.º andar e o 1.º andar do círculo seguinte acima do chefe
const powOf = (t, i, boss) => { const b0 = .08 + (t - 1) * .44; return boss ? b0 + .42 : b0 + i * .07 + (t > 1 ? .02 : 0); };
const colPow = j => .6 + j * .025;
const FIXG = { leviata: ['serpente', 'focinho', 'nenhum', 'cauda'], 'rei-cav': ['costelas', 'cranio', 'arma', 'pernas'], kraken: ['carcaca', 'tentaculos', 'tentaculos', 'aranha'], wyrm: ['serpente', 'demonio', 'espinhos', 'cauda'],
  moscas: ['casulo', 'insecto', 'quatro', 'aranha'], obsidiana: ['cristal', 'ciclope', 'garras', 'pernas'], devorador: ['lodo', 'boca', 'tentaculos', 'chao'], caido: ['costelas', 'mascara', 'correntes', 'flutua'], behemoth: ['barril', 'demonio', 'garras', 'cascos'],
  rainha: ['casulo', 'olhos', 'laminas', 'aranha'], ceifador: ['manto', 'capuz', 'arma', 'flutua'], dominador: ['peitoral', 'capuz', 'quatro', 'pernas'], 'hidra-p': ['serpente', 'hidra', 'nenhum', 'cauda'], 'tita-f': ['cristal', 'chamas', 'arma', 'pernas'],
  'olho-a': ['lodo', 'ciclope', 'tentaculos', 'saia'], fenrir: ['barril', 'focinho', 'garras', 'pernas'], 'garg-r': ['cristal', 'bico', 'laminas', 'raizes'], 'lodo-p': ['lodo', 'olhos', 'garras', 'chao'] };
const NN = { cranio: ['Lich', 'Caveira', 'Ossada'], demonio: ['Demónio', 'Diabrete', 'Íncubo'], focinho: ['Besta', 'Lobisomem', 'Cão Infernal'], olhos: ['Olho', 'Vigia', 'Observador'], insecto: ['Louva-a-deus', 'Escaravelho', 'Enxame'],
  capuz: ['Espectro', 'Assombração', 'Sombra'], bico: ['Corvo', 'Abutre', 'Médico da Peste'], tentaculos: ['Horror', 'Abominação', 'Aberração'], boca: ['Devorador', 'Goela', 'Fauce'], ciclope: ['Ciclope', 'Olho Gigante', 'Vigilante'],
  mascara: ['Arlequim', 'Máscara', 'Bobo'], chamas: ['Ígneo', 'Carvão Vivo', 'Brasa'], hidra: ['Hidra', 'Serpe', 'Quimera'] };
const NB = { cranio: 'Arquilich', demonio: 'Arquidemónio', focinho: 'Grande Besta', olhos: 'Olho Soberano', insecto: 'Rainha-Enxame', capuz: 'Ceifador', bico: 'Corvo-Rei', tentaculos: 'Horror Antigo', boca: 'Grande Devorador', ciclope: 'Ciclope Ancião', mascara: 'Rei Arlequim', chamas: 'Senhor Ígneo', hidra: 'Hidra Ancestral' };
const ROMAN = n => { const V = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; V.forEach(([v, r]) => { while (n >= v) { s += r; n -= v; } }); return s; };
const used = { pair: new Set(), full: new Set(), T: {}, H: {}, A: {}, L: {} }, inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
const take = (id, g) => { GENE[id] = g; used.pair.add(g[0] + '|' + g[1]); used.full.add(g.join('|')); inc(used.T, g[0]); inc(used.H, g[1]); inc(used.A, g[2]); inc(used.L, g[3]); };
// escolhe peças para uma sequência (uma masmorra): corpo, cabeça e braços todos diferentes entre si e do monstro anterior
const pickSeq = (ids, seed, prev, strictPair) => { const T0 = new Set(), H0 = new Set(), A0 = new Set(), L0 = new Set(); let pv = prev;
  ids.forEach((id, k) => { if (GENE[id]) { pv = GENE[id]; return; } const r = rng(seed + '|' + k); let best = null, bs = 1e9;
    for (const relax of [0, 1, 2]) { GT.forEach(t => GH.forEach(h => { if (t === 'serpente' && h === 'hidra' && relax < 2) return; if ((strictPair || relax === 0) && used.pair.has(t + '|' + h) && relax < 2) return; if (relax < 2 && (T0.has(t) || H0.has(h))) return; if (pv && (pv[0] === t || pv[1] === h)) return;
      const sc = (used.T[t] || 0) * 3 + (used.H[h] || 0) * 3 + (used.pair.has(t + '|' + h) ? 40 : 0) + r() * 2; if (sc < bs) { bs = sc; best = [t, h]; } })); if (best) break; }
    const [t, h] = best, AO = (t === 'serpente' ? ['nenhum', 'garras', 'laminas', 'espinhos', 'quatro'] : GA).filter(a => !A0.has(a) && (!pv || pv[2] !== a)), a = AO.sort((x, y) => (used.A[x] || 0) - (used.A[y] || 0) + (r() - .5) * .8)[0] || 'garras';
    const LO = GL[t].slice().sort((x, y) => (L0.has(x) ? 5 : 0) - (L0.has(y) ? 5 : 0) + (used.L[x] || 0) * .3 - (used.L[y] || 0) * .3 + (r() - .5) * .6); let l = LO[0];
    let g = [t, h, a, l], n = 0; while (used.full.has(g.join('|')) && n < 20) { g = [t, h, GA[(GA.indexOf(g[2]) + 1) % GA.length], GL[t][(GL[t].indexOf(g[3]) + 1) % GL[t].length]]; n++; }
    take(id, g); T0.add(g[0]); H0.add(g[1]); A0.add(g[2]); L0.add(g[3]); pv = g; }); return pv; };
const concept = n => { const m = String(n).match(/^(.*?)\s((?:do|da|dos|das|de)\s.+)$/); return m ? m[2] : ''; };
const CONC = { corpo: ['da Fadiga', 'do Sedentarismo', 'da Gula', 'do Ombro Caído', 'do Joelho Fraco', 'da Barriga Mole', 'do Pulmão Cansado', 'da Falta de Tempo', 'do Peso Morto', 'da Lesão Antiga', 'do Sofá Eterno', 'da Fome Falsa'],
  mente: ['da Ruminação', 'do Pânico', 'da Névoa', 'do Ecrã', 'da Dispersão', 'do Desânimo', 'do Barulho', 'da Mente Cheia', 'do Alarme Falso', 'da Noite Longa', 'do Pensamento Circular', 'da Pressa Vazia'],
  intelecto: ['do Saber Raso', 'da Opinião Fácil', 'da Fórmula Decorada', 'do Livro Fechado', 'do Achismo', 'da Leitura na Diagonal', 'do Copiar e Colar', 'da Teoria Sem Prática', 'do Porquê Esquecido', 'da Nota Mínima', 'do Caderno Vazio', 'da Pergunta Calada'],
  fortuna: ['da Fatura', 'da Pressa de Enriquecer', 'do Risco Cego', 'da Inflação', 'do Cartão Sem Fim', 'do Gasto Pequeno', 'da Promoção', 'do Lucro Fácil', 'da Aposta', 'do Mês Que Não Chega', 'da Moda', 'do Empréstimo'],
  relacoes: ['da Frieza', 'do Esquecimento', 'da Mensagem Por Responder', 'do Aniversário Esquecido', 'da Conversa Adiada', 'do Ciúme', 'da Mágoa Guardada', 'da Mesa Vazia', 'da Desconfiança', 'da Distância Escolhida', 'do Telefone Mudo', 'da Porta Fechada'],
  espirito: ['da Fé Morna', 'da Culpa', 'do Desespero', 'da Oração Esquecida', 'do Coração Duro', 'da Gratidão Perdida', 'do Domingo Vazio', 'da Pressa da Alma', 'do Orgulho Santo', 'da Ingratidão', 'do Deserto', 'da Noite Escura'],
  carreira: ['do Talvez', 'do Chefe Pequeno', 'do Currículo Parado', 'do E-mail Sem Fim', 'da Promoção Adiada', 'do Projeto Gaveta', 'da Zona de Conforto', 'do Prazo Falhado', 'do Medo do Não', 'da Rede Fraca', 'do Salário Parado', 'do Sonho Engavetado'],
  disciplina: ['do Só Mais Cinco', 'da Rotina Partida', 'do Plano Esquecido', 'do Alarme Ignorado', 'da Lista Infinita', 'do Começo Adiado', 'da Exceção', 'do Fim de Semana Longo', 'da Promessa Quebrada', 'do Quase', 'da Tarde Perdida', 'do Telemóvel na Mão'] };
const NAMES = new Set(), CUSED = new Set();
const rename = (id, boss, suffix = '') => { const m = ALL[id], g = GENE[id]; if (!g || FIXG[id]) { NAMES.add(m.n); return; } let c = concept(m.n);
  // o mesmo "do/da …" não se repete: se já foi usado (ou o nome não o tem), vai buscar um conceito novo da mesma área
  if (!c || CUSED.has(c + suffix)) c = ((CONC[m.a] || CONC.disciplina).find(x => !CUSED.has(x + suffix)) || c || 'do Abismo'); CUSED.add(c + suffix); const L = boss ? [NB[g[1]]].concat(NN[g[1]]) : NN[g[1]], h = rng('nm' + id);
  let nm = ''; for (let k = 0; k < L.length + 1; k++) { nm = (k < L.length ? L[(Math.floor(h() * L.length) + k) % L.length] : L[0] + ' Maior') + ' ' + c + suffix; if (!NAMES.has(nm)) break; } NAMES.add(nm); m.n = nm; };
// os 114 com nome
Object.entries(FIXG).forEach(([id, g]) => { if (ALL[id]) take(id, g); });
AKS.forEach(a => { let pv = null; [1, 2].forEach(t => { const L = (t === 2 ? MINIONS2 : MINIONS).filter(m => m[2] === a).map(m => m[0]), B = ((t === 2 ? BOSSES2 : BOSSES).find(b => b[2] === a) || [])[0], seq = L.concat(B ? [B] : []);
  pv = pickSeq(seq, 'dg' + a + t, pv, true); L.forEach((id, i) => { POW[id] = powOf(t, i, 0); }); if (B) POW[B] = powOf(t, 0, 1); }); });
COLOSSI.forEach((c, j) => { POW[c[0]] = colPow(j); });
Object.keys(ALL).forEach(id => { if (!GENE[id]) pickSeq([id], 'x' + id, null, false); rename(id, ALL[id].k !== 'min'); });
/* ---------- sem fim: a partir do 3.º círculo e do 19.º colosso, monstros gerados (combinações novas, sempre mais fortes) ---------- */
const LORE = { corpo: 'Cresce em cada treino adiado e em cada noite mal dormida.', mente: 'Alimenta-se de barulho, pressa e ecrãs.', intelecto: 'Vive nas páginas que não abres e nas perguntas que não fazes.', fortuna: 'Engorda com cada euro gasto sem pensar.',
  relacoes: 'Afasta-te das pessoas, uma conversa adiada de cada vez.', espirito: 'Seca a alma devagar, até ninguém dar por isso.', carreira: 'Quer que fiques sempre no mesmo lugar.', disciplina: 'Diz-te que amanhã é melhor dia.' };
const hue = (seed, l = .26, s = .35) => fromHsl(rng(seed)() * 360, s, l);
const genCircle = (a, t) => { const ids = [0, 1, 2, 3, 4].map(i => `x${t}${a}${i}`).concat([`x${t}${a}b`]); if (ALL[ids[0]]) return ids; const r = rng('gc' + a + t), C0 = CONC[a], off = ((t - 3) * 6) % C0.length;
  ids.forEach((id, i) => { const boss = i === 5, b = hue(id + 'b', .2 + r() * .1, .3 + r() * .25), ac = hue(id + 'a', .62, .95); ALL[id] = { id, n: 'x ' + C0[(off + i) % C0.length], a, p: '', b, ac, c: hue(id + 'c', .3, .4), lore: LORE[a] + (boss ? ` Guarda o ${t}.º círculo.` : ''), k: boss ? 'boss' : 'min', tr: t, gen: 1 }; POW[id] = powOf(t, i, boss); });
  const prevB = t === 3 ? ((BOSSES2.find(x => x[2] === a) || [])[0]) : `x${t - 1}${a}b`; if (t > 3) genCircle(a, t - 1); pickSeq(ids, 'gc' + a + t, GENE[prevB] || null, false); ids.forEach((id, i) => { const m = ALL[id]; m.n = m.n.replace(/^x /, 'Monstro '); rename(id, i === 5, ' ' + ROMAN(t)); }); return ids; };
const colAt = j => { if (j < COLOSSI.length) return COLOSSI[j][0]; const id = 'xc' + j; if (ALL[id]) return id; if (j > COLOSSI.length) colAt(j - 1);
  ALL[id] = { id, n: 'x do Abismo', a: '', p: '', b: hue(id + 'b', .18, .35), ac: hue(id + 'a', .6, .95), c: hue(id + 'c', .28, .4), lore: `Mora a ${j + 1} profundidades. Só cai com um mês inteiro de avanço real.`, k: 'col', tr: 0, gen: 1 }; POW[id] = colPow(j);
  pickSeq([id], 'col' + j, GENE[colAt(j - 1)], false); const g = GENE[id]; ALL[id].n = NB[g[1]] + ' do Abismo ' + ROMAN(j + 1); return id; };
// v2.53: mais sinistros. Depois do corpo: a metade de baixo afunda na escuridão, as bordas de cima e da esquerda ganham a luz
// doentia da cor dos olhos (contraluz), escorre icor por baixo e há uma sombra no chão (menos nos que flutuam).
const FLOAT = new Set(['espectro', 'vazio', 'olho', 'cranio', 'garg']);
const sinister = (C, m, o) => { const S0 = [...C.solid].filter(i => C.px[i]), S = new Set(S0), r = rng(m.id + '|s' + o.t); if (!S0.length) return;
  S0.forEach(i => { const x = i % W, y = (i / W) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (ok(nx, ny) && !S.has(id(nx, ny)) && !C.px[id(nx, ny)]) C.px[id(nx, ny)] = '#020105'; }); }); let y0 = H, y1 = 0; S0.forEach(i => { const y = (i / W) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; });
  const hh = (y1 - y0) || 1; S0.forEach(i => { const x = i % W, y = (i / W) | 0, t = (y - (y0 + hh * .5)) / (hh * .5); if (t > 0 && BAY[y & 3][x & 3] / 16 < t * .8) C.px[i] = mix(C.px[i], '#04010A', .12 + t * .14); });
  if (o.dead) return;
  S0.forEach(i => { const x = i % W, y = (i / W) | 0; if ((x === 0 || !S.has(i - 1) || y === 0 || !S.has(i - W)) && y < y0 + hh * .75) C.px[i] = mix(C.px[i], o.ac, .28); });
  const bot = S0.filter(i => ((i / W) | 0) < H - 3 && !S.has(i + W) && ((i / W) | 0) > y0 + hh * .35); for (let k = 0; k < 4 + (o.t | 0) * 2 && bot.length; k++) { const i = bot[Math.floor(r() * bot.length)], x = i % W, y = (i / W) | 0, L = 2 + Math.floor(r() * 5);
    for (let s2 = 1; s2 <= L; s2++) { if (!ok(x, y + s2) || C.px[id(x, y + s2)]) break; C.put(x, y + s2, mix(o.ac, '#000000', .5 + s2 / L * .35)); } }
  if (!FLOAT.has(m.p) && !(GENE[m.id] && /flutua|chao/.test(GENE[m.id][3]))) { const gy = Math.min(H - 2, y1 + 1); for (let x = Math.round(W * .1); x < W * .9; x++) { const d = Math.abs(x + .5 - W / 2) / (W * .4); for (let yy = gy; yy <= Math.min(H - 1, gy + 1); yy++) if (!C.px[id(x, yy)] && BAY[yy & 3][x & 3] / 16 < (1 - d) * .85) C.px[id(x, yy)] = '#030106'; } } };
const paint = (m, o) => { const C = canvas(), r = rng(m.id + '|' + o.t), body = o.dead ? grey(m.b) : o.t ? mix(m.b, '#000000', .12 * o.t) : m.b, ac = o.dead ? '#3A3A40' : m.ac;
  if (GENE[m.id]) build(C, { b: body, a: ac, c: m.c ? (o.dead ? grey(m.c) : m.c) : '', r, t: o.t, dead: o.dead }, GENE[m.id], (POW[m.id] || .3) + (o.t | 0) * .06);
  else P[m.p](C, { b: body, a: ac, c: m.c ? (o.dead ? grey(m.c) : m.c) : '', r, t: o.t, dead: o.dead, bone: o.dead ? '#8A8680' : undefined });
  sinister(C, m, { dead: o.dead, ac, t: o.t });
  // feridas: rachas escuras conforme a vida que já perdeu
  if (!o.dead && o.hurt > .2) { const all = new Set([...C.solid].filter(i => C.px[i])); crack(C, r, all, Math.round(o.hurt * 6), '#0A0306'); const L = [...all]; for (let k = 0; k < o.hurt * 10; k++) { const i = L[Math.floor(r() * L.length)], x = i % W, y = (i / W) | 0; for (let d = 0; d < 3; d++) if (C.px[id(x, y + d)]) C.px[id(x, y + d)] = mix(C.px[id(x, y + d)], '#7A0610', .6 - d * .15); } }
  return C.px; };
// aura e sombra (por trás), para os chefes
const aura = (px, c, k) => { const out = px.slice(), D = new Array(W * H).fill(99); const q = []; px.forEach((v, i) => { if (v) { D[i] = 0; q.push(i); } });
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (!ok(nx, ny)) return; const j = id(nx, ny); if (D[j] > D[i] + 1 && D[i] < 5) { D[j] = D[i] + 1; q.push(j); } }); }
  D.forEach((d, i) => { if (d > 0 && d <= 5 && !px[i]) { const x = i % W, y = (i / W) | 0, t = (6 - d) / 6 * k; if (BAY[y & 3][x & 3] / 16 < t * (d === 1 ? 1.4 : .75)) out[i] = mix('#03010A', c, d === 1 ? .55 * k : .14 + t * .32); } }); return out; };
const CACHE = {};
const blobUrl = du => { try { const b = atob(du.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: 'image/png' })); } catch (e) { return du; } };
// o: { t: ameaça 0–3, hurt: 0–1, dead, aura }
const url = (mid, o = {}) => { const m = ALL[mid] || ALL.golem, t = Math.max(0, Math.min(3, o.t | 0)), hurt = Math.round((o.hurt || 0) * 4) / 4, dead = !!o.dead, au = false;
  const key = [m.id, t, hurt, dead, au].join('|'); if (CACHE[key]) return CACHE[key];
  let px = paint(m, { t, hurt, dead }); if (au && !dead) px = aura(px, m.ac, .55 + t * .12);
  try { const c = document.createElement('canvas'), sc = 2; c.width = W * sc; c.height = H * sc; const x = c.getContext('2d');
    px.forEach((v, i) => { if (!v) return; x.fillStyle = v; x.fillRect((i % W) * sc, ((i / W) | 0) * sc, sc, sc); }); return (CACHE[key] = blobUrl(c.toDataURL('image/png'))); } catch (e) { return ''; } };
const img = (mid, o = {}, cls = '') => `<img class="mo-px ${cls}" src="${url(mid, o)}" alt="${(ALL[mid] || {}).n || ''}" draggable="false">`;
const name = (mid, t = 0) => { const m = ALL[mid]; return m ? (t ? m.n + ' ' + THREAT[Math.min(3, t)] : m.n) : ''; };
const ofA = (a, t = 1) => t >= 3 ? genCircle(a, t).slice(0, 5) : (t === 2 ? MINIONS2 : MINIONS).filter(m => m[2] === a).map(m => m[0]);
OS.Monstros = { ALL, BOSSES: BOSSES.concat(BOSSES2).map(b => b[0]), MINIONS: MINIONS.concat(MINIONS2).map(m => m[0]), COLOSSI: COLOSSI.map(c => c[0]), THREAT, url, img, name, ofA, bossOf: (a, t = 1) => t >= 3 ? genCircle(a, t)[5] : ((t === 2 ? BOSSES2 : BOSSES).find(b => b[2] === a) || BOSSES[0])[0], colAt, gene: id => GENE[id], power: id => POW[id], pixels: (mid, o = {}) => paint(ALL[mid], { t: o.t | 0, hurt: o.hurt || 0, dead: !!o.dead }), A };
})();
