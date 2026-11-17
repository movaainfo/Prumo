/* PRUMO — Animes (Eu › Animes). Aba opcional: começa desligada e cada pessoa liga-a no registo, em Definições ou em Explorar.
   Todos os animes do mundo pela base pública do AniList (sem chave), com a do MyAnimeList (Jikan) como reserva:
   capa, faixa, temporada, nota da comunidade, onde ver, trailer, sequelas e recomendações.
   A tua lista: A ver (com o episódio onde vais), Quero ver, Vistos, Em pausa e Larguei; nota de 1 a 10, resenha, favoritos,
   top 10 e tier list. Para descobrir: em destaque, esta temporada, o calendário de episódios da semana e os melhores de cada ano. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, today = () => U.today();
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
if (!UI.IP.tv) UI.IP.tv = 'M3 7h18v12H3zM8 3l4 4 4-4M10 11l4 2-4 2z';

/* ---------- a tua lista (coleção "animes") ---------- */
const ST = ['A ver', 'Quero ver', 'Visto', 'Em pausa', 'Larguei'];
const STB = { 'A ver': 'Estou a ver', 'Quero ver': 'Quero ver', Visto: 'Já vi', 'Em pausa': 'Em pausa', Larguei: 'Larguei' };
const STC = { 'A ver': 'ver', 'Quero ver': 'quero', Visto: 'visto', 'Em pausa': 'pausa', Larguei: 'larguei' };
const NOTAS = { 10: 'Obra-prima', 9: 'Excelente', 8: 'Muito bom', 7: 'Bom', 6: 'Razoável', 5: 'Mediano', 4: 'Fraco', 3: 'Muito fraco', 2: 'Mau', 1: 'Péssimo' };
const TIERS = [['S', 'Lendários'], ['A', 'Excelentes'], ['B', 'Muito bons'], ['C', 'Bons'], ['D', 'Fracos']];
OS.S.animes = { label: 'Anime', title: r => r.t, fields: [
  { k: 't', l: 'Título', t: 'text', req: 1 }, { k: 'ro', l: 'Título original', t: 'text' }, { k: 'status', l: 'Estado', t: 'sel', o: ST },
  { k: 'ep', l: 'Episódios vistos', t: 'num' }, { k: 'eps', l: 'Episódios ao todo', t: 'num' }, { k: 'nota', l: 'A tua nota (1 a 10)', t: 'num' },
  { k: 'start', l: 'Comecei', t: 'date' }, { k: 'end', l: 'Terminei / parei', t: 'date' }, { k: 'rew', l: 'Vezes que revi', t: 'num' },
  { k: 'tier', l: 'Tier', t: 'sel', o: ['', 'S', 'A', 'B', 'C', 'D'] }, { k: 'img', l: 'Capa (link da imagem)', t: 'text' }, { k: 'rev', l: 'Resenha', t: 'area', rows: 5 }],
  defaults: () => ({ status: 'Quero ver', ep: 0 }) };
OS.ONE_DEF.animetop = { list: [] };
const mineAll = () => OS.all('animes');
const mine = x => x && mineAll().find(a => (x.al && a.al === x.al) || (x.mal && a.mal === x.mal));
const kOf = x => x.al ? 'a' + x.al : 'm' + x.mal;
const pick = x => ({ al: x.al || 0, mal: x.mal || 0, t: x.t || '', ro: x.ro || '', img: x.img || '', col: x.col || '', ban: x.ban || '', y: x.y || 0, sea: x.sea || '', fmt: x.fmt || '', eps: x.eps || 0, dur: x.dur || 0, gen: (x.gen || []).slice(0, 6), stu: x.stu || '' });
OS.Animes = { list: mineAll, watching: () => mineAll().filter(a => a.status === 'A ver') };

/* ---------- nomes em português ---------- */
const SEAS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'], SEN = { WINTER: 'Inverno', SPRING: 'Primavera', SUMMER: 'Verão', FALL: 'Outono' }, SEM = { WINTER: 'jan. a mar.', SPRING: 'abr. a jun.', SUMMER: 'jul. a set.', FALL: 'out. a dez.' };
const FMTN = { TV: 'Série', TV_SHORT: 'Série curta', MOVIE: 'Filme', SPECIAL: 'Especial', OVA: 'OVA', ONA: 'Série na internet', MUSIC: 'Vídeo musical' };
const STN = { RELEASING: 'Em exibição', FINISHED: 'Terminado', NOT_YET_RELEASED: 'Ainda não estreou', CANCELLED: 'Cancelado', HIATUS: 'Em pausa' };
const GENN = { Action: 'Ação', Adventure: 'Aventura', Comedy: 'Comédia', Drama: 'Drama', Ecchi: 'Ecchi', Fantasy: 'Fantasia', Horror: 'Terror', 'Mahou Shoujo': 'Garotas mágicas', Mecha: 'Mecha', Music: 'Música', Mystery: 'Mistério', Psychological: 'Psicológico', Romance: 'Romance', 'Sci-Fi': 'Ficção científica', 'Slice of Life': 'Quotidiano', Sports: 'Desporto', Supernatural: 'Sobrenatural', Thriller: 'Suspense', 'Award Winning': 'Premiado', 'Boys Love': 'Boys Love', 'Girls Love': 'Girls Love', Gourmet: 'Culinária', Suspense: 'Suspense', 'Avant Garde': 'Experimental' };
const RELN = { SEQUEL: 'Sequela', PREQUEL: 'Prequela', SIDE_STORY: 'História paralela', SPIN_OFF: 'Spin-off', ALTERNATIVE: 'Versão alternativa', PARENT: 'História principal', SUMMARY: 'Resumo', COMPILATION: 'Compilação', CHARACTER: 'Mesmas personagens', OTHER: 'Relacionado' };
const gN = g => GENN[g] || g;
const fmtN = f => FMTN[f] || f || '';
const sNow = () => { const d = new Date(); return { y: d.getFullYear(), s: SEAS[Math.floor(d.getMonth() / 3)] }; };
const sShift = (o, n) => { let i = SEAS.indexOf(o.s) + n, y = o.y; while (i < 0) { i += 4; y--; } while (i > 3) { i -= 4; y++; } return { y, s: SEAS[i] }; };
const sName = o => SEN[o.s] + ' ' + o.y;
const scT = sc => sc ? (sc / 10).toFixed(1).replace('.', ',') : '';
const p2 = n => String(n).padStart(2, '0');
const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const hm = t => { const d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const dm = t => { const d = new Date(t); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1); };
const until = t => { const m = Math.max(0, Math.round((t - Date.now()) / 6e4)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); if (h < 48) return h + ' h' + (m % 60 && h < 10 ? ' ' + (m % 60) + ' min' : ''); return Math.round(h / 24) + ' dias'; };
const clean = t => String(t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, '&').trim();

/* ---------- AniList (principal) e Jikan/MyAnimeList (reserva) ---------- */
const AL = 'https://graphql.anilist.co', JK = 'https://api.jikan.moe/v4/';
const F = 'id idMal type title{romaji english native} coverImage{extraLarge large color} bannerImage season seasonYear format episodes duration status averageScore popularity genres studios(isMain:true){nodes{name}} nextAiringEpisode{episode airingAt} startDate{year}';
const FD = F + ' description(asHtml:false) trailer{id site} externalLinks{site url type} rankings{rank type allTime year season context} relations{edges{relationType node{' + F + '}}} recommendations(perPage:12,sort:RATING_DESC){nodes{mediaRecommendation{' + F + '}}}';
const nAL = m => { if (!m || !m.id || (m.type && m.type !== 'ANIME')) return null; const T = m.title || {}, C = m.coverImage || {};
  return { al: m.id, mal: m.idMal || 0, t: T.english || T.romaji || T.native || '', ro: T.romaji && T.romaji !== T.english ? T.romaji : '', na: T.native || '', img: C.extraLarge || C.large || '', col: C.color || '', ban: m.bannerImage || '', sea: m.season || '', y: m.seasonYear || (m.startDate && m.startDate.year) || 0,
    fmt: m.format || '', eps: m.episodes || 0, dur: m.duration || 0, st: m.status || '', sc: m.averageScore || 0, pop: m.popularity || 0, gen: m.genres || [], stu: ((m.studios && m.studios.nodes) || []).map(s => s.name)[0] || '',
    next: m.nextAiringEpisode ? { ep: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt * 1000 } : null }; };
