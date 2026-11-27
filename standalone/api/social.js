// PRUMO · Clãs, amigos e conversas + ranking de animes e o jogo Pursuit (função do Vercel, v3.73).
// Cada pessoa é um perfil (conta + perfil). Amigos por código (PR-XXXXXX); clãs com código de convite; conversas no clã e a dois (só entre amigos).
// Antes de aparecer, cada mensagem passa pelas regras (sem links, contactos pessoais nem palavras ofensivas) e pela IA, que barra insultos,
// assédio, ódio, ameaças, conteúdo sexual, burlas e pedidos de dados pessoais. Quem tiver 3 mensagens barradas numa hora fica 1 hora sem escrever.
// Denunciar e bloquear; a administração vê as denúncias. Tudo cifrado no armazenamento (AES-256-GCM).
// Ranking de animes: pontos ganhos nos jogos. PURSUIT: todos os dias às 20h (hora de Lisboa) há pistas de um anime ao calhas; marca-se "Pursuit"
// na página do anime que se acha que é (uma vez por dia); às 22h fecha e quem acertou ganha pontos pela ordem (1.º 100, 2.º 90… mínimo 10).
'use strict';
const N = require('./_nuvem'), PL = require('./_planos'), GIF = require('./_gif'), PNGS = require('./_png');
const ALS = new (require('async_hooks').AsyncLocalStorage)();   // v3.93: os Selos ganhos num pedido voltam na resposta
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
const conta = async (t, pid) => { const k = t.u + '|' + t.v + '|' + pid, c = OKS.get(k); if (c && Date.now() - c.at < 15e3) return c;   // v3.93: 15 s (o nome e o plano novos chegam depressa aos clãs)
  const g = await N.store().get('a/' + t.a); let r = null; try { r = g && N.open(await N.accKey(), g.buf); } catch (e) { }
  if (!r || r.uid !== t.u || (r.tv || 1) !== t.v) throw N.err('sessao', 'A sessão terminou. Entra outra vez.', 401);
  const pf = (r.perfis || []).find(x => x.id === pid); if (!pf) throw N.err('perfil', 'Este perfil já não existe.', 404);
  await N.gate(r.email); const e = PL.efetivo(r), o = { at: Date.now(), email: r.email, nome: String(pf.nome || 'Pessoa').slice(0, 24), adm: N.isAdminEmail(r.email), teste: N.isTeste(r.email), uid: r.uid, lvl: e.lvl || 0, plano: e.n || '', pago: !!(e.pago || e.admin || e.contaTeste) }; OKS.set(k, o); if (OKS.size > 3000) OKS.delete(OKS.keys().next().value); return o; };
const P = id => 'so/p/' + id;
// v3.93: o nome (do perfil Prumo) e o plano vão para todo o lado: perfil social, membros dos clãs e ranking dos animes.
// Corre no máximo uma vez por perfil e por nome/plano (em memória), sem ler nada nos pedidos seguintes.
const SINC = new Map();
const PLN = c => ({ n: c.adm ? 'Administração' : c.lvl >= 1 ? (c.plano || ['', 'Essencial', 'Avançado', 'Completo'][c.lvl] || 'Pago') : 'Grátis', lvl: c.adm ? 9 : c.lvl || 0 });
const sincPerfil = async c => { const pl = PLN(c), k = c.nome + '|' + pl.n; if (SINC.get(c.eu) === k) return;
  let mudouNome = false, v = null, existe = false;
  await mudar(P(c.eu), null, p => { if (!p) return false; existe = true; const pn = !p.pl || p.pl.n !== pl.n || p.pl.lvl !== pl.lvl; mudouNome = !!(c.nome && p.nome !== c.nome); if (!pn && !mudouNome) return false; if (mudouNome) p.nome = c.nome; p.pl = pl; v = p; }).catch(() => { });
  // só fica marcado como feito quando o perfil social já existe (senão, o primeiro pedido que o cria volta a tentar)
  if (existe) { SINC.set(c.eu, k); if (SINC.size > 5000) SINC.delete(SINC.keys().next().value); }
  if (mudouNome && v) await nomeEmTodo(c.eu, c.nome, v).catch(() => { }); };
const nomeEmTodo = async (eu, nome, v) => { for (const cid of (v.clas || [])) { const cl = await mudar(CL(cid), null, o => { if (!o) return false; const m = (o.membros || []).find(x => x.id === eu); if (!m || m.nome === nome) return false; m.nome = nome; if (o.dono === eu) o.donoNome = nome; }).catch(() => null); if (cl && typeof idxPor === 'function') await idxPor(cl).catch(() => { }); }
  if (v.user || v.av) await pubPts(eu, { nome }).catch(() => { }); };
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
const claPub = c => ({ id: c.id, nome: c.nome, desc: c.desc, cor: c.cor, cod: c.cod, foto: c.foto || 0, vit: c.vit || 0, der: c.der || 0, vagas: vagas(c), n: c.membros.length, membros: c.membros.map(m => ({ id: m.id, nome: m.nome, papel: m.papel })) });
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
// v3.93: as 5 pistas, da mais difícil para a mais fácil, em português (os géneros e temas vêm em inglês das bases e são traduzidos)
const GEN_PT = { Action: 'Ação', Adventure: 'Aventura', 'Avant Garde': 'Vanguarda', 'Award Winning': 'Premiado', Comedy: 'Comédia', Drama: 'Drama', Fantasy: 'Fantasia', Gourmet: 'Gastronomia', Horror: 'Terror', Mystery: 'Mistério', Romance: 'Romance',
  'Sci-Fi': 'Ficção científica', 'Slice of Life': 'Quotidiano', Sports: 'Desporto', Supernatural: 'Sobrenatural', Suspense: 'Suspense', Thriller: 'Suspense', Psychological: 'Psicológico', 'Mahou Shoujo': 'Raparigas mágicas', Mecha: 'Robôs gigantes', Music: 'Música',
  'Boys Love': 'Boys love', 'Girls Love': 'Girls love', 'Adult Cast': 'elenco adulto', Anthropomorphic: 'animais com traços humanos', CGDCT: 'raparigas fofas no dia a dia', Childcare: 'cuidar de crianças', 'Combat Sports': 'desportos de combate', Delinquents: 'delinquentes',
  Detective: 'detetives', Educational: 'educativo', 'Gag Humor': 'humor absurdo', Gore: 'violência explícita', Harem: 'harém', 'High Stakes Game': 'jogos de alto risco', Historical: 'histórico', 'Idols (Female)': 'idols', 'Idols (Male)': 'idols', Isekai: 'outro mundo (isekai)',
  Iyashikei: 'calmo e reconfortante', 'Love Polygon': 'triângulo amoroso', 'Love Status Quo': 'romance que não avança', 'Magical Sex Shift': 'troca de corpo mágica', 'Martial Arts': 'artes marciais', Medical: 'medicina', Military: 'militar', Mythology: 'mitologia',
  'Organized Crime': 'crime organizado', 'Otaku Culture': 'cultura otaku', Parody: 'paródia', 'Performing Arts': 'artes de palco', Pets: 'animais de estimação', Racing: 'corridas', Reincarnation: 'reencarnação', 'Reverse Harem': 'harém invertido', Samurai: 'samurais',
  School: 'escola', Showbiz: 'mundo do espetáculo', Space: 'espaço', 'Strategy Game': 'jogos de estratégia', 'Super Power': 'superpoderes', Survival: 'sobrevivência', 'Team Sports': 'desportos de equipa', 'Time Travel': 'viagens no tempo', Vampire: 'vampiros',
  'Video Game': 'videojogos', Villainess: 'vilã', 'Visual Arts': 'artes visuais', Workplace: 'mundo do trabalho', 'Urban Fantasy': 'fantasia urbana', Magic: 'magia', Demons: 'demónios', 'Female Protagonist': 'protagonista feminina', 'Male Protagonist': 'protagonista masculino',
  Shounen: 'shounen (rapazes adolescentes)', Shoujo: 'shoujo (raparigas adolescentes)', Seinen: 'seinen (adultos)', Josei: 'josei (mulheres adultas)', Kids: 'infantil' };
const ptG = x => GEN_PT[x] || x;
const listaPT = L => L.length <= 1 ? L.join('') : L.slice(0, -1).join(', ') + ' e ' + L[L.length - 1];
const FONTE_PT = { Manga: 'de um mangá', 'Light novel': 'de uma light novel', Novel: 'de um romance', Original: 'de nenhuma obra: é uma história original', 'Web manga': 'de um mangá online', 'Web novel': 'de um romance online', 'Visual novel': 'de uma visual novel', Game: 'de um jogo', '4-koma manga': 'de um mangá de 4 vinhetas' };
const H_PISTAS = [0, 0, 35, 70, 105];   // minutos depois de abrir: 2 às 20:00, a 3.ª às 20:35, a 4.ª às 21:10, a 5.ª às 21:45 (às 22:00 revela-se o anime)
const pistasDe = (a, pers) => { const P0 = [], ger = (a.genres || []).map(g => ptG(g.name)).slice(0, 3), tem = (a.themes || []).map(g => ptG(g.name)).slice(0, 2), dem = (a.demographics || []).map(g => ptG(g.name))[0], est = (a.studios || []).map(s => s.name)[0];
  const tt = String(a.title || '').trim(), w = tt ? tt.split(/\s+/).length : 0;
  // 1: só os géneros
  P0.push(ger.length ? 'Géneros: ' + listaPT(ger) + '.' : 'É um anime que mistura vários géneros.');
  // 2: de onde vem e a década
  P0.push(`É adaptado ${FONTE_PT[a.source] || 'de ' + (a.source || 'outra obra')}${a.year ? ' e estreou nos anos ' + (Math.floor(a.year / 10) * 10) : ''}.`);
  // 3: os temas e o público
  P0.push(tem.length || dem ? [tem.length ? 'Temas: ' + listaPT(tem) : '', dem ? 'público: ' + dem : ''].filter(Boolean).join('; ').replace(/^./, c => c.toUpperCase()) + '.' : `É ${a.type === 'Movie' ? 'um filme' : 'uma série'} de animação japonesa.`);
  // 4: o estúdio, o formato e os episódios
  P0.push(`${a.type === 'Movie' ? 'É um filme' : 'É uma série'}${a.episodes && a.type !== 'Movie' ? ' com ' + a.episodes + ' episódios' : ''}${est ? ', feita pelo estúdio ' + est : ''}.`);
  // 5: a temporada e o ano, e uma personagem principal (só o nome próprio e a inicial do apelido)
  const p5 = []; if (a.year) p5.push('Estreou ' + (ESTACAO[a.season] || 'em') + ' de ' + a.year + '.');
  if (pers) p5.push(`Uma das personagens principais chama-se ${pers}${/\.$/.test(pers) ? '' : '.'}`); else if (w) p5.push(`O título (em japonês romanizado) tem ${w} palavra${w === 1 ? '' : 's'}.`);
  P0.push(p5.join(' ') || 'Saiu há mais de uma década.');
  return P0; };
// a personagem principal: "Higashikata, Josuke" → "Josuke H."
const persDe = nome => { const s = String(nome || '').trim(); if (!s) return ''; const [ap, pr] = s.includes(',') ? s.split(',').map(x => x.trim()) : [s.split(/\s+/).slice(1).join(' '), s.split(/\s+/)[0]];
  return pr ? pr + (ap ? ' ' + ap[0].toUpperCase() + '.' : '') : (ap || ''); };
// v3.78: quando o MyAnimeList (Jikan) não responde, o AniList dá a mesma informação (pelos números do MyAnimeList)
const ALQ = () => process.env.NAUTILO_ANILIST || 'https://graphql.anilist.co';
const al = async (query, variables) => { const r = await fetch(ALQ(), { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error('AniList ' + r.status); const j = await r.json(); if (j.errors && !j.data) throw new Error('AniList'); return j.data || {}; };
const ALFONTE = { MANGA: 'Manga', LIGHT_NOVEL: 'Light novel', NOVEL: 'Novel', ORIGINAL: 'Original', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Game', WEB_NOVEL: 'Web novel', DOUJINSHI: 'Doujinshi', ANIME: 'Anime', MULTIMEDIA_PROJECT: 'Original' };
const alTop = async () => { const L = []; for (let pg = 1; pg <= 4; pg++) { const d = await al('query($p:Int){Page(page:$p,perPage:50){media(type:ANIME,sort:POPULARITY_DESC,isAdult:false){idMal genres}}}', { p: pg });
    ((d.Page || {}).media || []).forEach(m => { if (m.idMal && !(m.genres || []).includes('Ecchi') && !(m.genres || []).includes('Hentai')) L.push(m.idMal); }); } return L; };
const alFicha = async mal => { const m = ((await al('query($m:Int){Media(idMal:$m,type:ANIME){idMal title{romaji english} format episodes season seasonYear source genres tags{name rank isMediaSpoiler} studios(isMain:true){nodes{name}} coverImage{extraLarge large} characters(role:MAIN,perPage:2){nodes{name{first last}}}}}', { m: +mal })) || {}).Media;
  if (!m || !m.idMal) return {};
  return { mal_id: m.idMal, title: (m.title || {}).romaji || (m.title || {}).english || '', title_english: (m.title || {}).english || '', type: m.format === 'MOVIE' ? 'Movie' : 'TV', episodes: m.episodes || 0, year: m.seasonYear || 0, season: String(m.season || '').toLowerCase(),
    source: ALFONTE[m.source] || '', genres: (m.genres || []).map(name => ({ name })), themes: (m.tags || []).filter(t => !t.isMediaSpoiler && t.rank >= 70).slice(0, 2).map(t => ({ name: t.name })), demographics: [], studios: (((m.studios || {}).nodes) || []).map(x => ({ name: x.name })),
    images: { webp: { large_image_url: (m.coverImage || {}).extraLarge || (m.coverImage || {}).large || '' } }, _pers: ((((m.characters || {}).nodes) || [])[0] || {}).name || null }; };
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
    let pers = ''; if (a._pers) pers = persDe([a._pers.last, a._pers.first].filter(Boolean).join(', '));
    else { try { const ch = (((await jk('anime/' + a.mal_id + '/characters')) || {}).data || []).find(x => x && x.role === 'Main' && x.character && x.character.name); if (ch) pers = persDe(ch.character.name); } catch (e) { } }
    // a personagem não pode trazer palavras do título (seria dar a resposta)
    const tw = String((a.title_english || '') + ' ' + (a.title || '')).toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 3); if (pers && tw.some(x => pers.toLowerCase().includes(x))) pers = '';
    v = { dia: d, mal: String(a.mal_id), titulo: a.title_english || a.title, img: ((a.images || {}).webp || {}).large_image_url || ((a.images || {}).jpg || {}).image_url || '', pistas: pistasDe(a, pers), fechado: false };
    try { await gravar(P0, v, { overwrite: false }); await mudar('so/hhist', { L: [] }, o => { o.L = (o.L || []).concat(+v.mal).slice(-60); }); } catch (e) { v = (await ler(P0, v)).v; } }
  if (v && !v.fechado && L.min >= H_FECHA()) v = await fechar(P0, v);
  return { L, v }; };
const fechar = async (P0, v0) => { const L = await N.store().list('so/hg/' + v0.dia + '/'), G = [];
  for (const b of L) { const g = (await ler(b.pathname, null)).v; if (g) G.push(g); }
  const certos = G.filter(g => g.mal === v0.mal).sort((a, b) => a.at - b.at), res = certos.map((g, i) => ({ id: g.id, nome: g.nome, user: g.user || '', av: g.av || 0, at: g.at, pts: Math.max(10, 100 - 10 * i) }));
  let ganhei = false; const v = await mudar(P0, v0, o => { if (o.fechado) return false; o.fechado = true; o.res = res.slice(0, 100); o.total = G.length; ganhei = true; });
  if (ganhei && res.length) { await somaPts(res.map(r => [r.id, r.nome, r.pts, { user: r.user, av: r.av }]));
    await darVarios(res.slice(0, 3).map((r, i) => [r.id, { k: 'hu' + (i + 1) + ':' + v0.dia, n: i ? (i + 1) + '.º a acertar no Pursuit' : 'Primeiro a acertar no Pursuit', d: (v0.titulo || 'Anime do dia') + ' · ' + v0.dia.split('-').reverse().join('/'), kind: 'Medalha', lvl: LUG[i], cat: 'Pursuit', lugar: i + 1 }])).catch(() => { }); }
  return v; };
const hunterVer = async (eu) => { const { L, v } = await desafio(), abre = H_ABRE(), fecha = H_FECHA(), m = L.min;
  const fase = !v ? 'espera' : v.fechado ? 'fechado' : 'aberto', meu = v && eu ? (await ler('so/hg/' + v.dia + '/' + eu, null)).v : null;
  const visiveis = !v ? [] : v.fechado ? v.pistas : v.pistas.slice(0, Math.max(2, H_PISTAS.filter(x => m >= abre + x).length));
  const ontem = fase === 'espera' ? (await ler('so/h/' + lisboa(Date.now() - 864e5).d, null)).v : null;
  const min0 = Math.floor(Date.now() / 6e4) * 6e4, depois = !v && m >= fecha ? 864e5 : 0, abreAt = min0 - (m - abre) * 6e4 + depois, fechaAt = min0 - (m - fecha) * 6e4 + depois;   // depois das 22h sem jogo: o de amanhã
  return { fase, dia: L.d, abre, fecha, agora: m, abreAt, fechaAt, amanha: abreAt + 864e5, ts: Date.now(), pistas: visiveis, quando: H_PISTAS.map(x => abreAt + x * 6e4), total: v ? v.pistas.length : 5, meu: meu ? { mal: meu.mal, titulo: meu.titulo, at: meu.at, certo: v && v.fechado ? meu.mal === v.mal : undefined } : null,
    resposta: v && v.fechado ? { mal: v.mal, titulo: v.titulo, img: v.img } : null, res: v && v.fechado ? (v.res || []).slice(0, 30) : null, jogadores: v && v.fechado ? v.total : undefined,
    ontem: ontem && ontem.fechado ? { titulo: ontem.titulo, img: ontem.img, res: (ontem.res || []).slice(0, 5) } : null }; };
