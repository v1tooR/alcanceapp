import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoAlcance } from '@/components/shared/logo'
import { rotaInicial } from '@/lib/permissoes'
import { usarSessao } from '@/stores/sessao'

export default function NaoEncontrado() {
  const usuario = usarSessao((estado) => estado.usuario)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <LogoAlcance className="h-9" />

      <span
        className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary"
        aria-hidden="true"
      >
        <Compass className="size-8" />
      </span>

      <div className="max-w-md">
        <p className="alc-chapeu justify-center text-primary">Erro 404</p>
        <h1 className="alc-titulo-display mt-3 text-[2.2rem]">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-snug">
          O endereço acessado não existe ou foi movido. Se você chegou aqui por um link enviado pela
          equipe, avise para que possamos corrigir.
        </p>
      </div>

      <Button asChild>
        <Link to={rotaInicial(usuario?.papel)}>
          <Home aria-hidden="true" />
          Ir para o início
        </Link>
      </Button>
    </div>
  )
}
