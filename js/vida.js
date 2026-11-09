/* PRUMO — Projeto de Vida no Dominus (v2.54).
   - Os 1000 objetivos do Ryan (10 eixos × 100, do documento dele) entram no Dominus com a dificuldade de cada um
     (marco 2 500 · grande 6 000 · épico 12 000 · lendário 25 000 · mítico 50 000 XP). Só na conta dele.
   - Cruzados com o Codex: os 81 objetivos que já eram marcos do Codex ficam ligados. O marco feito conta o objetivo, e o
     XP vem só uma vez (do Codex). Nada do Codex sai.
   - Verificados pelos teus registos (universidade, livros, países, carteira, reserva, cadeiras, competências, certificações,
     treinos…): o que já está provado conta sozinho. O que é provável (biografia, perfil, países onde já estiveste) fica
     "por confirmar": tu dizes se sim e quando.
   - O que já tinhas feito antes de o Projeto de Vida entrar no Dominus conta metade e não fere o chefe nem o colosso.
   - Cada objetivo pode virar meta (com prazo e etapas): é aí que nascem as missões, o chefe da semana e o colosso.
   - Contas públicas: a mesma estrutura de 10 eixos, vazia, para escreverem ou colarem a lista delas. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc, today = () => U.today(), safe = (f, d) => { try { return f(); } catch (e) { return d; } };
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const AL = { c: 'corpo', m: 'mente', i: 'intelecto', f: 'fortuna', r: 'relacoes', e: 'espirito', k: 'carreira', d: 'disciplina' };
const TX = [0, 2500, 6000, 12000, 25000, 50000], TN = ['', 'Marco', 'Grande', 'Épico', 'Lendário', 'Mítico'], PRE = .5, REVXP = 3000;
const HOR = ['', '3 meses', '1 ano', '1 ano', '3 anos', 'Longo prazo'];
OS.ONE_DEF.vida = { since: '', done: {}, off: [], own: [], ed: {}, no: {}, rev: {} };
const S = () => { const s = OS.one('vida'); ['done', 'ed', 'no', 'rev'].forEach(k => { if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {}; }); ['off', 'own'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; }); return s; };
let QUIET = 0; const save = () => OS.touch('vida'), qsave = () => { QUIET++; try { save(); } finally { QUIET--; } };
const pub = () => !!(OS.Acc && OS.Acc.pub);
const CATS = () => OS.VIDA0 || [];
const ao = a => ((OS.Dom && OS.Dom.AT) || []).find(x => x.k === a) || { n: a, c: '#38BDF8' };
const ic = (n, c = '') => UI.ic(n, c);
const bar = (p, c) => `<span class="d3-bar"><i style="width:${Math.round(U.clamp(p || 0, 0, 1) * 100)}%;${c ? 'background:' + c : ''}"></i></span>`;
const xpTxt = x => U.nf(Math.round(x));
const V = OS.Vida = {};

/* ---------- a lista ---------- */
let LIST = null, GI = null, VER = 0; OS.on('one:vida', () => { LIST = null; }); OS.on('change', () => { GI = null; VER++; }); OS.on('remote', () => { LIST = null; GI = null; VER++; });
const mk = (ci, n, t, tier, a, x) => Object.assign({ id: 'v' + (ci + 1) + '.' + n, c: ci, n, t, tier, a: AL[a] || 'disciplina' }, x);
const all = () => { if (LIST) return LIST; const s = S(), out = [];
  if (!pub()) CATS().forEach((c, ci) => { c.it.forEach((t, i) => { const id = 'v' + (ci + 1) + '.' + (i + 1); out.push(mk(ci, i + 1, s.ed[id] || t, +c.t[i] || 2, c.a[i], (c.prop || []).includes(i + 1) ? { prop: 1 } : {})); });
    (c.novos || []).forEach(([t, ti, a, src], j) => out.push(mk(ci, 101 + j, s.ed['v' + (ci + 1) + '.' + (101 + j)] || t, ti, a, { novo: 1, src }))); });
  s.own.forEach(o => { if (o && o.id && o.t) out.push({ id: o.id, c: U.clamp(+o.c || 0, 0, 9), n: 0, t: o.t, tier: U.clamp(+o.tier || 2, 1, 5), a: AL[o.a] ? AL[o.a] : (Object.values(AL).includes(o.a) ? o.a : 'disciplina'), own: 1 }); });
  const off = new Set(s.off); LIST = out.filter(o => !off.has(o.id)); LIST.off = out.filter(o => off.has(o.id)); LIST.by = Object.fromEntries(out.map(o => [o.id, o])); return LIST; };
V.list = all; V.has = () => all().length > 0;
const byId = id => all().by[id];

/* ---------- ligações: Codex, metas ---------- */
const cxOf = o => { if (pub() || !OS.VIDAX || !OS.VIDAX[o.id] || !OS.Dom || !OS.Dom.LEG) return null; const [p, j] = OS.VIDAX[o.id], t = (OS.Dom.LEG[p] || [])[j]; return t ? { p, t, pn: (OS.Dom.LEGN || {})[p] || p } : null; };
const cxDone = o => { const c = cxOf(o); if (!c) return null; const m = ((OS.one('dominus').legacy || {})[c.p] || []).find(x => x && x.t === c.t); return m ? Object.assign({}, c, { d: m.d }) : null; };
const gIdx = () => { if (GI) return GI; GI = {}; OS.all('goals').forEach(g => { if (g.vid && g.status !== 'Abandonada') (GI[g.vid] = GI[g.vid] || []).push(g); }); return GI; };
const goalOf = o => { const L = gIdx()[o.id] || []; return L.find(g => g.status === 'Ativa') || L.find(g => g.status === 'Concluída') || L[0] || null; };
V.goalOf = goalOf;
const doneOf = o => { const s = S(), r = s.done[o.id]; if (r && r.d) return r; const cx = cxDone(o); if (cx) return { d: cx.d, how: 'codex', proof: `Marco do Codex (${cx.pn}): ${cx.t}`, pre: cx.d && s.since && cx.d < s.since ? 1 : 0 };
  const g = (gIdx()[o.id] || []).find(x => x.status === 'Concluída'); if (g) return { d: g.doneAt || (g._u ? U.iso(new Date(g._u)) : today()), how: 'meta', proof: 'Meta cumprida: ' + g.title }; return null; };
