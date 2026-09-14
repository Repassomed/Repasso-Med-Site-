/* =====================================================================
   REPASSO MED · ADMIN V2 — ETAPA C · ACESSOS / CRM
   20260913_08_admin_v2_acessos.sql

   Migration ADITIVA. Não cria tabela, não altera coluna, não apaga
   nada. Só funções de LEITURA e um índice de apoio.

   O QUE «ÚLTIMA ATIVIDADE» SIGNIFICA AQUI — e por que importa
   -----------------------------------------------------------------
   O banco guarda três coisas parecidas que NÃO são a mesma:

     `access_log`                  uma linha por LOGIN. `register_login()`
                                   insere uma a cada entrada. É contagem
                                   de logins, não de atividade.

     `user_sessions.last_seen`     batimento da sessão viva, atualizado
                                   por `touch_session()`. É o dado mais
                                   próximo de «esta pessoa estava aqui».

     `user_study_progress.updated_at`
                                   progresso de ROLAGEM dentro de um
                                   bloco. Diz que a pessoa rolou a
                                   página, não que ela entrou no site.

   Esta migration devolve as duas primeiras SEPARADAS — `ultima_actividad`
   e `ultimo_login` — e um terceiro campo, `visto`, que é o maior dos
   dois e está rotulado pelo que realmente é: o sinal mais recente que o
   banco tem desta pessoa. `user_study_progress` NÃO entra em nenhum dos
   três, e em lugar nenhum isto é chamado de «último acesso».

   CONSENTIMENTO DE MARKETING
   -----------------------------------------------------------------
   Não existe. Não há coluna de opt-in em nenhuma tabela do banco, e
   esta migration NÃO cria uma — inventar um campo vazio e tratá-lo como
   consentimento seria pior que não ter. `profiles.phone` é telefone de
   CADASTRO: a pessoa o deu para criar a conta, não para receber
   campanha. A tela diz isso em voz alta, e o CSV também.

   QUANDO O CAMPO DE OPT-IN EXISTIR
   Basta acrescentar `marketing_optin_at timestamptz` em `profiles` numa
   migration futura, devolvê-lo em `admin_acc_usuarios` e ligar o filtro
   `p_estado = 'optin'` que já está previsto na estrutura do `case`
   abaixo. Nada aqui precisa ser reescrito para isso.

   TELEFONE
   -----------------------------------------------------------------
   O banco devolve o telefone CRU. A classificação em válido / suspeito /
   ausente é feita num único utilitário no navegador (`rmTel`), para não
   existirem duas regras diferentes em dois lugares. E nem o banco nem a
   tela afirmam em momento algum que um número «tem WhatsApp»: número
   válido é número bem formado, não prova de conta.

   IDEMPOTENTE. Rollback: 20260913_08_..._rollback.sql
   ===================================================================== */


create index if not exists orders_user_status_idx
  on public.orders (user_id, status);


/* ---------------------------------------------------------------------
   1 · RESUMO DOS ACESSOS
   --------------------------------------------------------------------- */
