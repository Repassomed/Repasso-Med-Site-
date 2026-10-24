# Embriología — revisão editorial (2026-10) · fonte → decisão → destino

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/embriologia.html` (slug de grifos `embriologia`).

**Revisão editorial** com as fontes acessíveis. Embriología já tinha passado por quatro rodadas anteriores (ciência conferida com a cátedra, voz G0, rótulos «EN EXAMEN» → «CLAVE» nas figuras, ovogénesis); esta rodada confirma o que continua válido e corrige o que restava.

## 1. Fontes acessíveis (Drive, pasta «Embriologia»)

| Fonte | Cobre |
|---|---|
| `Slides/ilovepdf_merged.pdf` (apostila da cátedra, ~210 mil caracteres) | Introducción, mitosis, meiosis, gametogénesis, ciclo sexual, fecundación, semanas 1–8, período fetal; números-chave (ovócitos: «~2 millones en la etapa embrionaria, ~400.000 al nacimiento, ~400–500 ovulan»; neuroporos dia 25/28; latido na 4.ª semana; ovulação dia 14; FSH dias 5–14; progesterona dias 14–21) |
| `Questões/Confirmar respostas, questão 8 é a B.pdf` (prova + anotações) | 20 perguntas de prova (ciclo sexual, meiose, ovogénesis); coincidem com as perguntas «Basada en preguntas de examen» do banco |
| Langman / Moore | Citados na apostila; **não lidos** |

## 2. Achados → decisões → destino

| # | Achado | Decisão | Destino |
|---|---|---|---|
| 1 | Cobertura: nos blocos 01–13, as respostas de 62 perguntas de múltipla escolha avaliáveis têm o assunto ensinado antes no próprio bloco (teste lexical: 0 com cobertura baixa). As 107 do banco repetem as dos blocos | Sem mudança | — |
| 2 | Opções de uma pergunta de prova com português e erro de digitação: «principalemente», «que es liberado», «dia 05» | «Estrógeno, liberado principalmente del día 5 al 14», «Progesterona, liberada principalmente del día 14 al 21», etc. (4 opções × bloco e banco). Resposta e letra iguais | pergunta «hormona del endometrio» (bloco 06 + banco) |
| 3 | Duas tarjetas «Semana 7» (bloco 11 e banco) quase iguais, e uma dizia «se separan los dedos» enquanto a figura b11_02, o texto do bloco e a apostila dizem semana 7 = **começo** da apoptose interdigital, semana 8 = dedos separados | Nenhuma tarjeta removida: a imprecisa foi reescrita («rayos digitales … escotaduras … empieza la apoptosis interdigital; terminan de separarse en la semana 8») e a outra ficou. Tabela «semana 7» alinhada | bloco 11, banco de tarjetas |
| 4 | Frase «que es lo que pregunta el enunciado» (fala da prova) e outras frases parecidas («si el enunciado dice», «pregunta muy limpia de hacer», «se piden con nombre propio», «el pie contrapone»), mais as notas «otros materiales / otros textos» sem fonte | Explicação direta do conteúdo (somáticas × sexuais: tecidos e órgãos × reprodução); frases de prova reescritas; atribuições a outros textos retiradas (variantes de grafia sem atribuição; cifras de ovócitos só como ordem de grandeza da cátedra) | bloco 01 + banco, blocos de mitose, fecundação e ovócitos |
| 5 | Rótulos «Basada en preguntas de examen»: são a etiqueta oficial da lei 8-A.4 | Mantidos | — |
| 6 | **Figuras** (39 referenciadas; todas vistas uma a uma): títulos de cartões ilegíveis ou sobrepostos | **Retocadas** (nenhuma removida): `emb_b05_03` (3 títulos tachados), `emb_b06_01` (texto sobreposto «progesterona»/«Estrógeno»), `emb_b06_02` (títulos ilegíveis sobre a imagem), `emb_b07_02` (títulos de 4 pastilhas ilegíveis) | assets/img/embrio |

## 3. Contagens antes → depois (conferidas por mim)

| Item | Antes | Depois |
|---|---|---|
| Perguntas | 214 | 214 |
| Alternativas | 754 | 754 |
| Letras de gabarito | idênticas | idênticas |
| «Ver respuesta» | 202 | 202 |
| Imagens referenciadas | 39 | 39 |
| IDs | 18 | 18 |
| Tarjetas | 298 | 298 (nenhuma removida; 2 reescritas) |
| Banco espelhado | 107 = 107 perguntas; 149 = 149 tarjetas | igual |

## 4. Grifos

Consulta somente leitura ao Supabase: **0 grifos** para `embriologia` (nenhum aluno marcou texto). Nenhuma escrita.

## 5. Navegador (390 e 1280 px)

39/39 imagens carregam, sem rolagem horizontal, «Ver respuesta» abre em 4/4 blocos testados (01, 05, 08, 11), 298 cartões, sem erros de JS.

## 6. Observações das figuras (sem alteração)

- Rótulos que tocam a imagem sem prejudicar a leitura: `b09_02` (DÍA 8/9/10-11 sobre a borda), `b10_02` (títulos dos 4 passos sobre o cartão), `b11_03`, `b12_01`, `b13_02` (texto da legenda sobre a ilustração).
- Todas as figuras em castelhano; nenhuma em português. Nenhum rótulo de «EN EXAMEN» restante.

## 7. Pendências / revisão humana

1. Langman e Moore não lidos; as cifras de ovócitos continuam como «orden de magnitud» (≈2 milhões na etapa embrionária, ≈400.000 ao nascer, ≈400 ovulam), com a nota de que outros textos dão 1–2 milhões ao nascer.
2. As perguntas «Basada en preguntas de examen» vêm de uma prova com anotações manuscritas parcialmente ilegíveis; as letras foram mantidas como estavam.
3. Retoques de figura são tipográficos (títulos), sem mudança de conteúdo científico.
