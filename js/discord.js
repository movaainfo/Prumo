/* PRUMO — Discord (v3.72): publica num canal teu do Discord o que escolheres (treino terminado, meta concluída, nível do Dominus,
   bloco de foco terminado). Liga-se com o "webhook" do canal (Discord › Definições do canal › Integrações › Webhooks › Novo webhook ›
   Copiar URL). O endereço fica só neste aparelho; o servidor do Prumo só o usa para entregar cada mensagem (não o guarda).
   O Discord não deixa nenhum site mudar o teu estado ("A jogar…"); isso só uma app instalada no computador consegue. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc, K = 'os2discord';
const EV = [['treino', 'Treino terminado'], ['meta', 'Meta concluída'], ['nivel', 'Subir de nível no Dominus'], ['foco', 'Bloco de foco terminado']];
const st = () => Object.assign({ url: '', ev: { treino: 1, meta: 1, nivel: 1, foco: 0 }, lvl: 0, at: 0 }, U.ls.get(K, {}) || {});
const save = o => U.ls.set(K, Object.assign(st(), o));
const RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d{5,25}\/[\w-]{20,120}$/;
const quem = () => { try { return (OS.one('profile') || {}).short || OS.who() || 'Alguém'; } catch (e) { return 'Alguém'; } };
const envia = async (titulo, texto, cor) => { const S = st(); if (!S.url) return false; if (!(OS.Acc && OS.Acc.on)) return false;
  try { await OS.Acc.call('discord', { url: S.url, titulo: String(titulo).slice(0, 200), texto: String(texto || '').slice(0, 1500), cor: cor || 0x9b1b30 }); save({ at: Date.now() }); return true; } catch (e) { return e; } };
// o que acontece na app → mensagem (só o que ligaste)
const quer = k => { const S = st(); return !!S.url && !!(S.ev || {})[k]; };
OS.on && OS.on('add:workouts', w => { if (!w || w.src || !quer('treino')) return; let sets = 0, vol = 0; (Array.isArray(w.items) ? w.items : []).forEach(it => (it.sets || []).forEach(s => { sets++; vol += (+s.kg || 0) * (+s.reps || 0); }));
  envia(`${quem()} terminou o treino`, `**${w.title || 'Treino'}**${w.dur ? ' · ' + w.dur + ' min' : ''}${sets ? ' · ' + sets + ' séries' : ''}${vol ? ' · ' + Math.round(vol).toLocaleString('pt-PT') + ' kg de volume' : ''}`, 0xc8102e); });
OS.on && OS.on('upd:goals', (g, antes) => { if (!g || !quer('meta') || g.status !== 'Concluída' || (antes && antes.status === 'Concluída')) return; envia(`${quem()} concluiu uma meta`, `**${g.title || 'Meta'}**`, 0x2e9e5b); });
OS.on && OS.on('add:focusblocks', f => { if (!f || !quer('foco')) return; envia(`${quem()} terminou um bloco de foco`, `${f.mins ? f.mins + ' min de foco' : 'Bloco terminado'}${f.done != null ? ' · ' + f.done + ' pendências resolvidas' : ''}`, 0x3d7bf7); });
let nivAt = 0; const nivel = () => { if (!quer('nivel') || Date.now() - nivAt < 20e3) return; nivAt = Date.now();
  try { const l = OS.Dom && OS.Dom.level ? OS.Dom.level() : 0, S = st(); if (!l) return; if (!S.lvl) { save({ lvl: l }); return; } if (l > S.lvl) { save({ lvl: l }); envia(`${quem()} subiu de nível no Dominus`, `Agora é **nível ${l}**.`, 0xd4a017); } } catch (e) { } };
OS.on && OS.on('change', () => setTimeout(nivel, 500));
/* ---------- Definições › Ligações › Discord ---------- */
A.dcTeste = async () => { const r = await envia('Teste do Prumo', `${quem()} ligou este canal ao Prumo. A partir de agora aparecem aqui os avisos que escolheste.`); UI.toast(r === true ? 'Mensagem de teste enviada para o Discord.' : (r && r.message) || 'Não deu para enviar. Confirma o endereço do webhook.', r === true ? 'pos' : 'neg'); };
A.dcSair = () => { if (!confirm('Desligar o Discord deste aparelho?')) return; U.ls.set(K, {}); OS.request(); };
A.dcEv = b => { const S = st(), ev = Object.assign({}, S.ev); ev[b.dataset.k] = ev[b.dataset.k] ? 0 : 1; save({ ev }); OS.request(); };
OS.forms = OS.forms || {}; OS.forms.dcLigar = async (f, v) => { const u = v('u').trim(); if (!RE.test(u)) { UI.toast('Esse endereço não é um webhook do Discord. Copia-o em Definições do canal › Integrações › Webhooks.', 'neg'); return; }
  save({ url: u, lvl: 0 }); OS.request(); const r = await envia('O Prumo está ligado a este canal', `${quem()} ligou o Prumo. Os avisos escolhidos vão aparecer aqui.`); UI.toast(r === true ? 'Discord ligado: vê a mensagem no canal.' : 'Guardado, mas o Discord não aceitou a mensagem. Confirma o endereço.', r === true ? 'pos' : 'warn'); };
