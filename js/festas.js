/* PRUMO — as festas de cada pessoa (v3.79).
   · Ano Novo: no último segundo do ano o app pára, fica só a contagem de 10 segundos, rebentam os fogos e o app volta.
     Conta o calendário do país escolhido no perfil: o gregoriano (1 de janeiro) na maioria; o Ano Novo Lunar na China, Hong Kong,
     Macau, Taiwan e Vietname; o Nowruz no Irão e no Afeganistão (no momento do equinócio); o Enkutatash na Etiópia; o Rosh Hashaná
     em Israel; o 14 de abril no Bangladesh, Nepal, Sri Lanka e Camboja.
   · Dia de anos (a data de nascimento em Eu › Sobre mim): só nesse perfil, o app fica em festa (balões, confetes, o bolo com velas
     para soprar e os parabéns no Painel).
   · Os avisos no telemóvel (Feliz Ano Novo, Feliz Natal, Páscoa e os parabéns) saem do servidor, à meia-noite de cada um. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const p2 = n => String(n).padStart(2, '0'), ymd = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const LUNAR = { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11' };
const NOWRUZ = { 2027: '2027-03-20T20:24:00Z', 2028: '2028-03-20T02:17:00Z', 2029: '2029-03-20T08:01:00Z', 2030: '2030-03-20T13:51:00Z', 2031: '2031-03-20T19:41:00Z' };
const ROSH = { 2027: '10-02', 2028: '09-21', 2029: '09-10', 2030: '09-28' };
const CAL = { CN: 'lunar', HK: 'lunar', MO: 'lunar', TW: 'lunar', VN: 'lunar', IR: 'nowruz', AF: 'nowruz', ET: 'eth', IL: 'rosh', BD: 'abr', NP: 'abr', LK: 'abr', KH: 'abr' };
const NOME = { lunar: 'Feliz Ano Novo Lunar', nowruz: 'Feliz Nowruz', eth: 'Feliz Enkutatash', rosh: 'Shaná Tová', abr: 'Feliz Ano Novo', greg: 'Feliz Ano Novo' };
const pais = () => { try { return (OS.Country && OS.Country.code && OS.Country.code()) || 'PT'; } catch (e) { return 'PT'; } };
const meiaNoite = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 0, 0, 0, 0).getTime(); };
// o próximo Ano Novo (a partir de há 2 minutos), conforme o calendário do país
const proximo = (agora = Date.now()) => { const c = CAL[pais()] || 'greg', y0 = new Date(agora).getFullYear();
  for (let y = y0; y <= y0 + 1; y++) { let t = 0, ano = y;
    if (c === 'greg') { t = meiaNoite(y + '-01-01'); }
    else if (c === 'lunar') { if (LUNAR[y]) t = meiaNoite(y + '-' + LUNAR[y]); }
    else if (c === 'nowruz') { if (NOWRUZ[y]) t = Date.parse(NOWRUZ[y]); }
    else if (c === 'eth') { t = meiaNoite(y + '-09-' + ((y + 1) % 4 === 0 ? '12' : '11')); }
    else if (c === 'rosh') { if (ROSH[y]) t = meiaNoite(y + '-' + ROSH[y]); }
    else if (c === 'abr') { t = meiaNoite(y + '-04-14'); }
    if (t && t > agora - 2 * 6e4) return { t, c, ano, chave: c + ':' + ano }; }
  return null; };

/* ---------- a contagem e os fogos ---------- */
let VISTO = '';
const fogos = (cv, dur) => { const g = cv.getContext('2d'), P = [], cores = ['#FFD166', '#EF476F', '#06D6A0', '#4CC9F0', '#F72585', '#FFFFFF', '#FF9F1C']; let raf = 0, t0 = performance.now(), last = 0;
  const fit = () => { cv.width = innerWidth * Math.min(2, devicePixelRatio || 1); cv.height = innerHeight * Math.min(2, devicePixelRatio || 1); }; fit();
  const boom = () => { const x = cv.width * (.15 + Math.random() * .7), y = cv.height * (.15 + Math.random() * .4), c = cores[Math.floor(Math.random() * cores.length)], n = 70 + Math.floor(Math.random() * 40), sp = cv.width / 260;
    for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n, v = sp * (.6 + Math.random() * .7); P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c }); } };
  const f = now => { const el = now - t0; if (el - last > 260 && el < dur - 900) { boom(); if (Math.random() < .5) boom(); last = el; }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(8,6,18,.22)'; g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'lighter';
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.vx; p.y += p.vy; p.vy += cv.width / 9000; p.vx *= .985; p.vy *= .985; p.l -= .012; if (p.l <= 0) { P.splice(i, 1); continue; }
      g.globalAlpha = Math.max(0, p.l); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, Math.max(1, cv.width / 520), 0, 7); g.fill(); }
    g.globalAlpha = 1; if (el < dur) raf = requestAnimationFrame(f); };
  raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); };
