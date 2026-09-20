# MAPA DE INSERÇÃO · NOVAS IMAGENS · SEMIOLOGÍA II

**Branch:** `visual/c1-semiologia-ii-imagens-novas` · **base:** `main` `84d31b8`
**Escopo:** somente `assets/img/semio2/`. **`semiologia-ii.html` NÃO foi alterado.**
**Fonte:** Drive → Site Repasso Med → Biblioteca → 6.º semestre → Semiología II → **Imagens novas**
(`14t2Q9VivO8oDAOS5VI9bwAuZP1hTaOa1`)

> ## ⛔ ESTA RODADA NÃO CONSEGUIU REGENERAR NENHUM RASTER
>
> Foi pedido corrigir/regerar 9 imagens. **Nenhuma correção foi possível nesta
> sessão.** Não existe aqui capacidade de gerar imagem: o ambiente tem apenas
> Pillow e um Chromium headless — não há modelo de imagem, nem `ImageMagick`,
> nem `cwebp`. As 14 são ilustrações rasterizadas com anatomia desenhada,
> radiografias e fotografias; não podem ser reproduzidas a partir de HTML/CSS
> sem virar outra imagem, com outra linguagem visual, fora do padrão das 34
> infografias já publicadas da matéria.
>
> E **remendar texto sobre o raster continua proibido**. Como a errata via
> `figcaption` também deixou de ser aceita, **toda imagem com defeito de texto
> fica BLOQUEADA** — não «aprovada com ressalva».
>
> **Resultado: 5 aprovadas · 9 BLOQUEADAS.** As 9 precisam voltar para quem tem
> o pipeline que as produziu. A seção 5 traz o texto exato de cada correção.

| | |
|---|---|
| Recebidas do Drive | **14** |
| **Aprovadas e publicadas** | **5** |
| **🔴 BLOQUEADAS — não publicadas** | **9** |
| Formato | WEBP horizontal **1536 × 1024**, VP8 lossy, RGB — as 14 |
| Arquivos antigos apagados | **0** |
| Arquivos antigos sobrescritos | **0** (nenhuma colisão de nome) |

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

Existem **44 classes** `s2-i1`…`s2-i44`: **34 infografias geradas** (todas 1536 × 1024)
e **10 fotos de diapositiva da cátedra** (860 × 484 e similares), rotuladas
`DIAPOSITIVA · …`.

### ⛔ As 10 diapositivas da cátedra não podem ser substituídas

`s2-i10` · `s2-i11` · `s2-i14` · `s2-i15` · `s2-i16` · `s2-i20` · `s2-i22` ·
`s2-i26` · `s2-i29` · `s2-i36`

São material-fonte, não infografia. **Nenhuma imagem nova substitui nenhuma delas.**

Substituir uma infografia = trocar só a URL na regra CSS da classe (ou criar classe
nova). O `<figure>`, o `aria-label` e o `figcaption` continuam onde estão. Isso mantém
a ancoragem das marcações do aluno.

---

## 2 · QUADRO GERAL

