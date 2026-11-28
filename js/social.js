/* PRUMO — Parceria "Prumo & PHANTOM" (v3.73). Os Animes passam a ser uma parceria do Prumo com a PHANTOM (a administração pode
   mudar o nome na tela de Jogos › Administração da parceria). O Pursuit tem os créditos da SuperAnimes. Aqui vivem:
   · a tela de Jogos (#jogos), com a parceria em destaque e os jogos do Prumo (Dominus, Floresta);
   · o PURSUIT: todos os dias às 20h (hora de Lisboa) saem pistas de um anime; descobre qual é, abre a página dele e marca-o como
     Pursuit (um por dia); às 22h fecha e quem acertou ganha pontos pela ordem (1.º 100, 2.º 90… mínimo 10);
   · o ranking de animes (pontos dos jogos), os clãs, os amigos e as conversas (no clã e a dois), com cada mensagem verificada
     pela IA antes de aparecer, denunciar e bloquear. Tudo no servidor (api/social), cifrado. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, V = OS.views, esc = U.esc;
if (!UI.IP.gamepad) UI.IP.gamepad = 'M7.5 7h9a5.5 5.5 0 0 1 5.4 6.6l-.7 3.4a2.4 2.4 0 0 1-4.2 1.1L15 16H9l-2 2.1A2.4 2.4 0 0 1 2.8 17l-.7-3.4A5.5 5.5 0 0 1 7.5 7zM7.5 10.5v4M5.5 12.5h4M15.5 11.5h.01M18 13.5h.01';
if (!UI.IP.chat) UI.IP.chat = 'M4 5h16v11H9.5L4 20z';
if (!UI.IP.copy) UI.IP.copy = 'M9 9h11v11H9zM5 15H4V4h11v1';

/* ---------- o parceiro ---------- */
const PK = 'oc_parceiro';
let PARC = Object.assign({ nome: 'PHANTOM', site: '', at: 0 }, U.ls.get(PK, {}) || {}); // a parceira dos Animes (a administração pode mudar o nome)
const parcLoad = async forcar => { if (!forcar && Date.now() - (PARC.at || 0) < 6 * 36e5) return;
  try { const r = await fetch('api/social?op=parceiro' + (forcar ? '&t=' + Date.now() : ''), { credentials: 'omit' }); const j = await r.json();
    if (j && j.ok) { const mud = (j.nome || '') !== PARC.nome; PARC = { nome: j.nome || '', site: j.site || '', at: Date.now() }; U.ls.set(PK, PARC); if (mud) OS.request(); } } catch (e) { } };
const pNome = () => PARC.nome || 'PHANTOM';
const logo = n => { try { return OS.Lock && OS.Lock.logo ? OS.Lock.logo(n) : ''; } catch (e) { return ''; } };
// a marca da parceria: o selo do Prumo, o "&" e o parceiro (enquanto não tem nome, um "?" à espera)
const ePh = () => /^phantom$/i.test(pNome());
// a marca da parceria: o selo do Prumo, o "&" e a PHANTOM (o ícone da aranha; outro nome que a administração escreva aparece em texto)
const marca = (sz = 'sm') => `<span class="pc-mk pc-${sz}" role="img" aria-label="Parceria Prumo e ${esc(pNome())}"><span class="pc-pr">${logo(sz === 'lg' ? 34 : 18)}<b>Prumo</b></span><i class="pc-et">&amp;</i><span class="pc-pa">${ePh() ? '<img src="icons/phantom-icone.webp" alt="" width="18" height="18" decoding="async">' : ''}<b class="pc-pn">${esc(pNome())}</b></span></span>`;

/* ---------- servidor ---------- */
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token() && OS.Acc.pid && OS.Acc.pid());
const call = async (op, body = {}) => { if (!conta()) throw Object.assign(new Error('Entra na tua conta Prumo para jogar e conversar.'), { status: 401 });
  const r = await fetch('api/social', { method: 'POST', cache: 'no-store', credentials: 'omit', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OS.Acc.token() }, body: JSON.stringify(Object.assign({ op, p: OS.Acc.pid() }, body)) });
  let j = null; try { j = await r.json(); } catch (e) { }
  // v3.93: qualquer pedido pode trazer Selos ganhos (jogos, medalhas, presença): aviso e carteira atualizada
  if (j && j.ok && j.selosGanhos > 0 && op !== 'presenca') { try { UI.toast(`+${j.selosGanhos} ${j.selosGanhos === 1 ? 'Selo' : 'Selos'} na tua carteira`, 'pos'); OS.Selos && OS.Selos.carregar(true); } catch (e) { } }
  if (j && j.ok) return j; throw Object.assign(new Error((j && j.msg) || 'O servidor do Prumo não respondeu.'), { status: r.status }); };
const S = { err: {}, busy: {}, at: {}, cla: {}, msgs: {}, ult: {} };
const carga = async (k, fn, ttl, forcar) => { if (S.busy[k] || (!forcar && S.at[k] && Date.now() - S.at[k] < ttl)) return; S.busy[k] = 1;
  try { S[k] = await fn(); S.err[k] = ''; } catch (e) { S.err[k] = e.message; } S.at[k] = Date.now(); S.busy[k] = 0; OS.request(); };
const eu = forcar => carga('eu', async () => call('eu'), 30e3, forcar);
const rank = forcar => carga('rk', async () => call('rankAnime'), 60e3, forcar);
const convs = forcar => carga('cv', async () => (await call('conversas')).conversas, 15e3, forcar);
const hunter = forcar => carga('h', async () => { const h = (await call('hunter')).hunter; h.skew = Date.now() - h.ts; agendar(h); return h; }, 60e3, forcar);
const erroBox = k => S.err[k] ? `<p class="so-err" role="alert">${esc(S.err[k])}</p>` : '';
const ld = t => `<div class="an-ld"><span class="an-sp"></span>${esc(t)}</div>`;
const semConta = () => `<div class="so-vazio"><b>Entra na tua conta Prumo</b><p>Os jogos, o ranking e os clãs precisam de uma conta, para os pontos e as conversas ficarem guardados.</p></div>`;
const hora = t => new Date(t).toLocaleTimeString(OS.loc ? OS.loc() : 'pt-PT', { hour: '2-digit', minute: '2-digit' });
const dur = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const agora = () => Date.now() - ((S.h && S.h.skew) || 0);

/* ---------- Pursuit ---------- */
const PTS_TXT = 'Quem acerta primeiro ganha mais: 1.º 100 pontos, 2.º 90, 3.º 80, e assim por diante (mínimo 10).';
// créditos do jogo (pedido do Prumo): o Pursuit é da SuperAnimes
const CRED = '<p class="hu-cred">Créditos do Pursuit: <b>SuperAnimes</b>, a maior empresa de animes que já existiu.</p>';
const lisboa = h => { const l = hora(h.abreAt), f = hora(h.fechaAt); return l === '20:00' ? 'das 20:00 às 22:00' : `das 20:00 às 22:00 de Lisboa (${l} às ${f} na tua hora)`; };
// v3.77: as notificações do Pursuit (pistas às 20h, 15 minutos antes de fechar e o resultado) saem do servidor todos os dias, mesmo sem abrir o jogo;
// aqui só se limpam os avisos que as versões anteriores agendavam neste aparelho
const agendar = () => { try { if (OS.Push && OS.Push.put) OS.Push.put('jogo', []); } catch (e) { } };
// v3.77: o aviso no telemóvel (às 20h, 15 minutos antes de fechar e o resultado)
const avisoPush = () => { const P = OS.Push; if (!P) return ''; const cat = ((OS.one('pushcfg') || {}).cat || {}), on = P.on(), w = P.why();
  if (on && cat.jogo !== 0) return `<p class="hu-push on">${UI.ic('bell')}<span>Recebes um aviso no telemóvel quando saem as pistas, 15 minutos antes de fechar e com o teu resultado.</span></p>`;
  if (on) return `<p class="hu-push">${UI.ic('bell')}<span>Os avisos do Pursuit estão desligados. Liga-os em Definições › Notificações.</span></p>`;
  return `<div class="hu-push">${UI.ic('bell')}<span>${w ? esc(P.msg(w)) : 'Liga as notificações para saberes quando saem as pistas, mesmo com o Prumo fechado.'}</span>${w ? '' : '<button type="button" class="btn sm an-cta" data-act="pushOn">Ligar</button>'}</div>`; };
const proxPista = h => { const n = h.pistas.length; if (h.fase !== 'aberto' || n >= h.total) return 0; return h.quando && h.quando[n] ? h.quando[n] : h.abreAt + (n >= 4 ? 80 : 40) * 6e4; };   // v3.93: a hora de cada pista vem do servidor
const pistasHTML = h => { const prox = proxPista(h), L = h.pistas.map((p, i) => `<li><span class="hu-pn">${i + 1}</span><p>${esc(p)}</p></li>`);
  for (let i = h.pistas.length; i < h.total; i++) L.push(`<li class="off"><span class="hu-pn">${i + 1}</span><p>${i === h.pistas.length && prox ? `Sai às ${hora(prox)} · <span data-ate="${prox}">${dur(prox - agora())}</span>` : 'Ainda por sair'}</p></li>`);
  return `<ol class="hu-pl" aria-label="Pistas">${L.join('')}</ol>`; };
