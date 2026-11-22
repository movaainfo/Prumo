// PRUMO · Clãs, amigos e conversas + ranking de animes e o jogo Pursuit (função do Vercel, v3.73).
// Cada pessoa é um perfil (conta + perfil). Amigos por código (PR-XXXXXX); clãs com código de convite; conversas no clã e a dois (só entre amigos).
// Antes de aparecer, cada mensagem passa pelas regras (sem links, contactos pessoais nem palavras ofensivas) e pela IA, que barra insultos,
// assédio, ódio, ameaças, conteúdo sexual, burlas e pedidos de dados pessoais. Quem tiver 3 mensagens barradas numa hora fica 1 hora sem escrever.
// Denunciar e bloquear; a administração vê as denúncias. Tudo cifrado no armazenamento (AES-256-GCM).
// Ranking de animes: pontos ganhos nos jogos. PURSUIT: todos os dias às 20h (hora de Lisboa) há pistas de um anime ao calhas; marca-se "Pursuit"
// na página do anime que se acha que é (uma vez por dia); às 22h fecha e quem acertou ganha pontos pela ordem (1.º 100, 2.º 90… mínimo 10).
'use strict';
const N = require('./_nuvem');
const PID = /^[a-f0-9]{12}$/, ID = /^[a-z0-9]{8,40}-[a-f0-9]{12}$/, CID = /^[a-z0-9]{10}$/;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const JK = () => process.env.JIKAN_BASE || 'https://api.jikan.moe/v4/';
const OKS = new Map();
/* ---------- armazenamento cifrado ---------- */
const ler = async (p, d = null) => { try { const g = await N.store().get(p); if (!g) return { v: d, etag: null }; return { v: N.open(await N.accKey(), g.buf), etag: g.etag }; } catch (e) { return { v: d, etag: null }; } };
const gravar = async (p, v, o) => N.store().put(p, N.seal(await N.accKey(), v), o || {});
// muda um ficheiro com gravação condicional (várias pessoas ao mesmo tempo não se apagam umas às outras)
const mudar = async (p, d, fn) => { for (let i = 0; i < 8; i++) { const { v, etag } = await ler(p, null), cur = v == null ? (typeof d === 'function' ? d() : JSON.parse(JSON.stringify(d))) : v; const r = fn(cur); if (r === false) return cur;
    try { await gravar(p, cur, etag ? { ifMatch: etag } : { overwrite: false }); return cur; } catch (e) { if (i === 7) throw N.err('ocupado', 'Muita gente ao mesmo tempo. Tenta outra vez.', 503); await sleep(60 + Math.random() * 200); } } };
/* ---------- quem pede ---------- */
const conta = async (t, pid) => { const k = t.u + '|' + t.v + '|' + pid, c = OKS.get(k); if (c && Date.now() - c.at < 30e3) return c;
  const g = await N.store().get('a/' + t.a); let r = null; try { r = g && N.open(await N.accKey(), g.buf); } catch (e) { }
  if (!r || r.uid !== t.u || (r.tv || 1) !== t.v) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  const pf = (r.perfis || []).find(x => x.id === pid); if (!pf) throw N.err('perfil', 'Este perfil já não existe.', 404);
  await N.gate(r.email); const o = { at: Date.now(), nome: String(pf.nome || 'Pessoa').slice(0, 24), adm: N.isAdminEmail(r.email), teste: N.isTeste(r.email) }; OKS.set(k, o); if (OKS.size > 3000) OKS.delete(OKS.keys().next().value); return o; };
const P = id => 'so/p/' + id;
const COD = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; const b = N.crypto.randomBytes(6); for (const x of b) s += A[x % A.length]; return s; };
const perfil = async (id, nome) => { let { v } = await ler(P(id), null); if (v) return v;
  for (let i = 0; i < 5; i++) { const cod = COD(); try { await N.store().put('so/c/' + cod, Buffer.from(JSON.stringify({ id })), { overwrite: false }); v = { id, nome, cod, amigos: [], pedidos: [], enviados: [], bloq: [], clas: [], lidas: {}, criado: Date.now() }; break; } catch (e) { } }
  if (!v) throw N.err('ocupado', 'Tenta outra vez.', 503); try { await gravar(P(id), v, { overwrite: false }); } catch (e) { v = (await ler(P(id), v)).v; } return v; };
