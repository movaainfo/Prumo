/* PRUMO — a música da intro (js/intro.js). Sintetizada aqui com Web Audio (sem ficheiros) e gravada de antemão num só
   som (PrumoIntroSom.render → AudioBuffer), que depois toca de uma vez: no iPhone, centenas de sons ao vivo engasgavam.
   Feita para se ouvir no altifalante do telemóvel: as notas vivem entre 200 Hz e 5 kHz (o grave fundo só reforça nos auscultadores).
   Música do princípio ao fim, a tempo da imagem (segundos):
   0     lá menor: cordas que crescem, um baixo, uma caixa de música em arpejo e um coração que bate cada vez mais depressa
   0,15  o prumo cai (sopro) · 0,86 o fio estica (metal) · 0,75… os tiques do pêndulo · 1,95 o sino do 0°
   2,0   a tensão sobe (ruído, uma nota a subir e um prato ao contrário) · 2,42 a gota de cera
   2,82  IMPACTO: tambor grande, latão, faíscas e um acorde de metais
   2,95  ré maior (o selo, o brilho) · 3,29 "Prumo": uma nota por letra · 3,8 e 4,38 tímpanos
   4,38  lá maior: o remate (com prato e brilho) · 5,1–5,9 desaparece com a sala
   PrumoIntroSom.play(ctx, t0) agenda tudo num AudioContext ou OfflineAudioContext e devolve { stop(seg) }. */
(() => {
'use strict';
const LEN = 6.4;
const NB = {};
const noiseBuf = ctx => { const r = ctx.sampleRate; if (NB[r]) return NB[r]; const n = r * 2, b = ctx.createBuffer(1, n, r), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return (NB[r] = b); };
// sala: ruído que decai e escurece
const room = (ctx, sec = 2.6, k = 3) => { const r = ctx.sampleRate, n = Math.floor(r * sec), b = ctx.createBuffer(2, n, r);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n, w = Math.random() * 2 - 1; lp += (w - lp) * (.55 - .45 * t); d[i] = lp * Math.pow(1 - t, k) * (i < r * .01 ? i / (r * .01) : 1); } }
  return b; };
const satCurve = k => { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; };

