/* PRUMO — temas das festas (v3.75). O app muda sozinho quando chega a época de cada festa e volta ao normal quando acaba:
   · Carnaval (da semana antes até à Quarta-feira de Cinzas): confetes, serpentinas e bandeirolas;
   · Páscoa (duas semanas antes até à Segunda de Páscoa): grinalda de ovos, pétalas, um coelho a saltar e ovos escondidos nas páginas;
   · Santos Populares e Festas Juninas (junho): bandeirinhas;
   · Halloween (15 de outubro a 2 de novembro): teias, folhas a cair, morcegos, um fantasma e um monstro a espreitar;
   · Natal (1 de dezembro a 6 de janeiro): luzes no topo, neve a cair e a acumular em baixo, um limpa-neves que a recolhe, o Pai Natal
     no trenó a atravessar o céu;
   · Passagem de ano (31 de dezembro às 18h até 1 de janeiro), diferente do Natal: bandeirolas douradas, confetes dourados e bolhas de
     champanhe, foguetes que sobem e rebentam e uma garrafa de champanhe a atravessar o céu (sem neve, sem luzes de Natal e sem limpa-neves).
   Tocar num espaço vazio faz um efeito da festa. Leve no iPhone (30 imagens por segundo, pára quando a app está escondida);
   com "reduzir movimento" fica só a decoração parada. Definições › Temas das festas: automático ou desligado, e ver cada um agora. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc, K = 'os2epocas';
const cfg = () => Object.assign({ modo: 'auto', ver: '', ate: 0 }, U.ls.get(K, {}) || {});
const guarda = o => U.ls.set(K, Object.assign(cfg(), o));
const pascoa = y => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mes - 1, dia); };
const NOMES = { carnaval: 'Carnaval', pascoa: 'Páscoa', junho: 'Santos Populares e Festas Juninas', halloween: 'Halloween', natal: 'Natal', anonovo: 'Passagem de ano' };
// a festa de hoje (pela data do aparelho)
const deHoje = (d = new Date()) => { const y = d.getFullYear(), M = d.getMonth(), D = d.getDate(), dia = new Date(y, M, D).getTime(), E = pascoa(y).getTime(), DAY = 864e5;
  if ((M === 11 && D === 31 && d.getHours() >= 18) || (M === 0 && D === 1)) return 'anonovo';
  if (M === 11 || (M === 0 && D <= 6)) return 'natal';
  if ((M === 9 && D >= 15) || (M === 10 && D <= 2)) return 'halloween';
  if (M === 5) return 'junho';
  if (dia >= E - 14 * DAY && dia <= E + DAY) return 'pascoa';
  const terca = E - 47 * DAY; if (dia >= terca - 9 * DAY && dia <= terca + DAY) return 'carnaval';
  return ''; };
const atual = () => { const c = cfg(); if (c.ver && c.ate > Date.now()) return c.ver === 'nenhum' ? '' : c.ver; if (c.modo === 'off') return ''; return deHoje(); };
const quieto = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const leve = () => document.documentElement.classList.contains('lite-x');

/* ---------- a grinalda no topo (SVG em mosaico) ---------- */
const svg = s => 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
const fio = '<path d="M0 6 Q60 22 120 6" fill="none" stroke="#3b2a22" stroke-width="1.6"/>';
const GAR = {
  natal: on => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="34">${fio}${[[18, 12, '#ff4d5e', '#c81e33'], [42, 17, '#ffd34d', '#e0a106'], [66, 18, '#4dd88a', '#1e9e57'], [90, 16, '#5cb8ff', '#1f6fd1'], [112, 9, '#ff8ad8', '#c93f9d']].map(([x, y, c1, c2], i) => (i % 2 === on ? '' : `<circle cx="${x}" cy="${y + 9}" r="8" fill="${c1}" opacity=".35"/>`) + `<rect x="${x - 2}" y="${y - 1}" width="4" height="4" fill="#5a4a3a"/><ellipse cx="${x}" cy="${y + 8}" rx="4" ry="6" fill="${i % 2 === on ? c2 : c1}"/>`).join('')}</svg>`),
  pascoa: () => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">${fio}${[[20, 13, '#ffd6e5', '#ff9ec4'], [60, 19, '#d8f3dc', '#8fd694'], [100, 14, '#dbe7ff', '#9cb8ff']].map(([x, y, c1, c2]) => `<line x1="${x}" y1="${y - 2}" x2="${x}" y2="${y + 2}" stroke="#3b2a22"/><ellipse cx="${x}" cy="${y + 12}" rx="8.5" ry="11" fill="${c1}"/><path d="M${x - 8} ${y + 10} q4 -3 8 0 t8 0" stroke="${c2}" stroke-width="2.2" fill="none"/><circle cx="${x - 3}" cy="${y + 16}" r="1.6" fill="${c2}"/><circle cx="${x + 3}" cy="${y + 17}" r="1.6" fill="${c2}"/>`).join('')}</svg>`),
  junho: () => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="34">${fio}${[[0, '#e63946'], [24, '#f4a261'], [48, '#2a9d8f'], [72, '#e9c46a'], [96, '#457b9d']].map(([x, c], i) => { const y = 6 + Math.sin((x + 12) / 120 * Math.PI) * 15; return `<path d="M${x + 2} ${y} L${x + 22} ${y} L${x + 22} ${y + 16} L${x + 12} ${y + 11} L${x + 2} ${y + 16}Z" fill="${c}"/>`; }).join('')}</svg>`),
  carnaval: () => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="34">${fio}${[[0, '#ff006e'], [24, '#ffbe0b'], [48, '#3a86ff'], [72, '#8338ec'], [96, '#06d6a0']].map(([x, c]) => { const y = 6 + Math.sin((x + 12) / 120 * Math.PI) * 15; return `<path d="M${x + 3} ${y} L${x + 21} ${y} L${x + 12} ${y + 17}Z" fill="${c}"/>`; }).join('')}</svg>`),
  halloween: () => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="34">${fio}${[[0, '#ff7a00'], [24, '#1b1b1f'], [48, '#7b2cbf'], [72, '#ff7a00'], [96, '#1b1b1f']].map(([x, c]) => { const y = 6 + Math.sin((x + 12) / 120 * Math.PI) * 15; return `<path d="M${x + 3} ${y} L${x + 21} ${y} L${x + 12} ${y + 17}Z" fill="${c}"/>`; }).join('')}</svg>`) };
// v3.88: a passagem de ano tem a sua grinalda (bandeirolas douradas, prateadas e azul-noite, com estrelas a cintilar), já não a do Natal
GAR.anonovo = on => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path d="M0 6 Q60 22 120 6" fill="none" stroke="#c9a227" stroke-width="1.6"/>${[[0, '#f5c542'], [24, '#e6e8ee'], [48, '#1b1f3b'], [72, '#f5c542'], [96, '#e6e8ee']].map(([x, c], i) => { const y = 6 + Math.sin((x + 12) / 120 * Math.PI) * 15;
  return `<path d="M${x + 3} ${y} L${x + 21} ${y} L${x + 12} ${y + 17}Z" fill="${c}"/>` + (i % 2 === on ? `<path d="M${x + 12} ${y + 20} l1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.9-3.4 1.9.7-3.8-2.8-2.6 3.8-.5z" fill="#ffe08a"/>` : ''); }).join('')}</svg>`);

