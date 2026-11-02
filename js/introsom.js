/* PRUMO — o som da intro (js/intro.js). Tudo sintetizado aqui com Web Audio: sem ficheiros, ~0 KB de som.
   Segue a linha do tempo de css/intro.css (segundos a partir do início):
   0     um zumbido grave e vento ao fundo (o escuro) e um brilho de cristal (o ponto de luz)
   0,15  o prumo cai: um sopro que desce e o fio que estica (um "ting" de metal)
   0,75… o pêndulo: tiques de madeira cada vez mais fracos até parar; o círculo de medida: um véu agudo
   1,95  0°: um sino de cristal · 2,05 o prumo sobe (sopro ao contrário) · 2,42 a gota cai na cera (um "plop")
   2,5   o carimbo desce: tensão que sobe · 2,82 IMPACTO: estrondo grave, metal de latão, estalidos das faíscas
   2,86  o selo: um acorde menor que cresce · 3,15 o brilho · 3,25 "Prumo": um arpejo, uma nota por letra
   3,78  o traço dourado · 4,2 o brilho no nome · 4,4 a luz quente: o acorde abre para maior (o remate) · 5,05–5,85 desaparece
   PrumoIntroSom.play(ctx, t0) agenda tudo num AudioContext (ou OfflineAudioContext, para gravar) e devolve { stop(seg) }. */
(() => {
'use strict';
const NB = {};
const noiseBuf = ctx => { const r = ctx.sampleRate; if (NB[r]) return NB[r]; const n = r * 2, b = ctx.createBuffer(1, n, r), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return (NB[r] = b); };
// sala: ruído que decai e escurece (uma reverberação de igreja pequena)
const room = (ctx, sec = 2.8, k = 3) => { const r = ctx.sampleRate, n = Math.floor(r * sec), b = ctx.createBuffer(2, n, r);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n, w = Math.random() * 2 - 1; lp += (w - lp) * (.5 - .42 * t); d[i] = lp * Math.pow(1 - t, k) * (i < r * .012 ? i / (r * .012) : 1); } }
  return b; };

