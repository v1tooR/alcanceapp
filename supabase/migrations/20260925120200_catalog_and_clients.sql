-- =============================================================================
-- Catálogo de subprocessos (tabela de domínio) e clientes.
-- =============================================================================

-- Sugestões de partida para cada tipo de subprocesso. Espelha
-- src/lib/catalogo-subprocessos.ts e é a fonte usada pelo banco ao criar as
-- etapas sugeridas. Conteúdo carregado pelo seed de produção.
create table public.subprocess_catalog (
  type public.subprocess_type primary key,
  name text not null,
  description text not null,
  suggested_agency text,
  suggested_steps text[] not null default '{}',
  suggested_documents public.document_type[] not null default '{}',
  applicability text not null,
  display_order integer not null unique
);

comment on table public.subprocess_catalog is 'Catálogo dos subprocessos previstos em contrato — sugestões editáveis, não regra fixa.';

alter table public.subprocess_catalog enable row level security;

create policy "subprocess_catalog: leitura por usuários autenticados"
  on public.subprocess_catalog for select to authenticated
  using (true);

revoke all on public.subprocess_catalog from anon;
grant select on public.subprocess_catalog to authenticated;

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------

create sequence public.client_code_seq;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    default ('CLI-' || lpad(nextval('public.client_code_seq')::text, 4, '0')),
  full_name text not null check (char_length(btrim(full_name)) between 3 and 160),
  cpf text not null check (app.is_valid_cpf(cpf)),
  rg text check (char_length(rg) <= 20),
  birth_date date check (birth_date >= date '1900-01-01'),
  email text not null check (app.is_valid_email(email)),
  phone text not null check (phone ~ '^\d{10,11}$'),
  type public.client_type not null,
  status public.client_status not null default 'ativo',
  address_zip text check (address_zip ~ '^\d{8}$'),
  address_street text check (char_length(address_street) <= 160),
  address_number text check (char_length(address_number) <= 20),
  address_complement text check (char_length(address_complement) <= 80),
  address_district text check (char_length(address_district) <= 80),
  address_city text check (char_length(address_city) <= 80),
  address_state text check (address_state in (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  )),
  -- Usuário da equipe responsável pela conta.
  responsible_id uuid references public.profiles (id) on delete set null,
  -- Nunca exposto na área do cliente.
  internal_notes text check (char_length(internal_notes) <= 2000),
  -- Mantido pela Edge Function `portal-access`, que cria/ativa a conta do cliente.
  portal_access_enabled boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_cpf_key unique (cpf)
);

comment on table public.clients is 'Clientes atendidos. Não há exclusão: encerra-se pela situação `inativo`.';

create index clients_responsible_idx on public.clients (responsible_id);
create index clients_status_idx on public.clients (status);
create index clients_created_at_idx on public.clients (created_at);

create trigger clients_updated_at
  before update on public.clients
  for each row execute function app.set_updated_at();

alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete cascade;

-- Dado pessoal sensível (saúde/deficiência) em tabela própria: acesso,
-- auditoria e retenção tratados separadamente do cadastro (LGPD).
create table public.client_health_profiles (
  client_id uuid primary key references public.clients (id) on delete cascade,
  disability_categories text[] not null default '{}',
  notes text check (char_length(notes) <= 1000),
  has_medical_report boolean not null default false,
  medical_report_valid_until date,
  updated_at timestamptz not null default now()
);

comment on table public.client_health_profiles is 'Perfil assistido (dado sensível de saúde). Visível apenas à equipe e ao próprio cliente.';

create trigger client_health_profiles_updated_at
  before update on public.client_health_profiles
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: somente a equipe acessa as tabelas diretamente. O cliente lê os
-- próprios dados pelas RPCs `portal_*`, que devolvem o recorte permitido.
-- -----------------------------------------------------------------------------

alter table public.clients enable row level security;
alter table public.client_health_profiles enable row level security;

create policy "clients: equipe lê" on public.clients
  for select to authenticated using ((select app.is_team()));
create policy "clients: equipe cadastra" on public.clients
  for insert to authenticated with check ((select app.is_team()));
create policy "clients: equipe edita" on public.clients
  for update to authenticated using ((select app.is_team())) with check ((select app.is_team()));

create policy "client_health_profiles: equipe lê" on public.client_health_profiles
  for select to authenticated using ((select app.is_team()));
create policy "client_health_profiles: equipe cadastra" on public.client_health_profiles
  for insert to authenticated with check ((select app.is_team()));
create policy "client_health_profiles: equipe edita" on public.client_health_profiles
  for update to authenticated using ((select app.is_team())) with check ((select app.is_team()));

revoke all on public.clients, public.client_health_profiles from anon;
grant select, insert, update on public.clients, public.client_health_profiles to authenticated;
grant usage on sequence public.client_code_seq to authenticated;
