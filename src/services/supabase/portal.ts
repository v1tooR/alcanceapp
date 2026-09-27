import { ErroDeServico } from '@/services/erros'
import type { ServicoPortal, VisaoPortal } from '@/services/contratos'
import type { ProcessoDetalhado } from '@/types/domain'
import type { Tables } from './database.types'
import { enviarArquivoDocumento } from './arquivos'
import { supabase } from './cliente'
import { exigir } from './erros'
import {
  paraCliente,
  paraDocumento,
  paraEtapa,
  paraEvento,
  paraMovimentacao,
  paraProcesso,
  paraSubprocesso,
  paraUsuario,
} from './mapeadores'

/**
 * Área do cliente.
 *
 * O cliente não lê as tabelas diretamente: as RPCs `portal_*` descobrem o
 * cliente pela sessão e devolvem só o recorte liberado (sem observações
 * internas, etapas ocultas, documentos internos nem financeiro). O
 * `clienteId` dos contratos é conferido, nunca usado como filtro.
 */

type SubprocessoPortal = Tables<'subprocesses'> & { steps: Array<Tables<'process_steps'>> }

interface VisaoBruta {
  client: Tables<'client_list'>
  processes: Array<Tables<'processes'> & { subprocesses: SubprocessoPortal[]; progress: number }>
  pending_documents: Array<Tables<'documents'>>
  upcoming_events: Array<Tables<'calendar_events'>>
  unread: number
}

interface ProcessoBruto extends Tables<'processes'> {
  client: Tables<'client_list'>
  responsible: Partial<Tables<'profiles'>> | null
  subprocesses: SubprocessoPortal[]
  documents: Array<Tables<'documents'>>
  movements: Array<Tables<'process_movements'>>
}

const paraSubprocessoPortal = (sub: SubprocessoPortal) => ({
  ...paraSubprocesso(sub),
  etapas: sub.steps.map(paraEtapa),
})

async function conferirCliente(clienteId: string) {
  const { data } = await supabase().auth.getSession()
  const perfil = data.session
    ? (await supabase().from('profiles').select('client_id').eq('id', data.session.user.id).maybeSingle()).data
    : null
  if (!perfil || perfil.client_id !== clienteId) {
    throw new ErroDeServico('Você não tem permissão para esta ação.', 'nao_autorizado', 403)
  }
}

export function criarPortal(): ServicoPortal {
  return {
    async visaoGeral(clienteId) {
      const bruto = exigir(await supabase().rpc('portal_overview')) as unknown as VisaoBruta
      if (bruto.client?.id !== clienteId) {
        throw new ErroDeServico('Você não tem permissão para esta ação.', 'nao_autorizado', 403)
      }
      return {
        cliente: paraCliente(bruto.client),
        processos: bruto.processes.map((processo) => ({
          ...paraProcesso(processo),
          subprocessos: processo.subprocesses.map(paraSubprocessoPortal),
          progresso: processo.progress,
        })),
        documentosPendentes: bruto.pending_documents.map(paraDocumento),
        proximosEventos: bruto.upcoming_events.map(paraEvento),
        naoLidas: bruto.unread,
      } satisfies VisaoPortal
    },

    async processo(clienteId, processoId) {
      const bruto = exigir(
        await supabase().rpc('portal_process', { p_process_id: processoId }),
      ) as unknown as ProcessoBruto
      if (bruto.client_id !== clienteId) {
        throw new ErroDeServico('Processo não encontrado.', 'nao_encontrado', 404)
      }
      return {
        ...paraProcesso(bruto),
        cliente: paraCliente(bruto.client),
        responsavel: bruto.responsible ? paraUsuario(bruto.responsible) : undefined,
        subprocessos: bruto.subprocesses.map(paraSubprocessoPortal),
        documentos: bruto.documents.map(paraDocumento),
        movimentacoes: bruto.movements.map(paraMovimentacao),
        financeiro: [],
      } satisfies ProcessoDetalhado
    },

    async documentos() {
      const linhas = exigir(await supabase().rpc('portal_documents')) as unknown as Array<Tables<'documents'>>
      return linhas.map(paraDocumento)
    },

    async enviarDocumento(clienteId, documentoId, arquivo) {
      await conferirCliente(clienteId)
      await enviarArquivoDocumento(clienteId, documentoId, arquivo)
      const linhas = exigir(await supabase().rpc('portal_documents')) as unknown as Array<Tables<'documents'>>
      const documento = linhas.find((linha) => linha.id === documentoId)
      if (!documento) throw new ErroDeServico('Documento não encontrado.', 'nao_encontrado', 404)
      return paraDocumento(documento)
    },
  }
}
