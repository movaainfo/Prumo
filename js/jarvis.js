/* PRUMO — Modo Comando: painel em ecrã inteiro com o essencial do dia, ao vivo.
   O X fecha o painel mas o botão redondo (núcleo) fica no canto para voltar quando quiseres. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const J = OS.Jarvis = {};
const cfg = () => Object.assign({ jarvisStart: true }, OS.one('spyke'));
let el = null, fab = null, raf = 0, dataAt = 0, newsX = 0, newsW = 0;
const name = () => OS.one('profile').short || OS.who();
const eur = v => U.eur(v);
const greet = () => { const h = new Date().getHours(), g = h < 6 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 19 ? 'Boa tarde' : 'Boa noite'; return OS.Lang ? OS.Lang.t(g) : g; };

/* ---------- dados ---------- */
const D = () => { const t = U.today(), nowM = new Date().getHours() * 60 + new Date().getMinutes(), o = {};
  try { o.agenda = U.sortBy(OS.Cal.items(t, t).filter(x => x.src !== 'task' && !x.done), x => x.start || '99').slice(0, 6); } catch (e) { o.agenda = []; }
  try { o.next = OS.Intel.next().slice(0, 4); } catch (e) { o.next = []; }
  try { o.alerts = OS.Intel.alerts(); } catch (e) { o.alerts = []; }
  try { const hs = OS.all('habits').filter(h => h.active && OS.Hab.due(h, t)); o.hab = [hs.filter(h => OS.Hab.done(h, t)).length, hs.length]; } catch (e) { o.hab = [0, 0]; }
  try { o.study = U.sum(OS.all('sessions').filter(x => x.date === t), x => x.minutes); } catch (e) { o.study = 0; }
  try { const F = OS.Fin, m = F.month(U.ym(t)); o.fin = { liq: F.liquid(), exp: m.exp, inc: m.inc, bill: F.upcoming(14).filter(x => x.amount < 0 && !x.tx)[0] }; } catch (e) { o.fin = null; }
  try { o.exam = U.sortBy(OS.all('assessments').filter(a => a.date >= t), a => a.date)[0]; o.rev = OS.St.revDue().length; } catch (e) { }
  try { o.mail = OS.Mail ? OS.Mail.counts() : null; } catch (e) { }
  try { o.doneT = OS.all('tasks').filter(x => x.doneAt === t).length; } catch (e) { o.doneT = 0; }
  o.wx = OS.Weather && OS.Weather.cached(); o.news = (OS.Spyke && OS.Spyke._news) || [];
  o.dayP = Math.min(1, Math.max(0, (nowM - 360) / (1440 - 360 - 60)));
  return o; };

