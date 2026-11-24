# Ortopedia y Traumatología · conferência dos slides (24/11/2026)

Fonte: Drive › Site repassomed › Biblioteca › 7 semestre › Ortopedia/ Traumatologia (Dr. Agustin) › Slides (16 arquivos, todos com data ≤ 01/09/2026; nenhum arquivo novo).
Método: texto de cada slide lido via Drive; lista de termos por slide conferida contra o texto do bloco (não pelo título). Resultado de cobertura é do conteúdo, não de rótulos.

| Unidade | Bloco | Abriu? | Já existia | O que mudou | Pendente |
|---|---|---|---|---|---|
| 1 | otb01 | sim | 66/70 termos (4 = grafia) | nada | — |
| 2 | otb02 | sim | 66/69 (vasc. do tendão aparece na figura «endotendón») | nada | — |
| 3 | otb03 | sim | 66/69 (idem) | nada | — |
| 4 | otb04 | sim | 64/64 | nada | — |
| 5 | otb05 | sim | 65/65 | nada | — |
| 6 · Complicaciones generales de las lesiones traumáticas | otb07 (Complicaciones generales, 35 preguntas) | **NÃO LIDO**: PDF de 92 693 728 bytes (≈88 MB); o conector do Drive recusa download acima de 10 MB e a leitura de texto devolve vazio | — | nada | **Todas as páginas pendentes.** Precisa de arquivo reduzido (≤10 MB) ou texto/imagens enviados por José |
| 7 · Lesiones traumáticas en rodilla asociadas al deporte | otb08 (Rodilla y deporte, 30 preguntas) | **NÃO LIDO**: PDF de 67 074 094 bytes (≈64 MB), mesmo bloqueio | — | nada | **Todas as páginas pendentes**, idem |
| 8 | otb09 | sim | 78/79 («30–60 años» = grafia) | nada | — |
| 9 | otb10 | sim | 91/92 | nada | — |
| 10 | otb11 | sim | 38/38 | nada | — |
| 11 | otb12 | sim | 65/65 | nada | — |
| 12 | otb13 | sim | 69/70 | nada | — |
| 13 | otb14 | sim | ~44/44 | nada | — |
| 14 | otb15 | sim | 49/50 («corsé» presente em outra grafia) | nada | — |
| 15 | otb16 | sim | 72/76 | +«síndrome de insuficiencia torácica» (nome da consequência já descrita); +exemplos de displasias óseas (acondroplasia, displasia espondiloepifisaria, enanismo distrófico, mucopolisacaridosis) | — |
| 16 | otb17 | sim | 54/55 | nada | — |

Nota: o mapeamento Unidad → bloco usa os títulos do bloco no site. Unidades 6 e 7 **não foram conferidas** e nada foi acrescentado a otb07/otb08. Sem OCR no ambiente (tesseract indisponível) e sem permissão de criar cópias no Drive (isso seria escrita fora do escopo); não contornei o limite.

## Preservação
- ortopedia.html: 3 inserções / 2 linhas alteradas, só em otb16. Ids, imagens, flashcards e 457 questões (ids q-orto1…458) intactos; contagens inalteradas.
- Marcas de alunos (leitura, só SELECT, sem dados pessoais): 4 grifos (otb01×3, otb02×1), 8 traços em «otb01>71», 0 notas. Motor de grifos antes/depois: 4/4 ancoram, 0 perdidos, 0 movidos.

## Lei das questões
Nenhuma questão nova: o conteúdo adicionado é um nome/lista de exemplos, sem valor avaliativo novo além do que as questões existentes já cobram. Nada a espelhar no banco.

## Planejamento (fila)
- Primeiros Auxílios: 7 PDFs (1, 2, 3, Clase 4, 5, 6 RCP, 7 vías aéreas/IOT) ainda não abertos; ler antes de decidir estrutura.
- Interculturalidad: 11 PDFs; checar sobreposição com a matéria `guarani` e se «Optativa II» é matéria separada — **decisão de José**. Criar páginas novas toca menu/layout (área crítica).

## Avisos do Guard (#713) — comparação com a `main`
Rodei o Guard com a `main` alterada só por uma quebra de linha em `ortopedia.html`: os mesmos dois avisos aparecem, logo **já existiam**.
- **banco-geral «455 sem correspondente»:** **falso positivo do método de comparação.** Medi diretamente: bloco = 457 perguntas (ids q-orto1…458, um id vago), banco = 457; **457/457 enunciados do banco são idênticos aos do corpo**; 455 distintos (2 enunciados repetidos já existentes na `main`: pendência antiga, não tocada).
- **contagens «16,17,18,21,22,25 não batem com 457/914»:** **falso positivo.** São contagens por bloco (barras da estatística do banco); somam 29+17+52+32+21+25+35+30+18+21+22+32+38+26+16+27+16 = **457** = perguntas no corpo = no banco.
- **escopo (tarefa não está em tasks.json) e registro-tarefas (neurologia sem arquivos):** avisos já existentes, sem relação com esta PR.
- Erro real encontrado e corrigido nesta rodada: o escopo da PR usava o nome curto do arquivo (Guard reprovou); agora usa o caminho completo e o Guard remoto passou com avisos.
- Correção de minha afirmação anterior: eu havia escrito «240 questões»; o número correto é **457**.
- Guard não foi alterado.