create or replace function public.admin_acc_resumo(
  p_tz text default 'America/Sao_Paulo'
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz  text;
  v_hoy timestamptz;
  v_out json;
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
  /* meia-noite local de hoje, de volta para timestamptz */
  v_hoy := (date_trunc('day', now() at time zone v_tz)) at time zone v_tz;

  select json_build_object(
    'total',        count(*)::int,
    'hoy',          count(*) filter (where v.visto >= v_hoy)::int,
    'semana',       count(*) filter (where v.visto >= now() - interval '7 days')::int,
    'mes',          count(*) filter (where v.visto >= now() - interval '30 days')::int,
    'inactivos_30', count(*) filter (where v.visto is not null
                                       and v.visto <  now() - interval '30 days')::int,
    'nunca',        count(*) filter (where v.visto is null)::int,
    'con_telefono', count(*) filter (where nullif(btrim(coalesce(p.phone,'')),'') is not null)::int,
    'sin_telefono', count(*) filter (where nullif(btrim(coalesce(p.phone,'')),'') is null)::int,
    'con_compra',   count(*) filter (where c.pagas > 0)::int,
    'con_pendiente',count(*) filter (where c.pend  > 0)::int,
    'consentimiento_marketing', false,
    'fuente_actividad', 'user_sessions.last_seen + access_log (login). NO incluye user_study_progress.'
  ) into v_out
  from public.profiles p
  /* `greatest` no Postgres ignora NULL: devolve o maior valor presente,
     e só é NULL quando os dois são NULL — que é exatamente «esta pessoa
     nunca deu sinal». */
  left join lateral (
    select greatest(
             (select s.last_seen      from public.user_sessions s where s.user_id = p.id),
             (select max(a.created_at) from public.access_log   a where a.user_id = p.id)
           ) as visto
  ) v on true
  left join lateral (
    select count(*) filter (where o.status = 'paid')::int    as pagas,
           count(*) filter (where o.status = 'pending')::int as pend
      from public.orders o where o.user_id = p.id
  ) c on true;

  return v_out;
end;
$$;

comment on function public.admin_acc_resumo(text) is
  'ADMIN V2. Resumo de acessos. «visto» = maior entre user_sessions.last_seen e o ultimo login do access_log. NAO usa user_study_progress. Exige is_admin().';


/* ---------------------------------------------------------------------
   2 · LISTA DE USUÁRIOS COM BUSCA E FILTRO
   `total_filtrado` volta em todas as linhas (window function) para a
   paginação não precisar de uma segunda consulta.
   --------------------------------------------------------------------- */
create or replace function public.admin_acc_usuarios(
  p_busca  text default null,
  p_estado text default 'todos',
  p_limit  int  default 100,
  p_offset int  default 0,
  p_tz     text default 'America/Sao_Paulo'
) returns table(
  user_id           uuid,
  nombre            text,
  email             text,
  telefone          text,
  creado_en         timestamptz,
  ultima_actividad  timestamptz,
  ultimo_login      timestamptz,
  visto             timestamptz,
  logins            int,
  materias_vigentes int,
  materias_vencidas int,
  compras_pagas     int,
  gasto_cents       bigint,
  pendientes        int,
  estado            text,
  total_filtrado    bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz   text;
  v_hoy  timestamptz;
  v_q    text;
  v_est  text;
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

  v_q   := nullif(btrim(coalesce(p_busca, '')), '');
  v_est := lower(coalesce(p_estado, 'todos'));

  return query
  with base as (
    select p.id, p.full_name, p.email, nullif(btrim(coalesce(p.phone,'')),'') as tel,
           p.created_at,
           s.last_seen,
           a.ult_login, coalesce(a.n, 0) as n_logins,
           greatest(s.last_seen, a.ult_login) as visto,
           coalesce(ms.vig, 0) as vig, coalesce(ms.ven, 0) as ven,
           coalesce(o.pagas, 0) as pagas, coalesce(o.gasto, 0) as gasto,
           coalesce(o.pend, 0) as pend
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
  ),
  clasificado as (
    select b.*,
           case
             when b.visto is null                              then 'nunca'
             when b.visto >= v_hoy                             then 'hoy'
             when b.visto >= now() - interval '7 days'          then 'semana'
             when b.visto >= now() - interval '30 days'         then 'mes'
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
       and case v_est
             when 'todos'      then true
             when 'hoy'        then c.est = 'hoy'
             when '7d'         then c.visto >= now() - interval '7 days'
             when '30d'        then c.visto >= now() - interval '30 days'
             when 'inactivos'  then c.visto is not null and c.visto < now() - interval '30 days'
             when 'nunca'      then c.visto is null
             when 'con_pago'   then c.pagas > 0
             when 'sin_pago'   then c.pagas = 0
             when 'pendientes' then c.pend  > 0
             when 'con_tel'    then c.tel is not null
             when 'sin_tel'    then c.tel is null
             when 'vigentes'   then c.vig  > 0
             when 'vencidos'   then c.ven  > 0 and c.vig = 0
             /* 'optin' fica pronto para quando existir a coluna de
                consentimento; hoje não existe, então não devolve nada
                em vez de devolver todo mundo como se tivesse aceitado */
             when 'optin'      then false
             else true
           end
  )
  select f.id, f.full_name, f.email, f.tel, f.created_at,
         f.last_seen, f.ult_login, f.visto, f.n_logins,
         f.vig, f.ven, f.pagas, f.gasto, f.pend, f.est,
         count(*) over ()
    from filtrado f
   order by f.visto desc nulls last, f.created_at desc
   limit  greatest(1, least(coalesce(p_limit, 100), 5000))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

comment on function public.admin_acc_usuarios(text, text, int, int, text) is
  'ADMIN V2. Lista de alunos com busca, filtro e paginacao. Devolve ultima_actividad (heartbeat) e ultimo_login SEPARADOS. Exige is_admin().';


/* ---------------------------------------------------------------------
   3 · FICHA DE UM ALUNO (painel lateral do CRM)
   Usa o MESMO mecanismo de entitlements que o resto do painel já usa:
   `user_subjects` com `expires_at`. Nada de regra paralela.
   --------------------------------------------------------------------- */
create or replace function public.admin_acc_detalle(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_out json;
begin
  if not public.is_admin() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  select json_build_object(
    'user_id',   p.id,
    'nombre',    p.full_name,
    'email',     p.email,
    'telefone',  nullif(btrim(coalesce(p.phone,'')),''),
    'activo',    p.is_active,
    'creado_en', p.created_at,
    'ultima_actividad', s.last_seen,
    'ultimo_login',     (select max(al.created_at) from public.access_log al where al.user_id = p.id),
    'logins',           (select count(*)::int      from public.access_log al where al.user_id = p.id),
    'dispositivos',     (select count(*)::int      from public.user_devices d where d.user_id = p.id),
    'progreso_ultimo',  (select max(sp.updated_at) from public.user_study_progress sp where sp.user_id = p.id),
    'materias', coalesce((
      select json_agg(json_build_object(
               'slug', us.subject_slug,
               'nombre', coalesce(sj.name, us.subject_slug),
               'plan', us.plan,
               'desde', us.granted_at,
               'hasta', us.expires_at,
               'vigente', (us.expires_at is null or us.expires_at > now())
             ) order by (us.expires_at is null or us.expires_at > now()) desc, us.granted_at desc)
        from public.user_subjects us
        left join public.subjects sj on sj.slug = us.subject_slug
       where us.user_id = p.id), '[]'::json),
    'pedidos', coalesce((
      select json_agg(json_build_object(
               'id', o.id, 'status', o.status,
               'amount_cents', o.amount_cents,
               'creado', o.created_at, 'pagado', o.paid_at,
               'cupon', o.coupon_code,
               'productos', (select string_agg(pr.name, ' + ' order by pr.name)
                               from public.order_items oi
                               join public.products pr on pr.id = oi.product_id
                              where oi.order_id = o.id)
             ) order by o.created_at desc)
        from public.orders o where o.user_id = p.id), '[]'::json),
    'consentimiento_marketing', null,
    'nota_consentimiento',
      'No existe columna de consentimiento de marketing en la base. El telefono es de registro, no autorizacion.'
  ) into v_out
  from public.profiles p
  left join public.user_sessions s on s.user_id = p.id
  where p.id = p_user_id;

  return v_out;
end;
$$;

comment on function public.admin_acc_detalle(uuid) is
  'ADMIN V2. Ficha completa de um aluno para o painel lateral. Entitlements vem de user_subjects, o mesmo mecanismo do resto do painel. Exige is_admin().';


/* ---------------------------------------------------------------------
   PERMISSÕES
   --------------------------------------------------------------------- */
revoke all on function public.admin_acc_resumo(text)                    from public, anon;
revoke all on function public.admin_acc_usuarios(text, text, int, int, text) from public, anon;
revoke all on function public.admin_acc_detalle(uuid)                   from public, anon;

grant execute on function public.admin_acc_resumo(text)                    to authenticated;
grant execute on function public.admin_acc_usuarios(text, text, int, int, text) to authenticated;
grant execute on function public.admin_acc_detalle(uuid)                   to authenticated;
