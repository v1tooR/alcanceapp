import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatarNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'

export interface PaginacaoProps {
  pagina: number
  tamanhoPagina: number
  total: number
  aoMudarPagina: (pagina: number) => void
  aoMudarTamanho?: (tamanho: number) => void
  opcoesTamanho?: number[]
  /** Nome do que está sendo paginado, no plural (ex.: "clientes"). */
  rotuloItens?: string
  className?: string
}

export function Paginacao({
  pagina,
  tamanhoPagina,
  total,
  aoMudarPagina,
  aoMudarTamanho,
  opcoesTamanho = [10, 25, 50],
  rotuloItens = 'registros',
  className,
}: PaginacaoProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina))
  const primeiro = total === 0 ? 0 : (pagina - 1) * tamanhoPagina + 1
  const ultimo = Math.min(pagina * tamanhoPagina, total)

  if (total === 0) return null

  return (
    <nav
      aria-label="Paginação"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3',
        className,
      )}
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        <span className="font-semibold text-foreground tabular-nums">
          {formatarNumero(primeiro)}–{formatarNumero(ultimo)}
        </span>{' '}
        de <span className="font-semibold text-foreground tabular-nums">{formatarNumero(total)}</span>{' '}
        {rotuloItens}
      </p>

      <div className="flex items-center gap-2">
        {aoMudarTamanho && (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs text-muted-foreground">Por página</span>
            <Select
              value={String(tamanhoPagina)}
              onValueChange={(valor) => aoMudarTamanho(Number(valor))}
            >
              <SelectTrigger tamanho="sm" className="w-18" aria-label="Registros por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcoesTamanho.map((opcao) => (
                  <SelectItem key={opcao} value={String(opcao)}>
                    {opcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variante="contorno"
            tamanho="iconeSm"
            onClick={() => aoMudarPagina(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="px-2 text-xs font-medium tabular-nums">
            {pagina} <span className="text-muted-foreground">de {totalPaginas}</span>
          </span>
          <Button
            variante="contorno"
            tamanho="iconeSm"
            onClick={() => aoMudarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Próxima página"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
