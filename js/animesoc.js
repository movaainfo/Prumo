/* PRUMO — Animes em comunidade (v3.75), na parceria Prumo & PHANTOM:
   · perfil dos animes, à parte do perfil do app: o mesmo nome, um @ (escolhido uma vez, não muda), uma foto e um fundo próprios.
     No menu do perfil (o círculo no topo) arrasta-se para o lado para o ver e editar;
   · comentários em cada anime: a IA barra ofensas e tapa os spoilers (só vê quem tocar), gostos nos comentários e no anime;
   · Comunidade (como na SuperAnimes): Indicações, Pedidos, Sugestões, Equipa SA e Recrutamento;
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
  return `<div class="ap-card${o.fu ? ' com-fundo' : ''}" style="${fundo(o)}">${o.fu ? '' : '<img class="ap-ar" src="icons/phantom-aranha.webp" alt="" aria-hidden="true">'}<span class="ap-mk">${SO().marca ? SO().marca('xs') : ''}</span>
    <div class="ap-who">${av(o, 64)}<div>${nomeUser(o)}${o.user ? '' : edita ? '<small class="ap-sem">Ainda sem @</small>' : ''}</div></div>
    <div class="ap-st"><span><b>${o.pts || 0}</b>pontos</span>${o.pos ? `<span><b>${o.pos}.º</b>no ranking</span>` : ''}${o.clas != null ? `<span><b>${o.clas}</b>${o.clas === 1 ? 'clã' : 'clãs'}</span>` : ''}</div>
    ${edita ? `<button type="button" class="btn sm ap-ed" data-act="apEditar">${UI.ic('edit')}Editar perfil dos animes</button>` : ''}</div>`; };
const meu = () => { const d = euD(); return d && d.eu ? Object.assign({ clas: (d.clas || []).length }, d.eu) : null; };
// editar: o @ (uma vez), a foto e o fundo
const reduz = (file, W, H, q, cobre) => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { const c = document.createElement('canvas'); let sw = im.width, sh = im.height, sx = 0, sy = 0;
    if (cobre) { const r = W / H; if (sw / sh > r) { sw = sh * r; sx = (im.width - sw) / 2; } else { sh = sw / r; sy = (im.height - sh) / 2; } c.width = W; c.height = H; } else { const k = Math.min(1, W / Math.max(sw, sh)); c.width = Math.round(sw * k); c.height = Math.round(sh * k); }
    c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', q).split(',')[1]); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Não deu para ler a imagem.')); }; im.src = u; });
A.apEditar = () => { const o = meu(); if (!o) { if (SO().eu) SO().eu(true); UI.toast('A abrir o teu perfil…'); return; }
  UI.modal(`<div class="ap-edit"><div class="row between" style="align-items:center"><h3 style="margin:0">Perfil dos animes</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <div id="apPrev">${cartao(o, false)}</div>
    <p class="mut" style="margin:0">O nome é o do teu perfil Prumo (<b>${esc(o.nome)}</b>). Aqui escolhes o @, a foto e o fundo que os outros veem nos rankings, nos clãs e nos comentários.</p>
    ${o.user ? `<div class="ap-f"><span>O teu @</span><b class="ap-at">${UI.ic('lock')}@${esc(o.user)}</b><small class="mut">O @ fica para sempre: não muda.</small></div>`
      : `<form class="ap-f" data-form="apUser" autocomplete="off"><span>Escolhe o teu @</span><div class="row gap6"><input class="field grow" name="u" maxlength="21" placeholder="@o_teu_nome" aria-label="O teu @" required pattern="@?[a-zA-Z0-9_.]{3,20}"><button class="btn pri">Guardar</button></div><small class="mut">3 a 20 letras, números, _ ou ponto. Depois de escolhido, não muda.</small></form>`}
    <div class="ap-f"><span>Foto</span><div class="row gap6" style="flex-wrap:wrap"><label class="btn sm">${UI.ic('image')}Escolher foto<input class="fo-file" type="file" accept="image/*" data-ap="av"></label>${o.av ? '<button type="button" class="btn sm ghost" data-act="apTirar" data-k="av">Tirar a foto</button>' : ''}</div></div>
    <div class="ap-f"><span>Fundo</span><div class="row gap6" style="flex-wrap:wrap"><label class="btn sm">${UI.ic('image')}Escolher fundo<input class="fo-file" type="file" accept="image/*" data-ap="fu"></label>${o.fu ? '<button type="button" class="btn sm ghost" data-act="apTirar" data-k="fu">Tirar o fundo</button>' : ''}</div></div>
    <p class="mut" style="margin:0;font-size:12.5px">${UI.ic('shield')}A IA verifica as imagens antes de aparecerem (nada de nudez, violência ou dados pessoais).</p></div>`, 'ap-modal'); };
const atualiza = async () => { if (SO().eu) await SO().eu(true); const p = document.getElementById('apPrev'); if (p) p.innerHTML = cartao(meu(), false); const c = document.querySelector('.pf-car .ap-wrap'); if (c) c.innerHTML = cartao(meu(), true); OS.request(); };
OS.forms = OS.forms || {};
OS.forms.apUser = async (f, v) => { try { const j = await call('user', { user: v('u') }); UI.toast('O teu @ é @' + j.user + '.', 'pos'); await atualiza(); A.apEditar(); } catch (e) { UI.toast(e.message, 'neg'); } };
A.apTirar = async b => { try { await call('perfilImg', { k: b.dataset.k, apagar: true }); await atualiza(); A.apEditar(); } catch (e) { UI.toast(e.message, 'neg'); } };
document.addEventListener('change', async e => { const el = e.target; if (!el || !el.dataset || !el.dataset.ap || !el.files || !el.files[0]) return; const k = el.dataset.ap, f = el.files[0]; el.value = '';
  try { UI.toast(k === 'av' ? 'A enviar a foto…' : 'A enviar o fundo…'); const b64 = k === 'av' ? await reduz(f, 320, 320, .82, true) : await reduz(f, 1200, 450, .8, true); await call('perfilImg', { k, b64 }); UI.toast(k === 'av' ? 'Foto guardada.' : 'Fundo guardado.', 'pos'); await atualiza(); A.apEditar(); } catch (er) { UI.toast(er.message, 'neg'); } });
// no menu do perfil (o círculo do topo): arrasta para o lado para o perfil dos animes
OS.on && OS.on('ready', () => { const am = A.accMenu; if (!am || am._ap) return; A.accMenu = () => { am(); if (!conta()) return; const h = document.querySelector('#modal .ac-mh'); if (!h) return; if (SO().eu) SO().eu();
  const wrap = document.createElement('div'); wrap.className = 'pf-car'; wrap.innerHTML = `<div class="pf-cs" tabindex="0" aria-label="Os teus perfis: arrasta para o lado"><div class="pf-c pf-c1"></div><div class="pf-c ap-wrap">${cartao(meu(), true)}</div></div><div class="pf-dots" aria-hidden="true"><i class="on"></i><i></i></div><small class="pf-dica">Arrasta para o lado: o teu perfil dos animes</small>`;
  h.parentNode.insertBefore(wrap, h); wrap.querySelector('.pf-c1').appendChild(h);
  const cs = wrap.querySelector('.pf-cs'), dots = wrap.querySelectorAll('.pf-dots i'); cs.addEventListener('scroll', () => { const i = Math.round(cs.scrollLeft / Math.max(1, cs.clientWidth)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
  const espera = setInterval(() => { const c = wrap.querySelector('.ap-wrap'); if (!document.body.contains(wrap)) return clearInterval(espera); if (meu() && c && c.querySelector('.ap-ld')) { c.innerHTML = cartao(meu(), true); clearInterval(espera); } }, 400);  }; A.accMenu._ap = 1; });
// a página "O meu perfil" nos Animes
const MODOS = [['competicao', 'Competição', 'trophy', 'Participar de rankings, desafios e jogos.'], ['diversao', 'Diversão', 'gamepad', 'Jogar, explorar funcionalidades e interagir mesmo sem assistir a conteúdos.']];
const modos = () => U.ls.get('oc_an_modos', null);
const modosHTML = (sel, acao) => `<div class="ap-modos" role="group" aria-label="Como queres usar os Animes">${MODOS.map(([k, n, ic, d]) => `<button type="button" class="ap-modo${(sel || []).includes(k) ? ' on' : ''}" data-act="${acao}" data-k="${k}" aria-pressed="${(sel || []).includes(k)}"><b>${UI.ic(ic)}${n}</b><span>${d}</span><i aria-hidden="true">${UI.ic('check')}</i></button>`).join('')}</div>`;
A.apModo = b => { const m = new Set(modos() || []); if (m.has(b.dataset.k)) m.delete(b.dataset.k); else m.add(b.dataset.k); U.ls.set('oc_an_modos', [...m]); OS.request(); };
const perfil = () => { if (!conta()) return `<div class="so-vazio"><b>Entra na tua conta Prumo</b><p>O perfil dos animes, os comentários e a comunidade precisam de uma conta.</p></div>`; if (SO().eu) SO().eu();
  return `<section class="hu">${cartao(meu(), true)}<div class="so-sec"><h3>Como usas os Animes</h3>${modosHTML(modos() || [], 'apModo')}</div><p class="mut">O teu perfil Prumo (o do resto do app) fica à parte: aqui só aparecem o nome, o @, a foto e o fundo.</p></section>`; };

/* ---------- a primeira vez nos Animes: Competição e/ou Diversão ---------- */
let ESC = null; A.apEsc = b => { ESC = ESC || []; const i = ESC.indexOf(b.dataset.k); if (i >= 0) ESC.splice(i, 1); else ESC.push(b.dataset.k); OS.request(); };
A.apEscOk = () => { U.ls.set('oc_an_modos', ESC && ESC.length ? ESC : ['competicao', 'diversao']); ESC = null; OS.request(); };
const boasVindas = () => `<section class="ap-bv"><span class="ap-bvm">${SO().marca ? SO().marca('sm') : ''}</span><h2>Como queres usar os Animes?</h2><p>Escolhe uma ou as duas. Podes mudar quando quiseres em O meu perfil.</p>${modosHTML(ESC || [], 'apEsc')}<button type="button" class="btn an-cta" data-act="apEscOk">${ESC && ESC.length ? 'Continuar' : 'Quero as duas'}</button></section>`;
// destaque no início dos Animes, conforme o modo
const destaque = () => { const m = modos() || []; if (!m.length) return ''; const L = [];
  if (m.includes('competicao')) L.push(`<a class="ap-dq" href="#animes.pursuit"><b>${UI.ic('trophy')}Pursuit de hoje</b><span>Às 20h saem as pistas. Quem acerta primeiro ganha mais.</span></a><a class="ap-dq" href="#animes.ranking"><b>${UI.ic('award')}Ranking de animes</b><span>Os pontos de todos os jogos.</span></a>`);
  if (m.includes('diversao')) L.push(`<a class="ap-dq" href="#animes.comunidade"><b>${UI.ic('users')}Comunidade</b><span>Indicações, pedidos, sugestões e a equipa.</span></a><a class="ap-dq" href="#animes.clas"><b>${UI.ic('chat')}Clãs e conversas</b><span>Joga e conversa em grupo.</span></a>`);
  return `<div class="ap-dqs">${L.join('')}</div>`; };
