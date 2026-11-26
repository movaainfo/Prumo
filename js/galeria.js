/* PRUMO — a galeria do telemóvel dentro da app da App Store (v3.86).
   Um site (Safari, ou o Prumo no ecrã principal) não pode ler a galeria sozinho: a Apple não deixa. A app do Prumo da App Store (a casca
   Capacitor de lojas/ios) pode, com o plugin @capacitor-community/media e a autorização da pessoa: aqui liga-se essa galeria às Fotos
   (window.PrumoLoja.fotos), que ao abrir e ao voltar à app importam sozinhas as fotos novas. Fora da app nativa isto não faz nada.
   O plugin só lê a galeria no iPhone e no iPad (no Android a app é a da Play Store e as fotos entram pela partilha da Galeria). */
(() => {
'use strict';
const plugin = () => { try { const C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.getPlatform && C.getPlatform() === 'ios' && C.Plugins && C.Plugins.Media || null; } catch (e) { return null; } };
const bytes = m => { const b = atob(String(m.data || '').replace(/^data:[^,]*,/, '')), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const nome = t => 'IMG_' + new Date(t).toISOString().slice(0, 19).replace(/\D/g, '') + '.jpg';
// as mais recentes primeiro, já reduzidas (1280 px chega para ver, comparar e a IA; não enche a memória do telemóvel)
const buscar = async n => { const P = plugin(); if (!P) throw new Error('Sem acesso à galeria.');
  const r = await P.getMedias({ quantity: n, types: 'photos', thumbnailWidth: 1280, thumbnailHeight: 1280, thumbnailQuality: 82, sort: [{ key: 'creationDate', ascending: false }] });
  return ((r && r.medias) || []).filter(m => m && m.data && m.identifier); };
const fotos = {
  // as que entraram na galeria desde a última vez (na primeira vez, as 300 mais recentes)
  novas: async desde => (await buscar(desde ? 150 : 300)).filter(m => !desde || (Date.parse(m.creationDate) || 0) > desde - 6e4).map(m => {
    const t = Date.parse(m.creationDate) || Date.now(), f = new File([bytes(m)], nome(t), { type: 'image/jpeg', lastModified: t }); f.natId = String(m.identifier); return f; }),
  // "Galeria toda": até 500 de uma vez (as Fotos juntam as repetidas e não importam duas vezes a mesma)
  listar: async () => (await buscar(500)).map(m => { const t = Date.parse(m.creationDate) || Date.now(); return { blob: new Blob([bytes(m)], { type: 'image/jpeg' }), nome: nome(t), id: String(m.identifier), data: t }; })
};
const ligar = () => { if (!plugin()) return; window.PrumoLoja = window.PrumoLoja || { on: true, plat: 'ios' }; window.PrumoLoja.fotos = fotos; };
ligar(); window.addEventListener('load', ligar); document.addEventListener('deviceready', ligar);
})();
