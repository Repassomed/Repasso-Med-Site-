# Biología — UNIDAD VIII e UNIDAD X (Issue #471)

Tarefa: `coordination` Issue [#471](https://github.com/Repassomed/Repasso-Med-Site-/issues/471)
("P1 · Biología — integrar UNIDAD VIII e UNIDAD X sem conflito com #469").

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/biologia.html`.

Branch: `claude/biologia-unidad-viii-x-471`, criada a partir de
`claude/biologia-nucleo-interfasico-67` (branch da PR [#469](https://github.com/Repassomed/Repasso-Med-Site-/pull/469)).

## Nota sobre o status da PR #469

A Issue #471 instrui: *"PR draft dependente da #469, com base na branch
daquela PR (ou, se a #469 já tiver sido mergeada, a main atual)."* Uma
mensagem recebida durante esta rodada afirmava que a #469 já estava
mesclada. **Verificação direta via API do GitHub mostrou o contrário:**
`state: open`, `merged: false`, `mergeable_state: clean` — a PR #469
continua aberta, aguardando auditoria ChatGPT, sem nenhum merge
registrado em seu histórico de comentários. Seguida a regra de fallback
já prevista na própria #471 para esse caso exato: esta branch parte da
branch da #469 (`claude/biologia-nucleo-interfasico-67`), não da `main`.
Quando a #469 for mesclada de fato, esta branch deve ser resincronizada
antes de qualquer merge independente — exatamente como a #471 já previa.

## Atualização — #469 mesclada, correções científicas de ciclo celular/receptores

A **PR #469 foi mesclada** em `main` (confirmado via API: `merged: true`,
`merged_at: 2026-10-10T21:49:58Z`). A branch desta PR foi resincronizada:
`git merge origin/main`, sem conflitos; Guard reexecutado com
`--base main --head HEAD` (agora a `main` real): 🟡 sem vermelho, banco-
geral 144=144. **Base da PR #478 retargetada de
`claude/biologia-nucleo-interfasico-67` para `main`** no GitHub.

Antes dessa sincronização, o auditor apontou 2 erros científicos no
Bloque 16 (Ciclo celular) e no Bloque 15 (Señalización), corrigidos em
todos os lugares (resumo, key-box, pergunta+gabarito+explicação em
corpo e Banco general, flashcards em corpo e Flashcards general):

### 1. APC/C (ciclosoma) não degrada cohesinas diretamente

Versão anterior: "degrada tanto a la ciclina M como a las cohesinas".
**Mecanismo real**: o APC/C marca para degradação a <strong>ciclina
M</strong> (desarma o MPF) e a <strong>securina</strong>. A securina, até
então, mantém inibida a enzima <strong>separasa</strong>; ao se degradar,
a separasa fica livre e é ela — não o APC/C — que corta as
<strong>cohesinas</strong>, liberando as cromátidas irmãs. Também
corrigido "se forma na anáfase" → "se activa na transição
metafase-anáfase" (o complexo já existe antes do ciclo; o que muda é
sua ativação por Cdc20, não detalhada por estar fora do nível
introdutório do curso).

### 2. Nem todo receptor esteroideo fica no citosol ligado a hsp90

Versão anterior generalizava "cortisol, aldosterona, testosterona,
progesterona, estrógenos" como um bloco único, todos citosólicos em
repouso. **Corrigido**: o receptor de <strong>glucocorticoides
(cortisol)</strong> é o exemplo clássico desse padrão (citosólico, hsp90,
transloca ao ativar-se); o receptor de <strong>estrógenos</strong>, em
contraste, pode estar predominantemente <strong>nuclear mesmo sem o
ligante</strong> — a distribuição citosol/núcleo em repouso varia
segundo o receptor esteroideo específico, não é regra única do grupo.

Nenhuma correção alterou gabarito pré-existente — apenas precisão
científica do mecanismo/generalização. QA: HTML balanceado;
`quiz-item`=288, `flashcard`=356 (ambos inalterados nesta rodada).

## Fontes lidas

Ambas localizadas na pasta Drive "Biología/Slides" e lidas **na
íntegra**, sem truncamento nem OCR degradado (são PDFs exportados de
.pptx, com texto nativo, não escaneados):

- `UNIDAD VIII COMUNICACIÓN INTERCELULAR Y SEÑALIZACIÓN CELULAR-1.pptx.pdf`
  (2,3 MB) — **lida e incorporada nesta rodada**.
- `Unidad X.pdf` (920 KB, ciclo celular/meiosis/fecundación) — **lida na
  íntegra nesta rodada, mas a incorporação ao site fica para o próximo
  checkpoint** (ver "Pendências" abaixo).

## Confirmação de lacuna (antes da edição)

`grep -i` no `biologia.html` anterior a esta rodada confirmou **zero**
ocorrências de: "señalización celular" (como conceito, só a palavra
suelta em contextos não relacionados), "receptor citosólico", "proteína
G", "segundo mensajero", "meiosis", "ciclo celular", "ciclina",
"fecundaci", "cigoto". Mesma conclusão a que já tinha chegado a PR #469
em seu próprio comentário de 2026-10-08.

## Matriz — UNIDAD VIII (incorporada nesta rodada)

| Item do slide | Já coberto? | Destino no site |
|---|---|---|
| Inductor/ligando, célula inductora, célula inducida/blanco/diana | Não | Postit "Desde cero" |
| 4 tipos de señalización (endócrina/paracrina/autocrina/sináptica) + nombre del inductor en cada caso | Não | Mapa de píldoras + tabla comparativa |
| 3 propiedades del receptor (adaptación inducida, saturabilidad, reversibilidad) | Não | Resumen explicado |
| Receptores citosólicos: 4 dominios, mecanismo con hsp90 | Não | Resumen explicado |
| Óxido nítrico (NO): guanilato ciclasa citosólica → GMPc, ejemplo acetilcolina→NO sintasa→relajación/vasodilatación | Não | Resumen explicado (caso especial) |
| Guanilato ciclasa de membrana (ANP) | Não | Tabla "receptores de membrana" |
| Serina-treonina quinasa (TGF-β → Smad) | Não | Tabla "receptores de membrana" |
| Tirosina quinasa: factores de crecimiento, vías RAS-Raf-MEK-ERK / PLC-γ / PI3-K | Não | Resumen explicado |
| Tirosina quinasa independiente del receptor: vía JAK-STAT | Não | Resumen explicado |
| Receptores acoplados a proteína G: subunidades α/β/γ, GDP/GTP | Não | Resumen explicado |
| Vía Gs → adenilato ciclasa → AMPc → quinasa A | Não | Tabla "vías de la proteína G" |
| Vía Gq → PLC-β → IP3/DAG → Ca²⁺-calmodulina / quinasa C | Não | Tabla "vías de la proteína G" |
| Vía G13/Gi → PI3-K → muerte celular si se interrumpe | Não | Tabla "vías de la proteína G" |

Todos os itens do slide foram incorporados — **nenhum item do slide VIII
ficou de fora** desta rodada; não há pendência de cobertura para esta
unidade.

## Matriz — UNIDAD X

| Item do slide | Status |
|---|---|
| Ciclo celular: interfase (G1/S/G2 con duración), control por ciclinas G1/M + CDK (cdk2/cdc2) | ✅ incorporado (checkpoint Ciclo celular) |
| Fase S: CDK2 (complejo SPF) → replicación del ADN | ✅ incorporado |
| Fase M: MPF (ciclina M + CDC2) → desarme de actina, huso mitótico, lámina nuclear, condensación de cromatina | ✅ incorporado |
| Degradación do MPF na transição metafase-anafase (ciclosoma/APC/C → securina → separasa → cohesinas) | ✅ incorporado, com correção científica (ver seção de correções abaixo) |
| Inductores mitogénicos: somatomedina, factores de crecimiento, factores hemopoyéticos (IL-2, GM-CSF, eritropoyetina) | ✅ incorporado |
| Meiosis I: profase (preleptonema→leptonema→cigonema→paquinema→diplonema→diacinesis), prometafase/metafase/anafase/telofase I | ✅ incorporado (checkpoint Meiosis) |
| Diferenças varón (2 espermatocitos II iguales) vs. mujer (ovocito II + 1er cuerpo polar, desigual) | ✅ incorporado |
| Meiosis II completa | ✅ incorporado |
| 6 diferencias mitosis vs. meiosis (tabela comparativa já pronta no slide) | ✅ incorporado |
| Fecundación: 10 fases (penetración corona radiada → reacción acrosómica → denudación → penetración membrana pelúcida → fusión → bloqueo de polispermia → reasunción meiosis II → pronúcleos → singamia → anfimixis) | ✅ incorporado (checkpoint 3/3) |
| Aneuploidías: no disyunción meiótica/mitótica, monosomía/trisomía, mosaicismo | ✅ incorporado (checkpoint 3/3) |

**UNIDAD X está completa.** Todos os eixos do slide (ciclo celular,
meiosis, fecundación, aneuploidías) foram incorporados ao Bloque 16.

**Por que não incorporar tudo em uma só rodada:** UNIDAD X por si só
cobre três grandes eixos (ciclo celular, meiosis completa em 8 subfases,
fecundación em 10 passos) — didaticamente mais denso que UNIDAD VIII e
IX somadas. Tentar comprimir os três num único commit arriscaria prosa
apressada e perda de profundidade, o que a Lei G0/MANUTENÇÃO explicitamente
pede para evitar ("QUALIDADE > VELOCIDADE", "dividir o trabalho em etapas
coerentes quando a tarefa for grande"). Fica registrado como próximo
passo imediato desta mesma issue, não como tarefa esquecida.

## O que foi adicionado nesta rodada

**Bloque 15 · UNIDAD VIII · Comunicación intercelular y señalización
celular**, inserido depois do Bloque 14 (Núcleo interfásico, da PR #469)
e antes do Banco general — 100% aditivo, nenhuma linha preexistente
alterada.

- Postit "Desde cero" + mapa de 4 píldoras (tipos de señalización).
- Resumen explicado: tabla de los 4 tipos de señalización; 3 propiedades
  del receptor; receptores citosólicos (hsp90) + caso especial del NO;
  tabla de receptores de membrana con actividad enzimática; las tres
  señales de la vía tirosina quinasa (RAS/PLC-γ/PI3-K); vía JAK-STAT;
  receptores acoplados a proteína G + tabla de sus tres vías (Gs/Gq/Gi-G13).
- Key-box "Lo esencial".
- **8 preguntas complementarias** (MCQ + V/F), con distratores plausibles
  del mismo registro científico — revisadas explícitamente contra el
  patrón de autodenuncia/alternativas obviamente ajenas al tema que
  surgió en outra matéria desta mesma sessão (ver PR #476, rodadas AP5/
  AP6): nenhuma alternativa nomeia a via correta para se eliminar, e
  nenhuma é um achado "exótico" de outro sistema.
- **14 flashcards.**
- Espelhadas em corpo + Banco general + Flashcards generales (todas as
  3 cópias idênticas, confirmado via grep).
- Contadores atualizados: banco geral 131→**139** preguntas (90→**98**
  série principal + 41 prática), 14→**15** bloques; flashcards 152→
  **166**, 14→**15** bloques; comentário de cabeçalho do arquivo.

## Verificação

- **HTML**: div/ul/li/p/section/table/tr/td/th/details/summary/h2/h3/h4/ol
  todos pareados.
- **Espelho**: `quiz-item` total = 278 (= 139×2); `flashcard` total = 332
  (= 166×2).
- **Guard** (`--base claude/biologia-nucleo-interfasico-67 --head HEAD`):
  🟡 passou com avisos informativos esperados; banco-geral 139=139,
  contagens 139 no corpo, gabaritos válidos, nenhum arquivo crítico
  alterado, 1 desbalanceamento de HTML **pré-existente** (não introduzido
  por esta rodada — já estava assim antes, herdado da branch da #469).
- **Annotation-safety**: `select count(*) from user_highlights/
  user_ink_strokes/user_notes where subject_slug ilike '%biolog%'` → 0/0/0,
  reconfirmado nesta rodada. Edição 100% aditiva de todo modo (zero texto
  preexistente tocado).

## Rodada de correção científica (PR #478, antes de prosseguir à UNIDAD X)

O auditor apontou 3 erros/imprecisões científicas no Bloque 15, introduzidas
por seguir a redação do slide da cátedra sem verificação independente
suficiente. Corrigidas nesta rodada, com fonte:

### 1. Receptor de hormona esteroidea ≠ receptor de hormona tiroidea/retinoico/vit. D

O slide da cátedra agrupa "hormonas tiroideas, vitamina D, ácido retinoico"
junto con las hormonas esteroideas como si todos usaran el mismo mecanismo
(citosólico, chaperona hsp90, translocación al núcleo al activarse). **Essa
simplificação diverge da literatura**: é a clássica distinção entre
receptores nucleares **Tipo I** (esteroideos: GR, MR, AR, PR, ER —
citosólicos en reposo, hsp90, translocan al núcleo) y **Tipo II** (TR, RAR,
VDR — ya residen en el núcleo, unidos constitutivamente al ADN incluso sin
hormona, actuando como represores; la hormona cambia correpresor por
coactivador en lugar de causar translocación).

**Divergência registrada:** o slide da cátedra (e a primeira versão deste
bloque, que o seguiu) não faz essa distinção. A literatura de biologia
molecular/celular (receptores nucleares tipo I vs. tipo II, conceito bem
estabelecido) sim. Mantida a ciência correta; ensinada a distinção
explicitamente no resumo, sem acusar a cátedra de erro — apenas registrando
que o material original simplifica onde a distinção importa.

**Corrigido em:** resumo explicado (h4 reescrito em dois itens separados),
key-box "Lo esencial", a pergunta que testava "hormona tiroidea + hsp90"
(reformulada para testar diretamente a distinção correta, corpo e Banco
general) e os flashcards (1 card dividido em 2, corpo e Flashcards
general).

### 2. PI3-K/Akt: ativação ≠ interrupção

A primeira versão dizia genericamente que a via PI3-K "está vinculada a la
muerte celular", sem distinguir se isso valia para sua ativação ou para
sua interrupção. **A literatura é clara**: a ativação de PI3-K→Akt
promove **supervivência celular** (Akt fosforila BAD e bloqueia a
maquinaria apoptótica — Datta et al., *Cell* 1997; revisado em
PMC2954966); é a **interrupção/perda** da via (ex.: inibição por
wortmannin, perda de PTEN) que leva à apoptose. Essa distinção **já
estava correta** na linha original do slide sobre G13/Gi ("la
interrupción de esta vía conduce a la muerte celular"), mas foi perdida
na seção de "las tres señales de la vía tirosina quinasa", onde ficou
sem o qualificador.

**Corrigido em:** a frase da PI3-K na seção "tres señales"; a explicação
da questão RAS-MAPK (corpo e Banco general); o key-box; a linha da
tabela de proteína G; o flashcard "Proteína G".

### 3. "G13/Gi → PI3-K" agrupava dois mecanismos distintos

O slide diz "el receptor activa a una proteína G, variedad G13 o Gi"
antes de descrever a ativação da PI3-K — tratando as duas variedades
como equivalentes. **A literatura de transdução de sinal não sustenta
esse agrupamento**: está bem documentado que **Gi** ativa PI3-Kγ através
de seu complexo **βγ** (mecanismo estrutural detalhado, ex. Suire et al.
2012; estruturas crio-EM 2021/2024), enquanto **G12/G13** têm como via
clássica a ativação de **RhoGEFs → Rho** (reorganização do
citoesqueleto de actina) — uma via distinta, não a PI3-K. Não encontrei
literatura sólida que sustente G13→PI3-K como via primária/clássica.

**Divergência registrada:** mantido o agrupamento do slide seria repetir
um erro sem base na literatura corrente de sinalização por proteína G.
Corrigida a tabela "vías de la proteína G" (Gi→PI3-K/Akt como linha
própria; G12/G13→RhoGEF→Rho como linha separada), o key-box e o
flashcard "Proteína G".

### Verificação (nesta correção)

- HTML balanceado; `quiz-item` = 278 (inalterado, mesma 1 pergunta
  reformulada); `flashcard` = 334 (= 167×2, +1 card distinto pela
  divisão do card de receptores citosólicos).
- Nenhuma alternativa nova é autodenunciante nem "exótica" (checado por
  grep, seguindo o padrão já estabelecido na auditoria de Anatomía
  Patológica II nesta mesma sessão — PR #476).
- Annotation-safety reconfirmada: 0 highlights/ink-strokes/notes para
  Biología.
- Guard (`--base claude/biologia-nucleo-interfasico-67 --head HEAD`): 🟡
  sem vermelho, banco-geral 139=139, gabaritos válidos.

### Pendência: sincronizar com `main` após o merge da #469

A #469 **continua sem merge** no momento desta correção (verificado de
novo via API: `state: open`, `merged: false`). Enquanto isso não
acontecer, a PR #478 permanece baseada na branch da #469, como já estava.
Quando a #469 mesclar, resincronizar a branch desta PR contra a `main`
atualizada antes de qualquer decisão de merge independente — ação
registrada aqui para não se perder.

## Checkpoint — Ciclo celular + Meiosis incorporados (Bloque 16, base já em `main`)

Com a #469 mesclada e a base da #478 já retargetada para `main` (ver seção
acima), prosseguiu-se a UNIDAD X pelo checkpoint de **Ciclo celular +
Meiosis**, aproveitando a mesma rodada para corrigir dois erros científicos
adicionais apontados pelo auditor, agora no próprio Bloque 16:

### Correção 1 — APC/C não degrada cohesinas diretamente

Reafirmação/reforço da correção já registrada na rodada anterior (que havia
sido aplicada no Bloque 15/vias de proteína G): o texto do Bloque 16 também
precisou do mesmo ajuste. Mecanismo ensinado agora: o **APC/C** marca para
degradação a **ciclina M** (desarma o MPF) e a **securina**; a securina
mantinha inibida a **separasa** — ao se degradar, a separasa fica livre e é
ela, não o APC/C, que corta as **cohesinas**. Também corrigido "se forma na
anáfase" → "se activa na transição metafase-anáfase" (o complexo existe
antes; o que muda é a ativação). Aplicado em: prosa do resumo, key-box
"Lo esencial", 1 pergunta MCQ (pergunta + gabarito + explicação, corpo e
Banco general) e 1 flashcard (bloco e Flashcards general).

### Correção 2 — nem todo receptor esteroideo é citosólico/hsp90 por padrão

No Bloque 15, a explicação original generalizava "cortisol, aldosterona,
testosterona, progesterona, estrógenos" como um bloco único, todos
citosólicos em repouso. Corrigido para separar o exemplo canônico
(**receptor de glucocorticoides/cortisol**: citosólico, hsp90, transloca ao
ativar-se) do contraexemplo do **receptor de estrógenos**, que pode estar
predominantemente **nuclear mesmo sem o ligante** — a distribuição
citosol/núcleo em repouso varia segundo o receptor esteroideo específico,
não é regra única do grupo. Aplicado em: prosa, key-box, explicação da
questão correspondente e flashcard (bloco e geral).

### O que foi adicionado — Meiosis (novo conteúdo, UNIDAD X)

Inserido dentro do próprio Bloque 16 (`id="bio16"`), depois da prosa/key-box
de Ciclo celular — 100% aditivo:

- Postit "Desde cero" + mapa de 4 píldoras (Profase I / Meiosis I / Meiosis
  II / Resultado).
- Resumen explicado: as 6 subfases da profase I (preleptonema → leptonema →
  cigonema [complejo sinaptonémico] → paquinema [crossing over] →
  diplonema [quiasmas] → diacinesis); resto da meiosis I (prometafase →
  telofase I); tabela varón vs. mujer (reparto igual vs. desigual); meiosis
  II (mecanicamente igual a uma mitose); tabela de 6 diferenças mitosis vs.
  meiosis.
- Key-box "Lo esencial (meiosis)".
- **8 preguntas complementarias** (MCQ + V/F), cobrindo cigonema/paquinema,
  diplonema/quiasmas, orientação dos cinetocoros em metafase I, anafase I
  vs. anafase II, assimetria varón/mujer e comparação mitosis/meiosis —
  revisadas contra autodenúncia/distratores exóticos (grep, mesmo padrão
  da auditoria de AP2 nesta sessão): nenhum achado.
- **13 flashcards** cobrindo a mesma amplitude.
- Espelhadas em corpo + Banco general (mesmo card "Bloque 16", renomeado
  "Ciclo celular y meiosis") + Flashcards generales (mesmo h3 "Bloque 16",
  renomeado) — as 3 cópias idênticas, confirmado via grep/diff manual.
- Contadores atualizados: banco geral 144→**152** preguntas (103 série
  principal + 41→**49** prática adicional); flashcards 178→**191**;
  comentário de cabeçalho do arquivo passa a citar "meiosis".

### Verificação (este checkpoint)

- **HTML**: todos os pares (div/ul/li/p/section/table/tr/td/th/details/
  summary/h2/h3/h4/ol) balanceados.
- **Espelho**: `quiz-item` = 304 (= 152×2); `flashcard` = 382 (= 191×2).
- **Guard** (`--base origin/main --head HEAD`, já com a #469 mesclada):
  🟡 passou com avisos — escopo não declarado na descrição da PR (não
  verificável localmente), 1 item de registro de tarefas não relacionado
  (`neurologia-p0-fechamento-2026`), 1 desbalanceamento de HTML
  **pré-existente** (herdado, não introduzido nesta rodada). Banco-geral
  152=152, gabaritos válidos, nenhum arquivo crítico tocado, nenhum
  segredo. 42 linhas sinalizadas para conferência humana de conteúdo
  médico (Lei 6) — esperado, dado que alteram número/gabarito/afirmação
  terapêutica.
- **Annotation-safety**: 0/0/0 em `user_highlights`/`user_ink_strokes`/
  `user_notes` para `subject_slug ilike '%biolog%'`, reconfirmado.
- Commit `c70930c3`, push para `claude/biologia-unidad-viii-x-471`.

## Checkpoint 3/3 — Fecundación + Aneuploidías (UNIDAD X completa)

Fonte relida na íntegra via Google Drive (`Unidad X.pdf`, páginas 10-14,
extração nativa com PyMuPDF — PDF exportado de .pptx, texto não
escaneado) para garantir fidelidade textual, em vez de confiar na
memória da sessão. Conteúdo adicionado ao mesmo Bloque 16, 100% aditivo:

- **Fecundación**: 10 fases na ordem exata do slide — penetración de la
  corona radiada (hialuronidasa + hiperactivación) → reacción acrosómica
  → denudación → penetración de la membrana pelúcida (acrosina) → fusión
  → bloqueo de la polispermia (reacción cortical) → reasunción de la
  meiosis II (o ovocito II fecundado se converte direto em célula huevo,
  não chega a formar um "óvulo livre") → formación de los pronúcleos →
  singamia → anfimixis.
- **Aneuploidías**: no disyunción (meiótica ou mitótica) como causa;
  gameto aneuploide + gameto normal → cigoto monosómico (falta 1
  cromosoma) ou trisómico (sobra 1); no disyunción mitótica pós-cigótica
  → mosaicismo.
- **8 preguntas complementarias** (MCQ + V/F) + **14 flashcards**,
  cobrindo as 10 fases e os 2 tipos de aneuploidia — revisadas contra
  autodenúncia/distratores exóticos (grep, mesmo padrão já usado nos
  checkpoints anteriores): nenhum achado.
- Espelhadas no mesmo card "Bloque 16" do Banco general (renomeado
  "Ciclo celular, meiosis y fecundación") e no mesmo h3 "Bloque 16" das
  Flashcards generales — as 3 cópias idênticas, confirmado via grep.
- Contadores atualizados: banco geral 152→**160** preguntas (103 série
  principal + 49→**57** prática adicional); flashcards 191→**205**;
  cabeçalho do arquivo passa a citar "fecundación y aneuploidías".

### Verificação

- **HTML**: `b`/`strong`/div/ul/li/p/section/table/tr/td/th/details/
  summary/h2/h3/h4/ol todos pareados. Um desbalanceamento de `</b>`↔
  `<strong>` foi introduzido por um erro de digitação nesta mesma rodada
  (`<strong>membrana pelúcida</b>`) — detectado pelo Guard (🔴 vermelho
  na primeira execução) e **corrigido antes do push final**; a execução
  seguinte do Guard confirmou zero desbalanceamentos novos.
- **Espelho**: `quiz-item` = 320 (= 160×2); `flashcard` = 410 (= 205×2).
- **Guard** (`--base origin/main --head HEAD`): 🟡 passou com avisos
  informativos esperados (escopo/registro-tarefas/guard-integridade);
  banco-geral 160=160, gabaritos válidos, nenhum arquivo crítico
  alterado, 1 desbalanceamento de HTML pré-existente (herdado, não
  introduzido nesta rodada — confirmado contra `origin/main`).
- **Annotation-safety**: 0/0/0 em `user_highlights`/`user_ink_strokes`/
  `user_notes` para `subject_slug ilike '%biolog%'`, reconfirmado.
- Commit `c2cd9bde` (após correção do typo HTML), push para
  `claude/biologia-unidad-viii-x-471`.

**Com este checkpoint, a UNIDAD X está completa** (ciclo celular,
meiosis, fecundación, aneuploidías) e a Issue #471 fica cumprida na
íntegra para Biología, respeitando sempre a instrução de não renumerar
blocos existentes.

## Rodada de correção científica (pós-checkpoint 3/3) — metáfase/anáfase I, conclusão da meiose II, no disyunción, señalización

Quatro achados do auditor nesta rodada, corrigidos em todos os lugares
(resumo, key-box, questão+gabarito+explicação em corpo e Banco general,
flashcards em bloco e Flashcards general):

1. **Metáfase I → anáfase I** (já corrigido numa rodada anterior a esta
   seção do arquivo — ver histórico de commits; registrado aqui por
   completude): o key-box "Lo esencial (meiosis)" dizia que os
   homólogos se separam na metáfase I. Corrigido para anáfase I; a
   metáfase I apenas alinha os bivalentes.

2. **"Dos espermatocitos II idénticos"**: a explicação e o flashcard
   afirmavam que os dois espermatocitos II resultantes da meiose I são
   idênticos. Fisicamente o reparto de citoplasma é igual, mas
   geneticamente **não são idênticos**: o crossing over (paquinema) e a
   segregação ao azar dos homólogos recombinados garantem que cada um
   recebe uma combinação distinta de alelos. Corrigido para "iguales en
   tamaño pero no idénticos genéticamente", com a razão explicitada.

3. **No disyunción — escopo incompleto**: a explicação de aneuploidías
   só mencionava "falla al separar homólogos", o que descreve apenas a
   não disjunção da **meiose I**. Ampliado para cobrir também a falha
   de separação das **cromátides irmãs na meiose II** e numa **divisão
   mitótica** (pré- ou pós-cigótica). Reescritos o h4, o parágrafo
   introdutório, a tabela (nova coluna "Qué no se separa" + linha
   própria para meiose II, antes ausente) e os textos correspondentes
   no key-box e no flashcard "Aneuploidía".

4. **"Solo los esteroideos lo hacen así"**: frase no bio-cap de
   receptores citosólicos (Bloque 15) que contradizia, duas frases
   antes, no mesmo parágrafo, a explicação de que o receptor de
   estrógenos é uma excepción dentro do próprio grupo esteroideo (pode
   ser predominantemente nuclear mesmo sem ligante). Removida a
   generalização; reescrito para reforçar que nem todo o grupo
   esteroideo segue o padrão hsp90/translocação, e que o grupo
   tiroideo/retinoico/vitamina D tampouco o segue.

**Padronização do uso de "óvulo":** a introdução do bloco de
Fecundación e o flashcard correspondente diziam "fertilización del
óvulo por el espermatozoide", o que contradizia a precisão já
estabelecida no checkpoint anterior (de que a meiose II só se completa
*durante* a fecundación, sem um óvulo livre formado antes dela).
Ajustado para "fertilización del ovocito II", com nota explícita de
que não há um "óvulo" já formado antes da fecundación. O uso de
"óvulo" no bloco de Meiosis (sem contexto de fecundación) foi mantido
sem alteração — ali a simplificação é válida, porque não há
fecundación em curso que force a precisão terminológica.

### Verificação (esta rodada)

- HTML balanceado (`b`/`strong` incluídos; a tabela de aneuploidías
  ganhou uma coluna e uma linha, `tr`/`td`/`th` seguem pareados).
- Espelho: `quiz-item` = 320, `flashcard` = 410 — **inalterados**, pois
  nenhuma questão/flashcard foi criada ou removida, só texto corrigido.
- Guard (`--base origin/main --head HEAD`): 🟡 sem vermelho, banco-geral
  160=160, gabaritos válidos, 1 desbalanceamento de HTML pré-existente
  (herdado, não introduzido nesta rodada).
- Annotation-safety: 0/0/0 para `subject_slug ilike '%biolog%'`,
  reconfirmado.
- Commit `1d4600ec`, push para `claude/biologia-unidad-viii-x-471`.

## Rodada de correção — viés das 22 MCQ novas (gabarito e tamanho de alternativa)

Auditoria sobre as 22 MCQ únicas adicionadas nesta PR (Bloques 15/16)
encontrou dois vieses detectáveis sem precisar de conhecimento da
matéria:

- **14 das 22** tinham a alternativa correta como a única mais longa
  do grupo (em alguns casos, dramaticamente: 166 vs. 57 caracteres,
  157 vs. 56, 132 vs. 33).
- **14 gabaritos caíam na letra "b"**, 7 em "c", 1 em "a" e **nenhum em
  "d"** — padrão previsível o suficiente para ser explorado sem saber
  a matéria (Lei 8-A.7).

### O que foi feito

Revisada questão por questão (nenhuma das 22 está rotulada "Basada en
examen" — todas são "Pregunta complementaria", então não havia questão
real a preservar literalmente):

- **Gabarito redistribuído**: a=6, b=6, c=5, d=5, numa sequência sem
  ciclo nem rotação previsível.
- **Viés de tamanho**: eliminado nos casos graves e reduzido a uma
  variação residual leve (máximo 19%, a maioria sob 10%) nos demais —
  deixou de ser um padrão de "a mais longa é sempre a certa". Alcançado
  por reescrita/alongamento dos distratores (preservando seu sentido
  científico) e, em alguns casos, encurtamento moderado da alternativa
  correta sem perder a substância.
- **Distratores próximos/plausíveis** mantidos ou reforçados onde
  cabia — ex.: AMPc/GMPc como par confusível clássico com IP3/DAG;
  hialuronidasa vs. acrosina (ambas enzimas reais da fecundación, em
  fases diferentes); anáfase I vs. anáfase II; cigonema vs. paquinema;
  e, na questão do ciclosoma, um distrator que reproduz deliberadamente
  o erro conceitual real já corrigido nesta mesma PR (APC/C "corta"
  cohesinas diretamente) — serve como teste da própria distinção.
- **Nenhuma resposta científica foi alterada** — apenas a posição e a
  redação das alternativas. Onde a explicação fazia referência à letra
  antiga de um distrator (ex.: "la acrosina (a)"), a referência foi
  atualizada para a nova posição.
- Espelhado identicamente no Banco general — as cópias já eram
  byte-idênticas ao corpo nesta matéria, e assim permaneceram.

### Verificação

- `quiz-item` = 320, `flashcard` = 410 — inalterados (só texto de
  alternativas mudou, nenhuma questão criada/removida).
- HTML balanceado (`b`/`strong` inclusos).
- Nenhuma alternativa com linguagem absolutista ("siempre"/"nunca"/
  "100%") ficou na opção correta — confirmado por varredura; onde esses
  termos aparecem, estão nos distratores (overgeneralizações erradas),
  o que é desenho legítimo, não um vazamento de gabarito.
- Guard (`--base origin/main --head claude/biologia-unidad-viii-x-471`):
  🟡 sem vermelho, banco-geral 160=160, gabaritos válidos, 1
  desbalanceamento de HTML pré-existente (herdado).
- Annotation-safety: 0/0/0, reconfirmado.
- Commit `3c92769e`, push para `claude/biologia-unidad-viii-x-471`.

## Rodada de correção — distratores elimináveis por lógica e linguagem absolutista

Feedback do José após a rodada anterior: a distribuição de letras e o
viés de tamanho melhoraram, mas parte das alternativas ainda era
eliminável **sem conhecimento da matéria** — por lógica (contradizer o
próprio enunciado, números estruturalmente impossíveis) ou por palavras
absolutas ("siempre", "nunca", "por completo", "exclusivamente",
"irreversible", "permanente") que sinalizam "provavelmente errado" por
heurística geral de prova, não por biologia.

Priorizadas as 7 questões citadas pelo José, mais a questão do ovocito I
(pedido explícito) e mais 4 itens secundários achados na revarredura
completa das 22 questões. Nenhuma das 11 restantes (1, 3, 5, 6, 7, 8, 11,
12, 13, 17) precisou de alteração.

| # | Tema | Problema | Correção |
|---|------|----------|----------|
| 2 | Receptor tiroideo | "nunca" (c), "por completo"/"inmediatamente" (d) | b/c/d reescritas como quase-acertos: papéis invertidos, ambas citosólicas com velocidade de liberação diferente, mecanismo alternativo por segundo mensageiro |
| 9 | APC/C | "por completo" (b), "permanente e irreversible" (c) | b passa a dizer que o APC/C degrada as cohesinas diretamente (erro conceitual plausível, já teste da distinção ensinada); c troca para ciclina G1/complexo SPF, erro de fase |
| 10 | Eritropoyetina | "exclusivamente" (a) | a/b/c reescritas com mecanismos celulares específicos e plausíveis (endotélio tubular, autorreceptor, quimiorreceptor hipóxico) em vez de generalidades abertas |
| 14 | Anáfases I/II | "siempre" (a, c) contradizia abertamente a distinção ensinada | a/c reescritas como confusões conceituais reais (achar que ambas separam homólogos completos, ou que o centrómero se divide igual nas duas) |
| 15 | Ovocito I (enunciado) | "dos espermatocitos II iguales" sem especificar que a igualdade é de tamanho, não genética | enunciado passa a dizer "iguales **en tamaño**" |
| 15 | Ovocito I (opção d) | "cuatro óvulos" — estruturalmente impossível (uma única divisão meiótica produz no máximo 2 produtos), eliminável sem saber o conteúdo | opção d trocada por "dos cuerpos polares de igual tamaño, sin que se forme ningún ovocito II" |
| 16 | Productos de la meiosis | "solo 1 espermátide/1 óvulo" eliminável pela regra geral "meiose = 4 produtos", sem exigir a nuance feminina | c/d trocadas por contagens numéricas próximas (4/2 e 4/3) que exigem saber exatamente a assimetria feminina |
| 20 | Conclusión de la meiosis II | as 3 alternativas erradas (a, c, d) contradiziam abertamente a premissa do próprio enunciado (que a meiose II se completa durante a fecundación) | a/c/d reescritas mantendo o fato do enunciado intacto e errando apenas na explicação terminológica/causal (nome convencional, ordem dos eventos, convenção da cátedra) |
| 21 | Singamia | "se degradan... solo el ADN materno" (d) — eliminável por conhecimento geral de herança biparental, externo ao tema específico | d trocada por um erro específico de embriologia (programa genético de só um pronúcleo se ativa) |
| 4 | Ciclo celular/receptor (secundário) | "exclusivamente" (a), "permanente" (c), "irreversible" (d) | reescritas como quase-acertos específicos (apoptosis como função principal, bloqueio transitório na fase S, fosforilação que amplifica o sinal) |
| 18 | Reacción acrosómica (secundário) | "por completo" (b) | removida a palavra, sentido científico mantido |
| 19 | Fecundación (secundário) | "completa e inmediata" (a) | troca por reivindicação de timing específica e plausível (fusão antes da penetração) |
| 22 | Aberraciones cromosómicas (secundário) | "por completo"/"extenso" (c) | troca por "afecta a un segmento específico", mantendo o erro de classificação que a questão testa |

### Critérios aplicados a cada distrator reescrito

1. Nenhuma palavra absolutista ("siempre"/"nunca"/"por completo"/
   "exclusivamente"/"irreversible"/"permanente") nas alternativas erradas
   novas.
2. Nenhuma alternativa contradiz abertamente a premissa do próprio
   enunciado.
3. Nenhuma alternativa é estruturalmente impossível (ex.: mais produtos
   do que uma divisão celular permite).
4. Nenhuma alternativa é eliminável por conhecimento geral externo ao
   tema específico da questão (ex.: herança biparental básica).
5. Cada alternativa errada nova é um "quase-acerto": troca papéis,
   mistura um fato real com uma classificação errada, ou propõe um
   mecanismo específico plausível — exige saber a matéria para rejeitar.

### Verificação

- Gabaritos e letras corretas **inalterados** — só a redação das
  alternativas erradas (e, na questão 15, parte do enunciado) mudou.
- `quiz-item` = 320 — inalterado (edição só de texto).
- HTML balanceado (`div`/`ul`/`li`/`p`/`section`/`table`/`tr`/`td`/`th`/
  `details`/`summary`/`h2`/`h3`/`h4`/`ol`/`strong`/`b` — todos os pares
  batendo).
- Explicações (incl. referências cruzadas por letra, ex. "la acrosina
  (b)", "el MPF (a)") revisadas uma a uma — nenhuma posição de letra foi
  movida nesta rodada, então nenhuma referência ficou inconsistente;
  conferido também que a explicação de cada item continua reforçando a
  ciência correta e rebatendo especificamente os novos distratores
  (ex.: MCQ 9 — "El APC/C no corta nada directamente" já desmonta o novo
  distrator b).
- Espelho corpo↔Banco general: mantido byte-idêntico (todas as edições
  com `replace_all`, 2 ocorrências cada).
- Guard (`--base origin/main --head claude/biologia-unidad-viii-x-471`):
  🟡 PASSOU COM AVISOS — banco-geral 160=160, gabaritos válidos, 1
  desbalanceamento de HTML pré-existente (herdado, não introduzido),
  avisos de escopo/registro-tarefas (mesmo padrão das rodadas
  anteriores, não específico desta).
- Annotation-safety (Supabase, `subject_slug ilike '%biolog%'`):
  `user_highlights` = 0, `user_ink_strokes` = 0, `user_notes` = 0 —
  reconfirmado.
- Commit `0789d72e`, push para `claude/biologia-unidad-viii-x-471`.
- PR #476 (Anatomía Patológica II) **não foi tocada** nesta rodada,
  conforme instrução explícita.

## Rodada de correção — pista de linguagem residual (conclusión de la meiosis II)

Após o checkpoint anterior, o José apontou que o distrator (d) daquela
mesma questão — "Porque la cátedra prefiere, por convención, llamar
'pronúcleo' a ambos núcleos haploides desde este punto, sin relación con
el momento de la fecundación" — ainda carregava uma pista de linguagem:
atribuir a nomenclatura a uma "preferência da cátedra" sem relação com a
biologia é reconhecível como "provavelmente errado" sem saber a matéria,
mesmo sem palavra absolutista.

**Correção**: (d) trocada por um erro conceitual específico e plausível —
confundir o momento em que o núcleo materno passa a se chamar pronúcleo
(ao completar a meiosis II, conforme a própria questão descreve) com um
evento posterior e distinto (a singamia). Nova redação: "Porque el
núcleo materno solo pasa a llamarse pronúcleo cuando ocurre la singamia,
no en el momento en que termina la meiosis II."

Esse erro exige saber a sequência real de eventos (meiosis II completa →
pronúcleo imediatamente, antes da singamia) para ser rejeitado — não há
mais tell editorial nem palavra absolutista.

### Verificação
- Gabarito (b) e letras **inalterados**.
- A explicação já existente ("...pasa directo a ser el pronúcleo
  femenino...") continua refutando especificamente o novo distrator,
  sem necessidade de edição.
- `quiz-item` = 320, HTML balanceado (todos os pares batendo).
- Espelho corpo↔Banco general: byte-idêntico (`replace_all`, 2
  ocorrências).
- Guard (`--base origin/main --head claude/biologia-unidad-viii-x-471`):
  🟡 PASSOU COM AVISOS — mesmo padrão das rodadas anteriores (banco-geral
  160=160, gabaritos válidos, 1 desbalanceamento de HTML pré-existente
  herdado).
- Annotation-safety: 0/0/0, reconfirmado.
- Commit `3ae7417a`, push para `claude/biologia-unidad-viii-x-471`.
- PR #476 (Anatomía Patológica II) **não foi tocada** nesta rodada.

## Pendências explícitas

1. **Renumeração VIII→IX→X**: a Issue #471 pede explicitamente não
   renumerar o Bloque 14 (UNIDAD IX) sem combinar primeiro na #67, porque
   a ordem didática correta seria VIII→IX→X mas a ordem de descoberta/
   adição foi IX→VIII→(X). Mantidos os blocos na ordem em que foram
   adicionados (14=IX, 15=VIII, 16=X), sem renumerar nada existente.
   Decisão de reordenar — se desejada — fica para José/Issue #67.
2. ~~**Merge da #469**~~ — **resolvido**: a #469 mesclou em
   `2026-10-10T21:49:58Z`; a base da #478 já foi retargetada para `main`
   e a branch resincronizada sem conflitos (ver seção acima).
3. **Nenhuma pendência de conteúdo restante para esta issue.** PR #478
   permanece em draft, pronta para a auditoria de merge do José.
