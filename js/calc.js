/* PRUMO — Calculadora flutuante (v3.12): um botão sempre à mão, em todo o app, que abre uma calculadora com quatro modos (o Cálculo vem de js/calcx.js, v3.15).
   · Básica e científica: escreves a conta como no papel (parênteses, potências, raízes, trigonometria, ln, log, π, e), com histórico.
   · Financeira (RPN, como a HP 12C): pilha X Y Z T com ENTER, n · i · PV · PMT · FV (guardar ao introduzir um número, calcular ao tocar
     sem número novo), BEG/END, 12× e 12÷, %, Δ%, yˣ, 1/x, √x, x↔y, R↓, CHS, LSTx, fluxos de caixa (CF0, CFj, Nj) com NPV e IRR,
     e uma tabela de amortização (prestações iguais e amortização constante).
   · Gráfica: até 3 funções de x no mesmo gráfico, com zoom, arrastar para mover e tocar para ler os valores.
   O estado fica guardado neste aparelho. Atalhos de teclado quando a calculadora está aberta. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, esc = U.esc;
const LS = 'oc_calc';
const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } };
const S = Object.assign({ mode: 'fin', expr: '', hist: [], deg: true, ans: 0, st: [0, 0, 0, 0], ent: false, lift: true, lastx: 0, reg: { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }, beg: false, cf: [], fn: ['sin(x)', 'x^2/4-2', ''], view: null, pos: null }, load());
let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { const o = Object.assign({}, S); delete o.err; localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { } }, 250); };
const fmt = (v, dp) => { if (!isFinite(v)) return 'Erro'; const a = Math.abs(v); if (a !== 0 && (a >= 1e12 || a < 1e-9)) return v.toExponential(6).replace('.', ','); const d = dp != null ? dp : Math.min(10, Math.max(0, 10 - String(Math.floor(a)).length)); let s = (+v.toFixed(d)).toLocaleString('pt-PT', { maximumFractionDigits: d }); return s === '-0' ? '0' : s; };

/* ================= expressões (sem eval): números, x, constantes, funções, ^, %, multiplicação implícita ================= */
const FN = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, sqrt: 1, '√': 1, ln: 1, log: 1, abs: 1, exp: 1 };
const tok = s => { const T = [], src = String(s).replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi'); let i = 0;
  while (i < src.length) { const c = src[i];
    if (/[0-9.,]/.test(c)) { let j = i; while (j < src.length && /[0-9.,]/.test(src[j])) j++; let num = src.slice(i, j).replace(',', '.'); if (/e[+-]?\d/i.test(src.slice(j, j + 3)) && /^\d/.test(num.slice(-1))) { const m = src.slice(j).match(/^e[+-]?\d+/i); if (m) { num += m[0]; j += m[0].length; } } if (isNaN(+num)) throw new Error('Número inválido'); T.push({ t: 'n', v: +num }); i = j; continue; }
    if (/[a-z√]/i.test(c)) { let j = i; if (c === '√') j++; else while (j < src.length && /[a-z]/i.test(src[j])) j++; const w = src.slice(i, j).toLowerCase();
      if (w === 'pi') T.push({ t: 'n', v: Math.PI }); else if (w === 'e') T.push({ t: 'n', v: Math.E }); else if (w === 'x') T.push({ t: 'x' }); else if (w === 'ans') T.push({ t: 'n', v: S.ans }); else if (FN[w]) T.push({ t: 'f', v: w === '√' ? 'sqrt' : w });
      else { // "xsin" ou "2x": parte letra a letra
        if (/^x/.test(w) && w.length > 1) { T.push({ t: 'x' }); i += 1; continue; } throw new Error('Não conheço "' + w + '"'); }
      i = j; continue; }
    if ('+-*/^()%!'.includes(c)) { T.push({ t: 'o', v: c }); i++; continue; }
    throw new Error('Símbolo inválido: ' + c); }
  // multiplicação implícita: 2x, 2(…), )(, x(…), 2sin(…), )x
  const O = []; T.forEach((t, k) => { const p = O[O.length - 1]; if (p && (p.t === 'n' || p.t === 'x' || (p.t === 'o' && (p.v === ')' || p.v === '%' || p.v === '!'))) && (t.t === 'n' || t.t === 'x' || t.t === 'f' || (t.t === 'o' && t.v === '('))) O.push({ t: 'o', v: '*' }); O.push(t); }); return O; };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4, 'u': 3 };
