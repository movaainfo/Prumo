// PRUMO · páginas públicas dos documentos legais (para o Google, lojas e links): os mesmos textos de js/legal.js,
// cada um com endereço próprio (/privacidade, /termos, /cookies, /direitos, /acessibilidade, /creditos).
// Uso: node standalone/legalpages.js <pasta de saída>
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const out = process.argv[2] || 'dist-gh', src = fs.readFileSync(path.join(__dirname, '..', 'js', 'legal.js'), 'utf8');
const OS = { on: () => { }, act: {}, forms: {} };
const ctx = { OS, document: { addEventListener: () => { }, baseURI: 'https://prumo-vida.vercel.app/' }, fetch: () => Promise.reject(new Error('sem rede')), URL, console };
vm.createContext(ctx); vm.runInContext(src, ctx);
// o selo e o nome do logo (js/marca.js)
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'marca.js'), 'utf8'), ctx);
const M = OS.Marca;
const L = OS.Legal, links = [['planos', 'Planos e preços']].concat(L.DOCS).map(([k, t]) => `<a href="/${k}">${t}</a>`).join('');
const page = (k, t, body) => `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t} · Prumo</title>
<meta name="description" content="${t} do Prumo."><link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#070D16;color:#C9D2DD;font:15.5px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{border-bottom:1px solid rgba(170,195,225,.14);padding:18px 16px}header .w{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
@font-face{font-family:"Bodoni Moda";src:url(/vendor/fonts/bodoni-moda.woff2) format("woff2");font-weight:400 900;font-display:swap}.brand{display:inline-flex;align-items:center;gap:10px;color:#ECE7DE;text-decoration:none;font:500 26px/1 "Bodoni Moda",Didot,Georgia,serif}.brand img{display:block}.w{max-width:820px;margin:0 auto}
nav{display:flex;flex-wrap:wrap;gap:6px}nav a{color:#A9B6C6;border:1px solid rgba(170,195,225,.2);border-radius:999px;padding:6px 11px;font-size:13px;text-decoration:none}nav a[aria-current]{color:#F5E2C8;border-color:rgba(242,196,141,.55);background:rgba(242,196,141,.12)}
main{padding:28px 16px 64px}h1{font:italic 500 38px/1.1 Georgia,"Times New Roman",serif;color:#F1F4F8;margin:0 0 6px}section{max-width:70ch;margin:0 0 22px}
h3{color:#F1F4F8;font-size:16px;margin:0 0 6px}a{color:#F2C48D}ul{padding-left:20px}li{margin:0 0 4px}.lg-meta{font-size:13px;color:#7A8BA0}
table{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 12px}th,td{text-align:left;vertical-align:top;padding:9px 8px;border-top:1px solid rgba(170,195,225,.14)}th{color:#A9B6C6;font-size:12.5px}
@media (max-width:620px){thead{display:none}tr{display:block;padding:8px 0;border-top:1px solid rgba(170,195,225,.14)}td{display:block;border:0;padding:2px 0}td[data-l]::before{content:attr(data-l) ": ";color:#7A8BA0;font-weight:600}}
a:focus-visible{outline:2px solid #F2C48D;outline-offset:2px}footer{max-width:820px;margin:0 auto;padding:0 16px 40px;font-size:13px;color:#7A8BA0}</style></head>
<body><header><div class="w"><a class="brand" href="/" aria-label="Prumo, abrir a app"><img src="${M.selo}" width="32" height="32" alt=""><img src="${M.nome}" height="19" width="80" alt=""></a><nav aria-label="Documentos">${links.replace(`href="/${k}"`, `href="/${k}" aria-current="page"`)}</nav></div></header>
<main><div class="w"><h1>${t}</h1>${(body || L.html(k)).replace(/<a href="#" data-lgl="([a-z]+)">/g, '<a href="/$1">').replace(/ em Definições › Privacidade e termos/g, ' na app, em Definições › Privacidade e termos')}</div></main>
<footer>Prumo · <a href="/">Abrir a app</a></footer></body></html>`;
L.DOCS.forEach(([k, t]) => fs.writeFileSync(path.join(out, k + '.html'), page(k, t)));
// Planos e preços (público: o que o Stripe e a lei pedem que se veja antes de pagar). Os planos e os textos vêm de api/_planos.js e js/planos.js
{ const PL = require(path.join(__dirname, 'api', '_planos.js')), ps = fs.readFileSync(path.join(__dirname, '..', 'js', 'planos.js'), 'utf8'), m = ps.match(/const FEAT = (\{[\s\S]*?\] \});/);
  const FEAT = vm.runInNewContext('(' + m[1] + ')'), esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (c, cur) => (c / 100).toLocaleString(cur === 'BRL' ? 'pt-BR' : cur === 'USD' ? 'en-US' : 'pt-PT', { style: 'currency', currency: cur });
  const card = p => `<section class="pl"><h3>${p.n}</h3><table><thead><tr><th>Moeda</th><th>Mensal</th><th>Anual (2 meses grátis)</th></tr></thead><tbody>${PL.MOEDAS.map(c => `<tr><td data-l="Moeda">${{ EUR: 'Euro', USD: 'Dólar', BRL: 'Real' }[c]}</td><td data-l="Mensal">${fmt(p.precos[c].mes, c)}</td><td data-l="Anual">${fmt(p.precos[c].ano, c)}</td></tr>`).join('')}</tbody></table><ul>${FEAT[p.lvl].map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>`;
  const body = `<p class="lg-meta">O Prumo é uma app de organização pessoal: dinheiro, estudos, treino, metas e um jogo de progresso, num só sítio. Funciona no navegador e no ecrã principal do telemóvel.</p>
<section><h3>Teste grátis</h3><p>Ao criar a conta tens <b>${PL.TESTE_DIAS()} dias grátis do plano Completo</b>, sem cartão. No fim escolhes um plano; se não escolheres, os teus dados ficam guardados e podes exportá-los ou apagar a conta.</p></section>
${PL.planos().map(card).join('')}
<section><h3>Pagamento e cancelamento</h3><ul><li>Os preços já têm os impostos incluídos. Paga-se com cartão (também Apple Pay e Google Pay) pelo Stripe, em <b>euros, dólares ou reais</b>; se o teu cartão for de outra moeda, o teu banco faz a conversão.</li><li>A assinatura renova-se sozinha no fim de cada mês ou ano. Avisamos antes de qualquer mudança de preço.</li><li><b>Cancelas quando quiseres</b>, na app (Planos) ou no portal do cliente: o plano continua até ao fim do período pago e depois não renova.</li><li>Mudar de plano acerta a diferença de forma proporcional.</li><li><b>Reembolso:</b> tens 14 dias (União Europeia) ou 7 dias (Brasil) para desistir da primeira assinatura e receber o dinheiro de volta.</li></ul></section>
<section><h3>Contacto</h3><p>Dúvidas, pedidos ou reembolsos: na app, em Definições › Privacidade e termos › Fazer um pedido${L.info.contacto ? `, ou pelo e-mail <b>${esc(L.info.contacto)}</b>` : ''}. Os detalhes estão nos <a href="/termos">Termos de Serviço</a> (secção 9) e na <a href="/privacidade">Política de Privacidade</a>.</p></section>`;
  fs.writeFileSync(path.join(out, 'planos.html'), page('planos', 'Planos e preços', body).replace('<style>', '<style>.pl{max-width:none;border:1px solid rgba(170,195,225,.16);border-radius:14px;padding:14px 16px;margin:0 0 14px}.pl h3{font-size:19px}')); }
console.log('páginas legais:', ['planos'].concat(L.DOCS.map(d => d[0])).map(d => '/' + d).join(' '));
