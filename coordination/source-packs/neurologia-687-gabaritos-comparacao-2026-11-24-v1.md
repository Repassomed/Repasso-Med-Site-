# Neurología · #687 — comparação questão a questão com a `main` (gabaritos) · 24/11/2026

> Registro entregue na PR #715 (empilhada sobre a #687) para não alterar o escopo declarado da #687. O conteúdo descreve a versão `922c5d06` da #687 (árvore idêntica à `b8edf38c`).

Comparação automática (script reprodutível: parser do HTML da `main` `c288d1a5` × `claude/neuro-8a1b-1911`) + leitura humana dos casos marcados. O Guard conta «262 grupos de gabaritos»: **são trocas de letra por reordenação** (8-A.7) — bloco e banco contados separadamente —, não mudança de resposta científica, **exceto** os casos da seção 2.

## Resumo (254 perguntas que já existiam na `main`; as 36 novas estão no pack de rastreabilidade)
- MCQ idênticas: **22**
- **Só reordenadas** (mesmas alternativas, mesma resposta correta; letra trocada em parte): **57**
- **Alternativas reescritas, mesma resposta** (a alternativa correta nova é a que mais se parece com a antiga e diz o mesmo): **84**
- **Reformuladas com mudança de pergunta/resposta**: **5** (seção 2)
- MCQ cuja letra correta mudou: **131**; manteve: **37**
- DEFINE: **24**, sem mudança de enunciado/resposta: **24** (os demais: ver abaixo)
- V/F: **62**, sem mudança de enunciado/veredito: **62**
- Nenhuma pergunta removida (254 → 290 só por acréscimo de 36). Nenhuma alternativa com negrito/itálico/cor (verificado dentro de `<ul class="options">`, bloco e banco).

## 1 · Só reordenadas (id: letra antiga → nova; mesma resposta)

`q-neu001` c→a, `q-neu003` d→b, `q-neu006` c→a, `q-neu105` b→c, `q-neu010` c→a, `q-neu012` b→a, `q-neu013` d→b, `q-neu107` b→d, `q-neu233` c→b, `q-neu084` c→d, `q-neu020` d→b, `q-neu021` b→c, `q-neu023` d→b, `q-neu-2509-02` c→b, `q-neu152` b→c, `q-neu154` c→a, `q-neu027` c→b, `q-neu029` a→b, `q-neu112` b→c, `q-neu031` c→d, `q-neu035` a→d, `q-neu037` b→c, `q-neu116` a→c, `q-neu054` a→c, `q-neu059` d→a, `q-neu160` d→c, `q-neu062` d→b, `q-neu118` b→d, `q-neu119` d→b, `q-neu063` d→c, `q-neu069` c→b, `q-neu070` c→a, `q-neu077` c→a, `q-neu125` c→d, `q-neu126` d→c, `q-neu163` c→b, `q-neu164` a→d, `q-neu166` d→b, `q-neu088` b→a, `q-neu167` c→b, `q-neu169` c→b, `q-neu129` d→a, `q-neu176` a→b, `q-neu241` a→d, `q-neu189` a→c, `q-neu194` d→b, `q-neu198` b→d, `q-neu200` c→a, `q-neu204` d→c, `q-neu206` c→a, `q-neu211` b→c, `q-neu220` d→b, `q-neu223` a→d, `q-neu226` a→c, `q-neu227` b→d, `q-neu230` d→a, `q-neu231` c→d

## 1-B · Alternativas reescritas, mesma resposta correta (id: letra antiga → nova)

