/* PRUMO — Animes: a classe de cada fã, o rank e o Recap do ano (v3.82), na parceria Prumo & PHANTOM.
   · Classe: tirada do que vês (géneros, notas, estados). Nove classes e doze híbridas (quando dois lados pesam quase o mesmo).
   · Rank de fã, de E a SSS: cada degrau pede várias coisas ao mesmo tempo (episódios, séries terminadas, géneros, notas dadas,
     filmes, pontos do Pursuit). Os de cima são para pouquíssima gente.
   · Títulos raros: conquistas difíceis (ex.: uma série com mais de 1000 episódios vista).
   · Recap: só no fim do ano (de 1 de dezembro a 15 de janeiro). Ecrãs com contagens, impactos, explosões de partículas,
     ondas de choque, o anime do ano, a revelação do rank e da classe (em carta) e um cartão final para partilhar como imagem.
     Antes de abrir mostra a contagem; a administração pode pré-visualizar. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const L = () => (OS.Animes && OS.Animes.list ? OS.Animes.list() : []);
const nf = v => U.nf ? U.nf(v, 0) : String(v);
// emblemas (traço simples, 24×24)
const EMB = {
  acao: 'M5 19l9-9M14 4l6 0 0 6-9 9-3-3zM4 20l3-1-2-2z', misterio: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  romance: 'M12 21s-7-4.5-9-9.5C1.5 7.5 4.5 4 8 4c2 0 3.2 1 4 2.4C12.8 5 14 4 16 4c3.5 0 6.5 3.5 5 7.5-2 5-9 9.5-9 9.5z', mundos: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  calmo: 'M5 10h12v3a6 6 0 0 1-12 0zM17 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4', sombras: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z',
  desporto: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5 6c4 3 4 9 0 12M19 6c-4 3-4 9 0 12', mecha: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  musica: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', hib: 'M12 2l2.6 6.4L21 9l-5 4.5L17.5 21 12 17.3 6.5 21 8 13.5 3 9l6.4-.6z' };
const CLS = [
  ['acao', ['Action', 'Adventure', 'Martial Arts'], 'Lâmina do Trovão Carmesim', 'Não recuas. Cada luta é só mais um arco de treino.', '#ff3b30'],
  ['misterio', ['Mystery', 'Psychological', 'Thriller', 'Suspense'], 'Arquiteto das Sombras', 'Vês a jogada três episódios antes de ela acontecer.', '#7c5cff'],
  ['romance', ['Romance', 'Drama'], 'Guardião da Flor Eterna', 'Sentes tudo, choras sem vergonha e torces até ao último episódio.', '#ff3d8b'],
  ['mundos', ['Fantasy', 'Sci-Fi', 'Isekai'], 'Andarilho dos Mil Mundos', 'Já viveste mais vidas do que alguma vez vais contar.', '#3b82f6'],
  ['calmo', ['Slice of Life', 'Comedy'], 'Monge da Brisa Serena', 'A tua força é a calma de um fim de tarde com chá.', '#22c55e'],
  ['sombras', ['Horror', 'Supernatural'], 'Exorcista da Lua Negra', 'Onde os outros desviam o olhar, tu ficas para ver o fim.', '#dc2626'],
  ['desporto', ['Sports'], 'Ás do Último Segundo', 'O jogo só acaba quando o apito toca.', '#f97316'],
  ['mecha', ['Mecha'], 'Piloto do Núcleo Celeste', 'Sincronização a 400%. O cockpit é a tua casa.', '#94a3b8'],
  ['musica', ['Music'], 'Maestro da Alma Ardente', 'Cada abertura é um hino e sabes todas de cor.', '#eab308']];
const HIB = { 'acao+mundos': ['Cavaleiro do Dragão Ancestral', 'Espada numa mão, o mapa de outro mundo na outra.', '#f59e0b'], 'acao+misterio': ['Estratega da Guerra Silenciosa', 'Ganhas a batalha antes de ela começar.', '#a855f7'],
  'acao+sombras': ['Caçador de Demónios Escarlate', 'A noite é o teu campo de batalha.', '#e11d48'], 'misterio+sombras': ['Detetive do Oculto', 'Resolves casos que nem deviam existir.', '#6d28d9'],
  'mundos+romance': ['Herdeiro do Reino Perdido', 'Um amor que atravessa mundos e séculos.', '#ec4899'], 'calmo+romance': ['Coração de Primavera', 'Os pequenos momentos são os teus finais felizes.', '#f472b6'],
  'misterio+mundos': ['Oráculo do Tempo Partido', 'Linhas temporais, paradoxos e finais que ninguém previu.', '#06b6d4'], 'acao+desporto': ['Prodígio Imparável', 'Treino, suor e uma última jogada impossível.', '#fb923c'],
  'mecha+mundos': ['Comandante da Frota Estelar', 'O universo inteiro é o teu tabuleiro.', '#60a5fa'], 'calmo+mundos': ['Aventureiro da Estrada Tranquila', 'Outros mundos, sem pressa de chegar.', '#34d399'],
  'acao+calmo': ['Herói de Folga', 'Salvas o mundo de manhã; à tarde há sesta.', '#84cc16'], 'romance+sombras': ['Amante da Noite Eterna', 'Paixões trágicas, sangue e luar.', '#be123c'] };
const GEN = { Action: 'Ação', Adventure: 'Aventura', Comedy: 'Comédia', Drama: 'Drama', Fantasy: 'Fantasia', Horror: 'Terror', Mecha: 'Mecha', Music: 'Música', Mystery: 'Mistério', Psychological: 'Psicológico', Romance: 'Romance', 'Sci-Fi': 'Ficção científica', 'Slice of Life': 'Slice of life', Sports: 'Desporto', Supernatural: 'Sobrenatural', Thriller: 'Thriller', Suspense: 'Suspense', Isekai: 'Isekai', 'Martial Arts': 'Artes marciais' };
// os ranks: cada um pede tudo o que está na lista (os de cima são raríssimos)
const REQN = { eps: 'episódios vistos', fim: 'séries terminadas', gen: 'géneros diferentes', notas: 'animes com nota', filmes: 'filmes vistos', pursuit: 'pontos no Pursuit' };
const RANKS = [{ r: 'E', n: 'Despertado', c: '#9ca3af', q: {} }, { r: 'D', n: 'Aprendiz', c: '#22c55e', q: { eps: 100, fim: 5 } },
  { r: 'C', n: 'Guerreiro', c: '#3b82f6', q: { eps: 400, fim: 15, gen: 5 } }, { r: 'B', n: 'Elite', c: '#a855f7', q: { eps: 1000, fim: 30, gen: 7, notas: 15 } },
  { r: 'A', n: 'Mestre', c: '#f59e0b', q: { eps: 2500, fim: 60, gen: 9, notas: 40, filmes: 5 } }, { r: 'S', n: 'Lenda', c: '#ef4444', q: { eps: 5000, fim: 120, gen: 11, notas: 80, filmes: 15 } },
  { r: 'SS', n: 'Imortal', c: '#f43f5e', q: { eps: 9000, fim: 220, gen: 13, notas: 150, filmes: 30, pursuit: 800 } }, { r: 'SSS', n: 'Divindade', c: '#fde047', q: { eps: 15000, fim: 400, gen: 15, notas: 300, filmes: 60, pursuit: 3000 } }];
// títulos raros
const TIT = [['Navegador dos Mil Episódios', 'uma série com 1000 episódios vistos', s => s.maxEp >= 1000], ['O Insone', '5000 episódios no total', s => s.eps >= 5000],
  ['Coração de Pedra', '30 notas com média abaixo de 6,5', s => s.notas >= 30 && s.med < 6.5], ['Alma Generosa', '30 notas com média acima de 8,8', s => s.notas >= 30 && s.med > 8.8],
  ['Colecionador Infinito', '100 animes em Quero ver', s => s.quero >= 100], ['Cinéfilo Supremo', '50 filmes vistos', s => s.filmes >= 50], ['Sem Piedade', '25 animes largados', s => s.larg >= 25],
  ['Mestre dos Mil Estilos', '15 géneros diferentes', s => s.gen >= 15], ['Viajante do Tempo', 'animes de 5 décadas diferentes', s => s.dec >= 5], ['Arqueólogo', '20 animes de antes de 1995 terminados', s => s.velhos >= 20],
  ['Caçador do Pursuit', '500 pontos no Pursuit', s => s.pursuit >= 500], ['Fiel à Temporada', '30 animes terminados no ano em que estrearam', s => s.temp >= 30]];
const visto = a => a.status === 'Visto' ? Math.max(+a.ep || 0, +a.eps || 0) : +a.ep || 0;
const pursuitPts = () => { try { const r = OS.Social && OS.Social._S && OS.Social._S.rank; return r && r.eu ? { p: +r.eu.p || 0, pos: +r.eu.pos || 0 } : { p: 0, pos: 0 }; } catch (e) { return { p: 0, pos: 0 }; } };
const stats = X => { const notas = X.filter(a => +a.nota).map(a => +a.nota), G = new Set(), dec = new Set(); X.filter(a => visto(a) > 0).forEach(a => { (a.gen || []).forEach(g => G.add(g)); if (+a.y) dec.add(Math.floor(+a.y / 10)); });
  const fim = X.filter(a => a.status === 'Visto'); return { eps: U.sum(X, visto), fim: fim.length, gen: G.size, notas: notas.length, med: notas.length ? U.sum(notas, x => x) / notas.length : 0, filmes: fim.filter(a => a.fmt === 'MOVIE').length,
    pursuit: pursuitPts().p, maxEp: Math.max(0, ...X.map(visto)), quero: X.filter(a => a.status === 'Quero ver').length, larg: X.filter(a => a.status === 'Larguei').length, dec: dec.size,
    velhos: fim.filter(a => +a.y && +a.y < 1995).length, temp: fim.filter(a => +a.y && a.end && String(a.end).slice(0, 4) === String(a.y)).length }; };
const rankDe = s => { let i = 0; RANKS.forEach((R, k) => { if (Object.entries(R.q).every(([q, v]) => (s[q] || 0) >= v)) i = k; }); return i; };
const classe = () => { const X = L().filter(a => a.status !== 'Larguei' || (+a.ep || 0) > 2); if (!X.length) return null;
  const g = {}; X.forEach(a => { const w = (a.status === 'Visto' ? 2 : a.status === 'A ver' ? 1.5 : .6) * (+a.nota ? .5 + (+a.nota) / 10 : 1); (a.gen || []).forEach(x => { g[x] = (g[x] || 0) + w; }); });
  const sc = CLS.map(c => [c, c[1].reduce((s, x) => s + (g[x] || 0), 0) / Math.sqrt(c[1].length)]).sort((a, b) => b[1] - a[1]), c0 = sc[0][1] > 0 ? sc[0][0] : CLS[4];
  const c1 = sc[1] && sc[1][1] >= sc[0][1] * .72 && sc[0][1] > 0 ? sc[1][0] : null, hk = c1 ? [c0[0], c1[0]].sort().join('+') : '', h = hk && HIB[hk];
  const gs = Object.entries(g).sort((a, b) => b[1] - a[1]).map(x => x[0]), cat = gs.find(x => !c0[1].includes(x) && !(c1 && c1[1].includes(x))) || gs[0] || '';
  const s = stats(L()), ri = rankDe(s), R = RANKS[ri], nx = RANKS[ri + 1] || null;
  return { k: h ? 'hib' : c0[0], nome: h ? h[0] : c0[2], frase: h ? h[1] : c0[3], cor: h ? h[2] : c0[4], hib: !!h, base: [c0[2]].concat(c1 && h ? [c1[2]] : []), cat: GEN[cat] || cat,
    rank: R, ri, prox: nx ? { R: nx, req: Object.entries(nx.q).map(([q, v]) => ({ q, n: REQN[q], v, tem: s[q] || 0 })) } : null,
    nivel: 'Rank ' + R.r, eps: s.eps, s, titulos: TIT.filter(t => t[2](s)).map(t => t[0]), traços: TIT.filter(t => t[2](s)).map(t => t[0]) };
};
const emblema = (k, cor, sz = 44) => `<svg class="ar-emb" viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true"><path d="${EMB[k] || EMB.hib}" fill="none" stroke="${cor || 'currentColor'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const selo = (c, sz) => c ? `<span class="ar-cl ${sz || ''}" style="--cl:${c.cor}"><b>${esc(c.nome)}</b><small>${esc(c.nivel)} · ${esc(c.rank.n)}</small></span>` : '';
// a janela do Recap: de 1 de dezembro a 15 de janeiro (o Recap é do ano que acaba)
const hoje = () => (window.__rxData ? new Date(window.__rxData) : new Date());   // (os testes podem simular a data)
const janela = (d = hoje()) => { const m = d.getMonth(), y = d.getFullYear(); if (m === 11) return { y, aberto: true }; if (m === 0 && d.getDate() <= 15) return { y: y - 1, aberto: true };
  const abre = new Date(y, 11, 1), dias = Math.ceil((abre - d) / 864e5); return { y, aberto: false, abre, dias }; };
const adm = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
const ctaRecap = () => { const j = janela(); return j.aberto ? `<button type="button" class="btn ar-go" data-act="arRecap"><span>${UI.ic('play')}O meu Recap ${j.y}</span></button>`
  : `<div class="ar-lock"><b>O Recap ${j.y} abre a 1 de dezembro</b><span>${j.dias === 1 ? 'Falta 1 dia' : 'Faltam ' + j.dias + ' dias'}. Até lá, cada episódio que vês conta.</span>${adm() ? '<button type="button" class="btn sm ghost" data-act="arRecap" data-prev="1">Pré-visualizar (administração)</button>' : ''}</div>`; };
const bloco = () => { const c = classe(); if (!c) return `<div class="so-sec ar-bl"><h3>A tua classe de fã</h3><p class="mut" style="margin:0">Junta animes à tua lista (os que vês e já viste) e o Prumo diz-te que tipo de fã és e o teu rank.</p></div>`;
  const nx = c.prox, pc = nx ? Math.round(U.sum(nx.req, x => Math.min(1, x.tem / x.v)) / nx.req.length * 100) : 100;
  return `<div class="so-sec ar-bl"><h3>A tua classe de fã</h3><div class="ar-big" style="--cl:${c.cor};--rk:${c.rank.c}"><div class="ar-bh">${emblema(c.k, '#fff', 40)}<span class="ar-rk"><b>${c.rank.r}</b><small>${esc(c.rank.n)}</small></span></div>
      <b>${esc(c.nome)}</b>${c.hib ? `<em class="ar-hb">Classe híbrida · ${c.base.map(esc).join(' + ')}</em>` : ''}<p>${esc(c.frase)}</p><span>${nf(c.eps)} episódios · ${c.s.fim} séries terminadas${c.cat ? ' · categoria ' + esc(c.cat) : ''}</span>
      ${nx ? `<div class="ar-nx"><div class="ar-nxh"><span>Para o Rank ${nx.R.r} · ${esc(nx.R.n)}</span><b>${pc}%</b></div><ul>${nx.req.map(x => `<li class="${x.tem >= x.v ? 'ok' : ''}"><span>${nf(Math.min(x.tem, x.v))}/${nf(x.v)} ${esc(x.n)}</span><i style="width:${Math.min(100, Math.round(x.tem / x.v * 100))}%"></i></li>`).join('')}</ul></div>` : '<p class="ar-max">Chegaste ao topo: Rank SSS. Muito pouca gente vê isto.</p>'}
      <div class="ar-tt"><small>Títulos raros · ${c.titulos.length} de ${TIT.length}</small><div class="ar-tr">${TIT.map(t => c.titulos.includes(t[0]) ? `<i>${esc(t[0])}</i>` : `<i class="off" title="${esc(t[1])}">${esc(t[0])}<s>${esc(t[1])}</s></i>`).join('')}</div></div></div>
    ${ctaRecap()}</div>`; };
// manda a classe ao servidor (ranking e perfil), no máximo uma vez por dia ou quando muda
const enviar = () => { const c = classe(); if (!c || !OS.Social || !OS.Social.call || !(OS.Acc && OS.Acc.token && OS.Acc.token())) return; const v = c.nome + '|' + c.nivel, k = 'oc_ar_cls';
  const o = U.ls.get(k, {}) || {}; if (o.v === v && Date.now() - (o.at || 0) < 864e5) return; U.ls.set(k, { v, at: Date.now() }); OS.Social.call('classe', { nome: c.nome, nivel: c.nivel }).catch(() => { }); };

/* =================== o Recap =================== */
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const dados = (y) => { const X = L(), noAno = a => [a.start, a.end].some(d => String(d || '').slice(0, 4) === String(y)) || (a._u && new Date(a._u).getFullYear() === y && (+a.ep || 0) > 0) || (a.status === 'A ver');
  const A0 = X.filter(noAno), eps = U.sum(A0, visto), min = U.sum(A0, a => visto(a) * (+a.dur || 24)), g = {}, st = {}, ms = Array(12).fill(0);
  A0.forEach(a => { (a.gen || []).forEach(x => { g[x] = (g[x] || 0) + Math.max(1, visto(a)); }); if (a.stu) st[a.stu] = (st[a.stu] || 0) + 1;
    const d = [a.end, a.start, a._u ? new Date(a._u).toISOString() : ''].find(x => String(x || '').slice(0, 4) === String(y)); if (d) ms[+String(d).slice(5, 7) - 1] += Math.max(1, visto(a)); });
  const gT = U.sum(Object.values(g), v => v) || 1, G = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({ k, n: GEN[k] || k, p: Math.round(v / gT * 100) }));
  const top = A0.slice().sort((a, b) => (+b.nota || 0) - (+a.nota || 0) || visto(b) - visto(a)).slice(0, 5), stu = Object.entries(st).sort((a, b) => b[1] - a[1])[0], mm = ms.indexOf(Math.max(...ms));
  return { y, n: A0.length, eps, h: Math.round(min / 60), G, top, stu: stu ? stu[0] : '', mes: Math.max(...ms) ? MES[mm] : '', mi: mm, ms, vistos: A0.filter(a => a.status === 'Visto').length, pu: pursuitPts(), imgs: A0.filter(a => a.img).sort((a, b) => visto(b) - visto(a)).map(a => a.img).slice(0, 30) }; };
