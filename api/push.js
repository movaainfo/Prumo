// PRUMO · notificações com o app fechado (Web Push). Função do Vercel.
// Cada aparelho que liga as notificações dá ao servidor o seu endereço de entrega (subscrição do navegador). O app manda
// também o que é preciso para saber QUANDO avisar: os próximos lembretes (rotina, bloco de foco), o que segues no futebol
// e nos outros desportos e os alertas de preço. A cada minuto (tarefa agendada da Vercel) o servidor vê o que está na hora,
// segue os jogos e as cotações e envia. Nada passa por terceiros além do serviço de entrega do próprio navegador
// (Google para Chrome/Android, Apple para Safari/iPhone, Mozilla para Firefox), e a mensagem vai cifrada para o aparelho.
//   POST op: chave | ligar | desligar | dados | estado | testar     (com a sessão da conta)
//   GET  ?op=cron                                                  (a tarefa agendada)
// Guardado no Vercel Blob privado e cifrado: push/idx (aparelhos e dados de cada perfil), push/st (o que já foi enviado).
'use strict';
const crypto = require('crypto'), N = require('./_nuvem'), W = require('./_webpush'), F = require('./futebol');
const PID = /^[a-f0-9]{12}$/, IDX = 'push/idx', STP = 'push/st';
const CAT0 = { rot: 1, foco: 1, fut: 1, sp: 1, inv: 1, jogo: 1, ep: 1 }; // v3.73: jogo = o Pursuit (começo às 20h e resultados às 22h) · v3.77: ep = episódios novos dos animes com o sino
let VK = null; const vapid = async () => VK || (VK = W.vapidFrom(await N.master()));
const pkey = async () => Buffer.from(crypto.hkdfSync('sha256', await N.master(), Buffer.from('nautilo-v1'), Buffer.from('push'), 32));
const load = async p => { const g = await N.store().get(p); if (!g) return { v: {}, etag: null }; try { return { v: N.open(await pkey(), g.buf) || {}, etag: g.etag }; } catch (e) { return { v: {}, etag: g.etag }; } };
const save = async (p, v, etag) => N.store().put(p, N.seal(await pkey(), v), etag ? { ifMatch: etag } : {});
// muda um documento sem perder o que outro pedido escreveu ao mesmo tempo
const mutate = async (p, fn) => { for (let i = 0; i < 6; i++) { const { v, etag } = await load(p); const r = fn(v); if (r === false) return false;
  try { await save(p, v, etag); return r; } catch (e) { if (e.code !== 'conflict') throw e; await new Promise(z => setTimeout(z, 80 + Math.random() * 200)); } } throw Object.assign(new Error('ocupado'), { status: 503 }); };
const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { await fn(items[k], k); } catch (e) { } } })); };

/* ---------- textos (o app tem várias línguas: aqui só as frases dos avisos) ---------- */
const TX = {
  'pt-PT': { emp: 'Empate', pre: 'Daqui a 15 minutos', ini: 'Começou', gol: 'Golo', gols: 'golos', int: 'Intervalo', fim: 'Terminou', adi: 'Adiado', vit: 'Vitória', der: 'Derrota', set: 'Set para', run: 'Corrida', runs: 'corridas', ass: 'assistência de', pen: 'pen.', og: 'pb', in15: 'daqui a 15 minutos', beg: 'Começou:', win: 'Vencedor', test: 'Notificações ligadas', testb: 'Vão chegar mesmo com o Prumo fechado.', RAC: 'Corrida', SPR: 'Sprint', Q2: 'Qualificação 2', Race: 'Corrida', Sprint: 'Sprint', Qual: 'Qualificação' },
  'pt-BR': { emp: 'Empate', pre: 'Em 15 minutos', ini: 'Começou', gol: 'Gol', gols: 'gols', int: 'Intervalo', fim: 'Terminou', adi: 'Adiado', vit: 'Vitória', der: 'Derrota', set: 'Set para', run: 'Corrida', runs: 'corridas', ass: 'assistência de', pen: 'pên.', og: 'contra', in15: 'em 15 minutos', beg: 'Começou:', win: 'Vencedor', test: 'Notificações ativadas', testb: 'Vão chegar mesmo com o Prumo fechado.', RAC: 'Corrida', SPR: 'Sprint', Q2: 'Classificação 2', Race: 'Corrida', Sprint: 'Sprint', Qual: 'Classificação' },
  en: { emp: 'Draw', pre: 'In 15 minutes', ini: 'Started', gol: 'Goal', gols: 'goals', int: 'Half-time', fim: 'Full time', adi: 'Postponed', vit: 'Win', der: 'Loss', set: 'Set to', run: 'Run', runs: 'runs', ass: 'assist by', pen: 'pen.', og: 'o.g.', in15: 'in 15 minutes', beg: 'Started:', win: 'Winner', test: 'Notifications on', testb: 'They will arrive even with Prumo closed.', RAC: 'Race', SPR: 'Sprint', Q2: 'Qualifying 2', Race: 'Race', Sprint: 'Sprint', Qual: 'Qualifying' },
  es: { emp: 'Empate', pre: 'En 15 minutos', ini: 'Empezó', gol: 'Gol', gols: 'goles', int: 'Descanso', fim: 'Final', adi: 'Aplazado', vit: 'Victoria', der: 'Derrota', set: 'Set para', run: 'Carrera', runs: 'carreras', ass: 'asistencia de', pen: 'pen.', og: 'p.p.', in15: 'en 15 minutos', beg: 'Empezó:', win: 'Ganador', test: 'Notificaciones activadas', testb: 'Llegarán incluso con Prumo cerrado.', RAC: 'Carrera', SPR: 'Sprint', Q2: 'Clasificación 2', Race: 'Carrera', Sprint: 'Sprint', Qual: 'Clasificación' },
  fr: { emp: 'Match nul', pre: 'Dans 15 minutes', ini: 'C’est parti', gol: 'But', gols: 'buts', int: 'Mi-temps', fim: 'Terminé', adi: 'Reporté', vit: 'Victoire', der: 'Défaite', set: 'Set pour', run: 'Point', runs: 'points', ass: 'passe de', pen: 'pen.', og: 'c.s.c.', in15: 'dans 15 minutes', beg: 'C’est parti :', win: 'Vainqueur', test: 'Notifications activées', testb: 'Elles arriveront même avec Prumo fermé.', RAC: 'Course', SPR: 'Sprint', Q2: 'Qualifications 2', Race: 'Course', Sprint: 'Sprint', Qual: 'Qualifications' },
  it: { emp: 'Pareggio', pre: 'Tra 15 minuti', ini: 'Iniziata', gol: 'Gol', gols: 'gol', int: 'Intervallo', fim: 'Finita', adi: 'Rinviata', vit: 'Vittoria', der: 'Sconfitta', set: 'Set a', run: 'Punto', runs: 'punti', ass: 'assist di', pen: 'rig.', og: 'aut.', in15: 'tra 15 minuti', beg: 'Iniziata:', win: 'Vincitore', test: 'Notifiche attive', testb: 'Arriveranno anche con Prumo chiuso.', RAC: 'Gara', SPR: 'Sprint', Q2: 'Qualifiche 2', Race: 'Gara', Sprint: 'Sprint', Qual: 'Qualifiche' },
  de: { emp: 'Unentschieden', pre: 'In 15 Minuten', ini: 'Angepfiffen', gol: 'Tor', gols: 'Tore', int: 'Halbzeit', fim: 'Abpfiff', adi: 'Verschoben', vit: 'Sieg', der: 'Niederlage', set: 'Satz für', run: 'Run', runs: 'Runs', ass: 'Vorlage von', pen: 'Elfm.', og: 'ET', in15: 'in 15 Minuten', beg: 'Gestartet:', win: 'Sieger', test: 'Benachrichtigungen an', testb: 'Sie kommen auch, wenn Prumo geschlossen ist.', RAC: 'Rennen', SPR: 'Sprint', Q2: 'Qualifying 2', Race: 'Rennen', Sprint: 'Sprint', Qual: 'Qualifying' } };
