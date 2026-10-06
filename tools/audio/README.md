# Audiobooks (voz) — masters → cópias AAC-LC/M4A → vínculo por conteúdo

**Guia único.** Os masters e as cópias **não entram no Git** (a saída fica fora do repositório; as ferramentas recusam o contrário). Perfil para **fala**; não usar nos sons clínicos de ausculta.
Piloto restrito: José × Semiología II. Nada aqui publica, envia ao Storage, mexe no Supabase ou libera alunos.

<!-- FLUXO-JOSE:INICIO -->
## 1. Fluxo do José — do ZIP do Drive ao Storage (caminho curto; nada é entregue ao Claude)

Os 4 áudios comprimidos (`.m4a`) estão na pasta **Audiobooks** do Drive: <https://drive.google.com/drive/folders/1APjpeMTDGrBzytbZSKcsxi704PniIEmT>. **Nada precisa ser público.** Os masters nunca são alterados nem sobem.

**Uma vez só (antes do primeiro envio) — 1 clique:** no Supabase (projeto do site) ▸ **SQL Editor** ▸ colar o conteúdo de `Repasso-Med-Site--main/Atual - Copia/supabase/migrations/20260930_01_audiobooks_bucket_privado.sql` ▸ **Run**.
Cria o bucket **privado** `audiobooks` (30 MiB, só M4A) e a barreira RESTRICTIVE; falha fechada, reversível (`..._rollback.sql`). Hoje o bucket **ainda não existe** no projeto.

1. **Baixe a pasta do Drive** (botão direito ▸ *Fazer download* ▸ vem como `.zip`). Pode extrair ou deixar o `.zip`. Nomes com ` (1)` são aceitos.
2. **Pré-requisitos (uma vez):** Python 3.10+ (python.org, *Add to PATH*), **Node.js LTS** (nodejs.org; usado só na conferência) e **Git**.
   **Obter os scripts** (clone parcial, ≈ 2 MB, só o que o fluxo usa — scripts, a matéria para listar os blocos e o validador do servidor):
   ```powershell
   git clone --depth 1 --filter=blob:none --sparse --branch claude/audiobooks-publicar-storage https://github.com/Repassomed/Repasso-Med-Site-.git "$env:USERPROFILE\repasso-audio"; cd "$env:USERPROFILE\repasso-audio"; git sparse-checkout set --no-cone "/tools/audio/" "/Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/semiologia-ii.html" "/Repasso-Med-Site--main/Atual - Copia/netlify/functions/_audio/" "/Repasso-Med-Site--main/Atual - Copia/assets/rm-audio.js"
   ```
   Para atualizar depois: `cd "$env:USERPROFILE\repasso-audio"; git pull`. Todos os comandos abaixo rodam a partir dessa pasta.
3. **Comando 1 — converter (se preciso) e gerar amostras** (PowerShell, na raiz do checkout; ≈ minutos, sem modelo de transcrição):
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\audio\rodar_local.ps1 -Pasta "C:\Users\VOCE\Downloads\Audiobooks"     # ou  -Zip "C:\...\Audiobooks.zip"
   ```
   Converte **só quando há benefício** (acima de 30 MiB, não AAC-LC, não mono ou > 96 kb/s); senão reaproveita o arquivo sem perda. Gera derivados + **amostras de escuta** (trechos de ≈ 25 s do master e de cada cópia a 1×, 2× e 2,5×) + `RELATORIO-REAL.md` (tamanho, bitrate, STOI, recomendação por áudio).
4. **Ouça as amostras** (`execucao-…\tratados\amostras\`) e, **para cada áudio**, rode **um** comando (a linha pronta está no `RELATORIO-REAL.md`):
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\audio\aprovar_local.ps1 -Audio epoc -Bloco s2-b03 -Escutei
   ```
   `-Audio` = o id (ou parte do nome) do relatório · `-Bloco` = o bloco que você **ouviu** · `-Escutei` = a sua aprovação (sem ele só grava a proposta). Se o relatório disser «NÃO APROVADA», acrescente `-Kbps 64` depois de ouvir. Dois áudios no mesmo bloco: acrescente `-Ordem 2`.
   Só esse comando marca `escuta_humana_ok`; nada é automático.
