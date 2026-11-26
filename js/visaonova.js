/* PRUMO — Visão geral: os cartões das novidades (v3.78). O Painel é a visão do app todo, por isso mostra também:
   · a parceria Prumo & PHANTOM com o Pursuit de hoje (a que horas abre, se está aberto, os resultados) e os avisos de episódios;
   · os Jogos;
   · para a administração, a caixa da Comunidade (o que está por ver). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc;
const lisboa = () => { const q = {}; try { new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(x => { q[x.type] = x.value; }); } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); } return +q.hour * 60 + +q.minute; };
const dur = m => m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
const card = (title, body, o = {}) => `<div class="dc vn-c ${o.cls || ''}"${o.area ? ` data-area="${o.area}"` : ''}><div class="dc-h"><h3>${title}</h3>${o.act || ''}</div>${body}</div>`;
const more = (href, l) => `<a class="dc-more" href="#${href}">${l} ${UI.ic('right')}</a>`;
const animesOn = () => { try { return !(OS.Areas && OS.Areas.hidden && OS.Areas.hidden().has('animes')); } catch (e) { return true; } };
const pursuit = () => { const m = lisboa(), A = 1200, F = 1320, h = (OS.Social && OS.Social._S && OS.Social._S.h) || null;
  if (h && h.meu && h.fase === 'aberto') return { t: 'Já marcaste o Pursuit de hoje', s: 'Os resultados saem às 22h de Lisboa.' };
  if (m < A) return { t: 'O Pursuit abre daqui a ' + dur(A - m), s: 'Às 20h de Lisboa saem as pistas de um anime. Quem acerta primeiro ganha mais.' };
  if (m < F) return { t: 'O Pursuit está aberto', s: 'Faltam ' + dur(F - m) + ' para fechar. Descobre o anime de hoje.', on: 1 };
  return { t: 'Já saíram os resultados do Pursuit', s: 'Amanhã às 20h há outro.' }; };
const cartoes = () => { const L = [];
  if (animesOn()) { const pu = pursuit(), av = (OS.Animes && OS.Animes.avisos ? OS.Animes.avisos() : []).length, nome = OS.Social && OS.Social.nome ? OS.Social.nome() : 'PHANTOM';
    L.push(card(`${OS.Parceria ? OS.Parceria.mini() : ''}<span>Prumo &amp; ${esc(nome)}</span>`, `<a class="vn-pu${pu.on ? ' on' : ''}" href="#animes.pursuit"><b>${esc(pu.t)}</b><span>${esc(pu.s)}</span></a>
      <div class="dc-rows"><div><span>Avisos de episódios</span><b>${av ? av + (av === 1 ? ' anime' : ' animes') : 'nenhum'}</b></div><div><span>A parceria</span><b><a href="#animes.parceria">conhecer</a></b></div></div>`, { cls: 'span4 vn-pp', area: 'animes', act: more('animes', 'Animes') })); }
  L.push(card('Jogos', `<div class="dc-tiles"><a href="#animes.pursuit"><b>Pursuit</b><span>anime do dia</span></a><a href="#dominus"><b>Dominus</b><span>o teu herói</span></a><a href="#jogos"><b>Todos</b><span>e o ranking</span></a></div>`, { cls: 'span4', area: 'jogos', act: more('jogos', 'Jogar') }));
  try { if (OS.Acc && OS.Acc.adm && OS.Acc.adm() && OS.Caixa) { const n = OS.Caixa.novos(); L.push(card('Caixa da Comunidade', `<div class="dc-big">${n}</div><div class="dc-sub">${n === 1 ? 'mensagem por ver' : 'mensagens por ver'}: sugestões, reclamações, pedidos e denúncias</div>`, { cls: 'span4', act: `<a class="dc-more" href="#admin" data-act="admTab" data-tab="caixa">Abrir ${UI.ic('right')}</a>` })); } } catch (e) { }
  return L.join(''); };
OS.on('ready', () => { const V = OS.views, o = V.visao; if (!o || o._vn) return;
  V.visao = sub => { const h = o(sub), k = '<div class="dash-grid">', i = h.indexOf(k); if (i < 0) return h; let c = ''; try { c = cartoes(); } catch (e) { } return h.slice(0, i + k.length) + c + h.slice(i + k.length); }; V.visao._vn = 1; });
})();