const nJK = a => { if (!a || !a.mal_id) return null; const I = a.images || {}, y = a.year || (a.aired && a.aired.prop && a.aired.prop.from && a.aired.prop.from.year) || 0;
  return { al: 0, mal: a.mal_id, t: a.title_english || a.title || '', ro: a.title_english && a.title !== a.title_english ? a.title : '', na: a.title_japanese || '', img: (I.webp && I.webp.large_image_url) || (I.jpg && I.jpg.large_image_url) || '', col: '', ban: '', sea: String(a.season || '').toUpperCase(), y,
    fmt: ({ 'TV Special': 'SPECIAL', Movie: 'MOVIE', TV: 'TV', OVA: 'OVA', ONA: 'ONA', Special: 'SPECIAL', Music: 'MUSIC' })[a.type] || String(a.type || '').toUpperCase(), eps: a.episodes || 0, dur: parseInt(a.duration, 10) || 0,
    st: a.airing ? 'RELEASING' : /not yet/i.test(a.status || '') ? 'NOT_YET_RELEASED' : 'FINISHED', sc: a.score ? Math.round(a.score * 10) : 0, pop: a.members || 0, gen: (a.genres || []).concat(a.themes || []).map(g => g.name).slice(0, 6), stu: ((a.studios || [])[0] || {}).name || '', next: null,
    desc: a.synopsis || '', tr: (a.trailer && a.trailer.youtube_id) || '' }; };
const tfetch = async (u, o) => { const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 15000);
  try { const r = await fetch(u, Object.assign({ signal: ac ? ac.signal : undefined }, o)); if (!r.ok) throw new Error((/anilist/.test(u) ? 'AniList ' : 'MyAnimeList ') + r.status); return await r.json(); } finally { to && clearTimeout(to); } };
