/* PRUMO — Lista de compras (Eu › Lista de compras, página #mercado; #compras é a "Pensar antes de comprar" das Finanças), em todas as contas (desde a 3.12).
   Ligada à Dieta: a lista do mês sai sozinha do que comeste nos últimos 30 dias (média por dia × dias do mês), com a foto de cada alimento,
   arrumada pelas secções do supermercado. Calcula as embalagens e o custo (o preço e a embalagem de cada coisa ficam guardados para os meses seguintes).
   Dá para juntar coisas à mão, editar tudo, pôr foto, marcar o que já tens em casa e o que já compraste, e ver a lista da semana. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, V = OS.views;
const n = v => U.num(v) || 0;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
OS.ONE_DEF.shop = { month: '', items: [], prices: {}, view: 'mes', at: 0, base: null };
const SEC = [['Talho e peixaria', 'Carne, frango, peixe'], ['Laticínios e ovos', 'Leite, iogurtes, queijo, ovos'], ['Frutas e legumes', ''], ['Mercearia', 'Arroz, massa, aveia, pão, leguminosas, azeite'], ['Suplementos', ''], ['Bebidas', ''], ['Pratos prontos e congelados', ''], ['Snacks e doces', ''], ['Casa e higiene', ''], ['Outros', '']];
const secOf = (name, cat) => { const s = norm(name);
  if (/whey|creatina|proteina em po|caseina|bcaa|multivitamin|omega ?3|pre.?treino/.test(s)) return 'Suplementos';
  if (/\bovos?\b|leite|iogurte|queijo|requeijao|kefir|manteiga|natas/.test(s) || cat === 'Lácteos') return 'Laticínios e ovos';
  if (cat === 'Carne' || cat === 'Peixe e marisco' || /frango|peru|carne|bife|atum|salmao|pescada|bacalhau|porco|vaca|camarao|sardinha/.test(s)) return 'Talho e peixaria';
  if (cat === 'Frutas' || cat === 'Legumes e verduras' || /banana|maca|laranja|alface|tomate|batata|cenoura|brocolos|cebola|alho|espinafre|morango|abacate/.test(s)) return 'Frutas e legumes';
  if (cat === 'Bebidas' || /sumo|suco|refrigerante|cha\b|cafe|cerveja|vinho|bebida/.test(s)) return 'Bebidas';
  if (cat === 'Pratos prontos' || /pizza|lasanha|congelad|hamburguer/.test(s)) return 'Pratos prontos e congelados';
  if (cat === 'Doces' || /chocolate|bolacha|biscoito|gelado|bolo|doce|barra/.test(s)) return 'Snacks e doces';
  if (/cereais|arroz|massa|aveia|pao|feijao|grao|lentilha|azeite|oleo|farinha|tapioca|quinoa|amendoim|manteiga de|mel\b|frutos secos|noz|amendoa/.test(s) || ['Cereais e pães', 'Leguminosas', 'Frutos secos e sementes', 'Gorduras e óleos'].includes(cat)) return 'Mercearia';
  return 'Outros'; };
const dbOf = name => { const s = norm(name), L = (OS.Diet && OS.Diet.DB) || []; return L.find(x => norm(x.name) === s) || L.find(x => s.startsWith(norm(x.name).split(/[ (,]/)[0]) && norm(x.name).split(' ')[0].length > 3) || null; };
const liquid = s => /leite|sumo|suco|bebida|azeite|oleo|kefir|iogurte liquido|refrigerante|cha\b|cafe\b/.test(norm(s));
const fmtQ = (q, u) => u === 'g' ? (q >= 1000 ? U.nf(q / 1000, q % 1000 ? 1 : 0) + ' kg' : U.nf(Math.round(q)) + ' g') : u === 'ml' ? (q >= 1000 ? U.nf(q / 1000, q % 1000 ? 1 : 0) + ' L' : U.nf(Math.round(q)) + ' ml') : U.nf(Math.ceil(q)) + (u === 'un' ? (Math.ceil(q) === 1 ? ' unidade' : ' unidades') : ' ' + (u || 'porções'));
const eur = v => U.eur(v);
const daysIn = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
const ym = () => U.today().slice(0, 7);
const st = () => OS.one('shop');
const save = (o) => OS.setOne('shop', Object.assign({ at: Date.now() }, o));
const priceOf = it => (st().prices || {})[norm(it.name)] || {};
// quantas embalagens e quanto custa (só se souber a embalagem e o preço)
const calc = (it, k = 1) => { const p = priceOf(it), pack = n(it.pack != null ? it.pack : p.pack), price = n(it.price != null ? it.price : p.price), stk = !it.have && !it.got && OS.Cozinha ? OS.Cozinha.stockOf(it.name, it.unit) : 0, q = Math.max(0, n(it.qty) * k - stk);
  if (it.have || (stk > 0 && q <= 0)) return { q, packs: 0, cost: 0, stk, home: stk > 0 };
  const packs = pack > 0 ? Math.max(1, Math.ceil(q / pack - 1e-9)) : null; return { q, packs, cost: price > 0 ? (packs != null ? packs * price : 0) : 0, known: price > 0 && packs != null, stk }; };

/* ---------- a lista automática: a média do que comeste ---------- */
const fromDiet = () => { const end = U.today(), start = U.addDays(end, -29), M = OS.all('meals').filter(m => m.date >= start && m.date <= end && m.food);
  const days = new Set(M.map(m => m.date)).size; if (!days) return { days: 0, list: [] };
  const agg = {}; M.forEach(m => { if (/^agua\b|^água\b/i.test(m.food.trim())) return; const k = norm(m.food), a = agg[k] || (agg[k] = { name: m.food.trim(), g: 0, por: 0, pic: m.pic || '' });
    if (n(m.g)) a.g += n(m.g); else a.por += n(m.qty) || 1; if (!a.pic && m.pic) a.pic = m.pic; });
  const mult = daysIn(ym()) / days, list = Object.values(agg).map(a => { const db = dbOf(a.name), eggs = /\bovos?\b/.test(norm(a.name));
    let qty, unit; if (a.g) { if (eggs) { qty = Math.ceil(a.g * mult / 55); unit = 'un'; } else { qty = Math.ceil(a.g * mult / 50) * 50; unit = liquid(a.name) ? 'ml' : 'g'; } } else { qty = Math.ceil(a.por * mult); unit = 'porções'; }
    return { id: 'a' + U.uid(), name: a.name, auto: 1, qty, unit, sec: secOf(a.name, db && db.cat), pic: a.pic, perDay: a.g ? a.g / days : a.por / days }; }).filter(x => x.qty > 0);
  return { days, list }; };
