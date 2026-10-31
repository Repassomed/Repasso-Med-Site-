# Conferência independente · implantação pública de Medicina Familiar

**Autor:** Claude 1 (auditor independente; **não edita o código do Claude 4**) · **Data:** 30/10/2026 · **Base:** `main` `191fc730`
**Cadeia a provar:** teste privado de José → liberação para os alunos **daquela matéria** → caneta **nessa matéria** → volta; e, em todas as etapas, **nenhuma outra matéria e nenhum dado de aluno mudam**.

> Este arquivo e o teste `tools/qa/pre-voo/auditoria-implantacao-publica.test.cjs` são só de auditoria: não alteram site, flags, variáveis, painel nem `tasks.json`.

## 1 · O que já está provado sobre a `main` (antes de qualquer PR de implantação)

Mecanismo atual (`get-pilot-flags.js` + `rm-pilot.js`): duas chaves, **slug** (`RM_LAYOUT_SLUGS`, `RM_PEN_SLUGS`) **e** **UID** (`RM_PILOT_LAYOUT_UIDS`, `RM_PILOT_PEN_UIDS`); não existe «todos» nem curinga. Ou seja, **hoje não existe liberação para os alunos de uma matéria**: com o slug listado e sem a conta do aluno em `RM_PILOT_*_UIDS` o servidor nega (fail-closed). O teste prova isso: com `--publico RM_LAYOUT_SLUGS=medicina-familiar` na `main`, os alunos recebem `layout:false` (1 falha esperada em S2). **Logo, a etapa «liberação para os alunos» exige mudança de código no servidor (e provavelmente no cliente); ela não se faz só com variáveis.**

**Resultado do teste na `main` atual (sem `--publico`/`--pen-publico`)** — o relatório separa duas colunas, e só a segunda diz algo sobre implantação pública:

| Coluna | O que é | Resultado na `main` | Leitura |
|---|---|---|---|
| **Controle** | comportamento atual: padrão, teste privado, caneta privada, volta, curinga/fail-closed, arquivos, Semiología II, ligar/desligar só a matéria, entrega de conteúdo, navegador | todas passam | prova que **nada quebra**; **não** prova implantação pública (o antigo «91/91» é só isto e **não deve ser citado como prova de implantação**) |
| **Cenários públicos** | alunos comuns recebem o layout; alunos recebem layout+caneta; o aluno comum **vê a ferramenta, desenha, salva e reencontra o traço ao recarregar** | **falham, como esperado** | a `main` não tem liberação pública; o falhar é o estado «ainda não implantado» |

Números medidos (30/10/2026, `main` `191fc730`): **controle 141/141**; **cenários públicos 34/46, com 12 falhas esperadas** (as 34 que passam são as «negações» corretas e os controles dentro dessas fases). Falhas esperadas na `main` (todas marcadas `[PÚBLICO]`): S2 (alunos sem layout), S3b (alunos sem layout+caneta), P1 (caneta do aluno comum: servidor não libera **e** conta sem V2), B2/B3 em 1440 e 390 px (layout não monta, caneta física não liberada). Quando a PR do Claude 4 chegar, o critério é o inverso: **esses cenários precisam passar** e o controle continua verde.

### 1-A · Dois portões da caneta para o aluno comum

A caneta do aluno só existe se **dois** portões abrirem: (1) o servidor liberar `pen:true` para a matéria; (2) a conta ter **acesso à ferramenta V2** (`hasStudyToolsV2Access`: `BETA_UIDS` no código, linha em `study_tools_beta` ou `ROLLOUT='all'`). Sem o portão 2 o painel (`#rm2-fab`) nem monta, mesmo com `pen:true`. O cenário **P1** usa uma conta que **não** está em `BETA_UIDS` nem em `study_tools_beta` (banco simulado) e imprime o diagnóstico `{flagPen, v2, botao}` com o motivo exato da falha. O cenário **P0** (controle) usa a conta tester com a liberação privada e **passa o ciclo completo**: ferramenta visível → traço desenhado com caneta (CDP) → exatamente 1 `insert` em `user_ink_strokes` do banco simulado → reload → traço reencontrado, grifos/notas/traços anteriores idênticos, 0 escritas no reload, 0 erros JS. Se a PR do Claude 4 liberar o layout/caneta mas deixar o aluno sem V2, o P1 falhará com «a conta NÃO tem acesso à V2».

### 1-B · Conteúdo protegido (fase C, `get-materia.js` real)

Com a entrega real e Supabase simulado, em **quatro ambientes** (padrão; teste privado; liberação pública de layout; layout+caneta): conta **sem** Medicina Familiar ⇒ `403 sin-acceso`, corpo sem HTML; conta que comprou **outra** matéria ⇒ 403; sem token ⇒ 401; conta **com** a matéria ⇒ 200 e HTML (≈293 KB); slug inventado ⇒ 404. Fail-closed: Supabase respondendo 401 ⇒ 401, 500 ⇒ 502, RPC `is_admin` com erro ⇒ conta sem acesso segue negada. A entrega só lê, e `get-materia.js` **não consulta nenhuma chave de layout/caneta** (nem `get-pilot-flags.js` lê compras ou conteúdo): **a liberação pública do layout não pode abrir conteúdo**. Resultado na `main`: todas passam.

### 1-C · Semiología II e «desligar» (fase S6, e P2 no navegador)

