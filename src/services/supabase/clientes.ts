import { rotularSerie } from '@/lib/meses'
import { ErroDeServico } from '@/services/erros'
import type { EntradaCliente, ResumoClientes, ServicoClientes } from '@/services/contratos'
import type { Json } from './database.types'
import { supabase } from './cliente'
import { exigir } from './erros'
import { invocar } from './funcoes'
import { filtroAtivo, intervalo, padraoBusca, paginar } from './listagem'
import { paraCliente, paraClienteComResumo } from './mapeadores'
import { carregarUsuarios } from './usuarios'

const ORDENACAO = {
  nome: 'full_name',
  criadoEm: 'created_at',
  ultimaMovimentacao: 'last_movement_at',
} as const

async function obterLinha(id: string) {
  return exigir(await supabase().from('client_list').select('*').eq('id', id).maybeSingle())
}

/** Acesso ao portal cria contas no Auth: Edge Function `portal-access`. */
async function definirAcesso(clienteId: string, ativo: boolean) {
  await invocar('portal-access', { clienteId, ativo })
}

/** O acesso ao portal não vai para `save_client`: tem fluxo próprio. */
function semAcesso(dados: Partial<EntradaCliente>): Json {
  const { acessoPortalAtivo: _ignorado, ...resto } = dados
  return resto as unknown as Json
}

export function criarClientes(): ServicoClientes {
  return {
    async resumo() {
      const resumo = exigir(await supabase().rpc('client_stats')) as unknown as Omit<ResumoClientes, 'novosPorMes'> & {
        novosPorMes: Array<{ chave: string; valor: number }>
      }
      return { ...resumo, novosPorMes: rotularSerie(resumo.novosPorMes) }
    },

    async listar(filtros) {
      const { pagina = 1, tamanhoPagina = 25, ordenarPor = 'nome', ordem = 'asc' } = filtros
      let consulta = supabase().from('client_list').select('*', { count: 'exact' })

      const busca = padraoBusca(filtros.termo)
      if (busca) consulta = consulta.ilike('search_text', busca)
      if (filtroAtivo(filtros.situacao)) consulta = consulta.eq('status', filtros.situacao)
      if (filtroAtivo(filtros.tipo)) consulta = consulta.eq('type', filtros.tipo)
      if (filtroAtivo(filtros.responsavelId)) consulta = consulta.eq('responsible_id', filtros.responsavelId)

      const resultado = await consulta
        .order(ORDENACAO[ordenarPor], { ascending: ordem === 'asc', nullsFirst: false })
        .order('id')
        .range(...intervalo(pagina, tamanhoPagina))

      const responsaveis = await carregarUsuarios((resultado.data ?? []).map((linha) => linha.responsible_id ?? undefined))
      return paginar(
        resultado,
        (linha) => paraClienteComResumo(linha, linha.responsible_id ? responsaveis.get(linha.responsible_id) : undefined),
        pagina,
        tamanhoPagina,
      )
    },

    async obter(id) {
      const linha = await obterLinha(id)
      const responsaveis = await carregarUsuarios([linha.responsible_id ?? undefined])
      return paraClienteComResumo(linha, linha.responsible_id ? responsaveis.get(linha.responsible_id) : undefined)
    },

    async criar(dados) {
      const id = exigir(await supabase().rpc('save_client', { p_id: null as unknown as string, p_data: semAcesso(dados) }))
      const cliente = paraCliente(await obterLinha(id))

      if (dados.acessoPortalAtivo) {
        try {
          await definirAcesso(id, true)
          return paraCliente(await obterLinha(id))
        } catch (erro) {
          const motivo = erro instanceof ErroDeServico ? ` ${erro.message}` : ''
          throw new ErroDeServico(
            `Cliente cadastrado (${cliente.codigo}), mas o acesso ao portal não foi liberado.${motivo} Libere pela ficha do cliente.`,
            'conflito',
          )
        }
      }
      return cliente
    },

    async atualizar(id, dados) {
      const atual = paraCliente(await obterLinha(id))
      exigir(await supabase().rpc('save_client', { p_id: id, p_data: semAcesso(dados) }))
      if (dados.acessoPortalAtivo !== undefined && dados.acessoPortalAtivo !== atual.acessoPortalAtivo) {
        await definirAcesso(id, dados.acessoPortalAtivo)
      }
      return paraCliente(await obterLinha(id))
    },

    async definirAcessoPortal(id, ativo) {
      await definirAcesso(id, ativo)
      return paraCliente(await obterLinha(id))
    },

    async opcoes() {
      const linhas = exigir(
        await supabase().from('clients').select('id, full_name, code').eq('status', 'ativo').order('full_name'),
      )
      return linhas.map((linha) => ({ id: linha.id, nome: linha.full_name, codigo: linha.code }))
    },
  }
}
