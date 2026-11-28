/* PRUMO — Modo exame (v4.01), em Universidade › Avaliações.
   Para cada teste ou exame marcado: dizes a matéria (um tema por linha), quanto tempo tens por dia e em que dias estudas, e o Prumo faz
   o plano de trás para a frente até à data: primeiro aprender a matéria (os temas repartidos pelos dias), depois exercícios e revisão,
   e na véspera uma revisão leve e descanso. Cada sessão é uma tarefa com dia marcado (aparece no Calendário e nas Tarefas). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, UNI = OS.UNI, UT = OS.UT; if (!UNI || !UT) return;
OS.ONE_DEF.exames = { P: {} };
const PL = () => { const o = OS.one('exames'); if (!o.P) o.P = {}; return o.P; };
const today = () => U.today();
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// substitui o antigo «Plano para exames» (mesmo lugar, mais controlo); os planos antigos (examPlan) contam como sessões
{ const i = UT.findIndex(t => t[0] === 'exames'); if (i >= 0) UT[i] = ['exames', 'Modo exame']; else UT.push(['exames', 'Modo exame']); }
const prox = () => U.sortBy(OS.all('assessments').filter(a => a.date && a.date >= today() && a.prep !== 'Feito'), a => a.date);
const disc = a => (OS.get('subjects', a.subject) || {}).name || 'Disciplina';
const dias = (a, b) => Math.round((U.parse(b) - U.parse(a)) / 864e5);
const tarefas = aid => OS.all('tasks').filter(t => t.exam === aid || t.examPlan === aid);
// o plano: aprender (temas repartidos) → exercícios e revisão → véspera leve
const gerar = (a, temas, mins, wd) => { const fim = U.addDays(a.date, -1), L = []; for (let d = today(); d <= fim; d = U.addDays(d, 1)) if (wd.includes(U.parse(d).getDay())) L.push(d);
  if (!L.length) return null; const N = L.length, out = [];
  const vesp = N >= 3 && L[N - 1] === fim ? L.pop() : null, nRev = Math.max(L.length >= 4 ? 1 : 0, Math.round(L.length * .25)), apr = L.slice(0, L.length - nRev), rev = L.slice(L.length - nRev);
  const T = temas.length ? temas : ['Toda a matéria'];
  if (apr.length) { const por = Math.max(1, Math.ceil(T.length / apr.length)); apr.forEach((d, i) => { let fatia = T.slice(i * por, i * por + por); const ex = !fatia.length;
      if (ex) fatia = [T[i % T.length]]; out.push({ d, t: (ex ? 'Exercícios: ' : 'Estudar: ') + fatia.join(', '), tipo: ex ? 'Exercícios' : 'Estudo profundo' }); }); }
  else if (!rev.length) out.push({ d: L[0] || fim, t: 'Estudar: ' + T.join(', '), tipo: 'Estudo profundo' });
  rev.forEach((d, i) => out.push({ d, t: i === rev.length - 1 && rev.length > 1 ? 'Simulado: faz um teste completo com o tempo do exame' : 'Revisão geral e exercícios de toda a matéria', tipo: i === rev.length - 1 && rev.length > 1 ? 'Simulado' : 'Revisão' }));
  if (vesp) out.push({ d: vesp, t: 'Véspera: revisão leve dos resumos e dormir bem', tipo: 'Revisão', leve: 1 });
  return out.map(x => Object.assign(x, { mins: x.leve ? Math.min(30, mins) : mins })); };
const planoHTML = a => { const P = PL()[a.id], T = U.sortBy(tarefas(a.id), t => t.sched || ''), feitas = T.filter(t => t.status === 'Feita').length, hoje = T.find(t => t.sched === today() && t.status !== 'Feita'), dl = dias(today(), a.date);
  return `<div class="pn ex-c${dl <= 3 ? ' perto' : ''}" data-id="${a.id}"><div class="ex-h"><div><small>${esc(a.type || 'Avaliação')} · ${esc(disc(a))}</small><b>${esc(a.title)}</b><span>${U.fmtD(a.date)}${a.time ? ' às ' + esc(a.time) : ''}</span></div><div class="ex-cd"><b>${dl}</b><small>${dl === 1 ? 'dia' : 'dias'}</small></div></div>
    ${P && T.length ? `<div class="ex-pr"><span>${feitas} de ${T.length} sessões feitas</span>${UI.bar(T.length ? feitas / T.length : 0, feitas === T.length ? 'pos' : '')}</div>
      ${hoje ? `<div class="ex-hoje"><small>Hoje</small><b>${esc(hoje.title.replace(/^\[Exame\][^:]*:\s*/, ''))}</b><span>${P.mins} min</span></div>` : ''}
      <details class="ex-pl"><summary>Ver o plano todo</summary><div class="list">${T.map(t => OS.taskRow ? OS.taskRow(t) : esc(t.title)).join('')}</div></details>
      <div class="row gap8">${a.subject ? `<button class="btn sm" data-act="ueFocus" data-s="${a.subject}">${UI.ic('target')}Focar agora</button>` : ''}<button class="btn sm ghost" data-act="exRefazer" data-id="${a.id}">${UI.ic('repeat')}Refazer o plano</button><button class="btn sm ghost" data-act="exTirar" data-id="${a.id}">${UI.ic('x')}Desligar o modo exame</button></div>`
    : `<p class="mut" style="margin:0">Sem plano ainda. Diz a matéria e quanto tempo tens: o Prumo reparte tudo até ao dia ${U.fmtD(a.date)}.</p><button class="btn pri sm" data-act="exAbrir" data-id="${a.id}">${UI.ic('zap')}Ativar o modo exame</button>`}</div>`; };
UNI.exames = () => { const L = prox();
  return `<div class="ex">${UI.sec ? UI.sec('Modo exame', '', 'Um plano de estudo de trás para a frente até cada avaliação: aprender, praticar, rever e chegar descansado.') : ''}
    ${L.length ? `<div class="ex-g">${L.map(planoHTML).join('')}</div>` : UI.empty('Não tens avaliações marcadas. Junta a primeira para ativares o modo exame.', UI.addBtn('assessments', 'Avaliação'))}</div>`; };
A.exAbrir = b => { const a = OS.get('assessments', b.dataset.id); if (!a) return; const P = PL()[a.id] || {}, top = OS.all('topics').filter(x => a.subject && x.subject === a.subject && x.status !== 'Dominado').map(x => x.title), temas = P.temas || (String(a.content || '').trim() ? String(a.content).split(/\n|;/).map(x => x.trim()).filter(Boolean) : top), wd = P.wd || [1, 2, 3, 4, 5, 6, 0];
  UI.modal(`<form class="ex-f" id="exForm" data-id="${a.id}" onsubmit="return false"><div class="row between" style="align-items:center"><h3 style="margin:0">Modo exame · ${esc(a.title)}</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p class="mut">${esc(disc(a))} · ${U.fmtD(a.date)} · faltam ${dias(today(), a.date)} dias</p>
    <label><span>A matéria (um tema por linha)</span><textarea class="field" name="temas" rows="6" placeholder="Ex.:&#10;Capítulo 1 · Limites&#10;Capítulo 2 · Derivadas&#10;Capítulo 3 · Integrais">${esc(temas.join('\n'))}</textarea></label>
    <label><span>Tempo por dia</span><select class="field" name="mins">${[30, 45, 60, 90, 120, 180].map(m => `<option value="${m}" ${(P.mins || 60) === m ? 'selected' : ''}>${m < 60 ? m + ' min' : (m / 60) + (m === 60 ? ' hora' : ' horas')}</option>`).join('')}</select></label>
    <fieldset class="ex-wd"><legend>Dias em que estudas</legend>${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="wd" value="${d}" ${wd.includes(d) ? 'checked' : ''}><span>${WD[d]}</span></label>`).join('')}</fieldset>
    <div class="row gap8"><button type="button" class="btn pri" data-act="exFazer">Fazer o plano</button><button type="button" class="btn ghost" data-mclose>Cancelar</button></div></form>`, 'ex-modal'); };
