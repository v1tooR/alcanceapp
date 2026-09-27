-- =============================================================================
-- Modelos de leitura: views de listagem e RPCs de resumo/painel.
--
-- Padrão de listagem (igual para todas as listas do sistema):
--   * cada lista lê uma view `*_list` com `security_invoker = true` (a RLS das
--     tabelas continua valendo para quem consulta);
--   * a view expõe `search_text` (sem acento, minúsculo) para a busca livre;
--   * o front pagina com Range/offset + `count=exact`, filtra por igualdade e
--     ordena por colunas da própria view — ver src/services/supabase/listagem.ts.
--
-- Séries mensais saem como [{ "chave": "2026-09", "valor": 3 }, ...]; os
-- rótulos em pt-BR ("Set", "setembro de 2026") são montados no front.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Views de listagem
-- -----------------------------------------------------------------------------

create view public.client_list with (security_invoker = true) as
select
  c.*,
  h.client_id is not null as has_health_profile,
  h.disability_categories,
  h.notes as health_notes,
  h.has_medical_report,
  h.medical_report_valid_until,
  r.full_name as responsible_name,
  (select count(*) from public.processes p where p.client_id = c.id)::integer as total_processes,
  (select count(*) from public.processes p where p.client_id = c.id and app.process_is_active(p.status))::integer as active_processes,
  (select count(*) from public.documents d
    where d.client_id = c.id and d.status in ('solicitado', 'reenvio_solicitado'))::integer as pending_documents,
  (select max(m.created_at) from public.process_movements m
    join public.processes p on p.id = m.process_id where p.client_id = c.id) as last_movement_at,
  app.normalize_search(concat_ws(' ', c.full_name, c.code, c.email, c.cpf)) as search_text
from public.clients c
left join public.client_health_profiles h on h.client_id = c.id
left join public.profiles r on r.id = c.responsible_id;

create view public.process_list with (security_invoker = true) as
select
  p.*,
  c.full_name as client_name,
  c.code as client_code,
  r.full_name as responsible_name,
  coalesce(s.total, 0)::integer as total_subprocesses,
  coalesce(s.granted, 0)::integer as completed_subprocesses,
  coalesce(s.types, '{}') as subprocess_types,
  (select count(*) from public.documents d
    where d.process_id = p.id and d.status in ('solicitado', 'reenvio_solicitado'))::integer as pending_documents,
  app.process_progress(p.id) as progress,
  (app.process_is_active(p.status) and p.due_date < app.today()) as is_overdue,
  (
    p.due_date < app.today()
    or exists (select 1 from public.documents d
               where d.process_id = p.id and d.status in ('solicitado', 'reenvio_solicitado'))
  ) as has_pending_items,
  case p.priority when 'urgente' then 0 when 'alta' then 1 when 'normal' then 2 else 3 end as priority_rank,
  app.normalize_search(concat_ws(' ', p.code, p.title, c.full_name, c.code)) as search_text
from public.processes p
join public.clients c on c.id = p.client_id
left join public.profiles r on r.id = p.responsible_id
left join lateral (
  select count(*) as total,
         count(*) filter (where sp.status = 'deferido') as granted,
         array_agg(sp.type order by sp.created_at) as types
  from public.subprocesses sp where sp.process_id = p.id
) s on true;

create view public.document_list with (security_invoker = true) as
select
  d.*,
  c.full_name as client_name,
  p.code as process_code,
  sp.type as subprocess_type,
  d.status in ('enviado', 'em_analise') as awaiting_review,
  app.normalize_search(concat_ws(' ', d.title, c.full_name, p.code)) as search_text
from public.documents d
join public.clients c on c.id = d.client_id
left join public.processes p on p.id = d.process_id
left join public.subprocesses sp on sp.id = d.subprocess_id;

create view public.financial_list with (security_invoker = true) as
select
  f.*,
  c.full_name as client_name,
  p.code as process_code,
  app.normalize_search(concat_ws(' ', f.description, c.full_name, p.code)) as search_text
from public.financial_records f
join public.clients c on c.id = f.client_id
left join public.processes p on p.id = f.process_id
where f.deleted_at is null;

create view public.calendar_event_list with (security_invoker = true) as
select
  e.*,
  c.full_name as client_name,
  p.code as process_code,
  r.full_name as responsible_name
from public.calendar_events e
left join public.clients c on c.id = e.client_id
left join public.processes p on p.id = e.process_id
left join public.profiles r on r.id = e.responsible_id
where e.deleted_at is null;

