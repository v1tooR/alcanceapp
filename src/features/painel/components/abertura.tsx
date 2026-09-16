import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  PauseCircle,
  Plus,
  UserPlus,
} from 'lucide-react'
import {
  Destaque,
  FaixaDestaque,
  MedidorMarca,
  MetricaMarca,
  classeBotaoMarca,
  classeBotaoMarcaContorno,
} from '@/components/shared/faixa-destaque'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { primeiroNome } from '@/lib/privacidade'
import { capitalizarPrimeira, cn } from '@/lib/utils'
import type { PainelAnalitico } from '@/services/contratos'
import type { ResumoPainel } from '@/types/domain'

/* -- Faixa de abertura ------------------------------------------------------ */

function fraseDoDia(resumo: ResumoPainel): string {
  const partes: string[] = []
  if (resumo.prazosVencidos > 0) {
    partes.push(
      `${resumo.prazosVencidos} ${resumo.prazosVencidos === 1 ? 'prazo vencido' : 'prazos vencidos'}`,
    )
  }
  if (resumo.documentosAguardandoAnalise > 0) {
    partes.push(
      `${resumo.documentosAguardandoAnalise} ${
        resumo.documentosAguardandoAnalise === 1 ? 'documento esperando' : 'documentos esperando'
      } análise`,
    )
  }
  if (partes.length === 0) return 'Nenhum prazo vencido e nenhum documento parado. A operação está em dia.'
  return `Hoje há ${partes.join(' e ')}. Comece por eles.`
}

export function Abertura({
  nome,
  resumo,
  prazos,
}: {
  nome: string
  resumo?: ResumoPainel
  prazos?: PainelAnalitico['prazos']
}) {
  const comPrazo = prazos ? prazos.vencidos + prazos.proximos7Dias + prazos.emDia : 0
  const noPrazo = prazos ? prazos.proximos7Dias + prazos.emDia : 0
  const hoje = capitalizarPrimeira(format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }))

  return (
    <FaixaDestaque
      chapeu={hoje}
      titulo={
        <>
          Olá, <Destaque>{primeiroNome(nome)}</Destaque>
        </>
      }
      descricao={
        resumo ? fraseDoDia(resumo) : <Skeleton className="mt-1 h-4 w-72 max-w-full opacity-30" />
      }
      metricas={
        <>
          <MetricaMarca valor={resumo?.processosAtivos ?? '—'} rotulo="Processos ativos" principal />
          <MedidorMarca
            rotulo="Prazos sob controle"
            valor={noPrazo}
            maximo={comPrazo}
            legenda={prazos ? `${noPrazo} de ${comPrazo} subprocessos com prazo` : 'Calculando…'}
          />
        </>
      }
      acoes={
        <>
          <Button asChild className={classeBotaoMarca}>
            <Link to="/app/processos/novo">
              <Plus aria-hidden="true" />
              Novo processo
            </Link>
          </Button>
          <Button asChild variante="fantasma" className={classeBotaoMarcaContorno}>
            <Link to="/app/clientes/novo">
              <UserPlus aria-hidden="true" />
              Novo cliente
            </Link>
          </Button>
        </>
      }
    />
  )
}

/* -- Precisa de atenção agora ------------------------------------------------ */

const TOM_STATUS = {
  perigo: 'bg-danger-soft text-danger',
  alerta: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  ok: 'bg-success-soft text-success',
} as const

/**
 * Situações de risco. Cor de status sempre com ícone e rótulo; quando o
 * número é zero, o item vira "em dia" em vez de continuar alarmando.
 */
export function AtencaoAgora({ resumo }: { resumo?: ResumoPainel }) {
  const itens = [
    {
      chave: 'vencidos',
      rotulo: 'Prazos vencidos',
      descricao: 'Prazo já ultrapassado',
      valor: resumo?.prazosVencidos,
      icone: AlarmClock,
      tom: 'perigo' as const,
      para: '/app/processos?pendencia=1',
    },
    {
      chave: 'proximos',
      rotulo: 'Vencem em até 7 dias',
      descricao: 'Antecipe antes de virar atraso',
      valor: resumo?.prazosProximos7Dias,
      icone: CalendarClock,
      tom: 'alerta' as const,
      para: '/app/calendario',
    },
    {
      chave: 'documentos',
      rotulo: 'Documentos para analisar',
      descricao: 'Enviados pelo cliente',
      valor: resumo?.documentosAguardandoAnalise,
      icone: FileSearch,
      tom: 'info' as const,
      para: '/app/documentos?aguardando=1',
    },
    {
      chave: 'parados',
      rotulo: 'Sem movimentação',
      descricao: 'Parados há mais de 15 dias',
      valor: resumo?.processosSemMovimentacao,
      icone: PauseCircle,
      tom: 'alerta' as const,
      para: '/app/processos',
    },
  ]

  return (
    <section
      aria-labelledby="titulo-atencao"
      className="flex h-full flex-col rounded-xl border border-border bg-card shadow-xs"
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
        <div>
          <p className="alc-chapeu text-primary">Agora</p>
          <h2 id="titulo-atencao" className="mt-2 text-[0.98rem] font-bold tracking-[-0.02em]">
            Precisa de atenção
          </h2>
        </div>
      </header>

      <ul className="mt-2 flex flex-1 flex-col divide-y divide-border px-2 pb-2 sm:px-3">
        {itens.map((item) => {
          const emDia = item.valor === 0
          const Icone = emDia ? CheckCircle2 : item.icone
          return (
            <li key={item.chave} className="flex-1">
              <Link
                to={item.para}
                className={cn(
                  'group flex h-full items-center gap-3 rounded-md px-2 py-3 transition-colors',
                  'hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-md',
                    TOM_STATUS[emDia ? 'ok' : item.tom],
                  )}
                  aria-hidden="true"
                >
                  <Icone className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug">{item.rotulo}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {emDia ? 'Em dia' : item.descricao}
                  </span>
                </span>
                {item.valor === undefined ? (
                  <Skeleton className="h-7 w-8" />
                ) : (
                  <span className="alc-numero text-[1.6rem]">{item.valor}</span>
                )}
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
