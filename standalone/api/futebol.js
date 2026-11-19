// PRUMO · resultados de futebol (função do Vercel). Plano B para quando o aparelho não consegue ler diretamente a API pública
// da ESPN (por exemplo, se a ESPN recusar o pedido do navegador): pede o mesmo endereço do lado do servidor e devolve o JSON,
// com cache curta na CDN (os jogos ao vivo mudam a cada minuto, por isso 15 s; as tabelas 5 min; a pesquisa 1 h).
// Segurança: só endereços de desporto da ESPN (site.api.espn.com/apis/.../sports/soccer|basketball|football|baseball|hockey|racing|tennis|mma|golf/, site.web.api.espn.com/apis/search/v2 e os símbolos das ligas em sports.core.api.espn.com),
// Jogos grátis em canais oficiais do YouTube (?yt=1): lê só o feed público dos canais da lista YT (nada de endereços vindos de fora),
// para a app tocar a transmissão oficial dentro do jogo.
// Ao vivo no mundo (?vivo=1&d=AAAAMMDD): todos os jogos do dia da ESPN (soccer/all), compactados (de ~700 KB para ~40 KB) com quem marcou,
// quem deu a assistência e os cartões. As assistências vêm do resumo de cada jogo, lido só quando há golo novo (memória da função).
// só GET, só a própria app, no máximo 10 s e 3 MB por pedido e 600 pedidos por minuto por endereço (abrir o Futebol pela primeira vez faz muitos pedidos de uma vez). Não guarda nada.
'use strict';
const OK = /^https:\/\/(oceanum|nautilo|prumo)(-[a-z0-9-]+)?\.vercel\.app$/, HITS = new Map();
const ALLOW = /^https:\/\/(site\.api\.espn\.com\/apis\/(site\/v2|v2)\/sports\/(soccer|basketball|football|baseball|hockey|racing|tennis|mma|golf)\/[a-z0-9._-]+\/[a-z0-9/._-]*(\?[a-zA-Z0-9=&%._:-]*)?|site\.web\.api\.espn\.com\/apis\/search\/v2\?[a-zA-Z0-9=&%._+~:-]*|sports\.core\.api\.espn\.com\/v2\/sports\/soccer\/leagues\/[a-z0-9._-]+(\?[a-zA-Z0-9=&%._:-]*)?)$/;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
// canais oficiais com jogos de graça no YouTube (com os direitos de transmissão): nome a mostrar → id do canal
const YT = [['CazéTV', 'UCZiYbVptd3PVPf4f6eR6UaQ']], YTF = () => process.env.YT_FEED || 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const unx = t => String(t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const ytList = async () => { const out = []; await Promise.all(YT.map(async ([nm, id]) => { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000);
  try { const r = await fetch(YTF() + id, { headers: { 'user-agent': UA, accept: 'application/atom+xml,text/xml' }, signal: ac.signal }); if (!r.ok) return; const x = (await r.text()).slice(0, 2e6);
    (x.match(/<entry>[\s\S]*?<\/entry>/g) || []).slice(0, 30).forEach(e => { const v = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1], t = (e.match(/<title>([^<]{1,300})<\/title>/) || [])[1], at = (e.match(/<published>([^<]{10,40})<\/published>/) || [])[1];
      if (v && t) out.push({ id: v, t: unx(t), at: at || '', ch: nm }); }); } catch (e) { } finally { clearTimeout(to); } })); return out; };
