/* PRUMO — Ranking e dias de foco.
   Cada dia vale até 100 pontos de disciplina, e só conta o que se faz (entrar no app não dá pontos):
   tarefas e hábitos do dia (até 50, pela parte feita, e só por inteiro com 5 ou mais coisas marcadas) + tudo concluído (10, com 3 ou mais)
   + tempo de foco (estudo, Bloco de foco: 25 min 6, 1 h 12, 2 h 20) + treino, corrida ou desporto (10) + leitura ou devocional (10).
   Um dia de foco é um dia com 70 pontos ou mais; os dias de foco seguidos aparecem no topo ("Dia 5 de foco").
   Quem está a zero não aparece na lista. As regras novas valem desde 25/10/2026 (os dias antes disso não contam).
   O ranking junta os perfis de todas as contas e só mostra a lista (nome, posição, %, pontos e dias de foco): não se abre o perfil de ninguém nem há mensagens. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, Hab = OS.Hab;
OS.ONE_DEF.foco = { dias: {}, anon: false, cel: '' };
const FOCO = 70, cfg = () => OS.one('foco'), today = () => U.today();
// as regras ficaram mais difíceis: os dias guardados com as regras antigas saem (uma vez)
const migr = () => { const c = cfg(); if (c.v === 2) return; c.dias = {}; c.cel = ''; c.v = 2; OS.touch('foco'); };

/* ---------- a pontuação do dia ---------- */
const parts = (d = today()) => {
  const T = OS.all('tasks'), doneT = T.filter(t => t.status === 'Feita' && t.doneAt === d).length;
  const openT = T.filter(t => t.status !== 'Feita' && ((t.due && t.due <= d) || (t.sched && t.sched <= d))).length;
  const H = OS.all('habits').filter(h => h.active && Hab.due(h, d) && h.freq !== 'X por semana'), doneH = H.filter(h => Hab.done(h, d)).length;
  const tN = doneT + openT, hN = H.length, plan = tN + hN, fr = [tN ? doneT / tN : null, hN ? doneH / hN : null].filter(x => x != null);
  const comp = fr.length ? fr.reduce((a, x) => a + x, 0) / fr.length : 0, all = plan >= 3 && doneT + doneH >= plan;
  // tempo de foco: sessões de estudo, Bloco de foco e árvores (sem contar duas vezes a mesma)
  const S = OS.all('sessions').filter(x => x.date === d), inS = new Set(S.map(x => x.tree || x.fblock).filter(Boolean));
  const fm = Math.round(S.reduce((a, x) => a + (+x.minutes || 0), 0) + OS.all('trees').filter(t => t.date === d && t.alive && !inS.has(t.id)).reduce((a, t) => a + (+t.mins || 0), 0)
    + OS.all('focusblocks').filter(b => b.date === d && !inS.has(b.id)).reduce((a, b) => a + (+b.minutes || 0), 0));
  const mv = ['workouts', 'runs', 'sportlog'].some(k => OS.all(k).some(x => x.date === d));
  const rd = OS.all('books').some(b => (b.log || []).some(l => l.d === d)) || OS.all('devos').some(x => x.date === d);
  const pT = Math.round(50 * comp * Math.min(1, plan / 5)), pA = all ? 10 : 0, pF = fm >= 120 ? 20 : fm >= 60 ? 12 : fm >= 25 ? 6 : 0, pM = mv ? 10 : 0, pR = rd ? 10 : 0;
  return { pts: Math.min(100, pT + pA + pF + pM + pR), tasks: [doneT, tN], habits: [doneH, hN], all, plan, fm, mv, rd, pT, pA, pF, pM, pR };
};
const ptsOf = d => { const x = (cfg().dias || {})[d]; return x ? x.p : null; };
const isFocus = d => (ptsOf(d) || 0) >= FOCO;
const streak = () => { let d = today(), n = 0; if (!isFocus(d)) d = U.addDays(d, -1); while (isFocus(d) && n < 5000) { n++; d = U.addDays(d, -1); } return n; };
const best = () => { let b = 0, run = 0, prev = ''; Object.keys(cfg().dias || {}).sort().forEach(x => { if (isFocus(x)) { run = prev && U.addDays(prev, 1) === x ? run + 1 : 1; prev = x; b = Math.max(b, run); } }); return b; };
const state = () => { const P = parts(), on = P.pts >= FOCO, s = streak(); return { P, on, s, best: Math.max(best(), s) }; };

