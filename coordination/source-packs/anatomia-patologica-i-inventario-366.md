# Anatomía Patológica I — Inventário de fontes e pendências (Issue #366, item 1)

**Natureza desta entrega: inventário apenas.** Nenhuma linha de `anatomia-patologica.html` foi alterada nesta rodada. O objetivo é preparar a próxima etapa (quem assumir a correção) com fontes conferidas, achados verificados e uma lista de candidatos — não executar a correção em si.

Tarefa de origem: [Issue #366](https://github.com/Repassomed/Repasso-Med-Site-/issues/366) — "P1 · Auditoria fina final 27/27", item 1 (Anatomía Patológica I):
> "confirmar e ampliar explicações curtas nas ~20 perguntas apontadas, no corpo e Banco; comparar semanticamente as aparições de 'Cuerpos de Russell' antes de deduplicar; preservar conteúdo correto."

Arquivo: `Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/anatomia-patologica.html` — esta é a matéria **Anatomía Patológica I** (sem sufixo numérico no nome do arquivo; `anatomia-patologica-practica.html` é sua Práctica, já fechada no item 2 do #366; `anatomia-patologica-ii.html`/`anatomia-patologica-ii-practica.html` são a matéria II, tratada em outras PRs/sessões, fora do escopo aqui).

## 0. Verificação de conflito (antes de iniciar)

Consultada a Central de Coordenação ([Issue #67](https://github.com/Repassomed/Repasso-Med-Site-/issues/67)) e `coordination/tasks.json` na `main` atual: **nenhuma reserva ou trabalho ativo encontrado sobre `anatomia-patologica.html`** nos registros mais recentes (checagem até 2026-10-11). Reservas ativas identificadas e respeitadas, **não tocadas**:
- Claude 2 — Farmacología II (`farmacologia-ii.html`, `styles.css`), PR #474.
- Caneta/piloto — `assets/rm-tools-v2.js`, `rm-materia-sistema.js`, `rm-pilot.js`, `rm-modes.js`, `rm-layout.js`, `rm-materia-nav.js`, tags `?v=` em `index.html`, `tools/qa/caneta-*/**`, `docs/caneta-*/**` (PR #479, branch `claude/caneta-ipad-456`).

Este trabalho usa uma branch nova e separada (`claude/anatomia-patologica-i-inventario-366`), a partir da `main` atual, sem tocar nenhum dos arquivos acima.

## 1. Fontes no Drive

Localizada a pasta `5 semestre/Anatopatologia` (id `1p5KWlpvYoU_3Eed2zDGH5IlU6Omai4PO`), que corresponde a esta matéria (distinta de `6 semestre/Anatopatologia II` e de `5 semestre/Anatopatologia Praticas`). Conteúdo encontrado:

- **`Imagens/`** — 5+ arquivos `.webp` nomeados `ap1_bNN_...` (ex.: `ap1_b01_01_cuatro_pilares.webp`, `ap1_b02_01_cuatro_adaptaciones.webp`, `ap1_b09_05_molecular_marcadores.webp`, `ap1_b09_06_tumores_especiales.webp`). Esses nomes **já correspondem exatamente** aos assets referenciados pelo HTML publicado (`/assets/img/anato/ap1_bXX_...webp`) — ou seja, **não são fonte bruta pendente**: já foram produzidos e incorporados ao site em rodada(s) anteriores (consistente com as tarefas já concluídas #379/#440 desta mesma sessão de trabalho).
- **`INTRUÇÕES E QUESTOÕES.docx`** (id `1E5JEkiIBzUkHZdGMLOB1N9a9n-67QJOv`, 14.945 bytes) — título interno: *"INSTRUÇÕES PARA ATUALIZAÇÃO DA DISCIPLINA DE ANATOMÍA PATOLÓGICA"*. **Não consegui extrair o corpo completo do documento** nesta sessão: o leitor de texto do Drive só devolveu o título, e a tentativa de decodificar o `.docx` bruto (base64 → zip) falhou por corrupção de 1 caractere na transcrição manual do conteúdo através do contexto da conversa — um problema de transporte desta sessão, não do arquivo em si. **Pendência explícita:** reabrir este arquivo numa sessão nova (chamando `download_file_content` e decodificando o zip diretamente em disco, sem transcrever o base64 manualmente) antes de assumir que seu conteúdo já foi todo incorporado.

Não há, nesta pasta, PDFs de slides da cátedra em formato bruto — o que sugere que o conteúdo da matéria já passou por pelo menos uma rodada completa de incorporação em sessão(ões) anterior(es) (refletido nas tarefas internas já concluídas "#379 — comparar PR antiga com main" e "#440 — corrigir figuras de mielina e necroptosis"). Este inventário, portanto, foca no que está **hoje publicado no HTML**, que é a fonte mais confiável disponível agora.

## 2. Inventário do arquivo atual

- **Quiz-items totais:** 718 (359 no corpo + 359 no Banco general, `id="banco-oficiales-anato"`, que começa na linha 4723) — espelho agregado 1:1 confirmado.
- **Flashcards:** 297.
- Não foram encontrados desbalanceamentos de contagem agregada; a análise abaixo é sobre **conteúdo e organização**, não sobre paridade numérica corpo×Banco (essa já bate).

## 3. "Cuerpos de Russell" — análise semântica das aparições (achado concreto)

A matéria menciona "Cuerpos de Russell" em **12 pontos distintos** do arquivo. Classificação:

| # | Linha(s) | Tipo | Papel |
|---|---|---|---|
| 1 | 308 | Prosa (card "Ocho distinciones") | Ponteiro de 1 linha para o conceito; não é ensino nem questão. |
| 2 | 2432–2433 | Prosa (h4 dedicado) | **Ensino principal** do conceito, dentro do bloque de Acumulaciones de proteínas. |
| 3 | 2113–2131 ↔ 5859–5869 | Quiz-item CASO (corpo↔Banco, espelhado corretamente) | Cuerpos de Russell aparece como **alternativa incorreta** numa questão sobre Cuerpos de Councilman (apoptose hepática) — função é diferencial, não é uma questão "sobre" Russell. |
| 4 | **2133–2137 ↔ 5806–5809** | Quiz-item DEFINE (corpo↔Banco, espelhado corretamente) | "Resultan cuando el plasmocito sintetiza Ig en exceso…" — está fisicamente localizada no **bloque de apoptose/morte celular** (entre questões sobre BCL-2 e Councilman), longe do h4 que ensina o conceito. No Banco, aparece corretamente sob a categoria **"Acumulaciones y Pigmentos"**. |
| 5 | **2623–2626 ↔ 6199–6204** | Quiz-item DEFINE (corpo↔Banco, espelhado corretamente) | "Ocurren cuando el plasmocito produce Ig en exceso…" — está localizada **imediatamente após o h4 dedicado** (2432), sua posição natural. No Banco, porém, aparece sob a categoria **"Inflamación Crónica"** — rótulo que não corresponde ao bloque onde a questão realmente mora no corpo. |
| 6 | 2548 ↔ (dentro do bloco "Acumulaciones y Pigmentos" do Banco) | Quiz-item MCQ (corpo↔Banco, espelhado corretamente, alternativas reordenadas conforme Lei 8-A.7) | "¿De qué están llenos los cuerpos de Russell?" — a) Inmunoglobulina. Mirror correto, sem problema. |

### O achado real

Itens #4 e #5 são **duas questões DEFINE quase idênticas** sobre o mesmo conceito ("Cuerpos de Russell: acumulación de inmunoglobulinas en plasmocitos por defecto de secreción"), com textos de resposta parafraseados de forma muito próxima (mesma estrutura, mesmos exemplos clínicos — H. pylori, sífilis, mieloma — só a redação muda). Cada uma tem seu próprio par corpo↔Banco correto (não há quebra de espelho), mas:

- **São semanticamente redundantes entre si** — um aluno que já respondeu a #4 não aprende nada novo ao responder #5, e vice-versa. Pela Lei 8-A.1 ("um aluno que acertou a primeira pode errar a segunda por não saber algo a mais? Se não, é duplicata"), a resposta aqui é **não** — são duplicata semântica.
- A questão #5 está posicionada no bloque certo do corpo (logo após o h4 que ensina o conceito), mas sua cópia no Banco está **classificada sob a categoria errada** ("Inflamación Crónica" em vez de "Acumulaciones y Pigmentos"), o que sugere ela foi originalmente escrita/copiada no contexto de inflamação crônica (onde infiltrado plasmocítico intenso também é relevante) e depois reaproveitada, sem atualizar a categorização do Banco.
- A questão #4, por outro lado, está no bloque **errado** do corpo (misturada com apoptose/Councilman), apesar de estar corretamente categorizada no Banco.

**Recomendação para a próxima etapa (não executada aqui):** aplicar a Lei 8-A.1-B (questão canônica mais completa) para decidir qual das duas versões preservar como a questão real sobre o conceito, e qual descartar ou fundir — preservando o id/posição mais seguro e corrigindo a categorização do Banco em consequência. Nenhuma das duas altera gabarito nem está rotulada como "Basada en examen", então a reformulação é segura sob a Lei 8-A.9.

## 4. Candidatos a "explicação curta" (confirmação do item do #366)

Não tive acesso ao documento original que listou "~20 perguntas apontadas" com explicação curta (não encontrado em `coordination/` nem nos comentários recentes da #67/#366 consultados). Para não inventar essa lista, rodei uma varredura própria, objetiva e reproduzível sobre o corpo do arquivo: contei, por quiz-item, se existe pelo menos um parágrafo de explicação (marcadores `📚 Desde cero`, `📝 Por qué/Explicación`, `💡 Correlación clínica`) além da linha "✓ Respuesta" — **excluindo tipos CITA/COMPLETAR**, cuja brevidade é parte legítima do formato (pedem "citar 2 itens", não raciocínio).

**Resultado: 24 quiz-items do tipo MCQ/CASO/DEFINE/V-F no corpo têm hoje uma resposta "nua", sem nenhum parágrafo de explicação/raciocínio.** Essa contagem bate em ordem de grandeza com os "~20" citados no #366 e é um bom ponto de partida — mas deve ser tratada como candidata, não como a lista definitiva, até confirmação humana.

Lista completa (tipo | enunciado resumido):

1. DEFINE — ¿Cuál es la coloración de preferencia para evidenciar la acumulación de hemosiderina celular parenquimatosa? *(aparece 2×, ver nº 15)*
2. DEFINE — ¿Cuál es el método diagnóstico primario de elección para el estudio de un tumor de histogénesis incierta?
3. DEFINE — Completá la definición de PATOGENIA: "Se refiere a la secuencia de ____, bioquímicos y moleculares..." *(aparece 2×, ver nº 13)*
4. MCQ — Para confirmar depósitos de hierro (hemosiderina) en el hígado de un paciente con hemocromatosis, la tinción...
5. MCQ — ¿Cuál de las siguientes técnicas es el método de elección para estudiar la ultraestructura de las organelas...?
6. DEFINE — Diferenciá biopsia, necropsia y citología.
7. CASO — Paciente con yeso en la pierna durante 8 semanas; al retirarlo, la pantorrilla es visiblemente más delgada...
8. MCQ — Fumador crónico; biopsia bronquial muestra epitelio cilíndrico ciliado reemplazado por...
9. DEFINE — Definí "metaplasia" y explicá por qué se considera potencialmente peligrosa.
10. MCQ — La causa más frecuente de lesión celular es...
11. CASO — Paciente con neumonía grave y saturación de O₂ de 86%; ¿qué alteración celular temprana y reversible...?
12. CASO — Paciente con IAM presenta daño adicional al restablecer el flujo sanguíneo (lesión por reperfusión)...
13. DEFINE — Definí PATOGENIA completando: "Se refiere a la secuencia de ____, bioquímicos y moleculares..."
14. DEFINE — Necrosis liquefativa: *(definición sin desarrollo)*
15. DEFINE — ¿Cuál es la coloración de preferencia para evidenciar hemosiderina celular parenquimatosa?
16. MCQ — La célula gigante multinucleada con núcleos en herradura periférica, típica de la tuberculosis...
17. MCQ — ¿Cuál de las siguientes células PREDOMINA en la mayoría de las reacciones inflamatorias crónicas?
18. CASO — Paciente con enfermedad de Crohn; biopsia intestinal muestra colecciones de macrófagos epitelioides sin necrosis...
19. DEFINE — Definí "célula epitelioide" en el contexto de un granuloma.
20. MCQ — ¿Cuál de los siguientes tumores, a pesar de terminar en "-oma", es MALIGNO?
21. MCQ — La vía de diseminación inicial más habitual de los CARCINOMAS es...
22. CASO — Esófago distal con epitelio escamoso reemplazado por epitelio cilíndrico con células caliciformes...
23. DEFINE — Diferenciá gradación de estadificación de un tumor.
24. DEFINE — Definí anaplasia y citá 2 rasgos que la acompañan.

**Nota metodológica:** a varredura cobriu ~271 dos 359 quiz-items do corpo (alguns itens de estrutura mais complexa, como os de classe `quiz-item interactive`, não foram capturados pela expressão regular usada e ficaram fora desta passada). Recomendo à próxima etapa rodar uma segunda passada, mais robusta, sobre os ~88 itens não cobertos antes de considerar a lista fechada.

## 5. Pendências explícitas para a próxima etapa

1. **Reabrir e extrair corretamente** `INTRUÇÕES E QUESTOÕES.docx` (ver seção 1) para confirmar se há conteúdo ainda não incorporado.
2. **Decidir e aplicar a deduplicação de "Cuerpos de Russell"** (seção 3) — qual das duas DEFINE é a canônica, corrigir a categorização do Banco, mover a questão remanescente para o bloque correto se necessário.
3. **Confirmar/ampliar as explicações** dos 24 itens candidatos (seção 4), mais uma segunda passada sobre os itens de estrutura complexa não cobertos.
4. **Preservar todo o conteúdo correto** — nenhuma das ações acima envolve remover questões ou alterar gabaritos; são reformulações de explicação e, no caso de Russell, uma fusão/descarte de duplicata semântica genuína (Lei 8-A.1-B permite, pois nenhuma das duas está rotulada "Basada en examen").
5. Antes de editar: reconfirmar annotation-safety (`user_highlights`/`user_ink_strokes`/`user_notes` para `subject_slug` desta matéria) e registrar reserva na Issue #67.

Nenhuma alteração de conteúdo foi feita nesta rodada. Este arquivo é o único artefato desta entrega.
