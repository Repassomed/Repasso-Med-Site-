# VERSÃO REVISADA PARA O REPOSITÓRIO — 10/09/2026
# Ajustes: 25 matérias ativas, inclusão de Oftalmología e protocolo de passagem
# de bastão entre 3 contas Claude com uma única Issue mestre e PRs por rodada.

PROMPT MESTRE — MANUTENÇÃO EDITORIAL, DIDÁTICA E TÉCNICA DO REPASSO MED

Como usar

Use este prompt no Claude IA/Claude Code com acesso ao repositório do Repasso Med.

Execute uma matéria por vez. Para iniciar uma execução, preencha somente:

MATERIA_ALVO: nome da matéria;

SLUG_ALVO: slug ativo;

ARQUIVO_ALVO: caminho do HTML ativo;

ESCOPO: matéria completa ou, em matérias muito grandes, os blocos desta rodada.

Não mande o Claude corrigir as 25 matérias numa única execução. Em matérias grandes, trabalhe com 4–6 blocos por rodada, mas faça a auditoria global da matéria antes de editar o primeiro bloco.

ATUALIZAÇÃO OPERACIONAL — FLUXO COM 3 CONTAS CLAUDE E UMA ISSUE MESTRE

Este arquivo rege um único PROJETO MESTRE de manutenção didática do Repasso Med.
O projeto pode ficar concentrado em uma única Issue do GitHub, mas NÃO deve ser executado como
uma única edição gigantesca nem como um único Pull Request.

REGRAS DE CONTINUIDADE ENTRE CONTAS

1. A Issue mestre permanece ABERTA durante todo o projeto.
2. Cada rodada trabalha somente uma matéria ou, se a matéria for grande, 4–6 blocos.
3. Cada rodada deve partir da main mais recente, salvo quando a instrução for continuar
   explicitamente uma branch interrompida.
4. Cada entrega deve usar branch própria e Pull Request próprio.
5. Nos Pull Requests intermediários usar “Refs #ISSUE_MESTRE”, e NÃO “Closes #ISSUE_MESTRE”.
   Somente a última entrega, depois que todas as matérias forem concluídas, pode fechar a Issue.
6. Nunca trabalhar simultaneamente a mesma matéria em duas contas Claude.
7. Antes de iniciar uma nova rodada, ler:
   - CLAUDE.md;
   - esta Issue mestre;
   - este arquivo;
   - o último relatório/comentário de progresso da matéria;
   - a main mais recente.
8. Não reanalisar o repositório inteiro a cada troca de conta. Ler globalmente apenas o necessário
   para compreender contratos; concentrar a leitura profunda na matéria da rodada.
9. Ao perceber que o limite de uso/tokens está próximo, NÃO iniciar uma nova parte grande.
   Fazer CHECKPOINT imediatamente:
   - terminar a menor unidade coerente possível;
   - revisar o que já foi alterado;
   - commit;
   - push da branch;
   - registrar na Issue mestre o que foi concluído, o que ficou pendente, arquivo, blocos,
     branch, commit e próximo passo exato.
10. A próxima conta deve CONTINUAR do checkpoint, sem refazer o trabalho já concluído.
11. Se uma rodada estiver concluída e revisável, criar Pull Request e aguardar revisão humana.
12. Depois do merge, a rodada seguinte começa da main já atualizada.
13. Qualidade tem prioridade sobre quantidade. Não correr para “terminar a matéria” antes do limite.

ESTADO CENTRAL DO PROJETO

Ao final de cada rodada, registrar na Issue mestre um comentário neste formato:

MATÉRIA:
STATUS: não iniciada | em auditoria | em edição | em QA | PR aberto | concluída
ESCOPO CONCLUÍDO:
ESCOPO PENDENTE:
BRANCH:
COMMIT:
PR:
PROBLEMAS CRÍTICOS ENCONTRADOS:
PRÓXIMO PASSO EXATO:
LIMITAÇÕES NÃO VERIFICADAS:

Isso é o mecanismo oficial de passagem de bastão entre Claude 1, Claude 2 e Claude 3.


INÍCIO DO PROMPT PARA O CLAUDE

Você atuará como editor médico-didático, revisor de castelhano, arquiteto de informação, auditor de coerência e engenheiro de frontend do site Repasso Med.

Identificação desta execução

MATERIA_ALVO: [PREENCHER]
SLUG_ALVO: [PREENCHER]
ARQUIVO_ALVO: [PREENCHER]
ESCOPO_DESTA_RODADA: [MATÉRIA COMPLETA ou BLOCOS X–Y]

Objetivo central

Auditar e melhorar a matéria selecionada para que um estudante estrangeiro, mesmo começando sem conhecimento prévio, consiga:

entender o conceito desde o início;

acompanhar a sequência lógica sem saltos;

compreender o mecanismo e não apenas memorizar;

diferenciar conceitos semelhantes;

integrar o conteúdo com a clínica e com as avaliações;

aprofundar-se sem perder a orientação;

revisar depois por tabelas, mapas, cards, imagens, flashcards e perguntas.

O objetivo não é diminuir a profundidade. O objetivo é reorganizar, esclarecer, conectar e representar melhor o mesmo conhecimento. A matéria deve continuar completa ou ficar mais completa, mas com menor carga cognitiva desnecessária.

Regra principal: não confie em avaliações anteriores

Antes de alterar qualquer linha, faça uma auditoria independente da matéria inteira. Não presuma que ela está boa porque uma análise anterior, outro modelo ou o próprio autor disse isso.

Farmacología I, Farmacología II e Dermatología exigem reavaliação integral e adversarial, porque o usuário já identificou incoerências de raciocínio que revisões anteriores não detectaram.

Você deve tentar ativamente encontrar:

afirmações contraditórias;

raciocínios que começam no meio;

mecanismos sem causa ou sem consequência;

termos usados antes de serem explicados;

exemplos que não demonstram a regra anunciada;

informações que aparecem isoladas e não voltam a se conectar;

mudança de conceito sem transição;

conclusão que não decorre das premissas;

tabela, flashcard ou resposta que contradiz a prosa;

repetição que aumenta o volume, mas não aprofunda;

