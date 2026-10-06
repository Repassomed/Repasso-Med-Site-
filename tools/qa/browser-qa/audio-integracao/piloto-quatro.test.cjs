#!/usr/bin/env node
/* QA do PILOTO FINAL (Semiología II, 4 audiolibros): manifesto com os 4 itens reais (ids/caminhos/blocos de PILOTO-SEMIO2-PAINEL.md), arquivo de ≈ 36,76 MB (o maior do piloto)
   servido com Range, funções REAIS atrás de um «Supabase» falso. Cobre: 4 cards nos blocos certos, tocar/pausar/barra/±15 s/velocidades num arquivo de 36,7 MB, celular 390×844 com toque,
   arbitragem com a ausculta REAL, outra conta/sem sessão sem nada, acesso direto ao bucket recusado, manifesto sem `path`. Chromium do Playwright não decodifica AAC: o áudio é mp3 do mesmo tamanho. */
'use strict';
const cp = require('child_process'), fs = require('fs'), path = require('path'), https = require('https');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { iniciar } = require('./server.cjs');
let okN = 0, koN = 0; const falhas = [];
const ok = (c, n, x) => { if (c) okN++; else { koN++; falhas.push(n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const ate = async (page, fn, arg, t) => { try { await page.waitForFunction(fn, arg, { timeout: t || 10000 }); return true; } catch (e) { return false; } };
const real = page => page.evaluate(() => { const a = window.__m.audios[0]; return a ? { t: a.currentTime, paused: a.paused, rate: a.playbackRate } : null; });
const ITENS = [   // os 4 itens como o manifesto_piloto.py os gera (b01 = hipótese respiratório; o vínculo real é decisão do José)
  { audio_id: 's2-b01-motivo-consulta', block_id: 's2-b01', theme: 'Motivo de consulta respiratorio', title: 'Audiobook · Motivo de consulta respiratorio', duration: 4594, order: 1, version: 'v1', path: 'semiologia-ii/s2-b01-motivo-consulta.m4a', ready: true },
  { audio_id: 's2-b03-epoc', block_id: 's2-b03', theme: 'Síndrome Obstructivo (Asma y EPOC)', title: 'Audiobook · Síndrome Obstructivo (Asma y EPOC)', duration: 2400, order: 3, version: 'v1', path: 'semiologia-ii/s2-b03-epoc.m4a', ready: true },
  { audio_id: 's2-b04-parenquimatoso', block_id: 's2-b04', theme: 'Síndrome Parenquimatoso (Condensación · Neumonía)', title: 'Audiobook · Síndrome Parenquimatoso (Condensación · Neumonía)', duration: 1200, order: 4, version: 'v1', path: 'semiologia-ii/s2-b04-parenquimatoso.m4a', ready: true },
  { audio_id: 's2-b05-pleural', block_id: 's2-b05', theme: 'Síndromes Pleurales (Derrame y Neumotórax)', title: 'Audiobook · Síndromes Pleurales (Derrame y Neumotórax)', duration: 1800, order: 5, version: 'v1', path: 'semiologia-ii/s2-b05-pleural.m4a', ready: true }
];

async function nova(S, w, h, o) {
  const ctx = await o.browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: w, height: h }, hasTouch: !!o.touch, isMobile: !!o.touch });
  const page = await ctx.newPage(); const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|403|404|net::/.test(m.text())) erros.push(m.text()); });
  await page.addInitScript(`(function(){window.__m={audios:[]};var A0=window.Audio;window.Audio=function(){var a=new (Function.prototype.bind.apply(A0,[null].concat([].slice.call(arguments))))();window.__m.audios.push(a);return a;};window.Audio.prototype=A0.prototype;})();`);
  await page.goto(S.base + '/h');
  await page.waitForFunction(() => document.querySelector('#tab-semio2 section[id]'));
  if (o.sessao !== undefined) await page.evaluate(s => { window.__sess = s; }, o.sessao);
  return { ctx, page, erros };
}
async function boot(page) {
  await page.evaluate(() => { window.RMLayout.attach(document.getElementById('tab-semio2')); });
  if (!(await page.evaluate(() => !!window.RMAudioBoot))) await page.addScriptTag({ url: '/assets/rm-audio-boot.js?v=t' });
  return page.evaluate(() => window.RMAudioBoot.start());
}
const card = (page, id) => page.locator(`.rm-audio-card[data-audio-id="${id}"] .rm-audio-card__btn`);

