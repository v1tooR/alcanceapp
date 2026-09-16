import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { COR_CONTEXTO, COR_DESTAQUE, ORDINAL } from '@/lib/cores-graficos'
import { caminhoMonotono, percentualDe } from '@/lib/graficos'
import { cn } from '@/lib/utils'
import { useLargura, useMontado } from './base'

/**
 * Marcas dos gráficos, em HTML/SVG leve.
 *
 * Especificação seguida em todas: barras de no máximo 24 px com ponta
 * arredondada de 4 px e base reta; 2 px de superfície separando segmentos
 * (sem contorno); linhas de 2 px; pontos com anel de 2 px da cor do cartão;
 * cada marca com dica ao passar o mouse **e** ao receber foco pelo teclado.
 */

/* -- Sparkline ------------------------------------------------------------- */

const ALTURA_SPARK = 40
const MARGEM_SPARK = 6

/**
 * Tendência compacta: histórico em cor de contexto, período atual em destaque.
 * Decorativa — o valor e a variação ficam no texto ao lado.
 */
export function Sparkline({ valores, className }: { valores: number[]; className?: string }) {
  const [ref, largura] = useLargura<HTMLDivElement>()

  const maximo = Math.max(1, ...valores)
  const util = Math.max(0, largura - MARGEM_SPARK * 2)
  const passo = valores.length > 1 ? util / (valores.length - 1) : 0
  const pontos = valores.map((valor, indice) => ({
    x: MARGEM_SPARK + indice * passo,
    y: ALTURA_SPARK - MARGEM_SPARK - (valor / maximo) * (ALTURA_SPARK - MARGEM_SPARK * 2),
  }))
  const ultimo = pontos[pontos.length - 1]

  return (
    <div ref={ref} className={cn('h-10 w-full', className)} aria-hidden="true">
      {largura > 0 && pontos.length > 0 && (
        <svg width={largura} height={ALTURA_SPARK} className="overflow-visible" focusable="false">
          <path
            d={caminhoMonotono(pontos)}
            fill="none"
            stroke={COR_CONTEXTO}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="alc-desenhar"
          />
          <circle
            cx={ultimo.x}
            cy={ultimo.y}
            r={4}
            fill={COR_DESTAQUE}
            stroke="var(--card)"
            strokeWidth={2}
          />
        </svg>
      )}
    </div>
  )
}

/* -- Barra empilhada ------------------------------------------------------- */

export interface Segmento {
  chave: string
  rotulo: string
  valor: number
  cor: string
}

/**
 * Barra horizontal empilhada (parte do todo).
 * `escala` (0–1) encurta a barra para comparar linhas de totais diferentes.
 */
