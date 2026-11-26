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
  await N.gate(r.email); const o = { at: Date.now(), email: r.email, nome: String(pf.nome || 'Pessoa').slice(0, 24), adm: N.isAdminEmail(r.email), teste: N.isTeste(r.email) }; OKS.set(k, o); if (OKS.size > 3000) OKS.delete(OKS.keys().next().value); return o; };
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
const ia = async (t, pedido) => { const env = k => String(process.env[k] || '').trim(), to = () => AbortSignal.timeout(6000), PED = pedido || PEDIDO(t);
  try { if (env('NAUTILO_MOD_MOCK')) { const r = await fetch(env('NAUTILO_MOD_MOCK'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, com: !!pedido }), signal: to() }); return json1(await r.text()); }
    if (env('ANTHROPIC_API_KEY')) { const r = await fetch((env('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com') + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: env('NAUTILO_MOD_MODEL') || 'claude-haiku-5-5', max_tokens: 80, messages: [{ role: 'user', content: PED }] }), signal: to() });
      if (r.ok) { const j = await r.json(); const o = json1(((j.content || []).find(c => c.type === 'text') || {}).text); if (o) return o; } }
    if (env('GEMINI_API_KEY')) { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + (env('NAUTILO_MOD_GEMINI') || 'gemini-flash-lite-latest') + ':generateContent?key=' + encodeURIComponent(env('GEMINI_API_KEY')), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: PED }] }], generationConfig: { temperature: 0, maxOutputTokens: 80, responseMimeType: 'application/json' } }), signal: to() });
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
const somaPts = async (L) => mudar(PTS, {}, T => { L.forEach(([id, nome, p, x]) => { const o = T[id] = T[id] || { p: 0, nome }; o.p += p; o.nome = nome || o.nome; if (x) { if (x.user) o.user = x.user; if (x.av) o.av = x.av; } }); });
// o @ e a foto também no ranking (cria a linha com 0 pontos, que não aparece na lista)
const pubPts = async (id, patch) => mudar(PTS, {}, T => { T[id] = Object.assign(T[id] || { p: 0 }, patch); });
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
// v3.78: quando o MyAnimeList (Jikan) não responde, o AniList dá a mesma informação (pelos números do MyAnimeList)
const ALQ = () => process.env.NAUTILO_ANILIST || 'https://graphql.anilist.co';
const al = async (query, variables) => { const r = await fetch(ALQ(), { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error('AniList ' + r.status); const j = await r.json(); if (j.errors && !j.data) throw new Error('AniList'); return j.data || {}; };
const ALFONTE = { MANGA: 'Manga', LIGHT_NOVEL: 'Light novel', NOVEL: 'Novel', ORIGINAL: 'Original', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Game', WEB_NOVEL: 'Web novel', DOUJINSHI: 'Doujinshi', ANIME: 'Anime', MULTIMEDIA_PROJECT: 'Original' };
const alTop = async () => { const L = []; for (let pg = 1; pg <= 4; pg++) { const d = await al('query($p:Int){Page(page:$p,perPage:50){media(type:ANIME,sort:POPULARITY_DESC,isAdult:false){idMal genres}}}', { p: pg });
    ((d.Page || {}).media || []).forEach(m => { if (m.idMal && !(m.genres || []).includes('Ecchi') && !(m.genres || []).includes('Hentai')) L.push(m.idMal); }); } return L; };
const alFicha = async mal => { const m = ((await al('query($m:Int){Media(idMal:$m,type:ANIME){idMal title{romaji english} format episodes season seasonYear source genres tags{name rank isMediaSpoiler} studios(isMain:true){nodes{name}} coverImage{extraLarge large}}}', { m: +mal })) || {}).Media;
  if (!m || !m.idMal) return {};
  return { mal_id: m.idMal, title: (m.title || {}).romaji || (m.title || {}).english || '', title_english: (m.title || {}).english || '', type: m.format === 'MOVIE' ? 'Movie' : 'TV', episodes: m.episodes || 0, year: m.seasonYear || 0, season: String(m.season || '').toLowerCase(),
    source: ALFONTE[m.source] || '', genres: (m.genres || []).map(name => ({ name })), themes: (m.tags || []).filter(t => !t.isMediaSpoiler && t.rank >= 70).slice(0, 2).map(t => ({ name: t.name })), demographics: [], studios: (((m.studios || {}).nodes) || []).map(x => ({ name: x.name })),
    images: { webp: { large_image_url: (m.coverImage || {}).extraLarge || (m.coverImage || {}).large || '' } } }; };
// o anime do dia: um dos 200 mais populares, escolhido pela data (o mesmo para todos) sem repetir nos últimos 60 dias
const escolher = async d => { let top = (await ler('so/htop', null)).v;
  if (!top || Date.now() - top.at > 7 * 864e5 || !top.L.length) { const L = []; for (let pg = 1; pg <= 8; pg++) { try { const j = await jk('top/anime?filter=bypopularity&page=' + pg); if (!(j.data || []).length) break; (j.data || []).forEach(x => { if (x && x.mal_id && x.rating && !/Rx|R\+/.test(x.rating)) L.push(x.mal_id); }); } catch (e) { break; } await sleep(450); } if (!L.length) { try { (await alTop()).forEach(x => L.push(x)); } catch (e) { } } if (L.length) { top = { L, at: Date.now() }; await gravar('so/htop', top); } }
  if (!top || !top.L.length) throw N.err('hunter', 'As bases de animes não responderam. O Pursuit de hoje sai daqui a pouco.', 502);
  const hist = (await ler('so/hhist', { L: [] })).v.L || [], h = N.crypto.createHmac('sha256', await N.master()).update('hunter:' + d).digest(); let i = h.readUInt32BE(0) % top.L.length, n = 0;
  while (hist.includes(top.L[i]) && n++ < top.L.length) i = (i + 1) % top.L.length;
  return top.L[i]; };
const desafio = async () => { const L = lisboa(), d = L.d, P0 = 'so/h/' + d; let { v } = await ler(P0, null);
  // (só entre as 20h e as 22h: depois de fechar, sem jogo criado, mostra o de amanhã)
  if (!v && L.min >= H_ABRE() && L.min < H_FECHA()) { const mal = await escolher(d); let a = {}; try { a = ((await jk('anime/' + mal + '/full')) || {}).data || {}; } catch (e) { }
    if (!a.mal_id) { try { a = await alFicha(mal); } catch (e) { } } if (!a.mal_id) throw N.err('hunter', 'As bases de animes não responderam. O Pursuit de hoje sai daqui a pouco.', 502);
    v = { dia: d, mal: String(a.mal_id), titulo: a.title_english || a.title, img: ((a.images || {}).webp || {}).large_image_url || ((a.images || {}).jpg || {}).image_url || '', pistas: pistasDe(a), fechado: false };
    try { await gravar(P0, v, { overwrite: false }); await mudar('so/hhist', { L: [] }, o => { o.L = (o.L || []).concat(+v.mal).slice(-60); }); } catch (e) { v = (await ler(P0, v)).v; } }
  if (v && !v.fechado && L.min >= H_FECHA()) v = await fechar(P0, v);
  return { L, v }; };
const fechar = async (P0, v0) => { const L = await N.store().list('so/hg/' + v0.dia + '/'), G = [];
  for (const b of L) { const g = (await ler(b.pathname, null)).v; if (g) G.push(g); }
  const certos = G.filter(g => g.mal === v0.mal).sort((a, b) => a.at - b.at), res = certos.map((g, i) => ({ id: g.id, nome: g.nome, user: g.user || '', av: g.av || 0, at: g.at, pts: Math.max(10, 100 - 10 * i) }));
  let ganhei = false; const v = await mudar(P0, v0, o => { if (o.fechado) return false; o.fechado = true; o.res = res.slice(0, 100); o.total = G.length; ganhei = true; });
  if (ganhei && res.length) await somaPts(res.map(r => [r.id, r.nome, r.pts, { user: r.user, av: r.av }])); return v; };
const hunterVer = async (eu) => { const { L, v } = await desafio(), abre = H_ABRE(), fecha = H_FECHA(), m = L.min;
  const fase = !v ? 'espera' : v.fechado ? 'fechado' : 'aberto', meu = v && eu ? (await ler('so/hg/' + v.dia + '/' + eu, null)).v : null;
  const visiveis = !v ? [] : v.fechado ? v.pistas : v.pistas.slice(0, Math.min(v.pistas.length, 3 + (m >= abre + 40 ? 1 : 0) + (m >= abre + 80 ? 1 : 0)));
  const ontem = fase === 'espera' ? (await ler('so/h/' + lisboa(Date.now() - 864e5).d, null)).v : null;
  const min0 = Math.floor(Date.now() / 6e4) * 6e4, depois = !v && m >= fecha ? 864e5 : 0, abreAt = min0 - (m - abre) * 6e4 + depois, fechaAt = min0 - (m - fecha) * 6e4 + depois;   // depois das 22h sem jogo: o de amanhã
  return { fase, dia: L.d, abre, fecha, agora: m, abreAt, fechaAt, amanha: abreAt + 864e5, ts: Date.now(), pistas: visiveis, total: v ? v.pistas.length : 5, meu: meu ? { mal: meu.mal, titulo: meu.titulo, at: meu.at, certo: v && v.fechado ? meu.mal === v.mal : undefined } : null,
    resposta: v && v.fechado ? { mal: v.mal, titulo: v.titulo, img: v.img } : null, res: v && v.fechado ? (v.res || []).slice(0, 30) : null, jogadores: v && v.fechado ? v.total : undefined,
    ontem: ontem && ontem.fechado ? { titulo: ontem.titulo, img: ontem.img, res: (ontem.res || []).slice(0, 5) } : null }; };
/* ---------- pedidos ---------- */
const OPS = {
  async eu(c, b) { const v = await perfil(c.eu, c.nome), amigos = await Promise.all((v.amigos || []).map(pub)), pedidos = await Promise.all((v.pedidos || []).map(pub)), clas = [];
    for (const cid of v.clas || []) { const cl = (await ler(CL(cid), null)).v; if (cl) clas.push(claPub(cl)); }
    if (c.nome && v.nome !== c.nome) { v.nome = c.nome; await mudar(P(c.eu), null, p => { p.nome = c.nome; }).catch(() => { }); if (v.user || v.av) pubPts(c.eu, { nome: c.nome }).catch(() => { }); }
    const T = (await ler(PTS, {})).v || {}; return { eu: { id: v.id, nome: v.nome, cod: v.cod, user: v.user || '', av: v.av || 0, fu: v.fu || 0, cl: v.classe || '', pts: (T[v.id] || {}).p || 0, mudo: v.mudo && v.mudo > Date.now() ? v.mudo : 0 }, amigos, pedidos, enviados: v.enviados || [], bloq: v.bloq || [], clas }; },
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
    const T = (await ler(PTS, {})).v || {}, r = claPub(cl); r.membros = r.membros.map(m => Object.assign(m, { pts: (T[m.id] || {}).p || 0, user: (T[m.id] || {}).user || '', av: (T[m.id] || {}).av || 0 })).sort((a, b2) => b2.pts - a.pts); r.pts = r.membros.reduce((s, m) => s + m.pts, 0); return { cla: r }; },
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
    if (/^a-\d+$/.test(d.conv)) await mudar(CA(d.conv.slice(2)), { L: [], gl: [] }, o => { const i = o.L.findIndex(x => x.id === d.mid); if (i < 0) return false; o.L.splice(i, 1); }).catch(() => { });
    for (const dd of [dia(Date.now() - 864e5), dia()]) await mudar('so/m/' + d.conv + '/' + dd, [], L => { const i = L.findIndex(x => x.id === d.mid); if (i < 0) return false; L.splice(i, 1); }).catch(() => { });
    if (b.mudo) await mudar(P(d.de), null, p => { p.mudo = Date.now() + 7 * 864e5; }).catch(() => { }); await N.store().del(['so/den/' + ref]); return { ok2: true }; },
  async rankAnime(c, b) { const T = (await ler(PTS, {})).v || {}, L = Object.entries(T).filter(([, o]) => o.p > 0).map(([id, o]) => ({ id, nome: o.nome, p: o.p, user: o.user || '', av: o.av || 0, cl: o.cl || '' })).sort((a, b2) => b2.p - a.p); const i = L.findIndex(x => x.id === c.eu);
    return { lista: L.slice(0, 100).map((x, k) => Object.assign(x, { pos: k + 1, eu: x.id === c.eu })), eu: i >= 0 ? Object.assign({ pos: i + 1 }, L[i]) : null, total: L.length }; },
  async hunter(c, b) { return { hunter: await hunterVer(c.eu) }; },
  async hunterMarcar(c, b) { const { L, v } = await desafio(); if (!v || v.fechado) throw N.err('hunter', v ? 'O Pursuit de hoje já fechou.' : 'O Pursuit de hoje ainda não começou (20h).', 400);
    const mal = String(b.mal || '').replace(/\D/g, ''); if (!mal) throw N.err('hunter', 'Anime desconhecido.', 400); const v0 = await perfil(c.eu, c.nome);
    try { await gravar('so/hg/' + v.dia + '/' + c.eu, { id: c.eu, nome: v0.nome, user: v0.user || '', av: v0.av || 0, mal, titulo: String(b.titulo || '').slice(0, 120), at: Date.now() }, { overwrite: false }); } catch (e) { if (e.code === 'exists' || e.status === 409 || /exist|precondition/i.test(e.message || '')) throw N.err('hunter', 'Já marcaste o teu Pursuit de hoje.', 409); throw e; }
    return { ok2: true, hunter: await hunterVer(c.eu) }; } };
/* ---------- v3.75: perfil dos animes — o @ (escolhido uma vez, não muda), a foto e o fundo ---------- */
const RESERV = /^(admin|administra|prumo|phantom|superanimes|suporte|equipa|staff|moderador|oficial|sistema)/;
const imgP = (k, id) => 'so/img/' + k + '/' + id;
const PEDIMG = `Esta imagem vai ser a foto ou o fundo de um perfil numa app para pessoas a partir dos 16 anos. Responde SÓ com JSON numa linha: {"ok":true} ou {"ok":false,"motivo":"<curto, em português de Portugal>"}. Bloqueia nudez ou conteúdo sexual, violência explícita, ódio (símbolos ou gestos), drogas e documentos ou dados pessoais visíveis. Permite fotos normais, personagens de anime, paisagens e arte.`;
const iaImg = async b64 => { const env = k => String(process.env[k] || '').trim(), to = () => AbortSignal.timeout(9000);
  try { if (env('NAUTILO_MOD_MOCK')) { const r = await fetch(env('NAUTILO_MOD_MOCK'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ img: 1, n: b64.length }), signal: to() }); return json1(await r.text()); }
    if (env('ANTHROPIC_API_KEY')) { const r = await fetch((env('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com') + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' }, signal: to(),
        body: JSON.stringify({ model: env('NAUTILO_MOD_MODEL') || 'claude-haiku-5-5', max_tokens: 80, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: PEDIMG }] }] }) });
      if (r.ok) { const j = await r.json(); const o = json1(((j.content || []).find(c => c.type === 'text') || {}).text); if (o) return o; } }
    if (env('GEMINI_API_KEY')) { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + (env('NAUTILO_MOD_GEMINI') || 'gemini-flash-lite-latest') + ':generateContent?key=' + encodeURIComponent(env('GEMINI_API_KEY')), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: to(),
        body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: b64 } }, { text: PEDIMG }] }], generationConfig: { temperature: 0, maxOutputTokens: 80, responseMimeType: 'application/json' } }) });
      if (r.ok) { const j = await r.json(); const o = json1((((((j.candidates || [])[0] || {}).content || {}).parts || [])[0] || {}).text); if (o) return o; } }
  } catch (e) { } return null; };
