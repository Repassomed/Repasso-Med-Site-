#!/usr/bin/env node
/* Integração do audiobook (card no bloco + player único no slot) com MÍDIA REAL no Chromium:
   matéria Semiología II REAL (+ 6 sons de ausculta REAIS), funções REAIS atrás de um «Supabase» falso, áudio mp3/ogg REAL
   servido com Range/limite de banda/expiração por HTTPS local. Sem rede externa, sem Supabase real, sem escrita em banco.
   NOTA: o Chromium do Playwright não decodifica AAC/M4A; o formato M4A é validado pelo pipeline (ffmpeg) e em aparelho real. */
'use strict';
const path = require('path');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { iniciar } = require('./server.cjs');

let okN = 0, koN = 0; const falhas = []; const B1_BLOCKER = [];
const ok = (c, n, x) => { if (c) okN++; else { koN++; falhas.push(n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1 : e);
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const INSTR = `(function () {
  window.__m = { audioCtor: 0, audios: [], srcSets: [], errs: [], ptr: [] };
  var add0 = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t) {
    try {
      var st = (new Error().stack || '');
      if (/rm-audio/.test(st) && (this === window || this === document || this === document.documentElement || this === document.body)) window.__m.ptr.push(t);
    } catch (e) {}
    return add0.apply(this, arguments);
  };
  var A0 = window.Audio;
  window.Audio = function () { window.__m.audioCtor++; var a = new (Function.prototype.bind.apply(A0, [null].concat([].slice.call(arguments))))(); window.__m.audios.push(a); return a; };
  window.Audio.prototype = A0.prototype;
  var d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (d && d.set) Object.defineProperty(HTMLMediaElement.prototype, 'src', { get: d.get, set: function (v) { if (this.constructor === HTMLAudioElement && !this.closest) {} window.__m.srcSets.push(String(v).replace(/token=[^&]+/, 'token=…')); return d.set.call(this, v); }, configurable: true });
})();`;

async function nova(S, w, h, o) {
  o = o || {};
  const ctx = await o.browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: w || 1024, height: h || 768 }, deviceScaleFactor: o.dsf || 1, hasTouch: !!o.touch });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|403|404|net::/.test(m.text())) erros.push(m.text()); });
  await page.addInitScript(INSTR);
  if (o.token !== undefined) await page.addInitScript(t => { window.__tokOverride = t; }, o.token);
  await page.goto(S.base + '/h');
  await page.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
  if (o.sessao !== undefined) await page.evaluate(s => { window.__sess = s; }, o.sessao);
  return { ctx, page, erros };
}
const attach = page => page.evaluate(() => { window.RMLayout.attach(document.getElementById('tab-semio2')); });
async function boot(page, opts) {
  opts = opts || {};
  await page.evaluate(() => { window.__t0 = performance.now(); });
  if (!opts.semLayout) await attach(page);
  if (!(await page.evaluate(() => !!window.RMAudioBoot))) await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' });
  return page.evaluate(() => window.RMAudioBoot.start());
}
const E = page => page.evaluate(() => { const e = window.RMAudioBoot._engine(); return e ? e.getState() : null; });
const real = page => page.evaluate(() => { const a = window.__m.audios[0]; return a ? { t: a.currentTime, paused: a.paused, rate: a.playbackRate, pp: a.preservesPitch, dur: a.duration, ready: a.readyState, err: a.error && a.error.code, n: window.__m.audios.length, src: !!a.src } : null; });
const card = (page, id) => page.locator(`.rm-audio-card[data-audio-id="${id}"] .rm-audio-card__btn`);
const cardTxt = async (page, id) => (await card(page, id).textContent()).trim();   // textContent: innerText devolve '' quando o card está fora do ecrã (content-visibility:auto) com o B1 real
const media = S => S.log.filter(x => x.p.indexOf('/storage/v1/object/sign/') === 0);
const ate = async (page, fn, arg, t) => { try { await page.waitForFunction(fn, arg, { timeout: t || 8000 }); return true; } catch (e) { return false; } };
const AID = 's2-b01-motivo', AID2 = 's2-b03-epoc';

