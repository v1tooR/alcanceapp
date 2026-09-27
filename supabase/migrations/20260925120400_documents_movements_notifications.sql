-- =============================================================================
-- Documentos, histórico de movimentações e notificações internas.
-- =============================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  process_id uuid references public.processes (id) on delete set null,
  subprocess_id uuid references public.subprocesses (id) on delete set null,
  step_id uuid references public.process_steps (id) on delete set null,
  type public.document_type not null,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  status public.document_status not null default 'solicitado',
  visibility public.visibility not null default 'cliente',
  -- Documentos de saúde: nome nunca aparece em notificações nem no histórico.
  is_sensitive boolean not null default false,
  -- Caminho no bucket privado `documents`: <client_id>/<document_id>/<arquivo>.
  file_path text,
  file_name text check (char_length(file_name) <= 255),
  -- Limite e formatos também impostos pelo bucket (dúvida 3.1: a confirmar).
  file_size_bytes bigint check (file_size_bytes between 1 and 10485760),
  file_mime text check (file_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic')),
  requested_at timestamptz not null default now(),
  requested_by uuid default auth.uid() references public.profiles (id) on delete set null,
  upload_deadline date,
  uploaded_at timestamptz,
  uploaded_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  -- Motivo mostrado ao cliente em reprovação ou pedido de reenvio.
  return_reason text check (char_length(btrim(return_reason)) between 10 and 500),
  internal_notes text check (char_length(internal_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_file_when_received check (
    status in ('solicitado', 'reenvio_solicitado') or file_name is not null
  ),
  constraint documents_reason_when_returned check (
    status not in ('reprovado', 'reenvio_solicitado') or return_reason is not null
  )
);

comment on table public.documents is 'Documentos solicitados aos clientes. Não há exclusão: o ciclo termina em aprovado/reprovado.';

create index documents_client_idx on public.documents (client_id);
create index documents_process_idx on public.documents (process_id);
create index documents_subprocess_idx on public.documents (subprocess_id);
create index documents_status_idx on public.documents (status);
create index documents_updated_at_idx on public.documents (updated_at desc);

create trigger documents_updated_at before update on public.documents
  for each row execute function app.set_updated_at();

-- Coerência dos vínculos: etapa ⊂ subprocesso ⊂ processo ⊂ cliente.
create function app.documents_check_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_process_id uuid;
  v_client_id uuid;
begin
  if new.step_id is not null then
    select s.subprocess_id into v_process_id from public.process_steps s where s.id = new.step_id;
    if new.subprocess_id is null then
      new.subprocess_id := v_process_id;
    elsif new.subprocess_id <> v_process_id then
      perform app.fail('AL422', 'A etapa informada não pertence ao subprocesso.');
    end if;
  end if;

  if new.subprocess_id is not null then
    select s.process_id into v_process_id from public.subprocesses s where s.id = new.subprocess_id;
    if new.process_id is null then
      new.process_id := v_process_id;
    elsif new.process_id <> v_process_id then
      perform app.fail('AL422', 'O subprocesso informado não pertence ao processo.');
    end if;
  end if;

  if new.process_id is not null then
    select p.client_id into v_client_id from public.processes p where p.id = new.process_id;
    if v_client_id <> new.client_id then
      perform app.fail('AL422', 'O processo informado não pertence ao cliente.');
    end if;
  end if;

  return new;
end
$$;

create trigger documents_check_links
  before insert or update of client_id, process_id, subprocess_id, step_id on public.documents
  for each row execute function app.documents_check_links();

-- -----------------------------------------------------------------------------
-- Histórico de movimentações
-- -----------------------------------------------------------------------------

create table public.process_movements (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  subprocess_id uuid references public.subprocesses (id) on delete set null,
  type public.movement_type not null,
  title text not null check (char_length(btrim(title)) between 3 and 200),
  description text check (char_length(description) <= 1000),
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  -- Valores de status (não rótulos): a interface traduz para exibição.
  from_status text,
  to_status text,
  visible_to_client boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.process_movements is 'Histórico do processo. Somente inclusão: não há edição nem exclusão.';

create index process_movements_process_idx on public.process_movements (process_id, created_at desc);
create index process_movements_created_at_idx on public.process_movements (created_at desc);

-- -----------------------------------------------------------------------------
-- Notificações internas
-- -----------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  message text not null check (char_length(message) <= 1000),
  read_at timestamptz,
  client_id uuid references public.clients (id) on delete cascade,
  process_id uuid references public.processes (id) on delete cascade,
  -- Rota interna do app (nunca URL externa).
  link text check (link ~ '^/[^/]'),
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.documents enable row level security;
alter table public.process_movements enable row level security;
alter table public.notifications enable row level security;

create policy "documents: equipe lê" on public.documents
  for select to authenticated using ((select app.is_team()));
create policy "documents: equipe solicita" on public.documents
  for insert to authenticated with check ((select app.is_team()));
create policy "documents: equipe edita" on public.documents
  for update to authenticated using ((select app.is_team())) with check ((select app.is_team()));

create policy "process_movements: equipe lê" on public.process_movements
  for select to authenticated using ((select app.is_team()));
create policy "process_movements: equipe registra em nome próprio" on public.process_movements
  for insert to authenticated
  with check ((select app.is_team()) and author_id = (select auth.uid()));

-- Cada pessoa (equipe ou cliente) lê apenas as próprias notificações.
-- Marcar como lida passa pelas RPCs `mark_notification_read*`.
create policy "notifications: destinatário lê as próprias" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
create policy "notifications: equipe envia" on public.notifications
  for insert to authenticated with check ((select app.is_team()));

revoke all on public.documents, public.process_movements, public.notifications from anon;
grant select, insert, update on public.documents to authenticated;
grant select, insert on public.process_movements, public.notifications to authenticated;
