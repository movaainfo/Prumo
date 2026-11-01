/* PRUMO — Testosterona: simulação do nível (v2.53), ao lado da bioimpedância (Treino › Peso e corpo).
   Não é uma medição: estima o valor provável a partir do que mais pesa nos estudos (idade, gordura corporal ou cintura,
   sono, treino de força, álcool, stress, vitamina D, défice calórico grande, volume muito alto de corrida) e mostra
   quanto cada fator está a tirar ou a dar. As análises ao sangue (de manhã, em jejum) entram aqui e ficam ao lado
   da simulação; o marco do Codex "Testosterona total > 600 ng/dL" prova-se só pela análise. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, n = v => U.num(v), today = () => U.today(), safe = (f, d) => { try { return f(); } catch (e) { return d; } };
OS.ONE_DEF.testo = { sims: [], labs: [], inp: { alc: '', stress: '', vitd: '', deficit: '', sleepH: '' } };
const S = () => { const s = OS.one('testo'); if (!Array.isArray(s.sims)) s.sims = []; if (!Array.isArray(s.labs)) s.labs = []; if (!s.inp || typeof s.inp !== 'object') s.inp = {}; return s; };
const NMOL = 28.84; // ng/dL por nmol/L
const T = OS.Testo = {};
const sex = () => OS.one('diet').sex === 'F' ? 'F' : 'M';
const age = () => { const a = n(OS.one('diet').age); if (a) return a; const b = (OS.one('me') || {}).birth; return b ? Math.floor(U.diff(today(), b) / 365.25) : 0; };
// mediana de referência para a idade (homens de peso saudável; mulheres numa escala própria)
const base = (ag, sx) => { ag = ag || 25; if (sx === 'F') return Math.round(35 * (ag <= 40 ? 1 : Math.pow(.995, ag - 40)));
  return Math.round(ag < 25 ? 600 : ag < 40 ? 600 - (ag - 25) * 4.7 : 530 * Math.pow(.99, ag - 40)); };
const REF = sx => sx === 'F' ? { lo: 15, hi: 70, max: 120, u: 'ng/dL' } : { lo: 264, hi: 916, max: 1200, u: 'ng/dL' };
const lastBio = () => U.sortBy(OS.all('body').filter(b => n(b.bf) || n(b.waist)), b => b.date).pop() || null;
const sleepAvg = () => safe(() => { const L = OS.Sono.list().filter(r => r.date >= U.addDays(today(), -14)); return L.length >= 4 ? U.sum(L, r => n(r.min)) / L.length / 60 : 0; }, 0);
const strengthWk = () => OS.all('workouts').filter(w => w.date >= U.addDays(today(), -27)).length / 4;
const runKmWk = () => U.sum(OS.all('runs').filter(r => r.date >= U.addDays(today(), -27)), r => n(r.km)) / 4;
// cada fator: o valor que usei, de onde veio, e quanto mexe (multiplicador)
T.factors = (inp = S().inp) => { const sx = sex(), b = lastBio(), h = n(OS.one('diet').h), bf = b ? n(b.bf) : 0, wh = b && n(b.waist) && h ? n(b.waist) / h : 0, F = [];
  const add = (k, l, val, src, m, tip) => F.push({ k, l, val, src, m, tip });
  if (bf) { const c = sx === 'F' ? [[22, 1.03], [30, 1], [35, .95], [40, .9], [99, .85]] : [[12, 1.05], [18, 1], [22, .94], [25, .88], [30, .8], [99, .72]], m = c.find(x => bf <= x[0])[1];
    add('gordura', 'Gordura corporal', U.nf(bf, 1) + '%', 'bioimpedância de ' + U.fmtD(b.date), m, m < 1 ? `Baixar para ${sx === 'F' ? '22–30%' : '12–18%'} de gordura é o que mais sobe a testosterona: a gordura converte-a em estrogénio.` : ''); }
  else if (wh) { const m = wh < .45 ? 1 : wh < .5 ? .96 : wh < .55 ? .88 : wh < .6 ? .8 : .72; add('cintura', 'Cintura / altura', U.nf(wh, 2), 'medida de ' + U.fmtD(b.date), m, m < 1 ? 'Cintura abaixo de metade da altura: é o melhor indicador simples de gordura abdominal.' : ''); }
  else add('gordura', 'Gordura corporal', 'sem dados', 'faz o exame de bioimpedância', 1, 'Sem gordura nem cintura, a simulação fica menos certa.');
  const sl = n(inp.sleepH) || sleepAvg(); if (sl) { const m = sl >= 7 ? 1 : sl >= 6 ? .94 : sl >= 5 ? .88 : .82; add('sono', 'Sono por noite', U.nf(sl, 1) + ' h', n(inp.sleepH) ? 'escrito por ti' : 'média das últimas 2 semanas', m, m < 1 ? 'Uma semana a dormir 5 h baixa a testosterona 10–15%. Dormir 7–9 h devolve-a.' : ''); }
  else add('sono', 'Sono por noite', 'sem dados', 'liga o sono do app Saúde ou escreve abaixo', 1, '');
  const st = strengthWk(), ms = st >= 3 ? 1.04 : st >= 1 ? 1 : .94; add('forca', 'Treinos por semana', U.nf(st, 1), 'últimas 4 semanas', ms, ms < 1.04 ? 'Musculação 3 a 4 vezes por semana, com cargas pesadas e exercícios grandes (agachamento, levantamento, supino).' : '');
  const km = runKmWk(); if (km > 60) add('corrida', 'Corrida por semana', U.nf(km, 0) + ' km', 'últimas 4 semanas', .94, 'Volume muito alto de resistência baixa a testosterona; alterna com força e descanso.');
  const al = inp.alc === '' || inp.alc == null ? null : n(inp.alc); if (al != null) { const m = al <= 3 ? 1 : al <= 10 ? .96 : al <= 20 ? .9 : .82; add('alcool', 'Álcool', U.nf(al, 0) + ' bebidas/semana', 'escrito por ti', m, m < 1 ? 'Menos de 4 bebidas por semana.' : ''); }
  const sr = n(inp.stress); if (sr) { const m = sr >= 5 ? .92 : sr >= 4 ? .96 : 1; add('stress', 'Stress', sr + ' de 5', 'escrito por ti', m, m < 1 ? 'Cortisol alto puxa a testosterona para baixo: sono, pausas, treino e menos ecrã à noite.' : ''); }
  const vd = n(inp.vitd); if (vd) { const m = vd < 20 ? .92 : vd < 30 ? .97 : 1; add('vitd', 'Vitamina D', U.nf(vd, 0) + ' ng/mL', 'escrito por ti', m, m < 1 ? 'Sol de manhã e, se o médico confirmar, suplemento até 30–60 ng/mL.' : ''); }
  if (inp.deficit === '1') add('defice', 'Défice calórico grande', '> 500 kcal/dia', 'escrito por ti', .92, 'Dietas muito agressivas baixam a testosterona: perde gordura devagar (0,5–1% do peso por semana).');
  return F; };
T.sim = (inp) => { const sx = sex(), ag = age(), b0 = base(ag, sx), F = T.factors(inp), m = F.reduce((x, f) => x * f.m, 1), est = Math.round(b0 * m), R = REF(sx);
  // o que ganharias se tudo o que está a puxar para baixo voltasse a 1
  const pot = Math.round(b0 * F.reduce((x, f) => x * Math.max(1, f.m), 1));
  return { est, lo: Math.round(est * .75), hi: Math.round(est * 1.3), base: b0, age: ag, sex: sx, F, pot, ref: R, nmol: U.r1(est / NMOL), cat: est < R.lo ? 'Provavelmente baixa' : est < b0 * .9 ? 'Abaixo da tua idade' : est > b0 * 1.05 ? 'Acima da média da tua idade' : 'Na média da tua idade' }; };
T.lastLab = () => U.sortBy(S().labs.filter(l => n(l.total)), l => l.date).pop() || null;

/* ---------- ações ---------- */
OS.forms.toSim = (f, v) => { const s = S(); s.inp = { alc: v('alc'), stress: v('stress'), vitd: v('vitd'), deficit: v('deficit') === '1' ? '1' : '', sleepH: v('sleepH') }; const r = T.sim(s.inp);
  s.sims.push({ date: today(), est: r.est, lo: r.lo, hi: r.hi }); s.sims = s.sims.filter((x, i, a) => a.findIndex(y => y.date === x.date) === i || i === a.length - 1).slice(-60); OS.touch('testo'); UI.toast(`Simulação: cerca de ${U.nf(r.est)} ng/dL (${U.nf(r.lo)}–${U.nf(r.hi)})`, 'pos'); };
