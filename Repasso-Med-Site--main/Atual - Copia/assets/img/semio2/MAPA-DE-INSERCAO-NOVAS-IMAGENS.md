# MAPA DE INSERÇÃO · NOVAS IMAGENS · SEMIOLOGÍA II

**Branch:** `visual/c1-semiologia-ii-imagens-novas` · **base:** `main` `84d31b8`
**Escopo desta entrega:** somente `assets/img/semio2/`. **`semiologia-ii.html` NÃO foi alterado.**
**Fonte:** Drive → Site Repasso Med → Biblioteca → 6.º semestre → Semiología II → **Imagens novas**
(`14t2Q9VivO8oDAOS5VI9bwAuZP1hTaOa1`)

| | |
|---|---|
| Recebidas do Drive | **14** |
| Aprovadas e publicadas aqui | **11** |
| **Pendentes — NÃO publicadas** | **3** |
| Formato | WEBP horizontal **1536 × 1024**, VP8 lossy, RGB — as 14 |
| Arquivos antigos apagados | **0** |
| Arquivos antigos sobrescritos | **0** (nenhuma colisão de nome) |

> **Nada foi integrado ao HTML.** Este documento é a instrução de integração para
> quem tiver o `semiologia-ii.html` reservado. Enquanto não for integrado, as 11
> novas imagens ficam no repositório sem ser referenciadas — não alteram o site.

---

## 1 · COMO O SITE REFERENCIA AS IMAGENS

Semiología II **não usa `<img>`**. Usa `background-image` em classes declaradas no
`<style>` do próprio `semiologia-ii.html`:

```
#tab-semio2 .s2-i12{background-image:url(/assets/img/semio2/10-condensacion-alveolar-mecanismo-v2.webp)}
```

e no corpo:

```html
<figure class="s2-fig">
  <div class="s2-photo s2-i12" role="img" aria-label="..."></div>
  <figcaption><b>Título</b> — texto… <p class="s2-trap">⚠️ <b>Ojo:</b> …</p></figcaption>
</figure>
```

Existem hoje **44 classes** `s2-i1`…`s2-i44`. Delas, **34 são infografias geradas**
(todas 1536 × 1024) e **10 são fotos de diapositiva da cátedra** (`rx-*`, `ecg-*`,
`ic-*`, 860 × 484 e similares), rotuladas `DIAPOSITIVA · …`.

**Regra de integração:** as diapositivas da cátedra (`s2-i10, i11, i14, i15, i16,
i20, i22, i26, i29, i36`) **não devem ser substituídas por nenhuma imagem nova** —
são material-fonte, não infografia.

Substituir uma infografia = trocar só a URL na regra CSS da classe (ou criar classe
nova). O `<figure>`, o `aria-label` e o `figcaption` continuam onde estão e são
ajustados ao conteúdo novo. Isso mantém a ancoragem das marcações do aluno.

---

## 2 · QUADRO GERAL

