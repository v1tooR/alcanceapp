-- =============================================================================
-- Fundação: extensões, schema privado `app`, tipos de domínio e utilitários.
--
-- Convenções do banco:
--   * tabelas e colunas em inglês, snake_case;
--   * valores de enum espelham o vocabulário do front-end (src/types/domain.ts);
--   * funções auxiliares ficam no schema `app`, que NÃO é exposto pela API;
--   * erros de regra de negócio usam SQLSTATE próprio (classe `AL`), que o
--     front-end traduz para mensagens exibíveis:
--       AL403 sem permissão · AL404 não encontrado · AL409 conflito · AL422 inválido
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- Nada novo no schema public nasce acessível ao papel anônimo ou a PUBLIC.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema app revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Tipos de domínio
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('super_admin', 'gestor', 'analista', 'cliente');

create type public.client_type as enum ('condutor', 'nao_condutor');
create type public.client_status as enum ('ativo', 'inativo');

create type public.process_status as enum (
  'em_avaliacao', 'em_andamento', 'aguardando_cliente', 'aguardando_orgao',
  'concluido', 'arquivado', 'cancelado'
);
create type public.priority as enum ('baixa', 'normal', 'alta', 'urgente');

create type public.subprocess_type as enum (
  'avaliacao_inicial', 'ipi', 'iof', 'icms', 'ipva', 'estacionamento_pcd', 'rodizio', 'recurso'
);
create type public.subprocess_status as enum (
  'nao_iniciado', 'em_andamento', 'aguardando_documentos', 'aguardando_orgao',
  'deferido', 'indeferido', 'nao_aplicavel', 'cancelado'
);
create type public.action_owner as enum ('equipe', 'cliente', 'orgao', 'terceiro');

create type public.step_status as enum ('pendente', 'em_andamento', 'concluida', 'bloqueada', 'nao_aplicavel');

create type public.document_status as enum (
  'solicitado', 'enviado', 'em_analise', 'aprovado', 'reprovado', 'reenvio_solicitado'
);
create type public.document_type as enum (
  'rg', 'cpf', 'cnh', 'comprovante_endereco', 'laudo_medico', 'nota_fiscal', 'crlv',
  'procuracao', 'declaracao', 'comprovante_renda', 'outro'
);
create type public.visibility as enum ('interno', 'cliente');

create type public.movement_type as enum (
  'processo_criado', 'status_alterado', 'etapa_concluida', 'documento_solicitado',
  'documento_enviado', 'documento_aprovado', 'documento_reprovado', 'protocolo_registrado',
  'observacao', 'prazo_alterado', 'responsavel_alterado', 'mensagem_cliente'
);

create type public.notification_type as enum ('info', 'sucesso', 'alerta', 'erro', 'documento', 'prazo');

create type public.event_type as enum ('reuniao', 'prazo', 'pericia', 'protocolo', 'retorno', 'outro');
create type public.event_status as enum ('agendado', 'concluido', 'cancelado');

create type public.financial_status as enum ('pendente', 'parcial', 'pago', 'atrasado', 'cancelado');
create type public.payment_method as enum ('pix', 'cartao', 'boleto', 'dinheiro', 'transferencia');

-- -----------------------------------------------------------------------------
-- Configurações da empresa (linha única)
-- -----------------------------------------------------------------------------

create table public.company_settings (
  id boolean primary key default true check (id),
  company_name text not null check (char_length(btrim(company_name)) between 2 and 120),
  timezone text not null default 'America/Sao_Paulo',
  -- Dias sem movimentação para um processo ativo ser destacado como "parado".
  -- Dúvida 2.2 de docs/duvidas-de-negocio.md: valor adotado 15, a confirmar.
  stale_process_days integer not null default 15 check (stale_process_days between 1 and 365),
  updated_at timestamptz not null default now()
);
comment on table public.company_settings is 'Configurações gerais da empresa. Sempre uma única linha.';

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------

create function app.timezone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.timezone from public.company_settings s), 'America/Sao_Paulo')
$$;

-- "Hoje" no fuso da empresa — prazos são datas civis, não instantes.
create function app.today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone app.timezone())::date
$$;

-- Primeiro dia do mês (no fuso da empresa) de um instante.
create function app.month_of(p_at timestamptz)
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', p_at at time zone app.timezone())::date
$$;

-- Texto para busca sem acento e sem caixa, igual a `normalizar()` do front-end.
create function app.normalize_search(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')))
$$;

-- Mesma regra de `cpfValido()` (src/lib/mascaras.ts).
create function app.is_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_sum integer;
  v_digit integer;
  v_position integer;
begin
  if p_cpf is null or p_cpf !~ '^\d{11}$' or p_cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;

  for v_digit in 1..2 loop
    v_sum := 0;
    for v_position in 1..(8 + v_digit) loop
      v_sum := v_sum + substr(p_cpf, v_position, 1)::integer * (9 + v_digit + 1 - v_position);
    end loop;
    if ((v_sum * 10) % 11) % 10 <> substr(p_cpf, 9 + v_digit, 1)::integer then
      return false;
    end if;
  end loop;

  return true;
end
$$;

create function app.is_valid_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and p_email = lower(btrim(p_email))
$$;

-- Seeds e o script de reset marcam a sessão para não disparar efeitos
-- colaterais (histórico, notificações, auditoria, realtime).
create function app.is_seeding()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('app.seeding', true), '') = 'on'
$$;

-- Nota opcional de uma transição de status, repassada pelas RPCs aos gatilhos
-- que escrevem o histórico. Vale só dentro da transação corrente.
create function app.transition_note()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(btrim(coalesce(current_setting('app.transition_note', true), '')), '')
$$;

create function app.set_transition_note(p_note text)
returns void
language sql
volatile
set search_path = ''
as $$
  select set_config('app.transition_note', coalesce(p_note, ''), true);
$$;

-- Levanta um erro de negócio exibível. `p_code` ∈ AL403, AL404, AL409, AL422.
create function app.fail(p_code text, p_message text, p_detail jsonb default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = p_code,
    message = p_message,
    detail = coalesce(p_detail::text, '');
end
$$;

create function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger company_settings_updated_at
  before update on public.company_settings
  for each row execute function app.set_updated_at();
