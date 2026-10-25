/* PRUMO — religiões. Cada pessoa escolhe a sua (Definições › Tu › Fé e religião, ou no questionário inicial) e a aba Fé muda toda:
   o livro sagrado (na tradução da língua dela, sem internet), o texto do dia, as orações, a prática guiada, os planos de leitura e a IA.
   Católica · Evangélica · Ortodoxa · Espírita · Islâmica · Judaica · Hindu · Budista · Umbanda e Candomblé · Espiritualidade sem religião
   · Nenhuma (a aba Fé sai do menu). Sem escolha, fica como sempre foi (cristã, Bíblia de 66 livros). */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, esc = U.esc;

/* ---------- livros ---------- */
const sp = s => s.split(' ');
const ORDER_P = sp('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV');
const NT = ORDER_P.slice(39);
const ORDER_C = sp('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA JOB PSA PRO ECC SNG WIS SIR ISA JER LAM BAR EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL').concat(NT);
const ORDER_O = sp('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH MAN 1ES EZR NEH TOB JDT EST 1MA 2MA 3MA PSA PSX JOB PRO ECC SNG WIS SIR ISA JER LAM BAR EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL').concat(NT);
const ORDER_T = sp('GEN EXO LEV NUM DEU JOS JDG 1SA 2SA 1KI 2KI ISA JER EZK HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL PSA PRO JOB SNG RUT LAM ECC EST DAN EZR NEH 1CH 2CH');
const HEB = { GEN: 'Bereshit', EXO: 'Shemot', LEV: 'Vayikra', NUM: 'Bamidbar', DEU: 'Devarim', JOS: 'Yehoshua', JDG: 'Shoftim', '1SA': 'Shmuel I', '2SA': 'Shmuel II', '1KI': 'Melachim I', '2KI': 'Melachim II', ISA: 'Yeshayahu', JER: 'Yirmeyahu', EZK: 'Yechezkel', HOS: 'Hoshea', JOL: 'Yoel', AMO: 'Amos', OBA: 'Ovadia', JON: 'Yona', MIC: 'Micha', NAM: 'Nachum', HAB: 'Chavakuk', ZEP: 'Tzefania', HAG: 'Chagai', ZEC: 'Zecharia', MAL: 'Malachi', PSA: 'Tehilim', PRO: 'Mishlei', JOB: 'Iyov', SNG: 'Shir HaShirim', RUT: 'Rut', LAM: 'Eicha', ECC: 'Kohelet', EST: 'Ester', DAN: 'Daniel', EZR: 'Ezra', NEH: 'Nechemia', '1CH': 'Divrei HaYamim I', '2CH': 'Divrei HaYamim II' };
const ALIAS = { EST: 'ESG', DAN: 'DNG' };   // católicos e ortodoxos leem Ester e Daniel na forma grega (com os acrescentos)
const v = (id, n, f, o) => Object.assign({ id, n, f }, o || {});
const BIBLE_GROUPS = B => { const i = B.b.findIndex(b => b[0] === 'MAT'); return i > 0 ? [['Antigo Testamento', 0, i], ['Novo Testamento', i, B.b.length]] : [['', 0, B.b.length]]; };
const TANAKH_GROUPS = () => [['Torá', 0, 5], ['Nevi’im (Profetas)', 5, 26], ['Ketuvim (Escritos)', 26, 39]];
const cat = (id, n, f) => v(id, n, f, { order: ORDER_C, alias: ALIAS });
const ort = (id, n, f) => v(id, n, f, { order: ORDER_O, alias: ALIAS });
const tnk = (id, n, f, o) => v(id, n, f, Object.assign({ order: ORDER_T, heb: 1, groups: TANAKH_GROUPS }, o || {}));
const WLC = tnk('wlc', 'Tanakh em hebraico (Codex de Leningrado)', ['hebwlc'], { dir: 'rtl' });
const QAR = v('qar', 'Alcorão em árabe (Hafs)', ['quran-ar'], { dir: 'rtl' });
const LIBS = {
  evangelica: { pt: [v('livre', 'Bíblia Livre (2018)', ['biblia/livre']), v('almeida', 'Almeida (1911)', ['biblia/almeida'])], en: [v('web', 'World English Bible', ['eng-web-c'], { order: ORDER_P })], es: [v('rv', 'Reina-Valera 1909', ['spaRV1909'])], fr: [v('lsg', 'Louis Segond 1910', ['fraLSG'])], de: [v('lut', 'Lutherbibel 1912', ['deu1912'])], it: [v('riv', 'Riveduta 1927', ['ita1927'])] },
  catolica: { pt: [cat('bpm', 'Bíblia Portuguesa Mundial (73 livros)', ['porbrbsl'])], en: [cat('webc', 'World English Bible, Catholic edition', ['eng-web-c'])], es: [cat('blm', 'Biblia Libre para el Mundo', ['spablm'])], fr: [cat('sbl', 'Sainte Bible Libre pour le monde', ['frasbl'])], de: [cat('lutc', 'Lutherbibel 1912 + Spätschriften', ['deu1912', 'dc-de'])], it: [cat('rivc', 'Riveduta 1927 + libri deuterocanonici', ['ita1927', 'dc-it'])] },
  ortodoxa: { pt: [ort('bpm', 'Bíblia Portuguesa Mundial (cânone ortodoxo)', ['porbrbsl'])], en: [ort('webc', 'World English Bible + deuterocanon', ['eng-web-c', 'ort-en'])], es: [ort('blm', 'Biblia Libre para el Mundo', ['spablm'])], fr: [ort('sbl', 'Sainte Bible Libre pour le monde', ['frasbl'])], de: [ort('lutc', 'Lutherbibel 1912 + Spätschriften', ['deu1912', 'dc-de', 'ort-de'])], it: [ort('rivc', 'Riveduta 1927 + libri deuterocanonici', ['ita1927', 'dc-it', 'ort-it'])] },
  judaica: { pt: [tnk('tnk', 'Tanakh (Bíblia Portuguesa Mundial)', ['porbrbsl']), WLC], en: [tnk('jps', 'JPS Tanakh 1917', ['engjps']), WLC], es: [tnk('rv', 'Tanaj (Reina-Valera 1909)', ['spaRV1909']), WLC], fr: [tnk('lsg', 'Tanakh (Louis Segond 1910)', ['fraLSG']), WLC], de: [tnk('lut', 'Tanach (Luther 1912)', ['deu1912']), WLC], it: [tnk('riv', 'Tanakh (Riveduta 1927)', ['ita1927']), WLC] },
  islamica: { pt: [v('nasr', 'Alcorão · Helmi Nasr', ['quran-pt']), QAR], en: [v('pick', 'The Quran · Pickthall', ['quran-en']), QAR], es: [v('cortes', 'El Corán · Julio Cortés', ['quran-es']), QAR], fr: [v('ham', 'Le Coran · Hamidullah', ['quran-fr']), QAR], de: [v('bub', 'Der Koran · Bubenheim & Elyas', ['quran-de']), QAR], it: [v('pic', 'Il Corano · Piccardo', ['quran-it']), QAR] },
  hindu: { '*': [v('gita', 'Bhagavad Gita', ['gita-XX|gita-en']), v('sa', 'Bhagavad Gita em sânscrito', ['gita-sa'], { pre: 1 })] },
  budista: { '*': [v('dhp', 'Dhammapada', ['dhammapada-XX|dhammapada-en'])] },
  espirita: { '*': [v('ese', 'O Evangelho segundo o Espiritismo', ['evangelho-XX|evangelho-pt'], { pre: 1 })] },
  espiritual: { '*': [v('sab', 'Tao Te Ching e Meditações de Marco Aurélio', ['tao-XX|tao-en', 'meditacoes-XX|meditacoes-en'], { pre: 1 })] } };