| # | Arquivo | Bloco | Tema | Substitui | Status |
|---|---|---|---|---|---|
| 1 | `semio2-b01-01-tos-expectoracion.webp` | s2-b01 | Tos y expectoración | `s2-i1` · `01-tos-expectoracion-mecanismo-detallado.webp` | 🔴 **PENDENTE** |
| 2 | `semio2-b01-02-disnea-mmrc-posiciones.webp` | s2-b01 | Disnea posicional + mMRC | `s2-i2` · `02-disnea-posicion-mmrc-mapa-clinico.webp` | 🟢 aprovada · com errata |
| 3 | `semio2-b01-03-hemoptisis-cianosis.webp` | s2-b01 | Hemoptisis × hematemesis; cianosis | `s2-i3` · `03-hemoptisis-pleura-cianosis-diferenciales.webp` (**parcial**) | 🟢 aprovada |
| 4 | `semio2-b01-04-ruidos-respiratorios.webp` | s2-b01 | Origem anatômica de cada ruído | — (**adição**) | 🟢 aprovada |
| 5 | `semio2-b02-01-bronquitis-aguda.webp` | s2-b02 | Mecanismo da bronquite aguda | `s2-i4` · `04-bronquitis-aguda-mecanismo-detallado.webp` | 🟢 aprovada |
| 6 | `semio2-b02-02-bronquitis-neumonia-diferencias.webp` | s2-b02 | Aguda × crônica × pneumonia | `s2-i5` · `05-bronquitis-aguda-cronica-neumonia-diferencias.webp` | 🔴 **PENDENTE** |
| 7 | `semio2-b02-03-tos-aguda-ruta-clinica.webp` | s2-b02 | Rota clínica da tos aguda | `s2-i6` · `06-tos-infecciosa-ruta-clinica.webp` | 🟢 aprovada · com errata |
| 8 | `semio2-b03-01-enfisema-radiografia.webp` | s2-b03 | Rx normal × enfisema, 7 sinais | — (**adição**) | 🟢 aprovada |
| 9 | `semio2-b03-02-asma-epoc-mecanismos.webp` | s2-b03 | Mecanismos asma × EPOC | `s2-i7` · `07-asma-epoc-mecanismos-obstructivos.webp` | 🔴 **PENDENTE** |
| 10 | `semio2-b03-03-espirometria-dvo-dvr.webp` | s2-b03 | Espirometria: DVO × DVR, gravidade | — (**adição**) | 🟢 aprovada · com errata |
| 11 | `semio2-b03-04-asma-control-gravedad.webp` | s2-b03 | Controle GINA + crise grave | — (**adição**) | 🟢 aprovada · com errata |
| 12 | `semio2-b04-01-condensacion-radiografia.webp` | s2-b04 | Condensação: alvéolo → IPPA → Rx | `s2-i12` · `10-condensacion-alveolar-mecanismo-v2.webp` | 🟢 aprovada |
| 13 | `semio2-b04-02-neumonia-contexto.webp` | s2-b04 | NAC / nosocomial / aspiração | `s2-i13` · `11-neumonia-contexto-adquisicion-v2.webp` | 🟢 aprovada |
| 14 | `semio2-b04-03-curb65-gravedad.webp` | s2-b04 | CURB-65 | `s2-i17` · `12-neumonia-ippa-radiografia-curb65-v2.webp` (**parcial — ver aviso**) | 🟢 aprovada |

---

## 3 · FICHA POR ARQUIVO

### 1 · `semio2-b01-01-tos-expectoracion.webp` — 🔴 PENDENTE · NÃO PUBLICADA

- **Bloco / tema:** s2-b01 · `1) Tos 💨` — arco reflexo, fases, tipos de esputo, classificação por duração.
- **Substituiria:** `s2-i1` → `01-tos-expectoracion-mecanismo-detallado.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i1`; a `<figure>` já existe imediatamente antes de `<h3>1) Tos 💨</h3>`.
- **Motivo de não publicar:** a faixa «CLASIFICACIÓN POR DURACIÓN» imprime
  **`Aguda ≤ 3 sem` · `Subaguda 3 – 8 sem` · `Crónica > 8 sem`** — as duas primeiras
  **se sobrepõem exatamente em 3 semanas**. Uma tos de 3 semanas cai em duas classes.
  A própria `semio2-b02-02` (e o texto do site) usam **`< 3 semanas`** para a aguda.
- **Correção pedida para a regeneração:** `Aguda <3 semanas · Subaguda 3–8 semanas · Crónica >8 semanas`.
- **Resto da imagem:** correto e em castelhano limpo (arco reflexo, «No hay receptores
  de la tos en el parénquima alveolar», «Esputo purulento ≠ bacteria segura»).
  **Só a faixa de duração precisa mudar.**

### 2 · `semio2-b01-02-disnea-mmrc-posiciones.webp` — 🟢 aprovada · com errata

- **Bloco / tema:** s2-b01 · `3) Disnea 🌬️` — ortopnea, DPN, platipnea, trepopnea, bendopnea + escala mMRC 0–4.
- **Substitui:** `s2-i2` → `02-disnea-posicion-mmrc-mapa-clinico.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i2`. A `<figure class="s2-fig">` correspondente
  está entre `<h4>Cuánto es demasiado: la vómica</h4>` e `<h3>3) Disnea 🌬️</h3>`.