/* ---------- desenho ---------- */
const card = (k, title, body, href) => `<section class="jv-c" style="--i:${k}" ${href ? `data-jvgo="${href}"` : ''}><i class="jv-sw" aria-hidden="true"></i><h4>${title}</h4>${body}</section>`;
function render() { if (!el) return; const o = D(), t = U.today(), urg = o.alerts.filter(a => a.lvl === 'urgent');
  const wx = o.wx && o.wx.now ? `<div class="jv-wx">${OS.Weather.icon(o.wx.now.code, 40)}<div><b>${o.wx.now.t}°</b><small>${esc(OS.Weather.desc(o.wx.now.code))} · ${esc(o.wx.label)}</small></div></div><div class="jv-days">${o.wx.days.slice(1, 4).map(d => `<div>${OS.Weather.icon(d.code, 20)}<small>${U.WDS[U.parse(d.d).getDay()]}</small><b>${d.max}°<i>${d.min}°</i></b></div>`).join('')}</div>` : '<small class="mut">A carregar o clima…</small>';
  const ag = o.agenda.length ? `<ul class="jv-l">${o.agenda.map(x => `<li><b>${x.start || '—'}</b><span>${esc(x.title)}</span></li>`).join('')}</ul>` : '<small class="mut">Sem compromissos hoje.</small>';
  const nx = o.next.length ? `<ol class="jv-l jv-n">${o.next.map(n => `<li><span>${esc(n.title)}</span><small>${esc((n.why || [])[0] || n.kind || '')}</small></li>`).join('')}</ol>` : '<small class="mut">Nada pendente.</small>';
  const al = `<div class="jv-big ${urg.length ? 'neg' : 'pos'}">${urg.length}<small>${urg.length === 1 ? 'urgente' : 'urgentes'}</small></div>${urg.slice(0, 2).map(a => `<small class="jv-al">${esc(a.title)}</small>`).join('')}`;
  const fin = o.fin ? `<div class="jv-kv"><span>Disponível</span><b>${eur(o.fin.liq)}</b></div><div class="jv-kv"><span>Gasto do mês</span><b>${eur(o.fin.exp)}</b></div>${o.fin.bill ? `<div class="jv-kv"><span>${esc(o.fin.bill.title)}</span><b>${U.fmtDS(o.fin.bill.date)}</b></div>` : ''}` : '';
  const un = o.exam ? `<div class="jv-big">${Math.max(0, U.diff(o.exam.date, t))}<small>dias para ${esc(o.exam.type || 'avaliação')}</small></div><small>${esc((OS.get('subjects', o.exam.subject) || {}).name || o.exam.title)}</small>${o.rev ? `<small class="jv-al">${o.rev} revisões para hoje</small>` : ''}` : `<small class="mut">Sem avaliações marcadas.</small>${o.rev ? `<small class="jv-al">${o.rev} revisões para hoje</small>` : ''}`;
  const ml = o.mail && o.mail.at ? `<div class="jv-kv"><span>Urgentes</span><b class="${o.mail.urg ? 'neg' : ''}">${o.mail.urg}</b></div><div class="jv-kv"><span>Para responder</span><b>${o.mail.resp}</b></div><div class="jv-kv"><span>Não lidos</span><b>${o.mail.unread}</b></div>` : '<small class="mut">E-mail não ligado.</small>';
  el.innerHTML = `<div class="jv-in">
    <header class="jv-h"><div class="jv-brand"><b>SPYKE</b><small>MODO COMANDO</small></div><div class="jv-clock"><b data-jvt>${U.hm()}</b><small>${esc(new Date().toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }))}</small></div><button class="jv-x" data-act="jvClose" aria-label="Fechar o modo Jarvis">${UI.ic('x')}</button></header>
    <div class="jv-grid">
      <section class="jv-core"><canvas class="jv-cv" width="520" height="520" aria-hidden="true"></canvas><div class="jv-hi">${esc(greet())}, ${esc(name())}</div>
        <div class="jv-meta"><span><i style="background:rgb(${OS.aiCol().day})"></i>Dia ${Math.round(o.dayP * 100)}%</span><span><i style="background:#22c55e"></i>Hábitos ${o.hab[0]}/${o.hab[1]}</span><span><i style="background:#f59e0b"></i>Estudo ${o.study} min</span></div>
        <div class="jv-btns"><button class="btn pri" data-act="jvTalk">${UI.ic('mic')}Falar</button><button class="btn" data-act="jvSay" data-q="bom dia">Resumo</button><button class="btn" data-act="jvSay" data-q="modo estudo">Estudo</button><button class="btn" data-act="jvSay" data-q="boa noite">Boa noite</button></div></section>
      ${card(1, 'Clima', wx)}${card(2, 'Agenda de hoje', ag, 'calendario')}${card(3, 'Prioridades', nx, 'next')}${card(4, 'Alertas', al, 'visao')}
      ${card(5, 'Finanças', fin, 'financas')}${card(6, 'Universidade', un, 'universidade')}${card(7, 'E-mail', ml, 'email')}${card(8, 'Hoje', `<div class="jv-kv"><span>Hábitos</span><b>${o.hab[0]}/${o.hab[1]}</b></div><div class="jv-bar"><i style="width:${o.hab[1] ? Math.round(o.hab[0] / o.hab[1] * 100) : 0}%"></i></div><div class="jv-kv"><span>Estudo</span><b>${o.study} min</b></div><div class="jv-kv"><span>Tarefas feitas</span><b>${o.doneT}</b></div>`, 'habitos')}
    </div>
    ${o.news.length ? `<div class="jv-news"><b>NOTÍCIAS</b><div class="jv-tk"><span class="jv-tr">${o.news.map(esc).join('<i></i>')}</span></div></div>` : ''}
  </div>`;
  dataAt = Date.now(); newsX = 0; newsW = 0; loop(o); countUp(); }

