/* PRUMO — Ranking e dias de foco.
   Cada dia vale até 100 pontos de disciplina: entrar no app (20) + cumprir as tarefas e os hábitos do dia (65, pela parte feita) + tudo concluído (15).
   Um dia sem nada marcado vale 40. Um dia de foco é um dia com 60 pontos ou mais; os dias de foco seguidos aparecem no topo ("Dia 5 de foco").
   O ranking junta os perfis de todas as contas e só mostra a lista (nome, posição, %, pontos e dias de foco): não se abre o perfil de ninguém nem há mensagens. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, Hab = OS.Hab;
OS.ONE_DEF.foco = { dias: {}, anon: false, cel: '' };
const FOCO = 60, cfg = () => OS.one('foco'), today = () => U.today();

/* ---------- a pontuação do dia ---------- */
const parts = (d = today()) => {
  const T = OS.all('tasks'), doneT = T.filter(t => t.status === 'Feita' && t.doneAt === d).length;
  const openT = T.filter(t => t.status !== 'Feita' && ((t.due && t.due <= d) || (t.sched && t.sched <= d))).length;
  const H = OS.all('habits').filter(h => h.active && Hab.due(h, d) && h.freq !== 'X por semana'), doneH = H.filter(h => Hab.done(h, d)).length;
  const tN = doneT + openT, hN = H.length, plan = tN + hN, fr = [tN ? doneT / tN : null, hN ? doneH / hN : null].filter(x => x != null);
  const comp = fr.length ? fr.reduce((a, x) => a + x, 0) / fr.length : 0, all = plan > 0 && doneT + doneH >= plan;
  return { pts: plan ? 20 + Math.round(65 * comp) + (all ? 15 : 0) : 40, tasks: [doneT, tN], habits: [doneH, hN], all, plan };
};
const ptsOf = d => { const x = (cfg().dias || {})[d]; return x ? x.p : null; };
const isFocus = d => (ptsOf(d) || 0) >= FOCO;
const streak = () => { let d = today(), n = 0; if (!isFocus(d)) d = U.addDays(d, -1); while (isFocus(d) && n < 5000) { n++; d = U.addDays(d, -1); } return n; };
const best = () => { let b = 0, run = 0, prev = ''; Object.keys(cfg().dias || {}).sort().forEach(x => { if (isFocus(x)) { run = prev && U.addDays(prev, 1) === x ? run + 1 : 1; prev = x; b = Math.max(b, run); } }); return b; };
const state = () => { const P = parts(), on = P.pts >= FOCO, s = streak(); return { P, on, s, best: Math.max(best(), s) }; };

/* ---------- guardar o dia (sincroniza com os outros aparelhos) e mandar para o ranking ---------- */
let SAVING = false;
const save = () => { if (SAVING) return; const d = today(), P = parts(d), c = cfg(); c.dias = c.dias || {}; const was = c.dias[d];
  if (was && was.p === P.pts) return; SAVING = true;
  try { c.dias[d] = { p: P.pts }; const ks = Object.keys(c.dias).sort(); ks.slice(0, Math.max(0, ks.length - 400)).forEach(k => delete c.dias[k]); OS.touch('foco'); }
  finally { SAVING = false; }
  push(); if (P.pts >= FOCO && c.cel !== d && (!was || was.p < FOCO)) celebrate(); };
const canRank = () => !!(OS.Acc && OS.Acc.on && OS.Acc.call && OS.Acc.pid && OS.Acc.pid() && OS.Acc.token && OS.Acc.token());
let PT = 0, SENT = '', ME = null;
const send = async () => { if (!canRank()) return; const c = cfg(), dias = {}; for (let i = 0; i < 8; i++) { const d = U.addDays(today(), -i), p = ptsOf(d); if (p != null) dias[d] = p; }
  const body = { id: OS.Acc.pid(), dias, anon: !!c.anon }, sig = JSON.stringify(body); if (sig === SENT) return;
  try { const j = await OS.Acc.call('rank', body); SENT = sig; if (j && j.eu) ME = j.eu; } catch (e) { } };
