/* PRUMO — Desafio da semana (v3.79). Todas as semanas, o mesmo desafio para todas as contas (escolhido pelo servidor ao acaso
   entre os que o app consegue medir sozinho). Quem toca em Participar entra no ranking: o progresso conta-se com o que registas
   no app (treinos, estudo, km, hábitos, tarefas) ou, no Pursuit, com os teus acertos. O ranking mostra quem já completou
   (pela ordem em que completou), quem vai a caminho e quantos ainda não começaram. Na Visão geral e nos Jogos. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token() && OS.Acc.pid && OS.Acc.pid());
const call = (op, b) => OS.Social && OS.Social.call ? OS.Social.call(op, b) : Promise.reject(new Error('sem ligação'));
const S = { d: null, at: 0, busy: false, err: '', env: { v: -1, at: 0 } };
const dia = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const safe = (f, d) => { try { const v = f(); return v == null || Number.isNaN(v) ? d : v; } catch (e) { return d; } };
// o progresso medido no app, entre segunda e domingo (as datas que o servidor mandou)
const medir = D => { const a = dia(D.fim - 7 * 864e5 + 3600e3), b = dia(D.fim - 3600e3), k = D.desafio.k;
  if (k === 'treinos') return safe(() => OS.all('workouts').filter(w => w.date >= a && w.date <= b).length, 0);
  if (k === 'estudo') return safe(() => Math.round(U.sum(OS.all('sessions').filter(x => x.date >= a && x.date <= b), x => +x.minutes || 0) / 6) / 10, 0);
  if (k === 'km') return safe(() => Math.round(OS.Run.kmIn(a, b) * 10) / 10, 0);
  if (k === 'habitos') return safe(() => U.range(a, b <= U.today() ? b : U.today()).filter(d => OS.Hab.dayScore(d) >= 1).length, 0);
  if (k === 'tarefas') return safe(() => OS.all('tasks').filter(x => x.doneAt && String(x.doneAt).slice(0, 10) >= a && String(x.doneAt).slice(0, 10) <= b).length, 0);
  return null; };
const carregar = async (forcar, op, b) => { if (!conta() || S.busy || (!forcar && Date.now() - S.at < 5 * 6e4)) return; S.busy = true; S.err = '';
  try { S.d = await call(op || 'desafio', b); S.at = Date.now(); enviar(); } catch (e) { S.err = (e && e.message) || 'Não deu para ler o desafio.'; } S.busy = false; OS.request(); };
// manda o progresso quando muda (no máximo de 2 em 2 minutos)
const enviar = async () => { const D = S.d; if (!D || !D.eu) return; const v = medir(D); if (v == null || v === D.eu.v || (v === S.env.v && Date.now() - S.env.at < 12e4)) return;
  S.env = { v, at: Date.now() }; try { S.d = await call('desafioProg', { v }); OS.request(); } catch (e) { } };
const falta = t => { const m = Math.max(0, Math.round((t - Date.now()) / 6e4)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + ' h' : '') : h ? h + ' h' : m + ' min'; };
const nf = v => U.nf ? U.nf(v, v % 1 ? 1 : 0) : String(v);
const barra = (v, alvo) => `<span class="ds-b" role="progressbar" aria-valuemin="0" aria-valuemax="${alvo}" aria-valuenow="${v}"><i style="width:${Math.min(100, Math.round(v / alvo * 100))}%"></i></span>`;
const pessoa = (x, i, D, feito) => `<li class="${x.eu ? 'eu' : ''}"><span class="ds-pos">${feito ? i + 1 : ''}</span>${OS.AnimeSoc && OS.AnimeSoc.av ? OS.AnimeSoc.av(x, 28) : ''}<span class="ds-nm"><b>${esc(x.nome || 'Alguém')}${x.eu ? ' (tu)' : ''}</b>${x.user ? `<small>@${esc(x.user)}</small>` : ''}</span><span class="ds-v">${feito ? UI.ic('check') : ''}${nf(x.v)}/${nf(D.desafio.alvo)}</span></li>`;
// o cartão (Visão geral e Jogos)
const cartao = (onde) => { if (!conta()) return ''; carregar(false); const D = S.d;
  if (!D) return `<section class="ds-c"><div class="ds-h"><span class="ds-k">${UI.ic('flag')}Desafio da semana</span></div><p class="mut">${S.err ? esc(S.err) : 'A carregar…'}</p></section>`;
  const d = D.desafio, eu = D.eu, v = eu ? (medir(D) ?? eu.v) : 0, top = D.feitos.slice(0, 3);
  return `<section class="ds-c${eu && eu.at ? ' ok' : ''}"><div class="ds-h"><span class="ds-k">${UI.ic('flag')}Desafio da semana</span><small>acaba daqui a ${falta(D.fim)}</small></div>
    <div class="ds-t"><span class="ds-ic">${UI.ic(d.ic || 'star')}</span><div><h3>${esc(d.t)}</h3><p>${esc(d.d)}</p></div></div>
    ${eu ? `<div class="ds-eu"><b>${nf(v)}<small>/${nf(d.alvo)} ${esc(d.un)}</small></b>${barra(v, d.alvo)}${eu.at ? `<span class="ds-feito">${UI.ic('check')}Completaste${D.feitos.findIndex(x => x.eu) >= 0 ? ' em ' + (D.feitos.findIndex(x => x.eu) + 1) + '.º lugar' : ''}</span>` : ''}</div>`
      : `<button type="button" class="btn pri" data-act="dsEntrar">${UI.ic('flag')}Participar</button><p class="ds-nota">Ao participar, o teu nome e o progresso deste desafio aparecem no ranking.</p>`}
    <div class="ds-rk"><p><b>${D.feitos.length}</b> completaram · <b>${D.caminho.length}</b> a caminho · <b>${D.zero}</b> ainda não começaram</p>${top.length ? `<ol>${top.map((x, i) => pessoa(x, i, D, true)).join('')}</ol>` : ''}
      <button type="button" class="btn sm ghost" data-act="dsRank">Ver o ranking todo</button></div></section>`; };
A.dsEntrar = () => carregar(true, 'desafioEntrar');
A.dsSair = () => { if (!confirm('Sair do desafio desta semana? O teu nome sai do ranking.')) return; UI.closeModal(); carregar(true, 'desafioSair'); };
A.dsRank = () => { const D = S.d; if (!D) return; const d = D.desafio;
  UI.modal(`<div class="ds-m"><h2>${UI.ic(d.ic || 'flag')}${esc(d.t)}</h2><p class="mut">${esc(d.d)} Acaba daqui a ${falta(D.fim)}.</p>
    <h3>Completaram (${D.feitos.length})</h3>${D.feitos.length ? `<ol class="ds-l">${D.feitos.map((x, i) => pessoa(x, i, D, true)).join('')}</ol>` : '<p class="mut">Ainda ninguém. Podes ser o primeiro.</p>'}
    <h3>A caminho (${D.caminho.length})</h3>${D.caminho.length ? `<ol class="ds-l">${D.caminho.map((x, i) => pessoa(x, i, D, false)).join('')}</ol>` : '<p class="mut">Ninguém a meio, por agora.</p>'}
    <h3>Ainda não começaram</h3><p class="mut">${D.zero} ${D.zero === 1 ? 'pessoa entrou' : 'pessoas entraram'} e ainda não ${D.zero === 1 ? 'tem' : 'têm'} progresso.</p>
    ${D.eu ? '<button type="button" class="btn sm ghost" data-act="dsSair">Sair do desafio</button>' : ''}</div>`, 'ds-modal'); };
OS.Desafio = { cartao, medir, carregar, _S: S };
OS.on && OS.on('ready', () => {
  const o = OS.views.visao; if (o && !o._ds) { OS.views.visao = sub => { const h = o(sub), k = '<!--dg-->', i = h.indexOf(k); if (i < 0) return h; let c = ''; try { c = cartao('visao'); } catch (e) { } return c ? h.slice(0, i) + c + h.slice(i) : h; }; OS.views.visao._ds = 1; }
  const j = OS.views.jogos; if (j && !j._ds) { OS.views.jogos = sub => { const h = j(sub), k = '<section class="pc-hero', i = h.indexOf(k); let c = ''; try { c = cartao('jogos'); } catch (e) { } if (!c) return h; const e = h.indexOf('</section>', i); return i < 0 || e < 0 ? h + c : h.slice(0, e + 10) + c + h.slice(e + 10); }; OS.views.jogos._ds = 1; }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.d) enviar(); }); });
})();
