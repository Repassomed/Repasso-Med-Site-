# Pendências editoriais para os responsáveis pelas matérias

> **ESTADO (28/10/2026, main `b9a76bee`): RESOLVIDO.** As duas pendências editoriais abaixo foram aplicadas na `main` pelas PRs **#597** (7 marcações `data-rm-agrega` + `<h2>` de `ap2biblio`) e **#595** (10 marcações em 9 matérias). Conferência no HEAD desta branch: `python3 -I tools/qa/pre-voo/agrega-no-html.py` → *27 matérias · com declaração faltando: 0*; `inventario-fresco.py` → *inventário velho em 0*. O texto abaixo fica como **registro** do que foi pedido e de onde foi feito. Nenhum arquivo de matéria é alterado pela #599.

## 1 · Anatomía Patológica II — título para `ap2biblio` · **feito na #597 (mesclada)**

| Arquivo | Seção | Hoje | Efeito |
|---|---|---|---|
| `netlify/functions/materias-privadas/anatomia-patologica-ii.html` (l. ~5884) | `<section class="container" id="ap2biblio">` | contém `<div class="ap2-biblio"><h4>📚 Bibliografía</h4><ul>…` e **nenhum `<h2>`** | com o layout novo a seção não tem título: `blocos/pager-cadeia` reprova nas 4 larguras (Anterior/Próximo quebra, o aluno só volta pelo índice) |

**Correção (feita na #597 como `<h2>📚 Bibliografía y créditos de las imágenes</h2>`, filho direto da seção; mesclada).** Descrição original da correção: dentro da seção, antes do `<div class="ap2-biblio">`, acrescentar `<h2>Bibliografía</h2>` (ou transformar o `<h4>` em `<h2>` e ajustar o CSS `.ap2-biblio h4` se necessário). Alternativa técnica (outra PR, código): estender o título de reserva (C4) para aceitar `<h4>`. Atenção: a copia `anatomiapatologica-ii.html` (mesma seção, l. ~4996) parece ser versão antiga; confirmar com o dono se ainda é servida antes de editar.
Preservar `id="ap2biblio"`, a ordem das seções e as âncoras (traços usam `seção>índice`: acrescentar um `<h2>` **muda o índice** dos elementos seguintes **dentro** dessa seção; hoje não há traços em `ap2biblio`, mas confira com `deslocamento-de-indice.py`).

## 2 · As 17 marcações `data-rm-agrega` (13 matérias) · **todas feitas: #597 (7) + #595 (10), mescladas**

O layout trata um banco/mazo como «bloco» se o `id` casar com `banco|flashcards`; nas demais a seção precisa **declarar** o atributo. Edição única por linha: acrescentar `data-rm-agrega` na abertura da `<section>` (ex.: `<section class="container" id="b11" data-rm-agrega>`), sem mudar mais nada.

| # | Matéria (slug) | Arquivo | `id` da seção | Conteúdo agregado | PR (mesclada) |
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
**O que ainda falta:** nada nestas duas pendências. Resta, por matéria, o descritor/tema aprovado por José (só para o sistema visual) e o roteiro físico no iPad antes de qualquer ativação. A comparação visual das 43 imagens da P2 de AP II Práctica (pendência da #597) é editorial e não afeta o layout.
