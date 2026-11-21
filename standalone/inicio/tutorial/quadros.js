// PRUMO · tutorial: desenha as camadas do vídeo (fundo, moldura do telemóvel, títulos e legendas) em PNG com as letras do Prumo.
// Uso: node quadros.js <spec.json>  — spec: { fontes, saida, w, h, itens: [{ f, html, transparente }] }
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const F = spec.fontes;
const css = `@font-face{font-family:"Bodoni Moda";src:url(file://${F}/bodoni-moda.woff2) format("woff2");font-weight:400 900}
@font-face{font-family:"Geist";src:url(file://${F}/e09adcd0ca.woff2) format("woff2");font-weight:400 700}
*{box-sizing:border-box;margin:0}html,body{width:${spec.w}px;height:${spec.h}px;overflow:hidden}body{font-family:Geist,sans-serif;color:#F4D9A0}`;
(async () => {
  const b = await chromium.launch(), c = await b.newContext({ viewport: { width: spec.w, height: spec.h }, deviceScaleFactor: 1 }), p = await c.newPage();
  for (const it of spec.itens) {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}${it.transparente ? 'html,body{background:transparent}' : ''}</style></head><body>${it.html}</body></html>`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(spec.saida, it.f), omitBackground: !!it.transparente });
  }
  await b.close(); console.log(spec.itens.length, 'camadas');
})();
