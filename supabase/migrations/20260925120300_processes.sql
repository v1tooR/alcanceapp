-- =============================================================================
-- Processos → subprocessos → etapas.
-- =============================================================================

create sequence public.process_code_seq;

create table public.processes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    default ('PRC-' || to_char(app.today(), 'YYYY') || '-' || lpad(nextval('public.process_code_seq')::text, 3, '0')),
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  status public.process_status not null default 'em_avaliacao',
  priority public.priority not null default 'normal',
  responsible_id uuid references public.profiles (id) on delete set null,
  opened_at timestamptz not null default now(),
  due_date date,
  concluded_at timestamptz,
  -- Resumo do andamento visível ao cliente.
  public_summary text check (char_length(public_summary) <= 600),
  -- Nunca exposto na área do cliente.
  internal_notes text check (char_length(internal_notes) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.processes is 'Processo de isenções de um cliente. Não há exclusão: encerra-se por status (concluído, arquivado, cancelado).';

create index processes_client_idx on public.processes (client_id);
create index processes_status_idx on public.processes (status);
create index processes_responsible_idx on public.processes (responsible_id);
create index processes_updated_at_idx on public.processes (updated_at desc);
create index processes_opened_at_idx on public.processes (opened_at);

create table public.subprocesses (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  type public.subprocess_type not null,
  status public.subprocess_status not null default 'nao_iniciado',
  responsible_id uuid references public.profiles (id) on delete set null,
  -- Órgão ou entidade que analisa o pedido (informativo).
  agency text check (char_length(agency) <= 120),
  protocol_number text check (char_length(protocol_number) <= 60),
  started_at timestamptz,
  concluded_at timestamptz,
  due_date date,
  next_action text check (char_length(next_action) <= 300),
  next_action_owner public.action_owner,
  block_reason text check (char_length(block_reason) <= 300),
  internal_notes text check (char_length(internal_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subprocesses is 'Serviço dentro de um processo (IPI, ICMS, IPVA...).';

-- Regra do front-end (dúvida 1.5): um só subprocesso ativo de cada tipo por processo.
create unique index subprocesses_one_active_per_type
  on public.subprocesses (process_id, type)
  where status in ('nao_iniciado', 'em_andamento', 'aguardando_documentos', 'aguardando_orgao');

create index subprocesses_process_idx on public.subprocesses (process_id);
create index subprocesses_responsible_idx on public.subprocesses (responsible_id);
create index subprocesses_due_date_idx on public.subprocesses (due_date) where due_date is not null;

create table public.process_steps (
  id uuid primary key default gen_random_uuid(),
  subprocess_id uuid not null references public.subprocesses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text check (char_length(description) <= 500),
  -- Preenchido automaticamente (fim da lista) quando não informado.
  position integer not null check (position >= 0),
  status public.step_status not null default 'pendente',
  responsible_id uuid references public.profiles (id) on delete set null,
  due_date date,
  completed_at timestamptz,
  -- Observação exibida ao cliente quando a etapa é visível a ele.
  client_note text check (char_length(client_note) <= 500),
  internal_notes text check (char_length(internal_notes) <= 1000),
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Exclusão lógica: o histórico pode citar a etapa removida.
  deleted_at timestamptz
);

comment on table public.process_steps is 'Etapas de um subprocesso. Exclusão lógica via deleted_at.';

create index process_steps_subprocess_idx on public.process_steps (subprocess_id, position) where deleted_at is null;

create trigger processes_updated_at before update on public.processes
  for each row execute function app.set_updated_at();
create trigger subprocesses_updated_at before update on public.subprocesses
  for each row execute function app.set_updated_at();
create trigger process_steps_updated_at before update on public.process_steps
  for each row execute function app.set_updated_at();

-- Etapa nova entra no fim da lista.
create function app.process_steps_set_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.position is null then
    select coalesce(max(s.position) + 1, 0) into new.position
    from public.process_steps s
    where s.subprocess_id = new.subprocess_id and s.deleted_at is null;
  end if;
  return new;
end
$$;

create trigger process_steps_position before insert on public.process_steps
  for each row execute function app.process_steps_set_position();

-- -----------------------------------------------------------------------------
-- Progresso (mesma regra de src/lib/workflow.ts): etapas concluídas sobre
-- etapas aplicáveis, ignorando subprocessos não aplicáveis ou cancelados.
-- -----------------------------------------------------------------------------

create function app.process_progress(p_process_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    round(100.0 * count(*) filter (where st.status = 'concluida') / nullif(count(*), 0))::integer,
    0
  )
  from public.subprocesses s
  join public.process_steps st on st.subprocess_id = s.id and st.deleted_at is null
  where s.process_id = p_process_id
    and s.status not in ('nao_aplicavel', 'cancelado')
    and st.status <> 'nao_aplicavel'
$$;

create function app.process_is_active(p_status public.process_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status not in ('concluido', 'arquivado', 'cancelado')
$$;

create function app.subprocess_is_final(p_status public.subprocess_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('deferido', 'indeferido', 'cancelado', 'nao_aplicavel')
$$;

grant execute on function
  app.process_progress(uuid), app.process_is_active(public.process_status),
  app.subprocess_is_final(public.subprocess_status)
to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS: equipe opera; cliente lê pelas RPCs do portal.
-- -----------------------------------------------------------------------------

alter table public.processes enable row level security;
alter table public.subprocesses enable row level security;
alter table public.process_steps enable row level security;

create policy "processes: equipe lê" on public.processes
  for select to authenticated using ((select app.is_team()));
create policy "processes: equipe cadastra" on public.processes
  for insert to authenticated with check ((select app.is_team()));
create policy "processes: equipe edita" on public.processes
  for update to authenticated using ((select app.is_team())) with check ((select app.is_team()));

create policy "subprocesses: equipe lê" on public.subprocesses
  for select to authenticated using ((select app.is_team()));
create policy "subprocesses: equipe cadastra" on public.subprocesses
  for insert to authenticated with check ((select app.is_team()));
create policy "subprocesses: equipe edita" on public.subprocesses
  for update to authenticated using ((select app.is_team())) with check ((select app.is_team()));

create policy "process_steps: equipe lê as não removidas" on public.process_steps
  for select to authenticated using ((select app.is_team()) and deleted_at is null);
create policy "process_steps: equipe cadastra" on public.process_steps
  for insert to authenticated with check ((select app.is_team()) and deleted_at is null);
create policy "process_steps: equipe edita as não removidas" on public.process_steps
  for update to authenticated
  using ((select app.is_team()) and deleted_at is null)
  with check ((select app.is_team()) and deleted_at is null);

revoke all on public.processes, public.subprocesses, public.process_steps from anon;
grant select, insert, update on public.processes, public.subprocesses, public.process_steps to authenticated;
grant usage on sequence public.process_code_seq to authenticated;
