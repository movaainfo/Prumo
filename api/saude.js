// PRUMO · verificação de saúde da base de dados, a cada hora (v3.64). Só o Vercel (CRON_SECRET) a pode chamar.
'use strict';
const N = require('./_nuvem'), H = require('./_saude');
module.exports = async (req, res) => {
  const sec = process.env.CRON_SECRET, auth = String(req.headers.authorization || ''), ua = String(req.headers['user-agent'] || '');
  if (sec ? auth !== 'Bearer ' + sec : !/vercel-cron/i.test(ua)) { N.sec('saude_negado', req); return N.send(res, 403, { ok: false }); }
  try { const { r } = await H.run({ mail: (...a) => require('./conta').mailRaw(...a) }); N.send(res, 200, { ok: true, saude: r.ok, ms: r.ms }); }
  catch (e) { console.error('saude falhou', e.message); N.send(res, 500, { ok: false }); } };
