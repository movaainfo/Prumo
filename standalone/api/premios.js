// PRUMO · Prémios Prumo de anime (função do Vercel, v3.72). Todos os anos, as contas do Prumo votam nos melhores animes do ano.
// Os nomeados saem de dados reais (MyAnimeList pelo Jikan): os animes do ano mais vistos e mais bem avaliados, por género, os filmes,
// as estreias, as continuações e as aberturas. Votação de 1 de dezembro a 10 de janeiro (a administração pode abrir, fechar e revelar
// antes); uma conta = um voto por categoria (pode mudar até fechar). Na revelação, cada categoria mostra o vencedor e a percentagem de cada nomeado.
//   ver (público): a edição, os nomeados, os meus votos e, depois de revelada, os resultados · votar (com sessão) · admin (gerar, abrir, fechar, revelar)
'use strict';
const N = require('./_nuvem');
const JK = () => process.env.JIKAN_BASE || 'https://api.jikan.moe/v4/';
const CATS = [['ano', 'Anime do Ano'], ['acao', 'Melhor Ação'], ['romance', 'Melhor Romance'], ['comedia', 'Melhor Comédia'], ['fantasia', 'Melhor Fantasia ou Isekai'], ['drama', 'Melhor Drama'], ['desporto', 'Melhor Desporto'], ['slice', 'Melhor Slice of Life'],
  ['estreia', 'Melhor Estreia'], ['continua', 'Melhor Continuação'], ['filme', 'Filme do Ano'], ['abertura', 'Melhor Abertura']];
const G = { acao: [1], romance: [22], comedia: [4], fantasia: [10, 62], drama: [8], desporto: [30], slice: [36] };
const SEQ = /\b(season|part|2nd|3rd|\dth|ii|iii|iv|final|kanketsu|zoku|shou|arc)\b|\s\d+$/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ano0 = () => { const d = new Date(); return d.getUTCMonth() === 0 && d.getUTCDate() <= 20 ? d.getUTCFullYear() - 1 : d.getUTCFullYear(); }; // em janeiro ainda é a edição do ano anterior
const caminho = (a, x) => 'aw/' + a + '/' + x;
const lerJ = async (p, d) => { try { const g = await N.store().get(p); return g ? { v: JSON.parse(g.buf.toString()), etag: g.etag } : { v: d, etag: null }; } catch (e) { return { v: d, etag: null }; } };
// fase pelo calendário, salvo escolha da administração
const fase = (ed, a) => { if (ed.fase) return ed.fase; const now = Date.now(), ini = Date.UTC(a, 11, 1), fim = Date.UTC(a + 1, 0, 10, 23, 59), rev = Date.UTC(a + 1, 0, 12);
  return now < ini ? 'nomeacao' : now <= fim ? 'votacao' : now < rev ? 'fechada' : 'revelada'; };
