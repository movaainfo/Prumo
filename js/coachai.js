/* PRUMO — IA no Treino e na Dieta (separador "Análise da IA" em cada um).
   A IA lê o que registaste (treinos, séries por músculo, recordes, corridas, presença; refeições, calorias e macros dos últimos dias,
   peso, metas do corpo e da dieta) e diz se o treino e a dieta te levam aos teus objetivos: nota, o que está bem, o que está a travar,
   o que mudar (concreto) e um exemplo de semana de treino ou de dia de refeições. Também responde a perguntas tuas.
   O resultado fica guardado e sincroniza com a conta. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, V = OS.views, n = v => U.num(v) || 0;
OS.ONE_DEF.coach = { treino: null, dieta: null };
const cfg = () => OS.one('coach'), today = () => U.today();
const safe = (f, d) => { try { return f(); } catch (e) { return d; } };
const GOAL = { cut: 'perder gordura', lose: 'perder peso', bulk: 'ganhar massa muscular', gain: 'ganhar peso', keep: 'manter o peso', recomp: 'recomposição corporal' };

/* ---------- o que o Prumo sabe (só o necessário) ---------- */
const perfil = () => { const o = OS.one('diet'), B = U.sortBy(OS.all('body').filter(b => n(b.weight)), b => b.date), last = B[B.length - 1] || {};
  return { sexo: o.sex === 'F' ? 'feminino' : 'masculino', idade: n(o.age) || null, altura_cm: n(o.h) || null, peso_kg: n(last.weight) || null, gordura_pct: n(last.bf) || null, musculo_kg: n(last.muscleKg) || null,
    objetivo_dieta: GOAL[o.goal] || o.goal || '', atividade: o.act || '', treinos_por_semana_alvo: n(OS.one('profile').trainTarget) || null,
    peso_60_dias: B.filter(b => b.date >= U.addDays(today(), -60)).map(b => [b.date, n(b.weight)]).slice(-20),
    metas_corpo: safe(() => OS.all('bgoals').map(g => ({ meta: g.name || g.kind, alvo: g.target, prazo: g.deadline || '' })), []).slice(0, 10),
    metas: safe(() => OS.all('goals').filter(g => g.status !== 'Concluída' && /corp|saud|treino|desport|corr|dieta|peso/i.test((g.cat || '') + ' ' + (g.title || ''))).map(g => g.title), []).slice(0, 10) }; };
const exName = id => (OS.get('exercises', id) || {}).name || id;
const treinoCtx = () => { const t = today(), from = U.addDays(t, -28), W = U.sortBy(OS.all('workouts').filter(w => w.date >= from), w => w.date);
  return { perfil: perfil(),
    treinos_28_dias: W.slice(-24).map(w => ({ dia: w.date, nome: w.title || '', min: n(w.dur) || null, series: safe(() => OS.Fit.sets(w), null), volume_kg: Math.round(safe(() => OS.Fit.volume(w), 0)),
      exercicios: (Array.isArray(w.items) ? w.items : []).slice(0, 12).map(it => { const S = (Array.isArray(it.sets) ? it.sets : []).filter(s => n(s.reps)); return `${exName(it.ex)}: ${S.map(s => `${n(s.kg) || 0}×${n(s.reps)}`).join(', ')}`; }) })),
    series_por_musculo_7_dias: safe(() => OS.Fit.muscleSets(U.addDays(t, -6), t), {}), series_por_musculo_28_dias: safe(() => OS.Fit.muscleSets(from, t), {}),
    rotinas: OS.all('routines').slice(0, 8).map(r => ({ nome: r.name, exercicios: (Array.isArray(r.items) ? r.items : []).map(it => exName(it.ex)).slice(0, 12) })),
    recordes_recentes: safe(() => OS.Fit.prs().filter(p => p.date >= U.addDays(t, -90)).slice(0, 10).map(p => [p.name || exName(p.ex), p.kg, p.reps, p.date]), []),
    corridas_28_dias: OS.all('runs').filter(r => r.date >= from).map(r => [r.date, n(r.km), Math.round(n(r.time) / 60)]).slice(-15),
    desporto_28_dias: OS.all('sportlog').filter(x => x.date >= from).map(x => [x.date, x.kind || '', n(x.mins)]).slice(-15),
    consistencia: safe(() => { const s = OS.BodyGoals.stats(); return { pct_30_dias: s.pct, dias_seguidos: s.cur, semanas_a_cumprir: s.wk }; }, null),
    dieta_7_dias_media: dietAvg(7) }; };