const play = (ctx, t0, opt = {}) => {
  const VOL = opt.vol == null ? .85 : opt.vol, T = x => t0 + x, Z = .0001;
  const out = ctx.createGain(); out.gain.setValueAtTime(VOL, t0);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .35;
  out.connect(comp); comp.connect(ctx.destination);
  const rev = ctx.createConvolver(); rev.buffer = room(ctx); const wet = ctx.createGain(); wet.gain.value = .8; rev.connect(wet); wet.connect(out);
  const bus = (send = .25, pan = 0) => { const g = ctx.createGain(); let n = g; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); n = p; } n.connect(out); if (send) { const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(rev); } return g; };
  // envelope: sobe em a, fica h, desce em d (exponencial, sem estalidos)
  const env = (p, t, a, pk, d, h = 0) => { p.setValueAtTime(Z, t); p.exponentialRampToValueAtTime(pk, t + a); if (h) p.setValueAtTime(pk, t + a + h); p.exponentialRampToValueAtTime(Z, t + a + h + d); return t + a + h + d; };
  const filt = (type, f, t, o) => { const q = ctx.createBiquadFilter(); q.type = type; q.frequency.setValueAtTime(f, t); if (o.f2) q.frequency.exponentialRampToValueAtTime(o.f2, t + (o.ft || .3)); q.Q.value = o.q || .7; return q; };
  const tone = (type, f, t, o = {}) => { const s = ctx.createOscillator(); s.type = type; s.frequency.setValueAtTime(f, t); if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + (o.tt || .2)); if (o.det) s.detune.setValueAtTime(o.det, t);
    const g = ctx.createGain(), end = env(g.gain, t, o.a || .004, o.g || .1, o.d || .4, o.h || 0); let n = s;
    if (o.lp) { const q = filt('lowpass', o.lp, t, { f2: o.lp2, ft: o.lpt, q: o.q }); s.connect(q); n = q; } n.connect(g); g.connect(o.bus || bus(o.send == null ? .25 : o.send, o.pan || 0)); s.start(t); s.stop(end + .05); };
  const hiss = (t, o = {}) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); s.loop = true; const q = filt(o.type || 'bandpass', o.f || 1000, t, o), g = ctx.createGain(), end = env(g.gain, t, o.a || .004, o.g || .1, o.d || .3, o.h || 0);
    s.connect(q); q.connect(g); g.connect(o.bus || bus(o.send == null ? .25 : o.send, o.pan || 0)); s.start(t, Math.random() * 1.5); s.stop(end + .05); };
  const R = (a, b) => a + Math.random() * (b - a);

  // ---- o escuro: zumbido grave (lá e mi) e vento; baixa no impacto e volta; sai no fim ----
  const dr = bus(.18), dg = dr.gain; dg.setValueAtTime(Z, T(0)); dg.linearRampToValueAtTime(.16, T(1.3)); dg.setValueAtTime(.16, T(2.78)); dg.linearRampToValueAtTime(.05, T(2.95)); dg.linearRampToValueAtTime(.13, T(3.8)); dg.setValueAtTime(.13, T(5)); dg.linearRampToValueAtTime(Z, T(5.85));
  { const s = ctx.createOscillator(), q = ctx.createBiquadFilter(), gg = ctx.createGain(); s.type = 'sawtooth'; s.frequency.value = 110; q.type = 'lowpass'; q.frequency.value = 380; gg.gain.value = .06; s.connect(q); q.connect(gg); gg.connect(dr); s.start(T(0)); s.stop(T(5.9)); }
  [[55, .55, 0], [82.41, .32, 4], [110, .12, -5]].forEach(([f, g, det]) => { const s = ctx.createOscillator(), gg = ctx.createGain(); s.type = 'sine'; s.frequency.value = f; s.detune.value = det; gg.gain.value = g; s.connect(gg); gg.connect(dr); s.start(T(0)); s.stop(T(5.9)); });
  { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); s.loop = true; const q = ctx.createBiquadFilter(); q.type = 'lowpass'; q.frequency.setValueAtTime(260, T(0)); q.frequency.linearRampToValueAtTime(520, T(2.7)); q.frequency.linearRampToValueAtTime(320, T(5.8)); q.Q.value = 1.2;
    const gg = ctx.createGain(); gg.gain.value = .55; s.connect(q); q.connect(gg); gg.connect(dr); s.start(T(0)); s.stop(T(5.9)); }
  // o ponto de luz: um cristal
  [[1760, .035], [2637, .02], [3520, .01]].forEach(([f, g]) => tone('sine', f, T(.12), { a: .02, g, d: 1.6, send: .7 }));

  // ---- o prumo cai e o fio estica ----
  hiss(T(.15), { f: 2400, f2: 380, ft: .7, q: 1.4, a: .25, g: .16, d: .5, send: .3 });
  [[1318.5, .05], [1975.5 * 1.012, .03], [3135, .018], [4186 * .993, .01]].forEach(([f, g]) => tone('sine', f, T(.86), { a: .003, g, d: .9, send: .5 }));
  tone('triangle', 196, T(.86), { a: .003, g: .05, d: .35, to: 180, tt: .3, send: .3 });
  // o pêndulo: tiques de madeira (nos extremos da oscilação), cada vez mais fracos
  [.75, 1.06, 1.33, 1.58, 1.81].forEach((t, i) => { const g = .16 * Math.pow(.66, i); hiss(T(t), { f: 2600, q: 7, a: .002, g, d: .045, send: .35, pan: i % 2 ? .25 : -.25 }); tone('sine', 880 - i * 30, T(t), { a: .002, g: g * .35, d: .06, send: .3 }); });
  // o círculo de medida: um véu agudo que treme
  [[880, .012], [1318.5, .01], [1760, .008], [2217.5, .006]].forEach(([f, g], i) => tone('sine', f, T(.95 + i * .08), { a: .7, g, h: .6, d: 1, send: .6, det: i * 3 }));
  // 0°: o sino
  [[2093, .06], [3136, .03], [4186, .015], [5274, .008]].forEach(([f, g]) => tone('sine', f, T(1.95), { a: .003, g, d: 1.8, send: .75 }));

  // ---- o prumo sobe, a gota cai na cera ----
  hiss(T(2.05), { f: 420, f2: 2600, ft: .35, q: 1.3, a: .12, g: .1, d: .25, send: .3 });
  hiss(T(2.12), { type: 'highpass', f: 5000, f2: 1600, ft: .3, q: .8, a: .2, g: .035, d: .1, send: .2 });
  tone('sine', 240, T(2.42), { a: .003, g: .32, d: .22, to: 70, tt: .14, send: .25 });
  tone('sine', 900, T(2.42), { a: .002, g: .05, d: .07, to: 260, tt: .05, send: .3 });
  hiss(T(2.42), { f: 650, q: 1.5, a: .002, g: .12, d: .09, send: .2 });

  // ---- o carimbo desce: tensão a subir, corta no impacto ----
  hiss(T(2.5), { f: 300, f2: 3800, ft: .32, q: 2, a: .3, g: .2, d: .02, send: .2 });
  tone('sawtooth', 110, T(2.5), { a: .3, g: .05, d: .02, to: 230, tt: .32, lp: 900, lp2: 2400, lpt: .32, send: .15 });

  // ---- IMPACTO ----
  const I = T(2.82);
  tone('sine', 62, I, { a: .003, g: .75, d: 1.7, to: 31, tt: .7, send: .15 });             // o estrondo grave
  { // o mesmo estrondo saturado e sem o sub: harmónicos que se ouvem no altifalante do telemóvel
    const s = ctx.createOscillator(), g = ctx.createGain(), ws = ctx.createWaveShaper(), hp = ctx.createBiquadFilter(), c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * 6) / Math.tanh(6); } ws.curve = c; hp.type = 'highpass'; hp.frequency.value = 140; hp.Q.value = .7;
    s.type = 'sine'; s.frequency.setValueAtTime(62, I); s.frequency.exponentialRampToValueAtTime(31, I + .7); const end = env(g.gain, I, .003, .5, .9);
    const o2 = ctx.createGain(); o2.gain.value = .3; s.connect(g); g.connect(ws); ws.connect(hp); hp.connect(o2); o2.connect(bus(.2)); s.start(I); s.stop(end + .05); }
  tone('triangle', 130, I, { a: .002, g: .38, d: .45, to: 52, tt: .22, send: .2 });          // o corpo
  hiss(I, { type: 'lowpass', f: 5200, f2: 900, ft: .12, q: .6, a: .001, g: .55, d: .12, send: .5 }); // o golpe
  [1, 2.76, 5.4, 8.93, 13.3].forEach((m, i) => tone('sine', 196 * m, I + .004, { a: .002, g: .09 / (1 + i * .5), d: 1.9 - i * .25, send: .65, det: R(-6, 6) })); // o latão
  for (let i = 0; i < 26; i++) { const t = I + .03 + Math.pow(Math.random(), 1.7) * .95; hiss(t, { type: 'highpass', f: R(3200, 7500), q: .9, a: .001, g: .11 * (1 - (t - I) / 1.1) + .015, d: R(.01, .03), send: .45, pan: R(-.75, .75) }); } // as faíscas

  // ---- o selo: acorde de lá menor (com 9.ª) que cresce; no remate abre para lá maior ----
  const pad = (fs, t, a, h, d, g, lp1, lp2) => fs.forEach((f, i) => [-7, 7].forEach(det => tone('sawtooth', f, t, { a, h, d, g, det: det + R(-2, 2), lp: lp1, lp2, lpt: a + h * .6, q: .5, send: .55, pan: (i - 2) * .18 })));
  pad([110, 164.81, 261.63, 329.63, 493.88], T(2.86), .9, .65, .5, .018, 420, 1700);
  pad([110, 164.81, 277.18, 329.63, 440, 554.37], T(4.32), .45, .55, 1.05, .017, 600, 2600);
  tone('sine', 55, T(4.38), { a: .25, g: .15, h: .35, d: 1, send: .1 });
  // os brilhos: no selo e no nome
  const shine = (t, g) => { [2637, 3520, 4434.9, 5274].forEach((f, i) => tone('sine', f, t + i * .06, { a: .01, g: g / (1 + i * .3), d: .9, send: .8, pan: -.4 + i * .27 })); hiss(t, { f: 6000, f2: 9500, ft: .5, q: 2.5, a: .15, g: g * .9, d: .35, send: .5 }); };
  shine(T(3.15), .03); shine(T(4.2), .025);
  // "Prumo": uma nota por letra (lá maior a subir), no instante em que cada uma aparece
  [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => { const t = T(3.29 + i * .075); tone('triangle', f, t, { a: .004, g: .075, d: .6, send: .5, pan: -.45 + i * .22 }); tone('sine', f * 2, t, { a: .003, g: .022, d: .32, send: .5, pan: -.45 + i * .22 }); });
  // o traço dourado e o lema
  hiss(T(3.78), { f: 3000, f2: 8000, ft: .35, q: 2, a: .08, g: .045, d: .3, send: .5 });
  [[659.25, .03], [1318.5, .015]].forEach(([f, g]) => tone('sine', f, T(3.97), { a: .02, g, d: 1.1, send: .6 }));

  // ---- o fim: tudo sai com a imagem ----
  out.gain.setValueAtTime(VOL, T(5.05)); out.gain.linearRampToValueAtTime(Z, T(5.9));
  return { stop: (sec = .3) => { try { const n = ctx.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(Math.max(out.gain.value, Z), n); out.gain.linearRampToValueAtTime(Z, n + sec); } catch (e) { } } };
};
window.PrumoIntroSom = { play, LEN: 6.2 };
})();
