/* PRUMO — Desafios semanais dos Animes (v3.85).
   Todas as semanas, 3 desafios (fácil, médio e difícil), os mesmos para toda a gente, escolhidos pelo servidor. Contam sozinhos:
   o app guarda um registo por dia do que vês (episódios, séries terminadas, notas, animes começados, a lista de "Quero ver" e os
   géneros) e manda ao servidor só os números de cada desafio; os do Pursuit são contados lá. Cada desafio completo dá pontos ao
   ranking dos animes e os 3 juntos dão um bónus. Página própria (#animes.desafios), faixa no início dos Animes e cartão nos Jogos. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token() && OS.Acc.pid && OS.Acc.pid());
const call = (op, b) => OS.Social && OS.Social.call ? OS.Social.call(op, b) : Promise.reject(new Error('sem ligação'));
const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- o registo diário (fica nos dados da pessoa e sincroniza entre aparelhos; guarda 70 dias) ---------- */
OS.ONE_DEF.anlog = { d: {} };
const LOG = () => { const o = OS.one('anlog'); if (!o.d) o.d = {}; return o.d; };
const marca = (f) => { const L = LOG(), k = hoje(), e = L[k] = L[k] || { e: 0, f: 0, n: 0, s: 0, l: 0, g: [] }; f(e);
  const ks = Object.keys(L).sort(); while (ks.length > 70) delete L[ks.shift()]; OS.setOne('anlog', { d: L }); };
const gens = a => (a && a.gen || []).slice(0, 6);
// marcar "Já vi" num anime que não estavas a ver (coisas vistas há anos) não conta: só conta o que avança a partir de "A ver"
OS.on('upd:animes', (r, b) => { if (!r || !b) return; const retro = r.status === 'Visto' && b.status !== 'A ver', de = retro ? 0 : (+r.ep || 0) - (+b.ep || 0), viu = r.status === 'Visto' && b.status === 'A ver',
    comecou = (+b.ep || 0) === 0 && (+r.ep || 0) > 0 && !b.end && r.status === 'A ver',
    nota = !!(+r.nota) && !(+b.nota), quer = r.status === 'Quero ver' && b.status !== 'Quero ver';
  if (de <= 0 && !viu && !comecou && !nota && !quer) return;
  marca(e => { if (de > 0) { e.e += Math.min(de, 60); gens(r).forEach(g => { if (!e.g.includes(g)) e.g.push(g); }); } if (viu) e.f++; if (comecou) e.n++; if (nota) e.s++; if (quer) e.l++; }); });
OS.on('add:animes', r => { if (!r) return; const ep = +r.ep || 0;
  if (r.status === 'Quero ver') return marca(e => { e.l++; });
  if (ep > 0 && r.status === 'A ver') marca(e => { e.e += Math.min(ep, 3); e.n++; gens(r).forEach(g => { if (!e.g.includes(g)) e.g.push(g); }); if (+r.nota) e.s++; });
  else if (+r.nota) marca(e => { e.s++; }); });

/* ---------- o progresso de cada desafio nos dias desta semana (segunda a domingo, as datas que o servidor mandou) ---------- */
const medir = (D, x) => { const L = LOG(), dd = (D.dias || []).map(d => L[d]).filter(Boolean);
  switch (x.m) { case 'eps': return U.sum(dd, e => e.e || 0); case 'fins': return U.sum(dd, e => e.f || 0); case 'notas': return U.sum(dd, e => e.s || 0);
    case 'novos': return U.sum(dd, e => e.n || 0); case 'lista': return U.sum(dd, e => e.l || 0); case 'gens': return new Set(dd.flatMap(e => e.g || [])).size;
    case 'dias': return dd.filter(e => (e.e || 0) > 0).length; default: return null; } };
const valor = (D, x) => x.srv ? ((D.eu.v || {})[x.k] || 0) : Math.max(medir(D, x) || 0, (D.eu.v || {})[x.k] || 0);

/* ---------- servidor ---------- */
const S = { d: null, at: 0, busy: false, err: '', env: '', envAt: 0, festa: null };
const carregar = async forcar => { if (!conta() || S.busy || (!forcar && Date.now() - S.at < 4 * 6e4)) return; S.busy = true; S.err = '';
  try { S.d = await call('anDesafios', {}); S.at = Date.now(); enviar(); } catch (e) { S.err = (e && e.message) || 'Não deu para ler os desafios.'; } S.busy = false; OS.request(); };
// manda os números quando mudam (no máximo de 90 em 90 segundos)
const enviar = async () => { const D = S.d; if (!D) return; const v = {}; D.L.forEach(x => { if (!x.srv) v[x.k] = medir(D, x) || 0; });
  const j = JSON.stringify(v), igual = D.L.every(x => x.srv || (D.eu.v || {})[x.k] === v[x.k]); if (igual || (j === S.env && Date.now() - S.envAt < 9e4)) return;
  S.env = j; S.envAt = Date.now(); try { const r = await call('anDesafiosProg', { v }); S.d = r; if (r.novos && r.novos.length) festa(r.novos); OS.request(); } catch (e) { } };
const festa = novos => { const t = novos.reduce((a, b) => a + b, 0); S.festa = { t, at: Date.now() }; try { UI.toast(`Desafio completo: +${t} pontos no ranking dos animes`, 'pos'); } catch (e) { } if (OS.Snd && OS.Snd.play) try { OS.Snd.play('win'); } catch (e) { } };
OS.on('change', c => { if (c === 'animes' && S.d) setTimeout(enviar, 800); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.d) carregar(false); });

