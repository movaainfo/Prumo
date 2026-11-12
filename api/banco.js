// PRUMO · ligação ao banco (Open Finance no Brasil, PSD2 na Europa), só leitura: contas, saldos e movimentos. Nunca faz pagamentos.
// Na conta do dono do Prumo (e-mail em NAUTILO_ADMIN) funciona com os planos gratuitos de uso pessoal, que só leem as contas do próprio.
// Para todas as contas (cada pessoa liga os próprios bancos dentro do app) é preciso o plano de produção de cada fornecedor, com contrato;
// quando houver, liga-se no Vercel com PLUGGY_TODOS=1 e/ou ENABLEBANKING_TODOS=1.
//   Brasil · Pluggy: o widget Pluggy Connect (connect token por pessoa, com um clientUserId opaco) ou, no dono, o "Meu Pluggy" pelo ID
//            do item: PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET
//   Europa · Enable Banking em modo restrito (autorizas no teu banco e voltas aqui): ENABLEBANKING_APP_ID e ENABLEBANKING_KEY
//            (a chave privada em PEM); o endereço de regresso registado no Enable Banking é este (…/api/banco)
// As chaves vivem só nas variáveis do projeto no Vercel. As ligações (ids dos itens e das sessões) ficam cifradas no perfil (b/<conta>/<perfil>).
//   estado · pg.token · pg.add {item} · pg.del {item} · eb.bancos {c} · eb.inicio {bank, c} · GET ?code=&state= (regresso do banco) · eb.del {sid} · sync {from}
'use strict';
const N = require('./_nuvem');
const PGA = () => process.env.PLUGGY_API || 'https://api.pluggy.ai', EBA = () => process.env.ENABLEBANKING_API || 'https://api.enablebanking.com';
const PG_ID = () => String(process.env.PLUGGY_CLIENT_ID || '').trim(), PG_SEC = () => String(process.env.PLUGGY_CLIENT_SECRET || '').trim();
const EB_ID = () => String(process.env.ENABLEBANKING_APP_ID || '').trim(), EB_KEY = () => String(process.env.ENABLEBANKING_KEY || '').replace(/\\n/g, '\n').trim();
const REDIR = () => process.env.BANCO_REDIRECT || 'https://prumo-vida.vercel.app/api/banco', APP = () => REDIR().replace(/api\/banco$/, '');
const TODOS = k => /^(1|sim|true)$/i.test(String(process.env[k] || '').trim());
const isAdmin = e => String(process.env.NAUTILO_ADMIN || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).includes(String(e || '').toLowerCase());
const PID = /^[a-f0-9]{12}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, DAY = /^\d{4}-\d\d-\d\d$/, STATE_MIN = 20;
const linkPath = (uid, pid) => 'b/' + uid + '/' + pid;
// quem é a pessoa para a Pluggy: um código sem dados pessoais (nem e-mail nem nome), o mesmo para o mesmo perfil
const cuid = async (uid, pid) => 'prumo-' + N.crypto.createHmac('sha256', await N.master()).update('pluggy:' + uid + ':' + pid).digest('hex').slice(0, 24);
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ---------- quem pede: sessão válida, perfil desta conta e o dono do Prumo ---------- */
const accOf = async (t, pid) => { const g = await N.store().get('a/' + t.a); let r = null; try { r = g && N.open(await N.accKey(), g.buf); } catch (e) { }
  if (!r || r.uid !== t.u || (r.tv || 1) !== t.v) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  if (!(r.perfis || []).some(x => x.id === pid)) throw N.err('perfil', 'Este perfil já não existe.', 404); return r; };
const readLink = async (uid, pid) => { const g = await N.store().get(linkPath(uid, pid)); if (!g) return { pg: [], eb: [] }; try { return Object.assign({ pg: [], eb: [] }, N.open(await N.userKey(uid), g.buf)); } catch (e) { return { pg: [], eb: [] }; } };
const writeLink = async (uid, pid, L) => N.store().put(linkPath(uid, pid), N.seal(await N.userKey(uid), L));