Em teste privado, liberação aos alunos e liberação+caneta, Semiología II devolve **exatamente** o que devolvia antes para José, dois alunos e anônimo (José: layout+caneta; alunos: nada). No quadro 5 matérias × 4 contas, ligar Medicina Familiar muda **apenas** Medicina Familiar; **desligar** devolve o quadro inteiro idêntico ao anterior. No navegador (P2) o aluno em Semiología II com a liberação de Medicina Familiar ligada não ganha layout nem caneta, com grifos/traços/nota idênticos e 0 escritas.

## 2 · Como a conferência roda contra a PR do Claude 4

```
git checkout <branch-da-PR-do-Claude-4>
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/auditoria-implantacao-publica.test.cjs \
   --publico  <VARIAVEL_NOVA>=medicina-familiar[,<OUTRA>=…]        # o que libera o layout aos alunos da matéria
   --pen-publico <VARIAVEL_NOVA_PEN>=medicina-familiar             # o que libera a caneta aos alunos da matéria
   --base origin/main --head HEAD
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/nao-ativacao.test.cjs      # as outras 25 matérias: 0 requisição, 0 layout
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/gate-por-materia.test.cjs
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/medfam-implantacao.test.cjs
NODE_PATH=$(npm root -g) node tools/qa/pre-voo/medfam-grifos-sinteticos.cjs
NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh medicina-familiar
python3 -m tools.qa.guard --base origin/main --head HEAD --pr-body <corpo-da-PR>
```

| Fase | O que o teste verifica (servidor real + `rm-pilot.js` real + Supabase simulado + dados semeados) |
|---|---|
| **S0** padrão | sem variável: José, aluno e anônimo negados; corpo da negação idêntico em qualquer matéria |
| **S1** teste privado | só a conta de José recebe layout em Medicina Familiar; caneta **não**; aluno e anônimo negados; Derma, Biología, Semiología II e Anatomía I iguais ao padrão |
| **S2** alunos da matéria | dois alunos distintos fora de qualquer lista recebem layout **só** em Medicina Familiar; caneta, áudio e tema continuam negados; anônimo negado; nas outras matérias e em Semiología II (piloto) negado; corpo com as mesmas 5 chaves |
| **S3 / S3b** caneta | privada: José layout+caneta, aluno sem caneta; pública: alunos layout+caneta só na matéria; sem a chave da caneta, só layout |
| **S6** Semiología II e desligar | ver §1-C |
| **C** conteúdo | ver §1-B |
| **P0 / P1 / P2** caneta do aluno comum | ver §1-A (P1 é o cenário público; P0 é o controle) |
| **S4** volta | tirar o slug e esvaziar tudo ⇒ Medicina Familiar nega a todos |
| **S5** segurança | curinga `*`/`todas`/`all`/`true`/`1` não libera; token inválido, Supabase fora do ar, slug malformado ⇒ negado (HTTP 200); a função só faz `GET /auth/v1/user` (nenhuma escrita) |
| **G** escopo da PR | não toca HTML de outra matéria, painel, `tasks.json`, workflows, `netlify.toml`, pagamento/admin, `get-materia.js`; **não altera** `medicina-familiar.html`; `CANDIDATAS` só tem as duas matérias; `VER` = tag do `index.html` e **sobe** se módulo mudou; nenhum UID real nem valor de variável gravado |
| **B** navegador (1440 e 390 px) | matéria real com grifos, traços e 1 nota semeados pelo motor real (4 grifos e 5 traços no teste): **idênticos** antes/depois em cada fase, 0 escritas no banco, 0 erros JS; vizinhas (Derma, Biología) sem nenhuma requisição ao servidor |

## 3 · Itens que o teste não prova (revisão de código e de José)

1. **Quem é «aluno da matéria».** O conteúdo já é protegido por `get-materia.js` (fase C), então o layout liberado a uma conta sem a matéria só mostra uma casca vazia; mesmo assim o parecer verifica se a PR decide o layout pela compra (`my_active_subjects`) ou por «conta autenticada», e se falha fechado quando a consulta falha. O teste simula o banco: a conta real da compra de José/alunos não é consultada.
2. **Variáveis do Netlify**: valores reais não consultáveis daqui; a conferência de «existe/vazia» e o deploy depois de cada mudança são de José.
3. **Safari/iPadOS + Apple Pencil**: só o roteiro físico de 3 min (`PRIMEIRA-ATIVACAO-MEDICINA-FAMILIAR.md` §4) prova; incluir tabela larga.
4. **Dados vivos antes/depois** (3 SELECTs somente leitura em `user_highlights`, `user_ink_strokes`, `user_notes` para `medicina-familiar`): contagem **menor** depois = parar.
5. **Volta real**: remover variável/flag exige deploy (não é instantâneo); o parecer exige o roteiro de volta explícito e testado (S4).

## 4 · Critério do parecer

- **Pronto:** todas as verificações acima passam, a PR só toca o necessário, a volta está descrita e testada, os pontos do §3 estão com dono (José) e nenhum bloqueia o merge.
- **Precisa corrigir:** falha real em qualquer fase (aluno recebe mais do que deveria, outra matéria muda, dado de aluno muda, escrita no banco, curinga aceito, versão de cache não sobe, volta não devolve o padrão). A falha vai **na revisão da PR**, com linha e prova.
- **Bloqueado:** a PR altera conteúdo/outra matéria/pagamento/painel/`tasks.json`, não falha fechada, ou não é possível provar a volta.
