// PRUMO · IA para todas as contas (função do Vercel), sem ninguém configurar nada.
// A app fala com a IA no formato do Google Gemini; numa conta, em vez da chave de cada pessoa, os pedidos vêm para aqui:
//   - se o projeto tiver GEMINI_API_KEY (posta pelo dono no Vercel), seguem para o Google (texto, fotos e voz);
//   - senão, o texto segue para a IA grátis da Pollinations (modelo aberto) e a resposta volta no formato do Gemini.
// Só para quem tem sessão numa conta; limite por pessoa para ninguém gastar a cota de todos.
// v2.48 — o Spyke novo (cada parte liga-se sozinha quando o dono põe a chave no Vercel; sem chave, tudo continua como antes):
//   p=claude → o cérebro: Claude (Anthropic), com ANTHROPIC_API_KEY. A app usa o SDK oficial e os pedidos passam por aqui (a chave nunca vai para a app).
//   p=stt    → o ouvido: transcrição dedicada (GROQ_API_KEY → Whisper; DEEPGRAM_API_KEY → Nova; OPENAI_API_KEY → gpt-4o-transcribe;
//              AZURE_SPEECH_KEY + AZURE_SPEECH_REGION → Microsoft). Sem nenhuma, a app transcreve com o Gemini como antes.
'use strict';
const N = require('./_nuvem'), P = require('./_planos');
const G = 'https://generativelanguage.googleapis.com/';
const FREE = () => process.env.NAUTILO_IA_LIVRE || 'https://text.pollinations.ai/openai';
const gkey = () => String(process.env.GEMINI_API_KEY || '').trim();
const OKP = /^v1beta\/models(\?[A-Za-z0-9=&_.-]*)?$|^v1beta\/models\/[A-Za-z0-9._-]{3,80}:(generateContent|countTokens)$/;
const POR_MIN = 30, POR_DIA = +(process.env.NAUTILO_IA_DIA || 400);
const akey = () => String(process.env.ANTHROPIC_API_KEY || '').trim(), CL_DIA = +(process.env.NAUTILO_CLAUDE_DIA || 120), CL_MODELS = /^claude-(opus|sonnet|haiku)-[0-9a-z-]{1,24}$/;
const env = k => String(process.env[k] || '').trim();
const sttName = () => env('GROQ_API_KEY') ? 'groq' : env('DEEPGRAM_API_KEY') ? 'deepgram' : env('OPENAI_API_KEY') ? 'openai' : env('AZURE_SPEECH_KEY') && env('AZURE_SPEECH_REGION') ? 'azure' : '';
const SEEN = new Map(), DAY = new Map();
// v3.21: a sessão traz também o plano da conta (o limite de IA por dia, as fotos e o Claude dependem dele)
const okSession = async req => { const t = await N.readToken(req); if (!t) return null; const c = SEEN.get(t.a);
  if (c && Date.now() - c.at < 60e3) return c.ok ? Object.assign({}, t, { ef: c.ef, em: c.em }) : null;
  let ok = false, ef = null, r0 = ''; try { const g = await N.store().get('a/' + t.a); if (g) { const r = N.open(await N.accKey(), g.buf); ok = r.uid === t.u && (r.tv || 1) === t.v && !r.verif && !/@nautilo\.test$/i.test(r.email || '') /* v3.62: as contas de teste (sem e-mail confirmado) não usam a IA */; ef = P.efetivo(r); r0 = r.email || ''; } } catch (e) { }
  SEEN.set(t.a, { ok, ef, em: r0, at: Date.now() }); if (SEEN.size > 5000) SEEN.delete(SEEN.keys().next().value); return ok ? Object.assign({}, t, { ef, em: r0 }) : null; };
