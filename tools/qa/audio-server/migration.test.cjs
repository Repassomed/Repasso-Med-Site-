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
const LIM = path.join(MIG, '20261006_01_audiobooks_limite_40mib.sql');
const LIM_DOWN = path.join(MIG, '20261006_01_audiobooks_limite_40mib_rollback.sql');
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
const BARREIRA = 'audiobooks_deny_direct_access';
/* TODAS as policies de storage.objects, exceto a barreira própria */
const POL = db => q(db, `select coalesce(md5(string_agg(policyname||permissive||cmd||roles::text||coalesce(qual,'')||coalesce(with_check,''), ';' order by policyname)),'-') from pg_policies where schemaname='storage' and tablename='objects' and policyname <> '${BARREIRA}'`);
const N_BARREIRA = db => Number(q(db, `select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='${BARREIRA}'`));
const ESPERADO = 'audiobooks|audiobooks|false|31457280|{audio/mp4,audio/x-m4a}';
/* resultado da ÚLTIMA instrução, sob um papel (RLS vale); sessão com permissão de DELETE para isolar a RLS do trigger */
const como = (db, role, sql) => { const r = psql(db, `select set_config('storage.allow_delete_query','true',false); set role ${role}; ${sql}`); return { ok: r.ok, out: r.out.split('\n').pop(), err: r.err }; };
const contar = (db, role, bucket) => como(db, role, `select count(*) from storage.objects where bucket_id='${bucket || 'audiobooks'}'`).out;
const comObjetos = db => q(db, `insert into storage.objects (bucket_id, name) values ('audiobooks','semiologia-ii/a.m4a'),('audiobooks','semiologia-ii/b.m4a')`);

