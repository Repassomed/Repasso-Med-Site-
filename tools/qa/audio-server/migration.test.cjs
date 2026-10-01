#!/usr/bin/env node
/* Migration + rollback do bucket `audiobooks`, executados num PostgreSQL 16 REAL e descartável
   (cluster temporário em /tmp, socket Unix, sem rede) sobre uma RÉPLICA mínima do esquema `storage`
   do Supabase (buckets, objects com FK + RLS + grants, trigger protect_delete, roles anon/authenticated/
   service_role). Não toca em nenhum Supabase. Requer os binários do PostgreSQL 16 (initdb/pg_ctl/psql). */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const MIG = path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia', 'supabase', 'migrations');
const UP = path.join(MIG, '20260930_01_audiobooks_bucket_privado.sql');
const DOWN = path.join(MIG, '20260930_01_audiobooks_bucket_privado_rollback.sql');
const PGBIN = process.env.RM_PGBIN || '/usr/lib/postgresql/16/bin';
const DATA = '/tmp/rm-pgtest-data', SOCK = '/tmp/rm-pgtest-sock', PORT = '54331';

let okN = 0, koN = 0; const falhas = [];
const ok = (c, n, x) => { if (c) okN++; else { koN++; falhas.push(n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);

function sh(cmd, args, o) { return cp.spawnSync(cmd, args, Object.assign({ encoding: 'utf8' }, o || {})); }
function asNobody(args) { return process.getuid && process.getuid() === 0 ? sh('runuser', ['-u', 'nobody', '--'].concat(args)) : sh(args[0], args.slice(1)); }

function subir() {
  if (!fs.existsSync(path.join(PGBIN, 'initdb')) || !fs.existsSync(path.join(PGBIN, 'pg_ctl')) || sh('psql', ['--version']).status !== 0) {
    console.log('PostgreSQL 16 não encontrado (initdb/pg_ctl/psql). Defina RM_PGBIN. Teste NÃO executado.'); process.exit(2);
  }
  sh('rm', ['-rf', DATA, SOCK]); fs.mkdirSync(DATA, { recursive: true }); fs.mkdirSync(SOCK, { recursive: true });
  if (process.getuid && process.getuid() === 0) sh('chown', ['nobody', DATA, SOCK]);
  let r = asNobody([path.join(PGBIN, 'initdb'), '-D', DATA, '-A', 'trust', '-U', 'postgres']);
  if (r.status !== 0) { console.log(r.stderr); process.exit(2); }
  r = asNobody([path.join(PGBIN, 'pg_ctl'), '-D', DATA, '-o', `-p ${PORT} -k ${SOCK} -c listen_addresses=''`, '-l', '/tmp/rm-pgtest.log', '-w', 'start']);
  if (r.status !== 0) { console.log(r.stdout, r.stderr); process.exit(2); }
  for (const s of ['create role anon nologin', 'create role authenticated nologin', 'create role service_role nologin bypassrls']) { const x = psql('postgres', s); if (!x.ok) { console.log(x.err); process.exit(2); } }
}
function parar() { asNobody([path.join(PGBIN, 'pg_ctl'), '-D', DATA, 'stop', '-m', 'fast']); sh('rm', ['-rf', DATA, SOCK]); }

/* psql: devolve {ok, out, err}. ON_ERROR_STOP: o 1.º erro aborta. */
function psql(db, sql, file) {
  const args = ['-X', '-q', '-h', SOCK, '-p', PORT, '-U', 'postgres', '-d', db, '-At', '-v', 'ON_ERROR_STOP=1'];
  const r = file ? sh('psql', args.concat(['-f', file])) : sh('psql', args.concat(['-c', sql]));
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
const q = (db, sql) => { const r = psql(db, sql); if (!r.ok) throw new Error(r.err); return r.out; };

/* Réplica mínima do esquema storage do Supabase (colunas/constraints/RLS/trigger relevantes). */
const ESQUEMA = `
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null unique, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
    public boolean default false, avif_autodetection boolean default false, file_size_limit bigint, allowed_mime_types text[], owner_id text);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text,
    owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(), metadata jsonb);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated, service_role;
  /* o Supabase bloqueia DELETE direto, salvo com storage.allow_delete_query = true */
  create function storage.protect_delete() returns trigger language plpgsql as $f$
  begin
    if coalesce(current_setting('storage.allow_delete_query', true), 'false') <> 'true' then
      raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.';
    end if;
    return old;
  end $f$;
  create trigger protect_buckets_delete before delete on storage.buckets for each statement execute function storage.protect_delete();
  create trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();
  create policy service_all on storage.objects for all to service_role using (true) with check (true);
`;
let n = 0;
function novoDb(extra) {
  const db = 'm' + (++n);
  q('postgres', `create database ${db}`);
  q(db, ESQUEMA);
  /* outros buckets REAIS do projeto + um público, com policy própria, para provar que nada vaza/muda */
  q(db, `
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('aportes','aportes',false,10485760,array['application/pdf']),
      ('publico','publico',true,52428800,null);
    create policy aportes_select_own on storage.objects for select to authenticated using (bucket_id = 'aportes');
    create policy aportes_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'aportes');
    insert into storage.objects (bucket_id, name) values ('aportes','u1/a.pdf'),('aportes','u2/b.pdf'),('publico','x.png');
  `);
  if (extra) q(db, extra);
  return db;
}
const estado = db => q(db, `select id||'|'||name||'|'||public||'|'||coalesce(file_size_limit::text,'null')||'|'||coalesce(allowed_mime_types::text,'null') from storage.buckets where id='audiobooks'`);
const OUTROS = db => q(db, `select md5(string_agg(b::text, ';' order by id)) from (select id,name,owner,public,avif_autodetection,file_size_limit,allowed_mime_types,owner_id from storage.buckets where id <> 'audiobooks') b`);
const OBJ_OUTROS = db => q(db, `select count(*)||'/'||md5(string_agg(name, ',' order by name)) from storage.objects where bucket_id <> 'audiobooks'`);
const POL = db => q(db, `select md5(string_agg(policyname||cmd||roles::text||coalesce(qual,'')||coalesce(with_check,''), ';' order by policyname)) from pg_policies where schemaname='storage' and tablename='objects' and policyname not like 'zz_%'`);
const POL_AUDIO = db => Number(q(db, `select count(*) from pg_policies where schemaname='storage' and tablename='objects' and roles && array['public','anon','authenticated']::name[] and (coalesce(qual,'') ilike '%audiobooks%' or coalesce(with_check,'') ilike '%audiobooks%')`));
const ESPERADO = 'audiobooks|audiobooks|false|31457280|{audio/mp4,audio/x-m4a}';

try {
  subir();

  sec('A · criação do zero');
  {
    const db = novoDb();
    ok(estado(db) === '', 'antes: o bucket não existe');
    const o0 = OUTROS(db), p0 = POL(db), j0 = OBJ_OUTROS(db);
    const r = psql(db, null, UP);
    ok(r.ok, 'a migration roda sem erro', r.err);
    ok(estado(db) === ESPERADO, 'bucket criado: privado, 30 MB (31457280), só audio/mp4 e audio/x-m4a', estado(db));
    ok(POL_AUDIO(db) === 0, 'nenhuma policy public/anon/authenticated menciona audiobooks');
    ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0 && POL(db) === p0, 'H · nenhum outro bucket, objeto ou policy mudou');
  }

  sec('B · segunda execução (idempotência)');
  {
    const db = novoDb();
    psql(db, null, UP);
    q(db, `insert into storage.objects (bucket_id, name) values ('audiobooks','semiologia-ii/x.v1.m4a')`);
    const o0 = OUTROS(db), p0 = POL(db);
    const r1 = psql(db, null, UP), r2 = psql(db, null, UP);
    ok(r1.ok && r2.ok, 'rodar de novo (2×) não dá erro', r1.err + r2.err);
    ok(estado(db) === ESPERADO && Number(q(db, `select count(*) from storage.buckets where id='audiobooks'`)) === 1, 'continua exatamente 1 bucket, no mesmo estado');
    ok(Number(q(db, `select count(*) from storage.objects where bucket_id='audiobooks'`)) === 1, 'os objetos já enviados NÃO são tocados');
    ok(OUTROS(db) === o0 && POL(db) === p0, 'H · outros buckets e policies idênticos');
  }

  sec('C · bucket existente PÚBLICO → privado');
  {
    const db = novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',true,31457280,array['audio/mp4','audio/x-m4a'])`);
    ok(estado(db).split('|')[2] === 'true', 'antes: public = true');
    const o0 = OUTROS(db);
    const r = psql(db, null, UP);
    ok(r.ok && estado(db) === ESPERADO, 'depois: public = false (e o resto igual)', estado(db) + r.err);
    ok(OUTROS(db) === o0 && q(db, `select public from storage.buckets where id='publico'`) === 't', 'o bucket `publico` (que É público) continua público e intacto');
    /* acesso real por role: anon/authenticated não leem nada de audiobooks */
    q(db, `insert into storage.objects (bucket_id, name) values ('audiobooks','semiologia-ii/a.m4a')`);
    ok(q(db, `set role anon; select count(*) from storage.objects where bucket_id='audiobooks'`).split('\n').pop() === '0', 'anon enxerga 0 objetos de audiobooks');
    ok(q(db, `set role authenticated; select count(*) from storage.objects where bucket_id='audiobooks'`).split('\n').pop() === '0', 'authenticated enxerga 0 objetos de audiobooks');
    ok(!psql(db, `set role authenticated; insert into storage.objects (bucket_id, name) values ('audiobooks','hack.m4a')`).ok, 'authenticated NÃO consegue gravar em audiobooks (RLS)');
    ok(!psql(db, `set role anon; insert into storage.objects (bucket_id, name) values ('audiobooks','hack.m4a')`).ok, 'anon NÃO consegue gravar em audiobooks (RLS)');
    ok(q(db, `set role service_role; select count(*) from storage.objects where bucket_id='audiobooks'`).split('\n').pop() === '1', 'a service_role (servidor) continua a ver o objeto (é por ela que o URL assinado é criado)');
    ok(q(db, `set role authenticated; select count(*) from storage.objects where bucket_id='aportes'`).split('\n').pop() === '2', 'o bucket aportes segue legível pela sua própria policy (não regrediu)');
  }

  sec('D · limite e MIME antigos/errados → corrigidos');
  {
    for (const [nome, ins] of [
      ['limite 50 MB + MIME mp3', `values ('audiobooks','audiobooks',false,52428800,array['audio/mpeg'])`],
      ['sem limite e sem MIME (null)', `values ('audiobooks','audiobooks',false,null,null)`],
      ['limite 1 KB + MIME vários', `values ('audiobooks','audiobooks',false,1024,array['audio/mp4','image/png','application/pdf'])`],
      ['público + limite e MIME errados', `values ('audiobooks','audiobooks',true,999999999,array['*/*'])`],
      ['MIME vazio {}', `values ('audiobooks','audiobooks',false,31457280,array[]::text[])`]
    ]) {
      const db = novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) ${ins}`);
      const o0 = OUTROS(db);
      const r = psql(db, null, UP);
      ok(r.ok && estado(db) === ESPERADO, `corrigido: ${nome}`, estado(db) + r.err);
      ok(OUTROS(db) === o0, `   (e nenhum outro bucket mudou) — ${nome}`);
    }
  }

  sec('E · zero policy anon/authenticated/public sobre audiobooks');
  {
    /* policies antigas «vazadas» que citam o bucket → removidas; as dos outros buckets → preservadas */
    const db = novoDb(`
      create policy zz_anon_audio on storage.objects for select to anon using (bucket_id = 'audiobooks');
      create policy zz_auth_audio on storage.objects for all to authenticated using (bucket_id = 'audiobooks') with check (bucket_id = 'audiobooks');
      create policy zz_pub_audio on storage.objects for select to public using (bucket_id = 'audiobooks' and name like 'semiologia-ii/%');
      create policy zz_auth_ins_audio on storage.objects for insert to authenticated with check (bucket_id = 'audiobooks');
      insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',true,null,null);
      insert into storage.objects (bucket_id, name) values ('audiobooks','semiologia-ii/a.m4a');`);
    ok(POL_AUDIO(db) === 4 && q(db, `set role anon; select count(*) from storage.objects where bucket_id='audiobooks'`).split('\n').pop() === '1', 'antes: 4 policies vazadas e o anon LÊ o áudio');
    const p0 = q(db, `select md5(string_agg(policyname, ',' order by policyname)) from pg_policies where schemaname='storage' and tablename='objects' and policyname not like 'zz_%'`);
    const r = psql(db, null, UP);
    ok(r.ok && estado(db) === ESPERADO, 'a migration passa e corrige o bucket', r.err);
    ok(POL_AUDIO(db) === 0, 'depois: 0 policies sobre audiobooks');
    ok(q(db, `set role anon; select count(*) from storage.objects where bucket_id='audiobooks'`).split('\n').pop() === '0' && !psql(db, `set role authenticated; insert into storage.objects (bucket_id,name) values ('audiobooks','h.m4a')`).ok, 'depois: o anon já não lê e o authenticated não grava');
    ok(q(db, `select md5(string_agg(policyname, ',' order by policyname)) from pg_policies where schemaname='storage' and tablename='objects' and policyname not like 'zz_%'`) === p0, 'as policies dos OUTROS buckets (aportes, service_role) ficaram idênticas');
    ok(Number(q(db, `select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('aportes_select_own','aportes_insert_own')`)) === 2, 'aportes_select_own e aportes_insert_own continuam lá');
  }
  {
    /* policy AMPLA (sem bucket_id) para authenticated: a migration ABORTA e não altera nada */
    const db = novoDb(`
      create policy zz_ampla on storage.objects for select to authenticated using (true);
      insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',true,1,array['x/y']);`);
    const antes = estado(db), o0 = OUTROS(db), p0 = POL(db);
    const r = psql(db, null, UP);
    ok(!r.ok && /MIGRATION ABORTADA/.test(r.err) && /zz_ampla/.test(r.err), 'policy ampla (using true) ⇒ aborta com mensagem clara e o nome da policy', r.err.slice(0, 200));
    ok(estado(db) === antes && OUTROS(db) === o0 && POL(db) === p0, 'abortou SEM alterar nada (bucket continua como estava; atomicidade)');
    q(db, `drop policy zz_ampla on storage.objects`);
    ok(psql(db, null, UP).ok && estado(db) === ESPERADO, 'removida a policy ampla, a migration passa');
    /* policy ampla só de INSERT (with_check true) também aborta */
    const db2 = novoDb(`create policy zz_ampla2 on storage.objects for insert to anon with check (true)`);
    ok(!psql(db2, null, UP).ok && estado(db2) === '', 'policy ampla de INSERT para anon também aborta (e não cria o bucket)');
    /* policy ampla só para service_role NÃO conta */
    const db3 = novoDb();
    ok(psql(db3, null, UP).ok, 'a policy `service_all using(true)` da service_role não bloqueia (não é public/anon/authenticated)');
  }

  sec('F · rollback com bucket VAZIO');
  {
    const db = novoDb();
    psql(db, null, UP);
    ok(!psql(db, `delete from storage.buckets where id='audiobooks'`).ok, '(fidelidade) DELETE direto é bloqueado como no Supabase');
    const o0 = OUTROS(db), j0 = OBJ_OUTROS(db), p0 = POL(db);
    const r = psql(db, null, DOWN);
    ok(r.ok && estado(db) === '', 'rollback remove o bucket audiobooks vazio', r.err);
    ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0 && POL(db) === p0, 'H · aportes e publico (buckets, objetos, policies) intactos');
    const r2 = psql(db, null, DOWN);
    ok(r2.ok, 'rodar o rollback de novo: sem erro (nada a fazer)', r2.err);
    /* a permissão de apagar fica só na transação do rollback */
    /* na MESMA sessão: rollback e logo a seguir um DELETE em outro bucket — a permissão não pode ter vazado */
    const db4 = novoDb(); psql(db4, null, UP);
    const um = sh('psql', ['-X', '-q', '-h', SOCK, '-p', PORT, '-U', 'postgres', '-d', db4, '-At', '-v', 'ON_ERROR_STOP=0', '-f', DOWN, '-c', `delete from storage.buckets where id='aportes'`]);
    ok(/not allowed/.test(um.stderr || '') && Number(q(db4, `select count(*) from storage.buckets where id='aportes'`)) === 1 && estado(db4) === '', 'na mesma sessão, depois do rollback, apagar OUTRO bucket continua bloqueado (a permissão é local à transação)', um.stderr);
  }

  sec('G · rollback com bucket COM objetos — não destrói nada');
  {
    const db = novoDb();
    psql(db, null, UP);
    q(db, `insert into storage.objects (bucket_id, name) values ('audiobooks','semiologia-ii/a.m4a'),('audiobooks','semiologia-ii/b.m4a'),('audiobooks','semiologia-ii/c.m4a')`);
    const est = estado(db), o0 = OUTROS(db), j0 = OBJ_OUTROS(db), p0 = POL(db);
    const r = psql(db, null, DOWN);
    ok(!r.ok && /ROLLBACK ABORTADO/.test(r.err) && /3 objeto/.test(r.err), 'aborta com erro claro, dizendo quantos objetos há', r.err.slice(0, 200));
    ok(Number(q(db, `select count(*) from storage.objects where bucket_id='audiobooks'`)) === 3 && q(db, `select string_agg(name, ',' order by name) from storage.objects where bucket_id='audiobooks'`) === 'semiologia-ii/a.m4a,semiologia-ii/b.m4a,semiologia-ii/c.m4a', 'os 3 objetos continuam, todos');
    ok(estado(db) === est, 'o bucket continua configurado (privado, 30 MB, M4A)');
    ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0 && POL(db) === p0, 'H · nada mais mudou');
    /* depois de esvaziar pelo «painel» (service_role + allow_delete_query), o rollback passa */
    q(db, `select set_config('storage.allow_delete_query','true',false); delete from storage.objects where bucket_id='audiobooks'; select set_config('storage.allow_delete_query','false',false)`);
    ok(psql(db, null, DOWN).ok && estado(db) === '', 'esvaziado o bucket, o rollback remove-o');
    /* um único objeto basta para abortar */
    const db2 = novoDb(); psql(db2, null, UP); q(db2, `insert into storage.objects (bucket_id, name) values ('audiobooks','so-um.m4a')`);
    ok(!psql(db2, null, DOWN).ok && estado(db2) === ESPERADO, 'um único objeto já impede o rollback');
  }

  sec('H · nenhum outro bucket é alterado (migration + rollback, ciclo completo)');
  {
    const db = novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks-old','audiobooks-old',true,5,array['a/b']), ('audiobooks2','audiobooks2',true,5,array['a/b'])`);
    const o0 = OUTROS(db), j0 = OBJ_OUTROS(db), p0 = POL(db);
    ok(psql(db, null, UP).ok && psql(db, null, UP).ok && psql(db, null, DOWN).ok && psql(db, null, DOWN).ok, 'up, up, down, down sem erro');
    ok(OUTROS(db) === o0, 'buckets parecidos (`audiobooks-old`, `audiobooks2`), `aportes` e `publico` byte a byte iguais');
    ok(OBJ_OUTROS(db) === j0 && POL(db) === p0, 'objetos e policies dos outros buckets idênticos');
    ok(estado(db) === '', 'só o audiobooks saiu');
  }

  sec('Texto das migrations (guarda estática)');
  {
    const up = fs.readFileSync(UP, 'utf8'), down = fs.readFileSync(DOWN, 'utf8');
    const upc = up.replace(/--.*$/gm, ''), downc = down.replace(/--.*$/gm, '');
    ok(!/do\s+nothing/i.test(upc) && /do\s+update/i.test(upc), 'a migration usa DO UPDATE (nunca DO NOTHING)');
    ok(!/create\s+policy|grant\s|alter\s+table|public\s*=\s*true/i.test(upc), 'a migration não cria policy/grant nem põe public=true');
    ok(/delete\s+from\s+storage\.buckets\s+where\s+id\s*=\s*'audiobooks'/i.test(downc) && !/delete\s+from\s+storage\.objects/i.test(downc), 'o rollback tem um DELETE real, só do bucket audiobooks, e nunca apaga objetos');
    ok(!/^\s*--\s*delete/im.test(down), 'o DELETE do rollback NÃO está comentado');
    ok(!/storage\.buckets[^;]*\b(aportes|publico)\b/i.test(upc + downc), 'nenhum outro bucket é nomeado');
  }
} catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
finally { parar(); }

console.log(`\n${okN} verificações OK · ${koN} falhas`);
if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
