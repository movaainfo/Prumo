/* PRUMO — Animes: a classe de cada fã e o Recap do ano (v3.79), na parceria Prumo & PHANTOM.
   · Classe: tirada do que vês e de como vês (géneros, formatos, episódios, notas, a lista "Quero ver", os pontos do Pursuit):
     uma classe principal (ex.: Estratega do Mistério), uma categoria (o segundo género), o nível pelos episódios vistos e traços
     (Maratonista, Crítico implacável, Colecionador, Caçador do Pursuit). Aparece no perfil de anime e no ranking.
   · Recap: o teu ano em animes em ecrãs a deslizar (como as retrospetivas de música): episódios e horas, o género, os 5 do ano,
     o estúdio, o mês mais forte, a tua classe e o Pursuit. Toca para avançar; partilha no fim. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const L = () => (OS.Animes && OS.Animes.list ? OS.Animes.list() : []);
const CLS = [
  ['acao', ['Action', 'Adventure'], 'Guerreiro Shōnen', 'Vives para as lutas, os treinos e as viagens.', '#ff4d2e'],
  ['misterio', ['Mystery', 'Psychological', 'Thriller'], 'Estratega do Mistério', 'Gostas de pensar antes das personagens.', '#6d5dfc'],
  ['romance', ['Romance', 'Drama'], 'Coração Shōjo', 'Choras, torces e sentes tudo.', '#e11d74'],
  ['mundos', ['Fantasy', 'Sci-Fi'], 'Explorador de Mundos', 'Outros mundos são a tua casa.', '#2563eb'],
  ['calmo', ['Slice of Life', 'Comedy'], 'Alma Tranquila', 'Um episódio leve no fim do dia.', '#16a34a'],
  ['sombras', ['Horror', 'Supernatural'], 'Caçador de Sombras', 'Quanto mais escuro, melhor.', '#991b1b'],
  ['desporto', ['Sports'], 'Atleta de Sofá', 'Cada jogo é uma final.', '#ea580c'],
  ['mecha', ['Mecha'], 'Piloto de Mecha', 'Robôs gigantes e batalhas no espaço.', '#475569']];
const GEN = { Action: 'Ação', Adventure: 'Aventura', Comedy: 'Comédia', Drama: 'Drama', Fantasy: 'Fantasia', Horror: 'Terror', Mecha: 'Mecha', Music: 'Música', Mystery: 'Mistério', Psychological: 'Psicológico', Romance: 'Romance', 'Sci-Fi': 'Ficção científica', 'Slice of Life': 'Slice of life', Sports: 'Desporto', Supernatural: 'Sobrenatural', Thriller: 'Thriller' };
const NIV = [[50, 'Novato'], [200, 'Iniciado'], [800, 'Veterano'], [2000, 'Lenda'], [1e9, 'Mítico']];
const visto = a => a.status === 'Visto' ? Math.max(+a.ep || 0, +a.eps || 0) : +a.ep || 0;
const classe = () => { const X = L().filter(a => a.status !== 'Larguei' || (+a.ep || 0) > 2); if (!X.length) return null;
  const g = {}; X.forEach(a => { const w = (a.status === 'Visto' ? 2 : a.status === 'A ver' ? 1.5 : .6) * (+a.nota ? .5 + (+a.nota) / 10 : 1); (a.gen || []).forEach(x => { g[x] = (g[x] || 0) + w; }); });
  const sc = CLS.map(c => [c, c[1].reduce((s, x) => s + (g[x] || 0), 0) / Math.sqrt(c[1].length)]).sort((a, b) => b[1] - a[1]), c0 = sc[0][1] > 0 ? sc[0][0] : CLS[4];
  const gs = Object.entries(g).sort((a, b) => b[1] - a[1]).map(x => x[0]), cat = gs.find(x => !c0[1].includes(x)) || gs[0] || '';
  const eps = U.sum(X, visto), nv = NIV.find(n => eps < n[0])[1], notas = X.filter(a => +a.nota).map(a => +a.nota), med = notas.length ? U.sum(notas, x => x) / notas.length : 0;
  const pts = OS.Social && OS.Social._S && OS.Social._S.rank && OS.Social._S.rank.eu ? +OS.Social._S.rank.eu.p || 0 : 0, tr = [];
  if (eps >= 1000) tr.push('Maratonista'); if (notas.length >= 10 && med < 6.5) tr.push('Crítico implacável'); if (notas.length >= 10 && med >= 8.6) tr.push('Coração mole');
  if (X.filter(a => a.status === 'Quero ver').length >= 20) tr.push('Colecionador'); if (pts > 0) tr.push('Caçador do Pursuit'); if (X.filter(a => a.fmt === 'MOVIE').length >= 10) tr.push('Cinéfilo');
  return { k: c0[0], nome: c0[2], frase: c0[3], cor: c0[4], cat: GEN[cat] || cat, nivel: nv, eps, traços: tr };
};
const selo = (c, sz) => c ? `<span class="ar-cl ${sz || ''}" style="--cl:${c.cor}"><b>${esc(c.nome)}</b><small>${esc(c.nivel)}${c.cat ? ' · ' + esc(c.cat) : ''}</small></span>` : '';
const bloco = () => { const c = classe(); if (!c) return `<div class="so-sec ar-bl"><h3>A tua classe de fã</h3><p class="mut" style="margin:0">Junta animes à tua lista (os que vês e já viste) e o Prumo diz-te que tipo de fã és.</p></div>`;
  return `<div class="so-sec ar-bl"><h3>A tua classe de fã</h3><div class="ar-big" style="--cl:${c.cor}"><b>${esc(c.nome)}</b><p>${esc(c.frase)}</p><span>${esc(c.nivel)} · ${U.nf ? U.nf(c.eps, 0) : c.eps} episódios${c.cat ? ' · categoria ' + esc(c.cat) : ''}</span>${c.traços.length ? `<div class="ar-tr">${c.traços.map(t => `<i>${esc(t)}</i>`).join('')}</div>` : ''}</div>
    <button type="button" class="btn an-cta" data-act="arRecap">${UI.ic('play')}Ver o meu Recap ${new Date().getFullYear()}</button></div>`; };
// manda a classe ao servidor (para aparecer no ranking e no perfil), no máximo uma vez por dia ou quando muda
const enviar = () => { const c = classe(); if (!c || !OS.Social || !OS.Social.call || !(OS.Acc && OS.Acc.token && OS.Acc.token())) return; const v = c.nome + '|' + c.nivel, k = 'oc_ar_cls';
  const o = U.ls.get(k, {}) || {}; if (o.v === v && Date.now() - (o.at || 0) < 864e5) return; U.ls.set(k, { v, at: Date.now() }); OS.Social.call('classe', { nome: c.nome, nivel: c.nivel }).catch(() => { }); };

/* ---------- o Recap do ano ---------- */
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dados = (y) => { const X = L(), noAno = a => [a.start, a.end].some(d => String(d || '').slice(0, 4) === String(y)) || (a._u && new Date(a._u).getFullYear() === y && (+a.ep || 0) > 0) || (a.status === 'A ver');
  const A0 = X.filter(noAno), eps = U.sum(A0, visto), min = U.sum(A0, a => visto(a) * (+a.dur || 24)), g = {}, st = {}, ms = Array(12).fill(0);
  A0.forEach(a => { (a.gen || []).forEach(x => { g[x] = (g[x] || 0) + Math.max(1, visto(a)); }); if (a.stu) st[a.stu] = (st[a.stu] || 0) + 1; [a.start, a.end].forEach(d => { if (String(d || '').slice(0, 4) === String(y)) ms[+String(d).slice(5, 7) - 1]++; }); });
  const gT = U.sum(Object.values(g), v => v) || 1, G = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({ n: GEN[k] || k, p: Math.round(v / gT * 100) }));
  const top = A0.slice().sort((a, b) => (+b.nota || 0) - (+a.nota || 0) || visto(b) - visto(a)).slice(0, 5), stu = Object.entries(st).sort((a, b) => b[1] - a[1])[0], mm = ms.indexOf(Math.max(...ms));
  return { y, n: A0.length, eps, h: Math.round(min / 60), G, top, stu: stu ? stu[0] : '', mes: Math.max(...ms) ? MES[mm] : '', vistos: A0.filter(a => a.status === 'Visto').length }; };