const T = (lang, k) => ((TX[lang] || TX['pt-PT'])[k]) || TX['pt-PT'][k] || k;

/* ---------- validação ---------- */
const str = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
const hash = (x, n) => /^#[\w.-]{0,60}$/.test(String(x || '')) ? String(x) : '#' + (n || 'hoje');
const items = (L, max) => (Array.isArray(L) ? L : []).filter(x => x && +x.at > 0).map(x => ({ at: Math.round(+x.at), t: str(x.t, 120), b: str(x.b, 240), u: hash(x.u), g: str(x.g, 60).replace(/[^\w.:-]/g, '') }))
  .filter(x => x.t && x.at > Date.now() - 36e5 && x.at < Date.now() + 16 * 864e5).sort((a, b) => a.at - b.at).slice(0, max);
const av = o => { const r = {}; Object.keys(o || {}).slice(0, 12).forEach(k => { if (/^[a-z]{2,5}$/.test(k)) r[k] = o[k] ? 1 : 0; }); return r; };
const PARTS = {
  rot: d => items(d, 320), foco: d => items(d, 6), vivo: d => items(d, 4), jogo: d => items(d, 4), // v3.73: Pursuit · v3.72: fim do descanso no treino e de outros tempos em curso
  fut: d => ({ teams: (Array.isArray(d && d.teams) ? d.teams : []).slice(0, 40).map(t => ({ id: str(t.id, 20).replace(/\D/g, ''), n: str(t.n, 60) })).filter(t => t.id), comps: (Array.isArray(d && d.comps) ? d.comps : []).slice(0, 30).map(c => ({ slug: str(c.slug, 40).replace(/[^a-z0-9._-]/g, ''), n: str(c.n, 60) })).filter(c => c.slug), av: av(d && d.av) }),
  sp: d => ({ teams: (Array.isArray(d && d.teams) ? d.teams : []).slice(0, 60).map(t => ({ lg: str(t.lg, 12).replace(/[^a-z0-9]/g, ''), id: str(t.id, 20).replace(/[^\w-]/g, ''), n: str(t.n, 60), t: str(t.t, 12).replace(/\D/g, '') })).filter(t => t.lg && t.id), bell: (Array.isArray(d && d.bell) ? d.bell : []).filter(k => ['f1', 'motogp', 'mma'].includes(k)), av: av(d && d.av) }),
  inv: d => (Array.isArray(d) ? d : []).slice(0, 80).map(a => ({ id: str(a.id, 40), s: str(a.s, 24).replace(/[^A-Za-z0-9.=^_-]/g, ''), k: str(a.k, 8).replace(/[^a-z]/g, ''), v: +a.v || 0, r: a.r === 'diario' ? 'diario' : 'uma', n: str(a.n, 80), on: a.on ? 1 : 0 })).filter(a => a.s && a.id && ['acima', 'abaixo', 'queda', 'subida'].includes(a.k)),
  // v3.77: os animes: hu = joga o Pursuit (avisos todos os dias, mesmo sem abrir o jogo); eps = os animes com o sino ligado (AniList e/ou MyAnimeList)
  an: d => ({ hu: d && d.hu ? 1 : 0, eps: (Array.isArray(d && d.eps) ? d.eps : []).slice(0, 80).map(x => ({ al: Math.floor(+x.al || 0), mal: Math.floor(+x.mal || 0), t: str(x.t, 120) }))
    .filter(x => x.t && x.al >= 0 && x.mal >= 0 && x.al < 1e7 && x.mal < 1e7 && (x.al || x.mal)) }),
  cat: d => { const r = {}; Object.keys(CAT0).forEach(k => { r[k] = d && d[k] === 0 ? 0 : 1; }); return r; } };

