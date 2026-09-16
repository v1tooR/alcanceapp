import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground border border-border rounded-xl shadow-xs',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-4 sm:p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-[0.98rem] font-bold leading-tight tracking-[-0.02em]', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground leading-snug', className)} {...props} />
}

// Sem padding superior por padrão (o cabeçalho já espaça). Não usamos
// `sm:pt-0`: ele anularia o `pt-*` passado pelas telas em telas maiores.
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 pb-4 sm:px-5 sm:pb-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-5 sm:pb-5', className)}
      {...props}
    />
  )
}

/** Cabeçalho com título à esquerda e ações à direita. */
export function CardBarra({
  titulo,
  descricao,
  acoes,
  className,
}: {
  titulo: React.ReactNode
  descricao?: React.ReactNode
  acoes?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5 border-b border-border',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[0.98rem] font-bold leading-tight tracking-[-0.02em]">{titulo}</h3>
        {descricao && <p className="text-sm text-muted-foreground mt-0.5">{descricao}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2 shrink-0">{acoes}</div>}
    </div>
  )
}
