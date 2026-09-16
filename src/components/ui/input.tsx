import * as React from 'react'
import { cn } from '@/lib/utils'

export const classeCampo = [
  'w-full rounded-md border border-input-border bg-input text-foreground',
  'px-3 py-2 text-sm leading-6 transition-colors duration-150',
  'placeholder:text-muted-foreground/70',
  'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/25',
].join(' ')

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Ícone decorativo à esquerda do campo. */
  iconeEsquerda?: React.ReactNode
  iconeDireita?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', iconeEsquerda, iconeDireita, ...props },
  ref,
) {
  if (!iconeEsquerda && !iconeDireita) {
    return <input ref={ref} type={type} className={cn(classeCampo, 'h-10', className)} {...props} />
  }

  return (
    <div className="relative">
      {iconeEsquerda && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4 pointer-events-none"
          aria-hidden="true"
        >
          {iconeEsquerda}
        </span>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          classeCampo,
          'h-10',
          iconeEsquerda && 'pl-9',
          iconeDireita && 'pr-9',
          className,
        )}
        {...props}
      />
      {iconeDireita && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
          {iconeDireita}
        </span>
      )}
    </div>
  )
})