/* ---------- as religiões ---------- */
const REL = {
  catolica: { n: 'Católica', s: '✝', fam: 'crista', book: 'Bíblia', daily: 'Versículo do dia', hoje: 'Hoje com Deus', sub: 'Um tempo dedicado a Deus: a Palavra, o terço, a oração e o que Ele te diz hoje.', req: 'Intenções de oração', hab: 'Oração e leitura da Bíblia', who: 'católico', marcos: ['Ler o Novo Testamento todo', 'Rezar o terço todos os dias durante 30 dias'] },
  evangelica: { n: 'Evangélica / Protestante', s: '✝', fam: 'crista', book: 'Bíblia', daily: 'Versículo do dia', hoje: 'Hoje com Deus', sub: 'Um tempo dedicado a Deus: a Palavra, a oração e o que Ele te diz hoje.', req: 'Pedidos de oração', hab: 'Oração e leitura da Bíblia', who: 'cristão evangélico', marcos: ['Ler o Novo Testamento todo', 'Orar todos os dias durante 30 dias seguidos'] },
  ortodoxa: { n: 'Cristã ortodoxa', s: '☦', fam: 'crista', book: 'Bíblia', daily: 'Versículo do dia', hoje: 'Hoje com Deus', sub: 'Um tempo dedicado a Deus: as Escrituras, a Oração de Jesus e o silêncio.', req: 'Pedidos de oração', hab: 'Oração e leitura das Escrituras', who: 'cristão ortodoxo', marcos: ['Ler os quatro Evangelhos', 'Rezar a Oração de Jesus todos os dias durante 30 dias'] },
  espirita: { n: 'Espírita', s: '✧', fam: 'espirita', book: 'Evangelho', daily: 'Mensagem do dia', hoje: 'Hoje', sub: 'Um tempo para o Evangelho, a prece e a caridade.', req: 'Preces e vibrações', hab: 'Prece e leitura do Evangelho', who: 'espírita', marcos: ['Ler O Evangelho segundo o Espiritismo todo', 'Fazer o Evangelho no Lar 12 semanas seguidas'] },
  islamica: { n: 'Islâmica (muçulmana)', s: '☪', fam: 'islam', book: 'Alcorão', daily: 'Versículo do dia', hoje: 'Hoje', sub: 'Um tempo para Allah: o Alcorão, a oração (salah) e a lembrança (dhikr).', req: 'Duas (súplicas)', hab: 'As cinco orações (salah)', who: 'muçulmano', marcos: ['Ler o Alcorão todo', 'Fazer as cinco orações todos os dias durante 30 dias'] },
  judaica: { n: 'Judaica', s: '✡', fam: 'judaica', book: 'Torá', daily: 'Versículo do dia', hoje: 'Hoje', sub: 'O teu tempo com HaShem: a Torá, as orações e o Shabat.', req: 'Pedidos (tefilá)', hab: 'Shemá e leitura da Torá', who: 'judeu', marcos: ['Ler a Torá toda (os cinco livros)', 'Guardar o Shabat 8 semanas seguidas'] },
  hindu: { n: 'Hindu', s: 'ॐ', fam: 'hindu', book: 'Gita', daily: 'Verso do dia', hoje: 'Hoje', sub: 'Um tempo para o sagrado: a Bhagavad Gita, os mantras e a meditação.', req: 'Intenções', hab: 'Mantra e leitura da Gita', who: 'hindu', marcos: ['Ler a Bhagavad Gita toda', 'Japa (108 repetições) todos os dias durante 30 dias'] },
  budista: { n: 'Budista', s: '☸', fam: 'budista', book: 'Dhammapada', daily: 'Verso do dia', hoje: 'Hoje', sub: 'Um tempo para a mente: o Dhamma, a meditação e a compaixão.', req: 'Intenções', hab: 'Meditação e leitura do Dhamma', who: 'budista', marcos: ['Ler o Dhammapada todo', 'Meditar todos os dias durante 30 dias'] },
  afro: { n: 'Umbanda / Candomblé', s: '✦', fam: 'afro', book: '', daily: 'Orixá do dia', hoje: 'Hoje', sub: 'Axé! Um tempo para os teus Orixás, as tuas preces e a tua gratidão.', req: 'Pedidos e agradecimentos', hab: 'Prece e saudação aos Orixás', who: 'de religião de matriz africana (Umbanda ou Candomblé)', marcos: ['Fazer a prece aos Orixás todas as semanas durante 3 meses', 'Visitar o terreiro todos os meses durante um ano'] },
  espiritual: { n: 'Espiritualidade, sem religião', s: '☯', fam: 'espiritual', book: 'Livros', daily: 'Reflexão do dia', hoje: 'Hoje', sub: 'Um tempo para ti: reflexão, meditação e gratidão.', req: 'Intenções', hab: 'Meditar e agradecer', who: 'sem religião, com vida espiritual', marcos: ['Ler as Meditações de Marco Aurélio', 'Meditar todos os dias durante 30 dias'] },
  nenhuma: { n: 'Nenhuma (tirar a aba Fé do menu)', s: '·', fam: 'nenhuma' } };
const ORD = ['catolica', 'evangelica', 'ortodoxa', 'espirita', 'islamica', 'judaica', 'hindu', 'budista', 'afro', 'espiritual', 'nenhuma'];
const cfg = () => OS.one('faith');
const id = () => { const r = cfg().rel; return REL[r] ? r : 'evangelica'; };
const lang = () => { const c = OS.Lang ? OS.Lang.code() : 'pt-PT'; return /^pt/.test(c) ? 'pt' : ['en', 'es', 'fr', 'de', 'it'].includes(c) ? c : 'en'; };
const R = OS.Rel = {
  ORD, REL, ORDER_P, ORDER_C, ORDER_T, HEB, NT,
  id, meta: (r = id()) => REL[r] || REL.evangelica, name: (r = id()) => (REL[r] || REL.evangelica).n,
  christian: (r = id()) => (REL[r] || {}).fam === 'crista', bibleFam: (r = id()) => ['crista', 'judaica'].includes((REL[r] || {}).fam),
  chosen: () => !!REL[cfg().rel], lang,
  versions: (r = id()) => { const L = LIBS[r]; if (!L) return []; const l = lang(), list = L[l] || L['*'] || L.pt || L.en; return (list || []).map(x => Object.assign({}, x, { f: x.f.map(f => f.replace(/XX/g, l)) })); },
  habit: (r = id()) => (REL[r] || REL.evangelica).hab || 'Oração', marcos: (r = id()) => (REL[r] || {}).marcos || [] };

/* ---------- montar a biblioteca (os ficheiros + a ordem e os nomes da religião) ---------- */
const FILES = {};
const getFile = f => FILES[f] || (FILES[f] = (async () => { for (const alt of f.split('|')) { const path = alt.startsWith('biblia/') ? 'vendor/' + alt + '.json' : 'vendor/sagrado/' + alt + '.json';
  try { const r = await fetch(path); if (r.ok) return await r.json(); } catch (e) { } } return null; })().then(d => { if (!d) delete FILES[f]; return d; }));
R.assemble = async spec => { const ds = (await Promise.all(spec.f.map(getFile))).filter(Boolean); if (!ds.length) throw new Error('livro indisponível');
  const books = {}, order = []; ds.forEach(d => d.b.forEach(b => { if (!books[b[0]]) { books[b[0]] = b; order.push(b[0]); } }));
  let ids = spec.order ? spec.order.filter(x => books[(spec.alias && spec.alias[x] && books[spec.alias[x]]) ? spec.alias[x] : x]) : order.filter(x => !(spec.alias && Object.values(spec.alias).includes(x)) && !['ESG', 'DNG'].includes(x));
  const b = ids.map(x => { const src = books[(spec.alias && spec.alias[x] && books[spec.alias[x]]) ? spec.alias[x] : x]; const o = src.slice(); o[0] = x;
    if (spec.heb && HEB[x] && !spec.dir) o[1] = HEB[x] + ' (' + src[1] + ')'; return o; });
  const L = { n: spec.n, a: ds.map(d => d.a).filter(Boolean).join(' · '), dir: spec.dir || ds[0].dir || '', pre: spec.pre || ds[0].pre || 0, ai: ds.some(d => d.ai), b, id: spec.id };
  L.idx = {}; L.b.forEach((x, i) => L.idx[x[0]] = i); L.groups = (spec.groups || BIBLE_GROUPS)(L); return L; };