simplificação que se tornou cientificamente errada;

conteúdo correto, porém colocado numa ordem ruim para quem aprende do zero.

Uma correção apenas ortográfica não satisfaz esta tarefa.

1. Limites e segurança do trabalho

1.1 Uma matéria por execução

Edite somente o arquivo ativo da MATERIA_ALVO.

Não faça alterações simultâneas em outras matérias.

Não edite arquivos antigos com nomes semelhantes.

Não altere index.html, get-materia.js, banco de dados, autenticação, controle de acesso ou arquivos globais, salvo se a execução tiver autorização expressa para isso.

Não publique nem faça deploy automaticamente sem autorização específica.

Preserve alterações preexistentes e não relacionadas no repositório.

1.2 Arquivo ativo é definido pelo código

Confirme o arquivo em:

Repasso-Med-Site--main/Atual - Copia/netlify/functions/get-materia.js

Os seguintes arquivos existem como legado, mas não estão no catálogo ativo e não devem ser corrigidos no lugar do arquivo atual:

bioestadistica.html

anatomiapatologica-ii.html

anatomiapatologica-ii-practica.html

1.3 Preserve a estrutura funcional

São elementos protegidos:

slug da matéria;

ID da aba;

todos os IDs de seção;

ordem das seções;

classes e contratos usados pelo JavaScript;

perguntas, alternativas e respostas;

flashcards;

caminhos válidos de imagens;

funcionamento do glossário;

botões e eventos;

mapeamento por parcial;

acesso condicionado ao aluno.

Não renomeie ou remova um ID de seção. Não transforme o arquivo inteiro por substituição cega. Faça alterações pequenas, rastreáveis e verificáveis.

1.4 Respostas e conteúdo médico

Preserve a resposta correta por padrão.

Se encontrar provável erro científico, contradição ou resposta incorreta, não a perpetue apenas para manter a contagem.

Verifique primeiro no material da cátedra e em literatura médica reconhecida.

Se a correção for segura, corrija e documente exatamente o que mudou e a fonte usada.

Se houver conflito entre literatura geral e critério da cátedra, não escolha silenciosamente: apresente o conflito e identifique claramente o “criterio de la cátedra”.

Nunca invente uma referência, uma dose, um percentual ou uma diretriz.

2. Fase obrigatória A — auditoria somente leitura

Antes de editar, leia:

o HTML completo da matéria;

PADRAO-VISUAL-v4.md;

PROMPT-RETROFIT-materias.md;

os arquivos globais relevantes apenas para entender contratos, sem alterá-los;

instruções AGENTS.md existentes no repositório, se houver.

Depois, gere um inventário de base em arquivo temporário, fora do conjunto a ser commitado.

2.1 Inventário técnico inicial

Registre, no mínimo:

IDs e ordem das seções;

títulos h1–h4;

número de blocos;

número de perguntas;

número de alternativas;

letra/texto de cada resposta correta;

número de flashcards;

caminhos de todas as imagens;

quantidade de figuras, tabelas, listas, SVGs, glossários e post-its;

IDs duplicados;

classes de raiz;

quantidade aproximada de texto visível;

parágrafos acima de 60 e 100 palavras;

maior sequência de parágrafos sem quebra visual;

termos possivelmente portugueses ou híbridos;

rótulos editoriais antigos;

afirmações com números, datas, doses, sensibilidades, mortalidade, incidência ou prevalência.

2.2 Leitura estrutural bloco por bloco

Para cada bloco, construa internamente a seguinte ficha:

Campo

Pergunta de controle

Objetivo

O que o estudante precisa entender ao terminar?

Pré-requisito

O texto explica o conhecimento necessário antes de usá-lo?

Ponto de partida

O primeiro parágrafo apresenta o problema/conceito?

Sequência

As ideias seguem uma ordem causal, temporal, espacial ou classificatória clara?

Mecanismo

O texto explica por que e como acontece?

Consequência

O mecanismo termina numa consequência fisiológica, morfológica ou clínica?

Diferenciação

O aluno consegue separar conceitos parecidos?

Aplicação

Há vínculo com caso, exame, diagnóstico, tratamento ou prova quando pertinente?

Fechamento

O bloco termina com uma síntese que decorre do raciocínio?

Lacunas

Que termo, etapa ou conexão ficou implícita?

Contradições

Algum componente diz algo diferente?

Recurso ideal

Prosa, tabela, cards, fluxo, mapa, imagem ou checklist?

2.3 Mapa reverso de parágrafos

Faça uma leitura adversarial. Para cada parágrafo de prosa, resuma a função em uma frase:

introduz;

define;

explica causa;

explica mecanismo;

apresenta consequência;

compara;

exemplifica;

cria exceção;

aplica clinicamente;

conclui.

Se um parágrafo tentar cumprir muitas funções, divida-o. Se dois parágrafos tiverem a mesma função e informação, una-os ou redistribua-os. Se a sequência for “consequência → conceito ainda não definido → causa”, reordene-a.

2.4 Teste do estudante iniciante

Leia cada bloco como se não soubesse medicina. Ao final, deve ser possível responder:

O que é?

Onde acontece?

Por que acontece?

Como acontece, passo a passo?

O que isso provoca?

Como reconheço?

Com o que posso confundir?

Por que isso importa na clínica ou na avaliação?

Toda pergunta sem resposta clara representa uma lacuna didática que deve ser corrigida.

2.5 Consistência entre componentes

Compare obrigatoriamente:

prosa principal;

títulos e subtítulos;

tabelas;

legendas de imagens;

glossário;

post-its;

mapas mentais;

flashcards;

enunciados;

alternativas;

resposta correta;

explicação da resposta;

banco geral, se existir.

Monte uma matriz interna de consistência para todo conceito repetido. Nome, mecanismo, classificação, número, dose, indicação, contraindicação e conclusão devem coincidir em todas as aparições.

2.6 Diagnóstico preliminar obrigatório

Antes de editar, apresente um diagnóstico curto com:

problemas críticos;

problemas importantes;

melhorias desejáveis;

trechos/blocos afetados;

risco de regressão;

dúvidas científicas reais;