const GCOR = { Action: '#ff3b30', Adventure: '#f59e0b', Comedy: '#facc15', Drama: '#ec4899', Fantasy: '#8b5cf6', Horror: '#b91c1c', Mystery: '#7c5cff', Psychological: '#6366f1', Romance: '#ff3d8b', 'Sci-Fi': '#06b6d4', 'Slice of Life': '#22c55e', Sports: '#f97316', Supernatural: '#a855f7', Thriller: '#64748b', Mecha: '#94a3b8', Music: '#eab308' };

// --- motor de partículas (um canvas no palco; pára sozinho quando não há nada a mexer) ---
const FX = (() => { let cv = null, g = null, st = null, W = 0, H = 0, P = [], R = [], raf = 0, on = false;
  const red = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const fit = () => { if (!cv || !st) return; W = st.clientWidth || innerWidth; H = st.clientHeight || innerHeight; const d = Math.max(.75, Math.min(2, window.devicePixelRatio || 1, Math.sqrt(1.6e6 / Math.max(1, W * H))));   /* ecrã grande: menos píxeis no canvas (não trava) */ cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
  const loop = () => { g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (let i = R.length - 1; i >= 0; i--) { const r = R[i]; r.t++; const k = r.t / r.d; if (k >= 1) { R.splice(i, 1); continue; } const rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3));
      g.strokeStyle = r.c; g.globalAlpha = (1 - k) * .85; g.lineWidth = r.w * (1 - k) + 1; g.beginPath(); g.arc(r.x, r.y, rad, 0, 6.2832); g.stroke(); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.vx *= p.fr; p.vy = p.vy * p.fr + p.gr; p.x += p.vx; p.y += p.vy; p.l -= p.dl; if (p.l <= 0) { P.splice(i, 1); continue; } g.globalAlpha = Math.min(1, p.l * 1.5);
      if (p.k === 'spark') { g.strokeStyle = p.c; g.lineWidth = p.s; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 3.2, p.y - p.vy * 3.2); g.stroke(); }
      else if (p.k === 'conf') { p.a += p.va; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.s, -p.s * .4, p.s * 2, p.s * .8); g.restore(); }
      else { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, Math.max(.5, p.s * p.l), 0, 6.2832); g.fill(); } }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; raf = (P.length || R.length) && on ? requestAnimationFrame(loop) : 0; if (!raf) g.clearRect(0, 0, W, H); };
  const go = () => { if (on && !raf) raf = requestAnimationFrame(loop); };
  const add = p => { if (P.length < 460) P.push(p); };
  return { get on() { return on; }, W: () => W, H: () => H, off: () => { const r = st ? st.getBoundingClientRect() : { left: 0, top: 0 }; return [r.left, r.top]; },
    init(c, stage) { cv = c; st = stage; g = c.getContext('2d'); on = !red(); fit(); addEventListener('resize', fit); },
    stop() { on = false; cancelAnimationFrame(raf); raf = 0; P = []; R = []; removeEventListener('resize', fit); cv = null; st = null; },
    burst(x, y, o = {}) { if (!on) return; const n = o.n || 90, C = o.c || ['#ffffff'], sp = o.sp || 10; for (let i = 0; i < n; i++) { const a = Math.random() * 6.2832, v = sp * (.25 + Math.random() * .95);
        add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), fr: o.fr || .95, gr: o.gr != null ? o.gr : .14, l: 1, dl: .009 + Math.random() * .013, s: (o.s || 2.6) * (.5 + Math.random()), c: C[i % C.length], k: o.k || (i % 3 ? 'spark' : 'dot'), a: Math.random() * 6, va: (Math.random() - .5) * .35 }); } go(); },
    ring(x, y, c = '#ffffff', w = 16, d = 44) { if (!on) return; R.push({ x, y, r0: 8, r1: Math.max(W, H) * .75, w, c, t: 0, d }); go(); },
    conf(n = 150, C = ['#fff']) { if (!on) return; for (let i = 0; i < n; i++) add({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 2.5, vy: 2 + Math.random() * 4, fr: .995, gr: .05, l: 1, dl: .004 + Math.random() * .004, s: 4 + Math.random() * 4, c: C[i % C.length], k: 'conf', a: Math.random() * 6, va: (Math.random() - .5) * .3 }); go(); },
    implode(x, y, C = ['#fff'], n = 80, fr = 46) { if (!on) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.2832, r = Math.max(W, H) * (.35 + Math.random() * .4), f = fr * (.7 + Math.random() * .3);
        add({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r / f, vy: -Math.sin(a) * r / f, fr: 1, gr: 0, l: 1, dl: 1 / f, s: 1.6 + Math.random() * 2, c: C[i % C.length], k: 'spark' }); } go(); } }; })();

