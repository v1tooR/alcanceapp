import { CalendarClock, CalendarOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { descreverPrazo, formatarData } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Tom } from '@/lib/rotulos'
import type { ISODate } from '@/types/domain'

const TOM_SITUACAO: Record<ReturnType<typeof descreverPrazo>['situacao'], Tom> = {
  sem_prazo: 'neutro',
  vencido: 'perigo',
  hoje: 'destaque',
  proximo: 'alerta',
  futuro: 'neutro',
}

/** Prazo com tom conforme a proximidade do vencimento. */
export function Prazo({
  data,
  className,
  mostrarIcone = true,
}: {
  data?: ISODate | null
  className?: string
  mostrarIcone?: boolean
}) {
  const { texto, situacao } = descreverPrazo(data)
  const Icone = situacao === 'sem_prazo' ? CalendarOff : CalendarClock

  return (
    <Badge tom={TOM_SITUACAO[situacao]} tamanho="sm" className={className}>
      {mostrarIcone && <Icone aria-hidden="true" />}
      <span>{texto}</span>
      {/* A data exata continua acessível para quem depende de leitor de tela */}
      {data && situacao !== 'futuro' && <span className="sr-only">— {formatarData(data)}</span>}
    </Badge>
  )
}

/** Versão em texto, para tabelas densas. */
export function PrazoTexto({ data, className }: { data?: ISODate | null; className?: string }) {
  const { situacao } = descreverPrazo(data)
  if (!data) return <span className="text-muted-foreground">—</span>

  return (
    <span
      className={cn(
        'text-sm tabular-nums',
        situacao === 'vencido' && 'font-semibold text-danger',
        situacao === 'hoje' && 'font-semibold text-accent',
        situacao === 'proximo' && 'font-medium text-warning',
        className,
      )}
    >
      {formatarData(data)}
    </span>
  )
}
