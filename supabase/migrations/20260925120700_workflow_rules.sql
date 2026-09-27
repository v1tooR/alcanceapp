-- =============================================================================
-- Regras de fluxo (src/lib/workflow.ts) aplicadas no banco.
--
-- Os gatilhos validam TODA mudança de status, venha ela de uma RPC, do painel
-- do Supabase ou de SQL direto, e produzem os efeitos que o front espera que
-- "aconteçam sozinhos": histórico de movimentações, carimbos de data e
-- notificações ao cliente e à equipe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Mapas de transição
-- -----------------------------------------------------------------------------

create function app.process_transition_allowed(p_from public.process_status, p_to public.process_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_from = p_to or p_to = any (case p_from
    when 'em_avaliacao' then array['em_andamento', 'aguardando_cliente', 'cancelado', 'arquivado']
    when 'em_andamento' then array['aguardando_cliente', 'aguardando_orgao', 'concluido', 'cancelado']
    when 'aguardando_cliente' then array['em_andamento', 'aguardando_orgao', 'cancelado']
    when 'aguardando_orgao' then array['em_andamento', 'aguardando_cliente', 'concluido', 'cancelado']
    when 'concluido' then array['arquivado']
    when 'arquivado' then array['em_andamento'] -- dúvida 4.2: reabertura a confirmar
    else array[]::text[]
  end::public.process_status[])
$$;

create function app.subprocess_transition_allowed(p_from public.subprocess_status, p_to public.subprocess_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_from = p_to or p_to = any (case p_from
    when 'nao_iniciado' then array['em_andamento', 'aguardando_documentos', 'nao_aplicavel', 'cancelado']
    when 'em_andamento' then array['aguardando_documentos', 'aguardando_orgao', 'deferido', 'indeferido', 'cancelado']
    when 'aguardando_documentos' then array['em_andamento', 'aguardando_orgao', 'cancelado']
    when 'aguardando_orgao' then array['em_andamento', 'deferido', 'indeferido', 'cancelado']
    when 'nao_aplicavel' then array['nao_iniciado']
    -- deferido, indeferido (dúvida 1.4: recurso é subprocesso próprio) e cancelado são finais
    else array[]::text[]
  end::public.subprocess_status[])
$$;

create function app.step_transition_allowed(p_from public.step_status, p_to public.step_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_from = p_to or p_to = any (case p_from
    when 'pendente' then array['em_andamento', 'concluida', 'bloqueada', 'nao_aplicavel']
    when 'em_andamento' then array['concluida', 'bloqueada', 'pendente', 'nao_aplicavel']
    when 'concluida' then array['em_andamento']
    when 'bloqueada' then array['em_andamento', 'pendente', 'nao_aplicavel']
    when 'nao_aplicavel' then array['pendente']
    else array[]::text[]
  end::public.step_status[])
$$;

create function app.document_transition_allowed(p_from public.document_status, p_to public.document_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_from = p_to or p_to = any (case p_from
    when 'solicitado' then array['enviado']
    when 'enviado' then array['em_analise', 'aprovado', 'reprovado', 'reenvio_solicitado']
    when 'em_analise' then array['aprovado', 'reprovado', 'reenvio_solicitado']
    when 'aprovado' then array['em_analise']
    when 'reprovado' then array['reenvio_solicitado'] -- dúvida 3.2
    when 'reenvio_solicitado' then array['enviado']
    else array[]::text[]
  end::public.document_status[])
$$;

create function app.fail_transition(p_entity text, p_from text, p_to text)
returns void
language sql
set search_path = ''
as $$
  select app.fail(
    'AL422',
    'Transição de status não permitida.',
    jsonb_build_object('entity', p_entity, 'from', p_from, 'to', p_to)
  );
$$;

grant execute on function
  app.process_transition_allowed(public.process_status, public.process_status),
  app.subprocess_transition_allowed(public.subprocess_status, public.subprocess_status),
  app.step_transition_allowed(public.step_status, public.step_status),
  app.document_transition_allowed(public.document_status, public.document_status),
  app.fail_transition(text, text, text)
to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Auxiliares de efeitos colaterais
-- -----------------------------------------------------------------------------

create function app.subprocess_name(p_type public.subprocess_type)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.name from public.subprocess_catalog c where c.type = p_type), p_type::text)
$$;

-- Título de documento para textos que o cliente e a equipe leem: documento
-- sensível nunca tem o nome exposto.
create function app.document_public_title(p_title text, p_sensitive boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_sensitive then 'documento com informação sensível' else p_title end
$$;

create function app.add_movement(
  p_process_id uuid,
  p_subprocess_id uuid,
  p_type public.movement_type,
  p_title text,
  p_description text,
  p_visible boolean,
  p_from text default null,
  p_to text default null
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.process_movements
    (process_id, subprocess_id, type, title, description, author_id, from_status, to_status, visible_to_client)
  values
    (p_process_id, p_subprocess_id, p_type, left(p_title, 200), left(p_description, 1000),
     auth.uid(), p_from, p_to, p_visible);
$$;

-- Notifica a conta de acesso do cliente (se existir).
create function app.notify_client(
  p_client_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_process_id uuid,
  p_link text
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, type, title, message, client_id, process_id, link)
  select p.id, p_type, p_title, p_message, p_client_id, p_process_id, p_link
  from public.profiles p
  where p.client_id = p_client_id and p.role = 'cliente';
$$;

-- Avisa a equipe de um envio do cliente: o responsável pelo processo (ou pelo
-- cliente, quando o documento não tem processo); sem responsável ativo, todos
-- os gestores e administradores ativos.
create function app.notify_team_upload(p_document_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_doc public.documents%rowtype;
  v_client_name text;
  v_responsible uuid;
begin
  select * into v_doc from public.documents where id = p_document_id;
  select c.full_name, coalesce(pr.responsible_id, c.responsible_id)
    into v_client_name, v_responsible
  from public.clients c
  left join public.processes pr on pr.id = v_doc.process_id
  where c.id = v_doc.client_id;

  insert into public.notifications (recipient_id, type, title, message, client_id, process_id, link)
  select p.id, 'documento', 'Documento aguardando análise',
         coalesce(v_client_name, 'Cliente') || ' enviou um documento.',
         v_doc.client_id, v_doc.process_id, '/app/documentos?documento=' || v_doc.id
  from public.profiles p
  where p.active
    and (
      p.id = v_responsible
      or (
        p.role in ('super_admin', 'gestor')
        and not exists (
          select 1 from public.profiles r
          where r.id = v_responsible and r.active and r.role <> 'cliente'
        )
      )
    );
end
$$;

-- Todo registro no histórico conta como movimentação do processo.
create function app.process_movements_touch_process()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.is_seeding() then
    return null;
  end if;
  update public.processes set updated_at = now()
  where id = new.process_id and updated_at < now();
  return null;
end
$$;

create trigger process_movements_touch_process after insert on public.process_movements
  for each row execute function app.process_movements_touch_process();

-- Movimentação escrita pela equipe e visível ao cliente vira aviso para ele.
create function app.process_movements_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  if app.is_seeding() or new.type <> 'mensagem_cliente' or not new.visible_to_client then
    return null;
  end if;
  select client_id into v_client_id from public.processes where id = new.process_id;
  perform app.notify_client(
    v_client_id, 'info', 'Nova atualização no seu processo', new.title,
    new.process_id, '/portal/processos/' || new.process_id
  );
  return null;
end
$$;

create trigger process_movements_notify after insert on public.process_movements
  for each row execute function app.process_movements_notify();

-- -----------------------------------------------------------------------------
-- Processo
-- -----------------------------------------------------------------------------

create function app.processes_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not app.is_seeding() then
    if not app.process_transition_allowed(old.status, new.status) then
      perform app.fail_transition('process', old.status::text, new.status::text);
    end if;
    if new.status = 'concluido' then
      new.concluded_at := now();
    end if;
  end if;
  return new;
end
$$;

create trigger processes_before_update before update on public.processes
  for each row execute function app.processes_before_update();

create function app.processes_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.is_seeding() or new.status is not distinct from old.status then
    return null;
  end if;
  perform app.add_movement(
    new.id, null, 'status_alterado', 'Status do processo atualizado',
    app.transition_note(), true, old.status::text, new.status::text
  );
  return null;
end
$$;

create trigger processes_after_update after update of status on public.processes
  for each row execute function app.processes_after_update();

-- -----------------------------------------------------------------------------
-- Subprocesso
-- -----------------------------------------------------------------------------

create function app.subprocesses_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not app.is_seeding() then
    if not app.subprocess_transition_allowed(old.status, new.status) then
      perform app.fail_transition('subprocess', old.status::text, new.status::text);
    end if;
    if new.status <> 'nao_iniciado' and new.started_at is null then
      new.started_at := now();
    end if;
    if new.status in ('deferido', 'indeferido') then
      new.concluded_at := now();
    end if;
  end if;
  return new;
end
$$;

create trigger subprocesses_before_update before update on public.subprocesses
  for each row execute function app.subprocesses_before_update();

create function app.subprocesses_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := app.subprocess_name(new.type);
begin
  if app.is_seeding() then
    return null;
  end if;

  if new.status is distinct from old.status then
    perform app.add_movement(
      new.process_id, new.id, 'status_alterado', v_name || ': status atualizado',
      app.transition_note(), true, old.status::text, new.status::text
    );
  end if;

  if new.protocol_number is not null and new.protocol_number is distinct from old.protocol_number then
    perform app.add_movement(
      new.process_id, new.id, 'protocolo_registrado', 'Protocolo registrado — ' || v_name,
      'Número do protocolo: ' || new.protocol_number || '.', true
    );
  end if;

  return null;
end
$$;

create trigger subprocesses_after_update after update on public.subprocesses
  for each row execute function app.subprocesses_after_update();

-- -----------------------------------------------------------------------------
-- Etapa
-- -----------------------------------------------------------------------------

create function app.process_steps_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not app.is_seeding() then
    if not app.step_transition_allowed(old.status, new.status) then
      perform app.fail_transition('step', old.status::text, new.status::text);
    end if;
    new.completed_at := case when new.status = 'concluida' then now() end;
  end if;
  return new;
end
$$;

create trigger process_steps_before_update before update on public.process_steps
  for each row execute function app.process_steps_before_update();

create function app.process_steps_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_process_id uuid;
begin
  if app.is_seeding() or new.status is not distinct from old.status or new.status <> 'concluida' then
    return null;
  end if;
  select process_id into v_process_id from public.subprocesses where id = new.subprocess_id;
  perform app.add_movement(
    v_process_id, new.subprocess_id, 'etapa_concluida', 'Etapa concluída: ' || new.title,
    app.transition_note(), new.visible_to_client
  );
  return null;
end
$$;

create trigger process_steps_after_update after update of status on public.process_steps
  for each row execute function app.process_steps_after_update();

-- -----------------------------------------------------------------------------
-- Documento
-- -----------------------------------------------------------------------------

create function app.documents_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.is_seeding() then
    return new;
  end if;
  -- Todo documento nasce como solicitação; o arquivo chega depois.
  new.status := 'solicitado';
  new.requested_at := now();
  new.requested_by := auth.uid();
  new.file_path := null;
  new.file_name := null;
  new.file_size_bytes := null;
  new.file_mime := null;
  new.uploaded_at := null;
  new.uploaded_by := null;
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.return_reason := null;
  return new;
end
$$;

create trigger documents_before_insert before insert on public.documents
  for each row execute function app.documents_before_insert();

create function app.documents_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status or app.is_seeding() then
    return new;
  end if;

  if not app.document_transition_allowed(old.status, new.status) then
    perform app.fail_transition('document', old.status::text, new.status::text);
  end if;

  case new.status
    when 'enviado' then
      new.uploaded_at := now();
      new.uploaded_by := auth.uid();
      new.return_reason := null;
    when 'aprovado' then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      new.return_reason := null;
    when 'reprovado' then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    else
      null;
  end case;

  return new;
end
$$;

create trigger documents_before_update before update on public.documents
  for each row execute function app.documents_before_update();

create function app.documents_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.is_seeding() then
    return null;
  end if;

  if new.process_id is not null then
    perform app.add_movement(
      new.process_id, new.subprocess_id, 'documento_solicitado',
      'Documento solicitado: ' || new.title, null, new.visibility = 'cliente'
    );
  end if;

  if new.visibility = 'cliente' then
    perform app.notify_client(
      new.client_id, 'documento', 'Documento solicitado',
      'A equipe solicitou o envio de ' ||
        case when new.is_sensitive then 'um documento' else new.title end || '.',
      new.process_id, '/portal/documentos'
    );
  end if;

  return null;
end
$$;

create trigger documents_after_insert after insert on public.documents
  for each row execute function app.documents_after_insert();

create function app.documents_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := app.document_public_title(new.title, new.is_sensitive);
  v_visible boolean := new.visibility = 'cliente';
begin
  if app.is_seeding() or new.status is not distinct from old.status then
    return null;
  end if;

  case new.status
    when 'enviado' then
      if new.process_id is not null then
        perform app.add_movement(
          new.process_id, new.subprocess_id, 'documento_enviado',
          'Documento recebido: ' || v_title, null, v_visible
        );
      end if;
      -- Envio feito pelo próprio cliente: avisa a equipe.
      if app.current_user_role() = 'cliente' then
        perform app.notify_team_upload(new.id);
      end if;

    when 'aprovado' then
      if new.process_id is not null then
        perform app.add_movement(
          new.process_id, new.subprocess_id, 'documento_aprovado',
          'Documento aprovado: ' || v_title, null, v_visible
        );
      end if;
      if v_visible then
        perform app.notify_client(
          new.client_id, 'sucesso', 'Documento aprovado',
          'Um dos documentos enviados foi aprovado pela equipe.',
          new.process_id, '/portal/documentos'
        );
      end if;

    when 'reprovado' then
      if new.process_id is not null then
        perform app.add_movement(
          new.process_id, new.subprocess_id, 'documento_reprovado',
          'Documento reprovado: ' || v_title, new.return_reason, v_visible
        );
      end if;

    when 'reenvio_solicitado' then
      if v_visible then
        perform app.notify_client(
          new.client_id, 'alerta', 'Reenvio solicitado',
          'A equipe pediu o reenvio de um documento. Veja o motivo na sua área.',
          new.process_id, '/portal/documentos'
        );
      end if;

    else
      null;
  end case;

  return null;
end
$$;

create trigger documents_after_update after update of status on public.documents
  for each row execute function app.documents_after_update();
