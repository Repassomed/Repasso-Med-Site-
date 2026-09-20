# NEUROLOGÍA · MAPA DE INSERÇÃO DAS FIGURAS

> **Este PR (#75) não toca em `neurologia.html`.** As quatro figuras novas estão no
> repositório mas **não estão ligadas ao HTML**. Este arquivo existe para que quem
> editar o HTML saiba onde cada uma entra.
>
> **Atualizado contra o texto do PR #74** (branch `edit/c2-neurologia-unidades-iii-iv`,
> HEAD `87fa55d`), que cria os blocos **`neub17` · Sueño y vigilia** e
> **`neub18` · Coma y muerte cerebral**. O #74 ainda **não** está mergeado — na `main`
> esses blocos não existem. A versão anterior deste mapa mandava criar um bloco de
> sueño e pendurar as figuras 35 e 36 no `neub01`: **isso está revogado.**

---

## 1 · Onde entra cada figura nova

| Asset | Slide fonte | Conteúdo | Ponto de inserção |
|---|---|---|---|
| `neurologia_33_sueno_y_vigilia_regulacion_y_arquitectura.webp` | Slide **7** · Unidad III | SRAA com os cinco núcleos e seus neurotransmissores; Proceso C × Proceso S; hipnograma; tabela N1-N2 / N3 / REM em dez linhas | **`neub17`, no fim da §7 «La tabla que resuelve el bloque»**. Nessa altura o resumo já ensinou o SRAA (§2), os dois processos (§3), a arquitetura da noite (§4) e as fases uma a uma (§5–6): a figura **reforça**, não antecipa. |
| `neurologia_34_trastornos_del_sueno.webp` | Slide **7** · Unidad III | Insomnio agudo × crónico com o modelo 3P; hipersomnia primária × secundária; narcolepsia; parasomnias por fase | **`neub17`, no fim da §9 «Parasomnias»**, depois da subsecção da transição sueño-vigilia. Cobre §8 e §9 inteiras. |
| `neurologia_35_coma_mecanismo_causas_y_localizacion.webp` | Slide **8** · Unidad IV | Os três mecanismos; causas estruturais × metabólicas; tabela das pupilas; padrão respiratório, mirada e resposta motora | **`neub18`, no fim da §3 «Localizar sin moverlo de la cama»**, depois de 3.4 «La respuesta motora» e antes da §4. Tudo o que a figura mostra foi ensinado em §1–§3. |
| `neurologia_36_muerte_encefalica_diagnostico_y_protocolo.webp` | Slide **8** · Unidad IV | Prerrequisitos; os três critérios; os seis reflexos de tronco com técnica; prova de apneia; **cátedra × AAN/AAP/CNS/SCCM 2023** | **`neub18`, no fim da §5.6**, que é exatamente a subsecção «Según la cátedra frente al consenso AAN 2023». A alternativa é o fim da §5, depois de 5.7. **Não colocar antes de 5.4**: a figura mostra os dois umbrais da apneia e as duas listas de provas auxiliares, e o texto só os ensina em 5.4 e 5.5. |

**Não usar mais o `neub01` como destino de 35 ou 36.** O `neub01` continua a ser o
dono do Glasgow e das duas posturas anormais, e o `neub18` diz de entrada que as usa
sem as repetir.

---

## 2 · Figuras 09 e 22 · prontas para reativar

