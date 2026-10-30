# Medicina Familiar após o merge da #599 · evidência de estado, roteiro controlado e ordem das próximas matérias

> Data: 30/10/2026, `main` `9d59a061` (contém a #599, `0fc98df8`). **Nenhuma flag, variável do Netlify, matéria ou lista de contas foi tocada.** Consultas ao banco: somente leitura, só agregados.

## 1 · Medicina Familiar está desligada? — o que é prova e o que não é

| Pergunta | Evidência | Resultado |
|---|---|---|
| A 1.ª fechadura está no ar no código? | `git show origin/main:…/rm-pilot.js` → `CANDIDATAS = ['semiologia-ii','medicina-familiar']`, `VER = '2026102901'` | **Sim** (no repositório) |
| O repositório liga a matéria? | `nao-ativacao` E4 (18/18, rodado hoje na main): `netlify.toml` e nenhum arquivo de configuração atribuem `RM_LAYOUT_SLUGS`/`RM_PEN_SLUGS`/`RM_VISUAL_SLUGS`; `ROLLOUT='beta'` | **Não liga** (por repositório) |
| O deploy de produção está com esse código? | Tentativa de `curl https://repassomed.netlify.app/…` (projeto Netlify `repassomed`, vide comentário do bot na #599): **403 do proxy de saída** (host fora da lista permitida do ambiente) | **Não verificável daqui** |
| As variáveis reais do Netlify contêm `medicina-familiar`? | Sem CLI, token, conector nem rede até o Netlify | **NÃO DETERMINADO** — não se presume |
| Há efeito visível em dados? | Contagens em §3 idênticas às de 28/10 | Compatível com "desligada", **sem provar** (layout não grava dados) |

**Conclusão honesta:** o código está pronto e fail-closed; **o estado ligado/desligado em produção não foi provado**. A prova mínima exige olhar o painel (§2, passo 0) ou liberar o host para a sonda.

**Teste de produção ao meu alcance:** `tools/qa/pre-voo/sonda-producao.sh https://<site>` (somente leitura, sem token). Prova o código no ar (CANDIDATAS, versão do `rm-pilot.js` e tag do `index.html`) e que, **sem login, tudo é negado com corpo idêntico ao de slug inventado**. Não prova nada sobre a conta de José nem sobre o valor das variáveis. Está **bloqueada pela rede**: para eu rodá-la, adicionar `repassomed.netlify.app` (e o domínio próprio, se houver) em *Allowed domains* da rede do ambiente (menu do ambiente na barra do título → Edit → Network access).

## 2 · Roteiro controlado (layout → observação → caneta)

| Passo | Quem | Ação | Prova / critério | Volta |
|---|---|---|---|---|
| **0** | **José (físico, ~1 min)** | Netlify → Environment variables: `RM_LAYOUT_SLUGS`, `RM_PEN_SLUGS`, `RM_VISUAL_SLUGS` sem `medicina-familiar` (não existem ou vazias). Não copiar valores. | as três sem o slug | tirar o slug da que o tiver |
| 1 | Claude | Contagens antes (§3), sonda de produção (se a rede for liberada), testes no navegador (§4) | tudo verde | — |
| 2 | **José** | `RM_LAYOUT_SLUGS=medicina-familiar` + conta própria em `RM_PILOT_LAYOUT_UIDS` (toda conta dessa lista verá o layout) → *Trigger deploy* | — | L1 |
| 3 | **José (físico, ~3 min)** | iPad, aba nova: layout novo; 3 blocos pelo índice; rolar uma tabela larga (a página não alarga); marcar 1 trecho em `aps` e recarregar. Outra conta/aba anônima: layout **antigo** | itens ok | L1 |
| 4 | Claude | Contagens 24 h depois (mesmo SQL). Qualquer contagem **menor** ⇒ parar | iguais ou maiores | L1 |
| 5 | **José** | só após 4 ok: `RM_PEN_SLUGS=medicina-familiar` + conta em `RM_PILOT_PEN_UIDS` → deploy | — | L2 |
| 6 | **José (físico, ~2 min)** + Claude | Pencil num parágrafo e numa tabela, recarregar, o traço volta no lugar; Claude conta traços antes/depois | traço persiste | L2 |

**Volta pronta:** L1 tirar o slug de `RM_LAYOUT_SLUGS` (e de `RM_PEN_SLUGS`) + deploy; L2 só `RM_PEN_SLUGS`; L3 esvaziar `RM_PILOT_LAYOUT_UIDS` (afeta também o piloto); L4 `git revert` da #599 + tags **maiores** que `2026102901`; L5 `ROLLOUT='off'`. Provados no navegador (cena F, 390 e 1440 px: layout antigo de volta, grifos/traços/notas idênticos).

## 3 · Contagens somente leitura (30/10/2026, antes de qualquer ativação)

`tools/qa/pre-voo/contagens-materia.sql`: **grifos 18 (1 aluno) · traços 0 · notas 0 · progresso 4 alunos**. Idêntico a 28/10. Repetir após os passos 3 e 6.

## 4 · Teste próprio no navegador (main `9d59a061`, já com a #599)

`medfam-implantacao` **87/87** (390 e 1440 px: padrão, só 1.ª chave, duas chaves, conta/slug errados, caneta, volta, vizinhas) · `nao-ativacao` **18/18** · `gate-por-materia` **48/48** · grifos sintéticos **24/24** (inventado não pinta) · porta de Medicina Familiar **ABERTA 7/7** · `agrega-no-html` 0 faltando.

## 5 · Ordem proposta das próximas matérias (nenhuma é ativada antes de fechar Medicina Familiar)

Critérios: (a) dados do aluno (traço pesa mais que grifo; grifo de muitos alunos pesa mais que de um); (b) estabilidade editorial (última edição ≥ 48 h, sem PR aberta); (c) imagens/tabelas (reflow no iPad); (d) porta no dia; (e) benefício (alunos ativos). Dados vivos de 30/10 (grifos/alunos com grifo · traços · notas · alunos ativos) e inventário.

| Ordem | Matéria | Dados vivos | Imagens · seções | Estado editorial | Porta | Observação |
|---|---|---|---|---|---|---|
| **1** | **Fisiopatología I** | 33/1 · 0 · 0 · 9 alunos | 39 · 14 | estável (24/10) | ABERTA 7/7 | pré-voo e ensaio 87/87 prontos (`PROXIMA-MATERIA-FISIOPATOLOGIA-I.md`) |
| 2 | Farmacología I | 23/2 · 0 · 0 · 12 | 72 · 21 | estável (24/10) | ABERTA 7/7 | mais imagens: medir reflow no iPad |
| 3 | Matérias sem nenhum dado de aluno, por nº de alunos e estabilidade: AP Práctica (9) · Toxicología (7) · Dermatología (5) · Histología I (3) · Biología (3) · Embriología (2) · Guaraní (1) | 0 · 0 · 0 | 31–58 · 12–19 | **editadas em 28/10**: aguardar 48 h sem commit e refazer a porta no dia | ver §6 | risco de dados nulo; o risco é de reflow/estrutura em mudança |
| 4 | Semiología I · Anatomía I · Histología II | 1/1 · 6/2 · 42/1; 0 traços | 75–121 imagens | Semiología I: **edição G0 em curso (congelar estrutura)** | a refazer | Anatomía I: 140 tabelas, 37 seções (desempenho) |
| 5 | Fisiopatología II · AP I | 47/5 · 60/7; 0 traços; 24 e 28 alunos | 31–33 · 15–20 | editadas 24–28/10 | a refazer | muitos alunos: **avisar**; conferir `ids-vs-banco.py` com a consulta do dia |
| 6 | Imagens pesadas: Histología I/II Práctica, AP II Práctica | 0 ou 4 grifos | **314–680 imagens** | editadas 28/10 | a refazer | medir reflow no aparelho antes (R5) |
| 7 | Com traços ou centenas de grifos: Neurología (1 traço) · Farmacología II (1 traço, 240 grifos/12 alunos, 65 ativos) · Medicina Legal (260 grifos, 1 nota) · Oftalmología (858 grifos) · AP II (378/10, 55 ativos) · Anestesiología (4 traços) · Ortopedia (8 traços) | alto | — | — | — | conferir os traços na conta do dono; **avisar alunos**; congelar estrutura |
| — | Semiología II: piloto já ativo (152 grifos/8 alunos, 26 traços de 1 aluno) · Imagenología: fora por decisão de José | | | | | |

Áudio e infográficos: fora desta ordem.

## 6 · Portas de hoje (main `9d59a061`, somente leitura)

`porta-da-materia.sh` na `main` `9d59a061` (7 etapas cada): **Medicina Familiar ABERTA** · **Fisiopatología I ABERTA** e **Farmacología I ABERTA** (28/10, `main` `e43a267e`; as mudanças de `main` desde então foram só coordenação, Semiología II e inventário de Toxicología) · **AP Práctica ABERTA** · **Dermatología ABERTA** · **Toxicología ABERTA** (a #605 regenerou o inventário). Demais matérias: refazer a porta no dia, depois de 48 h sem commit. «Porta aberta» **não liga nada**.