const jk = async p => { for (let i = 0; i < 3; i++) { try { const r = await fetch(JK() + p, { headers: { accept: 'application/json', 'user-agent': 'Prumo/1.0' }, signal: AbortSignal.timeout(10000) }); if (r.status === 429) { await sleep(1500); continue; } if (!r.ok) throw new Error('Jikan ' + r.status); return await r.json(); } catch (e) { if (i === 2) throw e; await sleep(800); } } };
const item = x => ({ id: String(x.mal_id), t: String(x.title_english || x.title || '').slice(0, 120), ro: String(x.title || '').slice(0, 120), img: ((x.images || {}).webp || (x.images || {}).jpg || {}).image_url || '', nota: +x.score || 0, membros: +x.members || 0 });
// nomeados a partir dos animes do ano (as 4 temporadas)
const gerar = async a => { const todos = new Map();
  for (const s of ['winter', 'spring', 'summer', 'fall']) for (let pg = 1; pg <= 3; pg++) { let j; try { j = await jk(`seasons/${a}/${s}?page=${pg}&sfw=true`); } catch (e) { break; } (j.data || []).forEach(x => { if (x && x.mal_id && !todos.has(x.mal_id)) todos.set(x.mal_id, x); }); await sleep(450); if (!(j.pagination || {}).has_next_page) break; }
  const L = [...todos.values()].filter(x => (x.members || 0) > 15000 && (+x.year === a || String((x.aired || {}).from || '').startsWith(String(a)) || ['winter', 'spring', 'summer', 'fall'].includes(x.season)));
  const pont = x => (+x.score || 6) * Math.log10((x.members || 1) + 10), ord = arr => arr.slice().sort((p, q) => pont(q) - pont(p));
  const tv = L.filter(x => ['TV', 'ONA'].includes(x.type)), gen = (x, ids) => (x.genres || []).concat(x.themes || []).some(g => ids.includes(g.mal_id)), top = (arr, n = 6) => ord(arr).slice(0, n).map(item);
  const C = { ano: top(tv, 8), estreia: top(tv.filter(x => !SEQ.test((x.title || '') + ' ' + (x.title_english || ''))), 6), continua: top(tv.filter(x => SEQ.test((x.title || '') + ' ' + (x.title_english || ''))), 6), filme: top(L.filter(x => x.type === 'Movie'), 6) };
  Object.entries(G).forEach(([k, ids]) => { C[k] = top(tv.filter(x => gen(x, ids)), 6); });
  // aberturas: a primeira abertura dos animes do ano mais fortes
  const ab = []; for (const x of ord(tv).slice(0, 10)) { if (ab.length >= 6) break; try { const j = await jk(`anime/${x.mal_id}/themes`); const op = ((j.data || {}).openings || [])[0]; if (op) { const m = String(op).replace(/^\d+:\s*/, '').replace(/\s*\(eps?[^)]*\)\s*$/i, ''); ab.push(Object.assign(item(x), { id: x.mal_id + '-op', sub: item(x).t, t: m.slice(0, 120) })); } } catch (e) { } await sleep(450); }
  C.abertura = ab;
  return CATS.filter(([k]) => (C[k] || []).length >= 3).map(([k, n]) => ({ k, n, nom: C[k] })); };
const edicao = async a => (await lerJ(caminho(a, 'edicao.json'), null)).v;
const resultados = (cats, T) => cats.map(c => { const t = T[c.k] || {}, tot = Object.values(t).reduce((s, v) => s + v, 0);
  return { k: c.k, n: c.n, votos: tot, r: c.nom.map(x => ({ id: x.id, t: x.t, sub: x.sub || '', img: x.img, v: t[x.id] || 0, p: tot ? Math.round((t[x.id] || 0) / tot * 1000) / 10 : 0 })).sort((p, q) => q.v - p.v) }; });
const ver = async (a, eid) => { const ed = await edicao(a); if (!ed) return { ano: a, fase: 'nomeacao', cats: [], pronto: false };
  const f = fase(ed, a), mine = eid ? (await lerJ(caminho(a, 'v/' + eid + '.json'), {})).v : {}, out = { ano: a, fase: f, cats: ed.cats, meus: mine || {}, pronto: true, ini: Date.UTC(a, 11, 1), fim: Date.UTC(a + 1, 0, 10, 23, 59) };
  if (f === 'revelada') { const T = (await lerJ(caminho(a, 'tally.json'), {})).v; out.res = resultados(ed.cats, T); }
  else { const T = (await lerJ(caminho(a, 'tally.json'), {})).v; out.participantes = (T._n || 0); }
  return out; };
