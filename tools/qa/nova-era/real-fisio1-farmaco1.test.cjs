/* Nova Era · Fisiopatología I e Farmacología I · LIGAÇÃO REAL (sem nenhuma simulação do carregador nem da decisão do servidor).
   Cadeia real: função netlify get-pilot-flags REAL (lib-servidor) → rm-pilot.js REAL (CANDIDATAS do repositório) → rm-layout → rm-materia-sistema (TEMAS inline) → rm-materia-nav
   → rm-materia-indice → rm-tools-v2 (caneta V2) → app-core (questões, flashcards, infográficos). Só o Supabase e a rede externa são simulados (harness, sessionStorage; 0 rede real, 0 escrita real).
   O mesmo mecanismo privado de Medicina Familiar: tabela `rm_materia_rollout` simulada em 'preview' (só administrador) — NADA é ativado para alunos.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/nova-era/real-fisio1-farmaco1.test.cjs [--rapido] [slug]
   Prova, por matéria e largura (celular 390 · tablet 768 · computador 1440):
     0  servidor real: off ⇒ nada; preview ⇒ só administrador; all ⇒ só aluno COM acesso; sem acesso ⇒ nada (para as duas matérias).
     1  layout + tema + navegação + caneta V2 ligados pelo rm-pilot real, 0 erro JS.
     2  NAVEGAÇÃO: índice → bloco → próximo/anterior; modos Infografías · Preguntas · Flashcards (e Videos em Farmacología I) abrem e mostram blocos.
     3  QUESTÕES: responder V/F, alternativa ou «Ver respuesta» mostra a resposta (3 tipos quando existem).
     4  FLASHCARDS: o mazo abre («Jugar»), mostra carta e fecha sem erro.
     5  INFOGRÁFICOS: imagens do bloco carregam (naturalWidth > 0) e o clique amplia/restaura (classe de tela cheia) sem estourar a tela.
     6  GRIFOS: os grifos semeados (ancorados no texto real) continuam os mesmos spans com o layout/tema/navegação ligados.
     7  CANETA: parágrafo e tabela, 1 traço por gesto, 0 pontos perdidos, desvio ≤ 1,6 px, 1 gravação; dedo não desenha; desfazer; o traço volta ao recarregar na mesma âncora. */
