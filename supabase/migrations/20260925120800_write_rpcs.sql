-- =============================================================================
-- RPCs de escrita.
--
-- CRUD simples vai direto às tabelas (PostgREST + RLS). Passam por RPC apenas
-- as operações que precisam ser atômicas, levar uma nota ao histórico ou dar
-- mensagens de erro específicas. Salvo indicação, rodam como SECURITY INVOKER:
-- a RLS continua sendo a barreira de acesso.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------

-- Cria (p_id nulo) ou atualiza um cliente e o perfil assistido, atomicamente.
-- `p_data` usa as chaves do contrato do front-end (EntradaCliente); chaves
-- ausentes mantêm o valor atual. O acesso ao portal NÃO é tratado aqui: ele
-- cria contas no Auth e passa pela Edge Function `portal-access`.
create function public.save_client(p_id uuid, p_data jsonb)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_id uuid;
  v_existing_code text;
  v_address jsonb := p_data -> 'endereco';
  v_health jsonb := p_data -> 'perfilAssistido';
  v_has_address boolean := p_data ? 'endereco';
begin
  perform app.require_team();

  if p_data ? 'cpf' then
    select c.code into v_existing_code
    from public.clients c
    where c.cpf = p_data ->> 'cpf' and c.id is distinct from p_id;
    if v_existing_code is not null then
      perform app.fail('AL409', format('Já existe um cliente cadastrado com este CPF (%s).', v_existing_code));
    end if;
  end if;

  if p_id is null then
    insert into public.clients (
      full_name, cpf, rg, birth_date, email, phone, type, status, responsible_id, internal_notes,
      address_zip, address_street, address_number, address_complement, address_district,
      address_city, address_state
    ) values (
      btrim(p_data ->> 'nome'),
      p_data ->> 'cpf',
      nullif(btrim(p_data ->> 'rg'), ''),
      nullif(p_data ->> 'dataNascimento', '')::date,
      lower(btrim(p_data ->> 'email')),
      p_data ->> 'telefone',
      (p_data ->> 'tipo')::public.client_type,
      coalesce(p_data ->> 'situacao', 'ativo')::public.client_status,
      nullif(p_data ->> 'responsavelId', '')::uuid,
      nullif(btrim(p_data ->> 'observacoesInternas'), ''),
      nullif(v_address ->> 'cep', ''),
      nullif(btrim(v_address ->> 'logradouro'), ''),
      nullif(btrim(v_address ->> 'numero'), ''),
      nullif(btrim(v_address ->> 'complemento'), ''),
      nullif(btrim(v_address ->> 'bairro'), ''),
      nullif(btrim(v_address ->> 'cidade'), ''),
      nullif(v_address ->> 'uf', '')
    )
    returning id into v_id;
  else
    update public.clients c set
      full_name = case when p_data ? 'nome' then btrim(p_data ->> 'nome') else c.full_name end,
      cpf = case when p_data ? 'cpf' then p_data ->> 'cpf' else c.cpf end,
      rg = case when p_data ? 'rg' then nullif(btrim(p_data ->> 'rg'), '') else c.rg end,
      birth_date = case when p_data ? 'dataNascimento' then nullif(p_data ->> 'dataNascimento', '')::date else c.birth_date end,
      email = case when p_data ? 'email' then lower(btrim(p_data ->> 'email')) else c.email end,
      phone = case when p_data ? 'telefone' then p_data ->> 'telefone' else c.phone end,
      type = case when p_data ? 'tipo' then (p_data ->> 'tipo')::public.client_type else c.type end,
      status = case when p_data ? 'situacao' then (p_data ->> 'situacao')::public.client_status else c.status end,
      responsible_id = case when p_data ? 'responsavelId' then nullif(p_data ->> 'responsavelId', '')::uuid else c.responsible_id end,
      internal_notes = case when p_data ? 'observacoesInternas' then nullif(btrim(p_data ->> 'observacoesInternas'), '') else c.internal_notes end,
      address_zip = case when v_has_address then nullif(v_address ->> 'cep', '') else c.address_zip end,
      address_street = case when v_has_address then nullif(btrim(v_address ->> 'logradouro'), '') else c.address_street end,
      address_number = case when v_has_address then nullif(btrim(v_address ->> 'numero'), '') else c.address_number end,
      address_complement = case when v_has_address then nullif(btrim(v_address ->> 'complemento'), '') else c.address_complement end,
      address_district = case when v_has_address then nullif(btrim(v_address ->> 'bairro'), '') else c.address_district end,
      address_city = case when v_has_address then nullif(btrim(v_address ->> 'cidade'), '') else c.address_city end,
      address_state = case when v_has_address then nullif(v_address ->> 'uf', '') else c.address_state end
    where c.id = p_id
    returning c.id into v_id;

    if v_id is null then
      perform app.fail('AL404', 'Cliente não encontrado.');
    end if;
  end if;

  if p_data ? 'perfilAssistido' then
    if v_health is null or jsonb_typeof(v_health) = 'null' then
      delete from public.client_health_profiles where client_id = v_id;
    else
      insert into public.client_health_profiles as h (
        client_id, disability_categories, notes, has_medical_report, medical_report_valid_until
      ) values (
        v_id,
        coalesce(array(select btrim(x) from jsonb_array_elements_text(v_health -> 'categorias') x where btrim(x) <> ''), '{}'),
        nullif(btrim(v_health ->> 'observacoes'), ''),
        coalesce((v_health ->> 'possuiLaudo')::boolean, false),
        nullif(v_health ->> 'laudoValidoAte', '')::date
      )
      on conflict (client_id) do update set
        disability_categories = excluded.disability_categories,
        notes = excluded.notes,
        has_medical_report = excluded.has_medical_report,
        medical_report_valid_until = excluded.medical_report_valid_until;
    end if;
  end if;

  return v_id;
