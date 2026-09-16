/**
 * Modelo de domínio da Alcance Isenções.
 *
 * Estes tipos são a fonte da verdade para componentes, formulários e contratos
 * de serviço. Nomes em português para espelhar o vocabulário da operação.
 */

export type ID = string
/** Data/hora em ISO 8601 (ex.: `2026-03-14T13:45:00.000Z`). */
export type ISODateTime = string
/** Data sem hora, em ISO (ex.: `2026-03-14`). */
export type ISODate = string

/* ========================================================================== */
/* Usuário e acesso                                                            */
/* ========================================================================== */

export const PAPEIS_USUARIO = ['super_admin', 'gestor', 'analista', 'cliente'] as const
export type PapelUsuario = (typeof PAPEIS_USUARIO)[number]

export interface Usuario {
  id: ID
  nome: string
  email: string
  telefone?: string
  papel: PapelUsuario
  cargo?: string
  ativo: boolean
  /** Preenchido apenas quando o usuário é do tipo `cliente`. */
  clienteId?: ID
  criadoEm: ISODateTime
  ultimoAcessoEm?: ISODateTime
}

export interface SessaoUsuario {
  usuario: Usuario
  expiraEm: ISODateTime
}

/* ========================================================================== */
/* Cliente                                                                     */
/* ========================================================================== */

export const TIPOS_CLIENTE = ['condutor', 'nao_condutor'] as const
export type TipoCliente = (typeof TIPOS_CLIENTE)[number]

export const SITUACOES_CLIENTE = ['ativo', 'inativo'] as const
export type SituacaoCliente = (typeof SITUACOES_CLIENTE)[number]

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const
export type UF = (typeof UFS)[number]

export interface Endereco {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: UF
}

/**
 * Dado pessoal sensível (saúde/deficiência). A interface trata este bloco com
 * regras próprias de exibição — ver `src/lib/privacidade.ts`.
 */
export interface PerfilAssistido {
  /** Categoria declarada pelo cliente; nunca exibida em listagens públicas. */
  categorias: string[]
  observacoes?: string
  possuiLaudo: boolean
  laudoValidoAte?: ISODate
}

export interface Cliente {
  id: ID
  codigo: string
  nome: string
  cpf: string
  rg?: string
  dataNascimento?: ISODate
  email: string
  telefone: string
  tipo: TipoCliente
  situacao: SituacaoCliente
  endereco?: Endereco
  /** Usuário da equipe responsável pela conta. */
  responsavelId?: ID
  /** Bloco sensível — visível apenas para a equipe e ao próprio cliente. */
  perfilAssistido?: PerfilAssistido
  /** Nunca exposto na área do cliente. */
  observacoesInternas?: string
  acessoPortalAtivo: boolean
  criadoEm: ISODateTime
  atualizadoEm: ISODateTime
}

/* ========================================================================== */
/* Processo                                                                    */
/* ========================================================================== */

export const STATUS_PROCESSO = [
  'em_avaliacao',
  'em_andamento',
  'aguardando_cliente',
  'aguardando_orgao',
  'concluido',
  'arquivado',
  'cancelado',
] as const
export type StatusProcesso = (typeof STATUS_PROCESSO)[number]

export const PRIORIDADES = ['baixa', 'normal', 'alta', 'urgente'] as const
export type Prioridade = (typeof PRIORIDADES)[number]

export interface Processo {
  id: ID
  codigo: string
  clienteId: ID
  titulo: string
  status: StatusProcesso
  prioridade: Prioridade
  responsavelId?: ID
  abertoEm: ISODateTime
  prazoFinal?: ISODate
  concluidoEm?: ISODateTime
  /** Resumo público do andamento — visível ao cliente. */
  resumoPublico?: string
  /** Nunca exposto na área do cliente. */
  observacoesInternas?: string
  atualizadoEm: ISODateTime
}

/* ========================================================================== */
/* Subprocesso                                                                 */
/* ========================================================================== */

export const TIPOS_SUBPROCESSO = [
  'avaliacao_inicial',
  'ipi',
  'iof',
  'icms',
  'ipva',
  'estacionamento_pcd',
  'rodizio',
  'recurso',
] as const
export type TipoSubprocesso = (typeof TIPOS_SUBPROCESSO)[number]

