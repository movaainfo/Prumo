/* Prumo — atualizações visíveis: ecrã curto "A atualizar…" quando chega uma versão nova,
   e aviso "Atualizado · versão X" na primeira abertura dessa versão. */
(() => {
'use strict';
const VER = window.OCEANUM_VERSION || {}, KEY = 'os2ver';
// modo de segurança: endereço com ?seguro → apaga a cache da app, liga o modo leve e recarrega a versão mais recente
if (/[?&](seguro|safe)\b/.test(location.search)) { try { localStorage.setItem('os2lite', '1'); } catch (e) { }
  const done = () => location.replace(location.pathname + '#visao');
  Promise.all([navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))) : 0, window.caches ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : 0]).then(done, done);
  return; }
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
// o aspeto segue a marca: o selo de cera, o fundo da paleta escolhida, creme e dourado
const css = `.upd{position:fixed;inset:0;z-index:650;display:grid;place-items:center;color:#F3E8CF;font:500 15px/1.4 'Geist',system-ui,-apple-system,sans-serif;animation:updIn .3s ease-out}
.upd::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 70% 45% at 50% 38%,rgba(184,36,58,.2),transparent 65%),radial-gradient(ellipse 120% 90% at 50% 50%,transparent 50%,rgba(0,0,0,.45))}
.upd .in{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px;text-align:center;max-width:340px}
.upd .seal{position:relative;width:104px;height:104px;margin-bottom:6px;display:grid;place-items:center}
.upd .seal img{width:92px;height:92px;display:block;animation:updBreath 2.4s ease-in-out infinite}
.upd .seal .upd-ring{position:absolute;inset:-6px;border-radius:50%;border:1.5px solid rgba(233,199,122,.18);border-top-color:#E9C77A;border-right-color:rgba(233,199,122,.55);animation:updSpin 1.1s linear infinite}
.upd .seal .upd-ok{position:absolute;right:-2px;bottom:2px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#F6DC97,#C9A24A 60%,#8A6A2E);box-shadow:0 0 0 3px rgba(0,0,0,.35),0 0 22px rgba(233,199,122,.45);animation:updPop .45s cubic-bezier(.2,1.5,.4,1) .15s both}
.upd .seal .upd-ok svg{width:16px;height:16px;fill:none;stroke:#2A1606;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.upd b{font-size:19px;font-weight:600;letter-spacing:.01em;color:#F3E8CF}
.upd small{color:#E9C77A;font-size:12.5px;letter-spacing:.06em;font-variant-numeric:tabular-nums}
.upd ul{margin:4px 0 0;padding:0;list-style:none;color:rgba(237,230,218,.72);font-size:13.5px;line-height:1.5;text-align:left}.upd li{position:relative;padding-left:14px;margin:0 0 4px}.upd li::before{content:"";position:absolute;left:2px;top:.6em;width:5px;height:5px;border-radius:50%;background:#C9A24A}
.upd .bar{width:180px;height:2px;border-radius:2px;background:rgba(233,199,122,.16);overflow:hidden;margin-top:4px}.upd .bar i{display:block;height:100%;background:linear-gradient(90deg,#C9A24A,#F6DC97);animation:updBar 2.6s linear forwards}
.upd.out{opacity:0;transition:opacity .3s}
@keyframes updSpin{to{transform:rotate(360deg)}}@keyframes updIn{from{opacity:0}}@keyframes updPop{from{transform:scale(.4);opacity:0}}@keyframes updBar{from{width:0}to{width:100%}}
@keyframes updBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
@media (prefers-reduced-motion:reduce){.upd .seal img,.upd .seal .upd-ring{animation:none}}`;
const style = () => { if (!document.getElementById('updCss')) { const s = document.createElement('style'); s.id = 'updCss'; s.textContent = css; document.head.appendChild(s); } };
// o selo (OS.Marca, ou o do ecrã de carregamento) e o fundo da paleta (o mesmo do ecrã de carregamento)
const selo = () => (window.OS && OS.Marca && OS.Marca.selo) || ((document.querySelector('#splash img.oc-logo') || {}).src || '');
const bg = () => { try { const sp = document.getElementById('splash'), c = sp && getComputedStyle(sp).backgroundColor; return c && c !== 'rgba(0, 0, 0, 0)' ? c : getComputedStyle(document.documentElement).backgroundColor || '#130A0B'; } catch (e) { return '#130A0B'; } };
const seal = extra => { const s = selo(); return `<div class="seal">${s ? `<img src="${s}" alt="" aria-hidden="true">` : ''}${extra || ''}</div>`; };
const show = html => { style(); const el = document.createElement('div'); el.className = 'upd'; el.setAttribute('role', 'status'); el.style.background = bg(); el.innerHTML = `<div class="in">${html}</div>`; document.body.appendChild(el); return el; };
// 1) chegou uma versão nova enquanto a app estava aberta: ecrã curto e recarrega
window.OceanumUpdating = () => { show(seal('<i class="upd-ring"></i>') + '<b>A atualizar o Prumo…</b><small>versão nova encontrada</small>'); setTimeout(() => location.reload(), 900); };
// 2) primeira abertura de uma versão nova: confirmação
const prev = ls.get(KEY);
if (VER.v && prev !== VER.v) { ls.set(KEY, VER.v);
  if (prev) { const go = () => { const el = show(`${seal('<i class="upd-ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i>')}<b>Atualizado</b><small>versão ${VER.v} · ${VER.date || ''}</small>${(VER.notes || []).length ? `<ul>${VER.notes.slice(0, 4).map(n => `<li>${String(n).replace(/[<&]/g, c => c === '<' ? '&lt;' : '&amp;')}</li>`).join('')}</ul>` : ''}<div class="bar"><i></i></div>`);
      const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }; el.addEventListener('click', close); setTimeout(close, 2600); };
    // se a intro estiver a correr, o aviso entra depois dela (por cima do ecrã de carregamento)
    const when = () => { const I = window.PrumoIntro; if (I && I.state && /^(waiting|playing)$/.test(I.state())) I.wait(go); else go(); };
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', when); else when(); } }
// 3) atualização automática: ao abrir, ao voltar à app e de 10 em 10 minutos compara a versão desta página com a do servidor.
//    Se houver uma mais nova, recarrega logo (a app vem sempre da internet primeiro, por isso o recarregar já traz a nova).
//    Se mesmo assim não vier, apaga a cópia guardada da app (os teus dados ficam) e recarrega. Nunca interrompe um formulário a meio.
const num = v => { const m = String(v || '').match(/^(\d+)\.(\d+)/); return m ? +m[1] * 1000 + +m[2] : 0; };
const note = (t, k) => { try { if (window.OS && OS.UI && OS.UI.toast) OS.UI.toast(t, k); } catch (e) { } };
let checking = false, lastCheck = 0, forcing = false, waitT = 0;
const TK = 'os2updT', tget = () => { try { return JSON.parse(ls.get(TK) || '{}') || {}; } catch (e) { return {}; } };
if (num(VER.v) >= num(tget().v)) ls.set(TK, '{}'); // já estamos na versão pedida
const serverVer = async () => { const r = await fetch(location.pathname + '?vchk=' + Date.now(), { cache: 'no-store', credentials: 'omit' }); if (!r.ok) return ''; const m = (await r.text()).match(/OCEANUM_VERSION=\{"v": *"([^"]+)"/); return m ? m[1] : ''; };
const hard = async () => { if (forcing) return; forcing = true; show(seal('<i class="upd-ring"></i>') + '<b>A atualizar o Prumo…</b><small>versão nova encontrada</small>');
  try { if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== 'oceanum-img').map(k => caches.delete(k))); } } catch (e) { }
  setTimeout(() => location.reload(), 300); };
