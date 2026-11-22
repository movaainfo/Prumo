/* PRUMO — antivírus (v3.70). Verifica tudo o que entra no Prumo antes de chegar à app:
   · ficheiros (importar extratos, escala, fotos, PDFs, folhas de cálculo, cópias): tipo real pelo conteúdo (não pelo nome), programas
     escondidos (Windows, Mac, Linux, Android), nomes disfarçados (foto.jpg.exe, letras invertidas), macros do Office, PDFs com código ou
     anexos, imagens SVG com código, bombas ZIP e o ficheiro de teste EICAR (o mesmo que os antivírus usam para provar que funcionam);
   · links (e-mails, notas, notícias): esquemas perigosos, endereços com nome de banco ou loja que não são deles, letras de outros
     alfabetos, links encurtados, ligações sem cadeado e programas para descarregar.
   Corre só no aparelho, sem enviar os ficheiros a ninguém. O servidor recebe apenas o número de ameaças bloqueadas (sem nomes nem conteúdos).
   Não examina o telemóvel ou o computador inteiros: nenhuma app web ou de loja o pode fazer (no iPhone nem existe essa permissão). */
(() => {
'use strict';
const MB = 1048576, LS = 'os2av', ESC = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const st = () => { try { return Object.assign({ f: 0, b: 0, l: 0, la: 0, h: [] }, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { return { f: 0, b: 0, l: 0, la: 0, h: [] }; } };
const save = o => { try { o.h = (o.h || []).slice(0, 20); localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { } };
const avisaSrv = k => { try { fetch(new URL('api/conta', document.baseURI).href, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'antivirus', k }) }).catch(() => { }); } catch (e) { } };
const nome = n => String(n || 'ficheiro').replace(/[\u0000-\u001f‪-‮⁦-⁩]/g, '').slice(0, 60);

/* ---------- ficheiros ---------- */
const PROG = /\.(exe|scr|com|pif|bat|cmd|msi|msix|msp|dll|cpl|vbs|vbe|js|jse|mjs|ws|wsf|wsh|ps1|psm1|hta|jar|apk|aab|xapk|ipa|app|dmg|pkg|deb|rpm|sh|bash|zsh|command|run|bin|elf|lnk|reg|iso|img|vhd|vhdx|xll|xlam|xlsm|xltm|docm|dotm|pptm|potm|ppsm|sldm|chm|scf|inf|gadget|appx|appxbundle|py|pyw|pyc|pl|rb|php|html?|xhtml|svgz|url|desktop|torrent)$/i;
const PROGZ = /\.(exe|scr|com|pif|bat|cmd|msi|dll|cpl|vbs|vbe|js|jse|wsf|wsh|ps1|hta|jar|apk|lnk|reg|iso|img|vhd|vhdx|dmg|pkg|sh|command|xll|xlsm|docm|pptm|chm|scf|url)$/i;
const IMG_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i, TXT_EXT = /\.(csv|tsv|txt|ofx|qfx|qif|json|ics|vcf|xml|md)$/i;
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const MOTIVO = { prog: 'É um programa (pode instalar vírus no aparelho).', disf: 'O nome diz uma coisa e o conteúdo é outra (ficheiro disfarçado).', macro: 'Tem macros (código escondido) do Office.',
  pdfjs: 'É um PDF com código ou ficheiros escondidos lá dentro.', svg: 'É uma imagem SVG com código lá dentro.', bomba: 'É um ZIP que rebenta para um tamanho enorme (bomba ZIP).', eicar: 'É o ficheiro de teste EICAR: o antivírus está a funcionar.',
  nome: 'O nome do ficheiro esconde a extensão verdadeira.', grande: 'É grande demais para importar.', html: 'Tem uma página web com código lá dentro.', zipprog: 'O ZIP tem programas lá dentro.' };
const ler = async (f, a, b) => new Uint8Array(await f.slice(a, b).arrayBuffer());
const txt = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
const tem = (u8, ...sig) => sig.every((v, i) => v == null || u8[i] === v);
const cabeca = h => tem(h, 0x4D, 0x5A) ? 'prog' : tem(h, 0x7F, 0x45, 0x4C, 0x46) ? 'prog' : [[0xCF, 0xFA, 0xED, 0xFE], [0xCE, 0xFA, 0xED, 0xFE], [0xFE, 0xED, 0xFA, 0xCE], [0xFE, 0xED, 0xFA, 0xCF], [0xCA, 0xFE, 0xBA, 0xBE]].some(s => tem(h, ...s)) ? 'prog'
  : tem(h, 0x64, 0x65, 0x78, 0x0A) ? 'prog' : tem(h, 0x23, 0x21) ? 'prog' : tem(h, 0x25, 0x50, 0x44, 0x46) ? 'pdf' : tem(h, 0x50, 0x4B, 0x03, 0x04) || tem(h, 0x50, 0x4B, 0x05, 0x06) ? 'zip' : tem(h, 0xD0, 0xCF, 0x11, 0xE0) ? 'ole'
  : tem(h, 0x89, 0x50, 0x4E, 0x47) || tem(h, 0xFF, 0xD8, 0xFF) || tem(h, 0x47, 0x49, 0x46, 0x38) || tem(h, 0x42, 0x4D) || (tem(h, 0x52, 0x49, 0x46, 0x46) && tem(h.subarray(8), 0x57, 0x45, 0x42, 0x50)) || (tem(h.subarray(4), 0x66, 0x74, 0x79, 0x70) && /^(heic|heix|hevc|mif1|msf1|avif|heim|heis)/.test(txt(h.subarray(8, 12)))) ? 'img'
  : tem(h, 0x1F, 0x8B) ? 'gz' : tem(h, 0x52, 0x61, 0x72, 0x21) || tem(h, 0x37, 0x7A, 0xBC, 0xAF) ? 'arq' : 'outro';
// lê o índice do ZIP (sem o abrir): nomes, tamanhos e a taxa de compressão
const zipIndice = async f => { const n = f.size, t0 = Math.max(0, n - 65557), cauda = await ler(f, t0, n); let e = -1;
  for (let i = cauda.length - 22; i >= 0; i--) if (cauda[i] === 0x50 && cauda[i + 1] === 0x4B && cauda[i + 2] === 0x05 && cauda[i + 3] === 0x06) { e = i; break; }
  if (e < 0) return null; const dv = new DataView(cauda.buffer, cauda.byteOffset + e), tot = dv.getUint16(10, true), cdT = dv.getUint32(12, true), cdO = dv.getUint32(16, true);
  if (cdO + cdT > n || cdT > 64 * MB) return null; const cd = await ler(f, cdO, cdO + cdT), v = new DataView(cd.buffer, cd.byteOffset), L = []; let p = 0, comp = 0, real = 0;
  while (p + 46 <= cd.length && L.length < 50000) { if (v.getUint32(p, true) !== 0x02014B50) break; const c = v.getUint32(p + 20, true), u = v.getUint32(p + 24, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), kl = v.getUint16(p + 32, true);
    L.push(txt(cd.subarray(p + 46, p + 46 + nl))); comp += c; real += u; p += 46 + nl + xl + kl; }
  return { L, comp, real, tot }; };
const verificar = async (f, o = {}) => { const n = String(f && f.name || ''), r = (k, extra) => ({ ok: false, k, motivo: MOTIVO[k] + (extra || ''), nome: nome(n) });
  try {
    if (/[‪-‮⁦-⁩]/.test(n)) return r('nome');
    if (f.size > (o.max || 80 * MB)) return r('grande', ` (máximo ${Math.round((o.max || 80 * MB) / MB)} MB)`);
    if (PROG.test(n.trim().replace(/[.\s]+$/, ''))) return r(/\.(html?|xhtml)$/i.test(n) ? 'html' : 'prog');
    const h = await ler(f, 0, 64); let tipo = cabeca(h); const ext = (n.match(/\.([a-z0-9]{1,6})$/i) || [, ''])[1].toLowerCase();
    if (tipo === 'prog') return r('prog');
    const ini = txt(await ler(f, 0, Math.min(f.size, 65536)));
    if (ini.includes(EICAR)) return r('eicar');
    if (IMG_EXT.test(n) && tipo !== 'img') return r('disf');
    if (tipo !== 'pdf' && ini.slice(0, 1024).includes('%PDF-')) tipo = 'pdf'; // a norma deixa o cabeçalho do PDF em qualquer ponto do primeiro 1 KB
    if (ext === 'pdf' && tipo !== 'pdf') return r('disf');
    if (/^(xlsx|docx|pptx|zip|odt|ods|odp|epub)$/.test(ext) && tipo !== 'zip') return r('disf');
    if (TXT_EXT.test(n) && ['pdf', 'zip', 'ole', 'img', 'gz', 'arq'].includes(tipo)) return r('disf');
    // texto (CSV, JSON, SVG, HTML "xls" dos bancos): sem código lá dentro
    if (tipo === 'outro') { const s = ini.toLowerCase();
      if (/<svg[\s>]/.test(s) && /<script|\son[a-z]+\s*=|javascript:|<foreignobject|<iframe|<embed/.test(s)) return r('svg');
      if (/<(html|body|table|div)[\s>]/.test(s) && /<script|\son(load|error|click|mouseover)\s*=|javascript:|<iframe|<object|<embed/.test(s)) return r('html'); }
    // PDF: procura código e anexos nos dicionários (o conteúdo das páginas e imagens, entre stream e endstream, fica de fora)
    if (tipo === 'pdf') { const s = txt(await ler(f, 0, Math.min(f.size, 30 * MB))).replace(/stream\r?\n[\s\S]*?endstream/g, ' ');
      if (/\/(JavaScript|JS)\b|\/Launch\b|\/EmbeddedFile\b|\/RichMedia\b/.test(s)) return r('pdfjs'); }
    if (tipo === 'ole') { const s = txt(await ler(f, 0, Math.min(f.size, 20 * MB))); if (/_\x00V\x00B\x00A\x00_\x00P\x00R\x00O\x00J\x00E\x00C\x00T|M\x00a\x00c\x00r\x00o\x00s\x00\x00|V\x00B\x00A\x00\x00\x00/.test(s)) return r('macro'); }
    if (tipo === 'zip') { const z = await zipIndice(f);
      if (z) { if (z.L.length > 20000 || z.real > 1024 * MB || (z.real > 50 * MB && z.real / Math.max(1, z.comp) > 150)) return r('bomba');
        if (z.L.some(x => /(^|\/)vbaProject\.bin$/i.test(x))) return r('macro');
        if (z.L.some(x => /(^|\/)(classes\.dex|AndroidManifest\.xml)$/i.test(x) && /^(apk|zip)$/.test(ext))) return r('prog');
        if (z.L.some(x => PROGZ.test(x))) return r('zipprog'); } }
    return { ok: true, tipo, nome: nome(n) };
  } catch (e) { return { ok: true, tipo: 'desconhecido', nome: nome(n), aviso: 'não deu para ler tudo' }; } };
const verificarTodos = async (files, o) => { for (const f of files) { const x = await verificar(f, o); const S = st(); S.f++; if (!x.ok) { S.b++; S.h.unshift({ t: Date.now(), n: x.nome, m: x.motivo, k: x.k }); save(S); avisaSrv('f_' + x.k); return x; } save(S); } return { ok: true }; };
const alerta = x => { const UI = OS.UI, ok = x.k === 'eicar';
  if (!UI || !UI.modal) { alert('Antivírus do Prumo: "' + x.nome + '" foi bloqueado. ' + x.motivo); return; }
  UI.modal(`<div class="av-al ${ok ? 'teste' : ''}" role="alertdialog" aria-labelledby="avT"><div class="av-ic">${UI.ic('shield')}</div><h3 id="avT">${ok ? 'Teste bem-sucedido' : 'Ficheiro bloqueado'}</h3>
    <p><b>${ESC(x.nome)}</b></p><p>${x.motivo}</p><p class="mut">${ok ? 'O ficheiro de teste foi apanhado e não entrou na app.' : 'Não entrou na app nem foi enviado a lado nenhum. Se confias na origem, pede uma versão sem isto (por exemplo, o PDF ou o CSV normal).'}</p>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri" data-mclose>Percebi</button></div></div>`); };
// todas as caixas de ficheiros e tudo o que se larga na app passam por aqui antes de chegarem a qualquer parte do Prumo
const guarda = e => { const el = e.target; if (e.__avOk || !el || el.type !== 'file' || !el.files || !el.files.length) return;
  e.stopImmediatePropagation(); const files = Array.from(el.files);
  verificarTodos(files).then(x => { if (x.ok) { const ev = new Event('change', { bubbles: true }); ev.__avOk = true; el.dispatchEvent(ev); } else { try { el.value = ''; } catch (er) { } alerta(x); } }); };
window.addEventListener('change', guarda, true);
// caixas criadas na hora e fora da página (input.click()): a verificação fica presa na própria caixa, antes de qualquer outra
const clk = HTMLInputElement.prototype.click;
HTMLInputElement.prototype.click = function () { if (this.type === 'file' && !this.__avHook) { this.__avHook = 1; this.addEventListener('change', guarda, true); } return clk.apply(this, arguments); };
window.addEventListener('drop', e => { const dt = e.dataTransfer; if (e.__avOk || !dt || !dt.files || !dt.files.length) return; e.preventDefault(); e.stopImmediatePropagation();
  const files = Array.from(dt.files), alvo = e.target, x0 = e.clientX, y0 = e.clientY;
  verificarTodos(files).then(x => { if (!x.ok) return alerta(x); try { const d2 = new DataTransfer(); files.forEach(f => d2.items.add(f)); const ev = new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x0, clientY: y0, dataTransfer: d2 }); ev.__avOk = true; alvo.dispatchEvent(ev); } catch (er) { } }); }, true);

