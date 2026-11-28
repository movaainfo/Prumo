/* PRUMO — mais jogos (v4.01): Quiz de finanças semanal, Raspadinha do mundo, Bingo da semana e Temporada de clãs.
   · Quiz de finanças (#jogos.fquiz): 10 perguntas por semana, iguais para todos, 25 segundos cada, com a explicação depois de cada uma.
   · Raspadinha do mundo (#jogos.raspa): todos os dias 9 países escondidos; raspar uma casa é acertar na capital, no continente ou na bandeira.
   · Bingo da semana (#jogos.bingo): 9 tarefas de várias áreas, verificadas com os teus registos; cada linha dá Selos.
   · Temporada de clãs (#jogos.temporada): cada mês um tema; o que fazes nesse tema soma pontos para o teu clã. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act;
if (!UI.IP.moon) UI.IP.moon = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z';
if (!UI.IP.phone) UI.IP.phone = 'M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5zM10.5 18.5h3';
if (!UI.IP.swords) UI.IP.swords = 'M5 4l10 10M5 4h3.5M5 4v3.5M19 4L9 14M19 4h-3.5M19 4v3.5M7 13l4 4M13 17l4-4';
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token() && OS.Acc.pid && OS.Acc.pid());
const call = (op, b) => OS.Social && OS.Social.call ? OS.Social.call(op, b) : Promise.reject(new Error('Sem ligação.'));
const nf = n => Number(n || 0).toLocaleString('pt-PT');
const falta = t => { const m = Math.max(0, Math.round((t - Date.now()) / 6e4)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + ' h' : '') : h ? h + ' h' + (m % 60 ? ' e ' + (m % 60) + ' min' : '') : m + ' min'; };
const semConta = (t, d) => `<section class="j3-pg"><div class="j3-vz"><b>${t}</b><p>${d} Entra na tua conta do Prumo para jogar.</p></div></section>`;
const voltar = `<a class="btn sm ghost j3-back" href="#jogos">${UI.ic('left')}Jogos</a>`;
const av = (o, n) => OS.AnimeSoc && OS.AnimeSoc.av ? OS.AnimeSoc.av(o, n) : '';
const toastSelos = n => { if (n > 0) UI.toast('+' + n + ' Selos', 'pos'); };

/* ===================== QUIZ DE FINANÇAS ===================== */
const FQ = { d: null, at: 0, busy: false, err: '', fb: null, skew: 0, T: 0 };
const fqLoad = async forcar => { if (!conta() || FQ.busy || (!forcar && FQ.d && Date.now() - FQ.at < 30e3)) return; FQ.busy = true;
  try { const j = await call('fquiz', {}); fqSet(j.fquiz); FQ.err = ''; } catch (e) { FQ.err = e.message || 'Não deu para abrir o quiz.'; } FQ.busy = false; OS.request(); };
const fqSet = q => { FQ.d = q; FQ.at = Date.now(); FQ.skew = (q && q.ts ? q.ts - Date.now() : 0); fqTimer(); };
const fqLeft = () => { const p = FQ.d && FQ.d.pergunta; if (!p || !p.at) return 0; return Math.max(0, p.at + p.seg * 1000 - (Date.now() + FQ.skew)); };
const fqTimer = () => { clearInterval(FQ.T); const p = FQ.d && FQ.d.pergunta; if (!p || !p.at || FQ.fb) return;
  FQ.T = setInterval(() => { const l = fqLeft(), el = document.getElementById('fqT'), bar = document.getElementById('fqBar'); if (el) el.textContent = Math.ceil(l / 1000) + ' s'; if (bar) bar.style.width = (l / (p.seg * 1000) * 100).toFixed(1) + '%';
    if (l <= 0) { clearInterval(FQ.T); A.fqResp({ dataset: { o: '-1' } }); } }, 250); };
