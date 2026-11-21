/* PRUMO · entrada (v3.66): quem ainda não usa o Prumo neste navegador vê primeiro a página de apresentação (/inicio).
   A app abre direto com a marca do navegador (cookie prumo_app), ?app / ?loja / ?conta, na app instalada (ecrã inteiro, Play Store, iPhone)
   ou quando já há dados do Prumo guardados aqui. Corre antes de tudo: o resto da app nem chega a carregar. */
(function () {
  var deve = function (o) { return !(o.marca || o.query || o.appLoja || o.instalada || o.dados || o.local); };
  var o = {}; try {
    o.marca = /(^|;\s*)prumo_app=/.test(document.cookie);
    o.query = /[?&](app|loja|conta|vchk|ver)\b/.test(location.search);
    o.appLoja = /PrumoApp/.test(navigator.userAgent) || /^android-app:/.test(document.referrer || '');
    o.instalada = !!(window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || !!navigator.standalone;
    o.local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var ls = window.localStorage; for (var i = 0; ls && i < ls.length; i++) { if (/^(nau:|os2)/.test(ls.key(i))) { o.dados = true; break; } }
  } catch (e) { o.dados = true; }
  window.PrumoEntrada = { deve: deve, estado: o };
  if (deve(o)) location.replace('inicio' + location.hash);
})();
