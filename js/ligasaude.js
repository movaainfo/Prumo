/* PRUMO — Strava e Oura (v3.71), em Definições › Ligações › "Desporto e sono". O Garmin chega pelo Strava.
   Strava: as atividades entram nas Corridas (corrida, trail, passadeira) e nos Treinos (o resto: bicicleta, natação, ginásio, caminhada…).
   Oura: o sono de cada noite entra no Sono; a prontidão, a pontuação do sono, a atividade e os passos ficam por dia (coleção "oura");
   os treinos entram nas Corridas e nos Treinos. Nada duplica: cada registo guarda o id de origem (ext).
   Pelas regras do Strava e da Oura, estes registos (src "strava" / "oura") nunca vão para a IA do Prumo (ver OS.semIA).
   Só aparece quando o servidor tem o serviço ativo (as chaves do Strava ou da Oura no Vercel). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const NOME = { strava: 'Strava', oura: 'Oura' };
const pid = () => (OS.Acc && OS.Acc.pid ? OS.Acc.pid() : '') || '';
const kEst = () => 'os2liga:' + pid();
const est = () => U.ls.get(kEst(), null) || {};
const setEst = o => U.ls.set(kEst(), Object.assign(est(), o));
let BUSY = '', TRIED = 0, ESPERA = 0;
const call = async (op, body = {}) => { let r;
  try { r = await fetch('api/liga', { method: 'POST', cache: 'no-store', credentials: 'omit', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OS.Acc.token() }, body: JSON.stringify(Object.assign({ op, p: pid() }, body)) }); }
  catch (e) { throw new Error('Sem ligação à internet.'); }
  let j = null; try { j = await r.json(); } catch (e) { }
  if (j && j.ok) return j; const e = new Error((j && j.msg) || 'Erro ' + r.status); e.code = j && j.code; throw e; };
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && pid());
const atualiza = async () => { if (!conta()) return; TRIED = Date.now(); try { const j = await call('estado'); setEst({ s: j.servicos, at: Date.now() });
    // acabou de ligar (voltou do site do serviço): importa logo
    const novos = Object.keys(j.servicos || {}).filter(k => j.servicos[k].ligado && !est()['ult_' + k]); OS.request(); for (const k of novos) await importar(k); } catch (e) { } OS.request(); };

/* ---------- importar ---------- */
const PT = { Run: 'Corrida', TrailRun: 'Trail', VirtualRun: 'Corrida na passadeira', Ride: 'Bicicleta', VirtualRide: 'Bicicleta (rolo)', EBikeRide: 'Bicicleta elétrica', MountainBikeRide: 'BTT', GravelRide: 'Gravel', Swim: 'Natação', Walk: 'Caminhada', Hike: 'Caminhada na natureza',
  WeightTraining: 'Musculação', Workout: 'Treino', Yoga: 'Ioga', Crossfit: 'CrossFit', Rowing: 'Remo', Elliptical: 'Elíptica', StairStepper: 'Escadas', HighIntensityIntervalTraining: 'HIIT', Pilates: 'Pilates', Soccer: 'Futebol', Tennis: 'Ténis', Padel: 'Padel',
  running: 'Corrida', cycling: 'Bicicleta', walking: 'Caminhada', swimming: 'Natação', strength_training: 'Musculação', yoga: 'Ioga', hiking: 'Caminhada na natureza', hiit: 'HIIT', pilates: 'Pilates' };
