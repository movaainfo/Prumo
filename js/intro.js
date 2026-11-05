/* PRUMO — a intro ao abrir (antes do ecrã de carregamento de sempre).
   1) o fio de prumo cai e oscila até ficar a prumo (0°), dentro de um círculo de medida;
   2) uma gota de cera desce pelo fio e espalha-se; 3) o carimbo desce: impacto, faíscas, ondas, e fica o selo;
   4) "Prumo" letra a letra, o traço e o lema dourados; 5) a intro desaparece e por baixo está o ecrã de carregamento, igual.
   Corre logo a seguir ao #splash (antes dos outros scripts). Só transform e opacity (o compositor anima mesmo com o
   processador ocupado a carregar o resto), sem desfoques. Um toque salta. Com "reduzir movimento" ou o modo Leve não aparece.
   Definições › Aplicação › Intro ao abrir: sempre (por omissão), uma vez por dia ou nunca. */
(() => {
'use strict';
const HOLD = 1100;  // depois da intro, o ecrã de carregamento (com a sua entrada) fica à vista pelo menos isto (ms)
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const ssGet = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } };
const day = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const mode = () => { const v = lsGet('nau:intro'); return v === 'nunca' || v === 'dia' ? v : 'sempre'; };
const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('lite-x'); } catch (e) { return false; } };