/* ---------- pedidos ---------- */
const OPS = {
  async eu(c, b) { const v = await perfil(c.eu, c.nome), amigos = await Promise.all((v.amigos || []).map(pub)), pedidos = await Promise.all((v.pedidos || []).map(pub)), clas = [];
    for (const cid of v.clas || []) { const cl = (await ler(CL(cid), null)).v; if (cl) clas.push(Object.assign(claPub(cl), gerente(cl, c.eu) ? { ped: (cl.pedidos || []).length, conv: (cl.convites || []).length } : {}, { gw: cl.guerra ? 1 : 0 })); }
    const claPed = []; for (const cid of (v.claPed || []).slice(-10)) { const cl = (await ler(CL(cid), null)).v; if (cl && (cl.pedidos || []).some(x => x.id === c.eu)) claPed.push({ id: cid, nome: cl.nome, cor: cl.cor, foto: cl.foto || 0 }); }
    if (c.nome && v.nome !== c.nome) { v.nome = c.nome; await mudar(P(c.eu), null, p => { p.nome = c.nome; }).catch(() => { }); await nomeEmTodo(c.eu, c.nome, v).catch(() => { }); }
    const T = (await ler(PTS, {})).v || {}; return { eu: { id: v.id, nome: v.nome, cod: v.cod, user: v.user || '', av: v.av || 0, fu: v.fu || 0, cl: v.classe || '', pl: PLN(c), pts: (T[v.id] || {}).p || 0, mudo: v.mudo && v.mudo > Date.now() ? v.mudo : 0 }, amigos, pedidos, enviados: v.enviados || [], bloq: v.bloq || [], clas, claPed }; },
  async nome(c, b) { const n = String(b.nome || '').replace(/\s+/g, ' ').trim(); if (n.length < 2 || n.length > 24) throw N.err('nome', 'O nome tem de ter entre 2 e 24 letras.', 400);
    const m = await moderar(n); if (!m.ok) throw N.err('nome', 'Esse nome não pode ser usado: ' + m.motivo, 400); await perfil(c.eu, c.nome); const v2 = await mudar(P(c.eu), null, v => { v.nome = n; }); await nomeEmTodo(c.eu, n, v2).catch(() => { }); return { ok2: true, nome: n }; },
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
    const v = await perfil(c.eu, c.nome); if ((v.clas || []).length >= CLA_MAX) throw N.err('cla', 'Já estás num clã. Sai dele primeiro para criares outro.', 400);
    const cid = N.crypto.randomBytes(5).toString('hex'); let cod = ''; for (let i = 0; i < 5 && !cod; i++) { const x = COD(); try { await N.store().put('so/cc/' + x, Buffer.from(JSON.stringify({ cid })), { overwrite: false }); cod = x; } catch (e) { } }
    const cl = { id: cid, nome, desc, cor, cod, dono: c.eu, membros: [{ id: c.eu, nome: v.nome, papel: 'dono', desde: Date.now() }], criado: Date.now() }; await gravar(CL(cid), cl, { overwrite: false });
    await mudar(P(c.eu), null, p => { p.clas = [...new Set((p.clas || []).concat(cid))]; }); await idxPor(cl).catch(() => { }); return { cla: claPub(cl) }; },
  // v3.89: ninguém entra num clã sozinho: o código (ou a pesquisa) só envia um pedido, que o dono ou um moderador aceita
  async claEntrar(c, b) { const cod = String(b.cod || '').toUpperCase().replace(/^CL-?/, '').replace(/[^A-Z0-9]/g, ''); const g = await N.store().get('so/cc/' + cod).catch(() => null); if (!g) throw N.err('cla', 'Não encontrei nenhum clã com esse código.', 404);
    return pedirEntrar(c, JSON.parse(g.buf.toString()).cid); },
  async claSair(c, b) { const cid = String(b.id || ''); if (!CID.test(cid)) throw N.err('cla', 'Clã desconhecido.', 400);
    await mudar(CL(cid), null, o => { o.membros = o.membros.filter(m => m.id !== c.eu); if (o.dono === c.eu && o.membros.length) { o.dono = o.membros[0].id; o.membros[0].papel = 'dono'; } });
    await mudar(P(c.eu), null, p => { p.clas = (p.clas || []).filter(x => x !== cid); }); await idxDe(cid); return { ok2: true }; },
  async claTirar(c, b) { const cid = String(b.id || ''), quem = String(b.membro || ''); if (!CID.test(cid) || !ID.test(quem)) throw N.err('cla', 'Pedido desconhecido.', 400);
    await mudar(CL(cid), null, o => { const eu = o.membros.find(m => m.id === c.eu); if (!eu || !['dono', 'mod'].includes(eu.papel) || quem === o.dono) throw N.err('cla', 'Só quem gere o clã pode tirar pessoas.', 403); o.membros = o.membros.filter(m => m.id !== quem); o.banidos = [...new Set((o.banidos || []).concat(quem))]; });
    await mudar(P(quem), null, p => { p.clas = (p.clas || []).filter(x => x !== cid); }).catch(() => { }); await idxDe(cid); return { ok2: true }; },
  async claVer(c, b) { const cid = String(b.id || ''); const cl = CID.test(cid) && (await ler(CL(cid), null)).v; if (!cl || !cl.membros.some(m => m.id === c.eu)) throw N.err('cla', 'Não és membro deste clã.', 403);
    const T = (await ler(PTS, {})).v || {}, r = claPub(cl); r.membros = r.membros.map(m => Object.assign(m, { pts: (T[m.id] || {}).p || 0, user: (T[m.id] || {}).user || '', av: (T[m.id] || {}).av || 0 })).sort((a, b2) => b2.pts - a.pts); r.pts = r.membros.reduce((s, m) => s + m.pts, 0); return { cla: Object.assign(r, await claExtra(c, cl, T)) }; },
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
  async rankAnime(c, b) { await mesFechar().catch(() => { }); const T = (await ler(PTS, {})).v || {}, L = Object.entries(T).filter(([, o]) => o.p > 0).map(([id, o]) => ({ id, nome: o.nome, p: o.p, user: o.user || '', av: o.av || 0, cl: o.cl || '' })).sort((a, b2) => b2.p - a.p); const i = L.findIndex(x => x.id === c.eu);
    return { lista: L.slice(0, 100).map((x, k) => Object.assign(x, { pos: k + 1, eu: x.id === c.eu })), eu: i >= 0 ? Object.assign({ pos: i + 1 }, L[i]) : null, total: L.length }; },
  async hunter(c, b) { return { hunter: await hunterVer(c.eu) }; },
  async hunterMarcar(c, b) { const { L, v } = await desafio(); if (!v || v.fechado) throw N.err('hunter', v ? 'O Pursuit de hoje já fechou.' : 'O Pursuit de hoje ainda não começou (20h).', 400);
    const mal = String(b.mal || '').replace(/\D/g, ''); if (!mal) throw N.err('hunter', 'Anime desconhecido.', 400); const v0 = await perfil(c.eu, c.nome);
    try { await gravar('so/hg/' + v.dia + '/' + c.eu, { id: c.eu, nome: v0.nome, user: v0.user || '', av: v0.av || 0, mal, titulo: String(b.titulo || '').slice(0, 120), at: Date.now() }, { overwrite: false }); } catch (e) { if (e.code === 'exists' || e.status === 409 || /exist|precondition/i.test(e.message || '')) throw N.err('hunter', 'Já marcaste o teu Pursuit de hoje.', 409); throw e; }
    return { ok2: true, hunter: await hunterVer(c.eu) }; } };
/* ---------- v3.89 · clãs: pedidos para entrar, foto, pesquisa, ranking de clãs e guerra de clãs ---------- */
const IDX = 'so/clidx.json', GW = wid => 'so/gw/' + wid, WID = /^[a-f0-9]{10}$/, DIA = 864e5;
const CLA_MAX = 1;   // v3.93: cada pessoa está num clã de cada vez (para entrar ou criar outro, sai primeiro)
const gerente = (cl, eu) => { const m = (cl.membros || []).find(x => x.id === eu); return !!m && ['dono', 'mod'].includes(m.papel); };
const idxPor = async cl => { await idxLer(); return mudar(IDX, {}, X => { X[cl.id] = { nome: cl.nome, desc: cl.desc || '', cor: cl.cor, foto: cl.foto || 0, vit: cl.vit || 0, m: cl.membros.map(x => x.id) }; }); };
const idxDe = async cid => { try { const cl = (await ler(CL(cid), null)).v; if (cl && cl.membros.length) await idxPor(cl); else await mudar(IDX, {}, X => { if (!X[cid]) return false; delete X[cid]; }); } catch (e) { } };
// o índice (para pesquisar) faz-se sozinho a primeira vez, com os clãs que já existiam
const idxLer = async () => { let X = (await ler(IDX, null)).v; if (X) return X; X = {}; try { const L = (await N.store().list('so/cl/')).slice(0, 800); for (const it of L) { const cl = (await ler(it.pathname, null)).v; if (cl && cl.membros && cl.membros.length) X[cl.id] = { nome: cl.nome, desc: cl.desc || '', cor: cl.cor, foto: cl.foto || 0, vit: cl.vit || 0, m: cl.membros.map(x => x.id) }; } } catch (e) { } await gravar(IDX, X).catch(() => { }); return X; };
const somaCla = (e, T) => (e.m || []).reduce((t, id) => t + ((T[id] || {}).p || 0), 0);
const pedirEntrar = async (c, cid) => { if (!CID.test(cid)) throw N.err('cla', 'Clã desconhecido.', 400); const v = await perfil(c.eu, c.nome);
  if ((v.clas || []).includes(cid)) throw N.err('cla', 'Já estás neste clã.', 400); if ((v.clas || []).length >= CLA_MAX) throw N.err('cla', 'Já estás num clã. Sai dele primeiro para pedires para entrar noutro.', 400);
  const cl = await mudar(CL(cid), null, o => { if (!o) throw N.err('cla', 'Clã desconhecido.', 404); if (o.membros.some(m => m.id === c.eu)) return false; if ((o.banidos || []).includes(c.eu)) throw N.err('cla', 'Não podes entrar neste clã.', 403);
    if (o.membros.length >= vagas(o)) throw N.err('cla', 'Este clã está cheio (' + vagas(o) + ' vagas). Quem é do clã pode comprar mais vagas com Selos.', 400); o.pedidos = (o.pedidos || []).filter(x => x.id !== c.eu); if (o.pedidos.length >= 60) throw N.err('cla', 'Este clã tem muitos pedidos à espera. Tenta mais tarde.', 429);
    o.pedidos.push({ id: c.eu, nome: v.nome, user: v.user || '', av: v.av || 0, at: Date.now() }); });
  await mudar(P(c.eu), null, p => { if (!p) return false; p.claPed = [...new Set((p.claPed || []).concat(cid))].slice(-20); }).catch(() => { });
  return { pedido: true, cla: { id: cl.id, nome: cl.nome, cor: cl.cor, foto: cl.foto || 0 } }; };
OPS.claPedir = async (c, b) => pedirEntrar(c, String(b.id || ''));
OPS.claCancelar = async (c, b) => { const cid = String(b.id || ''); if (!CID.test(cid)) throw N.err('cla', 'Clã desconhecido.', 400);
  await mudar(CL(cid), null, o => { if (!o || !(o.pedidos || []).some(x => x.id === c.eu)) return false; o.pedidos = o.pedidos.filter(x => x.id !== c.eu); }); await mudar(P(c.eu), null, p => { if (!p) return false; p.claPed = (p.claPed || []).filter(x => x !== cid); }); return { ok2: true }; };
// o dono ou um moderador aceita ou recusa cada pedido
OPS.claResponder = async (c, b) => { const cid = String(b.id || ''), quem = String(b.quem || ''), sim = !!b.sim; if (!CID.test(cid) || !ID.test(quem)) throw N.err('cla', 'Pedido desconhecido.', 400);
  const pv = (await ler(P(quem), null)).v; let cheio5 = sim && pv && (pv.clas || []).length >= CLA_MAX && !(pv.clas || []).includes(cid);
  const cl = await mudar(CL(cid), null, o => { if (!o || !gerente(o, c.eu)) throw N.err('cla', 'Só quem gere o clã pode responder aos pedidos.', 403); const pd = (o.pedidos || []).find(x => x.id === quem); if (!pd) return false;
    o.pedidos = o.pedidos.filter(x => x.id !== quem); if (sim && !cheio5) { if (o.membros.length >= vagas(o)) throw N.err('cla', 'O clã está cheio (' + vagas(o) + ' vagas). Reforça o clã com Selos para aceitar mais pessoas.', 400); if (!o.membros.some(m => m.id === quem)) o.membros.push({ id: quem, nome: pd.nome, papel: 'membro', desde: Date.now() }); } });
  await mudar(P(quem), null, p => { if (!p) return false; p.claPed = (p.claPed || []).filter(x => x !== cid); if (sim && !cheio5) p.clas = [...new Set((p.clas || []).concat(cid))]; }).catch(() => { });
  // v3.93: quem entrou num clã deixa de ter pedidos à espera nos outros
  if (sim && !cheio5 && pv) for (const x of (pv.claPed || []).filter(x => x !== cid)) { await mudar(CL(x), null, o => { if (!o || !(o.pedidos || []).some(y => y.id === quem)) return false; o.pedidos = o.pedidos.filter(y => y.id !== quem); }).catch(() => { }); await mudar(P(quem), null, p => { if (!p) return false; p.claPed = (p.claPed || []).filter(y => y !== x); }).catch(() => { }); }
  if (cl) await idxPor(cl).catch(() => { }); if (cheio5) throw N.err('cla', 'Esta pessoa já entrou noutro clã. O pedido foi retirado.', 400); return { ok2: true, entrou: sim }; };
OPS.claMod = async (c, b) => { const cid = String(b.id || ''), quem = String(b.quem || ''); if (!CID.test(cid) || !ID.test(quem)) throw N.err('cla', 'Pedido desconhecido.', 400);
  await mudar(CL(cid), null, o => { if (!o || o.dono !== c.eu) throw N.err('cla', 'Só o dono escolhe os moderadores.', 403); const m = o.membros.find(x => x.id === quem); if (!m || m.papel === 'dono') return false; m.papel = m.papel === 'mod' ? 'membro' : 'mod'; }); return { ok2: true }; };
// a foto do clã (dono ou moderador); a IA verifica sempre antes de entrar
OPS.claFoto = async (c, b) => { const cid = String(b.id || ''); if (!CID.test(cid)) throw N.err('cla', 'Clã desconhecido.', 400); const cl0 = (await ler(CL(cid), null)).v; if (!cl0 || !gerente(cl0, c.eu)) throw N.err('cla', 'Só quem gere o clã pode mudar a foto.', 403);
  if (b.apagar) { await N.store().del([imgP('cla', cid)]).catch(() => { }); const cl = await mudar(CL(cid), null, o => { o.foto = 0; }); await idxPor(cl).catch(() => { }); return { foto: 0 }; }
  const s64 = String(b.b64 || ''); if (!/^[A-Za-z0-9+/=]{400,}$/.test(s64) || s64.length > 140e3 * 1.37) throw N.err('img', 'A imagem é grande demais ou não é válida.', 400);
  const buf = Buffer.from(s64, 'base64'); if (buf[0] !== 0xFF || buf[1] !== 0xD8) throw N.err('img', 'Envia uma imagem (JPEG).', 400); await verImg(s64);
  await N.store().put(imgP('cla', cid), buf); const ver = Date.now(), cl = await mudar(CL(cid), null, o => { o.foto = ver; }); await idxPor(cl).catch(() => { }); return { foto: ver }; };
// procurar clãs (pelo nome ou pela descrição); sem texto, os maiores e mais fortes
OPS.claBuscar = async (c, b) => { const q = norm(String(b.q || '').trim()).slice(0, 40), X = await idxLer(), T = (await ler(PTS, {})).v || {}, v = await perfil(c.eu, c.nome);
  const L = Object.entries(X).filter(([, e]) => !q || norm(e.nome + ' ' + e.desc).includes(q)).map(([id, e]) => ({ id, nome: e.nome, desc: e.desc, cor: e.cor, foto: e.foto || 0, vit: e.vit || 0, n: (e.m || []).length, pts: somaCla(e, T), membro: (v.clas || []).includes(id), pedi: (v.claPed || []).includes(id) }))
    .sort((a, b2) => (q ? 0 : b2.pts - a.pts) || b2.n - a.n).slice(0, 40); return { clas: L }; };
OPS.claRanking = async (c, b) => { const X = await idxLer(), T = (await ler(PTS, {})).v || {}, v = await perfil(c.eu, c.nome);
  const L = Object.entries(X).map(([id, e]) => ({ id, nome: e.nome, cor: e.cor, foto: e.foto || 0, vit: e.vit || 0, n: (e.m || []).length, pts: somaCla(e, T), meu: (v.clas || []).includes(id) })).filter(x => x.n).sort((a, b2) => b2.pts - a.pts || b2.vit - a.vit); return { clas: L.slice(0, 50), total: L.length }; };
// guerra de clãs: um clã desafia outro; se aceitar, durante 7 dias contam os pontos que os membros de cada um ganham nos jogos e desafios dos Animes
const pPts = (T, id) => (T[id] || {}).p || 0;
const placar = (w, T) => { const lado = base => Object.entries(base || {}).map(([id, p0]) => ({ id, d: Math.max(0, pPts(T, id) - p0), nome: ((T[id] || {}).nome) || (w.nomes || {})[id] || 'Alguém' })).sort((x, y) => y.d - x.d);
  const A = lado(w.baseA), B = lado(w.baseB), top = L => L.filter(x => x.d > 0).slice(0, 5).map(x => ({ nome: x.nome, pts: x.d }));
  return { sA: A.reduce((t, x) => t + x.d, 0), sB: B.reduce((t, x) => t + x.d, 0), topA: top(A), topB: top(B) }; };
const BONUS_VIT = 50, BONUS_EMP = 20, GDUR = () => +process.env.NAUTILO_GUERRA_SEG > 0 ? +process.env.NAUTILO_GUERRA_SEG * 1000 : 7 * DIA;   // a guerra dura 7 dias (os testes encurtam)
// acaba a guerra quando passa o fim (uma só vez): vitória ou empate, bónus de pontos para quem jogou e o histórico dos dois clãs
const gwFechar = async w => { if (w.estado !== 'ativa' || Date.now() < w.fim) return w; const T = (await ler(PTS, {})).v || {}, pl = placar(w, T); let feito = false;
  const w2 = await mudar(GW(w.id), null, o => { if (!o || o.estado !== 'ativa') return false; o.estado = 'fim'; o.res = { sA: pl.sA, sB: pl.sB, venc: pl.sA > pl.sB ? 'a' : pl.sB > pl.sA ? 'b' : 'empate', topA: pl.topA, topB: pl.topB }; feito = true; });
  if (!feito) return (await ler(GW(w.id), null)).v || w; const r = w2.res;
  for (const [lado, cid] of [['a', w.a], ['b', w.b]]) { const cl = await mudar(CL(cid), null, o => { if (!o) return false; if (o.guerra === w.id) o.guerra = ''; o.hist = [w.id].concat((o.hist || []).filter(x => x !== w.id)).slice(0, 10); if (r.venc === 'empate') o.emp = (o.emp || 0) + 1; else if (r.venc === lado) o.vit = (o.vit || 0) + 1; else o.der = (o.der || 0) + 1; }).catch(() => null); if (cl) await idxPor(cl).catch(() => { }); }
  const premio = r.venc === 'empate' ? BONUS_EMP : BONUS_VIT, quem = r.venc === 'empate' ? Object.keys(w.baseA || {}).concat(Object.keys(w.baseB || {})) : Object.keys((r.venc === 'a' ? w.baseA : w.baseB) || {});
  if (quem.length) await somaPts(quem.map(id => [id, (T[id] || {}).nome || 'Alguém', premio])).catch(() => { });
  // as medalhas da guerra: vitória para o clã que ganhou, MVP para quem mais pontuou nele, empate, e "lutou" para quem pontuou no clã que perdeu
  const delta = base => Object.entries(base || {}).map(([id, p0]) => [id, Math.max(0, pPts(T, id) - p0)]), placarTxt = `${w.nA} ${r.sA} – ${r.sB} ${w.nB}`, M = [];
  if (r.venc === 'empate') delta(w.baseA).concat(delta(w.baseB)).filter(([, d]) => d > 0).forEach(([id]) => M.push([id, { k: 'gwe:' + w.id, n: 'Empate na guerra de clãs', d: placarTxt, kind: 'Medalha', lvl: 'Prata', cat: 'Clãs' }]));
  else { const V = delta(r.venc === 'a' ? w.baseA : w.baseB), Pd = delta(r.venc === 'a' ? w.baseB : w.baseA), mvp = V.slice().sort((x, y) => y[1] - x[1])[0];
    V.forEach(([id]) => M.push([id, { k: 'gwv:' + w.id, n: 'Vitória na guerra de clãs', d: placarTxt, kind: 'Troféu', lvl: 'Ouro', cat: 'Clãs' }]));
    if (mvp && mvp[1] > 0) M.push([mvp[0], { k: 'gwm:' + w.id, n: 'MVP da guerra de clãs', d: placarTxt + ' · ' + mvp[1] + ' pontos', kind: 'Distinção', lvl: 'Platina', cat: 'Clãs' }]);
    Pd.filter(([, d]) => d > 0).forEach(([id]) => M.push([id, { k: 'gwl:' + w.id, n: 'Lutou na guerra de clãs', d: placarTxt, kind: 'Medalha', lvl: 'Participação', cat: 'Clãs' }])); }
  await darVarios(M).catch(() => { }); return w2; };