recursos visuais recomendados;

estado das imagens: confirmada, funcional, não confirmada ou realmente quebrada.

Depois do diagnóstico, prossiga com as correções rotineiras sem aguardar confirmação. Pare somente se houver conflito científico relevante, necessidade de excluir conteúdo, mudança de resposta sem fonte segura ou alteração estrutural que possa quebrar o acesso.

3. Fase obrigatória B — plano de correção

Crie um plano por bloco. Para cada alteração proposta, informe internamente:

problema;

causa;

correção;

conteúdo que será preservado;

formato depois da correção;

teste que comprovará o resultado.

Não comece a editar sem saber como cada bloco termina.

3.1 Inventário de conceitos — proteção contra perda de profundidade

Antes da alteração, liste os conceitos, mecanismos, classificações, exceções, exemplos e aplicações de cada bloco. Após a alteração, confirme que cada item:

permaneceu;

foi corrigido com justificativa;

foi movido para tabela/card/glossário;

ou foi removido apenas por ser duplicado/errado, com explicação.

Não use somente contagem de palavras como prova de preservação. A unidade de preservação é o conceito.

3.2 Limite de redução

O texto total visível não deve diminuir mais de 12% sem justificativa detalhada.

Redução de repetição é permitida.

Converter prosa em tabela, card, lista ou diagrama não é perda.

Mecanismos importantes não devem ser resumidos até virarem slogans.

Se a compreensão exigir uma ponte explicativa nova, acrescente-a.

4. Fase obrigatória C — linguagem castelhana simples

4.1 Público

O público é composto majoritariamente por estudantes estrangeiros. Escreva em castelhano simples, natural e didático, mantendo a precisão médica.

4.2 Regra de idioma

A maior parte de todo o conteúdo visível deve estar em castelhano.

Pequenos trechos em português podem permanecer se forem intencionais, localizados, corretos e não prejudicarem a compreensão.

Não deixe uma mesma frase misturando português e espanhol.

Passagens híbridas devem ser reescritas integralmente, porque uma simples troca de palavras não corrige concordância, regência ou naturalidade.

Comentários internos de código em português não precisam ser traduzidos, salvo se causarem manutenção confusa.

4.3 Estilo da prosa

Uma ideia principal por frase.

Preferir frases de 12–25 palavras.

Evitar mais de duas orações subordinadas na mesma frase.

Parágrafos, em geral, com 2–4 frases e 35–80 palavras.

Não aplicar limites mecanicamente quando um mecanismo precisa de continuidade.

Nunca deixar mais de três parágrafos seguidos sem uma quebra funcional: subtítulo, tabela, card, lista, imagem, fluxo, post-it ou síntese.

Usar conectores explícitos: primero, después, porque, por eso, como consecuencia, en cambio, sin embargo, finalmente.

Todo pronome deve ter antecedente inequívoco.

Evitar “esto”, “eso”, “lo anterior” quando possa haver mais de um referente.

Evitar jargão desnecessário e palavras rebuscadas quando houver equivalente simples.

Não simplificar um termo técnico essencial: defina-o.

4.4 Estrutura mínima de raciocínio

Quando apropriado, a sequência deve ser:

concepto → causa → mecanismo → cambio anatómico/fisiológico → manifestación → reconocimiento → diferencial → aplicación → síntesis

Nem todo bloco precisa de todos os itens, mas nunca comece pelo meio sem fornecer o passo anterior.

4.5 Voseo

O voseo é adequado ao público do Paraguai. Mantenha-o de modo consistente:

mirá, observá, compará, recordá, tenés, podés;

não misturar no mesmo contexto com mire, observe, sospeche ou usted.

Se um trecho for impessoal e acadêmico, mantenha-o impessoal do início ao fim.

4.6 Concordância e revisão

Verifique:

gênero e número;

sujeito e verbo;

adjetivos ligados ao paciente;

artigos e preposições;

acentuação;

pontuação;

falsos cognatos;

abreviações;

consistência de nomes anatômicos e farmacológicos.

Exemplo já detectado em Semiología I: paciente de sexo feminino não pode continuar como “lúcido, colaborador, orientado”; deve haver concordância com o sujeito descrito.

4.7 Termos a revisar globalmente

se cobra / se cobró no sentido de prova → preferir se pregunta, se evalúa, se exige ou apareció en la evaluación;

gabarito → clave de respuestas, solucionario ou respuesta correcta;

Anatopatologia → Anatomía Patológica;

Fisiopatologia → Fisiopatología;

Abdome → Abdomen;

Craneo → Cráneo;

wheezes → sibilancias, com inglês apenas entre parênteses se útil.

Não faça substituição cega. Leia cada contexto.

5. Fase obrigatória D — glossário inteligente

Use o glossário para evitar que uma definição necessária transforme a prosa em um desvio longo.

5.1 O que deve entrar

termo técnico usado pela primeira vez;

sigla;

epônimo;

conceito pressuposto que um iniciante pode não conhecer;

palavra cujo significado cotidiano difere do médico;

termo que permite encurtar uma explicação lateral sem perder clareza.

5.2 Como definir

definição em uma ou duas frases;

castelhano simples;

não trocar um jargão por outro;

explicar a função no contexto;

definir uma vez por bloco;

não inserir glossário dentro do enunciado de pergunta baseada em exame.

Exemplo de forma:

<span class="rmc-gl">metaplasia<b>?</b><i>
  <b class="rmc-gl-close">✕</b>
  Cambio reversible en el que un tejido maduro es reemplazado por otro tejido
  maduro que resiste mejor el estímulo.
</i></span>

Use de 6 a 12 termos por bloco somente quando houver termos úteis suficientes. Não crie glossário artificial para atingir quota.

6. Fase obrigatória E — decidir o formato didático correto

Prosa não é um defeito. O defeito é usar prosa onde outra estrutura ensina melhor.

6.1 Manter em prosa

explicação causal;

mecanismo passo a passo;

raciocínio clínico;

transição entre conceitos;

interpretação de uma sequência.

6.2 Converter em tabela

Use quando houver duas ou mais entidades comparadas por três ou mais critérios:

definição;

causa;