OPS.user = async (c, b) => { const u = String(b.user || '').trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(u) || /^\.|\.$|\.\./.test(u)) throw N.err('user', 'O @ tem de ter 3 a 20 letras, números, _ ou ponto.', 400);
  if ((RESERV.test(u) && !c.adm) || regras(u.replace(/[._]/g, ' '))) throw N.err('user', 'Esse @ não pode ser usado.', 400);
  const v = await perfil(c.eu, c.nome); if (v.user) throw N.err('user', 'O teu @ já está escolhido e não muda.', 409);
  try { await N.store().put('so/at/' + u, Buffer.from(JSON.stringify({ id: c.eu })), { overwrite: false }); } catch (e) { if (e.code === 'exists') throw N.err('user', 'Esse @ já é de outra pessoa.', 409); throw e; }
  await mudar(P(c.eu), null, p => { p.user = u; }); await pubPts(c.eu, { nome: v.nome, user: u }).catch(() => { }); return { user: u }; };
OPS.perfilImg = async (c, b) => { const k = b.k === 'fu' ? 'fu' : 'av', max = k === 'fu' ? 380e3 : 140e3; await perfil(c.eu, c.nome);
  if (b.apagar) { await N.store().del([imgP(k, c.eu)]).catch(() => { }); await mudar(P(c.eu), null, p => { p[k] = 0; }); if (k === 'av') await pubPts(c.eu, { av: 0 }).catch(() => { }); return { [k]: 0 }; }
  const s64 = String(b.b64 || ''); if (!/^[A-Za-z0-9+/=]{400,}$/.test(s64) || s64.length > max * 1.37) throw N.err('img', 'A imagem é grande demais ou não é válida.', 400);
  const buf = Buffer.from(s64, 'base64'); if (buf[0] !== 0xFF || buf[1] !== 0xD8) throw N.err('img', 'Envia uma imagem (JPEG).', 400);
  const m = await iaImg(s64); if (m && m.ok === false) throw N.err('img', 'Esta imagem não pode ser usada: ' + String(m.motivo || 'não cumpre as regras').slice(0, 120), 400);
  await N.store().put(imgP(k, c.eu), buf); const ver = Date.now(); await mudar(P(c.eu), null, p => { p[k] = ver; }); if (k === 'av') await pubPts(c.eu, { av: ver }).catch(() => { }); return { [k]: ver }; };
