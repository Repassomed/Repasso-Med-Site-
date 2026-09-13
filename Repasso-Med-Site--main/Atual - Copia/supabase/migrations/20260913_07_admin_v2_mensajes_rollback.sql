/* =====================================================================
   ROLLBACK de 20260913_07_admin_v2_mensajes.sql

   ATENÇÃO: `suggestion_messages` guarda CONVERSA DE VERDADE entre a
   equipe e os alunos. Derrubar a tabela apaga tudo que foi respondido.
   Por isso o `drop table` fica COMENTADO no fim: descomente só depois
   de conferir que não há nada lá que importe, ou de ter exportado.

   As funções e o trigger podem cair sem perda: são código, não dado.
   `feedback` não é tocada em momento nenhum — nem aqui, nem na
   migration 07.
   ===================================================================== */

drop function if exists public.my_suggestion_threads();
drop function if exists public.admin_suggestion_threads(int);
drop function if exists public.mark_suggestion_read(uuid);

drop trigger  if exists suggestion_messages_normalize_trg on public.suggestion_messages;
drop function if exists public.suggestion_messages_normalize();

drop policy if exists suggestion_messages_admin_all   on public.suggestion_messages;
drop policy if exists suggestion_messages_select_self on public.suggestion_messages;
drop policy if exists suggestion_messages_insert_self on public.suggestion_messages;

-- APAGA A CONVERSA INTEIRA. Descomente conscientemente.
-- drop table if exists public.suggestion_messages;
