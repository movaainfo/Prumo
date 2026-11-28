// PRUMO · cópia de segurança diária (v3.62). O Vercel chama isto uma vez por dia (crons em vercel.json).
// Copia as contas e os dados (já cifrados, tal como estão) para bk/<dia>/… e guarda os últimos 7 dias.
// Ao domingo, na janela de manutenção de madrugada, faz também a cópia semanal (bks/<dia>/…), guardada 5 semanas.
// Não copia o que se refaz sozinho (marcas de sincronização, traduções, caches). Só o Vercel (CRON_SECRET) a pode chamar.
// Para repor uma conta ou um perfil a partir de um dia, pede ao programador: os ficheiros voltam para o sítio deles com a mesma cifra.
'use strict';
const N = require('./_nuvem');
const PREF = ['a/', 'b/', 'c/', 'cv/', 'd/', 'g/', 'i/', 'k/', 'p/', 'r/', 'u/', 'x/', 'cfg/', 'push/', 'sys/'];
const KEEP = () => Math.max(2, +(process.env.NAUTILO_BACKUP_DIAS || 7)), BUDGET = 240e3;

const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); };

const run = async (o = {}) => { const s = N.store(); if (!s) return { ok: false, msg: 'sem base de dados' };
  const t0 = Date.now(), day = o.day || new Date().toISOString().slice(0, 10), root = o.semanal ? 'bks/' : 'bk/', pre = root + day + '/', keep = o.semanal ? Math.max(2, +(process.env.NAUTILO_BACKUP_SEMANAS || 5)) : KEEP();
  let all = []; for (const p of PREF) all = all.concat(await s.list(p));
  // retoma: o que já foi copiado hoje com a mesma etiqueta não se copia outra vez
  const done = new Map((await s.list(pre)).map(b => [b.pathname.slice(pre.length), b]));
  const meta = await s.get(pre + '_indice.json').catch(() => null); let idx = {}; try { idx = meta ? JSON.parse(meta.buf.toString()) : {}; } catch (e) { idx = {}; }
  const todo = all.filter(b => !(done.has(b.pathname) && idx[b.pathname] === b.etag));
  let n = 0, falta = 0, erros = 0;
  await pool(todo, 12, async b => { if (Date.now() - t0 > BUDGET) { falta++; return; }
    try { const g = await s.get(b.pathname); if (!g) return; await s.put(pre + b.pathname, g.buf); idx[b.pathname] = g.etag || b.etag; n++; } catch (e) { erros++; } });
  await s.put(pre + '_indice.json', Buffer.from(JSON.stringify(idx)));
  // guarda só os últimos dias
  const dias = [...new Set((await s.list(root)).map(b => b.pathname.split('/')[1]).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  const velhos = dias.slice(0, Math.max(0, dias.length - keep));
  for (const d of velhos) { const L = await s.list(root + d + '/'); if (L.length) await s.del(L); }
  const r = { ok: true, tipo: o.semanal ? 'semanal' : 'diaria', dia: day, total: all.length, copiados: n, faltam: falta, erros, apagados: velhos, ms: Date.now() - t0 };
  console.log('backup ' + JSON.stringify(r)); try { await s.put('cfg/backup-' + r.tipo, Buffer.from(JSON.stringify(r))); } catch (e) { } return r; };

module.exports = async (req, res) => {
  const sec = process.env.CRON_SECRET, auth = String(req.headers.authorization || ''), ua = String(req.headers['user-agent'] || '');
  if (sec ? auth !== 'Bearer ' + sec : !/vercel-cron/i.test(ua)) { N.sec('backup_negado', req); return N.send(res, 403, { ok: false }); }
  const semanal = String((req.query || {}).semanal || '') === '1';
  try { N.send(res, 200, await run({ semanal })); } catch (e) { console.error('backup falhou', e.code || '', e.message); N.send(res, 500, { ok: false, msg: 'A cópia de segurança falhou: ' + (e.message || '').slice(0, 120) }); } };
module.exports.run = run;