OPS.verPerfil = async (c, b) => { const id = String(b.id || ''); if (!ID.test(id)) throw N.err('perfil', 'Perfil desconhecido.', 400); const v = (await ler(P(id), null)).v; if (!v) throw N.err('perfil', 'Perfil desconhecido.', 404);
  const T = (await ler(PTS, {})).v || {}, L = Object.entries(T).filter(([, o]) => o.p > 0).sort((a, b2) => b2[1].p - a[1].p), pos = L.findIndex(([i]) => i === id);
  return { perfil: { id, nome: v.nome, user: v.user || '', av: v.av || 0, fu: v.fu || 0, cl: v.classe || '', pts: (T[id] || {}).p || 0, pos: pos >= 0 ? pos + 1 : 0, clas: (v.clas || []).length, amigo: (v.amigos || []).includes(c.eu) } }; };
/* ---------- comentários nos animes: a IA barra ofensas e tapa os spoilers (só vê quem quiser) ---------- */
const CA = mal => 'so/ca/' + mal;
let NUMS = null;
const numeros = async () => { if (NUMS && Date.now() - NUMS.at < 10 * 6e4) return NUMS.v; const S = N.store(), cnt = async p => { try { return (await S.list(p)).length; } catch (e) { return 0; } };
  const pts = (await ler(PTS, { T: {} })).v || {}, T = pts.T || {}, d = lisboa().d;
  const v = { jogadores: Object.keys(T).filter(k => (T[k] || {}).p > 0).length, hoje: await cnt('so/hg/' + d + '/'), clas: await cnt('so/cl/'), coms: await cnt('so/ca/') };
  NUMS = { at: Date.now(), v }; return v; };
