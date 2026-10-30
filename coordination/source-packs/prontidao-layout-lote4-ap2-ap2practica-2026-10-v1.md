# Prontidão de layout/caneta · lote 4 · AP II e AP II Práctica

**Data:** 30/10/2026 · **Base:** `main` `60730c32` (arquivos de AP II e AP II Práctica iguais na `main` posterior) · **Agente:** Claude 1 · **Escopo:** só relatório; nenhuma matéria, flag, motor, painel ou `tasks.json` alterado. Nada foi ativado.

## Classificação

| Matéria | Resultado | Motivo | Próxima ação |
|---|---|---|---|
| **AP II** (`anatomia-patologica-ii`) | **Pronta com limite** | Porta 7/7 (inclui o pager Anterior/Próximo, antes bloqueado por `ap2biblio`). É a matéria com **mais dados de alunos**: 378 grifos (consulta de 30/10). Limite: itens «sem lastro nos slides» declarados na #499 continuam como estão; consulta de dados de hoje não repetida (Supabase desconectado) | Implantar só depois das matérias sem grifos; reconsultar dados + roteiro físico; qualquer edição futura de `ap2b01` exige o teste de grifos com o resolvedor real |
| **AP II Práctica** (`anatomia-patologica-ii-practica`) | **Pronta com limite** | Porta 7/7; sem erro de conteúdo achado. Limite: **a comparação visual das 43 imagens da P2 com os originais do Drive não foi possível** (ver abaixo); sem dados de alunos | Quando o conector do Drive permitir, comparar as imagens com os originais; até lá a classificação não depende disso para layout/caneta |

Nenhuma está bloqueada: nenhum PR de correção.

## Testes executados

`NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh <slug>`: **PORTA ABERTA** nas duas (7 passos: inventário, `data-rm-agrega`, âncoras, ida e volta, layout 390/768/1024/1440, uso com caneta, inventário de risco).

| Verificação | AP II | AP II Práctica |
|---|---|---|
| Início direto no conteúdo | `ap2b01` «Patologías de la cavidad oral y glándulas salivales» (a `ap2intro` foi movida para o fim, só para preservar 2 grifos) | `ap2pb01` «Carcinoma epidermoide de lengua» |
| Seções de ensino | 8 blocos + banco + mazo + `ap2biblio` (agora com `<h2>`) | 16 blocos (P1 `01–07`, P2 `08–16`) + banco, mazo e cierre |
| Perguntas / cartões | 312 / 480 | 440 / 864 |
| Letras do gabarito a/b/c/d | 72/70/68/66 (maior corrida 4) | 92/98/98/88 (maior corrida 2) |
| Imagens referenciadas / faltando / sem `alt` | 43 / 0 / 0 | 106 / 0 / 0 |
| IDs duplicados | 0 | 0 |
| Voz de prova (varredura) | 0 | 0 (1 aviso legítimo: «Ninguna se presenta como pregunta de examen») |
| `data-rm-agrega` | `bancoap2`, `bancofcap2` reconhecidos pelo nome | `ap2pmazo` declarado (#597) |
| Guard (arquivo inteiro) | ok | ok |

## Dados de alunos (somente leitura)

- **Consulta de 30/10/2026 (SELECT):** `anatomia-patologica-ii`: `ap2b01` 291 grifos de 6 usuários, `ap2b03` 74, `ap2b04` 10, `ap2b02` 1, `ap2intro` 2 (total 378); **notas 0; traços 0**. `anatomia-patologica-ii-practica` / `anatoprat2`: **0 grifos, 0 notas, 0 traços**.
- Teste com o resolvedor real do site (`RMTools.resolverAncora`) sobre os 291 grifos de `ap2b01`: antes e depois da edição da #609, **0 mudam**; 1 já não resolvia antes (preexistente).
- Hoje o Supabase está desconectado: nenhuma consulta nova, nada gravado.

## Tentativa final de comparar visualmente as 43 imagens da P2 com o material oficial do Drive

**Resultado: nenhuma das 43 foi conferida visualmente contra os arquivos oficiais do Drive.**

1. O download do PDF `09 - Duodenitis cronica.pdf` (7,4 MB) fez o conector fechar a conexão.
2. A chamada com `download_raw_file: true` e `include_base64: false` voltou **HTTP 400** («Unknown name … Cannot find field»): esta sessão não expõe esses campos.
3. Na última tentativa (30/10) o conector do Drive estava **desconectado** e a busca de ferramentas não o encontra; a tentativa terminou ali, sem repetir.

**O que foi realmente conferido (e contra quê):**
- **Texto dos originais** (leitura da camada de texto pelo conector, sem imagens): as 9 fichas do laminário P2 e os números dos PDFs 07–12 coincidem com os blocos 08–16. Isto é conferência de **texto**, não visual.
- **Cópias compactadas enviadas por José** (`Láminas Anatopato 6D - P2 compressed` com 19 páginas e `ilovepdf_merged_compressed` com 51 páginas): as 43 imagens foram vistas por mim e casadas por correspondência de pontos de imagem (SIFT) com a página correspondente. O texto das 19 páginas do laminário compactado é **idêntico** ao do original do Drive.
  - 14 lâminas `lam-6d-p2-*`: ≥1.087 pontos; páginas 2/3, 4/5, 6–7, 8–9, 10/11, 12/13, 14–15, 16–17, 18/19.
  - 29 imagens de apoio `p2-*`: ≥167 pontos (as mais fracas: `p2-cirrosis-nodulos` 167, `p2-apendicitis-exudado` 192, `p2-apendicitis-vasos` 204); páginas compactadas 2/4, 10–12, 22–23, 32–34, 42–43, 46–50.
- **Alt, legendas e respostas entregues:** 21 das 43 aparecem em perguntas/cartões; nenhuma tem rótulo ou legenda que dê o diagnóstico; as duas com texto próprio (enema e «STENOSING / INFILTRATING») ficam só na galeria. Um alt de cartão dizia «cordones tumorales» e foi corrigido na #597.

**O que NÃO foi conferido contra o original do Drive:**
- as imagens de cada uma das 19 páginas do laminário (49,8 MB);
- a página de cada uma das 29 imagens de apoio nos PDFs 07 a 12 (8,3 a 16,9 MB; o conector só entrega o texto);
- a procedência das fotos macroscópicas e do enema;
- contrastes finos de cor/resolução entre a cópia compactada e o original.

Nenhuma imagem foi retirada; nenhum erro grave foi encontrado.

## Risco real e ordem recomendada

- **AP II:** risco principal = dados de alunos (378 grifos, 6–9 usuários). Implantar por último de toda a fila; reconsultar antes; qualquer edição de texto grifado só com teste do resolvedor.
- **AP II Práctica:** sem dados de alunos; a pendência da comparação visual não bloqueia layout/caneta.
- **Ordem entre as duas:** (1) AP II Práctica, (2) AP II.
