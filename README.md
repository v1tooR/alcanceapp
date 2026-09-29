# Alcance Isenções — Web App

Front-end do sistema de gestão de clientes e atendimentos da **Alcance
Isenções**: painel administrativo para a equipe e área individual para cada
cliente.

> **Estado atual:** front-end ligado a um back-end **Supabase self-hosted**
> (Docker): banco Postgres com RLS, autenticação, armazenamento de arquivos,
> Edge Functions e tempo real. Referência do back-end em
> [`docs/backend.md`](docs/backend.md).

---

## Como rodar

Pré-requisitos: Node 20+ e Docker (Docker Desktop no Windows/macOS).

```bash
npm install
npm run env:setup     # gera docker/.env (segredos aleatórios) e .env.local
npm run supabase:up   # sobe o Supabase; migrations e seed rodam sozinhos
npm run dev
```

| Endereço | O quê |
|----------|-------|
| http://localhost:5173 | App |
| http://localhost:8000 | API do Supabase (Kong) e Studio — login em `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` de `docker/.env` |
| http://localhost:8025 | Mailpit: e-mails de convite e recuperação de senha em desenvolvimento |

Zerar o ambiente inteiro (volumes incluídos) e recriar só com migrations + seed:

```bash
docker compose -f docker/docker-compose.yml down -v
npm run supabase:up
```

### Contas de demonstração

Criadas pelo seed de demonstração (`SEED_MODE=demo`, padrão). Senha de todas:
`DEMO_PASSWORD` de `docker/.env` (padrão `alcance2026`).

| E-mail | Perfil |
|--------|--------|
| `helena@alcanceisencoes.com.br` | Administrador geral |
| `bruno@alcanceisencoes.com.br` | Gestor |
| `tatiane@alcanceisencoes.com.br` | Analista |
| `carlos.ferraz2@exemplo.com.br` | Cliente (área do cliente) |
| `sofia@alcanceisencoes.com.br` | Conta desativada — o login deve ser recusado |

O seed de produção cria também o administrador inicial `ADMIN_EMAIL`, com a
senha `ADMIN_INITIAL_PASSWORD` de `docker/.env`.

### Entrega para operação real

Depois de validar com a base de demonstração:

```bash
npm run db:reset:prod   # apaga TODOS os dados; deixa só o mínimo de produção
```

O schema não é tocado. Entre com o administrador inicial e troque a senha pelo
"Esqueci minha senha".

### Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Verificação de tipos + build de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run preview` | Serve o build (necessário para testar o PWA) |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |
| `npm run env:setup` | Gera `docker/.env` e `.env.local` (não sobrescreve; `-- --force` regera) |
| `npm run supabase:up` / `supabase:down` | Sobe / para o Supabase local |
| `npm run db:migrate` | Aplica migrations novas |
| `npm run db:types` | Regenera os tipos TypeScript do banco (`supabase gen types`) |
| `npm run db:reset:prod` | Apaga os dados e aplica só o seed de produção (pede confirmação) |
| `npm run db:reset:demo` | Apaga os dados e recarrega a demonstração (pede confirmação) |

---

## Stack

Vite · React 19 · TypeScript (modo estrito) · Tailwind CSS v4 · shadcn/ui sobre
Radix UI · Lucide · React Router · React Hook Form + Zod · TanStack Query ·
Sonner · Recharts · date-fns · Motion · AutoAnimate · Zustand · vite-plugin-pwa ·
ESLint · Vitest · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).

Bibliotecas previstas mas **não instaladas**, por não haver necessidade real:
TanStack Table e TanStack Virtual (filtro, ordenação e paginação vêm da camada de
serviços) e React Aria (os componentes Radix cobriram a acessibilidade).

---

## Estrutura

