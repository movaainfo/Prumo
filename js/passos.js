/* PRUMO — Primeiros passos (v3.79): depois de criar a conta, o que falta configurar para o Prumo ficar pronto a sério.
   Cada passo marca-se sozinho quando está feito. Enquanto faltar algum, o Painel tem um pontinho vermelho no menu e mostra
   "Bom dia… faltam N passos" com a lista. Quando está tudo feito, o cartão sai sozinho (dá para esconder antes). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const s = (f, d) => { try { return f(); } catch (e) { return d; } };
const PASSOS = [
  ['nome', 'O teu nome', 'Como queres que o Prumo te trate.', '#definicoes', () => !!String((OS.one('profile') || {}).short || '').trim()],
  ['anos', 'A tua data de nascimento', 'Para os parabéns e as contas da vida.', '#eu.sobre', () => /^\d{4}-\d{2}-\d{2}$/.test((OS.one('me') || {}).birth || '')],
  ['pais', 'O teu país', 'A moeda, as festas e o calendário certos.', '#definicoes', () => !!(OS.one('profile') || {}).country],
  ['meta', 'A primeira meta', 'O que queres conseguir este ano.', '#metas', () => OS.all('goals').length > 0],
  ['habito', 'Um hábito ou a rotina', 'O que queres fazer todos os dias.', '#habitos', () => OS.all('habits').length > 0 || OS.all('routine').length > 0],
  ['conta', 'Uma conta de dinheiro', 'O banco ou a carteira, com o saldo de hoje.', '#financas.contas', () => OS.all('accounts').length > 0],
  ['avisos', 'As notificações', 'Os avisos chegam mesmo com o Prumo fechado.', '#definicoes', () => !!(OS.Push && OS.Push.on && OS.Push.on())]];
const estado = () => PASSOS.map(p => ({ k: p[0], t: p[1], d: p[2], u: p[3], ok: !!s(p[4], false) }));
const escondido = () => !!U.ls.get('oc_passos_off', 0);
const faltam = () => escondido() ? 0 : estado().filter(p => !p.ok).length;
const cartao = () => { if (escondido()) return ''; const E = estado(), f = E.filter(p => !p.ok).length; if (!f) return '';
  const feitos = E.length - f, h = new Date().getHours(), oi = h < 12 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite';
  return `<section class="ps-c" aria-label="Primeiros passos"><div class="ps-h"><div><b>${oi}${(OS.one('profile') || {}).short ? ', ' + esc(String(OS.one('profile').short).split(' ')[0]) : ''}. ${f === 1 ? 'Falta 1 passo' : 'Faltam ' + f + ' passos'} para o Prumo ficar pronto.</b><small>${feitos} de ${E.length} feitos</small></div><button type="button" class="btn xs ghost" data-act="psEsconder">Esconder</button></div>
    <span class="ps-b"><i style="width:${Math.round(feitos / E.length * 100)}%"></i></span>
    <ol class="ps-l">${E.map(p => `<li class="${p.ok ? 'ok' : ''}"><a href="${p.u}"><span class="ps-i">${p.ok ? UI.ic('check') : ''}</span><span><b>${esc(p.t)}</b><small>${esc(p.d)}</small></span>${p.ok ? '' : UI.ic('right')}</a></li>`).join('')}</ol></section>`; };
A.psEsconder = () => { U.ls.set('oc_passos_off', 1); OS.request(); };
OS.Passos = { estado, faltam, cartao };
OS.on && OS.on('ready', () => {
  // o pontinho vermelho no Painel (junta-se ao que já lá estava)
  try { const g = OS.NAV.find(x => x[0] === 'Visão geral'), it = g && g[1].find(x => x[0] === 'visao'); if (it) { const b0 = it[3]; it[3] = () => { const r = b0 ? s(b0, null) : null; if (r) return r; const n = faltam(); return n ? [n, 'neg'] : null; }; } } catch (e) { }
  const o = OS.views.visao; if (o && !o._ps) { OS.views.visao = sub => { const h = o(sub), k = '<!--dg-->', i = h.indexOf(k), c = s(cartao, ''); if (!c || i < 0) return h; const j = h.indexOf('</div>', h.indexOf('<div class="dash-top"')); return h.slice(0, i) + c + h.slice(i); }; OS.views.visao._ps = 1; } });
})();
