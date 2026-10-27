/* PRUMO — Capital Profissional ligado aos teus objetivos (v2.53).
   O número (0 a 1000) sobe à medida que te aproximas do profissional que queres ser, não por registar coisas:
   - Competências: quanto já subiste de cada competência até ao nível alvo que lhe deste.
   - Certificações: as que tens contra as que planeaste (ou a meta de certificações, se tiveres uma).
   - Experiência: meses de emprego, voluntariado, liderança e projetos, mais as horas reais dos teus turnos.
   - Rede: contactos e contactos ativos (últimos 90 dias), contra a tua meta de rede (ou 90).
   - Projetos: projetos profissionais concluídos e o avanço dos que estão em curso.
   - Eventos: eventos, palestras, workshops, conferências e competições a que foste.
   - Aprendizagem: cursos e conteúdos concluídos ou a meio, e horas de estudo ligadas a competências.
   - Mercado: o currículo (nota da análise da IA), candidaturas, entrevistas e oportunidades submetidas.
   - Metas profissionais: o avanço medido das tuas metas de carreira e empresa (conta a dobrar).
   As dimensões de que as tuas metas profissionais falam também contam a dobrar. */
(() => {
'use strict';
const U = OS.U, Car = OS.Car, safe = (f, d) => { try { return f(); } catch (e) { return d; } };
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PRO = /carreira|emprego|estagio|vaga|certific|linkedin|portfolio|curriculo|empresa|negocio|cliente|profission|promoc|salario|freelanc|startup|mova/;
const proGoal = g => ['Trabalho', 'Empresa'].includes(g.cat) || ['certs', 'contacts', 'movaRevenue'].includes(g.metric) || PRO.test(N(g.title + ' ' + (g.why || '')));
// de que dimensões falam as tuas metas profissionais (contam a dobrar)
const KW = [['Competências', /competenc|skill|program|ingles|lingua|dominar|aprender a|excel|python|sql|lideranc|comunicac/], ['Certificações', /certific|diploma|exame/], ['Experiência', /experienc|emprego|estagio|trabalh/],
  ['Rede', /rede|network|contact|linkedin|mentor/], ['Projetos', /projet|portfolio|empresa|negocio|startup|produto|lancar/], ['Eventos', /evento|confer|palestra|workshop|meetup|hackathon|congress/],
  ['Aprendizagem', /curso|aprend|estud|mestrado|pos-grad|formac|livro/], ['Mercado', /vaga|emprego|candidat|entrevista|salario|cliente|vender|promoc|curriculo/]];
const EVT = /confer|palestra|workshop|meetup|semin|congress|feira|hackathon|webinar|summit|forum|bootcamp/;
// avanço de uma meta num dia passado (pelo registo diário que o Dominus guarda); hoje, o avanço ao vivo
const progAt = (g, asOf) => { if (asOf >= U.today()) return safe(() => { const i = OS.Goal.info(g); return g.status === 'Concluída' ? 1 : (i.pr != null ? i.pr : i.p) || 0; }, 0);
  if (g.status === 'Concluída' && (g.doneAt || '') && g.doneAt <= asOf) return 1; const h = ((OS.one('dominus').gp || {})[g.id] || {}).h || []; let v = 0; h.forEach(([d, p]) => { if (d <= asOf) v = p / 100; }); return v; };

Car.capital = (asOf = U.today()) => {
  const before = r => { const d = r.date || r.start || r.last || (r._c ? U.iso(new Date(r._c)) : ''); return !d || d <= asOf; };
  const G = OS.all('goals').filter(g => g.status !== 'Abandonada' && proGoal(g) && (g.start || (g._c ? U.iso(new Date(g._c)) : '')) <= asOf), gtxt = N(G.map(g => g.title + ' ' + (g.why || '')).join(' '));
  const tgtOf = m => { const g = G.find(x => x.metric === m && U.num(x.target) > 0); return g ? U.num(g.target) : 0; };
  const why = {};
  // Competências: do nível 1 até ao nível alvo de cada uma
  const skills = OS.all('skills').filter(before), skP = skills.map(s => { const lv = U.clamp(U.num(s.level) || 1, 1, 5), tg = U.clamp(U.num(s.targetLevel) || 4, 2, 5); return U.clamp((lv - 1) / (tg - 1), 0, 1); });
  const vSk = skills.length ? U.avg(skP) * Math.min(1, skills.length / 3) : 0;
  why['Competências'] = skills.length ? `${skills.length} ${skills.length === 1 ? 'competência' : 'competências'}: em média a ${U.pct(U.avg(skP))} do nível alvo${skills.length < 3 ? ' (conta por inteiro a partir de 3)' : ''}` : 'Ainda sem competências com nível alvo (Aprendizagem).';
  // Certificações: as que tens contra as que planeaste
  const certs = OS.all('learn').filter(l => l.kind === 'Certificação' && l.status === 'Concluído' && (!l.end || l.end <= asOf)).concat(OS.all('certs').filter(c => c.status === 'Obtida' && (!c.date || c.date <= asOf)));
  const plannedC = OS.all('learn').filter(l => l.kind === 'Certificação' && !['Concluído', 'Abandonado'].includes(l.status)).length + OS.all('certs').filter(c => c.status && !['Obtida', 'Desisti', 'Abandonada'].includes(c.status)).length;
  const tC = Math.max(tgtOf('certs'), certs.length + plannedC, 3), vC = Math.min(1, certs.length / tC);
  why['Certificações'] = `${certs.length} de ${tC}${tgtOf('certs') ? ' (a tua meta)' : plannedC ? ' (as que planeaste)' : ' (alvo base)'}`;
  // Experiência: meses de experiência e as horas reais de trabalho
  const exps = OS.all('experiences').filter(e => !e.start || e.start <= asOf);
  const months = U.sum(exps.filter(e => ['Emprego', 'Voluntariado', 'Liderança', 'Projeto'].includes(e.kind)), e => { const a = e.start || asOf, b = e.end && e.end < asOf ? e.end : asOf; return Math.max(0, U.diff(b, a) / 30.4); });
  const shiftH = U.sum(OS.all('shifts').filter(s => s.date && s.date <= asOf), s => safe(() => Car.workedHours(s), 0)), shM = shiftH / 140;
  const vE = Math.min(1, (months + (months ? 0 : shM)) / 36);
  why['Experiência'] = `${U.nf(months || shM, 1)} meses${!months && shM ? ' (pelas horas dos teus turnos)' : ''} de 36`;
  // Rede
  const contacts = OS.all('contacts').filter(before), active = contacts.filter(c => c.last && U.diff(asOf, c.last) <= 90 && c.last <= asOf), tR = Math.max(30, tgtOf('contacts') || 90);
  const vR = Math.min(1, (contacts.length + active.length * 2) / tR); why['Rede'] = `${contacts.length} contactos, ${active.length} ativos (90 dias)${tgtOf('contacts') ? ' · meta ' + tgtOf('contacts') : ''}`;
  // Projetos profissionais: concluídos e avanço dos que estão em curso
  const PT = ['Profissional', 'Empresarial', 'Aprendizagem'], pDone = OS.all('projects').filter(p => p.status === 'Concluído' && PT.includes(p.type) && (!p.doneAt || p.doneAt <= asOf)),
    pRun = OS.all('projects').filter(p => p.status === 'Em andamento' && PT.includes(p.type) && before(p)), pPart = asOf >= U.today() ? U.sum(pRun, p => safe(() => OS.Proj.info(p).prog, 0)) : 0;
  const vP = Math.min(1, (pDone.length + pPart) / 6); why['Projetos'] = `${pDone.length} concluídos${pRun.length ? ` e ${pRun.length} em curso` : ''} (alvo 6)`;
  // Eventos
  const ev = exps.filter(e => ['Evento', 'Palestra', 'Competição'].includes(e.kind)).length + OS.all('events').filter(e => e.date && e.date <= asOf && EVT.test(N(e.title))).length + OS.all('opps').filter(o => ['Evento', 'Palestra', 'Networking', 'Competição'].includes(o.kind) && o.status === 'Aceite' && (!o.deadline || o.deadline <= asOf)).length;
  const vV = Math.min(1, ev / 8); why['Eventos'] = `${ev} de 8 (eventos, palestras, workshops)`;
  // Aprendizagem
  const L = OS.all('learn').filter(l => l.kind !== 'Certificação' && l.kind !== 'Livro'), lDone = L.filter(l => l.status === 'Concluído' && (!l.end || l.end <= asOf)).length,
    lPart = U.sum(L.filter(l => l.status === 'Em curso' && before(l)), l => U.num(l.total) ? U.clamp(U.num(l.done) / U.num(l.total), 0, 1) : .25), learnH = U.sum(OS.all('sessions').filter(s => s.skill && s.date <= asOf), s => U.num(s.minutes)) / 60;
  const vA = Math.min(1, learnH / 120 + (lDone + lPart) / 12); why['Aprendizagem'] = `${lDone} concluídos, ${U.nf(lPart, 1)} a meio, ${U.nf(learnH, 1)} h de estudo de competências`;
  // Mercado
  const apps = OS.all('applications').filter(a => a.date && a.date <= asOf && a.status !== 'Por enviar'), interviews = apps.filter(a => ['Entrevista', 'Proposta', 'Aceite'].includes(a.status)),
    sub = OS.all('opps').filter(o => ['Submetida', 'Em avaliação', 'Aceite'].includes(o.status) && (!o.deadline || o.deadline <= asOf || asOf >= U.today())).length, cvN = asOf >= U.today() ? safe(() => (OS.CV.cur().an || {}).nota, 0) || 0 : 0;
  const vM = Math.min(1, (cvN / 100) * .35 + Math.min(1, apps.length / 10) * .25 + Math.min(1, interviews.length / 3) * .25 + Math.min(1, sub / 5) * .15);
  why['Mercado'] = `currículo ${cvN ? cvN + '/100' : 'sem análise'} · ${apps.length} candidaturas · ${interviews.length} entrevistas · ${sub} oportunidades submetidas`;
  const dims = { 'Competências': vSk, 'Certificações': vC, 'Experiência': vE, 'Rede': vR, 'Projetos': vP, 'Eventos': vV, 'Aprendizagem': vA, 'Mercado': vM };
  const w = Object.fromEntries(Object.keys(dims).map(k => [k, 1])); KW.forEach(([k, re]) => { if (G.length && re.test(gtxt)) w[k] = 2; });
  if (G.length) { const gp = U.avg(G.map(g => progAt(g, asOf))); dims['Metas profissionais'] = gp; w['Metas profissionais'] = 2; why['Metas profissionais'] = `${G.length} ${G.length === 1 ? 'meta' : 'metas'} de carreira e empresa, em média a ${U.pct(gp)}`; }
  const W = U.sum(Object.keys(dims), k => w[k]), score = Math.round(U.sum(Object.keys(dims), k => dims[k] * w[k]) / W * 1000);
  return { dims, w, why, score, goals: G.map(g => g.id), skills: skills.length, certs: certs.length, months: U.r1(months || shM), contacts: contacts.length, active: active.length, apps: apps.length, interviews: interviews.length, projects: pDone.length, events: ev, learnH: U.r1(learnH) };
};
})();
