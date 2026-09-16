import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  )
})

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Largura máxima do diálogo. */
  largura?: 'sm' | 'md' | 'lg' | 'xl'
  ocultarFechar?: boolean
}

const LARGURA = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
} as const

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent({ className, children, largura = 'md', ocultarFechar, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col bg-surface shadow-lg border border-border',
          // Celular: folha ancorada no rodapé, mais fácil de alcançar com o polegar.
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl',
          // Telas maiores: diálogo centralizado.
          'sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-[calc(100%-2rem)] sm:rounded-lg sm:max-h-[88dvh]',
          LARGURA[largura],
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {/* Puxador visual do formato folha, apenas no celular */}
        <div
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong sm:hidden"
          aria-hidden="true"
        />
        {children}
        {!ocultarFechar && (
          <DialogPrimitive.Close
            className={cn(
              'absolute right-3 top-3 rounded-sm p-1.5 text-muted-foreground cursor-pointer',
              'transition-colors hover:bg-muted hover:text-foreground',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            )}
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 px-5 pt-5 pb-3 pr-12 shrink-0', className)}
      {...props}
    />
  )
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-5 py-1', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 px-5 pt-4 pb-5 shrink-0 border-t border-border mt-3',
        'sm:flex-row sm:justify-end pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    />
  )
}

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-bold leading-tight', className)}
      {...props}
    />
  )
})

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground leading-snug', className)}
      {...props}
    />
  )
})