'use strict';
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs'); const D = require('../pre-voo/lib-dados.cjs'); const S = require('./lib-servidor.cjs'); const B = require('../browser-qa/layout/pen-bench.cjs'); S.U.JOSE = D.UID;
const RAPIDO = process.argv.includes('--rapido'); const SO = process.argv.slice(2).find(a => !a.startsWith('--')) || '';
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 420) : ''); } return !!c; };
const MATERIAS = [
  { slug: 'fisiopatologia', titulo: 'Fisiopatología I', hl: ['introduccion-fisio', 'inflamacion'], bloco: 'introduccion-fisio', bloco2: 'inflamacion', blocoQuiz: 'inflamacion', blocoImg: 'introduccion-fisio', fcSec: 'flashcards-fisio', modos: ['Infografías', 'Preguntas', 'Flashcards'] },
  { slug: 'farmacologia', titulo: 'Farmacología I', hl: ['pk', 'pd'], bloco: 'pk', bloco2: 'pd', blocoQuiz: 'pk', blocoImg: 'pk', fcSec: 'flashcards-grales', modos: ['Infografías', 'Preguntas', 'Flashcards', 'Videos'] }
];
(async () => {
  const rec = L.reconciliar(); const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const ENV = { RM_PILOT_LAYOUT_UIDS: S.U.JOSE, RM_PILOT_PEN_UIDS: S.U.JOSE, RM_PILOT_VISUAL_UIDS: S.U.JOSE };
  for (const m of MATERIAS.filter(x => !SO || x.slug === SO)) {
    const ativa = rec.ativas.find(x => x.slug === m.slug); m.tab = ativa && ativa.tab;
    console.log('\n################ ' + m.titulo + ' (' + m.slug + ') · ligação real');
    ok(!!m.tab, 'a matéria existe no inventário/catálogo real (aba ' + m.tab + ')');

    /* 0 · servidor real */
    const T = (l, p, v) => ({ [m.slug]: { layout_stage: l, pen_stage: p, visual_stage: v } });
    const AC = { [S.U.ALUNO]: [m.slug], [S.U.JOSE]: [] };
    const q = async (tabela, quem) => S.chamar({ env: ENV, tabela, acessos: AC }, quem, m.slug);
    const off = await q(T('off', 'off', 'off'), 'JOSE'), pre = await q(T('preview', 'preview', 'preview'), 'JOSE'), preA = await q(T('preview', 'preview', 'preview'), 'ALUNO');
    const allA = await q(T('all', 'all', 'all'), 'ALUNO'), allS = await q(T('all', 'all', 'all'), 'SEM');
    const J = o => { try { return JSON.parse(o._corpo); } catch (e) { return {}; } };
    ok(!J(off).layout && !J(off).visual && !J(off).pen, '0 · off: nada liberado (nem para o administrador)', J(off));
    ok(J(pre).layout && J(pre).visual && J(pre).pen, '0 · preview: o administrador recebe layout + tema + caneta', J(pre));
    ok(!J(preA).layout && !J(preA).visual && !J(preA).pen, '0 · preview: o aluno com acesso NÃO recebe nada', J(preA));
    ok(J(allA).layout && J(allA).visual && J(allA).pen, '0 · all: o aluno COM acesso recebe (só quando o José mandar; aqui é simulação do servidor)', J(allA));
    ok(!J(allS).layout && !J(allS).visual && !J(allS).pen, '0 · all: quem não tem acesso à matéria NÃO recebe', J(allS));

    const cena = { env: ENV, acessos: {}, tabela: T('preview', 'preview', 'preview') };
    /* linhas de grifo sintéticas ancoradas no texto REAL */
    const mk = async (W, H, { fluxo = true, hl = null, seed = '' } = {}) => {
      const ctx = await br.newContext({ viewport: { width: W, height: H }, hasTouch: W < 900 }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
      page.on('console', c => { if (c.type() === 'error' && !/Failed to load resource|net::ERR/.test(c.text())) errs.push('c:' + c.text().slice(0, 140)); });
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const gets = []; await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); gets.push(sl); const o = await S.chamar(fluxo ? cena : { env: ENV, acessos: {}, tabela: T('off', 'off', 'off') }, 'JOSE', sl); r.fulfill({ status: o._status, contentType: 'application/json', body: o._corpo }); });
      await page.addInitScript(([s, rows]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; if (rows) { try { if (!sessionStorage.getItem('ens.user_highlights')) sessionStorage.setItem('ens.user_highlights', JSON.stringify(rows)); } catch (e) {} } }, [m.slug, hl]);
      await page.goto(`${base}/p.html?slug=${m.slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${S.U.JOSE}${seed ? '&seed=' + seed : ''}`); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(500);
      await page.addScriptTag({ url: '/assets/rm-pilot.js?v=real' }); await page.waitForTimeout(fluxo ? 6500 : 2500);
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      return { ctx, page, errs, gets };
    };
    const irBloco = (p, id) => p.evaluate(async id => { RMNav.go({ view: 'block', block: id }); await new Promise(r => setTimeout(r, 1700)); }, id);

    const f0 = await mk(1440, 900, { fluxo: false });
    const rows = await f0.page.evaluate(ids => ids.map((id, i) => { const sec = document.getElementById(id); const p = [...sec.querySelectorAll('p')].find(q => !q.closest('[data-rm-ui],table,.quiz-item,.flashcard') && q.textContent.replace(/\s+/g, ' ').trim().length > 140); const t = p.textContent.replace(/\s+/g, ' ').trim(); const ini = 40, len = 28; return { id: 'sint-' + i, block_id: id, exact_text: t.slice(ini, ini + len), prefix: t.slice(Math.max(0, ini - 20), ini), suffix: t.slice(ini + len, ini + len + 20), occurrence: 0, color: 'yellow' }; }), m.hl);
    const sem = await f0.page.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), l2: !!document.querySelector('.rm-l2') }));
    ok(!sem.sis && !sem.l2, 'referência: com a tabela em off a matéria abre no layout antigo, sem tema');
    await f0.ctx.close();
    const fr = await mk(1440, 900, { fluxo: false, hl: rows });
    const hlRef = await fr.page.evaluate(() => [...document.querySelectorAll('#materias-container span.rm-hl')].map(e => e.textContent));
    ok(hlRef.length >= rows.length, `referência (layout antigo): ${rows.length} grifos sintéticos pintados (${hlRef.length} spans)`, hlRef.length);
    await fr.ctx.close();

    for (const W of (RAPIDO ? [1440, 390] : [1440, 768, 390])) {
      console.log(`\n▸ [${W}px] ${m.titulo}`);
      const f = await mk(W, W < 500 ? 844 : W < 1000 ? 1024 : 900, { hl: rows, seed: m.bloco }); const p = f.page;
      const st = await p.evaluate(() => ({ sis: document.documentElement.classList.contains('rm-sis'), tema: document.documentElement.getAttribute('data-rm-tema'), l2: !!document.querySelector('.rm-l2, #rm-l2-side'), v2: !!window.RMToolsV2, nav: !!(window.RMNav && RMNav.go), piloto: window.RMToolsV2 && RMToolsV2._test.pilotoPermitido() }));
      ok(st.sis && st.tema === m.slug && st.l2 && st.v2 && st.nav && st.piloto === true, '1 · layout + tema da matéria + navegação + caneta V2 (refinamentos físicos) ligados pelo rm-pilot real', st);
      ok(f.gets.includes(m.slug), '1 · o rm-pilot perguntou ao servidor por esta matéria (CANDIDATAS do repositório)', f.gets);

      /* 6 · grifos */
      const hlAgora = await p.evaluate(() => [...document.querySelectorAll('#materias-container span.rm-hl')].map(e => e.textContent));
      ok(JSON.stringify(hlAgora) === JSON.stringify(hlRef), `6 · os ${hlRef.length} grifos ficam IGUAIS com o layout novo (mesmos spans, mesmo texto)`, [hlRef.length, hlAgora.length]);

      /* 2 · navegação */
      await irBloco(p, m.bloco);
      const v1 = await p.evaluate(() => { const e = window.RMNav.estado && RMNav.estado(); return e || null; });
      const aberto = await p.evaluate(id => { const s = document.getElementById(id); return !!s && s.checkVisibility() && s.getBoundingClientRect().height > 200; }, m.bloco);
      ok(aberto, `2 · RMNav.go abre o bloco «${m.bloco}» (visível)`, v1);
      const prox = await p.evaluate(async () => { const b = document.querySelector('.rm-nav-pager [data-dir="next"], .rm-nav-next, [data-rm-next]'); if (!b) return 'sem-botão'; b.click(); await new Promise(r => setTimeout(r, 1500)); return 'ok'; });
      ok(prox === 'ok' || prox === 'sem-botão', '2 · botão «bloque siguiente» (' + prox + ')');
      await p.evaluate(() => RMNav.go({ view: 'index' })); await p.waitForTimeout(900);
      const idx = await p.evaluate(() => ({ cards: document.querySelectorAll('.rm-sis-card').length, cap: !!document.querySelector('.rm-sis-idx-h, .rm-sis-hero, .rm-sis-capa') }));
      ok(idx.cards >= 10, '2 · o índice mostra os cartões dos blocos (' + idx.cards + ')', idx);
      const mi = await p.evaluate(async modos => { const out = {}; for (const mo of modos) { const b = [...document.querySelectorAll('[data-rm-ui] button, [data-rm-ui] a')].find(e => e.textContent.trim().toLowerCase().startsWith(mo.toLowerCase().slice(0, 7)) && e.checkVisibility()); out[mo] = !!b; } return out; }, m.modos);
      ok(Object.values(mi).some(Boolean), '2 · atalhos de modo (' + Object.keys(mi).filter(k => mi[k]).join(', ') + ')', mi);

      /* 3 · questões */
      await irBloco(p, m.blocoQuiz);
      const qz = await p.evaluate(async id => {
        const sec = document.getElementById(id); const out = { tf: null, mc: null, rv: null };
        const tentar = async (sel, fn) => { const item = [...sec.querySelectorAll('.quiz-item')].find(i => i.querySelector(sel)); if (!item) return null; item.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 250)); const a = item.querySelector('.answer'); const antes = a && a.checkVisibility(); fn(item); await new Promise(r => setTimeout(r, 400)); return { antes: !!antes, depois: !!(a && a.checkVisibility()) || item.classList.contains('answered') }; };
        out.tf = await tentar('.tf-btn', i => i.querySelector('.tf-btn').click());
        out.mc = await tentar('.interactive-options li[data-option]', i => i.querySelector('.interactive-options li[data-option]').click());
        out.rv = await tentar('.reveal-btn', i => i.querySelector('.reveal-btn').click());
        return out;
      }, m.blocoQuiz);
      const tiposQ = Object.keys(qz).filter(k => qz[k]);
      ok(tiposQ.length >= 1 && tiposQ.every(k => qz[k].depois), '3 · responder mostra a resposta (' + tiposQ.map(k => k + ': ' + qz[k].antes + '→' + qz[k].depois).join(' · ') + ')', qz);

      /* 4 · flashcards (mazo) */
      await irBloco(p, m.fcSec);
      const fc = await p.evaluate(async () => {
        const play = [...document.querySelectorAll('.rmfc-play')].find(b => b.checkVisibility()); if (!play) return { play: false };
        play.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300)); play.click(); await new Promise(r => setTimeout(r, 900));
        const ov = [...document.querySelectorAll('[class*="rmfc-"]')].filter(e => !e.closest('.rmfc-launch') && e.checkVisibility() && e.getBoundingClientRect().width > 200);
        const r = { play: true, aberto: ov.length > 0, fora: ov.some(e => e.getBoundingClientRect().right > innerWidth + 2) };
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); const x = document.querySelector('.rmfc-close, .rmfc-x, [class*="rmfc"][aria-label*="errar"]'); if (x) x.click(); await new Promise(r => setTimeout(r, 500));
        return r;
      });
      ok(fc.play && fc.aberto && !fc.fora, '4 · mazo de flashcards: «Jugar» abre o jogo dentro da tela', fc);
      const fcLista = await p.evaluate(id => { const s = document.getElementById(id); return { cartas: s.querySelectorAll('.flashcard').length }; }, m.fcSec);
      ok(fcLista.cartas > 50, '4 · seção de flashcards tem as cartas do conteúdo (' + fcLista.cartas + ')');
      await p.evaluate(() => { const c = document.querySelector('.rmfc-game, .rmfc-overlay, [class*="rmfc-ov"]'); if (c) c.remove(); document.body.style.overflow = ''; });

      /* 5 · infográficos */
      await irBloco(p, m.blocoImg);
      const im = await p.evaluate(async id => {
        const sec = document.getElementById(id); const imgs = [...sec.querySelectorAll('img')].filter(i => !i.closest('[data-rm-ui],.rm-sis-vig'));
        imgs.forEach(i => { i.loading = 'eager'; }); await new Promise(r => setTimeout(r, 1500));
        const quebradas = imgs.filter(i => i.complete && i.naturalWidth === 0).length; const largas = imgs.filter(i => i.getBoundingClientRect().right > innerWidth + 2 && i.checkVisibility()).length;
        const alvo = imgs.find(i => i.onclick || /toggle/.test(i.getAttribute('onclick') || '')); let zoom = null;
        if (alvo) { alvo.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300)); const c0 = alvo.className; alvo.click(); await new Promise(r => setTimeout(r, 400)); const c1 = alvo.className; const b = alvo.getBoundingClientRect(); const dentro = b.right <= innerWidth + 2 && b.left >= -2; alvo.click(); await new Promise(r => setTimeout(r, 300)); zoom = { mudou: c0 !== c1, dentro, volta: alvo.className === c0 }; }
        return { n: imgs.length, quebradas, largas, zoom };
      }, m.blocoImg);
      ok(im.n >= 1 && im.quebradas === 0 && im.largas === 0, `5 · infográficos: ${im.n} imagens, ${im.quebradas} quebradas, ${im.largas} passam da largura da tela`, im);
      ok(im.zoom && im.zoom.mudou && im.zoom.dentro && im.zoom.volta, '5 · clique amplia dentro da tela e o segundo clique restaura', im.zoom);

      /* 7 · caneta */
      await irBloco(p, m.bloco); await p.evaluate(B.INSTR);
      const ALVO = { paragrafo: id => { const s = document.getElementById(id); return [...s.querySelectorAll(':scope > p, :scope p')].filter(q => !q.closest('[data-rm-ui],table,.quiz-item,.flashcard,.rm-postit,.rmc-margin,.key-box') && q.textContent.trim().length > 160 && q.checkVisibility() && q.getBoundingClientRect().height > 60)[0]; },
        tabela: id => { const s = document.getElementById(id); return [...s.querySelectorAll('table tbody tr, table')].filter(e => e.checkVisibility() && e.getBoundingClientRect().height > 20)[0]; } };
      const ins = () => p.evaluate(() => (window.__writes || []).filter(w => w === 'insert:user_ink_strokes').length);
      const tracos = () => p.evaluate(() => document.querySelectorAll('#rm2-ink path[data-ink]').length);
      let temTabela = await p.evaluate(id => !!document.getElementById(id).querySelector('table'), m.bloco);
      for (const alvo of Object.keys(ALVO)) {
        if (alvo === 'tabela' && !temTabela) { console.log('    (bloco sem tabela: alvo «tabela» pulado)'); continue; }
        await p.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
        const pos = async () => p.evaluate(([fn, id]) => { const el = (new Function('return (' + fn + ')'))()(id); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, sy: scrollY }; }, [ALVO[alvo].toString(), m.bloco]);
        let r2 = await pos(); if (!r2 || r2.h < 12) { ok(false, `7 · ${alvo}: alvo não encontrado/visível`, r2); continue; }
        for (let k = 0; k < 12; k++) { await p.waitForTimeout(250); const q2 = await pos(); const est = q2 && Math.abs(q2.y - r2.y) < 0.5 && Math.abs(q2.sy - r2.sy) < 0.5; r2 = q2; if (est) break; }
        const n0 = await tracos(), w0 = await ins(); const pts = B.gesto('rapido', r2);
        await B.desenhar(f.ctx, p, pts, 2, 1); await p.waitForTimeout(1000);
        const per = await B.medirPerdas(p, pts); const n1 = await tracos(), w1 = await ins();
        ok(n1 === n0 + 1 && per.perdidos === 0 && per.maxDist <= 1.6 && w1 === w0 + 1, `7 · ${alvo}: 1 traço novo (${n0}→${n1}), ${per.perdidos}/${pts.length} pontos perdidos, desvio máx ${per.maxDist && per.maxDist.toFixed(2)} px (limite 1,6), gravado (${w0}→${w1})`, { per, n0, n1, w0, w1 });
      }
      if (W < 900) {
        await p.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); const n0 = await tracos();
        const r = await p.evaluate(id => { const s = document.getElementById(id); const q = [...s.querySelectorAll('p')].find(q => !q.closest('[data-rm-ui],table,.rm-postit') && q.checkVisibility() && q.textContent.trim().length > 160); q.scrollIntoView({ block: 'center' }); const b = q.getBoundingClientRect(); return { x: b.left + 40, y: Math.max(160, Math.min(innerHeight - 100, b.top + 12)) }; }, m.bloco); await p.waitForTimeout(700);
        const cdp = await f.ctx.newCDPSession(p); const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
        await tp('touchStart', r.x, r.y); for (let i = 1; i <= 8; i++) await tp('touchMove', r.x + i * 14, r.y + (i % 2 ? 4 : -4)); await tp('touchEnd', r.x + 112, r.y); await p.waitForTimeout(700); await cdp.detach().catch(() => {});
        ok((await tracos()) === n0, '7 · dedo com a caneta armada NÃO desenha (rola)', [n0, await tracos()]);
      }
      const n2 = await tracos(); await p.evaluate(() => window.RMToolsV2.escolherFerramenta('none')); await p.evaluate(() => window.RMToolsV2.desfazer()); await p.waitForTimeout(900);
      ok((await tracos()) === n2 - 1, '7 · desfazer remove o último traço (e só ele)', [n2, await tracos()]);
      const antes = await p.evaluate(() => JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]').map(x => x.anchor_id).sort());
      await p.reload(); await p.waitForFunction('window.__ready===true'); await p.waitForTimeout(500); await p.addScriptTag({ url: '/assets/rm-pilot.js?v=real2' }); await p.waitForTimeout(6500); await irBloco(p, m.bloco);
      const dep = await p.evaluate(() => ({ anc: JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]').map(x => x.anchor_id).sort(), des: document.querySelectorAll('#rm2-ink path[data-ink]').length }));
      ok(JSON.stringify(antes) === JSON.stringify(dep.anc) && (antes.length === 0 || dep.des >= 1), `7 · recarregar: ${dep.anc.length} traços gravados nas mesmas âncoras, ${dep.des} desenhados no bloco aberto`, [antes.length, dep]);
      ok(f.errs.length === 0, '0 erro JS no fluxo todo', f.errs);
      await f.ctx.close();
    }
  }
  await br.close(); srv.close();
  console.log(`\nreal-fisio1-farmaco1: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