const festa = (o, contar) => { if (document.getElementById('fxAno')) return; VISTO = o.chave; try { U.ls.set('oc_fx_' + o.chave, 1); } catch (e) { }
  const red = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, ano = new Date(o.t).getFullYear();
  const el = document.createElement('div'); el.id = 'fxAno'; el.className = 'fx-ano'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Contagem para o Ano Novo');
  el.innerHTML = `<canvas class="fx-cv" aria-hidden="true"></canvas><div class="fx-in"><p class="fx-k">${o.c === 'greg' ? 'Último segundo de ' + (ano - 1) : 'Ano Novo'}</p><b class="fx-n" aria-live="assertive"></b><p class="fx-msg"></p></div>`;
  document.body.appendChild(el); document.body.classList.add('fx-parado');
  const n = el.querySelector('.fx-n'), msg = el.querySelector('.fx-msg'), cv = el.querySelector('.fx-cv');
  const fim = () => { const tit = NOME[o.c] + (o.c === 'greg' ? ' ' + ano : ''); n.textContent = ''; el.classList.add('boom'); msg.textContent = tit + '!'; if (!red) fogos(cv, 6500);
    try { if (navigator.vibrate) navigator.vibrate([80, 60, 120]); } catch (e) { }
    setTimeout(() => { el.classList.add('sai'); document.body.classList.remove('fx-parado'); setTimeout(() => el.remove(), 700); }, red ? 2500 : 6500); };
  if (!contar) return fim();
  const tick = () => { const s = Math.ceil((o.t - Date.now()) / 1000); if (s <= 0) return fim(); n.textContent = String(Math.min(10, s)); n.classList.remove('pum'); void n.offsetWidth; n.classList.add('pum'); setTimeout(tick, Math.max(50, o.t - Date.now() - (s - 1) * 1000)); };
  tick(); };
// vigia: a contagem começa 10 segundos antes; se abrires o app nos 2 minutos a seguir, vês os fogos
const vigia = () => { const o = proximo(); if (!o || VISTO === o.chave || U.ls.get('oc_fx_' + o.chave, 0)) return; const falta = o.t - Date.now();
  if (falta <= 10500 && falta > 0) festa(o, true); else if (falta <= 0 && falta > -2 * 6e4) festa(o, false); };
setInterval(vigia, 1000);

/* ---------- dia de anos ---------- */
let PREV_ANOS = 0;   // pré-visualização da administração (até esta hora)
const anos = () => { try { if (PREV_ANOS > Date.now()) { const b0 = (OS.one('me') || {}).birth || ''; return { idade: /^\d{4}/.test(b0) ? new Date().getFullYear() - +b0.slice(0, 4) : 0, nome: ((OS.one('profile') || {}).short || (OS.who && OS.who()) || '').split(' ')[0], prev: 1 }; }
  const b = (OS.one('me') || {}).birth || ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) return null; const t = ymd(new Date());
  if (b.slice(5) !== t.slice(5) && !(b.slice(5) === '02-29' && t.slice(5) === '02-28' && new Date(new Date().getFullYear(), 1, 29).getMonth() !== 1)) return null;
  return { idade: new Date().getFullYear() - +b.slice(0, 4), nome: ((OS.one('profile') || {}).short || (OS.who && OS.who()) || '').split(' ')[0] }; } catch (e) { return null; } };
