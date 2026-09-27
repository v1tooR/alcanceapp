import { rotularSerie } from '@/lib/meses'
import type { ResumoDocumentos, ServicoDocumentos } from '@/services/contratos'
import { enviarArquivoDocumento } from './arquivos'
import { supabase } from './cliente'
import { conferir, exigir } from './erros'
import { invocar } from './funcoes'
import { filtroAtivo, intervalo, padraoBusca, paginar } from './listagem'
import { ouNulo, paraDocumento, paraDocumentoListado } from './mapeadores'

const ORDENACAO = {
  atualizadoEm: 'updated_at',
  prazoEnvio: 'upload_deadline',
  titulo: 'title',
} as const

async function obterDocumento(id: string) {
  return paraDocumento(exigir(await supabase().from('documents').select('*').eq('id', id).maybeSingle()))
}

export function criarDocumentos(): ServicoDocumentos {
  return {
    async resumo() {
      const resumo = exigir(await supabase().rpc('document_stats')) as unknown as Omit<ResumoDocumentos, 'recebidosPorMes'> & {
        recebidosPorMes: Array<{ chave: string; valor: number }>
      }
      return { ...resumo, recebidosPorMes: rotularSerie(resumo.recebidosPorMes) }
    },

    async listar(filtros) {
      const { pagina = 1, tamanhoPagina = 25, ordenarPor = 'atualizadoEm', ordem = 'desc' } = filtros
      let consulta = supabase().from('document_list').select('*', { count: 'exact' })

      const busca = padraoBusca(filtros.termo)
      if (busca) consulta = consulta.ilike('search_text', busca)
      if (filtroAtivo(filtros.status)) consulta = consulta.eq('status', filtros.status)
      if (filtroAtivo(filtros.tipo)) consulta = consulta.eq('type', filtros.tipo)
      if (filtros.clienteId) consulta = consulta.eq('client_id', filtros.clienteId)
      if (filtros.processoId) consulta = consulta.eq('process_id', filtros.processoId)
      if (filtros.subprocessoId) consulta = consulta.eq('subprocess_id', filtros.subprocessoId)
      if (filtros.somenteAguardandoAnalise) consulta = consulta.eq('awaiting_review', true)

      const resultado = await consulta
        .order(ORDENACAO[ordenarPor], { ascending: ordem === 'asc', nullsFirst: ordem === 'desc' })
        .order('id')
        .range(...intervalo(pagina, tamanhoPagina))
      return paginar(resultado, paraDocumentoListado, pagina, tamanhoPagina)
    },

    async obter(id) {
      return paraDocumentoListado(exigir(await supabase().from('document_list').select('*').eq('id', id).maybeSingle()))
    },

    async solicitar(dados) {
      return paraDocumento(
        exigir(
          await supabase()
            .from('documents')
            .insert({
              client_id: dados.clienteId,
              process_id: ouNulo(dados.processoId),
              subprocess_id: ouNulo(dados.subprocessoId),
              step_id: ouNulo(dados.etapaId),
              type: dados.tipo,
              title: dados.titulo.trim(),
              upload_deadline: ouNulo(dados.prazoEnvio),
              visibility: dados.visibilidade,
              is_sensitive: dados.sensivel,
              internal_notes: ouNulo(dados.observacoesInternas),
            })
            .select()
            .single(),
        ),
      )
    },

    async registrarEnvio(id, arquivo) {
      const documento = await obterDocumento(id)
      await enviarArquivoDocumento(documento.clienteId, id, arquivo)
      return obterDocumento(id)
    },

    async aprovar(id, observacoesInternas) {
      conferir(await supabase().rpc('approve_document', { p_id: id, p_internal_notes: observacoesInternas }))
      return obterDocumento(id)
    },

    async reprovar(id, motivo) {
      conferir(await supabase().rpc('reject_document', { p_id: id, p_reason: motivo }))
      return obterDocumento(id)
    },

    async solicitarReenvio(id, motivo, novoPrazo) {
      conferir(
        await supabase().rpc('request_document_resubmission', {
          p_id: id,
          p_reason: motivo,
          p_new_deadline: ouNulo(novoPrazo) ?? undefined,
        }),
      )
      return obterDocumento(id)
    },

    async colocarEmAnalise(id) {
      conferir(await supabase().rpc('start_document_review', { p_id: id }))
      return obterDocumento(id)
    },

    async alterarVisibilidade(id, visibilidade) {
      return paraDocumento(
        exigir(await supabase().from('documents').update({ visibility: visibilidade }).eq('id', id).select().single()),
      )
    },

    async abrirArquivo(id) {
      const { url } = await invocar<{ url: string }>('document-file', { documentoId: id })
      return url
    },
  }
}