- **Motivo da substituição:** a figura atual tem um defeito **documentado pelo próprio
  site**, no `figcaption`: *«Dos escalones de la escalera aparecen cortados en la
  imagen»* — os graus **2 e 3** da mMRC não são legíveis e a legenda precisa
  reescrevê-los em prosa. **Na imagem nova os cinco graus 0–4 estão inteiros e
  legíveis**, com texto fiel à mMRC. Também acrescenta bendopnea e trepopnea em
  fotografia, e as duas caixas «Ortopnea y DPN → piense en IC izquierda» e
  «Silencio torácico + disnea intensa = gravedad».
- **⚠️ ERRATA a registrar no `figcaption` ao integrar:**
  o cartão da DPN escreve **«ahcogo»**; leia-se **«ahogo»**.
  (Convenção já usada no site para `s2-i5`: *«la imagen escribe “SatO” sin el subíndice»*.)
- **Ao integrar, remover da legenda** a ressalva sobre os degraus cortados — deixa de ser verdade.

### 3 · `semio2-b01-03-hemoptisis-cianosis.webp` — 🟢 aprovada

- **Bloco / tema:** s2-b01 · entre `4) Hemoptisis 🩸` e `5) Dolor torácico ⚡` — hemoptisis × hematemesis e cianosis central × periférica.
- **Substitui parcialmente:** `s2-i3` → `03-hemoptisis-pleura-cianosis-diferenciales.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i3`; a `<figure>` está imediatamente antes de `<h3>5) Dolor torácico ⚡</h3>`.
- **⚠️ AVISO DE PERDA DE CONTEÚDO:** a figura atual ensina **três** pares —
  hemoptisis/hematemesis, **inervação pleural (dor)** e cianosis central/periférica.
  A nova ensina **dois**: sai o painel da **inervação da pleura**, que o `figcaption`
  atual destaca em negrito (*«la pleura visceral y el parénquima pulmonar son
  insensibles al dolor»*) e que é matéria de prova.
  **Recomendação:** tratar como **adição** (classe nova `s2-i45`) e manter `s2-i3`,
  **ou** só substituir se o painel pleural for reposto em outra figura do bloco.
  **Substituir sem mais nada perde conteúdo avaliável.**
- **Qualidade:** correta. pH alcalino ≈7,4–8,0 × pH ácido ≈1,0–3,0; «respeta mucosas»
  e «mejora al calentar» na periférica. Sem erro de castelhano.

### 4 · `semio2-b01-04-ruidos-respiratorios.webp` — 🟢 aprovada · **adição**

- **Bloco / tema:** s2-b01 · `1) Tos 💨` → subseção `<h4>Escuche la diferencia</h4>`.
- **Substitui:** nada. Não existe hoje nenhuma infografia de origem anatômica dos ruídos no bloco 01.
- **Ponto de inserção exato:** dentro de `<h4>Escuche la diferencia</h4>`, **imediatamente
  antes do primeiro `<div class="audio-player">`** (o de `MURMULLO VESICULAR NORMAL`),
  depois do parágrafo que começa por *«Leer la descripción de un ruido y reconocerlo
  con el estetoscopio son dos habilidades distintas…»*.
  Classe CSS nova, p. ex. `s2-i46`.
- **Motivo:** os cinco áudios (murmullo, crepitantes, sibilancias, roncus, estridor)
  são reproduzidos hoje **sem nenhum mapa de onde cada ruído nasce**. A figura dá a
  âncora anatômica antes da escuta: roncus = brônquio grande + secreção, muda com a
  tosse; sibilância = via pequena; crepitantes = alvéolo, fim da inspiração; frote =
  pleura, nas duas fases. Inclui murmullo vesicular normal e os três sinais de
  transmissão da voz.
- **Qualidade:** correta e sem erro de castelhano.

### 5 · `semio2-b02-01-bronquitis-aguda.webp` — 🟢 aprovada

