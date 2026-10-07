# Mudanças no validador do contrato (`contrato.cjs`) · resposta à auditoria independente da PR #459

> Só `tools/qa/ensaio-layout/` e `docs/layout-ensaio/` mudaram. Nenhum arquivo do site, UID, flag, áudio ou dado de aluno foi tocado. **Nada foi ativado.**

## 1 · O que a auditoria apontou (e estava certo)

| Regra | Defeito da versão anterior | Prova (réplica fiel da regra antiga em `contrato.teste.cjs`) |
|---|---|---|
| **R4** | declarava conferir cada cópia do Banco, mas aprovava **todas** se existisse **um** `data-rm-copia-de` em qualquer lugar do arquivo (`/data-rm-copia-de=/.test(html)`) | 3 cópias, só 1 com vínculo → regra antiga **PASSA**, nova **FALHA** |
| **R9** | conferia só a **presença global** de `data-rm-role`/`agrega`/`copia-de` | 1 seção sem `data-rm-role`, bloco sem `data-rm-n`, agregadora sem `data-rm-agrega`, 1 pergunta sem `data-rm-q`, 1 cópia sem link → regra antiga **PASSA** em todos, nova **FALHA** |
| **R5** | aceitava o número da portada se coincidisse com **qualquer** contagem candidata, inclusive o **total do DOM com cópias** | capa «4 preguntas» com 2 canônicas + 2 cópias → antiga **PASSA**, nova **FALHA** |

## 2 · Como ficaram

Detalhe no `CONTRATO-NOVOS-RECURSOS.md §8`. Em resumo: o validador extrai um **modelo por item** do HTML (`modelo.cjs`) e as regras (`regras.cjs`) conferem **cada** cópia (R4), **cada** seção/item aplicável (R9) e **cada** número da capa contra a contagem **canônica** do recurso correspondente (R5). Efeitos colaterais corrigidos no caminho:
- a detecção de agregadora marcava bloco **e** banco quando um era cópia do outro (nos fixtures de 1 bloco, tudo virava «cópia»); agora uma seção contida em outra **maior** (ou igual e posterior) é parte, não agregadora;
- o extrator de números lia **só o primeiro** número de cada texto («2 preguntas · 4 flashcards» perdia o 4); agora lê todos;
- a «capa» ignorava o `section.hero` **sem id** (onde Farmacología I, Semiología I, Fisiopatología I e Imagenología declaram seus números); agora hero/banner sem id também é capa.

## 3 · Casos negativos (prova de que falham)

`node tools/qa/ensaio-layout/contrato.teste.cjs` (saída salva em `contrato.teste.saida.txt`): **18 casos negativos, 18 falham na regra nova; 4 controles positivos, 4 passam; em 13 casos a regra antiga passava indevidamente.** Cobrem: cópia sem vínculo (com 1 marcador em outra), alvo inexistente, texto diferente da canônica, duas cópias da mesma canônica, canônica sem cópia, cópia que casa só por enunciado; seção sem role, bloco sem `data-rm-n`, agregadora sem `data-rm-agrega`, pergunta sem `data-rm-q`, cópia sem `data-rm-copia-de`, vídeo sem id; capa = total do DOM duplicado (perguntas, flashcards, infografías, hero) e «bloques» indeterminado. O script sai com código 1 se algum caso não se comportar como esperado.

## 4 · Mudanças nos resultados das 27 matérias (e por quê)

Reexecutados inventário (idêntico ao anterior, exceto a data), contrato e matriz.

| Regra | Antes | Agora | O que mudou |
|---|--:|--:|---|
| R1 · R2 · R3 · R6 · R7 · R8 | 13 · 6 · 14 · 27 · 27 · 27 | 13 · 6 · 14 · 27 · 27 · 27 | nada |
| **R4** | 12 | **9** | Farmacología II, Embriología e Histología I passaram de ✔ a ✖. Antes a detecção só via Banco pelo **nome** do id; esses três têm o Banco em seções de nome diferente (`f2b15`, `emb14`, `histo13`) e passavam «por não ter Banco». Agora o Banco é detectado por conteúdo e suas cópias (214, 107, 150) **não têm vínculo**. Dos 9 que passam, 6 são «sem Banco geral» e **3** (Neurología 179, Oftalmología 139, Anestesiología 177 cópias) têm vínculo verificado cópia a cópia, por convenção de id, com texto igual |
| **R5** | 23 | **20** | Fisiopatología I, Imagenología, Semiología I, Farmacología I e Medicina Familiar passaram de ✔ a ✖: o número está no `section.hero` sem id, que antes **nem era lido** (aprovação por omissão). Casos concretos: Semiología I «220 preguntas» = total do DOM, canônico 182; Farmacología I «191» = DOM, canônico 176; Medicina Familiar «90 preguntas» = DOM (64 + 26 do banco), canônico 64, e «177 flashcards» = DOM, canônico 82. Dermatología («294 flashcards») e Ortopedia («432») passaram de ✖ a ✔: a identidade do flashcard sem `data-rm-fc` agora é **frente+verso**, e não só a frente (dois cartões com a mesma frente e versos diferentes são cartões diferentes: 294 e 432 distintos pares, contra 293 e 429 só-frente) |
| **R9** | 0 | 0 | continua 0/27 (nenhuma matéria tem os marcadores), mas agora medido por seção e item (`CONFORMIDADE.md`, quadro R9) |

Resumo de R5: 39 números declarados na capa com recurso verificável → 28 iguais ao canônico, **7 divergem** (4 só coincidem com o total do DOM duplicado) e **4 indeterminados**. Limites e leituras conservadoras (p.ex. «Banco de preguntas: 170» em Fisiopatología I é lida como afirmação sobre a matéria inteira): `CONTRATO-NOVOS-RECURSOS.md §8`.

## 5 · O que NÃO mudou

O ensaio visual (`MATRIZ.md`: 0/27 PASSA «como está», 15/27 «com correção», 12 falhas restantes) **não depende** do validador do contrato e permanece idêntico. O teste de caneta continua **sintético** (traço simulado no Chromium, Supabase simulado; não é teste físico nem mede atraso/perda reais, nem a #456). Os temas e descritores das 26 matérias sem tema próprio continuam **hipótese técnica inferida do conteúdo**, não identidade visual aprovada.
