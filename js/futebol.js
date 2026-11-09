/* PRUMO — Futebol (Visão Geral › Futebol, página #futebol), para todas as contas.
   Segue qualquer equipa, seleção ou campeonato do mundo (pesquisa pelo nome, em português ou em inglês): jogos ao vivo com o minuto,
   resultados, próximos jogos, tabelas com a tua equipa destacada, o detalhe de cada jogo (golos, cartões, estatísticas)
   e avisos de início, golos, intervalo e fim. Dados: API pública da ESPN (sem chave), lida diretamente no aparelho.
   Os avisos chegam com o app aberto (no computador e no Android também em segundo plano). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, V = OS.views;
UI.IP.ball = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.6l3.3 2.4-1.3 3.9h-4l-1.3-3.9zM12 3v4.6M15.3 10l4.5-1.3M14 13.9l2.6 3.9M10 13.9l-2.6 3.9M8.7 10L4.2 8.7';
if (!UI.IP.bell) UI.IP.bell = 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0';
const AV0 = { ini: 1, gol: 1, int: 0, fim: 1, comp: 0 };
OS.ONE_DEF.fut = { teams: [], comps: [], av: Object.assign({}, AV0) };
const st = () => { const s = OS.one('fut'); if (!Array.isArray(s.teams)) s.teams = []; if (!Array.isArray(s.comps)) s.comps = []; return s; };
const save = o => OS.setOne('fut', o), av = () => Object.assign({}, AV0, st().av || {});
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- nomes em português ---------- */
const LG = { 'bra.1': 'Brasileirão', 'bra.2': 'Brasileirão Série B', 'bra.3': 'Brasileirão Série C', 'bra.copa_do_brazil': 'Copa do Brasil', 'bra.supercopa_do_brazil': 'Supercopa do Brasil', 'bra.camp.carioca': 'Campeonato Carioca', 'bra.camp.paulista': 'Paulistão', 'bra.camp.mineiro': 'Campeonato Mineiro', 'bra.camp.gaucho': 'Gauchão',
  'conmebol.libertadores': 'Libertadores', 'conmebol.sudamericana': 'Sul-Americana', 'conmebol.recopa': 'Recopa Sul-Americana', 'conmebol.america': 'Copa América',
  'por.1': 'Liga Portugal', 'por.2': 'Liga Portugal 2', 'por.taca.portugal': 'Taça de Portugal',
  'eng.1': 'Premier League', 'eng.2': 'Championship', 'eng.fa': 'Taça de Inglaterra', 'eng.league_cup': 'Taça da Liga inglesa', 'esp.1': 'LaLiga', 'esp.copa_del_rey': 'Taça do Rei', 'ita.1': 'Serie A italiana', 'ita.coppa_italia': 'Taça de Itália',
  'ger.1': 'Bundesliga', 'ger.dfb_pokal': 'Taça da Alemanha', 'fra.1': 'Ligue 1', 'fra.coupe_de_france': 'Taça de França', 'ned.1': 'Eredivisie', 'bel.1': 'Liga belga', 'tur.1': 'Liga turca', 'sco.1': 'Liga escocesa',
  'arg.1': 'Liga Argentina', 'arg.copa': 'Taça da Argentina', 'usa.1': 'MLS', 'mex.1': 'Liga MX', 'sau.1': 'Liga saudita',
  'uefa.champions': 'Liga dos Campeões', 'uefa.europa': 'Liga Europa', 'uefa.europa.conf': 'Liga Conferência', 'uefa.super_cup': 'Supertaça Europeia', 'uefa.nations': 'Liga das Nações', 'uefa.euro': 'Euro', 'uefa.euroq': 'Qualificação do Euro',
  'fifa.world': 'Campeonato do Mundo', 'fifa.friendly': 'Jogos amigáveis', 'fifa.cwc': 'Mundial de Clubes', 'fifa.worldq.conmebol': 'Qualificação do Mundial · América do Sul', 'fifa.worldq.uefa': 'Qualificação do Mundial · Europa',
  'fifa.worldq.concacaf': 'Qualificação do Mundial · CONCACAF', 'fifa.worldq.afc': 'Qualificação do Mundial · Ásia', 'fifa.worldq.caf': 'Qualificação do Mundial · África', 'concacaf.gold': 'Gold Cup', 'caf.nations': 'Taça das Nações Africanas',
  'afc.asian.cup': 'Taça Asiática', 'afc.champions': 'Liga dos Campeões da Ásia', 'concacaf.champions': 'Taça dos Campeões da CONCACAF', 'caf.champions': 'Liga dos Campeões africana', 'jpn.1': 'J1 League (Japão)', 'chn.1': 'Superliga chinesa',
  'fifa.wwc': 'Mundial feminino', 'conmebol.america.femenina': 'Copa América feminina', 'fifa.world.u20': 'Mundial Sub-20', 'fifa.world.u17': 'Mundial Sub-17', 'bra.brasileiro_u20': 'Brasileirão Sub-20' };
const lgN = (s, f) => LG[s] || f || (typeof TB !== 'undefined' && TB[s] && TB[s].name) || (typeof CM !== 'undefined' && CM[s] && CM[s].name) || s || '';
// seleções: o nome escrito em português leva à seleção certa (a ESPN usa os nomes em inglês)
const CTYD = { Brazil: 'Brasil', Portugal: 'Portugal', Argentina: 'Argentina', Germany: 'Alemanha', Spain: 'Espanha', France: 'França', England: 'Inglaterra', Italy: 'Itália', Netherlands: 'Países Baixos', Belgium: 'Bélgica', Croatia: 'Croácia', Switzerland: 'Suíça', Scotland: 'Escócia', Wales: 'País de Gales',
  'Republic of Ireland': 'Irlanda', Ireland: 'Irlanda', 'Northern Ireland': 'Irlanda do Norte', Denmark: 'Dinamarca', Sweden: 'Suécia', Norway: 'Noruega', Poland: 'Polónia', Turkey: 'Turquia', 'Türkiye': 'Turquia', Greece: 'Grécia', Austria: 'Áustria', Ukraine: 'Ucrânia', Serbia: 'Sérvia', Czechia: 'Chéquia', 'Czech Republic': 'Chéquia', Hungary: 'Hungria', Romania: 'Roménia', Russia: 'Rússia', Iceland: 'Islândia', Slovakia: 'Eslováquia', Slovenia: 'Eslovénia', Albania: 'Albânia', Georgia: 'Geórgia',
  Uruguay: 'Uruguai', Colombia: 'Colômbia', Chile: 'Chile', Paraguay: 'Paraguai', Ecuador: 'Equador', Peru: 'Peru', Bolivia: 'Bolívia', Venezuela: 'Venezuela', Mexico: 'México', 'United States': 'Estados Unidos', USA: 'Estados Unidos', Canada: 'Canadá', 'Costa Rica': 'Costa Rica', Panama: 'Panamá', Jamaica: 'Jamaica', Honduras: 'Honduras',
  Japan: 'Japão', 'South Korea': 'Coreia do Sul', 'Korea Republic': 'Coreia do Sul', 'China PR': 'China', China: 'China', Australia: 'Austrália', 'Saudi Arabia': 'Arábia Saudita', Qatar: 'Catar', Iran: 'Irão', Iraq: 'Iraque', Jordan: 'Jordânia', Uzbekistan: 'Usbequistão',
  Morocco: 'Marrocos', Senegal: 'Senegal', Egypt: 'Egito', Nigeria: 'Nigéria', Ghana: 'Gana', Cameroon: 'Camarões', "Côte d'Ivoire": 'Costa do Marfim', 'Ivory Coast': 'Costa do Marfim', Algeria: 'Argélia', Tunisia: 'Tunísia', 'South Africa': 'África do Sul', Angola: 'Angola', 'Cape Verde': 'Cabo Verde', 'Cape Verde Islands': 'Cabo Verde', Mozambique: 'Moçambique', 'New Zealand': 'Nova Zelândia' };
const CTY = {}; Object.entries(CTYD).forEach(([en, pt]) => { const k = norm(pt); if (!CTY[k]) CTY[k] = en; });
Object.assign(CTY, { eua: 'United States', holanda: 'Netherlands', ira: 'Iran', 'republica checa': 'Czechia', 'coreia': 'South Korea', inglaterra: 'England' });
const LQ = { brasileirao: 'brazilian serie a', 'serie a brasil': 'brazilian serie a', 'serie b': 'brazilian serie b', 'brasileirao serie b': 'brazilian serie b', 'sul americana': 'sudamericana', sulamericana: 'sudamericana', 'liga dos campeoes': 'champions league', champions: 'champions league',
  'liga europa': 'europa league', 'liga conferencia': 'conference league', 'copa do mundo': 'world cup', mundial: 'world cup', 'campeonato do mundo': 'world cup', eliminatorias: 'world cup qualifying', qualificacao: 'world cup qualifying', 'qualificacao do mundial': 'world cup qualifying',
  'liga portugal': 'portuguese primeira liga', 'primeira liga': 'portuguese primeira liga', 'liga betclic': 'portuguese primeira liga', 'taca de portugal': 'taca de portugal', 'la liga': 'laliga', 'serie a': 'italian serie a', 'liga das nacoes': 'nations league', euro: 'european championship', europeu: 'european championship',
  'mundial de clubes': 'club world cup', paulistao: 'paulista', gauchao: 'gaucho', 'liga argentina': 'argentine liga', 'liga saudita': 'saudi', 'taca da liga': 'league cup', 'copa do rei': 'copa del rey', 'taca do rei': 'copa del rey' };
const tN = n => { if (!n) return ''; const m = String(n).match(/^(.*?)\s+U-?(\d{2})$/), b = m ? m[1] : String(n), p = CTYD[b] || b; return m ? p + ' Sub-' + m[2] : p; };
const NATRX = /^(fifa\.(world|friendly|worldq)|uefa\.(euro|nations)|conmebol\.america|concacaf\.gold|caf\.nations)/;
const isNat = t => !!(t && (t.nat || NATRX.test(t.lg || '') || /soccer team/i.test(t.sub || '')));
const subT = t => isNat(t) ? (/women/i.test(t.sub || '') || /femenin|women/i.test(t.lg || '') ? 'Seleção feminina' : /U-?\d{2}/.test(t.n || '') ? 'Seleção jovem' : 'Seleção') : lgN(t.lg, t.sub);

/* ---------- ESPN ---------- */
const B = 'https://site.api.espn.com/apis/site/v2/sports/soccer/', BS = 'https://site.api.espn.com/apis/v2/sports/soccer/', SR = 'https://site.web.api.espn.com/apis/search/v2';
const MEM = new Map(), INF = new Map(); let VIA = navigator.webdriver && !window.__fbTest ? Date.now() : 0; // navegadores automáticos: a ESPN recusa-os, vão logo pelo servidor
const get = (u, ttl) => { const m = MEM.get(u); if (m && Date.now() - m.at < ttl) return Promise.resolve(m.j); if (INF.has(u)) return INF.get(u);
  // primeiro direto à ESPN; se o aparelho não conseguir (rede, CORS, recusa), pelo servidor do Prumo (api/futebol), e durante 10 min vai logo por lá
  const once = async (url, o) => { const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 12000);
    try { const r = await fetch(url, Object.assign({ signal: ac ? ac.signal : undefined }, o)); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { to && clearTimeout(to); } };
  const viaApi = () => once('api/futebol?u=' + encodeURIComponent(u), { credentials: 'same-origin' });
  const p = (async () => { try { let j; if (Date.now() - VIA < 10 * 6e4) j = await viaApi();
      else { try { j = await once(u, { credentials: 'omit', cache: 'no-store' }); } catch (e) { j = await viaApi(); VIA = Date.now(); } }
      MEM.set(u, { at: Date.now(), j }); return j; }
    catch (e) { if (m) return m.j; throw e; } finally { INF.delete(u); } })();
  INF.set(u, p); return p; };
const pool = async (list, n, f) => { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await f(list[k]); } catch (e) { out[k] = null; } } })); return out; };
const img = (u, w) => u && /^https:\/\/a\.espncdn\.com\/i\//.test(u) ? u.replace('https://a.espncdn.com/i/', 'https://a.espncdn.com/combiner/i?img=/i/') + '&w=' + w + '&h=' + w : u || '';
const logoOf = t => !t ? '' : t.logo || (t.logos && t.logos[0] && t.logos[0].href) || '';
const scv = x => x == null ? null : typeof x === 'object' ? (x.displayValue != null ? x.displayValue : x.value != null ? String(x.value) : null) : String(x);
const sc0 = v => v == null || v === '' ? '0' : String(v);
const EVX = new Map(); // id → evento (para abrir o detalhe de qualquer lado)
// tipo do lance: só os golos (scoringPlay) podem ser autogolo, e só pelo tipo ("own-goal", "Own Goal"); o texto dos cartões diz "is shown"
const OWN = /\bown[- ]?goal\b|own-goal/i;
const keyOf = (type, scoring) => scoring ? (OWN.test(type) ? 'og' : 'g') : /red/i.test(type) ? 'r' : /yellow/i.test(type) ? 'y' : '';
const evN = (e, slug) => { const c = (e.competitions || [])[0] || {}, s = c.status || e.status || {}, ty = s.type || {}, cp = c.competitors || [];
  const side = x => x && x.team ? { id: String(x.team.id), n: x.team.displayName || x.team.name || '', sn: x.team.shortDisplayName || x.team.displayName || '', logo: logoOf(x.team), s: scv(x.score), so: x.shootoutScore != null ? String(x.shootoutScore) : null } : null;
  const h = cp.find(x => x.homeAway === 'home') || cp[0], a = cp.find(x => x.homeAway === 'away') || cp[1];
  const ke = (c.details || []).map(k => { const ty2 = (k.type && (k.type.text || k.type.type)) || ''; const t = keyOf(ty2, k.scoringPlay || k.ownGoal); return t ? { t, min: (k.clock && k.clock.displayValue) || '', tid: String((k.team && k.team.id) || ''), who: ((k.athletesInvolved || [])[0] || {}).displayName || '' } : null; }).filter(Boolean);
  const o = { id: String(e.id), lg: slug || (e.league && e.league.slug) || '', lgF: (e.league && (e.league.name || e.league.abbreviation)) || '', d: Date.parse(e.date || c.date), st: ty.state || 'pre', sn: ty.name || '', clk: s.displayClock || '', det: ty.shortDetail || '', h: side(h), a: side(a), ven: (c.venue && c.venue.fullName) || '' };
  if (ke.length) o.ke = ke; const old = EVX.get(o.id); if (old && old.ke && !o.ke) o.ke = old.ke; EVX.set(o.id, o); return o; };
const isHot = e => e.st === 'in' || (e.st === 'pre' && e.d - Date.now() < 15 * 6e4 && Date.now() - e.d < 3 * 36e5);
const done = e => e.st === 'post' && !/POSTPONED|CANCEL|ABANDON/.test(e.sn);

