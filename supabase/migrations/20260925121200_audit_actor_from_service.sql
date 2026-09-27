-- =============================================================================
-- Auditoria: autoria das escritas feitas pelas Edge Functions.
--
-- As Edge Functions administrativas (equipe, acesso ao portal) escrevem com a
-- service role, então `auth.uid()` é nulo. Elas informam quem pediu a ação no
-- cabeçalho `x-actor-id`, que o PostgREST expõe em `request.headers`.
--
-- O cabeçalho só é aceito quando a requisição é da service role — um usuário
-- comum não consegue se passar por outro.
-- =============================================================================

create function app.audit_actor_id()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_header text;
begin
  if auth.uid() is not null then
    return auth.uid();
  end if;
  if coalesce(auth.role(), '') <> 'service_role' then
    return null;
  end if;
  v_header := nullif(current_setting('request.headers', true), '')::json ->> 'x-actor-id';
  if v_header ~* '^[0-9a-f-]{36}$' then
    return v_header::uuid;
  end if;
  return null;
end
$$;

grant execute on function app.audit_actor_id() to authenticated, service_role;

create or replace function app.audit_row_change()
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
  v_actor uuid := app.audit_actor_id();
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

    if v_changes is null then
      return null;
    end if;
  end if;

  v_row := coalesce(v_new, v_old);
  v_entity_id := case
    when (v_row ->> 'id') ~* '^[0-9a-f-]{36}$' then (v_row ->> 'id')::uuid
    when (v_row ->> 'client_id') ~* '^[0-9a-f-]{36}$' then (v_row ->> 'client_id')::uuid
  end;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, changes, metadata)
  values (
    v_actor,
    coalesce(
      (select p.role::text from public.profiles p where p.id = v_actor),
      auth.role(),
      current_user
    ),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_changes,
    case when auth.uid() is null and v_actor is not null then '{"via": "edge_function"}'::jsonb end
  );

  return null;
end
$$;

-- Evento explícito de auditoria, para as Edge Functions (service role).
create function public.audit_event(
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_metadata jsonb default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    perform app.fail('AL403', 'Você não tem permissão para esta ação.');
  end if;
  perform app.audit(p_action, p_entity, p_entity_id, p_metadata, app.audit_actor_id());
end
$$;

revoke execute on function public.audit_event(text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.audit_event(text, text, uuid, jsonb) to service_role;