V.doneOf = doneOf;
const xpOf = (o, r) => { if (!r || r.how === 'codex' || cxDone(o)) return 0; let x = TX[o.tier] || 0; if (r.how === 'meta') x *= .5; if (r.pre) x *= PRE; return Math.round(x); };
V.xpOf = o => xpOf(o, doneOf(o));
V.TX = TX; V.TN = TN;

/* ---------- verificação pelos teus registos ---------- */
const prof = () => OS.one('profile'), me = () => OS.one('me') || {};
const ms = () => safe(() => OS.Mundo.stats(), { n: 0, conts: 0 });
const livesPT = () => /aveiro|lisboa|porto|coimbra|braga|faro|portugal/.test(N(prof().city)) || !!me().ptSince;
const been = c3 => safe(() => { const m = OS.Mundo.mine()[c3]; return !!(m && OS.Mundo.been(m)); }, false) || (c3 === 'PRT' && livesPT()) || (c3 === 'BRA' && /brasil/.test(N(me().nationality)));
const cname = c3 => safe(() => OS.Mundo.name(c3), '') || ({ PRT: 'Portugal', BRA: 'Brasil' })[c3] || c3;
const books = () => OS.all('books').filter(b => b.status === 'Lido').length + OS.all('learn').filter(l => l.kind === 'Livro' && l.status === 'Concluído').length;
const assets = re => OS.all('assets').filter(a => re.test(a.cls || '') && safe(() => OS.Inv.pos(a).qty > 0, true)).length;
const KW = s => N(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !/^(para|como|nivel|avancad[oa]|grandes|todos|todas)$/.test(w));
const covers = (name, want) => { const n = N(name); return want.length && want.every(w => n.includes(w.slice(0, Math.max(5, w.length - 2)))); };
const subj = (x, dom) => { const W = KW(x); if (!W.length) return null; const S0 = OS.all('subjects').filter(s => covers(s.name, W)), ok = S0.find(s => s.status === 'Aprovada' || U.num(s.final) >= 10);
  if (ok) { const f = U.num(ok.final); return dom && f && f < 14 ? { sug: `Aprovaste a ${ok.name} com ${U.nf(f)}. Já dominas?` } : { ok: 1, why: `Cadeira aprovada: ${ok.name}${f ? ' (' + U.nf(f) + ')' : ''}` }; }
  const L = OS.all('learn').find(l => l.status === 'Concluído' && covers(l.title, W)); if (L) return dom ? { sug: `Concluíste "${L.title}". Já dominas?` } : { ok: 1, why: 'Concluíste: ' + L.title, d: L.end };
  const cur = S0.find(s => s.status === 'Em curso') || OS.all('learn').find(l => l.status === 'Em curso' && covers(l.title, W)); return cur ? { hint: 'Em curso: ' + (cur.name || cur.title) } : null; };
const skill = (x, need) => { const W = KW(x), k = OS.all('skills').find(s => covers(s.name, W)); if (!k) return subj(x, need >= 5); const l = U.num(k.level);
  return l >= need ? { ok: 1, why: `Competência "${k.name}" no nível ${l} de 5` } : { c: l, n: need, u: 'de nível em ' + k.name }; };
const cert = x => { const W = KW(x.replace(/[-–]/g, ' ')).concat((x.match(/\d+/) || []).map(String)), m = c => covers(c, W.length ? W : [N(x)]);
  const c = OS.all('certs').find(z => m(z.name || '') && z.status === 'Obtida') || OS.all('learn').find(l => l.kind === 'Certificação' && l.status === 'Concluído' && m(l.title));
  if (c) return { ok: 1, why: 'Certificação obtida: ' + (c.name || c.title), d: c.date || c.end };
  const p = OS.all('certs').find(z => m(z.name || '')) || OS.all('learn').find(l => l.kind === 'Certificação' && m(l.title)); return p ? { hint: 'A preparar: ' + (p.name || p.title) } : null; };
const recent = (coll, days, f) => OS.all(coll).filter(x => (x.date || '') >= U.addDays(today(), -days) && (!f || f(x))).length;
const PLACE = { 'Londres': 'GBR', 'Paris': 'FRA', 'Nova York': 'USA', 'Washington': 'USA', 'Boston': 'USA', 'Chicago': 'USA', 'São Francisco': 'USA', 'Los Angeles': 'USA', 'Miami': 'USA', 'Toronto': 'CAN', 'Vancouver': 'CAN', 'Montreal': 'CAN',
  'Lisboa': 'PRT', 'Porto': 'PRT', 'Coimbra': 'PRT', 'Madrid': 'ESP', 'Barcelona': 'ESP', 'Sevilha': 'ESP', 'Roma': 'ITA', 'Milão': 'ITA', 'Florença': 'ITA', 'Veneza': 'ITA', 'Berlim': 'DEU', 'Munique': 'DEU', 'Frankfurt': 'DEU',
  'Zurique': 'CHE', 'Genebra': 'CHE', 'Viena': 'AUT', 'Praga': 'CZE', 'Amesterdão': 'NLD', 'Bruxelas': 'BEL', 'Copenhague': 'DNK', 'Estocolmo': 'SWE', 'Oslo': 'NOR', 'Helsínquia': 'FIN', 'Atenas': 'GRC', 'Istambul': 'TUR',
  'Dubai': 'ARE', 'Abu Dhabi': 'ARE', 'Singapura': 'SGP', 'Hong Kong': 'HKG', 'Tóquio': 'JPN', 'Kyoto': 'JPN', 'Osaka': 'JPN', 'Seul': 'KOR', 'Pequim': 'CHN', 'Xangai': 'CHN', 'Bangkok': 'THA', 'Bali': 'IDN', 'Sydney': 'AUS',
  'Melbourne': 'AUS', 'Auckland': 'NZL', 'Cidade do Cabo': 'ZAF', 'Joanesburgo': 'ZAF', 'Cairo': 'EGY', 'Marraquexe': 'MAR', 'Buenos Aires': 'ARG', 'Santiago': 'CHL', 'Montevidéu': 'URY', 'Lima': 'PER', 'Bogotá': 'COL',
  'Cidade do México': 'MEX', 'Rio de Janeiro': 'BRA', 'São Paulo': 'BRA', 'Brasília': 'BRA', 'Salvador': 'BRA', 'Costa Amalfitana': 'ITA', 'Maldivas': 'MDV', 'Seychelles': 'SYC', 'Ilhas Maurício': 'MUS', 'Polinésia Francesa': 'PYF',
  'Islândia': 'ISL', 'Amazônia': 'BRA', 'Cataratas do Iguaçu': 'BRA', 'Cataratas do Niágara': 'CAN', 'Grand Canyon': 'USA', 'Machu Picchu': 'PER', 'pirâmides do Egito': 'EGY', 'Petra': 'JOR', 'Grande Muralha da China': 'CHN',
  'Taj Mahal': 'IND', 'Coliseu de Roma': 'ITA', 'Acrópole de Atenas': 'GRC', 'Palácio de Versalhes': 'FRA', 'Palácio de Buckingham': 'GBR', 'Castelo de Neuschwanstein': 'DEU', 'Museu do Louvre': 'FRA', 'Museu Britânico': 'GBR',
  'Metropolitan Museum of Art': 'USA', 'Museu do Prado': 'ESP', 'Museu do Vaticano': 'VAT', 'Teatro alla Scala': 'ITA', 'Ópera de Paris': 'FRA', 'Royal Opera House': 'GBR' };
