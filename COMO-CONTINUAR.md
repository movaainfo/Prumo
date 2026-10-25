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
- `js/religiao.js` (`OS.Rel`): as religiões (Católica, Evangélica, Ortodoxa, Espírita, Islâmica, Judaica, Hindu, Budista,
  Umbanda/Candomblé, espiritualidade sem religião, Nenhuma), o livro de cada uma por língua (`LIBS`), o texto do dia, os planos,
  as orações, as práticas guiadas (terço, Oração de Jesus, tasbih, japa, meditação, metta, Evangelho no Lar, Shemá, Orixá do dia)
  e os painéis do dia (horários de oração e Qibla, Shabat, lua, Orixá).
- `js/faith.js`: a aba Fé, que usa `OS.Rel`. Sem religião escolhida fica como sempre foi (Bíblia Livre / Almeida, 66 livros).
- A escolha fica em `OS.one('faith').rel` (Definições › Tu › Fé e religião, ou no questionário inicial). "Nenhuma" esconde a aba Fé.
- Os livros estão em `standalone/vendor/sagrado/` e as ferramentas que os fizeram em `standalone/textos-sagrados/` (ver o LEIA-ME de lá).
- Testes: `node suite.js --only=religiao`.

## Ranking e dias de foco
- `js/ranking.js` (`OS.Foco`): a pontuação de disciplina de cada dia (0–100: entrar 20, tarefas e hábitos do dia até 65, tudo concluído 15;
  sem nada marcado vale 40), guardada em `OS.one('foco').dias`. Dia de foco = 60 pontos ou mais; os dias seguidos são a sequência ("Dia 5 de foco"),
  com o fogo no topo, no Hoje e no Painel, e uma celebração quando o dia passa a contar.
- Servidor (`api/conta.js`): `op: 'rank'` guarda os últimos 8 dias do perfil em `r/<conta>/<perfil>` (o passado não se muda);
  `op: 'ranking'` devolve a lista de todos os perfis (sem identificadores; as contas `@nautilo.test` não aparecem). Só leitura: sem perfis nem mensagens.
- Definições › Tu › Ranking: "Mostrar o meu nome" (sem isto aparece como "Pessoa anónima").
- Testes: `node suite.js --only=ranking`.