// a sessão vale e o perfil é desta conta (como nos dados)
const OKS = new Map();
const who = async (req, pid) => { const t = await N.readToken(req); if (!t) throw Object.assign(new Error('A sessão terminou. Entra outra vez.'), { status: 401, code: 'sessao' });
  if (!PID.test(pid)) throw Object.assign(new Error('Perfil inválido.'), { status: 400 });
  const k = t.u + '|' + t.v + '|' + pid, c = OKS.get(k);
  if (!c || Date.now() - c.at > 30000) { const g = await N.store().get('a/' + t.a); let r = null; try { r = g && N.open(await N.accKey(), g.buf); } catch (e) { }
    if (!r || r.uid !== t.u || (r.tv || 1) !== t.v) throw Object.assign(new Error('A sessão terminou. Entra outra vez.'), { status: 401, code: 'sessao' });
    if (!(r.perfis || []).some(x => x.id === pid)) throw Object.assign(new Error('Este perfil já não existe.'), { status: 404 });
    OKS.set(k, { at: Date.now(), em: r.email }); if (OKS.size > 3000) OKS.delete(OKS.keys().next().value); }
  await N.gate((OKS.get(k) || {}).em); return t.u + '|' + pid; };

/* ---------- envio ---------- */
// mensagens [{ uk, m: { t, b, u, g }, ttl }] → para todos os aparelhos de cada perfil; tira os aparelhos que já não aceitam
const deliver = async (I, out, o = {}) => { if (!out.length) return { n: 0, gone: 0 }; const V = await vapid(), jobs = [], gone = new Set(); let n = 0;
  out.forEach(x => { const u = (I.u || {})[x.uk]; ((u && u.subs) || []).forEach(s => jobs.push({ s, x })); });
  await pool(jobs, 10, async ({ s, x }) => { const r = await W.send(V, s, Object.assign({ at: Date.now() }, x.m), { ttl: x.ttl || 3600, topic: x.m.g, fetch: o.fetch }); if (r.ok) n++; if (r.gone) gone.add(s.e); });
  if (gone.size) await mutate(IDX, v => { Object.values(v.u || {}).forEach(u => { u.subs = (u.subs || []).filter(s => !gone.has(s.e)); }); });
  if (n) N.count('push', n); return { n, gone: gone.size }; };

/* ---------- desportos: os jogos e as sessões que alguém segue ---------- */
const ESPN = { nba: 'basketball/nba', nfl: 'football/nfl', mlb: 'baseball/mlb', nhl: 'hockey/nhl', wnba: 'basketball/wnba', ncaab: 'basketball/mens-college-basketball', cfb: 'football/college-football' };
const SITE = () => process.env.ESPN_SITE_ALL || 'https://site.api.espn.com/apis/site/v2/sports/';
const scr = x => x == null ? '' : typeof x === 'object' ? String(x.displayValue != null ? x.displayValue : x.value != null ? x.value : '') : String(x);
const side = x => x && x.team ? { id: String(x.team.id), n: x.team.displayName || '', sn: x.team.shortDisplayName || x.team.displayName || '', s: scr(x.score), w: !!x.winner } : null;
const tEv = (e, lg) => { const c = (e.competitions || [])[0] || {}, ty = ((c.status || e.status || {}).type) || {}, cp = c.competitors || [];
  return { k: lg + ':' + e.id, lg, d: Date.parse(e.date || c.date) || 0, st: ty.state || 'pre', sn: ty.name || '', h: side(cp.find(x => x.homeAway === 'home') || cp[0]), a: side(cp.find(x => x.homeAway === 'away') || cp[1]) }; };
const ptsMsg = (lang, lg, sd, d) => { const P = ESPN[lg] || '';
  if (/^hockey/.test(P)) return (d > 1 ? d + ' ' + T(lang, 'gols') : T(lang, 'gol')) + ' · ' + sd.sn;
  if (/^football/.test(P)) return (d >= 6 ? 'Touchdown' : d === 3 ? 'Field goal' : d === 2 ? 'Safety' : '+' + d) + ' · ' + sd.sn;
  if (/^baseball/.test(P)) return (d > 1 ? d + ' ' + T(lang, 'runs') : T(lang, 'run')) + ' · ' + sd.sn;
  return ''; };
const LGN = { nba: 'NBA', nfl: 'NFL', mlb: 'MLB', nhl: 'NHL', wnba: 'WNBA', ncaab: 'NCAA', cfb: 'NCAA', f1: 'Fórmula 1', motogp: 'MotoGP', mma: 'MMA' };
const MMAORG = [['ufc', 'UFC'], ['pfl', 'PFL'], ['lfa', 'LFA'], ['cage-warriors', 'Cage Warriors'], ['bellator', 'Bellator'], ['ksw', 'KSW'], ['rizin', 'Rizin']];
const ymd = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');