const gql = async (query, variables) => { const j = await tfetch(AL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables: variables || {} }) }); if (!j || !j.data) throw new Error('AniList: ' + ((j && j.errors && j.errors[0] && j.errors[0].message) || 'sem dados')); return j.data; };
const jk = async p => { const j = await tfetch(JK + p); const seen = new Set(); return (j.data || []).map(nJK).filter(x => x && !seen.has(x.mal) && seen.add(x.mal)); };
const both = async (a, b) => { try { return await a(); } catch (e) { if (!b) throw e; try { return await b(); } catch (e2) { throw e; } } };
const page = (args, n) => `query{Page(perPage:${n || 50}){media(${args},type:ANIME,isAdult:false){${F}}}}`;
const listOf = d => ((d.Page && d.Page.media) || []).map(nAL).filter(Boolean);
const API = {
  search: q => both(() => gql(`query($q:String){Page(perPage:30){media(search:$q,type:ANIME,isAdult:false,sort:SEARCH_MATCH){${F}}}}`, { q }).then(listOf), () => jk('anime?sfw=true&limit=25&q=' + encodeURIComponent(q))),
  season: o => both(() => gql(page(`season:${o.s},seasonYear:${o.y},sort:POPULARITY_DESC`)).then(listOf), () => jk(`seasons/${o.y}/${o.s.toLowerCase()}?sfw=true&limit=25`)),
  trending: () => both(() => gql(page('sort:TRENDING_DESC', 20)).then(listOf), () => jk('top/anime?filter=airing&sfw=true&limit=20')),
  best: y => both(() => gql(page(`startDate_greater:${y}0000,startDate_lesser:${y + 1}0000,sort:SCORE_DESC,popularity_greater:2000,format_in:[TV,TV_SHORT,MOVIE,ONA,OVA,SPECIAL]`)).then(listOf), () => jk(`anime?sfw=true&limit=25&order_by=score&sort=desc&start_date=${y}-01-01&end_date=${y}-12-31`)),
  week: async () => { const a = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000), b = a + 7 * 86400, out = [];
    for (let p = 1; p <= 5; p++) { const d = await gql(`query($a:Int,$b:Int,$p:Int){Page(page:$p,perPage:50){pageInfo{hasNextPage} airingSchedules(airingAt_greater:$a,airingAt_lesser:$b,sort:TIME){episode airingAt media{${F} isAdult}}}}`, { a, b, p });
      const P = d.Page || {}; (P.airingSchedules || []).forEach(s => { const x = s.media && !s.media.isAdult && nAL(s.media); if (x) out.push({ at: s.airingAt * 1000, ep: s.episode, x }); }); if (!(P.pageInfo && P.pageInfo.hasNextPage)) break; }
    return out; },
  // recomendações do AniList para vários animes de uma vez (um pedido com um apelido por anime)
  recs: async S => { const d = await gql('query{' + S.map((x, i) => `s${i}: Media(${x.al ? 'id:' + (+x.al) : 'idMal:' + (+x.mal)},type:ANIME){id recommendations(perPage:15,sort:RATING_DESC){nodes{rating mediaRecommendation{${F}}}}}`).join(' ') + '}');
    return S.map((x, i) => { const M = d['s' + i]; return { t: x.t, k: kOf(x), list: ((M && M.recommendations && M.recommendations.nodes) || []).filter(n => n && n.mediaRecommendation && (n.rating || 0) > 0).map(n => ({ x: nAL(n.mediaRecommendation), r: n.rating })).filter(o => o.x) }; }); },
  genre: g => gql(page(`genre_in:[${JSON.stringify(String(g).replace(/[^A-Za-z' -]/g, ''))}],sort:SCORE_DESC,popularity_greater:20000`, 30)).then(listOf),
  classics: () => both(() => gql(page('sort:SCORE_DESC,popularity_greater:150000', 40)).then(listOf), () => jk('top/anime?sfw=true&limit=25')),
  gems: () => gql(page('sort:SCORE_DESC,popularity_greater:5000,popularity_lesser:50000,averageScore_greater:78', 40)).then(listOf),
  movies: () => both(() => gql(page('format:MOVIE,sort:SCORE_DESC,popularity_greater:40000', 30)).then(listOf), () => jk('top/anime?type=movie&sfw=true&limit=25')),
  // os títulos que a IA sugeriu → os animes certos do AniList (um pedido, variáveis em vez de texto no pedido)
  resolve: async names => { const vs = {}; names.forEach((n, i) => { vs['q' + i] = n; });
    const d = await gql(`query(${names.map((_, i) => '$q' + i + ':String').join(',')}){${names.map((_, i) => `r${i}: Page(perPage:1){media(search:$q${i},type:ANIME,isAdult:false,sort:SEARCH_MATCH){${F}}}`).join(' ')}}`, vs);
    return names.map((_, i) => nAL(((d['r' + i] || {}).media || [])[0])); },
  detail: x => both(async () => { const d = await gql(x.al ? `query($id:Int){Media(id:$id,type:ANIME){${FD}}}` : `query($mal:Int){Media(idMal:$mal,type:ANIME){${FD}}}`, x.al ? { id: x.al } : { mal: x.mal }), m = d.Media, n = nAL(m); if (!n) throw new Error('AniList: não encontrado');
    n.desc = clean(m.description); n.tr = m.trailer && m.trailer.site === 'youtube' ? m.trailer.id : '';
    n.links = (m.externalLinks || []).filter(l => l.type === 'STREAMING' && /^https:\/\//.test(l.url || '')).map(l => ({ site: l.site, url: l.url }));
    n.rank = (m.rankings || []).filter(r => r.type === 'RATED').map(r => ({ rank: r.rank, all: r.allTime, y: r.year, s: r.season, ctx: r.context }));
    n.rel = ((m.relations && m.relations.edges) || []).map(e => ({ t: e.relationType, x: nAL(e.node) })).filter(r => r.x);
    n.rec = ((m.recommendations && m.recommendations.nodes) || []).map(r => nAL(r.mediaRecommendation)).filter(Boolean); return n; },
  x.mal ? async () => { const j = await tfetch(JK + 'anime/' + x.mal + '/full'), n = nJK(j.data); if (!n) throw new Error('MyAnimeList: não encontrado'); n.desc = clean(n.desc); n.links = ((j.data && j.data.streaming) || []).filter(l => /^https:\/\//.test(l.url || '')).map(l => ({ site: l.name, url: l.url })); n.rel = []; n.rec = []; n.rank = []; return n; } : null)
};

/* ---------- memória e carregamentos (cada coisa só volta a pedir quando fica velha) ---------- */
const ITEMS = new Map();            // chave → anime (de qualquer lista que já apareceu no ecrã)
// junta o que se sabe de um anime sem apagar nada (um campo vazio nunca tapa um que já se conhecia)
const keep = x => { if (!x) return x; const k = kOf(x), o = ITEMS.get(k); if (!o) { ITEMS.set(k, Object.assign({}, x)); return ITEMS.get(k); }
  Object.keys(x).forEach(f => { const v = x[f]; if (v != null && v !== '' && v !== 0 && !(Array.isArray(v) && !v.length)) o[f] = v; }); return o; };
const CK = 'oc_an_c1', CACHE = U.ls.get(CK, {}) || {};
const cGet = (k, ttl) => { const c = CACHE[k]; return c && Date.now() - c.at < ttl ? c.v : null; };
const cSet = (k, v) => { CACHE[k] = { at: Date.now(), v }; const ks = Object.keys(CACHE); if (ks.length > 10) ks.sort((a, b) => CACHE[a].at - CACHE[b].at).slice(0, ks.length - 10).forEach(x => delete CACHE[x]); try { U.ls.set(CK, CACHE); } catch (e) { } };
const DATA = {}, TRY = {}, ERR = {}, PEND = new Set();
const need = (k, ttl, f, store) => { let d = DATA[k]; if (!d && store) { const c = cGet(k, ttl); if (c) d = DATA[k] = { at: Date.now() - 1, v: c }; }
  if ((!d || Date.now() - d.at > ttl) && !PEND.has(k) && !(TRY[k] && Date.now() - TRY[k] < 8000)) { TRY[k] = Date.now(); PEND.add(k);
    f().then(v => { DATA[k] = { at: Date.now(), v }; if (store) cSet(k, v); delete ERR[k]; }).catch(e => { ERR[k] = (e && e.message) || 'erro'; }).finally(() => { PEND.delete(k); if (/^#animes/.test(location.hash)) OS.request(); }); }
  const v = d ? d.v : null; if (Array.isArray(v)) v.forEach(x => { const y = x && x.x ? x.x : x; if (y && (y.al || y.mal)) keep(y); }); return v; };
const H6 = 6 * 36e5;
const errBox = k => ERR[k] ? `<div class="note an-err">Não consegui falar com a base de animes (${esc(ERR[k])}). Tenta outra vez daqui a pouco. <button class="btn xs" data-act="anRetry" data-k="${esc(k)}">Tentar outra vez</button></div>` : '';
const loading = t => `<div class="an-ld"><span class="an-sp" aria-hidden="true"></span>${esc(t || 'A buscar os animes…')}</div>`;
A.anRetry = b => { delete TRY[b.dataset.k]; delete ERR[b.dataset.k]; delete DATA[b.dataset.k]; OS.request(); };

/* ---------- peças do ecrã ---------- */
const cover = (x, cls) => x.img ? `<img class="an-img ${cls || ''}" src="${esc(x.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="an-img an-img0 ${cls || ''}" aria-hidden="true">${esc(String(x.t || '?').slice(0, 2).toUpperCase())}</span>`;
const colOf = x => /^#[0-9a-f]{6}$/i.test(x.col || '') ? x.col : 'var(--accent)';
const subOf = x => [fmtN(x.fmt), x.eps ? x.eps + (x.eps === 1 ? ' episódio' : ' episódios') : '', x.y || ''].filter(Boolean).join(' · ');
const poster = (x, o) => { o = o || {}; x = keep(x); const m = mine(x), k = kOf(x), p = m && m.status === 'A ver' && (m.eps || x.eps) ? Math.min(100, Math.round((m.ep || 0) / (m.eps || x.eps) * 100)) : 0;
  return `<button type="button" class="an-pc${o.cls ? ' ' + o.cls : ''}" data-act="anOpen" data-k="${esc(k)}" style="--c:${colOf(x)}" aria-label="${esc(x.t)}">
    <span class="an-pi">${cover(x)}${o.rank ? `<span class="an-rk">${o.rank}</span>` : ''}${m ? `<span class="an-mb s-${STC[m.status] || 'quero'}">${esc(m.status)}${m.nota ? ' · ' + m.nota : ''}</span>` : ''}${x.sc && !o.nosc ? `<span class="an-sc">${UI.ic('star')}${scT(x.sc)}</span>` : ''}${p ? `<span class="an-pg"><i style="width:${p}%"></i></span>` : ''}</span>
    <b>${esc(x.t)}</b><small>${esc(o.sub != null ? o.sub : subOf(x))}</small></button>`; };
const row = (title, list, o) => { o = o || {}; if (!list || !list.length) return ''; return `<section class="an-row"><div class="an-rh"><h3>${title}</h3>${o.more ? `<a class="an-more" href="${o.more}">Ver tudo</a>` : ''}<span class="an-arr"><button type="button" class="icon-btn" data-act="anScroll" data-d="-1" aria-label="Para trás">${UI.ic('left')}</button><button type="button" class="icon-btn" data-act="anScroll" data-d="1" aria-label="Para a frente">${UI.ic('right')}</button></span></div>
  <div class="an-strip">${list.map(x => poster(x.x || x, o.card ? o.card(x) : {})).join('')}</div></section>`; };
A.anScroll = b => { const s = b.closest('.an-row') && b.closest('.an-row').querySelector('.an-strip'); if (s) s.scrollBy({ left: +b.dataset.d * s.clientWidth * .85, behavior: 'smooth' }); };
const grid = list => `<div class="an-grid">${list.map(x => poster(x)).join('')}</div>`;
const nextT = x => x.next && x.next.at > Date.now() ? `Episódio ${x.next.ep} daqui a ${until(x.next.at)} (${WD[new Date(x.next.at).getDay()]}, ${dm(x.next.at)} às ${hm(x.next.at)})` : '';
const fromMine = a => pick(a);

/* ---------- ações da lista ---------- */
const setStatus = (x, status) => { const ex = mine(x), p = { status }, eps = (ex && ex.eps) || x.eps || 0;
  if (status === 'A ver' && !(ex && ex.start)) p.start = today();
  if (status === 'Visto') { p.end = today(); if (eps) p.ep = eps; if (!(ex && ex.start)) p.start = today(); }
  if (status === 'Larguei' || status === 'Em pausa') p.end = today();
  if (ex) { OS.upd('animes', ex.id, Object.assign(pick(Object.assign({}, ex, x)), p)); return OS.get('animes', ex.id); }
  return OS.add('animes', Object.assign(pick(x), { ep: 0, nota: 0, fav: false, added: today() }, p)); };
const itemOf = k => ITEMS.get(k) || (() => { const m = mineAll().find(a => kOf(a) === k); return m ? fromMine(m) : null; })();
A.anSet = b => { const x = itemOf(b.dataset.k); if (!x) return; const r = setStatus(x, b.dataset.s); UI.toast(`${x.t}: ${b.dataset.s}`, 'pos'); if (b.dataset.s === 'Visto' && r && !r.nota) UI.toast('Dá-lhe uma nota de 1 a 10 e escreve a tua resenha', 'pos'); };
A.anEp = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; const max = +a.eps || 9999, ep = Math.max(0, Math.min(max, (+a.ep || 0) + (+b.dataset.d || 1))), p = { ep };
  if (a.status === 'Quero ver' && ep > 0) { p.status = 'A ver'; p.start = a.start || today(); }
  if (+a.eps && ep >= +a.eps && a.status !== 'Visto') { p.status = 'Visto'; p.end = today(); UI.toast(`Terminaste ${a.t}. Que nota lhe dás?`, 'pos'); }
  OS.upd('animes', a.id, p); };
A.anNota = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; const v = +b.dataset.v; OS.upd('animes', a.id, { nota: +a.nota === v ? 0 : v }); };
A.anFav = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; OS.upd('animes', a.id, { fav: !a.fav }); UI.toast(a.fav ? 'Nos teus favoritos' : 'Saiu dos favoritos', 'pos'); };
A.anTier = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; OS.upd('animes', a.id, { tier: a.tier === b.dataset.t ? '' : b.dataset.t }); if (b.closest('.modal, #modal')) UI.closeModal(); };
A.anTierPick = b => { const a = OS.get('animes', b.dataset.id); if (!a) return;
  UI.modal(`<div class="an-tp"><div class="row between" style="align-items:center"><h3 style="margin:0">Em que tier fica?</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><p class="mut" style="margin:6px 0 12px">${esc(a.t)}</p>
    <div class="an-tpb">${TIERS.map(([t, n]) => `<button type="button" class="an-tb t${t}${a.tier === t ? ' on' : ''}" data-act="anTier" data-id="${a.id}" data-t="${t}"><b>${t}</b><small>${n}</small></button>`).join('')}</div>
    ${a.tier ? `<button type="button" class="btn sm ghost" data-act="anTier" data-id="${a.id}" data-t="${a.tier}" style="margin-top:10px">Tirar do tier</button>` : ''}</div>`, 'an-modal'); };
A.anDel = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; UI.ask('Tirar da tua lista?', `${esc(a.t)} sai da tua lista (com a nota e a resenha).`, 'Tirar', () => { OS.del('animes', a.id); topSave(topL().filter(id => id !== a.id)); }); };
OS.forms.anRev = (f, v) => { const a = OS.get('animes', f.dataset.id); if (!a) return false; OS.upd('animes', a.id, { rev: String(v('rev') || '').trim().slice(0, 5000) }); UI.toast('Resenha guardada', 'pos'); return false; };
A.anOpen = b => { OS.ui.anK = b.dataset.k; location.hash = 'animes.anime'; OS.request(); };

/* top 10 da vida: one('animetop').list = ids da tua lista, por ordem */
const topL = () => ((OS.one('animetop') || {}).list || []).filter(id => OS.get('animes', id)).slice(0, 10);
const topSave = L => OS.setOne('animetop', { list: L.slice(0, 10) });
A.anTop = b => { const L = topL(), id = b.dataset.id; if (L.includes(id)) { topSave(L.filter(x => x !== id)); return UI.toast('Saiu do teu top 10', 'pos'); } if (L.length >= 10) return UI.toast('O top já tem 10. Tira um primeiro: só cabem os 10 melhores.', 'warn'); L.push(id); topSave(L); UI.toast(`Entrou no teu top, em ${L.length}.º`, 'pos'); };
A.anTopMove = b => { const L = topL(), i = +b.dataset.i, j = i + +b.dataset.d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; topSave(L); };
A.anTopCopy = async () => { const t = 'O meu top 10 de animes:\n' + topL().map((id, i) => `${i + 1}. ${OS.get('animes', id).t}`).join('\n'); try { await navigator.clipboard.writeText(t); UI.toast('Top 10 copiado', 'pos'); } catch (e) { UI.toast('Não consegui copiar neste aparelho', 'warn'); } };

/* sinopse traduzida pela IA (só quando carregas no botão; guardada no aparelho) */
const TRK = 'oc_an_tr', TR = U.ls.get(TRK, {}) || {}; let TRB = '';
const langName = () => { const l = (OS.one('profile') || {}).lang || 'pt-PT'; return { 'pt-BR': 'português do Brasil', 'pt-PT': 'português de Portugal', es: 'espanhol', fr: 'francês', it: 'italiano', de: 'alemão' }[l] || (/^en/.test(l) ? '' : 'português de Portugal'); };
A.anTr = async b => { const k = b.dataset.k, d = DATA['d:' + k] && DATA['d:' + k].v; if (!d || !d.desc || TRB) return; if (!OS.AI || !OS.AI.json) return UI.toast('A IA não está disponível neste aparelho', 'warn');
  TRB = k; OS.request(); try { const o = await OS.AI.json([{ text: `Traduz para ${langName()} esta sinopse de anime, de forma fiel e natural (mantém os nomes próprios). Responde APENAS JSON {"t":"…"}. Sinopse: ` + JSON.stringify(d.desc.slice(0, 2500)) }], .1);
    if (o && o.t) { TR[k] = String(o.t).slice(0, 4000); const ks = Object.keys(TR); if (ks.length > 80) delete TR[ks[0]]; U.ls.set(TRK, TR); } } catch (e) { UI.toast(/não está ligada/i.test((e && e.message) || '') ? 'A IA ainda não está ligada: liga-a em Definições › IA.' : 'A IA não conseguiu traduzir agora. Tenta outra vez.', 'warn'); }
  TRB = ''; OS.request(); };
A.anTrailer = b => { const box = document.getElementById('anTrl'); if (!box) return; box.innerHTML = box.innerHTML ? '' : `<div class="an-ytp"><iframe src="https://www.youtube-nocookie.com/embed/${esc(b.dataset.y)}?autoplay=1&playsinline=1&rel=0" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`; };

/* ================= páginas ================= */
const AT = [['', 'Início'], ['recomendados', 'Para ti'], ['temporada', 'Temporada'], ['calendario', 'Calendário'], ['melhores', 'Melhores do ano'], ['lista', 'A minha lista'], ['tier', 'Top 10 e tier list'], ['pesquisar', 'Pesquisar']];
const P = {};
V.animes = sub => { const k = sub === 'anime' ? 'anime' : P[sub || ''] ? (sub || '') : '';
  return UI.head('Animes', 'Todos os animes do mundo: o que estás a ver, já viste ou queres ver, com a tua nota, resenha e tier list. E para descobrir: a temporada, os episódios da semana e os melhores de cada ano.', `<a class="btn pri" href="#animes.pesquisar">${UI.ic('search')}<span>Pesquisar anime</span></a>`, 'Eu')
    + UI.tabs('animes', AT, k === 'anime' ? '' : k) + `<div class="an">${(k === 'anime' ? detail : P[k])()}</div>`; };

/* Início: em destaque, continuar a ver, esta temporada, em alta, favoritos e o que queres ver */
P[''] = () => { const S = sNow(), L = mineAll(), sea = need('s:' + S.y + S.s, H6, () => API.season(S), true), tr = need('trend', H6, API.trending, true);
  const watching = U.sortBy(L.filter(a => a.status === 'A ver'), a => -(a._u || 0)), want = L.filter(a => a.status === 'Quero ver'), favs = L.filter(a => a.fav);
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5), pool = (sea || []).filter(x => x.ban).slice(0, 8), hx = watching.find(a => a.ban) ? fromMine(watching.find(a => a.ban)) : pool.length ? pool[doy % pool.length] : null;
  const hero = hx ? (() => { const x = keep(Object.assign({}, ITEMS.get(kOf(hx)) || {}, hx)), m = mine(x), nt = nextT(x);
    return `<section class="an-hero" style="--c:${colOf(x)}"><img class="an-hb" src="${esc(x.ban)}" alt="" decoding="async" referrerpolicy="no-referrer"><div class="an-hg"></div>
      <div class="an-hc">${cover(x, 'an-hp')}<div class="an-ht"><span class="an-hk">${m && m.status === 'A ver' ? 'Continuas a ver' : 'Em destaque em ' + esc(sName(S))}</span><h2>${esc(x.t)}</h2>
        <p class="an-hm">${[fmtN(x.fmt), x.eps ? x.eps + ' episódios' : '', x.stu, (x.gen || []).slice(0, 3).map(gN).join(', ')].filter(Boolean).map(esc).join(' · ')}</p>${x.sc ? `<p class="an-hs">${UI.ic('star')}<b>${scT(x.sc)}</b> nota da comunidade</p>` : ''}${nt ? `<p class="an-hn">${esc(nt)}</p>` : ''}
        <div class="an-hb2"><button type="button" class="btn pri" data-act="anOpen" data-k="${esc(kOf(x))}">Ver detalhes</button>${m && m.status === 'A ver' ? `<button type="button" class="btn" data-act="anEp" data-id="${m.id}" data-d="1">${UI.ic('plus')}Vi o episódio ${(+m.ep || 0) + 1}</button>` : !m ? `<button type="button" class="btn" data-act="anSet" data-k="${esc(kOf(x))}" data-s="Quero ver">${UI.ic('plus')}Quero ver</button>` : ''}</div></div></div></section>`; })() : (sea ? '' : errBox('s:' + S.y + S.s) || loading());
  const cont = watching.length ? `<section class="an-row"><div class="an-rh"><h3>Continuar a ver</h3><a class="an-more" href="#animes.lista">A minha lista</a></div><div class="an-cw">${watching.slice(0, 8).map(a => { const x = keep(fromMine(a)), t = +a.eps || 0, ep = +a.ep || 0;
      return `<div class="an-cwi" style="--c:${colOf(a)}"><button type="button" class="an-cwc" data-act="anOpen" data-k="${esc(kOf(a))}">${cover(x, 'sm')}</button><div class="an-cwt"><b class="click" data-act="anOpen" data-k="${esc(kOf(a))}">${esc(a.t)}</b><small>${t ? `Episódio ${ep} de ${t}` : `Episódio ${ep}`}</small>${t ? `<span class="an-bar"><i style="width:${Math.round(ep / t * 100)}%"></i></span>` : ''}</div><button type="button" class="btn sm" data-act="anEp" data-id="${a.id}" data-d="1" aria-label="Vi mais um episódio">${UI.ic('plus')}1</button></div>`; }).join('')}</div></section>` : '';
  const SD = seedsOf(), rby = SD.length ? need(recKey(SD), 12 * 36e5, () => API.recs(SD), true) : null, ragg = rby ? recsAgg(rby, SD) : [];
  return hero + cont + (ragg.length ? row('Recomendado para ti', ragg.slice(0, 20).map(c => c.x), { more: '#animes.recomendados', card: x => { const c = ragg.find(z => z.x === x); return { sub: c ? 'Porque viste ' + c.why[0] : '' }; } }) : '')
    + row(`${esc(sName(S))} <small>${SEM[S.s]}</small>`, (sea || []).slice(0, 20), { more: '#animes.temporada' })
    + row('Em alta agora', (tr || []).slice(0, 20)) + row('Os teus favoritos', favs.map(fromMine), { card: () => ({ nosc: 1 }) }) + row('Queres ver', want.map(fromMine), { card: () => ({ nosc: 1 }) })
    + (!L.length ? `<div class="pn an-wel"><h3>Começa a tua lista</h3><p class="mut">Pesquisa os animes que já viste e marca <b>Já vi</b>, ou toca num da temporada para o seguires episódio a episódio.</p><a class="btn pri" href="#animes.pesquisar">${UI.ic('search')}Pesquisar anime</a></div>` : '')
    + (tr ? '' : errBox('trend')) + '<p class="mut an-src">Dados do AniList e do MyAnimeList.</p>'; };

/* Para ti: recomendações a partir do que viste e das tuas notas, dos teus géneros, clássicos, joias escondidas, filmes e a IA */
// sementes: os que viste ou estás a ver e de que gostaste (favoritos e as melhores notas primeiro; nota abaixo de 6 não conta)
const seedsOf = () => U.sortBy(mineAll().filter(a => ['Visto', 'A ver', 'Em pausa'].includes(a.status) && !(+a.nota && +a.nota < 6) && (a.al || a.mal)), a => -((a.fav ? 100 : 0) + (+a.nota || 6.5) * 10 + (a._u || 0) / 1e13)).slice(0, 6);
const recKey = S => 'r:' + S.map(kOf).join(',');
const recsAgg = (by, S) => { const m = new Map(), seedK = new Set(S.map(kOf));
  (by || []).forEach(b => { const sd = S.find(z => kOf(z) === b.k) || {}, w = (sd.fav ? 1.5 : 1) * ((+sd.nota || 7) / 7);
    (b.list || []).forEach((o, j) => { const k = kOf(o.x); if (seedK.has(k) || mine(o.x)) return; const c = m.get(k) || { x: o.x, s: 0, why: [] }; c.s += w * Math.log(1 + o.r) * (1 - j / 30); if (!c.why.includes(b.t)) c.why.push(b.t); m.set(k, c); }); });
  return [...m.values()].sort((a, b) => b.s - a.s || (b.x.sc || 0) - (a.x.sc || 0)); };
const topGenres = () => { const c = {}; mineAll().filter(a => ['Visto', 'A ver'].includes(a.status) && !(+a.nota && +a.nota < 6)).forEach(a => (a.gen || []).forEach(g => { c[g] = (c[g] || 0) + (+a.nota >= 8 ? 2 : 1); })); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]); };
const fresh = L => (L || []).filter(x => !mine(x));
const AIRK = 'oc_an_air'; let AIR = U.ls.get(AIRK, null), AIB = false, AIE = '';
const aiBox = () => { const r = AIR && Array.isArray(AIR.items) ? AIR.items.filter(o => o.x && !mine(o.x)) : [];
  return `<section class="pn an-ai"><div class="pn-h"><h3>${UI.ic('brain')}Pede à IA</h3></div><p class="mut">Diz o que te apetece ver e a IA escolhe 8 animes a pensar na tua lista (os que já tens ficam de fora).</p>
    <form class="an-aif" data-form="anAI"><input class="field" name="q" value="${esc((AIR && AIR.q) || '')}" placeholder="Ex.: algo curto e leve, parecido com Frieren, um filme para ver hoje" aria-label="O que te apetece ver?" maxlength="200" autocomplete="off"><button class="btn pri" ${AIB ? 'disabled' : ''}>${AIB ? 'A pensar…' : 'Recomendar'}</button></form>
    ${AIE ? `<p class="an-aie">${esc(AIE)}</p>` : ''}${r.length ? `<ul class="an-air">${r.map(o => { const x = keep(o.x), kk = esc(kOf(x));
      return `<li style="--c:${colOf(x)}"><button type="button" class="an-rc" data-act="anOpen" data-k="${kk}">${cover(x, 'sm')}</button><div class="an-ri"><b class="click" data-act="anOpen" data-k="${kk}">${esc(x.t)}</b><small>${esc(subOf(x))}</small>${o.why ? `<p>${esc(o.why)}</p>` : ''}<span class="an-rq"><button type="button" class="btn xs" data-act="anSet" data-k="${kk}" data-s="Quero ver">Quero ver</button><button type="button" class="btn xs ghost" data-act="anSet" data-k="${kk}" data-s="Visto">Já vi</button></span></div>${x.sc ? `<span class="an-rs"><b>${scT(x.sc)}</b><small>de 10</small></span>` : ''}</li>`; }).join('')}</ul>` : ''}</section>`; };
