import { useReducedMotion } from 'motion/react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ticksLimpos } from '@/lib/graficos'
import { capitalizarPrimeira } from '@/lib/utils'

/** Todo ponto mensal traz rótulos prontos e a marca de mês em andamento. */
export interface PontoBaseSerie {
  chave: string
  /** `Set` */
  rotulo: string
  /** `setembro de 2026` */
  rotuloCompleto: string
  /** Mês corrente, ainda em andamento. */
  parcial: boolean
}

/** Chaves do ponto cujo valor é numérico — as únicas que viram série. */
export type ChaveNumerica<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T] &
  string

export interface SerieTendencia<T> {
  chave: ChaveNumerica<T>
  rotulo: string
  cor: string
}

const ALTURA = 248
const MARGEM = { top: 14, right: 44, bottom: 0, left: 0 }
/** Altura aproximada da área útil (sem eixo X), usada para prever colisão de rótulos. */
const ALTURA_PLOT = ALTURA - MARGEM.top - 30
/** Largura média de um caractere do rótulo final (12 px, negrito). */
const LARGURA_CARACTERE = 7.2

const formatarPadrao = (valor: number) => valor.toLocaleString('pt-BR')

/**
 * Linhas por mês com guia vertical: o leitor mira o mês, não a linha de 2 px.
 * A dica lista todas as séries daquele mês; o valor vem antes do nome.
 */
export function GraficoTendencia<T extends PontoBaseSerie>({
  dados,
  series,
  formatarValor = formatarPadrao,
  formatarEixo = formatarPadrao,
  larguraEixo = 32,
}: {
  dados: T[]
  series: Array<SerieTendencia<T>>
  /** Formato de valores na dica e nos rótulos (ex.: moeda). */
  formatarValor?: (valor: number) => string
  /** Formato compacto das marcas do eixo Y. */
  formatarEixo?: (valor: number) => string
  larguraEixo?: number
}) {
  const movimentoReduzido = useReducedMotion()
  const valorDe = (ponto: T, serie: SerieTendencia<T>) => Number(ponto[serie.chave] ?? 0)

  const maximo = Math.max(0, ...dados.flatMap((ponto) => series.map((serie) => valorDe(ponto, serie))))
  const ticks = ticksLimpos(maximo)
  const topo = ticks[ticks.length - 1]
  const indiceFinal = dados.length - 1

  // O mês corrente ainda está em andamento: marcado com "*" no eixo e explicado
  // abaixo do gráfico, para não ser lido como queda.
  const linhas = dados.map((ponto) => ({
    ...ponto,
    eixo: ponto.parcial ? `${ponto.rotulo}*` : ponto.rotulo,
  }))
  const parcial = dados.find((ponto) => ponto.parcial)

  const finais = series.map((serie) => (dados[indiceFinal] ? valorDe(dados[indiceFinal], serie) : 0))
  // Rótulos no fim das linhas só quando não se sobrepõem. Se as linhas terminam
  // juntas, legenda e dica carregam os valores — empilhar rótulos confundiria.
  const rotulosFinaisCabem = finais.every((valor, i) =>
    finais.every((outro, j) => i === j || (Math.abs(valor - outro) / topo) * ALTURA_PLOT >= 16),
  )
  // A margem direita acompanha o rótulo mais longo, para "R$ 15,2 mil" não ser cortado.
  const maiorRotulo = rotulosFinaisCabem
    ? Math.max(0, ...finais.map((valor) => formatarEixo(valor).length))
    : 0
  const margem = {
    ...MARGEM,
    right: Math.max(MARGEM.right, Math.ceil(14 + maiorRotulo * LARGURA_CARACTERE)),
  }

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        {series.map((serie) => serie.rotulo).join(' e ')} por mês. Os valores estão disponíveis
        no botão Tabela.
      </figcaption>
      <div style={{ height: ALTURA }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={linhas} margin={margem}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="eixo"
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-axis)' }}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              domain={[0, topo]}
              ticks={ticks}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={larguraEixo}
              tickFormatter={(valor: number) => formatarEixo(valor)}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const ponto = payload?.[0]?.payload as T | undefined
                if (!active || !ponto) return null
                return (
                  <div className="min-w-40 rounded-md border border-border bg-popover px-3 py-2.5 shadow-md">
                    <p className="text-xs font-medium text-muted-foreground">
                      {capitalizarPrimeira(ponto.rotuloCompleto)}
                      {ponto.parcial && ' · em andamento'}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {series.map((serie) => (
                        <li key={serie.chave} className="flex items-center gap-2">
                          <span
                            className="h-0.5 w-3 rounded-full"
                            style={{ background: serie.cor }}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-bold text-popover-foreground">
                            {formatarValor(valorDe(ponto, serie))}
                          </span>
                          <span className="text-xs text-muted-foreground">{serie.rotulo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }}
            />
            {series.map((serie) => (
              <Line
                key={serie.chave}
                type="monotone"
                dataKey={serie.chave}
                name={serie.rotulo}
                stroke={serie.cor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={!movimentoReduzido}
                animationDuration={750}
                animationEasing="ease-out"
                activeDot={{ r: 5, fill: serie.cor, stroke: 'var(--card)', strokeWidth: 2 }}
                dot={(props) => (
                  <PontoFinal
                    key={`${serie.chave}-${String((props as { index?: number }).index)}`}
                    dados={props}
                    indiceFinal={indiceFinal}
                    cor={serie.cor}
                    rotulo={rotulosFinaisCabem ? formatarEixo : undefined}
                  />
                )}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {parcial && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          * {capitalizarPrimeira(parcial.rotuloCompleto)} ainda está em andamento — os números do
          mês podem crescer.
        </p>
      )}
    </figure>
  )
}

/** Marca e valor no último mês de cada série — o rótulo direto que importa. */
function PontoFinal({
  dados,
  indiceFinal,
  cor,
  rotulo,
}: {
  dados: unknown
  indiceFinal: number
  cor: string
  /** Formatador do valor; ausente quando os rótulos colidiriam. */
  rotulo?: (valor: number) => string
}) {
  const { cx, cy, index, value } = dados as {
    cx?: number
    cy?: number
    index?: number
    value?: number
  }
  if (index !== indiceFinal || cx == null || cy == null) return <g />

  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={cor} stroke="var(--card)" strokeWidth={2} />
      {rotulo && value != null && (
        <text x={cx + 9} y={cy} dy="0.35em" fontSize={12} fontWeight={700} fill="var(--foreground)">
          {rotulo(value)}
        </text>
      )}
    </g>
  )
}