// o que mudou num jogo desde a última vez: 15 minutos antes, começou, marcou, intervalo, acabou
const changes = (e, p, now) => { const c = { st: e.st, s: e.st === 'pre' ? '' : (+e.h.s || 0) + '-' + (+e.a.s || 0), sn: e.sn || '', pre: p ? p.pre : 0, at: e.d || now }, out = [];
  if (e.st === 'pre' && !c.pre && e.d - now > 0 && e.d - now <= 15 * 6e4 && !/POSTPONED|CANCELED/.test(e.sn)) { c.pre = 1; out.push({ y: 'pre' }); }
  if (p) {
    if (p.st === 'pre' && c.st === 'in') out.push({ y: 'ini' });
    const ps = p.s || (p.st === 'pre' ? '0-0' : ''); if (c.st !== 'pre' && ps && c.s !== ps) { const [ph, pa] = ps.split('-').map(Number), hs = +e.h.s || 0, as = +e.a.s || 0, sd = hs > ph ? e.h : as > pa ? e.a : null; out.push({ y: 'pts', sd, d: sd === e.h ? hs - ph : as - pa }); }
    if (/HALFTIME/.test(c.sn) && !/HALFTIME/.test(p.sn || '')) out.push({ y: 'int' });
    if (p.st !== 'post' && c.st === 'post') out.push({ y: 'fim' }); }
  return { c, out }; };