OS.forms.anAI = async (f, v) => { if (AIB) return; if (!OS.AI || !OS.AI.json) { UI.toast('A IA não está disponível neste aparelho', 'warn'); return; }
  const q = String(v('q') || '').trim().slice(0, 200), L = U.sortBy(mineAll(), a => -(a._u || 0)).slice(0, 60).map(a => `${a.t} · ${a.status}${a.nota ? ' · nota ' + a.nota : ''}`);
  AIB = true; AIE = ''; AIR = Object.assign({}, AIR || {}, { q }); OS.request();
  try { const o = await OS.AI.json([{ text: `És um especialista em anime. Recomenda 8 animes que esta pessoa ainda não viu (nenhum da lista dela)${q ? ', a pensar no que ela pede agora: ' + JSON.stringify(q) : ''}. Escolhe só animes que existem mesmo e escreve o título como aparece no AniList (em romaji ou em inglês). Lista da pessoa (título · estado · nota de 1 a 10): ${L.length ? L.join('; ') : 'ainda vazia'}. Responde APENAS JSON {"recs":[{"titulo":"…","porque":"uma frase curta, em ${langName() || 'inglês'}, a dizer porque é para ela"}]}` }], .5);
    const recs = ((o && o.recs) || []).filter(r => r && r.titulo).slice(0, 8); if (!recs.length) throw new Error('a IA não respondeu com animes');
    const X = await API.resolve(recs.map(r => String(r.titulo).slice(0, 100))), seen = new Set();
    const items = recs.map((r, i) => ({ x: X[i] ? Object.assign(pick(X[i]), { sc: X[i].sc || 0 }) : null, why: String(r.porque || '').slice(0, 300) })).filter(o => o.x && !mine(o.x) && !seen.has(kOf(o.x)) && seen.add(kOf(o.x)));
    if (!items.length) throw new Error('as sugestões já estão todas na tua lista');
    AIR = { at: Date.now(), q, items }; try { U.ls.set(AIRK, AIR); } catch (e) { }
  } catch (e) { AIE = /não está ligada/i.test((e && e.message) || '') ? 'A IA ainda não está ligada: liga-a em Definições › IA.' : 'A IA não conseguiu recomendar agora (' + ((e && e.message) || 'erro') + '). Tenta outra vez.'; }
  AIB = false; OS.request(); };