// as imagens da marca vêm do ecrã de carregamento (já estão no HTML): o selo, o nome e o lema
const svgOf = src => decodeURIComponent(String(src || '').replace(/^data:image\/svg\+xml(;utf8)?,/, ''));
const url = s => 'data:image/svg+xml,' + encodeURIComponent(s);
const only = (svg, keep) => { let i = -1; return svg.replace(/<path\b[^>]*\/>/g, m => (++i === keep ? m : '')); };
const parts = () => {
  const sp = document.getElementById('splash'); if (!sp) return null;
  const selo = sp.querySelector('img.oc-logo'), nome = sp.querySelector('img.sp-name'), lema = sp.querySelector('img.pr-lema');
  if (!selo || !nome || !lema) return null;
  const S = svgOf(selo.getAttribute('src')), N = svgOf(nome.getAttribute('src')), L = svgOf(lema.getAttribute('src'));
  // a cera derretida: o mesmo contorno do selo, sem o prato nem os louros
  const vb = (S.match(/viewBox='([^']+)'/) || S.match(/viewBox="([^"]+)"/) || [])[1], defs = (S.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
  const wax = (S.match(/<path\b[^>]*url\(#wax\)[^>]*\/>/) || [''])[0], rim = (S.match(/<path\b[^>]*stroke=['"]#FF8A9A['"][^>]*\/>/) || [''])[0];
  if (!vb || !wax) return null;
  const blob = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}'>${defs}${wax}${rim}</svg>`;
  const n = (N.match(/<path\b/g) || []).length, letters = Array.from({ length: n }, (_, i) => url(only(N, i)));
  return { selo: selo.getAttribute('src'), nome: nome.getAttribute('src'), blob: url(blob), letters, rule: url(L.replace(/<g\b[\s\S]*<\/g>/, '')), tag: url(L.replace(/<rect\b[^>]*\/>/, '')),
    vb: vb.split(/\s+/).map(Number) };
};
// guardadas logo ao abrir: depois o ecrã de carregamento passa a ser o ecrã do código (para "Ver a intro agora" nas Definições)
let PC = null; const getParts = () => PC || (PC = parts());
const bgNow = () => { const sp = document.getElementById('splash'); return sp ? getComputedStyle(sp).backgroundColor : '#070D16'; };

// peças desenhadas aqui: o prumo de latão, a gota, o carimbo visto de cima e o círculo de medida
const BOB = url(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 40'><defs><linearGradient id='b' x1='0' x2='1'><stop offset='0' stop-color='#6B4C1A'/><stop offset='.32' stop-color='#F6DC97'/><stop offset='.55' stop-color='#C9A24A'/><stop offset='1' stop-color='#4E3712'/></linearGradient></defs><rect x='9' y='0' width='6' height='5' rx='1.6' fill='url(#b)'/><path d='M3.5 5h17l-1.2 6.2H4.7z' fill='url(#b)'/><path d='M4.7 11.2h14.6L12 40z' fill='url(#b)'/><path d='M4.7 11.2h14.6' stroke='#3A270B' stroke-opacity='.55' stroke-width='.9'/><path d='M8 13l4 22' stroke='#FFF3CF' stroke-opacity='.45' stroke-width='1.1'/></svg>`);
const DROP = url(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 28'><defs><radialGradient id='d' cx='.38' cy='.62' r='.7'><stop offset='0' stop-color='#E8475E'/><stop offset='.55' stop-color='#A21A2F'/><stop offset='1' stop-color='#5C0A19'/></radialGradient></defs><path d='M10 0C10 0 20 13 20 18.5a10 9.5 0 0 1-20 0C0 13 10 0 10 0z' fill='url(#d)'/><ellipse cx='6.6' cy='17' rx='2' ry='3.4' fill='#FFC2CB' fill-opacity='.55'/></svg>`);
const STAMP = url(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><radialGradient id='r' cx='.35' cy='.3' r='.85'><stop offset='0' stop-color='#F4D894'/><stop offset='.45' stop-color='#B88A35'/><stop offset='1' stop-color='#4A3310'/></radialGradient><radialGradient id='w' cx='.4' cy='.35' r='.8'><stop offset='0' stop-color='#5A3826'/><stop offset='.6' stop-color='#2E1B12'/><stop offset='1' stop-color='#170C08'/></radialGradient></defs><circle cx='50' cy='50' r='49' fill='url(#r)'/>${Array.from({ length: 48 }, (_, i) => { const a = i * Math.PI / 24, x = 50 + Math.cos(a) * 46.5, y = 50 + Math.sin(a) * 46.5; return `<circle cx='${x.toFixed(2)}' cy='${y.toFixed(2)}' r='1.3' fill='#3A270B' fill-opacity='.45'/>`; }).join('')}<circle cx='50' cy='50' r='41' fill='url(#w)'/><circle cx='50' cy='50' r='41' fill='none' stroke='#E9C77A' stroke-opacity='.5' stroke-width='1'/><circle cx='50' cy='50' r='13' fill='url(#r)'/><path d='M22 34a32 32 0 0 1 22-15' stroke='#FFE9B8' stroke-opacity='.35' stroke-width='3' fill='none' stroke-linecap='round'/></svg>`);
const GEO = url(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='-160 -160 320 320' fill='none' stroke='#C9A24A'><circle r='72' stroke-opacity='.32' stroke-width='.8'/><circle r='112' stroke-opacity='.22' stroke-width='.8' stroke-dasharray='2 5'/><circle r='150' stroke-opacity='.16' stroke-width='.8'/>${Array.from({ length: 72 }, (_, i) => { const a = i * Math.PI / 36, L = i % 6 === 0 ? 14 : i % 2 === 0 ? 7 : 4, r0 = 150 - L, c = Math.cos(a), s = Math.sin(a); return `<path d='M${(c * r0).toFixed(1)} ${(s * r0).toFixed(1)}L${(c * 150).toFixed(1)} ${(s * 150).toFixed(1)}' stroke-opacity='${i % 6 === 0 ? .55 : .3}' stroke-width='${i % 6 === 0 ? 1.1 : .8}'/>`; }).join('')}</svg>`);

let st = 'off', endAt = 0, waiters = [], EL = null, safety = 0, AC = null, SND = null, t0 = 0, BUF = null, BUFV = null, prepping = false;
const ACx = window.AudioContext || window.webkitAudioContext;
const snd = () => lsGet('nau:introSom') !== false;   // som ligado por omissão
const done = () => { if (st !== 'playing' && st !== 'waiting') return; st = 'done'; endAt = Date.now(); clearTimeout(safety); if (EL) { EL.remove(); EL = null; }
  if (SND) SND.stop(.25); const ac = AC; AC = null; SND = null; BUF = null; BUFV = null; prepping = false; if (ac) setTimeout(() => { try { ac.close(); } catch (e) { } }, 900);
  const R = document.documentElement; R.classList.remove('intro-on'); R.classList.add('intro-after'); const w = waiters; waiters = []; setTimeout(() => R.classList.remove('intro-after'), HOLD); w.forEach(cb => setTimeout(cb, HOLD)); };
// rede de segurança: se a animação final não avisar, acaba na mesma (mas não enquanto alguém a tem pausada)
const guard = () => { if (st !== 'playing' || !EL) return; const a = EL.getAnimations ? EL.getAnimations().find(x => x.animationName === 'inOut') : null; if (a && a.playState === 'paused') { safety = setTimeout(guard, 1000); return; } done(); };
// saltar: um toque durante a intro (o primeiro meio segundo não conta, para o toque que a começou não a saltar) ou o botão "Saltar"
const out = () => { if (!EL || EL.classList.contains('in-skip')) return; if (SND) SND.stop(.3); EL.classList.add('in-skip'); setTimeout(done, 380); };
const skip = () => { if (st === 'playing' && Date.now() - t0 > 450) out(); };
const skipAll = e => { if (e) { e.preventDefault(); e.stopPropagation(); } if (st === 'playing' || st === 'waiting') out(); };
// a música já gravada (js/introsom.js) toca de uma só vez, a partir do ponto em que a imagem vai (off, em segundos)
const startAudio = off => { if (!AC || !BUFV || SND || AC.state !== 'running') return; const L = window.PrumoIntroSom ? window.PrumoIntroSom.LEN : 6.4; if (off > L - .6) return;
  try { const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = BUFV; src.connect(g); g.connect(AC.destination); const at = AC.currentTime + .04; src.start(at, Math.max(0, off));
    SND = { stop: (sec = .3) => { try { const n = AC.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(0, n + sec); src.stop(n + sec + .05); } catch (e) { } } }; } catch (e) { SND = null; } };
// começar: a imagem e o som arrancam juntos (se a música ainda não estiver pronta, entra no ponto certo quando estiver)
const begin = () => { if (st !== 'waiting' || !EL) return; st = 'playing'; t0 = Date.now(); prepping = false; EL.classList.remove('in-wait', 'in-prep');
  if (AC) { if (BUFV) startAudio(0); else if (BUF) BUF.then(b => { BUFV = b; if (st === 'playing') startAudio((Date.now() - t0) / 1000); }, () => { });
    if (AC.state !== 'running') { const f = () => { if (AC && AC.state === 'running' && st === 'playing') startAudio((Date.now() - t0) / 1000); }; try { AC.addEventListener('statechange', f, { once: true }); } catch (e) { } } }
  safety = setTimeout(guard, 7500); };
// esperar (no primeiro instante, parado, com o ponto de luz) até o áudio estar a correr e a música pronta — no máximo 1,5 s
const prep = () => { if (st !== 'waiting' || !EL || prepping) return; prepping = true; EL.classList.add('in-wait', 'in-prep'); const c0 = Date.now();
  const tick = () => { if (st !== 'waiting' || !prepping) return; const ok = !AC || (AC.state === 'running' && (BUFV || !BUF)); if (ok || Date.now() - c0 > 1500) begin(); else setTimeout(tick, 40); };
  if (BUF) BUF.then(b => { BUFV = b; }, () => { BUF = null; }); tick(); };
// no iPhone o som só pode começar com um toque: o áudio nasce (ou acorda) dentro do toque, e a intro começa
const unlock = () => { let ac = AC;
  if (!ac || ac.state !== 'running') { try { if (ac) ac.close(); } catch (e) { } try { ac = AC = new ACx(); } catch (e) { AC = null; return; } }
  try { if (ac.resume) ac.resume(); } catch (e) { }
  try { const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0); } catch (e) { } };
const tapStart = e => { if (st !== 'waiting' || prepping || (e.target && e.target.closest && e.target.closest('.in-skip-b'))) return;
  if (AC || BUF) unlock(); prep(); };
const keys = e => { if (st === 'waiting') { if (e.key === 'Escape') skipAll(e); else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapStart(e); } } else if (st === 'playing') skip(); };
const rnd = (a, b) => a + Math.random() * (b - a);

const build = P => {
  const lite = document.documentElement.classList.contains('lite');
  // ponto do impacto: o centro do prato do selo (256,256 nas coordenadas do desenho), dentro da caixa do selo (144 px)
  const k = 144 / P.vb[2], cx = ((256 - P.vb[0]) * k).toFixed(1), cy = ((256 - P.vb[1]) * k).toFixed(1);
  const sparks = Array.from({ length: lite ? 18 : 34 }, () => { const a = rnd(-Math.PI, Math.PI), d = rnd(55, 175), up = -rnd(20, 95), c = ['#F6DC97', '#FFE9B8', '#E9C77A', '#FF9A5A', '#FFF6E0'][Math.random() * 5 | 0];
    return `<i class="in-p" style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--up:${(Math.sin(a) * d * .55 + up).toFixed(0)}px;--dy:${(Math.sin(a) * d * .4 + rnd(70, 160)).toFixed(0)}px;--t:${rnd(.75, 1.25).toFixed(2)}s;--d:${(2.82 + rnd(0, .06)).toFixed(2)}s;--z:${rnd(2, 4.2).toFixed(1)}px;--c:${c}"><b></b></i>`; }).join('');
  const drops = Array.from({ length: lite ? 5 : 9 }, () => { const a = rnd(-Math.PI * .95, -Math.PI * .05), d = rnd(40, 95);
    return `<i class="in-p in-w" style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--up:${(Math.sin(a) * d * .7).toFixed(0)}px;--dy:${rnd(60, 120).toFixed(0)}px;--t:${rnd(.7, 1).toFixed(2)}s;--d:${(2.83 + rnd(0, .05)).toFixed(2)}s;--z:${rnd(3, 5.5).toFixed(1)}px;--c:#B8243A"><b></b></i>`; }).join('');
  const embers = Array.from({ length: lite ? 6 : 14 }, () => `<i class="in-e" style="--x:${rnd(-120, 120).toFixed(0)}px;--y:${rnd(-30, 40).toFixed(0)}px;--h:${rnd(-220, -120).toFixed(0)}px;--t:${rnd(1.6, 2.4).toFixed(2)}s;--d:${rnd(2.95, 3.6).toFixed(2)}s;--z:${rnd(1.6, 3).toFixed(1)}px"></i>`).join('');
  const el = document.createElement('div'); el.id = 'intro'; el.setAttribute('aria-hidden', 'true'); el.style.background = bgNow();
  el.innerHTML = `<div class="in-vig"></div><div class="in-out"><div class="in-cam"><div class="sp-in in-col">
    <div class="in-seal" style="--cx:${cx}px;--cy:${cy}px">
      <i class="in-glow"></i><i class="in-dot"></i><i class="in-tdot"></i>
      <div class="in-geo"><i class="in-cross"></i><i class="in-cross v"></i><img class="in-ring" src="${GEO}" alt=""><b class="in-deg">0°</b></div>
      <div class="in-plumb"><div class="in-swing"><i class="in-line"></i><img class="in-bob" src="${BOB}" alt=""></div></div>
      <img class="in-drop" src="${DROP}" alt="">
      <img class="in-blob" src="${P.blob}" alt="">
      <i class="in-shade"></i><img class="in-stamp" src="${STAMP}" alt="">
      <i class="in-flash"></i><i class="in-wave"></i><i class="in-wave w2"></i>
      <img class="in-selo" src="${P.selo}" alt="">
      <div class="in-glint" style="-webkit-mask-image:url(&quot;${P.selo}&quot;);mask-image:url(&quot;${P.selo}&quot;)"><i></i></div>
      <div class="in-fx">${sparks}${drops}${embers}</div>
    </div>
    <div class="in-word">${P.letters.map((s, i) => `<img src="${s}" alt="" style="--i:${i}">`).join('')}<div class="in-shine" style="-webkit-mask-image:url(&quot;${P.nome}&quot;);mask-image:url(&quot;${P.nome}&quot;)"><i></i></div></div>
    <div class="in-lema"><img class="in-rule" src="${P.rule}" alt=""><img class="in-tag" src="${P.tag}" alt=""></div>
  </div></div></div><div class="in-tapt"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>Toca para começar<small>com som</small></div><button type="button" class="in-skip-b">Saltar</button>`;
  return el; };

const I = window.PrumoIntro = {
  MODES: [['sempre', 'Sempre'], ['dia', 'Uma vez por dia'], ['nunca', 'Nunca']],
  mode, setMode: v => lsSet('nau:intro', v), state: () => st,
  // o que vem depois (o ecrã do código, a app) espera pelo fim da intro e por um instante do ecrã de carregamento
  wait: cb => { if (st === 'playing' || st === 'waiting') { waiters.push(cb); return; } const left = endAt ? endAt + HOLD - Date.now() : 0; if (left > 0) setTimeout(cb, left); else cb(); },
  sound: snd, setSound: on => lsSet('nau:introSom', !!on), audio: () => (AC ? AC.state : null),
  // gesture: chamada a partir de um toque (Definições › Ver a intro agora): o som pode começar já
  play: (o = {}) => { if (st === 'playing' || st === 'waiting') return false; const P = getParts(); if (!P) return false;
    EL = build(P); st = 'waiting'; document.documentElement.classList.add('intro-on'); document.body.appendChild(EL);
    EL.addEventListener('animationend', e => { if (e.target === EL && e.animationName === 'inOut') done(); });
    EL.addEventListener('pointerdown', skip); EL.addEventListener('pointerup', tapStart); EL.addEventListener('click', tapStart);
    EL.querySelector('.in-skip-b').addEventListener('click', skipAll); document.addEventListener('keydown', keys);
    const want = o.sound == null ? snd() : o.sound;
    if (want && ACx && window.PrumoIntroSom) { try { AC = new ACx(); if (o.gesture) unlock(); } catch (e) { AC = null; }
      // a música grava-se já (enquanto se vê "Toca para começar"), num só som
      if (AC) { try { BUF = window.PrumoIntroSom.render(AC.sampleRate || 48000); BUF.then(b => { BUFV = b; }, () => { BUF = null; }); } catch (e) { BUF = null; } } }
    // sem som: começa logo. Com o áudio livre (Android com o app instalado, computador) ou vindo de um toque: prepara e começa.
    // Senão (iPhone): espera pelo toque. O áudio novo nasce "suspenso" e só passa a ativo um instante depois quando é permitido.
    if (!AC) { begin(); return true; }
    if ((AC.state === 'running' || o.gesture) && !window.__introTap) { prep(); return true; }
    EL.classList.add('in-wait'); if (window.__introTap) return true;
    const c0 = Date.now(); let pr = null; try { pr = AC.resume(); } catch (e) { }
    if (pr && pr.then) pr.then(() => { if (st === 'waiting' && !prepping && Date.now() - c0 < 400) prep(); }, () => { });
    return true; },
  skip };

// ao abrir: uma vez por sessão (as recargas da mesma sessão não repetem), conforme a escolha
const auto = () => { if (window.__noIntro || calm() || ssGet('nau:introOk')) return false; const m = mode(); if (m === 'nunca' || (m === 'dia' && lsGet('nau:introDia') === day())) return false; return true; };
try { getParts(); } catch (e) { }
if (auto()) { ssSet('nau:introOk', '1'); lsSet('nau:introDia', day()); I.play(); }
})();