| # | Arquivo | Bloco | Tema | Relação com o acervo | Status |
|---|---|---|---|---|---|
| 1 | `semio2-b01-01-tos-expectoracion` | s2-b01 | Tos y expectoración | substituiria `s2-i1` | 🔴 **BLOQUEADA** |
| 2 | `semio2-b01-02-disnea-mmrc-posiciones` | s2-b01 | Disnea posicional + mMRC | substituiria `s2-i2` | 🔴 **BLOQUEADA** |
| 3 | `semio2-b01-03-hemoptisis-cianosis` | s2-b01 | Hemoptisis × hematemesis; cianosis | **ADIÇÃO** — não substitui `s2-i3` | 🟢 aprovada |
| 4 | `semio2-b01-04-ruidos-respiratorios` | s2-b01 | Origem anatômica de cada ruído | **ADIÇÃO** | 🟢 aprovada |
| 5 | `semio2-b02-01-bronquitis-aguda` | s2-b02 | Mecanismo da bronquite aguda | substitui `s2-i4` | 🟢 aprovada |
| 6 | `semio2-b02-02-bronquitis-neumonia-diferencias` | s2-b02 | Aguda × crônica × pneumonia | substituiria `s2-i5` | 🔴 **BLOQUEADA** |
| 7 | `semio2-b02-03-tos-aguda-ruta-clinica` | s2-b02 | Rota clínica da tos aguda | substituiria `s2-i6` | 🔴 **BLOQUEADA** |
| 8 | `semio2-b03-01-enfisema-radiografia` | s2-b03 | Rx normal × enfisema, 7 sinais | **ADIÇÃO** | 🟢 aprovada |
| 9 | `semio2-b03-02-asma-epoc-mecanismos` | s2-b03 | Mecanismos asma × EPOC | substituiria `s2-i7` | 🔴 **BLOQUEADA** |
| 10 | `semio2-b03-03-espirometria-dvo-dvr` | s2-b03 | Espirometria: DVO × DVR | **ADIÇÃO** | 🔴 **BLOQUEADA** |
| 11 | `semio2-b03-04-asma-control-gravedad` | s2-b03 | Controle GINA + crise grave | **ADIÇÃO** | 🔴 **BLOQUEADA** |
| 12 | `semio2-b04-01-condensacion-radiografia` | s2-b04 | Condensação: alvéolo → IPPA → Rx | substituiria `s2-i12` | 🔴 **BLOQUEADA** |
| 13 | `semio2-b04-02-neumonia-contexto` | s2-b04 | NAC / nosocomial / aspiração | substituiria `s2-i13` | 🔴 **BLOQUEADA** |
| 14 | `semio2-b04-03-curb65-gravedad` | s2-b04 | CURB-65 | **ADIÇÃO** — não substitui `s2-i17` | 🟢 aprovada |

---

## 3 · AS 5 APROVADAS · FICHA DE INTEGRAÇÃO

Reauditadas nesta rodada sob o critério estrito «nenhuma errata conhecida».
Cada uma foi reexaminada com ampliação 2× de tela cheia **e** 3× nas zonas de
tipo menor. **Nenhuma tem erro científico, textual ou visual conhecido.**

### 3 · `semio2-b01-03-hemoptisis-cianosis.webp` — 🟢 aprovada · **ADIÇÃO**

- **Bloco / tema:** s2-b01 · entre `<h3>4) Hemoptisis 🩸</h3>` e `<h3>5) Dolor torácico ⚡</h3>`.
- **Relação com o acervo:** ⛔ **ADIÇÃO. NÃO substituir `s2-i3`.**
  A `s2-i3` (`03-hemoptisis-pleura-cianosis-diferenciales.webp`) ensina **três** pares —
  hemoptisis/hematemesis, **inervação pleural** e cianosis central/periférica. A nova
  ensina **dois**: não tem o painel da inervação pleural, que o `figcaption` de `s2-i3`
  destaca em negrito (*«la pleura visceral y el parénquima pulmonar son insensibles al
  dolor»*) e que é matéria de prova. **As duas convivem.**
- **Ponto exato de inserção:** classe CSS nova, p. ex. `s2-i45`; `<figure class="s2-fig">`
  nova **logo depois** da `<figure>` de `s2-i3`, antes de `<h3>5) Dolor torácico ⚡</h3>`.
- **Motivo:** aprofunda os dois pares que a `s2-i3` resume em uma faixa — acrescenta pH
  (≈7,4–8,0 × ≈1,0–3,0), cosquilleo faringolaríngeo × náuseas prévias, restos
  alimentarios, e as duas fórmulas de fecho.
- **Conferido:** hemoptisis (sangre roja, espumosa, tos, pH alcalino) ✔ · hematemesis
  (borra de café, restos alimentarios, pH ácido) ✔ · central (mucosas azules, SpO₂ < 90 %,
  no mejora con calor) ✔ · periférica (acrocianosis, respeta mucosas, mejora al calentar) ✔

### 4 · `semio2-b01-04-ruidos-respiratorios.webp` — 🟢 aprovada · **ADIÇÃO**

- **Bloco / tema:** s2-b01 · `<h4>Escuche la diferencia</h4>` (dentro de `1) Tos 💨`).
- **Ponto exato de inserção:** **imediatamente antes do primeiro `<div class="audio-player">`**
  (o de `MURMULLO VESICULAR NORMAL`), logo após o parágrafo *«Leer la descripción de un
  ruido y reconocerlo con el estetoscopio son dos habilidades distintas…»*.
  Classe CSS nova, p. ex. `s2-i46`.
