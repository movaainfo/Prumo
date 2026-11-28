/* PRUMO — mais jogos (v3.90): Duelo de hábitos, Quiz relâmpago das 13h e Bolão da temporada.
   · Duelo de hábitos (#jogos.duelo): 7 dias contra um amigo. Conta o que fazes de verdade no app (hábitos cumpridos, treinos e corridas,
     tarefas feitas, minutos de foco e estudo). Só vão para o servidor os pontos de cada dia, nunca os nomes dos hábitos.
   · Quiz relâmpago (#animes.quiz): às 13h de Lisboa, 10 perguntas de anime iguais para todos, 15 segundos cada; mais rápido = mais pontos.
   · Bolão da temporada (#animes.bolao): prever o melhor e o mais popular da temporada e a nota final do mais esperado. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token() && OS.Acc.pid && OS.Acc.pid());
const call = (op, b) => OS.Social && OS.Social.call ? OS.Social.call(op, b) : Promise.reject(new Error('Sem ligação.'));
const av = (o, sz) => OS.AnimeSoc && OS.AnimeSoc.av ? OS.AnimeSoc.av(o, sz) : '';
const nf = n => Number(n || 0).toLocaleString('pt-PT');
const falta = t => { const m = Math.max(0, Math.round((t - Date.now()) / 6e4)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + ' h' : '') : h ? h + ' h' + (m % 60 ? ' e ' + (m % 60) + ' min' : '') : m + ' min'; };
const dataC = t => new Date(t).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
const semConta = (t, d) => `<section class="j2-pg"><div class="j2-vz"><b>${t}</b><p>${d} Entra na tua conta do Prumo para jogar.</p></div></section>`;
if (!UI.IP.swords) UI.IP.swords = 'M5 4l10 10M5 4h3.5M5 4v3.5M19 4L9 14M19 4h-3.5M19 4v3.5M7 13l4 4M5.5 18.5l2.5-2.5M17 13l-4 4M18.5 18.5L16 16';
if (!UI.IP.bolt2) UI.IP.bolt2 = 'M13 2L4 14h7l-1 8 9-12h-7z';
if (!UI.IP.ticket) UI.IP.ticket = 'M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 0 0-4V4H3zM14 4v16';

/* =================== DUELO DE HÁBITOS =================== */
const DS = { d: null, at: 0, busy: false, err: '', env: {} };
// os pontos de um dia, medidos no aparelho: hábito cumprido 2, treino ou corrida 5 (até 2), tarefa feita 1 (até 10), cada 25 min de foco ou estudo 1 (até 8)
const pontosDia = d => { let h = 0, t = 0, k = 0, f = 0;
  try { h = OS.all('habits').filter(x => x.active && OS.Hab && OS.Hab.done(x, d)).length; } catch (e) { }
  try { t = OS.all('workouts').filter(x => x.date === d).length + OS.all('runs').filter(x => x.date === d).length; } catch (e) { }
  try { k = OS.all('tasks').filter(x => x.doneAt === d).length; } catch (e) { }
  try { f = Math.floor(U.sum(OS.all('sessions').filter(x => x.date === d), x => +x.minutes || 0) / 25); } catch (e) { }
  const det = { h: Math.min(h, 10), t: Math.min(t, 2), k: Math.min(k, 10), f: Math.min(f, 8) }; return { pts: det.h * 2 + det.t * 5 + det.k + det.f, det }; };
const duCarregar = async forcar => { if (!conta() || DS.busy || (!forcar && DS.d && Date.now() - DS.at < 6e4)) return; DS.busy = true; DS.err = '';
  try { DS.d = await call('duelos', {}); DS.at = Date.now(); duEnviar(); } catch (e) { DS.err = e.message || 'Não deu para abrir os duelos.'; } DS.busy = false; OS.request(); };
// manda os pontos dos dias do duelo (no máximo de minuto a minuto por duelo; o servidor nunca deixa descer)
const duEnviar = async () => { const L = ((DS.d || {}).duelos || []).filter(w => w.estado === 'ativa'); for (const w of L) { const v = {}; let mais = false;
    w.dias.filter(d => d <= w.hoje).forEach(d => { const p = pontosDia(d).pts, s = (w.meu.dias.find(x => x.d === d) || {}).p || 0; v[d] = p; if (p > s) mais = true; });
    const j = JSON.stringify(v), e = DS.env[w.id] || {}; if (!mais || (e.j === j && Date.now() - e.at < 6e4)) continue; DS.env[w.id] = { j, at: Date.now() };
    try { const r = await call('duelProg', { id: w.id, v }); const i = DS.d.duelos.findIndex(x => x.id === w.id); if (i >= 0) DS.d.duelos[i] = r.duelo; OS.request(); } catch (er) { } } };
