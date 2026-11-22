/* PRUMO — contas e perfis (a versão para o público).
   Modo pessoal: os aparelhos que já tinham o Prumo (o do Ryan) continuam exatamente iguais: o mesmo código, o mesmo Google Drive.
   Modo conta: entras com e-mail e senha, escolhes o perfil (como na Netflix) e os dados desse perfil ficam na nuvem do Prumo
   (Vercel Blob privado, cifrado) e iguais no telemóvel e no computador. O ecrã de bloqueio é o mesmo, com o código de cada perfil.
   O motor de dados (core.js) fala com uma "base de dados" com collection().onSnapshot() e doc().set(); aqui essa base é api/dados. */
(() => {
'use strict';
const U = OS.U, esc = U.esc;
const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } },
  keys: () => { try { return Object.keys(localStorage); } catch (e) { return []; } } };
const K = { s: 'nau:s', p: 'nau:p', data: 'nau:pd', owner: 'nau:owner', pers: 'nau:pessoal', reset: 'nau:lkreset' };
/* ---------- código de 6 números com casinhas (contas gerais): um só campo numérico por baixo das 6 casas ----------
   Só aceita números e abre o teclado numérico; cada número acende a casa seguinte. No ecrã do código entra sozinho ao 6.º número. */
const PinC = OS.Pin = {
  html: (name, label, o = {}) => `<label class="pin${o.cls ? ' ' + o.cls : ''}">${label ? `<span class="pin-l">${label}</span>` : ''}<span class="pin-w"><input class="pin-in" ${o.id ? `id="${o.id}"` : ''} name="${name}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="6" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore aria-label="${esc(o.aria || label || 'Código de 6 números')}"${o.auto ? ' data-pin-auto="1"' : ''}${o.req === false ? '' : ' required'}><span class="pin-bx" aria-hidden="true">${'<i></i>'.repeat(6)}</span></span></label>`,
  paint: i => { const w = i && i.closest('.pin-w'); if (!w) return; const n = i.value.length, f = document.activeElement === i; w.querySelectorAll('.pin-bx i').forEach((b, k) => { b.classList.toggle('on', k < n); b.classList.toggle('cur', f && (k === n || (n === 6 && k === 5))); }); },
  clear: i => { if (!i) return; i.value = ''; PinC.paint(i); const w = i.closest('.pin-w'); if (w) { w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); } },
  ok: v => /^\d{6}$/.test(String(v || '')) };
document.addEventListener('input', e => { const i = e.target; if (!i || !i.classList || !i.classList.contains('pin-in')) return;
  const v = i.value.replace(/\D/g, '').slice(0, 6); if (v !== i.value) i.value = v; PinC.paint(i);
  if (v.length === 6) { if (i.dataset.pinAuto) { const f = i.form; if (f) { if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); } }
    else { const L = i.form ? [...i.form.querySelectorAll('.pin-in')] : [], nx = L[L.indexOf(i) + 1]; if (nx && !nx.value) nx.focus(); } } }, true);
document.addEventListener('focusin', e => { if (e.target && e.target.classList && e.target.classList.contains('pin-in')) PinC.paint(e.target); });
document.addEventListener('focusout', e => { if (e.target && e.target.classList && e.target.classList.contains('pin-in')) setTimeout(() => PinC.paint(e.target), 0); });
// as setas e o apagar dentro do campo não mexem no cursor: o número entra sempre na casa seguinte
document.addEventListener('keydown', e => { const i = e.target; if (i && i.classList && i.classList.contains('pin-in') && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) e.preventDefault(); }, true);
const SALT = 'oceanum-v1|';
const sha = async s => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };

/* ---------- que modo é este aparelho ---------- */
if (/^#pessoal\b/.test(location.hash)) { LS.set(K.pers, 1); try { history.replaceState(null, '', location.pathname + '#visao'); } catch (e) { } }
let S = LS.get(K.s, null);
const hasLocal = LS.keys().some(k => k.startsWith('os2:'));
const accDevice = !!(S || LS.get(K.owner, ''));
const personal = !accDevice && !!(LS.get(K.pers, 0) || hasLocal || /ligar=/.test(location.hash) || LS.get('os2sync', 0));
/* ---------- pedidos ao servidor ---------- */
const api = async (path, opt = {}, tries = 3) => { let last = null;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch('api/' + path, Object.assign({ cache: 'no-store', credentials: 'omit' }, opt)); let j = null; try { j = await r.json(); } catch (e) { }
      if (j && j.ok) return j;
      const e = new Error((j && j.msg) || (r.status === 404 ? 'O servidor das contas não respondeu.' : r.status === 402 ? 'O servidor do Prumo está parado pela Vercel (limite do plano). Os teus dados continuam guardados neste aparelho e voltam a sincronizar quando o servidor voltar.' : 'Erro ' + r.status)); e.status = r.status; e.code = j && j.code;
      if (e.code === 'manutencao') { e.ate = j.ate; try { Acc.manut && Acc.manut.show(j.ate); } catch (x) { } throw e; }   /* v3.62 */
      if (r.status < 500 && r.status !== 429) throw e; last = e; }
    catch (e) { if (e.code === 'manutencao' || (e.status && e.status < 500 && e.status !== 429)) throw e; last = e.status ? e : Object.assign(new Error('Sem ligação à internet.'), { net: true }); }
    await new Promise(res => setTimeout(res, 600 * (i + 1))); }
  throw last; };
const conta = (op, body = {}) => api('conta', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, S ? { authorization: 'Bearer ' + S.t } : {}), body: JSON.stringify(Object.assign({ op }, body)) });
const saveS = () => { if (S) LS.set(K.s, S); else LS.del(K.s); };
const takeConta = (j, email) => { S = Object.assign(S || {}, { t: j.token || (S && S.t), e: (j.conta && j.conta.email) || email || (S && S.e), n: (j.conta && j.conta.nome) || '', perfis: (j.conta && j.conta.perfis) || [], adm: j.conta ? !!j.conta.adm : !!(S && S.adm), termos: j.conta ? j.conta.termos || '' : S && S.termos, termosAt: j.conta ? j.conta.termosAt || '' : S && S.termosAt, trocar: j.conta ? !!j.conta.trocar : !!(S && S.trocar), avisos: j.conta ? j.conta.avisos || [] : (S && S.avisos) || [], plano: j.conta && j.conta.plano ? j.conta.plano : (S && S.plano) || null, verificar: j.conta ? !!j.conta.verificar : !!(S && S.verificar) },
    // Spotify: só o administrador e as contas que ele escolheu (vem na resposta "eu")
    j.conta && 'sp' in j.conta ? { sp: !!j.conta.sp, spc: j.conta.spc || '' } : {}); saveS(); if (OS.Acc && OS.Acc.navAdm) OS.Acc.navAdm(); try { OS.Spot && OS.Spot.draw(); } catch (e) { } };

const Acc = OS.Acc = { on: !personal };
const A = OS.act = OS.act || {}; OS.forms = OS.forms || {};
if (personal) {
  /* ---------- modo pessoal: guardar este Prumo numa conta (o que é do Ryan vai para a conta dele) ---------- */
  const moved = () => OS.one('meta').acc || '';
  // cria (ou entra n)a conta, cria o perfil pessoal com o mesmo código de bloqueio e envia todos os dados deste aparelho
  Acc.migrate = async (email, senha, criar, termos) => { email = String(email || '').trim().toLowerCase();
    const j = await conta(criar ? 'registar' : 'entrar', criar ? Object.assign({ email, senha, nome: OS.one('profile').name || '' }, termos || {}) : { email, senha }); takeConta(j, email);
    if (j.recuperacao) LS.set('nau:rec', j.recuperacao); // mostrado uma vez, depois de abrir com a conta
    let p = (S.perfis || []).find(x => x.ps);
    if (!p) { const r = await conta('perfil', { acao: 'criar', perfil: { nome: String(OS.one('profile').short || 'Ryan').slice(0, 24), cor: '#7FA9DA', av: '', lk: OS.Lock.curHash(), ps: true } }); takeConta(r); p = r.perfil; }
    OS.setOne('meta', { acc: email });
    const now = Date.now(), docs = [], known = {};
    Object.keys(OS.D).forEach(c => { const by = {}; OS.all(c).forEach(r => { (by[r._s || 0] = by[r._s || 0] || []).push(r); }); Object.entries(by).forEach(([k, items]) => docs.push([c + '~' + k, { t: now, items }])); });
    Object.keys(OS.ONE).forEach(k => docs.push(['one~' + k, { t: now, data: OS.ONE[k] }]));
    let part = {}, n = 0, cnt = 0;
    const send = async () => { if (!cnt) return; const r = await api('dados', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.t }, body: JSON.stringify({ op: 'gravar', p: p.id, docs: part }) }); Object.assign(known, r.etags); part = {}; n = 0; cnt = 0; };
    for (const [id, d] of docs) { const sz = JSON.stringify(d).length; if (cnt && (n + sz > 1.5e6 || cnt >= 300)) await send(); part[id] = d; n += sz; cnt++; }
    await send();
    // os outros aparelhos ficam a saber pelo Google Drive (espera um pouco que o aviso lá chegue)
    for (let i = 0; i < 20 && OS.sync.status === 'busy'; i++) await new Promise(r => setTimeout(r, 200));
    LS.set(K.p, p.id); LS.set(K.data, p.id); LS.set(K.owner, email); LS.set('nau:k:' + p.id, known); LS.del(K.pers); LS.del('os2sync');
    return { perfil: p, docs: docs.length }; };
  const go = async criar => { const em = document.getElementById('accMigE'), pw = document.getElementById('accMigP'); if (!em || !pw) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) return OS.UI.toast('Escreve o teu e-mail.', 'warn');
    if (pw.value.length < 8) return OS.UI.toast('A senha precisa de pelo menos 8 caracteres.', 'warn');
    const tm = OS.Legal ? OS.Legal.read(document.getElementById('accMig')) : null; if (criar && !tm) return OS.UI.toast('Para criar a conta, marca as três caixas (termos, dados de saúde e de fé, idade).', 'warn');
    OS.UI.toast('A guardar o teu Prumo na conta…');
    try { const r = await Acc.migrate(em.value, pw.value, criar, tm); OS.UI.toast(`Guardado: ${r.docs} partes dos teus dados na conta. A abrir com a conta…`, 'pos'); setTimeout(() => location.reload(), 900); }
    catch (e) { OS.UI.toast(e.net ? 'Sem internet. Tenta outra vez.' : e.message, 'neg'); } };
  A.accMigNew = () => go(true); A.accMigIn = () => go(false);
  // noutro aparelho do Ryan: o Prumo já está na conta → entrar nela aqui (os dados vêm da conta)
  A.accJoin = () => { const em = moved(); if (!em) return; OS.UI.closeModal();
    if (!confirm(`Este aparelho passa a usar a conta ${em}. Os dados vêm da conta (o que mudaste só aqui e ainda não sincronizou pelo Google Drive perde-se). Continuar?`)) return;
    OS.noSave = true; LS.keys().forEach(k => { if (!/^(nau:|os2lite$|__)/.test(k)) LS.del(k); }); LS.set(K.owner, em); LS.del(K.pers); location.reload(); };
  A.accJoinLater = () => { LS.set('nau:joinAsk', Date.now()); OS.UI.closeModal(); };
  const panel = () => { const em = moved(), e = U.esc;
    return `<div class="pn" id="accMig"><div class="pn-h"><h3>${OS.UI.ic('user')}Conta Prumo</h3>${em ? `<span class="mut">${e(em)}</span>` : ''}</div>
    ${em ? `<p class="mut" style="margin:0 0 10px">O teu Prumo está guardado na conta <b>${e(em)}</b>. Este aparelho ainda usa o modo antigo (só neste aparelho e no Google Drive).</p><button class="btn pri" data-act="accJoin">Entrar na conta neste aparelho</button>`
    : `<p class="mut" style="margin:0 0 12px">Guarda o teu Prumo numa conta: tudo o que tens aqui (dados, metas, jogo, definições, ligações) vai para a tua conta, cifrado, com o mesmo código de bloqueio. Depois entras com e-mail e senha em qualquer aparelho e podes criar outros perfis.</p>
      <div class="col gap8"><label>E-mail<input class="field" id="accMigE" type="email" autocomplete="email"></label><label>Senha da conta (pelo menos 8 caracteres)<input class="field" id="accMigP" type="password" autocomplete="new-password"></label>${OS.Legal ? OS.Legal.checks() : ''}
      <div class="row gap8" style="flex-wrap:wrap"><button class="btn pri" data-act="accMigNew">Criar conta e guardar</button><button class="btn" data-act="accMigIn">Já tenho conta: entrar e guardar</button></div></div>`}</div>`; };
  OS.on('ready', () => { const orig = OS.views.definicoes; if (orig) OS.views.definicoes = sub => orig(sub) + (String(sub || '') === '' ? panel() : '');
    const ask = LS.get('nau:joinAsk', 0); if (moved() && !navigator.webdriver && (!ask || Date.now() - ask > 3 * 864e5)) setTimeout(() => OS.UI.modal(`<div style="padding:20px"><h3 style="margin:0 0 8px">O teu Prumo está na conta</h3><p class="mut" style="margin:0 0 14px">Guardaste o teu Prumo na conta <b>${U.esc(moved())}</b>. Entra nela também neste aparelho para ficar tudo igual em todo o lado.</p><div class="row gap8"><button class="btn pri" data-act="accJoin">Entrar na conta</button><button class="btn ghost" data-act="accJoinLater">Agora não</button></div></div>`), 1800); });
  return;
}

/* ---------- daqui para baixo: modo conta ---------- */
const PCOL = ['#F2C48D', '#7FA9DA', '#3FCF8E', '#E0896A', '#9A8CF5', '#F28CB1', '#5CC8E6', '#F2B544'];
const AVS = ['', '🌊', '⚓', '🧭', '🐋', '🦈', '🐢', '🌙', '☀️', '🔥', '🌿', '🎯', '📚', '💼', '🏃', '🎧', '🦊', '🐺', '🦁', '🐼'];
const pid = () => LS.get(K.p, '');
const profiles = () => (S && S.perfis) || [];
const cur = () => profiles().find(p => p.id === pid()) || null;
const first = n => String(n || '').trim().split(/\s+/)[0] || '';
// pub: perfil de uma pessoa qualquer (textos e valores neutros); o perfil pessoal (ps) é o Prumo do Ryan passado para a conta: fica como era
Object.assign(Acc, { sess: () => S, profiles, profile: cur, email: () => (S && S.e) || '', lk: () => (cur() || {}).lk || '', pin: () => !!(cur() && cur().pin), pub: !(cur() && cur().ps) });

// numa conta nova nada do Ryan: o perfil começa com o nome de quem o criou (o resto preenche em Definições)
if (Acc.pub) { try { delete OS.ONE_DEF.fin.cats.Receita.Mova; } catch (e) { } Object.assign(OS.ONE_DEF.profile, { name: '', short: '', city: '', uni: '', course: '', year: '', semester: '', semStart: '', semEnd: '' }); if (OS.ONE_DEF.mova) OS.ONE_DEF.mova.name = 'O meu negócio'; }

/* ---------- dados locais de cada perfil ---------- */
// guarda: a sessão e as escolhas do aparelho; o resto (dados do perfil, preferências do perfil) sai ao trocar de perfil ou de conta
const KEEP = /^(nau:|os2lite$|__)/;
const wipeLocal = () => { OS.noSave = true; LS.keys().forEach(k => { if (!KEEP.test(k)) LS.del(k); }); LS.keys().filter(k => /^nau:(k|pend):/.test(k)).forEach(LS.del);
  try { sessionStorage.removeItem('os2unlock'); } catch (e) { } try { indexedDB.deleteDatabase('oceanum-reset'); } catch (e) { } LS.del(K.data); };

/* ---------- a base de dados do motor (como no sync.js, mas com a conta) ---------- */
const P = () => pid();
const kKnown = () => 'nau:k:' + P(), kPend = () => 'nau:pend:' + P();
let known = LS.get(kKnown(), {}), pend = new Set(LS.get(kPend(), [])), lastM = null, queue = {}, waiters = [], timer = 0, polling = false, prefetched = null;
const SY = Acc.sync = { state: 'a ligar…', last: 0, err: '' };
const saveKnown = () => LS.set(kKnown(), known), savePend = () => LS.set(kPend(), [...pend]);
const dados = (op, body, get) => api('dados' + (get ? '?' + new URLSearchParams({ op, p: P(), _: Date.now() }) : ''), get ? { headers: { authorization: 'Bearer ' + S.t } } : { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.t }, body: JSON.stringify(Object.assign({ op, p: P() }, body)) })
  .catch(e => { if (e.status === 401) ended(); else if (e.status === 404 && e.code === 'perfil') gone(); throw e; });
const fetchIds = async ids => { const docs = {}, etags = {}; let todo = ids.slice();
  while (todo.length) { const part = todo.splice(0, 150), j = await dados('ler', { ids: part }); Object.assign(docs, j.docs); Object.assign(etags, j.etags); if (j.mais && j.mais.length) todo = j.mais.concat(todo); }
  return { docs, etags }; };
const snap = (entries, empty) => ({ empty, docs: entries.map(([id, d]) => ({ id, data: () => d })) });
const size = o => JSON.stringify(o).length;
const flushPut = async () => { timer = 0; const batch = queue, ws = waiters; queue = {}; waiters = []; const ids = Object.keys(batch); if (!ids.length) return;
  try { let part = {}, n = 0;
    const send = async () => { if (!Object.keys(part).length) return; const j = await dados('gravar', { docs: part }); Object.assign(known, j.etags); lastM = j.m; Object.keys(part).forEach(id => pend.delete(id)); part = {}; n = 0; };
    for (const id of ids) { const sz = size(batch[id]); if (n && n + sz > 1.5e6) await send(); part[id] = batch[id]; n += sz; }
    // v3.70: só diz "sincronizada" se não ficou nada por enviar (uma gravação pequena que corre bem não apaga as que falharam antes)
    await send(); saveKnown(); savePend(); SY.last = Date.now(); SY.err = ''; SY.state = pend.size ? 'a enviar alterações…' : 'sincronizada'; ws.forEach(w => w.ok()); if (pend.size) setTimeout(repush, 1500); }
  catch (e) { SY.err = e.message; SY.state = 'sem ligação (guardado neste aparelho)'; savePend(); ws.forEach(w => w.ko({ code: 'unavailable' })); setTimeout(repush, 15000); }
  try { OS.request(); } catch (e) { } };
const put = (id, data) => new Promise((ok, ko) => { queue[id] = data; pend.add(id); savePend(); waiters.push({ ok, ko }); clearTimeout(timer); timer = setTimeout(flushPut, window.__accPut || 4000); });
const payload = id => { const [c, s] = id.split('~'); return c === 'one' ? { data: OS.one(s) } : { items: OS.all(c).filter(r => String(r._s || 0) === s) }; };
// ao sair da app (ou mudar de app) grava logo o que estava à espera
document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearTimeout(timer); flushPut(); } });
const repush = () => { if (!navigator.onLine) return; [...pend].filter(id => !queue[id]).forEach(id => put(id, Object.assign({ t: Date.now() }, payload(id))).catch(() => { })); };
// espera também pelo que já ia a caminho (até ~3 s), para "sincronizado" ser verdade
Acc.flush = async () => { clearTimeout(timer); for (let i = 0; i < 20 && (Object.keys(queue).length || pend.size); i++) { if (Object.keys(queue).length) await flushPut(); else await new Promise(r => setTimeout(r, 150)); } return !pend.size; };