A.fqComecar = async b => { b.disabled = true; try { const j = await call('fquizComecar', {}); FQ.fb = null; fqSet(j.fquiz); } catch (e) { UI.toast(e.message, 'neg'); fqLoad(true); } OS.request(); };
A.fqResp = async b => { const p = FQ.d && FQ.d.pergunta; if (!p || FQ.busy || FQ.fb) return; FQ.busy = true; clearInterval(FQ.T); const o = +b.dataset.o;
  try { const j = await call('fquizResp', { i: p.i, opc: o }); FQ.fb = Object.assign({ o, p }, j.resp || {}); FQ.d = j.fquiz; FQ.at = Date.now(); if (j.fquiz && j.fquiz.eu && j.fquiz.eu.fim && OS.Selos) OS.Selos.carregar && OS.Selos.carregar(true); }
  catch (e) { UI.toast(e.message, 'neg'); } FQ.busy = false; OS.request(); };
A.fqProx = async () => { if (FQ.busy) return; FQ.busy = true; try { const j = await call('fquizProx', {}); FQ.fb = null; fqSet(j.fquiz); } catch (e) { UI.toast(e.message, 'neg'); } FQ.busy = false; OS.request(); };
A.fqFim = () => { FQ.fb = null; OS.request(); };
const fqRank = q => q.res && q.res.length ? `<section class="j3-sec"><h3>Ranking da semana</h3><ol class="j3-rk">${q.res.map((x, i) => `<li class="${x.eu ? 'eu' : ''}"><b>${i + 1}.º</b>${av(x, 26)}<span>${esc(x.nome)}${x.user ? ` <small>@${esc(x.user)}</small>` : ''}</span><em>${nf(x.pts)} · ${x.certas}/10</em></li>`).join('')}</ol>${q.pos > 30 ? `<p class="mut">Estás em ${q.pos}.º de ${q.total}.</p>` : ''}</section>` : '';
const fqPagina = () => { if (!conta()) return semConta('Quiz de finanças', '10 perguntas de dinheiro por semana.'); fqLoad(false); const q = FQ.d;
  const hero = (t, d) => `${voltar}<div class="j3-hero fq"><div><span class="j3-k">${UI.ic('wallet')}Quiz de finanças · semanal</span><h2>${t}</h2><p>${d}</p></div></div>`;
  if (!q) return `<section class="j3-pg">${hero('A abrir o quiz…', '')}${FQ.err ? `<p class="neg">${esc(FQ.err)}</p>` : ''}</section>`;
  const ant = q.ant && q.ant.length ? `<p class="mut j3-n">Semana passada: ${q.ant.map((x, i) => `${i + 1}.º ${esc(x.nome)} (${nf(x.pts)})`).join(' · ')}</p>` : '';
  if (FQ.fb) { const f = FQ.fb, p = f.p; return `<section class="j3-pg">${hero(f.ok ? 'Certo!' : f.tempo ? 'Acabou o tempo' : 'Não é essa', f.ok ? '+' + f.p + ' pontos' : 'A certa está assinalada.')}
      <div class="j3-q"><p class="j3-qt">${esc(p.t)}</p><div class="j3-op">${p.op.map((x, k) => `<button type="button" class="j3-o ${k === f.certa ? 'ok' : k === f.o ? 'no' : ''}" disabled>${esc(x)}</button>`).join('')}</div>
      ${f.e ? `<div class="j3-exp"><b>Porquê</b><p>${esc(f.e)}</p></div>` : ''}<div class="row gap8">${q.eu && q.eu.fim ? `<button type="button" class="btn pri" data-act="fqFim">Ver o resultado</button>` : `<button type="button" class="btn pri" data-act="fqProx">Pergunta seguinte</button>`}</div></div></section>`; }
  if (!q.eu) return `<section class="j3-pg">${hero('O quiz desta semana está aberto', `Fecha daqui a ${falta(q.fim)}. 10 perguntas sobre dinheiro, poupança, crédito e investimentos.`)}
      <ul class="j3-reg"><li>25 segundos por pergunta; quanto mais rápido, mais pontos.</li><li>Uma só tentativa por semana.</li><li>Depois de cada resposta vês a explicação: é para aprender.</li><li>Terminar dá Selos (o dobro com 8 certas ou mais); os 3 primeiros ganham medalhas.</li></ul>
      <button type="button" class="btn pri" data-act="fqComecar">${UI.ic('play')}Começar</button>${fqRank(q)}${ant}</section>`;
  if (q.pergunta) { const p = q.pergunta; if (p.esp) return `<section class="j3-pg">${hero('Pergunta ' + (p.i + 1) + ' de ' + p.n, 'Quando estiveres pronto.')}<button type="button" class="btn pri" data-act="fqProx">Mostrar a pergunta</button></section>`;
    setTimeout(fqTimer, 0); return `<section class="j3-pg">${hero('Pergunta ' + (p.i + 1) + ' de ' + p.n, nf(q.eu.pts) + ' pontos até agora')}
      <div class="j3-q"><div class="j3-tm"><i id="fqBar" style="width:${(fqLeft() / (p.seg * 1000) * 100).toFixed(1)}%"></i><span id="fqT">${Math.ceil(fqLeft() / 1000)} s</span></div><p class="j3-qt">${esc(p.t)}</p>
      <div class="j3-op">${p.op.map((x, k) => `<button type="button" class="j3-o" data-act="fqResp" data-o="${k}">${esc(x)}</button>`).join('')}</div></div></section>`; }
  const c = (q.eu.r || []).filter(x => x.ok).length;
  return `<section class="j3-pg">${hero(`Fizeste ${nf(q.eu.pts)} pontos`, `${c} de ${q.n} certas.${q.pos ? ' Estás em ' + q.pos + '.º de ' + q.total + '.' : ''} O próximo quiz abre na segunda-feira.`)}<div class="j3-dots">${(q.eu.r || []).map(x => `<i class="${x.ok ? 'ok' : 'no'}"></i>`).join('')}</div>${fqRank(q)}${ant}</section>`; };

