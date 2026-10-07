# Ensaio do novo layout em todas as matérias (issue #457)

Isolado do site: **não é carregado por nenhuma página**, não altera arquivos de produção, não toca flags, UID nem slug do piloto, não escreve no Supabase (sessão simulada), não usa rede externa e **não simula áudio**.

| Arquivo | Função |
|---|---|
| `lib.cjs` | catálogo real (`CATALOGO` × `FILES`), servidor local, adaptações **em memória** (A1/A2 e, só com `?corr=1`, C1/C2) |
| `harness.html` · `ativar.js` | página do ensaio (index/app-core/rm-tools reais + matéria real) e ativador que repete a sequência do `rm-pilot.js` para o slug ensaiado; gera o descritor da matéria a partir do conteúdo |
| `inventario.cjs` · `inventario-md.cjs` · `derivar.cjs` | checkpoint A: inventário medido no navegador → `docs/layout-ensaio/INVENTARIO.md` |
| `ensaio.cjs` | checkpoint B: bateria por matéria × 390/768/1024/1440 → `docs/layout-ensaio/resultados*/<slug>.json` |
| `contrato.cjs` | checkpoint C: regras R1–R9 do contrato → `CONFORMIDADE.md` |
| `compactar.cjs` | junta os JSON completos por matéria (`resultados*/`, **não versionados**) em `resultado-compacto.json` (versionado, uma linha por matéria) |
| `matriz.cjs` | checkpoint D: `MATRIZ.md` (PASSA / FALHA / BLOQUEADO), lê só o resultado compacto |

Documentos: `docs/layout-ensaio/{INVENTARIO,MATRIZ,CONFORMIDADE,CONTRATO-NOVOS-RECURSOS,PATCHES-PARA-INTEGRACAO}.md`.

```bash
export NODE_PATH=$(npm root -g)
node tools/qa/ensaio-layout/inventario.cjs && node tools/qa/ensaio-layout/inventario-md.cjs
node tools/qa/ensaio-layout/ensaio.cjs [slug …] [--rapido] [--corr]
node tools/qa/ensaio-layout/compactar.cjs && node tools/qa/ensaio-layout/contrato.cjs && node tools/qa/ensaio-layout/matriz.cjs
```

**Leitura obrigatória:** os temas/descritores gerados para as 26 matérias sem tema próprio são **hipótese técnica** (não identidade visual aprovada); o teste de caneta usa **um traço simulado** (não mede atraso/perda reais nem a #456); `PASSA` não é liberação.