/* ---------- personagens (SVG) ---------- */
const SANTA = `<svg viewBox="0 0 220 70" aria-hidden="true"><g fill="none" stroke="#5a3a1e" stroke-width="2"><path d="M60 40 L95 38"/><path d="M28 40 L55 40"/></g>
  ${[0, 38].map(x => `<g transform="translate(${x} 0)"><ellipse cx="22" cy="40" rx="14" ry="7" fill="#8a5a33"/><circle cx="37" cy="31" r="5" fill="#8a5a33"/><circle cx="41" cy="31" r="1.6" fill="${x ? '#8a5a33' : '#e63946'}"/><path d="M34 26 l-3 -8 m3 8 l2 -9 m-2 1 l-4 -3 m6 2 l3 -4" stroke="#6b4423" stroke-width="1.6" fill="none"/><path d="M12 45 l-3 10 M18 46 l1 10 M28 46 l-2 10 M32 45 l3 9" stroke="#6b4423" stroke-width="2.2"/></g>`).join('')}
  <path d="M96 30 h70 q14 0 14 14 v4 h-80 q-8 0 -8 -8z" fill="#c1121f"/><path d="M92 54 h96 q8 0 10 -8" stroke="#d4a017" stroke-width="3" fill="none"/><rect x="104" y="40" width="58" height="3" fill="#d4a017"/>
  <circle cx="150" cy="18" r="9" fill="#c1121f"/><circle cx="150" cy="16" r="5.5" fill="#f6d5b8"/><path d="M143 19 q7 12 14 0z" fill="#fff"/><path d="M142 12 q8 -14 18 -2z" fill="#c1121f"/><circle cx="161" cy="8" r="2.6" fill="#fff"/><rect x="141" y="11" width="18" height="3" rx="1.5" fill="#fff"/>
  <rect x="120" y="20" width="16" height="12" rx="1" fill="#2a9d8f"/><rect x="127" y="20" width="2.5" height="12" fill="#ffd34d"/></svg>`;
