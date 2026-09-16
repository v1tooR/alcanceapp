import { NavLink } from 'react-router-dom'
import { temPermissao } from '@/lib/permissoes'
import { cn } from '@/lib/utils'
import { usarSessao } from '@/stores/sessao'
import type { ItemNavegacao } from './navegacao'

/**
 * Barra inferior do celular. Mantém as ações principais ao alcance do polegar,
 * com alvos de toque de pelo menos 44 px.
 */
export function BottomNav({ itens, naoLidas = 0 }: { itens: ItemNavegacao[]; naoLidas?: number }) {
  const papel = usarSessao((estado) => estado.usuario?.papel)

  const visiveis = itens
    .filter((item) => item.noRodapeMovel)
    .filter((item) => !item.permissao || temPermissao(papel, item.permissao))
    .slice(0, 5)

  if (visiveis.length === 0) return null

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex items-stretch">
        {visiveis.map((item) => {
          const Icone = item.icone
          const contador = item.contadorNotificacoes ? naoLidas : 0

          return (
            <li key={item.para} className="flex-1">
              <NavLink
                to={item.para}
                end={item.exata}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icone className="size-5" aria-hidden="true" />
                      {contador > 0 && (
                        <span className="absolute -right-1.5 -top-1 rounded-pill bg-accent px-1 py-px text-[9px] font-bold leading-none text-accent-foreground">
                          {contador > 9 ? '9+' : contador}
                          <span className="sr-only"> não lidas</span>
                        </span>
                      )}
                    </span>
                    <span className="truncate">{item.rotuloCurto ?? item.rotulo}</span>
                    {isActive && (
                      <span
                        className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-primary"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
