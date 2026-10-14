# Pendências do ensaio global do layout novo — atualizações de 2026-10-11 (2.ª rodada) e 2026-10-12 (§0-C, §0-D: rodada com o código das PRs de integração)

> **Nada foi ativado.** Layout global **não** está autorizado: depende de ordem expressa de José. Este documento só reconcilia o que `MATRIZ.md` (#457/#459) deixou aberto com o que mudou na `main` depois dele. Nenhum arquivo reservado foi tocado; os números de cada seção são os da rodada indicada nela (a mais recente é a §0-D).
> **Ensaio técnico ≠ aprovação das 27 matérias.** `PASSA` na matriz significa "o componente funcionou no Chromium com um tema hipotético", não "a matéria está pronta, revisada ou com identidade aprovada".

## 0-D · #487 refeita (conteúdo solto) + ensaio com #486/#488 já na `main` (12/10)

**Lista exata e conta:** `MATRIZ.md` §0-A (gerada do catálogo × `get-materia` × arquivos). **27 ativas = 1 piloto (`semiologia-ii`) + 1 fora (`imagenologia`) + 25 elegíveis.**
Bioestadística, a 2.ª excluída, **não é uma das 27** (`bioestadistica.html` sem rota, #213); `anatomiapatologica-ii.html` e `anatomiapatologica-ii-practica.html` são cópias órfãs, não matérias. Todo «25/25» abaixo é sobre essas 25 — **o piloto fica fora da conta**.

**C3 refeita na #487.** A 1.ª versão escondia tudo o que fica fora de `section[id]` com a navegação montada. O inventário (`CONTEUDO-SOLTO.md`, ferramenta `soltos.cjs`) mostrou o que isso tiraria do aluno: o hero de 9 matérias e o da Semiología II na «Página completa» (índice geral), o banner «Repaso General · Simulacro» de 19 e uma `<section class="container">` **sem id com 20 questões** na Anatomía Patológica Práctica, que ficaria inalcançável. Agora o código **classifica**: abertura/fecho/conteúdo ficam no índice geral, o anexo (banner) só com o bloco dele; nada vaza mais para os blocos (na `main` o hero, o banner e a seção sem id aparecem em **todos** os blocos). Piloto: sem mudança.

| Rodada (`main` `f5a434c2` = #486 + #488 mescladas) | Matérias | Verificações | Falhas |
|---|---|---|---|
| Layout **como está** (só `main`, sem simulação) | 27 | 6 200 (elegíveis 5 724) | 280 — **as 25 elegíveis falham**: resíduo fora de `section[id]` (C3), cadeia Anterior/Próximo (C4) e agregadoras sem descritor (`data-rm-agrega`); o piloto falha só em `indice/sem-residuo` |
| Layout **com correção** (`RM_ENSAIO_REF=5cc04ddf` = `main` + #487) | 27 | 6 384 (elegíveis 5 896) | **0 — 25/25 elegíveis** (+ piloto e Imagenología como referência) |
| Uso (`interacao.cjs`, mesmo ref; caneta CDP, palma, rolagem, tabela larga, pinça, goma, grifo, troca de bloco/modo, recarregar, questões, flashcards, audiobook) | 27 | 2 529 (elegíveis 2 344) | **0 — 25/25 elegíveis**, 0 bloqueio |
| Checks novos do conteúdo solto | 27 | `preserva-conteudo-solto` 108 · `anexo-com-seu-bloco` 76 (19 matérias) | 0 |
| Controle negativo: a 1.ª versão da #487 (`89bc63f5`, regra que escondia tudo) | AP Práctica | 124 | **2 — `preserva-conteudo-solto` «0 de 2 visíveis»** (hero + seção sem id com 20 questões): o check pega exatamente o defeito |

Origem das correções nessa rodada: **já na `main`** A1, C1, C2, C5, C6, C7 · **PR aberta #487** A2, A3, C3, C4 · **simuladas** A7/C8 (caneta, aguardam a #484) e o descritor de tema por matéria (hipótese técnica). `e9ae75d2` (ponta atual da #487) difere de `5cc04ddf` só por um comentário.

Incidente da rodada: na mescla da tabela larga (`--so-tabela`) o Chromium caiu em `fisiopatologia-ii` e as 8 seguintes receberam «interrompido» (exceção `browser has been closed`, 0 s). Reexecutadas só essas 8: 21 verificações, 0 falha (45 no total, 19 matérias, igual à rodada anterior). A mescla agora marca a exceção (`de: 'so-tabela'`) e a troca na próxima mescla em vez de acumulá-la.

**Suítes do piloto no branch da #487:** `sistema` 124/124 · `nav-sistema` 216/216 · `cover` 198/198 · `layout` 535/535 · **novo** `soltos.test` 16/16.

## 0-C · Integração em PRs pequenas (12/10) — o que o código real já entrega

Pedido de José (12/10): integrar layout e navegação em PRs pequenas, sem ativação global; áudio por matéria aos poucos; **não mexer no motor da caneta enquanto Claude 1 trabalha na #484**.

| PR | Arquivos | Correções | Guard |
|---|---|---|---|
| Repassomed/Repasso-Med-Site#486 | `rm-layout.js` (+ `cover`/`sistema` test na regra nova) | A1, C2, C5 | ✅ · mesclada |
| Repassomed/Repasso-Med-Site#487 | `rm-materia-sistema.js/.css` | A2, A3, C3, C4 | ✅ |
| Repassomed/Repasso-Med-Site#488 | `rm-materia-nav.js` | C1, C6, C7 | ✅ · mesclada |
| Repassomed/Repasso-Med-Site#489 | `rm-audio-boot.js`, `_audio/lib.js` (+ testes) | A4, A6 | ✅ (aviso: função do servidor, olho humano) |

**Ensaio com o código das três PRs de layout juntas** (`RM_ENSAIO_REF=3ee1ce1b` = merge local de #486 + #487 + #488 sobre a `main` `9cff8ca0` — para reproduzir, mescle as três e aponte para o resultado; variante «com correção»; o ensaio reconhece cada correção no código e **deixa de simulá-la**):

| | Resultado |
|---|---|
| Correções de layout vindas do código real | **A1, A2, C1–C7: todas** (`NO-CODIGO` nas 27 matérias) |
| Ainda simuladas | A7 e C8 (motor da caneta — adiados até a #484) e o marcador `data-rm-agrega` que o **descritor** de cada matéria vai declarar (passo 8 de `PATCHES` §D) |
| 25 elegíveis × 4 larguras | **25 / 25 PASSA** (6 200 verificações nas 27 do catálogo, 0 falha) |
| Uso (`interacao.cjs`) com o mesmo código | **25 / 25 PASSA** (2 484 verificações nas 27, 0 falha, 0 bloqueio; caneta CDP, palma, rolagem, pinça, zoom, goma, Deshacer, grifo, troca de bloco/modo, recarregar, questões, flashcards, audiobook) |

**Suítes do piloto** (na `main` e no código das 3 PRs juntas): idênticas, exceto a contagem nova da capa (testes atualizados na #486). `caneta-novo-layout` 89/91 nas duas (as mesmas 2 falhas de tolerância do post-it, pré-existentes, #464).

**Áudio (#489):** servidor 19/19 e navegador 15/15 (testes novos; os dois reprovam contra a `main`); suíte do áudio do piloto igual à `main` (integração 294/294, servidor 97/97).

**O que continua faltando para uma matéria funcionar no site** (nenhum passo executado): merge das PRs → caneta A7/C8 e versão dos módulos depois da #484 → ativação por matéria (A5, decisão de José) → descritor aprovado da matéria → liberar só para a conta de José → roteiro físico de 3 min.

## 0-B · 2.ª rodada (11/10, `main` `d51cd1f4`: caneta `456e` aprovada por José no iPad)

Retomada a partir das **12 matérias que ainda falhavam** com C1–C3 (não do zero; 11 delas são elegíveis — a 12.ª é o piloto). Tudo em ambiente isolado (servidor local, arquivos reais da `main`, patches em memória, Supabase e manifesto de áudio simulados, zero rede externa). **Nenhuma flag, conta liberada, `PILOT_SLUGS` ou publicação foi alterada; nenhum arquivo do site foi editado.**

**Escopo (decisão de José, 12/10): 25 matérias elegíveis.** Do catálogo de 27 saem Imagenología (fora da integração; segue medida só como referência) e Semiología II (o piloto, que **já funciona no site**). Bioestadística nem está no catálogo (arquivo sem rota; #213 encerrada) e não é ensaiada.

| Grupo | No site hoje | Ensaio «como está» | **Ensaio com correções simuladas (C1–C8, só em memória)** | Uso (`INTERACAO.md`, simulado) |
|---|---|---|---|---|
| **25 elegíveis** | **não funciona** (layout só roda no piloto) | 0 / 25 | **25 / 25** (em 10/10 com C1–C3: 14 / 25) | **25 / 25** nas 4 larguras |
| Semiología II (piloto) | **já funciona** (contas liberadas; caneta `456e` aprovada) | FALHA: 2 defeitos já presentes no piloto (hero abaixo do índice; capa omite 12 flashcards) | PASSA | PASSA |
| Imagenología (fora) | não funciona | FALHA | PASSA (referência) | PASSA (referência) |

Contrato R1…R9 (27 do catálogo): **idêntico** a 10/10 — 13 · 6 · 14 · 9 · 20 · 27 · 27 · 27 · 0 (nenhum marcador editorial aplicado).

> **«Passou com correções simuladas» ≠ «já funciona no site».** Nenhum patch C1–C8 está no código publicado. As PRs de integração (§0-C) mudam isso por partes, sem ligar nenhuma matéria.

### O que fechou as 12 falhas (todas reproduzidas e resolvidas no ensaio, em memória)

| Falha (matérias) | Causa demonstrada | Correção | Natureza |
|---|---|---|---|
| Cadeia Anterior/Próximo quebrada (AP I) | guia sem `<h2>` direto: título vazio esconde o vizinho | **C4** título de reserva | módulo (+ editorial: dar `<h2>`) |
| Capa soma repetidos / omite itens só do banco (Farmaco I, Fisio I, Semio I, Med. Familiar, Semio II, AP Práctica, AP II, AP II Práctica, Histo I, Histo I Práctica, Guaraní) | a capa contava nós do DOM | **C5** contar itens distintos em toda a matéria | módulo (+ editorial 8-A.1/8-A.3) |
| Infografía no modo Preguntas (AP I, Farmaco I, Fisio I, Semio I) | figura «Cómo leer…» no início de `.quiz-section` | **C6** isolar o que vem antes do 1.º título/questão | módulo (+ editorial: figura volta ao resumo) |

### Achados novos desta rodada (reais, reproduzíveis)

| Achado | Onde | Evidência | Correção proposta |
|---|---|---|---|
| **Modo sem nada para tocar**: no modo Preguntas/Flashcards o `<summary>` de um `<details>` fechado some e o aluno não consegue abrir as questões/o mazo | Anatomía I (66 caixas «Preguntas · Bloque NN»), AP Práctica (9 mazos) | `modos/paginas-*` reprova «como está» e passa com C7; a bateria de interação abre o summary como o aluno | **C7** |
| **Tinta ~3 px fora** depois que um cartão com `:hover { transform }` desce (caneta pairando/dedo) | estilo global (`.pattern-card`, `.recep-card`, `.v-item`…); medido em Imagenología | sem C8: Δy −3 → +2,9 px e não realinha sozinho (`interacao-controle-sem-c8/`); com C8: alinhado nas 27 | **C8** (motor da caneta: realinhar ao fim da transição) |

### Falsos alarmes do próprio ensaio (corrigidos na ferramenta, não no site)

1. Toque fora da tabela (tabela mais alta que a tela) → ponto de toque dentro da área visível.
2. «Traço novo» lido pela ordem do DOM (que segue a âncora) → identificação por id.
3. Mapeamento CDP sob zoom diferente a 1440 px → calibração na própria página.
4. Parágrafo de uma linha (< 36 px) ancora na seção **por desenho do motor** → o ensaio escolhe parágrafos de 2+ linhas.
5. Medida dentro da janela de ~300 ms de uma transição → espera de assentamento.
6. **Medição antiga cega**: o conteúdo de `<details>` fechado tem caixa > 0; agora só conta o que o aluno alcança (foi o que revelou o C7).
7. Verificação da tabela larga só olhava o bloco aberto → percorre os blocos.
8. 1.ª versão da C8 (anular `transform` no `:hover`) **piorava** os post-its de margem (rotação de repouso) → descartada.
9. 1.ª versão da C5 comparava as alternativas **na ordem** e contava em dobro as cópias do banco com alternativas reordenadas (8-A.7): AP I mostraria 478 questões em vez de 359 → passou a comparar o conjunto (sem ordem, sem «A)»/«1)»); o inventário usa a mesma regra.

**Controle negativo:** a mesma bateria contra o build `456c` (reprovado por José) reprova exatamente os sintomas do vídeo — dedo apagando com a goma e goma travando a rolagem (`interacao-controle-456c/`). Contra a `main` atual, passa.

### Riscos

| # | Risco | Peso | Mitigação |
|---|---|---|---|
| 1 | Chromium ≠ Safari/iPadOS + Apple Pencil (latência, `touchType`, rejeição de palma do sistema, Scribble, hover do Pencil) | **alto** | roteiro físico de ≤ 3 min **por matéria liberada**, uma de cada vez (`INTERACAO.md` §6) |
| 2 | A7 e C8 mexem no motor da caneta já aprovado | médio | **adiados**: Claude 1 trabalha no motor na #484; A7/C8 entram depois, em PR própria, com a bateria iPad (#456) e um reteste físico curto na Semiología II |
| 3 | Matérias muito grandes (Fisio II 1857 flashcards, Med. Legal 1122) — custo da camada de tinta/isolamento não medido em aparelho | médio | medir no aparelho ao liberar; o ensaio só prova que funciona |
| 4 | C5 muda números da capa (ex.: Semiología II Flashcards 172 → 184; Medicina Familiar Preguntas 64 → 90) | baixo | avisar José; os números passam a ser o que o aluno encontra |
| 5 | C5/C6 escondem problemas editoriais (repetições, itens só no banco, infografía dentro das questões) | médio | fila editorial G0 + 8-A por matéria; nunca em massa |
| 6 | Vídeos do YouTube (`iframe`) não exercitados (sem rede) | baixo | conferir em preview/aparelho |
| 7 | Persistência simulada (sessionStorage): RLS, rede lenta e dois aparelhos não medidos | médio | o piloto já usa a gravação real; repetir «recarregar» no aparelho |
| 8 | Identidade visual das 26 = hipótese técnica | — | decisão de José por matéria |
| 9 | Áudio fora do piloto depende de A4/A6 + manifesto real | — | `AUDIOBOOKS-ESTADO-OPERACIONAL.md` |
| 10 | Post-its do layout antigo (#464, pausada) não ensaiados | baixo | fora do escopo |

**Integração e reversão:** passos e tabela de reversão em `PATCHES-PARA-INTEGRACAO.md` §D e §E (cada passo = PR própria; nada liga matéria até o servidor liberar o slug; reverter = tirar o slug da flag, sem deploy).

## 0 · Reexecução pós-#470 (10/10, `main` `ebc53dcd`) — resultado

Ensaio completo (inventário, "como está" e "com correção" nas 27 matérias × 390/768/1024/1440, contrato R1–R9 e matriz) reexecutado **sobre a `main` que já contém #460/#462/#470**. Somente leitura/ensaio: nenhuma flag, UID, matéria ou arquivo de produção alterado; zero escritas no Supabase (simulado); áudio não simulado.

| | 07/10 (#459) | 10/10 (pós-#470) |
|---|---|---|
| "Como está": PASSA / FALHA / BLOQUEADO | 0 / 27 / 0 | **0 / 27 / 0** |
| "Com correção" (C1/C2): PASSA / FALHA | 15 / 12 | **15 / 12** (as mesmas 12 falhas de `MATRIZ.md` §8) |
| Contrato R1…R9 (matérias que cumprem) | 13 · 6 · 14 · 9 · 20 · 27 · 27 · 27 · 0 | **idêntico** |
| Caneta (traço simulado) / Integridade / Teclado-Back / Scroll / Responsivo / Áudio (ausência) | 27 / 27 | **27 / 27** |

**Leitura honesta:** a matriz **não mudou**. O #470 não altera esse veredito (nem para melhor nem para pior); o ensaio só varia em dados de conteúdo (ex.: +1 figura com legenda na Anatopatologia II Práctica, vinda da #465; tempos). `MATRIZ.md` e `CONFORMIDADE.md` saíram byte a byte iguais, apenas os JSON versionados trazem a nova data/medição. Isto confirma que o ensaio **não substitui** o teste físico: o traço é sintético e a caneta física depende do resultado de José.

**Bloqueios reais em 10/10 (substituídos pelo §0-B):** (1) teste físico do build `2026-10-09·456c` (José) — **resolvido em 11/10: `456e` aprovado**; (2) patches A1–A6 não aplicados (arquivos reservados; linhas a reconferir depois do #470 mesclado); (3) 12 falhas de conteúdo/integração (§8 da matriz); (4) R9 = 0/27 (nenhum marcador `data-rm-*` aplicado); (5) identidade visual das 26 matérias sem tema próprio (decisão de José); (6) audiobooks: ver `AUDIOBOOKS-ESTADO-OPERACIONAL.md` §0.

## 1 · O que já está na `main` e muda a leitura da matriz

| Mudança | Onde | Efeito sobre o ensaio global |
|---|---|---|
| #461 caneta (1.ª rodada) | `rm-tools-v2.js`, `rm-materia-sistema.*` | já considerado pelo ensaio (a matriz cita a #456 como dependência) |
| #460 / #462 índice central expansível | `rm-materia-indice.*` (novos), `rm-pilot.js` (3 pontos), `nav-sistema.test` | a matriz de 07/10 **antecede** o índice expansível; só Semiología II o recebe. Para as demais matérias o ensaio ainda mede o índice antigo → **reexecutar** a variante "com correção" antes de qualquer decisão |
| #470 caneta (2.ª rodada) — **ainda NÃO mesclada** | `rm-tools-v2.js`, `rm-materia-sistema.js`, `rm-pilot.js`, `index.html` | muda `--rm-dock-h` (só < 768 px), o gate `pen` e adiciona guarda de toque. **Os patches A2/A3/A5 citam linhas de `rm-materia-sistema.*` e `rm-pilot.js` de `f6547a7c`: a numeração já mudou na `main` e mudará de novo com o #470.** Reconferir linha a linha depois do merge |
| #473 leis editoriais/auditoria | docs | define prioridade: caneta → qualidade editorial → lotes; layout global só com autorização |

## 2 · Pendências, uma por uma

| # | Pendência | Estado hoje | Depende de | Dono | Próxima ação |
|---|---|---|---|---|---|
| 1 | Teste físico da caneta no piloto | **aberto** (sem resultado) | publicação do #470 (ou preview) e `PASSO-FINAL-JOSE.md` | José | executar o roteiro de ≤ 3 min; só então fechar a #456 |
| 2 | Integração dos patches A1–A6 (slug por matéria no layout, tema por slug, áudio por slug, flags por slug) | **não aplicada** (toca arquivos reservados e áreas críticas) | #470 resolvida + auditoria própria + ordem de José | integração (arquivo reservado) | reconferir linhas, aplicar por PR própria, `rm-pilot.js` continua fail-closed |
| 3 | Correções C1/C2 (agregadoras por `data-rm-agrega`), C3 (conteúdo fora de `section[id]`), C4 (título de reserva), C5 (contagens canônicas), C6 (isolamento por nó) | **não aplicadas**; medidas só em memória | A1–A6 e editorial | integração + José | C1/C2/C3 já elevam 0 → 15 matérias "PASSA"; as 12 restantes dependem de conteúdo (ver §8 de `MATRIZ.md`) |
| 4 | Contrato de novos recursos (R1–R9): hoje R1 13/27 · R2 6/27 · R3 14/27 · R4 9/27 · R5 20/27 · R6–R8 27/27 · **R9 0/27** | **nenhum marcador `data-rm-*` aplicado** nas matérias | edição editorial por matéria (ids de questão, `<h2>` em portadas/guias, marcadores) | José/editorial | por lote, junto às revisões G0 + 8-A; nunca em massa |
| 5 | Temas/descritores das 26 matérias sem tema próprio | **hipótese técnica**, não identidade aprovada | decisão editorial G0/José | José | aprovar identidade, unidades e numeração por matéria antes de qualquer flag |
| 6 | Contagens da capa × corpo (12 falhas restantes) | abertas (flashcards/questões repetidos entre blocos, só no banco/agregadora) | decisão editorial 8-A.1/8-A.3 | José/editorial | levar ao bloco, descartar ou criar ids canônicos; depois reconferir |
| 7 | Audiobooks fora do piloto | **BLOQUEADO nas 27** (sem manifesto autorizado) | A4/A6 + manifesto por tabela + decisão Free × Pro | José + integração | ver `AUDIOBOOKS-ESTADO-OPERACIONAL.md` |
| 8 | Fonte externa (Literata/Google Fonts) em `rm-materia-sistema.js` | requisição externa por aluno | política de privacidade/CSP | José | decidir hospedar a fonte ou aceitar |
| 9 | Post-its do layout antigo (#464) e `caneta-novo-layout` (2 falhas de tolerância) | #464 **pausada**; falhas idênticas na `main` | Claude 2 (#464) | Claude 2 | não retomar aqui |
| 10 | Histología I/II Práctica: 2 PDFs não verificáveis e 239 imagens de Histología II Práctica por conferir; Biología VIII/X (#471) | abertos | fila editorial | editorial | não converter amostragem em leitura completa |

## 3 · Ordem segura (proposta; nenhuma etapa executada)

1. Fechar a caneta (#456) com o resultado físico de José.
2. Reexecutar o ensaio "como está" e "com correção" sobre a `main` já com #460/#462/#470 (só leitura; gera os mesmos artefatos).
3. Aplicar A1–A6 por PR própria, **sem** liberar nenhum slug (flags continuam só de Semiología II).
4. Aprovar identidade/unidades de **uma** matéria por vez → flag próprio → teste visual de José → próxima.
5. Audiobooks só depois do §5 do runbook (ensaio em preview) estar verde com evidência de serviço funcionando, não de código mergeado.
