/* PRUMO — Animes em comunidade (v3.75), na parceria Prumo & PHANTOM:
   · perfil dos animes, à parte do perfil do app: o mesmo nome, um @ (escolhido uma vez, não muda), uma foto e um fundo próprios.
     No menu do perfil (o círculo no topo) arrasta-se para o lado para o ver e editar;
   · comentários em cada anime: a IA barra ofensas e tapa os spoilers (só vê quem tocar), gostos nos comentários e no anime;
   · Comunidade: Indicações, Pedidos, Sugestões, Equipa PHANTOM (o nome do parceiro) e Recrutamento;
   · a primeira vez nos Animes: Competição (rankings, desafios e jogos) e/ou Diversão (jogar e interagir mesmo sem ver). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const SO = () => OS.Social || {};
const conta = () => !!(SO().conta && SO().conta());
const call = (op, b) => SO().call(op, b);
const euD = () => (SO()._S || {}).eu;
const hora = t => SO().hora ? SO().hora(t) : new Date(t).toTimeString().slice(0, 5);
const quando = t => { const d = Date.now() - t; return d < 6e4 ? 'agora' : d < 36e5 ? Math.floor(d / 6e4) + ' min' : d < 864e5 ? Math.floor(d / 36e5) + ' h' : new Date(t).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'short' }); };
if (!UI.IP.heart2) UI.IP.heart2 = 'M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20z';
if (!UI.IP.trophy) UI.IP.trophy = 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4';
if (!UI.IP.gamepad) UI.IP.gamepad = 'M7.5 7h9a5.5 5.5 0 0 1 5.4 6.6l-.7 3.4a2.4 2.4 0 0 1-4.2 1.1L15 16H9l-2 2.1A2.4 2.4 0 0 1 2.8 17l-.7-3.4A5.5 5.5 0 0 1 7.5 7zM7.5 10.5v4M5.5 12.5h4M15.5 11.5h.01M18 13.5h.01';
const COR = s => { let h = 0; for (const ch of String(s || '?')) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 55% 42%)`; };
// a foto do perfil dos animes (ou a inicial, numa cor do nome)
const av = (o, sz = 36) => o && o.av ? `<img class="ap-av" src="api/social?op=img&k=av&id=${encodeURIComponent(o.id || o.de)}&v=${o.av}" alt="" width="${sz}" height="${sz}" loading="lazy" style="width:${sz}px;height:${sz}px">`
  : `<span class="ap-av ap-av0" style="width:${sz}px;height:${sz}px;background:${COR((o && (o.user || o.nome)) || '?')};font-size:${Math.round(sz * .42)}px" aria-hidden="true">${esc(((o && o.nome) || '?').slice(0, 1).toUpperCase())}</span>`;
const nomeUser = o => `<b>${esc(o.nome || 'Pessoa')}</b>${o.user ? `<small>@${esc(o.user)}</small>` : ''}`;

/* ---------- o perfil dos animes ---------- */
const fundo = o => o && o.fu ? `background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.65)),url('api/social?op=img&k=fu&id=${encodeURIComponent(o.id)}&v=${o.fu}')` : '';
const cartao = (o, edita) => { if (!o) return `<div class="ap-card ap-ld"><span class="an-sp"></span></div>`;
  return `<div class="ap-card${o.fu ? ' com-fundo' : ''}" style="${fundo(o)}">${o.fu ? '' : '<img class="ap-ar" src="icons/phantom-aranha-olho.webp" alt="" aria-hidden="true">'}<span class="ap-mk">${SO().marca ? SO().marca('xs') : ''}</span>
    <div class="ap-who">${av(o, 64)}<div>${nomeUser(o)}${o.user ? '' : edita ? '<small class="ap-sem">Ainda sem @</small>' : ''}${o.cl ? `<em class="ap-cl">${esc(o.cl)}</em>` : ''}${o.pl && o.pl.n ? `<em class="ap-pl l${Math.min(9, +o.pl.lvl || 0)}" title="Plano do Prumo">${UI.ic('star')}${esc(o.pl.n === 'Grátis' ? 'Plano grátis' : o.pl.n === 'Administração' ? 'Administração' : 'Plano ' + o.pl.n)}</em>` : ''}</div></div>
    <div class="ap-st"><span><b>${o.pts || 0}</b>pontos</span>${o.pos ? `<span><b>${o.pos}.º</b>no ranking</span>` : ''}${o.clas != null ? `<span><b>${o.clas}</b>${o.clas === 1 ? 'clã' : 'clãs'}</span>` : ''}</div>
    ${edita ? `<button type="button" class="btn sm ap-ed" data-act="apEditar">${UI.ic('edit')}Editar o perfil</button>` : ''}</div>`; };
const meu = () => { const d = euD(); return d && d.eu ? Object.assign({ clas: (d.clas || []).length }, d.eu) : null; };
// editar: o @ (uma vez), a foto e o fundo
const reduz = (file, W, H, q, cobre) => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { const c = document.createElement('canvas'); let sw = im.width, sh = im.height, sx = 0, sy = 0;
    if (cobre) { const r = W / H; if (sw / sh > r) { sw = sh * r; sx = (im.width - sw) / 2; } else { sh = sw / r; sy = (im.height - sh) / 2; } c.width = W; c.height = H; } else { const k = Math.min(1, W / Math.max(sw, sh)); c.width = Math.round(sw * k); c.height = Math.round(sh * k); }
    c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', q).split(',')[1]); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Não deu para ler a imagem.')); }; im.src = u; });