const sports = async (U, st, now, out) => {
  const FUT = U.filter(([, x]) => x.cat.fut && x.fut && ((x.fut.teams || []).length || (x.fut.comps || []).length));
  const SPT = U.filter(([, x]) => x.cat.sp && x.sp && (x.sp.teams || []).length), BELL = U.filter(([, x]) => x.cat.sp && x.sp && (x.sp.bell || []).length);
  if (!FUT.length && !SPT.length && !BELL.length) return;
  const evs = [];
  // futebol: todos os jogos do dia de uma vez (a função do futebol já os junta e diz quem marcou)
  if (FUT.length) { const days = [ymd(now)]; if (new Date(now).getUTCHours() >= 21) days.push(ymd(now + 864e5));
    for (const d of days) { try { const j = await F.vivo(d, true); (j.ev || []).forEach(e => { if (!evs.some(x => x.k === 'fut:' + e.id)) evs.push(Object.assign({}, e, { k: 'fut:' + e.id, lg: 'fut', slug: e.lg })); }); } catch (e) { } } }
  // outros desportos de equipa (ESPN)
  const lgs = [...new Set(SPT.flatMap(([, x]) => x.sp.teams.map(t => t.lg)).filter(lg => ESPN[lg]))];
  await pool(lgs, 4, async lg => { const j = await F.getJ(SITE() + ESPN[lg] + '/scoreboard', 7000); (j.events || []).forEach(e => { const v = tEv(e, lg); if (v.h && v.a) evs.push(v); }); });
  st.ev = st.ev || {};
  for (const e of evs) { if (!e.h || !e.a) continue; const isF = e.lg === 'fut';
    // quem segue este jogo
    const fol = isF ? FUT.filter(([, x]) => x.fut.teams.some(t => t.id === e.h.id || t.id === e.a.id) || (x.fut.av.comp && x.fut.comps.some(c => c.slug === e.slug)))
      : SPT.filter(([, x]) => x.sp.teams.some(t => t.lg === e.lg && (t.id === e.h.id || t.id === e.a.id)));
    if (!fol.length) continue;
    const p = st.ev[e.k], { c, out: ch } = changes(e, p, now); st.ev[e.k] = c; if (!ch.length) continue;
    for (const [uk, x] of fol) { const lang = x.lang || 'pt-PT', A = isF ? Object.assign({ pre: 1, ini: 1, gol: 1, int: 0, fim: 1, comp: 0 }, x.fut.av) : Object.assign({ pre: 1, ini: 1, pts: 1, fim: 1 }, x.sp.av);
      const mineT = isF ? x.fut.teams.find(t => t.id === e.h.id || t.id === e.a.id) : x.sp.teams.find(t => t.lg === e.lg && (t.id === e.h.id || t.id === e.a.id)), me = mineT ? (mineT.id === e.h.id ? e.h : e.a) : null;
      const nm = `${e.h.n || e.h.sn} × ${e.a.n || e.a.sn}`, vs = `${e.h.sn} ${+e.h.s || 0}-${+e.a.s || 0} ${e.a.sn}`, L = isF ? '' : ' · ' + (LGN[e.lg] || ''), url = isF ? '#futebol' : '#esportes', g = 'ev-' + e.k.replace(/[^\w-]/g, '-');
      const push = (t, b) => out.push({ uk, m: { t, b, u: url, g }, ttl: 900 });
      for (const y of ch) {
        if (y.y === 'pre' && A.pre) push(T(lang, 'pre'), nm + L);
        if (y.y === 'ini' && A.ini) push(T(lang, 'ini'), nm + L);
        if (y.y === 'pts') { if (isF && A.gol && y.sd) { const k = (e.ke || []).filter(z => (z.t === 'g' || z.t === 'og') && z.tid === y.sd.id).pop() || (e.ke || []).filter(z => z.t === 'g' || z.t === 'og').pop();
            push(T(lang, 'gol') + ' · ' + y.sd.sn, (k && k.who ? k.who + (k.t === 'og' ? ' (' + T(lang, 'og') + ')' : k.pen ? ' (' + T(lang, 'pen') + ')' : '') + (k.min ? ' ' + k.min : '') + (k.as ? ', ' + T(lang, 'ass') + ' ' + k.as : '') + ' · ' : '') + vs); }
          else if (!isF && A.pts && y.sd) { const t = ptsMsg(lang, e.lg, y.sd, y.d); if (t) push(t, vs + L); } }
        if (y.y === 'int' && (isF ? A.int : A.ini)) push(T(lang, 'int'), vs + L);
        if (y.y === 'fim' && A.fim) { const ot = me === e.h ? e.a : e.h, res = !me ? '' : isF ? (+me.s > +ot.s ? 'vit' : +me.s < +ot.s ? 'der' : 'emp') : me.w ? 'vit' : ot.w ? 'der' : '';
          push(/POSTPONED|CANCELED/.test(e.sn) ? T(lang, 'adi') : res ? T(lang, res) + ' · ' + me.sn : T(lang, 'fim'), vs + L); }
      } } }
  // Fórmula 1, MotoGP e MMA com o sino: 15 minutos antes e quando começa (qualificação, sprint, corrida; o evento no MMA) e o vencedor
  if (BELL.length) { const S = [], wins = [], want = k => BELL.filter(([, x]) => x.sp.bell.includes(k));
    if (want('f1').length) { try { const j = await F.getJ(SITE() + 'racing/f1/scoreboard', 7000), e = (j.events || [])[0];
      if (e) (e.competitions || []).forEach(c => { const ab = (c.type || {}).abbreviation || '', stt = ((c.status || {}).type || {}).state, d = Date.parse(c.date);
        if (/^(Race|Sprint|Qual)$/.test(ab)) S.push({ lg: 'f1', ab, d, gp: e.name || '' });
        if (ab === 'Race' && stt === 'post' && now - d < 8 * 36e5) { const w = (c.competitors || []).find(z => z.order === 1); if (w) wins.push({ lg: 'f1', k: 'win:f1:' + e.id, who: (w.athlete || {}).displayName || '', gp: e.name || '' }); } }); } catch (x) { } }
    if (want('motogp').length) { try { const D = await F.mgp(), g = (D.gps || []).find(x => x.b + 864e5 > now);
      if (g) g.sess.forEach(x => { if (/^(RAC|SPR|Q2)$/.test(x.ab)) S.push({ lg: 'motogp', ab: x.ab, d: x.d, gp: gpName(g.n) }); });
      const R = D.res, rs = R && (R.s || []).find(x => x.ab === 'RAC'), gg = R && (D.gps || []).find(x => x.sn === R.sn), rac = gg && gg.sess.find(x => x.ab === 'RAC');
      if (rs && rs.rows[0] && rac && now - rac.d < 8 * 36e5) wins.push({ lg: 'motogp', k: 'win:motogp:' + R.sn + ':' + D.y, who: rs.rows[0].n, gp: gpName(R.n) }); } catch (x) { } }
    if (want('mma').length) await pool(MMAORG, 4, async ([o, l]) => { const j = await F.getJ(SITE() + 'mma/' + o + '/scoreboard', 7000), e = (j.events || [])[0]; if (e) S.push({ lg: 'mma', ab: 'EV', d: Date.parse(e.date), gp: e.name || l }); });
    S.forEach(x => { if (!x.d) return; const k = 'ss:' + x.lg + ':' + x.ab + ':' + x.d, p = Object.assign({}, st.ev[k] || {}), y = []; p.at = x.d;
      if (!p.pre && x.d - now > 0 && x.d - now <= 15 * 6e4) { p.pre = 1; y.push('pre'); }
      if (!p.ini && now >= x.d && now - x.d < 15 * 6e4) { p.ini = 1; y.push('ini'); }
      st.ev[k] = p; if (!y.length) return;
      want(x.lg).forEach(([uk, u]) => { const lang = u.lang || 'pt-PT', A = Object.assign({ pre: 1, ini: 1, pts: 1, fim: 1 }, u.sp.av), nmS = x.lg === 'mma' ? x.gp : T(lang, x.ab), L = (LGN[x.lg] || '') + (x.lg === 'mma' ? '' : ' · ' + x.gp), g = 'ss-' + x.lg + '-' + x.ab;
        y.forEach(z => { if (z === 'pre' && A.pre) out.push({ uk, m: { t: nmS + ' ' + T(lang, 'in15'), b: L, u: '#esportes.' + x.lg, g }, ttl: 900 }); if (z === 'ini' && A.ini) out.push({ uk, m: { t: T(lang, 'beg') + ' ' + nmS, b: L, u: '#esportes.' + x.lg, g }, ttl: 900 }); }); }); });
    wins.forEach(w => { if (st.ev[w.k]) return; st.ev[w.k] = { at: now }; want(w.lg).forEach(([uk, u]) => { const lang = u.lang || 'pt-PT'; if (Object.assign({ fim: 1 }, u.sp.av).fim) out.push({ uk, m: { t: T(lang, 'win') + ': ' + w.who, b: (LGN[w.lg] || '') + ' · ' + w.gp, u: '#esportes.' + w.lg, g: 'win-' + w.lg }, ttl: 3600 }); }); }); } };
const GPN = { THAILAND: 'da Tailândia', BRAZIL: 'do Brasil', 'UNITED STATES': 'dos Estados Unidos', AMERICAS: 'das Américas', SPAIN: 'de Espanha', FRANCE: 'de França', CATALUNYA: 'da Catalunha', ITALY: 'de Itália', HUNGARY: 'da Hungria', CZECHIA: 'da Chéquia', NETHERLANDS: 'dos Países Baixos', GERMANY: 'da Alemanha', 'GREAT BRITAIN': 'da Grã-Bretanha', ARAGON: 'de Aragão', 'SAN MARINO AND THE RIMINI RIVIERA': 'de San Marino', AUSTRIA: 'da Áustria', JAPAN: 'do Japão', INDONESIA: 'da Indonésia', AUSTRALIA: 'da Austrália', MALAYSIA: 'da Malásia', QATAR: 'do Catar', PORTUGAL: 'de Portugal', VALENCIA: 'de Valência' };
const gpName = n => { const m = String(n || '').match(/GRAND PRIX OF (?:THE )?(.+)$/i), p = (m ? m[1] : String(n || '')).trim(); return m ? 'Grande Prémio ' + (GPN[p.toUpperCase()] || 'de ' + p.toLowerCase().replace(/(^|\s)\S/g, z => z.toUpperCase())) : p; };

