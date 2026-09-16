import type {
  Etapa,
  StatusDocumento,
  StatusEtapa,
  StatusProcesso,
  StatusSubprocesso,
  Subprocesso,
} from '@/types/domain'

/**
 * Transições de estado.
 *
 * Os mapas abaixo refletem o fluxo demonstrado (cadastro → processo →
 * subprocessos → etapas → documentos → movimentações). Transições marcadas com
 * `// ?` estão listadas em `docs/duvidas-de-negocio.md` aguardando confirmação
 * da equipe — nenhuma regra foi inventada além do fluxo apresentado.
 */

/* -- Processo -------------------------------------------------------------- */

export const TRANSICOES_PROCESSO: Record<StatusProcesso, StatusProcesso[]> = {
  em_avaliacao: ['em_andamento', 'aguardando_cliente', 'cancelado', 'arquivado'],
  em_andamento: ['aguardando_cliente', 'aguardando_orgao', 'concluido', 'cancelado'],
  aguardando_cliente: ['em_andamento', 'aguardando_orgao', 'cancelado'],
  aguardando_orgao: ['em_andamento', 'aguardando_cliente', 'concluido', 'cancelado'],
  concluido: ['arquivado'],
  arquivado: ['em_andamento'],
  cancelado: [],
}

export function podeMudarStatusProcesso(de: StatusProcesso, para: StatusProcesso): boolean {
  if (de === para) return true
  return TRANSICOES_PROCESSO[de].includes(para)
}

export function statusProcessoFinalizado(status: StatusProcesso): boolean {
  return status === 'concluido' || status === 'arquivado' || status === 'cancelado'
}

export function statusProcessoAtivo(status: StatusProcesso): boolean {
  return !statusProcessoFinalizado(status)
}

/* -- Subprocesso ----------------------------------------------------------- */

export const TRANSICOES_SUBPROCESSO: Record<StatusSubprocesso, StatusSubprocesso[]> = {
  nao_iniciado: ['em_andamento', 'aguardando_documentos', 'nao_aplicavel', 'cancelado'],
  em_andamento: ['aguardando_documentos', 'aguardando_orgao', 'deferido', 'indeferido', 'cancelado'],
  aguardando_documentos: ['em_andamento', 'aguardando_orgao', 'cancelado'],
  aguardando_orgao: ['em_andamento', 'deferido', 'indeferido', 'cancelado'],
  deferido: [],
  // Um indeferimento pode originar um subprocesso de recurso — o recurso é um
  // subprocesso próprio, e não uma volta de status deste.
  indeferido: [],
  nao_aplicavel: ['nao_iniciado'],
  cancelado: [],
}

export function podeMudarStatusSubprocesso(
  de: StatusSubprocesso,
  para: StatusSubprocesso,
): boolean {
  if (de === para) return true
  return TRANSICOES_SUBPROCESSO[de].includes(para)
}

export function statusSubprocessoFinalizado(status: StatusSubprocesso): boolean {
  return (
    status === 'deferido' ||
    status === 'indeferido' ||
    status === 'cancelado' ||
    status === 'nao_aplicavel'
  )
}

/* -- Etapa ----------------------------------------------------------------- */

export const TRANSICOES_ETAPA: Record<StatusEtapa, StatusEtapa[]> = {
  pendente: ['em_andamento', 'concluida', 'bloqueada', 'nao_aplicavel'],
  em_andamento: ['concluida', 'bloqueada', 'pendente', 'nao_aplicavel'],
  concluida: ['em_andamento'],
  bloqueada: ['em_andamento', 'pendente', 'nao_aplicavel'],
  nao_aplicavel: ['pendente'],
}

export function podeMudarStatusEtapa(de: StatusEtapa, para: StatusEtapa): boolean {
  if (de === para) return true
  return TRANSICOES_ETAPA[de].includes(para)
}

/* -- Documento ------------------------------------------------------------- */

export const TRANSICOES_DOCUMENTO: Record<StatusDocumento, StatusDocumento[]> = {
  solicitado: ['enviado'],
  enviado: ['em_analise', 'aprovado', 'reprovado', 'reenvio_solicitado'],
  em_analise: ['aprovado', 'reprovado', 'reenvio_solicitado'],
  aprovado: ['em_analise'],
  reprovado: ['reenvio_solicitado'],
  reenvio_solicitado: ['enviado'],
}

export function podeMudarStatusDocumento(de: StatusDocumento, para: StatusDocumento): boolean {
  if (de === para) return true
  return TRANSICOES_DOCUMENTO[de].includes(para)
}

/** O cliente só pode enviar arquivo quando a equipe habilitou o envio. */
export function clientePodeEnviar(status: StatusDocumento): boolean {
  return status === 'solicitado' || status === 'reenvio_solicitado'
}

/** Documentos que a equipe precisa analisar. */
export function aguardaAnalise(status: StatusDocumento): boolean {
  return status === 'enviado' || status === 'em_analise'
}

export function documentoPendenteDoCliente(status: StatusDocumento): boolean {
  return status === 'solicitado' || status === 'reenvio_solicitado'
}

/* -- Progresso ------------------------------------------------------------- */

/**
 * Progresso de um subprocesso: etapas concluídas sobre etapas aplicáveis.
 * Etapas marcadas como `nao_aplicavel` saem da conta (numerador e denominador).
 */
export function progressoSubprocesso(etapas: Etapa[]): {
  concluidas: number
  aplicaveis: number
  percentual: number
} {
  const aplicaveis = etapas.filter((etapa) => etapa.status !== 'nao_aplicavel')
  const concluidas = aplicaveis.filter((etapa) => etapa.status === 'concluida')
  const percentual =
    aplicaveis.length === 0 ? 0 : Math.round((concluidas.length / aplicaveis.length) * 100)
  return { concluidas: concluidas.length, aplicaveis: aplicaveis.length, percentual }
}

/** Progresso do processo: média ponderada pelas etapas de todos os subprocessos. */
export function progressoProcesso(
  subprocessos: Array<{ etapas: Etapa[]; status: StatusSubprocesso }>,
): number {
  const consideraveis = subprocessos.filter(
    (sub) => sub.status !== 'nao_aplicavel' && sub.status !== 'cancelado',
  )
  const etapas = consideraveis.flatMap((sub) => sub.etapas)
  return progressoSubprocesso(etapas).percentual
}

/** Próxima etapa a ser trabalhada dentro de um subprocesso. */
export function proximaEtapa(etapas: Etapa[]): Etapa | undefined {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  return (
    ordenadas.find((etapa) => etapa.status === 'em_andamento') ??
    ordenadas.find((etapa) => etapa.status === 'pendente') ??
    ordenadas.find((etapa) => etapa.status === 'bloqueada')
  )
}

/**
 * Status sugerido para o processo a partir dos subprocessos.
 * É apenas uma **sugestão** exibida na interface: a alteração continua sendo
 * uma decisão explícita da equipe.
 */
export function statusSugeridoProcesso(
  subprocessos: Array<Pick<Subprocesso, 'status'>>,
): StatusProcesso | null {
  const ativos = subprocessos.filter((sub) => !statusSubprocessoFinalizado(sub.status))
  if (subprocessos.length === 0) return null
  if (ativos.length === 0) return 'concluido'
  if (ativos.every((sub) => sub.status === 'aguardando_documentos')) return 'aguardando_cliente'
  if (ativos.every((sub) => sub.status === 'aguardando_orgao')) return 'aguardando_orgao'
  return 'em_andamento'
}
