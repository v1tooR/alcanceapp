import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Campo } from '@/components/shared/campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mensagemErroSegura } from '@/lib/privacidade'
import { esquemaMeuNome, type DadosMeuNome } from '@/schemas'
import { servicos } from '@/services'
import { chaves } from '@/services/chaves'
import { usarSessao } from '@/stores/sessao'

/**
 * Nome da pessoa logada, com edição no próprio lugar (Configurações → Minha
 * conta). Só o nome: e-mail e nível de acesso ficam com o administrador.
 */
export function MeuNome() {
  const usuario = usarSessao((estado) => estado.usuario)
  const atualizarUsuario = usarSessao((estado) => estado.atualizarUsuario)
  const clienteConsulta = useQueryClient()
  const [editando, setEditando] = React.useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DadosMeuNome>({
    resolver: zodResolver(esquemaMeuNome),
    values: { nome: usuario?.nome ?? '' },
  })

  const salvar = useMutation({
    mutationFn: (dados: DadosMeuNome) => servicos.usuarios.atualizarMeuNome(dados.nome),
    onSuccess: (atualizado) => {
      atualizarUsuario(atualizado)
      void clienteConsulta.invalidateQueries({ queryKey: chaves.usuarios.todos })
      toast.success('Nome atualizado')
      setEditando(false)
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha, 'Não foi possível salvar o nome.')),
  })

  if (!editando) {
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</dt>
          <dd className="mt-0.5 break-words">{usuario?.nome}</dd>
        </div>
        <Button variante="fantasma" tamanho="sm" onClick={() => setEditando(true)}>
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit((dados) => salvar.mutate(dados))}
      className="space-y-2"
      noValidate
    >
      <Campo rotulo="Nome" erro={errors.nome?.message} obrigatorio>
        {(campo) => <Input {...campo} {...register('nome')} autoComplete="name" autoFocus />}
      </Campo>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variante="contorno"
          tamanho="sm"
          disabled={salvar.isPending}
          onClick={() => {
            reset()
            setEditando(false)
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" tamanho="sm" carregando={salvar.isPending} textoCarregando="Salvando">
          Salvar
        </Button>
      </div>
    </form>
  )
}
