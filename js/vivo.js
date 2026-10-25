/* PRUMO — movimento: o app mais vivo, sem pesar.
   - ao abrir uma página, os blocos entram em cascata, o título desenha-se, as barras enchem, os gráficos crescem e as linhas desenham-se;
   - os números grandes (saldos, médias, totais) contam até ao valor;
   - ao rolar, o que estava em baixo aparece quando chega ao ecrã;
   - ao tocar num botão ele afunda e espalha uma onda; concluir uma tarefa ou marcar um hábito dá uma pequena explosão;
   - o logo dá uma volta ao mudar de página, o menu entra em cascata, avisos e janelas entram a deslizar.
   Só animações curtas (nada fica a mexer para sempre dentro do app) e só com opacidade e deslocações, para o iPhone e os tablets.
   Definições › Aplicação › Animações: completas, suaves ou desligadas. A escolha da pessoa manda; sem escolha, se o aparelho pede
   menos movimento, as coisas só aparecem devagar (sem deslocações). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act;
const K = 'os2anim';
const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const chosen = () => { const v = U.ls.get(K, null); return v === 'off' || v === 'soft' || v === 'full' ? v : null; };
// (nos testes automáticos fica desligado, salvo se o teste o ligar, para os números não estarem a meio da contagem)
const mode = () => chosen() || (navigator.webdriver ? 'off' : reduce() ? 'soft' : 'full');
const apply = () => { const R = document.documentElement, m = mode(); R.classList.toggle('vv', m !== 'off'); R.classList.toggle('vv-full', m === 'full'); R.classList.toggle('vv-rm', m !== 'off' && !chosen() && reduce());
  if (m === 'off') { const v = document.getElementById('view'); if (v) v.classList.remove('pg-in'); } };
apply();
try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', apply); } catch (e) { }
const V = OS.Vivo = { mode, set: v => { U.ls.set(K, v); apply(); OS.request && OS.request(); } };
const full = () => mode() === 'full';
const rm = () => document.documentElement.classList.contains('vv-rm');

/* ---------- entrada de página ---------- */
const view = () => document.getElementById('view');
let lastR = null, tIn = 0;
const enter = () => { const v = view(); if (!v) return; if (mode() === 'off') { v.classList.remove('pg-in'); return; }
  v.classList.remove('pg-in'); void v.offsetWidth; v.classList.add('pg-in');
  clearTimeout(tIn); tIn = setTimeout(() => v.classList.remove('pg-in'), 1700);
  if (full()) { requestAnimationFrame(() => { countUp(v); reveal(v); }); if (!rm()) spin(); } };

