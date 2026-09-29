-- =============================================================================
-- Correções apontadas pelos advisors do Supabase hospedado.
-- =============================================================================

-- 1. O Supabase hospedado cria `public.rls_auto_enable()` (gatilho de evento que
--    liga RLS em tabelas novas). Ela ficava executável por anônimos pela API.
--    Revogar não afeta o gatilho. No Docker local a função não existe.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- 2. Chaves estrangeiras usadas em junções ou em exclusões em cascata.
--    (As colunas de autoria — created_by, reviewed_by... — ficam sem índice.)
create index if not exists calendar_events_process_idx on public.calendar_events (process_id);
create index if not exists documents_step_idx on public.documents (step_id);
create index if not exists notifications_client_idx on public.notifications (client_id);
create index if not exists notifications_process_idx on public.notifications (process_id);
create index if not exists process_movements_subprocess_idx on public.process_movements (subprocess_id);