const gwLer = async wid => { if (!WID.test(String(wid || ''))) return null; let w = (await ler(GW(wid), null)).v; if (!w) return null; if (w.estado === 'proposta' && Date.now() - w.criada > 2 * DIA) w.estado = 'expirou'; return gwFechar(w); };
const gwPub = (w, T, eu, meus) => { const pl = w.estado === 'ativa' ? placar(w, T) : w.res ? { sA: w.res.sA, sB: w.res.sB, topA: w.res.topA || [], topB: w.res.topB || [] } : { sA: 0, sB: 0, topA: [], topB: [] };
  return { id: w.id, estado: w.estado, a: w.a, b: w.b, nA: w.nA, nB: w.nB, cA: w.cA, cB: w.cB, criada: w.criada, ini: w.ini || 0, fim: w.fim || 0, sA: pl.sA, sB: pl.sB, topA: pl.topA, topB: pl.topB, venc: (w.res || {}).venc || '', meu: (meus || []).includes(w.a) ? 'a' : (meus || []).includes(w.b) ? 'b' : '' }; };
const ocupado = async wid => { const w = await gwLer(wid); return !!w && (w.estado === 'ativa' || w.estado === 'proposta'); };
OPS.claDesafiar = async (c, b) => { const cid = String(b.id || ''), alvo = String(b.alvo || ''); if (!CID.test(cid) || !CID.test(alvo) || cid === alvo) throw N.err('guerra', 'Escolhe outro clã para desafiar.', 400);
  const A = (await ler(CL(cid), null)).v, B = (await ler(CL(alvo), null)).v; if (!A || !B) throw N.err('guerra', 'Clã desconhecido.', 404); if (!gerente(A, c.eu)) throw N.err('guerra', 'Só quem gere o clã pode desafiar outro clã.', 403);
  if ((A.aliados || []).some(x => x.id === alvo)) throw N.err('guerra', 'Esse clã é vosso aliado: aliados não entram em guerra entre si.', 400);
  if (A.guerra && await ocupado(A.guerra)) throw N.err('guerra', 'O teu clã já está numa guerra (ou tem um desafio à espera).', 400); if (B.guerra && await ocupado(B.guerra)) throw N.err('guerra', 'Esse clã já está numa guerra.', 400);
  if ((B.convites || []).length >= 5) throw N.err('guerra', 'Esse clã já tem muitos desafios à espera.', 429);
  const wid = N.crypto.randomBytes(5).toString('hex'), w = { id: wid, a: cid, b: alvo, nA: A.nome, nB: B.nome, cA: A.cor, cB: B.cor, estado: 'proposta', criada: Date.now(), por: c.eu };
  await gravar(GW(wid), w, { overwrite: false }); await mudar(CL(cid), null, o => { o.guerra = wid; }); await mudar(CL(alvo), null, o => { o.convites = [...new Set((o.convites || []).concat(wid))].slice(-5); });
  return { guerra: gwPub(w, {}, c.eu, [cid]) }; };
OPS.claGuerraResp = async (c, b) => { const w = await gwLer(String(b.wid || '')); if (!w) throw N.err('guerra', 'Desafio desconhecido.', 404); if (w.estado !== 'proposta') throw N.err('guerra', w.estado === 'expirou' ? 'O desafio expirou (passaram 2 dias).' : 'Este desafio já não está à espera de resposta.', 400);
  const B = (await ler(CL(w.b), null)).v, A = (await ler(CL(w.a), null)).v; if (!B || !gerente(B, c.eu)) throw N.err('guerra', 'Só quem gere o clã desafiado pode responder.', 403);
  if (b.sim) { if (B.guerra && B.guerra !== w.id && await ocupado(B.guerra)) throw N.err('guerra', 'O teu clã já está noutra guerra.', 400); const T = (await ler(PTS, {})).v || {}, base = cl => Object.fromEntries(((cl || {}).membros || []).map(m => [m.id, pPts(T, m.id)]));
    const ini = Date.now(); await mudar(GW(w.id), null, o => { if (o.estado !== 'proposta') return false; o.estado = 'ativa'; o.ini = ini; o.fim = ini + GDUR(); o.baseA = base(A); o.baseB = base(B); o.nomes = Object.fromEntries([].concat((A || {}).membros || [], (B || {}).membros || []).map(m => [m.id, m.nome])); });
    await mudar(CL(w.b), null, o => { o.guerra = w.id; o.convites = (o.convites || []).filter(x => x !== w.id); }); }
  else { await mudar(GW(w.id), null, o => { if (o.estado !== 'proposta') return false; o.estado = 'recusada'; }); await mudar(CL(w.a), null, o => { if (o.guerra === w.id) o.guerra = ''; }); await mudar(CL(w.b), null, o => { o.convites = (o.convites || []).filter(x => x !== w.id); }); }
  const w2 = await gwLer(w.id), v = await perfil(c.eu, c.nome); return { guerra: gwPub(w2, (await ler(PTS, {})).v || {}, c.eu, v.clas || []) }; };
OPS.claGuerra = async (c, b) => { const w = await gwLer(String(b.wid || '')); if (!w) throw N.err('guerra', 'Guerra desconhecida.', 404); const v = await perfil(c.eu, c.nome); if (![w.a, w.b].some(x => (v.clas || []).includes(x))) throw N.err('guerra', 'Só os membros dos dois clãs veem esta guerra.', 403);
  return { guerra: gwPub(w, (await ler(PTS, {})).v || {}, c.eu, v.clas || []) }; };
// o que o ecrã do clã mostra a mais: pedidos (a quem gere), desafios recebidos, a guerra e as últimas guerras
const claExtra = async (c, cl, T) => { const ge = gerente(cl, c.eu), meus = [cl.id], out = { gere: ge, dono: cl.dono === c.eu, emp: cl.emp || 0, pedidos: ge ? (cl.pedidos || []).map(p => ({ id: p.id, nome: p.nome, user: p.user || '', av: p.av || 0, at: p.at })) : [], convites: [], guerra: null, hist: [], extra: cl.extra || 0, ref: (cl.ref || []).slice().sort((x, y) => y.n - x.n).slice(0, 8).map(r => ({ nome: r.nome, n: r.n })) };
  for (const wid of (cl.convites || [])) { const w = await gwLer(wid); if (w && w.estado === 'proposta') out.convites.push(gwPub(w, T, c.eu, meus)); }
  if (cl.guerra) { const w = await gwLer(cl.guerra); if (w && (w.estado === 'ativa' || w.estado === 'proposta' || (w.estado === 'fim' && Date.now() - w.fim < 3 * DIA))) out.guerra = gwPub(w, T, c.eu, meus);
    // se a guerra acabou agora, o clã mudou (vitórias, derrotas, histórico): lê-se outra vez
    if (w && w.estado !== 'ativa' && w.estado !== 'proposta') { const f = (await ler(CL(cl.id), null)).v; if (f) { cl = f; Object.assign(out, { vit: f.vit || 0, der: f.der || 0, emp: f.emp || 0 }); } } }
  for (const wid of (cl.hist || []).slice(0, 5)) { const w = (await ler(GW(wid), null)).v; if (w && w.res) out.hist.push(gwPub(w, T, c.eu, meus)); }
  if (!out.guerra && out.hist[0] && Date.now() - (out.hist[0].fim || 0) < 3 * DIA) out.guerra = out.hist[0];
  Object.assign(out, await aliPub(cl, c)); return out; };
/* ---------- v3.93 · clãs aliados: o dono propõe uma aliança (pelo código do outro clã), o dono do outro aceita. Até ALI_MAX aliados;
   aliados aparecem na página um do outro e não podem entrar em guerra entre si. Qualquer um dos donos desfaz a aliança. ---------- */
const ALI_MAX = 3;
const aliMini = async cid => { const o = (await ler(CL(cid), null)).v; return o ? { id: o.id, nome: o.nome, cor: o.cor, foto: o.foto || 0, n: (o.membros || []).length, vit: o.vit || 0 } : null; };
const aliPub = async (cl, c) => { const dono = cl.dono === c.eu, aliados = (await Promise.all((cl.aliados || []).map(x => aliMini(x.id)))).filter(Boolean).map((x, i) => Object.assign(x, { desde: (cl.aliados[i] || {}).desde || 0 }));
  const recebidos = dono ? (await Promise.all((cl.aliPed || []).map(x => aliMini(x.id)))).filter(Boolean) : [], enviados = dono ? (await Promise.all((cl.aliEnv || []).map(aliMini))).filter(Boolean) : [];
  return { aliados, aliRec: recebidos, aliEnv: enviados, aliMax: ALI_MAX }; };
const donoDe = (cl, eu) => !!cl && cl.dono === eu;
OPS.claAliar = async (c, b) => { const cid = String(b.id || ''); let alvo = String(b.alvo || '');
  if (!alvo && b.cod) { const cod = String(b.cod).toUpperCase().replace(/^CL-?/, '').replace(/[^A-Z0-9]/g, ''), g = await N.store().get('so/cc/' + cod).catch(() => null); if (!g) throw N.err('alianca', 'Não encontrei nenhum clã com esse código.', 404); alvo = JSON.parse(g.buf.toString()).cid; }
  if (!CID.test(cid) || !CID.test(alvo)) throw N.err('alianca', 'Clã desconhecido.', 400); if (cid === alvo) throw N.err('alianca', 'Um clã não pode ser aliado de si próprio.', 400);
  const A = (await ler(CL(cid), null)).v, B = (await ler(CL(alvo), null)).v; if (!A || !B) throw N.err('alianca', 'Clã desconhecido.', 404); if (!donoDe(A, c.eu)) throw N.err('alianca', 'Só o dono do clã propõe alianças.', 403);
  if ((A.aliados || []).some(x => x.id === alvo)) throw N.err('alianca', 'Já são aliados.', 400); if ((A.aliados || []).length >= ALI_MAX) throw N.err('alianca', `O teu clã já tem ${ALI_MAX} aliados, o máximo.`, 400);
  if ((B.aliados || []).length >= ALI_MAX) throw N.err('alianca', `Esse clã já tem ${ALI_MAX} aliados, o máximo.`, 400);
  // se o outro já tinha proposto, fica logo aliado
  if ((A.aliPed || []).some(x => x.id === alvo)) return OPS.claAliResp(c, { id: cid, de: alvo, sim: true });
  await mudar(CL(alvo), null, o => { if (!o) throw N.err('alianca', 'Clã desconhecido.', 404); o.aliPed = (o.aliPed || []).filter(x => x.id !== cid); if (o.aliPed.length >= 10) throw N.err('alianca', 'Esse clã tem muitas propostas à espera. Tenta mais tarde.', 429); o.aliPed.push({ id: cid, at: Date.now() }); });
  await mudar(CL(cid), null, o => { o.aliEnv = [...new Set((o.aliEnv || []).concat(alvo))].slice(-10); });
  N.count('cla:alianca'); return { proposta: true, cla: { id: B.id, nome: B.nome } }; };
OPS.claAliResp = async (c, b) => { const cid = String(b.id || ''), de = String(b.de || ''), sim = !!b.sim; if (!CID.test(cid) || !CID.test(de)) throw N.err('alianca', 'Proposta desconhecida.', 400);
  const A = (await ler(CL(cid), null)).v; if (!donoDe(A, c.eu)) throw N.err('alianca', 'Só o dono do clã responde às alianças.', 403); if (!(A.aliPed || []).some(x => x.id === de)) throw N.err('alianca', 'Esta proposta já não está à espera.', 404);
  if (sim) { const B = (await ler(CL(de), null)).v; if (!B) throw N.err('alianca', 'Esse clã já não existe.', 404);
    if ((A.aliados || []).length >= ALI_MAX || (B.aliados || []).length >= ALI_MAX) throw N.err('alianca', `Um dos clãs já tem ${ALI_MAX} aliados, o máximo.`, 400); }
  const agora = Date.now();
  await mudar(CL(cid), null, o => { o.aliPed = (o.aliPed || []).filter(x => x.id !== de); o.aliEnv = (o.aliEnv || []).filter(x => x !== de); if (sim && !(o.aliados || []).some(x => x.id === de)) o.aliados = (o.aliados || []).concat({ id: de, desde: agora }); });
  await mudar(CL(de), null, o => { if (!o) return false; o.aliEnv = (o.aliEnv || []).filter(x => x !== cid); o.aliPed = (o.aliPed || []).filter(x => x.id !== cid); if (sim && !(o.aliados || []).some(x => x.id === cid)) o.aliados = (o.aliados || []).concat({ id: cid, desde: agora }); }).catch(() => { });
  return { ok2: true, aliados: sim }; };
OPS.claAliDesfazer = async (c, b) => { const cid = String(b.id || ''), alvo = String(b.alvo || ''); if (!CID.test(cid) || !CID.test(alvo)) throw N.err('alianca', 'Clã desconhecido.', 400);
  const A = (await ler(CL(cid), null)).v; if (!donoDe(A, c.eu)) throw N.err('alianca', 'Só o dono do clã desfaz alianças.', 403);
  await mudar(CL(cid), null, o => { o.aliados = (o.aliados || []).filter(x => x.id !== alvo); o.aliEnv = (o.aliEnv || []).filter(x => x !== alvo); });
  await mudar(CL(alvo), null, o => { if (!o) return false; o.aliados = (o.aliados || []).filter(x => x.id !== cid); o.aliPed = (o.aliPed || []).filter(x => x.id !== cid); }).catch(() => { });
  return { ok2: true }; };
/* ---------- v3.89 · Selos: a moeda do Prumo. Compram-se no Stripe (pagamento único) e os planos pagos dão alguns todos os meses.
   Gastam-se no app: reforços de vagas para um clã e a foto e o fundo animados no perfil. Cada perfil tem a sua carteira. Os Selos do plano
   são dados uma só vez, no primeiro mês da assinatura, e por conta (o primeiro perfil que abrir a carteira recebe-os), para não se multiplicarem
   pelos perfis; quem sobe de plano recebe só a diferença. Não valem dinheiro e não se trocam. ---------- */
const W = id => 'so/w/' + id, BONUS = new Map();
const SELOS = { pacotes: [{ id: 's100', n: 100, b: 0, EUR: 99, BRL: 490 }, { id: 's550', n: 500, b: 50, EUR: 499, BRL: 2490 }, { id: 's1200', n: 1000, b: 200, EUR: 999, BRL: 4990 }, { id: 's2600', n: 2000, b: 600, EUR: 1999, BRL: 9990 }],
  mes: { 1: 0, 2: 200, 3: 500 }, reforco: 200, vagasRef: 10, animado: 500 };
const VB = () => Math.max(1, Math.round(+process.env.NAUTILO_VAGAS_BASE) || 20), VAGAS_MAX = 200, vagas = cl => Math.min(VAGAS_MAX, VB() + ((cl && cl.extra) || 0));
const wPub = w => ({ s: w.s || 0, anim: !!w.anim, mov: (w.mov || []).slice(0, 30) });
const wOut = (c, w) => Object.assign(wPub(w), c && c.adm ? { inf: true } : {});   // v3.93: a administração vê ∞
const movAdd = (w, v, d) => { w.s = (w.s || 0) + v; w.mov = [{ v, d: String(d).slice(0, 90), at: Date.now() }].concat(w.mov || []).slice(0, 60); };
const mesK = () => lisboa(Date.now()).d.slice(0, 7);
// os Selos do plano: só nos planos pagos (não no teste grátis nem em ofertas, para ninguém juntar Selos com contas novas), uma vez por conta
const mensal = async c => { const n = c.pago ? SELOS.mes[c.lvl] || 0 : 0; if (!n || !c.uid || (BONUS.get(c.uid) || 0) >= n) return 0; let delta = 0;
  await mudar('so/wb/' + c.uid, { dado: 0 }, o => { if ((o.dado || 0) >= n) return false; delta = n - (o.dado || 0); o.dado = n; o.at = Date.now(); o.por = c.eu; }); BONUS.set(c.uid, n);
  if (delta) await mudar(W(c.eu), {}, w => movAdd(w, delta, 'Selos de boas-vindas do plano ' + (c.plano || ''))); return delta; };
const bfSelos = pk => { const pr = PL.promo(); return pr ? Math.round(pk.n * pr.selos / 100) : 0; };   // v3.93: Black Friday: +50% de Selos em cada pacote
const prodSelos = async () => { const k = 'so/cfg/selos-' + PL.modo(), g = (await ler(k, null)).v; if (g && g.id) return g.id;
  const p = await PL.stripe('products', { name: 'Prumo · Selos', metadata: { app: 'prumo', tipo: 'selos' } }); await gravar(k, { id: p.id }).catch(() => { }); return p.id; };
