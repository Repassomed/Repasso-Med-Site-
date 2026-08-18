# PROMPT DE RETROFIT — padronizar matérias já publicadas

> Use este prompt num chat novo, **uma matéria por vez**.
> Ele serve para aplicar o padrão visual de **Anatomía Patológica II** (`anato2`)
> a matérias que **já estão no ar**, sem quebrar o site e **sem perder conteúdo**.
>
> Para criar matéria **nova do zero**, use o `PROMPT-MAESTRO-v3.md`.
> Anexe sempre: `PROMPT-MAESTRO-v3.md` + `design-system-repasso.css` +
> o HTML atual da matéria a modernizar.

---

## 0 · Frase de abertura

> Modernizar a matéria **[NOME]** (slug `SLUG`, tab `TAB`) para o padrão visual de
> Anatopatologia II. Segue o HTML atual em anexo, mais o `PROMPT-MAESTRO-v3.md` e o
> `design-system-repasso.css`.
> **Regra de ouro: não perder uma linha de conteúdo.** Prove com contagem antes/depois.
> Aplica o retrofit conforme o `PROMPT-RETROFIT.md` e entrega só o HTML da matéria.

---

## 1 · A regra que não se negocia

**Zero regressão de conteúdo.** Isto é um trabalho de *apresentação*, não de reescrita.

Antes de qualquer edição, extraia o inventário do arquivo original:

```python
import re, json
orig = open('MATERIA.html', encoding='utf-8').read()
inv = {
  'secciones'  : re.findall(r'<section[^>]*id="([^"]+)"', orig),
  'preguntas'  : len(re.findall(r'<div class="quiz-item">', orig)),
  'flashcards' : len(re.findall(r'<div class="flashcard">', orig)),
  'respuestas' : re.findall(r'<div class="answer">\s*<p><strong>([^<]{0,40})', orig),
  'imagenes'   : re.findall(r'src="([^"]+\.(?:webp|jpg|png))"', orig),
  'h3'         : re.findall(r'<h3[^>]*>(.*?)</h3>', orig, re.S),
  'texto_len'  : len(re.sub(r'<[^>]+>', ' ', orig)),
}
json.dump(inv, open('inventario.json','w'))
```

Ao final, o QA compara e **falha** se:
- sumiu qualquer `section id`
- o número de questões ou flashcards baixou
- qualquer resposta correta mudou de letra
- o texto encolheu **mais de 12%** (a margem cobre condensação legítima; acima disso é perda)
- sumiu alguma imagem

> ⚠️ **IDs de seção são sagrados.** O painel admin e a tabela `subject_sections`
> apontam para eles. Mudar um `id` desconecta a matéria do mapeamento por parcial
> e o aluno perde o acesso. **Nunca renomeie, nunca reordene, nunca remova.**

---

## 2 · O que muda (e o que não muda)

| Muda | Não muda |
|---|---|
| CSS: novo design system escopado | IDs de seção |
| Prosa longa vira tabela/card quando couber | Enunciados das questões oficiais |
| Termos técnicos ganham glossário clicável | Gabaritos e explicações |
| Aparecem post-its laterais | Texto das flashcards |
| Aparecem mapas mentais em SVG | Nomes de arquivo das imagens |
| Imagens viram `<img loading="lazy">` | Estrutura de blocos |

---

## 3 · Passo 1 — trocar o CSS

Apagar o `<style>` antigo da matéria e colar o design system parametrizado:

```bash
sed -e 's/{{TAB}}/TAB/g' -e 's/{{PFX}}/PFX/g' design-system-repasso.css
```

`PFX` é um prefixo curto e único (`h2` para histologia II, `f2` para farmaco II…).

Depois, mapear as classes antigas para as novas. Na prática as antigas costumam ter
outro prefixo (`.an-`, `.s2-`, `.f2-`) com a mesma função:

| Função | Classe nova |
|---|---|
| post-it de introdução | `PFX-postit` |
| pílulas de percurso | `PFX-flow` + `PFX-pill` |
| prosa | `PFX-detalle` |
| tabela com scroll | `PFX-scroll` |
| caixa "o que mais cai" | `PFX-exam` + `PFX-freq` + `PFX-bar` |
| figura | `PFX-fig` + `PFX-zoom` + `PFX-photo` |

⚠️ **Todo seletor prefixado por `#tab-TAB`.** Sem exceção. Um seletor solto vaza
para as outras 13 matérias e quebra o site inteiro. O QA verifica isso.

