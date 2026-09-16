import * as React from 'react'
import { FlaskConical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { USANDO_DADOS_SIMULADOS } from '@/services'

const CHAVE = 'alcance:aviso-simulado-oculto'

/**
 * Deixa explícito que a tela roda sobre dados fictícios.
 *
 * Evita que uma demonstração seja confundida com o sistema em operação. Some
 * automaticamente quando `VITE_MODO_DADOS=api`.
 */
export function AvisoDadosSimulados() {
  const [oculto, setOculto] = React.useState(() => {
    try {
      return window.localStorage.getItem(CHAVE) === '1'
    } catch {
      return false
    }
  })

  if (!USANDO_DADOS_SIMULADOS || oculto) return null

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-warning-soft-foreground"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-xs leading-snug">
        <strong className="font-bold">Ambiente de demonstração.</strong> Os dados exibidos são
        fictícios e voltam ao estado inicial ao recarregar a página. Nenhuma informação real de
        cliente é usada aqui.
      </p>
      <Button
        variante="fantasma"
        tamanho="iconeSm"
        onClick={() => {
          setOculto(true)
          try {
            window.localStorage.setItem(CHAVE, '1')
          } catch {
            /* armazenamento indisponível — o aviso volta na próxima visita */
          }
        }}
      >
        <X aria-hidden="true" />
        <span className="sr-only">Ocultar aviso</span>
      </Button>
    </div>
  )
}
