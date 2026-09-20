# NEUROLOGÍA · MAPA DE INSERÇÃO DAS FIGURAS NOVAS

> **Este PR não toca em `neurologia.html`.** As quatro figuras novas estão no
> repositório mas **não estão ligadas ao HTML**. Este arquivo existe para que
> quem for editar o HTML (Claude 2) saiba exatamente onde cada uma entra e o
> que ela já cobre — sem ter que reabrir os slides.

---

## 1 · Assets novos · pontos de inserção

> **Atualizado nesta rodada.** O PR #74 criou os blocos que faltavam, então as
> orientações antigas — «não existe bloco de sueño» e «35/36 → neub01» —
> **caducaram e foram removidas**. Os pontos de inserção abaixo são os válidos.

| Asset | Bloco destino | Secção | O que já cobre |
|---|---|---|---|
| `neurologia_33_sueno_y_vigilia_regulacion_y_arquitectura.webp` | **`neub17` · Sueño y vigilia** | Fim de **«4 · La arquitectura de la noche»** — ou de **«7 · La tabla que resuelve el bloque»**, que a figura espelha | SRAA com os cinco núcleos e seus neurotransmissores; Proceso C (NSQ, luz, melatonina) × Proceso S (adenosina); hipnograma da noite; comparação N1-N2 × N3 × REM em dez linhas |
| `neurologia_34_trastornos_del_sueno.webp` | **`neub17` · Sueño y vigilia** | Fim de **«9 · Parasomnias · cada una vive en su fase»**, depois de **«8 · Alteraciones frecuentes»** | Insomnio agudo × crónico com o modelo 3P de Spielman; hipersomnia primária × secundária; narcolepsia (hipocretina, HLA DQB1\*06:02, TLMS, tratamento); parasomnias NREM / REM / transição |
| `neurologia_35_coma_mecanismo_causas_y_localizacion.webp` | **`neub18` · Coma / muerte encefálica** | Fim de **«3 · Localizar sin moverlo de la cama · hallazgo → nivel»** | Definição de coma; os três mecanismos (córtex bilateral / SRAA focal / difusa metabólica); causas estruturais × metabólicas; tabela das pupilas com nível e etiologia; padrão respiratório, mirada e resposta motora |
| `neurologia_36_muerte_encefalica_diagnostico_y_protocolo.webp` | **`neub18` · Coma / muerte encefálica** | Fim de **«5 · Muerte cerebral»**, **depois** de o texto explicar os critérios e a prova de apneia | Prerrequisitos e exclusões; os três critérios clínicos; os seis reflexos de tronco com a técnica; prova de apneia **com os dois protocolos separados**; pruebas ancilares **com as duas listas separadas**; certificação e observação Paraguai × AAN; diferencial muerte encefálica × coma × vegetativo × locked-in |

Nomes de secção conferidos no HTML da branch `edit/c2-neurologia-unidades-iii-iv`
(`856916e`): `neub17 · 🌙 Sueño y vigilia` tem nove secções numeradas e `neub18 ·
🚨 Glasgow, coma y muerte cerebral` tem cinco, sendo a §5 «Muerte cerebral».

**Ordem de leitura dentro de `neub18`:** primeiro a 35 (coma e localização), depois
a 36 (muerte encefálica). A 36 só faz sentido depois de o resumo ensinar os
critérios — a lei 8-A.2 continua a valer.

### Figuras antigas prontas para voltar a aparecer

| Asset | Situação | Ponto de inserção |
|---|---|---|
| `neurologia_09_vestibulococlear_rinne_weber.webp` | Estava oculta por três defeitos de texto. **Corrigida neste PR** e reconferida a 6 aumentos. O defeito extra que o comentário de retirada descrevia («TRANSDUCE EL SONIDO Y DETECTA OE MOVIMIENTO») **não existe** no arquivo atual. | Bloco 05, §3 «Par craneal VIII · vestibulococlear». O `<figure>` e o comentário de retirada já estão no HTML — basta descomentar. |
| `neurologia_22_sindrome_cerebeloso.webp` | Estava oculta. **Corrigida neste PR** (lateralidade, «eferente», «específica», «incoordinación»). O defeito «ATAXIA CEREBELOSA (propinceptiva)» **não existe** no arquivo publicado — ver secção 4. | Bloco 14, §1 «Síndrome cerebeloso». Idem: descomentar. |

---

## 2 · Segurança das âncoras

Conferido na base (leitura apenas) antes de propor qualquer ponto de inserção:

```
ink       neuportada        1
ink       neuportada>6      2
ink       neuportada>7      1
highlight neuportada        1
highlight banconeu          1
```

**Nenhum traço de caneta e nenhum grifo está ancorado em `neub01`…`neub16`**, nem nos
blocos novos `neub17` e `neub18`.
A tinta é posicional (`sec.id + '>' + índice` sobre
`p,li,h2,h3,h4,h5,table,figure,blockquote`), então inserir um `<figure>` dentro
de um bloco deslocaria os índices daquele bloco — mas como os blocos não têm
tinta, **as quatro inserções acima são seguras hoje**. Reconferir antes de
editar, porque alunos anotam a qualquer momento e a capa (`neuportada`) tem
tinta em `>6` e `>7`: **não inserir nada antes do índice 6 da capa**.

---

## 3 · O que a matéria já cobre (evitar redundância)

Conferido abrindo as 30 imagens publicadas, uma a uma, não pelos nomes de arquivo:

- **Glasgow está inteiramente coberto** pela `neurologia_02_escala_de_coma_de_glasgow.webp`:
  E4 / V5 / M6 com foto de cada resposta, descorticación e descerebración,
  3–15, TCE leve / moderado / grave e a conduta com ≤ 8. **A figura 35 não
  repete Glasgow de propósito** — só remete a ele.
- **Níveis de conciencia** (alerta, obnubilación, estupor, coma, vegetativo,
  mínimamente consciente) já estão na `neurologia_01_conciencia_y_anatomia_cerebral.webp`.
  A figura 36 não repete a escala: entra pelo diferencial que muda conduta
  (muerte encefálica × vegetativo × locked-in × coma reversible).
- **O SRAA** aparece na fig. 01 do ponto de vista anatômico. A figura 33
  acrescenta o que falta: os cinco núcleos com seu neurotransmissor e as duas
  vias de projeção.
- **Buraco de conteúdo:** o slide 8 ensina muerte encefálica com protocolo
  completo. O PR #74 criou `neub18 · Coma / muerte encefálica`; quem reconectar
  as figuras deve confirmar que o texto desse bloco **ensina os critérios e a
  prova de apneia antes** de pendurar a figura 36, porque a lei 8-A.2 (resumo
  ensina → questão cobra) continua a valer.

---

## 4 · Registro de retirada das figuras 09 e 22

Os comentários HTML que hoje explicam por que essas duas estão ocultas
**descrevem uma versão que não é a publicada**. Conferido no pixel:

- **fig 09** — os três defeitos citados existem e foram corrigidos
  («maléo» → «malleus», «estapedio» → «stapes», «controrio» → «contrario»).
  O quarto defeito citado, na faixa do oído interno, **não existe**: a faixa
  lê «TRANSDUCE Y DETECTA EL MOVIMIENTO». As três faixas «OÍDO» têm acento.
- **fig 22** — o comentário diz que a versão nova corrigia lateralidade e
  «efrente» mas introduzia «ATAXIA CEREBELOSA (propinceptiva)». O arquivo
  publicado é a **versão antiga**: tinha lateralidade errada e «efrente», e o
  painel DATO CLAVE lê «ATAXIA CEREBELOSA» e «ATAXIA SENSITIVA
  (propioceptiva)» — cientificamente correto. Os dois defeitos reais foram
  corrigidos, mais dois encontrados agora («especifica», «incoordinción»).

Quem reconectar as figuras deve **apagar esses comentários**, porque eles
descrevem defeitos que já não existem.

---

## 5 · Observações da reauditoria que ficam para decisão humana

Nenhuma destas foi alterada — são inconsistências, não erros:

1. **`neurologia_17`** usa «NEGLECT» em inglês; **`neurologia_19`** usa
   «Negligencia» em castelhano para o mesmo conceito. Sugestão: padronizar em
   «Negligencia (neglect)».
2. **`neurologia_26`** diz «nervio cubital»; **`neurologia_28`** diz «nervio
   ulnar» — e no mesmo painel escreve «SÍNDROME DEL TÚNEL CUBITAL · NERVIO
   ULNAR». Sugestão: fixar um dos dois na matéria inteira.
3. **`neurologia_08`** diz «Cavum de Meckel»; **`neurologia_16`** diz «cueva de
   Meckel».
4. **`neurologia_32`** escreve «Síndrome de Eaton-Lambert» e abrevia «LEMS».
   **Não foi alterada de propósito:** o HTML da matéria usa «Eaton-Lambert» 39
   vezes e «Lambert-Eaton» 2 vezes, ou seja, a figura segue a convenção da
   matéria. A inconsistência está no HTML, não na imagem.