const painel = () => { if (!(OS.Acc && OS.Acc.on)) return ''; const S = st();
  return `<h4 class="set-h">Discord</h4><div class="pn" id="dcPn"><div class="pn-h"><h3>${UI.ic('users')}Discord</h3><span class="bdg ${S.url ? 'pos' : ''}">${S.url ? 'ligado' : 'desligado'}</span></div>
    ${S.url ? `<p class="mut" style="margin:0 0 8px">O Prumo publica no teu canal:</p><div class="row gap6" style="flex-wrap:wrap;margin-bottom:10px">${EV.map(([k, n]) => `<button type="button" class="chip ${(S.ev || {})[k] ? 'on' : ''}" aria-pressed="${!!(S.ev || {})[k]}" data-act="dcEv" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="row gap8" style="flex-wrap:wrap"><button class="btn sm" data-act="dcTeste">Enviar mensagem de teste</button><button class="btn sm ghost" data-act="dcSair">Desligar</button></div>`
    : `<p class="mut" style="margin:0 0 10px">Partilha num canal teu do Discord os treinos terminados, as metas concluídas e os níveis do Dominus.</p>
      <ol class="adm-steps"><li>No Discord, abre as definições do canal › <b>Integrações</b> › <b>Webhooks</b> › <b>Novo webhook</b>.</li><li>Carrega em <b>Copiar URL do webhook</b> e cola aqui.</li></ol>
      <form class="row gap8" data-form="dcLigar" autocomplete="off" style="flex-wrap:wrap"><input class="field grow" name="u" type="password" placeholder="https://discord.com/api/webhooks/…" aria-label="Endereço do webhook do Discord" style="min-width:200px" required><button class="btn sm pri">Ligar</button></form>`}
    <p class="mut" style="margin:10px 0 0;font-size:12.5px">O endereço fica só neste aparelho. O Discord não deixa nenhum site mudar o teu estado ("A jogar…"): isso só uma app instalada no computador consegue.</p></div>`; };
OS.on && OS.on('ready', () => { const sv = OS.settingsView; if (!sv || sv.__dc) return;
  OS.settingsView = x => { const h = sv(x); if (String(x || '') !== 'ligacoes') return h; const p = painel(); if (!p) return h; const i = h.lastIndexOf('</div>'); return i > 0 ? h.slice(0, i) + p + h.slice(i) : h + p; };
  Object.keys(sv).forEach(k => { if (!(k in OS.settingsView)) OS.settingsView[k] = sv[k]; }); OS.settingsView.__dc = 1; });
OS.Discord = { envia, estado: st, RE };
})();