const CORRE = /^(Run|TrailRun|VirtualRun|running)$/;
const junta = (col, ext, rec) => { const old = OS.all(col).find(x => x.ext === ext); if (old) { OS.upd(col, old.id, rec, { silent: true }); return 0; } OS.add(col, Object.assign({ ext }, rec), { silent: true }); return 1; };
const hm = iso => { const m = String(iso || '').match(/T(\d{2}):(\d{2})/); return m ? m[1] + ':' + m[2] : ''; };
const importar = async k => { if (BUSY || !conta()) return; BUSY = k; OS.request(); const E = est(), desde = E['ult_' + k] ? U.addDays(E['ult_' + k], -3) : U.addDays(U.today(), -60); let n = 0;
  try { const j = await call('dados', { k, desde });
    if (k === 'strava') (j.atividades || []).forEach(a => { const date = String(a.ini || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return; const ext = 'sv:' + a.id, nome = a.nome || PT[a.tipo] || a.tipo;
      if (CORRE.test(a.tipo) && a.km) n += junta('runs', ext, { date, km: U.r2(a.km), time: Math.round(a.seg || 0), type: a.tipo === 'TrailRun' ? 'Trail' : 'Rodagem', hr: a.fc ? Math.round(a.fc) : '', hrMax: a.fcmax ? Math.round(a.fcmax) : '', src: 'strava', notes: nome + ' (Strava)' });
      else n += junta('workouts', ext, { date, start: hm(a.ini), title: nome, dur: Math.max(1, Math.round((a.seg || a.total || 0) / 60)), items: [], km: a.km ? U.r2(a.km) : '', src: 'strava', notes: (PT[a.tipo] || a.tipo) + ' (Strava)' }); });
    if (k === 'oura') { (j.sono || []).forEach(s => { if (!s.dia || !s.total) return; const rec = { date: s.dia, bed: s.deita, wake: s.acorda, bedT: hm(s.deita), wakeT: hm(s.acorda), min: Math.round(s.total / 60), profundo: Math.round((s.profundo || 0) / 60), rem: Math.round((s.rem || 0) / 60), leve: Math.round((s.leve || 0) / 60), acordado: Math.round((s.acordado || 0) / 60), inBed: Math.round((s.cama || s.total) / 60), src: 'oura', ext: 'oura:' + s.id };
        const old = OS.all('sleep').find(r => r.date === s.dia); if (old && old.src !== 'oura' && (old.min || 0) > rec.min + 5) return; if (old) OS.upd('sleep', old.id, rec, { silent: true }); else { OS.add('sleep', rec, { silent: true }); n++; } });
      (j.dias || []).forEach(d => { const old = OS.all('oura').find(x => x.date === d.dia), rec = { date: d.dia, prontidao: d.prontidao, sono: d.sono, atividade: d.atividade, passos: d.passos, kcal: d.kcal, src: 'oura' }; if (old) OS.upd('oura', old.id, rec, { silent: true }); else { OS.add('oura', rec, { silent: true }); n++; } });
      (j.treinos || []).forEach(w => { const date = w.dia || String(w.ini || '').slice(0, 10); if (!date) return; const ext = 'oura:' + w.id, seg = w.ini && w.fim ? Math.max(0, (Date.parse(w.fim) - Date.parse(w.ini)) / 1000) : 0, nome = PT[w.tipo] || w.tipo;
        if (CORRE.test(w.tipo) && w.km) n += junta('runs', ext, { date, km: U.r2(w.km), time: Math.round(seg), type: 'Rodagem', kcal: w.kcal ? Math.round(w.kcal) : '', src: 'oura', notes: nome + ' (Oura)' });
        else n += junta('workouts', ext, { date, start: hm(w.ini), title: nome, dur: Math.max(1, Math.round(seg / 60)), items: [], src: 'oura', notes: nome + ' (Oura)' }); }); }
    setEst({ ['ult_' + k]: U.today(), ['n_' + k]: (E['n_' + k] || 0) + n }); OS.emit && OS.emit('change', k === 'oura' ? 'sleep' : 'runs');
    UI.toast(n ? `${NOME[k]}: ${n} registo${n === 1 ? '' : 's'} novo${n === 1 ? '' : 's'} no Prumo.` : `${NOME[k]}: já estava tudo no Prumo.`, 'pos'); }
  catch (e) { UI.toast(e.message, 'neg'); if (e.code === 'desligado') atualiza(); }
  BUSY = ''; OS.request(); };
A.lgImport = b => importar(b.dataset.k);
// abrir o site do serviço: a janela abre já no toque (sem bloqueio) e recebe o endereço quando o servidor o der
A.lgLigar = async b => { const k = b.dataset.k; let w = null; try { w = window.open('', '_blank'); } catch (e) { }
  try { const j = await call('inicio', { k }); ESPERA = Date.now(); if (w && !w.closed) w.location.href = j.url; else location.href = j.url; } catch (e) { if (w) try { w.close(); } catch (er) { } UI.toast(e.message, 'neg'); } };
A.lgSair = async b => { const k = b.dataset.k; if (!confirm(`Desligar o ${NOME[k]}? Os registos que já entraram ficam no Prumo.`)) return; try { await call('sair', { k }); setEst({ ['ult_' + k]: '' }); UI.toast(NOME[k] + ' desligado.', 'pos'); } catch (e) { UI.toast(e.message, 'neg'); } atualiza(); };
const volta = () => { if (ESPERA && Date.now() - ESPERA < 15 * 60e3 && !document.hidden) { ESPERA = 0; atualiza(); } };
document.addEventListener('visibilitychange', volta); window.addEventListener('focus', volta);

/* ---------- os cartões ---------- */
const cartao = (k, s) => { const E = est(), ult = E['ult_' + k], O = k === 'oura' ? U.sortBy(OS.all('oura'), x => x.date).slice(-7) : [];
  const txt = k === 'strava' ? 'Corridas, bicicleta, natação, ginásio e o resto das tuas atividades entram sozinhas nas Corridas e nos Treinos.' : 'O sono de cada noite, a prontidão, a atividade, os passos e os treinos do teu anel Oura.';
  return `<div class="pn lg-c" id="lg-${k}" data-open="1"><div class="pn-h"><h3>${UI.ic(k === 'strava' ? 'bolt' : 'heart')}${NOME[k]}</h3><span class="bdg ${s.ligado ? 'pos' : ''}">${s.ligado ? 'ligado' : 'desligado'}</span></div>
    <p class="mut" style="margin:0 0 10px">${txt}</p>
    ${s.ligado ? `<p style="margin:0 0 10px">${s.quem ? esc(s.quem) + ' · ' : ''}${ult ? 'última importação ' + esc(U.fmtDS ? U.fmtDS(ult) : ult) : 'ainda por importar'}</p>
      ${O.length ? `<div class="lg-oura">${O.map(x => `<span title="${esc(x.date)}"><b>${x.prontidao != null ? x.prontidao : '—'}</b><small>${esc(String(x.date).slice(8))}</small></span>`).join('')}<em>prontidão dos últimos dias</em></div>` : ''}
      <div class="row gap8" style="flex-wrap:wrap"><button class="btn sm" data-act="lgImport" data-k="${k}"${BUSY ? ' disabled' : ''}>${UI.ic('sync')}${BUSY === k ? 'A importar…' : 'Importar agora'}</button><button class="btn sm ghost" data-act="lgSair" data-k="${k}">Desligar</button></div>`
    : `<button class="btn sm pri" data-act="lgLigar" data-k="${k}">Ligar o ${NOME[k]}</button>`}
    ${k === 'strava' ? '<p class="mut lg-g"><b>Garmin:</b> no Garmin Connect, vai a Definições › Apps de terceiros › Strava e liga. As atividades do relógio passam pelo Strava e chegam ao Prumo.</p>' : ''}
    <p class="mut lg-g">Pelas regras do ${NOME[k]}, estes dados ficam só no teu Prumo e nunca vão para a IA (o Spyke não os lê).</p></div>`; };
const painel = () => { if (!conta()) return ''; const E = est(), S = E.s || {};
  if (!E.at || Date.now() - TRIED > 60e3) { if (Date.now() - TRIED > 30e3) setTimeout(atualiza, 0); }
  const ks = Object.keys(NOME).filter(k => S[k] && S[k].pronto); if (!ks.length) return '';
  return `<h4 class="set-h">Desporto e sono</h4>${ks.map(k => cartao(k, S[k])).join('')}`; };
OS.on('ready', () => { const sv = OS.settingsView; if (!sv || sv.__lg) return;
  OS.settingsView = x => { const h = sv(x); if (String(x || '') !== 'ligacoes') return h; const p = painel(); if (!p) return h; const i = h.lastIndexOf('</div>'); return i > 0 ? h.slice(0, i) + p + h.slice(i) : h + p; };
  Object.keys(sv).forEach(k => { if (!(k in OS.settingsView)) OS.settingsView[k] = sv[k]; }); OS.settingsView.__lg = 1; });
OS.LigaSaude = { painel, importar, atualiza, estado: est };
})();
