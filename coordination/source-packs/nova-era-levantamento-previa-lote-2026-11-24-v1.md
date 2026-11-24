# Nova Era · levantamento de todas as matérias + prévia privada em lote · 24/11/2026

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
