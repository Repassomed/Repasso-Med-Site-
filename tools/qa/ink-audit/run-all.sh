#!/usr/bin/env bash
# Roda as 6 suítes da auditoria da caneta. Pré-requisitos: ver README.md (banco isolado, playwright, supabase-js UMD, módulo pg).
set -u
cd "$(dirname "$0")"
: "${RM_SUPABASE_UMD:?defina RM_SUPABASE_UMD (supabase.js UMD)}"
fail=0
for t in 01-rls 02-persistence 03-failures 04-pagination 05-viewports 06-volume; do
  echo; echo "################ $t"; node "$t.test.cjs" || fail=$((fail+1))
done
echo; echo "suítes com falha de asserção: $fail"; exit $fail
