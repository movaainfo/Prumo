/* PRUMO — Selos, a moeda do Prumo (v3.89).
   Compram-se em pacotes (pagamento único no Stripe) e os planos Avançado e Completo dão alguns no primeiro mês da assinatura.
   Gastam-se no app: reforçar um clã com mais vagas e desbloquear a foto e o fundo animados no perfil (que já vêm no Avançado e no Completo).
   Cada perfil tem a sua carteira. Na app das lojas (App Store e Play Store) os Selos não se compram: só se veem e se gastam. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token() && OS.Acc.pid && OS.Acc.pid());
const call = (op, b) => OS.Social && OS.Social.call ? OS.Social.call(op, b) : Promise.reject(new Error('Sem ligação.'));
const loja = () => !!(OS.Loja && OS.Loja.on) || !!(window.PrumoLoja && window.PrumoLoja.on);
const S = { d: null, at: 0, busy: false, err: '' };
const nf = n => n === Infinity ? '∞' : Number(n || 0).toLocaleString('pt-PT');
// a moeda: um selo de cera com o prumo (o fio de prumo) gravado
let uid = 0;
const ic = (sz = 20, cls = '') => { const g = 'sl' + (++uid); let d = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = i % 2 ? 10.6 : 11.6; d += (i ? 'L' : 'M') + (12 + Math.cos(a) * r).toFixed(2) + ' ' + (12 + Math.sin(a) * r).toFixed(2); }
  return `<svg class="sl-ic ${cls}" width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="${g}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#F07A84"/><stop offset=".55" stop-color="#B8263A"/><stop offset="1" stop-color="#6E0F1E"/></radialGradient></defs>
    <path d="${d}Z" fill="url(#${g})"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#5A0C18" stroke-opacity=".55" stroke-width="1"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#FFC9CE" stroke-opacity=".35" stroke-width=".6" transform="translate(-.4 -.4)"/>
    <path d="M12 6.4v5.2" stroke="#FFE3E6" stroke-width="1.1" stroke-linecap="round"/><path d="M12 11.2l2.4 2.6a2.4 2.4 0 0 1-4.8 0z" fill="#FFE3E6" fill-opacity=".92"/></svg>`; };
const carregar = async forcar => { if (!conta() || S.busy || (!forcar && S.d && Date.now() - S.at < 60e3)) return S.d; S.busy = true; S.err = '';
  try { S.d = await call('carteira', {}); S.at = Date.now(); } catch (e) { S.err = (e && e.message) || 'Não deu para abrir a carteira.'; } S.busy = false; OS.request(); return S.d; };
const saldo = () => S.d && S.d.carteira && S.d.carteira.inf ? Infinity : (S.d && S.d.carteira && S.d.carteira.s) || 0;   // v3.93: a administração tem Selos sem fim
const animado = () => !!(S.d && S.d.animado);
const set = j => { if (!j) return; if (j.carteira && S.d) S.d.carteira = j.carteira; if (j.animado != null && S.d) S.d.animado = j.animado; OS.request(); };
// o preço de um pacote na moeda da pessoa (no Brasil em reais; no resto, em euros)
const cur = () => { const p = OS.one('profile') || {}; return p.country === 'BR' ? 'BRL' : 'EUR'; };
const preco = pk => { const c = cur(), v = (c === 'BRL' ? pk.BRL : pk.EUR) / 100; return v.toLocaleString(c === 'BRL' ? 'pt-BR' : 'pt-PT', { style: 'currency', currency: c }); };
const chip = () => conta() ? `<a class="sl-chip" href="#selos" aria-label="Os teus Selos: ${nf(saldo())}">${ic(18)}<b>${S.d ? nf(saldo()) : '…'}</b></a>` : '';

/* ---------- v3.93 · ganhar Selos no app (sem lojas): presença, Quiz, Sombras e medalhas; limite por dia ---------- */
const GIC = { presenca: 'sun', quiz: 'bolt', sombra: 'eye', med: 'award', seele: 'gift' };
const ganharSec = d => { const g = d && d.ganhar; if (!g) return '';
  const pc = Math.min(100, Math.round(g.hoje / Math.max(1, g.limite) * 100));
  return `<section class="sl-sec sl-gan"><h3>Ganhar Selos</h3><p class="sl-gh"><span>Hoje ganhaste <b>${nf(g.hoje)}</b> de ${nf(g.limite)} Selos possíveis por dia.</span><i class="sl-gb" role="img" aria-label="${pc}% do limite de hoje"><i style="width:${pc}%"></i></i></p>
    <ul class="sl-gl">${g.formas.map(f => `<li><span class="sl-ui">${UI.ic(GIC[f.k] || 'star')}</span><span><b>${esc(f.t)}</b><small>${esc(f.d)}</small></span>${f.n ? `<em>+${nf(f.n)}${ic(14)}</em>` : '<em class="ok">Prémios</em>'}</li>`).join('')}</ul></section>`; };
