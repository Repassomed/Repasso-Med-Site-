# Inventário de audiobooks

**Última conferência:** 15/10/2026 (Claude coordenador).
- **Drive:** lido direto nas pastas `Audiobook(s)` de cada matéria.
- **Supabase:** consulta **somente leitura** ao bucket privado `audiobooks` (projeto do site). Nada foi enviado nem alterado.
- **Não conferido:** as variáveis do Netlify (`RM_AUDIO_MANIFEST`, `RM_AUDIO_SLUGS`, `RM_PILOT_AUDIO_UIDS`). Este ambiente não tem acesso ao painel do Netlify.

## Resumo

| matéria | no Drive | no Supabase (bucket) | aparece para o aluno? |
|---|---:|---:|---|
| Semiología II | 4 | **4** | só no piloto (conta do José) |
| Fisiopatología II | 7 | 0 | não |
| Farmacología II | 4 | 0 | não |
| Anatomía Patológica II | 3 | 0 | não |
| Histología II | 4 | 0 | não |
| **Total** | **22** | **4** | — |

O bucket aceita no máximo **40 MiB por arquivo** (41 943 040 bytes). **12 dos 18 áudios que faltam passam desse limite** e precisam ser comprimidos antes (o script `tools/audio/rodar_local.ps1` já faz isso; ver `tools/audio/README.md`).

## Detalhe por matéria

### Semiología II — no ar (piloto)

| tema | arquivo no Drive | objeto no Supabase | bloco |
|---|---|---|---|
| Motivo de consulta | `Semio_-_Motivo_de_Consulta (1).m4a` (36,8 MB) | `semiologia-ii/s2-b01-motivo-consulta.m4a` | s2-b01 |
| EPOC | `Semio_EPOC (1).m4a` (33,5 MB) | `semiologia-ii/s2-b03-epoc.m4a` | s2-b03 |
| Síndrome parenquimatoso | `Semio - 3 Sindrome Parenquimatoso (1).m4a` (15,7 MB) | `semiologia-ii/s2-b04-parenquimatoso.m4a` | s2-b04 |
| Síndrome pleural | `Semio_-_4_sindrome_pleual (1).m4a` (22,7 MB) | `semiologia-ii/s2-b05-pleural.m4a` | s2-b05 |

Subidos em 06/10/2026.

### Fisiopatología II — só no Drive

| tema | arquivo | tamanho | cabe no bucket? |
|---|---|---:|---|
| Ictericia | `Fisiopato Ictericia.m4a` | 34,5 MB | ✅ |
| Enfermedades del esófago | `Fisiopato Enfermidades do Esofago.m4a` | 43,4 MB | ❌ comprimir |
| Enfermedades gástricas | `Fisiopato enfermidade Gastricas.m4a` | 52,6 MB | ❌ comprimir |
| Vías urinarias | `Fisiopato Vias urinarias.m4a` | 56,7 MB | ❌ comprimir |
| Hepatitis | `Fisiopato_05_Hepatite.m4a` | 50,0 MB | ❌ comprimir |
| Pancreatitis | `Fisiopato_Pacreatitites.m4a` | 37,7 MB | ✅ |
| Enfermedades intestinales | `Fisiopato_Enfermidades_Intestinales.m4a` | 55,0 MB | ❌ comprimir |

### Farmacología II — só no Drive

| tema | arquivo | tamanho | cabe no bucket? |
|---|---|---:|---|
| Antianginosos | `Farmaco_II_-_Antianginoso.m4a` | 50,1 MB | ❌ comprimir |
| Antiagregantes | `Farmaco_II_-_Antiagregante.m4a` | 43,0 MB | ❌ comprimir |
| Betabloqueantes | `Farmaco_Betabloqueador.m4a` | 31,6 MB | ✅ |
| Antihipertensivos | `Famarco_Antihipertensivos.m4a` | 29,5 MB | ✅ |

### Anatomía Patológica II — só no Drive

| tema | arquivo | tamanho | cabe no bucket? |
|---|---|---:|---|
| Cavidad oral | `Anatopato_-_Cavidad_Oral.m4a` | 67,3 MB | ❌ comprimir |
| Esófago | `Anatopato_Esofago.m4a` | 60,9 MB | ❌ comprimir |
| Gastro (estómago) | `Anatopato_Gastro.m4a` | 41,6 MB | ✅ (no limite) |

### Histología II — só no Drive

| tema | arquivo | tamanho | cabe no bucket? |
|---|---|---:|---|
| Respiratorio | `Histo_II_Respiratorio.m4a` | 59,9 MB | ❌ comprimir |
| Cardiovascular 1 | `Histo_II_Cardio_1.m4a` | 50,5 MB | ❌ comprimir |
| Endocrino | `Histo_II_endócrino.m4a` | 54,2 MB | ❌ comprimir |
| Linfático | `Histo_II_linfático.m4a` | 35,8 MB | ✅ |

## O que falta para liberar áudio em outras matérias

| passo | quem | estado |
|---|---|---|
| Código que aceita áudio em qualquer matéria autorizada (sem ligar nada) | Claude 4 · PR #489 | ✅ mesclado (16/10) |
| Comprimir os 12 arquivos acima de 40 MiB e ouvir as amostras | José (script local) | ⬜ |
| Ligar cada áudio ao bloco certo (pela escuta ou transcrição) | José + Claude | ⬜ |
| Subir ao bucket `audiobooks` | José (script com a chave, nunca no chat) | ⬜ |
| Pôr a matéria em `RM_AUDIO_SLUGS` e o manifesto em `RM_AUDIO_MANIFEST` no Netlify | José | ⬜ |
| Teste de 1 minuto em cada matéria liberada | José | ⬜ |

Quando um áudio novo subir, atualizar a tabela da matéria e o resumo do topo.
