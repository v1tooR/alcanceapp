import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, iniciais } from '@/lib/utils'

const TAMANHOS = {
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-lg',
} as const

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  nome: string
  src?: string
  tamanho?: keyof typeof TAMANHOS
}

export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(function Avatar({ nome, src, tamanho = 'md', className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full border border-border',
        TAMANHOS[tamanho],
        className,
      )}
      {...props}
    >
      {src && (
        <AvatarPrimitive.Image src={src} alt="" className="aspect-square size-full object-cover" />
      )}
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center bg-primary-soft text-primary-soft-foreground font-bold"
        delayMs={src ? 300 : 0}
      >
        <span aria-hidden="true">{iniciais(nome)}</span>
        <span className="sr-only">{nome}</span>
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
})
