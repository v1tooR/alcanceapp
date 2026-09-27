-- =============================================================================
-- Apaga TODOS os dados (demonstração incluída), sem tocar no schema.
--
-- Depois dele roda o seed_prod.sql. Usado por `npm run db:reset:prod`, que
-- antes esvazia o bucket de documentos pela API do Storage (arquivos físicos).
-- =============================================================================

\set ON_ERROR_STOP on

select set_config('app.seeding', 'on', false);

truncate table
  public.notifications,
  public.process_movements,
  public.documents,
  public.process_steps,
  public.subprocesses,
  public.financial_records,
  public.calendar_events,
  public.processes,
  public.client_health_profiles,
  public.clients,
  public.profiles,
  public.integrations,
  public.subprocess_catalog,
  public.company_settings,
  public.audit_log
restart identity cascade;

-- Contas de acesso (sessões e identidades vão junto, em cascata).
delete from auth.users;

alter sequence public.client_code_seq restart;
alter sequence public.process_code_seq restart;
