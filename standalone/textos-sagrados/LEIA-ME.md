# Textos sagrados da aba Fé

Os livros que o app abre sem internet estão em `standalone/vendor/sagrado/*.json` (as Bíblias Livre e Almeida continuam em `vendor/biblia/`).
Formato (o mesmo do leitor da Bíblia):

```
{ n: nome, a: autoria e licença, l: língua, dir?: 'rtl', pre?: 1 (manter as quebras de linha), ai?: 1 (traduzido com IA),
  b: [[id, nome, abreviatura, [[versos do cap. 1], [cap. 2], …], títulos dos capítulos?, primeiro verso de cada capítulo?]] }
```

`js/religiao.js` diz que ficheiros cada religião usa em cada língua (`LIBS`); `"gita-XX|gita-en"` quer dizer: a versão na língua da pessoa, se existir, senão a inglesa.

## De onde vem cada um (domínio público ou licença livre)
- Bíblias: eBible.org (USFM) → `conv_bible.py` (porbrbsl, eng-web-c, engjps, spaRV1909, spablm, fraLSG, frasbl, deu1912, ita1927, hebwlc). `books.py` tem os códigos e os nomes dos livros.
- Alcorão: fawazahmed0/quran-api → `conv_quran.py`, e depois `simplifica_arabe.py` no árabe.
- Bhagavad Gita (Purohit Swami e sânscrito), Dhammapada (Müller), Tao Te Ching (Legge), Meditações (Long): Project Gutenberg e gita/gita → `conv_texts.py`.
- O Evangelho segundo o Espiritismo (trad. Guillon Ribeiro): PDF da FEB/UEL → `conv_ese.py`.
- Traduções que não existem em domínio público (ex.: Gita, Dhammapada, Tao e Meditações em português): `xlate.js` traduz por lotes com a IA
  (`POLL=1` usa a IA grátis da Pollinations e não gasta a cota do Gemini; `BATCH=3500` caracteres por pedido). Guarda o progresso em `<saída>.part.json`
  e cria `accounts.json` com contas temporárias quando usa a IA do Prumo (não enviar esse ficheiro para o GitHub).

Os ficheiros de origem (`src/`) não estão no repositório: os scripts dizem onde os ir buscar.