OS.on('change', c => { if (DS.d && ['habits', 'workouts', 'runs', 'tasks', 'sessions'].includes(c)) setTimeout(duEnviar, 1500); });
const eu = () => (OS.Social && OS.Social._S && OS.Social._S.eu && OS.Social._S.eu.eu) || null;
const DSEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const barras = (L, max) => `<div class="du-bars">${L.map(x => `<span class="${x.fut ? 'fut' : ''}" title="${esc(x.d)}: ${x.p} pontos"><i style="height:${Math.round((x.p / max) * 100)}%"></i><small>${DSEM[new Date(x.d + 'T12:00:00').getDay()]}</small></span>`).join('')}</div>`;
const duCard = w => { const max = Math.max(10, ...w.meu.dias.map(x => x.p), ...w.dele.dias.map(x => x.p)), hoje = pontosDia(w.hoje), fim = w.estado === 'fim';
  const ganha = w.meu.tot > w.dele.tot ? 'eu' : w.meu.tot < w.dele.tot ? 'ele' : '';
  return `<article class="du-c${fim ? ' fim ' + w.venc : ''}"><div class="du-h"><span class="du-k">${UI.ic('swords')}${fim ? (w.venc === 'eu' ? 'Ganhaste' : w.venc === 'ele' ? 'Perdeste' : 'Empate') : 'Duelo a decorrer'}</span><small>${fim ? 'Acabou a ' + dataC(w.fim) : 'Acaba daqui a <b>' + falta(w.fim) + '</b>'}</small></div>
    <div class="du-vs"><div class="du-l${ganha === 'eu' ? ' lid' : ''}"><span class="du-who">${av(eu(), 28)}<b>Tu</b></span><strong>${w.meu.tot}</strong>${barras(w.meu.dias, max)}</div>
      <span class="du-x" aria-hidden="true">×</span>
      <div class="du-l r${ganha === 'ele' ? ' lid' : ''}"><span class="du-who">${av(w.outro, 28)}<b>${esc(w.outro.nome)}</b></span><strong>${w.dele.tot}</strong>${barras(w.dele.dias, max)}</div></div>
    ${fim ? '' : `<p class="du-hoje">${UI.ic('check')}<span>Hoje já fizeste <b>${hoje.pts} pontos</b>: ${hoje.det.h} ${hoje.det.h === 1 ? 'hábito' : 'hábitos'}, ${hoje.det.t} ${hoje.det.t === 1 ? 'treino' : 'treinos'}, ${hoje.det.k} ${hoje.det.k === 1 ? 'tarefa' : 'tarefas'} e ${hoje.det.f * 25} min de foco.</span></p>`}</article>`; };
const duPagina = () => { if (!conta()) return semConta('Duelo de hábitos', 'Desafia um amigo para 7 dias de hábitos, treinos e tarefas.'); duCarregar(false); const d = DS.d;
  const topo = UI.head('Duelo de hábitos', '7 dias contra um amigo. Ganha quem fizer mais de verdade.', '', 'Jogos');
  if (!d) return topo + `<section class="j2-pg"><p class="mut">${DS.err ? esc(DS.err) : 'A abrir os duelos…'}</p></section>`;
  const L = d.duelos, ativos = L.filter(w => w.estado === 'ativa'), conv = L.filter(w => w.estado === 'convite' && !w.por), env = L.filter(w => w.estado === 'convite' && w.por), fim = L.filter(w => w.estado === 'fim').slice(0, 8), livres = d.amigos.filter(a => !L.some(w => ['convite', 'ativa'].includes(w.estado) && w.outro.id === a.id));
  return topo + `<section class="j2-pg du-pg">
    <div class="j2-hero du-hero"><div><span class="j2-k">${UI.ic('swords')}Duelo de hábitos</span><h2>${ativos.length ? (ativos.length === 1 ? 'Tens um duelo a decorrer' : 'Tens ' + ativos.length + ' duelos a decorrer') : 'Desafia um amigo'}</h2>
      <p>Conta sozinho o que registas no Prumo: <b>hábito cumprido 2 pontos</b>, <b>treino ou corrida 5</b> (até 2 por dia), <b>tarefa feita 1</b> (até 10) e <b>cada 25 min de foco ou estudo 1</b> (até 8). O teu amigo só vê os pontos, nunca os teus hábitos.</p></div>
      <div class="j2-hk"><span><b>${d.reg.v}</b> vitórias</span><span><b>${d.reg.d}</b> derrotas</span>${d.reg.e ? `<span><b>${d.reg.e}</b> empates</span>` : ''}</div></div>
    ${conv.map(w => `<div class="du-conv">${av(w.outro, 36)}<p><b>${esc(w.outro.nome)}</b> desafiou-te para um duelo de 7 dias.</p><div class="row gap6"><button type="button" class="btn sm pri" data-act="duResp" data-id="${esc(w.id)}" data-sim="1">Aceitar</button><button type="button" class="btn sm ghost" data-act="duResp" data-id="${esc(w.id)}">Recusar</button></div></div>`).join('')}
    ${ativos.map(duCard).join('')}
    ${env.map(w => `<div class="du-conv esp">${av(w.outro, 36)}<p>Desafiaste <b>${esc(w.outro.nome)}</b>. Falta a resposta (o convite dura 3 dias).</p><button type="button" class="btn sm ghost" data-act="duResp" data-id="${esc(w.id)}">Cancelar</button></div>`).join('')}
    <section class="j2-sec"><h3>Novo duelo</h3>${d.amigos.length ? (livres.length ? `<form class="du-novo" data-form="duNovo" autocomplete="off"><select class="field grow" name="amigo" aria-label="Escolhe o amigo" required>${livres.map(a => `<option value="${esc(a.id)}">${esc(a.nome)}${a.user ? ' (@' + esc(a.user) + ')' : ''}</option>`).join('')}</select><button class="btn pri">${UI.ic('swords')}Desafiar</button></form><p class="mut j2-n">Podes ter até 3 duelos ao mesmo tempo. O duelo começa quando o teu amigo aceitar.</p>` : '<p class="mut">Já tens um duelo com todos os teus amigos.</p>')
      : `<p class="mut">Ainda não tens amigos no Prumo. Adiciona-os pelo código em <a class="acc" href="#animes.clas">Clãs e conversas</a> e volta aqui.</p>`}</section>
    ${fim.length ? `<section class="j2-sec"><h3>Últimos duelos</h3><ul class="du-hist">${fim.map(w => `<li class="${w.venc}"><b>${w.venc === 'eu' ? 'Vitória' : w.venc === 'ele' ? 'Derrota' : 'Empate'}</b><span>contra ${esc(w.outro.nome)}</span><em>${w.meu.tot} – ${w.dele.tot}</em></li>`).join('')}</ul></section>` : ''}
    <p class="mut j2-n">Quem ganha leva uma medalha para a vitrine (Eu › Troféus).</p></section>`; };
