/* PRUMO — Relatório financeiro mensal (v4.04), em Administração › Vendas.
   Mostra no ecrã as demonstrações do mês (resultados, fluxos de caixa, balanço e indicadores), com os valores do Stripe,
   as despesas que registas e os números das assinaturas. Depois de reveres, assinas no quadro com o dedo ou o rato; a assinatura
   fica guardada com o mês e entra no PDF. Descarrega em PDF e em Excel. Se os valores mudarem depois de assinado, o Prumo avisa. */
(() => {
'use strict';
const U = OS.U, A = OS.act, esc = U.esc;
if (OS.UI && OS.UI.IP && !OS.UI.IP.download) OS.UI.IP.download = 'M12 4v11m0 0l-4-4m4 4l4-4M5 19h14';
const CATN = { servidores: 'Alojamento e servidores', ia: 'Inteligência artificial', email: 'E-mail e comunicações', software: 'Software e subscrições', marketing: 'Marketing e publicidade', contabilidade: 'Contabilidade e jurídico', lojas: 'Lojas de apps', pessoal: 'Pessoal', outros: 'Outros' };
const RF = { ym: '', d: null, cfg: null, busy: false, err: '', tinta: false, novoCusto: false };
const ymHoje = () => U.today().slice(0, 7), ymAnt = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); };
const mesNome = ym => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
const tok = () => OS.Acc && OS.Acc.token ? OS.Acc.token() : '';
const api = async (op, body = {}) => { const r = await fetch('api/relfin', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok() }, body: JSON.stringify(Object.assign({ op }, body)) }); let j = null; try { j = await r.json(); } catch (e) { }
  if (j && j.ok) return j; throw new Error((j && j.msg) || 'O servidor não respondeu (' + r.status + ').'); };
const din = (c, cur = 'EUR') => { const v = (Number(c) || 0) / 100, s = Math.abs(v).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return (v < 0 ? '−' : '') + s + ' ' + (cur === 'EUR' ? '€' : cur === 'BRL' ? 'R$' : cur); };
const paraEur = (v, cur) => { if (!cur || cur === 'EUR') return v; const p = OS.InvX && OS.InvX.perEur ? OS.InvX.perEur(cur) : 0; return p ? Math.round(v / p) : null; };
const somaEur = o => { let t = 0, falta = []; Object.entries(o || {}).forEach(([c, v]) => { const e = paraEur(v, c); if (e == null) falta.push(c); else t += e; }); return { t, falta }; };
// as contas do mês a partir do que o servidor manda
const contas = d => { const s = d.stripe || {}, cur = s.moeda || 'EUR', cat = {}; (d.custos || []).forEach(x => { cat[x.cat] = (cat[x.cat] || 0) + x.v; });
  const vendas = s.bruto || 0, reemb = s.reembolsos || 0, liq = vendas - reemb, taxas = s.taxas || 0, custos = (d.custos || []).reduce((t, x) => t + x.v, 0), ebitda = liq - taxas - custos, tx = (+d.imposto || 0) / 100, imp = ebitda > 0 ? Math.round(ebitda * tx) : 0;
  const a = d.acum || {}, aLiq = (a.bruto || 0) - (a.reembolsos || 0), aEb = aLiq - (a.taxas || 0) - (a.custos || 0), aImp = aEb > 0 ? Math.round(aEb * tx) : 0;
  const mesCorrente = d.ym === ymHoje(), saldoStripe = s.saldo && mesCorrente ? (s.saldo.disp || 0) + (s.saldo.pend || 0) : null, banco = d.banco, dif = somaEur(d.contas.diferida), mrr = somaEur(d.contas.mrr);
  const ativo = (saldoStripe || 0) + (banco || 0), passivo = dif.t + imp, pagosSite = (d.contas.pagos || 0) - (d.contas.loja || 0);
  return { cur, vendas, reemb, liq, taxas, cat, custos, ebitda, imp, rl: ebitda - imp, tx: d.imposto || 0, a: { vendas: a.bruto || 0, reemb: a.reembolsos || 0, liq: aLiq, taxas: a.taxas || 0, custos: a.custos || 0, ebitda: aEb, imp: aImp, rl: aEb - aImp },
    fco: liq - taxas - custos, payouts: s.payouts || 0, bancoIni: d.bancoAnt, bancoFim: banco, saldoStripe, mesCorrente, ativo, dif, passivo, capital: ativo - passivo, mrr, arr: mrr.t * 12, arpu: pagosSite > 0 ? Math.round(mrr.t / pagosSite) : 0, k: d.contas }; };
