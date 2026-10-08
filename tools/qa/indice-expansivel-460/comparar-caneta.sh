#!/usr/bin/env bash
# Compara caneta-novo-layout.test.cjs com o rm-pilot.js DESTA branch (índice expansivo ligado) e com o da `main` (origem). Não altera o motor da caneta:
# só troca, temporariamente e com restauração garantida, o rm-pilot.js; as duas execuções ficam em $OUT. Uso: bash tools/qa/indice-expansivel-460/comparar-caneta.sh [pasta-de-saida]
set -u
cd "$(git rev-parse --show-toplevel)"
F="Repasso-Med-Site--main/Atual - Copia/assets/rm-pilot.js"; OUT="${1:-/tmp/caneta-cmp}"; mkdir -p "$OUT"; cp "$F" "$OUT/rm-pilot.branch.js"
trap 'cp "$OUT/rm-pilot.branch.js" "$F"' EXIT
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
echo "HEAD $(git rev-parse --short HEAD) · main $(git rev-parse --short origin/main)" > "$OUT/versoes.txt"
( cd tools/qa/browser-qa/layout && timeout 1500 node caneta-novo-layout.test.cjs > "$OUT/branch.log" 2>&1; echo "exit=$?" >> "$OUT/branch.log" )
git show origin/main:"$F" > "$F"
( cd tools/qa/browser-qa/layout && timeout 1500 node caneta-novo-layout.test.cjs > "$OUT/main.log" 2>&1; echo "exit=$?" >> "$OUT/main.log" )
cp "$OUT/rm-pilot.branch.js" "$F"
for k in branch main; do echo "== $k: $(grep -c '✗' "$OUT/$k.log") falhas · $(grep 'verificações OK' "$OUT/$k.log" | tail -1)"; grep '✗' "$OUT/$k.log" | sed 's/→.*//' ; done
