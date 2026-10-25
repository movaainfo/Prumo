/* PRUMO — Spotify: um tocador pequenino que fica no canto, no ecrã de entrada e dentro do app (a música continua ao entrar).
   Duas maneiras:
   1) Ligar a conta Spotify (PKCE, sem segredo): controla o teu Spotify a tocar no telemóvel ou no computador — música atual com a capa,
      tocar/pausar, anterior/seguinte, escolher uma playlist tua, procurar músicas e escolher o aparelho. O Spotify só deixa uma app
      "em desenvolvimento" ser usada por 5 contas (que o dono da app autoriza no painel do Spotify) e o controlo precisa de Premium.
   2) Para todos, sem ligar conta: o tocador do Spotify (embed) com uma playlist ou álbum à escolha. Toca as músicas inteiras se tiveres
      sessão iniciada no Spotify neste navegador; sem sessão, toca excertos de 30 segundos.
   O token fica só neste aparelho. A Client ID (pública) vem do servidor (SPOTIFY_CLIENT_ID) ou de Definições › Spotify. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, LS = U.ls;
const ACC = 'https://accounts.spotify.com', API = 'https://api.spotify.com/v1';
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative';
const K = { tok: 'nau:sp:tok', cid: 'nau:sp:cid', ui: 'nau:sp:ui', emb: 'nau:sp:emb', pk: 'nau:sp:pk' };
const redirect = () => location.origin + location.pathname;
// só para o administrador e as contas que ele escolheu (no Admin): para as outras pessoas o Spotify nem aparece
const allowed = () => !!(OS.Acc && OS.Acc.spOk && OS.Acc.spOk());
const cid = () => String((OS.Acc && OS.Acc.adm && OS.Acc.adm() && LS.get(K.cid, '')) || (OS.Acc && OS.Acc.spCid ? OS.Acc.spCid() : '') || '').trim();
const ui = () => Object.assign({ on: true, min: false }, LS.get(K.ui, {}) || {}), setUi = o => { LS.set(K.ui, Object.assign(ui(), o)); draw(); };
const tok = () => LS.get(K.tok, null);
const linked = () => !!(tok() && tok().r);

/* ---------- entrar (PKCE) ---------- */
const rnd = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, x => ('0' + (x & 63).toString(36)).slice(-1)).join('') + Array.from(a.slice(0, 8), x => x.toString(16)).join(''); };
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
A.spConnect = async () => { if (!allowed()) return; if (!cid()) { UI.toast('O Spotify ainda não está configurado neste Prumo (falta a Client ID em Definições › Spotify).', 'warn'); return; }
  const v = rnd(64), st = rnd(16), ch = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
  LS.set(K.pk, { v, st, h: location.hash || '#hoje', at: Date.now() });
  location.href = ACC + '/authorize?' + new URLSearchParams({ client_id: cid(), response_type: 'code', redirect_uri: redirect(), code_challenge_method: 'S256', code_challenge: ch, scope: SCOPES, state: st }); };