// a impressão digital dos valores (para saber se mudaram depois de assinado)
const impressao = async (d, c) => { const t = JSON.stringify([d.ym, c.vendas, c.reemb, c.taxas, (d.custos || []).map(x => [x.nome, x.cat, x.v]), d.banco, d.imposto, d.contas.mrr, d.contas.diferida, d.contas.pagos]);
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };
const carregar = async ym => { RF.busy = true; RF.err = ''; OS.request(); try { const [e, m] = await Promise.all([RF.cfg ? null : api('estado'), api('mes', { ym })]); if (e) RF.cfg = e.cfg; RF.d = m; RF.ym = ym; RF.d._c = contas(m); RF.d._h = await impressao(m, RF.d._c); } catch (er) { RF.err = er.message; } RF.busy = false; OS.request(); };
/* ---------- no ecrã ---------- */
const L = (t, v, va, o = {}) => `<tr class="${o.b ? 'rf-b' : ''}${o.sub ? ' rf-sub' : ''}"><td>${esc(t)}</td><td class="mono">${v == null ? '—' : din(v)}</td>${va !== undefined ? `<td class="mono">${va == null ? '—' : din(va)}</td>` : ''}</tr>`;
const tabelas = (d, c) => `<div class="rf-g">
  <section><h4>Demonstração de resultados</h4><table class="rf-t"><thead><tr><th></th><th>${esc(mesNome(d.ym))}</th><th>Acumulado ${d.ym.slice(0, 4)}</th></tr></thead><tbody>
    ${L('Vendas e serviços prestados', c.vendas, c.a.vendas)}${L('Reembolsos', -c.reemb, -c.a.reemb, { sub: 1 })}${L('Rendimentos líquidos', c.liq, c.a.liq, { b: 1 })}
    ${L('Comissões de pagamento (Stripe)', -c.taxas, -c.a.taxas, { sub: 1 })}${Object.entries(c.cat).map(([k, v]) => L(CATN[k] || k, -v, undefined, { sub: 1 }).replace('</tr>', '<td class="mono mut">no total</td></tr>')).join('')}
    ${L('Fornecimentos e serviços externos', -c.custos, -c.a.custos, { sub: 1 })}${L('Resultado operacional (EBITDA)', c.ebitda, c.a.ebitda, { b: 1 })}${L('Depreciações e amortizações', 0, 0, { sub: 1 })}
    ${L('Imposto estimado (' + c.tx + '%)', -c.imp, -c.a.imp, { sub: 1 })}${L('Resultado líquido do período', c.rl, c.a.rl, { b: 1 })}</tbody></table></section>
  <section><h4>Fluxos de caixa (mês)</h4><table class="rf-t"><tbody>${L('Recebimentos de clientes', c.vendas)}${L('Reembolsos pagos', -c.reemb, undefined, { sub: 1 })}${L('Comissões pagas', -c.taxas, undefined, { sub: 1 })}${L('Pagamentos a fornecedores', -c.custos, undefined, { sub: 1 })}
    ${L('Fluxo das atividades operacionais', c.fco, undefined, { b: 1 })}${L('Transferências do Stripe para o banco', c.payouts)}${L('Banco no início do mês', c.bancoIni)}${L('Banco no fim do mês', c.bancoFim)}</tbody></table></section>
  <section><h4>Balanço (fim do mês)</h4><table class="rf-t"><tbody>${L('Saldo no Stripe' + (c.mesCorrente ? '' : ' (só no mês corrente)'), c.saldoStripe)}${L('Depósitos bancários', c.bancoFim)}${L('Total do ativo', c.ativo, undefined, { b: 1 })}
    ${L('Receita diferida (planos anuais)', c.dif.t)}${L('Imposto estimado a pagar', c.imp)}${L('Total do passivo', c.passivo, undefined, { b: 1 })}${L('Capital próprio', c.capital, undefined, { b: 1 })}</tbody></table></section>
  <section><h4>Indicadores</h4><table class="rf-t"><tbody>${L('MRR (receita recorrente por mês)', c.mrr.t)}${L('ARR (por ano)', c.arr)}${L('Receita média por assinante (site)', c.arpu)}
    <tr><td>Assinantes a pagar</td><td class="mono">${c.k.pagos}${c.k.loja ? ' (' + c.k.loja + ' nas lojas)' : ''}</td></tr><tr><td>No teste grátis</td><td class="mono">${c.k.testes}</td></tr><tr><td>Contas novas no mês</td><td class="mono">${c.k.novos}</td></tr><tr><td>Vão cancelar</td><td class="mono">${c.k.cancelar}</td></tr>
    ${Object.entries(c.k.porPlano || {}).map(([n, v]) => `<tr class="rf-sub"><td>Plano ${esc(n)}</td><td class="mono">${v}</td></tr>`).join('')}</tbody></table></section></div>`;
