import * as React from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EstadoErro } from '@/components/ui/estados'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/* -- Montagem ------------------------------------------------------------- */

/**
 * `true` a partir do quadro seguinte à montagem. Permite que barras cresçam do
 * zero uma única vez; em atualizações de dados elas transicionam do valor
 * anterior, sem reiniciar.
 */
export function useMontado(): boolean {
  const [montado, setMontado] = React.useState(false)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return montado
}

/** Largura atual de um elemento, acompanhando redimensionamentos. */
export function useLargura<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [largura, setLargura] = React.useState(0)

  React.useLayoutEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    setLargura(elemento.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(Math.round(entrada.contentRect.width))
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return [ref, largura] as const
}

/* -- Legenda -------------------------------------------------------------- */

export interface ItemLegenda {
  rotulo: string
  cor: string
  /** A amostra imita a marca: retângulo para barras, traço para linhas. */
  forma?: 'barra' | 'linha'
  valor?: React.ReactNode
}

/** Legenda sempre presente com duas ou mais séries — identidade nunca só por cor. */
export function Legenda({ itens, className }: { itens: ItemLegenda[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {itens.map((item) => (
        <li key={item.rotulo} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.forma === 'linha' ? (
            <span
              className="h-0.5 w-3.5 rounded-full"
              style={{ background: item.cor }}
              aria-hidden="true"
            />
          ) : (
            <span
              className="size-2.5 rounded-[3px]"
              style={{ background: item.cor }}
              aria-hidden="true"
            />
          )}
          <span>{item.rotulo}</span>
          {item.valor !== undefined && (
            <span className="font-semibold text-foreground">{item.valor}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/* -- Tabela equivalente ---------------------------------------------------- */

export interface ColunaTabela {
  chave: string
  rotulo: string
  numerica?: boolean
}

/** Versão em tabela de cada gráfico: todo valor é alcançável sem passar o mouse. */
export function TabelaDados({
  colunas,
  linhas,
  legenda,
}: {
  colunas: ColunaTabela[]
  linhas: Array<Record<string, React.ReactNode>>
  legenda: string
}) {
  return (
    <TableWrapper className="-mx-1">
      <Table>
        <TableCaption className="sr-only">{legenda}</TableCaption>
        <TableHeader>
          <TableRow>
            {colunas.map((coluna) => (
              <TableHead key={coluna.chave} className={cn(coluna.numerica && 'text-right')}>
                {coluna.rotulo}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha, indice) => (
            <TableRow key={indice}>
              {colunas.map((coluna) => (
                <TableCell
                  key={coluna.chave}
                  className={cn('py-2 text-sm', coluna.numerica && 'text-right tabular-nums')}
                >
                  {linha[coluna.chave]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  )
}

/* -- Cartão de gráfico ----------------------------------------------------- */

export type ModoGrafico = 'grafico' | 'tabela'

export interface CartaoGraficoProps {
  titulo: string
  descricao?: string
  /** Deixa claro se o dado é do período filtrado ou um retrato atual. */
  escopo?: string
  legenda?: React.ReactNode
  rodape?: React.ReactNode
  carregando?: boolean
  /** Recarregando com dados anteriores na tela: esmaece, sem piscar. */
  atualizando?: boolean
  erro?: boolean
  aoTentarNovamente?: () => void
  alturaCarregando?: string
  permitirTabela?: boolean
  className?: string
  children: (modo: ModoGrafico) => React.ReactNode
}

export function CartaoGrafico({
  titulo,
  descricao,
  escopo,
  legenda,
  rodape,
  carregando,
  atualizando,
  erro,
  aoTentarNovamente,
  alturaCarregando = 'h-52',
  permitirTabela = true,
  className,
  children,
}: CartaoGraficoProps) {
  const [modo, setModo] = React.useState<ModoGrafico>('grafico')
  const idTitulo = React.useId()

  return (
    <section
      aria-labelledby={idTitulo}
      className={cn(
        'flex h-full min-w-0 flex-col rounded-xl border border-border bg-card shadow-xs',
        className,
      )}
    >
      {/* Grade de duas colunas: o botão fica sempre no canto, mesmo com título longo. */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={idTitulo} className="text-[0.98rem] font-bold leading-tight tracking-[-0.02em]">
              {titulo}
            </h3>
            {escopo && (
              <Badge tom="contorno" tamanho="sm">
                {escopo}
              </Badge>
            )}
          </div>
          {descricao && (
            <p className="mt-1 text-xs text-muted-foreground leading-snug">{descricao}</p>
          )}
        </div>

        {permitirTabela && !carregando && !erro && (
          <Button
            variante="fantasma"
            tamanho="sm"
            aria-pressed={modo === 'tabela'}
            onClick={() => setModo((atual) => (atual === 'grafico' ? 'tabela' : 'grafico'))}
            className="-mr-2 text-muted-foreground"
          >
            {modo === 'tabela' ? <ChartColumn aria-hidden="true" /> : <Table2 aria-hidden="true" />}
            {modo === 'tabela' ? 'Gráfico' : 'Tabela'}
          </Button>
        )}
      </header>

      {legenda && modo === 'grafico' && !carregando && !erro && (
        <div className="px-4 pt-3 sm:px-5">{legenda}</div>
      )}

      <div
        className={cn(
          'flex flex-1 flex-col px-4 pb-4 pt-4 transition-opacity duration-200 sm:px-5 sm:pb-5',
          atualizando && 'opacity-55',
        )}
        aria-busy={carregando || atualizando || undefined}
      >
        {erro ? (
          <EstadoErro aoTentarNovamente={aoTentarNovamente} className="py-8" />
        ) : carregando ? (
          <Skeleton className={cn('w-full', alturaCarregando)} />
        ) : (
          children(modo)
        )}
      </div>

      {rodape && !carregando && !erro && (
        <div className="border-t border-border px-4 py-3.5 sm:px-5">{rodape}</div>
      )}
    </section>
  )
}