const pub = async id => { const v = (await ler(P(id), null)).v; return v ? { id, nome: v.nome } : { id, nome: 'Pessoa' }; };
/* ---------- moderação ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[0@]/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5|\$/g, 's');
const OFENSAS = /\b(caralh\w*|fod[ae]\w*|foda-?se|filh[oa] da puta|fdp|puta\w*|put[ao]s?|vadia\w*|piranha|arrombad\w*|corn[oa]s?|viad[oa]\w*|bich(a|inha)s?|paneleir\w*|macac[oa]s?|crioul[oa]\w*|preto imundo|retardad[oa]\w*|mongoloide|otario\w*|babaca\w*|desgracad[oa]\w*|vai te foder|vai se foder|vtnc|vsf|cuzao|merdinha|nazi\w*|hitler|sieg heil|mata[- ]?te|se mata|vai morrer|kys)\b/;
const regras = t => { const n = norm(t);
  if (/(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|br|pt|io|gg|xyz|ly|me|tv|app|link|site|online|ru)\b)/i.test(t)) return 'Links não são permitidos nas conversas.';
  if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(t)) return 'Não partilhes e-mails nas conversas.';
  if (/(?:\+?\d[\s().-]?){9,}/.test(t)) return 'Não partilhes números de telefone nas conversas.';
  if (/\b(pix|iban|nib|cpf|senha|password|palavra-passe)\b.{0,12}[:=]?\s*\S{4,}/i.test(t)) return 'Não partilhes dados pessoais nem senhas nas conversas.';
  if (OFENSAS.test(n)) return 'A mensagem tem palavras ofensivas.';
  return ''; };
const PEDIDO = t => `És o moderador das conversas do Prumo, uma app para pessoas a partir dos 16 anos. Avalia a mensagem e responde SÓ com JSON numa linha: {"ok":true} ou {"ok":false,"motivo":"<curto, em português de Portugal>","tipo":"insulto|assedio|odio|ameaca|sexual|autolesao|burla|dados|outro"}.
Bloqueia: insultos ou assédio dirigidos a alguém, ódio ou discriminação, ameaças, conteúdo sexual, incentivo a autolesão, burlas ou spam, pedir ou partilhar dados pessoais (morada, telefone, senhas, documentos). Permite: conversa normal, falar de animes (incluindo violência da história), piadas leves, desabafos.
Mensagem: """${String(t).replace(/"""/g, '"')}"""`;
const json1 = s => { const m = String(s || '').match(/\{[\s\S]*?\}/); if (!m) return null; try { const o = JSON.parse(m[0]); return typeof o.ok === 'boolean' ? o : null; } catch (e) { return null; } };
const ia = async t => { const env = k => String(process.env[k] || '').trim(), to = () => AbortSignal.timeout(6000);
  try { if (env('NAUTILO_MOD_MOCK')) { const r = await fetch(env('NAUTILO_MOD_MOCK'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t }), signal: to() }); return json1(await r.text()); }
    if (env('ANTHROPIC_API_KEY')) { const r = await fetch((env('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com') + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: env('NAUTILO_MOD_MODEL') || 'claude-haiku-5-5', max_tokens: 80, messages: [{ role: 'user', content: PEDIDO(t) }] }), signal: to() });
      if (r.ok) { const j = await r.json(); const o = json1(((j.content || []).find(c => c.type === 'text') || {}).text); if (o) return o; } }
    if (env('GEMINI_API_KEY')) { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + (env('NAUTILO_MOD_GEMINI') || 'gemini-flash-lite-latest') + ':generateContent?key=' + encodeURIComponent(env('GEMINI_API_KEY')), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: PEDIDO(t) }] }], generationConfig: { temperature: 0, maxOutputTokens: 80, responseMimeType: 'application/json' } }), signal: to() });
      if (r.ok) { const j = await r.json(); const o = json1((((((j.candidates || [])[0] || {}).content || {}).parts || [])[0] || {}).text); if (o) return o; } }
  } catch (e) { } return null; };
const AJUDA = ' Se estás a passar por um momento difícil, fala com alguém: SNS 24 (808 24 24 24) em Portugal, CVV (188) no Brasil.';
const moderar = async t => { const r = regras(t); if (r) return { ok: false, motivo: r, via: 'regras' }; const o = await ia(t); if (o && o.ok === false) return { ok: false, motivo: String(o.motivo || 'A mensagem não cumpre as regras das conversas.').slice(0, 160) + (o.tipo === 'autolesao' ? AJUDA : ''), via: 'ia' }; return { ok: true, via: o ? 'ia' : 'regras' }; };
/* ---------- conversas ---------- */
const dia = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const convDe = (eu, c) => { if (/^c-[a-z0-9]{10}$/.test(c)) return { tipo: 'c', cid: c.slice(2), k: c }; const m = /^d-(.+)$/.exec(c); if (m && ID.test(m[1]) && m[1] !== eu) return { tipo: 'd', outro: m[1], k: 'd-' + [eu, m[1]].sort().join('~') }; return null; };
const podeConv = async (eu, perf, cv) => { if (!cv) throw N.err('conversa', 'Conversa desconhecida.', 400);
  if (cv.tipo === 'c') { if (!(perf.clas || []).includes(cv.cid)) throw N.err('conversa', 'Não és membro deste clã.', 403); return; }
  if (!(perf.amigos || []).includes(cv.outro)) throw N.err('conversa', 'Só podes conversar com amigos.', 403);
  const o = (await ler(P(cv.outro), null)).v; if (!o || (o.bloq || []).includes(eu) || (perf.bloq || []).includes(cv.outro)) throw N.err('conversa', 'Não é possível enviar mensagens a esta pessoa.', 403); };
