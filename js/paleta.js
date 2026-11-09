/* PRUMO — paletas de cores (Definições › Aplicação › Cores do app).
   Corre no <head>, antes do primeiro desenho. O tema base é o azul ("Mar"); as outras paletas mudam, no próprio sítio,
   as cores azuis das folhas de estilo (a ordem e a força das regras ficam iguais, por isso nada se sobrepõe ao que não devia).
   Cada azul é lido pelo papel que tem: fundo escuro, cinzento de texto e linhas, destaque claro ou botão.
   Os vermelhos, verdes e amarelos com significado (gastos, avisos, metas) e os desenhos do Dominus não mudam.
   A escolha fica por perfil neste aparelho (nau:pal:<perfil>) e a última usada em nau:pal (para abrir já com as cores certas). */
(() => {
'use strict';
// [id, nome, descrição, papéis: dk (fundos escuros), nt (cinzentos: texto, linhas), lt (destaques claros), md (botões e tons médios)]
// cada papel: h = matiz, k = quanto da saturação fica, m = saturação máxima
const LIST = [
  ['selo', 'Selo', 'Vinho, creme e dourado: as cores do logo.', { dk: { h: 354, k: .6, m: .32 }, nt: { h: 36, k: .75, m: .3 }, lt: { h: 41, k: .85, m: .62 }, md: { h: 352, k: 1.1, m: .68 } }],
  ['mar', 'Mar', 'O azul da noite vista do forte.', null],
  ['floresta', 'Floresta', 'Verde-escuro do pinhal e menta.', { dk: { h: 158, k: .6, m: .34 }, nt: { h: 110, k: .6, m: .2 }, lt: { h: 146, k: .75, m: .5 }, md: { h: 154, k: .95, m: .56 } }],
  ['ametista', 'Ametista', 'Roxo profundo e lilás.', { dk: { h: 268, k: .7, m: .4 }, nt: { h: 262, k: .7, m: .24 }, lt: { h: 266, k: .9, m: .7 }, md: { h: 266, k: 1, m: .6 } }],
  ['cafe', 'Café', 'Castanho torrado, cobre e mel.', { dk: { h: 24, k: .55, m: .3 }, nt: { h: 32, k: .7, m: .24 }, lt: { h: 34, k: .85, m: .7 }, md: { h: 20, k: 1, m: .62 } }],
  ['grafite', 'Grafite', 'Preto e cinzentos, sem cor.', { dk: { h: 220, k: .05, m: .05 }, nt: { h: 220, k: .05, m: .05 }, lt: { h: 220, k: .06, m: .06 }, md: { h: 220, k: .06, m: .06 } }]];
const DEF = 'selo';

const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l]; };
const hsl2rgb = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = t < 0 ? t + 1 : t > 1 ? t - 1 : t; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(x => Math.round(x * 255)); };
// é um azul do tema? (os violetas e índigos dos dados ficam de fora)
const blue = (h, s) => s >= .08 && h >= 178 && h <= 232;
const role = (s, l) => l < .22 ? 'dk' : (s < .3 || (l >= .62 && s < .55)) ? 'nt' : l >= .55 ? 'lt' : 'md';
const map = (P, r, g, b) => { const [h, s, l] = rgb2hsl(r, g, b); if (!blue(h, s)) return null; const q = P[role(s, l)]; return hsl2rgb(q.h, Math.min(s * q.k, q.m), l); };
const RX = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)|#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const hexIn = x => { if (x.length < 6) x = x.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)).concat(x.length === 8 ? [parseInt(x.slice(6, 8), 16) / 255] : []); };
const out = (c, a) => a == null || a === 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${+(+a).toFixed(3)})`;
// troca as cores de um valor; hex só nas variáveis (--x), para não tocar em url(#id)
const conv = (P, v, hex) => v.replace(RX, (m, r, g, b, a, hx) => { if (hx && !hex) return m; let c, al = null;
  if (hx) { c = hexIn(hx); if (c.length === 4) al = c.pop(); } else { c = [+r, +g, +b]; if (a != null) al = /%$/.test(a) ? parseFloat(a) / 100 : +a; }
  const n = map(P, c[0], c[1], c[2]); return n ? out(n, al) : m; });
const ANY = LIST[0][3], hasBlue = (v, hex) => conv(ANY, v, hex) !== v;

// só as propriedades que levam cor (as outras nem se leem: é o que faz isto ser rápido)
const CP = /color$|^--|shadow|^background-image$|^fill$|^stroke$|^filter$/, SER = /^--c\d+$/; // --c1…--c10: as séries dos gráficos ficam distintas
const ORIG = new WeakMap(); let CUR = 'mar';
// o mapa do mundo fica sempre com cores de mapa (mar azul), seja qual for a paleta (v2.97: "não quero o mapa do mundo vermelho")
const KEEP = /\.mu-(map|eq|o|cs|dots|isl|tag\.v)\b|\.mu-leg i|\.od-(sea|land|pin)\b|\.fb-(hero|live|pl|pb|pbb|r|form|card-[yr]|rc|st|mc|pdm|pd|tth|cth|cthl|lead|back|kp|plai|tb|zl|xip|xipv|pp|inj|aisc|plsc)\b/;
const walk = (rules, fn) => { for (let i = 0; i < rules.length; i++) { const r = rules[i]; if (r.style && !(r.selectorText && KEEP.test(r.selectorText))) fn(r.style); if (r.cssRules) walk(r.cssRules, fn); } };
const get = id => LIST.find(x => x[0] === id) || null;
const apply = id => { const it = get(id) || get(DEF), P = it[3]; if (it[0] === CUR) return CUR;
  for (const sh of Array.from(document.styleSheets)) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } if (!rules) continue;
    walk(rules, st => { let o = ORIG.get(st);
      if (o === undefined) { o = null; for (let i = 0; i < st.length; i++) { const p = st[i]; if (!CP.test(p) || SER.test(p)) continue; const v = st.getPropertyValue(p), hx = p.charCodeAt(0) === 45; if (v && (v.indexOf('rgb') >= 0 || (hx && v.indexOf('#') >= 0)) && hasBlue(v, hx)) (o || (o = {}))[p] = [v, st.getPropertyPriority(p)]; } ORIG.set(st, o); }
      if (!o) return; for (const p in o) { const nv = P ? conv(P, o[p][0], p.charCodeAt(0) === 45) : o[p][0]; st.setProperty(p, nv, o[p][1]); } }); }
  CUR = it[0]; document.documentElement.setAttribute('data-pal', CUR);
  const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.setAttribute('content', P ? conv(P, '#070D16', 1) : '#070D16');
  return CUR; };
// um desenho (SVG em texto, como as cenas do fundo) com as cores desta paleta; url(#id) e href="#id" ficam como estão
const RXM = /(url\(\s*|href=["'])?#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g, MC = new Map();
const recolor = (str, id) => { const it = get(id || CUR), P = it && it[3]; if (!P || !str) return str; const k = it[0] + '|' + str; if (MC.has(k)) return MC.get(k);
  const r = str.replace(RXM, (m, pre, hx) => { if (pre) return m; const c = hexIn(hx), al = c.length === 4 ? c.pop() : null, n = map(P, c[0], c[1], c[2]); return n ? (al == null ? '#' + n.map(x => x.toString(16).padStart(2, '0')).join('') : out(n, al)) : m; })
    .replace(/rgba?\([^)]*\)/g, m => conv(P, m, 0));
  if (MC.size > 8) MC.delete(MC.keys().next().value); MC.set(k, r); return r; };
// uma cor do tema base vista nesta paleta (para as amostras nas Definições)
const color = (id, c) => { const it = get(id); return it && it[3] ? conv(it[3], c, 1) : c; };
// uma cor (r, g, b) do tema base na paleta atual, como "r,g,b" (para desenhos em canvas: o núcleo do Spyke, a bola da conversa)
const TC = new Map();
const tone = (r, g, b) => { const it = get(CUR), P = it && it[3]; if (!P) return r + ',' + g + ',' + b; const k = CUR + '|' + r + ',' + g + ',' + b; let v = TC.get(k);
  if (!v) { v = (map(P, r, g, b) || [r, g, b]).join(','); TC.set(k, v); } return v; };
window.PrumoPaleta = { LIST, DEF, apply, color, recolor, tone, cur: () => CUR };
try { const v = JSON.parse(localStorage.getItem('nau:pal') || 'null'); apply(get(v) ? v : DEF); } catch (e) { try { apply(DEF); } catch (e2) { } }
})();
