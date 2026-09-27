# Integrações e o que falta para operação

O front-end está ligado ao Supabase self-hosted (ver [backend.md](backend.md)).
Este documento lista a situação de cada integração e o que ainda precisa
acontecer fora do código antes da operação real.

---

## 1. Autenticação e sessão

| Item | Situação |
|------|----------|
| Login por e-mail e senha | Supabase Auth |
| Sessão | JWT do Supabase no `sessionStorage` (some ao fechar a aba), renovação automática |
| Recuperação de senha | E-mail com link de uso único → `/definir-senha` |
| Primeiro acesso (cliente e equipe) | Convite por e-mail → `/definir-senha` |
| Desativar conta | Perfil inativo + bloqueio no Auth; a RLS corta o acesso na hora |
| Autenticação em duas etapas | **Não implementada** — o GoTrue suporta TOTP; exige telas novas |

## 2. API e banco de dados

| Item | Situação |
|------|----------|
| Endpoints | PostgREST + RPCs + Edge Functions (backend.md) |
| Autorização por papel | RLS em todas as tabelas |
| Isolamento do cliente | Cliente sem leitura direta; RPCs `portal_*` com o recorte dele |
| Paginação, filtros e ordenação | No banco, padrão único (backend.md) |
| Auditoria | `audit_log` imutável |

Contrato de erro das Edge Functions: `{ "mensagem": "...", "exibivel": true }`.
Erros de regra do banco usam SQLSTATE `AL4xx` com mensagem exibível. O resto
vira mensagem genérica na interface.

## 3. Armazenamento de arquivos

| Item | Situação | Falta |
|------|----------|-------|
| Upload | Bucket privado `documents`; policy só aceita o cliente dono de documento aberto para envio, ou a equipe | — |
| Download | URL assinada de 60 s pela Edge Function `document-file`, com auditoria | — |
| Validação | Formato e tamanho no bucket, na função e no banco | — |
| Antivírus | Adapter ClamAV pronto, **desligado** | Subir `--profile antivirus` e ligar na tela de integrações |
| Criptografia em repouso | Depende do disco do servidor | Volume criptografado ou backend S3 com SSE |
| Retenção e exclusão | Não definida | Política e rotina |

## 4. E-mail

| Item | Situação | Falta |
|------|----------|-------|
| Convites e recuperação | SMTP do Supabase Auth; em desenvolvimento, Mailpit (http://localhost:8025) | Provedor SMTP real em `docker/.env` (`SMTP_*`) |
| Modelos | Padrão do GoTrue, assuntos em pt-BR | Modelos próprios (`GOTRUE_MAILER_TEMPLATES_*`), se desejado |
| Mensagens externas automáticas | **Fora de escopo** | Só com aprovação prévia |

## 5. Notificações e tempo real

Notificações persistidas no banco e entregues em tempo real (Supabase Realtime,
canais privados). As filas, listas e o portal também se atualizam sozinhos.

## 6. PWA

Inalterado: manifesto e pré-cache apenas do casco. Uso offline de processos e
documentos continua **deliberadamente não implementado**.

## 7. Privacidade e conformidade (LGPD)

Já no sistema: RLS por papel e por cliente, dado de saúde em tabela própria,
registro de acesso a arquivos, auditoria de alterações, mascaramento na
interface. Ainda fora do código:

- base legal e finalidade documentadas para cada dado;
- política de privacidade e termo de uso aceitos no primeiro acesso;
- política de retenção, anonimização e exclusão;
- plano de resposta a incidentes;
- contratos com os operadores (hospedagem, SMTP).

## 8. Hospedagem

| Item | O que falta |
|------|-------------|
| Servidor do Supabase | Máquina com Docker, domínio e HTTPS (ex.: proxy Caddy/Nginx do compose oficial) |
| Front | Vercel (ou similar) com `VITE_SUPABASE_URL` público |
| Segredos | `npm run env:setup` no servidor; `SITE_URL` e `ADDITIONAL_REDIRECT_URLS` com o domínio real |
| Backup | Rotina de `pg_dump` + volume de arquivos, com teste de restauração |
| Monitoramento | Logs, disponibilidade e alertas |
| Ambientes | Homologação separada de produção |

---

## Checklist antes de considerar o sistema em operação

- [x] Autenticação real e sessão segura
- [x] Autorização por papel aplicada no servidor
- [x] Isolamento verificado: cliente não acessa dados de terceiros
- [x] Upload com URL assinada e validação
- [ ] Antivírus ligado e criptografia em repouso
- [ ] SMTP real configurado
- [ ] Supabase hospedado com HTTPS, backup e monitoramento
- [ ] Dados reais migrados e conferidos (após `npm run db:reset:prod`)
- [ ] Testes do fluxo completo com a equipe, em homologação
- [ ] Itens de `docs/duvidas-de-negocio.md` respondidos
- [ ] Conformidade LGPD revisada
