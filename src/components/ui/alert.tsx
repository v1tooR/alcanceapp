import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertaVariantes = cva('flex gap-3 rounded-md border p-3.5 text-sm', {
  variants: {
    tom: {
      info: 'bg-info-soft text-info-soft-foreground border-info/20',
      sucesso: 'bg-success-soft text-success-soft-foreground border-success/20',
      alerta: 'bg-warning-soft text-warning-soft-foreground border-warning/25',
      perigo: 'bg-danger-soft text-danger-soft-foreground border-danger/25',
      privacidade: 'bg-primary-soft text-primary-soft-foreground border-primary/20',
    },
  },
  defaultVariants: { tom: 'info' },
})

const ICONE = {
  info: Info,
  sucesso: CheckCircle2,
  alerta: AlertTriangle,
  perigo: XCircle,
  privacidade: ShieldAlert,
} as const

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertaVariantes> {
  titulo?: React.ReactNode
  acao?: React.ReactNode
}

export function Alert({ className, tom = 'info', titulo, acao, children, ...props }: AlertProps) {
  const Icone = ICONE[tom ?? 'info']
  return (
    <div
      role={tom === 'perigo' ? 'alert' : 'status'}
      className={cn(alertaVariantes({ tom }), className)}
      {...props}
    >
      <Icone className="size-4.5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-bold leading-snug">{titulo}</p>}
        {children && <div className={cn('leading-snug', titulo && 'mt-1')}>{children}</div>}
      </div>
      {acao && <div className="shrink-0 self-center">{acao}</div>}
    </div>
  )
}
