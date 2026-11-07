/* PRUMO — Universidade arrumada (v3.1). As mesmas opções de sempre, mas em 4 grupos (Visão geral, O curso, Avaliações, Estudar),
   com os separadores de cada grupo por baixo, e a Visão geral por blocos com título (Hoje, Avaliações, O semestre, Histórico).
   Um separador novo que outro módulo junte (OS.UT) aparece sozinho em "Estudar": nada se perde. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, V = OS.views, UNI = OS.UNI, UT = OS.UT; if (!UNI || !UT) return;
const GROUPS = [['', 'Visão geral', 'compass', ['']], ['curso', 'O curso', 'school', ['disciplinas', 'horario', 'presencas', 'plano', 'materiais']],
  ['aval', 'Avaliações', 'cal', ['avaliacoes', 'trabalhos', 'notas', 'exames']], ['estudo', 'Estudar', 'brain', ['sessoes', 'revisoes', 'flashcards', 'simulados', 'questoes', 'erros', 'tutor', 'desempenho']]];
const KNOWN = () => new Set(GROUPS.flatMap(g => g[3]));
const groupOf = k => { const g = GROUPS.find(x => x[3].includes(k || '')); return g ? g[0] : 'estudo'; };
const subsOf = gk => { const g = GROUPS.find(x => x[0] === gk) || GROUPS[3], kn = KNOWN(); return g[3].map(k => UT.find(t => t[0] === k)).filter(Boolean).concat(gk === 'estudo' ? UT.filter(t => t[0] && !kn.has(t[0])) : []); };
const nav = k => { const gk = groupOf(k), mem = OS.ui.uniG || {};
  const href = g => { if (!g[0]) return '#universidade'; const S = subsOf(g[0]), last = mem[g[0]], t = last && S.some(s => s[0] === last) ? last : (S[0] || [''])[0]; return '#universidade' + (t ? '.' + t : ''); };
  return `<nav class="ug" aria-label="Universidade">${GROUPS.map(g => `<a href="${href(g)}" class="ug-b${g[0] === gk ? ' on' : ''}"${g[0] === gk ? ' aria-current="true"' : ''}>${UI.ic(g[2])}<span>${g[1]}</span>${g[0] ? `<small>${subsOf(g[0]).length}</small>` : ''}</a>`).join('')}</nav>`
    + GROUPS.filter(g => g[0]).map(g => `<nav class="tabs ug-t" aria-label="${esc(g[1])}"${g[0] === gk ? '' : ' hidden'}>${subsOf(g[0]).map(([s, l]) => `<a href="#universidade.${s}" class="${k === s ? 'on' : ''}">${l}</a>`).join('')}</nav>`).join(''); };
V.universidade = sub => { const p = OS.one('profile'), k = sub && UNI[sub] ? sub : '', gk = groupOf(k);
  if (gk && k) OS.ui.uniG = Object.assign({}, OS.ui.uniG || {}, { [gk]: k });
  return UI.head('Universidade', `${esc(p.uni || '')}${p.course ? ' · ' + esc(p.course) : ''} · ${esc(p.year || '')} · ${esc(p.semester || '')}`, `${UI.addBtn('sessions', 'Sessão')}${UI.addBtn('assessments', 'Avaliação', null, '')}`, 'Estudos')
    + nav(k) + (UNI[k || 'visao'] || UNI.visao)(); };
// a Visão geral por blocos: junta o que cada módulo desenha e põe cada coisa no seu sítio (o que não reconhecer fica no fim)
const _v = UNI.visao;
UNI.visao = () => { const h = _v(); if (typeof document === 'undefined') return h;
  try { const T = document.createElement('template'); T.innerHTML = h; const R = T.content, pick = sel => { const e = R.querySelector(sel); if (!e) return ''; e.remove(); return e.outerHTML; };
    const today = pick('.un-today'), cd = pick('.uv-cd'), heat = pick('.uv-heat'), hw = pick('.hw-vis'), kpi = pick('.uv-kpi'), todo = pick('.uv-todo'), next = pick('.uv-next'), week = pick('.uv-week'), perf = pick('.uv-perf'), cal = pick('.uv-cal');
    R.querySelectorAll('.un-top, .g.g-main').forEach(e => { if (!e.textContent.trim()) e.remove(); });
    const rest = [...R.childNodes].map(n => n.nodeType === 1 ? n.outerHTML : n.nodeType === 3 ? n.textContent.trim() : '').join('');
    const sec = (t, sub, inner) => inner.replace(/<[^>]*>/g, '').trim() ? `<section class="uv-s"><div class="uv-h"><h2>${t}</h2>${sub ? `<span class="mut">${sub}</span>` : ''}</div>${inner}</section>` : '';
    return `<div class="uv">${sec('O teu dia', 'o que fazer agora', today + (todo || hw ? `<div class="uv-2">${todo}${hw}</div>` : ''))}${sec('Avaliações', 'o que vem aí', cd || next ? `<div class="uv-2">${cd}${next}</div>` : '')}${sec('O semestre', 'como vais', kpi + week + perf)}${sec('Histórico', 'o caminho feito', heat + cal)}${rest}</div>`; }
  catch (e) { return h; } };
OS.UniNav = { GROUPS, groupOf, subsOf };
})();