const compile = s => { const T = tok(s), out = [], ops = []; let prev = null;
  T.forEach(t => {
    if (t.t === 'n' || t.t === 'x') out.push(t);
    else if (t.t === 'f') ops.push(t);
    else if (t.v === '(') ops.push(t);
    else if (t.v === ')') { while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop()); if (!ops.length) throw new Error('Parênteses a mais'); ops.pop(); if (ops.length && ops[ops.length - 1].t === 'f') out.push(ops.pop()); }
    else if (t.v === '%' || t.v === '!') out.push({ t: 'p', v: t.v });
    else { let v = t.v; if ((v === '-' || v === '+') && (!prev || (prev.t === 'o' && !(prev.v === ')' || prev.v === '%' || prev.v === '!')) || prev.t === 'f')) { if (v === '+') { prev = t; return; } v = 'u'; }
      if (v !== 'u') while (ops.length) { const o = ops[ops.length - 1]; if (o.t === 'f') { out.push(ops.pop()); continue; } if (o.v === '(') break; const p1 = PREC[v], p2 = PREC[o.v]; if (p2 > p1 || (p2 === p1 && v !== '^')) out.push(ops.pop()); else break; }
      ops.push({ t: 'o', v }); }
    prev = t; });
  while (ops.length) { const o = ops.pop(); if (o.v === '(') throw new Error('Falta fechar um parêntese'); out.push(o); }
  return (x, deg) => { const st = []; const k = deg ? Math.PI / 180 : 1;
    for (const t of out) { if (t.t === 'n') st.push(t.v); else if (t.t === 'x') st.push(x); else if (t.t === 'p') { const a = st.pop(); if (a === undefined) throw new Error('Conta incompleta'); st.push(t.v === '%' ? a / 100 : fact(a)); }
      else if (t.t === 'f') { const a = st.pop(); if (a === undefined) throw new Error('Conta incompleta'); st.push({ sin: Math.sin(a * k), cos: Math.cos(a * k), tan: Math.tan(a * k), asin: Math.asin(a) / k, acos: Math.acos(a) / k, atan: Math.atan(a) / k, sqrt: Math.sqrt(a), ln: Math.log(a), log: Math.log10(a), abs: Math.abs(a), exp: Math.exp(a) }[t.v]); }
      else if (t.v === 'u') { const a = st.pop(); if (a === undefined) throw new Error('Conta incompleta'); st.push(-a); }
      else { const b = st.pop(), a = st.pop(); if (a === undefined || b === undefined) throw new Error('Conta incompleta'); st.push(t.v === '+' ? a + b : t.v === '-' ? a - b : t.v === '*' ? a * b : t.v === '/' ? a / b : Math.pow(a, b)); } }
    if (st.length !== 1) throw new Error('Conta incompleta'); return st[0]; }; };