/* ---------- alertas de preço (a cada 5 minutos) ---------- */
const YQ = () => process.env.YAHOO_CHART || 'https://query1.finance.yahoo.com/v8/finance/chart/';
const nf = v => (Math.round(v * 100) / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const prices = async (U, st, now, out) => { const L = U.filter(([, x]) => x.cat.inv && (x.inv || []).some(a => a.on)); if (!L.length) return;
  const syms = [...new Set(L.flatMap(([, x]) => x.inv.filter(a => a.on).map(a => a.s)))].slice(0, 80), Q = {};
  await pool(syms, 6, async s => { const r = await fetch(YQ() + encodeURIComponent(s) + '?range=1d&interval=5m', { headers: { 'user-agent': 'Mozilla/5.0 (PRUMO)' }, signal: AbortSignal.timeout(7000) }); if (!r.ok) return;
    const j = await r.json(), m = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta; if (m && m.regularMarketPrice != null) Q[s] = { p: m.regularMarketPrice, pc: m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose, cur: m.currency || '' }; });
  const day = new Date(now).toISOString().slice(0, 10);
  L.forEach(([uk, x]) => x.inv.filter(a => a.on).forEach(a => { const q = Q[a.s]; if (!q) return; const ch = q.pc ? (q.p / q.pc - 1) * 100 : 0; let hit = '';
    if (a.k === 'acima' && q.p >= a.v) hit = `${a.s} subiu para ${nf(q.p)} ${q.cur} (alvo ${nf(a.v)})`;
    if (a.k === 'abaixo' && q.p <= a.v) hit = `${a.s} desceu para ${nf(q.p)} ${q.cur} (alvo ${nf(a.v)})`;
    if (a.k === 'queda' && ch <= -Math.abs(a.v)) hit = `${a.s} cai ${nf(ch)}% hoje`;
    if (a.k === 'subida' && ch >= Math.abs(a.v)) hit = `${a.s} sobe ${nf(ch)}% hoje`;
    if (!hit) return; const k = 'inv:' + uk + ':' + a.id + (a.r === 'diario' ? ':' + day : ''); if (st.sent[k]) return; st.sent[k] = now;
    out.push({ uk, m: { t: 'Alerta de preço', b: hit + (a.n ? ' — ' + a.n : ''), u: '#investimentos', g: 'inv-' + a.id }, ttl: 3600 }); })); };

/* ---------- v3.77 · Pursuit: avisos todos os dias, pelo servidor (antes só para quem tinha aberto o jogo nesse dia) ---------- */
// às 20h (Lisboa) quando saem as pistas; 15 minutos antes de fechar a quem ainda não marcou; e os resultados, com o acerto de cada um, a quem jogou
const lisb = t => { const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)).forEach(x => { p[x.type] = x.value; });
  return { d: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute }; };
const HU_A = () => +(process.env.NAUTILO_HUNTER_ABRE || 1200), HU_F = () => +(process.env.NAUTILO_HUNTER_FECHA || 1320), hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const lerSo = async p => { try { const g = await N.store().get(p); return g ? N.open(await N.accKey(), g.buf) : null; } catch (e) { return null; } };
const jogadas = async d => { const M = new Map(); try { for (const b of await N.store().list('so/hg/' + d + '/')) { const g = await lerSo(b.pathname); if (!g || !g.id) continue; const i = g.id.lastIndexOf('-'); if (i > 0) M.set(g.id.slice(0, i) + '|' + g.id.slice(i + 1), g); } } catch (e) { } return M; };
const pursuit = async (U, st, now, out) => { const fans = U.filter(([, x]) => x.cat.jogo && x.an && x.an.hu); if (!fans.length) return;
  const L = lisb(now), A = HU_A(), F = HU_F(); st.hu = st.hu || {};
  const msg = (uk, t, b, g) => out.push({ uk, m: { t, b, u: '#animes.pursuit', g }, ttl: 3600 });
  if (L.min >= A && L.min < A + 20 && st.hu.ab !== L.d) { st.hu.ab = L.d; fans.forEach(([uk]) => msg(uk, 'Pursuit: saíram as pistas de hoje', `Descobre o anime e marca-o até às ${hhmm(F)} de Lisboa. Quem acerta primeiro ganha mais pontos.`, 'hunter')); }
  const ult = L.min >= F - 15 && L.min < F && st.hu.ul !== L.d, res = L.min >= F + 1 && L.min < F + 40 && st.hu.rs !== L.d; if (!ult && !res) return;
  const J = await jogadas(L.d);
  if (ult) { st.hu.ul = L.d; fans.filter(([uk]) => !J.has(uk)).forEach(([uk]) => msg(uk, 'Pursuit: faltam 15 minutos', 'Ainda vais a tempo de marcar o anime de hoje.', 'hunter')); }
  if (res) { st.hu.rs = L.d; const v = await lerSo('so/h/' + L.d), certos = v ? [...J.values()].filter(g => g.mal === v.mal).sort((a, b) => a.at - b.at).map(g => g.id) : [];
    fans.filter(([uk]) => J.has(uk)).forEach(([uk]) => { const g = J.get(uk), i = certos.indexOf(g.id);
      msg(uk, 'Pursuit: saíram os resultados', !v ? 'Vê se acertaste e quantos pontos ganhaste.' : i >= 0 ? `Acertaste: era ${v.titulo}. Ganhaste ${Math.max(10, 100 - 10 * i)} pontos.` : `Não foi desta: era ${v.titulo}. Amanhã há mais, às ${hhmm(A)}.`, 'hunterres'); }); } };

