// PRUMO · contas (função do Vercel): criar conta, entrar, perfis (como na Netflix), senha, recuperação e apagar a conta.
// Uma conta = e-mail + senha (guardada em scrypt, nunca em texto). Cada conta tem até 5 perfis; cada perfil tem os seus dados.
// Sem serviço de e-mail: ao criar a conta mostramos um código de recuperação (só aparece uma vez) para repor a senha.
'use strict';
const N = require('./_nuvem'), P = require('./_planos');
const MAXP = 5, COLORS = ['#F2C48D', '#7FA9DA', '#3FCF8E', '#E0896A', '#9A8CF5', '#F28CB1', '#5CC8E6', '#F2B544'];
// administração: só as contas cujo e-mail está em NAUTILO_ADMIN (variável do projeto no Vercel) veem o separador
const isAdmin = e => String(process.env.NAUTILO_ADMIN || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).includes(String(e || '').toLowerCase());
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
// aceitação dos termos: versão (data) + o que a pessoa confirmou + quando (prova do consentimento, LGPD art. 8 / RGPD art. 7)
const TV = /^\d{4}-\d{2}-\d{2}$/;
const termsOf = b => { if (!TV.test(String(b.termos || '')) || b.saude !== true || b.idade !== true) throw N.err('termos', 'Para usar o Prumo tens de aceitar os Termos de Serviço e a Política de Privacidade e confirmar as outras duas caixas.', 400);
  return { v: b.termos, at: new Date().toISOString(), saude: true, idade: true }; };
const planoPub = r => { const e = P.efetivo(r), o = { id: e.id, n: e.n, lvl: e.lvl, perfis: e.perfis, ia: e.ia, cobranca: P.cobranca() };
  ['admin', 'oferta', 'pago', 'teste', 'cancelar', 'semCobranca', 'acabou', 'contaTeste'].forEach(k => { if (e[k]) o[k] = 1; }); ['ate', 'testeAcabou', 'ciclo', 'cur'].forEach(k => { if (e[k]) o[k] = e[k]; });
  if (r.plano && r.plano.cus) o.cliente = 1; return o; };
const pub = (r, eid) => ({ plano: planoPub(r), verificar: r.verif ? 1 : 0, trocar: !!r.trocar, avisos: (r.avisos || []).slice(-5), email: r.email, nome: r.nome || '', criado: r.criado, adm: isAdmin(r.email), termos: (r.termos || {}).v || '', termosAt: (r.termos || {}).at || '', perfis: (r.perfis || []).map(p => ({ id: p.id, nome: p.nome, cor: p.cor, av: p.av || '', lk: p.lk || '', pin: p.pin ? 6 : 0, inf: !!p.inf, ps: !!p.ps, img: p.img || '', criado: p.criado })) });
const cleanName = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanProfile = (p, old) => { const o = Object.assign({}, old || {});
  if (p.nome != null) o.nome = cleanName(p.nome, 24);
  if (p.cor != null && /^#[0-9A-Fa-f]{6}$/.test(p.cor)) o.cor = p.cor;
  if (p.av != null) o.av = [...String(p.av)].slice(0, 2).join('').replace(/[<>&"']/g, '');
  if (p.lk != null && /^([a-f0-9]{64})?$/.test(p.lk)) o.lk = p.lk;
  if (p.pin != null) o.pin = +p.pin === 6 ? 6 : 0;   // código de 6 números (casinhas no ecrã do código)
  if (p.inf != null) o.inf = !!p.inf;
  if (p.ps != null) o.ps = !!p.ps;
  // imagem do perfil (foto ou personagem do Dominus), pequena: até ~45 kB
  if (p.img != null) { if (p.img === '') o.img = ''; else if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.img) && p.img.length <= 60000) o.img = p.img; else throw N.err('imagem', 'A imagem é grande demais ou não é válida.', 400); }
  return o; };

// ler e gravar a conta (cifrada); grava só se ninguém a mudou entretanto (etag), e volta a tentar
const readAcc = async eid => { const g = await N.store().get('a/' + eid); if (!g) return null; return { rec: N.open(await N.accKey(), g.buf), etag: g.etag }; };
// para gravar: a etiqueta oficial (head, pela API) tem de ser a do conteúdo lido; se a leitura veio atrasada, lê outra vez
const readFresh = async eid => { const s = N.store(); for (let i = 0; i < 4; i++) { const a = await readAcc(eid); if (!a) return null; const h = await s.head('a/' + eid).catch(() => null);
    const nt = x => String(x || '').replace(/^W\//, '').replace(/"/g, ''); if (!h || !h.etag) return a; if (nt(h.etag) === nt(a.etag)) return { rec: a.rec, etag: h.etag }; await N.sleep(150 * (i + 1)); }
  return readAcc(eid); };
const writeAcc = (eid, rec, etag) => N.accKey().then(k => N.store().put('a/' + eid, N.seal(k, rec), etag ? { ifMatch: etag } : { overwrite: false }));
const change = async (eid, fn) => { for (let i = 0; i < 5; i++) { const a = await (i ? readFresh(eid) : readAcc(eid)); if (!a) throw N.err('sem_conta', 'Conta não encontrada.', 404);
    const out = await fn(a.rec); if (out === false) return a.rec;
    try { await writeAcc(eid, a.rec, a.etag); return a.rec; } catch (e) { if (e.code !== 'conflict') throw e; await N.sleep(80 + Math.random() * 200); } }
  throw N.err('ocupado', 'A conta está a ser alterada noutro aparelho. Tenta outra vez.', 409); };
const session = async req => { const t = await N.readToken(req); if (!t) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  const a = await readAcc(t.a); if (!a || a.rec.uid !== t.u || (a.rec.tv || 1) !== t.v) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  if (a.rec.verif && !VPEND.has(req._op)) throw N.err('verificar', 'Confirma primeiro o teu e-mail com o código que te enviámos.', 403);
  return { t, eid: t.a, rec: a.rec }; };
const needPw = async (rec, pw) => { if (!(await N.checkPw(pw, rec.pw))) throw N.err('senha', 'A senha não está certa.', 403); };
// senha temporária fácil de ditar: 3 grupos de 4 (sem letras que se confundem)
const tempPw = () => { const C = 'abcdefghjkmnpqrstuvwxyz23456789', b = N.crypto.randomBytes(12); let o = ''; for (let i = 0; i < 12; i++) { o += C[b[i] % C.length]; if (i === 3 || i === 7) o += '-'; } return o; };
const aviso = (r, a) => { r.avisos = (r.avisos || []).concat([Object.assign({ at: new Date().toISOString() }, a)]).slice(-10); };
const dropData = async (uid, pid) => { const s = N.store(), sub = pid ? pid + '/' : ''; const L = (await s.list('d/' + uid + '/' + sub)).concat(await s.list('i/' + uid + '/' + sub), pid ? await s.list('m/' + uid + '/' + pid) : await s.list('m/' + uid + '/'), await s.list('g/' + uid + '/' + (pid || '')), await s.list('r/' + uid + '/' + (pid || '')), await s.list('k/' + uid + '/' + sub)); if (L.length) await s.del(L); RK.rows = null; };

/* ---------- ranking: a disciplina de cada perfil (0–100 por dia) e os dias de foco seguidos ---------- */
// r/<conta>/<perfil>: { d: { dia: pontos }, n: nome, c: cor, av, im (foto pequena), anon, at, t (conta de teste) }. Só se vê a lista: sem perfis, sem mensagens.
// v2.48: regras mais difíceis (dia de foco com 70) e o ranking recomeça em DESDE (os dias antes disso já não contam)
const FOCO = 70, DESDE = () => process.env.NAUTILO_RANK_DESDE || '2026-10-25', IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, RK = { at: 0, rows: null }, TESTE = /@nautilo\.test$/i;
const isoDay = ms => new Date(ms).toISOString().slice(0, 10), addD = (d, n) => isoDay(Date.parse(d + 'T12:00:00Z') + n * 864e5);
const rankRows = async () => { if (RK.rows && Date.now() - RK.at < 30e3) return RK.rows;
  const s = N.store(), key = await N.accKey(), L = await s.list('r/'), rows = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(16, L.length) }, async () => { while (i < L.length) { const x = L[i++]; try { const g = await s.get(x.pathname); if (g) rows.push(Object.assign(N.open(key, g.buf), { path: x.pathname })); } catch (e) { } } }));
  RK.rows = rows; RK.at = Date.now(); return rows; };
