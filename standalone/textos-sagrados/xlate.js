// traduz uma biblioteca (formato do leitor) para outra língua com a IA do servidor do Prumo (/api/ia), por lotes, em paralelo
// uso: node xlate.js <job.json>   (job: { jobs: [{ src, lang, out, name, attr, from }], accounts: 3, workers: 6 })
// retoma de onde parou (<out>.part.json); só aceita respostas do Gemini (a IA de reserva é rejeitada e o lote volta à fila)
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const SITE = 'https://prumo-vida.vercel.app/', H = { 'content-type': 'application/json', origin: 'https://prumo-vida.vercel.app' };
const D = __dirname, ACC = D + '/accounts.json';
const MODELS = (process.env.MODELS || 'gemini-3.5-flash,gemini-3-flash-preview,gemini-3.1-flash-lite').split(',');
const LN = { pt: 'Portuguese (Brazilian spelling, as in modern Portuguese Bible translations; use "tu" for the second person singular and "vós" for the plural, as classical texts do)', en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const post = async (p, body, tok) => { const r = await fetch(SITE + p, { method: 'POST', headers: Object.assign({}, H, tok ? { authorization: 'Bearer ' + tok } : {}), body: JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch (e) { } return { s: r.status, j }; };
const TV = (fs.readFileSync('/home/user/modo-caverna/js/legal.js', 'utf8').match(/V: '([\d-]+)'/) || [])[1];
const accounts = async n => { let A = fs.existsSync(ACC) ? JSON.parse(fs.readFileSync(ACC, 'utf8')) : [];
  while (A.length < n) { const email = 'traduz-' + crypto.randomBytes(5).toString('hex') + '@nautilo.test', senha = 'T' + crypto.randomBytes(9).toString('hex');
    const r = await post('api/conta', { op: 'registar', email, senha, termos: TV, saude: true, idade: true });
    if (!r.j || !r.j.token) { console.log('registo falhou', r.s, r.j && r.j.msg); await sleep(20000); continue; }
    A.push({ email, senha, tok: r.j.token }); fs.writeFileSync(ACC, JSON.stringify(A)); }
  return A.slice(0, n); };
const units = lib => { const U = [];
  lib.b.forEach((b, bi) => { U.push([`${bi}.n`, b[1]]); (b[4] || []).forEach((t, i) => { if (t && /[A-Za-zÀ-ÿ]/.test(t)) U.push([`${bi}.t.${i}`, t]); });
    b[3].forEach((ch, ci) => ch.forEach((v, vi) => { if (v && v.trim()) U.push([`${bi}.${ci}.${vi}`, v]); })); });
  return U; };
const batches = (U, done, max = +(process.env.BATCH || 6000)) => { const out = []; let cur = [], c = 0;
  for (const u of U) { if (done[u[0]] != null) continue; if (cur.length && (c + u[1].length > max || cur.length >= 90)) { out.push(cur); cur = []; c = 0; } cur.push(u); c += u[1].length; }
  if (cur.length) out.push(cur); return out; };
const ask = async (tok, job, batch) => { const input = {}; batch.forEach(([k, t]) => input[k] = t);
  const sys = `You are a careful literary translator of sacred and classical texts (${job.what}). Translate every value of the JSON object from ${job.from} into ${LN[job.lang]}.
Rules: be faithful and complete (do not summarize, do not add commentary); keep a dignified register suitable for scripture and classics; keep proper names, divine names and technical terms consistent and in their usual form in ${job.lang} (e.g. Allah, Krishna, Arjuna, Buddha, Tao, Mara, Brahmana); keep line breaks (\\n) exactly where they are; keep numbers and references; translate short headings and titles as headings.
Return ONLY a JSON object with exactly the same keys.`;
  if (process.env.POLL) {   // IA grátis da Pollinations: não gasta a cota do Gemini do Prumo
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 170e3);
    try { const r = await fetch('https://text.pollinations.ai/openai', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'openai', private: true, referrer: 'nautilo', temperature: .2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(input) }] }) });
      if (r.status === 429) return { slow: true }; if (!r.ok) return { fail: true };
      const j = await r.json(); const t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; return { o: JSON.parse(String(t || '{}').replace(/^```(?:json)?|```$/g, '').trim()) }; }
    catch (e) { return { fail: true }; } finally { clearTimeout(to); } }
  let lim429 = 0;
  for (const m of MODELS) {
    const body = { systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }], generationConfig: { temperature: .2, responseMimeType: 'application/json', maxOutputTokens: 16000, thinkingConfig: { thinkingLevel: 'low' } } };
    let r; try { r = await fetch(SITE + 'api/ia?p=' + encodeURIComponent('v1beta/models/' + m + ':generateContent'), { method: 'POST', headers: Object.assign({}, H, { authorization: 'Bearer ' + tok }), body: JSON.stringify(body) }); } catch (e) { continue; }
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) { lim429++; continue; }
    if (!r.ok) continue;
    if (j.modelVersion === 'nautilo-livre') return { fallback: true };                 // IA de reserva: não serve para isto
    const txt = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
    try { const o = JSON.parse(txt.replace(/^```(?:json)?|```$/g, '').trim()); return { o }; } catch (e) { continue; } }
  return lim429 === MODELS.length ? { slow: true } : { fail: true }; };
