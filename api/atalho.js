// PRUMO · atalhos do iPhone para todas as contas (função do Vercel): gastos e o sono do app Saúde. Faz o mesmo que a folha Google pessoal:
//   o atalho envia v (valor), d (descrição) e c (conta) com a chave do perfil → fica numa caixa de entrada cifrada;
//   a app vai lá buscar (op=pull) e confirma o que guardou (op=ack). Cada perfil tem a sua chave (Definições › Atalhos do iPhone).
'use strict';
const N = require('./_nuvem');
const tag = N.atalhoTag, unb64u = N.unb64u;
const readKey = async k => { const m = String(k || '').match(/^([A-Za-z0-9_-]{10,200})\.([A-Za-z0-9_-]{20,40})$/); if (!m) return null;
  const want = await tag(m[1]), got = unb64u(m[2]); if (got.length !== want.length || !N.crypto.timingSafeEqual(got, want)) return null;
  let o; try { o = JSON.parse(unb64u(m[1]).toString()); } catch (e) { return null; }
  if (!/^[a-f0-9]{40}$/.test(o.a || '') || !/^[a-f0-9]{12}$/.test(o.p || '')) return null;
  let g = await N.store().get('a/' + o.a);
  // a conta mudou de e-mail (pelo administrador): segue para a conta nova
  if (!g) { try { const x = await N.store().get('x/' + o.a); const to = x && N.open(await N.accKey(), x.buf).to; if (to && /^[a-f0-9]{40}$/.test(to)) g = await N.store().get('a/' + to); } catch (e) { } }
  if (!g) return null; let r; try { r = N.open(await N.accKey(), g.buf); } catch (e) { return null; }
  const p = (r.perfis || []).find(x => x.id === o.p); if (!p || !p.ak || p.ak !== o.n) return null;
  return { uid: r.uid, pid: o.p }; };
// link só de leitura para a agenda (Calendário do iPhone e Google Calendar): não serve para registar gastos
const calTag = async body => N.crypto.createHmac('sha256', await N.master()).update('agenda:' + body).digest().subarray(0, 18);
const calKey = async k => { const body = String(k).split('.')[0]; return body + '.' + N.b64u(await calTag(body)); };
// a agenda vai em calendários de cor, como na app (pastéis); sem "cat" vai tudo num só
const CATS = { trabalho: ['Prumo · Trabalho', '#A9C8F0'], folgas: ['Prumo · Folgas', '#B8E6C9'], tarefas: ['Prumo · Tarefas', '#FBE7A1'], estudos: ['Prumo · Estudos', '#D6C8F2'],
  compromissos: ['Prumo · Compromissos', '#F7C3D6'], treino: ['Prumo · Treino e rotina', '#FFD1B3'], outros: ['Prumo · Outros', '#E3DCCF'] };
const icsTxt = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// linhas com mais de 75 bytes dobram-se (sem partir letras acentuadas)
const fold = l => { const out = []; let cur = '', n = 0; for (const ch of l) { const b = Buffer.byteLength(ch); if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; } cur += ch; n += b; } out.push(cur); return out.join('\r\n '); };
const icsDay = d => String(d).replace(/-/g, ''), icsUtc = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const nextDay = d => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
const ics = (L, cat, tz, at) => { const meta = CATS[cat] || ['Prumo', '#A9C8F0'], now = icsUtc(at || Date.now());
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prumo//Agenda//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsTxt(meta[0]), 'X-WR-CALDESC:' + icsTxt('A tua agenda do Prumo. Para mudar, altera na app.'),
    'X-APPLE-CALENDAR-COLOR:' + meta[1], 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'];
  if (/^[A-Za-z_]+\/[A-Za-z_\/-]+$/.test(tz || '')) out.push('X-WR-TIMEZONE:' + tz);
  L.filter(e => !CATS[cat] || e.c === cat).forEach(e => { const uid = N.crypto.createHash('sha1').update(String(e.id)).digest('hex').slice(0, 24) + '@prumo';
    out.push('BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + now);
    if (e.all) out.push('DTSTART;VALUE=DATE:' + icsDay(e.s || e.date), 'DTEND;VALUE=DATE:' + icsDay(nextDay(e.e && e.e >= (e.s || e.date) ? e.e : (e.s || e.date))));
    else out.push('DTSTART:' + icsUtc(e.s), 'DTEND:' + icsUtc(e.e && e.e > e.s ? e.e : new Date(new Date(e.s).getTime() + 36e5)));
    out.push('SUMMARY:' + icsTxt(e.t)); if (e.l) out.push('LOCATION:' + icsTxt(e.l)); if (e.d) out.push('DESCRIPTION:' + icsTxt(e.d));
    out.push('TRANSP:' + (e.all ? 'TRANSPARENT' : 'OPAQUE'), 'END:VEVENT'); });
  out.push('END:VCALENDAR'); return out.map(fold).join('\r\n') + '\r\n'; };
const okDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d || ''), okIso = t => typeof t === 'string' && !isNaN(Date.parse(t));
const text = (res, status, s) => { res.statusCode = status; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(s); };