// dias de foco seguidos: termina no dia mais recente (amanhã, hoje ou ontem em UTC, por causa dos fusos) que conta
const streakOf = (d, today) => { let e = [addD(today, 1), today, addD(today, -1)].find(x => (d[x] || 0) >= FOCO); if (!e) return 0; let n = 0; while ((d[e] || 0) >= FOCO && n < 5000) { n++; e = addD(e, -1); } return n; };
const bestOf = d => { let b = 0, run = 0, prev = ''; Object.keys(d).sort().forEach(x => { if (d[x] >= FOCO) { run = prev && addD(prev, 1) === x ? run + 1 : 1; prev = x; b = Math.max(b, run); } }); return b; };
// está com a app aberta agora: sinal há menos de 7 min (a app manda um a cada 5 min de uso) e não disse que saiu
const online = u => !!(u && u.on && Date.now() - (u.ult || 0) < 7 * 60e3);
const totOf = u => u ? (u.tot != null ? u.tot : Object.values(u.dias || {}).reduce((a, x) => a + (Number(x) || 0), 0)) : 0;
const rowOut = (r, today, me) => { const d = Object.fromEntries(Object.entries(r.d || {}).filter(([k]) => k >= DESDE())), ks = Object.keys(d).sort(), sum = from => ks.filter(x => x > from && x <= addD(today, 1)).reduce((a, x) => a + d[x], 0);
  const p7 = sum(addD(today, -7)), p30 = sum(addD(today, -30)), pa = ks.reduce((a, x) => a + d[x], 0), span = ks.length ? Math.max(1, Math.round((Date.parse(today) - Date.parse(ks[0])) / 864e5) + 1) : 1;
  const last = [addD(today, 1), today, addD(today, -1)].find(x => d[x] != null);
  return { n: r.anon && !me ? '' : r.n || '', c: r.c || '', av: r.anon && !me ? '' : r.av || '', im: r.anon && !me ? '' : r.im || '', anon: !!r.anon, me: !!me, s: streakOf(d, today), b: Math.max(r.b || 0, bestOf(d)), h: last ? d[last] : null,
    p7, p30, pa, q7: Math.round(p7 / Math.min(7, span)), q30: Math.round(p30 / Math.min(30, span)), qa: Math.round(pa / span), dias: ks.length, tm: Math.max(0, Math.round(Number(r.tm) || 0)) }; };

/* ---------- Spotify: só para o administrador e as contas que ele escolher ---------- */
const SPK = 'cfg/spotify', SP_MAX = 4, SPC = { at: 0, v: [] };
const spList = async () => { if (Date.now() - SPC.at < 20e3) return SPC.v; try { const g = await N.store().get(SPK); SPC.v = g ? (N.open(await N.accKey(), g.buf).emails || []) : []; } catch (e) { SPC.v = []; } SPC.at = Date.now(); return SPC.v; };
const spOk = async email => isAdmin(email) || (await spList()).includes(N.normEmail(email));
const spCid = () => { const v = String(process.env.SPOTIFY_CLIENT_ID || '').trim(); return /^[a-f0-9]{32}$/i.test(v) ? v : ''; };

/* ---------- verificação do e-mail no primeiro registo ----------
   Com RESEND_API_KEY ou BREVO_API_KEY no Vercel (e NAUTILO_EMAIL_DE, o remetente), a conta nova recebe um código de 6 números por e-mail
   e só fica ativa depois de o confirmar na app. Sem serviço de e-mail ligado, o passo não aparece (ninguém fica preso). */
const mailOn = () => !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.NAUTILO_EMAIL_MOCK);
const code6 = () => String(N.crypto.randomInt(0, 1e6)).padStart(6, '0');
const sendCode = async (email, nome, code) => { const de = process.env.NAUTILO_EMAIL_DE || 'Prumo <onboarding@resend.dev>', sub = 'O teu código do Prumo: ' + code, cc = code.slice(0, 3) + ' ' + code.slice(3);
  const txt = `Olá${nome ? ' ' + nome : ''},\n\nO teu código para confirmar o e-mail no Prumo é: ${cc}\nVale 30 minutos.\n\nSe não foste tu a criar a conta, ignora este e-mail.\n\nPrumo`;
  const html = `<div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1b1b1b"><p>Olá${nome ? ' ' + nome.replace(/[<>&"]/g, '') : ''},</p><p>O teu código para confirmar o e-mail no <b>Prumo</b> é:</p><p style="font-size:32px;letter-spacing:6px;font-weight:700;margin:18px 0">${cc}</p><p>Vale 30 minutos.</p><p style="color:#666;font-size:13px">Se não foste tu a criar a conta, ignora este e-mail.</p></div>`;
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 15e3); let r;
  try { if (process.env.NAUTILO_EMAIL_MOCK) r = await fetch(process.env.NAUTILO_EMAIL_MOCK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: email, subject: sub, text: txt }), signal: ac.signal });
    else if (process.env.RESEND_API_KEY) r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ from: de, to: [email], subject: sub, text: txt, html }), signal: ac.signal });
    else { const m = de.match(/^\s*(.*?)\s*<([^>]+)>\s*$/); r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ sender: m ? { name: m[1] || 'Prumo', email: m[2] } : { name: 'Prumo', email: de }, to: [{ email }], subject: sub, textContent: txt, htmlContent: html }), signal: ac.signal }); }
    return r.ok; } catch (e) { return false; } finally { clearTimeout(to); } };