OS.on && OS.on('ready', () => { const v = OS.views.animes; if (!v || v._ap) return; OS.views.animes = sub => { const h = v(sub); if (sub || !conta()) return h;
    const i = h.indexOf('<div class="an'); if (i < 0) return h; const extra = modos() ? destaque() : boasVindas(); const j = h.indexOf('>', i) + 1; return h.slice(0, j) + extra + h.slice(j); }; OS.views.animes._ap = 1; });

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
A.apVerPerfil = async (b, e) => { if (e && e.preventDefault) e.preventDefault(); try { const j = await call('verPerfil', { id: b.dataset.id }); UI.modal(`<div class="ap-edit">${cartao(j.perfil, false)}<button type="button" class="btn" data-mclose>Fechar</button></div>`, 'ap-modal'); } catch (er) { UI.toast(er.message, 'neg'); } };

/* ---------- Comunidade ---------- */
const COM = [['indicacoes', 'Indicações', 'Recomendar conteúdos'], ['pedidos', 'Pedidos', 'Solicitar conteúdos'], ['sugestoes', 'Sugestões', 'Enviar ideias para o app'], ['equipa', 'Equipa SA', 'Conhecer a equipa'], ['recrutamento', 'Recrutamento', 'Participar da equipa']];
const CS = { ind: null, eq: null, at: 0 };
const carregaCom = async forcar => { if (CS.busy || (!forcar && Date.now() - CS.at < 60e3)) return; CS.busy = 1; try { const [a, b] = await Promise.all([call('indicacoes', {}), call('equipa', {})]); CS.ind = a.L; CS.eq = b.equipa; CS.err = ''; } catch (e) { CS.err = e.message; } CS.at = Date.now(); CS.busy = 0; OS.request(); };
const adm = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
const comunidade = () => { if (!conta()) return `<div class="so-vazio"><b>Entra na tua conta Prumo</b><p>A comunidade precisa de uma conta.</p></div>`; carregaCom(); const t = OS.ui.comT || '';
  const topo = `<header class="hu-h">${SO().marca ? SO().marca('sm') : ''}<h2>Comunidade</h2><p>Recomenda animes, pede conteúdos, manda ideias, conhece a equipa da SuperAnimes e candidata-te para fazer parte dela.</p></header>`;
  if (!t) return `<section class="hu">${topo}<nav class="cu-l">${COM.map(([k, n, d]) => `<button type="button" class="cu-i" data-act="cuAbrir" data-k="${k}"><b>${n}</b><span>${d}</span>${UI.ic('right')}</button>`).join('')}</nav>${adm() ? `<details class="pn cu-adm"><summary><b>Administração da comunidade</b></summary><div class="row gap6" style="flex-wrap:wrap;margin-top:8px">${[['pedido', 'Pedidos'], ['sugestao', 'Sugestões'], ['recrutamento', 'Candidaturas'], ['indicacao', 'Indicações']].map(([k, n]) => `<button class="btn sm" data-act="cuAdm" data-k="${k}">${n}</button>`).join('')}<button class="btn sm" data-act="cuEquipa">Editar a equipa</button></div><div id="cuAdmL"></div></details>` : ''}</section>`;
  const vol = `<button type="button" class="btn sm an-ghost" data-act="cuAbrir" data-k="">${UI.ic('left')}Comunidade</button>`, D = COM.find(x => x[0] === t) || COM[0];
  if (t === 'indicacoes') return `<section class="hu">${vol}<h2>Indicações</h2><p class="mut">Recomenda um anime à comunidade e diz porquê. As indicações de todos aparecem aqui.</p>
    <form class="so-f" data-form="cuEnviar" data-tipo="indicacao" autocomplete="off"><input class="field" name="titulo" maxlength="100" placeholder="Nome do anime" aria-label="Nome do anime" required><textarea class="field" name="texto" maxlength="600" rows="2" placeholder="Porque recomendas? (sem spoilers)" aria-label="Porque recomendas"></textarea><button class="btn an-cta">Recomendar</button></form>
    ${CS.ind ? CS.ind.length ? `<ul class="cu-ind">${CS.ind.map(x => `<li><div><b>${esc(x.titulo)}</b>${x.texto ? `<p>${esc(x.texto)}</p>` : ''}<small>${esc(x.nome)}${x.user ? ' · @' + esc(x.user) : ''} · ${quando(x.at)}</small></div><button type="button" class="cm-g${x.gostei ? ' on' : ''}" data-act="cuGosto" data-id="${esc(x.id)}" aria-pressed="${!!x.gostei}" aria-label="Gostar">${UI.ic('heart2')}${x.gostos || ''}</button></li>`).join('')}</ul>` : '<p class="mut">Ainda não há indicações. Sê o primeiro.</p>' : '<div class="an-ld"><span class="an-sp"></span>A abrir…</div>'}</section>`;
  if (t === 'equipa') return `<section class="hu">${vol}<h2>Equipa SA</h2><p class="mut">Quem faz a SuperAnimes.</p>${CS.eq ? CS.eq.length ? `<ul class="cu-eq">${CS.eq.map(x => `<li>${av({ nome: x.nome, user: x.user }, 52)}<div><b>${esc(x.nome)}</b>${x.user ? `<small>@${esc(x.user)}</small>` : ''}<span>${esc(x.papel)}</span>${x.desc ? `<p>${esc(x.desc)}</p>` : ''}</div></li>`).join('')}</ul>` : '<p class="mut">A equipa vai aparecer aqui em breve.</p>' : '<div class="an-ld"><span class="an-sp"></span>A abrir…</div>'}<button type="button" class="btn an-ghost" data-act="cuAbrir" data-k="recrutamento">Quero fazer parte da equipa</button></section>`;
  const tipo = { pedidos: 'pedido', sugestoes: 'sugestao', recrutamento: 'recrutamento' }[t], txt = { pedido: ['O que gostavas de ver nos Animes? Um anime, uma temporada, notícias, um jogo…', 'Enviar pedido'], sugestao: ['A tua ideia para melhorar o app.', 'Enviar sugestão'], recrutamento: ['Conta-nos o que sabes fazer (escrever, desenhar, moderar, traduzir, programar…) e porque queres entrar. A equipa responde para o e-mail da tua conta.', 'Candidatar-me'] }[tipo];
  return `<section class="hu">${vol}<h2>${D[1]}</h2><p class="mut">${D[2]}.</p><form class="so-f" data-form="cuEnviar" data-tipo="${tipo}" autocomplete="off">${tipo === 'recrutamento' ? '<input class="field" name="titulo" maxlength="100" placeholder="Para que função? (ex.: moderação, design)" aria-label="Função">' : ''}<textarea class="field" name="texto" maxlength="1200" rows="4" placeholder="${esc(txt[0])}" aria-label="${esc(D[1])}" required></textarea><button class="btn an-cta">${txt[1]}</button></form><p class="mut" style="font-size:12.5px">${UI.ic('shield')}O que envias é verificado pela IA e lido pela equipa.</p></section>`; };
