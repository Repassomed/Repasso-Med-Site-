-- =====================================================================
-- REPASSO MED · Accesos: compras não finalizadas + filtros combinados
-- Data: 2026-09-15
--
-- ADITIVO. Cria uma função NOVA e não toca na `admin_acc_usuarios`, que
-- continua exactamente como está — quem já a chama não muda de
-- comportamento. Não altera pedidos, pagamentos, direitos de acesso nem
-- uma única linha de dados: é só leitura.
--
-- Mantém o mesmo portão de sempre: SECURITY DEFINER + is_admin().
-- =====================================================================


-- ---------------------------------------------------------------------
-- O QUE CONTA COMO «COMPRA INICIADA E NÃO FINALIZADA»
--
-- Cadastrar-se ou entrar no site NÃO é iniciar uma compra: isso só cria
-- uma linha em `profiles`. A evidência registada de compra iniciada é uma
-- linha em `orders` — ela nasce quando o checkout é gerado.
--
-- `orders.status` só tem dois valores em produção: 'paid' e 'pending'.
-- Não existe 'cancelado' nem 'expirado'; medido: 97 pagos, 79 pendentes,
-- e `paid_at`/`transaction_nsu` preenchidos exactamente nos 97 pagos.
--
-- O cuidado que falta ao critério ingénuo: quem tenta pagar três vezes e
-- acerta à terceira deixa duas linhas 'pending' para trás. Contá-las é um
-- falso positivo — a pessoa comprou. Medido em produção: das 79 linhas
-- pendentes, 22 são tentativas cujo conteúdo a pessoa acabou por pagar.
-- O filtro ingénuo «tem pendente» devolve 37 pessoas; 11 delas já tinham
-- comprado aquilo.
--
-- Por isso uma compra pendente só conta se os produtos dela NÃO estiverem
-- todos cobertos pelo que a pessoa já pagou. O conjunto de produtos vem
-- de `order_items`; para os pedidos antigos sem itens, cai-se no
-- `orders.product_id`.
--
-- Isto trata os dois lados do enunciado ao mesmo tempo:
--   · outra tentativa da MESMA compra já paga  -> não aparece;
--   · uma compra distinta ainda pendente       -> aparece, mesmo que a
--     pessoa tenha outras compras pagas.
--
-- A cobertura é medida contra a UNIÃO de vários pedidos pagos, e não
-- contra um pedido pago de cada vez: assim uma cesta pendente {A,B}
-- também é considerada coberta se A e B foram pagos em pedidos
-- separados. Hoje esse caso não existe em produção (medido: 0), mas o
-- critério mais largo não custa nada e não se engana se ele aparecer.
--
-- MAS essa união NÃO é a vida inteira da pessoa: é só o que ela pagou
-- DEPOIS de o pendente ter nascido. A razão é que a mesma matéria pode
-- ser comprada outra vez, de forma legítima:
--
--   · todos os 93 produtos têm `duration_days = 180`, ou seja, todo o
--     acesso vendido expira;
--   · `grant_paid_order()` tem um caminho explícito de RENOVAÇÃO — o
--     `on conflict (user_id, subject_slug) do update` que estica
--     `expires_at` para `greatest(antigo, novo)` e sobe o plano de
--     parcial para completa. Esse ramo só faz sentido se comprar de novo
--     for uma operação esperada;
--   · `create-checkout.js` não tem nenhuma verificação de «já tens isto»,
--     e a loja mostra todos os produtos activos, anunciando os dias de
--     acesso;
--   · não há unique, check nem trigger em `orders` que impeça um segundo
--     pedido do mesmo `product_id` (o único unique é
--     `order_items (order_id, product_id)`, que só evita o mesmo produto
--     duas vezes no MESMO carrinho).
--
-- Com a união histórica, a primeira renovação de cada aluno nasceria
-- invisível no painel: «já pagou isso alguma vez na vida» apagaria uma
-- compra nova e genuína. Com o corte no tempo, uma tentativa antiga só é
-- dada como resolvida pelo pagamento que veio DEPOIS dela — que é a única
-- evidência, nos dados que existem, de que pertence à mesma tentativa.
--
-- LIMITE HONESTO DESTE CRITÉRIO: o esquema não guarda nenhuma coluna que
-- agrupe tentativas da mesma compra (não há sessão de checkout, nem
-- referência externa, nem grupo de pedido — só `created_at` e `paid_at`).
-- Por isso um segundo clique dado LOGO A SEGUIR a um pagamento aparece
-- como compra em aberto. Medido em produção: existe exactamente 1 caso,
-- criado 18 segundos depois do pagamento. É um falso positivo
-- administrativo assumido de propósito — é preferível mostrar a mais do
-- que esconder uma compra realmente pendente.
--
-- Se um pedido pendente não tiver nenhum produto registado, conta como
-- NÃO finalizado: não há evidência de que tenha sido concluído, e é
-- preferível mostrar a mais do que esconder. Hoje não há nenhum caso.
--
-- LIMITAÇÃO REGISTADA, sem inventar estados: a base não guarda quando a
-- pessoa abriu o checkout e desistiu, nem quando o link expirou, nem
-- tentativas recusadas pelo meio de pagamento. Só existe «pendente» e
-- «pago». Portanto isto é «tem compra iniciada e ainda não paga», e não
-- «abandonou o carrinho» — nenhum evento de abandono é registado.
-- ---------------------------------------------------------------------