const assinaturaHTML = (d) => { const a = d.assinatura, ok = a && a.h === d._h;
  if (a && ok) return `<div class="rf-ass ok"><img src="${esc(a.sig)}" alt="Assinatura de ${esc(a.nome)}"><p><b>Assinado por ${esc(a.nome)}</b>${a.cargo ? ' · ' + esc(a.cargo) : ''}<br><small class="mut">${new Date(a.at).toLocaleString('pt-PT')}</small></p><button class="btn xs ghost" data-act="rfDesassinar">Tirar a assinatura</button></div>`;
  const info = (OS.Legal && OS.Legal.info) || {};
  return `<div class="rf-ass">${a && !ok ? `<p class="warn" style="margin:0 0 8px">Os valores mudaram desde que assinaste (${new Date(a.at).toLocaleDateString('pt-PT')}). Revê e assina outra vez.</p>` : ''}
    <label class="rf-ck"><input type="checkbox" id="rfRevi"><span>Revi os valores deste relatório e estão corretos.</span></label>
    <div class="rf-campos"><label>Nome<input class="field" id="rfNome" value="${esc(info.responsavel || '')}" maxlength="80"></label><label>Cargo<input class="field" id="rfCargo" value="Responsável" maxlength="60"></label></div>
    <p class="mut" style="margin:6px 0 4px;font-size:.85rem">Assina aqui com o dedo ou o rato:</p><canvas id="rfSig" class="rf-sig" width="900" height="260" aria-label="Quadro para assinar"></canvas>
    <div class="row gap8" style="margin-top:8px"><button class="btn xs ghost" data-act="rfLimpar">Limpar</button><button class="btn pri" data-act="rfAssinar">Assinar o relatório de ${esc(mesNome(d.ym))}</button></div></div>`; };
const custosHTML = () => { const cfg = RF.cfg || { custos: [], banco: {}, imposto: 0 }, ym = RF.ym || ymAnt(ymHoje());
  return `<details class="rf-cus"${RF.novoCusto ? ' open' : ''}><summary>As despesas do Prumo, o banco e o imposto</summary>
    <p class="mut" style="font-size:.85rem;margin:6px 0">As comissões do Stripe entram sozinhas. Aqui registas o resto (servidores, IA, e-mail, marketing, contabilidade…). As mensais contam todos os meses desde o mês indicado.</p>
    <div class="list">${cfg.custos.map(x => `<div class="li"><div class="li-t"><b>${esc(x.nome)}</b><small>${esc(CATN[x.cat] || x.cat)} · ${x.tipo === 'unico' ? 'só em ' + esc(x.ym || '') : 'todos os meses' + (x.desde ? ' desde ' + esc(x.desde) : '') + (x.ate ? ' até ' + esc(x.ate) : '')}</small></div><div class="li-r"><span class="mono">${din(x.v)}</span><button class="btn xs ghost" data-act="rfCustoDel" data-id="${esc(x.id)}" aria-label="Apagar ${esc(x.nome)}">Apagar</button></div></div>`).join('') || '<p class="mut" style="margin:6px 0">Ainda sem despesas registadas.</p>'}</div>
    <div class="rf-nc"><input class="field" id="rfCN" placeholder="Ex.: Vercel Pro" maxlength="60" aria-label="Nome da despesa"><select class="field" id="rfCC" aria-label="Categoria">${Object.entries(CATN).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <input class="field" id="rfCV" type="number" step="0.01" min="0" placeholder="Valor (€)" aria-label="Valor em euros"><select class="field" id="rfCT" aria-label="Frequência"><option value="mensal">Todos os meses</option><option value="unico">Só neste mês</option></select><button class="btn sm" data-act="rfCustoAdd">Juntar</button></div>
    <div class="rf-nc"><label>Saldo no banco no fim de ${esc(mesNome(ym))} (€)<input class="field" id="rfBanco" type="number" step="0.01" value="${cfg.banco[ym] == null ? '' : (cfg.banco[ym] / 100).toFixed(2)}"></label><label>Imposto estimado sobre o resultado (%)<input class="field" id="rfImp" type="number" step="0.5" min="0" max="60" value="${cfg.imposto || 0}"></label><button class="btn sm" data-act="rfGuardar">Guardar</button></div></details>`; };
