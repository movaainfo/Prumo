// PRUMO · Prémios Prumo dos livros (função do Vercel, v3.79). Como os Prémios dos animes: todos os anos as contas votam nos melhores
// livros, por género. Os nomeados saem do Open Library (os mais lidos e guardados pelos leitores, dos últimos dois anos; o clássico é de sempre).
// Votação de 1 de dezembro a 10 de janeiro (a administração pode abrir, fechar e revelar antes); uma conta = um voto por categoria.
//   ver (público, gera os nomeados na primeira vez) · votar (com sessão) · admin (gerar, abrir, fechar, revelar)
'use strict';
const N = require('./_nuvem');
const OL = () => process.env.NAUTILO_OL_BASE || 'https://openlibrary.org/';
const CATS = [['ano', 'Livro do Ano', ''], ['ficcao', 'Melhor Ficção', 'fiction'], ['romance', 'Melhor Romance', 'romance'], ['fantasia', 'Melhor Fantasia ou Ficção científica', 'fantasy|science_fiction'],
  ['misterio', 'Melhor Mistério ou Thriller', 'mystery|thrillers'], ['naoficcao', 'Melhor Não ficção', 'history|science'], ['pessoal', 'Melhor Desenvolvimento pessoal', 'self-help|personal_development'],
  ['biografia', 'Melhor Biografia', 'biography|autobiography'], ['classico', 'Clássico favorito de sempre', 'classic_literature']];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ano0 = () => { const d = new Date(); return d.getUTCMonth() === 0 && d.getUTCDate() <= 20 ? d.getUTCFullYear() - 1 : d.getUTCFullYear(); };
const caminho = (a, x) => 'awl/' + a + '/' + x;
const lerJ = async (p, d) => { try { const g = await N.store().get(p); return g ? { v: JSON.parse(g.buf.toString()), etag: g.etag } : { v: d, etag: null }; } catch (e) { return { v: d, etag: null }; } };
const fase = (ed, a) => { if (ed.fase) return ed.fase; const now = Date.now(), ini = Date.UTC(a, 11, 1), fim = Date.UTC(a + 1, 0, 10, 23, 59), rev = Date.UTC(a + 1, 0, 12);
  return now < ini ? 'nomeacao' : now <= fim ? 'votacao' : now < rev ? 'fechada' : 'revelada'; };
