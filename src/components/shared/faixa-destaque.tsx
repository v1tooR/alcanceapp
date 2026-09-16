import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Medidor } from '@/components/graficos/marcas'
import type { Migalha } from '@/components/shared/page-header'
import { percentualDe } from '@/lib/graficos'
import { cn } from '@/lib/utils'

/**
 * Faixa institucional em gradiente — a abertura das telas mais importantes.
 *
 * Mesma linguagem do site: "chapéu" com traço laranja, título em peso 800 com
 * palavra destacada, números grandes e as órbitas que ecoam a logo. O texto
 * usa os tokens `on-brand`, iguais nos dois temas, porque o gradiente também é.
 */

/** Botão principal sobre o gradiente. */
export const classeBotaoMarca =
  'bg-on-brand text-brand-roxo shadow-sm hover:bg-on-brand/90 focus-visible:ring-on-brand focus-visible:ring-offset-brand-roxo'

/** Botão secundário sobre o gradiente. Usar com `variante="fantasma"`. */
export const classeBotaoMarcaContorno =
  'border border-on-brand-subtle text-on-brand hover:bg-on-brand-subtle focus-visible:ring-on-brand focus-visible:ring-offset-brand-roxo'

/** Palavra com o traço laranja pintado por baixo. */
export function Destaque({ children }: { children: React.ReactNode }) {
  return <span className="alc-destaque">{children}</span>
}

/** Selo translúcido para metadados sobre o gradiente. */
export function SeloMarca({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-on-brand-subtle bg-on-brand-subtle px-2.5 py-1 text-xs font-semibold text-on-brand [&_svg]:size-3.5">
      {children}
    </span>
  )
}

/** Número em destaque sobre o gradiente. */
export function MetricaMarca({
  valor,
  rotulo,
  principal,
}: {
  valor: React.ReactNode
  rotulo: string
  /** A métrica principal da tela é maior — uma por faixa. */
  principal?: boolean
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          'alc-numero',
          principal ? 'text-[3.25rem] sm:text-[3.75rem]' : 'text-[2rem] sm:text-[2.25rem]',
        )}
      >
        {valor}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-brand-muted">
        {rotulo}
      </p>
    </div>
  )
}

/** Medidor com rótulo e percentual, para o gradiente. */
export function MedidorMarca({
  rotulo,
  valor,
  maximo,
  legenda,
  className,
}: {
  rotulo: string
  valor: number
  maximo: number
  legenda?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('w-52 max-w-full pb-1', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-on-brand-muted">{rotulo}</span>
        <span className="text-sm font-bold">{maximo > 0 ? `${percentualDe(valor, maximo)}%` : '—'}</span>
      </div>
      <Medidor
        valor={valor}
        maximo={Math.max(maximo, 1)}
        rotulo={rotulo}
        tom="marca"
        className="mt-2"
      />
      {legenda && <p className="mt-1.5 text-[11px] text-on-brand-muted">{legenda}</p>}
    </div>
  )
}

export interface FaixaDestaqueProps {
  chapeu?: React.ReactNode
  titulo: React.ReactNode
  descricao?: React.ReactNode
  /** Selos logo abaixo do título (status, código, prioridade). */
  meta?: React.ReactNode
  metricas?: React.ReactNode
  acoes?: React.ReactNode
  migalhas?: Migalha[]
  voltarPara?: string
  voltarRotulo?: string
  tamanho?: 'grande' | 'medio'
  className?: string
}

export function FaixaDestaque({
  chapeu,
  titulo,
  descricao,
  meta,
  metricas,
  acoes,
  migalhas,
  voltarPara,
  voltarRotulo = 'Voltar',
  tamanho = 'grande',
  className,
}: FaixaDestaqueProps) {
  const idTitulo = React.useId()

  return (
    <section
      aria-labelledby={idTitulo}
      className={cn(
        'alc-gradient-deep relative isolate flex h-full flex-col overflow-hidden rounded-xl p-5 text-on-brand shadow-md sm:p-7',
        className,
      )}
    >
      {/* Decoração: textura de pontos e as órbitas que ecoam o traço da logo. */}
      <div
        className="alc-textura-pontos pointer-events-none absolute inset-0 -z-10 opacity-70"
        aria-hidden="true"
      />
      <svg
        className="pointer-events-none absolute -right-28 -top-32 -z-10 size-[28rem] text-on-brand-subtle"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="200" cy="200" r="112" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="170" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M52 262C118 346 312 330 362 160"
          stroke="var(--brand-laranja-claro)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>

      {migalhas && migalhas.length > 0 && (
        <nav aria-label="Trilha de navegação" className="mb-3 hidden sm:block">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-on-brand-muted">
            {migalhas.map((migalha, indice) => (
              <li key={`${migalha.rotulo}-${indice}`} className="flex items-center gap-1">
                {indice > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
                {migalha.para ? (
                  <Link
                    to={migalha.para}
                    className="rounded-xs hover:text-on-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-brand"
                  >
                    {migalha.rotulo}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-semibold text-on-brand">
                    {migalha.rotulo}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {voltarPara && (
        <Link
          to={voltarPara}
          className="mb-3 inline-flex items-center gap-1.5 self-start rounded-xs text-sm font-medium text-on-brand-muted hover:text-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-brand sm:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {voltarRotulo}
        </Link>
      )}

      {chapeu && <p className="alc-chapeu text-on-brand-muted">{chapeu}</p>}

      <h1
        id={idTitulo}
        className={cn(
          'alc-titulo-display',
          chapeu && 'mt-3',
          tamanho === 'grande' ? 'text-[2.1rem] sm:text-[2.75rem]' : 'text-[1.65rem] sm:text-[2.15rem]',
        )}
      >
        {titulo}
      </h1>

      {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}

      {descricao && (
        <div className="mt-2.5 max-w-xl text-sm leading-relaxed text-on-brand-muted sm:text-[0.95rem]">
          {descricao}
        </div>
      )}

      {(metricas || acoes) && (
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-5 pt-7">
          {metricas && <div className="flex flex-wrap items-end gap-x-8 gap-y-4">{metricas}</div>}
          {acoes && <div className="flex flex-wrap gap-2 sm:ml-auto">{acoes}</div>}
        </div>
      )}
    </section>
  )
}
