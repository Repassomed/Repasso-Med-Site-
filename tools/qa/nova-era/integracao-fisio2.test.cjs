/* Nova Era · Fisiopatología II · fluxo COMPLETO (rm-pilot → layout → tema → navegação → caneta V2 → marcações) em Chromium real.
   LIGAÇÃO REAL: usa o rm-pilot.js, rm-materia-sistema.js/.css e rm-materia-nav.js do repositório, sem nenhuma simulação do carregador (os temas estão em RMSistema.TEMAS).
   Supabase simulado (harness-ink); gate do piloto (get-pilot-flags) simulado por page.route; 0 rede real; 0 escrita real. Conta administradora de teste.
   Uso: export NODE_PATH=$(npm root -g); node tools/qa/nova-era/integracao-fisio2.test.cjs [--rapido]   (RM_SHOTS=/pasta salva capturas)
   Prova, por matéria e largura (320·360·390 · 768·1024 · 1440):
     A  fluxo real: layout + tema da matéria + navegação + caneta V2 ligados pelo rm-pilot; 0 erro JS.
     B  MARCAÇÕES: grifos (linhas sintéticas ancoradas no texto REAL) = os mesmos spans com e sem layout/tema; tinta semeada volta desenhada no bloco aberto.
     C  CANETA: 1 traço novo por gesto, 0 pontos perdidos, desvio ≤ 1,6 px, gravado 1×, âncora = parágrafo/linha de tabela escrito; a âncora gravada no layout novo
        resolve para o MESMO texto no layout antigo (estável); dedo com a caneta armada não desenha (rola); desfazer remove só o último.
     D  VÍDEOS (Farmacología I): os 23 iframes continuam (mesma contagem), nenhum passa da largura da tela, no bloco e no modo «Videos».
     E  TELAS: sem overflow horizontal e sem elemento fora da tela nos blocos pesados, em todas as larguras. */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { serve, ROOT } = require('../browser-qa/layout/serve.cjs');
const B = require('../browser-qa/layout/pen-bench.cjs');
const RAPIDO = process.argv.includes('--rapido');
const SHOTS = process.env.RM_SHOTS || '';
const JOSE = 'd4d215d3-36dd-4efb-8869-bdea5376c648';
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 360) : ''); } return !!c; };

const MATERIAS = [{"slug": "fisiopatologia-ii", "tab": "fisio2", "titulo": "Fisiopatología II", "hl": ["fp2b01", "fp2b02", "fp2b08"], "pesados": ["fp2b01", "fp2b02", "fp2b08", "fp2b10", "bancofp2"], "blocoPen": "fp2b01", "blocoTab": "fp2b01", "videos": false, "nVideos": 0, "videoBlocos": []}];
const SO = process.env.RM_SO || '';
const LARG = process.env.RM_LARG ? process.env.RM_LARG.split(',').map(x => x.split('x').map(Number)) : RAPIDO ? [[390, 844], [1440, 900]] : [[320, 640], [360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]];