A.shopGen = () => { const s = st(), r = fromDiet(); if (!r.days) { UI.toast('Ainda não há refeições na Dieta nos últimos 30 dias. Regista o que comes e a lista faz-se sozinha.', 'warn'); return; }
  const old = s.items || [], keep = old.filter(x => !x.auto), by = {}; old.forEach(x => { by[norm(x.name)] = x; });
  // o que editaste à mão (quantidade, secção, foto, já tenho, comprado) mantém-se
  const items = r.list.map(x => { const o = by[norm(x.name)]; return o ? Object.assign(x, { qty: o.lock ? o.qty : x.qty, lock: o.lock, sec: o.sec || x.sec, photo: o.photo || '', have: !!o.have && s.month === ym(), got: !!o.got && s.month === ym(), note: o.note || '' }) : x; }).concat(keep.filter(x => !r.list.some(y => norm(y.name) === norm(x.name))));
  save({ month: ym(), items, base: { days: r.days, at: U.today() } }); UI.toast(`Lista de ${new Date().toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { month: 'long' })} feita: ${r.list.length} alimentos da tua dieta`, 'pos'); };

/* ---------- editar, juntar, foto ---------- */
const form = it => { const p = it ? priceOf(it) : {}, x = it || { unit: 'un', sec: 'Outros' };
  UI.modal(`<form class="sh-f" data-form="shopSave" data-id="${it ? it.id : ''}"><div class="row between" style="align-items:center"><h3 style="margin:0">${it ? 'Editar' : 'Juntar à lista'}</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <label>O quê<input class="field" name="name" required value="${esc(x.name || '')}" placeholder="Ex.: Detergente, Arroz agulha" ${it && it.auto ? 'readonly' : ''}></label>
    <div class="sh-2"><label>Quantidade no mês<input class="field" name="qty" type="number" step="any" min="0" value="${x.qty != null ? x.qty : ''}"></label><label>Unidade<select class="field" name="unit">${['g', 'ml', 'un', 'porções', 'pacotes'].map(u => `<option${(x.unit || 'un') === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label></div>
    <div class="sh-2"><label>Embalagem (na mesma unidade)<input class="field" name="pack" type="number" step="any" min="0" value="${x.pack != null ? x.pack : p.pack != null ? p.pack : ''}" placeholder="Ex.: 1000"></label><label>Preço da embalagem (€)<input class="field" name="price" type="number" step="0.01" min="0" value="${x.price != null ? x.price : p.price != null ? p.price : ''}"></label></div>
    <label>Secção<select class="field" name="sec">${SEC.map(([s]) => `<option${(x.sec || 'Outros') === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
    <label>Nota<input class="field" name="note" value="${esc(x.note || '')}" placeholder="Marca, loja, promoção…"></label>
    <label class="sh-ck"><input type="checkbox" name="have" ${x.have ? 'checked' : ''}> Já tenho em casa (não entra no custo)</label>
    ${it && it.auto ? `<p class="mut" style="margin:0;font-size:12px">Vem da tua Dieta (${U.nf(it.perDay || 0, 0)} ${it.unit === 'porções' ? 'porções' : it.unit === 'un' ? 'g' : it.unit} por dia em média). Se mudares a quantidade, fica a tua.</p>` : ''}
    <div class="row gap8"><button class="btn pri">Guardar</button>${it ? `<button type="button" class="btn ghost" data-act="shopPhoto" data-id="${it.id}">${it.photo ? 'Mudar a foto' : 'Pôr foto'}</button><button type="button" class="btn ghost danger" data-act="shopDel" data-id="${it.id}">Tirar</button>` : ''}</div></form>`, 'sh-modal'); };
OS.forms.shopSave = (f, v) => { const s = st(), items = (s.items || []).slice(), id = f.dataset.id, name = v('name').trim(); if (!name) return;
  const it = id ? items.find(x => x.id === id) : null, qty = v('qty') === '' ? null : n(v('qty')), pack = v('pack') === '' ? null : n(v('pack')), price = v('price') === '' ? null : n(v('price'));
  const o = it || { id: 'm' + U.uid(), name }; Object.assign(o, { name, unit: v('unit'), sec: v('sec'), note: v('note').trim(), have: !!f.elements.have.checked });
  if (qty != null) { if (o.auto && qty !== o.qty) o.lock = 1; o.qty = qty; }
  if (!it) items.push(o);
  const prices = Object.assign({}, s.prices || {}); if (pack != null || price != null) prices[norm(name)] = { pack, price }; delete o.pack; delete o.price;
  save({ items, prices, month: s.month || ym() }); UI.closeModal(); UI.toast(it ? 'Guardado' : `${name} na lista`, 'pos'); };
A.shopNew = () => form(null);
A.shopEdit = b => form((st().items || []).find(x => x.id === b.dataset.id));
A.shopDel = b => { const s = st(); save({ items: (s.items || []).filter(x => x.id !== b.dataset.id) }); UI.closeModal(); };
A.shopGot = b => { const s = st(), it = (s.items || []).find(x => x.id === b.dataset.id); if (!it) return; const o = Object.assign({}, it, { got: !it.got }), K = OS.Cozinha;
  if (K) { if (o.got) { const c = calc(it, s.view === 'semana' ? 7 / daysIn(ym()) : 1), pk = n(it.pack != null ? it.pack : priceOf(it).pack), q = c.packs && pk ? c.packs * pk : c.q, add = q > 0 ? K.stockAdd(it.name, q, it.unit, it.sec) : null; if (add) { o.pan = add; UI.toast(`${it.name} entrou na despensa`, 'pos'); } }
    else if (it.pan) { K.stockSub(it.name, it.pan, it.unit); delete o.pan; } }
  save({ items: (s.items || []).map(x => x.id === it.id ? o : x) }); };
// juntar à mão (as receitas mandam para aqui o que falta)
const addManual = name => { const s = st(), items = (s.items || []).slice(); if (items.some(x => norm(x.name) === norm(name) && !x.got)) return; items.push({ id: 'm' + U.uid(), name, qty: 1, unit: 'un', sec: secOf(name), note: 'para uma receita' }); save({ items, month: s.month || ym() }); };
A.shopView = b => save({ view: b.dataset.v });
A.shopClearGot = () => { const s = st(); save({ items: (s.items || []).map(x => Object.assign({}, x, { got: false })) }); };
A.shopPhoto = b => { const id = b.dataset.id, i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const S = 240, c = document.createElement('canvas'), k = Math.min(im.width, im.height); c.width = c.height = S; c.getContext('2d').drawImage(im, (im.width - k) / 2, (im.height - k) / 2, k, k, 0, 0, S, S);
    const s = st(); save({ items: (s.items || []).map(x => x.id === id ? Object.assign({}, x, { photo: c.toDataURL('image/jpeg', .8) }) : x) }); UI.closeModal(); UI.toast('Foto guardada', 'pos'); }; im.src = rd.result; }; rd.readAsDataURL(f); }; i.click(); };