```
src/
├─ app/            # providers, roteador
├─ components/
│  ├─ ui/          # primitivos (shadcn/Radix) — sem regra de negócio
│  ├─ shared/      # componentes de domínio reutilizáveis
│  └─ layout/      # cascas, navegação, proteção de rota
├─ features/       # um diretório por módulo (pages + components)
├─ lib/            # regras, formatação, máscaras, permissões, privacidade
├─ schemas/        # validação com Zod
├─ services/
│  ├─ contratos.ts # interfaces tipadas — única dependência das páginas
│  ├─ supabase/    # adaptador Supabase (tabelas, RPCs, Edge Functions, realtime)
│  └─ chaves.ts    # chaves de cache do TanStack Query
├─ stores/         # sessão e preferências (Zustand)
├─ styles/         # design system em variáveis CSS
└─ types/          # modelo de domínio
```

```
supabase/
├─ migrations/     # schema versionado (padrão Supabase CLI)
├─ seed/           # seed_prod.sql, seed_demo.sql, reset.sql
└─ functions/      # Edge Functions (Deno) e módulo de integrações
docker/            # docker-compose do Supabase self-hosted, Kong, scripts
scripts/           # setup de ambiente e operações do banco
```

**Regra da camada de serviços:** nenhuma página importa o Supabase diretamente.
Todas dependem de `servicos` (`src/services/index.ts`), que implementa os
contratos de `src/services/contratos.ts` com o adaptador em
`src/services/supabase/`.

### Publicação (produção)

- **Supabase:** projeto `webapp` na organização Alcance Isenções, região São Paulo
  (`sa-east-1`). Migrations de `supabase/migrations/`, seed de produção e as 5
  Edge Functions já aplicados. Configurações feitas **no painel** do Supabase:
  *Authentication → URL Configuration* (Site URL `https://app.alcanceisencoes.com.br`
  e redirecionamento `https://app.alcanceisencoes.com.br/**`), cadastro público
  desligado e SMTP próprio.
- **App:** Hostinger, em `app.alcanceisencoes.com.br`. O build lê
  `.env.production.local` (fora do git, com `VITE_SUPABASE_URL` e a chave pública):

  ```bash
  npm run build
  ```

  Envie o **conteúdo** de `dist/` (inclusive o `.htaccess`, que é oculto) para
  a pasta do subdomínio. O `.htaccess` força HTTPS, devolve o `index.html` para
  as rotas do app e define cabeçalhos de segurança e de cache.
- Variáveis `VITE_*` entram no build: mudou uma delas, gere e envie o `dist/` de novo.
- No Supabase hospedado, o domínio dos links de convite vem de `site_url` na
  integração de e-mail (tela Integrações); no Docker local, de `SITE_URL`.

### Design system

Todas as cores, tipografia, espaçamentos, raios, sombras e estados vivem em
`src/styles/globals.css`, como variáveis CSS expostas ao Tailwind via
`@theme inline`. Nenhum componente usa cor literal. Paleta derivada da marca:
roxo `#840DA8`, laranja `#D84D1C`, lilás, branco e tinta escura. Tema claro e
escuro.

Tipografia: **DM Sans variável**, a mesma do site, empacotada no app
(`@fontsource-variable/dm-sans`) — sem requisição ao Google Fonts e disponível
no PWA. O tratamento tipográfico do site (títulos em peso 800, "chapéu" com traço
laranja, destaque sublinhado) está nos utilitários `alc-*`.

Cores e regras dos gráficos, com os resultados da validação para daltonismo e
contraste: [`docs/visualizacao-de-dados.md`](docs/visualizacao-de-dados.md).

---

## O que está implementado e funcional

**Painel administrativo**

