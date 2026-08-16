# PADRÃO REPASSO MED v4 — adendo obrigatório ao PROMPT MAESTRO v3

> Este arquivo **substitui** as seções §2.7, §4 e §7 (markup) do PROMPT MAESTRO v3.
> Todo o resto do v3 continua valendo. Ao abrir chat de matéria nova, mande os dois.
> Tudo aqui já está implementado em `app-core.js` e `styles.css` — não é proposta, é o estado atual.

---

## 1 · Nomenclatura — regra dura

O site **não pode sugerir** que vende prova vazada, gabarito roubado ou material
de um professor específico. Sem exceção, em qualquer matéria:

### 1.1 · Rótulos de questão

| Nunca escrever | Escrever sempre |
|---|---|
| `Pregunta de examen` · `⭐ CAYÓ EN EXAMEN` · `PRUEBA REAL` · `Pregunta oficial` | **`Basada en preguntas de examen`** |
| `Verdadero o falso · examen` | **`Verdadero o falso · basada en examen`** |
| `Variante` · `VARIANTE` · `🔁 EXTRA / EXAMEN` | **`Pregunta complementaria`** |

Classes (não mudam — o CSS global pinta por classe):

```html
<span class="quiz-tag oficial">Basada en preguntas de examen</span>
<span class="quiz-tag oficial vf">Verdadero o falso · basada en examen</span>
<span class="quiz-tag variante">Pregunta complementaria</span>
```

Rótulos de **formato** continuam livres e não são tocados: `mcq`, `caso`, `cita`,
`lacuna`, `define`, `parear`.

### 1.2 · Atribuição de conteúdo

| Nunca | Sempre |
|---|---|
| nome do professor (`Dra. X`, `la profesora`, `Lic. Y`) | **`la cátedra`** / `el material de la cátedra` |
| `pruebas reales` · `exámenes reales` | **`exámenes de la cátedra`** |
| `preguntas reales` · `preguntas oficiales` | **`preguntas basadas en exámenes`** |
| `recordadas de la evaluación` | *(apagar)* |
| `banco de preguntas OFICIALES` | **`banco de preguntas basadas en exámenes`** |

Fórmula padrão da portada de qualquer matéria:

> Construido sobre el **contenido de la cátedra** y la literatura de referencia
> (Robbins / Guyton / Goodman…), con preguntas **basadas en exámenes** y el
> criterio de la cátedra como fuente de verdad.

Bibliografia: livros com autor e edição, sim. Nome de professor, **não** —
usar `Contenido de la cátedra de [MATÉRIA] · [N].º semestre · Universidad Central del Paraguay.`

### 1.3 · ⚠️ O que NUNCA pode ser trocado

`variante` é palavra médica legítima: *variante folicular*, *variante
fibrolamelar*, *variantes anatómicas*. **Nunca** faça find-and-replace cego de
"variante" no corpo do texto. A troca vale só para o **rótulo** `.quiz-tag` e
para **títulos curtos** de seção.

### 1.4 · Rede de segurança automática

`app-core.js` normaliza rótulos e títulos **em tempo de injeção**, em todas as
matérias, mesmo nas que ainda não foram migradas:

- `unifyTags()` — reescreve o texto de toda `.quiz-tag` cuja classe ou texto
  indique questão de prova ou variante. Detecta V/F pela classe `vf`, pelo texto
  ou pela presença de `.tf-buttons` no item.
- `unifyHeadings()` — aplica a tabela §1.2 a `h2/h3/h4/h5`, `.quiz-section > p`,
  `[class$="-bank-sub"]` e `.section-marker`, **só** quando o rótulo tem menos
  de 160 caracteres e nenhum filho HTML.

Ambas são **idempotentes** (marcam `data-rm-tag` / `data-rm-head`).
Isso é rede de segurança, **não desculpa**: o HTML novo já nasce correto.

---

## 2 · Design system global — fim do CSS copiado

### O que mudou

Antes: cada matéria carregava ~26 KB do design system dentro do próprio
fragmento, com todo seletor prefixado por `#tab-xxx`. Resultado: 15 cópias
divergentes, arquivos maiores e identidade que ia se soltando.

Agora o "cuaderno tecnológico" mora **uma vez** em `styles.css`.

### Como usar numa matéria nova

```html
<div class="tab-content rm-cuaderno" id="tab-XXXX">
<style>
/* AQUI FICA SÓ O CSS DAS IMAGENS DESTA MATÉRIA */
#tab-XXXX .xx-i01{background-image:url(/assets/img/XXXX/nome-original.webp)}
…
</style>
…
```

A classe `rm-cuaderno` na raiz liga: papel milimetrado, lombada azul-marinho
perfurada, sombras, tipografia e todas as variáveis `--n-*`.

### Componentes (prefixo `rmc-`)

| Classe | Para quê | Por bloco |
|---|---|---|
| `rmc-hero` | portada da matéria | 1 na matéria |
| `rmc-flow` + `rmc-pill` | percurso em 5 pílulas | 1 |
| `rmc-cap` | legenda manuscrita (Caveat) | 1 |
| `rmc-postit` (+`blue`/`green`) | "Desde cero" e mnemotécnicas | 1–3 |
| `rmc-margin` | **post-it lateral na diagonal** | 1–3 |
| `rmc-detalle` | prosa com `<h3>`/`<h4>` | sempre |
| `rmc-gl` | **glossário marca-texto clicável** | 2–5 |
| `rmc-exam` + `rmc-freq` + `rmc-bar` | "Lo que más cae" com ranking | 1 |
| `rmc-scroll` | tabela de 3+ colunas | conforme |
| `rmc-fig` + `rmc-photo` + `rmc-zoom` | figura com ampliação | 1 por imagem |
| `rmc-trap` | trampa dentro da resposta | conforme |
| `rmc-ico` | ícone SVG inline (`gold`/`teal`/`coral`) | conforme |
| `rmc-biblio` / `rmc-note` | bibliografia e nota de imagens | 1 no fim |

