-- =====================================================================
-- Reverte 20260915_01_admin_acc_filtros.sql
-- Só remove a função nova. A `admin_acc_usuarios` original nunca foi
-- tocada, portanto o painel volta ao que era sem mais nada.
-- =====================================================================
drop function if exists public.admin_acc_usuarios_v2(text, text[], integer, integer, text);
