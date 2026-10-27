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
