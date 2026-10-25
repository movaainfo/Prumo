/* PRUMO — a cena: o mar visto da muralha de um forte antigo, na costa de Aveiro, como num filme a preto e azul.
   O céu segue a hora real (madrugada, amanhecer, dia, fim de tarde, noite com estrelas). Ao fundo, os palheiros da Costa Nova,
   um moliceiro na água e o Farol da Barra, a única luz quente, que gira de noite. Grão de filme por cima.
   Desenhada em SVG à medida do ecrã: no ecrã de entrada mexe-se devagar (água, barco, farol); no Painel fica parada. */
(() => {
'use strict';
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), toH = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toH(A.map((v, i) => v + (B[i] - v) * t)); };
// céu, mar e terra ao longo do dia: [hora, topo do céu, horizonte, mar perto do horizonte, mar ao fundo, terra, luz do sol/lua, estrelas, farol aceso]
const K = [[0, '#04070D', '#152338', '#0C1727', '#04080F', '#03060B', '#8FA6C4', 1, 1], [5, '#060B15', '#26364F', '#121E31', '#060C16', '#04070D', '#A9BCD4', .7, 1],
  [6.5, '#1A2A44', '#8C9DB3', '#3A4E68', '#17253A', '#0B131F', '#F2C48D', 0, .35], [9, '#2C4769', '#B4C3D3', '#4C6787', '#21344C', '#111C29', '#FFF1D9', 0, 0],
  [13, '#31517A', '#C5D2DF', '#55728F', '#253D58', '#14202D', '#FFFFFF', 0, 0], [17, '#28415F', '#B9C2CC', '#4A607A', '#1F3149', '#101A26', '#F7D7AE', 0, 0],
  [18.6, '#1B2B45', '#C8A385', '#3D4A5E', '#17223A', '#0A1019', '#F2B47A', 0, .35], [20, '#0B1424', '#3B4B66', '#1A2638', '#0A111D', '#05090F', '#C9D4E6', .45, 1], [24, '#04070D', '#152338', '#0C1727', '#04080F', '#03060B', '#8FA6C4', 1, 1]];
const pal = h => { let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++; const a = K[i], b = K[i + 1], t = (h - a[0]) / (b[0] - a[0]);
  return { top: mix(a[1], b[1], t), hz: mix(a[2], b[2], t), seaT: mix(a[3], b[3], t), seaB: mix(a[4], b[4], t), land: mix(a[5], b[5], t), glow: mix(a[6], b[6], t), stars: a[7] + (b[7] - a[7]) * t, beam: a[8] + (b[8] - a[8]) * t, day: h >= 6.5 && h < 19.6 }; };
const rng = s => { let x = s; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; };
const f = v => Math.round(v * 10) / 10;

