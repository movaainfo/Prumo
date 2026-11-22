// PRUMO · relatório semanal da administração (v3.62). Não é uma rota (o "_" diz ao Vercel para não a publicar).
// Junta o que aconteceu no app nos últimos 7 dias, só em números (sem nomes, e-mails nem o conteúdo dos dados de ninguém):
// contas, atividade, planos, pedidos, notificações, IA, segurança (tentativas de ataque), erros do servidor, cópias de segurança e manutenção.
// Gerado ao domingo na janela de manutenção (api/relatorio, cron da Vercel) e quando a administração pede; guardado cifrado em rel/<dia>.json (12 semanas).
'use strict';
const N = require('./_nuvem'), P = require('./_planos');
const DIA = 864e5, KEEP = 12;
const iso = t => new Date(t).toISOString().slice(0, 10);
const dias = (ate, n) => Array.from({ length: n }, (_, i) => iso(Date.parse(ate + 'T00:00:00Z') - (n - 1 - i) * DIA));
const TESTE = /@nautilo\.test$/i;
const NOMES = { login_falhou: 'senhas erradas', conta_trancada: 'contas trancadas (8 senhas erradas)', login_desconhecido: 'logins com e-mail que não existe', login_bloqueada: 'tentativas numa conta trancada',
  recuperar_falhou: 'códigos de recuperação errados', token_falso: 'sessões falsificadas', origem: 'pedidos de sites de fora', limite: 'travões de pedidos ativados', robo_registo: 'robôs no registo',
  admin_negado: 'tentativas de entrar na administração', backup_negado: 'tentativas de abrir a cópia de segurança', manutencao_ligar: 'manutenção ligada à mão', manutencao_desligar: 'manutenção desligada à mão' };

