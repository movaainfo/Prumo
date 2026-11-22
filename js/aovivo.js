/* PRUMO — atividade em curso (v3.72). Quando há um treino, um bloco de foco ou uma árvore da Floresta a decorrer, aparece uma barra
   no topo da app (em todas as páginas) com o tempo a correr, o exercício ou a tarefa de agora e o progresso; tocar nela abre a atividade.
   Com as notificações ligadas, o mesmo fica na barra de notificações do telemóvel: uma notificação que se atualiza a cada série, descanso
   ou etapa (sem tocar nem vibrar) e desaparece quando acaba. O fim do descanso também avisa com a app fechada (servidor).
   Limite: o contador a correr no ecrã bloqueado do iPhone (Atividade ao vivo) só existe em apps nativas da App Store. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const TAG = 'prumo-aovivo';
const mmss = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const peso = () => { try { const B = U.sortBy(OS.all('body').filter(b => +b.weight), b => b.date); return +((B[B.length - 1] || {}).weight) || +((OS.one('profile') || {}).weight) || 70; } catch (e) { return 70; } };
const nomeEx = id => { try { const i = OS.Ex && OS.Ex.info(id); return (i && i.name) || 'Exercício'; } catch (e) { return 'Exercício'; } };
// o que está a decorrer agora (lido do que cada parte da app guarda neste aparelho)
const atividades = () => { const out = [], now = Date.now();
  const W = U.ls.get('os2live', null);
  if (W && W.mode === 'live' && W.start) { const its = (Array.isArray(W.items) ? W.items : []).filter(it => Array.isArray(it.sets) && it.sets.length), cur = its.find(it => it.sets.some(s => !s.done)) || its[its.length - 1];
    const feitos = its.filter(it => it.sets.every(s => s.done)).length, sets = its.reduce((n, it) => n + it.sets.length, 0), setsF = its.reduce((n, it) => n + it.sets.filter(s => s.done).length, 0);
    const desc = W.restEnd && W.restEnd > now ? Math.ceil((W.restEnd - now) / 1000) : 0, seg = (now - W.start) / 1000, kcal = Math.round(5 * peso() * seg / 3600);
    out.push({ id: 'treino', ic: 'dumbbell', sup: W.title || 'Treino', t: cur ? nomeEx(cur.ex) : 'Treino a decorrer', inicio: W.start, desc, descTot: W.restTot || 0, segs: its.length ? its.map(it => it.sets.every(s => s.done) ? 1 : it.sets.some(s => s.done) ? .5 : 0) : [], extra: kcal ? '+' + kcal + ' kcal' : '',
      passo: (cur ? cur.ex : '') + '|' + setsF + '|' + (desc ? 'd' : ''), corpo: `${cur ? nomeEx(cur.ex) + ' · ' : ''}${setsF}/${sets} séries${desc ? ' · descanso' : ''} · começou às ${new Date(W.start).toTimeString().slice(0, 5)}`, abrir: () => { if (OS.Ex && OS.Ex.abrir) OS.Ex.abrir(); else location.hash = 'treino'; }, ecra: '#wkLive', feitos }); }
  const B = U.ls.get('os2fblk', null);
  if (B && Array.isArray(B.items) && B.items.length && B.phase && B.phase !== 'end') { const it = B.items[B.i] || {}, tot = ((+it.mins || 0) + (+it.extra || 0)) * 60;
    out.push({ id: 'foco', ic: 'focus', sup: 'Bloco de foco' + (B.th ? ' · ' + B.th : ''), t: it.title || 'Pendência', fim: B.end, tot, segs: B.items.map(x => x.st === 'done' ? 1 : x.st ? .5 : 0), extra: (B.i + 1) + '/' + B.items.length,
      passo: B.i + '|' + B.phase, corpo: `${it.title || 'Pendência'} · ${B.phase === 'run' ? 'até às ' + new Date(B.end).toTimeString().slice(0, 5) : 'acabou o tempo: terminaste?'}`, abrir: () => { if (A.fbShow) A.fbShow(); else location.hash = 'foco'; }, ecra: '#fblk' }); }
  const F = U.ls.get('oc_forest_run', null);
  if (F && F.t0 && F.mins) { const fim = F.t0 + F.mins * 60e3; if (fim > now - 5 * 60e3) out.push({ id: 'floresta', ic: 'tree', sup: F.phase === 'break' ? 'Pausa' : 'Floresta', t: F.phase === 'break' ? 'Descansa um pouco' : (F.tag || 'A plantar uma árvore'), fim, tot: F.mins * 60, segs: F.pomo ? Array.from({ length: F.pomo.of || 4 }, (_, i) => i < (F.pomo.i || 0) ? 1 : 0) : [], extra: F.mins + ' min',
      passo: F.phase + '|' + F.t0, corpo: `${F.phase === 'break' ? 'Pausa' : 'Concentração'} até às ${new Date(fim).toTimeString().slice(0, 5)}`, abrir: () => { location.hash = 'floresta'; } }); }
  return out; };

/* ---------- a barra no topo da app ---------- */
let el = null, TICK = 0, ULT = '';
const visivel = a => !(a.ecra && (() => { const x = document.querySelector(a.ecra); return x && !x.hidden && getComputedStyle(x).display !== 'none'; })());
const tempo = a => a.desc ? { txt: mmss(a.desc), p: a.descTot ? 1 - a.desc / a.descTot : 0, lbl: 'descanso' } : a.fim ? { txt: (a.fim < Date.now() ? '+' : '') + mmss(Math.abs(a.fim - Date.now()) / 1000), p: a.tot ? Math.min(1, 1 - (a.fim - Date.now()) / 1000 / a.tot) : 0, lbl: a.fim < Date.now() ? 'acabou' : 'restante' } : { txt: mmss((Date.now() - a.inicio) / 1000), p: ((Date.now() - a.inicio) / 1000 % 60) / 60, lbl: 'a decorrer' };
const anel = p => { const r = 21, c = 2 * Math.PI * r; return `<svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="${r}" class="av-a0"/><circle cx="25" cy="25" r="${r}" class="av-a1" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - Math.max(0, Math.min(1, p)))).toFixed(1)}"/></svg>`; };
const desenha = () => { const T = atividades(), L = T.filter(visivel), a = L[0]; notifica(T);
  document.documentElement.classList.toggle('av-on', !!a);
  if (!a) { if (el) el.hidden = true; clearInterval(TICK); TICK = 0; return; }
  if (!el) { el = document.createElement('button'); el.type = 'button'; el.id = 'aoVivo'; el.className = 'av'; el.addEventListener('click', () => { const x = atividades().filter(visivel)[0]; if (x) x.abrir(); }); document.body.appendChild(el); }
  const tm = tempo(a);
  el.hidden = false; el.dataset.id = a.id; el.setAttribute('aria-label', `${a.sup}: ${a.t}, ${tm.txt} ${tm.lbl}. Toca para abrir.`);
  el.innerHTML = `<span class="av-r">${anel(tm.p)}<b>${tm.txt}</b></span><span class="av-tx"><small>${esc(a.sup)}</small><strong>${esc(a.t)}</strong>${a.segs && a.segs.length ? `<span class="av-sg">${a.segs.slice(0, 12).map(v => `<i class="${v >= 1 ? 'f' : v > 0 ? 'm' : ''}"></i>`).join('')}</span>` : ''}</span>${a.extra ? `<span class="av-x">${a.id === 'treino' ? UI.ic('flame') : ''}${esc(a.extra)}</span>` : ''}${L.length > 1 ? `<span class="av-n">+${L.length - 1}</span>` : ''}`;
  if (!TICK) TICK = setInterval(desenha, 1000); };

