import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('alc-skeleton', className)} aria-hidden="true" {...props} />
}

/** Bloco de linhas de texto — usado enquanto listas carregam. */
export function SkeletonTexto({ linhas = 3, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === linhas - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
