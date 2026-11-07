/* PRUMO — Troféus e medalhas (Eu › Quem sou eu › Troféus), para todas as contas.
   A vitrine das conquistas reais: troféus, medalhas, placas, certificados e distinções, com a data, o evento, a história e uma foto.
   Cada peça é desenhada (SVG) no metal que ganhaste; a peça de honra fica em destaque, com o quadro de medalhas e a linha do tempo.
   Também há a prateleira das medalhas ganhas no Prumo (as conquistas do Dominus). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act;
const TIPOS = ['Troféu', 'Medalha', 'Placa', 'Certificado', 'Distinção'];
const NIV = ['Ouro', 'Prata', 'Bronze', 'Mérito', 'Participação'];
const CAT = ['Desporto', 'Estudos', 'Trabalho', 'Competição', 'Arte e cultura', 'Voluntariado', 'Pessoal', 'Outro'];
OS.S.trophies = { label: 'Troféu ou medalha', title: r => r.title || 'Conquista', fields: [
  { k: 'title', l: 'O que ganhaste', t: 'text', req: 1, ph: 'Ex.: 1.º lugar no torneio de futsal da faculdade' },
  { k: 'kind', l: 'Tipo', t: 'sel', o: TIPOS }, { k: 'level', l: 'Metal ou nível', t: 'sel', o: NIV },
  { k: 'place', l: 'Lugar (1, 2, 3…), se houve classificação', t: 'num' }, { k: 'cat', l: 'Área', t: 'sel', o: CAT },
  { k: 'date', l: 'Quando', t: 'date' }, { k: 'event', l: 'Evento, prova ou organização', t: 'text', ph: 'Ex.: Liga Universitária de Aveiro 2026' },
  { k: 'story', l: 'A história: o que custou, quem estava lá, o que sentiste', t: 'area', rows: 4 },
  { k: 'fav', l: 'Peça de honra (fica em destaque na vitrine)', t: 'bool' }],
  defaults: () => ({ kind: 'Medalha', level: 'Ouro', cat: 'Desporto', date: U.today() }) };

/* ---------- metais (cores com significado: não mudam com a paleta) ---------- */
const MET = { Ouro: ['#FFF1BF', '#E7B84A', '#8F6210'], Prata: ['#FBFCFD', '#C6CDD5', '#6F7984'], Bronze: ['#FBD2B0', '#C77F4A', '#6E3B18'],
  Mérito: ['#EFE4FF', '#A98BF2', '#4E36A0'], Participação: ['#E1ECF5', '#93AECB', '#3E5873'], Platina: ['#F1FBFA', '#A9DCD6', '#3F7F7A'], Diamante: ['#F3F8FF', '#AFCBF4', '#3D5F9E'] };
const RIB = { Desporto: ['#1F4E8C', '#F5F1E8'], Estudos: ['#7A1F2B', '#E8C77A'], Trabalho: ['#2F3E4E', '#C9D3DC'], Competição: ['#8C1D18', '#F5F1E8'], 'Arte e cultura': ['#4A2A6B', '#E9D6A0'],
  Voluntariado: ['#2E6B4A', '#F5F1E8'], Pessoal: ['#6B4A2E', '#E8C77A'], Outro: ['#3A3F47', '#E3E6EA'] };
