/* PRUMO — a parceria Prumo & seele (v3.92). Por agora a página está vazia: a parceria está "em crisálida".
   Enquanto não tiver nada dentro, só a conta de administração vê a entrada no menu (grupo Parceria) e a página (#seele).
   Quando abrir a todas as contas, basta trocar ABERTA para true. */
(() => {
'use strict';
const UI = OS.UI;
const ABERTA = false;
const adm = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
const ve = () => ABERTA || adm();
const selo = n => { try { return OS.Lock && OS.Lock.logo ? OS.Lock.logo(n) : ''; } catch (e) { return ''; } };
if (!UI.IP.borboleta) UI.IP.borboleta = 'M12 8v11M12 8l-2.2-3.4M12 8l2.2-3.4M12 10C10.4 6.4 6.6 4.6 4.6 5.4S3.8 10.6 7.4 11.8C4.9 12.8 5 17 7.8 17.4S11.2 15.2 12 13.4M12 10c1.6-3.6 5.4-5.4 7.4-4.6s.8 5.2-2.8 6.4c2.5 1 2.4 5.2-.4 5.6S12.8 15.2 12 13.4';

// as fases da parceria, pela ordem da vida de uma borboleta
const FASES = [
  ['Lagarta', 'Combinada', 'A parceria está acertada e já tem casa no Prumo.'],
  ['Crisálida', 'A preparar', 'O que vem para esta página está a ser feito.'],
  ['Borboleta', 'Aberta', 'A página enche-se e abre a todas as contas.']];
const AGORA = 1;

const view = () => {
  if (!ve()) return UI.head('Parceria', '', '', 'Parceria') + `<div class="pn"><p style="margin:0">Esta página ainda não está aberta.</p><p class="mut" style="margin:6px 0 0"><a class="acc" href="#hoje">Voltar ao Hoje</a></p></div>`;
  return UI.head('seele', 'A parceria Prumo &amp; seele.', '', 'Parceria') + `<div class="se-pg">
    <section class="se-hero" aria-label="Prumo &amp; seele">
      <div class="se-marca"><span class="se-selo">${selo(96)}</span><i class="se-e" aria-hidden="true">&amp;</i><span class="se-sl"><img class="se-borb" src="icons/seele-borboleta.webp" width="360" height="252" alt="" decoding="async" draggable="false"><span class="se-nome" role="img" aria-label="seele" style="-webkit-mask-image:url(icons/seele-nome.webp);mask-image:url(icons/seele-nome.webp)"></span></span></div>
      <p class="se-t">Uma parceria nova, ainda em crisálida.</p>
      <p class="se-d">Estamos a preparar o que a seele traz ao Prumo. Quando estiver pronto, esta página enche-se e abre a todas as contas.</p>
    </section>
    <section class="se-ciclo" aria-label="Em que fase está a parceria"><ol>${FASES.map(([n, e, d], i) => `<li class="${i < AGORA ? 'feito' : i === AGORA ? 'agora' : 'depois'}"${i === AGORA ? ' aria-current="step"' : ''}><span class="se-pt" aria-hidden="true"></span><b>${n}</b><em>${i === AGORA ? 'Agora: ' : ''}${e}</em><small>${d}</small></li>`).join('')}</ol></section>
    ${ABERTA ? '' : `<p class="se-adm">${UI.ic('shield')}<span>Só a conta de administração vê esta página e a entrada no menu enquanto ela estiver vazia.</span></p>`}
  </div>`; };
OS.views.seele = view;

/* ---------- a entrada no menu, no grupo Parceria ---------- */
const nav = () => { const N = OS.NAV; if (!N) return; const g = N.find(x => x[0] === 'Parceria'); if (!g) return;
  const i = g[1].findIndex(x => x[0] === 'seele'), v = ve();
  if (v && i < 0) { g[1].push(['seele', 'seele', 'borboleta']); OS.request && OS.request(); }
  else if (!v && i >= 0) { g[1].splice(i, 1); OS.request && OS.request(); } };
// a conta chama navAdm ao entrar, ao sair e ao arrancar: a seele vai atrás
if (OS.Acc) { const A0 = OS.Acc.navAdm; OS.Acc.navAdm = () => { if (A0) A0(); nav(); }; }
OS.on('ready', nav);
OS.Seele = { aberta: () => ABERTA, ve, nav };
})();
