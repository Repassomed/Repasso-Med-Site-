# REPASSO MED — MANUAL CENTRAL PARA CLAUDE

## 1. PROJETO

Este repositório contém o site oficial REPASSO MED.

A branch principal e atual é:

main

A versão REAL e ATUAL do site está dentro de:

Repasso-Med-Site--main/Atual - Copia/

NÃO utilizar versões antigas, cópias ou outros diretórios como referência principal.

Sempre trabalhar a partir da versão mais recente existente no GitHub.


## 2. REGRA PRINCIPAL

Antes de iniciar QUALQUER tarefa:

1. Verificar a versão mais recente da branch main.
2. Ler este arquivo CLAUDE.md.
3. Identificar exatamente qual matéria, página ou função será alterada.
4. Analisar o conteúdo atual antes de modificar.
5. Não modificar partes do site que não estejam relacionadas à tarefa.


## 3. VÁRIOS CLAUDES TRABALHAM NESTE PROJETO

Este projeto pode ser trabalhado simultaneamente por diferentes contas do Claude.

Portanto:

- Nunca assumir que a versão vista anteriormente ainda é a mais atual.
- Sempre consultar novamente o GitHub antes de começar.
- Sempre trabalhar a partir da main atualizada.
- Não substituir alterações recentes feitas por outro agente.
- Evitar alterações desnecessárias em arquivos globais.
- Se detectar mudança recente feita por outro Claude, preservá-la.


## 4. SITE ACADÊMICO

O REPASSO MED é um site educacional voltado principalmente para estudantes de Medicina.

O objetivo NÃO é diminuir a profundidade do conteúdo.

O conteúdo deve ser:

- didático;
- organizado;
- profundo;
- fácil de compreender;
- visualmente agradável;
- coerente;
- coeso.

Quando o conteúdo estiver em castelhano:

Utilizar castelhano simples, natural e de fácil compreensão para estudantes brasileiros que estudam Medicina em espanhol.

Evitar linguagem desnecessariamente rebuscada.


## 5. MATÉRIAS

Antes de alterar uma matéria:

- analisar a matéria atual;
- identificar incoerências;
- identificar repetições;
- identificar problemas de organização;
- identificar problemas didáticos;
- identificar informações importantes ausentes;
- identificar textos excessivamente confusos.

Melhorar sem reduzir indevidamente a profundidade.

Preservar conteúdos importantes.


## 5-A. QUESTÕES · BANCO GERAL · QUESTÕES BASEADAS EM EXAME

Se a tarefa envolver **adicionar questões**, **atualizar o banco de questões**,
**incorporar questões de prova**, **corrigir gabaritos** ou **reconciliar
questões do Drive com o site**, o protocolo completo e obrigatório está em:

MANUTENCAO-DIDATICA-REPASSO-MED.md → seção **8-A · LEI DE INTEGRAÇÃO E
ATUALIZAÇÃO DE QUESTÕES**

Ler essa seção ANTES de inserir qualquer questão. Em resumo, ela exige:

- **Auditoria de duplicatas antes de tudo** (8-A.1): comparar cada questão
  recebida com TODAS as já existentes na matéria, olhando conceito central,
  conhecimento necessário, mecanismo/raciocínio, conclusão científica,
  contexto clínico relevante e objetivo pedagógico. Classificar em DUPLICATA
  EXATA e DUPLICATA SEMÂNTICA (não inserir) ou RELACIONADA MAS DISTINTA e
  NOVA (pode inserir). **Uma questão só entra se acrescentar valor
  avaliativo real.** Registrar cada descarte com o id da questão que já
  cobria o ponto.
  **A duplicação é determinada principalmente pelo conteúdo e pelo raciocínio
  avaliativo, e não pela identidade literal do enunciado ou das
  alternativas.** Trocar alternativas, ordem, letra correta, pequenas
  palavras, contexto superficial ou prova de origem NÃO torna uma questão
  repetida em questão nova. Na dúvida: um aluno que acertou a primeira pode
  errar a segunda por não saber algo a mais? Se não, é duplicata.
- **Lei da questão canônica mais completa** (8-A.1-B): classificar como
  duplicata encerra a pergunta «entra como questão nova?», mas **não**
  encerra a análise. **Uma questão semanticamente semelhante não deve ser
  descartada automaticamente apenas porque o tema já existe no banco.**
  Antes de decidir, identificar qual das duas versões é mais completa,
  cientificamente correta, fiel à cátedra e fiel à forma real de cobrança.
  **Quando duas questões forem redundantes, o banco conserva como canônica
  a melhor versão, e não necessariamente a mais antiga.** Questões
  reconstruídas de prova têm preferência sobre versões genéricas quando
  representam melhor a profundidade e o raciocínio efetivamente cobrados,
  sem perder correção científica e clareza. **Mais completa não significa
  mais longa** — nem mais alternativas, nem explicação maior. Hierarquia de
  decisão: ciência correta → fidelidade à cátedra → fidelidade à forma real
  de cobrança → profundidade e raciocínio. Quatro decisões: manter a do
  site, substituir/reformular a existente (preservando o id sempre que
  seguro, e atualizando também a cópia do banco), manter as duas (só com
  ganho avaliativo real) ou descartar a recebida. Não confundir completude
  com sobrecarga, e não inventar detalhe para deixar a pergunta mais
  difícil.