// primeira leitura: antes de o motor arrancar (assim um telemóvel lento nunca cria dados de exemplo por cima dos teus)
const prefetch = async () => { const L = await dados('lista', {}, true); lastM = L.m; const remote = L.docs || {}, ids = Object.keys(remote);
  const mine = LS.get(K.data, '') === P() && hasLocal;
  if (!mine) { known = {}; pend = new Set(); }
  const need = ids.filter(id => !pend.has(id) && (!mine || known[id] !== remote[id]));
  const got = need.length ? await fetchIds(need) : { docs: {}, etags: {} };
  Object.assign(known, got.etags); saveKnown(); LS.set(K.data, P()); SY.state = pend.size ? 'a enviar alterações…' : 'sincronizada'; SY.last = Date.now();   /* v3.64: com alterações por enviar não diz "sincronizada" */
  return { empty: !ids.length, entries: Object.entries(got.docs) }; };
let started = false;
const start = (cb, errCb) => { if (started) return; started = true;
  const pre = prefetched; prefetched = null;
  if (pre) cb(snap(pre.entries, pre.empty));
  else { // sem rede ao abrir: abre com o que está no aparelho e liga quando houver internet
    const retry = async () => { try { const f = await prefetch(); cb(snap(f.entries, f.empty)); } catch (e) { SY.state = 'sem ligação (guardado neste aparelho)'; errCb && errCb({ code: 'unavailable' }); setTimeout(retry, 20000); } }; retry(); }
  if (pend.size) setTimeout(repush, 1500);
  const poll = async () => { if (document.hidden || !navigator.onLine || polling || !S) return; polling = true;
    try { const j = await dados('marca', {}, true);
      if (j.m && j.m !== lastM) { const L = await dados('lista', {}, true); lastM = L.m;
        const ch = Object.keys(L.docs || {}).filter(id => L.docs[id] !== known[id] && !pend.has(id) && !queue[id]);
        if (ch.length) { const got = await fetchIds(ch); Object.assign(known, got.etags); saveKnown(); cb(snap(Object.entries(got.docs), false)); } }
      SY.last = Date.now(); SY.err = ''; SY.state = pend.size ? 'a enviar alterações…' : 'sincronizada'; }
    catch (e) { SY.err = e.message; SY.state = 'sem ligação (guardado neste aparelho)'; }
    finally { polling = false; } };
  Acc.poll = poll;
  setInterval(poll, window.__accPoll || 30000); // a cada 30 s com a app à vista (v2.96, Vercel Pro: o que mudas no telemóvel aparece no computador em segundos; antes 90 s); ao voltar à app verifica logo
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); if (pend.size) repush(); } });
  addEventListener('online', () => { poll(); if (pend.size) repush(); }); };
const DB = { collection: () => ({ onSnapshot: (cb, err) => { start(cb, err); return () => { }; } }), doc: path => ({ set: data => put(path.split('/').slice(1).join('/'), data) }) };

// o motor pede a base de dados ao arrancar: só a entregamos depois de entrares e escolheres o perfil
let release; const ready = new Promise(r => { release = r; });
window.claude = { use: async cap => { if (cap !== 'db') return null; await ready; return DB; } };

/* ---------- sessão terminada, perfil apagado noutro aparelho ---------- */
let endedOnce = false;
const ended = () => { if (endedOnce) return; endedOnce = true; S = null; saveS(); showGate('entrar', 'A sessão terminou (a senha mudou ou saíste noutro aparelho). Entra outra vez.'); };
const gone = () => { if (endedOnce) return; endedOnce = true; LS.del(K.p); wipeLocal(); showGate('perfis', 'Este perfil foi apagado noutro aparelho.'); };

/* ---------- ecrã da conta (por cima de tudo, com o mesmo mar do ecrã de entrada) ---------- */
let G = null, gMode = /[?&]conta=criar\b/.test(location.search) ? 'criar' : 'entrar', gMsg = '', gEdit = null, gManage = false, gBusy = false, gRec = '';
const scene = () => OS.Scene ? `<div class="lk-scene${OS.Fundo && OS.Fundo.get() === 'foto' ? ' fd-isphoto' : ''}">${OS.Fundo ? OS.Fundo.html(Math.max(320, innerWidth), Math.max(480, innerHeight), { id: 'acs', anim: 1 }) : OS.Scene.svg(Math.max(320, innerWidth), Math.max(480, innerHeight), { id: 'acs' })}</div>` : '';
const okImg = s => typeof s === 'string' && s.length <= 60000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
const avatar = (p, big) => `<span class="ac-av${big ? ' big' : ''}${okImg(p.img) ? ' im' : ''}" style="--c:${esc(p.cor || PCOL[0])}">${okImg(p.img) ? `<img src="${p.img}" alt="">` : esc(p.av || first(p.nome).slice(0, 1).toUpperCase() || '?')}</span>`;
const field = (n, label, type = 'text', extra = '') => `<label class="ac-f"><span>${label}</span><input name="${n}" type="${type}" ${extra}></label>`;
const lockFields = pin => pin ? `<div class="ac-f ac-pin">${PinC.html('c1', 'Código de acesso (6 números)')}${PinC.html('c2', 'Repete o código')}</div>`
  : `${field('c1', 'Código de bloqueio do perfil', 'password', 'minlength="6" autocomplete="new-password" required placeholder="pelo menos 6 caracteres"')}${field('c2', 'Repete o código', 'password', 'minlength="6" autocomplete="new-password" required')}`;
// v3.20: todos os perfis usam o código de 6 números (também o perfil pessoal do Ryan)
const pinFor = () => true;
const swatches = sel => `<div class="ac-sw" role="radiogroup" aria-label="Cor">${PCOL.map(c => `<label><input type="radio" name="cor" value="${c}" ${c === sel ? 'checked' : ''}><i style="--c:${c}"></i></label>`).join('')}</div>`;
const avPick = sel => `<div class="ac-avs" role="radiogroup" aria-label="Avatar">${AVS.map(a => `<label><input type="radio" name="av" value="${a}" ${a === (sel || '') ? 'checked' : ''}><i>${a || 'Aa'}</i></label>`).join('')}</div>`;
/* avatar do perfil: emoji, uma foto (cortada em quadrado, ~10 KB) ou um personagem do Dominus em pixel art */
const avEditor = p => { const im = okImg(p.img) ? p.img : '';
  return `<div class="ac-f ac-ave"><span>Avatar</span><div class="ac-avtop"><span class="ac-avprev">${avatar(Object.assign({}, p, { img: im }), 1)}</span>
    <div class="ac-avbtns"><label class="ac-btn ghost sm"><input type="file" accept="image/*" data-acx="foto" class="ac-file">Escolher foto</label><button type="button" class="ac-btn ghost sm" data-acx="dom" aria-expanded="false">Personagem do Dominus</button><button type="button" class="ac-link" data-acx="tirar" ${im ? '' : 'hidden'}>Tirar a imagem</button></div></div>
    <input type="hidden" name="img" value="${esc(im)}"><div class="ac-domg" hidden></div>${avPick(p.av)}</div>`; };
// busto 128×128 a partir de uma grelha de píxeis (herói 48×72 ou monstro 64×64)
const bust = (px, w, h, bx, by, bs, bg) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const sc = 128 / bs;
  for (let yy = 0; yy < bs; yy++) for (let xx = 0; xx < bs; xx++) { const sx = bx + xx, sy = by + yy; if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue; const v = px[sy * w + sx]; if (!v) continue; x.fillStyle = v; x.fillRect(Math.floor(xx * sc), Math.floor(yy * sc), Math.ceil(sc), Math.ceil(sc)); }
  return c.toDataURL('image/png'); };
const heroBust = look => { const D = OS.Dom, W = D.PW || 48, H = D.PH || 72, px = D.pixel(look || {}); let top = 0; while (top < 30 && !px.slice(top * W + 10, top * W + 38).some(Boolean)) top++; return bust(px, W, H, 8, Math.max(0, top - 3), 32, ['#24476E', '#0B1A2E']); };
const HEROES = [{ skin: 2, hair: 'liso curto', hairColor: 'loiro', beard: 'nenhuma', glasses: '', top: 'hoodie', topColor: 1 }, { skin: 6, hair: 'cacheado curto', hairColor: 'preto', beard: 'cavanhaque', glasses: 'retangulares', top: 'tshirt', topColor: 0 },
  { skin: 8, hair: 'tranças', hairColor: 'preto', beard: 'nenhuma', glasses: '', top: 'camisa', topColor: 2 }, { skin: 4, hair: 'comprido', hairColor: 'ruivo', beard: 'nenhuma', glasses: 'redondos', top: 'polo', topColor: 4 },
  { skin: 3, hair: 'coque', hairColor: 'castanho escuro', beard: 'nenhuma', glasses: '', top: 'blazer', topColor: 3 }, { skin: 9, hair: 'afro', hairColor: 'preto', beard: 'barba curta', glasses: '', top: 'couro', topColor: 0 },
  { skin: 5, hair: 'moicano', hairColor: 'azul', beard: 'por fazer', glasses: 'sol', top: 'regata', topColor: 5 }, { skin: 1, hair: 'cacheado comprido', hairColor: 'castanho', beard: 'nenhuma', glasses: '', top: 'mago', head: 'mago', headColor: 4 },
  { skin: 7, hair: 'rapado', hairColor: 'preto', beard: 'barba cheia', glasses: '', top: 'a-ferro', head: 'espartano' }, { skin: 2, hair: 'comprido', hairColor: 'grisalho', beard: 'lenhador', glasses: '', top: 'monge' },
  { skin: 6, hair: 'liso curto', hairColor: 'preto', beard: 'nenhuma', glasses: '', top: 'a-cavaleiro', head: 'cavaleiro' }, { skin: 4, hair: 'dreads', hairColor: 'castanho escuro', beard: 'bigode', glasses: 'aviador', top: 'fato', topColor: 0 }];
let GAL = null;
const gallery = () => { if (GAL) return GAL; GAL = []; const D = OS.Dom, M = OS.Monstros;
  try { const d = OS.one && OS.one('dominus'); if (D && d && d.born && d.look && LS.get(K.data, '') === (gEdit || pid())) GAL.push({ n: 'O teu herói', src: heroBust(d.look) }); } catch (e) { }
  if (D && D.pixel) HEROES.forEach((l, i) => { try { GAL.push({ n: 'Herói ' + (i + 1), src: heroBust(Object.assign({ eyes: 'castanho', brows: 'finas', legs: 'jeans', feet: 'tenis' }, l)) }); } catch (e) { } });
  // v2.53: os monstros, chefes e colossos entram aqui à medida que os derrotas no Dominus (só no teu perfil)
  GAL.won = 0; GAL.tot = M && M.ALL ? Object.keys(M.ALL).filter(id => !/^x/.test(id)).length : 0;
  try { const d = OS.one && OS.one('dominus'); if (D && M && M.pixels && d && d.born && LS.get(K.data, '') === (gEdit || pid())) { const won = new Set(Object.keys(D.kills ? D.kills() : {}));
      Object.keys(d.boss || {}).forEach(w => { try { const f = D.bossFight(w); if (f.dead && f.mid) won.add(f.mid); } catch (e) { } }); Object.keys(d.col || {}).forEach(ym => { try { const c = D.colossus(ym); if (c.dead && c.mid) won.add(c.mid); } catch (e) { } });
      [...won].filter(id => M.ALL[id]).sort((a, b) => (M.power ? (M.power(a) || 0) - (M.power(b) || 0) : 0)).forEach(id => { try { GAL.push({ n: M.name(id), src: monBust(id) }); GAL.won++; } catch (e) { } }); } } catch (e) { }
  return GAL; };