const place = x => { const c3 = PLACE[x]; if (!c3) return null; const home = [me().hometown, me().birthplace, prof().city].some(h => h && N(h).includes(N(x)));
  if (home) return { sug: `É a tua terra (${x}). Conta como conhecida?` }; return been(c3) ? { sug: `Já estiveste em ${cname(c3)}. Conheceste ${x}?` } : null; };
const RULES = [
  [/^Concluir o ensino médio$/, () => prof().uni ? { ok: 1, why: 'Estás na universidade: ' + prof().uni, d: prof().semStart } : null],
  [/^Ingressar em uma universidade$/, () => prof().uni ? { ok: 1, why: 'Inscrito em ' + prof().uni, d: prof().semStart } : null],
  [/universidade de referência na Europa/, () => prof().uni && livesPT() ? { sug: `Estudas em ${prof().uni}. Conta como universidade de referência na Europa?` } : null],
  [/^Ler ([\d.]+) livros$/, m => { const n = +m[1].replace(/\./g, ''), c = books(); return { ok: c >= n, c, n, u: 'livros lidos' }; }],
  [/^Conhecer pelo menos (\d+) países$/, m => ({ ok: ms().n >= +m[1], c: ms().n, n: +m[1], u: 'países' })],
  [/^Conhecer todos os continentes$/, () => ({ ok: ms().conts >= 6, c: ms().conts, n: 6, u: 'continentes' })],
  [/^Alcançar (?:meus primeiros )?€\s?([\d.]+) investidos$/, m => { const n = +m[1].replace(/\./g, ''), c = Math.round(safe(() => OS.Inv.value(), 0)); return { ok: c >= n, c, n, u: '€ na carteira' }; }],
  [/^Alcançar €\s?([\d,]+) (?:milhão|milhões) em patrimônio$/, m => { const n = +m[1].replace(',', '.') * 1e6, c = Math.round(safe(() => OS.Fin.netWorth(), 0)); return { ok: c >= n, c, n, u: '€ de património líquido' }; }],
  [/primeira reserva de emergência/, () => { const n = U.num(prof().emergencyTarget) || 1000, c = Math.round(safe(() => OS.Fin.reserve(), 0)); return { ok: c >= n, c, n, u: '€ de reserva' }; }],
  [/^Construir uma carteira de ações$/, () => { const c = assets(/^(Ação|BDR)$/); return { ok: c >= 5, c, n: 5, u: 'ações na carteira' }; }],
  [/^Investir em fundos de índice$/, () => { const c = assets(/^ETF$/); return { ok: c >= 1, c, n: 1, u: 'ETF na carteira' }; }],
  [/^Investir em fundos de investimento$/, () => { const c = assets(/^(Fundo|FII|PPR)$/); return { ok: c >= 1, c, n: 1, u: 'fundos na carteira' }; }],
  [/^Investir em títulos públicos$/, () => { const c = assets(/Título público|Tesouro|Certificados/); return { ok: c >= 1, c, n: 1, u: 'títulos públicos' }; }],
  [/^Obter (?:a certificação|uma certificação) (.+?)(?:, se ainda pertinente)?$/, m => cert(m[1])],
  [/^Tornar-me fluente em (inglês|espanhol)$/, m => skill(m[1], 5)],
  [/^Aprender (Python|SQL|Power BI|francês|alemão)$/, m => skill(m[1], 3)],
  [/^Dominar Excel/, () => skill('Excel', 5)],
  [/^Dominar (.+)$/, m => subj(m[1], 1)],
  [/^Estudar (?!em |Matemática em)(.+)$/, m => subj(m[1])],
  [/^Construir uma rotina de exercícios físicos$/, () => { const c = recent('workouts', 56); return { ok: c >= 24, c, n: 24, u: 'treinos nas últimas 8 semanas' }; }],
  [/^Praticar musculação regularmente$/, () => { const c = recent('workouts', 84); return { ok: c >= 36, c, n: 36, u: 'treinos nas últimas 12 semanas' }; }],
  [/^Praticar corrida$/, () => { const c = recent('runs', 84); return { ok: c >= 24, c, n: 24, u: 'corridas nas últimas 12 semanas' }; }],
  [/^Criar um sistema pessoal de organização de leituras$/, () => { const c = OS.all('books').length; return c >= 15 ? { ok: 1, why: `Organizas ${c} livros na Biblioteca do Prumo` } : { c, n: 15, u: 'livros organizados' }; }],
  [/^Manter um diário intelectual$/, () => { const c = OS.all('notes').length; return c >= 50 ? { sug: `Tens ${c} notas no Prumo. É um diário intelectual?` } : null; }],
  [/^Conseguir o meu primeiro emprego$/, (m, o) => { const e = OS.all('experiences').filter(x => x.kind === 'Emprego').sort((a, b) => String(a.start).localeCompare(String(b.start)));
    if (e.length) return { ok: 1, why: 'Primeiro emprego: ' + e[0].title + (e[0].org ? ' · ' + e[0].org : ''), d: e[0].start }; if (prof().employer || OS.all('shifts').length) return { ok: 1, why: 'Tens turnos de trabalho registados' + (prof().employer ? ' (' + prof().employer + ')' : '') };
    return o.src === 'bio' ? { sug: 'A tua biografia diz que já trabalhaste. Confirma quando foi o primeiro emprego.' } : null; }],
  [/^Concluir um curso de (.+)$/, (m, o) => { const W = KW(m[1]), L = OS.all('learn').find(l => l.status === 'Concluído' && covers(l.title, W)); if (L) return { ok: 1, why: 'Curso concluído: ' + L.title, d: L.end };
    return o.src === 'bio' ? { sug: `Na tua biografia falas de um curso de ${m[1]}. Concluíste-o?` } : null; }],
  [/^Mudar-me para Portugal/, () => livesPT() ? { sug: me().ptSince ? 'Em Portugal desde ' + U.fmtD(me().ptSince) + '.' : `O teu perfil diz que vives em ${prof().city || 'Portugal'}.`, d: me().ptSince } : null],
  [/^Conhecer Aveiro profundamente$/, () => /aveiro/.test(N(prof().city)) ? { sug: 'Vives em Aveiro. Já a conheces a fundo?' } : null],
  [/^(?:Conhecer|Visitar|Ver) (?:a |o |as |os )?(.+)$/, m => place(m[1])]];
