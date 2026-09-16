import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'

/**
 * Escolha única entre poucas opções, com aparência de botões agrupados.
 * Semântica de grupo de rádio: setas do teclado mudam a seleção.
 */
export function ControleSegmentado<T extends string>({
  valor,
  aoMudar,
  opcoes,
  rotulo,
  className,
}: {
  valor: T
  aoMudar: (valor: T) => void
  opcoes: Array<{ valor: T; rotulo: string }>
  rotulo: string
  className?: string
}) {
  return (
    <RadioGroupPrimitive.Root
      value={valor}
      onValueChange={(proximo) => aoMudar(proximo as T)}
      aria-label={rotulo}
      orientation="horizontal"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-1 shadow-xs',
        className,
      )}
    >
      {opcoes.map((opcao) => (
        <RadioGroupPrimitive.Item
          key={opcao.valor}
          value={opcao.valor}
          className={cn(
            'cursor-pointer rounded-sm px-3 py-1.5 text-sm font-semibold text-muted-foreground',
            'transition-colors duration-150 hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
          )}
        >
          {opcao.rotulo}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