const meses = () => { const out = []; let m = ymHoje(); for (let i = 0; i < 18; i++) { out.push(m); m = ymAnt(m); } return out; };
const painel = () => { const d = RF.d, c = d && d._c;
  return `<div class="pn rf-pn"><div class="pn-h"><h3>${OS.UI.ic('note')}Relatório financeiro mensal</h3>${d ? `<span class="bdg ${d.assinatura && d.assinatura.h === d._h ? 'pos' : 'warn'}">${d.assinatura && d.assinatura.h === d._h ? 'Assinado' : 'Por assinar'}</span>` : ''}</div>
    <p class="mut" style="margin:0 0 10px">As demonstrações financeiras do Prumo para cada mês: resultados, fluxos de caixa, balanço e indicadores. Revê no ecrã, assina e descarrega em PDF ou Excel.</p>
    <div class="row gap8" style="flex-wrap:wrap;align-items:center"><select class="field" id="rfMes" style="width:auto" aria-label="Mês">${meses().map(m => `<option value="${m}" ${m === (RF.ym || ymAnt(ymHoje())) ? 'selected' : ''}>${esc(mesNome(m))}</option>`).join('')}</select><button class="btn pri" data-act="rfGerar" ${RF.busy ? 'disabled' : ''}>${RF.busy ? 'A gerar…' : d ? 'Gerar de novo' : 'Gerar o relatório'}</button></div>
    ${RF.err ? `<p class="neg" style="margin:10px 0 0">${esc(RF.err)}</p>` : ''}
    ${d ? `${!d.stripe.ligado ? '<p class="warn" style="margin:10px 0 0">O Stripe não está ligado: os recebimentos ficam a zero.</p>' : d.stripe.modo === 'test' ? '<p class="warn" style="margin:10px 0 0">O Stripe está em modo de teste: os valores são de pagamentos a fingir.</p>' : ''}${d.stripeErro ? `<p class="neg" style="margin:6px 0 0">Stripe: ${esc(d.stripeErro)}</p>` : ''}
      ${c.dif.falta.length || c.mrr.falta.length ? '<p class="mut" style="margin:6px 0 0;font-size:.85rem">Sem câmbio para ' + esc([...new Set(c.dif.falta.concat(c.mrr.falta))].join(', ')) + ': esses valores ficam de fora do total em euros (abre os Investimentos para atualizar o câmbio).</p>' : ''}
      ${tabelas(d, c)}<h4 style="margin:16px 0 6px">Revisão e assinatura</h4>${assinaturaHTML(d)}
      <div class="row gap8" style="margin-top:14px;flex-wrap:wrap"><button class="btn" data-act="rfPDF">${OS.UI.ic('download')}Descarregar PDF</button><button class="btn" data-act="rfXLSX">${OS.UI.ic('download')}Descarregar Excel</button></div>
      <p class="mut" style="font-size:.8rem;margin:10px 0 0">Relatório de gestão, em base de caixa e não auditado. Para efeitos oficiais (contas anuais, financiamento ou entrada em bolsa) as demonstrações têm de seguir o SNC ou as IFRS e ser certificadas por um revisor oficial de contas.</p>` : ''}
    ${custosHTML()}</div>`; };
