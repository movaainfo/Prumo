/* PRUMO — Rotina por horas (v2.53): o dia desenhado de hora a hora, "das 7h às 8h faço isto".
   - Hábitos e rotina › Rotina: escolhe o dia (ou a semana inteira) e vês os blocos na linha das horas, com a hora atual,
     os espaços livres (toca para preencher), sobreposições assinaladas e quantas horas vão para cada área.
   - Adicionar rápido: das __ às __, o quê e em que dias. Copiar um dia para outros, limpar um dia e modelos para começar.
   - Blocos que passam da meia-noite (ex.: dormir 23:00–07:00) continuam no dia seguinte.
   - Cada bloco pode contar como um hábito: marcar o bloco como feito marca o hábito de hoje.
   - Avisos na hora (ou uns minutos antes) com a app aberta; com a app fechada, os blocos vão para o Google Calendar.
   - Hoje mostra "Agora: … até …" e deixa marcar os blocos da rotina como feitos. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, V = OS.views, esc = U.esc, L = OS.L, LS = U.ls;
const today = () => U.today(), wd = d => String(U.parse(d).getDay()), nowM = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const SH = { '1': 'Seg', '2': 'Ter', '3': 'Qua', '4': 'Qui', '5': 'Sex', '6': 'Sáb', '0': 'Dom' }, ORDER = ['1', '2', '3', '4', '5', '6', '0'];
const prevD = k => ORDER[(ORDER.indexOf(k) + 6) % 7];
const ACOL = { Universidade: 'var(--c2)', Aprendizagem: 'var(--c10)', Finanças: 'var(--c8)', Investimentos: 'var(--c8)', Treino: 'var(--c5)', Corrida: 'var(--c6)', Trabalho: 'var(--c4)', Carreira: 'var(--c4)', Mova: 'var(--c4)', Projetos: 'var(--c3)', Casa: 'var(--c9)', Pessoal: 'var(--c1)', Fé: 'var(--c7)', Saúde: 'var(--c5)' };
const col = r => ACOL[r.area] || ['var(--c1)', 'var(--c3)', 'var(--c9)', 'var(--c10)'][U.hash(r.title || '') % 4];
const dur = m => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };
const hrs = m => U.nf(m / 60, m % 60 ? 1 : 0) + ' h';
const all = () => OS.all('routine').filter(r => r.start && r.end && U.t2m(r.start) != null);
const mins = r => { const s = U.t2m(r.start), e = U.t2m(r.end); return { s, e: e > s ? e : e + 1440 }; };
const crosses = r => U.t2m(r.end) <= U.t2m(r.start);

// os pedaços de um dia da semana: blocos que começam nesse dia + o resto dos que vêm do dia anterior depois da meia-noite
const segs = k => { const out = [];
  all().forEach(r => { const d = r.days || [], { s, e } = mins(r);
    if (d.includes(k)) out.push({ r, s, e: Math.min(e, 1440), cont: false, cut: e > 1440 });
    if (crosses(r) && d.includes(prevD(k)) && U.t2m(r.end) > 0) out.push({ r, s: 0, e: U.t2m(r.end), cont: true }); });
  out.sort((a, b) => a.s - b.s || b.e - a.e);
  // faixas lado a lado quando se sobrepõem
  let grp = [], end = -1; const flush = () => { const n = Math.max(1, ...grp.map(x => x.lane + 1)); grp.forEach(x => { x.n = n; }); grp = []; };
  out.forEach(x => { if (x.s >= end) { flush(); end = -1; } const used = grp.filter(y => y.e > x.s).map(y => y.lane); let l = 0; while (used.includes(l)) l++; x.lane = l; grp.push(x); end = Math.max(end, x.e); }); flush();
  out.forEach(x => { x.clash = out.some(y => y !== x && y.s < x.e && x.s < y.e); });
  return out; };
const doneOn = (r, d) => !!((r.log || {})[d]);
const RT = OS.Rotina = { segs, all, doneOn,
  // agora e a seguir (só rotina), para o Hoje e o Spyke
  now: () => { const n = nowM(); return segs(wd(today())).find(x => x.s <= n && n < x.e) || null; },
  next: () => { const n = nowM(); return segs(wd(today())).find(x => x.s > n) || null; } };

/* ---------- ações ---------- */
A.rtDone = b => { const r = OS.get('routine', b.dataset.id), t = today(); if (!r) return;
  const log = Object.assign({}, r.log || {}); const on = !log[t]; if (on) log[t] = 1; else delete log[t]; OS.upd('routine', r.id, { log });
  const h = r.habit && OS.get('habits', r.habit); if (on && h && OS.Hab.due(h, t) && !OS.Hab.done(h, t)) OS.Hab.toggle(h.id, t);
  UI.toast(on ? `${r.title}: feito${h ? ' · hábito "' + h.name + '" marcado' : ''}` : `${r.title}: por fazer`, on ? 'pos' : ''); };
