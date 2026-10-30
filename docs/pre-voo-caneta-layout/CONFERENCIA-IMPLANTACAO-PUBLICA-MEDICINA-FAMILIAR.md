# Conferência independente · implantação pública de Medicina Familiar

**Autor:** Claude 1 (auditor independente; **não edita o código do Claude 4**) · **Data:** 30/10/2026 · **Base:** `main` `191fc730`
**Cadeia a provar:** teste privado de José → liberação para os alunos **daquela matéria** → caneta **nessa matéria** → volta; e, em todas as etapas, **nenhuma outra matéria e nenhum dado de aluno mudam**.

> Este arquivo e o teste `tools/qa/pre-voo/auditoria-implantacao-publica.test.cjs` são só de auditoria: não alteram site, flags, variáveis, painel nem `tasks.json`.

## 1 · O que já está provado sobre a `main` (antes de qualquer PR de implantação)

Mecanismo atual (`get-pilot-flags.js` + `rm-pilot.js`): duas chaves, **slug** (`RM_LAYOUT_SLUGS`, `RM_PEN_SLUGS`) **e** **UID** (`RM_PILOT_LAYOUT_UIDS`, `RM_PILOT_PEN_UIDS`); não existe «todos» nem curinga. Ou seja, **hoje não existe liberação para os alunos de uma matéria**: com o slug listado e sem a conta do aluno em `RM_PILOT_*_UIDS` o servidor nega (fail-closed). O teste prova isso: com `--publico RM_LAYOUT_SLUGS=medicina-familiar` na `main`, os alunos recebem `layout:false` (1 falha esperada em S2). **Logo, a etapa «liberação para os alunos» exige mudança de código no servidor (e provavelmente no cliente); ela não se faz só com variáveis.**

Controle executado sobre a `main` (sem `--publico`): **91/91** (servidor 39/39: S0 padrão, S1 teste privado, S3 caneta privada, S4 volta, S5 curinga/fail-closed/sem escrita, G arquivos; navegador 52/52 em 1440 e 390 px, com dados semeados idênticos antes/depois, 0 escritas, 0 erros JS e vizinhas sem requisição).

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
| **S3** caneta | privada: José layout+caneta, aluno sem caneta; pública: alunos layout+caneta só na matéria; sem a chave da caneta, só layout |
| **S4** volta | tirar o slug e esvaziar tudo ⇒ Medicina Familiar nega a todos |
| **S5** segurança | curinga `*`/`todas`/`all`/`true`/`1` não libera; token inválido, Supabase fora do ar, slug malformado ⇒ negado (HTTP 200); a função só faz `GET /auth/v1/user` (nenhuma escrita) |
| **G** escopo da PR | não toca HTML de outra matéria, painel, `tasks.json`, workflows, `netlify.toml`, pagamento/admin, `get-materia.js`; **não altera** `medicina-familiar.html`; `CANDIDATAS` só tem as duas matérias; `VER` = tag do `index.html` e **sobe** se módulo mudou; nenhum UID real nem valor de variável gravado |
| **B** navegador (1440 e 390 px) | matéria real com grifos, traços e 1 nota semeados pelo motor real (4 grifos e 5 traços no teste): **idênticos** antes/depois em cada fase, 0 escritas no banco, 0 erros JS; vizinhas (Derma, Biología) sem nenhuma requisição ao servidor |

## 3 · Itens que o teste não prova (revisão de código e de José)

1. **Quem é «aluno da matéria».** Se a regra for «qualquer conta autenticada», confirmar que o conteúdo continua protegido por `get-materia.js` (compra/liberação) e que o layout é só apresentação; se for «conta com acesso à matéria», o servidor deve **checar o acesso** (e falhar fechado se a consulta falhar).
2. **Variáveis do Netlify**: valores reais não consultáveis daqui; a conferência de «existe/vazia» e o deploy depois de cada mudança são de José.
3. **Safari/iPadOS + Apple Pencil**: só o roteiro físico de 3 min (`PRIMEIRA-ATIVACAO-MEDICINA-FAMILIAR.md` §4) prova; incluir tabela larga.
4. **Dados vivos antes/depois** (3 SELECTs somente leitura em `user_highlights`, `user_ink_strokes`, `user_notes` para `medicina-familiar`): contagem **menor** depois = parar.
5. **Volta real**: remover variável/flag exige deploy (não é instantâneo); o parecer exige o roteiro de volta explícito e testado (S4).

## 4 · Critério do parecer

- **Pronto:** todas as verificações acima passam, a PR só toca o necessário, a volta está descrita e testada, os pontos do §3 estão com dono (José) e nenhum bloqueia o merge.
- **Precisa corrigir:** falha real em qualquer fase (aluno recebe mais do que deveria, outra matéria muda, dado de aluno muda, escrita no banco, curinga aceito, versão de cache não sobe, volta não devolve o padrão). A falha vai **na revisão da PR**, com linha e prova.
- **Bloqueado:** a PR altera conteúdo/outra matéria/pagamento/painel/`tasks.json`, não falha fechada, ou não é possível provar a volta.
