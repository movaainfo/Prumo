/* PRUMO — Cores do app (Definições › Aplicação): escolher a paleta que predomina. O motor está em js/paleta.js (corre no <head>).
   A escolha é de cada perfil, neste aparelho; sem escolha, fica a do logo (Selo). */
(() => {
'use strict';
const P = window.PrumoPaleta; if (!P) return;
const U = OS.U, UI = OS.UI, esc = U.esc, A = OS.act, LS = U.ls;
const pid = () => { try { return (OS.Acc && OS.Acc.on && OS.Acc.pid && OS.Acc.pid()) || 'local'; } catch (e) { return 'local'; } };
const K = () => 'nau:pal:' + pid();
const ok = id => P.LIST.some(x => x[0] === id);
const mine = () => { const v = LS.get(K(), null); return ok(v) ? v : P.DEF; };
const name = id => (P.LIST.find(x => x[0] === id) || [])[1] || '';
// ao abrir (e ao trocar de perfil): as cores deste perfil
const sync = () => { const id = mine(); if (P.cur() !== id) { P.apply(id); OS.Fundo && OS.Fundo.refresh && OS.Fundo.refresh(); OS.request(); } LS.set('nau:pal', id); };
OS.on('ready', sync);
// as cenas do fundo (farol, ondas, serra…) também tomam a paleta; a foto fica como está
if (OS.Fundo && !OS.Fundo._pal) { const F = OS.Fundo, h0 = F.html, m0 = F.model; F.html = (...a) => { const r = h0(...a); return r.indexOf('fd-photo') >= 0 ? r : P.recolor(r); }; F.model = (...a) => P.recolor(m0(...a)); F._pal = 1; }
// amostra: fundo, cartão, botão, destaque e texto, tal como ficam nesta paleta
const sw = id => { const c = x => P.color(id, x);
  return `<span class="pal-sw" style="background:${c('#070D16')};border-color:${c('rgba(170,195,225,.16)')}"><i style="background:${c('#132031')}"></i><i style="background:${c('#2B5C93')}"></i><b style="color:${c('#EDF1F6')};border-color:${c('#8FB8E8')}">Aa</b></span>`; };
const panel = () => { const cur = P.cur();
  return `<div class="pn" id="palSet"><div class="pn-h"><h3>${UI.ic('sun')}Cores do app</h3><span class="mut" style="font-size:12px">${esc(name(cur))}</span></div>
    <p class="mut" style="margin:0 0 12px">A paleta que predomina em todo o Prumo: fundos, cartões, botões e destaques. As cores com significado (gastos, avisos, metas) e os desenhos do Dominus ficam iguais. Cada perfil escolhe a sua.</p>
    <div class="pal-g" role="radiogroup" aria-label="Paleta de cores">${P.LIST.map(([id, n, d]) => `<button type="button" class="pal-c${id === cur ? ' on' : ''}" role="radio" aria-checked="${id === cur}" data-act="palSet" data-v="${id}">${sw(id)}<span class="pal-t"><b>${esc(n)}${id === P.DEF ? ' <em>do logo</em>' : ''}</b><small>${esc(d)}</small></span></button>`).join('')}</div></div>`; };
A.palSet = b => { const id = b.dataset.v; if (!ok(id)) return; P.apply(id); OS.Fundo && OS.Fundo.refresh && OS.Fundo.refresh(); LS.set(K(), id); LS.set('nau:pal', id); UI.toast('Cores do app: ' + name(id), 'pos'); OS.request(); };
OS.Cores = { panel, mine };
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._pal) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' ? panel() : ''); OS.views.definicoes._pal = 1; });
})();