const msgs = async (k, desde) => { const out = []; for (const d of [dia(Date.now() - 864e5), dia()]) { const L = (await ler('so/m/' + k + '/' + d, [])).v || []; L.forEach(m => { if (!desde || m.at > desde) out.push(m); }); } return out.slice(-150); };
/* ---------- clãs ---------- */
const CL = cid => 'so/cl/' + cid;
const claPub = c => ({ id: c.id, nome: c.nome, desc: c.desc, cor: c.cor, cod: c.cod, n: c.membros.length, membros: c.membros.map(m => ({ id: m.id, nome: m.nome, papel: m.papel })) });
/* ---------- ranking de animes ---------- */
const PTS = 'so/pts.json';
const somaPts = async (L) => mudar(PTS, {}, T => { L.forEach(([id, nome, p]) => { const o = T[id] = T[id] || { p: 0, nome }; o.p += p; o.nome = nome || o.nome; }); });
/* ---------- Pursuit ---------- */
const lisboa = (t = Date.now()) => { const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)).forEach(x => { p[x.type] = x.value; }); return { d: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute }; };
const H_ABRE = () => +(process.env.NAUTILO_HUNTER_ABRE || 1200), H_FECHA = () => +(process.env.NAUTILO_HUNTER_FECHA || 1320); // minutos depois da meia-noite (Lisboa): 20:00 e 22:00
const jk = async p => { for (let i = 0; i < 3; i++) { try { const r = await fetch(JK() + p, { headers: { accept: 'application/json', 'user-agent': 'Prumo/1.0' }, signal: AbortSignal.timeout(10000) }); if (r.status === 429) { await sleep(1200); continue; } if (!r.ok) throw new Error('Jikan ' + r.status); return await r.json(); } catch (e) { if (i === 2) throw e; await sleep(700); } } };
const ESTACAO = { winter: 'no inverno', spring: 'na primavera', summer: 'no verão', fall: 'no outono' }, FONTE = { Manga: 'num mangá', 'Light novel': 'numa light novel', Novel: 'num romance', Original: 'numa história original (não adaptado)', 'Web manga': 'num mangá online', 'Visual novel': 'numa visual novel', Game: 'num jogo' };
const pistasDe = a => { const P0 = [], ger = (a.genres || []).map(g => g.name).slice(0, 3), tem = (a.themes || []).concat(a.demographics || []).map(g => g.name).slice(0, 2), est = (a.studios || []).map(s => s.name)[0];
  P0.push(`É ${a.type === 'Movie' ? 'um filme' : 'uma série'}${a.episodes && a.type !== 'Movie' ? ' com ' + a.episodes + ' episódios' : ''}${a.year ? ' e estreou ' + (ESTACAO[a.season] || 'em') + ' de ' + a.year : ''}.`);
  if (ger.length) P0.push('Géneros: ' + ger.join(', ') + (tem.length ? '; temas: ' + tem.join(', ') : '') + '.');
  P0.push(`É baseado ${FONTE[a.source] || 'em ' + (a.source || 'algo')}.`);
  if (est) P0.push(`O estúdio de animação é ${est}.`);
  const tt = String(a.title || '').trim(), w = tt.split(/\s+/).length; P0.push(`O título (em japonês romanizado) começa por "${tt[0]}" e tem ${w} palavra${w === 1 ? '' : 's'}.`);
  return P0; };
