import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Sparkline } from '@/components/graficos/marcas'
import { Skeleton } from '@/components/ui/skeleton'
import { comSinal, compactarNumero, variacao, type Direcao } from '@/lib/graficos'
import { cn } from '@/lib/utils'
import type { Comparativo } from '@/services/contratos'

export interface IndicadorPeriodoProps {
  rotulo: string
  comparativo?: Comparativo
  serie?: number[]
  /** Se subir é bom, ruim ou apenas informativo — define a cor da variação. */
  sentidoFavoravel: 'alta' | 'queda' | 'neutro'
  rotuloComparacao: string
  icone: React.ComponentType<{ className?: string }>
  para: string
}

const DESCRICAO_DIRECAO: Record<Direcao, string> = {
  alta: 'aumento de',
  queda: 'redução de',
  estavel: 'sem variação',
}

/**
 * Cartão de indicador: valor, variação contra o período anterior e tendência.
 * O número é o protagonista; a sparkline só dá o contexto.
 */
export function IndicadorPeriodo({
  rotulo,
  comparativo,
  serie,
  sentidoFavoravel,
  rotuloComparacao,
  icone: Icone,
  para,
}: IndicadorPeriodoProps) {
  const dados = comparativo ? variacao(comparativo) : null
  const favoravel =
    dados && sentidoFavoravel !== 'neutro' && dados.direcao !== 'estavel'
      ? dados.direcao === sentidoFavoravel
      : null
  const IconeVariacao =
    dados?.direcao === 'alta' ? ArrowUpRight : dados?.direcao === 'queda' ? ArrowDownRight : Minus

  return (
    <Link
      to={para}
      className={cn(
        'group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-muted-foreground">{rotulo}</p>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
          aria-hidden="true"
        >
          <Icone className="size-4" />
        </span>
      </div>

      {comparativo && dados ? (
        <>
          <p className="alc-numero mt-3 text-[2.1rem]">{compactarNumero(comparativo.atual)}</p>
          <p
            className={cn(
              'mt-1.5 flex flex-wrap items-center gap-x-1 text-xs font-semibold',
              favoravel === true && 'text-success',
              favoravel === false && 'text-danger',
              favoravel === null && 'text-muted-foreground',
            )}
          >
            <IconeVariacao className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">{DESCRICAO_DIRECAO[dados.direcao]}</span>
            {dados.direcao !== 'estavel' && (
              <span>
                {comSinal(dados.diferenca)}
                {dados.percentual !== null && ` (${comSinal(dados.percentual)}%)`}
              </span>
            )}
            <span className="font-normal text-muted-foreground">vs. {rotuloComparacao}</span>
          </p>
        </>
      ) : (
        <>
          <Skeleton className="mt-3 h-9 w-16" />
          <Skeleton className="mt-2 h-3 w-32" />
        </>
      )}

      <div className="mt-auto pt-3">
        {serie ? <Sparkline valores={serie} /> : <Skeleton className="h-10 w-full" />}
      </div>
    </Link>
  )
}
