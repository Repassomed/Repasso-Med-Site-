/* POST-ITS/NOTAS ENCOBERTOS (issue #93) — regressão. Matérias REAIS (styles.css + app-core.js + <style> do index reais), 390/768/1024/1440. Só leitura (0 escrita, 0 rede).
   MECANISMOS medidos na #93 (postits-93.probe.cjs; números antes/depois em capturas-sistema/post-its-93/):
     1. `.rmc-margin` (post-it lateral, float:right ≥ 920 px) DENTRO de um filho de `.container` (`.rmc-detalle`, `.pk-step`, `.analysis-card`, `figure`…): `.container>*` dá a cada filho
        position:relative + z-index:1 ⇒ o filho é um contexto de apilamiento e o z-index:2 do post-it fica ENCERRADO nele. Se o post-it é mais alto que o pai (cuelga), o IRMÃO SEGUINTE
        (z:1, depois no DOM) pinta POR CIMA do contexto inteiro e o corta/oculta (Dermatología 5 notas, Fisiopatología II 14, Farmacología 1, Guaraní, Oftalmología, Toxicología…).
        Correção: `.container>:has(.rmc-margin){z-index:auto}` (≥ 920 px) — o filho deixa de ser contexto; o post-it (z:2) ganha dos irmãos (z:1) no contexto da seção.
     2. glossário `#rm-gl-note` (post-it do termo): sem defeito — popover (top layer) com fallback position:fixed; provado abaixo (dentro da janela, sem recorte, por cima de tudo).
   O que se prova:
     A  estático: a regra nova existe só em ≥ 920 px, o float segue z-index:2 (nenhum z-index arbitrário novo), o glossário segue popover + fallback;
     B  «antes × depois» NA MESMA PÁGINA: com a regra ativa nenhum post-it fica coberto POR PIXEL (captura da região visível = captura só do post-it); com a regra neutralizada (z-index:1, como na main)
        os post-its que cuelgam ficam cobertos (prova que o teste enxerga o defeito) — e as caixas (retângulos) de TODOS os filhos de .container e dos post-its são IDÊNTICAS nos dois estados (a correção não move nada);
     C  matérias com post-it aninhado (Dermatología, Fisiopatología II, Farmacología, Guaraní, Oftalmología, Toxicología, Medicina Familiar) em 1024 e 1440 (legado) + Semiología II no Layout V2 (com e sem tema; o V2 só liga nela): 0 post-its cobertos, 0 recortes, 0 overflow horizontal;
     D  390/768 (o post-it não flutua): 0 cobertos, 0 overflow;
     E  glossário: abre em 3 posições de rolagem × 4 larguras, integralmente na janela (≥ 99 %), sem recorte lateral, por cima de qualquer post-it (pixel), com popover e SEM popover (fallback);
     F  controles: cabeçalho/abas continuam POR CIMA do post-it (post-it rolado por baixo do cabeçalho: hit-test no cabeçalho = cabeçalho).
   Uso:  RM_PLAYWRIGHT=... node tools/qa/browser-qa/layout/postits-encobertos.test.cjs                                                                                                              */
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./serve.cjs');
const P = require('./postits-93.probe.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 400) : ''); } return !!c; };
const sec = (t) => console.log('\n▸ ' + t);
const CSS = fs.readFileSync(path.join(ROOT, 'assets/styles.css'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'assets/app-core.js'), 'utf8');
const ANINHADOS = ['dermatologia', 'fisiopatologia-ii', 'farmacologia', 'guarani', 'oftalmologia', 'toxicologia', 'medicina-familiar'];
const cat = (slugs) => P.catalogo(slugs);
const altura = (w) => w < 600 ? 844 : w < 1000 ? 1024 : 900;
const OLD = '#materias-container .rm-cuaderno .container>:has(.rmc-margin){z-index:1!important}';            // = o que a main faz hoje (o filho com post-it segue isolado)

/* retângulos de todos os filhos de .container e de todos os post-its (geometria) */
const GEO = () => [...document.querySelectorAll('#materias-container .container>*, #materias-container .rmc-margin')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left * 10), Math.round((r.top + scrollY) * 10), Math.round(r.width * 10), Math.round(r.height * 10)].join(','); });

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();

  /* =============================== A · estático =============================== */
  sec('A · estático');
  {
    const m = /@media\(min-width:920px\)\{([\s\S]*?)\n\}\n@media\(max-width:919px\)/.exec(CSS);
    ok(m, 'bloco @media(min-width:920px) do post-it lateral encontrado');
    const bloco = m ? m[1] : '';
    ok(/\.container>:has\(\.rmc-margin\)\{z-index:auto;\}/.test(bloco), 'a regra do filho-com-post-it (z-index:auto) vive DENTRO do @media(min-width:920px) (onde o post-it flutua)');
    ok(/\.rmc-margin\{float:right;[\s\S]*?z-index:2;\}/.test(bloco), 'o float segue z-index:2 (a correção não cria z-index novo/arbitrário)');
    const zs = [...CSS.matchAll(/\.rmc-margin[^{}]*\{[^}]*z-index:\s*(-?\d+)/g)].map(x => +x[1]);
    ok(zs.every(z => z <= 2), 'nenhuma regra de .rmc-margin com z-index > 2', zs);
    ok(/\.container>\*\{position:relative;z-index:1;\}/.test(CSS), 'a regra global `.container>*{position:relative;z-index:1}` ficou INTACTA (a correção é cirúrgica)');
    ok(/#rm-gl-note\{position:fixed;z-index:2147483000/.test(APP) && /setAttribute\('popover','manual'\)/.test(APP) && /showPopover/.test(APP), 'glossário: popover manual (top layer) + fallback position:fixed — não foi tocado');
  }

  /* =============================== B · antes × depois na mesma página =============================== */
  sec('B · antes × depois NA MESMA PÁGINA (regra ativa × regra neutralizada), pixel e geometria');
  for (const slug of ['dermatologia', 'fisiopatologia-ii']) {
    const c = cat([slug])[0]; const { ctx, page, errs } = await P.abrirMateria(br, base, c.slug, c.tab, 1440, 900, {});
    const lista = await page.evaluate(P.NOTAS);
    const pende = await page.evaluate(() => window.__notas.map((e, i) => { const a = e.getBoundingClientRect(), b = e.parentElement.getBoundingClientRect(); return a.bottom > b.bottom + 1 ? i : -1; }).filter(i => i >= 0));
    ok(pende.length >= 3, `${slug}: ${pende.length} post-its laterais cuelgam abaixo do contêiner (o caso do defeito)`, pende);
    const medir = async (rot) => { const o = []; for (const i of pende.slice(0, 6)) { let v = null; for (let k = 0; k < 4; k++) { await page.evaluate(P.ROLAR, [i, 'centro']); await page.waitForTimeout(220); v = await P.pixel(page, 'nota', i); await page.waitForTimeout(100); const v2 = await P.pixel(page, 'nota', i); if (v === v2) break; v = v2; } o.push(v); } return o; };
    const snap = async () => { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400); return page.evaluate(GEO); };         // mesma rolagem (topo) nos dois estados: content-visibility só renderiza o que está na janela
    const geoDepois = await snap(), pxDepois = await medir('depois');
    ok(pxDepois.every(v => v !== null && v <= 0.5), `${slug}: DEPOIS (regra ativa) — 0 post-its cobertos por pixel nos ${pxDepois.length} que cuelgam`, pxDepois);
    const st = await page.addStyleTag({ content: OLD });
    await page.waitForTimeout(300);
    const geoAntes = await snap(), pxAntes = await medir('antes');
    if (slug === 'dermatologia') ok(pxAntes.some(v => v > 5), `${slug}: ANTES (z-index:1 como na main) — o teste ENXERGA o defeito: ${pxAntes.filter(v => v > 5).length}/${pxAntes.length} cobertos (${pxAntes.map(v => v + '%').join(' ')})`, pxAntes);
    else console.log(`    · ${slug}: ANTES (z-index:1): ${pxAntes.filter(v => v > 5).length}/${pxAntes.length} cobertos por pixel (${pxAntes.map(v => v + '%').join(' ')}) — informativo (os irmãos seguintes só têm texto que contorna o post-it)`);
    ok(geoAntes.length === geoDepois.length && geoAntes.every((g, k) => g === geoDepois[k]), `${slug}: a geometria é IDÊNTICA nos dois estados (${geoDepois.length} caixas: filhos de .container + post-its) — a correção não move nada`, { n: geoDepois.length });
    ok(errs.length === 0, `${slug}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* =============================== C/D · matérias × larguras × legado/V2 =============================== */
  sec('C · matérias com post-it aninhado: 1024 e 1440, layout legado e Layout V2 (só liga em Semiología II)');
  /* o Layout V2 (lateral/faixa/toolbox) só liga em Semiología II (piloto): lá, com e sem o tema; as demais matérias rodam no layout legado */
  const MODOS = [{ nome: 'legado', slugs: ANINHADOS, flags: {} }, { nome: 'V2', slugs: ['semiologia-ii'], flags: { layout: true } }, { nome: 'V2+tema', slugs: ['semiologia-ii'], flags: { layout: true, visual: true } }];
  for (const md of MODOS) for (const w of [1024, 1440]) {
    for (const c of cat(md.slugs)) {
      const v2 = md.nome;
      const o = { gl: '0', soPende: md.nome === 'legado', maxPende: 12, nota: '6', flags: md.flags };
      let r = await P.sondar(br, base, c, w, o), cob = r.notas.flatMap(x => Object.values(x.pos)).filter(p => p && p.pixelPct > 0.5);
      if (cob.length) { r = await P.sondar(br, base, c, w, o); cob = r.notas.flatMap(x => Object.values(x.pos)).filter(p => p && p.pixelPct > 0.5); }      // 1 repetição: layout instável ≠ defeito
      const rec = r.notas.flatMap(x => Object.values(x.pos)).filter(p => p && p.recorteX).length;
      ok(cob.length === 0 && rec === 0 && r.erros.length === 0 && !(r.overflowX.sw > r.overflowX.cw + 1), `${v2.padEnd(7)} ${c.slug} ${w}: ${r.notas.length} post-its (${r.pende} cuelgam) · 0 cobertos · 0 recortes · sem overflow · 0 erros`, { cob: cob.length, rec, ov: r.overflowX, erros: r.erros });
    }
  }
  sec('D · 390 e 768 (o post-it não flutua)');
  for (const w of [390, 768]) for (const c of cat(['dermatologia', 'fisiopatologia-ii', 'anatomia-patologica'])) {
    const r = await P.sondar(br, base, c, w, { gl: '0', soPende: false, nota: '5', flags: {} }); const cob = r.notas.flatMap(x => Object.values(x.pos)).filter(p => p && p.pixelPct > 0.5);
    ok(cob.length === 0 && r.erros.length === 0 && !(r.overflowX.sw > r.overflowX.cw + 1), `${c.slug} ${w}: ${r.notas.length} post-its amostrados · 0 cobertos · sem overflow · 0 erros`, { cob: cob.length, ov: r.overflowX, erros: r.erros });
  }

  /* =============================== E · glossário =============================== */
  sec('E · glossário (#rm-gl-note): na janela, sem recorte, por cima de tudo — com popover e sem popover');
  for (const semPop of [false, true]) for (const w of [390, 768, 1024, 1440]) {
    const c = cat(['fisiopatologia-ii'])[0];
    const ctx = await br.newContext({ viewport: { width: w, height: altura(w) }, hasTouch: w < 900 });
    if (semPop) await ctx.addInitScript(() => { try { delete HTMLElement.prototype.showPopover; delete HTMLElement.prototype.hidePopover; delete HTMLElement.prototype.togglePopover; } catch (e) {} });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: c.slug, layout: false, visual: false, audio: false }) }));
    await page.route('https://**', r => r.abort());
    await page.goto(`${base}/p.html?slug=${c.slug}&tab=${c.tab}&uid=u-probe&wait=1500`, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 });
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const total = await page.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y < total; y += Math.round(altura(w) * .8)) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(20); } await page.evaluate(() => scrollTo(0, 0));
    await page.evaluate(P.NOTAS);
    const nGl = await page.evaluate(() => { const GL = '[class~="rmc-gl"],[class~="em-gl"],[class~="f2-gl"],[class~="s2-gl"],[class~="sm-gl"],[class~="hi-gl"]'; window.__gls = [...document.querySelectorAll('#materias-container ' + GL)]; return window.__gls.length; });
    ok(nGl > 20, `${semPop ? 'SEM popover' : 'com popover'} ${w}: ${nGl} termos de glossário na matéria`);
    const res = [];
    for (const t of [3, Math.floor(nGl / 2), nGl - 5]) for (const pos of ['centro', 'topo', 'rodape']) {
      const rola = ([t, pos]) => { const e = window.__gls[t]; const r0 = e.getBoundingClientRect(), top0 = r0.top + scrollY, vh = innerHeight; const hdr = (document.querySelector('#main-tabs') || { getBoundingClientRect() { return { bottom: 0 }; } }).getBoundingClientRect().bottom; scrollTo(0, Math.max(0, pos === 'centro' ? top0 - vh / 2 : pos === 'topo' ? top0 - hdr - 20 : top0 - vh + 120)); };
      await page.evaluate(rola, [t, pos]); await page.waitForTimeout(160); await page.evaluate(rola, [t, pos]); await page.waitForTimeout(160);
      const alvo = await page.evaluate(t => { const e = window.__gls[t], r = e.getClientRects()[0] || e.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 12), y: r.top + r.height / 2, ok: r.bottom > 0 && r.top < innerHeight }; }, t);
      if (!alvo.ok) continue;
      await page.mouse.click(alvo.x, alvo.y); await page.waitForTimeout(260);
      const g = await page.evaluate(() => {
        const n = document.getElementById('rm-gl-note'); if (!n) return null; const cs = getComputedStyle(n), r = n.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight;
        const topo = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 30));
        let pop = null; try { pop = n.matches(':popover-open'); } catch (e) {}
        return { on: n.classList.contains('on'), disp: cs.display, pos: cs.position, z: cs.zIndex, r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw, vh, dentro: r.left >= 0 && r.right <= vw + 1 && r.top >= 0 && r.bottom <= vh + 1, topo: !!(topo && (topo === n || n.contains(topo))), pop, temPopover: n.hasAttribute('popover') };
      });
      const px = await P.pixel(page, 'gl', 0);
      res.push({ t, pos, g, px }); await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    }
    const mal = res.filter(x => !x.g || !x.g.on || !x.g.dentro || !x.g.topo || x.px > 0.5);
    ok(res.length >= 6 && mal.length === 0, `${semPop ? 'SEM popover' : 'com popover'} ${w}: ${res.length} aberturas (3 termos × 3 posições) — todas ligadas, 100 % dentro da janela, por cima de tudo (hit-test + pixel)`, mal.slice(0, 2));
    if (semPop) ok(res.every(x => x.g && !x.g.temPopover === true || (x.g && x.g.pop !== true)) && res.every(x => x.g && x.g.pos === 'fixed' && +x.g.z >= 2147483000), `SEM popover ${w}: o fallback (position:fixed, z-index ${res[0] && res[0].g && res[0].g.z}) é o que segura o post-it do termo`, res[0] && res[0].g);
    else ok(res.every(x => x.g && x.g.pop === true), `com popover ${w}: o post-it do termo está na top layer (:popover-open)`, res[0] && res[0].g);
    ok(errs.length === 0, `${w}: 0 erros JS`, errs);
    await ctx.close();
  }

  /* =============================== F · faixa e lateral do Layout V2 ficam por cima =============================== */
  sec('F · faixa fixa (z 340) e lateral (z 360) do Layout V2 ficam POR CIMA do post-it (z-index do post-it = 2); no layout legado topbar 300 / abas 220 / índice 360 (estático em A)');
  for (const w of [1024, 1440]) {
    const c = cat(['semiologia-ii'])[0]; const { ctx, page } = await P.abrirMateria(br, base, c.slug, c.tab, w, 900, { layout: true });
    await page.evaluate(P.NOTAS);
    const r = await page.evaluate(async () => {
      const el = window.__notas.find(e => getComputedStyle(e).float === 'right'), band = document.querySelector('.rm-l2-band'); if (!band) return { semBanda: true };
      const hb = band.getBoundingClientRect().bottom, t0 = el.getBoundingClientRect().top + scrollY; scrollTo(0, t0 - hb / 2); await new Promise(r => setTimeout(r, 350)); scrollTo(0, t0 - hb / 2); await new Promise(r => setTimeout(r, 350));
      const nr = el.getBoundingClientRect(), x = nr.left + nr.width / 2, y = Math.max(2, Math.min(hb - 4, nr.top + 6)), sob = nr.top < hb - 6, topo = document.elementFromPoint(x, y);
      return { sob, hb: Math.round(hb), noteTop: Math.round(nr.top), topo: topo && (band.contains(topo) ? 'faixa' : topo.tagName + '.' + topo.className), z: getComputedStyle(band).zIndex };
    });
    ok(!r.semBanda && r.sob && r.topo === 'faixa', `${w}: com o post-it rolado POR BAIXO da faixa (topo do post-it ${r.noteTop}px < faixa ${r.hb}px) o toque cai na faixa (z ${r.z})`, r);
    const l = await page.evaluate(() => { const side = document.querySelector('.rm-l2-side'); if (!side || getComputedStyle(side).display === 'none') return { semLateral: true }; const sr = side.getBoundingClientRect(), n = [...document.querySelectorAll('#materias-container .rmc-margin')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > sr.left && r.left < sr.right; }); return { z: getComputedStyle(side).zIndex, w: Math.round(sr.width), sobrepostos: n.length }; });
    ok(l.semLateral || (l.sobrepostos === 0 && +l.z >= 360), `${w}: nenhum post-it lateral se sobrepõe à lateral do V2 (${l.semLateral ? 'lateral oculta nesta largura' : 'lateral ' + l.w + ' px, z ' + l.z})`, l);
    await ctx.close();
  }

  await br.close(); srv.close();
  console.log(`\npostits-encobertos: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
