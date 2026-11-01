/* AUDITORIA INDEPENDENTE · Nova Era (#622) · servidor — adapta a conferência da #618 ao sistema de ETAPAS (tabela rm_materia_rollout).
   Usa a get-pilot-flags.js REAL da árvore em que roda, com Supabase simulado; só lê; nada de rede. Uso: node servidor.audit.cjs <raiz-do-repo>
   Fases: S0 desligada · S1 só José · S2 alunos com acesso (layout) · S3 caneta separada · S4 volta · S5 Semiología II · S6 só a matéria muda · S7 curinga/estranhos · S8 acesso expirado/admin/sem sessão · S9 variáveis legadas × estágio */
'use strict';
const path = require('path');
const RAIZ = path.resolve(process.argv[2] || process.cwd());
const { U, chamar } = require(path.join(RAIZ, 'tools/qa/nova-era/lib-servidor.cjs'));
let n = 0, ko = 0; const falhas = [];
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; falhas.push(m); console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 300) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);
const MF = 'medicina-familiar', PIL = 'semiologia-ii', OUTRAS = ['dermatologia', 'biologia', 'anatomia-i'];
const NEG = { layout: false, pen: false, visual: false, audio: false };
const f = r => ({ layout: !!r.layout, pen: !!r.pen, visual: !!r.visual, audio: !!r.audio });
const ig = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ENV_JOSE = { RM_PILOT_LAYOUT_UIDS: U.JOSE, RM_PILOT_PEN_UIDS: U.JOSE, RM_PILOT_VISUAL_UIDS: U.JOSE, RM_PILOT_AUDIO_UIDS: U.JOSE };
const ACESSOS = { [U.ALUNO]: [MF, 'dermatologia'], [U.OUTRO]: ['dermatologia'] };
const T = (l, p, v) => ({ [MF]: { layout_stage: l, pen_stage: p, visual_stage: v || 'off' } });
const cena = (tabela, extra) => Object.assign({ env: ENV_JOSE, tabela, acessos: ACESSOS }, extra || {});
const PERS = ['JOSE', 'ALUNO', 'SEM', 'OUTRO'];
const quadro = async (c, slugs) => { const q = {}; for (const s of slugs) { q[s] = {}; for (const p of PERS) q[s][p] = f(await chamar(c, p, s)); q[s].anonimo = f(await chamar(c, 'ALUNO', s, { semToken: true })); } return q; };
const TODAS = [MF, PIL, ...OUTRAS];