const RM = new Map();
const detect = o => { let k = RM.get(o.t); if (k === undefined) { k = RULES.findIndex(([re]) => re.test(o.t)); RM.set(o.t, k); } if (k < 0) return null;
  const [re, f] = RULES[k]; return safe(() => f(o.t.match(re), o) || null, null); };
V.detect = detect;

/* aplica sozinho o que os registos já provam (a primeira vez, tudo o que encontrar conta como "já tinhas feito": metade do XP) */
V.sync = () => { if (!V.has()) return 0; const s = S(), first = !s.since, T = today(); let n = 0; const got = [];
  if (first) s.since = T;
  all().forEach(o => { if (s.done[o.id] || s.no[o.id] === 'x' || doneOf(o)) return; const r = detect(o); if (!r || !r.ok) return; const d = r.d && /^\d{4}-\d\d-\d\d$/.test(r.d) && r.d <= T ? r.d : T, pre = first || d < s.since ? 1 : 0;
    s.done[o.id] = { d: pre ? d : T, how: 'auto', proof: r.why || `${U.nf(r.c)} ${r.u}`, pre }; n++; got.push(o); });
  // a primeira vez é só a importação do que já tinhas feito: grava em silêncio (sem redesenhar o ecrã de repente; aparece no próximo desenho)
  if (first) { LIST = null; OS.touchQuiet ? OS.touchQuiet('vida') : qsave(); } else if (n) { LIST = null; qsave(); }
  if (n && !first) UI.toast(n === 1 ? `Objetivo de vida conquistado: ${got[0].t} (+${xpTxt(xpOf(got[0], S().done[got[0].id]))} XP)` : `${n} objetivos de vida conquistados pelos teus registos`, 'pos');
  return n; };
let SY = 0; OS.on('change', c => { if (['books', 'learn', 'subjects', 'skills', 'certs', 'assets', 'invtx', 'transactions', 'workouts', 'runs', 'experiences', 'shifts', 'goals', 'notes'].includes(c)) { clearTimeout(SY); SY = setTimeout(() => safe(V.sync), 3000); } });
OS.on('ready', () => setTimeout(() => safe(V.sync), 3500));

/* ---------- XP para o Dominus ---------- */
V.events = () => { const s = S(), E = []; all().forEach(o => { const r = doneOf(o), x = xpOf(o, r); if (x > 0 && r.d) E.push({ d: String(r.d).slice(0, 10), a: o.a, x, t: (r.pre ? 'Objetivo de vida (já feito): ' : 'Objetivo de vida: ') + o.t, g: 'v', pre: r.pre ? 1 : 0 }); });
  Object.entries(s.rev).forEach(([y, r]) => { if (r && r.d) E.push({ d: r.d, a: 'disciplina', x: REVXP, t: 'Revisão anual do Projeto de Vida ' + y, g: 'v' }); }); return E; };
V.count = () => { const L = all(); return { done: L.filter(o => doneOf(o)).length, tot: L.length, meta: L.filter(o => { const g = goalOf(o); return g && g.status === 'Ativa'; }).length }; };
V.activeGoals = () => OS.all('goals').filter(g => g.status === 'Ativa' && g.vid && byId(g.vid));
V.next = () => { const L = all(); return CATS().map((c, ci) => L.find(o => o.c === ci && !doneOf(o) && !goalOf(o))).filter(Boolean); };
V.sugs = () => { const s = S(), k = o => o.novo ? 0 : /^(Conhecer|Visitar|Ver) /.test(o.t) ? 2 : 1; return all().filter(o => !s.no[o.id] && !doneOf(o)).map(o => [o, detect(o)]).filter(([, r]) => r && r.sug).sort((a, b) => k(a[0]) - k(b[0])); };

/* metas que já tens e parecem um objetivo da lista */
const STOPW = new Set('para pelo pela com sem que uma meu minha meus minhas dos das nos nas como cada todos todas este esta fazer ter ser conseguir alcancar construir desenvolver aprender estudar obter criar'.split(' '));
const words = s => [...new Set(N(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOPW.has(w)))];
V.linkable = () => { const L = all().filter(o => !doneOf(o) && !goalOf(o)), WL = L.map(o => [o, words(o.t)]);
  return OS.all('goals').filter(g => g.status === 'Ativa' && !g.vid).map(g => { const W = words(g.title); let best = null, bs = 0;
    WL.forEach(([o, w]) => { const sh = w.filter(x => W.includes(x)), sc = sh.length + sh.filter(x => x.length >= 7).length * .6 + (/\d/.test(g.title) && (o.t.match(/\d[\d.,]*/g) || []).some(n => g.title.includes(n)) ? 1 : 0); if (sc > bs) { bs = sc; best = o; } });
    return bs >= 1.6 ? [g, best] : null; }).filter(Boolean); };