/* ---------- texto do dia ---------- */
const hashDay = d => { let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const QV = ['1:1-7', '2:152-153', '2:186', '2:255', '2:286', '3:139', '3:159', '3:190-191', '3:200', '4:135', '5:8', '6:162', '7:56', '9:51', '10:57', '13:11', '13:28', '14:7', '16:90', '16:97', '16:128', '17:23-24', '17:82', '18:10', '20:114', '21:87', '23:1-6', '24:35', '25:63', '28:77', '29:69', '31:17-19', '33:41-42', '39:10', '39:53', '40:60', '41:34', '42:36-37', '49:10', '49:13', '50:16', '55:13', '57:4', '59:18', '64:11', '65:2-3', '67:2', '76:8-9', '89:27-30', '93:3-5', '94:5-8', '99:7-8', '103:1-3', '112:1-4', '113:1-5', '114:1-6'].map(x => 'QUR ' + x);
const GV = ['2:13', '2:14', '2:20', '2:22', '2:38', '2:47', '2:48', '2:50', '2:56', '2:62-63', '2:70', '3:8', '3:19', '3:21', '3:30', '3:35', '4:7-8', '4:38', '4:39', '5:10', '5:18', '6:5', '6:6', '6:17', '6:26', '6:35', '7:19', '9:22', '9:26', '9:29', '10:20', '11:55', '12:13-14', '12:15', '13:28', '15:15', '16:1-3', '16:21', '17:15', '18:20', '18:46', '18:66', '18:78'].map(x => 'BG ' + x);
R.daily = (B, FD, d = U.today()) => { const r = id(), h = hashDay(d + 'oc'), fam = (REL[r] || {}).fam;
  if (fam === 'crista') return FD.vod[h % FD.vod.length];
  if (fam === 'judaica') { const L2 = FD.vod.filter(x => ORDER_T.includes(x.split(' ')[0])); return L2[h % L2.length]; }
  if (fam === 'islam') return QV[h % QV.length];
  if (fam === 'hindu') return GV[h % GV.length];
  if (!B) return null;
  // Dhammapada, Evangelho, Tao/Meditações: um trecho do livro (curto o bastante para se ler de uma vez)
  const pool = []; B.b.forEach(b => b[3].forEach((ch, ci) => { if (b[0] === 'TAO') { pool.push(b[0] + ' ' + (ci + 1)); return; } ch.forEach((t, vi) => { if (t && t.length > 60 && t.length < 900) pool.push(b[0] + ' ' + (ci + 1) + ':' + (vi + 1)); }); }));
  return pool.length ? pool[h % pool.length] : null; };

/* ---------- planos de leitura ---------- */
const chs = (B, ids) => ids.flatMap(i => { const b = B.b[B.idx[i]]; return b ? b[3].map((c, k) => ({ r: i + '.' + (k + 1), n: c.length || 1 })) : []; });
const split = (list, days) => { const tot = list.reduce((a, x) => a + x.n, 0), per = tot / days, out = []; let cur = [], acc = 0, k = 1; list.forEach(x => { cur.push(x.r); acc += x.n; if (acc >= per * k && out.length < days - 1) { out.push(cur); cur = []; k++; } }); if (cur.length) out.push(cur); return out; };
const each = (B, ids) => chs(B, ids).map(x => [x.r]);
const all = B => B.b.map(b => b[0]);
R.plans = B => { const r = id(), fam = (REL[r] || {}).fam, nt = B.b.findIndex(b => b[0] === 'MAT');
  if (fam === 'crista') return { ano: ['Bíblia em 1 ano', 'Do Génesis ao Apocalipse, ~15 min por dia', () => split(chs(B, all(B)), 365)],
    nt90: ['Novo Testamento em 90 dias', 'Os Evangelhos, Atos, as cartas e o Apocalipse', () => split(chs(B, all(B).slice(nt)), 90)],
    evang: ['Evangelhos em 30 dias', 'A vida de Jesus: Mateus, Marcos, Lucas e João', () => split(chs(B, ['MAT', 'MRK', 'LUK', 'JHN']), 30)],
    sp: ['Salmos e Provérbios em 31 dias', '5 Salmos e 1 Provérbio por dia', () => Array.from({ length: 31 }, (_, i) => [...Array.from({ length: 5 }, (_, k) => 'PSA.' + (i * 5 + k + 1)).filter(x => +x.split('.')[1] <= 150), 'PRO.' + (i + 1)])],
    cartas: ['Cartas de Paulo em 40 dias', 'De Romanos a Filémon', () => split(chs(B, ['ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM']), 40)] };
  if (fam === 'judaica') return { tora: ['A Torá num ano', 'Os cinco livros de Moisés, ~10 min por dia', () => split(chs(B, ['GEN', 'EXO', 'LEV', 'NUM', 'DEU']), 365)],
    tanakh: ['O Tanakh em 1 ano', 'Torá, Profetas e Escritos', () => split(chs(B, all(B)), 365)], tehilim: ['Tehilim (Salmos) em 30 dias', 'Como é costume ler os Salmos num mês', () => split(chs(B, ['PSA']), 30)], mishlei: ['Mishlei (Provérbios) em 31 dias', 'Um capítulo por dia', () => each(B, ['PRO'])] };
  if (fam === 'islam') return { q30: ['O Alcorão em 30 dias', 'Mais ou menos um juz por dia (como no Ramadão)', () => split(chs(B, ['QUR']), 30)], q60: ['O Alcorão em 60 dias', 'Meio juz por dia', () => split(chs(B, ['QUR']), 60)], q365: ['O Alcorão em 1 ano', 'Uns minutos por dia', () => split(chs(B, ['QUR']), 365)] };
  if (fam === 'hindu') return { g18: ['A Gita em 18 dias', 'Um capítulo por dia', () => each(B, ['BG'])], g40: ['A Gita em 40 dias', 'Com calma, uns versos por dia', () => split(chs(B, ['BG']), 40)] };
  if (fam === 'budista') return { d26: ['O Dhammapada em 26 dias', 'Um capítulo por dia', () => each(B, ['DHP'])] };
  if (fam === 'espirita') return { e28: ['O Evangelho em 28 dias', 'Um capítulo por dia', () => each(B, ['ESE'])], e60: ['O Evangelho em 60 dias', 'Com calma, um bocado por dia', () => split(chs(B, ['ESI', 'ESE']), 60)] };
  if (fam === 'espiritual') return { tao: ['O Tao Te Ching em 81 dias', 'Um capítulo por dia', () => each(B, ['TAO'])], med: ['As Meditações em 12 semanas', 'Um livro por semana, lido aos poucos', () => split(chs(B, ['MED']), 84)] };
  return {}; };

/* ---------- orações ---------- */
const P = (t, x, ref) => ({ t, x, ref });
const PAI = 'Pai nosso, que estais nos céus, santificado seja o vosso nome; venha a nós o vosso reino; seja feita a vossa vontade, assim na terra como no céu. O pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.';
const AVE = 'Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora da nossa morte. Amém.';
const GLORIA = 'Glória ao Pai, ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.';
const CREDO = 'Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus; está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na santa Igreja católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.';
const SALVE = 'Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva; a vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre, ó clemente, ó piedosa, ó doce sempre Virgem Maria. Rogai por nós, santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.';
const FATIMA = 'Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.';
const SINAL = 'Pelo sinal da Santa Cruz, livrai-nos, Deus, nosso Senhor, dos nossos inimigos. Em nome do Pai, e do Filho, e do Espírito Santo. Amém.';
const JESUS = 'Senhor Jesus Cristo, Filho de Deus, tem piedade de mim, pecador.';
const CARITAS = 'Deus, nosso Pai, que tendes poder e bondade, dai a força àquele que passa pela provação, dai a luz àquele que procura a verdade, ponde no coração do homem a compaixão e a caridade. Deus, dai ao viajor a estrela guia, ao aflito a consolação, ao doente o repouso. Pai, dai ao culpado o arrependimento, ao espírito a verdade, à criança o guia, ao órfão o pai. Senhor, que a vossa bondade se estenda sobre tudo o que criastes. Piedade, Senhor, para aqueles que vos não conhecem, esperança para aqueles que sofrem. Que a vossa bondade permita aos Espíritos consoladores derramarem por toda a parte a paz, a esperança e a fé. Deus, um raio, uma faísca do vosso amor pode abrasar a Terra; deixai-nos beber nas fontes dessa bondade fecunda e infinita, e todas as lágrimas secarão, todas as dores acalmar-se-ão. Um só coração, um só pensamento subirá até vós, como um grito de reconhecimento e de amor. Como Moisés sobre a montanha, nós vos esperamos com os braços abertos, oh! Poder, oh! Bondade, oh! Beleza, oh! Perfeição, e queremos de alguma sorte merecer a vossa misericórdia. Deus, dai-nos a força de ajudar o progresso a fim de subirmos até vós; dai-nos a caridade pura, dai-nos a fé e a razão; dai-nos a simplicidade que fará de nossas almas o espelho onde deve refletir a vossa imagem.';
const METTA = 'Que eu esteja bem. Que eu esteja em paz. Que eu esteja livre de sofrimento. Que eu seja feliz.\nQue tu estejas bem. Que tu estejas em paz. Que tu estejas livre de sofrimento. Que tu sejas feliz.\nQue todos os seres estejam bem, em paz, livres de sofrimento e felizes.';
const PRAYERS = {
  catolica: [P('Sinal da Cruz', SINAL), P('Pai-Nosso', PAI), P('Ave-Maria', AVE), P('Glória ao Pai', GLORIA), P('Credo (Símbolo dos Apóstolos)', CREDO), P('Salve-Rainha', SALVE), P('Santo Anjo', 'Santo Anjo do Senhor, meu zeloso guardador, se a ti me confiou a piedade divina, sempre me rege, me guarda, me governa e me ilumina. Amém.'),
    P('Ato de Contrição', 'Meu Deus, porque sois infinitamente bom e Vos amo de todo o meu coração, pesa-me de Vos ter ofendido; e, com o auxílio da Vossa divina graça, proponho firmemente emendar-me e nunca mais Vos tornar a ofender. Peço e espero o perdão das minhas culpas pela Vossa infinita misericórdia. Amém.'),
    P('Oração a São Miguel Arcanjo', 'São Miguel Arcanjo, defendei-nos no combate; sede o nosso refúgio contra as maldades e ciladas do demónio. Ordene-lhe Deus, instantemente o pedimos; e vós, Príncipe da milícia celeste, pela virtude divina, precipitai no inferno a Satanás e aos outros espíritos malignos que andam pelo mundo para perder as almas. Amém.'),
    P('Ó meu Jesus (Fátima)', FATIMA), P('Magnificat', '', 'LUK 1:46-55')],
  evangelica: [P('Pai Nosso', '', 'MAT 6:9-13'), P('Salmo 23', '', 'PSA 23:1-6'), P('Salmo 91', '', 'PSA 91:1-16'), P('Bênção sacerdotal', '', 'NUM 6:24-26'), P('O amor (1 Coríntios 13)', '', '1CO 13:4-8')],
  ortodoxa: [P('Oração de Jesus', JESUS), P('Trisagion', 'Santo Deus, Santo Forte, Santo Imortal, tende piedade de nós. (três vezes)\nGlória ao Pai, e ao Filho, e ao Espírito Santo, agora e sempre e pelos séculos dos séculos. Amém.'), P('Pai-Nosso', PAI),
    P('Credo (Niceno-Constantinopolitano)', 'Creio em um só Deus, Pai todo-poderoso, criador do céu e da terra, de todas as coisas visíveis e invisíveis. E em um só Senhor Jesus Cristo, Filho Unigénito de Deus, gerado do Pai antes de todos os séculos: Luz da Luz, Deus verdadeiro de Deus verdadeiro, gerado, não criado, consubstancial ao Pai; por Ele todas as coisas foram feitas. E por nós, homens, e para a nossa salvação, desceu dos céus e encarnou pelo Espírito Santo e da Virgem Maria, e se fez homem. Foi crucificado por nós sob Pôncio Pilatos, padeceu e foi sepultado. Ressuscitou ao terceiro dia, conforme as Escrituras, e subiu aos céus, onde está sentado à direita do Pai. E de novo há de vir, em glória, para julgar os vivos e os mortos; e o seu reino não terá fim. E no Espírito Santo, Senhor que dá a vida, que procede do Pai; e com o Pai e o Filho é adorado e glorificado: Ele que falou pelos profetas. E na Igreja una, santa, católica e apostólica. Professo um só batismo para a remissão dos pecados. E espero a ressurreição dos mortos e a vida do século que há de vir. Amém.'),
    P('Hino à Mãe de Deus', 'Virgem Mãe de Deus, alegra-te, ó cheia de graça, Maria, o Senhor é contigo; bendita és tu entre as mulheres e bendito é o fruto do teu ventre, porque deste à luz o Salvador das nossas almas.'), P('Salmo 50 (51)', '', 'PSA 51:1-19')],
  espirita: [P('Pai-Nosso (Oração dominical)', PAI), P('Prece de Cáritas', CARITAS), P('Prece de abertura', 'Senhor, que os bons Espíritos nos assistam neste momento. Afasta de nós os pensamentos inferiores e abre o nosso coração para compreender e viver o Evangelho. Que a paz esteja neste lar. Assim seja.'),
    P('Coletânea de preces espíritas', '', 'ESE 28:1-5')],
  islamica: [P('Al-Fátiha (A Abertura)', '', 'QUR 1:1-7'), P('Ayat al-Kursi (O Trono)', '', 'QUR 2:255'), P('Al-Ikhlas (A Sinceridade)', '', 'QUR 112:1-4'), P('Al-Falaq (A Alvorada)', '', 'QUR 113:1-5'), P('An-Nas (Os Homens)', '', 'QUR 114:1-6'),
    P('Dhikr (lembrança de Allah)', 'Bismillah ar-Rahman ar-Rahim — Em nome de Allah, o Clemente, o Misericordioso.\nSubhanallah — Glorificado seja Allah.\nAlhamdulillah — Louvado seja Allah.\nAllahu Akbar — Allah é o Maior.\nLa ilaha illa Allah — Não há divindade além de Allah.\nAstaghfirullah — Peço perdão a Allah.'),
    P('Súplica de Yunus (Jonas)', 'La ilaha illa anta, subhanaka, inni kuntu min az-zalimin — Não há divindade além de Ti. Glorificado sejas! Eu fui dos injustos.', 'QUR 21:87')],
  judaica: [P('Shemá Israel', '', 'DEU 6:4-9'), P('Modé Ani (ao acordar)', 'Modé ani lefanecha, Melech chai vekayam, shehechezarta bi nishmati bechemlá, rabá emunatecha.\nAgradeço-Te, Rei vivo e eterno, por me teres devolvido a minha alma com compaixão; grande é a Tua fidelidade.'),
    P('Bênção sacerdotal (Birkat Kohanim)', '', 'NUM 6:24-26'), P('Tehilim 23', '', 'PSA 23:1-6'), P('Tehilim 121', '', 'PSA 121:1-8'), P('Ein Keloheinu', 'Ein Keloheinu, ein kadoneinu, ein k’malkeinu, ein k’moshieinu.\nNão há ninguém como o nosso Deus, ninguém como o nosso Senhor, ninguém como o nosso Rei, ninguém como o nosso Salvador.')],
  hindu: [P('Gayatri Mantra', 'Om bhūr bhuvaḥ svaḥ, tat savitur vareṇyaṃ, bhargo devasya dhīmahi, dhiyo yo naḥ pracodayāt.\nMeditamos na luz gloriosa do Divino; que ela ilumine o nosso entendimento.'),
    P('Mahamrityunjaya Mantra', 'Om tryambakaṃ yajāmahe sugandhiṃ puṣṭivardhanam, urvārukam iva bandhanān mṛtyor mukṣīya māmṛtāt.\nAdoramos o Senhor de três olhos, que nutre todos os seres; que Ele nos liberte da morte, como o fruto maduro se solta do caule, e nos conduza à imortalidade.'),
    P('Asato mā (Brihadaranyaka Upanishad)', 'Asato mā sad gamaya, tamaso mā jyotir gamaya, mṛtyor mā amṛtaṃ gamaya. Om śānti śānti śāntiḥ.\nConduz-me do irreal ao real, das trevas à luz, da morte à imortalidade. Paz, paz, paz.'),
    P('Om Namah Shivaya', 'Om Namah Shivaya — Saudação a Shiva, o Ser auspicioso.'), P('Hare Krishna (Maha-mantra)', 'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare, Hare Rama Hare Rama, Rama Rama Hare Hare.'), P('O caminho da ação (Gita 2:47)', '', 'BG 2:47')],
  budista: [P('Três Refúgios', 'Buddhaṃ saraṇaṃ gacchāmi. Dhammaṃ saraṇaṃ gacchāmi. Saṅghaṃ saraṇaṃ gacchāmi.\nTomo refúgio no Buda. Tomo refúgio no Dhamma. Tomo refúgio na Sangha.'),
    P('Cinco Preceitos', 'Comprometo-me a não tirar a vida.\nComprometo-me a não tomar o que não me é dado.\nComprometo-me a não ter conduta sexual imprópria.\nComprometo-me a não mentir nem falar com dureza.\nComprometo-me a não tomar substâncias que turvam a mente.'),
    P('Metta (amor bondoso)', METTA), P('Os versos gémeos', '', 'DHP 1:1-2'), P('O ódio não acaba com o ódio', '', 'DHP 1:5')],
  afro: [P('Saudações aos Orixás', 'Exu: Laroyê!\nOgum: Ogunhê! (Patacori)\nOxóssi: Okê Arô!\nXangô: Kaô Kabecilê!\nIansã: Eparrei, Oyá!\nOxum: Ora Yê Yê Ô!\nIemanjá: Odoyá!\nNanã: Saluba, Nanã!\nOmolu / Obaluaê: Atotô!\nOxumaré: Arroboboi!\nOxalá: Epa Babá!\nIbeji (Erês): Onipê Ibejada!'), P('Prece de Cáritas', CARITAS), P('Pai-Nosso', PAI)],
  espiritual: [P('Oração da serenidade', 'Concede-me a serenidade para aceitar as coisas que não posso mudar, a coragem para mudar as que posso, e a sabedoria para distinguir umas das outras.'), P('Metta (amor bondoso)', METTA),
    P('Para começar o dia (Marco Aurélio)', 'Ao amanhecer, diz a ti mesmo: hoje vou encontrar pessoas difíceis. Mas eu vi a natureza do bem e do mal, e ninguém me pode fazer mal se eu não o permitir. Vou fazer a minha parte, com calma e com justiça.'),
    P('Gratidão', 'Antes de dormir, lembra três coisas boas do dia e quem as tornou possíveis. Agradece em silêncio.')] };
R.prayers = (r = id()) => PRAYERS[r] || PRAYERS.evangelica;

/* ---------- práticas guiadas ---------- */
const MYST = { g: ['Gozosos', ['A Anunciação do Anjo a Maria', 'A visita de Maria a Isabel', 'O nascimento de Jesus em Belém', 'A apresentação de Jesus no Templo', 'Jesus encontrado no Templo']],
  l: ['Luminosos', ['O batismo de Jesus no Jordão', 'As bodas de Caná', 'O anúncio do Reino de Deus', 'A Transfiguração', 'A instituição da Eucaristia']],
  d: ['Dolorosos', ['A agonia de Jesus no Horto', 'A flagelação', 'A coroação de espinhos', 'Jesus carrega a cruz', 'A crucificação e morte de Jesus']],
  q: ['Gloriosos', ['A Ressurreição', 'A Ascensão de Jesus ao céu', 'A vinda do Espírito Santo', 'A Assunção de Maria', 'A coroação de Maria']] };
const mystOf = d => MYST[['q', 'g', 'd', 'q', 'l', 'd', 'g'][new Date(d + 'T12:00').getDay()]];   // dom gloriosos, seg gozosos, ter dolorosos, qua gloriosos, qui luminosos, sex dolorosos, sáb gozosos
const terco = () => { const [nm, ms] = mystOf(U.today()), S = [{ t: 'Sinal da Cruz', x: SINAL }, { t: 'Credo', x: CREDO }, { t: 'Pai-Nosso', x: PAI }, { t: 'Ave-Maria', x: AVE, n: 3, h: 'Pela fé, a esperança e a caridade' }, { t: 'Glória', x: GLORIA }];
  ms.forEach((m, i) => S.push({ t: `${i + 1}.º Mistério ${nm.replace(/s$/, '')}`, x: m, big: 1 }, { t: 'Pai-Nosso', x: PAI }, { t: 'Ave-Maria', x: AVE, n: 10, h: m }, { t: 'Glória', x: GLORIA }, { t: 'Ó meu Jesus', x: FATIMA }));
  S.push({ t: 'Salve-Rainha', x: SALVE }, { t: 'Sinal da Cruz', x: SINAL }); return { name: 'Terço · Mistérios ' + nm, steps: S }; };
const MANTRAS = [['Om Namah Shivaya', 'Saudação a Shiva'], ['Hare Krishna Hare Krishna, Krishna Krishna Hare Hare, Hare Rama Hare Rama, Rama Rama Hare Hare', 'Maha-mantra'], ['Om', 'O som primordial'], ['Om Namo Narayanaya', 'Saudação a Vishnu'], ['Gayatri: Om bhūr bhuvaḥ svaḥ…', 'Gayatri Mantra']];
R.practices = (r = id()) => ({
  catolica: [['terco', 'Terço guiado (mistérios de hoje)'], ['acts', 'Oração guiada (10 min)']],
  evangelica: [['acts', 'Oração guiada (10 min)']],
  ortodoxa: [['jesus', 'Oração de Jesus (com contas)'], ['acts', 'Oração guiada (10 min)']],
  espirita: [['lar', 'Evangelho no Lar (guiado)'], ['med', 'Prece e meditação']],
  islamica: [['tasbih', 'Tasbih depois da oração (33 × 3)'], ['med', 'Momento de dhikr (silêncio)']],
  judaica: [['shema', 'Shemá guiado'], ['med', 'Hitbodedut (momento a sós)']],
  hindu: [['japa', 'Japa (mala de 108)'], ['med', 'Meditação']],
  budista: [['med', 'Meditação (respiração)'], ['metta', 'Metta guiada (amor bondoso)']],
  afro: [['orixa', 'Saudação ao Orixá do dia'], ['med', 'Momento de prece (silêncio)']],
  espiritual: [['med', 'Meditação guiada'], ['metta', 'Metta (amor bondoso)']] }[r] || [['acts', 'Oração guiada (10 min)']]);

/* modais de prática: contas (terço, tasbih, japa, Oração de Jesus), passos com tempo e meditação com sino */
let PR = null;
const bell = (f = 528, d = 2.6) => { try { const C = PR && PR.ac || new (window.AudioContext || window.webkitAudioContext)(); if (PR) PR.ac = C; const o = C.createOscillator(), g = C.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, C.currentTime); g.gain.exponentialRampToValueAtTime(.35, C.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, C.currentTime + d); o.connect(g).connect(C.destination); o.start(); o.stop(C.currentTime + d + .1); } catch (e) { } };
const buzz = (n = 12) => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) { } };
const beads = (name, steps, done) => { PR = { kind: 'beads', name, steps, i: 0, k: 0, done }; draw(); };
const draw = () => { if (!PR) return; let h = '';
  if (PR.kind === 'beads') { const s = PR.steps[PR.i], tot = PR.steps.length, n = s.n || 1, end = PR.i >= tot;
    h = end ? `<h2>Amém</h2><p>Que a paz esteja contigo.</p><button class="btn pri" data-act="rlStop">Fechar</button>`
      : `<div class="rl-step">${esc(PR.name)} · ${PR.i + 1} / ${tot}</div><h2 class="${s.big ? 'rl-big' : ''}">${esc(s.t)}</h2>${s.h && n > 1 ? `<p class="rl-int">${esc(s.h)}</p>` : ''}<blockquote class="rl-x">${esc(s.x)}</blockquote>
        ${n > 1 ? `<div class="rl-beads">${Array.from({ length: n }, (_, j) => `<i class="${j < PR.k ? 'on' : ''}"></i>`).join('')}</div><div class="rl-n">${PR.k} / ${n}</div>` : ''}
        <button class="btn pri rl-go" data-act="rlNext">${n > 1 && PR.k < n - 1 ? 'Conta seguinte' : PR.i < tot - 1 ? 'Seguinte →' : 'Terminar'}</button>`;
    h = `<div class="rl-bar"><i style="width:${Math.round(Math.min(1, (PR.i + (PR.k / (s && s.n || 1))) / PR.steps.length) * 100)}%"></i></div>` + h; }
  else if (PR.kind === 'count') { const c = PR.cur, n = PR.n; h = `<div class="rl-step">${esc(PR.name)}</div><h2>${esc(c.t)}</h2>${c.x ? `<p class="rl-int">${esc(c.x)}</p>` : ''}<button class="rl-tap" data-act="rlTap" aria-label="Contar"><b>${PR.k}</b><small>de ${n}</small></button>
      <div class="rl-beads sm">${Array.from({ length: Math.min(n, 108) }, (_, j) => `<i class="${j < PR.k ? 'on' : ''}"></i>`).join('')}</div>${PR.sel || ''}<p class="mut" style="font-size:12px">Toca no círculo a cada repetição. Vibra a cada conta e no fim de cada volta.</p>`; }
  else if (PR.kind === 'timer') { const m = Math.floor(PR.left / 60), s = PR.left % 60; h = `<div class="rl-step">${esc(PR.name)}</div><h2>${PR.on ? esc(PR.cue || 'Respira') : PR.left <= 0 ? 'Terminado' : 'Meditação'}</h2>
      <div class="rl-ring" style="--p:${PR.tot ? 1 - PR.left / PR.tot : 0}"><b>${m}:${U.pad(s)}</b></div>
      ${PR.on ? `<p class="rl-int">${esc(PR.tip || '')}</p><button class="btn" data-act="rlPause">Pausa</button>` : PR.left > 0 && PR.started ? '<button class="btn pri" data-act="rlPause">Continuar</button>' : PR.left <= 0 ? '<button class="btn pri" data-act="rlStop">Fechar</button>' : `<div class="seg" role="group">${[5, 10, 15, 20, 30].map(x => `<button class="${PR.tot === x * 60 ? 'on' : ''}" data-act="rlDur" data-v="${x}">${x} min</button>`).join('')}</div><button class="btn pri rl-go" data-act="rlStart">Começar</button>`}`; }
  else if (PR.kind === 'steps') { const s = PR.steps[PR.i]; h = `<div class="rl-bar"><i style="width:${Math.round(PR.i / PR.steps.length * 100)}%"></i></div><div class="rl-step">${esc(PR.name)} · ${PR.i + 1}/${PR.steps.length}</div><h2>${esc(s.t)}</h2>${s.dur ? `<div class="rl-t">${Math.floor(PR.left / 60)}:${U.pad(PR.left % 60)}</div>` : ''}<p>${esc(s.x)}</p>${s.html || ''}<button class="btn pri rl-go" data-act="rlStepNext">${PR.i < PR.steps.length - 1 ? 'Seguinte →' : 'Terminar'}</button>`; }
  const html = `<div class="rl-pr" id="rlPr"><div class="row between"><span class="eyebrow">${esc(R.name())}</span><button class="icon-btn" data-act="rlStop" aria-label="Fechar">${UI.ic('x')}</button></div>${h}</div>`;
  const el = document.getElementById('rlPr'); if (el) el.outerHTML = html; else UI.modal(html, 'rl-m'); };
