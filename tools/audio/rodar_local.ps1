# Processa os masters em lote NA MÁQUINA DO JOSÉ (Windows PowerShell 5.1+ / 7). Um comando:
#   powershell -ExecutionPolicy Bypass -File tools\audio\rodar_local.ps1 -Pasta "C:\Users\VOCE\Downloads\Audiobooks"
# Só LÊ os masters. Tudo é gerado FORA do repositório (padrão: %USERPROFILE%\audiobooks-trabalho). Nada é enviado a lugar nenhum.
# Caminho curto (padrão): converte só se preciso + gera amostras de escuta; SEM transcrição (sem modelo de 640 MB). Para a primeira falha e sai com código ≠ 0. Para retomar: corrija o que a mensagem diz e rode O MESMO comando (venv e modelo já prontos são reaproveitados; cada execução usa pasta nova).
# STATUS: escrito e revisado, mas NÃO FOI TESTADO em Windows (só validado em Linux). Se algo falhar, copie a mensagem de erro.
param(
  [string[]]$Pasta = @(),                                 # pasta(s) com os .m4a (subpastas entram; pode repetir)
  [string]$Zip = '',                                      # OPCIONAL: a pasta do Drive baixada como .zip (extrai sozinho, em lugar seguro, na execução); use -Pasta e/ou -Zip
  [string]$Trabalho = (Join-Path $env:USERPROFILE 'audiobooks-trabalho'),
  [string]$Materia = '',                                  # semiologia-ii.html do checkout (padrão: o do checkout onde este script está)
  [switch]$ComTranscricao,                                # OPCIONAL: transcreve (baixa o modelo de ≈ 640 MB) para propor o bloco pelo conteúdo; padrão = SEM transcrição (você decide o bloco ouvindo)
  [switch]$Completo,                                      # (com -ComTranscricao) transcreve o áudio inteiro, bem mais lento
  [switch]$ComAmostras                                    # inclui os trechos de escuta no pacote de retorno
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Falha([string]$Msg) {
  Write-Host ''
  Write-Host "FALHOU: $Msg" -ForegroundColor Red
  Write-Host "Nada foi enviado e seus áudios originais não foram alterados. Para retomar: corrija o problema acima e rode o MESMO comando de novo." -ForegroundColor Yellow
  exit 1
}
# Executável externo: $ErrorActionPreference NÃO captura código de saída de .exe — confere $LASTEXITCODE sempre.
function Nativo([string]$Exe, [string[]]$Argumentos, [string]$Etapa) {
  $antes = $ErrorActionPreference; $ErrorActionPreference = 'Continue'     # stderr de .exe (avisos do pip) não pode abortar no PS 5.1
  try { & $Exe @Argumentos; $cod = $LASTEXITCODE } finally { $ErrorActionPreference = $antes }
  if ($cod -ne 0) { Falha "$Etapa (código de saída $cod)." }
}

try {
  $Aqui = $PSScriptRoot
  $Raiz = (Resolve-Path (Join-Path $Aqui '..\..') -ErrorAction SilentlyContinue)
  if (-not $Materia) {
    if ($Raiz) { $Materia = Join-Path $Raiz.Path 'Repasso-Med-Site--main\Atual - Copia\netlify\functions\materias-privadas\semiologia-ii.html' }
  }
  if (-not $Materia -or -not (Test-Path -LiteralPath $Materia -PathType Leaf)) {
    Falha "não achei semiologia-ii.html. Este fluxo precisa do checkout do repositório (git clone/pull) ou do arquivo da matéria: use -Materia 'C:\caminho\semiologia-ii.html'. A matéria é privada e não vai dentro do pacote."
  }
  if ($Pasta.Count -eq 0 -and -not $Zip) { Falha 'informe -Pasta (pasta com os .m4a) e/ou -Zip (a pasta do Drive baixada como .zip).' }
  foreach ($p in $Pasta) { if (-not (Test-Path -LiteralPath $p -PathType Container)) { Falha "a pasta de áudios não existe: $p" } }
  $achou = $false
  foreach ($p in $Pasta) { if (Get-ChildItem -LiteralPath $p -Recurse -Filter '*.m4a' -File -ErrorAction SilentlyContinue | Select-Object -First 1) { $achou = $true } }
  if (-not $achou -and -not $Zip) { Falha "nenhum arquivo .m4a encontrado em: $($Pasta -join ', ')." }
  if ($Zip -and -not (Test-Path -LiteralPath $Zip -PathType Leaf)) { Falha "o .zip informado não existe: $Zip" }

  $TrabalhoAbs = [System.IO.Path]::GetFullPath($Trabalho)
  if ($Raiz -and $TrabalhoAbs.StartsWith($Raiz.Path, [System.StringComparison]::OrdinalIgnoreCase)) { Falha "a pasta de trabalho está dentro do repositório ($($Raiz.Path)); use outra com -Trabalho." }
  foreach ($p in $Pasta) {
    $pa = [System.IO.Path]::GetFullPath($p).TrimEnd('\')
    if ($TrabalhoAbs.StartsWith($pa, [System.StringComparison]::OrdinalIgnoreCase) -or $pa.StartsWith($TrabalhoAbs.TrimEnd('\'), [System.StringComparison]::OrdinalIgnoreCase)) { Falha "-Trabalho ($TrabalhoAbs) e a pasta de áudios ($pa) se sobrepõem; use uma pasta de trabalho separada." }
  }
  New-Item -ItemType Directory -Force -Path $TrabalhoAbs | Out-Null

  # 1) Python 3.10+ (tenta 'py -3', depois 'python')
  $PyBase = $null
  foreach ($cand in @(@('py', '-3'), @('python'))) {
    if (Get-Command $cand[0] -ErrorAction SilentlyContinue) {
      $extra = @(); if ($cand.Count -gt 1) { $extra = $cand[1..($cand.Count - 1)] }
      $ver = & $cand[0] @extra -c "import sys; print(1 if sys.version_info >= (3,10) else 0)" 2>$null
      if ($LASTEXITCODE -eq 0 -and "$ver".Trim() -eq '1') { $PyBase = $cand; break }
    }
  }
  if (-not $PyBase) { Falha 'Python 3.10 ou mais novo não encontrado. Instale em https://www.python.org/downloads/ (marque "Add python.exe to PATH") e rode de novo.' }
  $PyExe = $PyBase[0]; $PyPre = @(); if ($PyBase.Count -gt 1) { $PyPre = $PyBase[1..($PyBase.Count - 1)] }

  # 2) ambiente virtual (fora do repositório)
  $Venv = Join-Path $TrabalhoAbs 'venv'
  $Py = Join-Path $Venv 'Scripts\python.exe'
  if (-not (Test-Path -LiteralPath $Py)) {
    Write-Host '== 1/5 criando ambiente Python =='
    Nativo $PyExe ($PyPre + @('-m', 'venv', $Venv)) 'criação do ambiente Python (venv)'
    if (-not (Test-Path -LiteralPath $Py)) { Falha 'o venv foi criado sem python.exe; apague a pasta venv em -Trabalho e rode de novo.' }
  }

  # 3) dependências
  Write-Host '== 2/5 instalando dependências =='
  $Req = Join-Path $Aqui 'requirements.txt'
  if (-not (Test-Path -LiteralPath $Req)) { Falha "falta requirements.txt ao lado deste script ($Aqui)." }
  Nativo $Py @('-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', $Req) 'instalação das dependências (pip)'
  if ($ComTranscricao) {
    $ReqT = Join-Path $Aqui 'requirements-transcricao.txt'
    if (-not (Test-Path -LiteralPath $ReqT)) { Falha "falta requirements-transcricao.txt ao lado deste script ($Aqui)." }
    Nativo $Py @('-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', $ReqT) 'instalação das dependências de transcrição (pip)'
  }

  # 4) modelo de transcrição (só com -ComTranscricao; ≈ 640 MB, uma vez só)
  $Modelo = Join-Path $TrabalhoAbs 'sherpa-onnx-whisper-small'
  $Proc = Join-Path $Aqui 'processar_masters.py'
  if (-not (Test-Path -LiteralPath $Proc)) { Falha "falta processar_masters.py ao lado deste script ($Aqui)." }
  if ($ComTranscricao) {
    & $Py $Proc --verificar-ambiente --modelo $Modelo --materia $Materia *> $null
    $modeloOk = ($LASTEXITCODE -eq 0)
    if (-not $modeloOk -and -not (Test-Path -LiteralPath (Join-Path $Modelo 'small-tokens.txt'))) {
      Write-Host '== 3/5 baixando o modelo de transcrição (≈ 640 MB, só na primeira vez) =='
      $Tar = Join-Path $TrabalhoAbs 'whisper-small.tar.bz2'
      if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { Falha 'tar.exe não encontrado (vem com o Windows 10/11 recentes). Extraia manualmente o modelo em -Trabalho.' }
      try { Invoke-WebRequest -Uri 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2' -OutFile $Tar -UseBasicParsing }
      catch { Falha "download do modelo: $($_.Exception.Message)" }
      if ((Get-Item -LiteralPath $Tar).Length -lt 100MB) { Remove-Item -LiteralPath $Tar -Force; Falha 'o download do modelo veio incompleto (< 100 MB); tente de novo.' }
      Nativo 'tar' @('-xjf', $Tar, '-C', $TrabalhoAbs) 'extração do modelo (tar)'
    }
    Write-Host '== 4/5 conferindo ambiente (Python, dependências, ffmpeg, modelo íntegro, matéria) =='
    Nativo $Py @($Proc, '--verificar-ambiente', '--modelo', $Modelo, '--materia', $Materia) 'verificação do ambiente/modelo'
  } else {
    Write-Host '== 4/5 conferindo ambiente (Python, dependências, ffmpeg, matéria; sem transcrição) =='
    Nativo $Py @($Proc, '--verificar-ambiente', '--sem-transcricao', '--materia', $Materia) 'verificação do ambiente'
  }

  # 5) processamento
  Write-Host '== 5/5 processando (conversão + amostras; com -ComTranscricao pode levar bastante tempo, o modelo roda na CPU) =='
  $ArgsPy = @($Proc)
  foreach ($p in $Pasta) { $ArgsPy += @('--pasta', $p) }
  if ($Zip) { $ArgsPy += @('--zip', $Zip) }
  $ArgsPy += @('--trabalho', $TrabalhoAbs, '--materia', $Materia)
  if ($ComTranscricao) { $ArgsPy += @('--modelo', $Modelo); if ($Completo) { $ArgsPy += '--completo' } } else { $ArgsPy += '--sem-transcricao' }
  Nativo $Py $ArgsPy 'processamento dos áudios'

  # só diz "Pronto" depois de CONFERIR as saídas
  $Exec = Get-ChildItem -LiteralPath $TrabalhoAbs -Directory -Filter 'execucao-*' | Sort-Object Name | Select-Object -Last 1
  if (-not $Exec) { Falha 'o processamento terminou sem criar a pasta execucao-*.' }
  $Esperados = @('RELATORIO-REAL.md', 'vinculos-evidencia.json', 'vinculos.json', 'inventario.json', 'tratados\relatorio.json', 'tratados\relatorio.md')
  $Faltam = @($Esperados | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Exec.FullName $_) -PathType Leaf) })
  if ($Faltam.Count -gt 0) { Falha "saídas esperadas ausentes em $($Exec.FullName): $($Faltam -join ', ')" }
  $ArgsRet = @((Join-Path $Aqui 'empacotar_retorno.py'), '--execucao', $Exec.FullName)
  if ($ComAmostras) { $ArgsRet += '--com-amostras' }
  Nativo $Py $ArgsRet 'geração do pacote de retorno'
  Write-Host ''
  Write-Host "Pronto. Resultados: $($Exec.FullName)" -ForegroundColor Green
  Write-Host "Próximo: ouça tratados\amostras\ (1x, 2x e 2,5x), leia RELATORIO-REAL.md e, para cada áudio, rode o comando 'aprovar_vinculos' que o relatório mostra. Depois: enviar_local.ps1. Nada foi enviado; escuta_humana_ok continua false."
  exit 0
}
catch { Falha $_.Exception.Message }
