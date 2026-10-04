# Processa os masters em lote NA MÁQUINA DO JOSÉ (Windows). Um comando:
#   powershell -ExecutionPolicy Bypass -File tools\audio\rodar_local.ps1 -Pasta "C:\...\audiobooks"
# Só LÊ os masters; tudo é gerado FORA do repositório (padrão: %USERPROFILE%\audiobooks-trabalho). Nada é enviado a lugar nenhum.
# NÃO TESTADO em Windows (validado apenas em Linux). Requer Python 3.10+ no PATH.
param(
  [Parameter(Mandatory=$true)][string[]]$Pasta,
  [string]$Trabalho = (Join-Path $env:USERPROFILE 'audiobooks-trabalho'),
  [switch]$Completo
)
$ErrorActionPreference = 'Stop'
$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$TrabalhoAbs = [System.IO.Path]::GetFullPath($Trabalho)
if ($TrabalhoAbs.StartsWith($Raiz, [System.StringComparison]::OrdinalIgnoreCase)) { throw "RECUSADO: a pasta de trabalho está dentro do repositório ($Raiz)." }
New-Item -ItemType Directory -Force -Path $TrabalhoAbs | Out-Null

$Venv = Join-Path $TrabalhoAbs 'venv'
if (-not (Test-Path (Join-Path $Venv 'Scripts\python.exe'))) { python -m venv $Venv }
$Py = Join-Path $Venv 'Scripts\python.exe'
& $Py -m pip install --quiet --upgrade pip
& $Py -m pip install --quiet sherpa-onnx imageio-ffmpeg pystoi soundfile numpy scipy

$Modelo = Join-Path $TrabalhoAbs 'sherpa-onnx-whisper-small'
if (-not (Test-Path (Join-Path $Modelo 'small-tokens.txt'))) {
  $Tar = Join-Path $TrabalhoAbs 'whisper-small.tar.bz2'
  Invoke-WebRequest -Uri 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2' -OutFile $Tar
  tar -xjf $Tar -C $TrabalhoAbs   # tar.exe já vem no Windows 10/11
}

$Args = @((Join-Path $Raiz 'tools\audio\processar_masters.py'))
foreach ($p in $Pasta) { $Args += @('--pasta', $p) }
$Args += @('--trabalho', $TrabalhoAbs, '--modelo', $Modelo)
if ($Completo) { $Args += '--completo' }
& $Py @Args
Write-Host "`nPronto. Devolva ao Claude: execucao-*\RELATORIO-REAL.md, vinculos-evidencia.json e a pasta tratados\amostras\ (nada foi enviado)."
