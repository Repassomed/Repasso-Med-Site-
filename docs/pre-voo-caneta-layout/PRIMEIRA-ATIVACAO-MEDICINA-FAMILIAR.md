# Primeira implantação controlada · Medicina Familiar

> **Esta PR não liga nada por si:** ela só coloca `medicina-familiar` em `CANDIDATAS` (1.ª fechadura: o navegador passa a *perguntar* ao servidor). Quem libera é o servidor (2.ª fechadura: variáveis do Netlify). Nenhuma variável do Netlify, flag, `ROLLOUT` ou conteúdo de matéria foi alterado aqui.
>
> **⚠ BLOQUEIO — estado real das variáveis NÃO verificado.** Esta sessão não tem acesso ao Netlify (sem CLI, token nem conector; o site público é inacessível do ambiente de testes). Por isso **não se afirma** que `RM_LAYOUT_SLUGS` e `RM_PEN_SLUGS` estão vazias nem que `medicina-familiar` não está nelas hoje. Os testes provam o comportamento do código **com** o ambiente simulado (variáveis vazias ⇒ negado); a produção só se confirma com a **conferência prévia de José, abaixo (§2-A)**, antes do merge.

## 1 · O que muda ao mesclar (e o que não muda)

| | Antes | Depois do merge, **se** as variáveis de matéria estiverem vazias (a confirmar, §2-A) |
|---|---|---|
| Aluno abre Medicina Familiar | nenhuma chamada a `get-pilot-flags` | **1 chamada** por abertura; o servidor **nega** (corpo idêntico a qualquer outra negação) e nada aparece diferente |
| Layout / caneta física / áudio | desligados | desligados (fail-closed: erro de rede também = desligado) |
| Grifos, notas, traços | — | idênticos (medido: `medfam-implantacao.test.cjs`, 87/87) |
| Cache | `rm-pilot.js?v=2026102801` | `?v=2026102901` (só sobe; o cache do navegador dura 7 dias) |

Custo real da 1.ª chave: uma requisição extra, negada, por abertura da matéria (nenhuma escrita).

## 1-A · Porta, descritor e gate (conferidos na `main` `06e9d076`, #593 já mesclada)

- **Porta da matéria:** `porta-da-materia.sh medicina-familiar` → **PORTA ABERTA** (7/7 etapas: inventário em dia, marcadores `data-rm-agrega` desnecessários, âncoras estáveis, ida-e-volta, layout nas 4 larguras, uso/caneta nos modos, inventário de risco).
- **Descritor (tema/classificação visual):** **não existe nem foi aprovado** para Medicina Familiar (decisão G0 de José). Ele só serve ao *sistema visual* (`RM_VISUAL_SLUGS`), que **fica desligado**. O Layout V2 e a caneta funcionam sem descritor (provado com o `rm-pilot.js` real: layout monta sem `visual`). Nenhum descritor foi criado aqui.
- **Gate da #593 (A5/A7):** layout = slug em `RM_LAYOUT_SLUGS` **e** conta em `RM_PILOT_LAYOUT_UIDS`; caneta física = slug em `RM_PEN_SLUGS` **e** conta em `RM_PILOT_PEN_UIDS`; áudio só no piloto; sem curinga; negação com corpo idêntico (`gate-por-materia` 48/48).

## 2 · As duas chaves — instruções exatas

**Chave 1 · código (esta PR).** `var CANDIDATAS = ['semiologia-ii', 'medicina-familiar'];` em `assets/rm-pilot.js` (e `VER`/tag do `index.html` em `2026102901`). Só José mescla. Mesclada com as variáveis vazias, **nada muda para o aluno** (tabela acima); se alguma já listar `medicina-familiar`, a matéria liga para as contas já listadas no momento do deploy — por isso a conferência §2-A vem **antes** do merge.

**Chave 2 · Netlify (não feita; só depois do deploy da chave 1 e da sua ordem).** Site → *Site configuration → Environment variables*:

