import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer size-4.5 shrink-0 rounded-xs border border-input-border bg-input cursor-pointer',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3.5" aria-hidden="true" />
        ) : (
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})

/** Caixa com rótulo e descrição opcional, com área de clique ampla. */
export function CheckboxCampo({
  id,
  rotulo,
  descricao,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  rotulo: React.ReactNode
  descricao?: React.ReactNode
  checked: boolean
  onCheckedChange: (valor: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3 rounded-md border border-border p-3 transition-colors',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/60',
        checked && !disabled && 'border-primary/40 bg-primary-soft/50',
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(valor) => onCheckedChange(valor === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug">{rotulo}</span>
        {descricao && (
          <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">{descricao}</span>
        )}
      </span>
    </label>
  )
}
