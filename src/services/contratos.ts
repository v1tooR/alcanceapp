import type {
  Cliente,
  ClienteComResumo,
  Documento,
  Etapa,
  EventoCalendario,
  ID,
  ISODate,
  Movimentacao,
  Notificacao,
  PapelUsuario,
  PendenciaPainel,
  Prioridade,
  Processo,
  ProcessoDetalhado,
  RegistroFinanceiro,
  ResumoPainel,
  SessaoUsuario,
  SituacaoCliente,
  StatusDocumento,
  StatusEtapa,
  StatusFinanceiro,
  StatusProcesso,
  StatusSubprocesso,
  Subprocesso,
  TipoCliente,
  TipoDocumento,
  TipoEvento,
  TipoSubprocesso,
  Usuario,
  VisibilidadeDocumento,
} from '@/types/domain'

/* ========================================================================== */
/* Tipos compartilhados                                                        */
/* ========================================================================== */

export interface ParametrosPaginacao {
  pagina?: number
  tamanhoPagina?: number
}

export interface Pagina<T> {
  itens: T[]
  total: number
  pagina: number
  tamanhoPagina: number
}

export type Ordem = 'asc' | 'desc'

/** Um valor por mês, com rótulos prontos e a marca de mês em andamento. */
export interface PontoMensal {
  /** `yyyy-MM` */
  chave: string
  rotulo: string
  rotuloCompleto: string
  parcial: boolean
  valor: number
}
/** `'todos'` desliga o filtro sem precisar remover a chave. */
export type Filtro<T> = T | 'todos'

/* ========================================================================== */
/* Autenticação                                                                */
/* ========================================================================== */

export interface Credenciais {
  email: string
  senha: string
}

export interface ServicoAutenticacao {
  entrar(credenciais: Credenciais): Promise<SessaoUsuario>
  sair(): Promise<void>
  /** Recupera a sessão vigente ao abrir o app; `null` quando não há. */
  sessaoAtual(): Promise<SessaoUsuario | null>
  solicitarRecuperacaoSenha(email: string): Promise<void>
}

/* ========================================================================== */
/* Clientes                                                                    */
/* ========================================================================== */

export interface FiltrosClientes extends ParametrosPaginacao {
  termo?: string
  situacao?: Filtro<SituacaoCliente>
  tipo?: Filtro<TipoCliente>
  responsavelId?: Filtro<ID>
  ordenarPor?: 'nome' | 'criadoEm' | 'ultimaMovimentacao'
  ordem?: Ordem
}

export interface EntradaCliente {
  nome: string
  cpf: string
  rg?: string
  dataNascimento?: ISODate
  email: string
  telefone: string
  tipo: TipoCliente
  situacao: SituacaoCliente
  responsavelId?: ID
  acessoPortalAtivo: boolean
  observacoesInternas?: string
  endereco?: Cliente['endereco']
  perfilAssistido?: Cliente['perfilAssistido']
}

export interface ResumoClientes {
  total: number
  ativos: number
  /** Entre os ativos. */
  comAcessoPortal: number
  comDocumentosPendentes: number
  /** Entre os ativos. */
  condutores: number
  naoCondutores: number
  novosPorMes: PontoMensal[]
}

export interface ServicoClientes {
  resumo(): Promise<ResumoClientes>
  listar(filtros: FiltrosClientes): Promise<Pagina<ClienteComResumo>>
  obter(id: ID): Promise<ClienteComResumo>
  criar(dados: EntradaCliente): Promise<Cliente>
  atualizar(id: ID, dados: Partial<EntradaCliente>): Promise<Cliente>
  definirAcessoPortal(id: ID, ativo: boolean): Promise<Cliente>
  /** Lista enxuta para seletores de formulário. */
  opcoes(): Promise<Array<{ id: ID; nome: string; codigo: string }>>
}

/* ========================================================================== */
/* Processos, subprocessos e etapas                                            */
/* ========================================================================== */

