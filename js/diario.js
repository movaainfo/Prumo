/* PRUMO — Diário (v4.04), em Eu. Opcional: só aparece a quem o escolher (no registo, em Definições › Abas do menu ou em Explorar).
   Uma página por dia: como correu (humor), o que escreveste e uma sugestão para começar quando a folha está em branco.
   Grava sozinho enquanto escreves; o calendário do mês mostra os dias escritos pela cor do humor; procura em tudo o que escreveste.
   Fica na tua conta, cifrado e sincronizado. A IA só o lê se deixares (por defeito deixa, para responder sobre os teus dias). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, V = OS.views;
OS.ONE_DEF.diario = { ia: true };
const HUM = [[1, 'Difícil', '#b0566a'], [2, 'Em baixo', '#a07ab8'], [3, 'Normal', '#8b97aa'], [4, 'Bom', '#4fa7b8'], [5, 'Ótimo', '#e0ae45']];
const humorN = m => (HUM.find(h => h[0] === +m) || [0, ''])[1];
const PERG = ['O que te fez sorrir hoje?', 'O que aprendeste hoje que não sabias ontem?', 'Qual foi o momento mais difícil do dia, e como lidaste com ele?', 'Por que três coisas estás grato hoje?', 'Com quem falaste hoje que te marcou?',
  'O que farias diferente se pudesses repetir o dia?', 'O que te deu energia hoje? E o que te tirou?', 'Que pequena vitória mereces celebrar?', 'O que te preocupa agora? Escreve até ficar mais leve.', 'Que decisão tomaste hoje e porquê?',
  'Descreve um lugar onde estiveste hoje, com pormenores.', 'O que queres lembrar deste dia daqui a dez anos?', 'Em que é que avançaste nas tuas metas?', 'Que conversa gostavas de ter tido?', 'O que te surpreendeu hoje?',
  'Como cuidaste de ti hoje?', 'Qual foi a melhor coisa que comeste, ouviste ou leste?', 'Se o dia fosse um capítulo de livro, que título teria?', 'O que deixaste para amanhã, e é mesmo para amanhã?', 'Que pensamento repetiste muitas vezes hoje?',
  'Quem ajudaste hoje, ou quem te ajudou?', 'Do que te orgulhas esta semana?', 'O que te está a pedir mais coragem?', 'Escreve uma carta curta ao teu eu de daqui a um ano.', 'O que estás a evitar, e o que acontecia se o fizesses?'];
const ON = () => !OS.Areas || OS.Areas.on('diario');
const cfg = () => Object.assign({}, OS.ONE_DEF.diario, OS.one('diario'));
const paraIA = () => cfg().ia !== false;
const lista = () => U.sortBy(OS.all('diary').filter(e => e.date && (String(e.text || '').trim() || e.mood)), e => e.date, -1);
const doDia = d => OS.all('diary').find(e => e.date === d);
const palavras = t => (String(t || '').trim().match(/\S+/g) || []).length;
const dia = () => { const d = OS.ui.dyD; return d && /^\d{4}-\d\d-\d\d$/.test(d) && d <= U.today() ? d : U.today(); };
const seguidos = () => { const S = new Set(lista().filter(e => String(e.text || '').trim()).map(e => e.date)); let n = 0, d = U.today(); if (!S.has(d)) d = U.addDays(d, -1); while (S.has(d)) { n++; d = U.addDays(d, -1); } return n; };
const pergunta = d => PERG[(U.hash(d + 'dy') + (OS.ui.dyP || 0)) % PERG.length];
const quando = d => new Date(d + 'T12:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: d.slice(0, 4) === U.today().slice(0, 4) ? undefined : 'numeric' });
/* ---------- a página ---------- */
const mes = d => { const ym = d.slice(0, 7), y = +ym.slice(0, 4), m = +ym.slice(5, 7), n = new Date(y, m, 0).getDate(), off = (new Date(y, m - 1, 1).getDay() + 6) % 7, E = {}, t = U.today();
  OS.all('diary').forEach(e => { if (e.date && e.date.slice(0, 7) === ym) E[e.date] = e; });
  let h = '<div class="dy-cal" role="grid" aria-label="Dias do mês">' + ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(x => `<i class="dy-wd">${x}</i>`).join('') + '<i></i>'.repeat(off);
  for (let i = 1; i <= n; i++) { const k = ym + '-' + U.pad(i), e = E[k], h0 = e && HUM.find(x => x[0] === +e.mood), escrito = e && String(e.text || '').trim();
    h += `<button type="button" class="dy-d${k === d ? ' on' : ''}${k === t ? ' hoje' : ''}${escrito ? ' esc' : ''}" data-act="dyIr" data-d="${k}" ${k > t ? 'disabled' : ''} style="${h0 ? '--m:' + h0[2] : ''}" aria-label="${quando(k)}${e ? ', ' + (humorN(e.mood) || 'escrito') : ''}">${i}</button>`; }
  return h + '</div>'; };