5. **Marca:** `neurologia_24`, `25`, `27`, `28` e `29` trazem o logotipo
   «Repasso Med»; as outras 25 não. As quatro figuras novas seguem a maioria e
   **não trazem marca no conteúdo central**.

---

## 6 · Registro da reconstrução da figura 36 (rodada Claude 1)

A versão anterior **não podia ser aprovada** e foi refeita. Três defeitos
científicos, todos corrigidos:

1. **Prova de apneia com «≥ 60 mmHg *o* +20 mmHg».** Essa é a redação **da
   cátedra**, e ficou preservada e rotulada como tal — mas estava apresentada
   como se fosse também o critério internacional. A figura passa a mostrar os
   dois protocolos lado a lado, e o da **AAN/AAP/CNS/SCCM 2023** exige as
   **quatro condições em conjunto**: ausência de respiração espontânea **e**
   pH arterial < 7,30 **e** PaCO₂ ≥ 60 mmHg **e** aumento ≥ 20 mmHg sobre a
   PaCO₂ basal apropriada. A figura diz explicitamente «Nunca ≥ 60 *o* +20».
   Acrescentou-se a regra da **hipercapnia crónica** (o basal é o do próprio
   paciente, documentado antes da prova).
2. **Lista única de provas ancilares.** Estavam misturadas como se todas
   fossem equivalentes. Agora são duas listas separadas: a **da cátedra**, com
   as seis que ela ensina, preservada; e a da **AAN 2023**, que aceita
   **apenas três** — angiografia convencional por cateter de 4 vasos,
   gammagrafia de perfusão cerebral com radionuclídeo e Doppler transcraniano
   **só em adultos** — e **não aceita** EEG, potenciais evocados, angio-TC
   (CTA), RM nem angio-RM.
3. **«Coinciden en lo demás».** A afirmação era falsa e saiu. O painel 7 diz
   agora onde coincidem (definição, prerrequisitos, três critérios, apneia
   obrigatória, certificantes fora da equipa de transplante, equivalência
   legal) e **onde não coincidem** (umbrales da apneia e lista de ancilares).

Também se acrescentou, porque a prova o cobrou: **«Se exploran los seis
reflejos, no cuatro»** — o exame pode pedir para *citar quatro*, mas o
diagnóstico exige a ausência de todos os que o protocolo enumera.

Fonte da coluna da cátedra: slide da Unidad IV, «Escala de Coma de Glasgow,
coma, muerte cerebral», Dra. Silvia Duarte, Universidad Central del Paraguay.
**Nenhum outro raster foi alterado nesta rodada.**

---

## 7 · Temas da prova nova · já cobertos, sem asset novo (rodada Claude 3)

A prova nova cobrou dez temas. Verificado **abrindo os arquivos**, não pelos
nomes: **nenhuma lacuna visual real**, logo nenhum infográfico novo foi criado.
Duplicar conteúdo só porque apareceu na prova não acrescenta valor.

| Tema cobrado | Onde já está |
|---|---|
| Reflexos ausentes na morte encefálica | **fig 36**, painel 3 — os seis reflexos com par craneal, técnica e critério de ausência, mais a nota «se exploran los seis, no cuatro» |
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

## 8 · Correção da figura 34 (rodada Claude 3)

Encontrado na reauditoria: a caixa de fecho do painel de narcolepsia afirmava,
**sem dono**, que «el oxibato de sodio es el único fármaco aprobado a la vez
para la SDE y para la cataplejía». A frase é o que a cátedra ensina, mas **não é
universalmente verdadeira** — o pitolisant tem indicação para as duas na UE.
Deixá-la solta era propagá-la como verdade universal.

A caixa passou a ter rótulo **«SEGÚN LA CÁTEDRA»**. O conteúdo fica intacto: o
aluno continua a ter a resposta que a prova espera, agora sabendo de quem é.

Mais duas correções pequenas na mesma figura:

- **«TLMS» → «TLMS / MSLT»**, para o aluno reconhecer a sigla internacional
  quando a encontrar nas guias.
- **«venlafaxina, clomipramina»** recuperou o rótulo de classe
  **«antidepresivos»**, que a figura tinha perdido ao condensar o slide.

**Divergência registada e não alterada:** a figura 34 dá o TLMS com latência
média **< 8 min**, que é o valor da cátedra. A ICSD-3 usa **≤ 8 min**. A
diferença é mínima, mas é uma divergência real entre cátedra e critério
internacional — fica aqui em vez de ser corrigida em silêncio.