A.apEditar = () => { if (A.accEdit) return A.accEdit(); const o = meu(); if (!o) { if (SO().eu) SO().eu(true); UI.toast('A abrir o teu perfil…'); return; }
  UI.modal(`<div class="ap-edit"><div class="row between" style="align-items:center"><h3 style="margin:0">Perfil dos animes</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <div id="apPrev">${cartao(o, false)}</div>
    <p class="mut" style="margin:0">O nome é o do teu perfil Prumo (<b>${esc(o.nome)}</b>). Aqui escolhes o @, a foto e o fundo que os outros veem nos rankings, nos clãs e nos comentários.</p>
    ${o.user ? `<div class="ap-f"><span>O teu @</span><b class="ap-at">${UI.ic('lock')}@${esc(o.user)}</b><small class="mut">O @ fica para sempre: não muda.</small></div>`
      : `<form class="ap-f" data-form="apUser" autocomplete="off"><span>Escolhe o teu @</span><div class="row gap6"><input class="field grow" name="u" maxlength="21" placeholder="@o_teu_nome" aria-label="O teu @" required pattern="@?[a-zA-Z0-9_.]{3,20}"><button class="btn pri">Guardar</button></div><small class="mut">3 a 20 letras, números, _ ou ponto. Depois de escolhido, não muda.</small></form>`}
    <div class="ap-f"><span>Foto</span><div class="row gap6" style="flex-wrap:wrap"><label class="btn sm">${UI.ic('image')}Escolher foto<input class="fo-file" type="file" accept="image/*" data-ap="av"></label>${o.av ? '<button type="button" class="btn sm ghost" data-act="apTirar" data-k="av">Tirar a foto</button>' : ''}</div></div>
    <div class="ap-f"><span>Fundo</span><div class="row gap6" style="flex-wrap:wrap"><label class="btn sm">${UI.ic('image')}Escolher fundo<input class="fo-file" type="file" accept="image/*" data-ap="fu"></label>${o.fu ? '<button type="button" class="btn sm ghost" data-act="apTirar" data-k="fu">Tirar o fundo</button>' : ''}</div></div>
    <p class="mut" style="margin:0;font-size:12.5px">${UI.ic('shield')}A IA verifica as imagens antes de aparecerem (nada de nudez, violência ou dados pessoais). Um GIF fica animado no Avançado e no Completo, ou desbloqueado com <a class="acc" href="#selos">Selos</a>.</p></div>`, 'ap-modal'); };
const atualiza = async () => { if (SO().eu) await SO().eu(true); const p = document.getElementById('apPrev'); if (p) p.innerHTML = cartao(meu(), false); const c = document.querySelector('.pf-car .ap-wrap'); if (c) c.innerHTML = cartao(meu(), true); OS.request(); };
OS.forms = OS.forms || {};
OS.forms.apUser = async (f, v) => { try { const j = await call('user', { user: v('u') }); UI.toast('O teu @ é @' + j.user + '.', 'pos'); await atualiza(); UI.closeModal && UI.closeModal(); } catch (e) { UI.toast(e.message, 'neg'); } };
A.apTirar = async b => { try { await call('perfilImg', { k: b.dataset.k, apagar: true }); await atualiza(); if (document.querySelector('#modal form.ac-edit')) { b.remove(); UI.toast('Fundo tirado.', 'pos'); } else A.apEditar(); } catch (e) { UI.toast(e.message, 'neg'); } };
document.addEventListener('change', async e => { const el = e.target; if (!el || !el.dataset || !el.dataset.ap || !el.files || !el.files[0]) return; const k = el.dataset.ap, f = el.files[0]; el.value = '';
  const parada = async () => { const b64 = k === 'av' ? await reduz(f, 320, 320, .82, true) : await reduz(f, 1200, 450, .8, true); await call('perfilImg', { k, b64 }); };
  try { let msg = k === 'av' ? 'Foto guardada.' : 'Fundo guardado.';
    // v3.89: um GIF fica animado (Avançado, Completo ou desbloqueado com Selos); a IA vê os quadros antes de aparecer
    if (/gif/i.test(f.type) && f.size <= (k === 'fu' ? 3e6 : 15e5)) { UI.toast('A IA está a verificar a animação…');
      try { await call('perfilImg', { k, b64: await gif64(f), gif: true }); msg = k === 'av' ? 'Foto animada guardada.' : 'Fundo animado guardado.'; }
      catch (er) { if (er.status !== 402) throw er; await parada(); msg = (k === 'av' ? 'Ficou a foto parada' : 'Ficou o fundo parado') + ': a animação vem com o Avançado e o Completo, ou desbloqueia-se com Selos.'; } }
    else { if (/gif/i.test(f.type)) UI.toast('O GIF é grande demais para ficar animado (máximo ' + (k === 'fu' ? '3' : '1,5') + ' MB): vai a imagem parada.'); else UI.toast(k === 'av' ? 'A enviar a foto…' : 'A enviar o fundo…'); await parada(); }
    UI.toast(msg, 'pos'); await atualiza(); if (!document.querySelector('#modal form.ac-edit')) A.apEditar(); } catch (er) { UI.toast(er.message, 'neg'); } });