⚠️ Estilizar `.rm-block-head` / `.rm-block-num` / `.rm-block-kicker`, **não**
`.section-marker` (que é `display:none` de propósito no `styles.css` global).

---

## 4 · Passo 2 — aliviar os textos longos

Este é o coração do retrofit. **Condensar não é cortar**: é mudar de formato.

### 4.1 · Quando converter em tabela
Três ou mais parágrafos seguidos que **comparam entidades pelos mesmos critérios**.
Sinais: "en cambio", "a diferencia de", "mientras que", "por su parte".

Vira `PFX-scroll` + `<table>` com **critérios nas linhas** e **entidades nas colunas**.
Regra: se o parágrafo responde sempre à mesma pergunta para sujeitos diferentes,
é tabela.

### 4.2 · Quando converter em cards
Enumerações de 3–5 itens paralelos que **não** se comparam por critérios comuns
(tipos, causas, formas clínicas). Vira grade de cards:

```html
<div class="PFX-cards">
  <article class="PFX-card">
    <b class="t">Nombre</b>
    <p>Una o dos frases. Lo esencial, sin subordinadas encadenadas.</p>
  </article>
  …
</div>
```

### 4.3 · Quando manter prosa
- Explicações de **mecanismo** (o "por quê" fisiopatológico)
- O post-it **"Desde cero"**
- Qualquer trecho onde o raciocínio encadeado *é* o conteúdo

> Prosa não é o inimigo. O inimigo é **prosa que devia ser tabela**.

### 4.4 · Alvo por bloco
| Métrica | Antes | Depois |
|---|---|---|
| Parágrafos seguidos sem quebra visual | 5–8 | **máx. 3** |
| Caracteres em prosa corrida | — | −15 a −25% |
| Caracteres totais (com tabelas/cards) | — | **igual ou maior** |

O texto **não deve encolher**: deve se **redistribuir**. Se o total caiu muito,
você cortou conteúdo — desfaça.

---

## 5 · Passo 3 — glossário clicável

Meta: **6 a 12 termos por bloco** (o padrão anterior tinha 2–5; agora é mais denso).

Marcar para virar glossário:
- termos que o aluno de 1º–3º semestre pode não dominar
- epônimos (Virchow, Krukenberg, Klatskin)
- siglas na primeira aparição (MMR, CIMP, BilIN, TRAb)
- palavras que o texto usa como se fossem óbvias (metaplasia, displasia, disbiose)

```html
<span class="PFX-gl" onclick="…">término<b>?</b><i>Definición de una o dos frases,
en lenguaje llano.<span class="PFX-gl-close">tocá la palabra para cerrar</span></i></span>
```

Regras: definir **uma vez por bloco** (não repetir o mesmo termo), definição em
**linguagem simples** (não trocar um jargão por outro), e **nunca** dentro do
enunciado de uma questão oficial — só na prosa.

---

## 6 · Passo 4 — post-its laterais

**1 a 3 por bloco**, em pontos onde há pegadinha ou regra de memória:

```html
<aside class="PFX-margin">
  <b class="t">Anotación al margen</b>
  <p>Frase curta e direta.</p>
  <p>Complemento com <em>destaque</em>.</p>
</aside>
```

Onde colocar: logo depois do `<h3>` da seção a que se referem.
Bons candidatos: mnemotécnicas, "não confundir X com Y", exceções a uma regra,
números que caem em prova.

⚠️ Eles flutuam à direita no desktop. Tabelas, figuras, quiz e flashcards precisam
de `clear:both` — já vem no design system. Sem isso o post-it **esmaga a tabela ao lado**
e corta a última coluna.

Estilo: **voz de anotação à mão**, curta. Não é mais um parágrafo de prosa.

---

## 7 · Passo 5 — mapa mental por bloco

Um `svg_mapa_mental()` por bloco (gerador do §6.3 do PROMPT MAESTRO):

```
CONCEPTO          → o que é, numa frase
CARACTERÍSTICAS   → 4 itens curtos
DIFERENCIAS CLAVE → pares "A frente a B"
LO QUE RESUELVE   → a frase que fecha a questão
```

⚠️ Ao gerar SVG por código: **nunca `<tspan>` dentro de `text-anchor="middle"`**
(o texto salta para a borda) e **confira a conta de altura** — renderize em PNG e olhe.

---

## 8 · Passo 6 — performance das imagens

Este passo sozinho muda a percepção de velocidade do site.

### O problema
Imagem como `background-image` em CSS **não tem lazy loading**. Todas as imagens da
matéria baixam de uma vez ao abrir. Em Anatopatologia II eram **8 MB de uma só vez**.