// --- a banda sonora (original, feita no momento pelo telemóvel): pad, batida, baixo e arpejos; impactos, subidas e cortes ---
// v3.88 · a banda sonora do Recap (feita no próprio aparelho, sem ficheiros): cada ecrã tem a sua parte da música e os seus efeitos.
// Abertura com caixinha de música e o coração a bater antes do ano; contagens que sobem em notas; o género com batida e o tema;
// cartas a virar nos teus 5; o ano mês a mês tocado como melodia; o Pursuit em som de jogo antigo; o rank com tensão e fanfarra;
// a classe com coro e tambores; e o final com fogo de artifício (assobio e estalidos). As explosões são acordes, não só "pum".
const SOM = (() => { let ac = null, out = null, mix = null, rev = null, dly = null, NB = null, on = true, play = false, step = 0, nextT = 0, tm = 0, nv = 0, sec = 'abre';
  const bpm = 108; try { on = localStorage.getItem('oc_rx_som') !== '0'; } catch (e) { }
  const mf = m => 440 * Math.pow(2, ((Number.isFinite(+m) ? +m : 72) - 69) / 12);   // uma nota que falte (dados vazios) nunca vira NaN no áudio
  const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // lá menor, fá, dó, sol (a progressão das aberturas de anime)
  const MEL = [[[0, 76, 3], [3, 76, 3], [6, 74, 2], [8, 72, 2], [10, 74, 2], [12, 76, 2], [14, 79, 2]], [[0, 81, 4], [4, 79, 2], [6, 77, 2], [8, 76, 4], [12, 72, 4]],
    [[0, 76, 3], [3, 79, 3], [6, 84, 2], [8, 83, 2], [10, 79, 2], [12, 76, 4]], [[0, 74, 4], [4, 79, 2], [6, 83, 2], [8, 81, 3], [11, 79, 2], [13, 74, 3]]];   // o tema: [passo, nota, duração]
  const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
  const ctx = () => { try { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C();
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; out = ac.createGain(); out.gain.value = on ? .55 : 0; out.connect(comp); comp.connect(ac.destination); mix = ac.createGain(); mix.connect(out);
        rev = ac.createConvolver(); const L = ac.sampleRate * 2.2 | 0, ib = ac.createBuffer(2, L, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3); } rev.buffer = ib; const rg = ac.createGain(); rg.gain.value = .3; rev.connect(rg); rg.connect(out);
        dly = ac.createDelay(1); dly.delayTime.value = 60 / bpm * .75; const fb = ac.createGain(); fb.gain.value = .3; const dg = ac.createGain(); dg.gain.value = .26; dly.connect(fb); fb.connect(dly); dly.connect(dg); dg.connect(out);
        const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NB = b; }
      if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; } };
  // peças: oscilador e ruído com envolvente, filtro e envio para o eco e a sala
  const send = (n, r, e) => { n.connect(mix); if (r) { const g = ac.createGain(); g.gain.value = r; n.connect(g); g.connect(rev); } if (e) { const g = ac.createGain(); g.gain.value = e; n.connect(g); g.connect(dly); } };
  const osc = (t, f, dur, type, vol, o = {}) => { if (![t, f, dur, vol].every(Number.isFinite) || f <= 0) return null; const s = ac.createOscillator(), g = ac.createGain(); s.type = type; s.frequency.setValueAtTime(f, t); if (o.det) s.detune.value = o.det; if (o.slide) s.frequency.exponentialRampToValueAtTime(o.slide, t + dur * .9);
    let last = s; if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = o.bp ? 'bandpass' : 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2, t + (o.lpT || dur)); if (o.q) fl.Q.value = o.q; s.connect(fl); last = fl; }
    const a = o.a || .01; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0005, t + Math.max(a + .03, dur)); last.connect(g); send(g, o.r, o.e); s.start(t); s.stop(t + dur + .1); return s; };
  const ruido = (t, dur, f, type, vol, o = {}) => { if (![t, dur, f, vol].every(Number.isFinite)) return null; const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = NB; s.loop = dur > .9; fl.type = type; fl.frequency.setValueAtTime(f, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur); if (o.q) fl.Q.value = o.q;
    if (o.in) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .92); } else g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur); s.connect(fl); fl.connect(g); send(g, o.r, o.e); s.start(t); s.stop(t + dur + .05); };
  // instrumentos
  const sino = (t, m, v = .06, d = 1.6) => { osc(t, mf(m), d, 'sine', v, { r: .5, e: .2 }); osc(t, mf(m) * 2.76, d * .35, 'sine', v * .35, { r: .4 }); osc(t, mf(m) * 5.4, d * .15, 'sine', v * .16, { r: .3 }); };
  const marimba = (t, m, v = .1) => { osc(t, mf(m), .45, 'sine', v, { r: .25 }); osc(t, mf(m) * 4, .07, 'sine', v * .22); };
  const pluck = (t, m, v = .05) => osc(t, mf(m), .32, 'sawtooth', v, { lp: 3200, lp2: 500, lpT: .25, e: .25, r: .15 });
  const lead = (t, m, d, v = .055) => { [osc(t, mf(m), d, 'square', v * .6, { lp: 2600, a: .02, e: .35, r: .25 }), osc(t, mf(m), d, 'sawtooth', v * .5, { det: 9, lp: 2200, a: .02, e: .3, r: .2 })].forEach(s => { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = 7; l.connect(lg); lg.connect(s.detune); l.start(t + .12); l.stop(t + d + .1); }); };
  const pad = (t, ch, d, v = .016, br = 1200) => ch.forEach(n => [-7, 7].forEach(dt => osc(t, mf(n), d, 'sawtooth', v, { lp: br, a: .6, r: .45, det: dt })));
  const coro = (t, ch, d, v = .022) => ch.forEach(n => [-6, 6].forEach(dt => { osc(t, mf(n), d, 'sawtooth', v, { lp: 800, bp: 1, q: 6, a: .45, det: dt, r: .6 }); osc(t, mf(n), d, 'sawtooth', v * .6, { lp: 1200, bp: 1, q: 8, a: .45, det: -dt, r: .6 }); }));
  const rhodes = (t, ch, d, v = .045) => ch.forEach((n, i) => { osc(t + i * .012, mf(n), d, 'sine', v, { r: .3 }); osc(t + i * .012, mf(n) * 2, d * .4, 'triangle', v * .28, { r: .2 }); });
  const baixo = (t, m, d, v = .13) => { osc(t, mf(m), d, 'sine', v); osc(t, mf(m), d, 'sawtooth', v * .22, { lp: 420 }); };
  const kick = (t, v = .6) => { const s = ac.createOscillator(), g = ac.createGain(); s.frequency.setValueAtTime(130, t); s.frequency.exponentialRampToValueAtTime(42, t + .16); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); s.connect(g); g.connect(mix); s.start(t); s.stop(t + .32); };
  const palmas = (t, v = .2) => { [0, .012, .024].forEach(o => ruido(t + o, .07, 1400, 'bandpass', v, { q: 1.4 })); ruido(t + .03, .2, 1200, 'bandpass', v * .45, { q: 1, r: .5 }); };
  const chimbal = (t, v = .045, ab) => ruido(t, ab ? .22 : .04, 9000, 'highpass', v);
  const shaker = (t, v = .03) => ruido(t, .06, 6500, 'bandpass', v, { q: 2 });
  const taiko = (t, v = .5) => { osc(t, 92, .5, 'sine', v, { slide: 48, r: .4 }); ruido(t, .12, 400, 'lowpass', v * .4, { r: .3 }); };
  const coracao = (t, v = .28) => { osc(t, 58, .22, 'sine', v, { slide: 40 }); osc(t + .2, 52, .26, 'sine', v * .7, { slide: 36 }); };
  const vinil = (t, d) => { for (let i = 0; i < d * 8; i++) ruido(t + Math.random() * d, .006, 3000 + Math.random() * 4000, 'bandpass', .04 + Math.random() * .05, { q: 4 }); };
  const chip = (t, m, d, v = .03) => osc(t, mf(m), d, 'square', v, { e: .1 });
  // cada parte da música, passo a passo (16 passos por compasso)
  const SEC = {
    abre: (s, b, ch, t, q) => { if (s === 0) pad(t, ch, q * 16, .013, 900); if (s % 4 === 0) sino(t, PENTA[[7, 9, 8, 10][b] + (s % 8 ? 2 : 0)], .045, 1.8);
      if (nv >= 1) { if (s === 0 || s === 8) kick(t, .5); if (s % 2 === 1) shaker(t); if (s === 4 || s === 12) palmas(t, .13); if (s % 8 === 0) baixo(t, ch[0] - 24, q * 6); } else if (s === 0 || s === 8) coracao(t, .2); },
    conta: (s, b, ch, t, q) => { if (s === 0) pad(t, ch, q * 16, .011, 1100); if (s % 2 === 0) marimba(t, ch[(s / 2) % 3] + 12 + (s >= 8 ? 12 : 0), .06);
      if (nv >= 1) { if (s % 8 === 0) kick(t, .45); if (s === 4 || s === 12) palmas(t, .11); if (s % 4 === 2) chimbal(t, .035); if (s === 0 || s === 6 || s === 10) baixo(t, ch[0] - 24, q * 3); } },
    drop: (s, b, ch, t, q) => { if (s === 0) pad(t, ch, q * 16, .014, 1800); if (s % 4 === 0) kick(t, .55); if (s === 4 || s === 12) palmas(t, .18); chimbal(t, s % 4 === 2 ? .05 : .025, s % 4 === 2);
      if ([0, 3, 6, 10, 12].includes(s)) baixo(t, ch[0] - 24 + (s === 10 ? 7 : 0), q * 2.5); MEL[b].forEach(([p, m, d]) => { if (p === s) lead(t, m, q * d); }); if (s % 2 === 1) pluck(t, ch[(s >> 1) % 3] + 12, .025); },
    top: (s, b, ch, t, q) => { if (s === 0) rhodes(t, ch.map(n => n + 12), q * 14, .04); if (s % 8 === 0) kick(t, .4); if (s === 8) palmas(t, .1); if (s % 2 === 1) shaker(t, .025); if (s === 0 || s === 10) baixo(t, ch[0] - 24, q * 4);
      if (nv >= 2) MEL[b].forEach(([p, m, d]) => { if (p === s) lead(t, m, q * d, .05); }); },
    calmo: (s, b, ch, t, q) => { if (s === 0) { rhodes(t, ch.map(n => n + 12), q * 15, .045); vinil(t, q * 16); } if (s === 0 || s === 10) kick(t, .35); if (s === 8) ruido(t, .12, 2200, 'bandpass', .1, { r: .3 }); if (s % 4 === 2) chimbal(t, .02); if (s === 0) baixo(t, ch[0] - 24, q * 8, .09); },
    jogo: (s, b, ch, t, q) => { chip(t, ch[s % 3] + 24, q * .9, .025); if (s % 4 === 0) chip(t, ch[0] - 12, q * 2, .045); if (s % 8 === 0) kick(t, .4); if (s === 4 || s === 12) ruido(t, .06, 5000, 'highpass', .07); },
    rank: (s, b, ch, t, q) => { if (s === 0) pad(t, [ch[0] - 12, ch[0] - 5], q * 16, .018, 500);
      if (nv < 1) { if (s === 0 || s === 8) coracao(t, .26); if (s % 2 === 0 && b % 2 === 1) taiko(t, .08 + s * .012); }
      else { if (s % 4 === 0) kick(t, .55); if (s === 4 || s === 12) palmas(t, .16); chimbal(t, .035, s % 4 === 2); if (s % 4 === 0) baixo(t, ch[0] - 24, q * 3); if (s % 2 === 0) pluck(t, ch[(s >> 1) % 3] + 24, .03); } },
    classe: (s, b, ch, t, q) => { if (s === 0) coro(t, ch, q * 16, .02); if ([0, 6, 8, 11, 14].includes(s)) taiko(t, s === 0 ? .5 : .3); if (s % 4 === 0) baixo(t, ch[0] - 24, q * 4, .11); if (nv >= 1 && s % 4 === 2) sino(t, ch[1] + 24, .03, 1.2); },
    carta: (s, b, ch, t, q) => { if (s === 0) pad(t, ch, q * 16, .011, 1500); if (s % 2 === 0) sino(t, PENTA[(s / 2 + b * 2) % PENTA.length] + 12, .028, 1.2); },
    fim: (s, b, ch, t, q) => { SEC.drop(s, b, ch, t, q); if (s === 0 && b === 0) ruido(t, 1.6, 7000, 'highpass', .1, { r: .5 }); } };
  const sched = () => { if (!play || !ac) return; const q = 60 / bpm / 4;
    while (nextT < ac.currentTime + .2) { const s = step % 16, b = Math.floor(step / 16) % 4; try { (SEC[sec] || SEC.abre)(s, b, CH[b], nextT, q); } catch (e) { } nextT += q; step++; }
    tm = setTimeout(sched, 50); };
  const T = () => ac.currentTime, CHA = () => CH[Math.floor(step / 16) % 4];
  return { get on() { return on; }, get secao_() { return sec; },
    start() { if (!ctx()) return; play = true; step = 0; nv = 0; sec = 'abre'; nextT = ac.currentTime + .05; clearTimeout(tm); sched(); },
    stop() { play = false; clearTimeout(tm); if (ac) { try { out.gain.setTargetAtTime(0, ac.currentTime, .12); const a = ac; setTimeout(() => { try { a.close(); } catch (e) { } }, 600); } catch (e) { } } ac = null; },
    nivel(n) { nv = n; },
    secao(k) { if (k && k !== sec) { sec = k; step = 0; } },
    // a explosão é um acorde: grave que cai, sopro de ar e o acorde da música (com sinos no forte)
    impacto(forte) { if (!ac) return; const t = T(), ch = CHA(); kick(t, .7); osc(t, 70, forte ? 1.1 : .6, 'sine', .4, { slide: 32 }); ruido(t, forte ? 1.2 : .6, 2400, 'lowpass', forte ? .3 : .2, { f2: 300, r: .6 });
      ch.concat(ch.map(n => n + 12)).forEach(n => osc(t, mf(n), forte ? 1.4 : .8, 'sawtooth', .028, { lp: 3500, lp2: 700, lpT: .5, r: .5 })); if (forte) [84, 88, 91, 96].forEach((m, i) => sino(t + .08 + i * .06, m, .03, 1.4)); },
    // a subida: ruído a abrir, um tom a subir e uma tarola a acelerar
    subida(seg = 1.4) { if (!ac) return; const t = T(); ruido(t, seg, 400, 'bandpass', .2, { f2: 8000, q: 2, in: 1, r: .3 }); osc(t, mf(48), seg, 'sawtooth', .022, { slide: mf(72), lp: 600, lp2: 4000, lpT: seg, a: seg * .8 });
      const n = Math.round(seg * 9); for (let i = 0; i < n; i++) { const k = i / n; palmas(t + seg * (1 - Math.pow(1 - k, 1.8)), .025 + k * .08); } },
    corte() { if (!ac) return; ruido(T(), .4, 3200, 'bandpass', .2, { f2: 300, q: 1.2, r: .3 }); },
    // as contagens sobem em notas (no Pursuit, moedas)
    tique(k) { if (!ac) return; const t = T(); if (sec === 'jogo') { chip(t, 83, .05, .03); chip(t + .05, 88, .09, .03); return; } marimba(t, PENTA[Math.max(0, Math.min(PENTA.length - 1, Math.floor((Number.isFinite(k) ? k : Math.random()) * PENTA.length)))] + 12, .055); },
    brilho() { if (!ac) return; const t = T(); PENTA.slice(4).forEach((m, i) => osc(t + i * .035, mf(m + 12), .6, 'triangle', .03, { r: .5, e: .2 })); [88, 91, 96].forEach((m, i) => sino(t + .4 + i * .08, m, .03, 1.6)); },
    pop() { if (!ac) return; const t = T(); osc(t, 700, .12, 'sine', .12, { slide: 1500 }); sino(t + .05, 91, .04, 1); },
    // a carta a virar (os teus 5): um estalo e uma nota que sobe a cada anime
    vira(i = 0) { if (!ac) return; const t = T(); ruido(t, .09, 2500, 'bandpass', .14, { f2: 900, q: 1.5 }); pluck(t + .03, [72, 74, 76, 79, 81][i % 5], .06); },
    // o teu ano tocado como melodia: cada mês uma nota (mais episódios, nota mais alta)
    melodia(ms) { if (!ac || !ms) return; ms = ms.map(v => Math.max(0, +v || 0)); const t = T(), mx = Math.max(1, ...ms); ms.forEach((v, i) => { const m = PENTA[Math.min(PENTA.length - 1, Math.round(v / mx * 10) + 2)]; marimba(t + i * .16, m, v ? .07 : .03); if (v === mx && v) sino(t + i * .16, m + 12, .04, 1.4); }); },
    // o rank: fanfarra de metais e um prato
    fanfarra() { if (!ac) return; const t = T(); [[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]].forEach((ch, i) => ch.forEach(n => osc(t + i * .22, mf(n), i === 2 ? 1.6 : .22, 'sawtooth', .035, { lp: 900, lp2: 3200, lpT: .12, r: .45 }))); ruido(t + .44, 1.8, 6000, 'highpass', .12, { r: .5 }); taiko(t + .44, .4); },
    // a classe: o coro abre e o gongo
    coroHit() { if (!ac) return; const t = T(); coro(t, [57, 64, 69, 72], 2.4, .03); osc(t, 55, 3, 'sine', .3, { r: .6 }); osc(t, 55 * 2.7, 2, 'sine', .06, { r: .6 }); ruido(t, 2, 900, 'bandpass', .06, { q: .7, r: .6 }); taiko(t, .55); },
    // fogo de artifício: o assobio a subir e o rebentamento com estalidos
    fogo(i = 0) { if (!ac) return; const t = T(); osc(t, 800 + i * 40, .5, 'sine', .035, { slide: 2600 + i * 80, r: .3 }); ruido(t + .5, .5, 1800, 'lowpass', .16, { r: .5 }); for (let k = 0; k < 9; k++) ruido(t + .55 + Math.random() * .7, .02, 4000 + Math.random() * 3000, 'bandpass', .05, { q: 3, r: .3 }); },
    alterna() { on = !on; try { localStorage.setItem('oc_rx_som', on ? '1' : '0'); } catch (e) { } if (ac && out) out.gain.setTargetAtTime(on ? .55 : 0, ac.currentTime, .05); return on; } }; })();

