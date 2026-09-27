import type { ServicoCalendario, ServicoMovimentacoes, ServicoNotificacoes } from '@/services/contratos'
import type { EventoListado } from '@/services/contratos'
import type { Tables, TablesUpdate } from './database.types'
import { supabase } from './cliente'
import { conferir, exigir } from './erros'
import { filtroAtivo } from './listagem'
import { ouNulo, paraEvento, paraEventoListado, paraMovimentacao, paraNotificacao } from './mapeadores'

/* -- Histórico de movimentações --------------------------------------------- */

export function criarMovimentacoes(): ServicoMovimentacoes {
  return {
    async listarPorProcesso(processoId, apenasVisiveisAoCliente) {
      let consulta = supabase().from('process_movements').select('*').eq('process_id', processoId)
      if (apenasVisiveisAoCliente) consulta = consulta.eq('visible_to_client', true)
      return exigir(await consulta.order('created_at', { ascending: false })).map(paraMovimentacao)
    },

    async registrar(dados) {
      return paraMovimentacao(
        exigir(
          await supabase()
            .from('process_movements')
            .insert({
              process_id: dados.processoId,
              subprocess_id: ouNulo(dados.subprocessoId),
              // Visível ao cliente = mensagem para ele (e aviso no portal).
              type: dados.visivelCliente ? 'mensagem_cliente' : 'observacao',
              title: dados.titulo.trim(),
              description: ouNulo(dados.descricao),
              visible_to_client: dados.visivelCliente,
            })
            .select()
            .single(),
        ),
      )
    },

    async recentes(limite = 12) {
      const linhas = exigir(
        await supabase().from('movement_feed').select('*').order('created_at', { ascending: false }).limit(limite),
      )
      return linhas.map((linha) => ({
        ...paraMovimentacao(linha),
        clienteNome: linha.client_name ?? '—',
        processoCodigo: linha.process_code ?? '—',
      }))
    },
  }
}

/* -- Notificações -------------------------------------------------------------- */

// A RLS já restringe às notificações de quem está logado; o filtro por
// destinatário mantém o contrato explícito.
export function criarNotificacoes(): ServicoNotificacoes {
  return {
    async listar(destinatarioId, apenasNaoLidas) {
      let consulta = supabase().from('notifications').select('*').eq('recipient_id', destinatarioId)
      if (apenasNaoLidas) consulta = consulta.is('read_at', null)
      return exigir(await consulta.order('created_at', { ascending: false }).limit(200)).map(paraNotificacao)
    },

    async contarNaoLidas(destinatarioId) {
      const { count, error } = await supabase()
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', destinatarioId)
        .is('read_at', null)
      conferir({ error })
      return count ?? 0
    },

    async marcarComoLida(id) {
      conferir(await supabase().rpc('mark_notification_read', { p_id: id }))
      return paraNotificacao(exigir(await supabase().from('notifications').select('*').eq('id', id).maybeSingle()))
    },

    async marcarTodasComoLidas() {
      conferir(await supabase().rpc('mark_all_notifications_read'))
    },

    async enviar(dados) {
      return paraNotificacao(
        exigir(
          await supabase()
            .from('notifications')
            .insert({
              recipient_id: dados.destinatarioId,
              type: dados.tipo,
              title: dados.titulo,
              message: dados.mensagem,
              client_id: ouNulo(dados.clienteId),
              process_id: ouNulo(dados.processoId),
              link: ouNulo(dados.link),
            })
            .select()
            .single(),
        ),
      )
    },
  }
}

/* -- Calendário ------------------------------------------------------------------ */

export function criarCalendario(): ServicoCalendario {
  return {
    async listar(filtros) {
      // Área do cliente: sem leitura direta da agenda; RPC com o recorte dele.
      if (filtros.apenasVisiveisAoCliente) {
        const linhas = exigir(
          await supabase().rpc('portal_events', { p_from: filtros.de, p_to: filtros.ate }),
        ) as unknown as Array<Tables<'calendar_events'> & { process_code: string | null }>
        return linhas.map<EventoListado>((linha) => ({
          ...paraEvento(linha),
          processoCodigo: linha.process_code ?? undefined,
        }))
      }

      let consulta = supabase()
        .from('calendar_event_list')
        .select('*')
        .gte('event_date', filtros.de)
        .lte('event_date', filtros.ate)
      if (filtroAtivo(filtros.tipo)) consulta = consulta.eq('type', filtros.tipo)
      if (filtroAtivo(filtros.responsavelId)) consulta = consulta.eq('responsible_id', filtros.responsavelId)
      if (filtros.clienteId) consulta = consulta.eq('client_id', filtros.clienteId)

      const linhas = exigir(
        await consulta.order('event_date').order('event_time', { nullsFirst: true }),
      )
      return linhas.map(paraEventoListado)
    },

    async criar(dados) {
      return paraEvento(
        exigir(
          await supabase()
            .from('calendar_events')
            .insert({
              title: dados.titulo.trim(),
              description: ouNulo(dados.descricao),
              event_date: dados.data,
              event_time: ouNulo(dados.hora),
              type: dados.tipo,
              visibility: dados.visibilidade,
              client_id: ouNulo(dados.clienteId),
              process_id: ouNulo(dados.processoId),
              subprocess_id: ouNulo(dados.subprocessoId),
              responsible_id: ouNulo(dados.responsavelId),
              location: ouNulo(dados.local),
            })
            .select()
            .single(),
        ),
      )
    },

    async atualizar(id, dados) {
      const alteracoes: TablesUpdate<'calendar_events'> = {}
      if ('titulo' in dados) alteracoes.title = dados.titulo?.trim()
      if ('descricao' in dados) alteracoes.description = ouNulo(dados.descricao)
      if ('data' in dados) alteracoes.event_date = dados.data
      if ('hora' in dados) alteracoes.event_time = ouNulo(dados.hora)
      if ('tipo' in dados) alteracoes.type = dados.tipo
      if ('visibilidade' in dados) alteracoes.visibility = dados.visibilidade
      if ('clienteId' in dados) alteracoes.client_id = ouNulo(dados.clienteId)
      if ('processoId' in dados) alteracoes.process_id = ouNulo(dados.processoId)
      if ('subprocessoId' in dados) alteracoes.subprocess_id = ouNulo(dados.subprocessoId)
      if ('responsavelId' in dados) alteracoes.responsible_id = ouNulo(dados.responsavelId)
      if ('local' in dados) alteracoes.location = ouNulo(dados.local)
      return paraEvento(
        exigir(await supabase().from('calendar_events').update(alteracoes).eq('id', id).select().single()),
      )
    },

    async alterarStatus(id, status) {
      return paraEvento(
        exigir(await supabase().from('calendar_events').update({ status }).eq('id', id).select().single()),
      )
    },

    async remover(id) {
      conferir(await supabase().rpc('remove_calendar_event', { p_id: id }))
    },
  }
}
