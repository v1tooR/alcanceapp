import { NavLink } from 'react-router-dom'
import { ChevronLeft, PanelLeft } from 'lucide-react'
import { MarcaCompacta, SimboloAlcance } from '@/components/shared/logo'
import { Dica } from '@/components/ui/tooltip'
import { temPermissao } from '@/lib/permissoes'
import { cn } from '@/lib/utils'
import { usarPreferencias } from '@/stores/preferencias'
import { usarSessao } from '@/stores/sessao'
import { ROTULO_GRUPO, type ItemNavegacao } from './navegacao'

export interface SidebarProps {
  itens: ItemNavegacao[]
  naoLidas?: number
  /** Dentro do painel lateral do celular o recolhimento não se aplica. */
  modoMovel?: boolean
  aoNavegar?: () => void
}

export function Sidebar({ itens, naoLidas = 0, modoMovel, aoNavegar }: SidebarProps) {
  const papel = usarSessao((estado) => estado.usuario?.papel)
  const recolhida = usarPreferencias((estado) => estado.sidebarRecolhida) && !modoMovel
  const alternar = usarPreferencias((estado) => estado.alternarSidebar)

  const visiveis = itens.filter((item) => !item.permissao || temPermissao(papel, item.permissao))

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Marca */}
      <div
        className={cn(
          'flex h-15 shrink-0 items-center border-b border-sidebar-border',
          recolhida ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {recolhida ? (
          <span className="flex size-9 items-center justify-center rounded-md bg-surface p-1.5">
            <SimboloAlcance />
          </span>
        ) : (
          <MarcaCompacta />
        )}

        {!modoMovel && !recolhida && (
          <button
            type="button"
            onClick={alternar}
            className="rounded-sm p-1.5 text-sidebar-muted-foreground transition-colors hover:bg-sidebar-item-hover hover:text-sidebar-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:outline-none"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="sr-only">Recolher menu</span>
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="space-y-0.5">
          {visiveis.map((item, indice) => {
            const anterior = visiveis[indice - 1]
            const novoGrupo = indice > 0 && anterior.grupo !== item.grupo
            const Icone = item.icone
            const contador = item.contadorNotificacoes ? naoLidas : 0

            const link = (
              <NavLink
                to={item.para}
                end={item.exata}
                onClick={aoNavegar}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md py-2.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent',
                    recolhida ? 'justify-center px-2' : 'px-3',
                    isActive
                      ? 'bg-sidebar-item-active text-sidebar-foreground font-semibold'
                      : 'text-sidebar-muted-foreground hover:bg-sidebar-item-hover hover:text-sidebar-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Marcador do item ativo */}
                    <span
                      className={cn(
                        'absolute left-0 h-6 w-0.5 rounded-r-full bg-sidebar-accent transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    <Icone
                      className={cn(
                        'size-4.5 shrink-0 transition-colors',
                        isActive ? 'text-sidebar-accent' : 'text-current',
                      )}
                      aria-hidden="true"
                    />
                    {!recolhida && <span className="flex-1 truncate">{item.rotulo}</span>}
                    {contador > 0 && (
                      <span
                        className={cn(
                          'rounded-pill bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent-foreground',
                          recolhida && 'absolute right-1 top-1',
                        )}
                      >
                        {contador > 9 ? '9+' : contador}
                        <span className="sr-only"> não lidas</span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )

            return (
              <li key={item.para} className="relative">
                {novoGrupo && (
                  <>
                    <hr className="my-2 border-sidebar-border" />
                    {!recolhida && (
                      <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-muted-foreground/70">
                        {ROTULO_GRUPO[item.grupo]}
                      </p>
                    )}
                  </>
                )}
                {recolhida ? <Dica texto={item.rotulo} lado="right">{link}</Dica> : link}
              </li>
            )
          })}
        </ul>
      </nav>

      {recolhida && (
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={alternar}
            className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-muted-foreground transition-colors hover:bg-sidebar-item-hover hover:text-sidebar-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:outline-none"
          >
            <PanelLeft className="size-4" aria-hidden="true" />
            <span className="sr-only">Expandir menu</span>
          </button>
        </div>
      )}
    </div>
  )
}
