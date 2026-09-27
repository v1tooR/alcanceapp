import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { capitalizarPrimeira } from '@/lib/utils'

/**
 * Rótulos das séries mensais.
 *
 * O servidor devolve só a chave do mês (`2026-09`); os textos em pt-BR são
 * montados aqui. O último ponto da série é o mês corrente, ainda parcial.
 */

export interface RotulosMes {
  chave: string
  /** `Set` */
  rotulo: string
  /** `setembro de 2026` */
  rotuloCompleto: string
  parcial: boolean
}

export function rotularMes(chave: string, parcial: boolean): RotulosMes {
  const data = parse(`${chave}-01`, 'yyyy-MM-dd', new Date())
  return {
    chave,
    rotulo: capitalizarPrimeira(format(data, 'MMM', { locale: ptBR }).replace('.', '')),
    rotuloCompleto: format(data, "MMMM 'de' yyyy", { locale: ptBR }),
    parcial,
  }
}

/** Acrescenta os rótulos a uma série vinda do servidor, na ordem recebida. */
export function rotularSerie<T extends { chave: string }>(serie: T[] | null | undefined): Array<T & RotulosMes> {
  const itens = serie ?? []
  return itens.map((ponto, indice) => ({ ...ponto, ...rotularMes(ponto.chave, indice === itens.length - 1) }))
}
