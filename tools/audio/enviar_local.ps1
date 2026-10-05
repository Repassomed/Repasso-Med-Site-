# Depois de ouvir e aprovar: monta o manifesto, confere os arquivos e (com -Enviar) sobe os DERIVADOS ao bucket PRIVADO `audiobooks` do Supabase. Um comando:
#   powershell -ExecutionPolicy Bypass -File tools\audio\enviar_local.ps1            (dry-run: confere tudo, NÃO envia)
#   powershell -ExecutionPolicy Bypass -File tools\audio\enviar_local.ps1 -Enviar    (envia; pede a chave service_role UMA vez, oculta)
# Os masters nunca sobem e nada é entregue ao Claude. Enviar ao Storage NÃO publica: o áudio só aparece depois de RM_AUDIO_MANIFEST/RM_PILOT_AUDIO_UIDS no Netlify (passo seu, separado).
# A chave service_role (Supabase ▸ Project Settings ▸ API ▸ service_role ▸ Reveal) é digitada/colada SÓ aqui, fica na memória deste processo e é apagada ao final. Nunca vai ao chat nem a arquivo.
# STATUS: escrito e revisado, mas NÃO FOI TESTADO em Windows (validado em Linux, inclusive PowerShell 7). Se algo falhar, copie a mensagem de erro (sem a chave).
param(
  [string]$Execucao = '',                                  # pasta execucao-… (padrão: a mais recente em -Trabalho)
  [string]$Trabalho = (Join-Path $env:USERPROFILE 'audiobooks-trabalho'),
  [string]$Url = 'https://ltizbamvskcgigmqobfo.supabase.co',   # projeto Supabase do site (única conta ativa); confira antes de -Enviar
  [switch]$Enviar,
  [switch]$Substituir                                      # só se quiser SOBRESCREVER um objeto existente de tamanho diferente
)
$ErrorActionPreference = 'Stop'

function Falha([string]$Msg) {
  Write-Host ''
  Write-Host "FALHOU: $Msg" -ForegroundColor Red
  Write-Host 'Nada foi publicado e seus áudios originais não foram alterados. Para retomar: corrija o problema acima e rode o MESMO comando (arquivos já enviados são pulados).' -ForegroundColor Yellow
  exit 1
}
function Nativo([string]$Exe, [string[]]$Argumentos, [string]$Etapa) {
  $antes = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { & $Exe @Argumentos; $cod = $LASTEXITCODE } finally { $ErrorActionPreference = $antes }
  if ($cod -ne 0) { Falha "$Etapa (código de saída $cod)." }
}

$chavePreenchidaAqui = $false
try {
  $Aqui = $PSScriptRoot
  $TrabalhoAbs = [System.IO.Path]::GetFullPath($Trabalho)
  $Py = Join-Path $TrabalhoAbs 'venv\Scripts\python.exe'
  if (-not (Test-Path -LiteralPath $Py)) { Falha "não achei o ambiente Python em $TrabalhoAbs\venv. Rode antes tools\audio\rodar_local.ps1 (ele cria o ambiente e processa os áudios)." }
  if (-not $Execucao) {
    $ex = Get-ChildItem -LiteralPath $TrabalhoAbs -Directory -Filter 'execucao-*' -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
    if (-not $ex) { Falha "nenhuma pasta execucao-* em $TrabalhoAbs. Rode antes tools\audio\rodar_local.ps1." }
    $Execucao = $ex.FullName
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Execucao 'vinculos.json'))) { Falha "falta vinculos.json em $Execucao." }
  if ($Url -notmatch '^https://[a-z0-9]{20}\.supabase\.co$') { Falha "-Url inválida ($Url): esperado https://<20 letras/números>.supabase.co." }
  $Lote = Join-Path $Aqui 'publicar_lote.py'
  if (-not (Test-Path -LiteralPath $Lote)) { Falha "falta publicar_lote.py ao lado deste script ($Aqui)." }

  Write-Host "Execução: $Execucao"
  Write-Host "Projeto Supabase: $Url"
  $ArgsPy = @($Lote, '--execucao', $Execucao, '--url', $Url)
  if ($Enviar) {
    $ArgsPy += '--enviar'
    if ($Substituir) { $ArgsPy += '--substituir' }
    if (-not $env:RM_SUPABASE_SERVICE_KEY) {
      if ([Console]::IsInputRedirected) { Falha 'sem terminal interativo para digitar a chave. Abra o PowerShell normalmente (ou defina $env:RM_SUPABASE_SERVICE_KEY na sessão e rode de novo).' }
      $sec = Read-Host 'Cole a chave service_role do Supabase (não aparece na tela)' -AsSecureString
      $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
      try { $env:RM_SUPABASE_SERVICE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
      $chavePreenchidaAqui = $true
      if (-not $env:RM_SUPABASE_SERVICE_KEY) { Falha 'nenhuma chave informada.' }
    }
  } else {
    Write-Host 'Modo conferência (dry-run): nada será enviado. Para enviar, acrescente -Enviar.'
  }
  Nativo $Py $ArgsPy 'montagem do manifesto, conferência e envio'

  # só diz «Pronto» depois de conferir o que o Python deve ter deixado
  if (-not (Test-Path -LiteralPath (Join-Path $Execucao 'manifesto\manifesto.json') -PathType Leaf)) { Falha 'o manifesto não foi gerado.' }
  if ($Enviar -and -not (Test-Path -LiteralPath (Join-Path $Execucao 'enviado.json') -PathType Leaf)) { Falha 'o registro enviado.json não foi gerado: não dá para afirmar que os arquivos subiram.' }
  Write-Host ''
  if ($Enviar) {
    Write-Host "Pronto: arquivos no bucket privado (registro: $Execucao\enviado.json). NÃO publicado ainda." -ForegroundColor Green
    Write-Host "Próximo (seu, no Netlify): variável RM_AUDIO_MANIFEST = conteúdo de $Execucao\manifesto\manifesto.json; RM_PILOT_AUDIO_UIDS = seu UID; novo deploy."
  } else {
    Write-Host 'Conferência ok (nada enviado). Para enviar: o mesmo comando com -Enviar.' -ForegroundColor Green
  }
  exit 0
}
catch { Falha $_.Exception.Message }
finally { if ($chavePreenchidaAqui) { Remove-Item Env:\RM_SUPABASE_SERVICE_KEY -ErrorAction SilentlyContinue } }
