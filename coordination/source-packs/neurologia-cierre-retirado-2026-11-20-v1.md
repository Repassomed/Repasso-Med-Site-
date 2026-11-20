# Neurología · retirada do bloco «Cierre · ¿dónde está la lesión?» (seção `revisaoneu`) · 20/11/2026

**Pedido (José, prioridade):** retirar o fechamento e o seu algoritmo do acesso do aluno (inclusive a entrada no índice e na navegação), manter os demais blocos e **preservar todos os flashcards do mazo geral**, que ficam dentro dessa mesma seção. Sem merge, sem SQL de escrita, sem ativação. Base: `main` `10e9d4df`.

## O que foi retirado (e só isto)
Da seção `<section id="revisaoneu">`, do fim da tag de abertura até o `<h4>🎴 Mazo general · Neurología</h4>` inclusive (17 835 caracteres, **0 flashcards, 0 perguntas, 0 imagens `<img>`**):
- o marcador «REPASO FINAL · NO ES UN BLOQUE NUEVO…» e o `h2` «🧭 Cierre · ¿dónde está la lesión?»;
- o «mapa dos 19 blocos» e o **algoritmo de localização** (um SVG inline com o marcador de seta `id="neuAZ"`; nenhum outro lugar da página usa esse id);
- as 3 tabelas (inclusive a de lateralidade «Ipsilateral o contralateral»), «1 · signos de alto valor localizador», «3 · los ocho errores más frecuentes» e «4 · Cómo repasar» com a nota «Un orden que funciona»;
- no resto da página, só **duas frases** que descreviam o cierre foram atualizadas: a linha da portada («Dos páginas de cierre… el repaso final, con el algoritmo de localización, las tablas de lateralidad y el mazo completo» → «Dos páginas de repaso… el banco general… y el mazo general, con todas las flashcards») e o comentário de cabeçalho do arquivo (invisível ao aluno).
O trecho retirado está **arquivado verbatim** em `docs/neurologia-cierre-retirado/cierre-revisaoneu-retirado-2026-11-20.html` (sha256 no próprio arquivo), fora da pasta publicada pelo Netlify, para restauração se José mudar de ideia.

## Onde ficaram os flashcards
**Na mesma seção, com o mesmo id `revisaoneu` e os mesmos atributos (`data-rm-agrega data-rm-role="review"`)**, agora sob o marcador «MAZO GENERAL · TODAS LAS FLASHCARDS» e o `h2` «🎴 Mazo general · Neurología». As **387 flashcards** estão **idênticas e na mesma ordem** (conferido byte a byte contra a main), mais o aviso azul «Las 387 tarjetas…» e a nota final da asignatura («Sobre el contenido de esta asignatura…»). Nada duplicado e nada perdido: a página continua com 774 flashcards no DOM (387 nos 27 blocos + 387 no mazo, por desenho) e 387 distintas. O índice do aluno passa a mostrar **«F 🎴 Mazo general · Neurología · 387 tarjetas»** no lugar de «F 🧭 Cierre · ¿dónde está la lesión? · 387 tarjetas · 3 tablas»; o modo jogo («▶ Jugar») abre em «1 / 387» e percorre os 387 cartões.

## Dados dos alunos (SELECT só leitura, 20/11; só contagens, nada escrito)
| Consulta | Resultado |
|---|---|
| Grifos com `block_id` contendo `revisao`/`cierre` | **0** |
| Traços com `anchor_id` contendo `revisao`/`cierre` | **0** |
| Notas com `anchor_id` contendo `revisao`/`cierre` | **0** |
| Grifos de Neurología (todos os blocos) | 713, de 1 aluno, **nenhum** nessa seção |
**Solução segura se aparecerem marcações antes do merge (não apagar nada):** os dados ficam no banco; a seção e o id permanecem, então marcas sobre o mazo continuam ancoradas; marcas sobre o texto retirado ficariam sem lugar na página (órfãs, não apagadas) e o texto está arquivado; nesse caso, **não mesclar** e decidir com José (restaurar o trecho ou migrar). **Refazer o SELECT no dia do merge** (os alunos estão marcando: o total de grifos de Neurología subiu de 659 para 713 entre 19 e 20/11). Atenção a traços: ancoram por posição (`bloco>índice`); a retirada desloca só os índices **dentro** desta seção e só haveria efeito se houvesse traços aqui (0).

