/* PRUMO — MUNDO › Lugares dentro de cada país e de cada ilha (v3.10).
   Em cada país: os estados, províncias, distritos ou regiões (Natural Earth admin-1, domínio público, com os nomes em português quando
   os há; ficheiro vendor/mundo/regioes.json, só carregado quando precisas) e as cidades, vilas, praias e outros lugares que conheceste,
   onde moraste ou que queres conhecer (sugestões de cidades pela pesquisa do Open-Meteo, a mesma do tempo).
   Cada país tem a sua página (#mundo.BRA; as ilhas em #mundo.i.madeira) com um mini-mapa; na página Mundo há um resumo.
   Cada lugar conhecido dá um pouco de XP de Mente no Dominus. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, V = OS.views, M = OS.Mundo; if (!M) return;
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const ST = ['Visitei', 'Morei', 'Quero ir'], RANK = { Morei: 3, Visitei: 2, 'Quero ir': 1 }, FILL = { Visitei: 'v', Morei: 'm', 'Quero ir': 'w' };
const KINDS = ['Cidade', 'Vila ou aldeia', 'Bairro', 'Praia', 'Natureza (parque, serra, lago)', 'Monumento ou museu', 'Ilha', 'Outro'];
const KIC = { Cidade: 'building', 'Vila ou aldeia': 'home', Bairro: 'pin', Praia: 'wave', 'Natureza (parque, serra, lago)': 'mountain', 'Monumento ou museu': 'award', Ilha: 'pin', Outro: 'pin' };
const wOpts = () => M.ALL.map(c => [c.c3, c.n]).concat((M.ISL || []).map(i => ['i:' + i.id, i.n + ' · ' + M.name(i.p)]));
OS.S.places = { label: 'Lugar', title: r => r.name || 'Lugar', fields: [
  { k: 'name', l: 'Lugar (cidade, vila, praia, parque…)', t: 'text', req: 1 }, { k: 'where', l: 'País ou ilha', t: 'sel', o: wOpts(), req: 1 },
  { k: 'kind', l: 'Tipo', t: 'sel', o: KINDS }, { k: 'status', l: 'Estado', t: 'sel', o: ST }, { k: 'reg', l: 'Estado, província ou região', t: 'text' },
  { k: 'date', l: 'Quando fui (ou quando quero ir)', t: 'date' }, { k: 'with', l: 'Com quem', t: 'text' }, { k: 'notes', l: 'Memórias e notas', t: 'area', rows: 3 }],
  defaults: () => ({ status: 'Visitei', kind: 'Cidade' }) };

/* ---------- onde (país ou ilha) ---------- */
const isI = w => String(w || '').startsWith('i:'), islOf = w => isI(w) && M.IBY ? M.IBY[w.slice(2)] : null;
const okW = w => isI(w) ? !!islOf(w) : !!M.BY[w];
const wName = w => isI(w) ? M.iname(w.slice(2)) : M.name(w);
const wFlag = w => { const i = islOf(w); return i ? (i.c2 ? M.flag2(i.c2) : M.flag(i.p)) : M.flag(w); };
const c2Of = w => { const i = islOf(w); if (isI(w)) return i && i.c2 ? i.c2.toUpperCase() : ''; const c = M.BY[w]; return c && c.c2 ? c.c2.toUpperCase() : ''; };
const href = w => '#mundo.' + (isI(w) ? 'i.' + w.slice(2) : w);
const recs = w => OS.all('places').filter(r => r.where === w && r.name);
// o teu estado em cada lugar (se houver registos repetidos, conta o mais forte: morei > visitei > quero ir)
const kOf = r => (r.sub ? 's|' : 'c|') + N(r.name), kS = n => 's|' + N(n), kC = n => 'c|' + N(n);
const pmine = w => { const m = {}; recs(w).forEach(r => { const k = kOf(r), o = m[k]; if (!o || (RANK[r.status] || 0) > (RANK[o.status] || 0)) m[k] = r; }); return m; };
const pall = () => { const m = {}; OS.all('places').forEach(r => { if (!r.name || !okW(r.where)) return; const k = r.where + '|' + kOf(r), o = m[k]; if (!o || (RANK[r.status] || 0) > (RANK[o.status] || 0)) m[k] = r; }); return Object.values(m); };