/* núcleo animado: anéis = dia, hábitos e estudo. As cores seguem a paleta do app (Definições › Cores do app).
   v2.97: ondas de sonar, partículas em órbita, faíscas, radar com ecos, cometas a correr nos anéis, varrimento e reação à voz do Spyke. */
const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('lite-x'); } catch (e) { return false; } };
const lite = () => document.documentElement.classList.contains('lite');
const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
let openAt = 0;
function loop(o) { cancelAnimationFrame(raf); const c = el && el.querySelector('.jv-cv'); if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), css = c.clientWidth || 340, px = Math.round(css * dpr); if (px > 120 && Math.abs(c.width - px) > 2) c.width = c.height = px;
  const g = c.getContext('2d'), W = c.width, cx = W / 2, cy = W / 2, k = W / 520, hp = o.hab[1] ? o.hab[0] / o.hab[1] : 0, sp = Math.min(1, o.study / 120), still = calm(), lt = lite();
  const tr = el.querySelector('.jv-tr'), tk = el.querySelector('.jv-tk'), tt = el.querySelector('[data-jvt]'); let hm = '';
  const TAU = Math.PI * 2, ORB = Array.from({ length: lt ? 8 : 16 }, (_, i) => ({ r: [.335, .395, .455][i % 3], s: (.18 + rnd(i) * .3) * (i % 2 ? -1 : 1), a: rnd(i + 9) * TAU, z: 1.2 + rnd(i + 3) * 1.8 })),
    BLIP = Array.from({ length: 7 }, (_, i) => ({ a: rnd(i + 40) * TAU, r: .09 + rnd(i + 50) * .16 })), SPK = lt ? [] : Array.from({ length: 22 }, (_, i) => ({ a: rnd(i + 70) * TAU, o: rnd(i + 90), v: .12 + rnd(i + 110) * .14, z: .8 + rnd(i + 130) * 1.6 }));
  const frame = now => { if (!el || el.hidden) { raf = 0; return; } const C = OS.aiCol(), T = Math.max(0, (now - openAt) / 1000), t = still ? 30 : T, intro = still ? 1 : Math.min(1, T / 1.4), e = 1 - Math.pow(1 - intro, 3);
    const st = OS.Spyke && OS.Spyke.state ? OS.Spyke.state() : 'idle', lv = st === 'speaking' && OS.Spyke.level ? OS.Spyke.level() : st === 'listening' && OS.Ear ? Math.min(1, (OS.Ear.level || 0) * 12) : 0, spin = st === 'thinking' ? 3 : st === 'listening' ? 1.6 : 1;
    g.clearRect(0, 0, W, W); g.lineCap = 'round';
    // halo que respira
    const br = .5 + .5 * Math.sin(t * 1.1), glow = g.createRadialGradient(cx, cy, 10 * k, cx, cy, W * .48); glow.addColorStop(0, `rgba(${C.hi},${.3 + .1 * br + lv * .2})`); glow.addColorStop(.45, `rgba(${C.mid},${.1 + .05 * br})`); glow.addColorStop(1, `rgba(${C.mid},0)`); g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, W * .48, 0, TAU); g.fill();
    // régua exterior a rodar (traços finos e grossos num só traçado cada)
    const rot = t * .05 * spin; g.strokeStyle = `rgba(${C.tick},.18)`; g.lineWidth = k; g.beginPath(); for (let i = 0; i < 60; i++) { if (!(i % 5)) continue; const a = i / 60 * TAU + rot; g.moveTo(cx + Math.cos(a) * W * .46, cy + Math.sin(a) * W * .46); g.lineTo(cx + Math.cos(a) * W * .475, cy + Math.sin(a) * W * .475); } g.stroke();
    g.strokeStyle = `rgba(${C.tick},.5)`; g.lineWidth = 2 * k; g.beginPath(); for (let i = 0; i < 60; i += 5) { const a = i / 60 * TAU + rot; g.moveTo(cx + Math.cos(a) * W * .46, cy + Math.sin(a) * W * .46); g.lineTo(cx + Math.cos(a) * W * .485, cy + Math.sin(a) * W * .485); } g.stroke();
    // marcador que dá a volta por fora (o "cursor" do Spyke)
    const ma = -t * .32 * spin; g.fillStyle = `rgba(${C.core},.85)`; g.beginPath(); g.moveTo(cx + Math.cos(ma) * W * .452, cy + Math.sin(ma) * W * .452); g.lineTo(cx + Math.cos(ma + .035) * W * .492, cy + Math.sin(ma + .035) * W * .492); g.lineTo(cx + Math.cos(ma - .035) * W * .492, cy + Math.sin(ma - .035) * W * .492); g.closePath(); g.fill();
    // anéis de progresso, com um cometa a correr na parte cheia e a ponta acesa
    const ring = (r, p, col, w, n) => { g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = w * k; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); const end = -Math.PI / 2 + TAU * p * e;
      g.strokeStyle = col; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, end); g.stroke(); if (p <= .005) return;
      if (!still) { const q = ((t * .28 + n * .33) % 1) * p * e, a = -Math.PI / 2 + TAU * q; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = w * .55 * k; g.beginPath(); g.arc(cx, cy, r, Math.max(-Math.PI / 2, a - .22), a); g.stroke(); }
      const ex = cx + Math.cos(end) * r, ey = cy + Math.sin(end) * r, pu = 1 + .25 * Math.sin(t * 3 + n); g.fillStyle = col; g.globalAlpha = .25; g.beginPath(); g.arc(ex, ey, w * 1.5 * pu * k, 0, TAU); g.fill(); g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, w * .42 * k, 0, TAU); g.fill(); };
    ring(W * .42, o.dayP, `rgb(${C.day})`, 7, 0); ring(W * .36, hp, '#22c55e', 7, 1); ring(W * .30, sp, '#f59e0b', 7, 2);
    // anéis pontilhados entre os de progresso, em sentidos contrários
    g.strokeStyle = `rgba(${C.tick},.22)`; g.lineWidth = 1.2 * k; g.setLineDash([2 * k, 7 * k]); g.lineDashOffset = -t * 18 * k * spin; g.beginPath(); g.arc(cx, cy, W * .39, 0, TAU); g.stroke(); g.lineDashOffset = t * 14 * k * spin; g.beginPath(); g.arc(cx, cy, W * .33, 0, TAU); g.stroke(); g.setLineDash([]);
    // partículas em órbita
    g.fillStyle = `rgba(${C.arc},.8)`; g.beginPath(); ORB.forEach(p => { const a = p.a + t * p.s * spin, x = cx + Math.cos(a) * W * p.r, y = cy + Math.sin(a) * W * p.r; g.moveTo(x + p.z * k, y); g.arc(x, y, p.z * k * e, 0, TAU); }); g.fill();
    // arcos interiores a rodar
    g.strokeStyle = `rgba(${C.arc},.75)`; g.lineWidth = 2.2 * k; g.beginPath(); [[.22, 1.2, 6], [.18, -1.8, 3], [.25, .5, 12]].forEach(([rr, s, n]) => { const R = Math.max(1, W * rr * e); for (let i = 0; i < n; i++) { const a = t * s * spin + i * TAU / n; g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.arc(cx, cy, R, a, a + TAU / n * .55); } }); g.stroke();
    // radar: varrimento com rasto e ecos que acendem quando ele passa
    const sw = t * 1.3 * spin;
    if (!lt && g.createConicGradient) { const sg = g.createConicGradient(sw, cx, cy); sg.addColorStop(0, `rgba(${C.hi},0)`); sg.addColorStop(.86, `rgba(${C.hi},0)`); sg.addColorStop(1, `rgba(${C.hi},.3)`); g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, W * .27, 0, TAU); g.fill(); }
    g.strokeStyle = `rgba(${C.hi},.55)`; g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(sw) * W * .27, cy + Math.sin(sw) * W * .27); g.stroke();
    if (!still) BLIP.forEach(b => { const d = ((sw - b.a) % TAU + TAU) % TAU; if (d > 1.6) return; const al = 1 - d / 1.6, x = cx + Math.cos(b.a) * W * b.r, y = cy + Math.sin(b.a) * W * b.r; g.fillStyle = `rgba(${C.core},${al * .9})`; g.beginPath(); g.arc(x, y, (2 + 2 * al) * k, 0, TAU); g.fill(); g.strokeStyle = `rgba(${C.hi},${al * .5})`; g.lineWidth = k; g.beginPath(); g.arc(x, y, (5 + 9 * (1 - al)) * k, 0, TAU); g.stroke(); });
    // ondas de sonar a sair do centro (mais depressa quando o Spyke ouve ou fala)
    if (!still) { const P = st === 'idle' ? 3.2 : 1.3; for (let j = 0; j < 2; j++) { const p = ((t / P) + j * .5) % 1, r = W * (.1 + p * (.25 + lv * .08)); g.strokeStyle = `rgba(${C.wave},${(1 - p) * (.32 + lv * .4)})`; g.lineWidth = (2.2 - p * 1.4) * k; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); } }
    // faíscas que saem do núcleo e se apagam
    SPK.forEach(s => { const p = (t * s.v + s.o) % 1, a = s.a + t * .07, r = W * (.08 + p * .38); g.globalAlpha = Math.sin(p * Math.PI) * .7 * e; g.fillStyle = `rgb(${C.core})`; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s.z * k, 0, TAU); g.fill(); }); g.globalAlpha = 1;
    // núcleo: pulsa, com um anel tracejado a rodar e a voz à volta quando fala
    const cr = W * (.07 + .008 * Math.sin(t * 2.2) + lv * .02) * e; g.fillStyle = `rgba(${C.core},.96)`; g.beginPath(); g.arc(cx, cy, Math.max(1, cr), 0, TAU); g.fill();
    g.strokeStyle = `rgba(${C.core},.5)`; g.lineWidth = 1.5 * k; g.setLineDash([6 * k, 5 * k]); g.lineDashOffset = -t * 20 * k * spin; g.beginPath(); g.arc(cx, cy, Math.max(1, W * .1 * e), 0, TAU); g.stroke(); g.setLineDash([]);
    if (lv > .02 && !still) { g.strokeStyle = `rgba(${C.wave},${.3 + lv * .6})`; g.lineWidth = 2 * k; g.beginPath(); for (let i = 0; i <= 72; i++) { const a = i / 72 * TAU, rr = W * .13 + lv * 18 * k * Math.sin(a * 6 + t * 10) * Math.sin(a * 3 - t * 7); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.stroke(); }
    // varrimento horizontal de vez em quando (como um ecrã a ler)
    if (!still && !lt) { const p = (t % 7) / 1.3; if (p < 1) { const y = cy - W * .47 + p * W * .94, hw = Math.sqrt(Math.max(0, Math.pow(W * .47, 2) - Math.pow(y - cy, 2))), lg = g.createLinearGradient(cx - hw, 0, cx + hw, 0); lg.addColorStop(0, `rgba(${C.hi},0)`); lg.addColorStop(.5, `rgba(${C.hi},${.35 * Math.sin(p * Math.PI)})`); lg.addColorStop(1, `rgba(${C.hi},0)`); g.strokeStyle = lg; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(cx - hw, y); g.lineTo(cx + hw, y); g.stroke(); } }
    if (tr && tk && !still) { if (!newsW) newsW = tr.scrollWidth; newsX -= .6; if (newsX < -newsW) newsX = tk.clientWidth; tr.style.transform = `translateX(${newsX}px)`; }
    const h = U.hm(); if (tt && h !== hm) { hm = h; tt.innerHTML = esc(h).replace(':', '<i class="jv-co">:</i>'); }
    if (Date.now() - dataAt > 60e3) { render(); return; }
    raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame); }

