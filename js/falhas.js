/* PRUMO — registo de falhas do app (v3.64). Quando algo rebenta no aparelho de alguém, o app manda ao servidor só a mensagem do erro e onde foi
   (ficheiro:linha, versão, página), sem dados pessoais (e-mails e números longos são tapados). O servidor conta-as para o relatório da semana.
   No máximo 5 por sessão e sem repetir a mesma; erros de extensões do navegador e de outros sites não contam. */
(() => {
'use strict';
const SENT = new Set(); let n = 0;
const clean = s => String(s || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<e-mail>').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').trim().slice(0, 160);
const where = (src, l, c) => { try { const u = new URL(src, location.href); if (u.origin !== location.origin) return null; return (u.pathname.split('/').pop() || 'index') + ':' + (l || 0) + ':' + (c || 0); } catch (e) { return src ? null : 'inline:' + (l || 0); } };
const NOISE = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection|AbortError|The operation was aborted|Load failed|Failed to fetch|NetworkError|cancelled|play\(\) (request|failed)|NotAllowedError/i;
const report = (msg, at) => { if (n >= 5 || !msg || NOISE.test(msg) || at === null) return; const m = clean(msg), k = m + '@' + at; if (SENT.has(k)) return; SENT.add(k); n++;
  const v = (window.OCEANUM_VERSION && window.OCEANUM_VERSION.v) || '', r = String(location.hash || '').replace(/^#/, '').split(/[.?/]/)[0].slice(0, 24) || 'inicio';
  const dev = innerWidth < 700 ? 'tel' : innerWidth < 1100 ? 'tablet' : 'pc';
  try { fetch(new URL('api/conta', document.baseURI).href, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'falha', m, at, v, r, dev }) }).catch(() => { }); } catch (e) { } };
window.addEventListener('error', e => { if (e && e.target && e.target !== window) return; report(e && (e.message || (e.error && e.error.message)), where(e && e.filename, e && e.lineno, e && e.colno)); });
window.addEventListener('unhandledrejection', e => { const r = e && e.reason; const st = r && r.stack ? String(r.stack).split('\n').find(x => x.includes(location.origin)) : ''; const mm = st && /([^/]+\.js):(\d+):(\d+)/.exec(st);
  report(r && (r.message || String(r)), mm ? mm[1] + ':' + mm[2] + ':' + mm[3] : 'promessa'); });
window.PrumoFalha = report;   /* para os testes e para outras partes do app */
/* v3.69: estatística de visitas (sem cookies, sem dados pessoais): um aviso por abertura do app; o servidor só conta */
setTimeout(() => { try { const q = new URLSearchParams(location.search), L = window.PrumoLoja; let r = q.get('utm_source') || (L && L.on ? 'loja-' + (L.plat || 'app') : '');
  if (!r && document.referrer) { try { const h = new URL(document.referrer).hostname; if (h !== location.hostname) r = h; } catch (e) { } }
  fetch(new URL('api/conta', document.baseURI).href, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'visita', p: 'app', r: r || 'direto', d: innerWidth < 700 ? 'tel' : innerWidth < 1100 ? 'tablet' : 'pc', l: navigator.language || '' }) }).catch(() => { }); } catch (e) { } }, 2500);
})();
