# Pré-voo (somente leitura) da próxima matéria · Fisiopatología I

> **Nada foi ligado nem alterado.** Nenhum arquivo de matéria, variável do Netlify, `CANDIDATAS` ou flag. Este documento e o teste genérico `tools/qa/pre-voo/ativacao-materia.test.cjs` não abrem PR de ativação; a ativação só começa **depois** de Medicina Familiar (#599) concluída (merge + iPad + 24 h). Base: `main` `b9a76bee`, 28/10/2026. Consultas ao banco: somente leitura, só agregados (nenhum texto nem identificador de aluno em arquivo ou no Git).

## 1 · Escolha: Fisiopatología I (`fisiopatologia`, aba `fisio`)

| Critério | Fisiopatología I | Farmacología I (2.ª opção) |
|---|---|---|
| Onda do plano | 2 | 2 |
| Alunos com progresso (últ. atividade 28/10) | **9** | 11 |
| Grifos reais | **33 (1 aluno)** — 30 em `introduccion-fisio`, 2 em `inflamacion`, 1 em `hemorragia` | 23 (2 alunos) |
| Traços / notas reais | **0 / 0** | 0 / 0 |
| Imagens · tabelas · seções | **39 · 35 · 14** | 72 · 31 · 21 |
| Sub-âncoras (traço) · ids | 2974 · 146 | 1684 · 151 |
| Estado editorial | revisada em 16–24/10 (voz G0, fontes da cátedra, limites registrados); sem edição aberta | revisada em 22–24/10; sem edição aberta |
| **Porta** (`porta-da-materia.sh`, `main` atual) | **ABERTA 7/7** (layout 236/236 em 4 larguras; uso/caneta 46/46) | ABERTA 7/7 (idem) |

**Por que ela:** exposição mínima (um só aluno com dados, nenhum traço/nota), **a metade das imagens** da concorrente (menos risco de reflow em iPad), menos seções, atividade real de alunos (9; a matéria está em uso, então o ganho é concreto), e o mesmo perfil de risco de Medicina Familiar (grifos de 1 aluno, sem traço) que José já terá validado no iPad. Os 30 grifos concentrados em um bloco facilitam a conferência antes/depois.

**Descartadas agora:** Semiología I (edição G0 em curso: estrutura deve ficar congelada); Farmacología II, AP II, Oftalmología, Medicina Legal (centenas de grifos, 9–12 alunos; "avisar alunos"); Ortopedia, Anestesiología, Neurología (traços reais). *Alternativa de risco zero*, se José preferir: Dermatología, Embriología, Biología, Histología I ou Guaraní (0 grifos/traços/notas; 2–5 alunos): são mais seguras, mas beneficiam menos alunos.

## 2 · Riscos específicos e como estão cobertos

| Risco | Evidência / cobertura |
|---|---|
| Grifos de 24/09 deixam de pintar | Texto das 3 seções com grifo mudou ≤ 0,3 % desde a versão mais antiga disponível (30/09): `introduccion-fisio` −14 caracteres, `inflamacion` ratio 0,987, `hemorragia` 0,997. Parte dos grifos é muito curta (2 caracteres) ou usa ocorrência > 0 (4 de 30): são os frágeis. **A restauração dos grifos reais NÃO foi testada** (não se copia texto de aluno para teste); o teste sintético cobre o motor (contexto íntegro/velho/inexistente). Antes/depois por contagem, abaixo. |
| Traços | 0 reais. Âncoras estáveis (`ancoras-estaveis`): PASSA em 390 e 1440. |
| Imagens/reflow | 39 imagens; ensaio nas 4 larguras 236/236. **Reflow no iPad real: só o roteiro físico prova.** |
| Matéria já mexida por outro agente | `git log` do arquivo: última mudança 24/10; refazer `inventario-fresco.py` e a porta no dia do merge. |

## 3 · Testes prontos (todos somente leitura)

```
NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh fisiopatologia          # 7 etapas (feito: ABERTA)
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/ativacao-materia.test.cjs fisiopatologia  # cenas A–G em 390 e 1440 px, com as CANDIDATAS simuladas como [piloto, matéria]
```
`ativacao-materia.test.cjs` (resultado em §5): A padrão (variáveis vazias) · B só 1.ª chave · C duas chaves (layout monta, grifos/traços/notas idênticos) · D conta/slug errados · E caneta separada · F volta (tirar slug; esvaziar contas) · G vizinhas intactas. Para a restauração de grifos usar o análogo de `medfam-grifos-sinteticos.cjs` trocando o slug e os blocos (`introduccion-fisio`, `inflamacion`, `hemorragia`) — a fazer na PR de ativação.

**Antes/depois (consulta somente leitura, antes de ligar e 24 h depois):**
```sql
select count(*) from user_highlights  where subject_slug='fisiopatologia';   -- hoje 33
select count(*) from user_ink_strokes where subject_slug='fisiopatologia';   -- hoje 0
select count(*) from user_notes       where subject_slug='fisiopatologia';   -- hoje 0
```
Menor que antes = parar.

## 4 · Plano de volta (idêntico ao de Medicina Familiar)

L1 tirar `fisiopatologia` de `RM_LAYOUT_SLUGS` (e de `RM_PEN_SLUGS`) + deploy → layout antigo, dados intactos (cena F); L2 só a caneta; L3 esvaziar contas; L4 `git revert` da PR de candidata + tags maiores que as atuais; L5 `ROLLOUT='off'`. Sequência quando chegar a hora: **PR própria** (só `CANDIDATAS` + tag) → conferência do Netlify por José → layout só na conta dele → iPad 3 min → 24 h → caneta separada. Áudio e infográficos: fora.

## 5 · Resultado do ensaio

`ativacao-materia.test.cjs fisiopatologia` (390 e 1440 px; `rm-pilot.js` e função de servidor reais, ambiente e banco simulados, `CANDIDATAS` simuladas): **87/87**. Grifos, traços e notas semeados pelo motor real ficam **idênticos** antes, com o layout ligado e depois da volta; 0 escrita no banco; 0 erro JS; slug errado ou conta fora da lista ⇒ desligado; layout liberado não libera a caneta; vizinhas sem requisição. Porta: **ABERTA 7/7** (ensaio de layout 236/236 e uso/caneta 46/46, inventário em dia, âncoras estáveis, ida e volta).

**Não provado:** restauração dos 33 grifos reais (não se usa texto de aluno); Safari/Apple Pencil e reflow das 39 imagens no iPad; variáveis do Netlify.
