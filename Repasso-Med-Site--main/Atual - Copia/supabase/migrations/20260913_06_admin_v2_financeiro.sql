/* =====================================================================
   REPASSO MED · ADMIN V2 — ETAPA A · FINANCEIRO
   20260913_06_admin_v2_financeiro.sql

   Migration ADITIVA. Não cria, não altera e não apaga NENHUMA tabela.
   Cria apenas funções de LEITURA agregada para o painel administrativo.
   Nenhum DROP de tabela, nenhum TRUNCATE, nenhuma policy desativada.

   POR QUE FUNÇÕES E NÃO CONSULTA DIRETA DO NAVEGADOR
   -----------------------------------------------------------------
   Somar faturamento no navegador exigiria baixar todos os pedidos para
   o cliente. Hoje são 172; em dois anos serão milhares. Estas funções
   somam no servidor e devolvem números prontos — o navegador recebe
   dezenas de bytes, não o extrato inteiro.

   POR QUE `SECURITY DEFINER` E POR QUE ISSO NÃO ABRE BURACO
   -----------------------------------------------------------------
   `SECURITY DEFINER` faz a função rodar com os privilégios do dono, o
   que ignora o RLS — necessário para agregar pedidos de todo mundo.
   Para que isso não vire vazamento, TODA função aqui começa validando
   `public.is_admin()` e aborta com 42501 se o chamador não for admin.
   A autorização está no servidor: não depende de botão escondido, não
   depende do `admin.html`, não depende de variável de JavaScript.
   No fim do arquivo o EXECUTE é revogado de `public` e de `anon`, e
   concedido só a `authenticated` — que ainda assim passa pelo
   `is_admin()` lá dentro.
   Nenhuma destas funções escreve: são todas somente-leitura.
   Nenhuma delas precisa de `service_role`, e nenhuma chave de
   service_role é usada ou exposta em lugar nenhum.

   AS TRÊS DECISÕES SEMÂNTICAS QUE ESTE ARQUIVO CONGELA
   -----------------------------------------------------------------
   1) RECEITA = soma de `amount_cents`, NUNCA de `paid_amount`.
      `paid_amount` é o que o COMPRADOR pagou à InfinitePay; em pedidos
      parcelados no cartão ele vem MAIOR que `amount_cents` (o juro do
      parcelamento). Esse acréscimo não entra no caixa da loja. Somar
      `paid_amount` inflaria o faturamento — hoje, em 15 pedidos.
      `amount_cents` já está líquido de cupom.

   2) A DATA DA VENDA é `paid_at`, não `created_at`.
      `paid_at` está preenchido se e somente se `status='paid'`.
      Pedido pendente não tem data de pagamento, então ele é datado
      por `created_at` — e só aparece na função de pendentes.

   3) «PENDENTE» É «PAGAMENTO PENDENTE», NÃO «CARRINHO ABANDONADO».
      Não existe no banco nenhum evento de carrinho, nenhuma tabela de
      tracking, nenhum histórico de sessão de checkout. Um pedido com
      `status='pending'` é um pedido criado cujo pagamento não foi
      confirmado — nada além disso é sabido, e nada além disso é dito.

   RATEIO DA RECEITA POR PRODUTO — e por que não é uma soma simples
   -----------------------------------------------------------------
   Um pedido pode ter vários itens (média atual: 1,38). Somar
   `amount_cents` uma vez por item contaria o mesmo pedido duas vezes e
   o ranking somaria mais que o faturamento real. Então o valor do
   pedido é RATEADO entre os itens na proporção de `order_items.price_cents`.
   Pedidos sem itens (47 hoje, todos com itens na verdade — o caso é
   defensivo) caem no `orders.product_id`, exatamente a mesma regra de
   precedência que `grant_paid_order()` já usa para liberar acesso.
   O arredondamento do rateio pode deixar o ranking a alguns centavos
   do total; o número de caixa é sempre o do resumo, não o do ranking.

   FUSO HORÁRIO
   -----------------------------------------------------------------
   O banco guarda `timestamptz` e a sessão do PostgREST roda em UTC.
   Agrupar por dia em UTC jogaria as vendas da noite para o dia
   seguinte. Por isso as funções que agrupam por dia recebem um fuso
   (`p_tz`) e convertem antes de truncar. O padrão é America/Sao_Paulo;
   fuso inválido cai no padrão em vez de quebrar a tela.

   IDEMPOTENTE (`create or replace`). Rollback: 20260913_06_..._rollback.sql
   ===================================================================== */