P.recomendados = () => { const S = seedsOf(), k = recKey(S), by = S.length ? need(k, 12 * 36e5, () => API.recs(S), true) : null, agg = by ? recsAgg(by, S) : null, G = topGenres();
  const gl = G.map(g => ({ g, L: need('g:' + g, 24 * 36e5, () => API.genre(g), true) })), cl = need('classics', 24 * 36e5, API.classics, true), gm = need('gems', 24 * 36e5, API.gems, true), mv = need('movies', 24 * 36e5, API.movies, true);
  const head = `<section class="an-fy"><h2>Recomendado para ti</h2><p class="mut">${S.length ? `A partir do que viste e das tuas notas (${S.slice(0, 3).map(x => esc(x.t)).join(', ')}${S.length > 3 ? '…' : ''}). O que já está na tua lista não aparece: marca <b>Quero ver</b> ou <b>Já vi</b> e as sugestões mudam.` : `Marca alguns animes que já viste (e dá-lhes nota) para as recomendações ficarem à tua medida. Até lá, ficam os que quase toda a gente adora.`}</p></section>`;
  const pickT = S.length ? (agg ? (agg.length ? `<section class="an-row"><div class="an-rh"><h3>A escolha para ti</h3></div><div class="an-grid">${agg.slice(0, 12).map(c => poster(c.x, { sub: 'Porque viste ' + c.why.slice(0, 2).join(' e ') })).join('')}</div></section>` : '') : errBox(k) || loading('A escolher animes para ti…')) : '';
  return head + pickT + aiBox()
    + (S.length > 1 ? (by || []).slice(0, 4).map(b => row(`Porque viste ${esc(b.t)}`, fresh(b.list.map(o => o.x)).slice(0, 15))).join('') : '')
    + gl.map(o => row(`Mais ${esc(gN(o.g))}`, fresh(o.L).slice(0, 20))).join('')
    + row('Clássicos que quase toda a gente adora', fresh(cl).slice(0, 20)) + row('Joias escondidas (muito boas e pouco conhecidas)', fresh(gm).slice(0, 20)) + row('Filmes imperdíveis', fresh(mv).slice(0, 20))
    + (cl ? '' : errBox('classics') || loading()) + '<p class="mut an-src">Recomendações da comunidade do AniList.</p>'; };

