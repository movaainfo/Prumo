// PRUMO · e-mails automáticos (v4.02 · passo 3 dos 7). Corre de hora a hora (crons em vercel.json) e só envia entre as 9h e as 21h de Lisboa.
//  bv  boas-vindas com os 3 primeiros passos (depois de confirmar o e-mail)
//  t3  «o teu teste grátis acaba daqui a 3 dias»      t1  «acaba amanhã»
//  pf  «o pagamento falhou, atualiza o cartão» (assinatura em atraso no Stripe; este é de serviço e chega mesmo a quem desligou os outros)
//  fa  «sentimos a tua falta» (14 dias sem abrir o app; no máximo 1 a cada 45 dias)
// Ficam desligados até a administração os ligar (Administração › Vendas). Cada e-mail traz o link para deixar de os receber.
'use strict';
const N = require('./_nuvem'), P = require('./_planos'), C = require('./conta');
const DIA = 864e5, H = 36e5, CFG = 'cfg/emails', LOG = 'cfg/emails-log', TIPOS = ['bv', 't3', 't1', 'pf', 'fa'];
const APP = () => String(process.env.NAUTILO_APP_URL || 'https://prumo-vida.vercel.app').replace(/\/+$/, '');
const TESTE = /@nautilo\.test$/i;
const ler = async (p, d) => { try { const g = await N.store().get(p); if (g) return N.open(await N.accKey(), g.buf); } catch (e) { } return d; };
const gravar = async (p, v) => N.store().put(p, N.seal(await N.accKey(), v), {});
const cfgLer = async () => { const c = await ler(CFG, null) || {}; return { on: !!c.on, t: Object.assign({ bv: true, t3: true, t1: true, pf: true, fa: true }, c.t || {}), at: c.at || 0 }; };
const lisboaHora = t => +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', hourCycle: 'h23' }).format(new Date(t));
const mascara = e => { const [a, b] = String(e || '').split('@'); return (a || '').slice(0, 2) + '***@' + (b || ''); };
const assinar = async eid => N.crypto.createHmac('sha256', await N.accKey()).update('sair|' + eid).digest('base64url').slice(0, 32);
const linkSair = async eid => APP() + '/api/emails?op=sair&e=' + eid + '&s=' + await assinar(eid);
const lg = s => /^pt-BR/i.test(s || '') ? 'br' : /^pt/i.test(s || '') || !s ? 'pt' : 'en';
const dataTxt = (t, L) => new Date(t).toLocaleDateString(L === 'br' ? 'pt-BR' : L === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'long', timeZone: L === 'br' ? 'America/Sao_Paulo' : 'Europe/Lisbon' });
const limpa = s => String(s || '').replace(/[<>&"]/g, '').slice(0, 40);

/* ---------- os textos (pt-PT, pt-BR e inglês) ---------- */
const T = {
  bv: { pt: d => ({ s: 'Bem-vindo ao Prumo: 3 coisas para fazer hoje', p: [`A tua conta está pronta. Para o Prumo começar a ajudar-te, faz estas três coisas hoje (5 minutos):`, ['Em Finanças, junta as tuas contas e regista o primeiro gasto.', 'Em Hábitos, cria 2 ou 3 hábitos que queres manter.', 'Em Metas, escreve uma meta para este ano.'], d.teste ? `Tens o plano Completo grátis até ${d.ate}, sem cartão.` : ''], b: 'Abrir o Prumo', u: '/?app' }),
    br: d => ({ s: 'Bem-vindo ao Prumo: 3 coisas para fazer hoje', p: [`Sua conta está pronta. Para o Prumo começar a te ajudar, faça estas três coisas hoje (5 minutos):`, ['Em Finanças, cadastre suas contas e registre o primeiro gasto.', 'Em Hábitos, crie 2 ou 3 hábitos que você quer manter.', 'Em Metas, escreva uma meta para este ano.'], d.teste ? `Você tem o plano Completo grátis até ${d.ate}, sem cartão.` : ''], b: 'Abrir o Prumo', u: '/?app' }),
    en: d => ({ s: 'Welcome to Prumo: 3 things to do today', p: [`Your account is ready. To get Prumo working for you, do these three things today (5 minutes):`, ['In Finances, add your accounts and log your first expense.', 'In Habits, create 2 or 3 habits you want to keep.', 'In Goals, write one goal for this year.'], d.teste ? `You have the Complete plan free until ${d.ate}, no card needed.` : ''], b: 'Open Prumo', u: '/?app' }) },
  t3: { pt: d => ({ s: 'O teu teste grátis acaba daqui a 3 dias', p: [`O teu teste do plano Completo acaba a ${d.ate}.`, 'Para continuares com tudo, escolhe um plano: Essencial, Avançado ou Completo. Se não escolheres nenhum, os teus dados ficam guardados e podes assinar quando quiseres.'], b: 'Ver os planos', u: '/planos' }),
    br: d => ({ s: 'Seu teste grátis acaba em 3 dias', p: [`Seu teste do plano Completo acaba em ${d.ate}.`, 'Para continuar com tudo, escolha um plano: Essencial, Avançado ou Completo. Se não escolher nenhum, seus dados ficam guardados e você pode assinar quando quiser.'], b: 'Ver os planos', u: '/planos' }),
    en: d => ({ s: 'Your free trial ends in 3 days', p: [`Your Complete plan trial ends on ${d.ate}.`, 'To keep everything, choose a plan: Essential, Advanced or Complete. If you don\'t, your data stays saved and you can subscribe whenever you want.'], b: 'See the plans', u: '/planos' }) },
  t1: { pt: d => ({ s: 'O teu teste grátis acaba amanhã', p: ['Amanhã acaba o teu teste do plano Completo.', 'Se o Prumo te está a ser útil, escolhe hoje o plano para não perderes o acesso às funções. Os teus dados ficam sempre guardados.'], b: 'Escolher o plano', u: '/planos' }),
    br: d => ({ s: 'Seu teste grátis acaba amanhã', p: ['Amanhã acaba seu teste do plano Completo.', 'Se o Prumo está sendo útil, escolha hoje o plano para não perder o acesso às funções. Seus dados ficam sempre guardados.'], b: 'Escolher o plano', u: '/planos' }),
    en: d => ({ s: 'Your free trial ends tomorrow', p: ['Your Complete plan trial ends tomorrow.', 'If Prumo is useful to you, choose a plan today so you don\'t lose access. Your data always stays saved.'], b: 'Choose a plan', u: '/planos' }) },
  pf: { pt: d => ({ s: 'Não conseguimos cobrar a tua assinatura do Prumo', p: [`O pagamento do plano ${d.plano} não passou.`, 'Atualiza o cartão para não perderes o acesso. Em Definições › Conta, toca em «Gerir pagamento».'], b: 'Atualizar o cartão', u: '/?app#definicoes.conta' }),
    br: d => ({ s: 'Não conseguimos cobrar sua assinatura do Prumo', p: [`O pagamento do plano ${d.plano} não passou.`, 'Atualize o cartão para não perder o acesso. Em Definições › Conta, toque em «Gerir pagamento».'], b: 'Atualizar o cartão', u: '/?app#definicoes.conta' }),
    en: d => ({ s: 'We couldn\'t charge your Prumo subscription', p: [`The payment for the ${d.plano} plan didn't go through.`, 'Update your card so you don\'t lose access. In Settings › Account, tap «Manage payment».'], b: 'Update card', u: '/?app#definicoes.conta' }) },
  fa: { pt: d => ({ s: 'Sentimos a tua falta no Prumo', p: [`Há ${d.dias} dias que não abres o Prumo.`, 'Uma ideia para voltar sem esforço: abre o Painel e faz só a primeira coisa do dia. Os teus dados estão como os deixaste.'], b: 'Voltar ao Prumo', u: '/?app' }),
    br: d => ({ s: 'Sentimos sua falta no Prumo', p: [`Faz ${d.dias} dias que você não abre o Prumo.`, 'Uma ideia para voltar sem esforço: abra o Painel e faça só a primeira coisa do dia. Seus dados estão como você deixou.'], b: 'Voltar ao Prumo', u: '/?app' }),
    en: d => ({ s: 'We miss you at Prumo', p: [`You haven't opened Prumo for ${d.dias} days.`, 'An easy way back: open the Dashboard and do just the first thing of the day. Your data is just as you left it.'], b: 'Back to Prumo', u: '/?app' }) } };
const RODAPE = { pt: ['Recebes este e-mail porque tens conta no Prumo.', 'Deixar de receber estes e-mails', 'Quem vende e contactos'], br: ['Você recebe este e-mail porque tem conta no Prumo.', 'Parar de receber estes e-mails', 'Quem vende e contatos'], en: ['You get this email because you have a Prumo account.', 'Stop these emails', 'Seller and contacts'] };
const OLA = { pt: n => `Olá${n ? ' ' + n : ''},`, br: n => `Olá${n ? ' ' + n : ''},`, en: n => `Hi${n ? ' ' + n : ''},` };
const montar = (tipo, L, d, sair) => { const o = T[tipo][L](d), R = RODAPE[L], nome = limpa(d.nome), url = APP() + o.u;
  const linhas = o.p.filter(Boolean), txt = [OLA[L](nome), ''].concat(linhas.map(x => Array.isArray(x) ? x.map((y, i) => (i + 1) + '. ' + y).join('\n') : x).join('\n\n'), ['', o.b + ': ' + url, '', '—', 'Prumo', R[0], sair ? R[1] + ': ' + sair : '', R[2] + ': ' + APP() + '/termos']).filter(x => x !== '').join('\n');
  const p = linhas.map(x => Array.isArray(x) ? `<ol style="padding-left:20px;margin:0 0 14px">${x.map(y => `<li style="margin:0 0 6px">${y}</li>`).join('')}</ol>` : `<p style="margin:0 0 14px">${x}</p>`).join('');
  const html = `<div style="background:#f3f5f8;padding:24px 12px"><div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:14px;padding:28px 24px;color:#1b1f24;font-size:15px;line-height:1.55">
    <p style="margin:0 0 18px;font-weight:700;letter-spacing:.02em;color:#24527a">Prumo</p><p style="margin:0 0 14px">${OLA[L](nome)}</p>${p}
    <p style="margin:22px 0"><a href="${url}" style="display:inline-block;background:#24527a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${o.b}</a></p></div>
    <p style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:14px auto 0;color:#6b7280;font-size:12px;line-height:1.5;text-align:center">${R[0]}${sair ? ` <a href="${sair}" style="color:#6b7280">${R[1]}</a>.` : ''} <a href="${APP()}/termos" style="color:#6b7280">${R[2]}</a></p></div>`;
  return { sub: o.s, txt, html }; };

/* ---------- quem recebe o quê ---------- */
const decidir = (r, u, cfg, now) => { if (!r || !r.email || r.verif) return null; const M = r.mails || {}, ef = P.efetivo(r), t = cfg.t, ult = Math.max(u.ult || 0, u.ab || 0, r.ult || 0, Date.parse(r.criado || '') || 0);
  const p = r.plano; if (t.pf && p && P.mesmo(p) && /^(past_due|unpaid)$/.test(p.estado || '') && !M['pf:' + (p.ate || 0)]) return { k: 'pf', key: 'pf:' + (p.ate || 0), d: { plano: (P.byId(p.id) || {}).n || p.id || '' } };
  if (r.mailOff) return null;
  const criado = Date.parse(r.criado || '') || 0;
  if (t.bv && !M.bv && criado && now - criado < 3 * DIA) return { k: 'bv', key: 'bv', d: { teste: !!ef.teste, ateT: ef.ate } };
  if (P.cobranca() && ef.teste && ef.ate) { const f = ef.ate - now;
    if (t.t1 && f > 0 && f <= DIA + H && !M['t1:' + ef.ate]) return { k: 't1', key: 't1:' + ef.ate, d: {} };
    if (t.t3 && f > 2 * DIA && f <= 3 * DIA + H && !M['t3:' + ef.ate]) return { k: 't3', key: 't3:' + ef.ate, d: { ateT: ef.ate } }; }
  const longe = now - ult; if (t.fa && longe > 14 * DIA && longe < 120 * DIA && (!M.fa || now - M.fa > 45 * DIA)) return { k: 'fa', key: 'fa', d: { dias: Math.floor(longe / DIA) } };
  return null; };
const registar = async (k, email) => { const L = await ler(LOG, []) || []; L.unshift({ k, em: mascara(email), at: Date.now() }); await gravar(LOG, L.slice(0, 300)).catch(() => { }); };
const enviarUm = async (eid, r, u, x) => { const L = lg(u.lg), d = Object.assign({ nome: r.nome || '' }, x.d); if (d.ateT) d.ate = dataTxt(d.ateT, L);
  const m = montar(x.k, L, d, x.k === 'pf' ? '' : await linkSair(eid));
  // marca primeiro (para nunca mandar o mesmo duas vezes); se o envio falhar, desmarca
  let ja = false; await C.change(eid, rr => { rr.mails = rr.mails || {}; if (rr.mails[x.key]) { ja = true; return false; } rr.mails[x.key] = Date.now(); if (x.k === 'fa') rr.mails.fa = Date.now(); });
  if (ja) return false; const res = await C.mailRaw(r.email, m.sub, m.txt, m.html);
  if (!res.ok) { await C.change(eid, rr => { if (rr.mails) delete rr.mails[x.key]; }).catch(() => { }); return false; }
  await registar(x.k, r.email); return true; };
// atualiza do Stripe as assinaturas que acabaram o período ou estão em atraso (a pessoa pode não abrir o app)
const refrescar = async (eid, r, now) => { const p = r.plano; if (!P.cobranca() || !p || !p.sub || !P.mesmo(p) || now - (p.at || 0) < 12 * H) return r; if (!((p.ate || 0) < now + DIA || /^(past_due|unpaid)$/.test(p.estado || ''))) return r;
  try { const sub = await P.stripe('subscriptions/' + p.sub, null, 'GET'), st = Object.assign(P.doStripe(sub), { id: (sub.metadata && sub.metadata.plano) || p.id, ciclo: (sub.metadata && sub.metadata.ciclo) || p.ciclo }); return await C.change(eid, rr => { rr.plano = st; }); } catch (e) { return r; } };
// v4.03 · passo 6: quem foi convidado e passou a pagar dá 1 mês a quem convidou (uma vez por conta; corre sempre, mesmo com os e-mails desligados)
const convite = async (eid, r) => { if (!r.ref || r.refOk || !r.ref.eid || !P.efetivo(r).pago) return null; let ja = false;
  await C.change(eid, rr => { if (rr.refOk) { ja = true; return false; } rr.refOk = Date.now(); }); if (ja) return null;
  try { return await C.convRecompensar(r.ref.eid); } catch (e) { console.error('convite', e.message); return null; } };
const run = async (o = {}) => { const now = o.now || Date.now(), cfg = await cfgLer(), ligado = cfg.on || !!o.forcarLigado, hora = lisboaHora(now), deDia = !!o.force || (hora >= 9 && hora < 21);
  const mandar = ligado && deDia, conv = { n: 0 };
  const s = N.store(), key = await N.accKey(), A = o.so ? o.so.map(e => ({ pathname: 'a/' + e })) : await s.list('a/'), Us = {}, out = { ok: true, vistos: 0, enviados: {} }, t0 = Date.now();
  (await s.list('u/')).forEach(x => { Us[x.pathname.slice(2)] = x.pathname; });
  let i = 0; await Promise.all(Array.from({ length: Math.min(8, A.length) }, async () => { while (i < A.length && Date.now() - t0 < 50e3) { const x = A[i++]; try {
    const g = await s.get(x.pathname); if (!g) continue; const eid = x.pathname.slice(2); let r = N.open(key, g.buf);
    if (P.isAdmin(r.email) || (TESTE.test(r.email || '') && !process.env.NAUTILO_EMAIL_TESTES)) continue; out.vistos++;
    const gu = Us[r.uid] ? await s.get(Us[r.uid]).catch(() => null) : null, u = gu ? (() => { try { return N.open(key, gu.buf); } catch (e) { return {}; } })() : {};
    r = await refrescar(eid, r, now); if (await convite(eid, r)) conv.n++; if (!mandar) continue; const dx = decidir(r, u, cfg, now); if (!dx) continue;
    if (await enviarUm(eid, r, u, dx)) out.enviados[dx.k] = (out.enviados[dx.k] || 0) + 1; } catch (e) { console.error('emails', e.message); } } }));
  out.convites = conv.n; if (!ligado) out.desligado = 1; else if (!deDia) out.fora = 1; return out; };

/* ---------- pedidos: cron (Vercel), deixar de receber (link do e-mail) e a administração ---------- */
const sairPagina = (ok, L) => `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prumo</title><body style="font-family:system-ui,Arial,sans-serif;background:#f3f5f8;margin:0;padding:40px 16px"><div style="max-width:440px;margin:auto;background:#fff;border-radius:14px;padding:28px 24px;color:#1b1f24"><p style="font-weight:700;color:#24527a;margin:0 0 14px">Prumo</p><p style="margin:0">${ok ? 'Pronto: deixas de receber os e-mails de boas-vindas, lembretes e novidades do Prumo. Os avisos de pagamento continuam a chegar. Podes voltar a ligá-los em Definições › Conta.' : 'Este link não é válido. Abre o Prumo e muda em Definições › Conta.'}</p></div></body></html>`;
const admin = async req => { const t = await N.readToken(req); if (!t) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401); const a = await C.contaDe(t.a); if (!a || a.rec.uid !== t.u || !P.isAdmin(a.rec.email)) { N.sec('admin_negado', req); throw N.err('admin', 'Sem acesso.', 403); } return a.rec; };
const exemplo = (k, r) => ({ nome: r.nome || '', teste: true, ate: dataTxt(Date.now() + 3 * DIA, 'pt'), ateT: Date.now() + 3 * DIA, plano: 'Avançado', dias: 16 });
module.exports = N.handler(async (req, res) => { const q = req.query || {}, ua = String(req.headers['user-agent'] || '');
  if (req.method === 'GET' && q.op === 'sair') { const eid = String(q.e || ''), sig = String(q.s || ''); let ok = false;
    if (/^[a-f0-9]{40}$/.test(eid) && sig.length === 32 && N.crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(await assinar(eid)))) { try { await C.change(eid, r => { r.mailOff = true; }); ok = true; } catch (e) { } }
    res.statusCode = ok ? 200 : 400; res.setHeader('content-type', 'text/html; charset=utf-8'); res.setHeader('cache-control', 'no-store'); return res.end(sairPagina(ok)); }
  if (req.method === 'GET' && (q.op === 'cron' || /vercel-cron/i.test(ua))) { const sec = process.env.CRON_SECRET, auth = String(req.headers.authorization || '');
    if (sec ? auth !== 'Bearer ' + sec : !/vercel-cron/i.test(ua)) { N.sec('emails_negado', req); return N.send(res, 403, { ok: false }); }
    const out = await run(); out.faturas = await require('./_faturas').run().catch(e => ({ erro: String(e.message || e).slice(0, 200) })); return N.send(res, 200, out); }
  if (req.method !== 'POST' || !N.allowed(req)) return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  if (N.limit(req, 'emails', 60, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  const b = await N.body(req), op = String(b.op || ''), r = await admin(req), cfg = await cfgLer();
  if (op === 'estado') return N.send(res, 200, { ok: true, cfg, log: (await ler(LOG, []) || []).slice(0, 40), via: !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.NAUTILO_EMAIL_MOCK), tipos: TIPOS, faturas: await require('./_faturas').estado().catch(() => null) });
  if (op === 'ligar') { cfg.on = !!b.on; cfg.at = Date.now(); await gravar(CFG, cfg); return N.send(res, 200, { ok: true, cfg }); }
  if (op === 'tipo') { const k = String(b.k || ''); if (!TIPOS.includes(k)) throw N.err('emails', 'Tipo desconhecido.', 400); cfg.t[k] = !!b.on; await gravar(CFG, cfg); return N.send(res, 200, { ok: true, cfg }); }
  if (op === 'ver' || op === 'teste') { const k = String(b.k || ''), L = ['pt', 'br', 'en'].includes(b.lg) ? b.lg : 'pt'; if (!TIPOS.includes(k)) throw N.err('emails', 'Tipo desconhecido.', 400);
    const d = exemplo(k, r); if (L !== 'pt') d.ate = dataTxt(d.ateT, L); const m = montar(k, L, d, k === 'pf' ? '' : APP() + '/api/emails?op=sair&e=exemplo');
    if (op === 'ver') return N.send(res, 200, { ok: true, sub: m.sub, html: m.html, txt: m.txt });
    const x = await C.mailRaw(r.email, '[Teste] ' + m.sub, m.txt, m.html); if (!x.ok) throw N.err('emails', 'O serviço de e-mail recusou: ' + (x.msg || x.st), 502); return N.send(res, 200, { ok: true, enviado: 1 }); }
  throw N.err('emails', 'Pedido desconhecido.', 400); }, { anyOrigin: true });
module.exports.run = run; module.exports._t = { decidir, montar, cfgLer, gravarCfg: c => gravar(CFG, c), assinar, lg };
