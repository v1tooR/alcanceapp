import { Toaster as Sonner } from 'sonner'

/**
 * Notificações de ação (Sonner) com os tokens da Alcance.
 * Regra: a mensagem nunca deve conter dado pessoal sensível — ver
 * `src/lib/privacidade.ts`.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      richColors={false}
      closeButton
      duration={4500}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-md border border-border bg-surface text-foreground shadow-md text-sm items-start',
          title: 'font-bold leading-snug',
          description: 'text-muted-foreground leading-snug',
          actionButton: 'bg-primary text-primary-foreground rounded-sm font-semibold',
          cancelButton: 'bg-muted text-muted-foreground rounded-sm font-semibold',
          closeButton: 'bg-surface border-border text-muted-foreground hover:text-foreground',
          success: 'border-success/25 [&_[data-icon]]:text-success',
          error: 'border-danger/25 [&_[data-icon]]:text-danger',
          warning: 'border-warning/30 [&_[data-icon]]:text-warning',
          info: 'border-info/25 [&_[data-icon]]:text-info',
        },
      }}
    />
  )
}
