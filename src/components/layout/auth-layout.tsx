import * as React from 'react'
import { LogoAlcance } from '@/components/shared/logo'

/**
 * Casca das telas públicas.
 *
 * No desktop, uma coluna institucional acompanha o formulário; no celular, só o
 * formulário — o conteúdo decorativo não disputa espaço com a tarefa.
 */
export function AuthLayout({
  titulo,
  descricao,
  children,
  rodape,
}: {
  titulo: string
  descricao?: React.ReactNode
  children: React.ReactNode
  rodape?: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Coluna institucional */}
      <aside className="alc-gradient-deep relative hidden w-2/5 max-w-lg shrink-0 flex-col justify-between p-10 text-on-brand lg:flex">
        <div className="alc-halo absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="alc-textura-pontos absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative">
          <img
            src="/brand/logo-simbolo.svg"
            alt=""
            width={644}
            height={631}
            className="size-14"
            aria-hidden="true"
          />
        </div>
        <div className="relative">
          <p className="alc-chapeu text-on-brand-muted">Área restrita</p>
          <p className="alc-titulo-display mt-4 text-[2.4rem]">
            Seu processo de isenção, <span className="alc-destaque">do cadastro</span> à conclusão.
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed opacity-80">
            Um só lugar para a equipe registrar cada etapa e para o cliente
            acompanhar o que já foi feito e o que ainda falta.
          </p>
        </div>
        <p className="relative text-xs opacity-60">Alcance Isenções</p>
      </aside>

      {/* Formulário */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <LogoAlcance className="h-10" />
          </div>

          <h1 className="alc-titulo-display text-[2.1rem]">{titulo}</h1>
          {descricao && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-snug">{descricao}</p>
          )}

          <div className="mt-6">{children}</div>

          {rodape && <div className="mt-6">{rodape}</div>}
        </div>
      </main>
    </div>
  )
}