const limpar = aid => tarefas(aid).filter(t => t.status !== 'Feita').forEach(t => OS.del('tasks', t.id));
A.exFazer = () => { const f = U.$('#exForm'); if (!f) return; const v = n => (f.elements[n] && f.elements[n].value || '').trim(); const a = OS.get('assessments', f.dataset.id); if (!a) return; const temas = String(v('temas') || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 60), mins = +v('mins') || 60, wd = [...f.querySelectorAll('input[name=wd]:checked')].map(x => +x.value);
  if (!wd.length) return UI.toast('Escolhe pelo menos um dia da semana.', 'warn'); const S = gerar(a, temas, mins, wd); if (!S || !S.length) return UI.toast('Não há dias de estudo antes da data da avaliação com esses dias da semana.', 'warn');
  limpar(a.id); const d = disc(a); S.forEach(x => OS.add('tasks', { title: `[Exame] ${d}: ${x.t}`, status: 'Próxima', prio: 'Alta', sched: x.d, due: x.d, area: 'Universidade', subject: a.subject || '', ctx: ['@Estudo'], exam: a.id, notes: `${x.tipo} · ${x.mins} min · para «${a.title}» (${U.fmtD(a.date)})` }, { silent: true })); OS.emit('change', 'tasks');
  PL()[a.id] = { at: Date.now(), mins, temas, wd }; OS.touch('exames'); if (!a.prep || a.prep === 'Não comecei') OS.upd('assessments', a.id, { prep: 'A preparar' }, { silent: true });
  UI.closeModal(); UI.toast(`Plano feito: ${S.length} sessões até ${U.fmtD(a.date)}. Estão nas Tarefas e no Calendário.`, 'pos'); OS.request(); };
A.exRefazer = b => A.exAbrir(b);
A.exTirar = b => { const a = OS.get('assessments', b.dataset.id); if (!a) return; if (!confirm('Desligar o modo exame? As sessões que ainda não fizeste saem das Tarefas e do Calendário.')) return; limpar(a.id); delete PL()[a.id]; OS.touch('exames'); UI.toast('Modo exame desligado.', 'pos'); OS.request(); };
OS.Exame = { gerar, prox };
})();
