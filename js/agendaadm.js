/* PRUMO — Administração › Agenda (v3.82): tudo o que tem data marcada, por ordem, com o que falta e um botão para ver antes de
   ir ao ar: o Recap de animes, os Prémios dos livros e de anime, os temas das festas (Carnaval, Páscoa, Santos Populares, Halloween,
   Natal, passagem de ano), a contagem do Ano Novo com os fogos, o teu dia de anos, as estações nos fundos, os desafios das próximas
   semanas e os avisos que chegam ao telemóvel (vês o aviso tal como sai, só neste aparelho). Só a administração vê. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const adm = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
const D0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dt = (y, m, d, h = 0) => new Date(y, m, d, h, 0, 0, 0);
const fd = (d, h) => d.toLocaleDateString('pt-PT', Object.assign({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, h ? { hour: '2-digit', minute: '2-digit' } : {}));
const falta = d => { const n = Math.ceil((d - Date.now()) / 864e5); return n <= 0 ? 'hoje' : n === 1 ? 'amanhã' : 'daqui a ' + n + ' dias'; };
const prox = (m, d, h = 0) => { const y = new Date().getFullYear(); let x = dt(y, m, d, h); if (x.getTime() + 864e5 < Date.now()) x = dt(y + 1, m, d, h); return x; };
const pascoa = y => (OS.Epocas && OS.Epocas.pascoa ? OS.Epocas.pascoa(y) : dt(y, 3, 5));
const proxPascoa = () => { const y = new Date().getFullYear(); let e = pascoa(y); if (e.getTime() + 2 * 864e5 < Date.now()) e = pascoa(y + 1); return e; };
// os avisos do telemóvel: mostra-os neste aparelho, tal e qual
const aviso = async (t, b) => { try { if (!('Notification' in window) || !navigator.serviceWorker) throw new Error('Este navegador não mostra avisos.');
    let p = Notification.permission; if (p === 'default') p = await Notification.requestPermission(); if (p !== 'granted') throw new Error('Deixa o Prumo mostrar avisos neste aparelho para veres a prévia.');
    const r = await navigator.serviceWorker.ready; await r.showNotification(t, { body: b, tag: 'prumo-previa', icon: 'icon-192.png', badge: 'selo-96.png', data: { url: '#admin' } }); UI.toast('Aviso de teste mostrado neste aparelho.', 'pos'); }
  catch (e) { UI.toast(e.message || 'Não deu para mostrar o aviso.', 'warn'); } };
const tema = k => { if (!A.epVer) return; A.epVer({ dataset: { v: k } }); UI.toast('Tema a ver durante 10 minutos (só neste aparelho).', 'pos'); };
const nomeP = () => ((OS.one('profile') || {}).short || (OS.who && OS.who()) || '').split(' ')[0];
// a lista: [quando, até, título, descrição, botões [rótulo, ação]]
const itens = () => { const L = [], y = new Date().getFullYear(), R = OS.AnimeRecap, rj = R && R.janela ? R.janela() : null;
  if (rj) { const ab = rj.aberto ? null : dt(rj.y, 11, 1), fe = dt(rj.y + 1, 0, 15, 23);
    L.push({ q: ab || D0(), ate: fe, ar: rj.aberto, t: 'Recap de animes ' + rj.y, d: 'O ano de cada pessoa em animes, com o rank e a classe. Aberto até 15 de janeiro.', b: [['Ver o Recap', 'agRecap']] });
    L.push({ q: dt(rj.aberto ? rj.y + 1 : rj.y, 11, 1, 10), t: 'Aviso: o Recap está pronto', d: 'Às 10h de cada pessoa, a quem usa os Animes.', b: [['Ver o aviso', 'agAv', 'O teu Recap ' + rj.y + ' está pronto', 'O teu ano em animes: os episódios, o teu anime do ano, o teu rank e a tua classe. Abre e vê.']] }); }
  const pr = (() => { const m = new Date().getMonth(), d = new Date().getDate(); return m === 0 && d <= 12 ? y - 1 : y; })();
  L.push({ q: dt(pr, 11, 1), ate: dt(pr + 1, 0, 10, 23), t: 'Prémios Prumo dos livros ' + pr, d: 'Votação de 1 de dezembro a 10 de janeiro; vencedores a 12. Na página podes abrir, fechar ou revelar já.', b: [['Abrir a página', 'agIr', 'leituras.premios']] });
  L.push({ q: dt(pr, 11, 1), ate: dt(pr + 1, 0, 10, 23), t: 'Prémios Prumo de anime ' + pr, d: 'Votação de 1 de dezembro a 10 de janeiro; cerimónia a 12.', b: [['Abrir a página', 'agIr', 'animes.premios']] });
  const ep = OS.Epocas && OS.Epocas.deHoje ? OS.Epocas.deHoje() : '';
  const E = pascoa(y).getTime() < Date.now() - 2 * 864e5 ? pascoa(y + 1) : pascoa(y), carn = new Date(E.getTime() - 47 * 864e5);
  L.push({ q: new Date(carn.getTime() - 9 * 864e5), ate: carn, ar: ep === 'carnaval', t: 'Tema de Carnaval', d: 'Confetes, serpentinas e bandeirolas, da semana antes à Quarta-feira de Cinzas.', b: [['Ver o tema', 'agTema', 'carnaval']] });
  L.push({ q: new Date(E.getTime() - 14 * 864e5), ate: new Date(E.getTime() + 864e5), ar: ep === 'pascoa', t: 'Tema da Páscoa', d: 'Grinalda de ovos, pétalas, o coelho a saltar e ovos escondidos.', b: [['Ver o tema', 'agTema', 'pascoa']] });
  L.push({ q: new Date(E.getTime() + 9 * 36e5), t: 'Aviso: Feliz Páscoa', d: 'Às 9h de cada pessoa, nos países que a celebram.', b: [['Ver o aviso', 'agAv', 'Feliz Páscoa!', 'Uma Páscoa cheia de recomeços' + (nomeP() ? ', ' + nomeP() : '') + '.']] });
  L.push({ q: prox(5, 1), ate: prox(5, 30), ar: ep === 'junho', t: 'Tema dos Santos Populares e Festas Juninas', d: 'Bandeirinhas em junho.', b: [['Ver o tema', 'agTema', 'junho']] });
  L.push({ q: prox(9, 15), ate: prox(10, 2), ar: ep === 'halloween', t: 'Tema de Halloween', d: 'Teias, folhas, morcegos, um fantasma e um monstro a espreitar.', b: [['Ver o tema', 'agTema', 'halloween']] });
  L.push({ q: prox(11, 1), ate: dt(prox(11, 1).getFullYear() + 1, 0, 6), ar: ep === 'natal', t: 'Tema de Natal', d: 'Luzes, neve a acumular, o limpa-neves e o Pai Natal no trenó.', b: [['Ver o tema', 'agTema', 'natal']] });
  L.push({ q: prox(11, 25), t: 'Aviso: Feliz Natal', d: 'À meia-noite de cada pessoa.', b: [['Ver o aviso', 'agAv', 'Feliz Natal!', 'Um Natal em paz com quem gostas' + (nomeP() ? ', ' + nomeP() : '') + '.']] });
  L.push({ q: prox(11, 31, 18), t: 'Tema da passagem de ano', d: 'Fogo de artifício no app de 31 de dezembro às 18h até 1 de janeiro.', b: [['Ver o tema', 'agTema', 'anonovo']] });
  const an = OS.Festas && OS.Festas.proximo ? OS.Festas.proximo() : null;
  if (an) L.push({ q: new Date(an.t), t: 'Ano Novo: contagem de 10 segundos e fogos', d: 'O app pára no último segundo do ano (no calendário do país de cada pessoa: aqui, ' + esc((OS.Festas.NOME || {})[an.c] || 'Ano Novo') + ').', b: [['Ver a contagem', 'agAno'], ['Ver o aviso', 'agAv', an.c === 'greg' ? 'Feliz Ano Novo!' : ((OS.Festas.NOME || {})[an.c] || 'Feliz Ano Novo') + '!', 'Que ' + new Date(an.t).getFullYear() + ' seja o teu melhor ano. Bom recomeço' + (nomeP() ? ', ' + nomeP() : '') + '.']] });
  const b = (OS.one('me') || {}).birth || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(b)) { const q = prox(+b.slice(5, 7) - 1, +b.slice(8, 10)); L.push({ q, t: 'O teu dia de anos', d: 'Só no teu perfil: balões, confetes, o bolo com velas e os parabéns no Painel, mais o aviso à meia-noite.', b: [['Ver o tema', 'agAnos'], ['Ver o aviso', 'agAv', nomeP() ? 'Parabéns, ' + nomeP() + '!' : 'Parabéns!', 'Hoje o dia é teu. Que este ano seja incrível.']] }); }
  else L.push({ q: null, t: 'O teu dia de anos', d: 'Escreve a tua data de nascimento em Eu › Sobre mim para aparecer aqui.', b: [['Ver o tema', 'agAnos']] });
  [['primavera', 2, 'Primavera nos fundos', 'O gelo do farol parte-se em placas e derrete; flores e pétalas.'], ['verao', 5, 'Verão nos fundos', 'O calor do verão no horizonte.'], ['outono', 8, 'Outono nos fundos', 'Folhas a cair e cores quentes.'], ['inverno', 11, 'Inverno nos fundos', 'A ria do farol congela, o barco fica preso e neva.']]
    .forEach(([k, m, t, d]) => L.push({ q: prox(m, 1), t, d: d + ' (no Rio, ao contrário: hemisfério sul)', b: [['Ver no fundo', 'agEst', k]] }));
  return L.filter(x => !x.q || x.ar || !x.ate || x.ate > Date.now()).sort((a, b) => (a.ar ? 0 : a.q ? a.q.getTime() : 9e15) - (b.ar ? 0 : b.q ? b.q.getTime() : 9e15)); };
let DS = null, DSB = false;
const desafios = () => { if (DS || DSB || !(OS.Social && OS.Social.call)) return; DSB = true; OS.Social.call('adminDesafios', {}).then(j => { DS = j.semanas || []; }).catch(e => { DS = { err: e.message }; }).finally(() => { DSB = false; OS.request(); }); };
const btn = (x) => `<button type="button" class="btn sm" data-act="${x[1]}"${x[2] ? ` data-a="${esc(x[2])}"` : ''}${x[3] ? ` data-b="${esc(x[3])}"` : ''}>${esc(x[0])}</button>`;
const painel = () => { if (!adm()) return ''; desafios(); const L = itens();
  return `<div class="pn ag-pn" id="admAgenda"><div class="pn-h"><h3>${UI.ic('cal')}O que vai acontecer</h3><span class="mut">só neste aparelho; ninguém mais vê as prévias</span></div>
    <p class="mut" style="margin:0 0 12px">Tudo o que tem data marcada, por ordem. Toca para ver antes de ir ao ar: os temas ficam 10 minutos só aqui, os avisos aparecem só neste aparelho.</p>
    <ol class="ag-l">${L.map(x => `<li class="${x.ar ? 'ar' : ''}"><div class="ag-q">${x.ar ? '<b>No ar agora</b>' : x.q ? `<b>${esc(falta(x.q))}</b><small>${esc(fd(x.q, x.q.getHours() || x.q.getMinutes()))}</small>` : '<b>Sem data</b>'}${x.ate ? `<small>até ${esc(fd(x.ate))}</small>` : ''}</div>
      <div class="ag-t"><b>${esc(x.t)}</b><p>${x.d}</p><div class="row gap6 wrap">${x.b.map(btn).join('')}</div></div></li>`).join('')}</ol>
    <div class="ag-ds"><h4>Desafios das próximas semanas</h4>${!DS ? '<p class="mut">A carregar…</p>' : DS.err ? `<p class="mut">${esc(DS.err)}</p>` : `<ol>${DS.map((s, i) => `<li${i ? '' : ' class="ar"'}><small>${i ? '' : 'Esta semana · '}${esc(U.fmtD(s.ini))} a ${esc(U.fmtD(s.fim))}</small><b>${esc(s.desafio.t)}</b><span>${esc(s.desafio.d || '')}</span></li>`).join('')}</ol>`}</div></div>`; };
A.agRecap = () => { if (A.arRecap) A.arRecap({ dataset: { prev: '1' } }); };
A.agAv = b => aviso(b.dataset.a, b.dataset.b);
A.agTema = b => tema(b.dataset.a);
A.agIr = b => { location.hash = b.dataset.a; };
A.agAno = () => { if (OS.Festas && OS.Festas.preverAno) OS.Festas.preverAno(); };
A.agAnos = () => { if (OS.Festas && OS.Festas.preverAnos) { OS.Festas.preverAnos(3); location.hash = 'visao'; UI.toast('O teu dia de anos durante 3 minutos (só neste aparelho).', 'pos'); } };
A.agEst = b => { try { localStorage.setItem('nau:est', b.dataset.a); } catch (e) { } if (OS.Fundo && OS.Fundo.refresh) OS.Fundo.refresh(); if (A.fundoOpen) A.fundoOpen(); UI.toast('O fundo mostra esta estação. No botão Fundo, toca em "Agora" para voltar ao normal.', 'pos'); };
OS.AgendaAdm = { painel, itens };
})();