const hasImage = b => (b.contents || []).some(c => (c.parts || []).some(p => { const d = p.inline_data || p.inlineData || p.file_data || p.fileData; return d && !/^audio\//i.test(d.mime_type || d.mimeType || ''); }));
const perDay = (uid, max = POR_DIA, tag = '') => { const d = new Date().toISOString().slice(0, 10), k = tag + uid + '|' + d, n = (DAY.get(k) || 0) + 1; DAY.set(k, n); if (DAY.size > 20000) DAY.delete(DAY.keys().next().value); return n > max; };
/* ---------- o ouvido: áudio (WAV 16 kHz em base64) → texto ---------- */
const stt = async (b64, lang) => { const buf = Buffer.from(String(b64 || ''), 'base64'); if (buf.length < 2000 || buf.length > 6e6) throw Object.assign(new Error('Áudio vazio ou grande demais.'), { status: 400 });
  const L = /^[a-z]{2}(-[A-Z]{2})?$/.test(lang || '') ? lang : 'pt-BR', short = L.slice(0, 2), ac = new AbortController(), to = setTimeout(() => ac.abort(), 25e3), which = sttName();
  const form = (model, extra = {}) => { const f = new FormData(); f.append('file', new Blob([buf], { type: 'audio/wav' }), 'fala.wav'); f.append('model', model); f.append('language', short); f.append('response_format', 'json'); Object.entries(extra).forEach(([k, v]) => f.append(k, v)); return f; };
  try { let r, j;
    if (which === 'groq') { r = await fetch((env('GROQ_BASE_URL') || 'https://api.groq.com/openai/v1') + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + env('GROQ_API_KEY') }, body: form(env('GROQ_STT_MODEL') || 'whisper-large-v3-turbo', { temperature: '0' }), signal: ac.signal }); j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || 'Groq ' + r.status), { status: r.status }); return String(j.text || '').trim(); }
    if (which === 'openai') { r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + env('OPENAI_API_KEY') }, body: form(env('OPENAI_STT_MODEL') || 'gpt-4o-transcribe'), signal: ac.signal }); j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || 'OpenAI ' + r.status), { status: r.status }); return String(j.text || '').trim(); }
    if (which === 'deepgram') { for (const m of [env('DEEPGRAM_MODEL') || 'nova-3', 'nova-2']) { r = await fetch(`https://api.deepgram.com/v1/listen?model=${m}&language=${encodeURIComponent(L)}&smart_format=true&punctuate=true`, { method: 'POST', headers: { Authorization: 'Token ' + env('DEEPGRAM_API_KEY'), 'Content-Type': 'audio/wav' }, body: buf, signal: ac.signal }); j = await r.json().catch(() => ({}));
        if (r.ok) return String((((((j.results || {}).channels || [])[0] || {}).alternatives || [])[0] || {}).transcript || '').trim(); if (r.status !== 400) break; } throw Object.assign(new Error('Deepgram ' + r.status), { status: r.status }); }
    if (which === 'azure') { r = await fetch(`https://${encodeURIComponent(env('AZURE_SPEECH_REGION').toLowerCase())}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(L)}&format=simple`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': env('AZURE_SPEECH_KEY'), 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json' }, body: buf, signal: ac.signal });
      j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error('Microsoft ' + r.status), { status: r.status }); return j.RecognitionStatus && j.RecognitionStatus !== 'Success' ? '' : String(j.DisplayText || '').trim(); }
    throw Object.assign(new Error('Sem serviço de transcrição no servidor.'), { status: 501 }); }
  finally { clearTimeout(to); } };
/* ---------- o cérebro: o pedido do SDK da Anthropic, com a chave do projeto ---------- */
const claude = async (req, b) => { if (!b || !CL_MODELS.test(String(b.model || ''))) throw Object.assign(new Error('Modelo desconhecido.'), { status: 400 });
  const body = Object.assign({}, b, { max_tokens: Math.min(+b.max_tokens || 4000, 32000) }); delete body.stream;
  const h = { 'x-api-key': akey(), 'anthropic-version': String(req.headers['anthropic-version'] || '2023-06-01'), 'content-type': 'application/json' }, beta = String(req.headers['anthropic-beta'] || '');
  if (/^[a-z0-9,-]{1,300}$/.test(beta)) h['anthropic-beta'] = beta;
  // v2.96 (Vercel Pro): a função pode durar até 300 s, por isso o Claude tem tempo para pensar a sério
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 280e3);
  try { const r = await fetch((env('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com') + '/v1/messages', { method: 'POST', headers: h, body: JSON.stringify(body), signal: ac.signal }); return { status: r.status, txt: await r.text() }; }
  catch (e) { return { status: 504, txt: JSON.stringify({ type: 'error', error: { type: 'timeout_error', message: 'O Claude demorou demasiado. Tenta outra vez.' } }) }; }
  finally { clearTimeout(to); } };
const gErr = (res, status, message) => N.send(res, status, { error: { code: status, message, status: status === 429 ? 'RESOURCE_EXHAUSTED' : 'FAILED_PRECONDITION' } });
// Gemini → OpenAI (só texto) e a resposta de volta ao formato Gemini
const toChat = b => { const msgs = [], txt = parts => (parts || []).map(p => p.text || '').filter(Boolean).join('\n');
  if (b.systemInstruction) msgs.push({ role: 'system', content: txt(b.systemInstruction.parts) });
  (b.contents || []).forEach(c => { const t = txt(c.parts); if (t) msgs.push({ role: c.role === 'model' ? 'assistant' : 'user', content: t }); });
  return msgs; };
