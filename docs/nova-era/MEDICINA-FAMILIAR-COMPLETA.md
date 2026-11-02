# Medicina Familiar completa — Layout V2 + tema próprio + caneta V2

Estado: pronta para merge. **Nada fica ligado.** A linha da matéria na tabela de liberação nasce `off|off|off`.
Quem liga a prévia (só para o administrador) é o comando único de `ROTEIRO-MEDICINA-FAMILIAR.md`, depois do merge e do deploy.

## 1. O que a matéria ganha

| Peça | O que é | Onde |
|---|---|---|
| Layout V2 | capa, índice por unidades, blocos com título e aba, tabelas numeradas, perguntas, flashcards, repaso | `rm-layout`, `rm-materia-sistema/nav/indice` |
| Tema próprio | descritor `TEMAS['medicina-familiar']` + bloco CSS `html.rm-sis[data-rm-tema="medicina-familiar"]` | `assets/rm-materia-sistema.js` / `.css` |
| Caneta V2 | mesmo módulo aprovado em Semiología II, ligado por matéria | `rm-tools-v2.js` (inalterado), `rm-pilot.js` |

Os três sobem juntos pela mesma linha `rm_materia_rollout` (`layout_stage`, `pen_stage`, `visual_stage`).

## 2. O tema

- **Papel e margem**: superfície bege `#EFE3D1`, lateral `#F8F0E4`; destaque verde-azulado `#2A8789`; marcador `#E9B949`. (Semiología II usa outra paleta; a base técnica é a mesma.)
- **Três unidades, três cores**: I Atención primaria (azul `#2F6AA3`), II Familia (âmbar `#C98A1B`), III Niño y salud (verde `#3F8F4F`). Cada capítulo usa uma das 6 cores da paleta (cabeçalho, zebra, linha, tag, fundo suave, cor forte).
- **Aba da disciplina** em formato de aba de pasta (cantos de 10 px, sem recorte diagonal).
- **Capa sem medalhões**: a matéria não tem hero; subtítulo e migalhas vêm do descritor («Atención primaria · Familia · Niño»), capa em coluna única.
- **Glossário «?»**: o emblema ficava navy sobre navy; ganhou texto branco.
- **Classificação das 12 seções**: 8 blocos (aps, principios, familiograma, apgar, crisis, crecimiento, desarrollo, educacion) + 4 de repaso (portada, banco, flashcards, cierre).

### O que o tema esconde (só na visão nova)
Somente o cabeçalho antigo que a visão nova repete: marcador «TEMA NN · UNIDAD…», `.rm-block-head`, `.rm-subject-head` e a decoração do caderno. Sem o layout/tema ligado, a página antiga continua idêntica.

## 3. Conteúdo preservado
`tools/qa/nova-era/visual-conteudo.test.cjs` compara, em cada uma das 12 seções, layout sem tema × layout com tema+navegação: texto, ids, imagens, questões, cartões, grifos. Nenhum elemento didático visível desaparece (exceção declarada: o cabeçalho antigo duplicado). Resultado: **26/26, 1167 elementos conferidos**.

## 4. Capturas comparáveis
Em `docs/nova-era/capturas/<medicina-familiar|semiologia-ii>/`, para 1440 / 768 / 390 px:
`01-abertura`, `03-bloque-titulo`, `04-tabla`, `09-modo-preguntas-bloque`, `07-caneta`.
Geradas por `tools/qa/nova-era/capturas.cjs` (conta administradora simulada, layout+tema+navegação+caneta). Semiología II serve de referência de regressão: abertura, índice e recursos ficaram idênticos pixel a pixel antes×depois; as cenas roladas diferem só ~4 px de rolagem (ruído).

## 5. Testes feitos pelo Claude
Ver o resultado da rodada final no corpo da PR (Cartão de Merge). Cobertura:
- servidor (função real + Supabase simulado): acesso privado, estágios off/preview/all;
- navegador (cenas 1–17): layout, tema, nav, caneta, prévia completa do administrador, ALUNO/TESTER2/SEM/OUTRO sem ver nada, aluno com all/all/all, troca de conta, volta para off;
- `visual-conteudo`: conteúdo preservado;
- `medfam-caneta`: caneta com layout+tema em parágrafo, tabela, anotação à margem e caixa; 1 traço, 0 pontos perdidos, desvio ≤ 1,6 px, dedo não desenha (<900 px), desfazer, recarga mantém âncoras;
- regressão de Semiología II (layout, sistema, nav, cover, race, ink-jump, caneta-ipad-456);
- dados dos alunos: traços/grifos com a mesma posição antes e depois.

Falhas conhecidas, não ligadas a esta PR (idênticas no código anterior nesta máquina): `caneta-novo-layout` e `caneta-456` por tolerância do post-it (#464).

## 6. Limites do que foi provado
- Emulação de 1440, 768 e 390 px no Chromium; caneta com eventos reais de ponteiro `pen` via CDP. **Safari/iPadOS e Apple Pencil em aparelho real não são provados por automação.**
- O tema é uma proposta de design: paleta e aba mudam por variáveis CSS, sem tocar no conteúdo.
- Nenhum SQL foi executado, nada foi ativado, nenhum aluno é afetado.

## 7. Ligar e desligar
Ver `ROTEIRO-MEDICINA-FAMILIAR.md`: um comando liga a prévia só para o administrador (pode ficar ligada); um comando volta tudo para `off`.
Próximas matérias: `PROXIMAS-MATERIAS-EM-GRUPOS.md`.
