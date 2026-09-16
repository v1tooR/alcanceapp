import { subDays } from 'date-fns'
import { AlarmClock, Bell, FileText, History } from 'lucide-react'
import { Estatistica, GradeEstatisticas } from '@/components/graficos/estatistica'
import type { Notificacao } from '@/types/domain'

/** Contagens rápidas dos avisos — usadas na área da equipe e na do cliente. */
export function ResumoAvisos({
  notificacoes,
  carregando,
}: {
  notificacoes: Notificacao[]
  carregando: boolean
}) {
  const naoLidas = notificacoes.filter((item) => !item.lida).length
  const documentos = notificacoes.filter((item) => item.tipo === 'documento').length
  const alertas = notificacoes.filter(
    (item) => !item.lida && (item.tipo === 'prazo' || item.tipo === 'alerta' || item.tipo === 'erro'),
  ).length
  const limite = subDays(new Date(), 7).toISOString()
  const recentes = notificacoes.filter((item) => item.criadoEm >= limite).length

  return (
    <GradeEstatisticas>
      <Estatistica
        rotulo="Não lidas"
        valor={naoLidas}
        icone={Bell}
        carregando={carregando}
        descricao={naoLidas === 0 ? 'Tudo em dia' : 'Esperando sua leitura'}
      />
      <Estatistica
        rotulo="Sobre documentos"
        valor={documentos}
        icone={FileText}
        tom="info"
        carregando={carregando}
        descricao="Pedidos, envios e pareceres"
      />
      <Estatistica
        rotulo="Alertas não lidos"
        valor={alertas}
        icone={AlarmClock}
        tom={alertas > 0 ? 'alerta' : 'sucesso'}
        carregando={carregando}
        descricao="Prazos e pedidos de atenção"
      />
      <Estatistica
        rotulo="Últimos 7 dias"
        valor={recentes}
        icone={History}
        tom="neutro"
        carregando={carregando}
        descricao="Avisos recebidos na semana"
      />
    </GradeEstatisticas>
  )
}