const vib = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } };
const impacto = (el, x, y, cores, forte) => { if (!el) return; const sec = el.querySelector('.rx-s.on') || el; el.classList.remove('rx-flash'); sec.classList.remove('rx-shake'); void el.offsetWidth; el.classList.add('rx-flash'); sec.classList.add('rx-shake'); FX.ring(x, y, cores[0], forte ? 22 : 14); if (forte) setTimeout(() => FX.ring(x, y, '#ffffff', 10, 36), 90);
  FX.burst(x, y, { n: forte ? 170 : 95, c: cores.concat('#ffffff'), sp: forte ? 15 : 10 }); SOM.impacto(forte); vib(forte ? [40, 30, 70] : 35); };
const conta = (el, ate, ms, fim) => { if (!el) return; if (!FX.on) { el.textContent = nf(ate); if (fim) fim(); return; } const t0 = performance.now(); let lt = 0;
  const f = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(2, -10 * k); el.textContent = nf(Math.round(ate * (k >= 1 ? 1 : e))); if (t - lt > 70 && k < .97) { SOM.tique(e); lt = t; } if (k < 1 && document.body.contains(el)) requestAnimationFrame(f); else if (fim) fim(); }; requestAnimationFrame(f); };
const parede = imgs => { if (!imgs.length) return ''; const L = []; while (L.length < 28) L.push(...imgs); return `<div class="rx-wall" aria-hidden="true">${[0, 1, 2, 3].map(r => `<div class="rx-wr" style="--d:${r % 2 ? -1 : 1}">${L.slice(r * 7, r * 7 + 7).concat(L.slice(r * 7, r * 7 + 7)).map(u => `<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" loading="eager">`).join('')}</div>`).join('')}</div>`; };
const letreiro = t => `<div class="rx-mq" aria-hidden="true">${[0, 1, 2, 3, 4].map(r => `<div class="rx-mr${r % 2 ? ' inv' : ''}"><span>${Array(8).fill(esc(t)).join(' · ')} · </span><span>${Array(8).fill(esc(t)).join(' · ')} · </span></div>`).join('')}</div>`;