Globais que continuam iguais: `illustration`, `illustration-caption`,
`key-box exam`, `quiz-section`, `quiz-item`, `fc-grid`, `flashcard`,
`section-marker`, `container`.

### Markup dos três componentes que definem a identidade

**Post-it lateral na diagonal** — flutua à direita no desktop, vira bloco no celular:

```html
<aside class="rmc-margin">
  <b class="t">Anotación al margen</b>
  <p>Texto curto, letra manuscrita.</p>
</aside>
```

**Glossário clicável** — marca-texto que abre o conceito num post-it lateral e
fecha ao clicar de novo (sem JS novo, o motor já trata):

```html
<span class="rmc-gl">metaplasia<b>?</b><i>
  <b class="rmc-gl-close">✕</b>
  Sustitución de un epitelio maduro por otro también maduro, pero mejor
  adaptado al nuevo estrés. <b>Es reversible.</b>
</i></span>
```

**Ícone inline** — sem fonte externa, sem requisição, herda a cor:

```html
<span class="rmc-ico gold" aria-hidden="true">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round">…path…</svg>
</span>
```

### ⚠️ Emoji está proibido como ícone de interface

`🩻` e `🫀` são Unicode 13/14: viram quadrado vazio em Android e Windows
antigos. Emoji só dentro de texto corrido ou em `<h2>` decorativo. Ícone de
card, de botão ou de rótulo → **SVG inline**.

---

## 3 · Catálogo — o que fazer ao publicar matéria nova

O card se monta sozinho, mas continuam sendo **três arquivos + um SQL**:

1. `index.html` → `const CATALOGO`:
   `{ slug:'medicina-familiar', tab:'medfam', file:'materias/medicina-familiar.html', title:'Medicina Familiar', sub:'Atención primaria · Prevención' }`
2. `index.html` → `RM_SUBJ_STYLE` (opcional): ícone e cor fixos.
   Sem entrada, o `rmSubjStyle()` adivinha pelo nome — só erra em matéria com
   nome fora dos padrões previstos.
3. `get-materia.js` → `FILES`: `'slug': 'arquivo.html'`.
4. SQL: linha em `subjects` com `semester` — **é o semestre do banco que agrupa
   o menu**. Sem ele, cai no fallback local do `index.html`.

O aluno continua vendo só o que comprou. O agrupamento por semestre e o painel
longitudinal são automáticos.

---

## 4 · QA — itens novos (somar aos do v3 §11)

```
[ ] zero "Pregunta de examen" / "CAYÓ EN EXAMEN" / "Variante" como rótulo
[ ] zero nome de professor no HTML (grep: Dra?\. | Lic\. | profesora)
[ ] zero "pruebas reales" / "preguntas oficiales" / "recordadas de la evaluación"
[ ] "variante folicular" e afins INTACTOS na prosa
[ ] raiz do fragmento com class="tab-content rm-cuaderno"
[ ] fragmento só com o CSS das imagens (sem design system copiado)
[ ] zero emoji de Unicode 13+ (🩻 🫀 🫁 🩼 …) em ícone de interface
[ ] contagem de quiz-item e flashcard idêntica antes/depois de qualquer edição
```

Comando de conferência rápida:

```bash
grep -cE 'Pregunta de examen|CAYÓ EN EXAMEN|profesora|pruebas reales' materia.html   # tem que dar 0
grep -c 'class="quiz-item"' materia.html                                              # tem que bater com o SQL
```

---

## 5 · Situação das matérias

**Identidade visual: aplicada a todas de uma vez.** Não há migração pendente.
`app-core.js` põe `rm-cuaderno` na raiz de cada aba e traduz o vocabulário
antigo (`s2-pill`, `an-flow`, `ap2-postit`…) para o canônico `rmc-*`. O CSS
global vence por especificidade (`#materias-container .rm-cuaderno .rmc-pill`
= 1 id + 2 classes, contra `#tab-semio2 .s2-pill` = 1 id + 1 classe).

**Nomenclatura:** corrigida no arquivo em Anatopato II, Anatopato I e
Semiología II; nas demais, corrigida em tempo de injeção pelo `app-core.js`.
Ao editar qualquer matéria daqui em diante, corrija também na fonte.

### Limpeza opcional, quando abrir cada matéria

Nada disso é urgente — é só higiene, e reduz o peso do arquivo:

1. trocar a raiz para `<div class="tab-content rm-cuaderno" id="tab-XXXX">`
2. apagar o design system copiado dentro do fragmento, deixando só o CSS das imagens
3. renomear as classes próprias para `rmc-*` e apagar o alias no JS quando não sobrar nenhuma
4. corrigir os rótulos na fonte

Regra de sempre: **2 matérias por entrega, sem regredir nada**, com contagem de
`quiz-item` e `flashcard` conferida antes e depois.
