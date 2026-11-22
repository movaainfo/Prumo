/* PRUMO — os planos (o app é todo pago): Essencial, Avançado e Completo, com 14 dias grátis do Completo ao criar a conta.
   O servidor decide o plano de cada conta (api/conta → conta.plano) e aplica os limites (IA por dia, fotos, perfis, banco).
   Aqui: a página Planos (assinar, mudar, cancelar, gerir o pagamento), o aviso do teste grátis, o bloqueio das páginas e funções
   de cada plano e o ecrã "Escolhe um plano" quando o teste acaba. A conta do dono (administração) e o modo pessoal têm tudo.
   O Spotify não faz parte dos planos: só para as contas que a administração escolhe. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const PL = OS.Plano = {};
const NOME = { 1: 'Essencial', 2: 'Avançado', 3: 'Completo' }, ID = { 1: 'essencial', 2: 'avancado', 3: 'completo' };
PL.cur = () => { if (!(OS.Acc && OS.Acc.on)) return { id: 'completo', n: 'Completo', lvl: 3, local: 1 }; const s = OS.Acc.sess && OS.Acc.sess(); return (s && s.plano) || { id: 'completo', n: 'Completo', lvl: 3, porVer: 1 }; };
PL.lvl = () => +(PL.cur().lvl || 0);
// funções que dependem do plano (o resto é de todos os planos)
const CAPS = { fotos: 2, calc: 2, paletas: 2, futebolIA: 2, masmorras: 2, deep: 3, voz: 1, banco: 3, resumoMail: 3, palPro: 3, desportos: 3 };   // desportos: NBA, F1, MotoGP, MMA, ténis…, Olimpíadas e Copa (o Futebol é de todos)   // voz: com a chave da própria pessoa, em qualquer plano
PL.can = cap => PL.lvl() >= (CAPS[cap] || 1);
// páginas que dependem do plano
const ROUTES = { universidade: 2, cursos: 2, certificacoes: 2, aprendizagem: 2, conhecimento: 2, carreira: 2, capital: 2, oportunidades: 2, investimentos: 2, ativos: 2, cotacoes: 2, simuladores: 2, email: 2, decisoes: 2, coach: 2, relatorios: 3 };
const FREE = new Set(['planos', 'definicoes', 'perfil', 'ajuda', 'sobre', 'admin']);   // abrem sempre (mesmo sem plano): escolher plano, conta e dados
PL.ROUTES = ROUTES; PL.CAPS = CAPS;
// o que cada plano traz (a página Planos e os cadeados)
const FEAT = {
  1: ['Tarefas, hábitos, rotina por horas e agenda', 'Notificações com o app fechado (rotina, bloco de foco)', 'Finanças à mão e importar extratos do banco', 'Treino, dieta, corrida, sono e Cozinha', 'Diário, Fé, leituras, animes e Mundo', 'Futebol: as tuas equipas ao vivo, tabelas e avisos de golo', 'Ranking, dias de foco e Dominus (missões e chefe)', 'Cofre de senhas, atalhos do iPhone e a agenda no Calendário', 'Escala do trabalho a partir de Excel ou CSV', 'IA: 20 pedidos por dia', '1 perfil'],
  2: ['Tudo do Essencial', 'IA: 150 pedidos por dia, com fotos e PDFs (comida, exames, escala do trabalho por foto ou PDF)', 'E-mail e notícias com IA', 'Universidade, cursos, carreira e oportunidades', 'Investimentos ao vivo e simuladores', 'Calculadora financeira, gráfica e de cálculo', 'Futebol com a análise da IA e "Ver o jogo"', 'Dominus completo (masmorras), cores e fundos', 'Até 3 perfis'],
  3: ['Tudo do Avançado', 'Desportos completos: NBA, NFL, Fórmula 1, MotoGP, MMA, ténis e mais, com as Olimpíadas e a Copa do Mundo, e avisos de cada jogo', 'O teu banco ligado: os movimentos entram sozinhos (Open Finance)', 'IA: 400 pedidos por dia', 'Relatórios e impostos (IRS e IRPF)', 'O resumo do teu mês no e-mail (se quiseres)', 'Paletas de cores exclusivas: Ouro, Aurora e Sakura', 'Atendimento prioritário: os teus pedidos passam à frente', 'Até 5 perfis: um para cada pessoa da família, cada um com o seu código'] };
PL.FEAT = FEAT;
const fmtD = ms => ms ? new Date(ms).toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const dias = ms => Math.max(0, Math.ceil((ms - Date.now()) / 864e5));
const money = (c, cur) => (c / 100).toLocaleString(cur === 'BRL' ? 'pt-BR' : (OS.loc ? OS.loc() : 'pt-PT'), { style: 'currency', currency: cur, minimumFractionDigits: 2 });
// v3.60: os preços são em euros (o que o dono recebe). Quem usa outra moeda vê ao lado o valor aproximado nela; ao pagar, o Stripe converte pelo câmbio do dia
const MOEDAS = [['EUR', 'euros'], ['USD', 'dólares'], ['BRL', 'reais']];
// câmbio do dia (BCE, pela Frankfurter), guardado 12 h; sem rede, não mostra o aproximado
let FX = (() => { try { const o = JSON.parse(localStorage.getItem('os2plfx') || 'null'); return o && Date.now() - o.at < 12 * 36e5 ? o : null; } catch (e) { return null; } })(), FXB = false;
const loadFx = async () => { if (FX || FXB) return; FXB = true; try { const j = await (await fetch('https://api.frankfurter.dev/v1/latest?base=EUR')).json(); if (j && j.rates) { FX = { at: Date.now(), r: j.rates }; try { localStorage.setItem('os2plfx', JSON.stringify(FX)); } catch (e) { } OS.request(); } } catch (e) { } };
const approx = (c, cur) => { const r = FX && FX.r && +FX.r[cur]; if (!r || cur === 'EUR') return ''; const v = c * r; return '≈ ' + (v / 100).toLocaleString(cur === 'BRL' ? 'pt-BR' : (OS.loc ? OS.loc() : 'pt-PT'), { style: 'currency', currency: cur, maximumFractionDigits: v >= 100000 ? 0 : 2 }); };
const titleOf = k => { for (const [, L] of (OS.NAV || [])) for (const it of L) if (it[0] === k) return it[1]; return k.charAt(0).toUpperCase() + k.slice(1); };
const lock = (need, what) => `<div class="pn pl-lock"><div class="pl-li">${UI.ic('lock')}</div><div class="grow"><b>${esc(what || 'Esta parte')} está no plano ${NOME[need]}${need < 3 ? ' (e no Completo)' : ''}</b>
  <p class="mut">${PL.lvl() ? 'O teu plano é o ' + esc(NOME[PL.lvl()]) + '.' : 'O teu teste grátis acabou.'} Muda de plano para a desbloquear; os teus dados ficam todos.</p>
  <a class="btn pri sm" href="#planos">${UI.ic('star')}Ver os planos</a></div></div>`;
PL.lock = lock;

/* ---------- os preços (do servidor) ---------- */
let PRE = null, PREB = false;
const loadPre = async () => { if (PRE || PREB || !(OS.Acc && OS.Acc.call)) return; PREB = true; try { PRE = await OS.Acc.call('planos', {}); } catch (e) { } PREB = false; OS.request(); };
// a moeda de quem vê (para o valor aproximado e a língua da página de pagamento)
const curOf = () => { const p = OS.one('profile') || {}, k = String((OS.cur && OS.cur()) || p.cur || '').toUpperCase(); return p.country === 'BR' ? 'BRL' : /^[A-Z]{3}$/.test(k) ? k : 'EUR'; };