const finish = () => { if (PR && PR.done) try { PR.done(); } catch (e) { } };
A.rlNext = () => { if (!PR || PR.kind !== 'beads') return; const s = PR.steps[PR.i], n = s.n || 1; buzz(); if (n > 1 && PR.k < n - 1) { PR.k++; } else { PR.i++; PR.k = 0; if (PR.i >= PR.steps.length) { buzz([30, 60, 30]); finish(); } } draw(); };
A.rlTap = () => { if (!PR || PR.kind !== 'count') return; PR.k++; buzz(); if (PR.k >= PR.n) { buzz([40, 60, 40]); if (PR.seq && PR.si < PR.seq.length - 1) { PR.si++; PR.cur = PR.seq[PR.si]; PR.n = PR.cur.n; PR.k = 0; } else { PR.k = PR.n; finish(); if (OS.Vivo && OS.Vivo.burst) OS.Vivo.burst(innerWidth / 2, innerHeight / 2); setTimeout(() => { PR = null; UI.closeModal(); UI.toast('Concluído. Que a paz esteja contigo.', 'pos'); }, 400); return; } } draw(); };
A.rlMantra = b => { if (!PR) return; PR.cur = { t: MANTRAS[+b.dataset.v][0], x: MANTRAS[+b.dataset.v][1], n: 108 }; PR.mi = +b.dataset.v; PR.sel = mantraSel(); draw(); };
const mantraSel = () => `<div class="rl-ms">${MANTRAS.map((m, i) => `<button class="chip ${PR && PR.mi === i ? 'on' : ''}" data-act="rlMantra" data-v="${i}">${esc(m[1])}</button>`).join('')}</div>`;
let TT = 0;
const tick = () => { clearInterval(TT); TT = setInterval(() => { if (!PR) return clearInterval(TT); if (PR.kind === 'timer' && PR.on) { PR.left--; if (PR.left === Math.floor(PR.tot / 2)) bell(660, 1.6);
    if (PR.left <= 0) { PR.on = false; bell(528, 4); bell(792, 4); finish(); clearInterval(TT); } else if (PR.left % 45 === 0) PR.cue = PR.cues[(PR.tot - PR.left) / 45 % PR.cues.length | 0]; }
  if (PR.kind === 'steps' && PR.steps[PR.i].dur && PR.left > 0) { PR.left--; if (PR.left === 0) bell(660, 1.4); }
  if (!document.getElementById('rlPr')) { PR = null; return clearInterval(TT); } draw(); }, 1000); };