let uid = 0;
const grad = (id, m) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="${m[0]}"/><stop offset=".38" stop-color="${m[1]}"/><stop offset=".72" stop-color="${m[2]}"/><stop offset="1" stop-color="${m[1]}"/></linearGradient>`;
const num = (x, y, n, sz, col) => n ? `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${sz}" fill="${col}" opacity=".8">${n}</text>` : '';
const star = (cx, cy, r, col) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1)); } return `<polygon points="${p.join(' ')}" fill="${col}"/>`; };
// cada peça num quadro 100×120
const ART = {
  'Troféu': (m, g, r) => `<path d="M30 13h40v20c0 18-9 29-20 31-11-2-20-13-20-31z" fill="url(#${g})"/><path d="M30 19c-15 0-15 24 2 25M70 19c15 0 15 24-2 25" fill="none" stroke="url(#${g})" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="13" rx="20" ry="3.6" fill="${m[2]}"/><path d="M45 64h10l-2 15h-6z" fill="url(#${g})"/><ellipse cx="50" cy="80" rx="9" ry="3" fill="${m[1]}"/>
    <rect x="31" y="83" width="38" height="10" rx="2" fill="#4A3424"/><rect x="25" y="93" width="50" height="15" rx="2.5" fill="#2E2017"/><rect x="36" y="97.5" width="28" height="6" rx="1" fill="url(#${g})"/>
    ${r.place ? num(50, 47, r.place, 20, m[2]) : star(50, 38, 9, m[2])}<path d="M35 18c2 14 5 24 11 30" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  Medalha: (m, g, r, rb) => `<path d="M33 0h15l9 46-12 5z" fill="${rb[0]}"/><path d="M67 0H52l-9 46 12 5z" fill="${rb[0]}"/><path d="M39 0h4l8 47-3 1zM61 0h-4l-8 47 3 1z" fill="${rb[1]}" opacity=".9"/>
    <circle cx="50" cy="80" r="27" fill="url(#${g})"/><circle cx="50" cy="80" r="21" fill="none" stroke="${m[2]}" stroke-opacity=".5" stroke-width="1.6"/>
    <path d="M33 87c-3-8-1-17 6-22M67 87c3-8 1-17-6-22" fill="none" stroke="${m[2]}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 2.4" stroke-linecap="round"/>
    ${r.place ? num(50, 89, r.place, 24, m[2]) : star(50, 80, 10, m[2])}<path d="M33 70a20 20 0 0 1 14-11" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  Placa: (m, g) => `<path d="M20 12h60v54c0 22-30 40-30 40S20 88 20 66z" fill="#5A3D26"/><path d="M25 17h50v48c0 18-25 34-25 34S25 83 25 65z" fill="#3D2A1B"/>
    <rect x="33" y="36" width="34" height="24" rx="2" fill="url(#${g})"/><rect x="37" y="42" width="26" height="2.4" rx="1" fill="${m[2]}" opacity=".6"/><rect x="40" y="48" width="20" height="2.4" rx="1" fill="${m[2]}" opacity=".45"/><rect x="42" y="53.5" width="16" height="2.4" rx="1" fill="${m[2]}" opacity=".35"/>
    ${star(50, 26, 6, m[1])}`,
  Certificado: (m, g) => `<rect x="12" y="16" width="76" height="70" rx="3" fill="#F3EAD7"/><rect x="17" y="21" width="66" height="60" rx="2" fill="none" stroke="${m[1]}" stroke-width="1.6"/>
    <rect x="28" y="31" width="44" height="3.4" rx="1.5" fill="#6B5A44" opacity=".75"/><rect x="24" y="41" width="52" height="2.2" rx="1" fill="#6B5A44" opacity=".4"/><rect x="24" y="47" width="46" height="2.2" rx="1" fill="#6B5A44" opacity=".4"/><rect x="24" y="53" width="50" height="2.2" rx="1" fill="#6B5A44" opacity=".4"/>
    <path d="M62 88l-5 20 8-6 6 7 2-21z" fill="#7E1622"/><circle cx="68" cy="80" r="12" fill="#9E1B2A"/><circle cx="68" cy="80" r="8" fill="none" stroke="#C9474F" stroke-width="1.4"/>${star(68, 80, 4.5, '#E3A6A6')}`,
  'Distinção': (m, g, r, rb) => { let p = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; p += `<circle cx="${(50 + Math.cos(a) * 19).toFixed(1)}" cy="${(46 + Math.sin(a) * 19).toFixed(1)}" r="8" fill="${rb[0]}"/>`; }
    return `<path d="M40 56l-8 52 10-7 6 9 4-54zM60 56l8 52-10-7-6 9-4-54z" fill="${rb[0]}"/><path d="M44 58l-5 44M56 58l5 44" stroke="${rb[1]}" stroke-width="2"/>${p}<circle cx="50" cy="46" r="18" fill="${rb[1]}"/><circle cx="50" cy="46" r="13" fill="url(#${g})"/>${r.place ? num(50, 52, r.place, 15, m[2]) : star(50, 46, 7, m[2])}`; } };
const art = (r, cls = '') => { const m = MET[r.level] || MET.Ouro, rb = RIB[r.cat] || RIB.Outro, g = 'tg' + (++uid), f = ART[r.kind] || ART.Medalha;
  return `<svg class="tf-art ${cls}" viewBox="0 0 100 120" role="img" aria-label="${esc((r.kind || 'Medalha') + ' de ' + (r.level || 'ouro').toLowerCase())}"><defs>${grad(g, m)}</defs>${f(m, g, r, rb)}</svg>`; };