- **Bloco / tema:** s2-b02 · `Traqueobronquitis / Bronquitis aguda 💨`.
- **Substitui:** `s2-i4` → `04-bronquitis-aguda-mecanismo-detallado.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i4`; a `<figure>` está imediatamente antes de `<h3>Traqueobronquitis / Bronquitis aguda 💨</h3>`.
- **Motivo:** mesma sequência da atual (vírus → dano epitelial → inflamação → moco → tos),
  mas acrescenta o **IPPA completo** (inspeção conservada, VV normais, sonoridade normal,
  roncus/sibilâncias), o critério de quando pedir Rx e as três caixas de fecho
  («causa principal: viral», «roncus cambian o desaparecen al toser», «tos
  posinfecciosa 3–8 semanas», «esputo verde no indica antibiótico»).
  O subtítulo diz **«alvéolos generalmente conservados»** — a formulação correta.
- **Qualidade:** correta e sem erro de castelhano.

### 6 · `semio2-b02-02-bronquitis-neumonia-diferencias.webp` — 🔴 PENDENTE · NÃO PUBLICADA

- **Bloco / tema:** s2-b02 · `⭐ Examen físico de la bronquitis aguda` — comparação aguda × crônica/EPOC × pneumonia.
- **Substituiria:** `s2-i5` → `05-bronquitis-aguda-cronica-neumonia-diferencias.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i5`.
- **Motivo de não publicar:** o rótulo do detalhe alveolar da coluna do meio diz
  **«Cambios crónicos en alvéolos (± enfisema)»**, o que ensina que a bronquite
  crônica **por si** altera o alvéolo. A bronquite crônica é definição **clínica**
  (tos produtiva ≥3 meses/ano por ≥2 anos) e o alvéolo está conservado; quem destrói
  o alvéolo é o enfisema, quando coexiste.
- **Correção pedida para a regeneração:** rótulo equivalente a
  **`Alvéolo conservado en la bronquitis crónica; si coexiste enfisema, hay destrucción alveolar.`**
- **Resto da imagem:** bom. Se regenerada, **também substitui uma errata antiga**:
  a legenda atual de `s2-i5` no site tem de avisar que *«la imagen escribe “SatO” sin
  el subíndice»* — defeito que a versão nova não tem.

### 7 · `semio2-b02-03-tos-aguda-ruta-clinica.webp` — 🟢 aprovada · com errata

- **Bloco / tema:** s2-b02 · fecho do bloco, antes de `<h3>📝 Preguntas basadas en evaluaciones — Síndrome Infeccioso</h3>`.
- **Substitui:** `s2-i6` → `06-tos-infecciosa-ruta-clinica.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i6`.
- **Motivo:** mantém a ordem não negociável (alarma → focalidade → imagem → tratar) e
  acrescenta a faixa **«Localización anatómica, pistas clínicas»** (brônquio → tos +
  roncus; alvéolo → matidez + crepitantes; pleura → dor pleurítico), que é exatamente
  o raciocínio que o bloco 02 cobra.
- **⚠️ ERRATA a registrar no `figcaption`:** a assinatura superior direita escreve
  **«MEJOR DECISIONES»**; leia-se **«MEJORES DECISIONES»**. É texto decorativo, não
  ensina conteúdo.

### 8 · `semio2-b03-01-enfisema-radiografia.webp` — 🟢 aprovada · **adição**

- **Bloco / tema:** s2-b03 · `<h4>Clasificación espirométrica de la gravedad de la EPOC</h4>` → bloco do enfisema.
- **Substitui:** **nada. Não apagar nem substituir `s2-i10` nem `s2-i11`** — são
  `DIAPOSITIVA · Enfisema — silueta cardíaca y diafragma` e `DIAPOSITIVA ·
  Hiperinsuflación pulmonar (enfisema)`, fotos da cátedra.
- **Ponto de inserção exato:** logo **depois** de
  `<div class="key-box exam"><strong>Rx de tórax en EPOC:</strong> rectificación de las
  hemicúpulas diafragmáticas, hiperinsuflación, hipertransparencia pulmonar, "corazón
  en gota" y aumento de los espacios intercostales.</div>`
  e **antes** de `<div class="material-slide">` com o cabeçalho
  `DIAPOSITIVA · Enfisema — silueta cardíaca y diafragma`.
  Classe CSS nova, p. ex. `s2-i47`.
