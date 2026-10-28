# Checklist das matérias

> ⚠️ **ESTADO ATUAL (28/10/2026): a tabela abaixo é histórica (19/10). Não use os símbolos e a lista de PRs antigas como autorização de merge.** #474, #481, #499, #532, #580, #593, #594, #595 e #597 foram mescladas. O painel PDF a PDF atualizado está em [ANOTACOES-DRIVE.md](ANOTACOES-DRIVE.md). O próximo passo é implantação controlada, **matéria por matéria**, com conteúdo e dados dos alunos testados por Claude antes da ativação. José só mescla e faz a checagem visual curta da matéria ativada.

| Estado agora | Item | Próxima ação |
|---|---|---|
| ✅ | AP II Práctica P2 (#580); últimas revisões editoriais (#594/#595/#597); portas de layout/caneta com flags (#593) | Preservar a `main` e os dados existentes. |
| ⏳ | Medicina Familiar, 1.ª candidata de implantação (#599 aberta) | Claude 4: atualizar com a main, corrigir ESCOPO/Guard e retirar dados de grifos reais do teste **e do histórico da branch**; comprovar flags do Netlify antes de merge. Até lá: 🔴 não mesclar #599. |
| ⬜ | Toxicología não passa no pré-voo de layout | Claude 2: regenerar `docs/layout-ensaio/inventario.json` depois da limpeza editorial e repetir porta; isto bloqueia **só Toxicología**. |
| ⬜ | Rastreio individual de 3 PDFs de Semiología II, 1 suprarrenal e 2 decisões de AP II | Conferência curta e documental em [ANOTACOES-DRIVE.md](ANOTACOES-DRIVE.md), sem alegar lacuna de conteúdo antes da checagem. |
| ⬜ | Cada próxima matéria | Claude proprietário roda porta, confere grifos/caneta e entrega Cartão de Merge; Claude 4 liga primeiro layout e depois caneta por flags, uma matéria por vez, com volta preparada; José confere no aparelho. |
| ⬜ depois | Audiobooks: compressão, bucket e ativação | Trabalhar após layout/caneta; infográficos, Imagenología e Bioestadística também ficam para fase posterior por decisão de José. |

**Qualidade editorial:** várias revisões foram mescladas; isto **não prova perfeição das 27**. Limites conhecidos: algumas frases G0 protegidas por grifos reais, fontes/figuras não acessíveis em revisões pontuais, conferência incompleta das imagens originais de AP II Práctica P2. Esses itens exigem rastreio específico, não impedem a implantação nas demais matérias. Imagens em português ou de Medicina Legal e infográficos de Medicina Familiar não são bloqueio por decisão de José.

---

## Histórico de 19/10 (não usar como estado atual)

**Última atualização:** 19/10/2026 · coordenação ChatGPT; estado das PRs e checks consultado no GitHub. A tabela histórica de aberturas abaixo descreve a `main` na triagem de 16/10, não os PRs ainda abertos.

> **Estado confirmado:** #484 mesclada e testada pelo José no iPad; #489 e #524 (Biología) mescladas. Abertas de conteúdo: #474, #481, #499–#517 (com exceções já mescladas/fechadas), #525–#530 e #532. Os Guard dos heads #474, #481, #499, #505, #529, #530 e #532 passaram, mas isso **não aprova ciência, imagens nem grifos futuros**. Nenhuma dessas PRs está liberada para merge neste painel. Só José mescla. #527/#530 e #528/#532 se sobrepõem e não devem ser mescladas juntas. As PRs antigas #66, #80, #248, #253, #305 e #368 foram fechadas sem merge.

**Ordem do plano (decisão mais recente do José):** 1) manutenção editorial, didática do zero, G0, questões e anotações, preservando grifos/tinta → 2) caneta para todos, após testes de dados → 3) layout por matéria com checkpoint e teste do José → 4) audiobooks. Imagenología e Bioestadística serão refeitas. Imagens em português podem permanecer; não retirar imagens por idioma ou por voz de prova: corrigir o rótulo/legenda. Retirada só por erro grave comprovado ou falta de direito de uso, com registro e substituição quando possível.

## Legenda