mecanismo;

morfologia;

clínica;

exame;

tratamento;

efeito adverso;

diferencial.

Critérios ficam nas linhas e entidades nas colunas, salvo quando o inverso for mais legível.

6.3 Converter em cards

Use para 3–6 elementos paralelos que não compartilham todos os mesmos critérios:

tipos;

causas;

manifestações;

grupos farmacológicos;

complicações.

Cada card deve ter título curto e uma ou duas ideias, sem texto minúsculo.

6.4 Converter em fluxo/algoritmo

Use quando houver:

sequência temporal;

mecanismo em etapas;

decisão diagnóstica;

escolha terapêutica;

cadeia fisiopatológica;

procedimento.

6.5 Converter em mapa mental

Use para:

hierarquia;

visão geral de um bloco;

relações entre conceito central, causas, efeitos e aplicações.

Um mapa mental deve sintetizar; não pode repetir parágrafos inteiros em caixas.

6.6 Usar ilustração

Use quando o aprendizado depender de:

anatomia espacial;

morfologia macro/microscópica;

exame físico;

padrão radiológico;

sequência procedural;

lesão dermatológica;

fratura, desvio ou imobilização.

Se não houver uma imagem aprovada no repositório, não crie um caminho inexistente. Entregue uma especificação de asset no relatório final e mantenha o site funcional.

6.7 Legibilidade visual

Não colocar conteúdo demais em uma única imagem.

Não criar letras pequenas para “caber tudo”.

Dividir um infográfico em dois quando necessário.

Imagens precisam ensinar, e não apenas decorar.

Não sobrepor setas, rótulos ou números.

Preferir bolinhas numeradas quando houver sequência visual.

Preservar o padrão premium já adotado em Farmacología II, Toxicología e demais materiais aprovados.

7. Protocolo especial de verificação de imagens

Uma auditoria anterior sinalizou caminhos possivelmente ausentes, mas o usuário informa que as imagens abrem no site. Portanto, trate cada caso como não confirmado, nunca como “imagem quebrada” sem reprodução.

7.1 Três camadas de confirmação

Para cada imagem suspeita:

Git/repositório

conferir o caminho exato;

conferir maiúsculas/minúsculas;

conferir se o arquivo está rastreado no commit atual;

conferir se o HTML usa caminho raiz-relativo correto.

servidor/local

executar o carregador real ou equivalente com DOMParser/importNode;

solicitar o URL da imagem;

confirmar HTTP 200, MIME de imagem e tamanho maior que zero;

verificar img.complete && img.naturalWidth > 0.

site publicado

abrir a matéria autenticada;

fazer hard reload com cache desativado;

verificar Network;

confirmar se o asset vem do deploy atual, cache, service worker, CDN ou versão anterior.

7.2 Classificação obrigatória

Classifique cada caminho:

funcional e confirmado;

funciona em produção, mas não está no commit atual;

está no repositório, mas falha no deploy;

não foi possível verificar por falta de autenticação;

quebrado e reproduzido.

Somente a última categoria autoriza corrigir, substituir ou remover a referência.

7.3 Regras

Se abre para o usuário, preserve a referência até explicar a divergência.

Não renomeie arquivos sem necessidade.

Não troque uma imagem correta por placeholder.

Não apague imagem apenas porque um checkout local é parcial.

Se houver divergência entre produção e Git, documente o commit/deploy.

Todo img deve ter, quando aplicável: loading="lazy", decoding="async", largura, altura e alt textual sem HTML.

O alt deve descrever o que o aluno precisa reconhecer, não repetir “imagem de”.

7.4 Caminhos que exigem verificação, não presunção

Histología II Práctica

/assets/img/histo2p/lam-bucal-clave-caliciformes.webp

/assets/img/histo2p/lam-bucal-clave-filiformes.webp

/assets/img/histo2p/lam-bucal-clave-foliadas.webp

/assets/img/histo2p/lam-bucal-clave-fungiformes.webp

Fisiopatología II

/assets/img/fisio2/bloco-05-03-mapa-etiologico.webp

/assets/img/fisio2/bloco-06-01-sindrome-nefritico-mecanismo.webp

/assets/img/fisio2/bloco-06-02-glomerulonefrites-comparativo.webp

/assets/img/fisio2/bloco-06-03-nefropatia-diabetica.webp

/assets/img/fisio2/bloco-07-01-ira-prerrenal-intrinseca-posrenal.webp

/assets/img/fisio2/bloco-07-02-necrose-tubular-aguda.webp

/assets/img/fisio2/bloco-07-03-complicacoes-dialise.webp

/assets/img/fisio2/bloco-08-01-erc-progressao-classificacao.webp

/assets/img/fisio2/bloco-08-02-complicacoes-sistemicas-erc.webp

/assets/img/fisio2/bloco-08-03-dialise-transplante.webp

/assets/img/fisio2/bloco-09-01-ascensao-itu-pielonefrite.webp

/assets/img/fisio2/bloco-09-02-simples-complicada-cateter.webp

/assets/img/fisio2/bloco-09-03-pielonefrite-complicacoes.webp

/assets/img/fisio2/bloco-10-01-sodio-osmolalidade-tonicidade.webp

/assets/img/fisio2/bloco-10-02-hiponatremia-adh-cerebro.webp

/assets/img/fisio2/bloco-10-03-hipernatremia-diabetes-insipida.webp

/assets/img/fisio2/bloco-11-01-potassio-homeostase.webp

/assets/img/fisio2/bloco-11-02-hipopotassemia.webp

/assets/img/fisio2/bloco-11-03-hiperpotassemia.webp

8. Nomenclatura e identidade do Repasso Med

8.1 Rótulos

Usar:

Basada en preguntas de examen

Verdadero o falso · basada en examen

Pregunta complementaria

Não usar como rótulo:

CAYÓ EN EXAMEN;

PRUEBA REAL;

Pregunta oficial;

preguntas reales;

VARIANTE.

Não substituir a palavra médica legítima “variante”, como em “variante folicular”.

8.2 Atribuição

Não usar nome de professor.

Usar la cátedra ou el material de la cátedra.

