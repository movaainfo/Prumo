// PRUMO — grava a música da intro (js/introsom.js) num MP3 que vai com o app: standalone/som/intro.mp3.
// No iPhone o app só tem de tocar este ficheiro (começado no toque), sem gerar nada no momento.
// Uso, quando a música mudar: NODE_PATH=/opt/node22/lib/node_modules node standalone/gensom.js  (precisa do Playwright/Chromium e do ffmpeg)
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { chromium } = require('playwright');
(async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'introsom.js'), 'utf8');
  const b = await chromium.launch(), p = await b.newPage(); await p.setContent('<html><body></body></html>'); await p.addScriptTag({ content: src });
  const b64 = await p.evaluate(async () => { const buf = await PrumoIntroSom.render(44100), u = new Uint8Array(await PrumoIntroSom.wav(buf).arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); });
  await b.close();
  const dir = path.join(__dirname, 'som'), wav = path.join(dir, 'intro.wav'), mp3 = path.join(dir, 'intro.mp3'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', '44100', mp3]); fs.unlinkSync(wav);
  console.log('som/intro.mp3', fs.statSync(mp3).size, 'bytes');
})().catch(e => { console.error(e); process.exit(1); });