const fact = n => { if (n < 0 || n !== Math.floor(n) || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const evalExpr = (s, deg = S.deg) => compile(s)(0, deg);

/* ================= financeira (RPN, como a HP 12C) ================= */
const X = () => S.st[0];
const setX = v => { S.st[0] = v; };
const push = v => { S.st = [v, S.st[0], S.st[1], S.st[2]]; };
let buf = null; // número a ser escrito
const endEntry = () => { if (buf != null) { setX(parseNum(buf)); buf = null; } };
const parseNum = b => { const v = +String(b).replace(',', '.'); return isFinite(v) ? v : 0; };
const digit = d => { if (buf == null) { if (S.lift) push(0); S.lift = true; buf = ''; } if (d === ',' && buf.includes(',')) return; if (buf.replace(/[-,]/g, '').length >= 12) return; buf = (buf === '' && d === ',') ? '0,' : buf + d; setX(parseNum(buf)); S.lastTVM = false; };
const binop = f => { endEntry(); const x = X(), y = S.st[1]; S.lastx = x; S.st = [f(y, x), S.st[2], S.st[3], S.st[3]]; S.lift = true; S.lastTVM = false; };
const unop = (f, keepY) => { endEntry(); S.lastx = X(); setX(f(X(), S.st[1])); S.lift = true; S.lastTVM = false; };
// TVM: PV·(1+r)^n + PMT·(1+r·b)·((1+r)^n − 1)/r + FV = 0
const tvm = (k, R) => { const n = R.n, r = R.i / 100, pv = R.PV, pmt = R.PMT, fv = R.FV, b = S.beg ? 1 : 0;
  const f = rr => { if (Math.abs(rr) < 1e-12) return pv + pmt * n + fv; const q = Math.pow(1 + rr, n); return pv * q + pmt * (1 + rr * b) * (q - 1) / rr + fv; };
  if (k === 'FV') { if (Math.abs(r) < 1e-12) return -(pv + pmt * n); const q = Math.pow(1 + r, n); return -(pv * q + pmt * (1 + r * b) * (q - 1) / r); }
  if (k === 'PV') { if (Math.abs(r) < 1e-12) return -(fv + pmt * n); const q = Math.pow(1 + r, n); return -(fv + pmt * (1 + r * b) * (q - 1) / r) / q; }
  if (k === 'PMT') { if (Math.abs(r) < 1e-12) return n ? -(pv + fv) / n : NaN; const q = Math.pow(1 + r, n); return -(pv * q + fv) * r / ((1 + r * b) * (q - 1)); }
  if (k === 'n') { if (Math.abs(r) < 1e-12) return pmt ? -(pv + fv) / pmt : NaN; const a = pmt * (1 + r * b), v = Math.log((a - fv * r) / (a + pv * r)) / Math.log(1 + r); return isFinite(v) ? Math.ceil(v - 1e-9) : NaN; }
  if (k === 'i') { // procura numérica (Newton com recurso à bissecção)
    let lo = -0.9999, flo = f(lo), hi = [.05, .2, .5, 1, 3, 10].find(h => { const v = f(h); return isFinite(v) && isFinite(flo) && v * flo <= 0; }) || 10, fhi = f(hi); if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) { let x = .01; for (let it = 0; it < 100; it++) { const fx = f(x), d = (f(x + 1e-7) - fx) / 1e-7; if (!d) break; const nx = x - fx / d; if (!isFinite(nx)) break; if (Math.abs(nx - x) < 1e-12) return nx * 100; x = nx; } return NaN; }
    for (let it = 0; it < 200; it++) { const m = (lo + hi) / 2, fm = f(m); if (Math.abs(fm) < 1e-10 || hi - lo < 1e-13) return m * 100; if (flo * fm < 0) { hi = m; fhi = fm; } else { lo = m; flo = fm; } } return (lo + hi) / 2 * 100; }
  return NaN; };
const npv = (cf, i) => { const r = i / 100; let t = 0, k = 0; cf.forEach(([v, nj]) => { for (let j = 0; j < (nj || 1); j++) { t += v / Math.pow(1 + r, k); k++; } }); return t; };
const irr = cf => { const f = r => npv(cf, r * 100); let lo = -0.99, hi = 10, flo = f(lo), fhi = f(hi); if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return NaN; for (let it = 0; it < 300; it++) { const m = (lo + hi) / 2, fm = f(m); if (Math.abs(fm) < 1e-9 || hi - lo < 1e-14) return m * 100; if (flo * fm < 0) { hi = m; } else { lo = m; flo = fm; } } return (lo + hi) / 2 * 100; };
const finKey = k => { S.err = '';
  if (/^[0-9,]$/.test(k)) return digit(k);
  if (k === 'back') { if (buf != null) { buf = buf.slice(0, -1); if (buf === '' || buf === '-') { buf = null; setX(0); S.lift = false; } else setX(parseNum(buf)); } else { setX(0); S.lift = false; } return; }
  if (k === 'chs') { if (buf != null) { buf = buf.startsWith('-') ? buf.slice(1) : '-' + buf; setX(parseNum(buf)); } else setX(-X()); return; }
  if (k === 'enter') { endEntry(); push(X()); S.lift = false; S.lastTVM = false; return; }
  if (k === 'clx') { buf = null; setX(0); S.lift = false; S.lastTVM = false; return; }
  if (k === 'clfin') { S.reg = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }; S.cf = []; S.lastTVM = false; toast('Registos financeiros limpos'); return; }
  if (k === 'clall') { buf = null; S.st = [0, 0, 0, 0]; S.reg = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }; S.cf = []; S.lastTVM = false; S.lift = false; return; }
  if (k === 'swap') { endEntry(); S.st = [S.st[1], S.st[0], S.st[2], S.st[3]]; S.lift = true; S.lastTVM = false; return; }
  if (k === 'rdn') { endEntry(); S.st = [S.st[1], S.st[2], S.st[3], S.st[0]]; S.lift = true; S.lastTVM = false; return; }
  if (k === 'lstx') { endEntry(); push(S.lastx); S.lift = true; return; }
  if (k === '+') return binop((y, x) => y + x); if (k === '-') return binop((y, x) => y - x); if (k === '*') return binop((y, x) => y * x); if (k === '/') return binop((y, x) => y / x);
  if (k === 'pow') return binop((y, x) => Math.pow(y, x));
  if (k === 'pct') { endEntry(); S.lastx = X(); setX(S.st[1] * X() / 100); S.lift = true; S.lastTVM = false; return; } // % de Y (Y fica)
  if (k === 'dpct') { endEntry(); S.lastx = X(); setX((X() - S.st[1]) / S.st[1] * 100); S.lift = true; S.lastTVM = false; return; } // Δ% de Y para X
  if (k === 'inv') return unop(x => 1 / x); if (k === 'sqrt') return unop(x => Math.sqrt(x)); if (k === 'ln') return unop(x => Math.log(x)); if (k === 'ex') return unop(x => Math.exp(x));
  if (k === '12x') { endEntry(); S.reg.n = X() * 12; setX(S.reg.n); S.lift = true; S.lastTVM = true; toast('n = ' + fmt(S.reg.n)); return; }
  if (k === '12d') { endEntry(); S.reg.i = X() / 12; setX(S.reg.i); S.lift = true; S.lastTVM = true; toast('i = ' + fmt(S.reg.i) + '% por mês'); return; }
  if (k === 'beg') { S.beg = !S.beg; toast(S.beg ? 'BEG: pagamentos no início de cada período' : 'END: pagamentos no fim de cada período'); return; }
  if (['n', 'i', 'PV', 'PMT', 'FV'].includes(k)) { const typed = buf != null; endEntry();
    if (typed || !S.lastTVM) { S.reg[k] = X(); S.lift = true; S.lastTVM = true; return; }
    const v = tvm(k, S.reg); if (!isFinite(v)) { S.err = 'Sem solução com estes valores (vê os sinais: o dinheiro que sai é negativo)'; S.lastTVM = true; return; } S.reg[k] = v; push(v); S.lift = true; S.lastTVM = true; return; }
  if (k === 'cf0') { endEntry(); S.cf = [[X(), 1]]; S.lift = true; S.lastTVM = false; toast('CF0 = ' + fmt(X())); return; }
  if (k === 'cfj') { endEntry(); if (!S.cf.length) S.cf = [[0, 1]]; S.cf.push([X(), 1]); S.lift = true; S.lastTVM = false; toast('CF' + (S.cf.length - 1) + ' = ' + fmt(X())); return; }
  if (k === 'nj') { endEntry(); if (S.cf.length > 1) { S.cf[S.cf.length - 1][1] = Math.max(1, Math.round(X())); toast('Repete ' + S.cf[S.cf.length - 1][1] + ' vezes'); } S.lift = true; return; }
  if (k === 'npv') { endEntry(); if (!S.cf.length) { S.err = 'Primeiro os fluxos: CF0, CFj (e Nj)'; return; } const v = npv(S.cf, S.reg.i); push(v); S.lift = true; S.lastTVM = false; return; }
  if (k === 'irr') { endEntry(); if (S.cf.length < 2) { S.err = 'Primeiro os fluxos: CF0, CFj (e Nj)'; return; } const v = irr(S.cf); if (!isFinite(v)) { S.err = 'Sem TIR com estes fluxos'; return; } S.reg.i = v; push(v); S.lift = true; S.lastTVM = false; return; } };
