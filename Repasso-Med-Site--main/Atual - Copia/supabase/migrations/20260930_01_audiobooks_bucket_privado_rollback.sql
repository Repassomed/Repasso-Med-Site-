-- =====================================================================
-- Reverte 20260930_01_audiobooks_bucket_privado.sql  (rollback REAL, fail-closed)
--
--   · bucket `audiobooks` inexistente  → nada a fazer (aviso).
--   · bucket VAZIO                     → remove SOMENTE o bucket `audiobooks`.
--   · bucket COM objetos               → ABORTA com erro claro; NENHUM objeto
--                                        é apagado (apague-os pelo painel ou
--                                        pela Storage API e rode de novo).
--   · nenhum outro bucket, objeto ou policy é tocado.
--
-- O Supabase bloqueia DELETE direto nas tabelas do Storage
-- («Direct deletion from storage tables is not allowed»). A permissão é
-- ligada só dentro desta transação (set_config local) e só depois de provar
-- que o bucket está vazio.
-- Obs.: as policies que a migration removeu (as que citavam `audiobooks`)
-- não são recriadas — eram justamente as que tornavam o bucket acessível.
-- =====================================================================
do $rollback$
declare
  n bigint;
begin
  if not exists (select 1 from storage.buckets where id = 'audiobooks') then
    raise notice 'ROLLBACK: o bucket audiobooks não existe; nada a fazer.';
    return;
  end if;

  select count(*) into n from storage.objects where bucket_id = 'audiobooks';
  if n > 0 then
    raise exception
      'ROLLBACK ABORTADO: o bucket audiobooks tem % objeto(s). Nada foi apagado. Remova os objetos pelo painel do Supabase (ou pela Storage API) e rode de novo.',
      n using errcode = 'P0001';
  end if;

  perform set_config('storage.allow_delete_query', 'true', true);   -- só nesta transação
  delete from storage.buckets where id = 'audiobooks';
end
$rollback$;
