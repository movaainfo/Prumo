/* PRUMO — Trabalho+: folgas, horário semanal, horário a partir de FOTO (IA lê a escala e atualiza só os dias futuros
   do período indicado) e projetos de trabalho (ligados aos Projetos e Tarefas do Prumo). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, V = OS.views, A = OS.act, esc = U.esc, today = () => U.today();
const OFFK = ['Folga', 'Férias', 'Feriado', 'Baixa', 'Falta justificada'];
OS.S.dayoffs = { label: 'Folga', title: r => (r.kind || 'Folga') + ' · ' + U.fmtD(r.date), fields: [
  { k: 'date', l: 'Dia', t: 'date', req: 1 }, { k: 'kind', l: 'Tipo', t: 'sel', o: OFFK }, { k: 'note', l: 'Nota', t: 'text' }], defaults: () => ({ date: today(), kind: 'Folga' }) };
// folgas no calendário
if (OS.Cal && OS.Cal.items) { OS.Cal.src.off = ['Folgas', '#22c55e']; const _it = OS.Cal.items; OS.Cal.items = (from, to) => { const out = _it(from, to); OS.all('dayoffs').forEach(o => { if (o.date >= from && o.date <= to) out.push({ date: o.date, title: '' + (o.kind || 'Folga'), src: 'off', edit: 'dayoffs:' + o.id }); }); return out.sort((a, b) => (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99'))); }; }
const dayInfo = d => ({ sh: U.sortBy(OS.all('shifts').filter(s => s.date === d), s => s.start || ''), off: OS.all('dayoffs').find(o => o.date === d) });
const hrs = s => OS.Car && OS.Car.shiftHours ? OS.Car.shiftHours(s) : 0;

/* abas do Trabalho */
const TT = [['', 'Resumo'], ['horario', 'Horário & folgas'], ['foto', 'Importar escala'], ['projetos', 'Projetos de trabalho']];
OS.on('ready', () => { const o = V.trabalho; if (!o || o._ws) return; V.trabalho = sub => { const k = TT.some(t => t[0] === (sub || '')) ? (sub || '') : '', base = o(), i = base.indexOf('</header>') + 9, head = base.slice(0, i), tabs = UI.tabs('trabalho', TT, k);
  return k ? head + tabs + (k === 'horario' || k === 'foto' ? limparBar() : '') + W[k]() : head + tabs + weekStrip() + jobsPanel() + base.slice(i); }; V.trabalho._ws = 1; });
const W = {};
const weekStrip = () => { const t = today(), days = U.range(t, U.addDays(t, 6));
  return `<div class="ws-strip">${days.map(d => { const { sh, off } = dayInfo(d); return `<a class="ws-d ${off ? 'off' : sh.length ? 'work' : ''} ${d === t ? 'today' : ''}" href="#trabalho.horario"><small>${d === t ? 'Hoje' : U.WDS[U.parse(d).getDay()]} ${+d.slice(8)}</small><b>${off ? esc(off.kind || 'Folga') : sh.length ? sh.map(s => s.start + '–' + s.end).join('<br>') : '—'}</b></a>`; }).join('')}</div>`; };
W.horario = () => { const wk0 = U.addDays(U.monday(today()), 7 * (+OS.ui.wsW || 0)), days = U.range(wk0, U.addDays(wk0, 13)), t = today();
  const offN = OS.all('dayoffs').filter(o => o.date >= t.slice(0, 4) + '-01-01' && o.date <= t.slice(0, 4) + '-12-31');
  return `<div class="row gap8" style="flex-wrap:wrap;align-items:center;margin-bottom:10px"><button class="icon-btn" data-act="wsW" data-d="-1" aria-label="Anterior">${UI.ic('left')}</button><b>${U.fmtDS(days[0])} – ${U.fmtDS(days[13])}</b><button class="icon-btn" data-act="wsW" data-d="1" aria-label="Seguinte">${UI.ic('right')}</button><span class="grow"></span>${UI.addBtn('shifts', 'Turno', null, 'sm')}${UI.addBtn('dayoffs', 'Folga', null, 'sm')}<a class="btn sm pri" href="#trabalho.foto">Importar escala</a></div>
  <div class="kpis">${UI.kpi('Folgas este ano', offN.filter(o => (o.kind || 'Folga') === 'Folga').length)}${UI.kpi('Férias', offN.filter(o => o.kind === 'Férias').length + ' dias')}${UI.kpi('Horas marcadas nestas 2 semanas', U.nf(U.sum(OS.all('shifts').filter(s => s.date >= days[0] && s.date <= days[13]), hrs), 1) + ' h')}${UI.kpi('Próxima folga', (() => { const n = U.sortBy(OS.all('dayoffs').filter(o => o.date >= t), o => o.date)[0]; return n ? U.fmtDS(n.date) : '—'; })())}</div>
  <div class="ws-cal">${days.map(d => { const { sh, off } = dayInfo(d), past = d < t; return `<div class="ws-c ${off ? 'off' : sh.length ? 'work' : 'free'} ${d === t ? 'today' : ''} ${past ? 'past' : ''}"><div class="ws-h"><b>${U.WDS[U.parse(d).getDay()]} ${+d.slice(8)}</b>${d === t ? '<span class="bdg acc">hoje</span>' : ''}</div>
    ${off ? `<div class="ws-off click" data-edit="dayoffs:${off.id}">${esc(off.kind || 'Folga')}${off.note ? `<small>${esc(off.note)}</small>` : ''}</div>` : ''}${sh.map(s => `<div class="ws-sh click" data-edit="shifts:${s.id}"><b>${s.start}–${s.end}</b><small>${esc([s.place, s.role, s.src === 'foto' ? 'da escala' : ''].filter(Boolean).join(' · '))}</small></div>`).join('')}
    ${!off && !sh.length ? `<small class="mut">${past ? '—' : 'sem turno'}</small>` : ''}${past ? '' : `<div class="ws-a">${off ? '' : `<button class="btn xs ghost" data-act="wsOff" data-d="${d}">Folga</button>`}<button class="btn xs ghost" data-new="shifts" data-defs='${esc(JSON.stringify({ date: d }))}'>+ Turno</button></div>`}</div>`; }).join('')}</div>`; };
