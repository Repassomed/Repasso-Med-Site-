/* AUDITORIA INDEPENDENTE · IMPLANTAÇÃO PÚBLICA POR MATÉRIA (Medicina Familiar) — teste privado de José → liberação para os alunos da matéria → caneta na matéria → volta.
   NÃO altera código do site: carrega o get-pilot-flags.js REAL e o rm-pilot.js REAL da árvore em que roda, com Supabase simulado e zero rede externa.
   Como o mecanismo de «liberação para alunos» pode ter variáveis novas, elas entram por parâmetro (nada é adivinhado):
     --publico  NOME=valor[,NOME2=valor2]   variáveis que LIBERAM O LAYOUT aos alunos da matéria (ex.: RM_LAYOUT_PUBLIC_SLUGS=medicina-familiar)
     --pen-publico NOME=valor[,…]           variáveis que liberam a CANETA aos alunos da matéria
     --slug medicina-familiar               matéria sob teste (padrão)
     --base <ref>                           ref do git para listar os arquivos alterados (padrão origin/main); --head <ref> (padrão HEAD)
     --so-servidor                          pula as fases no navegador
   Fases: S0 padrão · S1 teste privado de José · S2 liberação aos alunos · S3 caneta · S4 volta · S5 curinga/fail-closed/sem escrita · G arquivos alterados · B navegador com dados.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/auditoria-implantacao-publica.test.cjs [--publico …] [--pen-publico …] */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : (process.argv[i + 1] || ''); };
const par = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const k = x.indexOf('='); return [x.slice(0, k), x.slice(k + 1)]; }));
const SLUG = arg('--slug') || 'medicina-familiar', PUB = par(arg('--publico')), PENPUB = par(arg('--pen-publico')), SO = process.argv.includes('--so-servidor');
const ROOT = path.resolve(__dirname, '../../../Repasso-Med-Site--main/Atual - Copia');
const REPO = path.resolve(__dirname, '../../..');
const FN = path.join(ROOT, 'netlify/functions/get-pilot-flags.js');
const JOSE = 'aaaaaaaa-0000-4000-8000-0000000000a1', ALUNO = 'bbbbbbbb-0000-4000-8000-0000000000b2', ALUNO2 = 'cccccccc-0000-4000-8000-0000000000c3';
const TOK = { 'tok-jose': JOSE, 'tok-aluno': ALUNO, 'tok-aluno2': ALUNO2 };
const VARS = ['RM_PILOT_LAYOUT_UIDS', 'RM_PILOT_AUDIO_UIDS', 'RM_PILOT_PEN_UIDS', 'RM_PILOT_VISUAL_UIDS', 'RM_LAYOUT_SLUGS', 'RM_VISUAL_SLUGS', 'RM_PEN_SLUGS'];
let n = 0, ko = 0; const falhas = [];
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; falhas.push(m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);

/* ---------- o servidor REAL, ambiente por cena, Supabase simulado; registra TODA chamada de rede ---------- */
const CHAMADAS = [];
async function srv(env, token, slug) {
  const lim = new Set([...VARS, ...Object.keys(PUB), ...Object.keys(PENPUB)]);
  for (const k of lim) delete process.env[k];
  Object.assign(process.env, { SUPABASE_URL: 'https://x.invalid', SUPABASE_ANON_KEY: 'anon' }, env);
  global.fetch = async (u, o) => { CHAMADAS.push({ u: String(u), m: (o && o.method) || 'GET' }); const t = String(((o && o.headers) || {}).Authorization || '').replace(/^Bearer\s+/i, ''); return TOK[t] ? { ok: true, json: async () => ({ id: TOK[t] }) } : { ok: false, json: async () => ({}) }; };
  delete require.cache[FN];
  const r = await require(FN).handler({ queryStringParameters: { slug }, headers: token ? { authorization: 'Bearer ' + token } : {} });
  return { raw: r, j: JSON.parse(r.body) };
}
const f = o => ({ layout: !!o.j.layout, pen: !!o.j.pen, audio: !!o.j.audio, visual: !!o.j.visual });
const NEG = { layout: false, pen: false, audio: false, visual: false };
const ig = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const PRIV = { RM_PILOT_LAYOUT_UIDS: JOSE, RM_LAYOUT_SLUGS: SLUG };                       // teste privado: só a conta de José, só a matéria
const PRIVPEN = Object.assign({}, PRIV, { RM_PILOT_PEN_UIDS: JOSE, RM_PEN_SLUGS: SLUG });
const ENV_PUB = Object.assign({}, PRIV, PUB), ENV_PEN = Object.assign({}, ENV_PUB, PENPUB);

