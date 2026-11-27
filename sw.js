/* Prumo — service worker: abre instantaneamente e funciona sem internet. */
const V = 'oceanum-9b7336bf32';
const SHELL = ["manifest.webmanifest","apple-touch-icon.png","favicon-32.png","icon-192.png","icon-512.png","icon-maskable-512.png","selo-96.png","som/intro.mp3","vendor/fonts/11adc6349b.woff2","vendor/fonts/2fed1d1b2e.woff2","vendor/fonts/4667f67516.woff2","vendor/fonts/53a6c32636.woff2","vendor/fonts/63551c15ca.woff2","vendor/fonts/9076820487.woff2","vendor/fonts/9ca58f5002.woff2","vendor/fonts/ANTON-OFL.txt","vendor/fonts/anton-latin-ext.woff2","vendor/fonts/anton-latin.woff2","vendor/fonts/b291d87cd7.woff2","vendor/fonts/bodoni-moda.woff2","vendor/fonts/d0980034bf.woff2","vendor/fonts/e09adcd0ca.woff2","vendor/fonts/e2aaf8d658.woff2","vendor/fonts/f377472eee.woff2"];
const SHELLKEY = new URL('./', self.registration.scope).href;
const IMG = 'oceanum-img'; // fotos dos exercícios e dos alimentos: guardadas para funcionarem sem internet
const IMGHOST = /(^|\.)(jsdelivr\.net|themealdb\.com|openfoodfacts\.org|wikimedia\.org|pinimg\.com)$/;
// capas e fotos de fora (animes, livros, futebol, notícias, vídeos): guardadas no aparelho; da segunda vez aparecem logo, sem ir à internet
const PICHOST = /(^|\.)(anilist\.co|kitsu\.app|kitsu\.io|myanimelist\.net|crunchyroll\.com|espncdn\.com|books\.google\.com|googleusercontent\.com|openlibrary\.org|archive\.org|ytimg\.com|ggpht\.com)$/;
const PICMAX = 900; let picN = 0;
// a AniList deixa ler as imagens (CORS): assim ficam guardadas no tamanho real (as opacas ocupam muito mais espaço na cache)
const CORSOK = /(^|\.)anilist\.co$/;
const getPic = (req, u) => CORSOK.test(u.hostname) ? fetch(u.href, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req)) : fetch(req);
const trimPics = () => caches.open(IMG).then(c => c.keys().then(ks => ks.length > PICMAX ? Promise.all(ks.slice(0, ks.length - PICMAX).map(k => c.delete(k))) : 0)).catch(() => { });
// instalar nunca falha: cada ficheiro é guardado à parte (antes, um ficheiro que falhasse no iPhone impedia a versão nova de entrar)
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(x => fetch(x, { cache: 'no-cache' }).then(r => r.ok ? c.put(x, r) : 0).catch(() => 0))))); });
// a cópia da app para usar sem internet é guardada logo a seguir (sem atrasar a entrada da versão nova)
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG && k !== 'prumo-partilha').map(k => caches.delete(k)))).then(() => self.clients.claim())
  .then(() => { fetch(SHELLKEY, { cache: 'no-cache', credentials: 'same-origin' }).then(r => r.ok ? caches.open(V).then(c => c.match(SHELLKEY).then(h => h || c.put(SHELLKEY, r))) : 0).catch(() => { }); })); });
