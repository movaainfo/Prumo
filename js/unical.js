/* PRUMO — Universidade › Calendário escolar (v3.80). Importas o calendário da tua faculdade ou escola — foto, print, PDF, Excel,
   CSV, texto ou o .ics que o portal deixa descarregar — e o Prumo tira as datas: início e fim das aulas, férias, feriados, épocas de
   exames, inscrições e prazos. Vês antes de guardar (e escolhes o que fica); depois as datas aparecem no Calendário do Prumo e na
   Visão geral da Universidade ("Agora: aulas até 23 de janeiro · A seguir: férias de Natal daqui a 12 dias").
   O .ics lê-se no próprio telemóvel; o resto passa pela IA (só o ficheiro do calendário, nada mais). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc, UNI = OS.UNI, UT = OS.UT; if (!UNI || !UT) return;
OS.ONE_DEF.unical = { L: [], fonte: '', at: '' };   // L: [{ id, d, f, t, k }]
const TIPOS = { aulas: ['Aulas', '#60a5fa'], ferias: ['Férias', '#34d399'], feriado: ['Feriado', '#f59e0b'], exames: ['Exames', '#f87171'], inscricoes: ['Inscrições', '#a78bfa'], prazo: ['Prazo', '#f472b6'], evento: ['Evento', '#94a3b8'] };
const DRX = { test: d => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toISOString().slice(0, 10) === d }, uid = () => 'uc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const C = () => OS.one('unical'), today = () => U.today();
const fd = (d, ano) => { const x = U.parse(d); return x.toLocaleDateString('pt-PT', ano ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }); };
const tipoDe = t => { const s = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /exame|avaliac|recurso|prova|epoca (normal|especial)|frequenc/.test(s) ? 'exames' : /ferias|recesso|pausa|interrup/.test(s) ? 'ferias' : /feriado|natal|pascoa|carnaval|dia d[ae]/.test(s) ? 'feriado'
    : /inscri|matricul|candidat|rematric/.test(s) ? 'inscricoes' : /prazo|entrega|limite|data final|ultimo dia/.test(s) ? 'prazo' : /aula|semestre|periodo letivo|inicio|fim d|termino|letivo/.test(s) ? 'aulas' : 'evento'; };
// limpa o que veio (da IA ou do .ics): datas válidas, fim >= início, sem repetidos
const limpa = L => { const out = [], vis = new Set(); (Array.isArray(L) ? L : []).forEach(x => { if (!x) return; const d = String(x.d || x.data || x.inicio || '').slice(0, 10); let f = String(x.f || x.fim || '').slice(0, 10), t = String(x.t || x.titulo || x.title || '').replace(/\s+/g, ' ').trim().slice(0, 90);
    if (!DRX.test(d) || !t || +d.slice(0, 4) < 2000 || +d.slice(0, 4) > 2100) return; if (!DRX.test(f) || f <= d) f = ''; if (f && (U.parse(f) - U.parse(d)) / 864e5 > 200) f = '';
    const k = TIPOS[x.k] ? x.k : tipoDe(t), key = d + '|' + t.toLowerCase(); if (vis.has(key)) return; vis.add(key); out.push({ id: uid(), d, f, t, k }); });
  return out.sort((a, b) => a.d.localeCompare(b.d)); };
// .ics (iCalendar): lê-se aqui mesmo, sem IA
const ics = txt => { const t = String(txt).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, ''), L = [];
  t.split(/BEGIN:VEVENT/).slice(1).forEach(b => { const g = k => { const m = new RegExp('^' + k + '(?:;[^:\\n]*)?:(.*)$', 'm').exec(b); return m ? m[1].trim() : ''; }, dt = v => { const m = /^(\d{4})(\d{2})(\d{2})/.exec(v); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; };
    const d = dt(g('DTSTART')), allDay = /^\d{8}$/.test(g('DTSTART')); let f = dt(g('DTEND')); if (f && allDay) f = U.addDays(f, -1);
    L.push({ d, f, t: g('SUMMARY').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ') }); });
  return limpa(L); };
const PEDIDO = () => `Isto é o calendário escolar (académico) de uma universidade, faculdade ou escola. Tira TODAS as datas importantes: início e fim das aulas de cada semestre ou período, férias e interrupções, feriados, épocas de exames/avaliações/recurso, inscrições e matrículas, prazos (entregas, propinas, pedidos) e outros eventos (receção, cerimónias).
Hoje é ${today()}: quando o ano não estiver escrito, usa o ano letivo que faz sentido com o resto do calendário.
Para períodos (ex.: "Férias de Natal 22/12 a 2/1"), "d" é o primeiro dia e "f" o último; para um só dia, "f" fica vazio. Atenção ao formato das datas do país do calendário (no Brasil e em Portugal é dia/mês).
"t": título curto em português (ex.: "Início das aulas do 1.º semestre", "Época de exames", "Férias de Natal"). "k": um de aulas, ferias, feriado, exames, inscricoes, prazo, evento.
Não inventes datas que não estão no calendário.
JSON: {"itens":[{"d":"AAAA-MM-DD","f":"AAAA-MM-DD ou vazio","t":"...","k":"..."}],"nome":"nome da instituição e ano letivo, se aparecer"}`;
const CI = { busy: false, err: '', res: null, nome: '', sel: null, files: [] };
const ler = async files => { const W = OS.WorkSched || {}, parts = [], txts = []; let L = [];
  for (const f of files) { const n = (f.name || '').toLowerCase(), ty = f.type || '';
    if (/\.ics$/.test(n) || ty === 'text/calendar') { L = L.concat(ics(await f.text())); continue; }
    if (/\.xlsx$/.test(n) && W.readXlsx) { const g = await W.readXlsx(await f.arrayBuffer()); txts.push(g.map(r => r.slice(0, 300).map(x => x.join('\t')).join('\n')).join('\n\n')); continue; }
    if (/\.(csv|tsv)$/.test(n) && W.readCsv) { txts.push(W.readCsv(await f.text())[0].slice(0, 300).map(x => x.join('\t')).join('\n')); continue; }
    if (/\.(txt|md)$/.test(n) || ty.startsWith('text/')) { txts.push((await f.text()).slice(0, 30000)); continue; }
    if (ty.startsWith('image/') && W.shrink) { const s = await W.shrink(f); parts.push({ inline_data: { mime_type: s.mime, data: s.data } }); continue; }
    if (ty === 'application/pdf' || /\.pdf$/.test(n)) { if (f.size > 15e6) throw new Error('O PDF é grande demais (máximo 15 MB).'); parts.push({ inline_data: { mime_type: 'application/pdf', data: await W.b64(f) } }); continue; }
    throw new Error('Não sei ler "' + (f.name || 'este ficheiro') + '". Usa uma foto, PDF, Excel, CSV, texto ou .ics.'); }
  if (parts.length || txts.length) { if (!OS.AI || !OS.AI.json) throw new Error('A IA não está disponível.'); if (parts.length && !(OS.AI.gkey && OS.AI.gkey())) throw Object.assign(new Error('Ler fotos e PDFs precisa da IA do Prumo ligada (Definições › Spyke › Cérebro). Um .ics, Excel ou CSV também serve.'), { setup: 1 });
    const o = await OS.AI.json([{ text: PEDIDO() + (txts.length ? '\n\nO calendário (texto; numa tabela as colunas vêm separadas por TAB):\n' + txts.join('\n\n').slice(0, 60000) : '') }].concat(parts), .1, { deep: true });
    L = L.concat(limpa(o && o.itens)); CI.nome = String((o && o.nome) || '').slice(0, 80); }
  return limpa(L); };
A.ucLer = async () => { const inp = document.getElementById('ucFile'), files = [...((inp && inp.files) || [])]; if (!files.length) return UI.toast('Escolhe primeiro a foto ou o ficheiro do calendário.', 'warn');
  if (OS.AV && OS.AV.verificar) { for (const f of files) { try { const r = await OS.AV.verificar(f); if (r && r.ok === false) return UI.toast('O escudo bloqueou "' + (r.nome || f.name) + '": ' + (r.motivo || 'parece perigoso') + '.', 'warn'); } catch (e) { } } }
  CI.busy = true; CI.err = ''; CI.res = null; OS.request();
  try { const L = await ler(files); if (!L.length) throw new Error('Não encontrei datas neste ficheiro. Experimenta uma foto mais nítida ou o PDF original.'); CI.res = L; CI.sel = new Set(L.map(x => x.id)); }
  catch (e) { CI.err = (e && e.message) || 'Não deu para ler o calendário.'; } CI.busy = false; OS.request(); };
A.ucSel = b => { const id = b.dataset.id; if (!CI.sel) return; CI.sel.has(id) ? CI.sel.delete(id) : CI.sel.add(id); OS.request(); };
A.ucGuardar = b => { if (!CI.res) return; const novos = CI.res.filter(x => CI.sel.has(x.id)); if (!novos.length) return UI.toast('Não escolheste nenhuma data.', 'warn');
  const c = C(), subst = !!(document.getElementById('ucSubst') || {}).checked, base = subst ? [] : c.L, vis = new Set(base.map(x => x.d + '|' + x.t.toLowerCase()));
  c.L = base.concat(novos.filter(x => !vis.has(x.d + '|' + x.t.toLowerCase()))).sort((a, b) => a.d.localeCompare(b.d)); c.fonte = CI.nome || c.fonte || ''; c.at = today(); OS.touch('unical');
  // o semestre do perfil: se o calendário diz quando as aulas começam e acabam, a Universidade passa a saber
  CI.res = null; CI.sel = null; const inp = document.getElementById('ucFile'); if (inp) inp.value = ''; UI.toast(novos.length + (novos.length === 1 ? ' data guardada' : ' datas guardadas') + ' no calendário escolar.', 'pos'); OS.request(); };
A.ucCancelar = () => { CI.res = null; CI.sel = null; CI.err = ''; OS.request(); };
A.ucApagar = b => { const c = C(); c.L = c.L.filter(x => x.id !== b.dataset.id); OS.touch('unical'); OS.request(); };
A.ucLimpar = () => { if (!confirm('Apagar o calendário escolar todo? (Podes importar outra vez.)')) return; const c = C(); c.L = []; c.fonte = ''; OS.touch('unical'); OS.request(); };
OS.forms = OS.forms || {};
OS.forms.ucNovo = (fm) => { const g = k => (fm.querySelector(`[name=${k}]`) || {}).value || ''; const L = limpa([{ d: g('d'), f: g('f'), t: g('t'), k: g('k') }]); if (!L.length) return UI.toast('Falta a data ou o título.', 'warn');
  const c = C(); c.L = c.L.concat(L).sort((a, b) => a.d.localeCompare(b.d)); OS.touch('unical'); fm.reset(); UI.toast('Data juntada.', 'pos'); OS.request(); };
// agora e a seguir
const estado = (t = today()) => { const L = C().L || [], agora = L.filter(x => x.f && x.d <= t && x.f >= t && x.k !== 'evento').sort((a, b) => a.f.localeCompare(b.f)), hoje = L.filter(x => !x.f && x.d === t), prox = L.filter(x => x.d > t);
  return { agora, hoje, prox }; };
const dias = (a, b) => Math.round((U.parse(b) - U.parse(a)) / 864e5), daqui = n => n === 1 ? 'amanhã' : 'daqui a ' + n + ' dias';
const pill = x => `<span class="uc-k" style="--k:${TIPOS[x.k][1]}">${TIPOS[x.k][0]}</span>`;
const quando = x => x.f ? fd(x.d) + ' – ' + fd(x.f) : fd(x.d);
const faixa = () => { const L = C().L || []; if (!L.length) return ''; const e = estado(), t = today(), a = e.agora[0], h = e.hoje[0], p = e.prox[0];
  return `<a class="uc-strip" href="#universidade.calendario">${UI.ic('cal')}<span>${a ? `<b>Agora:</b> ${esc(a.t)} até ${fd(a.f)}` : h ? `<b>Hoje:</b> ${esc(h.t)}` : '<b>Calendário escolar</b>'}${p ? ` <i>·</i> <b>A seguir:</b> ${esc(p.t)} ${daqui(dias(t, p.d))}` : ''}</span></a>`; };
UNI.calendario = () => { const c = C(), L = c.L || [], t = today(), e = estado(t), hasAI = OS.AI && OS.AI.gkey && OS.AI.gkey();
  let h = `<div class="pn uc-imp"><div class="pn-h"><h3>${UI.ic('cal')}Importar o calendário escolar</h3></div>
    <p class="mut">Foto ou print do calendário da faculdade, o PDF, um Excel ou CSV, ou o ficheiro .ics que o portal deixa descarregar. O Prumo tira as datas (aulas, férias, feriados, exames, inscrições e prazos) e mostra-tas antes de guardar.</p>
    ${hasAI ? '' : '<p class="uc-av">Para ler fotos e PDFs, liga a IA em Definições › Spyke › Cérebro. Um .ics lê-se sem IA.</p>'}
    <div class="row gap8 wrap"><input id="ucFile" class="field grow" type="file" multiple accept="image/*,application/pdf,.pdf,.xlsx,.csv,.tsv,.txt,.ics,text/calendar" aria-label="Ficheiro do calendário escolar"><button type="button" class="btn pri" data-act="ucLer"${CI.busy ? ' disabled' : ''}>${CI.busy ? 'A ler o calendário…' : UI.ic('zap') + 'Ler o calendário'}</button></div>
    ${CI.err ? `<p class="uc-err" role="alert">${esc(CI.err)}</p>` : ''}</div>`;
  if (CI.res) { const n = CI.sel.size; h += `<div class="pn uc-prev"><div class="pn-h"><h3>Encontrei ${CI.res.length} ${CI.res.length === 1 ? 'data' : 'datas'}${CI.nome ? ' · ' + esc(CI.nome) : ''}</h3></div><p class="mut">Tira o visto ao que não quiseres guardar.</p>
    <ul class="uc-l">${CI.res.map(x => `<li><label class="uc-ck"><input type="checkbox" data-act="ucSel" data-id="${x.id}"${CI.sel.has(x.id) ? ' checked' : ''}><span class="uc-d">${quando(x)}</span><span class="uc-t">${esc(x.t)}</span>${pill(x)}</label></li>`).join('')}</ul>
    <div class="row gap8 wrap uc-act">${L.length ? '<label class="uc-sub"><input type="checkbox" id="ucSubst" checked> Substituir o calendário que já tinha</label>' : ''}<button type="button" class="btn pri" data-act="ucGuardar">Guardar ${n} ${n === 1 ? 'data' : 'datas'}</button><button type="button" class="btn ghost" data-act="ucCancelar">Cancelar</button></div></div>`; }
  if (L.length) { const a = e.agora[0], p = e.prox[0], fut = L.filter(x => (x.f || x.d) >= t), pas = L.length - fut.length, meses = U.groupBy(fut, x => x.d.slice(0, 7) < t.slice(0, 7) ? t.slice(0, 7) : x.d.slice(0, 7));
    h += `<div class="uc-now">${a ? `<div class="uc-n"><small>Agora</small><b>${esc(a.t)}</b><span>até ${fd(a.f, true)} · faltam ${dias(t, a.f) + 1} dias</span></div>` : ''}${p ? `<div class="uc-n"><small>A seguir</small><b>${esc(p.t)}</b><span>${fd(p.d, true)} · ${daqui(dias(t, p.d))}</span></div>` : ''}</div>
    <div class="pn"><div class="pn-h"><h3>O teu calendário escolar</h3><span class="mut">${c.fonte ? esc(c.fonte) + ' · ' : ''}${L.length} datas${pas ? ' · ' + pas + ' já passaram' : ''}</span></div>
      ${Object.keys(meses).sort().map(m => `<h4 class="uc-m">${U.fmtYML ? U.fmtYML(m) : m}</h4><ul class="uc-l">${meses[m].map(x => `<li class="${x.d <= t && (x.f || x.d) >= t ? 'on' : ''}"><span class="uc-d">${quando(x)}</span><span class="uc-t">${esc(x.t)}</span>${pill(x)}<button type="button" class="btn xs ghost" data-act="ucApagar" data-id="${x.id}" aria-label="Apagar ${esc(x.t)}">${UI.ic('x')}</button></li>`).join('')}</ul>`).join('') || '<p class="mut">Todas as datas deste calendário já passaram. Importa o do próximo ano letivo.</p>'}
      <p class="mut uc-cal">As datas aparecem também no ${'<a href="#calendario.mes">Calendário</a>'} do Prumo.</p></div>`; }
  h += `<details class="pn uc-man"><summary><b>Juntar uma data à mão</b></summary><form data-form="ucNovo" class="uc-f" autocomplete="off"><label>Início<input class="field" type="date" name="d" required></label><label>Fim (se for um período)<input class="field" type="date" name="f"></label>
    <label class="grow">Título<input class="field" name="t" maxlength="90" required placeholder="ex.: Época de recurso"></label><label>Tipo<select class="field" name="k">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label><button class="btn">Juntar</button></form>
    ${L.length ? '<button type="button" class="btn sm ghost uc-clr" data-act="ucLimpar">Apagar o calendário escolar</button>' : ''}</details>`;
  return `<div class="uc">${h}</div>`; };
if (!UT.some(x => x[0] === 'calendario')) UT.push(['calendario', 'Calendário escolar']);
// no Calendário do Prumo (cada dia dos períodos, até 200 dias)
if (OS.Cal && OS.Cal.items) { OS.Cal.src.uni = ['Calendário escolar', '#a78bfa']; const _it = OS.Cal.items; OS.Cal.items = (from, to) => { const out = _it(from, to);
  (C().L || []).forEach(x => { const a = x.d > from ? x.d : from, b = (x.f || x.d) < to ? (x.f || x.d) : to; if (a > b) return; U.range(a, b).forEach(d => out.push({ date: d, title: x.t, src: 'uni', color: TIPOS[x.k][1], sub: x.f ? (d === x.d ? 'começa' : d === x.f ? 'último dia' : '') : '' })); });
  return out.sort((p, q) => (p.date + (p.start || '99')).localeCompare(q.date + (q.start || '99'))); }; }
// na Visão geral da Universidade
const _v = UNI.visao; UNI.visao = () => faixa() + _v();
OS.UniCal = { ler, ics, limpa, estado, tipoDe, TIPOS, _CI: CI };
})();