/* Temporada: escolhe a estação e o ano; ordena por popularidade, nota ou próximo episódio */
P.temporada = () => { const S = OS.ui.anS || sNow(), k = 's:' + S.y + S.s, L = need(k, H6, () => API.season(S), true), f = OS.ui.anSf || {};
  const gens = [...new Set((L || []).flatMap(x => x.gen || []))].sort((a, b) => gN(a).localeCompare(gN(b)));
  let it = (L || []).filter(x => (!f.fmt || (f.fmt === 'MOVIE' ? x.fmt === 'MOVIE' : f.fmt === 'TV' ? /^TV/.test(x.fmt) : !/^TV|MOVIE/.test(x.fmt))) && (!f.g || (x.gen || []).includes(f.g)));
  it = f.o === 'nota' ? U.sortBy(it, x => -(x.sc || 0)) : f.o === 'prox' ? U.sortBy(it, x => x.next ? x.next.at : 9e15) : it;
  const sel = `<div class="an-sea"><button type="button" class="icon-btn" data-act="anSea" data-d="-1" aria-label="Temporada anterior">${UI.ic('left')}</button><div><h2>${esc(sName(S))}</h2><small class="mut">Animes que estrearam de ${SEM[S.s]} de ${S.y}</small></div><button type="button" class="icon-btn" data-act="anSea" data-d="1" aria-label="Temporada seguinte">${UI.ic('right')}</button>${S.y !== sNow().y || S.s !== sNow().s ? `<button type="button" class="btn xs ghost" data-act="anSea" data-d="0">Voltar à atual</button>` : ''}</div>`;
  const filt = `<div class="an-fl"><div class="row gap6" style="flex-wrap:wrap">${[['', 'Tudo'], ['TV', 'Séries'], ['MOVIE', 'Filmes'], ['OUT', 'Outros']].map(([v, l]) => UI.chip(l, 'anSf', (f.fmt || '') === v, `data-k="fmt" data-v="${v}"`)).join('')}</div>
    <div class="row gap6"><select class="field" data-ansel="anSfSel" data-k="g" aria-label="Género"><option value="">Todos os géneros</option>${gens.map(g => `<option value="${esc(g)}"${f.g === g ? ' selected' : ''}>${esc(gN(g))}</option>`).join('')}</select>
    <select class="field" data-ansel="anSfSel" data-k="o" aria-label="Ordenar"><option value="">Mais populares</option><option value="nota"${f.o === 'nota' ? ' selected' : ''}>Melhor nota</option><option value="prox"${f.o === 'prox' ? ' selected' : ''}>Próximo episódio</option></select></div></div>`;
  return sel + filt + errBox(k) + (!L ? loading('A buscar a temporada…') : it.length ? `<div class="an-grid">${it.map(x => poster(x, { sub: x.next && x.next.at > Date.now() ? `Ep. ${x.next.ep} · ${WD[new Date(x.next.at).getDay()].slice(0, 3)} ${hm(x.next.at)}` : subOf(x) })).join('')}</div>` : UI.empty('Nenhum anime com estes filtros nesta temporada.')); };
A.anSea = b => { const d = +b.dataset.d; OS.ui.anS = d ? sShift(OS.ui.anS || sNow(), d) : null; OS.request(); };
A.anSf = b => { OS.ui.anSf = Object.assign({}, OS.ui.anSf || {}, { [b.dataset.k]: b.dataset.v }); OS.request(); };
document.addEventListener('change', e => { const el = e.target; if (!el || !el.dataset || el.dataset.ansel !== 'anSfSel') return; OS.ui.anSf = Object.assign({}, OS.ui.anSf || {}, { [el.dataset.k]: el.value }); OS.request(); });

/* Calendário: os episódios da semana, dia a dia, à tua hora */
P.calendario = () => { const W = need('week', 30 * 6e4, API.week), only = !!OS.ui.anCalMine, L = mineAll();
  if (!W) return errBox('week') || loading('A buscar os episódios da semana…');
  const isMine = x => !!mine(x), list = W.filter(e => !only || isMine(e.x)), days = new Map();
  list.forEach(e => { const k = U.iso(new Date(e.at)); if (!days.has(k)) days.set(k, []); days.get(k).push(e); });
  const td = today(), out = [...days.entries()].map(([d, es]) => { const t = new Date(es[0].at);
    const wd = WD[t.getDay()], rel = d === td ? 'Hoje' : d === U.addDays(td, 1) ? 'Amanhã' : '';
    return `<section class="an-day${d === td ? ' td' : ''}"><h3>${rel || esc(wd.replace(/^./, c => c.toUpperCase()))} <small>${rel ? esc(wd) + ', ' : ''}${dm(es[0].at)}</small></h3>
      <div class="an-eps">${es.map(e => { const x = keep(e.x), m = mine(x);
        return `<button type="button" class="an-epi${m ? ' mine' : ''}${e.at < Date.now() ? ' past' : ''}" data-act="anOpen" data-k="${esc(kOf(x))}" style="--c:${colOf(x)}"><span class="an-et">${hm(e.at)}</span>${cover(x, 'xs')}<span class="an-en"><b>${esc(x.t)}</b><small>Episódio ${e.ep}${x.eps ? ' de ' + x.eps : ''}${m ? ' · na tua lista' : ''}</small></span></button>`; }).join('')}</div></section>`; }).join('');
  return `<div class="an-calh"><p class="mut">Os episódios novos dos próximos 7 dias, à hora do teu aparelho (a hora a que saem no Japão). Normalmente chegam às plataformas de streaming no mesmo dia.</p>
    <label class="an-sw"><input type="checkbox" data-act="anCalMine" ${only ? 'checked' : ''}${L.length ? '' : ' disabled'}><span>Só os da minha lista</span></label></div>`
    + (out || UI.empty(only ? 'Nenhum dos animes da tua lista tem episódio novo esta semana.' : 'Sem episódios marcados para esta semana.')); };
A.anCalMine = b => { OS.ui.anCalMine = b.checked ? 1 : 0; OS.request(); };