create view public.movement_feed with (security_invoker = true) as
select
  m.*,
  c.full_name as client_name,
  p.code as process_code
from public.process_movements m
join public.processes p on p.id = m.process_id
join public.clients c on c.id = p.client_id;

revoke all on public.client_list, public.process_list, public.document_list, public.financial_list,
  public.calendar_event_list, public.movement_feed from anon;
grant select on public.client_list, public.process_list, public.document_list, public.financial_list,
  public.calendar_event_list, public.movement_feed to authenticated;

-- -----------------------------------------------------------------------------
-- Séries mensais
-- -----------------------------------------------------------------------------

-- Os `p_months` meses que terminam no mês corrente (o último é parcial).
create function app.month_buckets(p_months integer)
returns table (month_start date)
language sql
stable
set search_path = ''
as $$
  select (date_trunc('month', app.today()) - make_interval(months => p_months - 1 - g))::date
  from generate_series(0, p_months - 1) g
  order by 1
$$;

grant execute on function app.month_buckets(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Resumos de cada módulo
-- -----------------------------------------------------------------------------

create function public.client_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with base as (
    select c.status, c.type, c.portal_access_enabled, c.created_at,
           exists (select 1 from public.documents d
                   where d.client_id = c.id and d.status in ('solicitado', 'reenvio_solicitado')) as has_pending
    from public.clients c
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'ativos', (select count(*) from base where status = 'ativo'),
    'comAcessoPortal', (select count(*) from base where status = 'ativo' and portal_access_enabled),
    'comDocumentosPendentes', (select count(*) from base where has_pending),
    'condutores', (select count(*) from base where status = 'ativo' and type = 'condutor'),
    'naoCondutores', (select count(*) from base where status = 'ativo' and type = 'nao_condutor'),
    'novosPorMes', (
      select jsonb_agg(jsonb_build_object(
        'chave', to_char(b.month_start, 'YYYY-MM'),
        'valor', (select count(*) from base where app.month_of(created_at) = b.month_start)
      ) order by b.month_start)
      from app.month_buckets(12) b
    )
  )
$$;

create function public.process_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with base as (
    select p.id, p.status, p.due_date, p.opened_at, p.concluded_at,
           app.process_is_active(p.status) as active
    from public.processes p
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'ativos', (select count(*) from base where active),
    'porStatus', (
      select jsonb_agg(jsonb_build_object(
        'status', s.status,
        'total', (select count(*) from base where base.status = s.status)
      ) order by s.ord)
      from unnest(enum_range(null::public.process_status)) with ordinality as s (status, ord)
    ),
    'comPrazoVencido', (select count(*) from base where active and due_date < app.today()),
    'progressoMedio', coalesce((select round(avg(app.process_progress(id)))::integer from base where active), 0),
    'abertosPorMes', (
      select jsonb_agg(jsonb_build_object(
        'chave', to_char(b.month_start, 'YYYY-MM'),
        'valor', (select count(*) from base where app.month_of(opened_at) = b.month_start)
      ) order by b.month_start)
      from app.month_buckets(12) b
    ),
    'concluidosPorMes', (
      select jsonb_agg(jsonb_build_object(
        'chave', to_char(b.month_start, 'YYYY-MM'),
        'valor', (select count(*) from base where app.month_of(concluded_at) = b.month_start)
      ) order by b.month_start)
      from app.month_buckets(12) b
    )
  )
$$;

create function public.document_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with base as (
    select d.status, d.is_sensitive, d.uploaded_at, d.reviewed_at from public.documents d
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'porStatus', (
      select jsonb_agg(jsonb_build_object(
        'status', s.status,
        'total', (select count(*) from base where base.status = s.status)
      ) order by s.ord)
      from unnest(enum_range(null::public.document_status)) with ordinality as s (status, ord)
    ),
    'funil', jsonb_build_object(
      'solicitados', (select count(*) from base),
      'recebidos', (select count(*) from base where uploaded_at is not null),
      'analisados', (select count(*) from base
                     where uploaded_at is not null and status in ('aprovado', 'reprovado', 'reenvio_solicitado')),
      'aprovados', (select count(*) from base where status = 'aprovado')
    ),
    'sensiveis', (select count(*) from base where is_sensitive),
    'aguardandoAnalise', (select count(*) from base where status in ('enviado', 'em_analise')),
    'aguardandoCliente', (select count(*) from base where status in ('solicitado', 'reenvio_solicitado')),
    'devolvidos', (select count(*) from base where status in ('reprovado', 'reenvio_solicitado')),
    'recebidosPorMes', (
      select jsonb_agg(jsonb_build_object(
        'chave', to_char(b.month_start, 'YYYY-MM'),
        'valor', (select count(*) from base where app.month_of(uploaded_at) = b.month_start)
      ) order by b.month_start)
      from app.month_buckets(12) b
    ),
    'tempoMedioAnaliseDias', (
      select round(avg(
        (reviewed_at at time zone app.timezone())::date - (uploaded_at at time zone app.timezone())::date
      ), 1)
      from base where uploaded_at is not null and reviewed_at is not null
    )
  )
$$;

create function public.finance_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with base as (
    select f.status, f.payment_method, f.created_at, f.paid_at, f.amount_paid,
           (f.total_amount - f.discount) as net
    from public.financial_records f
    where f.deleted_at is null
  ),
  valid as (select * from base where status <> 'cancelado')
  select jsonb_build_object(
    'totalContratado', coalesce((select sum(net) from valid), 0),
    'totalRecebido', coalesce((select sum(amount_paid) from valid), 0),
    'totalEmAberto', coalesce((select sum(net) - sum(amount_paid) from valid), 0),
    'totalAtrasado', coalesce((select sum(net - amount_paid) from valid where status = 'atrasado'), 0),
    'porStatus', (
      select jsonb_agg(jsonb_build_object(
        'status', s.status,
        'total', (select count(*) from base where base.status = s.status),
        'valor', coalesce((select sum(net) from base where base.status = s.status), 0)
      ) order by s.ord)
      from unnest(enum_range(null::public.financial_status)) with ordinality as s (status, ord)
    ),
    'porForma', (
      select jsonb_agg(jsonb_build_object(
        'forma', m.method,
        'total', (select count(*) from valid where payment_method = m.method),
        'valor', coalesce((select sum(amount_paid) from valid where payment_method = m.method), 0)
      ) order by m.ord)
      from unnest(enum_range(null::public.payment_method)) with ordinality as m (method, ord)
    ),
    'serieMensal', (
      select jsonb_agg(jsonb_build_object(
        'chave', to_char(b.month_start, 'YYYY-MM'),
        'contratado', coalesce((select sum(net) from valid where app.month_of(created_at) = b.month_start), 0),
        'recebido', coalesce((select sum(amount_paid) from valid
                              where date_trunc('month', paid_at)::date = b.month_start), 0)
      ) order by b.month_start)
      from app.month_buckets(12) b
    )
  )
$$;

-- -----------------------------------------------------------------------------
-- Painel inicial
-- -----------------------------------------------------------------------------

create function public.dashboard_summary()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with active_subs as (
    select s.due_date from public.subprocesses s
    where not app.subprocess_is_final(s.status) and s.due_date is not null
  ),
  stale_limit as (
    select now() - make_interval(days => coalesce((select stale_process_days from public.company_settings), 15)) as at
  )
  select jsonb_build_object(
    'clientesAtivos', (select count(*) from public.clients where status = 'ativo'),
    'processosAtivos', (select count(*) from public.processes where app.process_is_active(status)),
    'documentosAguardandoAnalise', (select count(*) from public.documents where status in ('enviado', 'em_analise')),
    'prazosVencidos', (select count(*) from active_subs where due_date < app.today()),
    'prazosProximos7Dias', (select count(*) from active_subs where due_date between app.today() and app.today() + 7),
    'processosSemMovimentacao', (
      select count(*) from public.processes p
      where app.process_is_active(p.status)
        and coalesce((select max(m.created_at) from public.process_movements m where m.process_id = p.id), '-infinity')
            < (select at from stale_limit)
    )
  )
$$;

create function public.dashboard_pending_items(p_limit integer default 12)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with settings as (
    select coalesce((select stale_process_days from public.company_settings), 15) as stale_days
  ),
  items as (
    -- Documentos aguardando análise
    select
      'doc-' || d.id as id, 'documento' as tipo, 'Documento aguardando análise' as titulo,
      c.full_name || ' — ' || app.document_public_title(d.title, d.is_sensitive) as descricao,
      c.id as cliente_id, c.full_name as cliente_nome, d.process_id, d.subprocess_id,
      null::date as prazo, null::uuid as responsavel_id, 'media' as gravidade,
      '/app/documentos?documento=' || d.id as link, 1 as grupo, d.updated_at as referencia
    from public.documents d
    join public.clients c on c.id = d.client_id
    where d.status in ('enviado', 'em_analise') and d.process_id is not null

    union all

    -- Prazos de subprocessos vencidos ou nos próximos 7 dias
    select
      'prz-' || s.id, 'prazo',
      case when s.due_date < app.today() then 'Prazo vencido' else 'Prazo próximo' end,
      app.subprocess_name(s.type) || ' — ' || c.full_name,
      c.id, c.full_name, p.id, s.id, s.due_date, s.responsible_id,
      case when s.due_date < app.today() then 'alta' else 'media' end,
      '/app/processos/' || p.id, 2, s.due_date::timestamptz
    from public.subprocesses s
    join public.processes p on p.id = s.process_id
    join public.clients c on c.id = p.client_id
    where not app.subprocess_is_final(s.status)
      and s.due_date is not null
      and s.due_date <= app.today() + 7

    union all

    -- Processos ativos sem movimentação recente
    select
      'mov-' || p.id, 'sem_movimentacao',
      'Sem movimentação há mais de ' || (select stale_days from settings) || ' dias',
      p.code || ' — ' || c.full_name,
      c.id, c.full_name, p.id, null, null, p.responsible_id, 'baixa',
      '/app/processos/' || p.id, 3, p.updated_at
    from public.processes p
    join public.clients c on c.id = p.client_id
    where app.process_is_active(p.status)
      and coalesce((select max(m.created_at) from public.process_movements m where m.process_id = p.id), '-infinity')
          < now() - make_interval(days => (select stale_days from settings))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'tipo', i.tipo, 'titulo', i.titulo, 'descricao', i.descricao,
    'clienteId', i.cliente_id, 'clienteNome', i.cliente_nome, 'processoId', i.process_id,
    'subprocessoId', i.subprocess_id, 'prazo', i.prazo, 'responsavelId', i.responsavel_id,
    'gravidade', i.gravidade, 'link', i.link
  ) order by i.ordem), '[]'::jsonb)
  from (
    select items.*,
           row_number() over (
             order by case gravidade when 'alta' then 0 when 'media' then 1 else 2 end, grupo, referencia
           ) as ordem
    from items
  ) i
  where i.ordem <= greatest(p_limit, 0)