/* ---------- a notificação do telemóvel (atualiza a cada etapa, sem tocar) ---------- */
const podeNotificar = () => { try { return OS.Push && OS.Push.on && OS.Push.on() && 'serviceWorker' in navigator && Notification.permission === 'granted' && !(OS.one('pushcfg') || {}).semVivo; } catch (e) { return false; } };
const notifica = async L => { const a = L[0], chave = a ? a.id + '|' + a.passo : '';
  if (chave === ULT) return; ULT = chave;
  try { if (!podeNotificar()) return; const reg = await navigator.serviceWorker.ready;
    if (!a) { (await reg.getNotifications({ tag: TAG })).forEach(n => n.close()); return; }
    await reg.showNotification(a.sup + ' · ' + a.t, { tag: TAG, body: a.corpo, silent: true, renotify: false, requireInteraction: true, icon: 'icon-192.png', badge: 'selo-96.png', data: { url: a.id === 'treino' ? '#treino' : a.id === 'foco' ? '#foco' : '#floresta', aovivo: 1 } }); } catch (e) { } };
// o fim do descanso avisa mesmo com a app fechada (o servidor manda na hora)
let ULTD = '';
const avisaDescanso = () => { const W = U.ls.get('os2live', null), now = Date.now(), at = W && W.mode === 'live' && W.restEnd > now + 5000 ? W.restEnd : 0, k = String(at);
  if (k === ULTD) return; ULTD = k; try { if (OS.Push && OS.Push.put) OS.Push.put('vivo', at ? [{ at, t: 'Descanso acabou', b: 'Bora para a próxima série.', u: '#treino', g: 'descanso' }] : []); } catch (e) { } };
// as partes da app mudam o que guardam; a barra acompanha (sem custo quando não há nada a decorrer)
const tudo = () => { try { desenha(); avisaDescanso(); } catch (e) { } };
window.addEventListener('storage', tudo); document.addEventListener('visibilitychange', () => { if (!document.hidden) { ULT = ''; tudo(); } });
OS.on && OS.on('ready', () => { tudo(); setInterval(() => { if (!TICK) tudo(); }, 3000); });
document.addEventListener('click', () => setTimeout(tudo, 60), true);
OS.AoVivo = { atividades, atualizar: tudo, mmss };
})();