Não alegar que imagens ou perguntas são oficiais/reais/originais sem comprovação e autorização.

8.3 Componentes

Manter/usar a raiz tab-content rm-cuaderno quando a alteração for segura.

Preferir componentes globais rmc-*.

Não duplicar todo o design system dentro da matéria.

Não introduzir JavaScript novo no fragmento sem necessidade.

Não usar emoji recente como ícone funcional; usar SVG inline acessível.

O runtime pode corrigir rótulos antigos e aplicar classes, mas isso é rede de segurança. Ao abrir uma matéria para manutenção, corrija também o HTML-fonte.

9. Diretrizes específicas das 25 matérias

Use a subseção correspondente à MATERIA_ALVO. Essas observações são pistas de auditoria, não conclusões a serem aceitas sem verificar o arquivo atual.

Todos os caminhos desta seção são relativos a
Repasso-Med-Site--main/Atual - Copia/.

9.1 Anatomía Patológica I

Slug: anatomia-patologica
Arquivo: netlify/functions/materias-privadas/anatomia-patologica.html

Confirmar a progressão lesão celular → adaptação → inflamação → reparação → neoplasia.

Garantir que morfologia decorra do mecanismo e que a repercussão clínica feche o raciocínio.

Procurar sequências longas de parágrafos e inserir sínteses funcionais.

Ampliar glossário apenas nos termos realmente difíceis.

Converter comparações morfológicas em tabelas e vias patogênicas em fluxos.

Revisar calques como se cobra.

9.2 Anatomía Patológica I Práctica

Slug: anatomia-patologica-practica
Arquivo: netlify/functions/materias-privadas/anatomia-patologica-practica.html

Preservar o caráter visual e conciso.

Aplicar sequência fixa: contexto → baixo aumento → alto aumento → achados-chave → diagnóstico → diferencial.

Verificar se toda lâmina explica o que deve ser observado, e não apenas nomeia a doença.

Comparar normal × alterado.

Revisar alt, dimensões e carregamento das imagens.

Não acrescentar teoria extensa que afaste a matéria da prática.

9.3 Fisiopatología I

Slug: fisiopatologia
Arquivo: netlify/functions/materias-privadas/fisiopatologia.html

Reescrever frases híbridas PT/ES de forma integral.

Revisar trechos como “Quadro perfeito”, “falha de bomba”, “no choque”, “sangue”, “gabarito” e perguntas em português.

Confirmar as cadeias causa → alteração hemodinâmica/celular → compensação → manifestação.

Verificar coerência entre choque, anemias, coagulação e respostas dos quizzes.

Colocar mortalidade, incidência e outros números sob fonte/data.

Usar fluxos para choque, hipóxia, anemia e coagulação.

9.4 Imagenología

Slug: imagenologia
Arquivo: netlify/functions/materias-privadas/imagenologia.html

Fazer revisão linguística completa, sobretudo dos bancos de perguntas e partes finais.

Não corrigir somente palavras: reescrever frases híbridas para castelhano natural.

Corrigir incoerências como chamar dois achados de “trípode”.

Revisar termos como inchado, exsudato inflamatório, na TC, mais comuns, questões, imagem da prova.

Remover nomes de professora e alegações de conteúdo oficial/real/original não comprovadas.

Corrigir alt com HTML.

Conferir se cada imagem realmente demonstra a legenda.

Padronizar modalidade → princípio físico → aparência → uso → limitação.

Criar checklists separados de leitura de tórax, abdome, ultrassom, TC e fraturas.

Verificar percentuais e sensibilidades com fonte.

9.5 Semiología I

Slug: semiologia
Arquivo: netlify/functions/materias-privadas/semiologia.html

Auditar concordância de gênero em todos os modelos de paciente.

Corrigir o exemplo feminino descrito como lúcido, colaborador, orientado.

Padronizar inspeção → palpação → percussão → ausculta.

Definir termos antes de usá-los e substituir wheezes por sibilancias quando adequado.

Conferir se achado, significado e causas não estão misturados.

Usar mapas corporais e tabelas “achado → interpretação → causas”.

9.6 Farmacología I — REVISÃO ADVERSARIAL ESPECIAL

Slug: farmacologia
Arquivo: netlify/functions/materias-privadas/farmacologia.html

Não aceite a avaliação anterior de que esta matéria está pronta. O usuário já encontrou incoerência de raciocínio.

Leia a matéria inteira antes de editar qualquer bloco.

Para cada classe/fármaco, construa a matriz:
alvo/receptor → ação molecular → mudança fisiológica → efeito clínico → indicação → efeito adverso → contraindicação → interação/monitoramento.

Confirme que nenhuma indicação aparece antes de o mecanismo ser explicado.

Procure inversões entre agonista/antagonista, potência/eficácia, afinidade/atividade, farmacocinética/farmacodinâmica.

Compare toda repetição do mesmo fármaco em resumo, tabela, flashcard, quiz e resposta.

Verifique se exemplos pertencem de fato à classe indicada.

Verifique se efeitos adversos decorrem do mecanismo ou são apresentados como lista sem explicação.

Garanta transição entre princípios gerais e classes específicas.

Corrija se cobró para forma natural.

Não encurte mecanismos centrais; reordene-os em etapas.

Só marque a matéria como pronta após uma segunda leitura do início ao fim procurando contradições.

9.7 Medicina Familiar

Slug: medicina-familiar
Arquivo: netlify/functions/materias-privadas/medicina-familiar.html

Conferir definições de APS, família, prevenção, risco e ciclo vital.

Não misturar nível de prevenção com nível de atenção.

Explicar instrumento antes de mostrar aplicação.

Usar tabelas para níveis de prevenção e mapas para genograma/ecomapa.

Marcar normas ou políticas temporais com jurisdição, fonte e data.

9.8 Semiología II

Slug: semiologia-ii
Arquivo: netlify/functions/materias-privadas/semiologia-ii.html

Conferir coerência entre sintomas, síndrome, manobra, achado e hipótese.

Uniformizar voseo; revisar formas como sospeche.

Não deixar tabelas substituírem a explicação do mecanismo do sinal.

Acrescentar apoio visual de pontos de ausculta e manobras somente com assets aprovados.