const voltaDe = (req, v) => { const o = String(req.headers.origin || ''), h = /^https?:\/\/[^/]+$/.test(o) ? o : 'https://' + String(req.headers['x-forwarded-host'] || req.headers.host || 'prumo-vida.vercel.app').split(',')[0].trim();
  const x = String(v || ''); return x && x.startsWith(h + '/') && x.length < 300 && !/[#?\s]/.test(x) ? x : h + '/'; };
// credita uma compra uma só vez (o id do pagamento fica guardado na carteira)
const creditar = async (eu, ses) => { const m = (ses && ses.metadata) || {}; if (!ses || ses.status !== 'complete' || ses.payment_status !== 'paid' || m.tipo !== 'selos' || m.eu !== eu) return 0;
  const n = Math.max(0, Math.min(1e5, Math.round(+m.n || 0))); let dado = 0;
  await mudar(W(eu), {}, w => { w.cs = w.cs || []; if (w.cs.includes(ses.id)) { if (!(w.pend || []).some(p => p.id === ses.id)) return false; w.pend = w.pend.filter(p => p.id !== ses.id); return; }
    w.cs = [ses.id].concat(w.cs).slice(0, 200); w.pend = (w.pend || []).filter(p => p.id !== ses.id); movAdd(w, n, 'Compra de ' + n + ' Selos'); dado = n; });
  if (dado) N.count('selos:compra'); return dado; };
const carteira = async c => { await mensal(c).catch(() => { }); let w = (await ler(W(c.eu), {})).v || {};
  // um pagamento que ficou a meio (a pessoa fechou a página do Stripe antes de voltar): confere-se aqui
  if ((w.pend || []).length && PL.cobranca()) { for (const p of w.pend.slice(0, 3)) { try { const ses = await PL.stripe('checkout/sessions/' + p.id, null, 'GET');
      if (ses.status === 'complete') await creditar(c.eu, ses); else if (ses.status === 'expired' || Date.now() - p.at > 2 * DIA) await mudar(W(c.eu), {}, x => { x.pend = (x.pend || []).filter(y => y.id !== p.id); }); } catch (e) { } }
    w = (await ler(W(c.eu), {})).v || {}; }
  return { carteira: wOut(c, w), loja: { cobranca: PL.cobranca(), promo: PL.promo(), pacotes: SELOS.pacotes.map(x => ({ id: x.id, n: x.n, b: x.b, bf: bfSelos(x), EUR: x.EUR, BRL: x.BRL })), bonus: c.pago ? SELOS.mes[c.lvl] || 0 : 0, plano: c.plano || '', planoBonus: { avancado: SELOS.mes[2], completo: SELOS.mes[3] } },
    custos: { reforco: SELOS.reforco, vagas: SELOS.vagasRef, animado: SELOS.animado }, animado: c.lvl >= 2 || !!c.adm || !!w.anim, ganhar: ganharInfo(w) }; };
// v3.93: a conta de administração tem Selos sem fim (gasta sem descontar; o movimento fica registado a 0)
const gastar = async (eu, v, d, extra, inf) => mudar(W(eu), {}, w => { if (inf) { movAdd(w, 0, d + ' (Selos sem fim da administração)'); if (extra) extra(w); return; }
  if ((w.s || 0) < v) throw N.err('selos', `Precisas de ${v} Selos e tens ${w.s || 0}.`, 402); movAdd(w, -v, d); if (extra) extra(w); });
const devolver = (eu, v, d) => mudar(W(eu), {}, w => movAdd(w, v, d)).catch(() => { });
OPS.carteira = async c => carteira(c);
OPS.selosComprar = async (c, b, req) => { if (!PL.cobranca()) throw N.err('cobranca', 'A compra de Selos ainda não está aberta.', 503);
  const pk = SELOS.pacotes.find(x => x.id === b.pac); if (!pk) throw N.err('selos', 'Escolhe um pacote de Selos.', 400);
  if (N.limit(req, 'selos|' + c.eu, 20, 3600e3)) throw N.err('limite', 'Muitos pedidos. Tenta daqui a pouco.', 429);
  const brl = String(b.cur || '').toUpperCase() === 'BRL' && PL.brasil(req), volta = voltaDe(req, b.volta), total = pk.n + pk.b + bfSelos(pk);
  let ses; try { ses = await PL.stripe('checkout/sessions', { mode: 'payment', client_reference_id: c.eu.slice(0, 200), customer_email: c.email, locale: brl ? 'pt-BR' : 'pt',
    success_url: volta + '#selos?ok={CHECKOUT_SESSION_ID}', cancel_url: volta + '#selos',
    line_items: { 0: { quantity: 1, price_data: { currency: brl ? 'brl' : 'eur', unit_amount: brl ? pk.BRL : pk.EUR, product: await prodSelos() } } },
    metadata: { app: 'prumo', tipo: 'selos', eu: c.eu, pac: pk.id, n: String(total) }, payment_intent_data: { description: 'Prumo · ' + total + ' Selos', metadata: { app: 'prumo', tipo: 'selos', pac: pk.id } } }); }
  catch (e) { if (e && e.stripe) { console.error('nautilo stripe selos', e.status || '', String(e.message || '').slice(0, 200)); throw N.err('stripe', 'O pagamento não abriu agora. Tenta daqui a pouco.', 502); } throw e; }
  await mudar(W(c.eu), {}, w => { w.pend = [{ id: ses.id, at: Date.now() }].concat(w.pend || []).slice(0, 5); }); return { url: ses.url }; };
OPS.selosConfirmar = async (c, b) => { const sid = String(b.sid || ''); if (!/^cs_[A-Za-z0-9_]{6,200}$/.test(sid)) throw N.err('selos', 'Pagamento desconhecido.', 400); if (!PL.cobranca()) throw N.err('cobranca', 'A compra de Selos ainda não está aberta.', 503);
  const ses = await PL.stripe('checkout/sessions/' + sid, null, 'GET'); if (((ses || {}).metadata || {}).eu !== c.eu) throw N.err('selos', 'Este pagamento não é deste perfil.', 403);
  if (ses.status !== 'complete' || ses.payment_status !== 'paid') throw N.err('pendente', 'O pagamento ainda não foi concluído.', 409);
  const n = await creditar(c.eu, ses); return Object.assign({ dados: n }, await carteira(c)); };
// reforçar um clã: qualquer membro gasta Selos e o clã fica com mais vagas para sempre
OPS.claReforco = async (c, b) => { const cid = String(b.id || ''); if (!CID.test(cid)) throw N.err('cla', 'Clã desconhecido.', 400); const cl0 = (await ler(CL(cid), null)).v;
  if (!cl0 || !cl0.membros.some(m => m.id === c.eu)) throw N.err('cla', 'Só quem é do clã o pode reforçar.', 403); if (vagas(cl0) >= VAGAS_MAX) throw N.err('cla', 'Este clã já tem o máximo de vagas (' + VAGAS_MAX + ').', 400);
  await gastar(c.eu, SELOS.reforco, 'Reforço do clã ' + cl0.nome + ' (+' + SELOS.vagasRef + ' vagas)', null, !!c.adm);
  try { const v = await perfil(c.eu, c.nome), cl = await mudar(CL(cid), null, o => { if (!o) throw N.err('cla', 'Clã desconhecido.', 404); o.extra = Math.min(VAGAS_MAX - VB(), (o.extra || 0) + SELOS.vagasRef);
      o.ref = o.ref || []; const r = o.ref.find(x => x.id === c.eu); if (r) { r.n++; r.at = Date.now(); r.nome = v.nome; } else o.ref.push({ id: c.eu, nome: v.nome, n: 1, at: Date.now() }); });
    await idxPor(cl).catch(() => { }); N.count('selos:reforco'); return { vagas: vagas(cl), carteira: wOut(c, (await ler(W(c.eu), {})).v || {}) }; }
  catch (e) { if (!c.adm) await devolver(c.eu, SELOS.reforco, 'Devolução: o reforço não foi aplicado'); throw e; } };
// desbloquear a foto e o fundo animados (no Avançado e no Completo já vêm incluídos)
OPS.perfilAnimado = async (c, b) => { const w0 = (await ler(W(c.eu), {})).v || {}; if (w0.anim || c.lvl >= 2 || c.adm) return { ja: true, animado: true, carteira: wOut(c, w0) };
  await gastar(c.eu, SELOS.animado, 'Foto e fundo animados no perfil', w => { w.anim = Date.now(); }); N.count('selos:animado'); return { animado: true, carteira: wOut(c, (await ler(W(c.eu), {})).v || {}) }; };
const podeAnimar = async c => c.lvl >= 2 || !!c.adm || !!(((await ler(W(c.eu), {})).v || {}).anim);

/* ---------- v3.93 · ganhar Selos dentro do app (sem passar pelas lojas): a presença de cada dia, o Quiz relâmpago, as Sombras e as medalhas
   (que já chegam pelos duelos, desafios, guerra de clãs, Sequência a dois…) dão Selos. Cada ganho tem uma chave e não se repete; há um limite
   por dia e por perfil (os prémios da seele ficam de fora do limite). Comprar Selos continua só no site, pelo Stripe. ---------- */
const GANHO = { presenca: 2, semana: 10, quiz: 5, quizBom: 5, sombra: [10, 6, 4], med: { Diamante: 30, Platina: 20, Ouro: 12, Prata: 8, Bronze: 5 }, trofeu: 25 };
const GLIM = () => Math.max(1, Math.round(+process.env.NAUTILO_SELOS_DIA) || 60);
const ganha = async (eu, n, motivo, chave, semLimite) => { if (!ID.test(String(eu || '')) || !(n > 0) || !chave) return 0; let dado = 0; const d = lisboa().d;
  await mudar(W(eu), {}, w => { w.gk = w.gk || []; if (w.gk.includes(chave)) return false; let v = Math.round(n);
    if (!semLimite) { if (!w.gd || w.gd.d !== d) w.gd = { d, n: 0 }; v = Math.min(v, GLIM() - w.gd.n); if (v <= 0) return false; w.gd.n += v; }
    w.gk = [chave].concat(w.gk).slice(0, 400); movAdd(w, v, motivo); dado = v; }).catch(() => { });
  if (dado) { N.count('selos:ganho'); const st = ALS.getStore(); if (st && st.eu === eu) st.n += dado; } return dado; };
// as formas de ganhar, para a página dos Selos (com o que já ganhaste hoje)
const ganharInfo = w => ({ hoje: w && w.gd && w.gd.d === lisboa().d ? w.gd.n : 0, limite: GLIM(), formas: [
  { k: 'presenca', t: 'Abrir o Prumo', d: 'Uma vez por dia; ao fim de 7 dias seguidos, mais ' + GANHO.semana + '.', n: GANHO.presenca },
  { k: 'quiz', t: 'Quiz relâmpago das 21h', d: 'Terminar o quiz; com 8 certas ou mais, o dobro.', n: GANHO.quiz },
  { k: 'sombra', t: 'Sombras', d: 'Acertar na personagem: ' + GANHO.sombra.join(', ') + ' Selos (1.ª, 2.ª ou 3.ª tentativa).', n: GANHO.sombra[0] },
  { k: 'med', t: 'Medalhas e troféus', d: 'Cada medalha nova: de ' + GANHO.med.Bronze + ' (Bronze) a ' + GANHO.med.Diamante + ' (Diamante); troféus ' + GANHO.trofeu + '. Vêm dos duelos, desafios, guerra de clãs, Sequência a dois e jogos.', n: GANHO.med.Ouro },
  { k: 'seele', t: 'Prémios da seele', d: 'Algumas campanhas dão Selos aos vencedores (fora do limite diário).', n: 0 }] });
OPS.presenca = async c => { const d = lisboa().d, n = await ganha(c.eu, GANHO.presenca, 'Presença no Prumo', 'pres:' + d); let semana = 0;
  if (n) { let seq = 0; await mudar(W(c.eu), {}, w => { w.pres = w.pres || {}; if (w.pres.ult === d) return false; w.pres.seq = w.pres.ult === diaMais(d, -1) ? (w.pres.seq || 0) + 1 : 1; w.pres.ult = d; seq = w.pres.seq; }).catch(() => { });
    if (seq && seq % 7 === 0) semana = await ganha(c.eu, GANHO.semana, seq + ' dias seguidos no Prumo', 'pres7:' + d); }
  return { dados: n + semana, carteira: wOut(c, (await ler(W(c.eu), {})).v || {}) }; };

/* ---------- v3.89 · medalhas e troféus ganhos no Prumo (aparecem em Eu › Troféus e no perfil dos animes). O servidor dá-os sozinho:
   guerra de clãs (vitória, MVP, empate, lutar), desafios dos animes (1.º, 2.º e 3.º da semana, semana perfeita), desafio da semana
   (cumprir e os 3 primeiros), campeão do mês no ranking de animes e os 3 primeiros a acertar no Pursuit. ---------- */
const MED_MAX = 300, PESO = { Platina: 0, Ouro: 1, Prata: 2, Bronze: 3, Mérito: 4, Participação: 5 };
const medTopo = (L, n = 8) => L.slice().sort((a, b) => (a.kind === 'Troféu' || a.kind === 'Distinção' ? 0 : 1) - (b.kind === 'Troféu' || b.kind === 'Distinção' ? 0 : 1) || (PESO[a.lvl] ?? 9) - (PESO[b.lvl] ?? 9) || b.at - a.at).slice(0, n).map(m => medPub(m));
const darMed = async (id, m) => { if (!ID.test(String(id || ''))) return; let novo = false; await mudar(P(id), null, p => { if (!p) return false; p.med = p.med || []; if (p.med.some(x => x.k === m.k)) return false;
  p.med.unshift(Object.assign({ at: Date.now() }, m)); p.med = p.med.slice(0, MED_MAX); novo = true; }).catch(() => { });
  // v3.93: cada medalha nova dá Selos (os troféus mais)
  if (novo) await ganha(id, m.kind === 'Troféu' || m.kind === 'Distinção' ? GANHO.trofeu : GANHO.med[m.lvl] || 5, (m.kind || 'Medalha') + ': ' + String(m.n || '').slice(0, 60), 'med:' + m.k).catch(() => { }); };
const darVarios = async L => { for (let i = 0; i < L.length; i += 10) await Promise.all(L.slice(i, i + 10).map(([id, m]) => darMed(id, m))); };
const LUG = ['Ouro', 'Prata', 'Bronze'];
const medPub = m => ({ k: m.k, n: m.n, d: m.d || '', kind: m.kind || 'Medalha', lvl: m.lvl || 'Ouro', cat: m.cat || 'Prumo', lugar: m.lugar || 0, at: m.at || 0 });
OPS.medalhas = async c => { const v = await perfil(c.eu, c.nome); return { med: (v.med || []).map(medPub) }; };
// fecha uma semana dos desafios dos animes e do desafio da semana (uma só vez, na primeira visita da semana seguinte)
const semFechar = async S => { const ant = semana(S.ini - 3600e3); try { await N.store().put('so/medsem/' + ant.k, Buffer.from('1'), { overwrite: false }); } catch (e) { return; }
  const A = ((await ler('so/ands/' + ant.k, { T: {} })).v || {}).T || {}, R = Object.entries(A).filter(([, x]) => (x.pts || 0) > 0).sort((a, b) => (b[1].pts || 0) - (a[1].pts || 0) || (a[1].at || 0) - (b[1].at || 0)).slice(0, 3);
  const D = ((await ler('so/ds/' + ant.k, { T: {} })).v || {}).T || {}, F = Object.entries(D).filter(([, x]) => x.at).sort((a, b) => a[1].at - b[1].at).slice(0, 3);
  await darVarios(R.map(([id, x], i) => [id, { k: 'adsem' + (i + 1) + ':' + ant.k, n: (i + 1) + '.º lugar nos Desafios dos Animes', d: 'Semana ' + ant.k.split('-S')[1] + ' de ' + ant.k.slice(0, 4) + ' · ' + x.pts + ' pontos', kind: 'Troféu', lvl: LUG[i], cat: 'Desafios', lugar: i + 1 }])
    .concat(F.map(([id], i) => [id, { k: 'dssem' + (i + 1) + ':' + ant.k, n: (i + 1) + '.º a cumprir o Desafio da semana', d: 'Semana ' + ant.k.split('-S')[1] + ' de ' + ant.k.slice(0, 4), kind: 'Troféu', lvl: LUG[i], cat: 'Desafios', lugar: i + 1 }]))); };
// o campeão do mês no ranking de animes: os pontos ganhos nesse mês (a diferença entre o início deste mês e o do mês passado)
let MES_OK = '';
const mesFechar = async () => { const M = mesK(); if (MES_OK === M) return; const T = (await ler(PTS, {})).v || {}, base = Object.fromEntries(Object.entries(T).map(([id, o]) => [id, o.p || 0]));
  try { await gravar('so/ptsmes/' + M, base, { overwrite: false }); } catch (e) { MES_OK = M; return; } MES_OK = M;
  const [y, m] = M.split('-').map(Number), Mp = (m === 1 ? y - 1 : y) + '-' + String(m === 1 ? 12 : m - 1).padStart(2, '0'), B0 = (await ler('so/ptsmes/' + Mp, null)).v; if (!B0) return;
  const NOMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], mes = NOMES[(m === 1 ? 12 : m - 1) - 1] + ' de ' + (m === 1 ? y - 1 : y);
  const L = Object.entries(base).map(([id, p]) => [id, p - (B0[id] || 0)]).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  await darVarios(L.map(([id, d], i) => [id, { k: 'mes' + (i + 1) + ':' + Mp, n: i ? (i + 1) + '.º lugar do mês no ranking de animes' : 'Campeão do mês no ranking de animes', d: mes + ' · ' + d + ' pontos', kind: 'Troféu', lvl: LUG[i], cat: 'Ranking', lugar: i + 1 }])); };
/* ---------- v3.90 · DUELO DE HÁBITOS: 7 dias contra um amigo. Cada um conta o que faz de verdade no app (hábitos cumpridos, treinos e corridas,
   tarefas feitas e minutos de foco/estudo); o app manda só os pontos de cada dia (nunca o nome dos hábitos) e o servidor guarda o maior valor
   de cada dia, com limite. Ganha quem somar mais. Dá medalhas e o registo de vitórias. ---------- */
const DU = id => 'so/du/' + id, DUID = /^[a-f0-9]{10}$/, DU_MAX_DIA = 60, DU_DIAS = 7;
const duAgora = () => +process.env.NAUTILO_DUELO_AGORA || Date.now();   // os testes avançam o relógio
const duDias = t0 => Array.from({ length: DU_DIAS }, (_, i) => lisboa(t0 + i * DIA).d);
const duTot = (o, dias) => (dias || []).reduce((t, d) => t + Math.min(DU_MAX_DIA, +((o || {})[d]) || 0), 0);
const duFechar = async w => { if (!w || w.estado !== 'ativa' || duAgora() < w.fim) return w; let feito = false;
  const w2 = await mudar(DU(w.id), null, o => { if (!o || o.estado !== 'ativa') return false; const a = duTot(o.va, o.dias), b = duTot(o.vb, o.dias); o.estado = 'fim'; o.res = { a, b, venc: a > b ? 'a' : b > a ? 'b' : 'empate' }; feito = true; });
  if (!feito) return (await ler(DU(w.id), null)).v || w; const r = w2.res, txt = `${w2.nA} ${r.a} – ${r.b} ${w2.nB}`;
  for (const [lado, id] of [['a', w2.a], ['b', w2.b]]) { await mudar(P(id), null, p => { if (!p) return false; if (r.venc === 'empate') p.duE = (p.duE || 0) + 1; else if (r.venc === lado) p.duV = (p.duV || 0) + 1; else p.duD = (p.duD || 0) + 1; }).catch(() => { });
    if (r.venc === lado) await darMed(id, { k: 'duv:' + w2.id, n: 'Venceu um duelo de hábitos', d: txt, kind: 'Medalha', lvl: 'Ouro', cat: 'Duelos' });
    else if (r.venc === 'empate') await darMed(id, { k: 'due:' + w2.id, n: 'Empate num duelo de hábitos', d: txt, kind: 'Medalha', lvl: 'Prata', cat: 'Duelos' }); }
  return w2; };
const duLer = async id => { if (!DUID.test(String(id || ''))) return null; let w = (await ler(DU(id), null)).v; if (!w) return null; if (w.estado === 'convite' && duAgora() - w.criado > 3 * DIA) w.estado = 'expirou'; return duFechar(w); };
const duPub = async (w, eu) => { const l = w.a === eu ? 'a' : 'b', o = l === 'a' ? w.b : w.a, po = await pubAn(o), dias = w.dias || [], hoje = lisboa(duAgora()).d;
  const lin = v => dias.map(d => ({ d, p: Math.min(DU_MAX_DIA, +((v || {})[d]) || 0), fut: d > hoje }));
  return { id: w.id, estado: w.estado, eu: l, por: w.a === eu, outro: po, criado: w.criado, ini: w.ini || 0, fim: w.fim || 0, dias, hoje,
    meu: { tot: duTot(l === 'a' ? w.va : w.vb, dias), dias: lin(l === 'a' ? w.va : w.vb) }, dele: { tot: duTot(l === 'a' ? w.vb : w.va, dias), dias: lin(l === 'a' ? w.vb : w.va) }, venc: (w.res || {}).venc ? ((w.res.venc === 'empate') ? 'empate' : w.res.venc === l ? 'eu' : 'ele') : '' }; };
// o nome, o @ e a foto de alguém (para os jogos)
const pubAn = async id => { const v = (await ler(P(id), null)).v || {}; return { id, nome: v.nome || 'Alguém', user: v.user || '', av: v.av || 0 }; };
OPS.duelos = async c => { const v = await perfil(c.eu, c.nome), L = [];
  for (const id of (v.duelos || []).slice(0, 20)) { const w = await duLer(id); if (w && w.a && w.b) L.push(await duPub(w, c.eu)); }
  const amigos = await Promise.all((v.amigos || []).slice(0, 60).map(pubAn)), v2 = (await ler(P(c.eu), null)).v || v;   // lido outra vez: um duelo pode ter acabado agora
  return { duelos: L, amigos, reg: { v: v2.duV || 0, d: v2.duD || 0, e: v2.duE || 0 }, regras: { max: DU_MAX_DIA, dias: DU_DIAS } }; };
OPS.duelDesafiar = async (c, b) => { const outro = String(b.amigo || ''); if (!ID.test(outro) || outro === c.eu) throw N.err('duelo', 'Escolhe um amigo para desafiar.', 400);
  const v = await perfil(c.eu, c.nome); if (!(v.amigos || []).includes(outro)) throw N.err('duelo', 'Só podes desafiar os teus amigos.', 403);
  const o = (await ler(P(outro), null)).v; if (!o || (o.bloq || []).includes(c.eu)) throw N.err('duelo', 'Não é possível desafiar esta pessoa.', 403);
  let ativos = 0; for (const id of (v.duelos || []).slice(0, 20)) { const w = await duLer(id); if (!w || !['convite', 'ativa'].includes(w.estado)) continue; ativos++; if ([w.a, w.b].includes(outro)) throw N.err('duelo', 'Já tens um duelo com esta pessoa.', 400); }
  if (ativos >= 3) throw N.err('duelo', 'Já tens 3 duelos a decorrer (o máximo).', 400);
  const id = N.crypto.randomBytes(5).toString('hex'), w = { id, a: c.eu, b: outro, nA: v.nome, nB: o.nome, estado: 'convite', criado: duAgora(), va: {}, vb: {} }; await gravar(DU(id), w, { overwrite: false });
  for (const p of [c.eu, outro]) await mudar(P(p), null, x => { if (!x) return false; x.duelos = [id].concat((x.duelos || []).filter(y => y !== id)).slice(0, 30); });
  return { duelo: await duPub(w, c.eu) }; };
OPS.duelResp = async (c, b) => { const w = await duLer(String(b.id || '')); if (!w || ![w.a, w.b].includes(c.eu)) throw N.err('duelo', 'Duelo desconhecido.', 404);
  if (w.estado !== 'convite') throw N.err('duelo', w.estado === 'expirou' ? 'O convite expirou (passaram 3 dias).' : 'Este duelo já não está à espera de resposta.', 400);
  if (b.sim && c.eu !== w.b) throw N.err('duelo', 'Só quem foi desafiado pode aceitar.', 403);
  const ini = duAgora(); await mudar(DU(w.id), null, o => { if (o.estado !== 'convite') return false; if (b.sim) { o.estado = 'ativa'; o.ini = ini; o.dias = duDias(ini); o.fim = ini + DU_DIAS * DIA; } else o.estado = c.eu === w.a ? 'cancelado' : 'recusado'; });
  return { duelo: await duPub(await duLer(w.id), c.eu) }; };
OPS.duelProg = async (c, b, req) => { if (N.limit(req, 'dup|' + c.eu, 90, 3600e3)) throw N.err('limite', 'Espera um pouco.', 429); const w = await duLer(String(b.id || ''));
  if (!w || ![w.a, w.b].includes(c.eu)) throw N.err('duelo', 'Duelo desconhecido.', 404); if (w.estado !== 'ativa') return { duelo: await duPub(w, c.eu) };
  const hoje = lisboa(duAgora()).d, k = w.a === c.eu ? 'va' : 'vb', inn = b.v && typeof b.v === 'object' ? b.v : {};
  await mudar(DU(w.id), null, o => { if (o.estado !== 'ativa') return false; const cur = o[k] = o[k] || {}; let mudou = false;
    (o.dias || []).forEach(d => { if (d > hoje || inn[d] == null) return; const x = Math.max(0, Math.min(DU_MAX_DIA, Math.round(+inn[d] || 0))); if (x > (cur[d] || 0)) { cur[d] = x; mudou = true; } }); if (!mudou) return false; });   // nunca desce
  return { duelo: await duPub(await duLer(w.id), c.eu) }; };

/* ---------- v3.90 · QUIZ RELÂMPAGO: todos os dias às 21h (Lisboa), 10 perguntas de anime iguais para toda a gente, 15 segundos cada.
   As perguntas saem de dados reais (estúdio, ano, episódios, nota, géneros e popularidade no MyAnimeList); a resposta certa fica no servidor
   e o tempo também é medido no servidor. Às 21h15 fecha: ranking, pontos para o ranking de animes e medalhas. ---------- */
const QZ_A = () => +(process.env.NAUTILO_QUIZ_ABRE || 1260), QZ_F = () => +(process.env.NAUTILO_QUIZ_FECHA || 1275), QZ_SEG = 15, QZ_N = 10;
const QZ = d => 'so/qz/' + d, QZP = (d, id) => 'so/qzp/' + d + '/' + id;
const rndDe = async k => { let s = N.crypto.createHmac('sha256', await N.master()).update(k).digest().readUInt32BE(0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const qzPool = async d => { let pool = (await ler('so/qzpool', null)).v;
  if (!pool || Date.now() - pool.at > 3 * DIA || pool.L.length < 30) { const L = [];
    for (let pg = 1; pg <= 4; pg++) { try { const j = await jk('top/anime?filter=bypopularity&page=' + pg); if (!(j.data || []).length) break;
        (j.data || []).forEach(x => { if (!x || !x.mal_id || (x.rating && /Rx|R\+/.test(x.rating))) return; L.push({ id: x.mal_id, t: x.title_english || x.title, y: x.year || ((((x.aired || {}).prop || {}).from || {}).year) || 0, e: x.type === 'TV' ? +x.episodes || 0 : 0, st: ((x.studios || [])[0] || {}).name || '', g: (x.genres || []).map(z => z.name).slice(0, 4), sc: +x.score || 0, m: +x.members || 0, img: (((x.images || {}).webp || {}).image_url) || (((x.images || {}).jpg || {}).image_url) || '' }); }); } catch (e) { break; } await sleep(450); }
    if (L.length >= 12) { pool = { L, at: Date.now() }; await gravar('so/qzpool', pool).catch(() => { }); } }
  if (!pool || pool.L.length < 12) throw N.err('quiz', 'As bases de animes não responderam. O quiz de hoje sai daqui a pouco.', 502); return pool.L; };
const baralha = (L, r) => { const a = L.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const qzGerar = async d => { const L = await qzPool(d), r = await rndDe('quiz:' + d), A = baralha(L, r), Q = [], usados = new Set(), tit = x => x.t;
  const pega = f => { const x = A.find(z => !usados.has(z.id) && f(z)); if (x) usados.add(x.id); return x; };
  const opc = (certa, outras) => { const op = baralha([certa].concat(outras.slice(0, 3)), r); return { op: op.map(String), c: op.indexOf(certa) }; };
  const T = {
    estudio: () => { const x = pega(z => z.st); if (!x) return null; const out = [...new Set(L.map(z => z.st).filter(s => s && s !== x.st))]; if (out.length < 3) return null; return Object.assign({ t: `Que estúdio fez «${tit(x)}»?`, img: x.img }, opc(x.st, baralha(out, r))); },
    ano: () => { const x = pega(z => z.y > 1960); if (!x) return null; const out = baralha([-6, -4, -3, -2, -1, 1, 2, 3, 4, 5].map(k => x.y + k).filter(y => y <= new Date().getFullYear() + 1), r); return Object.assign({ t: `Em que ano estreou «${tit(x)}»?` }, opc(x.y, out)); },
    eps: () => { const x = pega(z => z.e > 0 && z.e <= 220); if (!x) return null; const out = [...new Set(L.map(z => z.e).filter(e => e > 0 && e !== x.e))]; if (out.length < 3) return null; return Object.assign({ t: `Quantos episódios tem «${tit(x)}»?` }, opc(x.e, baralha(out, r))); },
    nota: () => { const C = baralha(L.filter(z => z.sc > 0), r); const g = []; for (const z of C) { if (g.every(y => Math.abs(y.sc - z.sc) >= .08)) g.push(z); if (g.length === 4) break; } if (g.length < 4) return null; const best = g.reduce((a, b) => b.sc > a.sc ? b : a);
      return Object.assign({ t: 'Qual destes tem a nota mais alta no MyAnimeList?' }, opc(tit(best), g.filter(z => z !== best).map(tit))); },
    genero: () => { const gs = baralha([...new Set(L.flatMap(z => z.g))], r); for (const G of gs) { const x = A.find(z => !usados.has(z.id) && z.g.includes(G)), out = baralha(L.filter(z => !z.g.includes(G)), r).slice(0, 3); if (x && out.length === 3) { usados.add(x.id); return Object.assign({ t: `Qual destes animes é de ${G}?` }, opc(tit(x), out.map(tit))); } } return null; },
    capa: () => { const x = pega(z => z.img); if (!x) return null; return Object.assign({ t: 'Que anime é este?', img: x.img, capa: true }, opc(tit(x), baralha(L.filter(z => z.id !== x.id), r).slice(0, 3).map(tit))); },
    popular: () => { const C = baralha(L.filter(z => z.m > 0), r); const g = []; for (const z of C) { if (g.every(y => Math.abs(y.m - z.m) / Math.max(y.m, z.m) > .12)) g.push(z); if (g.length === 4) break; } if (g.length < 4) return null; const best = g.reduce((a, b) => b.m > a.m ? b : a);
      return Object.assign({ t: 'Qual destes tem mais gente a seguir no MyAnimeList?' }, opc(tit(best), g.filter(z => z !== best).map(tit))); } };
  const ORDEM = ['capa', 'estudio', 'ano', 'genero', 'nota', 'eps', 'estudio', 'popular', 'ano', 'genero', 'capa', 'eps', 'nota', 'popular'];
  for (const k of ORDEM) { if (Q.length >= QZ_N) break; try { const q = T[k](); if (q && new Set(q.op).size === 4) Q.push(q); } catch (e) { } }
  if (Q.length < 6) throw N.err('quiz', 'Não deu para preparar as perguntas de hoje. Tenta daqui a pouco.', 502); return Q.slice(0, QZ_N); };
const qzDe = async (L, criar) => { let q = (await ler(QZ(L.d), null)).v; if (q || !criar) return q;
  q = { dia: L.d, Q: await qzGerar(L.d), fechado: false }; try { await gravar(QZ(L.d), q, { overwrite: false }); } catch (e) { q = (await ler(QZ(L.d), q)).v; } return q; };
const qzFechar = async (d, q) => { const B = await N.store().list('so/qzp/' + d + '/').catch(() => []), G = [];
  for (const b of B) { const g = (await ler(b.pathname, null)).v; if (g && g.id) G.push(g); }
  const R = G.filter(g => (g.pts || 0) > 0).sort((a, b) => (b.pts || 0) - (a.pts || 0) || (a.ms || 0) - (b.ms || 0)).map((g, i) => ({ id: g.id, nome: g.nome, user: g.user || '', av: g.av || 0, pts: g.pts, certas: (g.r || []).filter(x => x.ok).length, rk: Math.max(5, 80 - 8 * i) }));
  let ganhei = false; const v = await mudar(QZ(d), q, o => { if (o.fechado) return false; o.fechado = true; o.res = R.slice(0, 100); o.total = G.length; ganhei = true; });
  if (ganhei && R.length) { await somaPts(R.map(x => [x.id, x.nome, x.rk, { user: x.user, av: x.av }])).catch(() => { });
    const M = R.slice(0, 3).map((x, i) => [x.id, { k: 'qz' + (i + 1) + ':' + d, n: (i + 1) + '.º no Quiz relâmpago', d: d.split('-').reverse().join('/') + ' · ' + x.pts + ' pontos', kind: 'Medalha', lvl: LUG[i], cat: 'Quiz', lugar: i + 1 }]);
    R.filter(x => x.certas >= QZ_N).forEach(x => M.push([x.id, { k: 'qzp:' + d, n: 'Quiz perfeito: 10 em 10', d: d.split('-').reverse().join('/'), kind: 'Medalha', lvl: 'Mérito', cat: 'Quiz' }])); await darVarios(M).catch(() => { }); }
  return v; };
const qzPerg = (q, i, g) => { const x = q.Q[i]; return x ? { i, n: q.Q.length, t: x.t, op: x.op, img: x.img || '', capa: !!x.capa, at: g.at, seg: QZ_SEG } : null; };
const qzVer = async c => { const L = lisboa(), A = QZ_A(), F = QZ_F(), m = L.min, fase = m < A ? 'espera' : m < F ? 'aberto' : 'fechado';
  let q = await qzDe(L, fase === 'aberto'); if (q && !q.fechado && fase === 'fechado') q = await qzFechar(L.d, q);
  const g = q ? (await ler(QZP(L.d, c.eu), null)).v : null, min0 = Math.floor(Date.now() / 6e4) * 6e4, abreAt = min0 + (A - m) * 6e4, fechaAt = min0 + (F - m) * 6e4;
  const ontem = fase === 'espera' ? (await ler(QZ(lisboa(Date.now() - DIA).d), null)).v : null;
  return { fase, dia: L.d, abreAt: fase === 'fechado' ? abreAt + DIA : abreAt, fechaAt, ultimo: fechaAt - 3 * 6e4, ts: Date.now(), n: q ? q.Q.length : QZ_N, seg: QZ_SEG,
    eu: g ? { i: g.i, pts: g.pts || 0, fim: !!g.fim, r: g.r || [] } : null, pergunta: g && !g.fim && fase === 'aberto' ? qzPerg(q, g.i, g) : null,
    res: q && q.fechado ? (q.res || []).slice(0, 30).map(x => Object.assign({}, x, { eu: x.id === c.eu })) : null, pos: q && q.fechado ? (q.res || []).findIndex(x => x.id === c.eu) + 1 : 0, total: q && q.fechado ? q.total : undefined,
    ontem: ontem && ontem.fechado ? (ontem.res || []).slice(0, 3).map(x => ({ nome: x.nome, user: x.user, pts: x.pts })) : null }; };
OPS.quiz = async c => ({ quiz: await qzVer(c) });
OPS.quizComecar = async c => { const L = lisboa(), m = L.min; if (m < QZ_A() || m >= QZ_F()) throw N.err('quiz', 'O quiz de hoje não está aberto agora.', 400); if (m >= QZ_F() - 3) throw N.err('quiz', 'Já não dá tempo de começar: o quiz fecha daqui a pouco.', 400);
  const q = await qzDe(L, true), v = await perfil(c.eu, c.nome), g = { id: c.eu, nome: v.nome, user: v.user || '', av: v.av || 0, ini: Date.now(), at: Date.now(), i: 0, r: [], pts: 0, ms: 0 };
  try { await gravar(QZP(L.d, c.eu), g, { overwrite: false }); } catch (e) { throw N.err('quiz', 'Já jogaste o quiz de hoje.', 409); }
  return { quiz: await qzVer(c) }; };
OPS.quizResp = async (c, b) => { const L = lisboa(); if (L.min < QZ_A() || L.min >= QZ_F()) throw N.err('quiz', 'O quiz de hoje já fechou.', 400); const q = await qzDe(L, false); if (!q) throw N.err('quiz', 'O quiz de hoje não está aberto.', 400);
  const i = Math.round(+b.i), op = Math.round(+b.opc); let out = null, fimG = null;   // a resposta vem em opc (op é o nome do pedido)
  await mudar(QZP(L.d, c.eu), null, g => { if (!g) throw N.err('quiz', 'Carrega primeiro em Começar.', 400); if (g.fim || g.i !== i) { out = { repetida: true }; return false; }
    const x = q.Q[i], ms = Date.now() - g.at, ok = op === x.c && ms <= (QZ_SEG + 1.5) * 1000, p = ok ? 100 + Math.round(50 * Math.max(0, 1 - ms / (QZ_SEG * 1000))) : 0;
    g.r.push({ ok, p, ms: Math.min(ms, QZ_SEG * 1000) }); g.pts = (g.pts || 0) + p; g.ms = (g.ms || 0) + Math.min(ms, QZ_SEG * 1000); g.i = i + 1; g.at = Date.now(); if (g.i >= q.Q.length) { g.fim = Date.now(); fimG = g; }
    out = { ok, p, certa: x.c, tempo: ms > (QZ_SEG + 1.5) * 1000 }; });
  if (fimG) { const certas = fimG.r.filter(r => r.ok).length; await ganha(c.eu, GANHO.quiz, 'Quiz relâmpago terminado', 'qz:' + L.d); if (certas >= 8) await ganha(c.eu, GANHO.quizBom, 'Quiz relâmpago: ' + certas + ' certas', 'qzb:' + L.d); }
  return Object.assign({ resp: out }, { quiz: await qzVer(c) }); };

/* ---------- v3.90 · BOLÃO DA TEMPORADA: antes e no começo de cada temporada de animes, cada um prevê o melhor da temporada (nota mais
   alta no MyAnimeList no fim), o mais popular (mais gente a seguir) e a nota final do mais esperado. Os palpites fecham 3 semanas depois do
   começo; os resultados saem uma semana depois do fim, com pontos para o ranking de animes e medalhas. ---------- */
const BOL = k => 'so/bol/' + k, BOLP = (k, id) => 'so/bolp/' + k + '/' + id, ESTS = ['winter', 'spring', 'summer', 'fall'], ESTN = { winter: 'inverno', spring: 'primavera', summer: 'verão', fall: 'outono' }, ESTM = { winter: 'janeiro a março', spring: 'abril a junho', summer: 'julho a setembro', fall: 'outubro a dezembro' };
const bAgora = () => +process.env.NAUTILO_BOLAO_AGORA || Date.now();
const tempDe = (y, i) => { while (i < 0) { i += 4; y--; } while (i > 3) { i -= 4; y++; } const ini = Date.UTC(y, i * 3, 1), fim = Date.UTC(i === 3 ? y + 1 : y, i === 3 ? 0 : i * 3 + 3, 1);
  return { k: y + '-' + ESTS[i], y, s: ESTS[i], nome: 'Temporada de ' + ESTN[ESTS[i]] + ' ' + y, meses: ESTM[ESTS[i]], ini, fimT: fim, abre: ini - 45 * DIA, fecha: ini + 21 * DIA, res: fim + 7 * DIA }; };
const tempAt = t => { const d = new Date(t); return tempDe(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3)); };
const temporadaLista = async T => { const L = [];
  for (let pg = 1; pg <= 3; pg++) { try { const j = await jk('seasons/' + T.y + '/' + T.s + '?page=' + pg); (j.data || []).forEach(x => { if (!x || !x.mal_id || (x.rating && /Rx|R\+/.test(x.rating)) || !['TV', 'ONA'].includes(x.type || 'TV')) return; if (!L.some(z => z.id === x.mal_id)) L.push({ id: x.mal_id, t: x.title_english || x.title, img: (((x.images || {}).webp || {}).image_url) || (((x.images || {}).jpg || {}).image_url) || '', sc: +x.score || 0, m: +x.members || 0 }); }); if (!(j.pagination || {}).has_next_page) break; } catch (e) { if (!L.length) throw e; break; } await sleep(450); }
  return L.sort((a, b) => b.m - a.m); };
const bolDe = async (T, criar) => { let o = (await ler(BOL(T.k), null)).v; if (o || !criar) return o; let L = [];
  try { L = (await temporadaLista(T)).slice(0, 40); } catch (e) { return null; } if (L.length < 4) return null;
  o = { k: T.k, nome: T.nome, meses: T.meses, abre: T.abre, fecha: T.fecha, fimT: T.fimT, res0: T.res, L, dest: L[0].id, res: null };
  try { await gravar(BOL(T.k), o, { overwrite: false }); } catch (e) { o = (await ler(BOL(T.k), o)).v; } return o; };
const BOL_PTS = { top1: 100, top3: 40 };
const bolPontos = (p, R) => { if (!p || !R) return null; const pm = R.melhor[0] && p.melhor === R.melhor[0].id ? BOL_PTS.top1 : R.melhor.some(x => x.id === p.melhor) ? BOL_PTS.top3 : 0;
  const pp = R.popular[0] && p.popular === R.popular[0].id ? BOL_PTS.top1 : R.popular.some(x => x.id === p.popular) ? BOL_PTS.top3 : 0, pn = p.nota && R.nota ? Math.max(0, Math.round(100 - Math.abs(p.nota - R.nota) * 100)) : 0;
  return { melhor: pm, popular: pp, nota: pn, tot: pm + pp + pn }; };
const bolFechar = async (T, o) => { if (o.res || bAgora() < o.res0) return o; try { await N.store().put('so/bolres/' + o.k, Buffer.from('1'), { overwrite: false }); } catch (e) { return (await ler(BOL(o.k), o)).v; }
  let F = []; try { F = await temporadaLista(T); } catch (e) { await N.store().del(['so/bolres/' + o.k]).catch(() => { }); return o; }
  const by = Object.fromEntries(F.map(x => [x.id, x])), C = o.L.map(x => Object.assign({}, x, { scF: (by[x.id] || {}).sc || 0, mF: (by[x.id] || {}).m || x.m }));
  const R = { melhor: C.filter(x => x.scF > 0).sort((a, b) => b.scF - a.scF).slice(0, 3).map(x => ({ id: x.id, t: x.t, sc: x.scF })), popular: C.slice().sort((a, b) => b.mF - a.mF).slice(0, 3).map(x => ({ id: x.id, t: x.t, m: x.mF })), nota: (C.find(x => x.id === o.dest) || {}).scF || 0 };
  const B = await N.store().list('so/bolp/' + o.k + '/').catch(() => []), G = []; for (const b of B) { const g = (await ler(b.pathname, null)).v; if (g && g.id) G.push(Object.assign(g, { pt: bolPontos(g, R) })); }
  const rank = G.filter(g => g.pt.tot > 0).sort((a, b) => b.pt.tot - a.pt.tot || a.at - b.at).map(g => ({ id: g.id, nome: g.nome, user: g.user || '', av: g.av || 0, pts: g.pt.tot }));
  const o2 = await mudar(BOL(o.k), o, x => { if (x.res) return false; x.res = Object.assign(R, { rank: rank.slice(0, 100), total: G.length }); });
  if (rank.length) await somaPts(rank.map(x => [x.id, x.nome, x.pts, { user: x.user, av: x.av }])).catch(() => { });
  const M = rank.slice(0, 3).map((x, i) => [x.id, { k: 'bol' + (i + 1) + ':' + o.k, n: (i + 1) + '.º no Bolão da temporada', d: o.nome + ' · ' + x.pts + ' pontos', kind: 'Troféu', lvl: LUG[i], cat: 'Bolão', lugar: i + 1 }]);
  G.filter(g => g.pt.melhor === BOL_PTS.top1).forEach(g => M.push([g.id, { k: 'bolm:' + o.k, n: 'Acertou no melhor da temporada', d: o.nome + ' · ' + R.melhor[0].t, kind: 'Medalha', lvl: 'Ouro', cat: 'Bolão' }]));
  await darVarios(M).catch(() => { }); return o2; };
const bolPub = async (o, c) => { const p = (await ler(BOLP(o.k, c.eu), null)).v, agora = bAgora(), est = o.res ? 'fim' : agora < o.fecha ? 'aberto' : 'espera';
  return { k: o.k, nome: o.nome, meses: o.meses, estado: est, fecha: o.fecha, res0: o.res0, L: est === 'aberto' ? o.L : o.L.filter(x => p && [p.melhor, p.popular].includes(x.id)).concat(o.L.filter(x => x.id === o.dest)), dest: o.L.find(x => x.id === o.dest) || null,
    meu: p ? { melhor: p.melhor, popular: p.popular, nota: p.nota, at: p.at, pt: o.res ? bolPontos(p, o.res) : null } : null,
    res: o.res ? { melhor: o.res.melhor, popular: o.res.popular, nota: o.res.nota, rank: (o.res.rank || []).slice(0, 30).map(x => Object.assign({}, x, { eu: x.id === c.eu })), total: o.res.total, pos: (o.res.rank || []).findIndex(x => x.id === c.eu) + 1 } : null }; };
OPS.bolao = async c => { const t = bAgora(), C = tempAt(t), Ts = [tempDe(C.y, ESTS.indexOf(C.s) - 1), C, tempDe(C.y, ESTS.indexOf(C.s) + 1)], out = [];
  for (const T of Ts) { const aberto = t >= T.abre && t < T.fecha; let o = await bolDe(T, aberto); if (!o) continue; if (!o.res && t >= o.res0) o = await bolFechar(T, o); out.push(await bolPub(o, c)); }
  return { boloes: out, pts: BOL_PTS }; };
OPS.bolaoPalpite = async (c, b) => { const m0 = String(b.k || '').match(/^(\d{4})-(winter|spring|summer|fall)$/), T = m0 ? tempDe(+m0[1], ESTS.indexOf(m0[2])) : null;
  if (!T) throw N.err('bolao', 'Bolão desconhecido.', 400); const o = await bolDe(T, false); if (!o) throw N.err('bolao', 'Bolão desconhecido.', 404); if (bAgora() >= o.fecha) throw N.err('bolao', 'Os palpites deste bolão já fecharam.', 400);
  const ids = new Set(o.L.map(x => x.id)), melhor = +b.melhor, popular = +b.popular, nota = Math.round((+b.nota || 0) * 100) / 100;
  if (!ids.has(melhor) || !ids.has(popular)) throw N.err('bolao', 'Escolhe os animes da lista desta temporada.', 400); if (!(nota >= 1 && nota <= 10)) throw N.err('bolao', 'A nota tem de ser entre 1 e 10.', 400);
  const v = await perfil(c.eu, c.nome); await gravar(BOLP(o.k, c.eu), { id: c.eu, nome: v.nome, user: v.user || '', av: v.av || 0, melhor, popular, nota, at: Date.now() });
  return { bolao: await bolPub(o, c) }; };
/* ---------- v3.91 · SOMBRAS: todos os dias a silhueta de corpo inteiro de uma personagem de anime; 3 tentativas para dizer quem é.
   Cada erro mostra uma versão mais reveladora (os contornos, depois as cores em mosaico) e uma dica (a primeira letra, depois o anime).
   As silhuetas fazem-se no servidor a partir de imagens com fundo transparente (lista em _sombras.json, montada a partir das wikis dos
   animes); a imagem original só vai para o app quando o jogo acaba. Pontos para o ranking (60, 40, 20) e medalhas pelos dias seguidos. ---------- */
const SB_POOL = (() => { try { return require('./_sombras.json'); } catch (e) { return []; } })();
const SB = d => 'so/sb/' + d, SBP = (d, id) => 'so/sbp/' + d + '/' + id, SB_PTS = [60, 40, 20], SB_TENT = 3;
const sbHostOk = u => /^https:\/\/static\.wikia\.nocookie\.net\/[\w.-]+\/images\//.test(String(u || '')) || (!!process.env.NAUTILO_SB_LOCAL && /^http:\/\/localhost:\d+\//.test(String(u || '')));
const diaMais = (d, k) => new Date(Date.parse(d + 'T12:00:00Z') + k * DIA).toISOString().slice(0, 10);
const sbPool = () => { if (process.env.NAUTILO_SB_POOL) { try { return JSON.parse(process.env.NAUTILO_SB_POOL); } catch (e) { } } return SB_POOL; };   // os testes usam uma lista própria
const sbLista = async () => { const fora = new Set(((await ler('so/sbfora', { L: [] })).v || {}).L || []); return sbPool().filter(c => !fora.has(c.alid)); };
const sbDia = async L => { let v = (await ler(SB(L.d), null)).v; if (v) return v; const P0 = await sbLista(); if (!P0.length) throw N.err('sombra', 'As sombras ainda não estão prontas. Volta daqui a pouco.', 503);
  const hist = ((await ler('so/sbhist', { L: [] })).v || {}).L || [], r = await rndDe('sombra:' + L.d), ord = baralha(P0, r), C = ord.filter(c => !hist.includes(c.alid)).concat(ord.filter(c => hist.includes(c.alid)));
  for (const c of C.slice(0, 6)) { if (!sbHostOk(c.img)) continue;
    try { const rr = await fetch(c.img, { headers: { 'user-agent': 'Prumo/1.0' }, signal: AbortSignal.timeout(15000) }); if (!rr.ok) continue; const S = PNGS.silhuetas(Buffer.from(await rr.arrayBuffer()));
      const m = await iaImg(S.fim, 'png'); if (m && m.ok === false) continue;   // a imagem final também passa pela IA (sem nudez nem nada explícito)
      v = { dia: L.d, id: c.alid, nome: c.nome, alt: c.alt || [], anime: c.anime, lv: S.lv, fim: S.fim, n: { jog: 0, ok: [0, 0, 0], falhou: 0 } };
      try { await gravar(SB(L.d), v, { overwrite: false }); await mudar('so/sbhist', { L: [] }, o => { o.L = (o.L || []).concat(c.alid).slice(-120); }); } catch (e) { v = (await ler(SB(L.d), v)).v; } return v; } catch (e) { } }
  throw N.err('sombra', 'Não deu para preparar a sombra de hoje. Tenta daqui a pouco.', 502); };
const sbN = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').replace(/ou\b/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o').replace(/\s+/g, ' ').trim();
const lev = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
// aceita o nome completo (em qualquer ordem), o primeiro ou o último nome, os outros nomes conhecidos e pequenos erros de escrita
const sbCerto = (g, v) => { const x = sbN(g), xs = x.split(' ').sort().join(' '); if (x.length < 2) return false;
  return [v.nome].concat(v.alt || []).some(c => { const y = sbN(c); if (!y) return false; const ys = y.split(' ').sort().join(' '); if (x === y || xs === ys) return true;
    return (y.length >= 5 && lev(x, y) <= 1) || (y.length >= 9 && lev(x, y) <= 2) || (y.split(' ').length > 1 && y.split(' ').some(p => p.length >= 4 && (p === x || (p.length >= 6 && lev(p, x) <= 1)))); }); };
const sbSeq = (p, hoje) => p && p.sbUlt && (p.sbUlt === hoje || p.sbUlt === diaMais(hoje, -1)) ? p.sbSeq || 0 : 0;
const sbPub = async (c, L, v, g) => { const t = g ? g.t : [], fim = !!g && (g.ok || t.length >= SB_TENT), niv = Math.min(2, t.length), p = (await ler(P(c.eu), null)).v || {};
  const meia = (() => { const m = L.min; return Math.floor(Date.now() / 6e4) * 6e4 + (1440 - m) * 6e4; })();
  return { dia: L.d, img: 'data:image/png;base64,' + (fim ? v.fim : v.lv[niv]), tent: t, max: SB_TENT, fim, ok: !!(g && g.ok), pts: (g && g.pts) || 0, nivel: fim ? 3 : niv,
    dica1: t.length >= 1 || fim ? 'Começa por ' + (v.nome || '?').trim()[0].toUpperCase() : '', dica2: t.length >= 2 || fim ? v.anime : '', resp: fim ? { nome: v.nome, anime: v.anime } : null,
    stats: fim ? v.n : null, seq: sbSeq(p, L.d), amanha: meia, nomes: [...new Set((await sbLista()).map(x => x.nome))].sort() }; };
OPS.sombra = async c => { const L = lisboa(), v = await sbDia(L), g = (await ler(SBP(L.d, c.eu), null)).v; return { sombra: await sbPub(c, L, v, g) }; };
OPS.sombraPalpite = async (c, b, req) => { if (N.limit(req, 'sbp|' + c.eu, 30, 3600e3)) throw N.err('limite', 'Espera um pouco.', 429); const nome = String(b.nome || '').trim().slice(0, 60); if (nome.length < 2) throw N.err('sombra', 'Escreve o nome da personagem.', 400);
  const L = lisboa(), v = await sbDia(L), pf = await perfil(c.eu, c.nome); let res = null;
  const g = await mudar(SBP(L.d, c.eu), () => ({ id: c.eu, t: [], ok: false, pts: 0, at: 0 }), o => { if (o.ok || o.t.length >= SB_TENT) throw N.err('sombra', 'Já jogaste a sombra de hoje. Amanhã há outra.', 409);
    const ok = sbCerto(nome, v); o.t.push(nome); o.at = Date.now(); if (ok) { o.ok = true; o.pts = SB_PTS[o.t.length - 1]; } res = { ok, fim: ok || o.t.length >= SB_TENT, n: o.t.length }; });
  if (res.fim) { const ultimo = res.ok ? res.n - 1 : -1;
    await mudar(SB(L.d), null, o => { if (!o) return false; o.n = o.n || { jog: 0, ok: [0, 0, 0], falhou: 0 }; o.n.jog++; if (ultimo >= 0) o.n.ok[ultimo]++; else o.n.falhou++; }).catch(() => { });
    let seq = 0; await mudar(P(c.eu), null, p => { if (!p) return false; if (res.ok) { p.sbSeq = p.sbUlt === diaMais(L.d, -1) ? (p.sbSeq || 0) + 1 : p.sbUlt === L.d ? p.sbSeq || 1 : 1; p.sbUlt = L.d; } else { p.sbSeq = 0; p.sbUlt = ''; } seq = p.sbSeq || 0; }).catch(() => { });
    if (res.ok) { await somaPts([[c.eu, pf.nome, g.pts, { user: pf.user, av: pf.av }]]).catch(() => { });
      await ganha(c.eu, GANHO.sombra[res.n - 1] || 4, 'Acertaste na sombra de hoje', 'sb:' + L.d);
      for (const [k, lv] of [[7, 'Ouro'], [30, 'Platina'], [100, 'Diamante']]) if (seq === k) await darMed(c.eu, { k: 'sb' + k + ':' + L.d, n: k + ' dias seguidos a acertar nas Sombras', d: 'até ' + L.d.split('-').reverse().join('/'), kind: 'Medalha', lvl: lv, cat: 'Sombras' }); } }
  return Object.assign({ certo: res.ok }, { sombra: await sbPub(c, L, (await ler(SB(L.d), v)).v || v, g) }); };
// a administração pode tirar uma personagem da lista (se a imagem estiver mal) — e a de hoje é trocada
OPS.adminSombraTirar = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const L = lisboa(), v = (await ler(SB(L.d), null)).v, id = +b.id || (v && v.id); if (!id) throw N.err('sombra', 'Nada para tirar.', 400);
  await mudar('so/sbfora', { L: [] }, o => { o.L = [...new Set((o.L || []).concat(id))]; }); if (v && v.id === id) await N.store().del([SB(L.d)]).catch(() => { }); return { ok2: true, id }; };

/* ---------- v3.91 · SEQUÊNCIA A DOIS: tu e um amigo mantêm uma sequência juntos. Um dia conta quando os DOIS o cumprem; se um falhar,
   a sequência recomeça para os dois. Dia cumprido (medido no app de cada um): pelo menos metade dos hábitos desse dia (no mínimo 1);
   sem hábitos marcados nesse dia, basta 1 treino, 1 tarefa feita ou 25 min de foco. Só vai para o servidor "cumprido sim/não". ---------- */
const SQ = id => 'so/sq/' + id, SQ_MARCOS = [[7, 'Bronze'], [30, 'Prata'], [100, 'Ouro'], [365, 'Diamante']];
const sqAgora = () => +process.env.NAUTILO_SEQ_AGORA || Date.now();
const sqCalc = w => { const hoje = lisboa(sqAgora()).d, A = w.va || {}, B = w.vb || {}, both = x => !!(A[x] && B[x]); let d = w.d0, cur = 0, melhor = w.melhor || 0, n = 0;
  while (w.d0 && d < hoje && n++ < 2000) { if (both(d)) { cur++; melhor = Math.max(melhor, cur); } else cur = 0; d = diaMais(d, 1); }
  const tot = cur + (both(hoje) ? 1 : 0); melhor = Math.max(melhor, tot);
  const dias = Array.from({ length: 14 }, (_, i) => diaMais(hoje, i - 13)).filter(x => !w.d0 || x >= w.d0).map(x => ({ d: x, a: !!A[x], b: !!B[x] }));
  return { cur: tot, melhor, hoje, hojeA: !!A[hoje], hojeB: !!B[hoje], ontemPerdido: cur === 0 && w.d0 < hoje && !both(diaMais(hoje, -1)), dias }; };
const sqPub = async (w, eu) => { const l = w.a === eu ? 'a' : 'b', o = l === 'a' ? w.b : w.a, k = w.estado === 'ativa' || w.estado === 'fim' ? sqCalc(w) : null;
  return { id: w.id, estado: w.estado, por: w.a === eu, outro: await pubAn(o), criado: w.criado, d0: w.d0 || '', cur: k ? k.cur : 0, melhor: k ? k.melhor : 0, hoje: k ? k.hoje : '',
    eu: k ? (l === 'a' ? k.hojeA : k.hojeB) : false, ele: k ? (l === 'a' ? k.hojeB : k.hojeA) : false, dias: k ? k.dias.map(x => ({ d: x.d, eu: l === 'a' ? x.a : x.b, ele: l === 'a' ? x.b : x.a })) : [] }; };
// medalhas dos marcos (7, 30, 100 e 365 dias) para os dois, uma vez cada
const sqMarcos = async w => { const k = sqCalc(w), novos = SQ_MARCOS.filter(([n]) => k.melhor >= n && !(w.meds || []).includes(n)); if (!novos.length && (w.melhor || 0) >= k.melhor) return w;
  const w2 = await mudar(SQ(w.id), null, o => { if (!o) return false; o.melhor = Math.max(o.melhor || 0, k.melhor); o.meds = [...new Set((o.meds || []).concat(novos.map(x => x[0])))]; });
  for (const [n, lv] of novos) for (const id of [w.a, w.b]) await darMed(id, { k: 'sq' + n + ':' + w.id, n: `Sequência a dois: ${n} dias`, d: `${w.nA} e ${w.nB}`, kind: 'Medalha', lvl: lv, cat: 'Sequência' });
  return w2 || w; };
const sqLer = async id => { if (!DUID.test(String(id || ''))) return null; const w = (await ler(SQ(id), null)).v; if (w && w.estado === 'convite' && sqAgora() - w.criado > 3 * DIA) w.estado = 'expirou'; return w; };
OPS.seqs = async c => { const v = await perfil(c.eu, c.nome), L = [];
  for (const id of (v.seqs || []).slice(0, 12)) { const w = await sqLer(id); if (w && ['convite', 'ativa'].includes(w.estado)) L.push(await sqPub(w.estado === 'ativa' ? await sqMarcos(w) : w, c.eu)); }
  return { seqs: L, amigos: await Promise.all((v.amigos || []).slice(0, 60).map(pubAn)) }; };
OPS.seqConvidar = async (c, b) => { const outro = String(b.amigo || ''); if (!ID.test(outro) || outro === c.eu) throw N.err('seq', 'Escolhe um amigo.', 400);
  const v = await perfil(c.eu, c.nome); if (!(v.amigos || []).includes(outro)) throw N.err('seq', 'Só podes fazer uma sequência com os teus amigos.', 403); const o = (await ler(P(outro), null)).v; if (!o || (o.bloq || []).includes(c.eu)) throw N.err('seq', 'Não é possível com esta pessoa.', 403);
  let n = 0; for (const id of (v.seqs || []).slice(0, 12)) { const w = await sqLer(id); if (!w || !['convite', 'ativa'].includes(w.estado)) continue; n++; if ([w.a, w.b].includes(outro)) throw N.err('seq', 'Já tens uma sequência com esta pessoa.', 400); }
  if (n >= 3) throw N.err('seq', 'Já tens 3 sequências (o máximo).', 400);
  const id = N.crypto.randomBytes(5).toString('hex'), w = { id, a: c.eu, b: outro, nA: v.nome, nB: o.nome, estado: 'convite', criado: sqAgora(), va: {}, vb: {}, melhor: 0, meds: [] }; await gravar(SQ(id), w, { overwrite: false });
  for (const p of [c.eu, outro]) await mudar(P(p), null, x => { if (!x) return false; x.seqs = [id].concat((x.seqs || []).filter(y => y !== id)).slice(0, 20); });
  return { seq: await sqPub(w, c.eu) }; };
OPS.seqResp = async (c, b) => { const w = await sqLer(String(b.id || '')); if (!w || ![w.a, w.b].includes(c.eu)) throw N.err('seq', 'Sequência desconhecida.', 404); if (w.estado !== 'convite') throw N.err('seq', 'Este convite já não está à espera de resposta.', 400);
  if (b.sim && c.eu !== w.b) throw N.err('seq', 'Só quem foi convidado pode aceitar.', 403);
  await mudar(SQ(w.id), null, o => { if (o.estado !== 'convite') return false; if (b.sim) { o.estado = 'ativa'; o.d0 = lisboa(sqAgora()).d; } else o.estado = c.eu === w.a ? 'cancelado' : 'recusado'; });
  return { seq: await sqPub(await sqLer(w.id), c.eu) }; };
OPS.seqProg = async (c, b, req) => { if (N.limit(req, 'sqp|' + c.eu, 90, 3600e3)) throw N.err('limite', 'Espera um pouco.', 429); let w = await sqLer(String(b.id || ''));
  if (!w || ![w.a, w.b].includes(c.eu)) throw N.err('seq', 'Sequência desconhecida.', 404); if (w.estado !== 'ativa') return { seq: await sqPub(w, c.eu) };
  const hoje = lisboa(sqAgora()).d, k = w.a === c.eu ? 'va' : 'vb', inn = b.v && typeof b.v === 'object' ? b.v : {};
  w = await mudar(SQ(w.id), null, o => { if (o.estado !== 'ativa') return false; const cur = o[k] = o[k] || {}; let mudou = false;
    [diaMais(hoje, -2), diaMais(hoje, -1), hoje].forEach(d => { if (d < o.d0 || !inn[d] || cur[d]) return; cur[d] = 1; mudou = true; }); if (!mudou) return false; });   // só os últimos 3 dias; um dia cumprido não volta atrás
  return { seq: await sqPub(await sqMarcos(w), c.eu) }; };
OPS.seqTerminar = async (c, b) => { const w = await sqLer(String(b.id || '')); if (!w || ![w.a, w.b].includes(c.eu)) throw N.err('seq', 'Sequência desconhecida.', 404);
  await mudar(SQ(w.id), null, o => { if (!['ativa', 'convite'].includes(o.estado)) return false; o.estado = 'fim'; o.fimPor = c.eu; }); return { ok2: true }; };
/* ---------- v3.75: perfil dos animes — o @ (escolhido uma vez, não muda), a foto e o fundo ---------- */
const RESERV = /^(admin|administra|prumo|phantom|superanimes|suporte|equipa|staff|moderador|oficial|sistema)/;
const imgP = (k, id) => 'so/img/' + k + '/' + id;
const PEDIMG = `Esta imagem vai ser a foto ou o fundo de um perfil, ou a foto de um clã (grupo), numa app para pessoas a partir dos 16 anos. Responde SÓ com JSON numa linha: {"ok":true} ou {"ok":false,"motivo":"<curto, em português de Portugal>"}. Bloqueia nudez ou conteúdo sexual, violência explícita, ódio (símbolos ou gestos), drogas e documentos ou dados pessoais visíveis. Permite fotos normais, personagens de anime, paisagens e arte.`;
// v3.89: a IA analisa sempre as fotos (perfil, fundo e clã); se não der para verificar agora, a imagem não entra
const verImg = async (s64, gif) => { const m = await iaImg(s64, gif); N.count('img:' + (m ? (m.ok ? 'ok' : 'barrada') : 'sem-ia'));
  if (!m) throw N.err('img', 'Não deu para verificar a imagem agora. Tenta daqui a pouco.', 503); if (m.ok === false) throw N.err('img', 'Esta imagem não pode ser usada: ' + String(m.motivo || 'não cumpre as regras').slice(0, 120), 400); };
const PEDGIF = `As imagens seguintes são grelhas com quadros de uma imagem animada (GIF) que vai ser a foto ou o fundo de um perfil numa app para pessoas a partir dos 16 anos. Vê TODOS os quadros: se QUALQUER um tiver nudez ou conteúdo sexual, violência explícita, ódio (símbolos ou gestos), drogas ou documentos e dados pessoais visíveis, bloqueia. Responde SÓ com JSON numa linha: {"ok":true} ou {"ok":false,"motivo":"<curto, em português de Portugal>"}. Permite animações normais, personagens de anime, paisagens e arte.`;
const iaImg = async (b64, gif) => { const env = k => String(process.env[k] || '').trim(), to = () => AbortSignal.timeout(gif ? 20000 : 9000), L = gif === 'png' ? [{ d: b64, mt: 'image/png' }] : gif ? b64.map(d => ({ d, mt: 'image/png' })) : [{ d: b64, mt: 'image/jpeg' }], PED = gif === true ? PEDGIF : PEDIMG;
  try { if (env('NAUTILO_MOD_MOCK')) { const r = await fetch(env('NAUTILO_MOD_MOCK'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ img: 1, n: L.reduce((t, x) => t + x.d.length, 0), gif: !!gif, q: L.length }), signal: to() }); return json1(await r.text()); }
    if (env('ANTHROPIC_API_KEY')) { const r = await fetch((env('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com') + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' }, signal: to(),
        body: JSON.stringify({ model: env('NAUTILO_MOD_MODEL') || 'claude-haiku-5-5', max_tokens: 80, messages: [{ role: 'user', content: L.map(x => ({ type: 'image', source: { type: 'base64', media_type: x.mt, data: x.d } })).concat({ type: 'text', text: PED }) }] }) });
      if (r.ok) { const j = await r.json(); const o = json1(((j.content || []).find(c => c.type === 'text') || {}).text); if (o) return o; } }
    if (env('GEMINI_API_KEY')) { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + (env('NAUTILO_MOD_GEMINI') || 'gemini-flash-lite-latest') + ':generateContent?key=' + encodeURIComponent(env('GEMINI_API_KEY')), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: to(),
        body: JSON.stringify({ contents: [{ parts: L.map(x => ({ inline_data: { mime_type: x.mt, data: x.d } })).concat({ text: PED }) }], generationConfig: { temperature: 0, maxOutputTokens: 80, responseMimeType: 'application/json' } }) });
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
  const s64 = String(b.b64 || '');
  if (b.gif === true) { if (!(await podeAnimar(c))) throw N.err('animado', 'A foto e o fundo animados vêm com os planos Avançado e Completo, ou desbloqueiam-se com Selos.', 402);
    const maxG = k === 'fu' ? 3e6 : 15e5; if (!/^[A-Za-z0-9+/=]{400,}$/.test(s64) || s64.length > maxG * 1.37) throw N.err('img', 'O GIF é grande demais (máximo ' + (k === 'fu' ? '3' : '1,5') + ' MB).', 400);
    const buf = Buffer.from(s64, 'base64'); if (!GIF.eGif(buf)) throw N.err('img', 'Envia um GIF.', 400); let q; try { q = GIF.quadros(buf); } catch (e) { throw N.err('img', e.gif ? e.message : 'Não deu para ler este GIF.', 400); }
    await verImg(q.grelhas, true); await N.store().put(imgP(k, c.eu), buf); const ver = Date.now(); await mudar(P(c.eu), null, p => { p[k] = ver; p[k + 'G'] = 1; }); if (k === 'av') await pubPts(c.eu, { av: ver }).catch(() => { }); return { [k]: ver, gif: true }; }
  if (!/^[A-Za-z0-9+/=]{400,}$/.test(s64) || s64.length > max * 1.37) throw N.err('img', 'A imagem é grande demais ou não é válida.', 400);
  const buf = Buffer.from(s64, 'base64'); if (buf[0] !== 0xFF || buf[1] !== 0xD8) throw N.err('img', 'Envia uma imagem (JPEG).', 400);
  await verImg(s64);
  await N.store().put(imgP(k, c.eu), buf); const ver = Date.now(); await mudar(P(c.eu), null, p => { p[k] = ver; }); if (k === 'av') await pubPts(c.eu, { av: ver }).catch(() => { }); return { [k]: ver }; };