/* ===================== RASPADINHA DO MUNDO ===================== */
const RP = { d: null, at: 0, busy: false, err: '', aberta: null };
const rpLoad = async forcar => { if (!conta() || RP.busy || (!forcar && RP.d && Date.now() - RP.at < 60e3 && RP.d.d === U.today())) return; RP.busy = true;
  try { const j = await call('raspa', {}); RP.d = j.raspa; RP.at = Date.now(); RP.err = ''; } catch (e) { RP.err = e.message || 'Não deu para abrir a raspadinha.'; } RP.busy = false; OS.request(); };
const LIN = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
A.rpAbrir = b => { RP.aberta = +b.dataset.i; OS.request(); setTimeout(() => { const q = document.querySelector('#view .j3-rq'); if (q) q.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 50); };
A.rpFechar = () => { RP.aberta = null; OS.request(); };
A.rpResp = async b => { if (RP.busy || RP.aberta == null) return; RP.busy = true; const i = RP.aberta;
  try { const j = await call('raspaResp', { i, opc: +b.dataset.o }); RP.d = j.raspa; RP.at = Date.now(); RP.aberta = null; UI.toast(j.ok ? 'Descobriste ' + ((RP.d.cells[i] || {}).n || 'o país') + '!' : 'Era ' + ((RP.d.cells[i] || {}).certa || '') + '. Esta casa ficou queimada.', j.ok ? 'pos' : 'warn');
    if (j.novas) toastSelos(j.novas * 3); try { const L = U.ls.get('oc_rp_dias', []); if (!L.includes(U.today())) U.ls.set('oc_rp_dias', L.concat(U.today()).slice(-30)); } catch (e) { } }
  catch (e) { UI.toast(e.message, 'neg'); rpLoad(true); } RP.busy = false; OS.request(); };
const flag = c2 => `<img class="j3-fl" src="https://flagcdn.com/w160/${esc(String(c2 || '').toLowerCase())}.png" alt="" loading="lazy" referrerpolicy="no-referrer">`;
const rpPagina = () => { if (!conta()) return semConta('Raspadinha do mundo', 'Todos os dias 9 países escondidos.'); rpLoad(false); const r = RP.d;
  const hero = `${voltar}<div class="j3-hero rp"><div><span class="j3-k">${UI.ic('globe')}Raspadinha do mundo · diária</span><h2>${r ? r.certas + ' de 9 países descobertos' : 'A preparar o cartão…'}</h2><p>Toca numa casa para a raspar: acerta na capital, no continente ou na bandeira. Cada linha de 3 países dá ${3} Selos; o cartão todo, mais 10.</p></div></div>`;
  if (!r) return `<section class="j3-pg">${hero}${RP.err ? `<p class="neg">${esc(RP.err)}</p>` : ''}</section>`;
  const emL = new Set([].concat(...r.linhas.map(k => LIN[k]))), cur = RP.aberta != null ? r.cells[RP.aberta] : null;
  return `<section class="j3-pg">${hero}<div class="j3-rpw"><div class="j3-rp">${r.cells.map(c => c.st ? `<div class="j3-rc ${c.st}${emL.has(c.i) ? ' lin' : ''}">${c.st === 'ok' ? flag(c.c2) : `<span class="j3-x">${UI.ic('x')}</span>`}<b>${esc(c.n || '')}</b><small>${esc(c.st === 'ok' ? (c.cap || '') + ' · ' + (c.ct || '') : 'era: ' + (c.certa || ''))}</small></div>`
      : `<button type="button" class="j3-rc fechada${RP.aberta === c.i ? ' sel' : ''}" data-act="rpAbrir" data-i="${c.i}" aria-label="Raspar a casa ${c.i + 1}"><span>?</span><small>Raspar</small></button>`).join('')}</div>
    ${cur ? `<div class="j3-rq"><p class="j3-qt">${esc(cur.t)}</p>${cur.img ? `<img class="j3-rqf" src="${esc(cur.img)}" alt="Bandeira" referrerpolicy="no-referrer">` : ''}<div class="j3-op">${cur.op.map((x, k) => `<button type="button" class="j3-o" data-act="rpResp" data-o="${k}">${esc(x)}</button>`).join('')}</div><button type="button" class="btn sm ghost" data-act="rpFechar">Escolher outra casa</button></div>`
      : `<div class="j3-rs"><span><b>${r.linhas.length}</b> ${r.linhas.length === 1 ? 'linha' : 'linhas'}</span><span><b>${r.abertas}</b> de 9 raspadas</span>${r.abertas >= 9 ? '<p class="mut">O cartão de hoje acabou. Amanhã há outro.</p>' : ''}</div>`}</div></section>`; };

/* ===================== BINGO DA SEMANA ===================== */
// a semana como no servidor (segunda a domingo, número ISO)
const semK = () => { const t = new Date(U.today() + 'T12:00:00Z'), dow = (t.getUTCDay() + 6) % 7, seg = new Date(t - dow * 864e5), th = new Date(seg.getTime() + 3 * 864e5), y0 = th.getUTCFullYear();
  const w = 1 + Math.round((th - Date.UTC(y0, 0, 4)) / 864e5 / 7 - ((new Date(Date.UTC(y0, 0, 4)).getUTCDay() + 6) % 7 - 3) / 7); const dias = Array.from({ length: 7 }, (_, i) => new Date(seg.getTime() + i * 864e5).toISOString().slice(0, 10));
  return { k: y0 + '-S' + String(w).padStart(2, '0'), dias, ini: dias[0], fim: dias[6] }; };
const all = c => { try { return OS.all(c) || []; } catch (e) { return []; } };
const nos = (L, S, f = 'date') => L.filter(x => x && x[f] && String(x[f]).slice(0, 10) >= S.ini && String(x[f]).slice(0, 10) <= S.fim);
const diasCom = (L, S, f = 'date') => new Set(nos(L, S, f).map(x => String(x[f]).slice(0, 10))).size;
const habFeitos = S => { let n = 0; try { const H = all('habits').filter(x => x.active); S.dias.filter(d => d <= U.today()).forEach(d => { n += H.filter(x => OS.Hab && OS.Hab.done(x, d)).length; }); } catch (e) { } return n; };
const tem = c => all(c).length > 0;
const BPOOL = [
  { k: 'treino', t: 'Fazer 2 treinos', ic: 'dumbbell', meta: 2, v: S => nos(all('workouts'), S).length + nos(all('runs'), S).length },
  { k: 'corrida', t: 'Correr 5 km na semana', ic: 'run', meta: 5, v: S => U.sum(nos(all('runs'), S), r => +r.km || 0), ok: () => tem('runs') },
  { k: 'estudo', t: 'Estudar 3 horas', ic: 'book', meta: 180, un: 'min', v: S => U.sum(nos(all('sessions'), S), x => +x.minutes || 0) },
  { k: 'tarefas', t: 'Concluir 10 tarefas', ic: 'check', meta: 10, v: S => all('tasks').filter(x => x.doneAt && x.doneAt >= S.ini && x.doneAt <= S.fim).length },
  { k: 'tarefasDia', t: 'Concluir 3 tarefas no mesmo dia', ic: 'zap', meta: 1, v: S => S.dias.filter(d => all('tasks').filter(x => x.doneAt === d).length >= 3).length },
  { k: 'habitos', t: 'Cumprir 10 hábitos', ic: 'repeat', meta: 10, v: habFeitos, ok: () => tem('habits') },
  { k: 'gastos', t: 'Registar gastos em 5 dias', ic: 'wallet', meta: 5, v: S => diasCom(all('transactions'), S) },
  { k: 'foco', t: 'Fazer 4 sessões de foco ou estudo', ic: 'clock', meta: 4, v: S => nos(all('sessions'), S).length + nos(all('trees').filter(x => x.alive !== false), S).length },
  { k: 'sono', t: 'Registar o sono 5 noites', ic: 'moon', meta: 5, v: S => diasCom(all('sleep'), S), ok: () => tem('sleep') },
  { k: 'refeicoes', t: 'Registar refeições em 4 dias', ic: 'apple', meta: 4, v: S => diasCom(all('meals'), S), ok: () => tem('meals') },
  { k: 'ecra', t: 'Ficar dentro da meta de ecrã 3 dias', ic: 'phone', meta: 3, v: S => { const E = OS.one('ecra') || {}, m = +E.meta || 180; return (E.L || []).filter(x => x.d >= S.ini && x.d <= S.fim && +x.min <= m).length; }, ok: () => ((OS.one('ecra') || {}).L || []).length > 0 },
  { k: 'fquiz', t: 'Fazer o Quiz de finanças da semana', ic: 'wallet', meta: 1, v: () => FQ.d && FQ.d.eu && FQ.d.eu.fim ? 1 : 0 },
  { k: 'raspa', t: 'Jogar a Raspadinha 3 dias', ic: 'globe', meta: 3, v: S => (U.ls.get('oc_rp_dias', []) || []).filter(d => d >= S.ini && d <= S.fim).length },
  { k: 'abrir', t: 'Abrir o Prumo 5 dias', ic: 'sun', meta: 5, v: S => (U.ls.get('oc_bg_dias', []) || []).filter(d => d >= S.ini && d <= S.fim).length },
  { k: 'aporte', t: 'Fazer um aporte nos investimentos', ic: 'trend', meta: 1, v: S => nos(all('invtx'), S).filter(x => /compra|buy|aporte/i.test(x.type || x.kind || 'compra')).length, ok: () => tem('assets') },
  { k: 'leitura', t: 'Avançar num livro (atualizar a página)', ic: 'book', meta: 1, v: S => all('books').filter(b => b._u && new Date(b._u).toISOString().slice(0, 10) >= S.ini && (b.status === 'A ler' || b.status === 'Lido')).length, ok: () => tem('books') }];
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const cartao = S => { const disp = BPOOL.filter(x => !x.ok || x.ok()), sem = hash(S.k + '|' + ((OS.Acc && OS.Acc.pid && OS.Acc.pid()) || 'eu')); let r = sem || 1; const rnd = () => { r ^= r << 13; r >>>= 0; r ^= r >> 17; r ^= r << 5; r >>>= 0; return r / 4294967296; };
  const a = disp.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 9); };
