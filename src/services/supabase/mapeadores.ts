import { ROTULO_STATUS_PROCESSO, ROTULO_STATUS_SUBPROCESSO } from '@/lib/rotulos'
import type {
  Cliente,
  ClienteComResumo,
  Documento,
  Etapa,
  EventoCalendario,
  Movimentacao,
  Notificacao,
  Processo,
  RegistroFinanceiro,
  Subprocesso,
  UF,
  Usuario,
} from '@/types/domain'
import type { DocumentoListado, EventoListado, ProcessoListado, RegistroFinanceiroListado } from '@/services/contratos'
import type { Tables } from './database.types'

/**
 * Linha do banco (inglês, snake_case) → modelo de domínio (src/types/domain.ts).
 *
 * As views devolvem todas as colunas como anuláveis; os tipos de entrada são
 * parciais para aceitar tanto tabelas quanto views e o JSON das RPCs do portal.
 */

type Parcial<T> = { [K in keyof T]?: T[K] | null }

/** `null` do banco → `undefined` do domínio (campos opcionais). */
const opt = <T>(valor: T | null | undefined): T | undefined => (valor === null ? undefined : valor)
const txt = (valor: string | null | undefined): string => valor ?? ''

export function paraUsuario(p: Parcial<Tables<'profiles'>>): Usuario {
  return {
    id: txt(p.id),
    nome: txt(p.full_name),
    email: txt(p.email),
    telefone: opt(p.phone),
    papel: p.role ?? 'analista',
    cargo: opt(p.job_title),
    ativo: p.active ?? false,
    clienteId: opt(p.client_id),
    criadoEm: txt(p.created_at),
    ultimoAcessoEm: opt(p.last_access_at),
  }
}

type LinhaCliente = Parcial<Tables<'client_list'>>

export function paraCliente(c: LinhaCliente): Cliente {
  const temEndereco = Boolean(c.address_zip || c.address_street)
  return {
    id: txt(c.id),
    codigo: txt(c.code),
    nome: txt(c.full_name),
    cpf: txt(c.cpf),
    rg: opt(c.rg),
    dataNascimento: opt(c.birth_date),
    email: txt(c.email),
    telefone: txt(c.phone),
    tipo: c.type ?? 'condutor',
    situacao: c.status ?? 'ativo',
    endereco: temEndereco
      ? {
          cep: txt(c.address_zip),
          logradouro: txt(c.address_street),
          numero: txt(c.address_number),
          complemento: opt(c.address_complement),
          bairro: txt(c.address_district),
          cidade: txt(c.address_city),
          uf: (c.address_state ?? 'SP') as UF,
        }
      : undefined,
    responsavelId: opt(c.responsible_id),
    perfilAssistido: c.has_health_profile
      ? {
          categorias: c.disability_categories ?? [],
          observacoes: opt(c.health_notes),
          possuiLaudo: c.has_medical_report ?? false,
          laudoValidoAte: opt(c.medical_report_valid_until),
        }
      : undefined,
    observacoesInternas: opt(c.internal_notes),
    acessoPortalAtivo: c.portal_access_enabled ?? false,
    criadoEm: txt(c.created_at),
    atualizadoEm: txt(c.updated_at),
  }
}

export function paraClienteComResumo(c: LinhaCliente, responsavel?: Usuario): ClienteComResumo {
  return {
    ...paraCliente(c),
    responsavel,
    totalProcessos: c.total_processes ?? 0,
    processosAtivos: c.active_processes ?? 0,
    documentosPendentes: c.pending_documents ?? 0,
    ultimaMovimentacaoEm: opt(c.last_movement_at),
  }
}