A.rlDur = b => { if (PR) { PR.tot = PR.left = +b.dataset.v * 60; draw(); } };
A.rlStart = () => { if (!PR) return; PR.on = true; PR.started = true; bell(528, 3); tick(); draw(); };
A.rlPause = () => { if (!PR) return; PR.on = !PR.on; draw(); };
A.rlStepNext = () => { if (!PR) return; if (PR.i < PR.steps.length - 1) { PR.i++; PR.left = PR.steps[PR.i].dur || 0; bell(660, 1.2); draw(); } else { finish(); PR = null; UI.closeModal(); UI.toast('Que a paz esteja contigo.', 'pos'); } };
A.rlStop = () => { clearInterval(TT); PR = null; UI.closeModal(); OS.request && OS.request(); };
const CUES = { budista: ['Sente o ar a entrar e a sair', 'Se a mente fugir, volta com gentileza à respiração', 'Nota o corpo, sem julgar', 'Só este momento'], espiritual: ['Respira devagar', 'Deixa os pensamentos passar como nuvens', 'Volta à respiração', 'Só este momento'], islamica: ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar', 'Lembra-te de Allah no silêncio'], hindu: ['Om', 'Respira com o mantra', 'Observa sem te prenderes', 'Paz'], '*': ['Respira devagar', 'Entrega o que te pesa', 'Fica em silêncio', 'Agradece'] };
R.start = (k, done) => { const r = id();
  if (k === 'terco') { const t = terco(); return beads(t.name, t.steps, done); }
  if (k === 'jesus') { PR = { kind: 'count', name: 'Oração de Jesus', cur: { t: JESUS, x: 'Diz devagar, ao ritmo da respiração.', n: 100 }, n: 100, k: 0, done }; return draw(); }
  if (k === 'tasbih') { const seq = [{ t: 'Subhanallah', x: 'Glorificado seja Allah', n: 33 }, { t: 'Alhamdulillah', x: 'Louvado seja Allah', n: 33 }, { t: 'Allahu Akbar', x: 'Allah é o Maior', n: 34 }]; PR = { kind: 'count', name: 'Tasbih', seq, si: 0, cur: seq[0], n: 33, k: 0, done }; return draw(); }
  if (k === 'japa') { PR = { kind: 'count', name: 'Japa', cur: { t: MANTRAS[0][0], x: MANTRAS[0][1], n: 108 }, n: 108, k: 0, mi: 0, done }; PR.sel = mantraSel(); return draw(); }
  if (k === 'med') { PR = { kind: 'timer', name: 'Meditação', tot: 600, left: 600, on: false, cues: CUES[r] || CUES['*'], tip: 'Senta-te direito, olhos fechados ou baixos. Quando ouvires o sino, começa.', done }; PR.cue = PR.cues[0]; return draw(); }
  const steps = { metta: [{ t: 'Para ti', x: 'Que eu esteja bem. Que eu esteja em paz. Que eu seja feliz.', dur: 90 }, { t: 'Para alguém querido', x: 'Pensa numa pessoa que amas. Que estejas bem. Que estejas em paz. Que sejas feliz.', dur: 90 }, { t: 'Para alguém neutro', x: 'Alguém que vês sem conhecer. Que estejas bem, em paz, feliz.', dur: 90 }, { t: 'Para alguém difícil', x: 'Alguém com quem tens conflito. Com sinceridade: que estejas bem, em paz, feliz.', dur: 90 }, { t: 'Para todos os seres', x: 'Que todos os seres estejam bem, em paz, livres de sofrimento e felizes.', dur: 90 }],
    lar: [{ t: 'Prece inicial', x: 'Reúne a família (ou fica a sós) num horário fixo da semana. Uma prece simples, do coração, a pedir a presença dos bons Espíritos.', dur: 120 }, { t: 'Leitura do Evangelho', x: 'Lê um trecho de O Evangelho segundo o Espiritismo, seguindo a ordem ou abrindo ao acaso.', dur: 300, html: '<button class="btn sm" data-act="rlOpenEse">Abrir o Evangelho</button>' }, { t: 'Comentário', x: 'Cada um diz o que entendeu e como o aplicar na vida desta semana. Sem discussões: com amor.', dur: 300 }, { t: 'Vibrações', x: 'Em silêncio, envia pensamentos de paz: para este lar, para os doentes, para quem sofre, para o mundo. Os teus pedidos aparecem em baixo.', dur: 180 }, { t: 'Prece final', x: 'Agradece e encerra. Se for costume, a água fluidificada pode ser bebida agora.', dur: 60 }],
    shema: [{ t: 'Prepara-te', x: 'Cobre os olhos com a mão direita e concentra-te.', dur: 15 }, { t: 'Shemá Israel', x: 'Shemá Israel, Adonai Eloheinu, Adonai Echad. — Ouve, Israel: o Senhor é nosso Deus, o Senhor é Um.', dur: 30 }, { t: 'Baruch Shem', x: 'Baruch shem kevod malchutó le’olam va’ed. — Bendito seja o nome da glória do Seu reino para todo o sempre. (em voz baixa)', dur: 20 }, { t: 'Veahavtá', x: 'Amarás o Senhor teu Deus com todo o teu coração, com toda a tua alma e com todas as tuas forças. (Devarim 6:5-9)', dur: 90 }],
    orixa: [{ t: 'Orixá do dia', x: orixaToday().map(o => `${o.n}: ${o.s}`).join(' · '), dur: 30 }, { t: 'Firmeza', x: 'Acende uma vela (se for o teu costume), respira e concentra-te no Orixá do dia, nas suas cores e no seu elemento.', dur: 60 }, { t: 'Prece', x: 'Fala com o teu Orixá com as tuas palavras: agradece, pede proteção e força para o dia.', dur: 120 }, { t: 'Saudação', x: 'Termina com a saudação: ' + orixaToday().map(o => o.s).join(' '), dur: 15 }],
    acts: [] }[k];
  if (steps && steps.length) { PR = { kind: 'steps', name: (R.practices(r).find(x => x[0] === k) || [])[1] || '', steps, i: 0, left: steps[0].dur || 0, done }; bell(528, 2); tick(); return draw(); }
  return false; };
A.rlOpenEse = () => { A.rlStop(); location.hash = 'fe.biblia'; };

/* ---------- Orixás ---------- */
const ORX = { exu: { n: 'Exu', s: 'Laroyê!', c: 'vermelho e preto', e: 'os caminhos e a comunicação' }, ogum: { n: 'Ogum', s: 'Ogunhê!', c: 'azul-escuro (no Candomblé) ou vermelho (na Umbanda)', e: 'o ferro, o trabalho e as batalhas' }, oxossi: { n: 'Oxóssi', s: 'Okê Arô!', c: 'verde', e: 'as matas, a fartura e o conhecimento' },
  xango: { n: 'Xangô', s: 'Kaô Kabecilê!', c: 'vermelho e branco', e: 'a justiça e os trovões' }, iansa: { n: 'Iansã', s: 'Eparrei, Oyá!', c: 'amarelo e coral', e: 'os ventos, as tempestades e a mudança' }, oxum: { n: 'Oxum', s: 'Ora Yê Yê Ô!', c: 'amarelo-dourado', e: 'as águas doces, o amor e a prosperidade' },
  iemanja: { n: 'Iemanjá', s: 'Odoyá!', c: 'azul-claro e branco', e: 'o mar e a maternidade' }, nana: { n: 'Nanã', s: 'Saluba, Nanã!', c: 'lilás', e: 'a sabedoria dos mais velhos e a lama primordial' }, omolu: { n: 'Omolu / Obaluaê', s: 'Atotô!', c: 'preto, branco e palha', e: 'a saúde e a cura' },
  oxala: { n: 'Oxalá', s: 'Epa Babá!', c: 'branco', e: 'a paz, a fé e a criação' }, ibeji: { n: 'Ibeji (Erês)', s: 'Onipê Ibejada!', c: 'cores alegres', e: 'a alegria e a infância' } };
// dia da semana mais comum na Umbanda (varia de casa para casa): domingo Ibeji, segunda Exu e Omolu, terça Ogum, quarta Xangô e Iansã, quinta Oxóssi, sexta Oxalá, sábado Iemanjá, Oxum e Nanã
const DOW = [['ibeji'], ['exu', 'omolu'], ['ogum'], ['xango', 'iansa'], ['oxossi'], ['oxala'], ['iemanja', 'oxum', 'nana']];
const orixaToday = (d = U.today()) => DOW[new Date(d + 'T12:00').getDay()].map(k => ORX[k]);
R.orixas = orixaToday; R.ORX = ORX;

/* ---------- painéis do dia (salah, Shabat, lua, Orixá) ---------- */
const where = () => OS.Weather && OS.Weather.where ? OS.Weather.where().catch(() => null) : Promise.resolve(null);
const dd = d => d.split('-').reverse().join('-');
const SAL = { Fajr: 'Fajr (alvorada)', Sunrise: 'Nascer do sol', Dhuhr: 'Dhuhr (meio-dia)', Asr: 'Asr (tarde)', Maghrib: 'Maghrib (pôr do sol)', Isha: 'Isha (noite)' };
let SB = null;
const salah = async () => { const k = 'os2salah', c = U.ls.get(k, null); if (c && c.d === U.today()) return c; if (SB) return SB;
  SB = (async () => { const g = await where(); if (!g) return null; const r = await fetch(`https://api.aladhan.com/v1/timings/${dd(U.today())}?latitude=${g.lat}&longitude=${g.lon}&method=3`), j = await r.json(); const t = j.data && j.data.timings; if (!t) return null;
    const o = { d: U.today(), city: g.label, t: Object.fromEntries(Object.keys(SAL).map(x => [x, String(t[x]).slice(0, 5)])), hijri: j.data.date && j.data.date.hijri ? j.data.date.hijri.day + ' ' + (j.data.date.hijri.month.en || '') + ' ' + j.data.date.hijri.year : '', q: qibla(g.lat, g.lon) };
    U.ls.set(k, o); OS.request && OS.request(); return o; })().catch(() => null).finally(() => { SB = null; }); return SB; };
const qibla = (la, lo) => { const r = x => x * Math.PI / 180, K = [21.4225, 39.8262], dl = r(K[1] - lo), y = Math.sin(dl) * Math.cos(r(K[0])), x = Math.cos(r(la)) * Math.sin(r(K[0])) - Math.sin(r(la)) * Math.cos(r(K[0])) * Math.cos(dl); return Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360); };
let HB = null;
const shabbat = async () => { const k = 'os2shab', c = U.ls.get(k, null); if (c && c.d === U.today()) return c; if (HB) return HB;
  HB = (async () => { const g = await where(); if (!g) return null; const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
    const r = await fetch(`https://www.hebcal.com/shabbat?cfg=json&latitude=${g.lat}&longitude=${g.lon}&tzid=${encodeURIComponent(tz)}&M=on&lg=s`), j = await r.json(); const it = j.items || [];
    const f = c2 => it.find(x => x.category === c2); const cand = f('candles'), hav = f('havdalah'), par = f('parashat');
    const o = { d: U.today(), city: g.label, cand: cand && cand.date, hav: hav && hav.date, par: par ? { t: par.title, h: par.hebrew, l: par.leyning && par.leyning.torah } : null }; U.ls.set(k, o); OS.request && OS.request(); return o; })().catch(() => null).finally(() => { HB = null; }); return HB; };