const ANO = () => { const d = new Date(); return d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear(); };
const CHAMP = () => `<svg viewBox="0 0 210 90" aria-hidden="true"><g transform="rotate(-16 100 55)"><path d="M22 52 q0-13 13-13 h70 q11 0 17 6 l20 2 v18 l-20 2 q-6 6-17 6 h-70 q-13 0-13-13z" fill="#1f4d2b"/><path d="M34 45 q10-4 20 0" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="122" y="44" width="22" height="14" rx="2" fill="#d4af37"/><rect x="50" y="41" width="40" height="22" rx="3" fill="#f6e7cf"/><text x="70" y="56" font-size="10" text-anchor="middle" font-family="Georgia,serif" font-weight="700" fill="#7a5a12">${ANO()}</text></g>
  <g fill="#fff8e1"><circle cx="160" cy="30" r="6"/><circle cx="170" cy="22" r="5"/><circle cx="168" cy="34" r="4"/><circle cx="178" cy="28" r="3.5"/><circle cx="182" cy="18" r="3"/></g><rect x="188" y="4" width="10" height="13" rx="3" fill="#c8a165" transform="rotate(25 193 10)"/>
  <g fill="#ffd34d"><path d="M150 8 l2 4 4.5.6-3.3 3 .8 4.5-4-2.2-4 2.2.8-4.5-3.3-3 4.5-.6z"/><path d="M196 46 l1.5 3 3.4.4-2.5 2.3.6 3.4-3-1.7-3 1.7.6-3.4-2.5-2.3 3.4-.4z"/></g></svg>`;
const FANTASMA = `<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M30 4 C14 4 8 18 8 32 V62 l7 -6 l7 6 l8 -6 l8 6 l7 -6 l7 6 V32 C52 18 46 4 30 4z" fill="#f4f1ff" stroke="#c9c3e6" stroke-width="1.5"/><ellipse cx="22" cy="28" rx="4" ry="5.5" fill="#1b1b1f"/><ellipse cx="38" cy="28" rx="4" ry="5.5" fill="#1b1b1f"/><ellipse cx="30" cy="40" rx="5" ry="4" fill="#1b1b1f"/></svg>`;
const MONSTRO = `<svg viewBox="0 0 90 70" aria-hidden="true"><path d="M8 70 V36 C8 14 26 4 45 4 S82 14 82 36 V70z" fill="#5bbf6a"/><path d="M20 10 l-6 -9 l12 6z M70 10 l6 -9 l-12 6z" fill="#3e8f4b"/><circle cx="45" cy="30" r="15" fill="#fff"/><circle cx="48" cy="32" r="7" fill="#1b1b1f"/><circle cx="50" cy="29" r="2" fill="#fff"/><path d="M28 54 q17 10 34 0" stroke="#1b1b1f" stroke-width="3" fill="none"/><path d="M36 57 l3 5 l3 -4 M50 58 l3 4 l3 -5" fill="#fff"/></svg>`;
const OVO = c => `<svg viewBox="0 0 40 50" aria-hidden="true"><ellipse cx="20" cy="27" rx="16" ry="21" fill="${c[0]}"/><path d="M5 24 q5 -5 10 0 t10 0 t10 0" stroke="${c[1]}" stroke-width="3.5" fill="none"/><circle cx="13" cy="34" r="2.6" fill="${c[1]}"/><circle cx="27" cy="36" r="2.6" fill="${c[1]}"/><circle cx="20" cy="41" r="2.2" fill="${c[1]}"/></svg>`;
const CORES_OVO = [['#ffd6e5', '#ff6fa8'], ['#d8f3dc', '#40a35a'], ['#dbe7ff', '#4c7dff'], ['#fff1c1', '#e0a106'], ['#eadcff', '#8a5cf6']];