const malDe = b => { const m = String(b.mal || '').replace(/\D/g, '').slice(0, 9); if (!m) throw N.err('anime', 'Anime desconhecido.', 400); return m; };
const PEDIDOC = (t, titulo) => `És o moderador dos comentários sobre animes no Prumo (app para pessoas a partir dos 16 anos). Anime: "${String(titulo || '').slice(0, 80).replace(/"/g, "'")}". Responde SÓ com JSON numa linha: {"ok":true,"spoiler":false} ou {"ok":false,"motivo":"<curto, em português de Portugal>"}.
"spoiler": true quando o comentário conta acontecimentos importantes da história que quem ainda não viu não quer saber (mortes, quem é o vilão, reviravoltas, o final, quem fica com quem). Opiniões ("é incrível", "o episódio 5 é o melhor", "a animação é linda") não são spoiler.
Bloqueia (ok:false) insultos ou assédio a alguém, ódio, ameaças, conteúdo sexual, burlas, links e dados pessoais.
Comentário: <<<${String(t).replace(/<<<|>>>/g, '')}>>>`;
const SPOIL = /\b(morre|morreu|morrem|mata|matou|é o vil[aã]o|era o vil[aã]o|no final|no fim d|o final|trai|traiu|traidor|revela-se|descobre-se que|afinal (é|era)|spoiler)\b/i;
const moderarCom = async (t, titulo) => { const r = regras(t); if (r) return { ok: false, motivo: r }; const o = await ia(t, PEDIDOC(t, titulo));
  if (o && o.ok === false) return { ok: false, motivo: String(o.motivo || 'O comentário não cumpre as regras.').slice(0, 160) }; return { ok: true, spoiler: o && typeof o.spoiler === 'boolean' ? o.spoiler || SPOIL.test(t) : SPOIL.test(t) }; };
const comPub = (x, eu) => ({ id: x.id, de: x.de, nome: x.nome, user: x.user || '', av: x.av || 0, t: x.t, at: x.at, sp: !!x.sp, gostos: (x.g || []).length, gostei: (x.g || []).includes(eu), meu: x.de === eu });
OPS.comentarios = async (c, b) => { const mal = malDe(b), v = await perfil(c.eu, c.nome), o = (await ler(CA(mal), { L: [], gl: [] })).v || { L: [], gl: [] };
  return { coms: (o.L || []).filter(x => !(v.bloq || []).includes(x.de)).slice(-120).reverse().map(x => comPub(x, c.eu)), n: (o.L || []).length, gostos: (o.gl || []).length, gostei: (o.gl || []).includes(c.eu) }; };
OPS.comentar = async (c, b, req) => { const mal = malDe(b), t = String(b.texto || '').trim().slice(0, 800), v = await perfil(c.eu, c.nome); if (t.length < 2) throw N.err('com', 'Escreve um comentário.', 400);
  if (v.mudo && v.mudo > Date.now()) throw N.err('mudo', 'Estás sem poder escrever por agora (mensagens barradas a mais).', 403);
  if (N.limit(req, 'com|' + c.eu, 8, 60e3)) throw N.err('limite', 'Estás a comentar depressa demais. Espera um pouco.', 429);
  const m = await moderarCom(t, b.titulo); N.count('com:' + (m.ok ? (m.spoiler ? 'spoiler' : 'ok') : 'barrado'));
  if (!m.ok) { let mudo = 0; await mudar(P(c.eu), null, p => { const h = Date.now(); p.barr = (p.barr || []).filter(x => h - x < 36e5).concat(h); if (p.barr.length >= 3) { p.mudo = h + 36e5; p.barr = []; mudo = p.mudo; } }); return { barrada: true, motivo: m.motivo, mudo }; }
  const x = { id: N.crypto.randomBytes(6).toString('hex'), de: c.eu, nome: v.nome, user: v.user || '', av: v.av || 0, t, at: Date.now(), sp: !!m.spoiler, g: [] };
  await mudar(CA(mal), { L: [], gl: [] }, o => { o.L = o.L || []; o.L.push(x); if (o.L.length > 600) o.L.splice(0, o.L.length - 600); }); return { com: comPub(x, c.eu) }; };
OPS.gostarCom = async (c, b) => { const mal = malDe(b), id = String(b.id || ''); let r = null; await mudar(CA(mal), { L: [], gl: [] }, o => { const x = (o.L || []).find(y => y.id === id); if (!x) return false; x.g = x.g || []; const i = x.g.indexOf(c.eu); if (i >= 0) x.g.splice(i, 1); else x.g.push(c.eu); r = comPub(x, c.eu); }); if (!r) throw N.err('com', 'Comentário não encontrado.', 404); return { com: r }; };
OPS.gostarAnime = async (c, b) => { const mal = malDe(b); let r = null; await mudar(CA(mal), { L: [], gl: [] }, o => { o.gl = o.gl || []; const i = o.gl.indexOf(c.eu); if (i >= 0) o.gl.splice(i, 1); else o.gl.push(c.eu); r = { gostos: o.gl.length, gostei: i < 0 }; }); return r; };
OPS.apagarCom = async (c, b) => { const mal = malDe(b), id = String(b.id || ''); let ok = false; await mudar(CA(mal), { L: [], gl: [] }, o => { const i = (o.L || []).findIndex(y => y.id === id && (y.de === c.eu || c.adm)); if (i < 0) return false; o.L.splice(i, 1); ok = true; }); if (!ok) throw N.err('com', 'Não podes apagar este comentário.', 403); return { ok2: true }; };
OPS.denunciarCom = async (c, b) => { const mal = malDe(b), id = String(b.id || ''), o = (await ler(CA(mal), { L: [] })).v || { L: [] }, x = (o.L || []).find(y => y.id === id); if (!x) throw N.err('com', 'Comentário não encontrado.', 404);
  await gravar('so/den/' + Date.now() + '-' + N.crypto.randomBytes(3).toString('hex'), { conv: 'a-' + mal, mid: x.id, de: x.de, nome: x.nome, t: x.t, por: c.eu, motivo: String(b.motivo || '').slice(0, 200), at: Date.now() }); N.count('com:denuncia'); return { ok2: true }; };
