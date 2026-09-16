import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { NAVEGACAO_CLIENTE, NAVEGACAO_EQUIPE, type ItemNavegacao } from '@/components/layout/navegacao'
import { CarregandoPagina } from '@/components/ui/estados'
import { AvisoDadosSimulados } from '@/components/layout/aviso-dados-simulados'
import { cn } from '@/lib/utils'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarPreferencias } from '@/stores/preferencias'
import { usarSessao } from '@/stores/sessao'

/** Encontra o título da tela atual a partir da navegação. */
function tituloDaRota(itens: ItemNavegacao[], caminho: string): string {
  const correspondentes = itens
    .filter((item) => (item.exata ? caminho === item.para : caminho.startsWith(item.para)))
    .sort((a, b) => b.para.length - a.para.length)
  return correspondentes[0]?.rotulo ?? 'Alcance Isenções'
}

function Casca({ itens }: { itens: ItemNavegacao[] }) {
  const local = useLocation()
  const usuario = usarSessao((estado) => estado.usuario)
  const recolhida = usarPreferencias((estado) => estado.sidebarRecolhida)

  const { data: naoLidas = 0 } = useQuery({
    queryKey: chaves.notificacoes.naoLidas(usuario?.id ?? ''),
    queryFn: () => servicos.notificacoes.contarNaoLidas(usuario!.id),
    enabled: Boolean(usuario),
    refetchInterval: 60_000,
  })

  const principalRef = React.useRef<HTMLElement>(null)

  // Cada mudança de rota reposiciona a rolagem e devolve o foco ao conteúdo,
  // para quem navega por teclado ou leitor de tela.
  React.useEffect(() => {
    principalRef.current?.scrollTo({ top: 0 })
  }, [local.pathname])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      <aside
        className={cn(
          'hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 lg:block',
          recolhida ? 'w-18' : 'w-67',
        )}
      >
        <Sidebar itens={itens} naoLidas={naoLidas} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header itens={itens} titulo={tituloDaRota(itens, local.pathname)} />

        <main
          id="conteudo"
          ref={principalRef}
          tabIndex={-1}
          // `relative`: elementos absolutos (sr-only, dicas dos gráficos) ficam presos
          // à área rolável — sem isso, esticam a página e criam uma segunda rolagem.
          className="relative flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--bottom-nav-height)+1rem)] focus:outline-none lg:pb-6"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
            <AvisoDadosSimulados />
            <React.Suspense fallback={<CarregandoPagina />}>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>

      <BottomNav itens={itens} naoLidas={naoLidas} />
    </div>
  )
}

/** Área da equipe. */
export function AppShell() {
  return <Casca itens={NAVEGACAO_EQUIPE} />
}

/** Área do cliente. */
export function PortalShell() {
  return <Casca itens={NAVEGACAO_CLIENTE} />
}