/* ---------- a página Planos ---------- */
const status = c => { if (c.local) return 'Modo pessoal: tens tudo.';
  if (c.admin) return 'Conta de administração: tens tudo, sem limites.';
  if (c.oferta) return `Plano ${esc(c.n)}, oferecido pela administração${c.ate ? ' até ' + fmtD(c.ate) : ''}.`;
  if (c.pago) return `Plano ${esc(c.n)} (${c.ciclo === 'ano' ? 'anual' : 'mensal'}). ${c.cancelar ? 'Cancelado: continua até ' + fmtD(c.ate) + '.' : 'Renova a ' + fmtD(c.ate) + '.'}`;
  if (c.teste) return `Teste grátis do Completo: ${dias(c.ate) === 1 ? 'falta 1 dia' : 'faltam ' + dias(c.ate) + ' dias'} (até ${fmtD(c.ate)}). Sem cartão: escolhe um plano quando quiseres.`;
  if (c.acabou) return 'O teu teste grátis acabou. Escolhe um plano para continuar; os teus dados estão todos guardados.';
  if (c.semCobranca) return 'As assinaturas abrem em breve: até lá tens tudo do Completo.';
  return ''; };
const cards = (c, P0) => { const loja = !!(OS.Loja && OS.Loja.on), cur = 'EUR', loc = curOf(), ci = OS.ui.plCiclo === 'ano' ? 'ano' : 'mes', L = (P0 && P0.planos) || [], open = !!(P0 && P0.cobranca);
  if (loc !== 'EUR') loadFx();
  return `<div class="pl-ctl"><div class="seg" role="radiogroup" aria-label="Pagamento">${[['mes', 'Mensal'], ['ano', 'Anual · 2 meses grátis']].map(([k, l]) => `<button type="button" class="${ci === k ? 'on' : ''}" data-act="plCiclo" data-v="${k}" aria-pressed="${ci === k}">${l}</button>`).join('')}</div>
    ${c.pago && c.cur && c.cur !== 'EUR' ? `<span class="mut pl-curx">A tua assinatura é paga em ${esc((MOEDAS.find(m => m[0] === c.cur) || [, c.cur])[1])}</span>` : ''}</div>
  ${loja ? '<p class="mut pl-curn">Nesta versão da app não há compras: aqui vês o teu plano e o que cada um inclui.</p>' : ''}<p class="mut pl-curn"${loja ? ' hidden' : ''}>Os preços são em euros, com impostos incluídos.${loc !== 'EUR' ? ' Ao pagar, vês o valor na tua moeda, convertido pelo câmbio do dia (o valor ao lado de cada preço é aproximado).' : ' Se pagares com um cartão noutra moeda, o valor é convertido pelo câmbio do dia.'}</p>
  ${open && !c.pago && !c.local && !loja ? cupBox() : ''}
  <div class="pl-g">${[1, 2, 3].map(l => { const p = L.find(x => x.lvl === l), pr = p && p.precos && p.precos[cur], val = pr ? pr[ci] : 0, mine = c.pago && c.lvl === l, top = l === 3;
    const btn = loja ? (mine ? `<button class="btn" disabled>${UI.ic('check')}O teu plano</button>` : '') : !open ? `<button class="btn" disabled>${c.admin ? 'Liga o Stripe para abrir' : 'Em breve'}</button>`
      : c.admin || c.local ? `<button class="btn" disabled>Tens tudo</button>`
      : mine ? `<button class="btn" disabled>${UI.ic('check')}O teu plano</button>`
      : c.pago ? `<button class="btn ${top ? 'pri' : ''}" data-act="plMudar" data-id="${ID[l]}">${l > c.lvl ? 'Subir para o ' : 'Mudar para o '}${NOME[l]}</button>`
      : `<button class="btn ${top ? 'pri' : ''}" data-act="plAssinar" data-id="${ID[l]}">Assinar o ${NOME[l]}</button>`;
    return `<section class="pl-c${top ? ' top' : ''}${mine || (!c.pago && c.lvl === l && !c.teste) ? ' mine' : ''}"><div class="pl-ch"><b>${NOME[l]}</b>${top ? '<span class="bdg pos">o mais completo</span>' : ''}</div>
      ${(() => { const cp = cupOk(ID[l]) && !c.pago ? OS.ui.plCupao : null, dv = cp ? Math.round(val * (100 - cp.pct)) / 100 : 0;
        if (cp && val) return `<div class="pl-p"><s class="pl-old">${money(val, cur)}</s> <b>${money(dv, cur)}</b><small>/${ci === 'ano' ? 'ano' : 'mês'}</small></div><small class="pl-cupn">−${cp.pct}% ${esc(cupDur(cp, ci))}</small>`;
        const ax = val ? approx(val, loc) : '';
        return `<div class="pl-p">${val ? `<b>${money(val, cur)}</b><small>/${ci === 'ano' ? 'ano' : 'mês'}</small>` : '<b>—</b>'}</div>${val && ci === 'ano' ? `<small class="mut">${money(Math.round(val / 12), cur)} por mês${ax ? ' · ' + ax + ' por ano' : ''}</small>` : ax ? `<small class="mut pl-ax">${ax} por mês</small>` : '<small class="mut">&nbsp;</small>'}`; })()}
      <ul class="pl-f">${FEAT[l].map(f => `<li>${UI.ic('check')}<span>${esc(f)}</span></li>`).join('')}</ul>${btn}</section>`; }).join('')}</div>`; };
