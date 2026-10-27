/* PRUMO — Metas com ritmo honesto (v2.53).
   - "No ritmo" só quando há avanço medido desde o início da meta e esse avanço acompanha o tempo que já passou.
     Sem avanço nenhum é "Por começar" (com quanto já devias ir); a mexer mas sem número a subir é "Em andamento".
   - O avanço vem do indicador da meta e, nas metas manuais sem valor escrito, dos projetos, tarefas e etapas ligados.
   - Saldo, patrimônio, carteira, média, contactos e certificações contam a partir do valor que tinham quando a meta começou.
   - Cada meta mostra o que fizeste por ela na semana e no mês: tarefas, blocos da rotina, estudo, treinos, corridas, horas de
     trabalho, poupança e hábitos da mesma área ou com as mesmas palavras.
   - Em cima, a tua visão (Estrela-guia) por horizonte, com as metas que a servem; e projetos que parecem de uma meta, para ligar. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, V = OS.views, L = OS.L, esc = U.esc, Goal = OS.Goal, safe = (f, d) => { try { return f(); } catch (e) { return d; } };
const today = () => U.today();
const SNAP = ['account', 'networth', 'invested', 'contacts', 'certs', 'avgGrade'];
const AREAS = { 'Finanças': ['Finanças', 'Investimentos'], 'Estudos': ['Universidade', 'Aprendizagem'], 'Academia': ['Treino', 'Saúde'], 'Corrida': ['Corrida', 'Treino'], 'Trabalho': ['Trabalho', 'Carreira'], 'Empresa': ['Mova', 'Projetos', 'Trabalho', 'Carreira'], 'Desenvolvimento pessoal': ['Pessoal', 'Fé', 'Saúde', 'Aprendizagem'], 'Outros': [] };
const STOP = new Set('para pelo pela pelos pelas com sem que uma umas uns por mais menos meu minha meus minhas teu tua teus tuas seu sua seus suas dos das nos nas aos como cada todo toda todos todas este esta isto esse essa isso aquele aquela ser ter fazer ficar entre sobre ate anos mes meses dia dias semana semanas vez vezes quero quer querer sempre muito muita pouco hoje amanha agora ainda fazer feito pode poder conseguir chegar'.split(' '));
const WM = new Map(); // as palavras de cada texto, calculadas uma vez
const words = s => { s = String(s || ''); let w = WM.get(s); if (w) return w; w = [...new Set(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(x => x.length >= 4 && !STOP.has(x)))]; if (WM.size > 6000) WM.clear(); WM.set(s, w); return w; };
const gWords = g => words([g.title, g.why, ...(g.steps || []).map(s => s.t || s.title || s.text || '')].join(' '));
const hit = (W, s) => { if (!W.length) return false; const w = words(s); const n = w.filter(x => W.includes(x)); return n.length >= 2 || n.some(x => x.length >= 5); };
const born = g => g.start || (g._c ? U.iso(new Date(g._c)) : '') || U.addDays(today(), -30);

/* ---------- o que fizeste por uma meta desde uma data ---------- */
Goal.act = (g, from) => { const t = today(), ar = AREAS[g.cat] || [], W = gWords(g), out = [], P = OS.all('projects').filter(x => x.goal === g.id), inP = new Set(P.map(x => x.id));
  let n = 0; const add = (v, l) => { if (v > 0) { out.push([v, l]); n += 1; } };
  const T = OS.all('tasks').filter(x => x.status === 'Feita' && x.doneAt && x.doneAt >= from && x.doneAt <= t && (x.goal === g.id || inP.has(x.project) || (x.area && ar.includes(x.area)) || hit(W, x.title)));
  add(T.length, T.length === 1 ? 'tarefa feita' : 'tarefas feitas');
  const R = OS.all('routine').filter(r => (r.area && ar.includes(r.area)) || hit(W, r.title)); let rb = 0, rm = 0;
  R.forEach(r => Object.keys(r.log || {}).forEach(d => { if (d >= from && d <= t) { rb++; const s = U.t2m(r.start), e = U.t2m(r.end); rm += e > s ? e - s : e + 1440 - s; } }));
  if (rb) add(rb, `${rb === 1 ? 'bloco' : 'blocos'} da rotina (${U.nf(rm / 60, 1)} h)`);
  if (g.cat === 'Estudos') { const m = U.sum(OS.all('sessions').filter(s => s.date >= from && s.date <= t), s => U.num(s.minutes)); if (m) add(U.r1(m / 60), 'h de estudo'); }
  if (g.cat === 'Academia') add(OS.all('workouts').filter(w => w.date >= from && w.date <= t).length, 'treinos');
  if (g.cat === 'Corrida' || g.cat === 'Academia') { const km = safe(() => OS.Run.kmIn(from, t), 0); if (km) add(U.r1(km), 'km corridos'); }
  if (g.cat === 'Trabalho') { const h = U.sum(OS.all('shifts').filter(s => s.date >= from && s.date <= t), s => safe(() => OS.Car.workedHours(s), 0)); if (h) add(U.r1(h), 'h de trabalho'); }
  if (g.cat === 'Empresa') add(OS.all('mvsales').filter(s => s.date >= from && s.date <= t && s.status !== 'Cancelado').length, 'vendas');
  if (g.cat === 'Finanças') { const tx = safe(() => OS.Fin.tx(from, t), []), net = U.sum(tx.filter(x => x.type === 'Receita'), x => x.amount) - U.sum(tx.filter(x => x.type === 'Despesa'), x => x.amount); if (net > 0) { out.push([U.eur(net, { dec: 0 }), 'poupados']); n++; } }
  const H = OS.all('habits').filter(h => h.active && ((h.area && ar.includes(h.area)) || hit(W, h.name))); let hd = 0; H.forEach(h => Object.keys(h.log || {}).forEach(d => { if (d >= from && d <= t) hd++; }));
  add(hd, hd === 1 ? 'dia de hábito cumprido' : 'dias de hábitos cumpridos');
  return { items: out, n, any: n > 0 }; };

