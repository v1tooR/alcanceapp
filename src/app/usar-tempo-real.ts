import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { servicos, type TabelaObservada } from '@/services'
import { chaves } from '@/services/chaves'
import type { Usuario } from '@/types/domain'

/**
 * Mantém as telas abertas em dia com o que outras pessoas (ou o próprio banco)
 * mudam — kanbans, filas, painel, listas, detalhe do processo e o portal.
 *
 * Cada sinal de tabela alterada invalida as consultas que dependem dela; os
 * sinais chegam em rajadas (uma ação toca várias tabelas), por isso são
 * agrupados antes de invalidar.
 */

const AFETADAS: Record<TabelaObservada, ReadonlyArray<readonly unknown[]>> = {
  clients: [chaves.clientes.todos, chaves.processos.todos, chaves.painel.todos, chaves.portal.todos],
  client_health_profiles: [chaves.clientes.todos, chaves.portal.todos],
  processes: [chaves.processos.todos, chaves.clientes.todos, chaves.painel.todos, chaves.portal.todos],
  subprocesses: [chaves.processos.todos, chaves.painel.todos, chaves.portal.todos],
  process_steps: [chaves.processos.todos, chaves.painel.todos, chaves.portal.todos],
  documents: [
    chaves.documentos.todos,
    chaves.processos.todos,
    chaves.clientes.todos,
    chaves.painel.todos,
    chaves.portal.todos,
  ],
  process_movements: [
    chaves.movimentacoes.todos,
    chaves.processos.todos,
    chaves.clientes.todos,
    chaves.painel.todos,
    chaves.portal.todos,
  ],
  notifications: [chaves.notificacoes.todos, chaves.portal.todos],
  calendar_events: [chaves.calendario.todos, chaves.portal.todos],
  financial_records: [chaves.financeiro.todos, chaves.processos.todos],
  profiles: [chaves.usuarios.todos, chaves.clientes.todos, chaves.painel.todos],
  integrations: [chaves.integracoes.todos],
}

const ESPERA_MS = 250

export function usarTempoReal(usuario: Usuario | null) {
  const clienteConsulta = useQueryClient()

  // Dependências primitivas: o objeto do usuário muda de identidade quando a
  // sessão é relida, e reassinar abriria uma janela em que sinais se perdem.
  const usuarioId = usuario?.id
  const papel = usuario?.papel
  const clienteId = usuario?.clienteId

  React.useEffect(() => {
    if (!usuarioId) return

    const canais =
      papel === 'cliente' ? [`client:${clienteId}`, `user:${usuarioId}`] : ['team', `user:${usuarioId}`]

    const pendentes = new Set<TabelaObservada>()
    let temporizador: ReturnType<typeof setTimeout> | undefined

    const invalidar = () => {
      const chavesUnicas = new Map<string, readonly unknown[]>()
      for (const tabela of pendentes) {
        for (const chave of AFETADAS[tabela] ?? []) chavesUnicas.set(JSON.stringify(chave), chave)
      }
      pendentes.clear()
      for (const chave of chavesUnicas.values()) {
        void clienteConsulta.invalidateQueries({ queryKey: chave })
      }
    }

    const cancelar = servicos.tempoReal.assinar(canais, (tabela) => {
      pendentes.add(tabela)
      clearTimeout(temporizador)
      temporizador = setTimeout(invalidar, ESPERA_MS)
    })

    return () => {
      clearTimeout(temporizador)
      cancelar()
    }
  }, [usuarioId, papel, clienteId, clienteConsulta])
}