create or replace function public.admin_acc_usuarios_v2(
  p_busca   text    default null,
  p_filtros text[]  default null,        -- vazio/null = sem filtro
  p_limit   integer default 100,
  p_offset  integer default 0,
  p_tz      text    default 'America/Sao_Paulo'
)
returns table(
  user_id uuid, nombre text, email text, telefone text,
  creado_en timestamptz, ultima_actividad timestamptz, ultimo_login timestamptz,
  visto timestamptz, logins integer,
  materias_vigentes integer, materias_vencidas integer,
  compras_pagas integer, gasto_cents bigint, pendientes integer,
  compras_abiertas integer,              -- pendentes que NÃO foram cobertas por um pago
  estado text, total_filtrado bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tz  text;
  v_hoy timestamptz;
  v_q   text;
  v_f   text[];
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  v_tz := coalesce(p_tz, 'America/Sao_Paulo');
  begin
    perform now() at time zone v_tz;
  exception when others then
    v_tz := 'America/Sao_Paulo';
  end;
  v_hoy := (date_trunc('day', now() at time zone v_tz)) at time zone v_tz;

  v_q := nullif(btrim(coalesce(p_busca, '')), '');

  -- normaliza a lista de filtros; 'todos' é o mesmo que não filtrar
  select coalesce(array_agg(distinct lower(btrim(x))), '{}')
    into v_f
    from unnest(coalesce(p_filtros, '{}')) as x
   where nullif(btrim(x), '') is not null
     and lower(btrim(x)) <> 'todos';

  return query
  with pagos as (   -- cada produto pago, com o MOMENTO em que foi pago
    select o.user_id, pr as product_id,
           coalesce(o.paid_at, o.created_at) as pago_en
      from public.orders o
      cross join lateral unnest(
        coalesce(
          (select array_agg(distinct i.product_id) from public.order_items i where i.order_id = o.id),
          case when o.product_id is not null then array[o.product_id] end,
          '{}'::uuid[])
      ) as pr
     where o.status = 'paid'
  ),
  base as (
    select p.id, p.full_name, p.email, nullif(btrim(coalesce(p.phone,'')),'') as tel,
           p.created_at,
           s.last_seen,
           a.ult_login, coalesce(a.n, 0) as n_logins,
           greatest(s.last_seen, a.ult_login) as visto,
           coalesce(ms.vig, 0) as vig, coalesce(ms.ven, 0) as ven,
           coalesce(o.pagas, 0) as pagas, coalesce(o.gasto, 0) as gasto,
           coalesce(o.pend, 0) as pend,
           coalesce(ab.n, 0) as abertas
      from public.profiles p
      left join public.user_sessions s on s.user_id = p.id
      left join lateral (
        select max(al.created_at) as ult_login, count(*)::int as n
          from public.access_log al where al.user_id = p.id
      ) a on true
      left join lateral (
        select count(*) filter (where us.expires_at is null or us.expires_at > now())::int as vig,
               count(*) filter (where us.expires_at is not null and us.expires_at <= now())::int as ven
          from public.user_subjects us where us.user_id = p.id
      ) ms on true
      left join lateral (
        select count(*) filter (where o2.status = 'paid')::int as pagas,
               sum(o2.amount_cents) filter (where o2.status = 'paid')::bigint as gasto,
               count(*) filter (where o2.status = 'pending')::int as pend
          from public.orders o2 where o2.user_id = p.id
      ) o on true
      left join lateral (
        /* pendentes que nenhum pagamento POSTERIOR veio resolver */
        select count(*)::int as n
          from public.orders o3
         where o3.user_id = p.id
           and o3.status = 'pending'
           and not (
             /* só o que foi pago DEPOIS deste pendente nascer pode ser o
                desfecho da mesma tentativa; o que veio antes é história */
             coalesce((select array_agg(distinct g.product_id)
                         from pagos g
                        where g.user_id = p.id
                          and g.pago_en >= o3.created_at), '{}'::uuid[])
             @>
             /* conjunto do pedido; vazio -> nunca é «coberto», conta */
             coalesce(
               nullif((select array_agg(distinct i.product_id)
                         from public.order_items i where i.order_id = o3.id), '{}'),
               case when o3.product_id is not null then array[o3.product_id] end,
               array[gen_random_uuid()]      -- sem produto conhecido: nada o cobre
             )
           )
      ) ab on true
  ),
  clasificado as (
    select b.*,
           case
             when b.visto is null                       then 'nunca'
             when b.visto >= v_hoy                      then 'hoy'
             when b.visto >= now() - interval '7 days'  then 'semana'
             when b.visto >= now() - interval '30 days' then 'mes'
             else 'inactivo'
           end as est
      from base b
  ),
  filtrado as (
    select c.* from clasificado c
     where (v_q is null
            or c.full_name ilike '%' || v_q || '%'
            or c.email     ilike '%' || v_q || '%'
            or c.tel       ilike '%' || v_q || '%')
       /* ------------------------------------------------------------
          E entre GRUPOS, OU dentro de cada grupo.
          Um grupo sem nenhum valor escolhido não restringe nada.
          ------------------------------------------------------------ */
       -- grupo ACTIVIDADE
       and ( not (v_f && array['hoy','7d','30d','inactivos','nunca'])
             or ( ('hoy'       = any(v_f) and c.est = 'hoy')
               or ('7d'        = any(v_f) and c.visto >= now() - interval '7 days')
               or ('30d'       = any(v_f) and c.visto >= now() - interval '30 days')
               or ('inactivos' = any(v_f) and c.visto is not null and c.visto < now() - interval '30 days')
               or ('nunca'     = any(v_f) and c.visto is null) ) )
       -- grupo COMPRA
       and ( not (v_f && array['con_pago','sin_pago','pendientes','compra_abierta'])
             or ( ('con_pago'       = any(v_f) and c.pagas > 0)
               or ('sin_pago'       = any(v_f) and c.pagas = 0)
               or ('pendientes'     = any(v_f) and c.pend  > 0)
               or ('compra_abierta' = any(v_f) and c.abertas > 0) ) )
       -- grupo MATÉRIAS
       and ( not (v_f && array['vigentes','vencidos'])
             or ( ('vigentes' = any(v_f) and c.vig > 0)
               or ('vencidos' = any(v_f) and c.ven > 0 and c.vig = 0) ) )
       -- grupo TELEFONE
       and ( not (v_f && array['con_tel','sin_tel'])
             or ( ('con_tel' = any(v_f) and c.tel is not null)
               or ('sin_tel' = any(v_f) and c.tel is null) ) )
  )
  select f.id, f.full_name, f.email, f.tel, f.created_at,
         f.last_seen, f.ult_login, f.visto, f.n_logins,
         f.vig, f.ven, f.pagas, f.gasto, f.pend, f.abertas, f.est,
         count(*) over ()
    from filtrado f
   order by f.visto desc nulls last, f.created_at desc
   limit  greatest(1, least(coalesce(p_limit, 100), 5000))
  offset greatest(0, coalesce(p_offset, 0));
end;
$function$;

comment on function public.admin_acc_usuarios_v2(text, text[], integer, integer, text) is
  'Lista de alunos do painel Accesos com filtros combinaveis (E entre grupos, OU dentro do grupo). compras_abiertas = pedidos pendentes cujos produtos a pessoa ainda nao pagou em nenhum outro pedido. Somente leitura.';


/* ---------------------------------------------------------------------
   PERMISSÕES

   `create function` dá EXECUTE a PUBLIC por omissão. Numa função
   SECURITY DEFINER isso significa que qualquer papel — incluindo `anon`,
   que é o papel de quem nem sequer entrou — pode chamá-la, e o único
   obstáculo passa a ser o `is_admin()` lá dentro. Esse portão funciona
   (`is_admin()` é `coalesce(..., false)`, nunca devolve null, portanto o
   `if not` dispara sempre que não for admin), mas ele é a ÚLTIMA linha,
   não deve ser a única.

   As três funções da mesma família — `admin_acc_resumo`,
   `admin_acc_usuarios` e `admin_acc_detalle` — já são criadas com estas
   mesmas linhas em 20260913_08_admin_v2_acessos.sql, e em produção a sua
   ACL é `{postgres, authenticated, service_role}`: sem PUBLIC, sem anon.
   Sem este bloco, a v2 nasceria MAIS PERMISSIVA do que a v1 que vem
   substituir, o que seria uma regressão de privilégio.
   --------------------------------------------------------------------- */
revoke all on function public.admin_acc_usuarios_v2(text, text[], integer, integer, text) from public, anon;

grant execute on function public.admin_acc_usuarios_v2(text, text[], integer, integer, text) to authenticated;