Conferir áudios, legendas e localização anatômica.

Evitar apresentar um achado como diagnóstico isolado.

9.9 Farmacología II — REVISÃO ADVERSARIAL ESPECIAL

Slug: farmacologia-ii
Arquivo: netlify/functions/materias-privadas/farmacologia-ii.html

Aplicar a mesma matriz completa de Farmacología I.

Auditar especialmente SRAA, IECA, ARA II, inibidor de renina, diuréticos, beta-bloqueadores, alfa-bloqueadores e outros simpaticolíticos.

Conferir órgão de origem, mediador, receptor, efeito e local de ação.

Verificar se indicação, primeira/segunda escolha, combinação, contraindicação e efeito adverso são consistentes.

Não confundir redução de pressão, redução de volume e modulação de frequência/contratilidade.

Transformar listas de fármacos em tabelas comparativas.

Reduzir duplicação entre prosa, post-it e resposta.

Rever todas as ocorrências de se cobra.

Manter profundidade dos mecanismos e tornar o percurso explícito.

9.10 Embriología

Slug: embriologia
Arquivo: netlify/functions/materias-privadas/embriologia.html

Verificar cronologia, semana, origem e derivado em todas as aparições.

Não apresentar estrutura antes de explicar sua origem.

Conferir se anomalia decorre da etapa embrionária citada.

Converter sequências em linhas do tempo.

Criar tabelas “estructura embrionaria → derivado → alteración”.

Limpar rótulos antigos sem substituir a palavra médica “variante”.

9.11 Histología I

Slug: histologia-i
Arquivo: netlify/functions/materias-privadas/histologia-i.html

Garantir sempre estrutura → composição → função → localização → identificação.

Dividir frases com muitas orações.

Criar matriz dos tecidos fundamentais.

Explicar matriz extracelular, fibras e células antes de compará-las.

Conferir se as imagens correspondem ao aumento e ao tecido descrito.

9.12 Histología I Práctica

Slug: histologia-i-practica
Arquivo: netlify/functions/materias-privadas/histologia-i-practica.html

Corrigir o ID duplicado lam-medula, mas somente depois de verificar dependências e sem quebrar âncoras/mapeamentos. Se o ID for protegido, propor correção segura no relatório.

Diferenciar claramente medula óssea de medula espinal.

Aplicar roteiro de identificação por lâmina.

Melhorar alt e dimensões.

Verificar se perguntas usam a mesma nomenclatura das legendas.

Trocar gabarito quando visível.

9.13 Histología II

Slug: histologia-ii
Arquivo: netlify/functions/materias-privadas/histologia-ii.html

Prioridade alta para reduzir carga cognitiva sem perder conteúdo.

Converter comparações de vênulas, modelos de lóbulo hepático, árvore respiratória, segmentos digestivos e pele fina/espessa em tabelas.

Manter em prosa as relações estrutura–função.

Aplicar matriz “órgano → epitelio → capa → célula → función → pista”.

Separar identificação microscópica de aprofundamento fisiológico.

Revisar parágrafos acima de 100 palavras individualmente.

9.14 Histología II Práctica

Slug: histologia-ii-practica
Arquivo: netlify/functions/materias-privadas/histologia-ii-practica.html

Reduzir teoria que não ajuda a reconhecer a lâmina; não reduzir pistas diagnósticas.

Usar roteiro “bajo aumento → alto aumento → estructura clave → trampa → diagnóstico”.

Converter classificações em checklists/cards.

Verificar, pelo protocolo de três camadas, as quatro imagens de papilas linguais sinalizadas. Não presumir falha.

Melhorar alt.

Conferir se a repetição de imagens em flashcards/quizzes é intencional.

9.15 Anatomía I

Slug: anatomia-i
Arquivo: netlify/functions/materias-privadas/anatomia-i.html

Não reduzir a matéria apenas porque é grande; são muitos blocos.

Priorizar relações espaciais: anterior/posterior, medial/lateral, superficial/profundo.

Converter trajetos vasculonervosos em rotas visuais.

Dividir prosa sobre mediastino, diafragma e circulação.

Confirmar que tabelas e imagens usam a mesma nomenclatura.

Aumentar glossário seletivamente.

Revisar a nivel de quando significar apenas en.

9.16 Biología

Slug: biologia
Arquivo: netlify/functions/materias-privadas/biologia.html

Preservar a linguagem de iniciante e as boas metáforas.

Verificar se toda metáfora volta ao mecanismo real.

Organizar biomoléculas, organelas e transportes em matrizes.

Não usar nome de docente; adaptar à fórmula “material de la cátedra”.

Conferir se função celular decorre de estrutura/composição.

Evitar antropomorfismos que criem erro conceitual.

9.17 Medicina Legal

Slug: medicina-legal
Arquivo: netlify/functions/materias-privadas/medicina-legal.html

Transformar distinções legais em tabelas e árvores de decisão.

Separar claramente conceito médico, conceito jurídico e procedimento.

Identificar país/jurisdição, fonte e data.

Não apresentar regra variável como universal.

Comparar perito oficial × consultor técnico; civil × penal; documento × finalidade; lesão × mecanismo.

Revisar se cobra.

9.18 Anatomía Patológica II

Slug: anatomia-patologica-ii
Arquivo: netlify/functions/materias-privadas/anatomia-patologica-ii.html

Converter Crohn × colite ulcerosa, tumores gástricos, vias de pólipos/neoplasias e lesões salivares em comparações.

Usar fluxo “precursor → vía/mutación → morfología → comportamiento → clínica”.

Conferir se patogênese, macro, micro e consequência estão conectadas.

Não misturar classificação histológica com estadiamento.

Revisar rótulos antigos e calques.

9.19 Anatomía Patológica II Práctica

Slug: anatomia-patologica-ii-practica
Arquivo: netlify/functions/materias-privadas/anatomia-patologica-ii-practica.html

Manter o fluxo diagnóstico fixo.

Fazer a pista observável aparecer antes da longa explicação etiológica.

Reduzir sequências de até sete parágrafos sem quebra.

Transformar diferenciais em painéis.

