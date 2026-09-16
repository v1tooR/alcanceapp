import { QueryClient } from '@tanstack/react-query'

/**
 * Cache de dados da aplicação.
 *
 * `staleTime` moderado dá sensação de rapidez na navegação; `gcTime` curto evita
 * manter dados de clientes em memória por mais tempo que o necessário. Ao
 * encerrar a sessão, o cache é descartado por inteiro.
 */
export const clienteConsulta = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

/** Descarta todo o cache — chamado ao sair da conta. */
export function limparCache(): void {
  clienteConsulta.clear()
}
