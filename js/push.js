/* PRUMO — notificações com o app fechado (Web Push).
   Ligar = este aparelho pede autorização, o navegador cria um endereço de entrega e o servidor do Prumo guarda-o (api/push).
   O app manda ao servidor só o que é preciso para saber quando avisar: os próximos lembretes da rotina e o fim do bloco de foco,
   as equipas e campeonatos que segues (futebol e outros desportos), os sinos da F1/MotoGP/MMA e os alertas de preço.
   A cada minuto o servidor vê o que está na hora e envia; o aviso chega mesmo com o Prumo fechado (no iPhone, com o Prumo
   instalado no ecrã principal, iOS 16.4 ou mais recente). Com isto ligado, os avisos de dentro do app não se repetem. */
(() => {
'use strict';
const OS = window.OS, U = OS.U, UI = OS.UI, A = OS.act, { esc } = U;
const K = 'nau:push';
OS.ONE_DEF.pushcfg = { cat: { rot: 1, foco: 1, fut: 1, sp: 1, inv: 1 } };
const ls = () => U.ls.get(K, {}) || {};
const sup = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const acc = () => OS.Acc || {}, tok = () => (acc().token ? acc().token() : ''), pid = () => (acc().pid ? acc().pid() : '');
const lang = () => (OS.Lang && OS.Lang.code ? OS.Lang.code() : 'pt-PT');
const perm = () => ('Notification' in window ? Notification.permission : 'na');
const call = async (op, body) => { const r = await fetch('api/push', { method: 'POST', credentials: 'omit', cache: 'no-store', headers: Object.assign({ 'content-type': 'application/json' }, tok() ? { authorization: 'Bearer ' + tok() } : {}), body: JSON.stringify(Object.assign({ op, p: pid() }, body || {})) });
  let j = null; try { j = await r.json(); } catch (e) { } if (!j || !j.ok) throw Object.assign(new Error((j && j.msg) || 'O servidor das notificações não respondeu. Tenta outra vez.'), { status: r.status }); return j; };
const keyBytes = s => { const b = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const devName = () => { const u = navigator.userAgent; return /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) || (iOS && !/iPhone/.test(u)) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Computador'; };
const MSG = {
  conta: 'Entra na tua conta do Prumo para ligar as notificações.',
  ios: 'No iPhone, primeiro instala o Prumo no ecrã principal: no Safari toca em Partilhar › Adicionar ao ecrã principal e abre o Prumo pelo ícone. Depois liga aqui.',
  nao: 'Este navegador não recebe notificações com o app fechado. Experimenta o Chrome, o Edge, o Firefox ou o Safari.',
  negado: 'As notificações estão bloqueadas para o Prumo. Desbloqueia nas definições do navegador ou do telemóvel e volta aqui.' };

/* ---------- o que o servidor precisa de saber (cada parte só vai quando muda) ---------- */
const SRC = {
  rot: () => (OS.Rotina && OS.Rotina.upcoming ? OS.Rotina.upcoming(14) : undefined),
  fut: () => { const s = OS.one('fut') || {}; return { teams: (s.teams || []).map(t => ({ id: t.id, n: t.n })), comps: (s.comps || []).map(c => ({ slug: c.slug, n: c.n })), av: s.av || {} }; },
  sp: () => { const s = OS.one('sports') || {}; if (OS.Plano && OS.Plano.can && !OS.Plano.can('desportos')) return { teams: [], bell: [], av: s.av || {} }; return { teams: (s.teams || []).map(t => ({ lg: t.lg, id: t.id, n: t.n, t: t.t || '' })), bell: s.bell || [], av: s.av || {} }; },
  inv: () => OS.all('palerts').map(a => ({ id: a.id, s: a.s, k: a.k, v: +a.v || 0, r: a.r, n: a.n || '', on: a.on && !(a.r !== 'diario' && a.firedAt) ? 1 : 0 })),
  foco: () => { const B = U.ls.get('os2fblk', null), it = B && B.items && B.items[B.i]; return B && B.phase === 'run' && B.end > Date.now() ? [{ at: B.end, t: 'Bloco de foco', b: 'Acabou o tempo de: ' + ((it && it.title) || 'esta pendência') + '. Terminaste?', u: '#hoje', g: 'foco' }] : []; },
  cat: () => Object.assign({ rot: 1, foco: 1, fut: 1, sp: 1, inv: 1 }, (OS.one('pushcfg') || {}).cat || {}) };
const PEND = {}, LAST = {}; let PT = 0, HAS = false;
const flush = async () => { PT = 0; if (!HAS || !tok() || !pid()) return; const d = {};
  Object.keys(PEND).forEach(k => { const j = JSON.stringify(PEND[k]); if (j !== LAST[pid() + k]) d[k] = PEND[k]; delete PEND[k]; });
  if (!Object.keys(d).length) return;
  try { await call('dados', { d, lang: lang() }); Object.keys(d).forEach(k => { LAST[pid() + k] = JSON.stringify(d[k]); }); } catch (e) { Object.assign(PEND, d); if (e.status !== 401) PT = setTimeout(flush, 60e3); } };
const put = (k, v) => { if (v === undefined) return; PEND[k] = v; if (!PT) PT = setTimeout(flush, 2500); };
const syncAll = async () => { Object.keys(SRC).forEach(k => { try { put(k, SRC[k]()); } catch (e) { } }); clearTimeout(PT); await flush(); };

const P = OS.Push = {
  sup, iOS, standalone,
  // ligado neste aparelho (para este perfil) e com autorização do aparelho
  on: () => { const s = ls(); return !!s.on && s.p === pid() && perm() === 'granted'; },
  // o que impede de ligar: '' (nada), 'conta', 'ios' (instalar no ecrã principal), 'nao' (o navegador não deixa), 'negado'
  why: () => !tok() || !pid() ? 'conta' : iOS && !standalone() ? 'ios' : !sup() ? 'nao' : perm() === 'denied' ? 'negado' : '',
  msg: w => MSG[w] || '',
  put: (k, v) => { if (HAS) put(k, v); },
  syncAll,
  async enable() { const w = P.why(); if (w) { UI.toast(MSG[w], 'warn'); OS.request(); return false; }
    try { const p = await Notification.requestPermission(); if (p !== 'granted') { UI.toast(MSG.negado, 'warn'); OS.request(); return false; }
      const reg = await navigator.serviceWorker.ready, { k } = await call('chave'), want = keyBytes(k);
      let sub = await reg.pushManager.getSubscription();
      // uma subscrição antiga com outra chave do servidor não serve
      if (sub && sub.options && sub.options.applicationServerKey) { const a = new Uint8Array(sub.options.applicationServerKey); if (a.length !== want.length || a.some((x, i) => x !== want[i])) { await sub.unsubscribe(); sub = null; } }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want });
      const j = sub.toJSON(); await call('ligar', { sub: { endpoint: j.endpoint, keys: j.keys }, ua: devName(), lang: lang(), tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '' });
      U.ls.set(K, { on: 1, e: j.endpoint, p: pid(), at: Date.now() }); HAS = true; await syncAll();
      UI.toast('Notificações ligadas: chegam mesmo com o Prumo fechado', 'pos'); OS.request(); return true; }
    catch (e) { UI.toast(e && e.message ? 'Não consegui ligar as notificações: ' + e.message : 'Não consegui ligar as notificações.', 'warn'); OS.request(); return false; } },
  async disable() { try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) { await call('desligar', { endpoint: sub.endpoint }).catch(() => { }); await sub.unsubscribe(); } } catch (e) { }
    U.ls.set(K, {}); UI.toast('Notificações com o app fechado desligadas neste aparelho', 'pos'); OS.request(); },
  async test() { try { const j = await call('testar'); UI.toast(j.enviados ? `Enviámos um teste para ${j.enviados} ${j.enviados === 1 ? 'aparelho' : 'aparelhos'}` : 'O teste não chegou a nenhum aparelho. Desliga e liga outra vez.', j.enviados ? 'pos' : 'warn'); } catch (e) { UI.toast(e.message, 'warn'); } } };

