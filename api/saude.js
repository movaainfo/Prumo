// PRUMO · verificação de saúde da base de dados, a cada hora (v3.64). Só o Vercel (CRON_SECRET) a pode chamar.
'use strict';
const N = require('./_nuvem'), H = require('./_saude');
// v3.70: /api/saude?ping=1 é público, para um monitor externo (ex.: UptimeRobot) avisar se o site cair: responde 200 se o servidor e a
// base de dados respondem (o resultado fica guardado 60 s, para não custar nada mesmo com muitos pedidos), 503 se não
const PING = { t: 0, ok: false, ms: 0 };
const ping = async (req, res) => { if (N.limit(req, 'ping', 120, 3600e3)) return N.send(res, 429, { ok: false });
  if (Date.now() - PING.t > 60e3) { const a = Date.now(); try { const s = N.store(); if (!s) throw new Error('sem base'); await s.head('cfg/saude.json'); PING.ok = true; } catch (e) { PING.ok = false; } PING.ms = Date.now() - a; PING.t = Date.now(); }
  res.setHeader('cache-control', 'no-store'); return N.send(res, PING.ok ? 200 : 503, { ok: PING.ok, ms: PING.ms }); };
module.exports = async (req, res) => {
  if (/[?&]ping=1(&|$)/.test(String(req.url || ''))) return ping(req, res);
  const sec = process.env.CRON_SECRET, auth = String(req.headers.authorization || ''), ua = String(req.headers['user-agent'] || '');
  if (sec ? auth !== 'Bearer ' + sec : !/vercel-cron/i.test(ua)) { N.sec('saude_negado', req); return N.send(res, 403, { ok: false }); }
  try { const { r } = await H.run({ mail: (...a) => require('./conta').mailRaw(...a) }); N.send(res, 200, { ok: true, saude: r.ok, ms: r.ms }); }
  catch (e) { console.error('saude falhou', e.message); N.send(res, 500, { ok: false }); } };
