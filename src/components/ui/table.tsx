import * as React from 'react'
import { cn } from '@/lib/utils'

/** Envolve a tabela em rolagem horizontal — a página nunca rola na horizontal. */
export function TableWrapper({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('w-full overflow-x-auto overscroll-x-contain', className)}
      tabIndex={0}
      role="region"
      aria-label="Tabela com rolagem horizontal"
      {...props}
    />
  )
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({
  className,
  interativa,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { interativa?: boolean }) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors',
        interativa && 'cursor-pointer hover:bg-muted/70 focus-within:bg-muted/70',
        className,
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 whitespace-nowrap px-3 text-left align-middle',
        'text-[11px] font-bold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-3 align-middle', className)} {...props} />
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <caption className={cn('mt-3 text-xs text-muted-foreground', className)} {...props} />
}
