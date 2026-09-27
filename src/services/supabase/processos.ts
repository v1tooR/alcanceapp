import { rotularSerie } from '@/lib/meses'
import type { ResumoProcessos, ServicoProcessos } from '@/services/contratos'
import type { ProcessoDetalhado } from '@/types/domain'
import type { Json, TablesUpdate } from './database.types'
import { supabase } from './cliente'
import { conferir, exigir } from './erros'
import { filtroAtivo, intervalo, padraoBusca, paginar } from './listagem'
import {
  ouNulo,
  paraCliente,
  paraDocumento,
  paraEtapa,
  paraFinanceiro,
  paraMovimentacao,
  paraProcesso,
  paraProcessoListado,
  paraSubprocesso,
  paraUsuario,
} from './mapeadores'

const ORDENACAO = {
  abertoEm: 'opened_at',
  atualizadoEm: 'updated_at',
  prazoFinal: 'due_date',
  prioridade: 'priority_rank',
} as const

async function obterProcesso(id: string) {
  return paraProcesso(exigir(await supabase().from('processes').select('*').eq('id', id).maybeSingle()))
}
async function obterSubprocesso(id: string) {
  return paraSubprocesso(exigir(await supabase().from('subprocesses').select('*').eq('id', id).maybeSingle()))
}
async function obterEtapa(id: string) {
  return paraEtapa(exigir(await supabase().from('process_steps').select('*').eq('id', id).maybeSingle()))
}

