> **Atualizado:** como disponibilizar os arquivos, a ativação executável e o quadro de evidências estão em `RUNBOOK-ATIVACAO-AUDIOBOOKS.md` (este checklist continua válido para o processamento local).

# Checklist — processar os 4 masters reais (Semiología II)

Nada abaixo foi executado pelo Claude: o ambiente da sessão **não alcança** os arquivos (o conector do Drive limita downloads a 10 MB e o host
`drive.google.com` está fora da política de rede). Portanto **não existe** resultado de bitrate, duração, qualidade ou vínculo dos masters reais.
Os vínculos abaixo são **somente candidatos** até a confirmação pelo conteúdo (escuta ou transcrição).

## Os 4 masters (Drive · pasta `1APjpeMTDGrBzytbZSKcsxi704PniIEmT`; tamanhos = metadado do Drive, não medição)

| | Arquivo no Drive | Tamanho no Drive | Vínculo **candidato** |
|---|---|---|---|
| A | `Semio_-_Motivo_de_Consulta.m4a` | 61 275 605 B | `s2-b01` |
| B | `Semio_EPOC.m4a` | 55 806 805 B | `s2-b03` |
| C | `Semio - 3 Sindrome Parenquimatoso.m4a` | 26 196 225 B | `s2-b04` |
| D | `Semio_-_4_sindrome_pleual.m4a` | 37 840 755 B | `s2-b05` |

O número no nome do arquivo **não** decide o bloco. O vínculo só vale depois do passo 5.

## O que o José precisa fornecer/executar

1. **Baixar os 4 M4A originais** do Drive para uma pasta local **fora do repositório** (ex.: `~/masters`). Não editar nem renomear os originais.
2. **Máquina com Python 3.10+ e o repositório atualizado** (`main`). Instalar: `pip install imageio-ffmpeg pystoi soundfile numpy scipy`
   (ou `ffmpeg`/`ffprobe` no PATH). Escolher uma pasta de saída **fora do Git** (ex.: `~/audiobooks-tratados`); o script recusa a saída dentro de um repositório.
3. **Inspecionar** (só lê): `python3 tools/audio/preparar_audiobooks.py inspecionar --origem ~/masters` → anotar duração, codec, canais, taxa e faststart de cada um.
4. **Preparar**: `python3 tools/audio/preparar_audiobooks.py preparar --origem ~/masters --saida ~/audiobooks-tratados`
   → gera AAC-LC mono 48 e 64 kbps com faststart, `relatorio.json` e `relatorio.md` (tamanho/duração antes e depois, loudness, pico, STOI, recomendação).
   O SHA-256 do master é conferido antes e depois; se mudar, o script aborta.
5. **Confirmar o vínculo pelo conteúdo** (um de dois caminhos, por áudio):
   - **Escuta humana**: ouvir o início/meio de cada cópia e anotar de que tema trata (e se a voz está inteligível); ou
   - **Transcrição** (ex.: Whisper local) salva em `transcricao-<áudio>.txt`, e então
     `python3 tools/audio/preparar_audiobooks.py vincular --transcricao transcricao-<áudio>.txt --materia "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/semiologia-ii.html"`.
     Só vale `candidato`; `indeterminado` ⇒ decidir por escuta.
6. **Escuta humana do resultado** (obrigatória; `escuta_humana_pendente` é sempre `true`): ouvir a cópia recomendada (48 ou 64 kbps) de cada áudio, inclusive trechos com
   números, siglas e nomes de medicamentos/sinais, e aprovar ou pedir 64 kbps.
7. **Devolver ao Claude (sem anexar os áudios ao Git):** o `relatorio.md`/`relatorio.json`, o vínculo confirmado de cada áudio (A–D → bloco) e o bitrate escolhido.
   Só então o manifesto (`RM_AUDIO_MANIFEST`) pode ser montado, com `audio_id`, `block_id`, `title`, `duration`, `order`, `version`, `path`, `ready`.

## O que NÃO fazer
- Não commitar masters nem cópias (nenhum `m4a/wav/flac/aac` no Git).
- Não usar este perfil nos sons de ausculta (mp3 próprios).
- Não enviar nada ao Supabase/Storage nem aplicar a migration neste passo (isso é a etapa de ativação, com autorização separada).
