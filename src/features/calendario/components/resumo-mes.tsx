import { format, isBefore, isSameMonth, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarCheck2, CalendarClock, CalendarDays, Eye } from 'lucide-react'
import { Estatistica, GradeEstatisticas } from '@/components/graficos/estatistica'
import { formatarHora } from '@/lib/formato'
import type { EventoListado } from '@/services/contratos'

/**
 * Totais do mês exibido. Ficam acima do filtro de tipo e por isso não mudam
 * com ele — contam sempre todos os compromissos.
 */
export function ResumoDoMes({
  eventos,
  mes,
  carregando,
}: {
  eventos: EventoListado[]
  mes: Date
  carregando: boolean
}) {
  const doMes = eventos.filter(
    (evento) => evento.status !== 'cancelado' && isSameMonth(parseISO(evento.data), mes),
  )
  const prazos = doMes.filter((evento) => evento.tipo === 'prazo' || evento.tipo === 'protocolo').length
  const visiveis = doMes.filter((evento) => evento.visibilidade === 'cliente').length

  const hoje = startOfDay(new Date())
  const proximo = eventos
    .filter((evento) => evento.status === 'agendado' && !isBefore(parseISO(evento.data), hoje))
    .sort((a, b) => `${a.data}${a.hora ?? ''}`.localeCompare(`${b.data}${b.hora ?? ''}`))[0]

  return (
    <GradeEstatisticas>
      <Estatistica
        rotulo="Compromissos no mês"
        valor={doMes.length}
        icone={CalendarDays}
        carregando={carregando}
        descricao={format(mes, "MMMM 'de' yyyy", { locale: ptBR })}
      />
      <Estatistica
        rotulo="Prazos e protocolos"
        valor={prazos}
        icone={CalendarClock}
        tom={prazos > 0 ? 'alerta' : 'neutro'}
        carregando={carregando}
        descricao="Datas que não podem passar"
      />
      <Estatistica
        rotulo="Visíveis ao cliente"
        valor={visiveis}
        icone={Eye}
        tom="info"
        carregando={carregando}
        descricao="Aparecem na agenda da área do cliente"
      />
      <Estatistica
        rotulo="Próximo compromisso"
        valor={proximo ? format(parseISO(proximo.data), "d 'de' MMM", { locale: ptBR }) : '—'}
        icone={CalendarCheck2}
        tom="sucesso"
        carregando={carregando}
        descricao={
          proximo
            ? `${proximo.hora ? `${formatarHora(proximo.hora)} · ` : ''}${proximo.titulo}`
            : 'Nada agendado no período exibido'
        }
      />
    </GradeEstatisticas>
  )
}