// a mesma pergunta repete-se muito (Painel, alertas, página): guarda a resposta até os dados mudarem
let VER = 0; OS.on('change', () => { VER++; }); const AC = new Map();
const actC = (g, from) => { const k = g.id + '|' + from + '|' + VER + '|' + (g._u || ''), c = AC.get(k); if (c && Date.now() - c.at < 60e3) return c.v; const v = Goal.act(g, from); if (AC.size > 400) AC.clear(); AC.set(k, { v, at: Date.now() }); return v; };
/* ---------- progresso, ritmo e estado ---------- */
const linkedP = (g, P, T) => { const inP = new Set(P.map(x => x.id)), TT = T.filter(t => !inP.has(t.project)), v = TT.map(t => t.status === 'Feita' ? 1 : 0).concat(P.map(x => x.status === 'Concluído' ? 1 : safe(() => OS.Proj.info(x).prog, 0)));
  const st = g.steps || []; if (st.length) v.push(st.filter(s => s.done).length / st.length); return v.length ? U.avg(v) : null; };
Goal.info = g => {
  const T = OS.all('tasks').filter(t => t.goal === g.id), P = OS.all('projects').filter(x => x.goal === g.id && x.status !== 'Cancelado');
  let cur = Goal.value(g), tgt = g.metric === 'steps' || g.metric === 'linked' ? 100 : U.num(g.target), p, via = '';
  if (Goal.lower(g)) { const base = U.num(g.base) || (cur != null ? cur * 1.2 : 0); p = cur == null ? 0 : base === tgt ? (cur <= tgt ? 1 : 0) : U.clamp((base - cur) / (base - tgt), 0, 1); }
  else { const base = g.metric === 'manual' ? U.num(g.base) : 0; p = tgt - base ? U.clamp((U.num(cur) - base) / (tgt - base), 0, 1) : 0; }
  // meta manual sem valor escrito: o avanço vem dos projetos, tarefas e etapas ligados
  if (g.metric === 'manual' && (g.cur === '' || g.cur == null)) { const lp = linkedP(g, P, T); if (lp != null) { p = lp; via = 'ligados'; cur = null; } }
  if (g.status === 'Concluída') p = 1;
  // ritmo: o que avançou desde o início (saldo, patrimônio… contam a partir do valor que tinham nesse dia)
  const b0 = SNAP.includes(g.metric) && g.base0 !== undefined && g.base0 !== '' && g.base0 != null ? U.num(g.base0) : null;
  const pr = b0 != null && !Goal.lower(g) && tgt - b0 > 0 ? U.clamp((U.num(cur) - b0) / (tgt - b0), 0, 1) : p;
  let exp = null, dPass = 0, dTot = 0; const st0 = born(g); if (g.due && g.due > st0) { dTot = U.diff(g.due, st0); dPass = U.clamp(U.diff(today(), st0), 0, dTot); exp = U.clamp(dPass / dTot, 0, 1); }
  const act = g.status === 'Ativa' ? actC(g, st0) : { any: false, items: [], n: 0 }, moved = pr > 0 || (b0 == null && p > 0);
  const late = g.status === 'Ativa' && g.due && g.due < today() && p < 1;
  const idle = g.status === 'Ativa' && p < 1 && !late && !moved && !act.any;
  const behind = g.status === 'Ativa' && p < 1 && !late && !idle && exp != null && pr + .1 < exp;
  const onPace = g.status === 'Ativa' && p < 1 && !late && moved && exp != null && !behind;
  const pc = v => Math.round(v * 100) + '%';
  const st = g.status !== 'Ativa' ? [g.status, g.status === 'Concluída' ? 'pos' : ''] : p >= 1 ? ['Alvo atingido', 'pos'] : late ? ['Atrasada', 'neg'] : idle ? ['Por começar', exp != null && exp >= .1 ? 'warn' : ''] : behind ? ['Atrás do ritmo', 'warn'] : onPace ? ['No ritmo', 'pos'] : ['Em andamento', ''];
  const why = g.status !== 'Ativa' || p >= 1 ? '' : late ? `O prazo passou a ${U.fmtDS(g.due)} com ${pc(p)} feito.`
    : idle ? `Ainda sem nenhum avanço desde ${U.fmtDS(st0)}${exp != null && exp >= .05 ? `: por esta altura devias ir em ${pc(exp)} (passaram ${dPass} de ${dTot} dias)` : ''}.`
    : exp != null ? `${b0 != null ? 'Avançaste' : 'Vais em'} ${pc(pr)}${b0 != null ? ' desde o início' : ''}; por esta altura devias ir em ${pc(exp)} (passaram ${dPass} de ${dTot} dias).${!moved ? ' Estás a mexer-te, mas o número ainda não subiu.' : ''}`
    : `Sem prazo: o ritmo mede-se quando lhe deres uma data.${!moved ? ' Já há trabalho feito, mas o número ainda não subiu.' : ''}`;
  return { cur, tgt, p, pr, exp, late, behind, idle, onPace, moving: act.any, act, st, why, via, tasks: T, projects: P, b0 };
};
// ponto de partida das metas que medem um valor que já existia (saldo, patrimônio…)
const snap = g => { if (!g || !SNAP.includes(g.metric) || (g.base0 !== undefined && g.base0 !== null && g.base0 !== '')) return; const v = safe(() => Goal.value(g), null); if (v != null) OS.upd('goals', g.id, { base0: U.num(v) }, { silent: true }); };
OS.on('add:goals', snap); OS.on('upd:goals', g => { if (g && SNAP.includes(g.metric) && (g.base0 === undefined || g.base0 === null)) setTimeout(() => snap(OS.get('goals', g.id)), 0); });
OS.on('ready', () => setTimeout(() => OS.all('goals').filter(g => g.status === 'Ativa').forEach(snap), 1200));

