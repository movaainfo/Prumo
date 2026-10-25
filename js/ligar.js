/* PRUMO — ligações entre áreas (v2.48): o que se regista num sítio aparece onde faz falta.
   - Caderno de erros → "O que estudar hoje" (Universidade, Hoje, Próximos passos e Bloco de foco) pede para refazer cada erro
     ao fim de 2 e de 7 dias; cada erro com resposta certa ou regra vira um flashcard (repetição espaçada); refazer dá XP no Dominus.
   - Painel: "O app inteiro" mostra num olhar cada área ligada (estudos, erros, leitura, foco, carreira e currículo, treino e dieta com a nota
     da IA, fé, mundo e o jogo), cada uma com o atalho para lá. As áreas desligadas em Definições não aparecem. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act, V = OS.views, esc = U.esc, St = OS.St, n = v => U.num(v) || 0;
const today = () => U.today(), on = k => !OS.Areas || OS.Areas.on(k), safe = (f, d) => { try { return f(); } catch (e) { return d; } };

/* ---------- caderno de erros ---------- */
const errDue = () => { const t = today(); return OS.all('errors').filter(e => !e.redone && e.date && U.diff(t, e.date) >= 2); };
A.errRedo = b => { const e = OS.get('errors', b.dataset.id); if (!e) return; OS.upd('errors', e.id, { redone: true, redoneAt: today() }); UI.toast('Erro refeito sem errar: fica a regra', 'pos'); };
if (St && St.today && !St.today._err) { const o = St.today; St.today = () => { const out = o(), t = today();
    errDue().forEach(e => { const d = U.diff(t, e.date); out.push({ score: 70 + Math.min(25, d) + (e.type === 'Não sabia a matéria' ? 8 : 0), kind: 'Erro', title: e.title, subject: e.subject,
      why: `Refazer o erro de há ${d} dias${e.rule ? ' · regra: ' + e.rule : ''}`, act: `data-act="errRedo" data-id="${e.id}"`, actL: 'Refeito sem errar', mins: 15 }); });
    return out.sort((a, b) => b.score - a.score); }; St.today._err = 1; }
// cada erro com resposta certa ou regra vira um flashcard da disciplina (deck "Caderno de erros")
const toCard = e => { if (!e || e.card || !(String(e.right || '').trim() || String(e.rule || '').trim())) return;
  const c = OS.add('cards', { subject: e.subject || '', deck: 'Caderno de erros', front: String(e.title).slice(0, 300), back: [e.right && 'Certo: ' + e.right, e.rule && 'Regra: ' + e.rule].filter(Boolean).join('\n').slice(0, 600), ef: 2.5, iv: 0, reps: 0, lapses: 0, due: U.addDays(today(), 1), err: e.id }, { silent: true });
  OS.upd('errors', e.id, { card: c.id }, { silent: true }); };
OS.on('add:errors', toCard); OS.on('upd:errors', toCard);

