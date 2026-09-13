/* =====================================================================
   ROLLBACK de 20260913_08_admin_v2_acessos.sql

   A migration 08 só acrescenta funções de leitura e um índice. Não
   criou tabela, não criou coluna, não moveu dado nenhum. Este rollback
   não pode perder informação: a aba ACESSOS apenas para de carregar.
   ===================================================================== */

drop function if exists public.admin_acc_detalle(uuid);
drop function if exists public.admin_acc_usuarios(text, text, int, int, text);
drop function if exists public.admin_acc_resumo(text);

drop index if exists public.orders_user_status_idx;
