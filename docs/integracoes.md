# Integrações necessárias para entrar em operação

O front-end está pronto e funcional sobre uma **base fictícia em memória**. Para
o Web App entrar em operação real, os itens abaixo precisam ser implementados e
validados. Nenhum deles é entregável apenas de front-end.

> A troca é feita sem reescrever páginas: elas dependem só dos contratos em
> `src/services/contratos.ts`. Basta `VITE_MODO_DADOS=api` e completar
> `src/services/http/index.ts`.

---

## 1. Autenticação e sessão

| Item | Situação | O que falta |
|------|----------|-------------|
| Login por e-mail e senha | Simulado | Provedor real (ex.: Supabase Auth, Auth0, Cognito) ou serviço próprio |
| Sessão | `sessionStorage` com o id do usuário, só no adaptador simulado | Cookie `httpOnly` + `Secure` + `SameSite`, com renovação e expiração |
| Recuperação de senha | Tela pronta, resposta genérica | Envio real de e-mail com token de uso único e expiração curta |
| Primeiro acesso do cliente | Não implementado | Fluxo de convite e definição de senha |
| Autenticação em duas etapas | Não implementado | Recomendada para perfis com acesso a dados sensíveis |

**Importante:** a proteção de rotas em `src/components/layout/rota-protegida.tsx`
e as permissões em `src/lib/permissoes.ts` são **de interface**. Elas não
substituem autorização no servidor.

## 2. API e banco de dados

| Item | Situação | O que falta |
|------|----------|-------------|
| Endpoints | Especificados em `src/services/http/index.ts` | Implementação no backend |
| Autorização por papel | Apenas na interface | Regras no servidor (ex.: RLS por `cliente_id` e por papel) |
| Isolamento do cliente | Simulado no adaptador | Garantia no servidor de que o cliente só lê os próprios dados |
| Paginação, filtros e ordenação | Feitos em memória | Fazer no banco, com índices adequados |
| Auditoria | Movimentações registradas na aplicação | Trilha de auditoria imutável no servidor (quem alterou o quê e quando) |

Contrato de erro esperado pelo front-end:

```json
{ "mensagem": "Texto já revisado para o usuário", "exibivel": true }
```

Sem `exibivel: true`, a interface mostra uma mensagem genérica — para não expor
detalhes internos nem dados pessoais na tela.

## 3. Armazenamento de arquivos

| Item | Situação | O que falta |
|------|----------|-------------|
| Upload | Apenas metadados (nome, tamanho, tipo) | URL assinada com expiração curta |
| Download/visualização | Não implementado | URL assinada por requisição, nunca link público |
| Validação de arquivo | Tamanho e tipo conferidos na tela | Conferência no servidor + verificação de conteúdo real |
| Antivírus | Não implementado | Obrigatório antes de disponibilizar o arquivo à equipe |
| Criptografia em repouso | Não implementado | Obrigatória — há laudos e dados de saúde |
| Retenção e exclusão | Não definida | Política de retenção e rotina de exclusão |

## 4. Notificações

| Item | Situação | O que falta |
|------|----------|-------------|
| Notificações internas | Funcionais na aplicação | Persistência no banco |
| Atualização em tempo real | Consulta periódica (60 s) | WebSocket / realtime, se desejado |
| E-mail e mensagens externas | **Fora de escopo** | Só com aprovação prévia |

## 5. PWA

| Item | Situação | O que falta |
|------|----------|-------------|
| Manifesto e instalação | Configurados | Ícone `maskable` gerado a partir do kit de marca |
| Service worker | Pré-cache apenas do casco (JS/CSS/ícones) | — |
| Uso offline de processos e documentos | **Deliberadamente não implementado** | Depende de definição técnica e validação de segurança específicas |

## 6. Privacidade e conformidade (LGPD)

O sistema trata dados pessoais sensíveis (saúde e deficiência). Antes da
operação real:

- base legal e finalidade documentadas para cada dado coletado;
- política de privacidade e termo de uso publicados e aceitos no primeiro acesso;
- controle de acesso por papel aplicado no servidor;
- registro de acesso a documentos sensíveis;
- política de retenção, anonimização e exclusão;
- plano de resposta a incidentes;
- contrato com os operadores (hospedagem, armazenamento, autenticação).

Já implementado na interface, como apoio: mascaramento de CPF/e-mail/telefone,
exibição de dado sensível só após ação explícita, descrição genérica de
documentos sensíveis em notificações e histórico, e mensagens de erro que não
vazam conteúdo.

## 7. Hospedagem e operação

| Item | O que falta |
|------|-------------|
| Domínio e HTTPS | Definir domínio do app e certificado |
| Cabeçalhos de segurança | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` |
| Backup e restauração | Rotina e teste de restauração |
| Monitoramento | Erros, disponibilidade e alertas |
| Ambientes | Separar homologação de produção |

---

## Checklist mínimo antes de considerar o sistema em operação

- [ ] Autenticação real e sessão segura
- [ ] Autorização por papel aplicada no servidor
- [ ] Isolamento verificado: cliente não acessa dados de terceiros
- [ ] Upload com URL assinada, validação, antivírus e criptografia
- [ ] Dados reais migrados e conferidos
- [ ] Testes do fluxo completo com a equipe, em homologação
- [ ] Itens de `docs/duvidas-de-negocio.md` respondidos
- [ ] Conformidade LGPD revisada