(async () => {
  sec('S0 · DESLIGADA (padrão): linha off / ausente / tabela inexistente ⇒ ninguém recebe nada em Medicina Familiar');
  for (const [nome, c] of [['linha off', cena(T('off', 'off'))], ['linha ausente', cena({})], ['tabela inexistente', cena(null)]])
    for (const p of [...PERS]) { const r = await chamar(c, p, MF); ok(ig(f(r), NEG) || (p === 'JOSE' && false), `${nome} · ${p}: tudo false`, f(r)); }
  { const a = await chamar(cena(T('off', 'off')), 'ALUNO', MF), b = await chamar(cena(T('off', 'off')), 'ALUNO', 'dermatologia'); ok(a._corpo === b._corpo, 'corpo da negação idêntico em matérias diferentes', [a._corpo, b._corpo]); }

  sec('S1 · TESTE SÓ DE JOSÉ (preview): layout e caneta separados; aluno com acesso, sem acesso e anônimo nada');
  for (const [l, p] of [['preview', 'off'], ['off', 'preview'], ['preview', 'preview']]) {
    const c = cena(T(l, p)); const j = await chamar(c, 'JOSE', MF);
    ok(j.layout === (l === 'preview') && j.pen === (p === 'preview') && !j.visual && !j.audio, `José com layout=${l}, caneta=${p}: recebe só o que está em preview`, f(j));
    for (const q of ['ALUNO', 'SEM', 'OUTRO']) { const r = await chamar(c, q, MF); ok(ig(f(r), NEG), `  ${q} com layout=${l}, caneta=${p}: nada`, f(r)); }
    const an = await chamar(c, 'ALUNO', MF, { semToken: true }); ok(ig(f(an), NEG), '  anônimo: nada', f(an)); }

  sec('S2 · ALUNOS COM ACESSO (layout=all, caneta=off): só layout, só quem tem a matéria');
  { const c = cena(T('all', 'off'));
    const a = await chamar(c, 'ALUNO', MF); ok(a.layout && !a.pen && !a.visual && !a.audio && a.slug === MF, 'aluno com acesso: layout, sem caneta, sem tema, sem áudio', f(a));
    for (const q of ['SEM', 'OUTRO']) { const r = await chamar(c, q, MF); ok(ig(f(r), NEG), `${q} (sem acesso a ${MF}): nada`, f(r)); }
    const an = await chamar(c, 'ALUNO', MF, { semToken: true }); ok(ig(f(an), NEG), 'anônimo: nada', f(an));
    const j = await chamar(c, 'JOSE', MF); ok(j.layout && !j.pen, 'José: layout (sem caneta: está off)', f(j));
    for (const o of [PIL, ...OUTRAS]) { const r = await chamar(c, 'ALUNO', o); ok(ig(f(r), NEG), `aluno com acesso em ${o}: nada (a liberação é só da matéria)`, f(r)); } }

  sec('S3 · CANETA SEPARADA (layout=off, caneta=all) e as duas juntas');
  { const c = cena(T('off', 'all')); const a = await chamar(c, 'ALUNO', MF); ok(!a.layout && a.pen && !a.visual, 'caneta=all, layout=off: aluno só caneta', f(a));
    const s = await chamar(c, 'SEM', MF); ok(ig(f(s), NEG), '  sem acesso: nada', f(s)); }
  { const c = cena(T('all', 'all')); const a = await chamar(c, 'ALUNO', MF); ok(a.layout && a.pen && !a.visual, 'as duas em all: layout + caneta, tema segue off', f(a)); }
  { const c = cena(T('all', 'preview')); const a = await chamar(c, 'ALUNO', MF), j = await chamar(c, 'JOSE', MF); ok(a.layout && !a.pen && j.pen, 'layout=all, caneta=preview: aluno layout, só José caneta', [f(a), f(j)]); }

  sec('S4 · VOLTA: depois de desligar, o quadro INTEIRO (5 matérias × 5 contas) é idêntico ao de antes de ligar');
  { const antes = await quadro(cena(T('off', 'off')), TODAS), ligado = await quadro(cena(T('all', 'all')), TODAS), depois = await quadro(cena(T('off', 'off')), TODAS);
    ok(ig(antes, depois), 'desligar devolve exatamente o quadro anterior', {});
    const mudaram = TODAS.filter(s => !ig(antes[s], ligado[s])); ok(mudaram.length === 1 && mudaram[0] === MF, 'ligar muda SÓ ' + MF, mudaram);
    ok(ig(antes[PIL], ligado[PIL]), 'Semiología II idêntica com Medicina Familiar ligada', [antes[PIL], ligado[PIL]]); }

  sec('S5 · SEMIOLOGÍA II continua o piloto: listas de conta, a tabela não se aplica');
  { const base = cena({}); const comTab = cena(Object.assign(T('all', 'all'), { [PIL]: { layout_stage: 'all', pen_stage: 'all', visual_stage: 'all' } }), { acessos: { [U.ALUNO]: [PIL, MF] } });
    for (const p of PERS) { const a = await chamar(base, p, PIL), b = await chamar(comTab, p, PIL); ok(ig(f(a), f(b)), `piloto · ${p}: igual com e sem tabela (tabela ignorada)`, [f(a), f(b)]); }
    const j = await chamar(base, 'JOSE', PIL); ok(j.layout && j.pen && j.audio && j.visual, 'José: layout, caneta, áudio e tema do piloto', f(j));
    const a = await chamar(comTab, 'ALUNO', PIL); ok(ig(f(a), NEG), 'aluno comum no piloto: nada mesmo com a tabela em all', f(a));
    const semListas = await chamar({ env: {}, tabela: {}, acessos: ACESSOS }, 'JOSE', PIL); ok(ig(f(semListas), NEG), 'piloto sem listas de conta: negado, como sempre', f(semListas)); }

  sec('S6 · VALORES ESTRANHOS NA TABELA e curingas: tudo ⇒ off');
  for (const v of ['ALL', 'All', ' all', 'all ', '*', 'true', '1', 'todas', 'everyone', '', null, 1, true, 'preview ', 'Preview']) {
    const c = cena(T(v, v)); const a = await chamar(c, 'ALUNO', MF);
    ok(ig(f(a), NEG), `valor ${JSON.stringify(v)}: aluno com acesso recebe nada`, f(a)); }
  { const r = await chamar(cena(T('all', 'all'), { linhasExtra: true }), 'ALUNO', MF); ok(ig(f(r), NEG), 'duas linhas devolvidas para o mesmo slug ⇒ nada (fail closed)', f(r)); }
  { const r = await chamar(cena({ '*': { layout_stage: 'all', pen_stage: 'all', visual_stage: 'all' } }), 'ALUNO', MF); ok(ig(f(r), NEG), 'linha com slug «*» não vira curinga', f(r)); }
  { const r = await chamar(cena(T('all', 'all')), 'ALUNO', '../../etc/passwd'); ok(ig(f(r), NEG), 'slug malformado: negado', f(r)); }
  { const r = await chamar(cena(T('all', 'all')), 'ALUNO', MF, { tokenRuim: true }); ok(ig(f(r), NEG), 'token inválido: negado', f(r)); }
  { const r = await chamar(cena(T('all', 'all'), { erroTabela: true }), 'ALUNO', MF); ok(ig(f(r), NEG), 'erro 500 na tabela: negado', f(r)); }
  { const c = cena(T('all', 'all')); c.chamadas = []; await chamar(c, 'ALUNO', MF); await chamar(c, 'JOSE', MF); ok(c.chamadas.length > 0 && c.chamadas.every(x => x.startsWith('GET ')), 'só GET (nenhuma escrita)', c.chamadas); }

  sec('S7 · ACESSO: expirado, outro produto, sem sessão');
  { const c = cena(T('all', 'all'), { acessos: {} }); const a = await chamar(c, 'ALUNO', MF); ok(ig(f(a), NEG), 'aluno cujo acesso expirou/foi retirado (my_active_subjects vazia): nada', f(a)); }
  { const c = cena(T('all', 'all')); const o = await chamar(c, 'OUTRO', MF); ok(ig(f(o), NEG), 'conta que comprou só dermatologia: nada em MF', f(o)); }
  { const c = cena(T('all', 'all'), { acessos: { [U.ALUNO]: [MF] } }); c.chamadas = []; const s = await chamar(c, 'SEM', MF); ok(ig(f(s), NEG) && c.chamadas.some(x => /my_active_subjects/.test(x)), 'a decisão consulta a MESMA view do get-materia (my_active_subjects)', c.chamadas); }

  sec('S8 · VARIÁVEIS LEGADAS × ESTÁGIO: desligar a tabela desliga TUDO? (uma conta de teste que ainda esteja em RM_LAYOUT_SLUGS/RM_PEN_SLUGS)');
  { const envLeg = Object.assign({}, ENV_JOSE, { RM_LAYOUT_SLUGS: MF, RM_PEN_SLUGS: MF });
    const j = await chamar(cena(T('off', 'off'), { env: envLeg }), 'JOSE', MF);
    ok(ig(f(j), NEG), 'José com a variável legada ainda listando MF e estágios em OFF: tudo desligado (o «voltar» da tabela vale)', f(j));
    const a = await chamar(cena(T('all', 'all'), { env: envLeg }), 'ALUNO', MF); ok(a.layout && a.pen, 'aluno em all com variáveis legadas presentes: layout + caneta (nada se quebra)', f(a)); }

  console.log(`\nauditoria nova-era/servidor (${RAIZ}): ${n - ko}/${n} OK${ko ? ' — ' + ko + ' FALHA(S)' : ''}`);
  if (ko) console.log('Falhas:\n - ' + falhas.join('\n - '));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
