import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Campo } from '@/components/shared/campo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { rotaInicial } from '@/lib/permissoes'
import { esquemaLogin, type DadosLogin } from '@/schemas'
import { usarSessao } from '@/stores/sessao'

export default function Entrar() {
  const navegar = useNavigate()
  const local = useLocation()
  const entrar = usarSessao((estado) => estado.entrar)
  const entrando = usarSessao((estado) => estado.entrando)
  const erro = usarSessao((estado) => estado.erro)
  const limparErro = usarSessao((estado) => estado.limparErro)
  const [senhaVisivel, setSenhaVisivel] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DadosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: '', senha: '' },
  })

  async function aoEnviar(dados: DadosLogin) {
    limparErro()
    try {
      const usuario = await entrar({ email: dados.email, senha: dados.senha })
      const destino = (local.state as { de?: string } | null)?.de
      navegar(destino ?? rotaInicial(usuario.papel), { replace: true })
    } catch {
      // A mensagem já está no estado da sessão e é exibida no alerta abaixo.
    }
  }

  return (
    <AuthLayout
      titulo="Entrar"
      descricao="Use as credenciais fornecidas pela equipe Alcance."
    >
      <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
        {erro && <Alert tom="perigo">{erro}</Alert>}

        <Campo rotulo="E-mail" erro={errors.email?.message} obrigatorio>
          {(campo) => (
            <Input
              {...campo}
              {...register('email')}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="voce@exemplo.com.br"
            />
          )}
        </Campo>

        <Campo rotulo="Senha" erro={errors.senha?.message} obrigatorio>
          {(campo) => (
            <div className="relative">
              <Input
                {...campo}
                {...register('senha')}
                type={senhaVisivel ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setSenhaVisivel((atual) => !atual)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-pressed={senhaVisivel}
              >
                {senhaVisivel ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
                <span className="sr-only">{senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}</span>
              </button>
            </div>
          )}
        </Campo>

        <div className="flex justify-end">
          <Link
            to="/recuperar-senha"
            className="rounded-xs text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" largura="cheia" tamanho="lg" carregando={entrando} textoCarregando="Entrando">
          <LogIn aria-hidden="true" />
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