const bgEstado = () => { const S = semK(), C = cartao(S), cel = C.map(x => { let v = 0; try { v = +x.v(S) || 0; } catch (e) { } return { x, v, ok: v >= x.meta }; }), ok = cel.map(c => c.ok), linhas = LIN.map((L, i) => L.every(k => ok[k]) ? i : -1).filter(i => i >= 0);
  return { S, cel, linhas, cheio: linhas.length === 8 }; };
let BGT = 0;
const bgEnviar = () => { clearTimeout(BGT); BGT = setTimeout(async () => { if (!conta()) return; const e = bgEstado(); if (!e.linhas.length) return; const key = 'oc_bg_env_' + e.S.k, ja = U.ls.get(key, []) || [];
  const novas = e.linhas.filter(x => !ja.includes(x)); if (!novas.length && !(e.cheio && !ja.includes('cheio'))) return;
  try { const j = await call('bingo', { k: e.S.k, linhas: e.linhas, cheio: e.cheio }); U.ls.set(key, e.linhas.concat(e.cheio ? ['cheio'] : [])); toastSelos(j.selos); if (novas.length) UI.toast(e.cheio ? 'BINGO! Cartão cheio esta semana.' : 'Linha no Bingo da semana!', 'pos'); } catch (x) { } }, 1500); };