A.cuAbrir = b => { OS.ui.comT = b.dataset.k; if (OS.route().sub !== 'comunidade') location.hash = 'animes.comunidade'; OS.request(); };
OS.forms.cuEnviar = async (f, v) => { const tipo = f.dataset.tipo, bt = f.querySelector('button'); if (bt) bt.disabled = true;
  try { const j = await call('com', { tipo, titulo: v('titulo'), texto: v('texto') }); f.reset(); if (j.ind && CS.ind) CS.ind.unshift(j.ind); UI.toast({ indicacao: 'Indicação publicada.', pedido: 'Pedido enviado à equipa.', sugestao: 'Sugestão enviada. Obrigado!', recrutamento: 'Candidatura enviada. A equipa responde por e-mail.' }[tipo], 'pos'); OS.request(); }
  catch (e) { UI.toast(e.message, 'neg'); } if (bt) bt.disabled = false; };
A.cuGosto = async b => { try { const j = await call('gostarInd', { id: b.dataset.id }); CS.ind = (CS.ind || []).map(x => x.id === j.ind.id ? j.ind : x); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
A.cuAdm = async b => { const el = document.getElementById('cuAdmL'); if (!el) return; el.innerHTML = '<p class="mut">A abrir…</p>'; try { const j = await call('adminCom', { tipo: b.dataset.k });
    el.innerHTML = j.L.length ? `<ul class="cu-ind">${j.L.map(x => `<li><div>${x.titulo ? `<b>${esc(x.titulo)}</b>` : ''}<p>${esc(x.texto || '')}</p><small>${esc(x.nome)}${x.user ? ' · @' + esc(x.user) : ''} · ${new Date(x.at).toLocaleString('pt-PT')}${x.email ? ' · ' + esc(x.email) : ''}</small></div></li>`).join('')}</ul>` : '<p class="mut">Nada por agora.</p>'; } catch (e) { el.innerHTML = `<p class="so-err">${esc(e.message)}</p>`; } };
A.cuEquipa = async () => { const atual = (CS.eq || []).map(x => [x.nome, x.papel, x.user, x.desc].join(' | ')).join('\n'); const t = prompt('A equipa da SuperAnimes, uma pessoa por linha:\nNome | Função | @ | Descrição', atual); if (t == null) return;
  const L = t.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0]).map(([nome, papel, user, desc]) => ({ nome, papel: papel || '', user: (user || '').replace(/^@/, ''), desc: desc || '' }));
  try { const j = await call('adminEquipa', { L }); CS.eq = j.equipa; UI.toast('Equipa guardada.', 'pos'); OS.request(); } catch (e) { UI.toast(e.message, 'neg'); } };
OS.on && OS.on('render', () => { const r = OS.route(); if (!(r.base === 'animes' && r.sub === 'comunidade') && OS.ui.comT) OS.ui.comT = ''; });
OS.AnimeSoc = { comentarios, comunidade, perfil, cartao, av, modos };
})();
