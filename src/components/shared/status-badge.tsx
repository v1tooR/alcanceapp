import { Badge, type BadgeProps } from '@/components/ui/badge'
import {
  ROTULO_PRIORIDADE,
  ROTULO_STATUS_DOCUMENTO,
  ROTULO_STATUS_ETAPA,
  ROTULO_STATUS_FINANCEIRO,
  ROTULO_STATUS_PROCESSO,
  ROTULO_STATUS_SUBPROCESSO,
  ROTULO_TIPO_SUBPROCESSO,
  TOM_PRIORIDADE,
  TOM_STATUS_DOCUMENTO,
  TOM_STATUS_ETAPA,
  TOM_STATUS_FINANCEIRO,
  TOM_STATUS_PROCESSO,
  TOM_STATUS_SUBPROCESSO,
} from '@/lib/rotulos'
import type {
  Prioridade,
  StatusDocumento,
  StatusEtapa,
  StatusFinanceiro,
  StatusProcesso,
  StatusSubprocesso,
  TipoSubprocesso,
} from '@/types/domain'

/**
 * Badges de status do domínio. Cada status tem um único rótulo e um único tom
 * em toda a aplicação — a leitura fica previsível em qualquer tela.
 */

type Props = Omit<BadgeProps, 'tom' | 'children'>

export function StatusProcessoBadge({ status, ...props }: Props & { status: StatusProcesso }) {
  return (
    <Badge tom={TOM_STATUS_PROCESSO[status]} ponto {...props}>
      {ROTULO_STATUS_PROCESSO[status]}
    </Badge>
  )
}

export function StatusSubprocessoBadge({
  status,
  ...props
}: Props & { status: StatusSubprocesso }) {
  return (
    <Badge tom={TOM_STATUS_SUBPROCESSO[status]} ponto {...props}>
      {ROTULO_STATUS_SUBPROCESSO[status]}
    </Badge>
  )
}

export function StatusEtapaBadge({ status, ...props }: Props & { status: StatusEtapa }) {
  return (
    <Badge tom={TOM_STATUS_ETAPA[status]} tamanho="sm" {...props}>
      {ROTULO_STATUS_ETAPA[status]}
    </Badge>
  )
}

export function StatusDocumentoBadge({ status, ...props }: Props & { status: StatusDocumento }) {
  return (
    <Badge tom={TOM_STATUS_DOCUMENTO[status]} ponto {...props}>
      {ROTULO_STATUS_DOCUMENTO[status]}
    </Badge>
  )
}

export function PrioridadeBadge({ prioridade, ...props }: Props & { prioridade: Prioridade }) {
  // "Normal" é o padrão da operação: não polui a tela com um selo redundante.
  if (prioridade === 'normal') return null
  return (
    <Badge tom={TOM_PRIORIDADE[prioridade]} tamanho="sm" {...props}>
      {ROTULO_PRIORIDADE[prioridade]}
    </Badge>
  )
}

export function StatusFinanceiroBadge({ status, ...props }: Props & { status: StatusFinanceiro }) {
  return (
    <Badge tom={TOM_STATUS_FINANCEIRO[status]} ponto {...props}>
      {ROTULO_STATUS_FINANCEIRO[status]}
    </Badge>
  )
}

export function TipoSubprocessoBadge({ tipo, ...props }: Props & { tipo: TipoSubprocesso }) {
  return (
    <Badge tom="contorno" tamanho="sm" {...props}>
      {ROTULO_TIPO_SUBPROCESSO[tipo]}
    </Badge>
  )
}
