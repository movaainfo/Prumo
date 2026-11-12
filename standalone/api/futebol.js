// PRUMO · resultados de futebol (função do Vercel). Plano B para quando o aparelho não consegue ler diretamente a API pública
// da ESPN (por exemplo, se a ESPN recusar o pedido do navegador): pede o mesmo endereço do lado do servidor e devolve o JSON,
// com cache curta na CDN (os jogos ao vivo mudam a cada minuto, por isso 15 s; as tabelas 5 min; a pesquisa 1 h).
// Segurança: só endereços de futebol da ESPN (site.api.espn.com/apis/.../sports/soccer/, site.web.api.espn.com/apis/search/v2 e os símbolos das ligas em sports.core.api.espn.com),
// Jogos grátis em canais oficiais do YouTube (?yt=1): lê só o feed público dos canais da lista YT (nada de endereços vindos de fora),
// para a app tocar a transmissão oficial dentro do jogo.
// só GET, só a própria app, no máximo 10 s e 3 MB por pedido e 600 pedidos por minuto por endereço (abrir o Futebol pela primeira vez faz muitos pedidos de uma vez). Não guarda nada.
'use strict';
const OK = /^https:\/\/(oceanum|nautilo|prumo)(-[a-z0-9-]+)?\.vercel\.app$/, HITS = new Map();
const ALLOW = /^https:\/\/(site\.api\.espn\.com\/apis\/(site\/v2|v2)\/sports\/soccer\/[a-z0-9._-]+\/[a-z0-9/._-]*(\?[a-zA-Z0-9=&%._:-]*)?|site\.web\.api\.espn\.com\/apis\/search\/v2\?[a-zA-Z0-9=&%._+~:-]*|sports\.core\.api\.espn\.com\/v2\/sports\/soccer\/leagues\/[a-z0-9._-]+(\?[a-zA-Z0-9=&%._:-]*)?)$/;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
// canais oficiais com jogos de graça no YouTube (com os direitos de transmissão): nome a mostrar → id do canal
const YT = [['CazéTV', 'UCZiYbVptd3PVPf4f6eR6UaQ']], YTF = () => process.env.YT_FEED || 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const unx = t => String(t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const ytList = async () => { const out = []; await Promise.all(YT.map(async ([nm, id]) => { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000);
  try { const r = await fetch(YTF() + id, { headers: { 'user-agent': UA, accept: 'application/atom+xml,text/xml' }, signal: ac.signal }); if (!r.ok) return; const x = (await r.text()).slice(0, 2e6);
    (x.match(/<entry>[\s\S]*?<\/entry>/g) || []).slice(0, 30).forEach(e => { const v = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1], t = (e.match(/<title>([^<]{1,300})<\/title>/) || [])[1], at = (e.match(/<published>([^<]{10,40})<\/published>/) || [])[1];
      if (v && t) out.push({ id: v, t: unx(t), at: at || '', ch: nm }); }); } catch (e) { } finally { clearTimeout(to); } })); return out; };
const ttl = u => /sports\.core/.test(u) ? 86400 : /\/summary\?|\/scoreboard$/.test(u) ? 15 : /\/scoreboard\?/.test(u) ? 120 : /\/schedule/.test(u) ? 120 : /\/standings/.test(u) ? 300 : 3600;
module.exports = async (req, res) => {
  const origin = req.headers.origin || '', ref = req.headers.referer || '', site = req.headers['sec-fetch-site'] || '';
  const mine = OK.test(origin) || (!origin && (site === 'same-origin' || OK.test((ref.match(/^https:\/\/[^/]+/) || [''])[0])));
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (origin && OK.test(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (req.method !== 'GET' || !mine) { res.statusCode = 403; return res.end('{"ok":false}'); }
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim(), now = Date.now(), h = (HITS.get(ip) || []).filter(t => now - t < 60000);
  h.push(now); HITS.set(ip, h); if (HITS.size > 3000) HITS.delete(HITS.keys().next().value);
  if (h.length > 600) { res.statusCode = 429; return res.end('{"ok":false,"msg":"demasiados pedidos"}'); }
  const q = req.query || {}, u = String(Array.isArray(q.u) ? q.u[0] : q.u || '');
  if (q.yt) { const v = await ytList(); res.statusCode = 200; res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=90, stale-while-revalidate=300'); return res.end(JSON.stringify({ ok: true, v })); }
  if (u.length > 600 || !ALLOW.test(u) || /\.\.|%2e%2e|@|\\/i.test(u)) { res.statusCode = 400; return res.end('{"ok":false,"msg":"endereço não permitido"}'); }
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/json' }, redirect: 'error', signal: ac.signal });
    const len = +(r.headers.get('content-length') || 0); if (len > 3e6) { res.statusCode = 502; return res.end('{"ok":false,"msg":"resposta grande demais"}'); }
    const txt = await r.text(); if (txt.length > 3e6) { res.statusCode = 502; return res.end('{"ok":false,"msg":"resposta grande demais"}'); }
    try { JSON.parse(txt); } catch (e) { res.statusCode = 502; return res.end('{"ok":false,"msg":"a ESPN não respondeu com dados"}'); }
    res.statusCode = r.ok ? 200 : r.status; if (r.ok) res.setHeader('Cache-Control', `public, max-age=${Math.min(ttl(u), 60)}, s-maxage=${ttl(u)}, stale-while-revalidate=${ttl(u) * 4}`);
    return res.end(txt);
  } catch (e) { res.statusCode = 504; return res.end('{"ok":false,"msg":"a ESPN não respondeu a tempo"}'); }
  finally { clearTimeout(to); }
};
