/* PRUMO — modo loja (v3.64). Dentro da app da Play Store (Android, TWA) ou da App Store (iPhone, Capacitor), as lojas exigem que as assinaturas
   digitais se paguem com o sistema delas. Enquanto essa ligação não existe, a app das lojas é "só para usar": não mostra preços, compras,
   códigos de desconto nem caminhos para pagar noutro sítio. Quem já tem conta e plano entra e usa tudo normalmente.
   Deteção: Android abre com document.referrer "android-app://…"; a app do iPhone junta "PrumoApp/ios" ao user agent; ?loja=android|ios para testar. */
(() => {
'use strict';
let plat = '';
try { plat = localStorage.getItem('os2loja') || ''; } catch (e) { }
const q = (location.search.match(/[?&]loja=(android|ios|nao)\b/) || [])[1];
if (q === 'nao') plat = ''; else if (q) plat = q;
else if (/^android-app:\/\//.test(document.referrer || '')) plat = 'android';
else if (/PrumoApp\/ios/.test(navigator.userAgent || '')) plat = 'ios';
try { if (plat) localStorage.setItem('os2loja', plat); else if (q === 'nao') localStorage.removeItem('os2loja'); } catch (e) { }
window.OS = window.OS || {};
OS.Loja = { on: !!plat, plat };
if (plat) document.documentElement.classList.add('loja', 'loja-' + plat);
})();
