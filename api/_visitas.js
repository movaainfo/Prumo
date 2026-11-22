// PRUMO · estatística de visitas (v3.69), própria e sem cookies.
// Conta, de forma agregada, as visitas à página inicial e à app: página, visitantes únicos do dia, país, origem (Google, Instagram…),
// aparelho e cliques em "Começar". Não guarda o endereço IP: o visitante único é um código que muda todos os dias e só vive na memória
// do servidor. Os números ficam nos contadores do dia (st/<dia>/…), os mesmos do relatório semanal, e a administração vê-os no painel Visitas.
'use strict';
const N = require('./_nuvem');
const crypto = require('crypto');
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse|pagespeed|curl|wget|python|axios|node-fetch|go-http|java\//i;
const VISTOS = new Map(); // código do dia → 1 (só nesta instância do servidor; reinicia todos os dias)
let DIA_V = '';
const PAGINAS = new Set(['inicio', 'app', 'planos', 'termos', 'privacidade', 'cta']);
const CTA = new Set(['criar', 'entrar', 'selo', 'plano', 'tutorial']);
// de onde veio: utm_source ou o domínio do referrer, normalizado
const origem = (r) => { const s = String(r || '').toLowerCase().replace(/^www\./, '').slice(0, 80);
  if (!s || s === 'direto') return 'direto';
  const M = [[/google\./, 'Google'], [/bing\./, 'Bing'], [/duckduckgo/, 'DuckDuckGo'], [/(^|\.)instagram\.|^ig$/, 'Instagram'], [/facebook\.|fb\.|^fb$/, 'Facebook'], [/(^|\.)t\.co$|twitter|(^|\.)x\.com/, 'X'],
    [/linkedin|lnkd/, 'LinkedIn'], [/tiktok/, 'TikTok'], [/youtube|youtu\.be/, 'YouTube'], [/whatsapp|wa\.me/, 'WhatsApp'], [/telegram|t\.me/, 'Telegram'], [/reddit/, 'Reddit'], [/chatgpt|openai/, 'ChatGPT'], [/claude\.ai|anthropic/, 'Claude'], [/perplexity/, 'Perplexity']];
  for (const [re, n] of M) if (re.test(s)) return n;
  return s.replace(/[^a-z0-9.-]/g, '').slice(0, 40) || 'outro'; };
const registar = async (req, b) => {
  const ua = String((req.headers && req.headers['user-agent']) || '');
  if (BOT.test(ua) || (process.env.VERCEL && /HeadlessChrome/.test(ua))) return { ok2: false };
  if (N.limit(req, 'visita', 60, 3600e3)) return { ok2: false };
  const p = PAGINAS.has(b.p) ? b.p : null; if (!p) return { ok2: false };
  if (p === 'cta') { const c = CTA.has(b.c) ? b.c : 'outro'; N.count('visc:' + c); return { ok2: true }; }
  const hoje = new Date().toISOString().slice(0, 10); if (hoje !== DIA_V) { VISTOS.clear(); DIA_V = hoje; }
  const cod = crypto.createHash('sha256').update(N.ipTag(req) + '|' + ua.slice(0, 120) + '|' + p).digest('hex').slice(0, 16);
  N.count('vis:' + p);
  if (!VISTOS.has(cod)) { if (VISTOS.size > 50000) VISTOS.clear(); VISTOS.set(cod, 1);
    N.count('visu:' + p);
    const pais = String((req.headers && req.headers['x-vercel-ip-country']) || '').replace(/[^A-Z]/g, '').slice(0, 2) || '??'; N.count('visp:' + pais);
    N.count('visr:' + origem(b.r));
    const d = /^(tel|tablet|pc)$/.test(b.d) ? b.d : '?'; N.count('visd:' + d);
    const l = String(b.l || '').replace(/[^a-zA-Z-]/g, '').slice(0, 5).toLowerCase(); if (l) N.count('visl:' + l.slice(0, 2)); }
  return { ok2: true }; };

