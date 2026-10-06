-- =====================================================================
-- Audiobooks · limite do bucket `audiobooks`: 30 MiB -> 40 MiB  (NÃO APLICADO — só por ordem do José)
--
-- Por quê: os quatro .m4a já comprimidos do piloto de Semiología II somam ≈ 109 MB e o maior tem 36.758.530 B (≈ 35,1 MiB),
-- acima dos 31.457.280 B (30 MiB) da migration 20260930_01. 41.943.040 B (40 MiB) é o menor limite «redondo» que cobre o maior
-- arquivo com folga para reexportar, e fica abaixo do limite global de 50 MB do plano Free do Supabase (o bucket `aportes` já usa 50 MiB).
--
-- O que faz: muda SOMENTE `file_size_limit` da linha `audiobooks` de storage.buckets, para 41943040. Nada mais:
--   · não cria nem torna público nenhum bucket; não altera `public`, `allowed_mime_types` nem nenhum outro bucket;
--   · não toca em policies (a barreira RESTRICTIVE `audiobooks_deny_direct_access` continua como está) nem em objetos.
--
-- Falha FECHADA (aborta TUDO, nada é alterado) se: o bucket não existir; estiver público; os tipos permitidos não forem exatamente
-- {audio/mp4, audio/x-m4a}; a barreira não existir como RESTRICTIVE; ou o limite atual não for 31457280 (estado de origem) nem 41943040
-- (idempotente). Ao final confere o estado ou desfaz tudo. Reversível: 20261006_01_audiobooks_limite_40mib_rollback.sql.
-- Ordem: SEMPRE depois de 20260930_01_audiobooks_bucket_privado.sql (que, se reexecutada, volta o limite a 30 MiB).
-- =====================================================================
do $limite$
declare
  b record;
  p record;
begin
  select * into b from storage.buckets where id = 'audiobooks';
  if not found then
    raise exception 'MIGRATION ABORTADA: o bucket audiobooks não existe neste projeto. Aplique antes 20260930_01_audiobooks_bucket_privado.sql. Nada foi alterado.' using errcode = 'P0001';
  end if;
  if b.public is distinct from false then
    raise exception 'MIGRATION ABORTADA: o bucket audiobooks está PÚBLICO. Corrija com 20260930_01_audiobooks_bucket_privado.sql antes. Nada foi alterado.' using errcode = 'P0001';
  end if;
  if b.allowed_mime_types is distinct from array['audio/mp4', 'audio/x-m4a']::text[] then
    raise exception 'MIGRATION ABORTADA: tipos permitidos do bucket diferentes de {audio/mp4, audio/x-m4a}. Nada foi alterado.' using errcode = 'P0001';
  end if;
  if b.file_size_limit is distinct from 31457280 and b.file_size_limit is distinct from 41943040 then
    raise exception 'MIGRATION ABORTADA: limite atual inesperado (%). Esperado 31457280 (origem) ou 41943040 (já aplicada). Nada foi alterado.', b.file_size_limit using errcode = 'P0001';
  end if;
  select * into p from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname = 'audiobooks_deny_direct_access';
  if not found or p.permissive is distinct from 'RESTRICTIVE' or p.cmd is distinct from 'ALL' then
    raise exception 'MIGRATION ABORTADA: a barreira audiobooks_deny_direct_access não está instalada como RESTRICTIVE/ALL. Nada foi alterado.' using errcode = 'P0001';
  end if;

  update storage.buckets set file_size_limit = 41943040 where id = 'audiobooks';

  select * into b from storage.buckets where id = 'audiobooks';
  if b.file_size_limit is distinct from 41943040 or b.public is distinct from false
     or b.allowed_mime_types is distinct from array['audio/mp4', 'audio/x-m4a']::text[] then
    raise exception 'MIGRATION ABORTADA: o bucket audiobooks não ficou como esperado (privado, 40 MiB, só M4A).' using errcode = 'P0001';
  end if;
end
$limite$;
