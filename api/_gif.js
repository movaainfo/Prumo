// PRUMO · ler GIFs animados no servidor (v3.89), para a IA verificar a foto e o fundo animados do perfil antes de entrarem.
// Desmonta a animação quadro a quadro (LZW, transparência, entrelaçado e os modos de troca de quadro), guarda uma miniatura de cada um
// e escolhe até 24 quadros: o primeiro, o último, os que mudam de repente (onde alguém esconderia uma imagem de um só quadro) e outros
// espalhados pelo meio. Junta-os em 2 grelhas PNG (4×3), que vão à IA de uma vez. Sem dependências: só zlib do Node.
'use strict';
const zlib = require('zlib');
const LIM = { lado: 1000, px: 1e6, quadros: 150, trabalho: 9e7 };
const erro = m => Object.assign(new Error(m), { gif: true });

/* ---------- PNG (RGB, sem filtro) ---------- */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const bloco = (tipo, dados) => { const l = Buffer.alloc(4), t = Buffer.from(tipo, 'ascii'), c = Buffer.alloc(4); l.writeUInt32BE(dados.length); c.writeUInt32BE(crc(Buffer.concat([t, dados]))); return Buffer.concat([l, t, dados, c]); };
const png = (w, h, rgb) => { const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ih), bloco('IDAT', zlib.deflateSync(raw, { level: 6 })), bloco('IEND', Buffer.alloc(0))]); };

/* ---------- LZW do GIF ---------- */
const lzw = (min, dados, n) => { const out = new Uint8Array(n), pre = new Int16Array(4096), suf = new Uint8Array(4096), pilha = new Uint8Array(4097);
  const clear = 1 << min, fim = clear + 1; let tam = min + 1, mask = (1 << tam) - 1, prox = clear + 2, ant = -1, prim = 0, bits = 0, acc = 0, o = 0;
  for (let i = 0; i < clear; i++) { pre[i] = -1; suf[i] = i; }
  for (let p = 0; p < dados.length && o < n;) { acc |= dados[p++] << bits; bits += 8;
    while (bits >= tam && o < n) { const cod = acc & mask; acc >>>= tam; bits -= tam;
      if (cod === clear) { tam = min + 1; mask = (1 << tam) - 1; prox = clear + 2; ant = -1; continue; } if (cod === fim) return out;
      if (ant === -1) { out[o++] = suf[cod]; ant = cod; prim = cod; continue; }
      let c = cod, sp = 0; if (cod >= prox) { pilha[sp++] = prim; c = ant; } else if (cod > prox) throw erro('GIF estragado.');
      while (c > clear && sp < 4096) { pilha[sp++] = suf[c]; c = pre[c]; } prim = suf[c]; pilha[sp++] = prim;
      while (sp && o < n) out[o++] = pilha[--sp];
      if (prox < 4096) { pre[prox] = ant; suf[prox] = prim; prox++; if ((prox & mask) === 0 && prox < 4096) { tam++; mask = (1 << tam) - 1; } } ant = cod; } }
  return out; };