export const STATUS_SUBPROCESSO = [
  'nao_iniciado',
  'em_andamento',
  'aguardando_documentos',
  'aguardando_orgao',
  'deferido',
  'indeferido',
  'nao_aplicavel',
  'cancelado',
] as const
export type StatusSubprocesso = (typeof STATUS_SUBPROCESSO)[number]

export const RESPONSAVEIS_ACAO = ['equipe', 'cliente', 'orgao', 'terceiro'] as const
export type ResponsavelAcao = (typeof RESPONSAVEIS_ACAO)[number]

export interface Subprocesso {
  id: ID
  processoId: ID
  tipo: TipoSubprocesso
  status: StatusSubprocesso
  responsavelId?: ID
  /** Órgão ou entidade responsável pela análise (informativo). */
  orgao?: string
  protocolo?: string
  iniciadoEm?: ISODateTime
  concluidoEm?: ISODateTime
  prazo?: ISODate
  /** Próxima ação pertinente, em linguagem direta. */
  proximaAcao?: string
  responsavelProximaAcao?: ResponsavelAcao
  motivoBloqueio?: string
  observacoesInternas?: string
  atualizadoEm: ISODateTime
}

/* ========================================================================== */
/* Etapa                                                                       */
/* ========================================================================== */

export const STATUS_ETAPA = [
  'pendente',
  'em_andamento',
  'concluida',
  'bloqueada',
  'nao_aplicavel',
] as const
export type StatusEtapa = (typeof STATUS_ETAPA)[number]

export interface Etapa {
  id: ID
  subprocessoId: ID
  titulo: string
  descricao?: string
  ordem: number
  status: StatusEtapa
  responsavelId?: ID
  prazo?: ISODate
  concluidaEm?: ISODateTime
  /** Observação exibida ao cliente quando `visivelCliente` é verdadeiro. */
  observacao?: string
  observacoesInternas?: string
  visivelCliente: boolean
}

/* ========================================================================== */
/* Documento                                                                   */
/* ========================================================================== */

export const STATUS_DOCUMENTO = [
  'solicitado',
  'enviado',
  'em_analise',
  'aprovado',
  'reprovado',
  'reenvio_solicitado',
] as const
export type StatusDocumento = (typeof STATUS_DOCUMENTO)[number]

export const VISIBILIDADES_DOCUMENTO = ['interno', 'cliente'] as const
export type VisibilidadeDocumento = (typeof VISIBILIDADES_DOCUMENTO)[number]

export const TIPOS_DOCUMENTO = [
  'rg',
  'cpf',
  'cnh',
  'comprovante_endereco',
  'laudo_medico',
  'nota_fiscal',
  'crlv',
  'procuracao',
  'declaracao',
  'comprovante_renda',
  'outro',
] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export interface Documento {
  id: ID
  clienteId: ID
  processoId?: ID
  subprocessoId?: ID
  etapaId?: ID
  tipo: TipoDocumento
  titulo: string
  status: StatusDocumento
  visibilidade: VisibilidadeDocumento
  /** Documentos de saúde exigem tratamento reforçado na interface. */
  sensivel: boolean
  arquivoNome?: string
  arquivoTamanhoBytes?: number
  arquivoMime?: string
  solicitadoEm?: ISODateTime
  solicitadoPorId?: ID
  prazoEnvio?: ISODate
  enviadoEm?: ISODateTime
  enviadoPorId?: ID
  analisadoEm?: ISODateTime
  analisadoPorId?: ID
  /** Motivo informado ao cliente em reprovação/reenvio. */
  motivoDevolucao?: string
  observacoesInternas?: string
  atualizadoEm: ISODateTime
}

/* ========================================================================== */
/* Movimentação (histórico)                                                    */
/* ========================================================================== */

export const TIPOS_MOVIMENTACAO = [
  'processo_criado',
  'status_alterado',
  'etapa_concluida',
  'documento_solicitado',
  'documento_enviado',
  'documento_aprovado',
  'documento_reprovado',
  'protocolo_registrado',
  'observacao',
  'prazo_alterado',
  'responsavel_alterado',
  'mensagem_cliente',
] as const
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number]

