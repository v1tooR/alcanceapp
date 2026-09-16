import * as React from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Campo } from '@/components/shared/campo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { esquemaRecuperacao, type DadosRecuperacao } from '@/schemas'
import { servicos } from '@/services'

export default function RecuperarSenha() {
  const [enviado, setEnviado] = React.useState(false)
  const [enviando, setEnviando] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DadosRecuperacao>({
    resolver: zodResolver(esquemaRecuperacao),
    defaultValues: { email: '' },
  })

  async function aoEnviar(dados: DadosRecuperacao) {
    setEnviando(true)
    try {
      await servicos.autenticacao.solicitarRecuperacaoSenha(dados.email)
      setEnviado(true)
    } finally {
      setEnviando(false)
    }
  }

  const voltar = (
    <Link
      to="/entrar"
      className="inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Voltar para a entrada
    </Link>
  )

  if (enviado) {
    return (
      <AuthLayout titulo="Verifique seu e-mail" rodape={voltar}>
        <Alert tom="sucesso" titulo="Solicitação registrada">
          Se houver uma conta com esse e-mail, enviaremos as instruções de redefinição em alguns
          minutos. Confira também a caixa de spam.
        </Alert>
        <p className="mt-4 text-xs text-muted-foreground leading-snug">
          Por segurança, não informamos se um e-mail está ou não cadastrado.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Recuperar senha"
      descricao="Informe o e-mail cadastrado e enviaremos as instruções para criar uma nova senha."
      rodape={voltar}
    >
      <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
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

        <Button
          type="submit"
          largura="cheia"
          tamanho="lg"
          carregando={enviando}
          textoCarregando="Enviando"
        >
          <MailCheck aria-hidden="true" />
          Enviar instruções
        </Button>
      </form>
    </AuthLayout>
  )
}