const bgPagina = () => { if (!conta()) return semConta('Bingo da semana', '9 tarefas de várias áreas por semana.'); fqLoad(false); const e = bgEstado(); bgEnviar(); const emL = new Set([].concat(...e.linhas.map(k => LIN[k])));
  return `<section class="j3-pg">${voltar}<div class="j3-hero bg"><div><span class="j3-k">${UI.ic('grid')}Bingo da semana</span><h2>${e.cheio ? 'BINGO! Cartão cheio' : e.linhas.length ? e.linhas.length + (e.linhas.length === 1 ? ' linha feita' : ' linhas feitas') : 'O teu cartão desta semana'}</h2><p>As casas marcam-se sozinhas com o que registas no Prumo. Cada linha (horizontal, vertical ou diagonal) dá 3 Selos; o cartão cheio dá uma medalha de Ouro. Novo cartão na segunda-feira.</p></div></div>
    <div class="j3-bg">${e.cel.map((c, i) => `<div class="j3-bc${c.ok ? ' ok' : ''}${emL.has(i) ? ' lin' : ''}"><span class="j3-bi">${UI.ic(c.ok ? 'check' : c.x.ic)}</span><b>${esc(c.x.t)}</b><small>${c.ok ? 'Feito' : nf(Math.floor(c.v)) + ' de ' + nf(c.x.meta) + (c.x.un ? ' ' + c.x.un : '')}</small><i style="--p:${Math.min(100, c.v / c.x.meta * 100).toFixed(0)}%"></i></div>`).join('')}</div>
    <p class="mut j3-n">Semana de ${U.fmtD(e.S.ini)} a ${U.fmtD(e.S.fim)}.</p></section>`; };