const dietAvg = k => { const D = U.lastN(k).map(d => safe(() => OS.Diet.day(d), null)).filter(x => x && x.n); if (!D.length) return null;
  const a = f => Math.round(U.sum(D, f) / D.length); return { dias_com_registo: D.length, kcal: a(x => x.kcal), proteina_g: a(x => x.p), hidratos_g: a(x => x.c), gordura_g: a(x => x.f) }; };
const dietaCtx = () => { const o = OS.one('diet'), t = today();
  return { perfil: perfil(), metas_dieta: { kcal: n(o.kcal), proteina_g: n(o.p), hidratos_g: n(o.c), gordura_g: n(o.f), agua_ml: n(o.water) },
    metabolismo_basal: Math.round(safe(() => OS.Diet.bmr(), 0)) || null, sugestao_do_prumo: safe(() => OS.Diet.suggest(), null),
    dias_14: U.lastN(14).map(d => { const x = safe(() => OS.Diet.day(d), null); return x && x.n ? { dia: d, kcal: Math.round(x.kcal), p: Math.round(x.p), c: Math.round(x.c), g: Math.round(x.f), agua_ml: x.water || 0, registos: x.n } : { dia: d, sem_registo: true }; }),
    por_refeicao_14_dias: (() => { const M = OS.all('meals').filter(m => m.date >= U.addDays(t, -13)), by = U.groupBy(M, m => m.meal || 'Outra'); return Object.fromEntries(Object.entries(by).map(([k, L]) => [k, Math.round(U.sum(L, m => n(m.kcal)) / 14)])); })(),
    alimentos_mais_comidos: safe(() => OS.Diet.top().slice(0, 20), []),
    treino_14_dias: { treinos: OS.all('workouts').filter(w => w.date >= U.addDays(t, -13)).length, corridas_km: Math.round(U.sum(OS.all('runs').filter(r => r.date >= U.addDays(t, -13)), r => n(r.km))), desporto: OS.all('sportlog').filter(x => x.date >= U.addDays(t, -13)).length } }; };

/* ---------- pedir à IA ---------- */
const ASK = {
  treino: c => `És um treinador de força e condicionamento experiente e honesto (baseado em evidência: volume semanal por músculo, progressão de carga, frequência, recuperação). Analisa se o treino desta pessoa a leva aos objetivos dela e o que mudar. Português de Portugal, direto e prático, sem jargão desnecessário.
Dados do Prumo: ${JSON.stringify(c)}
Se houver pouco registo, diz o que falta registar e dá na mesma um plano de partida. Não inventes números que não estão nos dados.
Responde APENAS JSON: {"nota":0-100,"veredicto":"2–3 frases: está ou não a levar ao objetivo e porquê","bom":["…"],"problemas":[{"o":"o que está a travar","mudar":"o que fazer, concreto (séries, exercícios, frequência, cargas)"}],"musculos":"músculos com volume a mais ou a menos (1–2 frases)","plano":[{"dia":"Dia 1","foco":"…","exercicios":["exercício séries×reps"]}],"recuperacao":"sono, descanso e alimentação para o treino (1–2 frases)","aviso":"só se houver algo de saúde a vigiar, senão vazio"}`,
  dieta: c => `És um nutricionista desportivo experiente e honesto (baseado em evidência: balanço energético, proteína por kg, qualidade dos alimentos, distribuição nas refeições, hidratação). Analisa se a dieta desta pessoa a leva aos objetivos dela e o que mudar. Português de Portugal, direto e prático, com comida real e simples do país dela.
Dados do Prumo: ${JSON.stringify(c)}
Se houver poucos dias registados, diz isso e analisa na mesma o que há. Não inventes números que não estão nos dados. Não faças diagnósticos médicos.
Responde APENAS JSON: {"nota":0-100,"veredicto":"2–3 frases: está ou não a levar ao objetivo e porquê","bom":["…"],"problemas":[{"o":"o que está a travar","mudar":"o que fazer, concreto (quantidades, trocas de alimentos, horários)"}],"metas":"as metas de calorias e macros fazem sentido? se não, que valores sugeres e porquê (1–2 frases)","plano":[{"refeicao":"Pequeno-almoço","ideia":"…","kcal":0,"proteina_g":0}],"trocas":["troca simples: X por Y, porquê"],"aviso":"só se houver algo de saúde a vigiar, senão vazio"}` };
const BUSY = {}, ERR = {}, QA = {};
const run = async k => { if (BUSY[k]) return; if (!(OS.AI && OS.AI.key())) { UI.toast('Liga a IA em Definições › Spyke', 'warn'); return; }
  BUSY[k] = 1; ERR[k] = ''; OS.request();
  try { const o = await OS.AI.json([{ text: ASK[k](k === 'treino' ? treinoCtx() : dietaCtx()) }], .25), arr = (x, m) => (Array.isArray(x) ? x : []).slice(0, m);
    cfg()[k] = { at: Date.now(), d: today(), nota: Math.max(0, Math.min(100, Math.round(+o.nota || 0))), veredicto: String(o.veredicto || '').slice(0, 900), bom: arr(o.bom, 8).map(String),
      problemas: arr(o.problemas, 8).map(x => ({ o: String(x.o || x || '').slice(0, 300), mudar: String(x.mudar || '').slice(0, 500) })), extra: String(o.musculos || o.metas || '').slice(0, 600),
      plano: arr(o.plano, 8).map(x => k === 'treino' ? { t: String(x.dia || ''), s: String(x.foco || ''), L: arr(x.exercicios, 10).map(String) } : { t: String(x.refeicao || ''), s: String(x.ideia || ''), kcal: Math.round(+x.kcal || 0), p: Math.round(+x.proteina_g || 0) }),
      trocas: arr(o.trocas, 8).map(String), rec: String(o.recuperacao || '').slice(0, 500), aviso: String(o.aviso || '').slice(0, 400) };
    OS.touch('coach'); }
  catch (e) { ERR[k] = e.message || 'A IA não respondeu agora.'; }
  BUSY[k] = 0; OS.request(); };
