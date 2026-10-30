# Prontidão para a Nova Era (layout + caneta) · Farmacología II, Fisiopatología II, Semiología II e Toxicología

**Data:** 30/10/2026 · **Base:** `main` `bf4cf22a` (com a #608 e o inventário de Toxicología da #605) · **Autora:** Claude 2 · **Somente leitura:** nenhuma flag foi ativada, nenhum arquivo de implantação do Claude 4 e nenhum arquivo de `coordination/painel/` foi tocado; as consultas ao banco foram só `SELECT`.

## 1 · Tabela única

| Ordem p/ Claude 4 | Matéria | Porta (`porta-da-materia.sh`) | Dados de alunos existentes (SELECT) | Testes | Limite conhecido | Classificação |
|---|---|---|---|---|---|---|
| **1** | **Toxicología** | **PORTA ABERTA** (7/7) | 0 grifos · 0 traços · 0 notas (7 progressos de leitura) | Âncoras 1440/390 **PASSA** (19 seções, 7415 elementos) · Ida e volta **PASSA** (10 grifos, 6 traços, 1 nota semeados; iguais no layout e na volta) · Layout 4 larguras **240/0 falhas** · Uso **46/0** · Guard ✅ · Navegador ✅ | `toxportada` é uma seção vazia e `hidden` (placeholder): fica fora do índice por regra; sem dados de alunos nela | **Pronta** |
| **2** | **Fisiopatología II** | **PORTA ABERTA** (7/7) | 47 grifos (5 alunos, hash `f9c36260…`) · 0 traços · 0 notas (24 progressos) | Âncoras **PASSA** (20 seções, 9325 elementos) · Ida e volta **PASSA** (7 grifos, 6 traços, 1 nota) · Layout **240/0** · Uso **46/0** · Portão de grifos reais **47/47** · Guard ✅ · Navegador ✅ | `fp2portada` é placeholder oculto (sem dados nele) | **Pronta** |
| **3** | **Farmacología II** (inclui o PDF novo da #608) | **PORTA ABERTA** (7/7) | 240 grifos (12 alunos, hash `9d6fec3d…`) · **1 traço** (âncora `f2b00`) · 0 notas (65 progressos) | Âncoras **PASSA** (17 seções, 5115 elementos) · Ida e volta **PASSA** (10 g, 6 t, 1 n) · Layout **220/0** · Uso **46/0** · Portão de grifos reais **238/240** (os 2 já obsoletos antes da #608; nenhum dos grifos toca as 2 frases da #608) · Guard ✅ · Navegador ✅ | (a) o único traço real está em `f2b00`, seção **vazia e oculta**: fica guardado, mas **invisível** com o layout (decisão do José se migra); (b) 2 grifos antigos já não pintam (obsoletos desde a #474) | **Pronta com limite** |
| **4** | **Semiología II** | **PORTA ABERTA** (7/7) | 152 grifos (8 alunos, hash `d896ec36…`) · **26 traços** (1 aluno: `s2-b01` ×24, `s2-b01>19` ×1, `s2-b03>1` ×1) · 0 notas (39 progressos) | Âncoras **PASSA** (14 seções, 2637 elementos) · Ida e volta **PASSA** (8 g, 6 t, 1 n) · Layout **248/0** · Uso **46/0** · Os 20 grifos novos de `s2-b06` (desde a #594) conferidos um a um: **20/20** com o texto presente na página · Guard ✅ · Navegador ✅ | (a) traços reais em `s2-b01`: o layout precisa **manter a geometria do bloco 01** (foi o cuidado da #532) — só o roteiro físico com a caneta no iPad confirma; (b) o descritor já lista a matéria no grupo **piloto**: não verifiquei o estado real das flags | **Pronta com limite** |

**Ordem recomendada e por quê:** (1) Toxicología — nenhum dado de aluno, risco mínimo, bom primeiro caso; (2) Fisiopatología II — só grifos de texto, sem traços; (3) Farmacología II — traço órfão em placeholder oculto, decidir o destino antes; (4) Semiología II por último — é a que tem mais traços reais (26) e grifos novos; deve ir com o roteiro físico de caneta/iPad e consulta de grifos repetida no dia.

## 2 · O que cada teste mede (resumo)

- **Porta** = 7 etapas: inventário em dia · marcadores `data-rm-agrega` no HTML · âncoras estáveis (1440 e 390 px) · ida e volta de grifos/traços/nota entre layout atual e novo (e volta) · layout em 4 larguras (390/768/1024/1440) · uso de caneta/modos (1024 e 390) · inventário de risco. Todas passaram nas quatro matérias, sem falhas nem bloqueios.
- **Antes/depois:** a etapa de ida e volta semeia grifos, traços e uma nota com o motor real **antes** do layout, mede, troca para o layout novo, mede, volta e mede: nas 4 matérias os mesmos itens aparecem iguais nas três fases, sem escrita no banco. Isto usa dados **semeados** num banco simulado. Com dados **reais**: portão de grifos (`hl-real.cjs --gate`) em Farmacología II (238/240) e Fisiopatología II (47/47) — contra a página atual, e hash dos grifos de cada matéria conferido por `SELECT`; Semiología II conferida como descrito na tabela.
- **Estrutura (blocos, imagens, perguntas, banco, cartões):** contagens por matéria na seção 3; `verify.py` (ids, perguntas, cartões, gabaritos, classes, links, data-attrs) **OK nas 4** contra a própria `main`.
- **Navegador (390 celular / 820 tablet / 1366 desktop):** 0 erros JS, 0 erros http, 0 imagens quebradas, sem scroll horizontal e primeira seção correta (as portadas ocultas de Farmacología II, Fisiopatología II e Toxicología não aparecem) nas 4.
- **Guard:** executado sobre este relatório (ver PR); as páginas não foram alteradas.

## 3 · Contagens (blocos, banco espelhado, cartões, imagens)

| Matéria | Seções com id | Perguntas corpo = banco | Total no navegador (perguntas / cartões) | Imagens (`<img>`) / SVG | Ids |
|---|---|---|---|---|---|
| Farmacología II | 18 (1 oculta) | 214 = 214 | 428 / 876 | 64 / 79 | 257 |
| Fisiopatología II | 20 (1 oculta) | 364 = 364 | 728 / 2046 | 33 / 75 | 1026 |
| Semiología II | 14 | 120 = 120 | 240 / 366 | 0 / 12 | 130 |
| Toxicología | 19 (1 oculta) | 349 = 349 | 698 / 1416 | 45 / 44 | 940 |

Espelho do banco: as contagens são iguais; comparando enunciado + alternativas + início da resposta de cada pergunta entre o corpo e o banco, o conteúdo coincide (as únicas diferenças que sobram na extração automática são o cabeçalho do bloco seguinte colado ao último item de cada bloco, não diferença de conteúdo); o Guard não aponta `banco-geral` para estas quatro.

## 4 · Dados e decisões que ficam para humanos

1. **Traço em `f2b00` (Farmacología II):** decidir se o traço é migrado para uma seção visível ou segue guardado/invisível.
2. **Semiología II:** roteiro físico com caneta no iPad sobre `s2-b01` e `s2-b03>1` antes de ligar; confirmar o estado real das flags do piloto.
3. **Grifos de Farmacología II e Fisiopatología II:** 4 frases de voz de prova de Farmacología II (nebivolol, «Regla de oro», «palabras vecinas», «ya cayó en prueba») continuam por causa de grifos de alunos (limite G0 conhecido; **não** bloqueia o layout).
4. Para as quatro, ainda faltam o que a porta sempre avisa: Etapa 0 de código, descritor aprovado, roteiro físico de 3 minutos e a ordem do José.

## 5 · Limites desta rodada

- Os testes automáticos usam Chromium com Supabase simulado; **não** foi testado em iPad/caneta física.
- A ida e volta usa dados semeados; os dados reais entram por hash, por consulta e pelo portão de grifos (Semiología II sem arquivo de registros completo: os 132 grifos antigos foram conferidos por consulta de trechos nas PRs #594 e #604, sem conflito, e as edições posteriores a isso não tocaram esses trechos).
- Não foi feita revisão editorial geral (fora do pedido).