OS.on('ready', () => { try { const L = U.ls.get('oc_bg_dias', []) || []; if (!L.includes(U.today())) U.ls.set('oc_bg_dias', L.concat(U.today()).slice(-30)); } catch (e) { } setTimeout(bgEnviar, 8000); OS.on('change', () => bgEnviar()); });

/* ===================== TEMPORADA DE CLÃS ===================== */
const TP = { d: null, at: 0, busy: false, err: '', env: 0 };
const mesIni = () => U.today().slice(0, 7) + '-01';
const noMes = (L, f = 'date') => L.filter(x => x && x[f] && String(x[f]).slice(0, 10) >= mesIni() && String(x[f]).slice(0, 10) <= U.today());
const VALOR = {
  treino: () => noMes(all('workouts')).length + noMes(all('runs')).length,
  foco: () => U.sum(noMes(all('sessions')), x => +x.minutes || 0),
  leitura: () => { let p = 0; all('books').forEach(b => { const fim = String(b.end || ''), ini = String(b.start || ''); if (b.status === 'Lido' && fim >= mesIni()) p += ini >= mesIni() ? +b.pages || 0 : Math.round((+b.pages || 0) / 2); else if (b.status === 'A ler' && ini >= mesIni()) p += +b.curPage || 0; }); return p; },
  habitos: () => { let n = 0; try { const H = all('habits').filter(x => x.active); U.range(mesIni(), U.today()).forEach(d => { n += H.filter(x => OS.Hab && OS.Hab.done(x, d)).length; }); } catch (e) { } return n; },
  financas: () => new Set(noMes(all('transactions')).map(x => String(x.date).slice(0, 10))).size,
  tarefas: () => all('tasks').filter(x => x.doneAt && x.doneAt >= mesIni() && x.doneAt <= U.today()).length };