OPS.verPerfil = async (c, b) => { const id = String(b.id || '') === 'eu' ? c.eu : String(b.id || ''); if (id === c.eu) { await perfil(c.eu, c.nome); await sincPerfil(c); } if (!ID.test(id)) throw N.err('perfil', 'Perfil desconhecido.', 400); const v = (await ler(P(id), null)).v; if (!v) throw N.err('perfil', 'Perfil desconhecido.', 404);
  const T = (await ler(PTS, {})).v || {}, L = Object.entries(T).filter(([, o]) => o.p > 0).sort((a, b2) => b2[1].p - a[1].p), pos = L.findIndex(([i]) => i === id);
  return { perfil: { id, nome: v.nome, user: v.user || '', av: v.av || 0, fu: v.fu || 0, cl: v.classe || '', pts: (T[id] || {}).p || 0, pos: pos >= 0 ? pos + 1 : 0, clas: (v.clas || []).length, amigo: (v.amigos || []).includes(c.eu), nmed: (v.med || []).length, med: medTopo(v.med || []), pl: v.pl || null, meu: id === c.eu } }; };
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
OPS.desafio = async (c, b) => { const S = semana(), D = await desafioDe(S); semFechar(S).catch(() => { });
  if (D.k === 'pursuit') { const o = (await ler('so/ds/' + S.k, { T: {} })).v || { T: {} }; if ((o.T || {})[c.eu]) { const n = await acertosSemana(S, c.eu); if (n !== o.T[c.eu].v) await mudar('so/ds/' + S.k, { T: {} }, x => { const e = x.T[c.eu]; if (!e) return false; e.v = n; if (n >= D.alvo && !e.at) e.at = Date.now(); }); } }
  return dsVer(c, S, D); };