let toastT = 0, TOAST = '';
const toast = t => { TOAST = t; clearTimeout(toastT); toastT = setTimeout(() => { TOAST = ''; paint(); }, 2200); };

/* ================= tabela de amortização ================= */
const amort = (P, ia, n, kind) => { const r = ia / 100 / 12, rows = []; let bal = P; const pmt = kind === 'sac' ? null : (r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n);
  for (let k = 1; k <= n && bal > 1e-9; k++) { const j = bal * r, am = kind === 'sac' ? P / n : pmt - j, p = kind === 'sac' ? am + j : pmt; bal = Math.max(0, bal - am); rows.push([k, p, j, am, bal]); } return rows; };

/* ================= gráfica ================= */
const COL = ['#38BDF8', '#F2B544', '#F472B6'];
let G = null;
const gview = () => S.view || (S.view = { cx: 0, cy: 0, sc: 30 });
const drawGraph = () => { const cv = document.getElementById('clCv'); if (!cv) return; const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = r.width, H = r.height, v = gview(), toPx = (x, y) => [W / 2 + (x - v.cx) * v.sc, H / 2 - (y - v.cy) * v.sc], x0 = v.cx - W / 2 / v.sc, x1 = v.cx + W / 2 / v.sc;
  c.fillStyle = '#081420'; c.fillRect(0, 0, W, H);
  const step = (() => { const raw = 60 / v.sc, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 2 ? 1 : m < 5 ? 2 : 5) * p; })();
  c.lineWidth = 1; c.strokeStyle = 'rgba(140,190,230,.10)'; c.fillStyle = 'rgba(180,210,235,.55)'; c.font = '10px ui-monospace,monospace';
  for (let gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) { const [px] = toPx(gx, 0); c.beginPath(); c.moveTo(px, 0); c.lineTo(px, H); c.stroke(); if (Math.abs(gx) > step / 2) c.fillText(+gx.toPrecision(6) + '', px + 2, Math.min(H - 4, Math.max(10, toPx(0, 0)[1] + 12))); }
  const y0 = v.cy - H / 2 / v.sc, y1 = v.cy + H / 2 / v.sc; for (let gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) { const [, py] = toPx(0, gy); c.beginPath(); c.moveTo(0, py); c.lineTo(W, py); c.stroke(); if (Math.abs(gy) > step / 2) c.fillText(+gy.toPrecision(6) + '', Math.min(W - 30, Math.max(2, toPx(0, 0)[0] + 4)), py - 2); }
  c.strokeStyle = 'rgba(200,225,245,.55)'; c.lineWidth = 1.2; const [ax, ay] = toPx(0, 0); c.beginPath(); c.moveTo(0, ay); c.lineTo(W, ay); c.moveTo(ax, 0); c.lineTo(ax, H); c.stroke();
  G = { fns: [], toPx, v, W, H };
  S.fn.forEach((s, k) => { if (!s || !s.trim()) return; let f; try { f = compile(s); f(1, false); } catch (e) { return; } G.fns.push([k, f]); c.strokeStyle = COL[k]; c.lineWidth = 2; c.beginPath(); let pen = false, py0 = null;
    for (let px = 0; px <= W; px += 1) { const x = v.cx + (px - W / 2) / v.sc; let y; try { y = f(x, false); } catch (e) { y = NaN; } const py = H / 2 - (y - v.cy) * v.sc;
      if (!isFinite(py) || Math.abs(py) > H * 20 || (py0 != null && Math.abs(py - py0) > H * 2)) { pen = false; py0 = isFinite(py) ? py : null; continue; } if (!pen) { c.moveTo(px, py); pen = true; } else c.lineTo(px, py); py0 = py; }
    c.stroke(); });
  if (S.tr != null) { const x = S.tr, [px] = toPx(x, 0); c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(px, 0); c.lineTo(px, H); c.stroke(); c.setLineDash([]);
    G.fns.forEach(([k, f]) => { let y; try { y = f(x, false); } catch (e) { y = NaN; } if (!isFinite(y)) return; const [, py] = toPx(x, y); c.fillStyle = COL[k]; c.beginPath(); c.arc(px, py, 4, 0, 7); c.fill(); }); }
  const out = document.getElementById('clTr'); if (out) out.innerHTML = S.tr == null ? '<span class="mut">Toca no gráfico para leres os valores.</span>' : `x = <b>${fmt(S.tr, 4)}</b>` + G.fns.map(([k, f]) => { let y; try { y = f(S.tr, false); } catch (e) { y = NaN; } return ` · <span style="color:${COL[k]}">${'fgh'[k]}(x) = <b>${isFinite(y) ? fmt(y, 4) : '—'}</b></span>`; }).join(''); };

