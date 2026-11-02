# Próximas matérias · preparar e liberar em grupos, com testes feitos pelo Claude

> Proposta. Nada aqui ativa matéria nenhuma. Base: o que Medicina Familiar provou (tema próprio, layout, caneta, prévia só do administrador, volta por linha de SQL).

## 1 · Princípios
1. **Grupo serve só para PREPARAR.** Um grupo reúne matérias de risco e estrutura parecidos; a PR de preparação coloca todas em `CANDIDATAS`, traz o tema de cada uma e os testes. **Preparar em grupo não liga nada**: todas nascem `off | off | off`.
   **Prévia, aprovação e liberação pública são sempre MATÉRIA POR MATÉRIA**: um comando de prévia por matéria (`where slug = '<matéria>'`), uma aprovação de José por matéria, uma liberação aos alunos por matéria (e por recurso). Nenhum comando liga ou libera um grupo inteiro.
2. **Quem testa é o Claude.** Para cada matéria, antes de pedir qualquer olhar de José: porta do pré-voo (7 etapas), conteúdo preservado com e sem tema (`visual-conteudo`), dados (grifos, traços, notas: antes/depois/volta), caneta com layout e tema (`medfam-caneta`, hoje parametrizada só para Medicina Familiar), acesso privado (aluno, 2.º testador, sem acesso, outra matéria), troca de conta, capturas comparáveis a 1440, 768 e 390 px. José só **vê** a prévia no tempo dele.
3. **Liberar aos alunos é por matéria e por recurso** (`layout_stage`, `visual_stage`, `pen_stage` = `all`), uma matéria de cada vez, com observação de 24 h e contagens de dados antes/depois (somente leitura).
4. **Volta por linha de SQL**, sempre por matéria (um `update … where slug = '<matéria>'`).

## 2 · Esteira de preparação (por matéria, automatizável)
| Etapa | O que o Claude faz | Prova |
|---|---|---|
| 1 | Descritor do tema (`clasificar`, unidades, cores) + bloco de variáveis em `rm-materia-sistema.css` (paleta de 6 tons com `strong/tint/tag`, superfície distinta das já usadas) | capturas, `visual-conteudo` |
| 2 | Porta do pré-voo no dia (`porta-da-materia.sh`) | 7/7 |
| 3 | `visual-conteudo` com o `--slug` da matéria | texto, ids, imagens, questões, cartões idênticos; 0 elemento didático escondido |
| 4 | Navegador por matéria (cenas 0–17 parametrizadas por slug) | dados idênticos, volta, troca de conta, acesso privado |
| 5 | Caneta (`medfam-caneta` por slug): parágrafo, tabela, anotação, caixa | 0 pontos perdidos, ≤ 1,6 px, recarga |
| 6 | Capturas comparáveis com Semiología II | arquivos em `docs/nova-era/capturas/<slug>/` |
| 7 | Linha `off \| off \| off` na tabela (migração aditiva) | contagem antes/depois |

Trabalho a fazer uma vez, antes do 1.º grupo: parametrizar por slug `navegador.test`, `medfam-caneta` e `capturas` (hoje fixos em Medicina Familiar); isso vira o comando único `grupo.sh <slug…>`.

## 3 · Grupos propostos (ordem e critério: dados do aluno, estabilidade editorial, imagens/tabelas, porta)
| Grupo | Matérias | Por quê | Cuidado |
|---|---|---|---|
| **G1** | Fisiopatología I · Farmacología I | porta aberta, 23–33 grifos de 1–2 alunos, 0 traços, estáveis desde 24/10; 9–12 alunos ativos | Farmacología I: 72 imagens (medir reflow em celular/tablet emulados) |
| **G2** | Dermatología · Toxicología · AP Práctica · Histología I · Biología · Embriología · Guaraní | **0 grifos/traços/notas** (risco nulo para dados) | editadas em 28/10: esperar 48 h sem commit e refazer a porta; AP Práctica tem 9 alunos ativos |
| **G3** | Histología I Práctica · Histología II Práctica · AP II Práctica | mesma família (práticas, lâminas) | **314–680 imagens**: reflow e desempenho primeiro; pode exigir o teste físico |
| **G4** | Anatomía I · Histología II · Fisiopatología II · AP I | poucos traços, grifos de 1–7 alunos | Anatomía I: 37 seções e 140 tabelas (desempenho); Fisiopatología II/AP I têm 24–28 alunos ativos: **avisar** |
| **G5 (uma a uma)** | Neurología · Farmacología II · Medicina Legal · Oftalmología · AP II · Anestesiología · Ortopedia | centenas de grifos ou traços reais | conferir a conta do dono dos traços; **avisar alunos**; congelar estrutura |
| fora | Semiología II (piloto) · Semiología I (edição G0 em curso) · Imagenología (decisão de José) | | |

## 4 · Como cada grupo é preparado e cada matéria sobe
**Preparação (em grupo):**
1. PR de preparação do grupo (código dos temas + `CANDIDATAS` + testes + capturas por matéria), Guard verde, merge por José. Nenhuma matéria é ligada.
2. Deploy conferido (Netlify, linha **Production: main**).

**Prévia, aprovação e liberação (uma matéria de cada vez, na ordem que José escolher):**
3. Um comando de **prévia** só daquela matéria (administrador). Pode ficar ligada enquanto as outras são preparadas.
4. José vê a prévia no tempo dele e aprova **aquela matéria**.
5. Liberação pública daquela matéria: `all` por recurso (primeiro `layout_stage`, depois `visual_stage`, por fim `pen_stage`), 24 h entre passos, contagens somente leitura; qualquer queda ⇒ `off` por `update … where slug = '<matéria>'`.
6. Matéria com muitos alunos ativos (G4 e G5) **recebe o aviso** antes.

## 5 · Decisões que são de José (não são testes)
Aprovar a paleta de cada matéria (proposta com capturas), a ordem das matérias, e quando passar cada uma de `preview` a `all`. Nunca em bloco.