/* ---------- v3.77 · episódios novos dos animes com o sino (horários do AniList) ---------- */
// A cada 20 minutos o servidor pergunta ao AniList quando sai o próximo episódio de cada anime com o sino (50 de cada vez).
// No minuto em que sai, avisa quem o segue; se o horário mudar (adiamento), o aviso muda com ele. Se o próximo já passou entre
// duas consultas, avisa na mesma (até 6 horas depois). Nada da pessoa vai para o AniList: só os números dos animes.
const ALQ = () => process.env.NAUTILO_ANILIST || 'https://graphql.anilist.co';
const kAn = e => e.al ? 'a' + e.al : 'm' + e.mal;
const episodios = async (U, st, now, out, force) => { const fans = U.filter(([, x]) => x.cat.ep && x.an && (x.an.eps || []).length); st.ae = st.ae || {}; if (!fans.length) return;
  const all = new Map(); fans.forEach(([, x]) => x.an.eps.forEach(e => { const k = kAn(e); if (!all.has(k)) all.set(k, e); }));
  const avisa = (k, e) => { const sk = 'ep:' + k + ':' + e; if (st.sent[sk]) return; st.sent[sk] = now;
    fans.forEach(([uk, x]) => { const f = x.an.eps.find(z => kAn(z) === k); if (f) out.push({ uk, m: { t: 'Episódio novo: ' + f.t, b: `Já saiu o episódio ${e}.`, u: '#animes', g: 'ep-' + k }, ttl: 6 * 3600 }); }); };
  if (force || now - (st.aeAt || 0) >= 20 * 6e4) { st.aeAt = now; const ks = [...all.keys()].slice(0, 300), vistos = new Set();
    const pede = async (campo, ids) => { for (let i = 0; i < ids.length; i += 50) { try {
        const r = await fetch(ALQ(), { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, signal: AbortSignal.timeout(8000),
          body: JSON.stringify({ query: `query($i:[Int]){Page(perPage:50){media(${campo}:$i,type:ANIME){id idMal status nextAiringEpisode{episode airingAt}}}}`, variables: { i: ids.slice(i, i + 50) } }) });
        if (!r.ok) continue; const j = await r.json();
        ((((j || {}).data || {}).Page || {}).media || []).forEach(m => ['a' + m.id, m.idMal ? 'm' + m.idMal : ''].forEach(k => { if (!k || !all.has(k) || vistos.has(k)) return; vistos.add(k);
          const p = st.ae[k], n = m.nextAiringEpisode, at = n ? n.airingAt * 1000 : 0;
          if (p && p.e && p.at <= now + 6e4 && now - p.at < 6 * 36e5 && (!n || n.episode > p.e)) avisa(k, p.e);   // saiu entre duas consultas
          if (n && n.episode > 0 && at) st.ae[k] = { e: n.episode, at, chk: now }; else if (p) { p.chk = now; if (m.status !== 'RELEASING') p.fim = 1; } })); } catch (e) { } } };
    await pede('id_in', ks.filter(k => k[0] === 'a').map(k => +k.slice(1))); await pede('idMal_in', ks.filter(k => k[0] === 'm' && !vistos.has(k)).map(k => +k.slice(1))); }
  // a cada minuto, sem ir à rede: o que está na hora (com um horário confirmado há menos de 6 horas)
  Object.entries(st.ae).forEach(([k, p]) => { if (!all.has(k)) { if (now - (p.chk || 0) > 3 * 864e5) delete st.ae[k]; return; }
    if (p.e && p.at <= now && now - p.at < 6 * 36e5 && now - (p.chk || 0) < 6 * 36e5) avisa(k, p.e); }); };

/* ---------- a tarefa de cada minuto ---------- */
let LAST = 0;
const cron = async o => { o = o || {}; const now = o.now || Date.now(); if (!o.force && now - LAST < 40000) return { ok: true, skip: 1 }; LAST = now;
  const I = await load(IDX), U = Object.entries(I.v.u || {}).filter(([, x]) => (x.subs || []).length).map(([k, x]) => [k, Object.assign({}, x, { cat: Object.assign({}, CAT0, x.cat || {}) })]);
  if (!U.length) return { ok: true, n: 0 };
  const S = await load(STP), st = S.v; st.sent = st.sent || {}; st.ev = st.ev || {}; const before = JSON.stringify(st), out = [];
  // lembretes (rotina, bloco de foco): os que estão na hora e ainda não foram (até 10 min de atraso)
  // v3.77: o Pursuit ('jogo') passou a ser avisado pelo servidor (pursuit), por isso os itens que o app ainda manda ficam de fora
  U.forEach(([uk, x]) => ['rot', 'foco', 'vivo'].forEach(part => { if (!x.cat[part === 'vivo' ? 'foco' : part]) return; (x[part] || []).forEach(it => { if (it.at > now + 30e3 || it.at < now - 10 * 6e4) return;
    const k = uk + '|' + part + '|' + (it.g || '') + '|' + it.at; if (st.sent[k]) return; st.sent[k] = now; out.push({ uk, m: { t: it.t, b: it.b, u: it.u, g: it.g || part }, ttl: 1800 }); }); }));
  try { await sports(U, st, now, out); } catch (e) { console.error('push desportos', e.message); }
  try { await pursuit(U, st, now, out); } catch (e) { console.error('push pursuit', e.message); }
  try { await episodios(U, st, now, out, o.force && o.eps); } catch (e) { console.error('push episódios', e.message); }
  if (o.force || new Date(now).getUTCMinutes() % 5 === 0) { try { await prices(U, st, now, out); } catch (e) { console.error('push preços', e.message); } }
  // limpeza: o que tem mais de 3 dias
  const lim = now - 3 * 864e5; Object.keys(st.sent).forEach(k => { if (st.sent[k] < lim) delete st.sent[k]; }); Object.keys(st.ev).forEach(k => { if ((st.ev[k].at || 0) < lim) delete st.ev[k]; });
  if (JSON.stringify(st) !== before) { try { await save(STP, st, S.etag); } catch (e) { if (e.code !== 'conflict') throw e;
    await mutate(STP, v => { v.sent = Object.assign(v.sent || {}, st.sent); v.ev = Object.assign(v.ev || {}, st.ev); v.hu = Object.assign(v.hu || {}, st.hu || {}); v.ae = Object.assign(v.ae || {}, st.ae || {}); v.aeAt = Math.max(v.aeAt || 0, st.aeAt || 0); }); } }
  const r = await deliver(I.v, out, o); return { ok: true, msgs: out.length, sent: r.n, gone: r.gone, users: U.length }; };

