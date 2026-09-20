# PATCH DE INTEGRAÇÃO · 5 ASSETS APROVADOS · SEMIOLOGÍA II

> **Este patch NÃO foi aplicado.** `semiologia-ii.html` continua intacto nesta branch.
> Ele foi montado, aplicado **numa cópia** e **verificado ponta a ponta**. Está aqui
> pronto para quem tiver o HTML reservado — hoje o PR #77 (`edit/c3-semiologia-ii-provas`),
> que está aberto e aguardando auditoria sobre o mesmo arquivo.

**Base verificada:** `semiologia-ii.html` em `main` `84d31b8`
**md5 do arquivo sobre o qual o patch foi testado:** `2fa81ca7408905f71121c6388e75e977`
**Efeito:** +4 060 bytes · +4 `<figure>` · +4 imagens referenciadas (44 → 48) · 1 URL trocada

Se o arquivo tiver mudado (o PR #77 muda), **reaplicar pelas âncoras de texto**, não
pelos números de linha. As cinco âncoras abaixo são únicas no arquivo e foram conferidas
com contagem de ocorrências antes de cada inserção.

---

## O que o patch faz

| # | Asset | Classe | Ação | Âncora (única no arquivo) |
|---|---|---|---|---|
| 1 | `semio2-b02-01-bronquitis-aguda.webp` | `.s2-i4` | **troca só a URL** na regra CSS | a própria regra `#tab-semio2 .s2-i4{…}` |
| 2 | `semio2-b01-03-hemoptisis-cianosis.webp` | `.s2-i45` (nova) | **adição** | logo após a `</figure>` que contém `class="s2-photo s2-i3"` |
| 3 | `semio2-b01-04-ruidos-respiratorios.webp` | `.s2-i46` (nova) | **adição** | imediatamente antes do `<div class="audio-player">` cujo label é `&#128266; MURMULLO VESICULAR NORMAL` |
| 4 | `semio2-b03-01-enfisema-radiografia.webp` | `.s2-i47` (nova) | **adição** | logo após o `<div class="key-box exam"><strong>Rx de tórax en EPOC:</strong>…</div>` |
| 5 | `semio2-b04-03-curb65-gravedad.webp` | `.s2-i48` (nova) | **adição** | logo após `<h3>Escore CURB-65 / CRB-65</h3>` |

**Nada é removido.** `s2-i3` e `s2-i17` **continuam publicadas** — as duas guardam conteúdo
que a figura nova não cobre. As 10 diapositivas da cátedra (`s2-i10, i11, i14, i15, i16,
i20, i22, i26, i29, i36`) **não são tocadas**. O arquivo antigo
`04-bronquitis-aguda-mecanismo-detallado.webp` **continua no repositório**, apenas deixa de
ser referenciado — a troca é reversível revertendo uma linha.

---

## Verificação feita sobre a cópia com o patch aplicado

### Annotation-safety — o ponto crítico

`figcaption` **não** está na lista `SKIP` do `assets/rm-tools.js`, portanto **texto de legenda
entra no índice das marcações**. Não bastava presumir: portei `indexar()` e `escolher()` do
`rm-tools.js` para Python, reconstruí as **73 marcações** a partir de `md5`/`length` de
`exact_text`, `prefix` e `suffix` (**sem ler texto privado do aluno**) e rodei o resolvedor
real dos dois lados.

```
marcações ............................................ 73
exact_text localizado no bloco ....................... 73/73
resolvem ANTES do patch .............................. 73/73
resolvem DEPOIS do patch ............................. 73/73
mesmo texto e mesmo contexto de 40 chars dos 2 lados . 73/73
deslocadas · perdidas · com contexto alterado ........ 0 · 0 · 0
```

**Um defeito meu, apanhado e corrigido nesta verificação:** a primeira redação da legenda de
`b01-04` usava a expressão **«murmullo vesicular»**, que é exatamente uma das 73 marcações do
`s2-b01`. Isso fazia a marcação passar de **1 para 2 ocorrências** no bloco. Ela continuava a
resolver certo — o `escolher()` desempata por `prefix`/`suffix` e a verdadeira pontua 4 contra
0 —, mas a margem caía de «ocorrência única, trivialmente segura» para «depende do desempate».
A legenda foi reescrita para **«el ruido respiratorio normal»**, e a contagem voltou a
**1 ocorrência**. Nenhuma das 73 muda de número de ocorrências com o patch final.

**Zero escritas no banco.** Só `SELECT` de `md5()`/`length()`.

### Estrutura e antirregressão

```
                          antes   depois
HTML balanceado              OK       OK
ids                          22       22   (+0)
ids duplicados                0        0   (+0)
âncoras mortas                0        0   (+0)
imagens inexistentes          0        0   (+0)
quiz-item                   192      192   (+0)
section[id] (block_id)       14       14   (+0)
figure / figcaption      34 / 34  38 / 38  (+4)
imgs semio2 referenciadas    44       48   (+4)
```

0 questões perdidas · 0 gabaritos tocados · 0 flashcards perdidos · 0 `block_id` alterado ·
0 asset antigo apagado.

### Navegador — 390 / 768 / 1024 / 1440

Site real servido do disco, matéria aberta pela navegação normal:

```
                      390    768   1024   1440
secções                14     14     14     14
quiz-item             192    192    192    192
figure/figcaption    38/38  38/38  38/38  38/38
.s2-photo sem URL       0      0      0      0
ids duplicados          0      0      0      0
overflow horizontal    não    não    não    não
HTTP >= 400             0      0      0      0
```

Os **5 assets carregam** nas quatro larguras, com o tamanho exato do arquivo
(161 622 · 188 998 · 194 784 · 131 606 · 104 234 bytes).

**Uma ressalva honesta:** a 390 px o navegador reporta 8 elementos de **tabela**
(`TABLE/THEAD/TR/TH/TBODY/TD/EM/STRONG`) que excedem a largura da janela. Rodei a mesma
medição na **versão sem o patch** e o resultado é **idêntico: os mesmos 8**. É comportamento
**preexistente** das tabelas da matéria, que rolam dentro do próprio contêiner — o documento
não ganha rolagem horizontal (`docW == clientW`). **O patch não acrescenta nenhum.**

Os `ERR_FAILED` do console são do harness (`/assets/logo-video.mp4` não existe na cópia
servida) e aparecem igualmente na versão sem patch.

---

## O diff verificado, na íntegra

```diff
--- semiologia-ii.html (main)
+++ semiologia-ii.html (com os 5 assets)
@@ -45,5 +45,5 @@
 #tab-semio2 .s2-i2{background-image:url(/assets/img/semio2/02-disnea-posicion-mmrc-mapa-clinico.webp)}
 #tab-semio2 .s2-i3{background-image:url(/assets/img/semio2/03-hemoptisis-pleura-cianosis-diferenciales.webp)}
-#tab-semio2 .s2-i4{background-image:url(/assets/img/semio2/04-bronquitis-aguda-mecanismo-detallado.webp)}
+#tab-semio2 .s2-i4{background-image:url(/assets/img/semio2/semio2-b02-01-bronquitis-aguda.webp)}
 #tab-semio2 .s2-i5{background-image:url(/assets/img/semio2/05-bronquitis-aguda-cronica-neumonia-diferencias.webp)}
 #tab-semio2 .s2-i6{background-image:url(/assets/img/semio2/06-tos-infecciosa-ruta-clinica.webp)}
@@ -86,4 +86,8 @@
 #tab-semio2 .s2-i43{background-image:url(/assets/img/semio2/03-ippa-auscultacion.webp)}
 #tab-semio2 .s2-i44{background-image:url(/assets/img/semio2/04-examen-confirma-apoya.webp)}
+#tab-semio2 .s2-i45{background-image:url(/assets/img/semio2/semio2-b01-03-hemoptisis-cianosis.webp)}
+#tab-semio2 .s2-i46{background-image:url(/assets/img/semio2/semio2-b01-04-ruidos-respiratorios.webp)}
+#tab-semio2 .s2-i47{background-image:url(/assets/img/semio2/semio2-b03-01-enfisema-radiografia.webp)}
+#tab-semio2 .s2-i48{background-image:url(/assets/img/semio2/semio2-b04-03-curb65-gravedad.webp)}
 </style>
 
@@ -732,5 +736,12 @@
   </div>
 
-  <div class="audio-player">
+  
+
+<figure class="s2-fig">
+  <div class="s2-photo s2-i46" role="img" aria-label="Origen anatómico de los ruidos respiratorios: roncus, sibilancias, crepitantes y frote pleural"></div>
+  <figcaption><b>&iquest;Dónde nace cada ruido? Véalo antes de escucharlo</b> — Ubique el origen antes de poner el estetoscopio. <b>Roncus</b>: bronquios grandes con secreción, tono grave, <b>cambian o desaparecen al toser</b>. <b>Sibilancias</b>: vía pequeña estrechada, tono agudo, predominio espiratorio. <b>Crepitantes</b>: alvéolos, finos, al final de la inspiración. <b>Frote pleural</b>: pleuras inflamadas, se oye en <b>las dos fases</b>. La regla que ordena todo: cuanto más proximal, más grave; cuanto más alveolar, más fino.
+  <p class="s2-trap">&#9888; <b>Ojo:</b> el ruido respiratorio normal ocupa casi toda la inspiración y solo el <b>comienzo</b> de la espiración. Si se oye durante toda la espiración, ya no es normal.</p></figcaption>
+</figure>
+<div class="audio-player">
     <div class="audio-player-info">
       <div class="audio-player-label">&#128266; MURMULLO VESICULAR NORMAL</div>
@@ -1006,4 +1017,11 @@
     <p class="s2-trap">&#9888; <b>Ojo:</b> Hacen falta unos 5 g/dL de hemoglobina reducida para que la cianosis se vea. La anemia puede ocultarla; la policitemia la acentúa.</p></figcaption>
 </figure>
+
+<figure class="s2-fig">
+  <div class="s2-photo s2-i45" role="img" aria-label="Hemoptisis frente a hematemesis y cianosis central frente a periférica"></div>
+  <figcaption><b>Sangre y color: los dos pares, en detalle</b> — Amplía los dos pares que la figura anterior resume. <b>Hemoptisis</b>: sangre roja y espumosa, expulsada <b>con tos</b>, de pH alcalino (&asymp; 7,4 &ndash; 8,0), a veces con cosquilleo faringolaríngeo previo. <b>Hematemesis</b>: sangre oscura o en &laquo;borra de café&raquo;, precedida de <b>náuseas y vómito</b>, con restos alimentarios y pH ácido (&asymp; 1,0 &ndash; 3,0). Abajo, la cianosis: la <b>central</b> compromete lengua y mucosas, cursa con saturación arterial baja y <b>no mejora con el calor</b>; la <b>periférica</b> respeta las mucosas y <b>mejora al calentar</b>.
+  <p class="s2-trap">&#9888; <b>Ojo:</b> el panel de la <b>inervación pleural</b> sigue estando en la figura anterior, y es el que hay que recordar para el dolor: la pleura visceral y el parénquima pulmonar son insensibles.</p></figcaption>
+</figure>
+
 
 <h4>Clasificación del dolor torácico (según el material)</h4>
@@ -2046,4 +2064,11 @@
   <div class="key-box exam"><strong>Rx de tórax en EPOC:</strong> rectificación de las hemicúpulas diafragmáticas, hiperinsuflación, hipertransparencia pulmonar, "corazón en gota" y aumento de los espacios intercostales.</div>
 
+<figure class="s2-fig">
+  <div class="s2-photo s2-i47" role="img" aria-label="Radiografía normal frente a enfisema, de frente y de perfil, con siete signos numerados"></div>
+  <figcaption><b>Normal frente a enfisema, con los siete signos numerados</b> — Es la comparación que el recuadro de arriba describe en palabras, ahora sobre las placas. De <b>frente</b>: radiolucidez aumentada, costillas <b>horizontalizadas</b>, espacios intercostales aumentados, diafragma <b>bajo y aplanado</b>, silueta cardíaca estrecha y vertical &laquo;en gota&raquo; y trama vascular reducida. De <b>perfil</b>, el signo que solo el lateral muestra: <b>espacio retroesternal &gt; 2,5 cm</b>.
+  <p class="s2-trap">&#9888; <b>Ojo:</b> la radiografía <b>apoya</b> el enfisema; <b>no</b> lo confirma. La EPOC se confirma con <b>VEF&#8321;/CVF post-broncodilatador &lt; 0,70</b>.</p></figcaption>
+</figure>
+
+
   
   <div class="material-slide">
@@ -2778,4 +2803,11 @@
   </div>
   <h3>Escore CURB-65 / CRB-65</h3>
+
+<figure class="s2-fig">
+  <div class="s2-photo s2-i48" role="img" aria-label="Los cinco criterios del CURB-65 y la decisión de destino según el puntaje"></div>
+  <figcaption><b>CURB-65, criterio por criterio</b> — Un punto por ítem: <b>C</b>onfusión &middot; <b>U</b>rea &gt; 7 mmol/L &middot; frecuencia <b>R</b>espiratoria &ge; 30/min &middot; <b>B</b>lood pressure, PAS &lt; 90 o PAD &le; 60 mmHg &middot; <b>65</b> años o más. Después, el destino: <b>0&ndash;1</b> bajo riesgo, manejo ambulatorio si el contexto lo permite; <b>2</b> valorar hospitalización; <b>&ge; 3</b> neumonía grave.
+  <p class="s2-trap">&#9888; <b>Ojo:</b> el CURB-65 <b>no mide oxigenación</b> &mdash; revise siempre la SpO&#8322; &mdash; y no reemplaza el juicio clínico.</p></figcaption>
+</figure>
+
   <p>Es un <strong>escore que ayuda a decidir entre dar el alta o internar</strong> al paciente con neumonía. Cada ítem suma 1 punto:</p>
 <figure class="s2-fig">
```

---

## Como reaplicar se o arquivo tiver mudado

1. Conferir que cada âncora da tabela acima aparece **exatamente uma vez**.
2. Aplicar na ordem: CSS primeiro, depois as quatro inserções.
3. Rodar de novo a verificação de annotation-safety — **é obrigatória**, porque qualquer
   palavra nova numa legenda pode colidir com uma das 73 marcações, como aconteceu comigo.
   O que corre é: portar `indexar()`/`escolher()`, reconstruir as 73 por hash e comparar o
   contexto de 40 caracteres dos dois lados.
4. Conferir `figure` 34 → 38 e `imgs semio2` 44 → 48, e que `quiz-item` continua **192**.
