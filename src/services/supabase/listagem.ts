import { normalizar } from '@/lib/utils'
import type { Filtro, Pagina } from '@/services/contratos'
import { traduzirErro } from './erros'

/**
 * Padrão único de listagem.
 *
 * Toda lista paginada do sistema segue o mesmo caminho:
 *   1. lê uma view `*_list` do banco (security_invoker: vale a RLS);
 *   2. busca livre por `search_text` (sem acento, minúsculo) com `ilike`;
 *   3. filtros por igualdade, ignorando `'todos'` e valores vazios;
 *   4. ordenação por uma coluna da view;
 *   5. paginação por intervalo (`range`) com `count: 'exact'`.
 *
 * O resultado sai sempre no formato `Pagina<T>` dos contratos.
 */

export const TAMANHO_PAGINA_PADRAO = 25

/** Padrão `ilike` para a busca livre; `null` quando não há termo. */
export function padraoBusca(termo: string | undefined): string | null {
  const limpo = normalizar(termo ?? '')
  if (!limpo) return null
  // `%` e `_` digitados pelo usuário são literais, não curingas.
  return `%${limpo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`)}%`
}

/** O filtro está ligado? (`'todos'`, vazio e ausente desligam.) */
export function filtroAtivo<T>(valor: Filtro<T> | undefined | null): valor is T {
  return valor !== undefined && valor !== null && valor !== 'todos' && valor !== ''
}

export function intervalo(pagina = 1, tamanhoPagina = TAMANHO_PAGINA_PADRAO): [number, number] {
  const inicio = (Math.max(pagina, 1) - 1) * tamanhoPagina
  return [inicio, inicio + tamanhoPagina - 1]
}

/** Converte a resposta paginada do PostgREST em `Pagina<T>`. */
export function paginar<Linha, T>(
  resultado: { data: Linha[] | null; error: unknown; count: number | null },
  mapear: (linha: Linha) => T,
  pagina = 1,
  tamanhoPagina = TAMANHO_PAGINA_PADRAO,
): Pagina<T> {
  if (resultado.error) throw traduzirErro(resultado.error)
  return {
    itens: (resultado.data ?? []).map(mapear),
    total: resultado.count ?? 0,
    pagina,
    tamanhoPagina,
  }
}