/* ---------- links ---------- */
const MARCAS = ['paypal', 'google', 'gmail', 'apple', 'icloud', 'microsoft', 'outlook', 'netflix', 'amazon', 'facebook', 'instagram', 'whatsapp', 'linkedin', 'nubank', 'itau', 'bradesco', 'santander', 'bancodobrasil', 'mercadopago', 'mercadolivre', 'millenniumbcp', 'cgd', 'novobanco', 'activobank', 'montepio', 'revolut', 'binance', 'coinbase', 'portaldasfinancas', 'mbway', 'multibanco', 'ctt', 'correios', 'dhl', 'fedex', 'spotify', 'stripe'];
const OFICIAL = { gmail: 'google', outlook: 'microsoft' };
const CURTOS = /^(bit\.ly|tinyurl\.com|goo\.gl|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rebrand\.ly|shorturl\.at|rb\.gy|tiny\.cc|s\.id|t\.ly|v\.gd|qr\.ae|bl\.ink|short\.io|encurtador\.com\.br|abre\.ai|l1nk\.dev|surl\.li|shorturl\.asia|clck\.ru)$/;
const TLD_RISCO = /\.(zip|mov|top|xyz|icu|click|gq|tk|ml|cf|ga|rest|country|work|loan|kim|cam|quest|cfd|sbs|bond|lol|mom|beauty|hair)$/;
const SUF2 = /\.(com|net|org|gov|edu|co|gob|nom)\.[a-z]{2}$/;
const raiz = h => { const p = h.split('.'); return SUF2.test(h) ? p.slice(-3).join('.') : p.slice(-2).join('.'); };
const lev1 = (a, b) => { if (Math.abs(a.length - b.length) > 1 || a === b) return false; let i = 0, j = 0, d = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } } return d + (a.length - i) + (b.length - j) === 1; };
const link = href => { const m = [], mp = []; let nivel = 'ok';
  const sobe = (nv, t) => { (nv === 'perigo' ? mp : m).push(t); if (nv === 'perigo' || (nv === 'aviso' && nivel === 'ok')) nivel = nv; };
  const bruto = String(href || '').trim().replace(/[\u0000-\u001f\u007f\s]+/g, '');
  if (/^(javascript|vbscript|data|file|blob):/i.test(bruto)) { sobe('perigo', 'Não é um site: é código ou um ficheiro escondido no link.'); return { nivel, motivos: mp.concat(m) }; }
  let u; try { u = new URL(bruto, location.href); } catch (e) { return { nivel: 'ok', motivos: [] }; }
  if (!/^https?:$/.test(u.protocol)) return { nivel: /^(mailto|tel|sms):$/.test(u.protocol) ? 'ok' : 'aviso', motivos: /^(mailto|tel|sms):$/.test(u.protocol) ? [] : ['Abre outra aplicação do aparelho.'] };
  if (u.origin === location.origin) return { nivel: 'ok', motivos: [] };
  const h = u.hostname.toLowerCase().replace(/\.$/, ''), rz = raiz(h), base = rz.split('.')[0];
  if (u.username || u.password) sobe('perigo', 'O endereço esconde o site verdadeiro atrás de um nome (truque do "@").');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':')) sobe('aviso', 'Vai para um número (IP) em vez do nome de um site.');
  if (/(^|\.)xn--/.test(h)) sobe('aviso', 'Usa letras de outros alfabetos que podem imitar um site conhecido.');
  if (CURTOS.test(h)) sobe('aviso', 'É um link encurtado: não se vê para onde vai.');
  if (TLD_RISCO.test(h)) sobe('aviso', 'Usa um final de endereço (.' + h.split('.').pop() + ') muito usado em burlas.');
  if (u.protocol === 'http:' && !/^(localhost|127\.0\.0\.1)$/.test(h)) sobe('aviso', 'A ligação não é segura (sem cadeado, http).');
  if (/\.(exe|scr|msi|apk|bat|cmd|vbs|js|jar|dmg|pkg|ps1|hta|lnk|iso)(\?|#|$)/i.test(u.pathname)) sobe('perigo', 'Descarrega um programa.');
  if (h.split('.').length > 5) sobe('aviso', 'O endereço tem demasiadas partes, um truque para esconder o site verdadeiro.');
  const troca = x => x.replace(/0/g, 'o').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/rn/g, 'm').replace(/vv/g, 'w'), norm = troca(h.replace(/1/g, 'l')), norm2 = troca(h.replace(/1/g, 'i'));
  for (const mk of MARCAS) { const of = OFICIAL[mk] || mk, dono = base === of || base === mk || rz.startsWith(of + '.') || rz.startsWith(mk + '.');
    if (dono) continue;
    if (!h.includes(mk) && mk.length >= 4 && (norm.includes(mk) || norm2.includes(mk))) { sobe('perigo', `Imita o nome "${mk}" trocando letras por números.`); break; }
    if (h.split('.').slice(0, -1).some(p => p === mk || p.startsWith(mk + '-') || p.endsWith('-' + mk))) { sobe('perigo', `Usa o nome "${mk}" mas o site é ${rz}.`); break; }
    if (base.length >= 5 && mk.length >= 5 && lev1(base, mk)) { sobe('aviso', `"${base}" parece "${mk}" com uma letra trocada.`); break; } }
  return { nivel, motivos: mp.concat(m), host: h }; };
