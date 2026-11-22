/* PRUMO — Animes › Prémios (v3.72).
   1) Prémios Prumo: no fim de cada ano as contas do Prumo votam nos melhores animes do ano (nomeados escolhidos a partir de dados reais do
      MyAnimeList). Na revelação há uma cerimónia: categoria a categoria, "e o prémio vai para…", com a percentagem de cada nomeado.
   2) Outras premiações: os vencedores dos Crunchyroll Anime Awards e de outras premiações, com a fonte. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
let ED = null, BUSY = false, ERR = '', AT = 0;
const call = async (op, body = {}) => { const S = OS.Acc && OS.Acc.token ? OS.Acc.token() : ''; const r = await fetch('api/premios', { method: 'POST', cache: 'no-store', credentials: 'omit', headers: Object.assign({ 'content-type': 'application/json' }, S ? { authorization: 'Bearer ' + S } : {}), body: JSON.stringify(Object.assign({ op }, body)) });
  let j = null; try { j = await r.json(); } catch (e) { } if (j && j.ok) return j; throw new Error((j && j.msg) || 'O servidor do Prumo não respondeu.'); };
const carrega = async (forcar) => { if (BUSY || (!forcar && ED && Date.now() - AT < 60e3)) return; BUSY = true; ERR = ''; try { ED = await call('ver'); AT = Date.now(); } catch (e) { ERR = e.message; } BUSY = false; OS.request(); };
const data = t => new Date(t).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'long' });
const conta = () => !!(OS.Acc && OS.Acc.on && !OS.Acc.pub);
const admin = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
A.prVotar = async b => { if (!conta()) { UI.toast('Entra na tua conta Prumo para votar.', 'neg'); return; } const cat = b.dataset.cat, id = b.dataset.id; const antes = Object.assign({}, ED.meus); ED.meus[cat] = id; OS.request();
  try { const j = await call('votar', { ano: ED.ano, cat, id }); ED.meus = j.meus; } catch (e) { ED.meus = antes; UI.toast(e.message, 'neg'); } OS.request(); };
A.prAdmin = async b => { const acao = b.dataset.a; if (acao === 'gerar' && ED && ED.cats && ED.cats.length && !confirm('Gerar os nomeados outra vez? Os votos já dados continuam contados só para os nomeados que se mantiverem.')) return;
  b.disabled = true; try { ED = await call('admin', { ano: ED ? ED.ano : undefined, acao }); AT = Date.now(); UI.toast({ gerar: 'Nomeados escolhidos.', abrir: 'Votação aberta.', fechar: 'Votação fechada.', revelar: 'Resultados revelados.', auto: 'Datas automáticas.' }[acao] || 'Feito.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } b.disabled = false; OS.request(); };
/* ---------- a cerimónia ---------- */
let CER = 0;
const cerimonia = () => { const R = (ED && ED.res) || [], c = R[CER]; if (!c) return; const w = c.r[0];
  UI.modal(`<div class="pr-cer" role="dialog" aria-label="Cerimónia dos Prémios Prumo"><small>Prémios Prumo ${ED.ano} · ${CER + 1} de ${R.length}</small><h2>${esc(c.n)}</h2><p class="pr-cer-e">E o prémio vai para…</p>
    <div class="pr-cer-w">${w && w.img ? `<img src="${esc(w.img)}" alt="" loading="lazy">` : ''}<div><b>${esc(w ? w.t : '—')}</b>${w && w.sub ? `<small>${esc(w.sub)}</small>` : ''}<span>${w ? w.p : 0}% dos votos</span></div></div>
    <ol class="pr-cer-l">${c.r.slice(1, 5).map((x, i) => `<li><span>${i + 2}.º</span><b>${esc(x.t)}</b><i>${x.p}%</i></li>`).join('')}</ol>
    <div class="row gap8" style="justify-content:flex-end;margin-top:14px">${CER > 0 ? '<button class="btn ghost" data-act="prCer" data-d="-1">Anterior</button>' : ''}${CER < R.length - 1 ? '<button class="btn pri" data-act="prCer" data-d="1">Próxima categoria</button>' : '<button class="btn pri" data-mclose>Fim da cerimónia</button>'}</div></div>`); };
