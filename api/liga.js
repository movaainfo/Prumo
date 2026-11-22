// PRUMO · Strava e Oura (função do Vercel, v3.71). O Garmin chega pelo Strava (Garmin Connect › Apps de terceiros › Strava).
// A pessoa toca em "Ligar", autoriza no site do Strava ou da Oura e a autorização (refresh token) fica guardada cifrada no perfil dela
// (lg/<conta>/<perfil>/<serviço>), por isso funciona em todos os aparelhos. Só leitura. As atividades e o sono passam por aqui a caminho
// da app e não ficam guardados no servidor. Pelas regras do Strava e da Oura, estes dados nunca vão para a IA do Prumo.
//   estado → que serviços estão ativos no servidor e quais este perfil ligou · inicio → endereço para autorizar (state assinado, 15 min)
//   GET ?code=&state= → o serviço volta aqui: troca o code, guarda e mostra "pronto" · dados → atividades / sono desde uma data · sair → desliga
// Adormecida até haver STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET e/ou OURA_CLIENT_ID + OURA_CLIENT_SECRET nas variáveis do projeto.
'use strict';
const N = require('./_nuvem');
const MOCK = () => String(process.env.LIGA_BASE || '').replace(/\/+$/, '');
const P = {
  strava: { nome: 'Strava', id: () => process.env.STRAVA_CLIENT_ID, sec: () => process.env.STRAVA_CLIENT_SECRET, scope: 'read,activity:read_all',
    auth: () => MOCK() ? MOCK() + '/strava/authorize' : 'https://www.strava.com/oauth/authorize', token: () => MOCK() ? MOCK() + '/strava/token' : 'https://www.strava.com/oauth/token',
    api: () => MOCK() ? MOCK() + '/strava/api' : 'https://www.strava.com/api/v3', sair: () => MOCK() ? MOCK() + '/strava/deauthorize' : 'https://www.strava.com/oauth/deauthorize', extra: { approval_prompt: 'auto' } },
  oura: { nome: 'Oura', id: () => process.env.OURA_CLIENT_ID, sec: () => process.env.OURA_CLIENT_SECRET, scope: 'daily heartrate workout session personal',
    auth: () => MOCK() ? MOCK() + '/oura/authorize' : 'https://cloud.ouraring.com/oauth/authorize', token: () => MOCK() ? MOCK() + '/oura/token' : 'https://api.ouraring.com/oauth/token',
    api: () => MOCK() ? MOCK() + '/oura/api' : 'https://api.ouraring.com/v2/usercollection', sair: () => MOCK() ? MOCK() + '/oura/revoke' : 'https://api.ouraring.com/oauth/revoke', extra: {} } };
const pronto = k => !!(P[k] && String(P[k].id() || '').trim() && String(P[k].sec() || '').trim());
const REDIR = () => process.env.LIGA_REDIRECT || 'https://prumo-vida.vercel.app/api/liga';
const APP = () => process.env.LIGA_APP || REDIR().replace(/api\/liga$/, '');
const PID = /^[a-f0-9]{12}$/, STATE_MIN = 15, TK = new Map(), OKS = new Map();
const caminho = (u, p, k) => 'lg/' + u + '/' + p + '/' + k;
const form = o => new URLSearchParams(o).toString();
const checkProfile = async (t, pid) => { const k = t.u + '|' + t.v + '|' + pid, c = OKS.get(k); if (c && Date.now() - c.at < 30e3) { await N.gate(c.em); return true; }
  const g = await N.store().get('a/' + t.a); let r = null; try { r = g && N.open(await N.accKey(), g.buf); } catch (e) { }
  if (!r || r.uid !== t.u || (r.tv || 1) !== t.v) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  if (!(r.perfis || []).some(x => x.id === pid)) throw N.err('perfil', 'Este perfil já não existe.', 404);
  OKS.set(k, { at: Date.now(), em: r.email }); if (OKS.size > 3000) OKS.delete(OKS.keys().next().value); await N.gate(r.email); return true; };