- **Motivo:** o `key-box` lista cinco sinais em texto corrido e as duas diapositivas
  mostram achados soltos, **sem comparação lado a lado com um tórax normal**. A figura
  nova põe **normal (PA) × enfisema (PA) × enfisema (lateral)** com os **7 sinais
  numerados sobre as placas** e a tabela normal/enfisema — incluindo o **espaço
  retroesternal > 2,5 cm** no perfil, que nenhuma imagem atual mostra. Fecha com a
  distinção que a cátedra cobra: **«La Rx APOYA el enfisema; la EPOC se CONFIRMA con
  VEF₁/CVF post-BD <0,70»**.
- **Qualidade:** a melhor do lote. Usa `VEF₁` com subscrito e vírgula decimal, igual ao site.

### 9 · `semio2-b03-02-asma-epoc-mecanismos.webp` — 🔴 PENDENTE · NÃO PUBLICADA

- **Bloco / tema:** s2-b03 · `Asma bronquial 🔄`.
- **Substituiria:** `s2-i7` → `07-asma-epoc-mecanismos-obstructivos.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i7`.
- **Motivo de não publicar (1 — o que foi pedido):** a coluna do asma tem como
  **subtítulo identitário** `INFLAMACIÓN TIPO 2` e abre com «Inflamación tipo 2 —
  Eosinófilos, IgE, IL-4, IL-5, IL-13». Isso apresenta a inflamação tipo 2 como
  característica **universal de toda asma**. O próprio site ensina **fenótipos do asma**.
- **Correção pedida:** **`Inflamación tipo 2 frecuente / fenotipo T2-alto`**.
- **Motivo de não publicar (2 — achado desta auditoria):** o cabeçalho do painel
  inferior central imprime **«HALLAZGOS AUSCIULTATORIOS»**; leia-se
  **«AUSCULTATORIOS»**. Corrigir na mesma regeneração.
- **Resto da imagem:** bom — sequência causal comum, comparação
  variabilidade/reversibilidade × persistência post-BD, e «Tórax silencioso = flujo
  mínimo, no mejoría».

### 10 · `semio2-b03-03-espirometria-dvo-dvr.webp` — 🟢 aprovada · com errata · **adição**

- **Bloco / tema:** s2-b03 · `<h4>Métodos diagnósticos del asma (sin resumir)</h4>`.
- **Substitui:** nada. **Não substituir `s2-i8`** (`09-obstruccion-confirmacion-gravedad.webp`),
  que é o algoritmo funcional comum às duas doenças e está deliberadamente colocado
  entre asma e EPOC.
- **Ponto de inserção exato:** dentro de `<h4>Métodos diagnósticos del asma (sin
  resumir)</h4>`, **imediatamente depois da `</table>` da tabela
  «Clasificación de gravedad del DVO en el asma según el VEF₁ (% del previsto)»**
  (Leve ≥ 60 % · Moderado 41 – 59 % · Grave ≤ 40 %).
  Classe CSS nova, p. ex. `s2-i48`.
- **Motivo:** a figura reproduz **exatamente** essa tabela da cátedra e a põe ao lado
  do GOLD 1–4, que é a comparação que o site pede em prosa («Dos escalas, no una»).
  Acrescenta o que hoje só existe em texto: a leitura em 3 passos (cociente → padrão
  → VEF₁ % para gravidade), as curvas fluxo-volume **DVO × DVR** com a concavidade
  característica do obstrutivo, e a armadilha «Espirometría normal entre crisis NO
  descarta asma».
- **Conferências feitas:** GOLD 1 ≥80 / 2 50–79 / 3 30–49 / 4 <30 ✔ ·
  gravidade do DVO no asma idêntica à tabela do site ✔ ·
  o espirômetro mostra VEF₁ 1.60 L, CVF 2.76 L, cociente 0,58 — **aritmeticamente
  coerente** (1,60 ÷ 2,76 = 0,580) ✔ ·
  `VEF₁ ↑ >12 % y >200 mL` coincide com a forma dominante do site (4 ocorrências
  com `>`, 1 com `≥`) ✔