/* ---------- v3.31: código de desconto (criado pela administração) ---------- */
const cupOk = id => { const cp = OS.ui.plCupao; return !!cp && (!(cp.planos || []).length || cp.planos.includes(id)); };
const cupDur = (cp, ci) => cp.dur === 'forever' ? 'sempre' : cp.dur === 'repeating' ? (ci === 'ano' ? 'no 1.º ano' : `durante ${cp.meses} ${cp.meses === 1 ? 'mês' : 'meses'}`) : (ci === 'ano' ? 'no 1.º ano' : 'no 1.º mês');
const cupBox = () => { const cp = OS.ui.plCupao;
  if (cp) return `<div class="pl-cup on"><span>${UI.ic('check')}Código <b>${esc(cp.code)}</b>: −${cp.pct}%${(cp.planos || []).length ? ' no ' + cp.planos.map(x => NOME[{ essencial: 1, avancado: 2, completo: 3 }[x]]).join(' e ') : ''}${cp.novos ? ' (só para a primeira assinatura)' : ''}</span><button type="button" class="btn xs ghost" data-act="plCupaoX">Tirar</button></div>`;
  return `<form class="pl-cup" data-form="plCupao"><label for="plCupIn">Tens um código de desconto?</label><div class="row gap8"><input id="plCupIn" class="field" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="30" placeholder="Ex.: LANCAMENTO20"><button class="btn sm" type="submit">Aplicar</button></div></form>`; };
