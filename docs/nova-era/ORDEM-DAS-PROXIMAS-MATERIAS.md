# Ordem das próximas matérias (Nova Era) · pré-voo somente leitura

> Data: 30/10/2026 (`main` `191fc730`). Nenhuma matéria foi ativada. Para cada matéria o caminho é o mesmo de Medicina Familiar (`IMPLANTACAO-POR-MATERIA.md`): **PR própria** que a coloca em `CANDIDATAS` → SQL `preview` (José no iPad) → SQL `all`. Dados vivos: consulta somente leitura, só agregados.

## Ordem proposta (nenhuma é ativada antes de fechar Medicina Familiar)

Critérios: (a) dados do aluno (traço pesa mais que grifo; grifo de muitos alunos pesa mais que de um); (b) estabilidade editorial (última edição ≥ 48 h, sem PR aberta); (c) imagens/tabelas (reflow no iPad); (d) porta no dia; (e) benefício (alunos ativos). Dados vivos de 30/10 (grifos/alunos com grifo · traços · notas · alunos ativos) e inventário.

| Ordem | Matéria | Dados vivos | Imagens · seções | Estado editorial | Porta | Observação |
|---|---|---|---|---|---|---|
| **1** | **Fisiopatología I** | 33/1 · 0 · 0 · 9 alunos | 39 · 14 | estável (24/10) | ABERTA 7/7 | porta aberta; pré-voo de 28/10: ensaio de layout 236/236, grifos de 1 aluno concentrados em 1 bloco (30 de 33) |
| 2 | Farmacología I | 23/2 · 0 · 0 · 12 | 72 · 21 | estável (24/10) | ABERTA 7/7 | mais imagens: medir reflow no iPad |
| 3 | Matérias sem nenhum dado de aluno, por nº de alunos e estabilidade: AP Práctica (9) · Toxicología (7) · Dermatología (5) · Histología I (3) · Biología (3) · Embriología (2) · Guaraní (1) | 0 · 0 · 0 | 31–58 · 12–19 | **editadas em 28/10**: aguardar 48 h sem commit e refazer a porta no dia | ver §6 | risco de dados nulo; o risco é de reflow/estrutura em mudança |
| 4 | Semiología I · Anatomía I · Histología II | 1/1 · 6/2 · 42/1; 0 traços | 75–121 imagens | Semiología I: **edição G0 em curso (congelar estrutura)** | a refazer | Anatomía I: 140 tabelas, 37 seções (desempenho) |
| 5 | Fisiopatología II · AP I | 47/5 · 60/7; 0 traços; 24 e 28 alunos | 31–33 · 15–20 | editadas 24–28/10 | a refazer | muitos alunos: **avisar**; conferir `ids-vs-banco.py` com a consulta do dia |
| 6 | Imagens pesadas: Histología I/II Práctica, AP II Práctica | 0 ou 4 grifos | **314–680 imagens** | editadas 28/10 | a refazer | medir reflow no aparelho antes (R5) |
| 7 | Com traços ou centenas de grifos: Neurología (1 traço) · Farmacología II (1 traço, 240 grifos/12 alunos, 65 ativos) · Medicina Legal (260 grifos, 1 nota) · Oftalmología (858 grifos) · AP II (378/10, 55 ativos) · Anestesiología (4 traços) · Ortopedia (8 traços) | alto | — | — | — | conferir os traços na conta do dono; **avisar alunos**; congelar estrutura |
| — | Semiología II: piloto já ativo (152 grifos/8 alunos, 26 traços de 1 aluno) · Imagenología: fora por decisão de José | | | | | |

Áudio e infográficos: fora desta ordem.

## Portas de hoje (main `9d59a061`, somente leitura)

`porta-da-materia.sh` na `main` `9d59a061` (7 etapas cada): **Medicina Familiar ABERTA** · **Fisiopatología I ABERTA** e **Farmacología I ABERTA** (28/10, `main` `e43a267e`; as mudanças de `main` desde então foram só coordenação, Semiología II e inventário de Toxicología) · **AP Práctica ABERTA** · **Dermatología ABERTA** · **Toxicología ABERTA** (a #605 regenerou o inventário). Demais matérias: refazer a porta no dia, depois de 48 h sem commit. «Porta aberta» **não liga nada**.
