// PRUMO · página inicial pública (v3.66): o que é o Prumo, para quem chega sem conta (o endereço principal mostra-a a quem ainda não usa a app).
// Uso: node standalone/inicio/gerar.js <pasta de saída>   → <saída>/inicio.html + <saída>/inicio/ (vídeos, imagens)
// Os planos, os preços e quem vende vêm do mesmo sítio que a app (api/_planos.js, js/planos.js e js/legal.js).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const out = process.argv[2] || 'dist-gh', HERE = __dirname, ROOT = path.join(HERE, '..', '..');
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// quem vende (js/legal.js) e o selo (js/marca.js)
const OS = { on: () => { }, act: {}, forms: {} };
const ctx = { OS, document: { addEventListener: () => { }, baseURI: 'https://prumo-vida.vercel.app/' }, fetch: () => Promise.reject(new Error('sem rede')), URL, console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'legal.js'), 'utf8'), ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'marca.js'), 'utf8'), ctx);
const L = OS.Legal, M = OS.Marca;
// planos e o que cada um inclui
const PL = require(path.join(HERE, '..', 'api', '_planos.js'));
const FEAT = vm.runInNewContext('(' + fs.readFileSync(path.join(ROOT, 'js', 'planos.js'), 'utf8').match(/const FEAT = (\{[\s\S]*?\] \});/)[1] + ')');

// ícones simples (traço) para as "dez apps"
const IC = {
  tarefas: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
  banco: '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z"/>',
  calorias: '<path d="M12 21c4 0 7-3 7-7 0-5-5-6-5-11-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 8 0 4 3 7 7 7z"/>',
  treino: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  agenda: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
  diario: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  habitos: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4M9 12l2 2 4-4"/>',
  estudos: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
  leitura: '<path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6zM12 6v14.5"/>',
  senhas: '<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 14.5v2.5"/>'
};
const APPS = [['tarefas', 'Lista de tarefas'], ['banco', 'App do banco'], ['calorias', 'Contador de calorias'], ['treino', 'Registo de treinos'], ['agenda', 'Agenda'], ['diario', 'Diário'], ['habitos', 'Hábitos'], ['estudos', 'Notas da faculdade'], ['leitura', 'Leituras'], ['senhas', 'Gestor de senhas']];
const appsHtml = APPS.map(([k, t]) => `<div class="app"><div class="ic"><svg viewBox="0 0 24 24">${IC[k]}</svg></div><small>${t}</small></div>`).join('');

// áreas mostradas no telemóvel (vídeos gravados na conta de demonstração)
const AREAS = [
  ['painel', 'Painel', 'O dia num olhar: o que é urgente, o que está sob controlo e a próxima ação.'],
  ['hoje', 'Hoje', 'Rotina por horas, tarefas e hábitos. Marcas e segues em frente.'],
  ['dinheiro', 'Dinheiro', 'Gastos, orçamentos, contas e poupança. Cada euro com destino.'],
  ['corpo', 'Corpo', 'Treino com séries e cargas, corrida, dieta e sono.'],
  ['metas', 'Metas', 'Só ficam "no ritmo" quando há avanço real.'],
  ['estudos', 'Estudos', 'Sessões, avaliações, flashcards e o que estudar hoje.'],
  ['dominus', 'Dominus', 'O teu herói ganha força com o que fazes por ti.']
];
const areasHtml = AREAS.map(([k, t, d], i) => `<li class="area"><button type="button"><span class="n">${String(i + 1).padStart(2, '0')} / ${String(AREAS.length).padStart(2, '0')}</span><h3>${t}</h3><p>${d}</p></button></li>`).join('');
const railHtml = AREAS.map(([k, t]) => `<button type="button" role="tab" aria-selected="false">${t}</button>`).join('');
const videosHtml = AREAS.map(([k, t]) => `<video muted playsinline preload="none" poster="inicio/${k}.webp" data-src="inicio/${k}.mp4" aria-label="${esc(t)} no app"></video>`).join('');