/* ---------- Painel: o app inteiro num olhar ---------- */
const tile = (k, href, ic, big, l, sub) => on(k) ? `<a class="v360-t" href="#${href}"><span class="v360-i">${UI.ic(ic)}</span><b class="mono">${big}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</a>` : '';
const whole = () => { const t = today(), w7 = U.addDays(t, -6), T = [];
  // estudos: horas na semana, revisões e erros por fazer, próxima avaliação
  const sH = U.sum(OS.all('sessions').filter(s => s.date >= w7), s => n(s.minutes)) / 60, rev = safe(() => St.revDue().length, 0), err = errDue().length;
  const nx = U.sortBy(OS.all('assessments').filter(a => a.date >= t && a.prep !== 'Feito'), a => a.date)[0];
  T.push(tile('universidade', 'universidade', 'school', U.nf(sH, 1) + ' h', 'estudo em 7 dias', nx ? `${esc(nx.title || nx.type || 'avaliação')} ${U.rel(nx.date)}` : ''));
  T.push(tile('universidade', 'universidade.erros', 'target', rev + err, 'revisões e erros por refazer', err ? `${err} ${err === 1 ? 'erro' : 'erros'} do caderno` : 'caderno em dia'));
  const cd = safe(() => OS.all('cards').filter(c => c.due && c.due <= t).length, 0); if (cd) T.push(tile('universidade', 'universidade.flashcards', 'layers', cd, 'flashcards para rever', ''));
  // leitura
  const reading = OS.all('books').filter(b => b.status === 'A ler');
  if (reading.length || OS.all('books').length) T.push(tile('leituras', 'leituras', 'book', reading.length, reading.length === 1 ? 'livro a ler' : 'livros a ler', reading[0] ? esc(reading[0].title) : ''));
  // foco e ranking
  const F = safe(() => OS.Foco.state(), null); if (F) T.push(tile('ranking', 'ranking', 'flame', F.s, F.s === 1 ? 'dia de foco seguido' : 'dias de foco seguidos', `${F.P.pts} pontos hoje · ${F.P.fm} min de foco`));
  // treino e dieta (com a nota da última análise da IA)
  const ca = OS.one('coach') || {}, bg = safe(() => OS.BodyGoals.stats(), null);
  if (bg) T.push(tile('treino', ca.treino ? 'treino.ia' : 'treino', 'dumbbell', bg.pct + '%', 'consistência do treino (30 dias)', ca.treino ? `IA: ${ca.treino.nota}/100` : 'pede a análise da IA'));
  const dd = U.lastN(7).map(d => safe(() => OS.Diet.day(d), null)).filter(x => x && x.n), dg = OS.one('diet');
  T.push(tile('dieta', ca.dieta ? 'dieta.ia' : 'dieta', 'apple', dd.length ? U.nf(U.sum(dd, x => x.p) / dd.length, 0) + ' g' : '—', 'proteína por dia (7 dias)', `${dd.length ? 'meta ' + U.nf(n(dg.p), 0) + ' g' : 'sem registos'}${ca.dieta ? ' · IA: ' + ca.dieta.nota + '/100' : ''}`));
  // carreira: capital profissional e currículo
  const cap = safe(() => OS.Car.capital().score, null), cv = safe(() => OS.CV.cur(), null);
  if (cap != null) T.push(tile('carreira', cv && cv.an ? 'carreira.curriculo' : 'capital', 'briefcase', U.nf(cap), 'capital profissional (0–1000)', cv && cv.an ? `currículo: ${cv.an.nota}/100` : cv ? 'currículo enviado' : 'envia o teu currículo'));
  // fé
  if (OS.all('devos').length || OS.all('prayers').length) { const dv = OS.all('devos').filter(x => x.date >= w7).length; T.push(tile('fe', 'fe', 'sun', dv, 'devocionais em 7 dias', OS.all('devos').some(x => x.date === t) ? 'hoje feito' : 'hoje ainda não')); }
  // mundo
  const M = safe(() => OS.Mundo.stats(), null); if (M && (M.n || M.w.length)) T.push(tile('mundo', 'mundo', 'globe', M.n, M.n === 1 ? 'país conhecido' : 'países conhecidos', `${String(Math.round(M.pct * 10) / 10).replace('.', ',')}% do mundo${M.w.length ? ' · ' + M.w.length + ' por ir' : ''}`));
  // projetos e metas
  const pj = OS.all('projects').filter(p => !['Concluído', 'Cancelado'].includes(p.status)), gl = OS.all('goals').filter(g => g.status !== 'Concluída' && g.status !== 'Abandonada');
  T.push(tile('projetos', 'projetos', 'folder', pj.length, 'projetos em curso', gl.length ? `${gl.length} ${gl.length === 1 ? 'meta ativa' : 'metas ativas'}` : ''));
  const L = T.filter(Boolean); if (!L.length) return '';
  return `<section class="v360"><div class="sech"><div><h2>O app inteiro</h2><p>Cada área, num olhar. Toca para ir lá.</p></div></div><div class="v360-g">${L.join('')}</div></section>`; };
OS.Whole = whole;
OS.on('ready', () => { const o = V.visao; if (!o || o._v360) return; V.visao = sub => { const h = o(sub), i = h.indexOf('<div class="dash-grid">'), w = safe(whole, ''); return i < 0 || !w ? h : h.slice(0, i) + w + h.slice(i); }; V.visao._v360 = 1; });
})();
