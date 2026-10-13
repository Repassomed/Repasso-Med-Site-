/* Gera docs/layout-ensaio/CONTEUDO-SOLTO.md a partir de duas medições de soltos.cjs: a main (antes) e o código da #487 (depois).
   Uso: node tools/qa/ensaio-layout/soltos-md.cjs <main.json> <487.json>   (grava também docs/layout-ensaio/conteudo-solto.json) */
'use strict';
const fs = require('fs'), path = require('path'); const L = require('./lib.cjs');
const [fa, fb] = process.argv.slice(2); if (!fa || !fb) { console.error('uso: soltos-md.cjs <main.json> <487.json>'); process.exit(2); }
const A = JSON.parse(fs.readFileSync(fa)), B = JSON.parse(fs.readFileSync(fb));
const S = x => x === true ? 'sim' : x === false ? 'não' : '–';
const UI = /^(DIV\.rm-tools|BUTTON\.rm-sug-fab|NAV\.rm-menu)/;   // controles do site, não conteúdo (o layout já os esconde na main)
const rotulo = { abertura: 'abertura', fecho: 'fecho', conteudo: 'conteúdo', anexo: 'anexo' };
const linhas = [];
for (const slug of Object.keys(B.materias)) {
  const a = A.materias[slug] || [];
  for (const e of B.materias[slug]) {
    if (UI.test(e.k)) continue;
    const m = a.find(x => x.k === e.k) || {};
    linhas.push({ slug, grupo: L.grupoDe(slug), k: e.k, classe: e.solto, de: e.de, quiz: e.quiz, txt: e.txt,
      main: { idx: m.vis, bloco: m.visOutroBloco }, novo: { idx: e.vis, outro: e.visOutroBloco, seu: e.visNoSeuBloco, semNav: e.visSemNav } });
  }
}
/* resumo por tipo de elemento */
const tipos = {};
for (const l of linhas) {
  const t = l.k.replace(/#.*/, '') + '|' + l.classe; (tipos[t] = tipos[t] || []).push(l);
}
const sig = l => [l.main.idx, l.main.bloco, l.novo.idx, l.novo.outro, l.novo.seu, l.novo.semNav].map(S).join('/');
let md = `# Conteúdo fora de \`section[id]\` na navegação — inventário (#487)

Gerado por \`tools/qa/ensaio-layout/soltos.cjs\` (1440 px, navegação montada) + \`soltos-md.cjs\`. **Antes** = main (\`${A.ref}\`, ${A.gerado_em.slice(0, 10)}) · **depois** = código da #487 (\`${String(B.ref).slice(0, 8)}\`).
Os controles do site (\`.rm-tools\`, \`.rm-sug-fab\`, \`.rm-menu\`) ficam fora: o layout já os esconde na main e não são conteúdo.

**A 1.ª versão da #487** escondia com a navegação montada **tudo** o que está fora de \`section[id]\` — no índice geral e em todos os blocos. Este inventário mediu o que isso tiraria do aluno:
o hero de abertura das matérias que o têm, o banner «Repaso General · Simulacro» (anexo do 1.º bloco do banco, criado pelo \`app-core.js\`) e, na Anatomía Patológica Práctica,
uma \`<section class="container">\` **sem id** com **20 questões**, que ficaria inalcançável. A regra foi trocada por uma classificação.

## Regra nova (código da #487)
| classe | o que é | índice geral («Página completa» da navegação) | bloco | sem navegação |
|---|---|---|---|---|
| abertura | antes do 1.º bloco (hero, cabeçalho) | visível (como na main) | escondida | como sempre |
| conteúdo | tem questão/flashcard/figura/tabela/mídia, ou fica entre blocos sem um bloco logo depois | **visível** | escondido | como sempre |
| anexo | texto entre blocos com um bloco logo depois (\`data-rm-anexo-de\`) | escondido | **só no bloco dele**; em modo+bloco o filtro do modo (já na main) mostra só o recurso | como sempre |
| fecho | depois do último bloco | visível | escondido | como sempre |

## Resumo por elemento
Colunas de visibilidade: **main** índice / outro bloco · **#487** índice / outro bloco / bloco do anexo / sem navegação.

| elemento | classe | matérias | main | #487 | útil? | decisão |
|---|---|---|---|---|---|---|
`;
for (const [t, ls] of Object.entries(tipos).sort((x, y) => y[1].length - x[1].length)) {
  const [k, classe] = t.split('|'); const sigs = [...new Set(ls.map(sig))];
  const util = ls.some(l => l.quiz) ? `sim (${ls.reduce((s, l) => s + l.quiz, 0)} questões)` : (k.startsWith('NAV.nav') || k.startsWith('HEADER.rm-subject-head')) ? 'não (menu/cabeçalho que o layout substitui)' : /hero/.test(k) ? 'sim (apresentação da matéria)' : /revisao-banner/.test(k) ? 'sim (resumo do banco)' : '?';
  const dec = classe === 'conteudo' ? 'fica no índice geral; não vaza para os blocos' : classe === 'anexo' ? 'acompanha o seu bloco; não vaza para os outros' : classe === 'abertura' ? (/hero/.test(k) ? 'fica no índice geral (como hoje); não vaza para os blocos' : 'sem mudança (o layout já o esconde)') : 'fica no índice geral';
  const mat = ls.map(l => l.slug + (l.grupo === 'piloto' ? ' (piloto)' : l.grupo === 'fora' ? ' (fora)' : '')).join(', ');
  sigs.forEach(sg => {
    const p = sg.split('/');
    md += `| \`${k}\` | ${rotulo[classe] || classe} | ${sigs.length > 1 ? ls.filter(l => sig(l) === sg).length + ': ' + ls.filter(l => sig(l) === sg).map(l => l.slug).join(', ') : ls.length + ': ' + mat} | ${p[0]} / ${p[1]} | ${p[2]} / ${p[3]} / ${p[4]} / ${p[5]} | ${util} | ${dec} |\n`;
  });
}
md += `
## O que a regra nova muda para o aluno (navegação montada)
- **Índice geral:** nada útil some. O hero continua onde está hoje; a seção sem id da AP Práctica (20 questões) continua visível, como hoje.
- **Blocos:** deixam de mostrar o que não é deles. Na main, o hero e o banner apareciam **em todos os blocos** (resíduo medido pelo ensaio); agora o banner aparece só com o bloco do banco, e o hero e a seção sem id não aparecem em bloco nenhum.
- **Piloto (Semiología II):** sem mudança — o \`.s2-hero\` segue no índice geral e escondido nos blocos, como hoje.
- **Sem navegação (tema desligado / conta sem o tema):** sem mudança; nenhum atributo fica depois do detach.

## Recomendação editorial (não feita aqui)
A \`<section class="container">\` sem id da **Anatomía Patológica Práctica** (20 questões) só é alcançável pelo índice geral: não tem card, não entra em Anterior/Próximo nem no modo Preguntas.
Dar um \`id\` a ela (e um título) a transforma num bloco normal. É edição de matéria, fora do escopo das PRs de layout.

## Por matéria
| matéria | grupo | elemento | classe | questões | texto (car.) | main índice / bloco | #487 índice / outro / seu / sem nav |
|---|---|---|---|---|---|---|---|
`;
for (const l of linhas) md += `| ${l.slug} | ${l.grupo} | \`${l.k}\` | ${(rotulo[l.classe] || '–') + (l.de ? ' → ' + l.de : '')} | ${l.quiz} | ${l.txt} | ${S(l.main.idx)} / ${S(l.main.bloco)} | ${S(l.novo.idx)} / ${S(l.novo.outro)} / ${S(l.novo.seu)} / ${S(l.novo.semNav)} |\n`;
const DOC = path.join(L.REPO, 'docs/layout-ensaio');
fs.writeFileSync(path.join(DOC, 'CONTEUDO-SOLTO.md'), md);
fs.writeFileSync(path.join(DOC, 'conteudo-solto.json'), JSON.stringify({ antes: { ref: A.ref, gerado_em: A.gerado_em }, depois: { ref: B.ref, gerado_em: B.gerado_em }, linhas }, null, 1) + '\n');
console.log('CONTEUDO-SOLTO.md · ' + linhas.length + ' linhas');
