/* PRUMO — Desportos (Eu): o futebol e os outros desportos num só sítio, com as equipas que segues, o que está ao vivo,
   resultados, próximos jogos e classificações (ESPN), e as Olimpíadas com as datas e a contagem até à próxima edição.
   Futebol abre a página de Futebol que já existe; NBA, WNBA, NFL, MLB, NHL, basquetebol e futebol americano universitários
   têm jogos do dia, classificação e equipas para seguir; a Fórmula 1 tem o próximo Grande Prémio com as sessões e as
   classificações; o ténis (ATP e WTA) os jogos do torneio; o UFC o próximo evento com os combates; o golfe a classificação. */
(() => {
'use strict';
const OS = window.OS, U = OS.U, UI = OS.UI, A = OS.act, V = OS.views, { esc } = U;
OS.ONE_DEF.sports = { teams: [], mine: ['nba', 'f1'] };
const st = () => { const s = OS.one('sports'); if (!Array.isArray(s.teams)) s.teams = []; if (!Array.isArray(s.mine)) s.mine = []; return s; };
const save = () => OS.touch('sports');

/* ícones dos desportos (traço, 24×24) */
Object.assign(UI.IP, {
  sp_bask: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3v18M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8',
  sp_amf: 'M4 20C4 11 11 4 20 4c0 9-7 16-16 16zM9 15l6-6M10 12l2 2M12 10l2 2',
  sp_base: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM7 5c2 2.2 2 11.8 0 14M17 5c-2 2.2-2 11.8 0 14',
  sp_hock: 'M5 3l6 13h7M3 19h18M15 19v-3h5',
  sp_f1: 'M3 15h18M5 15l2-5h7l3 3h3M7 18a2 2 0 1 0 0-.01M17 18a2 2 0 1 0 0-.01M9 10V7',
  sp_ten: 'M9.5 3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM14 15l6 6M4 6c3 1 6 4 7 7M19 4a1.5 1.5 0 1 0 0 .01',
  sp_mma: 'M7 10V6a2 2 0 0 1 4 0v4M11 9V5a2 2 0 0 1 4 0v5M15 9a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-3a2 2 0 0 1 2-2h3',
  sp_golf: 'M12 18V3l7 3.5-7 3.5M7 21c0-1.7 2.2-3 5-3s5 1.3 5 3',
  sp_oly: 'M2 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M16 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M5.5 13.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12.5 13.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0'
});

/* os desportos: chave, nome, caminho na ESPN, tipo, cor, ícone, a que se refere */
const SP = [
  ['futebol', 'Futebol', '', 'fut', '#16a34a', 'ball', 'Equipas, seleções e campeonatos do mundo'],
  ['nba', 'NBA', 'basketball/nba', 'team', '#e11d48', 'sp_bask', 'Basquetebol dos EUA'],
  ['f1', 'Fórmula 1', 'racing/f1', 'f1', '#ef4444', 'sp_f1', 'Grandes Prémios e campeonato'],
  ['nfl', 'NFL', 'football/nfl', 'team', '#2563eb', 'sp_amf', 'Futebol americano'],
  ['atp', 'Ténis ATP', 'tennis/atp', 'ten', '#65a30d', 'sp_ten', 'Torneios masculinos'],
  ['wta', 'Ténis WTA', 'tennis/wta', 'ten', '#c026d3', 'sp_ten', 'Torneios femininos'],
  ['ufc', 'UFC', 'mma/ufc', 'mma', '#dc2626', 'sp_mma', 'Artes marciais mistas'],
  ['mlb', 'MLB', 'baseball/mlb', 'team', '#1d4ed8', 'sp_base', 'Basebol dos EUA'],
  ['nhl', 'NHL', 'hockey/nhl', 'team', '#0ea5e9', 'sp_hock', 'Hóquei no gelo'],
  ['wnba', 'WNBA', 'basketball/wnba', 'team', '#f97316', 'sp_bask', 'Basquetebol feminino dos EUA'],
  ['pga', 'Golfe PGA', 'golf/pga', 'golf', '#15803d', 'sp_golf', 'Circuito de golfe'],
  ['ncaab', 'Basquetebol universitário', 'basketball/mens-college-basketball', 'team', '#7c3aed', 'sp_bask', 'NCAA'],
  ['cfb', 'Futebol americano universitário', 'football/college-football', 'team', '#b45309', 'sp_amf', 'NCAA'],
  ['irl', 'IndyCar', 'racing/irl', 'f1', '#0891b2', 'sp_f1', 'Corridas nos EUA'],
  ['olimpiadas', 'Olimpíadas', '', 'oly', '#eab308', 'sp_oly', 'Datas, contagem e quadro de medalhas']];
const SPK = Object.fromEntries(SP.map(x => [x[0], x]));
const spOf = k => SPK[k] || null;

/* ESPN: primeiro direto; se o aparelho não conseguir, pelo servidor do Prumo (api/futebol aceita os desportos da ESPN) */
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/', V2 = 'https://site.api.espn.com/apis/v2/sports/';
const MEM = new Map(), INF = new Map(), ERR = {}; let VIA = navigator.webdriver ? Date.now() : 0;
const once = async (url, o) => { const ac = window.AbortController ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 12000);
  try { const r = await fetch(url, Object.assign({ signal: ac ? ac.signal : undefined }, o)); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { to && clearTimeout(to); } };
const get = (u, ttl) => { const m = MEM.get(u); if (m && Date.now() - m.at < ttl) return Promise.resolve(m.j); if (INF.has(u)) return INF.get(u);
  const viaApi = () => once('api/futebol?u=' + encodeURIComponent(u), { credentials: 'same-origin' });
  const p = (async () => { try { let j; if (Date.now() - VIA < 10 * 6e4) j = await viaApi(); else { try { j = await once(u, { credentials: 'omit', cache: 'no-store' }); } catch (e) { j = await viaApi(); VIA = Date.now(); } }
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
  return { id: String(e.id), lg, d: Date.parse(e.date || c.date), st: ty.state || 'pre', det: ty.shortDetail || ty.detail || '', h: tSide(h), a: tSide(a), name: e.shortName || e.name || '', ven: (c.venue && c.venue.fullName) || '' }; };
const dk = d => d.replace(/-/g, '');
const API = {
  board: (sp, day) => get(SITE + sp[2] + '/scoreboard' + (day ? '?dates=' + dk(day) : ''), 2e4),
  teams: sp => get(SITE + sp[2] + '/teams' + (sp[0] === 'ncaab' || sp[0] === 'cfb' ? '?limit=400' : ''), 864e5).then(j => (((((j.sports || [])[0] || {}).leagues || [])[0] || {}).teams || []).map(x => x.team).filter(Boolean).map(t => ({ id: String(t.id), n: t.displayName, sn: t.shortDisplayName || t.displayName, ab: t.abbreviation || '', logo: logoOf(t), c: t.color ? '#' + t.color : '' })).sort((a, b) => a.n.localeCompare(b.n))),
  sched: (sp, id) => get(SITE + sp[2] + '/teams/' + id + '/schedule', 10 * 6e4).then(j => (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a)),
  stand: sp => get(V2 + sp[2] + '/standings', 10 * 6e4).then(j => (j.children && j.children.length ? j.children : [j]).map(g => ({ name: g.name || '', rows: (((g.standings || {}).entries) || []).map(r => { const S = {}; (r.stats || []).forEach(x => { S[x.name || x.type] = x; }); const v = k => S[k] ? (S[k].displayValue != null ? S[k].displayValue : String(S[k].value)) : '';
    const who = r.team || r.athlete || {}; return { id: String(who.id || ''), n: who.displayName || who.name || '', logo: logoOf(who) || ((who.flag || {}).href || ''), w: v('wins'), l: v('losses'), t: v('ties') || v('otLosses'), pct: v('winPercent'), gb: v('gamesBehind'), seed: +v('playoffSeed') || +v('rank') || 0, pts: v('points') || v('championshipPts'), strk: v('streak') }; }).filter(r => r.n) })).filter(g => g.rows.length).map(g => { g.rows.sort((a, b) => (a.seed || 99) - (b.seed || 99) || (parseFloat(b.pct) || 0) - (parseFloat(a.pct) || 0)); return g; }))
};
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

/* ---------- UFC ---------- */
const mmaPage = sp => { const j = need('b:' + sp[0], 6e4, () => API.board(sp)); if (!j) return errBox('b:' + sp[0]) || loading('A buscar o evento…');
  const e = (j.events || [])[0]; if (!e) return `<div class="sp-empty">${spIc(sp, 1)}<b>Sem eventos marcados</b></div>`;
  const C = (e.competitions || []).slice().reverse(), main = C[0];
  const ftr = x => { const a = x.athlete || {}; return `<div class="sp-fx${x.winner ? ' win' : ''}">${img((a.flag || {}).href, 'sp-fl', '')}<b>${esc(a.displayName || '')}</b><small>${esc(((x.records || [])[0] || {}).summary || '')}</small></div>`; };
  return `<section class="sp-f1" style="--sc:${sp[4]}"><span class="sp-ok">${e.status && e.status.type && e.status.type.state === 'in' ? '<span class="sp-gs on"><i></i>Ao vivo</span>' : 'Próximo evento'}</span><h2>${esc(e.name || '')}</h2><p>${esc(dayL(Date.parse(e.date)))}${(e.venues || [])[0] ? ' · ' + esc(e.venues[0].fullName || '') : ''}</p>
    ${main ? `<div class="sp-main"><span>Combate principal · ${esc((main.type || {}).abbreviation || '')}</span><div class="sp-vs">${(main.competitors || []).map(ftr).join('<em>vs</em>')}</div></div>` : ''}</section>`
    + sec('Combates', `<div class="sp-ms">${C.slice(1).map(c => `<div class="sp-m${c.status.type.state === 'in' ? ' live' : ''}"><small>${esc((c.type || {}).abbreviation || '')}${c.status.type.state === 'post' ? ' · ' + esc(c.status.type.shortDetail || '') : ''}</small>${(c.competitors || []).map(ftr).join('')}</div>`).join('')}</div>`); };

/* ---------- golfe ---------- */
const golfPage = sp => { const j = need('b:' + sp[0], 6e4, () => API.board(sp)); if (!j) return errBox('b:' + sp[0]) || loading('A buscar o torneio…');
  const e = (j.events || [])[0]; if (!e) return `<div class="sp-empty">${spIc(sp, 1)}<b>Sem torneios esta semana</b></div>`; const c = (e.competitions || [])[0] || {};
  const R = (c.competitors || []).slice().sort((a, b) => (a.order || 999) - (b.order || 999)).slice(0, 20);
  return `<section class="sp-f1" style="--sc:${sp[4]}"><span class="sp-ok">Torneio</span><h2>${esc(e.name || '')}</h2><p>${esc(dayL(Date.parse(e.date)))}</p></section>` + sec('Classificação', `<ol class="sp-rk">${R.map(x => `<li><span class="sp-rn">${x.order || ''}</span>${img(((x.athlete || {}).flag || {}).href, 'sp-fl', '')}<b>${esc((x.athlete || {}).displayName || '')}</b><em>${esc(scoreOf(x.score))}</em></li>`).join('')}</ol>`); };

/* ---------- início: ao vivo, as tuas equipas, os desportos, Olimpíadas ---------- */
const hub = () => { const s = st(), mine = s.mine.map(spOf).filter(Boolean), teams = s.teams;
  // ao vivo e a seguir: os quadros de hoje dos desportos de equipa que segues (e das tuas equipas)
  const lgs = [...new Set(mine.filter(x => x[3] === 'team').map(x => x[0]).concat(teams.map(t => t.lg)))].map(spOf).filter(Boolean);
  const all = [].concat(...lgs.map(sp => { const j = need('b:' + sp[0] + ':hoje', 2e4, () => API.board(sp)); return j ? (j.events || []).map(e => tEv(e, sp[0])).filter(e => e.h && e.a) : []; }));
  const nextOf = t => { const sp = spOf(t.lg), S = sp ? need('sc:' + t.lg + ':' + t.id, 10 * 6e4, () => API.sched(sp, t.id)) || [] : []; return S.find(e => e.st === 'pre' && e.d > Date.now() - 36e5); };
  const nexts = teams.map(nextOf).filter(Boolean).sort((a, b) => a.d - b.d);
  const mineEv = all.filter(e => isMine(e.lg, e.h.id) || isMine(e.lg, e.a.id)), live = all.filter(isLive).sort((a, b) => (isMine(b.lg, b.h.id) || isMine(b.lg, b.a.id)) - (isMine(a.lg, a.h.id) || isMine(a.lg, a.a.id)));
  const top = live.length ? live.slice(0, 2) : nexts.slice(0, 1);
  const o = olyNext();
  const hero = `<section class="sp-hero"><div class="sp-hl"><span class="sp-ok">${live.length ? `<span class="sp-gs on"><i></i>${live.length} ${live.length === 1 ? 'jogo' : 'jogos'} ao vivo</span>` : 'Desportos'}</span><h2>${live.length ? 'Agora a jogar' : top.length ? 'A seguir' : 'Tudo o que segues, num só sítio'}</h2>${!top.length ? '<p>Futebol, NBA, Fórmula 1, ténis, UFC e mais: segue as tuas equipas e vê os resultados ao vivo, os próximos jogos e as classificações.</p>' : ''}</div>${top.length ? `<div class="sp-hg">${top.map(e => gCard(e, { big: 1, lg: 1 })).join('')}</div>` : ''}</section>`;
  const sports = `<div class="sp-sps">${SP.map(sp => { const on = s.mine.includes(sp[0]); return `<a class="sp-spc${on ? ' on' : ''}" href="${sp[0] === 'futebol' ? '#futebol' : '#esportes.' + sp[0]}" style="--sc:${sp[4]}" title="${esc(sp[6])}">${spIc(sp)}<b>${esc(sp[1])}</b></a>`; }).join('')}</div>`;
  // as tuas equipas: próximo jogo (ou ao vivo) e o último resultado
  const tcards = teams.length ? `<div class="sp-mt">${teams.map(t => { const sp = spOf(t.lg); if (!sp) return ''; const S = need('sc:' + t.lg + ':' + t.id, 10 * 6e4, () => API.sched(sp, t.id)) || [], now = Date.now();
      const lv = all.find(e => isLive(e) && (e.h.id === t.id || e.a.id === t.id) && e.lg === t.lg), nx = S.find(e => e.st === 'pre' && e.d > now - 36e5), ls = [...S].reverse().find(e => e.st === 'post'), opp = e => e.h.id === t.id ? e.a : e.h;
      return `<div class="sp-tc${lv ? ' live' : ''}" style="--tc:${t.c || sp[4]}"><div class="sp-tch">${img(t.logo, 'sp-tcl', t.ab)}<span><b>${esc(t.n)}</b><small>${spIc(sp)}${esc(sp[1])}</small></span><button type="button" class="sp-x" data-act="dsFollow" data-sp="${esc(t.lg)}" data-id="${esc(t.id)}" aria-label="Deixar de seguir ${esc(t.n)}">${UI.ic('x')}</button></div>
        ${lv ? `<div class="sp-tcl2"><span class="sp-gs on"><i></i>${esc(lv.det)}</span><b>${esc(lv.a.ab || lv.a.sn)} ${esc(lv.a.s)} – ${esc(lv.h.s)} ${esc(lv.h.ab || lv.h.sn)}</b></div>` : nx ? `<div class="sp-tcl2"><small>Próximo</small><b>${nx.h.id === t.id ? 'vs' : '@'} ${esc(opp(nx).sn)}</b><span>${esc(dayL(nx.d))}</span></div>` : ''}
        ${ls ? `<div class="sp-tcl2 last"><small>Último</small><b>${esc(ls.a.ab || ls.a.sn)} ${esc(ls.a.s)} – ${esc(ls.h.s)} ${esc(ls.h.ab || ls.h.sn)}</b><span class="${(ls.h.id === t.id ? ls.h : ls.a).w ? 'w' : 'l'}">${(ls.h.id === t.id ? ls.h : ls.a).w ? 'Vitória' : 'Derrota'}</span></div>` : ''}</div>`; }).join('')}</div>`
    : `<div class="sp-empty">${UI.ic('star')}<b>Ainda não segues nenhuma equipa</b><small>Abre um desporto (NBA, NFL, NHL…) › Equipas e toca nas que queres seguir. No futebol, segue em Futebol.</small></div>`;
  const oly = `<a class="sp-olyb" href="#esportes.olimpiadas" style="--oc:${o.c}"><span class="sp-oring">${UI.ic('sp_oly')}</span><span><small>Olimpíadas</small><b>${esc(o.t)}</b><span>${esc(fmtR(o.ini, o.fim))}</span></span>${olyState(o) === 'pre' ? countdown(o) : '<span class="sp-gs on"><i></i>A decorrer</span>'}</a>`;
  return hero + sec('As tuas equipas', tcards) + oly + sec('Desportos', sports) + (live.length > 2 ? sec('Ao vivo agora', `<div class="sp-gg">${live.slice(2, 14).map(e => gCard(e, { lg: 1 })).join('')}</div>`) : ''); };

/* ---------- página ---------- */
V.esportes = sub => { const k = sub || ''; if (k === 'futebol') { setTimeout(() => { location.hash = 'futebol'; }, 0); return loading('A abrir o Futebol…'); }
  const sp = spOf(k), nav = `<nav class="sp-nav" aria-label="Desportos"><a href="#esportes" class="${!k ? 'on' : ''}">${UI.ic('home')}Início</a>${SP.map(x => `<a href="${x[0] === 'futebol' ? '#futebol' : '#esportes.' + x[0]}" class="${k === x[0] ? 'on' : ''}" style="--sc:${x[4]}">${UI.ic(x[5])}${esc(x[1])}</a>`).join('')}</nav>`;
  let body;
  if (!sp) body = hub();
  else { const on = st().mine.includes(sp[0]);
    const head = sp[3] === 'oly' ? '' : `<section class="sp-shd" style="--sc:${sp[4]}">${spIc(sp, 1)}<div><h2>${esc(sp[1])}</h2><p>${esc(sp[6])}</p></div><button type="button" class="btn sm sp-fav${on ? ' on' : ''}" data-act="dsMine" data-sp="${sp[0]}" aria-pressed="${on}">${UI.ic(on ? 'check' : 'star')}${on ? 'Nos teus desportos' : 'Juntar aos meus'}</button></section>`;
    body = head + (sp[3] === 'team' ? teamPage(sp) : sp[3] === 'f1' ? f1Page(sp) : sp[3] === 'ten' ? tenPage(sp) : sp[3] === 'mma' ? mmaPage(sp) : sp[3] === 'golf' ? golfPage(sp) : sp[3] === 'oly' ? olyPage() : ''); }
  return UI.head('Desportos', 'O futebol e os outros desportos: as equipas que segues, o que está ao vivo, resultados, próximos jogos, classificações e as Olimpíadas.', '', 'Eu') + (sp ? nav : '') + `<div class="sp">${body}</div>`; };

/* ---------- ações ---------- */
A.dsTab = b => { UIst().tab[b.dataset.sp] = b.dataset.t; OS.request(); };
A.dsRetry = b => { const k = b.dataset.k; delete FAIL[k]; delete ERR[k]; if (DATA[k]) DATA[k].at = 0; OS.request(); };
A.dsDay = b => { UIst().day[b.dataset.sp] = b.dataset.d || ''; OS.request(); };
A.dsMine = b => { const s = st(), k = b.dataset.sp; s.mine = s.mine.includes(k) ? s.mine.filter(x => x !== k) : s.mine.concat(k); save(); UI.toast(s.mine.includes(k) ? spOf(k)[1] + ' nos teus desportos' : spOf(k)[1] + ' saiu dos teus desportos', 'pos'); OS.request(); };
A.dsFollow = b => { const s = st(), lg = b.dataset.sp, id = b.dataset.id, sp = spOf(lg); if (!sp) return; const i = s.teams.findIndex(t => t.lg === lg && t.id === id);
  if (i >= 0) { const t = s.teams[i]; s.teams.splice(i, 1); save(); UI.toast(t.n + ' deixou de ser seguida', 'pos'); }
  else { const T = (DATA['t:' + lg] && DATA['t:' + lg].v) || [], t = T.find(x => x.id === id); if (!t) return; s.teams.push({ lg, id, n: t.n, ab: t.ab, logo: t.logo, c: t.c }); if (!s.mine.includes(lg)) s.mine.push(lg); save(); UI.toast('A seguir ' + t.n, 'pos'); }
  OS.request(); };
// ao vivo: com os Desportos abertos, atualiza a cada 20 s (e a contagem das Olimpíadas a cada minuto)
setInterval(() => { if (document.hidden || !/^#esportes/.test(location.hash)) return; const live = Object.keys(DATA).some(k => /^b:/.test(k) && DATA[k].v && (DATA[k].v.events || []).some(e => { const c = (e.competitions || [])[0] || {}; return ((c.status || e.status || {}).type || {}).state === 'in'; }));
  if (live) { Object.keys(DATA).filter(k => /^b:/.test(k)).forEach(k => { DATA[k].at = 0; }); OS.request(); } }, 20000);
OS.Sports = { st, liveN: () => Object.keys(DATA).filter(k => /^b:.*:/.test(k)).reduce((n, k) => n + ((DATA[k].v && DATA[k].v.events) || []).filter(e => { const c = (e.competitions || [])[0] || {}, sp = k.split(':')[1]; return ((c.status || e.status || {}).type || {}).state === 'in' && (c.competitors || []).some(x => x.team && isMine(sp, String(x.team.id))); }).length, 0) };
})();
