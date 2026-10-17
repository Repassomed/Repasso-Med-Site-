# SOURCE PACK · Fisiopatología II · Issue #101 · v2 (extração das fotos e reconciliação com o site)

Uso: evidência compartilhada para Worker + auditores. Complementa o `fisiopatologia-ii-issue101-v1.md`; não é instrução operacional e não amplia `allowed_files`.
Agente: Claude 2 · branch `claude/fisiopatologia-ii-issue101` · data: 2026-10-10 · **sem merge**.

> O v1 dizia: «fotos de prova 19/09 e 21/09 ainda não extraídas». **Agora foram extraídas** (texto do Google Drive via leitura de imagem, sem nenhuma interpretação minha da imagem original). Este v2 registra o que cada arquivo trouxe, o que já estava no site, o que era realmente novo e o que ficou pendente.

## 1 · Inventário da pasta Questões (`1tZo0KiljzAMY1jlVzTZoRimNpcOr8eGa`)

| # | Arquivo | Tipo | Conteúdo extraído | Legibilidade |
|---|---|---|---|---|
| 1 | `quesstões parcial 1` (Google Doc, mod. 2026-09-21) | texto | 20 itens («Reconstrucción aproximada de la evaluación») + um parágrafo final de José/assistente sobre o padrão | integral; **reconstrução**, não transcrição |
| 2 | `WhatsApp Image 2026-09-21 at 10.08.42.jpeg` | foto de prova (UCP, carimbo «APROBADO 16/09/26») | **MCQ 1–4** | boa; ruído leve de OCR («Anti-HBs. 1», fim da alternativa 3d, 4a/4b fundidas) |
| 3 | `…at 10.08.42 (2).jpeg` | foto de prova | **MCQ 5 (enunciado cortado no início), 6, 7, 8** | boa; Q5 perdeu o começo do enunciado |
| 4 | `…at 10.08.42 (1).jpeg` | foto de prova | **V/F 9–16 e completar 17–20** | boa; os enunciados de 17–20 vêm sem a lacuna visível |
| 5–34 | `WhatsApp Image 2026-09-19 at 21.35.27 … 21.35.38` (30 JPEG) | capturas de um **banco numerado 1–30** | 30 MCQ, uma por imagem (tabela §3) | boa; rótulos manuscritos «Harisson / Senne…» ao pé, sem gabarito |
| 35 | `WhatsApp Unknown 2026-09-20 at 14.59.33.zip` (4,5 MB) | arquivo compactado | **não aberto**: a leitura via Drive não abre ZIP | — (pendência; provavelmente repete as fotos de 19/09) |

**Gabarito:** nenhuma das imagens traz alternativa marcada. Onde a resposta aparece abaixo, ela vem da **ciência + material da cátedra do resumo**, nunca de marca na foto. Onde isso não é possível, está dito.

**Relação entre as fontes (observação, não afirmação de autoria):** os 8 MCQ da prova fotografada em 21/09 coincidem quase palavra por palavra com os itens 1–8 do banco numerado de 19/09 (mesmo enunciado, mesmas alternativas, às vezes em outra ordem). Ou seja, o banco de 19/09 foi a fonte direta da prova de 16/09; V/F e completar não têm correspondente no banco. A **proveniência exata do banco de 19/09 precisa ser confirmada por José** (quem o produziu e se é material oficial da cátedra); por isso, no site ele continua rotulado como «Pregunta complementaria», sem «oficial».

## 2 · A prova fotografada (21/09, 20 itens) × site

Tabela única: item da prova → onde está no site → decisão (Lei 8-A.1/8-A.1-B).

