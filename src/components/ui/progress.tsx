import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn, faixa } from '@/lib/utils'

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  valor: number
  tom?: 'primario' | 'sucesso' | 'alerta'
  /** Rótulo acessível do que está sendo medido. */
  rotulo: string
}

const COR_BARRA = {
  primario: 'bg-primary',
  sucesso: 'bg-success',
  alerta: 'bg-warning',
} as const

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(function Progress({ className, valor, tom = 'primario', rotulo, ...props }, ref) {
  const seguro = faixa(Math.round(valor), 0, 100)
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={seguro}
      aria-label={rotulo}
      className={cn('relative h-2 w-full overflow-hidden rounded-pill bg-muted', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full rounded-pill transition-[width] duration-500 ease-out', COR_BARRA[tom])}
        style={{ width: `${seguro}%` }}
      />
    </ProgressPrimitive.Root>
  )
})