(async () => {
  const S = await iniciar();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const O = { browser };
  try {
    sec('Portões: tudo falha FECHADO e nada de áudio é carregado');
    { const { ctx, page } = await nova(S, 1024, 768, O); const real = await page.evaluate(() => !!document.querySelector('script[src*="/b1/rm-layout"]') && !!(window.RMLayout && window.RMLayout.attach));   // B1 real = o rm-layout.js servido de RM_B1_DIR (a main só tem `_dock` depois da #417)
      console.log('  Layout V2 usado: ' + (real ? 'REAL (rm-layout.js do B1, RM_B1_DIR)' : 'snapshot do contrato (stub)'));
      ok(process.env.RM_B1_DIR ? real : !real, 'o Layout V2 usado é o esperado pelo ambiente (RM_B1_DIR ⇒ real; senão stub)'); await ctx.close(); }
    {
      const casos = [
        ['sem sessão', { sessao: null }, null],
        ['outra conta (manifesto vazio no servidor)', { sessao: { token: 'tok-outro', uid: 'uid-outro' } }, null],
        ['token inválido', { sessao: { token: 'tok-falso', uid: 'x' } }, null],
        ['servidor com o piloto DESLIGADO', {}, () => { S.ligado = false; }],
        ['manifesto com erro 500', {}, () => { S.falha.manifest = 1; }],
        ['UID autorizado mas manifesto VAZIO', {}, () => { S.manifesto0 = S.manifesto; S.manifesto = []; }],
        ['UID autorizado mas nenhum item PRONTO (ready:false)', {}, () => { S.manifesto0 = S.manifesto; S.manifesto = S.manifesto.map(m => Object.assign({}, m, { ready: false })); }]
      ];
      for (const [nome, op, pre] of casos) {
        S.ligado = true; S.zera(); if (pre) pre();
        const { ctx, page } = await nova(S, 1024, 768, Object.assign({ browser }, op));
        const r = await boot(page);
        ok(r === false, `${nome}: start() ⇒ false`);
        ok((await page.evaluate(() => document.querySelectorAll('.rm-audio-card, .rm-audio').length)) === 0, `${nome}: 0 cards e 0 player`);
        ok(!S.log.some(x => /rm-audio\.(js|css)|rm-audio-store|rm-audio-provider/.test(x.p)) && media(S).length === 0, `${nome}: nenhum arquivo de áudio (css/js/store/provider) carregado, 0 mídia`);
        ok(await page.evaluate(() => window.__m.audioCtor === 0 && window.RMAudioBoot._estado() === null), `${nome}: estado limpo`);
        await ctx.close();
        if (S.manifesto0) { S.manifesto = S.manifesto0; S.manifesto0 = null; }
      }
      S.ligado = true;
      /* outra aba ativa */
      S.zera();
      { const { ctx, page } = await nova(S, 1024, 768, O); await page.evaluate(() => { document.getElementById('tab-semio2').classList.remove('active'); document.getElementById('tab-outra').classList.add('active'); });
        ok((await boot(page, {})) === false && S.ctr.manifest === 0, 'outra matéria ativa: false e 0 pedidos ao servidor'); await ctx.close(); }
      /* sem Layout V2 / sem slot */
      S.zera();
      { const { ctx, page } = await nova(S, 1024, 768, O); await page.evaluate(() => { delete window.RMLayout; });
        ok((await boot(page, { semLayout: true })) === false && S.ctr.manifest === 0, 'sem Layout V2: false e 0 pedidos'); await ctx.close(); }
      { const { ctx, page } = await nova(S, 1024, 768, O); await attach(page); await page.evaluate(() => { document.getElementById('rm-l2-player').remove(); });
        ok((await boot(page, { semLayout: true })) === false && S.ctr.manifest === 0, 'sem o slot #rm-l2-player: false e 0 pedidos'); await ctx.close(); }
    }

    sec('Cards: no bloco certo, sem mídia, sem deslocar âncoras');
    {
      S.zera();
      const { ctx, page, erros } = await nova(S, 1024, 768, O);
      const antes = await page.evaluate(() => {
        const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote', out = {};
        document.querySelectorAll('#tab-semio2 section[id]').forEach(s => { const cl = s.cloneNode(true); out[s.id] = { n: cl.querySelectorAll(SUB).length, t: cl.textContent.replace(/\s+/g, ' ').trim().length, ids: Array.from(cl.querySelectorAll('[id]')).map(e => e.id).join() }; });
        return out;
      });
      ok(await boot(page) === true, 'start() ⇒ true com sessão do piloto');
      const dep = await page.evaluate(() => {
        const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote', out = {};
        document.querySelectorAll('#tab-semio2 section[id]').forEach(s => { const cl = s.cloneNode(true); cl.querySelectorAll('[data-rm-ui]').forEach(e => e.remove()); out[s.id] = { n: cl.querySelectorAll(SUB).length, t: cl.textContent.replace(/\s+/g, ' ').trim().length, ids: Array.from(cl.querySelectorAll('[id]')).map(e => e.id).join() }; });
        return out;
      });
      ok(JSON.stringify(antes) === JSON.stringify(dep), 'neutralidade das âncoras: por seção, nº de p/li/h2–h5/table/figure/blockquote, tamanho do texto e IDs IDÊNTICOS sem o card');
      const comCard = await page.evaluate(() => {
        const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote', out = {};
        document.querySelectorAll('#tab-semio2 section[id]').forEach(s => { out[s.id] = s.querySelectorAll(SUB).length; });
        return out;
      });
      ok(Object.keys(antes).every(k => antes[k].n === comCard[k]), 'e COM o card: a contagem de nós de âncora não muda (o card só tem div/span/b/button/svg)');
      const pos = await page.evaluate(() => Array.from(document.querySelectorAll('.rm-audio-card')).map(c => ({ id: c.dataset.audioId, sec: c.closest('section').id, prev: c.previousElementSibling && c.previousElementSibling.tagName, ui: c.hasAttribute('data-rm-ui'), tags: Array.from(c.querySelectorAll('*')).map(e => e.tagName.toLowerCase()).filter((v, i, a) => a.indexOf(v) === i).sort().join() })));
      ok(pos.length === 2 && pos[0].sec === 's2-b01' && pos[1].sec === 's2-b03' && pos.every(p => p.prev === 'H2' && p.ui), 'um card em s2-b01 e outro em s2-b03, logo depois do título, com [data-rm-ui]', pos);
      ok(pos.every(p => !/\b(p|li|h[1-6]|table|figure|blockquote|a|img|audio|video)\b/.test(p.tags.replace(/,/g, ' '))), 'o card só usa div/span/b/button/svg/path', pos[0].tags);
      ok((await cardTxt(page, AID)) === 'Escuchar' && /Audiolibro · 1 min/.test(await page.locator(`.rm-audio-card[data-audio-id="${AID}"]`).textContent()), 'texto do card: «Escuchar», «Audiolibro · 1 min»', [await cardTxt(page, AID), await page.locator(`.rm-audio-card[data-audio-id="${AID}"]`).textContent()]);
      ok(media(S).length === 0 && S.ctr.sign === 0 && await page.evaluate(() => window.__m.audioCtor === 0 && window.__m.srcSets.length === 0), 'ZERO mídia antes do play: 0 pedidos ao Storage, 0 assinaturas, 0 elementos Audio, 0 `src`');
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await esperar(300); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      ok(media(S).length === 0 && S.ctr.sign === 0, 'rolar a página inteira também não pede mídia');
      ok(await page.evaluate(() => Array.from(document.querySelectorAll('#tab-semio2 audio')).every(a => a.paused && a.preload === 'none')) && S.log.filter(x => /\/assets\/audio\/semio2\//.test(x.p)).length === 0, 'os 6 sons de ausculta continuam preload=none e não foram tocados nem baixados');
      ok(S.ctr.manifest === 1 && S.log.filter(x => /rm-audio/.test(x.p)).length === 4 + 1, 'pedidos: 1 manifesto + boot + css + engine + store + provider (e nada mais)', S.log.filter(x => /rm-audio|functions/.test(x.p)).map(x => x.p));
      ok(erros.length === 0, 'sem erros de página', erros);
      await ctx.close();
    }

    sec('Reprodução REAL: play, velocidades, pausa, fechar, reiniciar');
    {
      S.zera(); S.ttl = 600000; S.banda = 0;
      const { ctx, page, erros } = await nova(S, 1024, 768, O);
      await boot(page);
      await card(page, AID).click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'), 'clique no card ⇒ estado playing (mídia real)');
      ok(S.ctr.sign === 1 && S.log.filter(x => x.p.indexOf('/get-audio-url') >= 0).length === 1, 'a URL é assinada 1× no play');
      ok(media(S).length >= 1 && media(S).every(x => /bytes=\d*-/.test(x.range)), 'o navegador pede o áudio por Range', media(S).map(x => x.range).slice(0, 3));
      ok(await page.evaluate(() => window.__m.audioCtor === 1 && /^https:\/\/127\.0\.0\.1:\d+\/storage\/v1\/object\/sign\/audiobooks\//.test(window.__m.audios[0].src)), 'um único elemento Audio; src = URL assinada do nosso bucket');
      const r0 = await real(page); await esperar(2300); const r1 = await real(page);
      ok(!r0.paused && r1.t - r0.t > 1.5 && r1.t < 6, 'o áudio REAL avança (currentTime ↑ ≈ 1× tempo real)', [r0.t, r1.t]);
      ok(await cardTxt(page, AID) === 'Pausar', 'o card mostra «Pausar»');
      const visivel = await page.evaluate(() => { const s = document.getElementById('rm-l2-player'), p = document.querySelector('.rm-audio'); return !s.hidden && p && !p.hidden && s.getAttribute('data-rm-audio') === 'open' && p.getAttribute('data-layout') === 'b1'; });
      ok(visivel, 'o player abre DENTRO do slot (slot visível, data-layout=b1)');
      for (const rate of [1.25, 1.5, 2, 2.5, 1]) {
        await page.selectOption('.rm-audio__rate', String(rate));
        const x = await real(page);
        ok(x.rate === rate && x.pp === true, `velocidade ${rate}× no elemento REAL (preservesPitch ligado)`, x.rate);
      }
      await page.selectOption('.rm-audio__rate', '2.5');
      const a0 = (await real(page)).t; await esperar(1500); const a1 = (await real(page)).t;
      ok(a1 - a0 > 3, 'a 2,5× o tempo avança ≈ 2,5× mais depressa', a1 - a0);
      /* pausa */
      await page.locator('.rm-audio__main').click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'paused'), 'pausar ⇒ paused');
      const p0 = (await real(page)).t; await esperar(900);
      ok(near((await real(page)).t, p0, 0.05) && (await real(page)).paused, 'pausado: a posição não anda');
      ok(await page.evaluate(() => !document.querySelector('.rm-audio').hidden), 'pausar MANTÉM o player aberto');
      ok(await cardTxt(page, AID) === 'Continuar', 'card ⇒ «Continuar»');
      /* fechar sem salto de rolagem */
      await page.evaluate(() => window.scrollTo({ top: 6000, behavior: 'instant' })); await esperar(200);   // bem abaixo do card: um foco sem preventScroll arrastaria a página até ele
      await page.locator('.rm-audio__main').click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      const y0 = await page.evaluate(() => window.scrollY);
      const pos0 = (await real(page)).t;
      await page.locator('.rm-audio__close').click();
      await esperar(1500);                                  // o site tem scroll-behavior:smooth: um salto indevido só aparece depois de algum tempo
      const f = await E(page), y1 = await page.evaluate(() => window.scrollY);
      ok(!f.open && (await real(page)).paused && f.state === 'paused', 'fechar: pausa e recolhe');
      ok(near(y1, y0, 1), 'fechar NÃO rola a página (sem salto até o card)', [y0, y1]);
      ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('rm-audio-card__btn')), 'o foco volta ao botão do card');
      ok(await page.evaluate(() => document.getElementById('rm-l2-player').hidden === true), 'o slot volta a hidden');
      ok(near(f.positions[AID + '@v1'], pos0, 2.5) && /^Continuar · \d+:\d\d$/.test(await cardTxt(page, AID)), 'a posição fica guardada e o card mostra «Continuar · m:ss»', [f.positions, await cardTxt(page, AID)]);
      /* reabrir continua do ponto */
      await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      ok(near((await real(page)).t, pos0, 3), 'reabrir/continuar volta ao ponto guardado', [(await real(page)).t, pos0]);
      ok(S.ctr.sign === 1, 'continuar reaproveita a URL (sem nova assinatura)', S.ctr.sign);
      /* reiniciar: 0 e pausado, sem autoplay */
      await page.locator('.rm-audio [data-a="restart"]').click(); await esperar(1200);
      const rs = await real(page), es = await E(page);
      ok(rs.paused && rs.t < 0.5 && es.state === 'paused', 'reiniciar: pausa e volta a 0, SEM autoplay (1,2 s depois continua parado)', rs);
      ok(erros.length === 0, 'sem erros de página', erros);
      await ctx.close();
    }

    sec('Busca de posição REAL (Range) e ±15 s');
    {
      S.zera();
      const { ctx, page } = await nova(S, 1024, 768, O);
      await boot(page);
      await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      await page.evaluate(() => window.RMAudioBoot._engine().pause());
      const n0 = S.ctr.mediaRange.length;
      await page.evaluate(() => { const s = document.querySelector('.rm-audio__seek'); s.value = '42'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
      await esperar(200);
      ok(near((await real(page)).t, 42, 0.6), 'arrastar a barra para 0:42 move o elemento REAL para ≈ 42 s', (await real(page)).t);
      await page.locator('.rm-audio__main').click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'); await esperar(1200);
      const t = (await real(page)).t;
      ok(t > 42 && t < 46, 'e toca a partir dali', t);
      const novos = S.ctr.mediaRange.slice(n0).filter(r => /bytes=(\d+)-/.test(r)).map(r => Number(/bytes=(\d+)-/.exec(r)[1]));
      ok(novos.length === 0 || novos.some(b => b > 100000) || (await real(page)).ready >= 3, 'a busca usa Range com offset > 0 (ou o trecho já estava em buffer)', S.ctr.mediaRange.slice(n0));
      await page.locator('.rm-audio [data-a="back"]').click(); await esperar(200);
      ok(near((await real(page)).t, t - 15 + 0.2, 1.5) || (await real(page)).t < t - 13, '−15 s', [t, (await real(page)).t]);
      await page.locator('.rm-audio [data-a="fwd"]').click(); await page.locator('.rm-audio [data-a="fwd"]').click(); await esperar(200);
      ok((await real(page)).t > t, '+15 s ×2 avança', (await real(page)).t);
      await page.evaluate(() => window.RMAudioBoot._engine().seek(9999)); await esperar(300);
      ok((await real(page)).t <= 60.05, 'limite superior = duração', (await real(page)).t);
      await page.evaluate(() => window.RMAudioBoot._engine().seek(-5)); await esperar(200);
      ok((await real(page)).t < 0.3, 'limite inferior = 0', (await real(page)).t);
      await ctx.close();
    }

    sec('Rede lenta REAL: carregando, pausa durante a espera, sem erro');
    {
      S.zera(); S.banda = 2500; S.latencia = 1800;          // 2,5 KB/s num mp3 de 8 KB/s (64 kbps) + 1,8 s até ao 1.º byte
      const { ctx, page, erros } = await nova(S, 1024, 768, O);
      await boot(page);
      await card(page, AID).click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'loading', null, 3000) && await cardTxt(page, AID) === 'Cargando…', 'durante a espera: estado loading e card «Cargando…»');
      ok(await page.locator(`.rm-audio-card[data-audio-id="${AID}"] .rm-audio-card__btn`).getAttribute('aria-busy') === 'true', 'aria-busy no botão');
      await esperar(2500);
      /* a banda é MENOR que o bitrate: o áudio engasga (waiting) e volta a loading */
      const visto = new Set(); for (let i = 0; i < 12; i++) { visto.add((await E(page)).state); await esperar(500); }
      ok(visto.has('loading') || visto.has('playing'), 'a conexão lenta passa por loading/playing sem erro', [...visto]);
      ok(!visto.has('error'), 'nenhum erro com rede lenta (o timeout de carga é de 15 s)');
      /* pausar a meio da espera */
      await page.locator('.rm-audio__main').click(); await esperar(300);
      ok((await E(page)).state === 'paused' && (await real(page)).paused, 'pausar durante a espera pausa de verdade');
      S.banda = 0; S.latencia = 0;
      await page.locator('.rm-audio__main').click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing', null, 10000), 'com a rede normal volta a tocar');
      ok(erros.length === 0, 'sem erros de página', erros);
      await ctx.close();
    }

    sec('Expiração da URL assinada e renovação SEM perder a posição');
    {
      S.zera(); S.ttl = 1500; S.banda = 6000;            // token vale 1,5 s; banda baixa ⇒ não há buffer à frente
      const { ctx, page, erros } = await nova(S, 1024, 768, O);
      await boot(page);
      await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing', null, 10000);
      ok(S.ctr.sign === 1, 'primeira assinatura');
      await esperar(2200);                                // o token expira
      S.banda = 0;
      await page.evaluate(() => window.RMAudioBoot._engine().seek(50));        // posição NÃO bufferizada ⇒ novo Range com o token vencido ⇒ 403
      const reau = await ate(page, () => window.RMAudioBoot._engine().getState().counters.reauthorizations >= 1, null, 12000);
      ok(reau, 'o 403 com o token vencido dispara 1 reautorização', await E(page));
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing', null, 10000), 'volta a tocar sozinho depois da renovação');
      const st = await E(page), r = await real(page);
      ok(st.counters.reauthorizations === 1 && S.ctr.sign === 2, 'exatamente 1 renovação (2 assinaturas no total)', [st.counters, S.ctr.sign]);
      ok(r.t > 49 && r.t < 56, 'a posição foi PRESERVADA: continua perto de 50 s (não voltou a 0)', r.t);
      ok(st.error === null && await page.evaluate(() => document.querySelector('.rm-audio__err').hidden), 'sem erro visível ao aluno');
      ok(erros.length === 0, 'sem erros de página', erros);
      await ctx.close(); S.ttl = 600000;
    }

    sec('Erros: kill switch no play, mídia inválida, e nova tentativa');
    {
      S.zera(); S.banda = 0;
      const { ctx, page, erros } = await nova(S, 1024, 768, O);
      await boot(page);
      S.falha.url = 1;                                     // servidor passa a negar (piloto desligado + deploy)
      await card(page, AID).click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'error'), 'URL negada ⇒ estado error');
      ok(await cardTxt(page, AID) === 'Reintentar' && await page.evaluate(() => { const e = document.querySelector('.rm-audio__err'); return !e.hidden && e.getAttribute('role') === 'alert'; }), 'card «Reintentar» e aviso role=alert');
      ok(await page.evaluate(() => window.__m.audioCtor === 0) && media(S).length === 0, 'nenhum elemento Audio criado e nenhuma mídia pedida');
      await card(page, AID).click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'), 'Reintentar ⇒ toca');
      await page.evaluate(() => window.RMAudioBoot._engine().close());
      /* mídia inválida (bytes que não são áudio) */
      S.lixo = true;
      await card(page, AID2).click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'error', null, 12000), 'mídia inválida ⇒ erro (sem laço de reautorizações)');
      ok((await E(page)).counters.reauthorizations <= 1, 'no máximo 1 reautorização', (await E(page)).counters);
      S.lixo = false;
      ok(erros.length === 0, 'sem erros de página', erros);
      await ctx.close();
    }

    sec('Recarregar a página: posição guardada no navegador, sem mídia antes do play');
    {
      S.zera(); S.banda = 0;
      const { ctx, page } = await nova(S, 1024, 768, O);
      await boot(page);
      await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      await page.evaluate(() => window.RMAudioBoot._engine().seek(23)); await page.evaluate(() => window.RMAudioBoot._engine().pause());
      ok(await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('rm.audio.pos.uid-jose.') === 0).join()) === 'rm.audio.pos.uid-jose.' + AID + '@v1', 'a posição está no localStorage (UID + audio_id@version)');
      ok(await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('rm.audio.') === 0).every(k => /^\d+(\.\d+)?$/.test(localStorage.getItem(k)))), 'os VALORES guardados são só um número (nada de URL/token/título)');
      await page.reload(); await page.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
      S.zera();
      await boot(page);
      ok(await cardTxt(page, AID) === 'Continuar · 0:23', 'após recarregar o card mostra «Continuar · 0:23»', await cardTxt(page, AID));
      ok(media(S).length === 0 && S.ctr.sign === 0 && await page.evaluate(() => window.__m.audioCtor === 0), 'recarregar e mostrar o ponto NÃO pede mídia nem assina URL');
      await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'); await esperar(500);
      ok(near((await real(page)).t, 23.5, 2.5), 'o play continua perto de 0:23', (await real(page)).t);
      /* outro aparelho/navegador: sem retomada */
      const ctx2 = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1024, height: 768 } }); const p2 = await ctx2.newPage();
      await p2.addInitScript(INSTR); await p2.goto(S.base + '/h'); await p2.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
      await boot(p2);
      ok(await cardTxt(p2, AID) === 'Escuchar', 'outro navegador/aparelho NÃO herda a posição (limite documentado: é local ao navegador)', await cardTxt(p2, AID));
      await ctx2.close();
      /* outra conta no mesmo navegador */
      await page.evaluate(() => { window.RMAudioBoot.stop(); window.__sess = { token: 'tok-jose', uid: 'uid-outra-conta' }; });
      await boot(page);
      ok(await cardTxt(page, AID) === 'Escuchar', 'outra conta no mesmo navegador não herda a posição');
      await ctx.close();
    }

    sec('Um áudio por vez: A→B, e arbitragem com a AUSCULTAÇÃO real');
    {
      S.zera(); S.banda = 0;
      const { ctx, page } = await nova(S, 1024, 768, O);
      await boot(page);
      await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'); await esperar(600);
      await card(page, AID2).click(); await ate(page, () => window.RMAudioBoot._engine().getState().audio_id === 's2-b03-epoc' && window.RMAudioBoot._engine().getState().state === 'playing', null, 10000);
      ok(await page.evaluate(() => window.__m.audioCtor === 1 && window.__m.audios.filter(a => !a.paused).length === 1), 'A→B: um só elemento Audio e só um a tocar');
      ok(await cardTxt(page, AID) !== 'Pausar' && await cardTxt(page, AID2) === 'Pausar', 'cards coerentes');
      ok((await E(page)).positions[AID + '@v1'] > 0, 'a posição de A foi guardada');
      /* ausculta nativa: tocar um som pausa o audiobook */
      const nat = '#tab-semio2 audio';
      await page.evaluate(sel => { const a = document.querySelector(sel); a.scrollIntoView({ block: 'center' }); }, nat);
      await page.evaluate(sel => document.querySelector(sel).play(), nat);
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'paused'), 'tocar a ausculta PAUSA o audiobook (sem fechá-lo)');
      ok(await page.evaluate(() => !document.querySelector('.rm-audio').hidden), '…e o player continua aberto');
      ok(await page.evaluate(sel => !document.querySelector(sel).paused, nat), 'a ausculta continua a tocar (o motor não a interrompe)');
      /* audiobook volta a tocar: a ausculta pára */
      await page.locator('.rm-audio__main').click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'), 'retomar o audiobook');
      ok(await page.evaluate(() => Array.from(document.querySelectorAll('#tab-semio2 audio')).every(a => a.paused)), 'e a ausculta PÁRA (nenhum som clínico a tocar junto)');
      ok(await page.evaluate(sel => document.querySelector(sel).loop === true, nat), 'a ausculta mantém as suas propriedades (loop) — não foi alterada');
      await ctx.close();
    }

    sec('Caneta armada: o player encolhe, NUNCA pausa, e a escrita não se desloca');
    {
      S.zera(); S.banda = 0;
      const { ctx, page } = await nova(S, 1024, 768, O);
      await boot(page);
      await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      const rects = () => page.evaluate(() => Array.from(document.querySelectorAll('#tab-semio2 #s2-b01 p')).slice(0, 6).map(p => { const r = p.getBoundingClientRect(); return [Math.round(r.left * 10), Math.round(r.top * 10 + window.scrollY * 10), Math.round(r.width * 10), Math.round(r.height * 10)]; }));
      await page.evaluate(() => { const p = document.querySelector('#tab-semio2 #s2-b01 p'); window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - 150, behavior: 'instant' }); }); await esperar(300);
      const r0 = await rects();
      const alt0 = await page.evaluate(() => document.querySelector('.rm-audio').offsetHeight);
      await page.evaluate(() => document.body.classList.add('rm2-t-pen'));       // o que o rm-tools-v2 faz ao armar a caneta
      await esperar(300);
      const alt1 = await page.evaluate(() => document.querySelector('.rm-audio').offsetHeight), est = await E(page);
      ok(await page.evaluate(() => document.getElementById('rm-l2-player').hasAttribute('data-rm-pen')), 'caneta armada ⇒ slot ganha data-rm-pen');
      ok(alt1 < alt0 && await page.evaluate(() => getComputedStyle(document.querySelector('.rm-audio__bar')).display === 'none'), 'o player encolhe (chip: sem barra/velocidade/±15)', [alt0, alt1]);
      ok(est.state === 'playing' && !(await real(page)).paused, 'o áudio NÃO é pausado pela caneta');
      ok(await page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue('--rm-player-h')) === document.querySelector('.rm-audio').offsetHeight), '--rm-player-h acompanha a altura nova');
      ok(JSON.stringify(await rects()) === JSON.stringify(r0), 'nenhum parágrafo mudou de retângulo ao encolher o player');
      /* traço de caneta (PointerEvents pointerType 'pen') por cima do conteúdo, a tocar */
      await page.evaluate(() => { const p = document.querySelector('#tab-semio2 #s2-b01 p'); window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - 150, behavior: 'instant' }); }); await esperar(300);
      const y0 = await page.evaluate(() => window.scrollY), t0 = (await real(page)).t, r00 = await rects();
      const res = await page.evaluate(async () => {
        const p = document.querySelector('#tab-semio2 #s2-b01 p'), r = p.getBoundingClientRect(), out = { prevented: 0, n: 0 };
        document.body.classList.add('rm2-pen-down');
        const fire = (type, x, y, buttons) => { const e = new PointerEvent(type, { pointerType: 'pen', pointerId: 77, isPrimary: true, clientX: x, clientY: y, buttons, bubbles: true, cancelable: true, pressure: buttons ? 0.5 : 0 }); p.dispatchEvent(e); out.n++; if (e.defaultPrevented) out.prevented++; };
        fire('pointerover', r.left + 60, r.top + 10, 0); fire('pointerdown', r.left + 60, r.top + 10, 1);
        for (let i = 1; i <= 20; i++) { fire('pointermove', r.left + 60 + i * 5, r.top + 10 + i * 2, 1); await new Promise(rs => setTimeout(rs, 20)); }
        fire('pointerup', r.left + 160, r.top + 50, 0);
        document.body.classList.remove('rm2-pen-down');
        return out;
      });
      await esperar(500);
      ok(res.n === 23 && res.prevented === 0, 'o traço de caneta chegou ao conteúdo sem nenhum preventDefault vindo do áudio', res);
      ok((await E(page)).state === 'playing' && (await real(page)).t > t0 + 0.3, 'durante e depois do traço o áudio continua a tocar');
      const y1 = await page.evaluate(() => window.scrollY), r1 = await rects();
      ok(near(y1, y0, 0.5) && JSON.stringify(r1) === JSON.stringify(r00), 'o traço não rolou nem deslocou a página', { y0, y1, r0: r00[0], r1: r1[0] });
      ok(await page.evaluate(() => window.__m.ptr.filter(t => /^(pointer|touch|mouse|gesture|wheel|scroll)/.test(t)).length === 0), 'o audiobook não registou NENHUM listener global de pointer/touch/mouse/gesture/wheel/scroll', await page.evaluate(() => window.__m.ptr));
      await page.evaluate(() => document.body.classList.remove('rm2-t-pen')); await esperar(300);
      ok(!(await page.evaluate(() => document.getElementById('rm-l2-player').hasAttribute('data-rm-pen'))) && (await page.evaluate(() => document.querySelector('.rm-audio').offsetHeight)) === alt0, 'caneta desarmada ⇒ o player volta ao tamanho normal');
      await ctx.close();
    }

    sec('Sair da matéria / logout / lateral: ciclo de vida');
    {
      S.zera();
      /* mudar a lateral enquanto toca (data-rm-dock) */
      { const { ctx, page } = await nova(S, 1760, 900, O);
        await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
        const m0 = await page.evaluate(() => document.querySelector('.rm-audio').getAttribute('data-mode'));
        await page.evaluate(() => { const H = document.documentElement; H.setAttribute('data-rm-dock', H.getAttribute('data-rm-dock') === 'side' ? 'bottom' : 'side'); }); await esperar(300);
        const m1 = await page.evaluate(() => document.querySelector('.rm-audio').getAttribute('data-mode'));
        ok(m0 !== m1 && (await E(page)).state === 'playing' && !(await real(page)).paused, 'mudar o dock (lateral aberta/minimizada) com o áudio a tocar: o player acompanha e o áudio NÃO é interrompido', [m0, m1]);
        await ctx.close(); }
      /* sair da matéria */
      { const { ctx, page } = await nova(S, 1024, 768, O);
        await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'); await esperar(800);
        await page.evaluate(() => { document.getElementById('tab-semio2').classList.remove('active'); document.getElementById('tab-outra').classList.add('active'); });
        ok(await ate(page, () => window.RMAudioBoot._estado() === null), 'trocar de matéria ⇒ o boot pára');
        ok((await real(page)).paused && await page.evaluate(() => document.querySelectorAll('.rm-audio, .rm-audio-card').length === 0), 'o áudio PARA e cards/player saem');
        ok(Number(await page.evaluate(() => localStorage.getItem('rm.audio.pos.uid-jose.s2-b01-motivo@v1'))) > 0.5, 'a posição foi guardada ao sair');
        ok(await page.evaluate(() => !document.getElementById('rm-l2-player').hasAttribute('data-rm-pen') && document.getElementById('rm-l2-player').hidden), 'slot devolvido ao estado do B1');
        await ctx.close(); }
      /* logout */
      { const { ctx, page } = await nova(S, 1024, 768, O);
        await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'); await esperar(600);
        await page.evaluate(() => window.__authCb('SIGNED_OUT'));
        ok(await ate(page, () => window.RMAudioBoot._estado() === null) && (await real(page)).paused && await page.evaluate(() => document.querySelectorAll('.rm-audio, .rm-audio-card').length === 0), 'SIGNED_OUT ⇒ pausa, guarda e remove tudo');
        await ctx.close(); }
      /* o Layout V2 se desfaz (slot some) */
      { const { ctx, page } = await nova(S, 1024, 768, O);
        await boot(page); await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
        await page.evaluate(() => window.RMLayout.detach());
        ok(await ate(page, () => window.RMAudioBoot._estado() === null) && (await real(page)).paused, 'o slot some (RMLayout.detach) ⇒ o boot pára e o áudio pára');
        ok((await boot(page, { semLayout: true })) === false, 'e sem Layout V2 não volta a arrancar');
        await ctx.close(); }
      /* stop/start repetidos não duplicam nada */
      { const { ctx, page } = await nova(S, 1024, 768, O);
        await boot(page); await page.evaluate(() => window.RMAudioBoot.stop()); await page.evaluate(() => window.RMAudioBoot.start()); await esperar(700);
        ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 2 && document.querySelectorAll('.rm-audio').length === 1), 'stop→start: 2 cards e 1 player (sem duplicar)');
        ok((await page.evaluate(() => window.RMAudioBoot.start())) === true && await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 2), 'start() repetido é idempotente');
        await ctx.close(); }
    }

    sec('Larguras 320/390/561/600/700/767/768/1024/1440/1700/1920 e zoom 200 %: sem overflow, sem cobrir');
    {
      S.zera();
      const cfg = [[320, 568, 1, 'm'], [390, 844, 1, 'm'], [561, 900, 1, 't'], [600, 900, 1, 't'], [700, 900, 1, 't'], [767, 1024, 1, 't'], [561, 520, 1, 't'], [600, 520, 1, 't'], [700, 520, 1, 't'], [767, 520, 1, 't'], [768, 1024, 1, 't'], [1024, 768, 1, ''], [1440, 900, 1, ''], [1700, 900, 1, ''], [1920, 1080, 1, ''], [720, 450, 2, 'zoom200 (1440 → 720 CSS px)'], [195, 422, 2, 'zoom200 (390 → 195 CSS px)']];
      for (const [w, h, dsf, rot] of cfg) {
        const { ctx, page } = await nova(S, w, h, Object.assign({ dsf, touch: rot === 'm' || rot === 't' }, O));
        await page.addStyleTag({ content: '#tab-semio2, #tab-semio2 * { content-visibility: visible !important; }' }); await esperar(300);   // content-visibility:auto esconde o overflow das seções fora do ecrã: força tudo visível, antes e depois
        const LISTA = () => page.evaluate(() => { const vw = document.documentElement.clientWidth, o = new Set(); document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width > 0 && r.right > vw + 0.5 && getComputedStyle(e).position !== 'fixed' && !e.closest('.rm-audio, .rm-audio-card, #rm-l2-player')) o.add(e.tagName + '.' + String(e.className).slice(0, 30)); }); return Array.from(o).sort(); });
        const base = await LISTA();      // linha de base SEM áudio (a matéria tem elementos largos em 320 px: pré-existente)
        await boot(page);
        await page.evaluate(() => { document.querySelector('#s2-b01').scrollIntoView({ block: 'start' }); });
        const g0 = await page.evaluate(() => { const c = document.querySelector('.rm-audio-card'), b = c.querySelector('button'), r = c.getBoundingClientRect(), rb = b.getBoundingClientRect(), H = document.documentElement; return { cl: r.left, cr: r.right, w: H.clientWidth, sw: H.scrollWidth, bh: rb.height, bw: rb.width }; });
        ok(g0.cl >= -0.5 && g0.cr <= g0.w + 0.5, `${w}px (dsf ${dsf}): o card cabe dentro do viewport`, g0);
        ok(g0.bh >= 43.5 && g0.bw >= 43.5, `${w}px: botão do card ≥ 44 px`, [g0.bw, g0.bh]);
        await card(page, AID).click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing', null, 10000);
        await esperar(300);
        const g = await page.evaluate(() => {
          const H = document.documentElement, p = document.querySelector('.rm-audio').getBoundingClientRect(), s = document.getElementById('rm-l2-player').getBoundingClientRect();
          const tools = document.getElementById('b1-tools').getBoundingClientRect(), side = document.getElementById('b1-side').getBoundingClientRect();
          const c = document.querySelector('#s2-b01').getBoundingClientRect();
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          const fim = document.querySelector('#tab-semio2 section:last-of-type, #tab-semio2 > *:last-child');
          const inter = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
          return { mode: document.querySelector('.rm-audio').getAttribute('data-mode'), dock: H.getAttribute('data-rm-dock'), p: { l: p.left, r: p.right, t: p.top, b: p.bottom, w: p.width, h: p.height }, vw: H.clientWidth, vh: innerHeight, sw: H.scrollWidth,
            coberturaTools: inter(p, tools), coberturaSide: side.width > 0 && inter(p, side), alvos: Array.from(document.querySelectorAll('.rm-audio button, .rm-audio select')).filter(b => { const r = b.getBoundingClientRect(); return !(r.width >= 43.5 && r.height >= 43.5); }).map(b => (b.getAttribute('aria-label') || b.className) + ':' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)), ph: H.style.getPropertyValue('--rm-player-h') };
        });
        ok(g.mode === (g.dock === 'side' ? 'lateral' : 'bottom'), `${w}px: modo ${g.mode} = dock ${g.dock} do B1`);
        const dep = await LISTA();
        ok(g.p.l >= -0.5 && g.p.r <= g.vw + 0.5 && g.p.b <= g.vh + 0.5, `${w}px: player dentro do viewport`, g.p);
        ok(dep.every(x => base.includes(x)), `${w}px: o áudio NÃO cria overflow: nenhum elemento NOVO ultrapassa a largura (a matéria já tinha ${base.length} tipos a 320 px ou menos)`, { novos: dep.filter(x => !base.includes(x)) });
        ok(await page.evaluate(() => Array.from(document.querySelectorAll('.rm-audio, .rm-audio *, .rm-audio-card, .rm-audio-card *')).every(e => { const r = e.getBoundingClientRect(); return r.width === 0 || r.right <= document.documentElement.clientWidth + 0.5; })), `${w}px: nada do card/player ultrapassa a largura`);
        ok(!g.coberturaSide, `${w}px: não cobre a lateral`);
        if (w > 560 && w < 768) {
          /* BLOCKER CONHECIDO DO LAYOUT (Claude 2, #425): DETECTAR e REPORTAR, nunca corrigir aqui nem aceitar em silêncio. */
          B1_BLOCKER.push({ w, h, dsf, cobre: g.coberturaTools, playerH: Math.round(g.p.h) });
          if (g.coberturaTools) console.log(`  ⚠ B1-BLOCKER (Claude 2 · #425): a ${w}×${h}px (dsf ${dsf}) o player inferior (${Math.round(g.p.h)} px) COBRE a toolbox. O audiobook não decide isso: o B1 só sobe a toolbox acima do player em ≤ 560 px.`);
          else console.log(`  ✔ ${w}×${h}px: a toolbox NÃO é coberta (B1 já corrigido nesta largura)`);
        } else ok(!g.coberturaTools, `${w}px: não cobre a toolbox`);
        ok(g.alvos.length === 0, `${w}px: controlos do player ≥ 44 px`, g.alvos);
        if (g.mode === 'bottom') {
          const fim = await page.evaluate(() => { const els = Array.from(document.querySelectorAll('#tab-semio2 section')); const u = els[els.length - 1].getBoundingClientRect().bottom; return { u, pt: document.querySelector('.rm-audio').getBoundingClientRect().top }; });
          ok(fim.u <= fim.pt + 1, `${w}px: com o fim da página à vista o player não o tapa`, fim);
        }
        await ctx.close();
      }
    }

    sec('RELATÓRIO · blocker conhecido do Layout V2 (561–767 px) — não é falha desta suíte');
    { const cob = B1_BLOCKER.filter(x => x.cobre);
      ok(B1_BLOCKER.length === 9, 'larguras 561/600/700/767 medidas em 2 alturas (900/1024 e 520) + 720×450 a zoom 200 %', B1_BLOCKER.map(x => x.w + '×' + x.h));
      console.log(cob.length ? `  ⚠ B1-BLOCKER ATIVO: player inferior cobre a toolbox em ${cob.map(x => x.w + '×' + x.h + 'px').join(', ')} (correção: #425 do Claude 2, em rm-layout.css; NÃO feita aqui)` : '  ✔ B1-BLOCKER NÃO reproduzido nas larguras 561–767'); }
    ok(true, '—');
  } catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
  await browser.close(); S.fechar();
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
