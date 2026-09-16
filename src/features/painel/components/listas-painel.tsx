import { Link } from 'react-router-dom'
import { CalendarDays, History, ListChecks, MapPin } from 'lucide-react'
import { LinhaPendencia } from '@/components/shared/proxima-acao'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { Skeleton } from '@/components/ui/skeleton'
import { formatarHora, formatarTempoRelativo } from '@/lib/formato'
import { ROTULO_TIPO_EVENTO, TOM_TIPO_EVENTO } from '@/lib/rotulos'
import { cn } from '@/lib/utils'
import type { EventoListado } from '@/services/contratos'
import type { Movimentacao, PendenciaPainel } from '@/types/domain'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function Moldura({
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn('flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-bold leading-tight tracking-[-0.02em]">{titulo}</h3>
          {descricao && <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>}
        </div>
        {acao}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  )
}

function LinhasCarregando({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      {Array.from({ length: quantidade }).map((_, indice) => (
        <div key={indice} className="flex gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* -- Pendências prioritárias ---------------------------------------------------- */

export function CartaoPendencias({
  pendencias,
  carregando,
  erro,
  aoTentarNovamente,
  className,
}: {
  pendencias?: PendenciaPainel[]
  carregando: boolean
  erro: boolean
  aoTentarNovamente: () => void
  className?: string
}) {
  return (
    <Moldura
      titulo="Fila prioritária"
      descricao="Ordenada pelo que é mais crítico agora."
      className={className}
      acao={
        <Button variante="fantasma" tamanho="sm" asChild className="-mr-2">
          <Link to="/app/processos?pendencia=1">Ver todos</Link>
        </Button>
      }
    >
      {carregando ? (
        <LinhasCarregando />
      ) : erro ? (
        <EstadoErro aoTentarNovamente={aoTentarNovamente} className="py-8" />
      ) : !pendencias || pendencias.length === 0 ? (
        <EstadoVazio
          icone={ListChecks}
          titulo="Nada pendente por aqui"
          descricao="Nenhum documento parado e nenhum prazo estourado."
          compacto
        />
      ) : (
        <ul className="divide-y divide-border">
          {pendencias.map((pendencia) => (
            <li key={pendencia.id}>
              <LinhaPendencia
                titulo={pendencia.titulo}
                descricao={pendencia.descricao}
                prazo={pendencia.prazo}
                gravidade={pendencia.gravidade}
                acao={
                  <Button variante="contorno" tamanho="sm" asChild>
                    <Link to={pendencia.link}>Abrir</Link>
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Moldura>
  )
}

/* -- Atividade recente --------------------------------------------------------- */

export function CartaoAtividade({
  movimentacoes,
  carregando,
  className,
}: {
  movimentacoes?: Array<Movimentacao & { clienteNome: string; processoCodigo: string }>
  carregando: boolean
  className?: string
}) {
  return (
    <Moldura titulo="Atividade recente" descricao="Últimos registros da operação." className={className}>
      {carregando ? (
        <LinhasCarregando />
      ) : !movimentacoes || movimentacoes.length === 0 ? (
        <EstadoVazio icone={History} titulo="Sem movimentações" compacto />
      ) : (
        <ol className="relative px-4 py-4 sm:px-5">
          {movimentacoes.map((movimentacao, indice) => (
            <li key={movimentacao.id} className="relative flex gap-3 pb-4 last:pb-0">
              {indice < movimentacoes.length - 1 && (
                <span className="absolute left-[5px] top-4 bottom-0 w-px bg-border" aria-hidden="true" />
              )}
              <span
                className={cn(
                  'relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-card',
                  movimentacao.visivelCliente ? 'bg-primary' : 'bg-chart-muted',
                )}
                aria-hidden="true"
              />
              <Link
                to={`/app/processos/${movimentacao.processoId}`}
                className="min-w-0 flex-1 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block truncate text-sm font-semibold">{movimentacao.titulo}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {movimentacao.processoCodigo} · {movimentacao.clienteNome} ·{' '}
                  {formatarTempoRelativo(movimentacao.criadoEm)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Moldura>
  )
}

/* -- Próximos compromissos ------------------------------------------------------ */

export function CartaoCompromissos({
  eventos,
  carregando,
  className,
}: {
  eventos?: EventoListado[]
  carregando: boolean
  className?: string
}) {
  return (
    <Moldura
      titulo="Próximos compromissos"
      descricao="Nos próximos 14 dias."
      className={className}
      acao={
        <Button variante="fantasma" tamanho="sm" asChild className="-mr-2">
          <Link to="/app/calendario">Calendário</Link>
        </Button>
      }
    >
      {carregando ? (
        <LinhasCarregando quantidade={3} />
      ) : !eventos || eventos.length === 0 ? (
        <EstadoVazio
          icone={CalendarDays}
          titulo="Agenda livre"
          descricao="Nenhum compromisso nos próximos 14 dias."
          compacto
        />
      ) : (
        <ul className="divide-y divide-border">
          {eventos.map((evento) => {
            const data = parseISO(evento.data)
            return (
              <li key={evento.id} className="flex gap-3 px-4 py-3 sm:px-5">
                <span
                  className="flex w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary-soft py-1.5 text-primary-soft-foreground"
                  aria-hidden="true"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {format(data, 'MMM', { locale: ptBR }).replace('.', '')}
                  </span>
                  <span className="alc-numero text-lg">{format(data, 'd')}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{evento.titulo}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className="sr-only">{format(data, "d 'de' MMMM", { locale: ptBR })}, </span>
                    {evento.hora ? formatarHora(evento.hora) : 'Dia todo'}
                    {evento.clienteNome && <> · {evento.clienteNome}</>}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tom={TOM_TIPO_EVENTO[evento.tipo]} tamanho="sm">
                      {ROTULO_TIPO_EVENTO[evento.tipo]}
                    </Badge>
                    {evento.local && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="size-3" aria-hidden="true" />
                        {evento.local}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Moldura>
  )
}
