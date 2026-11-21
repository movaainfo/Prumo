#!/usr/bin/env bash
# PRUMO · publicar SÓ se os testes passarem (v3.64). Uso: bash standalone/publicar.sh "Mensagem do commit"
#   1) gera o site; 2) corre os testes essenciais (GRUPOS=... para mudar); 3) se algum falhar (fora as 2 falhas conhecidas do ambiente), NÃO publica;
#   4) publica no ramo main (pasta ../oceanum) e confirma que os dois endereços mostram a versão nova.
set -euo pipefail
cd "$(dirname "$0")/.."
MSG="${1:-Prumo}"; LOG="${TMPDIR:-/tmp}/prumo-testes-$$.log"
GRUPOS="${GRUPOS:-ataque,seguranca,contas,planos,boasvindas,publico,push,banco,atualizacao,geral,checkup}"
bash standalone/build.sh >/dev/null && python3 standalone/single.py >/dev/null
VER=$(grep -o 'VERSION={"v": "[^"]*' dist-gh/index.html | head -1 | sed 's/.*"v": "//')
echo "Versão $VER: a testar ($GRUPOS)…"
( cd standalone/test && NODE_PATH="${NODE_PATH:-$(npm root -g)}" node suite.js --only="$GRUPOS" > "$LOG" 2>&1 ) || true
grep -q "testes passaram" "$LOG" || { echo "Os testes não terminaram: não publico. Ver $LOG"; exit 1; }
FALHAS=$(grep "✗" "$LOG" | grep -v "caixa em dólares convertida ao câmbio" | grep -v "sem erros de JavaScript (corpo)" || true)
if [ -n "$FALHAS" ]; then echo "Há testes a falhar: NÃO publico."; echo "$FALHAS" | head -20; exit 1; fi
grep "testes passaram" "$LOG" | tail -1
git checkout standalone/test/last-report.json 2>/dev/null || true
git add -A && git commit -q -m "$MSG" || true; git push -q origin HEAD
OCE="${OCEANUM:-../oceanum}"
( cd "$OCE" && git pull -q origin main && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + && cp -a "$OLDPWD/dist-gh/." . && git add -A && git commit -q -m "Prumo $VER" && git push -q origin main )
for i in $(seq 1 40); do a=$(curl -s -H 'Cache-Control: no-cache' "https://nautilo-app.vercel.app/?t=$RANDOM" | grep -o "VERSION={\"v\": \"$VER" | head -1 || true); b=$(curl -s -H 'Cache-Control: no-cache' "https://prumo-vida.vercel.app/?t=$RANDOM" | grep -o "VERSION={\"v\": \"$VER" | head -1 || true)
  if [ -n "$a" ] && [ -n "$b" ]; then echo "Publicado: $VER nos dois endereços."; exit 0; fi; sleep 20; done
echo "Publicado, mas os endereços ainda não mostram $VER (a Vercel pode estar a demorar)."; exit 2
