/* PRUMO — tutorial em vídeo dentro do app (v3.66): Definições › Geral › "Aprender a usar o Prumo".
   O vídeo (narração e legendas) é o mesmo da página inicial: inicio/tutorial.mp4. */
(() => {
'use strict';
const UI = OS.UI, A = OS.act;
A.tutVer = () => UI.modal(`<div class="row" style="justify-content:space-between;align-items:center;margin:0 0 10px"><h3 style="margin:0">Aprender a usar o Prumo</h3><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  <video controls playsinline autoplay preload="metadata" poster="inicio/tutorial.webp" src="inicio/tutorial.mp4" style="width:100%;border-radius:14px;background:#000;aspect-ratio:16/9" aria-label="Tutorial do Prumo, com narração e legendas"></video>
  <p class="mut" style="margin:10px 0 0;font-size:13px">Pouco mais de um minuto: o Painel, o teu dia, registar, dinheiro, metas, corpo, Dominus e o assistente.</p>`);
OS.on('ready', () => setTimeout(() => { const o = OS.views.definicoes; if (!o || o._tutS) return;
  const g = sub => { const h = o(sub); if (String(sub || '') !== '') return h;
    const pn = `<div class="pn" id="tutSet"><div class="pn-h"><h3>${UI.ic('play')}Aprender a usar o Prumo</h3><span class="mut" style="font-size:12px">vídeo de 1 minuto</span></div><p class="mut" style="margin:0 0 10px">Um tutorial com narração e legendas, do Painel ao Dominus.</p><button class="btn sm" data-act="tutVer">${UI.ic('play')}Ver o tutorial</button></div>`;
    const i = h.indexOf('<div class="pn'); return i > 0 ? h.slice(0, i) + pn + h.slice(i) : h + pn; };
  g._tutS = 1; Object.keys(o).forEach(x => { if (x !== '_tutS') g[x] = o[x]; }); OS.views.definicoes = g; }, 20));
})();
