import * as React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface CartaoIndicadorProps {
  rotulo: string
  valor: React.ReactNode
  icone: React.ComponentType<{ className?: string }>
  descricao?: string
  tom?: 'neutro' | 'primario' | 'alerta' | 'perigo' | 'sucesso'
  /** Transforma o cartão em atalho para a listagem filtrada correspondente. */
  para?: string
  carregando?: boolean
}

const TOM_ICONE = {
  neutro: 'bg-muted text-muted-foreground',
  primario: 'bg-primary-soft text-primary',
  alerta: 'bg-warning-soft text-warning',
  perigo: 'bg-danger-soft text-danger',
  sucesso: 'bg-success-soft text-success',
} as const

export function CartaoIndicador({
  rotulo,
  valor,
  icone: Icone,
  descricao,
  tom = 'neutro',
  para,
  carregando,
}: CartaoIndicadorProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </p>
        <span
          className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', TOM_ICONE[tom])}
          aria-hidden="true"
        >
          <Icone className="size-4" />
        </span>
      </div>
      {carregando ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="alc-numero mt-2 text-[1.75rem]">{valor}</p>
      )}
      {descricao && (
        <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{descricao}</p>
      )}
    </>
  )

  const classeBase = 'rounded-lg border border-border bg-card p-4 shadow-xs'

  if (para && !carregando) {
    return (
      <Link
        to={para}
        className={cn(
          classeBase,
          'block transition-colors hover:border-border-strong hover:bg-surface-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {conteudo}
      </Link>
    )
  }

  return <div className={classeBase}>{conteudo}</div>
}

/** Grade responsiva padrão dos indicadores. */
export function GradeIndicadores({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
}
