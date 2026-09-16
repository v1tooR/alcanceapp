import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'flex items-center gap-1 overflow-x-auto border-b border-border',
        // Esconde a barra de rolagem mantendo o gesto de arrastar no celular
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  )
})

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-2.5',
        'text-sm font-semibold text-muted-foreground cursor-pointer transition-colors',
        'border-b-2 border-transparent -mb-px',
        'hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-t-sm',
        'data-[state=active]:border-primary data-[state=active]:text-primary',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
})

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('mt-4 focus-visible:outline-none', className)}
      {...props}
    />
  )
})

/** Contador discreto ao lado do rótulo da aba. */
export function TabsContador({ valor }: { valor: number }) {
  if (valor <= 0) return null
  return (
    <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[11px] font-bold leading-4 text-muted-foreground">
      {valor}
    </span>
  )
}