A.prCerimonia = () => { CER = 0; cerimonia(); };
A.prCer = b => { CER = Math.max(0, CER + (+b.dataset.d || 0)); cerimonia(); };
/* ---------- outras premiações (vencedores oficiais, com a fonte) ---------- */
const OUTRAS = [
  { n: 'Crunchyroll Anime Awards 2026', d: '23 de maio de 2026, Tóquio · votação do público e de um júri', src: 'https://editorial.rottentomatoes.com/article/2026-crunchyroll-anime-awards-winners/', L: [
    ['Anime do Ano', 'My Hero Academia FINAL SEASON'], ['Filme do Ano', 'Demon Slayer: Kimetsu no Yaiba Infinity Castle'], ['Melhor Anime Original', 'Lazarus'], ['Melhor Série em Continuação', 'One Piece'], ['Melhor Estreia', 'Gachiakuta'],
    ['Melhor Abertura', '"On The Way", Aina the End (Dan Da Dan, 2.ª temporada)'], ['Melhor Encerramento', '"I", Bump of Chicken (My Hero Academia FINAL SEASON)'], ['Melhor Canção', '"IRIS OUT", Kenshi Yonezu (Chainsaw Man – O Filme: Arco da Reze)'], ['Melhor Banda Sonora', 'Yuki Kajiura e Go Shiina (Demon Slayer: Infinity Castle)'],
    ['Melhor Ação', 'Solo Leveling, 2.ª temporada'], ['Melhor Comédia', 'Dan Da Dan, 2.ª temporada'], ['Melhor Drama', 'The Apothecary Diaries, 2.ª temporada'], ['Melhor Isekai', 'Re:ZERO, 3.ª temporada'], ['Melhor Romance', 'The Fragrant Flower Blooms With Dignity'], ['Melhor Slice of Life', 'SPY x FAMILY, 3.ª temporada'],
    ['Melhor Animação', 'Solo Leveling, 2.ª temporada'], ['Melhor Cenário', 'Gachiakuta'], ['Melhor Design de Personagens', 'Gachiakuta'], ['Melhor Realização', 'Akinori Fudesaka e Norihiro Naganuma (The Apothecary Diaries)'], ['Melhor Protagonista', 'Maomao (The Apothecary Diaries)'], ['Melhor Secundário', 'Katsuki Bakugo (My Hero Academia)'],
    ['Personagem a Proteger', 'Anya Forger (SPY x FAMILY)'], ['Melhor Dobragem (Português do Brasil)', 'Charles Emmanuel, como Akaza (Demon Slayer: Infinity Castle)'], ['Melhor Voz (Japonês)', 'Aoi Yuki, como Maomao']] },
  { n: 'Crunchyroll Anime Awards 2025', d: 'Tóquio · 9.ª edição', src: 'https://editorial.rottentomatoes.com/article/2025-crunchyroll-awards-full-list-of-winners', L: [
    ['Anime do Ano', 'Solo Leveling'], ['Filme do Ano', 'Look Back'], ['Melhor Anime Original', 'Ninja Kamui'], ['Melhor Série em Continuação', 'Demon Slayer (Arco do Treino dos Hashira)'], ['Melhor Estreia', 'Solo Leveling'], ['Melhor Ação', 'Solo Leveling'],
    ['Melhor Comédia', 'MASHLE: Magic and Muscles'], ['Melhor Drama', 'Frieren: Beyond Journey\'s End'], ['Melhor Isekai', 'Re:ZERO, 3.ª temporada'], ['Melhor Romance', 'Blue Box'], ['Melhor Slice of Life', 'Makeine: Too Many Losing Heroines!'],
    ['Melhor Abertura', '"Otonoke", Creepy Nuts (Dan Da Dan)'], ['Melhor Canção', '"Otonoke", Creepy Nuts (Dan Da Dan)'], ['Melhor Encerramento', '"request", krage (Solo Leveling)'], ['Melhor Banda Sonora', 'Hiroyuki Sawano (Solo Leveling)'], ['Melhor Animação', 'Demon Slayer (Arco do Treino dos Hashira)'],
    ['Melhor Cenário', 'Frieren: Beyond Journey\'s End'], ['Melhor Design de Personagens', 'Dan Da Dan'], ['Melhor Realização', 'Keiichiro Saito (Frieren)'], ['Melhor Protagonista', 'Sung Jinwoo (Solo Leveling)'], ['Melhor Secundário', 'Fern (Frieren)'], ['Personagem a Proteger', 'Anya Forger (SPY x FAMILY)']] },
  { n: 'Anime Trending Awards 2026', d: '12.ª edição, março de 2026 · votação dos fãs (AniTrendz)', src: 'https://www.anitrendz.com/news/2026/03/21/year-of-the-horse-umamusume-cinderella-gray-claims-anime-of-the-year-at-12th-anime-trending-awards', L: [
    ['Anime do Ano', 'Umamusume: Cinderella Gray'], ['Melhor Mistério ou Psicológico', 'The Apothecary Diaries, 2.ª temporada'], ['Melhor Sobrenatural', 'Dan Da Dan']] },
  { n: 'Tokyo Anime Award Festival 2026', d: '13 a 16 de março de 2026, Tóquio · júri profissional', src: 'https://animehunch.com/demon-slayer-infinity-castle-gundam-gquuuuuux-taaf-2026/', L: [
    ['Melhor Obra (Anime do Ano)', 'Demon Slayer – O Filme: Infinity Castle, Parte 1 e Mobile Suit Gundam GQuuuuuuX'], ['Prémio dos Fãs', 'Hypnosis Mic: Division Rap Battle (filme)'], ['Melhor Som / Interpretação', 'Kenshi Yonezu']] }];
