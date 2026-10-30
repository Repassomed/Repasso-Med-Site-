#!/bin/sh
# SONDA DE PRODUÇÃO (somente leitura) — o que se pode saber de fora sobre o que está no ar, sem token de aluno e sem mudar nada.
# Uso: sh tools/qa/pre-voo/sonda-producao.sh https://<dominio-do-site> [slug]      (slug padrão: medicina-familiar)
# Prova: (1) o código no ar tem a 1.ª fechadura (CANDIDATAS) e a versão esperada; (2) o index.html aponta para a mesma versão;
#        (3) sem token, get-pilot-flags nega TUDO (layout/visual/pen/audio = false) e o corpo é igual ao de um slug inventado.
# NÃO prova: o estado das variáveis do Netlify para a conta de José (isso só se vê com o token dela ou no painel do Netlify).
BASE="${1%/}"; SLUG="${2:-medicina-familiar}"; R=0
[ -z "$BASE" ] && { echo "uso: sonda-producao.sh https://<dominio> [slug]"; exit 2; }
ok() { echo "PASSA  $1"; }; ko() { echo "FALHA  $1"; R=1; }
JS=$(curl -fsS -m 30 "$BASE/assets/rm-pilot.js" 2>/dev/null) || { echo "FALHA  não consegui baixar $BASE/assets/rm-pilot.js (rede/host bloqueado?)"; exit 1; }
echo "$JS" | grep -q "CANDIDATAS = \[[^]]*'$SLUG'" && ok "rm-pilot.js no ar lista '$SLUG' em CANDIDATAS" || echo "INFO   '$SLUG' NÃO está em CANDIDATAS no ar (1.ª fechadura fechada)"
echo "VER no ar: $(echo "$JS" | grep -o "var VER *= *'[0-9]*'" | head -1)"
IDX=$(curl -fsS -m 30 "$BASE/" 2>/dev/null); echo "tag no index: $(echo "$IDX" | grep -o 'rm-pilot.js?v=[0-9]*' | head -1)"
A=$(curl -sS -m 30 "$BASE/.netlify/functions/get-pilot-flags?slug=$SLUG" 2>&1); B=$(curl -sS -m 30 "$BASE/.netlify/functions/get-pilot-flags?slug=materia-que-nao-existe" 2>&1)
echo "sem token ($SLUG): $A"
[ "$A" = "$B" ] && ok "corpo sem token igual ao de slug inventado (nada vaza)" || ko "corpo difere entre slug real e inventado"
echo "$A" | grep -q '"layout":true\|"pen":true\|"visual":true\|"audio":true' && ko "alguma flag TRUE sem token" || ok "nenhuma flag true sem token"
exit $R