async function servidor() {
  const OUTRAS = ['dermatologia', 'biologia', 'semiologia-ii', 'anatomia-i'];
  sec('S0 · padrão de produção (nenhuma variável): ninguém recebe nada, em nenhuma matéria');
  for (const [q, t] of [['José', 'tok-jose'], ['aluno', 'tok-aluno'], ['anônimo', null]]) {
    const o = await srv({}, t, SLUG); ok(ig(f(o), NEG), `${q} em ${SLUG}: tudo negado`, f(o)); }
  const neg0 = (await srv({}, 'tok-aluno', SLUG)).raw.body; const negX = (await srv({}, 'tok-aluno', 'dermatologia')).raw.body;
  ok(neg0 === negX, 'corpo da negação idêntico em matérias diferentes (não revela nada)', { neg0, negX });

  sec('S1 · TESTE PRIVADO de José: só a conta dele, só ' + SLUG);
  { const j = await srv(PRIV, 'tok-jose', SLUG), a = await srv(PRIV, 'tok-aluno', SLUG), an = await srv(PRIV, null, SLUG);
    ok(j.j.layout === true, 'José recebe o layout em ' + SLUG, f(j)); ok(j.j.pen === false, 'José NÃO recebe a caneta (outra chave)', f(j));
    ok(ig(f(a), NEG), 'um aluno comum NÃO recebe nada', f(a)); ok(ig(f(an), NEG), 'anônimo não recebe nada', f(an));
    for (const o of OUTRAS) { const r = await srv(PRIV, 'tok-jose', o), base = await srv({ RM_PILOT_LAYOUT_UIDS: JOSE }, 'tok-jose', o);
      ok(ig(f(r), f(base)), `${o}: igual ao padrão (a variável de ${SLUG} não muda mais nenhuma matéria)`, { com: f(r), sem: f(base) }); } }

  sec('S2 · LIBERAÇÃO AOS ALUNOS da matéria' + (Object.keys(PUB).length ? ' (' + Object.keys(PUB).join(', ') + ')' : ' — modo público NÃO configurado (nenhum --publico)'));
  if (Object.keys(PUB).length) {
    const a = await srv(ENV_PUB, 'tok-aluno', SLUG), a2 = await srv(ENV_PUB, 'tok-aluno2', SLUG), j = await srv(ENV_PUB, 'tok-jose', SLUG), an = await srv(ENV_PUB, null, SLUG);
    ok(a.j.layout === true && a2.j.layout === true, 'dois alunos distintos (fora de qualquer lista de contas) recebem o layout em ' + SLUG, [f(a), f(a2)]);
    ok(a.j.pen === false && a2.j.pen === false, 'liberar o layout NÃO libera a caneta aos alunos', [f(a), f(a2)]);
    ok(a.j.audio === false && a.j.visual === false, 'áudio e tema visual continuam negados aos alunos', f(a));
    ok(ig(f(an), NEG), 'anônimo (sem sessão) continua negado', f(an));
    ok(j.j.layout === true, 'José continua com o layout', f(j));
    for (const o of OUTRAS) { const r = await srv(ENV_PUB, 'tok-aluno', o); ok(ig(f(r), NEG), `aluno em ${o}: negado (a liberação é só da matéria)`, f(r)); }
    const v = await srv(ENV_PUB, 'tok-aluno', 'semiologia-ii'); ok(ig(f(v), NEG), 'aluno em semiologia-ii (matéria do piloto): continua negado', f(v));
    ok(Object.keys(a.j).sort().join() === 'audio,layout,pen,slug,visual', 'corpo com as mesmas 5 chaves (sem campo novo que vaze informação)', Object.keys(a.j));
  } else ok(true, '(sem --publico: nada a verificar; o resultado S1 vale como único modo de liberação existente)');

  sec('S3 · CANETA na matéria' + (Object.keys(PENPUB).length ? ' (' + Object.keys(PENPUB).join(', ') + ')' : ' — modo público de caneta NÃO configurado'));
  { const j = await srv(PRIVPEN, 'tok-jose', SLUG), a = await srv(PRIVPEN, 'tok-aluno', SLUG);
    ok(j.j.pen === true && j.j.layout === true, 'privado: José recebe layout + caneta em ' + SLUG, f(j)); ok(a.j.pen === false, 'privado: aluno não recebe caneta', f(a));
    ok(ig(f(await srv(PRIVPEN, 'tok-jose', 'dermatologia')), f(await srv({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_PEN_UIDS: JOSE }, 'tok-jose', 'dermatologia'))), 'caneta de ' + SLUG + ' não vaza para dermatologia'); }
  if (Object.keys(PENPUB).length) {
    const a = await srv(ENV_PEN, 'tok-aluno', SLUG); ok(a.j.layout === true && a.j.pen === true, 'alunos recebem layout + caneta em ' + SLUG, f(a));
    for (const o of OUTRAS) { const r = await srv(ENV_PEN, 'tok-aluno', o); ok(r.j.pen === false && r.j.layout === false, `aluno em ${o}: sem layout e sem caneta`, f(r)); }
    const so = await srv(Object.assign({}, ENV_PUB), 'tok-aluno', SLUG); ok(so.j.pen === false, 'sem a chave da caneta o aluno fica só com o layout (caneta é um passo à parte)', f(so)); }

  sec('S4 · VOLTA: retirar as variáveis da matéria devolve exatamente o padrão');
  { for (const [nome, env] of [['tirar o slug de layout/caneta', { RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_PEN_UIDS: JOSE }], ['esvaziar tudo', {}]]) {
      const todos = [];
      for (const t of ['tok-jose', 'tok-aluno', null]) todos.push(f(await srv(env, t, SLUG)));
      ok(todos.every(x => ig(x, NEG)), `${nome}: ${SLUG} volta a negar para José, aluno e anônimo`, todos); } }

  sec('S5 · curinga, fail-closed e ausência de escrita');
  for (const cur of ['*', 'todas', 'all', 'true', '1']) { const r = await srv({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_LAYOUT_SLUGS: cur }, 'tok-jose', SLUG); ok(r.j.layout === false, `curinga «${cur}» em RM_LAYOUT_SLUGS não libera ${SLUG}`, f(r)); }
  { const r = await srv(ENV_PUB, 'tok-invalido', SLUG); ok(ig(f(r), NEG), 'token inválido: negado (fail-closed)', f(r)); }
  { global.fetch = async () => { throw new Error('rede'); }; delete require.cache[FN]; const r = await require(FN).handler({ queryStringParameters: { slug: SLUG }, headers: { authorization: 'Bearer tok-aluno' } }); ok(r.statusCode === 200 && ig(f({ j: JSON.parse(r.body) }), NEG), 'Supabase fora do ar: HTTP 200 e tudo negado', r); }
  { const r = await srv(ENV_PUB, 'tok-aluno', '../../etc/passwd'); ok(ig(f(r), NEG), 'slug malformado: negado', f(r)); }
  { CHAMADAS.length = 0; await srv(ENV_PEN, 'tok-aluno', SLUG); await srv(ENV_PEN, 'tok-jose', SLUG);
    ok(CHAMADAS.length > 0 && CHAMADAS.every(c => /\/auth\/v1\/user$/.test(c.u) && c.m === 'GET'), 'a função só lê (GET /auth/v1/user): nenhuma escrita em lugar nenhum', CHAMADAS.slice(0, 4)); }
}