const push = soon => { if (!canRank()) return; clearTimeout(PT); PT = setTimeout(send, soon ? 1200 : 12000); };

/* ---------- celebrar o dia de foco (não tapa nada; some sozinho) ---------- */
const celebrate = () => { const c = cfg(), d = today(); c.cel = d; OS.touch('foco'); const s = streak();
  const el = document.createElement('div'); el.className = 'fc-cel'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="fc-cel-f">${UI.ic('flame')}</span><span><b>Dia ${s} de foco!</b><small>${s > 1 ? `${s} dias seguidos. Amanhã é o dia ${s + 1}.` : 'Começou a tua sequência. Volta amanhã para o dia 2.'}</small></span>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
  try { const r = el.getBoundingClientRect(); OS.Vivo && OS.Vivo.burst && OS.Vivo.burst(r.left + 34, r.top + r.height / 2); } catch (e) { }
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 600); }, 4800); };

/* ---------- o ranking (lido do servidor) ---------- */
let RL = null, RAT = 0, RB = false, RERR = '';
const load = async force => { if (RB || !canRank() || (!force && RL && Date.now() - RAT < 60e3)) return; RB = true;
  try { await send(); const j = await OS.Acc.call('ranking', { id: OS.Acc.pid() }); RL = j.lista || []; RAT = Date.now(); RERR = ''; }
  catch (e) { RERR = e.message || 'Não consegui abrir o ranking agora.'; }
  RB = false; OS.request(); };
const PER = [['7', 'Semana'], ['30', 'Mês'], ['a', 'Sempre']];
const per = () => PER.some(p => p[0] === OS.ui.rkP) ? OS.ui.rkP : '30';
const ptsK = { 7: 'p7', 30: 'p30', a: 'pa' }, pctK = { 7: 'q7', 30: 'q30', a: 'qa' };
const sorted = () => { const k = ptsK[per()], q = pctK[per()], L = (RL || []).slice().sort((a, b) => b[k] - a[k] || b[q] - a[q] || b.s - a.s);
  let pos = 0, prev = null; return L.map((r, i) => { if (!prev || r[k] !== prev[k] || r[q] !== prev[q]) pos = i + 1; prev = r; return Object.assign({ pos, pts: r[k], pct: r[q] }, r); }); };