// W × H em unidades do ecrã; o: { anim, tall (ecrã de entrada), id }
const svg = (W, H, o = {}) => { const now = o.date || new Date(), h = now.getHours() + now.getMinutes() / 60, P = pal(h), id = o.id || 'sc', tall = H > W * 1.2;
  const hz = H * (tall ? .6 : .64), r = rng(1 + now.getDate() * 31), u = Math.min(W, H * 1.6) / 400, A = !!o.anim, ra = rng(77 + now.getDate());
  // sol de dia, lua de noite, num arco sobre o mar
  const t = P.day ? (h - 6.5) / 13.1 : ((h < 12 ? h + 24 : h) - 19.6) / 10.9, bx = W * (.18 + .64 * t), by = hz - Math.sin(Math.PI * t) * hz * (tall ? .62 : .72) + hz * .06, br = 9 * u;
  const stars = P.stars > .02 ? Array.from({ length: tall ? 90 : 60 }, () => { const x = r() * W, y = r() * hz * .82, s = r(); return `<circle${A && ra() < .4 ? ` class="sc-tw" style="--dl:-${f(ra() * 4)}s;--du:${f(2.6 + ra() * 3)}s"` : ''} cx="${f(x)}" cy="${f(y)}" r="${f((s > .92 ? 1.5 : .8) * Math.max(.8, u * .9))}" fill="#E6EEF8" opacity="${f(P.stars * (.25 + s * .7))}"/>`; }).join('') : '';
  const cloud = (cx, cy, w, k) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w)}" ry="${f(w * .07)}" fill="${mix(P.top, P.hz, .55)}" opacity="${k}"/><ellipse cx="${f(cx + w * .25)}" cy="${f(cy - w * .05)}" rx="${f(w * .55)}" ry="${f(w * .05)}" fill="${mix(P.top, P.hz, .7)}" opacity="${k * .8}"/>`;
  // reflexo na água por baixo da luz
  const glint = Array.from({ length: 16 }, (_, i) => { const y = hz + 4 + i * (H - hz) * .045, w = (26 - i * 1.2) * u * (.6 + r() * .8), x = bx - w / 2 + (r() - .5) * 10 * u; return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(Math.max(1, 1.3 * u))}" rx="1" fill="${P.glow}" opacity="${f((P.day ? .5 : .35) * (1 - i / 18))}"/>`; }).join('');
  // costa ao longe: dunas da Costa Nova com os palheiros às riscas
  const L = P.land, Lh = mix(P.land, P.hz, .22), dune = `M0 ${f(hz + 2)} L0 ${f(hz - 7 * u)} Q${f(W * .12)} ${f(hz - 11 * u)} ${f(W * .24)} ${f(hz - 8 * u)} T${f(W * .46)} ${f(hz - 3 * u)} L${f(W * .5)} ${f(hz + 2)}Z`;
  const pal7 = Array.from({ length: 6 }, (_, i) => { const x = W * .07 + i * 13 * u, w = 10 * u, y = hz - 8 * u - (i % 2 ? 3 : 7) * u, hh = (i % 2 ? 9 : 12) * u;
    return `<path d="M${f(x)} ${f(y)} L${f(x + w / 2)} ${f(y - 4 * u)} L${f(x + w)} ${f(y)} L${f(x + w)} ${f(y + hh)} L${f(x)} ${f(y + hh)}Z" fill="${L}"/>` + [1, 3].map(k => `<rect x="${f(x + w * k / 5)}" y="${f(y)}" width="${f(w / 5)}" height="${f(hh)}" fill="${Lh}"/>`).join(''); }).join('');
  // Farol da Barra: torre alta às riscas, com a luz quente lá em cima
  const fx = W * (tall ? .74 : .72), fh = (tall ? H * .17 : hz * .58), fw = 9 * u, fy = hz - fh, bands = Array.from({ length: 6 }, (_, i) => `<rect x="${f(fx - fw / 2 + i * .25 * u)}" y="${f(fy + fh * (.12 + i * .14))}" width="${f(fw - i * .5 * u)}" height="${f(fh * .06)}" fill="${Lh}"/>`).join('');
  // de dia (no ecrã de entrada) o farol também gira, com a luz mais fraca
  const lit = P.beam > .05, bo = lit ? P.beam : A ? .28 : 0, lamp = `<rect x="${f(fx - fw * .38)}" y="${f(fy - 5 * u)}" width="${f(fw * .76)}" height="${f(5 * u)}" fill="${lit ? '#F2C48D' : Lh}"/>`;
  const beam = bo ? `<g class="sc-beam" style="transform-origin:${f(fx)}px ${f(fy - 2.5 * u)}px"><path d="M${f(fx)} ${f(fy - 2.5 * u)} L${f(fx - W * .55)} ${f(fy - 26 * u)} L${f(fx - W * .55)} ${f(fy + 18 * u)}Z" fill="url(#${id}b)" opacity="${f(bo * .75)}"/></g><circle class="sc-lamp" cx="${f(fx)}" cy="${f(fy - 2.5 * u)}" r="${f(16 * u)}" fill="url(#${id}l)" opacity="${f(lit ? P.beam : .55)}"/>` : '';
  const pier = `<path d="M${f(fx - 8 * u)} ${f(hz + 1)} L${f(W)} ${f(hz - 1)} L${f(W)} ${f(hz + 4 * u)} L${f(fx - 8 * u)} ${f(hz + 4 * u)}Z" fill="${L}"/>`;
  const tower = `<path d="M${f(fx - fw / 2)} ${f(hz + 1)} L${f(fx - fw * .38)} ${f(fy)} L${f(fx + fw * .38)} ${f(fy)} L${f(fx + fw / 2)} ${f(hz + 1)}Z" fill="${L}"/>${bands}${lamp}<path d="M${f(fx - fw * .5)} ${f(fy - 5 * u)} L${f(fx)} ${f(fy - 9 * u)} L${f(fx + fw * .5)} ${f(fy - 5 * u)}Z" fill="${L}"/>`;
  // moliceiro: proa alta em pescoço de cisne, mastro e vela recolhida
  const mx = W * (tall ? .4 : .44), my = hz + (H - hz) * (tall ? .16 : .22), m = u * 1.1;
  const boat = `<g class="sc-bdrift"><g class="sc-boat"><path d="M${f(mx - 26 * m)} ${f(my - 4 * m)} Q${f(mx)} ${f(my + 5 * m)} ${f(mx + 22 * m)} ${f(my - 3 * m)} Q${f(mx + 28 * m)} ${f(my - 16 * m)} ${f(mx + 22 * m)} ${f(my - 22 * m)} Q${f(mx + 19 * m)} ${f(my - 12 * m)} ${f(mx + 15 * m)} ${f(my - 5 * m)} L${f(mx - 24 * m)} ${f(my - 7 * m)}Z" fill="${L}"/>
    <rect x="${f(mx - 3 * m)}" y="${f(my - 30 * m)}" width="${f(1.4 * m)}" height="${f(25 * m)}" fill="${L}"/><path d="M${f(mx - 2 * m)} ${f(my - 28 * m)} L${f(mx + 10 * m)} ${f(my - 9 * m)} L${f(mx - 2 * m)} ${f(my - 9 * m)}Z" fill="${Lh}" opacity=".7"/>
    <rect x="${f(mx - 22 * m)}" y="${f(my - 3 * m)}" width="${f(44 * m)}" height="${f(1.2 * m)}" fill="${P.glow}" opacity=".18"/></g></g>`;
  // muralha do forte em primeiro plano (de onde se vê o mar)
  const wy = H * (tall ? .9 : .9), stones = Array.from({ length: 9 }, (_, i) => { const x = i * W / 8 + (r() - .5) * 12 * u; return `<rect x="${f(x)}" y="${f(wy + 6 * u + (i % 2) * 7 * u)}" width="${f(W / 9)}" height="${f(.9 * u)}" fill="${mix(L, P.hz, .12)}" opacity=".6"/>`; }).join('');
  const wall = `<path d="M0 ${f(H)} L0 ${f(wy - 4 * u)} L${f(W * .08)} ${f(wy - 6 * u)} L${f(W * .1)} ${f(wy)} L${f(W * .55)} ${f(wy + 2 * u)} L${f(W * .58)} ${f(wy - 3 * u)} L${f(W)} ${f(wy - 1 * u)} L${f(W)} ${f(H)}Z" fill="${mix(L, '#000000', .25)}"/>${stones}`;
  const gull = (x, y, s) => `<path${A ? ` class="sc-flap" style="--du:${f(.7 + ra() * .5)}s;--dl:-${f(ra())}s"` : ''} d="M${f(x - 5 * s)} ${f(y)} q${f(2.5 * s)} ${f(-3 * s)} ${f(5 * s)} 0 q${f(2.5 * s)} ${f(-3 * s)} ${f(5 * s)} 0" fill="none" stroke="${L}" stroke-width="${f(1.1 * s)}" stroke-linecap="round" opacity=".7"/>`;
  // gaivotas: paradas no Painel; no ecrã de entrada atravessam o céu a bater as asas
  const gulls = !(P.day || P.beam < .5) ? '' : !A ? [[.3, .3], [.34, .27], [.6, .22]].map(([gx, gy]) => gull(W * gx, hz * gy, u)).join('')
    : [[.3, 1], [.27, 1.1], [.22, .9], [.4, .8], [.35, .85]].map(([gy, k], i) => `<g class="sc-gl" style="--fx:${f(W * 1.3)}px;--fy:${f(-8 * u + ra() * 16 * u)}px;--du:${f(34 + i * 9 + ra() * 10)}s;--dl:-${f(i < 3 ? 6 + i * 2.5 : 20 + ra() * 20)}s">${gull(-W * .12, hz * gy, u * k)}</g>`).join('');
  // espuma na muralha, ondulação a passar no mar e o mato em cima da muralha a abanar ao vento
  const wallY = x => { const P2 = [[0, wy - 4 * u], [W * .08, wy - 6 * u], [W * .1, wy], [W * .55, wy + 2 * u], [W * .58, wy - 3 * u], [W, wy - 1 * u]]; for (let i = 1; i < P2.length; i++) if (x <= P2[i][0]) { const [a, b] = [P2[i - 1], P2[i]]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return wy; };
  const swell = A ? Array.from({ length: 14 }, () => { const y = hz + 5 * u + ra() * (wy - hz - 12 * u), w = (18 + ra() * 46) * u * (.5 + (y - hz) / (wy - hz)); return `<rect class="sc-sw" style="--d:${f(26 * u)}px;--du:${f(6 + ra() * 6)}s;--dl:-${f(ra() * 12)}s" x="${f(ra() * W)}" y="${f(y)}" width="${f(w)}" height="${f(Math.max(1, .9 * u))}" rx="1" fill="${mix(P.hz, '#FFFFFF', .35)}" opacity="0"/>`; }).join('') : '';
  const foam = A ? `<path class="sc-foam" d="M0 ${f(wy - 6 * u)} L${f(W * .08)} ${f(wy - 8 * u)} L${f(W * .1)} ${f(wy - 2 * u)} L${f(W * .55)} ${f(wy)} L${f(W * .58)} ${f(wy - 5 * u)} L${f(W)} ${f(wy - 3 * u)}" fill="none" stroke="${mix(P.hz, '#FFFFFF', .5)}" stroke-width="${f(1.6 * u)}" stroke-linecap="round" opacity="0"/>` : '';
  const nG = tall ? 7 : 11, grass = A ? Array.from({ length: nG }, (_, i) => { const x = (i + .2 + ra() * .6) * W / nG, y = wallY(x) + .5 * u, h = (12 + ra() * 13) * u; let d = '';
      for (let k = 0; k < 8; k++) { const dx = (k - 3.5) * 1.4 * u, lean = (ra() - .5) * 12 * u, hh = h * (.55 + ra() * .45); d += `M${f(x + dx)} ${f(y)} q${f(lean * .25)} ${f(-hh * .55)} ${f(lean)} ${f(-hh)}`; }
      return `<path class="sc-grass" style="transform-origin:${f(x)}px ${f(y)}px;--du:${f(2.8 + ra() * 2.4)}s;--dl:-${f(ra() * 4)}s" d="${d}" fill="none" stroke="${mix(L, '#000000', .1)}" stroke-width="${f(1.5 * u)}" stroke-linecap="round"/>`; }).join('') : '';
  return `<svg class="scene ${o.anim ? 'sc-anim' : ''}" viewBox="0 0 ${f(W)} ${f(H)}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.top}"/><stop offset="1" stop-color="${P.hz}"/></linearGradient>
    <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.seaT}"/><stop offset="1" stop-color="${P.seaB}"/></linearGradient>
    <radialGradient id="${id}g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}l"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".9"/><stop offset="1" stop-color="#F2C48D" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}b" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#FFE2B5" stop-opacity=".55"/><stop offset="1" stop-color="#FFE2B5" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}v" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>
  <rect width="${f(W)}" height="${f(hz + 1)}" fill="url(#${id}s)"/>${stars}
  <circle cx="${f(bx)}" cy="${f(by)}" r="${f(br * 9)}" fill="url(#${id}g)"/><circle cx="${f(bx)}" cy="${f(by)}" r="${f(br)}" fill="${P.glow}" opacity="${P.day ? .95 : .9}"/>${P.day ? '' : `<circle cx="${f(bx + br * .35)}" cy="${f(by - br * .2)}" r="${f(br * .85)}" fill="${P.top}" opacity=".35"/>`}
  <g class="sc-cloud">${cloud(W * .22, hz * .38, 70 * u, .35)}${cloud(W * .7, hz * .22, 90 * u, .25)}</g>
  <rect y="${f(hz)}" width="${f(W)}" height="${f(H - hz)}" fill="url(#${id}w)"/><rect y="${f(hz)}" width="${f(W)}" height="${f(Math.max(1, .8 * u))}" fill="${mix(P.hz, '#FFFFFF', .25)}" opacity=".5"/>
  <g class="sc-glint">${glint}</g>${swell}<path d="${dune}" fill="${L}"/>${pal7}${pier}${beam}${tower}${boat}${gulls}${foam}${wall}${grass}
  <rect width="${f(W)}" height="${f(H)}" fill="url(#${id}v)"/></svg>`; };

// grão de filme: um pequeno ruído desenhado uma vez e repetido (fica parado, não pesa)
let GR = '';
const grain = () => { if (GR) return GR; try { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), d = x.createImageData(96, 96); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 26; } x.putImageData(d, 0, 0); GR = c.toDataURL('image/png'); } catch (e) { GR = ''; } return GR; };
OS.Scene = { svg, pal, grain };
// o mesmo grão, muito leve, por trás da app inteira (fora do modo leve)
try { const R = document.documentElement; if (!R.classList.contains('lite')) R.style.setProperty('--grain', `url(${grain()})`); } catch (e) { }
})();