1. Conferir que a **sua** conta está em `RM_PILOT_LAYOUT_UIDS` (a lista do piloto já existe). *Atenção:* **toda** conta dessa lista verá o layout novo em Medicina Familiar; se houver outra conta além da sua, remova-a antes ou aceite que ela verá.
2. Criar `RM_LAYOUT_SLUGS` = `medicina-familiar` (um slug, minúsculas, sem espaços, sem `*`, `todas` ou `all`: curinga não libera nada).
3. **Fazer um novo deploy** (*Deploys → Trigger deploy → Deploy site*): variável nova só vale para funções depois de um deploy.
4. Passo **opcional e separado** (só após o layout passar no iPad): `RM_PEN_SLUGS` = `medicina-familiar` **e** a sua conta em `RM_PILOT_PEN_UIDS`; novo deploy. Sem isso a caneta física **não** liga (layout liberado ≠ caneta liberada). `RM_VISUAL_SLUGS`, `RM_PILOT_VISUAL_UIDS` e `RM_PILOT_AUDIO_UIDS` **não** se tocam (áudio é só do piloto).

Erros de digitação (slug com hífen errado, conta fora da lista) resultam em **layout desligado**, nunca em ligado (cenas D1/D2 do teste).

### 2-A · Conferência prévia (José, ANTES de mesclar) — só nomes e vazio/preenchido, sem copiar valores
No Netlify (*Site configuration → Environment variables*), olhar **apenas** estas linhas e anotar "existe/não existe" e "vazia/preenchida" (não copiar UIDs nem valores para lugar nenhum):

| Variável | Esperado antes do merge | Se estiver diferente |
|---|---|---|
| `RM_LAYOUT_SLUGS` | não existe ou vazia (ou sem `medicina-familiar`) | **não mesclar**: tirar `medicina-familiar` primeiro |
| `RM_PEN_SLUGS` | não existe ou vazia (ou sem `medicina-familiar`) | idem |
| `RM_VISUAL_SLUGS` | não existe ou vazia | idem |
| `RM_PILOT_LAYOUT_UIDS`, `RM_PILOT_PEN_UIDS`, `RM_PILOT_VISUAL_UIDS`, `RM_PILOT_AUDIO_UIDS` | podem existir (são as contas do piloto atual); não mudam nada sozinhas | — |

Resultado desta conferência: **pendente — não realizada por esta sessão (bloqueio acima).**

## 3 · Teste de dados antes/depois (com a página real)

Automático, todo em memória, zero rede externa:

```
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/medfam-implantacao.test.cjs     # 390 e 1440 px: A padrão · B só chave 1 · C duas chaves · D conta/slug errados · E caneta · F volta · G vizinhas
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/nao-ativacao.test.cjs            # as outras 25 matérias: 0 requisição, 0 layout
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/medfam-grifos-sinteticos.cjs     # restauração de grifos com dados INVENTADOS (contexto íntegro, contexto velho, fragmento inexistente)
NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh medicina-familiar
```

**Comparação feita pelo teste** (função `MEDIR`): grifos pintados (texto + seção), traços (mesma caixa, mesma posição relativa ≤ 0,02), notas, órfãos e **nenhuma escrita** no banco, antes de ligar, com o layout ligado e depois da volta.

**Dados vivos da matéria (consulta somente leitura, 28/10/2026):** 18 grifos de 1 aluno (17 em `aps`, 1 em `portada-medfam`), **0 traços, 0 notas**; progresso: `aps` ×3 alunos, `familiograma` ×1. Nenhum texto de aluno está no repositório: o teste de restauração usa registros inventados a partir do texto da página (`medfam-grifos-sinteticos.cjs`).

**Antes/depois no dia (repetir, 3 consultas somente leitura no Supabase, antes de ligar e 24 h depois):**

```sql
select count(*) from user_highlights where subject_slug='medicina-familiar';       -- 18 (ou mais se o aluno marcou)
select count(*) from user_ink_strokes where subject_slug='medicina-familiar';       -- 0 (ou o que José desenhou no teste)
select count(*) from user_notes where subject_slug='medicina-familiar';             -- 0
```
Valor **menor** que o de antes = parar (item 5).

