/* PRUMO — Banco: os movimentos das contas bancárias entram nas Finanças sem os escrever à mão.
   1) Importar extrato (todas as contas): o ficheiro que o banco ou outra app de finanças exporta — OFX, QIF, CSV ou Excel.
      Lê o formato sozinho (colunas, separador, datas, vírgula ou ponto) e mostra tudo antes de importar.
   2) Ligação automática (só a conta do dono do Prumo, porque as chaves são dele): Open Finance no Brasil pela Pluggy (Meu Pluggy)
      e PSD2 na Europa pelo Enable Banking, através de api/banco. Só leitura: o Prumo nunca faz pagamentos.
   Em ambos: nada se duplica (nem o que já escreveste à mão), as categorias saem do que já classificaste e de regras de lojas
   portuguesas e brasileiras, e o dinheiro que passa de uma conta tua para outra fica numa só Transferência. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, L = OS.L, esc = U.esc;
const Acc = () => OS.Acc || {};
const on = () => !!(Acc().on && Acc().token && Acc().token() && Acc().pid && Acc().pid());
OS.ONE_DEF.banklink = { map: {}, accs: {}, last: '', auto: true, gone: [] };
const BK = OS.Banco = {};
const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const r2 = v => Math.round(v * 100) / 100;
const XLSX_URL = 'vendor/xlsx.full.min.js';

/* ================= números e datas (de qualquer banco) ================= */
// separador decimal de uma coluna inteira: "12,30" → vírgula; "12.30" → ponto
const decOf = vals => { let c = 0, d = 0; vals.forEach(v => { if (typeof v === 'number') return; const s = String(v == null ? '' : v).trim(); if (/,\d{1,2}(\s*[A-Za-z€$-]*)?\)?$/.test(s)) c++; if (/\.\d{1,2}(\s*[A-Za-z€$-]*)?\)?$/.test(s)) d++; }); return c > d ? ',' : d > c ? '.' : ''; };
const num = (v, dec) => { if (typeof v === 'number') return isFinite(v) ? v : NaN;
  let s = String(v == null ? '' : v).replace(/[−–]/g, '-').replace(/ /g, ' ').trim(); if (!s || !/\d/.test(s)) return NaN;
  let sg = 1; if (/^\(.*\)$/.test(s)) { sg = -1; s = s.slice(1, -1).trim(); }
  if (/(^|[\s\d])D$/i.test(s)) { sg = -sg; s = s.replace(/\s*D$/i, ''); } else s = s.replace(/\s*C$/i, '');
  if (/-\s*$/.test(s)) { sg = -sg; s = s.replace(/-\s*$/, ''); } else if (/^[^\d]*-/.test(s)) sg = -sg;
  s = s.replace(/[^\d,.]/g, ''); if (!/\d/.test(s)) return NaN;
  if (!dec) { const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.'); dec = lc >= 0 && ld >= 0 ? (lc > ld ? ',' : '.') : lc >= 0 ? ((s.match(/,/g).length > 1 || /,\d{3}$/.test(s)) ? '.' : ',') : ld >= 0 ? (s.match(/\./g).length > 1 ? ',' : '.') : '.'; }
  s = dec === ',' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const r = parseFloat(s); return isNaN(r) ? NaN : sg * r; };
const MON = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
const okD = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100) ? `${y}-${U.pad(m)}-${U.pad(d)}` : '';
// dia/mês ou mês/dia? decide-se pela coluna inteira (um 13 ou mais diz qual é o dia)
const dOrder = vals => { let a = 0, b = 0; vals.forEach(v => { const m = String(v == null ? '' : v).trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/); if (m) { if (+m[1] > 12) a++; if (+m[2] > 12) b++; } }); return b > a ? 'mdy' : 'dmy'; };
const date = (v, ord = 'dmy') => {
  if (v instanceof Date && !isNaN(v)) return U.iso(v);
  if (typeof v === 'number') { if (v > 20000 && v < 80000) { const X = window.XLSX; if (X && X.SSF) { const d = X.SSF.parse_date_code(v); if (d) return okD(d.y, d.m, d.d); } return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10); } return ''; }
  const s = String(v == null ? '' : v).trim().replace(/'/g, '/'); if (!s) return ''; let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return okD(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^((?:19|20)\d{2})(\d{2})(\d{2})/))) return okD(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/))) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return ord === 'mdy' ? okD(y, +m[1], +m[2]) : okD(y, +m[2], +m[1]); }
  const n = norm(s);
  if ((m = n.match(/^(\d{1,2})(?: de)?[ \-/.]+([a-z]{3})[a-z]*\.?(?: de)?[ \-/.,]+(\d{2,4})/)) && MON[m[2]]) return okD(m[3].length === 2 ? 2000 + +m[3] : +m[3], MON[m[2]], +m[1]);
  if ((m = n.match(/^([a-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})/)) && MON[m[1]]) return okD(+m[3], MON[m[1]], +m[2]);
  // só dia/mês (faturas de cartão): o ano é o mais recente que não fique no futuro
  if ((m = s.match(/^(\d{1,2})[/.\-](\d{1,2})$/)) || ((m = n.match(/^(\d{1,2})[ \-/]([a-z]{3})$/)) && MON[m[2]] && (m = [m[0], m[1], MON[m[2]]]))) { const t = U.today(), y = +t.slice(0, 4); let d = okD(y, +m[2], +m[1]); if (d && d > U.addDays(t, 3)) d = okD(y - 1, +m[2], +m[1]); return d; }
  return ''; };

/* ================= leitura dos ficheiros ================= */
let xlsxP = null;
const loadX = () => window.XLSX ? Promise.resolve(window.XLSX) : (xlsxP = xlsxP || new Promise((res, rej) => { const s = document.createElement('script'); s.src = XLSX_URL; s.async = true; s.onload = () => window.XLSX ? res(window.XLSX) : rej(new Error('Leitor de Excel indisponível.')); s.onerror = () => { xlsxP = null; rej(new Error('Sem internet para abrir o Excel. Tenta de novo com ligação, ou exporta em CSV.')); }; document.head.appendChild(s); }));
const decode = buf => { try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { try { return new TextDecoder('windows-1252').decode(buf); } catch (e2) { return new TextDecoder().decode(buf); } } };
const sepOf = txt => { const lines = txt.split(/\r?\n/).filter(l => l.trim()).slice(0, 40); let best = [',', -1];
  [';', '\t', ',', '|'].forEach(c => { const f = {}; lines.forEach(l => { let k = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === c && !q) k++; } if (k) f[k] = (f[k] || 0) + 1; });
    const top = Object.entries(f).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0], sc = top ? top[1] * 10 + Math.min(+top[0], 9) : 0; if (sc > best[1]) best = [c, sc]; }); return best[0]; };
const csvRows = txt => { const sep = sepOf(txt), out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) { const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"' && !cur.trim()) { q = true; cur = ''; } else if (ch === sep) { row.push(cur.trim()); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur.trim()); if (row.some(x => x)) out.push(row); row = []; cur = ''; } else cur += ch; }
  row.push(cur.trim()); if (row.some(x => x)) out.push(row); return out; };
const unent = s => String(s || '').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/\s+/g, ' ').trim();

