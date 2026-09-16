import type { TipoDocumento, TipoSubprocesso } from '@/types/domain'

/**
 * Catálogo dos subprocessos previstos em contrato.
 *
 * ⚠️ As etapas e os documentos abaixo são **sugestões de partida**, editáveis a
 * cada processo. Não são regra de negócio confirmada: a sequência definitiva de
 * cada subprocesso depende de validação da equipe Alcance
 * (ver `docs/duvidas-de-negocio.md`).
 *
 * Nenhum subprocesso é aplicado automaticamente a todos os clientes — a equipe
 * escolhe quais abrir em cada processo.
 */

export interface DefinicaoSubprocesso {
  tipo: TipoSubprocesso
  nome: string
  descricao: string
  /** Órgão/entidade sugerido, apenas informativo. */
  orgaoSugerido?: string
  etapasSugeridas: string[]
  documentosSugeridos: TipoDocumento[]
  /** Observação de aplicabilidade mostrada na hora de abrir o subprocesso. */
  aplicabilidade: string
}

export const CATALOGO_SUBPROCESSOS: Record<TipoSubprocesso, DefinicaoSubprocesso> = {
  avaliacao_inicial: {
    tipo: 'avaliacao_inicial',
    nome: 'Avaliação inicial',
    descricao: 'Levantamento da situação do cliente e definição dos serviços aplicáveis.',
    etapasSugeridas: [
      'Entrevista inicial',
      'Conferência da documentação básica',
      'Definição dos subprocessos aplicáveis',
      'Alinhamento com o cliente',
    ],
    documentosSugeridos: ['rg', 'cpf', 'comprovante_endereco', 'laudo_medico'],
    aplicabilidade: 'Recomendada para todo novo processo, antes de abrir os demais subprocessos.',
  },
  ipi: {
    tipo: 'ipi',
    nome: 'IPI',
    descricao: 'Isenção de IPI na aquisição de veículo.',
    orgaoSugerido: 'Receita Federal',
    etapasSugeridas: [
      'Reunir documentação exigida',
      'Preencher requerimento',
      'Protocolar pedido',
      'Acompanhar análise',
      'Registrar decisão',
    ],
    documentosSugeridos: ['rg', 'cpf', 'comprovante_endereco', 'laudo_medico', 'declaracao'],
    aplicabilidade: 'Aplicável quando há aquisição de veículo. Confirmar enquadramento do cliente.',
  },
  iof: {
    tipo: 'iof',
    nome: 'IOF',
    descricao: 'Isenção de IOF em financiamento vinculado à aquisição do veículo.',
    orgaoSugerido: 'Instituição financeira / Receita Federal',
    etapasSugeridas: [
      'Confirmar financiamento',
      'Reunir documentação exigida',
      'Protocolar pedido',
      'Registrar decisão',
    ],
    documentosSugeridos: ['rg', 'cpf', 'laudo_medico', 'comprovante_renda'],
    aplicabilidade: 'Aplicável apenas quando a compra envolve financiamento.',
  },
  icms: {
    tipo: 'icms',
    nome: 'ICMS',
    descricao: 'Isenção de ICMS na aquisição de veículo.',
    orgaoSugerido: 'Secretaria da Fazenda estadual',
    etapasSugeridas: [
      'Reunir documentação exigida',
      'Preencher requerimento',
      'Protocolar pedido',
      'Acompanhar análise',
      'Registrar decisão',
    ],
    documentosSugeridos: ['rg', 'cpf', 'comprovante_endereco', 'laudo_medico', 'nota_fiscal'],
    aplicabilidade: 'Aplicável na aquisição de veículo. Regras variam por estado.',
  },
  ipva: {
    tipo: 'ipva',
    nome: 'IPVA',
    descricao: 'Isenção de IPVA do veículo do cliente.',
    orgaoSugerido: 'Secretaria da Fazenda estadual',
    etapasSugeridas: [
      'Confirmar dados do veículo',
      'Reunir documentação exigida',
      'Protocolar pedido',
      'Acompanhar análise',
      'Registrar decisão',
    ],
    documentosSugeridos: ['rg', 'cpf', 'crlv', 'laudo_medico'],
    aplicabilidade: 'Aplicável quando o cliente já possui veículo em seu nome.',
  },
  estacionamento_pcd: {
    tipo: 'estacionamento_pcd',
    nome: 'Cartão de estacionamento PCD',
    descricao: 'Credencial de estacionamento para pessoa com deficiência.',
    orgaoSugerido: 'Órgão municipal de trânsito',
    etapasSugeridas: [
      'Reunir documentação exigida',
      'Solicitar credencial',
      'Acompanhar análise',
      'Registrar emissão',
    ],
    documentosSugeridos: ['rg', 'cpf', 'comprovante_endereco', 'laudo_medico'],
    aplicabilidade: 'Aplicável mediante interesse do cliente. Emissão é municipal.',
  },
  rodizio: {
    tipo: 'rodizio',
    nome: 'Isenção de rodízio',
    descricao: 'Dispensa do rodízio municipal de veículos.',
    orgaoSugerido: 'Órgão municipal de trânsito',
    etapasSugeridas: [
      'Confirmar dados do veículo',
      'Reunir documentação exigida',
      'Solicitar isenção',
      'Registrar decisão',
    ],
    documentosSugeridos: ['rg', 'cpf', 'crlv', 'laudo_medico'],
    aplicabilidade: 'Aplicável apenas em municípios com rodízio e conforme regra local.',
  },
  recurso: {
    tipo: 'recurso',
    nome: 'Recurso',
    descricao: 'Contestação de decisão desfavorável em outro subprocesso.',
    etapasSugeridas: [
      'Analisar motivo do indeferimento',
      'Reunir documentação complementar',
      'Elaborar recurso',
      'Protocolar recurso',
      'Acompanhar análise',
      'Registrar decisão',
    ],
    documentosSugeridos: ['laudo_medico', 'declaracao', 'outro'],
    aplicabilidade: 'Aberto após indeferimento, quando houver fundamento para contestação.',
  },
}

/** Ordem de apresentação do catálogo na interface. */
export const ORDEM_SUBPROCESSOS: TipoSubprocesso[] = [
  'avaliacao_inicial',
  'ipi',
  'iof',
  'icms',
  'ipva',
  'estacionamento_pcd',
  'rodizio',
  'recurso',
]

export function definicaoSubprocesso(tipo: TipoSubprocesso): DefinicaoSubprocesso {
  return CATALOGO_SUBPROCESSOS[tipo]
}
