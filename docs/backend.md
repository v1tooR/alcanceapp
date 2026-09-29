# Back-end — Supabase self-hosted

Referência do back-end da Alcance Isenções: como ele é organizado, quem pode o
quê e como testar. Para subir o ambiente, veja o [README](../README.md).

---

## Arquitetura

```
Navegador (React)
  └─ src/services/contratos.ts        ← única dependência das páginas
       └─ src/services/supabase/      ← adaptador (supabase-js)
            ├─ tabelas e views        → PostgREST + RLS          (CRUD, listas)
            ├─ RPCs (funções SQL)     → regras de fluxo, resumos (atômico)
            ├─ Edge Functions         → contas do Auth, arquivos, integrações
            └─ Realtime (broadcast)   → sinais de mudança por canal privado
Docker (docker/docker-compose.yml)
  Kong · Auth (GoTrue) · PostgREST · Realtime · Storage · Edge Runtime ·
  Postgres 17 · Studio · postgres-meta · Mailpit (e-mail local) · ClamAV (opcional)
```

- **Empresa única.** Não há `org_id`: o sistema atende só a Alcance. O
  isolamento que existe é por **cliente** — cada cliente só vê o próprio recorte.
- **O banco é a última barreira.** Toda regra do front-end (validações, fluxos
  de status, permissões) também está no banco, como constraint, gatilho ou RLS.
- **O cliente não lê tabelas.** A área do cliente usa só as RPCs `portal_*`
  (SECURITY DEFINER), que descobrem o cliente pela sessão e devolvem o recorte
  sem observações internas, etapas ocultas, documentos internos nem financeiro.

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `supabase/migrations/` | Schema versionado (padrão Supabase CLI). **Nunca edite uma migration aplicada** — crie outra. |
| `supabase/seed/seed_prod.sql` | Mínimo para operar: configurações, catálogo de subprocessos, integrações, administrador inicial. |
| `supabase/seed/seed_demo.sql` | Dados fictícios + uma conta por papel. |
| `supabase/seed/reset.sql` | Apaga todos os dados, sem tocar no schema. |
| `supabase/functions/` | Edge Functions (Deno). `_shared/integrations/` = módulo de integrações. |
| `docker/` | Compose, Kong e scripts de migração/reset executados em container. |
| `scripts/db.mjs` | Reset para produção/demonstração, migrations, tipos. |
| `src/services/supabase/database.types.ts` | Gerado por `npm run db:types` (`supabase gen types typescript`). Não edite. |

## Papéis e matriz de permissões

Papéis: `super_admin` (administrador geral), `gestor`, `analista` (equipe) e
`cliente`. O papel fica em `profiles.role`; contas só nascem pelo servidor
(Edge Functions ou seed) — não há cadastro público.

V = ver · C = criar · E = editar · X = excluir (lógico)

| Módulo | super_admin | gestor | analista | cliente |
|---|---|---|---|---|
| Painel | V | V | V | — |
| Clientes (+ perfil de saúde) | V C E | V C E | V C E | V próprio, via portal |
| Acesso do cliente ao portal | E | E | E | — |
| Processos, subprocessos | V C E | V C E | V C E | V próprio, recorte |
| Etapas | V C E X | V C E X | V C E X | V só as visíveis |
| Documentos | V, solicitar, analisar | igual | igual | V os visíveis; enviar arquivo quando pedido |
| Abrir arquivo | V (auditado) | V (auditado) | V (auditado) | — |
| Histórico | V C | V C | V C | V só o visível |
| Notificações | V próprias, enviar | igual | igual | V próprias |
| Calendário | V C E X | V C E X | V C E X | V eventos visíveis, próprios |
| Financeiro | V C E X | V C E X | — | — |
| Equipe | V C E | V | — | — |
| Configurações (preferências e minha conta) | V | V | V | — |
| Próprio nome (Minha conta) | E | E | E | — (vem do cadastro) |
| Integrações | V E | — | — | — |
| Auditoria (`audit_log`) | V (SQL/Studio) | — | — | — |

As políticas estão nas migrations de cada tabela (`create policy ...`). As
funções `app.is_team()`, `app.is_manager()`, `app.is_admin()` e
`app.current_client_id()` leem o perfil **ativo** da sessão: desativar uma conta
corta o acesso aos dados imediatamente, mesmo com um token ainda válido.

## Fluxos de status

Validados por gatilho em **toda** mudança (RPC, Studio ou SQL direto). A mesma
regra está em `src/lib/workflow.ts` para a interface.