// o anime do dia: um dos 200 mais populares, escolhido pela data (o mesmo para todos) sem repetir nos últimos 60 dias
const escolher = async d => { let top = (await ler('so/htop', null)).v;
  if (!top || Date.now() - top.at > 7 * 864e5 || !top.L.length) { const L = []; for (let pg = 1; pg <= 8; pg++) { try { const j = await jk('top/anime?filter=bypopularity&page=' + pg); if (!(j.data || []).length) break; (j.data || []).forEach(x => { if (x && x.mal_id && x.rating && !/Rx|R\+/.test(x.rating)) L.push(x.mal_id); }); } catch (e) { break; } await sleep(450); } if (L.length) { top = { L, at: Date.now() }; await gravar('so/htop', top); } }
  if (!top || !top.L.length) throw N.err('hunter', 'O MyAnimeList não respondeu. O Pursuit de hoje sai daqui a pouco.', 502);
  const hist = (await ler('so/hhist', { L: [] })).v.L || [], h = N.crypto.createHmac('sha256', await N.master()).update('hunter:' + d).digest(); let i = h.readUInt32BE(0) % top.L.length, n = 0;
  while (hist.includes(top.L[i]) && n++ < top.L.length) i = (i + 1) % top.L.length;
  return top.L[i]; };
const desafio = async () => { const L = lisboa(), d = L.d, P0 = 'so/h/' + d; let { v } = await ler(P0, null);
  if (!v && L.min >= H_ABRE()) { const mal = await escolher(d), a = ((await jk('anime/' + mal + '/full')) || {}).data || {}; if (!a.mal_id) throw N.err('hunter', 'O Pursuit de hoje sai daqui a pouco.', 502);
    v = { dia: d, mal: String(a.mal_id), titulo: a.title_english || a.title, img: ((a.images || {}).webp || {}).large_image_url || ((a.images || {}).jpg || {}).image_url || '', pistas: pistasDe(a), fechado: false };
    try { await gravar(P0, v, { overwrite: false }); await mudar('so/hhist', { L: [] }, o => { o.L = (o.L || []).concat(+v.mal).slice(-60); }); } catch (e) { v = (await ler(P0, v)).v; } }
  if (v && !v.fechado && L.min >= H_FECHA()) v = await fechar(P0, v);
  return { L, v }; };
const fechar = async (P0, v0) => { const L = await N.store().list('so/hg/' + v0.dia + '/'), G = [];
  for (const b of L) { const g = (await ler(b.pathname, null)).v; if (g) G.push(g); }
  const certos = G.filter(g => g.mal === v0.mal).sort((a, b) => a.at - b.at), res = certos.map((g, i) => ({ id: g.id, nome: g.nome, at: g.at, pts: Math.max(10, 100 - 10 * i) }));
  let ganhei = false; const v = await mudar(P0, v0, o => { if (o.fechado) return false; o.fechado = true; o.res = res.slice(0, 100); o.total = G.length; ganhei = true; });
  if (ganhei && res.length) await somaPts(res.map(r => [r.id, r.nome, r.pts])); return v; };
const hunterVer = async (eu) => { const { L, v } = await desafio(), abre = H_ABRE(), fecha = H_FECHA(), m = L.min;
  const fase = !v ? 'espera' : v.fechado ? 'fechado' : 'aberto', meu = v && eu ? (await ler('so/hg/' + v.dia + '/' + eu, null)).v : null;
  const visiveis = !v ? [] : v.fechado ? v.pistas : v.pistas.slice(0, Math.min(v.pistas.length, 3 + (m >= abre + 40 ? 1 : 0) + (m >= abre + 80 ? 1 : 0)));
  const ontem = fase === 'espera' ? (await ler('so/h/' + lisboa(Date.now() - 864e5).d, null)).v : null;
  const min0 = Math.floor(Date.now() / 6e4) * 6e4, abreAt = min0 - (m - abre) * 6e4, fechaAt = min0 - (m - fecha) * 6e4;
  return { fase, dia: L.d, abre, fecha, agora: m, abreAt, fechaAt, amanha: abreAt + 864e5, ts: Date.now(), pistas: visiveis, total: v ? v.pistas.length : 5, meu: meu ? { mal: meu.mal, titulo: meu.titulo, at: meu.at, certo: v && v.fechado ? meu.mal === v.mal : undefined } : null,
    resposta: v && v.fechado ? { mal: v.mal, titulo: v.titulo, img: v.img } : null, res: v && v.fechado ? (v.res || []).slice(0, 30) : null, jogadores: v && v.fechado ? v.total : undefined,
    ontem: ontem && ontem.fechado ? { titulo: ontem.titulo, img: ontem.img, res: (ontem.res || []).slice(0, 5) } : null }; };
