-- =====================================================================
-- Audiobooks · bucket PRIVADO `audiobooks`  (NÃO APLICADO — só por ordem do José)
--
-- O que faz: deixa o bucket `audiobooks` SEMPRE neste estado, não importa
-- como ele estava antes (inexistente, público, com limite/MIME antigos):
--     public            = false
--     file_size_limit   = 31457280  (30 MB)
--     allowed_mime_types= {audio/mp4, audio/x-m4a}   (só M4A)
-- e instala UMA barreira — a policy RESTRICTIVE `audiobooks_deny_direct_access`
-- em storage.objects — que impede anon/authenticated de ler, gravar, alterar ou
-- apagar objetos do bucket `audiobooks`, QUALQUER que seja o conjunto de policies
-- permissivas que existam hoje ou venham a existir amanhã.
--
-- Por que RESTRICTIVE (e não «procurar a palavra bucket_id»)
--   No Postgres, para um papel ter acesso a uma linha é preciso passar em pelo
--   menos UMA policy permissiva E em TODAS as restritivas. A barreira só
--   restringe; nunca concede nada. Assim, `using (true)`, `using (bucket_id is
--   not null)`, `using (bucket_id = bucket_id)`, `using (bucket_id <> 'x')`,
--   `with check (bucket_id is not null)`, policies `for all`/`update`/`delete`
--   de public/anon/authenticated… NÃO conseguem alcançar `audiobooks`. A garantia
--   não depende do TEXTO de nenhuma outra policy. A service_role (BYPASSRLS, só
--   no servidor) não é afetada: é por ela que a função Netlify `get-audio-url`
--   cria a URL assinada, depois de checar o UID autenticado + o manifesto.
--   A barreira só tira acesso a `audiobooks`: objetos dos outros buckets
--   continuam decididos pelas policies deles (a condição é `is distinct from`).
--
-- Policies existentes de outros buckets (p.ex. `aportes_*`) NÃO são lidas nem
-- alteradas, e esta migration não apaga policy de ninguém: por isso o rollback
-- só precisa remover o que ela própria criou.
--
-- Falha fechada (aborta TUDO, nada é alterado) se RLS estiver desligada em
-- storage.objects (as policies seriam ignoradas) ou se, ao final, o bucket ou a
-- barreira não estiverem exatamente como descritos. Tudo num único bloco atômico.
-- Os masters (~181 MB) NÃO entram aqui: sobem as cópias AAC-LC já tratadas.
-- Reversível: ..._rollback.sql
-- =====================================================================
do $audiobooks$
declare
  b record;
  p record;
begin
  -- 1) Sem RLS as policies não valem: nunca prosseguir.
  if not (select c.relrowsecurity
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'storage' and c.relname = 'objects') then
    raise exception 'MIGRATION ABORTADA: RLS está desligada em storage.objects; nenhuma policy (inclusive a barreira) teria efeito. Nada foi alterado.' using errcode = 'P0001';
  end if;

  -- 2) Barreira RESTRICTIVE própria (nome exato; recriada a cada execução ⇒ idempotente).
  drop policy if exists audiobooks_deny_direct_access on storage.objects;
  create policy audiobooks_deny_direct_access
    on storage.objects
    as restrictive
    for all
    to anon, authenticated
    using (bucket_id is distinct from 'audiobooks')
    with check (bucket_id is distinct from 'audiobooks');

  -- 3) Cria OU corrige o bucket (nunca «do nothing»).
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('audiobooks', 'audiobooks', false, 31457280, array['audio/mp4', 'audio/x-m4a'])
  on conflict (id) do update
    set name = excluded.name,
        public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  -- 4) Defesa em profundidade: confere o estado final ou desfaz tudo.
  select * into b from storage.buckets where id = 'audiobooks';
  if b.public is distinct from false
     or b.file_size_limit is distinct from 31457280
     or b.allowed_mime_types is distinct from array['audio/mp4', 'audio/x-m4a']::text[] then
    raise exception 'MIGRATION ABORTADA: o bucket audiobooks não ficou no estado esperado (privado, 30 MB, só M4A).' using errcode = 'P0001';
  end if;

  select * into p from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname = 'audiobooks_deny_direct_access';
  if not found
     or p.permissive is distinct from 'RESTRICTIVE'
     or p.cmd is distinct from 'ALL'
     or not (p.roles::text[] @> array['anon', 'authenticated']::text[] and p.roles::text[] <@ array['anon', 'authenticated']::text[])
     or p.qual is null or p.with_check is null then
    raise exception 'MIGRATION ABORTADA: a barreira audiobooks_deny_direct_access não ficou instalada como RESTRICTIVE/ALL para anon e authenticated.' using errcode = 'P0001';
  end if;
end
$audiobooks$;