// um voto: guarda o da pessoa e acerta a contagem (gravação condicional: nada se perde com vários votos ao mesmo tempo)
const votar = async (a, eid, cat, id) => { const ed = await edicao(a); if (!ed) throw N.err('premios', 'Ainda não há nomeados.', 400);
  if (fase(ed, a) !== 'votacao') throw N.err('premios', 'A votação não está aberta.', 400);
  const c = ed.cats.find(x => x.k === cat); if (!c || !c.nom.some(x => x.id === id)) throw N.err('premios', 'Nomeado desconhecido.', 400);
  const s = N.store(), pv = caminho(a, 'v/' + eid + '.json'), meu = (await lerJ(pv, {})).v || {}, antes = meu[cat], novo = !Object.keys(meu).length;
  if (antes === id) return { meus: meu };
  for (let i = 0; i < 8; i++) { const { v, etag } = await lerJ(caminho(a, 'tally.json'), {}), T = v || {}; T[cat] = T[cat] || {};
    if (antes && T[cat][antes]) T[cat][antes]--; T[cat][id] = (T[cat][id] || 0) + 1; if (novo) T._n = (T._n || 0) + 1;
    try { await s.put(caminho(a, 'tally.json'), Buffer.from(JSON.stringify(T)), etag ? { ifMatch: etag } : { overwrite: false }); break; } catch (e) { if (i === 7) throw N.err('premios', 'Muita gente a votar agora. Tenta outra vez.', 503); await sleep(80 + Math.random() * 200); } }
  meu[cat] = id; await s.put(pv, Buffer.from(JSON.stringify(meu))); return { meus: meu }; };
module.exports = N.handler(async (req, res) => {
  const b = req.method === 'POST' ? await N.body(req) : {}, op = String(b.op || (req.query || {}).op || 'ver'), a = Math.max(2020, Math.min(2100, +b.ano || ano0()));
  if (N.limit(req, 'premios', 120, 60e3)) return N.send(res, 429, { ok: false, msg: 'Espera um pouco.' });
  const t = await N.readToken(req).catch(() => null);
  if (op === 'ver') return N.send(res, 200, Object.assign({ ok: true }, await ver(a, t ? t.a : '')));
  if (!t) return N.send(res, 401, { ok: false, msg: 'Entra na tua conta para votar.', code: 'sessao' });
  const g0 = await N.store().get('a/' + t.a); let r0 = null; try { r0 = g0 && N.open(await N.accKey(), g0.buf); } catch (e) { }
  if (!r0 || r0.uid !== t.u || (r0.tv || 1) !== t.v) return N.send(res, 401, { ok: false, msg: 'A sessão terminou. Entra outra vez.', code: 'sessao' });
  if (op === 'votar') { if (N.limit(req, 'premiosv|' + t.a, 60, 3600e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados votos seguidos.' }); return N.send(res, 200, Object.assign({ ok: true }, await votar(a, t.a, String(b.cat || ''), String(b.id || '')))); }
  if (op === 'admin') { const r = r0;
    if (!r || !N.isAdminEmail(r.email)) { N.sec('admin_negado', req); return N.send(res, 403, { ok: false, msg: 'Sem acesso.' }); }
    const acao = String(b.acao || ''), s = N.store(), cur = await edicao(a);
    if (acao === 'gerar') { const cats = await gerar(a); if (cats.length < 3) return N.send(res, 502, { ok: false, msg: 'O MyAnimeList não respondeu com animes suficientes. Tenta daqui a pouco.' }); await s.put(caminho(a, 'edicao.json'), Buffer.from(JSON.stringify(Object.assign({}, cur || {}, { cats, at: Date.now() })))); return N.send(res, 200, Object.assign({ ok: true }, await ver(a, t.a))); }
    if (!cur) return N.send(res, 400, { ok: false, msg: 'Gera primeiro os nomeados.' });
    const F = { abrir: 'votacao', fechar: 'fechada', revelar: 'revelada', auto: '' }; if (!(acao in F)) return N.send(res, 400, { ok: false, msg: 'Ação desconhecida.' });
    await s.put(caminho(a, 'edicao.json'), Buffer.from(JSON.stringify(Object.assign({}, cur, { fase: F[acao] })))); return N.send(res, 200, Object.assign({ ok: true }, await ver(a, t.a))); }
  return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
});
module.exports.gerar = gerar; module.exports.ano0 = ano0; module.exports.edicao = edicao;