### A correção
Trocar por `<img>` real:

```html
<div class="PFX-zoom">
  <img class="PFX-photo" src="/assets/img/TAB/nome-original.webp"
       alt="Descrição longa e útil da figura"
       loading="lazy" decoding="async" width="1536" height="1024">
</div>
```

Medido em Anatopatologia II: **de 36 imagens no primeiro carregamento para 1**
(8 MB → ~230 KB). As demais entram conforme o aluno rola.

Detalhes que importam:
- `loading="lazy"` — o ganho principal
- `decoding="async"` — não trava a renderização
- `width`/`height` — reservam o espaço e evitam o salto de layout
- `alt` descritivo — acessibilidade e SEO (o `aria-label` do `<div>` some)
- Some também o bloco `<style>` de registro de imagens: o HTML encolhe

### Regras de caminho e nome
- ⚠️ **Sempre raiz-relativo**: `/assets/img/TAB/…`. Caminho relativo (`assets/…`)
  quebra porque o fragmento é injetado via `DOMParser` + `importNode`.
- ⚠️ **Nunca renomear** os arquivos: usar exatamente o nome que está no Drive/servidor.
- Se as imagens ainda estiverem em base64, migrar para arquivos estáticos.

### Se ainda estiver lento
Só então mexer no peso: reprocessar para **1400 px, qualidade 82**, unsharp mask
(radius 1.0, percent 55). Corta ~35% sem perda visível. Exige re-upload — por isso
é o último recurso, depois do lazy loading.

---

## 9 · QA obrigatório (rodar, não olhar)

```
ANTI-REGRESSÃO (compara com inventario.json)
[ ] todos os section id do original presentes, na mesma ordem
[ ] nº de questões >= original
[ ] nº de flashcards >= original
[ ] letra de toda resposta correta idêntica ao original
[ ] todas as imagens do original presentes
[ ] texto total não encolheu mais de 12%

ESTRUTURA
[ ] todo seletor CSS prefixado por #tab-TAB
[ ] zero <script> no fragmento
[ ] tags balanceadas (<path/> não é <p/>)
[ ] banco geral = Σ questões dos blocos
[ ] deck geral = Σ flashcards

IMAGENS
[ ] toda imagem é <img> com loading="lazy" e decoding="async"
[ ] todo src começa com /assets/
[ ] todo arquivo existe em disco
[ ] todo alt tem 25+ caracteres

SVG
[ ] viewBox + role="img" + aria-label
[ ] zero <tspan> em text-anchor="middle"
[ ] toda ilustração com legenda
[ ] renderizado em PNG e inspecionado

NOVOS COMPONENTES
[ ] 6–12 termos de glossário por bloco, sem repetir
[ ] 1–3 post-its laterais por bloco
[ ] 1 mapa mental por bloco
[ ] máx. 3 parágrafos seguidos sem quebra visual
```

### Verificação de render
Montar servidor local replicando o carregador real (`DOMParser` + `importNode`,
`/assets` na raiz) e conferir no navegador:
- todas as imagens respondem **200**
- ao abrir sem rolar, baixam **poucas** imagens (prova do lazy loading)
- desktop **e** mobile (390 px)

---

## 10 · Ordem sugerida das matérias

Comece pela mais visitada e pela que tem mais conteúdo — o ganho é maior e serve
de referência para as seguintes.

1. **Anatomía I** (33 blocos — a maior; fazer em várias sessões)
2. **Histología I** e **Histología I Práctica**
3. **Biología**
4. **Embriología**
5. **Farmacología II** e **Semiología II** (já são as mais próximas do padrão)
6. **Anatomía Patológica** (a I)

**Uma matéria por chat.** Matérias grandes: 4–6 blocos por resposta, sempre com
o QA anti-regressão rodando entre as entregas.

---

## 11 · Entrega

- Entregar **só o HTML da matéria** (o `index.html`, o `get-materia.js` e o SQL
  não mudam num retrofit — a matéria já está cadastrada).
- Se alguma imagem precisar ser reprocessada, entregar também a pasta
  `assets/img/TAB/` e avisar que exige re-upload.
- Reportar sempre a **tabela antes/depois**:

```
                    antes    depois
secciones             12        12  ✓
preguntas            120       120  ✓
flashcards           160       160  ✓
glosario              18        74  ↑
post-its laterais      0        19  ↑
mapas mentais          0         8  ↑
párrafos seguidos    5-8       ≤3   ↑
1ª carga (imagens)    36         1  ↑
```