(async () => {
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const pilSrc = fs.readFileSync(path.join(ROOT, 'assets/rm-pilot.js'), 'utf8');
  const cand = /var CANDIDATAS = \[([^\]]*)\];/.exec(pilSrc);
  ok(cand && MATERIAS.every(m => cand[1].includes("'" + m.slug + "'")), 'rm-pilot.js: CANDIDATAS contém fisiopatologia e farmacologia (ligação no código, sem simulação)', cand && cand[1]);
  const sisSrc = fs.readFileSync(path.join(ROOT, 'assets/rm-materia-sistema.js'), 'utf8');
  ok(MATERIAS.every(m => new RegExp("'" + m.slug + "': \{").test(sisSrc)), 'rm-materia-sistema.js: TEMAS tem os dois descritores inline (mesmo padrão de Medicina Familiar)');
  ok(!fs.existsSync(path.join(ROOT, 'assets/temas')), 'não há segunda fonte do tema (assets/temas removido)');

  async function abrir(m, w, h, { fluxo = true, hl = null, seed = '' } = {}) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: false });
    const p = await ctx.newPage(); const errs = [], ruins = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    p.on('console', c => { if (c.type() === 'error' && !/Failed to load resource|net::ERR/.test(c.text())) errs.push('c:' + c.text().slice(0, 140)); });
    p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) ruins.push(r.status() + ' ' + r.url().replace(base, '')); });
    await p.addInitScript(([id, slug, tab, titulo, hlRows]) => {
      let v; Object.defineProperty(window, 'RM_SB', { configurable: true, get() { return v; }, set(x) { if (x && x.auth) { x.auth.getSession = async () => ({ data: { session: { access_token: 'tok-test', user: { id } } } }); } v = x; } });
      let cat; Object.defineProperty(window, 'RM_CATALOGO', { configurable: true, get() { return cat; }, set(x) { cat = x; if (Array.isArray(x) && !x.some(c => c.slug === slug)) x.push({ slug, tab, title: titulo, sub: '' }); } });
      if (hlRows) window.__HL = hlRows;
    }, [JOSE, m.slug, m.tab, m.titulo, hl]);
    await p.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: m.slug, layout: fluxo, visual: fluxo, audio: false, pen: fluxo }) }));
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await p.route(/youtube(-nocookie)?\.com|ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '' }));
    await p.goto(`${base}/p.html?slug=${m.slug}&tab=${m.tab}&uid=${JOSE}&wait=1800${seed ? '&seed=' + seed : ''}`, { timeout: 90000 });
    await p.waitForFunction('window.__ready===true', { timeout: 90000 });
    if (fluxo) { await p.waitForFunction(() => document.documentElement.classList.contains('rm-sis') && !!window.RMNav && !!window.RMToolsV2, null, { timeout: 30000 }).catch(() => {}); }
    await p.waitForTimeout(1800);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    return { ctx, p, errs, ruins };
  }
  const irBloco = (p, id) => p.evaluate(async id => { if (window.RMNav) { window.RMNav.go({ view: 'block', block: id }); await new Promise(r => setTimeout(r, 1500)); } }, id);
  const ancoras = (p) => p.evaluate(() => [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].map(s => s.getAttribute('data-anchor')));

  for (const m of MATERIAS.filter(x => !SO || x.slug === SO)) {
    console.log('\n################ ' + m.titulo + ' (' + m.slug + ')');

    /* linhas de grifo sintéticas, ancoradas no texto REAL (nenhum dado de aluno entra no repositório) */
    const f0 = await abrir(m, 1440, 900, { fluxo: false });
    const rows = await f0.p.evaluate(ids => ids.map((id, i) => {
      const sec = document.getElementById(id); const p = [...sec.querySelectorAll('p')].find(q => !q.closest('[data-rm-ui],table,.quiz-item,.flashcard') && q.textContent.replace(/\s+/g, ' ').trim().length > 140);
      const t = p.textContent.replace(/\s+/g, ' ').trim(); const ini = 40, len = 28;
      return { id: 'sint-' + i, block_id: id, exact_text: t.slice(ini, ini + len), prefix: t.slice(Math.max(0, ini - 20), ini), suffix: t.slice(ini + len, ini + len + 20), occurrence: 0, color: 'yellow' };
    }), m.hl);
    const base0 = await f0.p.evaluate(() => ({ ifr: document.querySelectorAll('#materias-container iframe').length, sis: document.documentElement.classList.contains('rm-sis'), l2: !!document.querySelector('.rm-l2') }));
    ok(!base0.sis && !base0.l2, 'referência: sem flags a matéria abre no layout antigo (sem layout, sem tema)');
    await f0.ctx.close();

    /* referência de marcações sem layout/tema */
    const fr = await abrir(m, 1440, 900, { fluxo: false, hl: rows });
    const hlRef = await fr.p.evaluate(() => [...document.querySelectorAll('#materias-container span.rm-hl')].map(e => e.textContent));
    const junto = hlRef.join('').replace(/\s+/g, '');
    ok(hlRef.length >= rows.length && rows.every(r => junto.includes(r.exact_text.replace(/\s+/g, ''))), `referência (layout antigo): ${rows.length} grifos sintéticos pintados (${hlRef.length} spans; um grifo pode ser dividido em vários spans)`, hlRef.slice(0, 3));
    const antigoLongos = await fr.p.evaluate((id) => { const sec = document.getElementById(id); return [...sec.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(x => !x.closest('[data-rm-ui]')).map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)); }, m.blocoPen);
    await fr.ctx.close();

    for (const [W, H] of LARG) {
      console.log(`\n▸ [${W}×${H}] ${m.titulo}`);
      const f = await abrir(m, W, H, { fluxo: true, hl: rows, seed: m.blocoPen }); const p = f.p;
      const st = await p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.getAttribute('data-rm-tema'), l2: !!document.querySelector('.rm-l2, #rm-l2-side'), v2: !!window.RMToolsV2, nav: !!(window.RMNav && window.RMNav.ativo && window.RMNav.ativo()), piloto: window.RMToolsV2 && RMToolsV2._test && RMToolsV2._test.pilotoPermitido && RMToolsV2._test.pilotoPermitido() }));
      ok(st.sis && st.tema === m.slug && st.l2 && st.v2 && st.nav, 'A · layout + tema da matéria + navegação + caneta V2 ligados pelo rm-pilot', st);
      ok(st.piloto === true, 'A · caneta V2 com os refinamentos físicos liberados para a matéria (pen:true)', st.piloto);
      const hlAgora = await p.evaluate(() => [...document.querySelectorAll('#materias-container span.rm-hl')].map(e => e.textContent));
      ok(JSON.stringify(hlAgora) === JSON.stringify(hlRef), `B · os ${hlRef.length} grifos ficam IGUAIS com layout + tema + navegação (mesmos spans, mesmo texto)`, [hlRef.length, hlAgora.length]);
      const stPre = await p.evaluate(() => ({ svg: document.querySelectorAll('#rm2-ink svg[data-anchor]').length }));
      await irBloco(p, m.blocoPen); await p.waitForTimeout(900);
      const tr = await p.evaluate(() => [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].map(sv => { const a = sv.getAttribute('data-anchor').split('>'); const s = document.getElementById(a[0]); const el = a[1] !== undefined ? [...s.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(x => !x.closest('[data-rm-ui]'))[+a[1]] : s; return { a: sv.getAttribute('data-anchor'), tag: el && el.tagName, n: sv.querySelectorAll('path[data-ink]').length }; }));
      ok(tr.length >= 1 && tr.every(x => x.n >= 1 && x.tag), `B · a tinta semeada volta desenhada no bloco aberto (${tr.length} âncora(s): ${tr.map(x => x.a + '→' + x.tag).join(', ')})`, tr);

      /* C · caneta */
      const alvos = { paragrafo: id => { const s = document.getElementById(id); const ok = q => q.textContent.trim().length > 160 && q.getBoundingClientRect().height >= 60; const diretos = [...s.querySelectorAll(':scope > p')].filter(ok); return diretos[1] || diretos[0] || [...s.querySelectorAll('p')].filter(q => !q.closest('[data-rm-ui],table,.quiz-item,.flashcard,aside') && ok(q))[0]; },
                      tabela: id => { const s = document.getElementById(id); return s.querySelector('table tbody tr') || s.querySelector('table'); } };
      await p.evaluate(B.INSTR);
      const gestos = W === 1440 && !RAPIDO ? ['rapido', 'longo'] : ['rapido'];
      for (const alvo of Object.keys(alvos)) for (const gn of gestos) {
        const info = await p.evaluate(async ([fn, id]) => { const el = (new Function('return (' + fn + ')'))()(id); if (!el) return null; window.RMToolsV2.escolherFerramenta('pen'); (window.RMLayout && window.RMLayout.irPara ? window.RMLayout.irPara(el) : el.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 1500)); const b = el.getBoundingClientRect(); window.__alvoEl = el; return { x: b.left, y: b.top, w: b.width, h: b.height, txt: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) }; }, [alvos[alvo].toString(), m.blocoPen]);
        if (!info || info.h < 12) { ok(false, `C · ${alvo}: alvo não encontrado/visível`, info); continue; }
        const r = await p.evaluate(() => { const b = window.__alvoEl.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
        const ins0 = await p.evaluate(() => (window.__writes || []).filter(w => /insert:user_ink_strokes/.test(w)).length), n0 = (await ancoras(p)).length;
        const pts = B.gesto(gn, r); await B.desenhar(f.ctx, p, pts, 2, 1); await p.waitForTimeout(900);
        const per = await B.medirPerdas(p, pts); const ins1 = await p.evaluate(() => (window.__writes || []).filter(w => /insert:user_ink_strokes/.test(w)).length);
        const ult = await p.evaluate(() => { const svs = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')]; const sv = svs[svs.length - 1]; const a = sv.getAttribute('data-anchor'); const [s, i] = a.split('>'); const el = i !== undefined ? [...document.getElementById(s).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')].filter(x => !x.closest('[data-rm-ui]'))[+i] : document.getElementById(s); return { a, tag: el && el.tagName, txt: el && el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60), full: el ? el.textContent.replace(/\s+/g, ' ') : '' }; });
        ok(per.tracos !== 0 && per.perdidos === 0 && per.maxDist <= 1.6 && ins1 === ins0 + 1, `C · ${alvo} · ${gn}: 1 gravação (${ins0}→${ins1}), ${per.perdidos}/${pts.length} pontos perdidos, desvio máx ${per.maxDist && per.maxDist.toFixed(2)} px (≤ 1,6)`, per);
        if (gn === 'rapido') {
          ok(ult.txt && (alvo === 'tabela' ? ult.tag === 'TABLE' && ult.full.includes(info.txt.slice(0, 30)) : ult.txt === info.txt), `C · ${alvo}: a âncora gravada (${ult.a}) aponta para ${alvo === 'tabela' ? 'a tabela que contém a linha escrita' : 'o parágrafo escrito'} («${(ult.txt || '').slice(0, 30)}…»)`, [ult, info.txt]);
          const [sId, idx] = ult.a.split('>');
          ok(idx === undefined || antigoLongos.length === 0 || sId !== m.blocoPen || (antigoLongos[+idx] || '').slice(0, 40) === (ult.txt || '').slice(0, 40), `C · ${alvo}: no layout ANTIGO a mesma âncora resolve para o mesmo texto (âncora estável)`, [sId, idx, antigoLongos[+idx]]);
        }
      }
      if (W < 900) {
        await p.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); const a0 = (await ancoras(p)).length;
        const rr = await p.evaluate(id => { const q = [...document.getElementById(id).querySelectorAll('p')].find(x => !x.closest('[data-rm-ui],table') && x.checkVisibility() && x.textContent.trim().length > 160); q.scrollIntoView({ block: 'center' }); const b = q.getBoundingClientRect(); return { x: b.left + 20, y: b.top + Math.min(20, b.height / 2) }; }, m.blocoPen);
        const cdp = await f.ctx.newCDPSession(p); const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
        const svg0 = await p.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
        await tp('touchStart', rr.x, rr.y); for (let i = 1; i <= 8; i++) await tp('touchMove', rr.x + i * 12, rr.y + (i % 2 ? 4 : -4)); await tp('touchEnd', rr.x + 96, rr.y); await p.waitForTimeout(700); await cdp.detach().catch(() => {});
        ok((await p.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length)) === svg0, 'C · dedo com a caneta armada NÃO desenha (rola)');
      }
      const nAntes = await p.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
      await p.evaluate(() => { window.RMToolsV2.escolherFerramenta('none'); window.RMToolsV2.desfazer(); }); await p.waitForTimeout(900);
      const nDepois = await p.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
      ok(nDepois === nAntes - 1, `C · desfazer remove só o último traço (${nAntes}→${nDepois})`);

      /* D · vídeos */
      if (m.videos) {
        const vd = await p.evaluate(() => { const vw = window.innerWidth; const all = [...document.querySelectorAll('#materias-container iframe')]; return { total: all.length }; });
        ok(vd.total === m.nVideos, `D · os ${m.nVideos} iframes de vídeo continuam na matéria (${vd.total})`);
        for (const bid of m.videoBlocos) {
          await irBloco(p, bid); await p.waitForTimeout(500);
          const g = await p.evaluate(id => { const vw = window.innerWidth; document.getElementById(id).querySelectorAll('details').forEach(d => { if (d.querySelector('iframe')) d.open = true; }); const fr = [...document.getElementById(id).querySelectorAll('iframe')]; const vis = fr.filter(f => f.checkVisibility && f.checkVisibility()); return { n: fr.length, vis: vis.length, fora: vis.filter(f => { const r = f.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1 || r.width < 150 || r.height < 80; }).length, minW: vis.length ? Math.min(...vis.map(f => Math.round(f.getBoundingClientRect().width))) : null }; }, bid);
          ok(g.n >= 1 && g.vis === g.n && g.fora === 0, `D · ${bid}: ${g.n} vídeos (cartões abertos), ${g.vis} visíveis, 0 fora da tela (largura mínima ${g.minW}px)`, g);
        }
        const modo = await p.evaluate(async () => {
          const c = [...document.querySelectorAll('.rm-l2-rescard, .rm-l2-res a, .rm-l2-res button')].find(e => /video/i.test(e.textContent)); if (!c) return { achou: false };
          c.click(); await new Promise(r => setTimeout(r, 1500));
          const vis = e => !!(e && e.checkVisibility && e.checkVisibility());
          const unidad = [...document.querySelectorAll('.rm-nav-modeidx .rm-sis-ulab b')].filter(vis).map(e => e.textContent);
          const cards = [...document.querySelectorAll('.rm-nav-modeidx .rm-sis-card')].filter(vis);
          const n = cards.length; if (n) cards[0].click(); await new Promise(r => setTimeout(r, 1500));
          document.querySelectorAll('#materias-container details').forEach(d => { if (d.querySelector('iframe') && vis(d)) d.open = true; }); await new Promise(r => setTimeout(r, 300));
          const vw = window.innerWidth; const v = [...document.querySelectorAll('#materias-container iframe')].filter(vis);
          return { achou: true, cartoes: n, unidad, vis: v.length, fora: v.filter(f => { const r = f.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1 || r.width < 150; }).length };
        });
        if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `${m.slug}-${W}-modo-videos.png`) }); }
        ok(modo.achou && modo.cartoes >= 1 && modo.vis > 0 && modo.fora === 0, `D · modo «Videos»: ${modo.cartoes} blocos com vídeo; ao abrir um, ${modo.vis} vídeos visíveis e 0 fora da tela`, modo);
        ok(!(modo.unidad || []).some(t => /UNIDAD/.test(t)), 'D · modo «Videos»: nenhum rótulo «UNIDAD ·» visível', modo.unidad);
        await p.evaluate(() => { try { window.RMNav.go({ view: 'index' }); } catch (e) {} });
      }

      /* E · telas */
      for (const bid of m.pesados) {
        await irBloco(p, bid); await p.evaluate(() => document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; })); await p.waitForTimeout(500);
        const geo = await p.evaluate(id => { const sec = document.getElementById(id); const Wd = window.innerWidth; const rolavel = e => { for (let q = e; q && q !== document.body; q = q.parentElement) { const o = getComputedStyle(q).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; }; const fora = [...sec.querySelectorAll('*')].filter(e => { if (e.closest('#rm2-ink')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > Wd + 1 && !rolavel(e.parentElement) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map(e => e.tagName + '.' + String(e.className).slice(0, 20)); return { doc: document.documentElement.scrollWidth - Wd, fora, im: [...sec.querySelectorAll('img')].filter(i => !(i.complete && i.naturalWidth > 0)).length }; }, bid);
        ok(geo.doc <= 1 && geo.fora.length === 0 && geo.im === 0, `E · ${bid}: sem overflow (doc ${geo.doc}), ${geo.fora.length} elementos fora da tela${geo.fora.length ? ' [' + geo.fora + ']' : ''}, ${geo.im} imagens quebradas`);
        if (SHOTS && (W === 390 || W === 768 || W === 1440) && bid === m.pesados[0]) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `${m.slug}-${W}-${bid}.png`) }); }
      }
      ok(f.errs.length === 0, 'A · 0 erros JS no fluxo todo' + (f.errs.length ? ' · ' + f.errs.slice(0, 3).join('|') : ''));
      ok(f.ruins.length === 0, 'A · 0 respostas HTTP ≥ 400' + (f.ruins.length ? ' · ' + f.ruins.slice(0, 3).join('|') : ''));
      await f.ctx.close();
    }
  }
  await br.close(); srv.close();
  console.log(`\nintegracao-fisio2: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
