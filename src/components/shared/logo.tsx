import { cn } from '@/lib/utils'

/**
 * Marca da Alcance. Os arquivos vêm do kit oficial em `public/brand`.
 * Em superfícies escuras usamos o símbolo sobre uma pastilha clara, garantindo
 * contraste sem alterar as cores da marca.
 */

export function LogoAlcance({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-horizontal.svg"
      alt="Alcance Isenções"
      width={1374}
      height={495}
      className={cn('h-9 w-auto', className)}
      decoding="async"
    />
  )
}

export function MarcaAlcance({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-marca.svg"
      alt="Alcance Isenções"
      width={1374}
      height={398}
      className={cn('h-10 w-auto', className)}
      decoding="async"
    />
  )
}

export function SimboloAlcance({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-simbolo.svg"
      alt=""
      width={644}
      height={631}
      className={cn('size-full object-contain', className)}
      decoding="async"
      aria-hidden="true"
    />
  )
}

/** Símbolo + nome, para cabeçalhos sobre fundo escuro (barra lateral). */
export function MarcaCompacta({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface p-1.5">
        <SimboloAlcance />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-extrabold tracking-tight">Alcance</span>
        <span className="block truncate text-[10px] font-medium uppercase tracking-widest opacity-70">
          Isenções
        </span>
      </span>
    </span>
  )
}