/* ---------- Comunidade (como na SuperAnimes): indicações, pedidos, sugestões, a equipa e o recrutamento ---------- */
const TIPOS = { indicacao: 'Indicação', pedido: 'Pedido', sugestao: 'Sugestão', reclamacao: 'Reclamação', recrutamento: 'Recrutamento' };   // v3.78: reclamações (de qualquer parte do app)
const indPub = (x, eu) => ({ id: x.id, nome: x.nome, user: x.user || '', titulo: x.titulo, texto: x.texto, at: x.at, gostos: (x.g || []).length, gostei: (x.g || []).includes(eu), meu: x.de === eu });
OPS.com = async (c, b, req) => { const tipo = String(b.tipo || ''); if (!TIPOS[tipo]) throw N.err('com', 'Escolhe o que queres enviar.', 400);
  const titulo = String(b.titulo || '').replace(/\s+/g, ' ').trim().slice(0, 100), texto = String(b.texto || '').trim().slice(0, 1200);
  if ((tipo === 'indicacao' && titulo.length < 2) || (tipo !== 'indicacao' && texto.length < 5)) throw N.err('com', tipo === 'indicacao' ? 'Escreve o nome do anime que recomendas.' : 'Escreve um pouco mais.', 400);
  if (N.limit(req, 'comu|' + c.eu, 6, 3600e3)) throw N.err('limite', 'Já enviaste bastante na última hora. Tenta mais tarde.', 429);
  const m = await moderar((titulo + ' ' + texto).trim()); if (!m.ok) throw N.err('com', 'Não deu para enviar: ' + m.motivo, 400);
  const v = await perfil(c.eu, c.nome), rec = { id: N.crypto.randomBytes(6).toString('hex'), tipo, de: c.eu, nome: v.nome, user: v.user || '', titulo, texto, at: Date.now(), g: [], orig: b.orig === 'app' ? 'app' : 'animes', email: c.email || '' };
  await gravar('so/com/' + tipo + '/' + Date.now() + '-' + rec.id, rec);
  if (tipo === 'indicacao') await mudar('so/ind', { L: [] }, o => { o.L = o.L || []; o.L.push(rec); if (o.L.length > 300) o.L.splice(0, o.L.length - 300); });
  N.count('comunidade:' + tipo); return { ok2: true, ind: tipo === 'indicacao' ? indPub(rec, c.eu) : undefined }; };
OPS.indicacoes = async (c, b) => { const o = (await ler('so/ind', { L: [] })).v || { L: [] }; return { L: (o.L || []).slice(-80).reverse().map(x => indPub(x, c.eu)) }; };
OPS.gostarInd = async (c, b) => { const id = String(b.id || ''); let r = null; await mudar('so/ind', { L: [] }, o => { const x = (o.L || []).find(y => y.id === id); if (!x) return false; x.g = x.g || []; const i = x.g.indexOf(c.eu); if (i >= 0) x.g.splice(i, 1); else x.g.push(c.eu); r = indPub(x, c.eu); }); if (!r) throw N.err('com', 'Indicação não encontrada.', 404); return { ind: r }; };
OPS.equipa = async () => ({ equipa: ((await ler('so/equipa', { L: [] })).v || { L: [] }).L || [] });
OPS.adminEquipa = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const L = (Array.isArray(b.L) ? b.L : []).slice(0, 40).map(x => ({ nome: String(x.nome || '').slice(0, 40), papel: String(x.papel || '').slice(0, 60), user: String(x.user || '').replace(/[^a-z0-9_.]/gi, '').slice(0, 20).toLowerCase(), desc: String(x.desc || '').slice(0, 200) })).filter(x => x.nome);
  await gravar('so/equipa', { L, at: Date.now() }); return { equipa: L }; };
// v3.78: a caixa da Comunidade na Administração: tudo o que as pessoas enviam (sugestões, reclamações, pedidos, recrutamento, indicações) e as denúncias, com "visto"
OPS.adminCaixa = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const vis = ((await ler('so/coml', { v: {} })).v || {}).v || {}, out = [];
  for (const tipo of Object.keys(TIPOS)) { const L = (await N.store().list('so/com/' + tipo + '/')).slice(-60);
    for (const x of L) { const d = (await ler(x.pathname, null)).v; if (d) out.push({ id: d.id, tipo, nome: d.nome, user: d.user || '', titulo: d.titulo || '', texto: d.texto || '', at: d.at, email: d.email || '', orig: d.orig || 'animes', visto: !!vis[d.id] }); } }
  out.sort((a, b2) => b2.at - a.at); return { L: out.slice(0, 300), novos: out.filter(x => !x.visto).length }; };
OPS.adminVisto = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(x => String(x || '').slice(0, 20)).filter(Boolean).slice(0, 300), on = b.visto !== false;
  await mudar('so/coml', { v: {} }, o => { o.v = o.v || {}; ids.forEach(i => { if (on) o.v[i] = Date.now(); else delete o.v[i]; }); const ks = Object.keys(o.v); if (ks.length > 3000) ks.sort((a, z) => o.v[a] - o.v[z]).slice(0, ks.length - 3000).forEach(k => delete o.v[k]); }); return { ok2: true }; };
OPS.adminCom = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const tipo = TIPOS[b.tipo] ? b.tipo : 'sugestao', L = (await N.store().list('so/com/' + tipo + '/')).slice(-60), out = [];
  for (const x of L.reverse()) { const d = (await ler(x.pathname, null)).v; if (d) out.push({ nome: d.nome, user: d.user, titulo: d.titulo, texto: d.texto, at: d.at, email: d.email || '' }); } return { tipo, L: out }; };
/* ---------- v3.79 · Desafio da semana: o mesmo para todas as contas, escolhido pelo servidor; quem participa entra no ranking ---------- */
// o progresso vem dos dados de cada um no app (treinos, estudo, km, hábitos, tarefas); o do Pursuit é contado aqui (os acertos da semana)
const DESAFIOS = [
  { k: 'treinos', t: 'Semana de ferro', d: 'Regista 4 treinos esta semana.', alvo: 4, un: 'treinos', ic: 'dumbbell' },
  { k: 'estudo', t: 'Mente afiada', d: 'Faz 5 horas de estudo ou de foco esta semana.', alvo: 5, un: 'horas', ic: 'book' },
  { k: 'km', t: 'Pé na estrada', d: 'Corre ou caminha 15 km esta semana.', alvo: 15, un: 'km', ic: 'run' },
  { k: 'habitos', t: 'Sem falhas', d: 'Cumpre todos os hábitos inegociáveis em 5 dias da semana.', alvo: 5, un: 'dias perfeitos', ic: 'check' },
  { k: 'tarefas', t: 'Caixa vazia', d: 'Conclui 20 tarefas esta semana.', alvo: 20, un: 'tarefas', ic: 'checksq' },
  { k: 'pursuit', t: 'Caçador de animes', d: 'Acerta 3 vezes no Pursuit esta semana.', alvo: 3, un: 'acertos', ic: 'target' }];