/* ---------- state assinado (o regresso do banco diz a que perfil pertence) ---------- */
const stateTag = async body => N.crypto.createHmac('sha256', await N.master()).update('banco:' + body).digest().subarray(0, 18);
const makeState = async (t, pid, x) => { const body = b64u(JSON.stringify(Object.assign({ u: t.u, a: t.a, v: t.v, p: pid, x: Math.floor(Date.now() / 1000) + STATE_MIN * 60, n: b64u(N.crypto.randomBytes(6)) }, x))); return body + '.' + b64u(await stateTag(body)); };
const readState = async s => { const m = String(s || '').match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/); if (!m) return null;
  const want = await stateTag(m[1]), got = N.unb64u(m[2]); if (got.length !== want.length || !N.crypto.timingSafeEqual(got, want)) return null;
  let o; try { o = JSON.parse(N.unb64u(m[1]).toString()); } catch (e) { return null; } return o && PID.test(o.p || '') && o.x > Date.now() / 1000 ? o : null; };

/* ---------- Pluggy (Meu Pluggy) ---------- */
let PGK = { k: '', x: 0 };
const pgKey = async () => { if (PGK.k && PGK.x > Date.now()) return PGK.k;
  const r = await fetch(PGA() + '/auth', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ clientId: PG_ID(), clientSecret: PG_SEC() }) }); const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.apiKey) throw N.err('pluggy', 'A Pluggy não aceitou as chaves (confere PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no Vercel).', 502); PGK = { k: j.apiKey, x: Date.now() + 100 * 60e3 }; return j.apiKey; };
const pg = async p => { for (let i = 0; i < 3; i++) { const r = await fetch(PGA() + p, { headers: { 'X-API-KEY': await pgKey(), accept: 'application/json' } }), j = await r.json().catch(() => ({}));
    if (r.ok) return j; if (r.status === 401 || r.status === 403) { PGK = { k: '', x: 0 }; if (i === 0) continue; throw N.err('pluggy', 'A Pluggy recusou o acesso a este item (é teu e está ligado no Meu Pluggy?).', 403); }
    if (r.status === 404) throw N.err('pg404', 'Não encontrei esse item na Pluggy. Confere o ID.', 404); if (r.status === 410) throw N.err('pg410', 'A Pluggy já não aceita este pedido.', 502); if (r.status === 429 || r.status >= 500) { await N.sleep(700 * (i + 1)); continue; }
    throw N.err('pluggy', 'A Pluggy não respondeu (' + r.status + ').', 502); } throw N.err('pluggy', 'A Pluggy pediu para esperar um pouco.', 429); };
const pgSync = async (items, from) => { const acc = [], mov = [], err = [];
  for (const it of items) { try { const item = await pg('/items/' + it.item), bank = (item.connector && item.connector.name) || it.name || 'Pluggy';
      const A = (await pg('/accounts?itemId=' + it.item)).results || [];
      for (const a of A.slice(0, 12)) { const card = a.type === 'CREDIT';
        acc.push({ id: 'pg:' + a.id, prov: 'pg', src: it.item, bank, name: a.marketingName || a.name || (card ? 'Cartão' : 'Conta'), num: String(a.number || '').slice(-8), cur: a.currencyCode || 'BRL', bal: card ? -Math.abs(+a.balance || 0) : +a.balance || 0, kind: card ? 'card' : 'bank', at: item.lastUpdatedAt || '' });
        const add = t => { const v = Math.abs(+t.amount || 0); if (!v) return; const dir = t.type === 'CREDIT' ? 1 : t.type === 'DEBIT' ? -1 : (+t.amount >= 0 ? 1 : -1);
          mov.push({ ext: 'pg:' + t.id, acc: 'pg:' + a.id, date: String(t.date || '').slice(0, 10), amount: +(dir * v).toFixed(2), desc: String(t.description || t.descriptionRaw || (t.merchant && t.merchant.name) || '').slice(0, 140), cat: String(t.category || '').slice(0, 60), pend: t.status === 'PENDING' ? 1 : 0 }); };
        // GET /v2/transactions com cursor (o /transactions antigo sai depois de 31/12/2026); se a v2 não existir para este item, usa a antiga
        try { let after = ''; for (let k = 0; k < 40; k++) { const T = await pg('/v2/transactions?accountId=' + a.id + '&dateFrom=' + from + (after ? '&after=' + encodeURIComponent(after) : '')); (T.results || []).forEach(add);
            after = T.next ? (new URLSearchParams(String(T.next).replace(/^[^?]*\?/, '')).get('after') || '') : ''; if (!after) break; } }
        catch (e) { if (e.code !== 'pg404' && e.code !== 'pg410') throw e;
          for (let page = 1, tp = 1; page <= tp && page <= 12; page++) { const T = await pg('/transactions?accountId=' + a.id + '&from=' + from + '&pageSize=500&page=' + page); tp = +T.totalPages || 1; (T.results || []).forEach(add); } } } }
    catch (e) { err.push((it.name || it.item) + ': ' + e.message); } }
  return { acc, mov, err }; };