A.wsW = b => OS.setUI('wsW', (+OS.ui.wsW || 0) + +b.dataset.d * 2);
A.wsOff = b => { const d = b.dataset.d; OS.add('dayoffs', { date: d, kind: 'Folga' }); OS.all('shifts').filter(s => s.date === d).forEach(s => OS.del('shifts', s.id)); UI.toast('Folga marcada em ' + U.fmtD(d), 'pos'); };

/* ---------- importar escala: foto, PDF, Excel (.xlsx) ou CSV ----------
   Numa escala de equipa há muitas pessoas. Para não misturar linhas:
   - folha de cálculo (Excel/CSV): o próprio app encontra a linha da pessoa e só essa linha (com o cabeçalho das datas) vai para a IA;
   - foto ou PDF: 1.º a IA lista os nomes que aparecem; o app escolhe o nome da pessoa (sem acentos, aceita "Ryan M." para "RYAN MAGALHÃES");
     2.º a IA lê só essa linha, sabendo quem está acima e abaixo, e diz que nome leu (confere-se antes de mudar a escala).
   Se houver dúvida entre nomes parecidos, pergunta qual é e guarda a escolha para a próxima vez. */
let IM = { files: [], busy: false, err: '', res: null, names: null, pick: null };
const shrink = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1800 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res({ kind: 'img', mime: 'image/jpeg', data: c.toDataURL('image/jpeg', .86).split(',')[1], url: c.toDataURL('image/jpeg', .5), name: f.name || 'foto' }); }; im.onerror = rej; im.src = r.result; }; r.onerror = rej; r.readAsDataURL(f); });
const b64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
// nomes: sem acentos nem pontuação; "Ryan M." serve para "RYAN MAGALHÃES"; só o primeiro nome é fraco (pode haver dois)
const nrm = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const nameScore = (want, cand) => { const a = nrm(want), b = nrm(cand); if (!a || !b) return 0; if (a === b) return 100; const A = a.split(' '), B = b.split(' ');
  // 2 = palavra igual, 1 = abreviada/inicial ("M" de "Magalhães"), 0 = não aparece
  const tq = (x, y) => x === y ? 2 : (x.length <= 2 ? (y.startsWith(x) ? 1 : 0) : (y.startsWith(x) || (x.startsWith(y) && y.length >= 3)) ? 1 : 0), bst = (x, L) => Math.max(0, ...L.map(y => tq(x, y)));
  const fA = A.map(x => bst(x, B)), fB = B.map(y => bst(y, A)), fw = fA.every(v => v), bw = fB.every(v => v), ex = fA.every(v => v === 2), first = tq(A[0], B[0]) ? 4 : 0;
  if (fw && bw) return (ex ? 95 : 90) + (first ? 2 : 0); if (fw) return Math.max(70, (ex ? 86 : 78) - (B.length - A.length) * 3 + first); if (bw) return 70 + first; if (A[0].length >= 3 && B.includes(A[0])) return 45; return 0; };
// o nome da pessoa na lista; se o melhor e o segundo estiverem quase empatados, pergunta
const findName = (want, names) => { const S = [...new Set(names.filter(Boolean))].map(n => ({ n, s: nameScore(want, n) })).filter(x => x.s >= 45).sort((a, b) => b.s - a.s);
  if (!S.length) return { none: 1 }; const close = S.filter(x => S[0].s - x.s < 6); return close.length === 1 && S[0].s >= 70 ? { n: S[0].n } : { amb: (close.length > 1 ? close : S).slice(0, 8).map(x => x.n) }; };
// Excel (.xlsx) sem bibliotecas: abre o zip (o navegador descomprime) e lê a primeira folha que tiver texto
const unzip = async buf => { const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('O ficheiro Excel parece estragado.'); const n = dv.getUint16(e + 10, true), F = {}; let p = dv.getUint32(e + 16, true), td = new TextDecoder();
  for (let i = 0; i < n && dv.getUint32(p, true) === 0x02014b50; i++) { const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true); F[td.decode(u8.subarray(p + 46, p + 46 + nl))] = { m: dv.getUint16(p + 10, true), sz: dv.getUint32(p + 20, true), o: dv.getUint32(p + 42, true) }; p += 46 + nl + xl + cl; }
  return { names: Object.keys(F), get: async k => { const f = F[k]; if (!f) return null; const q = f.o, s = q + 30 + dv.getUint16(q + 26, true) + dv.getUint16(q + 28, true), d = u8.subarray(s, s + f.sz);
    if (f.m === 0) return td.decode(d); if (!window.DecompressionStream) throw new Error('Este navegador não abre Excel: guarda a escala como CSV.'); return td.decode(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); } }; };
