/* PRUMO — Animes (Eu › Animes). Aba opcional: começa desligada nas contas gerais (no perfil pessoal do Ryan vem ligada).
   Pensada como uma sala de streaming à Crunchyroll: destaque em carrossel, continuar a ver, novos episódios, simulcasts da
   temporada, navegar por popularidade/novidades/nota/A–Z, categorias, calendário de lançamentos, notícias e a tua lista
   (fila, listas tuas e histórico). Cada anime tem episódios com miniaturas, personagens e vozes, aberturas e encerramentos.
   Dados: AniList (principal, sem chave), Kitsu e MyAnimeList/Jikan (a pesquisa junta as três bases; o Jikan é a reserva).
   A tua parte: A ver (com o episódio onde vais), Quero ver, Vistos, Em pausa e Larguei; nota de 1 a 10, resenha, favoritos,
   top 10 e tier list. Notícias pelo servidor do Prumo (Google Notícias, api/noticias). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, today = () => U.today();
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
if (!UI.IP.tv) UI.IP.tv = 'M3 7h18v12H3zM8 3l4 4 4-4M10 11l4 2-4 2z';
if (!UI.IP.mark) UI.IP.mark = 'M6 3h12v18l-6-4-6 4z';

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
OS.ONE_DEF.animelists = { lists: [] };   // as tuas listas: [{ id, n, items: [chaves] }]
const mineAll = () => OS.all('animes');
const mine = x => x && mineAll().find(a => (x.al && a.al === x.al) || (x.mal && a.mal === x.mal) || (x.ki && a.ki === x.ki));
const kOf = x => x.al ? 'a' + x.al : x.mal ? 'm' + x.mal : 'k' + x.ki;
const pick = x => ({ al: x.al || 0, mal: x.mal || 0, ki: x.ki || 0, t: x.t || '', ro: x.ro || '', img: x.img || '', col: x.col || '', ban: x.ban || '', y: x.y || 0, sea: x.sea || '', fmt: x.fmt || '', eps: x.eps || 0, dur: x.dur || 0, gen: (x.gen || []).slice(0, 6), stu: x.stu || '' });
OS.Animes = { list: mineAll, watching: () => mineAll().filter(a => a.status === 'A ver') };

/* ---------- nomes em português ---------- */
const SEAS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'], SEN = { WINTER: 'Inverno', SPRING: 'Primavera', SUMMER: 'Verão', FALL: 'Outono' }, SEM = { WINTER: 'jan. a mar.', SPRING: 'abr. a jun.', SUMMER: 'jul. a set.', FALL: 'out. a dez.' };
const FMTN = { TV: 'Série', TV_SHORT: 'Série curta', MOVIE: 'Filme', SPECIAL: 'Especial', OVA: 'OVA', ONA: 'Série na internet', MUSIC: 'Vídeo musical' };
const STN = { RELEASING: 'Em exibição', FINISHED: 'Terminado', NOT_YET_RELEASED: 'Ainda não estreou', CANCELLED: 'Cancelado', HIATUS: 'Em pausa' };
const GENN = { Action: 'Ação', Adventure: 'Aventura', Comedy: 'Comédia', Drama: 'Drama', Ecchi: 'Ecchi', Fantasy: 'Fantasia', Horror: 'Terror', 'Mahou Shoujo': 'Garotas mágicas', Mecha: 'Mecha', Music: 'Música', Mystery: 'Mistério', Psychological: 'Psicológico', Romance: 'Romance', 'Sci-Fi': 'Ficção científica', 'Slice of Life': 'Quotidiano', Sports: 'Desporto', Supernatural: 'Sobrenatural', Thriller: 'Suspense', 'Award Winning': 'Premiado', 'Boys Love': 'Boys Love', 'Girls Love': 'Girls Love', Gourmet: 'Culinária', Suspense: 'Suspense', 'Avant Garde': 'Experimental' };
const RELN = { SEQUEL: 'Sequela', PREQUEL: 'Prequela', SIDE_STORY: 'História paralela', SPIN_OFF: 'Spin-off', ALTERNATIVE: 'Versão alternativa', PARENT: 'História principal', SUMMARY: 'Resumo', COMPILATION: 'Compilação', CHARACTER: 'Mesmas personagens', OTHER: 'Relacionado' };
// as categorias (géneros do AniList), cada uma com as suas cores
const CATS = [['Action', '#ff4d2e', '#ff9a3c'], ['Adventure', '#00b37a', '#7be495'], ['Comedy', '#ffb800', '#ffe066'], ['Drama', '#7c3aed', '#c084fc'], ['Fantasy', '#2563eb', '#60a5fa'], ['Romance', '#e11d74', '#ff8fb8'], ['Sci-Fi', '#0891b2', '#22d3ee'], ['Slice of Life', '#16a34a', '#86efac'],
  ['Mystery', '#4338ca', '#818cf8'], ['Horror', '#991b1b', '#f87171'], ['Psychological', '#6d28d9', '#a78bfa'], ['Sports', '#ea580c', '#fdba74'], ['Supernatural', '#9333ea', '#e879f9'], ['Thriller', '#334155', '#94a3b8'], ['Mecha', '#475569', '#cbd5e1'], ['Music', '#db2777', '#f9a8d4'], ['Mahou Shoujo', '#c026d3', '#f0abfc'], ['Ecchi', '#be123c', '#fda4af']];
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
const ago = t => { const m = Math.max(1, Math.round((Date.now() - t) / 6e4)); if (m < 60) return 'há ' + m + ' min'; const h = Math.round(m / 60); if (h < 48) return 'há ' + h + ' h'; return 'há ' + Math.round(h / 24) + ' dias'; };
const clean = t => String(t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, '&').trim();

/* ---------- AniList (principal), Kitsu e Jikan/MyAnimeList ---------- */
const AL = 'https://graphql.anilist.co', JK = 'api/anime?p=', KI = 'https://kitsu.io/api/edge/';
const F = 'id idMal type title{romaji english native} coverImage{extraLarge large color} bannerImage season seasonYear format episodes duration status averageScore popularity genres studios(isMain:true){nodes{name}} nextAiringEpisode{episode airingAt} startDate{year}';
const F2 = 'id type format title{romaji english native} coverImage{extraLarge large color} bannerImage season seasonYear episodes status averageScore startDate{year} nextAiringEpisode{episode airingAt}';
const FD = F + ' description(asHtml:false) trailer{id site} externalLinks{site url type} rankings{rank type allTime year season context} streamingEpisodes{title thumbnail url site} characters(perPage:12,sort:[ROLE,RELEVANCE]){edges{role node{name{full} image{medium}} voiceActors(language:JAPANESE){name{full} image{medium}}}} relations{edges{relationType node{' + F + ' relations{edges{relationType node{' + F2 + '}}}}}} recommendations(perPage:12,sort:RATING_DESC){nodes{mediaRecommendation{' + F + '}}}';
const nAL = m => { if (!m || !m.id || (m.type && m.type !== 'ANIME')) return null; const T = m.title || {}, C = m.coverImage || {};
  const o = { al: m.id, mal: m.idMal || 0, t: T.english || T.romaji || T.native || '', ro: T.romaji && T.romaji !== T.english ? T.romaji : '', na: T.native || '', img: C.extraLarge || C.large || '', col: C.color || '', ban: m.bannerImage || '', sea: m.season || '', y: m.seasonYear || (m.startDate && m.startDate.year) || 0,
    fmt: m.format || '', eps: m.episodes || 0, dur: m.duration || 0, st: m.status || '', sc: m.averageScore || 0, pop: m.popularity || 0, gen: m.genres || [], stu: ((m.studios && m.studios.nodes) || []).map(s => s.name)[0] || '',
    next: m.nextAiringEpisode ? { ep: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt * 1000 } : null };
  if (m.description) o.desc = clean(m.description); return o; };
const nJK = a => { if (!a || !a.mal_id) return null; const I = a.images || {}, y = a.year || (a.aired && a.aired.prop && a.aired.prop.from && a.aired.prop.from.year) || 0;
  return { al: 0, mal: a.mal_id, t: a.title_english || a.title || '', ro: a.title_english && a.title !== a.title_english ? a.title : '', na: a.title_japanese || '', img: (I.webp && I.webp.large_image_url) || (I.jpg && I.jpg.large_image_url) || '', col: '', ban: '', sea: String(a.season || '').toUpperCase(), y,
    fmt: ({ 'TV Special': 'SPECIAL', Movie: 'MOVIE', TV: 'TV', OVA: 'OVA', ONA: 'ONA', Special: 'SPECIAL', Music: 'MUSIC' })[a.type] || String(a.type || '').toUpperCase(), eps: a.episodes || 0, dur: parseInt(a.duration, 10) || 0,
    st: a.airing ? 'RELEASING' : /not yet/i.test(a.status || '') ? 'NOT_YET_RELEASED' : 'FINISHED', sc: a.score ? Math.round(a.score * 10) : 0, pop: a.members || 0, gen: (a.genres || []).concat(a.themes || []).map(g => g.name).slice(0, 6), stu: ((a.studios || [])[0] || {}).name || '', next: null,
    desc: a.synopsis || '', tr: (a.trailer && a.trailer.youtube_id) || '' }; };
const nKI = d => { const a = d && d.attributes; if (!a || a.nsfw || /^R18/.test(a.ageRating || '')) return null; const T = a.titles || {};
  return { al: 0, mal: 0, ki: +d.id, t: T.en || a.canonicalTitle || T.en_jp || '', ro: T.en_jp && T.en_jp !== (T.en || a.canonicalTitle) ? T.en_jp : '', na: T.ja_jp || '', img: (a.posterImage && (a.posterImage.large || a.posterImage.medium)) || '', col: '', ban: (a.coverImage && (a.coverImage.large || a.coverImage.original)) || '', sea: '', y: +(String(a.startDate || '').slice(0, 4)) || 0,
    fmt: ({ TV: 'TV', movie: 'MOVIE', OVA: 'OVA', ONA: 'ONA', special: 'SPECIAL', music: 'MUSIC' })[a.subtype] || '', eps: a.episodeCount || 0, dur: a.episodeLength || 0, st: a.status === 'current' ? 'RELEASING' : a.status === 'upcoming' || a.status === 'unreleased' ? 'NOT_YET_RELEASED' : 'FINISHED',
    sc: a.averageRating ? Math.round(+a.averageRating) : 0, pop: a.userCount || 0, gen: [], stu: '', next: null, desc: a.synopsis || '' }; };
const tfetch = async (u, o) => { const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 15000);
  try { const r = await fetch(u, Object.assign({ signal: ac ? ac.signal : undefined }, o)); if (!r.ok) throw new Error((/anilist/.test(u) ? 'AniList ' : /kitsu/.test(u) ? 'Kitsu ' : /api\/anime/.test(u) ? 'MyAnimeList ' : 'Prumo ') + r.status); return await r.json(); } finally { to && clearTimeout(to); } };
const gql = async (query, variables) => { const j = await tfetch(AL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables: variables || {} }) }); if (!j || !j.data) throw new Error('AniList: ' + ((j && j.errors && j.errors[0] && j.errors[0].message) || 'sem dados')); return j.data; };
// o Jikan passa pelo servidor do Prumo (api/anime): sem erros de CORS quando ele falha e com a CDN a guardar as respostas
const jkGet = async p => { const j = await tfetch(JK + encodeURIComponent(p), { credentials: 'same-origin' }); if (!j || j.data == null) throw new Error('MyAnimeList ' + ((j && j.err) || 'sem dados')); return j; };
const jk = async p => { const j = await jkGet(p); const seen = new Set(); return (j.data || []).map(nJK).filter(x => x && !seen.has(x.mal) && seen.add(x.mal)); };
const withT = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('demorou demasiado')), ms))]);
const both = async (a, b) => { try { return await a(); } catch (e) { if (!b) throw e; try { return await b(); } catch (e2) { throw e; } } };
const page = (args, n, f) => `query{Page(perPage:${n || 50}){media(${args},type:ANIME,isAdult:false){${f || F}}}}`;
const listOf = d => ((d.Page && d.Page.media) || []).map(nAL).filter(Boolean);
const SORTS = { pop: 'POPULARITY_DESC', novo: 'START_DATE_DESC', nota: 'SCORE_DESC', az: 'TITLE_ROMAJI' };
// junta resultados de várias bases sem repetir (o mesmo anime no AniList, no MyAnimeList e no Kitsu fica uma vez só)
const merge = lists => { const out = [], seenMal = new Set(), seenT = new Set(), tk = x => norm(x.ro || x.t).replace(/ (season|part|the movie|movie)\b.*$/, '') + '|' + (x.y || '');
  lists.forEach(L => (L || []).forEach(x => { if (!x || !x.t) return; if (x.mal && seenMal.has(x.mal)) return; const k1 = norm(x.t) + '|' + (x.y || ''), k2 = tk(x); if (seenT.has(k1) || seenT.has(k2)) return; if (x.mal) seenMal.add(x.mal); seenT.add(k1); seenT.add(k2); out.push(x); })); return out; };
