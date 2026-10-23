# Auditor de Matérias (API do ChatGPT) — manual

> **Em uma frase:** um botão no GitHub faz a API do ChatGPT ler as matérias,
> comparar com as leis do projeto e **anotar** o que está bom e o que está
> errado. Ele **nunca corrige nada**. Quem corrige é um Claude, depois de
> conferir cada anotação.

Este manual serve para o **José**, para o **coordenador ChatGPT** e para
**qualquer Claude**. Quando o José disser «roda a manutenção» ou «roda o
auditor», é isto aqui.

---

## 1. Como rodar uma rodada

### Pelo José (4 cliques)
1. Abrir **github.com/Repassomed/Repasso-Med-Site-/actions**.
2. Na lista da esquerda, clicar em **«Auditor de Matérias (ChatGPT · só anota)»**.
3. Botão **«Run workflow»** (à direita). Deixar a branch `main`.
4. Escolher o **modo** (ver tabela abaixo) e clicar no botão verde **«Run workflow»**.

Pronto. Em alguns minutos (rápida) ou algumas horas (completa) o relatório aparece
na PR **«[AUDITORIA API · ChatGPT] Relatórios de manutenção das matérias — NÃO MERGEAR»**.

### Por um Claude (sem o José clicar)
Disparar o workflow `repasso-auditor-materias.yml` na ref `main`, com os inputs
`modo`, `materias` (opcional) e `limite_usd` (opcional). Pela ferramenta do GitHub:
`actions_run_trigger` → `run_workflow`, `workflow_id: repasso-auditor-materias.yml`, `ref: main`.
Depois, acompanhar a execução em Actions e avisar o José quando a PR for atualizada.

### Modos

| modo | o que faz | custo estimado* | quando usar |
|---|---|---|---|
| `rapida` (padrão) | lê **um pedaço** (~120 mil caracteres) de **cada** matéria. Na rodada seguinte, continua de onde parou. | **~US$ 3** por rodada | manutenção de rotina. Umas 7 rodadas rápidas cobrem o site inteiro. |
| `completa` | lê **cada matéria inteira** | **~US$ 20** por rodada | antes de uma fase grande (ex.: antes de ligar o layout novo em todas) |
| `so_verificacao` | **sem IA**: só as checagens automáticas (voz de prova, «Cómo estudiar», pistas de gabarito, imagens sem texto) | **grátis** | conferir rápido depois de um lote de PRs |

\* **Medido em 16/10/2026:** uma chamada (um pedaço de ~120 mil caracteres) custou
cerca de **US$ 0,11** (≈37 mil tokens lidos e 3 mil escritos). A rápida faz 26
chamadas (≈US$ 3); a completa faz ~190 (≈US$ 20). Estimativa pelo preço cheio do modelo `gpt-5.6-terra` (US$ 2 por milhão de
tokens lidos e US$ 12 por milhão escritos). O custo **real de cada rodada** fica
escrito no topo do relatório. O cache automático da OpenAI costuma deixar a
fatura menor que o número calculado.

**Freio de gasto:** cada rodada tem teto (padrão US$ 5 na rápida e US$ 25 na
completa; dá para mudar no campo `limite_usd`). O auditor reserva o pior caso
**antes** de cada chamada; se o teto chegar, ele para e marca as matérias que
faltaram com ⏸️. Nunca passa do teto.

**Só algumas matérias:** no campo `materias`, escrever os slugs separados por
vírgula, por exemplo `dermatologia,neurologia`. Lista de slugs: tabela da seção 6.

---

## 2. Onde ler o resultado

Tudo fica na branch `auditoria/api-chatgpt`, pasta `coordination/auditoria-api/`,
e a PR viva mostra o placar da última rodada.

| arquivo | para quem | o que tem |
|---|---|---|
| `ULTIMA-RODADA.md` | José e coordenador | placar e tabela das 27 matérias da rodada mais recente |
| `rodadas/<data>/RELATORIO.md` | todos | o mesmo, guardado por rodada (histórico) |
| `rodadas/<data>/materias/<slug>.md` | Claude que vai corrigir | resumo, notas, pontos fortes, **achados numerados** e checagens automáticas |
| `rodadas/<data>/achados.json` | máquinas | tudo em JSON |
| `estado.json` | o próprio auditor | onde cada matéria parou (modo rápido) e histórico de custos |

**A PR viva nunca é mesclada.** Ela existe só para guardar os relatórios.

### Como ler

| veredito | quer dizer |
|---|---|
| ✅ ok | nada relevante a corrigir no que foi lido |
| 🟡 ajustes | correções pontuais |
| 🟠 editorial | precisa de passada editorial (G0, densidade, repetição, didática em vários blocos) |
| 🔴 grave | erro científico ou gabarito errado: olhar primeiro |
| ⚠️ falhou · ⏸️ sem saldo · 🚫 adiada · ⚪ só checagem | não foi auditada pela IA nesta rodada |

Cada achado tem um código (ex.: `dermatologia-03`), gravidade **P0 a P3**, tipo
(ciência, G0, voz de prova, questões, densidade, repetição, idioma…), o **trecho
literal** e a sugestão. Ao lado do trecho aparece:
- ✅ **trecho localizado no texto**: a frase existe mesmo na matéria;
- ⚠️ **trecho NÃO localizado**: a IA pode ter inventado ou parafraseado. Conferir com cuidado redobrado.

**A IA erra às vezes.** O relatório é uma lista de suspeitas bem
documentadas, não uma ordem.

---

## 3. Passar as correções para um Claude

Copiar, trocar `<DATA>` e `<SLUG>` e colar no chat do Claude:

```
Tarefa: aplicar as correções da auditoria automática na matéria <SLUG>.
Relatório: branch auditoria/api-chatgpt, arquivo
coordination/auditoria-api/rodadas/<DATA>/materias/<SLUG>.md

1. Parta da main atual. Leia CLAUDE.md, LEI-G0-ALMA-REPASSO-MED.md,
   MANUTENCAO-DIDATICA-REPASSO-MED.md e coordination/auditoria-api/README.md (seção 4).
2. Para CADA achado, confira na matéria e na ciência se ele é verdadeiro.
   Classifique: CONFIRMADO, PARCIAL ou REJEITADO (com o motivo).
3. Corrija só os CONFIRMADOS/PARCIAIS, sem reduzir profundidade e sem mexer em
   ids, âncoras, questões, flashcards ou contagens sem motivo registrado.
4. Antes de mudar uma frase, consulta SOMENTE LEITURA de grifos no Supabase.
   Frase com grifo de aluno não muda agora: fica listada no PR.
5. Uma matéria por PR, com o modelo de PR do repositório (ESCOPO + Cartão de Merge).
   No PR, uma tabela: código do achado → decisão → o que foi feito.
```

O coordenador (ChatGPT) pode montar um lote: «Claude 1: achados P0/P1 de A, B, C».
Prioridade sugerida: 🔴 grave → P0/P1 de ciência e questões → voz de prova →
🟠 editorial → o resto.

---

## 4. Regras para o Claude que corrige

1. **Conferir antes de corrigir.** Achado sem trecho localizado (⚠️) ou que contradiz
   a cátedra/literatura é REJEITADO com motivo. Não «corrigir» o que já está certo.
2. **Ciência e fonte oficial vencem a IA.** A G0 nunca justifica cortar mecanismo.
3. **Preservar** os pontos fortes que o relatório cita.
4. **Grifos, caneta e notas dos alunos** seguem as regras de sempre (consulta só de
   leitura antes de mudar texto).
5. **Uma matéria por PR.** Nunca corrigir dentro da PR viva da auditoria.
6. O relatório pode estar velho: se a matéria mudou depois da rodada, conferir na
   main atual.

## 5. Para o coordenador ChatGPT

- Para «rodar a manutenção»: peça ao José os 4 cliques da seção 1 (modo `rapida`),
  ou peça a um Claude para disparar.
- Ao receber o `ULTIMA-RODADA.md`, devolva ao José uma tabela simples: matéria →
  veredito → quem corrige → prioridade. Use 🟢🟡🔴🧪 como de costume.
- Distribua as correções respeitando quem está com cada matéria (ver painel).
- Uma mesma suspeita em duas rodadas seguidas tem mais peso. Uma suspeita isolada
  com ⚠️ trecho não localizado tem pouco peso.

---

## 6. Como funciona por dentro (para Claude)

| peça | onde |
|---|---|
| botão / workflow | `.github/workflows/repasso-auditor-materias.yml` |
| script | `coordinator/auditor_materias.py` (testes em `coordinator/tests/test_auditor_materias.py`) |
| régua que vai para a IA | `coordination/auditoria-api/RUBRICA.md` + `LEI-G0-ALMA-REPASSO-MED.md` inteira |
| lista de matérias | lida de `netlify/functions/get-materia.js` (matéria nova entra sozinha) |

Fluxo: checkout da `main` → HTML vira texto compacto (sem scripts/estilos) →
checagens automáticas na matéria inteira → chamadas à OpenAI (Responses API,
`store=False`, 4 em paralelo, 1 nova tentativa por erro) → relatório em `/tmp` →
cópia **só** para `coordination/auditoria-api/` na branch `auditoria/api-chatgpt`
→ PR viva criada/atualizada. Uma trava no workflow falha a rodada se qualquer
arquivo fora do relatório for alterado.

**O que o auditor nunca faz:** editar matéria, mesclar PR, publicar no Netlify,
tocar Supabase/login/pagamento, guardar o conteúdo na OpenAI (`store=False`).

**Chave:** o Secret `OPENAI_API_KEY` do GitHub (o mesmo que já existia). Ela só
entra na etapa «Rodar o auditor».

**Trocar de modelo:** criar a variável de repositório `REPASSO_AUDITOR_MODEL`
(Settings → Secrets and variables → Actions → Variables). Sem ela, usa
`gpt-5.6-terra`. Se o modelo novo não estiver na tabela de preços de
`coordinator/openai_budget.py`, o custo é calculado com o preço do Terra.

**Mudar a régua:** editar `RUBRICA.md` (e a lei original, se for o caso) num PR
normal. A rodada seguinte já usa a versão nova.

**Matéria adiada:** `ADIADAS` em `auditor_materias.py` (hoje só Imagenología, por
decisão do José). Para auditar mesmo assim, escrever o slug no campo `materias`.

**Relação com o robô antigo:** o «Repasso Quality Scan» (`repasso-quality-scan.yml`)
audita uma matéria por vez e grava em `coordination/quality/`. O auditor novo
substitui esse uso para a manutenção periódica; o antigo não foi apagado.

Slugs: `anatomia-patologica`, `anatomia-patologica-practica`, `fisiopatologia`,
`imagenologia`, `semiologia`, `farmacologia`, `medicina-familiar`, `semiologia-ii`,
`farmacologia-ii`, `embriologia`, `histologia-i`, `histologia-i-practica`,
`histologia-ii`, `histologia-ii-practica`, `anatomia-i`, `biologia`,
`medicina-legal`, `anatomia-patologica-ii`, `anatomia-patologica-ii-practica`,
`fisiopatologia-ii`, `toxicologia`, `dermatologia`, `guarani`, `ortopedia`,
`oftalmologia`, `neurologia`, `anestesiologia`.