const hasMedia = b => (b.contents || []).some(c => (c.parts || []).some(p => p.inline_data || p.inlineData || p.file_data || p.fileData)) || /AUDIO|IMAGE/i.test(JSON.stringify((b.generationConfig || {}).responseModalities || ''));
const free = async b => { const gc = b.generationConfig || {}, json = /json/i.test(gc.responseMimeType || ''), ac = new AbortController(), to = setTimeout(() => ac.abort(), 90e3);
  try { const r = await fetch(FREE(), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ac.signal,
      body: JSON.stringify(Object.assign({ model: 'openai', messages: toChat(b), temperature: gc.temperature == null ? .3 : gc.temperature, private: true, referrer: 'nautilo' }, json ? { response_format: { type: 'json_object' } } : {})) });
    const j = await r.json().catch(() => ({})); const m = j.choices && j.choices[0] && j.choices[0].message;
    if (!r.ok || !m) return { status: r.status === 429 ? 429 : 502, body: { error: { code: r.status, message: 'A IA grátis não respondeu agora. Tenta daqui a um minuto.' } } };
    return { status: 200, body: { candidates: [{ content: { role: 'model', parts: [{ text: String(m.content || '') }] }, finishReason: 'STOP' }], modelVersion: 'nautilo-livre' } }; }
  catch (e) { return { status: 504, body: { error: { code: 504, message: 'A IA grátis demorou demasiado. Tenta outra vez.' } } }; } finally { clearTimeout(to); } };

/* ---------- v3.74: Fotos — a IA separa as fotos da galeria por categorias (só miniaturas pequenas; nada fica guardado) ---------- */
const FCATS = ['Pessoas e selfies', 'Família e amigos', 'Comida e bebida', 'Paisagens e viagens', 'Animais', 'Documentos e recibos', 'Capturas de ecrã', 'Memes e imagens da internet', 'Desporto e treino', 'Casa e objetos', 'Carros e transportes', 'Trabalho e estudo', 'Festas e eventos', 'Arte e criatividade', 'Outros'];
const FPED = n => `Estas são ${n} fotos da galeria de um telemóvel, pela ordem (0 a ${n - 1}). Para cada uma, responde SÓ com um array JSON: [{"i":0,"cat":"<exatamente uma de: ${FCATS.join(' | ')}>","tags":["até 6 palavras simples, em português de Portugal, do que se vê (objetos, lugar, cores, texto visível)"],"desc":"<frase curta do que mostra>","apagar":false,"motivo":""}].
"apagar": true só para o que costuma ser descartável: fotos acidentais (bolso, chão, tudo preto ou desfocado), capturas de ecrã sem importância, memes e imagens recebidas, recibos e talões, fotos repetidas de coisas banais. Então "motivo" diz porquê, curto. Nunca sugiras apagar fotos de pessoas, família, animais, viagens ou momentos especiais. Não identifiques pessoas pelo nome nem adivinhes dados pessoais.`;
const fArr = (txt, n) => { const m = String(txt || '').match(/\[[\s\S]*\]/); if (!m) return null; try { const L = JSON.parse(m[0]); if (!Array.isArray(L)) return null;
  return L.slice(0, n).map((o, k) => ({ i: Number.isInteger(o.i) ? o.i : k, cat: FCATS.includes(o.cat) ? o.cat : 'Outros', tags: (Array.isArray(o.tags) ? o.tags : []).map(t => String(t).slice(0, 30)).slice(0, 6), desc: String(o.desc || '').slice(0, 160), apagar: !!o.apagar, motivo: String(o.motivo || '').slice(0, 120) })); } catch (e) { return null; } };
