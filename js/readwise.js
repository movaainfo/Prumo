/* PRUMO — Readwise (v3.71): traz os teus livros e destaques (Kindle, Apple Books, Kobo, Instapaper…) do Readwise para as Leituras.
   Cada destaque entra nas Citações do livro (com a página e a tua nota); livros que ainda não estão na estante são acrescentados.
   Importar outra vez só traz o que mudou desde a última vez e nunca duplica. A chave do Readwise fica só neste aparelho: o servidor
   do Prumo só a passa ao Readwise em cada importação (não a guarda). Para todas as contas com sessão iniciada. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc, K = 'os2rw';
const st = () => Object.assign({ tok: '', last: '', livros: 0, dest: 0, at: 0 }, U.ls.get(K, {}) || {});
const save = o => U.ls.set(K, Object.assign(st(), o));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
let BUSY = false, MSG = '';
const acha = L => { const B = OS.all('books'), t = norm(L.t), a = norm(L.a).split(' ')[0] || '';
  return B.find(b => b.rw === L.id) || B.find(b => norm(b.title) === t && (!a || !b.author || norm(b.author).includes(a))) || B.find(b => t.length > 12 && norm(b.title).startsWith(t.slice(0, 24))); };
// junta uma página de livros do Readwise às Leituras; devolve quantos livros novos e destaques novos
const juntar = livros => { let nl = 0, nd = 0; const hoje = U.today();
  livros.filter(L => L.cat === 'books' && L.t).forEach(L => { let b = acha(L);
    if (!b) { b = OS.add('books', { title: L.t, author: L.a || '', cover: L.capa || '', status: 'A ler', format: /kindle|apple|kobo|ebook|books/i.test(L.src) ? 'Ebook' : 'Físico', added: hoje, rw: L.id, own: 'Tenho' }); nl++; }
    const Q = (b.quotes || []).slice(), ids = new Set(Q.map(q => q.rw).filter(Boolean)), txt = new Set(Q.map(q => norm(q.t)));
    (L.d || []).forEach(h => { if (!h.t || ids.has(h.id) || txt.has(norm(h.t))) return; Q.push({ t: h.t, p: h.lt === 'page' && h.loc ? String(h.loc) : '', d: (h.at || '').slice(0, 10) || hoje, nota: h.n || '', rw: h.id }); ids.add(h.id); nd++; });
    const up = { rw: L.id }; if (Q.length !== (b.quotes || []).length) up.quotes = Q; if (!b.cover && L.capa) up.cover = L.capa; OS.upd('books', b.id, up); });
  return { nl, nd }; };
A.rwImport = async () => { const S = st(); if (!S.tok || BUSY) return; if (!(OS.Acc && OS.Acc.on)) { UI.toast('Inicia sessão na tua conta Prumo para importar do Readwise.', 'neg'); return; }
  BUSY = true; MSG = 'A importar…'; OS.request(); const inicio = new Date().toISOString(); let cursor = null, nl = 0, nd = 0, pag = 0;
  try { do { const j = await OS.Acc.call('readwise', { token: S.tok, cursor, desde: S.last || '' }); const r = juntar(j.livros || []); nl += r.nl; nd += r.nd; cursor = j.proximo; pag++; MSG = `A importar… ${nd} destaques`; OS.request(); } while (cursor && pag < 40);
    save({ last: inicio, livros: S.livros + nl, dest: S.dest + nd, at: Date.now() }); MSG = ''; UI.toast(nd || nl ? `Readwise: ${nl} livro${nl === 1 ? '' : 's'} novo${nl === 1 ? '' : 's'} e ${nd} destaque${nd === 1 ? '' : 's'} nas Leituras.` : 'Readwise: já estava tudo nas Leituras.', 'pos'); }
  catch (e) { MSG = ''; UI.toast(e.message || 'O Readwise não respondeu agora.', 'neg'); }
  BUSY = false; OS.request(); };
OS.forms = OS.forms || {};
OS.forms.rwLigar = async (f, v) => { const t = v('t').replace(/\s+/g, ''); if (!/^[A-Za-z0-9]{20,80}$/.test(t)) { UI.toast('Essa chave não parece a do Readwise. Copia-a em readwise.io/access_token.', 'neg'); return; }
  if (!(OS.Acc && OS.Acc.on)) { UI.toast('Inicia sessão na tua conta Prumo para ligar o Readwise.', 'neg'); return; }
  BUSY = true; MSG = 'A confirmar a chave…'; OS.request();
  try { const j = await OS.Acc.call('readwise', { token: t, teste: 1 }); BUSY = false; MSG = ''; if (!j.ok2) { UI.toast('O Readwise não aceitou a chave. Copia-a outra vez em readwise.io/access_token.', 'neg'); OS.request(); return; }
    save({ tok: t, last: '', livros: 0, dest: 0 }); UI.toast('Readwise ligado. A trazer os teus destaques…', 'pos'); A.rwImport(); }
  catch (e) { BUSY = false; MSG = ''; UI.toast(e.message || 'Não deu para confirmar a chave agora.', 'neg'); OS.request(); } };
A.rwDesligar = () => { if (!confirm('Desligar o Readwise deste aparelho? Os livros e destaques que já importaste ficam nas Leituras.')) return; U.ls.set(K, {}); OS.request(); };
const painel = () => { const S = st(), q = (OS.all('books') || []).reduce((n, b) => n + (b.quotes || []).filter(x => x.rw).length, 0);
  return `<div class="pn" id="rwPn"><div class="pn-h"><h3>${UI.ic('book')}Readwise</h3><span class="bdg ${S.tok ? 'pos' : ''}">${S.tok ? 'ligado' : 'desligado'}</span></div>
    ${S.tok ? `<p style="margin:0 0 8px">${q} destaques do Readwise nas tuas Leituras${S.at ? `; última importação ${esc(new Date(S.at).toLocaleString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}.</p>
      <div class="row gap8" style="flex-wrap:wrap"><button class="btn sm" data-act="rwImport"${BUSY ? ' disabled' : ''}>${UI.ic('sync')}${BUSY ? esc(MSG || 'A importar…') : 'Importar agora'}</button><a class="btn sm ghost" href="#leituras.resenhas">Ver as citações</a><button class="btn sm ghost" data-act="rwDesligar">Desligar</button></div>`
    : `<p class="mut" style="margin:0 0 10px">Traz os livros e os destaques que fazes no Kindle, Apple Books, Kobo e noutras apps (através do Readwise) para as tuas Leituras: cada destaque entra nas citações do livro, com a página e a tua nota.</p>
      <ol class="adm-steps"><li>Entra em <b>readwise.io/access_token</b> e carrega em <b>Get Access Token</b>.</li><li>Copia a chave e cola-a aqui.</li></ol>
      <form class="row gap8" data-form="rwLigar" autocomplete="off" style="flex-wrap:wrap"><input class="field grow" name="t" type="password" placeholder="Chave do Readwise" aria-label="Chave do Readwise" style="min-width:200px" required><button class="btn sm pri"${BUSY ? ' disabled' : ''}>${BUSY ? esc(MSG) : 'Ligar'}</button></form>
      <small class="mut">A chave fica só neste aparelho; o servidor do Prumo só a usa para falar com o Readwise quando importas.</small>`}</div>`; };
// Definições › Ligações › "Leitura": o painel do Readwise
OS.on('ready', () => { const sv = OS.settingsView; if (!sv || sv.__rw) return;
  OS.settingsView = x => { const h = sv(x); if (String(x || '') !== 'ligacoes') return h; const i = h.lastIndexOf('</div>'); return i > 0 ? h.slice(0, i) + `<h4 class="set-h">Leitura</h4>${painel()}` + h.slice(i) : h + painel(); };
  Object.keys(sv).forEach(k => { if (!(k in OS.settingsView)) OS.settingsView[k] = sv[k]; }); OS.settingsView.__rw = 1; });
OS.Readwise = { painel, juntar, estado: st };
})();
