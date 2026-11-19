/* PRUMO — Desportos (Eu): o futebol e os outros desportos num só sítio, com as equipas que segues, o que está ao vivo,
   resultados, próximos jogos e classificações (ESPN), e as Olimpíadas com as datas e a contagem até à próxima edição.
   Futebol abre a página de Futebol que já existe; NBA, WNBA, NFL, MLB, NHL, basquetebol e futebol americano universitários
   têm jogos do dia, classificação e equipas para seguir; a Fórmula 1 tem o próximo Grande Prémio com as sessões e as
   classificações; o ténis (ATP e WTA) os jogos do torneio; o UFC o próximo evento com os combates; o golfe a classificação.
   MotoGP: o fim de semana com as sessões, os resultados, o campeonato e o calendário (API pública da MotoGP, pelo servidor do Prumo).
   Voleibol: as competições da FIVB (Superliga, Liga das Nações, Mundiais, ligas de Itália, Polónia, Japão e Turquia), lidas no aparelho.
   Avisos: 15 minutos antes, começo, golos/pontos/sets e resultado final das equipas que segues; F1 e MotoGP com o sino. */
(() => {
'use strict';
const OS = window.OS, U = OS.U, UI = OS.UI, A = OS.act, V = OS.views, { esc } = U;
OS.ONE_DEF.sports = { teams: [], mine: ['nba', 'f1'] };
const st = () => { const s = OS.one('sports'); if (!Array.isArray(s.teams)) s.teams = []; if (!Array.isArray(s.mine)) s.mine = []; if (s.mine.includes('ufc')) s.mine = [...new Set(s.mine.map(k => k === 'ufc' ? 'mma' : k))]; return s; };
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
  sp_volei: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3c-1 4 0 7 3 9M3.5 9c4 0 7 1.5 8.5 3M12 12c-2 3-5 5-8 5.5M12 12c3 1 6 1 8.5-1M15 12c0 3.5-1 6.5-3 9'
});