A.duResp = async b => { const sim = !!b.dataset.sim; try { await call('duelResp', { id: b.dataset.id, sim }); UI.toast(sim ? 'Duelo aceite: boa sorte nos próximos 7 dias.' : 'Feito.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } duCarregar(true); };
OS.forms = OS.forms || {};
OS.forms.duNovo = async (f, v) => { try { const j = await call('duelDesafiar', { amigo: v('amigo') }); UI.toast(`Desafio enviado a ${j.duelo.outro.nome}.`, 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } duCarregar(true); };

/* =================== QUIZ RELÂMPAGO =================== */
const QS = { d: null, at: 0, busy: false, err: '', off: 0, fb: null, tm: 0, ti: -1, env: false };
const qzCarregar = async forcar => { if (!conta() || QS.busy || (!forcar && QS.d && Date.now() - QS.at < 3e4)) return; QS.busy = true; QS.err = '';
  try { const j = await call('quiz', {}); QS.d = j.quiz; QS.off = j.quiz.ts - Date.now(); QS.at = Date.now(); } catch (e) { QS.err = e.message || 'Não deu para abrir o quiz.'; } QS.busy = false; OS.request(); };
const qzAgora = () => Date.now() + QS.off;
// o tempo de cada pergunta acaba sozinho: responde "sem resposta"
const qzTempo = p => { if (QS.ti === p.i) return; QS.ti = p.i; clearTimeout(QS.tm); const rest = Math.max(0, p.seg * 1000 - (qzAgora() - p.at)); QS.tm = setTimeout(() => { if (QS.d && QS.d.pergunta && QS.d.pergunta.i === p.i && !QS.env) responder(p.i, -1); }, rest + 150); };
const responder = async (i, op) => { if (QS.env) return; QS.env = true; const p = QS.d && QS.d.pergunta;
  try { const j = await call('quizResp', { i, opc: op }); const r = j.resp || {}; QS.fb = { p, op, certa: r.certa, ok: r.ok, pts: r.p || 0, tempo: r.tempo };
    if (OS.Snd && OS.Snd.play) try { OS.Snd.play(r.ok ? 'win' : 'tap'); } catch (e) { } OS.request();
    setTimeout(() => { QS.fb = null; QS.d = j.quiz; QS.off = j.quiz.ts - Date.now(); QS.env = false; OS.request(); }, 1300); }
  catch (e) { QS.env = false; UI.toast(e.message, 'neg'); qzCarregar(true); } };
const pergHTML = (p, eu, fb) => { const el = Math.max(0, (qzAgora() - p.at) / 1000);
  return `<section class="qz-q" aria-live="polite"><div class="qz-top"><span>Pergunta <b>${p.i + 1}</b> de ${p.n}</span><b class="qz-pts">${nf((eu || {}).pts)} pts</b></div>
    <div class="qz-bar${fb ? ' parado' : ''}" role="timer" aria-label="15 segundos"><i style="animation-duration:${p.seg}s;animation-delay:-${el.toFixed(2)}s"></i></div>
    ${p.img ? `<img class="qz-img${p.capa ? ' capa' : ''}" src="${esc(p.img)}" alt="${p.capa ? 'Capa do anime, desfocada' : ''}" referrerpolicy="no-referrer">` : ''}
    <h2>${esc(p.t)}</h2><div class="qz-op">${p.op.map((o, k) => { const cls = fb ? (k === fb.certa ? ' certa' : k === fb.op ? ' errada' : ' off') : '';
      return `<button type="button" class="qz-b${cls}" data-act="qzResp" data-i="${p.i}" data-op="${k}" ${fb ? 'disabled' : ''}><i>${'ABCD'[k]}</i><span>${esc(o)}</span></button>`; }).join('')}</div>
    ${fb ? `<p class="qz-fb ${fb.ok ? 'pos' : 'neg'}">${fb.ok ? `Certo! +${fb.pts} pontos` : fb.tempo || fb.op < 0 ? 'Acabou o tempo.' : 'Não era essa.'}</p>` : ''}</section>`; };
const qzPagina = () => { if (!conta()) return semConta('Quiz relâmpago', 'Todos os dias às 13h (hora de almoço), 10 perguntas de anime.'); qzCarregar(false); const q = QS.d;
  if (!q) return `<section class="j2-pg"><p class="an-ld">${QS.err ? esc(QS.err) : '<span class="an-sp"></span>A abrir o quiz…'}</p></section>`;
  const hero = (t, d) => `<div class="j2-hero qz-hero"><div><span class="j2-k">${UI.ic('bolt2')}Quiz relâmpago · todos os dias às 13h</span><h2>${t}</h2><p>${d}</p></div></div>`, regras = `<ul class="qz-reg"><li><b>10 perguntas</b> de anime, iguais para toda a gente</li><li><b>15 segundos</b> por pergunta</li><li>Certa vale 100 pontos e <b>até mais 50</b> pela rapidez</li><li>Às 13h15 sai o ranking: pontos para o ranking de animes e medalhas para os 3 primeiros</li></ul>`;
  if (q.fase === 'espera') return `<section class="j2-pg">${hero('O quiz de hoje começa daqui a <span class="qz-cd" data-ate="' + q.abreAt + '">' + falta(q.abreAt) + '</span>', 'Prepara-te: às 13h de Lisboa abrem as perguntas e tens até às 13h12 para começar.')}${regras}
    ${q.ontem && q.ontem.length ? `<section class="j2-sec"><h3>Os melhores de ontem</h3><ol class="qz-rk">${q.ontem.map((x, i) => `<li><b>${i + 1}.º</b><span>${esc(x.nome)}${x.user ? ` <small>@${esc(x.user)}</small>` : ''}</span><em>${nf(x.pts)}</em></li>`).join('')}</ol></section>` : ''}</section>`;
  if (q.fase === 'aberto') { if (QS.fb) return `<section class="j2-pg qz-pg">${pergHTML(QS.fb.p, q.eu, QS.fb)}</section>`;
    if (q.pergunta) { qzTempo(q.pergunta); return `<section class="j2-pg qz-pg">${pergHTML(q.pergunta, q.eu)}</section>`; }
    if (q.eu && q.eu.fim) { const c = q.eu.r.filter(x => x.ok).length; return `<section class="j2-pg">${hero(`Fizeste ${nf(q.eu.pts)} pontos`, `${c} de ${q.n} certas. O ranking sai às 13h15, daqui a <span data-ate="${q.fechaAt}">${falta(q.fechaAt)}</span>.`)}<div class="qz-res">${q.eu.r.map((x, i) => `<span class="${x.ok ? 'ok' : ''}" title="Pergunta ${i + 1}: ${x.ok ? '+' + x.p : '0'}">${i + 1}</span>`).join('')}</div></section>`; }
    const tarde = qzAgora() >= q.ultimo;
    return `<section class="j2-pg">${hero('O quiz está a decorrer', tarde ? 'Já não dá tempo de começar hoje. Amanhã às 13h há mais.' : `Fecha às 13h15. Podes começar até às 13h12 (daqui a <span data-ate="${q.ultimo}">${falta(q.ultimo)}</span>).`)}${regras}
      ${tarde ? '' : `<button type="button" class="btn pri qz-go" data-act="qzComecar">${UI.ic('bolt2')}Começar o quiz</button>`}</section>`; }
  const meu = q.res && q.pos ? q.res[q.pos - 1] : null;
  return `<section class="j2-pg">${hero('Os resultados de hoje', meu ? `Ficaste em <b>${q.pos}.º</b> de ${q.res.length} com ${nf(meu.pts)} pontos (+${meu.rk} no ranking de animes).` : q.eu ? 'Jogaste, mas não chegaste a pontuar. Amanhã há mais.' : 'Não jogaste hoje. Amanhã às 13h há mais.')}
    ${q.res && q.res.length ? `<ol class="qz-rk">${q.res.map((x, i) => `<li class="${x.eu ? 'eu' : ''}"><b>${i + 1}.º</b>${av(x, 28)}<span>${esc(x.nome)}${x.user ? ` <small>@${esc(x.user)}</small>` : ''}<small>${x.certas} de ${q.n} certas</small></span><em>${nf(x.pts)}</em></li>`).join('')}</ol>` : '<p class="mut">Ninguém jogou hoje.</p>'}
    <p class="mut j2-n">O próximo quiz é amanhã às 13h (hora de Lisboa).</p></section>`; };
A.qzComecar = async b => { b.disabled = true; try { const j = await call('quizComecar', {}); QS.d = j.quiz; QS.off = j.quiz.ts - Date.now(); QS.ti = -1; OS.request(); } catch (e) { UI.toast(e.message, 'neg'); qzCarregar(true); } };
A.qzResp = b => { const p = QS.d && QS.d.pergunta; if (!p || +b.dataset.i !== p.i || QS.fb) return; responder(p.i, +b.dataset.op); };
// quando a contagem chega ao fim (abre ou fecha), lê outra vez
setInterval(() => { const q = QS.d; if (!q || document.hidden) return; const r = OS.route ? OS.route() : {}; if (r.base !== 'animes' || r.sub !== 'quiz') return; const n = qzAgora();
  if ((q.fase === 'espera' && n >= q.abreAt) || (q.fase === 'aberto' && n >= q.fechaAt + 2000 && !QS.fb)) qzCarregar(true); }, 1500);

/* =================== BOLÃO DA TEMPORADA =================== */
const BS = { d: null, at: 0, busy: false, err: '' };
const boCarregar = async forcar => { if (!conta() || BS.busy || (!forcar && BS.d && Date.now() - BS.at < 5 * 6e4)) return; BS.busy = true; BS.err = '';
  try { BS.d = await call('bolao', {}); BS.at = Date.now(); } catch (e) { BS.err = e.message || 'Não deu para abrir o bolão.'; } BS.busy = false; OS.request(); };
const capa = (x, cls = '') => x ? `<img class="bo-cp ${cls}" src="${esc(x.img || '')}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
const tit = (o, id) => ((o.L || []).find(x => x.id === id) || {}).t || '—';
const boAberto = o => { const m = o.meu || {}, L = o.L, d = o.dest || L[0], sel = (n, v) => `<select class="field" name="${n}" aria-label="${n === 'melhor' ? 'O melhor da temporada' : 'O mais popular'}" required><option value="">Escolhe…</option>${L.map(x => `<option value="${x.id}"${x.id === v ? ' selected' : ''}>${esc(x.t)}</option>`).join('')}</select>`;
  return `<article class="bo-c"><div class="bo-h"><div><span class="j2-k">${UI.ic('ticket')}Bolão aberto</span><h3>${esc(o.nome)}</h3><small>${esc(o.meses)} · palpites até ${dataC(o.fecha)} (daqui a ${falta(o.fecha)})</small></div>${m.at ? '<span class="bdg pos">Palpite guardado</span>' : ''}</div>
    <div class="bo-top">${L.slice(0, 8).map(x => `<span title="${esc(x.t)}">${capa(x)}<small>${esc(x.t)}</small></span>`).join('')}</div>
    <form class="bo-f" data-form="boPalpite" data-k="${esc(o.k)}" autocomplete="off">
      <label class="bo-p"><span><b>O melhor da temporada</b><small>A nota mais alta no MyAnimeList quando a temporada acabar. Acertar: ${BS.d.pts.top1} pontos; no top 3: ${BS.d.pts.top3}.</small></span>${sel('melhor', m.melhor)}</label>
      <label class="bo-p"><span><b>O mais popular</b><small>O que terá mais gente a seguir no fim. Acertar: ${BS.d.pts.top1}; no top 3: ${BS.d.pts.top3}.</small></span>${sel('popular', m.popular)}</label>
      <label class="bo-p bo-n">${capa(d, 'sm')}<span><b>A nota final de «${esc(d ? d.t : '')}»</b><small>O mais esperado da temporada. Acertar em cheio: 100 pontos (menos 1 por cada centésima de diferença).</small></span><input class="field" type="number" name="nota" min="1" max="10" step="0.01" value="${m.nota || '8.00'}" aria-label="A nota final que prevês" required></label>
      <button class="btn pri">${m.at ? 'Mudar o palpite' : 'Guardar o palpite'}</button></form></article>`; };
const boEspera = o => { const m = o.meu;
  return `<article class="bo-c esp"><div class="bo-h"><div><span class="j2-k">${UI.ic('hourglass')}Palpites fechados</span><h3>${esc(o.nome)}</h3><small>Os resultados saem a ${dataC(o.res0)}.</small></div></div>
    ${m ? `<ul class="bo-meu"><li><small>O melhor</small><b>${esc(tit(o, m.melhor))}</b></li><li><small>O mais popular</small><b>${esc(tit(o, m.popular))}</b></li><li><small>A nota de ${esc(o.dest ? o.dest.t : '')}</small><b>${Number(m.nota).toFixed(2)}</b></li></ul>` : '<p class="mut">Não fizeste palpite nesta temporada.</p>'}</article>`; };
const boFim = o => { const R = o.res, m = o.meu, pt = m && m.pt;
  return `<article class="bo-c fim"><div class="bo-h"><div><span class="j2-k">${UI.ic('trophy')}Resultados</span><h3>${esc(o.nome)}</h3><small>${R.total} ${R.total === 1 ? 'palpite' : 'palpites'}</small></div>${pt ? `<span class="bo-tot"><b>${pt.tot}</b> pontos</span>` : ''}</div>
    <div class="bo-rs"><div><small>O melhor (nota final)</small><ol>${R.melhor.map(x => `<li${m && x.id === m.melhor ? ' class="eu"' : ''}><span>${esc(x.t)}</span><em>${Number(x.sc).toFixed(2)}</em></li>`).join('')}</ol></div>
      <div><small>O mais popular</small><ol>${R.popular.map(x => `<li${m && x.id === m.popular ? ' class="eu"' : ''}><span>${esc(x.t)}</span><em>${nf(x.m)}</em></li>`).join('')}</ol></div>
      <div><small>A nota de ${esc(o.dest ? o.dest.t : '')}</small><b class="bo-nf">${Number(R.nota || 0).toFixed(2)}</b>${m ? `<small>O teu palpite: ${Number(m.nota).toFixed(2)}</small>` : ''}</div></div>
    ${pt ? `<p class="bo-pt">Melhor: <b>+${pt.melhor}</b> · Popular: <b>+${pt.popular}</b> · Nota: <b>+${pt.nota}</b></p>` : ''}
    ${R.rank.length ? `<ol class="qz-rk">${R.rank.map((x, i) => `<li class="${x.eu ? 'eu' : ''}"><b>${i + 1}.º</b>${av(x, 28)}<span>${esc(x.nome)}${x.user ? ` <small>@${esc(x.user)}</small>` : ''}</span><em>${nf(x.pts)}</em></li>`).join('')}</ol>` : ''}</article>`; };
const boPagina = () => { if (!conta()) return semConta('Bolão da temporada', 'Prevê o melhor e o mais popular de cada temporada de animes.'); boCarregar(false); const d = BS.d;
  if (!d) return `<section class="j2-pg"><p class="an-ld">${BS.err ? esc(BS.err) : '<span class="an-sp"></span>A abrir o bolão…'}</p></section>`;
  const ab = d.boloes.filter(o => o.estado === 'aberto'), es = d.boloes.filter(o => o.estado === 'espera'), fi = d.boloes.filter(o => o.estado === 'fim');
  return `<section class="j2-pg bo-pg"><div class="j2-hero bo-hero"><div><span class="j2-k">${UI.ic('ticket')}Bolão da temporada</span><h2>Quem acerta no futuro dos animes?</h2>
      <p>Antes e no começo de cada temporada, faz o teu palpite: o melhor, o mais popular e a nota do mais esperado. Os palpites fecham 3 semanas depois do começo e os resultados saem uma semana depois do fim. Os pontos vão para o ranking de animes.</p></div></div>
    ${ab.map(boAberto).join('')}${es.map(boEspera).join('')}${fi.map(boFim).join('')}
    ${!d.boloes.length ? '<p class="mut">O próximo bolão abre 45 dias antes da próxima temporada.</p>' : ''}</section>`; };
OS.forms.boPalpite = async (f, v) => { try { const j = await call('bolaoPalpite', { k: f.dataset.k, melhor: v('melhor'), popular: v('popular'), nota: v('nota') }); const i = BS.d.boloes.findIndex(o => o.k === j.bolao.k); if (i >= 0) BS.d.boloes[i] = j.bolao; UI.toast('Palpite guardado. Podes mudá-lo até os palpites fecharem.', 'pos'); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };


/* =================== SOMBRAS (#animes.sombras) =================== */
const SS = { d: null, at: 0, busy: false, err: '', env: false, ult: '' };
const sbCarregar = async forcar => { if (!conta() || SS.busy || (!forcar && SS.d && Date.now() - SS.at < 6e4)) return; SS.busy = true; SS.err = '';
  try { SS.d = (await call('sombra', {})).sombra; SS.at = Date.now(); } catch (e) { SS.err = e.message || 'Não deu para abrir a sombra de hoje.'; } SS.busy = false; OS.request(); };
const NIVN = ['Só a silhueta', 'Os contornos', 'As cores', 'Revelada'];
const sbPagina = () => { if (!conta()) return semConta('Sombras', 'Todos os dias, a silhueta de uma personagem de anime.'); sbCarregar(false); const s = SS.d;
  if (!s) return `<section class="j2-pg"><p class="an-ld">${SS.err ? esc(SS.err) : '<span class="an-sp"></span>A abrir a sombra de hoje…'}</p></section>`;
  const resto = s.max - s.tent.length;
  return `<section class="j2-pg sb-pg"><div class="j2-hero sb-hero"><div><span class="j2-k">${UI.ic('eye')}Sombras · uma por dia</span><h2>${s.fim ? (s.ok ? 'Acertaste!' : 'Não foi desta') : 'Quem é esta personagem?'}</h2>
      <p>${s.fim ? (s.ok ? `Era <b>${esc(s.resp.nome)}</b>, de ${esc(s.resp.anime)}. Ganhaste <b>${s.pts} pontos</b> no ranking de animes.` : `Era <b>${esc(s.resp.nome)}</b>, de ${esc(s.resp.anime)}.`) : `Tens ${resto} ${resto === 1 ? 'tentativa' : 'tentativas'}. Cada erro mostra mais um pouco e dá uma dica. Acertar à primeira vale 60 pontos, à segunda 40 e à terceira 20.`}</p></div>
      <div class="j2-hk"><span><b>${s.seq}</b> ${s.seq === 1 ? 'dia seguido' : 'dias seguidos'}</span></div></div>
    <div class="sb-jogo"><figure class="sb-fig n${s.nivel}"><img src="${s.img}" alt="${s.fim ? esc(s.resp.nome) : 'A silhueta da personagem de hoje'}" width="300" height="420"><figcaption>${NIVN[s.nivel]}</figcaption></figure>
      <div class="sb-lado"><ol class="sb-tent">${Array.from({ length: s.max }, (_, i) => { const t = s.tent[i]; return `<li class="${t == null ? '' : (s.ok && i === s.tent.length - 1 ? 'ok' : 'no')}">${t == null ? `<span>Tentativa ${i + 1}</span>` : `<span>${esc(t)}</span><b>${s.ok && i === s.tent.length - 1 ? 'Certo' : 'Não'}</b>`}</li>`; }).join('')}</ol>
        ${s.dica1 || s.dica2 ? `<ul class="sb-dicas">${s.dica1 ? `<li>${UI.ic('info')}${esc(s.dica1)}</li>` : ''}${s.dica2 ? `<li>${UI.ic('tv')}Do anime <b>${esc(s.dica2)}</b></li>` : ''}</ul>` : ''}
        ${s.fim ? `<div class="sb-fim">${s.stats ? `<p>Hoje jogaram <b>${s.stats.jog}</b>: ${s.stats.ok[0]} à primeira, ${s.stats.ok[1]} à segunda, ${s.stats.ok[2]} à terceira e ${s.stats.falhou} não acertaram.</p>` : ''}<p class="mut">A próxima sombra sai à meia-noite de Lisboa, daqui a <span data-ate="${s.amanha}">${falta(s.amanha)}</span>.</p></div>`
          : `<form class="sb-f" data-form="sbPalpite" autocomplete="off"><input class="field grow" name="nome" list="sbNomes" maxlength="60" placeholder="Nome da personagem" aria-label="Nome da personagem" required autofocus><datalist id="sbNomes">${s.nomes.map(n => `<option value="${esc(n)}">`).join('')}</datalist><button class="btn pri">Adivinhar</button></form>
            <p class="mut j2-n">Vale o nome completo, o primeiro ou o último nome, e pequenos erros de escrita.</p>`}</div></div></section>`; };
OS.forms.sbPalpite = async (f, v) => { if (SS.env) return; SS.env = true; const n = v('nome'); try { const j = await call('sombraPalpite', { nome: n }); SS.d = j.sombra; SS.at = Date.now();
    if (j.certo) { UI.toast('Acertaste: era ' + j.sombra.resp.nome + '!', 'pos'); if (OS.Vivo && OS.Vivo.confetti) try { OS.Vivo.confetti(); } catch (e) { } } else if (j.sombra.fim) UI.toast('Não foi desta: era ' + j.sombra.resp.nome + '.', 'neg'); else UI.toast('Não é. Vê a sombra outra vez e a dica.', 'warn'); }
  catch (e) { UI.toast(e.message, 'neg'); } SS.env = false; OS.request(); };

/* =================== SEQUÊNCIA A DOIS (#jogos.sequencia) =================== */
const QQ = { d: null, at: 0, busy: false, err: '', env: {} };
// o dia cumprido de cada um: pelo menos metade dos hábitos desse dia (mínimo 1); sem hábitos nesse dia, 1 treino, 1 tarefa feita ou 25 min de foco
const diaCumprido = d => { let hs = []; try { hs = OS.all('habits').filter(h => h.active && OS.Hab && OS.Hab.due(h, d) && h.freq !== 'X por semana'); } catch (e) { }
  if (hs.length) { const f = hs.filter(h => OS.Hab.done(h, d)).length; return f >= Math.max(1, Math.ceil(hs.length / 2)); }
  const p = pontosDia(d).det; return p.t > 0 || p.k > 0 || p.f > 0; };
const sqCarregar = async forcar => { if (!conta() || QQ.busy || (!forcar && QQ.d && Date.now() - QQ.at < 6e4)) return; QQ.busy = true; QQ.err = '';
  try { QQ.d = await call('seqs', {}); QQ.at = Date.now(); sqEnviar(); } catch (e) { QQ.err = e.message || 'Não deu para abrir as sequências.'; } QQ.busy = false; OS.request(); };
const sqEnviar = async () => { for (const w of ((QQ.d || {}).seqs || []).filter(x => x.estado === 'ativa')) { const v = {}, dd = w.dias.slice(-3); let mais = false;
    dd.forEach(x => { if (diaCumprido(x.d)) { v[x.d] = 1; if (!x.eu) mais = true; } }); const j = JSON.stringify(v), e = QQ.env[w.id] || {}; if (!mais || (e.j === j && Date.now() - e.at < 6e4)) continue; QQ.env[w.id] = { j, at: Date.now() };
    try { const r = await call('seqProg', { id: w.id, v }); const i = QQ.d.seqs.findIndex(x => x.id === w.id); if (i >= 0) QQ.d.seqs[i] = r.seq; OS.request(); } catch (er) { } } };
OS.on('change', c => { if (QQ.d && ['habits', 'workouts', 'runs', 'tasks', 'sessions'].includes(c)) setTimeout(sqEnviar, 1600); });
const sqCard = w => { const n = w.cur;
  return `<article class="sq-c${n ? ' viva' : ''}"><div class="sq-chama" aria-label="${n} ${n === 1 ? 'dia' : 'dias'} seguidos"><span class="sq-fl" aria-hidden="true"></span><b>${n}</b><small>${n === 1 ? 'dia' : 'dias'}</small></div>
    <div class="sq-mid"><div class="sq-par">${av(eu(), 32)}<span>Tu</span><i aria-hidden="true">+</i>${av(w.outro, 32)}<span>${esc(w.outro.nome)}</span></div>
      <div class="sq-hoje"><span class="${w.eu ? 'ok' : ''}">${UI.ic(w.eu ? 'check' : 'clock')}Tu: ${w.eu ? 'cumprido' : 'ainda falta'}</span><span class="${w.ele ? 'ok' : ''}">${UI.ic(w.ele ? 'check' : 'clock')}${esc(w.outro.nome)}: ${w.ele ? 'cumprido' : 'ainda falta'}</span></div>
      <div class="sq-dias" aria-label="Os últimos dias">${w.dias.map(x => `<i class="${x.eu && x.ele ? 'f' : x.eu || x.ele ? 'm' : ''}${x.d === w.hoje ? ' h' : ''}" title="${esc(x.d)}${x.eu && x.ele ? ': os dois cumpriram' : x.eu ? ': só tu' : x.ele ? ': só ' + esc(w.outro.nome) : ''}"></i>`).join('')}</div>
      <small class="mut">Recorde: ${w.melhor} ${w.melhor === 1 ? 'dia' : 'dias'}${n === 0 && w.dias.length > 1 ? ' · a sequência recomeçou' : ''}</small></div>
    <button type="button" class="btn sm ghost sq-x" data-act="sqTerminar" data-id="${esc(w.id)}" aria-label="Terminar a sequência com ${esc(w.outro.nome)}">Terminar</button></article>`; };
const sqPagina = () => { if (!conta()) return semConta('Sequência a dois', 'Mantém uma sequência de dias com um amigo.'); sqCarregar(false); const d = QQ.d;
  const topo = UI.head('Sequência a dois', 'Uma sequência partilhada: o dia só conta quando os dois cumprem.', '', 'Jogos');
  if (!d) return topo + `<section class="j2-pg"><p class="mut">${QQ.err ? esc(QQ.err) : 'A abrir as sequências…'}</p></section>`;
  const at = d.seqs.filter(w => w.estado === 'ativa'), conv = d.seqs.filter(w => w.estado === 'convite' && !w.por), env = d.seqs.filter(w => w.estado === 'convite' && w.por), livres = d.amigos.filter(a => !d.seqs.some(w => w.outro.id === a.id));
  return topo + `<section class="j2-pg sq-pg"><div class="j2-hero sq-hero"><div><span class="j2-k">${UI.ic('flame')}Sequência a dois</span><h2>${at.length ? 'As tuas sequências' : 'Começa uma sequência com um amigo'}</h2>
      <p>Todos os dias, cada um cumpre o seu dia: <b>pelo menos metade dos hábitos desse dia</b> (no mínimo 1). Num dia sem hábitos marcados, basta 1 treino, 1 tarefa feita ou 25 minutos de foco. Se um dos dois falhar, a sequência recomeça para os dois. Medalhas aos 7, 30, 100 e 365 dias.</p></div></div>
    ${conv.map(w => `<div class="du-conv">${av(w.outro, 36)}<p><b>${esc(w.outro.nome)}</b> quer começar uma sequência contigo.</p><div class="row gap6"><button type="button" class="btn sm pri" data-act="sqResp" data-id="${esc(w.id)}" data-sim="1">Aceitar</button><button type="button" class="btn sm ghost" data-act="sqResp" data-id="${esc(w.id)}">Recusar</button></div></div>`).join('')}
    ${at.map(sqCard).join('')}
    ${env.map(w => `<div class="du-conv esp">${av(w.outro, 36)}<p>Convidaste <b>${esc(w.outro.nome)}</b>. Falta a resposta (o convite dura 3 dias).</p><button type="button" class="btn sm ghost" data-act="sqResp" data-id="${esc(w.id)}">Cancelar</button></div>`).join('')}
    <section class="j2-sec"><h3>Nova sequência</h3>${d.amigos.length ? (livres.length ? `<form class="du-novo" data-form="sqNova" autocomplete="off"><select class="field grow" name="amigo" aria-label="Escolhe o amigo" required>${livres.map(a => `<option value="${esc(a.id)}">${esc(a.nome)}${a.user ? ' (@' + esc(a.user) + ')' : ''}</option>`).join('')}</select><button class="btn pri">${UI.ic('flame')}Convidar</button></form><p class="mut j2-n">Até 3 sequências ao mesmo tempo. O teu amigo só vê se cumpriste o dia, nunca os teus hábitos.</p>` : '<p class="mut">Já tens uma sequência com todos os teus amigos.</p>')
      : `<p class="mut">Ainda não tens amigos no Prumo. Adiciona-os pelo código em <a class="acc" href="#animes.clas">Clãs e conversas</a>.</p>`}</section></section>`; };
A.sqResp = async b => { const sim = !!b.dataset.sim; try { await call('seqResp', { id: b.dataset.id, sim }); UI.toast(sim ? 'Sequência começada: cumpram os dois o dia de hoje.' : 'Feito.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } sqCarregar(true); };
A.sqTerminar = b => UI.ask('Terminar esta sequência?', 'A sequência acaba para os dois e não pode ser retomada. As medalhas ganhas ficam.', 'Terminar', async () => { try { await call('seqTerminar', { id: b.dataset.id }); UI.toast('Sequência terminada.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } sqCarregar(true); });
OS.forms.sqNova = async (f, v) => { try { const j = await call('seqConvidar', { amigo: v('amigo') }); UI.toast(`Convite enviado a ${j.seq.outro.nome}.`, 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } sqCarregar(true); };
OS.Sombras = { pagina: sbPagina, carregar: sbCarregar, _S: SS };
OS.Sequencia = { pagina: sqPagina, carregar: sqCarregar, diaCumprido, _S: QQ };

/* =================== a tela de Jogos: os 3 jogos novos e a página do Duelo =================== */
const tiles = () => { const q = QS.d, b = BS.d; if (conta()) { qzCarregar(false); boCarregar(false); duCarregar(false); sbCarregar(false); sqCarregar(false); }
  const qt = !q ? 'Todos os dias às 13h' : q.fase === 'espera' ? 'Começa daqui a ' + falta(q.abreAt) : q.fase === 'aberto' ? (q.eu ? (q.eu.fim ? 'Jogaste hoje: ' + nf(q.eu.pts) + ' pts' : 'A meio do quiz') : 'A decorrer agora') : 'Resultados de hoje';
  const ab = b && b.boloes.find(o => o.estado === 'aberto'), du = DS.d && DS.d.duelos.filter(w => w.estado === 'ativa').length;
  return `<a class="jg-t j2-t du" href="#jogos.duelo"><span class="jg-ic">${UI.ic('swords')}</span><b>Duelo de hábitos</b><p>7 dias contra um amigo: ganha quem cumprir mais hábitos, treinos e tarefas.</p><small>${du ? du + (du === 1 ? ' duelo a decorrer' : ' duelos a decorrer') : 'Desafia um amigo'}</small></a>
    <a class="jg-t j2-t qz${q && q.fase === 'aberto' ? ' on' : ''}" href="#animes.quiz"><span class="jg-ic">${UI.ic('bolt2')}</span><b>Quiz relâmpago</b><p>10 perguntas de anime às 13h, iguais para todos. Quanto mais rápido, mais pontos.</p><small>${esc(qt)}</small></a>
    <a class="jg-t j2-t sb" href="#animes.sombras"><span class="jg-ic">${UI.ic('eye')}</span><b>Sombras</b><p>A silhueta de uma personagem de anime por dia. 3 tentativas para dizer quem é.</p><small>${SS.d ? (SS.d.fim ? (SS.d.ok ? 'Acertaste hoje' : 'Amanhã há outra') : 'A de hoje está à espera') : 'Uma por dia'}</small></a>
    <a class="jg-t j2-t sq" href="#jogos.sequencia"><span class="jg-ic">${UI.ic('flame')}</span><b>Sequência a dois</b><p>Uma sequência com um amigo: o dia só conta quando os dois cumprem.</p><small>${QQ.d && QQ.d.seqs.some(w => w.estado === 'ativa') ? 'Maior sequência: ' + Math.max(...QQ.d.seqs.filter(w => w.estado === 'ativa').map(w => w.cur)) + ' dias' : 'Convida um amigo'}</small></a>
    <a class="jg-t j2-t bo" href="#animes.bolao"><span class="jg-ic">${UI.ic('ticket')}</span><b>Bolão da temporada</b><p>Prevê o melhor e o mais popular da temporada de animes.</p><small>${ab ? 'Palpites até ' + dataC(ab.fecha) : 'Ver os bolões'}</small></a>`; };
const liga = () => { const j = OS.views.jogos; if (!j || j._j2) return; const f = sub => { if (sub === 'duelo') return duPagina(); if (sub === 'sequencia') return sqPagina(); const h = j(sub), k = '<div class="jg-g">', i = h.indexOf(k); return i < 0 ? h : h.slice(0, i + k.length) + tiles() + h.slice(i + k.length); }; f._j2 = 1; f._ds = j._ds; OS.views.jogos = f; };
// liga-se depois dos outros (o Desafio da semana também acrescenta o seu cartão à tela de Jogos): a página do Duelo fica só com o duelo
OS.on('ready', () => setTimeout(liga, 0));
OS.Duelo = { pagina: duPagina, pontosDia, carregar: duCarregar, _S: DS };
OS.Quiz = { pagina: qzPagina, carregar: qzCarregar, _S: QS };
OS.Bolao = { pagina: boPagina, carregar: boCarregar, _S: BS };
})();
