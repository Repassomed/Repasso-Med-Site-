# Ensaio do novo layout em todas as matérias (issue #457)

Isolado do site: **não é carregado por nenhuma página**, não altera arquivos de produção, não toca flags, UID nem slug do piloto, não escreve no Supabase (sessão simulada), não usa rede externa e **não toca áudio** (a bateria de interação usa um manifesto SIMULADO só para medir presença/ausência de cards).

| Arquivo | Função |
|---|---|
| `lib.cjs` | catálogo real (`CATALOGO` × `FILES`), servidor local, adaptações **em memória** (A1/A2/A7 e, só com `?corr=1`, C1–C8); manifesto de áudio simulado; `RM_ENSAIO_REF=<ref>` serve `assets/` de outro commit (controle negativo) |
| `harness.html` · `ativar.js` | página do ensaio (index/app-core/rm-tools reais + matéria real) e ativador que repete a sequência do `rm-pilot.js` para o slug ensaiado; gera o descritor da matéria a partir do conteúdo; `?persist=1` = Supabase simulado com persistência em sessionStorage (tinta/grifos/notas); `?audio=1` = carrega o `rm-audio-boot.js` real |
| `inventario.cjs` · `inventario-md.cjs` · `derivar.cjs` | checkpoint A: inventário medido no navegador → `docs/layout-ensaio/INVENTARIO.md` |
| `ensaio.cjs` | checkpoint B: bateria por matéria × 390/768/1024/1440 → `docs/layout-ensaio/resultados*/<slug>.json` |
| `modelo.cjs` · `regras.cjs` | modelo por item de uma matéria (DOMParser) e regras R1–R9 puras, item a item |
| `contrato.cjs` | checkpoint C: aplica R1–R9 às 27 matérias → `CONFORMIDADE.md` (lê o HTML real, não precisa do inventário) |
| `contrato.teste.cjs` | **casos negativos** que provam que R4, R5 e R9 falham quando devem (e que a regra antiga passava); saída em `docs/layout-ensaio/contrato.teste.saida.txt` |
| `compactar.cjs` | junta os JSON completos por matéria (`resultados*/`, **não versionados**) em `resultado-compacto.json` (versionado, uma linha por matéria) |
| `matriz.cjs` | checkpoint D: `MATRIZ.md` (PASSA / FALHA / BLOQUEADO), lê só o resultado compacto |
| `interacao.cjs` · `interacao-md.cjs` | 2.ª rodada (#457/#459 pós-#479): **uso** por matéria × 390/768/1024/1440 — caneta (CDP «pen»), palma, rolagem com lápis/goma, tabela larga, pinça, escrever com zoom, goma + Deshacer, grifo, troca de bloco/modo, recarregar, questões, flashcards, audiobook → `INTERACAO.md` + `interacao-compacto.json` |

Documentos: `docs/layout-ensaio/{INVENTARIO,MATRIZ,INTERACAO,CONFORMIDADE,CONTRATO-NOVOS-RECURSOS,PATCHES-PARA-INTEGRACAO,PENDENCIAS-ENSAIO-GLOBAL}.md`.

```bash
export NODE_PATH=$(npm root -g)
node tools/qa/ensaio-layout/inventario.cjs && node tools/qa/ensaio-layout/inventario-md.cjs
node tools/qa/ensaio-layout/ensaio.cjs [slug …] [--rapido] [--corr]
node tools/qa/ensaio-layout/interacao.cjs [slug …] [--rapido] && node tools/qa/ensaio-layout/interacao-md.cjs
node tools/qa/ensaio-layout/compactar.cjs && node tools/qa/ensaio-layout/contrato.teste.cjs && node tools/qa/ensaio-layout/contrato.cjs && node tools/qa/ensaio-layout/inventario-md.cjs && node tools/qa/ensaio-layout/matriz.cjs
```

**Leitura obrigatória:** os temas/descritores gerados para as 26 matérias sem tema próprio são **hipótese técnica** (não identidade visual aprovada); o teste de caneta do `ensaio.cjs` usa **um traço simulado**; o do `interacao.cjs` usa eventos CDP confiáveis do Chromium — **nenhum dos dois é o iPad/Apple Pencil** (ver `INTERACAO.md` §6); `PASSA` não é liberação.