const initials = r => r.av || (r.n ? r.n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?');
const nameOf = r => r.anon && !r.me ? 'Pessoa anónima' : r.n || 'Sem nome';
const ord = n => n + '.º';

/* ---------- ecrãs ---------- */
const flame = (on, n) => `<span class="fc-fl ${on ? 'on' : ''}">${UI.ic('flame')}<b>${n}</b></span>`;
const headline = S => S.on ? `Dia ${S.s} de foco` : S.s ? `Dia ${S.s} de foco · hoje ainda não conta` : 'Começa hoje o teu dia 1 de foco';
const subline = S => S.on ? `Hoje já conta. Volta amanhã para o dia ${S.s + 1}.` : `Faltam ${FOCO - S.P.pts} pontos para hoje contar${S.s ? ' e a sequência continuar' : ''}.`;
const strip = () => { const out = []; for (let i = 13; i >= 0; i--) { const d = U.addDays(today(), -i), p = d === today() ? parts(d).pts : ptsOf(d);
  out.push(`<i class="fc-d ${p == null ? 'fc-no' : p >= FOCO ? 'fc-on' : 'fc-off'}${d === today() ? ' fc-now' : ''}" title="${U.fmtD(d)}: ${p == null ? 'não entraste' : p + ' pontos'}"></i>`); } return `<div class="fc-strip-d" aria-label="Os últimos 14 dias">${out.join('')}</div>`; };
const meCard = S => { const P = S.P, row = (ok, t, v) => `<li class="${ok ? 'ok' : ''}">${UI.ic(ok ? 'check' : 'clock')}<span>${t}</span><b>${v}</b></li>`;
  return `<div class="pn rk-me"><div class="rk-me-h">${flame(S.on, S.s)}<div class="grow"><h3>${esc(headline(S))}</h3><p class="mut">${esc(subline(S))} Recorde: ${S.best} ${S.best === 1 ? 'dia' : 'dias'}.</p></div>
      <div class="rk-ring" style="--p:${P.pts / 100}"><b>${P.pts}</b><small>pontos hoje</small></div></div>
    <ul class="rk-parts">${row(true, 'Entraste hoje', '+20')}${P.plan ? row(P.tasks[1] ? P.tasks[0] >= P.tasks[1] : true, 'Tarefas do dia', P.tasks[1] ? `${P.tasks[0]} de ${P.tasks[1]}` : 'nenhuma')
      + row(P.habits[1] ? P.habits[0] >= P.habits[1] : true, 'Hábitos do dia', P.habits[1] ? `${P.habits[0]} de ${P.habits[1]}` : 'nenhum') + row(P.all, 'Tudo concluído', P.all ? '+15' : 'ainda não')
      : row(false, 'Nada marcado para hoje', '+20')}</ul>
    ${strip()}<p class="mut rk-note">Um dia de foco é um dia com ${FOCO} pontos ou mais. ${P.plan ? '' : 'Marca tarefas ou hábitos para hoje para poderes chegar aos 100.'}</p></div>`; };
const list = () => { if (!canRank()) return `<div class="pn"><div class="pn-h"><h3>${UI.ic('award')}Ranking</h3></div><p class="mut">O ranking junta as contas do Prumo. Este Prumo está sem conta (modo local), por isso só tu vês os teus pontos e os teus dias de foco.</p></div>`;
  load(); const L = sorted(), me = L.find(r => r.me), P = per();
  const body = !RL ? `<div class="sai-busy"><div class="fd-spin"></div><span>A abrir o ranking…</span></div>` : !L.length ? UI.empty('Ainda não há ninguém no ranking.')
    : `<div class="rk-list">${L.map(r => `<div class="rk-row${r.me ? ' me' : ''}${r.pos <= 3 ? ' top top' + r.pos : ''}"><span class="rk-pos">${r.pos <= 3 ? `<i>${r.pos}</i>` : ord(r.pos)}</span>
        <span class="rk-av" style="--c:${/^#[0-9A-Fa-f]{6}$/.test(r.c) ? r.c : '#5CC8E6'}" aria-hidden="true">${esc(r.anon && !r.me ? '?' : initials(r))}</span>
        <span class="rk-n"><b>${esc(nameOf(r))}${r.me ? ' <em>tu</em>' : ''}</b><small>${flame(r.s > 0, r.s)} ${r.s === 1 ? 'dia' : 'dias'} de foco<span class="rk-pct-m"> · ${r.pct}%</span></small></span>
        <span class="rk-pct" title="Média de disciplina por dia"><span class="rk-tr"><i style="width:${Math.max(0, Math.min(100, r.pct))}%"></i></span><small>${r.pct}%</small></span><b class="rk-pts">${r.pts.toLocaleString(OS.loc ? OS.loc() : 'pt-PT')}<small>pts</small></b></div>`).join('')}</div>`;
  return `<div class="pn rk-board"><div class="pn-h"><h3>${UI.ic('award')}Ranking geral</h3>${UI.seg('rkP', PER, P)}</div>
    ${me ? `<p class="rk-pos-me">Estás em <b>${ord(me.pos)} lugar</b> de ${L.length} ${L.length === 1 ? 'pessoa' : 'pessoas'}${P === 'a' ? '' : P === '7' ? ' nos últimos 7 dias' : ' nos últimos 30 dias'}.</p>` : ''}
    ${RERR ? `<p class="neg">${esc(RERR)} <button class="btn xs ghost" data-act="rkReload">Tentar outra vez</button></p>` : ''}${body}
    <p class="mut rk-note">Só se vê esta lista: não dá para abrir o perfil de ninguém nem mandar mensagens.${cfg().anon ? ' Estás a aparecer como "Pessoa anónima" (muda em Definições › Tu › Ranking).' : ''}</p></div>`; };
const how = () => UI.toggle('Como se ganham pontos', `<ul class="rk-how"><li><b>Entrar no Prumo</b> no dia: 20 pontos.</li><li><b>Fazer as tarefas e os hábitos do dia</b>: até 65 pontos, pela parte que fizeste (as tarefas para hoje ou atrasadas e as que concluíste hoje; os hábitos marcados para hoje).</li><li><b>Concluir tudo</b> o que tinhas para o dia: mais 15 pontos.</li><li>Um dia sem nada marcado vale 40 pontos.</li><li>Um <b>dia de foco</b> é um dia com ${FOCO} pontos ou mais. Os dias de foco seguidos fazem a tua sequência ("Dia 5 de foco").</li><li>No ranking, os <b>pontos</b> são a soma dos dias (semana, mês ou sempre) e a <b>percentagem</b> é a média de disciplina por dia nesse tempo.</li></ul>`, 'rkHow', 'info');
V.ranking = () => { const S = state(); return UI.head('Ranking', 'A disciplina de todas as pessoas do Prumo: entrar todos os dias, fazer as tarefas e os hábitos do dia e concluir tudo.', '', 'Visão Geral') + meCard(S) + list() + how(); };
A.rkReload = () => load(true);

/* ---------- o fogo no topo, no Hoje e no Painel ---------- */
OS.Foco = { parts, state, streak, best, FOCO, send, load: () => load(true), rows: () => RL,
  chip: () => { const S = state(); return `<a class="fc-chip ${S.on ? 'on' : ''}" href="#ranking" title="${esc(headline(S))}" aria-label="${esc(headline(S))}">${UI.ic('flame')}<b>${S.s}</b></a>`; } };
const bar = () => { const S = state(), me = (sorted().find(r => r.me) || null);
  return `<a class="pn fc-bar ${S.on ? 'on' : ''}" href="#ranking">${flame(S.on, S.s)}<span class="grow"><b>${esc(headline(S))}</b><small>${S.P.pts} pontos hoje${S.on ? ' · já conta' : ` · faltam ${FOCO - S.P.pts}`}${me ? ` · ${ord(me.pos)} no ranking` : ''}</small></span>${UI.ic('right')}</a>`; };
const after = (h, card) => { const i = h.indexOf('</header>'); return i > 0 ? h.slice(0, i + 9) + card + h.slice(i + 9) : card + h; };
OS.on('ready', () => {
  ['hoje', 'visao'].forEach(k => { const o = V[k]; if (!o || o._fc) return; V[k] = s => after(o(s), bar()); V[k]._fc = 1; });
  const o = V.definicoes; if (o && !o._fc) { V.definicoes = sub => { const h = o(sub); if (String(sub || '') !== '') return h; return h + `<div class="pn" id="rkSet"><div class="pn-h"><h3>${UI.ic('award')}Ranking</h3></div>
    <label class="row gap8" style="align-items:flex-start"><input type="checkbox" data-rk="nome" ${cfg().anon ? '' : 'checked'}><span>Mostrar o meu nome no ranking<small class="mut" style="display:block">Sem isto apareces como "Pessoa anónima", com os teus pontos e os teus dias de foco.</small></span></label></div>`; }; V.definicoes._fc = 1; }
  setTimeout(() => { save(); push(true); }, 1500); });
document.addEventListener('change', e => { const el = e.target; if (el && el.dataset && el.dataset.rk === 'nome') { cfg().anon = !el.checked; OS.touch('foco'); SENT = ''; push(true); RAT = 0; UI.toast(el.checked ? 'O teu nome aparece no ranking' : 'Apareces no ranking como "Pessoa anónima"', 'pos'); } });
// a pontuação de hoje acompanha o que fazes (tarefas, hábitos); um dia novo começa sozinho
let RT = 0; OS.on('render', () => { clearTimeout(RT); RT = setTimeout(save, 800); });
OS.on('unlock', () => setTimeout(() => { save(); push(true); }, 1200));
setInterval(() => { if (!document.hidden) save(); }, 60e3);
})();
