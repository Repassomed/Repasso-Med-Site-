/* CONTROLE DE NÃO ATIVAÇÃO — prova que, com o código desta integração e a configuração que existe HOJE, nenhuma matéria nova recebe layout nem caneta física.
   Usa o rm-pilot.js e a função get-pilot-flags.js SEM nenhuma alteração de teste (nem as CANDIDATAS), as 27 matérias reais abertas no harness, Supabase simulado.
   Cenários (a conta de teste está em TODAS as listas de UID — o pior caso para quem esquece de conferir a lista de matérias):
     E1  nenhuma variável de matéria (a situação de produção hoje): só o piloto recebe layout; as outras 26 NÃO montam nada e NÃO fazem nenhuma requisição ao servidor;
     E2  ninguém na lista de UID (kill switch geral): nem o piloto;
     E3  variável de matéria preenchida para UMA matéria, mas a matéria NÃO está nas CANDIDATAS do código ⇒ ela continua sem layout e sem requisição (a 1.ª fechadura segura mesmo com a 2.ª aberta);
     E4  estático: CANDIDATAS = só o piloto; nenhum curinga aceito no servidor; netlify.toml e o repositório não definem RM_LAYOUT_SLUGS/RM_VISUAL_SLUGS/RM_PEN_SLUGS/RM_PILOT_*;
   Em todos: pilotoPermitido() da caneta = false fora do piloto; grifos/notas/traços gravados intactos; 0 escrita no banco.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/nao-ativacao.test.cjs [--rapido]  (--rapido: 6 matérias) */
'use strict';
process.env.RM_ENSAIO_SEM = 'A7,C8';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const D = require('./lib-dados.cjs');
const FN = path.join(L.ROOT, 'netlify/functions/get-pilot-flags.js');
const PILOT_JS = fs.readFileSync(path.join(L.ROOT, 'assets/rm-pilot.js'), 'utf8');
const UID = D.UID, PIL = 'semiologia-ii';
const CANDIDATAS_ESPERADAS = ['semiologia-ii', 'medicina-familiar'];   // 1.ª fechadura: piloto + a matéria da primeira implantação controlada (que só PERGUNTA)
const PRIMEIRA = 'medicina-familiar';
const RAPIDO = process.argv.includes('--rapido');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };

async function servidor(env, slug) {
  for (const k of ['RM_PILOT_LAYOUT_UIDS', 'RM_PILOT_AUDIO_UIDS', 'RM_PILOT_PEN_UIDS', 'RM_PILOT_VISUAL_UIDS', 'RM_LAYOUT_SLUGS', 'RM_VISUAL_SLUGS', 'RM_PEN_SLUGS']) delete process.env[k];
  Object.assign(process.env, { SUPABASE_URL: 'https://x.invalid', SUPABASE_ANON_KEY: 'anon' }, env);
  global.fetch = require('../nova-era/fetch-sim.cjs').fetchLegado(UID);   // Nova Era: «slug na variável» é traduzido para a linha `preview` da tabela (ver fetch-sim.cjs)
  delete require.cache[FN];
  return require(FN).handler({ queryStringParameters: { slug }, headers: { authorization: 'Bearer tok' } });
}
const TODAS_UIDS = { RM_PILOT_LAYOUT_UIDS: UID, RM_PILOT_PEN_UIDS: UID, RM_PILOT_VISUAL_UIDS: UID, RM_PILOT_AUDIO_UIDS: UID };