$$;

create function public.dashboard_analytics(p_months integer)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_months integer := least(greatest(coalesce(p_months, 6), 1), 24);
  v_start date := (date_trunc('month', app.today()) - make_interval(months => v_months - 1))::date;
  v_end date := (date_trunc('month', app.today()) + interval '1 month')::date;
  v_prev date := (v_start - make_interval(months => v_months))::date;
  v_today date := app.today();
begin
  return jsonb_build_object(
    'meses', v_months,
    'inicioPeriodo', v_start,
    'serie', (
      select jsonb_agg(jsonb_build_object(
        'chave', to_char(b.month_start, 'YYYY-MM'),
        'abertos', (select count(*) from public.processes p where app.month_of(p.opened_at) = b.month_start),
        'concluidos', (select count(*) from public.processes p where app.month_of(p.concluded_at) = b.month_start),
        'documentosRecebidos', (select count(*) from public.documents d where app.month_of(d.uploaded_at) = b.month_start),
        'movimentacoes', (select count(*) from public.process_movements m where app.month_of(m.created_at) = b.month_start)
      ) order by b.month_start)
      from app.month_buckets(v_months) b
    ),
    'comparativos', jsonb_build_object(
      'abertos', jsonb_build_object(
        'atual', (select count(*) from public.processes p where app.month_of(p.opened_at) >= v_start and app.month_of(p.opened_at) < v_end),
        'anterior', (select count(*) from public.processes p where app.month_of(p.opened_at) >= v_prev and app.month_of(p.opened_at) < v_start)
      ),
      'concluidos', jsonb_build_object(
        'atual', (select count(*) from public.processes p where app.month_of(p.concluded_at) >= v_start and app.month_of(p.concluded_at) < v_end),
        'anterior', (select count(*) from public.processes p where app.month_of(p.concluded_at) >= v_prev and app.month_of(p.concluded_at) < v_start)
      ),
      'documentosRecebidos', jsonb_build_object(
        'atual', (select count(*) from public.documents d where app.month_of(d.uploaded_at) >= v_start and app.month_of(d.uploaded_at) < v_end),
        'anterior', (select count(*) from public.documents d where app.month_of(d.uploaded_at) >= v_prev and app.month_of(d.uploaded_at) < v_start)
      ),
      'movimentacoes', jsonb_build_object(
        'atual', (select count(*) from public.process_movements m where app.month_of(m.created_at) >= v_start and app.month_of(m.created_at) < v_end),
        'anterior', (select count(*) from public.process_movements m where app.month_of(m.created_at) >= v_prev and app.month_of(m.created_at) < v_start)
      )
    ),
    'situacaoProcessos', (
      select jsonb_agg(jsonb_build_object(
        'status', s.status,
        'total', (select count(*) from public.processes p where p.status = s.status)
      ) order by s.ord)
      from unnest(array['em_andamento', 'aguardando_cliente', 'aguardando_orgao', 'em_avaliacao']::public.process_status[])
        with ordinality as s (status, ord)
    ),
    'subprocessosPorTipo', coalesce((
      select jsonb_agg(row_data order by display_order)
      from (
        select c.display_order, jsonb_build_object(
          'tipo', c.type,
          'emAndamento', count(*) filter (where s.status = 'em_andamento'),
          'aguardandoCliente', count(*) filter (where s.status = 'aguardando_documentos'),
          'aguardandoOrgao', count(*) filter (where s.status = 'aguardando_orgao'),
          'naoIniciado', count(*) filter (where s.status = 'nao_iniciado'),
          'deferidos', count(*) filter (where s.status = 'deferido'),
          'indeferidos', count(*) filter (where s.status = 'indeferido')
        ) as row_data
        from public.subprocess_catalog c
        join public.subprocesses s on s.type = c.type
        where s.status in ('em_andamento', 'aguardando_documentos', 'aguardando_orgao', 'nao_iniciado', 'deferido', 'indeferido')
        group by c.type, c.display_order
      ) linhas
    ), '[]'::jsonb),
    'documentos', (
      select jsonb_build_object(
        'solicitados', count(*),
        'recebidos', count(*) filter (where d.uploaded_at is not null),
        'analisados', count(*) filter (where d.uploaded_at is not null and d.status in ('aprovado', 'reprovado', 'reenvio_solicitado')),
        'aprovados', count(*) filter (where d.status = 'aprovado'),
        'devolvidos', count(*) filter (where d.status in ('reprovado', 'reenvio_solicitado')),
        'aguardandoAnalise', count(*) filter (where d.status in ('enviado', 'em_analise')),
        'aguardandoCliente', count(*) filter (where d.status in ('solicitado', 'reenvio_solicitado'))
      )
      from public.documents d
      where app.month_of(d.requested_at) >= v_start and app.month_of(d.requested_at) < v_end
    ),
    'cargaEquipe', coalesce((
      select jsonb_agg(jsonb_build_object(
        'usuarioId', t.id, 'nome', t.full_name, 'ativos', t.active_count, 'atrasados', t.late_count
      ) order by t.active_count desc, t.full_name)
      from (
        select pr.id, pr.full_name,
               count(s.id) as active_count,
               count(s.id) filter (where s.due_date < v_today) as late_count
        from public.profiles pr
        join public.subprocesses s on s.responsible_id = pr.id and not app.subprocess_is_final(s.status)
        where pr.active and pr.role <> 'cliente'
        group by pr.id, pr.full_name
      ) t
    ), '[]'::jsonb),
    'prazos', (
      select jsonb_build_object(
        'vencidos', count(*) filter (where s.due_date < v_today),
        'proximos7Dias', count(*) filter (where s.due_date between v_today and v_today + 7),
        'emDia', count(*) filter (where s.due_date > v_today + 7),
        'semPrazo', count(*) filter (where s.due_date is null)
      )
      from public.subprocesses s
      where not app.subprocess_is_final(s.status)
    )
  );