const moon = d => { const jd = new Date(d + 'T12:00Z').getTime() / 864e5 + 2440587.5, age = ((jd - 2451550.1) / 29.530588853) % 1; return age < 0 ? age + 1 : age; };
const nextPhase = (target) => { let d = U.today(); for (let i = 0; i < 31; i++) { const a = moon(d), b = moon(U.addDays(d, 1)); if ((target === .5 && a <= .5 && b > .5) || (target === 0 && a > b)) return { d: U.addDays(d, a > b || target === .5 ? 1 : 0), i: i + 1 }; d = U.addDays(d, 1); } return null; };
const hm = s => { if (!s) return ''; const x = new Date(s); return isNaN(x) ? '' : x.toLocaleTimeString(OS.loc ? OS.loc() : 'pt-PT', { hour: '2-digit', minute: '2-digit' }); };
const dayN = s => { if (!s) return ''; const x = new Date(s); return isNaN(x) ? '' : x.toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { weekday: 'long' }); };
const calDate = cal => { try { return new Intl.DateTimeFormat((OS.loc ? OS.loc() : 'pt-PT') + '-u-ca-' + cal, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { return ''; } };
R.panel = () => { const r = id(), fam = (REL[r] || {}).fam;
  if (fam === 'islam') { const s = U.ls.get('os2salah', null); salah(); const now = new Date().toTimeString().slice(0, 5);
    if (!s || s.d !== U.today()) return `<div class="pn rl-pn"><div class="pn-h"><h3>${UI.ic('clock')}Horários de oração</h3></div><p class="mut">A calcular os horários para a tua cidade…</p></div>`;
    const nx = Object.keys(SAL).filter(k => k !== 'Sunrise').find(k => s.t[k] > now);
    return `<div class="pn rl-pn"><div class="pn-h"><h3>${UI.ic('clock')}Horários de oração · ${esc(s.city || '')}</h3><span class="mut" style="font-size:12px">${esc(calDate('islamic-umalqura') || s.hijri)}</span></div>
      <div class="rl-times">${Object.keys(SAL).map(k => `<div class="${k === nx ? 'on' : ''} ${s.t[k] < now && k !== nx ? 'past' : ''}"><small>${esc(SAL[k])}</small><b>${esc(s.t[k])}</b></div>`).join('')}</div>
      <div class="rl-qibla"><span class="rl-arrow" style="--a:${s.q}deg" aria-hidden="true">↑</span><span>Qibla: <b>${s.q}°</b> a partir do norte (na direção de Meca)</span></div>
      <small class="mut">Método da Liga Muçulmana Mundial · aladhan.com. Confirma com a tua mesquita.</small></div>`; }
  if (fam === 'judaica') { const s = U.ls.get('os2shab', null); shabbat(); const hd = calDate('hebrew');
    if (!s || s.d !== U.today()) return `<div class="pn rl-pn"><div class="pn-h"><h3>${UI.ic('star')}Shabat</h3><span class="mut" style="font-size:12px">${esc(hd)}</span></div><p class="mut">A procurar os horários para a tua cidade…</p></div>`;
    const lr = s.par && s.par.l ? s.par.l.split(/[-–]/)[0].trim() : '', m = lr.match(/^([1-2]?\s?[A-Za-z]+)\s+(\d+)/), BK = { Genesis: 'GEN', Exodus: 'EXO', Leviticus: 'LEV', Numbers: 'NUM', Deuteronomy: 'DEU' }, go = m && BK[m[1]] ? BK[m[1]] + '.' + m[2] : '';
    return `<div class="pn rl-pn"><div class="pn-h"><h3>${UI.ic('star')}Shabat · ${esc(s.city || '')}</h3><span class="mut" style="font-size:12px">${esc(hd)}</span></div>
      <div class="rl-times">${s.cand ? `<div><small>Acender as velas (${esc(dayN(s.cand))})</small><b>${esc(hm(s.cand))}</b></div>` : ''}${s.hav ? `<div><small>Havdalá (${esc(dayN(s.hav))})</small><b>${esc(hm(s.hav))}</b></div>` : ''}</div>
      ${s.par ? `<p style="margin:8px 0 0">Parashá da semana: <b>${esc(s.par.t)}</b> <span dir="rtl">${esc(s.par.h || '')}</span>${s.par.l ? ` · <span class="mut">${esc(s.par.l)}</span>` : ''}</p>${go ? `<button class="btn xs" data-act="feGo" data-r="${go}" style="margin-top:6px">Ler a parashá</button>` : ''}` : ''}
      <small class="mut" style="display:block;margin-top:6px">Horários de hebcal.com para a tua cidade.</small></div>`; }
  if (fam === 'budista') { const a = moon(U.today()), full = nextPhase(.5), nw = nextPhase(0), ph = a < .03 || a > .97 ? 'Lua nova' : Math.abs(a - .5) < .03 ? 'Lua cheia' : a < .5 ? 'Lua crescente' : 'Lua minguante', up = /cheia|nova/.test(ph);
    return `<div class="pn rl-pn"><div class="pn-h"><h3>${UI.ic('sun')}Uposatha</h3><span class="mut" style="font-size:12px">${esc(ph)}</span></div><div class="rl-moon" aria-hidden="true"><i style="--x:${(a < .5 ? -a * 200 : (1 - a) * 200).toFixed(1)}%"></i></div>
      <p style="margin:6px 0 0">${up ? '<b>Hoje é dia de Uposatha</b>: um bom dia para meditar mais, guardar os preceitos e ouvir o Dhamma.' : `Próxima lua cheia: <b>${full ? U.fmtD(full.d) : '—'}</b>${full ? ` (daqui a ${full.i} dias)` : ''} · lua nova: ${nw ? U.fmtD(nw.d) : '—'}.`}</p></div>`; }
  if (fam === 'afro') { const os = orixaToday();
    return `<div class="pn rl-pn rl-orixa"><div class="pn-h"><h3>${UI.ic('star')}Orixá do dia</h3><span class="mut" style="font-size:12px">${esc(new Date().toLocaleDateString(OS.loc ? OS.loc() : 'pt-PT', { weekday: 'long' }))}</span></div>
      ${os.map(o => `<div class="rl-ox"><b>${esc(o.n)}</b><span class="rl-sd">${esc(o.s)}</span><small class="mut">Cores: ${esc(o.c)} · ${esc(o.e)}</small></div>`).join('')}
      <small class="mut">Os dias de cada Orixá variam de casa para casa; segue sempre o que aprendeste no teu terreiro.</small></div>`; }
  return ''; };

/* ---------- escolher a religião (Definições e questionário) ---------- */
const areas = () => OS.one('areas');
R.set = (r, quiet) => { if (!REL[r]) return; const c = cfg(), prev = c.rel; if (prev === r) return; c.rel = r; c.word = null; c.vodx = null; c.plan = ''; OS.touch('faith');
  // "nenhuma" tira a aba Fé do menu; escolher uma religião depois de "nenhuma" volta a pô-la
  try { const h = new Set((areas() || {}).hide || []); if (r === 'nenhuma') h.add('fe'); else if (prev === 'nenhuma' || !quiet) h.delete('fe'); if (OS.Areas) OS.Areas.set([...h]); else { areas().hide = [...h]; OS.touch('areas'); } } catch (e) { }
  OS.emit && OS.emit('rel', r);
  if (!quiet) UI.toast(r === 'nenhuma' ? 'A aba Fé saiu do menu. Podes voltar a pô-la aqui.' : 'A aba Fé agora é ' + R.name(r).toLowerCase(), 'pos'); OS.request && OS.request(); };
A.relSet = b => R.set(b.value || b.dataset.v);
document.addEventListener('change', e => { const el = e.target; if (el && el.dataset && el.dataset.rel === 'set') R.set(el.value); });
R.select = (cur = cfg().rel, attr = 'data-rel="set"') => `<select class="field" ${attr} aria-label="Religião">${R.chosen() || cur ? '' : '<option value="">Escolhe…</option>'}${ORD.map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${REL[k].s} ${esc(REL[k].n)}</option>`).join('')}</select>`;
OS.on && OS.on('ready', () => { const o = OS.views.definicoes; if (!o || o._rl) return; OS.views.definicoes = sub => { const h = o(sub); if (String(sub || '') !== '') return h;
  const panel = `<div class="pn" id="relSet"><div class="pn-h"><h3>${UI.ic('heart')}Fé e religião</h3><span class="mut" style="font-size:12px">${esc(R.chosen() ? R.name() : 'por escolher')}</span></div>
    <p class="mut" style="margin:0 0 10px">A aba Fé muda conforme a tua religião: o livro sagrado (na tua língua), as orações, a prática guiada, os planos de leitura e a IA. Podes mudar quando quiseres; o que já escreveste fica guardado.</p>${R.select()}</div>`;
  const i = h.indexOf('<div class="pn" id="onbSet"'); return i > 0 ? h.slice(0, i) + panel + h.slice(i) : h + panel; }; OS.views.definicoes._rl = 1; });
})();