const gif64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('Não deu para ler o GIF.')); r.readAsDataURL(f); });
// v3.82 · UM perfil só: no menu do perfil (o círculo do topo) um cartão com tudo — a foto, o nome, o @ (obrigatório), o fundo,
// a classe e o rank, os pontos, o lugar no ranking e os clãs. Editar abre um editor só (nome, @, foto, cor e fundo); a foto escolhida
// passa também para os rankings, clãs e comentários.
const umCartao = (h) => { const o = meu(), av0 = h.querySelector('.ac-av'), nome = (h.querySelector('b') || {}).textContent || '', mail = (h.querySelector('small') || {}).textContent || '';
  return `<div class="pf-one${o && o.fu ? ' com-fundo' : ''}" style="${fundo(o)}"><div class="pf-oh">${av0 ? av0.outerHTML : ''}<div><b>${esc(nome)}</b>${o && o.user ? `<span class="pf-at">@${esc(o.user)}</span>` : conta() ? `<button type="button" class="pf-sem" data-act="apUserPedir">Escolhe o teu @ (obrigatório)</button>` : ''}<small>${esc(mail)}</small>${o && o.cl ? `<span class="pf-cl">${esc(o.cl)}</span>` : ''}</div></div>
    ${o ? `<div class="pf-st"><span><b>${o.pts || 0}</b>pontos</span>${o.pos ? `<span><b>${o.pos}.º</b>no ranking</span>` : ''}<span><b>${o.clas || 0}</b>${o.clas === 1 ? 'clã' : 'clãs'}</span>${OS.Selos ? (OS.Selos.carregar(false), `<a class="pf-sl" href="#selos" data-mclose><b>${OS.Selos.ic(16)}${OS.Selos._S && !OS.Selos._S.d ? '…' : OS.Selos.saldo() === Infinity ? '∞' : Number(OS.Selos.saldo()).toLocaleString('pt-PT')}</b>Selos</a>`) : ''}</div>` : ''}</div>`; };
OS.on && OS.on('ready', () => { const am = A.accMenu; if (!am || am._ap) return; A.accMenu = () => { am(); const h = document.querySelector('#modal .ac-mh'); if (!h) return; if (conta() && SO().eu) SO().eu();
  const box = document.createElement('div'); box.className = 'pf-wrap'; box.innerHTML = umCartao(h); h.replaceWith(box); const it = document.querySelector('#modal [data-act=accEdit] small'); if (it) it.textContent = 'Nome, @, foto (tua, do Dominus ou de anime), cor e fundo';
  const espera = setInterval(() => { if (!document.body.contains(box)) return clearInterval(espera); if (meu()) { box.innerHTML = umCartao(Object.assign(document.createElement('div'), { innerHTML: `<div>${(box.querySelector('.ac-av') || {}).outerHTML || ''}<b>${esc((box.querySelector('.pf-oh b') || {}).textContent || '')}</b><small>${esc((box.querySelector('.pf-oh small') || {}).textContent || '')}</small></div>` }).firstChild); clearInterval(espera); } }, 400); };
  A.accMenu._ap = 1;
  // o editor do perfil passa a ter tudo: o @ (obrigatório; escolhido uma vez) e o fundo do perfil
  const ae = A.accEdit; if (ae && !ae._ap) { A.accEdit = () => { ae(); const f = document.querySelector('#modal form.ac-edit'); if (!f || !conta()) return; if (SO().eu && !meu()) SO().eu().then(() => extra(f)).catch(() => { }); extra(f); }; A.accEdit._ap = 1; }
  const ap = OS.forms.accProf; if (ap && !ap._ap) { OS.forms.accProf = async (f, v) => { const o = meu(), at = f.elements.user ? String(f.elements.user.value || '').replace(/^@/, '').trim() : '';
      const semAt = conta() && o && !o.user && !/^[a-zA-Z0-9_.]{3,20}$/.test(at);   // guarda o resto na mesma; o @ continua a ser pedido
      const antes = (OS.Acc && OS.Acc.prof && OS.Acc.prof() || {}).img || '', pr = ap(f, v);   // o original lê o formulário já (antes de ele ser limpo)
      if (conta() && o && !o.user && at && !semAt) { try { await call('user', { user: at }); UI.toast('O teu @ é @' + at + '.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); setTimeout(A.apUserPedir, 900); } }
      else if (semAt) setTimeout(() => UI.toast('Perfil guardado. Falta o teu @ (obrigatório): no menu do perfil, toca em «Escolhe o teu @».', 'warn'), 1200);
      await pr; const depois = (OS.Acc && OS.Acc.prof && OS.Acc.prof() || {}).img || '';
      if (conta() && depois !== antes) { try { if (depois) await call('perfilImg', { k: 'av', b64: await jpeg(depois) }); else if (o && o.av) await call('perfilImg', { k: 'av', apagar: true }); } catch (e) { UI.toast('A foto ficou no perfil, mas os rankings ainda mostram a antiga: ' + e.message, 'warn'); } }
      if (conta() && SO().eu) SO().eu(true).then(() => OS.request()).catch(() => { }); }; OS.forms.accProf._ap = 1; } });
// a foto do perfil (PNG ou JPEG em data URL) em JPEG para os rankings
const jpeg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 320; const g = c.getContext('2d'); g.fillStyle = '#1b1727'; g.fillRect(0, 0, 320, 320); g.imageSmoothingEnabled = !/^data:image\/png/.test(src); g.drawImage(im, 0, 0, 320, 320); res(c.toDataURL('image/jpeg', .85).split(',')[1]); }; im.onerror = () => rej(new Error('imagem inválida')); im.src = src; });
const extra = f => { if (f.querySelector('.ac-at')) return; const o = meu(); const nm = f.querySelector('label.ac-f'); if (!nm) return;
  const d = document.createElement('div'); d.className = 'ac-f ac-at'; d.innerHTML = o && o.user ? `<span>O teu @</span><span class="ac-atl">${UI.ic('lock')}@${esc(o.user)}</span><small>O @ fica para sempre.</small>`
    : `<span>O teu @ <b style="color:#E8A6AE">(obrigatório)</b></span><input name="user" type="text" maxlength="21" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@o_teu_nome" pattern="@?[a-zA-Z0-9_.]{3,20}"><small>3 a 20 letras, números, _ ou ponto. Escolhes uma vez e fica para sempre: é como te encontram nos rankings, clãs e comentários.</small>`;
  nm.after(d);
  const fu = document.createElement('div'); fu.className = 'ac-f'; fu.innerHTML = `<span>Fundo do perfil</span><div class="row gap6" style="flex-wrap:wrap"><label class="ac-btn ghost sm">${UI.ic('image')}Escolher fundo<input class="fo-file" type="file" accept="image/*" data-ap="fu"></label>${o && o.fu ? '<button type="button" class="ac-link" data-act="apTirar" data-k="fu">Tirar o fundo</button>' : ''}</div><small class="mut" style="font-size:12px">${UI.ic('shield')}A IA verifica as imagens antes de aparecerem.</small>`;
  const ave = f.querySelector('.ac-ave'); (ave || d).after(fu); };