// conversa de exemplo com o Spyke (números da conta de demonstração)
const SPY = [
  { p: 'Quanto gastei em restaurantes este mês?', r: 'Este mês, <b>18,90 €</b>: o jantar com a Inês e um café. Estás 69% abaixo do limite de 60 €. Bom ritmo para a viagem ao Japão.' },
  { p: 'O que faço agora?', r: 'Tens a aula de Estatística às 9:00. Antes disso, revê o <b>capítulo 3</b>: é a tarefa crítica de hoje e conta para a meta da média de 16.' },
  { p: 'Como vai a meta do Japão?', r: 'Já tens <b>2 530 €</b> de 4 000 € (63%). Ao ritmo atual chegas lá em junho, antes do prazo.' },
  { p: 'Cria uma tarefa: ligar à avó amanhã', r: 'Feito. Criei <b>Ligar à avó</b> para amanhã, com prioridade normal.' }
];
const sugsHtml = SPY.map((q, i) => `<button type="button" data-i="${i}">${esc(q.p)}</button>`).join('');

// um dia com o Prumo
const DIA = [
  { h: '07:00', t: 'Plano do dia', p: 'Abres o Prumo e já sabes: aula às 9, entrega amanhã, treino às 20:30.', luz: 'rgba(244,217,160,.22)' },
  { h: '09:00', t: 'Aulas', p: 'A agenda avisa antes e regista a presença em cada aula.', luz: 'rgba(244,217,160,.16)' },
  { h: '13:00', t: 'Almoço', p: 'Registas a refeição em segundos. Calorias e proteína somam sozinhas.', luz: 'rgba(244,217,160,.12)' },
  { h: '14:30', t: 'Bloco de foco', p: 'Uma pendência de cada vez, com tempo marcado e música para concentrar.', luz: 'rgba(224,38,58,.10)' },
  { h: '17:40', t: 'Um café', p: 'Pagaste? O atalho do iPhone regista o gasto sem abrir o app.', luz: 'rgba(224,38,58,.14)' },
  { h: '20:30', t: 'Treino', p: 'Séries, cargas da última vez e descanso cronometrado.', luz: 'rgba(224,38,58,.18)' },
  { h: '22:45', t: 'Desligar', p: 'Lês 20 páginas, o hábito fica marcado e o sono começa a contar.', luz: 'rgba(163,25,42,.14)' },
  { h: '23:30', t: 'O dia fecha', p: 'O Dominus soma a experiência do dia. Amanhã continuas de onde ficaste.', luz: 'rgba(163,25,42,.08)' }
];
const marcasHtml = DIA.map(d => `<button type="button">${d.h}</button>`).join('');

