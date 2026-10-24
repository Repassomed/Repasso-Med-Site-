/* CONTEÚDO FORA DE section[id] na navegação por bloco (#487) — nada útil some, nada solto vaza para dentro de um bloco.
   Semiología II REAL + shell real (rm-pilot → layout/tema/navegação) com 4 nós de teste postos ANTES do attach (o `.s2-hero` próprio da Semiología II saiu em 4aed8200 — a abertura agora é posta pelo teste, como os outros):
     · div  [hero]     apresentação da matéria antes da 1.ª seção (era o `.s2-hero`);
     · div  [anexo]    banner curto logo antes de s2-b03 (como o banner de revisão do app-core.js antes do 1.º bloco do banco);
     · section sem id  com uma .quiz-item, entre s2-b05 e s2-b06 (como a seção sem id da AP Práctica);
     · div  [fecho]    texto depois da última seção.
   O que se prova:
     1  classificação: hero=abertura · banner=anexo de s2-b03 · seção sem id=conteudo · texto final=fecho;
     2  índice geral («Página completa» da navegação): abertura, conteúdo e fecho visíveis; o anexo não (ele acompanha o seu bloco);
     3  bloco s2-b03: só o anexo dele aparece; nada da abertura/conteúdo/fecho dentro do bloco. Em modo+bloco o filtro do modo (já na main)
        só mostra o recurso: o anexo é texto e fica fora, como antes;
     4  outro bloco (s2-b04): anexo escondido de novo;
     5  sem navegação (detach): tudo visível como na matéria original, sem nenhum atributo data-rm-solto/anexo.
   Uso:  RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/soltos.test.cjs                                                                    */
const L = require('./lib-player.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = (t) => console.log('\n▸ ' + t);

/* os nós de teste entram assim que a aba tiver as seções, antes de o piloto montar a navegação */
const FIXTURE = () => {
  const pôr = () => {
    const tab = document.getElementById('tab-semio2'); if (!tab || tab.querySelector('[data-fx]')) return !!tab && !!tab.querySelector('[data-fx]');
    const hero = document.createElement('div'); hero.setAttribute('data-fx', 'hero'); hero.className = 'fx-hero'; hero.textContent = 'Apresentación de la materia. '.repeat(10); tab.insertBefore(hero, tab.querySelector(':scope > section[id]'));
    const b03 = document.getElementById('s2-b03'), b06 = document.getElementById('s2-b06'), secs = tab.querySelectorAll(':scope > section[id]');
    if (!b03 || !b06 || secs.length < 10) return false;
    const an = document.createElement('div'); an.setAttribute('data-fx', 'anexo'); an.textContent = 'Repaso de este bloque'; tab.insertBefore(an, b03);
    const ct = document.createElement('section'); ct.setAttribute('data-fx', 'conteudo');
    ct.innerHTML = '<h3>Casos sueltos</h3><div class="quiz-item"><p>Pregunta de prueba</p></div>'; tab.insertBefore(ct, b06);
    const fe = document.createElement('div'); fe.setAttribute('data-fx', 'fecho'); fe.textContent = 'Texto final de la materia. '.repeat(12);
    const ult = secs[secs.length - 1]; ult.parentNode.insertBefore(fe, ult.nextSibling);
    return true;
  };
  const mo = new MutationObserver(() => { if (pôr()) mo.disconnect(); });
  document.addEventListener('DOMContentLoaded', () => { if (!pôr()) mo.observe(document.documentElement, { childList: true, subtree: true }); });
};
const VIS = () => {
  const v = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.height > 0; };
  const q = (s) => document.querySelector('#tab-semio2 > ' + s);
  return { hero: v(q('[data-fx="hero"]')), anexo: v(q('[data-fx="anexo"]')), conteudo: v(q('[data-fx="conteudo"]')), fecho: v(q('[data-fx="fecho"]')), nav: document.documentElement.getAttribute('data-rm-nav') };
};
const go = async (page, spec, ms = 1100) => { await page.evaluate(s => window.RMNav.go(s), spec); await page.waitForTimeout(ms); };

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port, midia = L.gerarMidia();
  const br = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    sec(`${w}px`);
    const { ctx, page, errs } = await L.abrir(br, base, midia, { w, h, nav: true, initScript: FIXTURE });
    const cl = await page.evaluate(() => [...document.querySelectorAll('#tab-semio2 > [data-rm-solto]')].map(e => (e.getAttribute('data-fx') || e.className.split(' ')[0]) + '=' + e.getAttribute('data-rm-solto') + (e.hasAttribute('data-rm-anexo-de') ? '>' + e.getAttribute('data-rm-anexo-de') : '')).join(' '));
    ok(/hero=abertura/.test(cl) && /anexo=anexo>s2-b03/.test(cl) && /conteudo=conteudo(?!>)/.test(cl) && /fecho=fecho/.test(cl), 'classificação: hero=abertura · banner=anexo de s2-b03 · seção sem id=conteudo · texto final=fecho', cl);

    let x = await page.evaluate(VIS);
    ok(x.nav === 'index' && x.hero && x.conteudo && x.fecho && x.anexo === false, 'índice geral: apresentação, conteúdo sem bloco e texto final visíveis; o anexo espera o seu bloco', x);

    await go(page, { view: 'block', block: 's2-b03' }); x = await page.evaluate(VIS);
    ok(x.nav === 'block' && x.anexo && !x.hero && !x.conteudo && !x.fecho, 'bloco s2-b03: o anexo aparece com ele; nada mais solto dentro do bloco', x);
    await go(page, { view: 'modeblk', mode: 'preguntas', block: 's2-b03' }); x = await page.evaluate(VIS);
    /* modo isolado: o filtro do RMModes (já na main) só mostra o recurso do modo; texto solto do bloco — anexo incluído — fica fora, como antes do #487 */
    ok(x.nav === 'modeblk' && x.anexo === false && !x.hero && !x.conteudo && !x.fecho && await page.evaluate(() => !!document.querySelector('[data-fx="anexo"][data-rm-anexo-cur]')), 'Preguntas do bloco s2-b03: o anexo continua marcado como do bloco atual, mas o modo isolado só mostra as perguntas (igual à main)', x);
    await go(page, { view: 'block', block: 's2-b04' }); x = await page.evaluate(VIS);
    ok(x.anexo === false && !x.hero && !x.conteudo && !x.fecho, 'bloco s2-b04: o anexo de s2-b03 some de novo', x);
    await go(page, { view: 'index' }); x = await page.evaluate(VIS);
    ok(x.hero && x.conteudo && x.fecho && x.anexo === false && await page.evaluate(() => !document.querySelector('[data-rm-anexo-cur]')), 'volta ao índice geral: igual ao início, sem marca de anexo atual', x);

    await page.evaluate(() => window.RMSistema.detach()); await page.waitForTimeout(500); x = await page.evaluate(VIS);
    const resto = await page.evaluate(() => document.querySelectorAll('[data-rm-solto],[data-rm-anexo-de],[data-rm-anexo-cur]').length);
    ok(!x.nav && x.hero && x.anexo && x.conteudo && x.fecho && resto === 0, 'detach: tudo visível como na matéria original e nenhum atributo data-rm-solto/anexo', { x, resto });
    ok(errs.length === 0, '0 erros JS', errs); await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`\n${n - ko} verificações OK · ${ko} falhas`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