| Entidade | Transições | O que dispara |
|---|---|---|
| Processo | em_avaliacao → em_andamento, aguardando_cliente, cancelado, arquivado · em_andamento → aguardando_cliente, aguardando_orgao, concluido, cancelado · aguardando_cliente → em_andamento, aguardando_orgao, cancelado · aguardando_orgao → em_andamento, aguardando_cliente, concluido, cancelado · concluido → arquivado · arquivado → em_andamento | Histórico visível ao cliente; `concluded_at` ao concluir |
| Subprocesso | nao_iniciado → em_andamento, aguardando_documentos, nao_aplicavel, cancelado · em_andamento → aguardando_documentos, aguardando_orgao, deferido, indeferido, cancelado · aguardando_documentos → em_andamento, aguardando_orgao, cancelado · aguardando_orgao → em_andamento, deferido, indeferido, cancelado · nao_aplicavel → nao_iniciado | Histórico; `started_at`/`concluded_at`; protocolo novo gera histórico próprio |
| Etapa | pendente → em_andamento, concluida, bloqueada, nao_aplicavel · em_andamento → concluida, bloqueada, pendente, nao_aplicavel · concluida → em_andamento · bloqueada → em_andamento, pendente, nao_aplicavel · nao_aplicavel → pendente | Concluir gera histórico (visível se a etapa for) |
| Documento | solicitado → enviado · enviado → em_analise, aprovado, reprovado, reenvio_solicitado · em_analise → aprovado, reprovado, reenvio_solicitado · aprovado → em_analise · reprovado → reenvio_solicitado · reenvio_solicitado → enviado | Solicitar: histórico + aviso ao cliente · Enviar (pelo cliente): histórico + aviso à equipe · Aprovar: histórico + aviso ao cliente · Reprovar: histórico com motivo · Reenvio: aviso ao cliente |

**Aviso de envio do cliente:** vai para o responsável pelo processo (ou pelo
cliente, se o documento não tem processo); sem responsável ativo, para todos os
gestores e administradores ativos.

**Documento sensível** (laudo): o nome nunca aparece em histórico nem em
notificações — vira "documento com informação sensível".

## Regras do front-end aplicadas no banco

CPF com dígito verificador e único · e-mail, telefone (10–11 dígitos) e CEP (8)
validados · limites de tamanho de todos os textos · financeiro com desconto ≤
total e pago ≤ líquido · motivo de devolução entre 10 e 500 caracteres · um
subprocesso ativo por tipo em cada processo (índice único parcial) · arquivos
PDF/JPG/PNG/HEIC até 10 MB (bucket + coluna) · vínculos coerentes
etapa ⊂ subprocesso ⊂ processo ⊂ cliente · códigos `CLI-0001` e `PRC-AAAA-NNN`
por sequência.

Erros de regra de negócio usam SQLSTATE da classe `AL` (`AL403`, `AL404`,
`AL409`, `AL422`) com mensagem já escrita para o usuário; o adaptador as exibe.
Qualquer outro erro vira texto genérico.

## Política de exclusão

| Entidade | Exclusão |
|---|---|
| Etapas, eventos de calendário, registros financeiros | **Lógica** (`deleted_at`), via RPC. Somem das políticas de leitura e das views. |
| Clientes, processos, subprocessos, documentos | **Não há exclusão.** Encerram-se por status/situação. |
| Histórico, notificações, auditoria | **Imutáveis** (auditoria bloqueia UPDATE/DELETE por gatilho). |
| Contas | Desativadas (perfil inativo + bloqueio no Auth), nunca apagadas pela interface. |

## Auditoria

`public.audit_log` registra INSERT/UPDATE/DELETE (só as colunas alteradas) de
perfis, clientes, perfil de saúde, processos, subprocessos, etapas, documentos,
calendário, financeiro, integrações e configurações, além de eventos explícitos:
`document.file_accessed` (abertura de arquivo), `document.upload_blocked`
(antivírus), `team_member.invited`, `portal_access.invited`. Escritas feitas por
Edge Function registram quem pediu a ação (cabeçalho `x-actor-id`, aceito só da
service role). Leitura: administrador.

## Padrão de listagem

Todas as listas seguem `src/services/supabase/listagem.ts`:

1. view `*_list` com `security_invoker` (vale a RLS de quem consulta);
2. busca livre em `search_text` (sem acento, minúsculo) com `ilike`;
3. filtros por igualdade, ignorando `'todos'`;
4. ordenação por coluna da view, desempate por `id`;
5. paginação por `range` com `count: 'exact'`, devolvendo `Pagina<T>`.

## Realtime

Gatilhos (`app.broadcast_change`) publicam um **sinal** `{table, op, id}` —
nunca dados — em canais privados autorizados por RLS em `realtime.messages`:

| Canal | Quem assina | Recebe |
|---|---|---|
| `team` | equipe | toda mudança operacional |
| `client:<id>` | o próprio cliente | mudanças visíveis a ele |
| `user:<id>` | a própria pessoa | notificações |