- **Motivo:** os cinco áudios tocam hoje **sem nenhum mapa de onde cada ruído nasce**.
  A figura dá a âncora anatômica antes da escuta.
- **Conferido:** roncus (brônquio grande + secreção, grave, muda ao tossir) ✔ ·
  sibilância (via pequena, aguda, predomina na expiração) ✔ · crepitantes (alvéolo,
  finos no fim da inspiração) ✔ · frote (pleuras inflamadas, nas duas fases) ✔ ·
  murmullo vesicular ✔ · broncofonía + pectoriloquia áfona + egofonía ✔

### 5 · `semio2-b02-01-bronquitis-aguda.webp` — 🟢 aprovada · substitui `s2-i4`

- **Bloco / tema:** s2-b02 · `Traqueobronquitis / Bronquitis aguda 💨`.
- **Ponto exato de inserção:** regra CSS de `.s2-i4`. A `<figure>` já existe
  imediatamente antes de `<h3>Traqueobronquitis / Bronquitis aguda 💨</h3>`.
- **Motivo da substituição:** mesma sequência da atual (vírus → dano epitelial →
  inflamação → moco → tos), mas acrescenta o **IPPA completo**, o critério de quando
  pedir Rx e as quatro caixas de fecho. O subtítulo diz **«alvéolos generalmente
  conservados»** — a formulação correta, que é justamente o que falta na `b02-02`.
- **Substituição limpa:** nada do que a `s2-i4` ensina se perde.

### 8 · `semio2-b03-01-enfisema-radiografia.webp` — 🟢 aprovada · **ADIÇÃO**

- **Bloco / tema:** s2-b03 · bloco do enfisema, depois de
  `<h4>Clasificación espirométrica de la gravedad de la EPOC</h4>`.
- **Relação com o acervo:** ⛔ **ADIÇÃO. NÃO substituir `s2-i10` nem `s2-i11`** — são
  diapositivas da cátedra.
- **Ponto exato de inserção:** logo **depois** de
  `<div class="key-box exam"><strong>Rx de tórax en EPOC:</strong> rectificación de las
  hemicúpulas diafragmáticas, hiperinsuflación, hipertransparencia pulmonar, "corazón
  en gota" y aumento de los espacios intercostales.</div>`
  e **antes** do `<div class="material-slide">` cujo cabeçalho é
  `DIAPOSITIVA · Enfisema — silueta cardíaca y diafragma`.
  Classe CSS nova, p. ex. `s2-i47`.
- **Motivo:** hoje o `key-box` lista cinco sinais em texto corrido e as duas
  diapositivas mostram achados soltos, **sem comparação lado a lado com um tórax
  normal**. A nova põe **normal (PA) × enfisema (PA) × enfisema (lateral)** com os
  **7 sinais numerados sobre as placas** e a tabela normal/enfisema — incluindo o
  **espaço retroesternal > 2,5 cm** no perfil, que nenhuma imagem atual mostra.
  Fecha com a distinção que a cátedra cobra: **«La Rx APOYA el enfisema; la EPOC se
  CONFIRMA con VEF₁/CVF post-BD <0,70»**.
- **Conferido:** usa `VEF₁` com subscrito e vírgula decimal, igual ao site ✔ ·
  os 7 sinais conferem com o `key-box` ✔ · coerência radiológica das três placas ✔

### 14 · `semio2-b04-03-curb65-gravedad.webp` — 🟢 aprovada · **ADIÇÃO**

- **Bloco / tema:** s2-b04 · `Escore CURB-65 / CRB-65`.
- **Relação com o acervo:** ⛔ **ADIÇÃO. NÃO substituir `s2-i17` às cegas.**
  A `s2-i17` (`12-neumonia-ippa-radiografia-curb65-v2.webp`) cobre **IPPA sobre o foco +
  correlação radiológica + CURB-65**. A nova cobre **só o CURB-65**. Substituir direto
  apaga o IPPA e a correlação radiológica desse ponto do bloco.
- **Ponto exato de inserção:** classe CSS nova, p. ex. `s2-i48`; `<figure>` nova
  **logo depois** de `<h3>Escore CURB-65 / CRB-65</h3>`, mantendo `s2-i17` onde está.
