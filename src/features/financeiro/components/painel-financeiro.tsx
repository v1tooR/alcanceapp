import { AlarmClock, Ban, CheckCircle2, CircleDollarSign, CircleDot, Clock, Wallet } from 'lucide-react'
import { CartaoGrafico, Legenda, TabelaDados } from '@/components/graficos/base'
import { Estatistica } from '@/components/graficos/estatistica'
import { GraficoTendencia, type SerieTendencia } from '@/components/graficos/grafico-tendencia'
import { ListaBarras, Medidor } from '@/components/graficos/marcas'
import { EstadoVazio } from '@/components/ui/estados'
import { SERIE } from '@/lib/cores-graficos'
import { formatarMoeda } from '@/lib/formato'
import { percentualDe } from '@/lib/graficos'
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_FINANCEIRO } from '@/lib/rotulos'
import { capitalizarPrimeira, cn, pluralizar } from '@/lib/utils'
import type { ResumoFinanceiro } from '@/services/contratos'
import type { StatusFinanceiro } from '@/types/domain'

type PontoFinanceiro = ResumoFinanceiro['serieMensal'][number]

const MOEDA_COMPACTA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const SERIES: Array<SerieTendencia<PontoFinanceiro>> = [
  { chave: 'contratado', rotulo: 'Contratado', cor: SERIE[0] },
  { chave: 'recebido', rotulo: 'Recebido', cor: SERIE[1] },
]

/** Situação com significado de resultado: cor de status sempre com ícone. */
const VISUAL_STATUS: Record<
  StatusFinanceiro,
  { icone: React.ComponentType<{ className?: string }>; classe: string }
> = {
  pago: { icone: CheckCircle2, classe: 'text-success' },
  parcial: { icone: CircleDot, classe: 'text-warning' },
  pendente: { icone: Clock, classe: 'text-muted-foreground' },
  atrasado: { icone: AlarmClock, classe: 'text-danger' },
  cancelado: { icone: Ban, classe: 'text-muted-foreground' },
}

