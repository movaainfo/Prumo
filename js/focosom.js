/* PRUMO — som no Bloco de foco (v3.71). Para todas as contas:
   · sons para concentrar feitos no próprio aparelho (chuva, mar, lareira, ruído castanho): não precisam de internet nem de conta nenhuma;
   · o tocador do Spotify com playlists de concentração (ou um link teu): toca as músicas inteiras se tiveres sessão no Spotify neste
     navegador; sem sessão, excertos de 30 s (regra do Spotify);
   · atalhos para abrir a música na tua app (Spotify, Apple Music, YouTube Music, Deezer) antes de começar.
   O som começa sozinho ao carregar em Começar e pára quando o bloco acaba. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc, K = 'os2fsom';
const SONS = [['', 'Sem som'], ['chuva', 'Chuva'], ['mar', 'Mar'], ['lareira', 'Lareira'], ['castanho', 'Ruído castanho'], ['spotify', 'Spotify']];
// playlists confirmadas no Spotify (as duas primeiras são do próprio Spotify)
const PL = [['37i9dQZF1DWZIOAPKUdaKS', 'Focus Piano', 'piano calmo'], ['37i9dQZF1DX8wWHvPMMfNA', 'Focus Jazz', 'jazz instrumental'], ['5RcZbEycm4Yb2K5gHjxZGn', 'Deep Focus Lo-fi Beats', 'lo-fi']];
const APPS = [['Spotify', q => 'https://open.spotify.com/search/' + encodeURIComponent(q)], ['Apple Music', q => 'https://music.apple.com/search?term=' + encodeURIComponent(q)], ['YouTube Music', q => 'https://music.youtube.com/search?q=' + encodeURIComponent(q)], ['Deezer', q => 'https://www.deezer.com/search/' + encodeURIComponent(q)]];
const cfg = () => Object.assign({ s: '', pl: PL[0][0], meu: '', vol: .6 }, U.ls.get(K, {}) || {});
const set = o => { U.ls.set(K, Object.assign(cfg(), o)); };
const nomeSom = k => (SONS.find(x => x[0] === k) || SONS[0])[1];
// link do Spotify (open.spotify.com/... ou spotify:...) → tipo e id
const spId = s => { const m = String(s || '').match(/(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?|spotify:)(playlist|album|track|artist|show|episode)[/:]([A-Za-z0-9]{10,40})/); return m ? { t: m[1], id: m[2] } : null; };

/* ---------- sons feitos no aparelho (Web Audio) ---------- */
let AC = null, M = null, FONTES = [], TOCA = '';
const ctx = () => { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === 'suspended') AC.resume().catch(() => { }); return AC; };
// ruído em laço de 8 s, com as pontas cruzadas (sem estalido na volta)
const BUF = {};
const ruido = (ac, tipo) => { if (BUF[tipo]) return BUF[tipo]; const sr = ac.sampleRate, n = sr * 8, F = Math.round(sr * .25), b = ac.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const g = new Float32Array(n + F); let l = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n + F; i++) { const w = Math.random() * 2 - 1;
      if (tipo === 'castanho') { l = (l + .02 * w) / 1.02; g[i] = l * 3.5; }
      else if (tipo === 'estalos') { g[i] = Math.random() < 6 / sr ? (Math.random() * .9 + .1) * (Math.random() < .5 ? -1 : 1) : g[i - 1] * .86 || 0; }
      else { b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; g[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; } }
    const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = i < F ? g[i] * (i / F) + g[n + i] * (1 - i / F) : g[i]; }
  return (BUF[tipo] = b); };