const contaLink = r => { const S = st(); S.l++; if (r.nivel !== 'ok') { S.la++; S.h.unshift({ t: Date.now(), n: r.host || 'link', m: r.motivos[0], k: 'l_' + r.nivel }); avisaSrv('l_' + r.nivel); } save(S); };
const perguntaLink = (href, r) => { const UI = OS.UI, e = ESC;
  UI.modal(`<div class="av-al ${r.nivel}" role="alertdialog" aria-labelledby="avT"><div class="av-ic">${UI.ic('shield')}</div><h3 id="avT">${r.nivel === 'perigo' ? 'Este link parece perigoso' : 'Cuidado com este link'}</h3>
    <p class="av-url">${e(String(href).slice(0, 160))}</p><ul>${r.motivos.map(x => `<li>${e(x)}</li>`).join('')}</ul>
    <p class="mut">Se veio num e-mail ou mensagem a pedir dados, senhas ou pagamentos, o mais seguro é não abrir e ir ao site escrevendo o endereço tu mesmo.</p>
    <div class="row gap8" style="justify-content:flex-end;flex-wrap:wrap;margin-top:12px">${/^(javascript|vbscript|data|file|blob):/i.test(String(href).trim()) ? '' : `<button class="btn ghost" data-act="avAbrir" data-u="${e(href)}">Abrir mesmo assim</button>`}<button class="btn pri" data-mclose>Não abrir</button></div></div>`); };
