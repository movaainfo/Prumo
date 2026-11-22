/* PRUMO — círculos da semana no Corpo (v3.74). Um círculo por modalidade (musculação, corrida, natação, bicicleta e cada desporto
   que praticas): por fora o tempo feito esta semana, por dentro o planeado; em baixo o total. O planeado sai do que já está no app:
   a divisão do treino por dias (Treino), o plano de corrida (Corrida), a frequência de cada desporto (Praticar desporto) e a tua
   meta de dias por semana. O feito conta os treinos, as corridas, as práticas e o que vem do Strava e do Oura. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, esc = U.esc;
const ICS = { swim: 'M2 18c2 0 2-1.4 4-1.4S8 18 10 18s2-1.4 4-1.4 2 1.4 4 1.4 2-1.4 4-1.4M2 21.5c2 0 2-1.4 4-1.4s2 1.4 4 1.4 2-1.4 4-1.4 2 1.4 4 1.4 2-1.4 4-1.4M8 14l3.5-3.5-2-2L13 5l4 4M17 9.5a1.8 1.8 0 1 0 0-.01',
  bike: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5l4-6h5l4 6M9.5 8.5l3 6h-7M14 5h2.5l2 3.5', ball: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7l3.8 2.8-1.5 4.5H9.7L8.2 9.8z',
  racket: 'M14.5 3.5a6 6 0 0 1 0 8.5 6 6 0 0 1-8.5 0 6 6 0 0 1 8.5-8.5zM6 12l-3 6 1 1 6-3', walk: 'M13 4.5a1.5 1.5 0 1 0 0-.01M9.5 21l2-6 2.5 2.5V21M10 11l1.5-3.5 3 2.5 2.5 1M11.5 7.5 9 10.5 7 10', yoga: 'M12 4.5a1.5 1.5 0 1 0 0-.01M5 19h14M12 8v6l-4 3M12 14l4 3M7 10.5l5-1 5 1' };
const ic = k => ICS[k] ? `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICS[k]}"/></svg>` : UI.ic(k);
const n = v => +v || 0, med = (L, d) => { const a = L.filter(x => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : d; };
// cada treino importado ou registado vai para a sua modalidade
const MOD = { musc: { n: 'Musculação', ic: 'dumbbell', c: '#F2994A' }, corrida: { n: 'Corrida', ic: 'run', c: '#F5C04A' }, natacao: { n: 'Natação', ic: 'swim', c: '#5CCFF2' }, ciclismo: { n: 'Bicicleta', ic: 'bike', c: '#F08BD0' },
  caminhada: { n: 'Caminhada', ic: 'walk', c: '#8FD694' }, ioga: { n: 'Ioga e pilates', ic: 'yoga', c: '#B79CFF' } };
const deTreino = w => { const t = (w.title || '') + ' ' + (w.notes || ''); return /bicicleta|btt|gravel|ciclismo|\bride\b|spinning/i.test(t) ? 'ciclismo' : /nata[cç][aã]o|swim|piscina/i.test(t) ? 'natacao' : /caminhada|walk|hike/i.test(t) ? 'caminhada' : /\bioga\b|yoga|pilates/i.test(t) ? 'ioga' : 'musc'; };
const fmt = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `<b>${h}</b><i>h</i>${r ? ` <b>${r}</b><i>min</i>` : ''}` : `<b>${r}</b><i>min</i>`; };
const txt = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ' ' + r + ' min' : ''}` : `${r} min`; };
const semana = () => { const t = U.today(), seg = U.monday(t); return { seg, dom: U.addDays(seg, 6), dias: U.range(seg, U.addDays(seg, 6)) }; };
const dados = () => { const W = semana(), na = d => d >= W.seg && d <= W.dom, R = {}, mod = (k, base) => R[k] = R[k] || Object.assign({ k, feito: 0, plano: 0 }, base);
  const treinos = OS.all('workouts'), corridas = OS.all('runs'), SP = (OS.Sport && OS.Sport.SPORTS) || {};
  // feito
  treinos.filter(w => na(w.date)).forEach(w => { const k = deTreino(w); mod(k, MOD[k]).feito += n(w.dur); });
  corridas.filter(r => na(r.date)).forEach(r => { mod('corrida', MOD.corrida).feito += (U.parseDur(r.time) || 0) / 60; });
  OS.all('sportlog').filter(l => na(l.date)).forEach(l => { const s = OS.get('sports', l.sport); if (!s) return; const key = s.key === 'natacao' ? 'natacao' : s.key === 'ciclismo' ? 'ciclismo' : s.key === 'corrida' ? 'corrida' : 'sp:' + s.id;
    const c = SP[s.key] || {}; mod(key, MOD[key] || { n: s.name || c.n || 'Desporto', ic: ICS[c.ic] || UI.IP[c.ic] ? c.ic : 'target', c: c.c || '#94a3b8' }).feito += n(l.mins); });
  // planeado
  const fit = OS.one('fit') || {}, split = fit.split || {}, durM = med(treinos.filter(w => deTreino(w) === 'musc' && !w.src).slice(-12).map(w => n(w.dur)), 60);
  const diasM = W.dias.filter(d => { const s = split[String(U.parse(d).getDay())]; return s && !['Descanso', 'Corrida', 'Mobilidade'].includes(s); }).length;
  if (diasM) mod('musc', MOD.musc).plano += diasM * durM;
  const rp = OS.all('runplan').filter(r => r.active), durR = med(corridas.slice(-12).map(r => (U.parseDur(r.time) || 0) / 60), 40);
  if (rp.length) mod('corrida', MOD.corrida).plano += rp.reduce((s, r) => s + (n(r.mins) || (n(r.km) ? n(r.km) * 6 : durR)), 0);
  OS.all('sports').forEach(s => { const c = SP[s.key] || {}, key = s.key === 'natacao' ? 'natacao' : s.key === 'ciclismo' ? 'ciclismo' : s.key === 'corrida' ? 'corrida' : 'sp:' + s.id;
    if (key === 'corrida' && rp.length) return; const L = OS.all('sportlog').filter(l => l.sport === s.id).slice(-10).map(l => n(l.mins)), d0 = key === 'corrida' ? durR : med(L, 60);
    mod(key, MOD[key] || { n: s.name || c.n || 'Desporto', ic: ICS[c.ic] || UI.IP[c.ic] ? c.ic : 'target', c: c.c || '#94a3b8' }).plano += Math.max(1, Math.min(7, n(s.freq) || 2)) * d0; });
  // sem divisão do treino: a meta de dias por semana (menos os dias dos outros planos) vira musculação
  if (!diasM && treinos.some(w => deTreino(w) === 'musc')) { const tgt = n((OS.one('profile') || {}).trainTarget) || 0, outros = rp.length + OS.all('sports').filter(s => s.key !== 'corrida').reduce((a, s) => a + (n(s.freq) || 2), 0), d = Math.max(0, tgt - outros); if (d) mod('musc', MOD.musc).plano += d * durM; }
  const L = Object.values(R).filter(x => x.feito > 0 || x.plano > 0).sort((a, b) => (b.plano || b.feito) - (a.plano || a.feito));
  return { W, L, feito: L.reduce((s, x) => s + x.feito, 0), plano: L.reduce((s, x) => s + x.plano, 0) }; };
const anel = x => { const r = 30, c = 2 * Math.PI * r, p = x.plano ? Math.min(1, x.feito / x.plano) : x.feito ? 1 : 0;
  return `<svg viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="${r}" class="an0" style="stroke:${x.c}"/><circle cx="38" cy="38" r="${r}" class="an1" style="stroke:${x.c};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - p)).toFixed(1)}"/></svg>`; };
const painel = () => { const D = dados(); if (!D.L.length) return '';
  const f = d => U.parse(d).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'short' }), nsem = (() => { const d = U.parse(D.W.seg), j = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - j) / 864e5 - 3 + ((j.getDay() + 6) % 7)) / 7); })();
  return `<section class="pn ane" aria-label="A tua semana de treino"><div class="ane-h"><div><small>Semana ${nsem}</small><h3>A tua semana</h3></div><span>${esc(f(D.W.seg))} a ${esc(f(D.W.dom))}</span></div>
    <div class="ane-l">${D.L.map(x => { const pct = x.plano ? Math.round(x.feito / x.plano * 100) : 0;
      return `<div class="ane-i" style="--c:${x.c}" role="img" aria-label="${esc(x.n)}: ${txt(x.feito)} feitos${x.plano ? ' de ' + txt(x.plano) + ' planeados (' + pct + '%)' : ''}"><div class="ane-r">${anel(x)}<span>${ic(x.ic)}</span></div><p class="ane-f">${fmt(x.feito)}</p>${x.plano ? `<p class="ane-p">/ ${txt(x.plano)}</p>` : '<p class="ane-p">sem plano</p>'}<small>${esc(x.n)}</small></div>`; }).join('')}</div>
    <p class="ane-t">${UI.ic('clock')}Total da semana: <b>${txt(D.feito)}</b>${D.plano ? ` <span>/ ${txt(D.plano)} planeados</span>` : ''}</p></section>`; };
// no Corpo › Visão, logo a seguir aos separadores
OS.on('ready', () => { const base = V.corpo; if (!base || base._ane) return;
  V.corpo = sub => { const h = base(sub); if (sub && sub !== 'visao') return h; const p = painel(); if (!p) return h; const i = h.indexOf('</nav>', h.indexOf('</header>')); return i > 0 ? h.slice(0, i + 6) + p + h.slice(i + 6) : p + h; };
  Object.keys(base).forEach(k => { if (!(k in V.corpo)) V.corpo[k] = base[k]; }); V.corpo._ane = 1; });
OS.Aneis = { dados, painel };
})();