/* ================= interface ================= */
let el = null, fab = null;
const KB = [[['(', '('], [')', ')'], ['%', '%'], ['⌫', 'back', 'op'], ['C', 'clear', 'op']], [['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['π', 'π'], ['e', 'e']], [['ln', 'ln('], ['log', 'log('], ['√', '√('], ['x²', '^2'], ['xʸ', '^']],
  [['7', '7'], ['8', '8'], ['9', '9'], ['÷', '÷', 'op'], ['n!', '!']], [['4', '4'], ['5', '5'], ['6', '6'], ['×', '×', 'op'], ['ANS', 'ans']], [['1', '1'], ['2', '2'], ['3', '3'], ['−', '-', 'op'], ['1/x', '1/(']], [['0', '0'], [',', ','], ['=', 'eq', 'eq'], ['+', '+', 'op'], ['±', '(-']]];
const KF = [[['n', 'n', 'tvm'], ['i', 'i', 'tvm'], ['PV', 'PV', 'tvm'], ['PMT', 'PMT', 'tvm'], ['FV', 'FV', 'tvm']], [['12×', '12x', 'f'], ['12÷', '12d', 'f'], ['BEG/END', 'beg', 'f'], ['CF₀', 'cf0', 'f'], ['CFⱼ', 'cfj', 'f']],
  [['Nⱼ', 'nj', 'f'], ['NPV', 'npv', 'f'], ['IRR', 'irr', 'f'], ['%', 'pct'], ['Δ%', 'dpct']], [['yˣ', 'pow'], ['1/x', 'inv'], ['√x', 'sqrt'], ['x↔y', 'swap'], ['R↓', 'rdn']], [['7', '7', 'd'], ['8', '8', 'd'], ['9', '9', 'd'], ['÷', '/', 'op'], ['⌫', 'back', 'op']],
  [['4', '4', 'd'], ['5', '5', 'd'], ['6', '6', 'd'], ['×', '*', 'op'], ['CHS', 'chs']], [['1', '1', 'd'], ['2', '2', 'd'], ['3', '3', 'd'], ['−', '-', 'op'], ['CLx', 'clx']], [['0', '0', 'd'], [',', ',', 'd'], ['ENTER', 'enter', 'ent'], ['+', '+', 'op'], ['LSTx', 'lstx']]];
const keys = (L, act) => `<div class="cl-keys">${L.map(r => r.map(([l, k, c]) => `<button type="button" class="cl-k ${c || ''}" data-act="${act}" data-k="${esc(k)}">${esc(l)}</button>`).join('')).join('')}</div>`;
const basic = () => { let res = ''; if (S.expr.trim()) { try { const v = evalExpr(S.expr); res = '= ' + fmt(v); } catch (e) { res = ''; } }
  return `<div class="cl-disp b"><div class="cl-hist">${S.hist.slice(-3).map(h => `<button type="button" data-act="clHist" data-v="${esc(h[0])}"><span>${esc(h[0])}</span><b>= ${esc(fmt(h[1]))}</b></button>`).join('')}</div>
    <input class="cl-in" id="clIn" value="${esc(S.expr)}" placeholder="0" inputmode="none" autocomplete="off" aria-label="Conta"><div class="cl-res">${S.err ? `<span class="neg">${esc(S.err)}</span>` : esc(res)}</div></div>
    <div class="cl-row"><button type="button" class="chip ${S.deg ? 'on' : ''}" data-act="clDeg">${S.deg ? 'Graus' : 'Radianos'}</button><small class="mut">Escreve ou toca. Ex.: 2(3+4)^2, √(16)+sin(30)</small></div>${keys(KB, 'clB')}`; };
const fin = () => { const R = S.reg, xs = buf != null ? (buf || '0') : fmt(X());
  return `<div class="cl-disp f"><div class="cl-stk"><span>T <b>${fmt(S.st[3])}</b></span><span>Z <b>${fmt(S.st[2])}</b></span><span>Y <b>${fmt(S.st[1])}</b></span></div><div class="cl-x mono" aria-live="polite">${esc(xs)}</div>
      <div class="cl-st"><span class="${S.beg ? 'on' : ''}">${S.beg ? 'BEG' : 'END'}</span>${S.cf.length ? `<span>${S.cf.length} fluxos</span>` : ''}${TOAST ? `<span class="t">${esc(TOAST)}</span>` : ''}${S.err ? `<span class="neg">${esc(S.err)}</span>` : ''}</div></div>
    <div class="cl-regs">${['n', 'i', 'PV', 'PMT', 'FV'].map(k => `<span><small>${k}</small><b class="mono">${fmt(R[k], k === 'i' ? 4 : 2)}</b></span>`).join('')}</div>
    ${keys(KF, 'clF')}
    <div class="cl-row"><button type="button" class="chip" data-act="clF" data-k="clfin">Limpar fin.</button><button type="button" class="chip" data-act="clF" data-k="clall">Limpar tudo</button><button type="button" class="chip" data-act="clAm">Tabela de amortização</button><button type="button" class="chip" data-act="clHelp">Como usar</button></div>
    ${S.help ? `<div class="cl-help"><p><b>RPN:</b> escreve o primeiro número, <b>ENTER</b>, o segundo e a operação (ex.: 5 ENTER 3 + = 8).</p><p><b>Juros compostos e prestações:</b> introduz 4 dos 5 valores (escreve o número e toca na tecla: n, i, PV, PMT, FV) e toca na tecla que falta, sem escrever nada, para a calcular. O dinheiro que sai do teu bolso é negativo (CHS).</p>
      <p><b>Exemplo:</b> empréstimo de 10 000 a 5% ao ano em 48 meses: 10000 PV · 5 12÷ · 48 n · 0 FV · <b>PMT</b> = −230,29 por mês.</p><p><b>Fluxos:</b> −1000 CF₀ · 300 CFⱼ · 4 Nⱼ · 10 i · <b>NPV</b>; ou <b>IRR</b> para a taxa interna de rentabilidade.</p></div>` : ''}
    ${S.am ? amBox() : ''}`; };
const amBox = () => { const a = S.amv || { p: S.reg.PV ? Math.abs(S.reg.PV) : 10000, i: S.reg.i ? S.reg.i * (S.reg.n > 60 || S.reg.i < 2 ? 12 : 1) : 5, n: S.reg.n || 48, k: 'price' }, rows = amort(+a.p, +a.i, Math.min(600, Math.max(1, Math.round(+a.n))), a.k), tj = rows.reduce((s, r) => s + r[2], 0);
  return `<div class="cl-am"><div class="cl-amf"><label>Valor<input class="field" type="number" value="${a.p}" data-am="p"></label><label>Juro anual %<input class="field" type="number" step="0.01" value="${a.i}" data-am="i"></label><label>Meses<input class="field" type="number" value="${a.n}" data-am="n"></label><label>Sistema<select class="field" data-am="k"><option value="price"${a.k === 'price' ? ' selected' : ''}>Prestações iguais (Price/francês)</option><option value="sac"${a.k === 'sac' ? ' selected' : ''}>Amortização constante (SAC)</option></select></label></div>
    <p class="mut">${rows.length ? `1.ª prestação ${fmt(rows[0][1], 2)} · total de juros ${fmt(tj, 2)} · total pago ${fmt(+a.p + tj, 2)}` : ''}</p>
    <div class="cl-amt"><table><thead><tr><th>Mês</th><th>Prestação</th><th>Juros</th><th>Amortização</th><th>Em dívida</th></tr></thead><tbody>${rows.slice(0, 360).map(r => `<tr><td>${r[0]}</td><td>${fmt(r[1], 2)}</td><td>${fmt(r[2], 2)}</td><td>${fmt(r[3], 2)}</td><td>${fmt(r[4], 2)}</td></tr>`).join('')}</tbody></table></div></div>`; };
const graph = () => `<div class="cl-fns">${[0, 1, 2].map(k => `<label style="--c:${COL[k]}"><span>${'fgh'[k]}(x) =</span><input class="field cl-fn" data-k="${k}" value="${esc(S.fn[k] || '')}" placeholder="${['ex.: sin(x)', 'ex.: x^2-4', 'ex.: 2x+1'][k]}" autocomplete="off" spellcheck="false"></label>`).join('')}</div>
  <div class="cl-gw"><canvas id="clCv" aria-label="Gráfico das funções"></canvas><div class="cl-gz"><button type="button" data-act="clZ" data-v="1.5" aria-label="Aproximar">+</button><button type="button" data-act="clZ" data-v="0.667" aria-label="Afastar">−</button><button type="button" data-act="clZ" data-v="0" aria-label="Repor">⟲</button></div></div>
  <div class="cl-tr" id="clTr"></div><p class="mut cl-gn">Usa x como variável: sin, cos, tan (em radianos), sqrt, ln, log, abs, exp, ^, π, e. Arrasta para mover; + e − para o zoom.</p>`;
const paint = () => { if (!el || el.hidden) return; const b = el.querySelector('.cl-body'); if (!b) return;
  const fo = document.activeElement && el.contains(document.activeElement) ? { id: document.activeElement.id, k: document.activeElement.dataset && document.activeElement.dataset.k, cx: document.activeElement.dataset && document.activeElement.dataset.cx, s: document.activeElement.selectionStart } : null;
  if (S.mode === 'gra' && b.dataset.m === 'gra') { drawGraph(); return; }
  if (S.mode === 'cal' && !OS.CalcX) S.mode = 'bas';
  b.dataset.m = S.mode; b.innerHTML = S.mode === 'bas' ? basic() : S.mode === 'gra' ? graph() : S.mode === 'cal' ? OS.CalcX.view(S) : fin();
  el.querySelectorAll('.cl-tabs button').forEach(x => x.classList.toggle('on', x.dataset.m === S.mode));
  if (S.mode === 'gra') requestAnimationFrame(drawGraph);
  if (fo && fo.cx) { const t = el.querySelector(`[data-cx="${fo.cx}"]`); if (t) { t.focus(); try { t.setSelectionRange(fo.s, fo.s); } catch (e) { } } }
  else if (fo) { const t = fo.id ? el.querySelector('#' + fo.id) : fo.k != null ? el.querySelector(`.cl-fn[data-k="${fo.k}"]`) : null; if (t) { t.focus(); try { t.setSelectionRange(fo.s, fo.s); } catch (e) { } } }
  save(); };
const open = () => { if (!el) build(); el.hidden = false; document.documentElement.classList.add('cl-open'); if (fab) fab.hidden = true; paint(); };
const close = () => { if (!el) return; el.hidden = true; document.documentElement.classList.remove('cl-open'); if (fab) fab.hidden = false; save(); };
const build = () => { el = document.createElement('div'); el.id = 'calc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Calculadora'); el.hidden = true;
  el.innerHTML = `<div class="cl-h" id="clDrag"><b>${UI.ic('calc')}Calculadora</b><div class="cl-tabs" role="tablist">${[['bas', 'Básica'], ['fin', 'Financeira'], ['gra', 'Gráfica'], ['cal', 'Cálculo']].map(([m, l]) => `<button type="button" role="tab" data-m="${m}">${l}</button>`).join('')}</div><button type="button" class="icon-btn" data-cl="x" aria-label="Fechar a calculadora">${UI.ic('x')}</button></div><div class="cl-body"></div>`;
  document.body.appendChild(el);
  if (S.pos && innerWidth > 700) { el.style.left = Math.min(innerWidth - 300, Math.max(0, S.pos[0])) + 'px'; el.style.top = Math.min(innerHeight - 200, Math.max(0, S.pos[1])) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }
  el.addEventListener('click', e => { const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
    if (t.dataset.cl === 'x') return close(); if (t.dataset.m) { S.mode = t.dataset.m; S.err = ''; return paint(); }
    const a = t.dataset.act, k = t.dataset.k; if (!a) return; e.stopPropagation();
    if (/^cx/.test(a) && OS.CalcX) return OS.CalcX.act(t, S, { paint, save, graph: fns => { S.fn = fns; S.mode = 'gra'; S.view = { cx: 0, cy: 0, sc: 30 }; paint(); } });
    if (a === 'clF') { finKey(k); return paint(); }
    if (a === 'clB') { bKey(k); return paint(); }
    if (a === 'clHist') { S.expr = t.dataset.v; return paint(); }
    if (a === 'clDeg') { S.deg = !S.deg; return paint(); }
    if (a === 'clAm') { S.am = !S.am; return paint(); }
    if (a === 'clHelp') { S.help = !S.help; return paint(); }
    if (a === 'clZ') { const v = gview(), z = +t.dataset.v; if (!z) S.view = { cx: 0, cy: 0, sc: 30 }; else v.sc = Math.min(4000, Math.max(.5, v.sc * z)); drawGraph(); save(); } });
  el.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.cx != null && OS.CalcX) { OS.CalcX.input(t, S, save); return; } if (t.id === 'clIn') { S.expr = t.value; S.err = ''; const r = el.querySelector('.cl-res'); if (r) { let res = ''; try { res = S.expr.trim() ? '= ' + fmt(evalExpr(S.expr)) : ''; } catch (er) { } r.textContent = res; } save(); }
    else if (t.classList.contains('cl-fn')) { S.fn[+t.dataset.k] = t.value; drawGraph(); save(); }
    else if (t.dataset.am) { S.amv = Object.assign(S.amv || { p: 10000, i: 5, n: 48, k: 'price' }, { [t.dataset.am]: t.value }); clearTimeout(S._amt); S._amt = setTimeout(() => { const am = el.querySelector('.cl-am'); if (am) { am.outerHTML = amBox(); } save(); }, 300); } });
  el.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.am === 'k') { S.amv = Object.assign(S.amv || { p: 10000, i: 5, n: 48 }, { k: t.value }); const am = el.querySelector('.cl-am'); if (am) am.outerHTML = amBox(); save(); } });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'clIn') { e.preventDefault(); bKey('eq'); paint(); } });
  // arrastar a janela (no computador) e mover o gráfico
  let drag = null; el.addEventListener('pointerdown', e => { const h = e.target.closest('#clDrag'); if (h && !e.target.closest('button') && innerWidth > 700) { const r = el.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, w: 1 }; el.setPointerCapture(e.pointerId); return; }
    const cv = e.target.closest('#clCv'); if (cv) { const v = gview(); drag = { gx: e.clientX, gy: e.clientY, cx: v.cx, cy: v.cy, moved: false }; cv.setPointerCapture(e.pointerId); } });
  el.addEventListener('pointermove', e => { if (!drag) return; if (drag.w) { const x = Math.min(innerWidth - 120, Math.max(0, e.clientX - drag.dx)), y = Math.min(innerHeight - 60, Math.max(0, e.clientY - drag.dy)); Object.assign(el.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }); S.pos = [x, y]; return; }
    const v = gview(), dx = e.clientX - drag.gx, dy = e.clientY - drag.gy; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; v.cx = drag.cx - dx / v.sc; v.cy = drag.cy + dy / v.sc; drawGraph(); });
  el.addEventListener('pointerup', e => { if (drag && drag.gx != null && !drag.moved && G) { const r = e.target.getBoundingClientRect(); S.tr = G.v.cx + (e.clientX - r.left - G.W / 2) / G.v.sc; drawGraph(); } if (drag) save(); drag = null; });
  el.addEventListener('wheel', e => { if (!e.target.closest('#clCv')) return; e.preventDefault(); const v = gview(); v.sc = Math.min(4000, Math.max(.5, v.sc * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); drawGraph(); }, { passive: false }); };
