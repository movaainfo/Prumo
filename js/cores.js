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
// a intro ao abrir (js/intro.js): sempre, uma vez por dia ou nunca; e ver agora
const IN = window.PrumoIntro;
const introPanel = () => { if (!IN) return ''; const m = IN.mode();
  return `<div class="pn" id="introSet"><div class="pn-h"><h3>${UI.ic('play')}Intro ao abrir</h3><span class="mut" style="font-size:12px">${esc((IN.MODES.find(x => x[0] === m) || [])[1] || '')}</span></div>
    <p class="mut" style="margin:0 0 10px">A animação do selo antes do ecrã de carregamento: o prumo, a cera, o carimbo e o nome, com som. Um toque salta-a. Com "reduzir movimento" ligado no aparelho ou no modo Leve não aparece.</p>
    <div class="seg" role="group" aria-label="Quando mostrar a intro">${IN.MODES.map(([v, n]) => `<button type="button" class="${v === m ? 'on' : ''}" aria-pressed="${v === m}" data-act="introSet" data-v="${v}">${esc(n)}</button>`).join('')}</div>
    <p class="mut" style="margin:14px 0 8px">Som: no iPhone o som só pode começar com um toque, por isso a intro abre em "Toca para começar". A música toca como um vídeo, por isso ouve-se mesmo com o iPhone em silêncio. Sem som, a intro começa sozinha.</p>
    <div class="seg" role="group" aria-label="Som da intro">${[[1, 'Com som'], [0, 'Sem som']].map(([v, n]) => `<button type="button" class="${!!v === IN.sound() ? 'on' : ''}" aria-pressed="${!!v === IN.sound()}" data-act="introSom" data-v="${v}">${esc(n)}</button>`).join('')}</div>
    <button type="button" class="btn sm" style="margin-top:12px" data-act="introVer">${UI.ic('play')}Ver a intro agora</button></div>`; };
A.introSet = b => { if (!IN) return; IN.setMode(b.dataset.v); UI.toast(b.dataset.v === 'nunca' ? 'A intro não volta a aparecer' : b.dataset.v === 'dia' ? 'A intro aparece uma vez por dia' : 'A intro aparece sempre que abres', 'pos'); OS.request(); };
A.introSom = b => { if (!IN) return; IN.setSound(b.dataset.v === '1'); UI.toast(b.dataset.v === '1' ? 'A intro tem som' : 'A intro fica sem som', 'pos'); OS.request(); };
A.introVer = () => { if (IN && !IN.play({ gesture: true })) UI.toast('Não foi possível mostrar a intro aqui'); };
OS.Cores = { panel, mine, introPanel };
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._pal) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' ? panel() + introPanel() : ''); OS.views.definicoes._pal = 1; });
})();
