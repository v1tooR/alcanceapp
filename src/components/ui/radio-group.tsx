import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(function RadioGroup({ className, ...props }, ref) {
  return <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />
})

export const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(function RadioGroupItem({ className, ...props }, ref) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'aspect-square size-4.5 shrink-0 rounded-full border border-input-border bg-input cursor-pointer',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'data-[state=checked]:border-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2.5 rounded-full bg-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})

/** Opção em cartão, com área de clique ampla — melhor no celular. */
export function RadioCampo({
  value,
  id,
  rotulo,
  descricao,
  selecionado,
}: {
  value: string
  id: string
  rotulo: React.ReactNode
  descricao?: React.ReactNode
  selecionado: boolean
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
        selecionado ? 'border-primary/40 bg-primary-soft/50' : 'border-border hover:bg-muted/60',
      )}
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug">{rotulo}</span>
        {descricao && (
          <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">{descricao}</span>
        )}
      </span>
    </label>
  )
}
