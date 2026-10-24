#!/bin/sh
# PRÉ-VOO · PORTA DE UMA MATÉRIA — tudo o que uma matéria tem de passar ANTES de o slug entrar na lista do servidor (e de novo DEPOIS, na mesma commit).
# Uso (da raiz do repositório):  NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh <slug> [--corr|--sem-corr]
# Saída: uma linha por etapa (PASSA/FALHA) e o código de saída 1 se QUALQUER uma falhar. Somente leitura (Supabase simulado, zero rede externa, nenhuma flag tocada).
SLUG="$1"; [ -z "$SLUG" ] && { echo "uso: porta-da-materia.sh <slug>"; exit 2; }
MODO="${2:---corr}"; R=0
# ensaio.cjs e interacao.cjs saem com código 0 mesmo quando há FALHA: a decisão sai do resumo impresso («… → N verificações · M FALHA»)
passo_ensaio() { nome="$1"; shift; "$@" > "/tmp/porta-$SLUG-$nome.log" 2>&1; if grep -Eq "→ [0-9]+ verificações · 0 FALHA" "/tmp/porta-$SLUG-$nome.log"; then echo "PASSA  $nome"; else echo "FALHA  $nome  ($(grep -E "→ [0-9]+ verificações" "/tmp/porta-$SLUG-$nome.log" | tail -1 | cut -c1-110))"; R=1; fi; }
passo() { nome="$1"; shift; if "$@" > "/tmp/porta-$SLUG-$nome.log" 2>&1; then echo "PASSA  $nome"; else echo "FALHA  $nome  (veja /tmp/porta-$SLUG-$nome.log)"; R=1; fi; }
passo 0-inventario-em-dia  python3 -I tools/qa/pre-voo/inventario-fresco.py "$SLUG"
passo 0b-marcadores-no-html python3 -I tools/qa/pre-voo/agrega-no-html.py "$SLUG"
passo 1-ancoras-estaveis   node tools/qa/pre-voo/ancoras-estaveis.cjs "$SLUG"
passo 2-ida-e-volta        node tools/qa/pre-voo/ida-e-volta.cjs "$SLUG"
passo_ensaio 3-layout-4-larguras  env RM_ENSAIO_OUT="/tmp/porta-$SLUG-ensaio" node tools/qa/ensaio-layout/ensaio.cjs "$SLUG" $MODO
passo_ensaio 4-uso-caneta-modos   env RM_ENSAIO_OUT="/tmp/porta-$SLUG-uso" node tools/qa/ensaio-layout/interacao.cjs "$SLUG" --rapido
passo 5-inventario-risco   sh -c "python3 -I tools/qa/pre-voo/inventario-risco.py --vivo docs/pre-voo-caneta-layout/dados-vivos.json | grep -F '(\`$SLUG\`)' | grep -v 'fora do padrão\|duplicado\|aninhada'"
echo "---"; [ $R -eq 0 ] && echo "PORTA ABERTA para $SLUG (isto NÃO liga nada: falta o roteiro físico de 3 min e a ordem de José)" || echo "PORTA FECHADA para $SLUG"
exit $R