/* ---------- Enable Banking ---------- */
const ebJwt = () => { const now = Math.floor(Date.now() / 1000), h = b64u(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: EB_ID() })), b = b64u(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 }));
  let s; try { s = N.crypto.createSign('RSA-SHA256').update(h + '.' + b).sign(EB_KEY()); } catch (e) { throw N.err('eb', 'A chave ENABLEBANKING_KEY no Vercel não é uma chave privada válida (PEM).', 500); } return h + '.' + b + '.' + b64u(s); };
const eb = async (p, init = {}) => { for (let i = 0; i < 3; i++) { const r = await fetch(EBA() + p, Object.assign({}, init, { headers: Object.assign({ authorization: 'Bearer ' + ebJwt(), 'content-type': 'application/json', accept: 'application/json' }, init.headers || {}) })), j = await r.json().catch(() => ({}));
    if (r.ok) return j; const msg = String(j.message || j.detail || j.error || '').slice(0, 200);
    if (r.status === 401) throw N.err('eb', 'O Enable Banking não aceitou a chave (confere ENABLEBANKING_APP_ID e ENABLEBANKING_KEY no Vercel).', 502);
    if (r.status === 429 || r.status >= 500) { await N.sleep(800 * (i + 1)); continue; }
    if (/expired|EXPIRED|not.*valid|revoked/i.test(msg)) throw N.err('eb_exp', 'A autorização do banco expirou. Liga o banco outra vez.', 409);
    throw N.err('eb', 'O Enable Banking recusou o pedido' + (msg ? ': ' + msg : ' (' + r.status + ')') + '.', 400); } throw N.err('eb', 'O Enable Banking pediu para esperar um pouco.', 429); };
const ebSync = async (sessions, from) => { const acc = [], mov = [], err = [];
  for (const s of sessions) { for (const a of (s.accounts || []).slice(0, 10)) { try {
      let bal = null; try { const B = (await eb('/accounts/' + encodeURIComponent(a.uid) + '/balances')).balances || []; const b = B.find(x => /CLBD|ITAV|XPCD|ITBD/.test(x.balance_type || '')) || B[0]; if (b && b.balance_amount) bal = +b.balance_amount.amount; } catch (e) { if (e.code === 'eb_exp') throw e; }
      acc.push({ id: 'eb:' + a.uid, prov: 'eb', src: s.sid, bank: s.bank, name: a.name || a.product || (a.iban ? 'Conta ' + a.iban.slice(-4) : 'Conta'), num: a.iban ? a.iban.slice(-8) : '', cur: a.cur || 'EUR', bal, kind: /card|credit/i.test((a.type || '') + ' ' + (a.product || '')) ? 'card' : 'bank', until: s.until });
      let ck = '';
      for (let k = 0; k < 25; k++) { const T = await eb('/accounts/' + encodeURIComponent(a.uid) + '/transactions?date_from=' + from + (ck ? '&continuation_key=' + encodeURIComponent(ck) : ''));
        (T.transactions || []).forEach(t => { const amt = t.transaction_amount || {}, v = Math.abs(+amt.amount || 0); if (!v || t.status === 'RJCT') return; const dir = t.credit_debit_indicator === 'DBIT' ? -1 : 1, date = String(t.booking_date || t.value_date || t.transaction_date || '').slice(0, 10);
          const desc = (Array.isArray(t.remittance_information) ? t.remittance_information.join(' ') : String(t.remittance_information || '')) || (dir < 0 ? t.creditor && t.creditor.name : t.debtor && t.debtor.name) || t.bank_transaction_code && t.bank_transaction_code.description || '';
          const ref = t.entry_reference || t.transaction_id || N.crypto.createHash('sha1').update(a.uid + date + amt.amount + desc).digest('hex').slice(0, 16);
          mov.push({ ext: 'eb:' + ref, acc: 'eb:' + a.uid, date, amount: +(dir * v).toFixed(2), desc: String(desc).replace(/\s+/g, ' ').trim().slice(0, 140), cur: amt.currency || '', pend: t.status === 'PDNG' ? 1 : 0 }); });
        ck = T.continuation_key || ''; if (!ck) break; } }
    catch (e) { err.push(s.bank + ': ' + e.message); if (e.code === 'eb_exp') { s.exp = 1; break; } } } }
  return { acc, mov, err }; };

