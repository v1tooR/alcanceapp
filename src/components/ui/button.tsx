import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const botaoVariantes = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold',
    'rounded-md transition-colors duration-150 outline-none cursor-pointer select-none',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:shrink-0 [&_svg]:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variante: {
        primario: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs',
        destaque: 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-xs',
        secundario: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        contorno:
          'border border-input-border bg-surface text-foreground hover:bg-muted hover:border-border-strong',
        fantasma: 'text-foreground hover:bg-muted',
        suave: 'bg-primary-soft text-primary-soft-foreground hover:bg-secondary',
        perigo: 'bg-danger text-danger-foreground hover:brightness-95 shadow-xs',
        perigoSuave: 'bg-danger-soft text-danger-soft-foreground hover:brightness-95',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      tamanho: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icone: 'size-10 [&_svg]:size-4',
        iconeSm: 'size-8 [&_svg]:size-3.5',
      },
      largura: {
        auto: '',
        cheia: 'w-full',
      },
    },
    defaultVariants: { variante: 'primario', tamanho: 'md', largura: 'auto' },
  },
)

export interface BotaoProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof botaoVariantes> {
  asChild?: boolean
  carregando?: boolean
  /** Texto anunciado a leitores de tela enquanto `carregando` é verdadeiro. */
  textoCarregando?: string
}

export const Button = React.forwardRef<HTMLButtonElement, BotaoProps>(function Button(
  {
    className,
    variante,
    tamanho,
    largura,
    asChild = false,
    carregando = false,
    textoCarregando = 'Processando',
    children,
    disabled,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : 'button'

  if (asChild) {
    return (
      <Comp
        ref={ref}
        className={cn(botaoVariantes({ variante, tamanho, largura }), className)}
        {...props}
      >
        {children}
      </Comp>
    )
  }

  return (
    <button
      ref={ref}
      className={cn(botaoVariantes({ variante, tamanho, largura }), className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando && <Loader2 className="animate-spin" aria-hidden="true" />}
      {carregando ? <span className="sr-only">{textoCarregando}. </span> : null}
      {children}
    </button>
  )
})

export { botaoVariantes }
