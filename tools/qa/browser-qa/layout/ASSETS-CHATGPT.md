# ASSETS QUE PRECISO DO CHATGPT — Layout V2 · Semiología II (piloto)

**Para quem lê:** José leva esta especificação ao ChatGPT; o ChatGPT produz as imagens; José devolve os arquivos; Claude (Layout) integra.
**Regra:** a interface (texto, botões, menus, cards, ícones de UI) é **código** e não entra em nenhuma imagem. Estes arquivos são só **arte autoral**
para o slot `hero` da capa. Nenhuma ilustração foi criada em código nem improvisada: o slot está vazio e oculto até chegarem os arquivos.

Hoje o código tem **1 slot de arte** (`RMLayout.ASSETS.hero`) ⇒ **1 asset necessário** (entregue em 2 resoluções). Não há outros slots; se quiserem
mais arte (p.ex. capas por bloco, vazios dos modos isolados), eu abro os slots **antes** e atualizo esta lista.

---

## ASSET 1 — Banner de apresentação da Semiología II (`hero`)

| Campo | Especificação |
|---|---|
| **Finalidade** | Dar identidade própria à matéria ao abrir a Semiología II no Layout V2 (piloto). Reforço visual da capa; não substitui nem repete texto. |
| **Onde aparece** | Capa da matéria, no topo da Página completa, ao lado do título «Semiología II» (≥ 1000 px: coluna da direita, ≈ **372 × 209 px**) ou acima do título (< 1000 px: largura total, até **816 px**, **altura máxima 340 px**). Desaparece em modos isolados. |
| **Assunto médico/visual** | Semiología médica do **tórax e abdome**: «del hallazgo al síndrome». Composição única, limpa e autoral que una **exame clínico** (estetoscópio, mão do examinador em palpação/ausculta) com **três sistemas** da matéria: respiratório (pulmões), cardiovascular (coração) e digestivo (estômago/intestino), em estilo **ilustração médica editorial** (linhas limpas, formas simples, poucos tons). |
| **Estilo** | Coerente com o logo original do Repasso Med (contornos navy, volumes planos, acentos quentes) e com as infografias já usadas na matéria (WebP 1536×1024, papel claro), porém **mais calmo e minimalista**: poucos elementos, muito ar. Premium, médico, discreto. Sem aparência de «banco de imagens» nem de dashboard. |
| **Paleta** | **Navy** `#13314f` (linhas/volumes principais) e `#081726` (sombras profundas) · **branco/off-white** `#ffffff` e `#edf2f8` (fundo e luzes) · **laranja Repasso Med** `#e8772e` (único acento: 1 ou 2 detalhes, p.ex. o estetoscópio ou um foco no achado). Tons anatômicos (rosa/vermelho dos órgãos) **suaves e dessaturados**, só se necessários. Sem verde/roxo/dourado saturado, sem degradês de arco-íris. |
| **Orientação** | **Paisagem (horizontal)**. |
| **Proporção** | **16:9** (master). O slot é `object-fit: cover`: em tablet/desktop em coluna única o quadro é **recortado em altura até ≈ 2,4:1**. |
| **Resolução** | Entregar **2 arquivos**: **1x = 1200 × 675 px** e **2x = 2400 × 1350 px** (mesmo enquadramento exato, só a escala muda). WebP qualidade ≈ 80–85: **1x ≤ 100 kB**, **2x ≤ 260 kB**. Se possível, também o master **PNG** sem perda (arquivo de origem; não vai para o site). |
| **Fundo** | **Opaco** (sem transparência): fundo claro `#edf2f8`/off-white uniforme ou levemente texturizado, que se funda com o cartão. O quadro já tem cantos arredondados (12 px) e sombra suave feitos em código. |
| **Elementos que DEVEM aparecer** | (1) estetoscópio; (2) uma silhueta/seção de tórax com **pulmões e coração** reconhecíveis; (3) indicação discreta do **abdome/estômago**; (4) uma mão (examinador) ou o diafragma do estetoscópio apoiado, sugerindo ausculta/palpação; (5) **um** acento laranja. |
| **Elementos que NÃO devem aparecer** | **Qualquer texto, letra, número, sigla ou rótulo** (o texto é código); o **logo** Repasso Med (já está na interface); rostos reconhecíveis ou pacientes identificáveis; sangue/cirurgia/imagens chocantes; marcas, símbolos de terceiros e imagens com direitos de terceiros; fotografia realista; efeitos pesados (brilho, neon, 3D plástico, sombras duras); molduras/bordas desenhadas (a moldura é código); ícones de UI, botões ou «cards» desenhados. Nada que sugira diagnóstico específico ou conteúdo científico novo/errado. |
| **Espaço negativo / zona segura** | Não há texto sobre a imagem. Mantenha **todo o conteúdo essencial dentro da faixa vertical central de ≈ 70 %** (≥ 15 % de ar em cima e embaixo), para sobreviver ao recorte 16:9 → 2,4:1. Margem lateral de **≥ 6 %** (cantos arredondados). Composição equilibrada com leve peso à **direita**, pois em duas colunas o texto fica à esquerda. |
| **Alt text (es)** | «Ilustración editorial de un estetoscopio apoyado sobre un tórax con pulmones y corazón, y el abdomen señalado, que representa la semiología respiratoria, cardiovascular y digestiva.» |
| **Nomes de arquivo** | `semio2-hero-1x.webp` (1200×675) · `semio2-hero-2x.webp` (2400×1350) · (origem, fora do site) `semio2-hero-master.png` |
| **Pasta de destino** | `assets/img/semio2/` (mesma convenção das demais imagens da matéria). |

### Como eu integro (nada para o José fazer além de enviar os arquivos)
```js
RMLayout.ASSETS.hero = {
  src: 'assets/img/semio2/semio2-hero-1x.webp',
  srcset: 'assets/img/semio2/semio2-hero-1x.webp 1x, assets/img/semio2/semio2-hero-2x.webp 2x',
  sizes: '(min-width: 1000px) 372px, 100vw',
  w: 1600, h: 900,           // reserva o espaço 16:9 (0 deslocamento de layout)
  alt: 'Ilustración editorial de un estetoscopio …', pos: '50% 50%'
};
```
Sem deformar (`object-fit: cover`), com `srcset` 1x/2x para tablet/retina, carregamento prioritário (está acima da dobra) e estado de carga neutro.
**Checagem de aceite (eu faço):** 0 overflow; 0 deslocamento ao carregar; nítido em 2x; recorte 2,4:1 sem cortar o assunto; contraste do texto vizinho intacto.

---

## O que NÃO preciso (para não gerar trabalho à toa)
- Nenhuma imagem de menu, botão, card, ícone, lateral ou faixa (tudo isso é código).
- Nenhum logo novo (uso o original `assets/repasso-med-logo.png`).
- Nenhuma imagem com texto («Semiología II», «Guía de estudio», etc.).
