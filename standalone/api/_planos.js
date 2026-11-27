// PRUMO · os planos (o app é todo pago), o teste grátis e a cobrança (Stripe).
//   Essencial → organizar a vida · Avançado → IA e análises · Completo → tudo, sem limites.
//   Teste grátis: 14 dias do Completo, a contar da criação da conta (as contas que já existiam contam a partir do lançamento dos planos).
//   Sem STRIPE_SECRET_KEY no Vercel ninguém fica bloqueado (não haveria como pagar): o app funciona como Completo e a página Planos diz "em breve".
//   v3.76: no Brasil cobra-se em reais (preço próprio). v3.60: no resto do mundo os preços são só em euros (o mínimo que o dono recebe). Quem paga noutra moeda vê o valor convertido do euro na página do Stripe
//   (Adaptive Pricing: o câmbio e a taxa de conversão ficam do lado de quem paga) ou, sem isso, o banco dele converte. O dono recebe sempre os euros.
//   Os preços mudam-se aqui ou com NAUTILO_PRECOS no Vercel (JSON: {"essencial":{"EUR":{"mes":599,"ano":5990}},…}, em cêntimos).
'use strict';
const DIA = 864e5, TESTE_DIAS = () => { const v = process.env.NAUTILO_TESTE_DIAS; return v != null && v !== '' && +v >= 0 ? +v : 14; };
const INICIO = () => process.env.NAUTILO_PLANOS_DESDE || '2026-11-13';
const BASE = [
  { id: 'essencial', n: 'Essencial', lvl: 1, ia: 20, perfis: 1, precos: { EUR: { mes: 599, ano: 5990 }, BRL: { mes: 1990, ano: 19900 } } },
  { id: 'avancado', n: 'Avançado', lvl: 2, ia: 150, perfis: 3, precos: { EUR: { mes: 1199, ano: 11990 }, BRL: { mes: 3990, ano: 39900 } } },
  { id: 'completo', n: 'Completo', lvl: 3, ia: 400, perfis: 5, precos: { EUR: { mes: 1999, ano: 19990 }, BRL: { mes: 6990, ano: 69900 } } }];
// v3.76: no Brasil, preço próprio em reais (mais perto do poder de compra); no resto do mundo, em euros
// só para as assinaturas que já tinham sido pagas em dólares ou reais antes da 3.60 (o Stripe não muda a moeda de uma assinatura): mudar de plano mantém essa moeda
const LEGADO = { essencial: { USD: { mes: 699, ano: 6990 }, BRL: { mes: 1990, ano: 19900 } }, avancado: { USD: { mes: 1299, ano: 12990 }, BRL: { mes: 3990, ano: 39900 } }, completo: { USD: { mes: 2199, ano: 21990 }, BRL: { mes: 6990, ano: 69900 } } };
const MOEDAS = ['EUR', 'BRL'], LIDAS = ['EUR', 'USD', 'BRL'], moeda = c => LIDAS.includes(String(c || '').toUpperCase()) ? String(c).toUpperCase() : 'EUR';
// o preço a cobrar: em euros; numa assinatura antiga em dólares ou reais, o valor dessa moeda
const preco = (pl, ciclo, cur) => { cur = moeda(cur); if (cur === 'BRL' && pl.precos.BRL) return { cur: 'BRL', v: pl.precos.BRL[ciclo] }; const L = cur !== 'EUR' && LEGADO[pl.id] && LEGADO[pl.id][cur]; return L ? { cur, v: L[ciclo] } : { cur: 'EUR', v: pl.precos.EUR[ciclo] }; };
// o preço em reais é para quem está no Brasil (o Vercel diz o país do pedido; sem essa informação, como nos testes, aceita)
const brasil = req => { const c = String((req && req.headers && req.headers['x-vercel-ip-country']) || '').toUpperCase(); return !c || c === 'BR'; };
const planos = () => { let o = null; try { o = JSON.parse(process.env.NAUTILO_PRECOS || 'null'); } catch (e) { }
  return BASE.map(p => { const x = o && o[p.id]; if (!x) return p; const pr = JSON.parse(JSON.stringify(p.precos));
    MOEDAS.forEach(c => ['mes', 'ano'].forEach(k => { const v = x[c] && +x[c][k]; if (v > 0 && v < 1e7) pr[c][k] = Math.round(v); })); return Object.assign({}, p, { precos: pr }); }); };