// privacidade: só o que é verdade no Prumo
const FACTOS = [
  ['<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', 'Sem anúncios e sem venda de dados.', 'O Prumo vive das assinaturas, não do que sabes.'],
  ['<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>', 'Cifrado no servidor e no caminho.', 'AES-256-GCM no servidor e HTTPS em cada pedido.'],
  ['<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01"/>', 'Funciona sem internet.', 'O que registas fica no aparelho e segue quando a rede volta.'],
  ['<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 'Exportas ou apagas tudo.', 'Quando quiseres, nas Definições. Sem perguntas.'],
  ['<path d="M4 4v6h6M20 20v-6h-6"/><path d="M5 15a8 8 0 0 0 14 2M19 9A8 8 0 0 0 5 7"/>', 'Cópias de segurança diárias.', 'Guardadas cifradas, para nada se perder.']
];
const factosHtml = FACTOS.map(([ic, b, s]) => `<li><svg viewBox="0 0 24 24">${ic}</svg><div><b>${b}</b><span>${s}</span></div></li>`).join('');

// planos
const planos = PL.planos();
const planosHtml = planos.map(p => `<article class="plano${p.lvl === 3 ? ' destaque' : ''}" data-id="${p.id}">${p.lvl === 3 ? `<span class="marca">${PL.TESTE_DIAS()} dias grátis incluídos</span>` : ''}<h3>${esc(p.n)}</h3>
  <div class="preco"><b></b><span></span></div><div class="aprox"></div>
  <ul>${(FEAT[p.lvl] || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
  <a class="btn${p.lvl === 3 ? '' : ' ghost'}" href="./?app=1&amp;conta=criar" data-app>Começar grátis</a></article>`).join('');
const DATAP = planos.map(p => ({ id: p.id, p: { mes: p.precos.EUR.mes, ano: p.precos.EUR.ano } }));
const TESTE = `Ao criar a conta tens ${PL.TESTE_DIAS()} dias do plano Completo, sem cartão.`;

// perguntas
const FAQ = [
  ['Preciso de cartão para experimentar?', `Não. Os ${PL.TESTE_DIAS()} dias do plano Completo começam quando crias a conta, sem cartão. No fim escolhes um plano; se não escolheres, os teus dados ficam guardados e podes exportá-los ou apagar a conta.`],
  ['Funciona no iPhone e no Android?', 'Sim. Abres no navegador e adicionas ao ecrã principal: fica como uma app, com ícone, ecrã inteiro e notificações. Também funciona no computador e no tablet, com os mesmos dados.'],
  ['Funciona sem internet?', 'Sim. O que registas sem rede fica guardado no aparelho e é enviado sozinho quando a ligação volta.'],
  ['Os meus dados ficam seguros?', 'Ficam cifrados no servidor (AES-256-GCM), as senhas nunca são guardadas em texto e cada conta só vê os seus dados. Não há anúncios nem venda de dados.'],
  ['Posso cancelar quando quiser?', 'Sim, na app, em Planos. O plano continua até ao fim do período que já pagaste e não volta a ser cobrado.'],
  ['Em que línguas está?', 'Português de Portugal e do Brasil, inglês, espanhol, francês, italiano e alemão.'],
  ['O que é o Spyke?', 'É o assistente com inteligência artificial do Prumo. Conhece as tuas tarefas, gastos, treinos e metas, responde com os teus números e faz o que pedes dentro do app.']
];
const faqHtml = FAQ.map(([q, r]) => `<details><summary>${esc(q)}<i aria-hidden="true"></i></summary><div class="r"><p>${esc(r)}</p></div></details>`).join('');

// tutorial em vídeo (quando existir: media/tutorial.mp4 + tutorial.vtt)
const tutOk = fs.existsSync(path.join(HERE, 'media', 'tutorial.mp4'));
let CAPS = []; try { CAPS = JSON.parse(fs.readFileSync(path.join(HERE, 'media', 'tutorial-capitulos.json'), 'utf8')); } catch (e) { }
const tutHtml = !tutOk ? '' : `<section class="tuto" id="tutorial" aria-label="Tutorial em vídeo"><div class="wrap"><div class="caixa">
  <div class="rev"><p class="lbl">Em pouco mais de um minuto</p><h2>Aprende a usar <em>o Prumo.</em></h2><p class="lead">Um tutorial com narração e legendas: do Painel ao Dominus, capítulo a capítulo. Toca num capítulo para saltar para ele.</p>
  <div class="caps">${CAPS.map(c => `<button type="button" data-t="${c.t}">${esc(c.n)}</button>`).join('')}</div></div>
  <div class="player rev" id="player"><video playsinline preload="none" poster="inicio/tutorial.webp" data-src="inicio/tutorial.mp4" aria-label="Tutorial do Prumo, com narração e legendas"></video><button class="play" type="button" aria-label="Ver o tutorial"><span><svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg></span></button></div>
</div></div></section>`;

const DATA = { areas: AREAS.map(([k, t, d]) => ({ k, t, d })), spy: SPY, dia: DIA.map(({ h, t, p, luz }) => ({ h, t, p, luz })), planos: DATAP };
const rep = {
  SELO: 'inicio/selo.svg', APPS: appsHtml, AREAS: areasHtml, RAIL: railHtml, VIDEOS: videosHtml, TUTORIAL: tutHtml, SUGS: sugsHtml, DIAMAX: String(DIA.length - 1), MARCAS: marcasHtml,
  FACTOS: factosHtml, PLANOS: planosHtml, TESTE: esc(TESTE), FAQ: faqHtml, IDENT: 'O Prumo é vendido por ' + L.ident() + '.', ANO: String(new Date().getFullYear()),
  DATA: JSON.stringify(DATA).replace(/</g, '\\u003c')
};
let html = fs.readFileSync(path.join(HERE, 'pagina.html'), 'utf8').replace(/\{\{([A-Z0-9]+)\}\}/g, (m, k) => { if (!(k in rep)) throw new Error('falta ' + k); return rep[k]; });
fs.writeFileSync(path.join(out, 'inicio.html'), html);
// imagens e vídeos
const dst = path.join(out, 'inicio'); fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, 'media'))) if (!/\.json$/.test(f)) fs.copyFileSync(path.join(HERE, 'media', f), path.join(dst, f));
{ const u = String(M.selo), i = u.indexOf(','); fs.writeFileSync(path.join(dst, 'selo.svg'), /;base64,/.test(u.slice(0, i + 1)) ? Buffer.from(u.slice(i + 1), 'base64') : decodeURIComponent(u.slice(i + 1))); }  // o selo (uma vez, em ficheiro)
console.log('inicio.html', Math.round(html.length / 1024) + ' KB', '·', fs.readdirSync(dst).length, 'ficheiros em inicio/');