A.apUserPedir = () => { if (A.accEdit) A.accEdit(); setTimeout(() => { const i = document.querySelector('#modal form.ac-edit [name=user]'); if (i) i.focus(); }, 300); };
// o @ é obrigatório: quem ainda não tem, é lembrado ao abrir o app (uma vez por sessão)
OS.on && OS.on('ready', () => setTimeout(async () => { try { if (!conta() || sessionStorage.getItem('oc_at_pedido') || window.__noAsk || (navigator.webdriver && !window.__atAsk)) return; if (SO().eu) await SO().eu(); const o = meu(); if (!o || o.user) return; sessionStorage.setItem('oc_at_pedido', '1');
  UI.modal(`<div class="ap-edit"><h3 style="margin:0">Escolhe o teu @</h3><p class="mut" style="margin:0">O teu perfil agora é um só, com a foto, o fundo, a tua classe e os teus pontos. Falta o @: é obrigatório e é como te encontram nos rankings, nos clãs e nos comentários.</p>
    <form class="ap-f" data-form="apUser" autocomplete="off"><div class="row gap6"><input class="field grow" name="u" maxlength="21" placeholder="@o_teu_nome" aria-label="O teu @" required pattern="@?[a-zA-Z0-9_.]{3,20}"><button class="btn pri">Guardar</button></div><small class="mut">3 a 20 letras, números, _ ou ponto. Depois de escolhido, não muda.</small></form></div>`, 'ap-modal'); } catch (e) { } }, 4500));