try {
  subir();

  sec('Fidelidade do teste: SEM a migration, policies amplas VAZAM (o teste enxerga o vazamento)');
  {
    const db = novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',false,31457280,array['audio/mp4','audio/x-m4a']);
      create policy zz_leak_sel on storage.objects for select to anon, authenticated using (true);
      create policy zz_leak_ins on storage.objects for insert to anon, authenticated with check (bucket_id is not null);
      create policy zz_leak_upd on storage.objects for update to anon, authenticated using (true) with check (true);
      create policy zz_leak_del on storage.objects for delete to anon, authenticated using (true);`);
    comObjetos(db);
    ok(contar(db, 'anon') === '2' && contar(db, 'authenticated') === '2', 'controle: anon e authenticated LEEM audiobooks sem a barreira');
    ok(como(db, 'anon', `insert into storage.objects (bucket_id,name) values ('audiobooks','h.m4a')`).ok, 'controle: anon CONSEGUE inserir sem a barreira');
    ok(como(db, 'anon', `with t as (update storage.objects set name = name||'x' where bucket_id='audiobooks' returning 1) select count(*) from t`).out === '3', 'controle: anon ALTERA objetos sem a barreira');
    ok(como(db, 'authenticated', `with t as (delete from storage.objects where bucket_id='audiobooks' returning 1) select count(*) from t`).out === '3', 'controle: authenticated APAGA objetos sem a barreira');
  }

  sec('Criação do zero, estado do bucket e definição da barreira');
  {
    const db = novoDb();
    ok(estado(db) === '' && N_BARREIRA(db) === 0, 'antes: sem bucket e sem barreira');
    const o0 = OUTROS(db), p0 = POL(db), j0 = OBJ_OUTROS(db);
    const r = psql(db, null, UP);
    ok(r.ok, 'a migration roda sem erro', r.err);
    ok(estado(db) === ESPERADO, 'bucket criado: privado, 30 MB, só audio/mp4 e audio/x-m4a', estado(db));
    const def = q(db, `select permissive||'|'||cmd||'|'||(select string_agg(r, ',' order by r) from unnest(roles::text[]) r)||'|'||qual||'|'||with_check from pg_policies where policyname='${BARREIRA}'`);
    ok(def === "RESTRICTIVE|ALL|anon,authenticated|(bucket_id IS DISTINCT FROM 'audiobooks'::text)|(bucket_id IS DISTINCT FROM 'audiobooks'::text)", 'a barreira é RESTRICTIVE, FOR ALL, anon+authenticated, USING e WITH CHECK negam audiobooks', def);
    ok(Number(q(db, `select count(*) from pg_policies where schemaname='storage' and tablename='objects' and permissive='PERMISSIVE' and policyname='${BARREIRA}'`)) === 0, 'a barreira NÃO é permissiva: não concede nada');
    ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0 && POL(db) === p0, 'nenhum outro bucket, objeto ou policy mudou');
  }

  /* 1–4: policies SELECT permissivas, antes E depois da migration */
  const AMPLAS = [
    ['1 · USING (true)', 'true'],
    ['2 · USING (bucket_id IS NOT NULL)', 'bucket_id is not null'],
    ['3 · USING (bucket_id = bucket_id)', 'bucket_id = bucket_id'],
    ['4 · USING (bucket_id <> \'outro\')', "bucket_id <> 'outro'"]
  ];
  for (const ordem of ['antes', 'depois']) {
    sec(`1–4 · policies SELECT amplas criadas ${ordem.toUpperCase()} da migration ⇒ 0 acesso a audiobooks`);
    for (const [nome, using] of AMPLAS) {
      const db = novoDb();
      const pol = `create policy zz_ampla on storage.objects for select to anon, authenticated using (${using})`;
      if (ordem === 'antes') q(db, pol);
      const r = psql(db, null, UP);
      if (ordem === 'depois') q(db, pol);
      comObjetos(db);
      ok(r.ok, `${nome}: a migration passa (não depende de ler o texto da policy)`, r.err);
      ok(contar(db, 'anon') === '0' && contar(db, 'authenticated') === '0', `${nome}: anon e authenticated veem 0 objetos de audiobooks`, [contar(db, 'anon'), contar(db, 'authenticated')]);
      ok(como(db, 'anon', `select count(*) from storage.objects where name like 'semiologia-ii/%'`).out === '0', `${nome}: nem filtrando por nome`);
      ok(como(db, 'authenticated', `select count(*) from storage.objects`).out === '3', `${nome}: os OUTROS buckets continuam visíveis pela policy (aportes 2 + publico 1)`, como(db, 'authenticated', `select count(*) from storage.objects`).out);
    }
  }
  {
    /* policy FOR ALL e TO public (vale para anon) também fica sem efeito */
    const db = novoDb(`create policy zz_all_public on storage.objects for all to public using (true) with check (true)`);
    psql(db, null, UP); comObjetos(db);
    ok(contar(db, 'anon') === '0' && contar(db, 'authenticated') === '0' && !como(db, 'anon', `insert into storage.objects (bucket_id,name) values ('audiobooks','h.m4a')`).ok, 'FOR ALL TO public (using true / check true): 0 leitura e 0 escrita em audiobooks');
  }

  sec('5 · policy legítima do bucket aportes continua funcionando');
  {
    const db = novoDb();
    const r = psql(db, null, UP);
    ok(r.ok, 'migration passa com as policies reais de aportes presentes');
    ok(contar(db, 'authenticated', 'aportes') === '2', 'authenticated lê os 2 objetos de aportes (aportes_select_own)');
    ok(como(db, 'authenticated', `insert into storage.objects (bucket_id,name) values ('aportes','u3/c.pdf')`).ok && contar(db, 'authenticated', 'aportes') === '3', 'authenticated insere em aportes (aportes_insert_own)');
    ok(contar(db, 'anon', 'aportes') === '0', 'anon continua sem acesso a aportes (como antes: não há policy para anon)');
    ok(!como(db, 'authenticated', `insert into storage.objects (bucket_id,name) values ('publico','h.png')`).ok, 'a barreira não concede nada: sem policy, publico continua negado ao authenticated');
  }

  sec('6 · INSERT amplo (WITH CHECK bucket_id IS NOT NULL) não insere em audiobooks');
  {
    const db = novoDb(`create policy zz_ins on storage.objects for insert to anon, authenticated with check (bucket_id is not null)`);
    psql(db, null, UP);
    for (const role of ['anon', 'authenticated']) {
      const r = como(db, role, `insert into storage.objects (bucket_id,name) values ('audiobooks','hack.m4a')`);
      ok(!r.ok && /row-level security/i.test(r.err), `${role}: INSERT em audiobooks negado pela RLS`, r.err.slice(0, 90));
      ok(como(db, role, `insert into storage.objects (bucket_id,name) values ('publico','ok-${role}.png')`).ok, `${role}: INSERT em OUTRO bucket (permitido pela policy ampla) continua funcionando`);
    }
    ok(Number(q(db, `select count(*) from storage.objects where bucket_id='audiobooks'`)) === 0, 'nada foi gravado em audiobooks');
  }

  sec('7 · UPDATE e DELETE amplos não alteram nem removem objetos de audiobooks');
  {
    const db = novoDb(`create policy zz_upd on storage.objects for update to anon, authenticated using (true) with check (true);
                       create policy zz_del on storage.objects for delete to anon, authenticated using (true);
                       create policy zz_sel on storage.objects for select to anon, authenticated using (true);`);
    psql(db, null, UP); comObjetos(db);
    const snap = () => q(db, `select string_agg(name||':'||bucket_id, ',' order by name) from storage.objects where bucket_id='audiobooks'`);
    const s0 = snap();
    for (const role of ['anon', 'authenticated']) {
      ok(como(db, role, `with t as (update storage.objects set name = name||'-x' where bucket_id='audiobooks' returning 1) select count(*) from t`).out === '0', `${role}: UPDATE em audiobooks afeta 0 linhas`);
      ok(como(db, role, `with t as (delete from storage.objects where bucket_id='audiobooks' returning 1) select count(*) from t`).out === '0', `${role}: DELETE em audiobooks afeta 0 linhas`);
      const mover = como(db, role, `update storage.objects set bucket_id='audiobooks' where bucket_id='publico'`);
      ok(!mover.ok && /row-level security/i.test(mover.err), `${role}: não consegue MOVER um objeto de outro bucket para audiobooks (WITH CHECK)`, mover.err.slice(0, 90));
    }
    ok(snap() === s0 && Number(q(db, `select count(*) from storage.objects where bucket_id='publico'`)) === 1, 'os objetos de audiobooks continuam idênticos e o de publico não foi movido');
    ok(como(db, 'anon', `with t as (update storage.objects set name = name||'-y' where bucket_id='publico' returning 1) select count(*) from t`).out === '1', 'UPDATE em OUTRO bucket continua permitido pela policy ampla (a barreira só tira audiobooks)');
  }

  sec('8 · service_role continua com acesso (é ela que assina a URL)');
  {
    const db = novoDb();
    psql(db, null, UP); comObjetos(db);
    ok(como(db, 'service_role', `select count(*) from storage.objects where bucket_id='audiobooks'`).out === '2', 'service_role lê os objetos de audiobooks');
    ok(como(db, 'service_role', `select name from storage.objects where bucket_id='audiobooks' and name='semiologia-ii/a.m4a'`).out === 'semiologia-ii/a.m4a', 'service_role resolve o objeto pelo caminho do manifesto (passo da assinatura)');
    ok(como(db, 'service_role', `insert into storage.objects (bucket_id,name) values ('audiobooks','semiologia-ii/c.m4a')`).ok, 'service_role grava (upload do processo do José)');
    ok(como(db, 'service_role', `with t as (update storage.objects set name = name where bucket_id='audiobooks' returning 1) select count(*) from t`).out === '3', 'service_role altera');
    ok(q(db, `select rolbypassrls from pg_roles where rolname='service_role'`) === 't', '(premissa) a service_role tem BYPASSRLS, por isso a barreira não a afeta');
    ok(q(db, `select count(*) from pg_policies where policyname='${BARREIRA}' and 'service_role' = any(roles::text[])`) === '0', 'a barreira nem se aplica à service_role');
  }

  sec('9 · idempotência (2× e 3×) + correções do bucket');
  {
    const db = novoDb();
    ok(psql(db, null, UP).ok, '1ª execução');
    comObjetos(db);
    const e1 = estado(db), p1 = POL(db), o1 = OUTROS(db);
    const r2 = psql(db, null, UP), r3 = psql(db, null, UP);
    ok(r2.ok && r3.ok, '2ª e 3ª execuções sem erro', r2.err + r3.err);
    ok(estado(db) === e1 && estado(db) === ESPERADO && Number(q(db, `select count(*) from storage.buckets where id='audiobooks'`)) === 1, 'bucket idêntico, 1 só');
    ok(N_BARREIRA(db) === 1 && Number(q(db, `select count(*) from pg_policies where schemaname='storage' and tablename='objects'`)) === Number(q(db, `select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname <> '${BARREIRA}'`)) + 1, 'continua exatamente 1 barreira (sem duplicar policies)');
    ok(Number(q(db, `select count(*) from storage.objects where bucket_id='audiobooks'`)) === 2, 'objetos já enviados intactos');
    ok(POL(db) === p1 && OUTROS(db) === o1, 'policies e buckets dos outros: idênticos');
    ok(contar(db, 'anon') === '0' && contar(db, 'authenticated') === '0', 'continua com 0 acesso para anon/authenticated');
    /* o bucket existente público / com limite e MIME errados é corrigido, e a barreira é reposta se alguém a alterar */
    for (const [nome, ins] of [
      ['público', `values ('audiobooks','audiobooks',true,31457280,array['audio/mp4','audio/x-m4a'])`],
      ['limite 50 MB + MIME mp3', `values ('audiobooks','audiobooks',false,52428800,array['audio/mpeg'])`],
      ['sem limite e sem MIME', `values ('audiobooks','audiobooks',false,null,null)`],
      ['público + limite e MIME errados', `values ('audiobooks','audiobooks',true,999999999,array['*/*'])`],
      ['MIME vazio {}', `values ('audiobooks','audiobooks',false,31457280,array[]::text[])`]
    ]) {
      const d = novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) ${ins}`);
      const ou = OUTROS(d);
      const r = psql(d, null, UP);
      ok(r.ok && estado(d) === ESPERADO && OUTROS(d) === ou, `bucket existente (${nome}) ⇒ corrigido, outros intactos`, estado(d) + r.err);
    }
    const dd = novoDb();
    psql(dd, null, UP);
    q(dd, `drop policy ${BARREIRA} on storage.objects; create policy ${BARREIRA} on storage.objects as permissive for select to anon using (true)`);   // alguém «adultera» a barreira
    ok(psql(dd, null, UP).ok && q(dd, `select permissive from pg_policies where policyname='${BARREIRA}'`) === 'RESTRICTIVE', 'barreira adulterada (permissiva) é substituída pela restritiva correta');
  }

  sec('Falha fechada: RLS desligada em storage.objects');
  {
    const db = novoDb(`alter table storage.objects disable row level security`);
    const o0 = OUTROS(db), p0 = POL(db);
    const r = psql(db, null, UP);
    ok(!r.ok && /RLS está desligada/.test(r.err), 'sem RLS a migration ABORTA com mensagem clara', r.err.slice(0, 160));
    ok(estado(db) === '' && N_BARREIRA(db) === 0 && OUTROS(db) === o0 && POL(db) === p0, 'e não cria bucket nem barreira (nada alterado)');
  }

  sec('10 · rollback: só artefatos próprios, objetos preservados, fail-closed');
  {
    /* decoys: nomes parecidos e outras restritivas/permissivas que NÃO podem ser tocadas */
    const DECOYS = `
      create policy audiobooks_deny_direct_access_v2 on storage.objects as restrictive for all to anon using (bucket_id is distinct from 'audiobooks');
      create policy zz_outra_restritiva on storage.objects as restrictive for select to authenticated using (name <> 'secreto');
      create policy zz_pol_aportes_extra on storage.objects for update to authenticated using (bucket_id = 'aportes') with check (bucket_id = 'aportes');
      create policy zz_pol_ampla on storage.objects for select to anon, authenticated using (true);`;
    {
      const db = novoDb(DECOYS);
      psql(db, null, UP);
      ok(N_BARREIRA(db) === 1, 'após a migration há 1 barreira');
      const o0 = OUTROS(db), j0 = OBJ_OUTROS(db), p0 = POL(db);
      ok(!psql(db, `delete from storage.buckets where id='audiobooks'`).ok, '(fidelidade) DELETE direto é bloqueado como no Supabase');
      const r = psql(db, null, DOWN);
      ok(r.ok && estado(db) === '', 'bucket VAZIO: rollback remove o bucket', r.err);
      ok(N_BARREIRA(db) === 0, 'e remove a barreira própria, pelo nome exato');
      ok(POL(db) === p0, 'TODAS as outras policies idênticas (aportes_*, service_all, nome parecido `…_v2`, restritiva alheia, ampla alheia)');
      ok(Number(q(db, `select count(*) from pg_policies where policyname in ('audiobooks_deny_direct_access_v2','zz_outra_restritiva','zz_pol_aportes_extra','zz_pol_ampla','aportes_select_own','aportes_insert_own','service_all')`)) === 7, 'as 7 policies de terceiros continuam lá');
      ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0, 'aportes e publico: buckets e objetos intactos');
      const r2 = psql(db, null, DOWN);
      ok(r2.ok, 'rollback repetido: sem erro (nada a fazer)', r2.err);
      const db4 = novoDb(); psql(db4, null, UP);
      const um = sh('psql', ['-X', '-q', '-h', SOCK, '-p', PORT, '-U', 'postgres', '-d', db4, '-At', '-v', 'ON_ERROR_STOP=0', '-f', DOWN, '-c', `delete from storage.buckets where id='aportes'`]);
      ok(/not allowed/.test(um.stderr || '') && Number(q(db4, `select count(*) from storage.buckets where id='aportes'`)) === 1 && estado(db4) === '', 'na mesma sessão, depois do rollback, apagar OUTRO bucket continua bloqueado (permissão local à transação)', um.stderr);
    }
    {
      const db = novoDb(DECOYS);
      psql(db, null, UP);
      q(db, `insert into storage.objects (bucket_id, name) values ('audiobooks','semiologia-ii/a.m4a'),('audiobooks','semiologia-ii/b.m4a'),('audiobooks','semiologia-ii/c.m4a')`);
      const est = estado(db), o0 = OUTROS(db), j0 = OBJ_OUTROS(db), p0 = POL(db);
      const r = psql(db, null, DOWN);
      ok(!r.ok && /ROLLBACK ABORTADO/.test(r.err) && /3 objeto/.test(r.err), 'bucket COM objetos: aborta com erro claro e a contagem', r.err.slice(0, 160));
      ok(q(db, `select string_agg(name, ',' order by name) from storage.objects where bucket_id='audiobooks'`) === 'semiologia-ii/a.m4a,semiologia-ii/b.m4a,semiologia-ii/c.m4a', 'os 3 objetos continuam, todos');
      ok(estado(db) === est && N_BARREIRA(db) === 1, 'bucket continua configurado E a barreira continua instalada (fail-closed)');
      ok(contar(db, 'anon') === '0' && contar(db, 'authenticated') === '0', 'anon/authenticated continuam com 0 acesso após o rollback abortado');
      ok(POL(db) === p0 && OUTROS(db) === o0 && OBJ_OUTROS(db) === j0, 'policies e buckets dos outros intactos');
      q(db, `select set_config('storage.allow_delete_query','true',false); delete from storage.objects where bucket_id='audiobooks'; select set_config('storage.allow_delete_query','false',false)`);
      ok(psql(db, null, DOWN).ok && estado(db) === '' && N_BARREIRA(db) === 0, 'esvaziado o bucket (pelo painel), o rollback conclui');
      const db2 = novoDb(); psql(db2, null, UP); q(db2, `insert into storage.objects (bucket_id, name) values ('audiobooks','so-um.m4a')`);
      ok(!psql(db2, null, DOWN).ok && estado(db2) === ESPERADO && N_BARREIRA(db2) === 1, 'um único objeto já impede o rollback (barreira mantida)');
    }
    {
      /* bucket já removido à mão mas a barreira ficou: o rollback remove só ela */
      const db = novoDb(); psql(db, null, UP);
      q(db, `select set_config('storage.allow_delete_query','true',false); delete from storage.buckets where id='audiobooks'`);
      const p0 = POL(db);
      ok(psql(db, null, DOWN).ok && N_BARREIRA(db) === 0 && POL(db) === p0, 'sem bucket: remove só a barreira própria');
    }
  }

  sec('H · nenhum outro bucket é alterado (migration + rollback, ciclo completo)');
  {
    const db = novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks-old','audiobooks-old',true,5,array['a/b']), ('audiobooks2','audiobooks2',true,5,array['a/b'])`);
    const o0 = OUTROS(db), j0 = OBJ_OUTROS(db), p0 = POL(db);
    ok(psql(db, null, UP).ok && psql(db, null, UP).ok && psql(db, null, DOWN).ok && psql(db, null, DOWN).ok, 'up, up, down, down sem erro');
    ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0 && POL(db) === p0, 'buckets parecidos, aportes e publico (buckets, objetos, policies) byte a byte iguais');
    ok(estado(db) === '' && N_BARREIRA(db) === 0, 'só o audiobooks e a barreira saíram');
  }

  sec('Limite 40 MiB (20261006_01): muda SÓ file_size_limit do audiobooks; falha fechada; reversível');
  {
    const E40 = 'audiobooks|audiobooks|false|41943040|{audio/mp4,audio/x-m4a}';
    const db = novoDb(); psql(db, null, UP);
    comObjetos(db);
    const o0 = OUTROS(db), j0 = OBJ_OUTROS(db), p0 = POL(db), pol0 = q(db, `select md5(string_agg(policyname||permissive||cmd||roles::text||coalesce(qual,'')||coalesce(with_check,''), ';' order by policyname)) from pg_policies where schemaname='storage'`);
    ok(estado(db) === ESPERADO, 'partida: bucket a 30 MiB (migration 20260930 aplicada)');
    let r = psql(db, null, LIM); ok(r.ok, 'a migration do limite roda sem erro', r.err);
    ok(estado(db) === E40, 'bucket: privado, 40 MiB (41943040), só audio/mp4 e audio/x-m4a', estado(db));
    ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0 && POL(db) === p0, 'nenhum outro bucket, objeto ou policy mudou');
    ok(q(db, `select md5(string_agg(policyname||permissive||cmd||roles::text||coalesce(qual,'')||coalesce(with_check,''), ';' order by policyname)) from pg_policies where schemaname='storage'`) === pol0 && N_BARREIRA(db) === 1, 'a barreira RESTRICTIVE continua igual (todas as policies byte a byte iguais)');
    ok(contar(db, 'anon') === '0' && contar(db, 'authenticated') === '0', 'anon e authenticated continuam sem enxergar nenhum objeto do audiobooks');
    ok(!como(db, 'anon', `insert into storage.objects (bucket_id,name) values ('audiobooks','h.m4a')`).ok && !como(db, 'authenticated', `insert into storage.objects (bucket_id,name) values ('audiobooks','h.m4a')`).ok, 'anon e authenticated continuam sem poder gravar no audiobooks');
    ok(psql(db, null, LIM).ok && estado(db) === E40, 'idempotente: rodar de novo mantém 40 MiB');
    ok(psql(db, null, UP).ok && estado(db) === ESPERADO, 'AVISO verificado: reexecutar a migration 20260930 volta o limite a 30 MiB (por isso a ordem importa)');
    ok(psql(db, null, LIM).ok && estado(db) === E40, '...e a do limite o devolve a 40 MiB');
    ok(psql(db, null, LIM_DOWN).ok && estado(db) === ESPERADO, 'rollback devolve SÓ o limite a 30 MiB');
    ok(OUTROS(db) === o0 && OBJ_OUTROS(db) === j0 && POL(db) === p0 && N_BARREIRA(db) === 1, 'após o rollback: nada mais mudou');
    psql(db, null, LIM);
    q(db, `update storage.objects set metadata = '{"size": 36758530}'::jsonb where bucket_id='audiobooks' and name='semiologia-ii/a.m4a'`);
    r = psql(db, null, LIM_DOWN);
    ok(!r.ok && /objeto\(s\) do bucket têm mais de 30 MiB/.test(r.err) && estado(db) === E40, 'rollback ABORTA se já há objeto maior que 30 MiB (nada alterado)', r.err);
  }
  {
    const casos = [
      ['sem o bucket', novoDb(), /não existe/],
      ['bucket PÚBLICO', novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',true,31457280,array['audio/mp4','audio/x-m4a'])`), /PÚBLICO/],
      ['MIME diferente', novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',false,31457280,array['audio/mp4'])`), /tipos permitidos/],
      ['limite inesperado (50 MiB)', novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',false,52428800,array['audio/mp4','audio/x-m4a'])`), /limite atual inesperado/],
      ['sem a barreira', novoDb(`insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('audiobooks','audiobooks',false,31457280,array['audio/mp4','audio/x-m4a'])`), /barreira/],
    ];
    for (const [nome, db, re] of casos) {
      const o0 = OUTROS(db), antes = estado(db), r = psql(db, null, LIM);
      ok(!r.ok && re.test(r.err), `falha fechada: ${nome}`, r.err); ok(estado(db) === antes && OUTROS(db) === o0, `falha fechada (${nome}): nada foi alterado`);
    }
  }

  sec('Texto das migrations (guarda estática)');
  {
    const up = fs.readFileSync(UP, 'utf8'), down = fs.readFileSync(DOWN, 'utf8');
    const upc = up.replace(/--.*$/gm, ''), downc = down.replace(/--.*$/gm, '');
    ok(!/do\s+nothing/i.test(upc) && /do\s+update/i.test(upc), 'a migration usa DO UPDATE (nunca DO NOTHING)');
    ok(/as\s+restrictive/i.test(upc) && /to\s+anon\s*,\s*authenticated/i.test(upc) && /using\s*\(bucket_id is distinct from 'audiobooks'\)/i.test(upc) && /with check\s*\(bucket_id is distinct from 'audiobooks'\)/i.test(upc), 'a barreira é RESTRICTIVE para anon/authenticated com USING e WITH CHECK');
    ok((upc.match(/create\s+policy/gi) || []).length === 1 && !/as\s+permissive/i.test(upc) && !/grant\s|alter\s+table|public\s*=\s*true/i.test(upc), 'a migration cria UMA policy (a restritiva), nenhuma permissiva, nenhum grant');
    ok(!/ilike|pg_policies\s+where[^;]*qual/i.test(upc.replace(/select \* into p from pg_policies[\s\S]*?policyname = 'audiobooks_deny_direct_access';/i, '')), 'a segurança NÃO depende de procurar texto («bucket_id») em outras policies');
    ok((upc.match(/drop\s+policy/gi) || []).length === 1 && /drop policy if exists audiobooks_deny_direct_access on storage\.objects/i.test(upc), 'a migration só apaga a própria barreira (nome exato)');
    ok(/delete\s+from\s+storage\.buckets\s+where\s+id\s*=\s*'audiobooks'/i.test(downc) && !/delete\s+from\s+storage\.objects/i.test(downc), 'o rollback tem um DELETE real, só do bucket audiobooks, e nunca apaga objetos');
    ok((downc.match(/drop\s+policy/gi) || []).length === 1 && /drop policy if exists audiobooks_deny_direct_access on storage\.objects/i.test(downc), 'o rollback só remove a policy própria, pelo nome exato');
    { const lim = fs.readFileSync(LIM, 'utf8').replace(/--.*$/gm, ''), limd = fs.readFileSync(LIM_DOWN, 'utf8').replace(/--.*$/gm, '');
      ok((lim.match(/update\s+storage\.buckets/gi) || []).length === 1 && /set\s+file_size_limit\s*=\s*41943040\s+where\s+id\s*=\s*'audiobooks'/i.test(lim), 'a migration do limite tem UM update, só file_size_limit, só do audiobooks');
      ok(!/create\s+policy|drop\s+policy|insert\s+into|delete\s+from|grant\s|alter\s+table|public\s*=\s*true|storage\.objects\s+set/i.test(lim.replace(/from storage\.objects/gi, '')) && !/\b(aportes|publico|flyers)\b/i.test(lim + limd), 'não cria/apaga policy, não insere, não torna nada público e não nomeia outro bucket');
      ok((limd.match(/update\s+storage\.buckets/gi) || []).length === 1 && /set\s+file_size_limit\s*=\s*31457280\s+where\s+id\s*=\s*'audiobooks'/i.test(limd) && !/delete\s+from/i.test(limd), 'o rollback do limite tem UM update só do audiobooks (31457280) e nenhum delete'); }
    ok(!/^\s*--\s*delete/im.test(down) && !/storage\.buckets[^;]*\b(aportes|publico)\b/i.test(upc + downc), 'DELETE não comentado; nenhum outro bucket é nomeado');
  }
} catch (e) { koN++; falhas.push('EXCEÇÃO: ' + (e && e.stack || e)); console.log('  ✗ EXCEÇÃO', e); }
finally { parar(); }

console.log(`\n${okN} verificações OK · ${koN} falhas`);
if (koN) { console.log('\nFALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
