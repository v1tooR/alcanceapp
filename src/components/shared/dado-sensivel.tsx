import * as React from 'react'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Conteúdo com informação pessoal sensível (saúde/deficiência).
 *
 * Regra de interface: nada sensível aparece sem uma ação explícita do usuário.
 * Isso evita exposição em telas compartilhadas, apresentações e capturas.
 */
export function DadoSensivel({
  children,
  rotulo = 'Informação sensível',
  descricao = 'Contém dado pessoal de saúde. Exiba apenas quando necessário.',
  className,
}: {
  children: React.ReactNode
  rotulo?: string
  descricao?: string
  className?: string
}) {
  const [visivel, setVisivel] = React.useState(false)

  return (
    <div className={cn('rounded-md border border-primary/20 bg-primary-soft/40', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-primary-soft-foreground">
          <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {rotulo}
        </p>
        <Button
          variante="fantasma"
          tamanho="sm"
          onClick={() => setVisivel((atual) => !atual)}
          aria-expanded={visivel}
        >
          {visivel ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {visivel ? 'Ocultar' : 'Mostrar'}
        </Button>
      </div>

      {visivel ? (
        <div className="border-t border-primary/15 px-3 py-3">{children}</div>
      ) : (
        <p className="border-t border-primary/15 px-3 py-3 text-xs text-muted-foreground">
          {descricao}
        </p>
      )}
    </div>
  )
}

/** Versão em linha: desfoca o valor até o usuário pedir para ver. */
export function ValorSensivel({
  valor,
  rotuloAcessivel,
  className,
}: {
  valor: string
  rotuloAcessivel: string
  className?: string
}) {
  const [visivel, setVisivel] = React.useState(false)

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('tabular-nums transition-[filter]', !visivel && 'alc-blur-sensitive')}
        aria-hidden={!visivel}
      >
        {valor}
      </span>
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        className="rounded-xs p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
        aria-pressed={visivel}
      >
        {visivel ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        <span className="sr-only">
          {visivel ? `Ocultar ${rotuloAcessivel}` : `Mostrar ${rotuloAcessivel}`}
        </span>
      </button>
    </span>
  )
}
