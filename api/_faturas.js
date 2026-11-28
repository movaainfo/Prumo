// PRUMO · faturas certificadas automáticas (v4.03 · passo 6). Para cada pagamento do Stripe, emite uma fatura-recibo no InvoiceXpress
// (programa de faturação certificado pela AT), finaliza-a e envia-a por e-mail ao cliente. Corre de hora a hora com os e-mails automáticos.
// Fica desligado até a administração pôr no Vercel: INVOICEXPRESS_ACCOUNT, INVOICEXPRESS_API_KEY e NAUTILO_FATURAS=1.
// O IVA decide-o a administração: NAUTILO_FATURA_IVA = "23" (taxa normal; o preço do Stripe já inclui o IVA) ou "M10" (regime de isenção).
'use strict';
const N = require('./_nuvem'), P = require('./_planos');
const EST = 'cfg/faturas', DIA = 864e5;
const conf = () => { const acc = String(process.env.INVOICEXPRESS_ACCOUNT || '').trim(), key = String(process.env.INVOICEXPRESS_API_KEY || '').trim(), iva = String(process.env.NAUTILO_FATURA_IVA || '').trim().toUpperCase();
  return { acc, key, iva, ligada: process.env.NAUTILO_FATURAS === '1' && !!acc && !!key && /^(\d{1,2}|M\d\d)$/.test(iva), base: String(process.env.INVOICEXPRESS_API_BASE || (acc ? 'https://' + acc + '.app.invoicexpress.com' : '')).replace(/\/+$/, '') }; };
const ler = async (p, d) => { try { const g = await N.store().get(p); if (g) return N.open(await N.accKey(), g.buf); } catch (e) { } return d; };
const gravar = async (p, v) => N.store().put(p, N.seal(await N.accKey(), v), {});
const dmy = t => { const d = new Date(t); return [d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear()].map((x, i) => i < 2 ? String(x).padStart(2, '0') : x).join('/'); };
const ix = async (c, metodo, caminho, corpo) => { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 20e3);
  try { const r = await fetch(c.base + caminho + (caminho.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(c.key), { method: metodo, headers: { 'content-type': 'application/json', accept: 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined, signal: ac.signal });
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : {}; } catch (e) { }
    if (!r.ok) { const msg = (j && j.errors && j.errors.map(x => x.error).join('; ')) || t.slice(0, 200) || ('HTTP ' + r.status); throw Object.assign(new Error('InvoiceXpress: ' + msg), { status: r.status }); } return j || {}; }
  finally { clearTimeout(to); } };
// o documento a partir de uma fatura paga do Stripe
const documento = (c, f) => { const total = (f.amount_paid || f.total || 0) / 100, cur = String(f.currency || 'eur').toUpperCase(), linha = ((f.lines || {}).data || [])[0] || {}, plano = (linha.metadata && linha.metadata.plano) || (f.metadata && f.metadata.plano) || '';
  const nomePlano = (P.byId(plano) || {}).n, isento = /^M\d\d$/.test(c.iva), taxa = isento ? 0 : +c.iva, liquido = Math.round(total / (1 + taxa / 100) * 100) / 100;
  const tax = (f.customer_tax_ids || [])[0], pais = (f.customer_address && f.customer_address.country) || '';
  const doc = { date: dmy((f.status_transitions && f.status_transitions.paid_at ? f.status_transitions.paid_at : f.created) * 1000), reference: String(f.number || f.id).slice(0, 40), currency_code: cur,
    client: Object.assign({ name: String(f.customer_name || f.customer_email || 'Consumidor final').slice(0, 100), code: String(typeof f.customer === 'string' ? f.customer : (f.customer && f.customer.id) || '').slice(0, 40), email: f.customer_email || '' }, tax && tax.value ? { fiscal_id: String(tax.value).replace(/^PT/i, '') } : {}, pais ? { country: pais } : {}),
    items: [{ name: ('Prumo' + (nomePlano ? ' — plano ' + nomePlano : '')).slice(0, 60), description: String(linha.description || 'Assinatura do Prumo').slice(0, 200), unit_price: liquido, quantity: 1, tax: isento ? { value: 0 } : { value: taxa } }] };
  if (isento) Object.assign(doc, { tax_exemption_code: c.iva, tax_exemption_reason: c.iva, tax_exemption_message: String(process.env.NAUTILO_FATURA_ISENCAO || 'IVA – regime de isenção').slice(0, 210) });
  return { invoice: doc, proprietary_uid: 'stripe-' + f.id }; };