export function BarraEmpilhada({
  segmentos,
  escala = 1,
  rotulo,
  espessura = 'h-5',
}: {
  segmentos: Segmento[]
  escala?: number
  rotulo: string
  espessura?: string
}) {
  const montado = useMontado()
  const total = segmentos.reduce((soma, segmento) => soma + segmento.valor, 0)
  const visiveis = segmentos.filter((segmento) => segmento.valor > 0)

  return (
    <div className={cn('flex w-full min-w-0', espessura)} role="group" aria-label={rotulo}>
      <div
        className="flex h-full gap-0.5 transition-[width] duration-700 ease-out"
        style={{ width: montado ? `${Math.max(escala, 0) * 100}%` : '0%' }}
      >
        {visiveis.map((segmento, indice) => {
          const pct = percentualDe(segmento.valor, total)
          return (
            <Tooltip key={segmento.chave}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-label={`${segmento.rotulo}: ${segmento.valor} (${pct}%)`}
                  className={cn(
                    'h-full min-w-[3px] cursor-default outline-none',
                    'transition-[flex-grow,filter] duration-500 ease-out hover:brightness-110',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
                    indice === visiveis.length - 1 && 'rounded-r-[4px]',
                  )}
                  style={{ flexGrow: segmento.valor, flexBasis: 0, background: segmento.cor }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-bold">{segmento.valor}</span> {segmento.rotulo.toLowerCase()} ·{' '}
                {pct}%
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

/** Várias barras empilhadas, na mesma escala, com rótulo e total por linha. */
export function LinhasEmpilhadas({
  linhas,
  sufixoTotal,
}: {
  linhas: Array<{ chave: string; rotulo: string; segmentos: Segmento[] }>
  sufixoTotal: string
}) {
  const totais = linhas.map((linha) => linha.segmentos.reduce((soma, s) => soma + s.valor, 0))
  const maximo = Math.max(1, ...totais)

  return (
    <ul className="space-y-3">
      {linhas.map((linha, indice) => (
        <li
          key={linha.chave}
          className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_2.5rem] items-center gap-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.75rem]"
        >
          <span className="truncate text-sm font-medium" title={linha.rotulo}>
            {linha.rotulo}
          </span>
          <BarraEmpilhada
            segmentos={linha.segmentos}
            escala={totais[indice] / maximo}
            rotulo={`${linha.rotulo}: ${totais[indice]} ${sufixoTotal}`}
            espessura="h-4"
          />
          <span className="text-right text-sm font-semibold tabular-nums">{totais[indice]}</span>
        </li>
      ))}
    </ul>
  )
}

/* -- Barra simples --------------------------------------------------------- */

/** Uma série só: uma cor, sem legenda (o título do cartão diz o que é). */
export function BarraSimples({
  valor,
  maximo,
  cor = COR_DESTAQUE,
  rotulo,
  espessura = 'h-2.5',
}: {
  valor: number
  maximo: number
  cor?: string
  rotulo: string
  espessura?: string
}) {
  const montado = useMontado()
  const largura = maximo > 0 ? (valor / maximo) * 100 : 0

  return (
    <div className={cn('w-full min-w-0', espessura)} role="img" aria-label={rotulo}>
      <div
        className="h-full rounded-r-[4px] transition-[width] duration-700 ease-out"
        style={{ width: montado ? `${largura}%` : '0%', background: cor }}
      />
    </div>
  )
}

/**
 * Categorias sem ordem natural, uma série só: todas as barras na mesma cor.
 * Colorir cada barra de um jeito repetiria, em cor, o que o comprimento já diz.
 */
export function ListaBarras({
  itens,
  cor = COR_DESTAQUE,
}: {
  itens: Array<{ chave: string; rotulo: string; valor: number; valorFormatado?: string }>
  cor?: string
}) {
  const maximo = Math.max(1, ...itens.map((item) => item.valor))

  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li
          key={item.chave}
          className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-3"
        >
          <span className="truncate text-sm font-medium" title={item.rotulo}>
            {item.rotulo}
          </span>
          <BarraSimples
            valor={item.valor}
            maximo={maximo}
            cor={cor}
            espessura="h-3.5"
            rotulo={`${item.rotulo}: ${item.valorFormatado ?? item.valor}`}
          />
          <span className="text-right text-sm font-semibold tabular-nums">
            {item.valorFormatado ?? item.valor}
          </span>
        </li>
      ))}
    </ul>
  )
}

/* -- Funil ----------------------------------------------------------------- */

export interface EtapaFunil {
  chave: string
  rotulo: string
  valor: number
}

/**
 * Etapas em sequência. Cada barra é proporcional à primeira etapa; a coluna
 * da direita mostra o valor e quanto passou da etapa anterior.
 */
export function Funil({ etapas }: { etapas: EtapaFunil[] }) {
  const montado = useMontado()
  const base = Math.max(1, etapas[0]?.valor ?? 0)

  return (
    <ol className="space-y-3">
      {etapas.map((etapa, indice) => {
        const anterior = indice > 0 ? etapas[indice - 1].valor : null
        const conversao = anterior ? percentualDe(etapa.valor, anterior) : null

        return (
          <li
            key={etapa.chave}
            className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_4.5rem] items-center gap-3"
          >
            <span className="truncate text-sm font-medium">{etapa.rotulo}</span>
            <span className="h-6 min-w-0" aria-hidden="true">
              <span
                className="block h-full min-w-[3px] rounded-r-[4px] transition-[width] duration-700 ease-out"
                style={{
                  width: montado ? `${(etapa.valor / base) * 100}%` : '0%',
                  background: ORDINAL[Math.min(indice, ORDINAL.length - 1)],
                }}
              />
            </span>
            <span className="text-right leading-tight">
              <span className="block text-sm font-bold tabular-nums">{etapa.valor}</span>
              {conversao !== null && (
                <span className="block text-[11px] text-muted-foreground tabular-nums">
                  {conversao}%<span className="sr-only"> da etapa anterior</span>
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* -- Medidor --------------------------------------------------------------- */

const TONS_MEDIDOR = {
  primario: { trilho: 'bg-primary-soft', preenchimento: 'bg-primary' },
  sucesso: { trilho: 'bg-success-soft', preenchimento: 'bg-success' },
  alerta: { trilho: 'bg-warning-soft', preenchimento: 'bg-warning' },
  perigo: { trilho: 'bg-danger-soft', preenchimento: 'bg-danger' },
  marca: { trilho: 'bg-on-brand-subtle', preenchimento: 'bg-brand-laranja-claro' },
} as const

/** Uma razão contra um limite. O trilho é um tom mais claro da mesma cor. */
export function Medidor({
  valor,
  maximo,
  rotulo,
  tom = 'primario',
  className,
}: {
  valor: number
  maximo: number
  rotulo: string
  tom?: keyof typeof TONS_MEDIDOR
  className?: string
}) {
  const montado = useMontado()
  const pct = Math.min(100, percentualDe(valor, maximo))
  const cores = TONS_MEDIDOR[tom]

  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={valor}
      aria-valuetext={`${pct}%`}
      className={cn('h-2 w-full overflow-hidden rounded-pill', cores.trilho, className)}
    >
      <div
        className={cn('h-full rounded-pill transition-[width] duration-700 ease-out', cores.preenchimento)}
        style={{ width: montado ? `${pct}%` : '0%' }}
      />
    </div>
  )
}