/* ---------- a tela de animação ---------- */
let NPLOW = 0, cv = null, cx = null, W = 0, H = 0, DPR = 1, RAF = 0, ult = 0, EP = '', P = [], neve = [], plow = null, coelho = null, morcegos = [], fogos = [], foguetes = [], prox = {};
const BIN = 6, MAXN = () => Math.min(30, H * .045);
const tamanho = () => { DPR = Math.min(1.5, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; if (cv) { cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(DPR, 0, 0, DPR, 0, 0); } neve = new Array(Math.ceil(W / BIN) + 1).fill(0); };
const rnd = (a, b) => a + Math.random() * (b - a);
const N = () => { const base = W < 700 ? 1 : 1.5, f = leve() ? .4 : 1; return { natal: 70, anonovo: 46, pascoa: 26, halloween: 22, carnaval: 46, junho: 0 }[EP] * base * f | 0; };
const nova = () => { if (EP === 'anonovo') return Math.random() < .3 ? { k: 'b', x: rnd(0, W), y: H + rnd(4, H * .25), r: rnd(1.5, 4.2), vy: -rnd(30, 70), vx: 0, f: rnd(0, 6), a: rnd(.4, .75) }
    : { k: 'g', x: rnd(0, W), y: rnd(-H * .2, -4), r: rnd(2.5, 5.5), vy: rnd(40, 80), vx: rnd(-16, 16), f: rnd(0, 6), rot: rnd(0, 6), vr: rnd(-5, 5), c: ['#f5c542', '#ffe08a', '#e6e8ee', '#c9a227', '#ffffff'][Math.random() * 5 | 0] };
  if (EP === 'natal') return { k: 's', x: rnd(0, W), y: rnd(-H * .2, -4), r: rnd(1, 3.2), vy: rnd(28, 60), vx: rnd(-10, 10), f: rnd(0, 6), a: rnd(.55, .95) };
  if (EP === 'pascoa') return { k: 'p', x: rnd(0, W), y: rnd(-60, -6), r: rnd(3, 6), vy: rnd(22, 40), vx: rnd(-14, 14), f: rnd(0, 6), rot: rnd(0, 6), vr: rnd(-2, 2), c: ['#ffc8dd', '#bde0fe', '#d8f3dc', '#fff1c1', '#e7d4ff'][Math.random() * 5 | 0] };
  if (EP === 'halloween') return { k: 'f', x: rnd(0, W), y: rnd(-60, -6), r: rnd(5, 9), vy: rnd(24, 44), vx: rnd(-18, 18), f: rnd(0, 6), rot: rnd(0, 6), vr: rnd(-2.5, 2.5), c: ['#d9480f', '#e8590c', '#a0522d', '#c99700', '#7f3f00'][Math.random() * 5 | 0] };
  return { k: 'c', x: rnd(0, W), y: rnd(-60, -6), r: rnd(3, 6), vy: rnd(50, 90), vx: rnd(-20, 20), f: rnd(0, 6), rot: rnd(0, 6), vr: rnd(-6, 6), c: ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0', '#fb5607'][Math.random() * 6 | 0] }; };
const pousa = x => { const i = Math.max(0, Math.min(neve.length - 1, Math.round(x / BIN))), mx = MAXN(); for (let d = -3; d <= 3; d++) { const j = i + d; if (j >= 0 && j < neve.length) neve[j] = Math.min(mx, neve[j] + .55 * Math.exp(-d * d / 3)); } };
let CH = { y: 0, x0: 0, x1: 0, at: 0 };
const chao = () => { if (performance.now() - CH.at < 1000) return CH; const tb = document.getElementById('tabbar'); let o = { y: H, x0: 0, x1: W };
  if (tb && W < 900 && getComputedStyle(tb).display !== 'none') { const r = tb.getBoundingClientRect(); if (r.height > 20 && r.top < H) { const k = tb.firstElementChild && getComputedStyle(tb).backgroundColor === 'rgba(0, 0, 0, 0)' ? tb.firstElementChild.getBoundingClientRect() : r; o = { y: Math.round(r.top) + 1, x0: Math.max(0, Math.round(r.left + 14)), x1: Math.min(W, Math.round(r.right - 14)) }; } }
  CH = Object.assign(o, { at: performance.now() }); return CH; };
// o limpa-neves: entra pela esquerda quando a neve já está alta (ou de vez em quando), empurra a neve e sai pela direita
const trator = (x, y, t) => { const c = cx; c.save(); c.translate(x, y); c.fillStyle = '#5b6470'; c.beginPath(); c.moveTo(36, -2); c.lineTo(46, -2); c.lineTo(50, -20); c.lineTo(40, -22); c.closePath(); c.fill();
  c.fillStyle = '#f2b33d'; c.fillRect(-28, -18, 50, 12); c.fillRect(-22, -36, 24, 19); c.fillStyle = '#bfe3ff'; c.fillRect(-18, -32, 16, 11); c.fillStyle = '#f2b33d'; c.fillRect(22, -16, 16, 6);
  c.fillStyle = Math.sin(t * 8) > 0 ? '#ffb000' : '#7a5200'; c.beginPath(); c.arc(-10, -39, 3, 0, 7); c.fill(); if (Math.sin(t * 8) > 0) { c.fillStyle = 'rgba(255,176,0,.25)'; c.beginPath(); c.arc(-10, -39, 9, 0, 7); c.fill(); }
  c.fillStyle = '#1f1f24'; c.beginPath(); c.arc(-16, -4, 9, 0, 7); c.fill(); c.beginPath(); c.arc(16, -2, 6, 0, 7); c.fill(); c.fillStyle = '#9aa3ad'; c.beginPath(); c.arc(-16, -4, 3.5, 0, 7); c.fill(); c.beginPath(); c.arc(16, -2, 2.4, 0, 7); c.fill(); c.restore(); };
const coelhoDraw = (o, t) => { const c = cx, hop = Math.abs(Math.sin(o.ph)) * 22; c.save(); c.translate(o.x, o.y - hop); c.scale(o.dir, 1); c.fillStyle = '#f3ede6'; c.strokeStyle = '#cfc4b8'; c.lineWidth = 1;
  c.beginPath(); c.ellipse(0, -12, 15, 11, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.arc(14, -22, 8, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(12, -38, 3.2, 10, -.15, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(18, -37, 3.2, 10, .2, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#ffb3c6'; c.beginPath(); c.ellipse(18, -37, 1.4, 6.5, .2, 0, 7); c.fill(); c.fillStyle = '#1b1b1f'; c.beginPath(); c.arc(17, -23, 1.5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-15, -12, 5, 0, 7); c.fill(); c.restore(); };
const morcegoDraw = (b, t) => { const c = cx, a = Math.sin(t * 14 + b.f) * .7; c.save(); c.translate(b.x, b.y); c.scale(b.s, b.s); c.fillStyle = '#1b1b1f'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-10, -12 * a - 4, -24, -6 * a); c.quadraticCurveTo(-16, 2, -12, 6); c.quadraticCurveTo(-6, 2, 0, 6); c.quadraticCurveTo(6, 2, 12, 6); c.quadraticCurveTo(16, 2, 24, -6 * a); c.quadraticCurveTo(10, -12 * a - 4, 0, 0); c.fill(); c.beginPath(); c.ellipse(0, 2, 4, 6, 0, 0, 7); c.fill(); c.restore(); };
const explode = (x, y, cores, n = 46, v = 150) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = rnd(v * .35, v); fogos.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.9, 1.6), t: 0, c: cores[Math.random() * cores.length | 0], r: rnd(1.3, 2.6) }); } };
const passo = now => { RAF = requestAnimationFrame(passo); if (document.hidden) return; if (now - ult < 33) return; const dt = Math.min(.08, (now - ult) / 1000); ult = now; const t = now / 1000, c = cx; c.clearRect(0, 0, W, H); const CHO = chao(), G = CHO.y, X0 = CHO.x0, X1 = CHO.x1;
  while (P.length < N()) P.push(nova());
  P.forEach((p, i) => { p.f += dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.f * 1.3) * 12) * dt; if (p.rot != null) p.rot += p.vr * dt;
    const gi = Math.max(0, Math.min(neve.length - 1, Math.round(p.x / BIN)));
    if (p.k === 's' && p.x >= X0 && p.x <= X1 && p.y >= G - neve[gi] - 1 && p.y < G + 6) { pousa(p.x); P[i] = nova(); return; } if ((p.vy > 0 && p.y > H + 12) || (p.vy < 0 && p.y < -24) || p.x < -30 || p.x > W + 30) { P[i] = nova(); return; }
    c.globalAlpha = p.a || .9;
    if (p.k === 's') { c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
    else if (p.k === 'b') { c.strokeStyle = 'rgba(255,240,200,.8)'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .3, 0, 7); c.fill(); }
    else if (p.k === 'g') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = .5 + .5 * Math.abs(Math.sin(p.f * 4)); c.fillStyle = p.c; c.beginPath(); c.moveTo(0, -p.r); c.lineTo(p.r * .55, 0); c.lineTo(0, p.r); c.lineTo(-p.r * .55, 0); c.closePath(); c.fill(); c.restore(); }
    else if (p.k === 'f') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; c.beginPath(); c.moveTo(0, -p.r); c.quadraticCurveTo(p.r, 0, 0, p.r); c.quadraticCurveTo(-p.r, 0, 0, -p.r); c.fill(); c.restore(); }
    else { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; if (p.k === 'p') { c.beginPath(); c.ellipse(0, 0, p.r, p.r * .6, 0, 0, 7); c.fill(); } else c.fillRect(-p.r / 2, -p.r, p.r, p.r * 1.7); c.restore(); } });
  c.globalAlpha = 1;
  if (EP === 'natal') { // a neve acumulada e o limpa-neves (só no Natal)
    for (let i = 1; i < neve.length - 1; i++) neve[i] = neve[i] * .985 + (neve[i - 1] + neve[i + 1]) * .0075;
    const mx = Math.max(...neve), pv = !!cfg().ver; if (!plow && (mx > MAXN() * .8 || (t > (prox.plow || 0) && mx > (pv ? 1 : 6)))) { plow = { x: -70, monte: 0 }; prox.plow = t + (pv ? 25 : 90); NPLOW++; }
    if (plow) { if (plow.x < X0 - 70) plow.x = X0 - 70; plow.x += 70 * dt; for (let i = 0; i < neve.length; i++) { const x = i * BIN; if (x < plow.x + 44 && neve[i] > 1.5) { plow.monte = Math.min(26, plow.monte + neve[i] * .02); neve[i] = 1.5; } } if (plow.x > X1 + 90) plow = null; }
    c.save(); c.beginPath(); c.rect(X0, 0, X1 - X0, H); c.clip(); const i0 = Math.floor(X0 / BIN), i1 = Math.ceil(X1 / BIN), base = G < H - 4 ? G + 2 : H;
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(X0, base); for (let i = i0; i <= i1 && i < neve.length; i++) c.lineTo(i * BIN, G - neve[i]); c.lineTo(X1, base); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(150,185,220,.55)'; c.lineWidth = 1.2; c.beginPath(); for (let i = i0; i <= i1 && i < neve.length; i++) c.lineTo(i * BIN, G - neve[i]); c.stroke();
    if (plow) { const gy = G - 1.5; if (plow.monte > 1) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(plow.x + 52, gy, plow.monte * .9, plow.monte * .55, 0, Math.PI, 0); c.fill(); } trator(plow.x, gy, t); } c.restore();
  }
  if (EP === 'anonovo') { // foguetes: sobem do fundo com um rasto e rebentam no céu (às vezes uma chuva dourada)
    if (t > (prox.fogo || 0)) { prox.fogo = t + rnd(.55, 1.5); foguetes.push({ x: rnd(W * .1, W * .9), y: G, vy: -rnd(H * .95, H * 1.3), ay: rnd(H * .1, H * .42), c: [['#ffd34d', '#fff'], ['#ff4d5e', '#ffc2c8'], ['#5cb8ff', '#d6ecff'], ['#4dd88a', '#dbffe9'], ['#ff8ad8', '#ffe0f4'], ['#c084fc', '#f3e8ff']][Math.random() * 6 | 0] }); }
    foguetes = foguetes.filter(r => { r.y += r.vy * dt; r.vy += 300 * dt; c.globalAlpha = .9; c.strokeStyle = 'rgba(255,214,140,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(r.x, r.y); c.lineTo(r.x - r.vy * .02, r.y + 16); c.stroke(); c.globalAlpha = 1;
      if (r.y <= r.ay || r.vy >= -40) { explode(r.x, r.y, r.c, 70, 190); if (Math.random() < .3) explode(r.x, r.y, ['#ffd34d', '#ffb000'], 40, 90); return false; } return true; }); }
  if (EP === 'pascoa') { if (!coelho && t > (prox.coelho || 0)) { const dir = Math.random() < .5 ? 1 : -1; coelho = { x: dir > 0 ? -40 : W + 40, y: G - 2, dir, ph: 0 }; prox.coelho = t + rnd(25, 45); }
    if (coelho) { coelho.x += coelho.dir * 60 * dt; coelho.ph += dt * 6; coelhoDraw(coelho, t); if (coelho.x < -60 || coelho.x > W + 60) coelho = null; } }
  if (EP === 'halloween') { if (t > (prox.bat || 0)) { prox.bat = t + rnd(10, 22); const n = 3 + (Math.random() * 4 | 0), dir = Math.random() < .5 ? 1 : -1; for (let i = 0; i < n; i++) morcegos.push({ x: dir > 0 ? -40 - i * 30 : W + 40 + i * 30, y: rnd(H * .12, H * .45), dir, s: rnd(.6, 1.1), f: rnd(0, 6), v: rnd(120, 190) }); }
    morcegos = morcegos.filter(b => { b.x += b.dir * b.v * dt; b.y += Math.sin(t * 3 + b.f) * 20 * dt; morcegoDraw(b, t); return b.x > -80 && b.x < W + 80; }); }
  fogos = fogos.filter(f => { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 90 * dt; f.vx *= .985; const k = 1 - f.t / f.life; if (k <= 0) return false; c.globalAlpha = k; c.fillStyle = Array.isArray(f.c) ? f.c[f.t < .25 ? 1 : 0] : f.c; c.beginPath(); c.arc(f.x, f.y, f.r, 0, 7); c.fill(); return true; }); c.globalAlpha = 1; };