OS.forms.plCupao = async (f, v) => { const code = String(v('code') || '').trim(); if (!code) return; const bt = f.querySelector('button'); bt.disabled = true;
  try { const j = await OS.Acc.call('cupao', { code }); OS.ui.plCupao = j.cupao; UI.toast('Código ' + j.cupao.code + ' aplicado: −' + j.cupao.pct + '%', 'pos'); OS.request(); }
  catch (e) { UI.toast(e.message || 'Esse código não é válido.', 'neg'); bt.disabled = false; } };
A.plCupaoX = () => { OS.ui.plCupao = null; OS.request(); };
const V0 = () => { const c = PL.cur(); loadPre(); const P0 = PRE;
  const adm = c.admin && P0 && !P0.cobranca ? `<div class="pn"><h3 style="margin:0 0 6px">Abrir as assinaturas (só tu vês isto)</h3><ol class="ai-steps"><li>Cria conta em <b>stripe.com</b> e completa os dados da tua atividade (o Stripe pede a identificação e o IBAN para receberes).</li><li>Em Developers → API keys, copia a <b>chave secreta</b> (começa por <code>sk_live_</code>; para experimentar, <code>sk_test_</code>).</li><li>No Vercel, projeto prumo → Settings → Environment Variables, cria <code>STRIPE_SECRET_KEY</code> com essa chave e faz Redeploy. Cola-a só no Vercel.</li><li>No Stripe, em Settings → Billing → <b>Customer portal</b>, carrega em Guardar (é onde cada pessoa muda o cartão e vê as faturas).</li></ol><p class="mut" style="margin:0">Os preços estão em <code>api/_planos.js</code> (ou na variável <code>NAUTILO_PRECOS</code>). Até ligares o Stripe ninguém fica bloqueado.</p></div>` : '';
  const man = c.pago && c.loja ? `<p class="mut" style="margin:12px 0 0">Compraste este plano na ${/app_store|mac_app|apple/.test(c.loja) ? 'App Store' : /play/.test(c.loja) ? 'Play Store' : 'loja de apps'}: para mudar, cancelar ou ver as faturas, usa as subscrições da ${/app_store|mac_app|apple/.test(c.loja) ? 'App Store (Definições › o teu nome › Subscrições)' : 'Play Store (Play Store › perfil › Pagamentos e subscrições)'}.</p>`
    : c.pago && !(OS.Loja && OS.Loja.on) ? `<div class="row gap8" style="flex-wrap:wrap;margin-top:12px"><button class="btn sm" data-act="plPortal">${UI.ic('card')}Gerir pagamento e faturas</button>${c.cancelar ? `<button class="btn sm" data-act="plRetomar">Retomar a assinatura</button>` : `<button class="btn sm ghost" data-act="plCancelar">Cancelar a assinatura</button>`}</div>` : '';
  const intro = OS.ui.plIntro && c.teste ? `<div class="pn pl-intro"><h3>Bem-vindo ao Prumo</h3><p>Tens <b>${dias(c.ate)} dias grátis do plano Completo</b>, sem cartão. Escolhe já o teu plano aqui em baixo ou continua com o teste: avisamos-te antes de acabar e os teus dados ficam sempre guardados.</p><button type="button" class="btn pri" data-act="plIntroOk">Continuar com o teste grátis</button></div>` : '';
  return UI.head('Planos', OS.Loja && OS.Loja.on ? 'Os planos do Prumo e o que cada um inclui.' : 'Escolhe o plano do teu Prumo. Mudas ou cancelas quando quiseres.', '', 'Sistema') + `<div class="pl-page">${intro}
    <div class="pn pln-st"><div class="pn-h"><h3>${UI.ic('star')}O teu plano</h3>${c.lvl ? `<span class="bdg ${c.teste ? 'warn' : 'pos'}">${esc(c.teste ? 'Teste do Completo' : c.n || NOME[c.lvl])}</span>` : '<span class="bdg neg">sem plano</span>'}</div><p style="margin:0">${status(c)}</p>${man}</div>
    ${adm}${P0 ? cards(c, P0) : '<div class="pn"><p class="mut" style="margin:0">A carregar os preços…</p></div>'}
    <p class="mut pl-legal">Os novos ganham ${(P0 && P0.testeDias) || 14} dias grátis do plano Completo, sem cartão. As assinaturas renovam sozinhas; cancelas quando quiseres e o plano continua até ao fim do período pago. Os pagamentos são feitos pelo Stripe: o Prumo nunca vê o teu cartão. Mais nos <a class="acc" href="termos.html" target="_blank" rel="noopener">Termos</a>.</p></div>`; };
