-- =====================================================================
-- REPASSO MED · Anúncios em fila: a lista, não só o primeiro
-- Data: 2026-09-17
--
-- ADITIVO E NÃO DESTRUTIVO.
-- Cria uma função NOVA e não toca na `my_active_announcement()`, que fica
-- exactamente como está — o contrato antigo continua válido e qualquer
-- consumidor que ainda o use não muda de comportamento. Também não toca
-- na `mark_announcement_seen(uuid)`, que já é por anúncio e serve a fila
-- tal como está.
--
-- Não altera dados, não altera tabelas, não altera RLS, não altera
-- pagamentos, autenticação nem acesso a matérias. Só leitura.
-- =====================================================================


-- ---------------------------------------------------------------------
-- my_active_announcements() -> json (ARRAY)
--
-- Mesmos filtros da função de um só anúncio, pela mesma ordem, sem o
-- `limit 1`:
--   · active = true
--   · starts_at nulo ou já passou
--   · ends_at   nulo ou ainda não chegou
--   · frequência, avaliada anúncio a anúncio contra announcement_views:
--       'always' — sempre elegível
--       'daily'  — se ainda não foi visto HOJE (data em America/Asuncion,
--                  que é o fuso que a `announcement_views.seen_on` já usa
--                  por omissão; mantém-se para não mudar a semântica)
--       'once'   — se nunca foi visto
--   · ordem: priority DESC, created_at DESC — a MESMA do painel de
--     administração, para que o que o admin vê em cima seja o que o
--     aluno vê primeiro. É determinística mesmo com prioridades iguais.
--
-- A elegibilidade é POR ANÚNCIO: um anúncio já visto sai da lista sem
-- impedir os outros de aparecer.
--
-- TECTO: `limit 20`. Não é uma regra de negócio, é uma rede — impede que
-- um engano no painel transforme a entrada do aluno numa fila infinita
-- de modais. Vinte é muito acima de qualquer uso real (hoje há poucos).
--
-- Devolve sempre um ARRAY json (`[]` quando não há nada e quando não há
-- sessão), nunca `null`: assim o cliente não precisa de distinguir
-- "vazio" de "falhou" pelo tipo de retorno.
-- ---------------------------------------------------------------------
create or replace function public.my_active_announcements()
returns json
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(json_agg(x order by x.priority desc, x.created_at desc), '[]'::json)
  from (
    select a.id, a.title, a.body,
           a.media_url, a.media_type,
           a.link_url, a.links,
           a.frequency, a.priority, a.created_at
      from public.announcements a
     where auth.uid() is not null
       and a.active = true
       and (a.starts_at is null or a.starts_at <= now())
       and (a.ends_at   is null or a.ends_at   >= now())
       and (
            a.frequency = 'always'
         or (a.frequency = 'daily' and not exists (
               select 1 from public.announcement_views v
                where v.user_id = auth.uid()
                  and v.announcement_id = a.id
                  and v.seen_on = (now() at time zone 'America/Asuncion')::date))
         or (a.frequency = 'once' and not exists (
               select 1 from public.announcement_views v
                where v.user_id = auth.uid()
                  and v.announcement_id = a.id))
       )
     order by a.priority desc, a.created_at desc
     limit 20
  ) x;
$function$;

comment on function public.my_active_announcements() is
  'Lista (json array) dos anuncios elegiveis para o utilizador da sessao, por priority desc, created_at desc. Mesmos filtros de my_active_announcement(), sem o limit 1. Somente leitura.';

-- ---------------------------------------------------------------------
-- PERMISSÕES · o mínimo necessário
--
-- A função só devolve alguma coisa a quem tem sessão (auth.uid()), mas
-- deixar EXECUTE em PUBLIC/anon não serve para nada e é superfície a
-- mais. Fica só `authenticated`, que é quem a página chama depois do
-- login. O `service_role` mantém-se por ser o papel do painel/servidor.
--
-- (As funções antigas ficaram com o EXECUTE aberto por omissão do
-- Supabase; não lhes mexo aqui para não alterar o contrato existente —
-- fica registado como observação, não como alteração silenciosa.)
-- ---------------------------------------------------------------------
revoke all on function public.my_active_announcements() from public;
revoke all on function public.my_active_announcements() from anon;
grant execute on function public.my_active_announcements() to authenticated;
grant execute on function public.my_active_announcements() to service_role;
