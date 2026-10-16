# O que passou e o que falta, por matéria (#457) — layout, uso, código real × simulação

> Gerado por `tools/qa/ensaio-layout/status.cjs`. **Código real** = o que o ensaio encontrou no código servido (`<ID>:NO-CODIGO`); **simulado** = o que o ensaio ainda aplica em memória ou responde no lugar do servidor. Nada foi ativado: flags, contas, `RM_AUDIO_SLUGS` e matérias intocados.

- **Layout** e **uso**: código servido = disco (`main`) (layout, 27 matérias) · disco (`main`) (uso, 27).
- **Integração proposta**: `f7c06d68` = commit LOCAL com `main` + #487 + #489 + PR pós-#484 (A7/C8/versão) — não publicado (27 matérias; uso: 27).
- **Físico**: nada nesta tabela é aparelho. Caneta, grifos, navegação e áudio no iPad: `ROTEIRO-PILOTO-FISICO.md` (pendente, José).

Contagem: 27 matérias ativas = 1 piloto (Semiología II) + 1 excluída (Imagenología, medida só como referência) + **25 para expansão**. Bioestadística está excluída e não tem rota ativa (não é medida).

## Resumo

| Grupo | n | Layout (código da main + simulação do resto) | Uso | Integração proposta (layout / uso) |
|---|--:|---|---|---|
| Piloto | 1 | 1/1 | 1/1 | 1/1 / 1/1 |
| **Expansão** | 25 | 25/25 | 25/25 | 25/25 / 25/25 |
| Excluída (referência) | 1 | 1/1 | 1/1 | 1/1 / 1/1 |

| Origem das correções | Na `main` de hoje | Na integração proposta |
|---|---|---|
| **código real** | A1, C1, C2, C5a, C5b, C5c, C6, C7 | A1, A2, A3, A7, C1, C2, C3, C4, C5a, C5b, C5c, C6, C7, C8 |
| **simulado** | A2, A3, A7, C3, C4, C8 + descritor de cada matéria | A5 + descritor de cada matéria |

Leitura: `A5` = resposta do servidor «caneta liberada nesta matéria» (ativação por matéria, decisão de José); o descritor (unidades, seções, agregadoras, identidade visual) é proposta para aprovação, ver `DESCRITORES-PROPOSTA.md`.

## Por matéria