Conferir dimensões e funcionamento das imagens.

Não transformar a prática em duplicata da teoria.

9.20 Fisiopatología II

Slug: fisiopatologia-ii
Arquivo: netlify/functions/materias-privadas/fisiopatologia-ii.html

Prioridade crítica de organização, mas sem empobrecimento.

Auditar cada parágrafo acima de 100 palavras.

Criar microseções com começo, mecanismo e fechamento.

Separar “Desde cero” de “Profundización”.

Converter causas, estágios, complicações e síndromes em tabelas/fluxos.

Criar mapas de insuficiência hepática/renal, eletrólitos, síndrome nefrítica/nefrótica e progressão renal.

Verificar os 19 caminhos de imagem pelo protocolo de três camadas; não presumir que estejam quebrados.

Conferir estatísticas e referências temporais, inclusive menções a 2024.

Remover repetição entre explicação, post-it, tabela e resposta.

9.21 Toxicología

Slug: toxicologia
Arquivo: netlify/functions/materias-privadas/toxicologia.html

Transformar atendimento, descontaminação, toxidromes e antídotos em algoritmos.

Manter o mecanismo em prosa quando ele explica sinais.

Criar matriz “toxidrome → pupila → pele → frequência → ruídos → antídoto”.

Verificar dose, via, contraindicação, janela de tempo, fonte e data.

Não apresentar protocolo antigo como permanente.

Reduzir parágrafos taxonômicos sem retirar exceções importantes.

9.22 Dermatología — REVISÃO ADVERSARIAL ESPECIAL

Slug: dermatologia
Arquivo: netlify/functions/materias-privadas/dermatologia.html

Não aceite a avaliação anterior de que esta matéria está pronta. O usuário já encontrou incoerência de raciocínio.

Leia todo o conteúdo e faça mapa reverso de cada parágrafo.

Confirme a sequência: lesão elementar → morfologia → distribuição → sintomas → hipótese → diferencial → exame → conduta.

Não misture nome de lesão elementar com nome de doença.

Confirmar que definição, exemplo e imagem representam a mesma morfologia.

Procurar termos usados antes de definição.

Verificar se lesões primárias e secundárias não estão classificadas de modo contraditório.

Comparar prosa, atlas/figura, tabela, flashcard e quiz.

Verificar se tratamento corresponde ao diagnóstico descrito e se não aparece antes da diferenciação mínima.

Evitar descrições vagas como “lesión típica” sem explicar borda, cor, superfície, conteúdo, distribuição e evolução.

Conferir se os três blocos representam escopo parcial e comunicar isso sem fingir cobertura completa.

Só considerar concluída após uma releitura adversarial procurando dez possíveis falhas e corrigindo as reais.

9.23 Guaraní

Slug: guarani
Arquivo: netlify/functions/materias-privadas/guarani.html

Manter explicações em castelhano simples.

Converter pessoa, prefixo, partícula, posse, negação e ordem em tabelas/fluxos.

Não reescrever formas de guarani com base apenas em intuição.

Marcar conteúdo que precisa de validação por especialista em guarani paraguaio.

Conferir naturalidade dos diálogos clínicos.

Corrigir se cobra e matéria quando visíveis.

9.24 Ortopedia y Traumatología

Slug: ortopedia
Arquivo: netlify/functions/materias-privadas/ortopedia.html

Prioridade alta para conversão visual.

Reduzir metatexto e parágrafos excessivamente longos.

Criar checklist sistemático de leitura radiográfica.

Usar atlas para traço, desvio, alinhamento, partes moles, consolidação e imobilização.

Explicar mecanismo do trauma antes da classificação quando isso ajudar.

Confirmar que nomenclatura e imagem correspondem.

Se o escopo tiver apenas seis blocos, informar claramente que a cobertura é parcial.

Não criar imagem genérica/pobre; quando faltar asset aprovado, produzir um briefing, não um link quebrado.

9.25 Oftalmología

Slug: oftalmologia
Arquivo: netlify/functions/materias-privadas/oftalmologia.html

Preservar a proposta “desde cero”, mas auditar de forma adversarial frases-mnemônicas absolutas
que possam virar regra científica falsa ou excessivamente ampla.

Revisar especialmente simplificações como:
“casi todo se decide mirando si duele y qué hace la pupila”;
“el cristalino no se enferma: se pone viejo”;
“la retina no duele: cuando avisa, ya avanzó”.
Manter a força didática somente se a formulação continuar cientificamente segura.

Organizar, quando pertinente:
anatomía → función → examen → hallazgo → síndrome/hipótesis → diferencial → urgencia → conducta.

No síndrome de ojo rojo, deixar explícitos os critérios que diferenciam conjuntivitis, queratitis,
uveítis, glaucoma agudo e outros diferenciais realmente presentes no material, sem transformar
uma única pista em diagnóstico isolado.

Em glaucoma, catarata e retina, conferir coerência entre mecanismo, achado no exame, classificação,
indicação de estudo e conduta.

Todo número, pressão-alvo, intervalo de rastreio, dose, sensibilidade/especificidade ou critério
temporal deve ser confrontado com o material da cátedra e literatura reconhecida.

Preservar a informação de que as perguntas são complementares quando não houver banco de exames
da cátedra; não criar alegação de questão oficial/real.

Conferir se figuras, legendas, alt, tabelas, flashcards e quizzes ensinam a mesma regra e se a
imagem realmente demonstra o achado descrito.


10. Ordem recomendada de execução

Por causa das falhas percebidas pelo usuário e dos riscos encontrados, seguir preferencialmente:

Farmacología I;

Dermatología;

Imagenología;

Fisiopatología II;

Farmacología II;

Oftalmología;

Histología II;

Histología II Práctica;

Ortopedia y Traumatología;

Fisiopatología I;

Semiología I;

Medicina Legal;

Anatomía Patológica II;

Anatomía Patológica II Práctica;

Anatomía I;

Guaraní;

Toxicología;

Semiología II;

Histología I;

Histología I Práctica;

Embriología;

Biología;

Medicina Familiar;

Anatomía Patológica I;

Anatomía Patológica I Práctica.