const fotosIA = async L => { const pedido = FPED(L.length), to = () => AbortSignal.timeout(50e3);
  if (env('NAUTILO_FOTOS_MOCK')) { const r = await fetch(env('NAUTILO_FOTOS_MOCK'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ n: L.length }), signal: to() }); const o = fArr(await r.text(), L.length); if (o) return { r: o, via: 'teste' }; }
  if (akey()) { const r = await fetch((env('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com') + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': akey(), 'anthropic-version': '2023-06-01' }, signal: to(),
      body: JSON.stringify({ model: env('NAUTILO_FOTOS_MODEL') || 'claude-haiku-5-5', max_tokens: 2000, messages: [{ role: 'user', content: L.map(x => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: x.b64 } })).concat([{ type: 'text', text: pedido }]) }] }) });
    if (r.ok) { const j = await r.json(); const o = fArr(((j.content || []).find(c => c.type === 'text') || {}).text, L.length); if (o) return { r: o, via: 'claude' }; } }
  if (gkey()) { const r = await fetch(G + 'v1beta/models/' + (env('NAUTILO_FOTOS_GEMINI') || 'gemini-flash-lite-latest') + ':generateContent?key=' + encodeURIComponent(gkey()), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: to(),
      body: JSON.stringify({ contents: [{ parts: L.map(x => ({ inline_data: { mime_type: 'image/jpeg', data: x.b64 } })).concat([{ text: pedido }]) }], generationConfig: { temperature: 0, maxOutputTokens: 2000, responseMimeType: 'application/json' } }) });
    if (r.ok) { const j = await r.json(); const o = fArr((((((j.candidates || [])[0] || {}).content || {}).parts || [])[0] || {}).text, L.length); if (o) return { r: o, via: 'gemini' }; } }
  throw Object.assign(new Error(akey() || gkey() ? 'A IA não conseguiu ver as fotos agora. Tenta daqui a pouco.' : 'A IA de imagens não está ligada neste servidor.'), { status: akey() || gkey() ? 502 : 501 }); };
