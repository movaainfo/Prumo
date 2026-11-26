/* PRUMO — Fotos (v3.74), em Eu. Escolhes as fotos da galeria (podes escolher todas de uma vez) e o Prumo arruma-as:
   · no aparelho, sem enviar nada: junta as IGUAIS e as PARECIDAS (rajadas, fotos repetidas) e diz qual fica (a mais nítida),
     encontra as desfocadas, as escuras e as capturas de ecrã antigas;
   · com a IA (plano Avançado, depois de autorizares): separa por categorias, descreve o que cada foto mostra (para pesquisar)
     e sugere o que dá para apagar. A IA vê só uma miniatura pequena; nada fica guardado no servidor.
   As fotos ficam só neste aparelho (base de dados do navegador), para as veres aqui mesmo, pesquisares e apagares.
   Limite dos browsers: um site não consegue ler a galeria inteira sozinho nem apagar fotos dela. "Apagar" tira a foto do Prumo;
   na app das lojas (window.PrumoLoja.fotos) apaga também da galeria do telemóvel. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, V = OS.views, esc = U.esc;
if (!UI.IP.image) UI.IP.image = 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9a1.5 1.5 0 1 0 0-.01';
const NAT = () => window.PrumoLoja && window.PrumoLoja.fotos;

/* ---------- base de dados no aparelho ---------- */
let DBP = null;
const db = () => DBP || (DBP = new Promise((res, rej) => { const r = indexedDB.open('prumo-fotos', 1); r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('f')) d.createObjectStore('f', { keyPath: 'id' }); if (!d.objectStoreNames.contains('b')) d.createObjectStore('b', { keyPath: 'id' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
const tx = async (st, modo, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(st, modo), s = t.objectStore(st); let out; try { out = fn(s); } catch (e) { rej(e); return; } t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
const IDB = { todas: () => tx('f', 'readonly', s => s.getAll()), por: o => tx('f', 'readwrite', s => { s.put(o); }), porB: (id, v) => tx('b', 'readwrite', s => { s.put({ id, v }); }), grande: id => tx('b', 'readonly', s => s.get(id)),
  tirar: ids => Promise.all([tx('f', 'readwrite', s => { ids.forEach(i => s.delete(i)); }), tx('b', 'readwrite', s => { ids.forEach(i => s.delete(i)); })]), limpar: () => Promise.all([tx('f', 'readwrite', s => { s.clear(); }), tx('b', 'readwrite', s => { s.clear(); })]) };

/* ---------- estado ---------- */
const F = { L: null, carr: false, prog: null, ia: null, q: '', ver: '', sel: new Set(), modo: '', err: '' };
const URLS = new Map(); const thumb = f => { if (!f.th) return ''; let u = URLS.get(f.id); if (!u) { u = URL.createObjectURL(f.th); URLS.set(f.id, u); } return u; };
const largar = ids => ids.forEach(i => { const u = URLS.get(i); if (u) { URL.revokeObjectURL(u); URLS.delete(i); } });
const carregar = async () => { if (F.carr || F.L) return; F.carr = true; try { F.L = (await IDB.todas()).sort((a, b) => (b.data || 0) - (a.data || 0)); } catch (e) { F.L = []; F.err = 'Este navegador não deixa guardar fotos (modo privado?).'; } F.carr = false; analisar(); OS.request(); };
const mb = n => n >= 1e9 ? U.nf(n / 1e9, 1) + ' GB' : n >= 1e6 ? U.nf(n / 1e6, n >= 1e8 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
const quando = t => t ? new Date(t).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/* ---------- ler cada foto (no aparelho) ---------- */
// data em que a foto foi tirada (EXIF DateTimeOriginal), quando o ficheiro a traz
const exifData = async file => { try { const b = new DataView(await file.slice(0, 196608).arrayBuffer()); if (b.getUint16(0) !== 0xFFD8) return 0; let o = 2;
    while (o < b.byteLength - 4) { const m = b.getUint16(o), len = b.getUint16(o + 2); if (m === 0xFFE1 && b.getUint32(o + 4) === 0x45786966) { const t = o + 10, le = b.getUint16(t) === 0x4949, g16 = p => b.getUint16(p, le), g32 = p => b.getUint32(p, le);
        const ifd = (p, tag) => { const n = g16(p); for (let i = 0; i < n; i++) { const e = p + 2 + i * 12; if (g16(e) === tag) return e; } return 0; };
        const i0 = t + g32(t + 4), ex = ifd(i0, 0x8769); if (!ex) return 0; const e = ifd(t + g32(ex + 8), 0x9003) || ifd(t + g32(ex + 8), 0x9004); if (!e) return 0;
        let s = ''; const p = t + g32(e + 8); for (let i = 0; i < 19; i++) s += String.fromCharCode(b.getUint8(p + i)); const m2 = s.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/); return m2 ? new Date(+m2[1], m2[2] - 1, +m2[3], +m2[4], +m2[5], +m2[6]).getTime() : 0; }
      if ((m & 0xFF00) !== 0xFF00) break; o += 2 + len; } } catch (e) { } return 0; };
const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const blobDe = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
// a "impressão digital" da imagem (dHash 64 bits): fotos iguais têm a mesma; parecidas diferem em poucos bits
const dhash = img => { const c = tela(9, 8), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 9, 8); const d = g.getImageData(0, 0, 9, 8).data, L = []; for (let i = 0; i < 72; i++) L.push(d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114);
  let a = 0, b = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const bit = L[y * 9 + x] > L[y * 9 + x + 1] ? 1 : 0, k = y * 8 + x; if (k < 32) a = (a | (bit << k)) >>> 0; else b = (b | (bit << (k - 32))) >>> 0; } return [a, b]; };
const bits = x => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; };
const dist = (p, q) => bits((p[0] ^ q[0]) >>> 0) + bits((p[1] ^ q[1]) >>> 0);
// nitidez (variância do laplaciano) e luz média, numa cópia pequena
const medir = img => { const W = 160, H = Math.max(1, Math.round(160 * img.height / img.width)), c = tela(W, H), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data, Y = new Float32Array(W * H); let m = 0;
  for (let i = 0; i < W * H; i++) { Y[i] = d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114; m += Y[i]; } m /= W * H; let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, l = 4 * Y[i] - Y[i - 1] - Y[i + 1] - Y[i - W] - Y[i + W]; s += l; s2 += l * l; n++; } const v = n ? s2 / n - (s / n) * (s / n) : 0; return { nit: Math.round(v), luz: Math.round(m) }; };
const abrirImg = async file => { if (window.createImageBitmap) { try { return await createImageBitmap(file); } catch (e) { } } return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 1000); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('formato')); }; im.src = u; }); };
const reduzir = async (img, lado, q) => { const r = Math.min(1, lado / Math.max(img.width, img.height)), c = tela(Math.max(1, Math.round(img.width * r)), Math.max(1, Math.round(img.height * r))); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return blobDe(c, q); };
// v3.79: vídeos: um quadro do primeiro segundo (para a miniatura, a impressão digital e a IA) e a duração
const quadro = file => new Promise((res, rej) => { const v = document.createElement('video'), u = URL.createObjectURL(file); let ok = false; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
  const fim = () => { try { URL.revokeObjectURL(u); } catch (e) { } }; v.onloadedmetadata = () => { try { v.currentTime = Math.min(1, (isFinite(v.duration) && v.duration ? v.duration : 3) / 3); } catch (e) { } };
  const tira = () => { if (ok) return; ok = true; const W = v.videoWidth || 320, H = v.videoHeight || 180, c = tela(W, H); try { c.getContext('2d').drawImage(v, 0, 0, W, H); } catch (e) { } fim(); res({ img: c, w: W, h: H, dur: isFinite(v.duration) ? v.duration : 0 }); };
  v.onseeked = tira; v.onloadeddata = () => setTimeout(tira, 3000);   // (alguns vídeos não deixam saltar para o 1.º segundo: fica o primeiro quadro)
  v.onerror = () => { fim(); rej(new Error('formato')); }; setTimeout(() => { if (!ok) { fim(); rej(new Error('tempo')); } }, 20000); v.src = u; });
