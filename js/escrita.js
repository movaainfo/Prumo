/* PRUMO — Meus livros (v4.04), em Leituras, só na conta de administração.
   Um sítio para escrever e guardar os teus livros: cada livro com sinopse, meta de palavras e estado; capítulos com um editor
   que grava sozinho enquanto escreves (com a contagem de palavras); notas do livro (personagens, mundo, ideias); e exportar o
   livro inteiro em PDF ou texto. Fica na tua conta, cifrado e sincronizado como o resto; não vai para a IA. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const ON = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
const EST = ['Ideia', 'A escrever', 'Em revisão', 'Pronto', 'Publicado'];
const GEN = ['Romance', 'Ficção científica', 'Fantasia', 'Policial', 'Não ficção', 'Biografia', 'Autoajuda', 'Negócios', 'Poesia', 'Contos', 'Infantil', 'Outro'];
OS.ONE_DEF.escrita = { dias: {} };
const LV = () => U.sortBy(OS.all('mybooks'), b => -(b._u || 0)), CAPS = id => U.sortBy(OS.all('mychapters').filter(c => c.book === id), c => +c.ord || 0);
const palavras = t => (String(t || '').trim().match(/\S+/g) || []).length;
const totalLivro = id => CAPS(id).reduce((n, c) => n + (+c.words || 0), 0);
const st = () => OS.ui.esc || {}, set = o => OS.setUI('esc', Object.assign({}, st(), o));
const hojeP = () => (OS.one('escrita').dias || {})[U.today()] || 0;
const seguidos = () => { const D = OS.one('escrita').dias || {}; let n = 0, d = U.today(); if (!D[d]) d = U.addDays(d, -1); while (D[d] > 0) { n++; d = U.addDays(d, -1); } return n; };
/* ---------- as páginas ---------- */
const lista = () => { const L = LV();
  return `<div class="es"><div class="es-top"><div><b>${U.nf(hojeP())}</b><small>palavras hoje</small></div><div><b>${seguidos()}</b><small>${seguidos() === 1 ? 'dia seguido' : 'dias seguidos'} a escrever</small></div><div><b>${L.length}</b><small>${L.length === 1 ? 'livro' : 'livros'}</small></div><button class="btn pri" data-act="esNovo">${UI.ic('plus')}Novo livro</button></div>
    ${L.length ? `<div class="es-g">${L.map(b => { const w = totalLivro(b.id), meta = +b.meta || 0; return `<button type="button" class="es-c" data-act="esAbrir" data-id="${b.id}"><span class="es-cv" style="--c:${esc(b.cor || '#24527a')}"><b>${esc(b.title)}</b></span><span class="es-ci"><b>${esc(b.title)}</b><small>${esc(b.status || 'Ideia')}${b.genre ? ' · ' + esc(b.genre) : ''}</small><small>${U.nf(w)} palavras · ${CAPS(b.id).length} capítulos</small>${meta ? UI.bar(Math.min(1, w / meta), w >= meta ? 'pos' : '') : ''}</span></button>`; }).join('')}</div>`
      : UI.empty('Ainda não começaste nenhum livro. Cria o primeiro: o título pode mudar depois.', `<button class="btn pri" data-act="esNovo">${UI.ic('plus')}Começar um livro</button>`)}</div>`; };