/* competições de cada equipa: a liga principal + as taças e provas continentais do país (verifica-se uma vez por dia) */
const EU = ['uefa.champions', 'uefa.europa', 'uefa.europa.conf'], SA = ['conmebol.libertadores', 'conmebol.sudamericana'];
const CUPS = { bra: ['bra.copa_do_brazil', 'bra.camp.carioca', 'bra.camp.paulista', 'bra.camp.mineiro', 'bra.camp.gaucho'].concat(SA), arg: ['arg.copa'].concat(SA), por: ['por.taca.portugal'].concat(EU), eng: ['eng.fa', 'eng.league_cup'].concat(EU), esp: ['esp.copa_del_rey'].concat(EU), ita: ['ita.coppa_italia'].concat(EU), ger: ['ger.dfb_pokal'].concat(EU), fra: ['fra.coupe_de_france'].concat(EU) };
const SAc = ['uru', 'col', 'chi', 'par', 'ecu', 'per', 'bol', 'ven'], EUc = ['ned', 'bel', 'tur', 'sco', 'aut', 'sui', 'gre', 'den', 'nor', 'swe', 'cze', 'cro', 'srb', 'ukr', 'pol', 'rou', 'hun', 'isr', 'cyp', 'bul', 'svk', 'svn', 'rus'];
const NAT = ['fifa.world', 'fifa.friendly', 'fifa.worldq.conmebol', 'fifa.worldq.uefa', 'fifa.worldq.concacaf', 'fifa.worldq.afc', 'fifa.worldq.caf', 'uefa.nations', 'uefa.euro', 'uefa.euroq', 'conmebol.america'];
const cands = t => { if (isNat(t)) return [...new Set([t.lg].concat(NAT).filter(Boolean))]; const cc = (t.lg || '').split('.')[0]; return [...new Set([t.lg].concat(CUPS[cc] || (SAc.includes(cc) ? SA : EUc.includes(cc) ? EU : []), ['fifa.cwc']).filter(Boolean))]; };
const DK = 'oc_fut_lg', SK = 'oc_fut_snap';
let DISC = U.ls.get(DK, {}) || {}, SNAP = U.ls.get(SK, {}) || {};
const TM = {}, CM = {}, TB = {};
const tmOf = id => TM[id] || SNAP[id] || null;
const loadTeam = async (t, force) => { if (!force && TM[t.id] && Date.now() - TM[t.id].at < 5 * 6e4) return TM[t.id];
  const d = DISC[t.id], fresh = d && Date.now() - d.at < 12 * 36e5 && d.lg && d.lg.length, slugs = fresh ? d.lg : cands(t), now = Date.now();
  const R = await pool(slugs, 4, async s => { const [a, b] = await Promise.all([get(B + s + '/teams/' + t.id + '/schedule', 4 * 6e4).catch(() => null), get(B + s + '/teams/' + t.id + '/schedule?fixture=true', 4 * 6e4).catch(() => null)]);
    if (!a && !b) return null; const ev = [].concat((a && a.events) || [], (b && b.events) || []).map(e => evN(e, s)).filter(e => e.h && e.a && e.d > now - 200 * 864e5 && e.d < now + 400 * 864e5); return { s, ev, team: (a && a.team) || (b && b.team) }; });
  const ok = R.filter(Boolean); if (!ok.length) { if (tmOf(t.id)) return tmOf(t.id); throw new Error('sem ligação à ESPN'); }
  const map = new Map(); ok.forEach(o => o.ev.forEach(e => { const old = TM[t.id] && TM[t.id].ev.find(x => x.id === e.id); if (old && old.st === 'in' && e.st === 'pre') return map.set(e.id, old); map.set(e.id, e); }));
  const ev = [...map.values()].sort((x, y) => x.d - y.d), comps = ok.filter(o => o.ev.length).map(o => o.s), tm = (ok.find(o => o.team) || {}).team || {};
  if (!fresh) { DISC[t.id] = { at: now, lg: comps.length ? comps : [t.lg] }; U.ls.set(DK, DISC); }
  const m = TM[t.id] = { at: Date.now(), ev, comps: comps.length ? comps : [t.lg], col: tm.color || t.col || '', logo: logoOf(tm) || t.logo };
  SNAP[t.id] = { at: m.at, ev: ev.filter(e => e.d > Date.now() - 45 * 864e5).slice(0, 40), comps: m.comps, col: m.col, logo: m.logo }; U.ls.set(SK, SNAP); return m; };
const keyEv = j => (j.keyEvents || []).map(k => { const ty = (k.type && (k.type.type || k.type.text)) || '', t = keyOf(ty, k.scoringPlay); if (!t) return null;
  return { t, min: (k.clock && k.clock.displayValue) || '', tid: String((k.team && k.team.id) || ''), who: ((k.participants || []).map(p => p.athlete && p.athlete.displayName).filter(Boolean))[0] || '' }; }).filter(Boolean);
const SUM = {};
const liveEv = async (e, ttl) => { const j = await get(B + e.lg + '/summary?event=' + e.id, ttl || 2e4); const hc = j && j.header && j.header.competitions && j.header.competitions[0]; if (!hc) return e;
  const ids = (hc.competitors || []).map(x => String(x.team && x.team.id)); if (e.h && e.a && !(ids.includes(e.h.id) && ids.includes(e.a.id))) return e;
  const n = evN({ id: e.id, date: hc.date || new Date(e.d).toISOString(), competitions: [hc] }, e.lg); n.lgF = e.lgF; n.ven = n.ven || e.ven; n.ke = keyEv(j); SUM[e.id] = { at: Date.now(), j };
  Object.assign(e, n); Object.values(TM).forEach(m => m.ev.forEach(x => { if (x.id === e.id && x !== e) Object.assign(x, n); })); Object.values(CM).forEach(m => ['ev', 'next', 'prev'].forEach(k => (m[k] || []).forEach(x => { if (x.id === e.id && x !== e) Object.assign(x, n); }))); EVX.set(e.id, e); return e; };
const loadComp = async (slug, force) => { const m = CM[slug], hot = m && m.ev.some(isHot); if (!force && m && Date.now() - m.at < (hot ? 25e3 : 5 * 6e4)) return m;
  const sb = await get(B + slug + '/scoreboard', hot ? 2e4 : 4 * 6e4), L = (sb.leagues || [])[0] || {}, ev = (sb.events || []).map(e => evN(e, slug)).filter(e => e.h && e.a).sort((a, b) => a.d - b.d);
  const day = (sb.day && sb.day.date) || U.today(), cal = (L.calendar || []).map(x => typeof x === 'string' ? x : x && (x.startDate || x.value) || '').filter(Boolean).map(x => x.slice(0, 10)).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  const nx = cal.find(x => x > day), pv = [...cal].reverse().find(x => x < day);
  const ex = await Promise.all([nx, pv].map(x => x ? get(B + slug + '/scoreboard?dates=' + x.replace(/-/g, ''), 10 * 6e4).then(j => (j.events || []).map(e => evN(e, slug)).filter(e => e.h && e.a).sort((a, b) => a.d - b.d)).catch(() => []) : Promise.resolve([])));
  if (darkOf(L.logos)) LOGO[slug] = LOGO[slug] || darkOf(L.logos);
  return CM[slug] = { at: Date.now(), name: L.name || '', logo: darkOf(L.logos) || logoOf(L), season: (L.season && L.season.displayName) || '', ev, next: ex[0], prev: ex[1] }; };
const loadTable = async slug => { const j = await get(BS + slug + '/standings', 10 * 6e4); const G = (j.children && j.children.length ? j.children : [j]);
  const groups = G.map(g => ({ name: g.name || '', rows: (((g.standings || {}).entries) || []).map(r => { const S = {}; (r.stats || []).forEach(x => { S[x.name || x.type] = x; }); const v = k => S[k] ? (S[k].value != null ? +S[k].value : U.num(S[k].displayValue) || 0) : 0;
    return { id: String(r.team.id), n: r.team.displayName || '', sn: r.team.shortDisplayName || r.team.displayName || '', logo: logoOf(r.team), pos: v('rank'), j: v('gamesPlayed'), v: v('wins'), e: v('ties'), d: v('losses'), gm: v('pointsFor'), gs: v('pointsAgainst'), dg: v('pointDifferential'), pts: v('points'), note: r.note && r.note.color ? { c: r.note.color, t: r.note.description || '' } : null }; })
    .sort((a, b) => (a.pos || 99) - (b.pos || 99) || b.pts - a.pts || b.dg - a.dg) })).filter(g => g.rows.length);
  groups.forEach(g => g.rows.forEach((r, i) => { if (!r.pos) r.pos = i + 1; })); TB[slug] = { at: Date.now(), groups, name: j.name || '' }; return TB[slug]; };