const API = {
  // pesquisa nas três bases ao mesmo tempo: o que uma não tiver (ou escrever de outra forma), outra encontra
  // (cada base tem um tempo máximo: uma base lenta não atrasa os resultados das outras)
  search: async q => { const R = await Promise.allSettled([
      withT(gql(`query($q:String){Page(perPage:30){media(search:$q,type:ANIME,isAdult:false,sort:SEARCH_MATCH){${F}}}}`, { q }).then(listOf), 9000),
      withT(jk('anime?sfw=true&limit=25&q=' + encodeURIComponent(q)), 4500),
      withT(tfetch(KI + 'anime?page%5Blimit%5D=20&filter%5Btext%5D=' + encodeURIComponent(q)).then(j => (j.data || []).map(nKI).filter(Boolean)), 6000)]);
    if (R.every(r => r.status === 'rejected')) throw R[0].reason; return merge(R.map(r => r.value || [])); },
  season: o => both(() => gql(page(`season:${o.s},seasonYear:${o.y},sort:POPULARITY_DESC`)).then(listOf), () => jk(`seasons/${o.y}/${o.s.toLowerCase()}?sfw=true&limit=25`)),
  trending: () => both(() => gql(page('sort:TRENDING_DESC', 20, F + ' description(asHtml:false)')).then(listOf), () => jk('top/anime?filter=airing&sfw=true&limit=20')),
  best: y => both(() => gql(page(`startDate_greater:${y}0000,startDate_lesser:${y + 1}0000,sort:SCORE_DESC,popularity_greater:2000,format_in:[TV,TV_SHORT,MOVIE,ONA,OVA,SPECIAL]`)).then(listOf), () => jk(`anime?sfw=true&limit=25&order_by=score&sort=desc&start_date=${y}-01-01&end_date=${y}-12-31`)),
  // navegar: por popularidade, novidades, nota ou A–Z, com género e formato, às páginas de 30
  browse: async (o, p) => { const g = o.g ? `,genre_in:[${JSON.stringify(String(o.g).replace(/[^A-Za-z' -]/g, ''))}]` : '', f = o.f === 'TV' ? ',format_in:[TV,TV_SHORT]' : o.f === 'MOVIE' ? ',format:MOVIE' : o.f === 'OUT' ? ',format_in:[ONA,OVA,SPECIAL]' : '';
    const extra = o.s === 'novo' ? ',status_in:[RELEASING,FINISHED]' : o.s === 'nota' ? ',popularity_greater:5000' : o.s === 'az' ? ',popularity_greater:8000' : '';
    const d = await gql(`query($p:Int){Page(page:$p,perPage:30){pageInfo{hasNextPage} media(type:ANIME,isAdult:false,sort:${SORTS[o.s] || SORTS.pop}${g}${f}${extra}){${F}}}}`, { p });
    return { more: !!(d.Page.pageInfo && d.Page.pageInfo.hasNextPage), list: listOf(d) }; },
  // episódios que saíram nas últimas 48 horas (os novos lançamentos)
  recent: async () => { const t = Math.floor(Date.now() / 1000), d = await gql(`query($a:Int,$b:Int){Page(perPage:50){airingSchedules(airingAt_greater:$a,airingAt_lesser:$b,sort:TIME_DESC){episode airingAt media{${F} isAdult}}}}`, { a: t - 48 * 3600, b: t });
    return ((d.Page && d.Page.airingSchedules) || []).map(s => { const x = s.media && !s.media.isAdult && nAL(s.media); return x ? { at: s.airingAt * 1000, ep: s.episode, x } : null; }).filter(Boolean).sort((a, b) => (b.x.pop || 0) - (a.x.pop || 0)).slice(0, 30); },
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
  detail: x => both(async () => { const q = x.al ? [`query($id:Int){Media(id:$id,type:ANIME){${FD}}}`, { id: x.al }] : x.mal ? [`query($mal:Int){Media(idMal:$mal,type:ANIME){${FD}}}`, { mal: x.mal }] : [`query($q:String){Media(search:$q,type:ANIME,isAdult:false){${FD}}}`, { q: x.ro || x.t }];
    const d = await gql(q[0], q[1]), m = d.Media, n = nAL(m); if (!n) throw new Error('AniList: não encontrado');
    n.tr = m.trailer && m.trailer.site === 'youtube' ? m.trailer.id : '';
    // (a AniList guarda alguns links ainda com http://, como o da Crunchyroll do One Piece: passam a https e contam)
    n.links = (m.externalLinks || []).filter(l => l.type === 'STREAMING' && /^https?:\/\//.test(l.url || '')).map(l => ({ site: l.site, url: l.url.replace(/^http:/, 'https:') }));
    n.rank = (m.rankings || []).filter(r => r.type === 'RATED').map(r => ({ rank: r.rank, all: r.allTime, y: r.year, s: r.season, ctx: r.context }));
    n.epis = (m.streamingEpisodes || []).filter(e => e && e.title).map(e => ({ t: e.title, img: /^https?:\/\//.test(e.thumbnail || '') ? e.thumbnail.replace(/^http:/, 'https:') : '', url: /^https?:\/\//.test(e.url || '') ? e.url.replace(/^http:/, 'https:') : '', site: e.site || '' }));
    n.chars = ((m.characters && m.characters.edges) || []).map(e => ({ n: e.node && e.node.name && e.node.name.full, img: e.node && e.node.image && e.node.image.medium, role: e.role, va: ((e.voiceActors || [])[0] || {}).name ? e.voiceActors[0].name.full : '', vimg: ((e.voiceActors || [])[0] || {}).image ? e.voiceActors[0].image.medium : '' })).filter(c => c.n);
    // temporadas: a cadeia de prequelas e sequelas em formato de série (TV/ONA); ficam todas no mesmo anime
    const TVL = f => f === 'TV' || f === 'TV_SHORT' || f === 'ONA', PS = t => t === 'PREQUEL' || t === 'SEQUEL', nodes = new Map([[m.id, m]]), adj = new Map(), link = (a, b, t) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([t, b]); };
    if (TVL(m.format)) ((m.relations && m.relations.edges) || []).forEach(e => { const nd = e.node; if (!nd || nd.type !== 'ANIME' || !TVL(nd.format) || !PS(e.relationType)) return; nodes.set(nd.id, nd); link(m.id, nd.id, e.relationType);
      ((nd.relations && nd.relations.edges) || []).forEach(e2 => { const n2 = e2.node; if (!n2 || n2.type !== 'ANIME' || !TVL(n2.format) || !PS(e2.relationType)) return; if (!nodes.has(n2.id)) nodes.set(n2.id, n2); link(nd.id, n2.id, e2.relationType); }); });
    const chain = [m.id], seen = new Set(chain); let c = m.id;
    for (let g = 0; g < 12; g++) { const p = (adj.get(c) || []).find(([t, b]) => t === 'PREQUEL' && !seen.has(b)); if (!p) break; chain.unshift(p[1]); seen.add(p[1]); c = p[1]; }
    c = m.id; for (let g = 0; g < 12; g++) { const q2 = (adj.get(c) || []).find(([t, b]) => t === 'SEQUEL' && !seen.has(b)); if (!q2) break; chain.push(q2[1]); seen.add(q2[1]); c = q2[1]; }
    const first = nodes.get(chain[0]);
    // por ordem de estreia; os especiais de 1 episódio marcados como série não contam como temporada
    const SO = { WINTER: 0, SPRING: 1, SUMMER: 2, FALL: 3 }; let ss = chain.map(id => ({ x: id === m.id ? n : nAL(nodes.get(id)), cur: id === m.id })).filter(z => z.x && (z.cur || z.x.eps !== 1));
    if (ss.every(z => z.x.y)) ss = ss.slice().sort((a, b) => a.x.y - b.x.y || (SO[a.x.sea] || 0) - (SO[b.x.sea] || 0));
    n.seasons = ss.length > 1 ? ss : [];
    n.seaPart = !!(first && first !== m && !first.relations);   // a primeira que conhecemos pode ter outra antes
    // relacionados: filmes, OVAs, especiais, histórias paralelas e spin-offs (as temporadas já estão em cima)
    n.rel = ((m.relations && m.relations.edges) || []).filter(e => !(e.node && seen.has(e.node.id) && TVL(e.node.format))).map(e => ({ t: e.relationType, x: nAL(e.node) })).filter(r => r.x);
    n.rec = ((m.recommendations && m.recommendations.nodes) || []).map(r => nAL(r.mediaRecommendation)).filter(Boolean); return n; },
  x.mal ? async () => { const j = await jkGet('anime/' + x.mal + '/full'), n = nJK(j.data); if (!n) throw new Error('MyAnimeList: não encontrado'); n.desc = clean(n.desc); n.links = ((j.data && j.data.streaming) || []).filter(l => /^https:\/\//.test(l.url || '')).map(l => ({ site: l.name, url: l.url })); n.rel = []; n.rec = []; n.rank = []; n.epis = []; n.chars = []; return n; } : null),
  // aberturas e encerramentos (MyAnimeList)
  themes: async mal => { const j = await jkGet('anime/' + mal + '/themes'), d = j.data || {}; const tidy = s => String(s || '').replace(/^\d+:\s*/, '').replace(/\s*\(eps?[^)]*\)\s*$/i, '').trim(); return { op: (d.openings || []).map(tidy).filter(Boolean).slice(0, 12), ed: (d.endings || []).map(tidy).filter(Boolean).slice(0, 12) }; },
  news: async () => { const l = (OS.one('profile') || {}).lang || 'pt-PT', ed = l === 'pt-BR' ? 'hl=pt-BR&gl=BR&ceid=BR:pt-419' : 'hl=pt-PT&gl=PT&ceid=PT:pt-150';
    const f = JSON.stringify([{ id: 'an', q: 'anime OR mangá OR crunchyroll', ed }]), j = await tfetch('api/noticias?f=' + encodeURIComponent(f), { credentials: 'same-origin' }); return ((j && j.nw && j.nw.an) || []).filter(n => n && n.t && /^https?:\/\//.test(n.l || '')).slice(0, 40); }
};

/* ---------- memória e carregamentos (cada coisa só volta a pedir quando fica velha) ---------- */
const ITEMS = new Map();            // chave → anime (de qualquer lista que já apareceu no ecrã)
// junta o que se sabe de um anime sem apagar nada (um campo vazio nunca tapa um que já se conhecia)
const keep = x => { if (!x) return x; const k = kOf(x), o = ITEMS.get(k); if (!o) { ITEMS.set(k, Object.assign({}, x)); return ITEMS.get(k); }
  Object.keys(x).forEach(f => { const v = x[f]; if (v != null && v !== '' && v !== 0 && !(Array.isArray(v) && !v.length)) o[f] = v; }); return o; };
const CK = 'oc_an_c2', CACHE = U.ls.get(CK, {}) || {};
const cGet = (k, ttl) => { const c = CACHE[k]; return c && Date.now() - c.at < ttl ? c.v : null; };
const cSet = (k, v) => { CACHE[k] = { at: Date.now(), v }; const ks = Object.keys(CACHE); if (ks.length > 12) ks.sort((a, b) => CACHE[a].at - CACHE[b].at).slice(0, ks.length - 12).forEach(x => delete CACHE[x]); try { U.ls.set(CK, CACHE); } catch (e) { } };
const DATA = {}, TRY = {}, ERR = {}, PEND = new Set();
// enquanto escreves na pesquisa, só a lista de resultados muda (o campo não perde o foco)
// várias respostas a chegar juntas (temporada, em alta, traduções…) dão um só redesenho
let RDT = 0;
const redraw = () => { const a = document.activeElement; if (a && a.dataset && a.dataset.anq != null) { const box = document.getElementById('anRes'); if (box) { box.innerHTML = results(); return; } } if (RDT) return; RDT = setTimeout(() => { RDT = 0; if (/^#animes/.test(location.hash)) OS.request(); }, 140); };
const need = (k, ttl, f, store) => { let d = DATA[k]; if (!d && store) { const c = cGet(k, ttl); if (c) d = DATA[k] = { at: Date.now() - 1, v: c }; }
  if ((!d || Date.now() - d.at > ttl) && !PEND.has(k) && !(TRY[k] && Date.now() - TRY[k] < 8000)) { TRY[k] = Date.now(); PEND.add(k);
    f().then(v => { DATA[k] = { at: Date.now(), v }; if (store) cSet(k, v); delete ERR[k]; }).catch(e => { ERR[k] = (e && e.message) || 'erro'; }).finally(() => { PEND.delete(k); redraw(); }); }
  const v = d ? d.v : null; if (Array.isArray(v)) v.forEach(x => { const y = x && x.x ? x.x : x; if (y && (y.al || y.mal || y.ki)) keep(y); }); return v; };
const H6 = 6 * 36e5;
const errBox = k => ERR[k] ? `<div class="note an-err">Não consegui falar com a base de animes (${esc(ERR[k])}). Tenta outra vez daqui a pouco. <button class="btn xs" data-act="anRetry" data-k="${esc(k)}">Tentar outra vez</button></div>` : '';
const loading = t => `<div class="an-ld"><span class="an-sp" aria-hidden="true"></span>${esc(t || 'A buscar os animes…')}</div>`;
A.anRetry = b => { delete TRY[b.dataset.k]; delete ERR[b.dataset.k]; delete DATA[b.dataset.k]; OS.request(); };

// onde ver: só os serviços onde se vê o anime inteiro (sem canais de vídeos, bibliotecas nem serviços só da Ásia), sem repetidos,
// e só os que existem no país que escolheste ao criar a conta (a Hulu, por exemplo, só existe nos EUA)
const SVCW = /^(crunchyroll|netflix|(amazon )?prime video|amazon|disney ?(\+|plus)|apple tv\+?)$/i;   // em quase todos os países
const SVCC = [[/^hulu$/i, 'US JP'], [/^hidive$/i, 'US CA GB IE AU NZ'], [/^(max|hbo max)$/i, 'US BR MX AR CL CO PE PT ES FR PL NL BE SE NO DK FI RO HU CZ SK BG HR SI'], [/^(adn|animation digital network)$/i, 'FR BE CH LU DE AT'],
  [/^tubi$/i, 'US CA MX AU GB'], [/^pluto tv$/i, 'US BR MX AR CL CO PE GB DE AT CH FR IT ES'], [/^globoplay$/i, 'BR'], [/^rtp play$/i, 'PT'], [/^paramount\+$/i, 'US BR CA AU GB MX AR CL CO PE IT FR DE AT CH'], [/^peacock$/i, 'US'], [/^anime onegai$/i, 'BR MX AR CL CO PE']];
const myCC = () => String((OS.one('profile') || {}).country || 'PT').toUpperCase();
const inCC = site => { const k = String(site || '').trim(); if (SVCW.test(k)) return true; const r = SVCC.find(z => z[0].test(k)); return !!r && r[1].split(' ').includes(myCC()); };
const watchL = L => { const sn = new Set(); return (L || []).filter(l => { const k = String(l.site || '').trim().toLowerCase(); if (!inCC(k) || sn.has(k)) return false; sn.add(k); return true; }); };
/* ---------- peças do ecrã ---------- */
// tamanho certo de cada imagem: a maior (até 600 KB) só no destaque e na página do anime; nos cartões a de ~230 px (5 a 10× mais leve)
const imgS = (u, sz) => { u = String(u || ''); const s = sz === 's'; if (sz === 'l') return u;
  if (/s4\.anilist\.co\/.*\/cover\/large\//.test(u)) return u.replace('/cover/large/', s ? '/cover/small/' : '/cover/medium/');
  if (/kitsu\.(app|io)\/.*poster_images\/\d+\/(large|medium|original)\./.test(u)) return u.replace(/\/(large|medium|original)\./, s ? '/tiny.' : '/small.');
  if (/cdn\.myanimelist\.net\/images\/anime\/\d+\/\d+l\.(jpg|webp)/.test(u)) return u.replace(/(\d+)l\.(jpg|webp)/, '$1.$2');
  return u; };
// pósteres: a versão de ~230 px e a de ~460 px; o ecrã escolhe (nítido no tablet e no iPhone, leve onde chega a pequena)
const srcset = u => { const m = imgS(u, 'm'); return m && m !== u ? ` srcset="${esc(m)} 230w, ${esc(u)} 460w"` : ''; };
const SIZES = ' sizes="(max-width:520px) 42vw, (max-width:860px) 24vw, 190px"';
const cover = (x, cls) => x.img ? `<img class="an-img ${cls || ''}" src="${esc(/an-dp|\blg\b/.test(cls || '') ? x.img : imgS(x.img, /\bxs\b/.test(cls || '') ? 's' : 'm'))}"${cls ? '' : srcset(x.img) + SIZES} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="an-img an-img0 ${cls || ''}" aria-hidden="true">${esc(String(x.t || '?').slice(0, 2).toUpperCase())}</span>`;
const colOf = x => /^#[0-9a-f]{6}$/i.test(x.col || '') ? x.col : '#E8203A';
const subOf = x => [fmtN(x.fmt), x.eps ? x.eps + (x.eps === 1 ? ' episódio' : ' episódios') : '', x.y || ''].filter(Boolean).join(' · ');
const poster = (x, o) => { o = o || {}; x = keep(x); const m = mine(x), k = kOf(x), p = m && m.status === 'A ver' && (m.eps || x.eps) ? Math.min(100, Math.round((m.ep || 0) / (m.eps || x.eps) * 100)) : 0;
  return `<button type="button" class="an-pc${o.cls ? ' ' + o.cls : ''}" data-act="anOpen" data-k="${esc(k)}" style="--c:${colOf(x)}" aria-label="${esc(x.t)}">
    <span class="an-pi">${cover(x)}${o.rank ? `<span class="an-rk">${o.rank}</span>` : ''}${m ? `<span class="an-mb s-${STC[m.status] || 'quero'}">${esc(m.status)}${m.nota ? ' · ' + m.nota : ''}</span>` : ''}${x.sc && !o.nosc ? `<span class="an-sc">${UI.ic('star')}${scT(x.sc)}</span>` : ''}${p ? `<span class="an-pg"><i style="width:${p}%"></i></span>` : ''}
      <span class="an-ov" aria-hidden="true"><b>${esc(x.t)}</b><small>${esc(subOf(x))}</small>${(x.gen || []).length ? `<small>${esc(x.gen.slice(0, 3).map(gN).join(' · '))}</small>` : ''}${x.desc ? `<span class="an-ovd">${esc(x.desc.slice(0, 220))}</span>` : ''}</span></span>
    <b>${esc(x.t)}</b><small>${esc(o.sub != null ? o.sub : subOf(x))}</small></button>`; };
// cartão largo (16:9): continuar a ver e novos episódios
// cartão largo: o banner de fundo e a capa por cima (há banners que são só uma textura ou cor; a capa mostra sempre o anime)
const wide = (x, o) => { x = keep(x); const bn = x.ban && !banBad(x.ban) ? x.ban : '', img = o.img || bn || imgS(x.img, 'l'), pc = !o.img && bn && x.img ? imgS(x.img, 'm') : '';
  return `<div class="an-wc" style="--c:${colOf(x)}"><button type="button" class="an-wci${pc ? ' pc' : ''}" data-act="anOpen" data-k="${esc(kOf(x))}" aria-label="${esc(x.t)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"${img === pc ? ' class="an-wcs"' : ''}>` : ''}<span class="an-wcg"></span>${pc ? `<img class="an-wcp" src="${esc(pc)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}${o.badge ? `<span class="an-wcb">${esc(o.badge)}</span>` : ''}${o.p != null ? `<span class="an-pg"><i style="width:${o.p}%"></i></span>` : ''}</button>
    <div class="an-wct"><b class="click" data-act="anOpen" data-k="${esc(kOf(x))}">${esc(x.t)}</b><small>${esc(o.sub || '')}</small></div>${o.act || ''}</div>`; };
const row = (title, list, o) => { o = o || {}; if (!o.all && !o.wide) list = uniqFam(list); if (!list || !list.length) return ''; return `<section class="an-row${o.wide ? ' wd' : ''}"><div class="an-rh"><h3>${title}</h3>${o.more ? `<a class="an-more" href="${o.more}">Ver tudo</a>` : ''}<span class="an-arr"><button type="button" class="icon-btn" data-act="anScroll" data-d="-1" aria-label="Para trás">${UI.ic('left')}</button><button type="button" class="icon-btn" data-act="anScroll" data-d="1" aria-label="Para a frente">${UI.ic('right')}</button></span></div>
  <div class="an-strip">${o.wide ? list.join('') : list.map(x => poster(x.x || x, o.card ? o.card(x) : {})).join('')}</div></section>`; };
A.anScroll = b => { const s = b.closest('.an-row') && b.closest('.an-row').querySelector('.an-strip'); if (s) s.scrollBy({ left: +b.dataset.d * s.clientWidth * .85, behavior: 'smooth' }); };
// a mesma série: as temporadas (TV/ONA) contam como um só anime nas listas; filmes, OVAs e especiais ficam à parte
const TVF = { TV: 1, TV_SHORT: 1, ONA: 1, '': 1 };
const famT = t => norm(t).replace(/\b(the )?final season\b.*$/, '').replace(/\b(season|part|cour)\s*\d+\b.*$/, '').replace(/\b\d+(st|nd|rd|th)\s+(season|part|cour)\b.*$/, '').replace(/\s(ii|iii|iv|vi|vii|viii|ix)$/, '').trim();
const famK = x => TVF[x.fmt || ''] ? 'f:' + (famT(x.t) || famT(x.ro) || kOf(x)) : kOf(x);
const uniqFam = L => { const sn = new Set(); return (L || []).filter(z => { const y = z && z.x ? z.x : z; if (!y) return false; const k = famK(y); if (sn.has(k)) return false; sn.add(k); return true; }); };
const seaLab = (x, i, all, part) => { const mm = /season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s+season|part\s*(\d+)/i.exec((x.t || '') + ' ' + (x.ro || '')); if (mm) return mm[3] ? 'Parte ' + mm[3] : 'Temporada ' + (mm[1] || mm[2]);
  if (/final season/i.test(x.t || '')) return 'Temporada final'; return part ? String(x.y || 'Temporada') : 'Temporada ' + (i + 1); };
const grid = list => `<div class="an-grid">${uniqFam(list).map(x => poster(x)).join('')}</div>`;
const nextT = x => x.next && x.next.at > Date.now() ? `Episódio ${x.next.ep} daqui a ${until(x.next.at)} (${WD[new Date(x.next.at).getDay()]}, ${dm(x.next.at)} às ${hm(x.next.at)})` : '';
const fromMine = a => pick(a);
const catTiles = (cls) => `<div class="an-cats ${cls || ''}">${CATS.map(([g, c1, c2]) => `<button type="button" class="an-cat" data-act="anCat" data-g="${esc(g)}" style="--c1:${c1};--c2:${c2}"><b>${esc(gN(g))}</b></button>`).join('')}</div>`;
A.anCat = b => { OS.ui.anNav = Object.assign({ s: 'pop', f: '' }, OS.ui.anNav || {}, { g: b.dataset.g }); OS.ui.anNavP = 1; location.hash = 'animes.navegar'; OS.request(); try { window.scrollTo(0, 0); } catch (e) { } };

/* ---------- ações da lista ---------- */
const setStatus = (x, status) => { const ex = mine(x), p = { status }, eps = (ex && ex.eps) || x.eps || 0;
  if (status === 'A ver' && !(ex && ex.start)) p.start = today();
  if (status === 'Visto') { p.end = today(); if (eps) p.ep = eps; if (!(ex && ex.start)) p.start = today(); }
  if (status === 'Larguei' || status === 'Em pausa') p.end = today();
  if (ex) { OS.upd('animes', ex.id, Object.assign(pick(Object.assign({}, ex, x)), p)); return OS.get('animes', ex.id); }
  return OS.add('animes', Object.assign(pick(x), { ep: 0, nota: 0, fav: false, added: today() }, p)); };
const itemOf = k => ITEMS.get(k) || (() => { const m = mineAll().find(a => kOf(a) === k); return m ? fromMine(m) : null; })();
// tocar outra vez no estado que já está marcado tira o anime da lista (se já tem nota, resenha, tier, favorito ou episódios, pergunta antes)
const hasMore = a => !!(+a.nota || String(a.rev || '').trim() || a.fav || a.tier || +a.ep > 0 || LS0().some(l => (l.items || []).includes(kOf(a))));
const rmAnime = a => { OS.del('animes', a.id); topSave(topL().filter(id => id !== a.id)); UI.toast(`${a.t} saiu da tua lista`, 'pos'); };
A.anSet = b => { const x = itemOf(b.dataset.k); if (!x) return; const ex = mine(x);
  if (ex && ex.status === b.dataset.s) return hasMore(ex) ? UI.ask('Tirar da tua lista?', `${esc(ex.t)} sai da tua lista com a tua nota, a resenha, o tier e os episódios vistos.`, 'Tirar', () => rmAnime(ex)) : rmAnime(ex);
  const r = setStatus(x, b.dataset.s); UI.toast(`${x.t}: ${b.dataset.s}`, 'pos'); if (b.dataset.s === 'Visto' && r && !r.nota) UI.toast('Dá-lhe uma nota de 1 a 10 e escreve a tua resenha', 'pos'); };
const epTo = (a, ep) => { const p = { ep }; if (a.status === 'Quero ver' && ep > 0) { p.status = 'A ver'; p.start = a.start || today(); }
  if (+a.eps && ep >= +a.eps && a.status !== 'Visto') { p.status = 'Visto'; p.end = today(); UI.toast(`Terminaste ${a.t}. Que nota lhe dás?`, 'pos'); }
  OS.upd('animes', a.id, p); };
A.anEpR = b => { OS.ui.anEpR = { k: b.dataset.k, r: +b.dataset.r || 1 }; OS.request(); };
A.anEp = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; const max = +a.eps || 9999; epTo(a, Math.max(0, Math.min(max, (+a.ep || 0) + (+b.dataset.d || 1)))); };
// tocar num episódio da lista: "vi até aqui" (tocar outra vez no último visto desmarca-o)
A.anEpAt = b => { const x = itemOf(b.dataset.k); if (!x) return; let a = mine(x); const n = +b.dataset.n || 0; if (!a) a = setStatus(x, 'A ver'); epTo(a, (+a.ep || 0) === n ? n - 1 : n); };
A.anNota = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; const v = +b.dataset.v; OS.upd('animes', a.id, { nota: +a.nota === v ? 0 : v }); };
A.anFav = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; OS.upd('animes', a.id, { fav: !a.fav }); UI.toast(a.fav ? 'Nos teus favoritos' : 'Saiu dos favoritos', 'pos'); };
A.anTier = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; OS.upd('animes', a.id, { tier: a.tier === b.dataset.t ? '' : b.dataset.t }); if (b.closest('.modal, #modal')) UI.closeModal(); };
A.anTierPick = b => { const a = OS.get('animes', b.dataset.id); if (!a) return;
  UI.modal(`<div class="an-tp"><div class="row between" style="align-items:center"><h3 style="margin:0">Em que tier fica?</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><p class="mut" style="margin:6px 0 12px">${esc(a.t)}</p>
    <div class="an-tpb">${TIERS.map(([t, n]) => `<button type="button" class="an-tb t${t}${a.tier === t ? ' on' : ''}" data-act="anTier" data-id="${a.id}" data-t="${t}"><b>${t}</b><small>${n}</small></button>`).join('')}</div>
    ${a.tier ? `<button type="button" class="btn sm ghost" data-act="anTier" data-id="${a.id}" data-t="${a.tier}" style="margin-top:10px">Tirar do tier</button>` : ''}</div>`, 'an-modal'); };
A.anDel = b => { const a = OS.get('animes', b.dataset.id); if (!a) return; UI.ask('Tirar da tua lista?', `${esc(a.t)} sai da tua lista (com a nota e a resenha).`, 'Tirar', () => { OS.del('animes', a.id); topSave(topL().filter(id => id !== a.id)); }); };
OS.forms.anRev = (f, v) => { const a = OS.get('animes', f.dataset.id); if (!a) return false; OS.upd('animes', a.id, { rev: String(v('rev') || '').trim().slice(0, 5000) }); UI.toast('Resenha guardada', 'pos'); return false; };
A.anOpen = b => { OS.ui.anK = b.dataset.k; location.hash = 'animes.anime'; OS.request(); try { window.scrollTo(0, 0); } catch (e) { } };

/* as tuas listas (como as listas da Crunchyroll): nome e animes, de qualquer estado */
const LS0 = () => ((OS.one('animelists') || {}).lists || []);
const lsSave = L => OS.setOne('animelists', { lists: L });
A.anListPick = b => { const k = b.dataset.k, x = itemOf(k); if (!x) return; const L = LS0();
  UI.modal(`<div class="an-lp"><div class="row between" style="align-items:center"><h3 style="margin:0">Guardar numa lista</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><p class="mut" style="margin:6px 0 12px">${esc(x.t)}</p>
    ${L.length ? `<div class="an-lpl">${L.map(l => `<label class="an-lpi"><input type="checkbox" data-act="anListTog" data-l="${esc(l.id)}" data-k="${esc(k)}" ${(l.items || []).includes(k) ? 'checked' : ''}><span>${esc(l.n)}</span><small>${(l.items || []).length}</small></label>`).join('')}</div>` : '<p class="mut">Ainda não tens listas. Cria a primeira:</p>'}
    <form class="an-lpf" data-form="anListNew" data-k="${esc(k)}"><input class="field" name="n" placeholder="Nova lista (ex.: Para ver com os amigos)" maxlength="60" aria-label="Nome da nova lista"><button class="btn sm pri">Criar e guardar</button></form></div>`, 'an-modal'); };
A.anListTog = b => { const L = LS0(), l = L.find(z => z.id === b.dataset.l), k = b.dataset.k, x = itemOf(k); if (!l) return; l.items = l.items || [];
  if (l.items.includes(k)) l.items = l.items.filter(z => z !== k); else { l.items.unshift(k); if (x && !mine(x)) setStatus(x, 'Quero ver'); } lsSave(L); };
OS.forms.anListNew = (f, v) => { const n = String(v('n') || '').trim().slice(0, 60), k = f.dataset.k, x = itemOf(k); if (!n) { UI.toast('Dá um nome à lista', 'warn'); return false; }
  const L = LS0(); L.push({ id: U.uid(), n, items: k ? [k] : [] }); lsSave(L); if (x && !mine(x)) setStatus(x, 'Quero ver'); UI.closeModal(); UI.toast(`Lista “${n}” criada`, 'pos'); return false; };
A.anListDel = b => { const L = LS0(), l = L.find(z => z.id === b.dataset.l); if (!l) return; UI.ask('Apagar a lista?', `A lista “${esc(l.n)}” é apagada (os animes continuam na tua lista).`, 'Apagar', () => { lsSave(L.filter(z => z.id !== l.id)); OS.ui.anL = ''; }); };
A.anListOpen = b => { OS.ui.anL = b.dataset.l; OS.ui.anLv = 'listas'; OS.request(); };

/* top 10 da vida: one('animetop').list = ids da tua lista, por ordem */
const topL = () => ((OS.one('animetop') || {}).list || []).filter(id => OS.get('animes', id)).slice(0, 10);
const topSave = L => OS.setOne('animetop', { list: L.slice(0, 10) });
A.anTop = b => { const L = topL(), id = b.dataset.id; if (L.includes(id)) { topSave(L.filter(x => x !== id)); return UI.toast('Saiu do teu top 10', 'pos'); } if (L.length >= 10) return UI.toast('O top já tem 10. Tira um primeiro: só cabem os 10 melhores.', 'warn'); L.push(id); topSave(L); UI.toast(`Entrou no teu top, em ${L.length}.º`, 'pos'); };
A.anTopMove = b => { const L = topL(), i = +b.dataset.i, j = i + +b.dataset.d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; topSave(L); };
A.anTopCopy = async () => { const t = 'O meu top 10 de animes:\n' + topL().map((id, i) => `${i + 1}. ${OS.get('animes', id).t}`).join('\n'); try { await navigator.clipboard.writeText(t); UI.toast('Top 10 copiado', 'pos'); } catch (e) { UI.toast('Não consegui copiar neste aparelho', 'warn'); } };

/* sinopse traduzida pela IA (só quando carregas no botão; guardada no aparelho) */
const TRK = 'oc_an_tr', TR = U.ls.get(TRK, {}) || {}; let TRB = '';
// tradução automática e grátis das sinopses (Google Tradutor): só sai do aparelho o texto da sinopse; fica guardada no aparelho
const ATK = 'oc_an_at', ATC = U.ls.get(ATK, {}) || {}, ATP = new Set();
const trLang = () => { const l = (OS.one('profile') || {}).lang || 'pt-PT'; return /^en/.test(l) ? '' : l === 'pt-BR' ? 'pt' : ['es', 'fr', 'it', 'de'].includes(l) ? l : 'pt-PT'; };
const hashT = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length; };
const autoTr = txt => { const tl = trLang(); txt = String(txt || ''); if (!tl || txt.length < 12) return txt; const id = tl + hashT(txt); if (ATC[id] != null) return ATC[id] || txt;
  if (!ATP.has(id) && ATP.size < 6) { ATP.add(id);
    fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + tl + '&dt=t&q=' + encodeURIComponent(txt.slice(0, 1800)), { credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(r => r.ok ? r.json() : null).then(j => { if (!j || !Array.isArray(j[0])) return; const src = String(j[2] || ''), out = j[0].map(z => (z && z[0]) || '').join('').replace(/​/g, '').trim();
        ATC[id] = src && tl.split('-')[0] === src.split('-')[0] ? '' : out + (txt.length > 1800 ? '…' : ''); const ks = Object.keys(ATC); if (ks.length > 400) delete ATC[ks[0]]; U.ls.set(ATK, ATC); redraw(); })
      .catch(() => { }).finally(() => ATP.delete(id)); }
  return txt; };
A.anOrig = b => { OS.ui.anOrig = OS.ui.anOrig === b.dataset.k ? '' : b.dataset.k; OS.request(); };
const langName = () => { const l = (OS.one('profile') || {}).lang || 'pt-PT'; return { 'pt-BR': 'português do Brasil', 'pt-PT': 'português de Portugal', es: 'espanhol', fr: 'francês', it: 'italiano', de: 'alemão' }[l] || (/^en/.test(l) ? '' : 'português de Portugal'); };
A.anTr = async b => { const k = b.dataset.k, d = DATA['d:' + k] && DATA['d:' + k].v; if (!d || !d.desc || TRB) return; if (!OS.AI || !OS.AI.json) return UI.toast('A IA não está disponível neste aparelho', 'warn');
  TRB = k; OS.request(); try { const o = await OS.AI.json([{ text: `Traduz para ${langName()} esta sinopse de anime, de forma fiel e natural (mantém os nomes próprios). Responde APENAS JSON {"t":"…"}. Sinopse: ` + JSON.stringify(d.desc.slice(0, 2500)) }], .1);
    if (o && o.t) { TR[k] = String(o.t).slice(0, 4000); const ks = Object.keys(TR); if (ks.length > 80) delete TR[ks[0]]; U.ls.set(TRK, TR); } } catch (e) { UI.toast(/não está ligada/i.test((e && e.message) || '') ? 'A IA ainda não está ligada: liga-a em Definições › IA.' : 'A IA não conseguiu traduzir agora. Tenta outra vez.', 'warn'); }
  TRB = ''; OS.request(); };
A.anTrailer = b => { const box = document.getElementById('anTrl'); if (!box) return; box.innerHTML = box.innerHTML ? '' : `<div class="an-ytp"><iframe src="https://www.youtube-nocookie.com/embed/${esc(b.dataset.y)}?autoplay=1&playsinline=1&rel=0" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`; };

/* ================= páginas ================= */
const AT = [['', 'Início'], ['pesquisar', 'Pesquisar'], ['recomendados', 'Para ti'], ['navegar', 'Navegar'], ['temporada', 'Simulcasts'], ['calendario', 'Calendário'], ['categorias', 'Categorias'], ['melhores', 'Melhores do ano'], ['premios', 'Prémios'], ['pursuit', 'Pursuit'], ['ranking', 'Ranking'], ['clas', 'Clãs'], ['noticias', 'Notícias'], ['lista', 'A minha lista'], ['tier', 'Top 10 e tier list']];
const P = {};
V.animes = sub => { const k = sub === 'anime' ? 'anime' : P[sub || ''] ? (sub || '') : '';
  return UI.head('Animes', 'Todos os animes do mundo: o que estás a ver, já viste ou queres ver, com a tua nota, resenha e tier list. E para descobrir: a temporada, os episódios da semana e os melhores de cada ano.', `<a class="btn pri an-hbtn" href="#animes.pesquisar">${UI.ic('search')}<span>Pesquisar anime</span></a>`, OS.Social ? OS.Social.marca('xs') : 'Parceria')
    + UI.tabs('animes', AT, k === 'anime' ? '' : k) + `<div class="an${k === '' || k === 'anime' ? ' an-top0' : ''}">${(k === 'anime' ? detail : P[k])()}</div>`; };

/* destaque em carrossel (muda sozinho; pára quando tocas ou passas o rato; sem animação para quem a desliga) */
let HI = 0;
// no telemóvel a capa (vertical), no computador o banner; a imagem que não se vê nunca é descarregada
// fundo do destaque, de ponta a ponta: no telemóvel a capa (vertical); no tablet e no computador o banner (largo e nítido).
// Há banners que são só uma textura ou uma cor desfocada: o app mede a nitidez uma vez (guardada no aparelho) e, nesses, usa a capa.
const BANK = 'oc_an_ban', BANQ = U.ls.get(BANK, {}) || {}, BANP = new Set(), BANF = new Set();
const banBad = u => BANQ[u] === 1;
const banCheck = u => { if (!u || u in BANQ || BANP.has(u) || BANF.has(u) || !(window.matchMedia && matchMedia('(min-width:641px)').matches)) return; BANP.add(u);
  const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
  im.onload = () => { try { const W = 240, H = 50, c = document.createElement('canvas'); c.width = W; c.height = H; const g2 = c.getContext('2d', { willReadFrequently: true }); g2.drawImage(im, 0, 0, W, H);
      const px = g2.getImageData(0, 0, W, H).data, g = new Float32Array(W * H); let m = 0; for (let i = 0; i < W * H; i++) { g[i] = .299 * px[i * 4] + .587 * px[i * 4 + 1] + .114 * px[i * 4 + 2]; m += g[i]; } m /= W * H;
      let e = 0, n = 0, v = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; e += Math.abs(4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W]); n++; }
      for (let i = 0; i < W * H; i++) v += (g[i] - m) * (g[i] - m); const sd = Math.sqrt(v / (W * H)), lap = e / n;
      BANQ[u] = sd < 18 || lap < 8 ? 1 : 0; const ks = Object.keys(BANQ); if (ks.length > 600) delete BANQ[ks[0]]; U.ls.set(BANK, BANQ); if (BANQ[u]) redraw(); } catch (e) { BANQ[u] = 0; } finally { BANP.delete(u); } };
  // endereço à parte para a medição: o Safari reaproveita a imagem já guardada sem permissão de leitura (CORS) e a medição falhava
  im.onerror = () => { BANP.delete(u); BANF.add(u); }; im.src = u + (u.includes('?') ? '&' : '?') + 'nitidez=1'; };
const heroImg = (x, i) => { const mob = x.img || x.ban, bad = x.ban && banBad(x.ban), desk = x.ban && !bad ? x.ban : x.img || x.ban; if (x.ban && !bad) banCheck(x.ban);
  return `<div class="an-hpic">${mob ? `<picture><source media="(max-width:640px)" srcset="${esc(mob)}"><img class="an-hb${desk === x.ban ? '' : ' an-hbc'}" src="${esc(desk)}" alt="" decoding="async" referrerpolicy="no-referrer"${i ? ' loading="lazy"' : ' fetchpriority="high"'}></picture>` : '<div class="an-hb an-hb0"></div>'}<div class="an-hg"></div><button type="button" class="an-hopen" data-act="anOpen" data-k="${esc(kOf(x))}" tabindex="-1" aria-label="${esc(x.t)}: ver detalhes"></button></div>`; };
// estado na lista (tocar outra vez tira): no telemóvel só o ícone, ao lado do botão laranja
const bmBtn = (x, m) => `<button type="button" class="btn an-ghost an-bm${m ? ' on' : ''}" data-act="anSet" data-k="${esc(kOf(x))}" data-s="${m ? esc(m.status) : 'Quero ver'}" aria-pressed="${!!m}" title="${m ? esc(m.status) + ': toca para tirar da lista' : 'Quero ver'}">${UI.ic(m ? 'check' : 'mark')}<span class="an-bmt">${m ? esc(m.status) : 'Quero ver'}</span></button>`;
const heroSlides = L => L.map((x, i) => { x = keep(x); const m = mine(x), nt = nextT(x), ds = x.desc ? autoTr(x.desc) : '';
  return `<article class="an-slide${i === HI ? ' on' : ''}" data-i="${i}" style="--c:${colOf(x)}" aria-hidden="${i !== HI}"${i !== HI ? ' inert' : ''}>${heroImg(x, i)}
    <div class="an-hc"><div class="an-ht"><span class="an-hk">${m && m.status === 'A ver' ? 'Continuas a ver' : 'Em destaque'}</span><h2${x.t.length > 34 ? ' class="lg"' : ''}>${esc(x.t)}</h2>
      <p class="an-hm">${[x.sc ? '★ ' + scT(x.sc) : '', fmtN(x.fmt), x.eps ? x.eps + ' episódios' : '', x.y, (x.gen || []).slice(0, 3).map(gN).join(', ')].filter(Boolean).map(esc).join(' · ')}</p>
      ${ds ? `<p class="an-hd">${esc(ds.slice(0, 260))}${ds.length > 260 ? '…' : ''}</p>` : ''}${nt ? `<p class="an-hn">${esc(nt)}</p>` : ''}
      <div class="an-hb2">${m && m.status === 'A ver' ? `<button type="button" class="btn an-cta" data-act="anEp" data-id="${m.id}" data-d="1">${UI.ic('plus')}Vi o episódio ${(+m.ep || 0) + 1}</button>` : `<button type="button" class="btn an-cta" data-act="anOpen" data-k="${esc(kOf(x))}">${UI.ic('play')}Ver detalhes</button>`}${bmBtn(x, m)}</div></div></div></article>`; }).join('');
let HOLD = 0, HOLDT = 0;
const heroOf = L => { if (!L.length) return ''; if (HI >= L.length) HI = 0;
  // depois de redesenhar, o carrossel volta ao destaque onde estavas (sem animação)
  // (logo a seguir a pôr a página, antes de a desenhar: não pisca o primeiro destaque)
  if (HI) (window.queueMicrotask || (f => Promise.resolve().then(f)))(() => { const s = document.querySelector('#view .an-hs'); if (s && Math.round(s.scrollLeft / Math.max(1, s.clientWidth)) !== HI) s.scrollLeft = HI * s.clientWidth; });
  return `<section class="an-hero${Date.now() < HOLD ? ' hold' : ''}" aria-roledescription="carrossel" aria-label="Em destaque"><div class="an-chrome"><a class="an-cb an-cbl" href="#visao" aria-label="Voltar ao Prumo">${OS.Lock && OS.Lock.logo ? OS.Lock.logo(34) : UI.ic('left')}</a><span class="an-cbg"></span><a class="an-cb" href="#animes.lista" aria-label="A minha lista">${UI.ic('mark')}</a><a class="an-cb" href="#animes.pesquisar" aria-label="Pesquisar anime">${UI.ic('search')}</a></div><div class="an-hs">${heroSlides(L)}</div>
  ${L.length > 1 ? `<button type="button" class="an-har l" data-act="anHero" data-d="-1" aria-label="Anterior">${UI.ic('left')}</button><button type="button" class="an-har r" data-act="anHero" data-d="1" aria-label="Seguinte">${UI.ic('right')}</button><div class="an-dots">${L.map((_, i) => `<button type="button" class="${i === HI ? 'on' : ''}" data-act="anHero" data-i="${i}" aria-label="Destaque ${i + 1}"></button>`).join('')}</div>` : ''}</section>`; };
const heroMark = h => { h.querySelectorAll('.an-slide').forEach((s, j) => { const on = j === HI; s.classList.toggle('on', on); s.setAttribute('aria-hidden', !on); s.inert = !on; }); h.querySelectorAll('.an-dots button').forEach((d, j) => d.classList.toggle('on', j === HI)); };
const reduceM = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('lite-x');
const heroGo = i => { const h = document.querySelector('#view .an-hero'), sc = h && h.querySelector('.an-hs'); if (!sc) return; const n = sc.children.length; if (!n) return; HI = (i + n) % n;
  try { sc.scrollTo({ left: HI * sc.clientWidth, behavior: reduceM() ? 'auto' : 'smooth' }); } catch (e) { sc.scrollLeft = HI * sc.clientWidth; } heroMark(h); };
A.anHero = b => { if (b.dataset.i != null) heroGo(+b.dataset.i); else heroGo(HI + (+b.dataset.d || 1)); holdHero(); };
// arrastar com o dedo: o carrossel segue o dedo e encaixa no destaque seguinte; os pontos acompanham
document.addEventListener('scroll', e => { const sc = e.target; if (!sc || !sc.classList || !sc.classList.contains('an-hs')) return; if (OS.hold) OS.hold(500); if (sc._raf) return;
  sc._raf = requestAnimationFrame(() => { sc._raf = 0; const i = Math.round(sc.scrollLeft / Math.max(1, sc.clientWidth)); if (i !== HI && i >= 0 && i < sc.children.length) { HI = i; const h = sc.closest('.an-hero'); if (h) heroMark(h); } }); }, true);
// mexer no destaque pausa a barrinha 12 s; quando a barrinha do destaque enche, passa ao seguinte
const holdHero = () => { HOLD = Date.now() + 12000; if (OS.hold) OS.hold(700); const h = document.querySelector('#view .an-hero'); if (h) h.classList.add('hold'); clearTimeout(HOLDT); HOLDT = setTimeout(() => { const h2 = document.querySelector('#view .an-hero'); if (h2) h2.classList.remove('hold'); }, 12050); };
['touchstart', 'pointerdown', 'wheel', 'focusin'].forEach(ev => document.addEventListener(ev, e => { if (e.target && e.target.closest && e.target.closest('#view .an-hero')) holdHero(); }, { passive: true, capture: true }));
document.addEventListener('animationend', e => { if (e.animationName !== 'anFill') return; const h = e.target && e.target.closest && e.target.closest('#view .an-hero'); if (!h || document.hidden || h.classList.contains('hold') || h.matches(':hover')) return; heroGo(HI + 1); });

/* Início: destaque, continuar a ver, novos episódios, recomendado para ti, simulcasts, em alta, categorias, clássicos, notícias */
P[''] = () => { const S = sNow(), L = mineAll(), sea = need('s:' + S.y + S.s, H6, () => API.season(S), true), tr = need('trend', H6, API.trending, true), rc = need('recent', 15 * 6e4, API.recent, true), cl = need('classics', 24 * 36e5, API.classics, true);
  const watching = U.sortBy(L.filter(a => a.status === 'A ver'), a => -(a._u || 0)), want = L.filter(a => a.status === 'Quero ver'), favs = L.filter(a => a.fav);
  const feat = (tr || []).filter(x => x.ban && x.desc).slice(0, 6), hx = watching.find(a => a.ban), slides = hx ? [fromMine(hx)].concat(feat.filter(x => kOf(x) !== kOf(hx)).slice(0, 5)) : feat.length ? feat : (sea || []).filter(x => x.ban).slice(0, 5);
  if (HI >= slides.length) HI = 0;
  const hero = slides.length ? heroOf(slides) : (tr || sea ? '' : errBox('trend') || loading());
  const cont = watching.length ? row('Continuar a ver', watching.slice(0, 12).map(a => { const t = +a.eps || 0, ep = +a.ep || 0;
      return wide(fromMine(a), { badge: 'E' + (ep + 1), sub: t ? `Episódio ${ep} de ${t}` : `Episódio ${ep}`, p: t ? Math.round(ep / t * 100) : 0, act: `<button type="button" class="an-plus" data-act="anEp" data-id="${a.id}" data-d="1" aria-label="Vi mais um episódio">${UI.ic('plus')}1</button>` }); }), { wide: 1, more: '#animes.lista' }) : '';
  const fresh0 = (rc || []).map(e => wide(e.x, { badge: 'E' + e.ep, sub: `Episódio ${e.ep} · ${ago(e.at)}` }));
  const SD = seedsOf(), rby = SD.length ? need(recKey(SD), 12 * 36e5, () => API.recs(SD), true) : null, ragg = rby ? recsAgg(rby, SD) : [];
  const subnav = `<nav class="an-subnav" aria-label="Páginas dos animes">${AT.filter(a => a[0]).map(([k, l]) => `<a href="#animes.${k}">${l}</a>`).join('')}</nav>`;
  return hero + subnav + `<div class="an-pad">` + cont + row('Novos episódios', fresh0.slice(0, 20), { wide: 1, more: '#animes.calendario' })
    + (ragg.length ? row('Recomendado para ti', ragg.slice(0, 20).map(c => c.x), { more: '#animes.recomendados', card: x => { const c = ragg.find(z => z.x === x); return { sub: c ? 'Porque viste ' + c.why[0] : '' }; } }) : '')
    + row(`Simulcasts de ${esc(sName(S))} <small>${SEM[S.s]}</small>`, (sea || []).slice(0, 20), { more: '#animes.temporada' })
    + row('Em alta agora', (tr || []).slice(0, 20))
    + `<section class="an-row"><div class="an-rh"><h3>Explora por categoria</h3><a class="an-more" href="#animes.categorias">Todas</a></div>${catTiles('strip')}</section>`
    + row('Os teus favoritos', favs.map(fromMine), { card: () => ({ nosc: 1 }) }) + row('Queres ver', want.map(fromMine), { card: () => ({ nosc: 1 }) })
    + row('Clássicos que quase toda a gente adora', fresh(cl).slice(0, 20), { more: '#animes.recomendados' })
    + (!L.length ? `<div class="an-wel"><h3>Começa a tua lista</h3><p>Pesquisa os animes que já viste e marca <b>Já vi</b>, ou toca num dos simulcasts para o seguires episódio a episódio.</p><a class="btn an-cta" href="#animes.pesquisar">${UI.ic('search')}Pesquisar anime</a></div>` : '')
    + (tr ? '' : errBox('trend')) + '<p class="an-src">Dados do AniList, do Kitsu e do MyAnimeList.</p></div>'; };

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
const aiList = (items, why) => `<ul class="an-air">${items.map(o => { const x = keep(o.x), kk = esc(kOf(x));
  return `<li style="--c:${colOf(x)}"><button type="button" class="an-rc" data-act="anOpen" data-k="${kk}">${cover(x, 'sm')}</button><div class="an-ri"><b class="click" data-act="anOpen" data-k="${kk}">${esc(x.t)}</b><small>${esc(subOf(x))}</small>${why && o.why ? `<p>${esc(o.why)}</p>` : ''}<span class="an-rq"><button type="button" class="btn xs" data-act="anSet" data-k="${kk}" data-s="Quero ver">Quero ver</button><button type="button" class="btn xs ghost" data-act="anSet" data-k="${kk}" data-s="Visto">Já vi</button></span></div>${x.sc ? `<span class="an-rs"><b>${scT(x.sc)}</b><small>de 10</small></span>` : ''}</li>`; }).join('')}</ul>`;
const aiBox = () => { const r = AIR && Array.isArray(AIR.items) ? AIR.items.filter(o => o.x && !mine(o.x)) : [];
  return `<section class="an-ai"><div class="an-aih"><h3>${UI.ic('brain')}Pede à IA</h3><p>Diz o que te apetece ver e a IA escolhe 8 animes a pensar na tua lista (os que já tens ficam de fora).</p></div>
    <form class="an-aif" data-form="anAI"><input class="field" name="q" value="${esc((AIR && AIR.q) || '')}" placeholder="Ex.: algo curto e leve, parecido com Frieren, um filme para ver hoje" aria-label="O que te apetece ver?" maxlength="200" autocomplete="off"><button class="btn an-cta" ${AIB ? 'disabled' : ''}>${AIB ? 'A pensar…' : 'Recomendar'}</button></form>
    ${AIE ? `<p class="an-aie">${esc(AIE)}</p>` : ''}${r.length ? aiList(r, 1) : ''}</section>`; };
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
  const head = `<section class="an-fy"><h2>Recomendado para ti</h2><p>${S.length ? `A partir do que viste e das tuas notas (${S.slice(0, 3).map(x => esc(x.t)).join(', ')}${S.length > 3 ? '…' : ''}). O que já está na tua lista não aparece: marca <b>Quero ver</b> ou <b>Já vi</b> e as sugestões mudam.` : `Marca alguns animes que já viste (e dá-lhes nota) para as recomendações ficarem à tua medida. Até lá, ficam os que quase toda a gente adora.`}</p></section>`;
  const pickT = S.length ? (agg ? (agg.length ? `<section class="an-row"><div class="an-rh"><h3>A escolha para ti</h3></div><div class="an-grid">${agg.slice(0, 12).map(c => poster(c.x, { sub: 'Porque viste ' + c.why.slice(0, 2).join(' e ') })).join('')}</div></section>` : '') : errBox(k) || loading('A escolher animes para ti…')) : '';
  return `<div class="an-pad">` + head + pickT + aiBox()
    + (S.length > 1 ? (by || []).slice(0, 4).map(b => row(`Porque viste ${esc(b.t)}`, fresh(b.list.map(o => o.x)).slice(0, 15))).join('') : '')
    + gl.map(o => row(`Mais ${esc(gN(o.g))}`, fresh(o.L).slice(0, 20))).join('')
    + row('Clássicos que quase toda a gente adora', fresh(cl).slice(0, 20)) + row('Joias escondidas (muito boas e pouco conhecidas)', fresh(gm).slice(0, 20)) + row('Filmes imperdíveis', fresh(mv).slice(0, 20))
    + (cl ? '' : errBox('classics') || loading()) + '<p class="an-src">Recomendações da comunidade do AniList.</p></div>'; };

/* Navegar: populares, novidades, mais bem avaliados ou A–Z, por categoria e formato, com "Ver mais" */
P.navegar = () => { const o = Object.assign({ s: 'pop', g: '', f: '' }, OS.ui.anNav || {}), pages = Math.max(1, +OS.ui.anNavP || 1), base = 'n:' + o.s + ':' + o.g + ':' + o.f;
  const parts = []; let more = false, err = '', wait = false;
  for (let p = 1; p <= pages; p++) { const r = need(base + ':' + p, H6, () => API.browse(o, p), true); if (!r) { wait = true; err = err || errBox(base + ':' + p); break; } (r.list || []).forEach(x => parts.push(keep(x))); more = r.more; }
  const seen = new Set(), L = parts.filter(x => !seen.has(kOf(x)) && seen.add(kOf(x)));
  return `<div class="an-pad"><section class="an-nav"><h2>${o.g ? esc(gN(o.g)) : 'Navegar'}</h2>
      <div class="an-seg" role="group" aria-label="Ordenar">${[['pop', 'Populares'], ['novo', 'Novidades'], ['nota', 'Mais bem avaliados'], ['az', 'A–Z']].map(([v, l]) => `<button type="button" class="${o.s === v ? 'on' : ''}" data-act="anNav" data-k="s" data-v="${v}" aria-pressed="${o.s === v}">${l}</button>`).join('')}</div>
      <div class="an-fl"><div class="row gap6" style="flex-wrap:wrap">${[['', 'Tudo'], ['TV', 'Séries'], ['MOVIE', 'Filmes'], ['OUT', 'Outros']].map(([v, l]) => UI.chip(l, 'anNav', o.f === v, `data-k="f" data-v="${v}"`)).join('')}</div>
        <select class="field" data-ansel="anNavG" aria-label="Categoria"><option value="">Todas as categorias</option>${CATS.map(([g]) => `<option value="${esc(g)}"${o.g === g ? ' selected' : ''}>${esc(gN(g))}</option>`).join('')}</select></div></section>
    ${L.length ? grid(L) : ''}${wait ? (err || loading()) : ''}${!wait && more ? `<div class="an-more2"><button type="button" class="btn an-ghost" data-act="anNavMore">Ver mais</button></div>` : ''}${!wait && !L.length ? UI.empty('Nada com estes filtros.') : ''}</div>`; };
A.anNav = b => { OS.ui.anNav = Object.assign({ s: 'pop', g: '', f: '' }, OS.ui.anNav || {}, { [b.dataset.k]: b.dataset.v }); OS.ui.anNavP = 1; OS.request(); };
A.anNavMore = () => { OS.ui.anNavP = (+OS.ui.anNavP || 1) + 1; OS.request(); };

/* Categorias */
P.categorias = () => `<div class="an-pad"><section class="an-fy"><h2>Categorias</h2><p>Escolhe uma categoria para veres os animes mais populares, as novidades, os mais bem avaliados ou de A a Z.</p></section>${catTiles('grid')}</div>`;

/* Simulcasts (a temporada): escolhe a estação e o ano; ordena por popularidade, nota ou próximo episódio */
P.temporada = () => { const S = OS.ui.anS || sNow(), k = 's:' + S.y + S.s, L = need(k, H6, () => API.season(S), true), f = OS.ui.anSf || {};
  const gens = [...new Set((L || []).flatMap(x => x.gen || []))].sort((a, b) => gN(a).localeCompare(gN(b)));
  let it = (L || []).filter(x => (!f.fmt || (f.fmt === 'MOVIE' ? x.fmt === 'MOVIE' : f.fmt === 'TV' ? /^TV/.test(x.fmt) : !/^TV|MOVIE/.test(x.fmt))) && (!f.g || (x.gen || []).includes(f.g)));
  it = f.o === 'nota' ? U.sortBy(it, x => -(x.sc || 0)) : f.o === 'prox' ? U.sortBy(it, x => x.next ? x.next.at : 9e15) : it;
  const sel = `<div class="an-sea"><button type="button" class="icon-btn" data-act="anSea" data-d="-1" aria-label="Temporada anterior">${UI.ic('left')}</button><div><h2>${esc(sName(S))}</h2><small>Simulcasts: animes que estrearam de ${SEM[S.s]} de ${S.y}</small></div><button type="button" class="icon-btn" data-act="anSea" data-d="1" aria-label="Temporada seguinte">${UI.ic('right')}</button>${S.y !== sNow().y || S.s !== sNow().s ? `<button type="button" class="btn xs an-ghost" data-act="anSea" data-d="0">Voltar à atual</button>` : ''}</div>`;
  const filt = `<div class="an-fl"><div class="row gap6" style="flex-wrap:wrap">${[['', 'Tudo'], ['TV', 'Séries'], ['MOVIE', 'Filmes'], ['OUT', 'Outros']].map(([v, l]) => UI.chip(l, 'anSf', (f.fmt || '') === v, `data-k="fmt" data-v="${v}"`)).join('')}</div>
    <div class="row gap6"><select class="field" data-ansel="anSfSel" data-k="g" aria-label="Género"><option value="">Todos os géneros</option>${gens.map(g => `<option value="${esc(g)}"${f.g === g ? ' selected' : ''}>${esc(gN(g))}</option>`).join('')}</select>
    <select class="field" data-ansel="anSfSel" data-k="o" aria-label="Ordenar"><option value="">Mais populares</option><option value="nota"${f.o === 'nota' ? ' selected' : ''}>Melhor nota</option><option value="prox"${f.o === 'prox' ? ' selected' : ''}>Próximo episódio</option></select></div></div>`;
  return `<div class="an-pad">` + sel + filt + errBox(k) + (!L ? loading('A buscar a temporada…') : it.length ? `<div class="an-grid">${it.map(x => poster(x, { sub: x.next && x.next.at > Date.now() ? `Ep. ${x.next.ep} · ${WD[new Date(x.next.at).getDay()].slice(0, 3)} ${hm(x.next.at)}` : subOf(x) })).join('')}</div>` : UI.empty('Nenhum anime com estes filtros nesta temporada.')) + '</div>'; };
A.anSea = b => { const d = +b.dataset.d; OS.ui.anS = d ? sShift(OS.ui.anS || sNow(), d) : null; OS.request(); };
A.anSf = b => { OS.ui.anSf = Object.assign({}, OS.ui.anSf || {}, { [b.dataset.k]: b.dataset.v }); OS.request(); };
document.addEventListener('change', e => { const el = e.target, k = el && el.dataset && el.dataset.ansel; if (!k) return;
  if (k === 'anSfSel') OS.ui.anSf = Object.assign({}, OS.ui.anSf || {}, { [el.dataset.k]: el.value });
  else if (k === 'anYearSel') OS.ui.anY = +el.value;
  else if (k === 'anLoSel') OS.ui.anLo = el.value;
  else if (k === 'anNavG') { OS.ui.anNav = Object.assign({ s: 'pop', g: '', f: '' }, OS.ui.anNav || {}, { g: el.value }); OS.ui.anNavP = 1; }
  else return; OS.request(); });

/* Calendário de lançamentos: os episódios da semana, dia a dia, à tua hora (no computador em colunas, como a Crunchyroll) */
P.calendario = () => { const W = need('week', 30 * 6e4, API.week), only = !!OS.ui.anCalMine, L = mineAll();
  if (!W) return `<div class="an-pad">${errBox('week') || loading('A buscar os episódios da semana…')}</div>`;
  const list = W.filter(e => !only || mine(e.x)), days = new Map();
  for (let i = 0; i < 7; i++) days.set(U.addDays(today(), i), []);
  list.forEach(e => { const k = U.iso(new Date(e.at)); if (days.has(k)) days.get(k).push(e); });
  const td = today(), out = [...days.entries()].map(([d, es]) => { const t = new Date(d + 'T12:00:00'), wd = WD[t.getDay()], rel = d === td ? 'Hoje' : d === U.addDays(td, 1) ? 'Amanhã' : '';
    return `<section class="an-day${d === td ? ' td' : ''}"><h3>${rel || esc(wd.replace(/^./, c => c.toUpperCase()))} <small>${rel ? esc(wd) + ', ' : ''}${dm(t)}</small></h3>
      <div class="an-eps">${es.length ? es.map(e => { const x = keep(e.x), m = mine(x);
        return `<button type="button" class="an-epi${m ? ' mine' : ''}${e.at < Date.now() ? ' past' : ''}" data-act="anOpen" data-k="${esc(kOf(x))}" style="--c:${colOf(x)}"><span class="an-et">${hm(e.at)}</span>${cover(x, 'xs')}<span class="an-en"><b>${esc(x.t)}</b><small>Episódio ${e.ep}${x.eps ? ' de ' + x.eps : ''}${m ? ' · na tua lista' : ''}</small></span></button>`; }).join('') : `<p class="an-tz">Sem episódios${only ? ' dos teus' : ''}.</p>`}</div></section>`; }).join('');
  return `<div class="an-pad"><div class="an-calh"><div><h2>Calendário de lançamentos</h2><p>Os episódios novos dos próximos 7 dias, à hora do teu aparelho (a hora a que saem no Japão). Normalmente chegam às plataformas de streaming no mesmo dia.</p></div>
    <label class="an-sw"><input type="checkbox" data-act="anCalMine" ${only ? 'checked' : ''}${L.length ? '' : ' disabled'}><span>Só os da minha lista</span></label></div><div class="an-week">${out}</div></div>`; };
A.anCalMine = b => { OS.ui.anCalMine = b.checked ? 1 : 0; OS.request(); };

/* Melhores do ano: escolhe o ano */
P.premios = () => OS.Premios ? OS.Premios.view() : '';
// v3.73: jogos de anime (Pursuit), ranking por pontos e clãs com conversas (js/social.js)
P.pursuit = () => OS.Social ? OS.Social.hunter() : ''; P.ranking = () => OS.Social ? OS.Social.ranking() : ''; P.clas = () => OS.Social ? OS.Social.clas() : ''; // v3.72: Prémios Prumo (votação de fim de ano) e premiações oficiais
P.melhores = () => { const y0 = new Date().getFullYear(), y = +OS.ui.anY || y0, k = 'b:' + y, L = need(k, y === y0 ? H6 : 72 * 36e5, () => API.best(y), true), f = OS.ui.anBf || '';
  const it = (L || []).filter(x => !f || (f === 'MOVIE' ? x.fmt === 'MOVIE' : x.fmt !== 'MOVIE'));
  const years = []; for (let i = y0; i >= 1960; i--) years.push(i);
  return `<div class="an-pad"><div class="an-sea"><button type="button" class="icon-btn" data-act="anYear" data-d="-1" aria-label="Ano anterior">${UI.ic('left')}</button><div><h2>Os melhores de ${y}</h2><small>Pela nota da comunidade (os mais votados, para não aparecerem desconhecidos)</small></div><button type="button" class="icon-btn" data-act="anYear" data-d="1" aria-label="Ano seguinte" ${y >= y0 ? 'disabled' : ''}>${UI.ic('right')}</button>
      <select class="field an-ys" data-ansel="anYearSel" aria-label="Escolher o ano">${years.map(v => `<option${v === y ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="row gap6" style="flex-wrap:wrap">${[['', 'Tudo'], ['TV', 'Séries'], ['MOVIE', 'Filmes']].map(([v, l]) => UI.chip(l, 'anBf', f === v, `data-v="${v}"`)).join('')}</div>`
    + errBox(k) + (!L ? loading('A buscar os melhores de ' + y + '…') : it.length ? `<ol class="an-rank">${it.slice(0, 50).map((x, i) => { x = keep(x); const m = mine(x), kk = esc(kOf(x));
      return `<li style="--c:${colOf(x)}"><span class="an-rn${i < 3 ? ' p' + (i + 1) : ''}">${i + 1}</span><button type="button" class="an-rc" data-act="anOpen" data-k="${kk}">${cover(x, 'sm')}</button>
        <div class="an-ri"><b class="click" data-act="anOpen" data-k="${kk}">${esc(x.t)}</b><small>${esc([fmtN(x.fmt), x.eps ? x.eps + ' ep.' : '', x.stu].filter(Boolean).join(' · '))}</small><small class="an-rg">${esc((x.gen || []).slice(0, 3).map(gN).join(', '))}</small>
          <span class="an-rq">${m ? `<span class="an-mb s-${STC[m.status]}">${esc(m.status)}${m.nota ? ' · a tua nota ' + m.nota : ''}</span>` : `<button type="button" class="btn xs" data-act="anSet" data-k="${kk}" data-s="Visto">Já vi</button><button type="button" class="btn xs ghost" data-act="anSet" data-k="${kk}" data-s="Quero ver">Quero ver</button>`}</span></div>
        <span class="an-rs">${x.sc ? `<b>${scT(x.sc)}</b><small>de 10</small>` : ''}</span></li>`; }).join('')}</ol>` : UI.empty('Sem animes com votos suficientes nesse ano.')) + '</div>'; };
A.anYear = b => { const y0 = new Date().getFullYear(); OS.ui.anY = Math.min(y0, Math.max(1960, (+OS.ui.anY || y0) + +b.dataset.d)); OS.request(); };
A.anBf = b => { OS.ui.anBf = b.dataset.v; OS.request(); };

/* Notícias de anime (Google Notícias, na tua língua) */
P.noticias = () => { const N = need('news', 30 * 6e4, API.news);
  const card = (n, big) => `<a class="an-nw${big ? ' big' : ''}" href="${esc(n.l)}" target="_blank" rel="noopener noreferrer"><span class="an-nws">${esc(n.s || 'Notícia')}${n.d ? ' · ' + esc(ago(n.d)) : ''}</span><b>${esc(n.t)}</b></a>`;
  return `<div class="an-pad"><section class="an-fy"><h2>Notícias de anime</h2><p>O que se está a dizer sobre anime, mangá, estreias e streaming, nas últimas 48 horas. Abre no site de cada jornal.</p></section>`
    + (!N ? errBox('news') || loading('A buscar as notícias…') : N.length ? `<div class="an-news">${N.map((n, i) => card(n, i === 0)).join('')}</div>` : UI.empty('Sem notícias de anime nas últimas 48 horas.')) + '</div>'; };

/* A minha lista: a fila (a ver e quero ver), as tuas listas, o histórico e tudo, com os números */
P.lista = () => { const L = mineAll(), v = OS.ui.anLv || 'fila', f = OS.ui.anLf || '', o = OS.ui.anLo || '';
  const vistos = L.filter(a => a.status === 'Visto'), eps = U.sum(L, a => +a.ep || 0), mins = U.sum(L, a => (+a.ep || 0) * (+a.dur || 24)), rated = L.filter(a => +a.nota), hrs = mins / 60;
  const gc = {}; vistos.concat(L.filter(a => a.status === 'A ver')).forEach(a => (a.gen || []).forEach(g => { gc[g] = (gc[g] || 0) + 1; })); const topG = Object.entries(gc).sort((a, b) => b[1] - a[1]).slice(0, 5), gmax = topG.length ? topG[0][1] : 1;
  const seg = `<div class="an-seg" role="group" aria-label="O que mostrar">${[['fila', 'A minha fila'], ['listas', 'As minhas listas'], ['hist', 'Histórico'], ['tudo', 'Tudo']].map(([k, l]) => `<button type="button" class="${v === k ? 'on' : ''}" data-act="anLv" data-v="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>`;
  const kpis = `<div class="kpis">${UI.kpi('Vistos', vistos.length)}${UI.kpi('A ver', L.filter(a => a.status === 'A ver').length)}${UI.kpi('Quero ver', L.filter(a => a.status === 'Quero ver').length)}${UI.kpi('Episódios vistos', U.nf(eps), hrs >= 48 ? U.nf(Math.round(hrs / 24 * 10) / 10) + ' dias a ver anime' : U.nf(Math.round(hrs)) + ' horas a ver anime')}${UI.kpi('A tua nota média', rated.length ? (U.sum(rated, a => +a.nota) / rated.length).toFixed(1).replace('.', ',') : '–', rated.length ? rated.length + ' com nota' : '')}</div>`;
  let body = '';
  if (v === 'fila') { const q = U.sortBy(L.filter(a => a.status === 'A ver' || a.status === 'Quero ver'), a => (a.status === 'A ver' ? 0 : 1) * 1e15 - (a._u || 0));
    body = q.length ? `<div class="an-grid">${q.map(a => poster(fromMine(a), { nosc: 1, sub: a.status === 'A ver' ? `Episódio ${+a.ep || 0}${+a.eps ? ' de ' + a.eps : ''}` : 'Quero ver' })).join('')}</div>` : UI.empty('A tua fila está vazia. Marca animes como “Quero ver” ou “Estou a ver”.', `<a class="btn" href="#animes.pesquisar">${UI.ic('search')}Pesquisar anime</a>`); }
  else if (v === 'listas') { const LL = LS0(), cur = LL.find(l => l.id === OS.ui.anL);
    if (cur) { const its = (cur.items || []).map(k => itemOf(k)).filter(Boolean);
      body = `<div class="an-lh"><button type="button" class="btn xs an-ghost" data-act="anLv" data-v="listas">${UI.ic('left')}As minhas listas</button><h3>${esc(cur.n)}</h3><button type="button" class="btn xs ghost" data-act="anListDel" data-l="${esc(cur.id)}">Apagar a lista</button></div>${its.length ? grid(its) : UI.empty('Esta lista ainda está vazia. Num anime, carrega em “Guardar numa lista”.')}`; }
    else body = `<div class="an-lists">${LL.map(l => { const its = (l.items || []).map(k => itemOf(k)).filter(Boolean).slice(0, 4); return `<button type="button" class="an-lc" data-act="anListOpen" data-l="${esc(l.id)}"><span class="an-lcm">${its.map(x => cover(x)).join('') || '<i></i>'}</span><b>${esc(l.n)}</b><small>${(l.items || []).length} anime${(l.items || []).length === 1 ? '' : 's'}</small></button>`; }).join('')}
      <form class="an-lcn" data-form="anListNew" data-k=""><b>Nova lista</b><input class="field" name="n" placeholder="Ex.: Para ver com os amigos" maxlength="60" aria-label="Nome da nova lista"><button class="btn sm an-cta">Criar</button></form></div>`; }
  else if (v === 'hist') { const h = U.sortBy(L, a => -(a._u || 0)).slice(0, 40);
    body = h.length ? `<ul class="an-hist">${h.map(a => `<li><button type="button" class="an-rc" data-act="anOpen" data-k="${esc(kOf(a))}">${cover(a, 'xs')}</button><div class="an-ri"><b class="click" data-act="anOpen" data-k="${esc(kOf(a))}">${esc(a.t)}</b><small>${esc(a.status)}${+a.ep ? ' · episódio ' + a.ep + (+a.eps ? ' de ' + a.eps : '') : ''}${a.nota ? ' · a tua nota ' + a.nota : ''}</small></div><small class="an-hd2">${a._u ? esc(ago(a._u)) : ''}</small></li>`).join('')}</ul>` : UI.empty('Ainda não há histórico.'); }
  else { let it = L.filter(a => f === 'fav' ? a.fav : !f || a.status === f);
    it = o === 'nota' ? U.sortBy(it, a => -(+a.nota || 0)) : o === 'nome' ? U.sortBy(it, a => norm(a.t)) : U.sortBy(it, a => -(a._u || 0));
    body = `<div class="an-fl"><div class="row gap6" style="flex-wrap:wrap">${UI.chip(`Todos (${L.length})`, 'anLf', !f, 'data-v=""')}${ST.map(s => UI.chip(`${s} (${L.filter(a => a.status === s).length})`, 'anLf', f === s, `data-v="${s}"`)).join('')}${UI.chip(`Favoritos (${L.filter(a => a.fav).length})`, 'anLf', f === 'fav', 'data-v="fav"')}</div>
      <select class="field" data-ansel="anLoSel" aria-label="Ordenar"><option value="">Mexidos há menos tempo</option><option value="nota"${o === 'nota' ? ' selected' : ''}>A tua nota</option><option value="nome"${o === 'nome' ? ' selected' : ''}>Nome</option></select></div>
      ${it.length ? `<div class="an-grid">${it.map(a => poster(fromMine(a), { nosc: 1, sub: a.status === 'A ver' ? `Episódio ${+a.ep || 0}${+a.eps ? ' de ' + a.eps : ''}` : a.nota ? `A tua nota: ${a.nota} · ${NOTAS[a.nota] || ''}` : subOf(a) })).join('')}</div>`
        : UI.empty(L.length ? 'Nada com este filtro.' : 'A tua lista está vazia. Pesquisa um anime e marca se estás a ver, já viste ou queres ver.', `<a class="btn" href="#animes.pesquisar">${UI.ic('search')}Pesquisar anime</a>`)}`; }
  return `<div class="an-pad">${kpis}${topG.length ? `<div class="an-gs"><h3>Os géneros que mais vês</h3>${topG.map(([g, n]) => `<div class="an-gr"><span>${esc(gN(g))}</span><i><s style="width:${Math.round(n / gmax * 100)}%"></s></i><b>${n}</b></div>`).join('')}</div>` : ''}${seg}${body}</div>`; };
A.anLv = b => { OS.ui.anLv = b.dataset.v; if (b.dataset.v === 'listas') OS.ui.anL = ''; OS.request(); };
A.anLf = b => { OS.ui.anLf = b.dataset.v; OS.ui.anLv = 'tudo'; OS.request(); };

/* Top 10 e tier list */
P.tier = () => { const L = mineAll(), T = topL().map(id => OS.get('animes', id)), seen = L.filter(a => ['Visto', 'A ver', 'Em pausa', 'Larguei'].includes(a.status));
  const pool = U.sortBy(seen.filter(a => !a.tier), a => -(+a.nota || 0)), pod = T.slice(0, 3), order = [1, 0, 2].filter(i => pod[i]);
  const tb = a => `<button type="button" class="an-tc" data-act="anTierPick" data-id="${a.id}" title="${esc(a.t)}">${cover(a, 'xs')}<span>${esc(a.t)}</span></button>`;
  const sug = U.sortBy(L.filter(a => +a.nota >= 8 && !T.some(t => t.id === a.id)), a => -(+a.nota || 0)).slice(0, 8);
  return `<div class="an-pad"><section class="an-tl"><div class="an-rh"><h3>Tier list</h3><small>Toca num anime para o pores num tier.</small></div>
      <div class="an-tiers">${TIERS.map(([t, n]) => { const xs = U.sortBy(seen.filter(a => a.tier === t), a => -(+a.nota || 0)); return `<div class="an-tr t${t}"><div class="an-tlb"><b>${t}</b><small>${n}</small></div><div class="an-tcs">${xs.map(tb).join('') || '<span class="an-tz">Vazio</span>'}</div></div>`; }).join('')}</div>
      ${pool.length ? `<div class="an-pool"><h4>Por arrumar <small>(${pool.length})</small></h4><div class="an-tcs">${pool.map(tb).join('')}</div></div>` : seen.length ? '' : `<p class="an-tz">Quando marcares animes como vistos (ou a ver), aparecem aqui para os arrumares.</p>`}</section>
    <section class="an-top"><div class="an-rh"><h3>Os 10 animes da tua vida</h3>${T.length ? `<button class="btn xs an-ghost" data-act="anTopCopy">Copiar</button>` : ''}</div>
      ${T.length ? `<div class="an-pod">${order.map(i => { const a = pod[i]; return `<button type="button" class="an-pl p${i + 1}" data-act="anOpen" data-k="${esc(kOf(a))}">${cover(a, i === 0 ? 'lg' : '')}<span class="an-step"><b>${i + 1}</b></span><b class="an-plt">${esc(a.t)}</b></button>`; }).join('')}</div>
        <ol class="an-tol">${T.map((a, i) => `<li><span class="an-tn">${i + 1}</span>${cover(a, 'xs')}<div class="grow" style="min-width:0"><b class="click" data-act="anOpen" data-k="${esc(kOf(a))}">${esc(a.t)}</b><small>${a.nota ? 'A tua nota: ' + a.nota : esc(subOf(a))}</small></div>
          <span class="an-toa"><button class="icon-btn" data-act="anTopMove" data-i="${i}" data-d="-1" aria-label="Subir" ${i ? '' : 'disabled'}>${UI.ic('arrowUp')}</button><button class="icon-btn" data-act="anTopMove" data-i="${i}" data-d="1" aria-label="Descer" ${i < T.length - 1 ? '' : 'disabled'}>${UI.ic('arrowDown')}</button><button class="icon-btn" data-act="anTop" data-id="${a.id}" aria-label="Tirar do top">${UI.ic('x')}</button></span></li>`).join('')}</ol>`
        : `<p class="an-tz">Ainda não escolheste o teu top. Abre um anime que viste e carrega em <b>Pôr no top 10</b>.</p>`}
      ${sug.length && T.length < 10 ? `<h4 style="margin:14px 0 8px">Sugestões (nota 8 ou mais)</h4><div class="an-tcs">${sug.map(a => `<button type="button" class="an-tc" data-act="anTop" data-id="${a.id}">${cover(a, 'xs')}<span>${esc(a.t)} · ${a.nota}</span></button>`).join('')}</div>` : ''}</section></div>`; };

/* Pesquisar: as três bases ao mesmo tempo, resultados enquanto escreves, pesquisas recentes e a IA quando não encontras */
const SQ = { q: '', ai: null, aiQ: '', aiB: false, aiE: '' }, QK = 'oc_an_qs';
let qT = 0;
let RECQ = U.ls.get(QK, []) || [];
const QS = ['One Piece', 'Naruto', 'Attack on Titan', 'Demon Slayer', 'Jujutsu Kaisen', 'Frieren', 'Solo Leveling', 'Dragon Ball', 'Death Note', 'Fullmetal Alchemist', 'Spy x Family', 'Chainsaw Man'];
const qKey = q => 'q:' + norm(q);
const results = () => { const q = SQ.q; if (!q) return '';
  const L = need(qKey(q), 30 * 6e4, () => API.search(q)), ai = SQ.ai && SQ.aiQ === q ? SQ.ai : null;
  const aiBtn = `<div class="an-qai"><span>Não encontras? Escreve como o conheces (em português, uma personagem ou uma descrição) e a IA descobre qual é.</span><button type="button" class="btn sm an-ghost" data-act="anAIFind" ${SQ.aiB ? 'disabled' : ''}>${UI.ic('brain')}${SQ.aiB ? 'A procurar…' : 'Pedir à IA para encontrar'}</button></div>`;
  return (ai && ai.length ? `<section class="an-row"><div class="an-rh"><h3>A IA acha que é</h3></div>${aiList(ai.map(x => ({ x })), 0)}</section>` : '') + (SQ.aiE ? `<p class="an-aie">${esc(SQ.aiE)}</p>` : '')
    + errBox(qKey(q)) + (!L ? loading(`A procurar “${q}”…`) : L.length ? `<p class="an-qn">${L.length} resultado${L.length === 1 ? '' : 's'} para “${esc(q)}”</p>` + grid(L) + aiBtn : UI.empty('Não encontrei esse anime nas três bases (AniList, Kitsu e MyAnimeList).') + aiBtn); };
const qSet = q => { SQ.q = String(q || '').trim().slice(0, 80); if (SQ.q.length >= 2) { RECQ = [SQ.q].concat(RECQ.filter(x => norm(x) !== norm(SQ.q))).slice(0, 8); try { U.ls.set(QK, RECQ); } catch (e) { } } };
P.pesquisar = () => `<div class="an-pad"><form class="an-q" data-form="anFind" role="search"><span aria-hidden="true">${UI.ic('search')}</span><input class="field" name="q" data-anq value="${esc(SQ.q)}" placeholder="Pesquisar: nome do anime, em japonês ou em inglês (ex.: Shingeki no Kyojin, Frieren)" aria-label="Pesquisar anime" autocomplete="off" enterkeyhint="search"><button class="btn an-cta">Pesquisar</button></form>
    ${!SQ.q ? `${RECQ.length ? `<div class="an-qs"><span>Pesquisas recentes:</span>${RECQ.map(s => `<button type="button" class="chip" data-act="anQuick" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}<div class="an-qs"><span>Experimenta:</span>${QS.map(s => `<button type="button" class="chip" data-act="anQuick" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div><section class="an-row"><div class="an-rh"><h3>Ou explora por categoria</h3></div>${catTiles('strip')}</section>` : ''}
    <div id="anRes">${results()}</div></div>`;
OS.forms.anFind = (f, v) => { clearTimeout(qT); qSet(v('q')); OS.request(); return false; };
A.anQuick = b => { qSet(b.dataset.q); OS.request(); };
document.addEventListener('input', e => { const el = e.target; if (!el || !el.dataset || el.dataset.anq == null) return; clearTimeout(qT);
  qT = setTimeout(() => { if (!el.isConnected) return; const v = el.value.trim(); if (v === SQ.q) return; if (v.length < 2) { SQ.q = ''; const b = document.getElementById('anRes'); if (b) b.innerHTML = ''; return; } SQ.q = v.slice(0, 80); const b = document.getElementById('anRes'); if (b) b.innerHTML = results(); }, 450); });
document.addEventListener('focusout', e => { if (e.target && e.target.dataset && e.target.dataset.anq != null && SQ.q) qSet(SQ.q); });
A.anAIFind = async () => { const q = SQ.q; if (!q || SQ.aiB) return; if (!OS.AI || !OS.AI.json) return UI.toast('A IA não está disponível neste aparelho', 'warn');
  SQ.aiB = true; SQ.aiE = ''; redraw();
  try { const o = await OS.AI.json([{ text: `Uma pessoa procura um anime e escreveu: ${JSON.stringify(q)} (pode ser o nome em português ou noutra língua, o nome de uma personagem, uma descrição ou ter erros). Diz até 5 animes reais que ela pode querer dizer, do mais provável para o menos provável, com o título como aparece no AniList (em romaji ou em inglês). Responde APENAS JSON {"titulos":["…"]}` }], .2);
    const T = ((o && o.titulos) || []).map(t => String(t || '').slice(0, 100)).filter(Boolean).slice(0, 5); if (!T.length) throw new Error('a IA não sugeriu nenhum anime');
    const X = (await API.resolve(T)).filter(Boolean), seen = new Set(); SQ.ai = X.filter(x => !seen.has(kOf(x)) && seen.add(kOf(x))); SQ.aiQ = q; if (!SQ.ai.length) throw new Error('não encontrei os animes que a IA sugeriu');
  } catch (e) { SQ.aiE = /não está ligada/i.test((e && e.message) || '') ? 'A IA ainda não está ligada: liga-a em Definições › IA.' : 'A IA não conseguiu encontrar agora (' + ((e && e.message) || 'erro') + ').'; }
  SQ.aiB = false; redraw(); };

/* Detalhe de um anime (como a página de uma série na Crunchyroll) */
const detail = () => { const k = OS.ui.anK || '', base = itemOf(k);
  if (!base) return `<div class="an-pad">${UI.empty('Escolhe um anime da lista, da temporada ou da pesquisa.', `<a class="btn" href="#animes">Voltar aos animes</a>`)}</div>`;
  const d = need('d:' + k, 12 * 36e5, () => API.detail(base)), x = keep(Object.assign({}, base, d || {})), m = mine(x), kk = esc(k), nt = nextT(x);
  if (d && !base.al && d.al) { keep(Object.assign({}, d, { ki: base.ki })); }
  if (m && d) { const p = {}; ['img', 'ban', 'col', 'eps', 'dur', 'stu'].forEach(f => { if (d[f] && d[f] !== m[f]) p[f] = d[f]; }); if (d.al && !m.al) p.al = d.al; if (d.mal && !m.mal) p.mal = d.mal; if (Object.keys(p).length) setTimeout(() => OS.upd('animes', m.id, p, { silent: true }), 0); }
  const th = x.mal ? need('th:' + x.mal, 7 * 864e5, () => API.themes(x.mal), true) : null;
  const meta = [[fmtN(x.fmt), 'Formato'], [x.eps ? x.eps + (x.eps === 1 ? ' episódio' : ' episódios') : x.next && x.next.ep > 1 ? (x.next.ep - 1) + ' episódios até agora' : '', 'Episódios'], [x.dur ? x.dur + ' min' : '', 'Duração'], [x.sea ? SEN[x.sea] + ' ' + x.y : x.y || '', 'Estreia'], [x.stu, 'Estúdio'], [STN[x.st] || '', 'Estado']].filter(r => r[0]);
  const rk = d && (d.rank || []).find(r => r.all), rky = d && (d.rank || []).find(r => !r.all && r.y && !r.s);
  const tr = TR[k], ep = m ? +m.ep || 0 : 0, tot = (m && +m.eps) || x.eps || 0, top = m && topL().includes(m.id), inL = LS0().filter(l => (l.items || []).includes(k)).length;
  const mineBox = `<section class="an-me"><div class="an-sts" role="group" aria-label="Na tua lista">${ST.map(s => `<button type="button" class="an-stb s-${STC[s]}${m && m.status === s ? ' on' : ''}" data-act="anSet" data-k="${kk}" data-s="${s}" aria-pressed="${!!(m && m.status === s)}"${m && m.status === s ? ' title="Toca outra vez para tirar da lista"' : ''}>${m && m.status === s ? UI.ic('check') : ''}${esc(STB[s])}${m && m.status === s ? '<span class="an-stx" aria-hidden="true">×</span>' : ''}</button>`).join('')}<button type="button" class="an-stb an-stl" data-act="anListPick" data-k="${kk}">${UI.ic('mark')}${inL ? 'Nas tuas listas (' + inL + ')' : 'Guardar numa lista'}</button></div>
    ${m ? `<div class="an-mg">
      <div class="an-epc"><span>Episódio onde vais</span><div class="an-eps2"><button type="button" class="icon-btn" data-act="anEp" data-id="${m.id}" data-d="-1" aria-label="Menos um episódio" ${ep ? '' : 'disabled'}>${UI.ic('down')}</button><b>${ep}${tot ? `<small> de ${tot}</small>` : ''}</b><button type="button" class="icon-btn" data-act="anEp" data-id="${m.id}" data-d="1" aria-label="Mais um episódio" ${tot && ep >= tot ? 'disabled' : ''}>${UI.ic('up')}</button></div>${tot ? `<span class="an-bar"><i style="width:${Math.round(ep / tot * 100)}%"></i></span>` : ''}</div>
      <div class="an-nt"><span>A tua nota${m.nota ? `: <b>${m.nota}</b> · ${esc(NOTAS[m.nota])}` : ''}</span><div class="an-nb">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" class="${+m.nota >= n ? 'on' : ''}${+m.nota === n ? ' cur' : ''}" data-act="anNota" data-id="${m.id}" data-v="${n}" aria-label="Nota ${n}: ${NOTAS[n]}">${n}</button>`).join('')}</div></div>
      <div class="an-ma"><button type="button" class="btn sm${m.fav ? ' an-cta' : ' an-ghost'}" data-act="anFav" data-id="${m.id}" aria-pressed="${!!m.fav}">${UI.ic('heart')}${m.fav ? 'Favorito' : 'Pôr nos favoritos'}</button>
        <button type="button" class="btn sm${top ? ' an-cta' : ' an-ghost'}" data-act="anTop" data-id="${m.id}">${UI.ic('award')}${top ? 'No teu top 10' : 'Pôr no top 10'}</button>
        <button type="button" class="btn sm an-ghost" data-act="anTierPick" data-id="${m.id}">${m.tier ? `Tier <b class="an-tierb t${m.tier}">${m.tier}</b>` : 'Escolher tier'}</button>
        <button type="button" class="btn sm ghost" data-edit="animes:${m.id}">Datas e mais</button><button type="button" class="btn sm ghost" data-act="anDel" data-id="${m.id}">Tirar da lista</button></div>
      <form class="an-rev" data-form="anRev" data-id="${m.id}"><label for="anRv${m.id}">A tua resenha</label><textarea class="field" id="anRv${m.id}" name="rev" rows="4" placeholder="O que achaste? Personagens, história, animação, banda sonora, o final…">${esc(m.rev || '')}</textarea><button class="btn sm an-cta">Guardar resenha</button></form>
      ${m.start || m.end ? `<small class="an-dates">${m.start ? 'Começaste em ' + U.fmtD(m.start) : ''}${m.start && m.end ? ' · ' : ''}${m.end ? (m.status === 'Visto' ? 'acabaste em ' : 'paraste em ') + U.fmtD(m.end) : ''}</small>` : ''}</div>` : '<p class="an-me0">Marca se estás a ver, já viste ou queres ver: depois dás a nota, escreves a resenha e pões no teu tier.</p>'}</section>`;
  // episódios: com as miniaturas (quando a série está numa plataforma de streaming) ou só os números; tocar = "vi até aqui"
  // episódios: o número real de cada um (a AniList dá só alguns com miniatura e, nas séries longas, por ordem inversa);
  // o total é o que já saiu (o próximo menos 1) quando a série ainda está a sair; nas séries longas, a grelha de todos os episódios por blocos
  const epNum = (e, i) => { const mm = /(?:episode|episódio|ep\.?)\s*(\d+)/i.exec(e.t || ''); return mm ? +mm[1] : 0; };
  const epis0 = d && d.epis && d.epis.length ? d.epis : [], numd = epis0.map((e, i) => ({ e, n: epNum(e, i) })), allNum = numd.length && numd.every(z => z.n > 0);
  // (quando se sabe quantos episódios tem esta temporada, as miniaturas com número maior são de outra temporada da mesma série)
  const epis = (allNum ? numd.sort((p1, p2) => p1.n - p2.n) : numd.map((z, i) => ({ e: z.e, n: i + 1 }))).filter(z => !tot || z.n <= tot);
  const aired = x.next && x.next.ep ? x.next.ep - 1 : 0, maxN = epis.reduce((mx, z) => Math.max(mx, z.n), 0);
  const nEp = Math.max(tot || 0, aired, maxN, epis.length), upto = aired || nEp, showAll = OS.ui.anEpAll === k, long = nEp > 60;
  const epCard = z => { const n = z.n, e = z.e, seen = m && n <= ep, title = String(e.t || '').replace(/^Episode\s+(\d+)\s*[-–:]\s*/i, '').trim() || 'Episódio ' + n;
    return `<div class="an-ec${seen ? ' seen' : ''}"><button type="button" class="an-eci" data-act="anEpAt" data-k="${kk}" data-n="${n}" aria-label="Vi até ao episódio ${n}">${e.img ? `<img src="${esc(e.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}<span class="an-ecn">E${n}</span>${seen ? `<span class="an-ecv">${UI.ic('check')}Visto</span>` : ''}</button><b>Episódio ${n} · ${esc(title)}</b>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.site || 'Ver')}</a>` : ''}</div>`; };
  const BL = nEp > 400 ? 100 : 50, r0 = OS.ui.anEpR && OS.ui.anEpR.k === k ? OS.ui.anEpR.r : Math.floor(Math.min(Math.max(ep, 0), Math.max(nEp - 1, 0)) / BL) * BL + 1;
  const grid = (from, to) => `<div class="an-epn">${Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => { const n = from + i, seen = m && n <= ep; return `<button type="button" class="${seen ? 'seen' : ''}${n > upto ? ' fut' : ''}" data-act="anEpAt" data-k="${kk}" data-n="${n}" aria-label="Vi até ao episódio ${n}">${n}</button>`; }).join('')}</div>`;
  const ranges = long ? `<div class="an-epr" role="group" aria-label="Blocos de episódios">${Array.from({ length: Math.ceil(nEp / BL) }, (_, i) => { const f = i * BL + 1, t = Math.min(nEp, f + BL - 1); return `<button type="button" class="${f === r0 ? 'on' : ''}" data-act="anEpR" data-k="${kk}" data-r="${f}" aria-pressed="${f === r0}">${f}–${t}</button>`; }).join('')}</div>` : '';
  const epList = nEp ? `<section class="an-epsec"><div class="an-rh"><h3>Episódios <small>${nEp}${x.st === 'RELEASING' ? ' até agora' : ''}</small></h3>${m ? `<small>Toca num episódio para marcar que viste até lá.</small>` : ''}</div>
    ${long ? ranges + grid(r0, Math.min(nEp, r0 + BL - 1))
      : epis.length >= nEp ? `<div class="an-epg">${epis.slice(0, showAll ? 500 : 12).map(epCard).join('')}</div>${epis.length > 12 ? `<button type="button" class="btn sm an-ghost" data-act="anEpAll" data-k="${kk}">${showAll ? 'Mostrar menos' : 'Ver os ' + epis.length + ' episódios'}</button>` : ''}`
      : grid(1, nEp)}</section>` : '';
  const chars = d && d.chars && d.chars.length ? `<section class="an-row"><div class="an-rh"><h3>Personagens e vozes</h3></div><div class="an-chs">${d.chars.map(c => `<div class="an-ch"><span class="an-chi">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}${c.vimg ? `<img class="v" src="${esc(c.vimg)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</span><b>${esc(c.n)}</b><small>${c.role === 'MAIN' ? 'Principal' : 'Secundária'}${c.va ? ' · voz de ' + esc(c.va) : ''}</small></div>`).join('')}</div></section>` : '';
  const yt = s => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(s);
  const music = th && (th.op.length || th.ed.length) ? `<section class="an-mus"><div class="an-rh"><h3>Músicas</h3></div><div class="an-mug">${[['Aberturas', th.op], ['Encerramentos', th.ed]].filter(r => r[1].length).map(([l, L]) => `<div><h4>${l}</h4><ol>${L.map(s => `<li><a href="${esc(yt(s))}" target="_blank" rel="noopener noreferrer">${UI.ic('play')}<span>${esc(s)}</span></a></li>`).join('')}</ol></div>`).join('')}</div></section>` : '';
  // relacionados: filmes, OVAs, especiais e spin-offs (com o tipo e a relação); as temporadas ficam no seletor "Temporadas"
  const rel = d && d.rel && d.rel.length ? row('Relacionados', d.rel.map(r => r.x), { all: 1, card: r => { const z = d.rel.find(q => q.x === r) || {}; return { sub: [fmtN(r.fmt), RELN[z.t] || 'Relacionado', r.y].filter(Boolean).join(' · ') }; } }) : '';
  const seas = d && d.seasons && d.seasons.length > 1 ? `<section class="an-seas"><div class="an-rh"><h3>Temporadas <small>${d.seasons.length}</small></h3></div><div class="an-seac" role="group" aria-label="Temporadas">${d.seasons.map((z, i) => { const y = keep(z.x), ne = y.eps || (y.next && y.next.ep > 1 ? y.next.ep - 1 : 0);
      return `<button type="button" class="an-sea${z.cur ? ' on' : ''}" data-act="anOpen" data-k="${esc(kOf(y))}" aria-pressed="${!!z.cur}" title="${esc(y.t)}"><b>${esc(seaLab(y, i, d.seasons, d.seaPart))}</b><small>${esc([y.y, ne ? ne + ' ep.' : ''].filter(Boolean).join(' · '))}</small></button>`; }).join('')}</div></section>` : '';
  return `<section class="an-dh" style="--c:${colOf(x)}">${x.ban && !banBad(x.ban) ? `<img class="an-hb" src="${esc(x.ban)}" alt="" decoding="async" referrerpolicy="no-referrer">` : '<div class="an-hb an-hb0"></div>'}<div class="an-hg"></div>
      <div class="an-dc">${cover(x, 'an-dp')}<div class="an-dt"><a class="an-back" href="#animes">${UI.ic('left')}Animes</a><h2>${esc(x.t)}</h2>${x.ro || x.na ? `<p class="an-alt">${esc([x.ro, x.na].filter(Boolean).join(' · '))}</p>` : ''}
        <div class="an-dm">${x.sc ? `<span class="an-dsc">${UI.ic('star')}<b>${scT(x.sc)}</b><small>nota da comunidade</small></span>` : ''}${rk ? `<span class="an-drk">${rk.rank}.º mais bem avaliado de sempre</span>` : rky ? `<span class="an-drk">${rky.rank}.º mais bem avaliado de ${rky.y}</span>` : ''}</div>
        <p class="an-hm">${meta.slice(0, 4).map(r => esc(r[0])).join(' · ')}</p>${nt ? `<p class="an-hn">${esc(nt)}</p>` : ''}<div class="an-gen">${(x.gen || []).map(g => `<span>${esc(gN(g))}</span>`).join('')}</div></div></div></section>
    <div class="an-pad">${OS.Social ? OS.Social.noAnime(x) : ''}${mineBox}
    ${d && d.desc ? (() => { const at = tr ? '' : autoTr(d.desc), auto = !tr && at !== d.desc, orig = OS.ui.anOrig === k, txt = tr || (auto && !orig ? at : d.desc);
      return `<section class="an-syn"><div class="an-rh"><h3>Sinopse</h3>${tr || auto ? '' : langName() ? `<button type="button" class="btn xs an-ghost" data-act="anTr" data-k="${kk}" ${TRB ? 'disabled' : ''}>${TRB === k ? 'A traduzir…' : 'Traduzir com a IA'}</button>` : ''}</div><p>${esc(txt).replace(/\n/g, '<br>')}</p>${tr ? '<small>Traduzido pela IA.</small>' : auto ? `<small>Tradução automática. <button type="button" class="an-lnk" data-act="anOrig" data-k="${esc(k)}">${orig ? 'Ver a tradução' : 'Ver o original'}</button></small>` : ''}</section>`; })() : !d ? (errBox('d:' + k) || loading('A buscar os detalhes…')) : ''}
    ${d && watchL(d.links).length ? `<section class="an-where"><h3>Onde ver</h3><div class="row gap6" style="flex-wrap:wrap">${watchL(d.links).map(l => `<a class="btn sm an-ghost" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${UI.ic('play')}${esc(l.site)}</a>`).join('')}${d.tr ? `<button type="button" class="btn sm an-cta" data-act="anTrailer" data-y="${esc(d.tr)}">${UI.ic('play')}Ver o trailer</button>` : ''}</div><div id="anTrl"></div></section>` : d && d.tr ? `<section class="an-trl"><button type="button" class="btn an-cta" data-act="anTrailer" data-y="${esc(d.tr)}">${UI.ic('play')}Ver o trailer</button><div id="anTrl"></div></section>` : ''}
    ${seas}${epList}
    <dl class="an-meta">${meta.map(([v, l]) => `<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${chars}${music}${rel}${d && d.rec && d.rec.length ? row('Se gostaste, vê também', d.rec) : ''}</div>`; };
A.anEpAll = b => { OS.ui.anEpAll = OS.ui.anEpAll === b.dataset.k ? '' : b.dataset.k; OS.request(); };
})();