export interface Movimentacao {
  id: ID
  processoId: ID
  subprocessoId?: ID
  tipo: TipoMovimentacao
  titulo: string
  descricao?: string
  autorId?: ID
  de?: string
  para?: string
  visivelCliente: boolean
  criadoEm: ISODateTime
}

/* ========================================================================== */
/* Notificação                                                                 */
/* ========================================================================== */

export const TIPOS_NOTIFICACAO = ['info', 'sucesso', 'alerta', 'erro', 'documento', 'prazo'] as const
export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number]

export interface Notificacao {
  id: ID
  destinatarioId: ID
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  lida: boolean
  clienteId?: ID
  processoId?: ID
  /** Rota interna para a ação relacionada. */
  link?: string
  criadoEm: ISODateTime
}

/* ========================================================================== */
/* Calendário                                                                  */
/* ========================================================================== */

export const TIPOS_EVENTO = ['reuniao', 'prazo', 'pericia', 'protocolo', 'retorno', 'outro'] as const
export type TipoEvento = (typeof TIPOS_EVENTO)[number]

export const STATUS_EVENTO = ['agendado', 'concluido', 'cancelado'] as const
export type StatusEvento = (typeof STATUS_EVENTO)[number]

export const VISIBILIDADES_EVENTO = ['interno', 'cliente'] as const
export type VisibilidadeEvento = (typeof VISIBILIDADES_EVENTO)[number]

export interface EventoCalendario {
  id: ID
  titulo: string
  descricao?: string
  data: ISODate
  hora?: string
  tipo: TipoEvento
  status: StatusEvento
  visibilidade: VisibilidadeEvento
  clienteId?: ID
  processoId?: ID
  subprocessoId?: ID
  responsavelId?: ID
  local?: string
  criadoEm: ISODateTime
}

/* ========================================================================== */
/* Financeiro (informativo)                                                    */
/* ========================================================================== */

export const STATUS_FINANCEIRO = ['pendente', 'parcial', 'pago', 'atrasado', 'cancelado'] as const
export type StatusFinanceiro = (typeof STATUS_FINANCEIRO)[number]

export const FORMAS_PAGAMENTO = ['pix', 'cartao', 'boleto', 'dinheiro', 'transferencia'] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

/**
 * Registro financeiro **informativo**. Não substitui sistema fiscal/contábil e
 * não executa cobranças — apenas registra o combinado com o cliente.
 */
export interface RegistroFinanceiro {
  id: ID
  clienteId: ID
  processoId?: ID
  descricao: string
  valorTotal: number
  desconto: number
  valorPago: number
  status: StatusFinanceiro
  formaPagamento?: FormaPagamento
  vencimento?: ISODate
  pagoEm?: ISODate
  observacoes?: string
  criadoEm: ISODateTime
  atualizadoEm: ISODateTime
}

/* ========================================================================== */
/* Agregados de leitura                                                        */
/* ========================================================================== */

export interface SubprocessoComEtapas extends Subprocesso {
  etapas: Etapa[]
}

export interface ProcessoDetalhado extends Processo {
  cliente: Cliente
  responsavel?: Usuario
  subprocessos: SubprocessoComEtapas[]
  documentos: Documento[]
  movimentacoes: Movimentacao[]
  financeiro: RegistroFinanceiro[]
}

export interface ClienteComResumo extends Cliente {
  responsavel?: Usuario
  totalProcessos: number
  processosAtivos: number
  documentosPendentes: number
  ultimaMovimentacaoEm?: ISODateTime
}

export interface ResumoPainel {
  clientesAtivos: number
  processosAtivos: number
  documentosAguardandoAnalise: number
  prazosVencidos: number
  prazosProximos7Dias: number
  processosSemMovimentacao: number
}

export interface PendenciaPainel {
  id: ID
  tipo: 'documento' | 'prazo' | 'etapa' | 'sem_movimentacao'
  titulo: string
  descricao: string
  clienteId: ID
  clienteNome: string
  processoId: ID
  subprocessoId?: ID
  prazo?: ISODate
  responsavelId?: ID
  gravidade: 'baixa' | 'media' | 'alta'
  link: string
}