const byId = id => planos().find(p => p.id === id);
const cobranca = () => !!String(process.env.STRIPE_SECRET_KEY || '').trim();
const isAdmin = e => String(process.env.NAUTILO_ADMIN || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).includes(String(e || '').toLowerCase());
const TESTE_EMAIL = /@nautilo\.test$/i;
const ACTIVE = /^(active|trialing|past_due)$/;
// modo do Stripe pela chave: teste (sk_test_) ou real. Uma assinatura feita no outro modo não conta (ao trocar a chave de teste pela real, as de teste ficam de fora)
const modo = () => /^(sk|rk)_test_/.test(String(process.env.STRIPE_SECRET_KEY || '').trim()) ? 'test' : 'live';
const mesmo = p => !!p && (!p.modo || p.modo === modo());
const testeAte = r => Math.max(Date.parse(r.criado || '') || 0, Date.parse(INICIO()) || 0) + TESTE_DIAS() * DIA;
// o plano que vale agora para esta conta (o servidor decide; a app só mostra e bloqueia o ecrã)
const efetivo = r => { const now = Date.now(), mk = (id, extra) => { const p = byId(id); return Object.assign({ id: p.id, n: p.n, lvl: p.lvl, ia: p.ia, perfis: p.perfis }, extra || {}); };
  if (!r) return { id: '', lvl: 0, ia: 0, perfis: 0 };
  if (isAdmin(r.email)) return mk('completo', { admin: 1 });
  // escolha da administração (plano grátis, por uns dias ou sem fim): manda, salvo se a pessoa pagar um plano maior (fica com o maior)
  const o = r.planoAdm, of = o && byId(o.id) && (!o.ate || o.ate > now) ? o : null;
  const p = r.plano, pg0 = p && byId(p.id) && mesmo(p) && ACTIVE.test(p.estado || '') && (p.ate || 0) + 3 * DIA > now ? p : null;
  // v3.71: plano comprado na Play Store / App Store (RevenueCat); se houver dois planos pagos, vale o maior
  const l = r.planoLoja, pl0 = l && byId(l.id) && (!l.ate || l.ate + DIA > now) ? l : null, lojaGanha = !!pl0 && (!pg0 || byId(pl0.id).lvl > byId(pg0.id).lvl);
  const pg = lojaGanha ? null : pg0, pl = lojaGanha ? pl0 : null, best = pl || pg;
  if (of && !(best && byId(best.id).lvl > byId(of.id).lvl)) return mk(of.id, { oferta: 1, ate: of.ate || 0 });
  if (pl) return mk(pl.id, { pago: 1, loja: pl.loja || 'loja', ate: pl.ate || 0, ciclo: pl.ciclo || 'mes' });
  if (pg) return mk(pg.id, { pago: 1, ate: pg.ate || 0, cancelar: !!pg.cancelar, ciclo: pg.ciclo || 'mes', cur: moeda(pg.cur) });
  const t = testeAte(r); if (t > now) return mk('completo', { teste: 1, ate: t });
  if (TESTE_EMAIL.test(r.email || '')) return mk('completo', { contaTeste: 1 });
  if (!cobranca()) return mk('completo', { semCobranca: 1, testeAcabou: t });
  return { id: '', n: '', lvl: 0, ia: 0, perfis: 0, acabou: 1, testeAcabou: t }; };
// o que a conta teria sem a escolha da administração ("Automático": o teste grátis e depois o que a pessoa assinar)
const auto = r => efetivo(Object.assign({}, r, { planoAdm: null }));

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
  id: (s.metadata && s.metadata.plano) || '', ciclo: (s.metadata && s.metadata.ciclo) || '', modo: s.livemode === true ? 'live' : s.livemode === false ? 'test' : '', cur: String(s.currency || ((((s.items || {}).data || [])[0] || {}).price || {}).currency || '').toUpperCase(), at: Date.now() });

// v3.93 · Black Friday automática, todos os anos: da segunda-feira da semana da Black Friday (a sexta depois da 4.ª quinta-feira de novembro)
// até à Cyber Monday, em Lisboa. Planos: −40% no 1.º ano dos anuais e −30% nos 3 primeiros meses dos mensais (só em assinaturas novas).
// Selos: +50% de oferta em cada pacote. NAUTILO_BF = on | off | AAAA-MM-DD..AAAA-MM-DD (para testes ou para mudar as datas sem mexer no código).
const BF = { nome: 'Black Friday', ano: 40, mes: 30, meses: 3, selos: 50 };
const lisD = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const bfDatas = y => { const dow = new Date(Date.UTC(y, 10, 1)).getUTCDay(), sex = 1 + ((4 - dow + 7) % 7) + 21 + 1, iso = d => new Date(Date.UTC(y, 10, d)).toISOString().slice(0, 10); return { ini: iso(sex - 4), sex: iso(sex), fim: iso(sex + 3) }; };
const promo = (t = Date.now()) => { const e = String(process.env.NAUTILO_BF || '').trim(); if (e === 'off') return null; const hoje = lisD(t), y = +hoje.slice(0, 4);
  let D = bfDatas(y); const m = e.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/); if (m) D = { ini: m[1], sex: m[1], fim: m[2] };
  if (e !== 'on' && (hoje < D.ini || hoje > D.fim)) return null;
  const ate = e === 'on' && hoje > D.fim ? t + 3 * DIA : Date.parse(D.fim + 'T23:59:59Z');
  return Object.assign({ id: 'bf' + y, ini: D.ini, sex: D.sex, fim: D.fim, ate }, BF); };
module.exports = { promo, bfDatas, brasil, DIA, TESTE_DIAS, planos, byId, cobranca, efetivo, auto, testeAte, isAdmin, stripe, doStripe, ACTIVE, modo, mesmo, MOEDAS, moeda, preco };
