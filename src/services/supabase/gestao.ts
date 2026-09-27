import { rotularSerie } from '@/lib/meses'
import type {
  PainelAnalitico,
  PontoSerieMensal,
  ResumoFinanceiro,
  ServicoFinanceiro,
  ServicoIntegracoes,
  ServicoPainel,
} from '@/services/contratos'
import type { Integracao, PendenciaPainel, ResumoPainel } from '@/types/domain'
import type { Json, TablesUpdate } from './database.types'
import { supabase } from './cliente'
import { conferir, exigir } from './erros'
import { invocar } from './funcoes'
import { filtroAtivo, intervalo, padraoBusca, paginar } from './listagem'
import { ouNulo, paraFinanceiro, paraFinanceiroListado } from './mapeadores'

/* -- Painel inicial -------------------------------------------------------------- */

export function criarPainel(): ServicoPainel {
  return {
    async resumo() {
      return exigir(await supabase().rpc('dashboard_summary')) as unknown as ResumoPainel
    },

    async pendencias(limite = 12) {
      return exigir(await supabase().rpc('dashboard_pending_items', { p_limit: limite })) as unknown as PendenciaPainel[]
    },

    async analitico(meses) {
      const dados = exigir(await supabase().rpc('dashboard_analytics', { p_months: meses })) as unknown as Omit<
        PainelAnalitico,
        'serie'
      > & { serie: Array<Omit<PontoSerieMensal, 'rotulo' | 'rotuloCompleto' | 'parcial'>> }
      return { ...dados, serie: rotularSerie(dados.serie) }
    },
  }
}

/* -- Financeiro (informativo) ---------------------------------------------------- */

export function criarFinanceiro(): ServicoFinanceiro {
  return {
    async listar(filtros) {
      const { pagina = 1, tamanhoPagina = 25 } = filtros
      let consulta = supabase().from('financial_list').select('*', { count: 'exact' })

      const busca = padraoBusca(filtros.termo)
      if (busca) consulta = consulta.ilike('search_text', busca)
      if (filtroAtivo(filtros.status)) consulta = consulta.eq('status', filtros.status)
      if (filtros.clienteId) consulta = consulta.eq('client_id', filtros.clienteId)
      if (filtros.processoId) consulta = consulta.eq('process_id', filtros.processoId)

      const resultado = await consulta
        .order('due_date', { ascending: false, nullsFirst: false })
        .order('id')
        .range(...intervalo(pagina, tamanhoPagina))
      return paginar(resultado, paraFinanceiroListado, pagina, tamanhoPagina)
    },

    async resumo() {
      const resumo = exigir(await supabase().rpc('finance_stats')) as unknown as ResumoFinanceiro
      return { ...resumo, serieMensal: rotularSerie(resumo.serieMensal) }
    },

    async criar(dados) {
      return paraFinanceiro(
        exigir(
          await supabase()
            .from('financial_records')
            .insert({
              client_id: dados.clienteId,
              process_id: ouNulo(dados.processoId),
              description: dados.descricao.trim(),
              total_amount: dados.valorTotal,
              discount: dados.desconto,
              amount_paid: dados.valorPago,
              status: dados.status,
              payment_method: dados.formaPagamento ?? null,
              due_date: ouNulo(dados.vencimento),
              paid_at: ouNulo(dados.pagoEm),
              notes: ouNulo(dados.observacoes),
            })
            .select()
            .single(),
        ),
      )
    },

    async atualizar(id, dados) {
      const alteracoes: TablesUpdate<'financial_records'> = {}
      if ('clienteId' in dados) alteracoes.client_id = dados.clienteId
      if ('processoId' in dados) alteracoes.process_id = ouNulo(dados.processoId)
      if ('descricao' in dados) alteracoes.description = dados.descricao?.trim()
      if ('valorTotal' in dados) alteracoes.total_amount = dados.valorTotal
      if ('desconto' in dados) alteracoes.discount = dados.desconto
      if ('valorPago' in dados) alteracoes.amount_paid = dados.valorPago
      if ('status' in dados) alteracoes.status = dados.status
      if ('formaPagamento' in dados) alteracoes.payment_method = dados.formaPagamento ?? null
      if ('vencimento' in dados) alteracoes.due_date = ouNulo(dados.vencimento)
      if ('pagoEm' in dados) alteracoes.paid_at = ouNulo(dados.pagoEm)
      if ('observacoes' in dados) alteracoes.notes = ouNulo(dados.observacoes)
      return paraFinanceiro(
        exigir(await supabase().from('financial_records').update(alteracoes).eq('id', id).select().single()),
      )
    },

    async remover(id) {
      conferir(await supabase().rpc('remove_financial_record', { p_id: id }))
    },
  }
}

/* -- Integrações ------------------------------------------------------------------- */

interface SituacaoIntegracao {
  chave: string
  disponivel: boolean
  detalhe: string
  provedoresDisponiveis: string[]
  segredos: Array<{ nome: string; configurado: boolean | null }>
}

export function criarIntegracoes(): ServicoIntegracoes {
  return {
    async listar() {
      const [linhas, situacoes] = await Promise.all([
        supabase().from('integrations').select('*').order('name'),
        invocar<SituacaoIntegracao[]>('integrations-status'),
      ])
      const porChave = new Map(situacoes.map((situacao) => [situacao.chave, situacao]))
      return exigir(linhas).map<Integracao>((linha) => {
        const situacao = porChave.get(linha.key)
        return {
          id: linha.id,
          chave: linha.key,
          nome: linha.name,
          categoria: linha.category as Integracao['categoria'],
          provedor: linha.provider,
          descricao: linha.description ?? undefined,
          habilitada: linha.enabled,
          configuracao: (linha.config ?? {}) as Record<string, unknown>,
          atualizadaEm: linha.updated_at,
          disponivel: situacao?.disponivel ?? false,
          detalhe: situacao?.detalhe ?? 'Situação indisponível.',
          provedoresDisponiveis: situacao?.provedoresDisponiveis ?? [linha.provider],
          segredos: situacao?.segredos ?? linha.secret_names.map((nome) => ({ nome, configurado: null })),
        }
      })
    },

    async atualizar(id, dados) {
      const alteracoes: TablesUpdate<'integrations'> = {}
      if (dados.habilitada !== undefined) alteracoes.enabled = dados.habilitada
      if (dados.provedor !== undefined) alteracoes.provider = dados.provedor
      if (dados.configuracao !== undefined) alteracoes.config = dados.configuracao as { [chave: string]: Json }
      conferir(await supabase().from('integrations').update(alteracoes).eq('id', id))
    },
  }
}
