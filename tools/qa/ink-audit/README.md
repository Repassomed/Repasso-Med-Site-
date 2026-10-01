# Auditoria da caneta (traços) — testes reproduzíveis

Suítes **diagnósticas** da persistência, RLS, falhas, paginação, viewports e volume dos traços (`user_ink_strokes`).
Relatório e parecer: [`RELATORIO.md`](RELATORIO.md). **Não altera nenhum arquivo de produto** e **nunca** fala com o Supabase real.

## Ambiente
- **Banco isolado real:** PostgreSQL 16 local + a **migration real** `20260913_09_study_tools_v2.sql` (RLS/constraints/policies reais) — `db/setup.sh` (porta 54329, `postgres://postgres@127.0.0.1:54329/inktest`).
- **Emulado (declarado):** servidor PostgREST + GoTrue + teto `max_rows` em `adapter.cjs`; o navegador é Chromium real com o `rm-tools-v2.js` e o `supabase-js` reais. Isto **não** comprova o Supabase hospedado.
- `service_role`/superuser só **observa** o estado (`lib.sql`); provas de isolamento usam `SET ROLE authenticated` + claims e sessões reais de A e B.

## Pré-requisitos
```bash
bash tools/qa/ink-audit/db/setup.sh                       # banco isolado + migration real
npm pack @supabase/supabase-js@2 && tar xzf supabase-supabase-js-*.tgz
export RM_SUPABASE_UMD=$PWD/package/dist/umd/supabase.js  # o mesmo bundle que o site carrega do CDN
export PG_MODULE=/caminho/para/node_modules/pg             # npm i pg
export RM_PLAYWRIGHT=playwright                            # ou caminho do módulo
bash tools/qa/ink-audit/run-all.sh                         # ≈ 10 min
```
Variáveis opcionais: `PGURL`, `PGADMIN`, `RM_SITE_DIR`, `RM_MATERIAS_DIR`, `RM_MAX_ROWS` (padrão 1000).

## Suítes
| Arquivo | Conteúdo |
|---|---|
| `01-rls.test.cjs` | RLS com duas identidades; anon; JWT adulterado; constraints |
| `02-persistence.test.cjs` | desenhar → 201 → sessão independente; undo/borracha; 2 sessões escrevendo |
| `03-failures.test.cjs` | rede lenta/pendurada/offline; 500/401/403/429/503; resposta perdida; DELETE que falha; fechar com operação pendente; traço denso |
| `04-pagination.test.cjs` | 999/1000/1001/1500/2500 traços; teto do servidor |
| `05-viewports.test.cjs` | **emulação** de 9 perfis, rotação, pinch-zoom, imagens, saltos em matéria longa |
| `06-volume.test.cjs` | curva por volume, concorrência HTTP limitada, 10 navegadores simultâneos |
| `07-pilot-path.test.cjs` | caminho do piloto (UID do José) pós-#416, comparado ao usuário comum |

As asserções marcadas «RISCO/ACHADO» **passam porque documentam um defeito**; quando ele for corrigido em `rm-tools-v2.js`, devem ser invertidas.
A suíte é sensível à carga da máquina: se só o cenário 6 de `03-failures` falhar numa execução completa, repita a suíte isolada.
