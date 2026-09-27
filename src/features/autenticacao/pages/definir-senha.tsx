import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Campo } from '@/components/shared/campo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CarregandoPagina } from '@/components/ui/estados'
import { rotaInicial } from '@/lib/permissoes'
import { mensagemErroSegura } from '@/lib/privacidade'
import { esquemaNovaSenha, type DadosNovaSenha } from '@/schemas'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'

/**
 * Destino dos links de convite (primeiro acesso) e de recuperação de senha.
 *
 * O link traz uma sessão temporária na URL; aqui a pessoa define a senha e
 * segue para a sua área. Link vencido ou já usado cai no aviso de erro.
 */
export default function DefinirSenha() {
  const navegar = useNavigate()
  const restaurar = usarSessao((estado) => estado.restaurar)
  const [verificando, setVerificando] = React.useState(true)
  const [linkValido, setLinkValido] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [salvando, setSalvando] = React.useState(false)

  // Erro vindo do Auth no próprio link (ex.: token expirado).
  const erroNoLink = React.useMemo(() => {
    const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return parametros.get('error_code') ?? parametros.get('error')
  }, [])

  React.useEffect(() => {
    let ativo = true
    servicos.autenticacao
      .sessaoAtual()
      .then((sessao) => {
        if (ativo) setLinkValido(Boolean(sessao) && !erroNoLink)
      })
      .catch(() => {
        if (ativo) setLinkValido(false)
      })
      .finally(() => {
        if (ativo) setVerificando(false)
      })
    return () => {
      ativo = false
    }
  }, [erroNoLink])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DadosNovaSenha>({
    resolver: zodResolver(esquemaNovaSenha),
    defaultValues: { senha: '', confirmacao: '' },
  })

  async function aoEnviar(dados: DadosNovaSenha) {
    setSalvando(true)
    setErro(null)
    try {
      const sessao = await servicos.autenticacao.definirNovaSenha(dados.senha)
      await restaurar()
      navegar(rotaInicial(sessao.usuario.papel), { replace: true })
    } catch (falha) {
      setErro(mensagemErroSegura(falha, 'Não foi possível definir a senha. Tente novamente.'))
    } finally {
      setSalvando(false)
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

  if (verificando) return <CarregandoPagina rotulo="Verificando o link" />

  if (!linkValido) {
    return (
      <AuthLayout titulo="Link inválido" rodape={voltar}>
        <Alert tom="perigo" titulo="Este link expirou ou já foi usado">
          Peça um novo link em “Esqueci minha senha” ou fale com a equipe Alcance para receber um novo
          convite.
        </Alert>
        <Button asChild largura="cheia" className="mt-4">
          <Link to="/recuperar-senha">Pedir novo link</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Definir senha"
      descricao="Crie a senha que você usará para entrar. Use ao menos 8 caracteres."
      rodape={voltar}
    >
      <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
        {erro && <Alert tom="perigo">{erro}</Alert>}

        <Campo rotulo="Nova senha" erro={errors.senha?.message} obrigatorio>
          {(campo) => (
            <Input {...campo} {...register('senha')} type="password" autoComplete="new-password" autoFocus />
          )}
        </Campo>

        <Campo rotulo="Repita a senha" erro={errors.confirmacao?.message} obrigatorio>
          {(campo) => (
            <Input {...campo} {...register('confirmacao')} type="password" autoComplete="new-password" />
          )}
        </Campo>

        <Button type="submit" largura="cheia" tamanho="lg" carregando={salvando} textoCarregando="Salvando">
          <KeyRound aria-hidden="true" />
          Definir senha e entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
