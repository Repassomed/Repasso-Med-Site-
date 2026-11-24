/* PRÉVIA EM LOTE · TESTE DE ACESSO PRIVADO — o SQL REAL do lote (docs/nova-era-temas/previa-lote.sql, bloco 1, e a volta) roda num Postgres LOCAL em memória (PGlite: nenhum Supabase,
   nenhuma escrita real) e a tabela resultante alimenta a função REAL get-pilot-flags.js (Supabase simulado, zero rede), para CADA matéria da lista do lote:
     1  antes do lote: todas as personas (José, aluno com acesso, aluno sem acesso, visitante sem token, token ruim, 2.º testador das listas do piloto) recebem tudo false;
     2  depois do lote: SÓ o administrador (José) recebe layout, caneta e tema; aluno COM acesso à matéria, aluno sem acesso, visitante, token inválido e o 2.º testador (fora de is_admin) continuam em false;
     3  matéria FORA da lista do lote continua em false até para José (nada vaza para vizinhas), e as flags de áudio são sempre false (áudio é só do piloto);
     4  falha fechada: tabela com erro 500/ausente, perfil sem resposta ⇒ tudo false mesmo depois do lote;
     5  a função só faz GET (nunca grava);
     6  retorno: depois da volta SEGURA, José volta a false em todas as matérias do lote; se José tinha promovido uma matéria a «all» antes da volta, ela continua liberada (e o aluno com acesso a vê), sem ser derrubada;
     7  a lista do lote só contém slugs que são CANDIDATAS do rm-pilot.js e que têm tema (css + js) — nenhuma matéria «não preparada» entra.
   Uso: PGLITE_DIR=<pasta com node_modules/@electric-sql/pglite> node tools/qa/nova-era/previa-lote-acesso.test.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const { U, ENV_JOSE, chamar, ROOT } = require('./lib-servidor.cjs');
const REPO = path.resolve(__dirname, '../../..');
const dir = process.env.PGLITE_DIR || process.cwd();
const { PGlite } = require(path.join(dir, 'node_modules/@electric-sql/pglite'));
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 300) : ''); } return !!c; };
const sec = t => console.log('\n▸ ' + t);
const sql = fs.readFileSync(path.join(REPO, 'docs/nova-era-temas/previa-lote.sql'), 'utf8');
const volta = fs.readFileSync(path.join(REPO, 'docs/nova-era-temas/previa-lote-volta.sql'), 'utf8');
const bloco = (txt, k) => { const m = txt.split(new RegExp('^-- ' + k + '\\) ', 'm'))[1]; return m.split('\n').slice(1).filter(l => !/^--/.test(l)).join('\n').split(/\n-- \d\) /)[0].split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean); };
const LOTE = [...sql.split(/^-- 1\) /m)[1].match(/with alvo\(slug\) as \(values (.*?)\)\s*insert/s)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const pilot = fs.readFileSync(path.join(ROOT, 'assets/rm-pilot.js'), 'utf8');
const CAND = [...pilot.match(/var CANDIDATAS = \[(.*?)\]/s)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const css = fs.readFileSync(path.join(ROOT, 'assets/rm-materia-sistema.css'), 'utf8'), js = fs.readFileSync(path.join(ROOT, 'assets/rm-materia-sistema.js'), 'utf8');
const FORA = 'imagenologia';   // matéria que NÃO está no lote (e nem é candidata)
const F = r => ({ layout: r.layout, pen: r.pen, visual: r.visual, audio: r.audio });
const NEG = { layout: false, pen: false, visual: false, audio: false };
const PERSONAS = ['ALUNO', 'SEM', 'TESTER2', 'OUTRO'];

(async () => {
  sec('7 · a lista do lote só tem matérias PREPARADAS (candidata + tema)');
  ok(LOTE.length > 0 && new Set(LOTE).size === LOTE.length, 'lista do lote: ' + LOTE.length + ' matérias, sem repetição');
  ok(LOTE.every(s => CAND.includes(s)), 'todas as matérias do lote são CANDIDATAS do rm-pilot.js', LOTE.filter(s => !CAND.includes(s)));
  ok(LOTE.every(s => css.includes('[data-rm-tema="' + s + '"]') && new RegExp("^    '" + s + "': \\{", 'm').test(js)), 'todas têm tema (css + js)', LOTE.filter(s => !(css.includes('[data-rm-tema="' + s + '"]') && new RegExp("^    '" + s + "': \\{", 'm').test(js))));
  ok(!LOTE.includes('semiologia-ii') && !LOTE.includes('medicina-familiar') && !LOTE.includes(FORA), 'piloto, matéria já em preview e matéria não candidata ficam fora do lote');

  const db = new PGlite();
  await db.exec(`create table public.rm_materia_rollout (slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
    layout_stage text not null default 'off' check (layout_stage in ('off','preview','all')), pen_stage text not null default 'off' check (pen_stage in ('off','preview','all')),
    visual_stage text not null default 'off' check (visual_stage in ('off','preview','all')), nota text, atualizado_em timestamptz not null default now());`.replace('create table public.', 'create schema if not exists public; create table public.'));
  const tabela = async () => Object.fromEntries((await db.query('select slug,layout_stage,pen_stage,visual_stage from public.rm_materia_rollout')).rows.map(r => [r.slug, { layout_stage: r.layout_stage, pen_stage: r.pen_stage, visual_stage: r.visual_stage }]));
  const cena = async (extra) => Object.assign({ env: ENV_JOSE, tabela: await tabela(), acessos: Object.fromEntries([[U.ALUNO, [...LOTE, FORA]], [U.OUTRO, [...LOTE]], [U.JOSE, []]]) }, extra || {});
  const run = async (txt, k) => { for (const s of bloco(txt, k)) await db.exec(s); };

  sec('1 · ANTES do lote: tudo false para todas as personas, em todas as matérias');
  { let pior = [];
    for (const s of [...LOTE, FORA]) for (const p of ['JOSE', 'ALUNO', 'SEM', 'TESTER2']) { const r = await chamar(await cena(), p, s); if (JSON.stringify(F(r)) !== JSON.stringify(NEG)) pior.push([s, p, F(r)]); }
    ok(pior.length === 0, 'tabela vazia ⇒ ninguém recebe nada (incluindo José)', pior.slice(0, 3)); }

  sec('2 · O LOTE (bloco 1 real do SQL)');
  await run(sql, '1');
  const t1 = await tabela();
  ok(LOTE.every(s => t1[s] && t1[s].layout_stage === 'preview' && t1[s].pen_stage === 'preview' && t1[s].visual_stage === 'preview'), 'as ' + LOTE.length + ' matérias da lista ficaram em preview/preview/preview', LOTE.filter(s => !t1[s]));
  ok(Object.keys(t1).length === LOTE.length, 'nenhuma linha fora da lista foi criada', Object.keys(t1).filter(s => !LOTE.includes(s)));
  { let falhaJose = [], vazou = [], audio = [];
    for (const s of LOTE) {
      const c = await cena(); const j = await chamar(c, 'JOSE', s);
      if (!(j.layout === true && j.pen === true && j.visual === true && j.audio === false)) falhaJose.push([s, F(j)]);
      if (c.chamadas.some(x => !x.startsWith('GET '))) falhaJose.push([s, 'chamada não-GET']);
      for (const p of PERSONAS) { const r = await chamar(await cena(), p, s); if (JSON.stringify(F(r)) !== JSON.stringify(NEG)) vazou.push([s, p, F(r)]); }
      for (const o of [{ semToken: true }, { tokenRuim: true }]) { const r = await chamar(await cena(), 'JOSE', s, o); if (JSON.stringify(F(r)) !== JSON.stringify(NEG)) vazou.push([s, JSON.stringify(o), F(r)]); }
      if ((await chamar(await cena(), 'JOSE', s)).audio) audio.push(s);
    }
    ok(falhaJose.length === 0, 'José (administrador, sem ter «comprado») recebe layout + caneta + tema em CADA matéria do lote, sem áudio, só com GET', falhaJose.slice(0, 3));
    ok(vazou.length === 0, 'aluno COM acesso, aluno sem acesso, 2.º testador (nas listas do piloto, não administrador), outro aluno, visitante sem token e token inválido: TUDO false em cada matéria', vazou.slice(0, 3));
    ok(audio.length === 0, 'áudio sempre false fora do piloto'); }
  { const r = await chamar(await cena(), 'JOSE', FORA); ok(JSON.stringify(F(r)) === JSON.stringify(NEG), 'matéria FORA do lote: nem José recebe nada', F(r)); }
  { const j = await chamar(await cena(), 'JOSE', 'semiologia-ii'); ok(j.layout === true && (await chamar(await cena(), 'ALUNO', 'semiologia-ii')).layout === false, 'piloto (semiologia-ii) segue por UID e não é afetado pelo lote'); }

  sec('4 · FALHA FECHADA depois do lote');
  { let aberto = [];
    for (const [nome, extra] of [['erro 500 na tabela', { erroTabela: true }], ['tabela inexistente', { tabela: null }], ['perfil sem resposta', { erroProfiles: true }]])
      for (const s of LOTE.slice(0, 5)) { const r = await chamar(await cena(extra), 'JOSE', s); if (JSON.stringify(F(r)) !== JSON.stringify(NEG)) aberto.push([nome, s, F(r)]); }
    ok(aberto.length === 0, 'erro de tabela, tabela ausente ou perfil sem resposta ⇒ tudo false, mesmo para José', aberto.slice(0, 3)); }

  sec('6 · VOLTA SEGURA');
  const promovida = LOTE[0], outra = LOTE[1];
  await db.query("update public.rm_materia_rollout set layout_stage='all' where slug=$1", [promovida]);   // José promoveu esta matéria a «all» DEPOIS do lote
  await run(volta, '3');
  const t2 = await tabela();
  ok(t2[promovida].layout_stage === 'all', 'matéria que José promoveu a «all» depois do lote NÃO é derrubada pela volta', t2[promovida]);
  { const a = await chamar(await cena(), 'ALUNO', promovida); const j = await chamar(await cena(), 'JOSE', promovida);
    ok(a.layout === true && a.pen === false && j.layout === true && j.pen === false, 'continua liberada: aluno com acesso e José veem o layout; caneta e tema voltaram a off', [F(a), F(j)]); }
  { const j = await chamar(await cena(), 'JOSE', outra), a = await chamar(await cena(), 'ALUNO', outra); ok(JSON.stringify(F(j)) === JSON.stringify(NEG) && JSON.stringify(F(a)) === JSON.stringify(NEG), 'as demais voltam a tudo false (José e aluno)', [F(j), F(a)]); }
  { let resto = []; for (const s of LOTE.slice(1)) { const r = await chamar(await cena(), 'JOSE', s); if (JSON.stringify(F(r)) !== JSON.stringify(NEG)) resto.push([s, F(r)]); }
    ok(resto.length === 0, 'em TODAS as outras matérias do lote José volta a false', resto.slice(0, 3)); }
  const ant = JSON.stringify(await tabela()); await run(volta, '3'); ok(JSON.stringify(await tabela()) === ant, 'a volta é idempotente');

  console.log('\nprevia-lote-acesso: ' + (n - ko) + '/' + n + ' verificações OK' + (ko ? ' — ' + ko + ' FALHAS' : ''));
  process.exit(ko ? 1 : 0);
})();