const tokenReq = async body => { const r = await fetch(ACC + '/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) }), j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || 'O Spotify não aceitou o pedido.'); return j; };
const keep = (j, old) => LS.set(K.tok, { a: j.access_token, r: j.refresh_token || (old && old.r) || '', exp: Date.now() + (j.expires_in || 3600) * 1000 - 60e3 });
// de volta do Spotify: ?code=…&state=… no endereço
(async () => { const q = new URLSearchParams(location.search), code = q.get('code'), st = q.get('state'), err = q.get('error'), pk = LS.get(K.pk, null); if (!pk || (!code && !err) || st !== pk.st) return;
  LS.del ? LS.del(K.pk) : LS.set(K.pk, null);
  try { history.replaceState(null, '', location.pathname + (pk.h || '#hoje')); } catch (e) { }
  if (err) { setTimeout(() => UI.toast('Não ligaste o Spotify (' + err + ').', 'warn'), 1500); return; }
  try { keep(await tokenReq({ grant_type: 'authorization_code', code, redirect_uri: redirect(), client_id: cid(), code_verifier: pk.v })); setUi({ on: true, min: false }); setTimeout(() => UI.toast('Spotify ligado', 'pos'), 1200); poll(true); }
  catch (e) { setTimeout(() => UI.toast('Não consegui ligar o Spotify: ' + e.message, 'neg'), 1500); } })();
let RT = null;
const access = async () => { const t = tok(); if (!t) throw new Error('sem conta'); if (t.a && Date.now() < t.exp) return t.a;
  if (!RT) RT = tokenReq({ grant_type: 'refresh_token', refresh_token: t.r, client_id: cid() }).then(j => { keep(j, t); return j.access_token; }).finally(() => { RT = null; }); return RT; };
A.spOut = () => { LS.set(K.tok, null); ST = null; draw(); OS.request && OS.request(); UI.toast('Spotify desligado neste aparelho', 'pos'); };

/* ---------- a API ---------- */
const sp = async (path, o = {}) => { const go = async a => fetch(API + path, Object.assign({}, o, { headers: Object.assign({ Authorization: 'Bearer ' + a }, o.body ? { 'Content-Type': 'application/json' } : {}) }));
  let r = await go(await access()); if (r.status === 401) { const t = tok(); if (t) { t.exp = 0; LS.set(K.tok, t); } r = await go(await access()); }
  if (r.status === 204 || r.status === 202) return null; const j = await r.json().catch(() => null);
  if (!r.ok) { const m = (j && j.error && (j.error.reason || j.error.message)) || 'erro ' + r.status;
    throw Object.assign(new Error(r.status === 403 && /premium/i.test(m) ? 'Controlar a música precisa do Spotify Premium.' : r.status === 403 ? 'Esta conta Spotify ainda não está autorizada nesta app (o Spotify só deixa 5 contas; pede ao administrador).' : r.status === 404 || /NO_ACTIVE_DEVICE/.test(m) ? 'Abre o Spotify no telemóvel ou no computador e toca qualquer coisa: depois controlas daqui.' : r.status === 429 ? 'O Spotify pediu para esperar um pouco.' : m), { status: r.status }); }
  return j; };
let ST = null, ERR = '', PT = 0;
const poll = async now => { clearTimeout(PT); if (!allowed() || !linked() || !ui().on) return; if (document.hidden && !now) { PT = setTimeout(poll, 15e3); return; }
  try { ST = await sp('/me/player?additional_types=episode'); ERR = ''; } catch (e) { if (e.status !== 429) ERR = e.message; }
  draw(); PT = setTimeout(poll, ST && ST.is_playing ? 4000 : 9000); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(true); });
const ctl = async (path, method = 'POST', body) => { try { await sp(path, { method, body: body ? JSON.stringify(body) : undefined }); setTimeout(() => poll(true), 350); } catch (e) { UI.toast(e.message, 'warn'); } };
A.spPlay = () => { if (ST && ST.is_playing) { ST.is_playing = false; draw(); return ctl('/me/player/pause', 'PUT'); } if (ST) { ST.is_playing = true; draw(); } return ctl('/me/player/play', 'PUT'); };
A.spNext = () => ctl('/me/player/next'); A.spPrev = () => ctl('/me/player/previous');
A.spCtx = b => { ctl('/me/player/play', 'PUT', { context_uri: b.dataset.u }); closeSheet(); };
A.spTrack = b => { ctl('/me/player/play', 'PUT', { uris: [b.dataset.u] }); closeSheet(); };
A.spDev = b => { ctl('/me/player', 'PUT', { device_ids: [b.dataset.d], play: true }); closeSheet(); };
A.spMin = () => setUi({ min: !ui().min }); A.spHide = () => { setUi({ on: false }); UI.toast('Tocador escondido. Volta a abri-lo em Definições › Spotify.', 'pos'); };
A.spShow = () => { setUi({ on: true, min: false, show: true }); poll(true); };

/* ---------- sem conta: o tocador do Spotify (embed) com uma playlist à escolha ---------- */
const DEF = 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ';   // Deep Focus (Spotify)
const uriOf = s => { s = String(s || '').trim(); let m = s.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]{10,})$/); if (m) return `spotify:${m[1]}:${m[2]}`;
  m = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]{10,})/); return m ? `spotify:${m[1]}:${m[2]}` : ''; };
