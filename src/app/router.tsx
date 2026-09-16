import * as React from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell, PortalShell } from '@/components/layout/app-shell'
import { RotaProtegida, RotaPublica } from '@/components/layout/rota-protegida'
import { CarregandoPagina } from '@/components/ui/estados'
import { rotaInicial } from '@/lib/permissoes'
import { usarSessao } from '@/stores/sessao'

/**
 * Rotas da aplicação.
 *
 * Todas as telas são carregadas sob demanda (`React.lazy`): o primeiro
 * carregamento traz apenas o casco e a tela de entrada.
 */

const Entrar = React.lazy(() => import('@/features/autenticacao/pages/entrar'))
const RecuperarSenha = React.lazy(() => import('@/features/autenticacao/pages/recuperar-senha'))
const NaoEncontrado = React.lazy(() => import('@/pages/nao-encontrado'))

const Painel = React.lazy(() => import('@/features/painel/pages/painel'))
const ListaClientes = React.lazy(() => import('@/features/clientes/pages/lista-clientes'))
const NovoCliente = React.lazy(() => import('@/features/clientes/pages/novo-cliente'))
const DetalheCliente = React.lazy(() => import('@/features/clientes/pages/detalhe-cliente'))
const ListaProcessos = React.lazy(() => import('@/features/processos/pages/lista-processos'))
const NovoProcesso = React.lazy(() => import('@/features/processos/pages/novo-processo'))
const DetalheProcesso = React.lazy(() => import('@/features/processos/pages/detalhe-processo'))
const Documentos = React.lazy(() => import('@/features/documentos/pages/documentos'))
const Calendario = React.lazy(() => import('@/features/calendario/pages/calendario'))
const Notificacoes = React.lazy(() => import('@/features/notificacoes/pages/notificacoes'))
const Financeiro = React.lazy(() => import('@/features/financeiro/pages/financeiro'))
const Equipe = React.lazy(() => import('@/features/equipe/pages/equipe'))
const Configuracoes = React.lazy(() => import('@/features/configuracoes/pages/configuracoes'))

const PortalInicio = React.lazy(() => import('@/features/portal/pages/inicio'))
const PortalProcessos = React.lazy(() => import('@/features/portal/pages/processos'))
const PortalDetalheProcesso = React.lazy(() => import('@/features/portal/pages/detalhe-processo'))
const PortalDocumentos = React.lazy(() => import('@/features/portal/pages/documentos'))
const PortalNotificacoes = React.lazy(() => import('@/features/portal/pages/notificacoes'))
const PortalAgenda = React.lazy(() => import('@/features/portal/pages/agenda'))
const PortalPerfil = React.lazy(() => import('@/features/portal/pages/perfil'))

/** Envolve telas públicas, que não contam com o `Suspense` do casco. */
function ComCarregamento({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<CarregandoPagina />}>{children}</React.Suspense>
}

/** Manda cada perfil para a sua área inicial. */
function Raiz() {
  const { usuario, inicializando } = usarSessao()
  if (inicializando) return <CarregandoPagina rotulo="Carregando" />
  return <Navigate to={usuario ? rotaInicial(usuario.papel) : '/entrar'} replace />
}

export const roteador = createBrowserRouter([
  { path: '/', element: <Raiz /> },

  {
    path: '/entrar',
    element: (
      <RotaPublica>
        <ComCarregamento>
          <Entrar />
        </ComCarregamento>
      </RotaPublica>
    ),
  },
  {
    path: '/recuperar-senha',
    element: (
      <RotaPublica>
        <ComCarregamento>
          <RecuperarSenha />
        </ComCarregamento>
      </RotaPublica>
    ),
  },

  {
    element: <RotaProtegida area="equipe" />,
    children: [
      {
        path: '/app',
        element: <AppShell />,
        children: [
          { index: true, element: <Painel /> },
          { path: 'clientes', element: <ListaClientes /> },
          { path: 'clientes/novo', element: <NovoCliente /> },
          { path: 'clientes/:clienteId', element: <DetalheCliente /> },
          { path: 'processos', element: <ListaProcessos /> },
          { path: 'processos/novo', element: <NovoProcesso /> },
          { path: 'processos/:processoId', element: <DetalheProcesso /> },
          { path: 'documentos', element: <Documentos /> },
          { path: 'calendario', element: <Calendario /> },
          { path: 'notificacoes', element: <Notificacoes /> },
          { path: 'financeiro', element: <Financeiro /> },
          { path: 'equipe', element: <Equipe /> },
          { path: 'configuracoes', element: <Configuracoes /> },
        ],
      },
    ],
  },

  {
    element: <RotaProtegida area="cliente" />,
    children: [
      {
        path: '/portal',
        element: <PortalShell />,
        children: [
          { index: true, element: <PortalInicio /> },
          { path: 'processos', element: <PortalProcessos /> },
          { path: 'processos/:processoId', element: <PortalDetalheProcesso /> },
          { path: 'documentos', element: <PortalDocumentos /> },
          { path: 'notificacoes', element: <PortalNotificacoes /> },
          { path: 'agenda', element: <PortalAgenda /> },
          { path: 'perfil', element: <PortalPerfil /> },
        ],
      },
    ],
  },

  {
    path: '*',
    element: (
      <ComCarregamento>
        <NaoEncontrado />
      </ComCarregamento>
    ),
  },
])