// OFX (o formato mais completo: traz o id de cada movimento, a conta e o saldo)
const ofx = (txt, name) => { const tag = (b, t) => { const m = b.match(new RegExp('<' + t + '>\\s*([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
  const rows = [], seen = {};
  (txt.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi) || []).forEach(b => { const raw = tag(b, 'TRNAMT'), d = date(tag(b, 'DTPOSTED') || tag(b, 'DTUSER')), a = num(raw, raw.includes(',') && !raw.includes('.') ? ',' : '.'); if (!d || isNaN(a) || !a) return;
    const nm = unent(tag(b, 'NAME')), memo = unent(tag(b, 'MEMO')), desc = (nm && memo && !norm(memo).includes(norm(nm)) && !norm(nm).includes(norm(memo)) ? nm + ' · ' + memo : memo.length > nm.length ? memo : nm) || tag(b, 'TRNTYPE');
    let id = tag(b, 'FITID'); if (id) { if (seen[id]) id += '#' + (++seen[id]); else seen[id] = 1; }
    rows.push({ date: d, desc, amount: a, ext: id ? 'fit:' + id : '' }); });
  const lb = (txt.match(/<LEDGERBAL>[\s\S]{0,300}/i) || [''])[0], bal = num(tag(lb, 'BALAMT'), '.');
  return { name, fmt: 'OFX', rows, acct: { num: tag(txt, 'ACCTID').slice(-8), cur: tag(txt, 'CURDEF').toUpperCase(), bank: unent(tag(txt, 'ORG')), card: /<CCSTMTRS>/i.test(txt), bal: isNaN(bal) ? null : bal, balD: date(tag(lb, 'DTASOF')) || (rows.length ? rows.map(r => r.date).sort().pop() : '') } }; };

// QIF (exportado por apps antigas de finanças)
const qif = (txt, name) => { const recs = [];
  txt.split(/^\^\s*$/m).forEach(r => { const o = {}; r.split(/\r?\n/).forEach(l => { const k = l[0], v = l.slice(1).trim(); if (!k || k === '!') return; if (k === 'D') o.d = v; else if ((k === 'T' || k === 'U') && !o.t) o.t = v; else if (k === 'P') o.p = v; else if (k === 'M') o.m = v; else if (k === 'L') o.l = v; else if (k === 'N') o.n = v; }); if (o.d && o.t) recs.push(o); });
  const ord = dOrder(recs.map(o => o.d.replace(/'/g, '/'))), dec = decOf(recs.map(o => o.t));
  return { name, fmt: 'QIF', rows: recs.map(o => ({ date: date(o.d, ord), desc: unent(o.p || o.m || ''), amount: num(o.t, dec), cat: (o.l || '').replace(/^\[.*\]$/, ''), ext: '' })).filter(r => r.date && !isNaN(r.amount) && r.amount), acct: {} }; };

// tabelas (CSV e Excel): procura a linha dos títulos e o papel de cada coluna
const HD = {
  date: /^(data|date|fecha|dt|dia)\b|data (do |de )?(mov|lanc|oper|trans|compra)|^(started|completed|booking|transaction|posting|posted) date|^posted/,
  dval: /data (de |do )?valor|value date|^completed date/,
  desc: /descri|histor|^title$|titulo|memo|narrat|detalhe|payee|benefici|estabelec|merchant|^name$|^nome$|^lancamento$|^movimento$|^concept|^details?$|^description$|^referencia$|^informac/,
  amt: /^(valor|montante|amount|quantia|importe|value|total|movimento)( \(?(eur|brl|usd|gbp|r\$|€|\$)\)?)?$|^valor (em |do |da )?(r\$|eur|euros|reais|lancamento|operacao|transacao|movimento)|^montante|^amount/,
  deb: /debito|debit|^saida|withdraw|paid out|^out$|^despesa|^levantamento/,
  cred: /credito|credit|^entrada|deposit|paid in|^in$|^receita/,
  cur: /^(moeda|currency|divisa|curr)$/,
  bal: /saldo|balance/,
  id: /^(id|identificador|transaction id|transferwise id|referencia unica|n\.? ?(do )?(doc|documento)|documento|fitid)$/,
  state: /^(state|estado|status|situacao)$/,
  fee: /^(fee|fees|taxa|comissao)$/,
  cat: /^(categoria|category)$/,
  dc: /^(tipo|type|d\/c|dc|natureza|sinal|debito\/credito|credito\/debito|cr\/db|db\/cr)$/
};
const DCV = /^(d|c|db|cr|dr|debito|credito|debit|credit|saida|entrada|despesa|receita)$/, DEBV = /^(d|db|dr|debito|debit|saida|despesa)$/;
const ROLES = ['date', 'desc', 'amt', 'deb', 'cred', 'cur', 'bal', 'id', 'state', 'fee', 'cat', 'dc'];
const mapOf = hdr => { const h = hdr.map(norm), M = {}; ROLES.forEach(k => { M[k] = -1; });
  const pick = (k, not = []) => { const j = h.findIndex((x, i) => x && HD[k].test(x) && !not.includes(i) && !(k !== 'bal' && HD.bal.test(x) && !HD[k].test(x.replace(/saldo|balance/, '')))); return j; };
  const dv = h.findIndex(x => HD.dval.test(x)); M.date = h.findIndex((x, i) => HD.date.test(x) && i !== dv); if (M.date < 0) M.date = dv;
  M.amt = h.findIndex(x => HD.amt.test(x) && !HD.bal.test(x)); M.deb = h.findIndex(x => HD.deb.test(x) && !HD.bal.test(x)); M.cred = h.findIndex(x => HD.cred.test(x) && !HD.bal.test(x));
  if (M.deb >= 0 && M.cred >= 0 && M.amt >= 0 && /movimento/.test(h[M.amt])) M.amt = -1;
  M.desc = h.findIndex((x, i) => HD.desc.test(x) && i !== M.date && i !== M.amt); M.bal = h.findIndex(x => HD.bal.test(x));
  ['cur', 'id', 'state', 'fee', 'cat', 'dc'].forEach(k => { M[k] = pick(k, [M.date, M.desc, M.amt]); });
  return M; };
const filled = v => String(v == null ? '' : v).trim() !== '';
// sem títulos reconhecíveis: decide pelo conteúdo (a coluna com datas, a com números, a com mais texto)
const guessMap = data => { const n = Math.max(0, ...data.slice(0, 60).map(r => r.length)), M = {}; ROLES.forEach(k => { M[k] = -1; });
  const col = j => data.slice(0, 80).map(r => r[j]).filter(filled), fr = (c, f) => c.length ? c.filter(f).length / c.length : 0;
  const isD = v => !!date(v), isN = v => !isNaN(num(v)) && !isD(v) && !/[a-z]{3}/i.test(String(v).replace(/[DC]$/i, '').replace(/eur|brl|usd|r\$/i, ''));
  for (let j = 0; j < n; j++) { const c = col(j); if (M.date < 0 && fr(c, isD) > .7) { M.date = j; continue; } if (M.amt < 0 && fr(c, isN) > .8) { M.amt = j; continue; } }
  let best = -1, bl = 0; for (let j = 0; j < n; j++) { if (j === M.date || j === M.amt) continue; const c = col(j), avg = c.length ? c.reduce((s, v) => s + String(v).length, 0) / c.length : 0; if (fr(c, v => !isN(v) && !isD(v)) > .6 && avg > bl) { bl = avg; best = j; } } M.desc = best;
  return M; };
const table = (rows, name) => { if (!rows || rows.length < 1) return null; let hi = -1, sc = 0;
  for (let i = 0; i < Math.min(rows.length, 30); i++) { const M = mapOf(rows[i] || []); const s = (M.date >= 0 ? 2 : 0) + (M.amt >= 0 || (M.deb >= 0 && M.cred >= 0) ? 2 : (M.deb >= 0 || M.cred >= 0 ? 1 : 0)) + (M.desc >= 0 ? 1 : 0); if (s >= 4 && s > sc) { sc = s; hi = i; } }
  const hdr = hi >= 0 ? rows[hi].map(x => String(x == null ? '' : x).trim()) : [], data = rows.slice(hi + 1).filter(r => r && r.some(filled));
  const M = hi >= 0 ? mapOf(hdr) : guessMap(data); if (M.date < 0) return null;
  if (M.dc >= 0) { const v = data.slice(0, 40).map(r => norm(r[M.dc])).filter(Boolean); if (!v.length || v.filter(x => DCV.test(x)).length / v.length < .8) M.dc = -1; }
  const width = Math.max(hdr.length, ...data.slice(0, 50).map(r => r.length));
  return { name, fmt: /\.xlsx?$|\.ods$/i.test(name) ? 'Excel' : 'CSV', hdr: Array.from({ length: width }, (_, j) => hdr[j] || 'Coluna ' + (j + 1)), data, M, acct: {} }; };
const SKIPD = /^(saldo|total|s ?a ?l ?d ?o|saldo anterior|saldo inicial|saldo final|saldo do dia|saldo disponivel|resumo|subtotal)\b/;
const BADST = /revert|declin|fail|cancel|rejeit|recusad|rjct|anulad/;
// linhas → movimentos, com o mapa de colunas escolhido
const fromTable = (T, inv) => { const M = T.M, out = [], skip = {}, sk = k => { skip[k] = (skip[k] || 0) + 1; };
  const ord = dOrder(T.data.map(r => r[M.date])), cols = [M.amt, M.deb, M.cred, M.fee, M.bal].filter(j => j >= 0), dec = decOf([].concat(...T.data.slice(0, 300).map(r => cols.map(j => r[j]))));
  T.data.forEach(r => { const d = date(r[M.date], ord), desc = M.desc >= 0 ? unent(r[M.desc]) : '';
    if (!d) return sk(filled(r[M.date]) ? 'data que não percebi' : 'linhas sem data'); if (SKIPD.test(norm(desc))) return sk('saldos e totais');
    if (M.state >= 0 && BADST.test(norm(r[M.state]))) return sk('recusados ou anulados');
    let a; if (M.amt >= 0) a = num(r[M.amt], dec); else { const db = M.deb >= 0 ? num(r[M.deb], dec) : NaN, cr = M.cred >= 0 ? num(r[M.cred], dec) : NaN; a = isNaN(db) && isNaN(cr) ? NaN : (isNaN(cr) ? 0 : Math.abs(cr)) - (isNaN(db) ? 0 : Math.abs(db)); }
    if (isNaN(a) || !a) return sk('valor vazio ou zero');
    if (M.dc >= 0 && M.amt >= 0) { const t = norm(r[M.dc]); if (DCV.test(t)) a = DEBV.test(t) ? -Math.abs(a) : Math.abs(a); }
    if (M.fee >= 0) { const f = num(r[M.fee], dec); if (!isNaN(f) && f) a -= Math.abs(f); }
    out.push({ date: d, desc, amount: r2(inv ? -a : a), cur: M.cur >= 0 ? String(r[M.cur] || '').trim().toUpperCase().slice(0, 3) : '', cat: M.cat >= 0 ? String(r[M.cat] || '').trim() : '', ext: M.id >= 0 && filled(r[M.id]) ? 'id:' + String(r[M.id]).trim() : '', bal: M.bal >= 0 ? num(r[M.bal], dec) : NaN }); });
  return { rows: out, skip }; };
const readFile = async f => { const name = f.name || 'extrato';
  if (/\.(xlsx|xls|ods)$/i.test(name)) { const X = await loadX(), wb = X.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' });
    const T = wb.SheetNames.map(sn => table(X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }), name)).filter(Boolean).sort((a, b) => b.data.length - a.data.length)[0];
    if (!T) throw new Error(`Não encontrei movimentos em "${name}". Confirma que é o extrato (com datas e valores).`); return T; }
  if (/\.pdf$/i.test(name)) throw new Error('PDF não dá para ler com segurança. No banco ou na app, escolhe exportar em OFX, CSV ou Excel.');
  const txt = decode(new Uint8Array(await f.arrayBuffer())).replace(/^﻿/, '');
  if (/<OFX>|OFXHEADER|<STMTTRN>/i.test(txt)) return ofx(txt, name);
  if (/^!Type:/im.test(txt)) return qif(txt, name);
  const T = table(csvRows(txt), name); if (!T) throw new Error(`Não encontrei movimentos em "${name}". Confirma que é o extrato (com datas e valores).`); return T; };

/* ================= categorias, forma de pagamento, transferências ================= */
// [palavras, tipo, categoria, subcategoria] — lojas e serviços de Portugal e do Brasil
const RULES = [
  [/\b(uber ?eats|glovo|bolt ?food|ifood|rappi|just ?eat|deliveroo|ze delivery)/, 'Despesa', 'Alimentação', 'Delivery'],
  [/\b(continente|pingo doce|lidl|aldi\b|minipreco|intermarche|auchan|mercadona|e\.? ?leclerc|spar\b|meu super|froiz|apolonia|celeiro|carrefour|pao de acucar|assai\b|atacadao|supermerc|hipermerc|hortifruti|sams club|makro|oxxo|minimercado|mercearia|talho|acougue)/, 'Despesa', 'Alimentação', 'Supermercado'],
  [/\b(starbucks|nespresso|delta cafe|cafetaria|cafeteria|pastelaria|padaria|confeitaria|panificadora|cafe\b)/, 'Despesa', 'Alimentação', 'Café & snacks'],
  [/\b(restaurant|mcdonald|burger king|kfc\b|telepizza|pizza hut|domino|h3\b|vitaminas|nandos|subway|tasca|churrasc|sushi|marisqueira|cervejaria|outback|madero|habib|giraffas|spoleto|bobs\b|lanchonete|snack ?bar)/, 'Despesa', 'Alimentação', 'Restaurantes'],
  [/\b(galp(?! energia)|repsol|cepsa|prio\b|bp\b|shell\b|ipiranga|petrobras|br mania|posto|combust|gasolin|alves bandeira)/, 'Despesa', 'Transporte', 'Combustível'],
  [/\b(uber|bolt\b|99 ?app|99 ?pop|cabify|free ?now|taxi)/, 'Despesa', 'Transporte', 'Uber/Bolt'],
  [/\b(comboios|cp\b|metro\b|metropolitano|carris|stcp|transtejo|fertagus|flixbus|rede expressos|andante|navegante|viva viagem|bilhete unico|sptrans|riocard|onibus|autocarro|portagem|via verde|sem parar|conectcar|estacionamento|emel\b)/, 'Despesa', 'Transporte', 'Transportes públicos'],
  [/\b(ryanair|tap air|easyjet|vueling|latam|gol linhas|voegol|azul linhas|voeazul|booking\.com|airbnb|hotel|hostel|pousada|expedia|decolar)/, 'Despesa', 'Lazer', 'Viagens'],
  [/\b(netflix|spotify|disney|hbo\b|max\.com|prime video|primevideo|youtube premium|crunchyroll|globoplay|deezer|apple music|paramount|dazn|sport ?tv)/, 'Despesa', 'Subscrições', 'Streaming'],
  [/\b(google|apple\.com|icloud|microsoft|adobe|openai|chatgpt|anthropic|claude\.ai|notion|github|dropbox|canva\b|figma|duolingo|1password|proton)/, 'Despesa', 'Subscrições', 'Software'],
  [/\b(meo\b|nos comunic|vodafone|nowo\b|digi\b|uzo\b|woo\b|vivo\b|claro\b|tim brasil|tim s\.?a|oi movel)/, 'Despesa', 'Subscrições', 'Telemóvel'],
  [/\b(edp\b|endesa|iberdrola|goldenergy|galp energia|enel\b|light s\.?a|cemig|copel|coelba|celpe|neoenergia|energia)/, 'Despesa', 'Casa', 'Luz'],
  [/\b(smas\b|aguas d|agua d|epal\b|sabesp|cedae|copasa|sanepar|indaqua)/, 'Despesa', 'Casa', 'Água'],
  [/\b(renda\b|rendas\b|aluguel|aluguer|arrendamento|condominio)/, 'Despesa', 'Casa', 'Renda'],
  [/\b(farmacia|wells\b|drogasil|droga raia|drogaria|pague menos|panvel|pharma)/, 'Despesa', 'Saúde', 'Farmácia'],
  [/\b(fitness|gym\b|ginasio|solinca|holmes place|smart ?fit|basic-?fit|go fit|academia|bluefit|bodytech)/, 'Despesa', 'Saúde', 'Ginásio'],
  [/\b(clinica|hospital|cuf\b|luz saude|lusiadas|medic|dentist|consulta|laborat|unimed|hapvida|amil\b)/, 'Despesa', 'Saúde', 'Consultas'],
  [/\b(zara\b|h ?& ?m\b|primark|pull ?& ?bear|bershka|stradivarius|massimo dutti|mango\b|decathlon|renner|c ?& ?a\b|riachuelo|shein|nike\b|adidas|centauro|netshoes|lefties|sportzone|jd sports)/, 'Despesa', 'Pessoal', 'Roupa'],
  [/\b(worten|fnac|media ?markt|radio popular|pc ?diga|kabum|magazine luiza|magalu|casas bahia|fast shop|apple store)/, 'Despesa', 'Pessoal', 'Eletrónica'],
  [/\b(barbearia|barbeiro|cabeleireiro|salao|perfumaria|sephora|boticario|natura\b|kiko\b)/, 'Despesa', 'Pessoal', 'Cuidados pessoais'],
  [/\b(cinema|cinemark|uci\b|steam|playstation|xbox|nintendo|epic games|bilheteira|ticketline|bol\.pt|sympla|ingresso|blueticket|eventim)/, 'Despesa', 'Lazer', 'Saídas'],
  [/\b(bertrand|almedina|wook\b|livraria|leya\b|saraiva|kindle)/, 'Despesa', 'Universidade', 'Livros'],
  [/\b(propina|universidade|sasup|faculdade|mensalidade escolar|udemy|coursera|alura)/, 'Despesa', 'Universidade', 'Propinas'],
  [/\b(dizimo|igreja|oferta missionaria|paroquia)/, 'Despesa', 'Fé & Doações', 'Dízimo'],
  [/\b(doacao|donativo|unicef|cruz vermelha|caritas)/, 'Despesa', 'Fé & Doações', 'Doações'],
  [/\b(comissao|manutencao de conta|manutencao conta|imposto do selo|iof\b|tarifa|anuidade|cesta de servicos|despesas de manutencao)/, 'Despesa', 'Impostos & Taxas', 'Taxas bancárias'],
  [/\b(autoridade tributaria|portal das financas|at\b|iuc\b|irs\b|imi\b|darf\b|das mei|gps inss|receita federal|ipva\b|iptu\b|seg social|seguranca social)/, 'Despesa', 'Impostos & Taxas', 'Impostos'],
  [/\b(multa|coima)/, 'Despesa', 'Impostos & Taxas', 'Multas'],
  [/\b(juros devedores|juros de mora|juros rotativo|juros cartao|encargos)/, 'Despesa', 'Dívidas', 'Juros'],
  [/\b(prestacao|credito habitacao|emprestimo|financiamento)/, 'Despesa', 'Dívidas', 'Prestação'],
  [/\b(salario|vencimento|ordenado|remuneracao|payroll|folha de pagamento|pro-?labore)/, 'Receita', 'Salário', 'Salário'],
  [/\b(subsidio de ferias|subsidio de natal|13o\b|decimo terceiro)/, 'Receita', 'Salário', 'Subsídios'],
  [/\b(dividendo|jcp\b|juros sobre capital|rendimento|juros credores|interest|cashback)/, 'Receita', 'Investimentos', 'Juros'],
  [/\b(reembolso|estorno|devolucao|refund|chargeback)/, 'Receita', 'Outros', 'Reembolsos'],
  [/\b(bolsa de estudo|dges\b|bolsa sas)/, 'Receita', 'Bolsas', 'Bolsa de estudo']
];
// categorias que o agregador já traz (em inglês, na Pluggy)
const PROV = [[/grocer|supermarket/, 'Alimentação', 'Supermercado'], [/restaurant|eating out|food and drinks/, 'Alimentação', 'Restaurantes'], [/delivery/, 'Alimentação', 'Delivery'], [/taxi|ride/, 'Transporte', 'Uber/Bolt'], [/gas station|fuel/, 'Transporte', 'Combustível'], [/public transport|transport/, 'Transporte', 'Transportes públicos'], [/streaming|video|music/, 'Subscrições', 'Streaming'], [/telecom|mobile|internet/, 'Subscrições', 'Telemóvel'], [/pharmac|drug/, 'Saúde', 'Farmácia'], [/health|medical|dentist/, 'Saúde', 'Consultas'], [/gym|fitness|sport/, 'Saúde', 'Ginásio'], [/cloth|apparel|fashion/, 'Pessoal', 'Roupa'], [/electronic/, 'Pessoal', 'Eletrónica'], [/travel|airline|hotel|lodging/, 'Lazer', 'Viagens'], [/leisure|entertainment|cinema|gaming/, 'Lazer', 'Saídas'], [/education|book/, 'Universidade', 'Cursos'], [/tax|fee|bank fee/, 'Impostos & Taxas', 'Taxas bancárias'], [/rent|housing/, 'Casa', 'Renda'], [/electric|utilities|energy/, 'Casa', 'Luz'], [/water/, 'Casa', 'Água'], [/donation|charity/, 'Fé & Doações', 'Doações']];
const SUP = new Set(['Delivery', 'Restaurantes', 'Café & snacks', 'Saídas', 'Jogos', 'Streaming', 'Hobbies']);
const TRW = /transf|\btrf\b|\btrsf\b|\bpix\b|\bted\b|\bdoc\b|mb ?way|\bsepa\b|top.?up|carregamento|pagamento (de |da )?fatura|pagto fatura|pag(amento)? (do )?cart|fatura (do )?cart|aplicacao|aplic\.|resgate|poupanc|savings|vault|cofre|caixinha|exchanged? to|exchange from|conversao|cambio|wise|revolut|nubank|deposito|to eur|to brl|to usd/;
const key = d => norm(d).replace(/\d+/g, ' ').replace(/\b(compra|compras|pagamento|pag|pgto|pagto|cartao|card|debito|credito|visa|mastercard|maestro|mc|pos|tpa|mb|ref|nr|n|de|da|do|dos|das|em|com|para|purchase|payment|to|from|via|apple pay|google pay|contactless|pix|enviado|recebido|transferencia|trf|ted|sepa|lda|sa|ltda|eireli|me|unipessoal|pt|br|lisboa|porto|aveiro|sao paulo|rio de janeiro)\b/g, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 1).slice(0, 3).join(' ');
let LEARN = null, LEARNn = -1;
const learned = () => { const T = OS.all('transactions'); if (LEARN && LEARNn === T.length) return LEARN; const m = {};
  T.forEach(t => { if (!t.cat || t.type === 'Transferência') return; const k = key(t.desc); if (!k) return; const o = m[k] || (m[k] = {}), c = t.type + '|' + t.cat + '|' + (t.sub || ''); o[c] = (o[c] || 0) + (t.ext ? 1 : 3); });
  LEARN = m; LEARNn = T.length; return m; };
const hasCat = (type, cat, sub) => { const C = (OS.Fin && OS.Fin.cats(type)) || {}; if (!C[cat]) return null; return (C[cat] || []).includes(sub) ? sub : ''; };
const catOf = (r, type) => { const k = key(r.desc), m = learned()[k];
  if (m) { const best = Object.entries(m).filter(([c]) => c.startsWith(type + '|')).sort((a, b) => b[1] - a[1])[0]; if (best) { const [, cat, sub] = best[0].split('|'); return { cat, sub, by: 'hist' }; } }
  const n = norm(r.desc + ' ' + (r.cat || ''));
  for (const [re, ty, cat, sub] of RULES) if (ty === type && re.test(n)) { const s = hasCat(type, cat, sub); if (s !== null) return { cat, sub: s, by: 'regra' }; }
  if (r.cat) { const pc = norm(r.cat); for (const [re, cat, sub] of PROV) if (type === 'Despesa' && re.test(pc)) { const s = hasCat(type, cat, sub); if (s !== null) return { cat, sub: s, by: 'regra' }; }
    const C = (OS.Fin && OS.Fin.cats(type)) || {}, own = Object.keys(C).find(c => norm(c) === pc); if (own) return { cat: own, sub: '', by: 'regra' }; }
  const C = (OS.Fin && OS.Fin.cats(type)) || {}; return C.Outros ? { cat: 'Outros', sub: (C.Outros || []).includes('Diversos') ? 'Diversos' : '', by: '' } : { cat: '', sub: '', by: '' }; };
const methodOf = (r, acc) => { const n = norm(r.desc); if (acc && acc.type === 'Cartão de crédito') return 'Crédito'; if (/mb ?way/.test(n)) return 'MB WAY'; if (/multibanco|levantamento|\batm\b|saque/.test(n)) return 'Multibanco'; if (/debito direto|\bdd\b|debito automatico/.test(n)) return 'Débito direto'; if (/paypal/.test(n)) return 'PayPal'; if (/transf|\bpix\b|\bted\b|\bsepa\b|\btrf\b/.test(n)) return 'Transferência'; return 'Débito'; };
const cleanDesc = s => String(s || '').replace(/\s+/g, ' ').replace(/^(compra|pagamento|pag\.?|pgto) (com )?(cartao|cartão|card)( de debito| de crédito| de credito)?\s*[-:·]?\s*/i, '').trim().slice(0, 120) || 'Movimento do banco';

/* ================= revisão: o que é novo, o que já existe, o que é transferência ================= */
const sgnOf = (t, acc) => { const v = U.num(t.amount); if (t.type === 'Receita' && t.account === acc) return v; if (t.type === 'Despesa' && t.account === acc) return -v; if (t.type === 'Transferência') { if (t.account === acc) return -v; if (t.toAccount === acc) return U.num(t.toAmount) || v; } return null; };
const strong = e => /^(pg|eb|fit|id):/.test(e || ''), pref = e => String(e || '').split(':')[0];
// lote: [{ acc, date, desc, amount, ext, cat, pend }] → cada um fica com st: 'novo' | 'existe' | 'par' (a outra metade de uma transferência)
const review = batch => { const T = OS.all('transactions'), accs = [...new Set(batch.map(r => r.acc))], pool = {};
  accs.forEach(a => { pool[a] = T.map(t => ({ t, v: sgnOf(t, a), ext: t.account === a ? t.ext : t.toAccount === a ? t.ext2 : '' })).filter(p => p.v != null); });
  const k = {}; batch.forEach(r => { r.st = ''; r.dup = null; r.pair = null; if (!r.ext) { const h = r.date + '|' + r.amount + '|' + norm(r.desc); k[h] = (k[h] || 0) + 1; r.ext = 'h:' + U.hash(h + '|' + k[h]).toString(36); } });
  // 1.º o mesmo id do banco
  batch.forEach(r => { const p = pool[r.acc].find(p => !p.used && p.ext && p.ext === r.ext); if (p) { p.used = 1; r.st = 'existe'; r.dup = p.t.id; } });
  // 2.º o mesmo valor na mesma conta, até 3 dias de diferença (o que escreveste à mão ou veio de outro ficheiro)
  batch.forEach(r => { if (r.st) return; let best = null, bd = 9;
    pool[r.acc].forEach(p => { if (p.used || Math.abs(p.v - r.amount) > .005) return; if (p.ext && strong(p.ext) && strong(r.ext) && pref(p.ext) === pref(r.ext)) return; const dd = Math.abs(U.diff(p.t.date, r.date)); const lim = p.ext && pref(p.ext) === 'h' && pref(r.ext) === 'h' ? 0 : 3; if (dd <= lim && dd < bd) { best = p; bd = dd; } });
    if (best) { best.used = 1; r.st = 'existe'; r.dup = best.t.id; } });
  // 3.º transferências entre contas tuas: sai de uma, entra noutra com o mesmo valor, até 3 dias, e uma das descrições parece transferência
  const cur = a => OS.Fin.curOf(a), fresh = batch.filter(r => !r.st);
  fresh.filter(r => r.amount < 0).forEach(o => { if (o.pair) return; const i = fresh.filter(x => x.amount > 0 && !x.pair && x !== o && x.acc !== o.acc && cur(x.acc) === cur(o.acc) && Math.abs(x.amount + o.amount) < .005 && Math.abs(U.diff(x.date, o.date)) <= 3 && (TRW.test(norm(x.desc)) || TRW.test(norm(o.desc)))).sort((a, b) => Math.abs(U.diff(a.date, o.date)) - Math.abs(U.diff(b.date, o.date)))[0];
    if (i) { o.pair = i; i.pair = o; i.st = 'par'; } });
  // e contra movimentos importados antes noutra conta tua (o outro lado já tinha entrado como despesa ou receita)
  fresh.forEach(r => { if (r.st || r.pair || !TRW.test(norm(r.desc))) return; const t = T.find(t => t.ext && t.account !== r.acc && (t.type === (r.amount > 0 ? 'Despesa' : 'Receita')) && Math.abs(U.num(t.amount) - Math.abs(r.amount)) < .005 && Math.abs(U.diff(t.date, r.date)) <= 3 && cur(t.account) === cur(r.acc) && !batch.some(b => b.join === t.id));
    if (t) { r.join = t.id; } });
  batch.forEach(r => { if (!r.st) r.st = 'novo'; });
  return batch; };
const txOf = (r, src, note) => { const acc = OS.get('accounts', r.acc);
  if (r.pair && r.amount < 0) { const i = r.pair; return { type: 'Transferência', amount: r2(Math.abs(r.amount)), date: r.date, desc: cleanDesc(r.desc), account: r.acc, toAccount: i.acc, method: 'Transferência', tags: [], ext: r.ext, ext2: i.ext, src, note }; }
  const type = r.amount > 0 ? 'Receita' : 'Despesa', c = catOf(r, type);
  return Object.assign({ type, amount: r2(Math.abs(r.amount)), date: r.date, desc: cleanDesc(r.desc), account: r.acc, cat: c.cat, sub: c.sub, method: methodOf(r, acc), tags: [], ext: r.ext, src, note }, type === 'Despesa' ? { ess: SUP.has(c.sub) || c.cat === 'Lazer' ? 'Supérfluo' : 'Essencial' } : {}); };
// grava o lote revisto; devolve quantos entraram
const commit = (batch, src, note) => { let n = 0, tr = 0;
  batch.forEach(r => { if (r.st !== 'novo' || r.pend) return;
    if (r.join) { const t = OS.get('transactions', r.join); if (t) { const out = t.type === 'Despesa'; OS.upd('transactions', t.id, out ? { type: 'Transferência', toAccount: r.acc, ext2: r.ext, cat: '', sub: '', method: 'Transferência' } : { type: 'Transferência', account: r.acc, toAccount: t.account, ext: r.ext, ext2: t.ext, cat: '', sub: '', method: 'Transferência' }, { silent: true }); tr++; return; } }
    if (r.amount > 0 && r.pair) return; const o = txOf(r, src, note); OS.add('transactions', o, { silent: true }); n++; if (o.type === 'Transferência') tr++; });
  if (n || tr) { LEARN = null; OS.emit('change', 'transactions'); OS.request(); }
  return { n, tr }; };
// acerta o saldo da conta pelo do banco num dia (o que entrou ou saiu nesse dia fica por cima, como em "Saldo de hoje")
const setBal = (accId, bal, day) => { const a = OS.get('accounts', accId); if (!a || bal == null || isNaN(bal)) return; const d = day || U.today();
  const base = OS.Fin.accBal(Object.assign({}, a, { opening: 0, openDate: d, openSet: true }), d); OS.upd('accounts', a.id, { opening: r2(bal - base), openDate: d, openSet: true }); };

/* ================= importar extrato (ecrã) ================= */
let ST = null; // { file, src, inv, acc, cur, newAcc:{inst,name,type,cur}, balOk, err, busy, done }
const accOpts = () => OS.Fin.accounts();
const rowsOf = () => { if (!ST || !ST.src) return { rows: [], skip: {} }; const s = ST.src; let R = s.hdr ? fromTable(s, ST.inv) : { rows: s.rows.map(r => Object.assign({}, r, { amount: ST.inv ? -r.amount : r.amount })), skip: {} };
  return R; };
const curs = R => { const c = {}; R.forEach(r => { if (r.cur) c[r.cur] = (c[r.cur] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
const guessBank = s => { const n = norm((s.acct && s.acct.bank) + ' ' + s.name); const b = L.BANKS.find(b => { const k = norm(b[0]).split(' ')[0]; return k.length > 2 && n.includes(k); }); return b || null; };
const prep = () => { const R = rowsOf(), C = curs(R.rows); if (ST.cur == null || (C.length && !C.some(c => c[0] === ST.cur))) ST.cur = C.length ? C[0][0] : '';
  const rows = R.rows.filter(r => !C.length || !r.cur || r.cur === ST.cur); const acc = ST.acc && ST.acc !== '__new' ? ST.acc : '__new';
  const batch = review(rows.map(r => Object.assign({}, r, { acc }))); return { R, C, batch }; };
const autoInv = (src, accId) => { const a = accId && OS.get('accounts', accId), card = (a && a.type === 'Cartão de crédito') || (src.acct && src.acct.card); if (!card || src.fmt === 'OFX') return false;
  const R = src.hdr ? fromTable(src, false).rows : src.rows; return R.length > 2 && R.filter(r => r.amount > 0).length / R.length > .7; };
BK.read = async files => { const f = files && files[0]; if (!f) return; ST = { busy: true, file: f.name }; OS.request();
  try { const src = await readFile(f); const b = guessBank(src), accs = accOpts();
    const match = accs.find(a => src.acct && src.acct.num && String(a.name + ' ' + (a.num || '')).includes(src.acct.num)) || (b && accs.find(a => L.bank(a.inst) && L.bank(a.inst)[0] === b[0] && ((src.acct && src.acct.card) ? a.type === 'Cartão de crédito' : a.type !== 'Cartão de crédito')));
    ST = { file: f.name, src, acc: match ? match.id : (accs.length ? '' : '__new'), cur: null, inv: false, balOk: !match,
      newAcc: { inst: b ? b[0] : (src.acct && src.acct.bank) || '', name: src.acct && src.acct.card ? 'Cartão' : 'Conta à ordem', type: src.acct && src.acct.card ? 'Cartão de crédito' : 'Conta à ordem', cur: (src.acct && src.acct.cur) || (b && b[2]) || 'EUR' } };
    ST.inv = autoInv(src, ST.acc); }
  catch (e) { ST = { err: e.message || String(e), file: f.name }; }
  OS.request(); setTimeout(() => { const el = document.getElementById('bkPrev'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); };
A.bkPick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.ofx,.qfx,.qif,.csv,.txt,.xlsx,.xls,.ods,.pdf'; inp.style.display = 'none'; inp.onchange = () => { BK.read([...(inp.files || [])]); inp.remove(); }; document.body.appendChild(inp); inp.click(); };
A.bkCancel = () => { ST = null; OS.request(); };
A.bkInv = () => { if (ST) { ST.inv = !ST.inv; OS.request(); } };
A.bkBal = () => { if (ST) { ST.balOk = !ST.balOk; OS.request(); } };
document.addEventListener('change', e => { const el = e.target; if (!el || !el.dataset || !el.dataset.bk || !ST) return; const k = el.dataset.bk;
  if (k === 'acc') { ST.acc = el.value; ST.inv = autoInv(ST.src, ST.acc); ST.balOk = ST.acc === '__new'; }
  else if (k === 'cur') ST.cur = el.value;
  else if (k.startsWith('col.')) { ST.src.M = Object.assign({}, ST.src.M, { [k.slice(4)]: +el.value }); if (k === 'col.amt' && +el.value >= 0) { ST.src.M.deb = -1; ST.src.M.cred = -1; } if ((k === 'col.deb' || k === 'col.cred') && +el.value >= 0) ST.src.M.amt = -1; }
  else if (k.startsWith('new.')) { ST.newAcc[k.slice(4)] = el.value; return; }
  OS.request(); });
// saldo que o próprio extrato diz (OFX ou coluna de saldo), para acertar a conta
const balOf = (src, R) => { if (src.acct && src.acct.bal != null) return { v: ST.inv ? -src.acct.bal : src.acct.bal, d: src.acct.balD };
  const B = R.filter(r => !isNaN(r.bal)); if (!B.length) return null; const desc = R.length > 1 && R[0].date > R[R.length - 1].date, last = desc ? B[0] : B[B.length - 1]; return { v: last.bal, d: last.date }; };
A.bkGo = () => { if (!ST || !ST.src) return; let accId = ST.acc;
  if (!accId) return UI.toast('Escolhe a conta do Prumo para onde vão os movimentos.', 'warn');
  const { R, batch } = prep(); const nw = batch.filter(r => r.st === 'novo').length; if (!nw) return UI.toast('Não há movimentos novos neste ficheiro.', 'warn');
  if (accId === '__new') { const N = ST.newAcc, dmin = batch.map(r => r.date).sort()[0] || U.today(); const a = OS.add('accounts', { inst: (N.inst || '').trim(), name: (N.name || '').trim() || 'Conta', type: N.type || 'Conta à ordem', currency: L.CUR.includes(ST.cur) ? ST.cur : (N.cur || 'EUR'), opening: 0, openDate: dmin }); accId = a.id; batch.forEach(r => { r.acc = accId; }); review(batch); }
  const res = commit(batch, 'extrato', 'Importado do extrato ' + ST.file.slice(0, 60));
  const b = balOf(ST.src, R.rows); if (ST.balOk && b) setBal(accId, b.v, b.d);
  ST = { done: res, file: ST.file, acc: accId }; UI.toast(`${res.n} movimento${res.n === 1 ? '' : 's'} importado${res.n === 1 ? '' : 's'}${res.tr ? ` · ${res.tr} transferência${res.tr === 1 ? '' : 's'} entre contas` : ''}`, 'pos'); OS.request(); };
const STC = { novo: ['novo', 'pos'], existe: ['já existe', ''], par: ['transferência', 'acc'] };
const colSel = (k, lbl, s) => `<label class="bnk-col"><span>${lbl}</span><select data-bk="col.${k}" aria-label="${esc(lbl)}"><option value="-1">—</option>${s.hdr.map((h, j) => `<option value="${j}"${s.M[k] === j ? ' selected' : ''}>${esc(h).slice(0, 40)}</option>`).join('')}</select></label>`;
const preview = () => { if (!ST) return ''; if (ST.busy) return `<div class="note" id="bkPrev">A ler ${esc(ST.file || '')}…</div>`;
  if (ST.err) return `<div class="note bnk-err" id="bkPrev"><b>${esc(ST.file || '')}</b>: ${esc(ST.err)} <button class="btn xs ghost" data-act="bkCancel">Fechar</button></div>`;
  if (ST.done) { const a = OS.get('accounts', ST.acc); return `<div class="note bnk-ok" id="bkPrev">${UI.ic('check')}<span><b>${ST.done.n}</b> movimento${ST.done.n === 1 ? '' : 's'} de ${esc(ST.file)} entraram em <b>${esc(a ? L.accLabel(a) : '')}</b>${ST.done.tr ? ` (${ST.done.tr} como transferência entre contas)` : ''}. Revê as categorias em <a class="acc" href="#financas.transacoes">Transações</a>; da próxima vez o Prumo usa o que corrigires.</span><button class="btn xs ghost" data-act="bkCancel">Fechar</button></div>`; }
  const s = ST.src, { R, C, batch } = prep(), nw = batch.filter(r => r.st === 'novo'), ex = batch.filter(r => r.st === 'existe').length, d0 = batch.map(r => r.date).sort(), b = balOf(s, R.rows);
  const accs = accOpts(), a = ST.acc && ST.acc !== '__new' ? OS.get('accounts', ST.acc) : null, sk = U.sum(Object.values(R.skip), x => x);
  const inc = U.sum(nw.filter(r => r.amount > 0), r => r.amount), out = U.sum(nw.filter(r => r.amount < 0), r => -r.amount), cur = (a && a.currency) || ST.cur || ST.newAcc.cur || 'EUR';
  return `<div class="bnk-prev" id="bkPrev">
    <div class="bnk-ph"><div><b>${esc(ST.file)}</b><small class="mut">${s.fmt}${s.acct && s.acct.bank ? ' · ' + esc(s.acct.bank) : ''}${d0.length ? ' · ' + U.fmtD(d0[0]) + ' a ' + U.fmtD(d0[d0.length - 1]) : ''} · ${batch.length} movimento${batch.length === 1 ? '' : 's'}</small></div><button class="icon-btn" data-act="bkCancel" aria-label="Fechar">${UI.ic('x')}</button></div>
    <div class="bnk-grid">
      <label class="bnk-col wide"><span>Conta no Prumo</span><select data-bk="acc" aria-label="Conta no Prumo"><option value=""${!ST.acc ? ' selected' : ''}>Escolhe a conta…</option>${accs.map(x => `<option value="${x.id}"${ST.acc === x.id ? ' selected' : ''}>${esc(L.accLabel(x))}${x.currency && x.currency !== 'EUR' ? ' (' + x.currency + ')' : ''}</option>`).join('')}<option value="__new"${ST.acc === '__new' ? ' selected' : ''}>+ Criar conta nova</option></select></label>
      ${C.length > 1 ? `<label class="bnk-col"><span>Moeda</span><select data-bk="cur">${C.map(([c, n]) => `<option value="${esc(c)}"${ST.cur === c ? ' selected' : ''}>${esc(c)} (${n})</option>`).join('')}</select></label>` : ''}
    </div>
    ${ST.acc === '__new' ? `<div class="bnk-grid bnk-new"><label class="bnk-col"><span>Banco</span><input class="field" data-bk="new.inst" value="${esc(ST.newAcc.inst)}" placeholder="Ex.: Nubank, Revolut"></label><label class="bnk-col"><span>Nome</span><input class="field" data-bk="new.name" value="${esc(ST.newAcc.name)}"></label><label class="bnk-col"><span>Tipo</span><select data-bk="new.type">${L.ACCT.map(t => `<option${ST.newAcc.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label>${C.length ? '' : `<label class="bnk-col"><span>Moeda</span><select data-bk="new.cur">${L.CUR.map(c => `<option${ST.newAcc.cur === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label>`}</div>` : ''}
    ${s.hdr ? `<details class="bnk-map"${s.M.amt < 0 && (s.M.deb < 0 || s.M.cred < 0) ? ' open' : ''}><summary>Colunas do ficheiro <span class="mut">(o Prumo escolheu sozinho; muda se algo estiver trocado)</span></summary><div class="bnk-grid">${colSel('date', 'Data', s)}${colSel('desc', 'Descrição', s)}${colSel('amt', 'Valor (com sinal)', s)}${colSel('deb', 'ou Débito / saídas', s)}${colSel('cred', 'e Crédito / entradas', s)}${colSel('bal', 'Saldo (opcional)', s)}</div></details>` : ''}
    <div class="bnk-opts"><button class="bnk-chk ${ST.inv ? 'on' : ''}" data-act="bkInv" role="switch" aria-checked="${ST.inv}"><i aria-hidden="true"></i><span>Inverter sinais <small class="mut">(faturas de cartão em que as compras vêm positivas)</small></span></button>
      ${b && !isNaN(b.v) ? `<button class="bnk-chk ${ST.balOk ? 'on' : ''}" data-act="bkBal" role="switch" aria-checked="${ST.balOk}"><i aria-hidden="true"></i><span>Acertar o saldo da conta para ${U.money(b.v, cur)} <small class="mut">(saldo do extrato a ${U.fmtD(b.d)}${a ? '; o Prumo diz ' + U.money(OS.Fin.accBal(a, b.d), cur) : ''})</small></span></button>` : ''}</div>
    <div class="bnk-sum"><span><b>${nw.length}</b> novo${nw.length === 1 ? '' : 's'}</span>${ex ? `<span>${ex} já existia${ex === 1 ? '' : 'm'} (ignorado${ex === 1 ? '' : 's'})</span>` : ''}${sk ? `<span title="${esc(Object.entries(R.skip).map(([k, v]) => k + ': ' + v).join(' · '))}">${sk} linha${sk === 1 ? '' : 's'} sem movimento</span>` : ''}<span class="pos">+${U.money(inc, cur)}</span><span>−${U.money(out, cur)}</span></div>
    ${batch.length ? `<div class="tblw bnk-tbl"><table class="tbl"><thead><tr><th>Data</th><th>Descrição</th><th class="bnk-c3">Categoria</th><th class="r">Valor</th><th class="bnk-c5"></th></tr></thead><tbody>${U.sortBy(batch, r => r.date, -1).slice(0, 150).map(r => { const c = r.st === 'novo' && !r.pair && !r.join ? catOf(r, r.amount > 0 ? 'Receita' : 'Despesa') : null;
      const ct = r.join ? '<span class="mut">transferência (junta-se ao outro lado)</span>' : c ? esc(c.cat + (c.sub ? ' · ' + c.sub : '')) || '<span class="mut">—</span>' : '';
      return `<tr class="${r.st === 'novo' ? '' : 'bnk-dim'}"><td class="mono">${U.fmtD(r.date)}</td><td>${esc(cleanDesc(r.desc))}<small class="bnk-m">${ct ? ct + ' · ' : ''}${STC[r.st][0]}</small></td><td class="bnk-c3">${ct}</td><td class="r mono ${r.amount > 0 ? 'pos' : ''}">${U.money(r.amount, cur, { sign: true })}</td><td class="bnk-c5">${UI.badge(STC[r.st][0], STC[r.st][1])}</td></tr>`; }).join('')}</tbody></table>${batch.length > 150 ? `<p class="mut" style="font-size:12px">Mostro os 150 mais recentes; entram todos.</p>` : ''}</div>` : `<p class="mut">Não encontrei movimentos com estas colunas. Abre "Colunas do ficheiro" e escolhe a data e o valor.</p>`}
    <div class="row gap8" style="flex-wrap:wrap;margin-top:10px"><button class="btn pri" data-act="bkGo" ${nw.length && ST.acc ? '' : 'disabled'}>Importar ${nw.length} movimento${nw.length === 1 ? '' : 's'}</button><button class="btn ghost" data-act="bkCancel">Cancelar</button></div>
  </div>`; };

/* ================= ligação automática (api/banco) ================= */
let stK = '', est = null;
const cur0 = () => { const k = 'os2banco:' + (Acc().pid ? Acc().pid() : ''); if (k !== stK) { stK = k; est = U.ls.get(k, null); } return est || {}; };
const setEst = o => { cur0(); est = Object.assign({}, est || {}, o); U.ls.set(stK, est); };
const call = async (op, body = {}) => { let r;
  try { r = await fetch('api/banco', { method: 'POST', cache: 'no-store', credentials: 'omit', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + Acc().token() }, body: JSON.stringify(Object.assign({ op, p: Acc().pid() }, body)) }); }
  catch (e) { throw new Error('Sem ligação à internet.'); }
  let j = null; try { j = await r.json(); } catch (e) { }
  if (j && j.ok) return j; const e = new Error((j && j.msg) || (r.status === 404 ? 'O servidor do Prumo não respondeu.' : 'Erro ' + r.status)); e.code = j && j.code; throw e; };
let busy = '', SY = null, estAt = 0, banks = { c: '', list: null };
const refresh = async () => { if (!on() || busy === 'estado') return; busy = 'estado'; try { const j = await call('estado'); setEst({ adm: j.adm, pronto: j.pronto, regresso: j.regresso, pg: j.pg, eb: j.eb, at: Date.now() }); } catch (e) { setEst({ err: e.message }); } busy = ''; estAt = Date.now(); OS.request(); };
const links = () => { const s = cur0(); return (s.pg || []).length + (s.eb || []).filter(x => !x.exp).length; };
// sincroniza: traz contas e movimentos; importa sozinho os das contas já associadas
const sync = async (quiet) => { if (!on() || busy) return; busy = 'sync'; OS.request(); const B = OS.one('banklink');
  try { const last = B.last ? U.addDays(B.last.slice(0, 10), -5) : U.addDays(U.today(), -90); const j = await call('sync', { from: last });
    const accs = Object.assign({}, B.accs); j.contas.forEach(c => { accs[c.id] = { bank: c.bank, name: c.name, num: c.num, cur: c.cur, bal: c.bal, kind: c.kind, at: new Date().toISOString() }; });
    SY = { mov: j.mov, erros: j.erros || [], at: Date.now() }; const res = importMapped(accs);
    OS.setOne('banklink', { accs, last: new Date().toISOString() });
    if (!quiet || res.n) UI.toast(res.n ? `${res.n} movimento${res.n === 1 ? '' : 's'} novo${res.n === 1 ? '' : 's'} do banco` : 'Banco atualizado: nada de novo', 'pos');
    if (SY.erros.length && !quiet) UI.toast(SY.erros[0], 'warn'); }
  catch (e) { if (!quiet) UI.toast(e.message, 'warn'); SY = Object.assign(SY || {}, { err: e.message }); }
  busy = ''; OS.request(); };
const importMapped = accs => { const B = OS.one('banklink'), map = B.map || {}; if (!SY || !SY.mov) return { n: 0, tr: 0 };
  const batch = SY.mov.filter(m => map[m.acc] && map[m.acc] !== '-' && OS.get('accounts', map[m.acc]) && !m.pend).map(m => ({ acc: map[m.acc], src: m.acc, date: m.date, desc: m.desc, amount: m.amount, ext: m.ext, cat: m.cat }));
  if (!batch.length) return { n: 0, tr: 0 }; review(batch); const G = new Set(B.gone || []); batch.forEach(r => { if (r.st === 'novo' && G.has(r.ext)) r.st = 'existe'; }); const res = commit(batch, 'banco', 'Importado do banco');
  // contas novas no Prumo: o saldo fica igual ao do banco
  Object.entries(map).forEach(([bid, pid]) => { const ba = (accs || B.accs)[bid], pa = OS.get('accounts', pid); if (ba && pa && pa.bankAuto && ba.bal != null) setBal(pid, ba.bal); });
  return res; };
BK.sync = sync;
// o que apagares de propósito não volta na sincronização seguinte
OS.on('del:transactions', t => { if (!t || t.src !== 'banco' || !t.ext) return; const B = OS.one('banklink'); OS.setOne('banklink', { gone: (B.gone || []).concat([t.ext, t.ext2].filter(Boolean)).slice(-3000) }); });
A.bkSync = () => sync(false);
A.bkAuto = () => { const B = OS.one('banklink'); OS.setOne('banklink', { auto: !B.auto }); OS.request(); };
const mapTo = (bid, v) => { const B = OS.one('banklink'), ba = (B.accs || {})[bid]; let pid = v;
  if (v === '__new' && ba) { const bk = L.bank(ba.bank); const a = OS.add('accounts', { inst: bk ? bk[0] : ba.bank, name: ba.name || 'Conta', type: ba.kind === 'card' ? 'Cartão de crédito' : 'Conta à ordem', currency: L.CUR.includes(ba.cur) ? ba.cur : 'EUR', opening: 0, openDate: U.addDays(U.today(), -90), bankAuto: true }); pid = a.id; }
  OS.setOne('banklink', { map: Object.assign({}, B.map, { [bid]: pid }) });
  if (pid && pid !== '-' && SY && SY.mov) { const res = importMapped(); UI.toast(`${res.n} movimento${res.n === 1 ? '' : 's'} importado${res.n === 1 ? '' : 's'}`, 'pos'); }
  else if (pid && pid !== '-') sync(false); OS.request(); };
document.addEventListener('change', e => { const el = e.target; if (el && el.dataset && el.dataset.bkmap) mapTo(el.dataset.bkmap, el.value); });
A.bkSetBal = b => { const B = OS.one('banklink'), ba = (B.accs || {})[b.dataset.id], pid = (B.map || {})[b.dataset.id]; if (!ba || !pid) return; const pa = OS.get('accounts', pid);
  UI.ask('Acertar o saldo pelo do banco?', `${L.accLabel(pa)} fica com ${U.money(ba.bal, pa.currency)} hoje. O histórico não muda: só o ponto de partida do saldo.`, 'Acertar', () => { setBal(pid, ba.bal); UI.toast('Saldo acertado', 'pos'); OS.request(); }); };
A.bkPgAdd = async () => { const el = document.getElementById('bkPgId'), id = el ? el.value.trim() : ''; if (!id) return UI.toast('Cola o ID do item da Pluggy.', 'warn'); busy = 'pg'; OS.request();
  try { const j = await call('pg.add', { item: id }); UI.toast('Ligado: ' + j.name, 'pos'); busy = ''; await refresh(); sync(false); } catch (e) { busy = ''; UI.toast(e.message, 'warn'); OS.request(); } };
A.bkPgDel = b => UI.ask('Desligar este banco?', 'Deixam de chegar movimentos novos dele. O que já entrou nas Finanças fica.', 'Desligar', async () => { try { await call('pg.del', { item: b.dataset.id }); await refresh(); } catch (e) { UI.toast(e.message, 'warn'); } });
A.bkEbDel = b => UI.ask('Desligar este banco?', 'A autorização é cancelada no Enable Banking. O que já entrou nas Finanças fica.', 'Desligar', async () => { try { await call('eb.del', { sid: b.dataset.id }); await refresh(); } catch (e) { UI.toast(e.message, 'warn'); } });
A.bkEbCountry = async b => { const sel = document.getElementById('bkEbC'), c = sel ? sel.value : 'PT'; banks = { c, list: null, busy: true }; OS.request();
  try { const j = await call('eb.bancos', { c }); banks = { c, list: j.bancos }; } catch (e) { banks = { c, list: [], err: e.message }; } OS.request(); };
A.bkEbGo = async () => { const sel = document.getElementById('bkEbB'); if (!sel || !sel.value) return UI.toast('Escolhe o banco.', 'warn'); const bk = (banks.list || []).find(x => x.name === sel.value);
  const w = window.open('', '_blank'); busy = 'eb'; OS.request();
  try { const j = await call('eb.inicio', { bank: sel.value, c: banks.c, max: bk ? bk.max : 0 }); if (w) w.location.href = j.url; else location.href = j.url; setEst({ waitEb: Date.now() }); }
  catch (e) { if (w) w.close(); UI.toast(e.message, 'warn'); } busy = ''; OS.request(); };
// ao voltar do banco (a janela fecha-se e o Prumo volta a ter o foco), atualiza o estado
window.addEventListener('focus', () => { const s = cur0(); if (s.waitEb && Date.now() - s.waitEb < 20 * 60e3) { setEst({ waitEb: 0 }); refresh().then(() => sync(true)); } });
// arranque: a cada 12 horas, se a ligação automática estiver ativa
OS.on('ready', () => { if (navigator.webdriver && !window.__bkTest) return; setTimeout(() => { if (!on()) return; const s = cur0(), B = OS.one('banklink');
  if (!s.adm) return;
  if (B.auto && links() && Object.values(B.map || {}).some(v => v && v !== '-') && (!B.last || Date.now() - Date.parse(B.last) > 12 * 36e5)) refresh().then(() => sync(true)); }, 6000); });

const ago = iso => { if (!iso) return 'nunca'; const m = Math.round((Date.now() - Date.parse(iso)) / 6e4); return m < 2 ? 'agora mesmo' : m < 60 ? `há ${m} min` : m < 48 * 60 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} dias`; };
const COUNTRIES = [['PT', 'Portugal'], ['ES', 'Espanha'], ['FR', 'França'], ['DE', 'Alemanha'], ['IT', 'Itália'], ['NL', 'Países Baixos'], ['BE', 'Bélgica'], ['IE', 'Irlanda'], ['LU', 'Luxemburgo'], ['AT', 'Áustria'], ['FI', 'Finlândia'], ['LT', 'Lituânia'], ['GB', 'Reino Unido']];
const steps = (list) => `<ol class="ai-steps bnk-steps">${list.map(x => `<li>${x}</li>`).join('')}</ol>`;
const ligacao = () => { if (!on()) return ''; const s = cur0(); if (!busy && Date.now() - estAt > 60e3 && (!s.at || Date.now() - s.at > 10 * 6e4)) { estAt = Date.now(); setTimeout(refresh, 0); } if (!s.at) return '';
  if (!s.adm) return ''; const B = OS.one('banklink'), P = s.pronto || {}, accs = Object.entries(B.accs || {}), pend = SY && SY.mov ? SY.mov.filter(m => !(B.map || {})[m.acc]).length : 0;
  const pgBox = `<div class="bnk-prov"><div class="bnk-provh"><b>Brasil · Open Finance</b><small class="mut">pela Pluggy, com o Meu Pluggy (grátis para uso pessoal)</small></div>
    ${!P.pg ? steps(['Cria conta em <b>meu.pluggy.ai</b> e liga lá os teus bancos pelo Open Finance (autorizas na app de cada banco).', 'Em <b>dashboard.pluggy.ai</b> cria uma aplicação e ativa o conector Meu Pluggy; copia o <b>Client ID</b> e o <b>Client Secret</b>.', 'No Vercel, projeto prumo → Settings → Environment Variables, cria <code>PLUGGY_CLIENT_ID</code> e <code>PLUGGY_CLIENT_SECRET</code> (Production) e faz Redeploy. Não as coles em mais lado nenhum.', 'Volta aqui: aparece um campo para colares o ID de cada item (cada banco ligado no Meu Pluggy).'])
    : `${(s.pg || []).length ? `<div class="list">${s.pg.map(x => `<div class="li"><div class="li-t"><b>${esc(x.name || 'Banco')}</b><small class="mono">${esc(x.item.slice(0, 8))}…</small></div><button class="btn xs ghost" data-act="bkPgDel" data-id="${esc(x.item)}">Desligar</button></div>`).join('')}</div>` : ''}
      <div class="row gap8 bnk-add"><input class="field" id="bkPgId" placeholder="ID do item (8-4-4-4-12)" autocomplete="off" spellcheck="false" aria-label="ID do item da Pluggy"><button class="btn" data-act="bkPgAdd" ${busy === 'pg' ? 'disabled' : ''}>${busy === 'pg' ? 'A ligar…' : 'Ligar'}</button></div>
      <p class="mut bnk-hint">O ID está no Pluggy Dashboard, em Demo/Items, depois de ligares o banco no Meu Pluggy. A Pluggy atualiza os movimentos uma vez por dia.</p>`}</div>`;
  const ebBox = `<div class="bnk-prov"><div class="bnk-provh"><b>Europa · PSD2</b><small class="mut">pelo Enable Banking (grátis para as tuas próprias contas)</small></div>
    ${!P.eb ? steps(['Cria conta em <b>enablebanking.com</b> (Control Panel) e regista uma aplicação; ao criá-la, descarrega a chave privada (.pem).', `Como endereço de regresso (redirect URL) põe <code>${esc(s.regresso || 'https://prumo-vida.vercel.app/api/banco')}</code>.`, 'Ativa a aplicação ligando as tuas contas (modo restrito: só lê as contas do próprio).', 'No Vercel, projeto prumo → Settings → Environment Variables, cria <code>ENABLEBANKING_APP_ID</code> (o id da aplicação) e <code>ENABLEBANKING_KEY</code> (o conteúdo do .pem) e faz Redeploy. A chave fica só lá.'])
    : `${(s.eb || []).length ? `<div class="list">${s.eb.map(x => `<div class="li"><div class="li-t"><b>${esc(x.bank)}</b><small class="${x.exp ? 'neg' : 'mut'}">${x.exp ? 'autorização expirada: liga outra vez' : `${x.n} conta${x.n === 1 ? '' : 's'} · autorizado até ${U.fmtD((x.until || '').slice(0, 10))}`}</small></div><button class="btn xs ghost" data-act="bkEbDel" data-id="${esc(x.sid)}">Desligar</button></div>`).join('')}</div>` : ''}
      <div class="row gap8 bnk-add"><select id="bkEbC" aria-label="País do banco">${COUNTRIES.map(([c, n]) => `<option value="${c}"${(banks.c || 'PT') === c ? ' selected' : ''}>${n}</option>`).join('')}</select><button class="btn" data-act="bkEbCountry">${banks.busy ? 'A procurar…' : 'Ver bancos'}</button></div>
      ${banks.list ? (banks.list.length ? `<div class="row gap8 bnk-add"><select id="bkEbB" aria-label="Banco">${banks.list.map(x => `<option>${esc(x.name)}</option>`).join('')}</select><button class="btn pri" data-act="bkEbGo" ${busy === 'eb' ? 'disabled' : ''}>Ligar no banco</button></div>` : `<p class="mut bnk-hint">${esc(banks.err || 'Sem bancos para este país.')}</p>`) : ''}
      <p class="mut bnk-hint">Abre o site do teu banco para autorizares (até 90 a 180 dias, conforme o banco). Depois voltas aqui e os movimentos chegam sozinhos.</p>`}</div>`;
  const accBox = accs.length ? `<div class="bnk-accs"><h4>Contas do banco</h4>${accs.map(([id, a]) => { const pid = (B.map || {})[id], pa = pid && pid !== '-' ? OS.get('accounts', pid) : null, pb = pa ? OS.Fin.accBal(pa) : null, diff = pa && a.bal != null ? r2(a.bal - pb) : 0;
      return `<div class="bnk-acc"><div class="bnk-acct"><b>${esc(a.bank)} · ${esc(a.name)}</b><small class="mut">${a.num ? '…' + esc(a.num.slice(-4)) + ' · ' : ''}${a.bal != null ? 'saldo no banco ' + U.money(a.bal, a.cur) : ''}</small></div>
        <select data-bkmap="${esc(id)}" aria-label="Conta do Prumo para ${esc(a.name)}"><option value=""${!pid ? ' selected' : ''}>Associar a…</option>${accOpts().map(x => `<option value="${x.id}"${pid === x.id ? ' selected' : ''}>${esc(L.accLabel(x))}</option>`).join('')}<option value="__new">+ Criar conta no Prumo</option><option value="-"${pid === '-' ? ' selected' : ''}>Não importar</option></select>
        ${pa && Math.abs(diff) >= .01 ? `<div class="bnk-diff"><span class="warn">O Prumo diz ${U.money(pb, pa.currency)}</span><button class="btn xs" data-act="bkSetBal" data-id="${esc(id)}">Acertar pelo banco</button></div>` : pa ? '<div class="bnk-diff"><span class="pos">saldo igual ao do banco</span></div>' : ''}</div>`; }).join('')}</div>` : '';
  return `<div class="pn bnk-auto"><div class="pn-h"><h3>${UI.ic('sync')}Ligação automática</h3><span class="mut" style="font-size:12px">só na tua conta</span></div>
    <div class="bnk-st"><span>Última atualização: <b>${ago(B.last)}</b></span>${links() ? `<button class="btn xs" data-act="bkSync" ${busy ? 'disabled' : ''}>${busy === 'sync' ? 'A atualizar…' : 'Atualizar agora'}</button>` : ''}<button class="bnk-chk ${B.auto ? 'on' : ''}" data-act="bkAuto" role="switch" aria-checked="${!!B.auto}"><i aria-hidden="true"></i><span>Atualizar sozinho a cada 12 h</span></button></div>
    ${pend ? `<div class="note">${pend} movimento${pend === 1 ? '' : 's'} à espera: associa cada conta do banco a uma conta do Prumo.</div>` : ''}${SY && SY.err ? `<p class="neg">${esc(SY.err)}</p>` : ''}${SY && SY.erros && SY.erros.length ? `<p class="warn" style="font-size:12.5px">${SY.erros.map(esc).join('<br>')}</p>` : ''}
    ${accBox}<div class="bnk-provs">${pgBox}${ebBox}</div>
    <p class="mut bnk-hint">Só leitura: o Prumo vê contas, saldos e movimentos; nunca faz pagamentos. As chaves ficam nas variáveis do Vercel e as ligações cifradas no servidor.</p></div>`; };

/* ================= a aba ================= */
BK.view = () => `<div class="pn bnk-imp"><div class="pn-h"><h3>${UI.ic('arrowUp')}Importar extrato</h3><span class="mut" style="font-size:12px">OFX · QIF · CSV · Excel</span></div>
  <p class="bnk-lead">Descarrega o extrato no site ou na app do banco (ou noutra app de finanças) e escolhe o ficheiro. O Prumo lê as colunas sozinho, ignora o que já tens e propõe as categorias.</p>
  <div class="bnk-drop" data-act="bkPick" role="button" tabindex="0" aria-label="Escolher ficheiro do extrato">${UI.ic('folder')}<b>Escolher ficheiro</b><small class="mut">ou arrasta-o para aqui</small></div>
  ${preview()}
  ${UI.toggle('Onde descarrego o extrato?', `<ul class="bnk-tips"><li><b>Prefere OFX</b> quando o banco oferece: traz o id de cada movimento e o saldo, e nada se repete mesmo que importes o mesmo mês duas vezes.</li><li>Procura por "Extrato", "Exportar" ou "Descarregar movimentos", escolhe o período e o formato OFX, CSV ou Excel.</li><li>Apps de finanças (Mobills, Organizze, Minhas Economias, Money Manager, YNAB…) exportam CSV ou OFX: também servem.</li><li>Faturas de cartão: escolhe a conta do cartão. Se as compras aparecerem como entradas, liga "Inverter sinais".</li><li>PDF não serve: não dá para ler com segurança.</li></ul>`, 'bktips', 'info')}
</div>${ligacao()}`;
// arrastar o ficheiro para a caixa
document.addEventListener('dragover', e => { const z = e.target && e.target.closest && e.target.closest('.bnk-drop'); if (z) { e.preventDefault(); z.classList.add('on'); } });
document.addEventListener('dragleave', e => { const z = e.target && e.target.closest && e.target.closest('.bnk-drop'); if (z) z.classList.remove('on'); });
document.addEventListener('drop', e => { const z = e.target && e.target.closest && e.target.closest('.bnk-drop'); if (!z) return; e.preventDefault(); z.classList.remove('on'); BK.read([...((e.dataTransfer && e.dataTransfer.files) || [])]); });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('bnk-drop')) { e.preventDefault(); A.bkPick(); } });

Object.assign(BK, { num, date, dOrder, decOf, csvRows, ofx, qif, table, fromTable, review, commit, catOf, key, readFile, setBal, state: () => ST, est: cur0, refresh, sy: () => SY, _sy: o => { SY = o; }, mapTo, importMapped });
})();