// junta os ficheiros de contadores de um dia num só (st/<dia>/_dia.json = { t: totais, de: [ficheiros já somados] }): o painel e o relatório
// leem 1 ficheiro em vez de centenas. Seguro com várias instâncias: só grava se o _dia.json não mudou entretanto (etag), e quem lê ignora
// as partes que o _dia.json já contém (se apagar falhar, nada conta a dobrar).
const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); };
const somaDia = async (s, d, compactar) => { const L = await s.list('st/' + d + '/'); const DIA = 'st/' + d + '/_dia.json';
  let base = { t: {}, de: [] }, etag = null; if (L.some(b => b.pathname === DIA)) { try { const g = await s.get(DIA); if (g) { const o = JSON.parse(g.buf.toString()); etag = g.etag; if (o && o.t) base = { t: o.t, de: o.de || [] }; } } catch (e) { } }
  const ja = new Set(base.de), T = Object.assign({}, base.t), novas = [];
  const partes = L.filter(b => b.pathname !== DIA && !ja.has(b.pathname));
  await pool(partes, 12, async b => { try { const g = await s.get(b.pathname); const o = g && JSON.parse(g.buf.toString()); if (!o) return; Object.entries(o).forEach(([k, v]) => { T[k] = (T[k] || 0) + (+v || 0); }); novas.push(b); } catch (e) { } });
  if (compactar && (novas.length > 1 || (novas.length && etag))) { try {
      const de = novas.map(b => b.pathname); await s.put(DIA, Buffer.from(JSON.stringify({ t: T, de })), etag ? { ifMatch: etag } : { overwrite: false });
      const velhas = L.filter(b => ja.has(b.pathname) || de.includes(b.pathname)); if (velhas.length) await s.del(velhas); } catch (e) { } }
  return T; };
const compactar = async (dias = 3) => { const s = N.store(); if (!s) return 0; let n = 0; for (let i = 0; i < dias; i++) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); await somaDia(s, d, true); n++; } return n; };

const top = (T, pre, n = 8) => Object.entries(T).filter(([k]) => k.startsWith(pre)).map(([k, v]) => [k.slice(pre.length), v]).sort((a, b) => b[1] - a[1]).slice(0, n);
const ler = async (dias = 7) => { const s = N.store(); if (!s) throw N.err('store', 'Sem base de dados.', 503); await N.flushCounts(true);
  dias = Math.max(1, Math.min(30, Math.round(+dias || 7))); const D = []; for (let i = dias - 1; i >= 0; i--) D.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const tot = {}, serie = [];
  for (const d of D) { const T = await somaDia(s, d, true); Object.entries(T).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; });
    serie.push({ d, v: T['vis:inicio'] || 0, u: T['visu:inicio'] || 0, app: T['visu:app'] || 0, cta: Object.entries(T).filter(([k]) => k.startsWith('visc:')).reduce((n, [, v]) => n + v, 0), reg: T.registo || 0, pag: T.pagamento || 0 }); }
  const unicos = tot['visu:inicio'] || 0, reg = tot.registo || 0;
  return { dias, serie, totais: { visitas: tot['vis:inicio'] || 0, unicos, app: tot['visu:app'] || 0, cliques: Object.entries(tot).filter(([k]) => k.startsWith('visc:')).reduce((n, [, v]) => n + v, 0), registos: reg, pagamentos: tot.pagamento || 0, conversao: unicos ? Math.round(reg / unicos * 1000) / 10 : 0 },
    origens: top(tot, 'visr:'), paises: top(tot, 'visp:'), aparelhos: top(tot, 'visd:', 4), linguas: top(tot, 'visl:', 6), cliques: top(tot, 'visc:', 6), paginas: top(tot, 'visu:', 6) }; };
// soma um grupo de contadores (ex.: 'av:' do antivírus) nos últimos dias
const contar = async (pre, dias = 30) => { const s = N.store(); if (!s) throw N.err('store', 'Sem base de dados.', 503); await N.flushCounts(true); const T = {};
  for (let i = 0; i < Math.min(35, dias); i++) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), t = await somaDia(s, d, i < 2); Object.entries(t).forEach(([k, v]) => { if (k.startsWith(pre)) T[k.slice(pre.length)] = (T[k.slice(pre.length)] || 0) + v; }); }
  return T; };
module.exports = { registar, ler, compactar, somaDia, contar, origem };
