# Integração A5 + A7 + C8 + C9 (+ R14) — um só merge técnico

> **Nada foi ligado.** Nenhuma flag, variável do Netlify, lista de contas, `ROLLOUT`, `CANDIDATAS` ou matéria foi alterada além do que está descrito. Todas as matérias novas seguem **desligadas por padrão**. Esta PR **substitui** as PRs #582, #583, #584 e #585 (feche-as sem merge ao mergear esta).
> Base: `main` `d1f1ba2d` (já com a #581). Resultados abaixo: rodada de 28–29/10/2026 sobre o código desta branch.

## 1 · O que entra

| Correção | Arquivos | Efeito hoje |
|---|---|---|
| **A5** gate por matéria | `get-pilot-flags.js`, `rm-pilot.js` | Nenhum: as 3 variáveis de matéria não existem no Netlify e `CANDIDATAS` = só o piloto |
| **A7** caneta física por matéria | `rm-tools-v2.js` | Nenhum: `pilotoPermitido()` só é true no piloto |
| **C8** tinta realinha após transição | `rm-tools-v2.js` | Só para as 2 contas que já têm a caneta V2: tinta deixa de ficar 3 px fora após hover |
| **C9** seção vazia/oculta não é bloco | `rm-layout.js`, `rm-materia-sistema.js` | Nenhum (layout só roda na Semiología II, que não tem placeholder) |
| **R14 (novo)** tinta em tabela larga | `rm-tools-v2.js` | Só para as 2 contas com a V2: a página não alarga mais no celular quando há traço em tabela larga; o traço acompanha a rolagem da tabela |
| Testes/ferramentas | `tools/qa/pre-voo/*`, `ensaio-layout`, `pilot-flags.test`, `inventario.json` regenerado | — |

## 2 · Choques resolvidos (nada perdido, nenhuma versão de cache reduzida)

| Arquivo | Choque | Resolução |
|---|---|---|
| `index.html` — `rm-tools-v2.js?v=` | main `2026101301`; A7 `2026102702`; C8 `2026102703` | **`2026102801`** (maior que todas) |
| `index.html` — `rm-pilot.js?v=` | main `2026100803`; A5 `2026102701`; C9 `2026102702` | **`2026102801`** (maior que todas) |
| `rm-pilot.js` — `VER` | A5 `2026102701` × C9 `2026102702` | corpo da A5 + **`2026102801`**, igual à tag do `index.html` (os módulos que o piloto carrega — layout, tema, navegação — também invalidam o cache de 7 dias) |
| `rm-tools-v2.js` | A7 (portão) e C8 (ouvintes) | auto-merge sem sobreposição; R14 acrescentado por cima; `grep` confirma as 4 marcas no arquivo final (`penLiberadaPeloServidor(slug)`, `aoFimDaTransicao`, `rolavelH`, `overflow-x:clip`) |
| utilitários de teste | `lib-dados.cjs` em 4 branches | idêntico byte a byte (merge limpo); `ativar.js`/`lib.cjs` (A7) e `ensaio.cjs`/`interacao.cjs` (C9) sem sobreposição |

## 3 · A tinta em tabela larga (R14): tratada, não só isolada

- **Defeito:** traço sobre `<table>` mais larga que o contêiner rolável (`.rmc-scroll`/`.s2-scroll`) era normalizado pela caixa inteira da tabela; o `svg` passava da viewport e `scrollWidth` ia de 390 a 407–426. O Chromium móvel afastava a página e a ponta se desencontrava ~31 px da tinta.
- **Correção:** (1) `#rm2-ink { overflow-x: clip }` — a camada **nunca** alarga a página; (2) o `svg` recebe `clip-path` pelo retângulo do contêiner rolável, então o traço só aparece na parte da tabela que está à vista; (3) ouvinte de `scroll` (captura, um reposicionamento por quadro, nunca durante um traço) faz o traço **acompanhar** a rolagem horizontal da tabela.
- **Prova:** `tinta-tabela-larga.test.cjs` — Semiología II e Farmacología II em 390 px (3 tabelas largas cada) e Semiología II em 1440: página não alarga, `clip-path` presente, svg desloca exatamente o que a tabela rolou, volta ao lugar, parágrafos comuns sem clip, dados idênticos. **Na `main` o mesmo teste reprova** (426 px). E a suíte `caneta-novo-layout`, que acusava o defeito, passou de 90/91 para **91/91**.
- **Limite honesto:** a tinta de uma tabela que o aluno rola fica **cortada** à janela da tabela (correto) e é redesenhada a cada quadro de rolagem; a primeira ativação deve medir isso no iPad (o Safari pode atrasar um quadro).

## 4 · Resultado real das rodadas

| Verificação | Resultado |
|---|---|
| **Testes novos/PR por PR, sobre o código integrado** | `pilot-flags` 22/22 · `gate-por-materia` **48/48** (servidor real → `rm-pilot.js` real → `rm-tools-v2.js` real; inclui retorno) · `caneta-por-materia` 34/34 · `tinta-hover` 10/10 · `tinta-tabela-larga` **24/24** · `secoes-vazias` 95/95 (11 matérias) |
| **Controle de não ativação** (`nao-ativacao.test.cjs`, 27 matérias, `rm-pilot.js` e servidor SEM nenhuma alteração de teste, conta em TODAS as listas de UID) | **17/17**: só o piloto recebe layout (1 requisição); as outras 26 não montam layout, **não fazem requisição**, caneta física = false; kill switch geral desliga também o piloto; variável de matéria preenchida mas matéria fora das `CANDIDATAS` ⇒ continua desligada; `CANDIDATAS` = só `semiologia-ii`; nenhum curinga; `netlify.toml`/repositório não definem as variáveis; `ROLLOUT='beta'` |
| **Teste 1 · âncoras dos traços** (27 matérias × celular 390 + computador 1440; 8 estados cada) | **54 medidas = 54 PASSA** (arquivo completo em `resultados/integracao/ancoras-estaveis.json`, commit `ab60b1b3`, `parcial=false`) |
| **Teste 2 · ida e volta de grifos, notas e traços** (27 matérias × 390 + 1440; layout atual → novo → volta) | **54 medidas = 54 PASSA** — 400 grifos, 321 traços, 54 notas gravados e relidos, 0 escrita no banco |
| **Ensaio do layout nas 27 matérias × 390/768/1024/1440** (celular, tablet, computador) | «como está»: 6 289 PASSA · 68 FALHA (= só B3, `data-rm-agrega` por declarar: 52+12, e B2) — **os 158 de antes caíram para 68 porque a C9 eliminou todo o B1**. **Com a correção simulada do marcador: 6 353 PASSA · 4 FALHA = Anatopatologia II `pager-cadeia` (B2, título de `ap2biblio`, editorial)**; as outras 26 matérias: 0 falha nas 4 larguras |
| **Uso — caneta CDP, palma, goma, pinça/zoom, rolagem, grifo, troca de bloco/modo, recarregar, questões, cartões — 27 matérias × 4 larguras** | **2 485 verificações, 0 falha, 0 bloqueio**. (Houve 1 falha na 1.ª passada: Histología II Práctica a 768 px gravou `upsert:user_study_progress`; é o progresso de leitura do motor legado, reproduzido igual na `main` `d1f1ba2d` sem as correções; o teste agora o reconhece e a matéria foi repetida: 93/93.) |
| **Linha de base das suítes do piloto** | `pilot-flags` 22/22 · `layout` 535/535 · `sistema` 124/124 · `nav-sistema` 216/216 · `cover` 198/198 · `soltos` 16/16 · `race` 140/140 · `ink-jump` 54/54 · `caneta-ipad-456` 197/197 · **`caneta-novo-layout` 91/91** (era 90/91: o defeito R14) · `caneta-456` 136/138 (**2 falhas conhecidas**: tolerância do post-it a 390 px, #464, iguais na `main`) |
| **Guard** | local: sem erro duro; no GitHub: ver a PR |

Arquivos: `resultados/integracao/` (JSON completos, compacto do ensaio, suítes, controle de não ativação). Reproduzir: `PLANO.md` §8 e os comandos em cada teste.

## 5 · Riscos que restam (para a primeira ativação)

| # | Risco | Tratamento / o que falta |
|---|---|---|
| 1 | **Safari/iPadOS + Apple Pencil** (latência, palma do sistema, Scribble, `pointerup` perdido; e a rolagem de tabela larga com a ponta) | nada disso é provável no Chromium: **roteiro físico de 3 min na 1.ª matéria**, incluindo rolar uma tabela larga e escrever sobre ela |
| 2 | Dois **chaveamentos humanos** para ligar uma matéria (PR de `CANDIDATAS` + variável no Netlify): erro de digitação | slug com formato validado no servidor; curinga não existe; `porta-da-materia.sh` antes e depois |
| 3 | **Cache de 7 dias**: quem abriu o site antes mantém módulos velhos | as duas tags subiram para `2026102801`; a volta do código também precisa de tag MAIOR |
| 4 | **B3 — `data-rm-agrega`** em 17 seções de 13 matérias + **B2** `ap2biblio` (Anatopatologia II) | editorial, por matéria, antes de qualquer uma entrar em `CANDIDATAS`; a porta acusa (`agrega-no-html.py`) |
| 5 | **Índice de traço × edição de conteúdo**: o banco guarda `secção>índice`, não o conteúdo | `deslocamento-de-indice.py` em PR de conteúdo das matérias com traço; `data-rm-content-rev` quando a estrutura mudar |
| 6 | Matérias grandes (7–9 mil sub-âncoras): custo de reposicionar a tinta a cada quadro de rolagem de tabela | o ouvinte só age com tinta desenhada, 1×/quadro, nunca durante um traço; medir no aparelho antes da classe E |
| 7 | **Tinta cortada à janela da tabela** (comportamento novo da R14, correto) | pode surpreender quem desenhou na parte rolada; documentado no roteiro físico |
| 8 | `ink-audit` (PostgreSQL local, RLS, paginação) **não** reexecutado | rodar antes de abrir para todos |
| 9 | Dados vivos (grifos/traços) são de 24/10 | refazer `ids-vs-banco.py` com consulta nova antes de cada matéria |
| 10 | A conta fixa `JOSE_UID` deixou de bastar fora do piloto (por desenho) | quem testar a caneta numa 2.ª matéria precisa também de `RM_PEN_SLUGS` e estar em `RM_PILOT_PEN_UIDS` |

## 6 · Roteiro de volta (rollback)

| Nível | Quando | Como | Tempo | Efeito nos dados |
|---|---|---|---|---|
| **L0 · não ativado (hoje)** | sempre | nada a fazer: as variáveis de matéria não existem | — | — |
| **L1 · uma matéria** | problema numa matéria liberada | tirar o slug de `RM_LAYOUT_SLUGS`/`RM_VISUAL_SLUGS`/`RM_PEN_SLUGS` no Netlify | imediato, sem deploy | nenhum: layout antigo, grifos/traços/notas idênticos (teste de retorno em `gate-por-materia`, 48/48) |
| **L2 · só a caneta física** | a caneta regride | tirar o slug de `RM_PEN_SLUGS` | imediato | traços já gravados ficam |
| **L3 · tudo** | incidente geral | esvaziar `RM_PILOT_LAYOUT_UIDS`/`RM_PILOT_VISUAL_UIDS`/`RM_PILOT_PEN_UIDS` | imediato | nenhum |
| **L4 · este código** | defeito num módulo | `git revert` do merge desta PR **e** subir de novo as tags (`rm-tools-v2.js` e `rm-pilot.js` para um valor MAIOR que `2026102801`, nunca voltar a um menor: o cache dura 7 dias) | um deploy | nenhum dado tocado |
| **L5 · V2 inteira** | só se a V2 falhar | `ROLLOUT='off'` (não rodar o rollback SQL) | um deploy | dados preservados |

## 7 · Antes da primeira ativação (não feito aqui)

1. Decidir a matéria piloto (proposta do plano: **Medicina Familiar** — porta aberta hoje) e incluí-la em `CANDIDATAS` por PR própria (1.ª fechadura).
2. Descritor/tema aprovado por José e `data-rm-agrega` onde faltar (`RESULTADOS.md` §5).
3. Só então preencher `RM_LAYOUT_SLUGS` no Netlify **para a conta de José** (2.ª fechadura), roteiro físico de 3 min no iPad (inclui rolar uma tabela larga com a caneta), observar 24 h, repetir `porta-da-materia.sh`.
