# Anatomía Patológica II Práctica · grande revisão (24–25/11/2026) · matriz de fontes e decisões

Executor: Claude 2 · Base: `main` `c288d1a5` · Branch `claude/ap2p-revisao-integral`.
Página: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/anatomia-patologica-ii-practica.html` (blocos `ap2pb01–ap2pb23`, banco, mazo e cierre).
Reprodutível: `python3 tools/qa/ap2p-revisao/construir.py` aplica TODA a revisão sobre o HTML original (o teste estático prova que o arquivo atual = original + script).
**Nada foi ativado, publicado, mesclado nem escrito no banco.** Consultas ao Supabase: só `SELECT` de contagem (ver §9).

## 1 · Pastas reais do Drive (confirmadas por busca e listagem)

Caminho: Site Repasso Med → Biblioteca → 6.º semestre → **«Anatopatologia II Pratica»** (id `1mMedL4e45FtXaV_woIatSTrRzLZIYUP-`; **a pasta não leva acento nem «Prática»**).
- **«Slides atualizados»** (id `1DZ-byFl-xBo4R20lyh5Akm4fRmkxK1u7`): PDFs `01–04`, `07–16` numerados e, **sem número**, `Gastrite cronica_260825…` e `Adenocarcinoma gastrico_260825…`, mais `ANP II - LAMINÁRIO P1…`, `Láminas Anatopato 6D - P1` e `- P2`.
- **«Laminas»** (id `14VOr7lZbEGU6bUhfxuB9VfOhtelOezeG`): **16 fotos JPEG** (24/11) + os **dois documentos novos** (`laminário_261110_132914.pdf` = «A», `laminário - 2_260728_225030.pdf` = «B») + PDFs antigos (`Laminas Anatopato II - Practica P1`, `Anatopato II pratica - Final`, `- P2`, `Lâminas Anatopato P1.`).

## 2 · O que foi aberto e o que NÃO foi (limites reais)

| Fonte | Estado |
|---|---|
| Slides `01, 02, 03, 04, 07, 08, 13, 14` + `Gastrite crónica` + `Adenocarcinoma gástrico` | **Texto lido hoje** (`read_file_content`: OCR de slides com anotações manuscritas). |
| Slides `09, 10, 11, 12` | **Não reabertos hoje.** Conteúdo conferido nas rodadas de 24/10 (cópia compactada que José subiu) e já refletido nos blocos 10–14; mantidos sem alteração. |
| Slides `15` (Nefroblastoma) e `16` (Pielonefritis crónica) | **Identificação e ordem confirmadas pelos NOMES dos arquivos** (`15 - Nefroblastoma…`, `16 - Pielonefritis cronica…`) e pela leitura de 19/11 (pack `…final-rim`); não reabertos hoje. |
| **Imagens dos PDFs de slides** | **NÃO abertas.** O conector só entrega arquivos < 10 MB e vários slides têm 11–18 MB (02, 04, 07, 08, 10, 11, 13, 16…); mesmo nos menores o conector devolve texto, não as páginas como imagem. Nenhuma imagem de slide foi usada nesta rodada. |
| Documento **A** (`laminário_261110`, 50 MB) | **Texto lido das págs. 1–5** (a extração terminou no início da pág. 6; **págs. 6 em diante: sem texto extraível — NÃO lidas**). **Imagens: não abertas** (50 MB). |
| Documento **B** (`laminário - 2`, 44 MB) | **Texto lido das págs. 1–7 completo.** **Imagens: não abertas.** |
| **16 fotos JPEG** | **Todas baixadas, VISTAS uma a uma** e salvas (recorte quadrado do campo circular, webp). Identificação **só pelo nome do arquivo**. |
| `Láminas Anatopato 6D - P1/P2`, `ANP II - LAMINÁRIO P1`, `Laminas … P1`, `… Final`, `… P2`, `Lâminas P1.` | **Não reabertos hoje** (já usados nas rodadas de 24/10 e 19/11; ver packs `…parcial2` e `…final-rim`). |
| **Literatura-base de anatomia patológica** | **Não disponível no projeto/Drive em tamanho legível** (Robbins, 440 MB, não baixa). Nada foi confirmado em livro; **nenhuma fonte externa foi usada**. |

## 3 · Ordem dos slides (pedido de José) e discrepância com o site

Ordem pelos **arquivos**: 01 Ca epidermoide de língua · 02 Adenoma pleomorfo de parótida · 03 Adenocarcinoma esofágico · 04 Ca epidermoide de esôfago · (**05 e 06 sem número no arquivo:** `Gastrite crónica` e `Adenocarcinoma gástrico`, identificados por conteúdo e por serem os únicos slides do estômago) · 07 Cirrose · 08 CHC · 09 Duodenite crónica · 10 Crohn · 11 Apendicite aguda · 12 Adenocarcinoma de cólon · **13 Câncer de pâncreas · 14 Pancreatite crónica** · 15 Nefroblastoma · 16 Pielonefrite crónica.

Site (`ap2pb01–18`, 18 blocos): gástrico e cólon aparecem **desdobrados em 2** (difuso/intestinal; mucinoso/não mucinoso) e, **nos blocos 15 e 16, a pancreatite crónica vem ANTES do adenocarcinoma de pâncreas — ordem INVERSA à dos slides (13 = câncer, 14 = pancreatite)**.
**Decisão:** NÃO reordenar. Os ids `ap2pb15/16` carregam âncoras, vinhetas, o tema da Nova Era (`cap = ((n−1) mod 6)+1`) e marcações potenciais de alunos; trocar a ordem mexeria nos ids ou duplicaria o conteúdo. Registrado como **pendência de decisão de José** (se quiser a ordem dos slides, é uma tarefa própria com migração de âncoras).

## 4 · Matriz por slide → bloco → o que entrou

| Slide | Tema | Bloco do site | Texto lido hoje | Mudança nesta rodada |
|---|---|---|---|---|
| 01 | Ca epidermoide de língua | 01 | ✅ | Nenhuma de conteúdo; glossário em toda a matéria |
| 02 | Adenoma pleomorfo | 02 | ✅ | **+1 foto com atlas (4 pontos)** + ficha oficial do doc B; glossário |
| 03 | Adenocarcinoma esofágico | 03 | ✅ | **+2 fotos** (1 com atlas de 3 pontos; 1 sem pontos, baixa definição) + ficha; glossário |
| 04 | Ca epidermoide de esôfago | 04 | ✅ | Glossário (sem foto nova) |
| 05* | Gastrite crónica | 05 | ✅ | **+1 foto com atlas (3)** + ficha; glossário |
| 06* | Adenocarcinoma gástrico (difuso e intestinal) | 06 e 07 | ✅ | Bloco 07: **+1 foto com atlas (3)** + ficha; glossário |
| 07 | Cirrose hepática | 08 | ✅ | Glossário |
| 08 | CHC | 09 | ✅ | **+1 foto (sem pontos)** + ficha; glossário |
| 09 | Duodenite crónica | 10 | — (conferido em 24/10) | **+1 foto com atlas (3)** + ficha; glossário |
| 10 | Crohn | 11 | — | **+1 foto com atlas (4)** + ficha; glossário |
| 11 | Apendicite aguda | 12 | — | Glossário (sem foto nova) |
| 12 | Adenocarcinoma de cólon | 13 e 14 | — | Bloco 13: **+1 foto com atlas (4)** + ficha (subtipo da foto NÃO especificado); glossário |
| 13 | Câncer de páncreas | 16 | ✅ | **Conteúdo novo:** quadro «em uma olhada», genes (KRAS, p16/CDKN2A, SMAD4, TP53, BRCA2), PanIN, localização, fatores de risco, macro/micro; **+1 foto** (sem pontos); advertência «só ficha» corrigida |
| 14 | Pancreatite crónica | 15 | ✅ | **Conteúdo novo:** causas, genes (PRSS1, SPINK1, CFTR, CPA1/CEL, IgG4), quadro achado→consequência, caso; **+1 foto** (sem pontos); advertência corrigida |
| 15 | Nefroblastoma | 17 | por nome | **+1 foto** (sem pontos) + ficha |
| 16 | Pielonefrite crónica | 18 | por nome | **+1 foto com atlas (3)** + ficha |

## 5 · Fotos da pasta «Laminas» (16): arquivo → identificação → destino → situação

Todas: foto de celular de campo circular de microscópio, sem escala nem aumento; **identificação = nome do arquivo**. Recorte quadrado em `assets/img/anatoprat2/lam-fotos-<slug>.webp` (≤ 777 px, ≤ 127 KB).

| Arquivo | Dx (pelo nome) | Destino | Situação |
|---|---|---|---|
| tumor de wilms - nefroblastoma | Nefroblastoma | bloco 17 | **Utilizada** (vista, sem pontos: 3 componentes não delimitáveis) |
| Tumor mixto de glandula salival (2) | Adenoma pleomorfo | bloco 02 | **Utilizada + atlas 4 pontos** (parótida normal, cápsula, estroma mixoide, luzes ductais) |
| Adenocarcinoma de esofago 2 | Adenocarcinoma esofágico | bloco 03 | **Utilizada + atlas 3 pontos** |
| Adenocarcinoma de esofago | Adenocarcinoma esofágico | bloco 03 | **Utilizada sem pontos** (baixa definição; não se atribuem estruturas) |
| Gastrite cronica | Gastrite crónica | bloco 05 | **Utilizada + atlas 3 pontos** |
| Carcinoma papilar de  tiroides | Ca papilar de tireoide | **bloco 20 (novo)** | **Utilizada + atlas 3 pontos**; núcleos NÃO se resolvem |
| Hepatocarcinoma | CHC | bloco 09 | **Utilizada sem pontos** (baixo detalhe) |
| Adenocarcinoma gastrico do tipo intestinal | Adenoca gástrico intestinal | bloco 07 | **Utilizada + atlas 3 pontos** |
| Duodenitis cronica | Duodenite crónica | bloco 10 | **Utilizada + atlas 3 pontos** |
| Enfermidad de cronh | Crohn | bloco 11 | **Utilizada + atlas 4 pontos** |
| Pancreatitis Cronica | Pancreatite crónica | bloco 15 | **Utilizada sem pontos** (artefato óptico nas bordas) |
| Adenocarcinoma de pancreas | Adenoca de páncreas | bloco 16 | **Utilizada sem pontos** (baixo contraste) |
| Pielonefritis cronica | Pielonefrite crónica | bloco 18 | **Utilizada + atlas 3 pontos** |
| Tiroides de Hashimoto | Tireoidite de Hashimoto | **bloco 19 (novo)** | **Utilizada + atlas 3 pontos** |
| Codiloma acuminado | Condiloma acuminado | **bloco 22 (novo)** | **Utilizada + atlas 4 pontos** (grafia do arquivo anotada) |
| Adenocarcinoma de colon | Adenoca de cólon | bloco 13 | **Utilizada + atlas 4 pontos**; **subtipo (mucinoso ou não) NÃO consta do nome**: usada como vista geral, sem ensinar mucina nem necrose |

**Atlas interativos novos: 11, com 37 pontos.** Cada ponto foi colocado olhando a imagem (coordenadas em % do recorte quadrado) e a explicação diz o que aparece **e o que não se resolve** naquele aumento. Teste de navegador: os 37 abrem legenda, explicação e zoom; nenhum par de pontos se sobrepõe. Pontos que dependem de interpretação (p. ex. «hendidura» no Crohn) estão escritos como «compatível com».
**Imagens existentes preservadas:** nenhuma removida (110 fontes de imagem antes → 126 agora; 338 → 365 tags `<img>`; as 27 novas são 16 fotos + 11 imagens de zoom do atlas).

## 6 · Documentos A e B: página a página → destino

| Doc/pág. | Láminas | Destino |
|---|---|---|
| A p.1 | Atrofia testicular · Hipertrofia cardíaca · HPB · Bocio coloide · Esôfago de Barrett | Atrofia e HPB → **bloco 23**; bocio → **bloco 19**; hipertrofia cardíaca e Barrett → **fora da sequência pedida** (AP I Práctica já os tem) |
| A p.2 | IAM · Pulmão (TB) · Pancreatite aguda · Colesterolose · Pele (melanoma) | Melanoma → **bloco 22** (com ressalva de fonte); demais → fora da sequência |
| A p.3 | Esteatose · Aterosclerose · Pneumonia em resolução · Apendicite aguda · Orquite | Orquite → **bloco 23**; apendicite → já no bloco 12; demais fora |
| A p.4 | Cirrose · Pielonefrite crónica · Hashimoto · Gastrite · Duodenite | Cirrose, pielonefrite, gastrite, duodenite → fichas oficiais nos blocos 08*/18/05/10; Hashimoto → **bloco 19** |
| A p.5 | Pancreatite crónica · Endometriose · Cervicite crónica · Mastite granulomatosa · Crohn | Pancreatite e Crohn → blocos 15/11; endometriose, cervicite, mastite → **bloco 21** |
| A p.6 em diante | — | **NÃO lidas** (sem texto extraível) |
| B p.1 | Lipoma · Leiomioma · Teratoma testicular · Teratoma ovárico · Hemangioma | Lipoma, hemangioma → **bloco 22**; leiomioma, teratoma ovárico → **bloco 21**; teratoma testicular → **bloco 23** |
| B p.2 | Adenoma pleomorfo · Adenoma folicular · Condiloma · Adenoma tubular de cólon · Cistoadenoma mucinoso | Pleomorfo → bloco 02; adenoma folicular → **bloco 19**; condiloma → **bloco 22**; adenoma tubular → **fora da sequência** (sem bloco); cistoadenoma → **bloco 21** |
| B p.3 | Ca escamoso de pele · de língua · de esôfago · Adenoca esofágico · Gástrico difuso | Pele → **bloco 22**; língua/esôfago/esofágico/gástrico → blocos 01/04/03/06 |
| B p.4 | Gástrico intestinal · CHC · Adenoca de páncreas · Colon mucosecretante · Colon não mucosecretante | Blocos 07/09/16/14/13 |
| B p.5 | Wilms · Ca papilar · Ca medular · CDIS · Ca ductal invasivo | Wilms → 17; papilar/medular → **bloco 20**; CDIS/invasivo → **bloco 21** |
| B p.6 | Ca escamoso de cérvix · Adenoca de próstata · Leiomiossarcoma · **Liposarcoma (ficha EM BRANCO)** · Seminoma | Cérvix, leiomiossarcoma → **bloco 21**; próstata, seminoma → **bloco 23**; liposarcoma → **bloco 22 como PENDENTE** (sem descrição) |
| B p.7 | Carcinoma epidermoide (sic) de células pequenas de pulmão | **Fora da sequência pedida** (pulmão): pendente de decisão de José |

**Discrepâncias de fonte encontradas e registradas na página (não escondidas):** (a) doc A p.2, pulmão: a descrição da «tuberculose» fala de miocardiócitos (texto copiado de outra lámina) → não usada; (b) doc B p.1: teratoma testicular listado entre benignas mas descrito com «alta malignidade» → pendente (bloco 23); (c) doc A p.3: orquite rotulada «aguda» com predomínio linfoplasmocitário → pendente (bloco 23); (d) doc A p.2: melanoma sem descrição de atipia → pendente (bloco 22); (e) doc B p.1: hemangioma com «epitélio plano simples» → termo pendente; (f) doc B p.5: «plegamento da membrana celular» (carcinoma papilar) → pendente; (g) doc B p.6: liposarcoma vazio.

## 7 · O que foi feito por etapa

**Etapa 2–3 (conteúdo e organização).** Cada lámina nova segue: **Área → Órgão → Processo → Descrição oficial (adaptada em bullets com negrito nos achados) → Diagnóstico → «Qué buscar» → «Lo más característico» → vistas/atlas**, com **quadro comparativo** no início do bloco. Para os 12 blocos existentes que receberam foto, a ficha oficial do documento novo entrou na mesma ordem. **Sintetizado:** nos blocos 19–23 todo o conteúdo é a descrição oficial em bullets + comparativo (nada maior que o documento). **Não reescritos nesta rodada:** o texto de ensino dos blocos 01–14, 17 e 18 (já têm «Desde cero», ficha, lámina em detalhe, casos e perguntas); a re-síntese integral desses blocos fica como **continuação** (§10), para não alterar de uma vez ensino, perguntas e âncoras.
**Blocos 15 e 16:** as advertências «só há a ficha» ficaram desatualizadas com os slides 14 e 13 e foram **corrigidas**; entram quadros «em uma olhada» e «o que a diapositiva atualizada agrega».
**Etapa 6 (depois da 16).** Novos blocos: **19 Tireoide · doenças (3 láminas)** · **20 Tireoide · cânceres (2)** · **21 Reprodutor feminino (10: cérvix, trompa, útero, ovário, mama)** · **22 Pele e partes moles (6)** · **23 Reprodutor masculino (6)** = **27 láminas**. **Sem perguntas nem flashcards inventados** (faltam os slides teóricos); cada bloco termina com «Qué falta de los próximos materiales».
**Etapa 5 (glossário).** **295 termos clicáveis** (19 que já existiam + 276 novos), **69 termos distintos**, definição curta e única por termo em toda a matéria; no máx. 2 aparições por termo e bloco, **fora** de perguntas, respostas, flashcards, títulos, legendas e atlas, sem aninhar. Incluídos os pedidos por José que aparecem no material: pérola de queratina, conteúdo/estroma mixoide, linitis plástica, intraepitelial, granuloma, granuloma não caseificante, necrose caseosa (só aparece «necrosis caseosa»), além de coilocitos, desmoplasia, metaplasia, displasia, tiroidização, psamoma, vidro esmerilado, centro germinativo, cribiforme, fila india, etc. «Coroa linfocitária» e «necrose caseificante» **não aparecem** no material, então não receberam marcação (há «halo/corona de linfocitos» e «necrosis caseosa»).

## 8 · Nova Era (integração) — registrada e testada, nada ativado

- `rm-materia-sistema.js`: `clasificarAP2P` aceita agora `ap2pb01–ap2pb23` (`cap = ((n−1) mod 6)+1`); blocos **21 e 23 sem vinheta** (`vig: null` → logotipo) porque não há foto identificada; vinhetas **`vb-19`, `vb-20`, `vb-22`** (480×480, recortes das fotos de Hashimoto, carcinoma papilar e condiloma).
- `VER` do `rm-pilot.js` e a tag do `index.html` **NÃO foram alterados** (as PRs #710 e #711 também mexeram nesse arquivo sem bump); o bump coordenado fica para o momento da ativação. **Matéria continua só em `CANDIDATAS`; quem libera é `rm_materia_rollout`.**
- `temas-ap2p.test.cjs` atualizado para 23 blocos (`esperado`, `nBlocos`, `semVig`).

## 9 · Marcações dos alunos (Supabase SOMENTE LEITURA, 24/11)

`SELECT count` em `user_highlights` (por `subject_slug` e por `block_id like 'ap2p%'`), `user_notes` e `user_ink_strokes` (por `subject_slug`): **0 linhas** em todas. Nada escrito. Como não há marcações, nenhuma âncora existente pode ser afetada; **mesmo assim** todo o conteúdo novo entrou no fim de cada bloco (antes das perguntas) e os blocos 01–18, banco e mazo foram verificados byte a byte (§11).

## 10 · Pendências e plano de continuidade

1. **Slides teóricos de tireoide, reprodutor feminino (incl. mama e ovário), pele e reprodutor masculino** (José vai enviar): cada bloco 19–23 tem a estrutura pronta e a lista «Qué falta». Plano: (a) comparar o slide com a ficha do bloco; (b) acrescentar «Desde cero», genes, clínica e tratamento curto **só do que o slide trouxer**; (c) criar perguntas e flashcards conforme a lei 8-A (o resumo ensina antes); (d) conferir os pontos do atlas quando chegarem fotos melhores.
2. **Fotos**: faltam as imagens identificadas de 24 das 27 láminas novas (só Hashimoto, papilar e condiloma têm). Os blocos dizem isso na própria lámina.
3. **Imagens dos slides 1–16**: não abertas (limite de 10 MB do conector); se José subir cópias compactadas, as vistas macroscópicas e microscópicas podem entrar.
4. **Ordem 13/14 vs 15/16** (§3) e **lámina do pulmão, adenoma tubular, apendicite/cirrose duplicadas**: decisão de José.
5. **Fichas com discrepância** (§6, a–g): confirmar com a cátedra.
6. **Literatura-base** não acessível: genes e percentuais das diapositivas 13/14 vêm só das diapositivas; o percentual «50–70 %» (TP53/BRCA2) ficou **sem cifra** por ambiguidade.
7. **Re-síntese dos blocos 01–14, 17, 18** (ensino mais curto, comparativos novos): próxima rodada, bloco a bloco, com consulta a marcações antes de cada edição.
8. **Perguntas novas** para os 5 blocos novos e para os casos clínicos dos slides 13/14 (5 MCQ do slide 14): próxima rodada de questões.

## 11 · Testes (resumo; resultados no Cartão de Merge da PR)

`tools/qa/ap2p-revisao/ap2p-revisao.test.py` (estático): reprodutibilidade do HTML, texto idêntico sem os glossários, ids preservados, perguntas e flashcards dos blocos 01–18 idênticos, banco e mazo idênticos byte a byte, glossário (sem aninhar, uma definição por termo), fotos (quadradas, ≤ 200 KB), atlas (pontos numerados, coordenadas, textos em texto plano), blocos 19–23 (estrutura, diagnósticos como no documento, discrepâncias visíveis).
`tools/qa/ap2p-revisao/ap2p-revisao-browser.cjs` (Chromium, 1440/820/390): imagens carregam, 37 pontos de atlas abrem legenda/explicação/zoom, ampliar vistas, **cada um dos 295 termos abre e fecha a nota dentro da tela**, sem erros nem escrita.
Além disso: `temas-ap2p`, `real-ap2p`, `integracao-ap2p`, `ap2p-final-b17-b18`, `quiz.test.cjs`, porta `anatomia-patologica-ii-practica`, `nao-ativacao`, Guard.

## 12 · Rodada «entrega completa» (25/11/2026) — acesso, imagens, editorial, registros

**Acesso (a→c).** Os PDFs < 10 MB foram baixados e examinados localmente (texto por página + imagens extraídas): `Anatopato II pratica - Final.pdf` (15 pág., **39 fotos**, fichas oficiais), `…P2.pdf` (41 fotos; só o adenoma tubular, pág. 4, aproveitado), slide 14 (pancreatite), laminários P1/slides 01/03/09/12/15/gastrite. Descoberta: o laminario **Final** traz fichas + fotos oficiais de tireoide, ginecologia, mama, mola, celíaca, Crohn, pâncreas. Documentos A e B: só **texto** (truncado); suas imagens e as páginas além do texto **não foram vistas**. Arquivos ≥ 10 MB (conector recusa; drive.google.com bloqueado pelo proxy): **não abertos** — José precisa fornecer PDF dividido ou imagens soltas (ver pendências).

**Imagens.** +36 vistas `lam-final-*`, +2 `lam-final-pancreatitis-s14-*`, +3 `lam-p2-adenoma-tubular-*`. Fundo neutro: o exterior preto do campo circular foi tornado transparente **somente** quando o contorno era um círculo limpo (máscara com verificação de IoU/preenchimento); nas demais fotos manteve-se o original. As 16 fotos do telefone foram reprocessadas igual; **nenhum pixel interno do tecido foi alterado**. Atlas: 11 → **19**; cada ponto conferido a olho sobre a imagem final (2 pontos reposicionados após o reprocessamento: cápsula da parótida e fundo microfolicular).
Por tema: tireoide (bocio, Hashimoto, adenoma folicular, papilar: 2–4 vistas + atlas), ginecologia (endometriose, leiomioma, condiloma→vulva, ca. escamoso de colo, **mola hidatiforme nova**), mama (CDIS, infiltrante), digestivo (**celíaca nova** no bloco 10, Crohn íleo ×3, **adenoma tubular novo** no bloco 13, pancreatite ×5 + atlas, adenocarcinoma pâncreas ×2 + atlas).

**Editorial.** Cuadro «⚡ En una mirada» (condensa os 4 renglones oficiais da «consigna resuelta») nos blocos 01–14, 17, 18 (15/16 já tinham); coluna «Descripción en el laminario Final» nas fichas; glossário reaplicado (279 novas ocorrências, definição única por termo).

**Ordem dos blocos 15/16 (slides 13→14).** O site tem pancreatite (slide 14) antes de adenocarcinoma (slide 13). **Não reordenado**: o número do bloco aparece em títulos de perguntas, tabelas do banco, mazos e é lido pela Nova Era (vinheta `vb-NN`, capítulo). Trocar exigiria renumerar tudo e mover porções do banco; risco para marcações/consistência sem ganho didático. **Decisão pendente de José/coordenação.** Os cruzamentos «Se confunde con» já remetem um ao outro.

**Pulmão e adenoma tubular.** Adenoma tubular: ficha P2 pág. 4 + doc. B pág. 2 → lâmina nova nos blocos 13/14 (colon). Pulmão: não há ficha/foto identificada no material aberto → **sem lugar atribuído, nada inventado**; pendente.

**Fichas contraditórias / «fila india».** Doc. B e laminario Final (pág. 11) associam «fila india» ao carcinoma de mama invasivo (Final: «infiltrante»; B: «ductal invasivo»); a bibliografia habitual a associa ao **lobulillar**. Registrado como fonte, **não corrigido nem ensinado como regra**: pendente. Também: Final pág. 7 diz **vulva** para o condiloma (B diz «piel»); Final pág. 12 esclarece «fusão de ilhotas»; Final pág. 13 diz adenoca de páncreas «moderadamente diferenciado». Mantidos: melanoma sem atipia, orquitis aguda×linfoplasmocitária, teratoma benigno×«alta malignidade», liposarcoma vazio.

**Marcações dos alunos.** Supabase só leitura: 0 grifos/notas/traços nesta matéria; todos os ids/âncoras existentes preservados (teste de integridade do texto compara com a versão original sem glossário); novas seções entram antes de `quiz-section`/`ap2pbanco`.

**Cache.** `VER` em `rm-pilot.js`/`index.html` **não** foi alterado (arquivos críticos). Antes de ativar: subir `VER` (módulo `rm-materia-sistema.js` mudou) junto com a ativação, senão alunos com cache antigo veem `clasificarAP2P` sem os blocos 19–23.

## 13 · Rodada 25/11 (2) — arquivos NÃO abertos (nomes exatos), síntese dos blocos antigos, ordem 15/16

**Arquivos que não consegui abrir (Drive, pasta do semestre) e como José pode fornecer:**
| Arquivo | Tamanho | O que foi lido | Forma mais simples |
|---|---|---|---|
| `laminário_261110_132914.pdf` (doc. A) | 50 776 482 B | só texto, págs. 1–5; imagens e págs. 6+ não | dividir em partes de ≤ 8 MB (ex. 5 págs. cada) **ou** exportar as páginas como JPG |
| `laminário - 2_260728_225030.pdf` (doc. B) | 44 664 245 B | só texto, págs. 1–7; imagens não | idem |
| `Anatopato II - Resumo Final.pdf` | 61 882 064 B | **nada** | dividir em partes ≤ 8 MB |
| Slides teóricos 02, 04, 07, 08, 10, 11, 13, 16 (pasta «Slides atualizados») | 11–18 MB cada | só texto OCR dos que o conector devolveu | cada slide dividido em 2–3 PDFs ou imagens por slide |
Como dividir (qualquer PDF): iLovePDF/Smallpdf «Dividir PDF» por intervalos, ou «Imprimir → PDF» por faixas de páginas; enviar para a mesma pasta do Drive.
`Apunte Prova Final Anatopato II - Dra. Chamorro.pdf` (279 KB) abriu: são apuntes de aluno (fonte não autorizada como autoridade) e só cobrem boca/esôfago/estômago/fígado/pâncreas; **não** trazem tireoide, mama nem testículo; nada foi usado como fonte.

**«Fila india» × literatura-base:** o único material disponível confirma só a associação na ficha (doc. B pág. 5 e Final pág. 11). A literatura-base (Robbins, 440 MB) **não abre**; os apuntes não cobrem mama. Não há como resolver a divergência aqui: fica **pendente**, sem corrigir nem ensinar como regra.

**Síntese dos blocos antigos (01–14, 17, 18).** Feita dentro do que é seguro sem reescrever o ensino já revisado: cada bloco recebe agora duas tabelas no topo — «⚡ En una mirada» (4 renglones oficiais) e «🔎 Cómo reconocerla y con qué no confundirla» (copiadas tal cual do texto do próprio bloco). O corpo longo (concepto, causas, clínica, patogenia) **não foi reescrito**: exige os slides 02, 04, 07, 08, 10, 11, 13, 16 por inteiro (acima) e consulta de marcações antes de cada edição; ficam para a rodada com esses arquivos.

**Ordem 15/16 — impedimento técnico real e solução.** (1) O id (`ap2pb15/16`) e o número visível («Bloque 15/16») estão em: marcador de seção, títulos «Preguntas · Bloque NN», tabelas do banco, títulos de mazos/decks, cruzamentos de texto e perguntas; (2) `rm-materia-sistema.js` deriva vinheta (`vb-NN`) e capítulo do **número** do id. Mover só a seção no DOM deixaria «Bloque 16» antes de «Bloque 15»; renumerar exige trocar ~30 rótulos e reordenar 3 porções do banco/mazo. **Solução proposta (rodada própria, ~1 PR pequena):** manter os ids; no DOM colocar `ap2pb16` antes de `ap2pb15`; trocar os rótulos visíveis 15↔16 (e «PÁNCREAS I/II») em todo o arquivo; reordenar as porções do banco/mazo; no `clasificarAP2P` mapear 15↔16 para a vinheta correta; rodar `temas-ap2p`, `real-ap2p`, `integracao-ap2p`. Não é risco para grifos (0 marcações; âncoras seguem pelo id), mas exige ordem de José por tocar o módulo Nova Era.

## 14 · Rodada 25/11 (3) — ordem dos slides 13 → 14 implementada (ids intactos)
`tools/qa/ap2p-revisao/reordenar.py` (idempotente, dentro de `construir.py`): (1) a seção `ap2pb16` (adenocarcinoma, slide 13) passa a vir ANTES de `ap2pb15` (pancreatite, slide 14) no DOM; (2) a linha e as porções do banco e do mazo seguem a mesma ordem; (3) rótulos visíveis «Bloque 15/16» e «PÁNCREAS I/II» trocados em todo o arquivo; (4) `rm-materia-sistema.js`: `AP2P_VIS` mostra na Nova Era o número visível (15↔16) e o capítulo correspondente; a **vinheta continua a do id** (conteúdo correto). **Ids, âncoras, imagens, 488 perguntas e 924 flashcards intactos** (teste compara conjuntos com o original). Marcações dos alunos: 0 (Supabase, só leitura); âncoras seguem por id, então continuariam válidas.
Testes: estático 426/426; navegador 54/54; `temas-ap2p` 51/51 (oráculo ajustado: número visível 15↔16 e vinheta por id); real 109/109; integração 119/119; b17-b18 186+8; porta 7/7 (layout 4 larguras, caneta/modos); nao-ativacao 39/39; gate 48/48.
**Lista curta de arquivos que continuam inacessíveis:** `laminário_261110_132914.pdf` (50 776 482 B) · `laminário - 2_260728_225030.pdf` (44 664 245 B) · `Anatopato II - Resumo Final.pdf` (61 882 064 B) · slides 02, 04, 07, 08, 10, 11, 13, 16 (11–18 MB). Divisão: partes ≤ 8 MB (Dividir PDF por intervalos de páginas) ou JPG por página. **Matéria NÃO está completa** até esses conteúdos serem conferidos.