/* ---------- ligar e desligar ---------- */
let gar = null, mascote = null, TIM = 0;
const desliga = () => { if (MO) { MO.disconnect(); MO = null; } cancelAnimationFrame(RAF); RAF = 0; if (cv) { cv.remove(); cv = null; } if (gar) { gar.remove(); gar = null; } if (mascote) { mascote.remove(); mascote = null; } clearTimeout(TIM); document.documentElement.removeAttribute('data-epoca'); document.querySelectorAll('.ep-ovo').forEach(e => e.remove()); EP = ''; P = []; fogos = []; foguetes = []; morcegos = []; plow = null; coelho = null; prevPill(); };
let MO = null; const garlanda = () => { const top = document.getElementById('top'); if (!top || !GAR[EP]) return; gar = document.createElement('div'); gar.className = 'ep-gar'; gar.setAttribute('aria-hidden', 'true');
  gar.style.setProperty('--g1', GAR[EP](0)); gar.style.setProperty('--g2', GAR[EP](1)); top.appendChild(gar);
  if (MO) MO.disconnect(); MO = new MutationObserver(() => { if (gar && !top.contains(gar)) top.appendChild(gar); }); MO.observe(top, { childList: true }); };
// os personagens que passam de vez em quando (tocáveis)
const personagem = () => { clearTimeout(TIM); if (!EP || quieto()) return; const espera = { natal: [60, 120], anonovo: [40, 80], halloween: [25, 50] }[EP]; if (!espera) return;
  TIM = setTimeout(() => { if (document.hidden || !EP) return personagem(); if (mascote) mascote.remove(); mascote = document.createElement('button'); mascote.type = 'button';
    if (EP === 'halloween') { const m = Math.random() < .5; mascote.className = m ? 'ep-mon' : 'ep-fan'; mascote.innerHTML = m ? MONSTRO : FANTASMA; mascote.setAttribute('aria-label', m ? 'Um monstro a espreitar' : 'Um fantasma'); if (!m) mascote.style.top = rnd(18, 50) + 'vh'; }
    else if (EP === 'anonovo') { mascote.className = 'ep-santa ep-champ'; mascote.innerHTML = CHAMP(); mascote.setAttribute('aria-label', 'Champanhe a estourar'); mascote.style.top = rnd(10, 26) + 'vh'; }
    else { mascote.className = 'ep-santa'; mascote.innerHTML = SANTA; mascote.setAttribute('aria-label', 'O Pai Natal no trenó'); mascote.style.top = rnd(9, 22) + 'vh'; }
    mascote.addEventListener('click', ev => { ev.stopPropagation(); const r = mascote.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (EP === 'halloween') { UI.toast(mascote.className === 'ep-mon' ? 'Grrr! Apanhaste-o.' : 'Buuu!', 'pos'); explode(x, y, ['#ff7a00', '#7b2cbf', '#1b1b1f'], 40, 160); for (let i = 0; i < 5; i++) morcegos.push({ x, y: y + rnd(-20, 20), dir: Math.random() < .5 ? 1 : -1, s: rnd(.6, 1), f: rnd(0, 6), v: rnd(140, 220) }); }
      else if (EP === 'anonovo') { UI.toast('Feliz Ano Novo! Que ' + ANO() + ' seja o teu melhor ano.', 'pos'); for (let i = 0; i < 8; i++) setTimeout(() => explode(x + rnd(-60, 60), y + rnd(-30, 30), [['#ffd34d', '#fff'], ['#e6e8ee', '#ffffff'], ['#ff4d5e', '#ffd34d']][i % 3], 34, 150), i * 110); }
      else { UI.toast('Ho ho ho! Feliz Natal!', 'pos'); for (let i = 0; i < 6; i++) setTimeout(() => explode(x + rnd(-40, 40), y, ['#c1121f', '#2a9d8f', '#ffd34d', '#fff'], 18, 90), i * 120); }
      mascote.classList.add('fora'); setTimeout(() => { if (mascote) { mascote.remove(); mascote = null; } }, 600); });
    mascote.addEventListener('animationend', () => { if (mascote) { mascote.remove(); mascote = null; } }); document.body.appendChild(mascote); personagem(); }, rnd(espera[0], espera[1]) * 1000 * (cfg().ver ? .12 : 1)); };