const xcell = v => { const n = +v; if (v === '' || isNaN(n)) return v; if (n > 0 && n < 1) { const m = Math.round(n * 1440); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  if (n > 30000 && n < 80000 && Math.floor(n) === n) return new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(0, 10); return v; };
const readXlsx = async buf => { const z = await unzip(buf), P = new DOMParser(), X = t => P.parseFromString(t || '<x/>', 'application/xml');
  const ss = [...X(await z.get('xl/sharedStrings.xml')).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join(''));
  const sheets = z.names.filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/))), out = [];
  for (const k of sheets.slice(0, 6)) { const rows = []; [...X(await z.get(k)).getElementsByTagName('row')].slice(0, 400).forEach(r => { const R = []; [...r.getElementsByTagName('c')].forEach(c => { const ref = c.getAttribute('r') || '', col = ref.replace(/\d+/g, '').split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1, t = c.getAttribute('t'), v = (c.getElementsByTagName('v')[0] || {}).textContent || '';
      R[col >= 0 ? col : R.length] = t === 's' ? ss[+v] || '' : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : t === 'b' ? (v === '1' ? 'VERDADEIRO' : 'FALSO') : xcell(v); }); rows.push(Array.from(R, x => x == null ? '' : String(x).trim())); });
    if (rows.some(r => r.some(Boolean))) out.push(rows); }
  return out; };
const readCsv = t => { const L = t.replace(/^\ufeff/, '').split(/\r?\n/).slice(0, 400), sep = [';', '\t', ','].sort((a, b) => (L[0] || '').split(b).length - (L[0] || '').split(a).length)[0];
  return [L.map(l => { const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === sep) { o.push(cur.trim()); cur = ''; } else cur += ch; } o.push(cur.trim()); return o; })]; };
// numa folha: a linha da pessoa (o nome está nas primeiras colunas), as linhas de cabeçalho com as datas e a legenda dos códigos
const DAYW = /^(seg|ter|qua|qui|sex|sab|sáb|dom|mon|tue|wed|thu|fri|sat|sun|lun|mar|mie|mié|jue|vie)/i;
const headish = r => r.filter(c => /^\d{4}-\d{2}-\d{2}$/.test(c) || /^\d{1,2}([\/.-]\d{1,2}([\/.-]\d{2,4})?)?$/.test(c) || DAYW.test(c)).length >= 3;
const sheetRow = (grids, want) => { const all = []; grids.forEach((rows, gi) => rows.forEach((r, ri) => { const nm = r.slice(0, 3).filter(c => c && c.length >= 3 && /[a-zà-ú]/i.test(c) && !/^\d/.test(c) && !/^\d{1,2}:\d{2}/.test(c) && c.length < 60).join(' '); if (nm) all.push({ gi, ri, nm, s: Math.max(...r.slice(0, 3).map(c => nameScore(want, c)), nameScore(want, nm)) }); }));
  const ok = all.filter(x => x.s >= 45).sort((a, b) => b.s - a.s); if (!ok.length) return { none: 1, near: all.map(x => x.nm).slice(0, 60) };
  const top = ok.filter(x => ok[0].s - x.s < 6); if (top.length > 1 || ok[0].s < 70) return { amb: [...new Set((top.length > 1 ? top : ok.slice(0, 6)).map(x => x.nm))] };
  const { gi, ri } = ok[0], rows = grids[gi], heads = rows.slice(0, ri).filter(headish).slice(-3), legend = rows.filter(r => r.filter(Boolean).length <= 4 && r.some(c => /[=:]/.test(c) && /[a-z]/i.test(c))).slice(0, 15);
  const tsv = r => r.map(c => String(c || '').replace(/\s+/g, ' ')).join('\t');
  return { n: ok[0].nm, text: (heads.length ? heads : rows.slice(0, Math.min(3, ri))).map(tsv).join('\n') + '\n' + tsv(rows[ri]) + (legend.length ? '\n\nLegenda:\n' + legend.map(r => r.filter(Boolean).join(' ')).join('\n') : '') }; };