const pagina = () => { const d = dia(), e = doDia(d) || {}, L = lista(), q = String((OS.ui.dy || {}).q || '').trim(), t = U.today(), nE = L.filter(x => String(x.text || '').trim()).length;
  const nrm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), achados = q ? L.filter(x => nrm(x.text).includes(nrm(q))) : L.slice(0, 8);
  const ym = d.slice(0, 7), nomeMes = new Date(d + 'T12:00').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  return UI.head('Diário', 'Uma página por dia: como correu e o que queres guardar. Grava sozinho enquanto escreves. Só tu o lês.', '', 'Eu') + `<div class="dy">
  <section class="dy-pg pn"><div class="dy-nav"><button type="button" class="icon-btn" data-act="dyIr" data-d="${U.addDays(d, -1)}" aria-label="Dia anterior">${UI.ic('left')}</button>
      <h2>${esc(quando(d))}</h2><button type="button" class="icon-btn" data-act="dyIr" data-d="${U.addDays(d, 1)}" ${d >= t ? 'disabled' : ''} aria-label="Dia seguinte">${UI.ic('right')}</button>${d !== t ? `<button type="button" class="btn sm ghost" data-act="dyIr" data-d="${t}">Hoje</button>` : ''}</div>
    <div class="dy-hum" role="radiogroup" aria-label="Como correu o dia">${HUM.map(([v, l, c]) => `<button type="button" role="radio" aria-checked="${+e.mood === v}" class="dy-h${+e.mood === v ? ' on' : ''}" style="--m:${c}" data-act="dyHumor" data-v="${v}"><i></i>${l}</button>`).join('')}</div>
    <p class="dy-q"><span>${esc(pergunta(d))}</span><button type="button" class="btn xs ghost" data-act="dyOutra">Outra sugestão</button></p>
    <textarea class="dy-tx" id="dyTexto" data-dy="${d}" data-keep="dy${d}" placeholder="Escreve à vontade…" aria-label="O que escreveste neste dia">${esc(e.text || '')}</textarea>
    <div class="dy-st"><span id="dyEstado" class="mut">${e.text ? 'Guardado' : ''}</span><span id="dyPal" class="mut">${palavras(e.text)} palavras</span></div></section>
  <aside class="dy-side">
    <div class="pn dy-num"><div><b>${seguidos()}</b><small>${seguidos() === 1 ? 'dia seguido' : 'dias seguidos'}</small></div><div><b>${nE}</b><small>${nE === 1 ? 'dia escrito' : 'dias escritos'}</small></div></div>
    <div class="pn"><div class="pn-h"><h3 style="text-transform:capitalize">${esc(nomeMes)}</h3><div class="row gap4"><button type="button" class="icon-btn" data-act="dyIr" data-d="${U.addDays(ym + '-01', -1).slice(0, 7)}-01" aria-label="Mês anterior">${UI.ic('left')}</button><button type="button" class="icon-btn" data-act="dyIr" data-d="${ym === t.slice(0, 7) ? t : U.addDays(ym + '-28', 7).slice(0, 7) + '-01'}" ${ym >= t.slice(0, 7) ? 'disabled' : ''} aria-label="Mês seguinte">${UI.ic('right')}</button></div></div>${mes(d)}
      <div class="dy-leg">${HUM.map(([, l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div></div>
    <div class="pn"><div class="pn-h"><h3>${q ? 'Encontrado' : 'Últimos dias'}</h3></div><input type="search" class="field" placeholder="Procurar no diário" value="${esc(q)}" data-uif="dy.q" aria-label="Procurar no diário">
      ${achados.length ? `<div class="dy-li">${achados.slice(0, 30).map(x => { const h0 = HUM.find(y => y[0] === +x.mood); return `<button type="button" class="dy-it" data-act="dyIr" data-d="${x.date}"><i style="background:${h0 ? h0[2] : 'var(--line)'}"></i><span><b>${esc(quando(x.date))}</b><small>${esc(String(x.text || humorN(x.mood)).slice(0, 110))}</small></span></button>`; }).join('')}</div>` : `<p class="mut" style="margin:10px 0 0">${q ? 'Nada com essas palavras.' : 'Ainda não escreveste nenhum dia. Começa por hoje.'}</p>`}</div>
    <div class="pn dy-cfg"><label class="row gap8" style="align-items:flex-start"><input type="checkbox" data-act="dyIA" ${paraIA() ? 'checked' : ''}><span><b>A IA pode ler o diário</b><small class="mut" style="display:block">Para responder a perguntas sobre os teus dias («como estava eu na semana passada?»). Desliga e ela deixa de o ler.</small></span></label>
      <button type="button" class="btn sm ghost" data-act="dyTXT" ${nE ? '' : 'disabled'}>Descarregar o diário (.txt)</button></div>
  </aside></div>`; };