export interface FiltrosProcessos extends ParametrosPaginacao {
  termo?: string
  status?: Filtro<StatusProcesso>
  prioridade?: Filtro<Prioridade>
  responsavelId?: Filtro<ID>
  clienteId?: ID
  tipoSubprocesso?: Filtro<TipoSubprocesso>
  /** Somente processos com prazo vencido ou pendência do cliente. */
  somenteComPendencia?: boolean
  /** Somente processos ativos com prazo final já ultrapassado. */
  somentePrazoVencido?: boolean
  ordenarPor?: 'abertoEm' | 'atualizadoEm' | 'prazoFinal' | 'prioridade'
  ordem?: Ordem
}

export interface ProcessoListado extends Processo {
  clienteNome: string
  clienteCodigo: string
  responsavelNome?: string
  totalSubprocessos: number
  subprocessosConcluidos: number
  documentosPendentes: number
  progresso: number
  tiposSubprocesso: TipoSubprocesso[]
}

export interface EntradaProcesso {
  clienteId: ID
  titulo: string
  prioridade: Prioridade
  responsavelId?: ID
  prazoFinal?: ISODate
  resumoPublico?: string
  observacoesInternas?: string
  /** Subprocessos a abrir junto com o processo. */
  subprocessos: TipoSubprocesso[]
}

export interface EntradaSubprocesso {
  processoId: ID
  tipo: TipoSubprocesso
  responsavelId?: ID
  orgao?: string
  prazo?: ISODate
  proximaAcao?: string
  observacoesInternas?: string
  /** Cria as etapas sugeridas do catálogo. */
  criarEtapasSugeridas: boolean
}

export interface EntradaEtapa {
  subprocessoId: ID
  titulo: string
  descricao?: string
  responsavelId?: ID
  prazo?: ISODate
  visivelCliente: boolean
}

export interface ResumoProcessos {
  total: number
  ativos: number
  porStatus: Array<{ status: StatusProcesso; total: number }>
  /** Processos ativos com prazo final ultrapassado. */
  comPrazoVencido: number
  /** Média do progresso dos processos ativos (0–100). */
  progressoMedio: number
  abertosPorMes: PontoMensal[]
  concluidosPorMes: PontoMensal[]
}

export interface ServicoProcessos {
  resumo(): Promise<ResumoProcessos>
  listar(filtros: FiltrosProcessos): Promise<Pagina<ProcessoListado>>
  obter(id: ID): Promise<ProcessoDetalhado>
  criar(dados: EntradaProcesso): Promise<Processo>
  atualizar(id: ID, dados: Partial<Omit<EntradaProcesso, 'subprocessos' | 'clienteId'>>): Promise<Processo>
  alterarStatus(id: ID, status: StatusProcesso, nota?: string): Promise<Processo>

  adicionarSubprocesso(dados: EntradaSubprocesso): Promise<Subprocesso>
  atualizarSubprocesso(
    id: ID,
    dados: Partial<Pick<Subprocesso, 'responsavelId' | 'orgao' | 'protocolo' | 'prazo' | 'proximaAcao' | 'responsavelProximaAcao' | 'motivoBloqueio' | 'observacoesInternas'>>,
  ): Promise<Subprocesso>
  alterarStatusSubprocesso(id: ID, status: StatusSubprocesso, nota?: string): Promise<Subprocesso>

  adicionarEtapa(dados: EntradaEtapa): Promise<Etapa>
  atualizarEtapa(
    id: ID,
    dados: Partial<Pick<Etapa, 'titulo' | 'descricao' | 'responsavelId' | 'prazo' | 'observacao' | 'observacoesInternas' | 'visivelCliente'>>,
  ): Promise<Etapa>
  alterarStatusEtapa(id: ID, status: StatusEtapa, nota?: string): Promise<Etapa>
  removerEtapa(id: ID): Promise<void>
}

/* ========================================================================== */
/* Documentos                                                                  */
/* ========================================================================== */