/* ---------- desenho ---------- */
const falta = t => { const m = Math.max(0, Math.round((t - Date.now()) / 6e4)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + ' h' : '') : h ? h + ' h' : m + ' min'; };
const NV = ['C', 'B', 'S'];
const desafio = (D, x, mini) => { const v = valor(D, x), ok = !!(D.eu.ok || {})[x.k], p = Math.min(100, Math.round(v / x.alvo * 100));
  return `<article class="ad-c ad-n${x.n}${ok ? ' ok' : ''}"><div class="ad-top"><span class="ad-rk" aria-label="Nível ${esc(x.nv)}">${NV[x.n]}</span><span class="ad-nv">${esc(x.nv)}</span><span class="ad-pts">+${x.pts}</span></div>
    <span class="ad-ic">${UI.ic(ok ? 'check' : x.ic)}</span><h3>${esc(x.t)}</h3>${mini ? '' : `<p>${esc(x.d)}</p>`}
    <div class="ad-pr"><b>${Math.min(v, x.alvo)}<small>/${x.alvo} ${esc(x.un)}</small></b><span class="ad-b" role="progressbar" aria-valuemin="0" aria-valuemax="${x.alvo}" aria-valuenow="${Math.min(v, x.alvo)}"><i style="width:${p}%"></i></span></div>
    ${ok ? '<span class="ad-ok">Completo</span>' : ''}</article>`; };
const pessoa = (x, i) => `<li class="${x.eu ? 'eu' : ''}"><span class="ad-pos">${i + 1}</span>${OS.AnimeSoc && OS.AnimeSoc.av ? OS.AnimeSoc.av(x, 32) : ''}<span class="ad-nm"><b>${esc(x.nome || 'Alguém')}${x.eu ? ' (tu)' : ''}</b><small>${x.user ? '@' + esc(x.user) : ''}${x.cl ? (x.user ? ' · ' : '') + esc(x.cl) : ''}</small></span><span class="ad-st">${'<i></i>'.repeat(x.n)}${'<i class="v"></i>'.repeat(Math.max(0, 3 - x.n))}</span><span class="ad-pp">${x.pts}<small> pts</small></span></li>`;
const semConta = () => `<section class="ad-pg"><div class="ad-hero"><div><span class="ad-k">${UI.ic('flag')}Desafios da semana</span><h2>Três desafios novos todas as segundas</h2><p>Os desafios precisam de uma conta do Prumo, para o ranking ser o mesmo para toda a gente.</p></div></div></section>`;
// a página (#animes.desafios)
const pagina = () => { if (!conta()) return semConta(); carregar(false); const D = S.d;
  if (!D) return `<section class="ad-pg"><p class="an-ld">${S.err ? esc(S.err) : '<span class="an-sp"></span>A carregar os desafios…'}</p></section>`;
  const feitos = D.L.filter(x => (D.eu.ok || {})[x.k]).length, todos = feitos === D.L.length;
  return `<section class="ad-pg"><div class="ad-hero"><div><span class="ad-k">${UI.ic('flag')}Desafios da semana</span><h2>${feitos === 0 ? 'Três desafios, uma semana' : todos ? 'Semana perfeita' : feitos + ' de 3 completos'}</h2>
      <p>Contam sozinhos com o que vês e marcas no app${D.L.some(x => x.srv) ? ' e com o que jogas no Pursuit' : ''}. Cada desafio completo dá pontos ao ranking dos animes.</p></div>
      <div class="ad-hk"><span><b>${D.eu.pts}</b> pontos esta semana</span><span>acaba daqui a <b>${falta(D.fim)}</b></span>${D.pos ? `<span><b>${D.pos}.º</b> de ${D.total}</span>` : ''}</div></div>
    <div class="ad-grid">${D.L.map(x => desafio(D, x)).join('')}</div>
    <div class="ad-bon${D.eu.bon ? ' ok' : ''}">${UI.ic(D.eu.bon ? 'trophy' : 'star')}<p><b>${D.eu.bon ? 'Bónus da semana perfeita ganho' : 'Semana perfeita'}</b> ${D.eu.bon ? `+${D.bonus} pontos por completares os 3.` : `Completa os 3 e ganhas mais ${D.bonus} pontos.`}</p></div>
    <div class="an-rh"><h3>Ranking da semana</h3><a class="an-more" href="#animes.ranking">Ranking geral</a></div>
    ${D.rank.length ? `<ol class="ad-rkl">${D.rank.slice(0, 50).map(pessoa).join('')}</ol>` : '<p class="an-src">Ainda ninguém completou um desafio esta semana. O primeiro a completar fica no topo.</p>'}
    <p class="an-src">Os desafios mudam todas as segundas-feiras (hora de Lisboa). O que viste antes de existirem os desafios não conta.</p></section>`; };
// a faixa no início dos Animes (os 3, pequenos, com o que falta)
const faixa = () => { if (!conta()) return ''; carregar(false); const D = S.d; if (!D) return '';
  return `<section class="an-row ad-fx"><div class="an-rh"><h3>Desafios da semana <small>acaba daqui a ${falta(D.fim)}</small></h3><a class="an-more" href="#animes.desafios">Ver tudo</a></div>
    <a class="ad-fg" href="#animes.desafios" aria-label="Abrir os desafios da semana">${D.L.map(x => desafio(D, x, true)).join('')}</a></section>`; };
OS.AnDesafios = { pagina, faixa, medir, carregar, enviar, _S: S, _LOG: LOG };
})();
