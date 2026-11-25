/* PRUMO — a parceria Prumo & PHANTOM nos Animes (v3.78).
   A ideia: "o mesmo fio". Um prumo é um peso pendurado num fio; a aranha da PHANTOM desce pelo seu fio. As duas casas aparecem
   assim, penduradas lado a lado, com o "&" entre elas.
   · intro de cinema na primeira entrada nos Animes (dá para ver outra vez na página da parceria);
   · o primeiro destaque do carrossel é a parceria;
   · a página da parceria (#animes.parceria): o manifesto, o que nasce dela, os números ao vivo e o que vem aí;
   · o selo "Exclusivo da parceria" nos jogos e na comunidade, e a assinatura no fim de cada página dos Animes. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const SO = () => OS.Social || {};
const nome = () => (SO().nome ? SO().nome() : 'PHANTOM') || 'PHANTOM', ePh = () => /^phantom$/i.test(nome());
const selo = n => { try { return OS.Lock && OS.Lock.logo ? OS.Lock.logo(n) : ''; } catch (e) { return ''; } };
const RED = '#E8203A';

/* ---------- o palco: o prumo e a aranha no mesmo fio ---------- */
// modo: 'intro' (cai e balança), 'slide' (só balança), 'pag' (cai uma vez e balança)
const palco = modo => `<div class="pp-palco pp-${modo}" aria-hidden="true"><span class="pp-luz"></span><span class="pp-chao"></span>
  <span class="pp-pend pp-p1"><span class="pp-fio"></span><span class="pp-no"></span><span class="pp-peso">${selo(120)}</span></span>
  <i class="pp-e">&amp;</i>
  <span class="pp-pend pp-p2">${ePh() ? '<img class="pp-ar" src="icons/phantom-aranha.webp" alt="" decoding="async" draggable="false">' : `<span class="pp-fio"></span><span class="pp-pq">${esc(nome().slice(0, 1))}</span>`}</span></div>`;
const wordmark = () => `<div class="pp-wm"><b class="pp-wp">Prumo</b><i>&amp;</i>${ePh() ? `<img class="pp-wn" src="icons/phantom-nome.webp" alt="${esc(nome())}" decoding="async">` : `<b class="pp-wx">${esc(nome())}</b>`}</div>`;
// pequeno, para o canto do destaque no telemóvel
const mini = () => `<span class="pp-mini" aria-hidden="true">${selo(30)}<i>&amp;</i>${ePh() ? '<img src="icons/phantom-icone.webp" alt="" width="30" height="30" decoding="async">' : `<b>${esc(nome().slice(0, 1))}</b>`}</span>`;
const exclusivo = () => `<span class="pp-ex">${UI.ic('star')}Exclusivo da parceria Prumo &amp; ${esc(nome())}</span>`;
const assinatura = () => `<footer class="pp-ass"><span class="pp-assf" aria-hidden="true"></span>${mini()}<p>Uma parceria <b>Prumo &amp; ${esc(nome())}</b></p><a href="#animes.parceria">Conhecer a parceria</a></footer>`;

/* ---------- intro de cinema (uma vez; não aparece aos robôs dos testes, a não ser que peçam) ---------- */
const IK = 'oc_pp_intro';
let ABERTA = false;
const fechar = () => { const el = document.getElementById('ppIntro'); ABERTA = false; if (!el) return; el.classList.add('sai'); setTimeout(() => el.remove(), 480); try { U.ls.set(IK, 1); } catch (e) { } };
const intro = forcar => { if (ABERTA || document.getElementById('ppIntro')) return; if (!forcar && (U.ls.get(IK, 0) || (navigator.webdriver && !window.__ppIntro))) return;
  ABERTA = true; const red = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div'); el.id = 'ppIntro'; el.className = 'pp-intro' + (red ? ' calmo' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Parceria Prumo e ' + nome());
  el.innerHTML = `<button type="button" class="pp-saltar" data-pp="fechar">Saltar</button>${palco('intro')}${wordmark()}<p class="pp-tag">O mesmo fio.</p><p class="pp-sub">Parceria oficial dos Animes do Prumo</p><button type="button" class="pp-entrar" data-pp="fechar">Entrar</button>`;
  el.addEventListener('click', e => { if (e.target.closest('[data-pp=fechar]')) fechar(); });
  document.body.appendChild(el); try { U.ls.set(IK, 1); } catch (e) { }
  setTimeout(() => { if (document.getElementById('ppIntro') === el) fechar(); }, red ? 4000 : 7000);
  setTimeout(() => { const b = el.querySelector('.pp-entrar'); if (b) b.focus({ preventScroll: true }); }, red ? 300 : 2400); };
A.ppIntro = () => intro(true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('ppIntro')) fechar(); });