- **Motivo:** dá ao escore uma vista própria, grande e legível, com o critério de cada
  letra e a decisão de destino — hoje comprimido num terço da `s2-i17`.
- **Conferido:** C confusão · U ureia > 7 mmol/L · R FR ≥ 30/min · B PAS < 90 **ou**
  PAD ≤ 60 mmHg · 65 idade ≥ 65 anos · 1 ponto por critério ✔ ·
  0–1 ambulatorial · 2 valorar hospitalização · ≥ 3 grave ✔ — idêntico ao `figcaption`
  que o site já publica. Mantém «CURB-65 no mide oxigenación: revise SpO₂ siempre» e
  «No reemplaza el juicio clínico» ✔

---

## 4 · ONDE AS 9 BLOQUEADAS ENTRARIAM, QUANDO FOREM CORRIGIDAS

Registrado agora para que a regeneração já volte com destino definido.

| Arquivo | Bloco | Ponto exato de inserção | Relação |
|---|---|---|---|
| `b01-01-tos-expectoracion` | s2-b01 | regra CSS de `.s2-i1`; `<figure>` antes de `<h3>1) Tos 💨</h3>` | substitui `s2-i1` |
| `b01-02-disnea-mmrc-posiciones` | s2-b01 | regra CSS de `.s2-i2`; `<figure>` entre `<h4>Cuánto es demasiado: la vómica</h4>` e `<h3>3) Disnea 🌬️</h3>` | substitui `s2-i2` |
| `b02-02-bronquitis-neumonia-diferencias` | s2-b02 | regra CSS de `.s2-i5` | substitui `s2-i5` |
| `b02-03-tos-aguda-ruta-clinica` | s2-b02 | regra CSS de `.s2-i6`; `<figure>` antes de `<h3>📝 Preguntas basadas en evaluaciones — Síndrome Infeccioso</h3>` | substitui `s2-i6` |
| `b03-02-asma-epoc-mecanismos` | s2-b03 | regra CSS de `.s2-i7`; `<figure>` antes de `<h3>Asma bronquial 🔄</h3>` | substitui `s2-i7` |
| `b03-03-espirometria-dvo-dvr` | s2-b03 | dentro de `<h4>Métodos diagnósticos del asma (sin resumir)</h4>`, **logo após a `</table>`** da tabela «Clasificación de gravedad del DVO en el asma según el VEF₁ (% del previsto)» | **adição** — ⛔ não substituir `s2-i8` |
| `b03-04-asma-control-gravedad` | s2-b03 | fim de `<h4>Control del asma (últimas 4 semanas)</h4>`, antes de `<h4>Diagnóstico diferencial del asma</h4>` | **adição** |
| `b04-01-condensacion-radiografia` | s2-b04 | regra CSS de `.s2-i12`; `<figure>` entre `<h4>Por qué el pulmón normalmente no se infecta</h4>` e `<h4>Examen físico de la condensación…</h4>` | substitui `s2-i12` |
| `b04-02-neumonia-contexto` | s2-b04 | regra CSS de `.s2-i13`; `<figure>` antes de `<h3>Neumonía: clasificación según su adquisición 🦠</h3>` | substitui `s2-i13` |

---

## 5 · BRIEF DE REGENERAÇÃO · O TEXTO EXATO DE CADA CORREÇÃO

Os 9 arquivos seguem **íntegros no Drive**. Nenhum foi alterado, remendado ou publicado.
Cada linha abaixo diz o que a imagem imprime hoje e o que a versão nova deve imprimir.
**Só o trecho citado muda; o resto de cada figura está correto e deve ser preservado.**

### 🔴 1 · `semio2-b01-01-tos-expectoracion.webp`

| | |
|---|---|
| Onde | faixa inferior esquerda, «CLASIFICACIÓN POR DURACIÓN» |
| Imprime hoje | `Aguda ≤ 3 sem` · `Subaguda 3 – 8 sem` · `Crónica > 8 sem` |
| **Deve imprimir** | **`Aguda <3 semanas` · `Subaguda 3–8 semanas` · `Crónica >8 semanas`** |
| Por quê | `≤ 3` e `3 – 8` **se sobrepõem exatamente em 3 semanas**: uma tos de 3 semanas cai em duas classes. A própria `b02-02` e o texto do site usam `< 3 semanas`. |