const semana = (t = Date.now()) => { const L = lisboa(t), [y, m, d] = L.d.split('-').map(Number), dt = new Date(Date.UTC(y, m - 1, d)), dow = (dt.getUTCDay() + 6) % 7, seg = new Date(dt.getTime() - dow * 864e5);
  const th = new Date(seg.getTime() + 3 * 864e5), y0 = th.getUTCFullYear(), w = 1 + Math.round((th - Date.UTC(y0, 0, 4)) / 864e5 / 7 - ((new Date(Date.UTC(y0, 0, 4)).getUTCDay() + 6) % 7 - 3) / 7);
  const dias = Array.from({ length: 7 }, (_, i) => new Date(seg.getTime() + i * 864e5).toISOString().slice(0, 10));
  // fim: domingo às 23:59 de Lisboa (aproximado ao minuto pela diferença entre a hora de Lisboa e a real)
  const fim = t + ((6 - dow) * 1440 + (1440 - L.min)) * 6e4; return { k: y0 + '-S' + String(w).padStart(2, '0'), dias, fim, ini: fim - 7 * 864e5 }; };
const desafioDe = async S => { const fx = DESAFIOS.find(x => x.k === process.env.NAUTILO_DESAFIO); if (fx) return fx; const h = N.crypto.createHmac('sha256', await N.master()).update('desafio:' + S.k).digest(), ant = semana(S.ini - 3600e3);
  const h2 = N.crypto.createHmac('sha256', await N.master()).update('desafio:' + ant.k).digest(), i0 = h2.readUInt32BE(0) % DESAFIOS.length; let i = h.readUInt32BE(0) % DESAFIOS.length; if (i === i0) i = (i + 1) % DESAFIOS.length; return DESAFIOS[i]; };
// v3.82: a administração vê os desafios das próximas semanas (para conferir antes de irem ao ar)
OPS.adminDesafios = async c => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const out = []; let t = Date.now();
  for (let k = 0; k < 6; k++) { const S = semana(t), D = await desafioDe(S); out.push({ sem: S.k, ini: S.dias[0], fim: S.dias[6], desafio: { k: D.k, t: D.t, d: D.d, alvo: D.alvo, un: D.un }, animes: (await anDesDe(S)).map(x => ({ k: x.k, t: x.t, d: x.d, nv: x.nv, pts: x.pts })) }); t = S.fim + 3 * 3600e3; }
  return { semanas: out }; };
const acertosSemana = async (S, eu) => { let n = 0; for (const d of S.dias) { const v = (await ler('so/h/' + d, null)).v; if (!v || !v.fechado) continue; const g = (await ler('so/hg/' + d + '/' + eu, null)).v; if (g && g.mal === v.mal) n++; } return n; };
const dsPub = (id, o, eu) => ({ id, nome: o.nome, user: o.user || '', av: o.av || 0, v: o.v || 0, at: o.at || 0, eu: id === eu });
const dsVer = async (c, S, D) => { const o = (await ler('so/ds/' + S.k, { T: {} })).v || { T: {} }, T = o.T || {};
  const L = Object.entries(T).map(([id, x]) => dsPub(id, x, c.eu)), feitos = L.filter(x => x.at).sort((a, b) => a.at - b.at || b.v - a.v), caminho = L.filter(x => !x.at && x.v > 0).sort((a, b) => b.v - a.v), zero = L.filter(x => !x.at && !x.v);
  return { sem: S.k, fim: S.fim, desafio: D, feitos: feitos.slice(0, 100), caminho: caminho.slice(0, 100), zero: zero.length, total: L.length, eu: T[c.eu] ? dsPub(c.eu, T[c.eu], c.eu) : null }; };
OPS.desafio = async (c, b) => { const S = semana(), D = await desafioDe(S);
  if (D.k === 'pursuit') { const o = (await ler('so/ds/' + S.k, { T: {} })).v || { T: {} }; if ((o.T || {})[c.eu]) { const n = await acertosSemana(S, c.eu); if (n !== o.T[c.eu].v) await mudar('so/ds/' + S.k, { T: {} }, x => { const e = x.T[c.eu]; if (!e) return false; e.v = n; if (n >= D.alvo && !e.at) e.at = Date.now(); }); } }
  return dsVer(c, S, D); };
OPS.desafioEntrar = async (c, b) => { const S = semana(), D = await desafioDe(S), v0 = await perfil(c.eu, c.nome);
  await mudar('so/ds/' + S.k, { T: {} }, x => { x.T = x.T || {}; if (x.T[c.eu]) return false; x.T[c.eu] = { nome: v0.nome, user: v0.user || '', av: v0.av || 0, v: 0, at: 0, upd: Date.now() }; });
  return OPS.desafio(c, b); };
OPS.desafioProg = async (c, b, req) => { const S = semana(), D = await desafioDe(S); if (D.k === 'pursuit') return OPS.desafio(c, b);
  if (N.limit(req, 'dsp|' + c.eu, 40, 3600e3)) throw N.err('limite', 'Espera um pouco.', 429);
  const v = Math.max(0, Math.min(D.alvo * 10, Math.round((+b.v || 0) * 10) / 10));
  await mudar('so/ds/' + S.k, { T: {} }, x => { const e = (x.T || {})[c.eu]; if (!e) return false; e.v = v; e.upd = Date.now(); if (v >= D.alvo && !e.at) e.at = Date.now(); if (v < D.alvo && e.at) e.at = 0; });
  return dsVer(c, S, D); };
OPS.desafioSair = async (c, b) => { const S = semana(); await mudar('so/ds/' + S.k, { T: {} }, x => { if (!(x.T || {})[c.eu]) return false; delete x.T[c.eu]; }); return OPS.desafio(c, b); };
/* ---------- v3.85 · Desafios semanais dos Animes: 3 por semana (fácil, médio, difícil), os mesmos para todas as contas, escolhidos pelo servidor.
   Contam sozinhos: os episódios, as séries terminadas, as notas, os animes novos, a lista e os géneros vêm do registo diário do app;
   os do Pursuit (dias jogados e acertos) são contados aqui. Cada desafio completo dá pontos ao ranking dos animes; os 3 dão um bónus. ---------- */
