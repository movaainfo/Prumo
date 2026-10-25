/* PRUMO — Currículo (Carreira e contactos › Currículo).
   O teu CV em PDF, foto ou texto colado. A IA lê-o e analisa-o: nota de 0 a 100, pontos fortes, o que melhorar, frases reescritas,
   palavras-chave que faltam e o que o Prumo já sabe de ti e não está no CV (experiências, competências, certificações, cursos, estudos).
   Também adapta o CV a uma vaga (colas o anúncio). O ficheiro fica neste aparelho; o texto e a análise sincronizam com a conta. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;
const MAXF = 8 * 1048576;
OS.S.cvs = { label: 'Currículo', title: r => r.name || 'Currículo', fields: [
  { k: 'name', l: 'Nome', t: 'text' }, { k: 'alvo', l: 'Vaga ou área que procuras (a análise tem isto em conta)', t: 'text' },
  { k: 'text', l: 'Texto do currículo', t: 'area', rows: 14 }], defaults: () => ({ name: 'O meu currículo' }) };
const cur = () => U.sortBy(OS.all('cvs'), c => c.date || '', -1)[0] || null;

/* ---------- o ficheiro, só neste aparelho ---------- */
let IDB = null;
const db = () => IDB || (IDB = new Promise((ok, ko) => { try { const q = indexedDB.open('prumo-cv', 1); q.onupgradeneeded = () => q.result.createObjectStore('f'); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); } catch (e) { ko(e); } }));
const idb = (mode, fn) => db().then(d => new Promise((ok, ko) => { const tx = d.transaction('f', mode), q = fn(tx.objectStore('f')); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => ko(tx.error); }));
const b64 = file => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => ko(r.error); r.readAsDataURL(file); });

/* ---------- o que o Prumo sabe de ti (para a IA comparar com o CV) ---------- */
const known = () => { const s = f => { try { return f(); } catch (e) { return []; } };
  return { experiencias: s(() => OS.all('experiences').map(e => [e.kind, e.title, e.org, e.start, e.end || (e.current ? 'atual' : ''), (e.skills || []).join(', '), String(e.desc || '').slice(0, 200)].filter(Boolean).join(' · '))).slice(0, 30),
    competencias: s(() => OS.all('skills').map(k => `${k.name} (${k.level || 0}/5)`)).slice(0, 40),
    certificacoes: s(() => OS.all('certs').filter(c => c.status === 'Obtida').map(c => c.name || c.title).concat(OS.all('learn').filter(l => l.kind === 'Certificação' && l.status === 'Concluído').map(l => l.title))).slice(0, 30),
    cursos: s(() => OS.all('learn').filter(l => l.status === 'Concluído' && l.kind !== 'Certificação').map(l => `${l.kind || 'Curso'}: ${l.title}`)).slice(0, 30),
    estudos: s(() => OS.all('subjects').filter(x => x.status === 'Em curso' || x.status === 'Concluída').map(x => x.name)).slice(0, 30),
    projetos: s(() => OS.all('projects').filter(p => p.status === 'Concluído' && ['Profissional', 'Empresarial', 'Aprendizagem'].includes(p.type)).map(p => p.title || p.name)).slice(0, 20),
    candidaturas: s(() => OS.all('applications').slice(-15).map(a => [a.company, a.role, a.status].filter(Boolean).join(' · '))),
    pais: (OS.Pais && OS.Pais.name(OS.Pais.code())) || '' }; };