| # | Matéria | Grupo | Layout | Uso | Proposta | Simulado na `main` | Áudio | Falta no conteúdo (editorial) | Físico |
|--:|---|---|:-:|:-:|:-:|---|---|---|---|
| 1 | Anatopatologia I (`anatomia-patologica`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: analise-guia | depois do piloto |
| 2 | Anatopatologia Práctica (`anatomia-patologica-practica`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | agregadora não reconhecida: b11 → `data-rm-agrega`<br>`SECTION.container` sem id com 20 questões: só no índice geral (dar id e título) | depois do piloto |
| 3 | Fisiopatologia I (`fisiopatologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | portada declara número ≠ contagem real (12 bloques × canônico ? (indeterminado); 170 preguntas × canônico 274) | depois do piloto |
| 4 | Imagenología (`imagenologia`) | excluída | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | — | fora da expansão |
| 5 | Semiología I (`semiologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | portada declara número ≠ contagem real (220 preguntas × canônico 182 (= total do DOM com cópias)) | depois do piloto |
| 6 | Farmacología I (`farmacologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | portada declara número ≠ contagem real (191 preguntas × canônico 176 (= total do DOM com cópias)) | depois do piloto |
| 7 | Medicina Familiar (`medicina-familiar`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | portada declara número ≠ contagem real (8 bloques × canônico ? (indeterminado); 90 preguntas × canônico 64 (= total do DOM com cópias); 177 flashcards × canônico 82 (= total do DOM com cópias)) | depois do piloto |
| 8 | Semiología II (`semiologia-ii`) | piloto | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | piloto: cards só nos blocos do manifesto | — | **pendente** (roteiro) |
| 9 | Farmacología II (`farmacologia-ii`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: f2b00<br>agregadora não reconhecida: f2b15, f2b16 → `data-rm-agrega` | depois do piloto |
| 10 | Embriología (`embriologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: emb00<br>agregadora não reconhecida: emb14, emb15 → `data-rm-agrega` | depois do piloto |
| 11 | Biología (`biologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: bio00 | depois do piloto |
| 12 | Histología I (`histologia-i`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: histo00<br>agregadora não reconhecida: histo13, histo14 → `data-rm-agrega` | depois do piloto |
| 13 | Histología I Práctica (`histologia-i-practica`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: hp00<br>portada declara número ≠ contagem real (12 bloques × canônico ? (indeterminado); 3 preguntas × canônico 106) | depois do piloto |
| 14 | Histología II Práctica (`histologia-ii-practica`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: h2pportada<br>agregadora não reconhecida: h2pmazo → `data-rm-agrega` | depois do piloto |
| 15 | Histología II (`histologia-ii`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: h2portada<br>portada declara número ≠ contagem real (75 preguntas × canônico 226) | depois do piloto |
| 16 | Anatomía I (`anatomia-i`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: a1b00 | depois do piloto |
| 17 | Anatopatologia II (`anatomia-patologica-ii`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: ap2intro, ap2biblio | depois do piloto |
| 18 | Anatopatologia II Práctica (`anatomia-patologica-ii-practica`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: ap2pportada<br>agregadora não reconhecida: ap2pmazo → `data-rm-agrega` | depois do piloto |
| 19 | Medicina Legal (`medicina-legal`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: medlegb00 | depois do piloto |
| 20 | Fisiopatologia II (`fisiopatologia-ii`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: fp2portada<br>agregadora não reconhecida: revisaofp2 → `data-rm-agrega` | depois do piloto |
| 21 | Toxicología (`toxicologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | agregadora não reconhecida: toxcierre → `data-rm-agrega` | depois do piloto |
| 22 | Dermatología (`dermatologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | agregadora não reconhecida: dermcierre → `data-rm-agrega` | depois do piloto |
| 23 | Guaraní (`guarani`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | título `<h2>` em: gn00<br>agregadora não reconhecida: mazognrl → `data-rm-agrega` | depois do piloto |
| 24 | Ortopedia y Traumatología (`ortopedia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | — | depois do piloto |
| 25 | Oftalmología (`oftalmologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | agregadora não reconhecida: oftcierre → `data-rm-agrega` | depois do piloto |
| 26 | Neurología (`neurologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | agregadora não reconhecida: revisaoneu → `data-rm-agrega` | depois do piloto |
| 27 | Anestesiología (`anestesiologia`) | expansão | ✅ | ✅ | ✅ | A2, A3, A7, C3, C4, C8 | sem gravação autorizada ⇒ sem card ✅ | agregadora não reconhecida: anecierre → `data-rm-agrega` | depois do piloto |

## Falhas

Nenhuma falha em nenhuma das rodadas acima.


## O que falta para UMA matéria de expansão funcionar no site (nenhum passo executado)

1. Merge de #487 (tema/conteúdo solto) e #489 (áudio por matéria) — decisão de José.
2. PR pós-#484 (A7/C8/versão), coordenada com Claude 1 (`pos-484/README.md`).
3. **Roteiro físico no piloto** (`ROTEIRO-PILOTO-FISICO.md`) — caneta, grifos, navegação e áudio. Sem ele, nenhuma expansão é proposta.
4. Descritor da matéria **aprovado** (`DESCRITORES-PROPOSTA.md`) + os ajustes de conteúdo da coluna «Falta no conteúdo».
5. A5: o servidor libera layout/caneta só para a conta de José naquela matéria; roteiro físico de novo, nela.
6. Áudio daquela matéria: só quando houver gravação, pelos 3 passos do Netlify (`tools/qa/audio-server/README.md`).