OS.views.planos = () => V0();

/* ---------- v3.24: os planos aparecem sozinhos ao entrar (uma vez por conta neste aparelho), durante o teste grátis ---------- */
const introKey = () => 'os2plIntro:' + ((OS.Acc && OS.Acc.email && OS.Acc.email()) || '');
const introDue = () => { const c = PL.cur(); if ((OS.Loja && OS.Loja.on) || !(OS.Acc && OS.Acc.on && OS.Acc.email && OS.Acc.email()) || !c.teste || !c.cobranca || c.admin || c.pago || U.ls.get(introKey(), 0)) return false;
  if (document.getElementById('acc') || (OS.Onb && OS.Onb.isOpen && OS.Onb.isOpen()) || !(window.__noOnb || (OS.one('onb') || {}).done)) return false;
  if (OS.Legal && OS.Legal.pending && OS.Legal.pending()) return false; const m = document.getElementById('modal'); if (m && !m.hidden) return false;
  return !(OS.Lock && OS.Lock.unlocked) || OS.Lock.unlocked(); };
const introTry = () => { if (!introDue()) return; U.ls.set(introKey(), 1); OS.ui.plIntro = 1; if (location.hash === '#planos') OS.request(); else location.hash = 'planos'; };
OS.on('ready', () => setTimeout(introTry, 1500)); setInterval(introTry, 3000);
A.plIntroOk = () => { OS.ui.plIntro = 0; location.hash = 'visao'; };

