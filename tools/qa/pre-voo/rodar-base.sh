#!/bin/sh
# PRÉ-VOO · LINHA DE BASE — roda as suítes já existentes do piloto (caneta, layout, sistema, navegação, capa, conteúdo solto, corrida, tinta×salto, portão de flags)
# e imprime UMA linha por suíte: código de saída + a última linha com a contagem. Quem for ativar uma matéria roda isto ANTES e DEPOIS: as duas listas têm de ser iguais.
# Uso (da raiz do repositório):  NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/rodar-base.sh [pasta-de-logs]
# Somente leitura: Supabase/flags simulados, zero rede externa. Não altera nada no repositório (logs vão para a pasta indicada, padrão /tmp/pre-voo-base).
LOGS="${1:-/tmp/pre-voo-base}"; mkdir -p "$LOGS"
Q=tools/qa; B=$Q/browser-qa/layout
SUITES="
pilot-flags:$B/pilot-flags.test.cjs
layout:$B/layout.test.cjs
sistema:$B/sistema.test.cjs
nav-sistema:$B/nav-sistema.test.cjs
cover:$B/cover.test.cjs
soltos:$B/soltos.test.cjs
race:$B/race.test.cjs
ink-jump:$B/ink-jump.test.cjs
caneta-novo-layout:$B/caneta-novo-layout.test.cjs
caneta-456:$Q/caneta-456/caneta-456.test.cjs
caneta-ipad-456:$Q/caneta-ipad-456/ipad.test.cjs
"
FALHOU=0
for item in $SUITES; do
  nome="${item%%:*}"; arq="${item#*:}"
  node "$arq" > "$LOGS/$nome.log" 2>&1; cod=$?
  resumo=$(grep -E "verifica|OK|FALHA|passou|falhou|[0-9]+/[0-9]+" "$LOGS/$nome.log" | tail -1 | cut -c1-110)
  printf '%-20s saída=%s  %s\n' "$nome" "$cod" "$resumo"
  [ "$cod" -ne 0 ] && FALHOU=$((FALHOU+1))
done
echo "suítes com saída ≠ 0: $FALHOU (compare com a lista de falhas CONHECIDAS no plano — caneta-novo-layout tem 2 de tolerância do post-it, #464)"
exit 0
