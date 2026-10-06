# Audiobooks (voz) — masters → cópias AAC-LC/M4A → vínculo por conteúdo

**Guia único.** Os masters e as cópias **não entram no Git** (a saída fica fora do repositório; as ferramentas recusam o contrário). Perfil para **fala**; não usar nos sons clínicos de ausculta.
Piloto restrito: José × Semiología II. Nada aqui publica, envia ao Storage, mexe no Supabase ou libera alunos.

<!-- FLUXO-JOSE:INICIO -->
## 1. Fluxo do José (instruções atuais)

Os 4 áudios comprimidos (`.m4a`) estão na pasta **Audiobooks** do Drive: <https://drive.google.com/drive/folders/1APjpeMTDGrBzytbZSKcsxi704PniIEmT>
(Motivo de Consulta, EPOC, Síndrome Parenquimatoso, Síndrome Pleural — 15,7 a 36,8 MB cada). **Nada precisa ser público nem enviado um a um pelo chat.**

1. **Baixe a pasta inteira em lote** no navegador (Drive ▸ botão direito na pasta ▸ *Fazer download*): vem como `.zip`. Pode extrair para uma pasta (ex.: `C:\Users\VOCE\Downloads\Audiobooks`) **ou deixar o `.zip`** — o ZIP é opcional. Nomes com ` (1)` são aceitos.
2. **Pré-requisitos (uma vez):** Python 3.10+ (python.org, marcando *Add to PATH*) · espaço livre para o modelo de transcrição (≈ 640 MB baixados uma vez) e o ambiente Python · o **checkout do repositório** (ou só o arquivo `semiologia-ii.html`; ver §3).
3. **Um comando** (PowerShell, na raiz do checkout; troque os caminhos):
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\audio\rodar_local.ps1 -Pasta "C:\Users\VOCE\Downloads\Audiobooks"
   # ou, sem extrair, direto do ZIP baixado:   ... -Zip "C:\Users\VOCE\Downloads\Audiobooks-20260101.zip"     (-Pasta e -Zip podem ser usados juntos)
   # fora do checkout (pacote): acrescente  -Materia "C:\caminho\semiologia-ii.html"
   ```
   O script cria o ambiente Python, instala as dependências, baixa o modelo (1ª vez), confere tudo e processa. **Para na primeira falha** (código ≠ 0) e diz como retomar: corrigir e rodar o **mesmo comando** (o que já está pronto é reaproveitado; cada execução usa uma pasta nova `execucao-<UTC>/`). Só escreve «Pronto» depois de conferir as saídas.
   Linux/macOS: `bash tools/audio/rodar_local.sh <pasta-dos-m4a> <pasta-de-trabalho> <pasta-do-modelo>`.
4. **Revise** `execucao-…\RELATORIO-REAL.md` (por áudio: derivado recomendado e motivo, tamanho/bitrate, alternativas, pendências, vínculo proposto com minutagem) e **ouça** `execucao-…\tratados\amostras\` a 1×, 2× e 2,5×.
5. **Devolva** o `execucao-…-retorno.zip` (criado ao lado da pasta; relatórios, vínculos, inventário e transcrições; **sem áudio**). Com os trechos de escuta: acrescente `-ComAmostras` (ou rode `python tools\audio\empacotar_retorno.py --execucao <pasta> --com-amostras`). O tamanho real é impresso ao final.

Status: o fluxo foi validado em **Linux** (testes automatizados + PowerShell 7 em Linux com áudios sintéticos). **Não foi testado em Windows** nem com os 4 áudios reais; `escuta_humana_ok` é sempre `false` até você ouvir e decidir.
<!-- FLUXO-JOSE:FIM -->

## 2. Ferramentas

```bash
pip install imageio-ffmpeg pystoi soundfile numpy scipy      # ou ffmpeg no PATH
python3 tools/audio/preparar_audiobooks.py inspecionar --origem ~/masters
python3 tools/audio/preparar_audiobooks.py preparar    --origem ~/masters --saida ~/audiobooks-tratados-NOVA   # saída = pasta NOVA/vazia, separada da entrada
python3 tools/audio/preparar_audiobooks.py vincular    --transcricao transcricao-s2-b04.txt \
        --materia "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/semiologia-ii.html"