const ASK = (alvo, vaga) => `És um especialista em recrutamento e em currículos (ATS, recrutadores de ${(OS.Pais && OS.Pais.name(OS.Pais.code())) || 'Portugal e Brasil'}). Analisa este currículo com honestidade e de forma prática, em português de Portugal.
${alvo ? `A pessoa procura: ${alvo}.` : 'Ainda não disse que vaga procura: deduz pela experiência e pelos estudos.'}${vaga ? `\nAdapta a análise a ESTA VAGA (anúncio colado pela pessoa): """${String(vaga).slice(0, 5000)}"""` : ''}
O que o Prumo (a app da pessoa) já sabe dela, para comparares com o CV e apontares o que falta: ${JSON.stringify(known())}
Responde APENAS JSON: {"texto":"o texto do currículo tal como está (só se o recebeste como ficheiro ou imagem; senão vazio)","nota":0-100,"resumo":"veredicto em 2–3 frases","fortes":["…"],"melhorar":[{"o":"o problema","como":"como corrigir, concreto"}],"reescrever":[{"antes":"frase do CV","depois":"versão melhor, com verbo de ação e resultado"}],"faltam_palavras":["palavras-chave que os recrutadores e o ATS procuram e faltam"],"falta_no_cv":["coisas que o Prumo sabe e não estão no CV"],"formato":"comentário sobre o tamanho, a estrutura e o design (1–2 frases)"${vaga ? ',"vaga":{"encaixe":0-100,"porque":"1–2 frases","mudar":["o que mudar no CV para esta vaga"]}' : ''}}`;

let BUSY = '', ERR = '';
const analyse = async (rec, file, vaga) => { if (BUSY) return; if (!(OS.AI && OS.AI.key())) { UI.toast('Liga a IA em Definições › Spyke para analisar o currículo', 'warn'); return; }
  BUSY = vaga ? 'vaga' : 'cv'; ERR = ''; OS.request();
  try { const parts = [{ text: ASK(rec.alvo, vaga) }];
    if (file) parts.push({ inline_data: { mime_type: file.mime, data: file.data } }); else parts.push({ text: 'CURRÍCULO:\n' + String(rec.text || '').slice(0, 30000) });
    const o = await OS.AI.json(parts, .2), arr = (x, n) => (Array.isArray(x) ? x : []).slice(0, n);
    const an = { at: Date.now(), nota: Math.max(0, Math.min(100, Math.round(+o.nota || 0))), resumo: String(o.resumo || '').slice(0, 800), fortes: arr(o.fortes, 8).map(String),
      melhorar: arr(o.melhorar, 10).map(x => ({ o: String(x.o || x || '').slice(0, 300), como: String(x.como || '').slice(0, 400) })), reescrever: arr(o.reescrever, 8).map(x => ({ antes: String(x.antes || '').slice(0, 400), depois: String(x.depois || '').slice(0, 400) })),
      faltam: arr(o.faltam_palavras, 20).map(String), falta: arr(o.falta_no_cv, 12).map(String), formato: String(o.formato || '').slice(0, 400), len: file ? -1 : String(rec.text || '').length };
    const p = vaga ? { vaga: { at: Date.now(), txt: String(vaga).slice(0, 400), encaixe: Math.round(+((o.vaga || {}).encaixe) || 0), porque: String((o.vaga || {}).porque || '').slice(0, 500), mudar: arr((o.vaga || {}).mudar, 10).map(String) } } : { an };
    if (!vaga && o.texto && !rec.text) p.text = String(o.texto).slice(0, 40000);
    OS.upd('cvs', rec.id, p); UI.toast(vaga ? 'Comparação com a vaga pronta' : 'Análise pronta', 'pos'); }
  catch (e) { ERR = e.message || 'A IA não conseguiu ler o currículo agora.'; }
  BUSY = ''; OS.request(); };
const fileOf = async rec => { try { const f = await idb('readonly', st => st.get(rec.id)); return f && f.data ? f : null; } catch (e) { return null; } };

