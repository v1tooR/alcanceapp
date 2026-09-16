import * as React from 'react'
import { ArrowRight, CircleUser, Flag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Prazo } from '@/components/shared/prazo'
import { ROTULO_RESPONSAVEL_ACAO } from '@/lib/rotulos'
import { cn } from '@/lib/utils'
import type { ISODate, ResponsavelAcao } from '@/types/domain'

/**
 * Bloco "o que acontece agora".
 *
 * Aparece em processos, subprocessos e na área do cliente para responder sempre
 * às mesmas quatro perguntas: em que estado está, o que falta, de quem depende
 * e qual é o próximo passo.
 */
export function BlocoProximaAcao({
  estado,
  proximaAcao,
  responsavel,
  responsavelNome,
  prazo,
  className,
}: {
  estado: React.ReactNode
  proximaAcao?: string
  responsavel?: ResponsavelAcao
  responsavelNome?: string
  prazo?: ISODate | null
  className?: string
}) {
  const semAcao = !proximaAcao

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface-muted p-3.5',
        semAcao && 'border-dashed',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Situação
        </span>
        {estado}
      </div>

      <div className="mt-3 flex items-start gap-2.5">
        <span
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
          aria-hidden="true"
        >
          <ArrowRight className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Próxima ação
          </p>
          <p className={cn('text-sm leading-snug', semAcao ? 'text-muted-foreground' : 'font-medium')}>
            {proximaAcao ?? 'Nenhuma ação definida. Registre o próximo passo.'}
          </p>
        </div>
      </div>

      {(responsavel || prazo) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {responsavel && (
            <Badge tom={responsavel === 'cliente' ? 'destaque' : 'contorno'} tamanho="sm">
              <CircleUser aria-hidden="true" />
              {responsavelNome ?? ROTULO_RESPONSAVEL_ACAO[responsavel]}
            </Badge>
          )}
          {prazo && <Prazo data={prazo} />}
        </div>
      )}
    </div>
  )
}

/** Linha compacta de pendência, usada em listas do painel inicial. */
export function LinhaPendencia({
  titulo,
  descricao,
  prazo,
  gravidade,
  acao,
}: {
  titulo: string
  descricao: string
  prazo?: ISODate
  gravidade: 'baixa' | 'media' | 'alta'
  acao?: React.ReactNode
}) {
  const tom = gravidade === 'alta' ? 'perigo' : gravidade === 'media' ? 'alerta' : 'neutro'

  return (
    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <Badge tom={tom} tamanho="sm" className="mt-0.5 shrink-0">
        <Flag aria-hidden="true" />
        <span className="sr-only">Gravidade</span>
        {gravidade === 'alta' ? 'Alta' : gravidade === 'media' ? 'Média' : 'Baixa'}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{titulo}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-snug">{descricao}</p>
        {prazo && (
          <div className="mt-1.5">
            <Prazo data={prazo} />
          </div>
        )}
      </div>
      {acao && <div className="shrink-0 self-center">{acao}</div>}
    </div>
  )
}
