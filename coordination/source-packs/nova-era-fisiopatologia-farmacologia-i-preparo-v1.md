# Nova Era · Fisiopatología I e Farmacología I · preparo (branch, sem PR)

**Data:** 02/11/2026 · **Base:** `main` `7c88fbd4` (com #624, #625 e #626) · **Autora:** Claude 2 · **Somente leitura:** nenhuma flag ativada; nenhum arquivo global do Claude 4 tocado (`assets/rm-pilot.js`, `assets/rm-materia-sistema.js/.css`, `assets/rm-tools-v2.js`, `index.html`, `netlify/functions/get-pilot-flags.js`, `supabase/migrations/**`); nenhum dado de aluno escrito.
**Estado:** branch de desenvolvimento (temas visuais e testes isolados prontos; falta só a ligação final, §7). **Não é PR.** A PR completa só sai depois que a base do Claude 4 estiver pronta (§6).

## 1 · Estrutura real (inventário em dia, `inventario-fresco.py` → 0 velhos)

| | Fisiopatología I (`fisiopatologia`) | Farmacología I (`farmacologia`) |
|---|---|---|
| Seções com id | 14 | 21 |
| Perguntas (corpo / banco) | 332 itens (211 únicos); banco `prova-fisio` 170 | 191 itens; banco `prova-farmaco` 64 |
| Cartões | 260 (130 únicos; agregadora `flashcards-fisio`) | 412 (212 em `flashcards-grales`) |
| Imagens / SVG / tabelas | 39 (34 webp, 5 png/jpg; 0 sem alt) · 15 SVG · 35 tabelas | 72 (52 webp, 20 png/jpg; 0 sem alt) · 0 SVG · 31 tabelas |
| Vídeo / externo | nenhum | 23 iframes do YouTube em 17 cartões · 37 `details` de quiz |
| Âncoras / ids | 2974 / 146 | 1684 / 151 |
| Última edição | 24/10 (`06849e05`) | 24/10 (`4f3ba674`) |
| `data-rm-agrega` | não exigido (a agregadora casa com /flashcards/); `agrega-no-html.py` OK | nenhuma agregadora exigida; OK |
| Abertura | começa em conteúdo (`introduccion-fisio` / `pk`) | idem |
| Porta (28/10) | ABERTA 7/7 — **refazer no dia** | ABERTA 7/7 — **refazer no dia** |

Pontos de reflow no iPad: Fisio I `asma-epoc` (7 imagens, 9 tabelas, 263 âncoras); Farmaco I `sna` (14 imagens), `adrenergicos` (8), `colinergicos` (7), vídeos incorporados e os 20 PNG/JPG.

## 2 · Dados de alunos (SELECT somente leitura, 02/11/2026)

| Matéria | Grifos (alunos) | Traços | Notas |
|---|---|---|---|
| `fisiopatologia` | 33 (1 aluno): `introduccion-fisio` 30 · `inflamacion` 2 · `hemorragia` 1 | 0 | 0 |
| `farmacologia` | 26 (1 aluno): `pd` 15 · `sna` 6 · `pk` 5 | 0 | 0 |

Sem traços nem notas: não há risco de índice de âncora (`seção>N`). O que cuidar: **não alterar o texto dos blocos acima** (grifos ancoram por trecho + contexto); a implantação do layout não edita o conteúdo das matérias.

## 3 · O que o visual de cada matéria precisa (descritor)

Hoje só existe o tema aprovado de `semiologia-ii` (`TEMAS` em `assets/rm-materia-sistema.js`, arquivo global). Medicina Familiar não tem descritor (o tema falha fechado). O ensaio gera um descritor **técnico** (`gerarTema`) que a própria ferramenta rotula «NÃO é identidade visual aprovada». Para o **visual completo** cada matéria precisa de: unidades/agrupamento com nome e cor, regra de numeração, classificação de cada seção (bloco, guia, repaso, outro), vinheta de capa e medalhões aprovados pelo Design.

### Fisiopatología I
- Marcadores reais: 11 seções «UNIDAD I · …» e **uma** «UNIDAD II · ANEMIAS»; `globulos-brancos` e `coagulacao` (hematologia) estão em «UNIDAD I». **Decisão editorial de José antes do descritor:** manter Unidad I (11) × Unidad II (1) ou reagrupar a hematologia (anemias, glóbulos brancos, coagulação) numa unidade; o agrupamento aprovado define as cores/medalhões.
- Ids sem sufixo `bNN`: a numeração sai da ordem (1–12); `prova-fisio` = repaso/banco; `flashcards-fisio` = repaso/cartões.
- Imagens/SVG próprias: 39 + 15 SVG, sem vinheta `vig/` aprovada (não existe `assets/img/fisio/vig/`).

### Farmacología I
- Marcadores: 12 «BLOQUE NN» e 3 «BASE» (`sna`, `adrenergicos`, `colinergicos`); os títulos têm numeração 01–17 que não coincide com a ordem dos ids. **Decisão de José:** como o tema trata as seções «BASE» (guia/base × bloco) e se `farmacos-clave` («resumen final») e `cuestionario1` (20 perguntas próprias, não é agregadora) entram como repaso/guia/outro.
- Vídeos e `details` de quiz: conferir no layout novo (iframe em coluna estreita, 390 px).
- Sem `assets/img/farmaco/vig/`; nenhum medalhão aprovado.

Sem aprovação de identidade, só se pode gerar o descritor técnico (rotulado como hipótese). Isso é o máximo que entra no PR final sem ordem de José.

## 4 · Arquivos por matéria que a implantação toca (e de quem são)

| Arquivo | Dono | Preciso editar? |
|---|---|---|
| `…/materias-privadas/fisiopatologia.html`, `farmacologia.html` | matéria (meu escopo) | **não** (estrutura estável; abertura e agrega OK) |
| `assets/rm-pilot.js` (`CANDIDATAS`, `VER`) e tag em `index.html` | **Claude 4 (global)** | sim, 1 linha + versão |
| `assets/rm-materia-sistema.js` (`TEMAS`/`registrarTema`) | **Claude 4 (global)** | sim, para registrar o descritor |
| linha da matéria em `rm_materia_rollout` | José (SQL) | sim, tudo `off` |
| `tools/qa/nova-era/*`, `tools/qa/pre-voo/*` (testes por matéria) | compartilhado | testes novos próprios das duas matérias |
| `docs/layout-ensaio/inventario.json` | compartilhado | só se o conteúdo mudar |

## 5 · Plano de testes (para a PR completa)

Porta (7 etapas) refeita no dia por matéria · âncoras e ida e volta com grifos reais **do hash** de cada matéria · layout em 390/768/1024/1440 · `gate-por-materia` e `medfam-implantacao` adaptados às duas matérias · `servidor.test.cjs` e `navegador.test.cjs` com as duas no `CANDIDATAS` (preview só admin, `all` só com acesso, `off` desliga, troca de conta) · caneta por matéria (inclui rolar tabela larga, imagens pesadas e iframe) · regressão das suítes da Nova Era · Guard · autoauditoria (CLAUDE.md §9) · **nada ativado** (linha `off`).

## 6 · Condição para começar a integração (bloqueio atual, medido em 02/11)

1. **Medicina Familiar ainda `off` em `rm_materia_rollout`** (layout/caneta/visual `off`, atualizada em 01/11 23:56). `docs/nova-era/ORDEM-DAS-PROXIMAS-MATERIAS.md`: «nenhuma é ativada antes de fechar Medicina Familiar».
2. A integração por matéria exige editar `rm-pilot.js` (`CANDIDATAS` + `VER`), `index.html` (tag) e `rm-materia-sistema.js` (descritor): arquivos globais do Claude 4. Sem a base dele fechada, qualquer edição aqui conflita ou será refeita.
3. Descritor/identidade visual: decisão de José (§3).
Quando 1 e 2 estiverem resolvidos, a PR completa sai desta branch.

## 7 · Avanço (02/11/2026): temas visuais das duas matérias e testes isolados

**Arquivos novos (nenhum arquivo existente foi alterado):**
- `assets/rm-temas/fisiopatologia.js` e `assets/rm-temas/farmacologia.js` — descritores registrados pela interface pública `RMSistema.registrarTema(slug, tema)`.
- `assets/rm-temas/fisiopatologia.css` e `assets/rm-temas/farmacologia.css` — identidade de cor (só variáveis, escopo `html.rm-sis[data-rm-tema="<slug>"]`, carregados depois de `rm-materia-sistema.css`) e rótulos.
- `tools/qa/nova-era/temas-fisio1-farmaco1.test.cjs` — teste isolado (monta layout, sistema, navegação e índice REAIS e carrega os temas como o `rm-pilot.js` vai carregar).

**Decisões de classificação (pela função real da seção, sem pedir ao José):**
| Matéria | Classificação |
|---|---|
| Fisiopatología I | 12 blocos numerados 01–12 na ordem do conteúdo (`bloque`); `prova-fisio` = repaso/banco (B); `flashcards-fisio` = repaso/cartões (F). **Unidades preservadas como estão no conteúdo:** 11 blocos «UNIDAD I» e `anemias` «UNIDAD II»; nomes «Unidad I» e «Unidad II» (os que o conteúdo dá; nenhum nome novo). |
| Farmacología I | 17 blocos com a **numeração dos títulos** (01–17, não a ordem dos ids), incluindo as 3 seções «BASE» (SNA, receptores adrenérgicos e colinérgicos: ensino de base com título numerado ⇒ bloco); `farmacos-clave` = repaso/tabla (T); `cuestionario1` = repaso/práctica (P); `prova-farmaco` = banco (B); `flashcards-grales` = cartões (F). **Sem unidades** (o conteúdo não as tem): nenhuma foi criada; o CSS da matéria esconde só os rótulos «UNIDAD ·» que o módulo geraria para um grupo único. |

**Arte decorativa:** não existem vinhetas nem medalhões aprovados para estas matérias (`assets/img/fisio/vig/`, `assets/img/farmaco/vig/`). Tratamento seguro aplicado: `vig: null` ⇒ o módulo usa o logotipo existente (`assets/repasso-med-logo.png`) como vinheta; `medallones: []`. Nenhuma imagem inexistente é referenciada (0 respostas ≥ 400, 0 imagens quebradas). **Necessidade registrada:** 12 vinhetas (Fisio I) e 17 (Farmaco I) de 480 px recortadas de infografías aprovadas + 1 a 3 medalhões de capa por matéria; quando existirem, basta preencher `vig`, `vigDir` e `medallones` nos descritores.

**Resultados do teste isolado (`temas-fisio1-farmaco1.test.cjs`, 107/107):** registro aceito e segundo registro recusado · cada seção com tipo, número e capítulo esperados (14 e 21 seções) · 0 «otro» · rótulos de unidade (Fisio I: 11× e 1×; Farmaco I: nenhum visível) · ids, contagens (332/260/39/35 e 191/412/72/31, 23 iframes, 37 `details`), TEXTO e índice de âncoras idênticos com o tema ligado e depois de desligar · UI derivada sem p/li/h2–h5/table/figure · 53 e 93 imagens, 0 quebradas · 0 overflow horizontal em 390/768/1024/1440 · blocos pesados abertos (`asma-epoc`, `sna`, `adrenergicos`, `colinergicos`, `anestesicos`, `opioides`, `farmacos-clave`, `cuestionario1`, bancos e cartões) em 390 e 1440 px sem elemento fora da tela · falha fechada sem os arquivos do tema («sin tema», layout intacto) · 0 erro JS, 0 console.error, 0 requisição que não seja GET/HEAD.

**Limitação conhecida do módulo (não corrigível sem editar `rm-materia-sistema.js`):** em Farmacología I os títulos do conteúdo já começam com o número («01 · Farmacocinética»); o módulo mostra o número também na etiqueta, então ele aparece duas vezes (etiqueta «01» + título «01 · …»; migalha «BLOQUE 10 · 10 · …»). É redundância visual, não erro; correção natural no módulo: omitir o prefixo numérico do título quando igual à etiqueta. Fica como pedido ao Claude 4.

## 8 · O que falta para a integração final (e quem faz)

Exatamente estas ligações, todas em arquivos globais do Claude 4 (não editados aqui):
1. `assets/rm-pilot.js` → `carregarSistema()`/`ligarSistema()`: antes de `RMSistema.attach(tab, slug)`, carregar `assets/rm-temas/<slug>.css` e `assets/rm-temas/<slug>.js` (falha fechada: se faltarem, o módulo já lança «sin tema» e o layout fica) e, em `CANDIDATAS`, incluir `'fisiopatologia'` e `'farmacologia'`; subir `VER` e a tag do `index.html`.
2. `netlify/functions/get-pilot-flags.js`/`supabase/migrations/**`: linhas `fisiopatologia` e `farmacologia` em `rm_materia_rollout` (tudo `off`) — SQL de José, não executado aqui.
3. Depois: porta refeita no dia, `servidor.test.cjs`/`navegador.test.cjs` com as duas matérias, caneta por matéria (tabela larga, imagens pesadas, iframes), autoauditoria e PR completa. Nada é ativado.