/* ---------------------------------------------------------------------
   1 · RESUMO DO PERÍODO
   Devolve um json único com caixa, vendas, ticket, clientes, desconto
   e o mesmo bloco para o período anterior de igual duração (para a
   variação). `p_from`/`p_to` nulos = «tudo»; nesse caso não existe
   período anterior e a variação volta NULL — não volta zero, porque
   zero seria mentira.
   --------------------------------------------------------------------- */
create or replace function public.admin_fin_resumo(
  p_from timestamptz default null,
  p_to   timestamptz default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from      timestamptz;
  v_to        timestamptz;
  v_prev_from timestamptz;
  v_prev_to   timestamptz;
  v_out       json;
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  v_from := coalesce(p_from, '-infinity'::timestamptz);
  v_to   := coalesce(p_to,    'infinity'::timestamptz);

  if p_from is not null and p_to is not null then
    v_prev_from := p_from - (p_to - p_from);
    v_prev_to   := p_from;
  end if;

  select json_build_object(
    'receita_cents',      coalesce(a.receita, 0),
    'vendas',             coalesce(a.vendas, 0),
    'clientes',           coalesce(a.clientes, 0),
    'desconto_cents',     coalesce(a.desconto, 0),
    'ticket_cents',       case when coalesce(a.vendas,0) > 0
                               then round(coalesce(a.receita,0)::numeric / a.vendas)::bigint
                               else 0 end,
    'prev_receita_cents', case when v_prev_from is null then null else coalesce(b.receita, 0) end,
    'prev_vendas',        case when v_prev_from is null then null else coalesce(b.vendas, 0) end,
    'prev_ticket_cents',  case when v_prev_from is null then null
                               when coalesce(b.vendas,0) > 0
                                 then round(coalesce(b.receita,0)::numeric / b.vendas)::bigint
                               else 0 end,
    'pendentes_n',        coalesce(c.n, 0),
    'pendentes_cents',    coalesce(c.v, 0),
    'primeira_venda',     a.primeira,
    'ultima_venda',       a.ultima
  ) into v_out
  from (
    select sum(o.amount_cents)::bigint          as receita,
           count(*)::int                        as vendas,
           count(distinct o.user_id)::int       as clientes,
           sum(coalesce(o.discount_cents,0))::bigint as desconto,
           min(o.paid_at)                       as primeira,
           max(o.paid_at)                       as ultima
      from public.orders o
     where o.status = 'paid'
       and o.paid_at >= v_from
       and o.paid_at <  v_to
  ) a
  left join lateral (
    select sum(o.amount_cents)::bigint as receita, count(*)::int as vendas
      from public.orders o
     where o.status = 'paid'
       and v_prev_from is not null
       and o.paid_at >= v_prev_from
       and o.paid_at <  v_prev_to
  ) b on true
  left join lateral (
    select count(*)::int as n, sum(o.amount_cents)::bigint as v
      from public.orders o
     where o.status = 'pending'
       and o.created_at >= v_from
       and o.created_at <  v_to
  ) c on true;

  return v_out;
end;
$$;

comment on function public.admin_fin_resumo(timestamptz, timestamptz) is
  'ADMIN V2. Resumo financeiro do periodo. Receita = soma de amount_cents de pedidos paid, datada por paid_at. NUNCA paid_amount (inflado pelo juro de parcelamento). Exige is_admin().';


/* ---------------------------------------------------------------------
   2 · SÉRIE TEMPORAL
   Uma linha por dia (ou por mês) com receita e número de vendas. O
   gráfico do painel alterna entre as duas colunas sem recarregar.
   --------------------------------------------------------------------- */
create or replace function public.admin_fin_serie(
  p_from   timestamptz default null,
  p_to     timestamptz default null,
  p_bucket text default 'day',
  p_tz     text default 'America/Sao_Paulo'
) returns table(periodo date, receita_cents bigint, vendas int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket text;
  v_tz     text;
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  v_bucket := case when lower(coalesce(p_bucket,'day')) in ('month','mes','mês')
                   then 'month' else 'day' end;

  v_tz := coalesce(p_tz, 'America/Sao_Paulo');
  begin
    perform now() at time zone v_tz;          -- fuso inválido levanta erro aqui
  exception when others then
    v_tz := 'America/Sao_Paulo';
  end;

  return query
    select date_trunc(v_bucket, o.paid_at at time zone v_tz)::date,
           sum(o.amount_cents)::bigint,
           count(*)::int
      from public.orders o
     where o.status = 'paid'
       and o.paid_at >= coalesce(p_from, '-infinity'::timestamptz)
       and o.paid_at <  coalesce(p_to,    'infinity'::timestamptz)
     group by 1
     order by 1;
end;
$$;

comment on function public.admin_fin_serie(timestamptz, timestamptz, text, text) is
  'ADMIN V2. Serie temporal de receita e vendas pagas, agrupada no fuso p_tz. Exige is_admin().';


/* ---------------------------------------------------------------------
   3 · RANKING DE PRODUTOS
   Unidades vendidas e receita RATEADA (ver cabeçalho). `plan_type`
   volta cru para que a tela possa separar o combo de semestre dos
   planos de uma matéria só — `semestre` é o combo; `completa` é acesso
   total a UMA matéria, não é combo.
   --------------------------------------------------------------------- */
create or replace function public.admin_fin_produtos(
  p_from timestamptz default null,
  p_to   timestamptz default null
) returns table(
  product_id    uuid,
  nome          text,
  plan_type     text,
  subject_slug  text,
  semester      int,
  unidades      int,
  receita_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  return query
  with pagos as (
    select o.id, o.product_id, o.amount_cents
      from public.orders o
     where o.status = 'paid'
       and o.paid_at >= coalesce(p_from, '-infinity'::timestamptz)
       and o.paid_at <  coalesce(p_to,    'infinity'::timestamptz)
  ),
  soma_itens as (
    select oi.order_id, sum(oi.price_cents)::numeric as total
      from public.order_items oi
      join pagos p on p.id = oi.order_id
     group by oi.order_id
  ),
  alocado as (
    /* pedido COM itens: rateio proporcional ao preço de cada item */
    select oi.product_id,
           1::int as un,
           case when coalesce(s.total, 0) > 0
                then round(p.amount_cents::numeric * oi.price_cents / s.total)::bigint
                else 0::bigint
           end as cents
      from public.order_items oi
      join pagos p        on p.id = oi.order_id
      left join soma_itens s on s.order_id = oi.order_id
    union all
    /* pedido SEM itens: o produto do próprio pedido leva o valor inteiro */
    select p.product_id, 1::int, p.amount_cents::bigint
      from pagos p
     where p.product_id is not null
       and not exists (select 1 from public.order_items oi2 where oi2.order_id = p.id)
  )
  select pr.id, pr.name, pr.plan_type, pr.subject_slug, pr.semester,
         sum(a.un)::int, sum(a.cents)::bigint
    from alocado a
    join public.products pr on pr.id = a.product_id
   group by pr.id, pr.name, pr.plan_type, pr.subject_slug, pr.semester
   order by 7 desc, 6 desc;
end;
$$;

comment on function public.admin_fin_produtos(timestamptz, timestamptz) is
  'ADMIN V2. Ranking de produtos por unidades e receita rateada entre os itens do pedido, para nao contar o mesmo pedido duas vezes. Exige is_admin().';


/* ---------------------------------------------------------------------
   4 · MATÉRIAS E SEMESTRES MAIS VENDIDOS
   Reaproveita o rateio do item 3 em vez de repeti-lo. Produtos de
   `plan_type='semestre'` têm `subject_slug` NULL e por isso são
   agrupados pelo semestre, com rótulo próprio — nunca somados junto
   com uma matéria individual.
   --------------------------------------------------------------------- */
create or replace function public.admin_fin_materias(
  p_from timestamptz default null,
  p_to   timestamptz default null
) returns table(
  clave         text,
  rotulo        text,
  tipo          text,
  unidades      int,
  receita_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  /* Os rótulos são montados ANTES de agrupar. Se `plan_type` entrasse no
     GROUP BY, «Dermatología · Parcial 1» e «Dermatología completa» ficariam
     em linhas separadas — que é exatamente o que esta função existe para
     evitar. O agrupamento é só pela chave e pelo tipo. */
  return query
  with base as (
    select
      case when q.plan_type = 'semestre'
           then 'sem:' || coalesce(q.semester::text, '?')
           else coalesce(q.subject_slug, 'sin-materia') end            as k,
      case when q.plan_type = 'semestre'
           then 'Combo semestre ' || coalesce(q.semester::text, '?')
           else coalesce(s.name, q.subject_slug, 'Sin materia') end    as r,
      case when q.plan_type = 'semestre' then 'combo' else 'materia' end as t,
      q.unidades, q.receita_cents
    from public.admin_fin_produtos(p_from, p_to) q
    left join public.subjects s on s.slug = q.subject_slug
  )
  select b.k, min(b.r), b.t, sum(b.unidades)::int, sum(b.receita_cents)::bigint
    from base b
   group by b.k, b.t
   order by 5 desc, 4 desc;
end;
$$;

comment on function public.admin_fin_materias(timestamptz, timestamptz) is
  'ADMIN V2. Agrega o ranking por materia. Produtos plan_type=semestre viram uma linha de combo por semestre e nao se misturam com materias individuais. Exige is_admin().';


/* ---------------------------------------------------------------------
   5 · CUPONS USADOS NO PERÍODO
   Só pedidos pagos. `desconto_cents` é o que a loja abriu mão;
   `receita_cents` é o que entrou depois do desconto.
   --------------------------------------------------------------------- */
create or replace function public.admin_fin_cupones(
  p_from timestamptz default null,
  p_to   timestamptz default null
) returns table(
  code           text,
  usos           int,
  receita_cents  bigint,
  desconto_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  return query
    select o.coupon_code,
           count(*)::int,
           sum(o.amount_cents)::bigint,
           sum(coalesce(o.discount_cents, 0))::bigint
      from public.orders o
     where o.status = 'paid'
       and o.coupon_code is not null
       and o.paid_at >= coalesce(p_from, '-infinity'::timestamptz)
       and o.paid_at <  coalesce(p_to,    'infinity'::timestamptz)
     group by o.coupon_code
     order by 3 desc;
end;
$$;

comment on function public.admin_fin_cupones(timestamptz, timestamptz) is
  'ADMIN V2. Cupons usados em pedidos pagos no periodo. Exige is_admin().';


/* ---------------------------------------------------------------------
   6 · PAGAMENTOS PENDENTES
   Pedidos criados cujo pagamento não foi confirmado. Datados por
   `created_at`, porque `paid_at` é NULL neles por definição.

   `ja_comprou` responde «esta pessoa já pagou alguma outra coisa?» —
   é um dado que o banco tem de verdade. NÃO é «abandonou o carrinho»,
   porque isso o banco não sabe.

   O telefone vem de `profiles.phone`, que é telefone de CADASTRO.
   Não existe nenhuma coluna de consentimento de marketing no banco;
   a tela diz isso em voz alta ao lado da lista.
   --------------------------------------------------------------------- */
create or replace function public.admin_fin_pendientes(
  p_from  timestamptz default null,
  p_to    timestamptz default null,
  p_limit int default 200
) returns table(
  order_id     uuid,
  user_id      uuid,
  nome         text,
  email        text,
  telefone     text,
  amount_cents int,
  created_at   timestamptz,
  produtos     text,
  ja_comprou   boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  return query
    select o.id,
           o.user_id,
           pf.full_name,
           pf.email,
           pf.phone,
           o.amount_cents,
           o.created_at,
           coalesce(
             (select string_agg(pr.name, ' + ' order by pr.name)
                from public.order_items oi
                join public.products pr on pr.id = oi.product_id
               where oi.order_id = o.id),
             (select pr2.name from public.products pr2 where pr2.id = o.product_id)
           ),
           exists (select 1 from public.orders o2
                    where o2.user_id = o.user_id and o2.status = 'paid')
      from public.orders o
      left join public.profiles pf on pf.id = o.user_id
     where o.status = 'pending'
       and o.created_at >= coalesce(p_from, '-infinity'::timestamptz)
       and o.created_at <  coalesce(p_to,    'infinity'::timestamptz)
     order by o.created_at desc
     limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

comment on function public.admin_fin_pendientes(timestamptz, timestamptz, int) is
  'ADMIN V2. Pedidos com status=pending — PAGAMENTO PENDENTE. Nao e abandono de carrinho: o banco nao guarda evento de carrinho. Exige is_admin().';


/* ---------------------------------------------------------------------
   ÍNDICES DE APOIO
   Só aceleram o que estas funções já fazem. `if not exists` em todos.
   --------------------------------------------------------------------- */
create index if not exists orders_paid_at_idx
  on public.orders (paid_at desc) where status = 'paid';

create index if not exists orders_pending_created_idx
  on public.orders (created_at desc) where status = 'pending';

create index if not exists order_items_order_idx
  on public.order_items (order_id);


/* ---------------------------------------------------------------------
   PERMISSÕES
   O Postgres concede EXECUTE a PUBLIC por padrão em função nova. Como
   estas rodam com `security definer`, deixar isso assim seria abrir o
   faturamento para qualquer visitante. Revogamos e concedemos só a
   `authenticated` — que continua batendo no `is_admin()` lá dentro.
   --------------------------------------------------------------------- */
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('admin_fin_resumo','admin_fin_serie','admin_fin_produtos',
                         'admin_fin_materias','admin_fin_cupones','admin_fin_pendientes')
  loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('revoke all on function %s from anon',   f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