- **⚠️ ERRATA a registrar no `figcaption`:** o cartão diz **«Gravedad en ASMA»**;
  trata-se da **gravedad del DVO en el asma**, não da gravidade do asma como doença.
  O site adverte explicitamente **«Dos escalas, no una»** — a legenda deve repetir isso.
- **Nota menor:** o visor do espirômetro usa ponto decimal (`1.60 L`); o resto da
  figura e o site usam vírgula.

### 11 · `semio2-b03-04-asma-control-gravedad.webp` — 🟢 aprovada · com errata · **adição**

- **Bloco / tema:** s2-b03 · `<h4>Control del asma (últimas 4 semanas)</h4>`.
- **Substitui:** nada.
- **Ponto de inserção exato:** dentro de `<h4>Control del asma (últimas 4 semanas)</h4>`,
  ao fim da subseção, antes de `<h4>Diagnóstico diferencial del asma</h4>`.
  Classe CSS nova, p. ex. `s2-i49`.
- **Motivo:** hoje o controle do asma é só texto. A figura dá as **quatro perguntas
  das últimas 4 semanas** com a contagem (0 = controlada · 1–2 = parcialmente ·
  3–4 = não controlada), os **seis sinais de crise grave** e a caixa do **tórax
  silencioso** — tudo em uma vista.
- **Conferências:** contagem GINA correta ✔ · `Mejora ≥ 12 % y ≥ 200 mL tras
  broncodilatador` ✔ · «Sibilancias que desaparecen mientras el paciente empeora =
  tórax silencioso» ✔
- **⚠️ ERRATA a registrar no `figcaption`:** a legenda da contagem escreve
  **«controláda»** com acento indevido; leia-se **«controlada»**.

### 12 · `semio2-b04-01-condensacion-radiografia.webp` — 🟢 aprovada

- **Bloco / tema:** s2-b04 · `<h4>Por qué el pulmón normalmente no se infecta</h4>` → `Examen físico de la condensación`.
- **Substitui:** `s2-i12` → `10-condensacion-alveolar-mecanismo-v2.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i12`; a `<figure>` está entre
  `<h4>Por qué el pulmón normalmente no se infecta</h4>` e
  `<h4>Examen físico de la condensación…</h4>`.
- **Motivo:** mantém a cadeia da atual (ar → exsudato → tecido denso → transmite
  melhor o som) e **acrescenta a correlação radiográfica que faltava**: normal ×
  condensação lobar com os três sinais numerados (opacidade alveolar focal,
  broncograma aéreo, sinal da silhueta) e o contraste **neumonía = volume conservado
  × atelectasia = perda de volume + mediastino para a lesão** — que é exatamente a
  armadilha escrita hoje no `figcaption` de `s2-i12`, agora mostrada.
  Também traz o IPPA em fotografia e a fórmula de fecho
  `CONDENSACIÓN = VV↑ + MATIDEZ + CREPITANTES`, com a ressalva correta
  «soplo tubárico **si el bronquio permanece permeable**».
- **⚠️ Reserva declarada:** a placa pequena rotulada **ATELECTASIA** é ilustrativa e
  **não consegui confirmar nela a perda de volume nem o desvio mediastinal** que o
  rótulo afirma. **Não a certifico.** Pede um olhar de radiologia antes de usar essa
  placa como exemplo em questão. Isso **não afeta** os três sinais numerados da placa
  de condensação, que conferem.

### 13 · `semio2-b04-02-neumonia-contexto.webp` — 🟢 aprovada

- **Bloco / tema:** s2-b04 · `Neumonía: clasificación según su adquisición 🦠`.
- **Substitui:** `s2-i13` → `11-neumonia-contexto-adquisicion-v2.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i13`; a `<figure>` está imediatamente antes de
  `<h3>Neumonía: clasificación según su adquisición 🦠</h3>`.
- **Motivo:** mesma regra das 48 h, mas com a **coluna de aspiração** desenvolvida —
  gatilhos (disfagia, vômito, consciência alterada), **segmentos dependentes segundo a
  posição** e risco polimicrobiano — que a atual não tem, e que o bloco cobra.
  Mantém «NAC no identifica el germen» e «típica/atípica é padrão clínico».