const busca = async (subj, a, sempre) => { const q = `subject:${subj}` + (sempre ? '' : ` first_publish_year:[${a - 1} TO ${a}]`);
  const r = await fetch(OL() + 'search.json?' + new URLSearchParams({ q, sort: 'readinglog', limit: '12', fields: 'key,title,author_name,cover_i,first_publish_year,ratings_average' }), { headers: { accept: 'application/json', 'user-agent': 'Prumo/1.0' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('OL ' + r.status); return ((await r.json()).docs || []).filter(d => d.key && d.title); };
const item = d => ({ id: String(d.key).split('/').pop(), t: String(d.title).slice(0, 120), sub: (d.author_name || []).slice(0, 2).join(', ').slice(0, 80), img: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '', ano: d.first_publish_year || 0 });
const gerar = async a => { const C = {}, todos = new Map();
  for (const [k, , subj] of CATS) { if (!subj) continue; const L = []; for (const s of subj.split('|')) { try { (await busca(s, a, k === 'classico')).forEach(d => { if (!L.some(x => x.key === d.key)) L.push(d); }); } catch (e) { } await sleep(250); }
    C[k] = L.slice(0, 6).map(item); if (k !== 'classico') L.slice(0, 6).forEach((d, i) => { const it = item(d); if (!todos.has(it.id)) todos.set(it.id, { it, s: 0 }); todos.get(it.id).s += 6 - i; }); }
  C.ano = [...todos.values()].sort((p, q) => q.s - p.s).slice(0, 8).map(x => x.it);
  return CATS.filter(([k]) => (C[k] || []).length >= 3).map(([k, n]) => ({ k, n, nom: C[k] })); };
const edicao = async a => (await lerJ(caminho(a, 'edicao.json'), null)).v;
const resultados = (cats, T) => cats.map(c => { const t = T[c.k] || {}, tot = Object.values(t).reduce((s, v) => s + v, 0);
  return { k: c.k, n: c.n, votos: tot, r: c.nom.map(x => ({ id: x.id, t: x.t, sub: x.sub || '', img: x.img, v: t[x.id] || 0, p: tot ? Math.round((t[x.id] || 0) / tot * 1000) / 10 : 0 })).sort((p, q) => q.v - p.v) }; });
let GERANDO = null;
const ver = async (a, eid) => { let ed = await edicao(a);
  if (!ed) { try { GERANDO = GERANDO || gerar(a); const cats = await GERANDO; if (cats.length >= 3) { ed = { cats, at: Date.now() }; await N.store().put(caminho(a, 'edicao.json'), Buffer.from(JSON.stringify(ed)), { overwrite: false }).catch(() => { }); ed = (await edicao(a)) || ed; } } catch (e) { } finally { GERANDO = null; } }
  if (!ed) return { ano: a, fase: 'nomeacao', cats: [], pronto: false };
  const f = fase(ed, a), mine = eid ? (await lerJ(caminho(a, 'v/' + eid + '.json'), {})).v : {}, T = (await lerJ(caminho(a, 'tally.json'), {})).v || {};
  const out = { ano: a, fase: f, cats: ed.cats, meus: mine || {}, pronto: true, ini: Date.UTC(a, 11, 1), fim: Date.UTC(a + 1, 0, 10, 23, 59), participantes: T._n || 0 };
  if (f === 'revelada') out.res = resultados(ed.cats, T); return out; };
const votar = async (a, eid, cat, id) => { const ed = await edicao(a); if (!ed) throw N.err('livros', 'Ainda não há nomeados.', 400);
  if (fase(ed, a) !== 'votacao') throw N.err('livros', 'A votação não está aberta.', 400);
  const c = ed.cats.find(x => x.k === cat); if (!c || !c.nom.some(x => x.id === id)) throw N.err('livros', 'Nomeado desconhecido.', 400);
  const s = N.store(), pv = caminho(a, 'v/' + eid + '.json'), meu = (await lerJ(pv, {})).v || {}, antes = meu[cat], novo = !Object.keys(meu).length;
  if (antes === id) return { meus: meu };
  for (let i = 0; i < 8; i++) { const { v, etag } = await lerJ(caminho(a, 'tally.json'), {}), T = v || {}; T[cat] = T[cat] || {};
    if (antes && T[cat][antes]) T[cat][antes]--; T[cat][id] = (T[cat][id] || 0) + 1; if (novo) T._n = (T._n || 0) + 1;
    try { await s.put(caminho(a, 'tally.json'), Buffer.from(JSON.stringify(T)), etag ? { ifMatch: etag } : { overwrite: false }); break; } catch (e) { if (i === 7) throw N.err('livros', 'Muita gente a votar agora. Tenta outra vez.', 503); await sleep(80 + Math.random() * 200); } }
  meu[cat] = id; await s.put(pv, Buffer.from(JSON.stringify(meu))); return { meus: meu }; };
module.exports = N.handler(async (req, res) => {
  const b = req.method === 'POST' ? await N.body(req) : {}, op = String(b.op || (req.query || {}).op || 'ver'), a = Math.max(2020, Math.min(2100, +b.ano || ano0()));
  if (N.limit(req, 'livrosaw', 120, 60e3)) return N.send(res, 429, { ok: false, msg: 'Espera um pouco.' });
  const t = await N.readToken(req).catch(() => null);
  if (op === 'ver') return N.send(res, 200, Object.assign({ ok: true }, await ver(a, t ? t.a : '')));
  if (!t) return N.send(res, 401, { ok: false, msg: 'Entra na tua conta para votar.', code: 'sessao' });
  const g0 = await N.store().get('a/' + t.a); let r0 = null; try { r0 = g0 && N.open(await N.accKey(), g0.buf); } catch (e) { }
  if (!r0 || r0.uid !== t.u || (r0.tv || 1) !== t.v) return N.send(res, 401, { ok: false, msg: 'A sessão terminou. Entra outra vez.', code: 'sessao' });
  if (op === 'votar') { if (N.limit(req, 'livrosv|' + t.a, 60, 3600e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados votos seguidos.' }); return N.send(res, 200, Object.assign({ ok: true }, await votar(a, t.a, String(b.cat || ''), String(b.id || '')))); }
  if (op === 'admin') { if (!N.isAdminEmail(r0.email)) { N.sec('admin_negado', req); return N.send(res, 403, { ok: false, msg: 'Sem acesso.' }); }
    const acao = String(b.acao || ''), s = N.store(), cur = await edicao(a);
    if (acao === 'gerar') { const cats = await gerar(a); if (cats.length < 3) return N.send(res, 502, { ok: false, msg: 'O Open Library não respondeu com livros suficientes. Tenta daqui a pouco.' }); await s.put(caminho(a, 'edicao.json'), Buffer.from(JSON.stringify(Object.assign({}, cur || {}, { cats, at: Date.now() })))); return N.send(res, 200, Object.assign({ ok: true }, await ver(a, t.a))); }
    if (!cur) return N.send(res, 400, { ok: false, msg: 'Gera primeiro os nomeados.' });
    const F = { abrir: 'votacao', fechar: 'fechada', revelar: 'revelada', auto: '' }; if (!(acao in F)) return N.send(res, 400, { ok: false, msg: 'Ação desconhecida.' });
    await s.put(caminho(a, 'edicao.json'), Buffer.from(JSON.stringify(Object.assign({}, cur, { fase: F[acao] })))); return N.send(res, 200, Object.assign({ ok: true }, await ver(a, t.a))); }
  return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
});