/* ---------- gravar ---------- */
let T = null;
const gravar = (d, patch) => { const e = doDia(d); if (e) OS.upd('diary', e.id, patch, { silent: true }); else if (String(patch.text || '').trim() || patch.mood) OS.add('diary', Object.assign({ date: d }, patch), { silent: true }); };
document.addEventListener('input', ev => { const el = ev.target; if (!el.dataset || !el.dataset.dy) return; const d = el.dataset.dy, s0 = document.getElementById('dyEstado'); if (s0) s0.textContent = 'A guardar…';
  const p = document.getElementById('dyPal'); if (p) p.textContent = palavras(el.value) + ' palavras';
  clearTimeout(T); T = setTimeout(() => { gravar(d, { text: el.value.slice(0, 50000) }); const s1 = document.getElementById('dyEstado'); if (s1) s1.textContent = 'Guardado'; }, 700); });
const flush = () => { const el = document.getElementById('dyTexto'); if (el && T) { clearTimeout(T); T = null; gravar(el.dataset.dy, { text: el.value.slice(0, 50000) }); } };
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
A.dyIr = b => { flush(); OS.setUI('dyD', b.dataset.d > U.today() ? U.today() : b.dataset.d); };
A.dyHumor = b => { flush(); const d = dia(), e = doDia(d), v = +b.dataset.v; gravar(d, { mood: e && +e.mood === v ? 0 : v }); OS.request(); };
A.dyOutra = () => OS.setUI('dyP', (OS.ui.dyP || 0) + 1);
A.dyIA = b => { OS.setOne('diario', Object.assign({}, OS.one('diario'), { ia: !!b.checked })); UI.toast(b.checked ? 'A IA pode ler o teu diário' : 'A IA deixa de ler o teu diário', 'pos'); };
A.dyTXT = () => { flush(); const txt = lista().slice().reverse().map(e => quando(e.date).toUpperCase() + (e.mood ? ' · ' + humorN(e.mood) : '') + '\n\n' + (e.text || '') + '\n').join('\n\n');
  const u = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })), a = document.createElement('a'); a.href = u; a.download = 'Diario-Prumo.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000); };
V.diario = () => ON() ? pagina() : UI.head('Diário', '', '', 'Eu') + UI.empty('O Diário está desligado. Liga-o em Definições › Abas do menu (ou em Explorar).', '<a class="btn pri" href="#explorar">Abrir Explorar</a>');
OS.Diario = { lista, doDia, humorN, paraIA, HUM, pagina };
})();