/* ---------- ações ---------- */
const volta = () => location.origin + location.pathname;
const busy = b => { if (b) { b.disabled = true; b.dataset.l = b.innerHTML; b.textContent = 'A abrir…'; } };
const free = b => { if (b) { b.disabled = false; if (b.dataset.l) b.innerHTML = b.dataset.l; } };
const take = j => { if (j && j.conta && OS.Acc.take) OS.Acc.take(j); OS.request(); };
A.plCiclo = b => { OS.ui.plCiclo = b.dataset.v; OS.request(); };
A.plAssinar = async b => { busy(b); try { const j = await OS.Acc.call('checkout', Object.assign({ plano: b.dataset.id, ciclo: OS.ui.plCiclo === 'ano' ? 'ano' : 'mes', cur: curOf(), volta: volta() }, OS.ui.plCupao && cupOk(b.dataset.id) ? { cupao: OS.ui.plCupao.code } : {})); if (j.url) location.href = j.url; }
  catch (e) { UI.toast(e.message || 'Não consegui abrir o pagamento.', 'neg'); free(b); } };
A.plMudar = b => { const id = b.dataset.id, n = NOME[{ essencial: 1, avancado: 2, completo: 3 }[id]];
  UI.ask('Mudar para o ' + n + '?', 'A diferença de preço é acertada pelo Stripe na próxima fatura (proporcional aos dias que faltam).', 'Mudar de plano', async () => {
    try { take(await OS.Acc.call('mudarPlano', { plano: id, ciclo: OS.ui.plCiclo === 'ano' ? 'ano' : 'mes' })); UI.toast('Plano mudado para o ' + n + '.', 'pos'); } catch (e) { UI.toast(e.message || 'Não consegui mudar o plano.', 'neg'); } }); };
A.plCancelar = () => UI.ask('Cancelar a assinatura?', 'O plano continua até ao fim do período já pago e depois não renova. Os teus dados ficam guardados.', 'Cancelar a assinatura', async () => {
  try { take(await OS.Acc.call('cancelarPlano', {})); UI.toast('Assinatura cancelada: continua até ao fim do período pago.', 'pos'); } catch (e) { UI.toast(e.message || 'Não consegui cancelar.', 'neg'); } });
A.plRetomar = async () => { try { take(await OS.Acc.call('retomarPlano', {})); UI.toast('A assinatura continua.', 'pos'); } catch (e) { UI.toast(e.message || 'Não consegui retomar.', 'neg'); } };
A.plPortal = async b => { busy(b); try { const j = await OS.Acc.call('portal', { volta: volta() }); if (j.url) location.href = j.url; } catch (e) { UI.toast(e.message || 'Não consegui abrir.', 'neg'); free(b); } };
// de volta do pagamento: #planos?ok=cs_…
const backFromPay = async () => { const m = String(location.hash).match(/^#planos\?ok=(cs_[A-Za-z0-9_]+)/); if (!m || !(OS.Acc && OS.Acc.on)) return;
  try { history.replaceState(null, '', location.pathname + '#planos'); } catch (e) { }
  try { take(await OS.Acc.call('confirmar', { sid: m[1] })); UI.toast('Bem-vindo ao plano ' + (PL.cur().n || '') + '!', 'pos'); if (OS.Vivo && OS.Vivo.confetti) OS.Vivo.confetti(); }
  catch (e) { UI.toast(e.message || 'Ainda não consegui confirmar o pagamento. Tenta daqui a um minuto.', 'warn'); } };
addEventListener('hashchange', backFromPay);

/* ---------- bloqueios: páginas, funções e o ecrã sem plano ---------- */
const paywall = () => UI.head('Escolhe o teu plano', 'O teu teste grátis acabou. Os teus dados estão todos guardados e voltam assim que escolheres um plano.', '', 'Prumo') + `<div class="pl-page">${PRE ? cards(PL.cur(), PRE) : (loadPre(), '<div class="pn"><p class="mut" style="margin:0">A carregar os planos…</p></div>')}
  <p class="mut pl-legal">Podes sempre abrir as <a class="acc" href="#definicoes">Definições</a> para exportar os teus dados ou apagar a conta.</p></div>`;
const wrapViews = () => { const V = OS.views; Object.keys(V).forEach(k => { const f = V[k]; if (typeof f !== 'function' || f._pl) return;
    const g = sub => { const l = PL.lvl(); if (!l && !FREE.has(k)) return paywall();
      if (ROUTES[k] && l < ROUTES[k]) return UI.head(titleOf(k), '', '', '') + lock(ROUTES[k], 'Esta página');
      if (k === 'dominus' && /^bestiario/.test(String(sub || '')) && !PL.can('masmorras')) return UI.head('Dominus', 'As masmorras', `<a class="btn sm" href="#dominus">${UI.ic('left')}Voltar ao Dominus</a>`, 'Jogo') + lock(2, 'As masmorras');
      return f(sub); };
    g._pl = 1; Object.keys(f).forEach(x => { g[x] = f[x]; }); V[k] = g; }); };
OS.on('ready', () => { setTimeout(wrapViews, 0); setTimeout(wrapViews, 1500); backFromPay(); });
// funções: cores e fundos, futebol com IA, calculadora avançada e voz humana
const gateAct = (name, cap, what) => { const f = A[name]; if (typeof f !== 'function' || f._pl) return; const g = (...a) => { if (!PL.can(cap)) { UI.toast(what + ' está no plano ' + NOME[CAPS[cap]] + '. Vê os planos em Planos.', 'warn'); return; } return f(...a); }; g._pl = 1; A[name] = g; };
OS.on('ready', () => setTimeout(() => { gateAct('palSet', 'paletas', 'Mudar as cores do app'); gateAct('fbAI', 'futebolIA', 'A análise do jogo com IA'); gateAct('fbYt', 'futebolIA', '"Ver o jogo"'); }, 0));
document.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('#calc [data-m], #fd [data-fd]'); if (!t) return;
  if (t.dataset.m && t.dataset.m !== 'bas' && !PL.can('calc')) { e.preventDefault(); e.stopPropagation(); UI.toast('A calculadora financeira, gráfica e de cálculo está no plano Avançado.', 'warn'); }
  else if (t.dataset.fd && t.dataset.fd !== 'x' && !PL.can('paletas')) { e.preventDefault(); e.stopPropagation(); UI.toast('Mudar o fundo está no plano Avançado.', 'warn'); } }, true);

