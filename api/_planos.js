// PRUMO · os planos (o app é todo pago), o teste grátis e a cobrança (Stripe).
//   Essencial → organizar a vida · Avançado → IA e análises · Completo → tudo, sem limites.
//   Teste grátis: 14 dias do Completo, a contar da criação da conta (as contas que já existiam contam a partir do lançamento dos planos).
//   Sem STRIPE_SECRET_KEY no Vercel ninguém fica bloqueado (não haveria como pagar): o app funciona como Completo e a página Planos diz "em breve".
//   Os preços mudam-se aqui ou com NAUTILO_PRECOS no Vercel (JSON: {"essencial":{"EUR":{"mes":399,"ano":3990},"BRL":{...}},…}, em cêntimos).
'use strict';
const DIA = 864e5, TESTE_DIAS = () => { const v = process.env.NAUTILO_TESTE_DIAS; return v != null && v !== '' && +v >= 0 ? +v : 14; };
const INICIO = () => process.env.NAUTILO_PLANOS_DESDE || '2026-11-13';
const BASE = [
  { id: 'essencial', n: 'Essencial', lvl: 1, ia: 20, perfis: 1, precos: { EUR: { mes: 399, ano: 3990 }, BRL: { mes: 1490, ano: 14900 } } },
  { id: 'avancado', n: 'Avançado', lvl: 2, ia: 150, perfis: 3, precos: { EUR: { mes: 799, ano: 7990 }, BRL: { mes: 2990, ano: 29900 } } },
  { id: 'completo', n: 'Completo', lvl: 3, ia: 400, perfis: 5, precos: { EUR: { mes: 1299, ano: 12990 }, BRL: { mes: 4990, ano: 49900 } } }];
const planos = () => { let o = null; try { o = JSON.parse(process.env.NAUTILO_PRECOS || 'null'); } catch (e) { }
  return BASE.map(p => { const x = o && o[p.id]; if (!x) return p; const pr = JSON.parse(JSON.stringify(p.precos));
    ['EUR', 'BRL'].forEach(c => ['mes', 'ano'].forEach(k => { const v = x[c] && +x[c][k]; if (v > 0 && v < 1e7) pr[c][k] = Math.round(v); })); return Object.assign({}, p, { precos: pr }); }); };
const byId = id => planos().find(p => p.id === id);
const cobranca = () => !!String(process.env.STRIPE_SECRET_KEY || '').trim();
const isAdmin = e => String(process.env.NAUTILO_ADMIN || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).includes(String(e || '').toLowerCase());
const TESTE_EMAIL = /@nautilo\.test$/i;
const ACTIVE = /^(active|trialing|past_due)$/;
const testeAte = r => Math.max(Date.parse(r.criado || '') || 0, Date.parse(INICIO()) || 0) + TESTE_DIAS() * DIA;
// o plano que vale agora para esta conta (o servidor decide; a app só mostra e bloqueia o ecrã)
const efetivo = r => { const now = Date.now(), mk = (id, extra) => { const p = byId(id); return Object.assign({ id: p.id, n: p.n, lvl: p.lvl, ia: p.ia, perfis: p.perfis }, extra || {}); };
  if (!r) return { id: '', lvl: 0, ia: 0, perfis: 0 };
  if (isAdmin(r.email)) return mk('completo', { admin: 1 });
  const o = r.planoAdm; if (o && byId(o.id) && (!o.ate || o.ate > now)) return mk(o.id, { oferta: 1, ate: o.ate || 0 });
  const p = r.plano; if (p && byId(p.id) && ACTIVE.test(p.estado || '') && (p.ate || 0) + 3 * DIA > now) return mk(p.id, { pago: 1, ate: p.ate || 0, cancelar: !!p.cancelar, ciclo: p.ciclo || 'mes', cur: p.cur || 'EUR' });
  const t = testeAte(r); if (t > now) return mk('completo', { teste: 1, ate: t });
  if (TESTE_EMAIL.test(r.email || '')) return mk('completo', { contaTeste: 1 });
  if (!cobranca()) return mk('completo', { semCobranca: 1, testeAcabou: t });
  return { id: '', n: '', lvl: 0, ia: 0, perfis: 0, acabou: 1, testeAcabou: t }; };

/* ---------- Stripe (só com a chave secreta no Vercel; sem bibliotecas) ---------- */
const SAPI = () => process.env.NAUTILO_STRIPE_API || 'https://api.stripe.com';
const form = (o, pre, out = []) => { Object.entries(o || {}).forEach(([k, v]) => { const key = pre ? pre + '[' + k + ']' : k; if (v == null) return;
    if (typeof v === 'object') form(v, key, out); else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v))); }); return out.join('&'); };
const stripe = async (path, params, method = 'POST') => { const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  const q = method === 'GET' && params ? '?' + form(params) : '', ac = new AbortController(), to = setTimeout(() => ac.abort(), 25e3);
  try { const r = await fetch(SAPI() + '/v1/' + path + q, { method, headers: { authorization: 'Bearer ' + key, 'content-type': 'application/x-www-form-urlencoded' }, body: method === 'GET' ? undefined : form(params || {}), signal: ac.signal });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error((j.error && j.error.message) || 'Stripe ' + r.status); e.status = r.status; e.stripe = 1; throw e; } return j; }
  finally { clearTimeout(to); } };
// o fim do período pago (nas versões novas da API está no item da assinatura)
const fimDe = s => 1000 * (+s.current_period_end || +(((s.items || {}).data || [])[0] || {}).current_period_end || 0);
const doStripe = s => ({ sub: s.id, cus: typeof s.customer === 'string' ? s.customer : (s.customer && s.customer.id) || '', estado: s.status || '', ate: fimDe(s), cancelar: !!s.cancel_at_period_end,
  id: (s.metadata && s.metadata.plano) || '', ciclo: (s.metadata && s.metadata.ciclo) || '', cur: String(s.currency || ((((s.items || {}).data || [])[0] || {}).price || {}).currency || '').toUpperCase(), at: Date.now() });

module.exports = { DIA, TESTE_DIAS, planos, byId, cobranca, efetivo, testeAte, isAdmin, stripe, doStripe, ACTIVE };
