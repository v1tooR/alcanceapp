import * as React from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Cartão de estatística: quando o dado é um número, o número é o gráfico.
 *
 * Cores de status (perigo, alerta, sucesso) só quando o número *significa*
 * risco ou resultado — e sempre acompanhadas de ícone e rótulo.
 */

const TOM_ICONE = {
  primario: 'bg-primary-soft text-primary',
  perigo: 'bg-danger-soft text-danger',
  alerta: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  sucesso: 'bg-success-soft text-success',
  neutro: 'bg-muted text-muted-foreground',
} as const

export type TomEstatistica = keyof typeof TOM_ICONE

export interface EstatisticaProps {
  rotulo: string
  valor: React.ReactNode
  icone?: React.ComponentType<{ className?: string }>
  tom?: TomEstatistica
  descricao?: React.ReactNode
  /** Transforma o cartão em atalho para a listagem correspondente. */
  para?: string
  carregando?: boolean
  /** Conteúdo ao pé do cartão: medidor, sparkline ou barra. */
  children?: React.ReactNode
  className?: string
}

export function Estatistica({
  rotulo,
  valor,
  icone: Icone,
  tom = 'primario',
  descricao,
  para,
  carregando,
  children,
  className,
}: EstatisticaProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-muted-foreground">{rotulo}</p>
        {Icone && (
          <span
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', TOM_ICONE[tom])}
            aria-hidden="true"
          >
            <Icone className="size-4" />
          </span>
        )}
      </div>

      {carregando ? (
        <>
          <Skeleton className="mt-3 h-9 w-20" />
          <Skeleton className="mt-2 h-3 w-28" />
        </>
      ) : (
        <>
          <p className="alc-numero mt-3 text-[2rem]">{valor}</p>
          {descricao && (
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{descricao}</p>
          )}
        </>
      )}

      {children && !carregando && <div className="mt-auto pt-3">{children}</div>}
    </>
  )

  const classeBase = cn(
    'flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5',
    className,
  )

  if (para && !carregando) {
    return (
      <Link
        to={para}
        className={cn(
          classeBase,
          'group transition-[transform,box-shadow,border-color] duration-200 ease-out',
          'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {conteudo}
      </Link>
    )
  }

  return <div className={classeBase}>{conteudo}</div>
}

/** Grade padrão de estatísticas no topo das listagens. */
export function GradeEstatisticas({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {children}
    </div>
  )
}