const ANDS = [
  [{ k: 'eps8', t: 'Aquecimento', d: 'Vê 8 episódios esta semana.', alvo: 8, un: 'episódios', ic: 'play', m: 'eps' },
    { k: 'notas2', t: 'Olho crítico', d: 'Dá nota a 2 animes.', alvo: 2, un: 'notas', ic: 'star', m: 'notas' },
    { k: 'novo1', t: 'Primeiro episódio', d: 'Começa um anime que nunca tinhas visto.', alvo: 1, un: 'anime', ic: 'compass', m: 'novos' },
    { k: 'pdias3', t: 'Presença no Pursuit', d: 'Joga o Pursuit em 3 dias desta semana.', alvo: 3, un: 'dias', ic: 'target', m: 'pdias' },
    { k: 'lista3', t: 'Fila cheia', d: 'Junta 3 animes à tua lista de "Quero ver".', alvo: 3, un: 'animes', ic: 'mark', m: 'lista' }],
  [{ k: 'eps20', t: 'Maratona', d: 'Vê 20 episódios esta semana.', alvo: 20, un: 'episódios', ic: 'tv', m: 'eps' },
    { k: 'fim1', t: 'Até ao último episódio', d: 'Termina uma série.', alvo: 1, un: 'série', ic: 'flag', m: 'fins' },
    { k: 'gen3', t: 'Volta aos géneros', d: 'Vê episódios de 3 géneros diferentes.', alvo: 3, un: 'géneros', ic: 'layers', m: 'gens' },
    { k: 'pac3', t: 'Caçador', d: 'Acerta 3 vezes no Pursuit.', alvo: 3, un: 'acertos', ic: 'target', m: 'pac' },
    { k: 'dias5', t: 'Todos os dias um pouco', d: 'Vê pelo menos um episódio em 5 dias da semana.', alvo: 5, un: 'dias', ic: 'cal', m: 'dias' }],
  [{ k: 'eps40', t: 'Noite sem fim', d: 'Vê 40 episódios esta semana.', alvo: 40, un: 'episódios', ic: 'moon', m: 'eps' },
    { k: 'fim2', t: 'Fecha o arco', d: 'Termina 2 séries.', alvo: 2, un: 'séries', ic: 'trophy', m: 'fins' },
    { k: 'pac5', t: 'Olho de lince', d: 'Acerta 5 vezes no Pursuit.', alvo: 5, un: 'acertos', ic: 'eye', m: 'pac' },
    { k: 'dias7', t: 'Sete noites seguidas', d: 'Vê pelo menos um episódio em todos os dias da semana.', alvo: 7, un: 'dias', ic: 'flame', m: 'dias' },
    { k: 'novo3', t: 'Explorador', d: 'Começa 3 animes que nunca tinhas visto.', alvo: 3, un: 'animes', ic: 'compass', m: 'novos' }]];
const ANPTS = [15, 30, 60], ANBONUS = 40, ANSRV = new Set(['pdias', 'pac']), ANNIV = ['Fácil', 'Médio', 'Difícil'];
// um de cada nível, sem repetir a mesma medida (nunca 8, 20 e 40 episódios na mesma semana)
const anDesDe = async S => { const h = N.crypto.createHmac('sha256', await N.master()).update('andesafio:' + S.k).digest(), out = [], usadas = new Set();
  ANDS.forEach((L, n) => { let i = h.readUInt16BE(n * 2) % L.length; for (let j = 0; j < L.length && usadas.has(L[i].m); j++) i = (i + 1) % L.length; usadas.add(L[i].m); out.push(Object.assign({ n, nv: ANNIV[n], pts: ANPTS[n] }, L[i])); });
  return out; };
const pdiasSemana = async (S, eu) => { let n = 0; for (const d of S.dias) { const g = (await ler('so/hg/' + d + '/' + eu, null)).v; if (g) n++; } return n; };
const anPub = (id, o, eu) => ({ id, nome: o.nome, user: o.user || '', av: o.av || 0, cl: o.cl || '', pts: o.pts || 0, n: Object.keys(o.ok || {}).length, at: o.at || 0, eu: id === eu });
const anVer = async (c, S, L) => { const o = (await ler('so/ands/' + S.k, { T: {} })).v || { T: {} }, T = o.T || {};
  const R = Object.entries(T).map(([id, x]) => anPub(id, x, c.eu)).filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts || a.at - b.at), me = T[c.eu];
  return { sem: S.k, fim: S.fim, dias: S.dias, bonus: ANBONUS, L: L.map(x => ({ k: x.k, t: x.t, d: x.d, alvo: x.alvo, un: x.un, ic: x.ic, m: x.m, n: x.n, nv: x.nv, pts: x.pts, srv: ANSRV.has(x.m) })),
    rank: R.slice(0, 100), total: R.length, pos: R.findIndex(x => x.eu) + 1, eu: me ? { v: me.v || {}, ok: me.ok || {}, pts: me.pts || 0, bon: !!me.bon } : { v: {}, ok: {}, pts: 0, bon: false } }; };
// grava o progresso (o do app chega em b.v; o do Pursuit conta-se aqui); quem completa ganha os pontos uma vez, para sempre
const anGravar = async (c, S, L, vc) => { const srv = {}; for (const x of L) if (ANSRV.has(x.m) && srv[x.m] == null) srv[x.m] = x.m === 'pac' ? await acertosSemana(S, c.eu) : await pdiasSemana(S, c.eu);
  const nov = []; let v0 = null;
  await mudar('so/ands/' + S.k, { T: {} }, o => { o.T = o.T || {}; let e = o.T[c.eu], mudou = false;
    const val = x => ANSRV.has(x.m) ? srv[x.m] : vc && vc[x.k] != null ? Math.max(0, Math.min(x.alvo * 3, Math.round(+vc[x.k] || 0))) : e && e.v ? e.v[x.k] || 0 : 0;
    if (!e) { if (!L.some(x => val(x) > 0)) return false; e = o.T[c.eu] = { nome: c.nome, v: {}, ok: {}, pts: 0, at: 0 }; mudou = true; }
    nov.length = 0;
    for (const x of L) { const v = val(x); if (e.v[x.k] !== v) { e.v[x.k] = v; mudou = true; } if (v >= x.alvo && !e.ok[x.k]) { e.ok[x.k] = Date.now(); e.pts = (e.pts || 0) + x.pts; e.at = Date.now(); nov.push(x.pts); mudou = true; } }
    if (!e.bon && L.every(x => e.ok[x.k])) { e.bon = Date.now(); e.pts += ANBONUS; nov.push(ANBONUS); mudou = true; }
    v0 = e; if (!mudou) return false; e.upd = Date.now(); });
  if (v0 && v0.cl == null) { const pf = await perfil(c.eu, c.nome); await mudar('so/ands/' + S.k, { T: {} }, o => { const e = (o.T || {})[c.eu]; if (!e) return false; e.nome = pf.nome || e.nome; e.user = pf.user || ''; e.av = pf.av || 0; e.cl = pf.classe || ''; }); }
  if (nov.length) { const pf = await perfil(c.eu, c.nome); await somaPts([[c.eu, pf.nome, nov.reduce((a, b) => a + b, 0), { user: pf.user, av: pf.av }]]); }
  return nov; };