// --- os ecrãs: html, duração, fundo (poster), a música de cada um e a coreografia ---
const ecras = (d, c) => { const nome = OS.Social && OS.Social.nome ? OS.Social.nome() : 'PHANTOM', S = [], cc = c ? c.cor : '#ff3d8b', ouro = ['#fde047', '#f59e0b', '#ffffff'], img0 = (d.top.find(a => a.img) || {}).img || '';
  const mid = (el, sel) => { const e = el.querySelector(sel), [ox, oy] = FX.off(); if (!e) return [FX.W() / 2, FX.H() / 2]; const r = e.getBoundingClientRect(); return [r.left - ox + r.width / 2, r.top - oy + r.height / 2]; };
  S.push({ dur: 6400, c1: '#12081f', c2: '#3b0a45', mus: 0, sec: 'abre', html: `<div class="rx-in"><span class="rx-fio" aria-hidden="true"></span><p class="rx-pre">${OS.Parceria ? OS.Parceria.mini() : ''}<span>Prumo &amp; ${esc(nome)} apresentam</span></p><h1 class="rx-tt"><span class="w1">O teu</span><span class="w2">${d.y}</span><span class="w3">em animes</span></h1><p class="rx-tap">Toca para avançar · segura para parar</p><button type="button" class="rx-recb" data-act="arGravar">${UI.ic('play')}Gravar para as redes</button></div>`,
    go: (el, T, R) => { T(() => SOM.subida(1.1), 100); T(() => { const [x, y] = mid(el, '.w2'); impacto(R, x, y, ouro.concat(cc), true); SOM.nivel(1); }, 1250); T(() => FX.burst(FX.W() * .2, FX.H() * .3, { n: 60, c: ouro }), 2300); T(() => FX.burst(FX.W() * .8, FX.H() * .35, { n: 60, c: [cc, '#fff'] }), 2700); } });
  const dias = Math.floor(d.h / 24), voos = Math.floor(d.h / 14);
  S.push({ dur: 8400, c1: '#07112a', c2: '#1d4ed8', mus: 1, sec: 'conta', html: `${parede(d.imgs)}<div class="rx-in rx-epw"><p class="rx-k">Este ano viste</p><b class="rx-big">0</b><p class="rx-u">episódios</p>
      <ul class="rx-facts"><li><b>${nf(d.h)} horas</b> de anime</li>${dias ? `<li>Dava <b>${dias} ${dias === 1 ? 'dia' : 'dias'} seguidos</b>, sem dormir</li>` : ''}${voos ? `<li>Ou <b>${voos} ${voos === 1 ? 'voo' : 'voos'}</b> de Lisboa a Tóquio</li>` : ''}</ul></div>`,
    go: (el, T, R) => { T(() => conta(el.querySelector('.rx-big'), d.eps, 2100, () => { const [x, y] = mid(el, '.rx-big'); impacto(R, x, y, ['#60a5fa', '#a5f3fc', cc], true); el.classList.add('bum'); }), 450); } });
  if (d.G.length) { const g0 = d.G[0], gc = GCOR[g0.k] || cc, gi = (d.top.find(a => (a.gen || []).includes(g0.k) && a.img) || {}).img || img0;
    S.push({ dur: 7800, c1: '#120a1f', c2: gc, mus: 2, sec: 'drop', img: gi, html: `${letreiro(g0.n)}<div class="rx-in rx-genw"><p class="rx-k">O teu género dominante</p><b class="rx-gen">${esc(g0.n)}</b>
      <ol class="rx-bars">${d.G.map((x, i) => `<li style="--d:${1.5 + i * .35}s;--p:${x.p}%;--c:${GCOR[x.k] || cc}"><span>${esc(x.n)}</span><i></i><em data-n="${x.p}">0</em></li>`).join('')}</ol></div>`,
      go: (el, T, R) => { T(() => { const [x, y] = mid(el, '.rx-gen'); impacto(R, x, y, [gc, '#ffffff'], false); }, 900); el.querySelectorAll('.rx-bars em').forEach((e, i) => T(() => conta(e, +e.dataset.n, 900, () => { e.textContent += '%'; }), 1500 + i * 350)); } }); }
  if (d.top.length) { const um = d.top[0], resto = d.top.slice(1).reverse(), t1 = (.4 + resto.length * .55 + .5) * 1000 + 350;
    S.push({ dur: 10000, c1: '#1a0606', c2: '#7f1d1d', mus: 1, sec: 'top', img: um.img || '', html: `<div class="rx-in rx-topw"><p class="rx-k">Os teus ${d.top.length} do ano</p><ol class="rx-top">${resto.map((a, i) => `<li style="--d:${.3 + i * .55}s"><span>${d.top.length - i}</span>${a.img ? `<img src="${esc(a.img)}" alt="" referrerpolicy="no-referrer">` : '<i></i>'}<b>${esc(a.t)}</b>${+a.nota ? `<em>${a.nota}</em>` : ''}</li>`).join('')}</ol>
      <div class="rx-one" style="--d:${t1 / 1000 - .35}s"><div class="rx-rays" aria-hidden="true"></div>${um.img ? `<img src="${esc(um.img)}" alt="" referrerpolicy="no-referrer">` : ''}<div><small>O teu anime do ano</small><b>${esc(um.t)}</b>${+um.nota ? `<em>nota ${um.nota}</em>` : ''}</div></div></div>`,
      go: (el, T, R) => { resto.forEach((a, i) => T(() => SOM.vira(i), (.3 + i * .55) * 1000 + 120)); T(() => { SOM.nivel(0); SOM.subida(1.2); }, t1 - 1200); T(() => { const [x, y] = mid(el, '.rx-one img, .rx-one b'); impacto(R, x, y, ouro, true); SOM.nivel(2, true); SOM.brilho(); FX.conf(170, ['#fde047', '#f472b6', '#60a5fa', '#34d399', '#ffffff']); }, t1); } }); }
  if (d.mes || d.stu) { const mx = Math.max(1, ...d.ms);
    S.push({ dur: 7600, c1: '#04201a', c2: '#047857', mus: 1, sec: 'calmo', html: `<div class="rx-in"><p class="rx-k">O teu ano, mês a mês</p><div class="rx-ms">${d.ms.map((v, i) => `<span class="${i === d.mi && d.mes ? 'pk' : ''}" style="--h:${Math.max(4, Math.round(v / mx * 100))}%;--d:${.2 + i * .07}s"><i></i><small>${MS[i]}</small></span>`).join('')}</div>
      ${d.mes ? `<p class="rx-mx"><b>${esc(d.mes)}</b> foi o teu mês</p>` : ''}${d.stu ? `<p class="rx-stu"><small>O teu estúdio</small><b>${esc(d.stu)}</b></p>` : ''}</div>`,
      go: (el, T) => { T(() => SOM.melodia(d.ms), 350); T(() => { const pk = el.querySelector('.rx-ms .pk i'); if (pk) { const r = pk.getBoundingClientRect(), [ox, oy] = FX.off(); FX.burst(r.left - ox + r.width / 2, r.top - oy, { n: 70, c: ['#6ee7b7', '#ffffff'], sp: 8, up: 3 }); SOM.pop(); vib(25); } }, 1500); } }); }
  if (d.pu && d.pu.p > 0) S.push({ dur: 6800, c1: '#1c0f02', c2: '#b45309', mus: 1, sec: 'jogo', html: `<div class="rx-in"><p class="rx-k">No Pursuit da parceria</p><b class="rx-big">0</b><p class="rx-u">pontos</p>${d.pu.pos ? `<p class="rx-mx"><b>${d.pu.pos}.º</b> no ranking de animes</p>` : ''}</div>`,
    go: (el, T, R) => { T(() => conta(el.querySelector('.rx-big'), d.pu.p, 1600, () => { const [x, y] = mid(el, '.rx-big'); impacto(R, x, y, ouro, false); }), 400); } });
  if (c) { const rk = c.rank, nx = c.prox;
    S.push({ dur: 9000, c1: '#040308', c2: rk.c, mus: 0, sec: 'rank', html: `<div class="rx-in rx-rkw"><p class="rx-k">O teu rank de fã</p><div class="rx-rk" style="--rk:${rk.c}"><span class="rx-aura" aria-hidden="true"></span><b>${rk.r}</b></div><p class="rx-rkn">${esc(rk.n)}</p>
      ${nx ? `<div class="rx-nx"><small>Para o Rank ${nx.R.r} · ${esc(nx.R.n)} falta:</small>${nx.req.filter(x => x.tem < x.v).slice(0, 3).map(x => `<span>${nf(x.v - x.tem)} ${esc(x.n)}</span>`).join('')}</div>` : '<div class="rx-nx"><small>O topo absoluto. Quase ninguém chega aqui.</small></div>'}</div>`,
      go: (el, T, R) => { T(() => { FX.implode(FX.W() / 2, FX.H() * .42, [rk.c, '#ffffff'], 70, 40); SOM.subida(1.15); }, 300); T(() => { const [x, y] = mid(el, '.rx-rk b'); impacto(R, x, y, [rk.c, '#ffffff'], true); el.classList.add('bum'); SOM.nivel(1); SOM.fanfarra(); }, 1500); } });
    S.push({ dur: 10800, c1: '#040308', c2: c.cor, mus: 0, sec: 'classe', html: `<div class="rx-in rx-clw"><p class="rx-k">Este ano, a tua classe é…</p><div class="rx-cw"><div class="rx-card" style="--cl:${c.cor}"><div class="rx-holo" aria-hidden="true"></div>${emblema(c.k, '#ffffff', 64)}
      <small>${c.hib ? 'Classe híbrida' : 'Classe'} · Rank ${rk.r}</small><b>${esc(c.nome)}</b><p>${esc(c.frase)}</p>${c.cat ? `<em>categoria ${esc(c.cat)}</em>` : ''}</div></div>
      ${c.titulos.length ? `<div class="rx-tits">${c.titulos.map((t, i) => `<i style="--d:${3.4 + i * .3}s">${esc(t)}</i>`).join('')}</div>` : ''}</div>`,
      go: (el, T, R) => { T(() => { FX.implode(FX.W() / 2, FX.H() * .5, [c.cor, '#ffffff', '#fde047'], 110, 52); el.classList.add('rx-rumble'); SOM.subida(1.9); }, 200); T(() => { el.classList.remove('rx-rumble'); SOM.coroHit(); const [x, y] = mid(el, '.rx-card'); impacto(R, x, y, [c.cor, '#ffffff', '#fde047'], true); el.classList.add('bum'); SOM.nivel(2, true); SOM.brilho(); }, 2100);
        T(() => FX.burst(FX.W() * .15, FX.H() * .2, { n: 70, c: [c.cor, '#fff'] }), 2700); T(() => FX.burst(FX.W() * .85, FX.H() * .25, { n: 70, c: [c.cor, '#fde047'] }), 3000);
        const cw = el.querySelector('.rx-cw'); if (cw) { const mv = e => { const r = cw.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; cw.style.setProperty('--tx', (x * 22).toFixed(1) + 'deg'); cw.style.setProperty('--ty', (-y * 18).toFixed(1) + 'deg'); cw.style.setProperty('--hx', (50 + x * 80).toFixed(0) + '%'); }; el.addEventListener('pointermove', mv); } } }); }
  S.push({ dur: 0, c1: '#0b0816', c2: cc, mus: 1, sec: 'fim', img: img0, html: `<div class="rx-in rx-fim"><div class="rx-sum" style="--cl:${cc}"><small>Prumo &amp; ${esc(nome)} · Recap</small><b class="rx-sy">${d.y}</b>
      ${d.imgs.length ? `<div class="rx-sp">${d.top.filter(a => a.img).slice(0, 5).map((a, i) => `<img src="${esc(a.img)}" alt="" referrerpolicy="no-referrer" style="--i:${i}">`).join('')}</div>` : ''}
      <div class="rx-sg"><span><b>${nf(d.eps)}</b>episódios</span><span><b>${nf(d.h)}</b>horas</span>${d.G[0] ? `<span><b>${esc(d.G[0].n)}</b>género</span>` : ''}${c ? `<span><b>Rank ${c.rank.r}</b>${esc(c.rank.n)}</span>` : ''}</div>
      ${d.top[0] ? `<p class="rx-s1"><small>Anime do ano</small>${esc(d.top[0].t)}</p>` : ''}${c ? `<p class="rx-s1"><small>Classe</small>${esc(c.nome)}</p>` : ''}</div>
      <div class="ar-act"><button type="button" class="btn an-cta" data-act="arPartilhar">${UI.ic('arrowUp')}Partilhar a imagem</button><button type="button" class="btn an-ghost" data-act="arGravar">${UI.ic('play')}Gravar para as redes</button><button type="button" class="btn an-ghost" data-act="arRever">Ver outra vez</button><button type="button" class="btn an-ghost" data-act="arFechar">Fechar</button></div></div>`,
    go: (el, T) => { for (let i = 0; i < 7; i++) T(() => { FX.burst(FX.W() * (.15 + Math.random() * .7), FX.H() * (.12 + Math.random() * .3), { n: 70, c: [['#fde047', '#f472b6', '#60a5fa', '#34d399', cc][i % 5], '#ffffff'], sp: 9 }); SOM.fogo(i); }, 300 + i * 850); } });
  return S; };