const livro = b => { const s = st(), sec = s.sec || 'caps', C = CAPS(b.id), w = totalLivro(b.id), meta = +b.meta || 0;
  return `<div class="es"><div class="es-h"><button class="btn sm ghost" data-act="esVoltar">${UI.ic('left')}Os meus livros</button>
      <div class="es-ht"><h2>${esc(b.title)}</h2>${b.sub ? `<p class="mut">${esc(b.sub)}</p>` : ''}<p class="mut">${U.nf(w)} palavras${meta ? ' de ' + U.nf(meta) : ''} · ${C.length} capítulos</p>${meta ? UI.bar(Math.min(1, w / meta), w >= meta ? 'pos' : '') : ''}</div>
      <div class="row gap6"><select class="field" data-esest="${b.id}" aria-label="Estado do livro" style="width:auto">${EST.map(x => `<option ${x === (b.status || 'Ideia') ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="btn sm ghost" data-act="esEditar" data-id="${b.id}">Detalhes</button></div></div>
    <div class="tabs es-tabs">${[['caps', 'Capítulos'], ['notas', 'Notas'], ['exportar', 'Exportar']].map(([k, l]) => `<button type="button" class="tab ${sec === k ? 'on' : ''}" data-act="esSec" data-k="${k}">${l}</button>`).join('')}</div>
    ${sec === 'notas' ? `<p class="mut" style="font-size:.85rem">Personagens, lugares, a linha do tempo, ideias soltas. Grava sozinho.</p><textarea class="field es-nt" data-esnotas="${b.id}" data-keep="n${b.id}" rows="18" placeholder="Ex.: Personagens&#10;— Ana, 32 anos, faroleira…">${esc(b.notas || '')}</textarea>`
      : sec === 'exportar' ? `<div class="es-ex"><p>O livro inteiro, com os capítulos por ordem.</p><div class="row gap8" style="flex-wrap:wrap"><button class="btn pri" data-act="esPDF" data-id="${b.id}">${UI.ic('note')}Descarregar PDF</button><button class="btn" data-act="esTXT" data-id="${b.id}">Descarregar texto (.txt)</button><button class="btn" data-act="esMD" data-id="${b.id}">Descarregar Markdown (.md)</button></div>${b.sinopse ? `<h4>Sinopse</h4><p>${esc(b.sinopse)}</p>` : ''}<hr><button class="btn sm danger" data-act="esApagar" data-id="${b.id}">${UI.ic('trash')}Apagar este livro</button></div>`
      : `<div class="es-caps">${C.map((c, i) => `<div class="es-cap"><button type="button" class="es-cl" data-act="esCap" data-id="${c.id}"><span class="es-n">${i + 1}</span><span><b>${esc(c.title || 'Capítulo ' + (i + 1))}</b><small>${U.nf(+c.words || 0)} palavras${c._u ? ' · ' + U.fmtD(U.iso(new Date(c._u))) : ''}</small></span></button><div class="row gap4"><button class="icon-btn" data-act="esMover" data-id="${c.id}" data-d="-1" aria-label="Subir" ${i ? '' : 'disabled'}>${UI.ic('up')}</button><button class="icon-btn" data-act="esMover" data-id="${c.id}" data-d="1" aria-label="Descer" ${i < C.length - 1 ? '' : 'disabled'}>${UI.ic('down')}</button></div></div>`).join('') || '<p class="mut">Ainda sem capítulos.</p>'}
        <button class="btn" data-act="esNovoCap" data-id="${b.id}">${UI.ic('plus')}Novo capítulo</button></div>`}</div>`; };
const editor = (b, c) => { const i = CAPS(b.id).findIndex(x => x.id === c.id);
  return `<div class="es es-ed${st().foco ? ' foco' : ''}"><div class="es-eh"><button class="btn sm ghost" data-act="esFechaCap">${UI.ic('left')}${esc(b.title)}</button><span class="mut" id="esEstado">Guardado</span><span class="mono" id="esPal">${U.nf(+c.words || 0)} palavras</span>
      <button class="btn sm ghost" data-act="esFoco">${st().foco ? 'Sair do modo foco' : 'Modo foco'}</button><button class="btn sm ghost" data-act="esApagarCap" data-id="${c.id}">${UI.ic('trash')}</button></div>
    <input class="field es-tt" id="esTitulo" data-escap="${c.id}" data-keep="t${c.id}" value="${esc(c.title || '')}" placeholder="Capítulo ${i + 1}" aria-label="Título do capítulo">
    <textarea class="es-tx" id="esTexto" data-escap="${c.id}" data-keep="x${c.id}" placeholder="Começa a escrever…" aria-label="Texto do capítulo">${esc(c.text || '')}</textarea></div>`; };
// [data-keep]: a atualização silenciosa do app não toca nestes campos enquanto escreves (o cursor não salta)
const pagina = () => { if (!ON()) return UI.empty('Esta parte só existe na conta de administração.'); const s = st(), b = s.livro && OS.get('mybooks', s.livro), c = b && s.cap && OS.get('mychapters', s.cap);
  return c ? editor(b, c) : b ? livro(b) : lista(); };
/* ---------- gravar enquanto escreves ---------- */
let T = null;
const gravarCap = el => { const id = el.dataset.escap, c = OS.get('mychapters', id); if (!c) return; const e = document.getElementById('esEstado'); if (e) e.textContent = 'A guardar…';
  clearTimeout(T); T = setTimeout(() => { const tt = document.getElementById('esTitulo'), tx = document.getElementById('esTexto'); if (!tx) return; const w = palavras(tx.value), antes = +c.words || 0;
    OS.upd('mychapters', id, { title: tt ? tt.value.slice(0, 120) : c.title, text: tx.value, words: w }, { silent: true }); if (c.book) OS.upd('mybooks', c.book, {}, { silent: true });
    if (w > antes) { const E = OS.one('escrita'); E.dias = E.dias || {}; E.dias[U.today()] = (E.dias[U.today()] || 0) + (w - antes); Object.keys(E.dias).sort().slice(0, -400).forEach(k => delete E.dias[k]); OS.touchQuiet ? OS.touchQuiet('escrita') : OS.touch('escrita'); }
    const p = document.getElementById('esPal'); if (p) p.textContent = U.nf(w) + ' palavras'; const e2 = document.getElementById('esEstado'); if (e2) e2.textContent = 'Guardado'; }, 700); };
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.escap) gravarCap(el);
  if (el.dataset && el.dataset.esnotas) { const id = el.dataset.esnotas; clearTimeout(el._t); el._t = setTimeout(() => OS.upd('mybooks', id, { notas: el.value }, { silent: true }), 700); } });
document.addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.esest; if (id) OS.upd('mybooks', id, { status: e.target.value }); });
/* ---------- ações ---------- */
const formLivro = b => UI.modal(`<form class="es-f" onsubmit="return false"><div class="row between" style="align-items:center"><h3 style="margin:0">${b ? 'Detalhes do livro' : 'Novo livro'}</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
  <label>Título<input class="field" id="esFT" maxlength="120" value="${esc(b ? b.title : '')}" placeholder="O título (podes mudar depois)"></label><label>Subtítulo<input class="field" id="esFS" maxlength="160" value="${esc(b ? b.sub || '' : '')}"></label>
  <div class="row gap8"><label class="grow">Género<select class="field" id="esFG">${GEN.map(g => `<option ${b && b.genre === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label><label class="grow">Meta de palavras<input class="field" id="esFM" type="number" min="0" step="1000" value="${b ? b.meta || '' : 60000}"></label></div>
  <label>Sinopse<textarea class="field" id="esFP" rows="4" maxlength="3000">${esc(b ? b.sinopse || '' : '')}</textarea></label>
  <div class="row gap8"><button type="button" class="btn pri" data-act="esGuardarLivro" data-id="${b ? b.id : ''}">${b ? 'Guardar' : 'Criar o livro'}</button><button type="button" class="btn ghost" data-mclose>Cancelar</button></div></form>`, 'es-modal');
A.esNovo = () => formLivro(null);
A.esEditar = b => formLivro(OS.get('mybooks', b.dataset.id));
A.esGuardarLivro = b => { const t = document.getElementById('esFT').value.trim(); if (!t) return UI.toast('Dá um título ao livro (pode ser provisório).', 'warn');
  const o = { title: t.slice(0, 120), sub: document.getElementById('esFS').value.trim().slice(0, 160), genre: document.getElementById('esFG').value, meta: Math.max(0, Math.round(+document.getElementById('esFM').value || 0)), sinopse: document.getElementById('esFP').value.slice(0, 3000) };
  if (b.dataset.id) OS.upd('mybooks', b.dataset.id, o); else { const cores = ['#24527a', '#7b4fd6', '#9b1b30', '#2f7d5b', '#b4691f', '#3d5a80'], r = OS.add('mybooks', Object.assign(o, { status: 'Ideia', cor: cores[OS.all('mybooks').length % cores.length], notas: '' })); const c = OS.add('mychapters', { book: r.id, ord: 1, title: 'Capítulo 1', text: '', words: 0 }); set({ livro: r.id, cap: c.id, sec: 'caps' }); }
  UI.closeModal(); OS.request(); };
A.esAbrir = b => set({ livro: b.dataset.id, cap: '', sec: 'caps' });
A.esVoltar = () => set({ livro: '', cap: '' });
A.esSec = b => set({ sec: b.dataset.k });
A.esNovoCap = b => { const C = CAPS(b.dataset.id), c = OS.add('mychapters', { book: b.dataset.id, ord: (C.length ? +C[C.length - 1].ord || C.length : 0) + 1, title: 'Capítulo ' + (C.length + 1), text: '', words: 0 }); set({ cap: c.id }); };
A.esCap = b => set({ cap: b.dataset.id });
A.esFechaCap = () => { clearTimeout(T); const tx = document.getElementById('esTexto'); if (tx) { gravarCap(tx); } setTimeout(() => set({ cap: '', foco: 0 }), 750); };
A.esFoco = () => set({ foco: st().foco ? 0 : 1 });
A.esMover = b => { const c = OS.get('mychapters', b.dataset.id); if (!c) return; const C = CAPS(c.book), i = C.findIndex(x => x.id === c.id), j = i + (+b.dataset.d); if (j < 0 || j >= C.length) return; C.splice(j, 0, C.splice(i, 1)[0]); C.forEach((x, k) => OS.upd('mychapters', x.id, { ord: k + 1 }, { silent: true })); OS.request(); };
A.esApagarCap = b => { const c = OS.get('mychapters', b.dataset.id); if (!c || !confirm('Apagar o capítulo «' + (c.title || 'sem título') + '»? Não dá para desfazer.')) return; OS.del('mychapters', c.id); set({ cap: '' }); };
A.esApagar = b => { const l = OS.get('mybooks', b.dataset.id); if (!l || !confirm('Apagar o livro «' + l.title + '» e todos os capítulos? Não dá para desfazer.')) return; CAPS(l.id).forEach(c => OS.del('mychapters', c.id)); OS.del('mybooks', l.id); set({ livro: '', cap: '' }); };
/* ---------- exportar ---------- */
const baixar = (blob, nome) => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000); };
const nomeF = (b, ext) => String(b.title || 'livro').replace(/[\\/:*?"<>|]+/g, '').slice(0, 80) + '.' + ext;
const textoLivro = (b, md) => [md ? '# ' + b.title : b.title.toUpperCase(), b.sub || '', ''].concat(CAPS(b.id).map((c, i) => (md ? '## ' : '\n\n') + (c.title || 'Capítulo ' + (i + 1)) + '\n\n' + (c.text || ''))).join('\n');
A.esTXT = b => { const l = OS.get('mybooks', b.dataset.id); if (l) baixar(new Blob([textoLivro(l, false)], { type: 'text/plain;charset=utf-8' }), nomeF(l, 'txt')); };
A.esMD = b => { const l = OS.get('mybooks', b.dataset.id); if (l) baixar(new Blob([textoLivro(l, true)], { type: 'text/markdown;charset=utf-8' }), nomeF(l, 'md')); };
const carregarPDF = () => window.jspdf ? Promise.resolve(window.jspdf) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.onload = () => window.jspdf ? res(window.jspdf) : rej(new Error('Não deu para preparar o PDF.')); s.onerror = () => rej(new Error('Não deu para preparar o PDF (sem ligação?).')); document.head.appendChild(s); });
const pdfLivro = async l => { const J = (await carregarPDF()).jsPDF, doc = new J({ unit: 'mm', format: 'a5' }), W = 148, M = 18, info = (OS.Legal && OS.Legal.info) || {};
  doc.setFont('times', 'bold'); doc.setFontSize(22); doc.splitTextToSize(l.title, W - 2 * M).forEach((t, i) => doc.text(t, W / 2, 70 + i * 9, { align: 'center' }));
  if (l.sub) { doc.setFont('times', 'italic'); doc.setFontSize(12); doc.text(doc.splitTextToSize(l.sub, W - 2 * M), W / 2, 95, { align: 'center' }); }
  doc.setFont('times', 'normal'); doc.setFontSize(11); if (info.responsavel) doc.text(info.responsavel, W / 2, 180, { align: 'center' });
  CAPS(l.id).forEach((c, i) => { doc.addPage(); let y = 34; doc.setFont('times', 'bold'); doc.setFontSize(15); doc.splitTextToSize(c.title || 'Capítulo ' + (i + 1), W - 2 * M).forEach(t => { doc.text(t, W / 2, y, { align: 'center' }); y += 7; }); y += 6; doc.setFont('times', 'normal'); doc.setFontSize(11);
    String(c.text || '').split(/\n/).forEach(par => { doc.splitTextToSize(par || ' ', W - 2 * M).forEach(t => { if (y > 192) { doc.addPage(); y = 22; } doc.text(t, M, y); y += 5.4; }); y += 1.4; }); });
  const n = doc.getNumberOfPages(); for (let i = 2; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(130); doc.text(String(i - 1), W / 2, 203, { align: 'center' }); doc.setTextColor(0); }
  return doc; };
A.esPDF = async b => { const l = OS.get('mybooks', b.dataset.id); if (!l) return; b.disabled = true; try { baixar((await pdfLivro(l)).output('blob'), nomeF(l, 'pdf')); } catch (e) { UI.toast(e.message, 'neg'); } b.disabled = false; };
OS.Escrita = { pagina, on: ON, palavras, pdf: pdfLivro, texto: textoLivro };
})();