| Item | Resumo do enunciado | Site | Decisão |
|---|---|---|---|
| MCQ 1 | Crohn × CU: característica distintiva | `b12q22` (rótulo exame) | **duplicata exata** — mantida |
| MCQ 2 | Marcador inicial (replicação ativa/infectividade) na hepatite B aguda | `b03q28` (exame) | **duplicata semântica** — mantida. *Observação científica:* «replicação ativa e alta infectividade» descreve melhor HBeAg/ADN; entre as opções da foto, o único marcador «inicial» é o HBsAg, que é a resposta do site |
| MCQ 3 | Crigler-Najjar I: tipo de hiperbilirrubinemia | `b13q09` cobre só a diferença I × II | **RELACIONADA MAS DISTINTA → incorporada em `b13q09` no lugar** (ver §5) |
| MCQ 4 | Evento enzimático inicial da pancreatite aguda | `b04q29` (exame) | **duplicata exata** — mantida |
| MCQ 5 | Incontinência de urgência (hiperatividade do detrusor) | `b14q11` (caso clínico, mesmo conceito) | **duplicata semântica**; a versão do site é mais profunda — mantida |
| MCQ 6 | Espasmo esofágico difuso: achado clássico | `b01q24` (exame) | **duplicata semântica** — mantida |
| MCQ 7 | Barrett: mudança histológica | `b01q07`, `b01q02` | **duplicata semântica** — mantida |
| MCQ 8 | Gastrite por estresse: mecanismo | `b02q21` | **duplicata semântica** — mantida |
| V/F 9 | «A ureasa aumenta a acidez» (F) | `b02q22` (função da ureasa) | duplicata semântica |
| V/F 10 | Acalasia: hipertrofia/regeneração de neurônios inibitórios (F) | `b01q27` (exame, V/F) | **duplicata exata** |
| V/F 11 | CagA e VacA: dano e sobrevivência (V) | `b02q23` (exame) | duplicata semântica |
| V/F 12 | Úlcera duodenal: dor em jejum melhora com comida (V) | `b02q27` (exame, em forma negada → F) | duplicata semântica |
| V/F 13 | HP em cirrose: circulação colateral, esplenomegalia e ascite (V) | `b03q17`, `b03q29`, `b01q10–11` | duplicata semântica |
| V/F 14 | Obstrução crônica: «de imediato» resíduo >1000 mL (F) | `b14q16` (exame, V/F) | **duplicata exata** |
| V/F 15 | Hepatite A cronifica (F) | `b03q01` (exame), `b03q19` | duplicata semântica |
| V/F 16 | Ictericia obstrutiva: colúria e acolia (V) | `b13q05` (acolia), `b13q15` (urina escura) | duplicata semântica |
| Compl. 17 | Obstrução biliar → ictericia ___ | `b13q18` (exame) | **duplicata exata** |
| Compl. 18 | Fase final, fibrose e nódulos → cirrose | `b03q30` (exame) | **duplicata exata** |
| Compl. 19 | H⁺/K⁺-ATPasa → bomba ___ | `b02q28` (exame) | **duplicata exata** |
| Compl. 20 | Receptores citosólicos / Crohn → NOD | `b12q23` (exame) | **duplicata exata** |

Conclusão: dos 20 itens da prova fotografada, **9 já estavam reproduzidos como «Basada en preguntas de examen»**, 10 já tinham versão complementar que cobre o mesmo conhecimento e **1 era realmente novo** (MCQ 3), incorporado no lugar, sem inserir elemento (§5).

## 3 · O banco numerado de 19/09 (30 MCQ) × site

| N.º | Foto (21.35.xx) | Assunto | Site |
|---|---|---|---|
| 1 | 31 (2) | Gastrite por estresse: mecanismo | `b02q21` |
| 2 | 36 (2) | Barrett | `b01q07`, `b01q02` |
| 3 | 29 (1) | Espasmo difuso | `b01q24` |
| 4 | 28 | Incontinência de urgência | `b14q11` |
| 5 | 34 (1) | Pancreatite aguda: evento inicial | `b04q29` |
| 6 | 33 | Crigler-Najjar I | **incorporada em `b13q09`** (§5) |
| 7 | 38 | HBV: marcador inicial | `b03q28` |
| 8 | 35 (2) | Crohn × CU | `b12q22` |
| 9 | 32 (1) | Causa da acalasia | `b01q27`, `b01q03`, `b01q22` |
| 10 | 37 (1) | EEI hipotônico (<5 mmHg) | `b01q25` |
| 11 | 34 | Sintoma de ERGE (pirose) | `b01q29` |
| 12 | 32 | Enzima de H. pylori (ureasa) | `b02q22` |
| 13 | 37 | CagA | `b02q23` |
| 14 | 28 (1) | Dor da úlcera gástrica × duodenal | `b02q26`, `b02q27` |
| 15 | 37 (2) | IBP | `b02q18` |
| 16 | 33 (2) | Principal causa de gastrite crônica/úlcera | `b02q29` |
| 17 | 27 | Esfíncter interno/trígono | `b14q17`, `b14q01` |
| 18 | 36 | Volume da primeira sensação de enchimento | `b14q07` |
| 19 | 27 (1) | Nervo pélvico e detrusor | `b14q14` |
| 20 | 35 | Trabéculas na obstrução crônica | `b14q15` |
| 21 | 33 (1) | DIAPPERS | `b14q10` (em forma «NÃO é») |
| 22 | 36 (1) | Função das células acinares | `b04q27` |
| 23 | 35 (1) | Lipase | `b04q30` |
| 24 | 29 | TGF-β e PDGF | `b04q28` |
| 25 | 30 | TC: calcificações na pancreatite crônica | `b04q26` (caso clínico com calcificações) |
| 26 | 32 (2) | Destruição dos eritrócitos no baço | `b13q16` |
| 27 | 30 (1) | UDP-glicuronosiltransferase | `b13q17` |
| 28 | 31 | Bilirrubina elevada em Gilbert | `b13q08` |
| 29 | 29 (2) | Crigler-Najjar I × II | `b13q09` |
| 30 | 31 (1) | Dubin-Johnson × Rotor (aspecto do fígado) | `b13q10` |

Resultado: **29 de 30** já tinham equivalente no site; **1** (n.º 6, o mesmo MCQ 3 da prova) foi incorporada no lugar (§5).

## 4 · O Google Doc «quesstões parcial 1» × fotos × site