/* ---------- quadro da assinatura ---------- */
const ligarQuadro = () => { const cv = document.getElementById('rfSig'); if (!cv || cv._ok) return; cv._ok = 1; RF.tinta = false; const g = cv.getContext('2d'); g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#14213d';
  let des = false; const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', e => { des = true; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (!des) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); RF.tinta = true; e.preventDefault(); });
  const fim = () => { des = false; }; cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim); cv.style.touchAction = 'none'; };
new MutationObserver(() => ligarQuadro()).observe(document.documentElement, { childList: true, subtree: true });
/* ---------- ações ---------- */
A.rfGerar = () => { const s = document.getElementById('rfMes'); carregar(s ? s.value : ymAnt(ymHoje())); };
A.rfLimpar = () => { const cv = document.getElementById('rfSig'); if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); RF.tinta = false; };
A.rfAssinar = async b => { const d = RF.d; if (!d) return; if (!document.getElementById('rfRevi').checked) return OS.UI.toast('Confirma primeiro que reviste os valores.', 'warn'); if (!RF.tinta) return OS.UI.toast('Assina no quadro com o dedo ou o rato.', 'warn');
  const cv = document.getElementById('rfSig'), sig = cv.toDataURL('image/png'); b.disabled = true;
  try { const j = await api('assinar', { ym: d.ym, sig, h: d._h, nome: document.getElementById('rfNome').value, cargo: document.getElementById('rfCargo').value, revisto: true }); d.assinatura = j.assinatura; OS.UI.toast('Relatório assinado.', 'pos'); } catch (e) { OS.UI.toast(e.message, 'neg'); b.disabled = false; } OS.request(); };
A.rfDesassinar = async () => { if (!RF.d || !confirm('Tirar a assinatura deste relatório?')) return; try { await api('desassinar', { ym: RF.d.ym }); RF.d.assinatura = null; } catch (e) { OS.UI.toast(e.message, 'neg'); } OS.request(); };
const guardarCfg = async (cfg, msg) => { try { const j = await api('guardar', cfg); RF.cfg = j.cfg; if (msg) OS.UI.toast(msg, 'pos'); if (RF.d) carregar(RF.d.ym); else OS.request(); } catch (e) { OS.UI.toast(e.message, 'neg'); } };
A.rfCustoAdd = () => { const nome = document.getElementById('rfCN').value.trim(), v = Math.round(parseFloat(String(document.getElementById('rfCV').value).replace(',', '.')) * 100), tipo = document.getElementById('rfCT').value, ym = RF.ym || ymAnt(ymHoje());
  if (!nome || !(v > 0)) return OS.UI.toast('Escreve o nome e o valor da despesa.', 'warn'); const cfg = RF.cfg || { custos: [], banco: {}, imposto: 0 }; RF.novoCusto = true;
  guardarCfg({ custos: cfg.custos.concat({ nome, cat: document.getElementById('rfCC').value, v, tipo, ym: tipo === 'unico' ? ym : undefined, desde: tipo === 'mensal' ? ym : undefined }), banco: cfg.banco, imposto: cfg.imposto }, 'Despesa guardada.'); };
A.rfCustoDel = b => { const cfg = RF.cfg; if (!cfg || !confirm('Apagar esta despesa de todos os meses?')) return; RF.novoCusto = true; guardarCfg({ custos: cfg.custos.filter(x => x.id !== b.dataset.id), banco: cfg.banco, imposto: cfg.imposto }, 'Despesa apagada.'); };
A.rfGuardar = () => { const cfg = RF.cfg || { custos: [], banco: {}, imposto: 0 }, ym = RF.ym || ymAnt(ymHoje()), bv = String(document.getElementById('rfBanco').value).trim(), banco = Object.assign({}, cfg.banco); RF.novoCusto = true;
  if (bv === '') delete banco[ym]; else banco[ym] = Math.round(parseFloat(bv.replace(',', '.')) * 100); guardarCfg({ custos: cfg.custos, banco, imposto: +document.getElementById('rfImp').value || 0 }, 'Guardado.'); };