export interface FiltrosDocumentos extends ParametrosPaginacao {
  termo?: string
  status?: Filtro<StatusDocumento>
  tipo?: Filtro<TipoDocumento>
  clienteId?: ID
  processoId?: ID
  subprocessoId?: ID
  /** Apenas documentos que a equipe precisa analisar. */
  somenteAguardandoAnalise?: boolean
  ordenarPor?: 'atualizadoEm' | 'prazoEnvio' | 'titulo'
  ordem?: Ordem
}

export interface DocumentoListado extends Documento {
  clienteNome: string
  processoCodigo?: string
  subprocessoTipo?: TipoSubprocesso
}

export interface EntradaSolicitacaoDocumento {
  clienteId: ID
  processoId?: ID
  subprocessoId?: ID
  etapaId?: ID
  tipo: TipoDocumento
  titulo: string
  prazoEnvio?: ISODate
  visibilidade: VisibilidadeDocumento
  sensivel: boolean
  observacoesInternas?: string
}

export interface ResumoDocumentos {
  total: number
  porStatus: Array<{ status: StatusDocumento; total: number }>
  /** Cada etapa é subconjunto da anterior. */
  funil: { solicitados: number; recebidos: number; analisados: number; aprovados: number }
  sensiveis: number
  aguardandoAnalise: number
  aguardandoCliente: number
  devolvidos: number
  recebidosPorMes: PontoMensal[]
  /** Dias entre o envio e o parecer; `null` sem análises concluídas. */
  tempoMedioAnaliseDias: number | null
}

export interface ServicoDocumentos {
  resumo(): Promise<ResumoDocumentos>
  listar(filtros: FiltrosDocumentos): Promise<Pagina<DocumentoListado>>
  obter(id: ID): Promise<DocumentoListado>
  solicitar(dados: EntradaSolicitacaoDocumento): Promise<Documento>
  /**
   * Registra o envio de um arquivo.
   *
   * O upload real (assinatura de URL, antivírus, criptografia em repouso) é
   * responsabilidade do serviço de armazenamento — aqui só trafegam os metadados.
   */
  registrarEnvio(
    id: ID,
    arquivo: { nome: string; tamanhoBytes: number; mime: string },
  ): Promise<Documento>
  aprovar(id: ID, observacoesInternas?: string): Promise<Documento>
  reprovar(id: ID, motivo: string): Promise<Documento>
  solicitarReenvio(id: ID, motivo: string, novoPrazo?: ISODate): Promise<Documento>
  colocarEmAnalise(id: ID): Promise<Documento>
  alterarVisibilidade(id: ID, visibilidade: VisibilidadeDocumento): Promise<Documento>
}

/* ========================================================================== */
/* Movimentações                                                               */
/* ========================================================================== */

export interface EntradaMovimentacao {
  processoId: ID
  subprocessoId?: ID
  titulo: string
  descricao?: string
  visivelCliente: boolean
}

export interface ServicoMovimentacoes {
  listarPorProcesso(processoId: ID, apenasVisiveisAoCliente?: boolean): Promise<Movimentacao[]>
  registrar(dados: EntradaMovimentacao): Promise<Movimentacao>
  /** Últimas movimentações de toda a operação, para o painel inicial. */
  recentes(limite?: number): Promise<Array<Movimentacao & { clienteNome: string; processoCodigo: string }>>
}

/* ========================================================================== */
/* Notificações                                                                */
/* ========================================================================== */

export interface ServicoNotificacoes {
  listar(destinatarioId: ID, apenasNaoLidas?: boolean): Promise<Notificacao[]>
  contarNaoLidas(destinatarioId: ID): Promise<number>
  marcarComoLida(id: ID): Promise<Notificacao>
  marcarTodasComoLidas(destinatarioId: ID): Promise<void>
  /** Envio interno (equipe → equipe, ou equipe → cliente). */
  enviar(dados: {
    destinatarioId: ID
    titulo: string
    mensagem: string
    tipo: Notificacao['tipo']
    clienteId?: ID
    processoId?: ID
    link?: string
  }): Promise<Notificacao>
}