`q-neu002` a→b, `q-neu005` d→d, `q-neu145` d→d, `q-neu007` b→c, `q-neu-2509-01` b→a, `q-neu011` d→c, `q-neu146` a→a, `q-neu014` d→a, `q-neu015` a→d, `q-neu016` b→c, `q-neu025` b→a, `q-neu026` d→a, `q-neu086` d→b, `q-neu109` d→d, `q-neu-2509-05` b→a, `q-neu111` c→a, `q-neu032` a→a, `q-neu043` d→d, `q-neu044` a→a, `q-neu046` c→d, `q-neu114` c→a, `q-neu115` a→b, `q-neu234` b→a, `q-neu048` b→d, `q-neu051` c→a, `q-neu057` a→d, `q-neu058` b→c, `q-neu060` a→c, `q-neu061` b→a, `q-neu064` b→a, `q-neu066` c→b, `q-neu067` a→c, `q-neu068` b→a, `q-neu120` a→a, `q-neu121` b→c, `q-neu071` c→b, `q-neu073` b→c, `q-neu075` a→b, `q-neu123` a→d, `q-neu124` b→c, `q-neu144` c→a, `q-neu078` b→c, `q-neu081` a→d, `q-neu082` b→c, `q-neu087` c→b, `q-neu093` b→a, `q-neu099` b→b, `q-neu101` c→c, `q-neu102` b→c, `q-neu130` b→d, `q-neu132` c→d, `q-neu138` d→c, `q-neu173` d→d, `q-neu238` d→b, `q-neu175` d→a, `q-neu179` b→d, `q-neu180` d→c, `q-neu242` c→b, `q-neu182` b→a, `q-neu183` a→d, `q-neu184` c→b, `q-neu187` b→d, `q-neu188` d→b, `q-neu190` c→d, `q-neu191` d→b, `q-neu192` a→c, `q-neu193` b→b, `q-neu197` c→d, `q-neu199` a→c, `q-neu203` b→c, `q-neu205` a→d, `q-neu207` d→d, `q-neu210` a→b, `q-neu212` d→a, `q-neu213` c→b, `q-neu214` b→b, `q-neu217` a→d, `q-neu219` b→d, `q-neu243` b→c, `q-neu244` d→d, `q-neu247` a→d, `q-neu248` c→a, `q-neu225` d→c, `q-neu232` b→c

Todas passaram pelo teste «a alternativa correta nova é a mais parecida com a antiga»; o único alerta foi `q-neu002` (similaridade 0,47) e conferido à mão: antes «desviación lenta tónica … hacia el oído irrigado y sacádicos hacia el no irrigado», agora «desviación tónica lenta … hacia el oído irrigado y luego sacudidas rápidas hacia el lado opuesto» — mesma resposta (prova calórica no coma, ver slide de exame neurológico). `q-neu064` (0,55) e `q-neu124` (0,59): mesma alternativa, redação encurtada/desmembrada, sem mudar o conteúdo.

## 2 · Mudança real de pergunta/resposta (justificativa e fonte)

| id | antes | depois | por quê / fonte | limite |
|---|---|---|---|---|
| `q-neu090` | «Husos de sueño y complejos K → N2» (resposta a) | «Respecto del sueño NREM, ¿cuál es la característica correcta?» (resposta **c**: N1–N3, tono parasimpático predominante, husos/K em N2) | item de prova (Turma A/C) pede a caracterização do NREM; a pergunta antiga era um subconjunto; slide de sono `7..pdf`: N1–N3, N2 = husos e complexos K, tono reduzido, FC/TA «disminuidas, estables»; resumo do bloco 17 completado antes | «predomínio parassimpático» é a leitura fisiológica das FC/PA baixas; **o slide não usa a palavra** → registrado como limite; confirmar com a cátedra se quiser |
| `q-neu135` | «¿Qué determina la elección del antiepiléptico?» | afirmação do exame («primeira linha valproato; combinação levetiracetam+valproato») → resposta: **incorreta como regra geral** | slide `11..pdf`: «Selección según el tipo de crisis», valproato para generalizada; **a clave do exame não foi publicada** (a explicação diz isso) | gabarito oficial desconhecido |
| `q-neu181` | vinheta com a TC já dando «hiperdensa no putâmen» → diagnóstico | clínica pura + «diagnóstico e imagem imediata» → hemorragia intraparenquimatosa por crise hipertensiva; TC sem contraste | slide `10..pdf` (ACV hemorrágico: TC sem contraste, HTA crónica) | — |
| `q-neu224` | epidural: só diagnóstico | diagnóstico **e** característica (lente biconvexa, bom prognóstico se drenado) | slide `15..pdf` | rótulo → exame |
| `q-neu091` | vinheta RBD | mesma vinheta, rótulo → exame; explicação ganhou NREM × REM | slide `7..pdf` | — |

Divergência que não consigo confirmar: nenhuma além da palavra «parasimpático» (acima) e dos gabaritos oficiais inexistentes (já declarados em `q-neu135`, `q-neu286`, `q-neu107`).

## 3 · DEFINE e V/F

DEFINE com mudança: nenhuma. V/F com mudança: nenhuma. Comportamento dos 138 V/F (bloco + banco) testado no navegador (1440 e 390): `neu-vf` 12/12.