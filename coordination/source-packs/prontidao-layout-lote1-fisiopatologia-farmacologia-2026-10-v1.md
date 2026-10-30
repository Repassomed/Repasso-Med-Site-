# Prontidão de layout/caneta · lote 1 · Fisiopatología I e Farmacología I

**Data:** 30/10/2026 · **Base:** `main` `60730c32` · **Agente:** Claude 1 · **Escopo:** só relatório; nenhuma matéria, flag, motor global, painel ou `tasks.json` foi alterado. Nada foi ativado.

## Classificação

| Matéria | Resultado | Motivo | Próxima ação |
|---|---|---|---|
| **Fisiopatología I** (`fisiopatologia`) | **Pronta com limite** | Porta 7/7 passa; estrutura e conteúdo sem erro que bloqueie. Limite: o Supabase estava desconectado nesta sessão, então os grifos/notas/traços **não foram reconsultados hoje**; vale o snapshot de 24/10 (33 grifos, 1 usuário) | Reconsultar grifos/notas/traços (SELECT) no dia da implantação e fazer o roteiro físico de 3 min (Safari/iPad), que nenhum teste automático substitui |
| **Farmacología I** (`farmacologia`) | **Pronta com limite** | Idem: porta 7/7 passa; snapshot de 24/10 com 23 grifos de 2 usuários; mesma limitação de consulta | Idem |

Nenhuma das duas está bloqueada: não abri PR de correção.

## Testes executados (por mim, sobre a `main` `0a04d0e0`/`60730c32`)

`NODE_PATH=$(npm root -g) sh tools/qa/pre-voo/porta-da-materia.sh <slug>`, 7 passos cada: inventário em dia, marcadores `data-rm-agrega` no HTML, âncoras estáveis, ida e volta, layout em 390/768/1024/1440, uso com caneta nos modos, inventário de risco.

| Verificação | Fisiopatología I | Farmacología I |
|---|---|---|
| Porta (7 passos) | **PORTA ABERTA** | **PORTA ABERTA** |
| Início direto no conteúdo | Sim: a 1.ª seção é «Introducción — Adaptación, lesión y muerte celular», com «Resumen explicado (desde cero)» e a pergunta-guia do ano; sem placeholder nem seção vazia | Sim: a 1.ª seção é «01 · Farmacocinética», que começa pela imagem do «viaje del medicamento» e a sigla LADME; sem placeholder |
| Clareza para quem começa do zero | Cada bloco abre com «desde cero» | Abre com analogia e explica cada etapa |
| G0 / voz de prova (varredura: «lo que cae», «cae en el examen», «tema/clave/pregunta de examen», instruções de resposta) | 0 ocorrências; 1 uso didático de «trampa» («es la trampa de siempre»), sem voz de prova | 0 ocorrências; 1 uso didático («la trampa clásica está en el gráfico») |
| Seções | 14 (sem seção vazia nem sem título) | 21 |
| Perguntas | 332 (170 do banco `prova-fisio`, 162 nos blocos); o «170» declarado no texto confere com o banco | 191 |
| MCQ e letras do gabarito | 214 MCQ: 54/54/53/53; maior corrida 5; 1 «abcd» | 85 MCQ: 23/24/19/19; maior corrida 3 |
| Cartões | 260 | 412 |
| Imagens | 39 referenciadas, 0 faltando, 0 sem `alt` | 72 referenciadas, 0 faltando, 0 sem `alt` |
| IDs duplicados | 0 | 0 |
| Guard (verificações do arquivo inteiro) | assets ok, gabaritos válidos, HTML equilibrado; 🟡 aviso de contagem declarada «170» é heurística (confere com o banco) | assets ok, gabaritos válidos, HTML equilibrado |
| `data-rm-agrega` | não necessário (sem agregadora fora do padrão do nome) | idem |

## Dados de alunos (somente leitura)

- **Consulta de hoje: não realizada.** O conector do Supabase estava desconectado nesta sessão (ToolSearch não o encontra). Não foi gravado nada.
- **Snapshot do repositório** (`docs/pre-voo-caneta-layout/dados-vivos.json`, SELECT somente leitura de 24/10/2026): `fisiopatologia` 33 grifos de 1 usuário; `farmacologia` 23 grifos de 2 usuários; notas 0 e traços 0 (sem linha no snapshot).
- Nenhum texto de matéria foi alterado nesta rodada, então os grifos existentes não são afetados.

## Risco real

- **Baixo:** a porta e os testes próprios passam; não há erro de conteúdo que impeça a implantação.
- **Residual:** (1) o roteiro físico em Safari/iPadOS e Apple Pencil continua não provado; (2) os dados de alunos precisam ser reconsultados antes de ligar qualquer coisa.

## Ordem recomendada de implantação (entre as duas)

1. **Fisiopatología I** primeiro: 1 usuário com grifos (menor exposição).
2. **Farmacología I** em seguida: 2 usuários.

«Porta aberta» não liga nada; layout e caneta permanecem desativados.