- **Lei absoluta de cobertura** (8-A.2): nenhuma questão cobra o que o resumo
  não ensinou antes. **RESUMO ENSINA → QUESTÃO COBRA → EXPLICAÇÃO REFORÇA.**
  A explicação depois da resposta não substitui o ensino prévio.
- **Onde a questão entra** (8-A.3): no fim do bloco que ensina o assunto e,
  **nas matérias que já têm banco geral**, também no banco, sem divergência
  entre as cópias. Matéria sem banco geral não precisa ganhar um por isso.
- **Rótulo correto** (8-A.4): «Basada en preguntas de examen», nunca
  «Pregunta oficial» sem comprovação.
- **Recuperação máxima** (8-A.5): o enunciado vale mais do que recuperar as
  alternativas originais; é permitido reconstruir alternativas, mas nunca
  inventar a resposta correta — se não for determinável, vira pendência.
- **Recuperação máxima + rastreabilidade da fonte** (8-A.5 e 8-A.5-B):
  aceitar Word, PDF, PDF escaneado, fotos e transcrições auxiliares; extrair o
  máximo possível, inclusive de fonte parcialmente legível. Reconstrução de
  trecho/enunciado só é permitida quando o objetivo avaliativo for
  determinável pelas evidências; nunca alegar transcrição literal quando
  houve reconstrução. Cada questão precisa manter rastro arquivo →
  página/imagem → decisão → destino, e o relatório pré-merge deve dizer por
  fonte o que foi aproveitado, duplicado, reconstruído e não aproveitado.
- **Prioridade didática silenciosa** (8-A.2-B): conteúdo comprovadamente
  cobrado em prova vira núcleo didático do resumo. Deve ficar mais claro,
  destacado e protegido contra futuras reduções de densidade, sem dizer ao
  aluno “o professor cobra isto” e sem expor estratégia editorial.
- **Distratores plausíveis e cientificamente defensáveis** (8-A.6): uma única
  melhor resposta, sem ambiguidade. Aproximar os distratores é desejável,
  nunca ao ponto de tornar duas alternativas defensáveis.
- **Gabarito sem padrão previsível** (8-A.7); corrigir apenas por
  REORDENAÇÃO das alternativas, nunca alterando a resposta científica.
- **Preservação** (8-A.9): não apagar questões antigas nem substituí-las
  para melhorar métrica ou variar a redação. A reformulação de 8-A.1-B não
  é exceção: ela mantém a questão no lugar, com o mesmo id, e só é
  permitida quando a versão nova é demonstravelmente melhor pelos critérios
  daquela seção — e sempre registrada no relatório.
- **Atualizar as contagens declaradas** no texto do site (8-A.10).

## 6. PADRÃO VISUAL

Quando necessário, consultar:

Repasso-Med-Site--main/Atual - Copia/PADRAO-VISUAL-v4.md

Também consultar quando pertinente:

Repasso-Med-Site--main/Atual - Copia/PROMPT-RETROFIT-materias.md

Não alterar o padrão visual global sem necessidade.


## 7. ÁREAS CRÍTICAS

Ter MUITO CUIDADO com:

- index.html
- admin.html
- app-core.js
- styles.css
- netlify.toml
- Netlify Functions
- autenticação
- Supabase
- pagamentos
- InfinitePay
- checkout
- permissões dos alunos
- liberação de matérias

Não alterar sistemas de pagamento, autenticação, segurança ou banco de dados salvo quando a tarefa solicitar explicitamente.


## 8. ALTERAÇÕES

Fazer alterações focadas.

Exemplo:

Se a tarefa é:

"Melhorar Dermatologia"

não modificar Ortopedia, Toxicologia ou outras matérias sem necessidade.

Se for necessário alterar um arquivo compartilhado, verificar cuidadosamente o impacto nas outras páginas.


## 9. ANTES DE FINALIZAR

Sempre:

1. revisar as alterações realizadas;
2. revisar o diff;
3. procurar alterações acidentais;
4. verificar se nenhum conteúdo importante desapareceu;
5. verificar erros de HTML, CSS ou JavaScript;
6. verificar caminhos de arquivos;
7. verificar funcionamento das partes alteradas;
8. preservar funcionalidades existentes.


## 10. RELATÓRIO FINAL

Ao terminar uma tarefa informar:

- o que foi encontrado;
- o que foi alterado;
- quais arquivos foram modificados;
- se algum problema adicional foi identificado;
- se existe algo que precisa de revisão humana.


## REGRA FINAL

A prioridade é:

QUALIDADE > VELOCIDADE.

Não modificar grandes quantidades de conteúdo automaticamente se isso reduzir a qualidade.

Quando a tarefa for grande, dividir o trabalho em etapas coerentes.