- Painel inicial em grade bento: abertura com riscos imediatos, indicadores com variação e tendência por período (3, 6 ou 12 meses), entradas e conclusões por mês, situação dos processos, subprocessos por serviço com taxa de deferimento, funil de documentos, carga da equipe, fila prioritária, atividade e agenda — cada gráfico com versão em tabela
- Clientes: cadastro, edição, busca, filtros, paginação, detalhe com abas, liberação de acesso ao portal
- Processos: abertura com seleção de subprocessos aplicáveis, listagem com filtros, detalhe completo
- Subprocessos: avaliação inicial, IPI, IOF, ICMS, IPVA, estacionamento PCD, rodízio e recurso — com status, protocolo, órgão, prazo, próxima ação e responsável
- Etapas: criar, editar, concluir, bloquear, marcar como não aplicável, remover, definir visibilidade ao cliente
- Documentos: solicitar, receber, colocar em análise, aprovar, reprovar, pedir reenvio, alterar visibilidade, abrir o arquivo (URL temporária, acesso auditado)
- Histórico de movimentações, com controle do que o cliente enxerga
- Notificações internas
- Calendário mensal com eventos vinculados a clientes e processos
- Financeiro informativo, com resumo e registros por cliente
- Equipe: convite por e-mail, nível de acesso, ativação/desativação
- Configurações: tema, menu, catálogo de subprocessos
- Integrações: situação, liga/desliga e configuração não sensível de cada serviço externo

**Área do cliente**

- Visão geral com pendências em destaque e progresso do processo
- Processo, subprocessos e etapas liberadas pela equipe
- Envio de arquivos quando a equipe habilita
- Avisos e agenda
- Dados pessoais em modo leitura

**Transversal**

- Estados de carregando, vazio, erro, sucesso, desabilitado e confirmação em todas as telas
- Responsivo: sidebar recolhível no desktop, menu lateral e barra inferior no celular
- Acessibilidade: HTML semântico, navegação por teclado, foco visível, rótulos e `aria-*` ligados, contraste conferido nos dois temas
- Movimento discreto, respeitando `prefers-reduced-motion`
- Atualização em tempo real (Supabase Realtime) de filas, listas, painel, histórico, notificações e área do cliente
- Primeiro acesso por convite e recuperação de senha por e-mail (`/definir-senha`)
- Rotas carregadas sob demanda com `React.lazy`
- PWA instalável (pré-cache apenas do casco da aplicação)

## Back-end

Tudo o que o front exibe vem do Supabase. Resumo — detalhes em
[`docs/backend.md`](docs/backend.md):

- **Autorização no servidor:** RLS em todas as tabelas; o cliente só acessa o
  próprio recorte, por RPCs que omitem observações internas e financeiro
- **Regras no banco:** validações dos formulários viram constraints; fluxos de
  status são validados por gatilho, que também escreve o histórico e as notificações
- **Arquivos:** bucket privado, limite de tamanho e formato, URL assinada de 60 s
  e registro de cada abertura; antivírus (ClamAV) pronto e desligado por padrão
- **Auditoria** imutável de quem alterou o quê e quando
- **Integrações** isoladas em adapters, sem segredos no banco nem no código

## O que falta para entrar em operação

Detalhes e checklist em [`docs/integracoes.md`](docs/integracoes.md):

1. **Hospedagem do Supabase**: servidor, domínio, HTTPS, backup e monitoramento
2. **SMTP real** (hoje o Mailpit captura os e-mails em desenvolvimento)
3. **Antivírus** ligado em produção (serviço ClamAV + tela de integrações)
4. **Conformidade LGPD**: base legal, política de retenção, criptografia em repouso do volume de arquivos
5. **Dúvidas de negócio** em [`docs/duvidas-de-negocio.md`](docs/duvidas-de-negocio.md) —
   onde faltou definição, o sistema segue o comportamento atual da interface

---

## Privacidade na interface

O sistema trata documentos, laudos e dados sensíveis de saúde. Decisões tomadas:

- CPF, e-mail e telefone aparecem mascarados fora das telas de cadastro
- Documentos sensíveis só são exibidos após ação explícita do usuário
- Notificações e histórico descrevem documentos sensíveis de forma genérica
- Mensagens de erro nunca repetem conteúdo vindo do servidor sem revisão
- `localStorage` guarda apenas preferências visuais; a sessão do Supabase fica no `sessionStorage` e some ao fechar a aba
- Nenhum processo ou documento é armazenado para uso offline