// Páscoa: um ovo escondido em cada página (caça aos ovos)
const ovos = () => U.ls.get('os2ovos', { n: 0 }) || { n: 0 };
const esconde = () => { if (EP !== 'pascoa') return; document.querySelectorAll('.ep-ovo').forEach(e => e.remove()); const v = document.getElementById('view'); if (!v || Math.random() < .35) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ep-ovo'; const c = CORES_OVO[Math.random() * CORES_OVO.length | 0]; b.innerHTML = OVO(c); b.setAttribute('aria-label', 'Um ovo de Páscoa escondido');
  b.style.left = rnd(4, 88) + '%'; b.style.top = Math.max(120, rnd(.2, .9) * Math.min(v.scrollHeight, 2400)) + 'px'; b.style.setProperty('--r', rnd(-25, 25) + 'deg');
  b.addEventListener('click', ev => { ev.stopPropagation(); const o = ovos(); o.n++; U.ls.set('os2ovos', o); const r = b.getBoundingClientRect(); explode(r.left + r.width / 2, r.top + r.height / 2, c.concat(['#fff']), 30, 120); UI.toast(`Encontraste um ovo! Já tens ${o.n}.`, 'pos'); b.remove(); });
  if (getComputedStyle(v).position === 'static') v.style.position = 'relative'; v.appendChild(b); };
