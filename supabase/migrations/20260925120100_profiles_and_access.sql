-- =============================================================================
-- Perfis e papéis.
--
-- Cada conta do Supabase Auth tem um perfil com o papel no sistema. Perfis são
-- criados apenas pelo servidor (Edge Functions com service role, ou seeds):
-- não há cadastro público, e o próprio usuário não altera o papel.
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 160),
  email text not null check (app.is_valid_email(email)),
  phone text check (phone ~ '^\d{10,11}$'),
  role public.user_role not null,
  job_title text check (char_length(job_title) <= 80),
  active boolean not null default true,
  -- Preenchido somente para contas do tipo `cliente` (FK criada com a tabela clients).
  client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_access_at timestamptz,
  constraint profiles_client_matches_role check ((role = 'cliente') = (client_id is not null))
);

comment on table public.profiles is 'Perfil e papel de cada conta de acesso (equipe e clientes).';

create unique index profiles_email_key on public.profiles (email);
create unique index profiles_client_id_key on public.profiles (client_id) where client_id is not null;
create index profiles_role_idx on public.profiles (role) where active;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Funções de autorização usadas pelas políticas RLS.
-- SECURITY DEFINER para ler `profiles` sem recursão de RLS. Usar sempre como
-- `(select app.x())` nas políticas, para o Postgres avaliar uma vez por consulta.
-- -----------------------------------------------------------------------------

create function app.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active
$$;

create function app.is_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.current_user_role() in ('super_admin', 'gestor', 'analista'), false)
$$;

create function app.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.current_user_role() in ('super_admin', 'gestor'), false)
$$;

create function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.current_user_role() = 'super_admin', false)
$$;

create function app.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.client_id from public.profiles p
  where p.id = auth.uid() and p.active and p.role = 'cliente'
$$;

create function app.require_team()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not app.is_team() then
    perform app.fail('AL403', 'Você não tem permissão para esta ação.');
  end if;
end
$$;

grant execute on function
  app.current_user_role(), app.is_team(), app.is_manager(), app.is_admin(),
  app.current_client_id(), app.require_team(), app.today(), app.timezone(),
  app.month_of(timestamptz), app.normalize_search(text), app.fail(text, text, jsonb),
  app.set_transition_note(text), app.transition_note(), app.is_seeding(),
  app.is_valid_cpf(text), app.is_valid_email(text)
to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- A equipe vê todas as contas (tela Equipe e seletores de responsável);
-- cada pessoa vê o próprio perfil.
create policy "profiles: equipe vê todos, cada um vê o próprio"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select app.is_team()));

-- Sem políticas de escrita: criação, edição e desativação passam pela Edge
-- Function `admin-users` / `portal-access` (service role).

revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;

-- Registra o último acesso após o login.
create function public.touch_last_access()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles set last_access_at = now() where id = auth.uid();
$$;

revoke execute on function public.touch_last_access() from public, anon;
grant execute on function public.touch_last_access() to authenticated;

alter table public.company_settings enable row level security;

create policy "company_settings: leitura por usuários autenticados"
  on public.company_settings for select to authenticated
  using (true);

create policy "company_settings: edição pelo administrador"
  on public.company_settings for update to authenticated
  using ((select app.is_admin()))
  with check ((select app.is_admin()));

revoke all on public.company_settings from anon;
grant select, update on public.company_settings to authenticated;
