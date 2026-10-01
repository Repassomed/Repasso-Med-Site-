#!/usr/bin/env bash
# Sobe um Postgres 16 ISOLADO (porta 54329) e aplica o bootstrap + a migration REAL da caneta.
# Requer os binários do PostgreSQL 16 (initdb/pg_ctl/psql) e permissão para rodar como o usuário "postgres" (ou não-root).
# Nada aqui toca o Supabase de produção.
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}; DIR=${PGDIR:-/tmp/pgink}; PORT=${PGPORT_INK:-54329}
REPO=$(cd "$(dirname "$0")/../../../.." && pwd)
MIG="$REPO/Repasso-Med-Site--main/Atual - Copia/supabase/migrations/20260913_09_study_tools_v2.sql"
RUN=""; if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; fi
rm -rf "$DIR"; mkdir -p "$DIR"; [ -n "$RUN" ] && chown postgres:postgres "$DIR"
$RUN "$PGBIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=127.0.0.1 -c max_connections=200 -c fsync=off" -l "$DIR/pg.log" start >/dev/null
sleep 2
P="psql -h 127.0.0.1 -p $PORT -U postgres -q -v ON_ERROR_STOP=1"
$P -c "drop database if exists inktest" -c "create database inktest"
$P -d inktest -f "$REPO/tools/qa/ink-audit/db/bootstrap.sql" 2>&1 | grep -v NOTICE || true
$P -d inktest -f "$MIG" 2>&1 | grep -v NOTICE || true
echo "banco isolado pronto: postgres://postgres@127.0.0.1:$PORT/inktest"
