/* PRUMO — escudo nas partes com dados sensíveis (Senhas, Finanças e Investimentos, Corpo e saúde, E-mail, Eu, Admin, Definições), nas contas das
   outras pessoas (a conta do dono fica livre).
   Um site ou app web não consegue impedir nem detetar a captura nem a gravação do ecrã (o iPhone e o Android não deixam; só uma app nativa:
   no Android com FLAG_SECURE, no iPhone escondendo o ecrã enquanto grava). O que dá para fazer na app web:
   - ao sair do app ou mudar de app, o ecrã fica tapado (a miniatura das apps abertas não mostra os dados);
   - no computador, a tecla Print Screen (e os atalhos de captura que o navegador recebe) tapa o ecrã e limpa a área de transferência;
   - não deixa selecionar, copiar, arrastar nem imprimir o conteúdo dessas páginas (os campos onde escreves continuam normais). */
(() => {
'use strict';
const SENS = /^(senhas|financas|investimentos|ativos|movimentos|despesas|relatorios|corpo|email|eu|admin|definicoes|perfil)(\.|$)/;
const R = document.documentElement, route = () => String(location.hash || '').replace(/^#/, '');
// a conta do dono (perfil pessoal ou administração) fica livre: aí pode tirar prints e gravar o ecrã
const livre = () => !(OS.Acc && OS.Acc.on) || !OS.Acc.pub || !!(OS.Acc.adm && OS.Acc.adm());
const sens = () => !livre() && SENS.test(route()) && !(document.getElementById('splash') && !document.getElementById('splash').hidden);
let t0 = 0;
const cover = (v, ms) => { clearTimeout(t0); R.classList.toggle('esc-on', !!v && sens()); if (v && ms) t0 = setTimeout(() => R.classList.remove('esc-on'), ms); };
const mark = () => R.classList.toggle('esc-sens', sens());
OS.Escudo = { sens, cover, mark };
addEventListener('hashchange', mark); if (OS.on) { OS.on('render', mark); OS.on('unlock', mark); } mark();
// sair do app / mudar de app: tapa já (antes de o sistema tirar a miniatura); ao voltar destapa
document.addEventListener('visibilitychange', () => { if (document.hidden) cover(true); else setTimeout(() => cover(false), 150); });
addEventListener('pagehide', () => cover(true));
addEventListener('blur', () => setTimeout(() => { const a = document.activeElement; if (a && a.tagName === 'IFRAME') return; if (!document.hasFocus()) cover(true); }, 0));
addEventListener('focus', () => cover(false));
document.addEventListener('pointerdown', () => { if (R.classList.contains('esc-on') && !document.hidden) cover(false); }, true);
// computador: Print Screen e atalhos de captura que chegam à página
const shot = e => (e.key === 'PrintScreen' || e.code === 'PrintScreen') || (e.shiftKey && (e.metaKey || e.ctrlKey) && /^[345s]$/i.test(e.key || ''));
document.addEventListener('keydown', e => { if (sens() && shot(e)) cover(true, 2500); }, true);
document.addEventListener('keyup', e => { if (!sens() || !shot(e)) return; cover(true, 2500); try { navigator.clipboard && navigator.clipboard.writeText && navigator.clipboard.writeText('').catch(() => { }); } catch (er) { } }, true);
// copiar, arrastar e imprimir: só fora dos campos de escrever
const field = t => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]'));
['copy', 'cut'].forEach(ev => document.addEventListener(ev, e => { if (sens() && !field(e.target)) e.preventDefault(); }, true));
document.addEventListener('dragstart', e => { if (sens() && !field(e.target)) e.preventDefault(); }, true);
document.addEventListener('contextmenu', e => { if (sens() && !field(e.target) && e.target && e.target.closest && e.target.closest('#view')) e.preventDefault(); }, true);
addEventListener('beforeprint', mark);
})();