Resto da figura correto: arco reflexo, fases, tipos de esputo, «No hay receptores de la
tos en el parénquima alveolar», «Esputo purulento ≠ bacteria segura».

### 🔴 2 · `semio2-b01-02-disnea-mmrc-posiciones.webp`

| | |
|---|---|
| Onde | cartão **DPN**, segunda linha da legenda |
| Imprime hoje | `DPN: despierta de noche con ahcogo.` |
| **Deve imprimir** | **`DPN: despierta de noche con ahogo.`** |

Resto correto e, aliás, **melhor que a imagem publicada hoje**: a `s2-i2` atual tem os
graus **2 e 3** da mMRC cortados — defeito que o `figcaption` do site precisa compensar
em prosa (*«Dos escalones de la escalera aparecen cortados en la imagen»*). Na nova os
cinco graus 0–4 estão inteiros. **Vale a regeneração: um typo separa esta figura de
resolver um defeito antigo.**

### 🔴 6 · `semio2-b02-02-bronquitis-neumonia-diferencias.webp`

| | |
|---|---|
| Onde | rótulo do detalhe alveolar da **coluna do meio** (Bronquitis crónica / EPOC) |
| Imprime hoje | `Cambios crónicos en alvéolos (± enfisema)` |
| **Deve imprimir** | **`Alvéolo conservado en la bronquitis crónica; si coexiste enfisema, hay destrucción alveolar.`** |
| Por quê | a bronquite crônica é definição **clínica** (tos produtiva ≥ 3 meses/ano por ≥ 2 anos) e **o alvéolo está conservado**. Quem destrói o alvéolo é o enfisema, quando coexiste. O rótulo atual atribui alteração alveolar à bronquite crônica por si só. |

Ganho extra da regeneração: a `s2-i5` que ela substituiria tem uma errata antiga —
o site precisa avisar que *«la imagen escribe “SatO” sin el subíndice»*. A nova não tem.

### 🔴 7 · `semio2-b02-03-tos-aguda-ruta-clinica.webp`

| | |
|---|---|
| Onde | assinatura superior direita |
| Imprime hoje | `MEJOR DECISIONES. MEJORES PACIENTES.` |
| **Deve imprimir** | **`MEJORES DECISIONES. MEJORES PACIENTES.`** |

Resto correto: alarma → focalidade → imagem → tratar, e a faixa «Localización
anatómica, pistas clínicas» (brônquio → tos + roncus; alvéolo → matidez + crepitantes;
pleura → dor pleurítico).

### 🔴 9 · `semio2-b03-02-asma-epoc-mecanismos.webp` — **duas correções**

| | |
|---|---|
| Onde (1) | subtítulo da coluna **ASMA** e primeiro marcador da mesma coluna |
| Imprime hoje | `INFLAMACIÓN TIPO 2` como subtítulo identitário do asma |
| **Deve imprimir** | **`Inflamación tipo 2 frecuente / fenotipo T2-alto`** |
| Por quê | apresenta a inflamação tipo 2 como característica **universal de toda asma**. O próprio site ensina **fenótipos do asma**. |
| Onde (2) | cabeçalho do painel inferior central |
| Imprime hoje | `HALLAZGOS AUSCIULTATORIOS` |
| **Deve imprimir** | **`HALLAZGOS AUSCULTATORIOS`** |

Resto correto: sequência causal comum, comparação variabilidade/reversibilidade ×
persistência post-BD, «Tórax silencioso = flujo mínimo, no mejoría».

### 🔴 10 · `semio2-b03-03-espirometria-dvo-dvr.webp` — **duas correções**

| | |
|---|---|
| Onde (1) | cabeçalho do cartão inferior esquerdo-central |
| Imprime hoje | `Gravedad en ASMA` |
| **Deve imprimir** | **`Gravedad del DVO en el asma`** |
| Por quê | são duas escalas diferentes e o site adverte explicitamente **«Dos escalas, no una»**. O cartão traz cortes de VEF₁ % previsto, que graduam o **DVO**, não a gravidade do asma como doença. |
| Onde (2) | visor do espirômetro, canto superior esquerdo |
| Imprime hoje | `VEF₁ 1.60 L` · `CVF 2.76 L` · `VEF₁/CVF 0.58` (ponto decimal) |
| **Deve imprimir** | **`VEF₁ 1,60 L` · `CVF 2,76 L` · `VEF₁/CVF 0,58`** (vírgula decimal, como o resto da figura e o site) |