const VPEND = new Set(['eu', 'verificarEmail', 'reenviarCodigo', 'apagar', 'termos', 'planos']);

/* ---------- planos: ajudas ---------- */
const voltaDe = (req, v) => { const o = String(req.headers.origin || ''), h = /^https?:\/\/[^/]+$/.test(o) ? o : 'https://' + String(req.headers['x-forwarded-host'] || req.headers.host || 'prumo-vida.vercel.app').split(',')[0].trim();
  const x = String(v || ''); return x && x.startsWith(h + '/') && x.length < 300 && !/[#?\s]/.test(x) ? x : h + '/'; };
// um produto no Stripe para cada plano (criado na primeira vez e guardado), com o preço posto em cada pagamento
const PROD = {};
const produto = async id => { const kt = String(process.env.STRIPE_SECRET_KEY || '').trim().slice(-6), ck = kt + ':' + id; if (PROD[ck]) return PROD[ck];
  const st = N.store(), key = await N.accKey(); let c = {}; try { const g = await st.get('cfg/stripe'); if (g) c = N.open(key, g.buf) || {}; } catch (e) { }
  if (c[ck]) return (PROD[ck] = c[ck]);
  const pr = await P.stripe('products', { name: 'Prumo · ' + P.byId(id).n, metadata: { plano: id } }); c[ck] = pr.id; await st.put('cfg/stripe', N.seal(key, c)); return (PROD[ck] = pr.id); };
// a assinatura muda no Stripe (renovação, cartão recusado, cancelamento): a conta vai lá ver de 6 em 6 horas ou quando o período acaba
const refreshPlano = async s => { const p = s.rec.plano; if (!P.cobranca() || !p || !p.sub) return null; if (Date.now() - (p.at || 0) < 6 * 36e5 && (p.ate || 0) > Date.now()) return null;
  const sub = await P.stripe('subscriptions/' + p.sub, null, 'GET'), st = Object.assign(P.doStripe(sub), { id: (sub.metadata && sub.metadata.plano) || p.id, ciclo: (sub.metadata && sub.metadata.ciclo) || p.ciclo });
  return change(s.eid, r => { r.plano = st; }); };
const fimPlano = async (req, cancelar) => { const s = await session(req), p = s.rec.plano; if (!P.cobranca() || !p || !p.sub) throw N.err('sem', 'Ainda não tens assinatura.', 400);
  const up = await P.stripe('subscriptions/' + p.sub, { cancel_at_period_end: cancelar ? 'true' : 'false' }); const st = Object.assign(P.doStripe(up), { id: p.id, ciclo: p.ciclo });
  const rec = await change(s.eid, r => { r.plano = st; }); return { conta: pub(rec) }; };
const OPS = {
  async registar(req, b) {
    if (N.limit(req, 'registar', 6, 3600e3)) throw N.err('limite', 'Muitas contas criadas a partir daqui. Tenta mais tarde.', 429);
    const email = N.normEmail(b.email), senha = String(b.senha || ''), nome = cleanName(b.nome, 40);
    if (!EMAIL.test(email)) throw N.err('email', 'Esse e-mail não parece válido.', 400);
    if (senha.length < 8) throw N.err('senha', 'A senha precisa de pelo menos 8 caracteres.', 400);
    if (senha.length > 200) throw N.err('senha', 'A senha é longa demais.', 400);
    const termos = termsOf(b), eid = await N.emailId(email), code = N.newCode();
    const rec = { v: 1, uid: N.crypto.randomBytes(12).toString('hex'), email, nome, criado: new Date().toISOString(), pw: await N.hashPw(senha), rc: await N.hashPw(N.normCode(code)), perfis: [], tv: 1, falhas: 0, bloq: 0, termos };
    // v3.21: verificação do e-mail (só no primeiro registo; as contas de teste saltam)
    const vc = mailOn() && !TESTE.test(email) ? code6() : ''; if (vc) rec.verif = { h: await N.hashPw(vc), exp: Date.now() + 30 * 60e3, n: 0, env: Date.now(), envs: 1 };
    try { await writeAcc(eid, rec); } catch (e) { if (e.code !== 'exists') throw e;
      // uma conta que nunca confirmou o e-mail (há mais de 30 min) não segura o endereço: dá lugar à nova
      const old = await readAcc(eid); if (!(old && old.rec.verif && Date.now() - Date.parse(old.rec.criado || 0) > 30 * 60e3)) throw N.err('existe', 'Já existe uma conta com este e-mail. Entra com a tua senha.', 409);
      await dropData(old.rec.uid); await N.store().put('a/' + eid, N.seal(await N.accKey(), rec)); }
    if (vc && !(await sendCode(email, nome, vc))) { delete rec.verif; await N.store().put('a/' + eid, N.seal(await N.accKey(), rec)); }
    return { token: await N.signToken(rec, eid), conta: pub(rec), recuperacao: code, verificar: rec.verif ? 1 : 0 }; },
  // confirmar o e-mail com o código de 6 números
  async verificarEmail(req, b) { const s = await session(req), v = s.rec.verif; if (!v) return { conta: pub(s.rec) };
    if (v.n >= 6) throw N.err('tentativas', 'Muitas tentativas erradas: pede um código novo.', 429);
    if (Date.now() > v.exp) throw N.err('expirou', 'O código expirou: pede um código novo.', 400);
    const ok = /^\d{6}$/.test(String(b.codigo || '')) && await N.checkPw(String(b.codigo), v.h);
    if (!ok) { await change(s.eid, r => { if (r.verif) r.verif.n = (r.verif.n || 0) + 1; }); throw N.err('codigo', 'Esse código não está certo.', 400); }
    const rec = await change(s.eid, r => { delete r.verif; r.emailOk = new Date().toISOString(); }); return { conta: pub(rec) }; },
  // enviar outra vez (no máximo um por minuto e 6 por hora)
  async reenviarCodigo(req) { const s = await session(req), v = s.rec.verif; if (!v) return { conta: pub(s.rec) };
    if (Date.now() - (v.env || 0) < 60e3) throw N.err('cedo', 'Espera um minuto antes de pedir outro código.', 429);
    if ((v.envs || 0) >= 6 && Date.now() - (v.env || 0) < 3600e3) throw N.err('limite', 'Já pedimos muitos códigos. Tenta daqui a uma hora.', 429);
    const vc = code6(); if (!(await sendCode(s.rec.email, s.rec.nome, vc))) throw N.err('envio', 'Não consegui enviar o e-mail agora. Tenta daqui a pouco.', 502);
    const h = await N.hashPw(vc), rec = await change(s.eid, r => { r.verif = { h, exp: Date.now() + 30 * 60e3, n: 0, env: Date.now(), envs: ((r.verif && r.verif.envs) || 0) + 1 }; }); return { conta: pub(rec), enviado: 1 }; },

  async entrar(req, b) {
    if (N.limit(req, 'entrar', 30, 600e3)) throw N.err('limite', 'Muitas tentativas. Espera uns minutos.', 429);
    const email = N.normEmail(b.email), eid = await N.emailId(email), a = await readAcc(eid);
    if (!a) { await N.hashPw('x'); throw N.err('credenciais', 'E-mail ou senha errados.', 401); }
    if (a.rec.bloq > Date.now()) throw N.err('bloqueada', `Muitas tentativas erradas. Tenta daqui a ${Math.ceil((a.rec.bloq - Date.now()) / 60000)} min.`, 429);
    if (!(await N.checkPw(String(b.senha || ''), a.rec.pw))) {
      await change(eid, r => { r.falhas = (r.falhas || 0) + 1; if (r.falhas >= 8) { r.bloq = Date.now() + 15 * 60e3; r.falhas = 0; } }).catch(() => { });
      throw N.err('credenciais', 'E-mail ou senha errados.', 401); }
    const rec = await change(eid, r => { r.falhas = 0; r.bloq = 0; r.ult = Date.now(); r.logins = (r.logins || 0) + 1; }).catch(() => a.rec);
    return { token: await N.signToken(rec, eid), conta: pub(rec) }; },

  async eu(req) { const s = await session(req), sp = await spOk(s.rec.email); let rec = s.rec; try { rec = await refreshPlano(s) || rec; } catch (e) { } return { conta: Object.assign(pub(rec), { sp, spc: sp ? spCid() : '' }) }; },

  /* ---------- planos e cobrança (Stripe) ---------- */
  // os planos e os preços (público: a página Planos mostra-os mesmo antes de entrar)
  async planos() { return { planos: P.planos().map(p => ({ id: p.id, n: p.n, lvl: p.lvl, ia: p.ia, perfis: p.perfis, precos: p.precos })), cobranca: P.cobranca(), testeDias: P.TESTE_DIAS() }; },
  // assinar: abre o pagamento do Stripe (cartão, Apple Pay, Google Pay…) e volta ao Prumo
  async checkout(req, b) { const s = await session(req); if (!P.cobranca()) throw N.err('cobranca', 'As assinaturas ainda não estão abertas.', 503);
    const pl = P.byId(b.plano), ciclo = b.ciclo === 'ano' ? 'ano' : 'mes', cur = b.cur === 'BRL' ? 'BRL' : 'EUR'; if (!pl) throw N.err('plano', 'Plano desconhecido.', 400);
    const e = P.efetivo(s.rec); if (e.pago) throw N.err('ja', 'Já tens uma assinatura: muda de plano na página Planos.', 409);
    if (N.limit(req, 'checkout|' + s.rec.uid, 20, 3600e3)) throw N.err('limite', 'Muitos pedidos. Tenta daqui a pouco.', 429);
    const volta = voltaDe(req, b.volta), prod = await produto(pl.id), cus = s.rec.plano && s.rec.plano.cus;
    const ses = await P.stripe('checkout/sessions', Object.assign({ mode: 'subscription', client_reference_id: s.rec.uid, success_url: volta + '#planos?ok={CHECKOUT_SESSION_ID}', cancel_url: volta + '#planos', allow_promotion_codes: 'true', locale: cur === 'BRL' ? 'pt-BR' : 'pt',
      line_items: { 0: { quantity: 1, price_data: { currency: cur.toLowerCase(), unit_amount: pl.precos[cur][ciclo], recurring: { interval: ciclo === 'ano' ? 'year' : 'month' }, product: prod } } },
      metadata: { uid: s.rec.uid, plano: pl.id, ciclo }, subscription_data: { metadata: { uid: s.rec.uid, plano: pl.id, ciclo } } }, cus ? { customer: cus } : { customer_email: s.rec.email }));
    return { url: ses.url }; },
  // de volta do Stripe: confirma no Stripe (não confia na app) e guarda a assinatura na conta
  async confirmar(req, b) { const s = await session(req); if (!P.cobranca()) throw N.err('cobranca', 'As assinaturas ainda não estão abertas.', 503);
    if (!/^cs_[A-Za-z0-9_]{6,200}$/.test(String(b.sid || ''))) throw N.err('sessao_pag', 'Pagamento desconhecido.', 400);
    const ses = await P.stripe('checkout/sessions/' + b.sid, { expand: { 0: 'subscription' } }, 'GET');
    if (ses.client_reference_id !== s.rec.uid) throw N.err('outra', 'Este pagamento não é desta conta.', 403);
    if (ses.status !== 'complete' || !ses.subscription || typeof ses.subscription !== 'object') throw N.err('pendente', 'O pagamento ainda não foi concluído.', 409);
    const st = P.doStripe(ses.subscription); st.id = st.id || (ses.metadata || {}).plano; st.ciclo = st.ciclo || (ses.metadata || {}).ciclo || 'mes';
    const rec = await change(s.eid, r => { r.plano = st; }); return { conta: pub(rec) }; },
  // mudar de plano ou de ciclo (com a diferença acertada pelo Stripe)
  async mudarPlano(req, b) { const s = await session(req), p0 = s.rec.plano; if (!P.cobranca() || !p0 || !p0.sub) throw N.err('sem', 'Ainda não tens assinatura.', 400);
    const pl = P.byId(b.plano), ciclo = b.ciclo === 'ano' ? 'ano' : b.ciclo === 'mes' ? 'mes' : p0.ciclo || 'mes', cur = p0.cur === 'BRL' ? 'BRL' : 'EUR'; if (!pl) throw N.err('plano', 'Plano desconhecido.', 400);
    const sub = await P.stripe('subscriptions/' + p0.sub, null, 'GET'), item = ((sub.items || {}).data || [])[0]; if (!item) throw N.err('stripe', 'Assinatura sem itens.', 502);
    const up = await P.stripe('subscriptions/' + p0.sub, { cancel_at_period_end: 'false', proration_behavior: 'create_prorations', metadata: { uid: s.rec.uid, plano: pl.id, ciclo },
      items: { 0: { id: item.id, price_data: { currency: cur.toLowerCase(), unit_amount: pl.precos[cur][ciclo], recurring: { interval: ciclo === 'ano' ? 'year' : 'month' }, product: await produto(pl.id) } } } });
    const st = Object.assign(P.doStripe(up), { id: pl.id, ciclo }); const rec = await change(s.eid, r => { r.plano = st; }); return { conta: pub(rec) }; },
  // cancelar: continua até ao fim do período já pago; retomar desfaz
  async cancelarPlano(req, b) { return fimPlano(req, true); },
  async retomarPlano(req, b) { return fimPlano(req, false); },
  // gerir o cartão e ver as faturas (portal do Stripe; precisa de estar ativado no painel do Stripe)
  async portal(req, b) { const s = await session(req), cus = s.rec.plano && s.rec.plano.cus; if (!P.cobranca() || !cus) throw N.err('sem', 'Ainda não tens assinatura.', 400);
    try { const ps = await P.stripe('billing_portal/sessions', { customer: cus, return_url: voltaDe(req, b.volta) + '#planos' }); return { url: ps.url }; }
    catch (e) { throw N.err('portal', 'A gestão de pagamentos ainda não está ativa. Fala com a administração.', 503); } },
  // a administração dá um plano (oferta), por um tempo ou sem fim; vazio tira a oferta
  async adminPlano(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403); await needPw(s0.rec, b.senha);
    const email = N.normEmail(b.email), eid = await N.emailId(email), a = await readAcc(eid); if (!a) throw N.err('conta', 'Essa conta não existe.', 404);
    const pl = b.plano ? P.byId(b.plano) : null; if (b.plano && !pl) throw N.err('plano', 'Plano desconhecido.', 400); const dias = Math.max(0, Math.min(3650, +b.dias || 0));
    await change(eid, r => { if (pl) r.planoAdm = { id: pl.id, ate: dias ? Date.now() + dias * P.DIA : 0, at: Date.now() }; else delete r.planoAdm; if (pl) aviso(r, { t: 'plano', p: pl.n, d: dias }); });
    return { email, plano: pl ? pl.id : '', dias }; },
  // contas que já existiam (ou termos novos): aceitar uma vez
  async termos(req, b) { const s = await session(req), t = termsOf(b); const rec = await change(s.eid, r => { r.termos = t; }); return { conta: pub(rec) }; },
  // quem é o responsável e como contactar (para a Política de Privacidade); sem sessão
  async publico() { return { responsavel: String(process.env.NAUTILO_RESPONSAVEL || '').slice(0, 120), contacto: String(process.env.NAUTILO_CONTACTO || '').slice(0, 120) }; },
  // pedidos dos titulares (LGPD art. 18 / RGPD art. 15–22): ficam cifrados para a administração responder
  async pedido(req, b) { const s = await session(req); if (N.limit(req, 'pedido|' + s.rec.uid, 5, 864e5)) throw N.err('limite', 'Já fizeste vários pedidos hoje. Responderemos a todos.', 429);
    const TIPOS = ['confirmar', 'acesso', 'corrigir', 'eliminar', 'portabilidade', 'partilha', 'revogar', 'oposicao', 'outro'], tipo = TIPOS.includes(b.tipo) ? b.tipo : 'outro';
    const id = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + N.crypto.randomBytes(3).toString('hex');
    await N.store().put('p/' + id, N.seal(await N.accKey(), { id, uid: s.rec.uid, email: s.rec.email, nome: s.rec.nome || '', tipo, msg: String(b.msg || '').slice(0, 3000), at: new Date().toISOString(), estado: 'novo' }), { overwrite: false });
    return { protocolo: id }; },
  async pedidoFeito(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403); const id = String(b.id || ''); if (!/^\d{14}-[a-f0-9]{6}$/.test(id)) throw N.err('id', 'Pedido desconhecido.', 400);
    const st = N.store(), key = await N.accKey(), g = await st.get('p/' + id); if (!g) throw N.err('id', 'Pedido desconhecido.', 404); const p = N.open(key, g.buf);
    p.estado = b.estado === 'novo' ? 'novo' : 'respondido'; p.feito = new Date().toISOString(); await st.put('p/' + id, N.seal(key, p), { ifMatch: g.etag }); return { pedido: p }; },

  // criar, editar ou apagar um perfil (apagar pede a senha da conta e apaga os dados desse perfil)
  async perfil(req, b) { const s = await session(req), acao = b.acao; let made = null;
    if (acao === 'apagar') { await needPw(s.rec, b.senha); if (!(s.rec.perfis || []).some(p => p.id === b.id)) throw N.err('perfil', 'Esse perfil já não existe.', 404); }
    const rec = await change(s.eid, r => { r.perfis = r.perfis || [];
      if (acao === 'criar') { const ef = P.efetivo(r); if (!ef.lvl) throw N.err('plano', 'O teu teste grátis acabou: escolhe um plano em Planos para continuar.', 402);
        if (r.perfis.length >= Math.min(MAXP, ef.perfis || MAXP)) throw N.err('maximo', ef.perfis < MAXP ? `O teu plano (${ef.n}) tem até ${ef.perfis} ${ef.perfis === 1 ? 'perfil' : 'perfis'}. Para mais, muda de plano em Planos.` : `Cada conta pode ter até ${MAXP} perfis.`, 402);
        const p = cleanProfile(b.perfil || {}, { id: N.crypto.randomBytes(6).toString('hex'), cor: COLORS[r.perfis.length % COLORS.length], criado: new Date().toISOString() });
        if (!p.nome) throw N.err('nome', 'Dá um nome ao perfil.', 400); if (!p.lk) throw N.err('codigo', 'Escolhe o código de bloqueio do perfil.', 400);
        r.perfis.push(p); made = p; return; }
      const i = r.perfis.findIndex(p => p.id === b.id); if (i < 0) throw N.err('perfil', 'Esse perfil já não existe.', 404);
      if (acao === 'editar') { const p = cleanProfile(b.perfil || {}, r.perfis[i]); if (!p.nome) throw N.err('nome', 'Dá um nome ao perfil.', 400); r.perfis[i] = p; made = p; return; }
      if (acao === 'apagar') { r.perfis.splice(i, 1); return; }
      throw N.err('acao', 'Ação desconhecida.', 400); });
    if (acao === 'apagar') await dropData(rec.uid, b.id);
    return { conta: pub(rec), perfil: made }; },

  // esqueci o código de bloqueio do perfil: com a senha da conta escolhes outro
  async codigo(req, b) { const s = await session(req); await needPw(s.rec, b.senha);
    if (!/^[a-f0-9]{64}$/.test(b.lk || '')) throw N.err('codigo', 'Código inválido.', 400);
    const rec = await change(s.eid, r => { const p = (r.perfis || []).find(x => x.id === b.id); if (!p) throw N.err('perfil', 'Esse perfil já não existe.', 404); p.lk = b.lk; p.pin = +b.pin === 6 ? 6 : 0; });
    return { conta: pub(rec) }; },

  async senha(req, b) { const s = await session(req); await needPw(s.rec, b.atual); const nova = String(b.nova || '');
    if (nova.length < 8) throw N.err('senha', 'A nova senha precisa de pelo menos 8 caracteres.', 400);
    const pw = await N.hashPw(nova), rec = await change(s.eid, r => { r.pw = pw; r.tv = (r.tv || 1) + 1; });
    return { token: await N.signToken(rec, s.eid), conta: pub(rec) }; },

  // depois de o administrador repor a senha: a pessoa entra com a temporária e escolhe aqui a sua (só enquanto "trocar" estiver ligado)
  async senhaTroca(req, b) { const s = await session(req); if (!s.rec.trocar) throw N.err('senha', 'Para mudar a senha usa Definições › Conta.', 400); const nova = String(b.nova || '');
    if (nova.length < 8) throw N.err('senha', 'A nova senha precisa de pelo menos 8 caracteres.', 400); if (nova.length > 200) throw N.err('senha', 'A senha é longa demais.', 400);
    const pw = await N.hashPw(nova), rec = await change(s.eid, r => { r.pw = pw; r.tv = (r.tv || 1) + 1; delete r.trocar; });
    return { token: await N.signToken(rec, s.eid), conta: pub(rec) }; },

  async recuperar(req, b) {
    if (N.limit(req, 'recuperar', 10, 3600e3)) throw N.err('limite', 'Muitas tentativas. Tenta mais tarde.', 429);
    const email = N.normEmail(b.email), eid = await N.emailId(email), a = await readAcc(eid), nova = String(b.nova || '');
    if (nova.length < 8) throw N.err('senha', 'A nova senha precisa de pelo menos 8 caracteres.', 400);
    if (!a) { await N.hashPw('x'); throw N.err('credenciais', 'E-mail ou código de recuperação errados.', 401); }
    if (a.rec.bloq > Date.now()) throw N.err('bloqueada', `Muitas tentativas erradas. Tenta daqui a ${Math.ceil((a.rec.bloq - Date.now()) / 60000)} min.`, 429);
    if (!(await N.checkPw(N.normCode(b.codigo), a.rec.rc))) { await change(eid, r => { r.falhas = (r.falhas || 0) + 1; if (r.falhas >= 8) { r.bloq = Date.now() + 15 * 60e3; r.falhas = 0; } }).catch(() => { }); throw N.err('credenciais', 'E-mail ou código de recuperação errados.', 401); }
    const code = N.newCode(), pw = await N.hashPw(nova), rc = await N.hashPw(N.normCode(code));
    const rec = await change(eid, r => { r.pw = pw; r.rc = rc; r.tv = (r.tv || 1) + 1; r.falhas = 0; r.bloq = 0; });
    return { token: await N.signToken(rec, eid), conta: pub(rec), recuperacao: code }; },

  async novocodigo(req, b) { const s = await session(req); await needPw(s.rec, b.senha); const code = N.newCode(), rc = await N.hashPw(N.normCode(code));
    await change(s.eid, r => { r.rc = rc; }); return { recuperacao: code }; },

  async sairtodos(req) { const s = await session(req); const rec = await change(s.eid, r => { r.tv = (r.tv || 1) + 1; }); return { token: await N.signToken(rec, s.eid) }; },

  // chave do atalho de gastos do iPhone para este perfil (nova = a antiga deixa de funcionar)
  async atalho(req, b) { const s = await session(req); let n = '';
    const rec = await change(s.eid, r => { const p = (r.perfis || []).find(x => x.id === b.id); if (!p) throw N.err('perfil', 'Esse perfil já não existe.', 404);
      if (p.ak && !b.nova) { n = p.ak; return false; } p.ak = n = N.crypto.randomBytes(6).toString('hex'); });
    return { chave: await N.atalhoKey(s.eid, b.id, n) }; },

  // tempo de uso: a app manda os minutos que esteve aberta e visível (por dia); fica num ficheiro à parte da conta
  async uso(req, b) { const t = await N.readToken(req); if (!t) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
    const min = Math.max(0, Math.min(30, Math.round(Number(b.min) || 0))), day = /^\d{4}-\d{2}-\d{2}$/.test(b.dia || '') ? b.dia : new Date().toISOString().slice(0, 10), s = N.store(), p = 'u/' + t.u, key = await N.accKey();
    for (let i = 0; i < 4; i++) { const g = await s.get(p); let u = { dias: {}, ult: 0, a: t.a }; try { if (g) u = N.open(key, g.buf); } catch (e) { }
      u.dias = u.dias || {}; if (u.tot == null) u.tot = Object.values(u.dias).reduce((a, x) => a + (Number(x) || 0), 0);
      u.dias[day] = (u.dias[day] || 0) + min; u.tot += min; u.ult = Date.now(); u.a = t.a;
      // presença: "abrir" marca a entrada no app; "fim" quando a app sai do ecrã; o resto é sinal de que está a ser usada
      if (b.ev === 'abrir') u.ab = u.ult; u.on = b.ev === 'fim' ? 0 : 1;
      // tempo de uso de cada perfil (para o ranking); o primeiro perfil herda o histórico que já havia
      const pf = typeof b.pf === 'string' && /^[a-z0-9_-]{1,40}$/i.test(b.pf) ? b.pf : ''; u.pf = u.pf && typeof u.pf === 'object' ? u.pf : {};
      if (pf && (pf in u.pf || Object.keys(u.pf).length < 12)) { if (u.pf[pf] == null) u.pf[pf] = Object.keys(u.pf).length ? 0 : u.tot - min; u.pf[pf] += min; }
      const ks = Object.keys(u.dias).sort(); ks.slice(0, Math.max(0, ks.length - 90)).forEach(k => delete u.dias[k]);
      try { await s.put(p, N.seal(key, u), g ? { ifMatch: g.etag } : { overwrite: false }); return { ok2: true }; } catch (e) { if (e.code !== 'conflict' && e.code !== 'exists') throw e; await N.sleep(60 + Math.random() * 150); } }
    return { ok2: false }; },

  // o separador de administração aberto pergunta isto a cada 20 s: só a presença e o uso (sem reler as contas)
  async adminVivo(req) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403);
    if (N.limit(req, 'admv|' + s0.rec.uid, 400, 3600e3)) throw N.err('limite', 'Muitos pedidos. Tenta daqui a pouco.', 429);
    const s = N.store(), key = await N.accKey(), Us = await s.list('u/'), vivo = {};
    let i = 0; await Promise.all(Array.from({ length: Math.min(16, Us.length) }, async () => { while (i < Us.length) { const x = Us[i++]; try { const g = await s.get(x.pathname); if (!g) continue; const u = N.open(key, g.buf);
      vivo[x.pathname.slice(2)] = { ultUso: u.ult || 0, ab: u.ab || 0, online: online(u), tot: totOf(u), dias: u.dias || {} }; } catch (e) { } } }));
    return { vivo, at: Date.now() }; },

  // separador de administração (só para quem está em NAUTILO_ADMIN): quem tem conta, quem entrou, quanto usa. Nunca mostra senhas nem dados.
  async admin(req) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403);
    const s = N.store(), key = await N.accKey(), [A, Us] = await Promise.all([s.list('a/'), s.list('u/')]);
    // lê aos poucos (16 de cada vez) para aguentar milhares de contas sem estourar a base de dados
    const pool = async (L, f) => { let i = 0; await Promise.all(Array.from({ length: Math.min(16, L.length) }, async () => { while (i < L.length) { const x = L[i++]; try { await f(x); } catch (e) { } } })); };
    const uso = {}; await pool(Us, async x => { const g = await s.get(x.pathname); if (g) uso[x.pathname.slice(2)] = N.open(key, g.buf); });
    const contas = []; await pool(A, async x => { const g = await s.get(x.pathname); if (!g) return; const r = N.open(key, g.buf), u = uso[r.uid] || { dias: {} };
      contas.push({ uid: r.uid, email: r.email, nome: r.nome || '', criado: r.criado, perfis: (r.perfis || []).map(p => p.nome), pids: (r.perfis || []).map(p => p.id), plano: planoPub(r), ultEntrada: Math.max(u.ab || 0, r.ult || 0), login: r.ult || 0, entradas: r.logins || 0, ultUso: u.ult || 0, online: online(u), tot: totOf(u), dias: u.dias || {}, admin: isAdmin(r.email), termos: (r.termos || {}).v || '', termosAt: (r.termos || {}).at || '' }); });
    // contas de teste (@nautilo.test, domínio reservado aos testes) com mais de 3 horas: apagam-se sozinhas
    const velhas = contas.filter(c => TESTE.test(c.email) && c.criado && Date.now() - new Date(c.criado).getTime() > 3 * 36e5);
    for (const c of velhas) { try { const eid = await N.emailId(c.email); await dropData(c.uid); await s.del([{ pathname: 'a/' + eid }, { pathname: 'u/' + c.uid }]); contas.splice(contas.indexOf(c), 1); RK.rows = null; } catch (e) { } }
    contas.sort((a, b) => Math.max(b.ultUso, b.ultEntrada) - Math.max(a.ultUso, a.ultEntrada));
    const P = await s.list('p/'), pedidos = []; await pool(P.slice(-300), async x => { const g = await s.get(x.pathname); if (g) pedidos.push(N.open(key, g.buf)); });
    pedidos.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const sl = await spList(); contas.forEach(c => { c.sp = c.admin || sl.includes(N.normEmail(c.email)); });
    return { contas, total: contas.length, perfis: contas.reduce((n, c) => n + c.perfis.length, 0), pedidos, spotify: sl, spMax: SP_MAX, spConf: !!spCid() }; },

  // v3.20: o administrador repõe o cofre de Senhas de uma conta (também a dele) quando a senha mestra se perdeu.
  // O cofre está cifrado no aparelho com a senha mestra, que ninguém conhece: não dá para a mudar sem ela, por isso o cofre fica vazio
  // e a pessoa cria uma senha mestra nova na próxima vez (as senhas que lá estavam perdem-se: era isso que as protegia).
  async adminCofre(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403); await needPw(s0.rec, b.senha);
    const email = N.normEmail(b.email); if (!email) throw N.err('email', 'Falta o e-mail da conta.', 400);
    const eid = await N.emailId(email), a = await readAcc(eid); if (!a) throw N.err('conta', 'Essa conta já não existe.', 404);
    const L = (a.rec.perfis || []).filter(p => !b.pid || p.id === b.pid); if (!L.length) throw N.err('perfil', 'Esse perfil já não existe.', 404);
    const st = N.store(), key = await N.userKey(a.rec.uid), now = Date.now();
    for (const p of L) { await st.put('d/' + a.rec.uid + '/' + p.id + '/one~vault', N.seal(key, { t: now, data: { reset: now } })); await st.put('m/' + a.rec.uid + '/' + p.id, Buffer.from(String(now))); }
    if (email !== N.normEmail(s0.rec.email)) await change(eid, r => { aviso(r, { t: 'cofre' }); });
    return { email, perfis: L.map(p => p.nome) }; },

  // o administrador apaga a conta de outra pessoa (com a sua própria senha; não dá para apagar a própria conta por aqui nem outra conta de administrador)
  async adminApagar(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403); await needPw(s0.rec, b.senha);
    const email = N.normEmail(b.email); if (!email) throw N.err('email', 'Falta o e-mail da conta.', 400);
    if (email === N.normEmail(s0.rec.email)) throw N.err('propria', 'A tua própria conta apaga-se em Definições › Conta.', 400);
    if (isAdmin(email)) throw N.err('admin', 'Não dá para apagar outra conta de administrador.', 403);
    const eid = await N.emailId(email), a = await readAcc(eid); if (!a) throw N.err('conta', 'Essa conta já não existe.', 404);
    await dropData(a.rec.uid); await N.store().del([{ pathname: 'a/' + eid }, { pathname: 'u/' + a.rec.uid }]); RK.rows = null;
    const sl = await spList(); if (sl.includes(email)) { await N.store().put(SPK, N.seal(await N.accKey(), { emails: sl.filter(x => x !== email), at: Date.now() })); SPC.at = 0; }
    return { apagada: true, email }; },

  // v2.97 · o administrador repõe a senha de login de outra pessoa (com a sua própria senha). A pessoa entra com a senha temporária e tem logo de escolher outra;
  // as sessões dela terminam e ela vê um aviso ao entrar. Os dados não mudam (a chave da conta não depende da senha) e o cofre de Senhas também não
  // (está cifrado no aparelho dela com a senha mestra, que ninguém conhece).
  async adminSenha(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403); await needPw(s0.rec, b.senha);
    const email = N.normEmail(b.email); if (!email) throw N.err('email', 'Falta o e-mail da conta.', 400);
    if (email === N.normEmail(s0.rec.email)) throw N.err('propria', 'A tua própria senha muda-se em Definições › Conta.', 400);
    if (isAdmin(email)) throw N.err('admin', 'Não dá para repor a senha de outra conta de administrador.', 403);
    let nova = String(b.nova || '').trim(); const gerada = !nova; if (gerada) nova = tempPw();
    if (nova.length < 8 || nova.length > 200) throw N.err('senha', 'A senha temporária precisa de 8 a 200 caracteres.', 400);
    const eid = await N.emailId(email), pw = await N.hashPw(nova);
    await change(eid, r => { r.pw = pw; r.tv = (r.tv || 1) + 1; r.trocar = 1; r.falhas = 0; r.bloq = 0; aviso(r, { t: 'senha' }); });
    return { email, temporaria: nova, gerada }; },

  // v2.97 · o administrador muda o e-mail de uma conta: a conta passa inteira para o novo e-mail (perfis, dados, ranking, Google, atalhos), nada se perde.
  // A conta fica guardada pelo novo e-mail; as sessões terminam e a pessoa entra com o novo e-mail e a mesma senha.
  async adminEmail(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403); await needPw(s0.rec, b.senha);
    const de = N.normEmail(b.email), para = N.normEmail(b.novo);
    if (!de) throw N.err('email', 'Falta o e-mail da conta.', 400); if (!EMAIL.test(para)) throw N.err('email', 'O novo e-mail não parece válido.', 400);
    if (de === para) throw N.err('email', 'O novo e-mail é igual ao atual.', 400);
    if (de === N.normEmail(s0.rec.email) || isAdmin(de)) throw N.err('admin', 'O e-mail de uma conta de administrador não se muda por aqui.', 403);
    if (isAdmin(para)) throw N.err('admin', 'Esse e-mail é de administrador.', 403);
    const e0 = await N.emailId(de), e1 = await N.emailId(para), a = await readFresh(e0); if (!a) throw N.err('conta', 'Essa conta já não existe.', 404);
    const rec = Object.assign({}, a.rec, { email: para, tv: (a.rec.tv || 1) + 1 }); aviso(rec, { t: 'email', de });
    try { await writeAcc(e1, rec); } catch (e) { if (e.code === 'exists') throw N.err('existe', 'Já existe uma conta com esse e-mail.', 409); throw e; }
    const s = N.store(), key = await N.accKey();
    // os atalhos do iPhone têm o id antigo dentro da chave: ficam a apontar para a conta nova
    await s.put('x/' + e0, N.seal(key, { to: e1, at: Date.now() })).catch(() => { });
    await s.del([{ pathname: 'a/' + e0 }]);
    const sl = await spList(); if (sl.includes(de)) { await s.put(SPK, N.seal(key, { emails: sl.map(x => x === de ? para : x), at: Date.now() })); SPC.at = 0; }
    RK.rows = null; return { email: para, de }; },

  // a app manda a pontuação dos últimos dias deste perfil (só dos últimos 8 dias: o passado não se muda)
  async rank(req, b) { const s = await session(req), p = (s.rec.perfis || []).find(x => x.id === b.id); if (!p) throw N.err('perfil', 'Esse perfil já não existe.', 404);
    if (N.limit(req, 'rank|' + s.rec.uid, 240, 3600e3)) throw N.err('limite', 'Muitos pedidos. Tenta daqui a pouco.', 429);
    const st = N.store(), key = await N.accKey(), path = 'r/' + s.rec.uid + '/' + p.id, today = isoDay(Date.now()), lo = addD(today, -8), hi = addD(today, 1);
    for (let i = 0; i < 4; i++) { const g = await st.get(path); let r = { d: {} }; try { if (g) r = N.open(key, g.buf); } catch (e) { }
      r.d = r.d || {}; Object.keys(r.d).forEach(k => { if (k < DESDE()) delete r.d[k]; });
      Object.entries(b.dias || {}).forEach(([d, v]) => { const n = Math.round(Number(v)); if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= lo && d >= DESDE() && d <= hi && n >= 0 && n <= 100) r.d[d] = n; });
      r.im = typeof b.im === 'string' && b.im.length <= 12000 && IMG.test(b.im) ? b.im : '';
      const ks = Object.keys(r.d).sort(); ks.slice(0, Math.max(0, ks.length - 400)).forEach(k => delete r.d[k]);
      Object.assign(r, { n: p.nome || '', c: p.cor || '', av: p.av || '', anon: !!b.anon, at: Date.now(), t: TESTE.test(s.rec.email) ? 1 : 0, b: bestOf(r.d) });
      // tempo total de uso deste perfil (só para mostrar; não entra nos pontos)
      try { const ug = await st.get('u/' + s.rec.uid); if (ug) { const u = N.open(key, ug.buf), pf = u.pf || {}; r.tm = pf[p.id] != null ? pf[p.id] : (s.rec.perfis || []).length <= 1 ? totOf(u) : 0; } } catch (e) { }
      try { await st.put(path, N.seal(key, r), g ? { ifMatch: g.etag } : { overwrite: false });
        if (RK.rows) { const k = RK.rows.findIndex(x => x.path === path); const nr = Object.assign({}, r, { path }); if (k >= 0) RK.rows[k] = nr; else RK.rows.push(nr); }
        return { eu: rowOut(r, today, true) }; } catch (e) { if (e.code !== 'conflict' && e.code !== 'exists') throw e; await N.sleep(60 + Math.random() * 150); } }
    return { eu: null }; },

  // o ranking de todos os perfis de todas as contas (as contas de teste não aparecem); só leitura
  async ranking(req, b) { const s = await session(req), mine = 'r/' + s.rec.uid + '/' + String(b.id || ''), today = isoDay(Date.now());
    // v3.16: aparecem todos os perfis (quem ainda está a zero fica no fim da lista, na app)
    const lista = (await rankRows()).filter(r => !r.t || r.path === mine).map(r => rowOut(r, today, r.path === mine));
    return { lista, foco: FOCO, hoje: today }; },

  // o administrador escolhe quem pode usar o Spotify (ele e mais até SP_MAX contas): o Spotify só deixa 5 contas por app
  async adminSpotify(req, b) { const s0 = await session(req); if (!isAdmin(s0.rec.email)) throw N.err('admin', 'Sem acesso.', 403);
    let L = await spList(); const email = N.normEmail(b.email);
    if (email && !isAdmin(email)) { if (b.on) { if (!L.includes(email)) { if (L.length >= SP_MAX) throw N.err('cheio', `Já há ${SP_MAX} contas com o Spotify. Tira uma antes de dar a outra.`, 400); if (!(await readAcc(await N.emailId(email)))) throw N.err('conta', 'Essa conta não existe.', 404); L = L.concat(email); } } else L = L.filter(x => x !== email);
      await N.store().put(SPK, N.seal(await N.accKey(), { emails: L, at: Date.now() })); SPC.at = 0; }
    return { emails: L, max: SP_MAX }; },

  async nome(req, b) { const s = await session(req); const rec = await change(s.eid, r => { r.nome = cleanName(b.nome, 40); }); return { conta: pub(rec) }; },

  async apagar(req, b) { const s = await session(req); await needPw(s.rec, b.senha);
    await dropData(s.rec.uid); await N.store().del([{ pathname: 'a/' + s.eid }, { pathname: 'u/' + s.rec.uid }]);
    const sl = await spList(), me = N.normEmail(s.rec.email); if (sl.includes(me)) { await N.store().put(SPK, N.seal(await N.accKey(), { emails: sl.filter(x => x !== me), at: Date.now() })); SPC.at = 0; }
    return { apagada: true }; }
};

module.exports = N.handler(async (req, res) => {
  if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  const b = await N.body(req), op = OPS[b.op]; req._op = String(b.op || '');
  if (!op || !Object.prototype.hasOwnProperty.call(OPS, b.op)) return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
  N.send(res, 200, Object.assign({ ok: true }, await op(req, b)));
});
