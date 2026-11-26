# Nova Era · revalidação das 25 matérias preparadas na `main` atual · 26/11/2026

**Base:** `main` `6860acb9` (já com #728 e Ortopedia/Oftalmología/Neurología fora). **Executor:** Claude 1. **Somente leitura:** nada ativado, nenhum SQL (nem SELECT), nenhuma variável do Netlify, nenhum merge.
**Método:** `tools/qa/pre-voo/porta-da-materia.sh <slug>` rodada em **cada uma das 25 candidatas** de `CANDIDATAS` (`rm-pilot.js`) num checkout limpo da `main` (3 em paralelo). Cada porta tem 7 etapas: inventário em dia, marcadores no HTML, âncoras estáveis, ida-e-volta de grifos/traços/notas, layout em 4 larguras (390/768/1024/1440), uso/caneta nos modos e inventário de risco.

## Resultado
**25 de 25 portas ABERTAS** (todas as etapas passam, 0 falhas). Saídas completas guardadas em `docs/nova-era-temas/levantamento-portas-2026-11-26.json` (resumo) e reproduzíveis com o comando acima.

| Matéria | Etapas que passam | Falhas | Porta |
|---|---|---|---|
| semiologia-ii | 7/7 | 0 | ABERTA |
| medicina-familiar | 7/7 | 0 | ABERTA |
| fisiopatologia | 7/7 | 0 | ABERTA |
| farmacologia | 7/7 | 0 | ABERTA |
| biologia | 7/7 | 0 | ABERTA |
| embriologia | 7/7 | 0 | ABERTA |
| anatomia-patologica-practica | 7/7 | 0 | ABERTA |
| histologia-i | 7/7 | 0 | ABERTA |
| histologia-i-practica | 7/7 | 0 | ABERTA |
| histologia-ii | 7/7 | 0 | ABERTA |
| histologia-ii-practica | 7/7 | 0 | ABERTA |
| fisiopatologia-ii | 7/7 | 0 | ABERTA |
| toxicologia | 7/7 | 0 | ABERTA |
| anestesiologia | 7/7 | 0 | ABERTA |
| ortopedia | 7/7 | 0 | ABERTA |
| oftalmologia | 7/7 | 0 | ABERTA |
| anatomia-i | 7/7 | 0 | ABERTA |
| anatomia-patologica | 7/7 | 0 | ABERTA |
| farmacologia-ii | 7/7 | 0 | ABERTA |
| anatomia-patologica-ii | 7/7 | 0 | ABERTA |
| anatomia-patologica-ii-practica | 7/7 | 0 | ABERTA |
| dermatologia | 7/7 | 0 | ABERTA |
| guarani | 7/7 | 0 | ABERTA |
| semiologia | 7/7 | 0 | ABERTA |
| medicina-legal | 7/7 | 0 | ABERTA |

Total: 175 etapas passadas em 25 matérias (25 × 7 = 175 esperadas).

## Neurología, Imagenología e Bioestadística (fora das 25)
- **Neurología:** não está em `CANDIDATAS` na `main`. A preparação (tema, candidata, ensaio real e roteiro de prévia só para José) está na PR empilhada sobre a #682: ver `nova-era-neurologia-2026-11-26-v1.md`. No checkout `main` + #682, a 1.ª tentativa de tema fechou a porta na etapa 3 (`neuportada` sem card no índice); com a portada classificada como card «R» a porta abre **7/7**.
- **Imagenología e Bioestadística:** **fora do plano** (decisão de José, 26/11); não foram preparadas nem tocadas.

## Portas aprovadas, pendências e situação para a prévia privada
- **Aprovadas (porta aberta):** as 25 acima. «Aprovada» aqui = passou o pré-voo automático; **não** significa ligada, nem testada no aparelho.
- **Situação necessária para a prévia privada (só conta de José, matéria por matéria):** (1) código mesclado e deploy publicado na `main`; (2) linha em `rm_materia_rollout` com os três estágios em `preview` (SQL por matéria nos `ROTEIRO-*.md` / `previa-lote.sql`, **a rodar por José**); (3) conta de José = a única com `profiles.is_admin` (conferir L1); (4) José confere layout e caneta no iPad e usa o SQL de volta se algo falhar. **Nada disso foi feito nesta rodada.**
- **Pendências das portas:** nenhuma etapa falhou. Limites herdados: o ensaio usa Supabase simulado e caneta por CDP (não Safari/Apple Pencil); o último registro de ativação real é o SELECT de 17/11 (só `medicina-familiar` em `preview`; piloto `semiologia-ii` por UID) e **não foi reverificado**.
- **Matérias com conteúdo ainda em PR aberta** (a porta vale para o código atual da `main`; refazer depois do merge): Anestesiología (#710), Oftalmología (#726), Ortopedia (#729), Neurología (#682) e Anatomía Patológica II Práctica (#719).
