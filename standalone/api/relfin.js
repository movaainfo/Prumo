// PRUMO · relatório financeiro mensal (v4.04). Só para a administração (Administração › Vendas).
// Junta, para um mês: o que entrou e saiu no Stripe (recebimentos, reembolsos, comissões e transferências para o banco),
// as despesas do Prumo que a administração regista (servidores, IA, e-mail, marketing…), o saldo do banco que ela indica
// e os indicadores das assinaturas (MRR, ARR, assinantes, receita diferida dos planos anuais). A app monta com isto as
// demonstrações financeiras (resultados, fluxos de caixa, balanço) num ficheiro Excel e numa versão para imprimir.
'use strict';
const N = require('./_nuvem'), P = require('./_planos'), C = require('./conta');
const CFG = 'cfg/relfin', DIA = 864e5, CATS = ['servidores', 'ia', 'email', 'software', 'marketing', 'contabilidade', 'lojas', 'pessoal', 'outros'];
const ler = async (p, d) => { try { const g = await N.store().get(p); if (g) return N.open(await N.accKey(), g.buf); } catch (e) { } return d; };
const gravar = async (p, v) => N.store().put(p, N.seal(await N.accKey(), v), {});
const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
// limites do mês na hora de Lisboa
const offLx = t => { const d = new Date(t), p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).forEach(x => { p[x.type] = x.value; });
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(t / 6e4) * 6e4; };
const inicio = ym => { const u = Date.parse(ym + '-01T00:00:00Z'); return u - offLx(u); };
const seguinte = ym => { const [y, m] = ym.split('-').map(Number); return m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0'); };
const cfgLer = async () => { const c = await ler(CFG, null) || {}; return { custos: Array.isArray(c.custos) ? c.custos : [], banco: c.banco || {}, imposto: c.imposto == null ? 0 : +c.imposto || 0 }; };
// as despesas que contam num mês: as mensais desde (e até) e as únicas desse mês
const custosDe = (cfg, ym) => cfg.custos.filter(x => x.tipo === 'unico' ? x.ym === ym : (!x.desde || x.desde <= ym) && (!x.ate || x.ate >= ym)).map(x => ({ id: x.id, nome: x.nome, cat: x.cat, v: x.v, tipo: x.tipo }));
const limpaCusto = x => { const v = Math.round(+x.v); if (!(v > 0 && v < 1e9)) return null; const tipo = x.tipo === 'unico' ? 'unico' : 'mensal';
  return { id: /^[a-z0-9]{6,16}$/.test(String(x.id || '')) ? x.id : N.crypto.randomBytes(5).toString('hex'), nome: String(x.nome || '').trim().slice(0, 60) || 'Despesa', cat: CATS.includes(x.cat) ? x.cat : 'outros', v, tipo,
    ym: tipo === 'unico' && YM.test(x.ym || '') ? x.ym : undefined, desde: tipo === 'mensal' && YM.test(x.desde || '') ? x.desde : undefined, ate: tipo === 'mensal' && YM.test(x.ate || '') ? x.ate : undefined }; };
// o Stripe no mês: movimentos do saldo (cada um já na moeda da conta Stripe, com a comissão separada)
const stripeMes = async ym => { if (!P.cobranca()) return { ligado: false };
  const g = Math.floor(inicio(ym) / 1000), l = Math.floor(inicio(seguinte(ym)) / 1000), L = []; let depois = '';
  for (let i = 0; i < 30; i++) { const q = { limit: 100, 'created[gte]': g, 'created[lt]': l }; if (depois) q.starting_after = depois; const j = await P.stripe('balance_transactions', q, 'GET'); (j.data || []).forEach(x => L.push(x)); if (!j.has_more || !(j.data || []).length) break; depois = j.data[j.data.length - 1].id; }
  const S = { ligado: true, modo: P.modo(), moeda: (L[0] && L[0].currency || 'eur').toUpperCase(), bruto: 0, reembolsos: 0, taxas: 0, payouts: 0, outros: 0, n: 0, mov: [] };
  L.forEach(x => { const cat = x.reporting_category || x.type; S.taxas += x.fee || 0;
    if (cat === 'charge' || x.type === 'charge' || x.type === 'payment') { S.bruto += x.amount; S.n++; }
    else if (cat === 'refund' || /refund/.test(x.type)) S.reembolsos += -x.amount;
    else if (cat === 'payout' || x.type === 'payout') S.payouts += -x.amount;
    else if (cat === 'fee' || x.type === 'stripe_fee') S.taxas += -x.amount;
    else S.outros += x.amount;
    S.mov.push({ d: x.created * 1000, t: cat, desc: String(x.description || '').slice(0, 80), b: x.amount, f: x.fee || 0, l: x.net, m: String(x.currency || '').toUpperCase() }); });
  S.mov = S.mov.slice(0, 800);
  try { const b = await P.stripe('balance', null, 'GET'), soma = a => (a || []).filter(x => x.currency === S.moeda.toLowerCase()).reduce((t, x) => t + (x.amount || 0), 0); S.saldo = { disp: soma(b.available), pend: soma(b.pending), em: Date.now() }; } catch (e) { }
  return S; };
// as assinaturas (no fim do mês, ou agora se é o mês corrente): pagantes, MRR/ARR e receita diferida dos anuais
const contasMes = async ym => { const s = N.store(), key = await N.accKey(), A = await s.list('a/'), fim = Math.min(Date.now(), inicio(seguinte(ym)) - 1), ini = inicio(ym);
  const out = { pagos: 0, loja: 0, testes: 0, novos: 0, cancelar: 0, porPlano: {}, mrr: {}, diferida: {}, total: 0 }; let i = 0;
  await Promise.all(Array.from({ length: Math.min(12, A.length) }, async () => { while (i < A.length) { const x = A[i++]; try { const g = await s.get(x.pathname); if (!g) continue; const r = N.open(key, g.buf);
    if (P.isAdmin(r.email) || /@nautilo\.test$/i.test(r.email || '')) continue; out.total++; const c = Date.parse(r.criado || '') || 0; if (c >= ini && c <= fim) out.novos++;
    const e = P.efetivo(r); if (e.teste) out.testes++; if (!e.pago) continue; out.pagos++; if (e.loja) { out.loja++; continue; } if (e.cancelar) out.cancelar++;
    const pl = P.byId(e.id); if (!pl) continue; const ano = e.ciclo === 'ano', pr = P.preco(pl, ano ? 'ano' : 'mes', e.cur), mes = ano ? pr.v / 12 : pr.v;
    out.porPlano[pl.n] = (out.porPlano[pl.n] || 0) + 1; out.mrr[pr.cur] = (out.mrr[pr.cur] || 0) + mes;
    if (ano && e.ate > fim) out.diferida[pr.cur] = (out.diferida[pr.cur] || 0) + pr.v * Math.min(1, (e.ate - fim) / (365 * DIA)); } catch (er) { } } }));
  const r2 = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)])); out.mrr = r2(out.mrr); out.diferida = r2(out.diferida); return out; };
