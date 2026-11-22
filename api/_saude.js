// PRUMO · saúde da base de dados (v3.64). Não é uma rota. A cada hora (api/saude, cron da Vercel) escreve, lê e apaga um ficheiro de teste
// no armazenamento, mede o tempo, confirma a chave mestra, a lista de contas e a idade das cópias de segurança, e guarda o histórico (72 h).
// Duas falhas seguidas: avisa a administração por e-mail (no máximo uma vez a cada 6 horas).
'use strict';
const N = require('./_nuvem');
const KEY = 'cfg/saude.json', KEEP = 72;
const check = async () => { const t0 = Date.now(), r = { t: t0, ok: true, ms: 0, passos: {} }, s = N.store(); const passo = async (k, fn) => { const a = Date.now(); try { await fn(); r.passos[k] = Date.now() - a; } catch (e) { r.ok = false; r.passos[k] = -1; r.err = (r.err ? r.err + '; ' : '') + k + ': ' + String(e.code || e.message || e).slice(0, 80); } };
  if (!s) return Object.assign(r, { ok: false, err: 'sem base de dados' });
  const p = 'sys/saude-' + N.crypto.randomBytes(4).toString('hex'), body = Buffer.from('ok ' + t0);
  await passo('escrever', () => s.put(p, body));
  await passo('ler', async () => { const g = await s.get(p); if (!g || g.buf.toString() !== body.toString()) throw new Error('conteúdo diferente'); });
  await passo('apagar', () => s.del([p]));
  await passo('chave', async () => { const k = await N.accKey(); if (!k || k.length !== 32) throw new Error('chave'); });
  await passo('contas', async () => { await s.list('a/'); });
  try { const g = await s.get('cfg/backup-diaria'); const b = g && JSON.parse(g.buf.toString()); r.copia = b ? b.dia : ''; if (b && Date.now() - Date.parse(b.dia + 'T23:59:59Z') > 50 * 36e5) { r.ok = false; r.err = (r.err ? r.err + '; ' : '') + 'cópia diária atrasada'; } } catch (e) { }
  r.ms = Date.now() - t0; return r; };
const run = async (o = {}) => { const r = await check(), s = N.store(); let H = { h: [], alertAt: 0 };
  try { const g = s && await s.get(KEY); if (g) H = JSON.parse(g.buf.toString()); } catch (e) { }
  H.h = (H.h || []).concat(r).slice(-KEEP); const last2 = H.h.slice(-2); let alerta = false;
  if (!r.ok) N.count('saude_falha');
  if (last2.length === 2 && last2.every(x => !x.ok) && Date.now() - (H.alertAt || 0) > 6 * 36e5 && o.mail) { alerta = true; H.alertAt = Date.now(); }
  try { if (s) await s.put(KEY, Buffer.from(JSON.stringify(H))); } catch (e) { }
  if (alerta) { const para = String(process.env.NAUTILO_ADMIN || '').split(',').map(x => x.trim()).filter(Boolean);
    for (const e of para) await o.mail(e, 'Prumo · a base de dados está com problemas', `A verificação de saúde do Prumo falhou duas vezes seguidas.\n\nÚltimo erro: ${r.err || '—'}\nTempo: ${r.ms} ms\n\nVê em Administração › Saúde do servidor.`, `<p>A verificação de saúde do Prumo <b>falhou duas vezes seguidas</b>.</p><p>Último erro: ${String(r.err || '—').replace(/[<>&]/g, '')}<br>Tempo: ${r.ms} ms</p><p>Vê em Administração › Saúde do servidor.</p>`).catch(() => { }); }
  try { await require('./_visitas').compactar(2); } catch (e) { } // v3.69: junta os contadores do dia num só ficheiro
  if (o.mail) { try { await require('./_erros').vigiar({ mail: o.mail }); } catch (e) { } } // v3.70: erro novo ou pico de erros → e-mail
  console.log('saude ' + JSON.stringify({ ok: r.ok, ms: r.ms, err: r.err || '' })); return { r, H }; };
const resumo = H => { const L = (H && H.h) || [], ok = L.filter(x => x.ok).length, ms = L.length ? Math.round(L.reduce((a, x) => a + (x.ms || 0), 0) / L.length) : 0;
  return { n: L.length, ok, pct: L.length ? Math.round(ok / L.length * 100) : null, ms, ultima: L[L.length - 1] || null, falhas: L.filter(x => !x.ok).slice(-5) }; };
const ler = async () => { try { const g = await N.store().get(KEY); return g ? JSON.parse(g.buf.toString()) : { h: [] }; } catch (e) { return { h: [] }; } };
module.exports = { check, run, resumo, ler };
