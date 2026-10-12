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
| Farmacología II (#474) | 228 | 226 | 0 | 2 (refutação do atenolol; letras trocadas) |
| Fisiopatología II (#481) | 79 | 79 | 0 | 0 |

Limites: marcas fabricadas a partir do texto atual (um elemento, contexto perfeito); marcas reais podem cobrir dois elementos, cortar palavras, ter sido feitas sobre texto já alterado ou ser notas/glossário. Dois defeitos da ferramenta foram achados pelo próprio teste e corrigidos (pares globais sem elemento; aplicação em cascata). O livro-razão **não** substitui os passos 1–5.