// o monstro recortado à volta do corpo (fica grande no círculo do avatar)
const monBust = id => { const px = OS.Monstros.pixels(id, {}), w = Math.round(Math.sqrt(px.length)); let x0 = w, y0 = w, x1 = 0, y1 = 0; px.forEach((v, i) => { if (!v) return; const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
  const sz = Math.max(x1 - x0, y1 - y0) + 8; return bust(px, w, w, Math.round((x0 + x1) / 2 - sz / 2), Math.round((y0 + y1) / 2 - sz / 2), sz, ['#2A1F3A', '#0E0A16']); };
// foto: corta ao centro, 160×160, JPEG leve (cabe no perfil e aparece em todos os aparelhos)
const photo = file => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
  im.onload = () => { const c = document.createElement('canvas'), Z = 160, w = im.naturalWidth, h = im.naturalHeight, q0 = Math.min(w, h); c.width = c.height = Z; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(im, (w - q0) / 2, (h - q0) / 2, q0, q0, 0, 0, Z, Z); URL.revokeObjectURL(u); let q = .86, d = c.toDataURL('image/jpeg', q); while (d.length > 56000 && q > .4) { q -= .12; d = c.toDataURL('image/jpeg', q); } res(d); };
  im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Não consegui ler esta imagem. Experimenta outra (JPG ou PNG).')); }; im.src = u; });
const formVal = (f, n) => { const r = [...f.querySelectorAll(`input[name=${n}]`)].find(x => x.checked); return r ? r.value : ''; };
const avPrev = f => { const box = f.querySelector('.ac-avprev'), img = f.elements.img ? f.elements.img.value : ''; if (!box) return;
  box.innerHTML = avatar({ nome: (f.elements.nome || {}).value || '', cor: formVal(f, 'cor') || PCOL[0], av: formVal(f, 'av'), img }, 1); const t = f.querySelector('[data-acx=tirar]'); if (t) t.hidden = !img; };
const setImg = (f, src) => { if (f.elements.img) f.elements.img.value = src || ''; avPrev(f); };
document.addEventListener('change', async e => { const t = e.target, f = t.closest && t.closest('form'); if (!f || !f.querySelector('.ac-ave')) return;
  if (t.matches('[data-acx=foto]')) { const file = t.files && t.files[0]; t.value = ''; if (!file) return;
    try { setImg(f, await photo(file)); } catch (err) { if (G && G.contains(f)) { gMsg = err.message; const m = f.querySelector('.ac-msg'); if (m) m.textContent = err.message; else OS.UI && OS.UI.toast(err.message, 'neg'); } else OS.UI.toast(err.message, 'neg'); } return; }
  if (t.name === 'av') return setImg(f, '');
  if (t.name === 'cor') avPrev(f); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-acx]'); if (!b || b.dataset.acx === 'foto') return; const f = b.closest('form'); if (!f) return; const a = b.dataset.acx;
  if (a === 'dom') { e.preventDefault(); const g = f.querySelector('.ac-domg'), open = g.hidden; g.hidden = !open; b.setAttribute('aria-expanded', String(open));
    if (open) { GAL = null; const L = gallery(); g.innerHTML = L.map((x, i) => `<button type="button" data-acx="pick" data-i="${i}" title="${esc(x.n)}" aria-label="${esc(x.n)}"><img src="${x.src}" alt=""></button>`).join('') + (L.tot ? `<p class="ac-sub ac-domn">${L.won ? `${L.won} ${L.won === 1 ? 'monstro desbloqueado' : 'monstros desbloqueados'}.` : 'Ainda nenhum monstro.'} Cada monstro, chefe ou colosso que derrotares no Dominus fica aqui para usares como avatar.</p>` : '') || '<p class="ac-sub">O Dominus ainda não carregou. Tenta daqui a um segundo.</p>'; } return; }
  if (a === 'pick') { e.preventDefault(); const x = gallery()[+b.dataset.i]; if (x) setImg(f, x.src); f.querySelectorAll('.ac-domg button').forEach(y => y.classList.toggle('on', y === b)); return; }
  if (a === 'tirar') { e.preventDefault(); setImg(f, ''); } });
const view = () => {
  const m = gMode, msg = gMsg ? `<p class="ac-msg" role="status">${esc(gMsg)}</p>` : '';
  if (m === 'perfis') { const L = profiles();
    return `<div class="ac-who"><h1 class="ac-h">${L.length ? 'Quem está a usar o Prumo?' : 'Cria o teu primeiro perfil'}</h1>${msg}
      <div class="ac-grid">${L.map(p => `<button class="ac-p${gManage ? ' edit' : ''}" data-ac="${gManage ? 'editar' : 'escolher'}" data-id="${p.id}">${avatar(p, 1)}<b>${esc(p.nome)}</b>${gManage ? `<em>Editar</em>` : ''}</button>`).join('')}
      ${L.length < 5 ? `<button class="ac-p add" data-ac="novo"><span class="ac-av big plus">+</span><b>Adicionar perfil</b></button>` : ''}</div>
      <div class="ac-row">${L.length ? `<button class="ac-btn ghost" data-ac="gerir">${gManage ? 'Feito' : 'Gerir perfis'}</button>` : ''}<button class="ac-link" data-ac="sair">Sair da conta${S && S.e ? ' (' + esc(S.e) + ')' : ''}</button></div></div>`; }
  if (m === 'novo' || m === 'editar') { const p = m === 'editar' ? profiles().find(x => x.id === gEdit) || {} : { cor: PCOL[profiles().length % PCOL.length] };
    return `<form class="ac-card" data-acf="${m}"><h2>${m === 'novo' ? 'Novo perfil' : 'Editar perfil'}</h2>
      <p class="ac-sub">${m === 'novo' ? 'Cada perfil tem os seus próprios dados, metas, finanças e jogo. O código de bloqueio é pedido ao abrir o Prumo com este perfil.' : 'Muda o nome, a cor ou o avatar (emoji, uma foto tua ou um personagem do Dominus). O código e os dados ficam como estão.'}</p>
      ${field('nome', 'Nome', 'text', `maxlength="24" required autocomplete="off" value="${esc(p.nome || '')}"`)}
      ${avEditor(p)}<div class="ac-f"><span>Cor</span>${swatches(p.cor)}</div>
      ${m === 'novo' ? lockFields(true) : ''}${msg}
      <div class="ac-row"><button class="ac-btn" type="submit" ${gBusy ? 'disabled' : ''}>${m === 'novo' ? 'Criar perfil' : 'Guardar'}</button><button class="ac-btn ghost" type="button" data-ac="voltar">Cancelar</button></div>
      ${m === 'editar' ? `<div class="ac-more"><button class="ac-link" type="button" data-ac="codigo">Esqueci o código deste perfil</button><button class="ac-link neg" type="button" data-ac="apagarp">Apagar este perfil</button></div>` : ''}</form>`; }
  if (m === 'codigo' || m === 'apagarp') { const p = profiles().find(x => x.id === gEdit) || {};
    return `<form class="ac-card" data-acf="${m}"><h2>${m === 'codigo' ? 'Novo código para ' + esc(p.nome || '') : 'Apagar ' + esc(p.nome || '')}</h2>
      <p class="ac-sub">${m === 'codigo' ? 'Confirma com a senha da conta e escolhe o código novo. Vale em todos os aparelhos.' : 'Apaga o perfil e todos os dados dele, em todos os aparelhos. Não dá para desfazer.'}</p>
      ${field('senha', 'Senha da conta', 'password', 'required autocomplete="current-password"')}${m === 'codigo' ? lockFields(pinFor(p)) : ''}${msg}
      <div class="ac-row"><button class="ac-btn${m === 'apagarp' ? ' neg' : ''}" type="submit" ${gBusy ? 'disabled' : ''}>${m === 'codigo' ? 'Mudar o código' : 'Apagar para sempre'}</button><button class="ac-btn ghost" type="button" data-ac="voltar">Cancelar</button></div></form>`; }
  if (m === 'verificar') return `<form class="ac-card" data-acf="verificar"><h2>Confirma o teu e-mail</h2>
      <p class="ac-sub">Enviámos um código de 6 números para <b>${esc((S && S.e) || '')}</b>. Escreve-o aqui (vale 30 minutos). Se não chegou, vê também no spam.</p>
      <div class="ac-f ac-pin">${PinC.html('codigo', 'Código do e-mail', { auto: 1, aria: 'Código de 6 números do e-mail' })}</div>${msg}
      <div class="ac-row"><button class="ac-btn" type="submit" ${gBusy ? 'disabled' : ''}>Confirmar</button><button class="ac-btn ghost" type="button" data-ac="reenviar">Enviar outro código</button></div>
      <div class="ac-more"><button class="ac-link" type="button" data-ac="sair">Enganei-me no e-mail: criar a conta outra vez</button></div></form>`;
  if (m === 'codigo-rec') return `<div class="ac-card"><h2>Guarda o teu código de recuperação</h2>
      <p class="ac-sub">Se te esqueceres da senha, é com este código que a recuperas. Aparece só agora: tira uma fotografia, guarda-o nas notas ou no gestor de senhas.</p>
      <div class="ac-code" id="acRec">${esc(gRec)}</div><div class="ac-row"><button class="ac-btn ghost" type="button" data-ac="copiar">Copiar</button><button class="ac-btn" type="button" data-ac="guardei">Já guardei</button></div></div>`;
  const tabs = `<div class="ac-tabs" role="tablist"><button role="tab" aria-selected="${m === 'entrar'}" class="${m === 'entrar' ? 'on' : ''}" data-ac="m" data-v="entrar">Entrar</button><button role="tab" aria-selected="${m === 'criar'}" class="${m === 'criar' ? 'on' : ''}" data-ac="m" data-v="criar">Criar conta</button></div>`;
  if (m === 'criar') return `<form class="ac-card" data-acf="criar">${tabs}
      ${field('nome', 'O teu nome', 'text', 'maxlength="40" autocomplete="name" required')}<input class="ac-hp" name="site" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">${field('email', 'E-mail', 'email', 'autocomplete="email" required')}${field('senha', 'Senha', 'password', 'minlength="8" autocomplete="new-password" required placeholder="pelo menos 8 caracteres"')}
      <p class="ac-sub">Os teus dados ficam na tua conta, cifrados, e aparecem iguais no telemóvel e no computador. Podes ter até 5 perfis.</p>${OS.Legal ? OS.Legal.checks() : ''}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A criar…' : 'Criar conta'}</button></form>`;
  if (m === 'termos') return `<form class="ac-card" data-acf="termos"><h2>Antes de continuar</h2>
      <p class="ac-sub">O Prumo tem agora Termos de Serviço e uma Política de Privacidade (LGPD e RGPD). Lê-os e aceita uma vez: fica guardado na tua conta, em todos os aparelhos.</p>
      ${OS.Legal ? OS.Legal.checks() : ''}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A guardar…' : 'Aceitar e continuar'}</button>
      <button class="ac-link" type="button" data-ac="sair">Não aceito: sair da conta</button></form>`;
  if (m === 'trocar') return `<form class="ac-card" data-acf="trocar"><h2>Escolhe uma senha nova</h2><p class="ac-sub">A administração do Prumo repôs a senha da tua conta e entraste com uma senha temporária. Escolhe agora uma senha só tua para continuar. Os teus dados estão todos aqui.</p>
      ${field('nova', 'Senha nova (8 ou mais)', 'password', 'minlength="8" autocomplete="new-password" required')}${field('nova2', 'Repete a senha nova', 'password', 'minlength="8" autocomplete="new-password" required')}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A guardar…' : 'Guardar e continuar'}</button>
      <button class="ac-link" type="button" data-ac="sair">Sair da conta</button></form>`;
  if (m === 'recuperar') return `<form class="ac-card" data-acf="recuperar"><h2>Recuperar a senha</h2><p class="ac-sub">Usa o código de recuperação que guardaste quando criaste a conta.</p>
      ${field('email', 'E-mail', 'email', 'autocomplete="email" required')}${field('codigo', 'Código de recuperação', 'text', 'autocomplete="off" required placeholder="XXXX-XXXX-XXXX-XXXX"')}${field('nova', 'Senha nova', 'password', 'minlength="8" autocomplete="new-password" required')}${msg}
      <div class="ac-row"><button class="ac-btn" type="submit" ${gBusy ? 'disabled' : ''}>Mudar a senha</button><button class="ac-btn ghost" type="button" data-ac="m" data-v="entrar">Voltar</button></div></form>`;
  return `<form class="ac-card" data-acf="entrar">${tabs}
      ${field('email', 'E-mail', 'email', `autocomplete="email" required value="${esc(LS.get(K.owner, '') || '')}"`)}${field('senha', 'Senha', 'password', 'autocomplete="current-password" required')}${msg}
      <button class="ac-btn wide" type="submit" ${gBusy ? 'disabled' : ''}>${gBusy ? 'A entrar…' : 'Entrar'}</button>
      <button class="ac-link" type="button" data-ac="m" data-v="recuperar">Esqueci a senha</button></form>`; };
const paint = () => { if (!G) return; const box = G.querySelector('.ac-in');
  // ao mostrar um erro, o que já escreveste fica (menos as senhas e códigos)
  const was = box.querySelector('form[data-acf]'), keep = {}; if (was) [...was.querySelectorAll('input[type=text],input[type=email],input[type=radio]:checked,input[type=hidden][name=img]')].forEach(i => { keep[i.name] = i.value; });
  const kind = was && was.dataset.acf;
  box.innerHTML = `<div class="ac-brand">${OS.Lock ? OS.Lock.logo(36) + OS.Lock.word(22) : '<span>Prumo</span>'}</div>${gMode === 'perfis' || gMode === 'codigo-rec' ? '' : '<p class="ac-hi">O sistema operativo da tua vida: dinheiro, estudos, treino, metas e o teu jogo, num só sítio.</p>'}${view()}<nav class="ac-foot" aria-label="Documentos legais"><a href="#" data-lgl="termos">Termos</a><a href="#" data-lgl="privacidade">Privacidade</a><a href="#" data-lgl="cookies">Cookies</a><a href="#" data-lgl="acessibilidade">Acessibilidade</a><a href="planos.html" target="_blank" rel="noopener">Planos e preços</a></nav>`;
  const now = box.querySelector('form[data-acf]'); if (now && kind === now.dataset.acf) { Object.entries(keep).forEach(([n, v]) => { const L = [...now.querySelectorAll(`input[name="${n}"]`)]; if (L[0] && L[0].type === 'radio') L.forEach(r => { r.checked = r.value === v; }); else if (L[0] && v) L[0].value = v; }); if (now.querySelector('.ac-ave')) avPrev(now); }
  // cursor no primeiro campo, mas nunca a meio do que já estás a escrever noutro
  const f = box.querySelector('input:not([type=radio])'); if (f && !f.value && matchMedia('(pointer:fine)').matches) setTimeout(() => { const a = document.activeElement; if (!G || (a && a !== document.body && G.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return; f.focus(); }, 60); };
const set = (mode, msg) => { gMode = mode; gMsg = msg || ''; gBusy = false; paint(); };
const showGate = (mode, msg) => { if (!G) { G = document.createElement('div'); G.id = 'acc'; G.className = 'acx'; G.setAttribute('role', 'dialog'); G.setAttribute('aria-modal', 'true'); G.setAttribute('aria-label', 'Conta Prumo');
    G.innerHTML = `${scene()}<div class="ac-in"></div>`; document.body.appendChild(G); G.addEventListener('click', onClick); G.addEventListener('submit', onSubmit); }
  G.hidden = false; document.documentElement.classList.add('ac-open'); gManage = false; set(mode, msg); };
const hideGate = () => { if (G) { G.hidden = true; G.innerHTML = ''; G.remove(); G = null; } document.documentElement.classList.remove('ac-open'); };

// escolher o perfil: se este aparelho tinha os dados de outro, limpa-os e recomeça; senão o motor arranca já
const choose = async id => { const was = LS.get(K.data, ''), booted = !!OS.dbRef, p = profiles().find(x => x.id === id) || {};
  if (booted || (was && was !== id) || !!p.ps === Acc.pub) {
    if (booted && pend.size && !(await Acc.flush().catch(() => false)) && !confirm('Há alterações deste perfil que ainda não chegaram à nuvem (sem internet?). Se trocares agora, perdem-se. Trocar na mesma?')) return;
    LS.set(K.p, id); if (was !== id) wipeLocal(); try { sessionStorage.removeItem('os2unlock'); } catch (e) { } location.reload(); return; }
  LS.set(K.p, id); known = LS.get(kKnown(), {}); pend = new Set(LS.get(kPend(), []));
  gMsg = ''; const box = G && G.querySelector('.ac-in'); if (box) box.innerHTML = `<div class="ac-brand">${OS.Lock ? OS.Lock.logo(36) + OS.Lock.word(22) : '<span>Prumo</span>'}</div><p class="ac-hi">A abrir o perfil de ${esc(first((cur() || {}).nome))}…</p>`;
  try { prefetched = await prefetch(); } catch (e) { if (!hasLocal) { set('perfis', e.net ? 'Sem internet. Para abrir este perfil pela primeira vez neste aparelho precisas de rede.' : e.message); return; } }
  hideGate(); release(); };
const afterLogin = (j, email) => { if (LS.get(K.owner, '') && LS.get(K.owner, '') !== email) { LS.del(K.p); wipeLocal(); } LS.set(K.owner, email); takeConta(j, email); endedOnce = false; if (!S.trocar) avisos(); };
// v2.97: avisos da administração (senha reposta, e-mail mudado), uma vez em cada aparelho
const avisos = () => { try { if (!S || !Array.isArray(S.avisos) || !S.avisos.length) return; const k = 'nau:avisos:' + (S.e || ''), seen = LS.get(k, ''), novos = S.avisos.filter(a => String(a.at || '') > seen); if (!novos.length) return;
  LS.set(k, String(novos[novos.length - 1].at || '')); const dt = a => { try { return new Date(a.at).toLocaleString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const txt = a => a.t === 'senha' ? `A administração repôs a senha da tua conta (${dt(a)}). Se não pediste isto, fala com a administração.` : a.t === 'plano' ? `A administração ofereceu-te o plano ${a.p || ''}${a.d ? ' por ' + a.d + ' dias' : ''} (${dt(a)}). Aproveita!` : a.t === 'cofre' ? `A administração repôs o teu cofre de Senhas (${dt(a)}), como pediste: abre Eu › Senhas e cria uma senha mestra nova. Se não pediste isto, fala com a administração.` : a.t === 'email' ? `O e-mail da tua conta passou de ${a.de || 'o anterior'} para ${S.e} (${dt(a)}). Os teus dados vieram todos. A partir de agora entras com este e-mail.` : '';
  setTimeout(() => { if (OS.UI && OS.UI.modal) OS.UI.modal(`<div style="padding:20px"><h3 style="margin:0 0 10px">Aviso da administração</h3>${novos.map(a => `<p style="margin:0 0 10px;line-height:1.5">${esc(txt(a))}</p>`).join('')}<button class="btn pri" data-mclose>Percebi</button></div>`); }, 1200); } catch (e) { } };

async function onSubmit(e) { const f = e.target.closest('form[data-acf]'); if (!f) return; e.preventDefault(); if (gBusy) return;
  const v = n => (f.elements[n] ? f.elements[n].value : ''), kind = f.dataset.acf, val = n => { const r = [...f.querySelectorAll(`input[name=${n}]`)].find(x => x.checked); return r ? r.value : ''; };
  const fail = err => { gBusy = false; gMsg = err.net ? 'Sem ligação à internet. Tenta outra vez.' : err.message; paint(); };
  const isPin = !!f.querySelector('.pin-in[name=c1]');
  const code = async () => { if (isPin ? !PinC.ok(v('c1')) : v('c1').length < 6) throw new Error(isPin ? 'O código tem de ter 6 números.' : 'O código precisa de pelo menos 6 caracteres.'); if (v('c1') !== v('c2')) { if (isPin) { PinC.clear(f.elements.c2); } throw new Error('Os dois códigos não são iguais.'); } return sha(SALT + v('c1')); };
  gBusy = true; paint();
  try {
    if (kind === 'entrar') { const email = v('email').trim().toLowerCase(), j = await conta('entrar', { email, senha: v('senha') }); afterLogin(j, email); set(S.verificar ? 'verificar' : S.trocar ? 'trocar' : needTerms() ? 'termos' : 'perfis'); return; }
    if (kind === 'trocar') { if (v('nova').length < 8) throw new Error('A senha nova precisa de pelo menos 8 caracteres.'); if (v('nova') !== v('nova2')) throw new Error('As duas senhas não são iguais.');
      const j = await conta('senhaTroca', { nova: v('nova') }); takeConta(j); avisos(); set(needTerms() ? 'termos' : 'perfis'); return; }
    if (kind === 'termos') { const t = OS.Legal ? OS.Legal.read(f) : null; if (!t) throw new Error('Para continuar, marca as três caixas.'); const j = await conta('termos', t); takeConta(j);
      if (!booting || !cur()) { set('perfis'); return; } hideGate(); OS.request && OS.request(); return; }
    if (kind === 'criar') { const t = OS.Legal ? OS.Legal.read(f) : {}; if (!t) throw new Error('Para criar a conta, marca as três caixas: termos e privacidade, dados de saúde e de fé, e idade.');
      const email = v('email').trim().toLowerCase(), j = await conta('registar', Object.assign({ email, senha: v('senha'), nome: v('nome'), site: v('site') || '' }, t)); afterLogin(j, email); gRec = j.recuperacao; S.novo = v('nome'); saveS(); set(j.verificar ? 'verificar' : 'codigo-rec'); return; }
    if (kind === 'verificar') { const j = await conta('verificarEmail', { codigo: v('codigo') }); takeConta(j); set(gRec ? 'codigo-rec' : needTerms() ? 'termos' : profiles().length ? 'perfis' : 'novo'); return; }
    if (kind === 'recuperar') { const email = v('email').trim().toLowerCase(), j = await conta('recuperar', { email, codigo: v('codigo'), nova: v('nova') }); afterLogin(j, email); gRec = j.recuperacao; set('codigo-rec'); return; }
    if (kind === 'novo') { const lk = await code(), j = await conta('perfil', { acao: 'criar', perfil: { nome: v('nome'), cor: val('cor'), av: val('av'), img: v('img'), lk, pin: isPin ? 6 : 0 } }); takeConta(j); set('perfis'); return; }
    if (kind === 'editar') { const j = await conta('perfil', { acao: 'editar', id: gEdit, perfil: { nome: v('nome'), cor: val('cor'), av: val('av'), img: v('img') } }); takeConta(j); set('perfis'); return; }
    if (kind === 'codigo') { const lk = await code(), j = await conta('codigo', { id: gEdit, senha: v('senha'), lk, pin: isPin ? 6 : 0 }); takeConta(j); const r = LS.get(K.reset, {}); r[gEdit] = lk; LS.set(K.reset, r); set('perfis', 'Código mudado. Usa o novo ao abrir este perfil.'); return; }
    if (kind === 'apagarp') { const j = await conta('perfil', { acao: 'apagar', id: gEdit, senha: v('senha') }); takeConta(j); LS.del('nau:k:' + gEdit); LS.del('nau:pend:' + gEdit); const here = LS.get(K.data, '') === gEdit; if (here) wipeLocal(); if (pid() === gEdit) LS.del(K.p); if (here && OS.dbRef) { location.reload(); return; } set('perfis', 'Perfil apagado.'); return; }
  } catch (err) { fail(err); } }
async function onClick(e) { const b = e.target.closest('[data-ac]'); if (!b || gBusy) return; const a = b.dataset.ac;
  if (a === 'm') return set(b.dataset.v);
  if (a === 'escolher') return choose(b.dataset.id);
  if (a === 'novo') { gEdit = null; return set('novo'); }
  if (a === 'editar') { gEdit = b.dataset.id; return set('editar'); }
  if (a === 'gerir') { gManage = !gManage; return paint(); }
  if (a === 'voltar') { gManage = false; return set('perfis'); }
  if (a === 'codigo' || a === 'apagarp') return set(a);
  if (a === 'copiar') { try { await navigator.clipboard.writeText(gRec); b.textContent = 'Copiado'; } catch (err) { const r = document.createRange(); r.selectNodeContents(document.getElementById('acRec')); getSelection().removeAllRanges(); getSelection().addRange(r); } return; }
  if (a === 'guardei') { gRec = ''; if (needTerms()) return set('termos'); if (!profiles().length) { gEdit = null; set('novo'); const n = G && G.querySelector('input[name=nome]'); if (n && S && S.novo) n.value = first(S.novo); return; } return set('perfis'); }
  if (a === 'reenviar') { gBusy = true; paint(); try { const j = await conta('reenviarCodigo'); takeConta(j); gBusy = false; gMsg = ''; paint(); OS.UI && OS.UI.toast && OS.UI.toast('Código novo enviado para ' + S.e, 'pos'); } catch (err) { gBusy = false; gMsg = err.message; paint(); } return; }
  if (a === 'sair') return logout(); }

/* ---------- sair, trocar de perfil ---------- */
const logout = async () => {
  if (pend.size && OS.dbRef && !(await Acc.flush().catch(() => false)) && !confirm('Há alterações que ainda não chegaram à nuvem (sem internet?). Se saíres agora, perdem-se neste aparelho. Sair na mesma?')) return;
  S = null; saveS(); LS.del(K.p); wipeLocal(); location.replace(location.pathname + '#visao'); location.reload(); };
Acc.logout = logout;
Acc.switchProfile = () => { gManage = false; showGate('perfis'); };

/* ---------- arranque ---------- */
let booting = false;
const needTerms = () => !!S && !!OS.Legal && S.termos !== OS.Legal.V;
Acc.termos = () => S ? { v: S.termos || '', at: S.termosAt || '' } : null;
Acc.pedido = (tipo, msg) => conta('pedido', { tipo, msg });
const boot = () => {
  if (!S) return showGate(LS.get(K.owner, '') ? 'entrar' : 'criar');
  if (S.verificar) return showGate('verificar');
  if (typeof S.termos === 'string' && needTerms()) { showGate('termos'); if (!cur()) return; }
  else if (!cur()) return showGate('perfis');
  // sessão e perfil prontos: abre já; a lista de perfis atualiza-se por trás
  booting = true; (async () => { try { prefetched = await prefetch(); }
    catch (e) { if (e.status === 401 || e.status === 404) return; if (!hasLocal) return showGate('perfis', 'Sem internet. Para abrir este perfil neste aparelho precisas de rede: toca nele outra vez quando tiveres ligação.'); }
    release(); })();
  conta('eu').then(j => { takeConta(j); if (!cur() && !endedOnce) return gone(); if (S.trocar) { if (!(G && gMode === 'trocar')) showGate('trocar'); return; } if (needTerms() && !(G && gMode === 'termos')) showGate('termos'); avisos(); }).catch(() => { });
};
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : setTimeout(boot, 0);

/* ---------- tempo de uso (para o separador de administração): minutos com a app aberta e à vista, por dia ---------- */
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let useMin = 0, useDay = today(), lastSend = 0, hidAt = 0, finSent = false;
// ev: 'abrir' (entrou no app), 'fim' (o app saiu do ecrã) ou nada (está a ser usado); o administrador vê isto em tempo real
const sendUse = (keep, ev) => { if (!S || (!useMin && keep !== 0 && !ev)) return; const min = useMin, dia = useDay; useMin = 0; useDay = today(); lastSend = Date.now();
  try { fetch(new URL('api/conta', document.baseURI).href, { method: 'POST', keepalive: !!keep, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.t }, body: JSON.stringify({ op: 'uso', min, dia, ev: ev || '', pf: pid() || '' }) }).catch(() => { useMin += min; }); } catch (e) { } };
const locked = () => { const l = document.getElementById('lkCode'); return !!(l && l.offsetParent) || !!document.getElementById('acc'); };
setInterval(() => { if (!S || !cur() || document.hidden || locked()) return; if (useDay !== today()) sendUse(); useMin++; if (useMin >= 5) sendUse(); }, window.__useTick || 60e3);
const bye = () => { if (finSent || !S || !cur()) return; finSent = true; sendUse(1, 'fim'); };
addEventListener('pagehide', bye);
document.addEventListener('visibilitychange', () => { if (document.hidden) { hidAt = Date.now(); bye(); return; } if (!S || !cur() || locked()) return; finSent = false;
  // voltou ao app: depois de 10 min fora conta como nova entrada; antes disso é só sinal de que está outra vez a usar
  if (hidAt && Date.now() - hidAt >= 10 * 60e3) sendUse(0, 'abrir'); else if (Date.now() - lastSend > 45e3) sendUse(0); });
OS.on('ready', () => setTimeout(() => { finSent = false; sendUse(0, 'abrir'); }, 4000));

/* ---------- separador de administração (só na conta de quem está em NAUTILO_ADMIN no servidor) ---------- */
Acc.adm = () => !!(S && S.adm);
Acc.spOk = () => !!(S && cur() && (S.sp || S.adm)); Acc.spCid = () => (S && S.spc) || '';
Acc.token = () => (S && S.t) || '';
Acc.pid = () => pid();
Acc.prof = () => { const p = cur(); return p ? { nome: p.nome || '', cor: p.cor || '', av: p.av || '', img: okImg(p.img) ? p.img : '' } : null; }; // o perfil aberto (para a foto no ranking)
// v3.71: a app das lojas (Capacitor) pede o id com que entra no RevenueCat
if (window.PrumoLoja) window.PrumoLoja.rcId = () => Acc.call('rcId').then(j => j.id);
Acc.call = (op, body) => S && cur() ? conta(op, body) : Promise.reject(Object.assign(new Error('Sem conta.'), { status: 401 })); // ranking e outras funções do servidor
Acc.take = j => takeConta(j);   // planos: guardar a conta que o servidor devolve depois de assinar, mudar ou cancelar
Acc.navAdm = () => { const N = OS.NAV; if (!N) return; const i = N.findIndex(g => g[0] === 'Admin');
  if (Acc.adm() && i < 0) { N.push(['Admin', [['admin', 'Administração', 'shield']]]); OS.request && OS.request(); } else if (!Acc.adm() && i >= 0) { N.splice(i, 1); OS.request && OS.request(); } };
let ADM = null, admBusy = false, admErr = '';
const admLoad = async () => { if (admBusy) return; admBusy = true; admErr = '';
  fetch(new URL('api/ia?p=estado', document.baseURI).href).then(r => r.json()).then(j => { U.ls.set('os2iaSrv', { g: !!j.google, cl: !!j.claude, stt: j.stt || '', mod: j.modelo || '', at: Date.now() }); }).catch(() => { }); fetch(new URL('api/google?p=estado', document.baseURI).href).then(r => r.json()).then(j => { if (j && j.ok) U.ls.set('os2gSrv', { pronto: !!j.pronto, chave: j.chave || '', erro: j.erro || '', at: Date.now() }); OS.request(); }).catch(() => { }); try { ADM = Object.assign(await conta('admin'), { at: Date.now() }); } catch (e) { admErr = e.net ? 'Sem ligação à internet.' : e.message; } admBusy = false; OS.request(); };
const ago = t => { if (!t) return '—'; const s = Math.max(0, (Date.now() - t) / 1000); if (s < 10) return 'agora'; if (s < 60) return 'há ' + Math.round(s) + ' s'; if (s < 90) return 'há 1 min'; if (s < 3600) return 'há ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h'; const d = Math.round(s / 86400); return d === 1 ? 'ontem' : d < 30 ? 'há ' + d + ' dias' : new Date(t).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT'); };
const hmin = m => { m = Math.round(m || 0); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const lastDays = n => { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); } return out; };
const bars = (dias, n, h) => { const D = lastDays(n), mx = Math.max(30, ...D.map(d => dias[d] || 0)); return `<span class="adm-bars" style="--h:${h}px" role="img" aria-label="Minutos por dia, últimos ${n} dias">${D.map(d => `<i style="height:${Math.round((dias[d] || 0) / mx * 100)}%" title="${d}: ${hmin(dias[d] || 0)}"></i>`).join('')}</span>`; };
// pedidos dos titulares (LGPD/RGPD) e riscos jurídicos: só na administração
const TIPO = { confirmar: 'Confirmar se tratamos dados', acesso: 'Acesso aos dados', corrigir: 'Correção', eliminar: 'Anonimizar, bloquear ou eliminar', portabilidade: 'Portabilidade', partilha: 'Com quem partilhamos', revogar: 'Retirar consentimento', oposicao: 'Oposição', outro: 'Outro' };
const prazo = at => { const d = Math.ceil(15 - (Date.now() - Date.parse(at)) / 864e5); return d > 0 ? `faltam ${d} ${d === 1 ? 'dia' : 'dias'} (LGPD: 15)` : 'prazo de 15 dias ultrapassado'; };
const pedidosPn = () => { const P = ((ADM && ADM.pedidos) || []).slice().sort((a, b) => (a.estado === 'respondido') - (b.estado === 'respondido') || (b.prio || 0) - (a.prio || 0) || String(b.at).localeCompare(String(a.at))), novos = P.filter(p => p.estado !== 'respondido').length;   // v3.29: os do Completo (prioritários) primeiro
  return `<div class="pn" id="admPed"><div class="pn-h"><h3>Pedidos de privacidade (LGPD / RGPD)</h3><span class="mut" style="font-size:12px">${novos ? novos + ' por responder' : 'nenhum por responder'}</span></div>
    ${P.length ? `<div class="adm-ped">${P.map(p => `<div class="adm-pd ${p.estado === 'respondido' ? 'ok' : ''}"><div class="row between" style="gap:8px;flex-wrap:wrap"><b>${esc(TIPO[p.tipo] || p.tipo)}${p.prio ? ' <span class="bdg acc">Completo · prioritário</span>' : ''}</b><small class="mut">${esc(new Date(p.at).toLocaleString(OS.loc ? OS.loc() : 'pt-PT'))} · protocolo ${esc(p.id)}</small></div>
      <small>${esc(p.nome || '')} · ${esc(p.email)}</small><p>${esc(p.msg || '(sem texto)')}</p>
      <div class="row gap8" style="align-items:center;flex-wrap:wrap"><span class="bdg ${p.estado === 'respondido' ? 'pos' : 'warn'}">${p.estado === 'respondido' ? 'respondido' : prazo(p.at)}</span><button class="btn sm ${p.estado === 'respondido' ? 'ghost' : ''}" data-act="admPedido" data-id="${esc(p.id)}" data-e="${p.estado === 'respondido' ? 'novo' : 'respondido'}">${p.estado === 'respondido' ? 'Reabrir' : 'Marcar como respondido'}</button></div></div>`).join('')}</div>`
    : '<p class="mut" style="margin:0">Ainda não há pedidos. Chegam aqui quando alguém usa “Fazer um pedido” em Definições › Privacidade e termos. Responde para o e-mail da pessoa e marca como respondido.</p>'}</div>`; };
A.admPedido = async b => { try { await conta('pedidoFeito', { id: b.dataset.id, estado: b.dataset.e }); OS.UI.toast(b.dataset.e === 'respondido' ? 'Marcado como respondido' : 'Reaberto', 'pos'); ADM = null; admLoad(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
// o que falta ao administrador configurar (some sozinho quando estiver feito)
// Spotify: o Spotify só deixa 5 contas por app (em modo de desenvolvimento): tu e mais até 4 que escolheres; para os outros nem aparece
const spPn = () => { const L = (ADM && ADM.spotify) || [], mx = (ADM && ADM.spMax) || 4, UI = OS.UI;
  return `<div class="pn" id="admSp"><div class="pn-h"><h3>${UI.ic('play')}Spotify</h3><span class="mut" style="font-size:12px">tu + ${L.length} de ${mx}</span></div>
    <p class="mut" style="margin:0 0 10px">Só tu e as contas que escolheres veem o Spotify (o tocador e as definições); para as outras pessoas não aparece. Para dar acesso, abre a conta na lista acima e toca em "Dar acesso ao Spotify". Junta também o e-mail Spotify dessa pessoa em developer.spotify.com › a tua app › User Management.${ADM && !ADM.spConf ? ' <b>Falta pôr a Client ID da app do Spotify no Vercel (SPOTIFY_CLIENT_ID).</b>' : ''}</p>
    ${L.length ? `<div class="list">${L.map(e => `<div class="li"><div class="li-t"><b>${esc(e)}</b></div><button class="btn xs ghost" data-act="admSp" data-e="${esc(e)}" data-on="">Tirar</button></div>`).join('')}</div>` : '<p class="mut" style="margin:0">Ainda só tu.</p>'}</div>`; };
A.admSp = async b => { b.disabled = true; try { const j = await conta('adminSpotify', { email: b.dataset.e, on: b.dataset.on === '1' }); if (ADM) { ADM.spotify = j.emails; (ADM.contas || []).forEach(c => { c.sp = c.admin || j.emails.includes(String(c.email).toLowerCase()); }); }
  OS.UI.closeModal(); OS.UI.toast(b.dataset.on === '1' ? 'Spotify liberado para ' + b.dataset.e : 'Spotify tirado de ' + b.dataset.e, 'pos'); OS.request(); } catch (e) { b.disabled = false; OS.UI.toast(e.message || 'Não consegui mudar o acesso.', 'neg'); } };
// v3.31: códigos de desconto (criados aqui, usados na página Planos ao assinar; o desconto é aplicado pelo Stripe)
let CUP = null, cupBusy = false;
const cupLoad = async () => { if (cupBusy) return; cupBusy = true; try { CUP = await conta('adminCupoes'); } catch (e) { CUP = { erro: e.message || 'Não consegui ler os códigos.' }; } cupBusy = false; OS.request(); };
const PLN3 = [['essencial', 'Essencial'], ['avancado', 'Avançado'], ['completo', 'Completo']];
const cupDurTxt = c => c.dur === 'forever' ? 'para sempre' : c.dur === 'repeating' ? `durante ${c.meses} ${c.meses === 1 ? 'mês' : 'meses'}` : 'só no 1.º pagamento';
const cupPn = () => { if (!CUP && !cupBusy) setTimeout(cupLoad, 0); const UI = OS.UI, L = (CUP && CUP.cupoes) || [];
  const body = !CUP ? '<p class="mut" style="margin:0">A carregar…</p>' : CUP.erro ? `<p class="mut" style="margin:0">${esc(CUP.erro)}</p>` : CUP.cobranca === false ? '<p class="mut" style="margin:0">Os códigos de desconto ficam disponíveis quando o Stripe estiver ligado (STRIPE_SECRET_KEY no Vercel).</p>'
    : `<form data-form="admCup" class="adm-cup">
        <label>Código<input class="field" name="code" maxlength="30" autocapitalize="characters" spellcheck="false" placeholder="Ex.: LANCAMENTO20" required></label>
        <label>Desconto (%)<input class="field" name="pct" type="number" min="1" max="100" step="1" value="20" required></label>
        <label>Duração<select class="field" name="dur"><option value="once">Só no 1.º pagamento</option><option value="repeating">Durante uns meses</option><option value="forever">Para sempre</option></select></label>
        <label>Meses (se for "durante uns meses")<input class="field" name="meses" type="number" min="1" max="36" value="3"></label>
        <label>Limite de usos (vazio = sem limite)<input class="field" name="max" type="number" min="1" placeholder="Sem limite"></label>
        <label>Válido até (opcional)<input class="field" name="expira" type="date"></label>
        <fieldset class="adm-cupp"><legend>Serve para</legend>${PLN3.map(([k, n]) => `<label class="ck"><input type="checkbox" name="pl_${k}" checked> ${n}</label>`).join('')}</fieldset>
        <label class="ck"><input type="checkbox" name="novos"> Só para quem assina pela primeira vez</label>
        <button class="btn pri" type="submit">${UI.ic('plus')}Criar código</button></form>
      ${L.length ? `<div class="list adm-cupl">${L.map(c => `<div class="li${c.ativo ? '' : ' off'}"><div class="li-t"><b class="mono">${esc(c.code)}</b><small>−${c.pct}% ${esc(cupDurTxt(c))} · ${(c.planos || []).length ? esc(c.planos.map(x => (PLN3.find(p => p[0] === x) || [, x])[1]).join(', ')) : 'todos os planos'}${c.novos ? ' · só 1.ª assinatura' : ''}</small>
          <small class="mut">${c.usos || 0}${c.max ? ' de ' + c.max : ''} ${(c.usos || 0) === 1 ? 'uso' : 'usos'}${c.expira ? ' · até ' + new Date(c.expira).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT') : ''}</small></div>
          ${c.ativo ? `<span class="bdg pos">ativo</span><button class="btn xs ghost" data-act="admCupFim" data-promo="${esc(c.promo)}">Desativar</button>` : '<span class="bdg">desativado</span>'}</div>`).join('')}</div>` : '<p class="mut" style="margin:12px 0 0">Ainda não há códigos.</p>'}`;
  return `<div class="pn" id="admCup"><div class="pn-h"><h3>${UI.ic('star')}Códigos de desconto</h3><span class="mut" style="font-size:12px">${L.filter(c => c.ativo).length} ativos</span></div>
    <p class="mut" style="margin:0 0 12px">Cria um código e partilha-o. Quem o escrever na página Planos (ou na página de pagamento) assina com o desconto; o Stripe aplica-o e ele aparece nas faturas. Desativar um código não mexe em quem já o usou.</p>${body}</div>`; };
OS.forms.admCup = async (f, v) => { const bt = f.querySelector('button[type=submit]'); bt.disabled = true;
  const planos = PLN3.map(p => p[0]).filter(k => f.querySelector(`[name=pl_${k}]`).checked); if (!planos.length) { bt.disabled = false; OS.UI.toast('Escolhe pelo menos um plano.', 'warn'); return; }
  try { const j = await conta('adminCupaoCriar', { code: v('code'), pct: +v('pct'), dur: v('dur'), meses: +v('meses') || 0, max: +v('max') || 0, expira: v('expira') || '', planos, novos: !!f.querySelector('[name=novos]').checked });
    OS.UI.toast('Código ' + j.cupao.code + ' criado: −' + j.cupao.pct + '%', 'pos'); CUP = null; cupLoad(); }
  catch (e) { bt.disabled = false; OS.UI.toast(e.message || 'Não consegui criar o código.', 'neg'); } };
A.admCupFim = async b => { if (!confirm('Desativar este código? Quem já o usou mantém o desconto.')) return; b.disabled = true;
  try { await conta('adminCupaoFim', { promo: b.dataset.promo }); OS.UI.toast('Código desativado', 'pos'); CUP = null; cupLoad(); } catch (e) { b.disabled = false; OS.UI.toast(e.message || 'Não consegui desativar.', 'neg'); } };
const pendN = () => pendPn(true);
const pendPn = soN => { const g = !!(OS.AI && OS.AI.srvGoogle && OS.AI.srvGoogle()), gs = U.ls.get('os2gSrv', null);
  const L = [[!g, 'Chave Google da IA para todos (GEMINI_API_KEY)', 'Para a IA das contas ler fotos (comida, exames, escala) e PDFs. 1) aistudio.google.com/apikey → Create API key. 2) Vercel → projeto prumo → Settings → Environment Variables → nome <b>GEMINI_API_KEY</b>, valor a chave, Production. 3) Deployments → Redeploy. Este aviso some sozinho quando a chave estiver ativa.'],
    [!(gs && gs.pronto && gs.chave === 'ok'), 'Gmail e agenda para todos (Google)', !gs ? 'A verificar a ligação ao Google…' : gs.chave === 'errada' ? 'O Google não aceita a chave secreta que está no Vercel. Google Cloud → Google Auth Platform → Clientes → Prumo web → Adicionar chave secreta; depois Vercel → prumo → Settings → Environment Variables → <b>GOOGLE_CLIENT_SECRET</b> → Edit, cola a nova → Save → Redeploy.' : gs.chave === 'redirecionamento' ? 'Falta o URI de redirecionamento no cliente do Google: Clientes → Prumo web → URIs de redirecionamento autorizados → <b>https://nautilo-app.vercel.app/api/google</b> → Salvar.' : !gs.pronto || gs.chave === 'falta' ? 'Falta a chave secreta do cliente OAuth no servidor: Google Cloud → Google Auth Platform → Clientes → Prumo web → Adicionar chave secreta. Depois Vercel → projeto prumo → Settings → Environment Variables → nome <b>GOOGLE_CLIENT_SECRET</b>, Production → Save → Redeploy.' : 'O Google não respondeu à verificação (' + esc(gs.erro || '?') + '). Toca em Atualizar daqui a pouco.']];
  // v3.21: cobrança (Stripe) e e-mail do código de verificação: o servidor só diz se está ligado (os valores nunca saem de lá)
  const cf = (ADM && ADM.cfg) || {}, VC = 'Vercel › projeto prumo › Settings › Environment Variables';
  L.push([!cf.stripe, 'Cobrança das assinaturas (Stripe)', `Enquanto isto não estiver feito, ninguém fica bloqueado: o app funciona como Completo para todos. O Prumo cria sozinho no Stripe os produtos, o portal do cliente e a página de pagamento com o nome, o selo e as cores do Prumo.<ol class="adm-steps">
      <li>No Stripe, ativa os pagamentos: os teus dados, o NIF e o IBAN para onde vai o dinheiro.</li>
      <li>Tira o outro negócio e põe o Prumo: Definições (Settings) › Dados da empresa / Dados públicos (Business details / Public details): nome da conta e nome público <b>Prumo</b>, site <b>https://prumo-vida.vercel.app</b>, descrição "Assinatura da app Prumo (organização pessoal)", nome na fatura do cartão (statement descriptor) <b>PRUMO</b> e um e-mail de apoio.</li>
      <li>Programadores (Developers) › Chaves de API (API keys) › copia a <b>chave secreta</b>. Para experimentar primeiro usa a de teste (começa por <b>sk_test_</b>); a real começa por <b>sk_live_</b>.</li>
      <li>${VC} › Add › nome <b>STRIPE_SECRET_KEY</b>, valor a chave, ambiente Production › Save. Depois Deployments › ⋯ › Redeploy.</li></ol>`]);
  L.push([!!(cf.stripe && cf.stripeTeste), 'O Stripe está em modo de teste', 'Os pagamentos são a fingir: experimenta com o cartão <b>4242 4242 4242 4242</b>, uma data futura e qualquer CVC. <b>Não deixes ficar assim</b>: com a chave de teste qualquer pessoa assina com esse cartão sem pagar. Quando acabares, troca o valor de <b>STRIPE_SECRET_KEY</b> pela chave real (sk_live_…) e faz Redeploy; as assinaturas de teste deixam de contar sozinhas.']);
  L.push([!cf.mail, 'E-mail com o código de verificação (Brevo)', `Sem isto o registo não pede o código (as contas criam-se na mesma). Sem domínio próprio, o mais simples é o Brevo, grátis até 300 e-mails por dia.<ol class="adm-steps">
      <li>Cria a conta em <b>brevo.com</b>.</li>
      <li>Definições › Remetentes, domínios e IPs (Senders, domains, IPs) › Remetentes › Adicionar: nome <b>Prumo</b> e o teu e-mail. Confirma com o código que te chega.</li>
      <li>Definições › SMTP e API › Chaves de API (API keys) › Gerar uma chave nova › copia-a.</li>
      <li>${VC}: <b>BREVO_API_KEY</b> = a chave; <b>NAUTILO_EMAIL_DE</b> = <b>Prumo &lt;o e-mail que confirmaste&gt;</b>. Save e Redeploy.</li></ol>
      Com um e-mail do Gmail, o Brevo envia por um endereço dele (@brevosend.com) e alguns e-mails podem cair no spam. Com um domínio teu (ex.: prumo.app) fica perfeito; aí também serve o Resend (<b>RESEND_API_KEY</b>).`]);
  L.push([!!(cf.mail && !cf.mailDe), 'Falta o remetente do e-mail (NAUTILO_EMAIL_DE)', cf.mail === 'brevo' ? `O Brevo só envia com um remetente confirmado: ${VC} › <b>NAUTILO_EMAIL_DE</b> = <b>Prumo &lt;o e-mail que confirmaste no Brevo&gt;</b> › Save › Redeploy.` : `Sem remetente, o Resend só entrega ao teu próprio e-mail. Junta o teu domínio no Resend (Domains) e depois ${VC} › <b>NAUTILO_EMAIL_DE</b> = <b>Prumo &lt;nao-responder@o-teu-dominio&gt;</b> › Save › Redeploy.`]);
  const P = L.filter(x => x[0]); if (soN === true) return P.length;
  const mt = cf.mail ? `<div class="adm-mt"><div class="row gap8" style="align-items:center;flex-wrap:wrap"><span class="grow">E-mail do código: <b>${cf.mail === 'brevo' ? 'Brevo' : cf.mail === 'resend' ? 'Resend' : 'teste'}</b> ligado.</span><button class="btn sm" data-act="admMailTest">Enviar um e-mail de teste para mim</button></div><div id="admMailOut" class="adm-out" hidden></div></div>` : '';
  return `<div class="pn" id="admPend"><div class="pn-h"><h3>Por fazer</h3><span class="mut" style="font-size:12px">${P.length ? P.length + ' pendente' + (P.length > 1 ? 's' : '') : 'tudo feito'}</span></div>
  <div class="adm-risk">${P.map(([, t, d]) => `<details open><summary><span class="bdg warn">pendente</span><b>${esc(t)}</b></summary><div class="adm-rb">${d}</div></details>`).join('') || '<p class="mut" style="margin:0">Nada pendente.</p>'}</div>${mt}</div>`; };
// v3.24: o e-mail de teste mostra o que o serviço respondeu (e o que fazer)
const mailDica = m => /\bip\b/i.test(m) && /(unrecogni|not authori|authorised|authorized)/i.test(m) ? 'No Brevo: Definições › Segurança › IPs autorizados (app.brevo.com/security/authorised_ips) › desativa o bloqueio de IPs. Não adiciones só um IP: o Vercel usa vários e mudam.'
  : /sender|remetente|from/i.test(m) ? 'O remetente não está confirmado no Brevo. Em Remetentes, confirma o e-mail que puseste em NAUTILO_EMAIL_DE (tem de ser exatamente o mesmo).'
  : /key not found|unauthori|invalid api key|api-key/i.test(m) ? 'A chave não está certa. Gera outra em SMTP e API › Chaves de API (a chave de API, não a SMTP) e troca BREVO_API_KEY no Vercel.'
  : /activat|not yet|suspend|blocked|permission/i.test(m) ? 'A conta do Brevo ainda não está ativada para enviar. Vê o e-mail do Brevo ou a página da conta e completa o que pedirem (às vezes pedem para validar a conta).' : '';
A.admMailTest = async b => { b.disabled = true; const o = document.getElementById('admMailOut');
  try { const j = await conta('adminTesteEmail'); if (o) { o.hidden = false; o.innerHTML = j.enviado ? `<p style="margin:0"><b class="pos">Enviado.</b> Vê a caixa de entrada (e o spam) de ${esc(j.para)}: assunto "O teu código do Prumo: 123456".</p>` : `<p style="margin:0 0 6px"><b class="neg">O ${esc(j.via === 'brevo' ? 'Brevo' : j.via)} recusou o envio</b> (código ${esc(String(j.st || '?'))}).</p><p style="margin:0 0 6px" class="mut">Resposta: ${esc(j.msg || '—')}</p>${mailDica(j.msg || '') ? `<p style="margin:0"><b>O que fazer:</b> ${esc(mailDica(j.msg || ''))}</p>` : ''}`; } }
  catch (e) { OS.UI.toast(e.message || 'Não consegui testar.', 'neg'); } finally { b.disabled = false; } };
OS.views.admin = () => { const UI = OS.UI, head = UI.head('Administração', 'Contas, visitas, vendas e servidor. As senhas e os dados das pessoas nunca aparecem aqui.', `<button class="btn" data-act="admRefresh">${UI.ic('sync')}Atualizar</button>`, 'Admin');
  if (!Acc.adm()) return head + '<div class="pn"><p class="mut" style="margin:0">Esta área é só para a conta de administração.</p></div>';
  if (!ADM || Date.now() - ADM.at > 120e3) { if (!admBusy && !admErr) setTimeout(admLoad, 0); if (!ADM) return head + `<div class="pn"><p class="mut" style="margin:0">${admErr ? esc(admErr) + ' <button class="btn sm" data-act="admRefresh">Tentar outra vez</button>' : 'A carregar as contas…'}</p></div>`; }
  const L = ADM.contas || [], t = today(), D7 = lastDays(7), act = days => L.filter(c => Math.max(c.ultUso || 0, c.ultEntrada || 0) > Date.now() - days * 864e5).length;
  const minToday = L.reduce((n, c) => n + ((c.dias || {})[t] || 0), 0), min7 = L.reduce((n, c) => n + D7.reduce((m, d) => m + ((c.dias || {})[d] || 0), 0), 0);
  // v3.69: arrumada em separadores, com o que precisa de ti em cima
  const tab = ADM_TABS.some(x => x[0] === OS.ui.admTab) ? OS.ui.admTab : 'contas', cf = ADM.cfg || {};
  const novos = (ADM.pedidos || []).filter(p => p.estado !== 'respondido').length, pend = pendN();
  const alerta = [novos && ['pedidos', `${novos} ${novos === 1 ? 'pedido por responder' : 'pedidos por responder'}`, 'warn'], pend && ['ajustes', `${pend} ${pend === 1 ? 'coisa por configurar' : 'coisas por configurar'}`, 'warn'],
    MAN.on && ['servidor', 'Manutenção ligada até às ' + manH(MAN.ate), 'warn'], SAU.s && SAU.s.ultima && !SAU.s.ultima.ok && ['servidor', 'A última verificação do servidor falhou', 'neg'], cf.stripe && cf.stripeTeste && ['vendas', 'O Stripe está em modo de teste', 'neg']].filter(Boolean);
  const badge = k => k === 'pedidos' && novos ? `<b class="adm-tb-n">${novos}</b>` : k === 'ajustes' && pend ? `<b class="adm-tb-n">${pend}</b>` : k === 'contas' ? `<small>${ADM.total}</small>` : '';
  const corpo = tab === 'contas' ? `  <div class="adm-kpi"><div><b class="mono">${ADM.total}</b><span>contas</span></div><div class="adm-kon"><b class="mono" id="admOnline">${L.filter(c => c.online).length}</b><span>online agora</span></div><div><b class="mono">${act(7)}</b><span>ativas em 7 dias</span></div><div><b class="mono">${hmin(minToday)}</b><span>de uso hoje (todos)</span></div></div>
  <ul class="adm-kmais"><li><b class="mono">${ADM.perfis}</b> perfis</li><li><b class="mono">${act(1)}</b> ativas hoje</li><li><b class="mono">${act(30)}</b> ativas em 30 dias</li><li><b class="mono">${act(7) ? hmin(min7 / 7 / act(7)) : '—'}</b> por dia, por conta ativa</li></ul>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('users')}Contas</h3><div class="row gap8 adm-tools"><input type="search" id="admQ" class="field" placeholder="Procurar por nome ou e-mail" aria-label="Procurar contas"><button class="btn sm ghost" data-act="admCsv">Exportar CSV</button></div></div>
    <p class="adm-exp"><b>Última entrada</b>: quando a pessoa abriu o Prumo pela última vez (ou voltou a ele depois de 10 minutos fora, ou fez login). <b>Último acesso</b>: o último momento em que esteve a usar o Prumo; enquanto usa vai-se atualizando e aparece <b class="pos">online agora</b>. Esta lista atualiza-se sozinha a cada 20 segundos.</p>
    <div class="adm-t" role="table" aria-label="Contas"><div class="adm-r adm-hd" role="row"><span role="columnheader">Pessoa</span><span role="columnheader">Último acesso</span><span role="columnheader">Última entrada</span><span role="columnheader">Hoje</span><span role="columnheader">7 dias</span><span role="columnheader">Criada</span></div>
    ${L.map((c, i) => { const d7 = D7.reduce((m, d) => m + ((c.dias || {})[d] || 0), 0), P = c.perfis || [];
      return `<button class="adm-r${c.online ? ' is-on' : ''}" role="row" data-act="admOne" data-i="${i}" data-uid="${esc(c.uid || '')}" data-q="${esc((c.nome + ' ' + c.email + ' ' + P.join(' ')).toLowerCase())}"><span role="cell" class="adm-who"><b>${esc(c.nome || P[0] || '—')}${c.admin ? ' <small class="mu-tag">admin</small>' : ''}</b><small>${esc(c.email)}</small>${plTag(c.plano)}<small class="mut">${P.length} ${P.length === 1 ? 'perfil' : 'perfis'}${P.length ? ': ' + esc(P.join(', ')) : ''}</small></span>
        <span role="cell"><em>Último acesso</em><span class="adm-ua" data-t="${c.ultUso || c.ultEntrada || ''}" data-on="${c.online ? '1' : ''}">${liveCell(c.ultUso || c.ultEntrada, c.online)}</span></span><span role="cell"><em>Última entrada</em><span class="adm-ue" data-t="${c.ultEntrada || ''}">${ago(c.ultEntrada)}</span>${c.entradas ? ` <small class="mut" title="logins com e-mail e senha">(${c.entradas} ${c.entradas === 1 ? 'login' : 'logins'})</small>` : ''}</span><span role="cell" class="mono"><em>Hoje</em><span class="adm-hj">${hmin((c.dias || {})[t] || 0)}</span></span><span role="cell"><em>7 dias</em>${bars(c.dias || {}, 7, 22)} <small class="mono">${hmin(d7)}</small></span><span role="cell"><em>Criada</em>${c.criado ? new Date(c.criado).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT') : '—'}</span></button>`; }).join('') || '<p class="mut" style="padding:12px">Ainda não há contas.</p>'}</div></div>
` : tab === 'visitas' ? visPn() : tab === 'vendas' ? vendasPn() + cupPn() : tab === 'pedidos' ? pedidosPn() : tab === 'servidor' ? sauPn() + errPn() + avPn() + manPn() + relPn()
    : pendPn() + intPn() + spPn() + `<div class="pn"><div class="pn-h"><h3>${UI.ic('lock')}O teu cofre de Senhas</h3></div><p class="mut" style="margin:0 0 10px">A senha mestra do teu cofre muda-se no próprio cofre (pede a atual). O cofre de cada pessoa está cifrado no aparelho dela com a senha mestra dela, que nunca sai de lá: ninguém o consegue abrir nem mudar, nem a administração. É isso que o protege.</p><button class="btn sm" data-act="admVault">${UI.ic('lock')}Mudar a senha mestra do meu cofre</button></div>`;
  if (tab === 'visitas' && !VIS.v && !VIS.busy) setTimeout(visLoad, 0); if (tab === 'servidor' && !SAU.s && !SAU.busy) setTimeout(() => sauLoad(false), 0); if (tab === 'servidor' && !AVX.v && !AVX.busy) setTimeout(avsLoad, 0); if (tab === 'servidor' && !ERR.v && !ERR.busy) setTimeout(errLoad, 0);
  return head + `<div class="adm">
  <div class="adm-alerta${alerta.length ? '' : ' ok'}" role="status">${alerta.length ? `<span class="adm-al-t">Precisa de ti</span>${alerta.map(([k, t, c]) => `<button class="adm-al ${c}" data-act="admTab" data-tab="${k}">${esc(t)}</button>`).join('')}` : `<span class="adm-al-t">Tudo em ordem</span><span class="mut">Sem pedidos por responder nem nada por configurar.</span>`}</div>
  <div class="adm-tabs" role="tablist" aria-label="Partes da administração">${ADM_TABS.map(([k, n, ic]) => `<button role="tab" id="admT-${k}" aria-selected="${k === tab}" aria-controls="admP" data-act="admTab" data-tab="${k}">${UI.ic(ic)}<span>${n}</span>${badge(k)}</button>`).join('')}</div>
  <div class="adm-p" id="admP" role="tabpanel" aria-labelledby="admT-${tab}" data-tab="${tab}">
${corpo}  </div>
  <p class="mut adm-note">Atualizado <span id="admAt">${ago(ADM.vivoAt || ADM.at)}</span> (sozinho, a cada 20 s). O tempo de uso conta os minutos com o Prumo aberto e à vista (desbloqueado). Estes dados estão descritos na Política de Privacidade.</p></div>`; };
// v3.71: integrações opcionais (não contam como "por fazer"): o que cada uma precisa e se já está ativa
const intPn = () => { const UI = OS.UI, cf = (ADM && ADM.cfg) || {}, VC = 'Vercel › projeto prumo › Settings › Environment Variables', ORIG = 'https://prumo-vida.vercel.app';
  const L = [['strava', 'Strava (e Garmin pelo Strava)', `<ol class="adm-steps"><li>Em <b>strava.com/settings/api</b> cria a app: nome <b>Prumo</b>, site <b>${ORIG}</b>, <b>Authorization Callback Domain</b>: <b>prumo-vida.vercel.app</b>.</li>
      <li>${VC}: <b>STRAVA_CLIENT_ID</b> e <b>STRAVA_CLIENT_SECRET</b> (os dois que o Strava mostra) › Save › Redeploy.</li>
      <li>Uma app nova do Strava só aceita 1 atleta (tu). Para abrir a todas as contas, pede o aumento no formulário do <b>Strava Developer Program</b> (pedem capturas do Prumo e como usas os dados). Os dados do Strava ficam fora da IA do Prumo, como as regras deles exigem.</li></ol>`],
    ['oura', 'Oura (anel)', `<ol class="adm-steps"><li>Em <b>cloud.ouraring.com/oauth/applications</b> cria a aplicação: <b>Redirect URI</b> <b>${ORIG}/api/liga</b>; permissões <b>daily</b>, <b>heartrate</b>, <b>workout</b>, <b>session</b> e <b>personal</b>.</li>
      <li>${VC}: <b>OURA_CLIENT_ID</b> e <b>OURA_CLIENT_SECRET</b> › Save › Redeploy.</li>
      <li>Como o Prumo é pago, as regras da Oura pedem autorização escrita deles antes de abrir a todos: escreve-lhes pela página de parceiros da Oura. Até lá usa só na tua conta. Os dados da Oura ficam fora da IA do Prumo.</li></ol>`],
    ['revenuecat', 'Compras nas lojas (RevenueCat)', `<ol class="adm-steps"><li>Em <b>app.revenuecat.com</b> cria o projeto Prumo e liga a Play Store e a App Store; cria os <b>entitlements</b> <b>essencial</b>, <b>avancado</b> e <b>completo</b> com os produtos de cada plano.</li>
      <li>Project settings › API keys › copia a <b>chave secreta</b> (sk_…). ${VC}: <b>REVENUECAT_API_KEY</b> = essa chave.</li>
      <li>Integrations › Webhooks › Add: URL <b>${ORIG}/api/revenuecat</b>; em <b>Authorization header</b> inventa uma senha comprida e põe a mesma em ${VC} como <b>REVENUECAT_WEBHOOK_AUTH</b>. Save › Redeploy.</li></ol>`],
    ['', 'Readwise', '<p class="mut" style="margin:0">Nada a configurar: cada pessoa liga a sua conta do Readwise em Definições › Ligações.</p>']];
  return `<div class="pn" id="admInt"><div class="pn-h"><h3>${UI.ic('sync')}Integrações opcionais</h3><span class="mut" style="font-size:12px">não contam como pendentes</span></div>
    <div class="adm-risk">${L.map(([k, t, d]) => `<details${k && !cf[k] ? '' : ''}><summary><span class="bdg ${!k || cf[k] ? 'pos' : ''}">${!k ? 'pronto' : cf[k] ? 'ativa' : 'desligada'}</span><b>${esc(t)}</b></summary><div class="adm-rb">${d}</div></details>`).join('')}</div></div>`; };
const ADM_TABS = [['contas', 'Contas', 'users'], ['visitas', 'Visitas', 'chart'], ['vendas', 'Vendas', 'star'], ['pedidos', 'Pedidos', 'note'], ['servidor', 'Servidor', 'heart'], ['ajustes', 'Ajustes', 'settings']];
A.admTab = b => { OS.setUI('admTab', b.dataset.tab); requestAnimationFrame(() => { const t = document.getElementById('admT-' + b.dataset.tab); if (t) { t.scrollIntoView({ block: 'nearest', inline: 'center' }); if (b.classList.contains('adm-al')) t.focus(); } }); };
// Vendas: como está a cobrança e quantas contas há em cada plano (só números)
const vendasPn = () => { const UI = OS.UI, cf = ADM.cfg || {}, L = ADM.contas || [], G = { pago: 0, teste: 0, oferta: 0, sem: 0 }, P = {};
  L.forEach(c => { const pl = c.plano; if (!pl || pl.admin) return; if (pl.pago) { G.pago++; P[pl.n] = (P[pl.n] || 0) + 1; } else if (pl.oferta) G.oferta++; else if (pl.teste) G.teste++; else if (pl.acabou) G.sem++; });
  const st = !cf.stripe ? ['warn', 'Cobrança desligada', 'Ainda ninguém paga: o app funciona como Completo para todos. Vê o passo a passo em Ajustes.'] : cf.stripeTeste ? ['neg', 'Stripe em modo de teste', 'Os pagamentos são a fingir. Troca a chave de teste pela real (sk_live_) em Ajustes.'] : ['pos', 'Cobrança ligada (Stripe)', 'As assinaturas são cobradas a sério; as faturas saem do Stripe.'];
  return `<div class="pn"><div class="pn-h"><h3>${UI.ic('star')}Assinaturas</h3><span class="bdg ${st[0]}">${st[1]}</span></div><p class="mut" style="margin:0 0 12px">${st[2]}</p>
    <div class="adm-kpi"><div><b class="mono">${G.pago}</b><span>a pagar</span></div><div><b class="mono">${G.teste}</b><span>no teste grátis</span></div><div><b class="mono">${G.oferta}</b><span>com plano oferecido</span></div><div><b class="mono">${G.sem}</b><span>sem plano</span></div></div>
    ${Object.keys(P).length ? `<p style="margin:12px 0 0">${Object.entries(P).map(([n, c]) => `<b>${esc(n)}</b>: ${c}`).join(' · ')}</p>` : ''}</div>`; };
A.admVault = () => { OS.setUI('vltMx', 1); OS.go('senhas'); };
A.admRefresh = () => { ADM = null; admErr = ''; CUP = null; admLoad(); OS.request(); };
// tempo real: com o separador aberto e à vista, pergunta ao servidor a cada 20 s quem está online e atualiza as células sem redesenhar a página
const liveCell = (t, on) => on ? '<i class="adm-on" aria-hidden="true"></i><b class="pos">online agora</b>' : ago(t);
let vivoBusy = false;
const admVivo = async () => { if (vivoBusy || !ADM || !Acc.adm() || document.hidden || !/^#admin/.test(location.hash)) return; vivoBusy = true;
  try { const j = await conta('adminVivo'), V = j.vivo || {}; (ADM.contas || []).forEach(c => { const v = V[c.uid]; if (!v) return; c.ultUso = v.ultUso; c.online = v.online; c.tot = v.tot; c.dias = v.dias; c.ultEntrada = Math.max(v.ab || 0, c.login || 0); }); ADM.vivoAt = Date.now(); paintLive(); } catch (e) { } vivoBusy = false; };
const paintLive = () => { if (!ADM) return; const t = today();
  document.querySelectorAll('#view .adm-r[data-uid]').forEach(r => { const c = (ADM.contas || []).find(x => x.uid === r.dataset.uid); if (!c) return;
    const a = r.querySelector('.adm-ua'), e = r.querySelector('.adm-ue'), h = r.querySelector('.adm-hj'); if (a) { a.dataset.t = c.ultUso || c.ultEntrada || ''; a.dataset.on = c.online ? '1' : ''; } if (e) e.dataset.t = c.ultEntrada || ''; if (h) h.textContent = hmin((c.dias || {})[t] || 0); r.classList.toggle('is-on', !!c.online); });
  const k = document.getElementById('admOnline'); if (k) k.textContent = (ADM.contas || []).filter(c => c.online).length;
  const u = document.getElementById('admAt'); if (u) u.textContent = ago(ADM.vivoAt || ADM.at); tickLive(); };
const tickLive = () => { document.querySelectorAll('#view .adm-ua[data-t], #view .adm-ue[data-t]').forEach(el => { const on = el.dataset.on === '1', v = liveCell(+el.dataset.t || 0, on); if (el._v !== v) { el._v = v; el.innerHTML = v; } }); };
setInterval(admVivo, 20e3); setInterval(() => { if (/^#admin/.test(location.hash) && !document.hidden) tickLive(); }, 5e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden && /^#admin/.test(location.hash)) admVivo(); });
A.admOne = b => { const c = ADM && ADM.contas[+b.dataset.i]; if (!c) return; const D = lastDays(30), tot = D.reduce((m, d) => m + ((c.dias || {})[d] || 0), 0), on = D.filter(d => (c.dias || {})[d]).length;
  OS.UI.modal(`<div style="padding:20px"><div class="row between" style="align-items:center"><h3 style="margin:0">${esc(c.nome || c.email)}</h3><button class="icon-btn" data-mclose aria-label="Fechar">${OS.UI.ic('x')}</button></div><p class="mut" style="margin:4px 0 14px">${esc(c.email)}</p>
    <div class="dc-rows"><div><span>Perfis</span><b>${esc((c.perfis || []).join(', ') || '—')}</b></div><div><span>Conta criada</span><b>${c.criado ? new Date(c.criado).toLocaleString(OS.loc ? OS.loc() : 'pt-PT') : '—'}</b></div><div><span>Última entrada no app</span><b>${c.ultEntrada ? new Date(c.ultEntrada).toLocaleString(OS.loc ? OS.loc() : 'pt-PT') : '—'}</b></div><div><span>Último acesso</span><b>${c.online ? '<span class="pos">online agora</span>' : c.ultUso ? new Date(c.ultUso).toLocaleString(OS.loc ? OS.loc() : 'pt-PT') : '—'}</b></div><div><span>Último login (e-mail e senha)</span><b>${c.login ? new Date(c.login).toLocaleString(OS.loc ? OS.loc() : 'pt-PT') : '—'}</b></div><div><span>Logins</span><b class="mono">${c.entradas || 0}</b></div><div><span>Tempo total no app</span><b class="mono">${hmin(c.tot || 0)}</b></div><div><span>Termos aceites</span><b>${c.termos ? 'versão de ' + esc(c.termos) + (c.termosAt ? ' · ' + new Date(c.termosAt).toLocaleString(OS.loc ? OS.loc() : 'pt-PT') : '') : 'ainda não'}</b></div><div><span>Uso nos últimos 30 dias</span><b class="mono">${hmin(tot)} · ${on} ${on === 1 ? 'dia' : 'dias'}</b></div></div>
    ${admPlanSec(c, +b.dataset.i)}
    <h4 style="margin:16px 0 6px">Minutos por dia (30 dias)</h4>${bars(c.dias || {}, 30, 90)}<div class="adm-ax"><span>${D[0].slice(8)}/${D[0].slice(5, 7)}</span><span>hoje</span></div>
    ${c.admin ? '<p class="mut" style="margin:14px 0 0">Spotify: tens sempre (administrador).</p>' : `<div class="row gap8" style="margin-top:14px;align-items:center;flex-wrap:wrap"><span class="grow">Spotify: <b>${c.sp ? 'tem acesso' : 'sem acesso'}</b></span>${c.sp ? `<button class="btn sm ghost" data-act="admSp" data-e="${esc(c.email)}" data-on="">Tirar acesso ao Spotify</button>` : `<button class="btn sm" data-act="admSp" data-e="${esc(c.email)}" data-on="1" ${((ADM && ADM.spotify) || []).length >= ((ADM && ADM.spMax) || 4) ? 'disabled title="Já há 4 contas com o Spotify"' : ''}>Dar acesso ao Spotify</button>`}</div>`}
    ${c.admin || c.email === Acc.email() ? '' : `<div class="adm-acc"><h4 style="margin:18px 0 6px">Repor a senha de login</h4><p class="mut" style="margin:0 0 10px">A pessoa entra com uma senha temporária e tem logo de escolher outra. As sessões abertas terminam e ela vê um aviso. Os dados ficam todos. O cofre de Senhas dela não muda (só ela o abre).</p>
      <form data-form="admPw" data-i="${+b.dataset.i}" class="adm-f"><input type="text" name="nova" autocomplete="off" placeholder="Senha temporária (vazio = gerar uma)" minlength="8"><input type="password" name="senha" autocomplete="current-password" placeholder="A tua senha (administrador)" required><button class="btn" type="submit">Repor a senha</button></form><div class="adm-out" id="admPwOut" hidden></div>
      <h4 style="margin:18px 0 6px">Mudar o e-mail da conta</h4><p class="mut" style="margin:0 0 10px">A conta passa inteira para o novo e-mail: perfis, dados, ranking, Google e atalhos. Nada se perde. A pessoa entra com o novo e-mail e a mesma senha.</p>
      <form data-form="admEmail" data-i="${+b.dataset.i}" class="adm-f"><input type="email" name="novo" autocomplete="off" placeholder="Novo e-mail" required><input type="password" name="senha" autocomplete="current-password" placeholder="A tua senha (administrador)" required><button class="btn" type="submit">Mudar o e-mail</button></form></div>`}
    <div class="adm-acc"><h4 style="margin:18px 0 6px">Repor o cofre de Senhas</h4><p class="mut" style="margin:0 0 10px">Para quando a senha mestra se perdeu. O cofre está cifrado com essa senha, que ninguém conhece (nem o Prumo, nem tu): por isso não dá para a mudar sem ela. Ao repor, o cofre fica vazio e ${c.email === Acc.email() ? 'crias' : 'a pessoa cria'} uma senha mestra nova ao abrir Senhas. <b>As senhas que lá estavam perdem-se.</b>${c.email === Acc.email() ? ' Se ainda sabes a tua senha mestra, muda-a em Eu › Senhas › Senha mestra e segurança, sem perder nada.' : ''}</p>
      <form data-form="admCofre" data-i="${+b.dataset.i}" class="adm-f">${(c.perfis || []).length > 1 ? `<select name="pid" class="field" aria-label="Perfil"><option value="">Todos os perfis</option>${(c.pids || []).map((id, k) => `<option value="${esc(id)}">${esc((c.perfis || [])[k] || id)}</option>`).join('')}</select>` : ''}<input type="password" name="senha" autocomplete="current-password" placeholder="A tua senha (administrador)" required><button class="btn danger" type="submit">Repor o cofre</button></form></div>
    ${c.admin || c.email === Acc.email() ? '' : `<div class="adm-del"><h4 style="margin:18px 0 6px">Apagar esta conta</h4><p class="mut" style="margin:0 0 10px">Apaga a conta, todos os perfis e os dados dela (também do ranking). Não se pode desfazer.</p>
      <form data-form="admDel" data-i="${+b.dataset.i}" class="row gap8" style="flex-wrap:wrap"><input type="password" name="senha" autocomplete="current-password" placeholder="A tua senha (administrador)" required style="flex:1;min-width:180px"><button class="btn danger" type="submit">Apagar a conta</button></form></div>`}</div>`); };
// v2.97: repor a senha de login e mudar o e-mail de uma conta (pedem a senha do administrador)
OS.forms.admPw = async (f, v) => { const c = ADM && ADM.contas[+f.dataset.i]; if (!c) return; if (!confirm(`Repor a senha de ${c.email}? As sessões dela terminam.`)) return;
  const bt = f.querySelector('button'); bt.disabled = true;
  try { const j = await conta('adminSenha', { email: c.email, nova: v('nova'), senha: v('senha') }); f.reset(); const o = document.getElementById('admPwOut');
    if (o) { o.hidden = false; o.innerHTML = `<p style="margin:0 0 6px">Senha temporária de <b>${esc(j.email)}</b>:</p><div class="row gap8" style="align-items:center"><code class="adm-tmp">${esc(j.temporaria)}</code><button class="btn sm" type="button" data-act="admCopy" data-v="${esc(j.temporaria)}">Copiar</button></div><p class="mut" style="margin:8px 0 0">Envia-a à pessoa por um canal seguro. Só aparece agora; ao entrar, ela escolhe uma senha nova.</p>`; }
    OS.UI.toast('Senha reposta: ' + j.email, 'pos'); }
  catch (e) { OS.UI.toast(e.message || 'Não consegui repor a senha.', 'neg'); } finally { bt.disabled = false; } };
A.admCopy = async b => { try { await navigator.clipboard.writeText(b.dataset.v); OS.UI.toast('Copiado', 'pos'); } catch (e) { OS.UI.toast('Não consegui copiar: seleciona e copia à mão', 'warn'); } };
OS.forms.admEmail = async (f, v) => { const c = ADM && ADM.contas[+f.dataset.i]; if (!c) return; const novo = v('novo').trim().toLowerCase();
  if (!confirm(`Passar a conta ${c.email} para ${novo}? A pessoa passa a entrar com o novo e-mail.`)) return;
  const bt = f.querySelector('button'); bt.disabled = true;
  try { const j = await conta('adminEmail', { email: c.email, novo, senha: v('senha') }); c.email = j.email; OS.UI.closeModal(); OS.UI.toast(`E-mail mudado: ${j.de} → ${j.email}`, 'pos'); OS.request(); }
  catch (e) { bt.disabled = false; OS.UI.toast(e.message || 'Não consegui mudar o e-mail.', 'neg'); } };
// o administrador apaga a conta de outra pessoa: pede a senha do administrador e confirma o e-mail
// v3.21: o plano de cada conta escolhido pela administração: Automático (teste e depois o que a pessoa assinar) ou um plano grátis, por uns dias ou para sempre
const PLX = { essencial: ['Essencial', '20 pedidos de IA por dia, 1 perfil'], avancado: ['Avançado', 'IA com fotos e PDFs, 150 pedidos por dia, até 3 perfis'], completo: ['Completo', 'Tudo, 400 pedidos de IA por dia, até 5 perfis'] };
const fdt = t => new Date(t).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT');
const plTxt = pl => !pl ? '—' : pl.admin ? 'Administração (tem sempre tudo)' : pl.oferta ? `${pl.n} grátis${pl.ate ? ' até ' + fdt(pl.ate) : ', para sempre'}` : pl.pago ? `${pl.n} pago (${pl.ciclo === 'ano' ? 'anual' : 'mensal'}${pl.cancelar ? ', cancelado: acaba a ' + fdt(pl.ate) : ''})` : pl.teste ? `Teste grátis do Completo até ${fdt(pl.ate)}` : pl.contaTeste ? 'Completo (conta de teste)' : pl.semCobranca ? 'Completo (a cobrança ainda não está ligada)' : pl.acabou ? 'Sem plano (o teste grátis acabou)' : pl.n || '—';
const plTag = pl => !pl || pl.admin ? '' : pl.oferta ? `<small class="adm-plt is-of">${esc(pl.n)} grátis</small>` : pl.pago ? `<small class="adm-plt is-pg">${esc(pl.n)} pago</small>` : pl.teste ? `<small class="adm-plt">Teste até ${fdt(pl.ate)}</small>` : pl.acabou ? '<small class="adm-plt is-no">Sem plano</small>' : '';
const admPlanSec = (c, i) => { const pl = c.plano || {};
  if (c.admin) return `<div class="adm-acc adm-plan"><h4>Plano</h4><p style="margin:0">${esc(plTxt(pl))}</p></div>`;
  const cur = (c.ofer && c.ofer.id) || '', auto = c.ofer ? c.auto : pl, D = [[0, 'Para sempre'], [7, '7 dias'], [30, '30 dias'], [90, '3 meses'], [180, '6 meses'], [365, '1 ano']];
  const opt = (v, t, d) => `<label class="adm-plo"><input type="radio" name="plano" value="${v}"${cur === v ? ' checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
  return `<div class="adm-acc adm-plan"><h4>Plano</h4><p style="margin:0 0 10px">Agora: <b>${esc(plTxt(pl))}</b></p>
    <form data-form="admPlano" data-i="${i}"><div class="adm-pls" role="radiogroup" aria-label="Plano desta conta">
      ${opt('', 'Automático', 'O teste grátis de 14 dias e depois o plano que a pessoa assinar' + (c.ofer ? '. Sem a oferta ficaria: ' + esc(plTxt(auto)) : ''))}
      ${Object.entries(PLX).map(([k, [n, d]]) => opt(k, n + ' grátis', d)).join('')}</div>
      <div class="adm-pld"><label>Durante <select name="dias" class="field">${D.map(([d, t]) => `<option value="${d}">${t}</option>`).join('')}</select></label><button class="btn" type="submit">Guardar</button></div>
      <p class="mut" style="margin:8px 0 0;font-size:12.5px">Um plano grátis vale até ao fim do prazo e depois volta ao Automático. Se a pessoa pagar um plano maior, fica com o maior.</p></form></div>`; };
OS.forms.admPlano = async (f, v) => { const i = +f.dataset.i, c = ADM && ADM.contas[i]; if (!c) return; const bt = f.querySelector('button[type=submit]'); bt.disabled = true;
  const plano = (f.querySelector('input[name=plano]:checked') || {}).value || '', dias = plano ? +v('dias') || 0 : 0;
  try { const j = await conta('adminPlano', { email: c.email, plano, dias }); c.plano = j.agora; c.ofer = j.ofer; c.auto = j.ofer ? j.auto : null;
    OS.UI.toast(plano ? `${c.email}: ${PLX[plano][0]} grátis ${dias ? 'durante ' + (dias === 365 ? '1 ano' : dias + ' dias') : 'para sempre'}.` : `${c.email}: plano automático.`, 'pos');
    A.admOne({ dataset: { i } }); OS.request(); }
  catch (e) { bt.disabled = false; OS.UI.toast(e.message || 'Não consegui guardar o plano.', 'neg'); } };
OS.forms.admCofre = async (f, v) => { const c = ADM && ADM.contas[+f.dataset.i]; if (!c) return; const me = c.email === Acc.email();
  if (!confirm(`Repor o cofre de Senhas de ${me ? 'ti próprio' : c.email}? O cofre fica vazio e as senhas que lá estavam perdem-se para sempre (ninguém as consegue abrir). ${me ? 'Crias' : 'A pessoa cria'} uma senha mestra nova ao abrir Senhas.`)) return;
  const bt = f.querySelector('button'); bt.disabled = true;
  try { const j = await conta('adminCofre', { email: c.email, pid: v('pid') || '', senha: v('senha') }); f.reset(); OS.UI.toast(`Cofre reposto (${(j.perfis || []).join(', ')}). ${me ? 'Abre Senhas para criares' : 'Ao abrir Senhas, a pessoa cria'} uma senha mestra nova.`, 'pos'); }
  catch (e) { OS.UI.toast(e.message || 'Não consegui repor o cofre.', 'neg'); } finally { bt.disabled = false; } };
OS.forms.admDel = async (f, v) => { const c = ADM && ADM.contas[+f.dataset.i]; if (!c) return;
  if (!confirm(`Apagar a conta ${c.email} e todos os dados dela? Não se pode desfazer.`)) return;
  const bt = f.querySelector('button'); bt.disabled = true; bt.textContent = 'A apagar…';
  try { await conta('adminApagar', { email: c.email, senha: v('senha') }); ADM.contas = ADM.contas.filter(x => x !== c); ADM.total = ADM.contas.length; OS.UI.closeModal(); OS.UI.toast('Conta apagada: ' + c.email, 'pos'); OS.request(); }
  catch (e) { bt.disabled = false; bt.textContent = 'Apagar a conta'; OS.UI.toast(e.message || 'Não consegui apagar a conta.', 'neg'); } };
A.admCsv = () => { if (!ADM) return; const D = lastDays(30), q = v => { let x = String(v == null ? '' : v); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };   // v3.62: um nome a começar por = não vira fórmula no Excel
  const rows = [['Nome', 'E-mail', 'Perfis', 'Criada', 'Última entrada', 'Último acesso', 'Último login', 'Logins', 'Minutos no total'].concat(D)].concat(ADM.contas.map(c => [c.nome, c.email, (c.perfis || []).join(' / '), c.criado ? new Date(c.criado).toISOString() : '', c.ultEntrada ? new Date(c.ultEntrada).toISOString() : '', c.ultUso ? new Date(c.ultUso).toISOString() : '', c.login ? new Date(c.login).toISOString() : '', c.entradas || 0, c.tot || 0].concat(D.map(d => (c.dias || {})[d] || 0))));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'prumo-contas-' + today() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
document.addEventListener('input', e => { if (e.target.id !== 'admQ') return; const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('.adm-r[data-q]').forEach(r => { r.hidden = !!q && !r.dataset.q.includes(q); }); });
/* ---------- v3.62: manutenção (janela semanal de madrugada ou ligada pela administração): ecrã que tapa a app; a administração só vê um aviso ---------- */
const MAN = { on: false, ate: 0, prox: 0, motivo: '', poll: 0, warned: 0 };
const manH = t => new Date(t).toLocaleTimeString(OS.loc ? OS.loc() : 'pt-PT', { hour: '2-digit', minute: '2-digit' });
const manD = t => new Date(t).toLocaleString(OS.loc ? OS.loc() : 'pt-PT', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
Acc.manut = {
  state: () => MAN,
  show(ate) { if (Acc.adm()) return; MAN.on = true; MAN.ate = +ate || MAN.ate || Date.now() + 30 * 60e3; let el = document.getElementById('manut');
    if (!el) { el = document.createElement('div'); el.id = 'manut'; el.className = 'mn'; document.body.appendChild(el); el.addEventListener('click', e => { if (e.target.closest('[data-mn]')) Acc.manut.check(); }); }
    el.innerHTML = `<div class="mn-box" role="alertdialog" aria-modal="true" aria-labelledby="mnT" aria-describedby="mnD"><div class="mn-ic" aria-hidden="true">${OS.UI && OS.UI.ic ? OS.UI.ic('shield') : ''}</div><h2 id="mnT">O Prumo está em manutenção</h2>
      <p id="mnD">Estamos a fazer a revisão semanal de segurança e a cópia de segurança dos dados. Voltamos às <b>${manH(MAN.ate)}</b>.</p><p class="mut">Os teus dados estão guardados, no aparelho e no servidor. Não precisas de fazer nada: a app volta sozinha.</p>
      <button type="button" class="btn" data-mn="1">Ver se já voltou</button></div>`;
    el.hidden = false; document.documentElement.classList.add('mn-on'); clearInterval(MAN.poll); MAN.poll = setInterval(() => Acc.manut.check(), 60e3); },
  hide() { MAN.on = false; clearInterval(MAN.poll); MAN.poll = 0; const el = document.getElementById('manut'); if (el) el.remove(); document.documentElement.classList.remove('mn-on'); OS.request && OS.request(); setTimeout(() => { try { if (OS.Inbox && OS.Inbox.pull) OS.Inbox.pull(false); } catch (e) { } }, 1500); },   /* os gastos do atalho guardados durante a manutenção entram já nas contas */
  async check() { let j; try { j = await api('conta', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'manut' }) }, 1); } catch (e) { return MAN; }
    const m = j.manut || {}; MAN.prox = m.prox || 0; MAN.motivo = m.motivo || '';
    if (m.on && !Acc.adm()) Acc.manut.show(m.ate); else if (!m.on && MAN.on) Acc.manut.hide(); else { MAN.on = !!m.on; MAN.ate = m.ate || 0; }
    if (m.on && Acc.adm() && !MAN.warned) { MAN.warned = 1; OS.UI.toast('Manutenção ativa até às ' + manH(m.ate) + ': só a tua conta (administração) usa o Prumo.', 'warn'); }
    if (m.on && Acc.adm()) Acc.manut.fab(m.ate); else Acc.manut.fabOff();
    return MAN; },
  // v3.62: na conta de administração, um botão flutuante com a contagem do fim da manutenção (tocar abre a Administração)
  fab(ate) { MAN.ate = +ate || MAN.ate; let b = document.getElementById('manFab');
    if (!b) { b = document.createElement('a'); b.id = 'manFab'; b.href = '#admin'; b.className = 'mn-fab'; b.setAttribute('aria-live', 'off'); document.body.appendChild(b); }
    const tick = () => { const left = MAN.ate - Date.now(); if (left <= 0) { Acc.manut.fabOff(); Acc.manut.check(); return; }
      const h = Math.floor(left / 36e5), mi = Math.floor(left % 36e5 / 6e4), se = Math.floor(left % 6e4 / 1e3), p2 = n => String(n).padStart(2, '0');
      b.innerHTML = `${OS.UI.ic('shield')}<span>Manutenção</span><b>${h ? h + ':' : ''}${p2(mi)}:${p2(se)}</b>`; b.setAttribute('aria-label', 'Manutenção ativa: faltam ' + (h ? h + ' h ' : '') + mi + ' min. Abrir a Administração.'); };
    tick(); clearInterval(MAN.ft); MAN.ft = setInterval(tick, 1000); },
  fabOff() { clearInterval(MAN.ft); MAN.ft = 0; const b = document.getElementById('manFab'); if (b) b.remove(); } };
OS.on('ready', () => { if (S && S.t) setTimeout(() => Acc.manut.check(), 1500); setInterval(() => { if (S && S.t && (!MAN.on || Acc.adm())) Acc.manut.check(); }, 5 * 60e3); });
/* ---------- v3.62: relatórios da semana (gerados ao domingo na manutenção e enviados por e-mail) ---------- */
const REL = { L: null, i: 0, busy: false, nomes: {} };
const relLoad = async agora => { REL.busy = true; OS.request(); try { const j = await conta('adminRelatorios', agora ? { agora: 1 } : {}); REL.L = j.relatorios || []; REL.nomes = j.nomes || {}; REL.i = 0; } catch (e) { OS.UI.toast(e.message, 'neg'); } REL.busy = false; OS.request(); };
const relHm = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
const relFd = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
const relPn = () => { const ic = OS.UI.ic; if (!REL.L) return `<div class="pn"><div class="pn-h"><h3>${ic('note')}Relatórios da semana</h3></div><p class="mut" style="margin:0 0 10px">Todos os domingos, na manutenção de madrugada, o Prumo junta tudo o que aconteceu na semana (contas, atividade, planos, segurança, erros, cópias de segurança) e manda-te por e-mail. Só números, sem dados pessoais de ninguém.</p><button class="btn sm" data-act="admRel"${REL.busy ? ' disabled' : ''}>${REL.busy ? 'A carregar…' : 'Ver os relatórios'}</button></div>`;
  const R = REL.L[REL.i], li = a => `<ul class="adm-rl">${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
  if (!R) return `<div class="pn"><div class="pn-h"><h3>${ic('note')}Relatórios da semana</h3></div><p class="mut" style="margin:0 0 10px">Ainda não há relatórios. O primeiro chega no domingo de madrugada; podes gerar um agora.</p><button class="btn sm" data-act="admRelNow"${REL.busy ? ' disabled' : ''}>Gerar agora</button></div>`;
  const sec = Object.entries(R.seguranca || {}).sort((a, b) => b[1] - a[1]), err = Object.entries(R.erros || {}), P = R.planos || {}, C = R.contas || {}, E = R.eventos || {}, U = R.uso || {};
  const eur = c => (c / 100).toLocaleString(OS.loc ? OS.loc() : 'pt-PT', { style: 'currency', currency: 'EUR' });
  return `<div class="pn adm-rel"><div class="pn-h"><h3>${ic('note')}Relatórios da semana</h3><div class="row gap8">${REL.L.length > 1 ? `<select class="field" data-act="admRelSel" aria-label="Semana">${REL.L.map((x, i) => `<option value="${i}"${i === REL.i ? ' selected' : ''}>${relFd(x.de)}–${relFd(x.ate)}</option>`).join('')}</select>` : ''}<button class="btn sm ghost" data-act="admRelNow"${REL.busy ? ' disabled' : ''}>${REL.busy ? 'A gerar…' : 'Gerar agora'}</button></div></div>
    <p class="mut" style="margin:0 0 10px">De ${relFd(R.de)} a ${relFd(R.ate)}${R.versao ? ' · ' + esc(R.versao) : ''} · gerado ${esc(new Date(R.gerado).toLocaleString(OS.loc ? OS.loc() : 'pt-PT'))}</p>
    ${(R.alertas || []).length ? `<div class="adm-ral"><b>Atenção</b>${li(R.alertas.map(esc))}</div>` : '<p class="pos" style="margin:0 0 10px"><b>Sem alertas esta semana.</b></p>'}
    <div class="adm-rg">
      <section><h4>Contas</h4>${li([`${C.total} contas (${C.novas} novas, ${C.entraramSemana} entraram)`, `${C.perfis} perfis`, `${C.porConfirmar} por confirmar o e-mail`])}</section>
      <section><h4>Planos</h4>${li([`Pagos: ${P.pagos} (Essencial ${P.essencial || 0}, Avançado ${P.avancado || 0}, Completo ${P.completo || 0})`, `Teste grátis: ${P.teste}; ofertas: ${P.oferta}; sem plano: ${P.semPlano}`, `Receita mensal estimada: ${eur(P.receitaMes || 0)}`])}</section>
      <section><h4>Atividade</h4>${li([`${U.pessoas} pessoa(s), ${relHm(U.minutos || 0)} no total`, `Logins: ${E.logins}; contas criadas: ${E.registos}`, `IA: ${E.ia} pedidos; notificações: ${E.notificacoes} (${R.aparelhos == null ? '?' : R.aparelhos} aparelhos)`, `Pagamentos: ${E.pagamentos}`])}</section>
      <section><h4>Segurança</h4>${sec.length ? li(sec.map(([k, v]) => `${esc(REL.nomes[k] || k)}: <b>${v}</b>`)) : '<p class="mut" style="margin:0">Nenhuma tentativa de ataque registada.</p>'}</section>
      <section><h4>Erros do servidor</h4>${err.length ? li(err.map(([k, v]) => `${esc(k)}: <b>${v}</b>`)) : '<p class="mut" style="margin:0">Nenhum.</p>'}</section>
      <section><h4>Falhas do app (nos aparelhos)</h4>${Object.keys(R.falhasApp || {}).length ? li(Object.entries(R.falhasApp).map(([k, v]) => `${esc(k)}: <b>${v}</b>`)) : '<p class="mut" style="margin:0">Nenhuma.</p>'}</section>
      <section><h4>Saúde da base de dados</h4>${R.saude && R.saude.pct != null ? li([`${R.saude.pct}% das verificações bem (${R.saude.ok} de ${R.saude.n})`, `Tempo médio: ${R.saude.ms} ms`]) : '<p class="mut" style="margin:0">Ainda sem verificações.</p>'}</section>
      <section><h4>Pedidos e cópias</h4>${li([`Pedidos LGPD/RGPD: ${(R.pedidos || {}).novos || 0} novos, ${(R.pedidos || {}).porResponder || 0} por responder`, `Cópias diárias: ${(R.copias || {}).diarias ? R.copias.diarias.length : 0} (última ${esc(((R.copias || {}).diarias || []).slice(-1)[0] || '—')})`, `Cópias semanais: ${(R.copias || {}).semanais ? R.copias.semanais.length : 0} (última ${esc(((R.copias || {}).semanais || []).slice(-1)[0] || '—')})`])}</section>
    </div></div>`; };
A.admRel = () => relLoad(false);
A.admRelNow = () => relLoad(true);
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-act=admRelSel]')) { REL.i = +e.target.value || 0; OS.request(); } });
/* ---------- v3.64: saúde da base de dados (verificação de hora a hora) ---------- */
const SAU = { s: null, busy: false };
const sauLoad = async agora => { SAU.busy = true; OS.request(); try { const j = await conta('adminSaude', agora ? { agora: 1 } : {}); SAU.s = j.saude; } catch (e) { OS.UI.toast(e.message, 'neg'); } SAU.busy = false; OS.request(); };
const sauPn = () => { const ic = OS.UI.ic, s = SAU.s, when = t => t ? new Date(t).toLocaleString(OS.loc ? OS.loc() : 'pt-PT', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const head = `<div class="pn-h"><h3>${ic('heart')}Saúde do servidor</h3>${s && s.pct != null ? `<span class="bdg ${s.pct === 100 ? 'pos' : s.pct >= 90 ? 'warn' : 'neg'}">${s.pct}% nas últimas ${s.n} h</span>` : ''}</div>`;
  if (!s) return `<div class="pn">${head}<p class="mut" style="margin:0 0 10px">A cada hora o Prumo escreve, lê e apaga um ficheiro de teste na base de dados, confirma a chave e a lista de contas e vê se a cópia de segurança correu. Se falhar duas vezes seguidas, recebes um e-mail.</p><button class="btn sm" data-act="admSau"${SAU.busy ? ' disabled' : ''}>${SAU.busy ? 'A carregar…' : 'Ver a saúde'}</button></div>`;
  if (!s.n || !s.ultima) return `<div class="pn">${head}<p class="mut" style="margin:0 0 10px">Ainda não há verificações guardadas: a primeira corre na próxima hora certa. Podes fazer uma já.</p><button class="btn sm" data-act="admSauNow"${SAU.busy ? ' disabled' : ''}>${SAU.busy ? 'A verificar…' : 'Verificar agora'}</button></div>`;
  const u = s.ultima || {};
  return `<div class="pn">${head}<p style="margin:0 0 8px">Última verificação: <b>${esc(when(u.t))}</b> · ${u.ok ? '<span class="pos">tudo bem</span>' : `<span class="neg">falhou (${esc(u.err || '')})</span>`} · ${u.ms || 0} ms (média ${s.ms} ms)${u.copia ? ' · última cópia diária: ' + esc(u.copia) : ''}</p>
    ${(s.falhas || []).length ? `<p class="mut" style="margin:0 0 6px">Falhas recentes:</p><ul class="adm-rl">${s.falhas.map(f => `<li>${esc(when(f.t))}: ${esc(f.err || 'falhou')}</li>`).join('')}</ul>` : '<p class="mut" style="margin:0 0 8px">Sem falhas nas últimas verificações.</p>'}
    <button class="btn sm ghost" data-act="admSauNow"${SAU.busy ? ' disabled' : ''}>${SAU.busy ? 'A verificar…' : 'Verificar agora'}</button></div>`; };
/* ---------- v3.69: visitas à página inicial e ao app (estatística própria, sem cookies) ---------- */
const VIS = { v: null, busy: false, dias: 7 };
const visLoad = async () => { VIS.busy = true; OS.request(); try { const j = await conta('adminVisitas', { dias: VIS.dias }); VIS.v = j.visitas; } catch (e) { OS.UI.toast(e.message, 'neg'); } VIS.busy = false; OS.request(); };
const visPn = () => { const ic = OS.UI.ic, v = VIS.v, loc = OS.loc ? OS.loc() : 'pt-PT', n = x => Number(x || 0).toLocaleString(loc);
  const sel = `<select class="field sm" data-act="admVisDias" aria-label="Período">${[7, 14, 30].map(d => `<option value="${d}"${VIS.dias === d ? ' selected' : ''}>${d} dias</option>`).join('')}</select>`;
  const head = `<div class="pn-h"><h3>${ic('chart')}Visitas</h3>${v ? sel : ''}</div>`;
  if (!v) return `<div class="pn adm-vis">${head}<p class="mut" style="margin:0 0 10px">Quantas pessoas abrem a página inicial e o app, de onde vêm (Google, Instagram…), de que país e em que aparelho, e quantas se registam e pagam. Sem cookies e sem guardar o IP de ninguém.</p><button class="btn sm" data-act="admVis"${VIS.busy ? ' disabled' : ''}>${VIS.busy ? 'A carregar…' : 'Ver as visitas'}</button></div>`;
  const T = v.totais, mx = Math.max(1, ...v.serie.map(d => Math.max(d.u, d.reg))), pais = c => { try { return c === '??' ? 'Desconhecido' : new Intl.DisplayNames([loc], { type: 'region' }).of(c); } catch (e) { return c; } };
  const DEV = { tel: 'Telemóvel', tablet: 'Tablet', pc: 'Computador', '?': 'Outro' }, CTA = { criar: 'Começar (criar conta)', entrar: 'Entrar', selo: 'Selo no fim da página', plano: 'Botão de um plano', outro: 'Outro' };
  const lista = (t, L, f) => { const tot = L.reduce((a, x) => a + x[1], 0) || 1; return `<div class="vis-l"><h4>${t}</h4>${L.length ? `<ol>${L.map(([k, c]) => `<li><span>${esc(f ? f(k) : k)}</span><i style="--p:${Math.round(c / tot * 100)}%"></i><b class="mono">${n(c)}</b></li>`).join('')}</ol>` : '<p class="mut">Ainda nada.</p>'}</div>`; };
  const funil = [['Visitantes', T.unicos], ['Cliques em Começar', T.cliques], ['Registos', T.registos], ['Pagamentos', T.pagamentos]], f0 = Math.max(1, T.unicos);
  return `<div class="pn adm-vis">${head}
    <div class="adm-kpi"><div><b class="mono">${n(T.unicos)}</b><span>visitantes na página</span></div><div><b class="mono">${n(T.visitas)}</b><span>visitas à página</span></div><div><b class="mono">${n(T.app)}</b><span>pessoas a abrir o app</span></div><div><b class="mono">${n(T.registos)}</b><span>registos</span></div><div><b class="mono">${n(T.pagamentos)}</b><span>pagamentos</span></div><div><b class="mono">${T.conversao}%</b><span>visitantes que se registam</span></div></div>
    <div class="vis-g" role="img" aria-label="Visitantes por dia">${v.serie.map(d => `<span title="${esc(new Date(d.d + 'T12:00:00Z').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' }))}: ${d.u} visitantes, ${d.reg} registos"><i style="height:${Math.max(3, Math.round(d.u / mx * 100))}%"></i>${d.reg ? `<em style="height:${Math.max(3, Math.round(d.reg / mx * 100))}%"></em>` : ''}<small>${new Date(d.d + 'T12:00:00Z').getUTCDate()}</small></span>`).join('')}</div>
    <p class="mut vis-leg"><i></i>visitantes <em></em>registos</p>
    <div class="vis-f">${funil.map(([t, c], i) => `<div style="--w:${Math.max(4, Math.round(c / f0 * 100))}%"><span>${t}</span><b class="mono">${n(c)}</b>${i ? `<small>${T.unicos ? Math.round(c / T.unicos * 1000) / 10 + '%' : '—'}</small>` : ''}</div>`).join('')}</div>
    <div class="vis-c">${lista('De onde vêm', v.origens)}${lista('Países', v.paises, pais)}${lista('Aparelhos', v.aparelhos, k => DEV[k] || k)}${lista('Cliques', v.cliques, k => CTA[k] || k)}</div>
    <p class="mut adm-note" style="margin:10px 0 0">Visitante = cada aparelho conta uma vez por dia, por um código que muda todos os dias e não identifica ninguém (o IP não é guardado). Os números são aproximados: bloqueadores de anúncios e robôs não contam.</p>
    <button class="btn sm ghost" data-act="admVis"${VIS.busy ? ' disabled' : ''}>${VIS.busy ? 'A carregar…' : 'Atualizar'}</button></div>`; };
A.admVis = () => visLoad();
/* ---------- v3.70: erros e quedas (falhas da app agrupadas, erros do servidor, disponibilidade e aviso se o site cair) ---------- */
const ERR = { v: null, busy: false };
const errLoad = async () => { ERR.busy = true; try { const j = await conta('adminErros', { dias: 7 }); ERR.v = j.erros; } catch (e) { ERR.v = ERR.v || { erro: e.message }; } ERR.busy = false; OS.request(); };
const errPn = () => { const ic = OS.UI.ic, v = ERR.v, loc = OS.loc ? OS.loc() : 'pt-PT', s = SAU.s, ping = new URL('api/saude?ping=1', document.baseURI).href;
  const head = `<div class="pn-h"><h3>${ic('zap')}Erros e quedas</h3>${v && v.totais ? `<span class="bdg ${v.totais.novos ? 'warn' : v.totais.srv ? 'warn' : 'pos'}">${v.totais.novos ? v.totais.novos + (v.totais.novos === 1 ? ' erro novo' : ' erros novos') : 'sem erros novos'}</span>` : ''}</div>`;
  const monitor = `<details class="adm-mon"><summary><b>Aviso se o site cair</b> <span class="mut">(5 minutos, grátis)</span></summary><ol class="adm-steps">
      <li>Cria uma conta em <b>uptimerobot.com</b> (o plano grátis chega).</li><li><b>Add New Monitor</b> › tipo <b>HTTP(s)</b> › URL: <code class="adm-url">${esc(ping)}</code> › intervalo de 5 minutos.</li>
      <li>Em <b>Alert Contacts</b>, põe o teu e-mail (e a app do UptimeRobot no telemóvel, se quiseres aviso no ecrã). Pronto: se o Prumo deixar de responder, recebes um aviso em minutos.</li></ol>
      <p class="mut" style="margin:6px 0 0">Esse endereço só diz se o servidor e a base de dados respondem; não mostra dados de ninguém. A verificação de hora a hora do próprio Prumo também te manda um e-mail se falhar duas vezes seguidas, mas só um monitor de fora te avisa quando o site inteiro cai.</p></details>`;
  if (!v || v.erro) return `<div class="pn" id="admErr">${head}<p class="mut" style="margin:0 0 10px">${v && v.erro ? esc(v.erro) : 'A carregar…'}</p>${monitor}</div>`;
  const T = v.totais, mx = Math.max(1, ...v.serie.map(d => d.app + d.srv));
  return `<div class="pn" id="admErr">${head}
    <div class="adm-kpi"><div><b class="mono">${s && s.pct != null ? s.pct + '%' : '—'}</b><span>servidor a responder${s && s.n ? ` (últimas ${s.n} h)` : ''}</span></div><div><b class="mono">${T.app}</b><span>falhas na app (7 dias)</span></div><div><b class="mono">${T.srv}</b><span>erros no servidor (7 dias)</span></div><div><b class="mono">${T.novos}</b><span>erros novos</span></div></div>
    <div class="vis-g err-g" role="img" aria-label="Erros por dia">${v.serie.map(d => `<span title="${esc(new Date(d.d + 'T12:00:00Z').toLocaleDateString(loc, { weekday: 'short', day: 'numeric' }))}: ${d.app} na app, ${d.srv} no servidor"><i style="height:${d.app + d.srv ? Math.max(4, Math.round((d.app + d.srv) / mx * 100)) : 0}%"></i>${d.srv ? `<em style="height:${Math.max(4, Math.round(d.srv / mx * 100))}%"></em>` : ''}<small>${new Date(d.d + 'T12:00:00Z').getUTCDate()}</small></span>`).join('')}</div>
    <p class="mut vis-leg"><i></i>app <em></em>servidor</p>
    ${v.grupos.length ? `<ul class="err-l">${v.grupos.map(g => { const [m, at] = g.k.split(' @ '); return `<li${g.novo ? ' class="novo"' : ''}><div><b>${esc(m)}</b>${g.novo ? ' <span class="bdg warn">novo</span>' : ''}<small class="mono">${esc(at || '')}</small></div><span class="mono">${g.n}×</span><small class="mut">${g.dias} ${g.dias === 1 ? 'dia' : 'dias'}, último ${esc(new Date(g.ult + 'T12:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short' }))}</small></li>`; }).join('')}</ul>` : '<p class="mut" style="margin:0 0 10px">Nenhuma falha da app nos últimos 7 dias.</p>'}
    ${v.servidor.length ? `<p style="margin:10px 0 4px"><b>Erros do servidor por parte</b></p><ul class="adm-rl">${v.servidor.map(([k, n]) => `<li><code>${esc(k)}</code>: ${n}</li>`).join('')}</ul>` : ''}
    ${v.versoes.length ? `<p class="mut" style="margin:10px 0 0">Versões e aparelhos com falhas: ${v.versoes.map(([k, n]) => { const [ver, dv] = k.split(':'); return esc((ver || '?') + ' ' + ({ tel: 'telemóvel', tablet: 'tablet', pc: 'computador' }[dv] || dv || '')) + ' (' + n + ')'; }).join(', ')}</p>` : ''}
    ${monitor}<button class="btn sm ghost" data-act="admErr" style="margin-top:10px"${ERR.busy ? ' disabled' : ''}>${ERR.busy ? 'A carregar…' : 'Atualizar'}</button></div>`; };
A.admErr = () => errLoad();
/* ---------- v3.70: antivírus (ameaças bloqueadas nos aparelhos de todos, só o tipo) ---------- */
const AVX = { v: null, busy: false };
const avsLoad = async () => { AVX.busy = true; try { const j = await conta('adminAntivirus'); AVX.v = j.av || {}; } catch (e) { AVX.v = AVX.v || {}; } AVX.busy = false; OS.request(); };
const avPn = () => { const ic = OS.UI.ic, v = AVX.v || {}, f = Object.entries(v).filter(([k]) => k.startsWith('f_') && k !== 'f_eicar'), fb = f.reduce((a, [, n]) => a + n, 0), lp = v.l_perigo || 0, la = v.l_aviso || 0;
  const NOM = { f_prog: 'Programas escondidos', f_disf: 'Ficheiros disfarçados', f_macro: 'Macros do Office', f_pdfjs: 'PDFs com código', f_svg: 'SVG com código', f_html: 'Páginas com código', f_bomba: 'Bombas ZIP', f_zipprog: 'ZIP com programas', f_nome: 'Nomes disfarçados', f_grande: 'Grandes demais' };
  return `<div class="pn" id="admAv"><div class="pn-h"><h3>${ic('shield')}Antivírus</h3><span class="bdg pos">ligado em todas as contas</span></div>
    <p class="mut" style="margin:0 0 10px">O que o antivírus da app bloqueou nos aparelhos de todos nos últimos 30 dias (só o tipo de ameaça, sem nomes de ficheiros nem conteúdos).</p>
    ${!AVX.v ? '<p class="mut" style="margin:0">A carregar…</p>' : `<div class="adm-kpi"><div><b class="mono">${fb}</b><span>ficheiros bloqueados</span></div><div><b class="mono">${lp}</b><span>links perigosos</span></div><div><b class="mono">${la}</b><span>links com aviso</span></div><div><b class="mono">${v.f_eicar || 0}</b><span>testes feitos</span></div></div>
    ${f.length ? `<ul class="adm-rl" style="margin-top:10px">${f.sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li>${esc(NOM[k] || k)}: <b>${n}</b></li>`).join('')}</ul>` : ''}`}</div>`; };
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-act=admVisDias]')) { VIS.dias = +e.target.value || 7; visLoad(); } });
A.admSau = () => sauLoad(false);
A.admSauNow = () => sauLoad(true);
const manPn = () => { const m = MAN, on = m.on;
  return `<div class="pn"><div class="pn-h"><h3>${OS.UI.ic('shield')}Manutenção</h3><span class="bdg ${on ? 'warn' : 'pos'}">${on ? 'ativa até às ' + manH(m.ate) : 'desligada'}</span></div>
    <p class="mut" style="margin:0 0 10px">Na manutenção só a tua conta usa o Prumo; as outras pessoas veem o ecrã de manutenção e os dados ficam parados. Todas as semanas, de madrugada (domingo, 04:00–05:30 em Lisboa), liga-se sozinha para o ataque de teste, a cópia de segurança e a revisão.${m.prox ? ' Próxima: <b>' + esc(manD(m.prox)) + '</b>.' : ''}</p>
    <div class="row gap8">${on ? `<button class="btn sm" data-act="admManOff">Desligar agora</button>` : `<button class="btn sm" data-act="admManOn" data-min="60">Ligar agora (1 h)</button>`}</div></div>`; };
A.admManOn = async b => { if (!confirm('Ligar a manutenção durante 1 hora? Só a tua conta fica a usar o Prumo.')) return; b.disabled = true;
  try { const j = await conta('adminManutencao', { acao: 'ligar', min: +b.dataset.min || 60 }); Object.assign(MAN, j.manut || {}); Acc.manut.fab(MAN.ate); OS.UI.toast('Manutenção ligada até às ' + manH(MAN.ate) + '.', 'warn'); } catch (e) { OS.UI.toast(e.message, 'neg'); } OS.request(); };
A.admManOff = async b => { b.disabled = true; try { const j = await conta('adminManutencao', { acao: 'desligar' }); Object.assign(MAN, j.manut || {}); Acc.manut.fabOff(); OS.UI.toast('Manutenção desligada.', 'pos'); } catch (e) { OS.UI.toast(e.message, 'neg'); } OS.request(); };
OS.on('ready', () => Acc.navAdm());

/* ---------- dentro da app ---------- */
OS.on('ready', () => { const p = cur(); if (!p) return;
  // conta criada ao guardar o Prumo pessoal: o código de recuperação aparece uma vez
  const rc = LS.get('nau:rec', ''); if (rc) { LS.del('nau:rec'); setTimeout(() => OS.UI.modal(`<div style="padding:20px"><h3 style="margin:0 0 8px">Guarda o teu código de recuperação</h3><p class="mut" style="margin:0 0 12px">Se te esqueceres da senha da conta, é com este código que a recuperas. Aparece só agora: tira uma fotografia ou guarda-o no gestor de senhas.</p><div class="ac-code">${esc(rc)}</div><div class="row gap8" style="margin-top:14px"><button class="btn pri" data-mclose>Já guardei</button></div></div>`), 900); }
  const pr = OS.one('profile'); if (!pr.short && !pr.name) OS.setOne('profile', { name: p.nome, short: first(p.nome) });
  const sec = OS.one('security'), r = LS.get(K.reset, {});
  if (r[p.id]) { OS.setOne('security', { hash: r[p.id], changed: U.today() }); delete r[p.id]; LS.set(K.reset, r); }
  else if (!sec.hash && p.lk) OS.setOne('security', { hash: p.lk, changed: U.today() });
  // o código mudado em Definições passa também para a conta (para o "Esqueci o código" e os outros aparelhos)
  OS.on('one:security', () => { const sc = OS.one('security'), h = sc.hash, q = cur(); if (h && q && (h !== q.lk || (sc.pin ? 6 : 0) !== (q.pin || 0))) conta('perfil', { acao: 'editar', id: q.id, perfil: { lk: h, pin: sc.pin ? 6 : 0 } }).then(takeConta).catch(() => { }); });
  // Definições › Conta e perfis
  if (OS.SETT && !OS.SETT.some(t => t[0] === 'conta')) OS.SETT.splice(1, 0, ['conta', 'Conta e perfis']);
  const sv = OS.settingsView; if (sv && !sv.__acc) { OS.settingsView = s => String(s || '') === 'conta' ? settings() : sv(s); OS.settingsView.__acc = 1; }
});
// a bolinha do perfil na barra de cima (como na Netflix): toca para trocar de perfil ou ver a conta
Acc.bubble = () => { const p = cur(); return p ? `<button class="ac-bub" data-act="accMenu" aria-label="Perfil ${esc(p.nome)}" title="${esc(p.nome)}">${avatar(p)}</button>` : ''; };
A.accMenu = () => { const p = cur(); if (!p) return; OS.UI.modal(`<div class="ac-menu"><div class="ac-mh">${avatar(p, 1)}<div><b>${esc(p.nome)}</b><small class="mut">${esc(Acc.email())}</small></div></div>
  <div class="list"><a class="li" href="#planos" data-mclose><div class="li-t"><b>Planos${OS.Plano ? ' · ' + esc((OS.Plano.cur().teste ? 'teste do Completo' : OS.Plano.cur().n) || '') : ''}</b><small>O teu plano, mudar de plano e pagamentos</small></div><span class="mut">›</span></a><button class="li" data-act="accEdit"><div class="li-t"><b>Editar perfil</b><small>Nome, cor e avatar: emoji, foto ou personagem do Dominus</small></div><span class="mut">›</span></button><button class="li" data-act="accSwitch"><div class="li-t"><b>Trocar de perfil</b><small>${profiles().length} ${profiles().length === 1 ? 'perfil' : 'perfis'} nesta conta</small></div><span class="mut">›</span></button>
  <a class="li" href="#definicoes.conta" data-mclose><div class="li-t"><b>Conta e perfis</b><small>Senha, código de recuperação, sincronização</small></div><span class="mut">›</span></a>
  <button class="li" data-act="accOut"><div class="li-t"><b>Sair da conta</b><small>Os dados ficam guardados na conta</small></div><span class="mut">›</span></button></div></div>`, 'ac-modal'); };
A.accSwitch = () => { OS.UI.closeModal(); Acc.switchProfile(); };
A.accEdit = () => { const p = cur(); if (!p) return; GAL = null; OS.UI.modal(`<form class="ac-menu ac-edit" data-form="accProf"><div class="row between" style="align-items:center"><h3 style="margin:0">Editar perfil</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${OS.UI.ic('x')}</button></div>
  <label class="ac-f"><span>Nome</span><input name="nome" type="text" maxlength="24" required autocomplete="off" value="${esc(p.nome || '')}"></label>${avEditor(p)}<div class="ac-f"><span>Cor</span>${swatches(p.cor)}</div>
  <div class="row gap8"><button class="btn pri">Guardar</button><button type="button" class="btn ghost" data-mclose>Cancelar</button></div></form>`, 'ac-modal'); };
OS.forms.accProf = async f => { const nome = f.elements.nome.value.trim(); if (!nome) { OS.UI.toast('Escreve o nome do perfil', 'warn'); return; }
  try { const j = await conta('perfil', { acao: 'editar', id: pid(), perfil: { nome, cor: formVal(f, 'cor'), av: formVal(f, 'av'), img: f.elements.img.value } }); takeConta(j); OS.UI.closeModal(); OS.UI.toast('Perfil guardado', 'pos'); OS.request(); }
  catch (e) { OS.UI.toast(e.net ? 'Sem ligação à internet. Tenta outra vez.' : e.message, 'neg'); } };
A.accOut = () => { OS.UI.closeModal(); logout(); };
A.accSync = async () => { OS.UI.toast('A sincronizar…'); await Acc.flush().catch(() => { }); if (Acc.poll) await Acc.poll(); OS.UI.toast(SY.err ? 'Sem ligação: fica guardado neste aparelho' : 'Tudo sincronizado', SY.err ? 'warn' : 'pos'); OS.request(); };
A.accAll = async () => { try { const j = await conta('sairtodos'); S.t = j.token; saveS(); OS.UI.toast('Saíste de todos os outros aparelhos', 'pos'); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms = OS.forms || {};
/* ---------- atalho de gastos do iPhone sem script: cada perfil tem o seu link (a caixa fica na conta) ---------- */
const AKK = () => 'nau:ak:' + pid();
Acc.atalho = () => { const k = LS.get(AKK(), ''); return k ? { url: new URL('api/atalho', document.baseURI).href, key: k } : null; };
const ensureAk = async nova => { if (!cur() || (!nova && LS.get(AKK(), ''))) return; const j = await conta('atalho', { id: pid(), nova: !!nova }); LS.set(AKK(), j.chave); };
OS.on('ready', () => setTimeout(() => ensureAk().then(() => { const c = OS.one('inbox'); if (!(c.url && c.key) && OS.Inbox && OS.Inbox.pull) OS.Inbox.pull(false); }).catch(() => { }), 1500));
const akLink = () => { const a = Acc.atalho(); return a ? a.url + '?k=' + encodeURIComponent(a.key) : ''; }; Acc.akLink = akLink;
A.accAkCopy = async () => { const l = akLink(); if (!l) { await ensureAk().catch(() => { }); OS.request(); return; } try { await navigator.clipboard.writeText(l); OS.UI.toast('Link copiado: cola-o no atalho', 'pos'); } catch (e) { OS.UI.toast('Toca no link, seleciona e copia', 'warn'); } };
A.accAkNew = async () => { if (!confirm('Criar um link novo? O atalho antigo deixa de funcionar até colares o novo.')) return; try { await ensureAk(true); OS.UI.toast('Link novo criado', 'pos'); OS.request(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
A.accAkTest = async () => { const a = Acc.atalho(); if (!a) return; try { const r = await fetch(a.url, { method: 'POST', body: new URLSearchParams({ k: a.key, v: '1', d: '__teste__' }) }); if (!r.ok) throw new Error(await r.text());
    OS.Inbox.testOk = false; await OS.Inbox.pull(false); OS.UI.toast(OS.Inbox.testOk ? 'O atalho está a funcionar: o Prumo recebeu o teste (não conta nas finanças).' : 'O teste ainda não chegou. Tenta outra vez.', OS.Inbox.testOk ? 'pos' : 'warn'); }
  catch (e) { OS.UI.toast('O teste falhou: ' + e.message, 'neg'); } };
Acc.atalhoPanel = () => { const l = akLink(), UI = OS.UI;
  return `<div class="pn" id="inboxPn"><div class="pn-h"><h3>Atalho de gastos no iPhone</h3></div>
  <p class="mut" style="margin:0 0 14px">Um toque no Centro de Controlo → valor → descrição → fica registado neste perfil, sem abrir o Prumo. Não precisas de configurar nada fora do Prumo.</p>
  <div class="ib-w"><div class="ib-s"><i>1</i><div><b>O teu link</b><p>É só deste perfil. Não o partilhes: quem o tiver pode registar gastos aqui.</p>
    ${l ? `<div class="ib-link"><code>${esc(l)}</code><button class="btn sm pri" data-act="accAkCopy">Copiar link</button></div><div class="row gap8" style="margin-top:8px"><button class="btn sm" data-act="accAkTest">Testar agora</button><button class="btn sm ghost" data-act="accAkNew">Criar link novo</button></div>` : `<button class="btn sm pri" data-act="accAkCopy">Criar o link</button>`}</div></div>
    <div class="ib-s"><i>2</i><div><b>Criar o atalho (3 ações)</b><p>App <b>Atalhos</b> → <b>+</b> → nome "Gasto". Adiciona:</p>
      <div class="ib-sc"><div><b>1 · Pedir entrada</b> → toca em "Texto" e muda para <b>Número</b> → pergunta: <i>Quanto gastaste?</i></div><div><b>2 · Pedir entrada</b> → Texto → pergunta: <i>Em quê?</i></div><div><b>3 · Obter conteúdo do URL</b> → cola o <b>link</b> → ▸ (mostrar mais) → Método: <b>POST</b> → Corpo do pedido: <b>Formulário</b> → <b>Adicionar campo → Texto</b>: chave <code>v</code> com a 1.ª <b>Entrada fornecida</b>; chave <code>d</code> com a 2.ª.</div></div>
      <p>Toca em ▶️ para experimentar: deve aparecer "✓ … registado no Prumo".</p></div></div>
    <div class="ib-s"><i>3</i><div><b>Pôr no Centro de Controlo</b><p>Centro de Controlo → <b>+</b> → <b>Adicionar controlo</b> → <b>Atalhos</b> → <b>Atalho</b> → <b>Escolher</b> → "Gasto". Também podes pô-lo no <b>botão de Ação</b> ou no ecrã principal.</p></div></div></div>
  <p class="mut" style="margin:12px 0 0;font-size:12.5px">Os gastos entram em Finanças quando abres o Prumo, com a categoria adivinhada pela descrição e a etiqueta <i>atalho</i>.</p></div>`; };
OS.forms.accPw = async f => { try { const j = await conta('senha', { atual: f.elements.atual.value, nova: f.elements.nova.value }); takeConta(j); OS.UI.toast('Senha mudada. Os outros aparelhos vão pedir a senha nova.', 'pos'); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms.accRec = async f => { try { const j = await conta('novocodigo', { senha: f.elements.senha.value }); OS.UI.modal(`<div style="padding:20px"><h3 style="margin:0 0 8px">Código de recuperação novo</h3><p class="mut">O antigo deixou de valer. Guarda este:</p><div class="ac-code">${esc(j.recuperacao)}</div><div class="row gap8" style="margin-top:14px"><button class="btn pri" data-mclose>Já guardei</button></div></div>`); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms.accName = async f => { try { const j = await conta('nome', { nome: f.elements.nome.value }); takeConta(j); OS.UI.toast('Nome guardado', 'pos'); OS.request(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
OS.forms.accDel = async f => { if (!confirm('Apagar a conta, todos os perfis e todos os dados, em todos os aparelhos? Não dá para desfazer.')) return;
  try { await conta('apagar', { senha: f.elements.senha.value }); S = null; saveS(); LS.del(K.owner); LS.del(K.p); wipeLocal(); location.replace(location.pathname); location.reload(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
const settings = () => { const UI = OS.UI, p = cur() || {}, L = profiles(), ago = SY.last ? Math.max(0, Math.round((Date.now() - SY.last) / 1000)) : null;
  const head = UI.head('Definições', 'A tua conta Prumo: perfis, senha e sincronização entre aparelhos.', '', 'Sistema') + UI.tabs('definicoes', OS.SETT, 'conta');
  return head + `<div class="set-page ac-set">
  <div class="pn"><div class="pn-h"><h3>${UI.ic('user')}Conta</h3><span class="mut">${esc(Acc.email())}</span></div>
    <form data-form="accName" class="row gap8" style="align-items:flex-end"><label class="grow">Nome da conta<input class="field" name="nome" maxlength="40" value="${esc((S && S.n) || '')}"></label><button class="btn">Guardar</button></form></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('users')}Perfis</h3><span class="mut">${L.length} de 5</span></div>
    <div class="ac-plist">${L.map(x => `<div class="ac-pl">${avatar(x)}<b>${esc(x.nome)}</b>${x.id === p.id ? '<small class="mu-tag">a usar</small>' : ''}</div>`).join('')}</div>
    <div class="row gap8" style="margin-top:12px"><button class="btn pri" data-act="accEdit">Editar este perfil</button><button class="btn" data-act="accSwitch">Trocar ou gerir perfis</button></div></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('sync')}Sincronização</h3><span class="mut">${esc(SY.state)}</span></div>
    <p class="mut" style="margin:0 0 10px">Tudo o que registas neste perfil vai sozinho para a tua conta, cifrado, e aparece nos teus outros aparelhos em segundos.${ago != null ? ` Última vez: há ${ago < 60 ? ago + ' s' : Math.round(ago / 60) + ' min'}.` : ''}${pend.size ? ` ${pend.size} ${pend.size === 1 ? 'alteração por enviar' : 'alterações por enviar'}.` : ''}</p>
    <div class="row gap8"><button class="btn" data-act="accSync">Sincronizar agora</button></div></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('key')}Senha</h3></div>
    <form data-form="accPw" class="col gap8"><label>Senha atual<input class="field" name="atual" type="password" autocomplete="current-password" required></label><label>Senha nova<input class="field" name="nova" type="password" minlength="8" autocomplete="new-password" required></label><div><button class="btn">Mudar a senha</button></div></form>
    <form data-form="accRec" class="row gap8" style="align-items:flex-end;margin-top:14px"><label class="grow">Novo código de recuperação (pede a senha)<input class="field" name="senha" type="password" autocomplete="current-password" required></label><button class="btn ghost">Gerar</button></form></div>
  <div class="pn"><div class="pn-h"><h3>${UI.ic('lock')}Aparelhos</h3></div><p class="mut" style="margin:0 0 10px">Perdeste um telemóvel? Termina a sessão em todos os outros aparelhos (este fica).</p>
    <div class="row gap8"><button class="btn" data-act="accAll">Sair dos outros aparelhos</button><button class="btn ghost" data-act="accOut">Sair da conta neste aparelho</button></div></div>
  <div class="pn ac-danger"><div class="pn-h"><h3>Apagar a conta</h3></div><p class="mut" style="margin:0 0 10px">Apaga a conta, os ${L.length} ${L.length === 1 ? 'perfil' : 'perfis'} e todos os dados, em todos os aparelhos.</p>
    <form data-form="accDel" class="row gap8" style="align-items:flex-end"><label class="grow">Senha da conta<input class="field" name="senha" type="password" autocomplete="current-password" required></label><button class="btn neg">Apagar a conta</button></form></div></div>`; };
})();
