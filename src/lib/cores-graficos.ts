import type { StatusProcesso } from '@/types/domain'

/**
 * Cores dos gráficos, sempre por papel — nunca hex no componente.
 * Os valores vivem em `src/styles/globals.css` e foram validados para
 * daltonismo e contraste nos dois temas.
 */

/** Categórico em ordem fixa. A ordem é o que garante a separação para daltônicos. */
export const SERIE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'] as const

/** Etapas em sequência (funil): um só matiz, em ordem. */
export const ORDINAL = [
  'var(--chart-seq-1)',
  'var(--chart-seq-2)',
  'var(--chart-seq-3)',
  'var(--chart-seq-4)',
] as const

/** Linha de contexto (sparkline) — recessiva. */
export const COR_CONTEXTO = 'var(--chart-muted)'
export const COR_DESTAQUE = SERIE[0]

/**
 * A cor segue a situação, não a posição no gráfico: "aguardando cliente" é
 * laranja em qualquer gráfico do painel.
 */
export const COR_SITUACAO = {
  emAndamento: SERIE[0],
  aguardandoCliente: SERIE[1],
  aguardandoOrgao: SERIE[2],
  inicial: SERIE[3],
} as const

export type StatusProcessoAtivo = Extract<
  StatusProcesso,
  'em_andamento' | 'aguardando_cliente' | 'aguardando_orgao' | 'em_avaliacao'
>

export const COR_STATUS_PROCESSO_ATIVO: Record<StatusProcessoAtivo, string> = {
  em_andamento: COR_SITUACAO.emAndamento,
  aguardando_cliente: COR_SITUACAO.aguardandoCliente,
  aguardando_orgao: COR_SITUACAO.aguardandoOrgao,
  em_avaliacao: COR_SITUACAO.inicial,
}