end
$$;

revoke execute on function
  public.client_stats(), public.process_stats(), public.document_stats(), public.finance_stats(),
  public.dashboard_summary(), public.dashboard_pending_items(integer), public.dashboard_analytics(integer)
from public, anon;
grant execute on function
  public.client_stats(), public.process_stats(), public.document_stats(), public.finance_stats(),
  public.dashboard_summary(), public.dashboard_pending_items(integer), public.dashboard_analytics(integer)
to authenticated;

-- -----------------------------------------------------------------------------
-- Área do cliente
--
-- SECURITY DEFINER: o cliente não tem leitura direta nas tabelas. Estas funções
-- descobrem o cliente pela sessão (nunca pelo parâmetro) e devolvem somente o
-- recorte liberado — sem observações internas, etapas ocultas, documentos
-- internos, movimentações internas nem financeiro.
-- -----------------------------------------------------------------------------

create function app.portal_client_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_client_id uuid := app.current_client_id();
begin
  if v_client_id is null then
    perform app.fail('AL403', 'Você não tem permissão para esta ação.');
  end if;
  return v_client_id;
end
$$;

create function app.portal_client_json(p_client_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(c) - 'internal_notes' - 'search_text' - 'responsible_name' - 'created_by'
  from public.client_list c where c.id = p_client_id
$$;

create function app.portal_document_json(d public.documents)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(d) - 'internal_notes' - 'file_path'
$$;

create function app.portal_subprocesses_json(p_process_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    (to_jsonb(s) - 'internal_notes') || jsonb_build_object('steps', coalesce((
      select jsonb_agg(to_jsonb(st) - 'internal_notes' - 'deleted_at' order by st.position)
      from public.process_steps st
      where st.subprocess_id = s.id and st.deleted_at is null and st.visible_to_client
    ), '[]'::jsonb))
    order by s.created_at
  ), '[]'::jsonb)
  from public.subprocesses s
  where s.process_id = p_process_id