async function matéria(br, base, m, env, rot) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage(); const pedidos = [], errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160))); await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.route('**/get-pilot-flags*', async r => { const slug = new URL(r.request().url()).searchParams.get('slug'); pedidos.push(slug); const resp = await servidor(env, slug); r.fulfill({ status: resp.statusCode, headers: resp.headers, body: resp.body }); });
  await page.route('**/assets/rm-pilot.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: PILOT_JS }));   // SEM nenhuma alteração
  await page.addInitScript(([s]) => { window.__RM_ENSAIO = { slug: s, modo: 'controle' }; }, [m.slug]);
  const url = `${base}/p.html?slug=${m.slug}&tab=${m.tab}&modo=controle&wait=1200&persist=1&pilotreal=1`;
  await page.goto(url, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(500);
  await page.evaluate(D.SEMEAR, { slug: m.slug, uid: UID, max: 4 });
  await page.goto(url); await page.waitForFunction('window.__ready===true'); await page.waitForTimeout(700);
  const ref = await page.evaluate(D.MEDIR);
  await page.addScriptTag({ url: '/assets/rm-pilot.js?v=nao-ativacao' }); await page.waitForTimeout(2200);
  const est = await page.evaluate(() => ({ layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band'), perm: window.RMToolsV2 && window.RMToolsV2._test ? window.RMToolsV2._test.pilotoPermitido() : null, pen: window.RMPilot ? window.RMPilot.penLiberada(window.__ens && window.__ens.slug) : null, cand: window.RMPilot ? window.RMPilot.candidatas() : null }));
  const dep = await page.evaluate(D.MEDIR); const dif = D.comparar(ref, dep, rot);
  await ctx.close();
  return { est, pedidos, dif, errs, ref };
}

(async () => {
  const rec = L.reconciliar(); let mats = rec.ativas;
  if (RAPIDO) mats = ['semiologia-ii', 'dermatologia', 'biologia', 'medicina-familiar', 'ortopedia', 'imagenologia'].map(s => rec.ativas.find(x => x.slug === s));
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();

  console.log(`\n▸ E1 · produção hoje: só listas de UID, NENHUMA variável de matéria — ${mats.length} matérias`);
  let aberto = [], reqFora = [], difs = 0, errsN = 0, penFora = [];
  for (const m of mats) {
    const r = await matéria(br, base, m, TODAS_UIDS, 'E1');
    if (m.slug === PIL) { ok(r.est.layout === true && r.pedidos.length === 1, 'piloto (Semiología II): continua recebendo layout, 1 requisição (comportamento de hoje preservado)', r); continue; }
    if (m.slug === PRIMEIRA) { ok(r.est.layout === false && r.pedidos.length === 1 && r.est.perm !== true && r.est.pen === false, 'Medicina Familiar (candidata, 2.ª fechadura FECHADA): pergunta 1 vez, o servidor nega, sem layout e sem caneta física', r); difs += r.dif.length; errsN += r.errs.length; continue; }
    if (r.est.layout) aberto.push(m.slug); if (r.pedidos.length) reqFora.push(m.slug); if (r.est.perm || r.est.pen) penFora.push(m.slug); difs += r.dif.length; errsN += r.errs.length;
  }
  ok(aberto.length === 0, `nenhuma das outras ${mats.length - 2 + (mats.some(x => x.slug === PRIMEIRA) ? 0 : 1)} matérias (fora piloto e Medicina Familiar) montou layout`, aberto);
  ok(reqFora.length === 0, 'nenhuma delas fez requisição ao servidor (CANDIDATAS fecha antes)', reqFora);
  ok(penFora.length === 0, 'caneta física (pilotoPermitido / penLiberada) = false em todas elas, mesmo com a conta fixa do código', penFora);
  ok(difs === 0 && errsN === 0, 'grifos, traços e notas gravados antes: idênticos em todas; 0 erros JS', { difs, errsN });

  console.log('\n▸ E2 · kill switch geral: nenhuma conta nas listas de UID');
  { const r = await matéria(br, base, rec.ativas.find(x => x.slug === PIL), {}, 'E2'); ok(r.est.layout === false, 'layout do piloto desligado', r.est); }

  console.log('\n▸ E3 · segunda fechadura aberta, primeira fechada (variável preenchida, matéria fora das CANDIDATAS)');
  for (const s of RAPIDO ? ['dermatologia', 'biologia'] : ['dermatologia', 'biologia', 'ortopedia']) {
    const r = await matéria(br, base, rec.ativas.find(x => x.slug === s), Object.assign({}, TODAS_UIDS, { RM_LAYOUT_SLUGS: s, RM_PEN_SLUGS: s, RM_VISUAL_SLUGS: s }), 'E3');
    ok(r.est.layout === false && r.pedidos.length === 0 && r.est.perm !== true, `${s}: sem layout, sem requisição, sem caneta física mesmo com a variável preenchida`, r);
    ok(r.dif.length === 0, `${s}: dados do aluno intactos`, r.dif.slice(0, 2));
  }

  console.log('\n▸ E4 · estático');
  { const cand = /var CANDIDATAS = \[([^\]]*)\]/.exec(PILOT_JS); ok(cand && cand[1].replace(/['"\s]/g, '').split(',').sort().join() === CANDIDATAS_ESPERADAS.slice().sort().join(), 'CANDIDATAS = piloto + Medicina Familiar (nada além)', cand && cand[1]);
    const fn = fs.readFileSync(FN, 'utf8'); const semComentarios = fn.replace(/\/\*[\s\S]*?\*\//g, ''); ok(!/['"]\*['"]|'todas'|'todos'/.test(semComentarios) && !/slugs\w*\.indexOf\('all'\)|slug === 'all'/.test(semComentarios), 'a função do servidor não aceita curinga (Nova Era: «all» existe só como estágio de UMA matéria, nunca como slug)');
    const toml = fs.readFileSync(path.join(L.ROOT, 'netlify.toml'), 'utf8'); ok(!/RM_(LAYOUT|VISUAL|PEN)_SLUGS|RM_PILOT_/.test(toml), 'netlify.toml não define nenhuma dessas variáveis');
    const todos = require('child_process').execSync(`grep -rIlE "RM_(LAYOUT|VISUAL|PEN)_SLUGS\\s*[=:]" "${L.ROOT}" --include=*.toml --include=*.json --include=*.env* --include=*.yml || true`).toString().trim(); ok(todos === '', 'nenhum arquivo de configuração do repositório atribui as variáveis de matéria', todos);
    for (const r of [ROLL_V2()]) ok(r.rollout === 'beta', `ROLLOUT da V2 continua 'beta' (${r.rollout})`); }

  await br.close(); srv.close();
  console.log(`\nnao-ativacao: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
  function ROLL_V2() { const t = fs.readFileSync(path.join(L.ROOT, 'assets/rm-tools-v2.js'), 'utf8'); return { rollout: (/var ROLLOUT = '(\w+)'/.exec(t) || [])[1] }; }
})().catch(e => { console.error(e); process.exit(2); });
