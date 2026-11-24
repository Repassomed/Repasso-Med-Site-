# Levantamento da Nova Era — todas as matérias

**Gerado por** `tools/qa/nova-era/levantamento-nova-era.cjs` em 2026-11-24 sobre a `main` 3f6b3b2f. **Somente leitura do repositório**: nada ativado, nenhum SQL, nenhuma variável do Netlify tocada.

## Como ler
- **Preparada (layout + caneta)** = está em CANDIDATAS do `rm-pilot.js`, tem tema (css + js) e a **porta** (`porta-da-materia.sh`, 7 etapas) está **ABERTA** nesta `main`: inventário em dia, marcadores, âncoras (1440 e 390), ida-e-volta de grifos/traços/notas, layout em 4 larguras e uso/caneta nos modos. Isto **não liga nada**: quem liga é a linha de `rm_materia_rollout` (SQL de José, depois do deploy).
- **Ativação** é o **último registro** do painel (SELECT somente leitura de **17/11/2026**: só `medicina-familiar` tinha linha, em `preview`). **Não foi reverificada hoje** (esta rodada não executa SQL). Para conferir na hora: bloco 0 de `previa-lote.sql` (só leitura).
- Linha ausente, valor estranho ou erro = **desligada para todos**, inclusive administrador. `preview` = só administrador (hoje a conta de José). `all` = alunos que já têm a matéria.

## Resumo
- Candidatas: **25** · **preparadas (porta aberta)**: **24** · não preparadas/pendentes: **4** (inclui as 3 matérias fora de CANDIDATAS: neurologia, imagenologia, bioestadistica). Dentro do lote de prévia: **23** matérias.
- Ativas na conta de José (último registro): **medicina-familiar** (preview) e o piloto **semiologia-ii** (por UID). **Todas as demais: inativas** (sem linha).
- Ativas para alunos: **nenhuma** (último registro).

## Tabela

| matéria | candidata | tema | seções · perguntas · cartões | porta (7 etapas) | ativação (último registro) | no lote | testes dedicados |
|---|---|---|---|---|---|---|---|
| **semiologia-ii** | ✅ | ✅ | 14 · 254 · 366 | ✅ ABERTA | PILOTO: liberada por UID nas variáveis do Netlify (a tabela é ignorada nele) — não verificável pelo repositório | — | — |
| **medicina-familiar** | ✅ | ✅ | 12 · 90 · 177 | ❌ FECHADA | preview (layout, caneta e tema) · só administrador · desde 02/11 | — | — |
| **fisiopatologia** | ✅ | ✅ | 14 · 332 · 260 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **farmacologia** | ✅ | ✅ | 21 · 191 · 412 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **biologia** | ✅ | ✅ | 19 · 320 · 410 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-biologia |
| **embriologia** | ✅ | ✅ | 16 · 214 · 298 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-embriologia |
| **anatomia-patologica-practica** | ✅ | ✅ | 12 · 76 · 341 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **histologia-i** | ✅ | ✅ | 16 · 300 · 396 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **histologia-i-practica** | ✅ | ✅ | 17 · 212 · 286 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **histologia-ii** | ✅ | ✅ | 17 · 452 · 906 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **histologia-ii-practica** | ✅ | ✅ | 20 · 578 · 1233 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **fisiopatologia-ii** | ✅ | ✅ | 22 · 810 · 2181 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | integracao-fisio2, real-fisio2, temas-fisio2 |
| **toxicologia** | ✅ | ✅ | 19 · 702 · 1416 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-toxicologia |
| **anestesiologia** | ✅ | ✅ | 18 · 354 · 464 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-anestesiologia |
| **ortopedia** | ✅ | ✅ | 20 · 914 · 1296 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **oftalmologia** | ✅ | ✅ | 19 · 390 · 1011 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **anatomia-i** | ✅ | ✅ | 37 · 918 · 1646 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **anatomia-patologica** | ✅ | ✅ | 15 · 718 · 297 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | — |
| **farmacologia-ii** | ✅ | ✅ | 17 · 504 · 876 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | integracao-farmaco2, real-farmaco2, temas-farmaco2 |
| **anatomia-patologica-ii** | ✅ | ✅ | 12 · 448 · 531 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | integracao-ap2, real-ap2, temas-ap2 |
| **anatomia-patologica-ii-practica** | ✅ | ✅ | 22 · 488 · 924 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | integracao-ap2p, real-ap2p, temas-ap2p |
| **dermatologia** | ✅ | ✅ | 15 · 120 · 482 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-dermatologia |
| **guarani** | ✅ | ✅ | 16 · 418 · 596 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-guarani |
| **semiologia** | ✅ | ✅ | 11 · 220 · 192 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-semiologia |
| **medicina-legal** | ✅ | ✅ | 21 · 490 · 1176 | ✅ ABERTA | sem linha (= desligada para todos) | ✅ | real-medicina-legal |
| **neurologia** | ❌ | ❌ | 30 · 508 · 774 | — não rodada | — | — | — |
| **imagenologia** | ❌ | ❌ | 12 · 87 · 124 | — não rodada | — | — | — |
| **bioestadistica** | ❌ | ❌ | — · — · — | — não rodada | — | — | — |

## O que falta para a prévia privada (por matéria)
- **semiologia-ii** — preparada: porta aberta; mas o piloto é liberado por UID nas variáveis do Netlify, não pela tabela; fora do lote: piloto: decidido por UID nas variáveis do Netlify, não pela tabela; José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **medicina-familiar** — NÃO preparada: porta FECHADA (3-layout-4-larguras); porta genérica FECHADA: 5 conferências de «infografias» (capa/lateral/contagens) falham nas 4 larguras (20 falhas); a matéria é especial (já em preview desde 02/11, gate próprio `medfam-implantacao`/`medfam-caneta`) — não é defeito comprovado, mas a porta genérica não aprova; fora do lote: já em preview desde 02/11 (o lote nunca reduz nem mexe).
- **fisiopatologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **farmacologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **biologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **embriologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **anatomia-patologica-practica** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **histologia-i** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **histologia-i-practica** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **histologia-ii** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **histologia-ii-practica** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **fisiopatologia-ii** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **toxicologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **anestesiologia** — preparada: #710 (conteúdo: blocos 16–20) aberta — refazer a porta depois do merge dela; José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **ortopedia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **oftalmologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **anatomia-i** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **anatomia-patologica** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **farmacologia-ii** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **anatomia-patologica-ii** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **anatomia-patologica-ii-practica** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **dermatologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **guarani** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **semiologia** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **medicina-legal** — preparada: José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad.
- **neurologia** — NÃO preparada: não está em CANDIDATAS (1.ª fechadura ausente); porta já aberta em 30/10, mas a matéria está em reconstrução (#687/#682).
- **imagenologia** — NÃO preparada: fora da Nova Era por decisão de José (será refeita).
- **bioestadistica** — NÃO preparada: fora da Nova Era por decisão de José (será refeita).

## Limites
- «Preparada» é prova de **código + ensaio em navegador com Supabase simulado**, não de que José já viu a matéria no iPad: o roteiro físico de 3 min segue sendo dele.
- O inventário de perguntas/cartões vem de `docs/layout-ensaio/inventario.json` (gerado pela ferramenta; conferido pela etapa 0 da porta).
- Variáveis do Netlify (piloto) e a tabela real não são lidas aqui.
