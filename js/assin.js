/* PRUMO — Caça às assinaturas (v4.01), em Finanças › O dia a dia.
   Procura nos movimentos o que se repete todos os meses ou todos os anos (mesma descrição, valor parecido, intervalo regular) e as marcas
   conhecidas de assinaturas, junta as recorrentes que já registaste e mostra quanto te custam por mês e por ano e quando é a próxima cobrança.
   Para cada uma decides: «Uso» (fica), «Quero cancelar» (cria uma tarefa 2 dias antes da renovação) ou «Já cancelei» (conta para o que poupas por ano). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act; if (!OS.views || !OS.views.financas) return;
OS.ONE_DEF.assin = { D: {} };
const DEC = () => { const o = OS.one('assin'); if (!o.D) o.D = {}; return o.D; };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(pt|br|lda|sa|ltda|inc|com|www|pagamento|compra|debito|direto|dd|mb|way|ref|trf|pag|cartao)\b/g, ' ').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
// marcas comuns de assinaturas (só para reconhecer a descrição no extrato; o nome que aparece é o do teu movimento)
const MARCAS = /netflix|spotify|disney|hbo|\bmax\b|prime video|amazon prime|apple\.com|icloud|apple music|apple tv|youtube premium|google one|google storage|playstation|ps plus|xbox|game pass|nintendo|crunchyroll|deezer|tidal|audible|kindle unlimited|dazn|sport tv|eleven|paramount|skyshowtime|globoplay|microsoft 365|office 365|adobe|canva|dropbox|notion|chatgpt|openai|claude|anthropic|midjourney|duolingo|headspace|calm|strava|linkedin premium|tinder|bumble|patreon|onlyfans|twitch|discord nitro|ginasio|ginásio|fitness|gym|seguro|jornal|publico|expresso|observador|nyt|meo|nos\b|vodafone|digi\b|uber one|bolt plus|glovo prime/i;
const limpo = s => String(s || '').replace(/([\s*#/-]+(ref\.?\s*)?\d{3,})+\s*$/i, '').trim() || String(s || '');   // tira só números de referência no fim
const CAD = d => d >= 6 && d <= 8 ? 'Semanal' : d >= 25 && d <= 35 ? 'Mensal' : d >= 85 && d <= 95 ? 'Trimestral' : d >= 350 && d <= 380 ? 'Anual' : '';
const MES = { Semanal: 52 / 12, Mensal: 1, Trimestral: 1 / 3, Anual: 1 / 12 }, PASSO = { Semanal: 7, Mensal: 30, Trimestral: 91, Anual: 365 };
const mesMais = (iso, n, d) => { const [y, m] = iso.split('-').map(Number), k = new Date(y, m - 1 + n, 1), fim = new Date(k.getFullYear(), k.getMonth() + 1, 0).getDate(); return k.getFullYear() + '-' + U.pad(k.getMonth() + 1) + '-' + U.pad(Math.min(d, fim)); };
const proxData = (ult, cad) => { if (!ult) return ''; const hoje = U.today(), d = +ult.slice(8, 10); let s, i = 1;
  if (cad === 'Mensal' || cad === 'Trimestral' || cad === 'Anual') { const n = cad === 'Mensal' ? 1 : cad === 'Trimestral' ? 3 : 12; do { s = mesMais(ult, n * i++, d); } while (s < hoje && i < 600); return s; }
  s = U.addDays(ult, 7); while (s < hoje) s = U.addDays(s, 7); return s; };
// deteção: grupos pela descrição normalizada, valor estável (±12%), intervalos regulares e ainda ativa (cobrada no último ciclo e meio)
const detetar = () => { const T = OS.all('transactions').filter(x => x.type === 'Despesa' && x.desc && !x.instG && U.num(x.amount) > 0), G = {}, out = [], hoje = U.today();
  T.forEach(x => { const k = norm(x.desc); if (k.length >= 3) (G[k] = G[k] || []).push(x); });
  Object.entries(G).forEach(([k, L]) => { L = U.sortBy(L, x => x.date); const v = L.map(x => U.num(x.amount)), med = v.slice().sort((a, b) => a - b)[v.length >> 1], est = v.filter(a => Math.abs(a - med) <= med * .12).length >= Math.max(2, v.length * .7);
    const gaps = L.slice(1).map((x, i) => U.diff(x.date, L[i].date)).filter(g => g > 3), cads = gaps.map(CAD).filter(Boolean), marca = MARCAS.test(L[L.length - 1].desc);
    const moda = Object.entries(cads.reduce((o, c) => (o[c] = (o[c] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1])[0];
    let cad = moda && moda[1] >= Math.max(1, gaps.length * .6) ? moda[0] : ''; if (!cad && marca && L.length === 1) cad = 'Mensal';
    if (!cad || !est || (L.length < 2 && !marca)) return; const ult = L[L.length - 1].date; if (U.diff(hoje, ult) > PASSO[cad] * 1.6) return;
    out.push({ id: 'tx:' + k, nome: limpo(L[L.length - 1].desc), valor: U.r2 ? U.r2(med) : Math.round(med * 100) / 100, cad, ult, prox: proxData(ult, cad), n: L.length, marca, cat: L[L.length - 1].cat || '', fonte: 'movimentos' }); });
  OS.all('recurring').filter(r => r.type === 'Despesa' && r.active !== false && (r.kind === 'Assinatura' || MARCAS.test(r.name || ''))).forEach(r => { const k = norm(r.name);
    const ja = out.find(o => o.id === 'tx:' + k || (k.length >= 4 && (norm(o.nome).includes(k) || k.includes(norm(o.nome))))); if (ja) { ja.rec = r.id; return; }
    const cad = r.freq === 'Anual' ? 'Anual' : r.freq === 'Semanal' ? 'Semanal' : 'Mensal', F = OS.Fin, d = F && F.recurDue ? F.recurDue(r, U.ym(hoje)) : '';
    out.push({ id: 'rec:' + r.id, rec: r.id, nome: r.name, valor: U.num(r.amount), cad, ult: '', prox: d && d >= hoje ? d : (d ? proxData(d, cad) : ''), n: 0, marca: MARCAS.test(r.name || ''), cat: r.cat || '', fonte: 'recorrentes' }); });
  return out.map(o => Object.assign(o, { mes: o.valor * MES[o.cad], ano: o.valor * MES[o.cad] * 12 })).sort((a, b) => b.ano - a.ano); };
const estado = id => (DEC()[id] || {}).e || '';
const view = () => { const L = detetar(), D = DEC(), ativas = L.filter(o => estado(o.id) !== 'cancelei'), porDecidir = ativas.filter(o => !estado(o.id)),
    cancel = Object.values(D).filter(d => d.e === 'cancelei'), poup = U.sum(cancel, d => d.ano || 0), mes = U.sum(ativas, o => o.mes);
  const card = o => { const e = estado(o.id), dd = o.prox ? U.diff(o.prox, U.today()) : null;
    return `<div class="as-c ${e ? 'e-' + e : ''}" data-id="${esc(o.id)}"><div class="as-h"><div><b>${esc(o.nome)}</b><small>${o.cad}${o.n ? ` · ${o.n} cobranças encontradas` : ' · das tuas recorrentes'}${o.cat ? ' · ' + esc(o.cat) : ''}</small></div><div class="as-v"><b>${U.eur(o.valor)}</b><small>${U.eur(o.ano, { dec: 0 })} por ano</small></div></div>
      ${o.prox ? `<p class="as-p">${dd === 0 ? 'Próxima cobrança: hoje' : dd === 1 ? 'Próxima cobrança: amanhã' : `Próxima cobrança: ${U.fmtD(o.prox)} (daqui a ${dd} dias)`}</p>` : ''}
      <div class="as-b" role="group" aria-label="O que fazer com ${esc(o.nome)}"><button class="btn xs ${e === 'uso' ? 'pri' : 'ghost'}" data-act="asDec" data-id="${esc(o.id)}" data-e="uso" aria-pressed="${e === 'uso'}">Uso</button><button class="btn xs ${e === 'cancelar' ? 'pri' : 'ghost'}" data-act="asDec" data-id="${esc(o.id)}" data-e="cancelar" aria-pressed="${e === 'cancelar'}">Quero cancelar</button><button class="btn xs ${e === 'cancelei' ? 'pri' : 'ghost'}" data-act="asDec" data-id="${esc(o.id)}" data-e="cancelei" aria-pressed="${e === 'cancelei'}">Já cancelei</button></div>
      ${e === 'cancelar' ? `<p class="as-n">${D[o.id] && D[o.id].task ? 'Tarefa criada para cancelares antes da renovação.' : 'Sem data de renovação: cancela quando puderes.'}</p>` : ''}</div>`; };
  return `<div class="as">${UI.sec('Caça às assinaturas', '', 'O que te cobra todos os meses ou todos os anos, encontrado nos teus movimentos e nas recorrentes. Decide uma a uma o que fica.')}
    <div class="kpis">${UI.kpi('Assinaturas ativas', ativas.length, porDecidir.length ? porDecidir.length + ' por decidir' : 'todas decididas', { tone: porDecidir.length ? 'warn' : 'pos' })}${UI.kpi('Custam por mês', U.eur(mes))}${UI.kpi('Custam por ano', U.eur(mes * 12, { dec: 0 }))}${UI.kpi('Poupas por ano', U.eur(poup, { dec: 0 }), cancel.length ? cancel.length + ' cancelada' + (cancel.length === 1 ? '' : 's') : 'ainda nenhuma cancelada', { tone: poup ? 'pos' : '' })}</div>
    ${L.length ? `<div class="as-g">${L.filter(o => estado(o.id) !== 'cancelei').map(card).join('')}</div>` : UI.empty('Ainda não encontrei assinaturas. Junta movimentos (ou liga o banco) ou regista as tuas em Recorrentes com o tipo «Assinatura».', `<a class="btn" href="#financas.banco">${UI.ic('bank')}Ligar o banco</a>`)}
    ${cancel.length ? `<div class="pn as-cn"><div class="pn-h"><h3>${UI.ic('check')}Já canceladas</h3></div><div class="list">${cancel.map(d => { const vol = L.find(o => o.id === d.id && o.ult && d.at && o.ult > d.at); return `<div class="li${vol ? ' as-vol' : ''}"><div class="li-t"><b>${esc(d.nome || '')}</b><small>${vol ? `Atenção: voltou a cobrar a ${U.fmtD(vol.ult)}. Confirma se o cancelamento ficou feito.` : `cancelada a ${d.at ? U.fmtD(d.at) : '—'}`}</small></div><div class="li-r"><span class="mono pos">+${U.eur(d.ano || 0, { dec: 0 })}/ano</span><button class="btn xs ghost" data-act="asDec" data-id="${esc(d.id)}" data-e="">Desfazer</button></div></div>`; }).join('')}</div></div>` : ''}
    <p class="mut as-dica">Dica: antes de cancelar, vê se dá para baixar de plano, partilhar com a família ou pausar. E confirma no extrato do mês seguinte que deixou de cobrar.</p></div>`; };
A.asDec = b => { const id = b.dataset.id, e = b.dataset.e, D = DEC(), o = detetar().find(x => x.id === id) || D[id] || { id };
  const ant = D[id] || {}; if (ant.task && e !== 'cancelar') { const t = OS.get('tasks', ant.task); if (t && t.status !== 'Feita') OS.del('tasks', t.id); }
  if (ant.e === 'cancelei' && ant.rec && e !== 'cancelei') OS.upd('recurring', ant.rec, { active: true, end: '' });
  if (!e || (ant.e === e && e !== 'cancelei')) { delete D[id]; OS.touch('assin'); OS.request(); return; }
  const novo = { id, e, nome: o.nome || ant.nome, ano: o.ano != null ? o.ano : ant.ano, at: U.today(), rec: o.rec || ant.rec || '' };
  if (e === 'cancelar') { const quando = o.prox ? U.addDays(o.prox, -2) : U.today(), t = OS.add('tasks', { title: `Cancelar a assinatura: ${o.nome}`, status: 'Próxima', prio: 'Alta', sched: quando < U.today() ? U.today() : quando, due: o.prox || '', area: 'Finanças', ctx: ['@Computador'], notes: `${U.eur(o.valor)} (${o.cad}) · ${U.eur(o.ano, { dec: 0 })} por ano. Cancela antes de ${o.prox ? U.fmtD(o.prox) : 'a próxima cobrança'} e marca «Já cancelei» na Caça às assinaturas.` }); novo.task = t.id;
    UI.toast(o.prox ? `Tarefa criada para ${U.fmtD(novo.task && OS.get('tasks', novo.task).sched)}, antes da renovação.` : 'Tarefa criada para hoje.', 'pos'); }
  if (e === 'cancelei') { if (o.rec) OS.upd('recurring', o.rec, { active: false, end: U.today(), review: 'Cancelar' }); UI.toast(`Boa: ${U.eur(novo.ano || 0, { dec: 0 })} a mais por ano no teu bolso.`, 'pos'); }
  D[id] = novo; OS.touch('assin'); OS.request(); };
OS.Assin = { detetar, view };
})();
