import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Guia lateral "como funciona": mostra onde o usuário está no fluxo e o que vem
 * depois. Fica fixo ao rolar em telas largas.
 */
export function GuiaEtapas({
  chapeu,
  titulo,
  etapas,
  atual = 0,
  nota,
  className,
}: {
  chapeu?: string
  titulo: string
  etapas: Array<{ titulo: string; descricao: string }>
  /** Índice da etapa em que a tela atual se encaixa. */
  atual?: number
  nota?: React.ReactNode
  className?: string
}) {
  const idTitulo = React.useId()

  return (
    <aside className={cn('xl:sticky xl:top-4', className)} aria-labelledby={idTitulo}>
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        {chapeu && <p className="alc-chapeu text-primary">{chapeu}</p>}
        <h2 id={idTitulo} className={cn('text-[0.98rem] font-bold tracking-[-0.02em]', chapeu && 'mt-2')}>
          {titulo}
        </h2>

        <ol className="mt-4 space-y-4">
          {etapas.map((etapa, indice) => (
            <li
              key={etapa.titulo}
              className="relative flex gap-3"
              aria-current={indice === atual ? 'step' : undefined}
            >
              {indice < etapas.length - 1 && (
                <span className="absolute -bottom-3 left-[13px] top-8 w-px bg-border" aria-hidden="true" />
              )}
              <span
                className={cn(
                  'relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  indice === atual && 'bg-primary text-primary-foreground',
                  indice < atual && 'bg-success text-success-foreground',
                  indice > atual && 'bg-muted text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {indice < atual ? <Check className="size-3.5" /> : indice + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold leading-snug">{etapa.titulo}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{etapa.descricao}</p>
              </div>
            </li>
          ))}
        </ol>

        {nota && (
          <div className="mt-4 border-t border-border pt-4 text-xs leading-snug text-muted-foreground">
            {nota}
          </div>
        )}
      </div>
    </aside>
  )
}