end
$$;

-- -----------------------------------------------------------------------------
-- Processos, subprocessos e etapas
-- -----------------------------------------------------------------------------

-- Cria as etapas sugeridas do catálogo para um subprocesso.
create function app.create_suggested_steps(p_subprocess_id uuid, p_type public.subprocess_type, p_responsible_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.process_steps (subprocess_id, title, position, status, responsible_id, visible_to_client)
  select p_subprocess_id, s.title, s.ordinality - 1, 'pendente', p_responsible_id, true
  from public.subprocess_catalog c,
       unnest(c.suggested_steps) with ordinality as s (title, ordinality)
  where c.type = p_type;
$$;

grant execute on function app.create_suggested_steps(uuid, public.subprocess_type, uuid) to authenticated;

-- Abre um processo com os subprocessos escolhidos e as etapas sugeridas.
create function public.create_process(p_data jsonb)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_process_id uuid;
  v_sub_id uuid;
  v_type public.subprocess_type;
  v_types public.subprocess_type[];
  v_responsible uuid := nullif(p_data ->> 'responsavelId', '')::uuid;
begin
  perform app.require_team();

  select array_agg(distinct t::public.subprocess_type)
    into v_types
  from jsonb_array_elements_text(p_data -> 'subprocessos') t;

  if coalesce(cardinality(v_types), 0) = 0 then
    perform app.fail('AL422', 'Selecione ao menos um subprocesso aplicável.');
  end if;

  if not exists (select 1 from public.clients where id = (p_data ->> 'clienteId')::uuid) then
    perform app.fail('AL404', 'Cliente não encontrado.');
  end if;

  insert into public.processes (client_id, title, priority, responsible_id, due_date, public_summary, internal_notes)
  values (
    (p_data ->> 'clienteId')::uuid,
    btrim(p_data ->> 'titulo'),
    coalesce(p_data ->> 'prioridade', 'normal')::public.priority,
    v_responsible,
    nullif(p_data ->> 'prazoFinal', '')::date,
    nullif(btrim(p_data ->> 'resumoPublico'), ''),
    nullif(btrim(p_data ->> 'observacoesInternas'), '')
  )
  returning id into v_process_id;

  foreach v_type in array (
    select array_agg(c.type order by c.display_order)
    from public.subprocess_catalog c where c.type = any (v_types)
  ) loop
    insert into public.subprocesses (process_id, type, responsible_id, agency, next_action, next_action_owner)
    select v_process_id, v_type, v_responsible, c.suggested_agency,
           'Confirmar aplicabilidade e iniciar o subprocesso.', 'equipe'
    from public.subprocess_catalog c where c.type = v_type
    returning id into v_sub_id;

    perform app.create_suggested_steps(v_sub_id, v_type, v_responsible);
  end loop;

  perform app.add_movement(
    v_process_id, null, 'processo_criado', 'Processo aberto',
    'Subprocessos abertos: ' || (
      select string_agg(c.name, ', ' order by c.display_order)
      from public.subprocess_catalog c where c.type = any (v_types)
    ) || '.',
    true
  );

  return v_process_id;
end
$$;

create function public.change_process_status(p_id uuid, p_status public.process_status, p_note text default null)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform app.require_team();
  perform app.set_transition_note(p_note);
  update public.processes set status = p_status where id = p_id;
  if not found then
    perform app.fail('AL404', 'Processo não encontrado.');
  end if;
end
$$;

create function public.add_subprocess(p_data jsonb)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_process_id uuid := (p_data ->> 'processoId')::uuid;
  v_type public.subprocess_type := (p_data ->> 'tipo')::public.subprocess_type;
  v_responsible uuid := nullif(p_data ->> 'responsavelId', '')::uuid;
  v_name text := app.subprocess_name(v_type);
  v_id uuid;
begin
  perform app.require_team();

  if not exists (select 1 from public.processes where id = v_process_id) then
    perform app.fail('AL404', 'Processo não encontrado.');
  end if;

  if exists (
    select 1 from public.subprocesses s
    where s.process_id = v_process_id and s.type = v_type and not app.subprocess_is_final(s.status)
  ) then
    perform app.fail('AL409', format('Já existe um subprocesso de %s em andamento neste processo.', v_name));
  end if;

  insert into public.subprocesses (
    process_id, type, responsible_id, agency, due_date, next_action, next_action_owner, internal_notes
  )
  select
    v_process_id, v_type, v_responsible,
    coalesce(nullif(btrim(p_data ->> 'orgao'), ''), c.suggested_agency),
    nullif(p_data ->> 'prazo', '')::date,
    coalesce(nullif(btrim(p_data ->> 'proximaAcao'), ''), 'Confirmar aplicabilidade e iniciar o subprocesso.'),
    'equipe',
    nullif(btrim(p_data ->> 'observacoesInternas'), '')
  from public.subprocess_catalog c where c.type = v_type
  returning id into v_id;

  if coalesce((p_data ->> 'criarEtapasSugeridas')::boolean, false) then
    perform app.create_suggested_steps(v_id, v_type, v_responsible);
  end if;

  perform app.add_movement(v_process_id, v_id, 'observacao', 'Subprocesso aberto: ' || v_name, null, true);

  return v_id;
end
$$;

create function public.change_subprocess_status(p_id uuid, p_status public.subprocess_status, p_note text default null)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform app.require_team();
  perform app.set_transition_note(p_note);
  update public.subprocesses set status = p_status where id = p_id;
  if not found then
    perform app.fail('AL404', 'Subprocesso não encontrado.');
  end if;
end
$$;

create function public.change_step_status(p_id uuid, p_status public.step_status, p_note text default null)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform app.require_team();
  perform app.set_transition_note(p_note);
  update public.process_steps
  set status = p_status,
      client_note = coalesce(nullif(btrim(p_note), ''), client_note)
  where id = p_id;
  if not found then
    perform app.fail('AL404', 'Etapa não encontrada.');
  end if;
end
$$;

-- Exclusão lógica. SECURITY DEFINER porque a linha removida deixa de ser
-- visível pela política de leitura; a permissão é conferida explicitamente.
create function public.remove_step(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app.require_team();
  update public.process_steps set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then
    perform app.fail('AL404', 'Etapa não encontrada.');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Documentos
-- -----------------------------------------------------------------------------

create function app.document_for_review(p_id uuid)
returns public.documents
language plpgsql
stable
set search_path = ''
as $$
declare
  v_doc public.documents;
begin
  select * into v_doc from public.documents where id = p_id;
  if v_doc.id is null then
    perform app.fail('AL404', 'Documento não encontrado.');
  end if;
  return v_doc;
end
$$;

grant execute on function app.document_for_review(uuid) to authenticated;

create function public.start_document_review(p_id uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_doc public.documents;
begin
  perform app.require_team();
  v_doc := app.document_for_review(p_id);
  if not app.document_transition_allowed(v_doc.status, 'em_analise') then
    perform app.fail('AL422', 'Este documento não pode entrar em análise agora.');
  end if;
  update public.documents set status = 'em_analise' where id = p_id;
end
$$;

create function public.approve_document(p_id uuid, p_internal_notes text default null)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_doc public.documents;
begin
  perform app.require_team();
  v_doc := app.document_for_review(p_id);
  if not app.document_transition_allowed(v_doc.status, 'aprovado') then
    perform app.fail('AL422', 'Só é possível aprovar documentos já enviados.');
  end if;
  update public.documents
  set status = 'aprovado',
      internal_notes = coalesce(nullif(btrim(p_internal_notes), ''), internal_notes)
  where id = p_id;
end
$$;

create function public.reject_document(p_id uuid, p_reason text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_doc public.documents;
begin
  perform app.require_team();
  v_doc := app.document_for_review(p_id);
  if not app.document_transition_allowed(v_doc.status, 'reprovado') then
    perform app.fail('AL422', 'Só é possível reprovar documentos já enviados.');
  end if;
  update public.documents set status = 'reprovado', return_reason = btrim(p_reason) where id = p_id;
end
$$;

create function public.request_document_resubmission(p_id uuid, p_reason text, p_new_deadline date default null)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_doc public.documents;
begin
  perform app.require_team();
  v_doc := app.document_for_review(p_id);
  if not app.document_transition_allowed(v_doc.status, 'reenvio_solicitado') then
    perform app.fail('AL422', 'Este documento não permite pedido de reenvio agora.');
  end if;
  update public.documents
  set status = 'reenvio_solicitado',
      return_reason = btrim(p_reason),
      upload_deadline = coalesce(p_new_deadline, upload_deadline)
  where id = p_id;
end
$$;

-- Registra o arquivo já gravado no Storage. Chamada pela Edge Function
-- `document-upload` com o JWT de quem enviou (cliente ou equipe), depois da
-- verificação de antivírus quando habilitada.
create function public.register_document_upload(
  p_id uuid,
  p_path text,
  p_name text,
  p_size bigint,
  p_mime text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_doc public.documents;
  v_is_team boolean := app.is_team();
  v_client_id uuid := app.current_client_id();
begin
  select * into v_doc from public.documents where id = p_id for update;

  -- Para o cliente, documento de outro cliente ou interno "não existe".
  if v_doc.id is null
     or (not v_is_team and (v_client_id is null or v_doc.client_id <> v_client_id or v_doc.visibility <> 'cliente')) then
    perform app.fail('AL404', 'Documento não encontrado.');
  end if;

  if v_doc.status not in ('solicitado', 'reenvio_solicitado') then
    perform app.fail('AL422', 'Este documento não está aberto para envio.');
  end if;

  if p_path is null or p_path not like v_doc.client_id || '/' || v_doc.id || '/%' then
    perform app.fail('AL422', 'Arquivo inválido para este documento.');
  end if;

  update public.documents
  set status = 'enviado',
      file_path = p_path,
      file_name = left(p_name, 255),
      file_size_bytes = p_size,
      file_mime = p_mime
  where id = p_id;
end
$$;

-- -----------------------------------------------------------------------------
-- Notificações
-- -----------------------------------------------------------------------------

create function public.mark_notification_read(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.notifications set read_at = coalesce(read_at, now())
  where id = p_id and recipient_id = auth.uid();
  if not found then
    perform app.fail('AL404', 'Notificação não encontrada.');
  end if;
end
$$;

create function public.mark_all_notifications_read()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
$$;

-- -----------------------------------------------------------------------------
-- Exclusões lógicas de calendário e financeiro
-- -----------------------------------------------------------------------------

create function public.remove_calendar_event(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app.require_team();
  update public.calendar_events set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then
    perform app.fail('AL404', 'Evento não encontrado.');
  end if;
end
$$;

create function public.remove_financial_record(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not app.is_manager() then
    perform app.fail('AL403', 'Você não tem permissão para esta ação.');
  end if;
  update public.financial_records set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then
    perform app.fail('AL404', 'Registro financeiro não encontrado.');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Permissões das RPCs
-- -----------------------------------------------------------------------------

revoke execute on function
  public.save_client(uuid, jsonb),
  public.create_process(jsonb),
  public.change_process_status(uuid, public.process_status, text),
  public.add_subprocess(jsonb),
  public.change_subprocess_status(uuid, public.subprocess_status, text),
  public.change_step_status(uuid, public.step_status, text),
  public.remove_step(uuid),
  public.start_document_review(uuid),
  public.approve_document(uuid, text),
  public.reject_document(uuid, text),
  public.request_document_resubmission(uuid, text, date),
  public.register_document_upload(uuid, text, text, bigint, text),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(),
  public.remove_calendar_event(uuid),
  public.remove_financial_record(uuid)
from public, anon;

grant execute on function
  public.save_client(uuid, jsonb),
  public.create_process(jsonb),
  public.change_process_status(uuid, public.process_status, text),
  public.add_subprocess(jsonb),
  public.change_subprocess_status(uuid, public.subprocess_status, text),
  public.change_step_status(uuid, public.step_status, text),
  public.remove_step(uuid),
  public.start_document_review(uuid),
  public.approve_document(uuid, text),
  public.reject_document(uuid, text),
  public.request_document_resubmission(uuid, text, date),
  public.register_document_upload(uuid, text, text, bigint, text),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(),
  public.remove_calendar_event(uuid),
  public.remove_financial_record(uuid)
to authenticated;