$$;

create function public.portal_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select app.portal_client_id() as client_id)
  select jsonb_build_object(
    'client', app.portal_client_json(me.client_id),
    'processes', coalesce((
      select jsonb_agg(
        (to_jsonb(p) - 'internal_notes' - 'created_by')
          || jsonb_build_object(
               'subprocesses', app.portal_subprocesses_json(p.id),
               'progress', app.process_progress(p.id)
             )
        order by p.opened_at desc
      )
      from public.processes p where p.client_id = me.client_id
    ), '[]'::jsonb),
    'pending_documents', coalesce((
      select jsonb_agg(app.portal_document_json(d) order by d.upload_deadline nulls last, d.requested_at)
      from public.documents d
      where d.client_id = me.client_id and d.visibility = 'cliente'
        and d.status in ('solicitado', 'reenvio_solicitado')
    ), '[]'::jsonb),
    'upcoming_events', coalesce((
      select jsonb_agg(to_jsonb(e) - 'deleted_at' - 'created_by' order by e.event_date, e.event_time)
      from (
        select * from public.calendar_events e
        where e.client_id = me.client_id and e.visibility = 'cliente' and e.status = 'agendado'
          and e.deleted_at is null and e.event_date >= app.today()
        order by e.event_date, e.event_time
        limit 5
      ) e
    ), '[]'::jsonb),
    'unread', (
      select count(*) from public.notifications n
      where n.recipient_id = auth.uid() and n.read_at is null
    )
  )
  from me