const tpLoad = async forcar => { if (!conta() || TP.busy || (!forcar && TP.d && Date.now() - TP.at < 60e3)) return; TP.busy = true;
  try { const j = await call('temporada', {}); TP.d = j.temporada; TP.at = Date.now(); TP.err = ''; tpEnviar(); } catch (e) { TP.err = e.message || 'Não deu para abrir a temporada.'; } TP.busy = false; OS.request(); };
const tpEnviar = async forcar => { const t = TP.d; if (!t || !t.meuCla || (!forcar && Date.now() - TP.env < 20 * 6e4)) return; const f = VALOR[t.tema.k]; if (!f) return; let v = 0; try { v = +f() || 0; } catch (e) { }
  if (t.eu && t.eu.v >= v) { TP.env = Date.now(); return; } TP.env = Date.now();
  try { const j = await call('temporadaEnviar', { ym: t.ym, tema: t.tema.k, v }); TP.d = j.temporada; TP.at = Date.now(); OS.request(); } catch (e) { } };
const tpPagina = () => { if (!conta()) return semConta('Temporada de clãs', 'Cada mês um tema; o teu clã soma pontos com o que fazes.'); tpLoad(false); const t = TP.d;
  const hero = t ? `${voltar}<div class="j3-hero tp"><div><span class="j3-k">${UI.ic('swords')}Temporada de clãs</span><h2>${esc(t.tema.n)}</h2><p>Este mês conta: ${esc(t.tema.d)}. Acaba daqui a ${falta(t.fim)}. O clã campeão ganha um troféu para cada membro; o 2.º e o 3.º, medalhas; o melhor de todos (MVP), uma distinção.</p></div></div>` : `${voltar}<div class="j3-hero tp"><div><h2>A abrir a temporada…</h2></div></div>`;
  if (!t) return `<section class="j3-pg">${hero}${TP.err ? `<p class="neg">${esc(TP.err)}</p>` : ''}</section>`;
  const meu = t.meuCla ? `<div class="j3-tpm"><div><small>O teu clã</small><b>${esc(t.meuCla.nome)}</b><span>${t.meuCla.pos ? t.meuCla.pos + '.º de ' + t.total + ' · ' + nf(t.meuCla.pts) + ' pontos' : 'Ainda sem pontos este mês'}</span></div><div><small>O teu contributo</small><b>${nf(t.eu ? t.eu.pts : 0)} pontos</b><span>${t.eu ? nf(Math.round(t.eu.v)) + ' registados' : 'Regista no Prumo e volta aqui'}</span></div><button type="button" class="btn sm" data-act="tpAtualizar">${UI.ic('repeat')}Atualizar o meu contributo</button></div>`
    : `<div class="j3-vz"><b>Ainda não estás num clã</b><p>Entra num clã (ou cria o teu) para somares pontos na temporada.</p><a class="btn pri" href="#animes.clas">Ir aos clãs</a></div>`;
  return `<section class="j3-pg">${hero}${meu}<section class="j3-sec"><h3>Ranking da temporada</h3>${t.lista.length ? `<ol class="j3-rk">${t.lista.map(x => `<li class="${x.meu ? 'eu' : ''}" style="--cl:${esc(x.cor)}"><b>${x.pos}.º</b><span class="j3-clb"></span><span>${esc(x.nome)} <small>${x.n} ${x.n === 1 ? 'membro a pontuar' : 'membros a pontuar'}${x.top ? ' · melhor: ' + esc(x.top.nome) : ''}</small></span><em>${nf(x.pts)}</em></li>`).join('')}</ol>` : '<p class="mut">Ainda nenhum clã pontuou este mês. O primeiro registo põe o teu clã à frente.</p>'}</section>
    ${t.ant && t.ant.top.length ? `<p class="mut j3-n">Temporada passada (${esc(t.ant.tema)}): ${t.ant.top.map((x, i) => `${i + 1}.º ${esc(x.nome)} (${nf(x.pts)})`).join(' · ')}</p>` : ''}</section>`; };
