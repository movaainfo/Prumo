// PRUMO · compras nas lojas (Play Store e App Store) pelo RevenueCat (função do Vercel, v3.71).
// O RevenueCat chama este endereço sempre que alguém compra, renova, cancela ou perde um plano na app das lojas.
// Segurança: só aceita com a senha combinada (REVENUECAT_WEBHOOK_AUTH, no cabeçalho Authorization); cada aviso só conta uma vez (id);
// e o aviso não é levado à letra: o plano é confirmado no próprio RevenueCat (REVENUECAT_API_KEY) antes de mudar a conta.
// Na app das lojas, a pessoa entra no RevenueCat com o id "p_<id da conta>" (op rcId de api/conta), que não diz o e-mail a ninguém.
// Compras de teste (sandbox) só contam com REVENUECAT_SANDBOX=1. Adormecida até as duas variáveis existirem.
'use strict';
const N = require('./_nuvem'), P = require('./_planos');
const API = () => String(process.env.REVENUECAT_API || 'https://api.revenuecat.com').replace(/\/+$/, '');
const pronto = () => !!(String(process.env.REVENUECAT_WEBHOOK_AUTH || '').trim() && String(process.env.REVENUECAT_API_KEY || '').trim());
const autorizado = req => { const want = String(process.env.REVENUECAT_WEBHOOK_AUTH || '').trim().replace(/^Bearer\s+/i, ''); if (!want) return false;
  const got = String((req.headers && req.headers.authorization) || '').trim().replace(/^Bearer\s+/i, ''), a = Buffer.from(got), b = Buffer.from(want); return a.length === b.length && N.crypto.timingSafeEqual(a, b); };
// entitlement do RevenueCat → plano do Prumo (pelo nome: essencial, avancado, completo)
const NIVEL = k => /complet/i.test(k) ? 'completo' : /avan/i.test(k) ? 'avancado' : /essenc/i.test(k) ? 'essencial' : '';
const planoDe = (sub, loja) => { const now = Date.now(), sand = process.env.REVENUECAT_SANDBOX === '1'; let best = null;
  Object.entries((sub && sub.entitlements) || {}).forEach(([k, e]) => { const id = NIVEL(k); if (!id || !P.byId(id)) return; const ate = e.expires_date ? Date.parse(e.expires_date) : 0; if (e.expires_date && !(ate > now)) return;
    const s = ((sub.subscriptions || {})[e.product_identifier]) || {}; if (s.is_sandbox && !sand) return;
    if (!best || P.byId(id).lvl > P.byId(best.id).lvl) best = { id, ate, prod: String(e.product_identifier || '').slice(0, 80), loja: String(s.store || loja || '').slice(0, 20).toLowerCase(), ciclo: /ano|annual|year/i.test(e.product_identifier || '') ? 'ano' : 'mes', at: now }; });
  return best; };
const confirma = async appId => { const r = await fetch(API() + '/v1/subscribers/' + encodeURIComponent(appId), { headers: { authorization: 'Bearer ' + String(process.env.REVENUECAT_API_KEY || '').trim(), accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Object.assign(new Error('RevenueCat ' + r.status), { status: r.status }); const j = await r.json(); return j.subscriber || {}; };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return N.send(res, 405, { ok: false });
  if (!pronto()) return N.send(res, 503, { ok: false, msg: 'Ainda não configurado.' });
  if (!autorizado(req)) { N.sec('revenuecat_negado', req); return N.send(res, 401, { ok: false }); }
  if (N.limit(req, 'revenuecat', 600, 3600e3)) return N.send(res, 429, { ok: false });
  const s = N.store(); if (!s) return N.send(res, 503, { ok: false });
  let b = {}; try { b = await N.body(req); } catch (e) { return N.send(res, 400, { ok: false }); }
  const ev = b && b.event; if (!ev || !ev.id) return N.send(res, 200, { ok: true, ignorado: 1 });
  const marca = 'rc/ev/' + String(ev.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 90);
  if (await s.head(marca)) return N.send(res, 200, { ok: true, repetido: 1 });
  if (ev.type !== 'TEST') {
    const ids = [ev.app_user_id, ev.original_app_user_id].concat(ev.aliases || [], ev.transferred_from || [], ev.transferred_to || []).map(String).filter(x => /^p_[a-f0-9]{40}$/.test(x));
    const conta = require('./conta'); let feitas = 0;
    for (const id of [...new Set(ids)]) { const eid = id.slice(2); if (!(await conta.existe(eid))) continue;
      let sub; try { sub = await confirma(id); } catch (e) { console.error('revenuecat confirmar', e.message); return N.send(res, 502, { ok: false }); } // o RevenueCat tenta outra vez
      await conta.planoLoja(eid, planoDe(sub, ev.store)); feitas++; }
    N.count('revenuecat:' + String(ev.type || '?').slice(0, 24)); if (!feitas) console.warn('revenuecat sem conta', String(ev.type || ''), ids.length);
  }
  try { await s.put(marca, Buffer.from(String(Date.now())), { overwrite: false }); } catch (e) { }
  return N.send(res, 200, { ok: true }); };
module.exports.pronto = pronto; module.exports.planoDe = planoDe;