/* os desportos: chave, nome, caminho na ESPN, tipo, cor, ícone, a que se refere */
const SP = [
  ['futebol', 'Futebol', '', 'fut', '#16a34a', 'ball', 'Equipas, seleções e campeonatos do mundo'],
  ['nba', 'NBA', 'basketball/nba', 'team', '#e11d48', 'sp_bask', 'Basquetebol dos EUA'],
  ['f1', 'Fórmula 1', 'racing/f1', 'f1', '#ef4444', 'sp_f1', 'Grandes Prémios e campeonato'],
  ['motogp', 'MotoGP', '', 'moto', '#f97316', 'sp_moto', 'Grandes Prémios de motos e campeonato'],
  ['volei', 'Voleibol', '', 'vb', '#14b8a6', 'sp_volei', 'Superliga, Liga das Nações, Mundiais e ligas'],
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
    <div class="sp-gt">${o.lg ? `<span class="sp-gl">${sp ? UI.ic(sp[5]) : ''}${esc(sp ? sp[1] : '')}</span>` : ''}<span class="sp-gs${lv ? ' on' : ''}">${lv ? '<i></i>Ao vivo · ' : ''}${esc(lv || done ? e.det : dayL(e.d))}</span></div>
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
    + sec('Calendário das próximas edições', `<div class="sp-ocs">${OLY.filter(o => olyState(o) !== 'post').map(olyCard).join('')}</div>`)
    + sec('Los Angeles 2028: os desportos', `<div class="sp-chips">${LA28.map(x => `<span class="${NOVO.has(x) ? 'new' : ''}">${esc(x)}${NOVO.has(x) ? '<em>novo</em>' : ''}</span>`).join('')}</div><p class="sp-note">Os Jogos abrem a 14 de julho e fecham a 30 de julho de 2028; os Paralímpicos são de 15 a 27 de agosto de 2028.</p>`)
    + sec('Paris 2024: quadro de medalhas', `<div class="sp-tw"><table class="sp-tb sp-med"><thead><tr><th>#</th><th class="l">País</th><th title="Ouro"><i class="md g"></i></th><th title="Prata"><i class="md s"></i></th><th title="Bronze"><i class="md b"></i></th><th>Total</th></tr></thead><tbody>${MED24.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><b>${r[1] + r[2] + r[3]}</b></td></tr>`).join('')}${me ? `<tr class="me"><td>${me[4]}</td><td class="l">${esc(me[0])}</td><td>${me[1]}</td><td>${me[2]}</td><td>${me[3]}</td><td><b>${me[1] + me[2] + me[3]}</b></td></tr>` : ''}</tbody></table></div>`)
    + sec('Edições anteriores', `<div class="sp-ocs">${OLY.filter(o => olyState(o) === 'post').reverse().map(olyCard).join('')}</div>`); };

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

/* ---------- voleibol (FIVB · VIS: público, lido diretamente no aparelho) ---------- */
const VIS = 'https://www.fivb.org/vis2009/XmlRequest.asmx?Request=';
const vis = (xml, ttl) => get(VIS + encodeURIComponent(xml), ttl).then(j => (j && j.data) || []);
// códigos das seleções na FIVB (os do COI) → bandeira
const IOC = ('ALG:dz,ANG:ao,ARG:ar,ARM:am,AUS:au,AUT:at,AZE:az,BAN:bd,BEL:be,BIH:ba,BLR:by,BOL:bo,BRA:br,BRN:bh,BUL:bg,CAN:ca,CHI:cl,CHN:cn,CIV:ci,CMR:cm,COL:co,CPV:cv,CRC:cr,CRO:hr,CUB:cu,CZE:cz,DEN:dk,DOM:do,ECU:ec,EGY:eg,ESA:sv,ESP:es,EST:ee,FIN:fi,FRA:fr,GBR:gb,GEO:ge,GER:de,GHA:gh,GRE:gr,GUA:gt,HKG:hk,HON:hn,HUN:hu,INA:id,IND:in,IRI:ir,IRL:ie,IRQ:iq,ISR:il,ITA:it,JAM:jm,JOR:jo,JPN:jp,KAZ:kz,KEN:ke,KGZ:kg,KOR:kr,KSA:sa,KUW:kw,LAT:lv,LBN:lb,LTU:lt,MAR:ma,MAS:my,MEX:mx,MGL:mn,MKD:mk,MNE:me,MOZ:mz,NCA:ni,NED:nl,NGR:ng,NOR:no,NZL:nz,PAK:pk,PAN:pa,PAR:py,PER:pe,PHI:ph,POL:pl,POR:pt,PUR:pr,QAT:qa,ROU:ro,RSA:za,RUS:ru,SEN:sn,SGP:sg,SLO:si,SRB:rs,SRI:lk,SUI:ch,SVK:sk,SWE:se,SYR:sy,THA:th,TPE:tw,TTO:tt,TUN:tn,TUR:tr,UAE:ae,UGA:ug,UKR:ua,URU:uy,USA:us,UZB:uz,VEN:ve,VIE:vn,ZIM:zw')
  .split(',').reduce((o, x) => { const [a, b] = x.split(':'); o[a] = b; return o; }, {});
const flag2 = cc => /^[A-Za-z]{2}$/.test(cc || '') ? 'https://flagcdn.com/w80/' + cc.toLowerCase() + '.png' : '';
const VBMAJ = /Nations League|World Championship|World Cup|Olympic|EuroVolley|South American Continental|National League Brazil|Superliga|Serie A (Maschile|Femminile)|TAURON Liga|Japan League|Turkish league/i;
const VBNO = /U ?1\d|U ?2\d|U-\d|Boys|Girls|Zone|Coppa|Supercop|Final Four|Challenge|Courmayeur|Division/i;
const vbYear = n => { const m = String(n).match(/(20\d\d)\s*[\/-]\s*(?:20)?(\d\d)\b/); if (m) return m[1] + '/' + m[2]; const y = String(n).match(/20\d\d/); return y ? y[0] : ''; };
const vbName = (n, g) => { const F = g === 1, A = F ? 'feminina' : 'masculina', O = F ? 'feminino' : 'masculino', y = vbYear(n), Y = y ? ' ' + y : '';
  if (/Nations League/i.test(n)) return 'Liga das Nações ' + A + Y;
  if (/Club World/i.test(n)) return 'Mundial de Clubes ' + O + Y;
  if (/World Championship/i.test(n)) return 'Mundial ' + O + Y;
  if (/World Cup/i.test(n)) return 'Taça do Mundo ' + A + Y;
  if (/Olympic/i.test(n)) return 'Torneio olímpico ' + O + Y;
  if (/EuroVolley/i.test(n)) return 'Europeu ' + O + Y;
  if (/South American/i.test(n)) return 'Sul-Americano ' + O + Y;
  if (/Brazil|Superliga/i.test(n)) return 'Superliga ' + A + ' (Brasil)' + Y;
  if (/Serie A/i.test(n)) return (F ? 'Serie A1 feminina' : 'SuperLega') + ' (Itália)' + Y;
  if (/TAURON|Poland/i.test(n)) return (F ? 'Liga feminina' : 'PlusLiga') + ' (Polónia)' + Y;
  if (/Japan/i.test(n)) return 'SV.League ' + A + ' (Japão)' + Y;
  if (/Turkish/i.test(n)) return 'Liga turca ' + A + Y;
  return n; };
const VBC = { BR: /Brazil|Superliga/i, IT: /Serie A/i, PL: /TAURON|Poland/i, JP: /Japan/i, TR: /Turkish/i };
const VBF = 'No DateTimeUtc TeamAName TeamBName TeamACode TeamBCode NoTeamA NoTeamB MatchPointsA MatchPointsB ' + [1, 2, 3, 4, 5].map(i => 'PointsTeamASet' + i + ' PointsTeamBSet' + i).join(' ') + ' Status City';
const VB = {
  tours: () => vis(`<Request Type="GetVolleyTournamentList" Fields="No Name StartDate EndDate Gender"><Filter FirstDate="${dayOff(-200)}" LastDate="${dayOff(400)}" /></Request>`, 6 * 36e5)
    .then(L => L.filter(t => VBMAJ.test(t.name || '') && !VBNO.test(t.name || '') && t.startDate && t.endDate).map(t => ({ no: String(t.no), n: vbName(t.name, t.gender), raw: t.name, g: t.gender, a: String(t.startDate).slice(0, 10), b: String(t.endDate).slice(0, 10), nat: !/Club|Brazil|Superliga|Serie A|TAURON|Poland|Japan|Turkish/i.test(t.name) }))),
  matches: no => vis(`<Request Type="GetVolleyMatchList" Fields="${VBF}"><Filter NoTournament="${no}" /></Request>`, 2e4),
  pools: no => vis(`<Request Type="GetVolleyPoolList" Fields="No Code Name"><Filter NoTournament="${no}" /></Request>`, 864e5),
  rank: pool => vis(`<Request Type="GetVolleyPoolRanking" NoPool="${pool}" Fields="Position TeamName TeamCode NoTeam MatchesWon MatchesLost MatchPoints SetsWon SetsLost" />`, 10 * 6e4) };
// escudos dos clubes: a FIVB só tem as seleções (bandeiras). Procura-se o clube na TheSportsDB e, se não estiver, na Wikipédia;
// o que se encontra fica guardado no aparelho 30 dias (o que não se encontra, 7 dias) e a página redesenha-se quando chega
const LOGO = U.ls.get('oc_vb_logo', {}) || {}, LQ = [], LP = new Set(), LGAP = navigator.webdriver ? 30 : 2100; let lBusy = false, rqT = 0;
const nrm = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const wait = ms => new Promise(r => setTimeout(r, ms));
const reqSoon = () => { clearTimeout(rqT); rqT = setTimeout(() => { if (/^#esportes/.test(location.hash)) OS.request(); }, 400); };
const tsdb = async (q, g) => { const j = await once('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(q), { credentials: 'omit' });
  const T = ((j && j.teams) || []).filter(x => x.strSport === 'Volleyball' && x.strBadge && (!x.strGender || (g === 1) === /female|women/i.test(x.strGender))); return T[0] ? T[0].strBadge + '/tiny' : ''; };
const wiki = async (lang, q, toks) => { const j = await once(`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=96`, { credentials: 'omit' });
  const P = Object.values((j && j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const ok = P.find(x => x.thumbnail && /logo|crest|emblem|escudo|stemma|herb|badge|\.svg/i.test(x.pageimage || '') && toks.some(t => nrm(x.title).includes(t))); return ok ? ok.thumbnail.source : ''; };
const findLogo = async (n, g) => { const toks = nrm(n).split(/[\s'’-]+/).filter(t => t.length >= 4); let u = await tsdb(n, g).catch(() => '');
  if (!u) { const W = n.split(/\s+/), cap = W.find(w => w.length >= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)), last = W[W.length - 1], alt = cap || (W.length > 1 && last.length >= 5 ? last : ''); if (alt) { await wait(LGAP); u = await tsdb(alt, g).catch(() => ''); } }
  if (!u) u = await wiki('en', n + (g === 1 ? " women's volleyball" : ' volleyball'), toks).catch(() => '');
  if (!u) u = await wiki('pt', n + ' voleibol', toks).catch(() => '');
  return u; };
const pump = async () => { if (lBusy) return; lBusy = true; try { while (LQ.length) { const [n, g] = LQ.shift(), k = g + ':' + n; let u = '';
  try { u = await findLogo(n, g); LOGO[k] = { u, at: Date.now() }; U.ls.set('oc_vb_logo', LOGO); if (u) reqSoon(); } catch (e) { } LP.delete(k); await wait(LGAP); } } finally { lBusy = false; } };
const vLogo = (n, g) => { if (!n || n === 'A definir') return ''; g = g ? 1 : 0; const k = g + ':' + n, c = LOGO[k];
  if (c && Date.now() - c.at < (c.u ? 30 : 7) * 864e5) return c.u; if (!LP.has(k) && LQ.length < 60) { LP.add(k); LQ.push([n, g]); setTimeout(pump, 60); } return c ? c.u : ''; };
// sem escudo: a sigla da equipa num círculo com uma cor só dela
const hue = x => { let h = 2166136261; for (const ch of String(x || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.round(((h >>> 0) % 1000) * 137.508) % 360; };
const vImg = (x, cls) => x.logo ? img(x.logo, cls, x.ab || x.n) : `<span class="${cls} sp-noimg sp-vni" style="--nh:${hue(x.n)}" aria-hidden="true">${esc(String(x.ab || x.n || '?').slice(0, 3).toUpperCase())}</span>`;
// estado de um jogo na FIVB: 1–3 antes, 4–23 a decorrer (set a set), 24 em diante acabado
const vEv = (m, nat, g) => { const s = +m.status || 0, d = Date.parse(m.dateTimeUtc) || 0; let st = s >= 24 ? 'post' : s >= 4 ? 'in' : 'pre'; if (st === 'in' && Date.now() - d > 8 * 36e5) st = 'post';
  const A = +m.matchPointsA || 0, B = +m.matchPointsB || 0, k = Math.min(5, Math.floor((s - 4) / 3) + 1);
  const sets = [1, 2, 3, 4, 5].map(i => [m['pointsTeamASet' + i], m['pointsTeamBSet' + i]]).filter(x => x[0] != null && x[1] != null && (+x[0] || +x[1])).map(x => [+x[0], +x[1]]);
  const side = (n, c, no, mp, w) => ({ id: String(no || ''), n: n || 'A definir', sn: n || 'A definir', ab: c || '', logo: nat ? flag2(IOC[c]) : vLogo(n, g), c: '', s: st === 'pre' || mp == null ? '' : String(mp), w, rec: '' });
  return { id: String(m.no), lg: 'volei', d, st, sn: String(s), det: st === 'in' ? 'Set ' + k : st === 'post' ? 'Final' : '', ven: String(m.city || '').replace(/^\s*\d[\d-]{3,}\s*/, '').split(/\s+ul\.|,/)[0].trim(), sets,
    h: side(m.teamAName, m.teamACode, m.noTeamA, m.matchPointsA, st === 'post' && A > B), a: side(m.teamBName, m.teamBCode, m.noTeamB, m.matchPointsB, st === 'post' && B > A) }; };
const VBT = {}; // equipas vistas (para seguir): id → { n, ab, logo, t, nat }
const vbM = (no, nat, g) => { const d = DATA['vb:m:' + no], now = Date.now(), hot = d && (d.v || []).some(m => { const s = +m.status || 0, t = Date.parse(m.dateTimeUtc) || 0; return (s >= 4 && s < 24 && now - t < 8 * 36e5) || (s < 4 && Math.abs(t - now) < 30 * 6e4); });
  const L = need('vb:m:' + no, hot ? 2e4 : 5 * 6e4, () => VB.matches(no)); if (!L) return null;
  const E = L.map(m => vEv(m, nat, g)).filter(e => e.d); E.forEach(e => [e.h, e.a].forEach(x => { if (x.id && x.id !== '0' && (!VBT[x.id] || (!VBT[x.id].logo && x.logo))) VBT[x.id] = { n: x.n, ab: x.ab, logo: x.logo, t: no, nat: !!nat, g: g ? 1 : 0 }; })); return E; };
const vbState = t => { const n = U.today(); return t.a > n ? 'pre' : t.b < n ? 'post' : 'in'; };
const fmtS = s => D0(s).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', '');
const vbTour = T => { const S = UIst(), cc = String((OS.one('profile') || {}).country || 'PT').toUpperCase(), now = U.today(), f = S.vb && T.find(t => t.no === S.vb); if (f) return f;
  const pri = t => (VBC[cc] && VBC[cc].test(t.raw) ? 0 : t.nat ? 1 : 2) * 10 + (t.g || 0), run = T.filter(t => vbState(t) === 'in').sort((a, b) => pri(a) - pri(b));
  return run[0] || T.filter(t => t.a > now).sort((a, b) => a.a.localeCompare(b.a))[0] || T.slice().sort((a, b) => b.b.localeCompare(a.b))[0]; };
const poolName = n => String(n || '').replace(/^Round robin.*$/i, 'Fase regular').replace(/^Pool (\w+)\s*-\s*Preliminary Phase$/i, 'Grupo $1 · fase preliminar').replace(/^Pool (\w+)$/i, 'Grupo $1').replace(/Preliminary/i, 'Preliminar');
// cartão de um jogo de voleibol: a equipa da casa em cima, os pontos de cada set ao lado
const vCard = (e, o) => { o = o || {}; const lv = isLive(e), done = e.st === 'post', sp = spOf('volei');
  return `<div class="sp-g sp-vg${lv ? ' live' : ''}${o.big ? ' big' : ''}" style="--sc:${sp[4]};--hc:#0f3d3a;--ac:#1e293b">
    <div class="sp-gt">${o.lg ? `<span class="sp-gl">${UI.ic(sp[5])}${esc(o.tn || sp[1])}</span>` : ''}<span class="sp-gs${lv ? ' on' : ''}">${lv ? '<i></i>Ao vivo · ' + esc(e.det) : esc(done ? 'Final' : dayL(e.d))}</span></div>
    ${[e.h, e.a].map((x, i) => `<div class="sp-gr${done && x.w ? ' win' : done ? ' lose' : ''}${isMine('volei', x.id) ? ' me' : ''}">${vImg(x, 'sp-gi')}<span class="sp-gn"><b>${esc(x.n)}</b>${e.sets.length ? `<small class="sp-vst">${e.sets.map(z => `<i class="${z[i] > z[1 - i] ? 'w' : ''}">${z[i]}</i>`).join('')}</small>` : ''}</span><b class="sp-gp">${esc(x.s)}</b></div>`).join('')}
    ${e.ven && e.st === 'pre' ? `<small class="sp-gv">${UI.ic('pin')}${esc(e.ven)}</small>` : ''}</div>`; };
const card = (e, o) => e.lg === 'volei' ? vCard(e, o) : gCard(e, o);
const vbPage = sp => { const T = need('vb:t', 6 * 36e5, VB.tours); if (!T) return errBox('vb:t') || loading('A buscar as competições…');
  if (!T.length) return `<div class="sp-empty">${spIc(sp, 1)}<b>Sem competições agora</b><small>Volta mais tarde.</small></div>`;
  const t = vbTour(T), S = UIst(), tab = S.tab.volei || 'jogos', ts = vbState(t), rk = { in: 0, pre: 1, post: 2 };
  const order = T.slice().sort((a, b) => rk[vbState(a)] - rk[vbState(b)] || (vbState(a) === 'post' ? b.b.localeCompare(a.b) : a.a.localeCompare(b.a)));
  const chips = `<div class="sp-vbc" role="list">${[t].concat(order.filter(x => x !== t)).slice(0, 18).map(x => { const s = vbState(x); return `<button type="button" class="${x.no === t.no ? 'on ' : ''}${s}" data-act="dsVb" data-no="${x.no}" aria-pressed="${x.no === t.no}"><b>${esc(x.n)}</b><small>${s === 'in' ? '<i></i>A decorrer' : s === 'pre' ? 'Começa a ' + esc(fmtS(x.a)) : 'Terminou a ' + esc(fmtS(x.b))}</small></button>`; }).join('')}</div>`;
  const head = `<section class="sp-f1 sp-vbh" style="--sc:${sp[4]}"><span class="sp-ok">${ts === 'in' ? '<span class="sp-gs on"><i></i>A decorrer</span>' : ts === 'pre' ? 'Ainda não começou' : 'Terminou'}</span><h2>${esc(t.n)}</h2><p>${esc(fmtR(t.a, t.b))}</p>${ts === 'pre' ? `<div class="sp-cdw">Começa a <b>${esc(fmtD(t.a))}</b></div>` : ''}</section>`;
  const tabs = `<div class="sp-seg" role="tablist">${[['jogos', 'Jogos'], ['tabela', 'Classificação'], ['equipas', 'Equipas']].map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-act="dsTab" data-sp="volei" data-t="${k}" role="tab" aria-selected="${tab === k}">${l}</button>`).join('')}</div>`;
  const E = vbM(t.no, t.nat, t.g), mk = 'vb:m:' + t.no; let body = '';
  if (tab === 'jogos') { if (!E) body = errBox(mk) || loading('A buscar os jogos…');
    else if (!E.length) body = `<div class="sp-empty">${spIc(sp, 1)}<b>Ainda sem jogos marcados</b><small>${ts === 'pre' ? 'A competição começa a ' + esc(fmtD(t.a)) + '.' : 'A FIVB ainda não tem os jogos desta competição.'}</small></div>`;
    else { const now = Date.now(), lv = E.filter(isLive), up = E.filter(e => e.st === 'pre' && e.d > now - 36e5).sort((a, b) => a.d - b.d).slice(0, 12), dn = E.filter(e => e.st === 'post').sort((a, b) => b.d - a.d).slice(0, 12), gg = L => `<div class="sp-gg">${L.map(e => vCard(e)).join('')}</div>`;
      body = errBox(mk) + (lv.length ? sec('Ao vivo', gg(lv)) : '') + (up.length ? sec('Próximos jogos', gg(up)) : '') + (dn.length ? sec('Resultados', gg(dn)) : ''); } }
  else if (tab === 'tabela') { const P = need('vb:p:' + t.no, 864e5, () => VB.pools(t.no));
    if (!P) body = errBox('vb:p:' + t.no) || loading('A buscar a classificação…');
    else { const rr = P.filter(p => /^(RR|RK)$/i.test(p.code || '')), use = (rr.length ? rr : P.filter(p => /Pool|Round robin|Preliminary|Group|Regular/i.test(p.name || ''))).slice(0, 8);
      body = !use.length ? '<p class="sp-note">Esta competição ainda não tem classificação na FIVB.</p>' : use.map(p => { const R = need('vb:r:' + p.no, 10 * 6e4, () => VB.rank(p.no));
        (R || []).forEach(r => { const id = String(r.noTeam || ''); if (id && !VBT[id]) VBT[id] = { n: r.teamName || '', ab: r.teamCode || '', logo: t.nat ? flag2(IOC[r.teamCode]) : vLogo(r.teamName, t.g), t: t.no, nat: t.nat, g: t.g ? 1 : 0 }; });
        return (use.length > 1 ? `<h4 class="sp-gh">${esc(poolName(p.name))}</h4>` : '') + (!R ? errBox('vb:r:' + p.no) || loading('A buscar…') : !R.length ? '<p class="sp-note">Ainda sem jogos nesta fase.</p>'
          : `<div class="sp-tw"><table class="sp-tb"><thead><tr><th>#</th><th class="l">Equipa</th><th>J</th><th>V</th><th>D</th><th>Pts</th><th class="hm">Sets</th></tr></thead><tbody>${R.map((r, i) => `<tr class="${isMine('volei', String(r.noTeam)) ? 'me' : ''}"><td>${r.position || i + 1}</td><td class="l"><span class="sp-tn">${vImg({ logo: t.nat ? flag2(IOC[r.teamCode]) : vLogo(r.teamName, t.g), ab: r.teamCode, n: r.teamName }, 'sp-ti')}<span>${esc(r.teamName || '')}</span></span></td><td>${(+r.matchesWon || 0) + (+r.matchesLost || 0)}</td><td>${+r.matchesWon || 0}</td><td>${+r.matchesLost || 0}</td><td><b>${r.matchPoints != null ? +r.matchPoints : +r.matchesWon || 0}</b></td><td class="hm">${+r.setsWon || 0}:${+r.setsLost || 0}</td></tr>`).join('')}</tbody></table></div>`); }).join(''); } }
  else { if (!E) body = errBox(mk) || loading('A buscar as equipas…');
    else { const ids = [...new Set([].concat(...E.map(e => [e.h.id, e.a.id])).filter(id => id && id !== '0' && VBT[id]))].sort((a, b) => VBT[a].n.localeCompare(VBT[b].n));
      body = !ids.length ? '<p class="sp-note">As equipas aparecem quando a FIVB tiver os jogos desta competição.</p>' : `<p class="sp-note">Toca numa equipa para a seguir: aparece no início de Desportos com o próximo jogo e o resultado ao vivo, e recebes os avisos.</p><div class="sp-teams">${ids.map(id => { const x = VBT[id], on = isMine('volei', id); return `<button type="button" class="sp-team${on ? ' on' : ''}" data-act="dsFollow" data-sp="volei" data-id="${esc(id)}" aria-pressed="${on}" style="--tc:${sp[4]}">${vImg(x.nat ? x : Object.assign({}, x, { logo: x.logo || vLogo(x.n, x.g) }), 'sp-tl')}<b>${esc(x.n)}</b><span class="sp-star">${UI.ic(on ? 'check' : 'plus')}</span></button>`; }).join('')}</div>`; } }
  return chips + head + tabs + body; };

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
  try { if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'sp-' + tag, data: { url: '#esportes' } })).catch(() => { }); } catch (x) { } };
