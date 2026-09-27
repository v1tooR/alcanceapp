-- =============================================================================
-- Storage e Realtime.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket privado de documentos
--
-- Caminho: <client_id>/<document_id>/<nome-aleatório>.<ext>
-- * Upload: o próprio cliente (documento dele, visível a ele e aberto para
--   envio) ou a equipe. Tamanho e formato limitados pelo bucket.
-- * Leitura: NINGUÉM pela API pública. A equipe abre arquivos pela Edge
--   Function `document-file`, que confere a permissão, registra o acesso na
--   auditoria e devolve uma URL assinada de curta duração.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function app.can_upload_document_object(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := storage.foldername(p_name);
  v_doc public.documents;
begin
  if coalesce(array_length(v_parts, 1), 0) <> 2
     or v_parts[1] !~* '^[0-9a-f-]{36}$' or v_parts[2] !~* '^[0-9a-f-]{36}$' then
    return false;
  end if;

  select * into v_doc from public.documents
  where id = v_parts[2]::uuid and client_id = v_parts[1]::uuid;

  if v_doc.id is null or v_doc.status not in ('solicitado', 'reenvio_solicitado') then
    return false;
  end if;

  return app.is_team()
      or (v_doc.visibility = 'cliente' and v_doc.client_id = app.current_client_id());
end
$$;

grant execute on function app.can_upload_document_object(text) to authenticated;

create policy "documents bucket: envio pelo cliente dono ou pela equipe"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and app.can_upload_document_object(name));

-- -----------------------------------------------------------------------------
-- Realtime: broadcast a partir do banco, em canais privados.
--
-- Cada escrita nas tabelas do app envia um SINAL (tabela, operação, id — nunca
-- dados) para os canais interessados. O front assina os canais e invalida as
-- consultas afetadas, relendo os dados pela API com a RLS de sempre.
--
--   team          toda a equipe (kanbans, filas, painel, listas)
--   client:<id>   o cliente, para o que é visível a ele no portal
--   user:<id>     notificações de uma pessoa
--
-- A autorização de cada canal é a política em realtime.messages abaixo.
-- -----------------------------------------------------------------------------

create function app.broadcast_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_payload jsonb;
  v_client_id uuid;
begin
  if app.is_seeding() then
    return null;
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  v_payload := jsonb_build_object('table', tg_table_name, 'op', lower(tg_op), 'id', coalesce(v_row ->> 'id', v_row ->> 'client_id'));

  if tg_table_name = 'notifications' then
    perform realtime.send(v_payload, 'change', 'user:' || (v_row ->> 'recipient_id'), true);
    return null;
  end if;

  perform realtime.send(v_payload, 'change', 'team', true);

  -- Descobre o cliente afetado quando a mudança é (ou era) visível a ele.
  v_client_id := case tg_table_name
    when 'clients' then (v_row ->> 'id')::uuid
    when 'client_health_profiles' then (v_row ->> 'client_id')::uuid
    when 'processes' then (v_row ->> 'client_id')::uuid
    when 'subprocesses' then (
      select p.client_id from public.processes p where p.id = (v_row ->> 'process_id')::uuid)
    when 'process_steps' then (
      select p.client_id from public.subprocesses s join public.processes p on p.id = s.process_id
      where s.id = (v_row ->> 'subprocess_id')::uuid)
    when 'documents' then case
      when v_row ->> 'visibility' = 'cliente' or v_old ->> 'visibility' = 'cliente'
      then (v_row ->> 'client_id')::uuid end
    when 'process_movements' then case
      when (v_row ->> 'visible_to_client')::boolean then (
        select p.client_id from public.processes p where p.id = (v_row ->> 'process_id')::uuid) end
    when 'calendar_events' then case
      when v_row ->> 'visibility' = 'cliente' or v_old ->> 'visibility' = 'cliente'
      then (v_row ->> 'client_id')::uuid end
    else null
  end;

  if v_client_id is not null then
    perform realtime.send(v_payload, 'change', 'client:' || v_client_id, true);
  end if;

  return null;
exception
  -- Falha de entrega em tempo real nunca desfaz a operação de negócio.
  when others then
    raise warning 'broadcast_change falhou: %', sqlerrm;
    return null;
end
$$;

create trigger broadcast_clients after insert or update or delete on public.clients
  for each row execute function app.broadcast_change();
create trigger broadcast_processes after insert or update or delete on public.processes
  for each row execute function app.broadcast_change();
create trigger broadcast_subprocesses after insert or update or delete on public.subprocesses
  for each row execute function app.broadcast_change();
create trigger broadcast_process_steps after insert or update or delete on public.process_steps
  for each row execute function app.broadcast_change();
create trigger broadcast_documents after insert or update or delete on public.documents
  for each row execute function app.broadcast_change();
create trigger broadcast_process_movements after insert or update or delete on public.process_movements
  for each row execute function app.broadcast_change();
create trigger broadcast_notifications after insert or update or delete on public.notifications
  for each row execute function app.broadcast_change();
create trigger broadcast_calendar_events after insert or update or delete on public.calendar_events
  for each row execute function app.broadcast_change();
create trigger broadcast_financial_records after insert or update or delete on public.financial_records
  for each row execute function app.broadcast_change();
create trigger broadcast_profiles after insert or update or delete on public.profiles
  for each row execute function app.broadcast_change();
create trigger broadcast_client_health_profiles after insert or update or delete on public.client_health_profiles
  for each row execute function app.broadcast_change();

create policy "realtime: canais privados do app"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (
      (realtime.topic() = 'team' and (select app.is_team()))
      or realtime.topic() = 'user:' || (select auth.uid())::text
      or realtime.topic() = 'client:' || (select app.current_client_id())::text
    )
  );
