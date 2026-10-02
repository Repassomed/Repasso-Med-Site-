# Preparação dos audiobooks (voz) — masters → cópias AAC-LC/M4A

**Os masters e as cópias NÃO entram no Git** (a saída tem de ficar fora do repositório; o script recusa o contrário).
Este perfil é para **fala**; não usar nos sons clínicos de ausculta.

```bash
pip install imageio-ffmpeg pystoi soundfile numpy scipy      # ou ffmpeg no PATH
python3 tools/audio/preparar_audiobooks.py inspecionar --origem ~/masters
python3 tools/audio/preparar_audiobooks.py preparar    --origem ~/masters --saida ~/audiobooks-tratados
python3 tools/audio/preparar_audiobooks.py vincular    --transcricao transcricao-s2-b04.txt \
        --materia "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/semiologia-ii.html"
python3 tools/audio/montar_manifesto.py --relatorio ~/audiobooks-tratados/relatorio.json --vinculos vinculos.json --saida ~/audiobooks-tratados/manifesto
python3 -m unittest discover -s tools/audio -p "test_*.py"   # 28 testes (master sintético)
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

## Limites (honestos)
* STOI/loudness **não substituem a escuta humana** (`escuta_humana_pendente` sempre `true`).
* Os testes usam um **master sintético** (sinal que imita voz); provam o pipeline, **não** a inteligibilidade de voz real.
* Os quatro masters reais (Drive: Motivo, EPOC, Parenquimatoso, Pleural) **ainda não foram processados**: o ambiente desta sessão não alcança o Drive
  (conector limitado a 10 MB; host fora da política de rede). Nenhum número de tamanho/duração dos masters reais é afirmado aqui.