const emb = () => uriOf(LS.get(K.emb, '')) || DEF;
const embUrl = u => { const [, t, id] = u.split(':'); return `https://open.spotify.com/embed/${t}/${id}?utm_source=prumo&theme=0`; };
OS.forms.spEmb = (f, v) => { const u = uriOf(v('u')); if (!u) return UI.toast('Cola um link do Spotify (playlist, álbum, música ou podcast).', 'warn'); LS.set(K.emb, u); EMBU = ''; setUi({ on: true, min: false }); UI.toast('Tocador pronto', 'pos'); };

/* ---------- a janela pequenina (fica fora da página: não pára ao mudar de ecrã) ---------- */
let el = null, EMBU = '';
const ic = n => ({ play: 'M8 5v14l11-7z', pause: 'M7 5h4v14H7zM13 5h4v14h-4z', next: 'M6 6l8.5 6L6 18zM16 6h2v12h-2z', prev: 'M18 6l-8.5 6L18 18zM6 6h2v12H6z', list: 'M4 6h16M4 12h16M4 18h10', min: 'M6 12h12', x: 'M6 6l12 12M18 6L6 18', up: 'M6 15l6-6 6 6' })[n];
const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ic(n)}"/></svg>`;
const logo = '<svg class="spm-logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1ED760"/><path d="M6.5 9.3c3.8-1.1 8-.8 11.2 1M7.2 12.5c3.1-.9 6.5-.6 9.2.9M7.8 15.4c2.5-.6 5.1-.4 7.2.8" stroke="#000" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
const draw = () => { const u = ui(), want = allowed() && u.on && (linked() || LS.get(K.emb, '') || u.show);
  if (!want) { if (el) { el.remove(); el = null; EMBU = ''; } return; }
  if (!el) { el = document.createElement('div'); el.id = 'spMini'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Spotify'); document.body.appendChild(el); }
  el.classList.toggle('min', !!u.min); el.classList.toggle('emb', !linked());
  if (!linked()) { const e = emb(); if (EMBU !== e || !el.querySelector('iframe')) { EMBU = e;
      el.innerHTML = `<div class="spm-bar">${logo}<b>Spotify</b><span class="grow"></span><button type="button" data-act="spMin" aria-label="${u.min ? 'Abrir' : 'Minimizar'}">${svg(u.min ? 'up' : 'min')}</button><button type="button" data-act="spHide" aria-label="Fechar">${svg('x')}</button></div>
        <iframe class="spm-if" src="${embUrl(e)}" title="Spotify" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`; }
    else { const b = el.querySelector('[data-act=spMin]'); if (b) { b.innerHTML = svg(u.min ? 'up' : 'min'); b.setAttribute('aria-label', u.min ? 'Abrir' : 'Minimizar'); } }
    return; }
  const it = ST && ST.item, img = it ? ((it.album || it.show || {}).images || it.images || []).slice(-2)[0] : null, art = it ? (it.artists || []).map(a => a.name).join(', ') || (it.show || {}).name || '' : '';
  const play = ST && ST.is_playing, dev = ST && ST.device ? ST.device.name : '';
  el.innerHTML = u.min ? `<button type="button" class="spm-bub" data-act="spMin" aria-label="Abrir o Spotify">${img ? `<img src="${esc(img.url)}" alt="">` : logo}${play ? '<i class="spm-eq"><b></b><b></b><b></b></i>' : ''}</button>`
    : `<div class="spm-card">${img ? `<img class="spm-art" src="${esc(img.url)}" alt="">` : `<span class="spm-art none">${logo}</span>`}
      <div class="spm-t"><b>${it ? esc(it.name) : ERR ? 'Spotify' : 'Nada a tocar'}</b><small>${it ? esc(art) : esc(ERR || 'Abre o Spotify e toca uma música')}${dev && it ? ' · ' + esc(dev) : ''}</small></div>
      <div class="spm-c"><button type="button" data-act="spPrev" aria-label="Anterior">${svg('prev')}</button><button type="button" class="pp" data-act="spPlay" aria-label="${play ? 'Pausar' : 'Tocar'}">${svg(play ? 'pause' : 'play')}</button><button type="button" data-act="spNext" aria-label="Seguinte">${svg('next')}</button></div>
      <div class="spm-x"><button type="button" data-act="spSheet" aria-label="Escolher música">${svg('list')}</button><button type="button" data-act="spMin" aria-label="Minimizar">${svg('min')}</button></div>
      ${it && ST.progress_ms != null ? `<i class="spm-pr" style="--p:${Math.min(1, ST.progress_ms / Math.max(1, it.duration_ms || 1)).toFixed(3)}"></i>` : ''}</div>`; };

/* ---------- escolher: as tuas playlists, procurar, aparelhos ---------- */
let SH = null, SQ = '', RES = null, PL = null, DV = null;
const closeSheet = () => { if (SH) { SH.remove(); SH = null; } };
const sheet = () => { if (!SH) { SH = document.createElement('div'); SH.className = 'spm-sheet'; SH.setAttribute('role', 'dialog'); SH.setAttribute('aria-label', 'Escolher música'); document.body.appendChild(SH); SH.addEventListener('click', e => { if (e.target === SH) closeSheet(); }); }
  const row = (u, img, t, s, act) => `<button type="button" class="spm-r" data-act="${act}" data-u="${esc(u)}">${img ? `<img src="${esc(img)}" alt="">` : '<span class="spm-ph"></span>'}<span><b>${esc(t)}</b><small>${esc(s || '')}</small></span></button>`;
  SH.innerHTML = `<div class="spm-box"><div class="spm-sh"><b>Spotify</b><button type="button" class="btn sm" data-act="spClose">Fechar</button></div>
    <form data-form="spSearch" class="row gap8"><input class="field grow" name="q" value="${esc(SQ)}" placeholder="Procurar música, artista ou playlist" aria-label="Procurar no Spotify"><button class="btn sm pri">Procurar</button></form>
    ${RES ? `<div class="spm-l">${(RES.tracks || []).map(x => row(x.uri, ((x.album || {}).images || []).slice(-1)[0]?.url, x.name, (x.artists || []).map(a => a.name).join(', '), 'spTrack')).join('')}${(RES.playlists || []).map(x => row(x.uri, ((x.images || [])[0] || {}).url, x.name, 'Playlist', 'spCtx')).join('')}</div>` : ''}
    <h4>As tuas playlists</h4><div class="spm-l">${PL ? PL.map(x => row(x.uri, ((x.images || [])[0] || {}).url, x.name, (x.tracks && x.tracks.total ? x.tracks.total + ' músicas' : 'Playlist'), 'spCtx')).join('') || '<p class="mut">Sem playlists.</p>' : '<div class="sai-busy"><div class="fd-spin"></div><span>A abrir…</span></div>'}</div>
    <h4>Tocar em</h4><div class="spm-l">${DV ? DV.map(d => `<button type="button" class="spm-r" data-act="spDev" data-d="${esc(d.id)}"><span class="spm-ph dev"></span><span><b>${esc(d.name)}</b><small>${esc(d.type)}${d.is_active ? ' · a tocar aqui' : ''}</small></span></button>`).join('') || '<p class="mut">Nenhum aparelho com o Spotify aberto.</p>' : ''}</div></div>`; };
A.spSheet = async () => { if (!allowed() || !linked()) return; PL = null; DV = null; sheet();
  try { const [p, d] = await Promise.all([sp('/me/playlists?limit=30'), sp('/me/player/devices')]); PL = ((p && p.items) || []).filter(Boolean); DV = (d && d.devices) || []; } catch (e) { PL = []; DV = []; UI.toast(e.message, 'warn'); } if (SH) sheet(); };
A.spClose = closeSheet;
OS.forms.spSearch = async (f, v) => { SQ = v('q'); if (!SQ) return; try { const j = await sp('/search?' + new URLSearchParams({ q: SQ, type: 'track,playlist', limit: '8' })); RES = { tracks: ((j.tracks || {}).items || []).filter(Boolean), playlists: ((j.playlists || {}).items || []).filter(Boolean).slice(0, 5) }; } catch (e) { UI.toast(e.message, 'warn'); } if (SH) sheet(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && SH) closeSheet(); });