`src/app/usar-tempo-real.ts` invalida as consultas afetadas. Isso cobre filas,
painel, listas, detalhe do processo, calendário, notificações e o portal — e
também escritas feitas direto no banco.

## Módulo de integrações

- Tabela `integrations`: chave, provedor, configuração **não sensível** e
  `enabled`. Um gatilho recusa configuração com chaves do tipo senha/token.
- Segredos: variáveis de ambiente dos serviços (`docker/.env`), nunca no banco.
- Adapters com interface comum em `supabase/functions/_shared/integrations/`.
  Trocar de provedor = novo adapter + mudar `provider` na tabela.
- Tela: **Gestão → Integrações** (administrador).

| Integração | Provedor | Onde aparece no front | Segredos |
|---|---|---|---|
| E-mail transacional | `supabase_auth` (SMTP do GoTrue) | Recuperar senha, convite de equipe, acesso ao portal | `SMTP_PASS` (serviço de autenticação) |
| Armazenamento | `supabase_storage` (bucket privado) | Envio no portal, "Abrir arquivo" | — |
| Antivírus | `clamav` (desligado por padrão) | Envio de arquivo | — |

O front **não** usa APIs de terceiros (CEP, pagamento, WhatsApp): nada disso foi
criado. Mensagens externas estão fora do escopo (docs/duvidas-de-negocio.md).

## Edge Functions

| Função | Quem chama | Faz |
|---|---|---|
| `admin-users` | administrador | convida, edita e ativa/desativa pessoas da equipe; impede ficar sem administrador |
| `portal-access` | equipe | cria/convida ou reativa/bloqueia a conta do cliente |
| `document-upload` | cliente ou equipe | confere formato/tamanho, antivírus (se ligado) e registra o envio |
| `document-file` | equipe | URL assinada de 60 s + auditoria |
| `integrations-status` | administrador | situação de cada integração e presença (não valor) dos segredos |

## Seeds e reset

| Comando | Efeito |
|---|---|
| `docker compose up -d` (1ª vez) | migrations + seed conforme `SEED_MODE` (`demo`, `prod` ou `none`) |
| `npm run db:reset:prod` | apaga **todos** os dados e aplica só o seed de produção |
| `npm run db:reset:demo` | apaga tudo e recarrega produção + demonstração |
| `npm run db:migrate` | aplica migrations novas |
| `npm run db:types` | regenera os tipos TypeScript |

O reset esvazia o bucket pela API do Storage, trunca as tabelas, remove as
contas do Auth e reinicia as sequências — o schema não é tocado.

**Entrega em produção:** validar com a base de demonstração, rodar
`npm run db:reset:prod`, entrar com `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` e
trocar a senha em "Esqueci minha senha".

## Como testar cada papel (base de demonstração)

Senha de todas as contas: `DEMO_PASSWORD` (padrão `alcance2026`).

| Papel | Conta | O que conferir |
|---|---|---|
| super_admin | helena@alcanceisencoes.com.br | Menu completo com Integrações; Equipe editável; financeiro com valores |
| gestor | bruno@alcanceisencoes.com.br | Financeiro e Equipe (só leitura); Integrações e Configurações bloqueadas pela URL |
| analista | tatiane@alcanceisencoes.com.br | Sem grupo Gestão; `/app/financeiro` mostra "Acesso restrito"; analisa documentos e abre arquivos |
| cliente | carlos.ferraz2@exemplo.com.br | Cai em `/portal`; `/app` redireciona; vê só o próprio processo; envia arquivo pedido |
| inativa | sofia@alcanceisencoes.com.br | Login recusado com "acesso desativado" |

**Realtime:** abra o portal do cliente em uma janela e, em outra, solicite um
documento para ele (ou rode um `insert` em `public.documents` pelo Studio): o
documento e o aviso aparecem sem recarregar.

**Convite:** na ficha de um cliente sem acesso, ligue "Acesso liberado"; o
e-mail chega no Mailpit (http://localhost:8025); o link leva a
`/definir-senha` e depois ao portal.

## Pendências e decisões

- O catálogo de subprocessos existe em dois lugares: `subprocess_catalog`
  (banco, usado ao criar etapas) e `src/lib/catalogo-subprocessos.ts` (textos da
  interface). Ao mudar um, mude o outro.
- Os documentos da base de demonstração têm só metadados (sem arquivo no
  Storage), por isso não mostram "Abrir arquivo".
- Os e-mails do Auth usam o modelo padrão do GoTrue (assuntos já em pt-BR).
  Modelos próprios exigem hospedar os HTML (`GOTRUE_MAILER_TEMPLATES_*`).
- As dúvidas de docs/duvidas-de-negocio.md continuam valendo; os pontos
  marcados "dúvida" nas migrations seguem o comportamento atual da interface.