/* ---------- ficheiros: PDF (jsPDF) e Excel (SheetJS), carregados só quando se pedem ---------- */
const script = (url, g) => window[g] ? Promise.resolve(window[g]) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = () => window[g] ? res(window[g]) : rej(new Error('Não deu para preparar o ficheiro.')); s.onerror = () => rej(new Error('Não deu para preparar o ficheiro (sem ligação?).')); document.head.appendChild(s); });
const baixar = (blob, nome) => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000); };
const nomeF = (d, ext) => `Prumo - Demonstracoes financeiras - ${d.ym}.${ext}`;
const linhasDR = c => [['Vendas e serviços prestados', c.vendas, c.a.vendas], ['  Reembolsos', -c.reemb, -c.a.reemb], ['Rendimentos líquidos', c.liq, c.a.liq, 1], ['  Comissões de pagamento (Stripe)', -c.taxas, -c.a.taxas]]
  .concat(Object.entries(c.cat).map(([k, v]) => ['    ' + (CATN[k] || k), -v, null])).concat([['  Fornecimentos e serviços externos', -c.custos, -c.a.custos], ['Resultado operacional (EBITDA)', c.ebitda, c.a.ebitda, 1], ['  Depreciações e amortizações', 0, 0], ['  Imposto estimado (' + c.tx + '%)', -c.imp, -c.a.imp], ['Resultado líquido do período', c.rl, c.a.rl, 1]]);
