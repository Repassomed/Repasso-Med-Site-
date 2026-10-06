# Registra a SUA decisão depois de ouvir as amostras de UM áudio (um comando por áudio):
#   powershell -ExecutionPolicy Bypass -File tools\audio\aprovar_local.ps1 -Audio epoc -Bloco s2-b03 -Escutei
# -Audio: o id (ou parte do nome) que o RELATORIO-REAL.md mostra · -Bloco: o bloco da matéria que você OUVIU · -Escutei: sua aprovação (sem ele só grava a proposta, sem aprovar).
# Só este comando marca escuta_humana_ok; nada é automático. Não envia nada. Usa a pasta execucao-* mais recente em -Trabalho.
# STATUS: escrito e revisado, NÃO testado em Windows (validado em Linux/PowerShell 7).
param(
  [Parameter(Mandatory=$true)][string]$Audio,
  [Parameter(Mandatory=$true)][string]$Bloco,
  [switch]$Escutei,
  [string]$Titulo = '',
  [string]$AudioId = '',
  [int]$Kbps = 0,                                          # só se o relatório disser «NÃO APROVADA» (depois de ouvir): 48 ou 64
  [int]$Ordem = 0,                                         # só se dois áudios caírem no mesmo bloco
  [string]$Execucao = '',
  [string]$Trabalho = (Join-Path $env:USERPROFILE 'audiobooks-trabalho')
)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'; $env:PYTHONIOENCODING = 'utf-8'
function Falha([string]$Msg) { Write-Host ''; Write-Host "FALHOU: $Msg" -ForegroundColor Red; exit 1 }
try {
  $TrabalhoAbs = [System.IO.Path]::GetFullPath($Trabalho)
  $Py = Join-Path $TrabalhoAbs 'venv\Scripts\python.exe'
  if (-not (Test-Path -LiteralPath $Py)) { Falha "não achei o ambiente Python em $TrabalhoAbs\venv. Rode antes tools\audio\rodar_local.ps1." }
  if (-not $Execucao) {
    $ex = Get-ChildItem -LiteralPath $TrabalhoAbs -Directory -Filter 'execucao-*' -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
    if (-not $ex) { Falha "nenhuma pasta execucao-* em $TrabalhoAbs. Rode antes tools\audio\rodar_local.ps1." }
    $Execucao = $ex.FullName
  }
  $Script = Join-Path $PSScriptRoot 'aprovar_vinculos.py'
  if (-not (Test-Path -LiteralPath $Script)) { Falha "falta aprovar_vinculos.py ao lado deste script ($PSScriptRoot)." }
  $ArgsPy = @($Script, '--execucao', $Execucao, '--audio', $Audio, '--bloco', $Bloco)
  if ($Escutei) { $ArgsPy += '--escutei' }
  if ($Titulo) { $ArgsPy += @('--titulo', $Titulo) }
  if ($AudioId) { $ArgsPy += @('--audio-id', $AudioId) }
  if ($Kbps -gt 0) { $ArgsPy += @('--kbps', "$Kbps") }
  if ($Ordem -gt 0) { $ArgsPy += @('--ordem', "$Ordem") }
  $antes = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { & $Py @ArgsPy; $cod = $LASTEXITCODE } finally { $ErrorActionPreference = $antes }
  if ($cod -ne 0) { Falha "a aprovação não foi registrada (código $cod); leia a mensagem acima." }
  exit 0
}
catch { Falha $_.Exception.Message }
