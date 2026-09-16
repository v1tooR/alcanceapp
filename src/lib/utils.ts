import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Iniciais para avatares (no máximo duas letras). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/** Normaliza texto para busca: sem acentos, minúsculo. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}


/** Busca tolerante a acentos em uma lista de campos. */
export function contemTermo(termo: string, ...campos: (string | undefined | null)[]): boolean {
  const alvo = normalizar(termo)
  if (!alvo) return true
  return campos.some((campo) => (campo ? normalizar(campo).includes(alvo) : false))
}

export function agruparPor<T, K extends string>(itens: T[], chave: (item: T) => K): Record<K, T[]> {
  return itens.reduce(
    (acc, item) => {
      const k = chave(item)
      ;(acc[k] ??= []).push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}

/** Divide um array em páginas de tamanho fixo. */
export function paginar<T>(itens: T[], pagina: number, tamanho: number): T[] {
  const inicio = (pagina - 1) * tamanho
  return itens.slice(inicio, inicio + tamanho)
}

export function faixa(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo)
}

/** Percentual inteiro seguro (0 quando não há total). */
export function percentual(parte: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((parte / total) * 100)
}

/** `setembro de 2026` → `Setembro de 2026` (o `capitalize` do CSS afetaria cada palavra). */
export function capitalizarPrimeira(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)
}

export function pluralizar(quantidade: number, singular: string, plural: string): string {
  return quantidade === 1 ? singular : plural
}
