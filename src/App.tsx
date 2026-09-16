import * as React from 'react'
import { RouterProvider } from 'react-router-dom'
import { Provedores } from '@/app/providers'
import { roteador } from '@/app/router'
import { usarSessao } from '@/stores/sessao'

export function App() {
  const restaurar = usarSessao((estado) => estado.restaurar)

  // Verifica uma única vez se já existe sessão ativa antes de montar as rotas.
  React.useEffect(() => {
    void restaurar()
  }, [restaurar])

  return (
    <Provedores>
      <RouterProvider router={roteador} />
    </Provedores>
  )
}
