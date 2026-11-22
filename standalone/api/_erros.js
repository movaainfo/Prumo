// PRUMO · erros e quedas (v3.70). Junta, por dia, as falhas da app (registadas pelo js/falhas.js: mensagem e onde foi), os erros do servidor
// (respostas 500 por rota) e as falhas da verificação de saúde. A administração vê-os agrupados no separador Servidor, com os novos assinalados.
// A cada hora (com a verificação de saúde) compara com a hora anterior: um erro novo que se repete, ou um pico de erros, manda um e-mail
// à administração (no máximo um a cada 6 horas). Só números e mensagens técnicas, sem dados pessoais (o falhas.js já tapa e-mails e números).
'use strict';
const N = require('./_nuvem'), V = require('./_visitas');
const SNAP = 'cfg/erros-snap.json', DIA = 864e5;
const iso = t => new Date(t).toISOString().slice(0, 10);
const dias = async (s, n, compactar) => { const D = []; for (let i = n - 1; i >= 0; i--) { const d = iso(Date.now() - i * DIA); D.push({ d, t: await V.somaDia(s, d, compactar && i < 2) }); } return D; };
const so = (T, pre) => Object.entries(T).filter(([k]) => k.startsWith(pre)).map(([k, v]) => [k.slice(pre.length), v]);
const resumo = async (n = 7) => { const s = N.store(); if (!s) throw N.err('store', 'Sem base de dados.', 503); await N.flushCounts(true);
  n = Math.max(2, Math.min(30, +n || 7)); const D = await dias(s, n, true), G = {}, SRV = {}, VER = {};
  D.forEach(({ d, t }, i) => { so(t, 'app:').forEach(([k, v]) => { const g = G[k] = G[k] || { k, n: 0, dias: 0, prim: d, ult: d, hoje: 0 }; g.n += v; g.dias++; g.ult = d; if (i === D.length - 1) g.hoje = v; });
    so(t, 'erro:').forEach(([k, v]) => { SRV[k] = (SRV[k] || 0) + v; }); so(t, 'appv:').forEach(([k, v]) => { VER[k] = (VER[k] || 0) + v; }); });
  const ontem = iso(Date.now() - DIA), grupos = Object.values(G).map(g => Object.assign(g, { novo: g.prim >= ontem && D.length > 2 })).sort((a, b) => b.novo - a.novo || b.n - a.n).slice(0, 20);
  const serie = D.map(({ d, t }) => ({ d, app: so(t, 'app:').reduce((a, [, v]) => a + v, 0), srv: so(t, 'erro:').reduce((a, [, v]) => a + v, 0), saude: t.saude_falha || 0 }));
  return { dias: n, serie, grupos, servidor: Object.entries(SRV).sort((a, b) => b[1] - a[1]).slice(0, 10), versoes: Object.entries(VER).sort((a, b) => b[1] - a[1]).slice(0, 8),
    totais: { app: serie.reduce((a, x) => a + x.app, 0), srv: serie.reduce((a, x) => a + x.srv, 0), novos: grupos.filter(g => g.novo).length } }; };
// de hora a hora: o que mudou desde a última vez? (erro novo que se repete ou pico) → e-mail à administração
const vigiar = async (o = {}) => { const s = N.store(); if (!s) return { alerta: false }; await N.flushCounts(true);
  let P = { d: '', t: {}, alertAt: 0 }; try { const g = await s.get(SNAP); if (g) P = JSON.parse(g.buf.toString()); } catch (e) { }
  const hoje = iso(Date.now()), D = await dias(s, 8, false), T = D[D.length - 1].t, antes = new Set(); D.slice(0, -1).forEach(({ t }) => so(t, 'app:').forEach(([k]) => antes.add(k)));
  const atual = {}; Object.entries(T).forEach(([k, v]) => { if (/^(app|erro):/.test(k)) atual[k] = v; });
  const base = P.d === hoje ? P.t : {}, delta = {}; Object.entries(atual).forEach(([k, v]) => { const x = v - (base[k] || 0); if (x > 0) delta[k] = x; });
  const novos = Object.entries(delta).filter(([k, v]) => k.startsWith('app:') && !antes.has(k.slice(4)) && v >= (o.minNovo || 3));
  const tApp = Object.entries(delta).filter(([k]) => k.startsWith('app:')).reduce((a, [, v]) => a + v, 0), tSrv = Object.entries(delta).filter(([k]) => k.startsWith('erro:')).reduce((a, [, v]) => a + v, 0);
  const pico = tApp >= (o.picoApp || 30) || tSrv >= (o.picoSrv || 10), razao = [];
  if (novos.length) razao.push(novos.length === 1 ? 'um erro novo a repetir-se' : novos.length + ' erros novos a repetir-se'); if (tApp >= (o.picoApp || 30)) razao.push(tApp + ' falhas na app na última hora'); if (tSrv >= (o.picoSrv || 10)) razao.push(tSrv + ' erros no servidor na última hora');
  let alerta = false; if ((novos.length || pico) && Date.now() - (P.alertAt || 0) > 6 * 36e5) { alerta = true; P.alertAt = Date.now(); }
  P.d = hoje; P.t = atual; try { await s.put(SNAP, Buffer.from(JSON.stringify(P))); } catch (e) { }
  if (alerta && o.mail) { const para = String(process.env.NAUTILO_ADMIN || '').split(',').map(x => x.trim()).filter(Boolean), L = novos.slice(0, 5).map(([k, v]) => `• ${k.slice(4)} (${v}×)`), Ls = Object.entries(delta).filter(([k]) => k.startsWith('erro:')).slice(0, 5).map(([k, v]) => `• ${k.slice(5)} (${v}×)`);
    const txt = `O Prumo detetou ${razao.join(' e ')}.\n\n${L.length ? 'Erros novos na app:\n' + L.join('\n') + '\n\n' : ''}${Ls.length ? 'Erros no servidor:\n' + Ls.join('\n') + '\n\n' : ''}Vê os detalhes em Administração › Servidor › Erros e quedas.`;
    const esc = x => String(x).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
    for (const e of para) await o.mail(e, 'Prumo · ' + razao[0], txt, `<p>O Prumo detetou <b>${esc(razao.join(' e '))}</b>.</p>${L.length ? '<p>Erros novos na app:<br>' + L.map(esc).join('<br>') + '</p>' : ''}${Ls.length ? '<p>Erros no servidor:<br>' + Ls.map(esc).join('<br>') + '</p>' : ''}<p>Vê os detalhes em Administração › Servidor › Erros e quedas.</p>`).catch(() => { }); }
  return { alerta, novos: novos.map(([k, v]) => [k.slice(4), v]), tApp, tSrv }; };
module.exports = { resumo, vigiar };
