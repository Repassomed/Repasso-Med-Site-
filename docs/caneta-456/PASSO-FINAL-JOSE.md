# PASSO FINAL — José repete a caneta no aparelho real (#456 P0) · ≤ 3 minutos

Mesmo aparelho, mesma caneta, sua conta de sempre. **Nada a instalar, sem console.**
**Este roteiro só vale depois que a versão nova estiver publicada** (ver `PREVIEW-E-PUBLICACAO.md`): testar a `main` sem o #470 não prova nada sobre ele. A identificação do build é o primeiro passo — se não bater, **pare**.

## 0. Confirmar que é a versão nova (20 s)
1. Puxe a página para atualizar (ou feche a aba e abra de novo) e entre em **Semiología II**.
2. Toque na maleta **Herramientas** para abrir a caixa: aparece por ~2 s um aviso na parte de baixo: **`caneta #456 · build 2026-10-09·456c`** (o mesmo tipo de aviso do «Trazo deshecho ✓»; some sozinho, nada fica fixo sobre a leitura). Feche e abra a caixa de novo para vê-lo outra vez. Só você (e o 2.º testador liberado pelo servidor) o vê. Sem aviso = versão antiga em cache **ou** conta fora do piloto físico → feche a aba, abra de novo; se continuar, **pare e avise** (não siga o teste).
3. Com a caixa aberta, toque no último ícone («Diagnóstico del lápiz») → painel escuro. A 1.ª linha começa com **`build=2026-10-09·456c`** e **`guarda=sim`**; a 2.ª diz `acesso à V2: …` e `piloto físico: sim …`. Esta é a confirmação que fica na tela enquanto o painel estiver aberto.

## 1. Escrever (50 s) — painel aberto, **lápis** armado, caixa aberta
1. Escreva **rápido** 3 palavras num parágrafo (letra corrida).
2. **Apoie a mão/palma na tela** enquanto escreve (como escreve de verdade): a página **não** pode rolar nem pular.
3. Escreva uma palavra numa **tabela** e outra num **post-it**.
4. **Dê play no audiobook** (cartão «Audiobook · …» no bloco; só existe se o áudio estiver ativo para a sua conta) e escreva mais uma palavra com o áudio tocando — o áudio **não** deve pausar nem o traço atrasar.
   - **Se o card «Audiobook» não aparecer, anote «áudio: não executado» e siga:** não é falha da caneta (a cadeia do áudio depende do Netlify/vínculo — ver `docs/layout-ensaio/AUDIOBOOKS-ESTADO-OPERACIONAL.md` §0).
   - Atraso entre a ponta e a tinta? Alguma letra torta ou com pedaço faltando (começo, meio, fim)?

## 2. Rolar, apagar, desfazer (40 s)
1. **Rolar com o dedo** (lápis ainda armado): a página deve rolar normalmente quando a mão **não** está apoiada com a caneta em contato.
2. **Goma**: apague uma palavra (goma de borrar) → volte ao lápis.
3. **Deshacer** (seta no painel): desfaz a última ação, uma por toque. *(O motor não tem «refazer»: só existe Deshacer. Não é regressão — nunca teve.)*

## 3. Trocar de modo/bloco com a caixa ABERTA e conferir persistência (50 s)
1. Com a caixa **aberta**, toque em **Siguiente** → **Preguntas** (modo) → **Volver al índice** → volte ao bloco. Repita 1 vez. Houve **travada**? Os traços continuaram no lugar, sem duplicar?
2. **Recarregue a página** (puxar/F5), entre de novo em Semiología II e abra o mesmo bloco: **os traços novos continuam alinhados ao texto** (mesma palavra, mesma linha)?
3. **Traços antigos**: abra um bloco onde você já tinha escrito **antes** de hoje — continuam lá, no mesmo lugar, nada apagado ou deslocado?

## 4. A/B se algo estiver ruim (opcional, 20 s)
No painel, o botão **«Sin guarda: no»** → toque: vira **«Sin guarda: sí»** e a caneta passa a usar a regra **antiga** de toque (a da `main`), na mesma tela, sem recarregar. Escreva 3 palavras nos dois modos e diga qual é melhor. Volte a **«no»** ao terminar.

## 5. Mandar o resultado (20 s)
1. No painel, **«Copiar resumen»** e cole na issue #456 (ou print do painel). São **só números** (ms e contagens): sem texto da matéria, sem coordenadas, sem UID/e-mail; **fechar o painel apaga tudo**.
2. Responda em uma linha cada:
   - **Escrita** (atraso/fluidez): igual / melhor / pior que antes?
   - **Mão apoiada**: a página rolou/pulou? sim/não
   - **Troca de bloco/modo com a caixa aberta**: some a travada / menor / igual?
   - **Persistência** (recarregar) e **traços antigos**: ok / algo mudou (o quê)?
   - **Audiobook tocando**: afetou a escrita? sim/não
   - **Traço desconfigurado**: não / sim (onde, mão encostada?)

## Como ler o painel (se quiser conferir sozinho)
- `pointerdown N ms` — quanto o aparelho demorou quando a caneta encostou. Antes da correção, no emulador a 4× mais lento, passava de 100 ms; agora deve ficar entre poucos ms e algumas dezenas.
- `1.º quadro N ms` — do toque até o primeiro quadro desenhado.
- `fila máx` / `quadros máx` — a pior espera de um ponto / o pior «salto» da tela (`>33` e `>50` contam quadros ruins).
- `pointercancel` / `captura perdida no meio do traço` — **se o aparelho cortou o traço** (palma, gesto do sistema). `fim=POINTERCANCEL` mostra qual.
- `troca … até o 2.º quadro N ms` — o tempo da travada ao trocar de bloco/modo.
- `acesso à V2` / `flags do servidor` — por qual porta a sua conta entrou (código, tabela ou todos) e o que o servidor liberou (layout / visual / pen). Sem UID.

Se algo falhar, uma linha + aparelho/navegador + o resumo copiado bastam para eu agir. **A #456 só fecha com o seu «ok» desta página.**
