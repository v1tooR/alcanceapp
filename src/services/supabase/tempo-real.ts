import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ServicoTempoReal, TabelaObservada } from '@/services/contratos'
import { supabase } from './cliente'

/**
 * Supabase Realtime — broadcast em canais privados.
 *
 * O banco publica um sinal `{ table, op, id }` a cada escrita (gatilho
 * app.broadcast_change). A autorização de cada canal é uma política RLS em
 * realtime.messages: `team` só para a equipe, `client:<id>` só para aquele
 * cliente, `user:<id>` só para a própria pessoa.
 */
export function criarTempoReal(): ServicoTempoReal {
  return {
    assinar(topicos, aoMudar) {
      const sb = supabase()
      const canais: RealtimeChannel[] = []
      let ativo = true

      void (async () => {
        // Canais privados exigem o JWT da sessão no socket.
        await sb.realtime.setAuth()
        if (!ativo) return
        for (const topico of topicos) {
          canais.push(
            sb
              .channel(topico, { config: { private: true } })
              .on('broadcast', { event: 'change' }, ({ payload }) => {
                const tabela = (payload as { table?: TabelaObservada }).table
                if (tabela) aoMudar(tabela)
              })
              .subscribe(),
          )
        }
      })()

      return () => {
        ativo = false
        for (const canal of canais) void sb.removeChannel(canal)
      }
    },
  }
}