OS.act = OS.act || {}; OS.act.avAbrir = b => { const u = b.dataset.u; OS.UI.closeModal && OS.UI.closeModal(); try { window.open(u, '_blank', 'noopener,noreferrer'); } catch (e) { } };
// cada link para fora da app é verificado no momento do toque; os seguros abrem logo, sem perguntas
window.addEventListener('click', e => { if (e.defaultPrevented || e.button) return; const a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a || a.dataset.av === '0') return;
  const href = a.getAttribute('href') || ''; if (a.hasAttribute('download') || /^blob:/i.test(href) || /^#/.test(href) || (!/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^\/\//.test(href))) return;
  const r = link(href); contaLink(r); if (r.nivel === 'ok') return; e.preventDefault(); e.stopImmediatePropagation(); perguntaLink(href, r); }, true);
// e-mails (HTML num iframe isolado, onde os toques não chegam à app): os links são verificados antes de o mostrar
const marcarHTML = html => { try { const d = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html'); let n = 0;
    d.querySelectorAll('a[href]').forEach(a => { const r = link(a.getAttribute('href')); if (r.nivel === 'ok') return; n++;
      const nota = d.createElement('small'); nota.setAttribute('style', 'display:inline-block;margin-left:4px;padding:0 5px;border-radius:4px;font:600 11px system-ui,sans-serif;' + (r.nivel === 'perigo' ? 'background:#fde2e2;color:#8a1010' : 'background:#fff1d6;color:#7a4b00'));
      nota.textContent = r.nivel === 'perigo' ? 'link bloqueado pelo antivírus: ' + r.motivos[0] : 'cuidado: ' + r.motivos[0];
      if (r.nivel === 'perigo') { a.removeAttribute('href'); a.setAttribute('style', (a.getAttribute('style') || '') + ';text-decoration:line-through;color:#8a1010;cursor:not-allowed'); a.setAttribute('title', r.motivos.join(' ')); }
      a.after(nota); });
    if (n) { const S = st(); S.l += n; S.la += n; save(S); }
    return d.body.innerHTML; } catch (e) { return html; } };
