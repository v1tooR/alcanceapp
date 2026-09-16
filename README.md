# Alcance Isenções — Web App

Front-end do sistema de gestão de clientes e atendimentos da **Alcance
Isenções**: painel administrativo para a equipe e área individual para cada
cliente.

> **Estado atual:** front-end completo e navegável sobre uma **base de dados
> fictícia em memória**. O projeto **não está em operação** — depende das
> integrações listadas em [`docs/integracoes.md`](docs/integracoes.md).

---

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

### Contas de demonstração

Senha para todas: `alcance2026`

| E-mail | Perfil |
|--------|--------|
| `helena@alcanceisencoes.com.br` | Administrador geral |
| `bruno@alcanceisencoes.com.br` | Gestor |
| `tatiane@alcanceisencoes.com.br` | Analista |

Para a **área do cliente**, use o e-mail de qualquer cliente com acesso liberado
— a lista aparece em *Clientes* no painel.

### Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Verificação de tipos + build de produção |
| `npm run preview` | Serve o build (necessário para testar o PWA) |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |

---

## Stack

Vite · React 19 · TypeScript (modo estrito) · Tailwind CSS v4 · shadcn/ui sobre
Radix UI · Lucide · React Router · React Hook Form + Zod · TanStack Query ·
Sonner · Recharts · date-fns · Motion · AutoAnimate · Zustand · vite-plugin-pwa ·
ESLint · Vitest.

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
│  ├─ mock/        # adaptador simulado (dados fictícios)
│  └─ http/        # adaptador REST (esqueleto de integração)
├─ stores/         # sessão e preferências (Zustand)
├─ styles/         # design system em variáveis CSS
└─ types/          # modelo de domínio
```

**Regra da camada de serviços:** nenhuma página importa `mock` ou `http`. Todas
dependem de `servicos`, que implementa os contratos. Trocar
`VITE_MODO_DADOS=api` liga o backend real sem alterar componentes.

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
- Documentos: solicitar, receber, colocar em análise, aprovar, reprovar, pedir reenvio, alterar visibilidade
- Histórico de movimentações, com controle do que o cliente enxerga
- Notificações internas
- Calendário mensal com eventos vinculados a clientes e processos
- Financeiro informativo, com resumo e registros por cliente
- Equipe e permissões básicas por papel
- Configurações: tema, menu, catálogo de subprocessos

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
- Rotas carregadas sob demanda com `React.lazy`
- PWA instalável (pré-cache apenas do casco da aplicação)

## O que ainda usa dados simulados

**Tudo.** A base fictícia (`src/services/mock/seed.ts`) é criada em memória a
cada carregamento e some ao recarregar a página. Ela cobre usuários, clientes,
processos, subprocessos, etapas, documentos, movimentações, notificações,
eventos e registros financeiros.

Os dados são inventados, em pt-BR, e **não contêm** senhas, laudos ou
informações pessoais reais. O bloco de perfil assistido traz apenas rótulos
genéricos.

Enquanto `VITE_MODO_DADOS=simulado`, um aviso fixo na interface deixa isso
explícito.

## O que falta para entrar em operação

Resumo — detalhes e checklist em [`docs/integracoes.md`](docs/integracoes.md):

1. **Autenticação** real, com sessão em cookie `httpOnly` e fluxo de convite
2. **API e banco de dados**, com autorização por papel aplicada **no servidor**
3. **Armazenamento de arquivos** com URL assinada, validação, antivírus e criptografia em repouso
4. **Conformidade LGPD**: base legal, política de retenção, registro de acesso a dados sensíveis
5. **Hospedagem**: domínio, HTTPS, cabeçalhos de segurança, backup e monitoramento

Além disso, as perguntas de regra de negócio em
[`docs/duvidas-de-negocio.md`](docs/duvidas-de-negocio.md) precisam ser
respondidas pela equipe. Nada ali foi presumido: onde faltou definição, a
interface trata o assunto como dado editável, nunca como automação.

> O projeto **não deve ser considerado concluído** enquanto essas integrações e
> os testes do sistema real estiverem pendentes.

---

## Privacidade na interface

O sistema trata documentos, laudos e dados sensíveis de saúde. Decisões tomadas:

- CPF, e-mail e telefone aparecem mascarados fora das telas de cadastro
- Documentos sensíveis só são exibidos após ação explícita do usuário
- Notificações e histórico descrevem documentos sensíveis de forma genérica
- Mensagens de erro nunca repetem conteúdo vindo do servidor sem revisão
- `localStorage` guarda apenas preferências visuais; a sessão fica em memória e é descartada ao sair
- Nenhum processo ou documento é armazenado para uso offline