/* ---------- guardar o dia (sincroniza com os outros aparelhos) e mandar para o ranking ---------- */
let SAVING = false;
const save = () => { if (SAVING) return; migr(); const d = today(), P = parts(d), c = cfg(); c.dias = c.dias || {}; const was = c.dias[d];
  if (was && was.p === P.pts) return; SAVING = true;
  try { c.dias[d] = { p: P.pts }; const ks = Object.keys(c.dias).sort(); ks.slice(0, Math.max(0, ks.length - 400)).forEach(k => delete c.dias[k]); OS.touch('foco'); }
  finally { SAVING = false; }
  push(); if (P.pts >= FOCO && c.cel !== d && (!was || was.p < FOCO)) celebrate(); };
const canRank = () => !!(OS.Acc && OS.Acc.on && OS.Acc.call && OS.Acc.pid && OS.Acc.pid() && OS.Acc.token && OS.Acc.token());
let PT = 0, SENT = '', ME = null;
// a foto do perfil, pequena (56 px), para aparecer na lista
const TH = { src: '', out: '' };
const thumb = src => new Promise(res => { if (!src) return res(''); if (TH.src === src) return res(TH.out);
  const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 56; const x = c.getContext('2d'), k = Math.min(im.naturalWidth, im.naturalHeight);
    x.drawImage(im, (im.naturalWidth - k) / 2, (im.naturalHeight - k) / 2, k, k, 0, 0, 56, 56); TH.src = src; TH.out = c.toDataURL('image/jpeg', .72); res(TH.out.length < 9000 ? TH.out : ''); } catch (e) { res(''); } };
  im.onerror = () => res(''); im.src = src; });
const send = async () => { if (!canRank()) return; const c = cfg(), dias = {}; for (let i = 0; i < 8; i++) { const d = U.addDays(today(), -i), p = ptsOf(d); if (p != null) dias[d] = p; }
  const pf = OS.Acc.prof ? OS.Acc.prof() : null, im = pf && pf.img ? await thumb(pf.img) : '';
  const body = { id: OS.Acc.pid(), dias, anon: !!c.anon, im }, sig = JSON.stringify(body); if (sig === SENT) return;
  try { const j = await OS.Acc.call('rank', body); SENT = sig; if (j && j.eu) ME = j.eu; } catch (e) { } };
const push = soon => { if (!canRank()) return; clearTimeout(PT); PT = setTimeout(send, soon ? 1200 : 12000); };