export function paraProcesso(p: Parcial<Tables<'processes'>>): Processo {
  return {
    id: txt(p.id),
    codigo: txt(p.code),
    clienteId: txt(p.client_id),
    titulo: txt(p.title),
    status: p.status ?? 'em_avaliacao',
    prioridade: p.priority ?? 'normal',
    responsavelId: opt(p.responsible_id),
    abertoEm: txt(p.opened_at),
    prazoFinal: opt(p.due_date),
    concluidoEm: opt(p.concluded_at),
    resumoPublico: opt(p.public_summary),
    observacoesInternas: opt(p.internal_notes),
    atualizadoEm: txt(p.updated_at),
  }
}

export function paraProcessoListado(p: Parcial<Tables<'process_list'>>): ProcessoListado {
  return {
    ...paraProcesso(p),
    clienteNome: txt(p.client_name),
    clienteCodigo: txt(p.client_code),
    responsavelNome: opt(p.responsible_name),
    totalSubprocessos: p.total_subprocesses ?? 0,
    subprocessosConcluidos: p.completed_subprocesses ?? 0,
    documentosPendentes: p.pending_documents ?? 0,
    progresso: p.progress ?? 0,
    tiposSubprocesso: p.subprocess_types ?? [],
  }
}

export function paraSubprocesso(s: Parcial<Tables<'subprocesses'>>): Subprocesso {
  return {
    id: txt(s.id),
    processoId: txt(s.process_id),
    tipo: s.type ?? 'avaliacao_inicial',
    status: s.status ?? 'nao_iniciado',
    responsavelId: opt(s.responsible_id),
    orgao: opt(s.agency),
    protocolo: opt(s.protocol_number),
    iniciadoEm: opt(s.started_at),
    concluidoEm: opt(s.concluded_at),
    prazo: opt(s.due_date),
    proximaAcao: opt(s.next_action),
    responsavelProximaAcao: opt(s.next_action_owner),
    motivoBloqueio: opt(s.block_reason),
    observacoesInternas: opt(s.internal_notes),
    atualizadoEm: txt(s.updated_at),
  }
}

export function paraEtapa(e: Parcial<Tables<'process_steps'>>): Etapa {
  return {
    id: txt(e.id),
    subprocessoId: txt(e.subprocess_id),
    titulo: txt(e.title),
    descricao: opt(e.description),
    ordem: e.position ?? 0,
    status: e.status ?? 'pendente',
    responsavelId: opt(e.responsible_id),
    prazo: opt(e.due_date),
    concluidaEm: opt(e.completed_at),
    observacao: opt(e.client_note),
    observacoesInternas: opt(e.internal_notes),
    visivelCliente: e.visible_to_client ?? false,
  }
}

export function paraDocumento(d: Parcial<Tables<'documents'>>): Documento {
  return {
    id: txt(d.id),
    clienteId: txt(d.client_id),
    processoId: opt(d.process_id),
    subprocessoId: opt(d.subprocess_id),
    etapaId: opt(d.step_id),
    tipo: d.type ?? 'outro',
    titulo: txt(d.title),
    status: d.status ?? 'solicitado',
    visibilidade: d.visibility ?? 'interno',
    sensivel: d.is_sensitive ?? false,
    arquivoNome: opt(d.file_name),
    arquivoTamanhoBytes: opt(d.file_size_bytes),
    arquivoMime: opt(d.file_mime),
    arquivoDisponivel: Boolean(d.file_path),
    solicitadoEm: opt(d.requested_at),
    solicitadoPorId: opt(d.requested_by),
    prazoEnvio: opt(d.upload_deadline),
    enviadoEm: opt(d.uploaded_at),
    enviadoPorId: opt(d.uploaded_by),
    analisadoEm: opt(d.reviewed_at),
    analisadoPorId: opt(d.reviewed_by),
    motivoDevolucao: opt(d.return_reason),
    observacoesInternas: opt(d.internal_notes),
    atualizadoEm: txt(d.updated_at),
  }
}

export function paraDocumentoListado(d: Parcial<Tables<'document_list'>>): DocumentoListado {
  return {
    ...paraDocumento(d),
    clienteNome: txt(d.client_name),
    processoCodigo: opt(d.process_code),
    subprocessoTipo: opt(d.subprocess_type),
  }
}

