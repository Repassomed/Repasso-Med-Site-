# Pendências editoriais para os responsáveis pelas matérias

Nenhum arquivo de matéria foi alterado por esta PR (#599). As correções abaixo **já têm PR própria aberta** — estado de 28/10/2026, ainda **não mescladas** (aguardam revisão de José): **#595** (10 marcações em 9 matérias; branch `claude/prontidao-layout-agrega-2026-10`) e **#597** (7 marcações em 5 matérias + título de `ap2biblio`; branch `claude/charming-maxwell-ah7nxj-layout-bloqueios`). Este documento só consolida o que cada PR cobre e o que **falta**; não duplica o trabalho nem o substitui. São correções **editoriais** (mexem no HTML da matéria) que a ativação do layout novo exige; cada uma é pequena e não muda texto científico. Verificação de todas: `python3 -I tools/qa/pre-voo/agrega-no-html.py` (hoje: 13 matérias com declaração faltando) e `sh tools/qa/pre-voo/porta-da-materia.sh <slug>`.

## 1 · Anatomía Patológica II — título para `ap2biblio` · **coberto pela #597 (aberta)**

| Arquivo | Seção | Hoje | Efeito |
|---|---|---|---|
| `netlify/functions/materias-privadas/anatomia-patologica-ii.html` (l. ~5884) | `<section class="container" id="ap2biblio">` | contém `<div class="ap2-biblio"><h4>📚 Bibliografía</h4><ul>…` e **nenhum `<h2>`** | com o layout novo a seção não tem título: `blocos/pager-cadeia` reprova nas 4 larguras (Anterior/Próximo quebra, o aluno só volta pelo índice) |

**Correção (feita na #597 como `<h2>📚 Bibliografía y créditos de las imágenes</h2>`, filho direto da seção; aguardando merge).** Descrição original da correção: dentro da seção, antes do `<div class="ap2-biblio">`, acrescentar `<h2>Bibliografía</h2>` (ou transformar o `<h4>` em `<h2>` e ajustar o CSS `.ap2-biblio h4` se necessário). Alternativa técnica (outra PR, código): estender o título de reserva (C4) para aceitar `<h4>`. Atenção: a copia `anatomiapatologica-ii.html` (mesma seção, l. ~4996) parece ser versão antiga; confirmar com o dono se ainda é servida antes de editar.
Preservar `id="ap2biblio"`, a ordem das seções e as âncoras (traços usam `seção>índice`: acrescentar um `<h2>` **muda o índice** dos elementos seguintes **dentro** dessa seção; hoje não há traços em `ap2biblio`, mas confira com `deslocamento-de-indice.py`).

## 2 · As 17 marcações `data-rm-agrega` (13 matérias) · **todas cobertas por PR aberta: #597 (7) + #595 (10)**

O layout trata um banco/mazo como «bloco» se o `id` casar com `banco|flashcards`; nas demais a seção precisa **declarar** o atributo. Edição única por linha: acrescentar `data-rm-agrega` na abertura da `<section>` (ex.: `<section class="container" id="b11" data-rm-agrega>`), sem mudar mais nada.

| # | Matéria (slug) | Arquivo | `id` da seção | Conteúdo agregado | PR aberta |
|---|---|---|---|---|---|
| 1 | anatomia-patologica-practica | anatomia-patologica-practica.html | `b11` | 95 fc | #597 |
| 2 | anatomia-patologica-practica | anatomia-patologica-practica.html | `b12` | 85 fc | #597 |
| 3 | farmacologia-ii | farmacologia-ii.html | `f2b15` | 214 q | #595 |
| 4 | farmacologia-ii | farmacologia-ii.html | `f2b16` | 584 fc | #595 |
| 5 | embriologia | embriologia.html | `emb14` | 107 q | #597 |
| 6 | embriologia | embriologia.html | `emb15` | 149 fc | #597 |
| 7 | histologia-i | histologia-i.html | `histo13` | 150 q | #597 |
| 8 | histologia-i | histologia-i.html | `histo14` | 198 fc | #597 |
| 9 | histologia-ii-practica | histologia-ii-practica.html | `h2pmazo` | 822 fc | #595 |
| 10 | anatomia-patologica-ii-practica | anatomia-patologica-ii-practica.html | `ap2pmazo` | 310 fc | #597 |
| 11 | fisiopatologia-ii | fisiopatologia-ii.html | `revisaofp2` | 1364 fc | #595 |
| 12 | toxicologia | toxicologia.html | `toxcierre` | 944 fc | #595 |
| 13 | dermatologia | dermatologia.html | `dermcierre` | 188 fc | #595 |
| 14 | guarani | guarani.html | `mazognrl` | 298 fc | #595 |
| 15 | oftalmologia | oftalmologia.html | `oftcierre` | 534 fc | #595 |
| 16 | neurologia | neurologia.html | `revisaoneu` (já tem `data-rm-role="review"`; acrescentar `data-rm-agrega` junto) | 335 fc | #595 |
| 17 | anestesiologia | anestesiologia.html | `anecierre` | 232 fc | #595 |

(q = perguntas; fc = flashcards. `ap2pbanco` já casa com `/banco/`.) Todos em `netlify/functions/materias-privadas/`.

**Como conferir depois de editar:** `python3 -I tools/qa/pre-voo/agrega-no-html.py <slug>` deve sair 0; `git diff` deve mostrar **só** o atributo novo. Por segurança, o atributo não altera nenhum `id`, classe, texto ou índice de âncora (grifos, notas e traços intactos).
**O que ainda falta (de verdade):** (a) revisar e mesclar #595 e #597 (José); (b) a #595 informa que a **porta de Toxicología fica FECHADA** por inventário velho (`docs/layout-ensaio/inventario.json`: `toxportada`, `toxb01`) — regenerar o inventário não foi feito; (c) comparação visual das 43 imagens da P2 de AP II Práctica (pendência da #597, não relacionada ao layout); (d) depois de mesclar, rodar `python3 -I tools/qa/pre-voo/agrega-no-html.py` (deve sair 0) e `porta-da-materia.sh <slug>` por matéria. A pendência não bloqueia Medicina Familiar nem o piloto (Semiología II).