// o que conta como "marcar" em cada desporto (no basquetebol os pontos são a toda a hora: avisa o começo, o intervalo e o fim)
const ptsMsg = (e, side, d) => { const P = (spOf(e.lg) || [])[2] || '';
  if (e.lg === 'volei') return 'Set para ' + side.sn;
  if (/^hockey/.test(P)) return (d > 1 ? d + ' golos' : 'Golo') + ' · ' + side.sn;
  if (/^football/.test(P)) return (d >= 6 ? 'Touchdown' : d === 3 ? 'Field goal' : d === 2 ? 'Safety' : 'Pontos') + ' · ' + side.sn;
  if (/^baseball/.test(P)) return (d > 1 ? d + ' corridas' : 'Corrida') + ' · ' + side.sn;
  return ''; };
const lgL = e => (spOf(e.lg) || [])[1] || '';
const vsL = e => e.lg === 'volei' ? `${e.h.sn} ${e.h.s}–${e.a.s} ${e.a.sn}` : `${e.a.sn} ${e.a.s}–${e.h.s} ${e.h.sn}`;
const nmL = e => e.lg === 'volei' ? `${e.h.sn} × ${e.a.sn}` : `${e.a.sn} × ${e.h.sn}`;
const watchEv = e => { if (!e.h || !e.a || !e.d) return; const k = e.lg + ':' + e.id, p = SEEN[k], now = Date.now(), a = avS();
  const c = { st: e.st, s: e.st === 'pre' ? '' : (+e.h.s || 0) + '-' + (+e.a.s || 0), sn: e.sn || '', pre: p ? p.pre : 0, at: now }; SEEN[k] = c;
  if (a.pre && e.st === 'pre' && !c.pre && e.d - now <= 15 * 6e4 && e.d - now > 0) { c.pre = 1; say('Daqui a 15 minutos', nmL(e) + ' · ' + lgL(e), k + ':pre'); }
  if (!p) return;
  if (a.ini && p.st === 'pre' && c.st === 'in') say('Começou', nmL(e) + ' · ' + lgL(e), k + ':ini');
  if (a.pts && c.st !== 'pre' && p.s && c.s !== p.s) { const [ph, pa] = p.s.split('-').map(Number), hs = +e.h.s || 0, as = +e.a.s || 0, side = hs > ph ? e.h : as > pa ? e.a : null;
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
const tick = async () => { if (busy) return; busy = true; let hot = false, soon = false; const now = Date.now(), near = e => { if (isLive(e)) hot = true; else if (e.st === 'pre' && e.d - now < 30 * 6e4 && e.d - now > -36e5) soon = true; };
  try { const s = st(), T = s.teams, bell = s.bell || [];
    // equipas da ESPN: o quadro de hoje de cada liga
    await Promise.all([...new Set(T.filter(t => t.lg !== 'volei').map(t => t.lg))].map(spOf).filter(x => x && x[2]).map(async sp => { try { const j = await API.board(sp); DATA['b:' + sp[0] + ':hoje'] = { at: Date.now(), v: j };
      (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a && (isMine(sp[0], e.h.id) || isMine(sp[0], e.a.id))).forEach(e => { near(e); watchEv(e); }); } catch (x) { } }));
    // voleibol: os jogos das competições das tuas equipas
    await Promise.all([...new Set(T.filter(t => t.lg === 'volei' && t.t).map(t => t.t))].map(async no => { try { const L = await VB.matches(no); DATA['vb:m:' + no] = { at: Date.now(), v: L };
      L.map(m => vEv(m, true)).filter(e => e.d && Math.abs(e.d - now) < 2 * 864e5 && (isMine('volei', e.h.id) || isMine('volei', e.a.id))).forEach(e => { near(e); watchEv(e); }); } catch (x) { } }));
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
  return `<section class="sp-sec sp-av"><div class="sp-sh"><h3>Avisos</h3>${perm === 'granted' ? `<span class="sp-avok">${UI.ic('check')}Ligados neste aparelho</span>` : perm === 'na' ? '' : `<button type="button" class="btn sm" data-act="dsNotif">${UI.ic('bell')}Ligar neste aparelho</button>`}</div>
    <div class="sp-avt">${[['pre', '15 minutos antes'], ['ini', 'Começo do jogo'], ['pts', 'Golos, pontos e sets'], ['fim', 'Resultado final']].map(([k, l]) => `<label class="sp-sw"><input type="checkbox" data-act="dsAv" data-k="${k}" ${a[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <p class="sp-note">Das equipas que segues: golo no hóquei, touchdown na NFL, corrida no basebol e set no voleibol; no basquetebol, o começo, o intervalo e o fim. Na Fórmula 1, na MotoGP e no MMA, toca no sino. Os golos do futebol estão no Futebol. Chegam com o Prumo aberto (no computador, também em segundo plano).</p>
    ${FEED.length ? `<ul class="sp-feed">${FEED.slice(0, 5).map(f => `<li><span class="sp-fi">${UI.ic('bell')}</span><span><b>${esc(f.title)}</b> ${esc(f.body)}</span><small>${esc(agoL(f.at))}</small></li>`).join('')}</ul>` : ''}</section>`; };

/* ---------- início: ao vivo, as tuas equipas, os desportos, Olimpíadas ---------- */
const hub = () => { const s = st(), mine = s.mine.map(spOf).filter(Boolean), teams = s.teams;
  // ao vivo e a seguir: os quadros de hoje dos desportos de equipa que segues (e das tuas equipas)
  const lgs = [...new Set(mine.filter(x => x[3] === 'team').map(x => x[0]).concat(teams.map(t => t.lg)))].map(spOf).filter(x => x && x[2] && x[3] === 'team');
  const all = [].concat(...lgs.map(sp => { const j = need('b:' + sp[0] + ':hoje', 2e4, () => API.board(sp)); return j ? (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a) : []; }));
  // voleibol: os jogos das competições das tuas equipas (FIVB)
  const vbE = {}; teams.filter(t => t.lg === 'volei' && t.t).forEach(t => { if (!vbE[t.t]) vbE[t.t] = vbM(t.t, t.nat, t.g) || []; });
  const vbOf = t => (vbE[t.t] || []).filter(e => e.h.id === t.id || e.a.id === t.id).sort((a, b) => a.d - b.d);
  [].concat(...Object.values(vbE)).forEach(e => { if (isLive(e) && (isMine('volei', e.h.id) || isMine('volei', e.a.id)) && !all.some(x => x.lg === 'volei' && x.id === e.id)) all.push(e); });
  const schedOf = t => { if (t.lg === 'volei') return vbOf(t); const sp = spOf(t.lg); return sp && sp[2] ? need('sc:' + t.lg + ':' + t.id, 10 * 6e4, () => API.sched(sp, t.id)) || [] : []; };
  const nextOf = t => schedOf(t).find(e => e.st === 'pre' && e.d > Date.now() - 36e5);
  const nexts = teams.map(nextOf).filter(Boolean).sort((a, b) => a.d - b.d);
  const mineEv = all.filter(e => isMine(e.lg, e.h.id) || isMine(e.lg, e.a.id)), live = all.filter(isLive).sort((a, b) => (isMine(b.lg, b.h.id) || isMine(b.lg, b.a.id)) - (isMine(a.lg, a.h.id) || isMine(a.lg, a.a.id)));
  const top = live.length ? live.slice(0, 2) : nexts.slice(0, 1);
  const o = olyNext();
  const hero = `<section class="sp-hero"><div class="sp-hl"><span class="sp-ok">${live.length ? `<span class="sp-gs on"><i></i>${live.length} ${live.length === 1 ? 'jogo' : 'jogos'} ao vivo</span>` : 'Desportos'}</span><h2>${live.length ? 'Agora a jogar' : top.length ? 'A seguir' : 'Tudo o que segues, num só sítio'}</h2>${!top.length ? '<p>Futebol, NBA, Fórmula 1, ténis, UFC e mais: segue as tuas equipas e vê os resultados ao vivo, os próximos jogos e as classificações.</p>' : ''}</div>${top.length ? `<div class="sp-hg">${top.map(e => card(e, { big: 1, lg: 1 })).join('')}</div>` : ''}</section>`;
  const sports = `<div class="sp-sps">${SP.map(sp => { const on = s.mine.includes(sp[0]); return `<a class="sp-spc${on ? ' on' : ''}" href="${sp[0] === 'futebol' ? '#futebol' : '#esportes.' + sp[0]}" style="--sc:${sp[4]}" title="${esc(sp[6])}">${spIc(sp)}<b>${esc(sp[1])}</b></a>`; }).join('')}</div>`;
  // as tuas equipas: próximo jogo (ou ao vivo) e o último resultado
  const tcards = teams.length ? `<div class="sp-mt">${teams.map(t => { const sp = spOf(t.lg); if (!sp) return ''; const S = schedOf(t), now = Date.now(), V = t.lg === 'volei', sl = e => V ? `${esc(e.h.ab || e.h.sn)} ${esc(e.h.s)} – ${esc(e.a.s)} ${esc(e.a.ab || e.a.sn)}` : `${esc(e.a.ab || e.a.sn)} ${esc(e.a.s)} – ${esc(e.h.s)} ${esc(e.h.ab || e.h.sn)}`;
      const lv = all.find(e => isLive(e) && (e.h.id === t.id || e.a.id === t.id) && e.lg === t.lg), nx = S.find(e => e.st === 'pre' && e.d > now - 36e5), ls = [...S].reverse().find(e => e.st === 'post'), opp = e => e.h.id === t.id ? e.a : e.h;
      return `<div class="sp-tc${lv ? ' live' : ''}" style="--tc:${t.c || sp[4]}"><div class="sp-tch">${V ? vImg({ logo: t.logo || (t.nat ? '' : vLogo(t.n, t.g)), ab: t.ab, n: t.n }, 'sp-tcl') : img(t.logo, 'sp-tcl', t.ab)}<span><b>${esc(t.n)}</b><small>${spIc(sp)}${esc(sp[1])}</small></span><button type="button" class="sp-x" data-act="dsFollow" data-sp="${esc(t.lg)}" data-id="${esc(t.id)}" aria-label="Deixar de seguir ${esc(t.n)}">${UI.ic('x')}</button></div>
        ${lv ? `<div class="sp-tcl2"><span class="sp-gs on"><i></i>${esc(lv.det)}</span><b>${sl(lv)}</b></div>` : nx ? `<div class="sp-tcl2"><small>Próximo</small><b>${nx.h.id === t.id ? 'vs' : '@'} ${esc(opp(nx).sn)}</b><span>${esc(dayL(nx.d))}</span></div>` : ''}
        ${ls ? `<div class="sp-tcl2 last"><small>Último</small><b>${sl(ls)}</b><span class="${(ls.h.id === t.id ? ls.h : ls.a).w ? 'w' : 'l'}">${(ls.h.id === t.id ? ls.h : ls.a).w ? 'Vitória' : 'Derrota'}</span></div>` : ''}</div>`; }).join('')}</div>`
    : `<div class="sp-empty">${UI.ic('star')}<b>Ainda não segues nenhuma equipa</b><small>Abre um desporto (NBA, NFL, voleibol…) › Equipas e toca nas que queres seguir. No futebol, segue em Futebol.</small></div>`;
  const oly = `<a class="sp-olyb" href="#esportes.olimpiadas" style="--oc:${o.c}"><span class="sp-oring">${UI.ic('sp_oly')}</span><span><small>Olimpíadas</small><b>${esc(o.t)}</b><span>${esc(fmtR(o.ini, o.fim))}</span></span>${olyState(o) === 'pre' ? countdown(o) : '<span class="sp-gs on"><i></i>A decorrer</span>'}</a>`;
  return hero + sec('As tuas equipas', tcards) + avPanel() + oly + sec('Desportos', sports) + (live.length > 2 ? sec('Ao vivo agora', `<div class="sp-gg">${live.slice(2, 14).map(e => card(e, { lg: 1 })).join('')}</div>`) : ''); };

/* ---------- página ---------- */
V.esportes = sub => { const k = sub === 'ufc' ? 'mma' : sub || ''; if (k === 'futebol') { setTimeout(() => { location.hash = 'futebol'; }, 0); return loading('A abrir o Futebol…'); }
  const sp = spOf(k), nav = `<nav class="sp-nav" aria-label="Desportos"><a href="#esportes" class="${!k ? 'on' : ''}">${UI.ic('home')}Início</a>${SP.map(x => `<a href="${x[0] === 'futebol' ? '#futebol' : '#esportes.' + x[0]}" class="${k === x[0] ? 'on' : ''}" style="--sc:${x[4]}">${UI.ic(x[5])}${esc(x[1])}</a>`).join('')}</nav>`;
  let body;
  if (!sp) body = hub();
  else { const on = st().mine.includes(sp[0]);
    const head = sp[3] === 'oly' ? '' : `<section class="sp-shd" style="--sc:${sp[4]}">${spIc(sp, 1)}<div><h2>${esc(sp[1])}</h2><p>${esc(sp[6])}</p></div><span class="sp-hb">${sp[3] === 'f1' && sp[0] === 'f1' || sp[3] === 'moto' || sp[3] === 'mma' ? (b => `<button type="button" class="btn sm sp-bell${b ? ' on' : ''}" data-act="dsBell" data-sp="${sp[0]}" aria-pressed="${b}" title="${sp[3] === 'mma' ? 'Avisar 15 minutos antes e quando começa o evento' : 'Avisar 15 minutos antes e quando começam a qualificação, o sprint e a corrida'}">${UI.ic('bell')}${b ? 'Avisos ligados' : 'Avisar'}</button>`)((st().bell || []).includes(sp[0])) : ''}<button type="button" class="btn sm sp-fav${on ? ' on' : ''}" data-act="dsMine" data-sp="${sp[0]}" aria-pressed="${on}">${UI.ic(on ? 'check' : 'star')}${on ? 'Nos teus desportos' : 'Juntar aos meus'}</button></span></section>`;
    body = head + (sp[3] === 'team' ? teamPage(sp) : sp[3] === 'f1' ? f1Page(sp) : sp[3] === 'ten' ? tenPage(sp) : sp[3] === 'mma' ? mmaPage(sp) : sp[3] === 'golf' ? golfPage(sp) : sp[3] === 'moto' ? motoPage(sp) : sp[3] === 'vb' ? vbPage(sp) : sp[3] === 'oly' ? olyPage() : ''); }
  return UI.head('Desportos', 'O futebol e os outros desportos: as equipas que segues, o que está ao vivo, resultados, próximos jogos, classificações e as Olimpíadas.', '', 'Eu') + (sp ? nav : '') + `<div class="sp">${body}</div>`; };

/* ---------- ações ---------- */
A.dsTab = b => { UIst().tab[b.dataset.sp] = b.dataset.t; OS.request(); };
A.dsRetry = b => { const k = b.dataset.k; delete FAIL[k]; delete ERR[k]; if (DATA[k]) DATA[k].at = 0; OS.request(); };
A.dsDay = b => { UIst().day[b.dataset.sp] = b.dataset.d || ''; OS.request(); };
A.dsMine = b => { const s = st(), k = b.dataset.sp; s.mine = s.mine.includes(k) ? s.mine.filter(x => x !== k) : s.mine.concat(k); save(); UI.toast(s.mine.includes(k) ? spOf(k)[1] + ' nos teus desportos' : spOf(k)[1] + ' saiu dos teus desportos', 'pos'); OS.request(); };
A.dsFollow = b => { const s = st(), lg = b.dataset.sp, id = b.dataset.id, sp = spOf(lg); if (!sp) return; const i = s.teams.findIndex(t => t.lg === lg && t.id === id);
  if (i >= 0) { const t = s.teams[i]; s.teams.splice(i, 1); save(); UI.toast(t.n + ' deixou de ser seguida', 'pos'); }
  else { const T = lg === 'volei' ? Object.keys(VBT).map(k => Object.assign({ id: k }, VBT[k])) : (DATA['t:' + lg] && DATA['t:' + lg].v) || [], t = T.find(x => x.id === id); if (!t) return;
    s.teams.push(Object.assign({ lg, id, n: t.n, ab: t.ab, logo: t.logo, c: t.c || '' }, lg === 'volei' ? { t: t.t, nat: !!t.nat, g: t.g ? 1 : 0 } : {})); if (!s.mine.includes(lg)) s.mine.push(lg); save(); UI.toast('A seguir ' + t.n, 'pos'); }
  OS.request(); loop(1500); };
A.dsVb = b => { UIst().vb = b.dataset.no; OS.request(); };
A.dsMma = b => { UIst().mma = b.dataset.o; OS.request(); };
A.dsAv = b => { const s = st(); s.av = Object.assign({}, avS(), { [b.dataset.k]: b.checked ? 1 : 0 }); save(); };
A.dsBell = b => { const s = st(), k = b.dataset.sp, B = s.bell || []; s.bell = B.includes(k) ? B.filter(x => x !== k) : B.concat(k); save();
  if (s.bell.includes(k)) { UI.toast((spOf(k) || [])[1] + (k === 'mma' ? ': avisamos 15 minutos antes e quando começa cada evento' : ': avisamos 15 minutos antes e quando começam a qualificação, o sprint e a corrida'), 'pos'); if ('Notification' in window && Notification.permission === 'default') A.dsNotif(); }
  else UI.toast('Avisos da ' + (spOf(k) || [])[1] + ' desligados', 'pos'); OS.request(); loop(1500); };
A.dsNotif = async () => { if (!('Notification' in window)) return UI.toast('Este aparelho não deixa o app mandar avisos. No iPhone, instala o Prumo no ecrã principal.', 'warn');
  const p = await Notification.requestPermission(); UI.toast(p === 'granted' ? 'Avisos ligados neste aparelho' : 'Os avisos ficam só dentro do app (o aparelho não deu autorização)', p === 'granted' ? 'pos' : 'warn'); OS.request(); };
// ao vivo: com os Desportos abertos, atualiza a cada 20 s (e a contagem das Olimpíadas a cada minuto)
setInterval(() => { if (document.hidden || !/^#esportes/.test(location.hash)) return; const live = Object.keys(DATA).some(k => /^b:/.test(k) && DATA[k].v && (DATA[k].v.events || []).some(e => { const c = (e.competitions || [])[0] || {}; return ((c.status || e.status || {}).type || {}).state === 'in'; }));
  const vl = Object.keys(DATA).some(k => /^vb:m:/.test(k) && (DATA[k].v || []).some(m => { const s = +m.status || 0; return s >= 4 && s < 24 && Date.now() - Date.parse(m.dateTimeUtc) < 8 * 36e5; })), ml = DATA.mgp && DATA.mgp.v && DATA.mgp.v.live;
  if (live) Object.keys(DATA).filter(k => /^b:/.test(k)).forEach(k => { DATA[k].at = 0; }); if (vl) Object.keys(DATA).filter(k => /^vb:m:/.test(k)).forEach(k => { DATA[k].at = 0; }); if (ml) DATA.mgp.at = 0;
  if (live || vl || ml) OS.request(); }, 20000);
OS.Sports = { st, tick, seen: SEEN, feed: FEED, flush: () => MEM.clear(), liveN: () => Object.keys(DATA).filter(k => /^b:.*:/.test(k)).reduce((n, k) => n + ((DATA[k].v && DATA[k].v.events) || []).filter(e => { const c = (e.competitions || [])[0] || {}, sp = k.split(':')[1]; return ((c.status || e.status || {}).type || {}).state === 'in' && (c.competitors || []).some(x => x.team && isMine(sp, String(x.team.id))); }).length, 0) };
})();