// uma vez por dia, ao abrir o Prumo com a conta: os Selos da presença
const presenca = async () => { if (!conta()) return; const k = 'os2pres:' + OS.Acc.pid() + ':' + new Date().toISOString().slice(0, 10); try { if (localStorage.getItem(k)) return; } catch (e) { }
  try { const j = await call('presenca', {}); try { localStorage.setItem(k, '1'); } catch (e) { } if (j.dados > 0) { UI.toast(`+${j.dados} Selos por abrires o Prumo hoje`, 'pos'); if (S.d && j.carteira) { S.d.carteira = Object.assign({}, S.d.carteira, j.carteira); OS.request(); } } } catch (e) { } };
OS.on('ready', () => setTimeout(presenca, 4000));

/* ---------- a página (#selos) ---------- */
const NOMES = { s100: 'Punhado', s550: 'Bolsa', s1200: 'Cofre', s2600: 'Tesouro' };
const view = () => { if (!conta()) return UI.head('Selos', 'A moeda do Prumo.', '', 'Sistema') + `<div class="pn"><p style="margin:0">Entra na tua conta do Prumo para veres e usares os teus Selos.</p></div>`;
  carregar(false); const d = S.d;
  if (!d) return UI.head('Selos', 'A moeda do Prumo.', '', 'Sistema') + `<div class="pn"><p class="mut" style="margin:0">${S.err ? esc(S.err) : 'A abrir a carteira…'}</p></div>`;
  const w = d.carteira, L = d.loja, C = d.custos, comprar = L.cobranca && !loja();
  const bonus = L.bonus ? `<p class="sl-bn">${UI.ic('gift')}<span>O teu plano ${esc(L.plano)} deu-te <b>${nf(L.bonus)} Selos</b> de boas-vindas no primeiro mês.</span></p>`
    : `<p class="sl-bn">${UI.ic('gift')}<span>Quem assina o <b>Avançado</b> recebe ${nf(L.planoBonus.avancado)} Selos no primeiro mês; no <b>Completo</b>, ${nf(L.planoBonus.completo)}. <a class="acc" href="#planos">Ver os planos</a></span></p>`;
  return UI.head('Selos', 'A moeda do Prumo: compra uma vez e usa no app.', '', 'Sistema') + `<div class="sl-pg">
    <section class="sl-hero"><div class="sl-coin" aria-hidden="true">${ic(112, 'big')}</div><div class="sl-sal"><small>O teu saldo</small><b>${w.inf ? '∞' : nf(w.s)}</b><span>${w.inf ? 'Selos sem fim (conta de administração)' : w.s === 1 ? 'Selo' : 'Selos'}</span></div>${bonus}</section>
    ${ganharSec(d)}
    <section class="sl-sec"><h3>Comprar Selos</h3>${comprar && L.promo ? `<p class="sl-bf"><b>${esc(L.promo.nome)}</b><span>Até ${esc(new Date(L.promo.ate).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }))}: +${L.promo.selos}% de Selos em cada pacote, pelo mesmo preço.</span></p>` : ''}${comprar ? `<div class="sl-pks">${L.pacotes.map((pk, i) => `<article class="sl-pk${i === 2 ? ' top' : ''}">${i === 2 ? '<span class="sl-tag">Melhor valor</span>' : ''}<span class="sl-pki">${ic(i < 2 ? 34 : 44)}${i > 1 ? ic(26, 'b2') : ''}</span><small>${NOMES[pk.id] || ''}</small><b>${nf(pk.n + pk.b + (pk.bf || 0))}</b><span class="sl-pkb">${pk.b || pk.bf ? `${nf(pk.n)}${pk.b ? ' + ' + nf(pk.b) + ' de oferta' : ''}${pk.bf ? ` + <em class="sl-bfx">${nf(pk.bf)} de Black Friday</em>` : ''}` : 'Selos'}</span><button type="button" class="btn ${i === 2 ? 'pri' : ''} sl-buy" data-act="slComprar" data-id="${pk.id}">${preco(pk)}</button></article>`).join('')}</div>
        <p class="mut sl-legal">Pagamento único pelo Stripe (cartão, Apple Pay ou Google Pay): o Prumo nunca vê o teu cartão. Os Selos ficam neste perfil e não valem dinheiro nem se trocam. Os que ainda não usaste podem ser devolvidos até 14 dias depois da compra (7 no Brasil); os gastos não. Mais em <a class="acc" href="planos.html" target="_blank" rel="noopener">Planos e preços</a>.</p>`
      : `<p class="mut">${loja() ? 'A compra de Selos não está disponível nesta app: ganha-os a jogar e a cumprir (vê acima) ou compra no site do Prumo. Os que já tens usam-se aqui.' : 'A compra de Selos abre em breve. Entretanto, ganha-os a jogar e a cumprir (vê acima).'}</p>`}</section>
    <section class="sl-sec"><h3>Onde usar os Selos</h3><div class="sl-usos">
      <a class="sl-uso" href="#animes.clas"><span class="sl-ui">${UI.ic('users')}</span><span><b>Reforçar um clã</b><small>Cada clã começa com 20 vagas. Cada reforço dá mais ${C.vagas} vagas, para sempre, e qualquer membro pode reforçar.</small></span><em>${ic(16)}${nf(C.reforco)}</em></a>
      <div class="sl-uso"><span class="sl-ui">${UI.ic('play')}</span><span><b>Foto e fundo animados no perfil</b><small>Um GIF como foto e como fundo do teu perfil. Já vem incluído no Avançado e no Completo.</small></span>${d.animado ? '<em class="ok">Desbloqueado</em>' : `<button type="button" class="btn sm pri" data-act="slAnimado">${ic(16)}${nf(C.animado)}</button>`}</div></div></section>
    ${w.mov.length ? `<section class="sl-sec"><h3>Movimentos</h3><ul class="sl-mov">${w.mov.map(m => `<li><span>${esc(m.d)}<small>${new Date(m.at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}</small></span><b class="${m.v > 0 ? 'pos' : 'neg'}">${m.v > 0 ? '+' : '−'}${nf(Math.abs(m.v))}</b></li>`).join('')}</ul></section>` : ''}</div>`; };