const emitir = async (c, f) => { const cr = await ix(c, 'POST', '/invoice_receipts.json', documento(c, f)), d = cr.invoice || cr.invoice_receipt || {}; if (!d.id) throw new Error('InvoiceXpress não devolveu o documento.');
  await ix(c, 'PUT', '/invoice_receipts/' + d.id + '/change-state.json', { invoice: { state: 'finalized' } }).catch(e => { if (!/already|final/i.test(e.message)) throw e; });
  if (f.customer_email) await ix(c, 'PUT', '/invoice_receipts/' + d.id + '/email-document.json', { message: { client: { email: f.customer_email, save: '0' }, subject: 'A tua fatura-recibo do Prumo', body: 'Olá! Em anexo segue a fatura-recibo da tua assinatura do Prumo. Obrigado por usares o Prumo.', logo: '1' } }).catch(e => console.error('fatura email', e.message));
  return { id: d.id, link: d.permalink || '' }; };
// as faturas pagas no Stripe desde a última vez (no modo de teste do Stripe não se emite nada a sério)
const pagasStripe = async desde => { const out = []; let depois = ''; for (let i = 0; i < 5; i++) { const q = { status: 'paid', limit: 100, 'created[gte]': Math.floor(desde / 1000) }; if (depois) q.starting_after = depois;
    const j = await P.stripe('invoices', q, 'GET'); (j.data || []).forEach(x => out.push(x)); if (!j.has_more || !(j.data || []).length) break; depois = j.data[j.data.length - 1].id; } return out; };
const run = async (o = {}) => { const c = conf(); if (!c.ligada) return { ok: true, desligada: 1 }; if (!o.faturas && (!P.cobranca() || P.modo() !== 'live') && !process.env.NAUTILO_FATURAS_TESTE) return { ok: true, stripeTeste: 1 };
  const E = await ler(EST, null) || { desde: Date.now() - 2 * DIA, feitas: {}, erros: [] }, L = o.faturas || await pagasStripe(E.desde - DIA), out = { ok: true, emitidas: 0, erros: 0 };
  for (const f of L.slice(0, 50)) { if (E.feitas[f.id] || !(f.amount_paid > 0)) continue;
    try { const d = await emitir(c, f); E.feitas[f.id] = { ix: d.id, link: d.link, at: Date.now() }; out.emitidas++; } catch (e) { out.erros++; E.erros = [{ f: f.id, msg: String(e.message || e).slice(0, 200), at: Date.now() }].concat(E.erros || []).slice(0, 20); } }
  E.desde = Date.now(); const ks = Object.keys(E.feitas); if (ks.length > 600) ks.sort((a, b) => E.feitas[a].at - E.feitas[b].at).slice(0, ks.length - 600).forEach(k => delete E.feitas[k]);
  E.n = (E.n || 0) + out.emitidas; await gravar(EST, E); return out; };
const estado = async () => { const c = conf(), E = await ler(EST, null) || {}; return { ligada: c.ligada, falta: [!c.acc && 'INVOICEXPRESS_ACCOUNT', !c.key && 'INVOICEXPRESS_API_KEY', !/^(\d{1,2}|M\d\d)$/.test(c.iva) && 'NAUTILO_FATURA_IVA', process.env.NAUTILO_FATURAS !== '1' && 'NAUTILO_FATURAS=1'].filter(Boolean), iva: c.iva, n: E.n || 0, erros: (E.erros || []).slice(0, 5) }; };
module.exports = { run, estado, _t: { documento, dmy } };
