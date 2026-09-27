-- =============================================================================
-- Calendário e financeiro (informativo).
-- =============================================================================

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text check (char_length(description) <= 500),
  event_date date not null,
  event_time time,
  type public.event_type not null,
  status public.event_status not null default 'agendado',
  visibility public.visibility not null default 'interno',
  client_id uuid references public.clients (id) on delete cascade,
  process_id uuid references public.processes (id) on delete set null,
  subprocess_id uuid references public.subprocesses (id) on delete set null,
  responsible_id uuid references public.profiles (id) on delete set null,
  location text check (char_length(location) <= 160),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Evento visível ao cliente precisa dizer de qual cliente é.
  constraint calendar_events_client_when_visible check (visibility = 'interno' or client_id is not null)
);

comment on table public.calendar_events is 'Agenda da equipe. Exclusão lógica via deleted_at.';

create index calendar_events_date_idx on public.calendar_events (event_date) where deleted_at is null;
create index calendar_events_client_idx on public.calendar_events (client_id) where deleted_at is null;

create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function app.set_updated_at();

-- Registro financeiro INFORMATIVO: não emite cobrança nem substitui o fiscal.
create table public.financial_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  process_id uuid references public.processes (id) on delete set null,
  description text not null check (char_length(btrim(description)) between 3 and 300),
  total_amount numeric(12, 2) not null check (total_amount >= 0.01),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  status public.financial_status not null default 'pendente',
  payment_method public.payment_method,
  due_date date,
  paid_at date,
  notes text check (char_length(notes) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Mesmas regras de esquemaFinanceiro (src/schemas/index.ts).
  constraint financial_records_discount_le_total check (discount <= total_amount),
  constraint financial_records_paid_le_net check (amount_paid <= total_amount - discount)
);

comment on table public.financial_records is 'Financeiro informativo por cliente/processo. Exclusão lógica via deleted_at.';

create index financial_records_client_idx on public.financial_records (client_id) where deleted_at is null;
create index financial_records_process_idx on public.financial_records (process_id) where deleted_at is null;

create trigger financial_records_updated_at before update on public.financial_records
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.calendar_events enable row level security;
alter table public.financial_records enable row level security;

create policy "calendar_events: equipe lê os não removidos" on public.calendar_events
  for select to authenticated using ((select app.is_team()) and deleted_at is null);
create policy "calendar_events: equipe agenda" on public.calendar_events
  for insert to authenticated with check ((select app.is_team()) and deleted_at is null);
create policy "calendar_events: equipe edita os não removidos" on public.calendar_events
  for update to authenticated
  using ((select app.is_team()) and deleted_at is null)
  with check ((select app.is_team()) and deleted_at is null);

-- Financeiro: somente gestor e administrador (dúvida 6.2).
create policy "financial_records: gestão lê os não removidos" on public.financial_records
  for select to authenticated using ((select app.is_manager()) and deleted_at is null);
create policy "financial_records: gestão cadastra" on public.financial_records
  for insert to authenticated with check ((select app.is_manager()) and deleted_at is null);
create policy "financial_records: gestão edita os não removidos" on public.financial_records
  for update to authenticated
  using ((select app.is_manager()) and deleted_at is null)
  with check ((select app.is_manager()) and deleted_at is null);

revoke all on public.calendar_events, public.financial_records from anon;
grant select, insert, update on public.calendar_events, public.financial_records to authenticated;