/* carregamentos pedidos pelo ecrã (sem repetir em ciclo: cada coisa só volta a pedir quando fica velha) */
// redesenhar sem estragar a pesquisa: enquanto escreves no campo de procurar, o ecrã espera (e redesenha quando sais do campo)
let pendR = false;
const req = () => { const a = document.activeElement; if (a && a.dataset && a.dataset.fbq) { pendR = true; return; } OS.request(); };
document.addEventListener('focusout', e => { if (e.target && e.target.dataset && e.target.dataset.fbq && pendR) { pendR = false; setTimeout(() => OS.request(), 150); } });
const TRY = {}, ERR = {}, PEND = new Set();
const ensure = (k, isStale, f) => { if (!isStale() || PEND.has(k) || (TRY[k] && Date.now() - TRY[k] < 15e3)) return; TRY[k] = Date.now(); PEND.add(k);
  f().then(() => { delete ERR[k]; }).catch(e => { ERR[k] = (e && e.message) || 'erro'; }).finally(() => { PEND.delete(k); if (/^#futebol/.test(location.hash)) req(); }); };
const needTeam = t => ensure('t' + t.id, () => !TM[t.id] || Date.now() - TM[t.id].at > (TM[t.id].ev.some(isHot) ? 3e4 : 5 * 6e4), () => loadTeam(t).then(m => pool(m.ev.filter(isHot), 2, e => liveEv(e))));
const needComp = s => ensure('c' + s, () => !CM[s] || Date.now() - CM[s].at > (CM[s].ev.some(isHot) ? 3e4 : 5 * 6e4), () => loadComp(s));
const needTable = s => ensure('b' + s, () => !TB[s] || Date.now() - TB[s].at > 10 * 6e4, () => loadTable(s));
const needSum = e => ensure('s' + e.id, () => !SUM[e.id] || Date.now() - SUM[e.id].at > (e.st === 'in' ? 3e4 : 30 * 6e4), () => liveEv(e, e.st === 'in' ? 2e4 : 30 * 6e4));

/* ---------- ao vivo e avisos ---------- */
const SEEN = U.ls.get('oc_fut_seen', {}) || {};
const saveSeen = () => { const lim = Date.now() - 3 * 864e5; Object.keys(SEEN).forEach(k => { if ((SEEN[k].at || 0) < lim) delete SEEN[k]; }); U.ls.set('oc_fut_seen', SEEN); };
const FEED = U.ls.get('oc_fut_feed', []) || [];
const say = (title, body, e) => { FEED.unshift({ at: Date.now(), title, body, id: e.id, lg: e.lg }); FEED.splice(15); U.ls.set('oc_fut_feed', FEED); UI.toast(title + ' · ' + body, 'pos');
  try { if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icon-192.png', tag: 'fb-' + e.id + '-' + title, data: { url: '#futebol' } })).catch(() => { }); } catch (x) { } };
const watch = (e, mine) => { if (!e.h || !e.a) return; const p = SEEN[e.id], c = { s: sc0(e.h.s) + '-' + sc0(e.a.s), st: e.st, sn: e.sn, at: Date.now() }; SEEN[e.id] = c;
  const a = av(); if (!p || (!mine && !a.comp)) return; const vs = `${tN(e.h.sn)} ${sc0(e.h.s)}-${sc0(e.a.s)} ${tN(e.a.sn)}`;
  if (p.st === 'pre' && c.st === 'in' && a.ini) say('Começou', `${tN(e.h.n)} × ${tN(e.a.n)} · ${lgN(e.lg, e.lgF)}`, e);
  if (c.st !== 'pre' && p.s !== c.s && a.gol) { const [ph, pa] = p.s.split('-').map(Number), hs = U.num(e.h.s), as = U.num(e.a.s), side = hs > ph ? e.h : as > pa ? e.a : null;
    if (side) { const g = (e.ke || []).filter(k => (k.t === 'g' || k.t === 'og') && k.tid === side.id).pop() || (e.ke || []).filter(k => k.t === 'g' || k.t === 'og').pop(); say('Golo · ' + tN(side.sn), (g && g.who ? g.who + (g.t === 'og' ? ' (pb)' : '') + (g.min ? ' ' + g.min : '') + ' · ' : '') + vs, e); }
    else say('Resultado corrigido', vs, e); }
  if (p.sn !== 'STATUS_HALFTIME' && c.sn === 'STATUS_HALFTIME' && a.int) say('Intervalo', vs, e);
  if (p.st !== 'post' && c.st === 'post' && a.fim) say(/POSTPONED/.test(c.sn) ? 'Adiado' : 'Terminou', vs, e); };
const myEv = () => { const s = st(), out = new Map(); s.teams.forEach(t => { const m = tmOf(t.id); if (m) m.ev.forEach(e => { if (!out.has(e.id)) out.set(e.id, Object.assign(e, { me: e.me || t.id })); }); }); return [...out.values()].sort((a, b) => a.d - b.d); };
const liveN = () => myEv().filter(e => e.st === 'in').length;
let busy = false;
const tick = async () => { if (busy) return; busy = true; const n0 = liveN(); try { const s = st();
  await pool(s.teams, 3, t => loadTeam(t)); const hot = myEv().filter(isHot); await pool(hot, 3, e => liveEv(e));
  myEv().forEach(e => { if (Math.abs(e.d - Date.now()) < 36 * 36e5) watch(e, 1); });
  if (s.comps.length) { await pool(s.comps, 3, c => loadComp(c.slug)); s.comps.forEach(c => { const m = CM[c.slug]; if (m) m.ev.forEach(e => watch(e, s.teams.some(t => e.h && e.a && (t.id === e.h.id || t.id === e.a.id)))); }); }
  saveSeen(); } finally { busy = false; } if (/^#futebol/.test(location.hash) || liveN() !== n0) req(); };
let loopT = 0;
const soon = () => myEv().some(e => e.st === 'pre' && e.d - Date.now() < 30 * 6e4 && Date.now() - e.d < 3 * 36e5);
const anyHot = () => myEv().some(isHot) || Object.values(CM).some(m => m.ev.some(isHot));
const loop = (ms) => { clearTimeout(loopT); const s = st(); if (!s.teams.length && !s.comps.length) return; loopT = setTimeout(async () => { if (!document.hidden) { try { await tick(); } catch (e) { } } loop(); }, ms != null ? ms : anyHot() ? 3e4 : soon() ? 6e4 : 5 * 6e4); };
OS.on('ready', () => { if (navigator.webdriver && !window.__fbTest) return; loop(4000); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !(navigator.webdriver && !window.__fbTest)) loop(800); });

/* ---------- quem tem mais probabilidade de ganhar ----------
   Antes do jogo: as odds do mercado quando a ESPN as tem (ligas europeias); senão, uma estimativa feita aqui com a tabela
   (pontos e golos por jogo), a forma dos últimos 5 jogos e o fator casa. Ao vivo: parte dessa força e junta o resultado e o tempo
   que falta (golos esperados com uma distribuição de Poisson). É uma estimativa, não uma certeza. */
const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
const outc = (lh, la, gh, ga) => { let H = 0, D = 0, W = 0; for (let i = 0; i <= 10; i++) { const pi = pois(lh, i); for (let j = 0; j <= 10; j++) { const p = pi * pois(la, j), x = gh + i, y = ga + j; if (x > y) H += p; else if (x === y) D += p; else W += p; } } const t = H + D + W || 1; return [H / t, D / t, W / t]; };
const lam = (d, neu) => [(neu ? 1.3 : 1.42) * Math.exp(d), (neu ? 1.3 : 1.12) * Math.exp(-d)];
const fitD = (pH, pA, neu) => { let lo = -3, hi = 3; for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2, o = outc(...lam(m, neu), 0, 0); if (o[0] - o[2] < pH - pA) lo = m; else hi = m; } return (lo + hi) / 2; };
const ml = m => m == null || isNaN(m) || m === 0 ? null : m < 0 ? -m / (-m + 100) : 100 / (m + 100);
const minute = e => e.sn === 'STATUS_HALFTIME' ? 45 : (String(e.clk || '').match(/\d+/g) || []).reduce((a, x) => a + +x, 0);
const rate = (S, tid) => { let ppg = null, gdg = 0, form = null;
  ((S.standings && S.standings.groups) || []).forEach(g => (((g.standings || {}).entries) || []).forEach(r => { if (String(r.id || (r.team && r.team.id) || '') !== tid) return; const v = k => { const x = (r.stats || []).find(s => s.name === k); return x ? U.num(x.displayValue) : 0; }; const gp = v('gamesPlayed'); if (gp) { ppg = v('points') / gp; gdg = v('pointDifferential') / gp; } }));
  const L = (S.lastFiveGames || []).find(x => String(x.team && x.team.id) === tid); if (L && (L.events || []).length) form = L.events.reduce((a, x) => a + (x.gameResult === 'W' ? 3 : x.gameResult === 'D' ? 1 : 0), 0) / (3 * L.events.length);
  if (ppg == null && form == null) return null; return .5 * (ppg == null ? (form || .45) * 3 : ppg) / 3 + .3 * (form == null ? .45 : form) + .2 * (Math.max(-1, Math.min(1, gdg / 2)) * .5 + .5); };
const probs = e => { const S = SUM[e.id] && SUM[e.id].j; if (!S || !S.header || !e.h || !e.a || done(e) || /POSTPONED|CANCEL/.test(e.sn)) return null; const hc = (S.header.competitions || [])[0] || {}, neu = !!hc.neutralSite;
  let pre = null, src = 'modelo'; const pc = (S.pickcenter || []).find(p => p && p.homeTeamOdds && p.awayTeamOdds && p.drawOdds);
  if (pc) { const flip = pc.homeTeamOdds.teamId && String(pc.homeTeamOdds.teamId) === e.a.id, a = ml(+pc.homeTeamOdds.moneyLine), b = ml(+pc.awayTeamOdds.moneyLine), c = ml(+pc.drawOdds.moneyLine); if (a && b && c) { const t = a + b + c; pre = flip ? [b / t, c / t, a / t] : [a / t, c / t, b / t]; src = 'odds'; } }
  if (!pre) { const rh = rate(S, e.h.id), ra = rate(S, e.a.id); if (rh == null || ra == null) return null; pre = outc(...lam((rh - ra) * 1.8, neu), 0, 0); }
  if (e.st !== 'in') return { p: pre, src };
  const d = fitD(pre[0], pre[2], neu), f = Math.max(0, (95 - minute(e)) / 95), [lh, la] = lam(d, neu); return { p: outc(lh * f, la * f, U.num(e.h.s), U.num(e.a.s)), src, live: 1 }; };
const pct = x => Math.round(x * 100);
const probBar = (e, P) => { const [h, d, a] = P.p.map(pct); return `<div class="fb-pb"><div class="fb-pbt">${P.live ? 'Probabilidade de ganhar, ao vivo' : 'Quem tem mais probabilidade de ganhar'}</div>
  <div class="fb-pbb" role="img" aria-label="${esc(tN(e.h.sn))} ${h}%, empate ${d}%, ${esc(tN(e.a.sn))} ${a}%"><s class="h" style="width:${h}%"></s><s class="d" style="width:${d}%"></s><s class="a" style="width:${a}%"></s></div>
  <div class="fb-pbl"><span class="${h >= a && h >= d ? 'top' : ''}"><b>${h}%</b> ${esc(tN(e.h.sn))}</span><span class="${d > h && d > a ? 'top' : ''}"><b>${d}%</b> empate</span><span class="${a > h && a >= d ? 'top' : ''}">${esc(tN(e.a.sn))} <b>${a}%</b></span></div>
  <small>${P.src === 'odds' ? 'Pelas odds do mercado' : 'Estimativa do Prumo: tabela, forma recente e fator casa'}${P.live ? ', com o resultado e o tempo que falta' : ''}. É uma estimativa, não uma certeza.</small></div>`; };

/* ---------- jogadores: plantel (ESPN), escalações oficiais (quando saem) e prováveis (titulares dos últimos 3 jogos) ---------- */
const PG = { gr: 'Guarda-redes', def: 'Defesas', med: 'Médios', av: 'Avançados' }, PORD = { gr: 0, def: 1, med: 2, av: 3 };
const posOfP = p => { const n = ((p && (p.name || p.displayName)) || '').toLowerCase(), a = ((p && p.abbreviation) || '').toUpperCase();
  if (/goalkeeper/.test(n) || a === 'G' || a === 'GK') return 'gr'; if (/defender|back/.test(n) || /^(D|CD|CB|LB|RB|LWB|RWB)(-[LR])?$/.test(a)) return 'def'; if (/midfielder/.test(n) || /^(M|CM|DM|AM|LM|RM)(-[LR])?$/.test(a)) return 'med'; return 'av'; };
const ROS = {}, PROB = {};
const loadRoster = async t => { const j = await get(B + (t.lg || 'all') + '/teams/' + t.id + '/roster', 6 * 36e5);
  const P = (j.athletes || []).map(a => { const S = {}; (((a.statistics || {}).splits || {}).categories || []).forEach(c => (c.stats || []).forEach(x => { S[x.name] = U.num(x.displayValue); })); const inj = (a.injuries || [])[0];
    return { id: String(a.id), n: a.displayName || a.fullName || '', sn: a.shortName || a.displayName || '', num: a.jersey || '', hs: (a.headshot && a.headshot.href) || '', pos: posOfP(a.position), age: a.age || null, flag: (a.flag && a.flag.href) || '', cty: a.citizenship || '', apps: S.appearances || 0, g: S.totalGoals || 0, as: S.goalAssists || 0, inj: inj ? String(inj.status || (inj.type && inj.type.description) || 'lesionado') : '' }; });
  return ROS[t.id] = { at: Date.now(), P }; };
const needRoster = t => ensure('r' + t.id, () => !ROS[t.id] || Date.now() - ROS[t.id].at > 6 * 36e5, () => loadRoster(t));
const lineupOf = (S, tid) => { const R = ((S && S.rosters) || []).find(r => String(r.team && r.team.id) === tid); if (!R) return null; const L = R.roster || [], xi = L.filter(p => p.starter); if (xi.length < 11) return null;
  const m = p => ({ id: String((p.athlete || {}).id || ''), n: (p.athlete || {}).displayName || '', sn: (p.athlete || {}).shortName || (p.athlete || {}).displayName || '', num: p.jersey || '', pos: posOfP(p.position), fp: +p.formationPlace || 0, out: !!p.subbedOut, in: !!p.subbedIn });
  return { form: R.formation || '', xi: xi.map(m).sort((a, b) => PORD[a.pos] - PORD[b.pos] || a.fp - b.fp), subs: L.filter(p => !p.starter).map(m) }; };
const loadProbable = async (team, lg) => { let ev = (tmOf(team.id) || {}).ev;
  if (!ev) { const j = await get(B + lg + '/teams/' + team.id + '/schedule', 30 * 6e4).catch(() => null); ev = ((j && j.events) || []).map(e => evN(e, lg)).filter(e => e.h && e.a); }
  const last = ev.filter(done).sort((a, b) => b.d - a.d).slice(0, 3); if (!last.length) return PROB[team.id] = { at: Date.now(), none: 1 };
  const Ls = (await pool(last, 3, e => get(B + e.lg + '/summary?event=' + e.id, 864e5).then(j => ({ e, l: lineupOf(j, team.id) })))).filter(x => x && x.l);
  if (!Ls.length) return PROB[team.id] = { at: Date.now(), none: 1 };
  const cnt = new Map(); Ls.forEach(({ l }, k) => l.xi.forEach(p => { const c = cnt.get(p.id) || { p, n: 0, k }; c.n++; c.k = Math.min(c.k, k); cnt.set(p.id, c); }));
  let pick = [...cnt.values()].sort((a, b) => b.n - a.n || a.k - b.k); const gk = pick.find(c => c.p.pos === 'gr'); pick = [gk].concat(pick.filter(c => c !== gk && c.p.pos !== 'gr')).filter(Boolean).slice(0, 11);
  return PROB[team.id] = { at: Date.now(), form: Ls[0].l.form, xi: pick.map(c => c.p).sort((a, b) => PORD[a.pos] - PORD[b.pos] || a.fp - b.fp), n: Ls.length }; };
/* fotos dos jogadores: a da ESPN quando existe; senão a da Wikipédia (pesquisada com o nome e o clube, e só aceite se o título
   da página tiver o apelido do jogador, para não aparecer outra pessoa). Guardadas no aparelho; sem foto fica o número. */
const PH = U.ls.get('oc_fut_ph', {}) || {}, PHQ = new Set();
const phK = p => String(p.id || p.n || '');
const phOf = p => { const x = p && PH[phK(p)]; return (p && p.hs) || (x && x.u) || ''; };
const surname = n => norm(n).split(' ').filter(w => w.length > 2).pop() || norm(n);
const getW = async u => { const m = MEM.get(u); if (m && Date.now() - m.at < 30 * 864e5) return m.j; const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 10000);
  try { const r = await fetch(u, { credentials: 'omit', signal: ac ? ac.signal : undefined }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); MEM.set(u, { at: Date.now(), j }); return j; } finally { to && clearTimeout(to); } };
const wikiPh = async (p, team) => { const sn = surname(p.n); if (!sn) return '';
  for (const [L, q] of [['en', `${p.n} ${team} footballer`], ['pt', `${p.n} ${team} futebolista`], ['en', `${p.n} footballer`]]) {
    let j = null; try { j = await getW(`https://${L}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=0&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=200&gsrsearch=` + encodeURIComponent(q)); } catch (e) { return null; }
    const P = Object.values((j && j.query && j.query.pages) || {}).sort((a, b) => (a.index || 9) - (b.index || 9)), hit = P.find(x => x.thumbnail && x.thumbnail.source && norm(x.title).includes(sn)); if (hit) return hit.thumbnail.source; }
  return ''; };
const savePH = () => { const k = Object.keys(PH).sort((a, b) => (PH[b].at || 0) - (PH[a].at || 0)); k.slice(800).forEach(x => delete PH[x]); U.ls.set('oc_fut_ph', PH); };
const needPhotos = (list, team, done2) => { const miss = (list || []).filter(p => { if (!p || !p.n || p.hs || PHQ.has(phK(p))) return false; const x = PH[phK(p)]; return !x || (!x.u && Date.now() - (x.at || 0) > 14 * 864e5); }).slice(0, 40); if (!miss.length) return;
  miss.forEach(p => PHQ.add(phK(p)));
  pool(miss, 3, async p => { const u = await wikiPh(p, tN(team || '')); if (u !== null) PH[phK(p)] = { u: u || '', at: Date.now() }; else PHQ.delete(phK(p)); }).then(() => { savePH(); done2 ? done2() : req(); }); };
const phImg = (p, w, cls) => { const u = phOf(p); return u ? `<img class="fb-ph ${cls || ''}" src="${esc(u)}" alt="" width="${w}" height="${w}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''; };
const shortN = p => String(p.sn || p.n || '').replace(/^[A-ZÀ-Ý]\.\s*/, '');
const PITCHV = `<svg class="fb-xipv" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width=".8" vector-effect="non-scaling-stroke"><rect x="3" y="3" width="94" height="134"/><path d="M3 70h94"/><circle cx="50" cy="70" r="12"/><rect x="25" y="3" width="50" height="20"/><rect x="25" y="117" width="50" height="20"/></g></svg>`;
const xiBox = (L, side, label, coach, lg) => { needPhotos(L.xi.concat(L.subs || []), side.n, () => { const b = document.getElementById('fbMd'); if (b) mdRedraw(b.dataset.id); }); const rows = ['av', 'med', 'def', 'gr'].map(k => L.xi.filter(p => p.pos === k)).filter(r => r.length);
  return `<div class="fb-xi"><div class="fb-xih">${cr(side.logo, side.n, 24)}<b>${esc(tN(side.sn))}</b>${L.form ? `<span class="fb-xif">${esc(L.form)}</span>` : ''}<small>${esc(label)}</small></div>
    <div class="fb-xip">${PITCHV}${rows.map(r => `<div class="fb-xir">${r.map(p => { const f = phImg(p, 34); return `<span class="fb-pp${p.out ? ' out' : ''}${f ? ' f' : ''}" title="${esc(p.n)}">${f ? `<span class="fb-ppf">${f}<i>${esc(p.num || '·')}</i></span>` : `<i>${esc(p.num || '·')}</i>`}<small>${esc(shortN(p))}</small></span>`; }).join('')}</div>`).join('')}</div>
    ${(L.subs || []).length ? `<div class="fb-subs"><small>Suplentes</small>${L.subs.map(p => `<span${p.in ? ' class="in"' : ''}><i>${esc(p.num || '·')}</i>${esc(shortN(p))}${p.in ? ' <em>entrou</em>' : ''}</span>`).join('')}</div>` : ''}
    ${coach ? `<p class="fb-coach">${UI.ic('user')}Treinador: <b>${esc(coach)}</b></p>` : ''}
    <button type="button" class="btn xs ghost fb-sqb" data-act="fbTeamRow" data-id="${esc(side.id)}" data-lg="${esc(lg || '')}" data-n="${esc(side.n)}" data-logo="${esc(side.logo)}">Plantel completo ${UI.ic('right')}</button></div>`; };
// treinador, lesionados e castigados: a IA procura nas notícias (a ESPN não tem o treinador); guardado 2 dias
const TINFO = U.ls.get('oc_fut_ti', {}) || {}, TIBUSY = new Set(), TIERR = {};
const jsonIn = t => { const a = String(t || '').indexOf('{'), b = String(t || '').lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('a IA não respondeu em JSON'); return JSON.parse(String(t).slice(a, b + 1)); };
const coachOf = id => { const x = TINFO[id]; return x && Date.now() - x.at < 30 * 864e5 ? x.tecnico || '' : ''; };
const teamAI = async t => { const lg = lgN(t.lg, t.sub), q = `Pesquisa as notícias mais recentes (últimos dias) sobre o plantel do ${tN(t.n)}${isNat(t) ? ' (seleção)' : ''} (${lg}). Diz quem é o treinador principal ATUAL e que jogadores estão lesionados ou castigados (suspensos) neste momento. Não inventes: se não encontrares, deixa vazio.
Responde APENAS JSON: {"tecnico":"nome","lesionados":[{"nome":"","motivo":"","volta":"previsão ou vazio"}],"castigados":[{"nome":"","motivo":""}],"notas":"uma frase com o essencial do momento do plantel"}`;
  let o = null, src = []; if (OS.AI.key && OS.AI.key() && OS.Brain && OS.Brain.search) { try { const r = await OS.Brain.search(q, .2); o = jsonIn(r.text); src = r.src || []; } catch (x) { o = null; } }
  if (!o) o = await OS.AI.json([{ text: q.replace('Pesquisa as notícias mais recentes (últimos dias) sobre', 'Com o que sabes (pode estar desatualizado) sobre') }], .2);
  TINFO[t.id] = { at: Date.now(), tecnico: String(o.tecnico || '').slice(0, 80), les: (o.lesionados || []).slice(0, 12).map(x => ({ n: String(x.nome || '').slice(0, 60), m: String(x.motivo || '').slice(0, 80), v: String(x.volta || '').slice(0, 60) })).filter(x => x.n),
    cas: (o.castigados || []).slice(0, 8).map(x => ({ n: String(x.nome || '').slice(0, 60), m: String(x.motivo || '').slice(0, 80) })).filter(x => x.n), notas: String(o.notas || '').slice(0, 240), src: src.slice(0, 5), web: !!src.length };
  U.ls.set('oc_fut_ti', TINFO); return TINFO[t.id]; };
const CTYP = n => CTYD[n] || n;
const pCard = p => `<div class="fb-pc2${p.inj ? ' inj' : ''}">${(() => { const f = phImg(p, 44); return f ? `<span class="fb-av">${f}<i>${esc(p.num || '–')}</i></span>` : `<span class="fb-num">${esc(p.num || '–')}</span>`; })()}<span class="fb-pn"><b>${esc(p.n)}</b><small>${p.flag ? `<img src="${esc(img(p.flag, 32))}" alt="" width="16" height="16" loading="lazy" referrerpolicy="no-referrer">` : ''}${esc(CTYP(p.cty))}${p.age ? ' · ' + p.age + ' anos' : ''}</small></span><span class="fb-ps">${p.apps ? `<span><em>${p.apps}</em>jogos</span>` : ''}${p.g ? `<span><em>${p.g}</em>golos</span>` : ''}${p.as ? `<span><em>${p.as}</em>assist.</span>` : ''}</span>${p.inj ? `<span class="fb-inj">${esc(/out|injur/i.test(p.inj) ? 'lesionado' : /day|doubt|question/i.test(p.inj) ? 'em dúvida' : p.inj)}</span>` : ''}</div>`;
const plantel = t => { needRoster(t); const R = ROS[t.id], ti = TINFO[t.id], busy = TIBUSY.has(t.id);
  const aiBtn = `<button type="button" class="btn xs ${ti ? 'ghost' : 'pri'}" data-act="fbTeamAI" data-id="${esc(t.id)}" ${busy ? 'disabled' : ''}>${UI.ic('brain')}${busy ? 'A IA está a procurar…' : ti ? 'Atualizar com a IA' : 'Treinador, lesões e castigos (IA)'}</button>`;
  const info = ti ? `<div class="fb-ti">${ti.tecnico ? `<p class="fb-coach big">${UI.ic('user')}Treinador: <b>${esc(ti.tecnico)}</b></p>` : ''}${ti.les.length ? `<p><b>Lesionados:</b> ${ti.les.map(x => esc(x.n) + (x.m ? ` (${esc(x.m)}${x.v ? ', ' + esc(x.v) : ''})` : '')).join('; ')}</p>` : ''}${ti.cas.length ? `<p><b>Castigados:</b> ${ti.cas.map(x => esc(x.n) + (x.m ? ` (${esc(x.m)})` : '')).join('; ')}</p>` : ''}${ti.notas ? `<p class="mut">${esc(ti.notas)}</p>` : ''}<small class="mut">${ti.web ? 'Pesquisado pela IA nas notícias' : 'Pela IA, sem pesquisa na internet'} · ${esc(dayLbl(ti.at))} ${esc(hm(ti.at))}${ti.src.length ? ' · Fontes: ' + ti.src.map(x => esc(x.t)).join(', ') : ''}</small></div>`
    : TIERR[t.id] ? `<p class="fb-aie">${esc(TIERR[t.id])}</p>` : '';
  if (!R) return sec('Plantel', info + loading('A buscar os jogadores…'), aiBtn); if (!R.P.length) return sec('Plantel', info + '<p class="mut fb-none">A ESPN não tem o plantel desta equipa.</p>', aiBtn);
  needPhotos(R.P, t.n); const top = R.P.filter(p => p.g > 0).sort((a, b) => b.g - a.g || b.as - a.as).slice(0, 3);
  return sec(`Plantel <small class="mut">${R.P.length} jogadores</small>`, info + (top.length ? `<div class="fb-top3">${top.map((p, i) => `<div>${phImg(p, 40, 'tp')}<span class="fb-pdm ${MED[i + 1]}">${i + 1}</span><b>${esc(p.n)}</b><small><em>${p.g}</em> golos${p.as ? ` · ${p.as} assist.` : ''}</small></div>`).join('')}</div>` : '')
    + ['gr', 'def', 'med', 'av'].map(k => { const L = R.P.filter(p => p.pos === k).sort((a, b) => b.apps - a.apps || U.num(a.num) - U.num(b.num)); return L.length ? `<h4 class="fb-gh">${PG[k]} <small class="mut">${L.length}</small></h4><div class="fb-sq">${L.map(pCard).join('')}</div>` : ''; }).join('') + '<p class="mut fb-src">Fotos: ESPN e Wikipédia (Wikimedia Commons). Sem foto, fica o número da camisola.</p>', aiBtn); };

/* ---------- análise da IA: quem tem mais probabilidade de ganhar, e porquê ----------
   Só a pedido (botão no jogo) e guardada no aparelho, para não gastar a quota da IA: antes do jogo vale até ao apito inicial;
   ao vivo pode pedir-se de novo ao fim de 5 min ou quando o resultado muda. A IA recebe só dados reais do jogo e não inventa lesões nem escalações. */
const AIM = U.ls.get('oc_fut_ai', {}) || {}, AIBUSY = new Set(), AIERR = {};
const scoreKey = e => sc0(e.h && e.h.s) + '-' + sc0(e.a && e.a.s);
const aiOf = e => { const x = AIM[e.id]; if (!x || !x.o || done(e)) return null; if (x.st === 'pre' && e.st !== 'pre') return null; const o = x.o; ['razoes', 'chave'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; }); if (!Array.isArray(o.p) || o.p.length !== 3) return null; if (!Array.isArray(x.src)) x.src = []; return x; };
const aiStale = e => { const x = AIM[e.id]; return !x || (e.st === 'in' && (Date.now() - x.at > 5 * 6e4 || x.sc !== scoreKey(e))); };
const aiCtx = e => { const S = (SUM[e.id] && SUM[e.id].j) || {}, P = probs(e), RR = { W: 'V', D: 'E', L: 'D' };
  const tab = id => { let o = null; ((S.standings && S.standings.groups) || []).forEach(g => (((g.standings || {}).entries) || []).forEach(r => { if (String(r.id || (r.team && r.team.id) || '') !== id) return; const v = k => { const x = (r.stats || []).find(z => z.name === k); return x ? x.displayValue : null; }; o = { posicao: v('rank'), pontos: v('points'), jogos: v('gamesPlayed'), saldo_golos: v('pointDifferential') }; })); return o; };
  const frm = id => { const L = (S.lastFiveGames || []).find(x => String(x.team && x.team.id) === id); return L ? L.events.map(g => `${RR[g.gameResult] || '?'} ${g.atVs === '@' ? 'fora' : 'casa'} vs ${(g.opponent && g.opponent.displayName) || ''} ${g.score || ''}`) : null; };
  const st2 = id => { const t = ((S.boxscore && S.boxscore.teams) || []).find(x => String(x.team && x.team.id) === id); if (!t || e.st === 'pre') return null; const o = {}; (t.statistics || []).forEach(x => { if (['possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners', 'saves', 'redCards', 'yellowCards'].includes(x.name)) o[x.name] = x.displayValue; }); return o; };
  const side = x => ({ nome: tN(x.n), golos: e.st === 'pre' ? undefined : sc0(x.s), tabela: tab(x.id), ultimos_5: frm(x.id), estatisticas: st2(x.id) });
  const ss = ((S.seasonseries || []).find(x => (x.events || []).length) || {});
  return { competicao: lgN(e.lg, e.lgF), data: new Date(e.d).toLocaleString('pt-PT'), estado: e.st === 'pre' ? 'por começar' : e.st === 'in' ? 'a decorrer, ' + stat(e) : 'terminado', campo_neutro: !!(S.header && ((S.header.competitions || [])[0] || {}).neutralSite), estadio: e.ven || undefined,
    casa: side(e.h), fora: side(e.a), lances: (e.ke || []).filter(k => k.t !== 'y').map(k => `${k.min} ${k.t === 'r' ? 'expulsão' : k.t === 'og' ? 'autogolo' : 'golo'} ${k.who || ''} (${k.tid === e.h.id ? tN(e.h.sn) : tN(e.a.sn)})`),
    confronto_direto: ss.summary || undefined, probabilidade_calculada: P ? { casa: pct(P.p[0]), empate: pct(P.p[1]), fora: pct(P.p[2]), fonte: P.src === 'odds' ? 'odds do mercado' : 'estimativa por tabela, forma e fator casa' } : undefined }; };
const aiRun = async e => { if (!SUM[e.id]) { try { await liveEv(e, 10 * 6e4); } catch (x) { } }
  const S = (SUM[e.id] && SUM[e.id].j) || {}, off = [lineupOf(S, e.h.id), lineupOf(S, e.a.id)];
  await Promise.all([e.h, e.a].map((x, i) => Promise.all([off[i] || PROB[x.id] ? 0 : loadProbable(x, e.lg).catch(() => { }), ROS[x.id] ? 0 : loadRoster({ id: x.id, lg: e.lg }).catch(() => { })])));
  const ctx = aiCtx(e), live = e.st === 'in', pl = (x, i) => { const L = off[i] || (PROB[x.id] && !PROB[x.id].none ? PROB[x.id] : null), R = ROS[x.id];
    return { escalacao: L ? { oficial: !!off[i], esquema: L.form || undefined, titulares: L.xi.map(p => `${p.num ? p.num + ' ' : ''}${p.n} (${PG[p.pos]})`) } : undefined, marcadores: R ? R.P.filter(p => p.g > 0).sort((a, b) => b.g - a.g).slice(0, 4).map(p => `${p.n}: ${p.g} golos, ${p.as} assist., ${p.apps} jogos`) : undefined, lesionados_espn: R ? R.P.filter(p => p.inj).map(p => p.n) : undefined }; };
  ctx.casa.jogadores = pl(e.h, 0); ctx.fora.jogadores = pl(e.a, 1);
  const web = !!(OS.AI.key && OS.AI.key() && OS.Brain && OS.Brain.search);
  const ask = `És um analista de futebol experiente, sério e prudente. ${web ? `Primeiro pesquisa na internet as notícias mais recentes sobre ESTE jogo (${tN(e.h.n)} × ${tN(e.a.n)}, ${lgN(e.lg, e.lgF)}, ${new Date(e.d).toLocaleDateString('pt-PT')}): escalações prováveis, lesionados, castigados, regressos, treinadores e o momento das duas equipas. Depois junta isso` : 'Usa'} com os dados abaixo (que são reais) e diz quem tem mais probabilidade de ganhar e qual é o teu palpite de resultado, em português de Portugal, de forma clara para um adepto. Analisa os jogadores que devem jogar (quem marca, quem falta) e os últimos jogos de cada equipa.${live ? ' O jogo está a decorrer: pesa o resultado, o minuto, as expulsões e as estatísticas do jogo.' : ''} Não inventes jogadores, lesões nem números: se não souberes, deixa vazio e baixa a confiança.
Responde APENAS JSON: {"favorito":"casa|empate|fora","prob":{"casa":0,"empate":0,"fora":0},"placar":"palpite de resultado final, ex.: 2-1","titulo":"o veredicto numa frase curta","razoes":["3 a 5 razões curtas, cada uma com um facto ou número"],"jogadores_chave":[{"nome":"","equipa":"casa|fora","porque":"frase curta"}],"escalacoes":{"casa":{"tecnico":"","esquema":"","titulares":["11 nomes"],"desfalques":["nome (motivo)"]},"fora":{"tecnico":"","esquema":"","titulares":["11 nomes"],"desfalques":["nome (motivo)"]}},"atencao":"o que pode mudar o jogo, numa frase","confianca":"baixa|média|alta"} (as probabilidades em % somam 100).
Dados: ${JSON.stringify(ctx)}`;
  // plano B em cadeia: Google com pesquisa → Google sem pesquisa ou IA grátis de reserva (sem limite diário) → análise do Prumo (sem IA)
  let o = null, src = [], eng = 'web', why = '';
  if (web) { try { const r = await OS.Brain.search(ask, .3); o = jsonIn(r.text); src = r.src || []; } catch (x) { why = (x && x.message) || ''; o = null; } }
  if (!o) { try { o = await OS.AI.json([{ text: ask.replace(/Primeiro pesquisa na internet[^.]*\.[^.]*\. Depois junta isso/, 'Usa') }], .3); eng = OS.AI.lastEngine === 'reserva' ? 'reserva' : 'google'; } catch (x) { why = why || (x && x.message) || ''; o = null; } }
  if (!o || !o.prob || !o.titulo) return localAI(e, why);
  let p = o && o.prob ? [U.num(o.prob.casa), U.num(o.prob.empate), U.num(o.prob.fora)] : null; if (!p || !(p[0] + p[1] + p[2] > 0) || !o.titulo) throw new Error('a IA não deu uma resposta válida');
  const t = p[0] + p[1] + p[2]; p = p.map(x => Math.round(x / t * 100)); p[1] = 100 - p[0] - p[2];
  const esc2 = (x, n) => String(x || '').slice(0, n), lin = x => x && typeof x === 'object' ? { tec: esc2(x.tecnico, 80), form: esc2(x.esquema, 12), xi: (Array.isArray(x.titulares) ? x.titulares : []).slice(0, 11).map(y => esc2(y, 50)).filter(Boolean), fora: (Array.isArray(x.desfalques) ? x.desfalques : []).slice(0, 8).map(y => esc2(y, 80)).filter(Boolean) } : null;
  const E2 = o.escalacoes || {}, lc = lin(E2.casa), lf = lin(E2.fora);
  [[e.h, lc], [e.a, lf]].forEach(([x, l]) => { if (l && l.tec && eng === 'web') { TINFO[x.id] = Object.assign({ les: [], cas: [], notas: '', src: [] }, TINFO[x.id] || {}, { at: (TINFO[x.id] || {}).at || Date.now(), tecnico: l.tec, web: true }); } }); U.ls.set('oc_fut_ti', TINFO);
  AIM[e.id] = { at: Date.now(), st: e.st, sc: scoreKey(e), web: eng === 'web', eng, src: src.slice(0, 6), o: { fav: ['casa', 'empate', 'fora'].includes(o.favorito) ? o.favorito : (p[0] >= p[2] ? 'casa' : 'fora'), p, placar: /^\d{1,2}\s*[-x×:]\s*\d{1,2}$/.test(String(o.placar || '').trim()) ? String(o.placar).trim().replace(/\s*[x×:]\s*/, '-') : '', titulo: esc2(o.titulo, 200),
    razoes: (Array.isArray(o.razoes) ? o.razoes : []).slice(0, 5).map(x => esc2(x, 240)), chave: (Array.isArray(o.jogadores_chave) ? o.jogadores_chave : []).slice(0, 4).map(x => ({ n: esc2(x && x.nome, 60), lado: x && x.equipa === 'fora' ? 'fora' : 'casa', why: esc2(x && x.porque, 160) })).filter(x => x.n),
    lc, lf, atencao: esc2(o.atencao, 240), conf: ['baixa', 'média', 'alta'].includes(o.confianca) ? o.confianca : 'média' } };
  const keys = Object.keys(AIM).sort((a, b) => AIM[b].at - AIM[a].at); keys.slice(40).forEach(k => delete AIM[k]); U.ls.set('oc_fut_ai', AIM); return AIM[e.id]; };
// análise do Prumo, sem IA: quando nenhuma IA responde (cota do Google gasta e a reserva sem resposta), a análise faz-se com os números
const localAI = (e, why) => { const S = (SUM[e.id] && SUM[e.id].j) || {}, P = probs(e) || { p: [.4, .28, .32], src: 'base' }, hc = ((S.header || {}).competitions || [])[0] || {}, neu = !!hc.neutralSite;
  const d = fitD(P.p[0], P.p[2], neu), f = e.st === 'in' ? Math.max(0, (95 - minute(e)) / 95) : 1, [lh, la] = lam(d, neu), gh = e.st === 'in' ? U.num(e.h.s) : 0, ga = e.st === 'in' ? U.num(e.a.s) : 0;
  let best = [0, 0, -1]; for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5; j++) { const q = pois(lh * f, i) * pois(la * f, j); if (q > best[2]) best = [i + gh, j + ga, q]; }
  const pp = P.p.map(pct); pp[1] = 100 - pp[0] - pp[2]; const k = pp[0] >= pp[2] ? 0 : 2, fav = Math.max(pp[0], pp[2]) - pp[1] < 8 && Math.abs(pp[0] - pp[2]) < 10 ? 'empate' : k === 0 ? 'casa' : 'fora', side = k === 0 ? e.h : e.a;
  const tab = id => { let o = null; ((S.standings && S.standings.groups) || []).forEach(g => (((g.standings || {}).entries) || []).forEach(r => { if (String(r.id || (r.team && r.team.id) || '') !== id) return; const v = n => { const x = (r.stats || []).find(z => z.name === n); return x ? x.displayValue : ''; }; o = { pos: v('rank'), pts: v('points') }; })); return o; };
  const frm = id => { const L = (S.lastFiveGames || []).find(x => String(x.team && x.team.id) === id); if (!L) return ''; const c = { W: 0, D: 0, L: 0 }; L.events.forEach(g => { c[g.gameResult] = (c[g.gameResult] || 0) + 1; }); return `${c.W}V ${c.D}E ${c.L}D nos últimos ${L.events.length}`; };
  const R = []; if (e.st === 'in') R.push(`${tN(e.h.sn)} ${sc0(e.h.s)}-${sc0(e.a.s)} ${tN(e.a.sn)} aos ${stat(e)}`);
  R.push(P.src === 'odds' ? `As odds do mercado dão ${pp[k]}% a ${tN(side.sn)}` : `Pela tabela, forma e fator casa: ${pp[0]}% ${tN(e.h.sn)}, ${pp[1]}% empate, ${pp[2]}% ${tN(e.a.sn)}`);
  [e.h, e.a].forEach(x => { const t = tab(x.id), fm = frm(x.id); if (t && t.pos) R.push(`${tN(x.sn)}: ${t.pos}.º lugar com ${t.pts} pts${fm ? ', ' + fm : ''}`); else if (fm) R.push(`${tN(x.sn)}: ${fm}`); });
  const ss = ((S.seasonseries || []).find(x => (x.events || []).length) || {}); if (ss.summary) R.push('Confronto direto: ' + ss.summary);
  const chave = [e.h, e.a].map((x, i) => { const top = ROS[x.id] && ROS[x.id].P.filter(q => q.g > 0).sort((a, b) => b.g - a.g)[0]; return top ? { n: top.n, lado: i ? 'fora' : 'casa', why: `${top.g} golos e ${top.as} assistências na época` } : null; }).filter(Boolean);
  const lin = x => { const L = lineupOf(S, x.id) || (PROB[x.id] && !PROB[x.id].none ? PROB[x.id] : null); return L ? { tec: coachOf(x.id), form: L.form || '', xi: L.xi.map(q => q.n), fora: (ROS[x.id] ? ROS[x.id].P.filter(q => q.inj).map(q => q.n + ' (lesionado)') : []).slice(0, 6) } : null; };
  AIM[e.id] = { at: Date.now(), st: e.st, sc: scoreKey(e), web: false, eng: 'prumo', why: String(why || '').slice(0, 160), src: [], o: { fav, p: pp, placar: best[0] + '-' + best[1], titulo: fav === 'empate' ? 'Jogo equilibrado: o empate é tão provável como uma vitória.' : `${tN(side.n)} tem mais probabilidade de ganhar (${pp[k]}%).`,
    razoes: R.slice(0, 5), chave, lc: lin(e.h), lf: lin(e.a), atencao: e.st === 'in' ? 'Um golo muda as contas: a probabilidade atualiza-se com o resultado e o tempo que falta.' : 'Confirma as escalações oficiais perto do jogo: uma ausência importante muda o favorito.', conf: Math.max(pp[0], pp[2]) >= 60 ? 'alta' : Math.max(pp[0], pp[2]) >= 45 ? 'média' : 'baixa' } };
  U.ls.set('oc_fut_ai', AIM); return AIM[e.id]; };
const ENG = { web: 'com pesquisa nas notícias', google: 'pela IA do Google, sem pesquisa', reserva: 'pela IA grátis de reserva, sem pesquisa', prumo: 'feita pelo Prumo com os números do jogo (sem IA)' };
const aiBox = e => { if (done(e) || /POSTPONED|CANCEL/.test(e.sn)) return ''; const x = aiOf(e), busy = AIBUSY.has(e.id), err = AIERR[e.id];
  const btn = l => `<button type="button" class="btn sm ${x ? '' : 'pri'}" data-act="fbAI" data-id="${esc(e.id)}" ${busy ? 'disabled' : ''}>${UI.ic('brain')}${busy ? 'A IA está a analisar o jogo…' : l}</button>`;
  if (!x) return `<div class="fb-ai fb-ai0"><div><b>Quem ganha? Pergunta à IA</b><p>A IA pesquisa as notícias do jogo (escalações prováveis, lesões, castigos), junta a tabela, a forma, os jogadores e o confronto direto${e.st === 'in' ? ', o resultado, o minuto e as estatísticas' : ''}, e dá o palpite: quem tem mais probabilidade de ganhar, o resultado e porquê.</p>${err ? `<p class="fb-aie">${esc(err)}</p>` : ''}</div>${btn('Analisar o jogo')}</div>`;
  const o = x.o, [h, d, a] = o.p, fav = o.fav === 'casa' ? e.h : o.fav === 'fora' ? e.a : null, sd = l => l === 'fora' ? e.a : e.h;
  const lin = (l, side) => l && (l.xi.length || l.tec || l.fora.length) ? `<div class="fb-ail2"><div class="fb-xih">${cr(side.logo, side.n, 22)}<b>${esc(tN(side.sn))}</b>${l.form ? `<span class="fb-xif">${esc(l.form)}</span>` : ''}</div>${l.tec ? `<p class="fb-coach">${UI.ic('user')}Treinador: <b>${esc(l.tec)}</b></p>` : ''}${l.xi.length ? `<p class="fb-aixi">${l.xi.map(esc).join(' · ')}</p>` : ''}${l.fora.length ? `<p class="fb-aiout"><b>Desfalques:</b> ${l.fora.map(esc).join('; ')}</p>` : ''}</div>` : '';
  return `<div class="fb-ai"><div class="fb-aih">${UI.ic('brain')}<span>${x.eng === 'prumo' ? 'Análise do Prumo' : 'Análise da IA'}</span><small>${esc(x.st === 'in' ? 'ao vivo, ' : '')}${esc(ENG[x.eng || (x.web ? 'web' : 'google')] || '')}, às ${esc(hm(x.at))} · confiança ${esc(o.conf)}</small></div>${x.eng === 'prumo' ? `<p class="fb-ain">${/limite|cota|quota/i.test(x.why || '') ? 'A cota grátis da IA do Google acabou por hoje e a IA de reserva não respondeu.' : 'A IA não respondeu agora.'} Esta análise foi feita pelo Prumo com as odds ou a tabela, a forma, o confronto direto e as escalações. Podes pedir à IA outra vez mais tarde.</p>` : x.eng === 'reserva' ? '<p class="fb-ain">A cota grátis da IA do Google acabou por hoje: esta análise foi feita pela IA grátis de reserva, sem pesquisa nas notícias.</p>' : ''}
    <div class="fb-aiv">${fav ? cr(fav.logo, fav.n, 44) : ''}<div><b>${esc(o.titulo)}</b>${o.placar ? `<span class="fb-aip">Palpite: <em>${esc(tN(e.h.sn))} ${esc(o.placar.split('-')[0])}–${esc(o.placar.split('-')[1])} ${esc(tN(e.a.sn))}</em></span>` : ''}</div></div>
    <div class="fb-pbb fb-aib" role="img" aria-label="${esc(tN(e.h.sn))} ${h}%, empate ${d}%, ${esc(tN(e.a.sn))} ${a}%"><s class="h" style="width:${h}%"></s><s class="d" style="width:${d}%"></s><s class="a" style="width:${a}%"></s></div>
    <div class="fb-pbl fb-ail"><span><b>${h}%</b> ${esc(tN(e.h.sn))}</span><span><b>${d}%</b> empate</span><span>${esc(tN(e.a.sn))} <b>${a}%</b></span></div>
    ${o.razoes.length ? `<ul class="fb-air">${o.razoes.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
    ${o.chave.length ? `<h5 class="fb-aih5">Jogadores-chave</h5><div class="fb-aik">${o.chave.map(k => `<div>${(() => { const R = ROS[sd(k.lado).id], q = R && R.P.find(x => norm(x.n).includes(norm(k.n)) || norm(k.n).includes(norm(x.n))); return (q && phImg(q, 40)) || cr(sd(k.lado).logo, sd(k.lado).n, 20); })()}<span><b>${esc(k.n)}</b>${k.why ? `<small>${esc(k.why)}</small>` : ''}</span></div>`).join('')}</div>` : ''}
    ${(o.lc || o.lf) && (lin(o.lc, e.h) || lin(o.lf, e.a)) ? `<h5 class="fb-aih5">Escalações prováveis (palpite da IA)</h5><div class="fb-ail2s">${lin(o.lc, e.h)}${lin(o.lf, e.a)}</div>` : ''}
    ${o.atencao ? `<p class="fb-aia"><b>Atenção:</b> ${esc(o.atencao)}</p>` : ''}
    <div class="fb-aif"><small>${x.eng === 'prumo' ? 'É uma estimativa com os números, não uma certeza.' : 'É a leitura da IA com os dados' + (x.eng === 'web' ? ' e as notícias' : '') + ' do jogo, não uma certeza.'}${x.src && x.src.length ? ' Fontes: ' + x.src.map(s2 => esc(s2.t)).join(', ') + '.' : ''}</small>${(aiStale(e) && e.st === 'in') || e.st === 'pre' || x.eng === 'prumo' ? btn(x.eng === 'prumo' ? 'Pedir à IA outra vez' : 'Analisar de novo') : ''}</div></div>`; };

/* ---------- desenho ---------- */
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const p2 = n => String(n).padStart(2, '0');
const hm = t => { const d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const dayLbl = t => { const d = new Date(t), k = U.iso(d), td = U.today(); return k === td ? 'Hoje' : k === U.addDays(td, 1) ? 'Amanhã' : k === U.addDays(td, -1) ? 'Ontem' : WD[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1); };
const cd = t => { const m = Math.max(0, Math.round((t - Date.now()) / 6e4)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); if (h < 48) return h + ' h ' + p2(m % 60); return Math.floor(h / 24) + ' dias'; };
const stat = e => e.st === 'in' ? (e.sn === 'STATUS_HALFTIME' ? 'Intervalo' : (e.clk && e.clk !== "0'" ? e.clk : 'Ao vivo')) : e.st === 'post' ? (/POSTPONED/.test(e.sn) ? 'Adiado' : /CANCEL|ABANDON/.test(e.sn) ? 'Cancelado' : /PEN/.test(e.sn) ? 'Final (pen.)' : /AET/.test(e.sn) ? 'Final (prol.)' : 'Final') : /POSTPONED/.test(e.sn) ? 'Adiado' : hm(e.d);
const col = h => { const x = String(h || '').replace(/^#+/, ''); return /^[0-9a-f]{6}$/i.test(x) ? '#' + x : 'var(--accent)'; };
const ini = n => String(tN(n) || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
const cr = (u, n, w, cls) => u ? `<img class="fb-cr ${cls || ''}" src="${esc(img(u, w * 2))}" alt="" width="${w}" height="${w}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="fb-cr fb-cr0 ${cls || ''}" style="width:${w}px;height:${w}px;font-size:${Math.round(w / 3)}px" aria-hidden="true">${esc(ini(n))}</span>`;
const wdl = (e, id) => { if (!done(e) || !e.h || !e.a) return ''; const me = e.h.id === id ? e.h : e.a.id === id ? e.a : null, ot = me === e.h ? e.a : e.h; if (!me) return ''; let a = U.num(me.s), b = U.num(ot.s); if (a === b && me.so != null && ot.so != null) { a = U.num(me.so); b = U.num(ot.so); } return a > b ? 'v' : a < b ? 'd' : 'e'; };
const pen = e => e.h && e.a && e.h.so != null && e.a.so != null ? `<small class="fb-pen">(${esc(e.h.so)}-${esc(e.a.so)} pen.)</small>` : '';
const liveTag = e => `<span class="fb-live"><i aria-hidden="true"></i>${esc(stat(e))}</span>`;
const RL = { v: 'Vitória', e: 'Empate', d: 'Derrota' };
const form5 = L => L.length ? `<span class="fb-form" aria-label="Últimos jogos">${L.map(r => `<i class="${r}" title="${RL[r] || ''}">${r.toUpperCase()}</i>`).join('')}</span>` : '';

/* símbolos dos campeonatos (a versão da ESPN para fundo escuro), guardados no aparelho */
const LOGO = U.ls.get('oc_fut_logo', {}) || {};
const darkOf = L => { const d = (L || []).find(x => (x.rel || []).includes('dark')) || (L || [])[0]; return d ? d.href : ''; };
const lgLogo = s => LOGO[s] || (CM[s] && CM[s].logo) || '';
const needLogos = list => { const miss = [...new Set(list)].filter(s => s && LOGO[s] == null); if (!miss.length) return;
  ensure('lg', () => true, () => pool(miss, 4, async s => { try { const j = await get('https://sports.core.api.espn.com/v2/sports/soccer/leagues/' + s + '?lang=en&region=us', 30 * 864e5); LOGO[s] = darkOf(j.logos); } catch (e) { LOGO[s] = ''; } })
    .then(() => U.ls.set('oc_fut_logo', Object.fromEntries(Object.entries(LOGO).filter(([, v]) => v))))); };
const lgImg = (s, w, n) => { const u = lgLogo(s); return u ? `<img class="fb-lg" src="${esc(img(u, w * 2))}" alt="" width="${w}" height="${w}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="fb-lg fb-lg0" style="width:${w}px;height:${w}px" aria-hidden="true">${UI.ic('award')}</span>`; };

/* cartão de um jogo: competição e estado em cima, as duas equipas com escudo e golos */
const winOf = e => { if (!done(e)) return ['', '']; let a = U.num(e.h.s), b = U.num(e.a.s); if (a === b && e.h.so != null && e.a.so != null) { a = U.num(e.h.so); b = U.num(e.a.so); } return a > b ? ['w', 'l'] : a < b ? ['l', 'w'] : ['', '']; };
const mSide = (e, x, w) => `<span class="fb-mt ${w}">${cr(x.logo, x.n, 28)}<b>${esc(tN(x.n))}</b>${e.st === 'pre' ? '' : `<em>${esc(sc0(x.s))}${x.so != null && e.h.so != null && e.a.so != null ? `<sup>${esc(x.so)}</sup>` : ''}</em>`}</span>`;
const mCard = (e, o) => { o = o || {}; const r = o.me ? wdl(e, o.me) : '', [wh, wa] = winOf(e);
  return `<button type="button" class="fb-mc ${e.st}${r ? ' r-' + r : ''}" data-act="fbMatch" data-id="${esc(e.id)}">
    <span class="fb-mch">${o.nolg ? '' : `${lgImg(e.lg, 16)}<span class="fb-mcl">${esc(lgN(e.lg, e.lgF))}</span>`}<span class="fb-mcs">${e.st === 'in' ? liveTag(e) : esc(e.st === 'pre' ? (/POSTPONED/.test(e.sn) ? 'Adiado' : dayLbl(e.d) + ' · ' + hm(e.d)) : stat(e) + ' · ' + dayLbl(e.d))}</span>${r ? `<span class="fb-r ${r}" title="${RL[r]}">${r.toUpperCase()}</span>` : ''}</span>
    ${mSide(e, e.h, wh)}${mSide(e, e.a, wa)}</button>`; };
const grid = L => `<div class="fb-grid">${L.join('')}</div>`;
const goals = (e, side) => (e.ke || []).filter(k => (k.t === 'g' || k.t === 'og') && k.tid === side.id).map(k => `<span>${UI.ic('ball')}${esc(k.who || 'Golo')}${k.t === 'og' ? ' (pb)' : ''} <b>${esc(k.min)}</b></span>`).join('');
const reds = (e, side) => (e.ke || []).filter(k => k.t === 'r' && k.tid === side.id).map(k => `<span class="fb-rc" title="Expulsão">${esc(k.who || '')} ${esc(k.min)}</span>`).join('');
const placard = (e, label) => `<div class="fb-pl ${e.st}" data-act="fbMatch" data-id="${esc(e.id)}" role="button" tabindex="0">
  <div class="fb-pl-top"><span class="fb-pl-lg">${lgImg(e.lg, 18)}${label ? `<b>${esc(label)}</b> · ` : ''}${esc(lgN(e.lg, e.lgF))}</span>${e.st === 'in' ? liveTag(e) : `<span>${esc(dayLbl(e.d))} · ${esc(hm(e.d))}</span>`}</div>
  <div class="fb-pl-mid"><div class="fb-pl-t">${cr(e.h.logo, e.h.n, 64)}<b>${esc(tN(e.h.n))}</b></div>
    <div class="fb-pl-sc">${e.st === 'pre' ? `<small>faltam</small><span class="fb-cd">${esc(cd(e.d))}</span>` : `<span class="fb-dg">${esc(sc0(e.h.s))}</span><i>:</i><span class="fb-dg">${esc(sc0(e.a.s))}</span>`}${e.st === 'post' ? `<small>${esc(stat(e))}</small>` : ''}${pen(e)}</div>
    <div class="fb-pl-t">${cr(e.a.logo, e.a.n, 64)}<b>${esc(tN(e.a.n))}</b></div></div>
  ${e.st !== 'pre' && (e.ke || []).some(k => k.t !== 'y') ? `<div class="fb-pl-g"><div>${goals(e, e.h)}${reds(e, e.h)}</div><div>${goals(e, e.a)}${reds(e, e.a)}</div></div>` : ''}${(() => { const P = probs(e); return P ? probBar(e, P) : ''; })()}${(() => { const x = aiOf(e); return x ? `<div class="fb-plai">${UI.ic('brain')}<span><b>IA:</b> ${esc(x.o.titulo)}</span></div>` : ''; })()}</div>`;
const PITCH = `<svg class="fb-pitch" viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1.6" vector-effect="non-scaling-stroke"><rect x="12" y="12" width="376" height="196" rx="2"/><path d="M200 12v196"/><circle cx="200" cy="110" r="30"/><rect x="12" y="58" width="56" height="104"/><rect x="12" y="86" width="20" height="48"/><rect x="332" y="58" width="56" height="104"/><rect x="368" y="86" width="20" height="48"/><path d="M68 92a22 22 0 0 1 0 36M332 92a22 22 0 0 0 0 36"/></g><circle cx="200" cy="110" r="2.2" fill="#fff"/></svg>`;
const hero = (inner, cls) => `<section class="fb-hero ${cls || ''}">${PITCH}<div class="fb-hero-in">${inner}</div></section>`;
const sec = (t, body, side) => `<section class="fb-sec"><div class="fb-sh"><h3>${t}</h3>${side || ''}</div>${body}</section>`;
const rowOf = (t, slug) => { const T = TB[slug || t.lg]; if (!T) return null; for (const g of T.groups) { const r = g.rows.find(x => x.id === t.id); if (r) return { r, g, T }; } return null; };
const posOf = t => { const o = rowOf(t); return o ? `${o.r.pos}.º lugar · ${o.T.groups.length > 1 && o.g.name ? lgN(t.lg) + ', ' + o.g.name.replace(/^Group/, 'Grupo') : lgN(t.lg)} · ${o.r.pts} pts` : ''; };
const opp = (e, id) => e.h.id === id ? e.a : e.h;
const errBox = k => ERR[k] ? `<div class="note fb-err">Não consegui falar com o serviço de resultados (${esc(ERR[k])}). Tenta outra vez daqui a pouco. <button class="btn xs" data-act="fbRefresh">Tentar outra vez</button></div>` : '';
const loading = t => `<div class="fb-ld"><span class="fb-ball" aria-hidden="true">${UI.ic('ball')}</span>${esc(t || 'A buscar os jogos…')}</div>`;

/* tabela: pódio dos 3 primeiros, zonas com cor (apuramento, despromoção) e a tua equipa destacada */
const NOTE = [[/round of 16/i, 'Oitavos de final'], [/playoffs? - seeded/i, 'Play-off (cabeça de série)'], [/playoffs? - unseeded/i, 'Play-off'], [/eliminated/i, 'Eliminado'], [/relegation play/i, 'Play-off de despromoção'], [/relegat/i, 'Despromoção'], [/promotion play/i, 'Play-off de subida'], [/promot/i, 'Subida'],
  [/champions league qualif/i, 'Pré-eliminatória da Liga dos Campeões'], [/champions league/i, 'Liga dos Campeões'], [/europa league qualif/i, 'Pré-eliminatória da Liga Europa'], [/europa league/i, 'Liga Europa'], [/conference league/i, 'Liga Conferência'], [/libertadores qualif|libertadores.*(prelim|qualif)/i, 'Pré-Libertadores'], [/libertadores/i, 'Libertadores'], [/sudamericana/i, 'Sul-Americana'],
  [/championship playoffs?/i, 'Play-off do título'], [/european playoffs?/i, 'Play-off europeu'], [/round one/i, 'Playoffs (1.ª ronda)'], [/wild card/i, 'Playoffs (wild card)'],
  [/knockout|next round|advance/i, 'Passa à fase seguinte'], [/qualif/i, 'Apuramento'], [/championship round/i, 'Fase de campeão']];
const noteT = t => { const m = NOTE.find(([re]) => re.test(t || '')); return m ? m[1] : t || ''; };
// zonas com cores bem distintas (as da ESPN são parecidas entre si): título/Champions/Libertadores, pré-eliminatórias, Liga Europa/Sul-Americana, Conference, play-offs, play-off de descida, descida
const ZC = { top: '#2fbf71', pre: '#19b3a6', eu: '#4c8dff', conf: '#9b7bff', po: '#e6a93a', rpo: '#f08a4b', rel: '#e5484d' };
const zcat = t => /despromo|rebaix|relegat/i.test(t) ? (/play/i.test(t) ? 'rpo' : 'rel') : /elimin/i.test(t) ? 'rel' : /conferência|conference/i.test(t) ? 'conf' : /liga europa|europa league|sul-americana|sudamericana|europeu/i.test(t) ? 'eu' : /pré-|qualif|cabeça de série/i.test(t) ? 'pre' : /play-off|playoff|play-in|wild card|1\.ª ronda/i.test(t) ? 'po' : 'top';
// ligas em que a ESPN não marca as zonas: as zonas habituais (podem mudar com os campeões das taças)
const ZRULE = { 'bra.1': [[1, 4, 'Libertadores (fase de grupos)'], [5, 6, 'Pré-Libertadores'], [7, 12, 'Sul-Americana'], [17, 20, 'Rebaixamento (Z4)']], 'bra.2': [[1, 4, 'Acesso à Série A'], [17, 20, 'Rebaixamento (Z4)']], 'mex.1': [[1, 6, 'Liguilla'], [7, 10, 'Play-in']] };
const zoneOf = (slug, T, r) => { if (r.note && r.note.t) return noteT(r.note.t); if (T.groups.length !== 1 || T.groups[0].rows.some(x => x.note && x.note.t)) return ''; const z = (ZRULE[slug] || []).find(([a, b]) => r.pos >= a && r.pos <= b); return z ? z[2] : ''; };
const MED = ['', 'ouro', 'prata', 'bronze'];
const podium = (slug) => { const T = TB[slug]; if (!T || T.groups.length !== 1) return ''; const R = T.groups[0].rows.slice(0, 3); if (R.length < 3) return ''; const mine = new Set(st().teams.map(t => t.id));
  return `<div class="fb-pod">${[R[1], R[0], R[2]].map(r => `<button type="button" class="fb-pd p${r.pos}${mine.has(r.id) ? ' me' : ''}" data-act="fbTeamRow" data-id="${esc(r.id)}" data-lg="${esc(slug)}" data-n="${esc(r.n)}" data-logo="${esc(r.logo)}"><span class="fb-pdm ${MED[r.pos] || ''}">${r.pos}</span>${cr(r.logo, r.n, r.pos === 1 ? 64 : 52)}<b>${esc(tN(r.sn))}</b><small><em>${r.pts}</em> pts · ${r.j} J</small></button>`).join('')}</div>`; };
const table = (slug, o) => { o = o || {}; const T = TB[slug]; if (!T) return ERR['b' + slug] ? '' : loading('A buscar a tabela…'); const mine = new Set(st().teams.map(t => t.id));
  let G = T.groups; if (o.only) { const g = G.find(x => x.rows.some(r => r.id === o.only)); G = g ? [g] : []; } if (!G.length) return '';
  const notes = new Map(), ZZ = new Map(); G.forEach(g => g.rows.forEach(r => { const z = zoneOf(slug, T, r); ZZ.set(r, z); if (z && !notes.has(z)) notes.set(z, zcat(z)); }));
  const own = !!ZRULE[slug] && T.groups.length === 1 && !T.groups[0].rows.some(x => x.note && x.note.t);
  const legend = notes.size ? `<div class="fb-zl">${[...notes].map(([t, c]) => `<span class="z-${c}"><i style="background:${ZC[c]}"></i>${esc(t)}</span>`).join('')}</div>` : '';
  return legend + G.map(g => { let rows = g.rows; if (o.only && rows.length > 10) { const i = rows.findIndex(r => r.id === o.only), keep = new Set([0, 1, 2, 3, i - 2, i - 1, i, i + 1, i + 2, rows.length - 1]); rows = rows.filter((r, k) => keep.has(k)); }
    let prev = 0, pz = null; return `${G.length > 1 || (g.name && T.groups.length > 1) ? `<h4 class="fb-gh">${esc(g.name.replace(/^Group/, 'Grupo'))}</h4>` : ''}<div class="fb-tw"><table class="fb-tb"><thead><tr><th>#</th><th class="l">Equipa</th><th>J</th><th class="hm">V</th><th class="hm">E</th><th class="hm">D</th><th class="hm">Golos</th><th>DG</th><th>Pts</th></tr></thead><tbody>${rows.map(r => { const gap = prev && r.pos - prev > 1; prev = r.pos;
      const z = ZZ.get(r), c = z ? zcat(z) : '', zb = pz !== null && pz !== c && !gap; pz = c;
      return `<tr class="${mine.has(r.id) || r.id === o.only ? 'me' : ''}${gap ? ' gap' : ''}${c ? ' z z-' + c : ''}${zb ? ' zb' : ''}" style="${c ? '--zc:' + ZC[c] : ''}"${z ? ` title="${esc(z)}"` : ''}><td class="p"><span>${r.pos}</span></td><td class="l"><button type="button" class="fb-tl" data-act="fbTeamRow" data-id="${esc(r.id)}" data-lg="${esc(slug)}" data-n="${esc(r.n)}" data-logo="${esc(r.logo)}">${cr(r.logo, r.n, 24)}<span>${esc(tN(r.sn))}</span></button></td><td>${r.j}</td><td class="hm">${r.v}</td><td class="hm">${r.e}</td><td class="hm">${r.d}</td><td class="hm">${r.gm}:${r.gs}</td><td>${r.dg > 0 ? '+' + r.dg : r.dg}</td><td class="pts">${r.pts}</td></tr>`; }).join('')}</tbody></table></div>`; }).join('')
    + (own ? '<p class="mut fb-zn">Zonas habituais; podem mudar com os campeões das taças.</p>' : ''); };

/* ---------- páginas ---------- */
const TABS = [['', 'Agora'], ['equipas', 'Equipas e seleções'], ['campeonatos', 'Campeonatos']];
const QT = ['Brasil', 'Portugal', 'Argentina', 'França', 'Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Benfica', 'FC Porto', 'Sporting', 'Real Madrid', 'Barcelona', 'Manchester City'];
const POP = [['Brasil', ['bra.1', 'bra.2', 'bra.copa_do_brazil', 'bra.camp.carioca', 'bra.camp.paulista']], ['América do Sul', ['conmebol.libertadores', 'conmebol.sudamericana']], ['Portugal', ['por.1', 'por.taca.portugal']],
  ['Europa', ['uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1']], ['Seleções', ['fifa.world', 'fifa.worldq.conmebol', 'fifa.worldq.uefa', 'uefa.nations', 'conmebol.america', 'uefa.euro', 'fifa.friendly']], ['Resto do mundo', ['fifa.cwc', 'arg.1', 'usa.1', 'sau.1', 'mex.1']]];
const REG = {}; POP.forEach(([g, L]) => L.forEach(s => { REG[s] = g; }));
const RES = new Map(), RESL = new Map(); let LASTQ = { t: { q: '', h: '' }, l: { q: '', h: '' } };
const searchBox = kind => `<form class="fb-q" data-form="fbFind" role="search"><span class="fb-qi">${UI.ic('search')}</span><input type="search" name="q" data-fbq="${kind}" value="${esc(LASTQ[kind].q)}" placeholder="${kind === 't' ? 'Escreve o nome de uma equipa ou seleção (ex.: Flamengo, Benfica, Japão)' : 'Escreve o nome de um campeonato (ex.: Libertadores, Premier League)'}" autocomplete="off" enterkeyhint="search" aria-label="${kind === 't' ? 'Procurar equipa ou seleção' : 'Procurar campeonato'}"><button class="btn sm pri" type="submit">Procurar</button></form><div class="fb-res" id="fbRes" aria-live="polite">${LASTQ[kind].h}</div>`;
const welcome = () => hero(`<div class="fb-wel"><span class="fb-wb" aria-hidden="true">${UI.ic('ball')}</span><h2>As tuas equipas, ao vivo</h2><p>Escolhe as equipas, seleções e campeonatos que queres seguir. Aqui aparecem os jogos a decorrer com o minuto e os golos, quem tem mais probabilidade de ganhar, os próximos jogos, os resultados e a tabela, e o Prumo avisa-te quando começa, quando há golo e quando acaba.</p>
  <div class="fb-wel-b"><a class="btn pri" href="#futebol.equipas">${UI.ic('star')}Escolher equipas e seleções</a><a class="btn fb-btn-l" href="#futebol.campeonatos">${UI.ic('award')}Escolher campeonatos</a></div></div>`);
const P = {};
P[''] = () => { const s = st(); if (!s.teams.length && !s.comps.length) return welcome();
  s.teams.forEach(needTeam); s.comps.forEach(c => needComp(c.slug)); s.teams.forEach(t => needTable(t.lg)); needLogos(s.comps.map(c => c.slug).concat(myEv().map(e => e.lg)));
  const E = myEv(), live = E.filter(e => e.st === 'in'), next = E.filter(e => e.st === 'pre' && !/POSTPONED/.test(e.sn) && e.d > Date.now() - 3 * 36e5), last = E.filter(done).slice(-6).reverse();
  const compLive = []; s.comps.forEach(c => { const m = CM[c.slug]; if (m) m.ev.filter(e => e.st === 'in' && !live.some(x => x.id === e.id)).forEach(e => compLive.push(e)); });
  const any = s.teams.some(t => tmOf(t.id)), wait = s.teams.length && !any;
  (live.length ? live.slice(0, 3) : next.slice(0, 1)).forEach(needSum);
  const top = live.length ? live.slice(0, 3).map(e => placard(e)).join('') : next[0] ? placard(next[0], 'Próximo jogo') : wait ? loading() : s.teams.length ? `<div class="fb-wel"><h2>Sem jogos marcados</h2><p>As tuas equipas não têm jogos nos próximos dias.</p></div>` : '';
  const comps = s.comps.map(c => { const m = CM[c.slug]; if (!m) return ''; const J = jorn(m); if (!J) return ''; return `<div class="fb-cg"><button type="button" class="fb-cgh" data-act="fbComp" data-slug="${esc(c.slug)}">${lgImg(c.slug, 28)}<span><b>${esc(lgN(c.slug, c.n))}</b><small>${esc(J.t)}</small></span>${UI.ic('right')}</button>${grid(J.L.slice(0, 6).map(e => mCard(e, { nolg: 1 })))}</div>`; }).join('');
  return (top ? hero(top + (live.length > 3 ? `<p class="fb-more">+${live.length - 3} jogo(s) ao vivo nas listas abaixo</p>` : '')) : '')
    + errBox('t' + (s.teams[0] || {}).id)
    + (compLive.length ? sec(`<span class="fb-live"><i></i>Ao vivo</span> nos teus campeonatos`, grid(compLive.map(e => mCard(e)))) : '')
    + (next.length > (live.length ? 0 : 1) ? sec('Próximos jogos', grid(next.slice(live.length ? 0 : 1, 9).map(e => mCard(e, { me: e.me })))) : '')
    + (last.length ? sec('Últimos resultados', grid(last.map(e => mCard(e, { me: e.me })))) : '')
    + (comps ? sec('Nos teus campeonatos', comps) : '')
    + (FEED.length ? sec('Últimos avisos', `<ul class="fb-feed">${FEED.slice(0, 6).map(f => `<li><span class="fb-fi">${UI.ic(/Golo/.test(f.title) ? 'ball' : 'bell')}</span><span><b>${esc(f.title)}</b> ${esc(f.body)}</span><small>${esc(dayLbl(f.at))} ${esc(hm(f.at))}</small></li>`).join('')}</ul>`) : '')
    + avisos(); };
// a jornada a mostrar de um campeonato: hoje; senão a próxima; senão a última (a ESPN dá a última jornada quando hoje não há jogos)
const jorn = m => { const td = U.today(), today = m.ev.filter(e => U.iso(new Date(e.d)) === td); if (today.length) return { t: 'Hoje', L: today };
  const fut = m.ev.filter(e => e.d > Date.now()).length ? m.ev : (m.next || []); if (fut.length && fut[0].d > Date.now() - 864e5) return { t: 'Próxima jornada · ' + dayLbl(fut[0].d), L: fut };
  const pas = m.ev.length ? m.ev : (m.prev || []); return pas.length ? { t: 'Última jornada · ' + dayLbl(pas[0].d), L: pas } : null; };
const avisos = () => { const a = av(), perm = 'Notification' in window ? Notification.permission : 'na';
  return `<section class="pn fb-av"><div class="pn-h"><h3>${UI.ic('bell')}Avisos</h3>${perm === 'granted' ? '<span class="bdg pos">ligados neste aparelho</span>' : perm === 'na' ? '' : `<button class="btn sm" data-act="fbNotif">Ligar avisos neste aparelho</button>`}</div>
  <div class="fb-tg">${[['ini', 'Começo do jogo'], ['gol', 'Golos'], ['int', 'Intervalo'], ['fim', 'Resultado final'], ['comp', 'Também os jogos dos campeonatos que segues']].map(([k, l]) => `<label class="fb-sw"><input type="checkbox" data-act="fbAv" data-k="${k}" ${a[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
  <small class="mut">Os avisos chegam com o Prumo aberto; no computador e no Android também com ele em segundo plano. No iPhone, com o app fechado, ainda não chegam.</small></section>`; };
const card = t => { const m = tmOf(t.id), ev = m ? m.ev : [], lv = ev.find(e => e.st === 'in'), nx = ev.find(e => e.st === 'pre' && !/POSTPONED/.test(e.sn) && e.d > Date.now() - 2 * 36e5), form = ev.filter(done).slice(-5).map(e => wdl(e, t.id)).filter(Boolean);
  return `<button type="button" class="fb-card" data-act="fbTeam" data-id="${esc(t.id)}" style="--tc:${col(m && m.col || t.col)}"><span class="fb-band" aria-hidden="true"></span>${cr((m && m.logo) || t.logo, t.n, 64, 'big')}
    <b class="fb-cn">${esc(tN(t.n))}</b><small class="fb-cs">${esc(posOf(t) || subT(t))}</small>
    ${lv ? `<span class="fb-cl">${liveTag(lv)} <b>${esc(sc0(lv.h.s))}-${esc(sc0(lv.a.s))}</b> ${esc(tN(opp(lv, t.id).sn))}</span>` : nx ? `<span class="fb-cx">${cr(opp(nx, t.id).logo, opp(nx, t.id).n, 18)}<span>${esc(dayLbl(nx.d))} ${esc(hm(nx.d))} · ${nx.h.id === t.id ? 'em casa' : 'fora'}<br>vs ${esc(tN(opp(nx, t.id).sn))}</span></span>` : m ? '<span class="fb-cx mut">Sem jogos marcados</span>' : '<span class="fb-cx mut">A carregar…</span>'}
    ${form5(form)}</button>`; };
// sugestões com escudo (procuradas uma vez e guardadas no aparelho)
const QTC = U.ls.get('oc_fut_qt', {}) || {};
const needQT = () => { const miss = QT.filter(q => !(q in QTC)); if (!miss.length) return; ensure('qt', () => true, () => pool(miss, 3, async q => { try { const R = await search(q, 't'); QTC[q] = R[0] || null; } catch (e) { } }).then(() => U.ls.set('oc_fut_qt', QTC))); };
P.equipas = () => { const s = st(); s.teams.forEach(needTeam); s.teams.forEach(t => needTable(t.lg)); needQT(); const on = new Set(s.teams.map(t => t.id));
  const sug = QT.map(q => QTC[q]).filter(t => t && !on.has(t.id)); sug.forEach(t => { if (!RES.has(t.id)) RES.set(t.id, t); });
  return `<section class="fb-find">${searchBox('t')}</section>`
    + sec('As tuas equipas e seleções', s.teams.length ? `<div class="fb-cards">${s.teams.map(card).join('')}</div>` : `<p class="mut fb-none">Ainda não segues nenhuma. Procura acima pelo nome (clubes de qualquer país e seleções, masculinas e femininas) ou escolhe uma das sugestões.</p>`)
    + (sug.length ? sec('Sugestões', `<div class="fb-sug">${sug.map(t => `<div class="fb-sg"><button type="button" class="fb-sgo" data-act="fbTeam" data-id="${esc(t.id)}">${cr(t.logo, t.n, 40)}<b>${esc(tN(t.n))}</b><small>${esc(subT(t))}</small></button><button type="button" class="fb-star" data-act="fbFollow" data-id="${esc(t.id)}" aria-label="Seguir ${esc(tN(t.n))}">${UI.ic('plus')}</button></div>`).join('')}</div>`)
      : !Object.keys(QTC).length ? `<div class="fb-chips"><small>Atalhos:</small>${QT.map(q => `<button type="button" class="chip" data-act="fbQuick" data-q="${esc(q)}" data-k="t">${esc(q)}</button>`).join('')}</div>` : ''); };
const tFind = id => st().teams.find(x => x.id === id) || RES.get(id) || null;
const teamHero = (t, m, on) => { const o = rowOf(t), r = o && o.r, ev = m ? m.ev : [], form = ev.filter(done).slice(-5).map(e => wdl(e, t.id)).filter(Boolean), logo = (m && m.logo) || t.logo;
  return `<section class="fb-tth" style="--tc:${col(m && m.col || t.col)}">${logo ? `<img class="fb-wm" src="${esc(img(logo, 400))}" alt="" aria-hidden="true" referrerpolicy="no-referrer">` : ''}
    <a class="fb-back" href="#futebol.equipas">${UI.ic('left')}<span>Equipas</span></a>
    <div class="fb-tth-in">${cr(logo, t.n, 96, 'big')}<div class="fb-tth-t"><h2>${esc(tN(t.n))}</h2><p>${esc(subT(t))}</p>${form5(form)}</div>
      <button class="btn ${on ? 'fb-btn-l' : 'pri'}" data-act="fbFollow" data-id="${esc(t.id)}">${UI.ic(on ? 'check' : 'star')}${on ? 'A seguir' : 'Seguir'}</button></div>
    ${r ? `<div class="fb-kp"><span><b>${r.pos}.º</b><small>${esc(o.T.groups.length > 1 && o.g.name ? o.g.name.replace(/^Group/, 'Grupo') : lgN(t.lg))}</small></span><span><b>${r.pts}</b><small>pontos</small></span><span><b>${r.j}</b><small>jogos</small></span><span><b>${r.v}-${r.e}-${r.d}</b><small>V-E-D</small></span><span><b>${r.gm}:${r.gs}</b><small>golos</small></span></div>` : ''}</section>`; };
P.equipa = () => { const t = tFind(OS.ui.fbT); if (!t) return P.equipas(); needTeam(t); needTable(t.lg); const m = tmOf(t.id), on = st().teams.some(x => x.id === t.id);
  if (m) { m.comps.forEach(needTable); needLogos(m.comps); }
  const ev = m ? m.ev : [], lv = ev.filter(e => e.st === 'in'), nx = ev.filter(e => e.st === 'pre' && !/POSTPONED/.test(e.sn) && e.d > Date.now() - 2 * 36e5), ls = ev.filter(done).reverse();
  if (!m) return teamHero(t, m, on) + (errBox('t' + t.id) || loading());
  const tabs = m.comps.filter(s => !/friendly|cwc|copa|taca|cup|pokal|coupe|coppa|del_rey|fa$|recopa|super/.test(s) || /libertadores|sudamericana|champions|europa|nations|worldq|america|euro/.test(s));
  (lv.length ? lv : nx.slice(0, 1)).forEach(needSum);
  return teamHero(t, m, on) + errBox('t' + t.id) + (lv.length ? hero(lv.map(e => placard(e)).join('')) : nx[0] ? hero(placard(nx[0], 'Próximo jogo')) : '')
    + (nx.length > (lv.length ? 0 : 1) ? sec('Calendário', grid(nx.slice(lv.length ? 0 : 1, 9).map(e => mCard(e, { me: t.id })))) : '')
    + (ls.length ? sec('Resultados', grid(ls.slice(0, 9).map(e => mCard(e, { me: t.id })))) : '')
    + tabs.map(s => { const T = TB[s]; if (T && !T.groups.some(g => g.rows.some(r => r.id === t.id))) return ''; return sec(`${lgImg(s, 22)}Classificação · ${esc(lgN(s))}`, table(s, { only: t.id }), `<button class="btn xs ghost" data-act="fbComp" data-slug="${esc(s)}">Tabela completa ${UI.ic('right')}</button>`); }).join('')
    + plantel(t)
    + sec('Competições', `<div class="fb-chips">${m.comps.map(s => `<button type="button" class="chip fb-lgch" data-act="fbComp" data-slug="${esc(s)}">${lgImg(s, 20)}${esc(lgN(s))}</button>`).join('')}</div>`) + '<p class="mut fb-src">Dados da ESPN.</p>'; };
const cFollow = slug => st().comps.some(c => c.slug === slug);
const lgCard = (slug, n, info) => { const on = cFollow(slug); return `<div class="fb-lgc${on ? ' on' : ''}"><button type="button" class="fb-lgo" data-act="fbComp" data-slug="${esc(slug)}">${lgImg(slug, 44)}<span><b>${esc(lgN(slug, n))}</b><small>${info || esc(REG[slug] || '')}</small></span></button><button type="button" class="fb-star${on ? ' on' : ''}" data-act="fbFollowC" data-slug="${esc(slug)}" aria-pressed="${on}" aria-label="${on ? 'Deixar de seguir' : 'Seguir'} ${esc(lgN(slug, n))}">${UI.ic(on ? 'check' : 'plus')}</button></div>`; };
P.campeonatos = () => { const s = st(); s.comps.forEach(c => needComp(c.slug)); needLogos(POP.flatMap(([, L]) => L).concat(s.comps.map(c => c.slug)));
  return `<section class="fb-find">${searchBox('l')}</section>`
    + sec('Os teus campeonatos', s.comps.length ? `<div class="fb-lgs mine">${s.comps.map(c => { const m = CM[c.slug], lv = m ? m.ev.filter(e => e.st === 'in').length : 0, J = m && jorn(m);
      return lgCard(c.slug, c.n, lv ? `<span class="fb-live"><i></i>${lv} ao vivo</span>` : J ? esc(J.t + ' · ' + J.L.length + ' jogo(s)') : esc((m && m.season) || '')); }).join('')}</div>` : `<p class="mut fb-none">Toca no + de um campeonato para o seguir, ou procura qualquer outro pelo nome.</p>`)
    + POP.map(([g, L]) => sec(g, `<div class="fb-lgs">${L.map(slug => lgCard(slug)).join('')}</div>`)).join(''); };
P.campeonato = () => { const slug = OS.ui.fbC; if (!slug) return P.campeonatos(); needComp(slug); needTable(slug); needLogos([slug]); const m = CM[slug], on = cFollow(slug), c = st().comps.find(x => x.slug === slug) || RESL.get(slug) || {};
  const T = TB[slug], lead = T && T.groups.length === 1 && T.groups[0].rows[0];
  const head = hero(`<a class="fb-back" href="#futebol.campeonatos">${UI.ic('left')}<span>Campeonatos</span></a><div class="fb-cth">${(() => { const u = lgLogo(slug) || c.logo; return u ? `<span class="fb-cthl"><img src="${esc(img(u, 192))}" alt="" width="96" height="96" referrerpolicy="no-referrer"></span>` : `<span class="fb-cthl">${UI.ic('award')}</span>`; })()}
    <div class="fb-ctht"><h2>${esc(lgN(slug, (m && m.name) || c.n))}</h2><p>${esc((m && m.season) || '')}</p>${lead ? `<span class="fb-lead">${cr(lead.logo, lead.n, 22)}Líder: <b>${esc(tN(lead.sn))}</b> · ${lead.pts} pts</span>` : ''}</div>
    <button class="btn ${on ? 'fb-btn-l' : 'pri'}" data-act="fbFollowC" data-slug="${esc(slug)}">${UI.ic(on ? 'check' : 'star')}${on ? 'A seguir' : 'Seguir'}</button></div>`, 'fb-hc');
  if (!m) return head + (errBox('c' + slug) || loading());
  const lv = m.ev.filter(e => e.st === 'in'), J = jorn(m), seen = new Set(J ? J.L.map(e => e.id) : []); lv.slice(0, 2).forEach(needSum);
  const nx = (m.next || []).filter(e => !seen.has(e.id)), pv = (m.prev || []).filter(e => !seen.has(e.id));
  return head + errBox('c' + slug) + (lv.length ? hero(lv.slice(0, 2).map(e => placard(e)).join('')) : '')
    + (J ? sec(esc(J.t), grid(J.L.slice(0, 12).map(e => mCard(e, { nolg: 1 })))) : '')
    + (nx.length && !/^Próxima/.test(J ? J.t : '') ? sec('Próxima jornada · ' + esc(dayLbl(nx[0].d)), grid(nx.slice(0, 12).map(e => mCard(e, { nolg: 1 })))) : '')
    + (pv.length && !/^Última/.test(J ? J.t : '') ? sec('Última jornada · ' + esc(dayLbl(pv[0].d)), grid(pv.slice(0, 12).map(e => mCard(e, { nolg: 1 })))) : '')
    + (T && !T.groups.length ? '' : sec('Classificação', podium(slug) + table(slug))); };
V.futebol = sub => { const k = P[sub || ''] ? (sub || '') : '', tk = k === 'equipa' ? 'equipas' : k === 'campeonato' ? 'campeonatos' : k;
  return UI.head('Futebol', 'As tuas equipas, seleções e campeonatos do mundo: jogos ao vivo, resultados, tabelas e avisos de golo.', `<button class="btn sm ghost" data-act="fbRefresh">${UI.ic('sync')}Atualizar</button>`, 'Visão geral')
    + UI.tabs('futebol', TABS, tk) + `<div class="fb">${P[k]()}</div>`; };

/* ---------- pesquisa ---------- */
const search = async (q, kind) => { const n = norm(q).replace(/^selecao( (de|do|da|dos|das))? /, ''), alt = kind === 't' ? (CTY[n] || '') : (LQ[n] || ''), qs = [...new Set([alt, q].filter(Boolean))];
  const js = await Promise.all(qs.map(x => get(SR + '?query=' + encodeURIComponent(x) + '&limit=25', 10 * 6e4).catch(() => null))); if (js.every(j => !j)) throw new Error('sem ligação');
  const out = new Map(); js.forEach(j => ((j && j.results) || []).forEach(rt => { if (rt.type !== (kind === 't' ? 'team' : 'league')) return; (rt.contents || []).forEach(c => { if (c.sport !== 'soccer') return;
    if (kind === 't') { const id = ((c.uid || '').match(/~t:(\d+)/) || [])[1]; if (!id || out.has(id)) return; const t = { id, n: c.displayName || '', logo: (c.image && c.image.default) || '', lg: c.defaultLeagueSlug || '', sub: c.subtitle || '' }; t.nat = isNat(t) ? 1 : 0; out.set(id, t); RES.set(id, t); }
    else { const slug = c.defaultLeagueSlug || ((c.link && c.link.web) || '').split('/name/')[1] || ''; if (!slug || out.has(slug)) return; const L = { slug, n: c.displayName || '', logo: (c.image && c.image.default) || '' }; out.set(slug, L); RESL.set(slug, L); } }); }));
  return [...out.values()].slice(0, 16); };
const resT = t => { const on = st().teams.some(x => x.id === t.id); return `<div class="fb-ri">${cr(t.logo, t.n, 36)}<button type="button" class="fb-rn" data-act="fbTeam" data-id="${esc(t.id)}"><b>${esc(tN(t.n))}</b><small>${esc(subT(t))}</small></button><button type="button" class="btn sm ghost" data-act="fbTeam" data-id="${esc(t.id)}">Ver</button><button type="button" class="btn sm ${on ? '' : 'pri'}" data-act="fbFollow" data-id="${esc(t.id)}">${on ? 'A seguir' : 'Seguir'}</button></div>`; };
const resL = c => { const on = cFollow(c.slug); return `<div class="fb-ri">${cr(c.logo, c.n, 36)}<button type="button" class="fb-rn" data-act="fbComp" data-slug="${esc(c.slug)}"><b>${esc(lgN(c.slug, c.n))}</b><small>${esc(LG[c.slug] ? c.n : '')}</small></button><button type="button" class="btn sm ghost" data-act="fbComp" data-slug="${esc(c.slug)}">Ver</button><button type="button" class="btn sm ${on ? '' : 'pri'}" data-act="fbFollowC" data-slug="${esc(c.slug)}">${on ? 'A seguir' : 'Seguir'}</button></div>`; };
let qT = 0, qSeq = 0;
const find = async (q, kind) => { const box = document.getElementById('fbRes'); LASTQ[kind].q = q; if (q.length < 2) { LASTQ[kind].h = ''; if (box) box.innerHTML = ''; return; } const my = ++qSeq; if (box) box.innerHTML = '<div class="fb-rl">A procurar…</div>';
  let h; try { const R = await search(q, kind); h = R.length ? R.map(kind === 't' ? resT : resL).join('') : `<div class="fb-rl">Não encontrei "${esc(q)}". Experimenta outro nome ou só uma parte (ex.: "Inter", "Bayern", "Paris").</div>`; }
  catch (e) { h = '<div class="fb-rl">Sem ligação para procurar agora. Tenta outra vez daqui a pouco.</div>'; }
  if (my !== qSeq) return; LASTQ[kind].h = h; const b2 = document.getElementById('fbRes'); if (b2) b2.innerHTML = h; };
document.addEventListener('input', e => { const el = e.target; if (!el || !el.dataset || !el.dataset.fbq) return; clearTimeout(qT); const q = el.value.trim(), k = el.dataset.fbq; LASTQ[k].q = el.value; qT = setTimeout(() => find(q, k), 380); });
OS.forms.fbFind = (f, v) => { const i = f.querySelector('[data-fbq]'); clearTimeout(qT); find(String(v('q') || '').trim(), i ? i.dataset.fbq : 't'); };
A.fbQuick = b => { const k = b.dataset.k || 't', i = document.querySelector('[data-fbq]'); if (i) i.value = b.dataset.q; find(b.dataset.q, k); };

/* ---------- ações ---------- */
const refreshBtns = () => { const box = document.getElementById('fbRes'); if (box && LASTQ.t.h) { const re = [...RES.values()].filter(t => box.querySelector(`[data-act=fbFollow][data-id="${t.id}"]`)); if (re.length) { LASTQ.t.h = re.map(resT).join(''); box.innerHTML = LASTQ.t.h; } } };
A.fbFollow = b => { const id = b.dataset.id, s = st(), has = s.teams.some(t => t.id === id), t = tFind(id); if (!t) return;
  if (has) { save({ teams: s.teams.filter(x => x.id !== id) }); UI.toast(`Deixaste de seguir ${tN(t.n)}`); }
  else { save({ teams: s.teams.concat([{ id, n: t.n, logo: t.logo, lg: t.lg, sub: t.sub || '', nat: isNat(t) ? 1 : 0 }]) }); UI.toast(`${tN(t.n)} está nas tuas equipas`, 'pos'); loop(1500); }
  refreshBtns(); OS.request(); };
A.fbFollowC = b => { const slug = b.dataset.slug, s = st(), has = cFollow(slug), L = RESL.get(slug) || { slug, n: lgN(slug), logo: (CM[slug] && CM[slug].logo) || '' };
  save({ comps: has ? s.comps.filter(c => c.slug !== slug) : s.comps.concat([{ slug, n: L.n || lgN(slug), logo: L.logo || '' }]) }); UI.toast(has ? `Deixaste de seguir: ${lgN(slug, L.n)}` : `A seguir: ${lgN(slug, L.n)}`, has ? '' : 'pos');
  const box = document.getElementById('fbRes'); if (box && LASTQ.l.h) { const re = [...RESL.values()].filter(c => box.querySelector(`[data-act=fbFollowC][data-slug="${c.slug}"]`)); if (re.length) { LASTQ.l.h = re.map(resL).join(''); box.innerHTML = LASTQ.l.h; } }
  if (!has) loop(1500); OS.request(); };
A.fbTeam = b => { OS.ui.fbT = b.dataset.id; location.hash = 'futebol.equipa'; OS.request(); };
A.fbTeamRow = b => { const id = b.dataset.id; if (!tFind(id)) RES.set(id, { id, n: b.dataset.n, logo: b.dataset.logo, lg: b.dataset.lg, sub: '' }); OS.ui.fbT = id; location.hash = 'futebol.equipa'; OS.request(); };
A.fbComp = b => { OS.ui.fbC = b.dataset.slug; location.hash = 'futebol.campeonato'; OS.request(); };
A.fbRefresh = () => { MEM.clear(); Object.keys(TRY).forEach(k => delete TRY[k]); Object.keys(ERR).forEach(k => delete ERR[k]); Object.keys(TM).forEach(k => { TM[k].at = 0; }); Object.keys(CM).forEach(k => { CM[k].at = 0; }); Object.keys(TB).forEach(k => { TB[k].at = 0; }); UI.toast('A atualizar…'); OS.request(); };
A.fbAv = b => { save({ av: Object.assign(av(), { [b.dataset.k]: b.checked ? 1 : 0 }) }); };
A.fbNotif = async () => { if (!('Notification' in window)) return UI.toast('Este aparelho não deixa o app mandar avisos. No iPhone, instala o Prumo no ecrã principal.', 'warn'); const p = await Notification.requestPermission(); UI.toast(p === 'granted' ? 'Avisos ligados neste aparelho' : 'Os avisos ficaram desligados (podes ligar nas definições do aparelho)', p === 'granted' ? 'pos' : 'warn'); OS.request(); };

/* ---------- detalhe do jogo ---------- */
const STATS = [['possessionPct', 'Posse de bola', '%'], ['totalShots', 'Remates'], ['shotsOnTarget', 'Remates à baliza'], ['wonCorners', 'Cantos'], ['accuratePasses', 'Passes certos'], ['totalTackles', 'Desarmes'], ['interceptions', 'Interceções'], ['saves', 'Defesas'], ['foulsCommitted', 'Faltas'], ['offsides', 'Foras de jogo'], ['yellowCards', 'Cartões amarelos'], ['redCards', 'Cartões vermelhos']];
const mBody = e => { const S = SUM[e.id] && SUM[e.id].j, bx = (S && S.boxscore && S.boxscore.teams) || [], tOf = id => bx.find(x => String(x.team && x.team.id) === id), th = tOf(e.h.id), ta = tOf(e.a.id);
  const val = (t, k) => { const x = t && (t.statistics || []).find(s => s.name === k); return x ? U.num(x.displayValue) : null; };
  const rows = e.st === 'pre' ? '' : STATS.map(([k, l, u]) => { const a = val(th, k), b = val(ta, k); if (a == null && b == null) return ''; const tot = (a || 0) + (b || 0) || 1; return `<div class="fb-st"><b>${a == null ? '–' : a}${u || ''}</b><span>${l}<i><s style="width:${Math.round((a || 0) / tot * 100)}%"></s><s style="width:${Math.round((b || 0) / tot * 100)}%"></s></i></span><b>${b == null ? '–' : b}${u || ''}</b></div>`; }).join('');
  const tl = (e.ke || []).slice().sort((x, y) => U.num(x.min) - U.num(y.min)).map(k => `<li class="${k.tid === e.h.id ? 'h' : 'a'} ${k.t}"><span class="fb-km">${esc(k.min)}</span><span class="fb-kt">${k.t === 'g' ? UI.ic('ball') : k.t === 'og' ? UI.ic('ball') : '<i class="fb-card-' + k.t + '"></i>'}${esc(k.who || '')}${k.t === 'og' ? ' (pb)' : ''}</span></li>`).join('');
  const RR = { W: 'v', D: 'e', L: 'd' }, frm = side => { const L = ((S && S.lastFiveGames) || []).find(x => String(x.team && x.team.id) === side.id); return L && (L.events || []).length ? `<div class="fb-fr">${cr(side.logo, side.n, 22)}<b>${esc(tN(side.sn))}</b><span class="fb-form">${L.events.slice().reverse().map(g => `<i class="${RR[g.gameResult] || ''}" title="${esc((g.atVs === '@' ? 'fora, ' : 'casa, ') + ((g.opponent && g.opponent.displayName) || '') + ' ' + (g.score || ''))}">${(RR[g.gameResult] || '?').toUpperCase()}</i>`).join('')}</span></div>` : ''; };
  const ss = ((S && S.seasonseries) || []).find(x => (x.events || []).length), h2 = ss ? (() => { let wh = 0, wa = 0, dr = 0; const L = ss.events.slice(0, 5).map(g => { const cs = g.competitors || [], ch = cs.find(c => String((c.team && c.team.id) || c.id) === e.h.id), ca = cs.find(c => String((c.team && c.team.id) || c.id) === e.a.id); if (!ch || !ca) return ''; const x = U.num(ch.score), y = U.num(ca.score); if (x > y) wh++; else if (y > x) wa++; else dr++; const hm2 = cs[0], aw2 = cs[1];
      return `<li><small>${esc(g.date ? U.fmtD ? U.fmtD(String(g.date).slice(0, 10)) : String(g.date).slice(0, 10) : '')}</small><span>${esc(tN((hm2.team && (hm2.team.shortDisplayName || hm2.team.displayName || hm2.team.abbreviation)) || ''))} <b>${esc(hm2.score || '0')}–${esc(aw2.score || '0')}</b> ${esc(tN((aw2.team && (aw2.team.shortDisplayName || aw2.team.displayName || aw2.team.abbreviation)) || ''))}</span></li>`; }).join('');
    return L ? `<div class="fb-h2"><span><b>${wh}</b> ${esc(tN(e.h.sn))}</span><span><b>${dr}</b> empates</span><span><b>${wa}</b> ${esc(tN(e.a.sn))}</span></div><ul class="fb-h2l">${L}</ul>` : ''; })() : '';
  const fr = frm(e.h) + frm(e.a);
  return `<div class="fb-md">${hero(placard(e))}${e.ven ? `<p class="mut fb-ven">${esc(e.ven)}</p>` : ''}${aiBox(e)}${tl ? `<h4>Lances</h4><ul class="fb-tlv">${tl}</ul>` : ''}${rows ? `<h4>Estatísticas${e.st === 'in' ? ' ao vivo' : ''}</h4><div class="fb-sts">${rows}</div>` : ''}${(() => { const L = [lineupOf(S, e.h.id), lineupOf(S, e.a.id)], P2 = [PROB[e.h.id], PROB[e.a.id]].map(x => x && !x.none ? x : null); if (!L[0] && !L[1] && !P2[0] && !P2[1]) return e.st === 'pre' && S && !(PROB[e.h.id] && PROB[e.a.id]) ? `<h4>Escalações</h4>${loading('A preparar as escalações prováveis…')}` : ''; const off = !!(L[0] || L[1]); return `<h4>${off ? 'Escalações' : 'Escalações prováveis'}</h4>${off ? '' : `<p class="mut fb-xin">Ainda não saíram as escalações oficiais. Estas são as mais prováveis pelos titulares dos últimos jogos.</p>`}<div class="fb-xis">${[[e.h, 0], [e.a, 1]].map(([x, i]) => { const l = L[i] || (!off && P2[i]); return l ? xiBox(l, x, L[i] ? (e.st === 'pre' ? 'oficial' : 'em campo') : 'provável', coachOf(x.id), e.lg) : ''; }).join('')}</div>`; })()}${fr ? `<h4>Forma (últimos 5 jogos)</h4>${fr}` : ''}${h2 ? `<h4>Confronto direto (últimos jogos)</h4>${h2}` : ''}${!S ? loading('A buscar o detalhe do jogo…') : ''}</div>`; };
const mdRedraw = id => { const b = document.getElementById('fbMd'), e = EVX.get(id); if (b && e && b.dataset.id === id) b.innerHTML = mSafe(e); };
A.fbAI = async b => { const id = b.dataset.id, e = EVX.get(id); if (!e || AIBUSY.has(id)) return; if (!OS.AI || !OS.AI.json) return UI.toast('A IA não está disponível neste aparelho', 'warn');
  AIBUSY.add(id); delete AIERR[id]; mdRedraw(id);
  try { await aiRun(e); } catch (x) { AIERR[id] = /não está ligada/i.test((x && x.message) || '') ? 'A IA ainda não está ligada: liga-a em Definições › IA.' : 'A IA não conseguiu analisar agora (' + ((x && x.message) || 'erro') + '). Tenta outra vez.'; }
  finally { AIBUSY.delete(id); mdRedraw(id); req(); } };
A.fbTeamAI = async b => { const id = b.dataset.id, t = tFind(id); if (!t || TIBUSY.has(id)) return; if (!OS.AI || !OS.AI.json) return UI.toast('A IA não está disponível neste aparelho', 'warn');
  TIBUSY.add(id); delete TIERR[id]; OS.request();
  try { await teamAI(t); } catch (x) { TIERR[id] = /não está ligada/i.test((x && x.message) || '') ? 'A IA ainda não está ligada: liga-a em Definições › IA.' : 'A IA não conseguiu procurar agora (' + ((x && x.message) || 'erro') + ').'; }
  finally { TIBUSY.delete(id); OS.request(); } };
let mdT = 0;
const evFind = id => EVX.get(id) || [].concat(...Object.values(TM).map(m => m.ev), ...Object.values(SNAP).map(m => m.ev || []), ...Object.values(CM).map(m => [].concat(m.ev || [], m.next || [], m.prev || []))).find(x => x && x.id === id) || null;
const mSafe = e => { try { return mBody(e); } catch (x) { return `<div class="fb-md">${(() => { try { return hero(placard(e)); } catch (y) { return ''; } })()}<p class="note">Não consegui mostrar todos os detalhes deste jogo (${esc((x && x.message) || 'erro')}). Fecha e abre outra vez.</p></div>`; } };
A.fbMatch = b => { const e = evFind(b.dataset.id); if (!e) { UI.toast('A carregar este jogo… toca outra vez daqui a um instante'); A.fbRefresh && A.fbRefresh(); return; } EVX.set(e.id, e); clearTimeout(mdT);
  UI.modal(`<div class="row between" style="align-items:center"><h3 style="margin:0">${esc(lgN(e.lg, e.lgF))}</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><div id="fbMd" data-id="${esc(e.id)}">${mSafe(e)}</div>`, 'fb-modal');
  const upd = async () => { if (!document.getElementById('fbMd')) return; try { if (e.st !== 'pre' || !SUM[e.id]) await liveEv(e, e.st === 'in' ? 2e4 : 10 * 6e4); } catch (x) { } const box = document.getElementById('fbMd'); if (!box) return; box.innerHTML = mSafe(e);
    const S = SUM[e.id] && SUM[e.id].j; if (e.st === 'pre' && S && !lineupOf(S, e.h.id) && !lineupOf(S, e.a.id) && (!PROB[e.h.id] || !PROB[e.a.id])) Promise.all([e.h, e.a].map(x => PROB[x.id] ? 0 : loadProbable(x, e.lg).catch(() => { PROB[x.id] = { at: Date.now(), none: 1 }; }))).then(() => mdRedraw(e.id));
    if (e.st === 'in') mdT = setTimeout(upd, 3e4); };
  upd(); };

OS.Futebol = { tick, liveN, state: () => ({ TM, CM, TB, SEEN, FEED }), loop, _clearCache: () => MEM.clear(), _sumReset: id => { delete SUM[id]; [...MEM.keys()].forEach(k => { if (k.includes('event=' + id)) MEM.delete(k); }); }, _reset: () => { MEM.clear(); [TM, CM, TB, TRY, ERR].forEach(o => Object.keys(o).forEach(k => delete o[k])); Object.keys(SEEN).forEach(k => delete SEEN[k]); FEED.splice(0); DISC = {}; SNAP = {}; } };
})();