let RI = 0, RT = 0;
const ecras = (d, c) => { const nome = OS.Social && OS.Social.nome ? OS.Social.nome() : 'PHANTOM', E = [];
  E.push(`<div class="ar-s s0">${OS.Parceria ? OS.Parceria.mini() : ''}<p class="ar-k">Prumo &amp; ${esc(nome)}</p><h2>O teu ${d.y} em animes</h2><p>Toca para começar.</p></div>`);
  E.push(`<div class="ar-s s1"><p class="ar-k">Este ano viste</p><b class="ar-n">${U.nf ? U.nf(d.eps, 0) : d.eps}</b><p class="ar-u">episódios</p><p>Isso são cerca de <b>${U.nf ? U.nf(d.h, 0) : d.h} horas</b>${d.h >= 24 ? ', mais de ' + Math.floor(d.h / 24) + (Math.floor(d.h / 24) === 1 ? ' dia' : ' dias') + ' seguidos' : ''}.</p></div>`);
  if (d.G.length) E.push(`<div class="ar-s s2"><p class="ar-k">O teu género</p><b class="ar-g">${esc(d.G[0].n)}</b><ol class="ar-gl">${d.G.map(x => `<li><span>${esc(x.n)}</span><i style="width:${x.p}%"></i><em>${x.p}%</em></li>`).join('')}</ol></div>`);
  if (d.top.length) E.push(`<div class="ar-s s3"><p class="ar-k">Os teus ${d.top.length} do ano</p><ol class="ar-top">${d.top.map((a, i) => `<li><span>${i + 1}</span>${a.img ? `<img src="${esc(a.img)}" alt="" referrerpolicy="no-referrer">` : ''}<b>${esc(a.t)}</b>${+a.nota ? `<em>${a.nota}</em>` : ''}</li>`).join('')}</ol></div>`);
  if (d.stu || d.mes) E.push(`<div class="ar-s s4">${d.stu ? `<p class="ar-k">O teu estúdio</p><b class="ar-g">${esc(d.stu)}</b>` : ''}${d.mes ? `<p class="ar-k" style="margin-top:28px">O teu mês mais forte</p><b class="ar-g">${esc(d.mes)}</b>` : ''}</div>`);
  if (c) E.push(`<div class="ar-s s5" style="--cl:${c.cor}"><p class="ar-k">Este ano foste</p><b class="ar-g">${esc(c.nome)}</b><p>${esc(c.frase)}</p><p class="ar-u">${esc(c.nivel)}${c.cat ? ' · categoria ' + esc(c.cat) : ''}</p>${c.traços.length ? `<div class="ar-tr">${c.traços.map(t => `<i>${esc(t)}</i>`).join('')}</div>` : ''}</div>`);
  E.push(`<div class="ar-s s6"><p class="ar-k">${d.n} ${d.n === 1 ? 'anime' : 'animes'} · ${d.vistos} terminados</p><h2>Obrigado por veres connosco.</h2><p>O Recap é da parceria Prumo &amp; ${esc(nome)}.</p><div class="ar-act"><button type="button" class="btn an-cta" data-act="arPartilhar">Partilhar</button><button type="button" class="btn an-ghost" data-act="arFechar">Fechar</button></div></div>`);
  return E; };