self.addEventListener('fetch', e => {
  // v3.79: partilhar fotos e vídeos da galeria para o Prumo (Android): ficam guardados aqui e as Fotos arrumam-nos ao abrir
  if (e.request.method === 'POST' && /\/partilha\/?$/.test(new URL(e.request.url).pathname)) { e.respondWith((async () => { try { const fd = await e.request.formData(), fs = fd.getAll('media').filter(f => f && f.size), c = await caches.open('prumo-partilha'); let i = 0;
      for (const f of fs) await c.put(new Request(new URL('./__partilha/' + Date.now() + '-' + (i++), self.registration.scope).href), new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-nome': encodeURIComponent(f.name || 'partilha'), 'x-data': String(f.lastModified || Date.now()) } })); } catch (er) { }
    return Response.redirect(new URL('./?app=1#fotos', self.registration.scope).href, 303); })()); return; }
  if (e.request.headers.has('range')) return;   // v3.64: pedidos de áudio/vídeo aos pedaços vão sempre à rede (a cópia inteira fazia o som da intro parar no telemóvel)
  const u = new URL(e.request.url); if (e.request.method !== 'GET') return;
  if (u.searchParams.has('vchk')) return; // verificação de versão: vai sempre à rede
  if (/\/api\//.test(u.pathname)) return; // funções do servidor (cotações, leitor de notícias): sempre à rede, nunca da cache
  if (IMGHOST.test(u.hostname) && /\.(jpe?g|png|webp)$/i.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; })))); return; }
  if (PICHOST.test(u.hostname) && (e.request.destination === 'image' || /\.(jpe?g|png|webp|gif)$/i.test(u.pathname)) && !u.searchParams.has('nitidez')) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || getPic(e.request, u).then(r => { if (r.ok || r.type === 'opaque') { c.put(e.request, r.clone()).catch(() => { }); if (++picN % 40 === 0) trimPics(); } return r; })))); return; }
  if (u.hostname === 'cdnjs.cloudflare.com' && /three\.js/.test(u.pathname)) { e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  if (u.origin !== location.origin) return;
  if (/^\/(termos|privacidade|cookies|direitos|acessibilidade|creditos)(\.html)?$/.test(u.pathname)) return;
  if (/^\/(inicio|planos|apagar-conta)(\.html)?$/.test(u.pathname) || /^\/inicio\//.test(u.pathname)) return; // v3.66: página inicial pública e os vídeos dela: sempre da rede, nunca no lugar da app // documentos legais públicos: páginas à parte, sempre da rede
  // a app: primeiro a internet (abre sempre a versão mais recente; o servidor só manda tudo outra vez quando há versão nova),
  // a cópia guardada só quando não há rede ou a rede demora mais de 4 s
  if (e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) { e.respondWith(fresh(e)); return; }
  if (/\/vendor\//.test(u.pathname)) { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }))); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => { const net = fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit); return hit || net; }));
});
function fresh(e) { const cached = () => caches.match(SHELLKEY).then(h => h || caches.match(e.request, { ignoreSearch: true }));
  const net = fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r; });
  // v3.66: se o servidor respondeu com a página inicial pública (quem ainda não tinha a marca da app), não a guarda no lugar da app
  e.waitUntil(net.then(r => { if (r.headers.get('x-prumo-pagina') === 'inicio') return; const keep = r.clone(); return caches.open(V).then(c => c.put(SHELLKEY, keep)); }).catch(() => { }));
  const plain = r => r.redirected ? new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers }) : r;
  const slow = new Promise(res => setTimeout(res, 4000)).then(cached);
  return Promise.race([net.then(plain, cached), slow.then(h => h || net.then(plain))]).then(r => r || net.then(plain))
    .catch(() => cached().then(h => h || new Response('<meta name="viewport" content="width=device-width"><h2 style="font-family:system-ui;padding:24px">Sem internet. Abre outra vez quando tiveres rede.</h2>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))); }
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
// tocar num aviso (golo, começo do jogo…) abre o Prumo na página certa: usa a janela que já está aberta, se houver
self.addEventListener('notificationclick', e => { e.notification.close(); const h = String((e.notification.data || {}).url || '').replace(/[^#\w.-]/g, ''), url = self.registration.scope + (h.startsWith('#') ? h : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => { const c = L.find(x => x.url.startsWith(self.registration.scope)); if (c) return c.focus().then(w => { try { (w || c).postMessage({ go: h }); } catch (x) { } return w; }); return self.clients.openWindow(url); })); });
// notificações com o app fechado: o servidor do Prumo manda a mensagem cifrada; aqui mostra-se (o toque abre a página do aviso)
self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { t: 'Prumo', b: e.data.text() }; } catch (y) { } }
  const o = { body: String(d.b || ''), icon: 'icon-192.png', data: { url: String(d.u || '#hoje') }, timestamp: +d.at || Date.now() }; if (d.g) { o.tag = String(d.g); o.renotify = true; }
  e.waitUntil(self.registration.showNotification(String(d.t || 'Prumo'), o)); });
