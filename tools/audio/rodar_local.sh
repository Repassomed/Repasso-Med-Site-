#!/usr/bin/env bash
# Roda a preparação dos masters NA MÁQUINA DO JOSÉ (os masters reais não chegam ao ambiente do Claude).
# Uso:  bash tools/audio/rodar_local.sh ~/masters ~/audiobooks-tratados
# Os masters ficam só LIDOS; a saída tem de ficar FORA do repositório; nada é enviado a lugar nenhum.
set -euo pipefail
ORIGEM="${1:?uso: rodar_local.sh <pasta-dos-masters> <pasta-de-saida-fora-do-git>}"
SAIDA="${2:?uso: rodar_local.sh <pasta-dos-masters> <pasta-de-saida-fora-do-git>}"
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
case "$(cd "$SAIDA" 2>/dev/null && pwd || echo "$SAIDA")" in "$RAIZ"*) echo "RECUSADO: a saída está dentro do repositório."; exit 2;; esac
python3 - <<'PY' || { echo "Faltam dependências: pip install imageio-ffmpeg pystoi soundfile numpy scipy (ou ffmpeg no PATH)"; exit 3; }
import importlib
for m in ("numpy", "scipy", "soundfile", "pystoi"):
    importlib.import_module(m)
PY
echo "== 1/2 inspeção (só lê) =="
python3 "$RAIZ/tools/audio/preparar_audiobooks.py" inspecionar --origem "$ORIGEM"
echo "== 2/2 derivados 48/64 kbps + amostras + relatório =="
python3 "$RAIZ/tools/audio/preparar_audiobooks.py" preparar --origem "$ORIGEM" --saida "$SAIDA"
cat <<MSG

Pronto. Devolva ao Claude: $SAIDA/relatorio.md, $SAIDA/relatorio.json e a pasta $SAIDA/amostras/ (trechos curtos para escuta).
Depois: ouvir as amostras (1×, 2×, 2,5×), confirmar o bloco de cada áudio pelo CONTEÚDO e preencher vinculos.json
(modelo: tools/audio/vinculos.exemplo.json) — só então montar_manifesto.py e verificar_upload.py. Nada foi enviado.
MSG
