# Protocolo verificável para preservar grifos antes de reescrever frases (v1)

> Proposta + ferramentas. **Nada aqui lê ou escreve dados de alunos.** A escrita no banco só acontece se **você** a autorizar, depois dos passos 1–5. Enquanto houver grifo que possa sumir sem decisão registrada, **nenhuma das PRs pede merge**.

## Princípio
Um grifo guarda (`exact_text`, 40 caracteres de prefixo/sufixo, `occurrence`) dentro de uma seção; o motor só o pinta se achar esse texto. Logo, **reescrever uma frase é uma decisão com custo conhecido e verificável**, não um efeito colateral. O protocolo torna esse custo visível *antes* do merge.

## Regras para qualquer PR que mexa em texto de matéria
1. **Aditivo primeiro.** Corrija acrescentando uma frase ao fim do parágrafo/`<p>`/`<i>` existente; a frase antiga continua literal (grifo intacto) e nenhum elemento novo nasce (a tinta por elemento não se desloca).
2. **Substituição só com livro-razão.** Se uma frase ≥ 25 caracteres tiver de mudar, ela entra em `hl-ledger.json` (gerado por `hl-ledger.cjs`) com a frase nova mais próxima, a classe (A enquadramento · B explicação refeita com as alternativas · C conteúdo · D trivial) e o estado.
3. **Estado verificado.** `remap-verificado` = uma marcação sintética sobre a frase, remapeada pela ferramenta, volta **no mesmo elemento** pelo motor real. `sem-remap` = não volta: ou se reescreve de forma menos agressiva (preferido) ou uma pessoa registra a exceção em `hl-ledger-aceitas.json` com o motivo (ex.: o grifo marcava um distrator que deixou de existir).
4. **Portão.** `node hl-ledger.cjs --aceitas hl-ledger-aceitas.json` sai com **código 1** se restar `sem-remap` sem exceção registrada. O resultado (frases em risco / verificadas / exceções) vai na descrição da PR.
5. **Nunca** `data-rm-content-rev` (orfanaria também os traços que hoje alinham).

## Migração dos grifos reais (só com você)
| passo | quem | ferramenta | saída verificável |
|---|---|---|---|
| 1. exportar os grifos e fazer **backup imutável** (arquivo original) | você | consulta somente leitura | `marcas.json` + sha256 |
| 2. simulação a seco | eu/qualquer um | `remap-highlights.cjs --in marcas.json --out marcas.remap.json` | contagens: tocadas, **não localizadas** (ficam como estão), sem remap |
| 3. conferência por motor real | automática | o mesmo script resolve cada marca remapeada no head final | 0 «lugar errado», 0 «não resolve» ou lista para decisão |
| 4. conferência humana por amostra | você | 30 pares antes → depois sorteados | aprovado/reprovado |
| 5. escrita | **só você** | seu SQL, com o backup do passo 1 para reverter | contagem antes = depois |