/* ---------- números a contar ---------- */
const dec = () => { try { return (1.5).toLocaleString(OS.loc ? OS.loc() : 'pt-PT').charAt(1); } catch (e) { return ','; } };
const ease = t => 1 - Math.pow(1 - t, 3);
const countUp = root => { const D = dec(), loc = OS.loc ? OS.loc() : 'pt-PT'; let n = 0;
  root.querySelectorAll('.kpi-v, .big-num, .dc-big, .fin-big, .vv-n, .fe-streak b, .co-own b, .dn-v').forEach(el => {
    if (n >= 24 || el.children.length > 1 || el.closest('[data-novv]')) return;
    const txt = el.firstChild && el.firstChild.nodeType === 3 && el.childNodes.length === 1 ? el.firstChild : null; if (!txt) return;
    const t = txt.data, m = t.match(/[−-]?\d[\d   .,']*\d|[−-]?\d/); if (!m) return;
    const raw = m[0], neg = /^[−-]/.test(raw), body = raw.replace(/^[−-]/, ''), li = body.lastIndexOf(D), hasDec = li >= 0 && /^\d{1,2}$/.test(body.slice(li + 1));
    const digits = body.replace(/[^\d]/g, ''), d = hasDec ? body.length - li - 1 : 0, v = (neg ? -1 : 1) * (+digits) / Math.pow(10, d);
    if (!isFinite(v) || Math.abs(v) < 2 || digits.length > 12 || /\d{4}-\d{2}|:\d{2}|\d\/\d/.test(t)) return;   // datas e horas não
    if (!hasDec && v >= 1900 && v <= 2100 && !/[   .,']/.test(body)) return;   // anos (2026) também não
    const grouped = /[   .,']/.test(hasDec ? body.slice(0, li) : body), pre = t.slice(0, m.index), post = t.slice(m.index + raw.length);
    const fmt = x => { let s = Math.abs(x).toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: grouped }); return (x < 0 || neg ? (raw[0] === '−' ? '−' : '-') : '') + s; };
    n++; const t0 = performance.now() + n * 40, dur = 900 + Math.min(700, Math.log10(Math.abs(v) + 1) * 160);
    const step = now => { if (!txt.isConnected || (txt._vv && txt._vv !== t0)) return; const k = Math.max(0, Math.min(1, (now - t0) / dur));
      if (k >= 1) { txt.data = t; return; } txt.data = pre + fmt(v * ease(k)) + post; requestAnimationFrame(step); };
    txt._vv = t0; txt.data = pre + fmt(0) + post; requestAnimationFrame(step); }); };

/* ---------- ao rolar: o que está em baixo aparece quando chega ao ecrã ---------- */
let IO = null;
const reveal = root => { if (!('IntersectionObserver' in window)) return;
  if (!IO) IO = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const el = e.target; IO.unobserve(el); el.classList.add('vv-rv-in'); setTimeout(() => el.classList.remove('vv-rv', 'vv-rv-in'), 900); }), { rootMargin: '0px 0px -6% 0px', threshold: .08 });
  const H = innerHeight; let n = 0;
  root.querySelectorAll(':scope > *, :scope :is(.g,.dash,.dc-grid,.fe-plans) > *, :scope .pn').forEach(el => {
    if (n > 80 || el.classList.contains('vv-rv') || el.closest('.vv-rv')) return; const r = el.getBoundingClientRect();
    if (r.top > H * .96 && r.height > 0) { el.classList.add('vv-rv'); IO.observe(el); n++; } }); };

/* ---------- o logo dá uma volta ---------- */
const spin = () => document.querySelectorAll('.tn-brand, #side .brand-mark').forEach(el => { el.classList.remove('vv-spin'); void el.offsetWidth; el.classList.add('vv-spin'); setTimeout(() => el.classList.remove('vv-spin'), 1100); });

/* ---------- toque: afunda, espalha uma onda; o que mudou dá um salto; concluir dá uma pequena explosão ---------- */
let hit = null;
const keyOf = b => { for (const a of ['data-act', 'data-edit', 'data-go', 'data-oc', 'data-om', 'data-oa']) if (b.hasAttribute(a)) { let s = `[${a}="${CSS.escape(b.getAttribute(a))}"]`;
    for (const x of ['data-id', 'data-v', 'data-k', 'data-d', 'data-i', 'data-h', 'data-m', 'data-r']) if (b.hasAttribute(x)) s += `[${x}="${CSS.escape(b.getAttribute(x))}"]`; return s; } return null; };
const isOn = el => !!el && (/\b(on|done|ok|checked|is-done|pos)\b/.test(el.className || '') || el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-checked') === 'true' || /✓|✔/.test(el.textContent || ''));
// (nos desenhos em SVG, como o mapa do Mundo, não: encolher o país tirava-o de baixo do rato e o clique perdia-se)
document.addEventListener('pointerdown', e => { if (mode() === 'off') return; const b = e.target.closest && e.target.closest('button,.btn,.chip,[data-act],[data-edit],[data-go],a.click,.li.click'); if (!b || b instanceof SVGElement) return;
  b.classList.add('vv-press'); setTimeout(() => b.classList.remove('vv-press'), 240);
  if (full() && !rm() && b.matches('.btn,.chip,button.pri') && !b.disabled) { const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span');
    s.className = 'vv-rip'; s.style.cssText = `--d:${d}px;--l:${e.clientX - r.left - d / 2}px;--t:${e.clientY - r.top - d / 2}px`; b.classList.add('vv-ripc'); b.appendChild(s);
    setTimeout(() => { s.remove(); if (!b.querySelector('.vv-rip')) b.classList.remove('vv-ripc'); }, 650); } }, { passive: true, capture: true });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-act],[data-edit],[data-go],[data-oc],[data-om],[data-oa]'); if (!b) return; const k = keyOf(b);
  if (k) hit = { k, at: Date.now(), was: isOn(b), x: e.clientX, y: e.clientY };
  // caixas de marcar (tarefas, hábitos…): a explosão sai logo, sem esperar pelo ecrã novo
  const cb = e.target.closest('input[type=checkbox]'); if (cb && cb.checked && full() && !rm()) burst(e.clientX, e.clientY); }, true);