OS.views.selos = view;

/* ---------- ações ---------- */
A.slComprar = async b => { b.disabled = true; const t = b.textContent; b.textContent = 'A abrir…';
  try { const j = await call('selosComprar', { pac: b.dataset.id, cur: cur(), volta: location.origin + location.pathname }); if (j.url) location.href = j.url; }
  catch (e) { UI.toast(e.message || 'O pagamento não abriu.', 'neg'); b.disabled = false; b.textContent = t; } };
A.slAnimado = () => { const C = (S.d || {}).custos || { animado: 500 };
  if (saldo() < C.animado) return UI.toast(`Precisas de ${nf(C.animado)} Selos e tens ${nf(saldo())}.`, 'warn');
  UI.ask('Desbloquear a foto e o fundo animados?', `Gastas ${nf(C.animado)} Selos e ficas com eles para sempre neste perfil. Depois escolhe um GIF em Perfil › Editar.`, 'Desbloquear', async () => {
    try { set(await call('perfilAnimado', {})); UI.toast('Foto e fundo animados desbloqueados.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } }); };
// de volta do Stripe: #selos?ok=cs_…
const volta = async () => { const m = String(location.hash).match(/^#selos\?ok=(cs_[A-Za-z0-9_]+)/); if (!m || !conta()) return;
  try { history.replaceState(null, '', location.pathname + '#selos'); } catch (e) { }
  try { const j = await call('selosConfirmar', { sid: m[1] }); S.d = j; S.at = Date.now(); OS.request(); UI.toast(j.dados ? `Chegaram ${nf(j.dados)} Selos à tua carteira.` : 'Os Selos já estavam na tua carteira.', 'pos'); if (OS.Vivo && OS.Vivo.confetti) OS.Vivo.confetti(); }
  catch (e) { UI.toast(e.message || 'Ainda não deu para confirmar o pagamento. Abre os Selos daqui a um minuto.', 'warn'); } };
addEventListener('hashchange', volta); OS.on('ready', () => setTimeout(volta, 800));
OS.Selos = { ic, chip, carregar, saldo, animado, set, view, _S: S };
})();