## Resultado hoje (marcações SINTÉTICAS — não é prova sobre grifos reais)
| matéria | frases em risco | remap verificado | sem remap | exceções aceitas |
|---|---:|---:|---:|---:|
| Farmacología II (#474) | 218 | 216 | 0 | 2 (refutação do atenolol; letras trocadas) |
| Fisiopatología II (#481) | 79 | 79 | 0 | 0 |

Limites: marcas fabricadas a partir do texto atual (um elemento, contexto perfeito); marcas reais podem cobrir dois elementos, cortar palavras, ter sido feitas sobre texto já alterado ou ser notas/glossário. Dois defeitos da ferramenta foram achados pelo próprio teste e corrigidos (pares globais sem elemento; aplicação em cascata). O livro-razão **não** substitui os passos 1–5.

## Validação com registros REAIS (consulta somente leitura) — 12/10/2026
Método: `SELECT block_id, exact_text, prefix, suffix, occurrence FROM user_highlights WHERE subject_slug = …` (nunca `user_id`; nenhuma escrita; os registros ficam **fora do repositório**). Cada registro é resolvido pelo motor real (`RMTools.resolverAncora`) na matéria **antiga** (controle) e na **nova**; `hl-real.cjs` faz a conta. Conferência de transcrição: o registro tem de resolver na matéria antiga, senão é descartado como «obsoleto».

| matéria | registros reais | sobrevivem sem remap | só com remap | perdidos | obsoletos já na `main` |
|---|---:|---:|---:|---:|---:|
| Fisiopatología II (#481) | 47 | **47** | 0 | 0 | 0 |
| Farmacología II (#474) — versão de 3990cbff (voz neutra em todo o texto) | 238 | 224 | 10 | 3 | 1 |
| Farmacología II (#474) — **versão «sem remap»** (esta) | 238 | **237** | 0 | 0 | 1 |

O único «obsoleto» é um grifo em português («O órgão que controla o sódio é o rim…») que **já não existe na `main`**: não é efeito da PR.

### Frases que precisam continuar intactas (13 registros reais → 12 pontos do texto)
Nada daqui foi reescrito nesta versão; cada ponto volta a ser **literal** à `main`:

| seção | frase literal que fica | por que a versão neutra a quebrava | conflito com a G0? |
|---|---|---|---|
| f2b01 | «…y es la pregunta conceptual que más se repite.» | grifo de 2 parágrafos (prazosina × fentolamina) | **sim** (voz de prova) |
| f2b01 | «Tal como se enuncia en los exámenes de la cátedra.» + «Leé qué territorio pide.» | grifo sobre o parágrafo inteiro | **sim** |
| f2b01 | «La regla es corta y se pregunta literal: α antes que β» | grifo de 4 parágrafos (feocromocitoma) | **sim** |
| f2b01 | cabeçalho de tabela «Detalle de examen» | grifo sobre a tabela inteira | **sim** |
| f2b01 | linha «Por qué se pregunta … Aparece con frecuencia en las pruebas.» (celiprolol) | grifo sobre a ficha | **sim** |
| f2b01 | «El error que más se repite.» + «(afirmación FALSA en prueba)» | grifo sobre o parágrafo | **sim** |
| f2b01 | «La fila de la frecuencia es la que más se pregunta» (legenda do SVG) | grifo sobre a legenda | **sim** |
| f2b05 | «tres palabras vecinas que el examen mezcla» | grifo de 2 parágrafos | **sim** |
| f2b05 | «El detalle que casi nadie entiende y siempre se pregunta» | grifo de 2 parágrafos | **sim** |
| f2b05 | «Regla de oro para el examen:» | grifo sobre a legenda | **sim** |
| f2b05 | «una pregunta que ya cayó en prueba, tanto en formato «¿qué incluye la tríada?» como «¿de qué fármaco es RAM?»» | grifo sobre o parágrafo | **sim** |
| f2b05 | lista de indicações dos nitratos (Angina inestable = «β-bloqueantes, morfina y antiplaquetarios.») e célula «Neutro / DHP ↑ mortalidad» | grifo de 5 itens / da tabela inteira | não — eram acréscimos científicos |

**Conflito G0 × grifo real (decisão de José).** Em 11 dos 12 pontos o texto literal é justamente a voz de estratégia de prova que a G0 manda retirar. Esta versão **escolhe não perder grifos de alunos** e deixa essas frases como estão (a PR volta a ter, nesses 11 pontos, o texto da `main`). A versão com voz neutra continua disponível: está **toda** num único commit separado e reversível (`git revert e9334c1f`), para aplicar **depois** de os passos 1–5 acima, autorizados por você. Os outros 2 pontos eram acréscimos científicos e foram tratados assim:
- «DHP corta» na tabela: dispensável — a ressalva «sobre todo con el nifedipino de acción corta» já está no parágrafo das dihidropiridinas; a célula volta literal.
- «Si el dolor persiste se añade nitroglicerina SL o IV (salvo hipotensión o sildenafilo en las últimas 24 h)» (angina inestável): **retirada desta PR** — não há onde pôr a frase sem quebrar um grifo real (a lista, o resumo «cinco líneas» e as legendas estão todos grifados). Fica como pendência para depois da migração; não é erro do texto atual, só um matiz a mais.

### Limite
Os 238 registros são os que existiam na tabela no momento da consulta; um aluno pode grifar **qualquer** frase depois. A lista acima protege os grifos existentes; a proteção geral continua a ser o livro-razão + a regra «aditivo primeiro».
