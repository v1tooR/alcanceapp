import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { obrigatorio?: boolean }
>(function Label({ className, obrigatorio, children, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm font-semibold text-foreground leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    >
      {children}
      {obrigatorio && (
        <span className="text-danger ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  )
})