// --- o leitor: tocar avança, à esquerda volta, segurar pára; transição em corte diagonal ---
let RX = null;
const fecha = () => { if (!RX) return; RX.tm.forEach(clearTimeout); clearTimeout(RX.auto); FX.stop(); SOM.stop(); RX.el.remove(); document.documentElement.classList.remove('rx-open'); RX = null; };
const mostra = i => { if (!RX) return; const n = RX.S.length; if (i < 0) i = 0; if (i >= n) return; const ant = RX.i; RX.i = i; RX.tm.forEach(clearTimeout); RX.tm = []; clearTimeout(RX.auto);
  const s = RX.S[i], el = RX.el, st = RX.st, sc = st.querySelectorAll('.rx-s');
  sc.forEach((x, k) => { x.classList.toggle('on', k === i); if (k !== i) x.classList.remove('bum'); });
  st.style.setProperty('--c1', s.c1); st.style.setProperty('--c2', s.c2);
  const po = st.querySelector('.rx-po'); po.style.backgroundImage = s.img ? `url("${String(s.img).replace(/"/g, '')}")` : 'none'; po.classList.toggle('on', !!s.img);
  st.querySelectorAll('.rx-pg i').forEach((b, k) => { b.classList.toggle('feito', k < i); b.classList.remove('on'); if (k === i) { void b.offsetWidth; b.classList.add('on'); b.style.setProperty('--dur', (s.dur || 1) + 'ms'); } });
  if (ant !== i && ant != null) { const w = st.querySelector('.rx-wipe'); w.style.setProperty('--wc', s.c2); w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); SOM.corte(); }
  const cur = sc[i]; cur.replaceWith(cur.cloneNode(true)); const now = st.querySelectorAll('.rx-s')[i];   // recomeça as animações CSS
  SOM.secao(s.sec || 'abre'); SOM.nivel(s.mus || 0);
  const T = (f, ms) => RX.tm.push(setTimeout(() => { if (RX && RX.i === i && !RX.pausa) f(); }, ms));
  try { s.go(now, T, st); } catch (e) { }
  RX.t0 = Date.now(); RX.rest = s.dur; if (s.dur) RX.auto = setTimeout(() => mostra(i + 1), s.dur); };