/* ---------- ações ---------- */
document.addEventListener('change', async e => { const el = e.target; if (!el || el.id !== 'cvFile') return; const file = el.files && el.files[0]; el.value = ''; if (!file) return;
  if (file.size > MAXF) return UI.toast('O ficheiro é grande demais (máximo 8 MB)', 'warn');
  if (!/pdf|image\//.test(file.type)) return UI.toast('Envia o currículo em PDF ou em foto (JPG/PNG). Se está em Word, guarda-o como PDF primeiro, ou cola o texto.', 'warn');
  try { const data = await b64(file), old = cur(), r = old ? (OS.upd('cvs', old.id, { name: file.name, mime: file.type, size: file.size, date: U.today(), text: '', an: null, vaga: null }), OS.get('cvs', old.id)) : OS.add('cvs', { name: file.name, mime: file.type, size: file.size, date: U.today(), text: '' });
    await idb('readwrite', st => st.put({ mime: file.type, data, name: file.name }, r.id)); analyse(r, { mime: file.type, data }); }
  catch (err) { UI.toast('Não consegui abrir o ficheiro: ' + (err.message || err), 'neg'); } });
A.cvPaste = () => { const r = cur(); if (r) UI.openForm('cvs', r.id); else UI.openForm('cvs'); };
A.cvRun = async () => { const r = cur(); if (!r) return; analyse(r, r.text ? null : await fileOf(r)); };
A.cvOpen = async () => { const r = cur(), f = r && await fileOf(r); if (!f) return UI.toast('O ficheiro está noutro aparelho. Aqui só há o texto.', 'warn');
  const bin = atob(f.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); window.open(URL.createObjectURL(new Blob([u8], { type: f.mime })), '_blank'); };
A.cvDel = async () => { const r = cur(); if (!r || !confirm('Apagar o currículo e a análise?')) return; OS.del('cvs', r.id); try { await idb('readwrite', st => st.delete(r.id)); } catch (e) { } };
A.cvVaga = async () => { const r = cur(), t = document.getElementById('cvVagaTxt'); if (!r || !t || t.value.trim().length < 40) return UI.toast('Cola o anúncio da vaga (o texto todo)', 'warn'); analyse(r, r.text ? null : await fileOf(r), t.value.trim()); };
A.cvCopy = b => { try { navigator.clipboard.writeText(b.dataset.t || ''); UI.toast('Copiado', 'pos'); } catch (e) { } };

/* ---------- ecrã ---------- */
const ring = n => `<div class="cv-ring" style="--rp:${n / 100};--c:${n >= 75 ? 'var(--pos)' : n >= 50 ? 'var(--warn,#F2B544)' : 'var(--neg)'}"><b>${n}</b><small>de 100</small></div>`;
const view = () => { const r = cur(), ai = OS.AI && OS.AI.key();
  const up = `<label class="btn ${r ? '' : 'pri'}"><input type="file" id="cvFile" accept="application/pdf,image/*" hidden>${UI.ic('plus')}<span>${r ? 'Trocar o ficheiro' : 'Enviar o currículo (PDF ou foto)'}</span></label><button class="btn ghost" data-act="cvPaste">${UI.ic('edit')}<span>${r && r.text ? 'Ver ou corrigir o texto' : 'Colar o texto'}</span></button>`;
  if (!r) return `<div class="pn cv-empty"><div class="pn-h"><h3>${UI.ic('note')}O teu currículo</h3></div><p class="mut">Envia o teu CV e a IA diz-te o que está bem, o que falta e como o melhorar. Também o compara com uma vaga e com o que já registaste no Prumo (experiências, competências, certificações e cursos).</p><div class="row gap8" style="flex-wrap:wrap">${up}</div>${ai ? '' : '<p class="mut" style="margin-top:10px">Para a análise, liga a IA em Definições › Spyke.</p>'}</div>`;
  const an = r.an, v = r.vaga;
  return `<div class="pn"><div class="pn-h"><h3>${UI.ic('note')}${esc(r.name || 'Currículo')}</h3><span class="mut">${r.date ? U.fmtD(r.date) : ''}${r.size ? ' · ' + Math.max(1, Math.round(r.size / 1024)) + ' KB' : ''}</span></div>
    <div class="row gap8" style="flex-wrap:wrap">${r.mime ? `<button class="btn sm" data-act="cvOpen">${UI.ic('right')}<span>Abrir</span></button>` : ''}${up.replace(/class="btn /g, 'class="btn sm ')}<button class="btn sm ghost" data-act="cvRun" ${BUSY ? 'disabled' : ''}>Analisar de novo</button><button class="btn sm danger ghost" data-act="cvDel">Apagar</button></div>
    ${r.alvo ? `<p class="mut" style="margin:10px 0 0">Vaga ou área: <b>${esc(r.alvo)}</b></p>` : `<p class="mut" style="margin:10px 0 0">Diz que vaga ou área procuras (em <a href="#" data-act="cvPaste">Ver ou corrigir o texto</a>) para a análise ser mais certeira.</p>`}</div>
  ${BUSY === 'cv' ? `<div class="pn"><div class="sai-busy"><div class="fd-spin"></div><span>A IA está a ler e a analisar o teu currículo…</span></div></div>` : ERR ? `<div class="pn"><p class="neg">${esc(ERR)}</p><button class="btn sm" data-act="cvRun">Tentar outra vez</button></div>` : ''}
  ${an && an.len > -1 && r.text && an.len !== r.text.length && !BUSY ? `<div class="pn"><p class="mut" style="margin:0 0 8px">Mudaste o texto do currículo depois da análise.</p><button class="btn sm pri" data-act="cvRun">Analisar a versão nova</button></div>` : ''}
  ${an ? `<div class="pn cv-an"><div class="cv-top">${ring(an.nota)}<div><h3 style="margin:0 0 6px">Análise da IA</h3><p style="margin:0">${esc(an.resumo)}</p>${an.formato ? `<p class="mut" style="margin:6px 0 0">${esc(an.formato)}</p>` : ''}</div></div>
    ${an.fortes.length ? `<h4>${UI.ic('check')}O que está bem</h4><ul class="cv-l ok">${an.fortes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${an.melhorar.length ? `<h4>${UI.ic('arrowUp')}O que melhorar</h4><ul class="cv-l">${an.melhorar.map(x => `<li><b>${esc(x.o)}</b>${x.como ? `<span>${esc(x.como)}</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${an.reescrever.length ? `<h4>${UI.ic('edit')}Frases reescritas</h4><div class="cv-rw">${an.reescrever.map(x => `<div><small class="mut">Antes</small><p class="cv-a">${esc(x.antes)}</p><small class="mut">Depois</small><p class="cv-d">${esc(x.depois)}</p><button class="btn xs ghost" data-act="cvCopy" data-t="${esc(x.depois)}">Copiar</button></div>`).join('')}</div>` : ''}
    ${an.falta.length ? `<h4>${UI.ic('info')}Tens no Prumo e falta no CV</h4><ul class="cv-l">${an.falta.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${an.faltam.length ? `<h4>${UI.ic('tag')}Palavras-chave que faltam</h4><div class="cv-kw">${an.faltam.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}</div>`
    : !BUSY && !ERR ? `<div class="pn"><p class="mut">${ai ? 'Ainda sem análise.' : 'Liga a IA em Definições › Spyke para a análise.'}</p>${ai ? '<button class="btn pri" data-act="cvRun">Analisar o currículo</button>' : ''}</div>` : ''}
  <div class="pn"><div class="pn-h"><h3>${UI.ic('target')}Comparar com uma vaga</h3></div><p class="mut" style="margin:0 0 8px">Cola o anúncio de uma vaga: a IA diz quanto o teu CV encaixa e o que mudar para essa vaga.</p>
    <textarea class="field" id="cvVagaTxt" rows="5" placeholder="Cola aqui o texto da vaga…"></textarea><div class="row gap8" style="margin-top:8px"><button class="btn" data-act="cvVaga" ${BUSY ? 'disabled' : ''}>${BUSY === 'vaga' ? 'A comparar…' : 'Comparar'}</button></div>
    ${v ? `<div class="cv-vaga"><div class="cv-top">${ring(v.encaixe)}<div><b>Encaixe com a vaga</b><p style="margin:4px 0 0">${esc(v.porque)}</p><small class="mut">${esc(v.txt.slice(0, 120))}…</small></div></div>${v.mudar.length ? `<ul class="cv-l">${v.mudar.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>` : ''}</div>`; };
OS.CV = { view, cur };
})();