/* números a contar do zero ao abrir (só na abertura; as atualizações de minuto não repetem) */
let cuT0 = 0;
const countUp = () => { if (!el || calm() || performance.now() > cuT0 + 900) return; const nodes = [], RX = /\d(?:[\d.,\u00a0\u202f]*\d)?/g;
  el.querySelectorAll('.jv-big, .jv-kv b, .jv-wx b, .jv-meta span').forEach(x => { const w = document.createTreeWalker(x, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (/\d/.test(n.nodeValue)) nodes.push({ n, s: n.nodeValue }); });
  if (!nodes.length) return;
  const fmt = (tok, p) => { const lc = tok.lastIndexOf(','), f = String(Math.round(+tok.replace(/\D/g, '') * p)).padStart(lc >= 0 ? tok.length - lc : 1, '0'); let out = '', j = f.length - 1;
    for (let i = tok.length - 1; i >= 0 && j >= 0; i--) out = (/\d/.test(tok[i]) ? f[j--] : tok[i]) + out; return (j >= 0 ? f.slice(0, j + 1) : '') + out; };
  // se o painel se redesenhar a meio (ex.: chega o tempo), este conto pára e o render() começa outro com o mesmo relógio
  const D = 900, step = now => { const q = Math.max(0, Math.min(1, (now - cuT0) / D)), p = 1 - Math.pow(1 - q, 3); if (!el || !nodes[0].n.isConnected) return;
    nodes.forEach(x => { x.n.nodeValue = q >= 1 ? x.s : x.s.replace(RX, m => fmt(m, p)); }); if (q < 1 && !el.hidden) requestAnimationFrame(step); else nodes.forEach(x => { x.n.nodeValue = x.s; }); };
  requestAnimationFrame(step); };
let fxT = 0;
/* ---------- abrir / fechar ---------- */
const mkFab = () => { if (fab) return; fab = document.createElement('button'); fab.type = 'button'; fab.id = 'jvFab'; fab.setAttribute('aria-label', 'Abrir o modo Comando'); fab.title = 'Modo Comando'; fab.innerHTML = '<i></i>'; fab.onclick = () => J.open(true); document.body.appendChild(fab); };
J.open = sound => { mkFab(); if (!el) { el = document.createElement('div'); el.id = 'jv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Modo Comando'); document.body.appendChild(el); }
  el.hidden = false; document.documentElement.classList.add('jv-open'); el.classList.remove('on'); openAt = performance.now(); cuT0 = openAt + 280; el.classList.add('fx'); clearTimeout(fxT); fxT = setTimeout(() => el && el.classList.remove('fx'), 3200); render(); requestAnimationFrame(() => requestAnimationFrame(() => el && el.classList.add('on'))); if (fab) fab.hidden = true;
  if (sound && OS.Spyke && OS.Spyke.wakeSound) OS.Spyke.wakeSound(); if (OS.Weather && !(OS.Weather.cached() || {}).now) OS.Weather.get().then(() => el && !el.hidden && render()); };
J.close = () => { if (!el) return; el.hidden = true; el.classList.remove('on'); cancelAnimationFrame(raf); raf = 0; document.documentElement.classList.remove('jv-open'); if (fab) fab.hidden = false; };
J.isOpen = () => !!(el && !el.hidden);
A.jvClose = () => J.close();
A.jvOpen = () => J.open(true);
A.jvTalk = () => { OS.Spyke && OS.Spyke.listen(); };
A.jvSay = b => { OS.Spyke && OS.Spyke.handle(b.dataset.q); };
document.addEventListener('click', e => { const g = e.target.closest('[data-jvgo]'); if (g && el && el.contains(g)) { J.close(); OS.go(g.dataset.jvgo); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && J.isOpen() && !(document.getElementById('spy') && !document.getElementById('spy').hidden)) J.close(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && J.isOpen()) render(); });
OS.on('ready', () => { mkFab(); if (cfg().jarvisStart && !navigator.webdriver && !(OS.FocusBlock && OS.FocusBlock.state()) && !/^#(spyke|foco)/.test(location.hash)) setTimeout(() => J.open(false), 400); });
})();