export function PainelFinanceiro({
  resumo,
  carregando,
  erro,
  aoTentarNovamente,
  statusSelecionado,
  aoFiltrarStatus,
}: {
  resumo?: ResumoFinanceiro
  carregando: boolean
  erro: boolean
  aoTentarNovamente: () => void
  statusSelecionado: string
  aoFiltrarStatus: (status: string) => void
}) {
  const contratado = resumo?.totalContratado ?? 0
  const recebido = resumo?.totalRecebido ?? 0
  const atrasado = resumo?.totalAtrasado ?? 0
  const formas = (resumo?.porForma ?? [])
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor)
  const registrosComPagamento = formas.reduce((soma, item) => soma + item.total, 0)
  const somaFormas = formas.reduce((soma, item) => soma + item.valor, 0)
  const soma12Meses = (chave: 'contratado' | 'recebido') =>
    resumo?.serieMensal.reduce((soma, ponto) => soma + ponto[chave], 0) ?? 0

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Estatistica
        className="md:col-span-2"
        rotulo="Total contratado"
        valor={formatarMoeda(contratado)}
        icone={CircleDollarSign}
        carregando={carregando}
        descricao={`${formatarMoeda(recebido)} recebidos · ${percentualDe(recebido, contratado)}% do total`}
      >
        <Medidor
          valor={recebido}
          maximo={Math.max(contratado, 1)}
          tom="sucesso"
          rotulo="Parcela já recebida do total contratado"
        />
      </Estatistica>

      <Estatistica
        rotulo="Em aberto"
        valor={formatarMoeda(resumo?.totalEmAberto)}
        icone={Wallet}
        tom="neutro"
        carregando={carregando}
        descricao="A receber, inclusive o que ainda não venceu"
      />

      <Estatistica
        rotulo="Em atraso"
        valor={formatarMoeda(atrasado)}
        icone={AlarmClock}
        tom={atrasado > 0 ? 'perigo' : 'sucesso'}
        carregando={carregando}
        descricao="Vencido e ainda não pago"
        para="/app/financeiro?status=atrasado"
      />

      <CartaoGrafico
        className="md:col-span-2 xl:col-span-4"
        titulo="Contratado e recebido por mês"
        descricao="Valor líquido contratado e valor efetivamente pago."
        escopo="Últimos 12 meses"
        alturaCarregando="h-[248px]"
        carregando={carregando}
        erro={erro}
        aoTentarNovamente={aoTentarNovamente}
        legenda={
          <Legenda
            itens={SERIES.map((serie) => ({
              rotulo: serie.rotulo,
              cor: serie.cor,
              forma: 'linha',
              valor: MOEDA_COMPACTA.format(soma12Meses(serie.chave)),
            }))}
          />
        }
      >
        {(modo) =>
          resumo &&
          (modo === 'grafico' ? (
            <GraficoTendencia
              dados={resumo.serieMensal}
              series={SERIES}
              formatarValor={formatarMoeda}
              formatarEixo={(valor) => MOEDA_COMPACTA.format(valor)}
              larguraEixo={64}
            />
          ) : (
            <TabelaDados
              legenda="Valores contratados e recebidos por mês"
              colunas={[
                { chave: 'mes', rotulo: 'Mês' },
                { chave: 'contratado', rotulo: 'Contratado', numerica: true },
                { chave: 'recebido', rotulo: 'Recebido', numerica: true },
              ]}
              linhas={resumo.serieMensal.map((ponto) => ({
                mes: `${capitalizarPrimeira(ponto.rotuloCompleto)}${ponto.parcial ? ' (em andamento)' : ''}`,
                contratado: formatarMoeda(ponto.contratado),
                recebido: formatarMoeda(ponto.recebido),
              }))}
            />
          ))
        }
      </CartaoGrafico>

      <CartaoGrafico
        className="md:col-span-2 xl:col-span-2"
        titulo="Recebido por forma"
        descricao="Soma do que já foi pago."
        carregando={carregando}
        erro={erro}
        aoTentarNovamente={aoTentarNovamente}
        rodape={
          formas.length > 0 && (
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                {registrosComPagamento}{' '}
                {pluralizar(registrosComPagamento, 'registro com pagamento', 'registros com pagamento')}
              </span>
              <span className="font-bold tabular-nums">{formatarMoeda(somaFormas)}</span>
            </p>
          )
        }
      >
        {(modo) =>
          formas.length === 0 ? (
            <EstadoVazio titulo="Nenhum pagamento registrado" compacto />
          ) : modo === 'grafico' ? (
            <div className="my-auto">
              <ListaBarras
                itens={formas.map((item) => ({
                  chave: item.forma,
                  rotulo: ROTULO_FORMA_PAGAMENTO[item.forma],
                  valor: item.valor,
                  valorFormatado: MOEDA_COMPACTA.format(item.valor),
                }))}
              />
            </div>
          ) : (
            <TabelaDados
              legenda="Valor recebido por forma de pagamento"
              colunas={[
                { chave: 'forma', rotulo: 'Forma' },
                { chave: 'registros', rotulo: 'Registros', numerica: true },
                { chave: 'valor', rotulo: 'Recebido', numerica: true },
              ]}
              linhas={formas.map((item) => ({
                forma: ROTULO_FORMA_PAGAMENTO[item.forma],
                registros: item.total,
                valor: formatarMoeda(item.valor),
              }))}
            />
          )
        }
      </CartaoGrafico>

      {/* Situação dos registros: cada item filtra a lista abaixo. */}
      {resumo && (
        <section
          aria-labelledby="titulo-situacao-financeiro"
          className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5 md:col-span-2 xl:col-span-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-situacao-financeiro" className="text-[0.98rem] font-bold tracking-[-0.02em]">
              Situação dos registros
            </h2>
            <p className="text-xs text-muted-foreground">Toque numa situação para filtrar a lista.</p>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {resumo.porStatus.map((item) => {
              const { icone: Icone, classe } = VISUAL_STATUS[item.status]
              const selecionado = statusSelecionado === item.status
              return (
                <li key={item.status}>
                  <button
                    type="button"
                    aria-pressed={selecionado}
                    onClick={() => aoFiltrarStatus(selecionado ? 'todos' : item.status)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selecionado
                        ? 'border-primary bg-primary-soft'
                        : 'border-border hover:bg-muted/60',
                    )}
                  >
                    <Icone className={cn('size-4.5 shrink-0', classe)} aria-hidden="true" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-sm font-semibold">
                        {ROTULO_STATUS_FINANCEIRO[item.status]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.total} {item.total === 1 ? 'registro' : 'registros'}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{MOEDA_COMPACTA.format(item.valor)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