const tabRes = (res, me) => res && res.length ? `<ol class="hu-res">${res.map((r, i) => `<li class="${r.id === me ? 'eu' : ''}"><b>${i + 1}.º</b><span>${esc(r.nome)}${r.id === me ? ' (tu)' : ''}</span><small>${hora(r.at)}</small><em>+${r.pts}</em></li>`).join('')}</ol>` : '<p class="mut">Ninguém acertou.</p>';
const meuId = () => (S.eu && S.eu.eu && S.eu.eu.id) || '';
const hunterView = () => { if (!conta()) return semConta(); hunter(); eu(); const h = S.h;
  const topo = `<header class="hu-h">${marca('sm')}${OS.Parceria ? OS.Parceria.exclusivo() : ''}<h2>Pursuit</h2><p>Todos os dias às 20h de Lisboa saem as 2 primeiras pistas de um anime ao calhas; a 3.ª sai às 20:35, a 4.ª às 21:10 e a 5.ª às 21:45. Descobre qual é, abre a página dele e carrega em <b>Marcar como Pursuit</b>. Às 22h fecha e revela-se o anime. ${PTS_TXT}</p></header>`;
  if (!h) return `<section class="hu">${topo}${S.err.h ? erroBox('h') + `<button class="btn an-cta" data-act="huRec">Tentar outra vez</button>` : ld('A abrir o Pursuit de hoje…')}${CRED}</section>`;
  let corpo = '';
  if (h.fase === 'espera') corpo = `<div class="hu-rel"><small>O Pursuit de hoje começa daqui a</small><b data-ate="${h.abreAt}">${dur(h.abreAt - agora())}</b><span>${esc(lisboa(h))}</span></div>
      ${h.ontem ? `<div class="hu-ont">${h.ontem.img ? `<img src="${esc(h.ontem.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<div><small>Ontem era</small><b>${esc(h.ontem.titulo)}</b>${(h.ontem.res || []).length ? `<p>Ganhou ${esc(h.ontem.res[0].nome)}${h.ontem.res.length > 1 ? ` e mais ${h.ontem.res.length - 1}` : ''}.</p>` : '<p>Ninguém acertou.</p>'}</div></div>` : ''}`;
  else if (h.fase === 'aberto') corpo = `<div class="hu-rel on"><small>Fecha daqui a</small><b data-ate="${h.fechaAt}">${dur(h.fechaAt - agora())}</b><span>${esc(lisboa(h))}</span></div>${pistasHTML(h)}
      ${h.meu ? `<div class="hu-meu"><small>O teu Pursuit de hoje</small><b>${esc(h.meu.titulo || 'Anime marcado')}</b><span>Marcado às ${hora(h.meu.at)}. Às 22h sabes se acertaste.</span></div>`
        : `<div class="hu-cta"><p>Já sabes qual é? Procura o anime e, na página dele, carrega em <b>Marcar como Pursuit</b>. Só podes marcar um por dia.</p><a class="btn an-cta" href="#animes.pesquisar">${UI.ic('search')}Procurar o anime</a></div>`}`;
  else { const me = meuId(), win = h.meu && h.meu.certo, p = win ? ((h.res || []).find(r => r.id === me) || {}).pts : 0;
    corpo = `<div class="hu-rev">${h.resposta.img ? `<img src="${esc(h.resposta.img)}" alt="" referrerpolicy="no-referrer">` : ''}<div><small>O anime de hoje era</small><b>${esc(h.resposta.titulo)}</b>
        <p class="hu-eu ${win ? 'pos' : h.meu ? 'neg' : ''}">${win ? `Acertaste. Ganhaste ${p} pontos.` : h.meu ? `Marcaste ${esc(h.meu.titulo || 'outro anime')}. Não foi desta.` : 'Não jogaste hoje.'}</p><span>${h.jogadores || 0} ${h.jogadores === 1 ? 'pessoa jogou' : 'pessoas jogaram'}. O próximo começa amanhã às 20h.</span></div></div>
      ${pistasHTML(h)}<h3>Quem acertou</h3>${tabRes(h.res, me)}`; }
  return `<section class="hu">${topo}${corpo}${avisoPush()}${erroBox('h')}<p class="mut hu-mais">Mais jogos de anime vêm a caminho. Os pontos de todos contam para o <a href="#animes.ranking">ranking</a>.</p>${CRED}</section>`; };
// na página de cada anime: marcar como Pursuit
const noAnime = x => { if (!conta() || !x) return ''; hunter(); const h = S.h; if (!h || h.fase !== 'aberto') return '';
  if (h.meu) return `<section class="hu-bar"><span>${UI.ic('target')}</span><p>O teu Pursuit de hoje: <b>${esc(h.meu.titulo || 'anime marcado')}</b>. Resultados às 22h.</p><a class="btn sm an-ghost" href="#animes.pursuit">Ver o Pursuit</a></section>`;
  const mal = x.mal || '';
  if (!mal) return `<section class="hu-bar"><span>${UI.ic('target')}</span><p>O Pursuit de hoje está a decorrer, mas este anime não tem ligação ao MyAnimeList: não dá para o marcar.</p></section>`;
  return `<section class="hu-bar on"><span>${UI.ic('target')}</span><p><b>Pursuit a decorrer.</b> É este o anime das pistas? Fecha às 22h.</p><button type="button" class="btn sm an-cta" data-act="huMarcar" data-mal="${esc(String(mal))}" data-t="${esc(x.t || '')}">Marcar como Pursuit</button></section>`; };
A.huRec = () => hunter(true);
A.huMarcar = async b => { const t = b.dataset.t || 'este anime'; if (!confirm(`Marcar «${t}» como o teu Pursuit de hoje?\nSó podes marcar um anime por dia.`)) return; b.disabled = true;
  try { const j = await call('hunterMarcar', { mal: b.dataset.mal, titulo: t }); j.hunter.skew = Date.now() - j.hunter.ts; S.h = j.hunter; S.at.h = Date.now(); agendar(S.h); UI.toast('Marcado. Às 22h sabes se acertaste.', 'pos'); }
  catch (e) { UI.toast(e.message, 'neg'); hunter(true); } b.disabled = false; OS.request(); };

/* ---------- ranking de animes ---------- */
const podio = (L, n = 3) => { const t = L.slice(0, n); if (!t.length) return ''; const ord = t.length === 3 ? [t[1], t[0], t[2]] : t;
  return `<div class="rk-pod">${ord.map(x => `<div class="rk-p p${x.pos}${x.eu ? ' eu' : ''}">${OS.AnimeSoc ? OS.AnimeSoc.av(x, 44) : ''}<b>${esc(x.nome)}</b>${x.user ? `<small>@${esc(x.user)}</small>` : ''}${x.cl ? `<em class="rk-cl">${esc(x.cl)}</em>` : ''}<span>${x.p} pts</span><i>${x.pos}</i></div>`).join('')}</div>`; };
// v3.99 · ranking de Selos (quem tem mais Selos guardados; a administração não entra)
const rankSelos = forcar => { if (S.busy.rs || (!forcar && S.rs && Date.now() - S.rs._at < 60e3)) return; S.busy.rs = 1; call('rankSelos', {}).then(j => { S.rs = Object.assign(j, { _at: Date.now() }); S.err.rs = ''; }).catch(e => { S.err.rs = e.message; }).finally(() => { S.busy.rs = 0; OS.request(); }); };
const rkTabs = t => `<div class="so-tabs rk-tabs" role="tablist" aria-label="Rankings"><button type="button" role="tab" aria-selected="${t !== 'selos'}" class="${t !== 'selos' ? 'on' : ''}" data-act="rkTab" data-t="pts">${UI.ic('trophy')}Pontos</button><button type="button" role="tab" aria-selected="${t === 'selos'}" class="${t === 'selos' ? 'on' : ''}" data-act="rkTab" data-t="selos">${OS.Selos ? OS.Selos.ic(16) : ''}Selos</button></div>`;
A.rkTab = b => { OS.ui.rkT = b.dataset.t; OS.request(); };
const rankSelosView = () => { rankSelos(); const r = S.rs, ic = OS.Selos ? OS.Selos.ic(14) : '';
  const topo = `<header class="hu-h">${marca('sm')}${OS.Parceria ? OS.Parceria.exclusivo() : ''}<h2>Ranking de Selos</h2><p>Quem tem mais Selos guardados. Ganham-se a jogar, nos desafios, nas medalhas e com a presença. A conta de administração não entra.</p></header>${rkTabs('selos')}`;
  if (!r) return `<section class="hu">${topo}${erroBox('rs') || ld('A buscar o ranking de Selos…')}</section>`;
  if (!r.lista.length) return `<section class="hu">${topo}<div class="so-vazio"><b>Ainda ninguém tem Selos</b><p>Joga, faz os desafios e ganha medalhas para juntares Selos.</p><a class="btn an-cta" href="#selos">Como ganhar Selos</a></div></section>`;
  const L = r.lista.map(x => Object.assign({}, x, { p: x.s }));
  return `<section class="hu">${topo}${podio(L).replace(/(\d[\d.]*) pts<\/span>/g, '$1 Selos</span>')}<ol class="rk-l" start="4">${L.slice(3).map(x => `<li class="${x.eu ? 'eu' : ''}"><b>${x.pos}.º</b><span class="rk-n">${OS.AnimeSoc ? OS.AnimeSoc.av(x, 28) : ''}${esc(x.nome)}${x.user ? ` <small>@${esc(x.user)}</small>` : ''}${x.eu ? ' (tu)' : ''}</span><em>${ic}${Number(x.s).toLocaleString('pt-PT')}</em></li>`).join('')}</ol>
    ${r.eu && r.eu.adm ? '<p class="mut">A tua conta de administração tem Selos sem fim, por isso não entra neste ranking.</p>' : r.eu && r.eu.pos > 100 ? `<p class="rk-meu">Estás em ${r.eu.pos}.º de ${r.total}, com ${Number(r.eu.s).toLocaleString('pt-PT')} Selos.</p>` : !r.eu ? '<p class="mut">Ainda não tens Selos guardados: joga e faz os desafios para entrares.</p>' : ''}</section>`; };
const rankView = () => { if (!conta()) return semConta(); if (OS.ui.rkT === 'selos') return rankSelosView(); rank(); const r = S.rk;
  const topo = `<header class="hu-h">${marca('sm')}${OS.Parceria ? OS.Parceria.exclusivo() : ''}<h2>Ranking de animes</h2><p>Os pontos ganhos nos jogos de anime (Pursuit, Quiz, Sombras, desafios). Só conta para este ranking, não para o ranking de disciplina do Prumo.</p></header>${rkTabs('pts')}`;
  if (!r) return `<section class="hu">${topo}${erroBox('rk') || ld('A buscar o ranking…')}</section>`;
  if (!r.lista.length) return `<section class="hu">${topo}<div class="so-vazio"><b>Ainda ninguém pontuou</b><p>Joga o Pursuit hoje às 20h e aparece aqui em primeiro.</p><a class="btn an-cta" href="#animes.pursuit">Ir para o Pursuit</a></div></section>`;
  return `<section class="hu">${topo}${podio(r.lista)}<ol class="rk-l" start="4">${r.lista.slice(3).map(x => `<li class="${x.eu ? 'eu' : ''}"><b>${x.pos}.º</b><span class="rk-n">${OS.AnimeSoc ? OS.AnimeSoc.av(x, 28) : ''}${esc(x.nome)}${x.user ? ` <small>@${esc(x.user)}</small>` : ''}${x.cl ? ` <em class="rk-cl">${esc(x.cl)}</em>` : ''}${x.eu ? ' (tu)' : ''}</span><em>${x.p} pts</em></li>`).join('')}</ol>
    ${r.eu && r.eu.pos > 100 ? `<p class="rk-meu">Estás em ${r.eu.pos}.º de ${r.total}, com ${r.eu.p} pontos.</p>` : !r.eu ? '<p class="mut">Ainda não tens pontos: joga o Pursuit para entrares no ranking.</p>' : ''}</section>`; };

/* ---------- clãs, amigos e conversas ---------- */
const CORES = ['#9B1B30', '#C8102E', '#D4A017', '#2E9E5B', '#3D7BF7', '#7B4FD6', '#E8590C', '#0E7C86'];
let DRAFT = '', POLL = 0;
const convAberta = () => OS.ui.soConv || '';
const claAberto = () => OS.ui.soCla || '';
const msgsDe = k => S.msgs[k] || null;
const bolha = (m, k) => `<div class="so-m${m.meu ? ' eu' : ''}" data-mid="${esc(m.id)}"><small>${m.meu ? 'Tu' : esc(m.nome)} · ${hora(m.at)}</small><p>${esc(m.t)}</p>${m.meu ? '' : `<button type="button" class="so-den" data-act="soDen" data-mid="${esc(m.id)}" aria-label="Denunciar a mensagem de ${esc(m.nome)}">Denunciar</button>`}</div>`;
const lerMsgs = async (k, novo) => { const L = msgsDe(k); try { const j = await call('msgs', { conv: k, desde: novo || !L ? 0 : (L[L.length - 1] || {}).at || 0 }); const cur = novo || !L ? [] : L.slice(), ids = new Set(cur.map(m => m.id));
    j.msgs.forEach(m => { if (!ids.has(m.id)) cur.push(m); }); const mudou = !L || cur.length !== L.length; S.msgs[k] = cur.slice(-200); S.err.msg = ''; if (mudou) { OS.request(); desce(); } } catch (e) { S.err.msg = e.message; OS.request(); } };
const desce = (sempre) => setTimeout(() => { const b = document.getElementById('soMsgs'); if (b && (sempre || b.scrollHeight - b.scrollTop - b.clientHeight < 160)) b.scrollTop = b.scrollHeight; }, 60);
const nomeConv = k => { const c = (S.cv || []).find(x => x.conv === k); if (c) return c; if (/^c-/.test(k)) { const cl = ((S.eu || {}).clas || []).find(x => 'c-' + x.id === k); return cl ? { nome: cl.nome, tipo: 'c', cor: cl.cor } : { nome: 'Clã', tipo: 'c' }; } const a = ((S.eu || {}).amigos || []).find(x => 'd-' + x.id === k); return { nome: a ? a.nome : 'Conversa', tipo: 'd' }; };
const chatView = k => { const L = msgsDe(k), c = nomeConv(k), mudo = S.eu && S.eu.eu && S.eu.eu.mudo; if (!L && !S.busy['m' + k]) { S.busy['m' + k] = 1; lerMsgs(k, true).then(() => { S.busy['m' + k] = 0; desce(true); }); }
  return `<section class="so-chat"><header class="so-ch"><button type="button" class="btn sm an-ghost" data-act="soVoltar">${UI.ic('left')}Voltar</button><div><b>${esc(c.nome)}</b><small>${c.tipo === 'c' ? 'Conversa do clã' : 'Conversa a dois'}</small></div>
      ${c.tipo === 'd' ? `<button type="button" class="btn sm an-ghost" data-act="soBloq" data-id="${esc(k.slice(2))}">Bloquear</button>` : `<button type="button" class="btn sm an-ghost" data-act="soCla" data-id="${esc(k.slice(2))}">Ver o clã</button>`}</header>
    <div class="so-msgs" id="soMsgs" role="log" aria-live="polite" aria-label="Mensagens">${!L ? ld('A abrir a conversa…') : L.length ? L.map(m => bolha(m, k)).join('') : `<p class="so-vz">Ainda não há mensagens. Diz olá.</p>`}</div>
    ${erroBox('msg')}${mudo ? `<p class="so-err">Estás sem poder escrever até às ${hora(mudo)}, porque várias mensagens tuas foram barradas.</p>` : ''}
    <form class="so-in" data-form="soEnviar" autocomplete="off"><input class="field grow" id="soTxt" name="t" maxlength="1000" placeholder="Escreve uma mensagem" aria-label="Mensagem" value="${esc(DRAFT)}" ${mudo ? 'disabled' : ''}><button class="btn an-cta" ${mudo ? 'disabled' : ''}>Enviar</button></form>
    <p class="so-nota">${UI.ic('shield')}Cada mensagem passa pela IA antes de aparecer. Sem links, contactos, dados pessoais nem ofensas. Se algo te incomodar, denuncia ou bloqueia.</p></section>`; };
/* ---------- v3.89 · clãs: foto (a IA verifica sempre), pesquisa, pedidos para entrar (ninguém entra sozinho), ranking de clãs e guerra de clãs ---------- */
if (!UI.IP.camera) UI.IP.camera = 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';
if (!UI.IP.swords) UI.IP.swords = 'M5 4l10 10M5 4h3.5M5 4v3.5M19 4L9 14M19 4h-3.5M19 4v3.5M7 13l4 4M5.5 18.5l2.5-2.5M17 13l-4 4M18.5 18.5L16 16';
if (!UI.IP.chat) UI.IP.chat = 'M4 5h16v11H9l-5 4z';
if (!UI.IP.copy) UI.IP.copy = 'M8 8h12v12H8zM4 16V4h12';
if (!UI.IP.trophy) UI.IP.trophy = 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8';
const claImg = (c, sz = 40) => c && c.foto ? `<img class="so-cav" src="api/social?op=img&k=cla&id=${encodeURIComponent(c.id)}&v=${+c.foto || 0}" alt="" width="${sz}" height="${sz}" loading="lazy" style="--s:${sz}px">`
  : `<span class="so-cav so-cav0" style="--s:${sz}px;--cl:${esc((c && c.cor) || '#3a3c44')}" aria-hidden="true">${esc(((c && c.nome) || '?').slice(0, 1).toUpperCase())}</span>`;
const quando = t => { const d = new Date(t), h = new Date(); return d.toDateString() === h.toDateString() ? 'hoje às ' + hora(t) : d.toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'short' }); };
const falta = t => { const m = Math.max(0, Math.round((t - Date.now()) / 6e4)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + ' h' : '') : h ? h + ' h' : m + ' min'; };
const membros = n => n + (n === 1 ? ' membro' : ' membros');
const vits = n => n + (n === 1 ? ' vitória' : ' vitórias');
// ler um clã (sem apagar o que já está no ecrã: o placar da guerra atualiza-se por baixo)
const verCla = cid => { if (S.busy['c' + cid]) return; S.busy['c' + cid] = 1; call('claVer', { id: cid }).then(j => { S.cla[cid] = Object.assign(j.cla, { _at: Date.now() }); S.err.cla = ''; }).catch(e => { S.err.cla = e.message; if (e.status === 403) { delete S.cla[cid]; } }).finally(() => { S.busy['c' + cid] = 0; OS.request(); }); };
// pesquisa de clãs (sem texto: os maiores) e ranking de clãs
const buscar = async q => { S.bq = q; S.bbusy = 1; OS.request(); try { S.bL = (await call('claBuscar', { q })).clas; S.err.bus = ''; } catch (e) { S.err.bus = e.message; } S.bbusy = 0; OS.request(); };
const rankCla = forcar => { if (S.crkBusy || (!forcar && S.crk && Date.now() - S.crkAt < 120e3)) return; S.crkBusy = 1; call('claRanking', {}).then(j => { S.crk = j; S.crkAt = Date.now(); S.err.crk = ''; }).catch(e => { S.err.crk = e.message; }).finally(() => { S.crkBusy = 0; OS.request(); }); };
const marcaBusca = (id, o) => { [S.bL, S.gL && S.gL.L].forEach(L => (L || []).forEach(x => { if (x.id === id) Object.assign(x, o); })); OS.request(); };
const emCla = () => !!(S.eu && S.eu.clas && S.eu.clas.length);   // v3.93: um clã de cada vez
const claRes = (x, modo, cid) => { const bt = modo === 'desafiar' ? `<button type="button" class="btn sm an-cta" data-act="soGwDesafiar" data-id="${esc(cid)}" data-alvo="${esc(x.id)}" data-n="${esc(x.nome)}">${UI.ic('swords')}Desafiar</button>`
    : x.membro ? `<button type="button" class="btn sm an-ghost" data-act="soCla" data-id="${esc(x.id)}">Abrir</button>`
    : x.pedi ? `<button type="button" class="btn sm an-ghost so-pedi" data-act="soClaCancelar" data-id="${esc(x.id)}" aria-label="Pedido enviado a ${esc(x.nome)}. Cancelar o pedido">Pedido enviado<small>Cancelar</small></button>`
    : emCla() ? `<small class="so-ja">Já estás num clã</small>`
    : `<button type="button" class="btn sm an-cta" data-act="soClaPedir" data-id="${esc(x.id)}">Pedir para entrar</button>`;
  return `<li class="so-cr" style="--cl:${esc(x.cor)}">${claImg(x, 48)}<span class="so-crn"><b>${esc(x.nome)}</b>${x.desc ? `<small class="so-crd">${esc(x.desc)}</small>` : ''}<small>${membros(x.n)} · ${x.pts} pts${x.vit ? ' · ' + vits(x.vit) : ''}</small></span>${bt}</li>`; };
const buscaHTML = () => { if (!S.bL && !S.bbusy && !S.err.bus) buscar('');
  return `<form data-form="soClaBuscar" class="so-f row gap8 so-bus" role="search" autocomplete="off"><input class="field grow" type="search" name="q" maxlength="40" placeholder="Procurar um clã pelo nome" aria-label="Procurar um clã pelo nome" value="${esc(S.bq || '')}"><button class="btn an-ghost">${UI.ic('search')}Procurar</button></form>
    ${erroBox('bus')}${!S.bL ? ld('A procurar clãs…') : S.bL.length ? `${S.bq ? '' : '<p class="mut so-sub">Os clãs com mais pontos. Escreve um nome para procurar outro.</p>'}<ul class="so-crl">${S.bL.map(x => claRes(x, 'entrar')).join('')}</ul>` : `<p class="mut">${S.bq ? 'Nenhum clã com esse nome. Experimenta outra palavra ou cria o teu.' : 'Ainda não há clãs. Cria o primeiro.'}</p>`}
    <p class="so-nota">${UI.ic('lock')}Nenhum clã deixa entrar sozinho: o pedido vai para o dono e os moderadores, que aceitam ou recusam.</p>`; };
const rankHTML = () => { rankCla(); const r = S.crk; if (!r) return erroBox('crk') || ld('A buscar o ranking dos clãs…'); if (!r.clas.length) return '<p class="mut">Ainda não há clãs no ranking.</p>';
  const L = OS.ui.soCrkTodos ? r.clas : r.clas.slice(0, 10);
  return `<ol class="so-crk">${L.map((x, i) => `<li class="${x.meu ? 'eu' : ''}${i < 3 ? ' t' + (i + 1) : ''}"><b>${i + 1}.º</b>${claImg(x, 36)}<span><b>${esc(x.nome)}${x.meu ? ' <small>(o teu)</small>' : ''}</b><small>${membros(x.n)}${x.vit ? ' · ' + vits(x.vit) + ' em guerras' : ''}</small></span><em>${x.pts}<small> pts</small></em></li>`).join('')}</ol>
    ${r.clas.length > 10 ? `<button type="button" class="btn sm an-ghost" data-act="soCrkTodos">${OS.ui.soCrkTodos ? 'Ver só os 10 primeiros' : 'Ver os ' + r.clas.length + ' clãs'}</button>` : ''}
    <p class="so-nota">${UI.ic('trophy')}Os pontos de um clã são a soma dos pontos dos membros no ranking dos animes. Cada guerra ganha dá mais 50 pontos a cada membro.</p>`; };
// a guerra
const lado = (w, l) => l === 'a' ? { n: w.nA, c: w.cA, s: w.sA, top: w.topA || [] } : { n: w.nB, c: w.cB, s: w.sB, top: w.topB || [] };
const topL = L => L.length ? L.map(x => `<li><span>${esc(x.nome)}</span><em>+${x.pts}</em></li>`).join('') : '<li class="vz">Ainda ninguém pontuou</li>';
const gwCard = w => { const eu0 = w.meu || 'a', E = lado(w, eu0), O = lado(w, eu0 === 'a' ? 'b' : 'a');
  if (w.estado === 'proposta') return `<div class="so-gw esp"><p>${UI.ic('hourglass')}<span>Desafiaste <b>${esc(O.n)}</b> para uma guerra. Falta a resposta de quem gere esse clã (o desafio expira daqui a ${falta(w.criada + 2 * 864e5)}).</span></p></div>`;
  const fim = w.estado === 'fim', r = fim ? (w.venc === 'empate' ? 'emp' : w.venc === eu0 ? 'vit' : 'der') : 'on', tot = E.s + O.s, pe = tot ? Math.round(E.s / tot * 100) : 50;
  return `<div class="so-gw ${r}" style="--ca:${esc(E.c)};--cb:${esc(O.c)}">
    <div class="so-gwh"><span class="so-gwk">${UI.ic(fim ? (r === 'vit' ? 'trophy' : 'flag') : 'swords')}${fim ? (r === 'vit' ? 'Vitória' : r === 'der' ? 'Derrota' : 'Empate') : 'Guerra a decorrer'}</span><small>${fim ? 'Acabou ' + quando(w.fim) : `Acaba daqui a <b>${falta(w.fim)}</b>`}</small></div>
    <div class="so-gws"><div class="so-gwl"><small>O teu clã</small><b>${esc(E.n)}</b><strong>${E.s}</strong></div><span class="so-vs" aria-hidden="true">×</span><div class="so-gwl r"><small>Rival</small><b>${esc(O.n)}</b><strong>${O.s}</strong></div></div>
    <div class="so-gwb" role="img" aria-label="${E.s} pontos contra ${O.s}"><i style="width:${pe}%"></i></div>
    <div class="so-gwt"><div><small>Quem mais pontuou</small><ol>${topL(E.top)}</ol></div><div><small>No rival</small><ol>${topL(O.top)}</ol></div></div>
    <p class="so-gwn">${fim ? (r === 'emp' ? 'Empate: cada membro dos dois clãs ganhou 20 pontos.' : `Cada membro de ${esc(r === 'vit' ? E.n : O.n)} ganhou 50 pontos no ranking dos animes.`) : 'Contam os pontos que os membros de cada clã ganham nos jogos e desafios dos Animes durante 7 dias. O clã vencedor ganha 50 pontos para cada membro.'}</p></div>`; };
const gwSec = c => { const g = c.guerra, livre = !g || !['ativa', 'proposta'].includes(g.estado), L = S.gL && S.gL.cid === c.id ? S.gL.L.filter(x => x.id !== c.id && !x.membro) : null;
  if (cPode(c, 'guerra') && livre && (!S.gL || S.gL.cid !== c.id) && !S.gbusy) { S.gbusy = 1; call('claBuscar', { q: '' }).then(j => { S.gL = { cid: c.id, L: j.clas }; }).catch(() => { }).finally(() => { S.gbusy = 0; OS.request(); }); }
  const conv = c.convites.length ? `<div class="so-gwc">${c.convites.map(w => `<div class="so-gwi" style="--cl:${esc(w.cA)}"><p>${UI.ic('swords')}<span><b>${esc(w.nA)}</b> desafiou o teu clã para uma guerra de 7 dias.</span></p>${c.gere ? `<div class="row gap6"><button type="button" class="btn sm an-cta" data-act="soGwResp" data-wid="${esc(w.id)}" data-cid="${esc(c.id)}" data-sim="1">Aceitar a guerra</button><button type="button" class="btn sm an-ghost" data-act="soGwResp" data-wid="${esc(w.id)}" data-cid="${esc(c.id)}">Recusar</button></div>` : '<small>Quem gere o clã decide se aceita.</small>'}</div>`).join('')}</div>` : '';
  const des = cPode(c, 'guerra') && livre ? `<div class="so-gwd"><b>Desafiar outro clã</b><p class="mut">Se aceitarem, durante 7 dias ganha o clã cujos membros fizerem mais pontos nos jogos e desafios dos Animes.</p>
      <form data-form="soGwBuscar" data-cid="${esc(c.id)}" class="so-f row gap8" role="search" autocomplete="off"><input class="field grow" type="search" name="q" maxlength="40" placeholder="Nome do clã rival" aria-label="Procurar um clã para desafiar" value="${esc(S.gq || '')}"><button class="btn an-ghost">${UI.ic('search')}Procurar</button></form>
      ${L ? L.length ? `<ul class="so-crl">${L.slice(0, 12).map(x => claRes(x, 'desafiar', c.id)).join('')}</ul>` : '<p class="mut">Nenhum clã encontrado.</p>' : ld('A procurar rivais…')}</div>` : '';
  const hist = c.hist.filter(w => !g || w.id !== g.id || g.estado !== 'fim');
  return `<section class="so-sec so-gws-sec"><h3>${UI.ic('swords')}Guerra de clãs${c.vit || c.der || c.emp ? ` <small class="so-rec">${c.vit} V · ${c.der} D${c.emp ? ' · ' + c.emp + ' E' : ''}</small>` : ''}</h3>
    ${g ? gwCard(g) : ''}${conv}${des}${!g && !conv && !des ? '<p class="mut">O teu clã não está em nenhuma guerra. Quem gere o clã pode desafiar outro.</p>' : ''}
    ${hist.length ? `<details class="so-hist"><summary>Últimas guerras</summary><ul>${hist.map(w => { const e = w.meu || 'a', E = lado(w, e), O = lado(w, e === 'a' ? 'b' : 'a'), r = w.venc === 'empate' ? 'emp' : w.venc === e ? 'vit' : 'der'; return `<li class="${r}"><b>${r === 'vit' ? 'Vitória' : r === 'der' ? 'Derrota' : 'Empate'}</b><span>contra ${esc(O.n)}</span><em>${E.s} – ${O.s}</em></li>`; }).join('')}</ul></details>` : ''}</section>`; };
// as vagas do clã: 20 de base; qualquer membro reforça com Selos (+10 vagas cada reforço, para sempre)
const vagasSec = c => { const V = c.vagas || 20, p = Math.min(100, Math.round(c.n / V * 100)), cheio = c.n >= V, sl = OS.Selos, custo = 200;
  if (sl && sl.carregar) sl.carregar(false);
  return `<section class="so-sec so-vg"><h3>${UI.ic('users')}Vagas <small class="so-rec">${c.n} de ${V}</small></h3>
    <div class="so-vgb${cheio ? ' cheio' : p >= 85 ? ' quase' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${V}" aria-valuenow="${c.n}" aria-label="${c.n} de ${V} vagas ocupadas"><i style="width:${p}%"></i></div>
    <p class="mut so-sub">${cheio ? 'O clã está cheio: os pedidos para entrar ficam à espera até haver vaga.' : `Faltam ${V - c.n} ${V - c.n === 1 ? 'vaga' : 'vagas'}.`} Cada reforço dá mais 10 vagas ao clã, para sempre.${V >= 200 ? ' Este clã já tem o máximo de vagas.' : ''}</p>
    ${V < 200 ? `<div class="row gap8" style="flex-wrap:wrap;align-items:center"><button type="button" class="btn an-cta" data-act="soReforco" data-id="${esc(c.id)}">${sl ? sl.ic(18) : ''}Reforçar com ${custo} Selos</button>${sl ? sl.chip() : ''}</div>` : ''}
    ${(c.ref || []).length ? `<p class="so-refs">${UI.ic('star')}<span>Reforçado por ${c.ref.map(r => `<b>${esc(r.nome)}</b>${r.n > 1 ? ' (' + r.n + '×)' : ''}`).join(', ')}</span></p>` : ''}</section>`; };
// v3.93: clãs aliados (até 3): aparecem aqui, não entram em guerra entre si; o dono propõe pelo código e aceita ou desfaz
const aliSec = (c, dono) => { const A = c.aliados || [], R = c.aliRec || [], E = c.aliEnv || [], max = c.aliMax || 3; if (!A.length && !dono) return '';
  const li = (x, bt) => `<li style="--cl:${esc(x.cor)}">${claImg(x, 36)}<span><b>${esc(x.nome)}</b><small>${membros(x.n)}${x.vit ? ' · ' + vits(x.vit) : ''}</small></span>${bt || ''}</li>`;
  return `<section class="so-sec so-ali"><h3>${UI.ic('users')}Clãs aliados <span class="so-bdg">${A.length}/${max}</span></h3>
    ${A.length ? `<ul class="so-all">${A.map(x => li(x, dono ? `<button type="button" class="btn xs an-ghost" data-act="soAliDesfazer" data-id="${esc(c.id)}" data-alvo="${esc(x.id)}" data-n="${esc(x.nome)}">Desfazer</button>` : '')).join('')}</ul>` : '<p class="mut">Ainda sem aliados. Aliados aparecem aqui e não podem entrar em guerra convosco.</p>'}
    ${dono && R.length ? `<h4>Propostas de aliança</h4><ul class="so-all">${R.map(x => li(x, `<span class="so-mbt"><button type="button" class="btn xs an-cta" data-act="soAliResp" data-id="${esc(c.id)}" data-de="${esc(x.id)}" data-sim="1">Aceitar</button><button type="button" class="btn xs an-ghost" data-act="soAliResp" data-id="${esc(c.id)}" data-de="${esc(x.id)}">Recusar</button></span>`)).join('')}</ul>` : ''}
    ${dono && E.length ? `<p class="mut">À espera de resposta: ${E.map(x => esc(x.nome)).join(', ')}.</p>` : ''}
    ${dono && A.length < max ? `<form data-form="soAliar" class="so-f row gap8" autocomplete="off"><input type="hidden" name="id" value="${esc(c.id)}"><input class="field grow" name="cod" maxlength="12" placeholder="Código do clã (CL-XXXXXX)" aria-label="Código do clã para propor aliança" required><button class="btn an-ghost">Propor aliança</button></form>` : ''}</section>`; };
const claView = cid => { const c = S.cla[cid]; if (!c || Date.now() - (c._at || 0) > 60e3) verCla(cid);
  if (!c) return `<section class="so-sec">${erroBox('cla') || ld('A abrir o clã…')}<button type="button" class="btn sm an-ghost" data-act="soVoltar">${UI.ic('left')}Voltar</button></section>`;
  const me = meuId(), eu0 = c.membros.find(m => m.id === me) || {}, gere = !!(c.perms || []).length, dono = eu0.papel === 'dono', pd = k => cPode(c, k);
  const foto = pd('editar') ? `<div class="so-fot"><label class="btn sm an-ghost so-fup">${UI.ic('camera')}${c.foto ? 'Mudar a foto' : 'Pôr uma foto no clã'}<input type="file" accept="image/*" data-clafoto="${esc(c.id)}"></label>${c.foto ? `<button type="button" class="btn sm an-ghost" data-act="soClaFotoX" data-id="${esc(c.id)}">Tirar a foto</button>` : ''}<button type="button" class="btn sm an-ghost" data-act="soClaEd" data-id="${esc(c.id)}">${UI.ic('edit')}Editar o clã</button></div>` : '';
  const ed = pd('editar') && OS.ui.soClEd === c.id ? `<form class="so-f so-cled" data-form="soClaEditar" data-id="${esc(c.id)}" autocomplete="off"><b>Editar o clã</b><label class="so-lb"><span>Nome</span><input class="field" name="nome" maxlength="28" minlength="3" required value="${esc(c.nome)}"></label>
      <label class="so-lb"><span>Descrição</span><textarea class="field" name="desc" maxlength="300" rows="3" placeholder="O que é o clã, o que fazem juntos, quem procuram">${esc(c.desc || '')}</textarea></label>
      <div class="so-cores" role="radiogroup" aria-label="Cor do clã">${CORES.map(x => `<label><input type="radio" name="cor" value="${x}" ${x.toLowerCase() === String(c.cor || '').toLowerCase() ? 'checked' : ''}><i style="background:${x}"></i></label>`).join('')}</div>
      <div class="row gap8"><button class="btn an-cta">Guardar</button><button type="button" class="btn an-ghost" data-act="soClaEd" data-id="">Cancelar</button></div><small class="mut">A IA verifica o nome e a descrição antes de aparecerem.</small></form>` : '';
  const ped = pd('pedidos') && c.pedidos.length ? `<section class="so-sec"><h3>Pedidos para entrar <span class="so-bdg">${c.pedidos.length}</span></h3><ul class="so-pdl">${c.pedidos.map(p => `<li>${OS.AnimeSoc ? OS.AnimeSoc.av(p, 36) : ''}<span><b>${esc(p.nome)}</b><small>${p.user ? '@' + esc(p.user) + ' · ' : ''}pediu ${quando(p.at)}</small></span><button type="button" class="btn xs an-cta" data-act="soClaResp" data-id="${esc(c.id)}" data-quem="${esc(p.id)}" data-sim="1">Aceitar</button><button type="button" class="btn xs an-ghost" data-act="soClaResp" data-id="${esc(c.id)}" data-quem="${esc(p.id)}">Recusar</button></li>`).join('')}</ul></section>` : '';
  const sel = m => pd('cargos') && m.papel !== 'dono' && (m.id !== me || dono) ? `<label class="so-cgs"><select aria-label="Cargo de ${esc(m.nome)}" data-cargo-cla="${esc(c.id)}" data-m="${esc(m.id)}"><option value="">Sem cargo</option>${(c.cargos || []).map(g => `<option value="${esc(g.id)}" ${m.cargo === g.id ? 'selected' : ''}>${esc(g.nome)}</option>`).join('')}</select></label>` : '';
  return `<section class="so-sec so-clv"><div class="so-clh" style="--cl:${esc(c.cor)}"><button type="button" class="btn sm an-ghost" data-act="soVoltar">${UI.ic('left')}Voltar</button>
      <div class="so-clt">${claImg(c, 76)}<div><b>${esc(c.nome)}</b>${c.desc ? `<p class="so-cldesc">${esc(c.desc)}</p>` : pd('editar') ? `<p class="so-cldesc mut">Ainda sem descrição. Toca em Editar o clã para escreveres uma.</p>` : ''}<small>${membros(c.n)} de ${c.vagas || 20} vagas · ${c.pts} pontos${c.vit ? ' · ' + vits(c.vit) + ' em guerras' : ''}${eu0.cg ? ' · o teu cargo: ' + esc(eu0.cg) : ''}</small></div></div>${foto}${ed}
      ${pd('editar') ? `<p class="so-nota so-nota-cl">${UI.ic('shield')}A IA verifica cada foto antes de aparecer: sem nudez, conteúdo sexual, violência ou ódio.</p>` : ''}</div>
    <div class="row gap8" style="flex-wrap:wrap"><button type="button" class="btn an-cta" data-act="soAbrir" data-k="c-${esc(c.id)}">${UI.ic('chat')}Conversa do clã</button><button type="button" class="btn an-ghost" data-act="soCopiar" data-v="CL-${esc(c.cod)}">${UI.ic('copy')}Código: CL-${esc(c.cod)}</button><button type="button" class="btn an-ghost" data-act="soSair" data-id="${esc(c.id)}">Sair do clã</button></div>
    <p class="mut so-sub">Quem usar o código envia um pedido para entrar${pd('pedidos') ? ', que tu aceitas ou recusas aqui' : ''}.</p>
    ${ped}${vagasSec(c)}${aliSec(c, pd('aliancas'))}${gwSec(c)}${cargosSec(c)}
    <section class="so-sec"><h3>Membros por pontos</h3><ol class="rk-l">${c.membros.map((m, i) => `<li class="${m.id === me ? 'eu' : ''}"><b>${i + 1}.º</b><span class="rk-n">${OS.AnimeSoc ? OS.AnimeSoc.av(m, 28) : ''}${esc(m.nome)}${m.user ? ` <small>@${esc(m.user)}</small>` : ''}${m.cg ? ` <i class="so-cg${m.papel === 'dono' ? ' ld' : ''}" style="--gc:${esc(((c.cargos || []).find(g => g.id === m.cargo) || {}).cor || '')}">${esc(m.cg)}</i>` : ''}${m.id === me ? ' (tu)' : ''}</span><em>${m.pts} pts</em>${m.id !== me && m.papel !== 'dono' && (pd('cargos') || pd('expulsar')) ? `<span class="so-mbt">${sel(m)}${pd('expulsar') ? `<button type="button" class="btn xs an-ghost" data-act="soTirar" data-id="${esc(c.id)}" data-m="${esc(m.id)}">Tirar do clã</button>` : ''}</span>` : m.id === me && dono ? '' : ''}</li>`).join('')}</ol></section></section>`; };
// v3.99 · cargos do clã: cada cargo tem um nome, uma cor e o que pode fazer. Todos veem os cargos; quem os gere cria, muda e apaga.
const PERM_T = { editar: 'Editar o clã (nome, descrição, cor e foto)', pedidos: 'Aceitar e recusar pedidos para entrar', expulsar: 'Tirar pessoas do clã', guerra: 'Desafiar e responder a guerras', aliancas: 'Propor e gerir alianças', cargos: 'Criar cargos e dar cargos às pessoas' };
const cPode = (c, k) => !!c && (c.perms || []).includes(k);
const cargosSec = c => { const G = c.cargos || [], gere = cPode(c, 'cargos'), dono = !!c.dono, edit = OS.ui.soCgEd || '', cur = G.find(g => g.id === edit) || null;
  if (!G.length && !gere) return '';
  const form = gere && (edit === 'novo' || cur) ? `<form class="so-f so-cgf" data-form="soCargo" data-id="${esc(c.id)}" data-cg="${esc(cur ? cur.id : '')}" autocomplete="off"><b>${cur ? 'Mudar o cargo' : 'Novo cargo'}</b><input class="field" name="nome" maxlength="20" minlength="2" required placeholder="Nome do cargo (ex.: Capitão, Recrutador)" value="${esc(cur ? cur.nome : '')}">
      <div class="so-cores" role="radiogroup" aria-label="Cor do cargo">${CORES.map((x, i) => `<label><input type="radio" name="cor" value="${x}" ${(cur ? cur.cor === x : !i) ? 'checked' : ''}><i style="background:${x}"></i></label>`).join('')}</div>
      <fieldset class="so-perms"><legend>O que este cargo pode fazer</legend>${Object.entries(PERM_T).filter(([k]) => dono || k !== 'cargos').map(([k, t]) => `<label><input type="checkbox" name="perm" value="${k}" ${cur && (cur.perms || []).includes(k) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</fieldset>
      <div class="row gap8"><button class="btn an-cta">${cur ? 'Guardar' : 'Criar o cargo'}</button><button type="button" class="btn an-ghost" data-act="soCgEd" data-g="">Cancelar</button></div></form>` : '';
  return `<section class="so-sec so-cgsec"><h3>Cargos</h3><p class="mut so-sub">O líder pode tudo. Cada cargo só faz o que estiver marcado.${gere ? ' Dá um cargo a alguém na lista de membros.' : ''}</p>
    ${G.length ? `<ul class="so-cgl">${G.map(g => `<li style="--gc:${esc(g.cor || '#6b7280')}"><span class="so-cgn"><i></i><b>${esc(g.nome)}</b><small>${g.n} ${g.n === 1 ? 'pessoa' : 'pessoas'}</small></span><span class="so-cgp">${(g.perms || []).length ? g.perms.map(k => `<em>${esc((PERM_T[k] || k).split(' (')[0])}</em>`).join('') : '<em class="mut">Sem permissões (só o título)</em>'}</span>${gere && (dono || !(g.perms || []).includes('cargos')) ? `<span class="so-cga"><button type="button" class="btn xs an-ghost" data-act="soCgEd" data-g="${esc(g.id)}">Mudar</button><button type="button" class="btn xs an-ghost" data-act="soCgApagar" data-id="${esc(c.id)}" data-g="${esc(g.id)}">Apagar</button></span>` : ''}</li>`).join('')}</ul>` : '<p class="mut">Ainda não há cargos neste clã.</p>'}
    ${form || (gere && G.length < 8 ? `<button type="button" class="btn sm an-ghost" data-act="soCgEd" data-g="novo">${UI.ic('plus')}Criar um cargo</button>` : '')}</section>`; };
A.soClaEd = b => { OS.ui.soClEd = b.dataset.id || ''; OS.request(); };
A.soCgEd = b => { OS.ui.soCgEd = b.dataset.g || ''; OS.request(); };
OS.forms.soClaEditar = (f, v) => { const cid = f.dataset.id; return tenta(() => call('claEditar', { id: cid, nome: v('nome'), desc: v('desc'), cor: (f.querySelector('input[name=cor]:checked') || {}).value }), 'Clã atualizado.').then(r => { if (r) { OS.ui.soClEd = ''; delete S.cla[cid]; verCla(cid); } }); };
OS.forms.soCargo = (f, v) => { const cid = f.dataset.id, perms = [...f.querySelectorAll('input[name=perm]:checked')].map(x => x.value);
  return tenta(() => call('claCargo', { id: cid, cargo: { id: f.dataset.cg || '', nome: v('nome'), cor: (f.querySelector('input[name=cor]:checked') || {}).value, perms } }), f.dataset.cg ? 'Cargo atualizado.' : 'Cargo criado.').then(r => { if (r) { OS.ui.soCgEd = ''; delete S.cla[cid]; verCla(cid); } }); };
A.soCgApagar = async b => { if (!confirm('Apagar este cargo? Quem o tiver fica sem cargo.')) return; const cid = b.dataset.id; await tenta(() => call('claCargoApagar', { id: cid, cargo: b.dataset.g }), 'Cargo apagado.'); delete S.cla[cid]; verCla(cid); };
document.addEventListener('change', async e => { const el = e.target; if (!el || !el.matches || !el.matches('select[data-cargo-cla]')) return; const cid = el.dataset.cargoCla;
  await tenta(() => call('claCargoDar', { id: cid, quem: el.dataset.m, cargo: el.value }), el.value ? 'Cargo dado.' : 'Cargo tirado.'); delete S.cla[cid]; verCla(cid); });
const clasView = () => { if (!conta()) return semConta(); eu(); convs(); const k = convAberta(); if (k) return chatView(k); const cid = claAberto(); if (cid) return claView(cid);
  const d = S.eu; if (!d) return `<section class="hu">${erroBox('eu') || ld('A abrir os clãs…')}</section>`;
  const me = d.eu, cv = S.cv || [];
  return `<section class="hu"><header class="hu-h">${marca('sm')}${OS.Parceria ? OS.Parceria.exclusivo() : ''}<h2>Clãs e conversas</h2><p>Cria um clã, convida amigos e conversa no grupo ou a dois. A IA verifica cada mensagem antes de aparecer.</p></header>
    <div class="so-eu">${OS.AnimeSoc ? OS.AnimeSoc.av(me, 48) : ''}<div><b>${esc(me.nome)}</b>${me.user ? `<small>@${esc(me.user)}</small>` : '<small>Ainda sem @</small>'}<small>${me.pts} pontos no ranking de animes</small></div><div class="row gap6" style="flex-wrap:wrap"><button type="button" class="btn sm an-ghost" data-act="soCopiar" data-v="PR-${esc(me.cod)}">${UI.ic('copy')}O teu código: PR-${esc(me.cod)}</button><button type="button" class="btn sm an-ghost" data-act="apEditar">Perfil dos animes</button>${OS.Selos ? (OS.Selos.carregar(false), OS.Selos.chip()) : ''}</div></div>
    <section class="so-sec"><h3>Conversas</h3>${cv.length ? `<div class="so-cl">${cv.map(c => `<button type="button" class="so-ci${c.novas ? ' nova' : ''}" data-act="soAbrir" data-k="${esc(c.conv)}"><span class="so-av" style="--cl:${esc(c.cor || '#3a3c44')}">${esc((c.nome || '?').slice(0, 1).toUpperCase())}</span><span><b>${esc(c.nome)}</b><small>${c.ult ? esc((c.ult.de === me.id ? 'Tu: ' : c.tipo === 'c' ? c.ult.nome + ': ' : '') + c.ult.t) : c.tipo === 'c' ? 'Clã · ainda sem mensagens' : 'Amigo · ainda sem mensagens'}</small></span>${c.ult ? `<em>${hora(c.ult.at)}</em>` : ''}</button>`).join('')}</div>` : '<p class="mut">Entra num clã ou adiciona um amigo para começares a conversar.</p>'}</section>
    <section class="so-sec"><h3>${d.clas.length > 1 ? 'Os teus clãs' : 'O teu clã'}</h3>${d.clas.length ? `<div class="so-cards">${d.clas.map(c => `<button type="button" class="so-cc" style="--cl:${esc(c.cor)}" data-act="soCla" data-id="${esc(c.id)}">${claImg(c, 44)}<span><b>${esc(c.nome)}</b><small>${membros(c.n)}${c.vit ? ' · ' + vits(c.vit) : ''}</small>${c.ped || c.conv || c.gw ? `<span class="so-cbs">${c.ped ? `<i class="so-cb">${c.ped} ${c.ped === 1 ? 'pedido' : 'pedidos'}</i>` : ''}${c.conv ? '<i class="so-cb">Desafio de guerra</i>' : ''}${c.gw ? '<i class="so-cb gw">Guerra</i>' : ''}</span>` : ''}</span></button>`).join('')}</div>` : '<p class="mut">Ainda não estás em nenhum clã. Procura um abaixo e pede para entrar, ou cria o teu.</p>'}
      ${(d.claPed || []).length ? `<div class="so-pend"><b>Pedidos à espera de resposta</b>${d.claPed.map(x => `<div>${claImg(x, 30)}<span>${esc(x.nome)}</span><button type="button" class="btn xs an-ghost" data-act="soClaCancelar" data-id="${esc(x.id)}">Cancelar</button></div>`).join('')}</div>` : ''}
    </section>
    <section class="so-sec so-exp"><div class="so-tabs" role="tablist" aria-label="Clãs"><button type="button" role="tab" aria-selected="${OS.ui.soClTab !== 'rank'}" class="${OS.ui.soClTab !== 'rank' ? 'on' : ''}" data-act="soClTab" data-t="busca">${UI.ic('search')}Procurar clãs</button><button type="button" role="tab" aria-selected="${OS.ui.soClTab === 'rank'}" class="${OS.ui.soClTab === 'rank' ? 'on' : ''}" data-act="soClTab" data-t="rank">${UI.ic('trophy')}Ranking de clãs</button></div>
      ${OS.ui.soClTab === 'rank' ? rankHTML() : buscaHTML()}
      ${d.clas.length ? `<p class="so-nota so-um">${UI.ic('shield')}<span>Cada pessoa está num clã de cada vez. Para criares um clã ou entrares noutro, primeiro sai do <b>${esc(d.clas[0].nome)}</b> (abre o clã › Sair do clã).</span></p>` : `<div class="so-forms"><form data-form="soClaCriar" class="so-f" autocomplete="off"><b>Criar um clã</b><input class="field" name="nome" maxlength="28" placeholder="Nome do clã" aria-label="Nome do clã" required><input class="field" name="desc" maxlength="160" placeholder="Descrição (opcional)" aria-label="Descrição do clã">
        <div class="so-cores" role="radiogroup" aria-label="Cor do clã">${CORES.map((c, i) => `<label><input type="radio" name="cor" value="${c}" ${i ? '' : 'checked'}><i style="background:${c}"></i></label>`).join('')}</div><button class="btn an-cta">Criar</button></form>
        <form data-form="soClaEntrar" class="so-f" autocomplete="off"><b>Tens um código de clã?</b><input class="field" name="cod" maxlength="12" placeholder="CL-XXXXXX" aria-label="Código do clã" required><button class="btn an-ghost">Pedir para entrar</button><small class="mut">O pedido vai para quem gere o clã.</small></form></div>`}</section>
    <section class="so-sec"><h3>Amigos</h3>${d.pedidos.length ? `<div class="so-ped">${d.pedidos.map(p => `<div><span><b>${esc(p.nome)}</b> quer ser teu amigo.</span><button type="button" class="btn xs an-cta" data-act="soResp" data-id="${esc(p.id)}" data-sim="1">Aceitar</button><button type="button" class="btn xs an-ghost" data-act="soResp" data-id="${esc(p.id)}">Recusar</button></div>`).join('')}</div>` : ''}
      ${d.amigos.length ? `<ul class="so-am">${d.amigos.map(a => `<li><b>${esc(a.nome)}</b><button type="button" class="btn xs an-ghost" data-act="soAbrir" data-k="d-${esc(a.id)}">Conversar</button><button type="button" class="btn xs an-ghost" data-act="soTirarAmigo" data-id="${esc(a.id)}">Remover</button><button type="button" class="btn xs an-ghost" data-act="soBloq" data-id="${esc(a.id)}">Bloquear</button></li>`).join('')}</ul>` : '<p class="mut">Ainda não tens amigos aqui. Partilha o teu código ou escreve o de alguém.</p>'}
      ${d.enviados.length ? `<p class="mut">${d.enviados.length} ${d.enviados.length === 1 ? 'pedido enviado à espera' : 'pedidos enviados à espera'} de resposta.</p>` : ''}
      <form data-form="soAmigo" class="so-f row gap8" autocomplete="off"><input class="field grow" name="cod" maxlength="12" placeholder="Código do amigo (PR-XXXXXX)" aria-label="Código do amigo" required><button class="btn an-ghost">Adicionar</button></form>
      ${d.bloq.length ? `<details class="so-bl"><summary>${d.bloq.length} ${d.bloq.length === 1 ? 'pessoa bloqueada' : 'pessoas bloqueadas'}</summary>${d.bloq.map(id => `<div><span>Pessoa bloqueada</span><button type="button" class="btn xs an-ghost" data-act="soDesbloq" data-id="${esc(id)}">Desbloquear</button></div>`).join('')}</details>` : ''}</section>
    ${erroBox('eu')}</section>`; };
const depois = (msg, tipo) => { if (msg) UI.toast(msg, tipo || 'pos'); eu(true); convs(true); };
const tenta = async (fn, ok) => { try { const r = await fn(); depois(typeof ok === 'function' ? ok(r) : ok); return r; } catch (e) { UI.toast(e.message, 'neg'); } };
A.soAbrir = b => { OS.ui.soConv = b.dataset.k; OS.ui.soCla = ''; DRAFT = ''; if (OS.route().base !== 'animes' || OS.route().sub !== 'clas') location.hash = 'animes.clas'; OS.request(); desce(true); };
A.soCla = b => { OS.ui.soCla = b.dataset.id; OS.ui.soConv = ''; delete S.cla[b.dataset.id]; if (OS.route().sub !== 'clas') location.hash = 'animes.clas'; OS.request(); };
A.soVoltar = () => { OS.ui.soConv = ''; OS.ui.soCla = ''; convs(true); OS.request(); };
A.soCopiar = async b => { try { await navigator.clipboard.writeText(b.dataset.v); UI.toast('Código copiado: ' + b.dataset.v, 'pos'); } catch (e) { UI.toast('O código é ' + b.dataset.v, 'pos'); } };
A.soNome = async () => { const n = prompt('O teu nome nos clãs e no ranking (2 a 24 letras):', (S.eu && S.eu.eu.nome) || ''); if (n == null) return; await tenta(() => call('nome', { nome: n }), 'Nome mudado.'); };
A.soResp = b => tenta(() => call('amigoResp', { id: b.dataset.id, aceitar: !!b.dataset.sim }), b.dataset.sim ? 'Agora são amigos.' : 'Pedido recusado.');
A.soTirarAmigo = b => { if (confirm('Remover esta pessoa dos teus amigos?')) tenta(() => call('amigoTirar', { id: b.dataset.id }), 'Removido dos amigos.'); };
A.soBloq = async b => { if (!confirm('Bloquear esta pessoa? Deixa de poder falar contigo e de te adicionar, e deixas de ver as mensagens dela nos clãs.')) return; await tenta(() => call('bloquear', { id: b.dataset.id }), 'Pessoa bloqueada.'); OS.ui.soConv = ''; OS.request(); };
A.soDesbloq = b => tenta(() => call('bloquear', { id: b.dataset.id, on: false }), 'Pessoa desbloqueada.');
A.soSair = async b => { if (!confirm('Sair deste clã?')) return; await tenta(() => call('claSair', { id: b.dataset.id }), 'Saíste do clã.'); OS.ui.soCla = ''; OS.request(); };
A.soTirar = async b => { if (!confirm('Tirar esta pessoa do clã? Não vai poder voltar a entrar com o código.')) return; await tenta(() => call('claTirar', { id: b.dataset.id, membro: b.dataset.m }), 'Pessoa tirada do clã.'); delete S.cla[b.dataset.id]; OS.request(); };
A.soDen = async b => { const k = convAberta(), m = (msgsDe(k) || []).find(x => x.id === b.dataset.mid); if (!m) return; const mot = prompt(`Denunciar a mensagem de ${m.nome}?\n«${m.t.slice(0, 120)}»\n\nPorquê? (opcional)`, ''); if (mot == null) return;
  try { await call('denunciar', { conv: k, mid: m.id, motivo: mot }); UI.toast('Denúncia enviada. A equipa do Prumo vai ver.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } };
OS.forms = OS.forms || {};
OS.forms.soEnviar = async (f, v) => { const t = v('t'), k = convAberta(); if (!t || !k) return; const inp = f.elements.t, btn = f.querySelector('button'); if (btn) btn.disabled = true;
  try { const j = await call('enviar', { conv: k, texto: t });
    if (j.barrada) { UI.toast('A mensagem não foi enviada: ' + j.motivo, 'neg'); }
    else { DRAFT = ''; if (inp) inp.value = ''; S.msgs[k] = (msgsDe(k) || []).concat(j.msg); desce(true); } } catch (e) { UI.toast(e.message, 'neg'); if (e.status === 403) eu(true); }
  if (btn) btn.disabled = false; OS.request(); };
OS.forms.soAmigo = (f, v) => tenta(() => call('amigoPedir', { cod: v('cod') }), r => r.amigos ? `Agora és amigo de ${r.nome}.` : `Pedido enviado a ${r.nome}.`).then(r => { if (r) f.reset(); });
OS.forms.soClaCriar = (f, v) => tenta(() => call('claCriar', { nome: v('nome'), desc: v('desc'), cor: (f.querySelector('input[name=cor]:checked') || {}).value }), r => `Clã ${r.cla.nome} criado. Partilha o código CL-${r.cla.cod}.`).then(r => { if (r) f.reset(); });
OS.forms.soAliar = (f, v) => tenta(() => call('claAliar', { id: v('id'), cod: v('cod') }), r => r.aliados ? 'Agora são aliados.' : `Proposta de aliança enviada ao clã ${r.cla.nome}.`).then(r => { if (r) { f.reset(); verCla(v('id')); } });
OS.forms.soClaEntrar = (f, v) => tenta(() => call('claEntrar', { cod: v('cod') }), r => `Pedido enviado ao clã ${r.cla.nome}. Quem gere o clã vai responder.`).then(r => { if (r) { f.reset(); marcaBusca(r.cla.id, { pedi: true }); } });
OS.forms.soClaBuscar = (f, v) => buscar(v('q'));
OS.forms.soGwBuscar = async (f, v) => { const cid = f.dataset.cid; S.gq = v('q'); try { S.gL = { cid, L: (await call('claBuscar', { q: S.gq })).clas }; } catch (e) { UI.toast(e.message, 'neg'); } OS.request(); };
A.soReforco = async b => { const sl = OS.Selos, s = sl ? sl.saldo() : 0;
  if (s < 200) { UI.toast(`Um reforço custa 200 Selos e tens ${s}. Compra Selos na página Selos.`, 'warn'); location.hash = 'selos'; return; }
  if (!confirm('Reforçar o clã com 200 Selos? O clã ganha mais 10 vagas, para sempre.')) return;
  try { const r = await call('claReforco', { id: b.dataset.id }); if (sl) sl.set({ carteira: r.carteira }); UI.toast(`Clã reforçado: agora tem ${r.vagas} vagas.`, 'pos'); verCla(b.dataset.id); } catch (e) { UI.toast(e.message, 'neg'); } };
A.soClTab = b => { OS.ui.soClTab = b.dataset.t; OS.request(); };
A.soCrkTodos = () => { OS.ui.soCrkTodos = !OS.ui.soCrkTodos; OS.request(); };
A.soAliResp = b => tenta(() => call('claAliResp', { id: b.dataset.id, de: b.dataset.de, sim: !!b.dataset.sim }), r => r.aliados ? 'Agora são aliados.' : 'Proposta recusada.').then(r => { if (r) verCla(b.dataset.id); });
A.soAliDesfazer = b => UI.ask('Desfazer a aliança?', `O vosso clã e o ${b.dataset.n} deixam de ser aliados.`, 'Desfazer', () => tenta(() => call('claAliDesfazer', { id: b.dataset.id, alvo: b.dataset.alvo }), () => 'Aliança desfeita.').then(r => { if (r) verCla(b.dataset.id); }));
A.soClaPedir = b => tenta(() => call('claPedir', { id: b.dataset.id }), r => `Pedido enviado ao clã ${r.cla.nome}. Quem gere o clã vai responder.`).then(r => { if (r) marcaBusca(b.dataset.id, { pedi: true }); });
A.soClaCancelar = b => tenta(() => call('claCancelar', { id: b.dataset.id }), 'Pedido cancelado.').then(r => { if (r) marcaBusca(b.dataset.id, { pedi: false }); });
A.soClaResp = async b => { const sim = !!b.dataset.sim; await tenta(() => call('claResponder', { id: b.dataset.id, quem: b.dataset.quem, sim }), sim ? 'Pedido aceite: já faz parte do clã.' : 'Pedido recusado.'); verCla(b.dataset.id); };
A.soClaMod = async b => { await tenta(() => call('claMod', { id: b.dataset.id, quem: b.dataset.m }), 'Moderadores atualizados.'); verCla(b.dataset.id); };
A.soClaFotoX = async b => { if (!confirm('Tirar a foto do clã?')) return; await tenta(() => call('claFoto', { id: b.dataset.id, apagar: true }), 'Foto tirada.'); verCla(b.dataset.id); };
A.soGwDesafiar = async b => { if (!confirm(`Desafiar ${b.dataset.n} para uma guerra de clãs de 7 dias?`)) return; const r = await tenta(() => call('claDesafiar', { id: b.dataset.id, alvo: b.dataset.alvo }), `Desafio enviado a ${b.dataset.n}. Falta a resposta deles.`); if (r) { S.gL = null; verCla(b.dataset.id); } };
A.soGwResp = async b => { const sim = !!b.dataset.sim; if (sim && !confirm('Aceitar a guerra? Durante 7 dias ganha o clã cujos membros fizerem mais pontos nos jogos e desafios dos Animes.')) return; await tenta(() => call('claGuerraResp', { wid: b.dataset.wid, sim }), sim ? 'A guerra começou. Boa sorte.' : 'Desafio recusado.'); verCla(b.dataset.cid); };
// a foto do clã: reduzida no telemóvel (320 px) e verificada pela IA no servidor antes de ficar visível
document.addEventListener('change', async e => { const t = e.target; if (!t || !t.dataset || !t.dataset.clafoto) return; const f = t.files && t.files[0], cid = t.dataset.clafoto; t.value = ''; if (!f) return;
  if (!/^image\//.test(f.type || 'image/') || f.size > 30e6) return UI.toast('Escolhe uma imagem (JPEG, PNG ou HEIC).', 'neg');
  try { UI.toast('A IA está a verificar a foto…'); const b64 = await OS.AnimeSoc.reduz(f, 320, 320, .86, true), r = await call('claFoto', { id: cid, b64 }); if (S.cla[cid]) S.cla[cid].foto = r.foto; UI.toast('Foto do clã guardada.', 'pos'); eu(true); rankCla(true); S.bL = null; OS.request(); }
  catch (er) { UI.toast(er.message, 'neg'); } });
document.addEventListener('input', e => { if (e.target && e.target.id === 'soTxt') DRAFT = e.target.value; });

/* ---------- a tela de Jogos ---------- */
const domTile = () => { let lv = 0, born = false; try { born = !!OS.one('dominus').born; lv = born ? OS.Dom.level() : 0; } catch (e) { }
  return `<a class="jg-t jg-dom" href="#dominus"><span class="jg-ic">${UI.ic('crown')}</span><b>Dominus</b><p>O RPG da tua vida: o herói sobe de nível com o que fazes de verdade.</p><small>${born ? 'Nível ' + lv : 'Cria o teu herói'}</small></a>`; };
const huTile = () => { const h = S.h; if (!conta()) return `<a class="pc-hu" href="#animes.pursuit"><small>Pursuit · SuperAnimes · todos os dias às 20h</small><b>Adivinha o anime</b><span>Entra na tua conta para jogar.</span></a>`;
  hunter(); if (!h) return `<a class="pc-hu" href="#animes.pursuit"><small>Pursuit · SuperAnimes · todos os dias às 20h</small><b>Adivinha o anime</b><span>A abrir…</span></a>`;
  const t = h.fase === 'espera' ? { s: 'Começa daqui a', at: h.abreAt } : h.fase === 'aberto' ? { s: h.meu ? 'Já marcaste · fecha daqui a' : 'A decorrer · fecha daqui a', at: h.fechaAt } : null;
  return `<a class="pc-hu${h.fase === 'aberto' ? ' on' : ''}" href="#animes.pursuit"><small>Pursuit · SuperAnimes · todos os dias às 20h</small><b>${h.fase === 'fechado' ? esc(h.resposta.titulo) : 'Adivinha o anime'}</b>${t ? `<span>${t.s} <em data-ate="${t.at}">${dur(t.at - agora())}</em></span>` : `<span>${h.meu && h.meu.certo ? 'Acertaste hoje.' : 'Era este o de hoje. Amanhã há mais.'}</span>`}</a>`; };
V.jogos = () => { parcLoad(); if (conta()) rank();
  const r = S.rk, top = r && r.lista.length ? r.lista.slice(0, 3) : [];
  const hero = `<section class="pc-hero" aria-label="Parceria">
      <div class="pc-l"><span class="pc-lab">Parceria</span><div class="pc-who">${logo(44)}<b>Prumo</b></div><p>A tua vida em ordem.</p></div>
      <div class="pc-r${ePh() ? ' ph' : ''}">${ePh() ? '<img class="pc-ar" src="icons/phantom-aranha.webp" alt="" width="401" height="440" decoding="async"><img class="pc-nm" src="icons/phantom-nome.webp" alt="PHANTOM" width="560" height="166" decoding="async">' : `<div class="pc-who pc-who2"><b>${esc(pNome())}</b></div>`}<p>Os animes, o Pursuit e os clãs.</p></div>
      <span class="pc-seam" aria-hidden="true"></span><span class="pc-big" aria-hidden="true">&amp;</span></section>
    <div class="pc-row">${huTile()}
      <a class="pc-rk" href="#animes.ranking"><small>Ranking de animes</small>${top.length ? `<ol>${top.map(x => `<li><b>${x.pos}.º</b><span>${esc(x.nome)}</span><em>${x.p}</em></li>`).join('')}</ol>` : `<b>Ninguém pontuou ainda</b><span>${conta() ? 'Joga o Pursuit e fica em primeiro.' : 'Entra na tua conta para jogar.'}</span>`}</a>
      <a class="pc-cl" href="#animes.clas"><small>Clãs e conversas</small><b>Joga em grupo</b><span>Cria um clã, convida amigos e conversa. A IA protege cada conversa.</span></a></div>
    <div class="row gap8 pc-acts"><a class="btn pri" href="#animes">${UI.ic('tv')}Abrir os Animes</a>${PARC.site ? `<a class="btn ghost" href="${esc(PARC.site)}" target="_blank" rel="noopener noreferrer">Site da ${esc(pNome())}</a>` : ''}</div>`;
  const adm = OS.Acc && OS.Acc.adm && OS.Acc.adm() ? `<details class="pn jg-adm"><summary><b>Administração da parceria</b></summary><form data-form="soParc" class="row gap8" style="flex-wrap:wrap;margin-top:10px" autocomplete="off"><input class="field grow" name="nome" maxlength="30" placeholder="Nome do parceiro" value="${esc(pNome())}" aria-label="Nome do parceiro"><input class="field grow" name="site" maxlength="200" placeholder="https://site-do-parceiro" value="${esc(PARC.site || '')}" aria-label="Site do parceiro"><button class="btn pri">Guardar</button></form>
      <p class="mut" style="margin:8px 0 0">O nome aparece na tela de Jogos e nos Animes de todas as contas. Deixa vazio para voltar a PHANTOM.</p><div id="soDenAdm">${denAdm()}</div></details>` : '';
  return UI.head('Jogos', 'Os jogos do Prumo e dos parceiros. Joga, ganha pontos e sobe no ranking.', '', 'Visão geral') + hero
    + `<h3 class="jg-h">Jogos do Prumo</h3><div class="jg-g">${domTile()}<a class="jg-t" href="#floresta"><span class="jg-ic">${UI.ic('tree')}</span><b>Floresta</b><p>Foca-te e faz crescer uma árvore. Se saíres antes do fim, ela morre.</p><small>Jogo de foco</small></a><a class="jg-t" href="#dominus.bestiario"><span class="jg-ic">${UI.ic('skull')}</span><b>Masmorras</b><p>Monstros que só caem com avanço real nas tuas metas.</p><small>Dentro do Dominus</small></a></div>` + adm; };
// administração: o nome do parceiro e as denúncias das conversas
let DEN = null; const denAdm = () => { if (DEN === null) { DEN = []; call('adminDenuncias').then(j => { DEN = j.denuncias; OS.request(); }).catch(() => { }); }
  return `<h4 style="margin:14px 0 6px">Denúncias das conversas</h4>${DEN.length ? DEN.map(d => `<div class="so-dn"><p><b>${esc(d.nome)}</b>: «${esc(d.t)}»</p><small>${new Date(d.at).toLocaleString('pt-PT')}${d.motivo ? ' · motivo: ' + esc(d.motivo) : ''}</small><div class="row gap6"><button type="button" class="btn xs" data-act="soAdmApagar" data-ref="${esc(d.ref)}">Apagar a mensagem</button><button type="button" class="btn xs danger" data-act="soAdmApagar" data-ref="${esc(d.ref)}" data-mudo="1">Apagar e silenciar 7 dias</button></div></div>`).join('') : '<p class="mut">Sem denúncias.</p>'}`; };
A.soAdmApagar = async b => { try { await call('adminApagar', { ref: b.dataset.ref, mudo: !!b.dataset.mudo }); DEN = null; UI.toast('Feito.', 'pos'); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
OS.forms.soParc = async (f, v) => { try { const j = await call('adminParceiro', { nome: v('nome'), site: v('site') }); PARC = { nome: j.parceiro.nome, site: j.parceiro.site, at: Date.now() }; U.ls.set(PK, PARC); UI.toast('Parceria guardada.', 'pos'); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };

/* ---------- contagens a correr e conversas a chegar ---------- */
setInterval(() => { const els = document.querySelectorAll('[data-ate]'); if (!els.length) return; let passou = false; const n = agora();
  els.forEach(el => { const at = +el.dataset.ate, ms = at - n; if (ms <= 0) passou = true; el.textContent = dur(ms); }); if (passou && S.h && Date.now() - (S.at.h || 0) > 5e3) hunter(true); }, 1000);
const tick = () => { if (document.hidden || !conta()) return; const r = OS.route(); if (r.base !== 'animes' || r.sub !== 'clas') return; const k = convAberta(); if (k) { if (!S.busy['p' + k]) { S.busy['p' + k] = 1; lerMsgs(k).finally(() => { S.busy['p' + k] = 0; }); } } else convs(); };
POLL = setInterval(tick, 4000);
OS.on && OS.on('ready', () => { parcLoad(); setTimeout(() => { if (conta() && U.ls.get('oc_hunter_on', 0)) hunter(); }, 6000); });
// insígnia no menu: Pursuit a decorrer e ainda não marcaste
const badge = () => { const h = S.h; return h && h.fase === 'aberto' && !h.meu ? [1, 'neg'] : null; };
OS.on && OS.on('render', () => { const r = OS.route(); if (r.base === 'animes' && r.sub === 'pursuit') U.ls.set('oc_hunter_on', 1); if (!(r.base === 'animes' && r.sub === 'clas') && (OS.ui.soConv || OS.ui.soCla)) { OS.ui.soConv = ''; OS.ui.soCla = ''; } });
/* ---------- v3.78 · Definições › Sugestões e reclamações (vão para a caixa da Comunidade na Administração) ---------- */
let FB = { t: 'sugestao', tx: '', busy: false, ok: '' };
const fbPanel = () => `<div class="pn" id="fbSet"><div class="pn-h"><h3>${UI.ic('mail')}Sugestões e reclamações</h3></div>
  <p class="mut" style="margin:0 0 10px;font-size:13px">O que queres que melhore, o que falta ou o que correu mal. Vai direto para a equipa do Prumo.</p>
  ${!conta() ? '<p class="mut" style="margin:0">Entra na tua conta Prumo para enviar.</p>' : `<div class="row gap8" role="group" aria-label="Tipo"><button type="button" class="chip${FB.t === 'sugestao' ? ' on' : ''}" data-act="fbTipo" data-t="sugestao" aria-pressed="${FB.t === 'sugestao'}">Sugestão</button><button type="button" class="chip${FB.t === 'reclamacao' ? ' on' : ''}" data-act="fbTipo" data-t="reclamacao" aria-pressed="${FB.t === 'reclamacao'}">Reclamação</button></div>
  <label class="sr-only" for="fbTx">A tua mensagem</label><textarea id="fbTx" class="field" rows="4" maxlength="1200" style="margin:10px 0" placeholder="${FB.t === 'reclamacao' ? 'Conta o que aconteceu (onde e quando), para conseguirmos resolver.' : 'A tua ideia para o Prumo.'}">${esc(FB.tx)}</textarea>
  ${FB.ok ? `<p class="pos" style="margin:0 0 8px">${esc(FB.ok)}</p>` : ''}<button type="button" class="btn pri" data-act="fbEnviar"${FB.busy ? ' disabled' : ''}>${FB.busy ? 'A enviar…' : 'Enviar'}</button>`}</div>`;
document.addEventListener('input', e => { if (e.target && e.target.id === 'fbTx') { FB.tx = e.target.value; FB.ok = ''; } });
A.fbTipo = b => { FB.t = b.dataset.t === 'reclamacao' ? 'reclamacao' : 'sugestao'; OS.request(); };
A.fbEnviar = async () => { const tx = (document.getElementById('fbTx') || {}).value || FB.tx; if (String(tx).trim().length < 5) { UI.toast('Escreve um pouco mais.', 'warn'); return; }
  FB.busy = true; OS.request(); try { await call('com', { tipo: FB.t, texto: tx, orig: 'app' }); FB.tx = ''; FB.ok = FB.t === 'reclamacao' ? 'Recebemos a tua reclamação. Obrigado por avisares.' : 'Recebemos a tua sugestão. Obrigado!'; }
  catch (e) { UI.toast((e && e.message) || 'Não deu para enviar agora.', 'warn'); } FB.busy = false; OS.request(); };
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._fb) return; OS.views.definicoes = sub => { const h = o(sub); return String(sub || '') !== '' ? h : h + fbPanel(); }; OS.views.definicoes._fb = 1; });
OS.Social = { marca, nome: pNome, hunter: hunterView, ranking: rankView, clas: clasView, noAnime, badge, parceiro: () => Object.assign({}, PARC), _S: S, call, conta, eu, rank, hora, ePh };
})();