5. **Comando 2 — conferir e enviar:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\audio\enviar_local.ps1            # conferência (dry-run): monta o manifesto e confere os arquivos
   powershell -ExecutionPolicy Bypass -File tools\audio\enviar_local.ps1 -Enviar    # envia ao bucket privado
   ```
   O `-Enviar` pede **uma vez**, oculta, a chave `service_role` (Supabase ▸ Project Settings ▸ API ▸ *service_role* ▸ Reveal). Ela fica só na memória do processo; **nunca** no chat, em arquivo ou em log. Confere bucket (privado/30 MiB/M4A), tamanho após o envio e que a URL pública do objeto **não** abre; não sobrescreve.
6. **Publicar para você (passo separado, seu):** no Netlify definir `RM_AUDIO_MANIFEST` (conteúdo de `execucao-…\manifesto\manifesto.json`) e `RM_PILOT_AUDIO_UIDS` (seu UID) e fazer novo deploy. Enviar ao Storage **não** publica: sem essas variáveis ninguém vê nada.

**Transcrição é opcional** (`-ComTranscricao`: baixa o modelo de ≈ 640 MB e propõe o bloco pelo conteúdo); o padrão decide o bloco pela sua escuta. Se algo falhar, os scripts param com a mensagem do motivo; rode o mesmo comando de novo.
Status: validado em **Linux** (testes automatizados + PowerShell 7 em Linux, áudios **sintéticos**, Storage **falso**). **Não foi testado em Windows**, nem com os 4 áudios reais, nem contra o Supabase real.
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
* **aprovar_local.ps1 (→ aprovar_vinculos.py) / publicar_lote.py / enviar_storage.py:** aprovação humana por áudio → manifesto → conferência → upload ao bucket privado (dry-run por padrão; chave só por variável de ambiente; sem sobrescrever; confere tamanho e a negação da URL pública). Reaproveitam montar_manifesto e verificar_upload.
* **empacotar_retorno.py:** ZIP pequeno de retorno (lista fixa de arquivos; nunca masters/derivados). **empacotar_pacote.py:** gera o pacote de scripts (§3).
* **montar_manifesto.py / verificar_upload.py:** etapas posteriores (manifesto candidato e conferência antes do upload); ficam no checkout, dependem do site; não enviam nada.

## 3. Pacote de scripts (opcional, só processamento)

`python tools/audio/empacotar_pacote.py --saida ~/repasso-audiobooks-local.zip` gera um ZIP pequeno (scripts, requirements, LEIAME) **sem** áudios, credenciais, modelo nem matéria. Serve só ao **processamento** (comando 1);
`aprovar_vinculos`, `montar_manifesto` e o envio dependem do **checkout** (matéria e validadores do servidor), então o caminho recomendado é rodar tudo do checkout atualizado e dispensar o pacote.

## 4. Limites (honestos)
* STOI/loudness **não substituem a escuta humana** (`escuta_humana_pendente` sempre `true`).
* Os testes usam um **master sintético** (sinal que imita voz); provam o pipeline, **não** a inteligibilidade de voz real.
* Os quatro masters reais **ainda não foram processados, ouvidos nem aprovados**; nenhuma duração/bitrate/vínculo real é afirmado aqui.

## 5. Custo e limites previstos (confira no painel; valores do plano Free conforme meu conhecimento, não verificados na documentação)

| Item | Valor |
|---|---|
| Limite por arquivo no bucket `audiobooks` | **30 MiB** (31.457.280 B), só M4A (`audio/mp4`, `audio/x-m4a`), bucket privado — definido pela migration (ainda **não aplicada**; hoje o projeto só tem os buckets `aportes` e `flyers`) |
| Plano do Supabase (organização «Nerdicine») | **Free** (lido pelo conector): ≈ 1 GB de Storage, ≈ 5 GB/mês de egress (dividido com Auth/DB), limite global de 50 MB por arquivo |
| Tamanho dos derivados (medido em fala, 24 s) | AAC-LC mono 32 kHz: 48 kbps ≈ **21 MB/hora** (STOI 1× 0,988) · 64 kbps ≈ 29 MB/hora (0,995) · 32 kbps ≈ 14,5 MB/hora (0,975). Referência 128 kbps estéreo ≈ 55 MB/hora. A 48 kbps cabem ≈ 4,4 h em 30 MiB; a 64 kbps ≈ 3,3 h |
| Piloto (4 áudios, 108,6 MB de masters) | derivados ≤ 30 MiB cada (teto 120 MiB = ≈ 12 % do 1 GB); se os masters forem 128 kbps estéreo, ≈ 40 MB no total. **Custo: zero no Free.** |
| Egress | ≈ o tamanho do arquivo por reprodução completa (Range, URL de 10 min, `preload="none"`). Piloto com 1 usuário: desprezível. Escala: 100 alunos × 4 áudios × 14 MB ≈ 5,6 GB por «rodada» — **passa do Free**; o plano Pro (a confirmar: ≈ US$ 25/mês, ≈ 100 GB de Storage, ≈ 250 GB de egress) é decisão sua **antes** de abrir a mais usuários |
| GitHub Actions / servidores | **nenhum**: a conversão roda no seu Windows; o Netlify só assina URLs |

O STOI a 2×/2,5× **não discrimina** perfis em amostras tão curtas (valores não monotônicos): quem decide o perfil é a sua escuta das amostras. Os números acima vêm de um trecho de fala **em inglês** de 24 s (proxy, não os seus áudios); os reais serão medidos pelo comando 1.

## 6. Para repetir nas outras matérias

`processar_masters`/`rodar_local` e `enviar_storage` já são independentes da matéria (derivados, amostras, envio por `path`). **Hoje o piloto é só `semiologia-ii`:** o servidor (`netlify/functions/_audio/lib.js`, `PILOT_SLUG`), `montar_manifesto.py`/`verificar_upload.py` (prefixo `semiologia-ii/`, blocos da matéria) e o player (restrito ao seu UID) precisam de uma PR própria
para aceitar outro `subject_slug` — **não feita aqui**. Depois do piloto validado, repetir = mesmo ZIP → comando 1 → aprovar → comando 2, trocando matéria e prefixo.