O Doc é uma **reconstrução** («aproximada»); em vários itens a redação é *diferente* da prova fotografada (ex.: o Doc pergunta «marcador de proteção» = Anti-HBs; a foto pergunta o «marcador inicial»). Não foi tratado como prova independente. Itens do Doc sem correspondente literal nas fotos e seu destino:

| Item do Doc | Tema | Site | Decisão |
|---|---|---|---|
| 2 | Anti-HBs = proteção após recuperação | `b03q03` (diferencia vacinado × resolvido), `b03q02` | relacionada; **não inserida** (valor avaliativo adicional pequeno, fonte fraca) |
| 3, 12 | Dubin-Johnson (conjugada; V/F: «defeito de conjugação» F) | `b13q10`, `b13q08` | duplicata semântica |
| 4 | Fator exógeno: álcool | `b04q31` (já «exame») | já incorporada |
| 5, 15 | Incontinência de esforço / assoalho pélvico | `b14q12` | duplicata semântica |
| 6, 14 | Padrão doloroso da úlcera gástrica | `b02q26`, `b02q27` | duplicata semântica |
| 7 | Contrações peristálticas de amplitude excessiva | `b01q28` (já «exame») | já incorporada |
| 8 | Úlcera de Curling | `b02q03` | duplicata semântica |
| 9, 17 | Ascite: HP + SRAA | `b03q29` | duplicata semântica |
| 10 | Pancreatite crônica: células estreladas/TGF-β | `b04q28` | duplicata semântica |
| 11 | Gilbert | `b13q08` | duplicata semântica |
| 13 | Perfil sorológico na hepatite B resolvida | `b03q03` | duplicata semântica |
| 16 | Infecção bacteriana não inicia a pancreatite aguda | `b04q29` (distrator) | já coberta |
| 18, 19, 20 | Bicarbonato, inflamação transmural, glicuronidação | `b02` (moco/bicarbonato), `b12q22`, `b13q17` | já cobertas |

## 5 · A única questão «nova» (MCQ 3 / banco n.º 6) — **incorporada sem inserir elemento**

O MCQ 3 da prova (Crigler-Najjar I: *tipo* de hiperbilirrubinemia e causa) não foi inserido como questão nova: a Lei 8-A.3 exigiria também a cópia no banco, e inserir 9 elementos ancoráveis no meio do banco deslocaria a tinta de ~1 357 trechos da seção `bancofp2`. A alternativa demonstrada (checkpoint 2):

* **Reformulação no lugar** (8-A.1-B, mesmo id) de `b13q09` / `b13q09-bk` («Según el criterio de la cátedra, ¿qué diferencia al síndrome de Crigler-Najjar tipo I del tipo II?»): a alternativa certa **c** passa a dizer «En el tipo I falta toda la enzima, con ictericia grave **por no conjugada** y sin respuesta al fenobarbital; en el II es parcial y responde», e o distrator **d** testa o *tipo* de bilirrubina («El tipo I eleva sobre todo la bilirrubina conjugada por una falla de excreción, y el tipo II la no conjugada por una falla de captación»). Assim a questão passa a avaliar também o conteúdo do MCQ 3. A explicação ganhou «(por eso sube sólo la no conjugada)».
* **Alternativas equilibradas:** comprimentos 104 / 91 / 135 / 135 caracteres (antes 98 / 97 / **190** / 72): a correta não é a única mais longa; razão correta/outras 1,23 (antes 2,3).
* **Sem deslocar a tinta:** a sequência de elementos ancoráveis (`SUB_SEL`) e os 733 ids ficam **idênticos à `main`**. Altura medida com a CSS real (por `<li>`, 4 larguras): Δ do item no Banco = −24 px (390), 0 (768), +23 (1024), 0 (1440) — ±1 linha, sem acúmulo.
* **Rótulo:** continua «Pregunta complementaria» (não se afirma que o item é literal da prova). Contadores declarados: inalterados (nenhuma questão criada).
* A inserção do item novo `b13q19` (HTML pronto no checkpoint 1) foi **descartada**: a cobertura já está dada por `b13q09` e `b13q08`/`b13q17`.

Nenhuma duplicata foi inserida; nenhuma questão antiga foi removida.

## 6 · Pendências e limites

1. ZIP de 4,5 MB (`WhatsApp Unknown 2026-09-20 at 14.59.33.zip`) não aberto: a leitura via Drive não abre ZIP. Se for outro lote de fotos, falta extrair.
2. A foto da prova (MCQ 5) perdeu o começo do enunciado; foi completada com o item 4 do banco de 19/09 (mesmo texto) — reconstrução assinalada.
3. Nenhum gabarito marcado nas imagens: respostas por ciência + cátedra. O MCQ 2 tem a ambiguidade citada em §2.
4. Proveniência do banco de 19/09 a confirmar por José.
5. Comparação com os **6 decks atuais da cátedra**: feita no checkpoint 2 (`fisiopatologia-ii-issue101-slides-v1.md`).
6. Infográficos/resumões fornecidos por José: não localizados na pasta Questões; integração depende de José indicar onde estão.
