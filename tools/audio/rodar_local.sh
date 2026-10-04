#!/usr/bin/env bash
# Linux/macOS: processa os masters em lote (mesmo fluxo do rodar_local.ps1). Só LÊ os masters; saída fora do repositório; nada é enviado.
# Uso:  bash tools/audio/rodar_local.sh <pasta-dos-m4a> <pasta-de-trabalho-fora-do-git> <pasta-do-modelo-sherpa-onnx-whisper-small> [semiologia-ii.html]
set -euo pipefail
PASTA="${1:?uso: rodar_local.sh <pasta-dos-m4a> <pasta-de-trabalho> <pasta-do-modelo> [semiologia-ii.html]}"
TRAB="${2:?falta a pasta de trabalho}"
MODELO="${3:?falta a pasta do modelo (release sherpa-onnx-whisper-small do GitHub, ver LEIAME)}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
case "$(cd "$TRAB" 2>/dev/null && pwd || echo "$TRAB")" in "$RAIZ"*) echo "RECUSADO: a pasta de trabalho está dentro do repositório."; exit 2;; esac
MATERIA_ARG=(); [ -n "${4:-}" ] && MATERIA_ARG=(--materia "$4")
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' || { echo "FALHOU: precisa de Python 3.10+"; exit 3; }
python3 "$AQUI/processar_masters.py" --verificar-ambiente --modelo "$MODELO" "${MATERIA_ARG[@]}" || { echo "FALHOU: ambiente incompleto (pip install -r $AQUI/requirements.txt). Nada foi processado."; exit 3; }
python3 "$AQUI/processar_masters.py" --pasta "$PASTA" --trabalho "$TRAB" --modelo "$MODELO" "${MATERIA_ARG[@]}"
EXEC="$(ls -d "$TRAB"/execucao-* | sort | tail -n 1)"
for f in RELATORIO-REAL.md vinculos-evidencia.json vinculos.json inventario.json tratados/relatorio.json tratados/relatorio.md; do [ -f "$EXEC/$f" ] || { echo "FALHOU: saída ausente: $f"; exit 4; }; done
python3 "$AQUI/empacotar_retorno.py" --execucao "$EXEC"
echo "Pronto: $EXEC (nada foi enviado; escuta_humana_ok continua false)."