/* ---------- celebrar o dia de foco (não tapa nada; some sozinho) ---------- */
const celebrate = () => { const c = cfg(), d = today(); c.cel = d; OS.touch('foco'); const s = streak();
  const el = document.createElement('div'); el.className = 'fc-cel'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="fc-cel-f">${UI.ic('flame')}</span><span><b>Dia ${s} de foco!</b><small>${s > 1 ? `${s} dias seguidos. Amanhã é o dia ${s + 1}.` : 'Começou a tua sequência. Volta amanhã para o dia 2.'}</small></span>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
  try { const r = el.getBoundingClientRect(); OS.Vivo && OS.Vivo.burst && OS.Vivo.burst(r.left + 34, r.top + r.height / 2); OS.Vivo && OS.Vivo.confetti && OS.Vivo.confetti(); } catch (e) { }
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
// quem está a zero no período não aparece (nem tu: o teu cartão mostra o que falta)
const sorted = () => { const k = ptsK[per()], q = pctK[per()], L = (RL || []).filter(r => (r[k] || 0) > 0).sort((a, b) => b[k] - a[k] || b[q] - a[q] || b.s - a.s);
  let pos = 0, prev = null; return L.map((r, i) => { if (!prev || r[k] !== prev[k] || r[q] !== prev[q]) pos = i + 1; prev = r; return Object.assign({ pos, pts: r[k], pct: r[q] }, r); }); };
const initials = r => r.av || (r.n ? r.n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?');
const okIm = s => typeof s === 'string' && s.length < 12000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
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
      <div class="rk-ring" style="--rp:${P.pts / 100}"><b>${P.pts}</b><small>pontos hoje</small></div></div>
    <ul class="rk-parts">${row(P.pT >= 50, `Tarefas e hábitos do dia${P.plan ? ` (${P.tasks[0] + P.habits[0]} de ${P.plan})` : ''}`, `${P.pT}/50`)
      + row(P.all, 'Tudo concluído (3 ou mais)', P.all ? '+10' : '0/10') + row(P.pF >= 20, `Tempo de foco (${P.fm} min)`, `${P.pF}/20`)
      + row(P.mv, 'Treino, corrida ou desporto', P.mv ? '+10' : '0/10') + row(P.rd, 'Leitura ou devocional', P.rd ? '+10' : '0/10')}</ul>
    ${strip()}<p class="mut rk-note">Um dia de foco é um dia com ${FOCO} pontos ou mais.${P.plan < 5 ? ' Os 50 pontos das tarefas e hábitos só vêm por inteiro com 5 ou mais coisas marcadas para o dia.' : ''}</p></div>`; };
const list = () => { if (!canRank()) return `<div class="pn"><div class="pn-h"><h3>${UI.ic('award')}Ranking</h3></div><p class="mut">O ranking junta as contas do Prumo. Este Prumo está sem conta (modo local), por isso só tu vês os teus pontos e os teus dias de foco.</p></div>`;
  load(); const L = sorted(), me = L.find(r => r.me), P = per();
  const body = !RL ? `<div class="rk-list rk-skel" aria-busy="true">${'<div class="rk-row"><span class="rk-pos"></span><span class="rk-av"></span><span class="rk-n"><b></b><small></small></span></div>'.repeat(5)}</div><p class="mut" style="margin:6px 0 0">A abrir o ranking…</p>` : !L.length ? UI.empty('Ainda ninguém fez pontos neste período. Quem fizer o primeiro ponto aparece aqui.')
    : `<div class="rk-list">${L.map(r => `<div class="rk-row${r.me ? ' me' : ''}${r.pos <= 3 ? ' top top' + r.pos : ''}"><span class="rk-pos">${r.pos <= 3 ? `<i>${r.pos}</i>` : ord(r.pos)}</span>
        <span class="rk-av${okIm(r.im) ? ' im' : ''}" style="--c:${/^#[0-9A-Fa-f]{6}$/.test(r.c) ? r.c : '#5CC8E6'}" aria-hidden="true">${okIm(r.im) ? `<img src="${r.im}" alt="" loading="lazy">` : esc(r.anon && !r.me ? '?' : initials(r))}</span>
        <span class="rk-n"><b>${esc(nameOf(r))}${r.me ? ' <em>tu</em>' : ''}</b><small>${flame(r.s > 0, r.s)} ${r.s === 1 ? 'dia' : 'dias'} de foco<span class="rk-pct-m"> · ${r.pct}%</span></small></span>
        <span class="rk-pct" title="Média de disciplina por dia"><span class="rk-tr"><i style="width:${Math.max(0, Math.min(100, r.pct))}%"></i></span><small>${r.pct}%</small></span><b class="rk-pts">${r.pts.toLocaleString(OS.loc ? OS.loc() : 'pt-PT')}<small>pts</small></b></div>`).join('')}</div>`;
  return `<div class="pn rk-board"><div class="pn-h"><h3>${UI.ic('award')}Ranking geral</h3>${UI.seg('rkP', PER, P)}</div>
    ${me ? `<p class="rk-pos-me">Estás em <b>${ord(me.pos)} lugar</b> de ${L.length} ${L.length === 1 ? 'pessoa' : 'pessoas'}${P === 'a' ? '' : P === '7' ? ' nos últimos 7 dias' : ' nos últimos 30 dias'}.</p>` : RL ? '<p class="rk-pos-me">Ainda não apareces: só entra na lista quem já fez pontos neste período.</p>' : ''}
    ${RERR ? `<p class="neg">${esc(RERR)} <button class="btn xs ghost" data-act="rkReload">Tentar outra vez</button></p>` : ''}${body}
    <p class="mut rk-note">Só se vê esta lista: não dá para abrir o perfil de ninguém nem mandar mensagens.${cfg().anon ? ' Estás a aparecer como "Pessoa anónima" (muda em Definições › Tu › Ranking).' : ''}</p></div>`; };
const how = () => UI.toggle('Como se ganham pontos', `<ul class="rk-how"><li>Só conta o que fazes: <b>entrar no Prumo não dá pontos</b>, e quem está a zero não aparece no ranking.</li><li><b>Fazer as tarefas e os hábitos do dia</b>: até 50 pontos, pela parte que fizeste (as tarefas para hoje ou atrasadas e as que concluíste hoje; os hábitos marcados para hoje). Com menos de 5 coisas marcadas, vale proporcionalmente menos.</li><li><b>Concluir tudo</b> o que tinhas para o dia (3 ou mais coisas): mais 10.</li><li><b>Tempo de foco</b> (estudo, Bloco de foco): 25 minutos dão 6, 1 hora dá 12 e 2 horas dão 20.</li><li><b>Treino, corrida ou desporto</b> registado no dia: 10.</li><li><b>Leitura</b> (páginas de um livro) <b>ou devocional</b> no dia: 10.</li><li>Um <b>dia de foco</b> é um dia com ${FOCO} pontos ou mais. Os dias de foco seguidos fazem a tua sequência ("Dia 5 de foco").</li><li>No ranking, os <b>pontos</b> são a soma dos dias (semana, mês ou sempre) e a <b>percentagem</b> é a média de disciplina por dia nesse tempo.</li></ul>`, 'rkHow', 'info');
V.ranking = () => { const S = state(); return UI.head('Ranking', 'A disciplina de todas as pessoas do Prumo: entrar todos os dias, fazer as tarefas e os hábitos do dia e concluir tudo.', '', 'Visão Geral') + meCard(S) + list() + how(); };
A.rkReload = () => load(true);

/* ---------- o fogo no topo, no Hoje e no Painel ---------- */
OS.Foco = { parts, state, streak, best, FOCO, send, load: () => load(true), rows: () => RL,
  chip: () => { if (OS.Areas && !OS.Areas.on('ranking')) return ''; const S = state(); return `<a class="fc-chip ${S.on ? 'on' : ''}" href="#ranking" title="${esc(headline(S))}" aria-label="${esc(headline(S))}">${UI.ic('flame')}<b>${S.s}</b></a>`; } };
const bar = () => { const S = state(), me = (sorted().find(r => r.me) || null);
  return `<a class="pn fc-bar ${S.on ? 'on' : ''}" href="#ranking" data-area="ranking">${flame(S.on, S.s)}<span class="grow"><b>${esc(headline(S))}</b><small>${S.P.pts} pontos hoje${S.on ? ' · já conta' : ` · faltam ${FOCO - S.P.pts}`}${me ? ` · ${ord(me.pos)} no ranking` : ''}</small></span>${UI.ic('right')}</a>`; };
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
