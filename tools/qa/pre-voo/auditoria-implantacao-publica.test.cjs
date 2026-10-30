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
const SLUG = arg('--slug') || 'medicina-familiar', SO = process.argv.includes('--so-servidor');
/* Sem --publico/--pen-publico, os cenários públicos NÃO são pulados: rodam com as únicas variáveis que a main conhece (lista de matérias + lista de contas). Como a main não tem modo «todos os alunos da matéria», o ESPERADO é FALHAR. */
const PUB_INFORMADO = !!arg('--publico'), PENPUB_INFORMADO = !!arg('--pen-publico');
const PUB = PUB_INFORMADO ? par(arg('--publico')) : { RM_LAYOUT_SLUGS: SLUG }, PENPUB = PENPUB_INFORMADO ? par(arg('--pen-publico')) : { RM_PEN_SLUGS: SLUG };
const ROOT = path.resolve(__dirname, '../../../Repasso-Med-Site--main/Atual - Copia');
const REPO = path.resolve(__dirname, '../../..');
const FN = path.join(ROOT, 'netlify/functions/get-pilot-flags.js');
const JOSE = 'aaaaaaaa-0000-4000-8000-0000000000a1', ALUNO = 'bbbbbbbb-0000-4000-8000-0000000000b2', ALUNO2 = 'cccccccc-0000-4000-8000-0000000000c3';
const TOK = { 'tok-jose': JOSE, 'tok-aluno': ALUNO, 'tok-aluno2': ALUNO2 };
const VARS = ['RM_PILOT_LAYOUT_UIDS', 'RM_PILOT_AUDIO_UIDS', 'RM_PILOT_PEN_UIDS', 'RM_PILOT_VISUAL_UIDS', 'RM_LAYOUT_SLUGS', 'RM_VISUAL_SLUGS', 'RM_PEN_SLUGS'];
let n = 0, ko = 0; const falhas = [], G = { controle: [0, 0], publico: [0, 0] }; let grupo = 'controle';
const ok = (c, m, x) => { n++; G[grupo][0]++; if (c) console.log('    ✓', m); else { ko++; G[grupo][1]++; falhas.push((grupo === 'publico' ? '[PÚBLICO] ' : '') + m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = t => { grupo = /PÚBLICO/.test(t) ? 'publico' : 'controle'; console.log('\n▸ ' + t); };

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

  sec('S2 · [PÚBLICO] LIBERAÇÃO AOS ALUNOS da matéria' + (Object.keys(PUB).length ? ' (' + Object.keys(PUB).join(', ') + ')' : ''));
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

  sec('S3 · CANETA privada na matéria (controle)');
  { const j = await srv(PRIVPEN, 'tok-jose', SLUG), a = await srv(PRIVPEN, 'tok-aluno', SLUG);
    ok(j.j.pen === true && j.j.layout === true, 'privado: José recebe layout + caneta em ' + SLUG, f(j)); ok(a.j.pen === false, 'privado: aluno não recebe caneta', f(a));
    ok(ig(f(await srv(PRIVPEN, 'tok-jose', 'dermatologia')), f(await srv({ RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_PEN_UIDS: JOSE }, 'tok-jose', 'dermatologia'))), 'caneta de ' + SLUG + ' não vaza para dermatologia'); }
  sec('S3b · [PÚBLICO] CANETA aos alunos da matéria (' + Object.keys(PENPUB).join(', ') + ')' + (PENPUB_INFORMADO ? '' : ' — variáveis ASSUMIDAS: a main não tem modo público de caneta'));
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

/* ---------- S6 · Semiología II como antes + «desligar» devolve SÓ a matéria ---------- */
async function semiologiaEDesligar() {
  const TODAS = ['semiologia-ii', 'dermatologia', 'biologia', 'anatomia-i', SLUG], TOKS = ['tok-jose', 'tok-aluno', 'tok-aluno2', null];
  const BASE = { RM_PILOT_LAYOUT_UIDS: JOSE, RM_PILOT_PEN_UIDS: JOSE };                 // produção de hoje: piloto de José, nenhuma matéria listada
  const LIGADO = Object.assign({}, BASE, ENV_PEN);                                    // tudo ligado: teste privado + liberação aos alunos + caneta
  sec('S6 · Semiología II continua como antes em TODAS as fases; desligar ' + SLUG + ' devolve só ela');
  for (const [nome, env] of [['teste privado', PRIVPEN], ['liberação aos alunos', ENV_PUB], ['liberação + caneta', ENV_PEN]]) {
    const ant = [], dep = [];
    for (const t of TOKS) { ant.push(f(await srv(BASE, t, 'semiologia-ii'))); dep.push(f(await srv(Object.assign({}, BASE, env), t, 'semiologia-ii'))); }
    ok(ig(ant, dep), `Semiología II com «${nome}» ligada: José/alunos/anônimo recebem exatamente o que recebiam antes`, { antes: ant, depois: dep });
  }
  { const j = await srv(LIGADO, 'tok-jose', 'semiologia-ii'); ok(j.j.layout === true && j.j.pen === true, 'Semiología II segue com layout + caneta para José (piloto fixo no código)', f(j)); }
  { const a = await srv(LIGADO, 'tok-aluno', 'semiologia-ii'); ok(ig(f(a), NEG), 'Semiología II segue SEM nada para aluno comum (a liberação de ' + SLUG + ' não a abre)', f(a)); }
  const quadro = async env => { const q = {}; for (const s of TODAS) { q[s] = {}; for (const t of TOKS) q[s][String(t)] = f(await srv(env, t, s)); } return q; };
  const antes = await quadro(BASE), ligado = await quadro(LIGADO), depois = await quadro(BASE);
  for (const s of TODAS.filter(x => x !== SLUG)) ok(ig(antes[s], ligado[s]), `ligar ${SLUG} não muda nada em ${s} (4 tipos de conta)`, { antes: antes[s], ligado: ligado[s] });
  ok(!ig(antes[SLUG], ligado[SLUG]) || !Object.keys(PUB).length && !Object.keys(PENPUB).length, SLUG + ': ligar muda a matéria (a liberação tem efeito)', { antes: antes[SLUG], ligado: ligado[SLUG] });
  ok(ig(antes, depois), 'desligar ' + SLUG + ' devolve o quadro INTEIRO (5 matérias × 4 contas) idêntico ao de antes de ligar', {});
  const soMF = TODAS.filter(s => !ig(ligado[s], antes[s]));
  ok(soMF.every(s => s === SLUG), 'a única matéria que difere entre ligado e desligado é ' + SLUG, soMF);
}

/* ---------- C · conteúdo: conta SEM acesso nunca obtém o HTML, mesmo com a liberação pública de layout ligada ---------- */
async function conteudo() {
  const GM = path.join(ROOT, 'netlify/functions/get-materia.js'), CH = [];
  const CONTAS = { 'tok-sem': { uid: 'dddddddd-0000-4000-8000-0000000000d4', subs: [] }, 'tok-outra': { uid: ALUNO, subs: ['dermatologia'] }, 'tok-mf': { uid: ALUNO2, subs: [SLUG] }, 'tok-expirou': { uid: 'eeeeeeee-0000-4000-8000-0000000000e5', subs: [] } };
  const chamar = async (env, token, slug, falha) => {
    for (const k of [...VARS, ...Object.keys(PUB), ...Object.keys(PENPUB)]) delete process.env[k];
    Object.assign(process.env, { SUPABASE_URL: 'https://x.invalid', SUPABASE_ANON_KEY: 'anon' }, env);
    global.fetch = async (u, o) => { u = String(u); CH.push({ u, m: (o && o.method) || 'GET' });
      const t = String(((o && o.headers) || {}).Authorization || '').replace(/^Bearer\s+/i, ''), c = CONTAS[t];
      if (falha === 'supabase-401') return { ok: false, status: 401, json: async () => ({}), text: async () => '' };
      if (falha === 'supabase-500') return { ok: false, status: 500, json: async () => ({}), text: async () => 'x' };
      if (/my_active_subjects/.test(u)) { if (!c) return { ok: false, status: 401, json: async () => ({}), text: async () => '' }; const m = /subject_slug=eq\.([^&]+)/.exec(u); const s = m && decodeURIComponent(m[1]);
        return { ok: true, status: 200, json: async () => (c.subs.includes(s) ? [{ subject_slug: s }] : []) }; }
      if (/rpc\/is_admin/.test(u)) { if (falha === 'rpc-erro') return { ok: false, status: 500, json: async () => null }; return { ok: true, status: 200, json: async () => false }; }
      return { ok: false, status: 404, json: async () => ({}), text: async () => '' }; };
    delete require.cache[GM];
    const r = await require(GM).handler({ queryStringParameters: { slug }, headers: token ? { authorization: 'Bearer ' + token } : {} });
    return r;
  };
  const vaza = r => r.statusCode === 200 || /<(html|section|div|h1|h2|p)\b/i.test(r.body || '') || (r.body || '').length > 400;
  const AMBIENTES = [['padrão de produção', {}], ['teste privado ligado', PRIVPEN], ['liberação pública de layout ligada', ENV_PUB], ['liberação pública de layout + caneta ligadas', ENV_PEN]];
  sec('C · entrega do conteúdo (get-materia.js REAL, Supabase simulado): acesso = matéria comprada/liberada, independente de qualquer chave de layout');
  for (const [nome, env] of AMBIENTES) {
    const sem = await chamar(env, 'tok-sem', SLUG), outra = await chamar(env, 'tok-outra', SLUG), nada = await chamar(env, null, SLUG), mf = await chamar(env, 'tok-mf', SLUG);
    ok(sem.statusCode === 403 && sem.headers['X-RM-Reason'] === 'sin-acceso' && !vaza(sem), `[${nome}] conta SEM a matéria: 403 sin-acceso, corpo sem conteúdo`, { s: sem.statusCode, r: sem.headers['X-RM-Reason'], len: (sem.body || '').length });
    ok(outra.statusCode === 403 && !vaza(outra), `[${nome}] conta que comprou OUTRA matéria (dermatologia): negada em ${SLUG}`, { s: outra.statusCode });
    ok(nada.statusCode === 401 && !vaza(nada), `[${nome}] sem token: 401, sem conteúdo`, { s: nada.statusCode });
    ok(mf.statusCode === 200 && /text\/html/.test(mf.headers['Content-Type']) && +mf.headers['X-RM-Bytes'] > 20000, `[${nome}] conta com a matéria: 200 e HTML (${mf.headers && mf.headers['X-RM-Bytes']} bytes)`, { s: mf.statusCode, r: mf.headers && mf.headers['X-RM-Reason'] });
    const tent = await chamar(env, 'tok-sem', "../../etc/passwd"); ok(tent.statusCode === 404 && !vaza(tent), `[${nome}] slug inventado: 404 sem conteúdo`, { s: tent.statusCode });
  }
  for (const [rot, falha, esp] of [['verificação do Supabase devolve 401', 'supabase-401', 401], ['verificação do Supabase cai (500)', 'supabase-500', 502]]) { const r = await chamar(ENV_PEN, 'tok-mf', SLUG, falha); ok(r.statusCode === esp && !vaza(r), `fail-closed · ${rot}: ${esp}, sem conteúdo (mesmo com a conta certa)`, { s: r.statusCode }); }
  { const r = await chamar(ENV_PEN, 'tok-sem', SLUG, 'rpc-erro'); ok(r.statusCode === 403 && !vaza(r), 'fail-closed · RPC is_admin falha: conta sem acesso continua negada', { s: r.statusCode }); }
  { CH.length = 0; await chamar(ENV_PEN, 'tok-sem', SLUG); await chamar(ENV_PEN, 'tok-mf', SLUG);
    ok(CH.length > 0 && CH.every(c => c.m === 'GET' || /rpc\/is_admin$/.test(c.u)), 'a entrega só lê (GET + RPC is_admin): nenhuma escrita', CH.slice(0, 4)); }
  { const fm = fs.readFileSync(path.join(ROOT, 'netlify/functions/get-pilot-flags.js'), 'utf8'), sx = fs.readFileSync(GM, 'utf8');
    ok(!/get-pilot-flags|RM_PILOT|RM_LAYOUT|RM_PEN/.test(sx), 'get-materia.js não consulta nenhuma chave de layout/caneta (a decisão de conteúdo é independente)', {});
    ok(!/my_active_subjects|materias-privadas/.test(fm), 'get-pilot-flags.js não lê compras nem conteúdo (só decide apresentação)', {}); }
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

async function tracoPen(ctx, page) {                 // 1 traço real com a caneta (CDP, pointerType pen) sobre o 1.º parágrafo longo
  const r = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container .tab-content section[id] p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,details:not([open]),table') && x.textContent.length > 140 && x.getBoundingClientRect().width > 300)[3]; p.scrollIntoView({ block: 'center' }); const b = p.getBoundingClientRect(); return { x: b.left, y: b.top }; });
  await page.waitForTimeout(400);
  const r2 = await page.evaluate(() => { const p = [...document.querySelectorAll('#materias-container .tab-content section[id] p')].filter(x => !x.closest('[data-rm-ui],.quiz-item,.flashcard,details:not([open]),table') && x.textContent.length > 140 && x.getBoundingClientRect().width > 300)[3]; const b = p.getBoundingClientRect(); return { x: b.left, y: b.top }; });
  const cdp = await ctx.newCDPSession(page); const send = (type, x, y, e) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, e));
  await send('mouseMoved', r2.x + 30, r2.y + 14, { buttons: 0 }); await send('mousePressed', r2.x + 30, r2.y + 14, { button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 24; i++) await send('mouseMoved', r2.x + 30 + i * 6, r2.y + 14 + Math.sin(i / 3) * 5, { button: 'left', buttons: 1 });
  await send('mouseReleased', r2.x + 174, r2.y + 14, { button: 'left', buttons: 0, clickCount: 1 }); await page.waitForTimeout(800);
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
  /* ---------- P · a CANETA DE VERDADE para um aluno comum (banco simulado, nada real é escrito) ---------- */
  async function penAluno(rot, env, tok, uid, ctrl) {
    const m = M(SLUG), ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.route('**/get-pilot-flags*', async r => { const sl = new URL(r.request().url()).searchParams.get('slug'); const o = await srv(env, tok, sl); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o.j) }); });
    await page.addInitScript(([slug]) => { window.__RM_ENSAIO = { slug, modo: 'controle' }; }, [m.slug]);
    await page.addInitScript(PILOT_JS);                                                  // rm-pilot.js REAL, em cada carga (inclusive o reload)
    const url = `${base}/p.html?slug=${m.slug}&tab=${m.tab}&modo=controle&wait=1500&persist=1&pilotreal=1&uid=${uid}`;
    const carregar = async () => { await page.goto(url, { timeout: 120000 }); await page.waitForFunction('window.__ready===true', { timeout: 120000 }); await page.waitForTimeout(2500); };
    const quem = () => page.evaluate(([slug]) => ({ flagPen: !!(window.RMPilot && window.RMPilot.penLiberada(slug)), v2: window.RM_STUDY_V2_ACTIVE === true, botao: (() => { const b = document.querySelector('#rm2-panel [data-t="pen"]'); return !!b && b.getBoundingClientRect().width > 0; })(), fab: !!document.getElementById('rm2-fab'), perm: window.RMToolsV2 && window.RMToolsV2._test ? window.RMToolsV2._test.pilotoPermitido() : null }), [m.slug]);
    try {
      await carregar();
      try { await page.evaluate(D.SEMEAR, { slug: m.slug, uid, max: 6 }); await carregar(); } catch (er) { console.log('    · sem o motor V2 não há como semear grifos/traços para esta conta (' + String(er.message).split('\n')[0].slice(0, 90) + ')'); }
      await page.evaluate(() => { const f = document.getElementById('rm2-fab'); if (f && f.getAttribute('aria-expanded') !== 'true') f.click(); }); await page.waitForTimeout(500);   // o aluno abre o painel pelo botão flutuante
      const ref = await page.evaluate(D.MEDIR), e = await quem();
      const motivo = !e.flagPen ? 'o SERVIDOR não liberou a caneta (flags)' : !e.v2 ? 'o servidor liberou, mas a conta NÃO tem acesso à V2 (BETA_UIDS/study_tools_beta/ROLLOUT) — a ferramenta nem monta' : !e.botao ? 'V2 montou mas o botão da caneta não aparece' : 'ok';
      console.log('    · diagnóstico: ' + JSON.stringify(e) + ' ⇒ ' + motivo);
      ok(e.flagPen === true, `${rot}: o servidor libera a caneta de ${SLUG} para esta conta`, e);
      ok(e.v2 === true, `${rot}: a conta tem acesso à ferramenta V2 (sem isso a caneta não existe para o aluno)`, e);
      ok(e.botao === true, `${rot}: o aluno VÊ a ferramenta Lápiz`, e);
      if (e.botao && e.perm) {
        await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await page.waitForTimeout(500);
        const w0 = (await page.evaluate(() => window.__writes.slice())).length;
        await tracoPen(ctx, page);
        const w = (await page.evaluate(() => window.__writes.slice())).slice(w0);
        ok(w.length === 1 && w[0] === 'insert:user_ink_strokes', `${rot}: desenhou e gravou 1 traço (só insert em user_ink_strokes do banco SIMULADO)`, w);
        const dep = await page.evaluate(D.MEDIR), novos = dep.tracos.filter(t => !ref.tracos.some(r => r.id === t.id));
        ok(novos.length === 1 && novos[0].vis, `${rot}: 1 traço novo, visível, preso a ${novos[0] && novos[0].a}`, novos);
        await carregar(); const rel = await page.evaluate(D.MEDIR);
        ok(rel.tracos.length === ref.tracos.length + 1 && rel.tracos.some(t => novos[0] && t.id === novos[0].id && t.vis), `${rot}: depois de RECARREGAR o aluno reencontra o traço novo (${rel.tracos.length} traços)`, { antes: ref.tracos.length, depois: rel.tracos.length });
        const dif = D.comparar(ref, rel, rot).filter(x => !/^(traco-novo|escreveu-no-banco|erro-js)$/.test(x.tipo));
        ok(dif.length === 0 && rel.grifos.length === ref.grifos.length && rel.notas.length === ref.notas.length, `${rot}: grifos (${rel.grifos.length}), notas (${rel.notas.length}) e os ${ref.tracos.length} traços anteriores idênticos`, dif.slice(0, 3));
        ok(rel.escritas.length === 0, `${rot}: o reload não escreveu nada`, rel.escritas);
      } else ok(false, `${rot}: desenhar/salvar/reencontrar NÃO foi possível — ${motivo}`, e);
      ok(errs.length === 0, `${rot}: 0 erros JS`, errs);
    } finally { await ctx.close(); }
  }
  const ENV_ALUNO = Object.keys(PENPUB).length ? ENV_PEN : ENV_PUB;
  sec('P0 · CONTROLE (acesso que já existe): conta tester + liberação privada de caneta — mostra que o desenho funciona neste ambiente');
  await penAluno('controle tester', PRIVPEN, 'tok-jose', D.UID, true);
  sec('P1 · [PÚBLICO] ALUNO COMUM (' + ALUNO.slice(0, 8) + '…, fora de BETA_UIDS e sem linha em study_tools_beta) com a liberação pública ligada: vê a ferramenta, desenha, salva, reencontra');
  await penAluno('aluno comum', Object.keys(PENPUB).length ? ENV_PEN : ENV_PUB, 'tok-aluno', ALUNO, false);
  sec('P2 · Semiología II no navegador: aluno comum com a liberação de ' + SLUG + ' ligada NÃO ganha layout nem caneta lá');
  LARG = 1440; await cena(M('semiologia-ii'), ENV_ALUNO, 'tok-aluno', 'aluno em semiologia-ii', false, false);
  for (const W of [1440, 390]) {
    LARG = W; const t = `[${W}px] `, m = M(SLUG);
    sec(t + 'B0 · padrão'); await cena(m, {}, 'tok-aluno', t + 'aluno, padrão', false, false);
    sec(t + 'B1 · teste privado'); await cena(m, PRIV, 'tok-jose', t + 'José, privado', true, false); await cena(m, PRIV, 'tok-aluno', t + 'aluno, privado', false, false);
    if (Object.keys(PUB).length) { sec(t + 'B2 · [PÚBLICO] liberação aos alunos'); await cena(m, ENV_PUB, 'tok-aluno', t + 'aluno, liberado', true, false); await cena(m, ENV_PUB, null, t + 'anônimo, liberado', false, false); }
    if (Object.keys(PENPUB).length) { sec(t + 'B3 · [PÚBLICO] caneta'); await cena(m, ENV_PEN, 'tok-aluno', t + 'aluno, layout+caneta', true, true); }
    sec(t + 'B4 · volta'); await cena(m, {}, 'tok-aluno', t + 'aluno, depois da volta', false, false);
    sec(t + 'B5 · vizinhas com a matéria liberada');
    for (const v of ['dermatologia', 'biologia']) { const o = await cena(M(v), Object.keys(PEN_OU()).length ? ENV_PEN : ENV_PUB, 'tok-aluno', t + v + ' (aluno)', false, false); ok(o.pedidos.length === 0, v + ': nenhuma requisição ao servidor (fora das CANDIDATAS)', o.pedidos); }
  }
  await br.close(); s0.close();
}
const PEN_OU = () => PENPUB;

(async () => {
  await servidor(); await semiologiaEDesligar(); await conteudo(); arquivos(); if (!SO) await navegador();
  console.log('\n══ RESUMO ══');
  console.log(`  CONTROLE (comportamento atual, não prova implantação pública): ${G.controle[0] - G.controle[1]}/${G.controle[0]} OK`);
  console.log(`  CENÁRIOS PÚBLICOS (liberação aos alunos da matéria + caneta do aluno comum): ${G.publico[0] - G.publico[1]}/${G.publico[0]} OK${PUB_INFORMADO || PENPUB_INFORMADO ? '' : ' — sem --publico/--pen-publico: na MAIN o esperado é FALHAR (não existe liberação pública)'}`);
  console.log(`auditoria-implantacao-publica (${SLUG}): ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHA(S)' : ''}`);
  if (ko) console.log('Falhas:\n - ' + falhas.join('\n - '));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