## 4 · Roteiro físico no iPad (3 min, conta de José)

1. Antes de mexer: anotar as 3 contagens acima. Abrir Medicina Familiar **sem** o slug na variável: layout antigo, tudo normal.
2. Chave 2 (passos 1–3) e novo deploy; recarregar com *recarregar sem cache* (ou aba privada).
3. **Layout**: aparece a barra/índice novo; abrir 3 blocos pelo índice; voltar; o Anterior/Próximo encadeia; abrir o Banco/Flashcards e uma pergunta.
4. **Grifos**: os do aluno real não são seus; marcar 1 trecho em `aps`, conferir que persiste ao recarregar. Abrir `aps` e confirmar visualmente grifos já existentes (se a sua conta tiver).
5. **Tabela larga**: rolar uma tabela na horizontal com o dedo; a página **não** pode alargar; se houver traço sobre a tabela, ele acompanha a rolagem e fica cortado à janela da tabela.
6. **Caneta** (só se o passo 4 opcional foi feito): desenhar com a Apple Pencil num parágrafo e numa tabela, recarregar, conferir que o traço volta no mesmo lugar.
7. Rotação (retrato ↔ paisagem) e voltar para a lista de matérias.

**24 h de observação:** repetir as 3 consultas; olhar erros do console no iPad uma vez; confirmar com as contas do piloto que Semiología II segue igual.

## 5 · Critérios para parar

Qualquer um: contagem de grifos/traços/notas **menor** que antes; grifo ou traço no lugar errado; página que alarga ao rolar tabela; Anterior/Próximo que não leva a lugar nenhum; tela em branco ou cartão «00» vazio; erro de JS repetido; algo diferente em **outra** matéria. Parar = voltar (L1).

## 6 · Roteiro de volta

| Nível | Como | Tempo | Efeito nos dados |
|---|---|---|---|
| **L1 · só Medicina Familiar** | apagar `medicina-familiar` de `RM_LAYOUT_SLUGS` (e de `RM_PEN_SLUGS`) e **novo deploy** | minutos (um deploy) | nenhum: layout antigo, dados idênticos (cena F, 390 e 1440) |
| **L2 · só a caneta** | tirar o slug de `RM_PEN_SLUGS` + deploy | minutos | traços gravados ficam |
| **L3 · todas as contas de uma vez** | esvaziar `RM_PILOT_LAYOUT_UIDS` (afeta também o piloto) + deploy | minutos | nenhum (cena F «esvaziar contas») |
| **L4 · fechar a 1.ª fechadura** | `git revert` do merge desta PR **e** subir `rm-pilot.js` e a tag do `index.html` para um valor **maior** que `2026102901` (nunca menor: cache de 7 dias) | um deploy | nenhum dado tocado |
| **L5 · V2 inteira** | `ROLLOUT='off'` (não rodar o SQL de rollback) | um deploy | dados preservados |

Nota honesta: variável do Netlify só vale **depois de um deploy**; o L1 não é instantâneo, e o navegador já aberto só muda ao recarregar.

## 7 · O que não está provado aqui

- Safari/Apple Pencil: só o roteiro físico prova; os testes usam Chromium.
- Deploy de produção: o site público não é alcançável do ambiente de testes.
- Grifos antigos cujo contexto vizinho mudou só voltam se o texto marcado for único e **ao menos um** dos lados do contexto bater; contexto 100 % trocado não é restaurado (regra de segurança do motor). Se o texto de `aps` for editado de novo, rodar `medfam-grifos-sinteticos.cjs` antes de mesclar e conferir a contagem de grifos antes/depois (§3).
- Variáveis reais do Netlify: **não consultadas** (sem acesso); ver §2-A.
- Pendências editoriais de outras matérias: `PENDENCIAS-EDITORIAIS.md` (não afetam Medicina Familiar: a porta passa).