/* ========================================================================== */
/* Calendário                                                                  */
/* ========================================================================== */

export interface FiltrosCalendario {
  de: ISODate
  ate: ISODate
  tipo?: Filtro<TipoEvento>
  responsavelId?: Filtro<ID>
  clienteId?: ID
  /** Na área do cliente, só eventos liberados. */
  apenasVisiveisAoCliente?: boolean
}

export interface EventoListado extends EventoCalendario {
  clienteNome?: string
  processoCodigo?: string
  responsavelNome?: string
}

export interface EntradaEvento {
  titulo: string
  descricao?: string
  data: ISODate
  hora?: string
  tipo: TipoEvento
  visibilidade: EventoCalendario['visibilidade']
  clienteId?: ID
  processoId?: ID
  subprocessoId?: ID
  responsavelId?: ID
  local?: string
}

export interface ServicoCalendario {
  listar(filtros: FiltrosCalendario): Promise<EventoListado[]>
  criar(dados: EntradaEvento): Promise<EventoCalendario>
  atualizar(id: ID, dados: Partial<EntradaEvento>): Promise<EventoCalendario>
  alterarStatus(id: ID, status: EventoCalendario['status']): Promise<EventoCalendario>
  remover(id: ID): Promise<void>
}

/* ========================================================================== */
/* Financeiro (informativo)                                                    */
/* ========================================================================== */

export interface FiltrosFinanceiro extends ParametrosPaginacao {
  termo?: string
  status?: Filtro<StatusFinanceiro>
  clienteId?: ID
  processoId?: ID
}

export interface RegistroFinanceiroListado extends RegistroFinanceiro {
  clienteNome: string
  processoCodigo?: string
}

export interface EntradaFinanceiro {
  clienteId: ID
  processoId?: ID
  descricao: string
  valorTotal: number
  desconto: number
  valorPago: number
  status: StatusFinanceiro
  formaPagamento?: RegistroFinanceiro['formaPagamento']
  vencimento?: ISODate
  pagoEm?: ISODate
  observacoes?: string
}

export interface ResumoFinanceiro {
  totalContratado: number
  totalRecebido: number
  totalEmAberto: number
  totalAtrasado: number
  /** Valor líquido por situação. */
  porStatus: Array<{ status: StatusFinanceiro; total: number; valor: number }>
  /** Valor recebido por forma de pagamento. */
  porForma: Array<{
    forma: NonNullable<RegistroFinanceiro['formaPagamento']>
    total: number
    valor: number
  }>
  serieMensal: Array<{
    chave: string
    rotulo: string
    rotuloCompleto: string
    parcial: boolean
    contratado: number
    recebido: number
  }>
}

export interface ServicoFinanceiro {
  listar(filtros: FiltrosFinanceiro): Promise<Pagina<RegistroFinanceiroListado>>
  resumo(): Promise<ResumoFinanceiro>
  criar(dados: EntradaFinanceiro): Promise<RegistroFinanceiro>
  atualizar(id: ID, dados: Partial<EntradaFinanceiro>): Promise<RegistroFinanceiro>
  remover(id: ID): Promise<void>
}

/* ========================================================================== */
/* Equipe                                                                      */
/* ========================================================================== */

export interface EntradaUsuario {
  nome: string
  email: string
  telefone?: string
  papel: PapelUsuario
  cargo?: string
  ativo: boolean
}

export interface ServicoUsuarios {
  listar(): Promise<Usuario[]>
  /** Apenas usuários da equipe, para seletores de responsável. */
  listarEquipe(): Promise<Usuario[]>
  obter(id: ID): Promise<Usuario>
  criar(dados: EntradaUsuario): Promise<Usuario>
  atualizar(id: ID, dados: Partial<EntradaUsuario>): Promise<Usuario>
  definirAtivo(id: ID, ativo: boolean): Promise<Usuario>
}