/* ---------- quando mudam os dados, o servidor fica a saber ---------- */
OS.on('change', c => { if (!HAS) return; if (c === 'routine') put('rot', SRC.rot()); if (c === 'palerts') put('inv', SRC.inv()); });
['fut', 'sports', 'pushcfg'].forEach(k => OS.on('one:' + k, () => { if (!HAS) return; if (k === 'fut') put('fut', SRC.fut()); if (k === 'sports') put('sp', SRC.sp()); if (k === 'pushcfg') put('cat', SRC.cat()); }));
// ao abrir: este perfil tem aparelhos com notificações? então põe tudo em dia (a rotina olha 14 dias à frente)
const boot = async () => { if (!tok() || !pid() || navigator.webdriver && !window.__pushTest) return; let sub = null;
  try { if (sup() && perm() === 'granted') { const reg = await navigator.serviceWorker.ready; sub = await reg.pushManager.getSubscription(); } } catch (e) { }
  try { const j = await call('estado', { endpoint: sub ? sub.endpoint : '' }); HAS = j.n > 0;
    const s = ls();
    // o navegador trocou o endereço (ou o servidor esqueceu este aparelho): volta a registar sem perguntar nada
    if (s.on && s.p === pid() && perm() === 'granted' && (!sub || !j.eu)) { await P.enable(); return; }
    if (s.on && s.p === pid() && perm() !== 'granted') U.ls.set(K, {});
    if (HAS) await syncAll(); } catch (e) { } };