const outras = () => `<section class="pr-sec"><h3>Outras premiações</h3><p class="mut" style="margin:0 0 12px">Os vencedores oficiais, com o link para a fonte.</p>${OUTRAS.map((o, i) => `<details class="pn pr-out"${i ? '' : ' open'}><summary><b>${esc(o.n)}</b><small>${esc(o.d)}</small></summary>
  <ol class="pr-ol">${o.L.map(([c, w]) => `<li><span>${esc(c)}</span><b>${esc(w)}</b></li>`).join('')}</ol><a class="pr-src" href="${esc(o.src)}" target="_blank" rel="noopener noreferrer">Fonte</a></details>`).join('')}</section>`;
/* ---------- a página ---------- */
const view = () => { if (!ED && !BUSY && !ERR) setTimeout(carrega, 0); else if (ED && Date.now() - AT > 120e3) setTimeout(carrega, 0);
  const adm = admin() ? `<div class="pr-adm"><small>Só tu vês isto:</small>${[['gerar', 'Gerar nomeados'], ['abrir', 'Abrir votação'], ['fechar', 'Fechar votação'], ['revelar', 'Revelar resultados'], ['auto', 'Datas automáticas']].map(([a, n]) => `<button class="btn xs ghost" data-act="prAdmin" data-a="${a}">${n}</button>`).join('')}</div>` : '';
  let corpo = '';
  if (!ED) corpo = ERR ? `<p class="mut">${esc(ERR)} <button class="btn xs" data-act="prRecarregar">Tentar outra vez</button></p>` : '<p class="mut">A carregar os Prémios Prumo…</p>';
  else if (!ED.pronto || !ED.cats.length) corpo = `<div class="pr-hero"><b>Prémios Prumo ${ED.ano}</b><p>A 1 de dezembro saem os nomeados: os animes do ano mais vistos e mais bem avaliados, em ${12} categorias. Votas até 10 de janeiro e a 12 de janeiro há cerimónia com os vencedores.</p></div>`;
  else { const f = ED.fase, votados = Object.keys(ED.meus || {}).length;
    const hero = { nomeacao: `Os nomeados já estão escolhidos. A votação abre a ${data(ED.ini)}.`, votacao: `Votação aberta até ${data(ED.fim)}. ${conta() ? `Votaste em ${votados} de ${ED.cats.length} categorias.` : 'Entra na tua conta para votar.'}${ED.participantes ? ` Já votaram ${ED.participantes} pessoas.` : ''}`, fechada: 'A votação fechou. A contar os votos: a cerimónia é a 12 de janeiro.', revelada: 'Os vencedores estão escolhidos pelos votos de todas as contas do Prumo.' }[f];
    corpo = `<div class="pr-hero"><b>Prémios Prumo ${ED.ano}</b><p>${esc(hero)}</p>${f === 'revelada' ? '<button class="btn pri" data-act="prCerimonia">Ver a cerimónia</button>' : ''}</div>`;
    if (f === 'revelada') corpo += ED.res.map(c => `<section class="pn pr-cat"><h3>${esc(c.n)}</h3><small class="mut">${c.votos} votos</small><ol class="pr-res">${c.r.map((x, i) => `<li class="${i ? '' : 'w'}"><span class="pr-pos">${i + 1}</span>${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : '<i></i>'}<div><b>${esc(x.t)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}<span class="pr-bar"><i style="width:${x.p}%"></i></span></div><em>${x.p}%</em></li>`).join('')}</ol></section>`).join('');
    else corpo += ED.cats.map(c => `<section class="pn pr-cat"><h3>${esc(c.n)}</h3><div class="pr-noms">${c.nom.map(x => { const meu = (ED.meus || {})[c.k] === x.id; return `<button type="button" class="pr-nom${meu ? ' on' : ''}" ${f === 'votacao' ? `data-act="prVotar" data-cat="${esc(c.k)}" data-id="${esc(x.id)}"` : 'disabled'} aria-pressed="${meu}">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ''}<b>${esc(x.t)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}${meu ? `<span class="pr-meu">${UI.ic('check')}O teu voto</span>` : ''}</button>`; }).join('')}</div></section>`).join(''); }
  return `<div class="an-pad pr">${adm}${corpo}${outras()}</div>`; };
A.prRecarregar = () => carrega(true);
OS.Premios = { view, carrega, OUTRAS };
})();