python3 tools/audio/montar_manifesto.py --relatorio ~/audiobooks-tratados/relatorio.json --vinculos vinculos.json --saida ~/audiobooks-tratados/manifesto
python3 -m unittest discover -s tools/audio -p "test_*.py"   # testes (master sintético)
```

* **inspecionar:** duração, codec/perfil, taxa, canais, bitrate, faststart (só lê).
* **preparar:** AAC-LC **mono** em **48** e **64 kbps** (32 kHz), `-movflags +faststart`, sem metadados; confere decodificação sem erro,
  moov antes de mdat, Δ de duração, loudness/pico (EBU R128) e **STOI** (inteligibilidade objetiva, janelas espalhadas, com alinhamento
  do atraso do codec) contra o master; recomenda o **menor bitrate** que passa (STOI ≥ 0,95, pior janela ≥ 0,92, pico < −0,1 dBFS, faststart).
  Confere por SHA-256 + mtime que o **master não mudou**. Escreve `relatorio.json` e `relatorio.md` (tamanho/duração antes e depois).
* **STOI em velocidade:** além de 1×, mede 2× e 2,5× (master e cópia aceleradas igual, sem mudar o tom; `--velocidades`, `--janelas-vel`, `--stoi-min-vel`, limiar provisório 0,90).
* **montar_manifesto.py:** gera (fora do Git) o JSON candidato de `RM_AUDIO_MANIFEST` + plano de upload, só com vínculo confirmado e escuta OK; não define variável. Ver `RUNBOOK-ATIVACAO-AUDIOBOOKS.md`.
* **verificar_upload.py:** última conferência dos derivados contra o manifesto candidato, antes do upload (faststart, mono AAC-LC, ≤ 30 MB, duração, `path`); não envia nada.
* **vincular:** sugere o bloco por **conteúdo** (cosseno TF-IDF entre a transcrição e o texto de cada `section#s2-bNN`); **não recebe nome
  nem número de arquivo**. Resultado `candidato` só com nota ≥ 0,15 e margem ≥ 0,04; senão `indeterminado`. A transcrição vem de um ASR
  rodado fora deste ambiente (Whisper local, p.ex.) — ou da escuta do José.

* **processar_masters.py** (chamado pelo atalho): `--pasta` (repetível) e/ou `--zip` (opcional), `--trabalho`, `--modelo`, `--materia`, `--completo`, `--verificar-ambiente`. Lista **única** entre subpastas; mesmo nome com conteúdo diferente = erro (nunca sobrescreve);
  cópia idêntica = deduplicada e registrada; execução isolada `execucao-<UTC>/`; entrada vazia = erro claro; `--janela`/`--passo` > 0. **Nunca apaga nada** (não existe mais `--limpar`): a saída tem de ser pasta nova/vazia e não pode se sobrepor às entradas.
* **Derivado só com benefício:** reencoda se > 30 MiB (limite do bucket), não AAC-LC, não mono ou > 96 kb/s; senão reaproveita ou remux com faststart (sem perda). O relatório mostra o derivado **recomendado** (não o primeiro), o motivo, tamanho/bitrate reais, alternativas e, se nenhuma passar os critérios, **NÃO APROVADA**.
* **transcrever.py:** ASR local (Whisper small, espanhol). Por padrão **amostrada** (rotulada); `--completo` transcreve tudo. Cobertura = **união** das janelas (sem dupla contagem) e, separada, a cobertura **com texto** reconhecido.
* **empacotar_retorno.py:** ZIP pequeno de retorno (lista fixa de arquivos; nunca masters/derivados). **empacotar_pacote.py:** gera o pacote de scripts (§3).
* **montar_manifesto.py / verificar_upload.py:** etapas posteriores (manifesto candidato e conferência antes do upload); ficam no checkout, dependem do site; não enviam nada.

## 3. Pacote para levar (opcional)

`python tools/audio/empacotar_pacote.py --saida ~/repasso-audiobooks-local.zip` gera um ZIP pequeno com os scripts, `requirements.txt` e o `LEIAME.md` (este §1). **Não contém áudios, credenciais, o modelo de transcrição nem a matéria.**
O processamento precisa do arquivo da matéria (`semiologia-ii.html`, privado) para vincular por conteúdo: com o **checkout** (`git clone`/`git pull` do branch) ele é achado sozinho; sem checkout, copie só esse arquivo e passe `-Materia`. As etapas posteriores (`montar_manifesto`, `verificar_upload`) exigem o checkout e não vão no pacote.
Se tiver o checkout, **o pacote é desnecessário**: rode o atalho direto dele.

## 4. Limites (honestos)
* STOI/loudness **não substituem a escuta humana** (`escuta_humana_pendente` sempre `true`).
* Os testes usam um **master sintético** (sinal que imita voz); provam o pipeline, **não** a inteligibilidade de voz real.
* Os quatro masters reais **ainda não foram processados, ouvidos nem aprovados**; nenhuma duração/bitrate/vínculo real é afirmado aqui.
