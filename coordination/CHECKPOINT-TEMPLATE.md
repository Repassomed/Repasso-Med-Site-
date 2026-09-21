# Modelo de checkpoint

Cole isto como comentário na Issue #67 (ou na Issue própria da tarefa) ao
terminar uma rodada **ou** ao parar por limite de uso.

O formato vem do `MANUTENCAO-DIDATICA-REPASSO-MED.md` e foi mantido; os três
campos do fim são o acréscimo desta V1, para o Guard e para quem continuar.

```
MATÉRIA/ÁREA:
TAREFA:            <id em coordination/tasks.json, ou ->
ESTADO:            READY | IN-PROGRESS | BLOCKED | BLOCKED-LIMIT | NEEDS-AUDIT | NEEDS-FIX | MERGE-READY | DONE
AGENTE:
ESCOPO CONCLUÍDO:
ESCOPO PENDENTE:
BRANCH:
COMMIT:            <obrigatório se o estado for BLOCKED-LIMIT>
PR:
PROBLEMAS CRÍTICOS ENCONTRADOS:
PRÓXIMO PASSO EXATO:
LIMITAÇÕES NÃO VERIFICADAS:

ARQUIVOS RESERVADOS:   <os mesmos do campo "arquivos" da tarefa>
ANNOTATION RISK:       <nenhum | baixo | alto — e por quê>
GUARD:                 <verde | com avisos | vermelho — e o quê>
```

---

## As três regras do checkpoint

**1. `BLOCKED-LIMIT` sem `COMMIT` é inválido.** O commit é o ponto de partida
de quem continuar. Sem ele, o próximo agente teria de adivinhar onde parou.

**2. `PRÓXIMO PASSO EXATO` é literal.** Não vale "continuar o bloco 05". Vale
"inserir a questão sobre líquido pleural no fim do bloco 05 e espelhar no
Banco General; a redação está no comentário anterior".

**3. `LIMITAÇÕES NÃO VERIFICADAS` nunca fica vazio por preguiça.** Se tudo foi
verificado, escreva "nenhuma". Se algo não deu para checar — uma imagem que
não abriu, um PDF grande demais, um dado que dependia do José — está aqui que
se registra. Esconder limitação é o único erro que o projeto não perdoa.
