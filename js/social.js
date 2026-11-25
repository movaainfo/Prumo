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
  let j = null; try { j = await r.json(); } catch (e) { } if (j && j.ok) return j; throw Object.assign(new Error((j && j.msg) || 'O servidor do Prumo não respondeu.'), { status: r.status }); };
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
const proxPista = h => { const n = h.pistas.length; if (h.fase !== 'aberto' || n >= h.total) return 0; return h.abreAt + (n >= 4 ? 80 : 40) * 6e4; };
const pistasHTML = h => { const prox = proxPista(h), L = h.pistas.map((p, i) => `<li><span class="hu-pn">${i + 1}</span><p>${esc(p)}</p></li>`);
  for (let i = h.pistas.length; i < h.total; i++) L.push(`<li class="off"><span class="hu-pn">${i + 1}</span><p>${i === h.pistas.length && prox ? `Sai às ${hora(prox)} · <span data-ate="${prox}">${dur(prox - agora())}</span>` : 'Ainda por sair'}</p></li>`);
  return `<ol class="hu-pl" aria-label="Pistas">${L.join('')}</ol>`; };
const tabRes = (res, me) => res && res.length ? `<ol class="hu-res">${res.map((r, i) => `<li class="${r.id === me ? 'eu' : ''}"><b>${i + 1}.º</b><span>${esc(r.nome)}${r.id === me ? ' (tu)' : ''}</span><small>${hora(r.at)}</small><em>+${r.pts}</em></li>`).join('')}</ol>` : '<p class="mut">Ninguém acertou.</p>';
const meuId = () => (S.eu && S.eu.eu && S.eu.eu.id) || '';
const hunterView = () => { if (!conta()) return semConta(); hunter(); eu(); const h = S.h;
  const topo = `<header class="hu-h">${marca('sm')}${OS.Parceria ? OS.Parceria.exclusivo() : ''}<h2>Pursuit</h2><p>Todos os dias às 20h de Lisboa saem pistas de um anime ao calhas. Descobre qual é, abre a página dele e carrega em <b>Marcar como Pursuit</b>. Às 22h fecha. ${PTS_TXT}</p></header>`;
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
  return `<div class="rk-pod">${ord.map(x => `<div class="rk-p p${x.pos}${x.eu ? ' eu' : ''}">${OS.AnimeSoc ? OS.AnimeSoc.av(x, 44) : ''}<b>${esc(x.nome)}</b>${x.user ? `<small>@${esc(x.user)}</small>` : ''}<span>${x.p} pts</span><i>${x.pos}</i></div>`).join('')}</div>`; };
