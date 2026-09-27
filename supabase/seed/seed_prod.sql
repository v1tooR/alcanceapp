-- =============================================================================
-- Seed de PRODUÇÃO — o mínimo para a empresa começar do zero.
--
--   * configurações da empresa;
--   * catálogo de subprocessos (tabela de domínio);
--   * integrações (provedor e configuração não sensível);
--   * administrador inicial.
--
-- Variáveis psql obrigatórias (vêm do docker/.env, nunca do código):
--   admin_email, admin_name, admin_password
--
-- Uso: docker/scripts/migrate.sh (primeira subida) ou `npm run db:reset:prod`.
-- =============================================================================

\set ON_ERROR_STOP on

-- Seeds não geram histórico, notificações, auditoria nem eventos de realtime.
select set_config('app.seeding', 'on', false);

select set_config('seed.admin_email', lower(btrim(:'admin_email')), false);
select set_config('seed.admin_name', btrim(:'admin_name'), false);
select set_config('seed.admin_password', :'admin_password', false);

-- -----------------------------------------------------------------------------
-- Cria uma conta de acesso (Auth) já confirmada. Temporária: some ao fim da sessão.
-- -----------------------------------------------------------------------------
create function pg_temp.create_login(p_id uuid, p_email text, p_password text, p_name text, p_banned boolean default false)
returns uuid
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, banned_until, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name),
    case when p_banned then timestamptz '2126-01-01 00:00:00+00' end,
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', null, now(), now()
  );

  return p_id;
end
$$;

-- -----------------------------------------------------------------------------
-- Configurações da empresa
-- -----------------------------------------------------------------------------
insert into public.company_settings (id, company_name, timezone, stale_process_days)
values (true, 'Alcance Isenções', 'America/Sao_Paulo', 15)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Catálogo de subprocessos (espelha src/lib/catalogo-subprocessos.ts)
-- -----------------------------------------------------------------------------
insert into public.subprocess_catalog
  (type, name, description, suggested_agency, suggested_steps, suggested_documents, applicability, display_order)
values
  ('avaliacao_inicial', 'Avaliação inicial',
   'Levantamento da situação do cliente e definição dos serviços aplicáveis.', null,
   array['Entrevista inicial', 'Conferência da documentação básica', 'Definição dos subprocessos aplicáveis', 'Alinhamento com o cliente'],
   array['rg', 'cpf', 'comprovante_endereco', 'laudo_medico']::public.document_type[],
   'Recomendada para todo novo processo, antes de abrir os demais subprocessos.', 1),
  ('ipi', 'IPI', 'Isenção de IPI na aquisição de veículo.', 'Receita Federal',
   array['Reunir documentação exigida', 'Preencher requerimento', 'Protocolar pedido', 'Acompanhar análise', 'Registrar decisão'],
   array['rg', 'cpf', 'comprovante_endereco', 'laudo_medico', 'declaracao']::public.document_type[],
   'Aplicável quando há aquisição de veículo. Confirmar enquadramento do cliente.', 2),
  ('iof', 'IOF', 'Isenção de IOF em financiamento vinculado à aquisição do veículo.',
   'Instituição financeira / Receita Federal',
   array['Confirmar financiamento', 'Reunir documentação exigida', 'Protocolar pedido', 'Registrar decisão'],
   array['rg', 'cpf', 'laudo_medico', 'comprovante_renda']::public.document_type[],
   'Aplicável apenas quando a compra envolve financiamento.', 3),
  ('icms', 'ICMS', 'Isenção de ICMS na aquisição de veículo.', 'Secretaria da Fazenda estadual',
   array['Reunir documentação exigida', 'Preencher requerimento', 'Protocolar pedido', 'Acompanhar análise', 'Registrar decisão'],
   array['rg', 'cpf', 'comprovante_endereco', 'laudo_medico', 'nota_fiscal']::public.document_type[],
   'Aplicável na aquisição de veículo. Regras variam por estado.', 4),
  ('ipva', 'IPVA', 'Isenção de IPVA do veículo do cliente.', 'Secretaria da Fazenda estadual',
   array['Confirmar dados do veículo', 'Reunir documentação exigida', 'Protocolar pedido', 'Acompanhar análise', 'Registrar decisão'],
   array['rg', 'cpf', 'crlv', 'laudo_medico']::public.document_type[],
   'Aplicável quando o cliente já possui veículo em seu nome.', 5),
  ('estacionamento_pcd', 'Cartão de estacionamento PCD',
   'Credencial de estacionamento para pessoa com deficiência.', 'Órgão municipal de trânsito',
   array['Reunir documentação exigida', 'Solicitar credencial', 'Acompanhar análise', 'Registrar emissão'],
   array['rg', 'cpf', 'comprovante_endereco', 'laudo_medico']::public.document_type[],
   'Aplicável mediante interesse do cliente. Emissão é municipal.', 6),
  ('rodizio', 'Isenção de rodízio', 'Dispensa do rodízio municipal de veículos.', 'Órgão municipal de trânsito',
   array['Confirmar dados do veículo', 'Reunir documentação exigida', 'Solicitar isenção', 'Registrar decisão'],
   array['rg', 'cpf', 'crlv', 'laudo_medico']::public.document_type[],
   'Aplicável apenas em municípios com rodízio e conforme regra local.', 7),
  ('recurso', 'Recurso', 'Contestação de decisão desfavorável em outro subprocesso.', null,
   array['Analisar motivo do indeferimento', 'Reunir documentação complementar', 'Elaborar recurso', 'Protocolar recurso', 'Acompanhar análise', 'Registrar decisão'],
   array['laudo_medico', 'declaracao', 'outro']::public.document_type[],
   'Aberto após indeferimento, quando houver fundamento para contestação.', 8)