/* ---------- ações ---------- */
const GCATOF = o => o.a === 'corpo' ? (/corr|maratona|\bkm\b/i.test(o.t) ? 'Corrida' : 'Academia') : o.a === 'intelecto' ? 'Estudos' : o.a === 'carreira' ? (o.c === 2 ? 'Empresa' : 'Trabalho') : o.a === 'fortuna' ? 'Finanças' : [4, 6].includes(o.c) && o.a === 'mente' ? 'Outros' : 'Desenvolvimento pessoal';
const dimN = c => (CATS()[c] || {}).n || 'Eixo ' + (c + 1);
const numOf = o => o.own ? 'teu' : o.novo ? 'novo' : String(o.n);
A.vdMeta = b => { const o = byId(b.dataset.id); if (!o) return; const g = goalOf(o); if (g && g.status === 'Ativa') { location.hash = 'metas'; return; }
  UI.openForm('goals', null, { title: o.t, cat: GCATOF(o), horizon: HOR[o.tier] || '1 ano', importance: Math.min(5, 2 + o.tier), vid: o.id, start: today(), why: `Do meu Projeto de Vida: ${dimN(o.c)}${o.own ? '' : ' · ' + numOf(o)}.` }); };
A.vdLink = b => { const g = OS.get('goals', b.dataset.g), o = byId(b.dataset.id); if (!g || !o) return; OS.upd('goals', g.id, { vid: o.id }); GI = null; UI.toast(`Meta ligada ao objetivo "${o.t}"`, 'pos'); };
A.vdOk = b => { const o = byId(b.dataset.id); if (!o) return; const s = S(), r = doneOf(o);
  if (r) { if (r.how === 'codex') { UI.toast('Conta pelo marco do Codex. Para desmarcar, desmarca-o no Codex.', 'warn'); return; } if (r.how === 'meta') { UI.toast('Conta pela meta cumprida. Muda o estado da meta para desmarcar.', 'warn'); return; }
    UI.ask('Desmarcar este objetivo?', `"${esc(o.t)}" volta a estar por conquistar e perdes os ${xpTxt(xpOf(o, r))} XP.`, 'Desmarcar', () => { delete s.done[o.id]; if (r.how === 'auto') s.no[o.id] = 'x'; LIST = null; save(); OS.request(); }); return; }
  const det = detect(o), cx = cxOf(o), need = o.tier >= 2 ? 10 : 0, x0 = TX[o.tier];
  UI.modal(`<form class="d3-proof" data-form="vdProof" data-id="${esc(o.id)}"><div class="cz d3-k">Projeto de Vida · ${esc(dimN(o.c))} · ${esc(TN[o.tier])}</div><h3>${esc(o.t)}</h3>
    <p class="dm">${det && det.sug ? esc(det.sug) + ' ' : ''}Só conta o que é verdade. ${need ? 'Escreve a prova: o certificado, o valor, o sítio, a data, quem estava lá.' : 'Diz quando foi.'}</p>
    ${cx ? `<p class="dm vd-cx">${ic('flag')} Ligado ao marco do Codex "${esc(cx.t)}". Quando o provares lá, o XP passa a vir do Codex (não conta a dobrar).</p>` : ''}
    <label class="d3-pl"><span>A prova${need ? '' : ' (opcional)'}</span><textarea class="field" name="proof" rows="3" ${need ? `required minlength="${need}"` : ''} placeholder="Ex.: diploma recebido em julho de 2025"></textarea></label>
    <label class="d3-pl"><span>Quando foi</span><input class="field" type="date" name="d" value="${esc(det && det.d && det.d <= today() ? det.d : today())}" max="${today()}" required></label>
    <p class="dm vd-xpn">Vale ${xpTxt(x0)} XP. Se foi antes de ${U.fmtD(S().since || today())} (quando o Projeto de Vida entrou no Dominus), conta metade: ${xpTxt(x0 * PRE)} XP.</p>
    <div class="d3-pa"><button type="button" class="dbtn sm" data-mclose>Ainda não</button><button class="dbtn gold">Conquistei</button></div></form>`); };
OS.forms.vdProof = (f, v) => { const o = byId(f.dataset.id); if (!o) return; const proof = v('proof').replace(/\s+/g, ' ').trim(), d = v('d') || today(), s = S();
  if (o.tier >= 2 && proof.length < 10) { UI.toast('Escreve uma prova a sério (10 letras ou mais).', 'warn'); return false; }
  if (!s.since) s.since = today(); const pre = d < s.since ? 1 : 0; s.done[o.id] = { d: d > today() ? today() : d, how: 'prova', proof: proof.slice(0, 400), pre }; delete s.no[o.id]; LIST = null; save(); UI.closeModal();
  UI.toast(`Objetivo de vida conquistado: +${xpTxt(xpOf(o, s.done[o.id]))} XP em ${ao(o.a).n}${pre ? ' (já feito antes: metade)' : ''}`, 'pos'); };