const fonte = (ac, tipo) => { const s = ac.createBufferSource(); s.buffer = ruido(ac, tipo); s.loop = true; FONTES.push(s); return s; };
const filtro = (ac, t, f, q) => { const x = ac.createBiquadFilter(); x.type = t; x.frequency.value = f; if (q) x.Q.value = q; return x; };
const lfo = (ac, hz, amp, alvo, base) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = hz; g.gain.value = amp; o.connect(g); g.connect(alvo); if (base != null) alvo.value = base; FONTES.push(o); return o; };
const montar = (ac, tipo, out) => {
  if (tipo === 'chuva') { const s = fonte(ac, 'rosa'), hp = filtro(ac, 'highpass', 450), lp = filtro(ac, 'lowpass', 5200), g = ac.createGain(); g.gain.value = .9; s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); lfo(ac, .11, 1400, lp.frequency, 5200);
    const e = fonte(ac, 'estalos'), eh = filtro(ac, 'bandpass', 3200, .8), eg = ac.createGain(); eg.gain.value = .35; e.playbackRate.value = 1.7; e.connect(eh); eh.connect(eg); eg.connect(out); }
  else if (tipo === 'mar') { const s = fonte(ac, 'castanho'), lp = filtro(ac, 'lowpass', 750), g = ac.createGain(); s.connect(lp); lp.connect(g); g.connect(out); lfo(ac, .085, .45, g.gain, .55);
    const f = fonte(ac, 'rosa'), hp = filtro(ac, 'highpass', 1600), fg = ac.createGain(); f.connect(hp); hp.connect(fg); fg.connect(out); lfo(ac, .085, .12, fg.gain, .12); }
  else if (tipo === 'lareira') { const s = fonte(ac, 'castanho'), lp = filtro(ac, 'lowpass', 380), g = ac.createGain(); g.gain.value = .8; s.connect(lp); lp.connect(g); g.connect(out);
    const e = fonte(ac, 'estalos'), hp = filtro(ac, 'highpass', 1400), eg = ac.createGain(); eg.gain.value = .9; e.connect(hp); hp.connect(eg); eg.connect(out); }
  else { const s = fonte(ac, 'castanho'), lp = filtro(ac, 'lowpass', 1100), g = ac.createGain(); g.gain.value = .9; s.connect(lp); lp.connect(g); g.connect(out); } };
const parar = (suave = true) => { if (!AC || !M) { TOCA = ''; return; } const m = M, F = FONTES; M = null; FONTES = []; TOCA = '';
  try { m.gain.cancelScheduledValues(AC.currentTime); m.gain.setTargetAtTime(0, AC.currentTime, suave ? .25 : .01); } catch (e) { }
  setTimeout(() => { F.forEach(x => { try { x.stop(); } catch (e) { } }); try { m.disconnect(); } catch (e) { } }, suave ? 1200 : 60); };
const tocar = tipo => { tipo = tipo || cfg().s; if (!tipo || tipo === 'spotify') return false; const ac = ctx(); if (!ac) return false; if (TOCA === tipo && M) return true; parar(false);
  M = ac.createGain(); M.gain.value = 0; M.connect(ac.destination); montar(ac, tipo, M); FONTES.forEach(x => { try { x.start(); } catch (e) { } });
  M.gain.setTargetAtTime(Math.max(0, Math.min(1, cfg().vol)) * .5, ac.currentTime, .6); TOCA = tipo; return true; };

