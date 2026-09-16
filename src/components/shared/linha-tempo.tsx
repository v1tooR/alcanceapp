import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  FileUp,
  FileX2,
  Hash,
  MessageSquare,
  PlusCircle,
  StickyNote,
  UserCog,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatarDataHora, formatarTempoRelativo } from '@/lib/formato'
import { ROTULO_TIPO_MOVIMENTACAO } from '@/lib/rotulos'
import { cn } from '@/lib/utils'
import type { Movimentacao, TipoMovimentacao } from '@/types/domain'

const ICONE: Record<TipoMovimentacao, React.ComponentType<{ className?: string }>> = {
  processo_criado: PlusCircle,
  status_alterado: ArrowRightLeft,
  etapa_concluida: CheckCircle2,
  documento_solicitado: FilePlus2,
  documento_enviado: FileUp,
  documento_aprovado: FileCheck2,
  documento_reprovado: FileX2,
  protocolo_registrado: Hash,
  observacao: StickyNote,
  prazo_alterado: CalendarClock,
  responsavel_alterado: UserCog,
  mensagem_cliente: MessageSquare,
}

const TOM_ICONE: Partial<Record<TipoMovimentacao, string>> = {
  documento_aprovado: 'bg-success-soft text-success',
  etapa_concluida: 'bg-success-soft text-success',
  documento_reprovado: 'bg-danger-soft text-danger',
  documento_solicitado: 'bg-warning-soft text-warning',
  mensagem_cliente: 'bg-accent-soft text-accent',
}

export interface LinhaTempoProps {
  movimentacoes: Movimentacao[]
  /** Mapa id → nome do autor. */
  autores?: Record<string, string>
  /** Na área do cliente, o selo de visibilidade interna não é exibido. */
  mostrarVisibilidade?: boolean
  className?: string
}

export function LinhaTempo({
  movimentacoes,
  autores,
  mostrarVisibilidade = true,
  className,
}: LinhaTempoProps) {
  return (
    <ol className={cn('relative', className)}>
      {movimentacoes.map((movimentacao, indice) => {
        const Icone = ICONE[movimentacao.tipo]
        const ultimo = indice === movimentacoes.length - 1

        return (
          <li key={movimentacao.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Fio vertical ligando os eventos */}
            {!ultimo && (
              <span
                className="absolute left-4 top-9 bottom-0 w-px bg-border"
                aria-hidden="true"
              />
            )}

            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full',
                TOM_ICONE[movimentacao.tipo] ?? 'bg-muted text-muted-foreground',
              )}
              aria-hidden="true"
            >
              <Icone className="size-4" />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold leading-snug">{movimentacao.titulo}</p>
                {mostrarVisibilidade && !movimentacao.visivelCliente && (
                  <Badge tom="contorno" tamanho="sm">
                    Interno
                  </Badge>
                )}
              </div>

              {movimentacao.descricao && (
                <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
                  {movimentacao.descricao}
                </p>
              )}

              {movimentacao.de && movimentacao.para && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="line-through">{movimentacao.de}</span>
                  <ArrowRightLeft className="size-3" aria-hidden="true" />
                  <span className="font-semibold text-foreground">{movimentacao.para}</span>
                </p>
              )}

              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="sr-only">{ROTULO_TIPO_MOVIMENTACAO[movimentacao.tipo]} — </span>
                <time dateTime={movimentacao.criadoEm} title={formatarDataHora(movimentacao.criadoEm)}>
                  {formatarTempoRelativo(movimentacao.criadoEm)}
                </time>
                {movimentacao.autorId && autores?.[movimentacao.autorId] && (
                  <> · {autores[movimentacao.autorId]}</>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
