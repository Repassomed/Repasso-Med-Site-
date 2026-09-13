/* =====================================================================
   ROLLBACK de 20260913_03_external_contributions.sql

   ATENÇÃO: apagar o bucket 'aportes' apaga o material que os alunos
   mandaram. Rode o rollback só se a funcionalidade for descartada
   inteira, e só depois de conferir que nada de valor está lá dentro.
   Por isso o DROP do bucket fica COMENTADO: descomente conscientemente.
   ===================================================================== */

drop trigger if exists external_contributions_rate_limit_trg on public.external_contributions;
drop function if exists public.external_contributions_rate_limit();

drop policy if exists aportes_insert_own   on storage.objects;
drop policy if exists aportes_select_own   on storage.objects;
drop policy if exists aportes_admin_delete on storage.objects;

drop table if exists public.external_contributions;

-- delete from storage.objects where bucket_id = 'aportes';
-- delete from storage.buckets where id = 'aportes';
