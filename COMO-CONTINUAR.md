# Prumo · código-fonte

Este ramo (`codigo-fonte`) tem o código do Prumo. O ramo `main` tem só o site publicado (gerado a partir daqui).

## Gerar o site
```
./standalone/build.sh && python3 standalone/single.py   # cria dist-gh/ (a versão sobe sozinha)
```
As notas da versão vão em `standalone/notes.txt` (uma por linha).
Para fixar um número de versão: em `standalone/version.json` põe `"n"` (2.43 = 143) e `"hash": ""`.

## Testar
```
cd standalone/test && NODE_PATH=$(npm root -g) node suite.js              # tudo, ~35 min, Playwright
cd standalone/test && NODE_PATH=$(npm root -g) node suite.js --only=linguas,contas   # só alguns grupos
```
Não voltes a gerar o site enquanto os testes correm (eles servem a pasta `dist-gh/`).

## Publicar
Copiar o conteúdo de `dist-gh/` para a raiz do ramo `main` (manter o `vercel.json`) e enviar.
A Vercel (projeto `prumo`) publica a partir do GitHub em https://prumo-vida.vercel.app
(o endereço antigo https://nautilo-app.vercel.app continua a funcionar).

## Línguas
O app é escrito em português de Portugal; `js/lingua.js` traduz o ecrã na hora com um dicionário por língua.
- `standalone/i18n/extract.js` tira do código todos os textos do ecrã para `standalone/i18n/strings.json` (corre no build).
- Os dicionários que vêm com o app estão em `standalone/i18n/packs/` (pt-BR, en, es, fr, it, de).
  As outras línguas são preparadas pela IA no servidor (`standalone/api/lingua.js`) na primeira vez que alguém as escolhe.
- Quando há textos novos:
  1. publica a lista nova (basta enviar `i18n/strings.json` para o `main`; o app no ar não muda);
  2. `node standalone/i18n/packgen.js` (traduz só o que falta, com uma conta temporária que apaga no fim);
  3. `python3 standalone/i18n/packfix.py`;
  4. gera o site e testa.
- `js/pais.js`: países, moedas, feriados, escalas de notas e unidades.

O perfil pessoal do Ryan e o modo local ficam sempre em português de Portugal e euros.

## Religiões (aba Fé)
- `js/religiao.js` (`OS.Rel`): só as religiões principais (Católica, Evangélica, Islâmica, Judaica, Hindu, Budista e Nenhuma),
  o livro de cada uma por língua (`LIBS`), o texto do dia, os planos, as orações, as práticas guiadas (terço, tasbih, japa, meditação,
  metta, Shemá) e os painéis do dia (horários de oração e Qibla, Shabat, lua).
- Na leitura, tocar num versículo mostra a explicação da IA, fiel à tradição escolhida (guardada neste aparelho).
- `js/faith.js`: a aba Fé, que usa `OS.Rel`. Sem religião escolhida fica como sempre foi (Bíblia Livre / Almeida, 66 livros).
- A escolha fica em `OS.one('faith').rel` (Definições › Tu › Fé e religião, ou no questionário inicial). "Nenhuma" esconde a aba Fé.
- Os livros estão em `standalone/vendor/sagrado/` e as ferramentas que os fizeram em `standalone/textos-sagrados/` (ver o LEIA-ME de lá).
- Testes: `node suite.js --only=religiao`.

## Ranking e dias de foco
- `js/ranking.js` (`OS.Foco`): a pontuação de disciplina de cada dia (0–100, só conta o que se faz: tarefas e hábitos até 50 — por inteiro só com
  5 ou mais marcados —, tudo concluído 10, tempo de foco até 20, treino/corrida/desporto 10, leitura ou devocional 10), guardada em
  `OS.one('foco').dias`. Dia de foco = 70 pontos ou mais; os dias seguidos são a sequência ("Dia 5 de foco"),
  com o fogo no topo, no Hoje e no Painel, e uma celebração quando o dia passa a contar.
- Servidor (`api/conta.js`): `op: 'rank'` guarda os últimos 8 dias do perfil em `r/<conta>/<perfil>` (o passado não se muda);
  `op: 'ranking'` devolve a lista de todos os perfis com pontos (quem está a zero não aparece; sem identificadores; as contas `@nautilo.test` não
  aparecem), com a foto pequena do perfil (56 px). Só leitura: sem perfis nem mensagens. As regras de 2.48 valem desde `NAUTILO_RANK_DESDE` (25/10/2026).
- Definições › Tu › Ranking: "Mostrar o meu nome" (sem isto aparece como "Pessoa anónima").
- Testes: `node suite.js --only=ranking`.

## Novidades da 2.48 (onde estão)
- `js/curriculo.js`: Carreira e contactos › Currículo (PDF, foto ou texto; análise e comparação com uma vaga pela IA).
- `js/coachai.js`: Treino › Análise da IA e Dieta › Análise da IA.
- `js/ligar.js`: caderno de erros ligado a "O que estudar hoje", flashcards e Dominus; "O app inteiro" no Painel.
- `js/onboard.js` (`OS.Areas.prune`): o que tem `data-area="…"` sai do ecrã quando essa área está desligada (Definições › O teu Prumo).
- `js/mundo.js`: cidadania, passaporte, residência e visto por país; a lista abre por continente.
- `js/spotify.js`: o tocador no canto (com conta: PKCE; sem conta: o tocador do Spotify). Só para o administrador e até 4 contas que ele escolhe
  no Admin (`op: 'adminSpotify'`, lista em `cfg/spotify`); a resposta `eu` diz `sp` e traz a Client ID só a essas contas. Para as outras nem aparece.
  A Client ID (pública) vem de `SPOTIFY_CLIENT_ID` no Vercel; o CSP deixa `https://open.spotify.com` em `frame-src`.
- `js/fundos.js` + `js/scene.js` + `css/forte.css`: todos os fundos animados (tempos por elemento em `--du`/`--dl`).
- `js/vivo.js`: confetes, "+N de foco", chama viva, anel que enche.
- Admin: `op: 'adminApagar'` em `api/conta.js` (só administradores, com a senha deles; não apaga a própria conta nem outro administrador).
- Spyke (`js/brain.js`, `js/ear.js`, `api/ia.js`): com `ANTHROPIC_API_KEY` no Vercel o Spyke pensa com o Claude (o SDK oficial passa pelo servidor;
  `NAUTILO_CLAUDE_MODEL`, `NAUTILO_CLAUDE_DIA`), o Gemini faz a pesquisa no Google; com `GROQ_API_KEY` (ou `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`,
  `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`) o que se diz é transcrito por um ouvido dedicado. Sem estas chaves fica tudo como antes (Gemini).

## Novidades da 2.53 (onde estão)
- **Rotina por horas** (`js/rotina.js`): Hábitos e rotina › Rotina desenha o dia numa linha de horas (`OS.Rotina.segs(diaDaSemana)`), com espaços livres, sobreposições lado a lado, blocos que passam da meia-noite, adicionar rápido (`OS.forms.rtAdd`), copiar/limpar dia, modelos, "feito hoje" (`r.log`), ligação a um hábito (`r.habit`) e aviso na hora (`r.warn`, toast + notificação com a app aberta). Hoje mostra "Agora: … até …". Os blocos já iam para o Calendário (`Cal.items`) e para o Google Calendar (`calpush.js`, 3 semanas à frente).
- **Metas** (`js/metas.js`): substitui `Goal.info` (estados: No ritmo só com avanço medido; Por começar; Em andamento; Atrás do ritmo; Atrasada) e `V.metas`. `Goal.act(meta, desde)` junta o que se fez por cada meta (tarefas, blocos da rotina, estudo, treinos, horas de trabalho, poupança, hábitos). Saldo/patrimônio/carteira/média/contactos/certificações contam a partir de `g.base0` (guardado ao criar a meta).
- **Dominus** (`js/dominus3.js`): XP grande só pelo avanço nas metas (registo diário em `OS.one('dominus').gp`, `D.snapGoals`), etapas, marcos, tarefas/projetos ligados e metas cumpridas; o resto vale 40% (8% numa área sem meta). Missões valem menos.
- **Capital profissional** (`js/capital.js`): substitui `Car.capital`; as dimensões de que as metas profissionais falam contam a dobrar e há a dimensão "Metas profissionais".
- **Jornal** (`js/news.js`): Mundo › Destaques usa as manchetes principais de cada edição; mais recentes primeiro; "Última hora"; com conta usa `api/noticias` (cache 75 s). Cada tema do resumo abre a fundo (`NW.deep`) com a avaliação da IA.
- **IA faz coisas** (`js/brain.js`): ferramentas `criar_registo`, `editar_registo`, `apagar_registo` (confirmação no ecrã) para as coleções em `EDIT`. `OS.BrainTool(nome, args)` corre uma ferramenta (testes).
- **Admin em tempo real**: `uso` grava `u.ab` (entrada no app), `u.on` (presença), `u.tot` e `u.pf` (minutos por perfil); `adminVivo` (a cada 20 s). Ranking mostra `tm` (minutos no app do perfil; não conta para os pontos).
- **Investimentos**: navegação em 4 blocos (`NAVG` em `js/invest.js`).
- **Movimento**: o modo leve automático (`html.lite`) já não desliga animações; só `html.lite-x` (Leve escolhido ou "reduzir movimento") desliga. Troca de páginas com View Transitions (`js/app.js`).

### 2.53 (segunda parte): Dominus ligado às metas, Projeto de Vida, masmorras
- Missões do dia/semana/mês geradas das metas ativas: `js/dominus3.js` (`genIds`, `mev`, `misHist`); ids `g:<meta>:<tipo>:<x>` e `v:<tipo>` (sem metas).
- Chefe da semana guarda uma meta (`bossOf` → `gid`); colosso só com avanço real (peso 10% para o resto). Eventos com `g` = id da meta; `pre` = já feito antes (não fere chefes).
- Projeto de Vida (1000 objetivos do Ryan, só na conta dele): `js/vidadata.js` (lista, dificuldade, atributo, ligações ao Codex em `OS.VIDAX`) e `js/vida.js` (verificação pelos registos, por confirmar, tornar meta, revisão anual, importar lista).
- Masmorras (5 andares + chefe, círculos sem fim, Abismo sem fundo): `D.dungeons`, `floorAt`, `badges` em `js/dominus3.js`; salas desenhadas em `js/masmorras.js` (24 temas).
- Monstros: gerador por peças em `js/monstros.js` (`TORSO`, `HEAD`, `ARMS`, `LEGS`, `build`, `pickSeq`, `genCircle`, `colAt`), 96 px; nenhum par corpo+cabeça repetido nos 114 com nome; poder sobe sempre (`powOf`).
- Testosterona (simulação + análises): `js/testo.js`, painel em Treino › Peso.
- Voz: o eco da própria voz já não pausa a fala (limiar `echoT`, 1,5 s de aquecimento por pedaço em `js/ear.js`; entrada/saída suave em `wav()` de `js/spyke.js`).
- IA: `consultar` tem `dominus`, `projeto_de_vida`, `sono`, `corpo`, `rotina`, `capital_profissional`, `mundo` (`js/brain.js`).
- Página Eu: botão "Quando eu partir" (ainda sem função).
- Testes: grupo `vida` em `standalone/test/suite.js`.
- Publicado a 4/11/2026 (v2.88, depois de a equipa MOVAA passar a Pro), com as traduções pt-BR dos textos novos.

### Intro ao abrir
- `js/intro.js` corre logo a seguir ao `#splash` (antes dos outros scripts) e monta a intro com as imagens do próprio ecrã de carregamento (selo, nome, lema) mais o prumo, a gota, o carimbo e o círculo de medida desenhados lá. A coreografia é toda em `css/intro.css` (tempos no comentário do topo; só transform e opacity).
- `PrumoIntro.wait(cb)`: `js/app.js` só chama `OS.Lock.gate` depois da intro e de ~1,1 s do ecrã de carregamento (que volta a entrar com `html.intro-after`).
- Uma vez por sessão (`sessionStorage nau:introOk`); `nau:intro` = sempre | dia | nunca; não aparece com reduzir movimento nem no modo Leve (`lite-x`). `window.__noIntro` desliga-a (os testes fazem isto em todos os contextos; os da intro usam `RAWCTX`). Testes: `--only=intro`.

- Som: `js/introsom.js` (carrega antes de `js/intro.js`) sintetiza a música com Web Audio, a tempo de `css/intro.css`, e grava-a de antemão num só som (`PrumoIntroSom.render(sr)` → AudioBuffer) gravado como ficheiro **`standalone/som/intro.mp3`** (vai com o app e fica na cache offline): o app só toca este ficheiro num `Audio` normal, começado dentro do toque (`touchend`/`click`). **Quando a música mudar em `js/introsom.js`, corre `NODE_PATH=/opt/node22/lib/node_modules node standalone/gensom.js`** para gerar o MP3 de novo. Se o ficheiro falhar, a intro grava a música ali mesmo (WAV em memória, `PrumoIntroSom.wav`). Ao vivo com Web Audio, no iPhone, só se ouvia um estalo ou o primeiro sino. O som mudo `SILENT` arma o áudio no toque quando a música ainda não está pronta; ao abrir, um `play()` do som mudo diz se o áudio pode tocar sozinho. Pensada para o altifalante do telemóvel: notas entre 200 Hz e 5 kHz, saída com corte de sub-grave, presença, compressor e limitador; a música de fundo vai por `bed` (mais baixa) e os golpes direto. Mede-se com um passa-altos de 300 Hz (o teste da intro faz isto). Com som (`nau:introSom`, ligado por omissão) e sem o áudio livre, a intro fica parada em "Toca para começar" (`#intro.in-wait`) até um toque (`pointerup`/`click`, que desbloqueia o áudio no iPhone); onde o áudio é livre, começa logo (espera até 0,4 s pelo `resume()`). `PrumoIntro.audio()` diz o estado do áudio; `window.__introTap` força o ecrã do toque nos testes.

### Cores do app (paletas)
- `js/paleta.js` corre no `<head>` (o build.sh põe-no lá) e muda as cores azuis das folhas de estilo no próprio sítio (CSSOM), pelo papel de cada azul: fundo escuro, cinzento, destaque claro, botão. A ordem e a força das regras não mudam. As cores fora do azul (verde, vermelho, âmbar, violeta) ficam iguais.
- Paletas em `LIST` (Selo por omissão, Mar = o tema base sem mudanças, Floresta, Ametista, Café, Grafite). `PrumoPaleta.apply(id)`, `.color(id, cor)`, `.recolor(svg)` (as cenas do fundo, em `js/cores.js`).
- `js/cores.js`: o painel "Cores do app" (`#palSet`, grupo Aplicação), a escolha por perfil em `nau:pal:<perfil>` e a última em `nau:pal` (o `<head>` usa esta para abrir já com as cores certas). Testes: `--only=cores`.
- Cores novas no CSS: escreve no azul do tema base (ex.: `#0E1724`, `#8FB8E8`, `#2B5C93`) e as paletas tratam do resto.

### Logo (selo de cera)
- O logo é o selo de cera vermelho com o P e os louros (pacote `prumo_logo_pack`). `js/marca.js` (gerado, não editar à mão) tem `OS.Marca.selo`, `.nome` e `.lema` em data URLs (SVG).
- `OS.Lock.logo(px)` desenha o selo, `OS.Lock.word(altura, alt)` o nome "Prumo" com as letras do logo e `OS.Lock.lema(altura)` "Foco · Disciplina". O ecrã de abertura em `index.html` tem as mesmas imagens.
- Ícones em `standalone/icons/`: `apple-touch-icon.png` (quadrado, o iPhone arredonda), `icon-192/512.png` (cantos arredondados), `icon-maskable-512.png` (selo a 84% sobre o papel, dentro da zona segura), `favicon-32.png` e `selo-96.png` (páginas legais e o regresso do Google).

### 2.96: o que o Vercel Pro permite (IA mais inteligente)
- `standalone/vercel.json`: `api/ia.js` e `api/lingua.js` com `maxDuration: 300` (antes 60, limite do plano grátis).
- `standalone/api/ia.js`: Gemini espera até 90 s por modelo (os "pro" pensam mais; antes 40 s), Claude até 280 s e até 32 000 tokens de saída (antes 55 s e 8 000), reserva grátis 90 s.
- `standalone/api/lingua.js`: cada lote de tradução tem 170 s (80 s por modelo).
- `js/bioai.js`: `AI.deep(pergunta)` reconhece perguntas difíceis (análises, planos, decisões, comparações, previsões); `AI.order(lista, deep)` põe os 2 modelos "pro" mais novos à frente. `AI.json(parts, temp, { deep: 1 })` e `AI.text(prompt, { deep: 1 })`.
- Chamadas a fundo marcadas com `deep`: análise da bioimpedância, planos de treino/dieta e perguntas ao treinador, currículo, plano de vida, biografia e capítulos, decisões (análise) e evolução, diagnóstico do estudo, oportunidades, simuladores, resumo aprofundado do jornal, plano de desporto.
- `js/brain.js`: o Spyke usa `deep` nas perguntas difíceis (Gemini "pro" primeiro; até 8 voltas de ferramentas). Claude: `timeout` 300 s, `max_iterations` 10, e nas perguntas difíceis `effort: 'medium'` e 16 000 tokens (nas simples `low` e 8 000). Erro de rede num modelo do Gemini passa ao seguinte.
- `js/conta.js`: sincronização entre aparelhos a cada 30 s com a app à vista (antes 90 s).
- O maior salto de inteligência é ligar o Claude: o dono põe `ANTHROPIC_API_KEY` no Vercel (Settings › Environment Variables, Sensitive, Production) e faz Redeploy. Pago por uso à Anthropic; limite por pessoa e por dia em `NAUTILO_CLAUDE_DIA` (120); modelo em `NAUTILO_CLAUDE_MODEL` (por omissão Sonnet 5.5).
- Testes: grupo `pro` em `standalone/test/suite.js` (9 testes). Falhas que já existiam: `direcao` (4, o câmbio real do dia) e `novidades` › "execução da bateria".

### 2.97: Spyke com as cores do tema; Júlio Verne e Homero no Mundo
- `js/paleta.js`: `PrumoPaleta.tone(r, g, b)` dá uma cor do tema base na paleta atual ("r,g,b", para canvas). `KEEP`: regras que a paleta não toca (o mapa do mundo e o mapa da Odisseia ficam sempre com o mar azul: o Ryan não quis o mapa vermelho).
- `js/spyke.js`: `OS.aiCol()` (cores do Spyke na paleta). A bola da conversa respira sempre que a conversa está aberta (antes parava), ondas ao ritmo do microfone (`OS.Ear.level`), três cometas a pensar, duas ondas a falar, faíscas ao acordar. Canvas à densidade do ecrã (até 2×).
- `js/jarvis.js` (Modo Comando): núcleo com halo a respirar, régua a rodar, marcador, cometas nos anéis, anéis pontilhados, partículas, radar com ecos, ondas de sonar, faíscas, varrimento; reage ao estado do Spyke. Ao abrir: cartões com varrimento e cantos a encaixar, título a escrever-se, números a contar (`countUp`, recomeça se o painel se redesenhar), relógio com os dois pontos a piscar. `prefers-reduced-motion` e "Leve" respeitados.
- `js/mundo.js`: frase do dia (alterna Verne e Homero; tocar muda), rota de Phileas Fogg no mapa (projeção Natural Earth, `proj`), símbolos desenhados (`SYM`: navio, comboio, elefante, galera; nada de emojis), relógio dos 80 dias (`foggDial`, ponteiros às 20h45), as 8 etapas do Morning Chronicle (cap. III), nota de bordo do dia ganho; a viagem de Odisseu (`ODI`, 12 episódios com o canto e onde a tradição os põe) num mapa do Mediterrâneo (`odiMap`); marcos "Os 80 de Fogg", "11/11 rota de Fogg" e "5/5 Odisseu"; notas no país (`FOGGN`, `ODIN`). Frases verificadas no original (Gutenberg #800 e #1727, Butler), traduzidas por nós.
- O aviso ao marcar um país ou ilha diz o XP que o Dominus deu mesmo (antes prometia +900/+300; desde o Dominus exigente a rotina vale ~72).
- Testes: grupos `nucleo` e `verne`. Falha que já existia: `fundo` › "Escolher Cidade" (os fundos vão ser refeitos).

### 2.98: Administração — repor senha e mudar e-mail
- `standalone/api/conta.js`: `adminSenha` (senha temporária `tempPw` ou escolhida; `trocar=1`, `tv++`, aviso), `senhaTroca` (só com `trocar`), `adminEmail` (grava `a/<novo>`, apaga `a/<antigo>`, `x/<antigo>` aponta para o novo para os atalhos do iPhone, lista do Spotify atualizada). `pub()` leva `trocar` e `avisos` (últimos 5).
- `standalone/api/atalho.js`: se `a/<id>` não existir, segue `x/<id>`.
- `js/conta.js`: ecrã "Escolhe uma senha nova" (`gMode='trocar'`), avisos da administração uma vez por aparelho (`nau:avisos:<email>`), formulários na ficha da conta (ADM) e cartão do cofre (`admVault` abre Senhas › Senha mestra e segurança).
- O cofre de Senhas de outra pessoa não se muda nem se abre (cifrado no aparelho dela): só o próprio cofre.
- Política de Privacidade (secção 3) diz que a administração pode repor a senha ou mudar o e-mail.
- Testes: grupo `admsenha` (cria o seu próprio administrador).

### 2.99: Troféus e medalhas; Top 10 da vida
- `js/trofeus.js` + `css/trofeus.css` (todas as contas): coleção `trophies` (título, tipo, metal/nível, lugar, área, data, evento, história, foto em data URL até 720 px, `fav` = peça de honra). Peças desenhadas em SVG (`ART`: Troféu, Medalha, Placa, Certificado, Distinção; metais em `MET`, fitas por área em `RIB`; não mudam com a paleta). Separador "Troféus" em Quem sou eu (`T.trofeus` em `js/me.js`) e cartão no Retrato. Prateleira "Medalhas do Prumo" com `OS.Dom.achievements()`.
- `js/study.js`: Leituras › "Top 10 da vida" (`LT_.top`), guardado em `one('booktop').list` (a ordem é o lugar; `tier` S/A/B/C ou pelo lugar). Pódio, tier list, setas para mudar a ordem, sugestões da estante (4–5 estrelas), copiar a lista. Máximo 10.
- Testes: grupos `trofeus` e `toplivros`.

### 3.0: Lista de compras ligada à Dieta (perfil pessoal)
- `js/compras.js`: página `#mercado` (no menu Eu; `#compras` continua a ser a "Pensar antes de comprar" das Finanças). Só no perfil pessoal: `PERSONAL` em `js/onboard.js` esconde-a nas contas públicas e a vista recusa.
- `one('shop')`: `items` [{ name, auto (da dieta), qty, unit g/ml/un/porções/pacotes, sec, pic, photo, have, got, lock (quantidade mudada à mão), note }], `prices` por nome normalizado { pack, price }, `view` mês/semana, `base` { days }.
- `fromDiet()`: refeições dos últimos 30 dias → média por dia registado × dias do mês; gramas arredondadas a 50, ovos em unidades (55 g), líquidos em ml; secções por categoria da base de alimentos (`secOf`). "Atualizar com a dieta" mantém os itens à mão, os preços, as quantidades trancadas e os comprados do mês.
- `version.py`: a partir de n=200 a versão é 3.x (3.0 = n 200).
- Testes: grupo `mercado`.

### 3.1: Universidade arrumada
- `js/unilayout.js` (carrega depois de todos os módulos da Universidade): `GROUPS` (Visão geral, O curso, Avaliações, Estudar) e redefine `V.universidade` com os grupos (`nav.ug`) e os separadores de cada grupo (`nav.tabs.ug-t`, os dos outros grupos ficam `hidden`, para os testes de rotas os continuarem a ver). Separador novo em `OS.UT` que não esteja nos grupos vai para "Estudar". `OS.ui.uniG` lembra o último separador de cada grupo.
- A Visão geral é recomposta por blocos a partir do HTML de cada módulo (classes `uv-*`, `un-today`, `hw-vis`); o que não for reconhecido fica no fim.
- Testes: grupo `unilayout`. Falhas que já existiam: `faltas` (3, datas relativas a hoje que caem no feriado de 1 de novembro).

### 3.2: Fundos de lugares do mundo
- `js/fundos.js`: ficam `farol` e `liso`; as cenas antigas (ondas, serra, cidade, chuva, dunas, pinhal, estrelas, aneis) saíram (quem as tinha escolhido volta ao Farol). Novas: `rio`, `lisboa`, `paris`, `aurora` (sempre de noite), `fuji`, `gize`, `novaiorque`. Céu da hora (`S.pal`), cores convertidas para a paleta (o `cores.js` passa o SVG por `PrumoPaleta.recolor`).
- Animações novas em `css/forte.css`: `.fd-line` (bondinho) e `.fd-fall` (pétalas); usam também `fd-fly`, `fd-bob`, `fd-tw`, `fd-spin`, `fd-aur`, `fd-shoot`, `fd-blink`, `fd-glow`, `fd-sand`, `fd-heat`, `fd-shim`.
- Testes: grupo `lugares` (e `fundo` atualizado).

### 3.3: Auditoria das contas (tudo o que é para todas as contas)
- Teste novo, grupo `publico`: cria uma conta pública nova (pela api/conta), abre todas as páginas e separadores (170), verifica que nada sai para o lado no telemóvel, que não aparece nada do perfil pessoal (nome, ISCA, Aveiro, Lista de compras), carrega ~550 botões seguros sem erros de JavaScript e abre todos os formulários. Usa-o depois de qualquer mudança grande.
- Corrigido: o texto de exemplo das Oportunidades (`js/views-work.js`) já não fala da UA nem de Aveiro numa conta pública (`OS.Acc.pub`).
- Corrigido: Jornal (`js/news.js`, `NW.fetch`): se o script Google não devolver uma das secções pedidas, essa secção conta como buscada (fica o que já havia). Antes, o ecrã voltava a pedir tudo sem parar e a lista estava sempre a ser redesenhada (era a falha antiga do teste das Novidades). Teste: "a app não fica a pedir tudo sem parar".
- Corrigido: o anel do botão flutuante do Spyke (`#jvFab i`, `css/fit.css`) rodava sem parar em todas as páginas (o teste do iPhone "sem animações infinitas" falhava). Agora só roda com `html.spy-ear` (enquanto ouve). O teste passa a dizer qual é o elemento (`who`).
- Corrigido: a página Eu e os Troféus tinham os blocos colados (`.me>*+*{margin-top:16px}` em `css/trofeus.css`).
- Corrigido: Boas-vindas numa conta pública não mostra a Lista de compras para escolher (`groups()` em `js/onboard.js` tira o que está em `PERSONAL`).
- Corrigido: Investimentos › Carteira saía para o lado no telemóvel. A classe `.inv-g` servia para duas coisas: os grupos da Carteira (`section.inv-g`) e os cartões dos 4 blocos (`a.inv-g`, v2.53); o estilo dos cartões (flex) apanhava os grupos. Os estilos dos cartões passam a `a.inv-g`.
- Testes que dependem do relógio ou do câmbio ficaram tolerantes: Núcleo (de madrugada o Dia está em 0%), anexo J (±2 € do EUR/USD ao vivo). Continuam a falhar por razões do ambiente de teste: `direcao` (4, câmbio ao vivo), `faltas` (3, feriado de 1 de novembro), `geral` (CORS do script TESTE, às vezes).
- Check-up com `CKSHOT=<pasta fora do repositório>` (grava capturas lá): o que sai para o lado mostra também os elementos à volta (display e largura). `CKP=iPhone` corre só um aparelho.

### 3.4: Roscas no sítio
- `js/ui.js` `donut()`: os anéis coloridos já não usam `transform="rotate(-90 …)"`; começam às 12 horas com `stroke-dashoffset = C2/4 - acc`. Antes, a animação de entrada (`css/vivo.css`, `.chart svg circle` com `transform-box:fill-box; transform-origin:center`) mudava o centro da rotação e o anel descia um diâmetro (190 px) — via-se no iPhone. A regra passa a `circle:not([transform]):not([stroke-dasharray])`.
- Universidade › Sessões: o centro da rosca mostra décimas abaixo de 10 h; a coluna Tipo mostra "—" quando a sessão não tem tipo.
- Teste: grupo `unilayout`, "a rosca das horas fica no sítio" (força `vv-full` + `pg-in` e compara os centros dos anéis).

### 3.5: Futebol (Visão Geral, todas as contas)
- `js/futebol.js` + `css/futebol.css`, página `#futebol` (separadores: Agora, `equipas`, `campeonatos`; detalhe em `futebol.equipa` com `OS.ui.fbT` e `futebol.campeonato` com `OS.ui.fbC`). Menu: Visão geral, em `CORE`, com o número de jogos ao vivo das tuas equipas (`OS.Futebol.liveN`).
- Dados: API pública da ESPN, sem chave (pesquisa `site.web.api.espn.com/apis/search/v2`, calendário `…/soccer/<liga>/teams/<id>/schedule` (+`?fixture=true`), `…/scoreboard`, `…/summary?event=` (lances, estatísticas, forma, confronto direto, odds em `pickcenter`), tabelas `apis/v2/sports/soccer/<liga>/standings`, símbolos das ligas em `sports.core.api.espn.com/v2/sports/soccer/leagues/<liga>`).
- Plano B no servidor: `api/futebol.js` (só endereços de futebol da ESPN, só a própria app, cache curta na CDN). O app tenta direto e, se falhar, passa 10 min pelo servidor. A ESPN (Akamai) recusa o Chromium sem cabeça (HeadlessChrome) com 403, por isso nos testes com dados reais tudo passa pelo servidor; o Chrome e o Safari normais recebem os dados diretamente.
- Guardado: `one('fut')` (`teams`, `comps`, `av` = avisos). No aparelho: `oc_fut_lg` (competições de cada equipa, 12 h), `oc_fut_snap`, `oc_fut_seen` (para os avisos), `oc_fut_feed`, `oc_fut_logo`, `oc_fut_qt` (sugestões com escudo).
- Competições de cada equipa: a liga principal + taças e provas continentais do país (`CUPS`, `NAT` para seleções), verificadas uma vez por dia. Nomes em português em `LG` (ligas) e `CTYD` (seleções; a pesquisa aceita o nome em português, `CTY`).
- Probabilidade de ganhar: odds do mercado quando a ESPN as tem (`pickcenter`, sobretudo ligas europeias); senão estimativa com tabela + forma + fator casa (Poisson); ao vivo junta o resultado e o tempo que falta. Diz sempre a fonte.
- Análise da IA (`aiRun`/`aiBox`): só a pedido (botão "Analisar o jogo" no detalhe), com `OS.AI.json(…, { deep: 1 })`; recebe só os dados reais do jogo (`aiCtx`: tabela, últimos 5, confronto direto, probabilidade calculada e, ao vivo, resultado, minuto, lances e estatísticas) e devolve favorito, % casa/empate/fora, veredicto, razões, "atenção" e confiança. Guardada em `oc_fut_ai` (antes do jogo vale até ao apito; ao vivo pode repetir-se ao fim de 5 min ou quando o resultado muda). O veredicto aparece também no placar.
- Avisos: `tick()` a cada 30 s com jogos ao vivo (60 s perto do início, 5 min no resto); começo, golo (com quem marcou), intervalo, fim. Só com o app aberto (no computador/Android também em segundo plano). Push com o app fechado ainda não.
- Autogolos: só pelo tipo do lance (o texto dos cartões diz "is shown" e enganava).
- Enquanto se escreve na pesquisa, o módulo não redesenha a página (redesenha ao sair do campo).
- Paleta: o relvado, o "ao vivo", as cores V/E/D, as medalhas e o cabeçalho nas cores do clube estão no `KEEP` de `js/paleta.js`.
- Testes: grupo `futebol` (ESPN simulada: pesquisa, seleção pelo nome em português, ao vivo, probabilidade, golo → aviso, fim, cromos, tabela, grupos, detalhe do jogo, odds, telemóvel). `FBLIVE=1 … --only=futebol` corre o mesmo com a ESPN a sério.

### 3.6: Futebol — jogadores, escalações, IA com pesquisa e zonas das tabelas
- Zonas: `ZC` (cores próprias, bem distintas) e `zcat` (categoria a partir da descrição traduzida); `ZRULE` dá as zonas habituais quando a ESPN não as marca (Brasileirão, Série B, Liga MX), com a nota "podem mudar com os campeões das taças". Linha com barra, posição na cor da zona, fundo suave e separador entre zonas; legenda por cima.
- Plantel (`loadRoster`, `…/teams/<id>/roster`): por posições (`posOfP`), número, idade, bandeira, jogos/golos/assistências, lesionados. Treinador, lesionados e castigados: `teamAI` com `OS.Brain.search` (pesquisa Google do Gemini, com fontes; `B.search` aceita agora `{ deep }`), guardado em `oc_fut_ti`.
- Escalações no detalhe do jogo: `lineupOf` (do `summary.rosters`, oficiais/em campo) ou `loadProbable` (os 11 mais frequentes nos titulares dos últimos 3 jogos, com um guarda-redes), desenhadas em `xiBox` (mini-campo).
- Análise da IA: agora pesquisa as notícias do jogo (`OS.Brain.search`, deep) quando há chave; recebe também escalação (oficial/provável), marcadores e lesionados da ESPN; devolve palpite de resultado, jogadores-chave e escalações prováveis com treinador e desfalques; mostra as fontes. Sem chave usa `OS.AI.json` sem pesquisa.
- `api/futebol.js`: 600 pedidos/min por endereço (abrir o Futebol pela primeira vez faz muitos pedidos).
- Testes: grupo `futebol` (30) e `FBLIVE=1` (13, com a ESPN a sério).

### 3.7: Fotos dos jogadores, jogo que não abria, análise sem falhas
- Fotos (`needPhotos`/`phImg`): a da ESPN (`headshot`, raramente existe) ou a da Wikipédia (`w/api.php?generator=search&prop=pageimages`, en e pt, com o nome + clube; só aceite se o título tiver o apelido). Guardadas em `oc_fut_ph` (sem foto volta a tentar ao fim de 14 dias). A Wikipédia bloqueia o servidor de testes (robot policy), mas responde aos aparelhos das pessoas; nos testes é simulada.
- Bug: uma análise guardada pela 3.5 (sem `chave`/`src`) fazia o detalhe do jogo dar erro e não abrir. `aiOf` normaliza as antigas; `A.fbMatch` procura o jogo em todo o lado (`evFind`) e `mSafe` mostra sempre o jogo, mesmo se uma parte falhar.
- Análise do jogo em cadeia: `OS.Brain.search` (Google com pesquisa, modelos rápidos primeiro: os "pro" gastam a cota grátis num instante) → `OS.AI.json` (Google sem pesquisa ou IA grátis de reserva, sem limite diário) → `localAI` (análise do Prumo sem IA: probabilidade, resultado mais provável por Poisson, tabela, forma, confronto direto, marcadores, escalações). A caixa diz qual foi usada.

### 3.8: Placar previsto pela IA em destaque
- `fixScore` valida o placar da IA (aceita 2-0, 2x0, 2×0, 2:0); se faltar, `bestScore` dá o resultado final mais provável (Poisson) a partir das probabilidades da IA; ao vivo nunca fica abaixo do resultado atual. Aparece em grande na análise (`.fb-aisc`), no placar (`Palpite da IA: 2×0`) e nos cartões de jogo (`.fb-mcai`).

### 3.9: Dominus com ecrãs de jogo; revisão anual da entrevista
- Dominus (`js/dominus3.js`, fim de `css/dominus3.css`, secção "v3.9 · ecrãs de jogo"): cada separador é um ecrã. Menu de jogo `.d3-nav` (nome do ecrã + setas ◀ ▶ + medalhões só com ícone; a fila mantém `.dtabs` para os testes que percorrem rotas). O Ryan não quer a grelha de botões com texto no telemóvel.
  - Herói: ficha (`.d3-id` com brasão `crest`, barra de XP em segmentos, recursos `.d3-res`, atributos com anel `ring`). Missões: batalha (`.d3-battle`: cena grande + corações `hearts`) e cartas `.d3-deck` (no telemóvel deslizam). Chefe: arena (`.d3-arena`, HUD de vida em segmentos). Masmorras: cartões-porta, a masmorra onde estás em grande (`.d3-dg.on`), insígnias em escudo. Conquistas: medalhas de metal (`.d3-medal`, cores `TIERC`). Baús: baú em pixel art (`chestSvg`), raridades `.r0`–`.r3`, inventário `.d3-slot`. Marcos: estrada (`.d3-path`). Diário: barras HTML e crónica por mês. Vida: os 10 eixos com anel.
  - Molduras: `.d3-card/.d3-fr/.d3-today` com linha dupla e cantos em L (`::before`).
  - Paleta: numa propriedade com `var()`, o motor de cores (`js/paleta.js`) não converte hex nem o atalho `background`. Usar `background-image` + `background-color` e `rgb()` dentro de `color-mix(...var...)`.
  - Cuidado com classes globais: `.lk` e `.boss` já existem noutros CSS (o cadeado usa `.lck`; as pílulas do chefe repõem `grid-template-columns`). Os blocos antigos tinham `justify-items:center` no telemóvel (a cena da batalha ficava com 0 px); corrigido com `.d3-battle,.d3-arena,.d3-hero{justify-items:stretch}`.
  - Capturas: `SHOTS=… node suite.js --only=domshots` (com `DOMK=heroi,chefe` para escolher ecrãs e `DOMEVAL='expr'` para inspecionar).
- Entrevista (Eu › Entrevista, `js/me.js`): cada resposta guarda o histórico por ano em `me().qaH[id] = [{y, d, a, ok}]` (`stamp`). A partir de 1 de janeiro, as respostas de anos anteriores ficam por rever nesse ano (`revDue`), por ordem, no topo da entrevista (`revCard`): "Ainda faz sentido" ou "Guardar a resposta de AAAA". As respostas antigas, sem histórico, contam como dadas em 2026: a primeira revisão abre a 1 de janeiro de 2027. Há um aviso na Visão Geral (`intel.js`, urgente a partir de fevereiro) e uma entrada no Retrato. Editar uma resposta nas respondidas conta como a resposta do ano. Testes: grupo `revisao` (9).


### 3.10: Lugares dentro de cada país e ilha
- `js/lugares.js` (depois de `ilhas.js`): coleção `places` = `{ where: 'BRA' | 'i:madeira', name, kind, status: Visitei|Morei|Quero ir, sub: 1 (estado/província), reg, lat, lng, date, with, notes }`. As chaves separam estado e cidade (`s|`/`c|`), porque há cidades com o nome do estado (Rio de Janeiro, São Paulo).
- Estados, províncias e regiões: `standalone/vendor/mundo/regioes.json` (Natural Earth admin-1 10m, domínio público, `name_pt` quando faz sentido; 4 526 em 251 países; gerado com o script descrito no commit da 3.10), carregado só quando é preciso (`regLoad`), por código de 2 letras (as ilhas com bandeira própria usam o seu).
- Página do país em `#mundo.BRA` (ilhas `#mundo.i.madeira`): mini-mapa (o maior pedaço do país, os vizinhos à volta; pontos = estados, losangos = cidades com coordenadas), formulário com sugestões do Open-Meteo (`countryCode`), cartões das cidades e a grelha dos estados (agrupada por região quando são mais de 24).
- Na página Mundo: secção "Cidades, estados e lugares", contagem no topo, botão no cartão de cada país e de cada ilha, e um pino com o número na lista dos países. XP: 15 de Mente por lugar conhecido (`dominus3.js`, fonte "lugares").
- Testes: grupo `paises` (14, com o Open-Meteo simulado).

### 3.11: Cozinha (despensa, lista e receitas) e Aprender a investir
- Cozinha (`js/cozinha.js`, rota `#cozinha` com `''`/`lista`/`receitas`; `#mercado` leva à lista; pessoal como a lista de compras, `PERSONAL` em `onboard.js`). Coleção `pantry` = `{ name, qty, unit, place, min, ideal, exp, note }`; estado `acabou|venceu|pouco|vence|ok`. A lista (`compras.js`, agora `OS.Compras.view(embed)`) desconta o que há em casa (`OS.Cozinha.stockOf`, g↔kg e ml↔L), mostra "Acabou em casa" (`needs`, "Comprei" repõe até `ideal`), e marcar comprado põe na despensa (`stockAdd`, `x.pan` para desfazer). Receitas: base de 38 (`R`, ingredientes reconhecidos por `ING`), "Fiz esta receita" desconta (lata = 400 g, pacote = 500 g), "Juntar o que falta" (`OS.Compras.addManual`) e receitas da IA (`OS.one('kitchen').ai`).
- Aprender a investir (`js/invguia.js`, separador `aprender` e 5.º bloco em `NAVG` de `invest.js`): 11 capítulos (`CH`), lidos em `OS.one('invlearn')`, país das regras `OS.ui.igC` (PT/BR), simulador `fv`, perfil `profOf`. Factos de nov. 2026: PT 28% (juros, mais-valias, dividendos), englobamento obrigatório <365 dias no último escalão, cripto isenta >365 dias, PPR 20% até 400/350/300 €, FGD 100 000 €, SII 25 000 €, Certificados de Aforro Série F (2,5% em nov. 2026); BR IR regressivo 22,5→15%, LCI/LCA/CRI/CRA isentas (MP 1.303 caducou), ações isentas até R$ 20 mil/mês, dividendos com 10% acima de R$ 50 mil/mês da mesma empresa (Lei 15.270), cripto isenta até R$ 35 mil/mês, exterior 15% (Lei 14.754), FGC R$ 250 mil.
- Testes: grupos `cozinha` (16) e `aprender` (10).

### 3.12: Banco (extratos e Open Finance) e calculadora flutuante
- Banco (`js/banco.js`, separador `banco` das Finanças em `views-money.js`, CSS `.bnk-*` no fim de `css/fit.css`; `.bk-*` já é dos livros). Importar extrato para todas as contas: OFX (FITID, conta, `LEDGERBAL`), QIF, CSV (separador, linha dos títulos e papel das colunas detetados; Windows-1252 quando não é UTF-8) e Excel (`vendor/xlsx.full.min.js`). Colunas: data, descrição, valor ou débito/crédito, saldo, moeda, id, estado, taxa, categoria e Tipo D/C. Pré-visualização com conta (ou "Criar conta nova"), moeda, mapa das colunas, "Inverter sinais" (ligado sozinho em faturas de cartão com >70% positivos) e acertar o saldo pelo do extrato (`setBal`, como "Saldo de hoje": `openDate` + `openSet`).
- Sem duplicados (`review`): 1.º o mesmo id (`t.ext`, ou `t.ext2` no lado de destino de uma transferência; sem id, `h:` + hash de data|valor|descrição|ocorrência); 2.º mesmo valor na mesma conta até 3 dias (o que foi escrito à mão). Transferências: saída numa conta e entrada noutra com o mesmo valor até 3 dias e uma descrição de transferência (`TRW`) ficam uma só Transferência; contra um movimento importado antes noutra conta, esse é convertido (`join`). Categorias: histórico (`key` da descrição; o que foi escrito à mão vale 3) → `RULES` (lojas de PT e BR, só categorias que existem; casam pelo início da palavra) → categoria do agregador → Outros › Diversos. Movimentos importados levam `src` (`extrato`/`banco`) e `note`.
- Ligação automática só na conta do dono (`NAUTILO_ADMIN`; os planos gratuitos só leem as contas do próprio): `api/banco.js` (maxDuration 120). Brasil: Pluggy com Meu Pluggy (`PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`; o Ryan cola o ID de cada item). Europa: Enable Banking em modo restrito (`ENABLEBANKING_APP_ID`, `ENABLEBANKING_KEY` = PEM, `\n` aceite; JWT RS256 com `kid` = id da aplicação; regresso `BANCO_REDIRECT`, por omissão `https://prumo-vida.vercel.app/api/banco`). Ligações cifradas em `b/<uid>/<pid>`. Ops: `estado`, `pg.add`, `pg.del`, `eb.bancos`, `eb.inicio` (state assinado, 20 min), GET `?code&state` (página "Banco ligado"), `eb.del`, `sync {from}`. No cliente: `OS.one('banklink')` = `{ map: {id do banco → id da conta | '-'}, accs, last, auto, gone }`; a cada 12 h ao abrir (não em testes); "Criar conta no Prumo" marca `bankAuto` (o saldo segue o do banco); o que se apaga de um sync fica em `gone` e não volta. Pendentes nunca entram.
- Calculadora (`js/calc.js`, `#calcFab` e `#calc`, CSS no fim de `fit.css`): parser próprio sem `eval` (multiplicação implícita, graus/radianos), RPN de 4 registos com TVM (n, i, PV, PMT, FV; guardar vs calcular pelo último toque), CF0/CFj/Nj/NPV/IRR, amortização price/SAC e gráfico em canvas. Estado em `localStorage` `oc_calc`.
- Pluggy: movimentos por `GET /v2/transactions` (cursor `after` lido de `next`; o `/transactions` antigo sai depois de 31/12/2026 e fica só como recurso se a v2 der 404/410).
- Testes: grupos `banco` (46, com a Pluggy e o Enable Banking simulados em `/pgmock` e `/ebmock`) e `calc` (16).