/* ---------- pedidos ---------- */
const OPS = {
  async eu(c, b) { const v = await perfil(c.eu, c.nome), amigos = await Promise.all((v.amigos || []).map(pub)), pedidos = await Promise.all((v.pedidos || []).map(pub)), clas = [];
    for (const cid of v.clas || []) { const cl = (await ler(CL(cid), null)).v; if (cl) clas.push(claPub(cl)); }
    const T = (await ler(PTS, {})).v || {}; return { eu: { id: v.id, nome: v.nome, cod: v.cod, pts: (T[v.id] || {}).p || 0, mudo: v.mudo && v.mudo > Date.now() ? v.mudo : 0 }, amigos, pedidos, enviados: v.enviados || [], bloq: v.bloq || [], clas }; },
  async nome(c, b) { const n = String(b.nome || '').replace(/\s+/g, ' ').trim(); if (n.length < 2 || n.length > 24) throw N.err('nome', 'O nome tem de ter entre 2 e 24 letras.', 400);
    const m = await moderar(n); if (!m.ok) throw N.err('nome', 'Esse nome não pode ser usado: ' + m.motivo, 400); await perfil(c.eu, c.nome); await mudar(P(c.eu), null, v => { v.nome = n; }); return { ok2: true, nome: n }; },
  async amigoPedir(c, b) { const cod = String(b.cod || '').toUpperCase().replace(/^PR-?/, '').replace(/[^A-Z0-9]/g, ''); const g = await N.store().get('so/c/' + cod).catch(() => null); if (!g) throw N.err('amigo', 'Não encontrei ninguém com esse código.', 404);
    const outro = JSON.parse(g.buf.toString()).id; if (outro === c.eu) throw N.err('amigo', 'Esse é o teu código.', 400); await perfil(c.eu, c.nome); const o = (await ler(P(outro), null)).v; if (!o) throw N.err('amigo', 'Não encontrei essa pessoa.', 404);
    if ((o.bloq || []).includes(c.eu)) throw N.err('amigo', 'Não é possível adicionar esta pessoa.', 403);
    const jaPediu = (o.enviados || []).includes(c.eu);
    await mudar(P(c.eu), null, v => { v.enviados = v.enviados || []; v.amigos = v.amigos || []; v.pedidos = v.pedidos || []; if (jaPediu) { v.amigos = [...new Set(v.amigos.concat(outro))]; v.pedidos = v.pedidos.filter(x => x !== outro); } else if (!v.amigos.includes(outro)) v.enviados = [...new Set(v.enviados.concat(outro))]; });
    await mudar(P(outro), null, v => { v.pedidos = v.pedidos || []; v.amigos = v.amigos || []; v.enviados = v.enviados || []; if (jaPediu) { v.amigos = [...new Set(v.amigos.concat(c.eu))]; v.enviados = v.enviados.filter(x => x !== c.eu); } else if (!v.amigos.includes(c.eu)) v.pedidos = [...new Set(v.pedidos.concat(c.eu))]; });
    return { amigos: jaPediu, nome: o.nome }; },
  async amigoResp(c, b) { const outro = String(b.id || ''); if (!ID.test(outro)) throw N.err('amigo', 'Pedido desconhecido.', 400); const sim = !!b.aceitar;
    await mudar(P(c.eu), null, v => { if (!(v.pedidos || []).includes(outro)) return false; v.pedidos = v.pedidos.filter(x => x !== outro); if (sim) v.amigos = [...new Set((v.amigos || []).concat(outro))]; });
    await mudar(P(outro), null, v => { v.enviados = (v.enviados || []).filter(x => x !== c.eu); if (sim) v.amigos = [...new Set((v.amigos || []).concat(c.eu))]; }); return { ok2: true }; },
  async amigoTirar(c, b) { const outro = String(b.id || ''); if (!ID.test(outro)) throw N.err('amigo', 'Pessoa desconhecida.', 400);
    await mudar(P(c.eu), null, v => { v.amigos = (v.amigos || []).filter(x => x !== outro); }); await mudar(P(outro), null, v => { v.amigos = (v.amigos || []).filter(x => x !== c.eu); }); return { ok2: true }; },
  async bloquear(c, b) { const outro = String(b.id || ''); if (!ID.test(outro) || outro === c.eu) throw N.err('bloquear', 'Pessoa desconhecida.', 400);
    await mudar(P(c.eu), null, v => { v.bloq = b.on === false ? (v.bloq || []).filter(x => x !== outro) : [...new Set((v.bloq || []).concat(outro))]; if (b.on !== false) { v.amigos = (v.amigos || []).filter(x => x !== outro); v.pedidos = (v.pedidos || []).filter(x => x !== outro); } });
    if (b.on !== false) await mudar(P(outro), null, v => { v.amigos = (v.amigos || []).filter(x => x !== c.eu); v.enviados = (v.enviados || []).filter(x => x !== c.eu); }).catch(() => { }); return { ok2: true }; },
  async claCriar(c, b) { const nome = String(b.nome || '').replace(/\s+/g, ' ').trim(), desc = String(b.desc || '').trim().slice(0, 160), cor = /^#[0-9a-f]{6}$/i.test(b.cor || '') ? b.cor : '#9B1B30';
    if (nome.length < 3 || nome.length > 28) throw N.err('cla', 'O nome do clã tem de ter entre 3 e 28 letras.', 400);
    const m = await moderar(nome + (desc ? ' — ' + desc : '')); if (!m.ok) throw N.err('cla', 'Esse nome ou descrição não pode ser usado: ' + m.motivo, 400);
    const v = await perfil(c.eu, c.nome); if ((v.clas || []).length >= 5) throw N.err('cla', 'Já estás em 5 clãs, o máximo.', 400);
    const cid = N.crypto.randomBytes(5).toString('hex'); let cod = ''; for (let i = 0; i < 5 && !cod; i++) { const x = COD(); try { await N.store().put('so/cc/' + x, Buffer.from(JSON.stringify({ cid })), { overwrite: false }); cod = x; } catch (e) { } }
    const cl = { id: cid, nome, desc, cor, cod, dono: c.eu, membros: [{ id: c.eu, nome: v.nome, papel: 'dono', desde: Date.now() }], criado: Date.now() }; await gravar(CL(cid), cl, { overwrite: false });
    await mudar(P(c.eu), null, p => { p.clas = [...new Set((p.clas || []).concat(cid))]; }); return { cla: claPub(cl) }; },
  async claEntrar(c, b) { const cod = String(b.cod || '').toUpperCase().replace(/^CL-?/, '').replace(/[^A-Z0-9]/g, ''); const g = await N.store().get('so/cc/' + cod).catch(() => null); if (!g) throw N.err('cla', 'Não encontrei nenhum clã com esse código.', 404);
    const cid = JSON.parse(g.buf.toString()).cid, v = await perfil(c.eu, c.nome); if ((v.clas || []).length >= 5 && !(v.clas || []).includes(cid)) throw N.err('cla', 'Já estás em 5 clãs, o máximo.', 400);
    const cl = await mudar(CL(cid), null, o => { if (o.membros.some(m => m.id === c.eu)) return false; if (o.membros.length >= 50) throw N.err('cla', 'Este clã está cheio (50 pessoas).', 400); if ((o.banidos || []).includes(c.eu)) throw N.err('cla', 'Não podes entrar neste clã.', 403); o.membros.push({ id: c.eu, nome: v.nome, papel: 'membro', desde: Date.now() }); });
    await mudar(P(c.eu), null, p => { p.clas = [...new Set((p.clas || []).concat(cid))]; }); return { cla: claPub(cl) }; },
  async claSair(c, b) { const cid = String(b.id || ''); if (!CID.test(cid)) throw N.err('cla', 'Clã desconhecido.', 400);
    await mudar(CL(cid), null, o => { o.membros = o.membros.filter(m => m.id !== c.eu); if (o.dono === c.eu && o.membros.length) { o.dono = o.membros[0].id; o.membros[0].papel = 'dono'; } });
    await mudar(P(c.eu), null, p => { p.clas = (p.clas || []).filter(x => x !== cid); }); return { ok2: true }; },
  async claTirar(c, b) { const cid = String(b.id || ''), quem = String(b.membro || ''); if (!CID.test(cid) || !ID.test(quem)) throw N.err('cla', 'Pedido desconhecido.', 400);
    await mudar(CL(cid), null, o => { const eu = o.membros.find(m => m.id === c.eu); if (!eu || !['dono', 'mod'].includes(eu.papel) || quem === o.dono) throw N.err('cla', 'Só quem gere o clã pode tirar pessoas.', 403); o.membros = o.membros.filter(m => m.id !== quem); o.banidos = [...new Set((o.banidos || []).concat(quem))]; });
    await mudar(P(quem), null, p => { p.clas = (p.clas || []).filter(x => x !== cid); }).catch(() => { }); return { ok2: true }; },
  async claVer(c, b) { const cid = String(b.id || ''); const cl = CID.test(cid) && (await ler(CL(cid), null)).v; if (!cl || !cl.membros.some(m => m.id === c.eu)) throw N.err('cla', 'Não és membro deste clã.', 403);
    const T = (await ler(PTS, {})).v || {}, r = claPub(cl); r.membros = r.membros.map(m => Object.assign(m, { pts: (T[m.id] || {}).p || 0 })).sort((a, b2) => b2.pts - a.pts); r.pts = r.membros.reduce((s, m) => s + m.pts, 0); return { cla: r }; },
  async conversas(c, b) { const v = await perfil(c.eu, c.nome), out = [];
    for (const cid of v.clas || []) { const cl = (await ler(CL(cid), null)).v; if (!cl) continue; const k = 'c-' + cid, u = (await ler('so/u/' + k, null)).v; out.push({ conv: k, tipo: 'c', nome: cl.nome, cor: cl.cor, ult: u, novas: u && u.at > ((v.lidas || {})[k] || 0) && u.de !== c.eu }); }
    for (const a of v.amigos || []) { const k = 'd-' + [c.eu, a].sort().join('~'), u = (await ler('so/u/' + k, null)).v, p = await pub(a); out.push({ conv: 'd-' + a, tipo: 'd', nome: p.nome, ult: u, novas: u && u.at > ((v.lidas || {})[k] || 0) && u.de !== c.eu }); }
    return { conversas: out.sort((x, y) => ((y.ult || {}).at || 0) - ((x.ult || {}).at || 0)) }; },
  async msgs(c, b) { const v = await perfil(c.eu, c.nome), cv = convDe(c.eu, String(b.conv || '')); await podeConv(c.eu, v, cv); const L = (await msgs(cv.k, +b.desde || 0)).filter(m => !(v.bloq || []).includes(m.de));
    if (L.length || !b.desde) await mudar(P(c.eu), null, p => { p.lidas = p.lidas || {}; p.lidas[cv.k] = Date.now(); const ks = Object.keys(p.lidas); if (ks.length > 80) delete p.lidas[ks[0]]; }).catch(() => { });
    return { msgs: L.map(m => ({ id: m.id, de: m.de, nome: m.nome, t: m.t, at: m.at, meu: m.de === c.eu })) }; },
  async enviar(c, b, req) { const v = await perfil(c.eu, c.nome), cv = convDe(c.eu, String(b.conv || '')); await podeConv(c.eu, v, cv);
    if (v.mudo && v.mudo > Date.now()) throw N.err('mudo', 'Estás sem poder escrever até às ' + new Date(v.mudo).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }) + ' (mensagens barradas a mais).', 403);
    const t = String(b.texto || '').replace(/\s+$/g, '').slice(0, 1000).trim(); if (!t) throw N.err('msg', 'Escreve alguma coisa.', 400);
    if (N.limit(req, 'msg|' + c.eu, 30, 60e3)) throw N.err('limite', 'Estás a escrever depressa demais. Espera um pouco.', 429);
    const m = await moderar(t); N.count('chat:' + (m.ok ? 'ok' : 'barrada'));
    if (!m.ok) { let mudo = 0; await mudar(P(c.eu), null, p => { const h = Date.now(); p.barr = (p.barr || []).filter(t => h - t < 36e5).concat(h); if (p.barr.length >= 3) { p.mudo = h + 36e5; p.barr = []; mudo = p.mudo; } }); return { barrada: true, motivo: m.motivo, mudo }; }
    const msg = { id: N.crypto.randomBytes(6).toString('hex'), de: c.eu, nome: v.nome, t, at: Date.now() };
    await mudar('so/m/' + cv.k + '/' + dia(), [], L => { L.push(msg); if (L.length > 2000) L.splice(0, L.length - 2000); });
    await gravar('so/u/' + cv.k, { at: msg.at, de: c.eu, nome: v.nome, t: t.slice(0, 80) }).catch(() => { });
    return { msg: Object.assign({ meu: true }, msg) }; },
  async denunciar(c, b) { const v = await perfil(c.eu, c.nome), cv = convDe(c.eu, String(b.conv || '')); await podeConv(c.eu, v, cv);
    const m = (await msgs(cv.k, 0)).find(x => x.id === String(b.mid || '')); if (!m) throw N.err('denuncia', 'Mensagem não encontrada.', 404);
    await gravar('so/den/' + Date.now() + '-' + N.crypto.randomBytes(3).toString('hex'), { conv: cv.k, mid: m.id, de: m.de, nome: m.nome, t: m.t, por: c.eu, motivo: String(b.motivo || '').slice(0, 200), at: Date.now() }); N.count('chat:denuncia'); return { ok2: true }; },
  async adminDenuncias(c, b) { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const L = (await N.store().list('so/den/')).slice(-60), out = [];
    for (const x of L.reverse()) { const d = (await ler(x.pathname, null)).v; if (d) out.push(Object.assign({ ref: x.pathname.split('/').pop() }, d)); } return { denuncias: out }; },
  async adminApagar(c, b) { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const ref = String(b.ref || '').replace(/[^0-9a-f-]/g, ''), d = (await ler('so/den/' + ref, null)).v; if (!d) throw N.err('admin', 'Denúncia não encontrada.', 404);
    for (const dd of [dia(Date.now() - 864e5), dia()]) await mudar('so/m/' + d.conv + '/' + dd, [], L => { const i = L.findIndex(x => x.id === d.mid); if (i < 0) return false; L.splice(i, 1); }).catch(() => { });
    if (b.mudo) await mudar(P(d.de), null, p => { p.mudo = Date.now() + 7 * 864e5; }).catch(() => { }); await N.store().del(['so/den/' + ref]); return { ok2: true }; },
  async rankAnime(c, b) { const T = (await ler(PTS, {})).v || {}, L = Object.entries(T).map(([id, o]) => ({ id, nome: o.nome, p: o.p })).sort((a, b2) => b2.p - a.p); const i = L.findIndex(x => x.id === c.eu);
    return { lista: L.slice(0, 100).map((x, k) => Object.assign(x, { pos: k + 1, eu: x.id === c.eu })), eu: i >= 0 ? Object.assign({ pos: i + 1 }, L[i]) : null, total: L.length }; },
  async hunter(c, b) { return { hunter: await hunterVer(c.eu) }; },
  async hunterMarcar(c, b) { const { L, v } = await desafio(); if (!v || v.fechado) throw N.err('hunter', v ? 'O Pursuit de hoje já fechou.' : 'O Pursuit de hoje ainda não começou (20h).', 400);
    const mal = String(b.mal || '').replace(/\D/g, ''); if (!mal) throw N.err('hunter', 'Anime desconhecido.', 400); const v0 = await perfil(c.eu, c.nome);
    try { await gravar('so/hg/' + v.dia + '/' + c.eu, { id: c.eu, nome: v0.nome, mal, titulo: String(b.titulo || '').slice(0, 120), at: Date.now() }, { overwrite: false }); } catch (e) { if (e.code === 'exists' || e.status === 409 || /exist|precondition/i.test(e.message || '')) throw N.err('hunter', 'Já marcaste o teu Pursuit de hoje.', 409); throw e; }
    return { ok2: true, hunter: await hunterVer(c.eu) }; } };
