import * as React from 'react'
import { AlertTriangle, Inbox, Loader2, RotateCw, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/* -- Vazio ----------------------------------------------------------------- */

export interface EstadoVazioProps {
  icone?: React.ComponentType<{ className?: string }>
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  /** Compacto para uso dentro de cartões e abas. */
  compacto?: boolean
  className?: string
}

export function EstadoVazio({
  icone: Icone = Inbox,
  titulo,
  descricao,
  acao,
  compacto,
  className,
}: EstadoVazioProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compacto ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-primary-soft text-primary',
          compacto ? 'size-10' : 'size-14',
        )}
        aria-hidden="true"
      >
        <Icone className={compacto ? 'size-5' : 'size-7'} />
      </span>
      <div className="max-w-sm">
        <p className={cn('font-bold', compacto ? 'text-sm' : 'text-base')}>{titulo}</p>
        {descricao && (
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{descricao}</p>
        )}
      </div>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  )
}

/** Variação para "a busca não encontrou nada" — difere de "ainda não há nada". */
export function EstadoSemResultado({
  termo,
  aoLimpar,
  className,
}: {
  termo?: string
  aoLimpar?: () => void
  className?: string
}) {
  return (
    <EstadoVazio
      icone={SearchX}
      titulo="Nenhum resultado encontrado"
      descricao={
        termo
          ? `Não encontramos registros para “${termo}”. Revise os termos ou limpe os filtros.`
          : 'Nenhum registro corresponde aos filtros aplicados.'
      }
      acao={
        aoLimpar && (
          <Button variante="contorno" tamanho="sm" onClick={aoLimpar}>
            Limpar filtros
          </Button>
        )
      }
      className={className}
    />
  )
}

/* -- Erro ------------------------------------------------------------------ */

export function EstadoErro({
  titulo = 'Não foi possível carregar',
  descricao = 'Houve uma falha na comunicação. Tente novamente em instantes.',
  aoTentarNovamente,
  className,
}: {
  titulo?: string
  descricao?: string
  aoTentarNovamente?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}
    >
      <span
        className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger"
        aria-hidden="true"
      >
        <AlertTriangle className="size-7" />
      </span>
      <div className="max-w-sm">
        <p className="text-base font-bold">{titulo}</p>
        <p className="mt-1 text-sm text-muted-foreground leading-snug">{descricao}</p>
      </div>
      {aoTentarNovamente && (
        <Button variante="contorno" tamanho="sm" onClick={aoTentarNovamente}>
          <RotateCw aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

/* -- Carregando ------------------------------------------------------------ */

export function EstadoCarregando({
  rotulo = 'Carregando',
  className,
}: {
  rotulo?: string
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2.5 px-6 py-14 text-muted-foreground', className)}
      role="status"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span className="text-sm font-medium">{rotulo}…</span>
    </div>
  )
}

/** Tela cheia — usada no `Suspense` de rotas carregadas sob demanda. */
export function CarregandoPagina({ rotulo = 'Carregando página' }: { rotulo?: string }) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm font-medium">{rotulo}…</span>
      </div>
    </div>
  )
}
