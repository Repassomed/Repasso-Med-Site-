/* PRÉVIA EM LOTE — prova, num Postgres LOCAL em memória (PGlite; nenhum Supabase, nenhuma escrita real), que docs/nova-era-temas/previa-lote.sql:
   (1) nunca reduz nem desliga o que já está em preview/all; (2) só promove 'off'→'preview'; (3) a volta devolve a 'off' só o que o lote promoveu; (4) idempotência;
   (5) cria linha nova para matéria ausente e a volta a deixa em off (= ausente); (6) matéria fora da lista não é tocada.
   Uso: node tools/qa/nova-era/previa-lote.test.cjs   (precisa de @electric-sql/pglite: PGLITE_DIR=<pasta com node_modules>) */
'use strict';
const fs = require('fs'), path = require('path');
const dir = process.env.PGLITE_DIR || process.cwd();
const { PGlite } = require(path.join(dir, 'node_modules/@electric-sql/pglite'));
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } return !!c; };
const SQL = fs.readFileSync(path.join(__dirname, '../../../docs/nova-era-temas/previa-lote.sql'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../../../docs/nova-era-temas/previa-lote-volta.sql'), 'utf8');
/* blocos numerados pelo comentário «-- N)» */
const blocos = {}; SQL.split(/^-- (\d)\) /m).slice(1).reduce((_, v, i, a) => { if (i % 2 === 0) blocos[v] = a[i + 1]; return 0; }, 0);
const stmt = k => blocos[k].split('\n').slice(1).filter(l => !/^--/.test(l)).join('\n').split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean);
(async () => {
  const db = new PGlite();
  await db.exec(`create table public.rm_materia_rollout (slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
    layout_stage text not null default 'off' check (layout_stage in ('off','preview','all')), pen_stage text not null default 'off' check (pen_stage in ('off','preview','all')),
    visual_stage text not null default 'off' check (visual_stage in ('off','preview','all')), nota text, atualizado_em timestamptz not null default now());`.replace('create table public.', 'create schema if not exists public; create table public.'));
  const seed = async rows => { await db.exec('delete from public.rm_materia_rollout'); for (const r of rows) await db.query('insert into public.rm_materia_rollout (slug,layout_stage,pen_stage,visual_stage,nota) values ($1,$2,$3,$4,$5)', r); };
  const estado = async () => Object.fromEntries((await db.query('select slug,layout_stage l,pen_stage p,visual_stage v,nota from public.rm_materia_rollout order by slug')).rows.map(r => [r.slug, r]));
  const ordem = { off: 0, preview: 1, all: 2 };
  const rodar = async k => { for (const s of stmt(k)) await db.exec(s); };
  /* estados MISTURADOS: ausente (biologia) · parcialmente liberada com nota (embriologia) · tudo off (ap1p) · totalmente liberada aos alunos (histologia-i) · prévia manual parcial (outra) · fora da lista (medicina-familiar, neurologia) */
  const SEED = [
    ['embriologia', 'all', 'preview', 'off', 'nota do José'], ['anatomia-patologica-practica', 'off', 'off', 'off', null], ['histologia-i', 'all', 'all', 'all', null],
    ['medicina-familiar', 'preview', 'off', 'off', 'piloto'], ['neurologia', 'all', 'all', 'off', null]
  ];
  console.log('\n▸ ligar com estados misturados');
  await seed(SEED); const antes = await estado();
  await rodar('1'); const dep = await estado();
  ok(!dep.biologia === false && dep.biologia.l === 'preview' && dep.biologia.p === 'preview' && dep.biologia.v === 'preview', 'matéria ausente: linha criada em preview', dep.biologia);
  ok(dep.embriologia.l === 'all' && dep.embriologia.p === 'preview' && dep.embriologia.v === 'preview', 'embriologia: layout «all» INTACTO; pen «preview» intacto; visual off→preview', dep.embriologia);
  ok(dep.embriologia.nota.startsWith('nota do José') && /\[previa-lote:visual\]/.test(dep.embriologia.nota), 'a nota que já existia é preservada e o lote anota só o que promoveu (visual)', dep.embriologia.nota);
  ok(dep['anatomia-patologica-practica'].l === 'preview' && dep['anatomia-patologica-practica'].p === 'preview' && dep['anatomia-patologica-practica'].v === 'preview', 'tudo off → tudo preview');
  ok(JSON.stringify(dep['histologia-i']) === JSON.stringify(antes['histologia-i']), 'matéria TOTALMENTE liberada aos alunos (all/all/all): linha idêntica, nada reduzido', dep['histologia-i']);
  ok(JSON.stringify(dep['medicina-familiar']) === JSON.stringify(antes['medicina-familiar']) && JSON.stringify(dep.neurologia) === JSON.stringify(antes.neurologia), 'matérias fora da lista (inclusive com «all») não são tocadas');
  let reduziu = []; for (const [s, a] of Object.entries(antes)) for (const c of ['l', 'p', 'v']) if (ordem[dep[s][c]] < ordem[a[c]]) reduziu.push([s, c]);
  ok(reduziu.length === 0, 'NENHUMA coluna de NENHUMA matéria foi reduzida', reduziu);
  console.log('\n▸ idempotência da ida');
  await rodar('1'); const dep2 = await estado(); ok(JSON.stringify(dep2) === JSON.stringify(dep), 'rodar o lote de novo não muda nada (nota não duplica)');
  console.log('\n▸ volta segura');
  /* depois do lote, José libera aos alunos o layout de ap1p (preview→all) e liga a mão a caneta de uma matéria que o lote tinha promovido */
  await db.exec(`update public.rm_materia_rollout set layout_stage='all' where slug='anatomia-patologica-practica'`);
  await rodar('3'); const vol = await estado();
  ok(vol['anatomia-patologica-practica'].l === 'all', 'layout que José liberou aos alunos depois do lote NÃO é derrubado pela volta', vol['anatomia-patologica-practica']);
  ok(vol['anatomia-patologica-practica'].p === 'off' && vol['anatomia-patologica-practica'].v === 'off', 'o que o lote promoveu e continua em preview volta a off');
  ok(vol.embriologia.l === 'all' && vol.embriologia.p === 'preview' && vol.embriologia.v === 'off', 'embriologia: só o visual (que o lote promoveu) volta; layout all e pen preview anteriores ao lote ficam', vol.embriologia);
  ok(vol.embriologia.nota === 'nota do José', 'a nota original é restaurada sem o marcador', vol.embriologia.nota);
  ok(JSON.stringify(vol['histologia-i']) === JSON.stringify(antes['histologia-i']) && JSON.stringify(vol['medicina-familiar']) === JSON.stringify(antes['medicina-familiar']) && JSON.stringify(vol.neurologia) === JSON.stringify(antes.neurologia), 'histologia-i (all), medicina-familiar e neurologia idênticas ao estado de antes de tudo');
  ok(vol.biologia.l === 'off' && vol.biologia.p === 'off' && vol.biologia.v === 'off' && vol.biologia.nota === null, 'matéria criada pelo lote volta a tudo off (equivale a ausente: «linha ausente = off»)', vol.biologia);
  await rodar('3'); ok(JSON.stringify(await estado()) === JSON.stringify(vol), 'a volta é idempotente');
  console.log('\n▸ prévia manual preexistente não é desligada');
  await seed([['anatomia-patologica-practica', 'preview', 'off', 'off', null]]);
  await rodar('1'); await rodar('3'); const m = await estado();
  ok(m['anatomia-patologica-practica'].l === 'preview' && m['anatomia-patologica-practica'].p === 'off' && m['anatomia-patologica-practica'].v === 'off', 'layout que já estava em preview ANTES do lote continua em preview depois da volta (o lote não o promoveu)', m['anatomia-patologica-practica']);
  console.log('\n▸ o bloco 0 (só leitura) lista o que seria promovido e não escreve');
  await seed(SEED); const pre = await estado(); const r0 = await db.query(stmt('0')[0]); const ap = r0.rows.find(r => r.slug === 'embriologia');
  ok(ap && ap.o_lote_vai_promover === 'visual', 'embriologia: o simulador mostra que só «visual» seria promovido', ap);
  ok(JSON.stringify(await estado()) === JSON.stringify(pre), 'o bloco 0 não alterou nenhuma linha');
  console.log(`\nprevia-lote: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
})();
