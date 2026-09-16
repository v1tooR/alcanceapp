import type {
  FormaPagamento,
  PapelUsuario,
  Prioridade,
  ResponsavelAcao,
  SituacaoCliente,
  StatusDocumento,
  StatusEtapa,
  StatusEvento,
  StatusFinanceiro,
  StatusProcesso,
  StatusSubprocesso,
  TipoCliente,
  TipoDocumento,
  TipoEvento,
  TipoMovimentacao,
  TipoNotificacao,
  TipoSubprocesso,
} from '@/types/domain'

/**
 * Rótulos pt-BR e tons semânticos do domínio.
 * Toda a interface lê daqui — nunca escreva um rótulo de status direto na tela.
 */

export type Tom = 'neutro' | 'info' | 'sucesso' | 'alerta' | 'perigo' | 'primario' | 'destaque'

/* -- Usuário --------------------------------------------------------------- */

export const ROTULO_PAPEL: Record<PapelUsuario, string> = {
  super_admin: 'Administrador geral',
  gestor: 'Gestor',
  analista: 'Analista',
  cliente: 'Cliente',
}

export const DESCRICAO_PAPEL: Record<PapelUsuario, string> = {
  super_admin: 'Acesso completo, incluindo equipe e configurações.',
  gestor: 'Operação completa e campos financeiros.',
  analista: 'Operação de clientes, processos e documentos.',
  cliente: 'Acesso apenas à própria área, pelo portal.',
}

/* -- Cliente --------------------------------------------------------------- */

export const ROTULO_TIPO_CLIENTE: Record<TipoCliente, string> = {
  condutor: 'Condutor',
  nao_condutor: 'Não condutor',
}

export const ROTULO_SITUACAO_CLIENTE: Record<SituacaoCliente, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
}

export const TOM_SITUACAO_CLIENTE: Record<SituacaoCliente, Tom> = {
  ativo: 'sucesso',
  inativo: 'neutro',
}

/* -- Processo -------------------------------------------------------------- */

export const ROTULO_STATUS_PROCESSO: Record<StatusProcesso, string> = {
  em_avaliacao: 'Em avaliação',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  aguardando_orgao: 'Aguardando órgão',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
  cancelado: 'Cancelado',
}

export const TOM_STATUS_PROCESSO: Record<StatusProcesso, Tom> = {
  em_avaliacao: 'info',
  em_andamento: 'primario',
  aguardando_cliente: 'alerta',
  aguardando_orgao: 'info',
  concluido: 'sucesso',
  arquivado: 'neutro',
  cancelado: 'perigo',
}

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const TOM_PRIORIDADE: Record<Prioridade, Tom> = {
  baixa: 'neutro',
  normal: 'info',
  alta: 'alerta',
  urgente: 'perigo',
}

/* -- Subprocesso ----------------------------------------------------------- */

export const ROTULO_TIPO_SUBPROCESSO: Record<TipoSubprocesso, string> = {
  avaliacao_inicial: 'Avaliação inicial',
  ipi: 'IPI',
  iof: 'IOF',
  icms: 'ICMS',
  ipva: 'IPVA',
  estacionamento_pcd: 'Cartão de estacionamento PCD',
  rodizio: 'Isenção de rodízio',
  recurso: 'Recurso',
}

export const ROTULO_CURTO_SUBPROCESSO: Record<TipoSubprocesso, string> = {
  avaliacao_inicial: 'Avaliação',
  ipi: 'IPI',
  iof: 'IOF',
  icms: 'ICMS',
  ipva: 'IPVA',
  estacionamento_pcd: 'Estacionamento',
  rodizio: 'Rodízio',
  recurso: 'Recurso',
}

export const ROTULO_STATUS_SUBPROCESSO: Record<StatusSubprocesso, string> = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  aguardando_documentos: 'Aguardando documentos',
  aguardando_orgao: 'Aguardando órgão',
  deferido: 'Deferido',
  indeferido: 'Indeferido',
  nao_aplicavel: 'Não aplicável',
  cancelado: 'Cancelado',
}

export const TOM_STATUS_SUBPROCESSO: Record<StatusSubprocesso, Tom> = {
  nao_iniciado: 'neutro',
  em_andamento: 'primario',
  aguardando_documentos: 'alerta',
  aguardando_orgao: 'info',
  deferido: 'sucesso',
  indeferido: 'perigo',
  nao_aplicavel: 'neutro',
  cancelado: 'perigo',
}

/* -- Etapa ----------------------------------------------------------------- */

export const ROTULO_STATUS_ETAPA: Record<StatusEtapa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
  nao_aplicavel: 'Não aplicável',
}