A.tpAtualizar = async () => { await tpEnviar(true); UI.toast('Contributo atualizado.', 'pos'); };
const tpMini = () => { if (!conta()) return ''; tpLoad(false); const t = TP.d; if (!t) return '';
  return `<a class="j3-tpmini" href="#jogos.temporada"><span class="j3-k">${UI.ic('swords')}Temporada de clãs</span><b>${esc(t.tema.n)}</b><span>${t.meuCla ? (t.meuCla.pos ? 'O teu clã está em ' + t.meuCla.pos + '.º com ' + nf(t.meuCla.pts) + ' pontos' : 'O teu clã ainda não pontuou') : 'Entra num clã para jogar'} · acaba daqui a ${falta(t.fim)}</span></a>`; };
OS.on('ready', () => setTimeout(() => { if (conta()) tpLoad(false); }, 12000));

/* ===================== a tela de Jogos ===================== */
const tiles = () => { const q = FQ.d, r = RP.d, t = TP.d, e = bgEstado(); if (conta()) { fqLoad(false); rpLoad(false); tpLoad(false); }
  return `<a class="jg-t j3-t fq" href="#jogos.fquiz"><span class="jg-ic">${UI.ic('wallet')}</span><b>Quiz de finanças</b><p>10 perguntas de dinheiro por semana, com a explicação de cada resposta.</p><small>${q ? (q.eu ? (q.eu.fim ? 'Feito: ' + nf(q.eu.pts) + ' pts' : 'A meio') : 'Aberto até domingo') : 'Semanal'}</small></a>
    <a class="jg-t j3-t rp" href="#jogos.raspa"><span class="jg-ic">${UI.ic('globe')}</span><b>Raspadinha do mundo</b><p>9 países escondidos por dia: acerta na capital, no continente ou na bandeira.</p><small>${r ? r.certas + ' de 9 hoje' : 'Diária'}</small></a>
    <a class="jg-t j3-t bg" href="#jogos.bingo"><span class="jg-ic">${UI.ic('grid')}</span><b>Bingo da semana</b><p>9 tarefas de várias áreas, marcadas sozinhas com o que registas.</p><small>${e.linhas.length ? e.linhas.length + (e.linhas.length === 1 ? ' linha' : ' linhas') : e.cel.filter(c => c.ok).length + ' de 9 casas'}</small></a>
    <a class="jg-t j3-t tp" href="#jogos.temporada"><span class="jg-ic">${UI.ic('swords')}</span><b>Temporada de clãs</b><p>Cada mês um tema; o que fazes soma pontos para o teu clã.</p><small>${t ? esc(t.tema.n) : 'Mensal'}</small></a>`; };
const liga = () => { const j = OS.views.jogos; if (!j || j._j3) return; const f = sub => { if (sub === 'fquiz') return fqPagina(); if (sub === 'raspa') return rpPagina(); if (sub === 'bingo') return bgPagina(); if (sub === 'temporada') return tpPagina();
    const h = j(sub), k = '<div class="jg-g">', i = h.indexOf(k); return i < 0 ? h : h.slice(0, i + k.length) + tiles() + h.slice(i + k.length); }; Object.keys(j).forEach(x => { f[x] = j[x]; }); f._j3 = 1; OS.views.jogos = f; };
OS.on('ready', () => setTimeout(liga, 20));
OS.Temporada = { mini: tpMini, carregar: tpLoad, _S: TP };
OS.FQuiz = { pagina: fqPagina, carregar: fqLoad, _S: FQ };
OS.Raspa = { pagina: rpPagina, carregar: rpLoad, _S: RP };
OS.Bingo = { pagina: bgPagina, estado: bgEstado, _POOL: BPOOL };
})();