/* ---------- foto (pequena, como a do retrato) ---------- */
let photoFor = null;
A.tfPhoto = b => { photoFor = b.dataset.id; const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const M = 720, k = Math.min(1, M / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); OS.upd('trophies', photoFor, { photo: c.toDataURL('image/jpeg', .8) }); UI.toast('Foto guardada', 'pos'); A.tfOpen({ dataset: { id: photoFor } }); }; im.src = rd.result; }; rd.readAsDataURL(f); }; i.click(); };
A.tfPhotoDel = b => { OS.upd('trophies', b.dataset.id, { photo: '' }); A.tfOpen(b); };

/* ---------- ações ---------- */
A.tfNew = () => UI.openForm('trophies', null);
A.tfEdit = b => { UI.closeModal(); UI.openForm('trophies', b.dataset.id); };
A.tfFav = b => { const id = b.dataset.id; OS.all('trophies').forEach(r => { if (r.fav && r.id !== id) OS.upd('trophies', r.id, { fav: false }, { silent: true }); }); OS.upd('trophies', id, { fav: true }); UI.closeModal(); UI.toast('É a tua peça de honra', 'pos'); };
A.tfOpen = b => { const r = OS.get('trophies', b.dataset.id); if (!r) return;
  UI.modal(`<div class="tf-md"><div class="tf-mh"><div class="tf-mart">${art(r, 'lg')}</div><div><small class="tf-kick">${esc([r.kind, r.level, r.cat].filter(Boolean).join(' · '))}</small><h3>${esc(r.title || 'Conquista')}</h3>
      <p class="mut">${esc([r.event, r.date ? U.fmtD(r.date) : '', r.place ? r.place + '.º lugar' : ''].filter(Boolean).join(' · '))}</p></div><button class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    ${r.photo ? `<img class="tf-ph" src="${r.photo}" alt="Foto: ${esc(r.title || '')}">` : ''}
    ${r.story ? `<p class="tf-story">${esc(r.story).replace(/\n/g, '<br>')}</p>` : ''}
    <div class="row gap8 tf-mb"><button class="btn sm" data-act="tfEdit" data-id="${r.id}">${UI.ic('edit')}Editar</button><button class="btn sm ghost" data-act="tfPhoto" data-id="${r.id}">${r.photo ? 'Mudar a foto' : 'Pôr uma foto'}</button>${r.photo ? `<button class="btn sm ghost" data-act="tfPhotoDel" data-id="${r.id}">Tirar a foto</button>` : ''}${r.fav ? '' : `<button class="btn sm ghost" data-act="tfFav" data-id="${r.id}">${UI.ic('star')}Peça de honra</button>`}</div></div>`, 'tf-modal'); };
A.tfF = b => OS.setUI('tfF', b.dataset.v);

/* ---------- vista ---------- */
const rank = r => (r.level === 'Ouro' ? 0 : r.level === 'Prata' ? 1 : r.level === 'Bronze' ? 2 : 3) * 10 + (r.kind === 'Troféu' ? 0 : 1) + (+r.place || 9) / 100;
const yearOf = r => String(r.date || '').slice(0, 4);
const disc = (lvl, n) => { const m = MET[lvl], g = 'tq' + (++uid); return `<div class="tf-q ${n ? '' : 'z'}"><svg viewBox="0 0 40 40" aria-hidden="true"><defs>${grad(g, m)}</defs><circle cx="20" cy="20" r="17" fill="url(#${g})"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="${m[2]}" stroke-opacity=".5" stroke-width="1.2"/></svg><b class="mono">${n}</b><span>${lvl}</span></div>`; };
const prumoShelf = () => { if (!OS.Dom || !OS.Dom.achievements) return ''; let L = []; try { L = OS.Dom.achievements().filter(a => a.t > 0); } catch (e) { return ''; } if (!L.length) return '';
  const TN = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'];
  return `<section class="pn tf-pr"><div class="pn-h"><h3>${UI.ic('crown')}Medalhas do Prumo</h3><span class="mut">${L.length}</span></div><p class="mut tf-sub">As conquistas que o Dominus te deu pelo que fizeste aqui.</p>
    <div class="tf-shelf sm">${L.map((a, i) => { const lvl = TN[Math.min(4, a.t - 1)]; return `<div class="tf-it" style="--i:${i}">${art({ kind: 'Medalha', level: lvl, cat: 'Outro' })}<b>${esc(a.n)}</b><small>${esc(lvl)} · ${U.nf(a.v)} ${esc(a.u)}</small></div>`; }).join('')}</div></section>`; };