OPS.desafioEntrar = async (c, b) => { const S = semana(), D = await desafioDe(S), v0 = await perfil(c.eu, c.nome);
  await mudar('so/ds/' + S.k, { T: {} }, x => { x.T = x.T || {}; if (x.T[c.eu]) return false; x.T[c.eu] = { nome: v0.nome, user: v0.user || '', av: v0.av || 0, v: 0, at: 0, upd: Date.now() }; });
  return OPS.desafio(c, b); };
OPS.desafioProg = async (c, b, req) => { const S = semana(), D = await desafioDe(S); if (D.k === 'pursuit') return OPS.desafio(c, b);
  if (N.limit(req, 'dsp|' + c.eu, 40, 3600e3)) throw N.err('limite', 'Espera um pouco.', 429);
  const v = Math.max(0, Math.min(D.alvo * 10, Math.round((+b.v || 0) * 10) / 10));
  let cumpriu = false; await mudar('so/ds/' + S.k, { T: {} }, x => { const e = (x.T || {})[c.eu]; if (!e) return false; e.v = v; e.upd = Date.now(); if (v >= D.alvo && !e.at) { e.at = Date.now(); cumpriu = true; } if (v < D.alvo && e.at) e.at = 0; });
  if (cumpriu) await darMed(c.eu, { k: 'ds:' + S.k, n: 'Desafio da semana cumprido', d: (D.t || 'Desafio') + ' · semana ' + S.k.split('-S')[1], kind: 'Medalha', lvl: 'Mérito', cat: 'Desafios' });
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
  const nov = []; let v0 = null, perfeita = false;
  await mudar('so/ands/' + S.k, { T: {} }, o => { o.T = o.T || {}; let e = o.T[c.eu], mudou = false;
    const ant = x => e && e.v ? e.v[x.k] || 0 : 0, val = x => ANSRV.has(x.m) ? srv[x.m] : vc && vc[x.k] != null ? Math.max(ant(x), Math.max(0, Math.min(x.alvo * 3, Math.round(+vc[x.k] || 0)))) : ant(x); // o progresso do app nunca desce (um aparelho atrasado não apaga o que outro mandou)
    if (!e) { if (!L.some(x => val(x) > 0)) return false; e = o.T[c.eu] = { nome: c.nome, v: {}, ok: {}, pts: 0, at: 0 }; mudou = true; }
    nov.length = 0;
    for (const x of L) { const v = val(x); if (e.v[x.k] !== v) { e.v[x.k] = v; mudou = true; } if (v >= x.alvo && !e.ok[x.k]) { e.ok[x.k] = Date.now(); e.pts = (e.pts || 0) + x.pts; e.at = Date.now(); nov.push(x.pts); mudou = true; } }
    if (!e.bon && L.every(x => e.ok[x.k])) { e.bon = Date.now(); e.pts += ANBONUS; nov.push(ANBONUS); mudou = true; perfeita = true; }
    v0 = e; if (!mudou) return false; e.upd = Date.now(); });
  if (v0 && v0.cl == null) { const pf = await perfil(c.eu, c.nome); await mudar('so/ands/' + S.k, { T: {} }, o => { const e = (o.T || {})[c.eu]; if (!e) return false; e.nome = pf.nome || e.nome; e.user = pf.user || ''; e.av = pf.av || 0; e.cl = pf.classe || ''; }); }
  if (nov.length) { const pf = await perfil(c.eu, c.nome); await somaPts([[c.eu, pf.nome, nov.reduce((a, b) => a + b, 0), { user: pf.user, av: pf.av }]]); }
  if (perfeita) await darMed(c.eu, { k: 'adperf:' + S.k, n: 'Semana perfeita nos Desafios dos Animes', d: 'Semana ' + S.k.split('-S')[1] + ' de ' + S.k.slice(0, 4) + ' · os 3 desafios', kind: 'Medalha', lvl: 'Mérito', cat: 'Desafios' });
  return nov; };