A.vdNo = b => { const s = S(); s.no[b.dataset.id] = 1; LIST = null; save(); };
A.vdOff = b => { const o = byId(b.dataset.id); if (!o) return; UI.ask('Tirar este objetivo?', `"${esc(o.t)}" sai do teu Projeto de Vida. Podes repô-lo depois.`, 'Tirar', () => { const s = S(); if (o.own) s.own = s.own.filter(x => x.id !== o.id); else s.off = s.off.concat(o.id); delete s.done[o.id]; LIST = null; save(); OS.request(); }); };
A.vdOn = b => { const s = S(); s.off = s.off.filter(x => x !== b.dataset.id); LIST = null; save(); };
A.vdDim = b => OS.setUI('vdC', +b.dataset.c);
A.vdF = b => OS.setUI('vdF', b.dataset.f);
A.vdSet = b => { const k = b.dataset.k; if (k === 'vdSugAll') OS.setUI(k, 1); else if (k === 'vdQ') OS.setUI(k, ''); };
A.vdMore = () => OS.setUI('vdMore', (OS.ui.vdMore || 0) + 1);
A.vdEdit = b => { const o = byId(b.dataset.id); if (!o) return; UI.modal(`<form class="d3-proof" data-form="vdEdit" data-id="${esc(o.id)}"><div class="cz d3-k">Reescrever · ${esc(dimN(o.c))}</div>
  <label class="d3-pl"><span>O objetivo, nas tuas palavras</span><input class="field" name="t" value="${esc(o.t)}" maxlength="160" required></label><div class="d3-pa"><button type="button" class="dbtn sm" data-mclose>Cancelar</button><button class="dbtn gold">Guardar</button></div></form>`); };
OS.forms.vdEdit = (f, v) => { const o = byId(f.dataset.id), t = v('t').replace(/\s+/g, ' ').trim().slice(0, 160); if (!o || t.length < 3) return false; const s = S();
  if (o.own) { const x = s.own.find(z => z.id === o.id); if (x) x.t = t; } else s.ed[o.id] = t; LIST = null; save(); UI.closeModal(); };
OS.forms.vdFind = (f, v) => { OS.setUI('vdQ', v('q').trim().slice(0, 60)); OS.setUI('vdMore', 0); };
OS.forms.vdAdd = (f, v) => { const t = v('t').replace(/\s+/g, ' ').trim().slice(0, 160), c = U.clamp(+v('c') || 0, 0, 9), tier = U.clamp(+v('tier') || 2, 1, 5), s = S(); if (t.length < 3) return false;
  if (all().some(o => N(o.t) === N(t))) { UI.toast('Esse objetivo já está na lista', 'warn'); return false; }
  const a = Object.keys(AL).find(k => AL[k] === v('a')) || ({ 0: 'i', 1: 'k', 2: 'k', 3: 'f', 4: 'm', 5: 'i', 6: 'm', 7: 'c', 8: 'r', 9: 'e' })[c];
  s.own.push({ id: 'u' + Date.now().toString(36), c, t, tier, a }); LIST = null; save(); UI.toast('Objetivo acrescentado', 'pos'); f.reset(); };
// colar uma lista (do Word, das notas…): os títulos dos eixos mudam o eixo; ☑ ou [x] contam como já feitos
OS.forms.vdImport = (f, v) => { const s = S(), C = CATS(), have = new Set(all().map(o => N(o.t))); let c = U.clamp(+v('c') || 0, 0, 9), n = 0, dn = 0;
  if (!s.since) s.since = today();
  String(v('txt') || '').split(/\r?\n/).forEach(line => { const l = line.trim(); if (!l) return; const hd = l.match(/^(\d{1,2})\.\s+(.{3,80})$/), ci = hd ? C.findIndex(x => N(x.n).slice(0, 12) === N(hd[2]).slice(0, 12)) : -1;
    if (ci >= 0) { c = ci; return; } const done = /^(☑|☒|✅|\[x\])/i.test(l), t = l.replace(/^(☐|☑|☒|✅|\[[ x]\]|[-*•·]|\d{1,4}[.)])\s*/i, '').replace(/^\d{1,4}[.)]\s*/, '').replace(/\s+/g, ' ').replace(/\.$/, '').slice(0, 160);
    if (t.length < 4 || have.has(N(t)) || s.own.length >= 1500 || /^\d+ objetivos$/i.test(t)) return; have.add(N(t));
    const id = 'u' + Date.now().toString(36) + n.toString(36); s.own.push({ id, c, t, tier: 2, a: ({ 0: 'i', 1: 'k', 2: 'k', 3: 'f', 4: 'm', 5: 'i', 6: 'm', 7: 'c', 8: 'r', 9: 'e' })[c] }); n++;
    if (done) { s.done[id] = { d: today(), how: 'prova', proof: 'Marcado como feito na lista importada', pre: 1 }; dn++; } });
  LIST = null; save(); UI.toast(n ? `${n} objetivos importados${dn ? ` (${dn} já feitos, contam metade)` : ''}` : 'Não encontrei objetivos novos no texto', n ? 'pos' : 'warn'); if (n) f.reset(); };
OS.forms.vdRev = (f, v) => { const s = S(), y = today().slice(0, 4), a = ['q1', 'q2', 'q3'].map(k => v(k).trim()); if (a.some(x => x.length < 10)) { UI.toast('Responde às 3 perguntas (10 letras ou mais cada).', 'warn'); return false; }
  s.rev[y] = { d: today(), a }; save(); UI.toast(`Revisão de ${y} feita: +${xpTxt(REVXP)} XP em Disciplina. Agora transforma as 3 prioridades em metas.`, 'pos'); };

