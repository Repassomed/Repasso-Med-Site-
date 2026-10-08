# PASSO FINAL — José repete a caneta no aparelho real (#456 P0) · ≤ 3 minutos

Mesmo aparelho, mesma caneta, sua conta de sempre. **Nada a instalar, sem console.** Antes: puxe a página para atualizar (ou feche e abra a aba) e entre em **Semiología II**.

## 0. Confirmar que carregou a versão nova (10 s)
1. Toque na maleta **Herramientas** → botão do **diagnóstico** (o último ícone do painel, só aparece para você no piloto) → abre o painel escuro «Diagnóstico del lápiz».
2. A 1.ª linha de números deve começar com **`build=2026-10-08·456`** e dizer **`guarda=sim`**. Se não disser, a versão antiga ainda está em cache: feche a aba e abra de novo (não siga o teste).

## 1. Escrever (60 s) — com o painel de diagnóstico ABERTO e o **lápis** armado
1. Escreva **rápido** 3 palavras num parágrafo (letra corrida).
2. Escreva uma palavra dentro de uma **tabela** e outra sobre um **post-it**.
3. Dê **play no audiobook** e escreva mais uma palavra.
   - Sentiu a tinta «arrastar» atrás da ponta? Alguma letra saiu torta ou com um pedaço faltando? (diga: começo, meio ou fim do traço)

## 2. Trocar de bloco e de modo com a caixa ABERTA (60 s)
1. Com a **caixa de ferramentas aberta** (não feche), toque em **Siguiente** → depois em **Preguntas** (modo) → **Volver al índice** → volte a um bloco.
2. Repita 2 vezes. Escreva uma palavra no fim.
   - Houve **travada** (a tela parar) ao trocar? Os traços de antes continuaram no lugar, sem duplicar? A caixa continuou aberta sozinha?

## 3. Mandar o resultado (30 s)
1. No painel, toque em **«Copiar resumen»** e cole na issue #456 (ou tire um print do painel). São **só números** (milissegundos e contagens): sem texto da matéria, sem coordenadas, sem dados pessoais; **fechar o painel apaga tudo**.
2. Responda em uma linha:
   - **Escrita**: igual / melhor / pior que no layout antigo?
   - **Troca de bloco/modo com a caixa aberta**: some a travada / menor / igual?
   - **Traço desconfigurado**: não / sim (onde: começo, meio, fim; mão encostada na tela?)

## Como ler o painel (se quiser conferir sozinho)
- `pointerdown N ms` — quanto o aparelho demorou no instante em que a caneta encostou. **Antes** da correção, no emulador a 4× mais lento, passava de 100 ms; agora deve ficar na casa de poucos ms a algumas dezenas.
- `1.º quadro N ms` — do toque até o primeiro quadro desenhado.
- `fila máx` / `quadros máx` — a pior espera de um ponto / o pior «salto» da tela durante o traço (`>33` e `>50` contam quadros ruins).
- `pointercancel` / `captura perdida no meio do traço` — **se o aparelho cortou o traço** (palma, gesto do sistema, caneta fora do alcance). `fim=POINTERCANCEL` num traço diz exatamente qual foi cortado.
- `troca … até o 2.º quadro N ms` — o tempo da travada ao trocar de bloco/modo.

Se algo falhar, a mensagem curta acima (linha 1–2 + aparelho/navegador + o resumo copiado) já basta para eu agir.