OPS.anDesafios = async (c, b) => { const S = semana(), L = await anDesDe(S); semFechar(S).catch(() => { }); if (L.some(x => ANSRV.has(x.m))) await anGravar(c, S, L, null).catch(() => { }); return anVer(c, S, L); };
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
/* ---------- v3.93 · seele: prémios de verdade e sorteios (campanhas). A administração cria uma campanha: o prémio (real e/ou Selos) de cada lugar,
   o critério (Ranking do Prumo, dias de foco, pontos dos jogos dos Animes da PHANTOM ou livros lidos), o período, quantos ganham e como: por mérito
   (os primeiros ganham) ou por sorteio entre quem se qualifica (os N primeiros, ou quem chega a um mínimo). Entrar é grátis e nunca se paga com Selos;
   uma entrada por conta. O sorteio é verificável: o código (hash) da semente secreta aparece antes e a semente revela-se no fim. Os vencedores são
   confirmados pela administração antes de receber; um sorteio só se publica com a referência da autorização (Brasil: SPA/MF; Portugal: Câmara Municipal). ---------- */
const PRC = id => 'so/pr/c/' + id, PRE = (id, eu) => 'so/pr/e/' + id + '/' + eu, PRU = (id, uid) => 'so/pr/u/' + id + '/' + uid, PRIDX = 'so/pr/idx', PRID = /^[a-f0-9]{10}$/;
const PR_CRIT = {
  prumo: { n: 'Ranking do Prumo', u: 'pontos', d: 'a soma dos pontos de disciplina de cada dia no Ranking do Prumo, no período', parc: 'prumo' },
  foco: { n: 'Dias de foco seguidos', u: 'dias', d: 'a maior sequência de dias de foco (70 pontos ou mais no Ranking do Prumo), no período', parc: 'prumo' },
  animes: { n: 'Jogos dos Animes', u: 'pontos', d: 'os pontos ganhos nos jogos dos Animes da parceria Prumo & PHANTOM (Pursuit, Quiz relâmpago, Sombras, desafios), no período', parc: 'phantom' },
  livros: { n: 'Livros lidos', u: 'livros', d: 'os livros que terminas de ler nas tuas Leituras (com a data de fim dentro do período)', parc: 'prumo' } };
const PR_PAISES = ['PT', 'BR', 'OUTRO'], PR_IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, PR_ACEITAR_DIAS = 14;
const prHoje = () => lisboa().d;
const prEstado = cp => cp.estado === 'rascunho' ? 'rascunho' : cp.estado === 'cancelada' ? 'cancelada' : cp.res ? 'fechada' : prHoje() < cp.ini ? 'breve' : prHoje() > cp.fim ? 'a_fechar' : 'aberta';
const prLer = async id => PRID.test(String(id || '')) ? (await ler(PRC(id), null)).v : null;
const prIdx = async () => ((await ler(PRIDX, { L: [] })).v || {}).L || [];
const prIdxPor = cp => mudar(PRIDX, { L: [] }, o => { o.L = (o.L || []).filter(x => x.id !== cp.id); if (cp.estado !== 'apagada') o.L.unshift({ id: cp.id, estado: cp.res ? 'fechada' : cp.estado, titulo: cp.titulo, fim: cp.fim }); o.L = o.L.slice(0, 200); });
const prPremio = (cp, pos) => { const L = cp.premios || []; return L[Math.min(pos - 1, L.length - 1)] || { t: '', s: 0 }; };
const prPremioTxt = p => [p.t, p.s ? p.s + ' Selos' : ''].filter(Boolean).join(' + ');
// os pontos de cada pessoa no período
const rankDe = async eu => { const i = eu.lastIndexOf('-'); try { const g = await N.store().get('r/' + eu.slice(0, i) + '/' + eu.slice(i + 1)); return g ? N.open(await N.accKey(), g.buf) : null; } catch (e) { return null; } };
const prPts = async (cp, e, T) => { const k = cp.crit;
  if (k === 'livros') return (e.livros || []).length;
  if (k === 'animes') { const t = ((T || {})[e.eu] || {}).p || 0, b = cp.base && cp.base[e.eu] != null ? cp.base[e.eu] : e.base || 0; return Math.max(0, t - b); }
  const r = await rankDe(e.eu), d = (r && r.d) || {}, dias = Object.keys(d).filter(x => x >= cp.ini && x <= cp.fim).sort();
  if (k === 'prumo') return dias.reduce((a, x) => a + (+d[x] || 0), 0);
  let best = 0, run = 0, prev = ''; dias.forEach(x => { if ((+d[x] || 0) >= 70) { run = prev && diaMais(prev, 1) === x ? run + 1 : 1; prev = x; best = Math.max(best, run); } }); return best; };
// na data de início, a fotografia dos pontos dos Animes de toda a gente (o que conta é o que se ganha a partir daí)
const prBase = async cp => { if (cp.crit !== 'animes' || cp.base || cp.estado !== 'publicada' || prHoje() < cp.ini) return cp; const T = (await ler(PTS, {})).v || {}, base = {}; Object.entries(T).forEach(([id, o]) => { base[id] = o.p || 0; });
  return (await mudar(PRC(cp.id), null, o => { if (!o || o.base) return false; o.base = base; }).catch(() => null)) || cp; };
const PRL = new Map();
const prEntradas = async (id, forcar) => { const c = PRL.get(id); if (!forcar && c && Date.now() - c.at < 45e3) return c.L;
  const B = await N.store().list('so/pr/e/' + id + '/').catch(() => []), L = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(8, B.length) }, async () => { while (i < B.length) { const x = B[i++]; const e = (await ler(x.pathname, null)).v; if (e) L.push(e); } }));
  PRL.set(id, { at: Date.now(), L }); if (PRL.size > 50) PRL.delete(PRL.keys().next().value); return L; };
const prTabela = async (cp, forcar) => { const L = await prEntradas(cp.id, forcar), T = cp.crit === 'animes' ? (await ler(PTS, {})).v || {} : null, out = [];
  for (const e of L) out.push({ eu: e.eu, nome: e.nome, user: e.user || '', av: e.av || 0, pais: e.pais || '', at: e.at, email: e.email || '', pts: await prPts(cp, e, T), nl: (e.livros || []).length });
  return out.sort((a, b) => b.pts - a.pts || a.at - b.at); };
