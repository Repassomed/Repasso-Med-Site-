# PASSO FINAL — reteste no iPad do build `2026-10-10·456d` (#456) · ≤ 3 minutos

Mesmo iPad, mesma caneta, sua conta. **Só vale depois que esta PR estiver publicada** (merge/publicação é decisão sua).

## 0 · Confirmar o build (15 s)
1. Atualize a página e entre em **Semiología II**.
2. Toque na maleta **Herramientas**: deve aparecer o aviso **`caneta #456 · build 2026-10-10·456d`**. Se não aparecer, feche a aba, abra de novo e confira outra vez. Se continuar sem aviso, **pare e avise**.
3. Último ícone («Diagnóstico del lápiz») → painel aberto. Confira a linha **`ambiente:`**:
   - `touch-action do conteúdo=…`
   - `«pinch-zoom» aceito pelo motor=…`
   - `zoom visual=…`
   - `ouvintes de toque=…`

   **Anote esta linha.** Ela responde a dúvida do zoom.

## 1 · Goma em repouso, sem escrever (25 s) — o que travava no vídeo
1. Arme a **goma**. **Role** a página com o dedo e faça **pinça** (zoom in/out) em cima do texto.
   - Esperado: rola e dá zoom normalmente.
2. Toque com o **dedo** em cima de um traço antigo.
   - Esperado: **não apaga**.
3. Passe a **ponta** da caneta no traço.
   - Esperado: apaga.

## 2 · Goma com a mão apoiada (20 s)
1. Com a goma, encoste a ponta num traço e arraste até outro traço.
2. **No meio do arrasto, apoie e solte a palma.**
   - Esperado: o mesmo gesto apaga os dois.
3. Toque **Deshacer** uma vez.
   - Esperado: os dois voltam juntos.

## 3 · Lápis: palma antes, durante e depois (40 s)
1. Arme o **lápis**.
2. Apoie a palma **antes** de encostar a caneta e escreva uma palavra.
3. Escreva outra palavra com a palma **apoiada e se mexendo durante** o traço.
   - Esperado nos dois: a página **não** rola e a tinta fica sob a ponta.
4. Tire a mão e **role** com o dedo.
   - Esperado: rola na hora.

## 4 · Escrever → rolar → zoom → escrever (30 s)
1. Escreva, role um pouco e faça **pinça para ampliar**.
2. Escreva de novo, ampliado.
   - Esperado: a tinta sai exatamente sob a ponta, e o traço anterior continua no mesmo lugar do texto.
3. Volte ao zoom normal.

## 5 · Trocas, interrupção e persistência (40 s)
1. Troque lápis → goma → marcador → lápis.
2. Troque de bloco e de modo (**Siguiente**, **Preguntas**, volte).
3. Escreva uma palavra.
4. Saia para a tela inicial do iPad por 3 s e volte. Escreva de novo.
5. **Recarregue a página.**
   - Esperado: os traços de hoje e os **antigos** continuam no lugar, sem duplicar.
6. **Áudio (opcional).** Se houver card de audiobook, dê play e escreva uma palavra.
   - Sem card: anote «áudio: não executado». Isso **não** é falha da caneta.

## 6 · Mandar o resultado (10 s)
1. No painel, toque em **«Copiar resumen»** e cole na #456.
2. Uma linha por item: §1, §2, §3, §4, §5 → ok / falhou (e onde).

## Como ler as linhas novas do painel
- **`pointercancel: caneta X (no meio do gesto Y) · toque Z (navegação W … · palma V)`**
  - «toque · navegação» é **normal**: o navegador cancela o dedo quando assume a rolagem.
  - Ruim é **caneta** ou **no meio do gesto** > 0.
- **`contato/traço órfão recuperado: N`**
  - N > 0 = o iPad perdeu um `pointerup`, e o build 456d se recuperou sem travar.
  - É exatamente o defeito que prendia a escrita e a rolagem juntas.
- **`rolagem: N quadros · maior intervalo X ms · >50 ms: K`**
  - Mede a rolagem com o dedo, com e sem ferramenta.
  - Valores altos (X > 50 ms, K > 0) = a rolagem engasgou.
- **`tarefas longas: indisponível`**
  - O Safari não informa esse número. Não é zero.