const rankView = () => { if (!conta()) return semConta(); rank(); const r = S.rk;
  const topo = `<header class="hu-h">${marca('sm')}${OS.Parceria ? OS.Parceria.exclusivo() : ''}<h2>Ranking de animes</h2><p>Os pontos ganhos nos jogos de anime (por agora, o Pursuit). Só conta para este ranking, não para o ranking de disciplina do Prumo.</p></header>`;
  if (!r) return `<section class="hu">${topo}${erroBox('rk') || ld('A buscar o ranking…')}</section>`;
  if (!r.lista.length) return `<section class="hu">${topo}<div class="so-vazio"><b>Ainda ninguém pontuou</b><p>Joga o Pursuit hoje às 20h e aparece aqui em primeiro.</p><a class="btn an-cta" href="#animes.pursuit">Ir para o Pursuit</a></div></section>`;
  return `<section class="hu">${topo}${podio(r.lista)}<ol class="rk-l" start="4">${r.lista.slice(3).map(x => `<li class="${x.eu ? 'eu' : ''}"><b>${x.pos}.º</b><span class="rk-n">${OS.AnimeSoc ? OS.AnimeSoc.av(x, 28) : ''}${esc(x.nome)}${x.user ? ` <small>@${esc(x.user)}</small>` : ''}${x.eu ? ' (tu)' : ''}</span><em>${x.p} pts</em></li>`).join('')}</ol>
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
const claView = cid => { const c = S.cla[cid]; if (!c && !S.busy['c' + cid]) { S.busy['c' + cid] = 1; call('claVer', { id: cid }).then(j => { S.cla[cid] = j.cla; }).catch(e => { S.err.cla = e.message; }).finally(() => { S.busy['c' + cid] = 0; OS.request(); }); }
  if (!c) return `<section class="so-sec">${erroBox('cla') || ld('A abrir o clã…')}<button type="button" class="btn sm an-ghost" data-act="soVoltar">${UI.ic('left')}Voltar</button></section>`;
  const me = meuId(), eu0 = c.membros.find(m => m.id === me) || {}, gere = ['dono', 'mod'].includes(eu0.papel);
  return `<section class="so-sec"><div class="so-clh" style="--cl:${esc(c.cor)}"><button type="button" class="btn sm an-ghost" data-act="soVoltar">${UI.ic('left')}Voltar</button><div><b>${esc(c.nome)}</b>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}<small>${c.n} ${c.n === 1 ? 'membro' : 'membros'} · ${c.pts} pontos no ranking de animes</small></div></div>
    <div class="row gap8" style="flex-wrap:wrap"><button type="button" class="btn an-cta" data-act="soAbrir" data-k="c-${esc(c.id)}">${UI.ic('chat')}Conversa do clã</button><button type="button" class="btn an-ghost" data-act="soCopiar" data-v="CL-${esc(c.cod)}">${UI.ic('copy')}Código de convite: CL-${esc(c.cod)}</button><button type="button" class="btn an-ghost" data-act="soSair" data-id="${esc(c.id)}">Sair do clã</button></div>
    <h3>Membros por pontos</h3><ol class="rk-l">${c.membros.map((m, i) => `<li class="${m.id === me ? 'eu' : ''}"><b>${i + 1}.º</b><span class="rk-n">${OS.AnimeSoc ? OS.AnimeSoc.av(m, 28) : ''}${esc(m.nome)}${m.user ? ` <small>@${esc(m.user)}</small>` : ''}${m.papel === 'dono' ? ' · dono' : m.papel === 'mod' ? ' · moderador' : ''}${m.id === me ? ' (tu)' : ''}</span><em>${m.pts} pts</em>${gere && m.id !== me && m.papel !== 'dono' ? `<button type="button" class="btn xs an-ghost" data-act="soTirar" data-id="${esc(c.id)}" data-m="${esc(m.id)}">Tirar</button>` : ''}</li>`).join('')}</ol></section>`; };
const clasView = () => { if (!conta()) return semConta(); eu(); convs(); const k = convAberta(); if (k) return chatView(k); const cid = claAberto(); if (cid) return claView(cid);
  const d = S.eu; if (!d) return `<section class="hu">${erroBox('eu') || ld('A abrir os clãs…')}</section>`;
  const me = d.eu, cv = S.cv || [];
  return `<section class="hu"><header class="hu-h">${marca('sm')}${OS.Parceria ? OS.Parceria.exclusivo() : ''}<h2>Clãs e conversas</h2><p>Cria um clã, convida amigos e conversa no grupo ou a dois. A IA verifica cada mensagem antes de aparecer.</p></header>
    <div class="so-eu">${OS.AnimeSoc ? OS.AnimeSoc.av(me, 48) : ''}<div><b>${esc(me.nome)}</b>${me.user ? `<small>@${esc(me.user)}</small>` : '<small>Ainda sem @</small>'}<small>${me.pts} pontos no ranking de animes</small></div><div class="row gap6" style="flex-wrap:wrap"><button type="button" class="btn sm an-ghost" data-act="soCopiar" data-v="PR-${esc(me.cod)}">${UI.ic('copy')}O teu código: PR-${esc(me.cod)}</button><button type="button" class="btn sm an-ghost" data-act="apEditar">Perfil dos animes</button></div></div>
    <section class="so-sec"><h3>Conversas</h3>${cv.length ? `<div class="so-cl">${cv.map(c => `<button type="button" class="so-ci${c.novas ? ' nova' : ''}" data-act="soAbrir" data-k="${esc(c.conv)}"><span class="so-av" style="--cl:${esc(c.cor || '#3a3c44')}">${esc((c.nome || '?').slice(0, 1).toUpperCase())}</span><span><b>${esc(c.nome)}</b><small>${c.ult ? esc((c.ult.de === me.id ? 'Tu: ' : c.tipo === 'c' ? c.ult.nome + ': ' : '') + c.ult.t) : c.tipo === 'c' ? 'Clã · ainda sem mensagens' : 'Amigo · ainda sem mensagens'}</small></span>${c.ult ? `<em>${hora(c.ult.at)}</em>` : ''}</button>`).join('')}</div>` : '<p class="mut">Entra num clã ou adiciona um amigo para começares a conversar.</p>'}</section>
    <section class="so-sec"><h3>Os teus clãs</h3>${d.clas.length ? `<div class="so-cards">${d.clas.map(c => `<button type="button" class="so-cc" style="--cl:${esc(c.cor)}" data-act="soCla" data-id="${esc(c.id)}"><b>${esc(c.nome)}</b><small>${c.n} ${c.n === 1 ? 'membro' : 'membros'}</small></button>`).join('')}</div>` : '<p class="mut">Ainda não estás em nenhum clã.</p>'}
      <div class="so-forms"><form data-form="soClaCriar" class="so-f" autocomplete="off"><b>Criar um clã</b><input class="field" name="nome" maxlength="28" placeholder="Nome do clã" aria-label="Nome do clã" required><input class="field" name="desc" maxlength="160" placeholder="Descrição (opcional)" aria-label="Descrição do clã">
        <div class="so-cores" role="radiogroup" aria-label="Cor do clã">${CORES.map((c, i) => `<label><input type="radio" name="cor" value="${c}" ${i ? '' : 'checked'}><i style="background:${c}"></i></label>`).join('')}</div><button class="btn an-cta">Criar</button></form>
        <form data-form="soClaEntrar" class="so-f" autocomplete="off"><b>Entrar com um código</b><input class="field" name="cod" maxlength="12" placeholder="CL-XXXXXX" aria-label="Código do clã" required><button class="btn an-ghost">Entrar no clã</button></form></div></section>
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
OS.forms.soClaEntrar = (f, v) => tenta(() => call('claEntrar', { cod: v('cod') }), r => `Entraste no clã ${r.cla.nome}.`).then(r => { if (r) f.reset(); });
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
OS.Social = { marca, nome: pNome, hunter: hunterView, ranking: rankView, clas: clasView, noAnime, badge, parceiro: () => Object.assign({}, PARC), _S: S, call, conta, eu, rank, hora, ePh };
})();