const hmacPr = (seed, eu) => N.crypto.createHmac('sha256', seed).update(eu).digest('hex');
// fechar: os pontos finais, os vencedores (mérito ou sorteio) e os suplentes; a semente do sorteio passa a ser pública
const prFechar = async (cp, forcar) => { if (cp.res || cp.estado !== 'publicada' || (!forcar && prEstado(cp) !== 'a_fechar')) return cp;
  cp = await prBase(cp); const tab = await prTabela(cp, true), comPts = tab.filter(x => x.pts > 0), nV = cp.nV || 1; let venc, sup, qual = null;
  if (cp.modo === 'sorteio') { const Q = cp.qual && cp.qual.tipo === 'min' ? comPts.filter(x => x.pts >= (cp.qual.n || 1)) : comPts.slice(0, (cp.qual && cp.qual.n) || 10);
    const ord = Q.map(x => Object.assign({ h: hmacPr(cp.seed, x.eu) }, x)).sort((a, b) => a.h < b.h ? -1 : 1); qual = ord.map(x => ({ quem: x.user ? '@' + x.user : x.nome, h: x.h.slice(0, 16), pts: x.pts }));
    venc = ord.slice(0, nV); sup = ord.slice(nV, nV * 3); }
  else { venc = comPts.slice(0, nV); sup = comPts.slice(nV, nV * 2); }
  const linha = (x, i) => ({ eu: x.eu, nome: x.nome, user: x.user, av: x.av, email: x.email, pts: x.pts, pos: i + 1, nl: x.nl, estado: 'por_confirmar', at: Date.now() });
  const res = { at: Date.now(), n: tab.length, tab: tab.slice(0, 30).map(x => ({ eu: x.eu, nome: x.nome, user: x.user, av: x.av, pts: x.pts })), venc: venc.map(linha), sup: sup.map(x => linha(x, 0)), qual };
  const novo = await mudar(PRC(cp.id), null, o => { if (!o || o.res) return false; o.res = res; }).catch(() => null);
  if (novo) { await prIdxPor(novo).catch(() => { }); N.count('premio:fechado'); return novo; } return (await prLer(cp.id)) || cp; };
const prPub = async (cp, c, adm) => { cp = await prBase(cp); if (prEstado(cp) === 'a_fechar') cp = await prFechar(cp);
  const st = prEstado(cp), cr = PR_CRIT[cp.crit] || {}, o = { id: cp.id, titulo: cp.titulo, desc: cp.desc || '', img: cp.img || '', crit: cp.crit, critN: cr.n, critD: cr.d, unid: cr.u, parc: cr.parc, modo: cp.modo, qual: cp.qual || null, nV: cp.nV, premios: cp.premios || [],
    ini: cp.ini, fim: cp.fim, estado: st, paises: cp.paises || [], idade: cp.idade || 18, autorizacao: cp.autorizacao || '', hash: cp.hash || '', seed: cp.res ? cp.seed : '' };
  if (st === 'rascunho') return Object.assign(o, { n: 0 });
  if (cp.res) { const r = cp.res, eu = c.eu; Object.assign(o, { n: r.n, top: r.tab.slice(0, 10).map((x, i) => ({ nome: x.nome, user: x.user, av: x.av, pts: x.pts, pos: i + 1, eu: x.eu === eu })),
      res: { venc: r.venc.filter(x => x.estado !== 'excluido').map(x => ({ nome: x.nome, user: x.user, av: x.av, pos: x.pos, pts: x.pts, premio: prPremioTxt(prPremio(cp, x.pos)), estado: x.estado, eu: x.eu === eu })), qual: r.qual, nSup: r.sup.length } });
    const meu = r.venc.find(x => x.eu === eu && x.estado !== 'excluido'); if (meu) o.meu = { pos: meu.pos, premio: prPremio(cp, meu.pos), estado: meu.estado, prazo: meu.conf ? meu.conf + PR_ACEITAR_DIAS * DIA : 0 };
    if (adm) o.adm = { venc: r.venc, sup: r.sup, n: r.n }; return o; }
  const tab = await prTabela(cp), i = tab.findIndex(x => x.eu === c.eu), qN = cp.modo === 'sorteio' && cp.qual ? cp.qual : null;
  o.n = tab.length; o.top = tab.slice(0, 10).map((x, k) => ({ nome: x.nome, user: x.user, av: x.av, pts: x.pts, pos: k + 1, eu: x.eu === c.eu }));
  o.eu = i >= 0 ? { dentro: true, pts: tab[i].pts, pos: i + 1, qual: qN ? (qN.tipo === 'min' ? tab[i].pts >= qN.n : i < qN.n && tab[i].pts > 0) : undefined, nl: tab[i].nl } : { dentro: false };
  if (adm) o.adm = { n: tab.length }; return o; };
OPS.premios = async (c, b) => { const idx = await prIdx(), aberta = idx.some(x => x.estado === 'publicada' || x.estado === 'fechada');
  // leve: o que o menu e as outras páginas precisam (há prémios? há um prémio meu à espera? que campanhas estão em jogo?)
  if (b.leve) { let pend = 0; const ativas = [];
    for (const x of idx.filter(x => x.estado === 'fechada').slice(0, 10)) { const cp = await prLer(x.id); if (cp && cp.res && cp.res.venc.some(v => v.eu === c.eu && v.estado === 'confirmado')) pend++; }
    for (const x of idx.filter(x => x.estado === 'publicada').slice(0, 12)) { const cp = await prLer(x.id); if (!cp || cp.res) continue; const st = prEstado(cp); if (st === 'aberta' || st === 'breve') ativas.push({ id: cp.id, titulo: cp.titulo, crit: cp.crit, ini: cp.ini, fim: cp.fim, modo: cp.modo, estado: st, premio: prPremioTxt(prPremio(cp, 1)) }); }
    return { aberta, pend, ativas }; }
  const L = []; for (const x of idx.slice(0, 40)) { if (x.estado === 'rascunho' && !c.adm) continue; if (x.estado === 'cancelada' && !c.adm) continue; const cp = await prLer(x.id); if (cp) L.push(await prPub(cp, c, c.adm)); }
  const ord = { aberta: 0, breve: 1, a_fechar: 2, fechada: 3, rascunho: 4, cancelada: 5 }; L.sort((a, b2) => (ord[a.estado] ?? 9) - (ord[b2.estado] ?? 9) || (a.estado === 'fechada' ? b2.fim.localeCompare(a.fim) : a.fim.localeCompare(b2.fim)));
  return { aberta, lista: L, crits: Object.entries(PR_CRIT).map(([k, v]) => ({ k, n: v.n, u: v.u, d: v.d, parc: v.parc })), pend: L.filter(x => x.meu && x.meu.estado === 'confirmado').length }; };
OPS.premioEntrar = async (c, b, req) => { if (N.limit(req, 'pre|' + c.eu, 30, 3600e3)) throw N.err('limite', 'Muitos pedidos. Tenta daqui a pouco.', 429);
  const cp = await prLer(b.id); if (!cp || cp.estado !== 'publicada' || cp.res) throw N.err('premio', 'Esta campanha não está aberta.', 404); if (prHoje() > cp.fim) throw N.err('premio', 'Esta campanha já terminou.', 400);
  if (c.adm) throw N.err('premio', 'A equipa do Prumo e da seele não pode participar nas campanhas.', 403); if (c.teste) throw N.err('premio', 'As contas de teste não participam.', 403);
  if (!b.idade) throw N.err('premio', `Confirma que tens ${cp.idade || 18} anos ou mais (ou autorização de quem tem a tua guarda).`, 400); if (!b.regras) throw N.err('premio', 'Lê e aceita o regulamento para participar.', 400);
  const pais = PR_PAISES.includes(String(b.pais || '').toUpperCase()) ? String(b.pais).toUpperCase() : 'OUTRO'; if ((cp.paises || []).length && !cp.paises.includes(pais)) throw N.err('premio', 'Esta campanha não está aberta no teu país.', 403);
  try { await N.store().put(PRU(cp.id, c.uid), Buffer.from(JSON.stringify({ eu: c.eu, at: Date.now() })), { overwrite: false }); }
  catch (e) { const g = await N.store().get(PRU(cp.id, c.uid)).catch(() => null), o = g ? JSON.parse(g.buf.toString()) : null; if (!o || o.eu !== c.eu) throw N.err('premio', 'Já há um perfil desta conta nesta campanha (uma entrada por conta).', 409); }
  const pf = await perfil(c.eu, c.nome), T = cp.crit === 'animes' ? (await ler(PTS, {})).v || {} : {};
  await mudar(PRE(cp.id, c.eu), () => ({ eu: c.eu, uid: c.uid, at: Date.now(), livros: [] }), e => { e.nome = pf.nome || c.nome; e.user = pf.user || ''; e.av = pf.av || 0; e.email = c.email; e.pais = pais; if (e.base == null) e.base = (T[c.eu] || {}).p || 0; });
  if (Array.isArray(b.livros) && cp.crit === 'livros') await prLivros(cp, c, b.livros);
  PRL.delete(cp.id); N.count('premio:entrada'); return { campanha: await prPub(await prLer(cp.id), c, false) }; };
const prLivros = async (cp, c, L) => { const fim = cp.fim < prHoje() ? cp.fim : prHoje(), vistos = new Set(), ok = [];
  for (const x of (Array.isArray(L) ? L : []).slice(0, 300)) { const t = String((x && x.t) || '').trim().slice(0, 120), d = String((x && x.fim) || ''); if (t.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < cp.ini || d > fim) continue;
    const k = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); if (!k || vistos.has(k)) continue; vistos.add(k); ok.push({ t, a: String((x && x.a) || '').slice(0, 80), fim: d }); }
  await mudar(PRE(cp.id, c.eu), null, e => { if (!e) return false; e.livros = ok.slice(0, 200); e.lat = Date.now(); }); PRL.delete(cp.id); return ok.length; };
OPS.premioLivros = async (c, b, req) => { if (N.limit(req, 'prl|' + c.eu, 60, 3600e3)) throw N.err('limite', 'Muitos pedidos.', 429); const cp = await prLer(b.id);
  if (!cp || cp.crit !== 'livros' || cp.estado !== 'publicada' || cp.res || prHoje() > cp.fim) return { n: 0 }; if (!(await ler(PRE(cp.id, c.eu), null)).v) return { n: 0 }; return { n: await prLivros(cp, c, b.livros) }; };
OPS.premioAceitar = async (c, b) => { const cp = await prLer(b.id); if (!cp || !cp.res) throw N.err('premio', 'Campanha desconhecida.', 404); let ok = false;
  await mudar(PRC(cp.id), null, o => { const v = o && o.res && o.res.venc.find(x => x.eu === c.eu); if (!v || v.estado !== 'confirmado') return false; v.estado = 'aceite'; v.aceite = Date.now(); ok = true; });
  if (!ok) throw N.err('premio', 'Não há nenhum prémio teu à espera de ser aceite aqui.', 400); return { campanha: await prPub(await prLer(cp.id), c, false) }; };
// a administração: criar e editar (rascunho), publicar, fechar já, cancelar, apagar o rascunho, confirmar ou excluir vencedores, marcar como entregue
const prLimpa = (b, cp) => { const d = b.dados || {}, x = Object.assign({}, cp || {}); const txt = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n), dt = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
  x.titulo = txt(d.titulo, 80); x.desc = String(d.desc || '').trim().slice(0, 900); x.crit = PR_CRIT[d.crit] ? d.crit : 'prumo'; x.modo = d.modo === 'sorteio' ? 'sorteio' : 'merito';
  x.qual = x.modo === 'sorteio' ? { tipo: d.qual && d.qual.tipo === 'min' ? 'min' : 'top', n: Math.max(1, Math.min(1e6, Math.round(+(d.qual && d.qual.n) || 10))) } : null;
  x.nV = Math.max(1, Math.min(50, Math.round(+d.nV || 1))); x.premios = (Array.isArray(d.premios) ? d.premios : []).slice(0, 10).map(p => ({ t: txt(p && p.t, 120), s: Math.max(0, Math.min(100000, Math.round(+(p && p.s) || 0))) })).filter(p => p.t || p.s);
  x.ini = dt(d.ini); x.fim = dt(d.fim); x.paises = (Array.isArray(d.paises) ? d.paises : []).map(p => String(p).toUpperCase()).filter(p => PR_PAISES.includes(p)); x.idade = +d.idade === 16 ? 16 : 18; x.autorizacao = txt(d.autorizacao, 160);
  if (d.img === '') x.img = ''; else if (typeof d.img === 'string' && d.img) { if (d.img.length > 240000 || !PR_IMG.test(d.img)) throw N.err('premio', 'A imagem tem de ser JPEG, PNG ou WebP e pequena (até ~170 KB).', 400); x.img = d.img; }
  return x; };
OPS.adminPremio = async (c, b) => { if (!c.adm) throw N.err('admin', 'Sem acesso.', 403); const ac = String(b.acao || '');
  if (ac === 'guardar') { let cp = b.id ? await prLer(b.id) : null; if (b.id && !cp) throw N.err('premio', 'Campanha desconhecida.', 404); if (cp && cp.estado !== 'rascunho') throw N.err('premio', 'Só se edita uma campanha em rascunho.', 400);
    const x = prLimpa(b, cp); if (x.titulo.length < 3) throw N.err('premio', 'Dá um título à campanha.', 400);
    if (!cp) { x.id = N.crypto.randomBytes(5).toString('hex'); x.estado = 'rascunho'; x.criado = Date.now(); x.por = c.email; await gravar(PRC(x.id), x, { overwrite: false }); } else await gravar(PRC(x.id), x);
    await prIdxPor(x); return { id: x.id }; }
  const cp = await prLer(b.id); if (!cp) throw N.err('premio', 'Campanha desconhecida.', 404);
  if (ac === 'publicar') { if (cp.estado !== 'rascunho') throw N.err('premio', 'Esta campanha já foi publicada.', 400);
    if (!cp.premios.length) throw N.err('premio', 'Diz qual é o prémio (um objeto, Selos ou os dois).', 400); if (!cp.ini || !cp.fim || cp.ini > cp.fim) throw N.err('premio', 'Escolhe as datas de início e de fim.', 400); if (cp.fim < prHoje()) throw N.err('premio', 'A data de fim já passou.', 400);
    if (cp.modo === 'sorteio' && cp.autorizacao.length < 6) throw N.err('premio', 'Um sorteio com prémios precisa de autorização antes de ser publicado (no Brasil, da Secretaria de Prémios e Apostas do Ministério da Fazenda; em Portugal, da Câmara Municipal). Escreve o número da autorização.', 400);
    const seed = N.crypto.randomBytes(32).toString('hex'), o = await mudar(PRC(cp.id), null, v => { v.estado = 'publicada'; v.pub = Date.now(); v.seed = seed; v.hash = N.crypto.createHash('sha256').update(seed).digest('hex'); });
    await prIdxPor(o); await prBase(o); N.count('premio:publicado'); return { ok2: true }; }
  if (ac === 'apagar') { if (cp.estado !== 'rascunho') throw N.err('premio', 'Só se apaga um rascunho. Uma campanha publicada pode ser cancelada.', 400); await N.store().del([PRC(cp.id)]).catch(() => { }); await prIdxPor({ id: cp.id, estado: 'apagada' }); return { ok2: true }; }
  if (ac === 'cancelar') { if (cp.estado !== 'publicada' || cp.res) throw N.err('premio', 'Só se cancela uma campanha publicada que ainda não fechou.', 400); const o = await mudar(PRC(cp.id), null, v => { v.estado = 'cancelada'; v.canc = Date.now(); }); await prIdxPor(o); return { ok2: true }; }
  if (ac === 'fechar') { if (cp.estado !== 'publicada' || cp.res) throw N.err('premio', 'Esta campanha não está aberta.', 400); const o = await prFechar(cp, true); return { ok2: true, venc: (o.res && o.res.venc.length) || 0 }; }
  const eu = String(b.eu || ''); if (!cp.res || !ID.test(eu)) throw N.err('premio', 'Vencedor desconhecido.', 400); let alvo = null, novoVenc = null;
  if (ac === 'confirmar') { await mudar(PRC(cp.id), null, o => { const v = o.res.venc.find(x => x.eu === eu); if (!v || v.estado !== 'por_confirmar') return false; v.estado = 'confirmado'; v.conf = Date.now(); alvo = Object.assign({}, v); });
    if (alvo) { const pr = prPremio(cp, alvo.pos); if (pr.s) await ganha(eu, pr.s, 'Prémio da seele: ' + cp.titulo, 'pr:' + cp.id + ':' + eu, true);
      await darMed(eu, { k: 'pr:' + cp.id, n: alvo.pos === 1 ? 'Venceu um prémio da seele' : alvo.pos + '.º lugar num prémio da seele', d: cp.titulo + (pr.t ? ' · ' + pr.t : ''), kind: 'Troféu', lvl: LUG[Math.min(2, alvo.pos - 1)], cat: 'seele', lugar: alvo.pos });
      try { const m = require('./conta').mailRaw; if (m && alvo.email && (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.NAUTILO_EMAIL_MOCK)) await m(alvo.email, 'Ganhaste um prémio no Prumo: ' + cp.titulo, `Olá ${alvo.nome}!\n\nGanhaste ${prPremioTxt(pr)} na campanha "${cp.titulo}" da parceria Prumo & seele.\n\nAbre o Prumo › seele e carrega em "Aceitar o prémio" até ${PR_ACEITAR_DIAS} dias a partir de hoje.${pr.t ? ' Depois, a equipa contacta-te por este e-mail para combinar a entrega.' : ''}\n\nParabéns!\nA equipa do Prumo`); } catch (e) { } }
    return { ok2: !!alvo }; }
  if (ac === 'excluir') { await mudar(PRC(cp.id), null, o => { const v = o.res.venc.find(x => x.eu === eu); if (!v || v.estado === 'excluido' || v.estado === 'entregue') return false; v.estado = 'excluido'; v.motivo = String(b.motivo || '').slice(0, 200); v.exc = Date.now();
      const s0 = (o.res.sup || []).shift(); if (s0) { novoVenc = Object.assign({}, s0, { pos: v.pos, estado: 'por_confirmar', at: Date.now(), sub: eu }); o.res.venc.push(novoVenc); o.res.venc.sort((a, b2) => a.pos - b2.pos || (a.estado === 'excluido' ? 1 : -1)); } });
    return { ok2: true, suplente: novoVenc ? novoVenc.nome : '' }; }
  if (ac === 'entregue') { let ok = false; await mudar(PRC(cp.id), null, o => { const v = o.res.venc.find(x => x.eu === eu); if (!v || !['confirmado', 'aceite'].includes(v.estado)) return false; v.estado = 'entregue'; v.ent = Date.now(); ok = true; }); return { ok2: ok }; }
  throw N.err('premio', 'Pedido desconhecido.', 400); };
module.exports = N.handler(async (req, res) => {
  // o nome do parceiro (público, para o app o mostrar antes de entrar na conta)
  if (req.method === 'GET' && String((req.query || {}).op || '') === 'img') { const q = req.query || {}, k = q.k === 'fu' ? 'fu' : q.k === 'cla' ? 'cla' : 'av', id = String(q.id || ''); if (!(k === 'cla' ? CID : ID).test(id) || N.limit(req, 'simg', 300, 60e3)) return N.send(res, 400, { ok: false });
    const g = await N.store().get(imgP(k, id)).catch(() => null); if (!g) return N.send(res, 404, { ok: false }); res.statusCode = 200; res.setHeader('content-type', GIF.eGif(g.buf) ? 'image/gif' : 'image/jpeg'); res.setHeader('cache-control', 'public, max-age=86400'); res.setHeader('x-content-type-options', 'nosniff'); return res.end(g.buf); }
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
  await sincPerfil(c).catch(() => { });
  const st = { eu: c.eu, n: 0 }, r = await ALS.run(st, () => OPS[op](c, b, req));
  return N.send(res, 200, Object.assign({ ok: true }, r, st.n ? { selosGanhos: st.n } : {}));
});
module.exports._regras = regras; module.exports._lisboa = lisboa; module.exports._semana = semana; module.exports._SELOS = SELOS;