A.caRun = b => run(b.dataset.k);
OS.forms.caAsk = async (f, v) => { const k = f.dataset.k, q = v('q'); if (!q || BUSY['q' + k]) return; if (!(OS.AI && OS.AI.key())) return UI.toast('Liga a IA em Definições › Spyke', 'warn');
  BUSY['q' + k] = 1; QA[k] = { q, a: '' }; OS.request();
  try { QA[k].a = await OS.AI.text(`${k === 'treino' ? 'És um treinador de força e condicionamento experiente.' : 'És um nutricionista desportivo experiente.'} Responde em português de Portugal, curto (até 8 frases), prático e honesto, com base nos dados da pessoa. Dados do Prumo: ${JSON.stringify(k === 'treino' ? treinoCtx() : dietaCtx())}${cfg()[k] ? ' A tua última análise: ' + JSON.stringify(cfg()[k]).slice(0, 2500) : ''}\nPergunta: ${q}`); }
  catch (e) { QA[k].a = 'Não consegui responder agora: ' + (e.message || 'tenta outra vez.'); }
  BUSY['q' + k] = 0; OS.request(); };

/* ---------- ecrã ---------- */
const ring = x => `<div class="cv-ring" style="--rp:${x / 100};--c:${x >= 75 ? 'var(--pos)' : x >= 50 ? 'var(--warn,#F2B544)' : 'var(--neg)'}"><b>${x}</b><small>de 100</small></div>`;
const view = k => { const r = cfg()[k], ai = OS.AI && OS.AI.key(), what = k === 'treino' ? 'o teu treino' : 'a tua dieta';
  const top = `<div class="pn"><div class="pn-h"><h3>${UI.ic('brain')}Análise da IA</h3>${r ? `<span class="mut">${U.fmtD(r.d)}</span>` : ''}</div>
    <p class="mut" style="margin:0 0 10px">A IA vê ${k === 'treino' ? 'os teus treinos, as séries por músculo, os recordes, as corridas, a presença e as tuas metas do corpo' : 'as tuas refeições dos últimos 14 dias, as calorias e os macros, o peso, o treino e as tuas metas'} e diz se ${what} te leva onde queres chegar, e o que mudar.</p>
    ${ai ? `<button class="btn ${r ? '' : 'pri'}" data-act="caRun" data-k="${k}" ${BUSY[k] ? 'disabled' : ''}>${BUSY[k] ? 'A analisar…' : r ? 'Analisar outra vez' : 'Analisar ' + what}</button>` : '<p class="mut">Liga a IA em Definições › Spyke para a análise.</p>'}
    ${BUSY[k] ? `<div class="sai-busy" style="margin-top:10px"><div class="fd-spin"></div><span>A ler os teus registos…</span></div>` : ''}${ERR[k] ? `<p class="neg">${esc(ERR[k])}</p>` : ''}</div>`;
  const body = r ? `<div class="pn cv-an"><div class="cv-top">${ring(r.nota)}<div><p style="margin:0">${esc(r.veredicto)}</p>${r.extra ? `<p class="mut" style="margin:6px 0 0">${esc(r.extra)}</p>` : ''}</div></div>
    ${r.aviso ? `<p class="warn" style="margin:12px 0 0">${UI.ic('info')} ${esc(r.aviso)}</p>` : ''}
    ${r.bom.length ? `<h4>${UI.ic('check')}O que está bem</h4><ul class="cv-l ok">${r.bom.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${r.problemas.length ? `<h4>${UI.ic('arrowUp')}O que mudar</h4><ul class="cv-l">${r.problemas.map(x => `<li><b>${esc(x.o)}</b>${x.mudar ? `<span>${esc(x.mudar)}</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${r.plano.length ? `<h4>${UI.ic(k === 'treino' ? 'dumbbell' : 'apple')}${k === 'treino' ? 'Uma semana de treino sugerida' : 'Um dia de refeições sugerido'}</h4><div class="ca-plan">${r.plano.map(x => `<div><b>${esc(x.t)}</b><small class="mut">${esc(x.s)}</small>${k === 'treino' ? `<ul>${x.L.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : `${x.kcal || x.p ? `<small class="mono">${x.kcal ? x.kcal + ' kcal' : ''}${x.kcal && x.p ? ' · ' : ''}${x.p ? x.p + ' g proteína' : ''}</small>` : ''}`}</div>`).join('')}</div>` : ''}
    ${r.trocas.length ? `<h4>${UI.ic('swap')}Trocas simples</h4><ul class="cv-l">${r.trocas.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${r.rec ? `<h4>${UI.ic('clock')}Recuperação</h4><p style="margin:0">${esc(r.rec)}</p>` : ''}
    <p class="mut" style="font-size:12px;margin:14px 0 0">Sugestões da IA com base nos teus registos: não substituem um profissional de saúde.</p></div>` : '';
  const ask = ai ? `<div class="pn"><div class="pn-h"><h3>${UI.ic('mic')}Pergunta à IA</h3></div><form data-form="caAsk" data-k="${k}" class="row gap8"><input class="field grow" name="q" placeholder="${k === 'treino' ? 'Ex.: estou a treinar peito o suficiente? como subo o supino?' : 'Ex.: estou a comer proteína suficiente? o que como antes do treino?'}"><button class="btn" ${BUSY['q' + k] ? 'disabled' : ''}>Perguntar</button></form>
    ${QA[k] ? `<div class="ca-qa"><p class="mut"><b>${esc(QA[k].q)}</b></p>${QA[k].a ? `<p style="white-space:pre-wrap">${esc(QA[k].a)}</p>` : '<div class="sai-busy"><div class="fd-spin"></div><span>A pensar…</span></div>'}</div>` : ''}</div>` : '';
  return top + body + ask; };

// o separador "Análise da IA" no Treino e na Dieta (com a nota da última análise)
const tab = (h, k, on) => { const i = h.indexOf('</nav>'); if (i < 0) return h; const r = cfg()[k]; let x = h.slice(0, i); if (on) x = x.replace(/ class="on"/g, ' class=""');
  return x + `<a href="#${k}.ia" class="${on ? 'on' : ''}">Análise da IA${r ? ` <small class="mono ca-n">${r.nota}</small>` : ''}</a>` + h.slice(i); };
OS.on('ready', () => ['treino', 'dieta'].forEach(k => { const o = V[k]; if (!o || o._ca) return;
  V[k] = sub => { if (sub !== 'ia') return tab(o(sub), k, false); const h = o(''), i = h.indexOf('</nav>'); return i < 0 ? h : tab(h.slice(0, i + 6), k, true) + `<div class="ca">${view(k)}</div>`; }; V[k]._ca = 1; }));
OS.CoachAI = { run, view, treinoCtx, dietaCtx };
})();
