import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { Tom } from '@/lib/rotulos'

const badgeVariantes = cva(
  'inline-flex items-center gap-1.5 rounded-pill border font-semibold whitespace-nowrap',
  {
    variants: {
      tom: {
        neutro: 'bg-neutral-soft text-neutral-soft-foreground border-transparent',
        info: 'bg-info-soft text-info-soft-foreground border-transparent',
        sucesso: 'bg-success-soft text-success-soft-foreground border-transparent',
        alerta: 'bg-warning-soft text-warning-soft-foreground border-transparent',
        perigo: 'bg-danger-soft text-danger-soft-foreground border-transparent',
        primario: 'bg-primary-soft text-primary-soft-foreground border-transparent',
        destaque: 'bg-accent-soft text-accent-soft-foreground border-transparent',
        contorno: 'bg-transparent text-muted-foreground border-border-strong',
      },
      tamanho: {
        sm: 'px-2 py-0.5 text-[11px] leading-4 [&_svg]:size-3',
        md: 'px-2.5 py-1 text-xs leading-4 [&_svg]:size-3.5',
      },
    },
    defaultVariants: { tom: 'neutro', tamanho: 'md' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariantes>, 'tom'> {
  tom?: Tom | 'contorno'
  /** Marcador circular à esquerda, útil para status em listas densas. */
  ponto?: boolean
}

const COR_PONTO: Record<Tom | 'contorno', string> = {
  neutro: 'bg-neutral-soft-foreground',
  info: 'bg-info',
  sucesso: 'bg-success',
  alerta: 'bg-warning',
  perigo: 'bg-danger',
  primario: 'bg-primary',
  destaque: 'bg-accent',
  contorno: 'bg-muted-foreground',
}

export function Badge({ className, tom = 'neutro', tamanho, ponto, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariantes({ tom, tamanho }), className)} {...props}>
      {ponto && (
        <span className={cn('size-1.5 rounded-full shrink-0', COR_PONTO[tom])} aria-hidden="true" />
      )}
      {children}
    </span>
  )
}

export { badgeVariantes }