const bKey = k => { S.err = '';
  if (k === 'back') { S.expr = S.expr.slice(0, -1); return; } if (k === 'clear') { S.expr = ''; return; }
  if (k === 'eq') { if (!S.expr.trim()) return; try { const v = evalExpr(S.expr); if (!isFinite(v)) throw new Error('Resultado indefinido'); S.hist.push([S.expr, v]); S.hist = S.hist.slice(-20); S.ans = v; S.expr = fmt(v).replace(/\s/g, '').replace(/ /g, ''); } catch (e) { S.err = e.message || 'Conta inválida'; } return; }
  S.expr += k; };
// teclado do computador quando a calculadora está aberta
document.addEventListener('keydown', e => { if (!el || el.hidden) return; if (e.key === 'Escape') { close(); return; } const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return; if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (S.mode === 'fin') { const m = { Enter: 'enter', Backspace: 'back', '+': '+', '-': '-', '*': '*', '/': '/', ',': ',', '.': ',', '%': 'pct' }[e.key] || (/^[0-9]$/.test(e.key) ? e.key : null); if (m) { e.preventDefault(); finKey(m); paint(); } }
  else if (S.mode === 'bas') { const i = el.querySelector('#clIn'); if (i && e.key.length === 1) { i.focus(); } } });
const mkFab = () => { if (fab) return; fab = document.createElement('button'); fab.type = 'button'; fab.id = 'calcFab'; fab.setAttribute('aria-label', 'Abrir a calculadora'); fab.title = 'Calculadora (financeira como a HP 12C, gráfica e de cálculo: derivadas, integrais, matrizes e sucessões)'; fab.innerHTML = UI.ic('calc'); fab.onclick = open; document.body.appendChild(fab); };
OS.on('ready', mkFab); OS.on('unlock', mkFab);
OS.Calc = { open, close, evalExpr, compile, tvm: (k, R, beg) => { const b0 = S.beg; S.beg = !!beg; const v = tvm(k, R); S.beg = b0; return v; }, npv, irr, amort, key: k => { finKey(k); paint(); }, state: () => S, X: () => (buf != null ? parseNum(buf) : X()) };
})();