As duas estão corrigidas (PR #75) e continuam comentadas no HTML. Os pontos abaixo
foram reconferidos **na versão do #74**, não na `main`.

| Asset | Onde está o comentário no #74 | O que fazer |
|---|---|---|
| `neurologia_09_vestibulococlear_rinne_weber.webp` | linha ≈ 2216, entre o key-box do ângulo pontocerebeloso e `<h4>3.1 · Rama coclear · acumetría</h4>` | Substituir o comentário pelo `<figure>`. O lugar está certo: os painéis de Rinne, Weber e prueba del susurro da figura são exatamente o que a §3.1 ensina a seguir. |
| `neurologia_22_sindrome_cerebeloso.webp` | linha ≈ 5749, entre o fim da §1 «Síndrome cerebeloso» e `<h3>2 · ⬇️ Síndrome piramidal</h3>` | Substituir o comentário pelo `<figure>`. Fecha a §1, que acaba de explicar por que o Romberg não é prova de cerebelo — e é isso que o painel DATO CLAVE da figura diz. |

**Apagar os dois comentários de retirada.** Eles descrevem defeitos que já não existem:

- **fig 09** — os três defeitos citados foram corrigidos («maléo» → «malleus»,
  «estapedio» → «stapes», «controrio» → «contrario»). O quarto, na faixa do oído
  interno, **nunca existiu no arquivo publicado**: a faixa lê «TRANSDUCE Y DETECTA EL
  MOVIMIENTO».
- **fig 22** — o comentário diz que a versão nova introduzia «ATAXIA CEREBELOSA
  (propinceptiva)». O arquivo publicado era a **versão antiga**, com lateralidade
  invertida e «efrente»; o painel DATO CLAVE sempre leu «ATAXIA SENSITIVA
  (propioceptiva)», que está correto. Os dois defeitos reais foram corrigidos.

---

## 3 · Segurança das âncoras

Releitura da base feita agora, **somente leitura, sem mutação**:

```
ink        neuportada        1
ink        neuportada>6      2
ink        neuportada>7      1
highlight  neuportada        1
highlight  banconeu          1
```

A tinta é posicional (`sec.id + '>' + índice` sobre
`p,li,h2,h3,h4,h5,table,figure,blockquote`). **Nenhum traço e nenhum grifo está
ancorado em `neub01`…`neub18`** — inserir um `<figure>` dentro de qualquer bloco é
seguro hoje. A única restrição real continua a ser a portada: **não inserir nem
remover nada antes do índice 8 de `neuportada`**, porque `>6` e `>7` têm traços.

Reconferir antes de editar: alunos anotam a qualquer momento.

---

## 4 · Temas da prova nova · já cobertos, sem asset novo

Verificado abrindo os arquivos, não pelos nomes. **Nenhuma lacuna visual real** —
nenhum infográfico novo foi criado por causa da prova.

| Tema cobrado | Onde já está |
|---|---|
| Reflexos ausentes na morte encefálica | **fig 36**, painel 3 — os seis reflexos com par craneal, técnica e critério de ausência |
| Síndrome de Weber | **fig 20** — painel próprio: mesencéfalo ventral, III ipsilateral, hemiparesia contralateral |
| Avaliação clínica do III par | **fig 06** (função e exploração: movimentos oculares, elevação do párpado, reflexo fotomotor) + **fig 20** (Weber) + **fig 35** (midriasis unilateral arreactiva → III par → herniación uncal) |
| Lobo frontal | **fig 19** — painel frontal completo; **fig 17** para o padrão deficitario |
| Brown-Séquard | **fig 21** — painel próprio com os três déficits e a dissociação |
| Parkinson | **fig 24** — síndrome hipocinético, circuito dos gânglios da base, marcha festinante |
| Miastenia × Lambert-Eaton | **fig 32** — tabela comparativa alinhada; **fig 31** para a miastenia em profundidade |
| Radiculopatía / Lasègue | **fig 29** — Lasègue 30°–70°, Bragard, Lasègue inverso, miotomas, banderas rojas |
| Glasgow / descorticação | **fig 02** — E4/V5/M6 com foto de cada resposta e as duas posturas |
| Síndrome alterno (lembrado em parte) | **fig 20** — os quatro clássicos: Weber, Millard-Gubler, Wallenberg e Dejerine bulbar medial |

---

## 5 · Observações que ficam para decisão humana

Nenhuma foi alterada — são inconsistências, não erros:

1. **`neurologia_17`** usa «NEGLECT»; **`neurologia_19`** usa «Negligencia» para o
   mesmo conceito.
2. **`neurologia_26`** diz «nervio cubital»; **`neurologia_28`** diz «nervio ulnar»,
   e no mesmo painel escreve «SÍNDROME DEL TÚNEL CUBITAL · NERVIO ULNAR».
3. **`neurologia_08`** diz «Cavum de Meckel»; **`neurologia_16`** diz «cueva de Meckel».
4. **`neurologia_32`** escreve «Eaton-Lambert» e abrevia «LEMS». **Não alterada:** o
   HTML usa «Eaton-Lambert» 39 vezes contra 2 — a figura segue a convenção da matéria.
5. **Marca:** `24`, `25`, `27`, `28` e `29` trazem o logotipo «Repasso Med»; as outras
   25 não. As quatro figuras novas seguem a maioria e não trazem marca.
6. **`neurologia_34`** dá o TLMS com latência média **< 8 min**, que é o valor da
   cátedra. A ICSD-3 usa **≤ 8 min**. Diferença mínima, mas é uma divergência real
   entre cátedra e critério internacional; fica registada sem ser alterada.
