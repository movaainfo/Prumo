/* PRUMO — Corpo › Tempo de ecrã (v3.80). Quanto tempo passas no telemóvel e o que isso faz à tua saúde.
   O iPhone e o Android não deixam uma app ler o Tempo de ecrã sozinha: tiras um print do ecrã "Tempo de ecrã" (iPhone) ou
   "Bem-estar digital" (Android), do dia ou da semana, e o Prumo lê-o (horas por dia, as apps, quantas vezes pegaste no telemóvel
   e as notificações). Também dá para escrever à mão. Na versão da loja (app nativa), se o telemóvel deixar, os dias entram sozinhos.
   A análise: média diária e tendência, nível de saúde, quanto tempo isso dá num ano, redes sociais e vídeo, o sono nos dias de
   mais ecrã, e a tua meta diária (dias dentro da meta e a sequência). O print só serve para ler os números. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
OS.ONE_DEF.ecra = { L: [], meta: 180, ult: null };   // L: [{ d, min, pick, notif, src }] · ult: o último print { per, d, apps:[{n,min,c}], pick, notif }
const E = () => OS.one('ecra'), today = () => U.today();
const CATS = { social: ['Redes sociais', '#f472b6'], video: ['Vídeo e streaming', '#f87171'], jogos: ['Jogos', '#a78bfa'], mensagens: ['Mensagens', '#60a5fa'], produtividade: ['Trabalho e estudo', '#34d399'], leitura: ['Leitura e notícias', '#fbbf24'], outro: ['Outras', '#94a3b8'] };
const hm = m => { m = Math.round(m || 0); const h = Math.floor(m / 60), r = m % 60; return h ? h + ' h' + (r ? ' ' + String(r).padStart(2, '0') : '') : r + ' min'; };
const valido = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toISOString().slice(0, 10) === d;
const guardaDia = (d, min, x = {}) => { if (!valido(d) || d > today() || !(min >= 0) || min > 1440) return false; const e = E(), i = e.L.findIndex(r => r.d === d), r = Object.assign(i >= 0 ? e.L[i] : { d }, { min: Math.round(min), src: x.src || 'mao' });
  if (x.pick >= 0) r.pick = Math.round(x.pick); if (x.notif >= 0) r.notif = Math.round(x.notif); if (i < 0) e.L.push(r); e.L.sort((a, b) => a.d.localeCompare(b.d)); if (e.L.length > 800) e.L = e.L.slice(-800); return true; };
// ler o print (iPhone ou Android): a IA devolve os números
const PEDIDO = () => `Isto é um print do "Tempo de ecrã" do iPhone ou do "Bem-estar digital" do Android (pode ser do dia ou da semana). Lê os números exatamente como aparecem.
Hoje é ${today()} (${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date().getDay()]}). Converte "Hoje", "Ontem" e os dias da semana em datas reais (a semana mostrada é a mais recente, a não ser que o print diga outra).
- Print de um dia: "dias" tem só esse dia com o total em minutos.
- Print da semana: "dias" tem cada dia com barra visível (se só houver a média diária, põe-na em "media" e deixa "dias" vazio).
- "apps": as apps da lista com os minutos (no print da semana, os minutos da semana), e "c" a categoria: social, video, jogos, mensagens, produtividade, leitura ou outro.
- "levantamentos": quantas vezes pegou no telemóvel; "notificacoes": quantas notificações (do dia, ou a média diária na semana). Se não aparecer, null.
Se não for um print de tempo de ecrã, devolve {"erro":"não é tempo de ecrã"}.
JSON: {"periodo":"dia|semana","dias":[{"d":"AAAA-MM-DD","min":0}],"media":null,"apps":[{"n":"Instagram","min":0,"c":"social"}],"levantamentos":null,"notificacoes":null}`;
const S = { busy: false, err: '', ok: '' };
A.ecLer = async () => { const inp = document.getElementById('ecFile'), files = [...((inp && inp.files) || [])].filter(f => /^image\//.test(f.type)); if (!files.length) return UI.toast('Escolhe primeiro o print do Tempo de ecrã.', 'warn');
  if (!(OS.AI && OS.AI.gkey && OS.AI.gkey())) { S.err = 'Ler o print precisa da IA do Prumo ligada (Definições › Spyke › Cérebro). Também podes escrever as horas à mão aqui em baixo.'; return OS.request(); }
  S.busy = true; S.err = ''; S.ok = ''; OS.request(); let nd = 0;
  try { for (const f of files.slice(0, 6)) { if (OS.AV && OS.AV.verificar) { const v = await OS.AV.verificar(f).catch(() => ({ ok: true })); if (v && v.ok === false) throw new Error('O escudo bloqueou "' + (v.nome || f.name) + '": ' + (v.motivo || 'parece perigoso') + '.'); }
      const im = await OS.WorkSched.shrink(f), o = await OS.AI.json([{ text: PEDIDO() }, { inline_data: { mime_type: im.mime, data: im.data } }], .1) || {};
      if (o.erro) throw new Error('Este print não parece ser do Tempo de ecrã. Abre Definições › Tempo de ecrã › Ver toda a atividade e tira o print aí.');
      const per = o.periodo === 'semana' ? 'semana' : 'dia', dias = (Array.isArray(o.dias) ? o.dias : []).filter(x => x && valido(String(x.d)) && +x.min >= 0 && +x.min <= 1440 && String(x.d) <= today());
      const pick = +o.levantamentos >= 0 && o.levantamentos !== null ? +o.levantamentos : -1, notif = +o.notificacoes >= 0 && o.notificacoes !== null ? +o.notificacoes : -1;
      dias.forEach(x => { if (guardaDia(String(x.d), +x.min, { src: 'print', pick: per === 'dia' ? pick : -1, notif: per === 'dia' ? notif : -1 })) nd++; });
      const apps = (Array.isArray(o.apps) ? o.apps : []).filter(a => a && a.n && +a.min > 0).slice(0, 15).map(a => ({ n: String(a.n).slice(0, 40), min: Math.round(+a.min), c: CATS[a.c] ? a.c : 'outro' }));
      if (apps.length || dias.length) E().ult = { per, d: dias.length ? dias[dias.length - 1].d : today(), apps, pick: pick >= 0 ? pick : null, notif: notif >= 0 ? notif : null, media: +o.media > 0 ? Math.round(+o.media) : null }; }
    if (!nd && !(E().ult && E().ult.apps.length)) throw new Error('Não consegui ler os números deste print. Experimenta um print mais nítido, com o gráfico e a lista de apps.');
    OS.touch('ecra'); S.ok = nd ? nd + (nd === 1 ? ' dia lido' : ' dias lidos') + ' do print.' : 'Apps lidas do print.'; if (inp) inp.value = ''; }
  catch (e) { S.err = (e && e.message) || 'Não deu para ler o print.'; } S.busy = false; OS.request(); };
OS.forms = OS.forms || {};
OS.forms.ecMao = (f, v) => { const d = v('d') || today(), min = (+v('h') || 0) * 60 + (+v('m') || 0); if (!min && v('h') === '' && v('m') === '') return UI.toast('Escreve as horas e os minutos.', 'warn');
  if (!guardaDia(d, min, { src: 'mao', pick: v('p') === '' ? -1 : +v('p') })) return UI.toast('Esse dia não dá (só até hoje, até 24 h).', 'warn'); OS.touch('ecra'); UI.toast('Guardado: ' + hm(min) + ' em ' + U.fmtD(d) + '.', 'pos'); };
OS.forms.ecMeta = (f, v) => { const m = Math.max(15, Math.min(960, (+v('h') || 0) * 60 + (+v('m') || 0))); E().meta = m; OS.touch('ecra'); UI.toast('Meta diária: ' + hm(m) + '.', 'pos'); };
A.ecApagar = b => { const e = E(); e.L = e.L.filter(r => r.d !== b.dataset.d); OS.touch('ecra'); OS.request(); };
// a análise
const media = L => L.length ? L.reduce((s, r) => s + r.min, 0) / L.length : 0;
const nivel = m => m <= 120 ? ['Equilibrado', 'pos', 'Está dentro do que se recomenda para o tempo de lazer no ecrã (até 2 h).'] : m <= 240 ? ['Moderado', 'acc', 'Acima das 2 h de lazer recomendadas, mas longe dos excessos.'] : m <= 360 ? ['Alto', 'warn', 'Mais de 4 h por dia: começa a roubar sono, foco e movimento.'] : ['Muito alto', 'neg', 'Mais de 6 h por dia: é mais tempo do que muita gente passa a trabalhar.'];
const analise = (t = today()) => { const e = E(), L = e.L, d7 = U.addDays(t, -6), d14 = U.addDays(t, -13), s7 = L.filter(r => r.d >= d7 && r.d <= t), s0 = L.filter(r => r.d >= d14 && r.d < d7);
  const m7 = media(s7), m0 = media(s0), tend = s7.length && s0.length && m0 ? Math.round((m7 - m0) / m0 * 100) : null, ult = e.ult, apps = ult ? ult.apps : [], tot = apps.reduce((s, a) => s + a.min, 0);
  const porCat = {}; apps.forEach(a => { porCat[a.c] = (porCat[a.c] || 0) + a.min; }); const cats = Object.entries(porCat).sort((p, q) => q[1] - p[1]).map(([c, m]) => ({ c, m, p: tot ? Math.round(m / tot * 100) : 0 }));
  const picks = s7.filter(r => r.pick >= 0), pick = picks.length ? Math.round(media(picks.map(r => ({ min: r.pick })))) : (ult && ult.pick != null ? ult.pick : null);
  // o sono na noite a seguir (o registo do sono tem a data do dia em que acordas)
  const SL = OS.all('sleep') || [], par = L.filter(r => r.d >= U.addDays(t, -59)).map(r => { const z = SL.find(s => s.date === U.addDays(r.d, 1) && (s.min || 0) > 0); return z ? { e: r.min, s: z.min } : null; }).filter(Boolean);
  let sono = null; if (par.length >= 5) { const md = [...par].sort((a, b) => a.e - b.e)[Math.floor(par.length / 2)].e, mais = par.filter(x => x.e > md), menos = par.filter(x => x.e <= md);
    if (mais.length && menos.length) sono = { mais: Math.round(media(mais.map(x => ({ min: x.s })))), menos: Math.round(media(menos.map(x => ({ min: x.s })))), n: par.length }; }
  let seq = 0; for (let d = t; ; d = U.addDays(d, -1)) { const r = L.find(x => x.d === d); if (!r || r.min > e.meta) { if (d === t && !r) continue; break; } seq++; if (seq > 400) break; }
  const base = m7 || (ult && ult.media) || 0; let score = base ? Math.round(Math.max(0, Math.min(100, 100 - Math.max(0, base - 120) / 3.6))) : null;
  const soc = cats.filter(x => x.c === 'social' || x.c === 'video').reduce((s, x) => s + x.p, 0); if (score != null) { if (pick > 100) score -= 8; if (soc > 50) score -= 8; score = Math.max(0, score); }
  return { m7: base, n7: s7.length, tend, nivel: base ? nivel(base) : null, ano: base ? Math.round(base * 365 / 1440) : 0, apps, cats, soc, pick, sono, dentro: s7.filter(r => r.min <= e.meta).length, seq, score, meta: e.meta }; };
const barras = (t = today()) => { const e = E(), dias = U.range(U.addDays(t, -13), t), mx = Math.max(e.meta * 1.25, ...dias.map(d => (e.L.find(r => r.d === d) || {}).min || 0), 60);
  return `<div class="ec-ch" role="img" aria-label="Tempo de ecrã dos últimos 14 dias"><span class="ec-meta" style="bottom:${e.meta / mx * 100}%"><i>meta ${hm(e.meta)}</i></span>${dias.map(d => { const r = e.L.find(x => x.d === d); return `<div class="ec-b${r && r.min > e.meta ? ' over' : ''}${d === t ? ' hoje' : ''}" title="${U.fmtD(d)}: ${r ? hm(r.min) : 'sem registo'}"><i style="height:${r ? Math.max(2, r.min / mx * 100) : 0}%"></i><small>${U.WDS[U.parse(d).getDay()].slice(0, 1)}</small></div>`; }).join('')}</div>`; };
const view = () => { const e = E(), a = analise(), t = today(), hasAI = OS.AI && OS.AI.gkey && OS.AI.gkey();
  const imp = `<div class="pn ec-imp"><div class="pn-h"><h3>${UI.ic('clock')}Importar o tempo de ecrã</h3></div>
    <p class="mut">O telemóvel não deixa as apps lerem isto sozinhas: tira um print e o Prumo lê os números. <b>iPhone:</b> Definições › Tempo de ecrã › Ver toda a atividade (do dia ou da semana). <b>Android:</b> Definições › Bem-estar digital.</p>
    ${hasAI ? '' : '<p class="ec-av">Para ler o print, liga a IA em Definições › Spyke › Cérebro. Sem IA, escreve as horas à mão aqui em baixo.</p>'}
    <div class="row gap8 wrap"><input id="ecFile" class="field grow" type="file" accept="image/*" multiple aria-label="Print do Tempo de ecrã"><button type="button" class="btn pri" data-act="ecLer"${S.busy ? ' disabled' : ''}>${S.busy ? 'A ler o print…' : UI.ic('zap') + 'Ler o print'}</button></div>
    ${S.err ? `<p class="ec-err" role="alert">${esc(S.err)}</p>` : S.ok ? `<p class="ec-ok" role="status">${esc(S.ok)}</p>` : ''}
    <form data-form="ecMao" class="ec-f" autocomplete="off"><label>Dia<input class="field" type="date" name="d" value="${t}" max="${t}"></label><label>Horas<input class="field" type="number" name="h" min="0" max="24" inputmode="numeric" placeholder="3"></label><label>Minutos<input class="field" type="number" name="m" min="0" max="59" inputmode="numeric" placeholder="20"></label><label>Levantamentos (opcional)<input class="field" type="number" name="p" min="0" max="2000" inputmode="numeric"></label><button class="btn">Guardar à mão</button></form></div>`;
  if (!a.m7) return `<div class="ec">${imp}<div class="pn"><p class="mut">Ainda não há tempo de ecrã. Importa o print desta semana para veres a análise: média por dia, o que isso dá num ano, as apps que mais te levam tempo e como dormes nos dias de mais ecrã.</p></div></div>`;
  const n = a.nivel, ins = [];
  ins.push(`Ao ritmo atual, são <b>${a.ano} dias inteiros por ano</b> a olhar para o telemóvel (${hm(a.m7 * 7)} por semana).`);
  if (a.tend != null && Math.abs(a.tend) >= 5) ins.push(a.tend < 0 ? `Menos <b>${-a.tend}%</b> do que na semana anterior. Bom caminho.` : `Mais <b>${a.tend}%</b> do que na semana anterior.`);
  if (a.soc >= 30) ins.push(`<b>${a.soc}%</b> do tempo vai para redes sociais e vídeo: é o tempo mais fácil de cortar (limites de app ajudam).`);
  if (a.pick != null) ins.push(`Pegas no telemóvel <b>${a.pick} vezes por dia</b>${a.pick ? `, uma vez a cada ${Math.max(1, Math.round(16 * 60 / a.pick))} min acordado` : ''}.${a.pick > 100 ? ' Cada interrupção custa foco: deixar o telemóvel noutra divisão quando estudas ajuda.' : ''}`);
  if (a.sono) ins.push(a.sono.mais < a.sono.menos - 10 ? `Nos dias de mais ecrã dormes <b>${hm(a.sono.menos - a.sono.mais)} a menos</b> (${hm(a.sono.mais)} contra ${hm(a.sono.menos)}, em ${a.sono.n} noites).` : `O teu sono parece não mudar com o ecrã (${hm(a.sono.mais)} nos dias de mais ecrã, ${hm(a.sono.menos)} nos outros).`);
  else ins.push('Com o sono registado (Corpo › Sono), o Prumo mostra se dormes menos nos dias de mais ecrã.');
  return `<div class="ec">
    <section class="ec-top"><div class="ec-sc ${n[1]}"><b>${a.score}</b><small>saúde digital</small></div><div class="ec-tx"><small>Média dos últimos 7 dias${a.n7 ? '' : ' (do último print)'}</small><h2>${hm(a.m7)} <span>por dia</span></h2><p><span class="ec-nv ${n[1]}">${n[0]}</span> ${n[2]}</p></div></section>
    <div class="pn"><div class="pn-h"><h3>Últimos 14 dias</h3><span class="mut">${a.dentro}/${Math.max(a.n7, 1)} dias dentro da meta${a.seq ? ' · ' + a.seq + (a.seq === 1 ? ' dia seguido' : ' dias seguidos') : ''}</span></div>${barras()}
      <details class="ec-md"><summary>Mudar a meta diária (${hm(e.meta)})</summary><form data-form="ecMeta" class="ec-f"><label>Horas<input class="field" type="number" name="h" min="0" max="16" value="${Math.floor(e.meta / 60)}"></label><label>Minutos<input class="field" type="number" name="m" min="0" max="59" value="${e.meta % 60}"></label><button class="btn">Guardar a meta</button></form></details></div>
    <div class="pn"><div class="pn-h"><h3>O que isto quer dizer</h3></div><ul class="ec-ins">${ins.map(x => `<li>${x}</li>`).join('')}</ul></div>
    ${a.apps.length ? `<div class="pn"><div class="pn-h"><h3>Para onde vai o tempo</h3><span class="mut">do print de ${e.ult.per === 'semana' ? 'semana até ' : ''}${U.fmtD(e.ult.d)}</span></div>
      <div class="ec-cat">${a.cats.map(x => `<span style="--k:${CATS[x.c][1]};flex:${Math.max(x.p, 3)}" title="${CATS[x.c][0]}: ${x.p}%"></span>`).join('')}</div><p class="ec-leg">${a.cats.map(x => `<span style="--k:${CATS[x.c][1]}">${CATS[x.c][0]} ${x.p}%</span>`).join('')}</p>
      <ol class="ec-apps">${a.apps.slice(0, 8).map(x => `<li><span class="ec-ad" style="--k:${CATS[x.c][1]}"></span><b>${esc(x.n)}</b><small>${CATS[x.c][0]}</small><em>${hm(x.min)}</em></li>`).join('')}</ol></div>` : ''}
    ${imp}
    <details class="pn ec-reg"><summary><b>Os dias registados (${e.L.length})</b></summary><ul>${e.L.slice(-30).reverse().map(r => `<li><span>${U.fmtD(r.d)}</span><b>${hm(r.min)}</b>${r.pick >= 0 ? `<small>${r.pick} levantamentos</small>` : ''}<small>${r.src === 'print' ? 'do print' : 'à mão'}</small><button type="button" class="btn xs ghost" data-act="ecApagar" data-d="${r.d}" aria-label="Apagar ${U.fmtD(r.d)}">${UI.ic('x')}</button></li>`).join('')}</ul></details></div>`; };
// na app da loja (nativa), se o telemóvel deixar ler o uso, os dias entram sozinhos
const nativo = async () => { try { const P = window.PrumoLoja; if (!P || !P.ecra || !P.ecra.dias) return; const L = await P.ecra.dias(14); let n = 0; (L || []).forEach(x => { if (x && guardaDia(String(x.d), +x.min, { src: 'app', pick: x.pick >= 0 ? +x.pick : -1 })) n++; }); if (n) OS.touch('ecra'); } catch (e) { } };
OS.on && OS.on('ready', () => { nativo(); document.addEventListener('visibilitychange', () => { if (!document.hidden) nativo(); }); });
OS.Ecra = { view, analise, guardaDia, nivel, hm, CATS, _S: S };
})();