// a meio de escrever (campo com texto, formulário aberto): espera
const busy = () => { const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value && a.type !== 'search') return true; const d = document.getElementById('drawer'); return !!(d && !d.hidden && d.querySelector('form, input, textarea')); };
const apply = sv => { if (forcing) return; if (busy()) { clearTimeout(waitT); waitT = setTimeout(() => apply(sv), 20000); return; }
  const t = tget(), n = t.v === sv ? (+t.n || 0) + 1 : 1; ls.set(TK, JSON.stringify({ v: sv, n, at: Date.now() }));
  if (n > 5) return; // algo está mesmo errado: não fica em ciclo (o botão "Procurar atualização" continua a funcionar)
  try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => { }); } catch (e) { }
  if (n >= 2) return hard();
  forcing = true; show(seal('<i class="upd-ring"></i>') + '<b>A atualizar o Prumo…</b><small>versão ' + String(sv).replace(/[<&]/g, '') + '</small>'); setTimeout(() => location.reload(), 700); };
window.OceanumCheckUpdate = async manual => { if (checking || forcing) return ''; if (!manual && Date.now() - lastCheck < 15000) return ''; if (!manual && navigator.onLine === false) return 'off'; lastCheck = Date.now(); checking = true;
  try { const sv = await serverVer(); if (!sv || num(sv) <= num(VER.v)) { if (manual) note('Já tens a versão mais recente (' + (VER.v || '') + ').', 'pos'); return 'ok'; }
    if (manual) { ls.set(TK, JSON.stringify({ v: sv, n: 1 })); note('Versão ' + sv + ' encontrada. A atualizar…'); }
    apply(sv); return 'new'; }
  catch (e) { if (manual) note('Sem internet para procurar a atualização agora.', 'warn'); return 'off'; } finally { checking = false; } };
const soon = ms => setTimeout(() => { if (!document.hidden) window.OceanumCheckUpdate(false); }, ms);
addEventListener('load', () => soon(1500));
document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(800); });
addEventListener('pageshow', e => { if (e.persisted) soon(800); });
addEventListener('online', () => soon(1000));
setInterval(() => { if (!document.hidden) window.OceanumCheckUpdate(false); }, 10 * 60000);
// versão visível no ecrã de abertura
addEventListener('DOMContentLoaded', () => { const f = document.querySelector('.sp-foot'); if (f && VER.v) f.textContent = 'MIND CONTROL · v' + VER.v; });
window.OceanumVersion = VER;
})();
