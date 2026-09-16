import * as React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Migalha {
  rotulo: string
  para?: string
}

export interface PageHeaderProps {
  titulo: string
  /** Rótulo curto acima do título, com traço laranja — o "chapéu" do site. */
  chapeu?: string
  descricao?: React.ReactNode
  acoes?: React.ReactNode
  migalhas?: Migalha[]
  /** Link de retorno mostrado no celular, onde não há trilha de navegação. */
  voltarPara?: string
  voltarRotulo?: string
  /** Conteúdo extra abaixo do título (selos de status, metadados). */
  meta?: React.ReactNode
  className?: string
}

export function PageHeader({
  titulo,
  chapeu,
  descricao,
  acoes,
  migalhas,
  voltarPara,
  voltarRotulo = 'Voltar',
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-5', className)}>
      {migalhas && migalhas.length > 0 && (
        <nav aria-label="Trilha de navegação" className="mb-2 hidden sm:block">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {migalhas.map((migalha, i) => (
              <li key={`${migalha.rotulo}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
                {migalha.para ? (
                  <Link
                    to={migalha.para}
                    className="rounded-xs hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {migalha.rotulo}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-medium text-foreground">
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
          className="mb-2 inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {voltarRotulo}
        </Link>
      )}

      {/* No celular, título e ações empilham: o título nunca fica espremido. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          {chapeu && <p className="alc-chapeu mb-2.5 text-primary">{chapeu}</p>}
          <h1 className="text-[1.4rem] font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-[1.75rem]">
            {titulo}
          </h1>
          {descricao && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-snug">{descricao}</p>
          )}
          {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </header>
  )
}
