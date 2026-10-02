-- =====================================================================
-- Reverte 20260930_01_audiobooks_bucket_privado.sql  (rollback REAL, fail-closed)
--
--   · bucket `audiobooks` COM objetos → ABORTA com erro claro; NENHUM objeto é
--     apagado e NADA é alterado (a barreira continua protegendo o bucket).
--   · bucket VAZIO                    → remove o bucket `audiobooks` e a policy
--                                       própria `audiobooks_deny_direct_access`.
--   · bucket inexistente              → remove só a policy própria, se existir.
--   · nenhum outro bucket, objeto ou policy (nem as de outros buckets, nem
--     outras restritivas, nem nomes parecidos) é tocado: a policy é removida
--     pelo NOME EXATO.
--
-- O Supabase bloqueia DELETE direto nas tabelas do Storage
-- («Direct deletion from storage tables is not allowed»). A permissão é
-- ligada só dentro desta transação (set_config local) e só depois de provar
-- que o bucket está vazio.
-- =====================================================================
do $rollback$
declare
  n bigint;
begin
  if exists (select 1 from storage.buckets where id = 'audiobooks') then
    select count(*) into n from storage.objects where bucket_id = 'audiobooks';
    if n > 0 then
      raise exception
        'ROLLBACK ABORTADO: o bucket audiobooks tem % objeto(s). Nada foi apagado nem alterado (a barreira continua ativa). Remova os objetos pelo painel do Supabase (ou pela Storage API) e rode de novo.',
        n using errcode = 'P0001';
    end if;

    perform set_config('storage.allow_delete_query', 'true', true);   -- só nesta transação
    delete from storage.buckets where id = 'audiobooks';
  else
    raise notice 'ROLLBACK: o bucket audiobooks não existe.';
  end if;

  -- só o artefato próprio, pelo nome exato (e só depois de o bucket estar vazio/removido)
  drop policy if exists audiobooks_deny_direct_access on storage.objects;
end
$rollback$;