/** Processo completo para a tela de detalhe da equipe. */
export async function carregarProcessoDetalhado(id: string): Promise<ProcessoDetalhado> {
  const sb = supabase()
  const processo = exigir(await sb.from('processes').select('*').eq('id', id).maybeSingle())

  const [cliente, responsavel, subprocessos, documentos, movimentacoes, financeiro] = await Promise.all([
    sb.from('client_list').select('*').eq('id', processo.client_id).maybeSingle(),
    processo.responsible_id
      ? sb.from('profiles').select('*').eq('id', processo.responsible_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from('subprocesses').select('*').eq('process_id', id).order('created_at').order('type'),
    sb.from('documents').select('*').eq('process_id', id).order('updated_at', { ascending: false }),
    sb.from('process_movements').select('*').eq('process_id', id).order('created_at', { ascending: false }),
    // Analista não lê o financeiro (RLS): a lista vem vazia.
    sb.from('financial_records').select('*').eq('process_id', id).order('created_at'),
  ])

  const subs = exigir(subprocessos)
  const etapas = subs.length
    ? exigir(
        await sb
          .from('process_steps')
          .select('*')
          .in('subprocess_id', subs.map((sub) => sub.id))
          .order('position'),
      )
    : []

  if (responsavel.error) throw responsavel.error
  return {
    ...paraProcesso(processo),
    cliente: paraCliente(exigir(cliente)),
    responsavel: responsavel.data ? paraUsuario(responsavel.data) : undefined,
    subprocessos: subs.map((sub) => ({
      ...paraSubprocesso(sub),
      etapas: etapas.filter((etapa) => etapa.subprocess_id === sub.id).map(paraEtapa),
    })),
    documentos: exigir(documentos).map(paraDocumento),
    movimentacoes: exigir(movimentacoes).map(paraMovimentacao),
    financeiro: (financeiro.data ?? []).map(paraFinanceiro),
  }
}

export function criarProcessos(): ServicoProcessos {
  return {
    async resumo() {
      const resumo = exigir(await supabase().rpc('process_stats')) as unknown as Omit<
        ResumoProcessos,
        'abertosPorMes' | 'concluidosPorMes'
      > & {
        abertosPorMes: Array<{ chave: string; valor: number }>
        concluidosPorMes: Array<{ chave: string; valor: number }>
      }
      return {
        ...resumo,
        abertosPorMes: rotularSerie(resumo.abertosPorMes),
        concluidosPorMes: rotularSerie(resumo.concluidosPorMes),
      }
    },

    async listar(filtros) {
      const { pagina = 1, tamanhoPagina = 25, ordenarPor = 'atualizadoEm', ordem = 'desc' } = filtros
      let consulta = supabase().from('process_list').select('*', { count: 'exact' })

      const busca = padraoBusca(filtros.termo)
      if (busca) consulta = consulta.ilike('search_text', busca)
      if (filtroAtivo(filtros.status)) consulta = consulta.eq('status', filtros.status)
      if (filtroAtivo(filtros.prioridade)) consulta = consulta.eq('priority', filtros.prioridade)
      if (filtroAtivo(filtros.responsavelId)) consulta = consulta.eq('responsible_id', filtros.responsavelId)
      if (filtros.clienteId) consulta = consulta.eq('client_id', filtros.clienteId)
      if (filtroAtivo(filtros.tipoSubprocesso)) consulta = consulta.contains('subprocess_types', [filtros.tipoSubprocesso])
      if (filtros.somenteComPendencia) consulta = consulta.eq('has_pending_items', true)
      if (filtros.somentePrazoVencido) consulta = consulta.eq('is_overdue', true)

      const resultado = await consulta
        // Sem prazo fica no fim na ordem crescente (como no restante do app).
        .order(ORDENACAO[ordenarPor], { ascending: ordem === 'asc', nullsFirst: ordem === 'desc' })
        .order('id')
        .range(...intervalo(pagina, tamanhoPagina))
      return paginar(resultado, paraProcessoListado, pagina, tamanhoPagina)
    },

    obter: carregarProcessoDetalhado,

    async criar(dados) {
      const id = exigir(await supabase().rpc('create_process', { p_data: dados as unknown as Json }))
      return obterProcesso(id)
    },

    async atualizar(id, dados) {
      const alteracoes: TablesUpdate<'processes'> = {}
      if ('titulo' in dados) alteracoes.title = dados.titulo?.trim()
      if ('prioridade' in dados) alteracoes.priority = dados.prioridade
      if ('responsavelId' in dados) alteracoes.responsible_id = ouNulo(dados.responsavelId)
      if ('prazoFinal' in dados) alteracoes.due_date = ouNulo(dados.prazoFinal)
      if ('resumoPublico' in dados) alteracoes.public_summary = ouNulo(dados.resumoPublico)
      if ('observacoesInternas' in dados) alteracoes.internal_notes = ouNulo(dados.observacoesInternas)
      return paraProcesso(exigir(await supabase().from('processes').update(alteracoes).eq('id', id).select().single()))
    },

    async alterarStatus(id, status, nota) {
      conferir(await supabase().rpc('change_process_status', { p_id: id, p_status: status, p_note: nota ?? undefined }))
      return obterProcesso(id)
    },

    async adicionarSubprocesso(dados) {
      const id = exigir(await supabase().rpc('add_subprocess', { p_data: dados as unknown as Json }))
      return obterSubprocesso(id)
    },

    async atualizarSubprocesso(id, dados) {
      const alteracoes: TablesUpdate<'subprocesses'> = {}
      if ('responsavelId' in dados) alteracoes.responsible_id = ouNulo(dados.responsavelId)
      if ('orgao' in dados) alteracoes.agency = ouNulo(dados.orgao)
      if ('protocolo' in dados) alteracoes.protocol_number = ouNulo(dados.protocolo)
      if ('prazo' in dados) alteracoes.due_date = ouNulo(dados.prazo)
      if ('proximaAcao' in dados) alteracoes.next_action = ouNulo(dados.proximaAcao)
      if ('responsavelProximaAcao' in dados) alteracoes.next_action_owner = dados.responsavelProximaAcao ?? null
      if ('motivoBloqueio' in dados) alteracoes.block_reason = ouNulo(dados.motivoBloqueio)
      if ('observacoesInternas' in dados) alteracoes.internal_notes = ouNulo(dados.observacoesInternas)
      return paraSubprocesso(
        exigir(await supabase().from('subprocesses').update(alteracoes).eq('id', id).select().single()),
      )
    },

    async alterarStatusSubprocesso(id, status, nota) {
      conferir(await supabase().rpc('change_subprocess_status', { p_id: id, p_status: status, p_note: nota ?? undefined }))
      return obterSubprocesso(id)
    },

    async adicionarEtapa(dados) {
      return paraEtapa(
        exigir(
          await supabase()
            .from('process_steps')
            .insert({
              subprocess_id: dados.subprocessoId,
              title: dados.titulo.trim(),
              description: ouNulo(dados.descricao),
              responsible_id: ouNulo(dados.responsavelId),
              due_date: ouNulo(dados.prazo),
              visible_to_client: dados.visivelCliente,
            })
            .select()
            .single(),
        ),
      )
    },

    async atualizarEtapa(id, dados) {
      const alteracoes: TablesUpdate<'process_steps'> = {}
      if ('titulo' in dados) alteracoes.title = dados.titulo?.trim()
      if ('descricao' in dados) alteracoes.description = ouNulo(dados.descricao)
      if ('responsavelId' in dados) alteracoes.responsible_id = ouNulo(dados.responsavelId)
      if ('prazo' in dados) alteracoes.due_date = ouNulo(dados.prazo)
      if ('observacao' in dados) alteracoes.client_note = ouNulo(dados.observacao)
      if ('observacoesInternas' in dados) alteracoes.internal_notes = ouNulo(dados.observacoesInternas)
      if ('visivelCliente' in dados) alteracoes.visible_to_client = dados.visivelCliente
      return paraEtapa(exigir(await supabase().from('process_steps').update(alteracoes).eq('id', id).select().single()))
    },

    async alterarStatusEtapa(id, status, nota) {
      conferir(await supabase().rpc('change_step_status', { p_id: id, p_status: status, p_note: nota ?? undefined }))
      return obterEtapa(id)
    },

    async removerEtapa(id) {
      conferir(await supabase().rpc('remove_step', { p_id: id }))
    },
  }
}