const testeEicar = () => verificarTodos([new File([EICAR], 'eicar-teste.txt', { type: 'text/plain' })]).then(x => { if (!x.ok) alerta(x); return x; });
OS.AV = { verificar, verificarTodos, link, marcarHTML, estado: st, testeEicar, EICAR_LEN: EICAR.length };
OS.act.avTeste = () => testeEicar().then(() => OS.request && OS.request());
/* ---------- Definições › Antivírus e proteção ---------- */
const pagina = () => { const UI = OS.UI, S = st(), e = ESC, dt = t => new Date(t).toLocaleString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const head = UI.head('Definições', 'O antivírus do Prumo e tudo o que protege os teus dados.', '', 'Sistema') + UI.tabs('definicoes', OS.SETT, 'protecao');
  const verifica = [['Programas escondidos', 'ficheiros do Windows, Mac, Linux e Android, mesmo com nome de foto ou PDF'], ['Ficheiros disfarçados', 'o nome diz uma coisa e o conteúdo é outra, ou a extensão está escondida (foto.jpg.exe)'], ['Macros do Office', 'folhas de cálculo e documentos com código escondido'], ['PDFs com código', 'PDFs que tentam correr código, abrir programas ou trazem ficheiros escondidos'], ['Imagens e páginas com código', 'SVG e HTML com scripts'], ['Bombas ZIP', 'ficheiros pequenos que rebentam para um tamanho enorme'], ['Links perigosos', 'nomes de bancos e lojas que não são deles, letras trocadas por números, links encurtados, endereços sem cadeado e programas para descarregar']];
  const resto = [['lock', 'Dados cifrados', 'a tua conta fica guardada com cifra AES-256 e uma chave só tua'], ['key', 'Cofre de senhas', 'a senha mestra nunca sai do teu aparelho; nem a administração o consegue abrir'], ['shield', 'Código malicioso nas páginas', 'tudo o que aparece no ecrã é limpo antes (e-mails, notícias, IA)'], ['user', 'Entrada protegida', 'código de acesso, conta trancada depois de várias tentativas erradas e sessões assinadas'], ['sync', 'Cópias de segurança', 'uma cópia por dia, guardada à parte'], ['bolt', 'Ataque de teste semanal', 'todos os domingos o Prumo ataca-se a si mesmo para encontrar falhas antes de outros']];
  return head + `<div class="set-page av-pg">
  <div class="pn av-hero"><div class="av-escudo" aria-hidden="true">${UI.ic('shield')}</div><div><h3>Antivírus ligado</h3><p class="mut" style="margin:4px 0 0">Cada ficheiro que importas e cada link que abres são verificados antes de chegarem ao Prumo. Tudo acontece neste aparelho: os ficheiros não são enviados a ninguém.</p></div></div>
  <div class="av-n"><div><b class="mono">${S.f}</b><span>ficheiros verificados</span></div><div><b class="mono">${S.b}</b><span>ficheiros bloqueados</span></div><div><b class="mono">${S.l}</b><span>links verificados</span></div><div><b class="mono">${S.la}</b><span>links com aviso</span></div></div>
  <div class="pn" data-open="1"><div class="pn-h"><h3>${UI.ic('shield')}Ameaças encontradas neste aparelho</h3>${S.h.length ? '<button class="btn xs ghost" data-act="avLimpar">Limpar a lista</button>' : ''}</div>
    ${S.h.length ? `<ul class="av-h">${S.h.map(x => `<li class="${x.k === 'eicar' ? 'pos' : x.k === 'l_aviso' ? 'warn' : 'neg'}"><b>${e(x.n)}</b><span>${e(x.m || '')}</span><small>${dt(x.t)}</small></li>`).join('')}</ul>` : '<p class="mut" style="margin:0">Nenhuma ameaça até agora.</p>'}
    <div class="row gap8" style="margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-act="avTeste">${UI.ic('shield')}Testar o antivírus</button><span class="mut" style="font-size:12.5px;align-self:center">Usa o ficheiro de teste EICAR, inofensivo, o mesmo que os antivírus usam para provar que funcionam.</span></div></div>
  <div class="pn" data-open="1"><div class="pn-h"><h3>O que é verificado</h3></div><ul class="av-l">${verifica.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ul></div>
  <div class="pn" data-open="1"><div class="pn-h"><h3>O resto da proteção do Prumo</h3></div><ul class="av-l av-ic2">${resto.map(([i, t, d]) => `<li>${UI.ic(i)}<b>${t}</b><span>${d}</span></li>`).join('')}</ul></div>
  <div class="pn av-nota" data-open="1"><div class="pn-h"><h3>E o telemóvel ou o computador?</h3></div><p style="margin:0 0 8px">O Prumo protege o que entra nele, mas não consegue examinar o aparelho inteiro: nenhuma app web ou de loja pode fazê-lo, e no iPhone essa permissão nem existe.</p>
    <ul class="av-l"><li><b>iPhone e Mac</b><span>mantém o sistema atualizado e instala apps só da App Store</span></li><li><b>Android</b><span>deixa o Google Play Protect ligado (Play Store › perfil › Play Protect)</span></li><li><b>Windows</b><span>o Microsoft Defender já vem incluído; confirma que está ligado em Segurança do Windows</span></li></ul></div>
</div>`; };
OS.on('ready', () => { if (OS.SETT && !OS.SETT.some(t => t[0] === 'protecao')) { const i = OS.SETT.findIndex(t => t[0] === 'legal'); OS.SETT.splice(i >= 0 ? i : OS.SETT.length, 0, ['protecao', 'Antivírus e proteção']); }
  const sv = OS.settingsView; if (sv && !sv.__av) { OS.settingsView = x => String(x || '') === 'protecao' ? pagina() : sv(x); Object.keys(sv).forEach(k => { if (!(k in OS.settingsView)) OS.settingsView[k] = sv[k]; }); OS.settingsView.__av = 1; } });
OS.act.avLimpar = () => { const S = st(); S.h = []; save(S); OS.request && OS.request(); };
})();
