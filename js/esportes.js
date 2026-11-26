/* PRUMO — Desportos (Eu): o futebol e os outros desportos num só sítio, com as equipas que segues, o que está ao vivo,
   resultados, próximos jogos e classificações (ESPN), e as Olimpíadas com as datas e a contagem até à próxima edição.
   Futebol abre a página de Futebol que já existe; NBA, WNBA, NFL, MLB, NHL, basquetebol e futebol americano universitários
   têm jogos do dia, classificação e equipas para seguir; a Fórmula 1 tem o próximo Grande Prémio com as sessões e as
   classificações; o ténis (ATP e WTA) os jogos do torneio; o UFC o próximo evento com os combates; o golfe a classificação.
   MotoGP: o fim de semana com as sessões, os resultados, o campeonato e o calendário (API pública da MotoGP, pelo servidor do Prumo).
   Copa do Mundo (masculina e feminina): só os jogos oficiais (fase final e eliminatórias); antes de começar, a contagem até à próxima.
   Avisos: 15 minutos antes, começo, golos/pontos/sets e resultado final das equipas que segues; F1 e MotoGP com o sino. */
(() => {
'use strict';
const OS = window.OS, U = OS.U, UI = OS.UI, A = OS.act, V = OS.views, { esc } = U;
OS.ONE_DEF.sports = { teams: [], mine: ['nba', 'f1'] };
const st = () => { const s = OS.one('sports'); if (!Array.isArray(s.teams)) s.teams = []; if (s.teams.some(t => t.lg === 'volei')) s.teams = s.teams.filter(t => t.lg !== 'volei'); // o voleibol saiu dos Desportos
  if (!Array.isArray(s.mine)) s.mine = []; if (s.mine.includes('ufc')) s.mine = [...new Set(s.mine.map(k => k === 'ufc' ? 'mma' : k))]; return s; };
const save = () => OS.touch('sports');

/* ícones dos desportos (traço, 24×24) */
Object.assign(UI.IP, {
  bell: UI.IP.bell || 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2.5h-15zM10 20.5a2 2 0 0 0 4 0',
  sp_bask: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3v18M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8',
  sp_amf: 'M4 20C4 11 11 4 20 4c0 9-7 16-16 16zM9 15l6-6M10 12l2 2M12 10l2 2',
  sp_base: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM7 5c2 2.2 2 11.8 0 14M17 5c-2 2.2-2 11.8 0 14',
  sp_hock: 'M5 3l6 13h7M3 19h18M15 19v-3h5',
  sp_f1: 'M3 15h18M5 15l2-5h7l3 3h3M7 18a2 2 0 1 0 0-.01M17 18a2 2 0 1 0 0-.01M9 10V7',
  sp_ten: 'M9.5 3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM14 15l6 6M4 6c3 1 6 4 7 7M19 4a1.5 1.5 0 1 0 0 .01',
  sp_mma: 'M7 10V6a2 2 0 0 1 4 0v4M11 9V5a2 2 0 0 1 4 0v5M15 9a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-3a2 2 0 0 1 2-2h3',
  sp_golf: 'M12 18V3l7 3.5-7 3.5M7 21c0-1.7 2.2-3 5-3s5 1.3 5 3',
  sp_oly: 'M2 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M16 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M5.5 13.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12.5 13.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  sp_moto: 'M5 17a3 3 0 1 0 0-.01M19 17a3 3 0 1 0 0-.01M8 17h6l3-6h-4l-2-3H8M14 11l-2-3M17 11l2 6',
  sp_cup: 'M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6'
});

/* os desportos: chave, nome, caminho na ESPN, tipo, cor, ícone, a que se refere */
const SP = [
  ['futebol', 'Futebol', '', 'fut', '#16a34a', 'ball', 'Equipas, seleções e campeonatos do mundo'],
  ['nba', 'NBA', 'basketball/nba', 'team', '#e11d48', 'sp_bask', 'Basquetebol dos EUA'],
  ['f1', 'Fórmula 1', 'racing/f1', 'f1', '#ef4444', 'sp_f1', 'Grandes Prémios e campeonato'],
  ['motogp', 'MotoGP', '', 'moto', '#f97316', 'sp_moto', 'Grandes Prémios de motos e campeonato'],
  ['copa', 'Copa do Mundo', '', 'copa', '#d97706', 'sp_cup', 'Masculina e feminina: só os jogos oficiais'],
  ['nfl', 'NFL', 'football/nfl', 'team', '#2563eb', 'sp_amf', 'Futebol americano'],
  ['atp', 'Ténis ATP', 'tennis/atp', 'ten', '#65a30d', 'sp_ten', 'Torneios masculinos'],
  ['wta', 'Ténis WTA', 'tennis/wta', 'ten', '#c026d3', 'sp_ten', 'Torneios femininos'],
  ['mma', 'MMA', 'mma/ufc', 'mma', '#dc2626', 'sp_mma', 'UFC, PFL, LFA, Cage Warriors e mais'],
  ['mlb', 'MLB', 'baseball/mlb', 'team', '#1d4ed8', 'sp_base', 'Basebol dos EUA'],
  ['nhl', 'NHL', 'hockey/nhl', 'team', '#0ea5e9', 'sp_hock', 'Hóquei no gelo'],
  ['wnba', 'WNBA', 'basketball/wnba', 'team', '#f97316', 'sp_bask', 'Basquetebol feminino dos EUA'],
  ['pga', 'Golfe PGA', 'golf/pga', 'golf', '#15803d', 'sp_golf', 'Circuito de golfe'],
  ['ncaab', 'Basquetebol universitário', 'basketball/mens-college-basketball', 'team', '#7c3aed', 'sp_bask', 'NCAA'],
  ['cfb', 'Futebol americano universitário', 'football/college-football', 'team', '#b45309', 'sp_amf', 'NCAA'],
  ['irl', 'IndyCar', 'racing/irl', 'f1', '#0891b2', 'sp_f1', 'Corridas nos EUA'],
  ['olimpiadas', 'Olimpíadas', '', 'oly', '#eab308', 'sp_oly', 'Datas, contagem e quadro de medalhas']];
const SPK = Object.fromEntries(SP.map(x => [x[0], x])); SPK.ufc = SPK.mma; // o UFC passou a estar dentro do MMA
const spOf = k => SPK[k] || null;

/* ESPN: primeiro direto; se o aparelho não conseguir, pelo servidor do Prumo (api/futebol aceita os desportos da ESPN) */
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/', V2 = 'https://site.api.espn.com/apis/v2/sports/';
const MEM = new Map(), INF = new Map(), ERR = {}; let VIA = navigator.webdriver ? Date.now() : 0;
const once = async (url, o) => { const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 12000);
  try { const r = await fetch(url, Object.assign({ signal: ac ? ac.signal : undefined }, o)); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { to && clearTimeout(to); } };
const get = (u, ttl) => { const m = MEM.get(u); if (m && Date.now() - m.at < ttl) return Promise.resolve(m.j); if (INF.has(u)) return INF.get(u);
  const viaApi = () => once('api/futebol?u=' + encodeURIComponent(u), { credentials: 'same-origin' });
  const p = (async () => { try { let j; if (Date.now() - VIA < 10 * 6e4) j = await viaApi(); else { try { j = await once(u, { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } }); } catch (e) { j = await viaApi(); VIA = Date.now(); } }
      MEM.set(u, { at: Date.now(), j }); return j; } catch (e) { if (m) return m.j; throw e; } finally { INF.delete(u); } })();
  INF.set(u, p); return p; };
// pedir uma vez e redesenhar quando chega
const DATA = {}, PEND = new Set(), FAIL = {};
// depois de uma falha espera 30 s antes de tentar outra vez (sem rede não fica a pedir sem parar)
const need = (k, ttl, f) => { const d = DATA[k]; if ((!d || Date.now() - d.at > ttl) && !PEND.has(k) && !(FAIL[k] && Date.now() - FAIL[k] < 3e4)) { PEND.add(k); f().then(v => { DATA[k] = { at: Date.now(), v }; delete ERR[k]; delete FAIL[k]; }).catch(e => { ERR[k] = (e && e.message) || 'erro'; FAIL[k] = Date.now(); }).finally(() => { PEND.delete(k); if (/^#(esportes|desportos)/.test(location.hash)) OS.request(); }); } return d ? d.v : null; };

/* ---------- normalizar ---------- */
const logoOf = t => (t && (t.logo || ((t.logos || [])[0] || {}).href)) || '';
const scoreOf = x => x == null ? '' : typeof x === 'object' ? String(x.displayValue != null ? x.displayValue : x.value != null ? x.value : '') : String(x);
const tSide = x => x && x.team ? { id: String(x.team.id), n: x.team.displayName || x.team.name || '', sn: x.team.shortDisplayName || x.team.displayName || '', ab: x.team.abbreviation || '', logo: logoOf(x.team), c: x.team.color ? '#' + x.team.color : '', s: scoreOf(x.score), w: !!x.winner, rec: ((x.records || x.record || [])[0] || {}).summary || '' } : null;
const tEv = (e, lg) => { const c = (e.competitions || [])[0] || {}, s = c.status || e.status || {}, ty = s.type || {}, cp = c.competitors || [];
  const h = cp.find(x => x.homeAway === 'home') || cp[0], a = cp.find(x => x.homeAway === 'away') || cp[1];
  return { id: String(e.id), lg, d: Date.parse(e.date || c.date), st: ty.state || 'pre', sn: ty.name || '', det: ty.shortDetail || ty.detail || '', h: tSide(h), a: tSide(a), name: e.shortName || e.name || '', ven: (c.venue && c.venue.fullName) || '' }; };
const dk = d => d.replace(/-/g, '');
const API = {
  board: (sp, day) => get(SITE + sp[2] + '/scoreboard' + (day ? '?dates=' + dk(day) : ''), 2e4),
  teams: sp => get(SITE + sp[2] + '/teams' + (sp[0] === 'ncaab' || sp[0] === 'cfb' ? '?limit=400' : ''), 864e5).then(j => (((((j.sports || [])[0] || {}).leagues || [])[0] || {}).teams || []).map(x => x.team).filter(Boolean).map(t => ({ id: String(t.id), n: t.displayName, sn: t.shortDisplayName || t.displayName, ab: t.abbreviation || '', logo: logoOf(t), c: t.color ? '#' + t.color : '' })).sort((a, b) => a.n.localeCompare(b.n))),
  sched: (sp, id) => get(SITE + sp[2] + '/teams/' + id + '/schedule', 10 * 6e4).then(j => (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a)),
  stand: sp => get(V2 + sp[2] + '/standings', 10 * 6e4).then(j => (j.children && j.children.length ? j.children : [j]).map(g => ({ name: g.name || '', rows: (((g.standings || {}).entries) || []).map(r => { const S = {}; (r.stats || []).forEach(x => { S[x.name || x.type] = x; }); const v = k => S[k] ? (S[k].displayValue != null ? S[k].displayValue : String(S[k].value)) : '';
    const who = r.team || r.athlete || {}; return { id: String(who.id || ''), n: who.displayName || who.name || '', logo: logoOf(who) || ((who.flag || {}).href || ''), w: v('wins'), l: v('losses'), t: v('ties') || v('otLosses'), pct: v('winPercent'), gb: v('gamesBehind'), seed: +v('playoffSeed') || +v('rank') || 0, pts: v('points') || v('championshipPts'), strk: v('streak') }; }).filter(r => r.n) })).filter(g => g.rows.length).map(g => { g.rows.sort((a, b) => (a.seed || 99) - (b.seed || 99) || (parseFloat(b.pct) || 0) - (parseFloat(a.pct) || 0)); return g; }))
};
API.mgp = () => once('api/futebol?mgp=1', { credentials: 'same-origin' }).then(j => { if (!j || !j.ok) throw new Error((j && j.msg) || 'sem dados'); return j; });
const isLive = e => e && e.st === 'in';
const tm = d => new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
const dayL = d => { const t = new Date(d), n = new Date(), k = x => x.toDateString(); if (k(t) === k(n)) return 'Hoje, ' + tm(d); const a = new Date(n); a.setDate(a.getDate() + 1); if (k(t) === k(a)) return 'Amanhã, ' + tm(d); const o = new Date(n); o.setDate(o.getDate() - 1); if (k(t) === k(o)) return 'Ontem';
  return t.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + tm(d); };
const img = (u, cls, alt) => u ? `<img class="${cls || ''}" src="${esc(u)}" alt="${esc(alt || '')}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="${cls || ''} sp-noimg">${esc(String(alt || '?').slice(0, 2).toUpperCase())}</span>`;
const isMine = (lg, id) => st().teams.some(t => t.lg === lg && t.id === id);

/* ---------- peças ---------- */
const spIc = (sp, big) => `<span class="sp-ic${big ? ' big' : ''}" style="--sc:${sp[4]}">${UI.ic(sp[5])}</span>`;
// cartão de um jogo (equipas): grande para o destaque, normal nas listas
const gCard = (e, o) => { o = o || {}; const sp = spOf(e.lg), lv = isLive(e), done = e.st === 'post', sc = (x, y) => done && x.w ? ' win' : done && y.w ? ' lose' : '';
  return `<div class="sp-g${lv ? ' live' : ''}${o.big ? ' big' : ''}" style="--sc:${sp ? sp[4] : '#64748b'};--hc:${e.h.c || '#334155'};--ac:${e.a.c || '#334155'}">
    <div class="sp-gt">${o.lg ? `<span class="sp-gl">${sp ? UI.ic(sp[5]) : ''}${esc(e.liga || (sp ? sp[1] : ''))}</span>` : ''}<span class="sp-gs${lv ? ' on' : ''}">${lv ? '<i></i>Ao vivo · ' : ''}${esc(lv || done ? e.det : dayL(e.d))}</span></div>
    ${[[e.a, e.h], [e.h, e.a]].map(([x, y], i) => `<div class="sp-gr${sc(x, y)}${isMine(e.lg, x.id) ? ' me' : ''}">${img(x.logo, 'sp-gi', x.ab || x.n)}<span class="sp-gn"><b>${esc(o.big ? x.n : x.sn)}</b>${x.rec ? `<small>${esc(x.rec)}</small>` : ''}${i ? '<small class="sp-ha">casa</small>' : ''}</span><b class="sp-gp">${esc(e.st === 'pre' ? '' : x.s)}</b></div>`).join('')}
  </div>`; };
const sec = (t, body, more) => `<section class="sp-sec"><div class="sp-sh"><h3>${t}</h3>${more || ''}</div>${body}</section>`;
const loading = t => `<div class="sp-ld"><span class="sp-sp"></span>${esc(t || 'A carregar…')}</div>`;
const errBox = k => ERR[k] ? `<p class="sp-err">Não consegui falar com a fonte dos resultados (${esc(ERR[k])}). <button type="button" class="btn xs" data-act="dsRetry" data-k="${esc(k)}">Tentar outra vez</button></p>` : '';

/* ---------- Olimpíadas ---------- */
const OLY = [
  { k: 'paris2024', t: 'Paris 2024', tp: 'Verão', ini: '2024-07-26', fim: '2024-08-11', para: ['2024-08-28', '2024-09-08'], sede: 'Paris, França', info: '32 desportos · 329 provas', c: '#1d4ed8' },
  { k: 'mc2026', t: 'Milão-Cortina 2026', tp: 'Inverno', ini: '2026-02-06', fim: '2026-02-22', para: ['2026-03-06', '2026-03-15'], sede: 'Milão e Cortina d’Ampezzo, Itália', info: '8 desportos · 116 provas', c: '#0891b2' },
  { k: 'dakar2026', t: 'Dakar 2026', tp: 'Juventude', ini: '2026-10-31', fim: '2026-11-13', sede: 'Dakar, Senegal', info: 'Jogos Olímpicos da Juventude', c: '#16a34a' },
  { k: 'la2028', t: 'Los Angeles 2028', tp: 'Verão', ini: '2028-07-14', fim: '2028-07-30', para: ['2028-08-15', '2028-08-27'], sede: 'Los Angeles, Estados Unidos', info: '36 desportos, com 5 novos: flag football, críquete, lacrosse, squash e basebol/softbol', c: '#e11d48' },
  { k: 'alpes2030', t: 'Alpes Franceses 2030', tp: 'Inverno', ini: '2030-02-01', fim: '2030-02-17', sede: 'Alpes Franceses e Nice, França', info: 'Jogos de Inverno', c: '#7c3aed' },
  { k: 'brisbane2032', t: 'Brisbane 2032', tp: 'Verão', ini: '2032-07-23', fim: '2032-08-08', sede: 'Brisbane, Austrália', info: 'Jogos de Verão', c: '#f59e0b' }];
const LA28 = ['Atletismo', 'Natação', 'Saltos para a água', 'Natação artística', 'Polo aquático', 'Ginástica', 'Futebol', 'Basquetebol', 'Basquetebol 3x3', 'Voleibol', 'Voleibol de praia', 'Andebol', 'Ténis', 'Ténis de mesa', 'Badminton', 'Judo', 'Taekwondo', 'Luta', 'Boxe', 'Esgrima', 'Halterofilismo', 'Tiro', 'Tiro com arco', 'Ciclismo', 'Hipismo', 'Remo', 'Canoagem', 'Vela', 'Triatlo', 'Pentatlo moderno', 'Golfe', 'Râguebi de sete', 'Hóquei em campo', 'Skate', 'Escalada', 'Surf', 'Basebol e softbol', 'Críquete', 'Flag football', 'Lacrosse', 'Squash'];
const NOVO = new Set(['Basebol e softbol', 'Críquete', 'Flag football', 'Lacrosse', 'Squash']);
// Paris 2024: quadro final (ouro, prata, bronze)
const MED24 = [['Estados Unidos', 40, 44, 42], ['China', 40, 27, 24], ['Japão', 20, 12, 13], ['Austrália', 18, 19, 16], ['França', 16, 26, 22], ['Países Baixos', 15, 7, 12], ['Grã-Bretanha', 14, 22, 29], ['Coreia do Sul', 13, 9, 10], ['Itália', 12, 13, 15], ['Alemanha', 12, 13, 8]];
const MED24X = { BR: ['Brasil', 3, 7, 10, 20], PT: ['Portugal', 1, 2, 1, 50] };
const D0 = s => new Date(s + 'T00:00:00');
const fmtD = s => D0(s).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtR = (a, b) => { const x = D0(a), y = D0(b); return x.getMonth() === y.getMonth() ? x.getDate() + ' a ' + y.getDate() + ' de ' + y.toLocaleDateString('pt-PT', { month: 'long' }) + ' de ' + y.getFullYear() : x.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) + ' a ' + fmtD(b); };
const olyNext = () => OLY.find(o => D0(o.fim).getTime() + 864e5 > Date.now() && o.tp !== 'Juventude') || OLY[OLY.length - 1];
const olyState = o => { const now = Date.now(), a = D0(o.ini).getTime(), b = D0(o.fim).getTime() + 864e5; return now < a ? 'pre' : now < b ? 'in' : 'post'; };
const countdown = o => { const ms = D0(o.ini).getTime() - Date.now(); if (ms <= 0) return ''; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
  return `<div class="sp-cd" data-cd="${esc(o.ini)}"><div><b>${d}</b><small>${d === 1 ? 'dia' : 'dias'}</small></div><div><b>${h}</b><small>horas</small></div></div>`; };
const olyCard = o => { const s = olyState(o); return `<div class="sp-oc ${s}" style="--oc:${o.c}"><span class="sp-ot">${esc(o.tp)}</span><h4>${esc(o.t)}</h4><p>${esc(fmtR(o.ini, o.fim))}</p><small>${esc(o.sede)}</small>${o.para ? `<small class="sp-op">Paralímpicos: ${esc(fmtR(o.para[0], o.para[1]))}</small>` : ''}${s === 'in' ? '<span class="sp-gs on"><i></i>A decorrer</span>' : s === 'post' ? '<span class="sp-oend">Terminados</span>' : ''}</div>`; };
const olyPage = () => { const n = olyNext(), cc = String((OS.one('profile') || {}).country || 'PT').toUpperCase(), me = MED24X[cc];
  return `<section class="sp-ohero" style="--oc:${n.c}"><div class="sp-oring">${UI.ic('sp_oly')}</div><span class="sp-ok">Próximos Jogos Olímpicos</span><h2>${esc(n.t)}</h2><p>${esc(fmtR(n.ini, n.fim))} · ${esc(n.sede)}</p>${olyState(n) === 'in' ? '<span class="sp-gs on big"><i></i>A decorrer agora</span>' : countdown(n)}<small>${esc(n.info)}</small></section>`
    + ((w => w && w !== n ? `<section class="sp-owin" style="--oc:${w.c}"><div><span class="sp-ok">Jogos Olímpicos de Inverno</span><h3>${esc(w.t)}</h3><p>${esc(fmtR(w.ini, w.fim))} · ${esc(w.sede)}</p>${w.para ? `<small>Paralímpicos: ${esc(fmtR(w.para[0], w.para[1]))}</small>` : ''}</div>${olyState(w) === 'in' ? '<span class="sp-gs on"><i></i>A decorrer</span>' : countdown(w)}</section>` : '')(OLY.find(o => o.tp === 'Inverno' && olyState(o) !== 'post')))
    + sec('Calendário das próximas edições', `<div class="sp-ocs">${OLY.filter(o => olyState(o) !== 'post').map(olyCard).join('')}</div>`)
    + sec('Los Angeles 2028: os desportos', `<div class="sp-chips">${LA28.map(x => `<span class="${NOVO.has(x) ? 'new' : ''}">${esc(x)}${NOVO.has(x) ? '<em>novo</em>' : ''}</span>`).join('')}</div><p class="sp-note">Os Jogos abrem a 14 de julho e fecham a 30 de julho de 2028; os Paralímpicos são de 15 a 27 de agosto de 2028.</p>`)
    + sec('Paris 2024: quadro de medalhas', `<div class="sp-tw"><table class="sp-tb sp-med"><thead><tr><th>#</th><th class="l">País</th><th title="Ouro"><i class="md g"></i></th><th title="Prata"><i class="md s"></i></th><th title="Bronze"><i class="md b"></i></th><th>Total</th></tr></thead><tbody>${MED24.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><b>${r[1] + r[2] + r[3]}</b></td></tr>`).join('')}${me ? `<tr class="me"><td>${me[4]}</td><td class="l">${esc(me[0])}</td><td>${me[1]}</td><td>${me[2]}</td><td>${me[3]}</td><td><b>${me[1] + me[2] + me[3]}</b></td></tr>` : ''}</tbody></table></div>`)
    + sec('Edições anteriores', `<div class="sp-ocs">${OLY.filter(o => olyState(o) === 'post').reverse().map(olyCard).join('')}</div>`); };


/* ---------- Copa do Mundo: masculina e feminina, só os jogos oficiais (os amigáveis ficam no Futebol) ---------- */
const COPA = {
  m: { lg: 'fifa.world', n: 'Copa do Mundo', ed: [{ t: 'Copa do Mundo 2030', ini: '2030-06-13', fim: '2030-07-21', sede: 'Marrocos, Portugal e Espanha', extra: 'Jogos do centenário a 8 e 9 de junho no Uruguai, na Argentina e no Paraguai. Datas previstas pela FIFA.', c: '#b45309' }, { t: 'Copa do Mundo 2034', ini: '2034-06-01', fim: '2034-07-31', sede: 'Arábia Saudita', extra: 'Datas por marcar.', c: '#047857', vago: 1 }], q: [] },
  f: { lg: 'fifa.wwc', n: 'Copa do Mundo Feminina', ed: [{ t: 'Copa do Mundo Feminina 2027', ini: '2027-06-24', fim: '2027-07-25', sede: 'Brasil', extra: '32 seleções; a primeira Copa feminina na América do Sul.', c: '#15803d' }], q: [['fifa.wworldq.uefa', 'Europa'], ['fifa.wwcq.ply', 'Repescagem']] } };
const edState = o => olyState(o);
const copaNext = g => COPA[g].ed.find(o => edState(o) !== 'post') || COPA[g].ed[COPA[g].ed.length - 1];
// os nomes das seleções em português (o Futebol já os sabe)
const copaGame = (e, lg) => { const v = tEv(e, 'copa'), tn = OS.Futebol && OS.Futebol.tN; v.k = lg; if (tn) [v.h, v.a].forEach(x => { if (x) { x.n = tn(x.n); x.sn = tn(x.sn); } }); return v; };
const copaPage = sp => { const S = UIst(), g = S.copa === 'f' ? 'f' : 'm', C = COPA[g], n = copaNext(g), stt = edState(n), now = Date.now();
  const seg = `<div class="sp-seg" role="tablist">${[['m', 'Masculina'], ['f', 'Feminina']].map(([k, l]) => `<button type="button" class="${g === k ? 'on' : ''}" data-act="dsCopa" data-g="${k}" role="tab" aria-selected="${g === k}">${l}</button>`).join('')}</div>`;
  const hero = `<section class="sp-ohero sp-cup" style="--oc:${n.c}"><div class="sp-oring">${UI.ic('sp_cup')}</div><span class="sp-ok">${stt === 'in' ? 'A decorrer' : 'Próxima ' + (g === 'f' ? 'Copa feminina' : 'Copa')}</span><h2>${esc(n.t)}</h2><p>${n.vago ? esc(n.sede) + ' · 2034' : esc(fmtR(n.ini, n.fim)) + ' · ' + esc(n.sede)}</p>${stt === 'in' ? '<span class="sp-gs on big"><i></i>A decorrer agora</span>' : n.vago ? '' : countdown(n)}<small>${esc(n.extra)}</small></section>`;
  let body = '';
  // durante a Copa: os jogos (ao vivo, hoje, a seguir, resultados) e os grupos
  if (stt === 'in') { const k = 'cp:' + C.lg + ':' + n.ini, j = need(k, 2e4, () => get(SITE + 'soccer/' + C.lg + '/scoreboard?limit=200&dates=' + dk(U.addDays(n.ini, -1)) + '-' + dk(U.addDays(n.fim, 1)), 2e4));
    const E = j ? (j.events || []).map(e => copaGame(e, C.lg)).filter(e => e.h && e.a) : null, gg = L => `<div class="sp-gg">${L.map(e => gCard(e)).join('')}</div>`;
    if (!E) body += errBox(k) || loading('A buscar os jogos…');
    else { const lv = E.filter(isLive), up = E.filter(e => e.st === 'pre').sort((a, b) => a.d - b.d).slice(0, 12), dn = E.filter(e => e.st === 'post').sort((a, b) => b.d - a.d).slice(0, 12);
      body += (lv.length ? sec('Ao vivo', gg(lv)) : '') + (up.length ? sec('A seguir', gg(up)) : '') + (dn.length ? sec('Resultados', gg(dn)) : ''); }
    const G = need('cps:' + C.lg, 10 * 6e4, () => API.stand(['', '', 'soccer/' + C.lg]));
    if (G && G.length) body += sec('Grupos', G.map(x => `<h4 class="sp-gh">${esc(x.name.replace(/^Group/, 'Grupo'))}</h4><div class="sp-tw"><table class="sp-tb"><thead><tr><th>#</th><th class="l">Seleção</th><th>V</th><th>E</th><th>D</th><th>Pts</th></tr></thead><tbody>${x.rows.map((r, i) => `<tr><td>${r.seed || i + 1}</td><td class="l"><span class="sp-tn">${img(r.logo, 'sp-ti', r.n)}<span>${esc(r.n)}</span></span></td><td>${esc(r.w)}</td><td>${esc(r.t)}</td><td>${esc(r.l)}</td><td><b>${esc(r.pts)}</b></td></tr>`).join('')}</tbody></table></div>`).join('')); }
  // a última edição: a final e quem foi campeão (a ESPN dá o último jogo quando não há Copa a decorrer)
  if (stt !== 'in') { const k = 'cpl:' + C.lg, j = need(k, 6 * 36e5, () => get(SITE + 'soccer/' + C.lg + '/scoreboard', 36e5)), e = j && (j.events || []).map(x => copaGame(x, C.lg)).filter(x => x.h && x.a && x.st === 'post').pop();
    if (e) { const w = e.h.w ? e.h : e.a.w ? e.a : null, yr = new Date(e.d).getFullYear();
      body += sec('Última edição · ' + yr, `<div class="sp-cupl">${w ? `<div class="sp-champ">${img(w.logo, 'sp-chl', w.ab || w.n)}<span><small>${g === 'f' ? 'Campeã' : 'Campeão'} do mundo</small><b>${esc(w.n)}</b></span></div>` : ''}<div class="sp-gg">${gCard(e, { big: 1 })}</div></div>`); } }
  // eliminatórias a decorrer (jogos oficiais da Copa)
  C.q.forEach(([lg, nm]) => { const k = 'cpq:' + lg, j = need(k, 10 * 6e4, () => get(SITE + 'soccer/' + lg + '/scoreboard', 6e4)), E = j ? (j.events || []).map(x => copaGame(x, lg)).filter(x => x.h && x.a && Math.abs(x.d - now) < 45 * 864e5) : [];
    if (E.length) body += sec('Eliminatórias · ' + esc(nm), `<div class="sp-gg">${E.sort((a, b) => (isLive(b) - isLive(a)) || a.d - b.d).slice(0, 12).map(x => gCard(x)).join('')}</div>`); });
  body += sec('Próximas edições', `<div class="sp-ocs">${C.ed.filter(o => edState(o) !== 'post').map(o => `<div class="sp-oc pre" style="--oc:${o.c}"><span class="sp-ot">${g === 'f' ? 'Feminina' : 'Masculina'}</span><h4>${esc(o.t)}</h4><p>${o.vago ? '2034' : esc(fmtR(o.ini, o.fim))}</p><small>${esc(o.sede)}</small></div>`).join('')}</div>`);
  return seg + hero + body; };

/* ---------- desportos de equipa (NBA, NFL, MLB, NHL, WNBA, universitários) ---------- */
const UIst = () => OS.ui.sp || (OS.ui.sp = { tab: {}, day: {} });
const dayOff = n => U.addDays(U.today(), n);
// nomes dos grupos da classificação em português (Eastern Conference → Conferência Este)
const gName = n => { const W = { Eastern: 'Este', Western: 'Oeste', East: 'Este', West: 'Oeste', North: 'Norte', South: 'Sul', Central: 'Central', Atlantic: 'Atlântico', Pacific: 'Pacífico', Metropolitan: 'Metropolitana' };
  return String(n || '').replace(/American Football Conference/, 'AFC').replace(/National Football Conference/, 'NFC').replace(/American League/, 'Liga Americana').replace(/National League/, 'Liga Nacional')
    .replace(/^(\w+) Conference$/, (m, a) => 'Conferência ' + (W[a] || a)).replace(/^(\w+) Division$/, (m, a) => 'Divisão ' + (W[a] || a)).replace(/\b(AFC|NFC|AL|NL) (East|West|North|South|Central)\b/, (m, a, b) => a + ' ' + W[b]); };
const teamPage = sp => { const S = UIst(), tab = S.tab[sp[0]] || 'jogos', day = S.day[sp[0]] || '', k = 'b:' + sp[0] + ':' + (day || 'hoje');
  const tabs = `<div class="sp-seg" role="tablist">${[['jogos', 'Jogos'], ['tabela', 'Classificação'], ['equipas', 'Equipas']].map(([t, l]) => `<button type="button" class="${tab === t ? 'on' : ''}" data-act="dsTab" data-sp="${sp[0]}" data-t="${t}" role="tab" aria-selected="${tab === t}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'jogos') { const j = need(k, !day ? 2e4 : 10 * 6e4, () => API.board(sp, day)), L = j ? (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a).sort((a, b) => (isLive(b) - isLive(a)) || a.d - b.d) : null;
    const days = [-2, -1, '', 1, 2, 3].map(n => n === '' ? '' : dayOff(n));
    body = `<div class="sp-days">${days.map(d => `<button type="button" class="${d === day ? 'on' : ''}" data-act="dsDay" data-sp="${sp[0]}" data-d="${d}">${!d ? 'Hoje' : d === dayOff(-1) ? 'Ontem' : d === dayOff(1) ? 'Amanhã' : new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })}</button>`).join('')}</div>`
      + errBox(k) + (!L ? loading('A buscar os jogos…') : L.length ? `<div class="sp-gg">${L.map(e => gCard(e)).join('')}</div>` : `<div class="sp-empty">${spIc(sp, 1)}<b>Sem jogos neste dia</b><small>Experimenta outro dia em cima.</small></div>`); }
  else if (tab === 'tabela') { const G = need('s:' + sp[0], 10 * 6e4, () => API.stand(sp));
    body = errBox('s:' + sp[0]) + (!G ? loading('A buscar a classificação…') : G.length ? G.map(g => `<h4 class="sp-gh">${esc(gName(g.name))}</h4><div class="sp-tw"><table class="sp-tb"><thead><tr><th>#</th><th class="l">Equipa</th><th>V</th><th>D</th>${g.rows.some(r => r.t && r.t !== '0') ? '<th>E/P</th>' : ''}<th>%</th><th class="hm">Atrás</th><th class="hm">Série</th></tr></thead><tbody>${g.rows.map((r, i) => `<tr class="${isMine(sp[0], r.id) ? 'me' : ''}"><td>${r.seed || i + 1}</td><td class="l"><span class="sp-tn">${img(r.logo, 'sp-ti', r.n)}<span>${esc(r.n)}</span></span></td><td>${esc(r.w)}</td><td>${esc(r.l)}</td>${g.rows.some(x => x.t && x.t !== '0') ? `<td>${esc(r.t)}</td>` : ''}<td>${esc(r.pct)}</td><td class="hm">${esc(r.gb === '0' ? '—' : r.gb)}</td><td class="hm">${esc(r.strk)}</td></tr>`).join('')}</tbody></table></div>`).join('') : '<p class="sp-note">Ainda sem classificação.</p>'); }
  else { const T = need('t:' + sp[0], 864e5, () => API.teams(sp));
    body = errBox('t:' + sp[0]) + (!T ? loading('A buscar as equipas…') : `<p class="sp-note">Toca numa equipa para a seguir: aparece no início de Desportos com o próximo jogo e o resultado ao vivo.</p><div class="sp-teams">${T.map(t => { const on = isMine(sp[0], t.id); return `<button type="button" class="sp-team${on ? ' on' : ''}" data-act="dsFollow" data-sp="${sp[0]}" data-id="${esc(t.id)}" aria-pressed="${on}" style="--tc:${t.c || sp[4]}">${img(t.logo, 'sp-tl', t.ab)}<b>${esc(t.sn)}</b><span class="sp-star">${UI.ic(on ? 'check' : 'plus')}</span></button>`; }).join('')}</div>`); }
  return tabs + body; };

/* ---------- Fórmula 1 / IndyCar ---------- */
const SESS = { FP1: 'Treino livre 1', FP2: 'Treino livre 2', FP3: 'Treino livre 3', Qual: 'Qualificação', Race: 'Corrida', Sprint: 'Sprint', SQ: 'Qualificação sprint', SS: 'Qualificação sprint' };
const f1Page = sp => { const j = need('b:' + sp[0], 3e4, () => API.board(sp)), G = sp[0] === 'f1' ? need('s:' + sp[0], 10 * 6e4, () => API.stand(sp)) : null;
  if (!j) return errBox('b:' + sp[0]) || loading('A buscar o Grande Prémio…');
  const e = (j.events || [])[0]; let out = '';
  if (e) { const C = e.competitions || [], ci = e.circuit || {}, live = C.find(c => c.status && c.status.type && c.status.type.state === 'in'), last = [...C].reverse().find(c => (c.competitors || []).length && c.status.type.state === 'post');
    const race = C.find(c => /race/i.test((c.type || {}).abbreviation || '')) || C[C.length - 1];
    out += `<section class="sp-f1" style="--sc:${sp[4]}"><span class="sp-ok">${live ? '<span class="sp-gs on"><i></i>Ao vivo</span>' : 'Próximo Grande Prémio'}</span><h2>${esc(e.name || '')}</h2><p>${esc([ci.fullName, ci.address && [ci.address.city, ci.address.country].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</p>${race && race.status.type.state === 'pre' ? `<div class="sp-cdw">Corrida: <b>${esc(dayL(Date.parse(race.date)))}</b></div>` : ''}
      <div class="sp-sess">${C.map(c => { const s = c.status.type.state, ab = (c.type || {}).abbreviation || ''; return `<div class="sp-se ${s}"><b>${esc(SESS[ab] || ab)}</b><small>${esc(s === 'post' ? 'Terminada' : s === 'in' ? 'A decorrer' : dayL(Date.parse(c.date)))}</small></div>`; }).join('')}</div></section>`;
    const show = live || last; if (show) { const R = (show.competitors || []).slice().sort((a, b) => (a.order || 99) - (b.order || 99)).slice(0, 10);
      out += sec((live ? 'Agora · ' : 'Resultado · ') + esc(SESS[(show.type || {}).abbreviation] || ''), `<ol class="sp-rk">${R.map(x => `<li><span class="sp-rn">${x.order || ''}</span>${img(((x.athlete || {}).flag || {}).href, 'sp-fl', '')}<b>${esc((x.athlete || {}).displayName || '')}</b><small>${esc((x.vehicle && x.vehicle.manufacturer) || '')}</small></li>`).join('')}</ol>`); } }
  else out += `<div class="sp-empty">${spIc(sp, 1)}<b>Sem corridas marcadas agora</b></div>`;
  if (G && G.length) out += G.map(g => sec(esc(g.name.replace(/Driver Standings/, 'Campeonato de pilotos').replace(/Constructor Standings/, 'Campeonato de construtores')), `<ol class="sp-rk">${g.rows.slice(0, 10).map((r, i) => `<li><span class="sp-rn">${r.seed || i + 1}</span>${img(r.logo, 'sp-fl', '')}<b>${esc(r.n)}</b><em>${esc(r.pts)} pts</em></li>`).join('')}</ol>`)).join('');
  return out; };

/* ---------- ténis ---------- */
const tenPage = sp => { const j = need('b:' + sp[0], 3e4, () => API.board(sp)); if (!j) return errBox('b:' + sp[0]) || loading('A buscar os torneios…');
  const E = j.events || []; if (!E.length) return `<div class="sp-empty">${spIc(sp, 1)}<b>Sem torneios esta semana</b></div>`;
  return E.map(e => { const G = (e.groupings || []).filter(g => /singles/i.test((g.grouping || {}).displayName || '')); const M = [].concat(...G.map(g => g.competitions || []));
    const lv = M.filter(c => c.status.type.state === 'in'), up = M.filter(c => c.status.type.state === 'pre').sort((a, b) => Date.parse(a.date) - Date.parse(b.date)), dn = M.filter(c => c.status.type.state === 'post').sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const mt = c => `<div class="sp-m${c.status.type.state === 'in' ? ' live' : ''}"><small>${esc(((c.round || {}).displayName || '') + (c.status.type.state === 'pre' ? ' · ' + dayL(Date.parse(c.date)) : c.status.type.state === 'in' ? ' · ao vivo' : ''))}</small>${(c.competitors || []).map(x => `<div class="sp-mr${x.winner ? ' win' : ''}">${img(((x.athlete || {}).flag || {}).href, 'sp-fl', '')}<b>${esc((x.athlete || {}).displayName || 'A definir')}</b><span class="sp-sets">${(x.linescores || []).map(l => `<i>${l.value != null ? Math.round(l.value) : ''}</i>`).join('')}</span></div>`).join('')}</div>`;
    return `<section class="sp-f1" style="--sc:${sp[4]}"><span class="sp-ok">Torneio</span><h2>${esc(e.name || '')}</h2><p>${esc(e.date ? 'Desde ' + new Date(e.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) : '')}</p></section>`
      + (lv.length ? sec('Ao vivo', `<div class="sp-ms">${lv.map(mt).join('')}</div>`) : '') + (up.length ? sec('A seguir', `<div class="sp-ms">${up.slice(0, 12).map(mt).join('')}</div>`) : '') + (dn.length ? sec('Resultados', `<div class="sp-ms">${dn.slice(0, 16).map(mt).join('')}</div>`) : ''); }).join(''); };

/* ---------- MMA: UFC, PFL, LFA, Cage Warriors, Bellator, KSW, Rizin (ESPN) ---------- */
const MMAORG = [['ufc', 'UFC'], ['pfl', 'PFL'], ['lfa', 'LFA'], ['cage-warriors', 'Cage Warriors'], ['bellator', 'Bellator'], ['ksw', 'KSW'], ['rizin', 'Rizin']];
const mmaBoard = o => need('mma:' + o, 10 * 6e4, () => get(SITE + 'mma/' + o + '/scoreboard', 6e4));
const mmaEv = j => ((j && j.events) || [])[0] || null;
const mmaBody = (sp, e, org) => { const C = (e.competitions || []).slice().reverse(), main = C[0], stt = ((e.status || {}).type || {}).state, past = stt === 'post' || (stt !== 'in' && Date.parse(e.date) < Date.now() - 864e5);
  const ftr = x => { const a = x.athlete || {}; return `<div class="sp-fx${x.winner ? ' win' : ''}">${img((a.flag || {}).href, 'sp-fl', '')}<b>${esc(a.displayName || '')}</b><small>${esc(((x.records || [])[0] || {}).summary || '')}</small></div>`; };
  return `<section class="sp-f1" style="--sc:${sp[4]}"><span class="sp-ok">${stt === 'in' ? '<span class="sp-gs on"><i></i>Ao vivo</span>' : past ? 'Último evento' : 'Próximo evento'} · ${esc(org)}</span><h2>${esc(e.name || '')}</h2><p>${esc(past ? new Date(e.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : dayL(Date.parse(e.date)))}${(e.venues || [])[0] ? ' · ' + esc(e.venues[0].fullName || '') : ''}</p>
    ${main ? `<div class="sp-main"><span>Combate principal${(main.type || {}).abbreviation ? ' · ' + esc(main.type.abbreviation) : ''}</span><div class="sp-vs">${(main.competitors || []).map(ftr).join('<em>vs</em>')}</div></div>` : ''}</section>`
    + (C.length > 1 ? sec('Combates', `<div class="sp-ms">${C.slice(1).map(c => `<div class="sp-m${((c.status || {}).type || {}).state === 'in' ? ' live' : ''}"><small>${esc((c.type || {}).abbreviation || '')}${((c.status || {}).type || {}).state === 'post' ? ' · ' + esc(c.status.type.shortDetail || '') : ''}</small>${(c.competitors || []).map(ftr).join('')}</div>`).join('')}</div>`) : ''); };
const mmaPage = sp => { const S = UIst(), now = Date.now(), B = MMAORG.map(([o, l]) => ({ o, l, e: mmaEv(mmaBoard(o)) })), any = B.some(x => x.e);
  if (!any && MMAORG.every(([o]) => !DATA['mma:' + o] && !ERR['mma:' + o])) return loading('A buscar os eventos…');
  const rank = x => !x.e ? 3e15 : Date.parse(x.e.date) >= now - 864e5 ? Date.parse(x.e.date) : 2e15 - Date.parse(x.e.date), L = B.slice().sort((a, b) => rank(a) - rank(b));
  const cur = L.find(x => x.o === S.mma) || L[0];
  const chips = `<div class="sp-vbc" role="list">${L.map(x => { const d = x.e && Date.parse(x.e.date), fut = d && d >= now - 864e5; return `<button type="button" class="${x.o === cur.o ? 'on ' : ''}${!x.e || !fut ? 'post' : ''}" data-act="dsMma" data-o="${x.o}" aria-pressed="${x.o === cur.o}"><b>${esc(x.l)}</b><small>${!x.e ? (DATA['mma:' + x.o] ? 'Sem eventos' : 'A carregar…') : fut ? (((x.e.status || {}).type || {}).state === 'in' ? '<i></i>Ao vivo' : esc(dayL(d))) : 'Último: ' + esc(new Date(d).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' }))}</small></button>`; }).join('')}</div>`;
  return chips + (errBox('mma:' + cur.o) || '') + (cur.e ? mmaBody(sp, cur.e, cur.l) : `<div class="sp-empty">${spIc(sp, 1)}<b>Sem eventos marcados</b><small>Escolhe outra organização em cima.</small></div>`); };

/* ---------- golfe ---------- */
const golfPage = sp => { const j = need('b:' + sp[0], 6e4, () => API.board(sp)); if (!j) return errBox('b:' + sp[0]) || loading('A buscar o torneio…');
  const e = (j.events || [])[0]; if (!e) return `<div class="sp-empty">${spIc(sp, 1)}<b>Sem torneios esta semana</b></div>`; const c = (e.competitions || [])[0] || {};
  const R = (c.competitors || []).slice().sort((a, b) => (a.order || 999) - (b.order || 999)).slice(0, 20);
  return `<section class="sp-f1" style="--sc:${sp[4]}"><span class="sp-ok">Torneio</span><h2>${esc(e.name || '')}</h2><p>${esc(dayL(Date.parse(e.date)))}</p></section>` + sec('Classificação', `<ol class="sp-rk">${R.map(x => `<li><span class="sp-rn">${x.order || ''}</span>${img(((x.athlete || {}).flag || {}).href, 'sp-fl', '')}<b>${esc((x.athlete || {}).displayName || '')}</b><em>${esc(scoreOf(x.score))}</em></li>`).join('')}</ol>`); };

const flag2 = cc => /^[A-Za-z]{2}$/.test(cc || '') ? 'https://flagcdn.com/w80/' + cc.toLowerCase() + '.png' : '';
const card = (e, o) => gCard(e, o);

/* ---------- MotoGP ---------- */
const MSESS = { FP1: 'Treino livre 1', FP2: 'Treino livre 2', PR: 'Treino', Q1: 'Qualificação 1', Q2: 'Qualificação 2', Q: 'Qualificação', SPR: 'Sprint', WUP: 'Aquecimento', RAC: 'Corrida' };
const GPN = { THAILAND: 'da Tailândia', BRAZIL: 'do Brasil', 'UNITED STATES': 'dos Estados Unidos', AMERICAS: 'das Américas', SPAIN: 'de Espanha', FRANCE: 'de França', CATALUNYA: 'da Catalunha', ITALY: 'de Itália', HUNGARY: 'da Hungria', CZECHIA: 'da Chéquia', NETHERLANDS: 'dos Países Baixos', GERMANY: 'da Alemanha', 'GREAT BRITAIN': 'da Grã-Bretanha', ARAGON: 'de Aragão', 'SAN MARINO AND THE RIMINI RIVIERA': 'de San Marino', 'SAN MARINO': 'de San Marino', AUSTRIA: 'da Áustria', JAPAN: 'do Japão', INDONESIA: 'da Indonésia', AUSTRALIA: 'da Austrália', MALAYSIA: 'da Malásia', QATAR: 'do Catar', PORTUGAL: 'de Portugal', VALENCIA: 'de Valência', ARGENTINA: 'da Argentina', INDIA: 'da Índia', KAZAKHSTAN: 'do Cazaquistão', 'EMILIA-ROMAGNA': 'de Emília-Romanha' };
const tcase = x => String(x).toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase());
const gpName = n => { const m = String(n || '').match(/GRAND PRIX OF (?:THE )?(.+)$/i), p = (m ? m[1] : String(n || '')).trim(); return m ? 'Grande Prémio ' + (GPN[p.toUpperCase()] || 'de ' + tcase(p)) : tcase(p); };
const mgCur = D => ((D && D.gps) || []).find(g => g.b + 864e5 > Date.now()) || null;
const mgEnd = x => x.e || x.d + 36e5, mgLive = x => { const n = Date.now(); return n >= x.d && n <= mgEnd(x); };
const fmtRs = (a, b) => { const x = new Date(a), y = new Date(b), m = d => d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', ''); return x.getMonth() === y.getMonth() ? x.getDate() + '–' + y.getDate() + ' ' + m(y) : x.getDate() + ' ' + m(x) + ' – ' + y.getDate() + ' ' + m(y); };
const rkRow = (p, fl, n, sub, right) => `<li class="${p && p <= 3 ? 'pod' : ''}"><span class="sp-rn">${p || '–'}</span>${img(fl, 'sp-fl', '')}<span class="sp-rw"><b>${n}</b>${sub ? `<small>${sub}</small>` : ''}</span><em>${right || ''}</em></li>`;
const motoPage = sp => { const D = need('mgp', DATA.mgp && DATA.mgp.v && DATA.mgp.v.live ? 3e4 : 5 * 6e4, API.mgp); if (!D) return errBox('mgp') || loading('A buscar o Grande Prémio…');
  const g = mgCur(D), now = Date.now(); let out = errBox('mgp');
  if (g) { const lv = g.sess.find(mgLive), race = g.sess.find(x => x.ab === 'RAC');
    out += `<section class="sp-f1 sp-moto" style="--sc:${sp[4]}"><span class="sp-ok">${lv ? `<span class="sp-gs on"><i></i>Ao vivo · ${esc(MSESS[lv.ab] || lv.n)}</span>` : g.a <= now ? 'Este fim de semana' : 'Próximo Grande Prémio'}</span><h2>${esc(gpName(g.n))}</h2><p class="sp-gpw">${img(flag2(g.cc), 'sp-fl', '')}<span>${esc([g.ci, g.city].filter(Boolean).join(' · '))}</span></p>${race && race.d > now ? `<div class="sp-cdw">Corrida: <b>${esc(dayL(race.d))}</b></div>` : ''}
      <div class="sp-sess">${g.sess.map(x => { const s = mgLive(x) ? 'in' : now > mgEnd(x) ? 'post' : 'pre'; return `<div class="sp-se ${s}${/^(RAC|SPR)$/.test(x.ab) ? ' big' : ''}"><b>${esc(MSESS[x.ab] || x.n)}</b><small>${esc(s === 'post' ? 'Terminada' : s === 'in' ? 'A decorrer' : dayL(x.d))}</small></div>`; }).join('')}</div></section>`; }
  else out += `<div class="sp-empty">${spIc(sp, 1)}<b>A época de ${esc(D.y)} acabou</b><small>O calendário da próxima época aparece aqui quando sair.</small></div>`;
  const R = D.res; if (R && (R.s || []).length) out += R.s.map(x => sec(`${esc(MSESS[x.ab] || x.ab)} · ${esc(gpName(R.n))}`, `<ol class="sp-rk">${x.rows.slice(0, 10).map(r => rkRow(r.p, flag2(r.cc), esc(r.n) + (r.num ? ` <small>#${esc(r.num)}</small>` : ''), esc(r.tm), esc(r.p === 1 ? r.t : r.gap && r.gap !== '0.000' ? '+' + r.gap : r.st && r.st !== 'INSTND' ? 'Desistiu' : r.t))).join('')}</ol>`)).join('');
  if ((D.std || []).length) out += sec('Campeonato de pilotos ' + esc(D.y), `<ol class="sp-rk">${D.std.slice(0, 15).map(r => rkRow(r.p, flag2(r.cc), esc(r.n), esc(r.tm) + (r.w ? ' · ' + r.w + (r.w === 1 ? ' vitória' : ' vitórias') : ''), r.pts + ' pts')).join('')}</ol>`);
  if ((D.gps || []).length) out += sec('Calendário ' + esc(D.y), `<div class="sp-cal">${D.gps.map(x => { const s = x.b + 864e5 < now ? 'post' : x.a <= now ? 'in' : 'pre'; return `<div class="sp-cr ${s}${g && x.sn === g.sn ? ' cur' : ''}">${img(flag2(x.cc), 'sp-fl', '')}<span><b>${esc(gpName(x.n))}</b><small>${esc(x.ci)}</small></span><em>${esc(fmtRs(x.a, x.b))}</em></div>`; }).join('')}</div>`);
  return out; };

/* ---------- avisos: 15 minutos antes, começo, golos/pontos/sets e resultado final ----------
   Para as equipas que segues (todos os desportos) e, na Fórmula 1 e na MotoGP, quando o sino está ligado (qualificação, sprint e corrida).
   Chegam com o Prumo aberto (no computador também com a janela em segundo plano). Os golos do futebol avisam-se no Futebol. */
const AVD = { pre: 1, ini: 1, pts: 1, fim: 1 }, avS = () => Object.assign({}, AVD, st().av || {});
const SEEN = U.ls.get('oc_sp_seen', {}) || {}, FEED = U.ls.get('oc_sp_feed', []) || [];
const saveSeen = () => { const lim = Date.now() - 3 * 864e5; Object.keys(SEEN).forEach(k => { if ((SEEN[k].at || 0) < lim) delete SEEN[k]; }); U.ls.set('oc_sp_seen', SEEN); };
const say = (title, body, tag) => { FEED.unshift({ at: Date.now(), title, body }); FEED.splice(12); U.ls.set('oc_sp_feed', FEED); UI.toast(title + ' · ' + body, 'pos');
  try { if (!(OS.Push && OS.Push.on()) && 'Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'sp-' + tag, data: { url: '#esportes' } })).catch(() => { }); } catch (x) { } };
// o que conta como "marcar" em cada desporto (no basquetebol os pontos são a toda a hora: avisa o começo, o intervalo e o fim)
const ptsMsg = (e, side, d) => { const P = (spOf(e.lg) || [])[2] || '';
  if (/^hockey/.test(P)) return (d > 1 ? d + ' golos' : 'Golo') + ' · ' + side.sn;
  if (/^football/.test(P)) return (d >= 6 ? 'Touchdown' : d === 3 ? 'Field goal' : d === 2 ? 'Safety' : 'Pontos') + ' · ' + side.sn;
  if (/^baseball/.test(P)) return (d > 1 ? d + ' corridas' : 'Corrida') + ' · ' + side.sn;
  return ''; };
const lgL = e => (spOf(e.lg) || [])[1] || '';
const vsL = e => `${e.a.sn} ${e.a.s}–${e.h.s} ${e.h.sn}`;
const nmL = e => `${e.a.sn} × ${e.h.sn}`;
const watchEv = e => { if (!e.h || !e.a || !e.d) return; const k = e.lg + ':' + e.id, p = SEEN[k], now = Date.now(), a = avS();
  const c = { st: e.st, s: e.st === 'pre' ? '' : (+e.h.s || 0) + '-' + (+e.a.s || 0), sn: e.sn || '', pre: p ? p.pre : 0, at: now }; SEEN[k] = c;
  if (a.pre && e.st === 'pre' && !c.pre && e.d - now <= 15 * 6e4 && e.d - now > 0) { c.pre = 1; say('Daqui a 15 minutos', nmL(e) + ' · ' + lgL(e), k + ':pre'); }
  if (!p) return;
  if (a.ini && p.st === 'pre' && c.st === 'in') say('Começou', nmL(e) + ' · ' + lgL(e), k + ':ini');
  const ps = p.s || (p.st === 'pre' ? '0-0' : ''); if (a.pts && c.st !== 'pre' && ps && c.s !== ps) { const [ph, pa] = ps.split('-').map(Number), hs = +e.h.s || 0, as = +e.a.s || 0, side = hs > ph ? e.h : as > pa ? e.a : null;
    const t = side && ptsMsg(e, side, side === e.h ? hs - ph : as - pa); if (t) say(t, vsL(e), k + ':' + c.s); }
  if (a.ini && /HALFTIME/.test(c.sn) && !/HALFTIME/.test(p.sn || '')) say('Intervalo', vsL(e), k + ':int');
  if (a.fim && p.st !== 'post' && c.st === 'post') { const me = isMine(e.lg, e.h.id) ? e.h : isMine(e.lg, e.a.id) ? e.a : null; say(me ? (me.w ? 'Vitória · ' : (e.h.w || e.a.w) ? 'Derrota · ' : 'Terminou · ') + me.sn : 'Terminou', vsL(e), k + ':fim'); } };
const BIG = /^(RAC|SPR|Q2|Race|Sprint|Qual|EV)$/;
const watchSess = (lg, gp, S) => { const a = avS(), now = Date.now(), L = ((spOf(lg) || [])[1] || '') + ' · ' + gp;
  S.forEach(x => { if (!BIG.test(x.ab) || !x.d) return; const k = lg + ':' + x.ab + ':' + x.d, p = SEEN[k] || {}; p.at = now; SEEN[k] = p;
    if (a.pre && !p.pre && x.d - now <= 15 * 6e4 && x.d - now > 0) { p.pre = 1; say(x.n + ' daqui a 15 minutos', L, k + ':pre'); }
    if (a.ini && !p.ini && now >= x.d && now - x.d < 15 * 6e4) { p.ini = 1; say('Começou: ' + x.n, L, k + ':ini'); } }); };
const winOnce = (k, t, b) => { if (SEEN[k] || !avS().fim) return; SEEN[k] = { at: Date.now() }; say(t, b, k); };
let loopT = 0, busy = false, HOT = false, SOON = false;
const canLoop = () => !navigator.webdriver || !!window.__spTest;
const tick = async () => { if (busy || !full()) return; busy = true; let hot = false, soon = false; const now = Date.now(), near = e => { if (isLive(e)) hot = true; else if (e.st === 'pre' && e.d - now < 30 * 6e4 && e.d - now > -36e5) soon = true; };
  try { const s = st(), T = s.teams, bell = s.bell || [];
    // equipas da ESPN: o quadro de hoje de cada liga
    await Promise.all([...new Set(T.map(t => t.lg))].map(spOf).filter(x => x && x[2]).map(async sp => { try { const j = await API.board(sp); DATA['b:' + sp[0] + ':hoje'] = { at: Date.now(), v: j };
      (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a && (isMine(sp[0], e.h.id) || isMine(sp[0], e.a.id))).forEach(e => { near(e); watchEv(e); }); } catch (x) { } }));
    // Fórmula 1 e MotoGP com o sino ligado
    if (bell.includes('f1')) { try { const j = await API.board(spOf('f1')); DATA['b:f1'] = { at: Date.now(), v: j }; const e = (j.events || [])[0];
      if (e) { const S = (e.competitions || []).map(c => { const ab = (c.type || {}).abbreviation || ''; return { ab, n: SESS[ab] || ab, d: Date.parse(c.date), st: ((c.status || {}).type || {}).state, c }; });
        S.forEach(x => { if (x.st === 'in') hot = true; else if (x.d - now < 30 * 6e4 && x.d > now) soon = true; }); watchSess('f1', e.name || 'Grande Prémio', S);
        const r = S.find(x => x.ab === 'Race' && x.st === 'post' && now - x.d < 8 * 36e5), w = r && (r.c.competitors || []).find(z => z.order === 1); if (w) winOnce('f1:win:' + e.id, 'Vencedor: ' + ((w.athlete || {}).displayName || ''), 'Fórmula 1 · ' + (e.name || '')); } } catch (x) { } }
    if (bell.includes('motogp')) { try { const D = await API.mgp(); DATA.mgp = { at: Date.now(), v: D }; const g = mgCur(D);
      if (g) { g.sess.forEach(x => { if (mgLive(x)) hot = true; else if (x.d - now < 30 * 6e4 && x.d > now) soon = true; }); watchSess('motogp', gpName(g.n), g.sess.map(x => ({ ab: x.ab, n: MSESS[x.ab] || x.n, d: x.d }))); }
      const R = D.res, rs = R && (R.s || []).find(x => x.ab === 'RAC'), gg = R && (D.gps || []).find(x => x.sn === R.sn), rac = gg && gg.sess.find(x => x.ab === 'RAC');
      if (rs && rs.rows[0] && rac && now - rac.d < 8 * 36e5) winOnce('motogp:win:' + R.sn, 'Vencedor: ' + rs.rows[0].n, 'MotoGP · ' + gpName(R.n)); } catch (x) { } }
    if (bell.includes('mma')) await Promise.all(MMAORG.map(async ([o, l]) => { try { const j = await get(SITE + 'mma/' + o + '/scoreboard', 6e4); DATA['mma:' + o] = { at: Date.now(), v: j }; const e = mmaEv(j); if (!e) return; const d = Date.parse(e.date);
      if (((e.status || {}).type || {}).state === 'in') hot = true; else if (d - now < 30 * 6e4 && d > now) soon = true; watchSess('mma', l, [{ ab: 'EV', n: e.name || l, d }]); } catch (x) { } }));
    saveSeen(); } finally { busy = false; HOT = hot; SOON = soon; }
  if (/^#esportes/.test(location.hash)) OS.request(); };
// de quanto em quanto tempo: 15 s com um jogo teu a decorrer, 1 min perto do começo, 5 min no resto (com a janela escondida só quando há jogo)
const loop = ms => { clearTimeout(loopT); if (!canLoop()) return; const s = st(); if (!s.teams.length && !(s.bell || []).length) return;
  loopT = setTimeout(async () => { if (!document.hidden || HOT || SOON) { try { await tick(); } catch (e) { } } loop(); }, ms != null ? ms : HOT ? 15e3 : SOON ? 6e4 : 5 * 6e4); };
OS.on('ready', () => loop(5000));
// tocar num aviso com o Prumo já aberto: o service worker pede para ir à página do aviso
try { if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { const g = e.data && e.data.go; if (typeof g === 'string' && /^#[\w.-]+$/.test(g) && location.hash !== g) location.hash = g; }); } catch (x) { }
document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(1500); });
const agoL = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'agora' : m < 60 ? 'há ' + m + ' min' : m < 24 * 60 ? 'há ' + Math.round(m / 60) + ' h' : new Date(t).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }); };
const avPanel = () => { const a = avS(), perm = 'Notification' in window ? Notification.permission : 'na';
  return `<section class="sp-sec sp-av"><div class="sp-sh"><h3>Avisos</h3>${perm === 'granted' && (!OS.Push || OS.Push.on() || OS.Push.why()) ? `<span class="sp-avok">${UI.ic('check')}Ligados neste aparelho</span>` : perm === 'na' && !(OS.Push && OS.Push.why() === 'ios') ? '' : `<button type="button" class="btn sm" data-act="dsNotif">${UI.ic('bell')}Ligar neste aparelho</button>`}</div>
    <div class="sp-avt">${[['pre', '15 minutos antes'], ['ini', 'Começo do jogo'], ['pts', 'Golos, pontos e sets'], ['fim', 'Resultado final']].map(([k, l]) => `<label class="sp-sw"><input type="checkbox" data-act="dsAv" data-k="${k}" ${a[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <p class="sp-note">Das equipas que segues: golo no hóquei, touchdown na NFL e corrida no basebol; no basquetebol, o começo, o intervalo e o fim. Na Fórmula 1, na MotoGP e no MMA, toca no sino. Os golos do futebol estão no Futebol. ${OS.Push && OS.Push.on() ? 'Chegam mesmo com o Prumo fechado.' : 'Liga as notificações para chegarem também com o Prumo fechado.'}</p>
    ${FEED.length ? `<ul class="sp-feed">${FEED.slice(0, 5).map(f => `<li><span class="sp-fi">${UI.ic('bell')}</span><span><b>${esc(f.title)}</b> ${esc(f.body)}</span><small>${esc(agoL(f.at))}</small></li>`).join('')}</ul>` : ''}</section>`; };

/* ---------- início: ao vivo, as tuas equipas, os desportos, Olimpíadas ---------- */
const hub = () => { const s = st(), mine = s.mine.map(spOf).filter(Boolean), teams = s.teams;
  // ao vivo e a seguir: os quadros de hoje dos desportos de equipa que segues (e das tuas equipas)
  // v3.78: o Agora a jogar mostra TODOS os jogos ao vivo, de todas as modalidades (não só das que segues), e todo o futebol ao vivo do mundo
  const lgs = SP.filter(x => x[2] && x[3] === 'team');
  const all = [].concat(...lgs.map(sp => { const j = need('b:' + sp[0] + ':hoje', 2e4, () => API.board(sp)); return j ? (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a) : []; }));
  const schedOf = t => { const sp = spOf(t.lg); return sp && sp[2] ? need('sc:' + t.lg + ':' + t.id, 10 * 6e4, () => API.sched(sp, t.id)) || [] : []; };
  const nextOf = t => schedOf(t).find(e => e.st === 'pre' && e.d > Date.now() - 36e5);
  const nexts = teams.map(nextOf).filter(Boolean).sort((a, b) => a.d - b.d);
  let fut = []; try { fut = (OS.Futebol && OS.Futebol.vivos ? OS.Futebol.vivos() : []).map(e => Object.assign({}, e, { lg: 'futebol' })); } catch (e) { }
  const meu = e => e.meu || isMine(e.lg, e.h.id) || isMine(e.lg, e.a.id);
  const mineEv = all.filter(e => isMine(e.lg, e.h.id) || isMine(e.lg, e.a.id)), live = all.filter(isLive).concat(fut).sort((a, b) => meu(b) - meu(a) || (a.d || 0) - (b.d || 0));
  const top = live.length ? live : nexts.slice(0, 1);
  const o = olyNext();
  const hero = `<section class="sp-hero"><div class="sp-hl"><span class="sp-ok">${live.length ? `<span class="sp-gs on"><i></i>${live.length} ${live.length === 1 ? 'jogo' : 'jogos'} ao vivo</span>` : 'Desportos'}</span><h2>${live.length ? 'Agora a jogar' : top.length ? 'A seguir' : 'Tudo o que segues, num só sítio'}</h2>${!top.length ? '<p>Futebol, NBA, Fórmula 1, ténis, UFC e mais: segue as tuas equipas e vê os resultados ao vivo, os próximos jogos e as classificações.</p>' : ''}</div>${top.length ? `<div class="sp-hg${top.length > 2 ? ' muitos' : ''}">${top.map(e => card(e, { big: 1, lg: 1 })).join('')}</div>` : ''}${live.length > 2 ? `<p class="sp-hn">${[...new Set(live.map(e => e.lg === 'futebol' ? 'Futebol' : (spOf(e.lg) || [])[1]).filter(Boolean))].join(' · ')}</p>` : ''}</section>`;
  const sports = `<div class="sp-sps">${SP.map(sp => { const on = s.mine.includes(sp[0]); return `<a class="sp-spc${on ? ' on' : ''}" href="${sp[0] === 'futebol' ? '#futebol' : '#esportes.' + sp[0]}" style="--sc:${sp[4]}" title="${esc(sp[6])}">${spIc(sp)}<b>${esc(sp[1])}</b></a>`; }).join('')}</div>`;
  // as tuas equipas: próximo jogo (ou ao vivo) e o último resultado
  const tcards = teams.length ? `<div class="sp-mt">${teams.map(t => { const sp = spOf(t.lg); if (!sp) return ''; const S = schedOf(t), now = Date.now(), sl = e => `${esc(e.a.ab || e.a.sn)} ${esc(e.a.s)} – ${esc(e.h.s)} ${esc(e.h.ab || e.h.sn)}`;
      const lv = all.find(e => isLive(e) && (e.h.id === t.id || e.a.id === t.id) && e.lg === t.lg), nx = S.find(e => e.st === 'pre' && e.d > now - 36e5), ls = [...S].reverse().find(e => e.st === 'post'), opp = e => e.h.id === t.id ? e.a : e.h;
      return `<div class="sp-tc${lv ? ' live' : ''}" style="--tc:${t.c || sp[4]}"><div class="sp-tch">${img(t.logo, 'sp-tcl', t.ab)}<span><b>${esc(t.n)}</b><small>${spIc(sp)}${esc(sp[1])}</small></span><button type="button" class="sp-x" data-act="dsFollow" data-sp="${esc(t.lg)}" data-id="${esc(t.id)}" aria-label="Deixar de seguir ${esc(t.n)}">${UI.ic('x')}</button></div>
        ${lv ? `<div class="sp-tcl2"><span class="sp-gs on"><i></i>${esc(lv.det)}</span><b>${sl(lv)}</b></div>` : nx ? `<div class="sp-tcl2"><small>Próximo</small><b>${nx.h.id === t.id ? 'vs' : '@'} ${esc(opp(nx).sn)}</b><span>${esc(dayL(nx.d))}</span></div>` : ''}
        ${ls ? `<div class="sp-tcl2 last"><small>Último</small><b>${sl(ls)}</b><span class="${(ls.h.id === t.id ? ls.h : ls.a).w ? 'w' : 'l'}">${(ls.h.id === t.id ? ls.h : ls.a).w ? 'Vitória' : 'Derrota'}</span></div>` : ''}</div>`; }).join('')}</div>`
    : `<div class="sp-empty">${UI.ic('star')}<b>Ainda não segues nenhuma equipa</b><small>Abre um desporto (NBA, NFL, NHL…) › Equipas e toca nas que queres seguir. No futebol, segue em Futebol.</small></div>`;
  const wi = OLY.find(x => x.tp === 'Inverno' && olyState(x) !== 'post'), cn = [copaNext('f'), copaNext('m')].filter(x => !x.vago).sort((a, b) => a.ini.localeCompare(b.ini))[0];
  const oly = `<div class="sp-bans"><a class="sp-olyb" href="#esportes.olimpiadas" style="--oc:${o.c}"><span class="sp-oring">${UI.ic('sp_oly')}</span><span><small>Olimpíadas</small><b>${esc(o.t)}</b><span>${esc(fmtR(o.ini, o.fim))}${wi && wi !== o ? ' · Inverno: ' + esc(wi.t) : ''}</span></span>${olyState(o) === 'pre' ? countdown(o) : '<span class="sp-gs on"><i></i>A decorrer</span>'}</a>`
    + (cn ? `<a class="sp-olyb sp-cupb" href="#esportes.copa" data-act="dsCopa" data-g="${cn === copaNext('f') ? 'f' : 'm'}" style="--oc:${cn.c}"><span class="sp-oring">${UI.ic('sp_cup')}</span><span><small>Copa do Mundo</small><b>${esc(cn.t)}</b><span>${esc(fmtR(cn.ini, cn.fim))} · ${esc(cn.sede)}</span></span>${edState(cn) === 'pre' ? countdown(cn) : '<span class="sp-gs on"><i></i>A decorrer</span>'}</a>` : '') + '</div>';
  return hero + sec('As tuas equipas', tcards) + avPanel() + oly + sec('Desportos', sports) + (live.length > 2 ? sec('Ao vivo agora', `<div class="sp-gg">${live.slice(2, 14).map(e => card(e, { lg: 1 })).join('')}</div>`) : ''); };

/* ---------- planos: os Desportos completos são do Completo; o Futebol é de todos ---------- */
const full = () => !OS.Plano || !OS.Plano.can || OS.Plano.can('desportos');
const hubLite = () => `<section class="sp-hero"><div class="sp-hl"><span class="sp-ok">Desportos</span><h2>O teu Futebol</h2><p>No teu plano tens o Futebol: as tuas equipas ao vivo, as tabelas, os golos e os avisos.</p><div class="row gap8" style="margin-top:12px"><a class="btn pri" href="#futebol">${UI.ic('ball')}Abrir o Futebol</a></div></div></section>`
  + (OS.Plano && OS.Plano.lock ? OS.Plano.lock(3, 'O resto dos Desportos (NBA, NFL, Fórmula 1, MotoGP, MMA, ténis, Olimpíadas, Copa do Mundo e mais)') : '')
  + sec('Desportos', `<div class="sp-sps">${SP.map(sp => sp[0] === 'futebol' ? `<a class="sp-spc on" href="#futebol" style="--sc:${sp[4]}">${spIc(sp)}<b>${esc(sp[1])}</b></a>` : `<a class="sp-spc sp-lk" href="#planos" style="--sc:${sp[4]}" title="No plano Completo">${spIc(sp)}<b>${esc(sp[1])}</b><span class="sp-lki">${UI.ic('lock')}</span></a>`).join('')}</div>`);

/* ---------- página ---------- */
V.esportes = sub => { const k = sub === 'ufc' ? 'mma' : sub || ''; if (k === 'futebol') { setTimeout(() => { location.hash = 'futebol'; }, 0); return loading('A abrir o Futebol…'); }
  const sp = spOf(k), nav = `<nav class="sp-nav" aria-label="Desportos"><a href="#esportes" class="${!k ? 'on' : ''}">${UI.ic('home')}Início</a>${SP.map(x => `<a href="${x[0] === 'futebol' ? '#futebol' : '#esportes.' + x[0]}" class="${k === x[0] ? 'on' : ''}" style="--sc:${x[4]}">${UI.ic(x[5])}${esc(x[1])}</a>`).join('')}</nav>`;
  let body;
  if (!full()) body = sp && sp[0] !== 'futebol' ? (OS.Plano.lock(3, esc(sp[1])) + `<p class="sp-note" style="margin-top:10px">O Futebol está no teu plano: <a class="acc" href="#futebol">abrir o Futebol</a>.</p>`) : hubLite();
  else if (!sp) body = hub();
  else { const on = st().mine.includes(sp[0]);
    const head = sp[3] === 'oly' || sp[3] === 'copa' ? '' : `<section class="sp-shd" style="--sc:${sp[4]}">${spIc(sp, 1)}<div><h2>${esc(sp[1])}</h2><p>${esc(sp[6])}</p></div><span class="sp-hb">${sp[3] === 'f1' && sp[0] === 'f1' || sp[3] === 'moto' || sp[3] === 'mma' ? (b => `<button type="button" class="btn sm sp-bell${b ? ' on' : ''}" data-act="dsBell" data-sp="${sp[0]}" aria-pressed="${b}" title="${sp[3] === 'mma' ? 'Avisar 15 minutos antes e quando começa o evento' : 'Avisar 15 minutos antes e quando começam a qualificação, o sprint e a corrida'}">${UI.ic('bell')}${b ? 'Avisos ligados' : 'Avisar'}</button>`)((st().bell || []).includes(sp[0])) : ''}<button type="button" class="btn sm sp-fav${on ? ' on' : ''}" data-act="dsMine" data-sp="${sp[0]}" aria-pressed="${on}">${UI.ic(on ? 'check' : 'star')}${on ? 'Nos teus desportos' : 'Juntar aos meus'}</button></span></section>`;
    body = head + (sp[3] === 'team' ? teamPage(sp) : sp[3] === 'f1' ? f1Page(sp) : sp[3] === 'ten' ? tenPage(sp) : sp[3] === 'mma' ? mmaPage(sp) : sp[3] === 'golf' ? golfPage(sp) : sp[3] === 'moto' ? motoPage(sp) : sp[3] === 'copa' ? copaPage(sp) : sp[3] === 'oly' ? olyPage() : ''); }
  return UI.head('Desportos', 'O futebol e os outros desportos: as equipas que segues, o que está ao vivo, resultados, próximos jogos, classificações e as Olimpíadas.', '', 'Eu') + (sp ? nav : '') + `<div class="sp">${body}</div>`; };

/* ---------- ações ---------- */
A.dsTab = b => { UIst().tab[b.dataset.sp] = b.dataset.t; OS.request(); };
A.dsRetry = b => { const k = b.dataset.k; delete FAIL[k]; delete ERR[k]; if (DATA[k]) DATA[k].at = 0; OS.request(); };
A.dsDay = b => { UIst().day[b.dataset.sp] = b.dataset.d || ''; OS.request(); };
A.dsMine = b => { const s = st(), k = b.dataset.sp; s.mine = s.mine.includes(k) ? s.mine.filter(x => x !== k) : s.mine.concat(k); save(); UI.toast(s.mine.includes(k) ? spOf(k)[1] + ' nos teus desportos' : spOf(k)[1] + ' saiu dos teus desportos', 'pos'); OS.request(); };
A.dsFollow = b => { const s = st(), lg = b.dataset.sp, id = b.dataset.id, sp = spOf(lg); if (!sp) return; const i = s.teams.findIndex(t => t.lg === lg && t.id === id);
  if (i >= 0) { const t = s.teams[i]; s.teams.splice(i, 1); save(); UI.toast(t.n + ' deixou de ser seguida', 'pos'); }
  else { const T = (DATA['t:' + lg] && DATA['t:' + lg].v) || [], t = T.find(x => x.id === id); if (!t) return;
    s.teams.push({ lg, id, n: t.n, ab: t.ab, logo: t.logo, c: t.c || '' }); if (!s.mine.includes(lg)) s.mine.push(lg); save(); UI.toast('A seguir ' + t.n, 'pos'); }
  OS.request(); loop(1500); };
A.dsCopa = b => { UIst().copa = b.dataset.g; if (b.tagName === 'A') location.hash = 'esportes.copa'; else OS.request(); };
A.dsMma = b => { UIst().mma = b.dataset.o; OS.request(); };
A.dsAv = b => { const s = st(); s.av = Object.assign({}, avS(), { [b.dataset.k]: b.checked ? 1 : 0 }); save(); };
A.dsBell = b => { const s = st(), k = b.dataset.sp, B = s.bell || []; s.bell = B.includes(k) ? B.filter(x => x !== k) : B.concat(k); save();
  if (s.bell.includes(k)) { UI.toast((spOf(k) || [])[1] + (k === 'mma' ? ': avisamos 15 minutos antes e quando começa cada evento' : ': avisamos 15 minutos antes e quando começam a qualificação, o sprint e a corrida'), 'pos'); if ('Notification' in window && Notification.permission === 'default') A.dsNotif(); }
  else UI.toast('Avisos da ' + (spOf(k) || [])[1] + ' desligados', 'pos'); OS.request(); loop(1500); };
A.dsNotif = async () => { if (OS.Push && !OS.Push.why()) return OS.Push.enable(); if (!('Notification' in window)) return UI.toast('Este aparelho não deixa o app mandar avisos. No iPhone, instala o Prumo no ecrã principal.', 'warn');
  const p = await Notification.requestPermission(); UI.toast(p === 'granted' ? 'Avisos ligados neste aparelho' : 'Os avisos ficam só dentro do app (o aparelho não deu autorização)', p === 'granted' ? 'pos' : 'warn'); OS.request(); };
// ao vivo: com os Desportos abertos, atualiza a cada 20 s (e a contagem das Olimpíadas a cada minuto)
setInterval(() => { if (document.hidden || !/^#esportes/.test(location.hash)) return; const live = Object.keys(DATA).some(k => /^b:/.test(k) && DATA[k].v && (DATA[k].v.events || []).some(e => { const c = (e.competitions || [])[0] || {}; return ((c.status || e.status || {}).type || {}).state === 'in'; }));
  const vl = false, ml = DATA.mgp && DATA.mgp.v && DATA.mgp.v.live;
  if (live) Object.keys(DATA).filter(k => /^b:/.test(k)).forEach(k => { DATA[k].at = 0; }); if (ml) DATA.mgp.at = 0;
  if (live || vl || ml) OS.request(); }, 20000);
OS.Sports = { st, tick, seen: SEEN, feed: FEED, flush: () => MEM.clear(), liveN: () => Object.keys(DATA).filter(k => /^b:.*:/.test(k)).reduce((n, k) => n + ((DATA[k].v && DATA[k].v.events) || []).filter(e => { const c = (e.competitions || [])[0] || {}, sp = k.split(':')[1]; return ((c.status || e.status || {}).type || {}).state === 'in' && (c.competitors || []).some(x => x.team && isMine(sp, String(x.team.id))); }).length, 0) };
})();