const COLS = ['#5CC8E6', '#3FCF8E', '#F2B544', '#9A8CF5', '#F28CB1', '#E9E3D8'];
const burst = (x, y) => { const w = document.createElement('div'); w.className = 'vv-burst'; w.setAttribute('aria-hidden', 'true'); w.style.left = x + 'px'; w.style.top = y + 'px'; w.style.setProperty('--c0', COLS[0]);
  let h = '<b></b>'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + Math.random() * .4, r = 44 + Math.random() * 34; h += `<i style="--c:${COLS[i % COLS.length]};--x:${(Math.cos(a) * r).toFixed(1)}px;--y:${(Math.sin(a) * r).toFixed(1)}px;animation-delay:${(Math.random() * .06).toFixed(2)}s"></i>`; }
  w.innerHTML = h; document.body.appendChild(w); setTimeout(() => w.remove(), 900);
  try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } };
const popAfter = root => { if (!hit || Date.now() - hit.at > 1200 || mode() === 'off') return; const h = hit; hit = null; const el = root.querySelector(h.k) || document.querySelector(h.k); if (!el || el instanceof SVGElement) return;
  el.classList.add('vv-pop'); setTimeout(() => el.classList.remove('vv-pop'), 600);
  if (full() && !rm() && !h.was && isOn(el)) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); el.classList.add('vv-glow'); setTimeout(() => el.classList.remove('vv-glow'), 850); } };
OS.Vivo.burst = burst;

/* ---------- momentos grandes: confetes a cair do topo; pontos a subir de onde tocaste ---------- */
const confetti = (n = 80) => { if (!full() || rm()) return; const w = document.createElement('div'); w.className = 'vv-conf'; w.setAttribute('aria-hidden', 'true'); let h = '';
  for (let i = 0; i < n; i++) { const s = 6 + Math.random() * 7; h += `<i style="left:${(Math.random() * 100).toFixed(1)}%;--c:${COLS[i % COLS.length]};--r:${Math.round(Math.random() * 900 - 450)}deg;--dx:${Math.round((Math.random() - .5) * 160)}px;width:${s.toFixed(1)}px;height:${(s * (Math.random() < .5 ? .42 : 1)).toFixed(1)}px;border-radius:${Math.random() < .3 ? '50%' : '2px'};animation-duration:${(2 + Math.random() * 1.8).toFixed(2)}s;animation-delay:${(Math.random() * .7).toFixed(2)}s"></i>`; }
  w.innerHTML = h; document.body.appendChild(w); setTimeout(() => w.remove(), 4800);
  try { navigator.vibrate && navigator.vibrate([18, 40, 18]); } catch (e) { } };
const float = (x, y, txt, big) => { if (mode() === 'off' || !txt) return; const el = document.createElement('div'); el.className = 'vv-float' + (big ? ' big' : ''); el.setAttribute('aria-hidden', 'true');
  el.textContent = txt; el.style.left = Math.max(40, Math.min(innerWidth - 40, x)) + 'px'; el.style.top = Math.max(60, y) + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1600); };
