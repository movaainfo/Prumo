// PRUMO · Animes: a base do MyAnimeList (Jikan) pelo servidor do Prumo. Quando o Jikan falha ou demora, responde na mesma
// (com "data": null) em vez de deixar o navegador com erros de CORS; guarda na CDN (temas e fichas 7 dias, listas 6 horas).
// Segurança: só endereços do Jikan da lista abaixo (sem endereços vindos de fora), só GET, só a própria app, 8 s por pedido.
'use strict';
const OK = /^https:\/\/(oceanum|nautilo|prumo)(-[a-z0-9-]+)?\.vercel\.app$/, HITS = new Map();
const ALLOW = /^(anime\?[a-zA-Z0-9=&%._+~:-]{1,300}|anime\/\d{1,8}\/(themes|full)|seasons\/\d{4}\/(winter|spring|summer|fall)(\?[a-z0-9=&]{0,60})?|top\/anime(\?[a-z0-9=&]{0,80})?)$/;
const BASE = () => process.env.JIKAN_BASE || 'https://api.jikan.moe/v4/';
module.exports = async (req, res) => {
  const origin = req.headers.origin || '', ref = req.headers.referer || '', site = req.headers['sec-fetch-site'] || '';
  const mine = OK.test(origin) || (!origin && (site === 'same-origin' || OK.test((ref.match(/^https:\/\/[^/]+/) || [''])[0])));
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' || !mine) { res.statusCode = 403; return res.end('{"ok":false}'); }
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim(), now = Date.now(), h = (HITS.get(ip) || []).filter(t => now - t < 60000);
  h.push(now); HITS.set(ip, h); if (HITS.size > 3000) HITS.delete(HITS.keys().next().value);
  if (h.length > 120) { res.statusCode = 429; return res.end('{"ok":false,"msg":"demasiados pedidos"}'); }
  const q = req.query || {}, p = String(Array.isArray(q.p) ? q.p[0] : q.p || '');
  if (!ALLOW.test(p) || /\.\.|%2e%2e|@|\\/i.test(p)) { res.statusCode = 400; return res.end('{"ok":false,"msg":"endereço não permitido"}'); }
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000), long = /\/(themes|full)$/.test(p);
  try { const r = await fetch(BASE() + p, { headers: { accept: 'application/json', 'user-agent': 'Prumo/1.0' }, redirect: 'error', signal: ac.signal }); const t = await r.text();
    if (!r.ok || t.length > 3e6) throw new Error('Jikan ' + r.status); JSON.parse(t);
    res.statusCode = 200; res.setHeader('Cache-Control', `public, max-age=600, s-maxage=${long ? 604800 : 21600}, stale-while-revalidate=86400`); return res.end(t); }
  catch (e) { res.statusCode = 200; res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60'); return res.end(JSON.stringify({ data: null, err: String((e && e.message) || 'erro').slice(0, 80) })); }
  finally { clearTimeout(to); }
};