## Conferências
- **Links e referências:** nenhum link/âncora `#revisaoneu` no HTML; o id foi mantido; só o `id="neuAZ"` (dentro do trecho retirado) desaparece. Em `tools/qa` só `neuro-667` cita `revisaoneu` (o mazo de 387 continua lá).
- **«¿dónde está la lesión?» em outros lugares:** **19 ocorrências preservadas** (21 → 19; só as 2 do cierre saíram), inclusive a da portada, as dos blocos 05, 09, 10 e 13 e as perguntas de prova.
- **Imagens:** nenhum arquivo de imagem foi removido (o algoritmo era SVG inline); regra de CLAUDE.md sobre não remover imagens: a retirada foi pedida expressamente por José.
- **Banco de questões:** 254 + 254 itens, inalterados. **Contagens:** 30 seções, capa 34 infografías · 254 preguntas · 387 tarjetas · 2 vídeos, inalteradas.

## Testes
Novo `tools/qa/neu-cierre/neu-cierre.test.cjs`: **estático 22/22** (HTML novo = main com só aquele trecho trocado; 387 flashcards idênticas; 774 e 508 inalterados; só o id `neuAZ` some; 19 ocorrências da expressão; trecho arquivado com sha256; portada) e **navegador 26/26** (1440 e 390 px, legado e layout: h2 novo, 387 cartões, entrada «Mazo general» e **nenhuma «Cierre»** no índice, modo jogo percorre os 387 na ordem, capa/índice com as mesmas contagens, abrir a entrada leva ao mazo, sem erro de página). **Reprova de propósito** se um cartão sumir ou o texto do cierre voltar (mutação provada: 7 falhas).
Existentes: `neu-vf` 520/520 e `neu-negrito` 2763/2763 (ajustados em 1 linha cada para saber da retirada) · navegador `neu-glosario` 24/24 · `neu-vf` 12/12 · `neu-negrito` 20/20 · `neu-questoes` 12/12 · `nao-ativacao` 39/39 · porta `neurologia` **7/7 ABERTA**. **Já vermelhos na main, iguais antes e depois (defasados, não são desta PR):** `neu-glosario` estático (8), `neu-questoes-1811` (8), `neuro-667` (72). Efeito da retirada neles: `neu-glosario` +2 («antes do bloco 20 idêntico»/«depois do bloco 27 idêntico» acusam portada e mazo), `neu-questoes` +1 («banco igual à base»), `neuro-667` +1 («nenhum id removido»: `neuAZ`) — são as guardas «nada mudou» acusando a mudança pedida; não alterei esses testes (são compartilhados com as PRs #682 e #687).

## Compatibilidade e ordem segura de integração (ensaio local; nada enviado às branches do Claude 1)
**HTML funde limpo com a #687 e com a #682 em qualquer ordem** (a retirada mexe só na seção `revisaoneu`; elas mexem em perguntas e figuras). Conflitos só em arquivos de teste e no inventário:
| Par | Conflito | Receita provada |
|---|---|---|
| esta PR × #687 | `inventario.json` e `neu-vf.test.cjs` | inventário: ficar com o do primeiro a entrar e **regenerar só a linha `neurologia`** (`tools/qa/ensaio-layout/inventario.cjs neurologia`); `neu-vf`: ficar com a versão da #687 (ela já não compara com base fixa) |
| esta PR × #682 | `inventario.json` e `neu-negrito.test.cjs` | inventário idem; `neu-negrito`: versão da #682 + a função `SEM_CIERRE` e `base = SEM_CIERRE(git show …)` desta PR |
**Composto main + #687 + #682 + esta PR (worktree descartável): tudo passa:** `neu-cierre` 22/22 e 26/26 (modo `--relativo --base <composto sem esta PR>`), `neu-8a1b` 3837/3837 · `neu-glosario` 414/414 · `neu-vf` 589/589 · `neu-negrito` 1258/1258 · `neu-questoes-1811` 119/119 · navegador `neu-infograficos` 60/60 · `neu-8a1b` 14/14 · `neu-glosario` 24/24 · `neu-vf` 12/12 · `neu-negrito` 20/20 · `neu-questoes` 12/12.
**Ordem recomendada:** **#687 (Claude 1) → #682 (infográficos) → esta PR.** Assim Claude 1 não precisa tocar na sua branch e as duas minhas se atualizam sobre a main (receitas acima). Se José preferir outra ordem, a única diferença é quem resolve o inventário e a linha de teste; **nenhum trabalho se perde**.
