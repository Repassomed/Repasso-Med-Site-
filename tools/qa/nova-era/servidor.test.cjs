/* NOVA ERA · função get-pilot-flags REAL: duas etapas por matéria, layout e caneta separados, só aluno COM acesso, falha fechada.
   Uso: node tools/qa/nova-era/servidor.test.cjs */
'use strict';
const { U, ENV_JOSE, chamar } = require('./lib-servidor.cjs');
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);
const MF = 'medicina-familiar', DERM = 'dermatologia', PIL = 'semiologia-ii';
const T = (l, p, v) => ({ [MF]: { layout_stage: l, pen_stage: p, visual_stage: v || 'off' } });
const ACESSOS = { [U.ALUNO]: [MF], [U.OUTRO]: [DERM], [U.JOSE]: [] /* José nem precisa ter comprado: a prévia é por conta */ };
const base = (tabela, extra) => Object.assign({ env: ENV_JOSE, tabela, acessos: ACESSOS }, extra || {});
const f = (r) => ({ layout: r.layout, pen: r.pen, visual: r.visual, audio: r.audio });
const NEG = { layout: false, pen: false, visual: false, audio: false };

(async () => {
  sec('1 · tudo começa DESLIGADO (linha off, linha ausente, tabela inexistente)');
  for (const [nome, cena] of [['linha off', base(T('off', 'off'))], ['linha ausente', base({})], ['tabela inexistente', base(null)], ['erro 500 na tabela', base(T('all', 'all'), { erroTabela: true })]]) {
    for (const p of ['JOSE', 'ALUNO', 'SEM']) { const r = await chamar(cena, p, MF); ok(JSON.stringify(f(r)) === JSON.stringify(NEG), `${nome} · ${p}: tudo false`, f(r)); }
  }

  sec('2 · ETAPA 1 (preview): só as contas de teste; o aluno comum continua sem nada');
  { const c = base(T('preview', 'preview'));
    const j = await chamar(c, 'JOSE', MF); ok(j.layout && j.pen && !j.visual && !j.audio, 'José: layout e caneta liberados, tema e áudio não', f(j));
    const a = await chamar(c, 'ALUNO', MF); ok(JSON.stringify(f(a)) === JSON.stringify(NEG), 'aluno COM acesso: nada', f(a));
    const s = await chamar(c, 'SEM', MF); ok(JSON.stringify(f(s)) === JSON.stringify(NEG), 'aluno sem acesso: nada', f(s)); }

  sec('3 · ETAPA 2 (all): todos os alunos que JÁ TÊM acesso; quem não tem, não');
  { const c = base(T('all', 'all'));
    const a = await chamar(c, 'ALUNO', MF); ok(a.layout && a.pen && !a.visual && !a.audio && a.slug === MF, 'aluno COM acesso: layout e caneta', f(a));
    const s = await chamar(c, 'SEM', MF); ok(JSON.stringify(f(s)) === JSON.stringify(NEG), 'aluno SEM acesso a esta matéria: nada', f(s));
    const o = await chamar(c, 'OUTRO', MF); ok(JSON.stringify(f(o)) === JSON.stringify(NEG), 'aluno com acesso a OUTRA matéria: nada aqui', f(o));
    const j = await chamar(c, 'JOSE', MF); ok(j.layout && j.pen, 'José continua vendo (prévia ⊂ all), mesmo sem ter a matéria comprada', f(j)); }

  sec('4 · layout e caneta SEPARADOS');
  { const L = await chamar(base(T('all', 'off')), 'ALUNO', MF); ok(L.layout && !L.pen, 'layout=all, caneta=off ⇒ só layout', f(L));
    const P = await chamar(base(T('off', 'all')), 'ALUNO', MF); ok(!P.layout && P.pen, 'layout=off, caneta=all ⇒ só caneta', f(P));
    const M = await chamar(base(T('all', 'preview')), 'ALUNO', MF); ok(M.layout && !M.pen, 'layout=all, caneta=preview ⇒ aluno só layout', f(M));
    const Mj = await chamar(base(T('all', 'preview')), 'JOSE', MF); ok(Mj.layout && Mj.pen, '…e José vê a caneta em prévia', f(Mj)); }

  sec('5 · tema (visual): só por cima do layout e só com estágio próprio');
  { const A = await chamar(base(T('all', 'off', 'all')), 'ALUNO', MF); ok(A.layout && A.visual, 'layout=all e tema=all ⇒ tema', f(A));
    const B = await chamar(base(T('off', 'off', 'all')), 'ALUNO', MF); ok(!B.layout && !B.visual, 'tema=all sem layout ⇒ nada (nunca sozinho)', f(B));
    const C = await chamar(base(T('all', 'all', 'off')), 'ALUNO', MF); ok(C.layout && !C.visual, 'tema=off (padrão) ⇒ sem tema, mesmo com layout all', f(C)); }

  sec('6 · outra matéria não é afetada');
  { const c = base(T('all', 'all'));
    const d = await chamar(c, 'ALUNO', DERM); ok(JSON.stringify(f(d)) === JSON.stringify(NEG), 'dermatologia (sem linha): nada, mesmo com MF em all', f(d));
    const d2 = await chamar(base(Object.assign(T('all', 'all'), { [DERM]: { layout_stage: 'off', pen_stage: 'off', visual_stage: 'off' } })), 'OUTRO', DERM); ok(JSON.stringify(f(d2)) === JSON.stringify(NEG), 'dermatologia com linha off: nada', f(d2)); }

  sec('7 · piloto Semiología II segue como antes (listas de conta; a tabela não se aplica)');
  { const c = base(Object.assign({ [PIL]: { layout_stage: 'all', pen_stage: 'all', visual_stage: 'all' } }, {}), { env: Object.assign({}, ENV_JOSE, { RM_PILOT_AUDIO_UIDS: U.JOSE }), acessos: { [U.ALUNO]: [PIL] } });
    const j = await chamar(c, 'JOSE', PIL); ok(j.layout && j.pen && j.audio && j.visual, 'José no piloto: layout, caneta, áudio e tema (listas)', f(j));
    const a = await chamar(c, 'ALUNO', PIL); ok(JSON.stringify(f(a)) === JSON.stringify(NEG), 'aluno comum no piloto: nada, mesmo com a tabela em all (a tabela é ignorada no piloto)', f(a)); }

  sec('8 · áudio nunca fora do piloto');
  { const c = base(T('all', 'all'), { env: Object.assign({}, ENV_JOSE, { RM_PILOT_AUDIO_UIDS: U.JOSE + ',' + U.ALUNO }) });
    const a = await chamar(c, 'ALUNO', MF); const j = await chamar(c, 'JOSE', MF); ok(!a.audio && !j.audio, 'áudio false para todos em Medicina Familiar', [a.audio, j.audio]); }

  sec('9 · falha fechada e corpo idêntico em qualquer negação');
  { const c = base(T('all', 'all'));
    const corpos = new Set();
    for (const [nome, r] of [['sem token', await chamar(c, 'ALUNO', MF, { semToken: true })], ['token inválido', await chamar(c, 'ALUNO', MF, { tokenRuim: true })], ['sem acesso', await chamar(c, 'SEM', MF)], ['matéria inexistente', await chamar(c, 'ALUNO', 'materia-que-nao-existe')], ['slug inválido', await chamar(c, 'ALUNO', '../etc/passwd')], ['curinga *', await chamar(c, 'ALUNO', '*')], ['«todas»', await chamar(c, 'ALUNO', 'todas')]]) {
      ok(JSON.stringify(f(r)) === JSON.stringify(NEG) && r._status === 200, `${nome}: false com HTTP 200`, f(r)); corpos.add(r._corpo); }
    ok(corpos.size === 1, 'o corpo é o MESMO em todas as negações (não revela por quê)', [...corpos]);
    const dup = await chamar(base(T('all', 'all'), { linhasExtra: true }), 'ALUNO', MF); ok(JSON.stringify(f(dup)) === JSON.stringify(NEG), 'tabela devolvendo 2 linhas para o mesmo slug: nada', f(dup));
    const estranho = await chamar(base({ [MF]: { layout_stage: 'ALL', pen_stage: 'todos', visual_stage: '*' } }), 'ALUNO', MF); ok(JSON.stringify(f(estranho)) === JSON.stringify(NEG), 'valores fora do vocabulário (ALL, todos, *): nada', f(estranho)); }

  sec('10 · compatibilidade: as variáveis de matéria antigas (prévia por ambiente) seguem valendo só para as contas de teste');
  { const c = base({}, { env: Object.assign({}, ENV_JOSE, { RM_LAYOUT_SLUGS: MF }) });
    const j = await chamar(c, 'JOSE', MF); const a = await chamar(c, 'ALUNO', MF); ok(j.layout && !j.pen && !a.layout, 'RM_LAYOUT_SLUGS=medicina-familiar liga só a conta de teste; o aluno comum não', [f(j), f(a)]); }

  sec('11 · somente leitura');
  { const c = base(T('all', 'all')); await chamar(c, 'ALUNO', MF); await chamar(c, 'SEM', MF);
    ok(c.chamadas.every(x => x.startsWith('GET ')), 'toda chamada ao banco é GET (' + c.chamadas.length + ' chamadas)', c.chamadas);
    ok(c.chamadas.every(x => /\/auth\/v1\/user|\/rest\/v1\/(rm_materia_rollout|my_active_subjects)$/.test(x.split(' ')[1])), 'só toca em auth/user, rm_materia_rollout e my_active_subjects', [...new Set(c.chamadas)]);
    const off = base(T('off', 'off')); await chamar(off, 'ALUNO', MF); ok(!off.chamadas.some(x => /my_active_subjects/.test(x)), 'estágios off: nem consulta o acesso do aluno', off.chamadas); }

  console.log(`\nnova-era/servidor: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