/* ---------- projetos que parecem de uma meta ---------- */
const suggest = g => { const W = gWords(g); if (!W.length) return []; return OS.all('projects').filter(x => !x.goal && !['Concluído', 'Cancelado'].includes(x.status) && hit(W, [x.name, x.objective, x.expected].join(' '))).slice(0, 3); };
A.goalLink = b => { const p = OS.get('projects', b.dataset.p), g = OS.get('goals', b.dataset.g); if (!p || !g) return; OS.upd('projects', p.id, { goal: g.id }); UI.toast(`"${p.name}" ligado à meta "${g.title}"`, 'pos'); };

/* ---------- a página ---------- */
const H = [['h3m', '3 meses'], ['h1y', '1 ano'], ['h3y', '3 anos'], ['h5y', '5 anos'], ['hlong', 'Longo prazo']];
const vision = () => { const ns = OS.one('northstar') || {}, G = OS.all('goals').filter(g => g.status === 'Ativa'), rows = H.filter(([k]) => String(ns[k] || '').trim());
  if (!rows.length) return `<a class="pn mt-vis-cta" href="#next.estrela">${UI.ic('compass')}<span><b>Escreve o que queres construir</b><small>Na Estrela-guia, diz onde queres estar daqui a 1, 3 e 5 anos. As metas aparecem aqui ao lado da tua visão.</small></span>${UI.ic('right')}</a>`;
  return `<div class="pn mt-vis"><div class="pn-h"><h3>${UI.ic('compass')}O que estás a construir</h3><a class="more" href="#next.estrela">Estrela-guia ${UI.ic('right')}</a></div><div class="mt-vg">${rows.map(([k, h]) => { const gs = G.filter(g => g.horizon === h);
    return `<div class="mt-vh"><div class="eyebrow">${h}</div><p>${esc(String(ns[k]).trim().slice(0, 220))}${String(ns[k]).trim().length > 220 ? '…' : ''}</p>${gs.length ? `<div class="mt-vgs">${gs.map(g => { const i = Goal.info(g); return `<span class="bdg ${i.st[1] || 'out'}" data-edit="goals:${g.id}" style="cursor:pointer">${esc(g.title)} · ${i.st[0].toLowerCase()}</span>`; }).join('')}</div>` : `<div class="row gap8"><small class="warn">Ainda sem metas para este horizonte.</small>${UI.addBtn('goals', 'Criar meta', { horizon: h }, 'xs')}</div>`}</div>`; }).join('')}</div></div>`; };