- **Nota menor:** o ícone do decúbito supino diz «lóbulos posteriores». Não existe
  «lóbulo posterior»; o correto é **segmento posterior do lobo superior e segmento
  superior do lobo inferior**. Vale precisar no `figcaption`.
- **Nota menor 2:** a faixa diz `≤48 h = NAC · >48 h = nosocomial`; o texto do site diz
  `<48 h` / `>48 h`. As 48 h exatas ficam em classes diferentes nas duas redações.
  Divergência de convenção, não erro — mas convém unificar no `figcaption`.

### 14 · `semio2-b04-03-curb65-gravedad.webp` — 🟢 aprovada

- **Bloco / tema:** s2-b04 · `Escore CURB-65 / CRB-65`.
- **Substitui parcialmente:** `s2-i17` → `12-neumonia-ippa-radiografia-curb65-v2.webp`.
- **Ponto de inserção:** regra CSS de `.s2-i17`; a `<figure>` está entre
  `<h4>Neumonía · el patrón completo, del relato a la placa</h4>` e
  `<h3>Escore CURB-65 / CRB-65</h3>`.
- **⚠️ AVISO DE PERDA DE CONTEÚDO:** a figura atual cobre **três** coisas —
  **IPPA sobre o foco + correlação radiológica + CURB-65**. A nova cobre **só o
  CURB-65**. Substituir direto **apaga o IPPA e a correlação radiológica** desse ponto.
  **Recomendação:** entrar como **adição** (classe nova `s2-i50`) logo **depois** de
  `<h3>Escore CURB-65 / CRB-65</h3>`, mantendo `s2-i17` onde está; **ou** substituir
  apenas se o IPPA/imagem for reposto pela nova `semio2-b04-01`, que já traz os dois.
- **Conferências:** C confusão · U ureia >7 mmol/L · R FR ≥30/min · B PAS <90 ou
  PAD ≤60 mmHg · 65 idade ≥65 anos · 1 ponto por critério ✔ ·
  0–1 ambulatorial · 2 valorar hospitalização · ≥3 grave ✔ — idêntico ao
  `figcaption` que o site já publica. Mantém «CURB-65 no mide oxigenación: revise
  SpO₂ siempre» e «No reemplaza el juicio clínico».

---

## 4 · ERRATAS A CARREGAR NO `figcaption` (convenção já usada pelo site)

O site já resolve imperfeições de texto no raster escrevendo a ressalva na legenda —
por exemplo, em `s2-i5`: *«En la caja inferior derecha la imagen escribe “SatO” sin el
subíndice: se refiere a SatO₂»*. As quatro erratas abaixo seguem a mesma convenção e
**não exigem tocar no arquivo de imagem**:

| Arquivo | O que a imagem escreve | O que deve constar na legenda |
|---|---|---|
| `semio2-b01-02` | «ahcogo» | léase **«ahogo»** |
| `semio2-b02-03` | «MEJOR DECISIONES» | léase **«MEJORES DECISIONES»** (texto decorativo) |
| `semio2-b03-03` | «Gravedad en ASMA» | é a **gravedad del DVO en el asma** — *dos escalas, no una* |
| `semio2-b03-04` | «controláda» | léase **«controlada»** |

Nenhuma dessas ensina conteúdo errado. As **três pendentes**, sim — por isso não foram publicadas.

---

## 5 · O QUE FALTA REGENERAR (3 arquivos)

| Arquivo | Texto atual | Texto que deve aparecer |
|---|---|---|
| `semio2-b01-01-tos-expectoracion.webp` | `Aguda ≤ 3 sem` · `Subaguda 3 – 8 sem` · `Crónica > 8 sem` | `Aguda <3 semanas` · `Subaguda 3–8 semanas` · `Crónica >8 semanas` |
| `semio2-b02-02-bronquitis-neumonia-diferencias.webp` | `Cambios crónicos en alvéolos (± enfisema)` | `Alvéolo conservado en la bronquitis crónica; si coexiste enfisema, hay destrucción alveolar.` |
| `semio2-b03-02-asma-epoc-mecanismos.webp` | `INFLAMACIÓN TIPO 2` como subtítulo do asma **e** `HALLAZGOS AUSCIULTATORIOS` | `Inflamación tipo 2 frecuente / fenotipo T2-alto` **e** `HALLAZGOS AUSCULTATORIOS` |