/* ---------- estados, províncias e regiões (carregados uma vez) ---------- */
let REG = null, REGP = null;
const regLoad = () => REG ? Promise.resolve(REG) : REGP || (REGP = fetch(new URL('vendor/mundo/regioes.json', document.baseURI)).then(r => r.ok ? r.json() : {})
  .then(j => { REG = j && typeof j === 'object' ? j : {}; if (OS.request) OS.request(); return REG; }).catch(() => { REGP = null; return {}; }));
const subsOf = w => { if (!REG) return null; const d = REG[c2Of(w)]; return d && d.s ? d : { t: [], r: [], s: [] }; };
const PTW = new Set(['Estado', 'Província', 'Distrito', 'Região', 'Departamento', 'Cantão', 'Prefeitura', 'Metrópole', 'Condado', 'Município', 'Comunidade', 'Cidade', 'Distrito', 'República', 'Território',
  'Paróquia', 'Governorado', 'Emirado', 'Voivodia', 'Ilha', 'Ilhas', 'Capital', 'Divisão', 'Zona', 'Comuna', 'Área', 'Dependência', 'Unidade', 'Periferia', 'Oblast', 'Krai', 'Okrug', 'Autoridade']);
const plural = t => { const w = String(t || '').split(' ')[0]; if (!PTW.has(w)) return 'Regiões'; return /ão$/.test(w) ? w.replace(/ão$/, 'ões') : /l$/.test(w) ? w.replace(/l$/, 'is') : /s$/.test(w) ? w : /[aeiouáéíóú]$/i.test(w) ? w + 's' : w + 'es'; };
const one = t => { const w = String(t || '').split(' ')[0]; return PTW.has(w) ? t : 'Região'; };
const LBL = { ES: 'Províncias', IT: 'Províncias', GB: 'Condados e cidades', PT: 'Distritos e regiões autónomas', FR: 'Departamentos', BR: 'Estados', US: 'Estados' };
const subLabel = (w, d) => { const c2 = c2Of(w); if (LBL[c2]) return LBL[c2]; if (!d || !d.s.length) return 'Regiões'; const cnt = {}; d.s.forEach(s => { cnt[s[1]] = (cnt[s[1]] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; return top && top[1] / d.s.length >= .6 ? plural(d.t[top[0]]) : 'Regiões'; };
const subFind = (w, n) => { const d = subsOf(w); if (!d) return null; const k = N(n); return d.s.find(s => N(s[0]) === k) || null; };
const subInfo = (w, s) => { const d = subsOf(w); return { kind: one(d.t[s[1]]), sub: 1, lat: s[3], lng: s[4], reg: s[2] >= 0 ? d.r[s[2]] : '' }; };

/* ---------- ações ---------- */
const X = () => M.xp && M.xp();
const setPl = (w, n, v, extra = {}, quiet) => { const key = (extra.sub ? 's|' : 'c|') + N(n), L = recs(w).filter(x => kOf(x) === key), was = L.some(x => M.been(x)), x = X(), x0 = x && v !== 'Quero ir' && !was ? x.mente() : null;
  if (L.length) { OS.upd('places', L[0].id, Object.assign({ status: v }, extra)); L.slice(1).forEach(r => OS.del('places', r.id)); } else OS.add('places', Object.assign({ where: w, name: n, status: v, kind: 'Cidade' }, extra));
  if (!quiet) UI.toast(v === 'Quero ir' ? `${n} está nos lugares que queres conhecer` : was ? `${n}: ${v.toLowerCase()}` : `${wFlag(w)} ${n} no teu mapa de ${wName(w)}!${x ? x.xpTxt(x0, x0 == null ? null : x.mente()) : ''}`, 'pos'); };
const clearPl = (w, n, sub) => { const key = (sub ? 's|' : 'c|') + N(n); recs(w).filter(x => kOf(x) === key).forEach(r => OS.del('places', r.id)); };
// ✓ e ♥: liga e desliga (como nos países)
A.plT = b => { const w = b.dataset.w, n = b.dataset.n, v = b.dataset.v, sb = b.dataset.s === '1'; if (!okW(w) || !n) return; const r = pmine(w)[(sb ? 's|' : 'c|') + N(n)];
  if (r && (r.status === v || (v === 'Visitei' && r.status === 'Morei'))) return clearPl(w, n, sb);
  const s = sb ? subFind(w, n) : null; setPl(w, n, v, s ? subInfo(w, s) : sb ? { sub: 1 } : {}); };
// um estado no mini-mapa: escolher o estado
A.plSub = b => { const w = b.dataset.w, n = b.dataset.n; if (!okW(w)) return; const r = pmine(w)[kS(n)], s = subFind(w, n), d = subsOf(w);
  UI.modal(`<div class="mu-md"><div class="mu-mh"><span class="mu-fl">${wFlag(w)}</span><div><h3>${esc(n)}</h3><small class="mut">${esc(s && d ? one(d.t[s[1]]) : 'Lugar')} · ${esc(wName(w))}${s && d && s[2] >= 0 ? ' · ' + esc(d.r[s[2]]) : ''}</small></div><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <div class="mu-mst">${ST.map(v => `<button class="btn ${r && r.status === v ? 'pri' : 'ghost'}" data-act="plSet" data-w="${w}" data-n="${esc(n)}" data-v="${v}">${UI.ic(v === 'Visitei' ? 'check' : v === 'Morei' ? 'home' : 'heart')}<span>${v === 'Quero ir' ? 'Quero conhecer' : v}</span></button>`).join('')}</div>
    ${r ? `<div class="row gap8"><button class="btn sm" data-act="plEdit" data-id="${r.id}">${UI.ic('edit')}<span>Data e memórias</span></button><button class="btn sm ghost" data-act="plClear" data-w="${w}" data-n="${esc(n)}" data-s="1">Tirar</button></div>` : '<p class="mut">Marca se já foste, se moraste lá ou se queres conhecer.</p>'}</div>`, 'mu-modal'); };
A.plSet = b => { const w = b.dataset.w, n = b.dataset.n, s = subFind(w, n); setPl(w, n, b.dataset.v, s ? subInfo(w, s) : { sub: 1 }); UI.closeModal(); };
A.plClear = b => { clearPl(b.dataset.w, b.dataset.n, b.dataset.s === '1'); UI.closeModal(); };
A.plEdit = b => { UI.closeModal(); UI.openForm('places', b.dataset.id); };
A.plDel = b => { const r = OS.get('places', b.dataset.id); if (r) OS.del('places', r.id); };
A.plGo = b => { UI.closeModal(); location.hash = href(b.dataset.w).slice(1); };
A.plF = b => OS.setUI('plF', b.dataset.v);
A.plKF = b => OS.setUI('plKF', b.dataset.v);
// acrescentar uma cidade (ou outro lugar); com a sugestão escolhida vêm as coordenadas e o estado, e o estado fica marcado também
const addFrom = (w, v) => { const inp = document.getElementById('plN'), k = document.getElementById('plK'); if (!inp) return; const n = inp.value.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!n) { UI.toast('Escreve o nome do lugar', 'warn'); inp.focus(); return; } if (!okW(w)) return;
  const ex = { kind: (k && k.value) || 'Cidade' }, pk = inp.dataset.pick === N(n); if (pk) { ex.lat = +inp.dataset.la; ex.lng = +inp.dataset.lo; if (inp.dataset.r) ex.reg = inp.dataset.r; }
  setPl(w, n, v, ex, true); let also = '';
  if (v !== 'Quero ir' && ex.reg) { const s = subFind(w, ex.reg), r = s ? pmine(w)[kS(s[0])] : null; if (s && !M.been(r)) { setPl(w, s[0], 'Visitei', subInfo(w, s), true); also = ` (e ${s[0]} também)`; } }
  UI.toast(v === 'Quero ir' ? `${n} está nos lugares que queres conhecer` : `${wFlag(w)} ${n} no teu mapa${also}`, 'pos');
  inp.value = ''; delete inp.dataset.pick; const sg = document.getElementById('plSug'); if (sg) sg.innerHTML = ''; };
A.plAdd = b => addFrom(b.dataset.w, b.dataset.v || 'Visitei');
OS.forms.plAdd = f => { addFrom(f.dataset.w, 'Visitei'); return false; };
A.plPick = b => { const inp = document.getElementById('plN'); if (!inp) return; inp.value = b.dataset.n; inp.dataset.pick = N(b.dataset.n); inp.dataset.la = b.dataset.la; inp.dataset.lo = b.dataset.lo; inp.dataset.r = b.dataset.r || '';
  const sg = document.getElementById('plSug'); if (sg) sg.innerHTML = `<small class="mut">${UI.ic('pin')}${esc(b.dataset.n)}${b.dataset.r ? ' · ' + esc(b.dataset.r) : ''}: escolhe se já conheces ou se queres conhecer.</small>`; };
// sugestões de cidades enquanto escreves (Open-Meteo, só cidades e vilas do país)
let SGT = 0, SGN = 0;
document.addEventListener('input', e => { const el = e.target; if (!el || el.id !== 'plN') return; delete el.dataset.pick; clearTimeout(SGT); const q = el.value.trim(), cc = el.dataset.cc, sg = document.getElementById('plSug');
  if (q.length < 3 || !cc) { if (sg) sg.innerHTML = ''; return; }
  SGT = setTimeout(async () => { const my = ++SGN; try { const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=' + (OS.Lang ? OS.Lang.base() : 'pt') + '&countryCode=' + cc + '&name=' + encodeURIComponent(q)); const j = r.ok ? await r.json() : {};
    if (my !== SGN) return; const L = (j.results || []).filter(x => String(x.country_code || '').toUpperCase() === cc).slice(0, 6), box = document.getElementById('plSug'); if (!box) return;
    box.innerHTML = L.map(x => `<button type="button" data-act="plPick" data-n="${esc(x.name)}" data-la="${(+x.latitude).toFixed(3)}" data-lo="${(+x.longitude).toFixed(3)}" data-r="${esc(x.admin1 || '')}">${UI.ic('pin')}<b>${esc(x.name)}</b><small>${esc([x.admin2, x.admin1].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · '))}</small></button>`).join(''); } catch (err) { } }, 350); });

/* ---------- o mini-mapa do país ---------- */
// a mesma projeção do mapa (Natural Earth)
const proj = (lng, lat) => { const l = lng * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))), y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
  return [500 + 182.89 * x, 259.7 - 182.6 * y]; };