V.confetti = confetti; V.float = float;
// depois de um toque: o dia ganhou pontos de foco? concluíste tudo? subiste de nível no Dominus?
const fpts = () => { try { return OS.Foco ? OS.Foco.parts() : null; } catch (e) { return null; } };
const dlv = () => { try { return OS.Dom && OS.Dom.level ? OS.Dom.level() : 0; } catch (e) { return 0; } };
let G = null, GT = 0;
document.addEventListener('click', e => { if (mode() === 'off') return; const b = e.target.closest && e.target.closest('[data-act],[data-edit],input[type=checkbox],button'); if (!b) return;
  if (!G) G = { f: fpts(), lv: dlv() }; G.x = e.clientX; G.y = e.clientY; clearTimeout(GT); GT = setTimeout(gain, 650); }, true);
const gain = () => { const g = G; G = null; if (!g) return; const q = fpts();
  if (q && g.f && q.pts > g.f.pts) float(g.x, g.y - 10, `+${q.pts - g.f.pts} de foco`);
  if (q && g.f && q.all && !g.f.all) { confetti(); setTimeout(() => float(innerWidth / 2, innerHeight * .4, 'Dia todo feito!', 1), 250); }
  const lv = dlv(); if (g.lv && lv > g.lv) { confetti(110); setTimeout(() => float(innerWidth / 2, innerHeight * .45, `Nível ${lv} no Dominus!`, 1), 350); } };

/* ---------- vigiar o ecrã ---------- */
const start = () => { const v = view(); if (!v) return setTimeout(start, 300);
  new MutationObserver(() => { const r = location.hash.split('?')[0]; if (r !== lastR) { lastR = r; enter(); } else popAfter(v); }).observe(v, { childList: true });
  const m = document.getElementById('modal'); if (m) new MutationObserver(() => { if (!m.hidden && mode() !== 'off') { const d = m.querySelector('.modal'); if (d && !d._vv) { d._vv = 1; d.classList.add('vv-modal'); } } if (!m.hidden) popAfter(m); }).observe(m, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  // o menu lateral entra em cascata
  new MutationObserver(() => { const s = document.getElementById('side'); if (!s || !full() || rm()) return; if (document.body.classList.contains('nav-open') && !s._open) { s._open = 1; s.classList.remove('vv-navin'); void s.offsetWidth; s.classList.add('vv-navin'); setTimeout(() => s.classList.remove('vv-navin'), 900); } else if (!document.body.classList.contains('nav-open')) s._open = 0; }).observe(document.body, { attributes: true, attributeFilter: ['class'] }); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
OS.on && OS.on('unlock', () => { lastR = null; });

/* ---------- Definições › Aplicação ---------- */
A.vivoSet = b => { V.set(b.dataset.v); UI.toast(b.dataset.v === 'off' ? 'Animações desligadas' : 'Animações ' + (b.dataset.v === 'full' ? 'completas' : 'suaves'), 'pos'); };
OS.on && OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._vv) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' ? `<div class="pn" id="animSet"><div class="pn-h"><h3>${UI.ic('sun')}Animações</h3><span class="mut" style="font-size:12px">${{ full: 'completas', soft: 'suaves', off: 'desligadas' }[mode()]}</span></div>
  <p class="mut" style="margin:0 0 10px">Páginas que entram em cascata, títulos que se desenham, números que contam até ao valor, barras que enchem, gráficos que crescem, cartões que aparecem ao rolar e uma pequena explosão quando concluis uma tarefa ou marcas um hábito. Leves: não gastam bateria.${reduce() && !chosen() ? ' O teu aparelho pede menos movimento, por isso as coisas só aparecem devagar; escolhe "Completas" para ver tudo.' : ''}</p>
  <div class="seg" role="group">${[['full', 'Completas'], ['soft', 'Suaves'], ['off', 'Desligadas']].map(([v, l]) => `<button class="${mode() === v ? 'on' : ''}" data-act="vivoSet" data-v="${v}">${l}</button>`).join('')}</div></div>` : ''); OS.views.definicoes._vv = 1; });
})();