/* ---------- o destaque da parceria (o primeiro do carrossel) ---------- */
const slide = (i, on) => `<article class="an-slide pp-slide${on ? ' on' : ''}" data-i="${i}" style="--c:${RED}" aria-hidden="${!on}"${on ? '' : ' inert'}>
  <div class="an-hpic pp-hpic">${palco('slide')}<div class="an-hg"></div><a class="an-hopen" href="#animes.parceria" tabindex="-1" aria-label="Conhecer a parceria"></a></div>
  <div class="an-hc"><div class="an-ht"><span class="an-hk">Parceria oficial</span><h2>Prumo &amp; ${esc(nome())}</h2>
    <p class="an-hd">Os Animes do Prumo passam a ser feitos com a ${esc(nome())}: o Pursuit todas as noites, o ranking, os clãs, a comunidade e os Prémios Prumo.</p>
    <div class="an-hb2"><a class="btn an-cta" href="#animes.parceria">${UI.ic('star')}Conhecer a parceria</a></div></div></div></article>`;

/* ---------- números ao vivo (do servidor, públicos e sem nomes) ---------- */
let NUM = null, NUMAT = 0;
const numeros = async () => { if (Date.now() - NUMAT < 5 * 6e4) return; NUMAT = Date.now();
  try { const r = await fetch('api/social?op=parceiro&n=1', { credentials: 'omit', cache: 'no-store' }), j = await r.json(); if (j && j.ok && j.n) { NUM = j.n; OS.request(); } } catch (e) { } };
const nf = n => U.nf ? U.nf(n || 0, 0) : String(n || 0);

/* ---------- a página da parceria ---------- */
const OQUE = [
  ['pursuit', 'target', 'Pursuit', 'Todas as noites às 20h de Lisboa, um anime escondido em cinco pistas. Quem acerta primeiro ganha mais pontos.', 'Créditos: SuperAnimes'],
  ['ranking', 'award', 'Ranking de animes', 'Os pontos de todos os jogos da parceria, com pódio, fotos e o @ de cada um.'],
  ['clas', 'chat', 'Clãs e conversas', 'Grupos e conversas a dois, com cada mensagem verificada pela IA.'],
  ['premios', 'trophy', 'Prémios Prumo', 'A votação do ano: os melhores animes escolhidos por quem os vê.'],
  ['comunidade', 'users', 'Comunidade', 'Indicações, pedidos, sugestões, a Equipa SA e o recrutamento.'],
  ['perfil', 'user', 'Perfil de anime', 'O teu @, a tua foto e o teu fundo, só para os Animes.'],
  ['', 'eye', 'Comentários sem spoilers', 'A IA tapa os spoilers. Só vê quem quiser.'],
  ['', 'bell', 'Avisos de episódios', 'Toca no sino de um anime e recebes um aviso quando sai cada episódio.']];
const pagina = () => { numeros(); const n = NUM || {};
  const viva = [[n.jogadores, 'pessoas no ranking'], [n.hoje, 'jogaram o Pursuit hoje'], [n.clas, 'clãs criados'], [n.coms, 'animes com comentários']].filter(x => x[0] != null);
  return `<section class="pp-pag">
    <header class="pp-cab">${palco('pag')}<div class="pp-cabt">${wordmark()}<h1>Dois nomes, o mesmo fio.</h1>
      <p>Um prumo é um peso pendurado num fio, a marcar o que está direito. A aranha da ${esc(nome())} desce pelo seu. Agora estão no mesmo fio: os Animes do Prumo são feitos com a ${esc(nome())}, para jogar, competir e conversar todos os dias.</p>
      <div class="pp-acts"><a class="btn an-cta" href="#animes.pursuit">${UI.ic('target')}Jogar o Pursuit</a><button type="button" class="btn an-ghost" data-act="ppIntro">${UI.ic('play')}Ver a intro</button></div></div></header>
    ${viva.length ? `<div class="pp-viva" aria-label="A parceria ao vivo">${viva.map(([v, l]) => `<div><b>${nf(v)}</b><span>${l}</span></div>`).join('')}</div>` : ''}
    <section class="pp-oq"><h2>O que nasce da parceria</h2><div class="pp-grid">${OQUE.map(([k, ic, t, d, c], i) => { const tag = k ? 'a' : 'div';
      return `<${tag} class="pp-it${i === 0 ? ' big' : ''}"${k ? ` href="#animes.${k}"` : ''}>${i === 0 && ePh() ? '<img class="pp-itar" src="icons/phantom-aranha.webp" alt="" decoding="async">' : ''}<span class="pp-iti">${UI.ic(ic)}</span><b>${t}</b><p>${d}</p>${c ? `<small>${c}</small>` : ''}</${tag}>`; }).join('')}</div></section>
    <section class="pp-lt"><h2>O que vem aí</h2><ol>
      <li><b>Todas as noites, 20h</b><span>Um Pursuit novo, com aviso no telemóvel quando saem as pistas e com o teu resultado.</span></li>
      <li><b>Dezembro</b><span>Os Prémios Prumo: a votação dos melhores animes do ano.</span></li>
      <li><b>Sempre</b><span>Mais jogos de anime da parceria. Os pontos de todos contam para o ranking.</span></li></ol></section>
    ${exclusivo()}</section>`; };

OS.Parceria = { palco, wordmark, mini, exclusivo, assinatura, intro, slide, pagina };

// na primeira entrada nos Animes, a intro
const verIntro = () => { if ((OS.route && OS.route().view) === 'animes' && !OS.Areas?.hidden?.().has('animes')) setTimeout(() => intro(false), 350); };
OS.on && OS.on('ready', () => { verIntro(); window.addEventListener('hashchange', verIntro); });
})();