on conflict (type) do update set
  name = excluded.name,
  description = excluded.description,
  suggested_agency = excluded.suggested_agency,
  suggested_steps = excluded.suggested_steps,
  suggested_documents = excluded.suggested_documents,
  applicability = excluded.applicability,
  display_order = excluded.display_order;

-- -----------------------------------------------------------------------------
-- Integrações (sem segredos: `secret_names` lista apenas os nomes esperados)
-- -----------------------------------------------------------------------------
insert into public.integrations (key, name, category, provider, description, enabled, config, secret_names)
values
  ('email', 'E-mail transacional', 'email', 'supabase_auth',
   'Convites de acesso (equipe e clientes) e recuperação de senha, enviados pelo Supabase Auth via SMTP.',
   true,
   '{"invite_redirect_path": "/definir-senha", "recovery_redirect_path": "/definir-senha"}'::jsonb,
   array['SMTP_PASS']),
  ('storage', 'Armazenamento de arquivos', 'storage', 'supabase_storage',
   'Arquivos enviados pelos clientes, em bucket privado. A equipe abre por URL assinada de curta duração.',
   true,
   '{"bucket": "documents", "signed_url_ttl_seconds": 60}'::jsonb,
   array[]::text[]),
  ('antivirus', 'Antivírus de uploads', 'antivirus', 'clamav',
   'Verificação dos arquivos antes de ficarem disponíveis à equipe. Requer o serviço ClamAV (perfil "antivirus" do docker compose).',
   false,
   '{"fail_closed": true}'::jsonb,
   array[]::text[])
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Administrador inicial
-- -----------------------------------------------------------------------------
do $$
declare
  v_email text := current_setting('seed.admin_email');
  v_name text := current_setting('seed.admin_name');
  v_password text := current_setting('seed.admin_password');
  v_id uuid;
begin
  if v_email = '' or v_password = '' or v_name = '' then
    raise exception 'ADMIN_EMAIL, ADMIN_NAME e ADMIN_INITIAL_PASSWORD são obrigatórios (docker/.env).';
  end if;
  if length(v_password) < 8 then
    raise exception 'ADMIN_INITIAL_PASSWORD deve ter ao menos 8 caracteres.';
  end if;

  select id into v_id from auth.users where email = v_email;
  if v_id is null then
    v_id := pg_temp.create_login(gen_random_uuid(), v_email, v_password, v_name);
  end if;

  insert into public.profiles (id, full_name, email, role, job_title, active)
  values (v_id, v_name, v_email, 'super_admin', 'Administração', true)
  on conflict (id) do nothing;
end
$$;