A.rtPreset = b => { const f = b.closest('form'); if (!f) return; const set = { uteis: ['1', '2', '3', '4', '5'], todos: ORDER, fds: ['6', '0'] }[b.dataset.v] || [];
  f.querySelectorAll('input[name=d]').forEach(i => { i.checked = set.includes(i.value); }); };
OS.forms = OS.forms || {};
OS.forms.rtAdd = (f, v) => { const s = v('s'), e = v('e'), title = v('t'), days = [...f.querySelectorAll('input[name=d]:checked')].map(i => i.value);
  if (!title) return UI.toast('Escreve o que fazes nesse bloco', 'warn'); if (!s || !e) return UI.toast('Indica a hora de início e de fim', 'warn');
  if (s === e) return UI.toast('O fim tem de ser diferente do início', 'warn'); if (!days.length) return UI.toast('Escolhe pelo menos um dia', 'warn');
  OS.add('routine', { title, start: s, end: e, days, area: v('a') || '', warn: '0' });
  UI.toast(`${title}: das ${s} às ${e}${crosses({ start: s, end: e }) ? ' (do dia seguinte)' : ''}`, 'pos'); };
OS.forms.rtCopy = (f, v) => { const k = f.dataset.k, to = v('to'), tgt = to === 'uteis' ? ['1', '2', '3', '4', '5'] : to === 'todos' ? ORDER : to === 'fds' ? ['6', '0'] : [to];
  const T = tgt.filter(x => x !== k), B = all().filter(r => (r.days || []).includes(k)); if (!B.length || !T.length) return UI.toast('Nada para copiar', 'warn');
  B.forEach(r => OS.upd('routine', r.id, { days: [...new Set([...(r.days || []), ...T])] }));
  UI.toast(`${B.length} ${B.length === 1 ? 'bloco passa' : 'blocos passam'} a repetir também em ${T.map(x => SH[x]).join(', ')}`, 'pos'); };
A.rtClear = b => { const k = b.dataset.k, B = all().filter(r => (r.days || []).includes(k)); if (!B.length) return;
  UI.ask(`Limpar ${L.WEEK.find(w => w[0] === k)[1].toLowerCase()}?`, `Os ${B.length} blocos deixam de acontecer neste dia. Nos outros dias ficam como estão.`, 'Limpar', () => {
    B.forEach(r => { const d = (r.days || []).filter(x => x !== k); if (d.length) OS.upd('routine', r.id, { days: d }); else OS.del('routine', r.id); }); UI.toast('Dia limpo', 'pos'); }); };