// ---------- ao vivo no mundo ----------
const ES = () => process.env.ESPN_SITE || 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
// número da liga na ESPN → nome curto (para o app mostrar o nome em português e o símbolo); as que faltam aprendem-se pelo resumo do jogo
const LID = {"606":"fifa.world","630":"bra.1","700":"eng.1","710":"fra.1","715":"por.1","720":"ger.1","725":"ned.1","730":"ita.1","735":"sco.1","740":"esp.1","745":"arg.1","750":"jpn.1","760":"mex.1","770":"usa.1","775":"uefa.champions","776":"uefa.europa","780":"conmebol.america","781":"uefa.euro","783":"conmebol.libertadores","786":"fifa.worldq.uefa","787":"fifa.worldq.conmebol","788":"fifa.worldq.concacaf","789":"fifa.worldq.afc","790":"fifa.worldq.caf","795":"fifa.wwc","2265":"bra.camp.carioca","2272":"bra.camp.gaucho","2391":"caf.champions","2395":"uefa.nations","3901":"bel.1","3902":"afc.champions","3908":"caf.nations","3914":"eng.2","3918":"eng.fa","3920":"eng.league_cup","3922":"fifa.friendly","3946":"tur.1","3947":"uefa.euroq","3951":"esp.copa_del_rey","3952":"fra.coupe_de_france","3954":"ger.dfb_pokal","3956":"ita.coppa_italia","4004":"concacaf.gold","4007":"bra.2","5454":"conmebol.sudamericana","5462":"uefa.super_cup","5501":"fifa.cwc","5694":"fifa.world.u20","5697":"fifa.world.u17","5699":"concacaf.champions","8107":"arg.copa","8207":"bra.camp.paulista","8306":"bra.copa_do_brazil","8333":"conmebol.recopa","8376":"chn.1","10872":"bra.camp.mineiro","11088":"bra.3","18001":"bra.brasileiro_u20","19721":"bra.supercopa_do_brazil","20219":"afc.asian.cup","20296":"uefa.europa.conf","20703":"conmebol.america.femenina","20922":"por.taca.portugal"};
const SUMC = new Map(), VIVO = new Map(); // resumo por jogo { g: golos, as: [{min, who, as}] } · resposta por dia { at, j }
const getJ = async (u, ms) => { const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms || 8000);
  try { const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/json' }, redirect: 'error', signal: ac.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); const t = await r.text(); if (t.length > 4e6) throw new Error('grande demais'); return JSON.parse(t); } finally { clearTimeout(to); } };
const scS = x => x == null ? null : typeof x === 'object' ? (x.displayValue != null ? String(x.displayValue) : x.value != null ? String(x.value) : null) : String(x);
const kOf = k => k.shootout ? '' : k.scoringPlay ? (k.ownGoal || /own/i.test((k.type && k.type.text) || '') ? 'og' : 'g') : k.redCard || /red/i.test((k.type && k.type.text) || '') ? 'r' : k.yellowCard || /yellow/i.test((k.type && k.type.text) || '') ? 'y' : '';
const cmp = e => { const c = (e.competitions || [])[0] || {}, s = c.status || e.status || {}, ty = s.type || {}, cp = c.competitors || [];
  const side = x => x && x.team ? { id: String(x.team.id), n: x.team.displayName || x.team.name || '', sn: x.team.shortDisplayName || x.team.displayName || '', logo: x.team.logo || ((x.team.logos || [])[0] || {}).href || '', s: scS(x.score), so: x.shootoutScore != null ? String(x.shootoutScore) : null } : null;
  const h = side(cp.find(x => x.homeAway === 'home') || cp[0]), a = side(cp.find(x => x.homeAway === 'away') || cp[1]); if (!h || !a) return null;
  const lid = ((String(e.uid || c.uid || '')).match(/~l:(\d+)/) || [])[1] || '';
  const ke = (c.details || []).map(k => { const t = kOf(k); if (!t) return null; const p = (k.athletesInvolved || [])[0] || {}; const o = { t, min: (k.clock && k.clock.displayValue) || '', tid: String((k.team && k.team.id) || ''), who: p.displayName || p.shortName || '' }; if (k.penaltyKick && t === 'g') o.pen = 1; return o; }).filter(Boolean);
  return { id: String(e.id), lid, lg: LID[lid] || '', lgF: c.altGameNote || (e.season && e.season.slug ? String(e.season.slug).replace(/^\d{4}(-\d{2,4})?-/, '').replace(/-/g, ' ') : ''), d: Date.parse(e.date || c.date) || 0, st: ty.state || 'pre', sn: ty.name || '', clk: s.displayClock || '', det: ty.shortDetail || '', h, a, ven: (c.venue && c.venue.fullName) || (e.venue && e.venue.fullName) || '', ke }; };
const golos = e => e.ke.filter(k => k.t === 'g' || k.t === 'og').length;
// live=1 (o "hoje" de quem pede): junta também os jogos a decorrer do placar do dia da ESPN (o dia da ESPN é o de Nova Iorque:
// um jogo que começou antes da meia-noite de quem vê continua na lista depois da meia-noite)
const vivo = async (d, live) => { const ck = d + (live ? 'L' : ''), c = VIVO.get(ck); if (c && Date.now() - c.at < (+process.env.ESPN_VIVO_MS || 10000)) return c.j;
  const [j, j0] = await Promise.all([getJ(ES() + 'all/scoreboard?limit=500' + (d ? '&dates=' + d : ''), 9000), live && d ? getJ(ES() + 'all/scoreboard?limit=500', 9000).catch(() => null) : null]);
  const raw = (j.events || []).slice(); if (j0) { const ids = new Set(raw.map(e => String(e.id))); (j0.events || []).forEach(e => { const st = (((e.competitions || [])[0] || {}).status || e.status || {}).type || {}; if (st.state === 'in' && !ids.has(String(e.id))) raw.push(e); }); }
  const ev = raw.map(cmp).filter(Boolean).slice(0, 400), now = Date.now();
  // resumos a ler: jogos com golo novo (ao vivo ou acabados há menos de 4 h) e um jogo por cada liga que ainda não se conhece
  const lidNeed = new Set(), need = ev.filter(e => { const g = golos(e), m = SUMC.get(e.id), hot = e.st === 'in' || (e.st === 'post' && now - e.d < 6 * 36e5);
    if (g && hot && (!m || m.g !== g)) return true; if (!e.lg && e.lid && !LID[e.lid] && !lidNeed.has(e.lid) && e.st !== 'pre') { lidNeed.add(e.lid); return !m; } return false; }).slice(0, 24);
  let i = 0; await Promise.all(Array.from({ length: Math.min(6, need.length) }, async () => { while (i < need.length) { const e = need[i++];
    try { const S = await getJ(ES() + 'all/summary?event=' + e.id, 6000), L = (S.header && S.header.league) || {};
      if (L.slug && L.id && /^[a-z0-9._-]{2,40}$/.test(L.slug)) LID[String(L.id)] = L.slug;
      const as = (S.keyEvents || []).filter(k => k.scoringPlay && !k.shootout).map(k => { const P = (k.participants || []).map(p => p && p.athlete && p.athlete.displayName).filter(Boolean); return { min: (k.clock && k.clock.displayValue) || '', who: P[0] || '', as: /own/i.test(JSON.stringify(k.type || '')) ? '' : P[1] || '' }; });
      SUMC.set(e.id, { g: golos(e), as, at: Date.now() }); } catch (x) { } } }));
  if (SUMC.size > 600) [...SUMC.keys()].slice(0, SUMC.size - 500).forEach(k => SUMC.delete(k));
  ev.forEach(e => { if (!e.lg && LID[e.lid]) e.lg = LID[e.lid]; const m = SUMC.get(e.id); if (!m) return; const used = new Set();
    e.ke.forEach(k => { if (k.t !== 'g' && k.t !== 'og') return; const ix = m.as.findIndex((x, n) => !used.has(n) && x.min === k.min && (!k.who || !x.who || x.who === k.who)); if (ix < 0) return; used.add(ix); if (m.as[ix].as && k.t === 'g') k.as = m.as[ix].as; if (!k.who) k.who = m.as[ix].who; }); });
  const out = { ok: true, at: now, d: (j.day && j.day.date) || '', ev };
  VIVO.set(ck, { at: Date.now(), j: out }); if (VIVO.size > 20) VIVO.delete(VIVO.keys().next().value); return out; };
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
  if (q.vivo) { const d = String(q.d || ''); if (d && !/^20\d{6}$/.test(d)) { res.statusCode = 400; return res.end('{"ok":false,"msg":"data inválida"}'); }
    try { const o = await vivo(d, !!q.live); res.statusCode = 200; res.setHeader('Cache-Control', 'public, max-age=8, s-maxage=12, stale-while-revalidate=30'); return res.end(JSON.stringify(o)); }
    catch (e) { res.statusCode = 504; return res.end('{"ok":false,"msg":"a ESPN não respondeu a tempo"}'); } }
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