/* ---------- a página (separador do Dominus) ---------- */
const tierChip = o => `<span class="vd-tier t${o.tier}">${esc(TN[o.tier])}</span>`;
const row = o => { const r = doneOf(o), g = goalOf(o), gi = g && g.status === 'Ativa' ? safe(() => OS.Goal.info(g), null) : null, det = r ? null : detect(o), cx = cxOf(o), a = ao(o.a), x = r ? xpOf(o, r) : TX[o.tier];
  const meta = [tierChip(o), `<span class="mono">${r ? (x ? '+' + xpTxt(x) : 'XP no Codex') : xpTxt(x)} XP</span>`, `<span style="color:${a.c}">${esc(a.n)}</span>`];
  if (o.prop) meta.push('<span class="vd-tag">proposta do Prumo</span>'); if (o.novo) meta.push('<span class="vd-tag">novo</span>'); if (o.own) meta.push('<span class="vd-tag">teu</span>');
  if (cx) meta.push(`<span class="vd-tag cx" title="${esc(cx.t)}">${ic('flag')}Codex: ${esc(cx.pn)}</span>`);
  return `<div class="vd-o ${r ? 'ok' : ''}" style="--c:${a.c}"><button class="d3-legc" data-act="vdOk" data-id="${esc(o.id)}" aria-label="${r ? 'Desmarcar' : 'Conquistei'}: ${esc(o.t)}">${r ? '✓' : ''}</button><span class="mono dm vd-n">${esc(numOf(o))}</span>
    <div class="vd-t"><b>${esc(o.t)}</b><small class="dm vd-m">${meta.join('')}</small>
    ${r ? `<small class="gold">${U.fmtD(r.d)}${r.pre ? ' · já feito antes (metade)' : ''}</small><small class="dm d3-legp">${esc(r.proof || '')}</small>` : ''}
    ${gi ? `<small class="dm">Meta ativa: <span class="mono">${Math.round((gi.p || 0) * 100)}%</span>${gi.why ? ' · ' + esc(gi.why) : ''}</small>${bar(gi.p, a.c)}` : ''}
    ${det && det.n ? `<small class="dm">Pelos teus registos: <span class="mono">${U.nf(det.c)}/${U.nf(det.n)}</span> ${esc(det.u)}</small>${bar(det.c / det.n, a.c)}` : det && det.hint ? `<small class="dm">${esc(det.hint)}</small>` : det && det.sug ? `<small class="dm">${esc(det.sug)}</small>` : ''}</div>
    <span class="vd-acts">${r ? '' : `<button class="dbtn sm ${gi ? '' : 'gold'}" data-act="vdMeta" data-id="${esc(o.id)}">${gi ? 'Ver meta' : 'Tornar meta'}</button>`}<button class="d3-legx" data-act="vdEdit" data-id="${esc(o.id)}" aria-label="Reescrever" title="Reescrever">${ic('edit')}</button><button class="d3-legx" data-act="vdOff" data-id="${esc(o.id)}" aria-label="Tirar da lista" title="Tirar da lista">${ic('x')}</button></span></div>`; };