OS.forms.toLab = (f, v) => { const s = S(); let t = n(v('total')), fr = n(v('free')); if (!t) { UI.toast('Escreve a testosterona total da análise', 'warn'); return false; }
  if (v('unit') === 'nmol') t = Math.round(t * NMOL); s.labs.push({ date: v('date') || today(), total: t, free: fr || '', lab: v('lab').slice(0, 60) }); OS.touch('testo'); f.reset(); UI.toast(`Análise guardada: ${U.nf(t)} ng/dL`, 'pos'); };
A.toLabDel = b => { const s = S(), i = +b.dataset.i; UI.ask('Apagar esta análise?', '', 'Apagar', () => { s.labs.splice(i, 1); OS.touch('testo'); }); };

/* ---------- painel ---------- */
const scale = (r, lab) => { const R = r.ref, p = v => U.clamp(v / R.max * 100, 0, 100);
  return `<div class="to-sc"><div class="to-bar"><i class="to-ref" style="left:${p(R.lo)}%;width:${p(R.hi) - p(R.lo)}%"></i><i class="to-rng" style="left:${p(r.lo)}%;width:${p(r.hi) - p(r.lo)}%"></i>
    <em class="to-med" style="left:${p(r.base)}%" title="Média da tua idade"></em><b class="to-est" style="left:${p(r.est)}%"></b>${lab ? `<b class="to-lab" style="left:${p(n(lab.total))}%" title="Última análise"></b>` : ''}</div>
    <div class="to-lg"><span><i class="to-k ref"></i>Referência ${U.nf(R.lo)}–${U.nf(R.hi)}</span><span><i class="to-k rng"></i>A tua faixa provável</span><span><i class="to-k med"></i>Média da tua idade (${U.nf(r.base)})</span>${lab ? '<span><i class="to-k lab"></i>Última análise</span>' : ''}</div></div>`; };