/* ---------- pedidos do app ---------- */
const api = N.handler(async (req, res) => {
  const b = await N.body(req), op = String(b.op || '');
  if (op === 'chave') return N.send(res, 200, { ok: true, k: (await vapid()).pub });
  if (N.limit(req, 'push', 240, 600e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  const uk = await who(req, String(b.p || ''));
  if (op === 'ligar') { const s = b.sub || {}, sub = { e: String(s.endpoint || ''), k: String((s.keys || {}).p256dh || ''), a: String((s.keys || {}).auth || ''), ua: str(b.ua, 40), at: Date.now() };
    if (!W.okSub(sub)) return N.send(res, 400, { ok: false, msg: 'Este navegador deu um endereço de notificações que não conheço.' });
    const lang = /^[a-z]{2}(-[A-Z]{2})?$/.test(b.lang || '') ? b.lang : 'pt-PT', tz = str(b.tz, 40);
    await mutate(IDX, v => { v.u = v.u || {};
      // um aparelho recebe os avisos do perfil que o ligou por último
      Object.entries(v.u).forEach(([k, u]) => { if (k !== uk) u.subs = (u.subs || []).filter(x => x.e !== sub.e); });
      const u = v.u[uk] = v.u[uk] || {}; u.subs = (u.subs || []).filter(x => x.e !== sub.e).concat(sub).slice(-8); u.lang = lang; u.tz = tz; u.at = Date.now(); });
    return N.send(res, 200, { ok: true }); }
  if (op === 'desligar') { const e = String(b.endpoint || ''); await mutate(IDX, v => { const u = (v.u || {})[uk]; if (!u) return false; u.subs = (u.subs || []).filter(x => x.e !== e); });
    return N.send(res, 200, { ok: true }); }
  if (op === 'dados') { const d = b.d && typeof b.d === 'object' ? b.d : {}, upd = {};
    Object.keys(d).forEach(k => { if (PARTS[k] && JSON.stringify(d[k] || '').length < 120e3) upd[k] = PARTS[k](d[k]); });
    if (b.lang && /^[a-z]{2}(-[A-Z]{2})?$/.test(b.lang)) upd.lang = b.lang;
    if (!Object.keys(upd).length) return N.send(res, 400, { ok: false, msg: 'Nada para guardar.' });
    await mutate(IDX, v => { v.u = v.u || {}; const u = v.u[uk] = v.u[uk] || {}; Object.assign(u, upd); u.at = Date.now(); });
    return N.send(res, 200, { ok: true, partes: Object.keys(upd) }); }
  if (op === 'estado') { const { v } = await load(IDX), u = (v.u || {})[uk] || {}, e = String(b.endpoint || '');
    return N.send(res, 200, { ok: true, n: (u.subs || []).length, eu: !!e && (u.subs || []).some(x => x.e === e), cat: Object.assign({}, CAT0, u.cat || {}) }); }
  if (op === 'testar') { const { v } = await load(IDX), u = (v.u || {})[uk]; if (!u || !(u.subs || []).length) return N.send(res, 404, { ok: false, msg: 'Este perfil ainda não tem nenhum aparelho com as notificações ligadas.' });
    const lang = u.lang || 'pt-PT', r = await deliver(v, [{ uk, m: { t: T(lang, 'test'), b: T(lang, 'testb'), u: '#definicoes', g: 'teste' }, ttl: 600 }]);
    return N.send(res, 200, { ok: true, enviados: r.n, aparelhos: (u.subs || []).length }); }
  return N.send(res, 400, { ok: false, msg: 'Operação desconhecida.' });
});

module.exports = async (req, res) => {
  const q = req.query || {};
  const ua = String(req.headers['user-agent'] || '');
  if (req.method === 'GET' && (q.op === 'cron' || /vercel-cron/i.test(ua))) {
    const sec = process.env.CRON_SECRET, auth = String(req.headers.authorization || '');
    if (sec ? auth !== 'Bearer ' + sec : !/vercel-cron/i.test(ua)) { console.warn('push cron recusado', sec ? (auth ? 'chave errada' : 'sem chave') : 'sem vercel-cron', ua.slice(0, 40)); return N.send(res, 403, { ok: false }); }
    if (!N.store()) return N.send(res, 503, { ok: false });
    try { return N.send(res, 200, await cron()); } catch (e) { console.error('push cron', e.message); return N.send(res, 500, { ok: false }); } }
  return api(req, res); };
module.exports.cron = cron; module.exports._t = { TX, changes, PARTS };