const actLine = (g, from, l) => { const a = actC(g, from); return `<div class="mt-act"><span class="mt-al">${l}</span>${a.items.length ? a.items.map(([v, t]) => `<span><b>${typeof v === 'number' ? U.nf(v, v % 1 ? 1 : 0) : esc(v)}</b> ${esc(t)}</span>`).join('') : '<span class="mut">nada ligado a esta meta</span>'}</div>`; };
V.metas = () => {
  const f = OS.ui.gf || '', G = OS.all('goals').filter(g => f ? g.cat === f : g.status !== 'Abandonada');
  const by = U.groupBy(G, g => g.cat || 'Outros'), CATS = L.GCAT.concat(Object.keys(by).filter(c => !L.GCAT.includes(c)));
  const act = OS.all('goals').filter(g => g.status === 'Ativa').map(Goal.info), t = today(), w7 = U.addDays(t, -6), m30 = U.addDays(t, -29);
  return UI.head('Metas', 'Uma meta só está no ritmo quando já avançou e o avanço acompanha o tempo que passou. Por baixo de cada uma vês o que fizeste por ela esta semana e este mês.', UI.addBtn('goals', 'Nova meta'), 'Execução') +
  vision() +
  `<div class="kpis">${UI.kpi('Ativas', act.length)}${UI.kpi('No ritmo', act.filter(i => i.onPace).length, '', { tone: 'pos' })}${UI.kpi('Em andamento', act.filter(i => !i.onPace && !i.idle && !i.behind && !i.late && i.p < 1).length, 'a mexer, sem ritmo medido')}${UI.kpi('Por começar', act.filter(i => i.idle).length, '', { tone: act.some(i => i.idle) ? 'warn' : '' })}${UI.kpi('Atrás do ritmo', act.filter(i => i.behind).length, '', { tone: act.some(i => i.behind) ? 'warn' : '' })}${UI.kpi('Atrasadas', act.filter(i => i.late).length, '', { tone: act.some(i => i.late) ? 'neg' : '' })}</div>
  <div class="row gap8">${UI.chip('Todas', 'gfCat', !f, 'data-v=""')}${L.GCAT.concat([...new Set(OS.all('goals').map(g => g.cat).filter(c => c && !L.GCAT.includes(c)))]).map(c => UI.chip(c, 'gfCat', f === c, `data-v="${c}"`)).join('')}</div>
  ${Object.keys(by).length ? CATS.filter(c => by[c]).map(c => `<section><div class="sech"><h2>${c}</h2></div><div class="pn" style="padding-block:4px">${by[c].map(g => { const i = Goal.info(g), eta = safe(() => OS.Intel.goalETA(g), null), sg = g.status === 'Ativa' && !i.projects.length ? suggest(g) : [];
    return `<div class="gcard mt-card"><div><div class="click" data-edit="goals:${g.id}" style="cursor:pointer"><b>${esc(g.title)}</b><div class="gmeta">${UI.badge(i.st[0], i.st[1])}${UI.badge(g.horizon, 'out')}${g.due ? `<span>prazo ${U.fmtD(g.due)}</span>` : '<span>sem prazo</span>'}${(g.steps || []).length ? `<span>${g.steps.filter(s => s.done).length}/${g.steps.length} etapas</span>` : ''}${i.projects.length ? `<span>${i.projects.length === 1 ? 'projeto: ' + esc(i.projects[0].name) : i.projects.length + ' projetos'}</span>` : ''}${i.tasks.length ? `<span>${i.tasks.filter(t2 => t2.status !== 'Feita').length} tarefas abertas</span>` : ''}${eta && eta.months != null && i.p < 1 ? `<span class="est">estimativa</span><span>alvo em ~${eta.months} ${eta.months === 1 ? 'mês' : 'meses'} ao ritmo atual</span>` : ''}</div></div>
      ${i.why ? `<p class="mt-why">${esc(i.why)}</p>` : ''}
      ${g.status === 'Ativa' && i.p < 1 ? actLine(g, w7, 'Esta semana') + actLine(g, m30, 'Este mês') : ''}
      ${sg.length ? `<div class="mt-sug"><small class="mut">Parece desta meta:</small>${sg.map(p => `<button class="btn xs" data-act="goalLink" data-g="${g.id}" data-p="${p.id}">${UI.ic('link')}${esc(p.name)}</button>`).join('')}</div>` : ''}</div>
    <div class="gp"><span class="num">${i.via ? `${Math.round(i.p * 100)}% <span class="mut">pelos projetos e etapas</span>` : `${Goal.fmt(g, i.cur)} <span class="mut">/ ${Goal.fmt(g, i.tgt)}</span>`}</span>${UI.bar(i.p, i.p >= 1 ? 'pos' : i.late ? 'neg' : i.behind ? 'warn' : i.idle ? '' : 'pos', i.exp)}${i.exp != null && i.p < 1 && g.status === 'Ativa' ? `<small class="mut">hoje devias ir em ${Math.round(i.exp * 100)}%</small>` : ''}</div></div>`; }).join('')}</div></section>`).join('') : UI.empty('Sem metas. Cria a primeira e liga-a a um indicador real.', UI.addBtn('goals', 'Criar meta', null, ''))}`;
};
})();
