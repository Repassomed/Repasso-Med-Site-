/* #631 · REGRA ÚNICA DE INFOGRAFÍA (RMModes.ehInfografia / infografias) — sem Supabase, sem layout: o módulo REAL carregado sobre (1) casos sintéticos e (2) o HTML REAL das 30 matérias.
   (1) conta: <figure> com legenda e imagem · .med-image com imagem+legenda marcada (mf-info / rm-info / etiqueta «Infografía…») · NÃO conta: diapositiva, imagem de prova, radiografia com legenda em <p>,
       figura sem legenda, foto solta, figura dentro de slide, contêiner sem imagem, duplicata aninhada.
   (2) Medicina Familiar: 21 infografías em 8 blocos (4·2·2·3·3·3·1·3). Farmacología II: 64 infografías em <div class="material-slide"> (lista explícita de abas em rm-modes.js). TODAS as outras matérias: bloco a bloco, o resultado é IDÊNTICO ao da regra antiga (nenhuma ganha, nenhuma perde).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/infografias-regra.test.cjs */
'use strict';
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SITE = path.resolve(__dirname, '../../../Repasso-Med-Site--main/Atual - Copia'); const MAT = path.join(SITE, 'netlify/functions/materias-privadas'); const MODES = fs.readFileSync(path.join(SITE, 'assets/rm-modes.js'), 'utf8');
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) { if (process.env.VERBOSO) console.log('    ✓', m); } else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };
const FIX = {
  'figure com legenda e imagem': ['<figure><img src=a.webp><figcaption>x</figcaption></figure>', 1],
  'figure com legenda e foto .s2-photo': ['<figure><div class="s2-photo" role="img"></div><figcaption>x</figcaption></figure>', 1],
  '.med-image.mf-info com imagem e legenda': ['<div class="med-image mf-info"><img src=a.webp><div class="med-image-caption"><span class="med-image-tag">Infografía</span> t</div></div>', 1],
  '.med-image.rm-info (marca explícita)': ['<div class="med-image rm-info"><img src=a.webp><div class="med-image-caption">t</div></div>', 1],
  '.med-image com etiqueta «Infografía…» sem classe': ['<div class="med-image"><img src=a.webp><div class="med-image-caption"><span class="med-image-tag">INFOGRAFÍA del bloque</span> t</div></div>', 1],
  'diapositiva da professora (etiqueta)': ['<div class="med-image"><img src=a.webp><div class="med-image-caption"><span class="med-image-tag">DIAPOSITIVA DE LA PROF.ª</span> t</div></div>', 0],
  'imagem da prova (etiqueta)': ['<div class="med-image"><img src=a.webp><div class="med-image-caption"><span class="med-image-tag">IMAGEM DA PROVA</span> t</div></div>', 0],
  '.med-image sem etiqueta nem marca': ['<div class="med-image"><img src=a.webp><div class="med-image-caption">t</div></div>', 0],
  'radiografia com legenda em <p>': ['<div class="s2-photo" role="img"></div><p class="med-image-caption">📷 t</p>', 0],
  'figura sem legenda': ['<figure><img src=a.webp></figure>', 0],
  'foto solta (.s2-photo fora de figure)': ['<div class="s2-photo" role="img"></div>', 0],
  'img.rmc-photo solta': ['<img class="rmc-photo" src=a.webp>', 0],
  'figure dentro de .material-slide': ['<div class="material-slide"><figure><img src=a.webp><figcaption>x</figcaption></figure></div>', 0],
  '.med-image.mf-info dentro de .material-slide': ['<div class="material-slide"><div class="med-image mf-info"><img src=a.webp><div class="med-image-caption">t</div></div></div>', 0],
  '.med-image.mf-info sem imagem': ['<div class="med-image mf-info"><div class="med-image-caption">t</div></div>', 0],
  '.med-image.mf-info sem legenda': ['<div class="med-image mf-info"><img src=a.webp></div>', 0],
  'figure dentro de .med-image (sem duplicar)': ['<div class="med-image mf-info"><img src=a.webp><div class="med-image-caption">t</div><figure><img src=b.webp><figcaption>y</figcaption></figure></div>', 1],
  '.med-image aninhada em .med-image (conta a de fora)': ['<div class="med-image mf-info"><img src=a.webp><div class="med-image-caption">t</div><div class="med-image mf-info"><img src=b.webp><div class="med-image-caption">u</div></div></div>', 1],
};
const ANTIGA = (sec) => [...sec.querySelectorAll('figure')].filter(f => f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image')).length;
(async () => {
  const br = await chromium.launch(); const page = await br.newPage();
  await page.setContent('<!doctype html><body></body>'); await page.addScriptTag({ content: MODES });
  console.log('\n▸ casos sintéticos');
  for (const [nome, [html, esperado]] of Object.entries(FIX)) {
    const got = await page.evaluate(h => { document.body.innerHTML = '<section id="s">' + h + '</section>'; const s = document.getElementById('s'); return { n: RMModes.infografias(s).length, d: RMModes.MODOS[0].detect(document.body) }; }, html);
    ok(got.n === esperado && got.d === !!esperado, `${nome}: ${esperado ? 'é' : 'NÃO é'} infografía (conta ${got.n}); detector do modo ${got.d ? 'liga' : 'não liga'}`, got);
  }
  console.log('\n▸ infografías em <div class="material-slide"> (só nas abas da lista: Farmacología II)');
  const SL = '<div class="material-slide"><div class="material-slide-header">Título</div><img src=a.webp><div class="material-slide-caption">c</div></div>';
  const CASOS_SL = [
    ['aba tab-farmaco2: slide com cabeçalho + imagem + legenda é infografía', 'tab-farmaco2', SL, 1],
    ['outra aba (tab-semio2): o mesmo slide NÃO é infografía (regra antiga preservada)', 'tab-semio2', SL, 0],
    ['aba tab-farmaco2: «DIAPOSITIVA…» no cabeçalho NÃO é infografía', 'tab-farmaco2', SL.replace('Título', 'DIAPOSITIVA 3'), 0],
    ['aba tab-farmaco2: slide sem legenda NÃO é infografía', 'tab-farmaco2', SL.replace('<div class="material-slide-caption">c</div>', ''), 0],
    ['aba tab-farmaco2: slide sem imagem NÃO é infografía', 'tab-farmaco2', SL.replace('<img src=a.webp>', ''), 0],
    ['aba tab-farmaco2: slide aninhado em slide conta só o de fora', 'tab-farmaco2', SL.replace('<div class="material-slide-caption">c</div></div>', '<div class="material-slide-caption">c</div>' + SL + '</div>'), 1],
    ['aba tab-farmaco2: figure dentro do slide continua NÃO contando (sem duplicar)', 'tab-farmaco2', '<div class="material-slide"><figure><img src=a.webp><figcaption>x</figcaption></figure></div>', 0],
  ];
  for (const [nome, aba, html, esperado] of CASOS_SL) {
    const got = await page.evaluate(([a, h]) => { document.body.innerHTML = '<div class="tab-content" id="' + a + '"><section id="s">' + h + '</section></div>'; const s = document.getElementById('s'); return { n: RMModes.infografias(s).length, d: RMModes.MODOS[0].detect(document.body) }; }, [aba, html]);
    ok(got.n === esperado && got.d === !!esperado, `${nome} (conta ${got.n}; modo ${got.d ? 'liga' : 'não liga'})`, got);
  }
  console.log('\n▸ matérias reais (30 arquivos)');
  const arqs = fs.readdirSync(MAT).filter(f => f.endsWith('.html')).sort(); let iguais = 0;
  for (const f of arqs) {
    await page.setContent(fs.readFileSync(path.join(MAT, f), 'utf8'), { waitUntil: 'domcontentloaded' }); await page.addScriptTag({ content: MODES });
    const r = await page.evaluate((antiga) => { const A = new Function('return ' + antiga)(); const out = []; document.querySelectorAll('section[id]').forEach(s => out.push({ id: s.id, nova: RMModes.infografias(s).length, antiga: A(s) })); return { out, detect: RMModes.MODOS[0].detect(document.body), total: RMModes.infografias(document.body).length }; }, ANTIGA.toString());
    if (f === 'medicina-familiar.html') {
      const por = {}; r.out.filter(x => x.nova).forEach(x => por[x.id] = x.nova);
      const esperado = { aps: 4, principios: 2, familiograma: 2, apgar: 3, crisis: 3, crecimiento: 3, desarrollo: 1, educacion: 3 };
      ok(JSON.stringify(por) === JSON.stringify(esperado) && r.total === 21 && r.detect, 'Medicina Familiar: 21 infografías em 8 blocos (4·2·2·3·3·3·1·3) e o modo Infografías passa a existir', { por, total: r.total, detect: r.detect });
    } else if (f === 'farmacologia-ii.html') {
      const por = {}; r.out.filter(x => x.nova).forEach(x => por[x.id] = x.nova);
      const esperado = { f2b01: 4, f2b02: 4, f2b03: 5, f2b04: 4, f2b05: 10, f2b07: 4, f2b06: 4, f2b08: 5, f2b09: 4, f2b10: 5, f2b11: 5, f2b12: 3, f2b13: 2, f2b14: 5 };
      const antigas = r.out.filter(x => x.antiga).length;
      ok(JSON.stringify(por) === JSON.stringify(esperado) && r.total === 64 && r.detect && antigas === 0, 'Farmacología II: 64 infografías (<div class="material-slide">) em 14 blocos e o modo Infografías passa a existir (a regra antiga contava 0)', { por, total: r.total, detect: r.detect, antigas });
    } else {
      const dif = r.out.filter(x => x.nova !== x.antiga); ok(dif.length === 0, `${f}: bloco a bloco idêntico à regra antiga (${r.total} infografías)`, dif.slice(0, 4)); if (!dif.length) iguais++;
    }
  }
  console.log(`  ${iguais} matérias sem nenhuma diferença`);
  await br.close();
  console.log(`\ninfografias-regra: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
