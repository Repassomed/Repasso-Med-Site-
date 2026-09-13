/* =====================================================================
   ROLLBACK de 20260913_06_admin_v2_financeiro.sql

   A migration 06 só ACRESCENTA funções de leitura e três índices. Não
   criou tabela, não criou coluna, não moveu dado nenhum. Portanto este
   rollback não pode perder informação: derrubar as funções apenas faz
   a aba FINANCEIRO do painel parar de carregar números.

   Os índices ficam por último e são opcionais de remover — eles não
   alteram resultado de consulta alguma, só a velocidade. Se outra
   funcionalidade passar a depender deles, comente as três linhas.
   ===================================================================== */

drop function if exists public.admin_fin_pendientes(timestamptz, timestamptz, int);
drop function if exists public.admin_fin_cupones(timestamptz, timestamptz);
drop function if exists public.admin_fin_materias(timestamptz, timestamptz);
drop function if exists public.admin_fin_produtos(timestamptz, timestamptz);
drop function if exists public.admin_fin_serie(timestamptz, timestamptz, text, text);
drop function if exists public.admin_fin_resumo(timestamptz, timestamptz);

drop index if exists public.orders_paid_at_idx;
drop index if exists public.orders_pending_created_idx;
drop index if exists public.order_items_order_idx;