// a prévia (Agenda da administração e Definições): um aviso a flutuar com o nome do tema e "Parar"; acaba sozinha aos 10 minutos
let PILL = null, PT = 0;
const prevPill = () => { const c = cfg(), on = !!(EP && c.ver && c.ate > Date.now() && NOMES[EP]); clearTimeout(PT);
  if (!on) { if (PILL) { PILL.remove(); PILL = null; } return; }
  if (!PILL) { PILL = document.createElement('button'); PILL.type = 'button'; PILL.className = 'ep-prev'; PILL.addEventListener('click', ev => { ev.stopPropagation(); A.epVer({ dataset: { v: '' } }); UI.toast('Prévia parada. O app voltou ao normal.', 'pos'); }); document.body.appendChild(PILL); }
  PILL.innerHTML = `<span>A ver: <b>${esc(NOMES[EP])}</b></span><i>Parar</i>`; PILL.setAttribute('aria-label', 'Parar a prévia do tema ' + NOMES[EP]);
  PT = setTimeout(() => { liga(); prevPill(); }, Math.max(500, c.ate - Date.now() + 300)); };
const liga = () => { const e = atual(); if (e === EP && (cv || !e)) return; desliga(); if (!e) return; EP = e; document.documentElement.setAttribute('data-epoca', e); garlanda();
  if (!quieto()) { cv = document.createElement('canvas'); cv.className = 'ep-cv'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); cx = cv.getContext('2d'); tamanho(); P = Array.from({ length: N() }, () => { const p = nova(); p.y = rnd(-20, H * .95); return p; }); ult = performance.now(); prox = { plow: performance.now() / 1000 + (cfg().ver ? 5 : 50) }; RAF = requestAnimationFrame(passo); personagem(); }
  setTimeout(esconde, 800); prevPill(); };