const admin = async req => { const t = await N.readToken(req); if (!t) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401); const a = await C.contaDe(t.a); if (!a || a.rec.uid !== t.u || !P.isAdmin(a.rec.email)) { N.sec('admin_negado', req); throw N.err('admin', 'Sem acesso.', 403); } return a.rec; };
module.exports = N.handler(async (req, res) => { if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  if (N.limit(req, 'relfin', 30, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  const b = await N.body(req), op = String(b.op || ''); await admin(req); const cfg = await cfgLer();
  if (op === 'estado') return N.send(res, 200, { ok: true, cfg, cats: CATS });
  if (op === 'guardar') { const novo = { custos: (Array.isArray(b.custos) ? b.custos : cfg.custos).slice(0, 200).map(limpaCusto).filter(Boolean), banco: {}, imposto: Math.max(0, Math.min(60, +b.imposto || 0)) };
    Object.entries(b.banco && typeof b.banco === 'object' ? b.banco : cfg.banco).slice(0, 240).forEach(([k, v]) => { if (YM.test(k) && Number.isFinite(+v)) novo.banco[k] = Math.round(+v); });
    await gravar(CFG, novo); return N.send(res, 200, { ok: true, cfg: novo }); }
  // a assinatura do relatório de um mês (desenhada no ecrã depois de rever): guarda quem, quando, a imagem e a impressão dos valores assinados
  if (op === 'assinar') { const ym = String(b.ym || ''), sig = String(b.sig || ''), h = String(b.h || ''); if (!YM.test(ym)) throw N.err('relfin', 'Mês inválido.', 400);
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 300e3 || sig.length < 400) throw N.err('relfin', 'Desenha a tua assinatura no quadro antes de assinar.', 400);
    if (!/^[a-f0-9]{64}$/.test(h)) throw N.err('relfin', 'Gera o relatório antes de assinar.', 400);
    const a = { nome: String(b.nome || '').trim().slice(0, 80) || 'Responsável', cargo: String(b.cargo || '').trim().slice(0, 60), at: Date.now(), h, sig, revisto: !!b.revisto };
    if (!a.revisto) throw N.err('relfin', 'Confirma que reviste os valores antes de assinar.', 400);
    await gravar('cfg/relfin-ass/' + ym, a); return N.send(res, 200, { ok: true, assinatura: a }); }
  if (op === 'desassinar') { const ym = String(b.ym || ''); if (!YM.test(ym)) throw N.err('relfin', 'Mês inválido.', 400); await N.store().del([{ pathname: 'cfg/relfin-ass/' + ym }]).catch(() => { }); return N.send(res, 200, { ok: true }); }
  if (op === 'mes') { const ym = String(b.ym || ''); if (!YM.test(ym)) throw N.err('relfin', 'Mês inválido.', 400); if (inicio(ym) > Date.now()) throw N.err('relfin', 'Esse mês ainda não começou.', 400);
    const ano = ym.slice(0, 4), meses = []; for (let m = ano + '-01'; m <= ym; m = seguinte(m)) meses.push(m);
    let stripe = { ligado: false }, err = ''; try { stripe = await stripeMes(ym); } catch (e) { err = String(e.message || e).slice(0, 200); }
    // o acumulado do ano (só os totais de cada mês até este)
    const acum = { bruto: 0, reembolsos: 0, taxas: 0, custos: 0 };
    if (stripe.ligado) for (const m of meses) { if (m === ym) { acum.bruto += stripe.bruto; acum.reembolsos += stripe.reembolsos; acum.taxas += stripe.taxas; } else { try { const s = await stripeMes(m); acum.bruto += s.bruto; acum.reembolsos += s.reembolsos; acum.taxas += s.taxas; } catch (e) { } } }
    meses.forEach(m => { acum.custos += custosDe(cfg, m).reduce((t, x) => t + x.v, 0); });
    return N.send(res, 200, { ok: true, ym, stripe, stripeErro: err, contas: await contasMes(ym), custos: custosDe(cfg, ym), banco: cfg.banco[ym] == null ? null : cfg.banco[ym], bancoAnt: cfg.banco[(() => { const [y, m] = ym.split('-').map(Number); return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); })()] ?? null, imposto: cfg.imposto, acum, meses: meses.length, gerado: Date.now(), assinatura: await ler('cfg/relfin-ass/' + ym, null) }); }
  throw N.err('relfin', 'Pedido desconhecido.', 400); });
module.exports._t = { custosDe, limpaCusto, inicio, seguinte };