// modelos para começar (cada um é só um ponto de partida: tudo se edita)
const TPL = {
  estudo: ['Dia de estudo', [['07:00', '07:30', 'Acordar e preparar', 'Pessoal'], ['07:30', '08:00', 'Pequeno-almoço', 'Saúde'], ['08:00', '10:00', 'Estudo profundo', 'Universidade'], ['10:00', '10:15', 'Pausa', 'Pessoal'], ['10:15', '12:30', 'Aulas ou estudo', 'Universidade'], ['12:30', '13:30', 'Almoço', 'Saúde'], ['14:00', '17:00', 'Aulas', 'Universidade'], ['17:30', '18:30', 'Treino', 'Treino'], ['19:30', '20:30', 'Jantar', 'Saúde'], ['20:30', '21:30', 'Revisão do dia', 'Universidade'], ['21:30', '22:30', 'Tempo livre', 'Pessoal'], ['23:00', '07:00', 'Dormir', 'Saúde']]],
  trabalho: ['Dia de trabalho', [['06:30', '07:00', 'Acordar e preparar', 'Pessoal'], ['07:00', '07:30', 'Pequeno-almoço', 'Saúde'], ['08:00', '09:00', 'Caminho e leitura', 'Pessoal'], ['09:00', '13:00', 'Trabalho', 'Trabalho'], ['13:00', '14:00', 'Almoço', 'Saúde'], ['14:00', '18:00', 'Trabalho', 'Trabalho'], ['18:30', '19:30', 'Ginásio', 'Treino'], ['20:00', '21:00', 'Jantar', 'Saúde'], ['21:00', '22:00', 'Estudar ou projeto', 'Projetos'], ['23:00', '06:30', 'Dormir', 'Saúde']]],
  fds: ['Fim de semana', [['08:30', '09:30', 'Acordar com calma e pequeno-almoço', 'Pessoal'], ['10:00', '12:00', 'Projeto pessoal', 'Projetos'], ['12:30', '14:00', 'Almoço', 'Saúde'], ['15:00', '18:00', 'Família, amigos e lazer', 'Pessoal'], ['18:00', '19:00', 'Desporto', 'Treino'], ['20:00', '21:00', 'Jantar', 'Saúde'], ['21:00', '22:00', 'Revisão da semana', 'Pessoal'], ['23:30', '08:30', 'Dormir', 'Saúde']]] };
A.rtTpl = b => { const T = TPL[b.dataset.v], k = b.dataset.k; if (!T) return;
  T[1].forEach(([s, e, title, area]) => OS.add('routine', { title, start: s, end: e, days: [k], area, warn: '0' }, { silent: true }));
  OS.request(); UI.toast(`Modelo "${T[0]}" posto em ${L.WEEK.find(w => w[0] === k)[1]}. Toca num bloco para o mudar.`, 'pos'); };
A.rtNotif = async () => { try { if (!('Notification' in window)) return UI.toast('Este aparelho não deixa a app mandar avisos', 'warn'); const p = await Notification.requestPermission(); UI.toast(p === 'granted' ? 'Avisos ligados neste aparelho' : 'Avisos não autorizados', p === 'granted' ? 'pos' : 'warn'); OS.request(); } catch (e) { } };