export const TOM_STATUS_ETAPA: Record<StatusEtapa, Tom> = {
  pendente: 'neutro',
  em_andamento: 'primario',
  concluida: 'sucesso',
  bloqueada: 'perigo',
  nao_aplicavel: 'neutro',
}

export const ROTULO_RESPONSAVEL_ACAO: Record<ResponsavelAcao, string> = {
  equipe: 'Equipe Alcance',
  cliente: 'Cliente',
  orgao: 'Órgão',
  terceiro: 'Terceiro',
}

/* -- Documento ------------------------------------------------------------- */

export const ROTULO_STATUS_DOCUMENTO: Record<StatusDocumento, string> = {
  solicitado: 'Solicitado',
  enviado: 'Enviado',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  reenvio_solicitado: 'Reenvio solicitado',
}

export const TOM_STATUS_DOCUMENTO: Record<StatusDocumento, Tom> = {
  solicitado: 'alerta',
  enviado: 'info',
  em_analise: 'primario',
  aprovado: 'sucesso',
  reprovado: 'perigo',
  reenvio_solicitado: 'destaque',
}

export const ROTULO_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  rg: 'RG',
  cpf: 'CPF',
  cnh: 'CNH',
  comprovante_endereco: 'Comprovante de endereço',
  laudo_medico: 'Laudo médico',
  nota_fiscal: 'Nota fiscal',
  crlv: 'CRLV',
  procuracao: 'Procuração',
  declaracao: 'Declaração',
  comprovante_renda: 'Comprovante de renda',
  outro: 'Outro documento',
}

/* -- Movimentação ---------------------------------------------------------- */

export const ROTULO_TIPO_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  processo_criado: 'Processo criado',
  status_alterado: 'Status alterado',
  etapa_concluida: 'Etapa concluída',
  documento_solicitado: 'Documento solicitado',
  documento_enviado: 'Documento enviado',
  documento_aprovado: 'Documento aprovado',
  documento_reprovado: 'Documento reprovado',
  protocolo_registrado: 'Protocolo registrado',
  observacao: 'Observação',
  prazo_alterado: 'Prazo alterado',
  responsavel_alterado: 'Responsável alterado',
  mensagem_cliente: 'Mensagem ao cliente',
}

/* -- Notificação ----------------------------------------------------------- */

export const ROTULO_TIPO_NOTIFICACAO: Record<TipoNotificacao, string> = {
  info: 'Informação',
  sucesso: 'Sucesso',
  alerta: 'Alerta',
  erro: 'Erro',
  documento: 'Documento',
  prazo: 'Prazo',
}

export const TOM_TIPO_NOTIFICACAO: Record<TipoNotificacao, Tom> = {
  info: 'info',
  sucesso: 'sucesso',
  alerta: 'alerta',
  erro: 'perigo',
  documento: 'primario',
  prazo: 'destaque',
}

/* -- Calendário ------------------------------------------------------------ */

export const ROTULO_TIPO_EVENTO: Record<TipoEvento, string> = {
  reuniao: 'Reunião',
  prazo: 'Prazo',
  pericia: 'Perícia',
  protocolo: 'Protocolo',
  retorno: 'Retorno',
  outro: 'Outro',
}

export const TOM_TIPO_EVENTO: Record<TipoEvento, Tom> = {
  reuniao: 'primario',
  prazo: 'alerta',
  pericia: 'info',
  protocolo: 'destaque',
  retorno: 'info',
  outro: 'neutro',
}

export const ROTULO_STATUS_EVENTO: Record<StatusEvento, string> = {
  agendado: 'Agendado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

/* -- Financeiro ------------------------------------------------------------ */

export const ROTULO_STATUS_FINANCEIRO: Record<StatusFinanceiro, string> = {
  pendente: 'Pendente',
  parcial: 'Pago parcialmente',
  pago: 'Pago',
  atrasado: 'Em atraso',
  cancelado: 'Cancelado',
}

export const TOM_STATUS_FINANCEIRO: Record<StatusFinanceiro, Tom> = {
  pendente: 'neutro',
  parcial: 'alerta',
  pago: 'sucesso',
  atrasado: 'perigo',
  cancelado: 'neutro',
}

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
}

/* -- Utilitário ------------------------------------------------------------ */

/** Converte um `Record<chave, rótulo>` em opções para selects. */
export function paraOpcoes<T extends string>(
  rotulos: Record<T, string>,
): Array<{ value: T; label: string }> {
  return (Object.entries(rotulos) as Array<[T, string]>).map(([value, label]) => ({ value, label }))
}