const view = () => { const all = OS.all('trophies'), f = OS.ui.tfF || 'todas', L = U.sortBy(all.filter(r => f === 'todas' || r.cat === f), r => rank(r) + ' ' + (9999 - (+yearOf(r) || 0)));
  const hon = all.find(r => r.fav) || U.sortBy(all, r => rank(r))[0], cnt = lv => all.filter(r => r.level === lv && r.kind !== 'Certificado').length, tro = all.filter(r => r.kind === 'Troféu').length;
  const cats = CAT.filter(c => all.some(r => r.cat === c));
  if (!all.length) return `<section class="pn tf-empty"><div class="tf-ghost">${['Troféu', 'Medalha', 'Placa'].map(k => art({ kind: k, level: 'Prata', cat: 'Outro' }, 'ghost')).join('')}</div>
    <h3>A tua vitrine está à espera da primeira peça</h3><p class="mut">Guarda aqui os troféus, as medalhas, os certificados e as distinções que ganhaste: no desporto, nos estudos, no trabalho, em concursos. Com a data, a história e uma foto. Vale tudo o que te deu orgulho.</p>
    <button class="btn pri" data-act="tfNew">${UI.ic('plus')}Pôr a primeira conquista</button></section>${prumoShelf()}`;
  const years = [...new Set(all.map(yearOf).filter(Boolean))].sort().reverse();
  return `<section class="pn tf-hero">${hon ? `<button class="tf-hon" data-act="tfOpen" data-id="${hon.id}"><span class="tf-spot" aria-hidden="true"></span>${art(hon, 'hon')}<span class="tf-ht"><small>Peça de honra</small><b>${esc(hon.title || '')}</b><span class="mut">${esc([hon.event, hon.date ? U.fmtD(hon.date) : ''].filter(Boolean).join(' · '))}</span></span></button>` : ''}
    <div class="tf-tab"><div class="tf-qs">${disc('Ouro', cnt('Ouro'))}${disc('Prata', cnt('Prata'))}${disc('Bronze', cnt('Bronze'))}</div>
      <p class="tf-sum"><b class="mono">${all.length}</b> ${all.length === 1 ? 'conquista' : 'conquistas'} · <b class="mono">${tro}</b> ${tro === 1 ? 'troféu' : 'troféus'}${years.length ? ` · desde ${years[years.length - 1]}` : ''}</p>
      <button class="btn pri" data-act="tfNew">${UI.ic('plus')}Nova conquista</button></div></section>
  <section class="pn tf-cab"><div class="pn-h"><h3>${UI.ic('award')}A vitrine</h3><span class="mut">${L.length}</span></div>
    ${cats.length > 1 ? `<div class="row gap6 tf-fs">${UI.chip('Todas', 'tfF', f === 'todas', 'data-v="todas"')}${cats.map(c => UI.chip(c, 'tfF', f === c, `data-v="${esc(c)}"`)).join('')}</div>` : ''}
    <div class="tf-shelf">${L.map((r, i) => `<button class="tf-it" style="--i:${i}" data-act="tfOpen" data-id="${r.id}">${art(r)}<b>${esc(r.title || '')}</b><small>${esc([r.level, yearOf(r)].filter(Boolean).join(' · '))}</small></button>`).join('')}</div></section>
  <section class="pn"><div class="pn-h"><h3>${UI.ic('clock')}Linha do tempo</h3></div><ol class="tf-tl">${years.map(y => `<li><b class="mono">${y}</b><div>${U.sortBy(all.filter(r => yearOf(r) === y), r => r.date || '').reverse().map(r => `<button data-act="tfOpen" data-id="${r.id}"><i class="tf-dot" style="background:${(MET[r.level] || MET.Ouro)[1]}"></i>${esc(r.title || '')}${r.event ? `<small> · ${esc(r.event)}</small>` : ''}</button>`).join('')}</div></li>`).join('')}${all.some(r => !yearOf(r)) ? `<li><b class="mono">—</b><div>${all.filter(r => !yearOf(r)).map(r => `<button data-act="tfOpen" data-id="${r.id}"><i class="tf-dot"></i>${esc(r.title || '')}</button>`).join('')}</div></li>` : ''}</ol></section>
  ${prumoShelf()}`; };
// um cartão pequeno no Retrato (Quem sou eu)
const card = () => { const all = OS.all('trophies'); if (!all.length) return ''; const hon = all.find(r => r.fav) || U.sortBy(all, r => rank(r))[0];
  return `<a class="pn tf-card" href="#eu.trofeus">${art(hon, 'sm')}<span><small>Troféus e medalhas</small><b>${all.length} ${all.length === 1 ? 'conquista' : 'conquistas'}</b><span class="mut">${esc(hon.title || '')}</span></span></a>`; };
OS.Trofeus = { view, card, art };
})();