function arquivos() {
  sec('G · arquivos alterados (somente leitura do git) — a implantação não pode tocar conteúdo, outras matérias, painel nem tasks');
  const base = arg('--base') || 'origin/main', head = arg('--head') || 'HEAD';
  let ls = [];
  try { ls = cp.execFileSync('git', ['diff', '--name-only', base + '...' + head], { cwd: REPO }).toString().split('\n').filter(Boolean); } catch (e) { ok(false, 'git diff ' + base + '...' + head + ' falhou', String(e.message).slice(0, 80)); return; }
  console.log('    ' + ls.length + ' arquivo(s) alterado(s)');
  const PROIBIDO = [[/materias-privadas\/(?!medicina-familiar\.html)/, 'HTML de OUTRA matéria'], [/^coordination\/painel\//, 'painel'], [/^coordination\/tasks\.json$/, 'tasks.json'], [/^\.github\/workflows\//, 'workflow'], [/netlify\.toml$/, 'netlify.toml'],
    [/create-checkout|infinitepay|admin\.html/, 'pagamento/admin'], [/get-materia\.js$/, 'entrega de matérias']];
  for (const [re, nome] of PROIBIDO) { const h = ls.filter(x => re.test(x)); ok(h.length === 0, 'não toca: ' + nome, h.slice(0, 3)); }
  const mf = ls.filter(x => /materias-privadas\/medicina-familiar\.html$/.test(x));
  ok(mf.length === 0, 'não altera o conteúdo de medicina-familiar.html (liberar ≠ editar)', mf);
  /* CANDIDATAS e versão do cache */
  const pil = fs.readFileSync(path.join(ROOT, 'assets/rm-pilot.js'), 'utf8'), idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const cand = (pil.match(/var CANDIDATAS = \[([^\]]*)\]/) || [])[1]; const slugs = (cand || '').split(',').map(s => s.replace(/['"\s]/g, '')).filter(Boolean);
  ok(slugs.every(s => ['semiologia-ii', 'medicina-familiar'].includes(s)), 'CANDIDATAS só tem semiologia-ii e medicina-familiar', slugs);
  const ver = (pil.match(/var VER\s*=\s*'(\d+)'/) || [])[1], tag = (idx.match(/rm-pilot\.js\?v=(\d+)/) || [])[1];
  ok(ver && tag && ver === tag, 'VER do rm-pilot.js = tag do index.html (cache de 7 dias invalida junto)', { ver, tag });
  let verBase = null; try { const b = cp.execFileSync('git', ['show', base + ':Repasso-Med-Site--main/Atual - Copia/assets/rm-pilot.js'], { cwd: REPO }).toString(); verBase = (b.match(/var VER\s*=\s*'(\d+)'/) || [])[1]; } catch (e) { /* sem base */ }
  if (verBase && ls.some(x => /assets\/rm-(pilot|layout|tools-v2|modes|materia-sistema|nav)/.test(x))) ok(+ver > +verBase, 'houve mudança de módulo: a versão de cache SOBE (' + verBase + ' → ' + ver + ')', { ver, verBase });
  /* nenhuma variável nova com valor no repositório; nenhum UID literal */
  const dif = (() => { try { return cp.execFileSync('git', ['diff', base + '...' + head, '--', '.'], { cwd: REPO, maxBuffer: 1 << 28 }).toString(); } catch (e) { return ''; } })();
  const add = dif.split('\n').filter(l => /^\+[^+]/.test(l));
  ok(!add.some(l => /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(l) && !/aaaaaaaa-0000|bbbbbbbb-0000|cccccccc-0000|d4d215d3-36dd/.test(l)), 'nenhum UID real adicionado ao repositório');
  ok(!add.some(l => /(RM_[A-Z_]*(SLUGS|UIDS))\s*[:=]\s*['"]?[a-z0-9-]{3,}/i.test(l) && !/^\+\s*(\/\/|\*|#)/.test(l) && /(process\.env|netlify\.toml|\.env)/.test(l)), 'nenhum valor de variável de ambiente gravado no código');
}

async function navegador() {
  const { chromium } = require('playwright');
  const L = require('../ensaio-layout/lib.cjs'), D = require('./lib-dados.cjs');
  const PILOT_JS = fs.readFileSync(path.join(ROOT, 'assets/rm-pilot.js'), 'utf8');
  const rec = L.reconciliar(); const M = s => rec.ativas.find(x => x.slug === s);
  const s0 = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + s0.address().port; const br = await chromium.launch();
  let LARG = 1440;
  async function cena(m, env, tok, rot, esperaLayout, esperaPen) {
    const ctx = await br.newContext({ viewport: { width: LARG, height: LARG < 600 ? 844 : 900 } }); const page = await ctx.newPage(); const pedidos = [], errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); pedidos.push(sl); const o = await srv(env, tok, sl); await r.fulfill({ status: 200, contentType: 'application/json', headers: o.raw.headers, body: o.raw.body }); });
    await page.route('**/assets/rm-pilot.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: PILOT_JS }));
    await page.addInitScript(([slug]) => { window.__RM_ENSAIO = { slug, modo: 'controle' }; }, [m.slug]);
    const url = `${base}/p.html?slug=${m.slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1`;
    const carregar = async () => { await page.goto(url, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(600); };
    try {
      await carregar(); await page.evaluate(D.SEMEAR, { slug: m.slug, uid: D.UID, max: 6 }); await carregar();
      const ref = await page.evaluate(D.MEDIR);
      await page.addScriptTag({ url: '/assets/rm-pilot.js?v=teste' }); await page.waitForTimeout(2500);
      const r = await page.evaluate(() => ({ layout: !!document.querySelector('.rm-l2, #rm-l2-side, .rm-l2-band') || document.documentElement.classList.contains('rm-l2'), pen: window.RMPilot && window.RMPilot.penLiberada ? !!window.RMPilot.penLiberada(window.__RM_ENSAIO.slug) : null }));
      const dep = await page.evaluate(D.MEDIR); const dif = D.comparar(ref, dep, rot).filter(x => x.tipo !== 'erro-js');
      ok(r.layout === esperaLayout, `${rot}: layout ${esperaLayout ? 'montado' : 'NÃO montado'}`, { r, pedidos });
      if (esperaPen !== undefined && r.pen !== null) ok(r.pen === esperaPen, `${rot}: caneta física ${esperaPen ? 'liberada' : 'NÃO liberada'}`, r);
      ok(ref.grifos.length > 0 && ref.tracos.length > 0 && dif.length === 0, `${rot}: ${ref.grifos.length} grifos, ${ref.tracos.length} traços, ${ref.notas.length} nota(s) idênticos antes/depois e 0 escritas no banco`, dif.slice(0, 3));
      ok(errs.length === 0, `${rot}: 0 erros JS`, errs);
      return { r, pedidos, ref, page, carregar };
    } finally { await ctx.close(); }
  }
  for (const W of [1440, 390]) {
    LARG = W; const t = `[${W}px] `, m = M(SLUG);
    sec(t + 'B0 · padrão'); await cena(m, {}, 'tok-aluno', t + 'aluno, padrão', false, false);
    sec(t + 'B1 · teste privado'); await cena(m, PRIV, 'tok-jose', t + 'José, privado', true, false); await cena(m, PRIV, 'tok-aluno', t + 'aluno, privado', false, false);
    if (Object.keys(PUB).length) { sec(t + 'B2 · liberação aos alunos'); await cena(m, ENV_PUB, 'tok-aluno', t + 'aluno, liberado', true, false); await cena(m, ENV_PUB, null, t + 'anônimo, liberado', false, false); }
    if (Object.keys(PENPUB).length) { sec(t + 'B3 · caneta'); await cena(m, ENV_PEN, 'tok-aluno', t + 'aluno, layout+caneta', true, true); }
    sec(t + 'B4 · volta'); await cena(m, {}, 'tok-aluno', t + 'aluno, depois da volta', false, false);
    sec(t + 'B5 · vizinhas com a matéria liberada');
    for (const v of ['dermatologia', 'biologia']) { const o = await cena(M(v), Object.keys(PEN_OU()).length ? ENV_PEN : ENV_PUB, 'tok-aluno', t + v + ' (aluno)', false, false); ok(o.pedidos.length === 0, v + ': nenhuma requisição ao servidor (fora das CANDIDATAS)', o.pedidos); }
  }
  await br.close(); s0.close();
}
const PEN_OU = () => PENPUB;

(async () => {
  await servidor(); arquivos(); if (!SO) await navegador();
  console.log(`\nauditoria-implantacao-publica (${SLUG}): ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHA(S)' : ''}`);
  if (ko) console.log('Falhas:\n - ' + falhas.join('\n - '));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
