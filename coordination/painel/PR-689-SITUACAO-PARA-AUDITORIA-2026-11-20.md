# PR #689 · AP II Práctica (blocos 17 e 18 do Final) · situação para a auditoria do coordenador · 20/11/2026

> Registro de continuidade escrito por **Claude 2** (autor da #689). É **evidência histórica**: o coordenador deve reconferir o estado atual no GitHub antes de agir. Nada abaixo foi mesclado, publicado ou ativado.

## Estado verificado em 20/11 (fonte: GitHub e Git)
| Item | Valor |
|---|---|
| PR | **#689** · «AP II Práctica: blocos 17 (Nefroblastoma) e 18 (Pielonefritis crónica) do Final, com banco, mazo, cierre e Nova Era (sem ativar)» · **aberta, não mesclada** |
| Branch / head | `claude/ap2p-final-rinon-2026-11` · `251a3ede` (atualizada sobre a main `10e9d4df`: merge limpo, sem conflito) |
| Diff contra a main | só AP II Práctica: `anatomia-patologica-ii-practica.html`, 6 imagens em `assets/img/anatoprat2/` (4 novas + 2 vinhetas), `rm-materia-sistema.js` (classificador até `ap2pb18`), `inventario.json` (1 linha), `PROVENIENCIA-IMAGENS-AP2P.md`, `temas-ap2p.test.cjs`, `ap2p-final-b17-b18.test.cjs`, source pack |
| Depende de outra PR | **Nenhuma.** #658, #692 e #695 (que tocam `rm-materia-sistema.js`) já estão na main; merge de ensaio com #682, #687 e a PR de retirada do cierre de Neurología: **0 conflitos** |
| Efeito para o aluno | **Depois do merge e do deploy**, 2 blocos novos, banco 220→244, mazo e cierre atualizados chegam a quem já tem acesso a AP II Práctica, **independente da Nova Era** (nada de ativação envolvido) |

## O que entrou e de onde veio (fontes)
- **Bloco 17 · Nefroblastoma:** PDF «15 - Nefroblastoma» (5,1 MB; **lido inteiro**: texto, 8 páginas e 25 imagens embutidas vistas). 12 perguntas, 10 flashcards.
- **Bloco 18 · Pielonefritis crónica:** PDF «16 - Pielonefritis cronica» (17 MB). **Só o texto foi lido.** 12 perguntas, 10 flashcards.
- Banco 244 (espelho 244×244), flashcards declaradas 308, mazo 616, cierre atualizado. 440→488 perguntas no total; só acréscimos.

## O que NÃO foi possível ver ou comprovar (não considerar conferido)
1. **Todas as figuras do PDF 16**: o Drive recusa download > 10 MB, `drive.google.com` fica fora do alcance e não há partes menores; **não pedi credencial ampla**. Só texto e rótulos de figura.
2. **Origem da imagem de pielonefrite do site:** é o JPG «Pielonefritis Crónica .jpg» (pasta «Anatopatologia Praticas», id `1hW-IAh6MIxCrWW_JrgB0tyJvgrsSurRV`), **outro arquivo, não do PDF 16**. **Não se comprovou** que seja a mesma lámina do PDF da professora, nem que seja do laminario da cátedra, nem o aumento. O site foi corrigido em 19/11: cabeçalho, nota de fonte, legendas e cierre dizem «imagem de apoio de outro arquivo; não se comprovou…».
3. Diagnóstico da imagem: compatível com a ficha (H&E, túbulos dilatados com material rosado, infiltrado, banda fibrosa), **sem confirmação de professor**.
4. Rótulos da vista 2 do nefroblastoma: posicionados a partir da diapositiva do PDF 15; **não confirmados com a cátedra**.
5. Caneta/layout: Chromium com caneta simulada; **iPad/Safari não testados**.

## Conferência de conteúdo (feita)
Afirmação por afirmação contra o texto dos PDFs (tabela no source pack): blocos 17 e 18 **conferem**; o caso e as 3 MCQ do PDF 16 descrevem **glomerulonefrite crónica** e foram usados **só** no contraste (a própria chave diz «a opção B corresponde a pielonefritis crónica»); comentários de distratores e descrições de tecido normal são conhecimento geral, declarados no site como fora do material.

## Perguntas (24 = 20 MCQ + 4 V/F) · pistas visuais · V/F · bloco × banco (conforme 8-A.6-D)
Teste `tools/qa/nova-era/ap2p-final-b17-b18.test.cjs`: **estático 186/186; navegador 8/8.** Nenhuma alternativa com negrito/cor/marca; enunciado V/F sem negrito; **os dois botões** (VERDADERO e FALSO) dos 4 V/F passam o **mesmo** valor a `checkTF` e ele coincide com a resposta; 4 alternativas a–d; resposta repete a alternativa certa; **as 24 existem idênticas no banco**; letras certas sem corrida de 3; as 24 explicações aparecem ao responder. O teste reprova defeitos injetados de propósito. Perguntas alteradas em 19/11: só a **legenda** de 2 perguntas de imagem (e os 2 espelhos); enunciados, alternativas e gabaritos não mudaram.

## Testes (head `251a3ede` ou o imediatamente anterior, `4669e96b`, sem diferença de conteúdo)
`temas-ap2p` 51/51 · `real-ap2p` 109/109 · `integracao-ap2p` 119/119 · `nao-ativacao` 39/39 · porta `anatomia-patologica-ii-practica` **7/7 ABERTA** (não liga nada) · `css-temas` 75/75. Estáticos e `temas-ap2p` rodados de novo em `251a3ede`; a bateria de navegador completa foi em `4669e96b` (o merge seguinte só trouxe documentação).
**Marcações de alunos (SELECT só leitura, 19/11):** AP II Práctica **0 grifos, 0 traços, 0 notas**. **Nada escrito no Supabase. Nenhuma variável do Netlify alterada.**

## Recomendação e decisões que são de José
**Pode mesclar** (risco médio-baixo, conteúdo novo para alunos), **sabendo** dos itens 1–4 acima. Antes: (a) ler uma amostra dos blocos 17 e 18; (b) decidir se o caso/MCQ de glomerulonefrite crónica do PDF 16 vira bloco próprio; (c) se possível, enviar o PDF 16 em partes < 10 MB (ou dizer a origem do JPG) para fechar os itens 1–3. Não mesclar sem ordem de José.

## Como o coordenador pode reproduzir
`git fetch origin claude/ap2p-final-rinon-2026-11` · `NODE_PATH=$(npm root -g) node tools/qa/nova-era/ap2p-final-b17-b18.test.cjs` (estático + navegador) · `… temas-ap2p.test.cjs` · `sh tools/qa/pre-voo/porta-da-materia.sh anatomia-patologica-ii-practica`.