/** O banco guarda valores de status; a linha do tempo mostra rótulos. */
function rotuloStatus(valor: string | null | undefined, doSubprocesso: boolean): string | undefined {
  if (!valor) return undefined
  const mapa: Record<string, string> = doSubprocesso ? ROTULO_STATUS_SUBPROCESSO : ROTULO_STATUS_PROCESSO
  return mapa[valor] ?? valor
}

export function paraMovimentacao(m: Parcial<Tables<'process_movements'>>): Movimentacao {
  return {
    id: txt(m.id),
    processoId: txt(m.process_id),
    subprocessoId: opt(m.subprocess_id),
    tipo: m.type ?? 'observacao',
    titulo: txt(m.title),
    descricao: opt(m.description),
    autorId: opt(m.author_id),
    de: rotuloStatus(m.from_status, Boolean(m.subprocess_id)),
    para: rotuloStatus(m.to_status, Boolean(m.subprocess_id)),
    visivelCliente: m.visible_to_client ?? false,
    criadoEm: txt(m.created_at),
  }
}

export function paraNotificacao(n: Parcial<Tables<'notifications'>>): Notificacao {
  return {
    id: txt(n.id),
    destinatarioId: txt(n.recipient_id),
    tipo: n.type ?? 'info',
    titulo: txt(n.title),
    mensagem: txt(n.message),
    lida: Boolean(n.read_at),
    clienteId: opt(n.client_id),
    processoId: opt(n.process_id),
    link: opt(n.link),
    criadoEm: txt(n.created_at),
  }
}

export function paraEvento(e: Parcial<Tables<'calendar_events'>>): EventoCalendario {
  return {
    id: txt(e.id),
    titulo: txt(e.title),
    descricao: opt(e.description),
    data: txt(e.event_date),
    // `time` chega como HH:MM:SS; a interface usa HH:mm.
    hora: e.event_time ? e.event_time.slice(0, 5) : undefined,
    tipo: e.type ?? 'outro',
    status: e.status ?? 'agendado',
    visibilidade: e.visibility ?? 'interno',
    clienteId: opt(e.client_id),
    processoId: opt(e.process_id),
    subprocessoId: opt(e.subprocess_id),
    responsavelId: opt(e.responsible_id),
    local: opt(e.location),
    criadoEm: txt(e.created_at),
  }
}

export function paraEventoListado(e: Parcial<Tables<'calendar_event_list'>>): EventoListado {
  return {
    ...paraEvento(e),
    clienteNome: opt(e.client_name),
    processoCodigo: opt(e.process_code),
    responsavelNome: opt(e.responsible_name),
  }
}

export function paraFinanceiro(f: Parcial<Tables<'financial_records'>>): RegistroFinanceiro {
  return {
    id: txt(f.id),
    clienteId: txt(f.client_id),
    processoId: opt(f.process_id),
    descricao: txt(f.description),
    valorTotal: Number(f.total_amount ?? 0),
    desconto: Number(f.discount ?? 0),
    valorPago: Number(f.amount_paid ?? 0),
    status: f.status ?? 'pendente',
    formaPagamento: opt(f.payment_method),
    vencimento: opt(f.due_date),
    pagoEm: opt(f.paid_at),
    observacoes: opt(f.notes),
    criadoEm: txt(f.created_at),
    atualizadoEm: txt(f.updated_at),
  }
}

export function paraFinanceiroListado(f: Parcial<Tables<'financial_list'>>): RegistroFinanceiroListado {
  return {
    ...paraFinanceiro(f),
    clienteNome: txt(f.client_name),
    processoCodigo: opt(f.process_code),
  }
}

/** Texto opcional de formulário → valor do banco (vazio vira `null`). */
export function ouNulo(valor: string | undefined | null): string | null {
  const limpo = valor?.trim()
  return limpo ? limpo : null
}