const valid = (src, tr) => typeof tr === 'string' && tr.trim() && tr.length > src.length * .35 - 10 && tr.length < src.length * 3 + 60 && (src.split('\n').length === tr.split('\n').length || Math.abs(src.split('\n').length - tr.split('\n').length) <= 1);
(async () => { const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), A = process.env.POLL ? Array.from({ length: cfg.accounts || 3 }, (_, i) => ({ email: 'p' + i, tok: '' })) : await accounts(cfg.accounts || 3);
  console.log('contas', A.length);
  const lim = new Set();
  for (const job of cfg.jobs) {
    const lib = JSON.parse(fs.readFileSync(D + '/out/' + job.src, 'utf8')), PART = D + '/out/' + job.out + '.part.json';
    const done = fs.existsSync(PART) ? JSON.parse(fs.readFileSync(PART, 'utf8')) : {}, U = units(lib), src = Object.fromEntries(U);
    let Q = batches(U, done), t0 = Date.now(), ok = 0, bad = 0, fb = 0; console.log(job.out, U.length, 'unidades,', Q.length, 'lotes por fazer');
    let save = 0; const flush = () => fs.writeFileSync(PART, JSON.stringify(done));
    const worker = async (w) => { const acc = A[w % A.length];
      while (Q.length) { if (lim.has(acc.email)) return; const b = Q.shift(); const r = await ask(acc.tok, job, b);
        if (r.slow) { Q.push(b); acc.n429 = (acc.n429 || 0) + 1; if (acc.n429 > 60) { lim.add(acc.email); console.log('a conta', w % A.length, 'parece no limite do dia'); return; } await sleep(25000 + Math.random() * 10000); continue; }
        acc.n429 = 0;
        if (r.fallback || r.fail) { if (r.fallback) fb++; else bad++; b.tries = (b.tries || 0) + 1; if (b.tries < 6) { if (b.length > 4 && b.tries >= 2) { const h = Math.ceil(b.length / 2); Q.push(b.slice(0, h), b.slice(h)); } else Q.push(b); } await sleep(r.fallback ? 20000 : 3000); continue; }
        let n = 0; b.forEach(([k]) => { const tr = r.o[k]; if (valid(src[k], tr)) { done[k] = tr; n++; } });
        const miss = b.filter(([k]) => done[k] == null); ok += n;
        if (miss.length) { miss.tries = (b.tries || 0) + 1; if (miss.tries < 6) Q.push(miss); else miss.forEach(([k]) => { done[k] = null; }); }
        if (++save % 5 === 0) flush(); } };
    await Promise.all(Array.from({ length: (cfg.workers || 6) * A.length }, (_, w) => worker(w)));
    flush();
    const left = U.filter(([k]) => done[k] == null).length;
    console.log(job.out, 'traduzidas', Object.values(done).filter(Boolean).length, '/', U.length, 'falhas', bad, 'reserva', fb, 'em falta', left, ((Date.now() - t0) / 60000).toFixed(1) + ' min');
    if (left) { console.log(job.out, 'INCOMPLETO — corre outra vez para terminar'); continue; }
    const out = JSON.parse(JSON.stringify(lib)); out.l = job.lang; out.n = job.name; out.a = job.attr; out.ai = 1;
    out.b.forEach((b, bi) => { b[1] = done[`${bi}.n`] || b[1]; if (b[4]) b[4] = b[4].map((t, i) => done[`${bi}.t.${i}`] || t); b[3] = b[3].map((ch, ci) => ch.map((v, vi) => v && v.trim() ? done[`${bi}.${ci}.${vi}`] : v)); });
    fs.writeFileSync(D + '/out/' + job.out + '.json', JSON.stringify(out)); console.log(job.out, 'GUARDADO'); }
})().catch(e => { console.log('ERRO', e.stack); process.exit(1); });