/* ---------- Spotify (tocador fixo por cima do ecrã do bloco: não recomeça quando o ecrã muda) ---------- */
let SP = null;
const spSrc = () => { const c = cfg(), m = spId(c.meu); return m ? `https://open.spotify.com/embed/${m.t}/${m.id}?utm_source=prumo&theme=0` : `https://open.spotify.com/embed/playlist/${c.pl}?utm_source=prumo&theme=0`; };
const spMostra = on => { if (!on) { if (SP) { SP.remove(); SP = null; } return; }
  const src = spSrc(); if (SP && SP.dataset.src === src) return; if (!SP) { SP = document.createElement('div'); SP.id = 'fsSp'; document.body.appendChild(SP); }
  SP.dataset.src = src; const f = document.createElement('iframe'); f.src = src; f.title = 'Tocador do Spotify'; f.loading = 'lazy'; f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'; f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  SP.replaceChildren(f); };
// chamado pelo Bloco de foco sempre que o ecrã muda: ativo = há um bloco a decorrer (não terminado)
const sync = ativo => { const c = cfg(); spMostra(ativo && c.s === 'spotify'); if (!ativo) parar(); };

/* ---------- escolha (página do Bloco de foco) e barra (ecrã do bloco) ---------- */
const escolha = () => { const c = cfg(), q = 'música para concentrar';
  return `<div class="pn fs-pn"><div class="pn-h"><h3>3 · Som durante o bloco</h3><span class="mut">${esc(nomeSom(c.s))}</span></div>
    <div class="fs-sons" role="radiogroup" aria-label="Som durante o bloco">${SONS.map(([k, n]) => `<button type="button" role="radio" aria-checked="${c.s === k}" class="chip ${c.s === k ? 'on' : ''}" data-act="fsSom" data-s="${k}">${n}</button>`).join('')}</div>
    ${c.s && c.s !== 'spotify' ? `<div class="fs-amb"><button type="button" class="btn sm" data-act="fsOuvir">${TOCA ? UI.ic('pause') + 'Parar' : UI.ic('play') + 'Ouvir'}</button><label class="fs-vol">Volume <input type="range" min="0" max="1" step="0.05" value="${c.vol}" data-fsvol aria-label="Volume do som"></label></div>
      <small class="mut">Feito no teu aparelho: funciona sem internet e sem conta nenhuma. Começa sozinho ao carregar em Começar.</small>` : ''}
    ${c.s === 'spotify' ? `<div class="fs-pl">${PL.map(([id, n, d]) => `<button type="button" class="fs-pli ${!spId(c.meu) && c.pl === id ? 'on' : ''}" data-act="fsPl" data-id="${id}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>
      <form class="fs-meu" data-form="fsMeu"><input class="field" name="u" value="${esc(c.meu)}" placeholder="Ou cola o link de uma playlist ou álbum teu do Spotify" aria-label="Link do Spotify"><button class="btn sm">Usar</button></form>
      <small class="mut">O tocador aparece no ecrã do bloco. Com sessão iniciada no Spotify neste navegador tocam as músicas inteiras; sem sessão, excertos de 30 segundos.</small>` : ''}
    <div class="fs-apps"><small class="mut">Preferes a tua app? Abre a música antes de começar (abrir outra app durante o bloco conta como saída):</small><div>${APPS.map(([n, f]) => `<a class="btn xs ghost" href="${f(q)}" target="_blank" rel="noopener noreferrer">${n}</a>`).join('')}</div></div></div>`; };
const barra = () => { const c = cfg(); if (!c.s) return '';
  if (c.s === 'spotify') return `<div class="fs-bar"><span>${UI.ic('play')}Spotify</span><small>o tocador está em baixo</small></div>`;
  return `<div class="fs-bar"><span>${esc(nomeSom(c.s))}</span><button type="button" class="btn sm ghost" data-act="fsToggle" aria-pressed="${!!TOCA}">${TOCA ? UI.ic('pause') + 'Pausar som' : UI.ic('play') + 'Tocar som'}</button></div>`; };
A.fsSom = b => { const s = b.dataset.s; set({ s }); if (TOCA && s !== TOCA) parar(); OS.request(); };
A.fsOuvir = () => { if (TOCA) parar(); else tocar(); OS.request(); };
A.fsToggle = () => { if (TOCA) parar(); else tocar(); const bt = document.querySelector('[data-act=fsToggle]'); if (bt) { bt.setAttribute('aria-pressed', String(!!TOCA)); bt.innerHTML = TOCA ? UI.ic('pause') + 'Pausar som' : UI.ic('play') + 'Tocar som'; } };
A.fsPl = b => { set({ pl: b.dataset.id, meu: '' }); OS.request(); };
OS.forms = OS.forms || {}; OS.forms.fsMeu = (f) => { const u = String(new FormData(f).get('u') || '').trim(); if (u && !spId(u)) { UI.toast('Esse link não é de uma playlist, álbum ou música do Spotify.', 'neg'); return; } set({ meu: u }); UI.toast(u ? 'A tua música fica no bloco.' : 'Voltaste às playlists do Prumo.', 'pos'); OS.request(); };
document.addEventListener('input', e => { if (e.target && e.target.matches && e.target.matches('[data-fsvol]')) { const v = +e.target.value; set({ vol: v }); if (M && AC) M.gain.setTargetAtTime(v * .5, AC.currentTime, .1); } });
// começa com o toque em "Começar" (o iPhone só deixa tocar som depois de um toque) e pára ao fechar
OS.on('ready', () => { const g = A.fbGo; if (g && !g.__fs) { A.fbGo = function () { const r = g.apply(this, arguments); if (document.documentElement.classList.contains('fb-on')) { tocar(); sync(true); } return r; }; A.fbGo.__fs = 1; }
  const cl = A.fbClose; if (cl && !cl.__fs) { A.fbClose = function () { sync(false); return cl.apply(this, arguments); }; A.fbClose.__fs = 1; } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && AC && AC.state === 'suspended' && TOCA) AC.resume().catch(() => { }); });
OS.FocoSom = { escolha, barra, sync, tocar, parar, estado: () => ({ toca: TOCA, cfg: cfg(), sp: !!SP }), spId };
})();
