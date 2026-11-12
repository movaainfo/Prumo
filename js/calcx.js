/* PRUMO — Calculadora › Cálculo (v3.15): derivadas, integrais, matrizes e sucessões.
   Tudo feito aqui, sem eval e sem bibliotecas: um pequeno sistema de álgebra (árvore das expressões, derivadas pelas regras,
   simplificação, primitivas pelas regras e por substituição e partes, sempre verificadas derivando outra vez), integrais definidos
   (pela primitiva ou numéricos, também com ±∞), matrizes com frações exatas (soma, produto, transposta, determinante, inversa,
   posto, potência, escalonar, sistemas, polinómio característico e valores próprios) e sucessões (termos, monotonia, limite,
   somas, recorrência e progressões). A trigonometria aqui é sempre em radianos. */
(() => {
'use strict';
const CX = OS.CalcX = {};
const esc = OS.U.esc;

/* ================= números ================= */
const rat = (v, md = 1000, tol = 1e-12) => { if (!isFinite(v)) return null; if (Number.isInteger(v)) return [v, 1]; let h1 = 1, h0 = 0, k1 = 0, k0 = 1, x = v;
  for (let i = 0; i < 40; i++) { const a = Math.floor(x); [h1, h0] = [a * h1 + h0, h1]; [k1, k0] = [a * k1 + k0, k1]; if (k1 > md) break; if (Math.abs(v - h1 / k1) <= tol * Math.max(1, Math.abs(v))) return [h1, k1]; const f = x - a; if (f < 1e-15) break; x = 1 / f; } return null; };
const fmtN = v => { if (!isFinite(v)) return v > 0 ? '+∞' : v < 0 ? '−∞' : 'indefinido'; if (Math.abs(v) < 1e-13) return '0'; const a = Math.abs(v);
  let s = a >= 1e10 || a < 1e-6 ? v.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', '×10^').replace('e-', '×10^-') : String(+v.toPrecision(10)); return s.replace('-', '−').replace('.', ','); };
const numS = v => { const r = rat(v, 1000, 1e-10); if (r) return (r[0] < 0 ? '−' : '') + (r[1] === 1 ? Math.abs(r[0]) : Math.abs(r[0]) + '/' + r[1]); return fmtN(v); };
// reconhece valores conhecidos: frações, π, e, √2, ln 2…
const nice = (v, tol = 1e-9) => { if (!isFinite(v) || Math.abs(v) < 1e-14) return '';
  const T = [[1, ''], [Math.PI, 'π'], [Math.E, 'e'], [Math.SQRT2, '√2'], [Math.sqrt(3), '√3'], [Math.sqrt(5), '√5'], [Math.sqrt(Math.PI), '√π'], [Math.PI * Math.PI, 'π²'], [Math.LN2, 'ln 2'], [Math.log(3), 'ln 3'], [Math.log(5), 'ln 5'], [1 / Math.PI, '1/π'], [Math.E * Math.E, 'e²']];
  const md = tol < 1e-8 ? 64 : 12; for (const [c, s] of T) { const r = rat(v / c, md, tol); if (!r || Math.abs(r[0]) > 200) continue; if (!s) return r[1] === 1 ? '' : numS(v); const [p, q] = r; return (p < 0 ? '−' : '') + (Math.abs(p) === 1 ? '' : Math.abs(p)) + s + (q > 1 ? '/' + q : ''); } return ''; };
const valS = (v, tol) => { const n = nice(v, tol); return fmtN(v) + (n && n !== fmtN(v) ? ` <span class="cx-eq">= ${esc(n)}</span>` : ''); };

/* ================= expressões: árvore, leitura, avaliação ================= */
const NUM = v => ({ t: 'n', v }), VAR = n => ({ t: 'v', n }), CON = k => ({ t: 'c', k }), OP = (t, a, b) => ({ t, a, b }), FN = (f, a) => ({ t: 'f', f, a });
const ALIAS = { sen: 'sin', tg: 'tan', arcsin: 'asin', arcsen: 'asin', arccos: 'acos', arctan: 'atan', arctg: 'atan' };
const WORDS = Object.keys(ALIAS).concat(['asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'sin', 'cos', 'tan', 'exp', 'abs', 'log', 'ln', 'pi']).sort((a, b) => b.length - a.length);
const lex = (s, vars) => { const src = String(s || '').replace(/\s+/g, '').replace(/[×·∙]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/²/g, '^2').replace(/³/g, '^3').replace(/\*\*/g, '^');
  const T = []; let i = 0;
  while (i < src.length) { const c = src[i];
    if (/[0-9.,]/.test(c)) { let j = i; while (j < src.length && /[0-9.,]/.test(src[j])) j++; const raw = src.slice(i, j).replace(',', '.'); if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) throw new Error('Número inválido: ' + src.slice(i, j)); T.push({ k: 'n', v: +raw }); i = j; continue; }
    if (c === '√') { T.push({ k: 'f', v: 'sqrt' }); i++; continue; } if (c === '∛') { T.push({ k: 'f', v: 'cbrt' }); i++; continue; }
    if (/[a-z]/i.test(c)) { let j = i; while (j < src.length && /[a-z]/i.test(src[j])) j++; let w = src.slice(i, j).toLowerCase(); const orig = w;
      while (w) { const f = WORDS.find(x => w.startsWith(x)); if (f) { T.push(f === 'pi' ? { k: 'c', v: 'pi' } : { k: 'f', v: ALIAS[f] || f }); w = w.slice(f.length); continue; }
        const ch = w[0]; if (ch === 'e') T.push({ k: 'c', v: 'e' }); else if (vars.includes(ch)) T.push({ k: 'v', v: ch }); else throw new Error(`Não conheço "${orig}". ${vars.length ? 'A variável é ' + vars.join(' ou ') + '.' : 'Aqui só entram números.'}`); w = w.slice(1); }
      i = j; continue; }
    if ('+-*/^()!|'.includes(c)) { T.push({ k: 'o', v: c }); i++; continue; }
    throw new Error('Símbolo inválido: ' + c); }
  return T; };
const parse = (s, vars = ['x']) => { const T = lex(s, vars); let p = 0; const is = (k, v) => T[p] && T[p].k === k && (v == null || T[p].v === v);
  const eat = (k, v) => { if (!is(k, v)) throw new Error(v === ')' ? 'Falta fechar um parêntese' : v === '|' ? 'Falta fechar o módulo |…|' : 'Conta incompleta'); return T[p++]; };
  const starts = () => T[p] && (T[p].k !== 'o' || T[p].v === '(');
  const expr = () => { let a = term(); while (is('o', '+') || is('o', '-')) { const o = T[p++].v; a = OP(o, a, term()); } return a; };
  const term = () => { let a = unary(); for (;;) { if (is('o', '*') || is('o', '/')) { const o = T[p++].v; a = OP(o, a, unary()); } else if (starts()) a = OP('*', a, power()); else break; } return a; };
  const unary = () => { if (is('o', '-')) { p++; return OP('*', NUM(-1), unary()); } if (is('o', '+')) { p++; return unary(); } return power(); };
  const power = () => { const b = postfix(); if (is('o', '^')) { p++; return OP('^', b, unary()); } return b; };
  const postfix = () => { let a = primary(); while (is('o', '!')) { p++; a = FN('fact', a); } return a; };
  const primary = () => { const t = T[p]; if (!t) throw new Error('Conta incompleta');
    if (t.k === 'n') { p++; return NUM(t.v); } if (t.k === 'c') { p++; return CON(t.v); } if (t.k === 'v') { p++; return VAR(t.v); }
    if (t.k === 'f') { p++; if (is('o', '(')) { p++; const a = expr(); eat('o', ')'); return FN(t.v, a); } return FN(t.v, power()); }
    if (t.k === 'o' && t.v === '(') { p++; const a = expr(); eat('o', ')'); return a; }
    if (t.k === 'o' && t.v === '|') { p++; const a = expr(); eat('o', '|'); return FN('abs', a); }
    throw new Error('Conta incompleta perto de "' + t.v + '"'); };
  if (!T.length) throw new Error('Escreve uma expressão');
  const r = expr(); if (p < T.length) throw new Error(T[p].v === ')' ? 'Parênteses a mais' : 'Não percebi a partir de "' + T[p].v + '"'); return r; };
const fact = n => { if (n < 0 || n !== Math.floor(n)) return NaN; if (n > 170) return Infinity; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const FV = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, cbrt: Math.cbrt, exp: Math.exp, abs: Math.abs, ln: Math.log, log: Math.log10, fact };
const ev = (a, env) => { switch (a.t) {
  case 'n': return a.v; case 'c': return a.k === 'pi' ? Math.PI : Math.E;
  case 'v': { const v = env[a.n]; if (v == null) throw new Error('Falta o valor de ' + a.n); return v; }
  case 'f': return FV[a.f](ev(a.a, env));
  case '+': return ev(a.a, env) + ev(a.b, env); case '-': return ev(a.a, env) - ev(a.b, env); case '*': return ev(a.a, env) * ev(a.b, env); case '/': return ev(a.a, env) / ev(a.b, env);
  case '^': { const b = ev(a.a, env), e = ev(a.b, env); if (b < 0 && !Number.isInteger(e)) { const q = rat(e, 99); if (q && q[1] % 2 === 1) return (q[0] % 2 ? -1 : 1) * Math.pow(-b, e); } return Math.pow(b, e); } }
  return NaN; };
const has = (a, v) => a.t === 'v' ? (v == null || a.n === v) : a.t === 'n' || a.t === 'c' ? false : a.t === 'f' ? has(a.a, v) : has(a.a, v) || has(a.b, v);
const num = a => a && a.t === 'n' ? a.v : null;

/* ================= escrever: forma simples (para o gráfico e para comparar) e forma bonita ================= */
const PR = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
const plain = a => { switch (a.t) {
  case 'n': { const s = String(+a.v.toPrecision(15)); return a.v < 0 ? '(' + s + ')' : s; } case 'c': return a.k === 'pi' ? 'pi' : 'e'; case 'v': return a.n;
  case 'f': return a.f === 'fact' ? wP(a.a, 5) + '!' : a.f + '(' + plain(a.a) + ')';
  case '^': return wP(a.a, 5) + '^' + wP(a.b, 5);
  default: { const p = PR[a.t]; return wP(a.a, p) + a.t + wP(a.b, a.t === '-' || a.t === '/' ? p + 1 : p); } } };
const wP = (a, p) => { const s = plain(a), q = a.t === 'n' || a.t === 'c' || a.t === 'v' || a.t === 'f' ? 9 : PR[a.t]; return q < p ? '(' + s + ')' : s; };
// para o separador Gráfica (que só conhece sin, cos, tan, asin, acos, atan, sqrt, ln, log, abs, exp)
const toG = a => { if (a.t === 'f') { const u = toG(a.a), E = x => FN('exp', x), m = OP('*', NUM(-1), u);
    if (a.f === 'sinh') return OP('/', OP('-', E(u), E(m)), NUM(2)); if (a.f === 'cosh') return OP('/', OP('+', E(u), E(m)), NUM(2)); if (a.f === 'tanh') return OP('/', OP('-', E(u), E(m)), OP('+', E(u), E(m))); if (a.f === 'cbrt') return OP('^', u, OP('/', NUM(1), NUM(3))); return FN(a.f, u); }
  if (a.t === '+' || a.t === '-' || a.t === '*' || a.t === '/' || a.t === '^') return OP(a.t, toG(a.a), toG(a.b)); return a; };
const SUPC = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = n => String(n).split('').map(c => SUPC[c] || c).join('');
const isNeg = t => (t.t === 'n' && t.v < 0) || (t.t === '*' && t.a.t === 'n' && t.a.v < 0);
const negOf = t => t.t === 'n' ? NUM(-t.v) : t.a.v === -1 ? t.b : OP('*', NUM(-t.a.v), t.b);
const pr = a => { switch (a.t) {
  case 'n': { const s = numS(Math.abs(a.v)); return { s: (a.v < 0 ? '−' : '') + s, p: a.v < 0 ? 1.5 : s.includes('/') ? 2 : 9 }; }
  case 'c': return { s: a.k === 'pi' ? 'π' : 'e', p: 9 }; case 'v': return { s: a.n, p: 9 };
  case 'f': { if (a.f === 'abs') return { s: '|' + pr(a.a).s + '|', p: 9 }; if (a.f === 'sqrt') return { s: '√' + par(a.a, 9), p: 8 }; if (a.f === 'cbrt') return { s: '∛' + par(a.a, 9), p: 8 };
    if (a.f === 'exp') return powS(CON('e'), a.a); if (a.f === 'fact') return { s: par(a.a, 9) + '!', p: 8 }; if (a.a.t === 'f' && a.a.f === 'abs') return { s: a.f + pr(a.a).s, p: 9 }; return { s: a.f + '(' + pr(a.a).s + ')', p: 9 }; }
  case '^': return powS(a.a, a.b);
  case '+': case '-': { const L = []; const fl = (t, sg) => { if (t.t === '+') { fl(t.a, sg); fl(t.b, sg); } else if (t.t === '-') { fl(t.a, sg); fl(t.b, -sg); } else L.push([sg, t]); }; fl(a, 1);
    let s = ''; L.forEach(([sg, t], i) => { let neg = sg < 0; if (isNeg(t)) { neg = !neg; t = negOf(t); } const ts = par(t, 1.5); s += i === 0 ? (neg ? '−' : '') + ts : (neg ? ' − ' : ' + ') + ts; }); return { s, p: 1 }; }
  case '*': case '/': return mulS(a); } return { s: '?', p: 9 }; };
const par = (a, p) => { const r = pr(a); return r.p < p ? '(' + r.s + ')' : r.s; };
const powS = (b, e) => { const n = num(e), base = b.t === 'c' && b.k === 'e' ? 'e' : par(b, 9);
  if (n === 0.5) return { s: '√' + par(b, 9), p: 8 }; if (n != null && Math.abs(n - 1 / 3) < 1e-12) return { s: '∛' + par(b, 9), p: 8 };
  if (n != null && Number.isInteger(n)) return { s: base + sup(n), p: 8 };
  const es = pr(e); return { s: base + '^' + (es.p >= 9 && !/\//.test(es.s) ? es.s : '(' + es.s + ')'), p: 8 }; };
const mulS = a => { let k = 1; const nu = [], de = []; const fl = (t, e) => { if (t.t === '*') { fl(t.a, e); fl(t.b, e); } else if (t.t === '/') { fl(t.a, e); fl(t.b, -e); } else if (t.t === 'n') k *= e > 0 ? t.v : 1 / t.v; else (e > 0 ? nu : de).push(t); }; fl(a, 1);
  const r = rat(k, 1000, 1e-10), sg = k < 0 ? '−' : '', pq = r ? [Math.abs(r[0]), r[1]] : [Math.abs(k), 1];
  const join = (L, c) => { let s = c != null && c !== 1 ? (r ? String(c) : fmtN(c)) : ''; L.forEach(t => { const ts = par(t, 2.5); s += !s ? ts : /^[0-9]/.test(s.slice(-1)) && !/^[0-9]/.test(ts) || /^\(/.test(ts) ? ts : '·' + ts; }); return s; };
  const ns = join(nu, pq[0]) || '1', ds = join(de, pq[1]); if (!ds) return { s: sg + ns, p: sg ? 1.5 : 2 };
  const wrapD = (s, L) => L.length + (pq[1] !== 1 ? 1 : 0) > 1 ? '(' + s + ')' : s;
  return { s: sg + ns + '/' + wrapD(ds, de), p: 2 }; };
const pretty = a => pr(a).s;

/* ================= simplificar ================= */
const keyOf = a => plain(a);
const deg = a => a.t === 'v' ? 1 : a.t === '^' && a.a.t === 'v' && a.b.t === 'n' ? a.b.v : a.t === '*' ? deg(a.a) + deg(a.b) : a.t === '/' ? deg(a.a) - deg(a.b) : 0;
const coefOf = t => t.t === 'n' ? [t.v, null] : t.t === '*' && t.a.t === 'n' ? [t.a.v, t.b] : [1, t];
let DEPTH = 0;
const S1 = a => { if (++DEPTH > 4000) throw new Error('Expressão demasiado grande'); switch (a.t) {
  case 'f': return sf(a.f, S1(a.a)); case '+': case '-': return sum(a); case '*': case '/': return prod(a); case '^': return pw(S1(a.a), S1(a.b)); } return a; };
const simplify = a => { let s = a, prev = keyOf(a); for (let i = 0; i < 10; i++) { DEPTH = 0; s = S1(s); const k = keyOf(s); if (k === prev) break; prev = k; } return s; };
const sum = a => { const L = []; const fl = (t, sg) => { if (t.t === '+') { fl(t.a, sg); fl(t.b, sg); } else if (t.t === '-') { fl(t.a, sg); fl(t.b, -sg); } else { const s = S1(t); if (s.t === '+' || s.t === '-') flS(s, sg); else L.push([sg, s]); } };
  const flS = (t, sg) => { if (t.t === '+') { flS(t.a, sg); flS(t.b, sg); } else if (t.t === '-') { flS(t.a, sg); flS(t.b, -sg); } else L.push([sg, t]); }; fl(a, 1);
  let c = 0; const M = new Map(), order = [];
  L.forEach(([sg, t]) => { const [k, m] = coefOf(t); if (!m) { c += sg * k; return; } const kk = keyOf(m); if (!M.has(kk)) { M.set(kk, [0, m]); order.push(kk); } M.get(kk)[0] += sg * k; });
  const parts = order.map(k => M.get(k)).filter(([k]) => Math.abs(k) > 1e-13).map(([k, m]) => k === 1 ? m : OP('*', NUM(k), m)); parts.sort((x, y) => deg(coefOf(y)[1] || NUM(0)) - deg(coefOf(x)[1] || NUM(0)));
  if (Math.abs(c) > 1e-13) parts.push(NUM(c)); if (!parts.length) return NUM(0);
  return parts.slice(1).reduce((acc, t) => isNeg(t) ? OP('-', acc, negOf(t)) : OP('+', acc, t), parts[0]); };
const prod = a => { const L = []; const fl = (t, e) => { if (t.t === '*') { fl(t.a, e); fl(t.b, e); } else if (t.t === '/') { fl(t.a, e); fl(t.b, -e); } else { const s = S1(t); if (s.t === '*' || s.t === '/') flS(s, e); else L.push([s, e]); } };
  const flS = (t, e) => { if (t.t === '*') { flS(t.a, e); flS(t.b, e); } else if (t.t === '/') { flS(t.a, e); flS(t.b, -e); } else L.push([t, e]); }; fl(a, 1);
  let k = 1; const M = new Map(), order = [];
  for (const [f, e] of L) { if (f.t === 'n') { k *= e > 0 ? f.v : 1 / f.v; continue; } let base = f, ex = NUM(e);
    if (f.t === '^') { base = f.a; ex = e === 1 ? f.b : S1(OP('*', NUM(-1), f.b)); } else if (f.t === 'f' && f.f === 'sqrt') { base = f.a; ex = NUM(e * .5); }
    const kk = keyOf(base); if (!M.has(kk)) { M.set(kk, [base, []]); order.push(kk); } M.get(kk)[1].push(ex); }
  if (k === 0 || !isFinite(k)) return NUM(k === 0 ? 0 : NaN);
  const nu = [], de = [];
  order.forEach(kk => { const [base, exps] = M.get(kk); const ex = exps.length === 1 ? exps[0] : S1(exps.reduce((p, q) => OP('+', p, q))), n = num(ex);
    if (n === 0) return; const one = (b, m) => m === 1 ? b : m === .5 && b.t !== 'n' ? FN('sqrt', b) : pw(b, NUM(m));
    if (n != null && n < 0) { const d = one(base, -n); if (d.t === 'n') k /= d.v; else de.push(d); } else { const u = n != null ? one(base, n) : pw(base, ex); if (u.t === 'n') k *= u.v; else nu.push(u); } });
  const rk = t => t.t === 'v' || (t.t === '^' && t.a.t === 'v') ? 0 : t.t === 'c' || (t.t === '^' && !has(t)) ? 1 : t.t === 'f' || t.t === '^' && t.a.t === 'f' ? 2 : 3; nu.sort((x, y) => rk(x) - rk(y)); de.sort((x, y) => rk(x) - rk(y));
  let body = nu.length ? nu.reduce((p, q) => OP('*', p, q)) : null; if (de.length) body = OP('/', body || NUM(1), de.reduce((p, q) => OP('*', p, q)));
  if (!body) return NUM(k); return Math.abs(k - 1) < 1e-15 ? body : OP('*', NUM(k), body); };
const pw = (b, e) => { const bv = num(b), n = num(e);
  if (n === 0) return NUM(1); if (n === 1) return b; if (bv === 1) return NUM(1); if (bv === 0 && n > 0) return NUM(0);
  if (bv != null && n != null) { const r = Math.pow(bv, n); if (Number.isInteger(n) && Math.abs(r) < 1e15) return NUM(r); if (bv > 0 && Math.abs(r - Math.round(r)) < 1e-12) return NUM(Math.round(r)); }
  if (b.t === 'c' && b.k === 'e') return sf('exp', e);
  if (b.t === '^' && n != null && Number.isInteger(n)) return pw(b.a, S1(OP('*', b.b, e)));
  if (b.t === 'f' && b.f === 'sqrt' && n != null && Number.isInteger(n) && n % 2 === 0) return pw(b.a, NUM(n / 2));
  if (b.t === 'f' && b.f === 'exp') return sf('exp', S1(OP('*', b.a, e)));
  if (b.t === '*' && b.a.t === 'n' && n != null && Number.isInteger(n)) return prod(OP('*', NUM(Math.pow(b.a.v, n)), OP('^', b.b, e)));
  return OP('^', b, e); };
const sf = (f, a) => {
  if (f === 'exp' && a.t === 'f' && a.f === 'ln') return a.a; if (f === 'ln' && a.t === 'f' && a.f === 'exp') return a.a; if (f === 'ln' && a.t === 'c' && a.k === 'e') return NUM(1);
  if (f === 'sqrt' && a.t === '^' && num(a.b) === 2) return FN('abs', a.a); if (f === 'abs' && a.t === 'f' && (a.f === 'abs' || a.f === 'exp' || a.f === 'sqrt')) return a;
  if (!has(a)) { let r; try { r = FV[f](ev(a, {})); } catch (e) { r = NaN; } if (isFinite(r) && Math.abs(r - Math.round(r)) < 1e-12) return NUM(Math.round(r)); if (f === 'abs' && a.t === 'n') return NUM(Math.abs(a.v)); }
  return FN(f, a); };

/* ================= derivadas ================= */
const D = (a, v) => { switch (a.t) {
  case 'n': case 'c': return NUM(0); case 'v': return NUM(a.n === v ? 1 : 0);
  case '+': return OP('+', D(a.a, v), D(a.b, v)); case '-': return OP('-', D(a.a, v), D(a.b, v));
  case '*': return OP('+', OP('*', D(a.a, v), a.b), OP('*', a.a, D(a.b, v)));
  case '/': return OP('/', OP('-', OP('*', D(a.a, v), a.b), OP('*', a.a, D(a.b, v))), OP('^', a.b, NUM(2)));
  case '^': { const hb = has(a.a, v), he = has(a.b, v); if (!hb && !he) return NUM(0);
    if (!he) return OP('*', OP('*', a.b, OP('^', a.a, OP('-', a.b, NUM(1)))), D(a.a, v));
    if (!hb) return OP('*', OP('*', a, FN('ln', a.a)), D(a.b, v));
    return OP('*', a, OP('+', OP('*', D(a.b, v), FN('ln', a.a)), OP('/', OP('*', a.b, D(a.a, v)), a.a))); }
  case 'f': { const u = a.a; if (!has(u, v)) return NUM(0); const du = D(u, v), sq = x => OP('^', x, NUM(2)); let g;
    switch (a.f) {
      case 'sin': g = FN('cos', u); break; case 'cos': g = OP('*', NUM(-1), FN('sin', u)); break; case 'tan': g = OP('/', NUM(1), sq(FN('cos', u))); break;
      case 'asin': g = OP('/', NUM(1), FN('sqrt', OP('-', NUM(1), sq(u)))); break; case 'acos': g = OP('/', NUM(-1), FN('sqrt', OP('-', NUM(1), sq(u)))); break; case 'atan': g = OP('/', NUM(1), OP('+', NUM(1), sq(u))); break;
      case 'sinh': g = FN('cosh', u); break; case 'cosh': g = FN('sinh', u); break; case 'tanh': g = OP('/', NUM(1), sq(FN('cosh', u))); break;
      case 'sqrt': g = OP('/', NUM(1), OP('*', NUM(2), FN('sqrt', u))); break; case 'cbrt': g = OP('/', NUM(1), OP('*', NUM(3), sq(FN('cbrt', u)))); break;
      case 'exp': g = FN('exp', u); break; case 'ln': g = OP('/', NUM(1), u); break; case 'log': g = OP('/', NUM(1), OP('*', u, FN('ln', NUM(10)))); break;
      case 'abs': g = OP('/', u, FN('abs', u)); break; default: throw new Error('A função ' + a.f + ' não tem derivada aqui (n! só em números inteiros).'); }
    return OP('*', g, du); } } return NUM(0); };
const deriv = (a, v) => simplify(D(a, v));

/* ================= primitivas ================= */
const lin = (u, v) => { if (!has(u, v)) return null; const d = deriv(u, v); return d.t === 'n' && d.v !== 0 ? d.v : null; };
const poly = (a, v) => { // coeficientes (do grau 0 para cima) se for um polinómio com coeficientes numéricos
  switch (a.t) { case 'n': return [a.v]; case 'v': return a.n === v ? [0, 1] : null; case 'c': return null;
    case '+': case '-': { const p = poly(a.a, v), q = poly(a.b, v); if (!p || !q) return null; const r = []; for (let i = 0; i < Math.max(p.length, q.length); i++) r[i] = (p[i] || 0) + (a.t === '+' ? 1 : -1) * (q[i] || 0); return r; }
    case '*': { const p = poly(a.a, v), q = poly(a.b, v); if (!p || !q || p.length + q.length > 30) return null; const r = Array(p.length + q.length - 1).fill(0); p.forEach((x, i) => q.forEach((y, j) => { r[i + j] += x * y; })); return r; }
    case '/': { const q = poly(a.b, v); if (!q || q.length !== 1 || !q[0]) return null; const p = poly(a.a, v); return p && p.map(x => x / q[0]); }
    case '^': { const n = num(a.b); if (n == null || !Number.isInteger(n) || n < 0 || n > 12) return null; const p = poly(a.a, v); if (!p) return null; let r = [1]; for (let k = 0; k < n; k++) r = poly(OP('*', polyN(r, v), polyN(p, v)), v); return r; } }
  return null; };
const polyN = (c, v) => { const T = []; c.forEach((k, i) => { if (Math.abs(k) > 1e-14) T.push(i === 0 ? NUM(k) : OP('*', NUM(k), i === 1 ? VAR(v) : OP('^', VAR(v), NUM(i)))); }); return T.length ? T.reduce((p, q) => OP('+', p, q)) : NUM(0); };
const BASE = { sin: u => OP('*', NUM(-1), FN('cos', u)), cos: u => FN('sin', u), tan: u => OP('*', NUM(-1), FN('ln', FN('abs', FN('cos', u)))), exp: u => FN('exp', u), sinh: u => FN('cosh', u), cosh: u => FN('sinh', u), tanh: u => FN('ln', FN('cosh', u)),
  sqrt: u => OP('*', NUM(2 / 3), OP('^', u, NUM(1.5))), cbrt: u => OP('*', NUM(3 / 4), OP('^', u, OP('/', NUM(4), NUM(3)))), ln: u => OP('-', OP('*', u, FN('ln', u)), u), log: u => OP('/', OP('-', OP('*', u, FN('ln', u)), u), FN('ln', NUM(10))),
  atan: u => OP('-', OP('*', u, FN('atan', u)), OP('/', FN('ln', OP('+', NUM(1), OP('^', u, NUM(2)))), NUM(2))), asin: u => OP('+', OP('*', u, FN('asin', u)), FN('sqrt', OP('-', NUM(1), OP('^', u, NUM(2))))),
  acos: u => OP('-', OP('*', u, FN('acos', u)), FN('sqrt', OP('-', NUM(1), OP('^', u, NUM(2))))), abs: u => OP('/', OP('*', u, FN('abs', u)), NUM(2)) };
const subs = (a, k, b) => keyOf(a) === k ? b : a.t === 'f' ? FN(a.f, subs(a.a, k, b)) : a.a && a.b ? OP(a.t, subs(a.a, k, b), subs(a.b, k, b)) : a;
const cands = (a, v, out = []) => { if (a.t === 'f' || a.t === '^' || a.t === '+' || a.t === '-') { if (has(a, v) && a.t !== 'v') out.push(a); } if (a.t === 'f') cands(a.a, v, out); else if (a.a && a.b) { cands(a.a, v, out); cands(a.b, v, out); } return out; };
const integ = (f0, v, d = 0) => { if (d > 3) return null; const f = simplify(f0);
  if (!has(f, v)) return OP('*', f, VAR(v));
  if (f.t === '^' && num(f.b) === 2 && f.a.t === 'f' && (f.a.f === 'sin' || f.a.f === 'cos')) { const u = f.a.a, a1 = lin(u, v); if (a1 != null) return OP(f.a.f === 'sin' ? '-' : '+', OP('/', VAR(v), NUM(2)), OP('/', FN('sin', OP('*', NUM(2), u)), NUM(4 * a1))); }
  if (f.t === '^' && !has(f.b, v)) { const a1 = lin(f.a, v), n = num(f.b); if (a1 != null) return n === -1 ? OP('/', FN('ln', FN('abs', f.a)), NUM(a1)) : OP('/', OP('^', f.a, OP('+', f.b, NUM(1))), OP('*', NUM(a1), OP('+', f.b, NUM(1)))); }
  const pl = poly(f, v); if (pl) return polyN(pl.map((c, i) => c / (i + 1)).reduce((acc, c, i) => { acc[i + 1] = c; return acc; }, [0]), v);
  switch (f.t) {
    case 'v': return OP('/', OP('^', f, NUM(2)), NUM(2));
    case '+': case '-': { const A = integ(f.a, v, d), B = A && integ(f.b, v, d); return A && B ? OP(f.t, A, B) : null; }
    case '*': { if (!has(f.a, v)) { const r = integ(f.b, v, d); return r && OP('*', f.a, r); } if (!has(f.b, v)) { const r = integ(f.a, v, d); return r && OP('*', f.b, r); } break; }
    case '/': { if (!has(f.b, v)) { const r = integ(f.a, v, d); return r && OP('/', r, f.b); }
      if (!has(f.a, v)) { const g = f.b, a1 = lin(g, v); if (a1 != null) return OP('*', OP('/', f.a, NUM(a1)), FN('ln', FN('abs', g)));
        if (g.t === '^' && !has(g.b, v)) { const a2 = lin(g.a, v); if (a2 != null) return integ(OP('*', f.a, OP('^', g.a, OP('*', NUM(-1), g.b))), v, d + 1); }
        const pg = poly(g, v); if (pg && pg.length === 3 && Math.abs(pg[1]) < 1e-14 && pg[0] > 0 && pg[2] > 0) { const s = Math.sqrt(pg[0] / pg[2]); return OP('*', OP('/', f.a, NUM(pg[2] * s)), FN('atan', OP('/', VAR(v), NUM(s)))); } // k/(a+bx²)
        if (g.t === 'f' && g.f === 'sqrt') { const pq = poly(g.a, v); if (pq && pq.length === 3 && Math.abs(pq[1]) < 1e-14 && pq[0] > 0 && pq[2] < 0) { const s = Math.sqrt(-pq[0] / pq[2]); return OP('*', OP('/', f.a, NUM(Math.sqrt(-pq[2]))), FN('asin', OP('/', VAR(v), NUM(s)))); } } } // k/√(a−bx²)
      break; }
    case '^': { if (!has(f.a, v)) { const a1 = lin(f.b, v); if (a1 != null) return OP('/', f, OP('*', NUM(a1), FN('ln', f.a))); } break; }
    case 'f': { const a1 = lin(f.a, v); if (a1 != null && BASE[f.f]) return OP('/', BASE[f.f](f.a), NUM(a1)); break; } }
  return bySub(f, v, d) || byParts(f, v, d); };
// substituição: f = h(g(x))·g'(x)
const bySub = (f, v, d) => { const seen = new Set();
  for (const g of cands(f, v)) { const k = keyOf(g); if (seen.has(k) || lin(g, v) != null && g.t !== 'f') continue; seen.add(k); const gp = deriv(g, v); if (gp.t === 'n' && gp.v === 0) continue;
    const h = simplify(OP('/', f, gp)), hu = simplify(subs(h, k, VAR('ũ'))); if (has(hu, v)) continue; const F = integ(hu, 'ũ', d + 1); if (F) return subs(simplify(F), 'ũ', g); }
  return null; };
// por partes: polinómio × (eˣ, sin, cos, sinh, cosh de ax+b) e polinómio × ln(x)
const byParts = (f, v, d) => { if (f.t !== '*') return null; const L = []; const fl = t => { if (t.t === '*') { fl(t.a); fl(t.b); } else L.push(t); }; fl(f);
  const E = L.find(t => t.t === 'f' && t.f === 'exp' && lin(t.a, v) != null), W = L.find(t => t.t === 'f' && (t.f === 'sin' || t.f === 'cos') && lin(t.a, v) != null);
  if (E && W && L.length === 2) { const a = lin(E.a, v), b = lin(W.a, v), s = FN('sin', W.a), c = FN('cos', W.a), k = NUM(1 / (a * a + b * b)); // ∫eᵘ·sin(w) = eᵘ(a·sin w − b·cos w)/(a² + b²)
    return OP('*', k, OP('*', E, W.f === 'sin' ? OP('-', OP('*', NUM(a), s), OP('*', NUM(b), c)) : OP('+', OP('*', NUM(a), c), OP('*', NUM(b), s)))); }
  const P = L.filter(t => poly(t, v)), G = L.filter(t => !poly(t, v)); if (!P.length || G.length !== 1) return null; const p = simplify(P.reduce((a, b) => OP('*', a, b))), g = G[0];
  if (g.t === 'f' && ['exp', 'sin', 'cos', 'sinh', 'cosh'].includes(g.f) && lin(g.a, v) != null) { let Gk = g, Pk = p, sg = 1, acc = null;
    for (let i = 0; i < 14; i++) { Gk = integ(Gk, v, d + 1); if (!Gk) return null; const term = OP('*', NUM(sg), OP('*', Pk, Gk)); acc = acc ? OP('+', acc, term) : term; Pk = deriv(Pk, v); sg = -sg; if (Pk.t === 'n' && Pk.v === 0) return acc; } return null; }
  if (g.t === 'f' && g.f === 'ln' && g.a.t === 'v' && g.a.n === v) { const Q = integ(p, v, d + 1); if (!Q) return null; const R = integ(simplify(OP('/', Q, VAR(v))), v, d + 1); return R && OP('-', OP('*', Q, g), R); }
  return null; };
const SAMPLE = [-2.31, -1.13, -0.41, 0.37, 0.93, 1.71, 2.63, 3.47, 5.09, 0.11];
const sameFn = (A, B, v) => { let ok = 0; for (const x of SAMPLE) { let a, b; try { a = ev(A, { [v]: x }); b = ev(B, { [v]: x }); } catch (e) { continue; } if (!isFinite(a) || !isFinite(b)) continue; if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) return false; ok++; } return ok >= 3; };
const primitive = (f, v = 'x') => { let F = null; try { F = integ(f, v); } catch (e) { F = null; } if (!F) return null; F = simplify(F); return sameFn(deriv(F, v), f, v) ? F : null; };

/* ================= integrais definidos (numéricos) ================= */
const simpson = (g, a, b) => { let n = 0; const rec = (a, b, fa, fb, fc, S, eps, d) => { if (++n > 4e5) throw new Error('lento'); const c = (a + b) / 2, l = (a + c) / 2, r = (c + b) / 2, fl = g(l), fr = g(r), Sl = (c - a) / 6 * (fa + 4 * fl + fc), Sr = (b - c) / 6 * (fc + 4 * fr + fb), S2 = Sl + Sr;
  if (d <= 0 || Math.abs(S2 - S) <= 15 * eps) return S2 + (S2 - S) / 15; return rec(a, c, fa, fc, fl, Sl, eps / 2, d - 1) + rec(c, b, fc, fb, fr, Sr, eps / 2, d - 1); };
  const fa = g(a), fb = g(b), fc = g((a + b) / 2); return rec(a, b, fa, fb, fc, (b - a) / 6 * (fa + 4 * fc + fb), 1e-11 * Math.max(1, Math.abs(b - a)), 40); };
// tanh-sinh: aguenta pontas onde a função explode (1/√x em [0, 1]) e, com mudança de variável, intervalos infinitos
const tanhSinh = (g, a, b) => { const r = (b - a) / 2; let last = null;
  for (let lev = 0; lev <= 7; lev++) { const h = .5 / (1 << lev); let s = 0;
    for (let t = -4.5; t <= 4.5 + 1e-12; t += h) { const u = Math.PI / 2 * Math.sinh(t), ch = Math.cosh(u), w = Math.PI / 2 * Math.cosh(t) / (ch * ch); if (!isFinite(w) || w < 1e-300) continue;
      const dd = 2 * r / (Math.exp(2 * Math.abs(u)) + 1), x = t >= 0 ? b - dd : a + dd; if (!(x > a && x < b)) continue; const y = g(x); if (!isFinite(y)) { if (Math.abs(t) > 3.5) continue; return { v: NaN, ok: false }; } s += w * y; }
    const est = s * h * r; if (last != null && Math.abs(est - last) <= 1e-10 * Math.max(1, Math.abs(est))) return { v: est, ok: true }; last = est; }
  return { v: last, ok: false }; };
const limV = s => { const t = String(s || '').trim().replace(/\s+/g, '').replace(/∞/g, 'inf').toLowerCase(); if (/^\+?inf(inito)?$/.test(t)) return Infinity; if (/^-inf(inito)?$/.test(t) || /^−inf/.test(t)) return -Infinity; const v = ev(simplify(parse(s, [])), {}); if (!isFinite(v)) throw new Error('Limite inválido'); return v; };
const defInt = (f, a, b, v = 'x') => { const g = x => { try { return ev(f, { [v]: x }); } catch (e) { return NaN; } };
  if (a === b) return { v: 0, ok: true }; if (a > b) { const r = defInt(f, b, a, v); return { v: -r.v, ok: r.ok, how: r.how }; }
  if (a === -Infinity && b === Infinity) { const L = defInt(f, -Infinity, 0, v), R = defInt(f, 0, Infinity, v); return { v: L.v + R.v, ok: L.ok && R.ok }; }
  if (b === Infinity) return tanhSinh(t => g(a + t / (1 - t)) / ((1 - t) * (1 - t)), 0, 1); if (a === -Infinity) return tanhSinh(t => g(b - t / (1 - t)) / ((1 - t) * (1 - t)), 0, 1);
  // sem pontas a explodir e sem buracos: Simpson adaptativo; senão tanh-sinh
  let smooth = isFinite(g(a)) && isFinite(g(b)); if (smooth) for (let i = 1; i < 200; i++) { if (!isFinite(g(a + (b - a) * i / 200))) { smooth = false; break; } }
  if (smooth) { try { const s = simpson(g, a, b); if (isFinite(s)) return { v: s, ok: true }; } catch (e) { } }
  return tanhSinh(g, a, b); };

/* ================= pontos críticos (máximos e mínimos) ================= */
const critical = (f, fp, fpp, lo = -10, hi = 10) => { const g = x => { try { return ev(fp, { x }); } catch (e) { return NaN; } }, N = 4000, out = [];
  let px = lo, py = g(lo);
  for (let i = 1; i <= N; i++) { const x = lo + (hi - lo) * i / N, y = g(x); if (isFinite(py) && isFinite(y) && (py === 0 || py * y < 0)) { let a = px, b = x, fa = py; if (py === 0) { b = px; } else for (let k = 0; k < 70; k++) { const m = (a + b) / 2, fm = g(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } }
      const r = py === 0 ? px : (a + b) / 2; if (!out.some(o => Math.abs(o.x - r) < 1e-6)) { let fv, s2; try { fv = ev(f, { x: r }); s2 = ev(fpp, { x: r }); } catch (e) { } const left = g(r - 1e-4), right = g(r + 1e-4); const kind = left > 0 && right < 0 ? 'máximo local' : left < 0 && right > 0 ? 'mínimo local' : 'ponto de inflexão (estacionário)'; if (isFinite(fv)) out.push({ x: Math.abs(r) < 1e-10 ? 0 : r, y: fv, kind }); } }
    px = x; py = y; if (out.length > 12) break; }
  return out; };

/* ================= matrizes (frações exatas; se houver números irracionais, decimais) ================= */
const bg = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const QF = { of: (n, d = 1n) => { if (d === 0n) throw new Error('Divisão por zero'); if (d < 0n) { n = -n; d = -d; } const g = bg(n, d); return g > 1n ? { n: n / g, d: d / g } : { n, d }; },
  add: (a, b) => QF.of(a.n * b.d + b.n * a.d, a.d * b.d), sub: (a, b) => QF.of(a.n * b.d - b.n * a.d, a.d * b.d), mul: (a, b) => QF.of(a.n * b.n, a.d * b.d), div: (a, b) => { if (b.n === 0n) throw new Error('Divisão por zero'); return QF.of(a.n * b.d, a.d * b.n); },
  neg: a => ({ n: -a.n, d: a.d }), z: a => a.n === 0n, zero: () => ({ n: 0n, d: 1n }), one: () => ({ n: 1n, d: 1n }), fromInt: k => ({ n: BigInt(k), d: 1n }), num: a => Number(a.n) / Number(a.d), abs: a => a.n < 0n ? QF.neg(a) : a, gt: (a, b) => a.n * b.d > b.n * a.d,
  fmt: a => (a.n < 0n ? '−' : '') + (a.d === 1n ? String(a.n < 0n ? -a.n : a.n) : (a.n < 0n ? -a.n : a.n) + '/' + a.d) };
const FF = { of: v => v, add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => { if (Math.abs(b) < 1e-14) throw new Error('Divisão por zero'); return a / b; }, neg: a => -a, z: a => Math.abs(a) < 1e-11, zero: () => 0, one: () => 1, fromInt: k => k, num: a => a, abs: Math.abs, gt: (a, b) => a > b, fmt: a => numS(Math.abs(a) < 1e-11 ? 0 : a) };
const decQ = s => { let m = s.match(/^([+-]?)(\d+)(?:[.,](\d+))?$/); if (m) { const d = m[3] || ''; return QF.of(BigInt((m[1] === '-' ? '-' : '') + m[2] + d), 10n ** BigInt(d.length)); }
  m = s.match(/^([+-]?\d+)\/(\d+)$/); if (m) return QF.of(BigInt(m[1]), BigInt(m[2])); return null; };
const readM = (txt, name) => { const rows = String(txt || '').trim().replace(/[[\]]/g, '').split(/\n|;/).map(r => r.trim()).filter(Boolean).map(r => r.split(/\s+/).filter(Boolean)); if (!rows.length) throw new Error(`Escreve a matriz ${name} (uma linha por linha, números separados por espaços)`);
  const w = rows[0].length; if (rows.some(r => r.length !== w)) throw new Error(`A matriz ${name} tem linhas com tamanhos diferentes`);
  const q = rows.map(r => r.map(decQ)); if (q.every(r => r.every(Boolean))) return { K: QF, m: q };
  return { K: FF, m: rows.map(r => r.map(s => { const v = ev(simplify(parse(s.replace(/−/g, '-'), [])), {}); if (!isFinite(v)) throw new Error(`Valor inválido em ${name}: ${s}`); return v; })) }; };
const toF = M => M.K === FF ? M : { K: FF, m: M.m.map(r => r.map(QF.num)) };
const same = (A, B) => A.K === B.K ? [A, B] : [toF(A), toF(B)];
const dims = M => [M.m.length, M.m[0].length];
const mAdd = (A, B, s) => { [A, B] = same(A, B); const K = A.K; if (dims(A).join() !== dims(B).join()) throw new Error('Para somar, A e B têm de ter o mesmo tamanho'); return { K, m: A.m.map((r, i) => r.map((x, j) => s > 0 ? K.add(x, B.m[i][j]) : K.sub(x, B.m[i][j]))) }; };
const mMul = (A, B) => { [A, B] = same(A, B); const K = A.K, [r, c] = dims(A), [r2, c2] = dims(B); if (c !== r2) throw new Error(`Para multiplicar, o n.º de colunas da 1.ª (${c}) tem de ser igual ao n.º de linhas da 2.ª (${r2})`);
  return { K, m: Array.from({ length: r }, (_, i) => Array.from({ length: c2 }, (_, j) => { let s = K.zero(); for (let k = 0; k < c; k++) s = K.add(s, K.mul(A.m[i][k], B.m[k][j])); return s; })) }; };
const mT = A => ({ K: A.K, m: A.m[0].map((_, j) => A.m.map(r => r[j])) });
const mId = (K, n) => ({ K, m: Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? K.one() : K.zero())) });
const rref = M => { const K = M.K, m = M.m.map(r => r.slice()), [R, C] = [m.length, m[0].length], piv = []; let r = 0, sw = 0;
  for (let c = 0; c < C && r < R; c++) { let p = -1; for (let i = r; i < R; i++) { if (!K.z(m[i][c]) && (p < 0 || (K === FF && K.gt(K.abs(m[i][c]), K.abs(m[p][c]))))) { p = i; if (K === QF) break; } } if (p < 0) continue;
    if (p !== r) { [m[p], m[r]] = [m[r], m[p]]; sw++; } const pv = m[r][c]; m[r] = m[r].map(x => K.div(x, pv)); for (let i = 0; i < R; i++) if (i !== r && !K.z(m[i][c])) { const f = m[i][c]; m[i] = m[i].map((x, j) => K.sub(x, K.mul(f, m[r][j]))); } piv.push(c); r++; }
  return { K, m, piv, sw }; };
const det = A => { const K = A.K, [n, c] = dims(A); if (n !== c) throw new Error('O determinante só existe em matrizes quadradas'); const m = A.m.map(r => r.slice()); let d = K.one();
  for (let j = 0; j < n; j++) { let p = -1; for (let i = j; i < n; i++) if (!K.z(m[i][j]) && (p < 0 || (K === FF && K.gt(K.abs(m[i][j]), K.abs(m[p][j]))))) { p = i; if (K === QF) break; } if (p < 0) return K.zero();
    if (p !== j) { [m[p], m[j]] = [m[j], m[p]]; d = K.neg(d); } d = K.mul(d, m[j][j]); for (let i = j + 1; i < n; i++) { const f = K.div(m[i][j], m[j][j]); if (!K.z(f)) m[i] = m[i].map((x, k) => K.sub(x, K.mul(f, m[j][k]))); } } return d; };
const inv = A => { const K = A.K, [n, c] = dims(A); if (n !== c) throw new Error('Só as matrizes quadradas podem ter inversa'); const aug = { K, m: A.m.map((r, i) => r.concat(mId(K, n).m[i])) }, R = rref(aug);
  for (let i = 0; i < n; i++) if (R.piv[i] !== i) throw new Error('A matriz não tem inversa (o determinante é 0)'); return { K, m: R.m.map(r => r.slice(n)) }; };
const mPow = (A, k) => { const [n, c] = dims(A); if (n !== c) throw new Error('Só as matrizes quadradas têm potências'); if (!Number.isInteger(k) || Math.abs(k) > 64) throw new Error('O expoente tem de ser um inteiro entre −64 e 64');
  let B = k < 0 ? inv(A) : A, R = mId(A.K, n), e = Math.abs(k); while (e) { if (e & 1) R = mMul(R, B); B = mMul(B, B); e >>= 1; } return R; };
const charPoly = A => { const K = A.K, [n, c] = dims(A); if (n !== c) throw new Error('Os valores próprios só existem em matrizes quadradas'); if (n > 8) throw new Error('No máximo 8×8');
  const cs = Array(n + 1); cs[n] = K.one(); let M = { K, m: mId(K, n).m.map(r => r.map(() => K.zero())) };
  for (let k = 1; k <= n; k++) { const AM = mMul(A, M); M = { K, m: AM.m.map((r, i) => r.map((x, j) => i === j ? K.add(x, cs[n - k + 1]) : x)) }; const AM2 = mMul(A, M); let tr = K.zero(); for (let i = 0; i < n; i++) tr = K.add(tr, AM2.m[i][i]); cs[n - k] = K.neg(K.div(tr, K.fromInt(k))); }
  return cs; };  // cs[i] = coeficiente de λ^i em det(λI − A)
const croots = c => { // raízes (complexas) do polinómio com coeficientes c[0] + c[1]x + … (c[n] = 1)
  const n = c.length - 1; if (n < 1) return []; const R0 = 1 + Math.max(...c.slice(0, n).map(Math.abs)); let z = Array.from({ length: n }, (_, k) => [R0 * Math.cos(2 * Math.PI * k / n + .4), R0 * Math.sin(2 * Math.PI * k / n + .4)]);
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const P = x => { let r = [c[n], 0]; for (let i = n - 1; i >= 0; i--) { r = mul(r, x); r[0] += c[i]; } return r; };
  for (let it = 0; it < 800; it++) { let mv = 0; z = z.map((zi, i) => { let d = [1, 0]; z.forEach((zj, j) => { if (i !== j) d = mul(d, [zi[0] - zj[0], zi[1] - zj[1]]); }); const s = div(P(zi), d); mv = Math.max(mv, Math.abs(s[0]) + Math.abs(s[1])); return [zi[0] - s[0], zi[1] - s[1]]; }); if (mv < 1e-14) break; }
  return z.map(([a, b]) => [Math.abs(a) < 1e-10 ? 0 : a, Math.abs(b) < 1e-9 ? 0 : b]).sort((p, q) => q[0] - p[0] || q[1] - p[1]); };
const solve = (A, B) => { [A, B] = same(A, B); const K = A.K, [r, c] = dims(A); if (dims(B)[0] !== r) throw new Error('Para resolver A·X = B, B tem de ter o mesmo n.º de linhas de A'); const k = dims(B)[1];
  const R = rref({ K, m: A.m.map((row, i) => row.concat(B.m[i])) }); if (R.piv.some(p => p >= c)) return { kind: 'imp', R };
  if (R.piv.length === c) return { kind: 'uni', R, X: { K, m: Array.from({ length: c }, (_, i) => R.m[i].slice(c)) } };
  if (k !== 1) return { kind: 'inf', R }; const free = []; for (let j = 0; j < c; j++) if (!R.piv.includes(j)) free.push(j);
  const eqs = R.piv.map((pc, i) => { let s = K.z(R.m[i][c]) ? '' : K.fmt(R.m[i][c]); free.forEach(f => { const v = R.m[i][f]; if (K.z(v)) return; const nv = K.neg(v), neg = K.gt(K.zero(), nv), a = K.fmt(K.abs(nv)); s += (s ? (neg ? ' − ' : ' + ') : (neg ? '−' : '')) + (a === '1' ? '' : a) + 'x' + sub(f + 1); }); return 'x' + sub(pc + 1) + ' = ' + (s || '0'); });
  return { kind: 'inf', R, eqs, free: free.map(f => 'x' + sub(f + 1)) }; };
const SUBC = '₀₁₂₃₄₅₆₇₈₉'; const sub = n => String(n).split('').map(d => SUBC[d]).join('');
const mHtml = M => `<table class="cx-mt"><tbody>${M.m.map(r => `<tr>${r.map(x => `<td>${esc(M.K.fmt(x))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

/* ================= sucessões ================= */
const seqLim = g => { const P = []; for (const N of [10, 30, 100, 300, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9]) { let a, b; try { a = g(N); b = g(N + 1); } catch (e) { a = b = NaN; } P.push([N, a, b]); }
  const last3 = P.slice(-3); if (last3.every(p => p[1] === Infinity)) return { inf: 1 }; if (last3.every(p => p[1] === -Infinity)) return { inf: -1 };
  const fin = P.filter(p => isFinite(p[1]) && isFinite(p[2])); if (fin.length < 3) { const big = P.filter(p => isFinite(p[1])).pop(); return big && Math.abs(big[1]) > 1e12 ? { inf: Math.sign(big[1]) } : { unk: 1 }; }
  const L = fin.slice(-3), [a1, a2, a3] = L.map(p => p[1]), [, b2, b3] = L.map(p => p[2]);
  if (Math.abs(a3 - b3) > 1e-3 * (1 + Math.abs(a3)) && Math.abs(a2 - b2) > 1e-3 * (1 + Math.abs(a2))) return Math.abs(a3) > 1e9 ? { osc: 1, big: 1 } : { osc: 1 };
  const d1 = Math.abs(a2 - a1), d2 = Math.abs(a3 - a2);
  if (Math.abs(a3) > 1e7 && Math.abs(a3) > 5 * Math.abs(a1)) return { inf: Math.sign(a3) };
  if (d2 <= 1e-7 * (1 + Math.abs(a3)) || (d2 < .3 * d1 && d2 < 1e-4 * (1 + Math.abs(a3)))) return { L: Math.abs(a3) < 1e-9 ? 0 : +a3.toPrecision(7) };
  if (Math.abs(a3) < Math.abs(a2) && Math.abs(a2) < Math.abs(a1) && Math.abs(a3) < 1e-3 && Math.abs(a3 / a2) <= .9) return { L: 0 };
  if (a1 < a2 && a2 < a3 && a3 > 0 && d2 >= .5 * d1) return { inf: 1, slow: 1 }; if (a1 > a2 && a2 > a3 && a3 < 0 && d2 >= .5 * d1) return { inf: -1, slow: 1 };
  return { unk: 1, at: a3 }; };
const polyLim = (f, v) => { if (f.t === '*' && f.a.t === 'n' && f.b.t === '/') { const r = polyLim(f.b, v); return r && (r.L != null ? Object.assign({}, r, { L: r.L * f.a.v }) : { inf: r.inf * Math.sign(f.a.v) }); } if (f.t !== '/') { const p = poly(f, v); if (!p) return null; let d = p.length - 1; while (d > 0 && Math.abs(p[d]) < 1e-14) d--; return d === 0 ? { L: p[0] } : { inf: Math.sign(p[d]) }; }
  const p = poly(f.a, v), q = poly(f.b, v); if (!p || !q) return null; let dp = p.length - 1, dq = q.length - 1; while (dp > 0 && Math.abs(p[dp]) < 1e-14) dp--; while (dq > 0 && Math.abs(q[dq]) < 1e-14) dq--;
  if (dp < dq) return { L: 0, exact: 1 }; if (dp === dq) return { L: p[dp] / q[dq], exact: 1 }; return { inf: Math.sign(p[dp] / q[dq]) }; };
const limHtml = (r, how) => r.L != null ? `${valS(r.L, r.exact ? 1e-10 : 1e-6)}${r.exact ? '' : ' <small class="mut">(estimado com n até 10⁹)</small>'} · <b>converge</b>`
  : r.inf ? `${r.inf > 0 ? '+∞' : '−∞'} · <b>diverge</b>${r.slow ? ' <small class="mut">(cresce devagar)</small>' : ''}` : r.osc ? `não tem limite · <b>diverge</b> <small class="mut">(${r.big ? 'oscila sem parar de crescer' : 'oscila'})</small>` : `não consegui decidir${r.at != null ? ` <small class="mut">(com n = 10⁹ vale ${fmtN(r.at)})</small>` : ''}`;

/* ================= interface (dentro do separador Cálculo da calculadora) ================= */
const DEF = { sec: 'der', f: 'x^2·sin(x)', a: '', fi: 'x·e^x', ia: '0', ib: '1', A: '2 1\n1 3', B: '5\n10', k: '2', n: '3', mop: 'det', sm: 'ger', u: '(n+1)/(2n)', n0: '1', N: '10', ur: 'u/2 + 1', u0: '1', pt: 'ari', p1: '2', pr: '3', pn: '10' };
const st = S => (S.cx = Object.assign({}, DEF, S.cx || {}));
let LAST = null;
const SYM = { x: ['x', '^', '√(', 'π', 'e', '(', ')', 'sin(', 'cos(', 'ln(', 'exp('], n: ['n', '^', '√(', '!', '(−1)^n', 'π', 'e', '(', ')', 'ln(', 'u'] };
const bar = k => `<div class="cx-sym">${SYM[k].map(s => `<button type="button" data-act="cxIns" data-v="${esc(s)}">${esc(s.length > 1 ? s.replace(/\($/, '') : s)}</button>`).join('')}</div>`;
const inp = (c, k, ph, lbl, cls = '') => `<label class="cx-f ${cls}"><span>${lbl}</span><input class="field" data-cx="${k}" value="${esc(c[k] || '')}" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`;
const err = e => `<p class="cx-err">${esc((e && e.message) || String(e))}</p>`;
const out = (S) => { const c = st(S); try { return ({ der: derOut, int: intOut, mat: matOut, seq: seqOut })[c.sec](c); } catch (e) { return err(e); } };
// derivadas
const derOut = c => { if (!String(c.f).trim()) return '<p class="mut">Escreve a função.</p>'; const f = simplify(parse(c.f, ['x'])), d1 = deriv(f, 'x'), d2 = deriv(d1, 'x');
  let at = ''; if (String(c.a).trim()) { const a = ev(simplify(parse(c.a, [])), {}); const fa = ev(f, { x: a }), m = ev(d1, { x: a }), m2 = ev(d2, { x: a });
    at = `<div class="cx-r"><span>f(${esc(fmtN(a))})</span><b>${valS(fa)}</b></div><div class="cx-r"><span>f′(${esc(fmtN(a))})</span><b>${valS(m)}</b></div><div class="cx-r"><span>f″(${esc(fmtN(a))})</span><b>${valS(m2)}</b></div>`
      + (isFinite(fa) && isFinite(m) ? `<div class="cx-r"><span>Reta tangente</span><b>y = ${esc(pretty(simplify(OP('+', OP('*', NUM(m), VAR('x')), NUM(fa - m * a)))))}</b></div>` : ''); }
  const cp = critical(f, d1, d2); return `<div class="cx-res"><div class="cx-r big"><span>f′(x)</span><b>${esc(pretty(d1))}</b></div><div class="cx-r"><span>f″(x)</span><b>${esc(pretty(d2))}</b></div>${at}</div>
    <div class="cx-sub"><b>Máximos, mínimos e pontos estacionários</b> <small class="mut">(onde f′ = 0, entre −10 e 10)</small>${cp.length ? `<ul class="cx-ul">${cp.map(p => `<li>${p.kind} em x = ${esc(nice(p.x) || fmtN(p.x))} <span class="mut">(f = ${esc(nice(p.y) || fmtN(p.y))})</span></li>`).join('')}</ul>` : '<p class="mut">Nenhum neste intervalo.</p>'}</div>
    <div class="cx-acts"><button type="button" class="chip" data-act="cxGraph" data-v="der">Ver f e f′ no gráfico</button></div>`; };
// integrais
const intOut = c => { if (!String(c.fi).trim()) return '<p class="mut">Escreve a função.</p>'; const f = simplify(parse(c.fi, ['x'])), F = primitive(f, 'x');
  let df = ''; const ta = String(c.ia).trim(), tb = String(c.ib).trim();
  if (ta && tb) { const a = limV(ta), b = limV(tb); let exact = null;
    if (F && isFinite(a) && isFinite(b)) { const g = x => { try { return ev(f, { x }); } catch (e) { return NaN; } }; let okD = true; for (let i = 0; i <= 400; i++) { if (!isFinite(g(a + (b - a) * i / 400))) { okD = false; break; } } if (okD) { const v = ev(F, { x: b }) - ev(F, { x: a }); if (isFinite(v)) exact = v; } }
    const nv = exact != null ? { v: exact, ok: true } : defInt(f, a, b, 'x'), lab = `∫ de ${esc(ta.replace(/-/g, '−').replace(/inf/i, '∞'))} a ${esc(tb.replace(/-/g, '−').replace(/inf/i, '∞'))}`;
    df = !nv.ok || !isFinite(nv.v) ? `<div class="cx-r big"><span>${lab}</span><b>diverge <small class="mut">(o integral não converge)</small></b></div>` : `<div class="cx-r big"><span>${lab}</span><b>${valS(nv.v, exact != null ? 1e-9 : 1e-7)}</b></div>${exact != null ? `<p class="mut cx-n">= F(${esc(tb)}) − F(${esc(ta)})</p>` : '<p class="mut cx-n">calculado numericamente</p>'}`; }
  return `<div class="cx-res">${F ? `<div class="cx-r big"><span>∫ f(x) dx</span><b>${esc(pretty(F))} + C</b></div>` : `<div class="cx-r"><span>∫ f(x) dx</span><b class="mut">não encontrei a primitiva exata (o integral definido calcula-se na mesma)</b></div>`}${df}</div>
    ${F ? '<div class="cx-acts"><button type="button" class="chip" data-act="cxGraph" data-v="int">Ver f e a primitiva no gráfico</button></div>' : ''}`; };
// matrizes
const MOPS = [['add', 'A + B'], ['sub', 'A − B'], ['mul', 'A · B'], ['bmul', 'B · A'], ['kA', 'k · A'], ['t', 'Aᵀ'], ['det', 'det(A)'], ['inv', 'A⁻¹'], ['rank', 'posto(A)'], ['pow', 'Aⁿ'], ['rref', 'escalonar A'], ['solve', 'resolver A·X = B'], ['eig', 'valores próprios']];
const matOut = c => { const A = readM(c.A, 'A'), needB = ['add', 'sub', 'mul', 'bmul', 'solve'].includes(c.mop), B = needB ? readM(c.B, 'B') : null, [r, cc] = dims(A);
  const box = (lbl, html) => `<div class="cx-mres"><span>${lbl}</span>${html}</div>`;
  switch (c.mop) {
    case 'add': return box('A + B =', mHtml(mAdd(A, B, 1))); case 'sub': return box('A − B =', mHtml(mAdd(A, B, -1)));
    case 'mul': return box('A · B =', mHtml(mMul(A, B))); case 'bmul': return box('B · A =', mHtml(mMul(B, A)));
    case 'kA': { const kk = decQ(String(c.k).trim()), K = kk && A.K === QF ? A : toF(A), kv = kk && A.K === QF ? kk : ev(simplify(parse(c.k, [])), {}); return box(`${esc(c.k)} · A =`, mHtml({ K: K.K, m: K.m.map(row => row.map(x => K.K.mul(kv, x))) })); }
    case 't': return box('Aᵀ =', mHtml(mT(A)));
    case 'det': { const d = det(A); return box('det(A) =', `<b class="cx-big">${esc(A.K.fmt(d))}</b>${A.K === QF && d.d !== 1n ? ` <span class="mut">≈ ${esc(fmtN(QF.num(d)))}</span>` : ''}`) + (r === cc ? `<p class="mut cx-n">${A.K.z(d) ? 'Determinante 0: A não tem inversa.' : 'Como det(A) ≠ 0, A tem inversa.'}</p>` : ''); }
    case 'inv': { const I = inv(A); return box('A⁻¹ =', mHtml(I)) + `<p class="mut cx-n">det(A) = ${esc(A.K.fmt(det(A)))}</p>`; }
    case 'rank': { const R = rref(A); return box('posto(A) =', `<b class="cx-big">${R.piv.length}</b>`) + `<p class="mut cx-n">${R.piv.length} linha${R.piv.length === 1 ? '' : 's'} não nula${R.piv.length === 1 ? '' : 's'} depois de escalonar (A é ${r}×${cc}).</p>`; }
    case 'pow': { const k = Math.round(+String(c.n).replace(',', '.')); return box(`A${sup(k)} =`, mHtml(mPow(A, k))); }
    case 'rref': return box('A escalonada (forma reduzida) =', mHtml(rref(A)));
    case 'solve': { const s = solve(A, B); if (s.kind === 'imp') return box('Sistema impossível', '<p>Não tem solução: há uma equação 0 = (número diferente de 0).</p>') + box('Matriz ampliada escalonada', mHtml(s.R));
      if (s.kind === 'uni') return box('Solução única X =', mHtml(s.X)) + (dims(B)[1] === 1 ? `<p class="cx-n">${s.X.m.map((row, i) => `x${sub(i + 1)} = ${esc(s.X.K.fmt(row[0]))}`).join(' · ')}</p>` : '');
      return box('Sistema possível e indeterminado (infinitas soluções)', s.eqs ? `<ul class="cx-ul">${s.eqs.map(e => `<li>${esc(e)}</li>`).join('')}</ul><p class="mut cx-n">${esc(s.free.join(', '))} livre${s.free.length === 1 ? '' : 's'} (qualquer número)</p>` : '') + box('Matriz ampliada escalonada', mHtml(s.R)); }
    case 'eig': { const cs = charPoly(A), cf = cs.map(x => A.K.num(x)), n = cs.length - 1; let ps = ''; for (let i = n; i >= 0; i--) { const v = cs[i]; if (A.K.z(v)) continue; const neg = A.K.gt(A.K.zero(), v), a = A.K.fmt(A.K.abs(v)); ps += (ps ? (neg ? ' − ' : ' + ') : (neg ? '−' : '')) + (i === 0 ? a : (a === '1' ? '' : a) + 'λ' + (i > 1 ? sup(i) : '')); }
      const R = croots(cf), seen = []; const lis = R.filter(z => { if (seen.some(s => Math.abs(s[0] - z[0]) < 1e-7 && Math.abs(s[1] + z[1]) < 1e-7 && z[1] < 0)) return false; seen.push(z); return true; }).map(([a, b]) => b === 0 ? `λ = ${esc(nice(a, 1e-7) || fmtN(a))}` : `λ = ${esc(fmtN(a))} ± ${esc(fmtN(Math.abs(b)))}i`);
      return box('Polinómio característico det(λI − A) =', `<p class="cx-n"><b>${esc(ps)}</b></p>`) + box('Valores próprios', `<ul class="cx-ul">${lis.map(l => `<li>${l}</li>`).join('')}</ul>`); } }
  return ''; };
// sucessões
const seqOut = c => { const n0 = Math.round(+String(c.n0).replace(',', '.')) || 0, N = Math.min(1e6, Math.max(1, Math.round(+String(c.N).replace(',', '.')) || 10));
  if (c.sm === 'pro') { const u1 = ev(simplify(parse(c.p1, [])), {}), r = ev(simplify(parse(c.pr, [])), {}), n = Math.round(+String(c.pn).replace(',', '.')); if (!(n >= 1)) throw new Error('n tem de ser um inteiro ≥ 1');
    if (c.pt === 'ari') { const un = u1 + (n - 1) * r, sn = n * (u1 + un) / 2; return `<div class="cx-res"><div class="cx-r big"><span>u${sub(n)} = u₁ + (n − 1)·r</span><b>${valS(un)}</b></div><div class="cx-r"><span>S${sub(n)} = n·(u₁ + uₙ)/2</span><b>${valS(sn)}</b></div><div class="cx-r"><span>Termo geral</span><b>uₙ = ${esc(pretty(simplify(OP('+', NUM(u1), OP('*', NUM(r), OP('-', VAR('n'), NUM(1)))))))}</b></div></div>`; }
    const un = u1 * Math.pow(r, n - 1), sn = r === 1 ? n * u1 : u1 * (1 - Math.pow(r, n)) / (1 - r);
    return `<div class="cx-res"><div class="cx-r big"><span>u${sub(n)} = u₁·q${sup('n−1')}</span><b>${valS(un)}</b></div><div class="cx-r"><span>S${sub(n)} = u₁·(1 − qⁿ)/(1 − q)</span><b>${valS(sn)}</b></div>${Math.abs(r) < 1 ? `<div class="cx-r"><span>Soma infinita u₁/(1 − q)</span><b>${valS(u1 / (1 - r))}</b></div>` : `<p class="mut cx-n">Com |q| ≥ 1 a soma de todos os termos não converge.</p>`}</div>`; }
  let g, terms = [], lim, how = '';
  if (c.sm === 'rec') { const f = simplify(parse(c.ur, ['u', 'n'])), u0 = ev(simplify(parse(c.u0, [])), {}); let u = u0, conv = null, k = n0; const seq = [u0];
    for (let i = 0; i < 200000; i++) { const nx = ev(f, { u, n: k }); k++; if (i < 2000) seq.push(nx); if (!isFinite(nx) || Math.abs(nx) > 1e15) { conv = { inf: Math.sign(nx) || 1 }; break; } if (Math.abs(nx - u) <= 1e-13 * (1 + Math.abs(nx))) { conv = { L: nx }; break; } u = nx; }
    if (!conv) { const tail = seq.slice(-200); conv = Math.max(...tail) - Math.min(...tail) > 1e-6 ? { osc: 1 } : { L: tail[tail.length - 1] }; }
    terms = seq.slice(0, 10).map((v, i) => [n0 + i, v]); lim = conv; g = null; how = 'recorrência';
    const sN = seq.slice(0, N).reduce((a, b) => a + b, 0), mono = monoOf(seq.slice(0, 200));
    return seqHtml(terms, lim, mono, N <= seq.length ? sN : null, N, `u${sub(n0)} = ${esc(fmtN(u0))}`); }
  const f = simplify(parse(c.u, ['n'])); g = n => ev(f, { n }); terms = Array.from({ length: 10 }, (_, i) => [n0 + i, g(n0 + i)]);
  lim = polyLim(f, 'n') || seqLim(g); let sN = 0; for (let i = 0; i < N; i++) sN += g(n0 + i); const vals = Array.from({ length: 300 }, (_, i) => g(n0 + i));
  return seqHtml(terms, lim, monoOf(vals), sN, N, `uₙ = ${esc(pretty(f))}`); };
const monoOf = L => { const v = L.filter(isFinite); if (v.length < 3) return ''; let up = true, dn = true, k0 = 0; for (let i = 1; i < v.length; i++) { if (v[i] < v[i - 1] - 1e-12) up = false; if (v[i] > v[i - 1] + 1e-12) dn = false; }
  if (up && dn) return 'constante'; if (up) return 'crescente'; if (dn) return 'decrescente';
  for (k0 = v.length - 2; k0 > 0; k0--) { if (Math.sign(v[k0 + 1] - v[k0]) !== Math.sign(v[v.length - 1] - v[v.length - 2])) break; } return k0 < v.length / 2 && k0 > 0 ? `${v[v.length - 1] > v[v.length - 2] ? 'crescente' : 'decrescente'} a partir do ${k0 + 2}.º termo` : 'não é monótona'; };
const seqHtml = (terms, lim, mono, sN, N, head) => `<div class="cx-res"><p class="cx-n mut">${head}</p>
  <div class="cx-terms">${terms.map(([n, v]) => `<span><small>u${sub(n)}</small><b>${esc(isFinite(v) ? numS(v) : fmtN(v))}</b></span>`).join('')}</div>
  <div class="cx-r big"><span>lim uₙ</span><b>${limHtml(lim)}</b></div>${mono ? `<div class="cx-r"><span>Monotonia</span><b>${esc(mono)}</b> <small class="mut">(pelos primeiros termos)</small></div>` : ''}
  ${sN != null ? `<div class="cx-r"><span>Soma dos ${N} primeiros termos</span><b>${valS(sN)}</b></div>` : ''}${lim && (lim.L != null || lim.osc && !lim.big) ? '<p class="mut cx-n">Converge ou oscila entre valores finitos: é limitada.</p>' : ''}</div>`;
const SECS = [['der', 'Derivadas'], ['int', 'Integrais'], ['mat', 'Matrizes'], ['seq', 'Sucessões']];
CX.view = S => { const c = st(S);
  const body = c.sec === 'der' ? `${inp(c, 'f', 'ex.: x^2·sin(x)', 'f(x) =')}${inp(c, 'a', 'opcional, ex.: 1 ou pi/2', 'em x =', 'sm')}${bar('x')}`
    : c.sec === 'int' ? `${inp(c, 'fi', 'ex.: x·e^x', 'f(x) =')}<div class="cx-2">${inp(c, 'ia', 'ex.: 0 ou -inf', 'de', 'sm')}${inp(c, 'ib', 'ex.: 1 ou inf', 'a', 'sm')}</div>${bar('x')}`
    : c.sec === 'mat' ? `<div class="cx-mats"><label><span>A</span><textarea class="field" data-cx="A" rows="3" spellcheck="false" placeholder="1 2&#10;3 4">${esc(c.A)}</textarea></label><label><span>B</span><textarea class="field" data-cx="B" rows="3" spellcheck="false" placeholder="5&#10;6">${esc(c.B)}</textarea></label></div>
        <div class="cx-2">${inp(c, 'k', '2', 'k =', 'sm')}${inp(c, 'n', '3', 'n =', 'sm')}</div><div class="cx-ops">${MOPS.map(([k, l]) => `<button type="button" class="chip ${c.mop === k ? 'on' : ''}" data-act="cxMop" data-v="${k}">${l}</button>`).join('')}</div>
        <p class="mut cx-n">Uma linha por linha, números separados por espaços (frações como 1/2; decimais com vírgula).</p>`
    : `<div class="cx-seg">${[['ger', 'Termo geral'], ['rec', 'Recorrência'], ['pro', 'Progressões']].map(([k, l]) => `<button type="button" class="${c.sm === k ? 'on' : ''}" data-act="cxSm" data-v="${k}">${l}</button>`).join('')}</div>
        ${c.sm === 'ger' ? `${inp(c, 'u', 'ex.: (n+1)/(2n) ou (1+1/n)^n', 'uₙ =')}<div class="cx-2">${inp(c, 'n0', '1', 'a partir de n =', 'sm')}${inp(c, 'N', '10', 'somar os primeiros', 'sm')}</div>${bar('n')}`
          : c.sm === 'rec' ? `${inp(c, 'ur', 'ex.: u/2 + 1 (u é o termo anterior)', 'uₙ₊₁ =')}<div class="cx-2">${inp(c, 'u0', '1', 'primeiro termo', 'sm')}${inp(c, 'n0', '1', 'índice do 1.º', 'sm')}</div>${inp(c, 'N', '10', 'somar os primeiros', 'sm')}${bar('n')}`
          : `<div class="cx-seg sm">${[['ari', 'Aritmética'], ['geo', 'Geométrica']].map(([k, l]) => `<button type="button" class="${c.pt === k ? 'on' : ''}" data-act="cxPt" data-v="${k}">${l}</button>`).join('')}</div><div class="cx-2">${inp(c, 'p1', '2', 'u₁ =', 'sm')}${inp(c, 'pr', '3', c.pt === 'ari' ? 'razão r =' : 'razão q =', 'sm')}</div>${inp(c, 'pn', '10', 'n =', 'sm')}`}`;
  return `<div class="cx"><div class="cx-seg main" role="tablist">${SECS.map(([k, l]) => `<button type="button" role="tab" class="${c.sec === k ? 'on' : ''}" data-act="cxSec" data-v="${k}">${l}</button>`).join('')}</div>${body}<div id="cxOut" aria-live="polite">${out(S)}</div>
    <p class="mut cx-n">Trigonometria em radianos. Escreve como no papel: 2x, x^3, √(x), e^(2x), sin(x)^2, ln(x), |x|, n!.</p></div>`; };
let T0 = 0;
CX.input = (t, S, save) => { const c = st(S); c[t.dataset.cx] = t.value; clearTimeout(T0); T0 = setTimeout(() => { const o = document.getElementById('cxOut'); if (o) o.innerHTML = out(S); save && save(); }, 220); };
CX.act = (t, S, h) => { const c = st(S), a = t.dataset.act, v = t.dataset.v;
  if (a === 'cxSec') { c.sec = v; return h.paint(); } if (a === 'cxSm') { c.sm = v; return h.paint(); } if (a === 'cxPt') { c.pt = v; return h.paint(); } if (a === 'cxMop') { c.mop = v; return h.paint(); }
  if (a === 'cxIns') { const el = LAST && document.body.contains(LAST) ? LAST : document.querySelector('#calc [data-cx]'); if (!el) return; const s0 = el.selectionStart != null ? el.selectionStart : el.value.length, s1 = el.selectionEnd != null ? el.selectionEnd : s0;
    el.value = el.value.slice(0, s0) + v + el.value.slice(s1); const p = s0 + v.length; el.focus(); try { el.setSelectionRange(p, p); } catch (e) { } CX.input(el, S, h.save); return; }
  if (a === 'cxGraph') { try { if (v === 'der') { const f = simplify(parse(c.f, ['x'])); h.graph([plain(toG(f)), plain(toG(deriv(f, 'x'))), '']); } else { const f = simplify(parse(c.fi, ['x'])), F = primitive(f, 'x'); h.graph([plain(toG(f)), F ? plain(toG(F)) : '', '']); } } catch (e) { } } };
document.addEventListener('focusin', e => { const t = e.target; if (t && t.dataset && t.dataset.cx != null && t.closest('#calc')) LAST = t; });
Object.assign(CX, { parse, simplify, deriv, primitive, ev, pretty, plain, defInt, limV, nice, readM, det, inv, rref, mMul, mPow, solve, charPoly, croots, seqLim, polyLim, critical, QF, FF });
})();