| símbolo | quer dizer |
|---|---|
| ✅ | feito e mesclado na `main` |
| 🟡 | feito num PR aberto, esperando merge |
| ⬜ | falta fazer |
| ➖ | não se aplica |
| 🚫 | excluída por decisão do José (será refeita) |

**«Voz de prova»** = frases na página do aluno do tipo «Lo que más cae», «lo más preguntado», «cae en examen», «tema de examen». A G0 proíbe (linhas 142 e 276 de `LEI-G0-ALMA-REPASSO-MED.md`). O número é uma contagem automática bruta (15/10); cada caso precisa de leitura humana antes de mexer.

## Visão geral

| # | matéria | sem. | pente fino G0 (#366) | voz de prova a limpar | anotações Drive | áudio | layout novo | caneta nova |
|---|---|---|---|---|---|---|---|---|
| 1 | Anatomía Patológica I | 5 | ✅ (#494) | ⬜ 4 | ✅ retroalimentação de prova | ➖ | ⬜ | ⬜ |
| 2 | Anatomía Patológica I Práctica | 5 | ✅ | ⬜ 12 («cae en examen» nas galerias) | ➖ vazio | ➖ | ⬜ | ⬜ |
| 3 | Fisiopatología I | 5 | ✅ | ⬜ 1 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 4 | Imagenología | 5 | 🚫 | 🚫 60 («CAYÓ EN EXAMEN») | — | ➖ | 🚫 | 🚫 |
| 5 | Semiología I | 5 | ✅ | ✅ 0 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 6 | Farmacología I | 5 | ✅ | ⬜ 5 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 7 | Medicina Familiar | 5 | ✅ | ⬜ 10 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 8 | Semiología II | 6 | ✅; 🟡 #532 (blocos 02–10) | 🟡 #532; bloco 01 preservado por 24 traços | 🟡 3 PDFs relatados na #532; conferir após merge | ✅ 4 (piloto) | ✅ piloto | ✅ piloto |
| 9 | Farmacología II | 6 | 🟡 PR #474 | 🟡 34 (a PR tira a maioria; 11 ficam por causa de grifos) | 🟡 8 PDFs na PR #474 | ⬜ 4 no Drive | ⬜ | ⬜ |
| 10 | Embriología | 1 | ✅ | ⬜ 8 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 11 | Histología I | 1 | ✅ | ⬜ 4 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 12 | Histología I Práctica | 1 | ✅ (falta texto alternativo em 136 imagens) | ⬜ 2 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 13 | Histología II | 2 | ✅ | ⬜ 22 (inclui ranking «Lo que más cae en toda la materia») | ⬜ vídeo 07/10 e PDF de 718 MB não comparados | ⬜ 4 no Drive | ⬜ | ⬜ |
| 14 | Histología II Práctica | 2 | ✅; 🟡 #530 com alt/imagens em revisão | 🟡 #530 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 15 | Anatomía I | 1 | ✅ | ⬜ 7 + 1 «Cómo estudiar esto…» (metadidática da #147) | ➖ vazio | ➖ | ⬜ | ⬜ |
| 16 | Biología | 1 | ✅ #496 e #524 mescladas | ✅ 0 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 17 | Medicina Legal | 6 | ✅ | ⬜ 13 («lo más preguntado») | ➖ vazio | ➖ | ⬜ | ⬜ |
| 18 | Anatomía Patológica II | 6 | ✅ (#458, #476); 🟡 PR #499 em auditoria | ⬜ 5 | ✅ 6 PDFs (3 pendências na #499) | ⬜ 3 no Drive | ⬜ | ⬜ |
| 19 | Anatomía Patológica II Práctica | 6 | ✅; 🟡 #529 em auditoria de figuras/questões | ✅ 0 no texto; 🟡 18 infográficos na #529 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 20 | Fisiopatología II | 6 | 🟡 PR #481 | 🟡 24 (a PR troca 14 caixas; ficam ~10) | 🟡 4 PDFs na PR #481 | ⬜ 7 no Drive | ⬜ | ⬜ |
| 21 | Toxicología | 7 | ✅ rodada anterior; 🟡 #500 em auditoria integral | ⬜ revisar na #500 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 22 | Dermatología | 7 | ✅ rodada anterior; 🟡 #505 (bloco 06 sem fonte legível) | 🟡 #505 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 23 | Guaraní | 2 | ✅ | ⬜ 13 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 24 | Ortopedia y Traumatología | 7 | ✅ | ⬜ 24 + «Portada · cómo estudiar esta materia» | ➖ (aportes sem conteúdo) | ➖ | ⬜ | ⬜ |
| 25 | Oftalmología | 7 | ✅ #464 mesclada; 🧪 teste físico pendente | ⬜ 11 | ➖ (aporte de teste) | ➖ | ⬜ | ⬜ |
| 26 | Neurología | 7 | ✅ | ⬜ 7 | ➖ vazio | ➖ | ⬜ | ⬜ |
| 27 | Anestesiología | 7 | ✅ | ⬜ 18 | ➖ vazio | ➖ | ⬜ | ⬜ |
| — | Bioestadística | — | 🚫 sem rota no site | 🚫 | — | ➖ | 🚫 | 🚫 |

## Abertura direta do conteúdo — decisão do José (16/10)

**Regra:** as 26 matérias elegíveis devem abrir no primeiro conteúdo da disciplina. Tirar a apresentação do site, contagens de blocos/perguntas, propaganda, estratégia de prova, mapas do curso, fontes/bibliografia e instruções de como estudar antes da primeira aula. **Não apagar uma explicação científica útil:** integrá-la ao primeiro bloco apropriado, sem repetir. Preservar título, navegação, acessibilidade, ids, grifos, notas, tinta, questões e flashcards. Conferir Supabase somente leitura antes de reescrever texto grifado; testar navegação e primeiro bloco após a mudança. As referências necessárias devem continuar registradas no local editorial/técnico adequado, fora da abertura ao aluno. Cada autor deve incorporar essa limpeza à PR integral da própria matéria; não abrir 26 PRs pequenas adicionais.

**Triagem feita:** leitura do início dos 26 arquivos HTML da `main`, não auditoria integral nem teste no navegador. Todos têm algum material anterior ao primeiro conteúdo que exige decisão. Alguns já ensinam conceitos na abertura; nesses casos, mover o ensino ao bloco 1 e remover apenas o invólucro. **Nenhuma matéria está liberada por esta triagem.** Imagenología e Bioestadística ficam fora porque José decidiu refazê-las.

| Matéria | Início observado na `main` | Estado da limpeza |
|---|---|---|
| Anatomía I | cinco perguntas introdutórias e “Sobre las fuentes” antes do bloco 1 | ⬜ |
| Biología | promessa da matéria, lista de fontes e imagens antes da aula | ✅ #524 |
| Embriología | mapa de 13 blocos e “Sobre las fuentes” | ⬜ |
| Histología I | portada; conceito e H&E úteis: integrar ao bloco 1 | ⬜ |
| Histología I Práctica | atlas/roleta e método prévio: integrar método à primeira aula | ⬜ |
| Histología II | roteiro de cinco passos e “qué evalúa”: mover ensino útil | ⬜ |
| Histología II Práctica | roteiro e descrição da prova antes da primeira lâmina | ⬜ |
| Anatomía Patológica I | hero promocional e contagens antes do bloco 1 | ⬜ |
| AP I Práctica | hero, contagens e foco em exame antes do tema 1 | ⬜ |
| Anatomía Patológica II | apresentação, fontes e aviso das questões antes do bloco 1 | ⬜ |
| AP II Práctica | portada, roteiro e “qué te van a pedir” antes da lâmina | ⬜ |
| Fisiopatología I | hero, contagens e mapa de unidades antes do bloco 1 | ⬜ |
| Fisiopatología II | “Estado de la asignatura” e mapa de 14 blocos | ⬜ |
| Farmacología I | hero e lista de temas/recursos antes do bloco 1 | ⬜ |
| Farmacología II | métodos, ligações dos blocos e bibliografia antes da aula | ⬜ |
| Semiología I | hero, recursos e unidades antes da introdução | ⬜ |
| Semiología II | hero e “ponto de partida”; física útil vai ao bloco 1 | ⬜ |
| Medicina Familiar | hero e “mapa da matéria” antes do primeiro tema | ⬜ |
| Medicina Legal | apresentação e estratégia de prova antes do bloco 1 | ⬜ |
| Guaraní | regra oral/nasal útil e bibliografia: mover regra ao bloco 1 | ⬜ |
| Toxicología | portada, contagens e “hilo conductor” antes do bloco 1 | ⬜ |
| Dermatología | portada, contagens e mapa dos blocos antes da aula | ⬜ |
| Ortopedia y Traumatología | portada, contagens e “hilo conductor” antes da aula | ⬜ |
| Oftalmología | portada, contagens e “eje clínico” antes da aula | ⬜ |
| Neurología | portada, método geral e ideias úteis antes do bloco 1 | ⬜ |
| Anestesiología | portada, contagens e “Cómo se razona” antes da aula | ⬜ |

## Caixas «Lo que más cae» → «Puntos a dominar» (decisão do José, 16/10)

Feito na PR #498 (✅ mesclada em 16/10). Só mudou o título e o subtítulo das caixas de prioridade e alguns textos das barras que falavam de prova. Barras, ordem, ids, questões e flashcards ficaram iguais. Nenhum grifo de aluno estava em cima desses textos (consulta só de leitura).

| matéria | o que mudou | estado |
|---|---|---|
| Anestesiología | 15 caixas | ✅ #498 |
| Dermatología | 13 caixas | ✅ #498 |
| Guaraní | 13 subtítulos («banco de preguntas basadas en exámenes» saiu) | ✅ #498 |
| Histología II | caixa geral + 13 caixas; 4 textos de barra | ✅ #498 |
| Histología II Práctica | caixa geral + 16 subtítulos; 3 textos de barra; 1 linha das fontes | ✅ #498 |
| Oftalmología | 9 caixas | ✅ #498 |
| Ortopedia | 17 caixas | ✅ #498 |
| Toxicología | 16 caixas (frases «el bloque más preguntado» etc. saíram) | ✅ #498 |
| Semiología II | 10 caixas | ✅ #498 |
| Anatomía Patológica II | etiqueta «◎ LO QUE MÁS CAE» | ✅ #498 |
| Histología I | etiqueta «🎯 LO QUE MÁS CAE EN EXAMEN» | ✅ #498 |
| Farmacología I | 2 frases no mapa inicial | ✅ #498 |
| Fisiopatología I | 1 título de caixa | ✅ #498 |
| Medicina Familiar | 2 títulos de caixa | ✅ #498 |
| Farmacología II e Fisiopatología II | continuam nas PRs #474 e #481 | 🟡 |
| Biología | #496 e #524 mescladas; correção científica concluída | ✅ |

**O que ainda fica para o pente fino de cada matéria:** frases soltas no texto corrido («la más preguntada», «cae en examen»), as caixas «Cómo lo evalúa la cátedra» de Semiología II e a família «dónde concentrar el estudio» (Embriología, Histología I, Medicina Legal e outras). Essas pedem leitura humana, uma matéria por vez, porque algumas têm grifos de alunos em cima.

## Leitura honesta desta tabela

- **«Pente fino ✅»** quer dizer: a rodada 2 da #366 (Claude 1, 13/10) revisou à mão e não achou erro científico nem pista de gabarito. **Não** quer dizer que a voz de prova foi limpa nem que a QA visual foi feita no navegador (só Dermatología, Guaraní e Oftalmología tiveram QA real).
- **Voz de prova:** a rodada 2 marcou «sem defeito» em matérias que ainda têm caixas «Lo que más cae de este bloque · Frecuencia estimada…». O padrão visual antigo (`PADRAO-VISUAL-v4.md`, componente `rmc-exam`) criou essas caixas; a G0, que é mais nova e tem precedência, proíbe. **Decisão já aplicada** nas caixas pela #498; faltam frases soltas e revisão humana por matéria.
- **Layout, caneta e áudio:** o código para as 25 matérias elegíveis está quase todo mesclado, mas **nada está ligado** fora do piloto (Semiología II). Ligar exige decisão e teste do José.

## Fila de trabalho sugerida (pente fino editorial)

| ordem | o que | matérias | quem sugiro |
|---|---|---|---|
| 1 | Fechar as PRs atuais após auditoria | Farmacología II (#474), Fisiopatología II (#481), AP II (#499), Toxicología (#500); correção de Biología já mesclada | Autores + coordenação; só José mescla |
| 2 | Limpar voz de prova sem perder grifos (mesmo método da #474/#481) | 7.º sem.: Toxicología, Ortopedia, Anestesiología, Dermatología, Oftalmología, Neurología | 1 Claude por matéria |
| 3 | Idem | Histología II, Guaraní, Medicina Legal, Semiología II, Embriología, Medicina Familiar, Farmacología I | idem |
| 4 | Idem + metadidática | Anatomía I, AP I Práctica, AP I, AP II, Histología I/II Práctica, Fisiopatología I, Histología I | idem |
| 5 | Pendências menores de anotações | AP II (metástase a distância do CEC oral etc.) | 1 Claude |
| 6 | Texto alternativo das imagens de conteúdo | Histología I/II Práctica, AP I Práctica | 1 Claude |
| 7 | Refazer | Bioestadística, Imagenología | quando o José decidir |

## Auditoria de coordenação — 19/10/2026

Esta seção distingue trabalho feito **na branch** de trabalho já disponível na `main`. Guard verde e teste declarado pelo autor não substituem auditoria das fontes, das imagens e das marcações. Prévia Netlify das PRs aparece cancelada; teste físico do José será planejado por matéria com rollback do deploy anterior.

| fila | PR | conclusão atual | próximo fechamento |
|---|---|---|---|
| Claude 1 | #499 AP II | 🔴 43 imagens retiradas da página; 26 nem foram conferidas. Viola a decisão do José de preservá-las. | Restaurar as imagens corretas e auditar uma a uma; só retirar com erro grave comprovado. |
| Claude 1 | #501, #507–#513, #515–#516 | 🟡 aberturas/G0 em branches; revisão de ciência declarada parcial em vários casos. | Autocheck por matéria, grifos e imagens; não afirmar conclusão integral quando faltam fontes. |
| Claude 2 | #474 Farmacología II | 🟡 abertura e questões revistas; 236/238 grifos atuais pintam (2 já obsoletos na main); 1 traço antigo na abertura já não pintava na main. | Resolver contradição preexistente salmeterol/formoterol com fonte permitida, decisões do cartão, consulta final de dados. |
| Claude 2 | #481 Fisiopatología II | 🔴 grande revisão (277/319 itens); 47/47 grifos atuais preservados e 0 traços na consulta. Simulação aponta 211 frases sem remapeamento e 17 marcas hipotéticas no lugar errado; `hl-ledger.cjs` falha. | Corrigir a colocação errada e limitar risco para grifos criados antes do merge; consultar dados de novo no head final. Confirmar fonte para alterações de ciência. |
| Claude 2 | #505 Dermatología | 🟡 abertura e G0 revistos; bloco 06 mantém sete grupos de afirmações da main sem fonte legível. | Documentar limite, localizar fonte permitida se disponível e não apresentar como revisão integral. |
| Sessão modest-rubin-th2yir (número a confirmar) | #529 AP II Práctica | 🟡 18 infográficos corrigidos sem remoção; questão tabaco/álcool permanece complementar, sem alegar chave da prova não lida. | Conferir visualmente imagens finais, duplicação 07/05 e texto da questão; teste do José após decisão de merge. |
| Sessão modest-rubin-th2yir (número a confirmar) | #530 Histología II Práctica | 🟡 legendas/imagens revistas; escala 600 µm da vesícula conferida visualmente inteira. Foto com marca d'água saiu da página; cinco fotos da amígdala permanecem. | Conferir direito de uso, imagens finais e 18 linhas médicas sinalizadas pelo Guard. #527 se sobrepõe. |
| Sessão modest-rubin-th2yir (número a confirmar) | #532 Semiología II | 🟡 132 grifos e 26 traços consultados; bloco 01 preservado por 24 traços, voz G0 dele pendente. CURB-65 adaptado ao slide. | Resolver a explicação da ureia/unidade e proveniência da questão; planejar migração futura com backup sem escrita agora. #528 se sobrepõe. |

**Regra de merge:** somente José; uma matéria por vez, depois de auditoria de ciência, dados e imagens. Português dentro das imagens não bloqueia. Guard verde significa apenas que os checks automáticos passaram. Atualizar este painel depois dos merges e registrar no inventário de anotações cada PDF efetivamente integrado.