let VELAS = false;
const bolo = a => `<section class="fx-anos" aria-label="Parabéns"><div class="fx-bolo${VELAS ? ' soprado' : ''}" aria-hidden="true">${Array.from({ length: Math.min(5, Math.max(1, Math.round((a.idade || 5) / 10))) }, () => '<span class="fx-vela"><i></i></span>').join('')}<span class="fx-cob"></span><span class="fx-massa"></span></div>
  <div><h2>Parabéns${a.nome ? ', ' + esc(a.nome) : ''}!</h2><p>${a.idade > 0 && a.idade < 130 ? 'Hoje fazes ' + a.idade + ' anos. ' : ''}O dia é teu. Que este ano seja o melhor até agora.</p>
  <button type="button" class="btn pri" data-act="fxSoprar"${VELAS ? ' disabled' : ''}>${VELAS ? 'Pedido feito' : 'Soprar as velas'}</button></div></section>`;
const confetes = () => { const c = document.createElement('div'); c.className = 'fx-conf'; c.setAttribute('aria-hidden', 'true'); const cores = ['#FFD166', '#EF476F', '#06D6A0', '#4CC9F0', '#F72585', '#FF9F1C'];
  c.innerHTML = Array.from({ length: 70 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${cores[i % cores.length]};animation-delay:${(Math.random() * .8).toFixed(2)}s;animation-duration:${(2.4 + Math.random() * 1.6).toFixed(2)}s;transform:rotate(${Math.floor(Math.random() * 360)}deg)"></i>`).join('');
  document.body.appendChild(c); setTimeout(() => c.remove(), 4800); };
A.fxSoprar = () => { VELAS = true; confetes(); OS.request(); };
const baloes = () => { const t = document.getElementById('top'); if (!t || t.querySelector('.fx-bal')) return; const b = document.createElement('div'); b.className = 'fx-bal'; b.setAttribute('aria-hidden', 'true');
  b.innerHTML = ['#EF476F', '#FFD166', '#4CC9F0', '#06D6A0', '#F72585'].map((c, i) => `<i style="--c:${c};--d:${i * .7}s"></i>`).join(''); t.appendChild(b); };
const emFesta = () => { const a = anos(); document.body.classList.toggle('fx-dia-anos', !!a); if (!a) return; baloes();
  const k = 'oc_fx_anos_' + ymd(new Date()); if (!U.ls.get(k, 0)) { try { U.ls.set(k, 1); } catch (e) { } setTimeout(confetes, 900); } };
OS.on && OS.on('ready', () => { emFesta(); setInterval(emFesta, 6e4); OS.on('one:me', emFesta);
  try { new MutationObserver(() => { if (document.body.classList.contains('fx-dia-anos')) baloes(); }).observe(document.getElementById('top') || document.body, { childList: true }); } catch (e) { }
  const o = OS.views.visao; if (o && !o._fx) { OS.views.visao = sub => { const h = o(sub), a = anos(); if (!a) return h; const k = '<div class="dash-grid">', i = h.indexOf(k); return i < 0 ? bolo(a) + h : h.slice(0, i) + bolo(a) + h.slice(i); }; OS.views.visao._fx = 1; } });

// pré-visualizar (Administração › Agenda): a contagem de 10 segundos com os fogos e o dia de anos, sem mexer no que fica guardado
const preverAno = () => { const p = proximo() || { c: CAL[pais()] || 'greg', t: Date.now() }; const v = VISTO; festa({ t: Date.now() + 10400, c: p.c, chave: '__prev' }, true); VISTO = v; setTimeout(() => { try { localStorage.removeItem('oc_fx___prev'); U.ls.set('oc_fx___prev', 0); } catch (e) { } }, 500); };
const preverAnos = (min = 3) => { PREV_ANOS = Date.now() + min * 6e4; VELAS = false; emFesta(); confetes(); OS.request && OS.request(); setTimeout(() => { emFesta(); OS.request && OS.request(); }, min * 6e4 + 500); };
const pararPrev = () => { PREV_ANOS = 0; emFesta(); OS.request && OS.request(); };   // v3.88: "Parar a prévia" da Agenda
OS.Festas = { proximo, anos, festa, CAL, NOWRUZ, LUNAR, ROSH, NOME, preverAno, preverAnos, pararPrev };
})();
