/* PRUMO — A tua primeira semana (v4.03 · passo 4 dos 7).
   Para quem acaba de criar o perfil: um passo por dia durante 7 dias (dinheiro, hábitos, metas, corpo, estudo, o resto do Prumo, revisão),
   cada um marcado sozinho quando está feito. O menu começa só com o essencial e cada dia junta as áreas desse dia, para ninguém se perder
   nas mais de 40 abas. Quem quiser tudo de uma vez toca em «Mostrar tudo já». Os perfis que já existiam não mudam. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc; if (!OS.views) return;
OS.ONE_DEF.semana = {};
const S = () => { const o = OS.one('semana'); if (!o.vis) o.vis = {}; if (!o.abertas) o.abertas = []; return o; };
const s = (f, d) => { try { return f(); } catch (e) { return d; } };
const hoje = () => U.today();
const DIAS = [
  { k: 'dinheiro', t: 'O teu dinheiro', d: 'Junta a conta do banco (ou a carteira) com o saldo de hoje e regista o primeiro gasto.', u: '#financas.contas', b: 'Abrir as Finanças', abre: ['hoje', 'tarefas', 'financas', 'gasto', 'calendario'], ok: () => OS.all('accounts').some(a => !a.archived) && OS.all('transactions').length > 0 },
  { k: 'habitos', t: 'Os teus hábitos', d: 'Escolhe os hábitos que queres manter e marca o de hoje como feito.', u: '#habitos', b: 'Abrir os Hábitos', abre: ['habitos', 'foco'], ok: () => OS.all('habits').some(h => h.active !== false && OS.Hab && [hoje(), U.addDays(hoje(), -1)].some(d => s(() => OS.Hab.done(h, d), false))) },
  { k: 'metas', t: 'Uma meta para este ano', d: 'Escreve o que queres conseguir até ao fim do ano e o primeiro passo para lá chegar.', u: '#metas', b: 'Criar a meta', abre: ['metas', 'projetos'], ok: () => OS.all('goals').length > 0 },
  { k: 'corpo', t: 'O teu corpo', d: 'Regista um treino, o peso de hoje ou uma corrida. Serve de ponto de partida.', u: '#corpo', b: 'Abrir o Corpo', abre: ['corpo', 'treino', 'dieta', 'desporto'], ok: () => OS.all('workouts').length > 0 || OS.all('body').length > 0 || OS.all('runs').length > 0 },
  { k: 'estudo', t: 'O que estás a aprender', d: 'Junta o livro que estás a ler, as disciplinas ou um curso.', u: '#leituras', b: 'Abrir as Leituras', abre: ['leituras', 'universidade', 'cursos', 'certificacoes', 'aprendizagem', 'conhecimento'], ok: () => s(() => OS.all('books').length, 0) > 0 || OS.all('subjects').length > 0 || s(() => OS.all('courses').length, 0) > 0 },
  { k: 'mais', t: 'O resto do Prumo', d: 'Abre os Jogos (o desafio da semana e os quizzes) e espreita o Explorar: lá está tudo o que o Prumo faz.', u: '#jogos', b: 'Abrir os Jogos', abre: ['jogos', 'ranking', 'jornal', 'email', 'eu', 'fotos', 'mundo', 'esportes', 'senhas', 'cozinha', 'fe', 'animes', 'investimentos', 'relatorios', 'compras', 'simuladores', 'trabalho', 'carreira', 'capital', 'oportunidades'], ok: () => !!S().vis.jogos || !!S().vis.explorar },
  { k: 'revisao', t: 'A tua primeira semana', d: 'Acaba de configurar o que faltar (nome, país, notificações) e vê o Plano de vida.', u: '#next', b: 'Ver o Plano de vida', abre: ['next', 'decisoes', 'revisao'], ok: () => (!OS.Passos || OS.Passos.faltam() === 0) && (!!S().vis.next || !!S().vis.revisao) }];
const ativa = () => { const o = S(); return !!o.ini && !o.tudo && !o.fim; };
const diaCal = () => { const o = S(); return o.ini ? Math.max(1, U.diff(hoje(), o.ini) + 1) : 0; };
const feitos = () => DIAS.map(x => !!s(x.ok, false));
// o dia em que está: o do calendário, ou mais à frente se já fez os passos anteriores
const dia = () => { const f = feitos(); let n = 0; while (n < DIAS.length && f[n]) n++; return Math.min(DIAS.length, Math.max(diaCal(), n + 1)); };
const TODAS = new Set(DIAS.flatMap(x => x.abre)), NAVK = () => (OS.NAV || []).flatMap(g => g[1].map(x => x[0])).filter(k => TODAS.has(k));   // só mexe nas áreas que a semana conhece
const fechadas = () => { if (!ativa()) return new Set(); const d = dia(); if (d > DIAS.length || diaCal() > DIAS.length) return new Set(); const ab = new Set(['visao', 'definicoes'].concat(S().abertas, ...DIAS.slice(0, d).map(x => x.abre)));
  return new Set(NAVK().filter(k => !ab.has(k))); };
// o menu: as áreas dos dias que ainda não chegaram ficam de fora (sem mexer no que a pessoa escolheu esconder)
const ligar = () => { if (!OS.Areas || OS.Areas._sem) return; const h0 = OS.Areas.hidden; OS.Areas.hidden = () => { const h = h0(); fechadas().forEach(k => h.add(k)); return h; }; OS.Areas._sem = 1;
  const on0 = A.areaOn; A.areaOn = (b, e) => { const k = b && b.dataset && b.dataset.k; if (k && fechadas().has(k)) { if (e) { e.preventDefault(); e.stopPropagation(); } S().abertas.push(k); OS.touch('semana'); UI.toast('Está no menu', 'pos'); if (OS.fitNav) setTimeout(OS.fitNav, 60); OS.request(); return; } return on0 && on0(b, e); }; };
const cartao = () => { if (!ativa()) return ''; const f = feitos(), d = dia(), todos = f.every(Boolean); if (diaCal() > DIAS.length + 7 || (todos && S().vista)) return '';
  const cur = DIAS[Math.min(d, DIAS.length) - 1], nOk = f.filter(Boolean).length;
  return `<section class="sm-c" aria-label="A tua primeira semana"><div class="sm-h"><div><small>A tua primeira semana · dia ${Math.min(diaCal(), 7)} de 7</small><b>${todos ? 'Semana feita. O Prumo já está a trabalhar para ti.' : `Hoje: ${esc(cur.t.toLowerCase())}`}</b></div>
      <button type="button" class="btn xs ghost" data-act="smTudo">${todos ? 'Fechar' : 'Mostrar tudo já'}</button></div>
    <span class="sm-b" aria-hidden="true"><i style="width:${Math.round(nOk / DIAS.length * 100)}%"></i></span>
    ${todos ? '' : `<div class="sm-hoje"><p>${esc(cur.d)}</p><a class="btn pri sm" href="${cur.u}">${esc(cur.b)}</a></div>`}
    <ol class="sm-l">${DIAS.map((x, i) => { const ok = f[i], aqui = i === d - 1 && !ok, fut = i >= d; return `<li class="${ok ? 'ok' : aqui ? 'agora' : fut ? 'fut' : ''}"><span class="sm-i">${ok ? UI.ic('check') : i + 1}</span><span><b>${esc(x.t)}</b>${fut ? '<small>Abre num dos próximos dias</small>' : ''}</span></li>`; }).join('')}</ol></section>`; };
A.smTudo = () => { const o = S(); if (feitos().every(Boolean)) { o.vista = 1; o.fim = 1; } else { if (!confirm('Mostrar já todas as áreas no menu? Podes esconder as que não usas em Definições ou no Explorar.')) return; o.tudo = 1; } OS.touch('semana'); if (OS.fitNav) setTimeout(OS.fitNav, 60); OS.request(); };
OS.Semana = { ativa, dia, feitos, fechadas, cartao, DIAS };
OS.on && OS.on('ready', () => {
  // começa só para perfis novos: os que ainda não acabaram as perguntas iniciais quando o app abriu
  const fez = () => ['ok', 'skip'].includes((OS.one('onb') || {}).done), novo = !fez() && !S().ini;
  if (novo) OS.on('one:onb', () => { const o = S(); if (!o.ini && fez()) { o.ini = hoje(); OS.touch('semana'); if (OS.fitNav) setTimeout(OS.fitNav, 60); OS.request(); } });
  ligar();
  addEventListener('hashchange', () => { if (!ativa()) return; const v = (location.hash.slice(1).split('.')[0] || 'visao'); if (!S().vis[v]) { S().vis[v] = 1; OS.touch('semana'); } });
  // no Painel: o cartão da semana (e, enquanto ele está, o dos Primeiros passos fica dentro do último dia)
  const o = OS.views.visao; if (o && !o._sm) { OS.views.visao = sub => { const h = o(sub), c = s(cartao, ''); if (!c) return h; const k = '<!--dg-->', i = h.indexOf(k); return i < 0 ? c + h : h.slice(0, i) + c + h.slice(i); }; Object.keys(o).forEach(x => { OS.views.visao[x] = o[x]; }); OS.views.visao._sm = 1; }
  if (OS.Passos && OS.Passos.cartao && !OS.Passos._sm) { const c0 = OS.Passos.cartao; OS.Passos.cartao = () => ativa() && !feitos().every(Boolean) ? '' : c0(); OS.Passos._sm = 1; }
});
})();
