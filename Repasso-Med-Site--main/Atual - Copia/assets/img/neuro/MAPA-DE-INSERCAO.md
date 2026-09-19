# NEUROLOGÍA · MAPA DE INSERÇÃO DAS FIGURAS NOVAS

> **Este PR não toca em `neurologia.html`.** As quatro figuras novas estão no
> repositório mas **não estão ligadas ao HTML**. Este arquivo existe para que
> quem for editar o HTML (Claude 2) saiba exatamente onde cada uma entra e o
> que ela já cobre — sem ter que reabrir os slides.

---

## 1 · Assets novos

| Asset | Slide fonte | Conteúdo | Ponto de inserção recomendado |
|---|---|---|---|
| `neurologia_33_sueno_y_vigilia_regulacion_y_arquitectura.webp` | Slide **7** · Unidad III · «Sueño y vigilia» | SRAA com os cinco núcleos e seus neurotransmissores; Proceso C (NSQ, luz, melatonina) × Proceso S (adenosina); hipnograma da noite; tabela comparativa N1-N2 × N3 × REM em dez linhas | **Não há bloco de sueño na matéria.** Precisa de um bloco novo — sugestão: `neub17 · 😴 Sueño y vigilia`, logo depois do bloco 01 (estado de conciencia), que já ensina o SRAA. A figura entra no fim da secção «arquitectura del sueño» desse bloco novo. |
| `neurologia_34_trastornos_del_sueno.webp` | Slide **7** · Unidad III | Insomnio agudo × crónico com o modelo 3P de Spielman; hipersomnia primária × secundária; narcolepsia (hipocretina, HLA DQB1\*06:02, TLMS, tratamento); parasomnias NREM / REM / transição | Mesmo bloco novo, na secção de trastornos, depois da figura 33. |
| `neurologia_35_coma_mecanismo_causas_y_localizacion.webp` | Slide **8** · Unidad IV · «Glasgow, coma, muerte cerebral» | Definição de coma; os três mecanismos (córtex bilateral / SRAA focal / difusa metabólica); causas estruturais × metabólicas; **tabela das pupilas** com nível e etiologia; padrão respiratório, mirada e resposta motora | **Bloco 01**, §6 «La exploración ocular en el paciente con conciencia alterada», **no fim da secção** — depois do último parágrafo e antes do `<h3>7 · Síntesis del bloque</h3>`. |
| `neurologia_36_muerte_encefalica_diagnostico_y_protocolo.webp` | Slide **8** · Unidad IV | Prerrequisitos e exclusões; os três critérios clínicos; provas confirmatórias; os seis reflexos de tronco com a técnica; protocolo da prova de apneia em seis passos; **Paraguai × AAN**; diagnóstico diferencial muerte encefálica × vegetativo × locked-in × coma reversible | **Bloco 01**, logo depois da figura 35 (ou já dentro de §7, antes do post-it de síntese). Só faz sentido depois de o resumo ensinar muerte encefálica — hoje a matéria **não ensina**: o termo só aparece no banco geral (`bq-neu…`). Ver secção 3. |

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

**Nenhum traço de caneta e nenhum grifo está ancorado em `neub01`…`neub16`.**
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
  completo e o **resumo da matéria não ensina isso em lugar nenhum** — o termo
  só aparece dentro de questões do banco geral. Pela lei 8-A.2 (resumo ensina →
  questão cobra), isso é uma pendência de texto, não de imagem. Quem editar o
  HTML precisa escrever a secção antes de pendurar a figura 36.

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