// a página "O meu perfil" nos Animes
const MODOS = [['competicao', 'Competição', 'trophy', 'Participar de rankings, desafios e jogos.'], ['diversao', 'Diversão', 'gamepad', 'Jogar, explorar funcionalidades e interagir mesmo sem assistir a conteúdos.']];
const modos = () => U.ls.get('oc_an_modos', null);
const modosHTML = (sel, acao) => `<div class="ap-modos" role="group" aria-label="Como queres usar os Animes">${MODOS.map(([k, n, ic, d]) => `<button type="button" class="ap-modo${(sel || []).includes(k) ? ' on' : ''}" data-act="${acao}" data-k="${k}" aria-pressed="${(sel || []).includes(k)}"><b>${UI.ic(ic)}${n}</b><span>${d}</span><i aria-hidden="true">${UI.ic('check')}</i></button>`).join('')}</div>`;
A.apSinoTira = b => { const al = +b.dataset.al || 0, mal = +b.dataset.mal || 0, L = ((OS.one('animeavisos') || {}).L || []).filter(a => !((al && a.al === al) || (mal && a.mal === mal))); OS.setOne('animeavisos', { L }); OS.request(); };
const pushAn = () => { try { if (OS.Push && OS.Push.sync) OS.Push.sync('an'); } catch (e) { } };   // o Pursuit avisa quem tem a Competição
A.apModo = b => { const m = new Set(modos() || []); if (m.has(b.dataset.k)) m.delete(b.dataset.k); else m.add(b.dataset.k); U.ls.set('oc_an_modos', [...m]); pushAn(); OS.request(); };
const perfil = () => { if (!conta()) return `<div class="so-vazio"><b>Entra na tua conta Prumo</b><p>O perfil dos animes, os comentários e a comunidade precisam de uma conta.</p></div>`; if (SO().eu) SO().eu();
  const avs = OS.Animes && OS.Animes.avisos ? OS.Animes.avisos() : [];
  const avH = `<div class="so-sec"><h3>Avisos de episódios novos</h3>${avs.length ? `<ul class="ap-avs">${avs.map(a => `<li>${a.img ? `<img src="${esc(a.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<b>${esc(a.t)}</b><button type="button" class="btn sm" data-act="apSinoTira" data-al="${+a.al || 0}" data-mal="${+a.mal || 0}">Tirar</button></li>`).join('')}</ul>` : '<p class="mut" style="margin:0">Abre um anime que ainda está a sair e toca no sino para seres avisado quando sair cada episódio.</p>'}</div>`;
  return `<section class="hu">${cartao(meu(), true)}${OS.AnimeRecap ? OS.AnimeRecap.bloco() : ''}<div class="so-sec"><h3>Como usas os Animes</h3>${modosHTML(modos() || [], 'apModo')}</div>${avH}<p class="mut">O teu perfil Prumo (o do resto do app) fica à parte: aqui só aparecem o nome, o @, a foto e o fundo.</p></section>`; };

/* ---------- a primeira vez nos Animes: Competição e/ou Diversão ---------- */
let ESC = null; A.apEsc = b => { ESC = ESC || []; const i = ESC.indexOf(b.dataset.k); if (i >= 0) ESC.splice(i, 1); else ESC.push(b.dataset.k); OS.request(); };
A.apEscOk = () => { U.ls.set('oc_an_modos', ESC && ESC.length ? ESC : ['competicao', 'diversao']); ESC = null; pushAn(); OS.request(); };
const boasVindas = () => `<section class="ap-bv"><span class="ap-bvm">${SO().marca ? SO().marca('sm') : ''}</span><h2>Como queres usar os Animes?</h2><p>Escolhe uma ou as duas. Podes mudar quando quiseres em O meu perfil.</p>${modosHTML(ESC || [], 'apEsc')}<button type="button" class="btn an-cta" data-act="apEscOk">${ESC && ESC.length ? 'Continuar' : 'Quero as duas'}</button></section>`;
// destaque no início dos Animes, conforme o modo
const destaque = () => { const m = modos() || []; if (!m.length) return ''; const L = [];
  if (m.includes('competicao')) L.push(`<a class="ap-dq" href="#animes.pursuit"><b>${UI.ic('trophy')}Pursuit de hoje</b><span>Às 20h saem as pistas. Quem acerta primeiro ganha mais.</span></a><a class="ap-dq" href="#animes.ranking"><b>${UI.ic('award')}Ranking de animes</b><span>Os pontos de todos os jogos.</span></a>`);
  if (m.includes('diversao')) L.push(`<a class="ap-dq" href="#animes.comunidade"><b>${UI.ic('users')}Comunidade</b><span>Indicações, pedidos, sugestões e a equipa.</span></a><a class="ap-dq" href="#animes.clas"><b>${UI.ic('chat')}Clãs e conversas</b><span>Joga e conversa em grupo.</span></a>`);
  return `<div class="ap-dqs">${L.join('')}</div>`; };
// v3.78: a assinatura da parceria no fim de cada página dos Animes
const assina = h => { const P = OS.Parceria, i = h.lastIndexOf('</div>'); return P && i > 0 ? h.slice(0, i) + P.assinatura() + h.slice(i) : h; };
OS.on && OS.on('ready', () => { const v = OS.views.animes; if (!v || v._ap) return; OS.views.animes = sub => { const h = v(sub); if (sub || !conta()) return assina(h);
    // v3.77: os cartões vão por baixo do destaque (o carrossel fica no topo, como antes, e nada fica debaixo do relógio)
    const i = h.indexOf('<div class="an-pad">'); if (i < 0) return assina(h); const extra = modos() ? destaque() : boasVindas(), j = i + 20; return assina(h.slice(0, j) + extra + h.slice(j)); }; OS.views.animes._ap = 1; });

/* ---------- comentários em cada anime ---------- */
const CM = {}, VER = new Set(); let DR = '';
const carregaC = async (mal, forcar) => { const c = CM[mal]; if (c && (c.busy || (!forcar && Date.now() - c.at < 30e3))) return; CM[mal] = Object.assign(c || {}, { busy: 1 });
  try { Object.assign(CM[mal], await call('comentarios', { mal }), { err: '' }); } catch (e) { CM[mal].err = e.message; } CM[mal].at = Date.now(); CM[mal].busy = 0; OS.request(); };
const comHTML = (x, mal) => `<li class="cm${x.sp && !VER.has(x.id) ? ' sp' : ''}"><button type="button" class="cm-av" data-act="apVerPerfil" data-id="${esc(x.de)}" aria-label="Perfil de ${esc(x.nome)}">${av(x, 36)}</button><div class="cm-b"><div class="cm-h">${nomeUser(x)}<time>${quando(x.at)}</time></div>
    ${x.sp && !VER.has(x.id) ? `<button type="button" class="cm-spb" data-act="cmVer" data-id="${esc(x.id)}">${UI.ic('eye')}Spoiler tapado pela IA. Toca para ver.</button>` : `<p>${esc(x.t)}</p>${x.sp ? '<small class="cm-spt">Spoiler</small>' : ''}`}
    <div class="cm-a"><button type="button" class="cm-g${x.gostei ? ' on' : ''}" data-act="cmGosto" data-mal="${mal}" data-id="${esc(x.id)}" aria-pressed="${!!x.gostei}" aria-label="Gostar">${UI.ic('heart2')}${x.gostos || ''}</button>
      ${x.meu ? `<button type="button" class="cm-l" data-act="cmApagar" data-mal="${mal}" data-id="${esc(x.id)}">Apagar</button>` : `<button type="button" class="cm-l" data-act="cmDen" data-mal="${mal}" data-id="${esc(x.id)}">Denunciar</button>`}</div></div></li>`;
const comentarios = x => { const mal = String((x && x.mal) || ''); if (!mal) return ''; if (!conta()) return `<section class="cm-s"><h3>Comentários</h3><p class="mut">Entra na tua conta Prumo para ler e escrever comentários.</p></section>`; carregaC(mal); const c = CM[mal];
  return `<section class="cm-s" id="cmS"><div class="an-rh"><h3>Comentários${c && c.n ? ` <small>${c.n}</small>` : ''}</h3><button type="button" class="btn sm an-ghost cm-ga${c && c.gostei ? ' on' : ''}" data-act="cmAnime" data-mal="${mal}" aria-pressed="${!!(c && c.gostei)}">${UI.ic('heart2')}${c && c.gostos ? c.gostos : ''} Gosto</button></div>
    <form class="cm-f" data-form="cmEnviar" data-mal="${mal}" data-t="${esc(x.t || '')}" autocomplete="off"><input class="field grow" id="cmTxt" name="t" maxlength="800" placeholder="O que achaste deste anime?" aria-label="Escrever um comentário" value="${esc(DR)}"><button class="btn an-cta">Comentar</button></form>
    <p class="cm-n">${UI.ic('shield')}A IA tapa os spoilers (só vê quem tocar) e barra as ofensas.</p>
    ${!c ? '<div class="an-ld"><span class="an-sp"></span>A abrir os comentários…</div>' : c.err ? `<p class="so-err">${esc(c.err)}</p>` : (c.coms || []).length ? `<ul class="cm-l0">${c.coms.map(y => comHTML(y, mal)).join('')}</ul>` : '<p class="mut">Ainda ninguém comentou. Sê o primeiro.</p>'}</section>`; };
document.addEventListener('input', e => { if (e.target && e.target.id === 'cmTxt') DR = e.target.value; });
OS.forms.cmEnviar = async (f, v) => { const t = v('t'), mal = f.dataset.mal; if (!t) return; const bt = f.querySelector('button'); if (bt) bt.disabled = true;
  try { const j = await call('comentar', { mal, texto: t, titulo: f.dataset.t }); if (j.barrada) UI.toast('O comentário não foi publicado: ' + j.motivo, 'neg');
    else { DR = ''; const c = CM[mal] || (CM[mal] = { coms: [] }); c.coms = [j.com].concat(c.coms || []); c.n = (c.n || 0) + 1; UI.toast(j.com.sp ? 'Publicado. A IA viu um spoiler e tapou-o para quem ainda não viu.' : 'Comentário publicado.', 'pos'); } }
  catch (e) { UI.toast(e.message, 'neg'); } if (bt) bt.disabled = false; OS.request(); };
A.cmVer = b => { VER.add(b.dataset.id); OS.request(); };
A.cmGosto = async b => { const mal = b.dataset.mal, c = CM[mal]; try { const j = await call('gostarCom', { mal, id: b.dataset.id }); if (c) c.coms = c.coms.map(x => x.id === j.com.id ? j.com : x); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
A.cmAnime = async b => { const mal = b.dataset.mal; try { const j = await call('gostarAnime', { mal }); Object.assign(CM[mal] || (CM[mal] = {}), j); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
A.cmApagar = async b => { if (!confirm('Apagar o teu comentário?')) return; const mal = b.dataset.mal; try { await call('apagarCom', { mal, id: b.dataset.id }); const c = CM[mal]; if (c) { c.coms = c.coms.filter(x => x.id !== b.dataset.id); c.n = Math.max(0, (c.n || 1) - 1); } OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
A.cmDen = async b => { const m = prompt('Denunciar este comentário? Diz porquê (opcional):', ''); if (m == null) return; try { await call('denunciarCom', { mal: b.dataset.mal, id: b.dataset.id, motivo: m }); UI.toast('Denúncia enviada. A equipa vai ver.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } };
// tocar na foto de alguém: o perfil dos animes dessa pessoa
A.apVerPerfil = async (b, e) => { if (e && e.preventDefault) e.preventDefault(); try { const j = await call('verPerfil', { id: b.dataset.id }), pf = j.perfil, A0 = OS.Trofeus && OS.Trofeus.art;
    const med = (pf.med || []).length && A0 ? `<div class="ap-med"><small>${pf.nmed} ${pf.nmed === 1 ? 'conquista' : 'conquistas'} no Prumo</small><div>${pf.med.map(m => `<span title="${esc(m.n + (m.d ? ' · ' + m.d : ''))}">${A0({ kind: m.kind === 'Medalha' ? 'Medalha' : m.kind === 'Distinção' ? 'Distinção' : 'Troféu', level: m.lvl, cat: m.cat, place: m.lugar || 0 })}<i>${esc(m.n)}</i></span>`).join('')}</div></div>` : '';
    UI.modal(`<div class="ap-edit">${pf.meu ? '<p class="ap-vista">Assim é que os outros veem o teu perfil.</p>' : ''}${cartao(pf, false)}${med}<div class="row gap8">${pf.meu ? `<button type="button" class="btn pri" data-act="apEditar">${UI.ic('edit')}Editar o perfil</button>` : ''}<button type="button" class="btn" data-mclose>Fechar</button></div></div>`, 'ap-modal'); } catch (er) { UI.toast(er.message, 'neg'); } };
// v3.93: ver o meu perfil como os outros o veem (no menu do perfil)
A.apVerMeu = (b, e) => { try { UI.closeModal && UI.closeModal(); } catch (er) { } return A.apVerPerfil({ dataset: { id: 'eu' } }, e); };

/* ---------- Comunidade ---------- */
const pn = () => (SO().nome ? SO().nome() : 'PHANTOM') || 'PHANTOM';   // v3.88: a equipa é a do parceiro (Equipa PHANTOM), já não "Equipa SA"
const COM = [['indicacoes', 'Indicações', 'Recomendar conteúdos'], ['pedidos', 'Pedidos', 'Solicitar conteúdos'], ['sugestoes', 'Sugestões', 'Enviar ideias para o app'], ['equipa', 'Equipa PHANTOM', 'Conhecer a equipa'], ['recrutamento', 'Recrutamento', 'Participar da equipa']];
const CS = { ind: null, eq: null, at: 0 };
const carregaCom = async forcar => { if (CS.busy || (!forcar && Date.now() - CS.at < 60e3)) return; CS.busy = 1; try { const [a, b] = await Promise.all([call('indicacoes', {}), call('equipa', {})]); CS.ind = a.L; CS.eq = b.equipa; CS.err = ''; } catch (e) { CS.err = e.message; } CS.at = Date.now(); CS.busy = 0; OS.request(); };
const adm = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
const comunidade = () => { if (!conta()) return `<div class="so-vazio"><b>Entra na tua conta Prumo</b><p>A comunidade precisa de uma conta.</p></div>`; carregaCom(); const t = OS.ui.comT || '';
  const topo = `<header class="hu-h">${SO().marca ? SO().marca('sm') : ''}<h2>Comunidade</h2><p>Recomenda animes, pede conteúdos, manda ideias, conhece a equipa da ${esc(pn())} e candidata-te para fazer parte dela.</p></header>`;
  if (!t) return `<section class="hu">${topo}<nav class="cu-l">${COM.map(([k, n, d]) => `<button type="button" class="cu-i" data-act="cuAbrir" data-k="${k}"><b>${k === 'equipa' ? 'Equipa ' + esc(pn()) : n}</b><span>${d}</span>${UI.ic('right')}</button>`).join('')}</nav>${adm() ? `<details class="pn cu-adm"><summary><b>Administração da comunidade</b></summary><div class="row gap6" style="flex-wrap:wrap;margin-top:8px">${[['pedido', 'Pedidos'], ['sugestao', 'Sugestões'], ['recrutamento', 'Candidaturas'], ['indicacao', 'Indicações']].map(([k, n]) => `<button class="btn sm" data-act="cuAdm" data-k="${k}">${n}</button>`).join('')}<button class="btn sm" data-act="cuEquipa">Editar a equipa</button></div><div id="cuAdmL"></div></details>` : ''}</section>`;
  const vol = `<button type="button" class="btn sm an-ghost" data-act="cuAbrir" data-k="">${UI.ic('left')}Comunidade</button>`, D = COM.find(x => x[0] === t) || COM[0];
  if (t === 'indicacoes') return `<section class="hu">${vol}<h2>Indicações</h2><p class="mut">Recomenda um anime à comunidade e diz porquê. As indicações de todos aparecem aqui.</p>
    <form class="so-f" data-form="cuEnviar" data-tipo="indicacao" autocomplete="off"><input class="field" name="titulo" maxlength="100" placeholder="Nome do anime" aria-label="Nome do anime" required><textarea class="field" name="texto" maxlength="600" rows="2" placeholder="Porque recomendas? (sem spoilers)" aria-label="Porque recomendas"></textarea><button class="btn an-cta">Recomendar</button></form>
    ${CS.ind ? CS.ind.length ? `<ul class="cu-ind">${CS.ind.map(x => `<li><div><b>${esc(x.titulo)}</b>${x.texto ? `<p>${esc(x.texto)}</p>` : ''}<small>${esc(x.nome)}${x.user ? ' · @' + esc(x.user) : ''} · ${quando(x.at)}</small></div><button type="button" class="cm-g${x.gostei ? ' on' : ''}" data-act="cuGosto" data-id="${esc(x.id)}" aria-pressed="${!!x.gostei}" aria-label="Gostar">${UI.ic('heart2')}${x.gostos || ''}</button></li>`).join('')}</ul>` : '<p class="mut">Ainda não há indicações. Sê o primeiro.</p>' : '<div class="an-ld"><span class="an-sp"></span>A abrir…</div>'}</section>`;
  if (t === 'equipa') return `<section class="hu">${vol}<h2>Equipa ${esc(pn())}</h2><p class="mut">Quem faz os Animes com a ${esc(pn())}.</p>${CS.eq ? CS.eq.length ? `<ul class="cu-eq">${CS.eq.map(x => `<li>${av({ nome: x.nome, user: x.user }, 52)}<div><b>${esc(x.nome)}</b>${x.user ? `<small>@${esc(x.user)}</small>` : ''}<span>${esc(x.papel)}</span>${x.desc ? `<p>${esc(x.desc)}</p>` : ''}</div></li>`).join('')}</ul>` : '<p class="mut">A equipa vai aparecer aqui em breve.</p>' : '<div class="an-ld"><span class="an-sp"></span>A abrir…</div>'}<button type="button" class="btn an-ghost" data-act="cuAbrir" data-k="recrutamento">Quero fazer parte da equipa</button></section>`;
  const tipo = { pedidos: 'pedido', sugestoes: 'sugestao', recrutamento: 'recrutamento' }[t], txt = { pedido: ['O que gostavas de ver nos Animes? Um anime, uma temporada, notícias, um jogo…', 'Enviar pedido'], sugestao: ['A tua ideia para melhorar o app.', 'Enviar sugestão'], recrutamento: ['Conta-nos o que sabes fazer (escrever, desenhar, moderar, traduzir, programar…) e porque queres entrar. A equipa responde para o e-mail da tua conta.', 'Candidatar-me'] }[tipo];
  return `<section class="hu">${vol}<h2>${D[1]}</h2><p class="mut">${D[2]}.</p><form class="so-f" data-form="cuEnviar" data-tipo="${tipo}" autocomplete="off">${tipo === 'recrutamento' ? '<input class="field" name="titulo" maxlength="100" placeholder="Para que função? (ex.: moderação, design)" aria-label="Função">' : ''}<textarea class="field" name="texto" maxlength="1200" rows="4" placeholder="${esc(txt[0])}" aria-label="${esc(D[1])}" required></textarea><button class="btn an-cta">${txt[1]}</button></form><p class="mut" style="font-size:12.5px">${UI.ic('shield')}O que envias é verificado pela IA e lido pela equipa.</p></section>`; };
A.cuAbrir = b => { OS.ui.comT = b.dataset.k; if (OS.route().sub !== 'comunidade') location.hash = 'animes.comunidade'; OS.request(); };
OS.forms.cuEnviar = async (f, v) => { const tipo = f.dataset.tipo, bt = f.querySelector('button'); if (bt) bt.disabled = true;
  try { const j = await call('com', { tipo, titulo: v('titulo'), texto: v('texto') }); f.reset(); if (j.ind && CS.ind) CS.ind.unshift(j.ind); UI.toast({ indicacao: 'Indicação publicada.', pedido: 'Pedido enviado à equipa.', sugestao: 'Sugestão enviada. Obrigado!', recrutamento: 'Candidatura enviada. A equipa responde por e-mail.' }[tipo], 'pos'); OS.request(); }
  catch (e) { UI.toast(e.message, 'neg'); } if (bt) bt.disabled = false; };
A.cuGosto = async b => { try { const j = await call('gostarInd', { id: b.dataset.id }); CS.ind = (CS.ind || []).map(x => x.id === j.ind.id ? j.ind : x); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
A.cuAdm = async b => { const el = document.getElementById('cuAdmL'); if (!el) return; el.innerHTML = '<p class="mut">A abrir…</p>'; try { const j = await call('adminCom', { tipo: b.dataset.k });
    el.innerHTML = j.L.length ? `<ul class="cu-ind">${j.L.map(x => `<li><div>${x.titulo ? `<b>${esc(x.titulo)}</b>` : ''}<p>${esc(x.texto || '')}</p><small>${esc(x.nome)}${x.user ? ' · @' + esc(x.user) : ''} · ${new Date(x.at).toLocaleString('pt-PT')}${x.email ? ' · ' + esc(x.email) : ''}</small></div></li>`).join('')}</ul>` : '<p class="mut">Nada por agora.</p>'; } catch (e) { el.innerHTML = `<p class="so-err">${esc(e.message)}</p>`; } };
A.cuEquipa = async () => { const atual = (CS.eq || []).map(x => [x.nome, x.papel, x.user, x.desc].join(' | ')).join('\n'); const t = prompt('A equipa da ' + pn() + ', uma pessoa por linha:\nNome | Função | @ | Descrição', atual); if (t == null) return;
  const L = t.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0]).map(([nome, papel, user, desc]) => ({ nome, papel: papel || '', user: (user || '').replace(/^@/, ''), desc: desc || '' }));
  try { const j = await call('adminEquipa', { L }); CS.eq = j.equipa; UI.toast('Equipa guardada.', 'pos'); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
OS.on && OS.on('render', () => { const r = OS.route(); if (!(r.base === 'animes' && r.sub === 'comunidade') && OS.ui.comT) OS.ui.comT = ''; });
OS.AnimeSoc = { comentarios, comunidade, perfil, cartao, av, modos, reduz };
})();