OPS.anDesafios = async (c, b) => { const S = semana(), L = await anDesDe(S); if (L.some(x => ANSRV.has(x.m))) await anGravar(c, S, L, null).catch(() => { }); return anVer(c, S, L); };
OPS.anDesafiosProg = async (c, b, req) => { if (N.limit(req, 'adp|' + c.eu, 60, 3600e3)) throw N.err('limite', 'Espera um pouco.', 429);
  const S = semana(), L = await anDesDe(S), vc = {}; L.forEach(x => { if (!ANSRV.has(x.m) && b.v && b.v[x.k] != null) vc[x.k] = b.v[x.k]; });
  const nov = await anGravar(c, S, L, vc); const r = await anVer(c, S, L); r.novos = nov; return r; };
// v3.79: a classe de fã (calculada no app pelo que cada um vê) aparece no ranking e no perfil de anime
// v3.82: as classes novas (9 + 12 híbridas) e os ranks de E a SSS; as antigas continuam a valer para quem ainda não atualizou
const CLASSES = ['Lâmina do Trovão Carmesim', 'Arquiteto das Sombras', 'Guardião da Flor Eterna', 'Andarilho dos Mil Mundos', 'Monge da Brisa Serena', 'Exorcista da Lua Negra', 'Ás do Último Segundo', 'Piloto do Núcleo Celeste', 'Maestro da Alma Ardente',
    'Cavaleiro do Dragão Ancestral', 'Estratega da Guerra Silenciosa', 'Caçador de Demónios Escarlate', 'Detetive do Oculto', 'Herdeiro do Reino Perdido', 'Coração de Primavera', 'Oráculo do Tempo Partido', 'Prodígio Imparável', 'Comandante da Frota Estelar', 'Aventureiro da Estrada Tranquila', 'Herói de Folga', 'Amante da Noite Eterna',
    'Guerreiro Shōnen', 'Estratega do Mistério', 'Coração Shōjo', 'Explorador de Mundos', 'Alma Tranquila', 'Caçador de Sombras', 'Atleta de Sofá', 'Piloto de Mecha'],
  NIVEIS = ['Rank E', 'Rank D', 'Rank C', 'Rank B', 'Rank A', 'Rank S', 'Rank SS', 'Rank SSS', 'Novato', 'Iniciado', 'Veterano', 'Lenda', 'Mítico'];
OPS.classe = async (c, b) => { const nome = String(b.nome || ''), nivel = String(b.nivel || ''); if (!CLASSES.includes(nome) || !NIVEIS.includes(nivel)) throw N.err('classe', 'Classe desconhecida.', 400);
  const cl = nome + ' · ' + nivel; await perfil(c.eu, c.nome); await mudar(P(c.eu), null, p => { if (!p) return false; p.classe = cl; });
  await mudar(PTS, {}, T => { if (!T[c.eu]) return false; T[c.eu].cl = cl; }).catch(() => { }); return { classe: cl }; };
const PARC = 'cfg/parceiro.json', PARC0 = 'PHANTOM'; // v3.73: a empresa parceira dos Animes
const parceiro = async () => { try { const g = await N.store().get(PARC); return g ? JSON.parse(g.buf.toString()) : { nome: PARC0 }; } catch (e) { return { nome: PARC0 }; } };
OPS.adminParceiro = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const nome = String(b.nome || '').replace(/\s+/g, ' ').trim().slice(0, 30) || PARC0, site = String(b.site || '').trim().slice(0, 200);
  if (site && !/^https:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(site)) throw N.err('admin', 'O site tem de começar por https://', 400);
  const o = { nome, site, at: Date.now() }; await N.store().put(PARC, Buffer.from(JSON.stringify(o))); return { parceiro: o }; };
module.exports = N.handler(async (req, res) => {
  // o nome do parceiro (público, para o app o mostrar antes de entrar na conta)
  if (req.method === 'GET' && String((req.query || {}).op || '') === 'img') { const q = req.query || {}, k = q.k === 'fu' ? 'fu' : 'av', id = String(q.id || ''); if (!ID.test(id) || N.limit(req, 'simg', 300, 60e3)) return N.send(res, 400, { ok: false });
    const g = await N.store().get(imgP(k, id)).catch(() => null); if (!g) return N.send(res, 404, { ok: false }); res.statusCode = 200; res.setHeader('content-type', 'image/jpeg'); res.setHeader('cache-control', 'public, max-age=86400'); res.setHeader('x-content-type-options', 'nosniff'); return res.end(g.buf); }
  if (req.method === 'GET' && String((req.query || {}).op || '') === 'parceiro') { if (N.limit(req, 'parc', 60, 60e3)) return N.send(res, 429, { ok: false }); res.setHeader('cache-control', 'public, max-age=300'); const o = await parceiro();
    // v3.78: os números da parceria ao vivo (só contagens, sem nomes), guardados 10 minutos
    let n; if ((req.query || {}).n) { try { n = await numeros(); } catch (e) { } }
    return N.send(res, 200, Object.assign({ ok: true, nome: o.nome || '', site: o.site || '' }, n ? { n } : {})); }
  if (req.method !== 'POST') return N.send(res, 405, { ok: false, msg: 'Só POST.' });
  const t = await N.readToken(req); if (!t) return N.send(res, 401, { ok: false, msg: 'Entra na tua conta para usar os clãs.', code: 'sessao' });
  const b = await N.body(req), op = String(b.op || ''), pid = String(b.p || ''); if (!PID.test(pid)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  if (!Object.prototype.hasOwnProperty.call(OPS, op)) return N.send(res, 400, { ok: false, msg: 'Pedido desconhecido.' });
  if (N.limit(req, 'social|' + t.u, 240, 60e3)) return N.send(res, 429, { ok: false, msg: 'Demasiados pedidos. Espera um pouco.' });
  const c = await conta(t, pid); c.eu = t.u + '-' + pid; if (!ID.test(c.eu)) return N.send(res, 400, { ok: false, msg: 'Perfil inválido.' });
  return N.send(res, 200, Object.assign({ ok: true }, await OPS[op](c, b, req)));
});
module.exports._regras = regras; module.exports._lisboa = lisboa; module.exports._semana = semana;