**Não mexer nos números**, que conferem: 1,60 ÷ 2,76 = **0,580** ✔ ·
GOLD 1 ≥ 80 % / 2 50–79 % / 3 30–49 % / 4 < 30 % ✔ ·
Leve ≥ 60 % / Moderado 41–59 % / Grave ≤ 40 % — **idêntico à tabela da cátedra
publicada no site** ✔ · curvas fluxo-volume com a concavidade correta do obstrutivo ✔ ·
`VEF₁ ↑ > 12 % y > 200 mL` coincide com a forma dominante do site ✔

### 🔴 11 · `semio2-b03-04-asma-control-gravedad.webp`

| | |
|---|---|
| Onde | legenda da contagem, sob as quatro perguntas |
| Imprime hoje | `0 = controláda; 1–2 = parcialmente controlada; 3–4 = no controlada` |
| **Deve imprimir** | **`0 = controlada; 1–2 = parcialmente controlada; 3–4 = no controlada`** |

Resto correto: contagem GINA ✔ · seis sinais de crise grave ✔ ·
`Mejora ≥ 12 % y ≥ 200 mL tras broncodilatador` ✔ · tórax silencioso ✔

### 🔴 12 · `semio2-b04-01-condensacion-radiografia.webp` — **painel radiográfico reprovado**

O item pedia confirmar visualmente a placa rotulada **ATELECTASIA**. **Confirmei o
contrário: a placa não mostra o que o rótulo afirma.** A medição foi feita sobre os
pixels dos três painéis da mesma figura, com o mesmo método.

| painel | desvio do eixo opaco central | largura da banda opaca central | assimetria do campo aerado |
|---|---|---|---|
| NORMAL | +1,6 % | 14,6 % | 2,6 pp |
| CONDENSACIÓN LOBAR | +0,8 % | 18,7 % | 33,1 pp |
| **ATELECTASIA** | **+0,0 %** | **18,9 %** | 26,3 pp |

Leitura:

1. **Desvio mediastinal = 0,0 %.** O eixo opaco central cai **exatamente** no centro
   geométrico do tórax. O rótulo afirma «mediastino hacia la lesión». **Não há desvio
   nenhum, para lado nenhum.**
2. **A placa é geometricamente indistinguível da placa de condensação** logo acima
   (0,0 % × 0,8 % de desvio; banda de 18,9 % × 18,7 %). O painel existe justamente para
   **contrastar** «neumonía = volume conservado» com «atelectasia = perda de volume +
   desvio» — e as duas placas são intercambiáveis. **O contraste didático não existe
   na imagem.**
3. Não há sinal de perda de volume: sem fissura deslocada, sem costelas aproximadas,
   sem elevação diafragmática assimétrica. A traqueia está na linha média.
4. O eixo central é uma **faixa branca larga e sem estrutura**, sem silhueta cardíaca
   identificável — artefato de renderização, não anatomia.

**Correção pedida:** substituir a placa de atelectasia por uma que **demonstre**
perda de volume com desvio mediastinal **para o lado da lesão**, ou **remover o painel
ATELECTASIA** e deixar a figura só com normal × condensação lobar. Nas duas hipóteses
o raster tem de ser refeito.

Resto da figura correto e valioso: alvéolo normal × com exsudato, cadeia
ar → exsudato → tecido denso → transmite melhor o som, IPPA em fotografia, os três
sinais numerados sobre a placa de condensação (opacidade alveolar focal, broncograma
aéreo, sinal da silhueta), «soplo tubárico **si el bronquio permanece permeable**» e
`CONDENSACIÓN = VV↑ + MATIDEZ + CREPITANTES`.

### 🔴 13 · `semio2-b04-02-neumonia-contexto.webp` — **duas correções**