// a caixa do maior pedaço do país (a França sem a Guiana, os EUA sem o Alasca e o Havai…)
const BOXC = {};
const mainBox = d => { if (BOXC[d.length + d.slice(0, 40)]) return BOXC[d.length + d.slice(0, 40)]; const T = d.match(/[MmLlHhVvZz]|-?\d+(?:\.\d+)?/g) || []; let cmd = 'M', x = 0, y = 0, sx = 0, sy = 0, cur = null, best = null; const subs = [];
  const pt = () => { if (!cur) { cur = [x, y, x, y]; subs.push(cur); } cur[0] = Math.min(cur[0], x); cur[1] = Math.min(cur[1], y); cur[2] = Math.max(cur[2], x); cur[3] = Math.max(cur[3], y); };
  for (let i = 0; i < T.length;) { const t = T[i]; if (/[A-Za-z]/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') { x = sx; y = sy; cur = null; } continue; }
    if (cmd === 'M' || cmd === 'm') { const a = +T[i], b = +T[i + 1]; i += 2; if (cmd === 'm') { x += a; y += b; } else { x = a; y = b; } sx = x; sy = y; cur = null; pt(); cmd = cmd === 'm' ? 'l' : 'L'; continue; }
    if (cmd === 'L') { x = +T[i]; y = +T[i + 1]; i += 2; } else if (cmd === 'l') { x += +T[i]; y += +T[i + 1]; i += 2; } else if (cmd === 'H') { x = +T[i++]; } else if (cmd === 'h') { x += +T[i++]; } else if (cmd === 'V') { y = +T[i++]; } else if (cmd === 'v') { y += +T[i++]; } else { i++; continue; } pt(); }
  subs.forEach(s => { if (!best || (s[2] - s[0]) * (s[3] - s[1]) > (best[2] - best[0]) * (best[3] - best[1])) best = s; });
  return (BOXC[d.length + d.slice(0, 40)] = best ? [best[0], best[1], best[2] - best[0], best[3] - best[1]] : null); };
const boxOf = w => { const i = islOf(w), c = M.BY[w]; let b = c && c.d ? mainBox(c.d) : null; const p = i ? [i.x, i.y] : c ? [c.x, c.y] : [500, 220];
  if (!b) b = [p[0] - 7, p[1] - 5, 14, 10]; let [x, y, wd, ht] = b; wd = Math.max(wd, 8); ht = Math.max(ht, 6); x = b[0] + (b[2] - wd) / 2; y = b[1] + (b[3] - ht) / 2;
  const px = wd * .14, py = ht * .14; x -= px; y -= py; wd += px * 2; ht += py * 2; if (wd / ht < 1.25) { const nw = ht * 1.25; x -= (nw - wd) / 2; wd = nw; } return [x, y, wd, ht]; };
const ALLD = M.ALL.filter(c => c.d);
const miniMap = (w, d, m) => { const bx = boxOf(w), k = bx[2] / 100, r = Math.max(.35, k * 1.25), sel = M.BY[w];
  const inB = (x, y) => x >= bx[0] && x <= bx[0] + bx[2] && y >= bx[1] && y <= bx[1] + bx[3];
  const subs = d ? d.s.map(s => { const [x, y] = proj(s[4], s[3]); return { s, x, y }; }).filter(o => inB(o.x, o.y)) : [];
  const own = Object.values(m).filter(p => !p.sub && p.lat != null && p.lng != null && !isNaN(+p.lat)).map(p => { const [x, y] = proj(+p.lng, +p.lat); return { p, x, y }; }).filter(o => inB(o.x, o.y));
  const isl = islOf(w);
  return `<svg class="pl-svg" viewBox="${bx.map(v => v.toFixed(2)).join(' ')}" role="img" aria-label="Mapa de ${esc(wName(w))} com os lugares que conheces">
    <rect x="${(bx[0] - bx[2] * 3).toFixed(2)}" y="${(bx[1] - bx[3] * 3).toFixed(2)}" width="${(bx[2] * 7).toFixed(2)}" height="${(bx[3] * 7).toFixed(2)}" class="plm-sea"/>
    <g class="plm-land" style="stroke-width:${(k * .25).toFixed(3)}">${ALLD.map(c => `<path d="${c.d}" class="${sel && c.c3 === sel.c3 ? 'me' : ''}"/>`).join('')}</g>
    ${isl ? `<path class="plm-isl" d="M${isl.x} ${(isl.y - r * 2.2).toFixed(2)}l${(r * 2.2).toFixed(2)} ${(r * 2.2).toFixed(2)}-${(r * 2.2).toFixed(2)} ${(r * 2.2).toFixed(2)}-${(r * 2.2).toFixed(2)}-${(r * 2.2).toFixed(2)}z"/>` : ''}
    <g class="plm-subs" style="stroke-width:${(k * .2).toFixed(3)}">${subs.map(({ s, x, y }) => { const q = m[kS(s[0])]; return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" class="${q ? FILL[q.status] || '' : ''}" data-act="plSub" data-w="${w}" data-n="${esc(s[0])}"><title>${esc(s[0])}</title></circle>`; }).join('')}</g>
    <g class="plm-own" style="stroke-width:${(k * .2).toFixed(3)}">${own.map(({ p, x, y }) => { const s = r * 1.15; return `<path d="M${x.toFixed(2)} ${(y - s).toFixed(2)}l${s.toFixed(2)} ${s.toFixed(2)}-${s.toFixed(2)} ${s.toFixed(2)}-${s.toFixed(2)}-${s.toFixed(2)}z" class="${FILL[p.status] || ''}" data-edit="places:${p.id}"><title>${esc(p.name)}</title></path>`; }).join('')}</g></svg>`; };

/* ---------- a página de cada país ou ilha ---------- */
const stOf = r => r ? r.status : '';
const pageOf = w => { regLoad(); const i = islOf(w), c = M.BY[w], d = subsOf(w), m = pmine(w), all = Object.values(m), subs = d ? d.s : [];
  const own = all.filter(p => !p.sub), rv = isI(w) ? (M.imine ? M.imine()[w.slice(2)] : null) : M.mine()[w];
  const sv = subs.filter(s => M.been(m[kS(s[0])])).length, sw = subs.filter(s => stOf(m[kS(s[0])]) === 'Quero ir').length, ov = own.filter(p => M.been(p)).length, ow = own.filter(p => p.status === 'Quero ir').length;
  const lbl = subLabel(w, d), f = OS.ui.plF || 'todos', q = N((OS.ui.pl || {}).q || '');
  const tile = s => { const r = m[kS(s[0])], b = M.been(r), wq = stOf(r) === 'Quero ir';
    return `<div class="pl-st ${b ? 'on' : ''} ${wq ? 'wq' : ''} ${r && r.status === 'Morei' ? 'mo' : ''}"><button class="pl-stn" data-act="plSub" data-w="${w}" data-n="${esc(s[0])}"><b>${esc(s[0])}</b>${r ? `<small class="mu-tag ${FILL[r.status]}">${r.status === 'Quero ir' ? 'Quero conhecer' : esc(r.status)}</small>` : ''}</button>
      <button class="mu-tg ${b ? 'on' : ''}" data-act="plT" data-w="${w}" data-n="${esc(s[0])}" data-s="1" data-v="Visitei" aria-label="${b ? 'Tirar' : 'Marcar'} ${esc(s[0])} como conhecido" aria-pressed="${b}">${UI.ic('check')}</button>
      <button class="mu-tg w ${wq ? 'on' : ''}" data-act="plT" data-w="${w}" data-n="${esc(s[0])}" data-s="1" data-v="Quero ir" aria-label="${wq ? 'Tirar' : 'Pôr'} ${esc(s[0])} ${wq ? 'dos' : 'nos'} lugares que queres conhecer" aria-pressed="${wq}">${UI.ic('heart')}</button></div>`; };
  const showS = subs.filter(s => (!q || N(s[0]).includes(q)) && (f === 'todos' || (f === 'conheci' ? M.been(m[kS(s[0])]) : f === 'quero' ? stOf(m[kS(s[0])]) === 'Quero ir' : !m[kS(s[0])])));
  const grouped = d && d.r.length > 1 && subs.length > 24;
  const subsHtml = !d ? `<p class="mut">A carregar ${isI(w) ? 'as regiões' : 'os estados e províncias'}…</p>` : !subs.length ? '' : grouped
    ? d.r.map((rn, ri) => { const L = showS.filter(s => s[2] === ri); if (!L.length) return ''; const all2 = subs.filter(s => s[2] === ri); return `<div class="pl-grp"><h4>${esc(rn)} <small class="mono">${all2.filter(s => M.been(m[kS(s[0])])).length}/${all2.length}</small></h4><div class="pl-sts">${L.map(tile).join('')}</div></div>`; }).join('') + (showS.some(s => s[2] < 0) ? `<div class="pl-sts">${showS.filter(s => s[2] < 0).map(tile).join('')}</div>` : '')
    : `<div class="pl-sts">${showS.map(tile).join('')}</div>`;
  const card = p => `<div class="pl-pc ${FILL[p.status] || ''}"><span class="pl-pci">${UI.ic(KIC[p.kind] || 'pin')}</span><button class="pl-pcn" data-edit="places:${p.id}"><b>${esc(p.name)}</b><small>${esc([p.kind && p.kind !== 'Cidade' ? p.kind.replace(/ \(.*\)$/, '') : '', p.reg, p.date ? U.fmtD(p.date) : ''].filter(Boolean).join(' · ') || (p.status === 'Quero ir' ? 'quero conhecer' : 'toca para pôr a data e as memórias'))}</small></button>
    <button class="mu-tg ${M.been(p) ? 'on' : ''}" data-act="plT" data-w="${w}" data-n="${esc(p.name)}" data-v="Visitei" aria-label="${M.been(p) ? 'Tirar' : 'Marcar'} ${esc(p.name)} como conhecido" aria-pressed="${M.been(p)}">${UI.ic('check')}</button><button class="mu-tg w ${p.status === 'Quero ir' ? 'on' : ''}" data-act="plT" data-w="${w}" data-n="${esc(p.name)}" data-v="Quero ir" aria-label="${p.status === 'Quero ir' ? 'Tirar' : 'Pôr'} ${esc(p.name)} ${p.status === 'Quero ir' ? 'dos' : 'nos'} lugares que queres conhecer" aria-pressed="${p.status === 'Quero ir'}">${UI.ic('heart')}</button></div>`;
  const ownV = U.sortBy(own.filter(p => M.been(p)), p => p.date || '9999').reverse(), ownW = own.filter(p => p.status === 'Quero ir');
  const cc = c2Of(w) || (i ? (M.BY[i.p] || {}).c2 || '' : '').toUpperCase();
  return `<div class="mu mu-cp">
  <a class="pl-back" href="#mundo">${UI.ic('left')}Mundo</a>
  <section class="pn pl-hd"><span class="pl-fl">${wFlag(w)}</span><div class="pl-ht"><div class="eyebrow">${i ? esc(i.t) + ' · ' + esc(M.name(i.p)) : esc(M.CONT[c.ct])}</div><h2>${esc(wName(w))}</h2>
      <p class="mut"><b class="mono">${sv + ov}</b> ${sv + ov === 1 ? 'lugar que conheces' : 'lugares que conheces'}${subs.length ? ` · <b class="mono">${sv}</b> de <b class="mono">${subs.length}</b> ${esc(lbl.toLowerCase())}` : ''} · <b class="mono">${sw + ow}</b> por conhecer</p>
      <div class="mu-mst">${ST.map(v => `<button class="btn sm ${rv && rv.status === v ? 'pri' : 'ghost'}" data-act="${i ? 'muSetI' : 'muSet'}" ${i ? `data-i="${i.id}"` : `data-c="${c.c3}"`} data-v="${v}">${UI.ic(v === 'Visitei' ? 'check' : v === 'Morei' ? 'home' : 'heart')}<span>${v}</span></button>`).join('')}<button class="btn sm ghost" data-act="${i ? 'muPickI' : 'muPick'}" ${i ? `data-i="${i.id}"` : `data-c="${c.c3}"`}>${UI.ic('edit')}<span>${i ? 'Data e memórias' : 'Documentos e memórias'}</span></button></div></div>
    ${subs.length ? `<div class="pl-ring" style="--p:${(sv / subs.length).toFixed(3)}"><b class="mono">${Math.round(sv / subs.length * 100)}%</b><small>${esc(lbl.toLowerCase())}</small></div>` : ''}</section>
  <section class="pn pl-mapw"><div class="mu-map pl-map">${miniMap(w, d, m)}</div><div class="mu-leg"><span><i class="v"></i>Conheço</span><span><i class="m"></i>Morei</span><span><i class="w"></i>Quero conhecer</span><span><i></i>Por conhecer</span><span class="mut">${subs.length ? `Cada ponto é ${/^(Regiões|Condados)/.test(lbl) ? 'uma região' : 'um ' + esc(one(d.t[0] || 'Região').toLowerCase())}; os losangos são as tuas cidades e lugares.` : 'Os losangos são as tuas cidades e lugares.'}</span></div></section>
  <section class="pn pl-add"><div class="pn-h"><h3>${UI.ic('plus')}Acrescentar uma cidade ou um lugar</h3></div>
    <form data-form="plAdd" data-w="${w}" class="pl-addf" autocomplete="off"><input class="field" id="plN" name="n" data-cc="${esc(cc)}" placeholder="Ex.: ${esc(EXN[cc] || 'a cidade, a vila, a praia ou o parque')}" maxlength="80" aria-label="Nome do lugar"><select class="field" id="plK" aria-label="Tipo de lugar">${KINDS.map(k => `<option>${esc(k)}</option>`).join('')}</select></form>
    <div class="pl-sug" id="plSug"></div>
    <div class="row gap8 pl-addb"><button type="button" class="btn pri" data-act="plAdd" data-w="${w}" data-v="Visitei">${UI.ic('check')}<span>Já conheço</span></button><button type="button" class="btn" data-act="plAdd" data-w="${w}" data-v="Morei">${UI.ic('home')}<span>Morei</span></button><button type="button" class="btn" data-act="plAdd" data-w="${w}" data-v="Quero ir">${UI.ic('heart')}<span>Quero conhecer</span></button></div></section>
  <section class="pl-two"><div class="pn"><div class="pn-h"><h3>${UI.ic('check')}Cidades e lugares que conheces</h3><span class="mut">${ownV.length}</span></div>${ownV.length ? `<div class="pl-pcs">${ownV.map(card).join('')}</div>` : '<p class="mut">Ainda nenhum. Escreve o nome em cima: aparecem sugestões das cidades e vilas deste país.</p>'}</div>
    <div class="pn"><div class="pn-h"><h3>${UI.ic('heart')}Quero conhecer</h3><span class="mut">${ownW.length}</span></div>${ownW.length ? `<div class="pl-pcs">${ownW.map(card).join('')}</div>` : '<p class="mut">Os sítios deste país que queres conhecer ficam aqui.</p>'}</div></section>
  ${d && subs.length ? `<section class="pn"><div class="pn-h"><h3>${UI.ic('map')}${esc(lbl)}</h3><span class="mut"><b class="mono">${sv}</b>/${subs.length} conhecidos${sw ? ` · ${sw} por conhecer` : ''}</span></div>
    <div class="row gap8 mu-fs">${[['todos', 'Todos'], ['falta', 'Por conhecer'], ['conheci', 'Conheço'], ['quero', 'Quero conhecer']].map(([k, l]) => UI.chip(l, 'plF', f === k, `data-v="${k}"`)).join('')}</div>
    ${subs.length > 12 ? `<input class="field mu-q" type="search" placeholder="Procurar em ${esc(lbl.toLowerCase())}…" value="${esc((OS.ui.pl || {}).q || '')}" data-uif="pl.q" aria-label="Procurar">` : ''}
    ${subsHtml || '<p class="mut">Nada encontrado.</p>'}</section>` : d ? '' : `<section class="pn"><p class="mut">A carregar os estados e províncias…</p></section>`}
  <p class="mut mu-src">Estados, províncias e regiões: Natural Earth (domínio público). Sugestões de cidades: Open-Meteo.</p></div>`; };
const EXN = { PT: 'Aveiro, Sintra, Costa Nova', BR: 'Rio de Janeiro, Gramado, Jericoacoara', ES: 'Sevilha, Barcelona, Santiago de Compostela', FR: 'Paris, Nice, Mont-Saint-Michel', IT: 'Roma, Florença, Costa Amalfitana', US: 'Nova Iorque, Miami, Grand Canyon', GB: 'Londres, Edimburgo, Oxford' };

/* ---------- na página Mundo: o resumo, o botão em cada país e a contagem na lista ---------- */
const sumOf = w => { const m = pmine(w), all = Object.values(m), d = subsOf(w), subs = all.filter(p => p.sub);
  return { v: all.filter(p => M.been(p)).length, w: all.filter(p => p.status === 'Quero ir').length, sv: subs.filter(p => M.been(p)).length, st: d ? d.s.length : 0, cv: all.filter(p => M.been(p) && !p.sub).length }; };
M.plBtn = w => { const s = sumOf(w); return `<button class="btn sm pl-gob" data-act="plGo" data-w="${w}">${UI.ic('map')}<span>Cidades, estados e lugares${s.v || s.w ? ` (${s.v} conheço${s.w ? ' · ' + s.w + ' quero' : ''})` : ''}</span></button>`; };
M.plCount = w => recs(w).length;
Object.assign(M, { pall, pmine, regLoad });
const section = () => { const ws = [...new Set(pall().map(r => r.where))], S = M.stats(), IS = M.istats ? M.istats() : { v: [] };
  // os países e ilhas onde já foste (mesmo sem lugares marcados) e os que têm lugares
  const list = [...new Set(ws.concat(S.v.map(c => c.c3)).concat(IS.v.map(i => 'i:' + i.id)))].filter(okW), all = pall(), tv = all.filter(p => M.been(p)).length, tw = all.filter(p => p.status === 'Quero ir').length;
  if (!list.length) return ''; if (!REG) regLoad();
  const rows = U.sortBy(list.map(w => ({ w, s: sumOf(w) })), x => -(x.s.v * 10 + x.s.w));
  return `<section class="pn pl-sum" id="lugares"><div class="pn-h"><h3>${UI.ic('pin')}Cidades, estados e lugares</h3><span class="mut"><b class="mono">${tv}</b> conhecidos · <b class="mono">${tw}</b> por conhecer</span></div>
    <p class="mut" style="margin:0 0 10px">Dentro de cada país e ilha: os estados, províncias e regiões e as cidades e lugares que conheces ou queres conhecer. Toca num país para o abrir.</p>
    <div class="pl-cts">${rows.map(({ w, s }) => `<a class="pl-ct" href="${href(w)}"><span class="pl-fl2">${wFlag(w)}</span><b>${esc(wName(w))}</b><small>${s.st ? `<span class="mono">${s.sv}/${s.st}</span> ${esc(subLabel(w, subsOf(w)).toLowerCase())}` : ''}${s.st && s.cv ? ' · ' : ''}${s.cv ? `<span class="mono">${s.cv}</span> ${s.cv === 1 ? 'cidade ou lugar' : 'cidades e lugares'}` : ''}${!s.st && !s.cv ? (s.w ? `${s.w} por conhecer` : 'marca os lugares') : ''}</small>${s.st ? UI.bar(s.sv / s.st) : ''}</a>`).join('')}</div></section>`; };
const _v = V.mundo;
V.mundo = sub => { const s = String(sub || ''); if (s && M.BY[s]) return pageOf(s); if (s.startsWith('i.') && M.IBY && M.IBY[s.slice(2)]) return pageOf('i:' + s.slice(2));
  let h = _v(sub); const all = pall(), tv = all.filter(p => M.been(p)).length;
  if (tv) h = h.replace(/(<b class="mono">\d+<\/b> de 6 continentes)/, `$1 · <b class="mono">${tv}</b> ${tv === 1 ? 'lugar' : 'lugares'}`);
  const sec = section(), k = h.indexOf('<section class="pn mu-isls"');
  if (!sec) return h; if (k > 0) return h.slice(0, k) + sec + h.slice(k); const j = h.lastIndexOf('<p class="mut mu-src">'); return j > 0 ? h.slice(0, j) + sec + h.slice(j) : h + sec; };
})();
