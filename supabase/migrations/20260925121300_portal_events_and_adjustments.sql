-- =============================================================================
-- Ajustes encontrados na conexão do front-end.
-- =============================================================================

-- 1. Agenda do portal: o cliente não lê `calendar_events` diretamente.
create function public.portal_events(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    (to_jsonb(e) - 'deleted_at' - 'created_by' - 'responsible_id')
      || jsonb_build_object('process_code', p.code)
    order by e.event_date, e.event_time nulls last
  ), '[]'::jsonb)
  from public.calendar_events e
  left join public.processes p on p.id = e.process_id
  where e.client_id = app.portal_client_id()
    and e.visibility = 'cliente'
    and e.deleted_at is null
    and e.event_date between p_from and p_to
$$;

revoke execute on function public.portal_events(date, date) from public, anon;
grant execute on function public.portal_events(date, date) to authenticated;

-- 2. Evento visível ao cliente sem cliente: mensagem clara em vez de erro genérico
--    de constraint (o formulário do calendário não valida essa combinação).
alter table public.calendar_events drop constraint calendar_events_client_when_visible;

create function app.calendar_events_check_visibility()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visibility = 'cliente' and new.client_id is null then
    perform app.fail('AL422', 'Para exibir o evento ao cliente, escolha o cliente.');
  end if;
  return new;
end
$$;

create trigger calendar_events_check_visibility
  before insert or update of visibility, client_id on public.calendar_events
  for each row execute function app.calendar_events_check_visibility();

-- 3. Posição da etapa opcional na inclusão: -1 = "fim da lista".
alter table public.process_steps alter column position set default -1;

create or replace function app.process_steps_set_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.position is null or new.position < 0 then
    select coalesce(max(s.position) + 1, 0) into new.position
    from public.process_steps s
    where s.subprocess_id = new.subprocess_id and s.deleted_at is null;
  end if;
  return new;
end
$$;