const PARC = 'cfg/parceiro.json', PARC0 = 'PHANTOM'; // v3.73: a empresa parceira dos Animes
const parceiro = async () => { try { const g = await N.store().get(PARC); return g ? JSON.parse(g.buf.toString()) : { nome: PARC0 }; } catch (e) { return { nome: PARC0 }; } };
OPS.adminParceiro = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const nome = String(b.nome || '').replace(/\s+/g, ' ').trim().slice(0, 30) || PARC0, site = String(b.site || '').trim().slice(0, 200);
  if (site && !/^https:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(site)) throw N.err('admin', 'O site tem de começar por https://', 400);
  const o = { nome, site, at: Date.now() }; await N.store().put(PARC, Buffer.from(JSON.stringify(o))); return { parceiro: o }; };
module.exports = N.handler(async (req, res) => {
  // o nome do parceiro (público, para o app o mostrar antes de entrar na conta)
  if (req.method === 'GET' && String((req.query || {}).op || '') === 'parceiro') { if (N.limit(req, 'parc', 60, 60e3)) return N.send(res, 429, { ok: false }); res.setHeader('cache-control', 'public, max-age=300'); const o = await parceiro(); return N.send(res, 200, { ok: true, nome: o.nome || '', site: o.site || '' }); }
  if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  const t = await N.readToken(req); if (!t) return N.send(res, 401, { ok: false, msg: 'Entra na tua conta para usar os clãs.', code: 'sessao' });
  const b = await N.body(req), op = String(b.op || ''), pid = String(b.p || ''); if (!PID.test(pid)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  if (!Object.prototype.hasOwnProperty.call(OPS, op)) return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
  if (N.limit(req, 'social|' + t.u, 240, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  const c = await conta(t, pid); c.eu = t.u + '-' + pid; if (!ID.test(c.eu)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  return N.send(res, 200, Object.assign({ ok: true }, await OPS[op](c, b, req)));
});
module.exports._regras = regras; module.exports._lisboa = lisboa;
