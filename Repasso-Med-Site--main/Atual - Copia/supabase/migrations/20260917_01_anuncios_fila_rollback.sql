-- =====================================================================
-- Reverte 20260917_01_anuncios_fila.sql
-- Só remove a função nova. A my_active_announcement() e a
-- mark_announcement_seen() nunca foram tocadas, portanto o site volta ao
-- comportamento de um anúncio assim que o frontend voltar atrás.
-- =====================================================================
drop function if exists public.my_active_announcements();