/* ---------- o regresso do banco (GET no navegador) ---------- */
const page = (res, ok, title, text) => { res.statusCode = ok ? 200 : 400; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  res.end(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} · Prumo</title><style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070D16;color:#C9D2DD;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}main{max-width:430px}h1{font:600 28px/1.15 Georgia,serif;color:#F1F4F8;margin:14px 0 10px}p{margin:0 0 18px}a{display:inline-block;background:#F2C48D;color:#0B1522;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:12px}</style></head>
<body><main id="b-${ok ? 'ok' : 'erro'}"><img src="${e(APP())}selo-96.png" width="48" height="48" alt=""><h1>${e(title)}</h1><p>${e(text)}</p><p>Já podes fechar esta janela e voltar ao Prumo.</p><a href="${e(APP())}#financas.banco">Abrir o Prumo</a></main></body></html>`); };
const callback = async (req, res, q) => { const st = await readState(q.state);
  if (!st) return page(res, false, 'O pedido expirou', 'Passaram mais de ' + STATE_MIN + ' minutos ou o endereço não é válido. Volta ao Prumo e liga o banco outra vez.');
  if (q.error) return page(res, false, 'Não ficou ligado', 'O banco não autorizou (' + String(q.error_description || q.error).slice(0, 80) + '). Nada foi ligado.');
  try { const r = await accOf({ u: st.u, a: st.a, v: st.v }, st.p); if (!isAdmin(r.email) && !TODOS('ENABLEBANKING_TODOS')) throw new Error('admin'); } catch (e) { return page(res, false, 'Não ficou ligado', 'A sessão do Prumo terminou entretanto. Entra outra vez e liga de novo.'); }
  let j; try { j = await eb('/sessions', { method: 'POST', body: JSON.stringify({ code: String(q.code || '') }) }); } catch (e) { return page(res, false, 'Não ficou ligado', e.message); }
  const accounts = (j.accounts || []).map(a => typeof a === 'string' ? { uid: a } : { uid: a.uid || a.account_uid || '', name: a.name || a.details || '', product: a.product || '', iban: (a.account_id && a.account_id.iban) || '', cur: a.currency || '', type: a.cash_account_type || '' }).filter(a => a.uid).slice(0, 20);
  const L = await readLink(st.u, st.p); L.eb = (L.eb || []).filter(s => s.bank !== (st.bank || '')).concat({ sid: j.session_id, bank: (j.aspsp && j.aspsp.name) || st.bank || 'Banco', c: (j.aspsp && j.aspsp.country) || st.c || '', until: (j.access && j.access.valid_until) || '', accounts, at: new Date().toISOString() }).slice(-6);
  await writeLink(st.u, st.p, L);
  return page(res, true, 'Banco ligado', `${(j.aspsp && j.aspsp.name) || st.bank || 'O banco'}: ${accounts.length} ${accounts.length === 1 ? 'conta' : 'contas'}. Os movimentos aparecem no Prumo em Finanças › Banco.`); };

module.exports = N.handler(async (req, res) => {
  const q = req.query || {};
  if (req.method === 'GET' && q.state && (q.code || q.error)) return callback(req, res, q);
  if (!N.allowed(req)) return N.send(res, 403, { ok: false, msg: 'Pedido recusado.' });
  if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  const t = await N.readToken(req); if (!t) return N.send(res, 401, { ok: false, msg: 'A sessão terminou. Entra outra vez.', code: 'sessao' });
  const b = await N.body(req), op = String(b.op || ''), pid = String(b.p || '');
  if (!PID.test(pid)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  if (N.limit(req, 'banco|' + t.u, 40, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  const rec = await accOf(t, pid), adm = isAdmin(rec.email), pronto = { pg: !!(PG_ID() && PG_SEC()), eb: !!(EB_ID() && EB_KEY()) };
  // quem pode ligar bancos: o dono sempre; as outras contas só quando o plano de produção do fornecedor estiver ligado
  // v3.21: nas outras contas, a ligação automática ao banco é do plano Completo
  const c3 = adm || require('./_planos').efetivo(rec).lvl >= 3;
  const pode = { pg: pronto.pg && (adm || (c3 && TODOS('PLUGGY_TODOS'))), eb: pronto.eb && (adm || (c3 && TODOS('ENABLEBANKING_TODOS'))) };
  if (op === 'estado') { const L = adm || pode.pg || pode.eb ? await readLink(t.u, pid) : { pg: [], eb: [] };
    return N.send(res, 200, { ok: true, adm, pronto, pode, todos: adm ? { pg: TODOS('PLUGGY_TODOS'), eb: TODOS('ENABLEBANKING_TODOS') } : {}, regresso: REDIR(), pg: (L.pg || []).map(x => ({ item: x.item, name: x.name || '', at: x.at })), eb: (L.eb || []).map(s => ({ sid: s.sid, bank: s.bank, c: s.c, until: s.until, n: (s.accounts || []).length, exp: !!s.exp || (s.until && Date.parse(s.until) < Date.now()) })) }); }
  const NO = N.send.bind(null, res, 403, { ok: false, code: 'admin', msg: 'A ligação automática ao banco ainda não está aberta a todas as contas. Por agora usa "Importar extrato".' });
  if (/^pg\./.test(op) && !pode.pg && !adm) return NO(); if (/^eb\./.test(op) && !pode.eb && !adm) return NO(); if (op === 'sync' && !pode.pg && !pode.eb) return NO();
  // um connect token para o widget Pluggy Connect desta pessoa (vale uns 30 minutos; o widget corre no aparelho dela)
  if (op === 'pg.token') { if (!pronto.pg) return N.send(res, 503, { ok: false, code: 'config', msg: 'Faltam as chaves da Pluggy no Vercel.' }); const L = await readLink(t.u, pid); if ((L.pg || []).length >= 5) return N.send(res, 400, { ok: false, msg: 'Já tens 5 bancos ligados. Desliga um para ligar outro.' });
    const r = await fetch(PGA() + '/connect_token', { method: 'POST', headers: { 'X-API-KEY': await pgKey(), 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ options: { clientUserId: await cuid(t.u, pid), avoidDuplicates: true } }) }); const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.accessToken) return N.send(res, 502, { ok: false, msg: 'A Pluggy não abriu a ligação agora. Tenta outra vez daqui a pouco.' }); return N.send(res, 200, { ok: true, token: j.accessToken, sandbox: TODOS('PLUGGY_SANDBOX') }); }
  if (op === 'pg.add') { if (!pronto.pg) return N.send(res, 503, { ok: false, code: 'config', msg: 'Faltam as chaves da Pluggy no Vercel.' }); const id = String(b.item || '').trim(); if (!UUID.test(id)) return N.send(res, 400, { ok: false, msg: 'O ID do item tem este formato: 8-4-4-4-12 letras e números (copia-o no Pluggy Dashboard).' });
    const item = await pg('/items/' + id), mine = item.clientUserId && item.clientUserId === await cuid(t.u, pid);
    // nas outras contas só entram itens criados pelo widget desta pessoa (o código opaco tem de bater certo)
    if (!adm && !mine) return N.send(res, 403, { ok: false, msg: 'Esta ligação não é tua. Liga o banco pelo botão "Ligar banco".' });
    const L = await readLink(t.u, pid); L.pg = (L.pg || []).filter(x => x.item !== id).concat({ item: id, name: (item.connector && item.connector.name) || 'Pluggy', at: new Date().toISOString(), w: mine ? 1 : 0 }).slice(-5); await writeLink(t.u, pid, L);
    return N.send(res, 200, { ok: true, name: (item.connector && item.connector.name) || 'Pluggy', status: item.status || '' }); }
  if (op === 'pg.del') { const L = await readLink(t.u, pid), x = (L.pg || []).find(x => x.item === String(b.item || ''));
    // o que foi ligado pelo widget é apagado também na Pluggy (a autorização no banco termina); o do Meu Pluggy fica lá
    if (x && x.w && pronto.pg) { try { await fetch(PGA() + '/items/' + x.item, { method: 'DELETE', headers: { 'X-API-KEY': await pgKey() } }); } catch (e) { } }
    L.pg = (L.pg || []).filter(x => x.item !== String(b.item || '')); await writeLink(t.u, pid, L); return N.send(res, 200, { ok: true }); }
  if (op === 'eb.bancos') { if (!pronto.eb) return N.send(res, 503, { ok: false, code: 'config', msg: 'Faltam as chaves do Enable Banking no Vercel.' }); const c = /^[A-Z]{2}$/.test(String(b.c || '')) ? b.c : 'PT';
    const j = await eb('/aspsps?country=' + c); return N.send(res, 200, { ok: true, bancos: (j.aspsps || []).filter(x => !x.psu_types || x.psu_types.includes('personal')).map(x => ({ name: x.name, c: x.country, logo: x.logo || '', max: +x.maximum_consent_validity || 0 })).slice(0, 300) }); }
  if (op === 'eb.inicio') { if (!pronto.eb) return N.send(res, 503, { ok: false, code: 'config', msg: 'Faltam as chaves do Enable Banking no Vercel.' }); const name = String(b.bank || '').slice(0, 120), c = /^[A-Z]{2}$/.test(String(b.c || '')) ? b.c : 'PT', max = Math.max(0, +b.max || 0);
    const secs = Math.min(180 * 86400, max || 90 * 86400), until = new Date(Date.now() + secs * 1000 - 60e3).toISOString();
    const j = await eb('/auth', { method: 'POST', body: JSON.stringify({ access: { valid_until: until }, aspsp: { name, country: c }, state: await makeState(t, pid, { bank: name, c }), redirect_url: REDIR(), psu_type: 'personal' }) });
    if (!j.url) return N.send(res, 502, { ok: false, msg: 'O Enable Banking não devolveu o endereço do banco.' }); return N.send(res, 200, { ok: true, url: j.url, validade: STATE_MIN * 60 }); }
  if (op === 'eb.del') { const L = await readLink(t.u, pid), s = (L.eb || []).find(x => x.sid === String(b.sid || '')); if (s && pronto.eb) { try { await eb('/sessions/' + encodeURIComponent(s.sid), { method: 'DELETE' }); } catch (e) { } } L.eb = (L.eb || []).filter(x => x.sid !== String(b.sid || '')); await writeLink(t.u, pid, L); return N.send(res, 200, { ok: true }); }
  if (op === 'sync') { const from = DAY.test(String(b.from || '')) && b.from > new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10) ? b.from : new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    const L = await readLink(t.u, pid), R1 = pode.pg && L.pg.length ? await pgSync(L.pg, from) : { acc: [], mov: [], err: [] }, R2 = pode.eb && L.eb.length ? await ebSync(L.eb.filter(s => !(s.until && Date.parse(s.until) < Date.now())), from) : { acc: [], mov: [], err: [] };
    if (L.eb.some(s => s.exp)) await writeLink(t.u, pid, L);
    return N.send(res, 200, { ok: true, from, contas: R1.acc.concat(R2.acc), mov: R1.mov.concat(R2.mov).slice(0, 8000), erros: R1.err.concat(R2.err) }); }
  return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
}, { anyOrigin: true });