const gerar = async (o = {}) => { const s = N.store(); if (!s) throw N.err('store', 'Sem base de dados.', 503);
  const now = o.now || Date.now(), ate = iso(now - (o.ontem === false ? 0 : 0)), D = dias(ate, 7), de = D[0], key = await N.accKey();
  const R = { v: 1, gerado: now, de, ate, versao: String(process.env.VERCEL_GIT_COMMIT_MESSAGE || '').split('\n')[0].slice(0, 80), alertas: [] };
  // contas e planos
  const C = { total: 0, novas: 0, porConfirmar: 0, teste: 0, entraramSemana: 0, perfis: 0 }, PL = { teste: 0, essencial: 0, avancado: 0, completo: 0, oferta: 0, admin: 0, semPlano: 0, pagos: 0, receitaMes: 0 };
  const precos = {}; P.planos().forEach(p => { precos[p.id] = p.precos.EUR; });
  for (const b of await s.list('a/')) { let r; try { const g = await s.get(b.pathname); r = g && N.open(key, g.buf); } catch (e) { r = null; } if (!r || !r.uid) continue;
    if (TESTE.test(r.email || '')) { C.teste++; continue; }
    C.total++; C.perfis += (r.perfis || []).length; const cr = Date.parse(r.criado || 0); if (cr >= Date.parse(de)) C.novas++; if (r.verif) C.porConfirmar++; if ((r.ult || 0) >= Date.parse(de)) C.entraramSemana++;
    const e = P.efetivo(r) || {}; if (e.admin) PL.admin++; else if (e.oferta) PL.oferta++; else if (e.pago) { PL.pagos++; PL[e.id] = (PL[e.id] || 0) + 1; const pr = precos[e.id]; if (pr) PL.receitaMes += e.ciclo === 'ano' ? pr.ano / 12 : pr.mes; } else if (e.teste) PL.teste++; else if (!e.lvl) PL.semPlano++; }
  PL.receitaMes = Math.round(PL.receitaMes); R.contas = C; R.planos = PL;
  // uso (minutos com o app aberto e à vista)
  const U = { minutos: 0, pessoas: 0, porDia: {} }; D.forEach(d => { U.porDia[d] = { pessoas: 0, min: 0 }; });
  for (const b of await s.list('u/')) { let u; try { const g = await s.get(b.pathname); u = g && N.open(key, g.buf); } catch (e) { u = null; } if (!u || !u.dias) continue; let any = false;
    D.forEach(d => { const m = +u.dias[d] || 0; if (m > 0) { U.porDia[d].pessoas++; U.porDia[d].min += m; U.minutos += m; any = true; } }); if (any) U.pessoas++; }
  R.uso = U;
  // contadores do servidor (logins, registos, IA, notificações, pagamentos, segurança, erros)
  const T = {}; for (const d of D) { const t = await require('./_visitas').somaDia(s, d, false); Object.entries(t).forEach(([k, v]) => { T[k] = (T[k] || 0) + (+v || 0); }); }
  R.eventos = { logins: T.login || 0, registos: T.registo || 0, ia: (T.ia || 0) + (T.ia_livre || 0), notificacoes: T.push || 0, pagamentos: T.pagamento || 0 };
  R.seguranca = {}; R.erros = {}; R.falhasApp = {}; Object.entries(T).forEach(([k, v]) => { if (k.startsWith('sec:')) R.seguranca[k.slice(4)] = v; else if (k.startsWith('erro:')) R.erros[k.slice(5)] = v; else if (k.startsWith('app:')) R.falhasApp[k.slice(4)] = v; });
  R.falhasApp = Object.fromEntries(Object.entries(R.falhasApp).sort((a, b) => b[1] - a[1]).slice(0, 15));
  // pedidos dos titulares (LGPD/RGPD)
  const PE = { novos: 0, porResponder: 0 }; for (const b of await s.list('p/')) { try { const g = await s.get(b.pathname); const p = g && N.open(key, g.buf); if (!p) continue; if (Date.parse(p.at || 0) >= Date.parse(de)) PE.novos++; if (p.estado !== 'respondido') PE.porResponder++; } catch (e) { } }
  R.pedidos = PE;
  // notificações: aparelhos ligados
  try { const g = await s.get('push/idx'); const v = g ? N.open(key, g.buf) : null; R.aparelhos = v && v.u ? Object.values(v.u).reduce((n, u) => n + ((u.subs || []).length), 0) : 0; } catch (e) { R.aparelhos = null; }
  // cópias de segurança
  const diasDe = async p => [...new Set((await s.list(p)).map(b => b.pathname.split('/')[1]).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  R.copias = { diarias: await diasDe('bk/'), semanais: await diasDe('bks/') };
  for (const t of ['diaria', 'semanal']) { try { const g = await s.get('cfg/backup-' + t); if (g) R.copias['ultima_' + t] = JSON.parse(g.buf.toString()); } catch (e) { } }
  // saúde da base de dados (verificações de hora a hora)
  try { const S = require('./_saude'); R.saude = S.resumo(await S.ler()); if (R.saude.pct != null && R.saude.pct < 100) R.alertas.push(`A base de dados falhou em ${R.saude.n - R.saude.ok} de ${R.saude.n} verificações (${R.saude.pct}% de saúde).`); } catch (e) { }
  // manutenção
  try { const m = await N.manut({ fresh: true }); R.manut = { prox: m.prox, on: m.on }; } catch (e) { }
  // alertas (o que merece atenção)
  const sec = R.seguranca, n = k => sec[k] || 0;
  if (n('conta_trancada')) R.alertas.push(`${n('conta_trancada')} conta(s) trancada(s) por senhas erradas: pode ser alguém a tentar adivinhar senhas.`);
  if (n('token_falso')) R.alertas.push(`${n('token_falso')} tentativa(s) com sessões falsificadas (recusadas).`);
  if (n('robo_registo')) R.alertas.push(`${n('robo_registo')} robô(s) apanhados no registo.`);
  if (n('admin_negado')) R.alertas.push(`${n('admin_negado')} tentativa(s) de usar a administração sem ser administrador.`);
  const errs = Object.values(R.erros).reduce((a, b) => a + b, 0); if (errs) R.alertas.push(`${errs} erro(s) do servidor na semana (ver por rota).`);
  const fa = Object.values(R.falhasApp).reduce((a, b) => a + b, 0); if (fa) R.alertas.push(`${fa} falha(s) do app nos aparelhos das pessoas (ver a lista).`);
  if (!R.copias.diarias.includes(ate) && !R.copias.diarias.includes(D[5])) R.alertas.push('A cópia de segurança diária não correu nos últimos 2 dias.');
  if (PE.porResponder) R.alertas.push(`${PE.porResponder} pedido(s) de direitos (LGPD/RGPD) por responder.`);
  if (C.porConfirmar) R.alertas.push(`${C.porConfirmar} conta(s) ainda sem o e-mail confirmado.`);
  // guarda e limpa o que é velho (relatórios com mais de 12 semanas, contadores com mais de 35 dias)
  if (o.guardar !== false) { await s.put('rel/' + ate + '.json', N.seal(key, R));
    const rels = (await s.list('rel/')).map(b => b.pathname).sort(); const velhos = rels.slice(0, Math.max(0, rels.length - KEEP)); if (velhos.length) await s.del(velhos);
    const lim = iso(now - 35 * DIA), st = (await s.list('st/')).filter(b => (b.pathname.split('/')[1] || '9') < lim); if (st.length) await s.del(st); }
  return R; };

const lista = async (n = 8) => { const s = N.store(), key = await N.accKey(); const L = (await s.list('rel/')).map(b => b.pathname).sort().reverse().slice(0, n), out = [];
  for (const p of L) { try { const g = await s.get(p); if (g) out.push(N.open(key, g.buf)); } catch (e) { } } return out; };

// o e-mail para a administração (texto + HTML simples)
const eur = c => (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const fd = d => d.slice(8, 10) + '/' + d.slice(5, 7);
const hm = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
const email = R => { const e = s => String(s).replace(/[<>&"]/g, ''), L = [];
  const secL = Object.entries(R.seguranca || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${NOMES[k] || k}: ${v}`);
  const errL = Object.entries(R.erros || {}).map(([k, v]) => `${k}: ${v}`);
  L.push(['Contas', [`${R.contas.total} contas (${R.contas.novas} novas esta semana, ${R.contas.entraramSemana} entraram)`, `${R.contas.perfis} perfis`, `${R.contas.porConfirmar} por confirmar o e-mail`]]);
  L.push(['Planos', [`Pagos: ${R.planos.pagos} (Essencial ${R.planos.essencial || 0}, Avançado ${R.planos.avancado || 0}, Completo ${R.planos.completo || 0})`, `Em teste grátis: ${R.planos.teste}; ofertas: ${R.planos.oferta}; sem plano: ${R.planos.semPlano}`, `Receita mensal estimada: ${eur(R.planos.receitaMes)}`]]);
  L.push(['Atividade', [`${R.uso.pessoas} pessoa(s) usaram o app, ${hm(R.uso.minutos)} no total`, `Logins: ${R.eventos.logins}; contas criadas: ${R.eventos.registos}`, `Pedidos à IA: ${R.eventos.ia}; notificações enviadas: ${R.eventos.notificacoes} (${R.aparelhos == null ? '?' : R.aparelhos} aparelhos ligados)`, `Pagamentos confirmados: ${R.eventos.pagamentos}`]]);
  L.push(['Segurança', secL.length ? secL : ['Nenhuma tentativa de ataque registada.']]);
  L.push(['Erros do servidor', errL.length ? errL : ['Nenhum.']]);
  const faL = Object.entries(R.falhasApp || {}).map(([k, v]) => `${k}: ${v}`); L.push(['Falhas do app (nos aparelhos)', faL.length ? faL : ['Nenhuma.']]);
  L.push(['Pedidos (LGPD/RGPD)', [`${R.pedidos.novos} novos; ${R.pedidos.porResponder} por responder`]]);
  L.push(['Cópias de segurança', [`Diárias guardadas: ${R.copias.diarias.length} (última: ${R.copias.diarias.slice(-1)[0] || '—'})`, `Semanais guardadas: ${R.copias.semanais.length} (última: ${R.copias.semanais.slice(-1)[0] || '—'})`]]);
  const sub = `Prumo · relatório da semana (${fd(R.de)}–${fd(R.ate)})`;
  const txt = `Relatório do Prumo, ${fd(R.de)} a ${fd(R.ate)}${R.versao ? ' · ' + R.versao : ''}\n\n` + (R.alertas.length ? 'ATENÇÃO\n- ' + R.alertas.join('\n- ') + '\n\n' : 'Sem alertas.\n\n') + L.map(([t, a]) => t.toUpperCase() + '\n- ' + a.join('\n- ')).join('\n\n') + '\n\nVê tudo em Administração › Relatórios da semana.';
  const html = `<div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1b1b1b"><h2 style="margin:0 0 4px">Relatório da semana</h2><p style="color:#666;margin:0 0 16px">${fd(R.de)} a ${fd(R.ate)}${R.versao ? ' · ' + e(R.versao) : ''}</p>`
    + (R.alertas.length ? `<div style="background:#fff4e5;border:1px solid #f0c27a;border-radius:10px;padding:12px 14px;margin:0 0 16px"><b>Atenção</b><ul style="margin:6px 0 0;padding-left:18px">${R.alertas.map(a => `<li>${e(a)}</li>`).join('')}</ul></div>` : `<p style="color:#2f7d4f"><b>Sem alertas esta semana.</b></p>`)
    + L.map(([t, a]) => `<h3 style="margin:16px 0 6px;font-size:16px">${e(t)}</h3><ul style="margin:0;padding-left:18px">${a.map(x => `<li>${e(x)}</li>`).join('')}</ul>`).join('')
    + `<p style="color:#666;font-size:13px;margin-top:20px">Vê tudo em Administração › Relatórios da semana.</p></div>`;
  return { sub, txt, html }; };

module.exports = { gerar, lista, email, NOMES };