(async () => {
  const S = await iniciar();
  /* arquivo do tamanho do MAIOR do piloto (36.758.530 B): mp3 64 kb/s ≈ 8000 B/s ⇒ 4594 s */
  const grande = path.join(S.tmp, 'grande.mp3');
  const F = require('child_process').spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).stdout.trim() || 'ffmpeg';
  const r = cp.spawnSync(F, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=330:sample_rate=22050:duration=4594', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', grande], { encoding: 'utf8' });
  if (r.status !== 0) { console.log('ffmpeg: ' + r.stderr); process.exit(2); }
  S.midia.motivo = { file: grande, size: fs.statSync(grande).size, ext: 'mp3', dur: 4594 };
  S.manifesto = ITENS;
  console.log(`  arquivo de teste: ${S.midia.motivo.size} B (maior do piloto: 36.758.530 B)`);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const O = { browser };
  try {
    sec('4 cards, cada um no SEU bloco; nada antes do play');
    {
      const { ctx, page, erros } = await nova(S, 1024, 768, O); await boot(page);
      const pos = await page.evaluate(() => Array.from(document.querySelectorAll('.rm-audio-card')).map(c => ({ id: c.dataset.audioId, sec: c.closest('section').id })));
      ok(pos.length === 4 && ITENS.every(i => pos.some(p => p.id === i.audio_id && p.sec === i.block_id)), 'um card em cada um de s2-b01, s2-b03, s2-b04, s2-b05', pos);
      ok(!pos.some(p => p.sec === 's2-b06'), 'nenhum card em s2-b06 (cardíaco): o bloco do «Motivo de Consulta» é exclusivo (b01 OU b06)');
      ok(S.log.filter(x => x.p.indexOf('/storage/v1/') === 0).length === 0 && S.ctr.sign === 0, 'ZERO pedidos ao Storage antes do play (preload=none)');
      ok(erros.length === 0, 'sem erros de página', erros); await ctx.close();
    }

    sec('Tocar / pausar / barra / ±15 s / velocidades com arquivo de 36,7 MB (desktop)');
    {
      S.zera();
      const { ctx, page } = await nova(S, 1024, 768, O); await boot(page);
      await card(page, 's2-b01-motivo-consulta').click();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'), 'tocar ⇒ playing');
      const t0 = (await real(page)).t; await esperar(1800); const t1 = (await real(page)).t;
      ok(t1 - t0 > 1.2, 'o tempo avança', [t0, t1]);
      await page.locator('.rm-audio__main').click(); ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'paused'), 'pausar ⇒ paused');
      const n0 = S.ctr.mediaRange.length;
      await page.evaluate(() => { const s = document.querySelector('.rm-audio__seek'); s.value = '2300'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
      await esperar(500);
      const tm = (await real(page)).t;
      ok(Math.abs(tm - 2300) < 2, 'arrastar a barra para o MEIO (38:20) move o áudio para ≈ 2300 s', tm);
      await page.locator('.rm-audio__main').click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'); await esperar(1500);
      const offs = S.ctr.mediaRange.slice(n0).map(x => /bytes=(\d+)-/.exec(x)).filter(Boolean).map(m => Number(m[1]));
      ok(offs.some(b => b > 15e6 && b < 22e6), 'a busca ao meio pede Range com offset ≈ metade do arquivo (≈ 18 MB), sem baixar o resto', offs);
      await page.locator('.rm-audio [data-a="back"]').click(); await esperar(250);
      const tb = (await real(page)).t; ok(tb < tm + 1.5 - 13, '−15 s', [tm, tb]);
      await page.locator('.rm-audio [data-a="fwd"]').click(); await esperar(250); ok((await real(page)).t > tb + 10, '+15 s', [tb, (await real(page)).t]);
      for (const rate of [1.25, 1.5, 2, 2.5, 1]) { await page.selectOption('.rm-audio__rate', String(rate)); ok((await real(page)).rate === rate, `velocidade ${rate}×`); }
      await ctx.close();
    }

    sec('Celular 390×844 com toque: cards visíveis, tocar, sem overflow');
    {
      S.zera();
      const { ctx, page } = await nova(S, 390, 844, { browser, touch: true }); await boot(page);
      const c = card(page, 's2-b03-epoc'); await c.scrollIntoViewIfNeeded(); await c.tap();
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing'), 'toque no card ⇒ playing no celular');
      const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      ok(ov.sw <= ov.iw + 1, 'sem rolagem horizontal a 390 px', ov);
      ok(await page.evaluate(() => { const p = document.querySelector('.rm-audio'); const r = p.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 1; }), 'o player cabe na largura do celular');
      await ctx.close();
    }

    sec('Arbitragem com a AUSCULTAÇÃO real (os 6 sons não são alterados)');
    {
      S.zera();
      const { ctx, page } = await nova(S, 1024, 768, O); await boot(page);
      await card(page, 's2-b04-parenquimatoso').click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      const nat = '#tab-semio2 audio';
      await page.evaluate(sel => { const a = document.querySelector(sel); a.scrollIntoView({ block: 'center' }); return a.play(); }, nat);
      ok(await ate(page, () => window.RMAudioBoot._engine().getState().state === 'paused'), 'tocar uma ausculta PAUSA o audiolibro');
      await page.locator('.rm-audio__main').click(); await ate(page, () => window.RMAudioBoot._engine().getState().state === 'playing');
      ok(await page.evaluate(() => Array.from(document.querySelectorAll('#tab-semio2 audio')).every(a => a.paused)), 'voltar ao audiolibro PARA a ausculta');
      ok(await page.evaluate(sel => document.querySelector(sel).loop === true && document.querySelector(sel).preload === 'none', nat), 'a ausculta mantém loop e preload=none (intacta)');
      await ctx.close();
    }

    sec('Outra conta, sem sessão e token falso: NADA; manifesto sem `path`/URL/bucket');
    {
      for (const [nome, sessao] of [['outra conta', { token: 'tok-outro', uid: 'uid-outro' }], ['sem sessão', null], ['token falso', { token: 'tok-falso', uid: 'x' }]]) {
        S.zera(); const { ctx, page } = await nova(S, 1024, 768, { browser, sessao }); await boot(page);
        ok(await page.evaluate(() => document.querySelectorAll('.rm-audio-card').length === 0), `${nome}: nenhum card`);
        ok(S.ctr.sign === 0 && S.log.filter(x => x.p.indexOf('/storage/v1/') === 0).length === 0, `${nome}: nenhuma URL assinada nem acesso ao Storage`); await ctx.close();
      }
      S.zera(); const { ctx, page } = await nova(S, 1024, 768, O); await boot(page);
      const corpo = await page.evaluate(async () => { const s = window.__sess || {}; const r = await fetch('/.netlify/functions/get-audio-manifest?slug=semiologia-ii', { headers: { Authorization: 'Bearer ' + (s.token || 'tok-jose') } }); return r.text(); });
      ok(!/path|storage|bucket|https?:|token|\.m4a/i.test(corpo) && JSON.parse(corpo).items.length === 4, 'o manifesto entregue ao navegador tem os 4 itens e NENHUM caminho/URL/bucket/token', corpo.slice(0, 160));
      ok(Object.keys(JSON.parse(corpo).items[0]).sort().join() === 'audio_id,block_id,duration,order,subject_slug,theme,title,version', 'só os 8 campos públicos');
      await ctx.close();
    }

    sec('Acesso direto ao bucket RECUSADO (simulação do Storage privado)');
    {
      /* cliente HTTPS só para o servidor local autoassinado (127.0.0.1): a verificação é relaxada apenas neste agente, não no processo */
      const agente = new https.Agent({ rejectUnauthorized: false });
      const get = (u, h) => new Promise((res, rej) => { https.get(S.base + u, { agent: agente, headers: h || {} }, r => { r.resume(); r.on('end', () => res(r.statusCode)); }).on('error', rej); });
      const caminho = '/storage/v1/object/%s/audiobooks/semiologia-ii/s2-b03-epoc.m4a';
      ok(await get(caminho.replace('%s', 'public')) === 404, 'URL pública do objeto: recusada (bucket privado)');
      ok(await get(caminho.replace('%s', 'sign')) === 403 && await get(caminho.replace('%s', 'sign') + '?token=forjado') === 403, 'URL assinada sem token / com token forjado: 403');
      ok(await get(caminho.replace('%s', 'authenticated'), { Authorization: 'Bearer anon' }) === 404, 'rota autenticada com a chave anônima: recusada');
      S.ttl = 1; const { ctx, page } = await nova(S, 1024, 768, O); await boot(page);
      await card(page, 's2-b05-pleural').click(); await esperar(1500);
      const url = await page.evaluate(() => window.__m.audios[0] && window.__m.audios[0].src);
      await esperar(50); ok(!!url && await get(url.replace(/^https:\/\/127\.0\.0\.1:\d+/, '')) === 403, 'a URL assinada EXPIRADA é recusada (403)'); S.ttl = 600000;
      await ctx.close();
    }
  } catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
  finally { await browser.close(); S.fechar(); }
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
})();