const pausa = on => { if (!RX || !RX.S[RX.i].dur) return; RX.pausa = on; RX.el.classList.toggle('rx-paused', on);
  if (on) { clearTimeout(RX.auto); RX.rest = Math.max(400, RX.rest - (Date.now() - RX.t0)); } else { RX.t0 = Date.now(); const i = RX.i; RX.auto = setTimeout(() => mostra(i + 1), RX.rest); } };
A.arRecap = b => { const j = janela(), prev = b && b.dataset && b.dataset.prev && adm(); if (!j.aberto && !prev) { UI.toast('O Recap ' + j.y + ' abre a 1 de dezembro.', 'warn'); return; }
  const y = j.y, d = dados(y), c = classe(); if (!d.n) { UI.toast('Junta animes à tua lista (com os episódios que viste) para o Recap ter o teu ano.', 'warn'); return; }
  fecha(); const S = ecras(d, c), el = document.createElement('div'); el.id = 'arRecap'; el.className = 'rx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'O teu Recap de animes ' + y);
  el.innerHTML = `<div class="rx-st"><div class="rx-bg" aria-hidden="true"></div><div class="rx-po" aria-hidden="true"></div><div class="rx-lines" aria-hidden="true"></div><div class="rx-dots" aria-hidden="true"></div><canvas class="rx-fx" aria-hidden="true"></canvas><div class="rx-wipe" aria-hidden="true"></div>
    <div class="rx-pg" aria-hidden="true">${S.map(() => '<i></i>').join('')}</div><button type="button" class="rx-x" data-act="arFechar" aria-label="Fechar">${UI.ic('x')}</button><button type="button" class="rx-som" data-act="arSom" aria-label="Som" aria-pressed="${SOM.on}">${SOM.on ? '♪' : '×♪'}</button>
    ${S.map((s, i) => `<section class="rx-s" data-i="${i}" aria-live="polite">${s.html}</section>`).join('')}${prev && !j.aberto ? '<p class="rx-prev">Pré-visualização da administração</p>' : ''}</div>`;
  document.body.appendChild(el); document.documentElement.classList.add('rx-open'); const st = el.querySelector('.rx-st'); FX.init(el.querySelector('.rx-fx'), st); SOM.start();
  RX = { el, st, S, i: null, tm: [], auto: 0, pausa: false, t0: 0, rest: 0, d, c, rec: false };
  let hold = 0, held = false, x0 = 0;
  el.addEventListener('pointerdown', e => { if (e.target.closest('button, a')) return; x0 = e.clientX; held = false; hold = setTimeout(() => { held = true; pausa(true); }, 220); });
  el.addEventListener('pointerup', e => { if (e.target.closest('button, a')) return; clearTimeout(hold); if (held) { pausa(false); return; } if (!RX) return; if (RX.rec && RX.i === RX.S.length - 1) { RX.rec = false; RX.el.classList.remove('rx-rec'); return; }
    const last = RX.i === RX.S.length - 1, r = st.getBoundingClientRect(); if (x0 < r.left + r.width * .32) mostra(RX.i - 1); else if (!last) mostra(RX.i + 1); });
  el.addEventListener('pointercancel', () => { clearTimeout(hold); if (held) pausa(false); });
  mostra(0); };