/* ---------- desmontar ---------- */
// devolve { w, h, n, miniaturas: [{ rgb, w, h, sig }] } (miniatura com o lado maior de 160 px; a assinatura é 12×12 em cinzento)
const ler = buf => { if (buf.length < 13 || buf.toString('ascii', 0, 4) !== 'GIF8') throw erro('Não é um GIF.');
  const W = buf.readUInt16LE(6), H = buf.readUInt16LE(8), pk = buf[10]; if (!W || !H || W > LIM.lado || H > LIM.lado || W * H > LIM.px) throw erro('O GIF é grande demais (máximo 1000×1000).');
  let p = 13, gct = null; if (pk & 0x80) { const n = 3 << ((pk & 7) + 1); gct = buf.subarray(p, p + n); p += n; }
  const tela = new Uint8Array(W * H * 4), k = Math.min(1, 160 / Math.max(W, H)), mw = Math.max(1, Math.round(W * k)), mh = Math.max(1, Math.round(H * k)), mini = [];
  let gce = null, trabalho = 0, guardada = null;
  const sub = () => { const partes = []; while (p < buf.length) { const n = buf[p++]; if (!n) break; partes.push(buf.subarray(p, p + n)); p += n; } return Buffer.concat(partes); };
  const foto = () => { const rgb = Buffer.alloc(mw * mh * 3), sig = new Float32Array(144);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const sx = Math.min(W - 1, Math.floor(x / k)), sy = Math.min(H - 1, Math.floor(y / k)), i = (sy * W + sx) * 4, a = tela[i + 3] / 255, o = (y * mw + x) * 3;
      rgb[o] = tela[i] * a + 40 * (1 - a); rgb[o + 1] = tela[i + 1] * a + 40 * (1 - a); rgb[o + 2] = tela[i + 2] * a + 46 * (1 - a); }
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const o = (Math.min(mh - 1, Math.floor(y * mh / 12)) * mw + Math.min(mw - 1, Math.floor(x * mw / 12))) * 3; sig[y * 12 + x] = (rgb[o] * .3 + rgb[o + 1] * .59 + rgb[o + 2] * .11); }
    mini.push({ rgb, w: mw, h: mh, sig }); };
  while (p < buf.length) { const b = buf[p++];
    if (b === 0x3B) break;
    if (b === 0x21) { const lab = buf[p++]; if (lab === 0xF9 && buf[p] >= 4) { gce = { disp: (buf[p + 1] >> 2) & 7, tr: buf[p + 1] & 1 ? buf[p + 4] : -1 }; } sub(); continue; }
    if (b !== 0x2C) throw erro('GIF estragado.');
    if (mini.length >= LIM.quadros) throw erro('O GIF tem quadros demais (máximo ' + LIM.quadros + ').');
    const x0 = buf.readUInt16LE(p), y0 = buf.readUInt16LE(p + 2), fw = buf.readUInt16LE(p + 4), fh = buf.readUInt16LE(p + 6), ip = buf[p + 8]; p += 9;
    let ct = gct; if (ip & 0x80) { const n = 3 << ((ip & 7) + 1); ct = buf.subarray(p, p + n); p += n; } if (!ct) throw erro('GIF sem cores.');
    const min = buf[p++]; if (min < 2 || min > 11) throw erro('GIF estragado.'); const dados = sub(); trabalho += fw * fh; if (trabalho > LIM.trabalho) throw erro('O GIF é pesado demais.');
    const disp = gce ? gce.disp : 0, tr = gce ? gce.tr : -1; if (disp === 3) guardada = tela.slice();
    const idx = lzw(min, dados, fw * fh), linhas = [];
    if (ip & 0x40) { for (const [ini, passo] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = ini; y < fh; y += passo) linhas.push(y); } else for (let y = 0; y < fh; y++) linhas.push(y);
    for (let r = 0; r < fh; r++) { const ty = y0 + linhas[r]; if (ty >= H) continue;
      for (let x = 0; x < fw; x++) { const tx = x0 + x; if (tx >= W) continue; const c = idx[r * fw + x]; if (c === tr || c * 3 + 2 >= ct.length) continue; const o = (ty * W + tx) * 4; tela[o] = ct[c * 3]; tela[o + 1] = ct[c * 3 + 1]; tela[o + 2] = ct[c * 3 + 2]; tela[o + 3] = 255; } }
    foto();
    if (disp === 2) { for (let y = y0; y < Math.min(H, y0 + fh); y++) tela.fill(0, (y * W + x0) * 4, (y * W + Math.min(W, x0 + fw)) * 4); }
    else if (disp === 3 && guardada) tela.set(guardada);
    gce = null; }
  if (!mini.length) throw erro('O GIF não tem imagens.');
  return { w: W, h: H, n: mini.length, mini }; };

/* ---------- escolher quadros e montar as grelhas ---------- */
const escolher = (mini, max = 24) => { const n = mini.length; if (n <= max) return mini.map((_, i) => i);
  const dif = mini.map((m, i) => { if (!i) return Infinity; let s = 0; const a = mini[i - 1].sig; for (let j = 0; j < 144; j++) s += Math.abs(m.sig[j] - a[j]); return s; });
  const set = new Set([0, n - 1]); dif.map((d, i) => [d, i]).sort((a, b) => b[0] - a[0]).slice(0, Math.floor(max / 2)).forEach(([, i]) => set.add(i));
  for (let j = 0; set.size < max && j < max; j++) set.add(Math.round(j * (n - 1) / (max - 1)));
  for (let i = 0; set.size < max && i < n; i++) set.add(i); return [...set].sort((a, b) => a - b).slice(0, max); };
const grelha = (L, cols = 4, rows = 3, cel = 160) => { const W = cols * cel, H = rows * cel, rgb = Buffer.alloc(W * H * 3, 24);
  L.forEach((m, q) => { const cx = (q % cols) * cel + Math.floor((cel - m.w) / 2), cy = Math.floor(q / cols) * cel + Math.floor((cel - m.h) / 2);
    for (let y = 0; y < m.h; y++) m.rgb.copy(rgb, ((cy + y) * W + cx) * 3, y * m.w * 3, (y + 1) * m.w * 3); });
  return png(W, H, rgb); };
// o que a IA recebe: 1 ou 2 grelhas PNG em base64
const quadros = buf => { const g = ler(buf), esc = escolher(g.mini), L = esc.map(i => g.mini[i]), out = [];
  for (let i = 0; i < L.length; i += 12) out.push(grelha(L.slice(i, i + 12)).toString('base64'));
  return { w: g.w, h: g.h, n: g.n, escolhidos: esc.length, grelhas: out }; };
const eGif = buf => !!buf && buf.length > 6 && buf.toString('ascii', 0, 4) === 'GIF8';
module.exports = { quadros, ler, escolher, png, eGif };
