-- =====================================================================
-- REPASSO MED · TESTE de `compras_abiertas` (PR #51)
--
-- Só leitura. Não cria, não altera e não lê nenhuma tabela real: os
-- pedidos e os itens são fixtures dentro do próprio `with`. Pode correr
-- em produção sem efeito nenhum — e é assim que foi validado.
--
-- Reproduz LITERALMENTE a expressão que a função usa, com uma única
-- diferença mecânica: `public.orders` e `public.order_items` passam a ser
-- as CTEs `orders` e `order_items` com os casos de teste.
--
-- Os dez casos são os do enunciado da revisão:
--   A  sem nenhum pedido                              -> 0
--   B  só pendente                                    -> 1
--   C  só pago                                        -> 0
--   D  duas tentativas da mesma compra, uma pagou     -> 0
--   E  pago A + pendente B                            -> 1
--   F  cesta pendente {A,B} com só A pago depois      -> 1
--   G  cesta duplicada que acabou paga                -> 0
--   H  pendente sem product_id nem itens              -> 1
--   I  dois pendentes equivalentes, nenhum pago       -> 2
--   J  RECOMPRA: pago antigo de A + pendente novo de A-> 1   <<<<<<
-- =====================================================================
with
  pa as (select '11111111-1111-1111-1111-111111111111'::uuid as id),  -- produto A
  pb as (select '22222222-2222-2222-2222-222222222222'::uuid as id),  -- produto B
  orders(id, user_id, status, created_at, paid_at, product_id) as (values
    -- B: só pendente
    ('b0000000-0000-0000-0000-000000000001'::uuid,'b'::text,'pending' ,now()-interval '2 day' ,null::timestamptz,(select id from pa)),
    -- C: só pago
    ('c0000000-0000-0000-0000-000000000001'::uuid,'c'      ,'paid'    ,now()-interval '9 day' ,now()-interval '9 day',(select id from pa)),
    -- D: tentativa falhada às 10:00, sucesso às 10:06
    ('d0000000-0000-0000-0000-000000000001'::uuid,'d'      ,'pending' ,now()-interval '61 min',null                  ,(select id from pa)),
    ('d0000000-0000-0000-0000-000000000002'::uuid,'d'      ,'paid'    ,now()-interval '60 min',now()-interval '55 min',(select id from pa)),
    -- E: pagou A, tem B pendente
    ('e0000000-0000-0000-0000-000000000001'::uuid,'e'      ,'paid'    ,now()-interval '5 day' ,now()-interval '5 day' ,(select id from pa)),
    ('e0000000-0000-0000-0000-000000000002'::uuid,'e'      ,'pending' ,now()-interval '1 day' ,null                   ,(select id from pb)),
    -- F: cesta pendente {A,B}; só A foi pago, e depois
    ('f0000000-0000-0000-0000-000000000001'::uuid,'f'      ,'pending' ,now()-interval '3 day' ,null                   ,null),
    ('f0000000-0000-0000-0000-000000000002'::uuid,'f'      ,'paid'    ,now()-interval '2 day' ,now()-interval '2 day' ,(select id from pa)),
    -- G: cesta {A,B} tentada e depois paga inteira
    ('10000000-0000-0000-0000-000000000001'::uuid,'g'      ,'pending' ,now()-interval '3 day' ,null                   ,null),
    ('10000000-0000-0000-0000-000000000002'::uuid,'g'      ,'paid'    ,now()-interval '2 day' ,now()-interval '2 day' ,null),
    -- H: pendente sem produto nenhum
    ('20000000-0000-0000-0000-000000000001'::uuid,'h'      ,'pending' ,now()-interval '1 day' ,null                   ,null),
    -- I: dois pendentes equivalentes, nada pago
    ('30000000-0000-0000-0000-000000000001'::uuid,'i'      ,'pending' ,now()-interval '2 day' ,null                   ,(select id from pa)),
    ('30000000-0000-0000-0000-000000000002'::uuid,'i'      ,'pending' ,now()-interval '1 day' ,null                   ,(select id from pa)),
    -- J: RECOMPRA — pagou A há 200 dias, hoje abriu um novo pedido de A
    ('40000000-0000-0000-0000-000000000001'::uuid,'j'      ,'paid'    ,now()-interval '200 day',now()-interval '200 day',(select id from pa)),
    ('40000000-0000-0000-0000-000000000002'::uuid,'j'      ,'pending' ,now()-interval '1 hour' ,null                    ,(select id from pa))
  ),
  order_items(order_id, product_id) as (values
    ('f0000000-0000-0000-0000-000000000001'::uuid,(select id from pa)),
    ('f0000000-0000-0000-0000-000000000001'::uuid,(select id from pb)),
    ('10000000-0000-0000-0000-000000000001'::uuid,(select id from pa)),
    ('10000000-0000-0000-0000-000000000001'::uuid,(select id from pb)),
    ('10000000-0000-0000-0000-000000000002'::uuid,(select id from pa)),
    ('10000000-0000-0000-0000-000000000002'::uuid,(select id from pb))
  ),
  gente(id) as (values ('a'),('b'),('c'),('d'),('e'),('f'),('g'),('h'),('i'),('j')),

  -- ================= EXPRESSÃO SOB TESTE, copiada da função =============
  pagos as (
    select o.user_id, pr as product_id, coalesce(o.paid_at, o.created_at) as pago_en
      from orders o
      cross join lateral unnest(
        coalesce(
          (select array_agg(distinct i.product_id) from order_items i where i.order_id = o.id),
          case when o.product_id is not null then array[o.product_id] end,
          '{}'::uuid[])
      ) as pr
     where o.status = 'paid'
  ),
  medido as (
    select p.id as caso, coalesce(ab.n, 0) as compras_abiertas
      from gente p
      left join lateral (
        select count(*)::int as n
          from orders o3
         where o3.user_id = p.id
           and o3.status = 'pending'
           and not (
             coalesce((select array_agg(distinct g.product_id)
                         from pagos g
                        where g.user_id = p.id
                          and g.pago_en >= o3.created_at), '{}'::uuid[])
             @>
             coalesce(
               nullif((select array_agg(distinct i.product_id)
                         from order_items i where i.order_id = o3.id), '{}'),
               case when o3.product_id is not null then array[o3.product_id] end,
               array[gen_random_uuid()]
             )
           )
      ) ab on true
  ),
  -- ======================================================================
  esperado(caso, n, descricao) as (values
    ('a',0,'sem nenhum pedido'),
    ('b',1,'so pendente'),
    ('c',0,'so pago'),
    ('d',0,'duas tentativas da mesma compra, uma pagou depois'),
    ('e',1,'pago A + pendente B'),
    ('f',1,'cesta pendente {A,B} com so A pago'),
    ('g',0,'cesta duplicada que acabou paga inteira'),
    ('h',1,'pendente sem produto conhecido'),
    ('i',2,'dois pendentes equivalentes, nada pago'),
    ('j',1,'RECOMPRA: pago antigo de A + pendente novo de A')
  )
select e.caso, e.descricao, e.n as esperado, m.compras_abiertas as medido,
       case when e.n = m.compras_abiertas then 'OK' else 'FALHOU' end as veredito
  from esperado e join medido m on m.caso = e.caso
 order by e.caso;