const play = (ctx, t0, opt = {}) => {
  const VOL = opt.vol == null ? .9 : opt.vol, T = x => t0 + x, Z = .0001, R = (a, b) => a + Math.random() * (b - a);
  // saída para o altifalante do telemóvel: tira o sub-grave (não se ouve e come a margem), realça a presença, comprime e limita
  const out = ctx.createGain(); out.gain.setValueAtTime(VOL, t0);
  const eq = [['highpass', 95, .7, 0], ['lowshelf', 220, 0, -4], ['peaking', 2500, .8, 3]].map(([type, f, q, g]) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; if (g) b.gain.value = g; return b; });
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 2.5; comp.attack.value = .004; comp.release.value = .2;
  const mk = ctx.createGain(); mk.gain.value = 1.7;
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0; lim.release.value = .08;
  out.connect(eq[0]); eq[0].connect(eq[1]); eq[1].connect(eq[2]); eq[2].connect(comp); comp.connect(mk); mk.connect(lim); lim.connect(ctx.destination);
  // a música de fundo passa por "bed" (mais baixa); os golpes (impacto, remate) vão direto, para se destacarem
  const bed = ctx.createGain(); bed.gain.value = .6; bed.connect(out); let DST = bed;
  const rev = ctx.createConvolver(); rev.buffer = room(ctx); const wet = ctx.createGain(); wet.gain.value = .7; rev.connect(wet); wet.connect(out);
  const SAT = satCurve(4);
  const bus = (send = .25, pan = 0) => { const g = ctx.createGain(); let n = g; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); n = p; } n.connect(DST); if (send) { const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(rev); } return g; };
  const env = (p, t, a, pk, d, h = 0) => { p.setValueAtTime(Z, t); p.exponentialRampToValueAtTime(pk, t + a); if (h) p.setValueAtTime(pk, t + a + h); p.exponentialRampToValueAtTime(Z, t + a + h + d); return t + a + h + d; };
  const filt = (type, f, t, o) => { const q = ctx.createBiquadFilter(); q.type = type; q.frequency.setValueAtTime(f, t); if (o.f2) q.frequency.exponentialRampToValueAtTime(o.f2, t + (o.ft || .3)); q.Q.value = o.q || .7; return q; };
  const tone = (type, f, t, o = {}) => { const s = ctx.createOscillator(); s.type = type; s.frequency.setValueAtTime(f, t); if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + (o.tt || .2)); if (o.det) s.detune.setValueAtTime(o.det, t);
    const g = ctx.createGain(), end = env(g.gain, t, o.a || .004, o.g || .1, o.d || .4, o.h || 0); let n = s;
    if (o.lp) { const q = filt('lowpass', o.lp, t, { f2: o.lp2, ft: o.lpt, q: o.q }); s.connect(q); n = q; }
    if (o.sat) { const ws = ctx.createWaveShaper(); ws.curve = SAT; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = o.hp || 90; n.connect(ws); ws.connect(hp); n = hp; }
    n.connect(g); g.connect(o.bus || bus(o.send == null ? .25 : o.send, o.pan || 0)); s.start(t); s.stop(end + .05); };
  const hiss = (t, o = {}) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); s.loop = true; const q = filt(o.type || 'bandpass', o.f || 1000, t, o), g = ctx.createGain(), end = env(g.gain, t, o.a || .004, o.g || .1, o.d || .3, o.h || 0);
    s.connect(q); q.connect(g); g.connect(o.bus || bus(o.send == null ? .25 : o.send, o.pan || 0)); s.start(t, Math.random() * 1.5); s.stop(end + .05); };
  // cordas: pares de dentes de serra desafinados, filtro a abrir
  const strings = (fs, t, a, h, d, g, lp1, lp2, send = .45) => fs.forEach((f, i) => [-9, 9].forEach(det => tone('sawtooth', f, t, { a, h, d, g, det: det + R(-3, 3), lp: lp1, lp2, lpt: a + h * .7, q: .6, send, pan: (i - (fs.length - 1) / 2) * .16 })));
  // tambor: uma nota que cai, saturada (ouve-se no telemóvel) e um toque de pele
  const drum = (t, f0, f1, g, d, o = {}) => { tone('sine', f0, t, { a: .002, g, d, to: f1, tt: d * .45, sat: 1, hp: o.hp || 110, send: o.send == null ? .3 : o.send }); hiss(t, { f: o.skin || 1600, q: 1.2, a: .001, g: g * .35, d: .05, send: .2 }); if (o.sub) tone('sine', f0 * .5, t, { a: .002, g: o.sub, d: d * 1.3, to: f1 * .5, tt: d * .5, send: .1 }); };
  const pluck = (f, t, g, pan = 0, d = .5) => { tone('triangle', f, t, { a: .003, g, d, send: .45, pan }); tone('sine', f * 2, t, { a: .002, g: g * .35, d: d * .5, send: .45, pan }); };
  const bell = (f, t, g, d = 1.6) => [[1, 1], [2.4, .45], [3.98, .25], [5.4, .12]].forEach(([m, k]) => tone('sine', f * m, t, { a: .003, g: g * k, d: d / (1 + m * .15), send: .7 }));

  // ===== 1) o escuro e a tensão (lá menor) =====
  strings([220, 261.63, 329.63, 440, 523.25], T(.05), .45, 2.1, .1, .03, 1100, 2600);     // cordas que crescem (cortam pouco antes do impacto)
  drum(T(.08), 140, 60, .32, .5, { skin: 1200 }); bell(880, T(.08), .06, 2);                 // o primeiro instante: um golpe suave e a luz
  tone('sawtooth', 110, T(.05), { a: .6, h: 1.85, d: .1, g: .03, lp: 700, lp2: 1400, lpt: 2.5, send: .2 });   // o baixo (pelos harmónicos)
  // caixa de música: arpejo de lá menor que vai ficando mais presente
  const ARP = [880, 1046.5, 1318.5, 1760, 1318.5, 1046.5];
  for (let i = 0, t = .3; t < 2.62; i++, t += .2) pluck(ARP[i % 6], T(t), .03 + .035 * (t / 2.62), i % 2 ? .3 : -.3, .4);
  // o coração: cada vez mais depressa até ao impacto
  [.2, .75, 1.25, 1.68, 2.03, 2.32, 2.52, 2.65].forEach((t, i) => drum(T(t), 125, 62, .3 + i * .035, .32, { sub: .04, skin: 1300 }));
  // o prumo cai e o fio estica
  hiss(T(.15), { f: 3200, f2: 600, ft: .7, q: 1.3, a: .22, g: .13, d: .45, send: .3 });
  [[1318.5, .06], [1975.5 * 1.012, .035], [3135, .02]].forEach(([f, g]) => tone('sine', f, T(.86), { a: .003, g, d: .9, send: .5 }));
  // os tiques do pêndulo (madeira + nota), cada vez mais fracos
  [.75, 1.06, 1.33, 1.58, 1.81].forEach((t, i) => { const g = .2 * Math.pow(.75, i); hiss(T(t), { f: 2600, q: 6, a: .002, g, d: .05, send: .35, pan: i % 2 ? .3 : -.3 }); tone('triangle', 1567.98, T(t), { a: .002, g: g * .3, d: .08, send: .3 }); });
  // 0°: o sino
  bell(1046.5, T(1.95), .07, 2);
  // a tensão sobe: ruído a abrir, uma nota a subir, um prato ao contrário
  // (tudo corta em 2,74: um instante de silêncio e só então o golpe, como nos trailers)
  hiss(T(2.0), { f: 500, f2: 5200, ft: .74, q: 1.4, a: .72, g: .16, d: .02, send: .2 });
  tone('sawtooth', 220, T(2.0), { a: .72, g: .06, d: .02, to: 880, tt: .74, lp: 1200, lp2: 5000, lpt: .74, send: .15 });
  hiss(T(2.06), { type: 'highpass', f: 5500, q: .7, a: .66, g: .14, d: .01, send: .1 });
  // a gota de cera
  tone('sine', 640, T(2.42), { a: .002, g: .16, d: .14, to: 190, tt: .12, send: .3 }); hiss(T(2.42), { f: 900, q: 1.4, a: .002, g: .1, d: .08, send: .25 });

  // ===== 2) IMPACTO =====
  const I = T(2.82); DST = out;
  drum(I, 170, 46, 1, 1.1, { sub: .22, skin: 2200, send: .45 });                            // o tambor grande
  tone('triangle', 240, I, { a: .002, g: .45, d: .5, to: 110, tt: .25, sat: 1, hp: 150, send: .4 }); // o corpo do golpe (médios: ouve-se no telemóvel)
  hiss(I, { type: 'lowpass', f: 6500, f2: 900, ft: .2, q: .6, a: .001, g: .55, d: .35, send: .55 });
  [1, 2.76, 5.4, 8.93].forEach((m, i) => tone('sine', 220 * m, I + .004, { a: .002, g: .13 / (1 + i * .45), d: 1.9 - i * .3, send: .7, det: R(-5, 5) })); // o latão
  strings([220, 277.18, 329.63, 440, 554.37], I, .012, .22, 1.1, .05, 4500, 1600, .6);     // o acorde de metais (lá maior), forte e a abrir
  for (let i = 0; i < 22; i++) { const t = I + .03 + Math.pow(Math.random(), 1.6) * .9; hiss(t, { type: 'highpass', f: R(3000, 7000), q: .9, a: .001, g: .09 * (1 - (t - I) / 1.1) + .015, d: R(.01, .03), send: .45, pan: R(-.75, .75) }); }

  // ===== 3) o selo e o nome (ré maior → lá maior) =====
  DST = bed;
  strings([146.83, 220, 293.66, 369.99, 440, 587.33], T(2.98), .4, 1, .45, .032, 1300, 3000);    // ré maior
  tone('sawtooth', 146.83, T(2.98), { a: .4, h: 1, d: .4, g: .03, lp: 800, send: .2 });
  bell(1318.5, T(3.15), .045, 1.4);                                                         // o brilho no selo
  [659.25, 880, 1108.73, 1318.5, 1760].forEach((f, i) => pluck(f, T(3.29 + i * .075), .1, -.5 + i * .25, .7)); // "Prumo": uma nota por letra
  drum(T(3.3), 110, 55, .42, .45, { sub: .05, skin: 1100 });
  drum(T(3.8), 98, 49, .4, .45, { sub: .05, skin: 1000 });
  hiss(T(3.78), { f: 3000, f2: 8000, ft: .35, q: 2, a: .08, g: .06, d: .3, send: .5 });    // o traço dourado
  pluck(880, T(3.97), .05, -.2, 1); pluck(1318.5, T(4.05), .045, .2, 1);                   // o lema
  hiss(T(4.0), { type: 'highpass', f: 6000, q: .7, a: .38, g: .1, d: .02, send: .15 });   // prato ao contrário para o remate
  // o remate: lá maior, mais largo, com tímpano, prato e brilho
  const F = T(4.38); DST = out;
  strings([220, 277.18, 329.63, 440, 554.37, 659.25, 880], F, .12, .55, 1.1, .034, 1800, 3600, .55);
  tone('sawtooth', 110, F, { a: .1, h: .6, d: 1, g: .03, lp: 900, send: .2 });
  drum(F, 120, 48, .6, .9, { sub: .12, skin: 1400, send: .45 });
  hiss(F, { type: 'highpass', f: 4500, q: .6, a: .004, g: .12, d: 1.1, send: .6 });         // o prato
  bell(1760, T(4.2), .04, 1.6); bell(2217.46, T(4.45), .035, 1.6);

  // ---- o fim: sai com a imagem ----
  out.gain.setValueAtTime(VOL, T(5.1)); out.gain.linearRampToValueAtTime(Z, T(5.9));
  return { stop: (sec = .3) => { try { const n = ctx.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(Math.max(out.gain.value, Z), n); out.gain.linearRampToValueAtTime(Z, n + sec); } catch (e) { } } };
};
// grava a música num só som (sem esperar pelo tempo real): no iPhone toca-se depois de uma só vez, sem engasgos
const render = (sr = 44100) => { const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return Promise.reject(new Error('sem áudio'));
  const oc = new OAC(2, Math.ceil(sr * LEN), sr); play(oc, 0); const p = oc.startRendering(); return p && p.then ? p : new Promise((ok, ko) => { oc.oncomplete = e => ok(e.renderedBuffer); setTimeout(() => ko(new Error('tempo')), 8000); }); };
window.PrumoIntroSom = { play, render, LEN };
})();