module.exports = N.handler(async (req, res) => {
  const q = req.query || {}, p = String(q.p || '');
  if (p === 'estado') return N.send(res, 200, { ok: true, google: !!gkey(), claude: !!akey(), stt: sttName(), modelo: env('NAUTILO_CLAUDE_MODEL') || '' });
  const t = await okSession(req); if (!t) return gErr(res, 401, 'A sessão terminou. Entra outra vez na conta.');
  try { await N.gate(t.em); } catch (e) { return gErr(res, 503, e.message); }   /* v3.62: manutenção */
  const ef = t.ef || { lvl: 3, ia: POR_DIA }; if (!ef.lvl) return gErr(res, 402, 'O teu teste grátis acabou: escolhe um plano em Planos para a IA voltar.');
  const iaDia = Math.min(POR_DIA, ef.ia || POR_DIA);
  if (p === 'stt') { if (req.method !== 'POST') return gErr(res, 405, 'Só POST.'); if (!sttName()) return gErr(res, 501, 'Sem serviço de transcrição no servidor.');
    if (N.limit(req, 'stt|' + t.u, 40, 60e3) || perDay(t.u, +(process.env.NAUTILO_STT_DIA || 800), 's|')) return gErr(res, 429, 'Limite de transcrições por agora. Tenta daqui a pouco.');
    const b = await N.body(req); try { return N.send(res, 200, { ok: true, text: await stt(b.b64, b.lang), via: sttName() }); } catch (e) { return gErr(res, e.status && e.status < 600 ? e.status : 502, e.message || 'Não consegui transcrever.'); } }
  if (p === 'claude') { if (req.method !== 'POST') return gErr(res, 405, 'Só POST.');
    if (ef.lvl < 3) return N.send(res, 402, { type: 'error', error: { type: 'permission_error', message: 'O Claude está no plano Completo. A IA do Google continua a responder.' } });
    if (!akey()) return N.send(res, 501, { type: 'error', error: { type: 'not_found_error', message: 'O Claude não está ligado neste servidor.' } });
    if (N.limit(req, 'cl|' + t.u, 20, 60e3) || perDay(t.u, CL_DIA, 'c|')) return N.send(res, 429, { type: 'error', error: { type: 'rate_limit_error', message: 'Chegaste ao limite de conversas com o Claude por hoje. A IA do Google continua a responder.' } });
    const o = await claude(req, await N.body(req)); res.statusCode = o.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(o.txt); }
  // v3.18: a IA de reserva pelo servidor (no aparelho a ligação direta podia falhar com "Failed to fetch"); formato OpenAI, como a app já usa
  if (p === 'livre') { if (req.method !== 'POST') return gErr(res, 405, 'Só POST.'); N.count('ia_livre');
    if (N.limit(req, 'ia|' + t.u, POR_MIN, 60e3) || perDay(t.u, iaDia)) return gErr(res, 429, 'Limite de IA por minuto/dia atingido (quota per day). ' + (ef.lvl < 3 ? 'Os planos acima têm mais pedidos por dia.' : 'Tenta daqui a pouco.'));
    const b = await N.body(req), msgs = Array.isArray(b.messages) ? b.messages.filter(m => m && typeof m === 'object').slice(-60) : [];
    if (!msgs.length) return gErr(res, 400, 'Sem mensagens.');
    const body = Object.assign({ model: 'openai', messages: msgs, temperature: typeof b.temperature === 'number' ? Math.max(0, Math.min(1.5, b.temperature)) : .3, private: true, referrer: 'nautilo' }, Array.isArray(b.tools) ? { tools: b.tools.slice(0, 64) } : {}, b.json ? { response_format: { type: 'json_object' } } : {});
    const raw = JSON.stringify(body); if (raw.length > 2e6) return gErr(res, 413, 'Pedido grande demais para a IA de reserva.');
    let last = ''; for (let i = 0; i < 2; i++) { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 85e3);
      try { const r = await fetch(FREE(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw, signal: ac.signal }); const txt = await r.text();
        if (r.ok && /"choices"/.test(txt)) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(txt); }
        last = 'erro ' + r.status; if (r.status < 500 && r.status !== 429) break; }
      catch (e) { last = e.name === 'AbortError' ? 'demorou demasiado' : 'sem resposta'; } finally { clearTimeout(to); } }
    return gErr(res, 502, 'A IA de reserva não respondeu (' + last + ').'); }
  if (p === 'fotos') { if (req.method !== 'POST') return gErr(res, 405, 'Só POST.');
    if (ef.lvl < 2) return gErr(res, 402, 'Separar as fotos com a IA está no plano Avançado. As repetidas, as desfocadas e as capturas de ecrã continuam a ser encontradas no aparelho.');
    if (N.limit(req, 'fo|' + t.u, 20, 60e3) || perDay(t.u, +(env('NAUTILO_FOTOS_DIA') || 75), 'f|')) return gErr(res, 429, 'Chegaste ao limite de fotos com a IA por hoje (600). Amanhã continua de onde ficou.');
    const b = await N.body(req), L = (Array.isArray(b.imgs) ? b.imgs : []).slice(0, 8).filter(x => x && /^[A-Za-z0-9+/=]{200,90000}$/.test(String(x.b64 || '')));
    if (!L.length) return gErr(res, 400, 'Sem fotos para ver.');
    try { const o = await fotosIA(L); N.count('ia_fotos'); return N.send(res, 200, { ok: true, r: o.r, via: o.via }); } catch (e) { return gErr(res, e.status && e.status < 600 ? e.status : 502, e.message || 'A IA não conseguiu ver as fotos agora.'); } }
  if (!OKP.test(p)) return gErr(res, 400, 'Pedido de IA desconhecido.');
  N.count('ia');
  if (N.limit(req, 'ia|' + t.u, POR_MIN, 60e3) || perDay(t.u, iaDia)) return gErr(res, 429, 'Limite de IA por minuto/dia atingido (quota per day). ' + (ef.lvl < 3 ? 'Os planos acima têm mais pedidos por dia.' : 'Tenta daqui a pouco.'));
  const k = gkey();
  if (/^v1beta\/models(\?|$)/.test(p)) { if (!k) return N.send(res, 200, { models: [{ name: 'models/gemini-nautilo-livre', supportedGenerationMethods: ['generateContent'] }] });
    const r = await fetch(G + p + (p.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(k)); res.statusCode = r.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(await r.text()); }
  if (req.method !== 'POST') return gErr(res, 405, 'Só POST.');
  const b = await N.body(req);
  if (ef.lvl < 2 && hasImage(b)) return gErr(res, 402, 'Ler fotos e PDFs com a IA está no plano Avançado. Vê os planos em Planos.');
  if (k) { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 90e3); let r, txt;
    // modelo lento demais: responde como limite, para a app passar a outro modelo (v2.96, Vercel Pro: 90 s, para os modelos "pro" pensarem; antes 40 s)
    try { r = await fetch(G + p + '?key=' + encodeURIComponent(k), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b), signal: ac.signal }); txt = await r.text(); }
    catch (e) { return gErr(res, 429, 'Modelo demasiado lento no Google agora (temporário).'); } finally { clearTimeout(to); }
    // modelo sobrecarregado no Google (503): a app trata como limite e passa ao modelo seguinte durante 1 minuto
    if (r.status === 503) return gErr(res, 429, 'Modelo sobrecarregado no Google agora (temporário).');
    res.statusCode = r.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(txt); }
  if (hasMedia(b)) return gErr(res, 400, 'Ler fotos, PDFs e voz precisa da IA do Google. Liga a tua chave grátis em Definições › Spyke › Cérebro.');
  if (/countTokens$/.test(p)) return N.send(res, 200, { totalTokens: JSON.stringify(b).length / 4 | 0 });
  const o = await free(b); N.send(res, o.status, o.body);
});
// testes: esquecer as sessões e as contagens guardadas em memória
module.exports._clear = () => { SEEN.clear(); DAY.clear(); };