/* Melhores do ano: escolhe o ano */
P.melhores = () => { const y0 = new Date().getFullYear(), y = +OS.ui.anY || y0, k = 'b:' + y, L = need(k, y === y0 ? H6 : 72 * 36e5, () => API.best(y), true), f = OS.ui.anBf || '';
  const it = (L || []).filter(x => !f || (f === 'MOVIE' ? x.fmt === 'MOVIE' : x.fmt !== 'MOVIE'));
  const years = []; for (let i = y0; i >= 1960; i--) years.push(i);
  return `<div class="an-sea"><button type="button" class="icon-btn" data-act="anYear" data-d="-1" aria-label="Ano anterior">${UI.ic('left')}</button><div><h2>Os melhores de ${y}</h2><small class="mut">Pela nota da comunidade (os mais votados, para não aparecerem desconhecidos)</small></div><button type="button" class="icon-btn" data-act="anYear" data-d="1" aria-label="Ano seguinte" ${y >= y0 ? 'disabled' : ''}>${UI.ic('right')}</button>
      <select class="field an-ys" data-ansel="anYearSel" aria-label="Escolher o ano">${years.map(v => `<option${v === y ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="row gap6" style="flex-wrap:wrap">${[['', 'Tudo'], ['TV', 'Séries'], ['MOVIE', 'Filmes']].map(([v, l]) => UI.chip(l, 'anBf', f === v, `data-v="${v}"`)).join('')}</div>`
    + errBox(k) + (!L ? loading('A buscar os melhores de ' + y + '…') : it.length ? `<ol class="an-rank">${it.slice(0, 50).map((x, i) => { x = keep(x); const m = mine(x), kk = esc(kOf(x));
      return `<li style="--c:${colOf(x)}"><span class="an-rn${i < 3 ? ' p' + (i + 1) : ''}">${i + 1}</span><button type="button" class="an-rc" data-act="anOpen" data-k="${kk}">${cover(x, 'sm')}</button>
        <div class="an-ri"><b class="click" data-act="anOpen" data-k="${kk}">${esc(x.t)}</b><small>${esc([fmtN(x.fmt), x.eps ? x.eps + ' ep.' : '', x.stu].filter(Boolean).join(' · '))}</small><small class="an-rg">${esc((x.gen || []).slice(0, 3).map(gN).join(', '))}</small>
          <span class="an-rq">${m ? `<span class="an-mb s-${STC[m.status]}">${esc(m.status)}${m.nota ? ' · a tua nota ' + m.nota : ''}</span>` : `<button type="button" class="btn xs" data-act="anSet" data-k="${kk}" data-s="Visto">Já vi</button><button type="button" class="btn xs ghost" data-act="anSet" data-k="${kk}" data-s="Quero ver">Quero ver</button>`}</span></div>
        <span class="an-rs">${x.sc ? `<b>${scT(x.sc)}</b><small>de 10</small>` : ''}</span></li>`; }).join('')}</ol>` : UI.empty('Sem animes com votos suficientes nesse ano.')); };
A.anYear = b => { const y0 = new Date().getFullYear(); OS.ui.anY = Math.min(y0, Math.max(1960, (+OS.ui.anY || y0) + +b.dataset.d)); OS.request(); };
A.anBf = b => { OS.ui.anBf = b.dataset.v; OS.request(); };
document.addEventListener('change', e => { const el = e.target; if (!el || !el.dataset || el.dataset.ansel !== 'anYearSel') return; OS.ui.anY = +el.value; OS.request(); });

/* A minha lista: estados, nota média, horas vistas e os géneros que mais vês */
P.lista = () => { const L = mineAll(), f = OS.ui.anLf || '', o = OS.ui.anLo || '';
  const vistos = L.filter(a => a.status === 'Visto'), eps = U.sum(L, a => +a.ep || 0), mins = U.sum(L, a => (+a.ep || 0) * (+a.dur || 24)), rated = L.filter(a => +a.nota);
  let it = L.filter(a => f === 'fav' ? a.fav : !f || a.status === f);
  it = o === 'nota' ? U.sortBy(it, a => -(+a.nota || 0)) : o === 'nome' ? U.sortBy(it, a => norm(a.t)) : U.sortBy(it, a => -(a._u || 0));
  const gc = {}; vistos.concat(L.filter(a => a.status === 'A ver')).forEach(a => (a.gen || []).forEach(g => { gc[g] = (gc[g] || 0) + 1; })); const topG = Object.entries(gc).sort((a, b) => b[1] - a[1]).slice(0, 5), gmax = topG.length ? topG[0][1] : 1;
  const hrs = mins / 60;
  return `<div class="kpis">${UI.kpi('Vistos', vistos.length)}${UI.kpi('A ver', L.filter(a => a.status === 'A ver').length)}${UI.kpi('Quero ver', L.filter(a => a.status === 'Quero ver').length)}${UI.kpi('Episódios vistos', U.nf(eps), hrs >= 48 ? U.nf(Math.round(hrs / 24 * 10) / 10) + ' dias a ver anime' : U.nf(Math.round(hrs)) + ' horas a ver anime')}${UI.kpi('A tua nota média', rated.length ? (U.sum(rated, a => +a.nota) / rated.length).toFixed(1).replace('.', ',') : '–', rated.length ? rated.length + ' com nota' : '')}</div>
    ${topG.length ? `<div class="pn an-gs"><div class="pn-h"><h3>Os géneros que mais vês</h3></div>${topG.map(([g, n]) => `<div class="an-gr"><span>${esc(gN(g))}</span><i><s style="width:${Math.round(n / gmax * 100)}%"></s></i><b>${n}</b></div>`).join('')}</div>` : ''}
    <div class="an-fl"><div class="row gap6" style="flex-wrap:wrap">${UI.chip(`Todos (${L.length})`, 'anLf', !f, 'data-v=""')}${ST.map(s => UI.chip(`${s} (${L.filter(a => a.status === s).length})`, 'anLf', f === s, `data-v="${s}"`)).join('')}${UI.chip(`Favoritos (${L.filter(a => a.fav).length})`, 'anLf', f === 'fav', 'data-v="fav"')}</div>
    <select class="field" data-ansel="anLoSel" aria-label="Ordenar"><option value="">Mexidos há menos tempo</option><option value="nota"${o === 'nota' ? ' selected' : ''}>A tua nota</option><option value="nome"${o === 'nome' ? ' selected' : ''}>Nome</option></select></div>
    ${it.length ? `<div class="an-grid">${it.map(a => poster(fromMine(a), { nosc: 1, sub: a.status === 'A ver' ? `Episódio ${+a.ep || 0}${+a.eps ? ' de ' + a.eps : ''}` : a.nota ? `A tua nota: ${a.nota} · ${NOTAS[a.nota] || ''}` : subOf(a) })).join('')}</div>`
      : UI.empty(L.length ? 'Nada com este filtro.' : 'A tua lista está vazia. Pesquisa um anime e marca se estás a ver, já viste ou queres ver.', `<a class="btn" href="#animes.pesquisar">${UI.ic('search')}Pesquisar anime</a>`)}`; };
A.anLf = b => { OS.ui.anLf = b.dataset.v; OS.request(); };
document.addEventListener('change', e => { const el = e.target; if (!el || !el.dataset || el.dataset.ansel !== 'anLoSel') return; OS.ui.anLo = el.value; OS.request(); });

/* Top 10 e tier list */
P.tier = () => { const L = mineAll(), T = topL().map(id => OS.get('animes', id)), seen = L.filter(a => ['Visto', 'A ver', 'Em pausa', 'Larguei'].includes(a.status));
  const pool = U.sortBy(seen.filter(a => !a.tier), a => -(+a.nota || 0)), pod = T.slice(0, 3), order = [1, 0, 2].filter(i => pod[i]);
  const tb = a => `<button type="button" class="an-tc" data-act="anTierPick" data-id="${a.id}" title="${esc(a.t)}">${cover(a, 'xs')}<span>${esc(a.t)}</span></button>`;
  const sug = U.sortBy(L.filter(a => +a.nota >= 8 && !T.some(t => t.id === a.id)), a => -(+a.nota || 0)).slice(0, 8);
  return `<div class="pn an-tl"><div class="pn-h"><h3>Tier list</h3><small class="mut">Toca num anime para o pores num tier.</small></div>
      <div class="an-tiers">${TIERS.map(([t, n]) => { const xs = U.sortBy(seen.filter(a => a.tier === t), a => -(+a.nota || 0)); return `<div class="an-tr t${t}"><div class="an-tlb"><b>${t}</b><small>${n}</small></div><div class="an-tcs">${xs.map(tb).join('') || '<span class="an-tz">Vazio</span>'}</div></div>`; }).join('')}</div>
      ${pool.length ? `<div class="an-pool"><h4>Por arrumar <small class="mut">(${pool.length})</small></h4><div class="an-tcs">${pool.map(tb).join('')}</div></div>` : seen.length ? '' : `<p class="mut" style="margin:10px 0 0">Quando marcares animes como vistos (ou a ver), aparecem aqui para os arrumares.</p>`}</div>
    <div class="pn an-top"><div class="pn-h"><h3>Os 10 animes da tua vida</h3><div class="row gap6">${T.length ? `<button class="btn xs ghost" data-act="anTopCopy">Copiar</button>` : ''}</div></div>
      ${T.length ? `<div class="an-pod">${order.map(i => { const a = pod[i]; return `<button type="button" class="an-pl p${i + 1}" data-act="anOpen" data-k="${esc(kOf(a))}">${cover(a, i === 0 ? 'lg' : '')}<span class="an-step"><b>${i + 1}</b></span><b class="an-plt">${esc(a.t)}</b></button>`; }).join('')}</div>
        <ol class="an-tol">${T.map((a, i) => `<li><span class="an-tn">${i + 1}</span>${cover(a, 'xs')}<div class="grow" style="min-width:0"><b class="click" data-act="anOpen" data-k="${esc(kOf(a))}">${esc(a.t)}</b><small class="mut">${a.nota ? 'A tua nota: ' + a.nota : esc(subOf(a))}</small></div>
          <span class="an-toa"><button class="icon-btn" data-act="anTopMove" data-i="${i}" data-d="-1" aria-label="Subir" ${i ? '' : 'disabled'}>${UI.ic('arrowUp')}</button><button class="icon-btn" data-act="anTopMove" data-i="${i}" data-d="1" aria-label="Descer" ${i < T.length - 1 ? '' : 'disabled'}>${UI.ic('arrowDown')}</button><button class="icon-btn" data-act="anTop" data-id="${a.id}" aria-label="Tirar do top">${UI.ic('x')}</button></span></li>`).join('')}</ol>`
        : `<p class="mut">Ainda não escolheste o teu top. Abre um anime que viste e carrega em <b>Pôr no top 10</b>.</p>`}
      ${sug.length && T.length < 10 ? `<h4 style="margin:14px 0 8px">Sugestões (nota 8 ou mais)</h4><div class="an-tcs">${sug.map(a => `<button type="button" class="an-tc" data-act="anTop" data-id="${a.id}">${cover(a, 'xs')}<span>${esc(a.t)} · ${a.nota}</span></button>`).join('')}</div>` : ''}</div>`; };

/* Pesquisar */
const SQ = { q: '', at: 0 };
const QS = ['One Piece', 'Naruto', 'Attack on Titan', 'Demon Slayer', 'Jujutsu Kaisen', 'Frieren', 'Solo Leveling', 'Dragon Ball', 'Death Note', 'Fullmetal Alchemist', 'Spy x Family', 'Chainsaw Man'];
P.pesquisar = () => { const q = SQ.q, L = q ? need('q:' + norm(q), 30 * 6e4, () => API.search(q)) : null;
  return `<form class="pn an-q" data-form="anFind" role="search"><span aria-hidden="true">${UI.ic('search')}</span><input class="field" name="q" value="${esc(q)}" placeholder="Nome do anime, em japonês ou em inglês (ex.: Shingeki no Kyojin, Frieren)" aria-label="Pesquisar anime" autocomplete="off" enterkeyhint="search"><button class="btn pri">Pesquisar</button></form>
    ${!q ? `<div class="an-qs"><span class="mut">Experimenta:</span>${QS.map(s => `<button type="button" class="chip" data-act="anQuick" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
    ${q ? errBox('q:' + norm(q)) + (!L ? loading(`A procurar “${q}”…`) : L.length ? grid(L) : UI.empty('Não encontrei esse anime. Tenta o nome em japonês (romaji) ou em inglês.')) : ''}`; };
OS.forms.anFind = (f, v) => { SQ.q = String(v('q') || '').trim().slice(0, 80); OS.request(); return false; };
A.anQuick = b => { SQ.q = b.dataset.q; OS.request(); };

/* Detalhe de um anime */
const detail = () => { const k = OS.ui.anK || '', base = itemOf(k);
  if (!base) return UI.empty('Escolhe um anime da lista, da temporada ou da pesquisa.', `<a class="btn" href="#animes">Voltar aos animes</a>`);
  const d = need('d:' + k, 12 * 36e5, () => API.detail(base)), x = keep(Object.assign({}, base, d || {})), m = mine(x), kk = esc(k), nt = nextT(x);
  if (m && d) { const p = {}; ['img', 'ban', 'col', 'eps', 'dur', 'stu'].forEach(f => { if (d[f] && d[f] !== m[f]) p[f] = d[f]; }); if (Object.keys(p).length) setTimeout(() => OS.upd('animes', m.id, p, { silent: true }), 0); }
  const meta = [[fmtN(x.fmt), 'Formato'], [x.eps ? x.eps + (x.eps === 1 ? ' episódio' : ' episódios') : '', 'Episódios'], [x.dur ? x.dur + ' min' : '', 'Duração'], [x.sea ? SEN[x.sea] + ' ' + x.y : x.y || '', 'Estreia'], [x.stu, 'Estúdio'], [STN[x.st] || '', 'Estado']].filter(r => r[0]);
  const rk = d && (d.rank || []).find(r => r.all) , rky = d && (d.rank || []).find(r => !r.all && r.y && !r.s);
  const tr = TR[k], ep = m ? +m.ep || 0 : 0, tot = (m && +m.eps) || x.eps || 0, top = m && topL().includes(m.id);
  const mineBox = `<section class="pn an-me"><div class="an-sts" role="group" aria-label="Na tua lista">${ST.map(s => `<button type="button" class="an-stb s-${STC[s]}${m && m.status === s ? ' on' : ''}" data-act="anSet" data-k="${kk}" data-s="${s}" aria-pressed="${!!(m && m.status === s)}">${esc(STB[s])}</button>`).join('')}</div>
    ${m ? `<div class="an-mg">
      <div class="an-epc"><span class="mut">Episódio onde vais</span><div class="an-eps2"><button type="button" class="icon-btn" data-act="anEp" data-id="${m.id}" data-d="-1" aria-label="Menos um episódio" ${ep ? '' : 'disabled'}>${UI.ic('down')}</button><b>${ep}${tot ? `<small> de ${tot}</small>` : ''}</b><button type="button" class="icon-btn" data-act="anEp" data-id="${m.id}" data-d="1" aria-label="Mais um episódio" ${tot && ep >= tot ? 'disabled' : ''}>${UI.ic('up')}</button></div>${tot ? `<span class="an-bar"><i style="width:${Math.round(ep / tot * 100)}%"></i></span>` : ''}</div>
      <div class="an-nt"><span class="mut">A tua nota${m.nota ? `: <b>${m.nota}</b> · ${esc(NOTAS[m.nota])}` : ''}</span><div class="an-nb">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" class="${+m.nota >= n ? 'on' : ''}${+m.nota === n ? ' cur' : ''}" data-act="anNota" data-id="${m.id}" data-v="${n}" aria-label="Nota ${n}: ${NOTAS[n]}">${n}</button>`).join('')}</div></div>
      <div class="an-ma"><button type="button" class="btn sm${m.fav ? ' pri' : ''}" data-act="anFav" data-id="${m.id}" aria-pressed="${!!m.fav}">${UI.ic('heart')}${m.fav ? 'Favorito' : 'Pôr nos favoritos'}</button>
        <button type="button" class="btn sm${top ? ' pri' : ''}" data-act="anTop" data-id="${m.id}">${UI.ic('award')}${top ? 'No teu top 10' : 'Pôr no top 10'}</button>
        <button type="button" class="btn sm" data-act="anTierPick" data-id="${m.id}">${m.tier ? `Tier <b class="an-tierb t${m.tier}">${m.tier}</b>` : 'Escolher tier'}</button>
        <button type="button" class="btn sm ghost" data-edit="animes:${m.id}">Datas e mais</button><button type="button" class="btn sm ghost" data-act="anDel" data-id="${m.id}">Tirar da lista</button></div>
      <form class="an-rev" data-form="anRev" data-id="${m.id}"><label for="anRv${m.id}">A tua resenha</label><textarea class="field" id="anRv${m.id}" name="rev" rows="4" placeholder="O que achaste? Personagens, história, animação, banda sonora, o final…">${esc(m.rev || '')}</textarea><button class="btn sm">Guardar resenha</button></form>
      ${m.start || m.end ? `<small class="mut">${m.start ? 'Começaste em ' + U.fmtD(m.start) : ''}${m.start && m.end ? ' · ' : ''}${m.end ? (m.status === 'Visto' ? 'acabaste em ' : 'paraste em ') + U.fmtD(m.end) : ''}</small>` : ''}</div>` : '<p class="mut an-me0">Marca se estás a ver, já viste ou queres ver: depois dás a nota, escreves a resenha e pões no teu tier.</p>'}</section>`;
  const rel = d && d.rel && d.rel.length ? row('Da mesma história', d.rel.map(r => r.x), { card: r => ({ sub: RELN[(d.rel.find(z => z.x === r) || {}).t] || 'Relacionado' }) }) : '';
  return `<section class="an-dh" style="--c:${colOf(x)}">${x.ban ? `<img class="an-hb" src="${esc(x.ban)}" alt="" decoding="async" referrerpolicy="no-referrer">` : '<div class="an-hb an-hb0"></div>'}<div class="an-hg"></div>
      <div class="an-dc">${cover(x, 'an-dp')}<div class="an-dt"><a class="an-back" href="#animes">${UI.ic('left')}Animes</a><h2>${esc(x.t)}</h2>${x.ro || x.na ? `<p class="an-alt">${esc([x.ro, x.na].filter(Boolean).join(' · '))}</p>` : ''}
        <div class="an-dm">${x.sc ? `<span class="an-dsc">${UI.ic('star')}<b>${scT(x.sc)}</b><small>nota da comunidade</small></span>` : ''}${rk ? `<span class="an-drk">${rk.rank}.º mais bem avaliado de sempre</span>` : rky ? `<span class="an-drk">${rky.rank}.º mais bem avaliado de ${rky.y}</span>` : ''}</div>
        ${nt ? `<p class="an-hn">${esc(nt)}</p>` : ''}<div class="an-gen">${(x.gen || []).map(g => `<span>${esc(gN(g))}</span>`).join('')}</div></div></div></section>
    ${mineBox}
    <dl class="an-meta">${meta.map(([v, l]) => `<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${d && d.links && d.links.length ? `<section class="pn an-where"><h3>Onde ver</h3><div class="row gap6" style="flex-wrap:wrap">${d.links.map(l => `<a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${UI.ic('play')}${esc(l.site)}</a>`).join('')}</div></section>` : ''}
    ${d && d.desc ? `<section class="pn an-syn"><div class="pn-h"><h3>Sinopse</h3>${tr ? '' : langName() ? `<button type="button" class="btn xs ghost" data-act="anTr" data-k="${kk}" ${TRB ? 'disabled' : ''}>${TRB === k ? 'A traduzir…' : 'Traduzir com a IA'}</button>` : ''}</div><p>${esc(tr || d.desc).replace(/\n/g, '<br>')}</p>${tr ? '<small class="mut">Traduzido pela IA.</small>' : ''}</section>` : !d ? (errBox('d:' + k) || loading('A buscar os detalhes…')) : ''}
    ${d && d.tr ? `<section class="an-trl"><button type="button" class="btn" data-act="anTrailer" data-y="${esc(d.tr)}">${UI.ic('play')}Ver o trailer</button><div id="anTrl"></div></section>` : ''}
    ${rel}${d && d.rec && d.rec.length ? row('Se gostaste, vê também', d.rec) : ''}`; };
})();