const tag = async body => N.crypto.createHmac('sha256', await N.master()).update('liga:' + body).digest().subarray(0, 18);
const makeState = async (t, pid, k) => { const body = N.b64u(JSON.stringify({ u: t.u, a: t.a, v: t.v, p: pid, k, x: Math.floor(Date.now() / 1000) + STATE_MIN * 60, n: N.b64u(N.crypto.randomBytes(6)) })); return body + '.' + N.b64u(await tag(body)); };
const readState = async s => { const m = String(s || '').match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/); if (!m) return null; const want = await tag(m[1]), got = N.unb64u(m[2]);
  if (got.length !== want.length || !N.crypto.timingSafeEqual(got, want)) return null; let o; try { o = JSON.parse(N.unb64u(m[1]).toString()); } catch (e) { return null; }
  return o && PID.test(o.p || '') && P[o.k] && o.x > Date.now() / 1000 ? o : null; };
const ler = async (u, p, k) => { const g = await N.store().get(caminho(u, p, k)); if (!g) return null; try { return N.open(await N.userKey(u), g.buf); } catch (e) { return null; } };
const gravar = async (u, p, k, o) => N.store().put(caminho(u, p, k), N.seal(await N.userKey(u), o));
const apagar = async (u, p, k) => { TK.delete(u + '|' + p + '|' + k); const s = N.store(), c = caminho(u, p, k); if (await s.head(c)) await s.del([c]); };
// troca o code ou renova: a Oura só aceita cada refresh token uma vez, por isso o novo é guardado logo
const trocar = async (k, corpo) => { const r = await fetch(P[k].token(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: form(Object.assign({ client_id: P[k].id(), client_secret: P[k].sec() }, corpo)), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw N.err('liga', P[k].nome + ' não aceitou o pedido (' + String(j.error || j.message || r.status).slice(0, 40) + ').', r.status === 400 || r.status === 401 ? 401 : 502); return j; };
// uma renovação de cada vez por perfil e serviço (os pedidos que chegam ao mesmo tempo esperam por ela)
const REF = new Map();
const acesso = async (u, p, k) => { const id = u + '|' + p + '|' + k, c = TK.get(id); if (c && c.x > Date.now() + 60e3) return c.tk; if (REF.has(id)) return REF.get(id);
  const pr = renovar(u, p, k, id).finally(() => REF.delete(id)); REF.set(id, pr); return pr; };
const renovar = async (u, p, k, id) => {
  const L = await ler(u, p, k); if (!L || !L.rt) throw N.err('desligado', P[k].nome + ' não está ligado neste perfil.', 404);
  if (L.tk && L.x > Date.now() + 60e3) { TK.set(id, { tk: L.tk, x: L.x }); return L.tk; }
  let j; try { j = await trocar(k, { grant_type: 'refresh_token', refresh_token: L.rt }); } catch (e) { if (e.status === 401) {
      // outra instância do servidor pode ter renovado entretanto: se o guardado mudou, usa-o; se não, a autorização acabou mesmo
      const L2 = await ler(u, p, k); if (L2 && L2.rt !== L.rt && L2.tk) { TK.set(id, { tk: L2.tk, x: L2.x }); return L2.tk; }
      await apagar(u, p, k); throw N.err('desligado', P[k].nome + ' deixou de autorizar o Prumo. Liga outra vez.', 404); } throw e; }
  const x = j.expires_at ? j.expires_at * 1000 : Date.now() + (+j.expires_in || 3600) * 1000; await gravar(u, p, k, Object.assign({}, L, { rt: j.refresh_token || L.rt, tk: j.access_token, x }));
  TK.set(id, { tk: j.access_token, x }); return j.access_token; };
const pede = async (u, p, k, caminhoApi) => { const tk = await acesso(u, p, k); const r = await fetch(P[k].api() + caminhoApi, { headers: { authorization: 'Bearer ' + tk, accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (r.status === 401) { TK.delete(u + '|' + p + '|' + k); throw N.err('liga', P[k].nome + ' pediu para autorizar outra vez. Toca em Ligar.', 401); }
  if (r.status === 429) throw N.err('limite', P[k].nome + ' pediu para esperar um pouco. Tenta daqui a 15 minutos.', 429);
  if (!r.ok) throw N.err('liga', P[k].nome + ' não respondeu agora (' + r.status + ').', 502); return r.json(); };
const dia = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
const cut = (x, n) => String(x == null ? '' : x).slice(0, n), num = x => Number.isFinite(+x) ? +x : null;
const dados = async (u, p, k, desde) => { const d0 = dia(desde);
  if (k === 'strava') { const after = Math.floor(Date.parse(d0 + 'T00:00:00Z') / 1000), out = [];
    for (let pg = 1; pg <= 4; pg++) { const L = await pede(u, p, k, `/athlete/activities?after=${after}&per_page=100&page=${pg}`); if (!Array.isArray(L) || !L.length) break;
      L.forEach(a => out.push({ id: cut(a.id, 30), tipo: cut(a.sport_type || a.type, 30), nome: cut(a.name, 120), ini: cut(a.start_date_local, 19), km: num(a.distance) != null ? Math.round(a.distance) / 1000 : null, seg: num(a.moving_time), total: num(a.elapsed_time), fc: num(a.average_heartrate), fcmax: num(a.max_heartrate), sub: num(a.total_elevation_gain), kj: num(a.kilojoules) }));
      if (L.length < 100) break; }
    return { atividades: out }; }
  const fim = new Date(Date.now() + 864e5).toISOString().slice(0, 10), q = `?start_date=${d0}&end_date=${fim}`, todas = async c => { const out = []; let nx = '';
    for (let i = 0; i < 5; i++) { const j = await pede(u, p, k, '/' + c + q + (nx ? '&next_token=' + encodeURIComponent(nx) : '')); (j.data || []).forEach(x => out.push(x)); nx = j.next_token; if (!nx) break; } return out; };
  const [sono, sonoD, pront, ativ, treinos] = await Promise.all([todas('sleep'), todas('daily_sleep'), todas('daily_readiness'), todas('daily_activity'), todas('workout')]);
  return { sono: sono.filter(s => !s.type || s.type === 'long_sleep').map(s => ({ id: cut(s.id, 60), dia: cut(s.day, 10), deita: cut(s.bedtime_start, 30), acorda: cut(s.bedtime_end, 30), total: num(s.total_sleep_duration), profundo: num(s.deep_sleep_duration), rem: num(s.rem_sleep_duration), leve: num(s.light_sleep_duration), acordado: num(s.awake_time), cama: num(s.time_in_bed), fc: num(s.average_heart_rate), vfc: num(s.average_hrv) })),
    dias: (() => { const D = {}; const g = d => D[d] = D[d] || { dia: d }; sonoD.forEach(x => { g(x.day).sono = num(x.score); }); pront.forEach(x => { g(x.day).prontidao = num(x.score); }); ativ.forEach(x => { const o = g(x.day); o.atividade = num(x.score); o.passos = num(x.steps); o.kcal = num(x.active_calories); }); return Object.values(D).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.dia)); })(),
    treinos: treinos.map(w => ({ id: cut(w.id, 60), tipo: cut(w.activity, 40), ini: cut(w.start_datetime, 30), fim: cut(w.end_datetime, 30), km: num(w.distance) != null ? Math.round(w.distance) / 1000 : null, kcal: num(w.calories), int: cut(w.intensity, 12), dia: cut(w.day, 10) })) }; };
/* ---------- o regresso do Strava / Oura (GET no navegador da pessoa) ---------- */
const page = (res, ok, title, text) => { res.statusCode = ok ? 200 : 400; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  res.end(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} · Prumo</title><style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#65010D;color:#FCE7D1;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}main{max-width:430px}h1{font:700 30px/1.15 system-ui,sans-serif;margin:14px 0 10px}p{margin:0 0 18px}a{display:inline-block;background:#FCE7D1;color:#65010D;padding:12px 18px;border-radius:999px;font-weight:700;text-decoration:none}a:focus-visible{outline:2px solid #FCE7D1;outline-offset:3px}</style></head>
<body><main id="lg-${ok ? 'ok' : 'erro'}"><img src="${e(APP())}selo-96.png" width="48" height="48" alt=""><h1>${e(title)}</h1><p>${e(text)}</p><p>Já podes fechar esta janela e voltar ao Prumo.</p><a href="${e(APP())}?app=1#definicoes.ligacoes">Abrir o Prumo</a></main></body></html>`); };
const callback = async (req, res, q) => { const st = await readState(q.state);
  if (!st) return page(res, false, 'O pedido expirou', 'Passaram mais de ' + STATE_MIN + ' minutos ou o endereço não é válido. Volta ao Prumo e toca outra vez em Ligar.');
  const nome = P[st.k].nome;
  if (q.error) return page(res, false, 'Não ficou ligado', q.error === 'access_denied' ? 'Cancelaste a autorização no ' + nome + '. Nada foi ligado.' : nome + ' não autorizou (' + String(q.error).slice(0, 40) + ').');
  if (!pronto(st.k)) return page(res, false, 'Ainda não está pronto', 'A ligação ao ' + nome + ' ainda não está ativa no servidor do Prumo.');
  try { await checkProfile({ u: st.u, a: st.a, v: st.v }, st.p); } catch (e) { return page(res, false, 'Não ficou ligado', 'A sessão do Prumo terminou entretanto. Entra outra vez e liga de novo.'); }
  if (st.k === 'strava' && !/activity:read/.test(String(q.scope || 'activity:read'))) return page(res, false, 'Falta uma autorização', 'Para o Prumo ver as tuas atividades, deixa marcada a opção de ver os dados das atividades no Strava. Liga outra vez.');
  let j; try { j = await trocar(st.k, { code: String(q.code || ''), grant_type: 'authorization_code', redirect_uri: REDIR() }); } catch (e) { return page(res, false, 'Não ficou ligado', e.message + ' Tenta outra vez daqui a uns minutos.'); }
  if (!j.refresh_token) return page(res, false, 'Não ficou ligado', nome + ' não deu a autorização permanente. Liga outra vez.');
  const quem = st.k === 'strava' && j.athlete ? cut([j.athlete.firstname, j.athlete.lastname].filter(Boolean).join(' '), 80) : '';
  const x = j.expires_at ? j.expires_at * 1000 : Date.now() + (+j.expires_in || 3600) * 1000;
  await gravar(st.u, st.p, st.k, { rt: j.refresh_token, tk: j.access_token, x, quem, at: new Date().toISOString() }); TK.set(st.u + '|' + st.p + '|' + st.k, { tk: j.access_token, x }); N.count('liga:' + st.k);
  return page(res, true, nome + ' ligado', (quem ? quem + ': ' : '') + (st.k === 'strava' ? 'as tuas atividades (e as do Garmin, se o ligaste ao Strava) já podem entrar no Prumo.' : 'o teu sono, prontidão, atividade e treinos já podem entrar no Prumo.')); };
module.exports = N.handler(async (req, res) => { const q = req.query || {};
  if (req.method === 'GET' && q.state && (q.code || q.error)) return callback(req, res, q);
  if (!N.allowed(req)) return N.send(res, 403, { ok: false, msg: 'Pedido recusado.' });
  if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  const t = await N.readToken(req); if (!t) return N.send(res, 401, { ok: false, msg: 'A sessão terminou. Entra outra vez.', code: 'sessao' });
  const b = await N.body(req), op = String(b.op || ''), pid = String(b.p || ''), k = String(b.k || '');
  if (!PID.test(pid)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  if (N.limit(req, 'liga|' + t.u, 60, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  await checkProfile(t, pid);
  if (op === 'estado') { const o = {}; for (const x of Object.keys(P)) { const L = pronto(x) ? await ler(t.u, pid, x) : null; o[x] = { pronto: pronto(x), ligado: !!(L && L.rt), quem: (L && L.quem) || '', desde: (L && L.at) || '' }; } return N.send(res, 200, { ok: true, servicos: o }); }
  if (!P[k]) return N.send(res, 400, { ok: false, msg: 'Serviço desconhecido.' });
  if (!pronto(k)) return N.send(res, 503, { ok: false, code: 'config', msg: 'A ligação ao ' + P[k].nome + ' ainda não está ativa no servidor do Prumo.' });
  if (op === 'inicio') { const url = P[k].auth() + '?' + form(Object.assign({ client_id: P[k].id(), redirect_uri: REDIR(), response_type: 'code', scope: P[k].scope, state: await makeState(t, pid, k) }, P[k].extra)); return N.send(res, 200, { ok: true, url, validade: STATE_MIN * 60 }); }
  if (op === 'dados') return N.send(res, 200, Object.assign({ ok: true }, await dados(t.u, pid, k, b.desde)));
  if (op === 'sair') { const L = await ler(t.u, pid, k); if (L) { try { const tk = await acesso(t.u, pid, k).catch(() => L.tk); if (tk) await fetch(P[k].sair() + (k === 'oura' ? '?access_token=' + encodeURIComponent(tk) : ''), k === 'strava' ? { method: 'POST', headers: { authorization: 'Bearer ' + tk } } : {}).catch(() => { }); } catch (e) { } }
    await apagar(t.u, pid, k); return N.send(res, 200, { ok: true }); }
  return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' }); }, { anyOrigin: true }); // o regresso do Strava/Oura vem de fora; o resto confirma a origem lá dentro
module.exports.pronto = pronto;
