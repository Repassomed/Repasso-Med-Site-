-- Banco ISOLADO de teste (Postgres real, sem relação com o Supabase de produção).
-- Emula só o que o Supabase fornece (roles, auth.uid(), grants padrão); a tabela user_ink_strokes,
-- as constraints e as POLICIES vêm da migration REAL (20260913_09_study_tools_v2.sql), aplicada sem alteração.
drop schema if exists public cascade; create schema public;
drop schema if exists auth cascade;   create schema auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
-- igual ao Supabase: auth.uid() lê o claim 'sub' do JWT que o PostgREST publica em request.jwt.claims
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(coalesce(current_setting('request.jwt.claim.sub', true), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid $$;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
-- dependências mínimas da migration (não são o objeto do teste)
create table public.profiles (id uuid primary key, email text, is_active boolean not null default true);
create table public.user_highlights (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  subject_slug text not null, block_id text, exact_text text, prefix text, suffix text, occurrence int, color text,
  created_at timestamptz not null default now(), constraint user_highlights_color_valid check (color in ('red','blue','green','pink')));
-- a migration real semeia estes dois UIDs em study_tools_beta (FK em profiles): perfis de teste com os mesmos ids
insert into public.profiles (id, email) values ('d4d215d3-36dd-4efb-8869-bdea5376c648','jose-test@invalid'), ('448e4d63-e410-48ed-8c71-8e99af317d3e','tester2-test@invalid');
