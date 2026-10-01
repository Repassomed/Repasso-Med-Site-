-- =====================================================================
-- Audiobooks · bucket PRIVADO `audiobooks`  (NÃO APLICADO — só por ordem do José)
--
-- O que faz: deixa o bucket `audiobooks` SEMPRE neste estado, não importa
-- como ele estava antes (inexistente, público, com limite/MIME antigos):
--     public            = false
--     file_size_limit   = 31457280  (30 MB)
--     allowed_mime_types= {audio/mp4, audio/x-m4a}   (só M4A)
--     nenhuma policy em storage.objects para public/anon/authenticated
--                       que mencione `audiobooks`
-- É idempotente: rodar de novo não muda nada além de repor esse estado.
--
-- Por que sem políticas: storage.objects tem RLS ligada. Sem policy para
-- `anon`/`authenticated`, NINGUÉM lê ou grava por Storage API com a chave
-- pública — o navegador nunca acessa o bucket. Quem cria URL assinada é a
-- função Netlify `get-audio-url`, com a service_role (só no servidor), depois
-- de checar o UID autenticado + o manifesto.
--
-- Falha fechada (aborta TUDO, nada é alterado) se existir uma policy em
-- storage.objects para public/anon/authenticated que NÃO seja limitada a um
-- bucket (sem `bucket_id` no predicado): ela valeria também para este bucket
-- e corrigi-la mexeria nos outros buckets — decisão humana. As policies dos
-- outros buckets (p.ex. `aportes`) nunca são tocadas.
--
-- Tudo corre num único bloco (atômico). Os masters (~181 MB) NÃO entram aqui:
-- sobem as cópias AAC-LC já tratadas. Reversível: ..._rollback.sql
-- =====================================================================
do $audiobooks$
declare
  p record;
  b record;
begin
  -- 1) Segurança primeiro: nada é alterado se houver policy ampla demais.
  for p in
    select policyname, qual, with_check
      from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and roles && array['public', 'anon', 'authenticated']::name[]
       and coalesce(qual, '') not ilike '%audiobooks%'
       and coalesce(with_check, '') not ilike '%audiobooks%'
       and coalesce(qual, '') not ilike '%bucket_id%'
       and coalesce(with_check, '') not ilike '%bucket_id%'
  loop
    raise exception
      'MIGRATION ABORTADA: a policy "%" em storage.objects vale para public/anon/authenticated sem limitar o bucket (sem bucket_id). Ela exporia também o bucket audiobooks. Nada foi alterado. Revise essa policy antes de rodar de novo.',
      p.policyname using errcode = 'P0001';
  end loop;

  -- 2) Remove policies que mencionem explicitamente o bucket audiobooks.
  for p in
    select policyname
      from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and roles && array['public', 'anon', 'authenticated']::name[]
       and (coalesce(qual, '') ilike '%audiobooks%' or coalesce(with_check, '') ilike '%audiobooks%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;

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
end
$audiobooks$;