A.shopCopy = async () => { const s = st(), k = s.view === 'semana' ? 7 / daysIn(ym()) : 1, by = {}; (s.items || []).filter(x => !x.have && !x.got).forEach(x => { (by[x.sec || 'Outros'] = by[x.sec || 'Outros'] || []).push(x); });
  const pan = OS.Cozinha ? OS.Cozinha.needs() : [];
  const t = `Lista de compras (${s.view === 'semana' ? 'semana' : 'mês'}):\n` + (pan.length ? 'Acabou em casa:\n' + pan.map(x => '- ' + x.name + ': ' + OS.Cozinha.buyOf(x) + ' ' + x.unit).join('\n') + '\n' : '') + SEC.filter(([sec]) => by[sec]).map(([sec]) => sec + ':\n' + by[sec].filter(x => calc(x, k).q > 0).map(x => { const c = calc(x, k); return '- ' + x.name + ': ' + fmtQ(c.q, x.unit) + (c.packs ? ` (${c.packs} emb.)` : ''); }).join('\n')).join('\n');
  try { await navigator.clipboard.writeText(t); UI.toast('Lista copiada', 'pos'); } catch (e) { UI.toast('Não consegui copiar', 'warn'); } };

/* ---------- vista ---------- */
const pic = it => it.photo ? `<img class="sh-pic" src="${it.photo}" alt="">` : OS.Diet && OS.Diet.img ? `<span class="sh-pic">${OS.Diet.img(it.name, '', 'sm', it.pic)}</span>` : `<span class="sh-pic sh-pic0">${esc((it.name || '?').charAt(0))}</span>`;
const listView = embed => {
  const s = st(), items = s.items || [], wk = s.view === 'semana', k = wk ? 7 / daysIn(ym()) : 1, old = s.month && s.month !== ym();
  const C = items.map(x => ({ x, c: calc(x, k) })), tot = C.reduce((a, o) => a + o.c.cost, 0), known = C.filter(o => o.c.known).length, need = C.filter(o => !o.x.have), got = need.filter(o => o.x.got).length;
  const secs = SEC.map(([sec, h]) => ({ sec, h, L: C.filter(o => (o.x.sec || 'Outros') === sec) })).filter(g => g.L.length), maxSec = Math.max(1, ...secs.map(g => g.L.reduce((a, o) => a + o.c.cost, 0)));
  const gbtn = `<button class="btn pri" data-act="shopGen">${UI.ic('sync')}<span>${items.some(x => x.auto) ? 'Atualizar com a dieta' : 'Fazer a lista do mês'}</span></button>`;
  const head = embed ? `<div class="sh-top"><p class="mut">Ligada à tua Dieta e à despensa: a lista do mês sai do que comes, menos o que já tens em casa, com as embalagens e o custo.</p>${gbtn}</div>` : UI.head('Lista de compras', 'Ligada à tua Dieta: a lista do mês sai do que comes, com as quantidades, as embalagens e o custo. Juntas o resto à mão.', gbtn, 'Eu');
  if (!items.length) return head + UI.empty('A lista ainda está vazia. Toca em "Fazer a lista do mês": junto o que comeste nos últimos 30 dias na Dieta e calculo quanto precisas para o mês.', `<button class="btn pri" data-act="shopGen">Fazer a lista do mês</button> <button class="btn" data-act="shopNew">${UI.ic('plus')}Juntar à mão</button>`);
  return head + `${old ? `<div class="pn sh-old"><b>A lista é de ${esc(s.month)}.</b> <span class="mut">Atualiza para este mês (o que mudaste à mão fica).</span> <button class="btn sm" data-act="shopGen">Atualizar</button></div>` : ''}
  <div class="kpis">${UI.kpi(wk ? 'Custo da semana' : 'Custo do mês', eur(tot), known < C.length ? `${known} de ${C.length} com preço` : 'tudo com preço')}${UI.kpi('Itens', need.length, items.length - need.length ? `${items.length - need.length} já em casa` : '')}${UI.kpi('Comprados', `${got}/${need.length}`)}${UI.kpi(wk ? 'Por mês' : 'Por semana', eur(wk ? tot / k : tot * 7 / daysIn(ym())))}</div>
  <div class="row gap8 sh-bar"><div class="seg" role="group" aria-label="Período">${[['mes', 'Mês'], ['semana', 'Semana']].map(([v, l]) => `<button class="${(s.view || 'mes') === v ? 'on' : ''}" aria-pressed="${(s.view || 'mes') === v}" data-act="shopView" data-v="${v}">${l}</button>`).join('')}</div>
    <button class="btn sm" data-act="shopNew">${UI.ic('plus')}Juntar</button><button class="btn sm ghost" data-act="shopCopy">Copiar a lista</button>${got ? `<button class="btn sm ghost" data-act="shopClearGot">Desmarcar comprados</button>` : ''}</div>
  ${s.base ? `<p class="mut sh-src">Da Dieta: ${s.base.days} ${s.base.days === 1 ? 'dia registado' : 'dias registados'} nos últimos 30 (média por dia × ${daysIn(ym())} dias). Toca num item para mudar a quantidade, a embalagem ou o preço: o preço fica guardado para os meses seguintes.</p>` : ''}
  ${secs.map(g => { const sc = g.L.reduce((a, o) => a + o.c.cost, 0); return `<section class="pn sh-sec"><div class="pn-h"><h3>${esc(g.sec)}</h3><span class="mut">${g.L.length}${sc ? ' · ' + eur(sc) : ''}</span></div>
    ${g.L.map(({ x, c }) => `<div class="sh-it${x.got ? ' got' : ''}${x.have ? ' have' : ''}"><button class="sh-ck2" data-act="shopGot" data-id="${x.id}" role="checkbox" aria-checked="${!!x.got}" aria-label="${x.got ? 'Desmarcar' : 'Marcar'} ${esc(x.name)} como comprado" ${x.have ? 'disabled' : ''}>${x.got ? UI.ic('check') : ''}</button>
      ${pic(x)}<button class="sh-tx" data-act="shopEdit" data-id="${x.id}"><b>${esc(x.name)}</b><small>${x.have ? 'já tenho em casa' : c.home ? `tens ${esc(fmtQ(c.stk, x.unit))} em casa: chega` : esc(fmtQ(c.q, x.unit)) + (c.packs ? ` · ${c.packs} ${c.packs === 1 ? 'embalagem' : 'embalagens'}` : '') + (c.stk > 0 ? ` (já descontei ${esc(fmtQ(c.stk, x.unit))} que tens em casa)` : '')}${x.note ? ' · ' + esc(x.note) : ''}${x.auto ? ' · da dieta' : ''}</small></button>
      <span class="sh-pr mono">${c.known ? eur(c.cost) : x.have ? '' : '<span class="mut">sem preço</span>'}</span></div>`).join('')}</section>`; }).join('')}
  ${tot ? `<section class="pn"><div class="pn-h"><h3>Para onde vai o dinheiro</h3><span class="mut">${eur(tot)}</span></div>${secs.map(g => { const v = g.L.reduce((a, o) => a + o.c.cost, 0); return v ? `<div class="sh-cb"><span>${esc(g.sec)}</span>${UI.bar(v / maxSec)}<b class="mono">${eur(v)}</b></div>` : ''; }).join('')}</section>` : ''}`; };
V.mercado = () => V.cozinha ? V.cozinha('lista') : listView();
OS.Compras = { fromDiet, calc, secOf, view: listView, addManual };
})();
