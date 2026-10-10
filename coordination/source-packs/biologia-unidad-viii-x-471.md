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
   permanece em draft, aguardando auditoria humana/ChatGPT antes de
   qualquer decisão de merge.
