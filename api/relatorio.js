// PRUMO · relatório da semana (v3.62): o Vercel chama isto ao domingo, na janela de manutenção (crons em vercel.json).
// Gera o relatório (api/_relatorio.js), guarda-o e manda-o por e-mail à administração. Só o Vercel (CRON_SECRET) o pode chamar.
'use strict';
const N = require('./_nuvem'), R = require('./_relatorio');
module.exports = async (req, res) => {
  const sec = process.env.CRON_SECRET, auth = String(req.headers.authorization || ''), ua = String(req.headers['user-agent'] || '');
  if (sec ? auth !== 'Bearer ' + sec : !/vercel-cron/i.test(ua)) { N.sec('relatorio_negado', req); return N.send(res, 403, { ok: false }); }
  try { await N.flushCounts(true); const rel = await R.gerar(), m = R.email(rel), conta = require('./conta'), envio = [];
    const para = String(process.env.NAUTILO_ADMIN || '').split(',').map(x => x.trim()).filter(Boolean);
    for (const e of para) { const r = await conta.mailRaw(e, m.sub, m.txt, m.html).catch(() => ({ ok: false })); envio.push(!!(r && r.ok)); }
    console.log('relatorio ' + JSON.stringify({ de: rel.de, ate: rel.ate, alertas: rel.alertas.length, emails: envio }));
    N.send(res, 200, { ok: true, de: rel.de, ate: rel.ate, alertas: rel.alertas.length, emails: envio.filter(Boolean).length }); }
  catch (e) { console.error('relatorio falhou', e.code || '', e.message); N.send(res, 500, { ok: false }); } };