T.panel = () => { const s = S(), r = T.sim(), lab = T.lastLab(), I = s.inp || {}, up = Math.max(0, r.pot - r.est);
  const fr = r.F.map(f => { const d = Math.round(r.base * (f.m - 1)); return `<div class="to-f ${f.m < 1 ? 'neg' : f.m > 1 ? 'pos' : ''}"><div><b>${esc(f.l)}</b><small class="mut">${esc(f.val)} · ${esc(f.src)}</small>${f.tip ? `<small>${esc(f.tip)}</small>` : ''}</div><span class="mono">${d > 0 ? '+' : ''}${d ? U.nf(d) : '0'}</span></div>`; }).join('');
  const hist = s.sims.slice(-12), labs = U.sortBy(s.labs.map((l, i) => Object.assign({ i }, l)), l => l.date).reverse();
  return `<div class="pn to-pn"><div class="pn-h"><h3>${UI.ic('zap')}Testosterona · simulação</h3><span class="mut" style="font-size:12px">${r.sex === 'F' ? 'mulher' : 'homem'}${r.age ? ', ' + r.age + ' anos' : ''}</span></div>
    <div class="to-top"><div class="to-big"><b class="mono">${U.nf(r.est)}</b><span>ng/dL</span><small class="mut">${U.nf(r.nmol, 1)} nmol/L · faixa provável ${U.nf(r.lo)}–${U.nf(r.hi)}</small><span class="bdg ${r.est < r.ref.lo ? 'neg' : r.est < r.base * .9 ? 'warn' : 'pos'}">${esc(r.cat)}</span></div>
      <div>${scale(r, lab)}${up ? `<p class="to-up">Se corrigires o que está a puxar para baixo, a simulação vai para cerca de <b class="mono">${U.nf(r.pot)}</b> ng/dL (+${U.nf(up)}).</p>` : '<p class="to-up">Nada do que medi está a puxar para baixo. Mantém.</p>'}
      ${lab ? `<p class="mut">Última análise: <b class="mono">${U.nf(lab.total)}</b> ng/dL (${U.fmtD(lab.date)}). ${Math.abs(n(lab.total) - r.est) > r.est * .3 ? 'A simulação está longe da análise: confia na análise.' : 'A simulação está perto da tua análise.'}</p>` : ''}</div></div>
    <div class="to-fs"><div class="eyebrow">O que está a pesar (em ng/dL, face à média da tua idade)</div>${fr}</div>
    <details class="to-more"><summary>Ajustar a simulação</summary><form class="to-in" data-form="toSim"><div class="fgrid">
      <div class="fld"><label>Álcool (bebidas por semana)</label><input type="number" inputmode="numeric" name="alc" min="0" value="${esc(I.alc || '')}" placeholder="0"></div>
      <div class="fld"><label>Stress (1 a 5)</label><input type="number" inputmode="numeric" name="stress" min="1" max="5" value="${esc(I.stress || '')}" placeholder="3"></div>
      <div class="fld"><label>Vitamina D (ng/mL, se souberes)</label><input type="number" inputmode="decimal" name="vitd" step="any" value="${esc(I.vitd || '')}"></div>
      <div class="fld"><label>Horas de sono (se não estiver ligado)</label><input type="number" inputmode="decimal" name="sleepH" step="any" value="${esc(I.sleepH || '')}"></div>
      <div class="fld"><label>Défice calórico grande (mais de 500 kcal/dia)?</label><select name="deficit"><option value="">Não</option><option value="1" ${I.deficit === '1' ? 'selected' : ''}>Sim</option></select></div></div>
      <button class="btn pri">${UI.ic('zap')}<span>Simular e guardar</span></button></form></details>
    <details class="to-more"><summary>Análises ao sangue (${s.labs.length})</summary><form class="to-in" data-form="toLab"><div class="fgrid">
      <div class="fld"><label>Data</label><input type="date" name="date" value="${today()}" max="${today()}"></div><div class="fld"><label>Testosterona total</label><input type="number" inputmode="decimal" step="any" name="total" required></div>
      <div class="fld"><label>Unidade</label><select name="unit"><option value="ng">ng/dL</option><option value="nmol">nmol/L</option></select></div><div class="fld"><label>Livre (pg/mL, opcional)</label><input type="number" inputmode="decimal" step="any" name="free"></div>
      <div class="fld"><label>Laboratório</label><input name="lab" maxlength="60"></div></div><button class="btn">${UI.ic('plus')}<span>Guardar análise</span></button></form>
      ${labs.length ? `<div class="to-labs">${labs.map(l => `<div><span class="mono">${U.fmtD(l.date)}</span><b class="mono">${U.nf(l.total)} ng/dL</b><small class="mut">${l.free ? U.nf(l.free) + ' pg/mL livre · ' : ''}${esc(l.lab || '')}</small><button class="icon-btn" data-act="toLabDel" data-i="${l.i}" aria-label="Apagar">${UI.ic('x')}</button></div>`).join('')}</div>` : ''}</details>
    ${hist.length > 1 ? `<div class="to-h">${hist.map(x => `<span title="${U.fmtD(x.date)}: ${U.nf(x.est)}" style="height:${Math.round(U.clamp(x.est / r.ref.max, .05, 1) * 100)}%"></span>`).join('')}</div><small class="mut">As tuas últimas simulações</small>` : ''}
    <p class="note">É uma simulação a partir de estudos com muitas pessoas, não uma medição: a mesma vida pode dar valores bem diferentes de pessoa para pessoa. Só a análise ao sangue (de manhã, entre as 7 e as 10, em jejum, de preferência repetida) diz o teu valor. Cansaço que não passa, libido baixa ou humor em baixo: fala com um médico.</p></div>`; };
})();
