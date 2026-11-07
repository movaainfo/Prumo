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