/* ---------- a página ---------- */
const PX = 46; // altura de uma hora
const dayCol = (k, o = {}) => { const S = segs(k), isT = k === wd(today()) && !o.week, n = nowM();
  const h0 = Math.min(6, ...S.map(x => Math.floor(x.s / 60))), h1 = Math.max(23, ...S.map(x => Math.ceil(x.e / 60))), top = m => (m - h0 * 60) / 60 * PX;
  let lines = '';
  for (let h = h0; h <= h1; h++) lines += `<div class="rt-hr" style="top:${(h - h0) * PX}px"><span>${U.pad(h % 24)}:00</span></div>`;
  // espaços livres entre blocos (≥ 30 min), para preencher com um toque
  let free = '', cur = Math.max(h0 * 60, 6 * 60); const lim = Math.min(h1 * 60, 23 * 60);
  if (!o.week && S.length) { [...S].sort((a, b) => a.s - b.s).forEach(x => { if (x.s - cur >= 30 && cur < lim) { const e = Math.min(x.s, lim); if (e - cur >= 30) free += `<button class="rt-free" style="top:${top(cur) + 2}px;height:${top(e) - top(cur) - 4}px" data-new="routine" data-defs='${esc(JSON.stringify({ start: U.m2t(cur), end: U.m2t(e), days: [k], warn: '0' }))}'><span>Livre ${U.m2t(cur)}–${U.m2t(e)} · ${dur(e - cur)}</span>${UI.ic('plus')}</button>`; } cur = Math.max(cur, x.e); });
    if (lim - cur >= 30) free += `<button class="rt-free" style="top:${top(cur) + 2}px;height:${top(lim) - top(cur) - 4}px" data-new="routine" data-defs='${esc(JSON.stringify({ start: U.m2t(cur), end: U.m2t(lim), days: [k], warn: '0' }))}'><span>Livre ${U.m2t(cur)}–${U.m2t(lim)} · ${dur(lim - cur)}</span>${UI.ic('plus')}</button>`; }
  const blocks = S.map(x => { const r = x.r, h = Math.max(top(x.e) - top(x.s), 18), live = isT && x.s <= n && n < x.e, past = isT && x.e <= n, dn = isT && doneOn(r, today()), small = h < 40;
    const lbl = `${x.cont ? '00:00' : r.start}–${x.cut ? r.end + ' (amanhã)' : r.end}`;
    return `<div class="rt-b${live ? ' now' : ''}${past ? ' past' : ''}${dn ? ' done' : ''}${small ? ' sm' : ''}${x.clash ? ' clash' : ''}" style="--bc:${col(r)};top:${top(x.s)}px;height:${h}px;left:calc(${x.lane / x.n * 100}% + 2px);width:calc(${100 / x.n}% - 4px)" data-edit="routine:${r.id}" title="${esc(r.title)} · ${lbl}">
      <div class="rt-bt"><b>${esc(r.title)}</b>${o.week ? '' : `<span class="mono">${lbl}${x.cont ? ' · continua de ontem' : ''}</span>`}${!small && !o.week ? `<small>${[dur(x.e - x.s), r.area, r.habit && (OS.get('habits', r.habit) || {}).name ? 'conta como hábito' : '', x.clash ? 'sobreposto' : ''].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</div>
      ${isT && !x.cont ? `<button class="rt-ck${dn ? ' on' : ''}" data-act="rtDone" data-id="${r.id}" aria-pressed="${dn}" aria-label="${esc(r.title)} feito hoje" title="${dn ? 'Feito hoje' : 'Marcar como feito hoje'}">${UI.ic('check')}</button>` : ''}</div>`; }).join('');
  const nowL = isT && n >= h0 * 60 && n <= h1 * 60 ? `<div class="rt-now" style="top:${top(n)}px"><span>${U.hm()}</span></div>` : '';
  return `<div class="rt-day" data-h0="${h0}" style="height:${(h1 - h0) * PX + 8}px">${lines}<div class="rt-lane">${free}${blocks}${nowL}</div></div>`; };

const byArea = S => { const m = {}; S.forEach(x => { const a = x.r.area || 'Outro'; m[a] = (m[a] || 0) + (x.e - x.s); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
const adherence = () => { let due = 0, dn = 0; U.lastN(7).forEach(d => { if (d === today()) return; const k = wd(d); all().forEach(r => { const born = r._c ? U.iso(new Date(r._c)) : ''; if (!(r.days || []).includes(k) || (born && d < born)) return; due++; if (doneOn(r, d)) dn++; }); }); return due ? dn / due : null; };

const page = () => { const tk = wd(today()), sel = OS.ui.rtDay || tk, week = sel === 'semana', R = all();
  const chips = `<div class="rt-days" role="tablist" aria-label="Dia da semana">${ORDER.map(k => `<button role="tab" class="chip${sel === k ? ' on' : ''}${k === tk ? ' is-t' : ''}" data-ui="rtDay" data-v="${k}" aria-selected="${sel === k}">${SH[k]}${k === tk ? ' <small>hoje</small>' : ''}<i>${segs(k).filter(x => !x.cont).length || ''}</i></button>`).join('')}<button role="tab" class="chip${week ? ' on' : ''}" data-ui="rtDay" data-v="semana" aria-selected="${week}">Semana</button></div>`;
  // a sugestão de horas do "adicionar rápido" é o primeiro espaço livre (a partir de agora, se for hoje)
  const k = week ? tk : sel, S = segs(k), gap = (() => { let c = Math.max(7 * 60, k === tk ? Math.ceil(nowM() / 15) * 15 : 0); for (const x of [...S].sort((a, b) => a.s - b.s)) { if (x.s - c >= 30) break; c = Math.max(c, x.e); } return Math.min(c, 1380); })(), s0 = U.m2t(gap), e0 = U.m2t(Math.min(gap + 60, 1439));
  const add = `<form class="pn rt-add" data-form="rtAdd"><div class="rt-add-r"><label>Das <input class="field" type="time" name="s" value="${s0}" required aria-label="Início"></label><label>às <input class="field" type="time" name="e" value="${e0}" required aria-label="Fim"></label>
    <input class="field grow" name="t" placeholder="O que fazes? ex.: Estudar, Ginásio, Almoço" aria-label="O que fazes nesse bloco" maxlength="80" required>
    <select class="field" name="a" aria-label="Área"><option value="">Área</option>${L.AREAS.map(a => `<option>${esc(a)}</option>`).join('')}</select></div>
    <div class="rt-add-r"><div class="rt-dd" role="group" aria-label="Dias">${ORDER.map(d => `<label class="rt-dc"><input type="checkbox" name="d" value="${d}"${d === k ? ' checked' : ''}><span>${SH[d]}</span></label>`).join('')}</div>
    <span class="rt-pre"><button type="button" class="btn xs ghost" data-act="rtPreset" data-v="uteis">Dias úteis</button><button type="button" class="btn xs ghost" data-act="rtPreset" data-v="todos">Todos</button><button type="button" class="btn xs ghost" data-act="rtPreset" data-v="fds">Fim de semana</button></span>
    <button class="btn pri">${UI.ic('plus')}Adicionar</button></div></form>`;
  const head = UI.head('Hábitos e rotina', 'O teu dia por horas: das tantas às tantas, o que fazes. Aparece em Hoje, no Calendário e no Google Calendar, e avisa-te na hora.', UI.addBtn('routine', 'Novo bloco', { days: [k], warn: '0' }), 'Execução') + UI.tabs('habitos', [['', 'Hábitos'], ['rotina', 'Rotina'], ['plano', 'Planeamento']], 'rotina');
  if (!R.length) return head + chips + add + `<div class="pn rt-empty"><h3>Começa com um modelo</h3><p class="mut">Põe um dia típico em ${esc(L.WEEK.find(w => w[0] === k)[1])} e depois ajusta as horas ou copia para os outros dias.</p><div class="row gap8">${Object.entries(TPL).map(([id, [n, b]]) => `<button class="btn" data-act="rtTpl" data-v="${id}" data-k="${k}">${esc(n)} <small class="mut">${b.length} blocos</small></button>`).join('')}</div></div>`;
  // resumo: agora, a seguir, horas por área, cumprimento
  const nw = RT.now(), nx = RT.next(), n = nowM(), ad = adherence(), dS = S, plan = U.sum(dS, x => x.e - x.s);
  const wkM = {}; ORDER.forEach(d => segs(d).forEach(x => { const a = x.r.area || 'Outro'; wkM[a] = (wkM[a] || 0) + (x.e - x.s); }));
  const tdS = segs(tk).filter(x => !x.cont), tdDone = tdS.filter(x => doneOn(x.r, today())).length;
  const perm = 'Notification' in window ? Notification.permission : 'na';
  const side = `<div class="rt-side">
    <div class="pn rt-nowc"><div class="eyebrow">Agora</div>${nw ? `<b style="--bc:${col(nw.r)}">${esc(nw.r.title)}</b><small>até ${nw.cut || nw.e >= 1440 ? '00:00' : U.m2t(nw.e)} · faltam ${dur(nw.e - n)}</small><div class="rt-pb"><i style="width:${Math.round((n - nw.s) / (nw.e - nw.s) * 100)}%;background:${col(nw.r)}"></i></div>` : '<b class="mut">Tempo livre</b>'}
      ${nx ? `<div class="divider"></div><div class="eyebrow">A seguir</div><b>${esc(nx.r.title)}</b><small>às ${U.m2t(nx.s)} · daqui a ${dur(nx.s - n)}</small>` : ''}
      <div class="divider"></div><small class="mut">Hoje: ${tdDone} de ${tdS.length} blocos feitos${ad != null ? ` · últimos 7 dias: ${U.pct(ad)}` : ''}</small></div>
    <div class="pn"><div class="pn-h"><h3>${week ? 'Semana' : esc(L.WEEK.find(w => w[0] === k)[1])} em horas</h3><span class="mono mut" style="font-size:12px">${hrs(week ? U.sum(Object.values(wkM), x => x) : plan)}</span></div>
      ${(week ? Object.entries(wkM).sort((a, b) => b[1] - a[1]) : byArea(dS)).map(([a, m]) => `<div class="bar-row"><span class="l">${esc(a)}</span><div class="bar"><i style="width:${Math.round(m / Math.max(1, ...(week ? Object.values(wkM) : byArea(dS).map(x => x[1]))) * 100)}%;background:${ACOL[a] || 'var(--c9)'}"></i></div><span class="v mono">${hrs(m)}</span></div>`).join('') || '<p class="mut">Sem blocos.</p>'}</div>
    ${week ? '' : `<form class="pn rt-copy" data-form="rtCopy" data-k="${k}"><div class="pn-h"><h3>Copiar este dia</h3></div><div class="row gap8"><select class="field grow" name="to" aria-label="Copiar para"><option value="uteis">Para os dias úteis</option><option value="todos">Para todos os dias</option><option value="fds">Para o fim de semana</option>${ORDER.filter(d => d !== k).map(d => `<option value="${d}">Para ${esc(L.WEEK.find(w => w[0] === d)[1].toLowerCase())}</option>`).join('')}</select><button class="btn">Copiar</button></div>
      <div class="row between gap8" style="margin-top:10px"><small class="mut">Os blocos passam a repetir nesses dias.</small>${S.some(x => !x.cont) ? `<button type="button" class="btn xs ghost" data-act="rtClear" data-k="${k}">Limpar o dia</button>` : ''}</div>
      ${!S.some(x => !x.cont) ? `<div class="divider"></div><div class="row gap8">${Object.entries(TPL).map(([id, [nm]]) => `<button type="button" class="btn xs" data-act="rtTpl" data-v="${id}" data-k="${k}">${esc(nm)}</button>`).join('')}</div>` : ''}</form>`}
    ${(() => { const c = OS.one('calx') || {}; return `<div class="pn"><div class="pn-h"><h3>${UI.ic('cal')}No calendário</h3>${c.on ? UI.badge(c.err ? 'com erro' : 'a enviar', c.err ? 'warn' : 'pos') : ''}</div><p class="mut" style="margin:0 0 8px;font-size:12.5px">Cada bloco fica guardado no Calendário do Prumo, todas as semanas. ${c.on ? 'E vai sozinho para o teu Google Calendar e o Calendário do iPhone (calendário "Náutilo · Treino e rotina"), sempre 3 semanas à frente: se mudares aqui, muda lá.' : 'Para o teres também no Google Calendar e no iPhone, liga a agenda fora da app.'}</p><div class="row gap8"><a class="btn sm" href="#calendario.semana">${UI.ic('cal')}Ver no Calendário</a>${c.on ? `<button class="btn sm ghost" data-act="cpNow">${UI.ic('sync')}Enviar agora</button>` : `<a class="btn sm ghost" href="#definicoes.ligacoes">Ligar o Google Calendar</a>`}</div></div>`; })()}
    <div class="pn"><div class="pn-h"><h3>Avisos</h3></div><p class="mut" style="margin:0 0 8px;font-size:12.5px">Com a app aberta, avisa no início de cada bloco (ou uns minutos antes: muda no bloco). Com a app fechada, liga o Google Calendar em Definições para os blocos aparecerem no telemóvel.</p>${perm === 'granted' ? UI.badge('avisos ligados neste aparelho', 'pos') : perm === 'na' ? '' : `<button class="btn sm" data-act="rtNotif">${UI.ic('clock')}Ligar avisos neste aparelho</button>`}</div></div>`;
  const grid = week ? `<div class="pn flush rt-week"><div class="rt-wh">${ORDER.map(d => `<button class="${d === tk ? 'is-t' : ''}" data-ui="rtDay" data-v="${d}">${SH[d]}</button>`).join('')}</div><div class="rt-wg"><div class="rt-axis">${(() => { const h0 = Math.min(6, ...ORDER.flatMap(d => segs(d).map(x => Math.floor(x.s / 60)))), h1 = Math.max(23, ...ORDER.flatMap(d => segs(d).map(x => Math.ceil(x.e / 60)))); let s = ''; for (let h = h0; h <= h1; h++) s += `<span style="top:${(h - h0) * PX}px">${U.pad(h % 24)}h</span>`; return `<div style="position:relative;height:${(h1 - h0) * PX + 8}px">${s}</div>`; })()}</div>${ORDER.map(d => weekCol(d)).join('')}</div></div>`
    : `<div class="pn flush rt-wrap">${dayCol(k)}</div>`;
  return head + chips + add + `<div class="rt-g">${grid}${side}</div>`; };
// semana: todas as colunas com a mesma régua de horas
const weekCol = k => { const H0 = Math.min(6, ...ORDER.flatMap(d => segs(d).map(x => Math.floor(x.s / 60)))), H1 = Math.max(23, ...ORDER.flatMap(d => segs(d).map(x => Math.ceil(x.e / 60)))), S = segs(k), top = m => (m - H0 * 60) / 60 * PX, isT = k === wd(today()), n = nowM();
  let lines = ''; for (let h = H0; h <= H1; h++) lines += `<div class="rt-hr" style="top:${(h - H0) * PX}px"></div>`;
  return `<div class="rt-wc${isT ? ' is-t' : ''}" data-h0="${H0}" style="height:${(H1 - H0) * PX + 8}px">${lines}${S.map(x => { const h = Math.max(top(x.e) - top(x.s), 14); return `<div class="rt-b wk${h < 30 ? ' sm' : ''}${x.clash ? ' clash' : ''}${isT && doneOn(x.r, today()) ? ' done' : ''}" style="--bc:${col(x.r)};top:${top(x.s)}px;height:${h}px;left:calc(${x.lane / x.n * 100}% + 1px);width:calc(${100 / x.n}% - 2px)" data-edit="routine:${x.r.id}" title="${esc(x.r.title)} · ${x.cont ? '00:00' : x.r.start}–${x.r.end}"><div class="rt-bt"><b>${esc(x.r.title)}</b>${h >= 30 ? `<span class="mono">${x.cont ? '00:00' : x.r.start}–${x.r.end}</span>` : ''}</div></div>`; }).join('')}${isT ? `<div class="rt-now" style="top:${top(n)}px"></div>` : ''}</div>`; };

/* ---------- Hábitos: a rotina por horas aparece também no separador dos hábitos ---------- */
const strip = () => { const S = segs(wd(today())), n = nowM(); if (!S.length) return `<a class="pn rt-cta" href="#habitos.rotina">${UI.ic('cal')}<span><b>Organiza o teu dia por horas</b><small>Das 7h às 8h treino, das 9h às 12h estudo… Vê o dia inteiro numa linha e recebe um aviso a cada bloco.</small></span>${UI.ic('right')}</a>`;
  return `<div class="pn rt-strip"><div class="pn-h"><h3>${UI.ic('cal')}Hoje, por horas</h3><a class="more" href="#habitos.rotina">Rotina ${UI.ic('right')}</a></div><div class="rt-sl">${S.map(x => { const live = x.s <= n && n < x.e, past = x.e <= n, dn = doneOn(x.r, today()); return `<div class="rt-si${live ? ' now' : ''}${past ? ' past' : ''}${dn ? ' done' : ''}" style="--bc:${col(x.r)}" data-edit="routine:${x.r.id}"><span class="mono">${x.cont ? '00:00' : x.r.start}–${x.r.end}</span><b>${esc(x.r.title)}</b>${x.cont ? '' : `<button class="rt-ck${dn ? ' on' : ''}" data-act="rtDone" data-id="${x.r.id}" aria-pressed="${dn}" aria-label="${esc(x.r.title)} feito hoje">${UI.ic('check')}</button>`}</div>`; }).join('')}</div></div>`; };
OS.on('ready', () => { const o = V.habitos; if (!o || o._rt) return;
  V.habitos = sub => { if (sub === 'rotina') return page(); const h = o(sub); if (sub) return h; const i = h.indexOf('</nav>'); return i < 0 ? h : h.slice(0, i + 6) + strip() + h.slice(i + 6); }; V.habitos._rt = 1; });

/* ---------- avisos no início de cada bloco (com a app aberta) ---------- */
const FK = 'nau:rtfire';
const tick = () => { try { if (!OS.Lock || !OS.Lock.unlocked() || document.hidden) return; const t = today(), n = nowM(), fired = LS.get(FK, {}) || {}; let ch = false;
    Object.keys(fired).forEach(x => { if (!x.endsWith(t)) { delete fired[x]; ch = true; } });
    segs(wd(t)).filter(x => !x.cont).forEach(x => { const r = x.r, w = r.warn === 'off' ? null : U.num(r.warn) || 0; if (w == null) return; const at = x.s - w, key = r.id + '|' + t;
      if (fired[key] || n < at || n > at + 3 || doneOn(r, t)) return; fired[key] = 1; ch = true;
      const msg = w ? `Daqui a ${w} min: ${r.title} (${r.start}–${r.end})` : `Agora: ${r.title} até ${r.end}`; UI.toast(msg, 'pos');
      try { if ('Notification' in window && Notification.permission === 'granted') { const body = r.notes ? String(r.notes).slice(0, 120) : 'Rotina do Prumo'; if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(g => g.showNotification(msg, { body, icon: 'icon-192.png', tag: 'rt-' + key })).catch(() => { }); else new Notification(msg, { body }); } } catch (e) { } });
    if (ch) LS.set(FK, fired);
    // a linha da hora anda sozinha; a página só se redesenha quando muda o bloco atual (para não apagar o que estás a escrever)
    document.querySelectorAll('#view [data-h0] > .rt-lane > .rt-now, #view .rt-wc[data-h0] > .rt-now').forEach(el => { const c = el.closest('[data-h0]'); el.style.top = (n - +c.dataset.h0 * 60) / 60 * PX + 'px'; const sp = el.querySelector('span'); if (sp) sp.textContent = U.hm(); });
    const a = RT.now(), b = RT.next(), key = (a ? a.r.id + a.s : '') + '|' + (b ? b.r.id + b.s : ''); if (LAST != null && key !== LAST && /^#(habitos(\.rotina)?|hoje)?$/.test(location.hash) && !document.querySelector('#view :focus')) OS.request(); LAST = key; } catch (e) { } };
let LAST = null;
setInterval(tick, 30e3); OS.on('ready', () => setTimeout(tick, 1500));
})();