/* ---------- Definições › Spotify ---------- */
// a Client ID (pública) vem com a conta, só para quem pode usar o Spotify
OS.forms.spCid = (f, v) => { const x = v('cid'); if (x && !/^[a-f0-9]{32}$/i.test(x)) return UI.toast('A Client ID do Spotify tem 32 letras e números.', 'warn'); LS.set(K.cid, x); UI.toast(x ? 'Client ID guardada neste aparelho' : 'A usar a Client ID do servidor', 'pos'); OS.request(); };
const panel = () => { if (!allowed()) return ''; const L = linked(), it = ST && ST.item;
  return `<div class="pn" id="spSet"><div class="pn-h"><h3>${UI.ic('play')}Spotify</h3><span class="mut">${L ? 'ligado' : LS.get(K.emb, '') ? 'tocador sem conta' : 'desligado'}</span></div>
    <p class="mut" style="margin:0 0 10px">Um tocador pequenino no canto, no ecrã de entrada e dentro do app: a música continua quando entras.</p>
    <h4 style="margin:6px 0">Com a tua conta Spotify</h4><p class="mut" style="margin:0 0 8px">Controlas o Spotify do telemóvel ou do computador: a música atual, tocar e pausar, passar, as tuas playlists, procurar e escolher o aparelho. Precisa de Premium para controlar. Por regra do Spotify, cada app pequena só pode ser usada por 5 contas autorizadas.</p>
    <div class="row gap8" style="flex-wrap:wrap">${L ? `<button class="btn sm" data-act="spShow">Mostrar o tocador</button><button class="btn sm ghost" data-act="spOut">Desligar</button>` : `<button class="btn sm pri" data-act="spConnect" ${cid() ? '' : 'disabled'}>Ligar o Spotify</button>`}</div>
    ${L && it ? `<p class="mut" style="margin:8px 0 0">A tocar: ${esc(it.name)}</p>` : ''}
    <h4 style="margin:16px 0 6px">Sem conta (para todos)</h4><p class="mut" style="margin:0 0 8px">Cola o link de uma playlist, álbum ou música do Spotify. Toca as músicas inteiras se tiveres sessão iniciada no Spotify neste navegador; sem sessão, toca excertos de 30 segundos.</p>
    ${!L && LS.get(K.emb, '') ? '<button class="btn sm" data-act="spShow" style="margin:0 0 8px">Mostrar o tocador</button>' : ''}<form data-form="spEmb" class="row gap8"><input class="field grow" name="u" placeholder="https://open.spotify.com/playlist/…" value="${esc(LS.get(K.emb, '') ? LS.get(K.emb, '') : '')}"><button class="btn sm">Usar</button></form>
    ${OS.Acc && OS.Acc.adm && OS.Acc.adm() ? `<details class="tog" style="margin-top:12px"><summary><span>Configurar (administrador)</span></summary><div style="padding:8px 0">
      <p class="mut" style="margin:0 0 8px">1) Em developer.spotify.com › Dashboard › Create app, com Web API. 2) Redirect URIs: <b>${esc(redirect())}</b>${location.host !== 'prumo-vida.vercel.app' ? '' : ' e https://nautilo-app.vercel.app/'}. 3) Em User Management, junta o e-mail Spotify de cada pessoa (até 5). 4) Copia a Client ID (é pública) para a Vercel, como SPOTIFY_CLIENT_ID, ou cola-a aqui só para este aparelho. Quem pode usar escolhe-se no Admin (tu e mais até 4 contas).</p>
      <form data-form="spCid" class="row gap8"><input class="field grow mono" name="cid" value="${esc(LS.get(K.cid, '') || '')}" placeholder="${OS.Acc.spCid() ? 'Do servidor: ' + OS.Acc.spCid().slice(0, 6) + '…' : 'Client ID'}"><button class="btn sm">Guardar</button></form></div></details>` : ''}</div>`; };
OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._sp) return; OS.views.definicoes = sub => o(sub) + (String(sub || '') === '' ? panel() : ''); OS.views.definicoes._sp = 1; });

/* ---------- arranque ---------- */
draw(); if (linked()) poll(true);
OS.on('ready', () => { draw(); if (linked()) poll(true); });
OS.Spot = { linked, draw: () => { draw(); if (allowed() && linked()) poll(true); else clearTimeout(PT); }, poll, uriOf, panel, allowed };
})();
