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
const N = require('./_nuvem');
const G = 'https://generativelanguage.googleapis.com/';
const FREE = () => process.env.NAUTILO_IA_LIVRE || 'https://text.pollinations.ai/openai';
const gkey = () => String(process.env.GEMINI_API_KEY || '').trim();
const OKP = /^v1beta\/models(\?[A-Za-z0-9=&_.-]*)?$|^v1beta\/models\/[A-Za-z0-9._-]{3,80}:(generateContent|countTokens)$/;
const POR_MIN = 30, POR_DIA = +(process.env.NAUTILO_IA_DIA || 400);
const akey = () => String(process.env.ANTHROPIC_API_KEY || '').trim(), CL_DIA = +(process.env.NAUTILO_CLAUDE_DIA || 120), CL_MODELS = /^claude-(opus|sonnet|haiku)-[0-9a-z-]{1,24}$/;
const env = k => String(process.env[k] || '').trim();
const sttName = () => env('GROQ_API_KEY') ? 'groq' : env('DEEPGRAM_API_KEY') ? 'deepgram' : env('OPENAI_API_KEY') ? 'openai' : env('AZURE_SPEECH_KEY') && env('AZURE_SPEECH_REGION') ? 'azure' : '';
const SEEN = new Map(), DAY = new Map();
const okSession = async req => { const t = await N.readToken(req); if (!t) return null; const c = SEEN.get(t.a);
  if (c && Date.now() - c.at < 60e3) return c.ok ? t : null;
  let ok = false; try { const g = await N.store().get('a/' + t.a); if (g) { const r = N.open(await N.accKey(), g.buf); ok = r.uid === t.u && (r.tv || 1) === t.v; } } catch (e) { }
  SEEN.set(t.a, { ok, at: Date.now() }); if (SEEN.size > 5000) SEEN.delete(SEEN.keys().next().value); return ok ? t : null; };
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
  const body = Object.assign({}, b, { max_tokens: Math.min(+b.max_tokens || 4000, 8000) }); delete body.stream;
  const h = { 'x-api-key': akey(), 'anthropic-version': String(req.headers['anthropic-version'] || '2023-06-01'), 'content-type': 'application/json' }, beta = String(req.headers['anthropic-beta'] || '');
  if (/^[a-z0-9,-]{1,300}$/.test(beta)) h['anthropic-beta'] = beta;
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 55e3);
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
const free = async b => { const gc = b.generationConfig || {}, json = /json/i.test(gc.responseMimeType || ''), ac = new AbortController(), to = setTimeout(() => ac.abort(), 50e3);
  try { const r = await fetch(FREE(), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ac.signal,
      body: JSON.stringify(Object.assign({ model: 'openai', messages: toChat(b), temperature: gc.temperature == null ? .3 : gc.temperature, private: true, referrer: 'nautilo' }, json ? { response_format: { type: 'json_object' } } : {})) });
    const j = await r.json().catch(() => ({})); const m = j.choices && j.choices[0] && j.choices[0].message;
    if (!r.ok || !m) return { status: r.status === 429 ? 429 : 502, body: { error: { code: r.status, message: 'A IA grátis não respondeu agora. Tenta daqui a um minuto.' } } };
    return { status: 200, body: { candidates: [{ content: { role: 'model', parts: [{ text: String(m.content || '') }] }, finishReason: 'STOP' }], modelVersion: 'nautilo-livre' } }; }
  catch (e) { return { status: 504, body: { error: { code: 504, message: 'A IA grátis demorou demasiado. Tenta outra vez.' } } }; } finally { clearTimeout(to); } };

module.exports = N.handler(async (req, res) => {
  const q = req.query || {}, p = String(q.p || '');
  if (p === 'estado') return N.send(res, 200, { ok: true, google: !!gkey(), claude: !!akey(), stt: sttName(), modelo: env('NAUTILO_CLAUDE_MODEL') || '' });
  const t = await okSession(req); if (!t) return gErr(res, 401, 'A sessão terminou. Entra outra vez na conta.');
  if (p === 'stt') { if (req.method !== 'POST') return gErr(res, 405, 'Só POST.'); if (!sttName()) return gErr(res, 501, 'Sem serviço de transcrição no servidor.');
    if (N.limit(req, 'stt|' + t.u, 40, 60e3) || perDay(t.u, +(process.env.NAUTILO_STT_DIA || 800), 's|')) return gErr(res, 429, 'Limite de transcrições por agora. Tenta daqui a pouco.');
    const b = await N.body(req); try { return N.send(res, 200, { ok: true, text: await stt(b.b64, b.lang), via: sttName() }); } catch (e) { return gErr(res, e.status && e.status < 600 ? e.status : 502, e.message || 'Não consegui transcrever.'); } }
  if (p === 'claude') { if (req.method !== 'POST') return gErr(res, 405, 'Só POST.');
    if (!akey()) return N.send(res, 501, { type: 'error', error: { type: 'not_found_error', message: 'O Claude não está ligado neste servidor.' } });
    if (N.limit(req, 'cl|' + t.u, 20, 60e3) || perDay(t.u, CL_DIA, 'c|')) return N.send(res, 429, { type: 'error', error: { type: 'rate_limit_error', message: 'Chegaste ao limite de conversas com o Claude por hoje. A IA do Google continua a responder.' } });
    const o = await claude(req, await N.body(req)); res.statusCode = o.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(o.txt); }
  if (!OKP.test(p)) return gErr(res, 400, 'Pedido de IA desconhecido.');
  if (N.limit(req, 'ia|' + t.u, POR_MIN, 60e3) || perDay(t.u)) return gErr(res, 429, 'Limite de IA por minuto/dia atingido (quota per day). Tenta daqui a pouco.');
  const k = gkey();
  if (/^v1beta\/models(\?|$)/.test(p)) { if (!k) return N.send(res, 200, { models: [{ name: 'models/gemini-nautilo-livre', supportedGenerationMethods: ['generateContent'] }] });
    const r = await fetch(G + p + (p.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(k)); res.statusCode = r.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(await r.text()); }
  if (req.method !== 'POST') return gErr(res, 405, 'Só POST.');
  const b = await N.body(req);
  if (k) { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 40e3); let r, txt;
    // modelo lento demais (o Vercel corta aos 60 s): responde antes como limite, para a app passar a outro modelo
    try { r = await fetch(G + p + '?key=' + encodeURIComponent(k), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b), signal: ac.signal }); txt = await r.text(); }
    catch (e) { return gErr(res, 429, 'Modelo demasiado lento no Google agora (temporário).'); } finally { clearTimeout(to); }
    // modelo sobrecarregado no Google (503): a app trata como limite e passa ao modelo seguinte durante 1 minuto
    if (r.status === 503) return gErr(res, 429, 'Modelo sobrecarregado no Google agora (temporário).');
    res.statusCode = r.status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(txt); }
  if (hasMedia(b)) return gErr(res, 400, 'Ler fotos, PDFs e voz precisa da IA do Google. Liga a tua chave grátis em Definições › Spyke › Cérebro.');
  if (/countTokens$/.test(p)) return N.send(res, 200, { totalTokens: JSON.stringify(b).length / 4 | 0 });
  const o = await free(b); N.send(res, o.status, o.body);
});
