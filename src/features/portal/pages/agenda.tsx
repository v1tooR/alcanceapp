import { useQuery } from '@tanstack/react-query'
import { addMonths, formatISO, startOfMonth, subMonths } from 'date-fns'
import { CalendarDays, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { Badge } from '@/components/ui/badge'
import { Card, CardBarra } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { formatarDataExtensa, formatarHora, formatarMesAno } from '@/lib/formato'
import { ROTULO_TIPO_EVENTO, TOM_TIPO_EVENTO } from '@/lib/rotulos'
import { agruparPor, capitalizarPrimeira } from '@/lib/utils'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'

export default function PortalAgenda() {
  const clienteId = usarSessao((estado) => estado.usuario?.clienteId) ?? ''

  // Janela de três meses ao redor de hoje: o cliente vê o que passou recentemente
  // e o que está por vir, sem precisar navegar por mês.
  const de = formatISO(startOfMonth(subMonths(new Date(), 1)), { representation: 'date' })
  const ate = formatISO(startOfMonth(addMonths(new Date(), 3)), { representation: 'date' })

  const consulta = useQuery({
    queryKey: chaves.calendario.lista({ de, ate, clienteId, apenasVisiveisAoCliente: true }),
    queryFn: () =>
      servicos.calendario.listar({ de, ate, clienteId, apenasVisiveisAoCliente: true }),
    enabled: Boolean(clienteId),
  })

  const eventos = consulta.data ?? []
  const porMes = agruparPor(eventos, (evento) => formatarMesAno(evento.data))

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Compromissos"
        titulo="Agenda"
        descricao="Compromissos e prazos que a equipe liberou para você acompanhar."
      />

      {consulta.isLoading ? (
        <Card>
          <EstadoCarregando rotulo="Carregando agenda" />
        </Card>
      ) : consulta.isError ? (
        <Card>
          <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
        </Card>
      ) : eventos.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={CalendarDays}
            titulo="Nenhum compromisso agendado"
            descricao="Quando houver uma reunião, perícia ou prazo relevante, ele aparece aqui."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(porMes).map(([mes, lista]) => (
            <Card key={mes} className="overflow-hidden">
              <CardBarra titulo={capitalizarPrimeira(mes)} />
              <ul className="divide-y divide-border">
                {lista.map((evento) => (
                  <li key={evento.id} className="flex gap-3 px-4 py-3.5">
                    <div
                      className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-primary-soft py-1.5 text-primary-soft-foreground"
                      aria-hidden="true"
                    >
                      <span className="text-lg font-bold leading-none tabular-nums">
                        {evento.data.slice(-2)}
                      </span>
                      {evento.hora && (
                        <span className="mt-0.5 text-[10px] font-semibold tabular-nums">
                          {formatarHora(evento.hora)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold leading-snug">{evento.titulo}</p>
                        <Badge tom={TOM_TIPO_EVENTO[evento.tipo]} tamanho="sm">
                          {ROTULO_TIPO_EVENTO[evento.tipo]}
                        </Badge>
                      </div>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="sr-only">Data: </span>
                        {formatarDataExtensa(evento.data)}
                        {evento.hora && <> às {formatarHora(evento.hora)}</>}
                      </p>

                      {evento.descricao && (
                        <p className="mt-1 text-sm text-muted-foreground leading-snug">
                          {evento.descricao}
                        </p>
                      )}

                      {evento.local && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" aria-hidden="true" />
                          {evento.local}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </EntradaPagina>
  )
}