const linhasFC = c => [['Recebimentos de clientes', c.vendas], ['  Reembolsos pagos', -c.reemb], ['  Comissões pagas', -c.taxas], ['  Pagamentos a fornecedores', -c.custos], ['Fluxo das atividades operacionais', c.fco, null, 1], ['Transferências do Stripe para o banco', c.payouts], ['Banco no início do mês', c.bancoIni], ['Banco no fim do mês', c.bancoFim]];
const linhasBL = c => [['Saldo no Stripe' + (c.mesCorrente ? '' : ' (só no mês corrente)'), c.saldoStripe], ['Depósitos bancários', c.bancoFim], ['Total do ativo', c.ativo, null, 1], ['Receita diferida (planos anuais)', c.dif.t], ['Imposto estimado a pagar', c.imp], ['Total do passivo', c.passivo, null, 1], ['Capital próprio', c.capital, null, 1]];
const linhasKP = c => [['MRR (receita recorrente por mês)', c.mrr.t], ['ARR (por ano)', c.arr], ['Receita média por assinante (site)', c.arpu], ['Assinantes a pagar', c.k.pagos, 'n'], ['  dos quais nas lojas', c.k.loja, 'n'], ['No teste grátis', c.k.testes, 'n'], ['Contas novas no mês', c.k.novos, 'n'], ['Vão cancelar', c.k.cancelar, 'n']].concat(Object.entries(c.k.porPlano || {}).map(([n, v]) => ['  Plano ' + n, v, 'n']));
const pdf = async d => { const J = (await script('vendor/jspdf.umd.min.js', 'jspdf')).jsPDF, c = d._c, doc = new J({ unit: 'mm', format: 'a4' }), info = (OS.Legal && OS.Legal.info) || {}, ass = d.assinatura && d.assinatura.h === d._h ? d.assinatura : null;
  const W = 210, X0 = 18, XM = 150, XA = 192; let y = 20;
  const nova = () => { doc.addPage(); y = 20; }, falta = h => { if (y + h > 280) nova(); };
  const din2 = v => v == null ? '—' : din(v).replace('−', '-');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Prumo', X0, y); doc.setFontSize(12); doc.text('Demonstrações financeiras · ' + mesNome(d.ym), X0, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); y += 14;
  [info.responsavel ? 'Entidade: ' + info.responsavel + (info.nif ? ' · NIF ' + info.nif : '') : '', info.morada ? 'Morada: ' + info.morada : '', 'Moeda: euro (€) · Gerado em ' + new Date(d.gerado).toLocaleString('pt-PT') + ' · Base de caixa · Não auditado'].filter(Boolean).forEach(t => { doc.text(t, X0, y); y += 4.5; });
  if (!ass) { doc.setTextColor(180, 40, 40); doc.setFont('helvetica', 'bold'); doc.text('RASCUNHO · POR ASSINAR', W - X0, 20, { align: 'right' }); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); }
  const secao = (t, L, cols) => { falta(14 + L.length * 5.6); y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(t, X0, y); if (cols) { doc.setFontSize(8.5); doc.text(cols[0], XM, y, { align: 'right' }); if (cols[1]) doc.text(cols[1], XA, y, { align: 'right' }); }
    y += 2; doc.setDrawColor(36, 82, 122); doc.setLineWidth(0.4); doc.line(X0, y, W - X0, y); y += 4.6; doc.setFontSize(9.5);
    L.forEach(r => { const b = r[3] === 1; doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.text(String(r[0]).replace(/^ +/, m => ' '.repeat(m.length * 2)), X0, y); doc.text(r[2] === 'n' ? String(r[1] || 0) : din2(r[1]), XM, y, { align: 'right' }); if (r[2] !== undefined && r[2] !== 'n') doc.text(din2(r[2]), XA, y, { align: 'right' });
      if (b) { doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(X0, y + 1.6, W - X0, y + 1.6); } y += 5.6; }); };
  secao('1. Demonstração de resultados', linhasDR(c), [mesNome(d.ym), 'Acumulado ' + d.ym.slice(0, 4)]);
  secao('2. Demonstração dos fluxos de caixa (mês)', linhasFC(c), [mesNome(d.ym)]);
  secao('3. Balanço (no fim do mês)', linhasBL(c), [mesNome(d.ym)]);
  secao('4. Indicadores', linhasKP(c), [mesNome(d.ym)]);
  falta(46); y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('5. Notas', X0, y); y += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  ['Os rendimentos estão em base de caixa: assinaturas recebidas no Stripe no mês, na moeda da conta Stripe, com as comissões à parte.', 'As receitas das assinaturas compradas nas lojas (App Store e Google Play) não estão incluídas: são pagas pelas lojas.', 'As despesas foram registadas pela administração. A receita diferida estima a parte dos planos anuais ainda por prestar.', 'Relatório de gestão não auditado. Para efeitos oficiais (contas anuais, financiamento ou entrada em bolsa), as demonstrações têm de seguir o SNC ou as IFRS e ser certificadas por um revisor oficial de contas.']
    .forEach(t => { doc.splitTextToSize(t, W - 2 * X0).forEach(l => { falta(5); doc.text(l, X0, y); y += 4.2; }); y += 1; });
  falta(48); y += 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Revisto e aprovado por', X0, y); y += 4;
  if (ass) { try { doc.addImage(ass.sig, 'PNG', X0, y, 70, 20); } catch (e) { } y += 22; doc.setDrawColor(120); doc.line(X0, y, X0 + 80, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(ass.nome + (ass.cargo ? ' · ' + ass.cargo : ''), X0, y); y += 4.5; doc.setFontSize(8.5); doc.text('Assinado em ' + new Date(ass.at).toLocaleString('pt-PT') + ' · impressão dos valores ' + ass.h.slice(0, 16), X0, y); }
  else { y += 18; doc.setDrawColor(120); doc.line(X0, y, X0 + 80, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Por assinar (assina no Prumo, em Administração › Vendas)', X0, y); }
  // anexos: os movimentos do Stripe e as despesas
  const mov = (d.stripe.mov || []); if (mov.length || (d.custos || []).length) { nova(); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Anexo · Movimentos do Stripe e despesas de ' + mesNome(d.ym), X0, y); y += 7; doc.setFontSize(8);
    doc.text('Data', X0, y); doc.text('Tipo', X0 + 24, y); doc.text('Descrição', X0 + 48, y); doc.text('Bruto', 150, y, { align: 'right' }); doc.text('Comissão', 171, y, { align: 'right' }); doc.text('Líquido', XA, y, { align: 'right' }); y += 4; doc.setFont('helvetica', 'normal');
    mov.forEach(m => { falta(5); doc.text(new Date(m.d).toLocaleDateString('pt-PT'), X0, y); doc.text(String(m.t).slice(0, 14), X0 + 24, y); doc.text(doc.splitTextToSize(m.desc || '—', 54)[0], X0 + 48, y); doc.text(din2(m.b), 150, y, { align: 'right' }); doc.text(din2(-m.f), 171, y, { align: 'right' }); doc.text(din2(m.l), XA, y, { align: 'right' }); y += 4.4; });
    if ((d.custos || []).length) { falta(12); y += 4; doc.setFont('helvetica', 'bold'); doc.text('Despesas registadas', X0, y); y += 4.5; doc.setFont('helvetica', 'normal'); d.custos.forEach(x => { falta(5); doc.text(x.nome + ' · ' + (CATN[x.cat] || x.cat) + (x.tipo === 'unico' ? '' : ' (mensal)'), X0, y); doc.text(din2(x.v), XA, y, { align: 'right' }); y += 4.4; }); } }
  const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120); doc.text('Prumo · Demonstrações financeiras · ' + d.ym + ' · página ' + i + ' de ' + n, W / 2, 290, { align: 'center' }); doc.setTextColor(0); }
  return doc; };
