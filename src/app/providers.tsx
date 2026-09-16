import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { clienteConsulta } from '@/app/query-client'
import { aplicarTema, usarPreferencias } from '@/stores/preferencias'

function ControleTema() {
  const tema = usarPreferencias((estado) => estado.tema)

  React.useEffect(() => {
    aplicarTema(tema)
    if (tema !== 'sistema') return

    // Só faz sentido observar o sistema quando o usuário escolheu segui-lo.
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudar = () => aplicarTema('sistema')
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [tema])

  return null
}

export function Provedores({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={clienteConsulta}>
      <TooltipProvider delayDuration={300} skipDelayDuration={0}>
        <ControleTema />
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