| | |
|---|---|
| Onde (1) | ícone do decúbito supino, coluna **ASPIRACIÓN** |
| Imprime hoje | `Decúbito supino (lóbulos posteriores)` |
| **Deve imprimir** | **`Decúbito supino (segmento posterior del lóbulo superior y segmento superior del lóbulo inferior)`** |
| Por quê | **não existe «lóbulo posterior».** Os segmentos dependentes em decúbito dorsal são os nomeados acima. |
| Onde (2) | cabeçalho da coluna NAC e faixa central |
| Imprime hoje | `NAC · O ≤48 h TRAS EL INGRESO` e `≤48 h = NAC · >48 h = nosocomial` |
| **Deve imprimir** | **`NAC · fuera del hospital o <48 h tras el ingreso`** e **`<48 h = NAC · ≥48 h = nosocomial`** |
| Por quê | a convenção é **≥ 48 h após a admissão = nosocomial**. A redação atual põe as 48 h exatas na NAC. |

Manter correto o que já está: `Decúbito lateral (lóbulo inferior del lado dependiente)` ✔ ·
NAC não identifica o germe ✔ · típica/atípica é padrão clínico ✔ · NAV ligada a
ventilação mecânica ✔ · risco polimicrobiano na aspiração ✔

---

## 6 · VALIDAÇÃO TÉCNICA DAS 14

Verificação em Python puro sobre o cabeçalho RIFF/WEBP (chunk a chunk) **e** com Pillow,
mais conferência de `md5` contra o byte a byte baixado do Drive.

```
recebidas do Drive ................. 14
tamanho no Drive = tamanho local ... 14/14 (byte a byte)
RIFF/WEBP válido ................... 14/14  (chunk único VP8, lossy)
chunks fecham no fim do arquivo .... 14/14
1536 x 1024 ........................ 14/14  (header VP8 e Pillow concordam)
modo de cor ........................ RGB, 14/14
arquivos corrompidos ............... 0
publicadas ......................... 5
bloqueadas ......................... 9
colisão de nome .................... 0
arquivos antigos apagados .......... 0
arquivos antigos modificados ....... 0
```

Compressão das 5 publicadas: **102 – 190 KB**, dentro da faixa das 34 infografias já
publicadas da matéria (**148 – 279 KB**). Sem recompressão: os arquivos estão
exatamente como saíram do Drive.

**Dimensão idêntica às 34 infografias existentes (1536 × 1024)** — trocar a URL numa
classe `.s2-iNN` não altera enquadramento nem proporção.

---

## 7 · ANNOTATION-SAFETY

Esta entrega **não toca no `semiologia-ii.html`** e portanto **não move nenhuma âncora**.

Inventário **somente leitura**, por **contagem** (sem ler texto privado do aluno):

```
user_highlights ... 73   (s2-b01 69 · s2-b02 1 · s2-b03 3 · s2-b04 0)
user_ink_strokes ... 0
user_notes ......... 0
```

**Nenhuma escrita no Supabase.**

Na integração futura o risco fica em `s2-b01`, que concentra 69 marcações: **trocar a URL
na regra CSS não move nada**; inserir `<figure>` novo no corpo também não move highlights
(são ancorados por texto), e só deslocaria **índices de traços de tinta** — hoje **0**.
Reconferir antes de integrar.

---

## 8 · O QUE PRECISA DE DECISÃO HUMANA

1. **As 9 bloqueadas precisam voltar ao pipeline que as gerou.** Esta sessão não tem
   capacidade de gerar imagem e o remendo sobre o raster está proibido. A seção 5 traz
   o texto exato de cada correção.
2. **`b04-01` tem defeito de conteúdo radiográfico, não só de texto** — o painel da
   atelectasia precisa ser refeito ou removido. É a única das 9 cuja correção não é
   apenas tipográfica.
3. **Inconsistência preexistente do próprio site**, encontrada nesta auditoria e **não
   corrigida** (fora do escopo assets-only): o critério de reversibilidade aparece
   **4× como `>12 % y >200 mL`** e **1× como `≥12 % y ≥200 mL`** (na caixa
   «🎯 Organización — cómo lo evalúa la cátedra»). As duas formas existem na literatura,
   mas o site deveria usar uma só. Registrado para quem tiver o HTML reservado.
4. **Coordenação:** a branch `edit/c3-semiologia-ii-provas` (PR #77) altera **apenas**
   `semiologia-ii.html`. Esta altera **apenas** `assets/img/semio2/`.
   **Interseção de arquivos: nenhuma.** Sem conflito de merge nos dois sentidos.