/* ---------- Definições › Geral: o teu plano ---------- */
OS.on('ready', () => setTimeout(() => { const o = OS.views.definicoes; if (!o || o._plS) return; const g = sub => { const h = o(sub); if (String(sub || '') !== '' || !(OS.Acc && OS.Acc.on)) return h; const c = PL.cur();
    const pn = `<div class="pn" id="plSet"><div class="pn-h"><h3>${UI.ic('star')}O teu plano</h3><span class="mut" style="font-size:12px">${esc(c.teste ? 'Teste do Completo' : c.n || '—')}</span></div><p class="mut" style="margin:0 0 10px">${status(c)}</p><a class="btn sm pri" href="#planos">Ver os planos</a></div>`;
    const i = h.indexOf('<div class="pn'); return i > 0 ? h.slice(0, i) + pn + h.slice(i) : h + pn; }; g._plS = 1; Object.keys(o).forEach(x => { if (x !== '_plS') g[x] = o[x]; }); OS.views.definicoes = g; }, 10));
/* ---------- o aviso do teste grátis (no Painel e no Hoje, uma vez por dia) ---------- */
PL.banner = () => { const c = PL.cur(); if (!c.teste || !c.ate) return ''; const d = dias(c.ate), k = 'os2plBan' + U.today(); if (d > 3 && U.ls.get(k, 0)) return '';
  return `<div class="pl-ban${d <= 3 ? ' warn' : ''}"><span>${UI.ic('star')}<b>Teste grátis do Completo</b> · ${d === 1 ? 'falta 1 dia' : 'faltam ' + d + ' dias'}</span><a class="btn xs pri" href="#planos">Escolher plano</a>${d > 3 ? `<button type="button" class="icon-btn" data-act="plBanX" aria-label="Fechar">${UI.ic('x')}</button>` : ''}</div>`; };
A.plBanX = () => { U.ls.set('os2plBan' + U.today(), 1); OS.request(); };
OS.on('ready', () => setTimeout(() => ['visao', 'hoje'].forEach(k => { const f = OS.views[k]; if (typeof f !== 'function' || f._ban) return; const g = sub => { const h = f(sub), b = PL.banner(); if (!b) return h; const i = h.indexOf('</header>'); return i > 0 ? h.slice(0, i + 9) + b + h.slice(i + 9) : b + h; }; g._ban = 1; Object.keys(f).forEach(x => { g[x] = f[x]; }); OS.views[k] = g; }), 0));
})();
