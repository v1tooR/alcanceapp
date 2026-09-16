import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface PropsControle {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

export interface CampoProps {
  rotulo: React.ReactNode
  /** Texto de apoio exibido abaixo do rótulo. */
  dica?: React.ReactNode
  erro?: string
  obrigatorio?: boolean
  className?: string
  /** Recebe os atributos de acessibilidade já resolvidos. */
  children: (props: PropsControle) => React.ReactNode
}

/**
 * Envelope de campo de formulário: associa rótulo, dica e mensagem de erro ao
 * controle por `id`/`aria-describedby`, sem que cada tela precise repetir isso.
 */
export function Campo({ rotulo, dica, erro, obrigatorio, className, children }: CampoProps) {
  const idBase = React.useId()
  const id = `campo-${idBase}`
  const idDica = dica ? `${id}-dica` : undefined
  const idErro = erro ? `${id}-erro` : undefined
  const descritores = [idDica, idErro].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} obrigatorio={obrigatorio}>
        {rotulo}
      </Label>
      {dica && (
        <p id={idDica} className="text-xs text-muted-foreground leading-snug">
          {dica}
        </p>
      )}
      {children({
        id,
        'aria-invalid': Boolean(erro),
        'aria-describedby': descritores,
        'aria-required': obrigatorio || undefined,
      })}
      {erro && (
        <p
          id={idErro}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-danger leading-snug"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      )}
    </div>
  )
}

/** Agrupa campos relacionados com um título de seção. */
export function GrupoCampos({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string
  descricao?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-1 text-sm font-bold">{titulo}</legend>
      {descricao && <p className="mb-3 text-xs text-muted-foreground leading-snug">{descricao}</p>}
      <div className={cn('grid gap-4', !descricao && 'mt-3')}>{children}</div>
    </fieldset>
  )
}