Essa ordem é operacional, não uma declaração de qualidade definitiva. Toda matéria deve ser auditada do zero.

11. Fase obrigatória F — implementação

11.1 Forma de editar

Preferir diffs pequenos por bloco.

Não substituir o arquivo inteiro se uma alteração localizada resolve.

Não apagar conteúdo antes de registrar o conceito no inventário.

Manter o HTML válido e sem scripts desnecessários.

Reutilizar componentes globais.

Tabelas de três ou mais colunas precisam de contêiner com rolagem no celular.

SVG precisa de viewBox, role="img" e aria-label.

Toda figura precisa de legenda útil.

11.2 Camadas didáticas

Sempre que o conteúdo permitir, organizar:

Desde cero — definição e ideia principal;

Mecanismo paso a paso — causa e sequência;

Integración clínica — manifestação/uso;

Diferencias clave — comparação e armadilhas;

Síntesis — frase final ou esquema;

Práctica — flashcards/perguntas.

Não transformar isso em uma fórmula rígida ou repetitiva. A estrutura deve servir ao assunto.

11.3 O que é proibido

cortar profundidade para melhorar métricas;

trocar parágrafos por listas sem reorganizar o raciocínio;

acrescentar cards decorativos;

criar glossário com definições circulares;

gerar imagem falsa ou caminho inexistente;

usar nomes de professores;

prometer questão “real/oficial” sem comprovação;

alterar IDs de seção;

modificar respostas silenciosamente;

fazer substituição global de “variante”;

declarar que a matéria ficou perfeita sem executar os testes.

12. Fase obrigatória G — QA técnico e editorial

12.1 Anti-regressão

Compare antes e depois:

mesmos IDs de seção, na mesma ordem;

mesmo número ou número maior de perguntas;

mesmo número ou número maior de flashcards;

mesmas imagens funcionais, salvo correção documentada;

mesmas respostas, salvo correção científica documentada;

todos os conceitos do inventário preservados;

redução textual dentro do limite ou justificada;

nenhuma nova duplicação de ID.

12.2 HTML e interface

Verifique:

HTML parseável;

tags balanceadas;

zero ID duplicado;

CSS escopado;

nenhuma função global quebrada;

quiz abre e fecha;

resposta correta continua correta;

flashcard funciona;

glossário abre e fecha;

tabelas não cortam coluna;

imagens não deformam;

lazy loading funciona;

desktop;

celular com 390 px;

navegação por blocos;

carregamento pelo mesmo mecanismo do site.

12.3 Coerência editorial

Faça uma segunda leitura completa e pergunte:

Algum parágrafo ainda começa no meio do raciocínio?

Algum “por isso” não decorre da frase anterior?

Alguma classificação muda de nome?

Algum termo aparece antes de ser definido?

Algum exemplo contradiz a regra?

Alguma tabela simplifica demais?

Algum flashcard perdeu contexto?

Alguma pergunta cobra algo não ensinado?

Alguma resposta explica outra alternativa?

Algum bloco termina sem conclusão?

12.4 Revisão adversarial final

Assuma que a edição contém erros e tente encontrar pelo menos dez possíveis problemas. Investigue-os. Corrija os reais e descarte os falsos com justificativa interna.

Depois faça o teste de reconstrução: sem olhar o texto original, use a versão revisada para explicar o assunto desde zero. Se for preciso preencher lacunas por conhecimento próprio para a explicação fazer sentido, a matéria ainda não está pronta.

12.5 Rubrica de aprovação

Dê 0, 1 ou 2 pontos:

Critério

0

1

2

Coerência

contraditória/saltos

parcialmente clara

sequência completa

Coesão

fragmentada

transições irregulares

conexões explícitas

Iniciante

pressupõe muito

precisa de apoio

aprende desde zero

Castelhano

híbrido/confuso

pequenos desvios

simples e natural

Profundidade

perdeu conceitos

preservou parcialmente

preservou/aprofundou

Visual

decorativo/inadequado

útil em parte

formato ideal

Consistência

componentes divergem

pequenas diferenças

tudo sincronizado

Técnica

regressões/falhas

pendências menores

testes aprovados

A matéria só pode ser classificada como pronta quando:

nenhum critério tiver nota 0;

a soma for pelo menos 14/16;

não houver pendência crítica;

os testes funcionais passarem;

toda limitação não verificável estiver declarada.

13. Formato obrigatório da entrega

Ao terminar, responda com:

A. Identificação

matéria;

slug;

arquivo;

blocos revisados;

commit/base analisada.

B. Diagnóstico antes da edição

Tabela:

Severidade

Bloco/trecho

Problema

Consequência didática

C. Alterações realizadas

Por bloco:

o que foi reorganizado;

o que foi reescrito;

o que virou glossário;

o que virou tabela/card/fluxo;

o que foi mantido em prosa e por quê;

correção científica, se houve;

imagem verificada ou asset recomendado.

D. Prova de preservação

Tabela antes/depois:

Indicador

Antes

Depois

Estado

seções







perguntas







flashcards







conceitos inventariados







imagens funcionais







IDs duplicados







parágrafos >60 palavras







parágrafos >100 palavras







sequência máxima de parágrafos







termos de glossário







E. QA

Informar PASSOU/FALHOU para:

HTML;

IDs;

perguntas;

respostas;

flashcards;

glossário;

imagens;

desktop;

mobile;

castelhano;

coerência;

consistência científica;

preservação de conteúdo.

F. Pendências

o que depende de especialista;

o que depende de autenticação/produção;

o que depende de novo infográfico;

o que precisa de fonte;

qualquer ponto que impeça chamar a matéria de pronta.

G. Rubrica final

Mostrar a pontuação dos oito critérios. Não usar a palavra “perfeito”. Usar:

pronta para publicação;

pronta com ressalvas;

necessita nova rodada;

bloqueada por validação científica/técnica.

14. Instrução final

Comece agora pela Fase A. Não faça nenhuma alteração antes de concluir a auditoria somente leitura e o inventário. Depois, execute a correção da MATERIA_ALVO dentro do escopo informado, valide adversarialmente e entregue as evidências.

FIM DO PROMPT PARA O CLAUDE