const mostra = () => { const el = document.getElementById('arRecap'); if (!el) return; const S = el.querySelectorAll('.ar-s'); RI = Math.max(0, Math.min(S.length - 1, RI));
  S.forEach((s, i) => s.classList.toggle('on', i === RI)); el.querySelectorAll('.ar-pg i').forEach((b, i) => { b.classList.toggle('feito', i < RI); b.classList.toggle('on', i === RI); });
  clearTimeout(RT); if (RI < S.length - 1 && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) RT = setTimeout(() => { RI++; mostra(); }, 6500); };
A.arRecap = () => { const y = new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear(), d = dados(y), c = classe(), E = ecras(d, c);
  if (!d.n) { UI.toast('Junta animes à tua lista (com as datas e os episódios) para o Recap ter o teu ano.', 'warn'); return; }
  const el = document.createElement('div'); el.id = 'arRecap'; el.className = 'ar-rc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'O teu Recap de animes');
  el.innerHTML = `<div class="ar-pg" aria-hidden="true">${E.map(() => '<i></i>').join('')}</div><button type="button" class="ar-x" data-act="arFechar" aria-label="Fechar">${UI.ic('x')}</button>${E.join('')}<button type="button" class="ar-nav l" aria-label="Anterior"></button><button type="button" class="ar-nav r" aria-label="Seguinte"></button>`;
  el.addEventListener('click', e => { if (e.target.closest('.ar-nav.l')) { RI--; mostra(); } else if (e.target.closest('.ar-nav.r')) { RI++; mostra(); } });
  document.body.appendChild(el); RI = 0; mostra(); };
A.arFechar = () => { clearTimeout(RT); const el = document.getElementById('arRecap'); if (el) el.remove(); };
A.arPartilhar = async () => { const d = dados(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()), c = classe(), t = `O meu ${d.y} em animes no Prumo: ${d.eps} episódios (${d.h} h)${d.G[0] ? ', género ' + d.G[0].n : ''}${c ? '. Sou ' + c.nome + ' (' + c.nivel + ')' : ''}.`;
  try { if (navigator.share) await navigator.share({ title: 'O meu Recap de animes', text: t }); else { await navigator.clipboard.writeText(t); UI.toast('Copiado. Cola onde quiseres.', 'pos'); } } catch (e) { } };
document.addEventListener('keydown', e => { if (!document.getElementById('arRecap')) return; if (e.key === 'Escape') A.arFechar(); if (e.key === 'ArrowRight') { RI++; mostra(); } if (e.key === 'ArrowLeft') { RI--; mostra(); } });

OS.AnimeRecap = { classe, selo, bloco, dados, enviar };
OS.on && OS.on('ready', () => { setTimeout(enviar, 6000); });
})();