/* ========================================================================== */
/* Painel inicial                                                              */
/* ========================================================================== */

export interface PontoSerieMensal {
  /** `yyyy-MM` */
  chave: string
  /** `Set` */
  rotulo: string
  /** `setembro de 2026` */
  rotuloCompleto: string
  /** Mês corrente, ainda em andamento — não comparar como se estivesse fechado. */
  parcial: boolean
  abertos: number
  concluidos: number
  documentosRecebidos: number
  movimentacoes: number
}

/** Valor no período escolhido e no período imediatamente anterior, de mesma duração. */
export interface Comparativo {
  atual: number
  anterior: number
}

export interface PainelAnalitico {
  meses: number
  /** Primeiro dia do período analisado. */
  inicioPeriodo: ISODate
  serie: PontoSerieMensal[]
  comparativos: Record<'abertos' | 'concluidos' | 'documentosRecebidos' | 'movimentacoes', Comparativo>
  /** Retrato atual — não depende do período. */
  situacaoProcessos: Array<{ status: StatusProcesso; total: number }>
  /** Retrato atual por serviço. */
  subprocessosPorTipo: Array<{
    tipo: TipoSubprocesso
    emAndamento: number
    aguardandoCliente: number
    aguardandoOrgao: number
    naoIniciado: number
    deferidos: number
    indeferidos: number
  }>
  /**
   * Funil de documentos solicitados no período. Cada etapa é subconjunto da
   * anterior: recebidos ⊆ solicitados, analisados ⊆ recebidos, aprovados ⊆ analisados.
   */
  documentos: {
    solicitados: number
    recebidos: number
    analisados: number
    aprovados: number
    devolvidos: number
    aguardandoAnalise: number
    aguardandoCliente: number
  }
  /** Subprocessos ativos por responsável — retrato atual. */
  cargaEquipe: Array<{ usuarioId: ID; nome: string; ativos: number; atrasados: number }>
  /** Prazos dos subprocessos ativos — retrato atual. */
  prazos: { vencidos: number; proximos7Dias: number; emDia: number; semPrazo: number }
}

export interface ServicoPainel {
  resumo(): Promise<ResumoPainel>
  pendencias(limite?: number): Promise<PendenciaPainel[]>
  analitico(meses: number): Promise<PainelAnalitico>
}

/* ========================================================================== */
/* Área do cliente                                                             */
/* ========================================================================== */

export interface VisaoPortal {
  cliente: Cliente
  processos: Array<
    Processo & {
      subprocessos: Array<Subprocesso & { etapas: Etapa[] }>
      progresso: number
    }
  >
  documentosPendentes: Documento[]
  proximosEventos: EventoCalendario[]
  naoLidas: number
}

export interface ServicoPortal {
  /** Tudo o que a área do cliente precisa, já filtrado ao próprio cliente. */
  visaoGeral(clienteId: ID): Promise<VisaoPortal>
  processo(clienteId: ID, processoId: ID): Promise<ProcessoDetalhado>
  documentos(clienteId: ID): Promise<Documento[]>
  enviarDocumento(
    clienteId: ID,
    documentoId: ID,
    arquivo: { nome: string; tamanhoBytes: number; mime: string },
  ): Promise<Documento>
}

/* ========================================================================== */
/* Fachada                                                                     */
/* ========================================================================== */

export interface Servicos {
  autenticacao: ServicoAutenticacao
  clientes: ServicoClientes
  processos: ServicoProcessos
  documentos: ServicoDocumentos
  movimentacoes: ServicoMovimentacoes
  notificacoes: ServicoNotificacoes
  calendario: ServicoCalendario
  financeiro: ServicoFinanceiro
  usuarios: ServicoUsuarios
  painel: ServicoPainel
  portal: ServicoPortal
}
