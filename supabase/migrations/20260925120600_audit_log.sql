-- =============================================================================
-- Trilha de auditoria imutável: quem fez o quê e quando.
--
-- Gravada por gatilho nas tabelas de negócio e administrativas, e por eventos
-- explícitos (ex.: abertura de arquivo de documento, pela Edge Function).
-- Leitura restrita ao administrador. Ninguém altera nem apaga linhas.
-- =============================================================================

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- Sem FK de propósito: o registro sobrevive à remoção da conta.
  actor_id uuid,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id uuid,
  -- INSERT: {"new": {...}} · UPDATE: {"coluna": {"old":..,"new":..}} · DELETE: {"old": {...}}
  changes jsonb,
  metadata jsonb
);

comment on table public.audit_log is 'Auditoria imutável. Somente inclusão; leitura pelo administrador.';

create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id);

create function app.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log é somente inclusão' using errcode = 'AL403';
end
$$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function app.audit_log_immutable();

-- Registra um evento explícito (usado por RPCs e Edge Functions).
create function app.audit(
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_metadata jsonb default null,
  p_actor_id uuid default null
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, metadata)
  values (
    coalesce(p_actor_id, auth.uid()),
    coalesce(
      (select p.role::text from public.profiles p where p.id = coalesce(p_actor_id, auth.uid())),
      auth.role()
    ),
    p_action, p_entity, p_entity_id, p_metadata
  );
$$;

grant execute on function app.audit(text, text, uuid, jsonb, uuid) to authenticated, service_role;

-- Gatilho genérico de auditoria por linha.
create function app.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
  v_row jsonb;
  v_entity_id uuid;
begin
  if app.is_seeding() then
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;

  if tg_op = 'INSERT' then
    v_changes := jsonb_build_object('new', v_new);
  elsif tg_op = 'DELETE' then
    v_changes := jsonb_build_object('old', v_old);
  else
    select jsonb_object_agg(n.key, jsonb_build_object('old', v_old -> n.key, 'new', n.value))
      into v_changes
    from jsonb_each(v_new) n
    where n.key not in ('updated_at', 'last_access_at')
      and (v_old -> n.key) is distinct from n.value;

    -- Nada relevante mudou (ex.: só o carimbo de atualização).
    if v_changes is null then
      return null;
    end if;
  end if;

  v_row := coalesce(v_new, v_old);
  v_entity_id := case
    when (v_row ->> 'id') ~* '^[0-9a-f-]{36}$' then (v_row ->> 'id')::uuid
    when (v_row ->> 'client_id') ~* '^[0-9a-f-]{36}$' then (v_row ->> 'client_id')::uuid
  end;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, changes)
  values (
    auth.uid(),
    coalesce(app.current_user_role()::text, auth.role(), current_user),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_changes
  );

  return null;
end
$$;

create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function app.audit_row_change();
create trigger audit_company_settings after insert or update or delete on public.company_settings
  for each row execute function app.audit_row_change();
create trigger audit_clients after insert or update or delete on public.clients
  for each row execute function app.audit_row_change();
create trigger audit_client_health_profiles after insert or update or delete on public.client_health_profiles
  for each row execute function app.audit_row_change();
create trigger audit_processes after insert or update or delete on public.processes
  for each row execute function app.audit_row_change();
create trigger audit_subprocesses after insert or update or delete on public.subprocesses
  for each row execute function app.audit_row_change();
create trigger audit_process_steps after insert or update or delete on public.process_steps
  for each row execute function app.audit_row_change();
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function app.audit_row_change();
create trigger audit_calendar_events after insert or update or delete on public.calendar_events
  for each row execute function app.audit_row_change();
create trigger audit_financial_records after insert or update or delete on public.financial_records
  for each row execute function app.audit_row_change();

alter table public.audit_log enable row level security;

create policy "audit_log: administrador lê" on public.audit_log
  for select to authenticated using ((select app.is_admin()));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
