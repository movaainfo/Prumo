/* PRUMO — a parceria Prumo & seele (v3.93): prémios de verdade e sorteios, ligados ao app todo e à parceria Prumo & PHANTOM.
   Cada campanha tem um prémio (um objeto real, Selos ou os dois), um critério (Ranking do Prumo, dias de foco, pontos dos jogos dos Animes
   ou livros lidos), um período e uma forma de ganhar: por mérito (os primeiros) ou por sorteio entre quem se qualifica. Entrar é grátis,
   uma entrada por conta, e há regulamento em cada campanha. A administração cria, publica, fecha e confirma os vencedores aqui mesmo.
   Enquanto não houver nenhuma campanha publicada, só a administração vê a seele no menu. */
(() => {
'use strict';
const U = OS.U, UI = OS.UI, A = OS.act = OS.act || {}, esc = U.esc;
const conta = () => !!(OS.Acc && OS.Acc.on && OS.Acc.token && OS.Acc.token() && OS.Acc.pid && OS.Acc.pid());
const call = (op, b) => OS.Social && OS.Social.call ? OS.Social.call(op, b) : Promise.reject(new Error('Sem ligação.'));
const adm = () => !!(OS.Acc && OS.Acc.adm && OS.Acc.adm());
const S = { d: null, at: 0, busy: false, err: '', leve: null, leveAt: 0, form: null, livAt: {} };
const ve = () => adm() || !!(S.leve && S.leve.aberta) || !!(S.d && S.d.aberta);
const selo = n => { try { return OS.Lock && OS.Lock.logo ? OS.Lock.logo(n) : ''; } catch (e) { return ''; } };
if (!UI.IP.borboleta) UI.IP.borboleta = 'M12 8v11M12 8l-2.2-3.4M12 8l2.2-3.4M12 10C10.4 6.4 6.6 4.6 4.6 5.4S3.8 10.6 7.4 11.8C4.9 12.8 5 17 7.8 17.4S11.2 15.2 12 13.4M12 10c1.6-3.6 5.4-5.4 7.4-4.6s.8 5.2-2.8 6.4c2.5 1 2.4 5.2-.4 5.6S12.8 15.2 12 13.4';
const nf = n => Number(n || 0).toLocaleString('pt-PT');
const dLonga = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) : '';
const dAno = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const hojeL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const faltam = d => { const n = Math.round((Date.parse(d + 'T23:59:59') - Date.now()) / 864e5); return n <= 0 ? 'termina hoje' : n === 1 ? 'falta 1 dia' : 'faltam ' + n + ' dias'; };
const marca = grande => `<span class="se-sl${grande ? '' : ' se-sl-s'}" aria-label="seele"><img class="se-borb" src="icons/seele-borboleta.webp" width="760" height="526" alt="" decoding="async" draggable="false"><span class="se-nome" role="img" aria-label="seele" style="-webkit-mask-image:url(icons/seele-nome.webp);mask-image:url(icons/seele-nome.webp)"></span></span>`;

/* ---------- dados ---------- */
const carregar = async forcar => { if (!conta() || S.busy || (!forcar && S.d && Date.now() - S.at < 45e3)) return S.d; S.busy = true; S.err = '';
  try { S.d = await call('premios', {}); S.at = Date.now(); sincLivros(); } catch (e) { S.err = (e && e.message) || 'Não deu para abrir os prémios.'; } S.busy = false; nav(); OS.request(); return S.d; };
const carregarLeve = async forcar => { if (!conta() || (!forcar && S.leve && Date.now() - S.leveAt < 5 * 60e3)) return S.leve; try { S.leve = await call('premios', { leve: true }); S.leveAt = Date.now(); } catch (e) { } nav(); OS.request(); return S.leve; };
// os livros lidos no período, para as campanhas de livros em que a pessoa está
const livrosDe = cp => { const fim = cp.fim < hojeL() ? cp.fim : hojeL(); return (OS.all ? OS.all('books') : []).filter(b => b.status === 'Lido' && b.end && b.end >= cp.ini && b.end <= fim).map(b => ({ t: b.title || '', a: b.author || '', fim: b.end })); };
const sincLivros = () => { ((S.d && S.d.lista) || []).filter(c => c.crit === 'livros' && c.estado === 'aberta' && c.eu && c.eu.dentro).forEach(c => {
  if (Date.now() - (S.livAt[c.id] || 0) < 10 * 60e3) return; S.livAt[c.id] = Date.now(); const L = livrosDe(c); if (L.length !== (c.eu.nl || 0)) call('premioLivros', { id: c.id, livros: L }).then(j => { if (j.n !== c.eu.nl) carregar(true); }).catch(() => { }); }); };

/* ---------- o regulamento de cada campanha (sempre dentro da app) ---------- */
const PAISN = { PT: 'Portugal', BR: 'Brasil', OUTRO: 'outros países' };
const premiosTxt = c => { const L = c.premios || []; return L.map((p, i) => `${i === L.length - 1 && c.nV > L.length ? (i + 1) + '.º lugar e seguintes' : (i + 1) + '.º lugar'}: ${[p.t, p.s ? nf(p.s) + ' Selos' : ''].filter(Boolean).join(' + ')}`); };
const comoGanha = c => c.modo === 'sorteio' ? `Sorteio de ${c.nV} ${c.nV === 1 ? 'prémio' : 'prémios'} entre ${c.qual && c.qual.tipo === 'min' ? `quem chegar a ${nf(c.qual.n)} ${c.unid}` : `os ${nf((c.qual && c.qual.n) || 10)} primeiros`}` : c.nV === 1 ? 'Ganha quem ficar em 1.º lugar' : `Ganham os ${c.nV} primeiros`;
const regras = c => `<div class="se-reg">
  <h4>Quem organiza</h4><p>O Prumo, em parceria com a seele. A Apple e a Google não patrocinam nem estão envolvidas nesta campanha.</p>
  <h4>Quando</h4><p>De ${dAno(c.ini)} a ${dAno(c.fim)} (fim do dia, hora de Lisboa).</p>
  <h4>Quem pode participar</h4><p>Quem tem conta no Prumo, com ${c.idade || 18} anos ou mais (ou com autorização de quem tem a sua guarda)${(c.paises || []).length ? ', em ' + c.paises.map(p => PAISN[p] || p).join(', ') : ''}. Uma entrada por conta. Não podem ganhar pessoas da equipa do Prumo e da seele.</p>
  <h4>Custa alguma coisa?</h4><p>Não. Participar é grátis, não é preciso comprar nada e os Selos não dão entradas nem vantagem.</p>
  <h4>Como se ganha</h4><p>Conta ${esc(c.critD || '')}. ${esc(comoGanha(c))}${c.modo === 'merito' ? '; em caso de empate, ganha quem entrou primeiro na campanha.' : '.'}${c.modo === 'merito' ? ' Só contam pessoas com mais de 0 ' + esc(c.unid || 'pontos') + '.' : ''}</p>
  ${c.modo === 'sorteio' ? `<h4>O sorteio</h4><p>É feito pelo servidor do Prumo com uma semente secreta escolhida quando a campanha foi publicada. O código de verificação da semente (SHA-256) é público desde o início: <code>${esc(c.hash || '—')}</code>. No fim, a semente é revelada e qualquer pessoa pode confirmar a ordem: cada participante qualificado recebe o HMAC-SHA256 da semente com o seu identificador e ganham os valores mais baixos.${c.autorizacao ? ` Autorização: ${esc(c.autorizacao)}.` : ''}</p>` : ''}
  <h4>Os prémios</h4><ul>${premiosTxt(c).map(t => `<li>${esc(t)}</li>`).join('')}</ul><p>Os Selos chegam à carteira do perfil vencedor; um prémio físico ou digital é combinado por e-mail com a equipa e enviado sem custos para quem ganha. Os prémios não se trocam por dinheiro.</p>
  <h4>Vencedores</h4><p>A equipa confirma cada vencedor (para garantir que as regras foram cumpridas e que não houve batota). Quem ganha recebe um aviso na app e no e-mail da conta e tem ${14} dias para aceitar o prémio na página da seele. Quem não aceitar a tempo ou não cumprir as regras é substituído por um suplente${c.modo === 'merito' ? ' (o seguinte na tabela)' : ' (o seguinte no sorteio)'}. O nome ou @ dos vencedores aparece na página da seele.</p>
  <h4>Os teus dados</h4><p>Usamos só o necessário para gerir a campanha: o perfil, os ${esc(c.unid || 'pontos')} do período e, se ganhares, o e-mail da conta para combinar a entrega. Mais em <a class="acc" href="privacidade.html" target="_blank" rel="noopener">Privacidade</a>.</p></div>`;

/* ---------- partes da página ---------- */
const imgDe = c => c.img ? `<img class="se-cimg" src="${esc(c.img)}" alt="" loading="lazy" decoding="async">` : `<span class="se-cimg se-cph" aria-hidden="true"><img src="icons/seele-borboleta.webp" alt="" width="120" height="84"></span>`;
const ESTN = { aberta: 'Em jogo', breve: 'Começa em breve', a_fechar: 'A apurar', fechada: 'Terminada', rascunho: 'Rascunho', cancelada: 'Cancelada' };
const topHTML = (c, n = 5) => (c.top || []).length ? `<ol class="se-top">${c.top.slice(0, n).map(x => `<li class="${x.eu ? 'eu' : ''}"><b>${x.pos}.º</b><span>${OS.AnimeSoc ? OS.AnimeSoc.av(x, 24) : ''}${esc(x.user ? '@' + x.user : x.nome)}${x.eu ? ' (tu)' : ''}</span><em>${nf(x.pts)} ${esc(c.unid)}</em></li>`).join('')}</ol>` : `<p class="mut se-v0">Ainda ninguém pontuou. Podes ser o primeiro.</p>`;
const meuEstado = c => { if (!c.eu) return ''; if (!c.eu.dentro) return ''; const q = c.modo === 'sorteio' ? (c.eu.qual ? ' · <b class="se-ok">qualificado para o sorteio</b>' : ' · ainda não qualificado para o sorteio') : '';
  return `<p class="se-eu">${UI.ic('check')}<span>Estás dentro: ${c.eu.pts ? `${c.eu.pos}.º lugar com <b>${nf(c.eu.pts)} ${esc(c.unid)}</b>` : `ainda com 0 ${esc(c.unid)}`}${q}${c.crit === 'livros' ? '. Os livros contam quando os marcas como lidos nas Leituras, com a data de fim.' : ''}</span></p>`; };
const ligacao = c => ({ prumo: ['#ranking', 'Abrir o Ranking'], foco: ['#ranking', 'Abrir o Ranking'], animes: ['#animes.jogos', 'Jogar nos Animes'], livros: ['#leituras', 'Abrir as Leituras'] })[c.crit] || null;
const cartao = c => { const lg = ligacao(c), aberta = c.estado === 'aberta' || c.estado === 'breve';
  return `<article class="se-c se-${c.estado}" data-id="${esc(c.id)}">${imgDe(c)}<div class="se-cb">
    <div class="se-ch"><span class="se-est">${ESTN[c.estado] || ''}</span>${c.parc === 'phantom' ? `<span class="se-parc">Animes · Prumo &amp; PHANTOM</span>` : ''}</div>
    <h4>${esc(c.titulo)}</h4>${c.desc ? `<p class="se-cd">${esc(c.desc)}</p>` : ''}
    <ul class="se-pr">${premiosTxt(c).map(t => `<li>${UI.ic('gift')}<span>${esc(t)}</span></li>`).join('')}</ul>
    <dl class="se-dl"><div><dt>Como se ganha</dt><dd>${esc(comoGanha(c))} em <b>${esc(c.critN)}</b></dd></div><div><dt>Quando</dt><dd>${dLonga(c.ini)} a ${dAno(c.fim)}${c.estado === 'aberta' ? ` · ${faltam(c.fim)}` : ''}</dd></div><div><dt>Participantes</dt><dd>${nf(c.n || 0)}</dd></div></dl>
    ${aberta ? meuEstado(c) : ''}
    ${aberta || c.estado === 'a_fechar' ? topHTML(c) : ''}
    <div class="se-acts">${aberta && c.eu && !c.eu.dentro && !adm() ? `<button type="button" class="btn pri" data-act="seEntrar" data-id="${esc(c.id)}">Participar (grátis)</button>` : ''}${aberta && c.eu && c.eu.dentro && lg ? `<a class="btn" href="${lg[0]}">${esc(lg[1])}</a>` : ''}<button type="button" class="btn ghost" data-act="seRegras" data-id="${esc(c.id)}">Regulamento</button></div>
    ${adm() ? admCartao(c) : ''}</div></article>`; };
const vencHTML = c => { const r = c.res || {}; return `<article class="se-w"><div class="se-wh">${imgDe(c)}<div><h4>${esc(c.titulo)}</h4><small>${dLonga(c.ini)} a ${dAno(c.fim)} · ${nf(r.n || c.n || 0)} participantes · ${esc(c.critN)}</small></div></div>
  ${(r.venc || []).length ? `<ol class="se-wl">${r.venc.map(v => `<li class="${v.eu ? 'eu' : ''}"><b>${v.pos}.º</b><span>${OS.AnimeSoc ? OS.AnimeSoc.av(v, 28) : ''}${esc(v.user ? '@' + v.user : v.nome)}${v.eu ? ' (tu)' : ''}<small>${esc(v.premio)}</small></span><em>${v.estado === 'por_confirmar' ? 'a confirmar' : v.estado === 'entregue' ? 'entregue' : 'confirmado'}</em></li>`).join('')}</ol>` : '<p class="mut">Ninguém cumpriu as condições desta campanha.</p>'}
  ${c.modo === 'sorteio' && c.seed ? `<details class="se-ver"><summary>Verificar o sorteio</summary><p>Semente revelada: <code>${esc(c.seed)}</code><br>Código publicado antes: <code>${esc(c.hash)}</code></p>${(r.qual || []).length ? `<ol>${r.qual.map(q => `<li>${esc(q.quem)} · <code>${esc(q.h)}…</code></li>`).join('')}</ol>` : ''}</details>` : ''}
  ${adm() ? admCartao(c) : ''}</article>`; };
const meusHTML = L => { const M = L.filter(c => c.meu); if (!M.length) return '';
  return `<section class="se-sec se-meus"><h3>${UI.ic('trophy')}Os teus prémios</h3>${M.map(c => { const m = c.meu, p = m.premio || {}, txt = [p.t, p.s ? nf(p.s) + ' Selos' : ''].filter(Boolean).join(' + ');
    return `<div class="se-meu"><span class="se-mp">${m.pos}.º</span><div><b>${esc(c.titulo)}</b><small>${esc(txt)}</small>${m.estado === 'por_confirmar' ? '<p>Ficaste entre os vencedores. A equipa está a confirmar e avisa-te aqui e por e-mail.</p>' : m.estado === 'confirmado' ? `<p>Ganhaste! Aceita o prémio${m.prazo ? ' até ' + new Date(m.prazo).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) : ''}.${p.s ? ' Os Selos já estão na tua carteira.' : ''}</p>` : m.estado === 'aceite' ? `<p>Prémio aceite.${p.t ? ' A equipa vai contactar-te pelo e-mail da conta para combinar a entrega.' : ''}</p>` : '<p>Entregue. Parabéns!</p>'}</div>${m.estado === 'confirmado' ? `<button type="button" class="btn pri" data-act="seAceitar" data-id="${esc(c.id)}">Aceitar o prémio</button>` : ''}</div>`; }).join('')}</section>`; };

/* ---------- administração ---------- */
const admCartao = c => { const b = (act, t, cls = '') => `<button type="button" class="btn sm ${cls}" data-act="seAdm" data-acao="${act}" data-id="${esc(c.id)}">${t}</button>`;
  let h = `<div class="se-adm-c"><small>Administração</small><div class="row gap6">`;
  if (c.estado === 'rascunho') h += b('editar', 'Editar') + b('publicar', 'Publicar', 'pri') + b('apagar', 'Apagar');
  else if (['aberta', 'breve', 'a_fechar'].includes(c.estado)) h += b('fechar', 'Fechar já e apurar') + b('cancelar', 'Cancelar');
  h += '</div>';
  if (c.adm && c.adm.venc) h += `<table class="se-adt"><thead><tr><th>Lugar</th><th>Quem</th><th>${esc(c.unid)}</th><th>Estado</th><th></th></tr></thead><tbody>${c.adm.venc.map(v => `<tr class="${v.estado}"><td>${v.pos}.º</td><td>${esc(v.nome)}${v.user ? ' · @' + esc(v.user) : ''}<br><small>${esc(v.email || '')}</small>${c.crit === 'livros' ? `<br><small>${v.nl || 0} livros</small>` : ''}</td><td>${nf(v.pts)}</td><td>${esc({ por_confirmar: 'A confirmar', confirmado: 'Confirmado (à espera de aceitar)', aceite: 'Aceite: combinar entrega', entregue: 'Entregue', excluido: 'Excluído' }[v.estado] || v.estado)}${v.motivo ? `<br><small>${esc(v.motivo)}</small>` : ''}</td>
    <td class="se-adb">${v.estado === 'por_confirmar' ? `<button type="button" class="btn xs pri" data-act="seVenc" data-acao="confirmar" data-id="${esc(c.id)}" data-eu="${esc(v.eu)}">Confirmar</button>` : ''}${['confirmado', 'aceite'].includes(v.estado) ? `<button type="button" class="btn xs" data-act="seVenc" data-acao="entregue" data-id="${esc(c.id)}" data-eu="${esc(v.eu)}">Entregue</button>` : ''}${!['excluido', 'entregue'].includes(v.estado) ? `<button type="button" class="btn xs ghost" data-act="seVenc" data-acao="excluir" data-id="${esc(c.id)}" data-eu="${esc(v.eu)}" data-n="${esc(v.nome)}">Excluir</button>` : ''}</td></tr>`).join('')}</tbody></table><small class="mut">${c.adm.sup.length} ${c.adm.sup.length === 1 ? 'suplente' : 'suplentes'} à espera.</small>`;
  return h + '</div>'; };
const CRIT0 = [['prumo', 'Ranking do Prumo'], ['foco', 'Dias de foco seguidos'], ['animes', 'Jogos dos Animes (PHANTOM)'], ['livros', 'Livros lidos']];
const formHTML = () => { const f = S.form || {}, P = f.premios || [], cr = (S.d && S.d.crits) || CRIT0.map(([k, n]) => ({ k, n })), sel = (n, v, o) => `<select class="field" name="${n}">${o.map(([k, t]) => `<option value="${k}"${String(v) === String(k) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const hoje = hojeL();
  return `<form class="se-form" data-form="seCampanha" autocomplete="off"><input type="hidden" name="id" value="${esc(f.id || '')}"><input type="hidden" name="img" value="${esc(f.img || '')}">
    <h4>${f.id ? 'Editar a campanha' : 'Nova campanha'}</h4>
    <label>Título<input class="field" name="titulo" maxlength="80" required value="${esc(f.titulo || '')}" placeholder="Ex.: Leitor do mês de dezembro"></label>
    <label>Descrição (opcional)<textarea class="field" name="desc" maxlength="900" rows="2" placeholder="O que é o prémio, em poucas palavras">${esc(f.desc || '')}</textarea></label>
    <div class="se-fimg">${f.img ? `<img src="${esc(f.img)}" alt="">` : ''}<label class="btn sm">${UI.ic('camera')}${f.img ? 'Mudar a imagem do prémio' : 'Imagem do prémio'}<input type="file" accept="image/*" data-seimg hidden></label>${f.img ? '<button type="button" class="btn sm ghost" data-act="seImgX">Tirar a imagem</button>' : ''}</div>
    <div class="se-fg"><label>Critério${sel('crit', f.crit || 'prumo', cr.map(x => [x.k, x.n]))}</label><label>Como se ganha${sel('modo', f.modo || 'merito', [['merito', 'Mérito: ganham os primeiros'], ['sorteio', 'Sorteio entre quem se qualifica']])}</label>
      <label>Vencedores<input class="field" type="number" name="nV" min="1" max="50" value="${esc(f.nV || 1)}"></label></div>
    <div class="se-fg se-fq"${f.modo === 'sorteio' ? '' : ' hidden'}><label>Quem entra no sorteio${sel('qtipo', (f.qual && f.qual.tipo) || 'top', [['top', 'Os N primeiros da tabela'], ['min', 'Quem chegar a um mínimo']])}</label><label>N ou mínimo<input class="field" type="number" name="qn" min="1" value="${esc((f.qual && f.qual.n) || 10)}"></label>
      <label class="se-fw">Autorização do sorteio (obrigatória)<input class="field" name="autorizacao" maxlength="160" value="${esc(f.autorizacao || '')}" placeholder="Ex.: Certificado SPA/MF n.º … ou Autorização da Câmara Municipal de … n.º …"></label></div>
    <fieldset class="se-fp"><legend>Prémios (o último vale para os lugares seguintes)</legend>${[0, 1, 2].map(i => `<div class="se-fg"><label>${i + 1}.º lugar${i === 2 ? ' e seguintes' : ''}<input class="field" name="pt${i}" maxlength="120" value="${esc((P[i] || {}).t || '')}" placeholder="${i ? 'Opcional' : 'Ex.: Livro à escolha até 25 €'}"></label><label>Selos<input class="field" type="number" name="ps${i}" min="0" max="100000" value="${esc((P[i] || {}).s || 0)}"></label></div>`).join('')}</fieldset>
    <div class="se-fg"><label>Início<input class="field" type="date" name="ini" required value="${esc(f.ini || hoje)}"></label><label>Fim<input class="field" type="date" name="fim" required value="${esc(f.fim || '')}" min="${hoje}"></label>
      <label>Idade mínima${sel('idade', f.idade || 18, [[18, '18 anos'], [16, '16 anos']])}</label></div>
    <fieldset class="se-paises"><legend>Países (nenhum marcado = todos)</legend>${[['PT', 'Portugal'], ['BR', 'Brasil'], ['OUTRO', 'Outros']].map(([k, t]) => `<label><input type="checkbox" name="pais" value="${k}"${(f.paises || []).includes(k) ? ' checked' : ''}>${t}</label>`).join('')}</fieldset>
    <p class="mut se-leg">Prémios por mérito (ganha quem fez mais, sem sorte e sem pagar) são o caminho mais simples. Um <b>sorteio</b> com prémios precisa de autorização prévia: no Brasil, da Secretaria de Prémios e Apostas do Ministério da Fazenda; em Portugal, da Câmara Municipal. Confirma com um advogado antes do primeiro sorteio.</p>
    <div class="row gap8"><button class="btn pri">${f.id ? 'Guardar' : 'Guardar como rascunho'}</button>${f.id || f.aberto ? '<button type="button" class="btn ghost" data-act="seFormX">Fechar</button>' : ''}</div></form>`; };

/* ---------- a página (#seele) ---------- */
// a borboleta: duas metades da mesma imagem que rodam à volta do corpo (abre as asas uma vez ao entrar; depois respira devagar)
const borboleta = () => `<span class="se-bf${S.vista ? ' ja' : ''}" aria-hidden="true"><span class="se-wl"><img src="icons/seele-borboleta.webp" alt="" width="760" height="526" decoding="async" draggable="false"></span><span class="se-wr"><img src="icons/seele-borboleta.webp" alt="" width="760" height="526" decoding="async" draggable="false"></span></span>`;
const hero = () => `<section class="se-hero" aria-label="Prumo &amp; seele">
    <div class="se-hv">${borboleta()}</div>
    <div class="se-ht"><div class="se-marca"><span class="se-selo">${selo(64)}</span><i class="se-e" aria-hidden="true">&amp;</i><span class="se-nome se-nome-h" role="img" aria-label="seele" style="-webkit-mask-image:url(icons/seele-nome.webp);mask-image:url(icons/seele-nome.webp)"></span></div>
      <h1 class="se-t">O teu esforço ganha asas.</h1>
      <p class="se-d">O Prumo mede o que fazes todos os dias. A seele transforma isso em prémios de verdade: objetos, livros, experiências e Selos. Participar é sempre grátis.</p>
      <div class="se-acts"><button type="button" class="btn pri" data-act="seIr" data-alvo="sePremios">${UI.ic('gift')}Ver os prémios</button><button type="button" class="btn ghost" data-act="seIr" data-alvo="seComo">Como funciona</button>${adm() ? '<button type="button" class="btn ghost" data-act="seIr" data-alvo="seAdm">Gerir prémios</button>' : ''}</div></div></section>`;
// a parceria ao vivo (só contagens)
const numeros = L => { const pub = L.filter(c => !['rascunho', 'cancelada'].includes(c.estado)); if (!pub.length) return '';
  const jogo = pub.filter(c => ['aberta', 'breve'].includes(c.estado)).length, part = pub.reduce((a, c) => a + (c.n || 0), 0), venc = pub.reduce((a, c) => a + (((c.res || {}).venc) || []).filter(v => v.estado !== 'por_confirmar').length, 0);
  return `<div class="se-viva" aria-label="A parceria ao vivo">${[[jogo, jogo === 1 ? 'prémio em jogo' : 'prémios em jogo'], [part, part === 1 ? 'participação' : 'participações'], [venc, venc === 1 ? 'vencedor' : 'vencedores']].map(([v, l]) => `<div><b>${nf(v)}</b><span>${l}</span></div>`).join('')}</div>`; };
// ganha-se com o que já se faz no Prumo e nos Animes da PHANTOM
const CAMINHOS = [['prumo', 'award', 'Ranking do Prumo', 'Os pontos de disciplina de cada dia: entrar, cumprir as tarefas e os hábitos.', '#ranking', 'Abrir o Ranking'],
  ['foco', 'focus', 'Dias de foco', 'Dias seguidos com 70 pontos ou mais no Ranking do Prumo.', '#ranking', 'Ver os meus dias'],
  ['livros', 'book', 'Leituras', 'Os livros que terminas, com a data de fim nas tuas Leituras.', '#leituras', 'Abrir as Leituras'],
  ['animes', 'gamepad', 'Jogos dos Animes', 'Pursuit, Quiz relâmpago, Sombras e desafios, na parceria Prumo & PHANTOM.', '#animes.jogos', 'Jogar']];
const caminhos = L => { const ativo = k => L.some(c => c.crit === k && ['aberta', 'breve'].includes(c.estado));
  return `<section class="se-sec" id="seComo"><h2 class="se-h2">Ganha com o que já fazes</h2><div class="se-cm">${CAMINHOS.map(([k, ic, t, d, h, l]) => `<a class="se-cmi${k === 'animes' ? ' ph' : ''}" href="${h}"><span class="se-cmic">${UI.ic(ic)}</span><b>${t}</b><p>${esc(d)}</p><span class="se-cmf">${ativo(k) ? '<em>Há um prémio em jogo</em>' : ''}<small>${l}</small></span></a>`).join('')}</div></section>`; };
// os quatro passos de um prémio, pela ordem da vida da borboleta
const PASSOS = [['Ovo', 'Participa', 'Escolhe um prémio em jogo e entra. É grátis e não precisas de comprar nada.'], ['Lagarta', 'Faz o teu dia', 'Cumpre, lê, joga. O que fazes no período conta sozinho.'],
  ['Crisálida', 'A campanha fecha', 'Ganham os primeiros ou, num sorteio, quem se qualificou. A equipa confirma cada vencedor.'], ['Borboleta', 'Recebes o prémio', 'Aceitas na app: os Selos chegam logo e o prémio físico é combinado por e-mail.']];
const metamorfose = () => `<section class="se-sec se-met"><h2 class="se-h2">Da lagarta à borboleta</h2><ol>${PASSOS.map(([f, t, d], i) => `<li><span class="se-mn" aria-hidden="true">${i + 1}</span><small>${f}</small><b>${t}</b><p>${d}</p></li>`).join('')}</ol></section>`;
const sorteios = () => `<section class="se-sec se-srt"><h2 class="se-h2">Sorteios que se podem verificar</h2><p>Quando um prémio é sorteado, ninguém escolhe à mão. Antes de começar, a página mostra o código de uma semente secreta. No fim, a semente é revelada e qualquer pessoa confirma que bate certo com o código e que a ordem dos vencedores saiu dela.</p>
    <div class="se-srtv" aria-hidden="true"><span><b>Antes</b><code>código público</code></span><i></i><span><b>No fim</b><code>semente revelada</code></span><i></i><span><b>Resultado</b><code>ordem verificável</code></span></div></section>`;
const FAQ = [['Custa alguma coisa?', 'Não. Participar é sempre grátis e os Selos não dão entradas nem mais hipóteses.'], ['Quem pode participar?', 'Quem tem conta no Prumo, com a idade mínima de cada campanha (normalmente 18 anos, ou com autorização de quem tem a guarda) e nos países indicados. Uma entrada por conta.'],
  ['Como recebo um prémio físico?', 'Depois de aceitares o prémio na app, a equipa escreve para o e-mail da tua conta para combinar a entrega, sem custos para ti.'], ['E se alguém fizer batota?', 'Cada vencedor é confirmado pela equipa antes de receber. Quem não cumprir as regras perde o prémio e entra o suplente.'],
  ['Onde estão as regras?', 'Cada campanha tem o seu regulamento completo: carrega em Regulamento no cartão do prémio.']];
const faq = () => `<section class="se-sec se-faq"><h2 class="se-h2">Perguntas</h2>${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`;
const assinatura = () => `<footer class="se-ass"><span class="se-assf" aria-hidden="true"></span><span class="se-assm" aria-hidden="true">${selo(28)}<i>&amp;</i><img src="icons/seele-borboleta.webp" alt="" width="40" height="28"></span><p>Uma parceria <b>Prumo &amp; seele</b></p></footer>`;
const view = () => {
  if (!ve()) return UI.head('Parceria', '', '', 'Parceria') + `<div class="pn"><p style="margin:0">Esta página ainda não está aberta.</p><p class="mut" style="margin:6px 0 0"><a class="acc" href="#hoje">Voltar ao Hoje</a></p></div>`;
  carregar(false); if (!S.vista) setTimeout(() => { S.vista = true; }, 2200);
  const d = S.d, L = (d && d.lista) || [], pub = L.filter(c => !['rascunho', 'cancelada'].includes(c.estado));
  const jogo = L.filter(c => ['aberta', 'breve', 'a_fechar'].includes(c.estado)), fim = L.filter(c => c.estado === 'fechada');
  const admSec = adm() ? `<section class="se-sec se-admsec" id="seAdm"><h3>${UI.ic('shield')}Gerir prémios</h3>${S.form ? formHTML() : `<button type="button" class="btn pri" data-act="seNova">${UI.ic('plus')}Nova campanha</button>`}
      ${L.filter(c => ['rascunho', 'cancelada'].includes(c.estado)).map(cartao).join('')}<p class="mut se-leg">Só a administração vê esta secção e os rascunhos.${pub.length ? '' : ' A seele aparece no menu de toda a gente assim que publicares a primeira campanha.'}</p></section>` : '';
  return `<div class="se-pg">${hero()}${numeros(L)}
    ${!d ? `<div class="pn"><p class="mut" style="margin:0">${S.err ? esc(S.err) : 'A abrir os prémios…'}</p></div>` : ''}
    ${meusHTML(L)}
    <section class="se-sec" id="sePremios"><h2 class="se-h2">Prémios em jogo</h2>${jogo.length ? `<div class="se-cs">${jogo.map(cartao).join('')}</div>` : `<div class="se-vazio">${borboletaMini()}<div><b>${d ? 'Os primeiros prémios estão a chegar.' : 'A abrir…'}</b><p>Quando houver um prémio em jogo, aparece aqui, no Ranking, nas Leituras e nos Jogos.</p></div></div>`}</section>
    ${caminhos(L)}${metamorfose()}
    ${fim.length ? `<section class="se-sec"><h2 class="se-h2">Vencedores</h2>${fim.map(vencHTML).join('')}</section>` : ''}
    ${sorteios()}${faq()}${admSec}${assinatura()}
  </div>`; };
const borboletaMini = () => `<img class="se-bfm" src="icons/seele-borboleta.webp" alt="" width="72" height="50" aria-hidden="true">`;
A.seIr = b => { const e = document.getElementById(b.dataset.alvo); if (e) e.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
OS.views.seele = view;

/* ---------- ações ---------- */
const achar = id => ((S.d && S.d.lista) || []).find(c => c.id === id);
A.seRegras = b => { const c = achar(b.dataset.id); if (!c) return; UI.modal(`<div class="se-modal"><div class="row between" style="align-items:center"><h3 style="margin:0">Regulamento</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div><p class="mut" style="margin:4px 0 0">${esc(c.titulo)}</p>${regras(c)}</div>`, 'se-mod'); };
A.seEntrar = b => { const c = achar(b.dataset.id); if (!c) return; const pf = (OS.one && OS.one('profile')) || {}, pais = pf.country === 'BR' ? 'BR' : pf.country === 'PT' ? 'PT' : (pf.country ? 'OUTRO' : 'PT');
  UI.modal(`<form class="se-modal" data-form="seEntrar"><input type="hidden" name="id" value="${esc(c.id)}"><div class="row between" style="align-items:center"><h3 style="margin:0">Participar</h3><button type="button" class="icon-btn" data-mclose aria-label="Fechar">${UI.ic('x')}</button></div>
    <p style="margin:6px 0 0"><b>${esc(c.titulo)}</b></p><p class="mut" style="margin:2px 0 0">${esc(comoGanha(c))} em ${esc(c.critN)}. Grátis.</p>
    <label class="se-fl">Onde vives<select class="field" name="pais"><option value="PT"${pais === 'PT' ? ' selected' : ''}>Portugal</option><option value="BR"${pais === 'BR' ? ' selected' : ''}>Brasil</option><option value="OUTRO"${pais === 'OUTRO' ? ' selected' : ''}>Outro país</option></select></label>
    <label class="se-ck"><input type="checkbox" name="idade" required>Tenho ${c.idade || 18} anos ou mais (ou autorização de quem tem a minha guarda).</label>
    <label class="se-ck"><input type="checkbox" name="regras" required>Li e aceito o regulamento.</label>
    <details class="se-rd"><summary>Ler o regulamento</summary>${regras(c)}</details>
    <div class="row gap8"><button class="btn pri">Participar</button><button type="button" class="btn ghost" data-mclose>Agora não</button></div></form>`, 'se-mod'); };
OS.forms = OS.forms || {};
OS.forms.seEntrar = async (f, v) => { const id = v('id'), c = achar(id); try { const j = await call('premioEntrar', { id, pais: v('pais'), idade: f.querySelector('[name=idade]').checked, regras: f.querySelector('[name=regras]').checked, livros: c && c.crit === 'livros' ? livrosDe(c) : undefined });
    UI.closeModal(); UI.toast('Estás dentro. Boa sorte!', 'pos'); if (j.campanha && S.d) { S.d.lista = S.d.lista.map(x => x.id === id ? j.campanha : x); OS.request(); } carregar(true); } catch (e) { UI.toast(e.message, 'neg'); } };
A.seAceitar = async b => { b.disabled = true; try { await call('premioAceitar', { id: b.dataset.id }); UI.toast('Prémio aceite. Parabéns!', 'pos'); if (OS.Vivo && OS.Vivo.confetti) OS.Vivo.confetti(); await carregar(true); carregarLeve(true); } catch (e) { UI.toast(e.message, 'neg'); b.disabled = false; } };
// administração
A.seNova = () => { S.form = { aberto: true }; OS.request(); };
A.seFormX = () => { S.form = null; OS.request(); };
A.seImgX = () => { if (S.form) { S.form = Object.assign({}, lerForm(), { img: '' }); OS.request(); } };
const lerForm = () => { const f = document.querySelector('form[data-form=seCampanha]'); if (!f) return S.form || {}; const g = n => (f.querySelector(`[name="${n}"]`) || {}).value || '';
  return { id: g('id'), titulo: g('titulo'), desc: g('desc'), img: g('img'), crit: g('crit'), modo: g('modo'), nV: +g('nV') || 1, qual: { tipo: g('qtipo'), n: +g('qn') || 10 }, autorizacao: g('autorizacao'),
    premios: [0, 1, 2].map(i => ({ t: g('pt' + i), s: +g('ps' + i) || 0 })).filter(p => p.t || p.s), ini: g('ini'), fim: g('fim'), idade: +g('idade') || 18, paises: [...f.querySelectorAll('[name=pais]:checked')].map(x => x.value), aberto: true }; };
OS.forms.seCampanha = async () => { const x = lerForm(); try { const j = await call('adminPremio', { acao: 'guardar', id: x.id || undefined, dados: x }); S.form = null; UI.toast(x.id ? 'Campanha guardada.' : 'Rascunho guardado. Revê e publica quando estiver pronto.', 'pos'); await carregar(true); return j; } catch (e) { UI.toast(e.message, 'neg'); } };
A.seAdm = b => { const id = b.dataset.id, ac = b.dataset.acao, c = achar(id);
  if (ac === 'editar') { if (c) { S.form = Object.assign({}, c, { aberto: true }); OS.request(); setTimeout(() => { const f = document.querySelector('form[data-form=seCampanha]'); if (f) f.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); } return; }
  const TXT = { publicar: ['Publicar a campanha?', 'Fica visível para todas as contas e a seele aparece no menu de toda a gente. Depois de publicada já não se edita.', 'Publicar'], apagar: ['Apagar o rascunho?', 'Não dá para desfazer.', 'Apagar'], cancelar: ['Cancelar a campanha?', 'Deixa de estar em jogo e ninguém ganha. Avisa quem estava a participar.', 'Cancelar campanha'], fechar: ['Fechar já e apurar?', 'A campanha termina agora com os pontos atuais e os vencedores ficam à espera da tua confirmação.', 'Fechar e apurar'] }[ac];
  if (!TXT) return; UI.ask(TXT[0], TXT[1], TXT[2], async () => { try { const j = await call('adminPremio', { acao: ac, id }); UI.toast(ac === 'fechar' ? `Apurada: ${j.venc || 0} ${j.venc === 1 ? 'vencedor' : 'vencedores'} à espera de confirmação.` : 'Feito.', 'pos'); await carregar(true); carregarLeve(true); } catch (e) { UI.toast(e.message, 'neg'); } }); };
A.seVenc = b => { const { id, acao, eu, n } = b.dataset;
  const go = async motivo => { try { const j = await call('adminPremio', { acao, id, eu, motivo }); UI.toast(acao === 'confirmar' ? 'Vencedor confirmado: recebe o aviso na app e por e-mail.' : acao === 'excluir' ? (j.suplente ? `Excluído. Entrou o suplente ${j.suplente}.` : 'Excluído. Não há mais suplentes.') : 'Marcado como entregue.', 'pos'); await carregar(true); } catch (e) { UI.toast(e.message, 'neg'); } };
  if (acao === 'excluir') return UI.ask('Excluir ' + n + '?', 'Perde o prémio (por exemplo, batota ou não aceitou a tempo) e entra o suplente seguinte.', 'Excluir', () => go('Excluído pela administração'));
  if (acao === 'confirmar') return UI.ask('Confirmar ' + (n || 'este vencedor') + '?', 'Recebe os Selos do prémio (se houver), uma medalha e um aviso para aceitar o prémio.', 'Confirmar', () => go()); go(); };
// mostrar ou esconder os campos do sorteio; a imagem do prémio (reduzida a 640 px)
document.addEventListener('change', e => { const t = e.target;
  if (t && t.name === 'modo' && t.closest('form[data-form=seCampanha]')) { const q = t.form.querySelector('.se-fq'); if (q) q.hidden = t.value !== 'sorteio'; }
  if (t && t.matches && t.matches('input[data-seimg]') && t.files && t.files[0]) { const file = t.files[0], u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
      let q = .82, d = cv.toDataURL('image/jpeg', q); while (d.length > 230000 && q > .4) { q -= .1; d = cv.toDataURL('image/jpeg', q); } S.form = Object.assign({}, lerForm(), { img: d }); OS.request(); };
    im.onerror = () => { URL.revokeObjectURL(u); UI.toast('Não deu para ler a imagem.', 'neg'); }; im.src = u; } });

/* ---------- ligações ao resto do app: faixas no Ranking, nas Leituras e nos Animes ---------- */
const faixa = crits => { const L = ((S.leve && S.leve.ativas) || []).filter(c => crits.includes(c.crit)); if (!L.length) return '';
  return L.slice(0, 2).map(c => `<a class="se-fx" href="#seele">${marca()}<span><b>${esc(c.titulo)}</b><small>${c.estado === 'breve' ? 'Começa a ' + dLonga(c.ini) : faltam(c.fim)} · ${esc(c.modo === 'sorteio' ? 'sorteio' : 'por mérito')}${c.premio ? ' · ' + esc(c.premio) : ''}</small></span><em>Ver o prémio</em></a>`).join(''); };

/* ---------- a entrada no menu, no grupo Parceria (com o aviso de prémio por aceitar) ---------- */
const pend = () => (S.d && S.d.pend) || (S.leve && S.leve.pend) || 0;
const nav = () => { const N = OS.NAV; if (!N) return; const g = N.find(x => x[0] === 'Parceria'); if (!g) return;
  const i = g[1].findIndex(x => x[0] === 'seele'), v = ve();
  if (v && i < 0) { g[1].push(['seele', 'seele', 'borboleta', () => pend() ? [pend(), 'pos'] : null]); OS.request && OS.request(); }
  else if (!v && i >= 0) { g[1].splice(i, 1); OS.request && OS.request(); } };
if (OS.Acc) { const A0 = OS.Acc.navAdm; OS.Acc.navAdm = () => { if (A0) A0(); nav(); carregarLeve(false); }; }
OS.on('ready', () => { nav(); setTimeout(() => carregarLeve(false), 2500);
  // nos Jogos (a página dos Animes da PHANTOM): o prémio dos jogos em cima da grelha
  setTimeout(() => { const j = OS.views.jogos; if (!j || j._se) return; const f = sub => { const h = j(sub); if (sub) return h; const fx = faixa(['animes']); if (!fx) return h; const k = '<div class="jg-g">', i = h.indexOf(k); return i < 0 ? fx + h : h.slice(0, i) + fx + h.slice(i); };
    f._se = 1; f._j2 = j._j2; f._ds = j._ds; OS.views.jogos = f; }, 1800); });
OS.Seele = { ve, nav, faixa, carregar, carregarLeve, _S: S };
})();