module.exports = N.handler(async (req, res) => {
  const b = Object.assign({}, req.query || {}, req.method === 'POST' ? await N.body(req) : {});
  if (N.limit(req, 'atalho', 120, 60e3)) return text(res, 429, 'Demasiados pedidos. Espera um minuto.');
  // a agenda em .ics (pedida pelo Calendário do iPhone ou pelo Google): chave só de leitura
  if (b.op === 'ics') { const m = String(b.c || '').match(/^([A-Za-z0-9_-]{10,200})\.([A-Za-z0-9_-]{20,40})$/); let who2 = null;
    if (m) { const want = await calTag(m[1]), got = unb64u(m[2]); if (got.length === want.length && N.crypto.timingSafeEqual(got, want)) who2 = await readKey(m[1] + '.' + N.b64u(await tag(m[1]))); }
    if (!who2) return text(res, 403, 'Link da agenda inválido. Copia-o outra vez no Prumo (Definições › Ligações).');
    const g = await N.store().get('k/' + who2.uid + '/' + who2.pid + '/cal'); let o = { ev: [] }; if (g) { try { o = N.open(await N.userKey(who2.uid), g.buf); } catch (e) { } }
    res.statusCode = 200; res.setHeader('Content-Type', 'text/calendar; charset=utf-8'); res.setHeader('Content-Disposition', 'inline; filename="prumo.ics"'); res.setHeader('Cache-Control', 'private, max-age=300');
    return res.end(ics(o.ev || [], String(b.cat || ''), o.tz, o.at)); }
  const who = await readKey(b.k); if (!who) return N.send(res, 403, { ok: false, msg: 'Chave do atalho inválida. Copia o link outra vez em Definições › Atalhos do iPhone.' });
  const s = N.store(), base = 'i/' + who.uid + '/' + who.pid + '/', key = await N.userKey(who.uid);
  if (b.op === 'ping') return N.send(res, 200, { ok: true, v: 4 });
  const kb = 'k/' + who.uid + '/' + who.pid + '/';
  // resumo do dia para a Siri (sem script): a app envia o de hoje e o de amanhã; o atalho lê-o em texto
  if (b.op === 'br' && req.method === 'POST') { let j = null; try { j = JSON.parse(String(b.j || '')); } catch (e) { }
    if (!j || typeof j.t !== 'string' || !okDay(j.d)) return N.send(res, 400, { ok: false, msg: 'Resumo inválido.' });
    await s.put(kb + 'br', N.seal(key, { d: j.d, t: j.t.slice(0, 6000), d2: okDay(j.d2) ? j.d2 : '', t2: String(j.t2 || '').slice(0, 6000), tz: Math.max(-900, Math.min(900, +b.tz || 0)), at: Date.now() }));
    return N.send(res, 200, { ok: true }); }
  if (b.op === 'resumo' || b.op === 'brief') { const g = await s.get(kb + 'br'); if (!g) return text(res, 200, 'Ainda não tenho o teu resumo. Abre o Prumo uma vez e eu preparo-o.');
    let o; try { o = N.open(key, g.buf); } catch (e) { return text(res, 200, 'Não consegui ler o resumo. Abre o Prumo para o preparar outra vez.'); }
    const hoje = new Date(Date.now() - (o.tz || 0) * 6e4).toISOString().slice(0, 10), want = /^amanh/i.test(String(b.dia || '')) ? nextDay(hoje) : hoje;
    if (o.d === want) return text(res, 200, o.t); if (o.d2 === want && o.t2) return text(res, 200, o.t2);
    return text(res, 200, 'O meu último resumo é de ' + o.d.slice(8, 10) + '/' + o.d.slice(5, 7) + '. Abre o Prumo para o pôr em dia. ' + o.t); }
  // a agenda: a app envia os eventos; o Calendário lê-os pelo link só de leitura (op=ics)
  if (b.op === 'cal' && req.method === 'POST') { let L = null; try { L = JSON.parse(String(b.ev || '[]')); } catch (e) { }
    if (!Array.isArray(L)) return N.send(res, 400, { ok: false, msg: 'Agenda inválida.' });
    L = L.slice(0, 4000).map(e => e && ({ id: String(e.id || '').slice(0, 140), c: CATS[e.c] ? e.c : 'outros', date: e.date, t: String(e.t || '').slice(0, 200), all: !!e.all,
      s: e.all ? (okDay(e.s) ? e.s : e.date) : e.s, e: e.all ? (okDay(e.e) ? e.e : e.date) : e.e, l: String(e.l || '').slice(0, 200), d: String(e.d || '').slice(0, 600) }))
      .filter(e => e && e.id && e.t && okDay(e.date) && (e.all || okIso(e.s) && okIso(e.e)));
    await s.put(kb + 'cal', N.seal(key, { ev: L, tz: String(b.tzn || '').slice(0, 60), at: Date.now() }));
    return N.send(res, 200, { ok: true, n: L.length, c: await calKey(b.k) }); }
  if (b.op === 'pull') { const L = (await s.list(base)).slice(0, 100), items = [];
    await Promise.all(L.map(async x => { const g = await s.get(x.pathname); if (!g) return; try { items.push(N.open(key, g.buf)); } catch (e) { } }));
    return N.send(res, 200, { ok: true, items: items.sort((a, c) => String(a.t).localeCompare(String(c.t))) }); }
  if (b.op === 'ack') { const ids = new Set(String(b.ids || '').split(',').filter(x => /^[a-z0-9-]{6,40}$/.test(x)));
    const L = (await s.list(base)).filter(x => ids.has(x.pathname.slice(base.length))); if (L.length) await s.del(L); return N.send(res, 200, { ok: true, n: L.length }); }
  if ((await s.list(base)).length >= 500) return text(res, 429, 'A caixa do atalho está cheia: abre o Prumo para os registos entrarem.');
  const id = Date.now().toString(36) + '-' + N.crypto.randomBytes(5).toString('hex');
  // sono do app Saúde (automação "Despertar"): as amostras "Valor|Início|Fim" seguem para a app, que junta as noites
  if (b.tipo === 'sono') { const sm = String(b.s || '').slice(0, 60000); if (!/\|/.test(sm)) return text(res, 400, 'Sem amostras de sono: confirma o campo s no atalho.');
    await s.put(base + id, N.seal(key, { id, t: new Date().toISOString(), tipo: 'sono', s: sm }), { overwrite: false });
    return text(res, 200, '✓ Sono enviado para o Prumo'); }
  // gasto novo (do atalho)
  const v = Number(String(b.v || '').replace(/[^0-9,.-]/g, '').replace(',', '.')); if (!(v > 0) || v > 1e7) return text(res, 400, 'Valor inválido');
  await s.put(base + id, N.seal(key, { id, t: new Date().toISOString(), v, d: String(b.d || '').slice(0, 200), c: String(b.c || '').slice(0, 80) }), { overwrite: false });
  text(res, 200, '✓ ' + String(v).replace('.', ',') + ' € registado no Prumo');
}, { anyOrigin: true });