const xlsx = async d => { const X = await script('vendor/xlsx.full.min.js', 'XLSX'), c = d._c, wb = X.utils.book_new(), info = (OS.Legal && OS.Legal.info) || {}, ass = d.assinatura && d.assinatura.h === d._h ? d.assinatura : null, FMT = '#,##0.00 "€";-#,##0.00 "€"';
  const folha = (nome, aoa, dinCols) => { const ws = X.utils.aoa_to_sheet(aoa); Object.keys(ws).forEach(k => { if (k[0] === '!') return; const cell = ws[k], col = X.utils.decode_cell(k).c; if (typeof cell.v === 'number' && dinCols.includes(col)) cell.z = FMT; }); ws['!cols'] = [{ wch: 46 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]; X.utils.book_append_sheet(wb, ws, nome); };
  const e = v => v == null ? '' : Math.round(v) / 100;
  folha('Capa', [['Prumo · Demonstrações financeiras'], ['Período', mesNome(d.ym)], ['Entidade', info.responsavel || ''], ['NIF', info.nif || ''], ['Morada', info.morada || ''], ['Moeda', 'Euro (€)'], ['Base', 'Caixa · relatório de gestão não auditado'], ['Gerado em', new Date(d.gerado).toLocaleString('pt-PT')], ['Estado', ass ? 'Assinado por ' + ass.nome + (ass.cargo ? ' (' + ass.cargo + ')' : '') + ' em ' + new Date(ass.at).toLocaleString('pt-PT') : 'Por assinar'], ass ? ['Impressão dos valores', ass.h] : []], []);
  folha('Resultados', [['Demonstração de resultados', mesNome(d.ym), 'Acumulado ' + d.ym.slice(0, 4)]].concat(linhasDR(c).map(r => [r[0], e(r[1]), r[2] == null ? '' : e(r[2])])), [1, 2]);
  folha('Fluxos de caixa', [['Demonstração dos fluxos de caixa', mesNome(d.ym)]].concat(linhasFC(c).map(r => [r[0], e(r[1])])), [1]);
  folha('Balanço', [['Balanço (fim do mês)', mesNome(d.ym)]].concat(linhasBL(c).map(r => [r[0], e(r[1])])), [1]);
  folha('Indicadores', [['Indicadores', mesNome(d.ym)]].concat(linhasKP(c).map(r => [r[0], r[2] === 'n' ? (r[1] || 0) : e(r[1])])), [1].filter(() => true));
  folha('Movimentos Stripe', [['Data', 'Tipo', 'Descrição', 'Bruto', 'Comissão', 'Líquido']].concat((d.stripe.mov || []).map(m => [new Date(m.d).toLocaleDateString('pt-PT'), m.t, m.desc, e(m.b), e(-m.f), e(m.l)])), [3, 4, 5]);
  folha('Despesas', [['Despesa', 'Categoria', 'Frequência', 'Valor']].concat((d.custos || []).map(x => [x.nome, CATN[x.cat] || x.cat, x.tipo === 'unico' ? 'Só neste mês' : 'Mensal', e(x.v)])), [3]);
  return new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); };
A.rfPDF = async b => { if (!RF.d) return; b.disabled = true; try { const doc = await pdf(RF.d); baixar(doc.output('blob'), nomeF(RF.d, 'pdf')); } catch (e) { OS.UI.toast(e.message, 'neg'); } b.disabled = false; };
A.rfXLSX = async b => { if (!RF.d) return; b.disabled = true; try { baixar(await xlsx(RF.d), nomeF(RF.d, 'xlsx')); } catch (e) { OS.UI.toast(e.message, 'neg'); } b.disabled = false; };
OS.RelFin = { painel, carregar, contas, pdf, xlsx, _S: RF };
})();
