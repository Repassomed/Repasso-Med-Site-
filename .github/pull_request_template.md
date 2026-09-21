<!--
  Repasso Med · modelo de Pull Request
  O Repasso Guard lê a seção ESCOPO abaixo. Preencha-a antes de pedir revisão.
  Regra absoluta do projeto: quem dá merge é o José. Nenhum agente mergeia.
-->

## ESCOPO

<!-- O Guard lê estas quatro linhas. Mantenha os rótulos exatamente como estão. -->

- **Tarefa:** <!-- id do registro em coordination/tasks.json, ou "-" se não houver -->
- **Área:** <!-- matéria, infraestrutura, assets, documentação… -->
- **Arquivos permitidos:** <!-- caminhos ou globs separados por vírgula, relativos à raiz do repositório -->
- **Agente:** <!-- Claude 1 | Claude 2 | Claude 3 | Claude 4 | humano -->

**Objetivo (uma frase):**

**Fonte:**
<!-- slides da cátedra, prova, literatura, pedido do José, issue nº… -->

**Dependências / bloqueios:**

---

## O QUE MUDOU

<!-- Descrição técnica. Seja específico: arquivos, blocos, ids. -->

---

## VERIFICAÇÕES

- [ ] Nenhum arquivo fora do escopo declarado
- [ ] Nenhuma questão, flashcard, id ou asset removido sem autorização explícita
- [ ] Corpo e Banco General continuam espelhados (quando a matéria tiver banco)
- [ ] Contagens declaradas no texto conferem com o arquivo
- [ ] Annotation-safety: consulta somente leitura; nenhuma escrita no banco de dados
- [ ] Nenhum segredo, token ou chave de API commitado
- [ ] Nenhuma chamada a API paga

---

## 🟣 CARTÃO DE MERGE

<!--
  Escreva esta seção para o José, não para outro programador.
  Sem jargão. Sem sigla. Frases curtas.
  Nunca esconda limitação ou dúvida atrás de "PODE MERGEAR".
-->

**O que estava errado:**


**O que foi corrigido:**


**O que muda para o aluno:**


**O que NÃO foi mexido:**


**Risco:** BAIXO / MÉDIO / ALTO —

**A IA considera que melhorou?** SIM / NÃO / PARCIAL —

**Testes:**
- ✅
- ❌

**Decisão:**
🟣 PODE MERGEAR
🔴 NÃO MERGEAR — falta

---

Refs #67