Os três arquivos ficam **no Drive**, íntegros. **Não foram alterados, nem remendados,
nem publicados.** Assim que houver versão regenerada, entram nesta mesma branch com o
mesmo nome e este mapa passa a valer para as 14.

---

## 6 · VALIDAÇÃO TÉCNICA DAS 14

Verificação feita em Python puro sobre o cabeçalho RIFF/WEBP (chunk a chunk) **e** com
Pillow, mais conferência de `md5` contra o byte a byte baixado do Drive.

```
recebidas do Drive ............ 14
tamanho no Drive = tamanho local ... 14/14 (byte a byte)
RIFF/WEBP válido .............. 14/14   (chunk único VP8, lossy)
chunks fecham no fim do arquivo  14/14
dimensão 1536 x 1024 .......... 14/14   (header VP8 e Pillow concordam)
modo de cor ................... RGB, 14/14
arquivos corrompidos .......... 0
publicadas neste commit ....... 11
pendentes (não publicadas) .... 3
colisão de nome com arquivo antigo ... 0
arquivos antigos apagados ..... 0
arquivos antigos modificados ... 0
```

Compressão: **102 KB – 250 KB** por arquivo (média ≈ 168 KB), dentro da faixa das 34
infografias já publicadas da matéria (**148 KB – 279 KB**). Nenhuma recompressão foi
feita: os arquivos estão exatamente como saíram do Drive.

**Dimensão idêntica às 34 infografias existentes (1536 × 1024)** — a troca de URL numa
classe `.s2-iNN` não altera enquadramento nem proporção.

---

## 7 · ANNOTATION-SAFETY

Esta entrega **não toca no `semiologia-ii.html`** e portanto **não move nenhuma âncora**.
Inventário **somente leitura**, reconferido nesta rodada por consulta de **contagem**
(sem ler nenhum texto privado do aluno):

```
user_highlights ... 73   (s2-b01 69 · s2-b02 1 · s2-b03 3 · s2-b04 0)
user_ink_strokes ... 0
user_notes ......... 0
```

**Nenhuma escrita no Supabase.**

Ao integrar, o risco está em `s2-b01`, que concentra 69 marcações: **trocar a URL na
regra CSS não move nada**; inserir um `<figure>` novo no corpo também não move
highlights (são ancorados por texto), **mas desloca índices de traços de tinta** — e
hoje a matéria tem **0 traços de tinta**, então o risco é nulo enquanto continuar assim.
Reconferir antes de integrar.

---

## 8 · PENDÊNCIAS PARA QUEM TIVER O HTML

1. **3 imagens a regenerar** (seção 5).
2. **4 erratas a escrever em `figcaption`** (seção 4).
3. **2 avisos de perda de conteúdo** ao substituir: `s2-i3` (painel da inervação
   pleural) e `s2-i17` (IPPA + correlação radiológica). Seções 3.3 e 3.14.
4. **1 reserva radiológica não certificada:** a placa de atelectasia em
   `semio2-b04-01`. Seção 3.12.
5. **Inconsistência preexistente do próprio site**, encontrada nesta auditoria e
   **não corrigida** (fora do escopo): o critério de reversibilidade aparece
   **4 vezes como `>12 % y >200 mL`** e **1 vez como `≥12 % y ≥200 mL`**
   (na caixa «🎯 Organización — cómo lo evalúa la cátedra»). As duas formas existem
   na literatura, mas o site deveria usar uma só. Registrado para o dono do HTML.
6. **Coordenação:** a branch `edit/c3-semiologia-ii-provas` (PR #77) altera
   **apenas** `semiologia-ii.html`. Esta branch altera **apenas**
   `assets/img/semio2/`. **Interseção de arquivos: nenhuma.** Sem conflito de merge.
