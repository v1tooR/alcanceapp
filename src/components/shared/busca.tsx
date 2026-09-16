import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CampoBuscaProps {
  valor: string
  aoMudar: (valor: string) => void
  placeholder?: string
  /** Rótulo acessível — obrigatório, pois o campo não tem `<label>` visível. */
  rotulo: string
  className?: string
  /** Atraso antes de propagar a digitação. */
  atrasoMs?: number
}

/**
 * Busca com atraso de digitação. O campo responde imediatamente ao usuário e só
 * propaga o termo depois da pausa, mantendo a listagem fluida.
 */
export function CampoBusca({
  valor,
  aoMudar,
  placeholder = 'Buscar…',
  rotulo,
  className,
  atrasoMs = 250,
}: CampoBuscaProps) {
  const [local, setLocal] = React.useState(valor)
  const aoMudarRef = React.useRef(aoMudar)
  aoMudarRef.current = aoMudar

  // Mantém o campo sincronizado quando o filtro é limpo de fora.
  React.useEffect(() => {
    setLocal(valor)
  }, [valor])

  React.useEffect(() => {
    if (local === valor) return
    const id = window.setTimeout(() => aoMudarRef.current(local), atrasoMs)
    return () => window.clearTimeout(id)
  }, [local, valor, atrasoMs])

  return (
    <div className={cn('relative', className)}>
      <Input
        type="search"
        role="searchbox"
        aria-label={rotulo}
        placeholder={placeholder}
        value={local}
        onChange={(evento) => setLocal(evento.target.value)}
        iconeEsquerda={<Search />}
        className="pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal('')
            aoMudar('')
          }}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground',
            'cursor-pointer transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          )}
        >
          <X className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Limpar busca</span>
        </button>
      )}
    </div>
  )
}
