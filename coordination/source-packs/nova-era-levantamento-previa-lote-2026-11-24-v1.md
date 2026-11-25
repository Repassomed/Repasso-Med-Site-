# Nova Era · levantamento de todas as matérias + prévia privada em lote · 24/11/2026

> **ATUALIZAÇÃO (rodada 2, 24/11):** Medicina Familiar investigada e **porta REABERTA 7/7** (ver §5); agora são **25 de 25 candidatas com porta aberta**. Base `main` `c288d1a5` (já com #712).

**Executor:** Claude 2 · **Base:** `main` `3f6b3b2f` · **Branch:** `claude/nova-era-previa-lote`.
**Regras desta rodada (cumpridas):** nada ativado para alunos; **nenhum SQL executado** (nem SELECT) e nenhuma variável do Netlify tocada; **#710 não tocada**; branches da #687 (Claude 1, `610104ed`) e da #682 (`8446cdd6`) **intactas**; nenhum merge.

## 1 · Levantamento (arquivos)
- `docs/nova-era-temas/LEVANTAMENTO-NOVA-ERA.md` — tabela das 25 candidatas + 3 matérias fora de CANDIDATAS (neurologia, imagenologia, bioestadistica): tema, perguntas/cartões, porta, ativação (último registro), lote, testes dedicados e **o que falta por matéria**.
- `docs/nova-era-temas/levantamento-portas-2026-11-24.json` — resultado da porta por matéria (reprodutível: `tools/qa/nova-era/levantamento-nova-era.cjs`).
- **Porta (`porta-da-materia.sh`, 7 etapas) rodada nas 25 candidatas, na `main` `3f6b3b2f`: 24 ABERTAS (7/7, 0 falhas); 1 FECHADA: `medicina-familiar`** (etapa 3, layout em 4 larguras: 20 falhas = 5 conferências de «infografias» — capa, lateral e contagens — × 4 larguras). Medicina Familiar é a matéria especial já em preview desde 02/11 (gate próprio); **não classifiquei como defeito** sem investigar, mas a porta genérica **não a aprova**.
- **Ativação:** último registro (painel, SELECT de 17/11): só `medicina-familiar` em `preview`; piloto `semiologia-ii` por UID. **Não reverificado hoje** (sem SQL por ordem). José confere com `previa-lote-leitura.sql` (só leitura).

## 2 · Solução em lote (arquivos)
- `docs/nova-era-temas/previa-lote.sql` — **lista atualizada para as 23 matérias** de porta aberta (as 24 abertas menos o piloto `semiologia-ii`, que é por UID): anatomia-i, anatomia-patologica, anatomia-patologica-ii, anatomia-patologica-ii-practica, anatomia-patologica-practica, anestesiologia, biologia, dermatologia, embriologia, farmacologia, farmacologia-ii, fisiopatologia, fisiopatologia-ii, guarani, histologia-i, histologia-i-practica, histologia-ii, histologia-ii-practica, medicina-legal, oftalmologia, ortopedia, semiologia, toxicologia. Regras inalteradas: só promove `off→preview`, nunca reduz, marca o que promoveu.
- `previa-lote-volta.sql` — inalterada (volta segura, arquivo separado).
- `previa-lote-leitura.sql` (**novo**) — 3 SELECTs para José: nº de administradores (esperado 1), estado das linhas, o que já está em `all`.
- `PREVIA-VARIAS-MATERIAS.md` — roteiro de José (antes/ligar/conferir/voltar) e provas.
- **Teste novo `tools/qa/nova-era/previa-lote-acesso.test.cjs`** (18 verificações): o SQL real do lote em PGlite + a função real `get-pilot-flags.js`; para cada uma das 23 matérias: antes do lote todos false; depois só o administrador recebe layout + caneta + tema; aluno com acesso, sem acesso, 2.º testador, outro aluno, visitante e token inválido = false; fora da lista e piloto intactos; falha fechada; só GET; volta devolve false e preserva o que José promoveu a `all`.
- **Anestesiología** está na lista, mas a #710 (conteúdo) está aberta: refazer a porta depois do merge dela.

## 3 · Testes (resultados)
Ver o cartão da PR (preenchido com os resultados finais da bateria).

## 4 · Limites
«Preparada» = código + ensaio em navegador com Supabase simulado; não prova a tabela real, o deploy nem as variáveis do Netlify, nem o toque físico no iPad. A conta administradora de José é só a que `profiles.is_admin` marca (conferir com L1). Nenhuma matéria foi aberta num aparelho real.

## 5 · Medicina Familiar — investigação das 20 falhas (rodada 2)
- **Sintoma:** porta genérica FECHADA na etapa 3 (layout em 4 larguras): 20 falhas = 5 conferências × 390/768/1024/1440: `capa-infografias` (capa mostra 21; esperado 0), `capa-sem-recurso-ausente`, `lateral-infografias`, `sem-pagina-vazia-infografias` e `cards-igual-DOM` (os cards da capa mostram 4+2+2+3+3+… «infografías»; o oráculo contava 0).
- **Causa (provada):** a matéria tem **21 infográficos reais** `<div class="med-image mf-info">` (imagem + legenda + etiqueta). A regra do site `RMModes.ehInfografia` (`rm-modes.js`, issue #631, «modo Infografías em Medicina Familiar») **conta** esse tipo; já o **oráculo** do ensaio (`ensaio.cjs`) e o do inventário (`inventario.cjs`) só contavam `<figure>` e `material-slide`, então esperavam 0. **O layout do site estava certo; o teste estava desatualizado.** Nenhum conteúdo some.
- **Correção (só ferramentas de QA, nenhum arquivo do site):** `inventario.cjs` e `ensaio.cjs` passam a contar `.med-image` com `mf-info`/`rm-info`, imagem e legenda (mesma regra do `rm-modes.js`); inventário de Medicina Familiar regenerado (figuras 0 → 21). Só Medicina Familiar tem essas classes (conferido por `grep` em todas as matérias).
- **Prova:** porta de Medicina Familiar **7/7 ABERTA**; **controles** com o oráculo novo: biologia e dermatologia **7/7 ABERTA**; `inventario-fresco.py`: **27 matérias, inventário velho em 0**.
- **Limite:** o toque físico no iPad de Medicina Familiar (já em preview) continua sendo de José.

## 6 · Resultados da rodada 2 (cabeça `d6ec2540`)
`previa-lote` 18/18 · `previa-lote-acesso` 18/18 · `nova-era/servidor` 59/59 · `gate-por-materia` 48/48 · `caneta-por-materia` 34/34 · `nao-ativacao` 39/39 · `auditoria-implantacao-publica` 178/178 · portas MF/biologia/dermatologia 7/7. **Acesso privado e retorno seguro confirmados:** só o administrador recebe layout, caneta e tema nas 23 matérias do lote; aluno com/sem acesso, 2.º testador, visitante e token inválido recebem false; a volta devolve false e preserva o que José promoveu a `all`; nenhuma coluna `all` é criada ou alterada pelo lote.
