#!/usr/bin/env bash
# Prova o comando SQL de prévia (extraído do ROTEIRO e do Cartão de Merge) num Postgres 16 REAL e isolado (porta 54330):
# caso A = linha existente off|off|off; caso B = linha inexistente. Ambos devem terminar preview|preview|preview.
# Também prova a volta (off|off|off). Nada toca o Supabase de produção.
set -uo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}; DIR=/tmp/pgprevia; PORT=54330
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
MIG="$REPO/Repasso-Med-Site--main/Atual - Copia/supabase/migrations/20261030_01_rm_materia_rollout.sql"
DOC="$REPO/docs/nova-era/ROTEIRO-MEDICINA-FAMILIAR.md"
RUN=""; [ "$(id -u)" = "0" ] && RUN="runuser -u postgres --"
rm -rf "$DIR"; mkdir -p "$DIR"; [ -n "$RUN" ] && chown postgres:postgres "$DIR"
$RUN "$PGBIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=127.0.0.1 -c fsync=off" -l "$DIR/pg.log" start >/dev/null; sleep 2
P="psql -h 127.0.0.1 -p $PORT -U postgres -q -t -A -v ON_ERROR_STOP=1"
$P -c "create role authenticated nologin" -c "create role anon nologin" >/dev/null 2>&1
$P -f "$MIG" >/dev/null 2>&1 || { echo "FALHA: migração não aplicou"; $RUN "$PGBIN/pg_ctl" -D "$DIR/data" stop >/dev/null; exit 1; }
# extrai o 1.º bloco sql do ROTEIRO (seção 1) e o bloco de volta (seção 2)
CMD=$(awk '/^## 1 /{s=1} s&&/^```sql/{b=1;next} s&&b&&/^```/{exit} s&&b{print}' "$DOC")
VOLTA=$(awk '/^## 2 /{s=1} s&&/^```sql/{b=1;next} s&&b&&/^```/{exit} s&&b{print}' "$DOC")
F=0; ok(){ if [ "$2" = "$3" ]; then echo "OK   $1"; else echo "FALHA $1: obtido «$3» esperado «$2»"; F=$((F+1)); fi; }
q(){ $P -c "select layout_stage||'|'||pen_stage||'|'||visual_stage from rm_materia_rollout where slug='medicina-familiar'"; }
ok "linha inicial da migração = off|off|off" "off|off|off" "$(q)"
echo "$CMD" | $P >/dev/null; ok "caso A (linha existente off|off|off) → preview" "preview|preview|preview" "$(q)"
echo "$VOLTA" | $P >/dev/null; ok "volta → off|off|off" "off|off|off" "$(q)"
echo "$CMD" | $P >/dev/null; ok "reaplicar após volta → preview" "preview|preview|preview" "$(q)"
$P -c "delete from rm_materia_rollout where slug='medicina-familiar'"; ok "linha removida" "" "$(q)"
echo "$CMD" | $P >/dev/null; ok "caso B (linha inexistente) → preview" "preview|preview|preview" "$(q)"
echo "$CMD" | $P >/dev/null; ok "idempotente (2.ª execução)" "preview|preview|preview" "$(q)"
ok "nenhuma outra matéria criada" "1" "$($P -c 'select count(*) from rm_materia_rollout')"
# o mesmo comando deve aparecer idêntico no corpo da PR, se o arquivo for passado
if [ -n "${1:-}" ]; then
  norm(){ tr -d ' \n'; }
  PRC=$(awk '/^```sql/{b=1;next} b&&/^```/{exit} b{print}' "$1")
  ok "comando do Cartão de Merge = comando do roteiro" "$(echo "$CMD"|norm)" "$(echo "$PRC"|norm)"
fi
$RUN "$PGBIN/pg_ctl" -D "$DIR/data" stop >/dev/null
echo "sql-previa: $([ $F = 0 ] && echo 'todas OK' || echo "$F FALHAS")"; exit $F
