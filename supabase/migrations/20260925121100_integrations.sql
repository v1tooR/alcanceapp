-- =============================================================================
-- Módulo central de integrações.
--
-- Cada integração externa tem uma linha aqui com o provedor escolhido e a
-- configuração NÃO sensível. Segredos (chaves, senhas, tokens) nunca ficam no
-- banco: vivem nas variáveis de ambiente dos serviços (ou no Supabase Vault).
-- `secret_names` guarda só os NOMES das variáveis esperadas, para a tela de
-- administração mostrar se estão configuradas.
--
-- O código de cada provedor fica isolado em um adapter com interface comum
-- (supabase/functions/_shared/integrations): trocar de provedor não afeta o
-- resto do sistema.
-- =============================================================================

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  category text not null check (category in ('email', 'storage', 'antivirus')),
  provider text not null check (provider ~ '^[a-z][a-z0-9_]*$'),
  description text check (char_length(description) <= 500),
  enabled boolean not null default false,
  config jsonb not null default '{}' check (jsonb_typeof(config) = 'object'),
  secret_names text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.integrations is 'Integrações externas: provedor e configuração não sensível. Segredos ficam fora do banco.';

-- Barreira contra segredo colado por engano na configuração.
create function app.integrations_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from jsonb_object_keys(new.config) k
    where k ~* '(secret|senha|password|passwd|token|api_?key|private|credential)'
  ) then
    perform app.fail('AL422', 'A configuração não pode conter segredos. Use variáveis de ambiente ou o Vault.');
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end
$$;

create trigger integrations_guard before insert or update on public.integrations
  for each row execute function app.integrations_guard();

create trigger audit_integrations after insert or update or delete on public.integrations
  for each row execute function app.audit_row_change();

create trigger broadcast_integrations after insert or update or delete on public.integrations
  for each row execute function app.broadcast_change();

alter table public.integrations enable row level security;

create policy "integrations: administrador lê" on public.integrations
  for select to authenticated using ((select app.is_admin()));
create policy "integrations: administrador configura" on public.integrations
  for update to authenticated using ((select app.is_admin())) with check ((select app.is_admin()));

revoke all on public.integrations from anon, authenticated;
grant select on public.integrations to authenticated;
-- Só estas colunas são editáveis pela tela; chave, categoria e segredos esperados são do código.
grant update (enabled, provider, config) on public.integrations to authenticated;