V.view = () => { safe(V.sync); const s = S(), L = all(), C = CATS(), cnt = V.count(), xp = V.events().filter(e => e.g === 'v').reduce((a, e) => a + e.x, 0);
  const c0 = Number.isInteger(OS.ui.vdC) && OS.ui.vdC >= 0 && OS.ui.vdC <= 9 ? OS.ui.vdC : 0, F = ['por', 'feitos', 'todos', 'meta'].includes(OS.ui.vdF) ? OS.ui.vdF : 'por', q = N(OS.ui.vdQ || ''), more = (OS.ui.vdMore || 0) + 1;
  const sug = V.sugs(), act = V.activeGoals(), lk = V.linkable(), nx = V.next();
  const empty = !L.length;
  const byC = C.map((c, ci) => { const X = L.filter(o => o.c === ci); return { n: c.n, tot: X.length, done: X.filter(o => doneOf(o)).length }; });
  let rows = q ? L.filter(o => N(o.t).includes(q)) : L.filter(o => o.c === c0);
  rows = rows.filter(o => F === 'todos' ? true : F === 'feitos' ? !!doneOf(o) : F === 'meta' ? !!(goalOf(o) && goalOf(o).status === 'Ativa') : !doneOf(o));
  const shown = rows.slice(0, 40 * more), y = today().slice(0, 4), rv = s.rev[y];
  return `<section class="vd-top d3-card"><div><div class="cz d3-k">Projeto de Vida</div><h2><b class="mono">${U.nf(cnt.done)}</b> de <span class="mono">${U.nf(cnt.tot)}</span> objetivos conquistados</h2>
      <p class="dm">${empty ? 'Escreve aqui o que queres conquistar na vida, em 10 eixos. Cada objetivo pode virar meta, e é das metas que nascem as missões, o chefe da semana e o colosso.' : `${cnt.meta ? `${cnt.meta} em meta agora · ` : ''}+${xpTxt(xp)} XP ganhos aqui. Cada objetivo vale pela dificuldade: ${TN.slice(1).map((n, i) => `${n} ${xpTxt(TX[i + 1])}`).join(' · ')} XP. O que já tinhas feito antes conta metade.`}</p></div>
    ${empty ? '' : `<div class="vd-dims">${byC.map((c, ci) => `<button class="${!q && ci === c0 ? 'on' : ''}" data-act="vdDim" data-c="${ci}"><span class="d3-ring" style="--p:${(c.tot ? c.done / c.tot : 0).toFixed(3)}"><b class="mono">${c.done}</b></span><span>${esc(c.n)}</span><small class="mono dm">${c.done}/${c.tot}</small></button>`).join('')}</div>`}</section>
  ${sug.length ? `<section class="d3-card vd-sug"><div class="d3-h"><span class="cz">Por confirmar</span><span class="dm mono">${sug.length}</span></div><p class="dm">Pelo teu perfil, pela biografia e pelos países onde já estiveste, parece que já fizeste estes. Diz se sim (e quando) ou "ainda não".</p>
    ${sug.slice(0, OS.ui.vdSugAll ? 99 : 6).map(([o, r]) => `<div class="vd-s"><div><b>${esc(o.t)}</b><small class="dm">${esc(r.sug)} · ${tierChip(o)}</small></div><span><button class="dbtn sm gold" data-act="vdOk" data-id="${esc(o.id)}">Já fiz</button><button class="dbtn sm" data-act="vdNo" data-id="${esc(o.id)}">Ainda não</button></span></div>`).join('')}
    ${sug.length > 6 && !OS.ui.vdSugAll ? `<button class="d3-link" data-act="vdSet" data-k="vdSugAll" data-v="1">Ver os ${sug.length}</button>` : ''}</section>` : ''}
  ${act.length || lk.length ? `<section class="d3-card"><div class="d3-h"><span class="cz">Em meta</span><a class="dm" href="#metas">metas →</a></div>
    ${act.map(g => { const o = byId(g.vid), i = safe(() => OS.Goal.info(g), {}), a = ao(o.a); return `<div class="vd-g" style="--c:${a.c}"><div><b>${esc(g.title)}</b><small class="dm">${esc(dimN(o.c))} · ${tierChip(o)}${g.due ? ' · prazo ' + U.fmtD(g.due) : ' · <b>sem prazo</b>'}${(g.steps || []).length < 3 ? ' · <b>dá-lhe 3 etapas</b>' : ''}</small>${bar(i.p, a.c)}</div><span class="mono">${Math.round((i.p || 0) * 100)}%</span></div>`; }).join('')}
    ${lk.map(([g, o]) => `<div class="vd-s"><div><b>${esc(g.title)}</b><small class="dm">Esta meta parece o objetivo "${esc(o.t)}" (${esc(dimN(o.c))}).</small></div><span><button class="dbtn sm gold" data-act="vdLink" data-g="${esc(g.id)}" data-id="${esc(o.id)}">Ligar</button></span></div>`).join('')}
    ${act.length < 3 && !empty ? `<p class="dm">Tens ${act.length} ${act.length === 1 ? 'objetivo' : 'objetivos'} em meta. Com 3 ou mais, as missões ficam todas ligadas à tua vida.</p>` : ''}</section>` : ''}
  ${nx.length ? `<section class="d3-card"><div class="d3-h"><span class="cz">O próximo em cada eixo</span><span class="dm">pela ordem da tua lista</span></div>${nx.map(o => `<div class="vd-s" style="--c:${ao(o.a).c}"><div><small class="dm">${esc(dimN(o.c))}</small><b>${esc(o.t)}</b><small class="dm">${tierChip(o)} · ${xpTxt(TX[o.tier])} XP</small></div><span><button class="dbtn sm gold" data-act="vdMeta" data-id="${esc(o.id)}">Tornar meta</button></span></div>`).join('')}</section>` : ''}
  ${empty ? '' : `<section class="d3-card"><div class="d3-h"><span class="cz">${q ? 'Procura: ' + esc(OS.ui.vdQ) : esc(C[c0] ? C[c0].n : '')}</span><span class="dm mono">${rows.length}</span></div>
    <div class="vd-bar"><form data-form="vdFind" class="vd-find"><input class="field" name="q" value="${esc(OS.ui.vdQ || '')}" placeholder="Procurar nos ${U.nf(L.length)} objetivos" aria-label="Procurar objetivos"><button class="dbtn sm">Procurar</button>${q ? '<button type="button" class="dbtn sm" data-act="vdSet" data-k="vdQ" data-v="">Limpar</button>' : ''}</form>
      <nav class="vd-fs">${[['por', 'Por conquistar'], ['meta', 'Em meta'], ['feitos', 'Conquistados'], ['todos', 'Todos']].map(([k, l]) => `<button class="${F === k ? 'on' : ''}" data-act="vdF" data-f="${k}">${l}</button>`).join('')}</nav></div>
    <div class="vd-list">${shown.map(row).join('') || '<p class="dm">Nada aqui.</p>'}</div>${rows.length > shown.length ? `<button class="dbtn sm vd-more" data-act="vdMore">Mostrar mais (${rows.length - shown.length})</button>` : ''}</section>`}
  <section class="d3-card"><div class="d3-h"><span class="cz">Acrescentar um objetivo</span></div><form class="vd-add" data-form="vdAdd"><input class="field" name="t" placeholder="Ex.: Passar no exame da CPA-10 à primeira" maxlength="160" required aria-label="Novo objetivo">
    <select class="field" name="c" aria-label="Eixo">${C.map((c, i) => `<option value="${i}" ${i === c0 ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select><select class="field" name="tier" aria-label="Dificuldade">${TN.slice(1).map((n, i) => `<option value="${i + 1}" ${i === 1 ? 'selected' : ''}>${n} · ${xpTxt(TX[i + 1])} XP</option>`).join('')}</select><button class="dbtn sm gold">Acrescentar</button></form>
    <details ${empty ? 'open' : ''}><summary class="dm">Colar uma lista inteira</summary><form class="vd-imp" data-form="vdImport"><textarea class="field" name="txt" rows="6" placeholder="Um objetivo por linha. Linhas como &quot;3. Empreendedorismo e construção de empresas&quot; mudam o eixo; ☑ ou [x] marcam como já feito."></textarea>
      <select class="field" name="c" aria-label="Eixo de partida">${C.map((c, i) => `<option value="${i}">${esc(c.n)}</option>`).join('')}</select><button class="dbtn sm gold">Importar</button></form></details>
    ${(L.off || []).length ? `<details><summary class="dm">Tiraste ${L.off.length} ${L.off.length === 1 ? 'objetivo' : 'objetivos'}</summary>${L.off.slice(0, 60).map(o => `<div class="vd-s"><div><b>${esc(o.t)}</b><small class="dm">${esc(dimN(o.c))}</small></div><span><button class="dbtn sm" data-act="vdOn" data-id="${esc(o.id)}">Repor</button></span></div>`).join('')}</details>` : ''}</section>
  ${empty ? '' : `<section class="d3-card vd-rev"><div class="d3-h"><span class="cz">Revisão anual · ${y}</span><span class="dm">${rv ? 'feita a ' + U.fmtD(rv.d) : '+' + xpTxt(REVXP) + ' XP, uma vez por ano'}</span></div>
    ${rv ? `<ol class="dm">${rv.a.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : `<form data-form="vdRev"><label class="d3-pl"><span>Que conquistas realizaste desde a última revisão?</span><textarea class="field" name="q1" rows="2" required></textarea></label>
      <label class="d3-pl"><span>Que objetivos perderam sentido ou precisam de ser reescritos?</span><textarea class="field" name="q2" rows="2" required></textarea></label>
      <label class="d3-pl"><span>As 3 prioridades concretas para os próximos 12 meses (e o que tens de proteger: saúde, relações)</span><textarea class="field" name="q3" rows="3" required></textarea></label><button class="dbtn sm gold">Guardar a revisão</button></form>`}</section>`}`; };
V.summary = () => { if (!V.has()) return ''; const c = V.count(), nx = V.next().slice(0, 3).map(o => o.t); return `Projeto de Vida: ${c.done}/${c.tot} objetivos conquistados, ${c.meta} em meta${nx.length ? '; próximos: ' + nx.join('; ') : ''}`; };
})();