W.foto = () => { const p = OS.one('profile'), hasAI = OS.AI && OS.AI.gkey && OS.AI.gkey(), t = today(), from = OS.ui.wsFrom || t, to = OS.ui.wsTo || U.addDays(t, 13), onlySheets = IM.files.length && IM.files.every(f => f.kind === 'sheet'), canRead = hasAI || (onlySheets && OS.AI && OS.AI.freeOn && OS.AI.freeOn());
  return `${hasAI ? '' : `<div class="pn">${OS.AI && OS.AI.setup ? OS.AI.setup('') : ''}</div>`}<div class="pn"><div class="pn-h"><h3>Importar a escala</h3></div>
    <p class="mut" style="margin:0 0 10px">Foto, print, PDF, Excel ou CSV da escala que o teu trabalho envia, mesmo com a equipa toda. O Prumo procura <b>só a linha com o teu nome</b> e atualiza os teus turnos e folgas — <b>só os dias de hoje em diante</b> e dentro do período que escolheres. Se importares outra escala dos mesmos dias, <b>vale a última</b>. O que já passou nunca é alterado.</p>
    <div class="ws-form"><label>O teu nome na escala<input class="field" data-bind="profile.schedName" value="${esc(p.schedName || p.short || OS.who())}" placeholder="ex.: Ryan M."></label><label>De<input class="field" type="date" data-uiv="wsFrom" value="${from}" min="${t}"></label><label>Até<input class="field" type="date" data-uiv="wsTo" value="${to}" min="${from}"></label>
      <label>Local (opcional)<input class="field" data-bind="profile.schedPlace" value="${esc(p.schedPlace || '')}" placeholder="ex.: Loja Aveiro"></label>${jobsAll().length > 1 ? `<label>De que trabalho é esta escala?<select class="field" data-uiv="wsJob"><option value="">Escolhe…</option>${jobsAll().map(j => `<option value="${esc(j.id)}" ${OS.ui.wsJob === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select></label>` : ''}</div>
    <div class="row gap8" style="flex-wrap:wrap;margin-top:10px"><label class="btn">${UI.ic('plus')}Foto ou ficheiro<input type="file" accept="image/*,application/pdf,.pdf,.xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple id="wsFile" hidden></label><label class="btn ghost">Tirar foto<input type="file" accept="image/*" capture="environment" id="wsCam" hidden></label>${IM.files.length ? `<button class="btn pri" data-act="wsRead" ${IM.busy || !canRead ? 'disabled' : ''}>${IM.busy ? 'A ler a escala…' : 'Ler a minha escala'}</button><button class="btn ghost" data-act="wsClear">Limpar</button>` : ''}</div>
    ${UNDO && Date.now() - UNDO.at < 30 * 60e3 ? `<div class="ws-done">${UI.ic('check')}<span>Escala atualizada${UNDO.who ? ' (linha de ' + esc(UNDO.who) + ')' : ''}: ${UNDO.n} turnos e ${UNDO.f} folgas${UNDO.rep ? `, no lugar de ${UNDO.rep} registos da escala anterior` : ''}.</span><button class="btn xs ghost" data-act="wsUndo">Desfazer</button></div>` : ''}
    ${IM.files.length ? `<div class="ws-thumbs">${IM.files.map(f => f.kind === 'img' ? `<img src="${f.url}" alt="escala">` : `<span class="ws-file">${UI.ic(f.kind === 'pdf' ? 'book' : 'grid')}${esc(f.name)}</span>`).join('')}</div>` : ''}
    ${IM.pick ? `<div class="ws-pick"><b>${IM.pick.none ? `Não encontrei “${esc(p.schedName || p.short || '')}” na escala.` : 'Há mais do que um nome parecido.'} Qual és tu?</b><div class="row gap8 wrap">${IM.pick.list.slice(0, 40).map(n => `<button class="btn sm" data-act="wsPick" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>` : ''}
    ${IM.err ? `<p class="neg">${esc(IM.err)}</p>` : ''}</div>
  ${IM.res ? (() => { const R = IM.res.filter(x => x.date >= from && x.date <= to && x.date >= t); return `<div class="pn"><div class="pn-h"><h3>Confirma o que a IA leu (${R.length} dias)</h3></div>${R.length ? `<div class="list" data-all>${R.map((x, i) => `<div class="li"><span class="when">${U.WDS[U.parse(x.date).getDay()]} ${U.fmtDS(x.date)}</span><div class="li-t"><b>${x.off ? '' + esc(x.kind || 'Folga') : esc(x.start + '–' + x.end)}</b><small>${esc([x.place, x.note].filter(Boolean).join(' · '))}${dayInfo(x.date).sh.length || dayInfo(x.date).off ? ' · substitui o que lá está' : ''}</small></div></div>`).join('')}</div><div class="row gap8" style="margin-top:10px"><button class="btn pri" data-act="wsApply">Atualizar a minha semana</button><button class="btn ghost" data-act="wsClear">Cancelar</button></div>` : '<p class="mut">Nada dentro do período escolhido (ou só dias que já passaram).</p>'}${IM.skipped ? `<small class="mut">${IM.skipped} dia(s) fora do período ou já passados foram ignorados.</small>` : ''}</div>`; })() : ''}`; };
document.addEventListener('change', async e => { if (e.target.id !== 'wsFile' && e.target.id !== 'wsCam') return; const fs = [...e.target.files].slice(0, 6); IM.err = ''; IM.res = null; IM.names = null; IM.pick = null;
  for (const f of fs) { const nm = f.name || '', low = nm.toLowerCase();
    try { if (/^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/.test(low)) IM.files.push(await shrink(f));
      else if (f.type === 'application/pdf' || /\.pdf$/.test(low)) { if (f.size > 12e6) throw new Error('O PDF é grande demais (máx. 12 MB).'); IM.files.push({ kind: 'pdf', mime: 'application/pdf', data: await b64(f), name: nm }); }
      else if (/\.xlsx$/.test(low) || /spreadsheetml/.test(f.type)) IM.files.push({ kind: 'sheet', grids: await readXlsx(await f.arrayBuffer()), name: nm });
      else if (/\.csv$/.test(low) || /text\/(csv|plain)/.test(f.type)) IM.files.push({ kind: 'sheet', grids: readCsv(await f.text()), name: nm });
      else if (/\.xls$/.test(low)) throw new Error('Os ficheiros .xls antigos não abrem aqui: no Excel, guarda como .xlsx ou .csv.');
      else throw new Error('Este tipo de ficheiro não serve. Usa foto, PDF, Excel (.xlsx) ou CSV.'); }
    catch (er) { IM.err = er.message || 'Não consegui abrir o ficheiro.'; } }
  IM.files = IM.files.slice(-6); e.target.value = ''; OS.request(); });
A.wsClear = () => { IM = { files: [], busy: false, err: '', res: null, names: null, pick: null }; OS.request(); };
A.wsPick = b => { OS.setOne('profile', { schedName: b.dataset.n }); IM.pick = null; A.wsRead(); };
const SCHEMA = (t, from, to) => `Hoje é ${t} (${U.WDS[U.parse(t).getDay()]}). O período pedido é de ${from} a ${to}. Converte cada dia em data completa AAAA-MM-DD (usa o mês/ano mais provável perto de hoje; se a escala só tiver dias da semana, assume a semana que contém essas datas no período pedido).
Para cada dia: se for folga/descanso/F/D/off → {"data","folga":true,"tipo":"Folga"|"Férias"|"Feriado"}; se trabalhar → {"data","entrada":"HH:MM","saida":"HH:MM","pausa_min":número ou 0}. Se a escala usar códigos (ex.: M, T, N), usa a legenda para as horas. Turnos que passam da meia-noite: mantém a data de início. Se não conseguires ler um dia, não o inventes.`;
const toDays = (o, p) => (o.dias || []).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.data || '')).map(x => x.folga ? { date: x.data, off: true, kind: OFFK.includes(x.tipo) ? x.tipo : 'Folga' } : { date: x.data, start: (x.entrada || '').slice(0, 5), end: (x.saida || '').slice(0, 5), breakMin: +x.pausa_min || 0, place: p.schedPlace || '' }).filter(x => x.off || (/^\d\d:\d\d$/.test(x.start) && /^\d\d:\d\d$/.test(x.end)));
A.wsRead = async () => { if (IM.busy || !IM.files.length) return; const p = OS.one('profile'), want = p.schedName || p.short || OS.who(), t = today(), from = OS.ui.wsFrom || t, to = OS.ui.wsTo || U.addDays(t, 13); IM.busy = true; IM.err = ''; IM.pick = null; OS.request();
  try { const all = [], sheets = IM.files.filter(f => f.kind === 'sheet'), media = IM.files.filter(f => f.kind !== 'sheet'); let who = '';
    // folhas de cálculo: a linha encontra-se aqui; para a IA só vai essa linha (com as datas e a legenda)
    for (const f of sheets) { const r = sheetRow(f.grids, want);
      if (r.none || r.amb) { IM.pick = { none: !!r.none, list: r.amb || r.near || [] }; IM.busy = false; return OS.request(); }
      who = r.n; const o = await OS.AI.json([{ text: `Isto é UMA linha de uma escala de trabalho (folha de cálculo), já escolhida: a da pessoa "${r.n}". Por cima estão as linhas de cabeçalho com as datas/dias; no fim, a legenda dos códigos (se houver). Colunas separadas por TAB.\n\n${r.text}\n\n${SCHEMA(t, from, to)}\nJSON: {"dias":[...]}` }], .1);
      all.push(...toDays(o, p)); }
    // fotos e PDFs: 1) os nomes que aparecem; 2) só a linha da pessoa
    if (media.length) { const parts = media.map(f => ({ inline_data: { mime_type: f.mime, data: f.data } }));
      if (!IM.names) { const o1 = await OS.AI.json([{ text: 'Isto é uma escala/horário de trabalho de uma equipa. Lista TODOS os nomes de pessoas que aparecem, exatamente como estão escritos, pela ordem em que aparecem (de cima para baixo; se os nomes estiverem em colunas, da esquerda para a direita). Não leias horários nem dias. JSON: {"nomes":["..."]}' }].concat(parts), .1);
        IM.names = (o1.nomes || []).map(x => String(x || '').trim()).filter(x => x && x.length < 80).slice(0, 200); }
      const m = findName(want, IM.names);
      if (m.none || m.amb) { IM.pick = { none: !!m.none, list: m.amb || IM.names }; IM.busy = false; return OS.request(); }
      const i = IM.names.indexOf(m.n), prev = IM.names[i - 1], next = IM.names[i + 1];
      const o = await OS.AI.json([{ text: `Isto é uma escala/horário de trabalho de uma equipa, com várias pessoas. Lê APENAS a linha (ou coluna) da pessoa "${m.n}"${prev ? `, que vem logo a seguir a "${prev}"` : ''}${next ? ` e antes de "${next}"` : ''}. Ignora todas as outras pessoas: não juntes horários de outras linhas. Segue a linha de "${m.n}" com cuidado até ao fim, coluna a coluna, alinhada com o cabeçalho das datas.
${SCHEMA(t, from, to)}
Se houver várias páginas/fotos e o mesmo dia aparecer em mais do que uma, vale o da ÚLTIMA (é a escala mais recente).
JSON: {"nome_lido":"o nome exato da linha que leste","dias":[...],"observacoes":"…"}` }].concat(parts), .1);
      if (o.nome_lido && nameScore(m.n, o.nome_lido) < 70 && nameScore(want, o.nome_lido) < 70) throw new Error(`A IA leu a linha de “${o.nome_lido}”, não a de “${m.n}”. Tenta outra vez com uma foto mais nítida (ou corta a foto à volta da tua linha).`);
      who = who || m.n; all.push(...toDays(o, p)); }
    if (!all.length) throw new Error('A IA não conseguiu ler dias da tua linha. Tenta uma foto mais nítida e direita (ou o ficheiro original da escala).');
    const one = [...new Map(all.map(x => [x.date, x])).values()].sort((a, b) => a.date < b.date ? -1 : 1);
    IM.res = one; IM.who = who; IM.skipped = one.filter(x => !(x.date >= from && x.date <= to && x.date >= t)).length; IM.busy = false;
    apply(true); return; } catch (er) { IM.err = er.message || 'Erro da IA'; } IM.busy = false; OS.request(); };
/* aplicar a escala lida: a última importação prevalece.
   - nos dias que a foto traz: o que lá estava (turno ou folga) dá lugar ao da foto;
   - nas semanas que a foto cobre: o que veio de uma foto anterior e já não está na nova sai (a escala mudou);
   - o que já passou nunca muda; e guarda o que estava, para "Desfazer". */
let UNDO = null;
const apply = auto => { const t = today(), from = OS.ui.wsFrom || t, to = OS.ui.wsTo || U.addDays(t, 13), R = [...new Map((IM.res || []).map(x => [x.date, x])).values()].filter(x => x.date >= from && x.date <= to && x.date >= t); if (!R.length) { OS.request(); return; }
  const dates = new Set(R.map(x => x.date)), weeks = new Set(R.map(x => U.monday(x.date))), hit = r => r.date >= t && (dates.has(r.date) || (r.src === 'foto' && weeks.has(U.monday(r.date)) && r.date >= from && r.date <= to));
  const oldS = OS.all('shifts').filter(hit), oldO = OS.all('dayoffs').filter(hit);
  oldS.forEach(s => OS.del('shifts', s.id, { silent: true })); oldO.forEach(o => OS.del('dayoffs', o.id, { silent: true }));
  const added = R.map(x => x.off ? ['dayoffs', OS.add('dayoffs', { date: x.date, kind: x.kind, src: 'foto', at: Date.now() }, { silent: true }).id] : ['shifts', OS.add('shifts', { date: x.date, start: x.start, end: x.end, breakMin: x.breakMin, place: x.place, src: 'foto', job: OS.ui.wsJob || (jobsAll()[0] || {}).id || '', at: Date.now() }, { silent: true }).id]);
  UNDO = { at: Date.now(), who: IM.who || '', oldS: oldS.map(x => Object.assign({}, x)), oldO: oldO.map(x => Object.assign({}, x)), added, n: R.filter(x => !x.off).length, f: R.filter(x => x.off).length, rep: oldS.length + oldO.length };
  OS.touch && OS.emit('change', 'shifts'); if (OS.CalPush) OS.CalPush.soon(1500); // a escala importada vai logo também para o Google Calendar / iPhone
  UI.toast(`Escala atualizada: ${UNDO.n} turnos e ${UNDO.f} folgas${UNDO.rep ? ` (substituiu ${UNDO.rep} registos anteriores)` : ''}${OS.CalPush && OS.one('calx').on ? ' · e no Google Calendar' : ''}`, 'pos');
  IM = { files: [], busy: false, err: '', res: null, names: null, pick: null }; OS.setUI('wsW', 0); if (!auto) location.hash = 'trabalho.horario'; else OS.request(); };
A.wsApply = () => apply(false);
A.wsUndo = () => { if (!UNDO) return; UNDO.added.forEach(([c, id]) => OS.get(c, id) && OS.del(c, id, { silent: true })); UNDO.oldS.forEach(x => { const o = Object.assign({}, x); delete o.id; OS.add('shifts', o, { silent: true }); }); UNDO.oldO.forEach(x => { const o = Object.assign({}, x); delete o.id; OS.add('dayoffs', o, { silent: true }); });
  UNDO = null; OS.emit('change', 'shifts'); if (OS.CalPush) OS.CalPush.soon(1500); UI.toast('Importação desfeita: a escala voltou ao que estava', 'pos'); OS.request(); };
OS.WorkSched = Object.assign(OS.WorkSched || {}, { undo: () => UNDO, _apply: apply, _set: r => { IM.res = r; } });

/* ---------- projetos de trabalho (são Projetos do Prumo do tipo Profissional) ---------- */
const isWork = p => ['Profissional', 'Empresarial'].includes(p.type) || p.area === 'Trabalho';
W.projetos = () => { const P = OS.all('projects').filter(isWork), act = P.filter(p => !['Concluído', 'Cancelado'].includes(p.status)), Proj = OS.Proj;
  return `<div class="row gap8" style="flex-wrap:wrap;margin-bottom:10px">${UI.addBtn('projects', 'Projeto de trabalho', { type: 'Profissional', status: 'Em andamento', area: 'Trabalho' })}<a class="btn ghost" href="#projetos">Todos os projetos</a><span class="mut" style="font-size:12.5px;align-self:center">São os mesmos projetos da aba Projetos e Tarefas — mudar aqui muda lá.</span></div>
  <div class="kpis">${UI.kpi('Em andamento', act.filter(p => p.status === 'Em andamento').length)}${UI.kpi('Tarefas abertas', U.sum(act, p => Proj.info(p).open.length))}${UI.kpi('Atrasados', act.filter(p => Proj.info(p).late).length, '', { tone: act.some(p => Proj.info(p).late) ? 'neg' : '' })}${UI.kpi('Concluídos', P.filter(p => p.status === 'Concluído').length)}</div>
  ${act.length ? `<div class="g g2">${U.sortBy(act, p => (p.due || '9') + (p.prio || '3')).map(p => { const i = Proj.info(p); return `<div class="pn wp"><div class="row between gap8"><div class="click grow" data-edit="projects:${p.id}" style="min-width:0"><span class="eyebrow">${esc(p.status)}${p.due ? ' · prazo ' + U.fmtDS(p.due) : ''}</span><b class="wp-t">${esc(p.name)}</b>${p.objective ? `<small class="mut">${esc(p.objective)}</small>` : ''}</div><span class="mono">${U.pct(i.prog)}</span></div>${UI.bar(i.prog, i.late ? 'neg' : i.prog >= 1 ? 'pos' : '')}
    <div class="list" style="margin-top:6px">${i.open.slice(0, 5).map(x => OS.taskRow ? OS.taskRow(x) : esc(x.title)).join('')}</div><form class="row gap6" data-form="quickTask" data-project="${p.id}" style="margin-top:6px"><input class="field grow" name="t" placeholder="+ tarefa neste projeto" aria-label="Nova tarefa"><button class="btn sm">${UI.ic('plus')}</button></form>${i.late ? '<small class="neg">Prazo ultrapassado</small>' : i.stalled ? `<small class="warn">Parado há ${i.idle} dias</small>` : ''}</div>`; }).join('')}</div>` : UI.empty('Sem projetos de trabalho. Cria um para separar as tarefas de cada projeto.', UI.addBtn('projects', 'Criar projeto de trabalho', { type: 'Profissional', status: 'Em andamento', area: 'Trabalho' }, ''))}`; };
/* ---------- v3.99 · vários trabalhos: emprego, part-time, freelancer, negócio próprio, estágio. Cada um com o valor da hora (ou salário fixo)
   e os turnos ligados a ele. O valor de cada turno: o do turno, senão o do trabalho, senão o do perfil. ---------- */
const JK = ['Emprego (por conta de outrem)', 'Part-time', 'Freelancer / independente', 'Negócio próprio / empreendedor', 'Estágio', 'Outro'];
const PAY = ['Por hora', 'Salário fixo por mês', 'Por projeto ou serviço', 'Lucro do negócio'];
OS.S.jobs = { label: 'Trabalho', title: r => r.name || 'Trabalho', fields: [
  { k: 'name', l: 'Nome (empresa, cliente ou negócio)', t: 'text', req: 1, ph: 'Ex.: Pingo Doce, design freelance, a minha loja' }, { k: 'kind', l: 'Tipo', t: 'sel', o: JK }, { k: 'role', l: 'Função', t: 'text' },
  { k: 'pay', l: 'Como recebes', t: 'sel', o: PAY }, { k: 'hourly', l: 'Valor da tua hora', t: 'money', h: 'Quanto recebes (ou cobras) por hora' },
  { k: 'monthly', l: 'Quanto recebes por mês', t: 'money', h: 'Salário fixo, ou o que costumas ganhar por mês (freelance ou negócio)' }, { k: 'hoursWeek', l: 'Horas por semana combinadas', t: 'num' },
  { k: 'active', l: 'Ainda trabalho aqui', t: 'bool' }], defaults: () => ({ kind: JK[0], pay: 'Por hora', active: true }) };
try { const F0 = OS.S.shifts && OS.S.shifts.fields; if (F0 && !F0.some(f => f.k === 'job')) F0.splice(0, 0, { k: 'job', l: 'Trabalho', t: 'rel', c: 'jobs', none: 'O principal (do perfil)' }); } catch (e) { }
const jobsAll = () => (OS.all('jobs') || []).filter(j => j.active !== false);
const jobOf = s => s && s.job ? OS.get('jobs', s.job) : null;
const rateOf = s => { const j = jobOf(s); return U.num(s && s.rate) || (j && U.num(j.hourly)) || U.num((OS.one('profile') || {}).hourly) || 0; };
OS.on('ready', () => { const Car = OS.Car; if (!Car || Car._jobs) return; Car._jobs = 1; Car.shiftPay = s => Car.shiftHours(s) * rateOf(s); Car.workedPay = (s, now) => Car.workedHours(s, now) * rateOf(s); Car.rateOf = rateOf; });
const jobsPanel = () => { const J = jobsAll(), p = OS.one('profile') || {}, ym = U.ym(today()), now = new Date(), S = OS.all('shifts').filter(s => U.ym(s.date) === ym), Car = OS.Car;
  const hrs = L => U.sum(L, s => Car.workedHours(s, now)), pay = L => U.sum(L, s => Car.workedPay(s, now));
  const rate = `<label class="wj-rate"><span>O valor da tua hora${J.length ? ' (principal)' : ''}</span><span class="wj-in"><input class="field" type="number" inputmode="decimal" min="0" step="0.01" data-bind="profile.hourly" value="${U.num(p.hourly) || ''}" placeholder="Ex.: 6,50"><b>por hora</b></span></label>`;
  if (!J.length) return `<div class="pn wj"><div class="pn-h"><h3>${UI.ic('briefcase')}O teu trabalho</h3></div>${rate}<p class="mut" style="margin:8px 0 0;font-size:13px">Tens mais do que um trabalho, és freelancer, trabalhador independente ou tens um negócio? Junta cada um: o Prumo separa as horas, o valor da hora e quanto ganhas em cada.</p><div class="row gap8" style="margin-top:10px"><button class="btn sm" data-new="jobs">${UI.ic('plus')}Juntar um trabalho</button></div></div>`;
  const card = j => { const L = S.filter(s => s.job === j.id), h = hrs(L), fixo = j.pay && j.pay !== 'Por hora', ganho = fixo && U.num(j.monthly) ? U.num(j.monthly) : pay(L), real = h > 0 && ganho > 0 ? ganho / h : 0;
    return `<div class="wj-c" data-edit="jobs:${j.id}" role="button" tabindex="0"><div class="wj-h"><b>${esc(j.name)}</b><small>${esc([j.kind, j.role].filter(Boolean).join(' · '))}</small></div>
      <div class="wj-s"><span><b>${U.num(j.hourly) ? U.eur(j.hourly) : '—'}</b>por hora</span><span><b>${U.nf(h, 1)} h</b>este mês</span><span><b>${U.eur(ganho)}</b>${fixo && U.num(j.monthly) ? 'por mês' : 'ganho no mês'}</span></div>
      ${real && fixo ? `<p class="wj-real">A tua hora vale, na prática, <b>${U.eur(real)}</b> (o que ganhas a dividir pelas horas que registaste).</p>` : ''}</div>`; };
  const semJob = S.filter(s => !s.job || !OS.get('jobs', s.job)), tot = U.sum(J, j => { const L = S.filter(s => s.job === j.id); return (j.pay && j.pay !== 'Por hora' && U.num(j.monthly)) ? U.num(j.monthly) : pay(L); }) + pay(semJob);
  return `<div class="pn wj"><div class="pn-h"><h3>${UI.ic('briefcase')}Os teus trabalhos</h3><button class="btn xs" data-new="jobs">${UI.ic('plus')}Trabalho</button></div>
    <div class="wj-g">${J.map(card).join('')}</div>${semJob.length ? `<p class="mut" style="font-size:12.5px;margin:8px 0 0">${semJob.length} ${semJob.length === 1 ? 'turno' : 'turnos'} deste mês sem trabalho escolhido contam com o valor da hora principal.</p>` : ''}
    <div class="wj-tot"><span>Tudo junto este mês</span><b>${U.eur(tot)}</b><small>${U.nf(hrs(S), 1)} h trabalhadas</small></div>${rate}</div>`; };
// apagar os horários e folgas que enviaste (por exemplo, uma escala errada): escolhe o quê, de quando e de que trabalho
const limparBar = () => `<div class="row gap8 ws-lb"><button class="btn sm ghost" data-act="wsLimpar">${UI.ic('trash')}Apagar horários e folgas…</button></div>`;
const wsQuais = (k, per, job) => { const t = today(), m0 = t.slice(0, 7) + '-01', m1 = U.addDays(U.addMonths(t.slice(0, 7), 1) + '-01', -1), L = OS.all(k) || [];
  const ult = per === 'ultima' ? Math.max(0, ...L.filter(r => r.src === 'foto').map(r => +r.at || 0)) : 0;
  return L.filter(r => { const d = String(r.date || ''); if (job && k === 'shifts' && (r.job || '') !== (job === '_' ? '' : job)) return false;
    return per === 'ultima' ? r.src === 'foto' && ult && Math.abs((+r.at || 0) - ult) < 120000 : per === 'futuro' ? d >= t : per === 'mes' ? d >= m0 && d <= m1 : per === 'importados' ? r.src === 'foto' : true; }); };
const wsLHTML = () => { const per = OS.ui.wsLP || 'ultima', job = OS.ui.wsLJ || '', J = jobsAll(), nS = wsQuais('shifts', per, job).length, nO = wsQuais('dayoffs', per, '').length, sel = OS.ui.wsLS || { shifts: true, dayoffs: true }, tot = (sel.shifts ? nS : 0) + (sel.dayoffs ? nO : 0);
  return `<div class="row between" style="align-items:center"><h3 style="margin:0">Apagar horários e folgas</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p class="mut" style="margin:6px 0 12px">Mandaste a escala errada ou mudou tudo? Apaga aqui e importa outra vez.</p>
    <div class="seg" role="radiogroup" aria-label="Quais">${[['ultima', 'A última escala importada'], ['importados', 'Todas as importadas'], ['futuro', 'De hoje em diante'], ['mes', 'Este mês'], ['tudo', 'Tudo']].map(([k, l]) => `<button type="button" class="${per === k ? 'on' : ''}" data-act="wsLP" data-v="${k}" aria-pressed="${per === k}">${l}</button>`).join('')}</div>
    ${J.length > 1 ? `<label class="wj-lj"><span>De que trabalho</span><select class="field" data-wslj="1"><option value="">Todos</option>${J.map(j => `<option value="${esc(j.id)}" ${job === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}<option value="_" ${job === '_' ? 'selected' : ''}>Sem trabalho escolhido</option></select></label>` : ''}
    <div class="list cal-lp"><label class="li"><input type="checkbox" data-act="wsLS" data-k="shifts" ${sel.shifts ? 'checked' : ''}><div class="li-t"><b>Turnos (horários)</b></div><span class="mono">${nS}</span></label><label class="li"><input type="checkbox" data-act="wsLS" data-k="dayoffs" ${sel.dayoffs ? 'checked' : ''}><div class="li-t"><b>Folgas, férias e feriados</b></div><span class="mono">${nO}</span></label></div>
    <div class="row gap8" style="margin-top:12px"><button type="button" class="btn danger" data-act="wsLGo" ${tot ? '' : 'disabled'}>${UI.ic('trash')}Apagar ${tot}</button><button type="button" class="btn ghost" data-mclose>Cancelar</button></div>`; };
const wsLRedraw = () => { const m = document.querySelector('#modal .ws-lmod'); if (m) m.innerHTML = wsLHTML(); };
A.wsLimpar = () => { OS.ui.wsLS = { shifts: true, dayoffs: true }; UI.modal(`<div class="ws-lmod">${wsLHTML()}</div>`, 'ws-lmodal'); };
A.wsLP = b => { OS.ui.wsLP = b.dataset.v; wsLRedraw(); };
A.wsLS = b => { const s0 = OS.ui.wsLS || (OS.ui.wsLS = {}); s0[b.dataset.k] = b.checked; wsLRedraw(); };
document.addEventListener('change', e => { const el = e.target; if (el && el.matches && el.matches('#modal select[data-wslj]')) { OS.ui.wsLJ = el.value; wsLRedraw(); } });
A.wsLGo = () => { const per = OS.ui.wsLP || 'ultima', job = OS.ui.wsLJ || '', sel = OS.ui.wsLS || {}, S = sel.shifts ? wsQuais('shifts', per, job) : [], O = sel.dayoffs ? wsQuais('dayoffs', per, '') : [], tot = S.length + O.length; if (!tot) return;
  if (!confirm(`Apagar ${S.length} ${S.length === 1 ? 'turno' : 'turnos'} e ${O.length} ${O.length === 1 ? 'folga' : 'folgas'}? Não dá para desfazer.`)) return;
  S.forEach(r => OS.del('shifts', r.id)); O.forEach(r => OS.del('dayoffs', r.id)); UI.closeModal(); UI.toast(`Apagados ${S.length} turnos e ${O.length} folgas.`, 'pos'); OS.request(); };
OS.WorkSched = Object.assign(OS.WorkSched || {}, { jobsAll, rateOf, dayInfo, readXlsx, readCsv, shrink, b64, _res: r => { IM.res = r; } });
})();