const img0Of = d => (d.top.find(a => a.img) || {}).img || '';
A.arFechar = () => fecha();
A.arRever = () => { if (!RX) return; SOM.start(); mostra(0); };
A.arSom = b => { const on = SOM.alterna(); b.textContent = on ? '♪' : '×♪'; b.setAttribute('aria-pressed', String(on)); if (on && RX) { SOM.start(); (SOM.secao(RX.S[RX.i].sec || 'abre'), SOM.nivel(RX.S[RX.i].mus || 0)); } };
// modo gravação: 3, 2, 1… e passa tudo sozinho, com música, sem botões à vista (em formato de story)
A.arGravar = () => { if (!RX) return; const st = RX.st; RX.tm.forEach(clearTimeout); clearTimeout(RX.auto); RX.el.classList.add('rx-rec'); RX.rec = true;
  const cd = document.createElement('div'); cd.className = 'rx-cd'; cd.innerHTML = '<p>Começa a gravar o ecrã agora</p><b>3</b>'; st.appendChild(cd); let n = 3; SOM.start();
  const t = () => { if (!RX) return; if (n <= 0) { cd.remove(); RX.i = null; mostra(0); return; } cd.querySelector('b').textContent = n; cd.querySelector('b').classList.remove('pum'); void cd.offsetWidth; cd.querySelector('b').classList.add('pum'); SOM.tique(); n--; RX.tm.push(setTimeout(t, 900)); }; t(); };
// o cartão do ano como imagem (1080×1920, tamanho de story), com os teus posters
const posterImg = u => new Promise(res => { if (!u) return res(null); fetch('api/anime?foto=' + encodeURIComponent(u)).then(r => r.ok ? r.blob() : null).then(b => { if (!b) return res(null); const o = URL.createObjectURL(b), im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = o; }).catch(() => res(null)); });
const cartaoImg = async (d, c) => { const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), cl = c ? c.cor : '#ff3d8b';
  try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load('200px Anton'), document.fonts.load('800 60px system-ui')]); } catch (e) { }
  const P = (await Promise.all(d.top.slice(0, 5).map(a => posterImg(a.img)))).filter(Boolean);
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b0816'); bg.addColorStop(.5, '#1a0b2e'); bg.addColorStop(1, cl); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (P[0]) { const sm = document.createElement('canvas'); sm.width = 27; sm.height = 48; const sg = sm.getContext('2d'), im = P[0], k0 = Math.max(27 / im.width, 48 / im.height); sg.drawImage(im, (27 - im.width * k0) / 2, (48 - im.height * k0) / 2, im.width * k0, im.height * k0);   // desfocado em qualquer telemóvel: reduz e volta a aumentar
    g.save(); g.globalAlpha = .34; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, W, H); g.restore(); }
  g.save(); g.translate(W / 2, 980); for (let i = 0; i < 36; i++) { g.rotate(Math.PI / 18); g.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,0)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(1500, -70); g.lineTo(1500, 70); g.fill(); } g.restore();
  g.globalAlpha = .07; g.fillStyle = '#fff'; for (let y = 0; y < H; y += 26) for (let x = (y / 26) % 2 ? 13 : 0; x < W; x += 26) { g.beginPath(); g.arc(x, y, 2 + 3 * (y / H), 0, 6.3); g.fill(); } g.globalAlpha = 1;
  const T = (t, x, y, f, c2, al) => { g.font = f; g.fillStyle = c2 || '#fff'; g.textAlign = al || 'left'; g.fillText(t, x, y); };
  T('PRUMO & ' + (OS.Social && OS.Social.nome ? OS.Social.nome() : 'PHANTOM').toUpperCase() + '  ·  RECAP', 80, 130, '800 34px system-ui, sans-serif', 'rgba(255,255,255,.75)');
  T('O MEU ' + d.y, 80, 290, '150px Anton, Impact, sans-serif'); T('EM ANIMES', 80, 440, '150px Anton, Impact, sans-serif', cl);
  if (P.length) { const pw = 250, ph = 360, n = P.length, x0 = W / 2 - ((n - 1) * 150 + pw) / 2; P.forEach((im, i) => { g.save(); const x = x0 + i * 150 + pw / 2, y = 700, rot = (i - (n - 1) / 2) * .09; g.translate(x, y); g.rotate(rot); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.fillStyle = '#000'; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.shadowBlur = 0; const k = Math.max(pw / im.width, ph / im.height); g.beginPath(); g.rect(-pw / 2, -ph / 2, pw, ph); g.clip(); g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); g.restore(); }); }
  const yN = P.length ? 1150 : 900; T(nf(d.eps), W / 2, yN, '260px Anton, Impact, sans-serif', '#fff', 'center'); T('EPISÓDIOS  ·  ' + nf(d.h) + ' HORAS', W / 2, yN + 80, '800 46px system-ui, sans-serif', 'rgba(255,255,255,.85)', 'center');
  let y = yN + 200; const linha = (k, v) => { if (!v) return; T(k.toUpperCase(), 80, y, '800 32px system-ui, sans-serif', 'rgba(255,255,255,.6)'); T(String(v).slice(0, 30), 80, y + 66, '800 58px system-ui, sans-serif'); y += 150; };
  linha('Anime do ano', d.top[0] && d.top[0].t); linha('Género', d.G[0] && d.G[0].n); if (c) linha('Classe · Rank ' + c.rank.r, c.nome);
  if (c) { g.save(); g.translate(W - 230, yN + 260); g.scale(6, 6); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.4; g.lineCap = 'round'; g.lineJoin = 'round'; try { g.stroke(new Path2D(EMB[c.k] || EMB.hib)); } catch (e) { } g.restore(); }
  T('prumo-vida.vercel.app', W / 2, H - 70, '700 32px system-ui, sans-serif', 'rgba(255,255,255,.6)', 'center');
  return new Promise(res => cv.toBlob(b => res(b), 'image/png')); };
A.arPartilhar = async () => { if (!RX) return; const { d, c } = RX, t = `O meu ${d.y} em animes no Prumo: ${nf(d.eps)} episódios (${nf(d.h)} h)${d.G[0] ? ', género ' + d.G[0].n : ''}${c ? '. Sou ' + c.nome + ', Rank ' + c.rank.r : ''}.`;
  UI.toast('A preparar a imagem…');
  try { const b = await cartaoImg(d, c), f = b && new File([b], 'recap-animes-' + d.y + '.png', { type: 'image/png' });
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'O meu Recap de animes', text: t }); return; }
    if (b) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); UI.toast('Imagem guardada.', 'pos'); } }
  catch (e) { if (e && e.name === 'AbortError') return; try { await navigator.clipboard.writeText(t); UI.toast('Copiado. Cola onde quiseres.', 'pos'); } catch (e2) { } } };
document.addEventListener('keydown', e => { if (!RX) return; if (e.key === 'Escape') fecha(); if (e.key === 'ArrowRight') mostra(RX.i + 1); if (e.key === 'ArrowLeft') mostra(RX.i - 1); });
// durante a janela: um destaque no início dos Animes
const banner = () => { const j = janela(); if (!j.aberto) return ''; const c = classe(); return `<button type="button" class="rx-ban" data-act="arRecap" style="--cl:${c ? c.cor : '#ff3d8b'}"><span class="rx-banl" aria-hidden="true"></span><small>Prumo &amp; ${esc(OS.Social && OS.Social.nome ? OS.Social.nome() : 'PHANTOM')}</small><b>O teu Recap ${j.y} está pronto</b><span>O teu ano em animes, o teu rank e a tua classe ${UI.ic('right')}</span></button>`; };
OS.AnimeRecap = { classe, selo, bloco, dados, enviar, janela, banner, RANKS, CLS, HIB, TIT, stats, rankDe, _FX: FX, _SOM: SOM, get _RX() { return RX; } };
OS.on && OS.on('ready', () => { setTimeout(enviar, 6000);
  const o = OS.views.animes; if (o && !o._rx) { OS.views.animes = sub => { const h = o(sub); if (sub) return h; let b = ''; try { b = banner(); } catch (e) { } if (!b) return h; const k = '<div class="an-pad">', i = h.indexOf(k); return i < 0 ? h : h.slice(0, i + k.length) + b + h.slice(i + k.length); }; OS.views.animes._rx = 1; } });
})();