OS.on('ready', () => setTimeout(boot, 3000));
setInterval(() => { if (HAS && !document.hidden) syncAll(); }, 6 * 36e5);
document.addEventListener('visibilitychange', () => { if (!document.hidden && HAS) put('rot', SRC.rot()); });

/* ---------- Definições › Notificações ---------- */
const CATS = [['rot', 'Rotina', 'cada bloco do teu dia, na hora (ou uns minutos antes)'], ['foco', 'Bloco de foco', 'quando acaba o tempo'], ['fut', 'Futebol', 'as tuas equipas e campeonatos: começo, golos, resultado'], ['sp', 'Desportos', 'NBA, NFL, voleibol, F1, MotoGP, MMA…'], ['inv', 'Alertas de preço', 'quando uma ação ou cripto chega ao valor que escolheste'], ['jogo', 'Jogos', 'o Pursuit de anime: quando começa (20h de Lisboa) e quando saem os resultados']];
const panel = () => { const w = P.why(), on = P.on(), cat = SRC.cat();
  return `<div class="pn" id="pushSet" data-open="1"><div class="pn-h"><h3>${UI.ic('bell')}Notificações</h3>${on ? UI.badge('ligadas neste aparelho', 'pos') : ''}</div>
    <p class="mut" style="margin:0 0 10px;font-size:13px">Os avisos do Prumo chegam a este aparelho mesmo com o app fechado: a rotina, o fim do bloco de foco, o futebol e os outros desportos que segues e os alertas de preço.</p>
    ${on ? `<div class="row gap8 wrap" style="margin-bottom:12px"><button class="btn sm" data-act="pushTest">${UI.ic('bell')}Enviar um teste</button><button class="btn sm ghost" data-act="pushOff">Desligar neste aparelho</button></div>
      <div class="push-cats">${CATS.map(([k, l, d]) => `<label class="push-cat"><input type="checkbox" data-act="pushCat" data-k="${k}" ${cat[k] ? 'checked' : ''}><span><b>${esc(l)}</b><small>${esc(d)}</small></span></label>`).join('')}</div>`
    : w ? `<p class="push-why">${esc(MSG[w])}</p>${w === 'ios' ? '<p class="mut" style="font-size:12px;margin:6px 0 0">Precisa do iOS 16.4 ou mais recente.</p>' : ''}`
    : `<button class="btn pri" data-act="pushOn">${UI.ic('bell')}Ligar notificações</button>`}</div>`; };
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._push) return; OS.views.definicoes = sub => { const h = o(sub); if (String(sub || '') !== '') return h; const i = h.indexOf('</header>'); return i < 0 ? panel() + h : h.slice(0, i + 9) + panel() + h.slice(i + 9); }; OS.views.definicoes._push = 1; });
A.pushOn = () => P.enable();
A.pushOff = () => P.disable();
A.pushTest = () => P.test();
A.pushCat = b => { const c = Object.assign({}, SRC.cat(), { [b.dataset.k]: b.checked ? 1 : 0 }); OS.setOne('pushcfg', { cat: c }); };
})();