const eVideo = f => /^video\//.test(f.type || '') || /\.(mp4|mov|m4v|webm|3gp)$/i.test(f.name || '');
const idDe = f => 'f' + [f.name, f.size, f.lastModified].join('|').split('').reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 7).toString(36).replace('-', 'n') + f.size.toString(36);
const importar = async (files, nat) => { files = [...files].filter(f => /^image\//.test(f.type) || eVideo(f) || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name || '')); if (!files.length) { UI.toast('Não escolheste nenhuma foto nem vídeo.', 'neg'); return; }
  await carregar(); const tem = new Set((F.L || []).map(f => f.id)); let novas = 0, falhas = 0; F.prog = { i: 0, n: files.length };
  for (const file of files) { F.prog.i++; if (F.prog.i % 4 === 0) OS.request(); const id = file.natId ? 'n' + file.natId : idDe(file); if (tem.has(id)) continue;
    if (eVideo(file)) { try { const q = await quadro(file), th = await reduzir(q.img, 360, .78), md = medir(q.img);
        const o = { id, nome: file.name || 'vídeo', tipo: file.type || 'video/mp4', tam: file.size || 0, w: q.w, h: q.h, data: file.lastModified || Date.now(), exif: false, th, h64: dhash(q.img), nit: md.nit, luz: md.luz, cap: false, nat: file.natId || '', add: Date.now(), ia: null, manter: false, video: 1, dur: Math.round(q.dur * 10) / 10 };
        await IDB.por(o); await IDB.porB(id, file.size <= 150e6 ? file : await reduzir(q.img, 1600, .85)); F.L.push(o); tem.add(id); novas++; } catch (e) { falhas++; } continue; }
    try { const img = await abrirImg(file), [th, gr] = await Promise.all([reduzir(img, 360, .78), reduzir(img, 1600, .85)]), md = medir(img), png = /png$/i.test(file.type) || /\.png$/i.test(file.name || '');
      const ratio = Math.max(img.width, img.height) / Math.max(1, Math.min(img.width, img.height)), dt = await exifData(file);
      const o = { id, nome: file.name || 'foto', tipo: file.type || '', tam: file.size || 0, w: img.width, h: img.height, data: dt || file.lastModified || Date.now(), exif: !!dt, th, h64: dhash(img), nit: md.nit, luz: md.luz,
        cap: /screenshot|captura|screen ?shot|screen_|ecr[ãa]/i.test(file.name || '') || (png && !dt && ratio > 1.7 && ratio < 2.4), nat: file.natId || '', add: Date.now(), ia: null, manter: false };
      if (img.close) try { img.close(); } catch (e) { }
      await IDB.por(o); await IDB.porB(id, gr); F.L.push(o); tem.add(id); novas++; } catch (e) { falhas++; } }
  F.prog = null; F.L.sort((a, b) => (b.data || 0) - (a.data || 0)); analisar(); OS.request();
  UI.toast(`${novas} ${novas === 1 ? 'nova' : 'novas'} no Prumo${falhas ? ` · ${falhas} não deu para ler (formato)` : ''}.`, novas ? 'pos' : 'warn'); if (novas && podeIA() && U.ls.get('oc_fotos_ia', 0)) A.foIA(); };

/* ---------- arrumar: iguais, parecidas e o resto das sugestões ---------- */
let AN = { grupos: [], sug: {}, cats: {} };
const melhor = G => G.slice().sort((a, b) => (b.nit - a.nit) || (b.w * b.h - a.w * a.h) || (b.tam - a.tam))[0];
const analisar = () => { const L = (F.L || []).slice(), grupos = [], ord = L.filter(x => x.h64).sort((a, b) => (a.data || 0) - (b.data || 0));
  const junta = (C, ok, tipo) => { const usado = new Set(); for (let i = 0; i < C.length; i++) { const a = C[i]; if (usado.has(a.id)) continue; const G = [a];
      for (let j = i + 1; j < C.length; j++) { const b = C[j]; if (!usado.has(b.id) && ok(a, b)) G.push(b); }
      if (G.length > 1) { G.forEach(x => usado.add(x.id)); const fica = melhor(G); grupos.push({ tipo, L: G, fica: fica.id, tam: G.filter(x => x.id !== fica.id).reduce((s, x) => s + x.tam, 0) }); } } };
  // 1.º as iguais (a mesma impressão digital); 2.º as parecidas (poucos bits de diferença e tiradas até 20 min uma da outra), entre as que ficaram
  // a impressão digital sozinha engana em imagens sem detalhe (pretas, lisas): também têm de ter luz e proporção parecidas
  const prop = x => x.w / Math.max(1, x.h), mesmo = (a, b, dl) => Math.abs(a.luz - b.luz) <= dl && Math.abs(prop(a) - prop(b)) <= .05 * prop(a);
  junta(ord, (a, b) => dist(a.h64, b.h64) <= 3 && mesmo(a, b, 10), 'iguais');
  const sai = new Set(grupos.flatMap(g => g.L.filter(x => x.id !== g.fica).map(x => x.id)));
  junta(ord.filter(x => !sai.has(x.id)), (a, b) => { const d = dist(a.h64, b.h64); return d <= 10 && mesmo(a, b, 28) && Math.abs((b.data || 0) - (a.data || 0)) < 20 * 6e4; }, 'parecidas');
  const extra = new Set(grupos.flatMap(g => g.L.filter(x => x.id !== g.fica).map(x => x.id))), mes = Date.now() - 30 * 864e5, livre = x => !x.manter;
  const sug = { iguais: grupos.filter(g => g.tipo === 'iguais').flatMap(g => g.L.filter(x => x.id !== g.fica)).filter(livre), parecidas: grupos.filter(g => g.tipo === 'parecidas').flatMap(g => g.L.filter(x => x.id !== g.fica)).filter(livre),
    desfocadas: L.filter(x => livre(x) && !extra.has(x.id) && !x.cap && x.nit < 45 && x.luz >= 26), escuras: L.filter(x => livre(x) && !extra.has(x.id) && x.luz < 26),
    capturas: L.filter(x => livre(x) && !extra.has(x.id) && x.cap && (x.data || 0) < mes), ia: L.filter(x => livre(x) && !extra.has(x.id) && x.ia && x.ia.apagar), videos: L.filter(x => livre(x) && x.video && (x.tam > 100e6 || (x.dur && x.dur < 2))) };
  const cats = {}; L.forEach(x => { const c = x.ia ? x.ia.cat : x.cap ? 'Capturas de ecrã' : ''; if (c) (cats[c] = cats[c] || []).push(x); });
  AN = { grupos, sug, cats }; };
const SUG = [['iguais', 'Fotos iguais', 'Cópias da mesma foto. Fica a mais nítida.'], ['parecidas', 'Fotos parecidas', 'Rajadas e repetidas tiradas seguidas. Fica a melhor de cada grupo.'], ['desfocadas', 'Desfocadas', 'Tremidas ou sem foco.'],
  ['escuras', 'Escuras', 'Quase pretas: no bolso ou sem luz.'], ['capturas', 'Capturas de ecrã antigas', 'Com mais de um mês.'], ['ia', 'A IA sugere', 'Memes, talões, fotos acidentais e coisas banais.'], ['videos', 'Vídeos pesados ou acidentais', 'Com mais de 100 MB ou com menos de 2 segundos.']];

/* ---------- a IA: categorias, o que mostra e o que dá para apagar ---------- */
const podeIA = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token());
const b64De = async blob => { const img = await abrirImg(blob), r = Math.min(1, 256 / Math.max(img.width, img.height)), c = tela(Math.round(img.width * r), Math.round(img.height * r)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .72).split(',')[1]; };
A.foIA = async () => { if (F.ia) return; if (!podeIA()) { UI.toast('Entra na tua conta Prumo para a IA separar as fotos.', 'neg'); return; }
  if (!U.ls.get('oc_fotos_ia', 0)) { if (!confirm('A IA vai ver uma miniatura pequena de cada foto (não fica guardada em lado nenhum) para dizer a categoria, o que mostra e se dá para apagar.\n\nContinuar?')) return; U.ls.set('oc_fotos_ia', 1); }
  const falta = (F.L || []).filter(x => !x.ia); if (!falta.length) { UI.toast('Todas as fotos já estão separadas.', 'pos'); return; } F.ia = { i: 0, n: falta.length }; OS.request();
  try { for (let k = 0; k < falta.length; k += 8) { const lote = falta.slice(k, k + 8), imgs = [];
      for (const f of lote) { try { imgs.push({ id: f.id, b64: await b64De(f.th) }); } catch (e) { } }
      const r = await fetch('api/ia?p=fotos', { method: 'POST', cache: 'no-store', credentials: 'omit', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OS.Acc.token() }, body: JSON.stringify({ imgs: imgs.map(x => ({ b64: x.b64 })) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok || !j.ok) throw new Error((j.error && j.error.message) || 'A IA não respondeu.');
      (j.r || []).forEach(o => { const f = lote.find(x => x.id === (imgs[o.i] || {}).id); if (!f) return; f.ia = { cat: o.cat, tags: o.tags || [], desc: o.desc || '', apagar: !!o.apagar, motivo: o.motivo || '' }; IDB.por(f).catch(() => { }); });
      F.ia.i = Math.min(falta.length, k + 8); analisar(); OS.request(); }
    UI.toast('Fotos separadas pela IA.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } F.ia = null; analisar(); OS.request(); };

/* ---------- pesquisar ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const texto = x => { const d = new Date(x.data || 0); return norm([x.nome, x.ia && x.ia.cat, x.ia && x.ia.desc, x.ia && (x.ia.tags || []).join(' '), x.cap ? 'captura ecra screenshot' : '', x.nit < 45 ? 'desfocada tremida' : '', x.luz < 26 ? 'escura' : '', d.getFullYear(), MESES[d.getMonth()]].join(' ')); };
const pesquisa = q => { const t = norm(q).split(/\s+/).filter(Boolean); return t.length ? (F.L || []).filter(x => { const s = texto(x); return t.every(w => s.includes(w)); }) : []; };

/* ---------- a página ---------- */
const cel = (x, sel) => `<button type="button" class="fo-c${x.video ? ' vid' : ''}${sel ? ' sel' : ''}${F.sel.has(x.id) ? ' on' : ''}" data-act="${F.modo === 'sel' || sel ? 'foSel' : 'foVer'}" data-id="${esc(x.id)}" aria-label="${esc((x.ia && x.ia.desc) || x.nome)}${F.sel.has(x.id) ? ' (escolhida)' : ''}"><img src="${thumb(x)}" alt="" loading="lazy" decoding="async">${x.video ? `<em class="fo-dur">${UI.ic('play')}${x.dur >= 60 ? Math.floor(x.dur / 60) + ':' + String(Math.round(x.dur % 60)).padStart(2, '0') : Math.round(x.dur || 0) + ' s'}</em>` : ''}<i aria-hidden="true">${UI.ic('check')}</i></button>`;
const grelha = (L, max = 240) => `<div class="fo-g">${L.slice(0, max).map(x => cel(x)).join('')}</div>${L.length > max ? `<p class="mut">E mais ${L.length - max}. Usa a pesquisa para encontrar outras.</p>` : ''}`;
const monte = L => `<span class="fo-m" aria-hidden="true">${L.slice(0, 3).map((x, i) => `<img src="${thumb(x)}" alt="" loading="lazy" style="--r:${[-7, 5, -1][i]}deg">`).join('')}</span>`;
const topo = () => UI.head('Fotos', 'As fotos da tua galeria arrumadas: o que dá para apagar, as iguais e as parecidas juntas, as categorias e a pesquisa. Ficam só neste aparelho.', `<label class="btn pri fo-esc">${UI.ic('plus')}<span>Escolher fotos e vídeos</span><input class="fo-file" type="file" accept="image/*,video/*" multiple data-fo="in" tabindex="-1"></label><label class="btn fo-esc">${UI.ic('focus')}<span>Tirar foto</span><input class="fo-file" type="file" accept="image/*" capture="environment" data-fo="in" tabindex="-1"></label><label class="btn fo-esc">${UI.ic('play')}<span>Gravar vídeo</span><input class="fo-file" type="file" accept="video/*" capture="environment" data-fo="in" tabindex="-1"></label>${NAT() ? `<button class="btn" data-act="foGaleria">${UI.ic('image')}<span>Galeria toda</span></button>` : ''}`, 'Eu');
// v3.79: o que dá para ficar automático (um site não pode ler a galeria sozinho: no iPhone o Safari não deixa)
const android = /Android/i.test(navigator.userAgent), iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
const auto = () => `<div class="fo-auto"><h4>${UI.ic('bolt')}Para ficar automático</h4><ul>
  <li><b>Tira e grava pelo Prumo</b> (Tirar foto, Gravar vídeo): entra logo aqui e fica arrumado.</li>
  ${android ? '<li><b>Partilha da Galeria para o Prumo</b>: escolhe as fotos ou vídeos, toca em Partilhar e escolhe Prumo. Entram e arrumam-se sozinhos.</li>' : '<li><b>No Android</b>, com o Prumo instalado, partilha da Galeria para o Prumo e entram sozinhos.</li>'}
  <li><b>A IA arruma sozinha</b>: ${U.ls.get('oc_fotos_ia', 0) ? 'ligada. Cada foto ou vídeo novo é classificado logo.' : `<button type="button" class="btn xs" data-act="foAutoIA">Ligar</button> e cada foto ou vídeo novo é classificado logo.`}</li>
  <li><b>${iphone ? 'No iPhone' : 'Na app das lojas'}</b>: ${iphone ? 'o Safari não deixa um site ler a galeria sozinho. ' : ''}A app do Prumo para iPhone e Android vai ler as fotos novas sozinha.</li></ul></div>`;
A.foAutoIA = () => { if (!podeIA()) { UI.toast('Entra na tua conta Prumo para a IA arrumar as fotos.', 'neg'); return; } U.ls.set('oc_fotos_ia', 1); OS.request(); if ((F.L || []).some(x => !x.ia)) A.foIA(); };
// o que veio partilhado da Galeria (Android): entra e arruma-se
const partilhas = async () => { try { if (!window.caches) return; const c = await caches.open('prumo-partilha'), ks = await c.keys(); if (!ks.length) return; const fs = [];
    for (const k of ks) { const r = await c.match(k); if (!r) continue; const b = await r.blob(), nome = decodeURIComponent(r.headers.get('x-nome') || 'partilha'), d = +r.headers.get('x-data') || Date.now(); try { fs.push(new File([b], nome, { type: b.type || r.headers.get('content-type') || '', lastModified: d })); } catch (e) { } await c.delete(k); }
    if (fs.length) { if (!/^#fotos/.test(location.hash)) location.hash = 'fotos'; await importar(fs); } } catch (e) { } };
// a app das lojas (quando existir): lê sozinha as fotos e vídeos novos da galeria ao abrir e ao voltar
const nativas = async () => { try { const N = NAT(); if (!N || !N.novas) return; const desde = U.ls.get('oc_fotos_nat_at', 0), fs = await N.novas(desde); U.ls.set('oc_fotos_nat_at', Date.now()); if (fs && fs.length) await importar(fs, true); } catch (e) { } };
OS.on && OS.on('ready', () => { setTimeout(() => { partilhas(); nativas(); }, 1500); document.addEventListener('visibilitychange', () => { if (!document.hidden) { partilhas(); nativas(); } }); });
const barraSel = () => F.modo !== 'sel' ? '' : `<div class="fo-selb" role="toolbar" aria-label="Fotos escolhidas"><b>${F.sel.size} ${F.sel.size === 1 ? 'escolhida' : 'escolhidas'}</b><button class="btn sm" data-act="foSelTudo">Escolher todas</button><button class="btn sm danger" data-act="foApagar" ${F.sel.size ? '' : 'disabled'}>${UI.ic('trash')}Apagar</button><button class="btn sm ghost" data-act="foSelSair">Cancelar</button></div>`;
const vista = sub => { carregar(); const L = F.L || [];
  if (!F.L) return topo() + `<div class="pn">${F.err || 'A abrir as tuas fotos…'}</div>`;
  const prog = F.prog ? `<div class="fo-prog" role="status"><span style="--p:${(F.prog.i / F.prog.n * 100).toFixed(1)}%"></span><b>A ler ${F.prog.i} de ${F.prog.n} fotos…</b></div>` : F.ia ? `<div class="fo-prog" role="status"><span style="--p:${(F.ia.i / F.ia.n * 100).toFixed(1)}%"></span><b>A IA está a ver ${F.ia.i} de ${F.ia.n}…</b></div>` : '';
  if (!L.length) return topo() + prog + `<section class="fo-vz"><div class="fo-vzm" aria-hidden="true"><i></i><i></i><i></i></div><h3>Arruma a tua galeria</h3><p>Escolhe as fotos (no iPhone, em <b>Selecionar</b> podes arrastar o dedo para escolher muitas de uma vez). O Prumo junta as iguais e as parecidas, encontra as desfocadas e as capturas de ecrã, e a IA separa o resto por categorias.</p>
      <label class="btn pri">${UI.ic('plus')}Escolher fotos e vídeos<input class="fo-file" type="file" accept="image/*,video/*" multiple data-fo="in" tabindex="-1"></label>${auto()}</section>`;
  // uma categoria, um grupo de sugestões ou a pesquisa
  const q = F.q.trim(); let corpo = '';
  if (q) { const R = pesquisa(q); corpo = `<section class="fo-sec"><h3>${R.length} ${R.length === 1 ? 'foto' : 'fotos'} para "${esc(q)}"</h3>${R.length ? grelha(R) : `<p class="mut">Nada encontrado. ${AN.cats && Object.keys(AN.cats).length ? '' : 'Pede à IA para separar as fotos: depois pesquisas pelo que aparece nelas (praia, cão, recibo…).'}</p>`}</section>`; }
  else if (/^s:/.test(sub || '')) { const k = sub.slice(2), D = SUG.find(s => s[0] === k) || SUG[0];
    if (k === 'iguais' || k === 'parecidas') { const G = AN.grupos.filter(g => g.tipo === k && g.L.some(x => !x.manter && x.id !== g.fica));
      corpo = `<section class="fo-sec"><a class="fo-vol" href="#fotos">${UI.ic('left')}Fotos</a><h3>${D[1]}</h3><p class="mut">${D[2]} Toca numa foto para a ver; as marcadas a vermelho vão para o lixo.</p>
        ${G.map((g, i) => `<div class="fo-gr"><div class="fo-g">${g.L.map(x => `<button type="button" class="fo-c${x.id === g.fica ? ' fica' : ' sai'}" data-act="foVer" data-id="${esc(x.id)}" aria-label="${x.id === g.fica ? 'Fica esta' : 'Para apagar'}"><img src="${thumb(x)}" alt="" loading="lazy">${x.id === g.fica ? '<em>fica</em>' : ''}</button>`).join('')}</div>
          <div class="row gap6"><button class="btn sm danger" data-act="foGrupo" data-i="${AN.grupos.indexOf(g)}">${UI.ic('trash')}Apagar ${g.L.length - 1} · ${mb(g.tam)}</button><button class="btn sm ghost" data-act="foMantem" data-ids="${esc(g.L.map(x => x.id).join(','))}">Manter todas</button></div></div>`).join('') || '<p class="mut">Nada para rever aqui.</p>'}
        ${G.length > 1 ? `<button class="btn danger" data-act="foTodos" data-k="${k}">${UI.ic('trash')}Apagar todas as marcadas (${AN.sug[k].length})</button>` : ''}</section>`; }
    else { const S0 = AN.sug[k] || []; corpo = `<section class="fo-sec"><a class="fo-vol" href="#fotos">${UI.ic('left')}Fotos</a><h3>${D[1]}</h3><p class="mut">${D[2]}</p>${S0.length ? `<div class="row gap6" style="flex-wrap:wrap"><button class="btn danger" data-act="foTodos" data-k="${k}">${UI.ic('trash')}Apagar as ${S0.length} · ${mb(S0.reduce((s, x) => s + x.tam, 0))}</button><button class="btn ghost" data-act="foSelIr" data-k="${k}">Escolher quais</button></div>` + grelha(S0) : '<p class="mut">Nada para rever aqui.</p>'}</section>`; } }
  else if (/^c:/.test(sub || '')) { const c = decodeURIComponent(sub.slice(2)), C = AN.cats[c] || []; corpo = `<section class="fo-sec"><a class="fo-vol" href="#fotos">${UI.ic('left')}Fotos</a><h3>${esc(c)} <small class="mut">${C.length}</small></h3>${grelha(C)}</section>`; }
  else if (sub === 'todas') { const M = {}; L.forEach(x => { const d = new Date(x.data || 0), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); (M[k] = M[k] || []).push(x); });
    corpo = `<section class="fo-sec"><a class="fo-vol" href="#fotos">${UI.ic('left')}Fotos</a><h3>Todas as fotos</h3>${Object.keys(M).sort().reverse().map(k => `<h4 class="fo-mes">${esc(new Date(k + '-01T12:00').toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { month: 'long', year: 'numeric' }))} <small>${M[k].length}</small></h4>${grelha(M[k], 400)}`).join('')}</section>`; }
  else { const tot = L.reduce((s, x) => s + x.tam, 0), apagaveis = new Map(); SUG.forEach(([k]) => (AN.sug[k] || []).forEach(x => apagaveis.set(x.id, x))); const livre = [...apagaveis.values()].reduce((s, x) => s + x.tam, 0), semIA = L.filter(x => !x.ia).length;
    corpo = `<section class="fo-res"><div><b>${L.length}</b><span>${L.length === 1 ? 'foto' : 'fotos'} · ${mb(tot)}</span></div><div class="fo-lib"><span>Podes libertar</span><b>${mb(livre)}</b><i style="--p:${tot ? Math.min(100, livre / tot * 100).toFixed(1) : 0}%"></i><small>${apagaveis.size} ${apagaveis.size === 1 ? 'foto sugerida' : 'fotos sugeridas'} para apagar</small></div></section>
      <section class="fo-sec"><h3>Para rever e apagar</h3><div class="fo-sug">${SUG.filter(([k]) => (AN.sug[k] || []).length).map(([k, n, d]) => { const S0 = AN.sug[k]; return `<a class="fo-s" href="#fotos.s:${k}">${monte(S0)}<b>${n}</b><span>${S0.length} · ${mb(S0.reduce((s, x) => s + x.tam, 0))}</span><small>${d}</small></a>`; }).join('') || '<p class="mut">Nada para apagar por agora. A tua galeria está arrumada.</p>'}</div></section>
      <section class="fo-sec"><div class="fo-sh"><h3>Categorias</h3>${semIA ? `<button class="btn sm ${Object.keys(AN.cats).length ? 'ghost' : 'pri'}" data-act="foIA" ${F.ia ? 'disabled' : ''}>${UI.ic('brain')}${Object.keys(AN.cats).length ? `Separar mais ${semIA}` : 'Separar com a IA'}</button>` : ''}</div>
        ${Object.keys(AN.cats).length ? `<div class="fo-cats">${Object.entries(AN.cats).sort((a, b) => b[1].length - a[1].length).map(([c, C]) => `<a class="fo-cat" href="#fotos.c:${encodeURIComponent(c)}">${monte(C)}<b>${esc(c)}</b><span>${C.length}</span></a>`).join('')}</div>` : `<p class="mut">A IA separa as fotos por categorias (pessoas, comida, viagens, documentos…) e escreve o que mostra cada uma, para pesquisares. Está no plano Avançado.</p>`}</section>
      <section class="fo-sec"><div class="fo-sh"><h3>Recentes</h3><a class="btn sm ghost" href="#fotos.todas">Ver todas</a></div>${grelha(L, 24)}</section>`; }
  return topo() + prog + `<div class="fo-pesq"><input class="field" type="search" placeholder="Pesquisar: praia, cão, recibo, 2024, julho…" aria-label="Pesquisar nas fotos" value="${esc(F.q)}" data-fo="q" id="foQ"><button class="btn sm ${F.modo === 'sel' ? 'pri' : 'ghost'}" data-act="${F.modo === 'sel' ? 'foSelSair' : 'foSelIr'}">${F.modo === 'sel' ? 'Acabar' : 'Escolher'}</button></div>` + barraSel() + corpo + (!q && !sub ? auto() : '')
    + `<p class="fo-nota">${UI.ic('lock')}As fotos ficam só neste aparelho. ${NAT() ? 'Apagar aqui apaga também da galeria do telemóvel.' : 'Apagar tira a foto do Prumo. Para a apagar da galeria, apaga-a na app Fotos (o navegador não deixa nenhum site apagar fotos da galeria).'}</p>`; };
V.fotos = sub => vista(sub);

/* ---------- ver uma foto ---------- */
let VER = []; const lista = () => { const r = OS.route(), q = F.q.trim(), sub = r.sub || ''; if (q) return pesquisa(q); if (/^c:/.test(sub)) return AN.cats[decodeURIComponent(sub.slice(2))] || []; if (/^s:/.test(sub)) { const k = sub.slice(2); return k === 'iguais' || k === 'parecidas' ? AN.grupos.filter(g => g.tipo === k).flatMap(g => g.L) : AN.sug[k] || []; } return F.L || []; };
let GU = ''; const verFoto = async id => { VER = lista(); const x = (F.L || []).find(f => f.id === id); if (!x) return; let src = thumb(x); try { const g = await IDB.grande(id); if (g && g.v) { if (GU) URL.revokeObjectURL(GU); GU = URL.createObjectURL(g.v); src = GU; } } catch (e) { }
  const i = VER.findIndex(f => f.id === id), sug = SUG.filter(([k]) => (AN.sug[k] || []).some(f => f.id === id)).map(s => s[1]), grupo = AN.grupos.find(g => g.L.some(f => f.id === id));
  UI.modal(`<div class="fo-v"><div class="fo-vi">${x.video && src !== thumb(x) ? `<video src="${src}" controls playsinline preload="metadata" poster="${thumb(x)}"></video>` : `<img src="${src}" alt="${esc((x.ia && x.ia.desc) || x.nome)}">`}${i > 0 ? `<button class="fo-vn p" data-act="foPass" data-d="-1" aria-label="Foto anterior">${UI.ic('left')}</button>` : ''}${i >= 0 && i < VER.length - 1 ? `<button class="fo-vn n" data-act="foPass" data-d="1" aria-label="Foto seguinte">${UI.ic('right')}</button>` : ''}</div>
    <div class="fo-vd">${x.ia ? `<b>${esc(x.ia.desc || x.ia.cat)}</b><span class="fo-tags">${[x.ia.cat].concat(x.ia.tags || []).map(t => `<i>${esc(t)}</i>`).join('')}</span>` : `<b>${esc(x.nome)}</b>`}
      <small>${x.video ? 'Vídeo' + (x.dur ? ' de ' + (x.dur >= 60 ? Math.floor(x.dur / 60) + ' min ' + Math.round(x.dur % 60) + ' s' : Math.round(x.dur) + ' s') : '') + ' · ' : ''}${esc(quando(x.data))}${x.exif ? '' : ' (data do ficheiro)'} · ${x.w}×${x.h} · ${mb(x.tam)}</small>
      ${sug.length ? `<p class="fo-why">${UI.ic('info')}Sugerida para apagar: ${esc(sug.join(', '))}${x.ia && x.ia.apagar && x.ia.motivo ? ` (${esc(x.ia.motivo)})` : ''}.</p>` : ''}${grupo ? `<p class="fo-why">${grupo.fica === id ? 'Esta é a melhor do grupo de ' : 'Faz parte de um grupo de '}${grupo.L.length} fotos ${grupo.tipo}.</p>` : ''}
      <div class="row gap6" style="flex-wrap:wrap"><button class="btn danger" data-act="foApagarUma" data-id="${esc(id)}">${UI.ic('trash')}Apagar</button>${sug.length ? `<button class="btn ghost" data-act="foMantem" data-ids="${esc(id)}">Manter</button>` : ''}<button class="btn ghost" data-act="foFechar">Fechar</button></div></div></div>`, 'fo-modal');
  F.ver = id; };
A.foVer = b => verFoto(b.dataset.id);
A.foPass = b => { const i = VER.findIndex(f => f.id === F.ver), j = i + (+b.dataset.d); if (VER[j]) verFoto(VER[j].id); };
A.foFechar = () => { UI.closeModal(); F.ver = ''; };
document.addEventListener('keydown', e => { if (!F.ver || !document.querySelector('.fo-v')) return; if (e.key === 'ArrowRight') A.foPass({ dataset: { d: 1 } }); if (e.key === 'ArrowLeft') A.foPass({ dataset: { d: -1 } }); });
// passar com o dedo
let TX = 0; document.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('.fo-vi')) TX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => { if (!TX || !F.ver) return; const dx = e.changedTouches[0].clientX - TX; TX = 0; if (Math.abs(dx) > 60) A.foPass({ dataset: { d: dx < 0 ? 1 : -1 } }); }, { passive: true });

/* ---------- apagar ---------- */
const apagar = async ids => { ids = [...new Set(ids)].filter(Boolean); if (!ids.length) return 0; const L = (F.L || []).filter(x => ids.includes(x.id)), n = L.reduce((s, x) => s + x.tam, 0);
  if (NAT() && NAT().apagar) { const nat = L.filter(x => x.nat).map(x => x.nat); if (nat.length) { try { const ok = await NAT().apagar(nat); if (ok === false) return 0; } catch (e) { UI.toast('A galeria não deixou apagar.', 'neg'); return 0; } } }
  await IDB.tirar(ids); largar(ids); F.L = (F.L || []).filter(x => !ids.includes(x.id)); ids.forEach(i => F.sel.delete(i)); analisar(); OS.request();
  UI.toast(`${ids.length} ${ids.length === 1 ? 'foto apagada' : 'fotos apagadas'} · ${mb(n)}${NAT() ? '' : ' (do Prumo)'}.`, 'pos'); return ids.length; };
const pergunta = (n, tam) => confirm(`Apagar ${n} ${n === 1 ? 'foto' : 'fotos'} (${mb(tam)})?${NAT() ? '' : '\n\nSaem do Prumo. Na galeria do telemóvel continuam até as apagares na app Fotos.'}`);
A.foApagarUma = async b => { const x = (F.L || []).find(f => f.id === b.dataset.id); if (!x || !pergunta(1, x.tam)) return; const i = VER.findIndex(f => f.id === x.id), prox = VER[i + 1] || VER[i - 1]; await apagar([x.id]); VER = VER.filter(f => f.id !== x.id); if (prox && document.querySelector('.fo-v')) verFoto(prox.id); else A.foFechar(); };
A.foGrupo = async b => { const g = AN.grupos[+b.dataset.i]; if (!g) return; const ids = g.L.filter(x => x.id !== g.fica && !x.manter).map(x => x.id); if (pergunta(ids.length, g.tam)) await apagar(ids); };
A.foTodos = async b => { const L = (AN.sug[b.dataset.k] || []); if (L.length && pergunta(L.length, L.reduce((s, x) => s + x.tam, 0))) await apagar(L.map(x => x.id)); };
A.foMantem = async b => { const ids = String(b.dataset.ids || '').split(','); for (const x of (F.L || []).filter(f => ids.includes(f.id))) { x.manter = true; await IDB.por(x).catch(() => { }); } analisar(); OS.request(); if (document.querySelector('.fo-v')) A.foFechar(); UI.toast('Fica guardada. Não volta a ser sugerida.', 'pos'); };
A.foSelIr = b => { F.modo = 'sel'; F.sel.clear(); if (b && b.dataset.k) (AN.sug[b.dataset.k] || []).forEach(x => F.sel.add(x.id)); OS.request(); };
A.foSelSair = () => { F.modo = ''; F.sel.clear(); OS.request(); };
A.foSel = b => { const id = b.dataset.id; if (F.sel.has(id)) F.sel.delete(id); else F.sel.add(id); OS.request(); };
A.foSelTudo = () => { lista().forEach(x => F.sel.add(x.id)); OS.request(); };
A.foApagar = async () => { const L = (F.L || []).filter(x => F.sel.has(x.id)); if (L.length && pergunta(L.length, L.reduce((s, x) => s + x.tam, 0))) { await apagar(L.map(x => x.id)); F.modo = ''; OS.request(); } };
// app das lojas: a galeria toda (com autorização do telemóvel)
A.foGaleria = async () => { try { const L = await NAT().listar({}); await importar((L || []).map(o => Object.assign(o.blob, { name: o.nome || 'foto', natId: o.id, lastModified: o.data || Date.now() })), true); } catch (e) { UI.toast('Sem acesso à galeria. Autoriza nas definições do telemóvel.', 'neg'); } };

/* ---------- escolher ficheiros e pesquisar ---------- */
document.addEventListener('change', e => { const el = e.target; if (el && el.dataset && el.dataset.fo === 'in' && el.files && el.files.length) { const fs = [...el.files]; el.value = ''; importar(fs); } });
const pq = U.deb ? U.deb(() => OS.request(), 220) : () => OS.request();
document.addEventListener('input', e => { const el = e.target; if (el && el.dataset && el.dataset.fo === 'q') { F.q = el.value; pq(); } });
OS.Fotos = { importar, analisar: () => { analisar(); return AN; }, apagar, estado: F, _dist: dist, _dhash: dhash };
})();