$$;

create function public.portal_process(p_process_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_client_id uuid := app.portal_client_id();
  v_process public.processes;
begin
  select * into v_process from public.processes where id = p_process_id and client_id = v_client_id;
  if v_process.id is null then
    perform app.fail('AL404', 'Processo não encontrado.');
  end if;

  return (to_jsonb(v_process) - 'internal_notes' - 'created_by') || jsonb_build_object(
    'client', app.portal_client_json(v_client_id),
    'responsible', (
      select jsonb_build_object('id', r.id, 'full_name', r.full_name, 'role', r.role,
                                'job_title', r.job_title, 'active', r.active, 'created_at', r.created_at)
      from public.profiles r where r.id = v_process.responsible_id
    ),
    'subprocesses', app.portal_subprocesses_json(v_process.id),
    'documents', coalesce((
      select jsonb_agg(app.portal_document_json(d) order by d.updated_at desc)
      from public.documents d
      where d.process_id = v_process.id and d.visibility = 'cliente'
    ), '[]'::jsonb),
    'movements', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at desc)
      from public.process_movements m
      where m.process_id = v_process.id and m.visible_to_client
    ), '[]'::jsonb)
  );
end
$$;

create function public.portal_documents()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(app.portal_document_json(d) order by d.updated_at desc), '[]'::jsonb)
  from public.documents d
  where d.client_id = app.portal_client_id() and d.visibility = 'cliente'
$$;

revoke execute on function public.portal_overview(), public.portal_process(uuid), public.portal_documents()
from public, anon;
grant execute on function public.portal_overview(), public.portal_process(uuid), public.portal_documents()
to authenticated;