addEventListener('resize', () => { if (cv) tamanho(); });
// tocar num espaço vazio: um efeito da festa
document.addEventListener('click', ev => { if (!EP || !cv || ev.target.closest('a,button,input,select,textarea,label,[data-act],[role=button],.modal,#top,#tabbar,canvas:not(.ep-cv)')) return;
  const x = ev.clientX, y = ev.clientY; const C = { natal: ['#fff', '#dff1ff'], anonovo: ['#ffd34d', '#ff4d5e', '#5cb8ff', '#fff'], pascoa: ['#ffc8dd', '#bde0fe', '#d8f3dc', '#fff1c1'], halloween: ['#ff7a00', '#7b2cbf', '#1b1b1f'], carnaval: ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0'], junho: ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a'] }[EP];
  explode(x, y, C, 26, 110); if (EP === 'halloween' && Math.random() < .4) morcegos.push({ x, y, dir: x < W / 2 ? 1 : -1, s: .8, f: 0, v: 200 }); }, true);
OS.on && OS.on('ready', () => { liga(); setInterval(liga, 10 * 6e4); });
addEventListener('hashchange', () => setTimeout(esconde, 600));
document.addEventListener('visibilitychange', () => { if (!document.hidden) liga(); });

/* ---------- Definições › Temas das festas ---------- */
const painel = () => { const c = cfg(), hoje = deHoje(), ve = c.ver && c.ate > Date.now() ? c.ver : '';
  return `<div class="pn" id="epSet"><div class="pn-h"><h3>${UI.ic('gift')}Temas das festas</h3><span class="mut" style="font-size:12px">${hoje ? 'Agora: ' + esc(NOMES[hoje]) : 'Nenhuma festa agora'}</span></div>
    <p class="mut" style="margin:0 0 10px">O app veste-se para cada festa durante toda a época e volta ao normal quando acaba: Carnaval, Páscoa, Santos Populares e Festas Juninas, Halloween, Natal e passagem de ano. Toca num espaço vazio para um efeito.${OS.U.ls.get('os2ovos', { n: 0 }).n ? ` Ovos de Páscoa encontrados: ${ovos().n}.` : ''}</p>
    <div class="seg" role="group" aria-label="Temas das festas">${[['auto', 'Automático'], ['off', 'Desligado']].map(([v, n]) => `<button type="button" class="${c.modo === v ? 'on' : ''}" aria-pressed="${c.modo === v}" data-act="epModo" data-v="${v}">${n}</button>`).join('')}</div>
    <p class="mut" style="margin:14px 0 8px">Ver agora (durante 10 minutos):</p><div class="row gap6" style="flex-wrap:wrap">${Object.keys(NOMES).map(k => `<button type="button" class="chip ${ve === k ? 'on' : ''}" aria-pressed="${ve === k}" data-act="epVer" data-v="${k}">${esc(NOMES[k])}</button>`).join('')}${ve ? '<button type="button" class="chip" data-act="epVer" data-v="">Voltar ao normal</button>' : ''}</div></div>`; };
A.epModo = b => { guarda({ modo: b.dataset.v, ver: '', ate: 0 }); liga(); UI.toast(b.dataset.v === 'off' ? 'Temas das festas desligados.' : 'O app muda sozinho em cada festa.', 'pos'); OS.request(); };
A.epVer = b => { guarda(b.dataset.v ? { ver: b.dataset.v, ate: Date.now() + 10 * 6e4 } : { ver: '', ate: 0 }); EP = '__'; liga(); OS.request(); };
OS.on && OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._ep) return; OS.views.definicoes = sub => { const h = o(sub); return String(sub || '') === '' ? h + painel() : h; }; Object.keys(o).forEach(k => { if (!(k in OS.views.definicoes)) OS.views.definicoes[k] = o[k]; }); OS.views.definicoes._ep = 1; });
OS.Epocas = { deHoje, atual, pascoa, liga, desliga, estado: () => ({ EP, neve: Math.max(0, ...neve), plow: !!plow, nplow: NPLOW, P: P.length, cv: !!cv, gar: !!gar, ks: [...new Set(P.map(p => p.k))].join(''), santa: !!document.querySelector('.ep-santa:not(.ep-champ)'), pill: !!PILL }) };
})();
