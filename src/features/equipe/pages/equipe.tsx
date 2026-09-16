import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserPlus, UsersRound } from 'lucide-react'
import { CartaoPessoa, ResumoEquipe } from '@/features/equipe/components/cartao-pessoa'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { Campo, GrupoCampos } from '@/components/shared/campo'
import { InputTelefone } from '@/components/shared/campos-mascarados'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckboxCampo } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apenasDigitos } from '@/lib/mascaras'
import { mensagemErroSegura } from '@/lib/privacidade'
import { DESCRICAO_PAPEL, ROTULO_PAPEL } from '@/lib/rotulos'
import { papeisAtribuiveis, temPermissao } from '@/lib/permissoes'
import { esquemaUsuario, type DadosUsuario } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'
import type { Usuario } from '@/types/domain'

export default function Equipe() {
  const papel = usarSessao((estado) => estado.usuario?.papel)
  const podeEditar = temPermissao(papel, 'equipe.editar')
  const [emEdicao, setEmEdicao] = React.useState<Usuario | null>(null)
  const [criando, setCriando] = React.useState(false)

  const consulta = useQuery({
    queryKey: chaves.usuarios.lista(),
    queryFn: () => servicos.usuarios.listar(),
  })

  const equipe = (consulta.data ?? []).filter((usuario) => usuario.papel !== 'cliente')

  // A carga vem da mesma consulta analítica do painel — mesmo cache, mesmos números.
  const analitico = useQuery({
    queryKey: chaves.painel.analitico(6),
    queryFn: () => servicos.painel.analitico(6),
  })
  const cargaPorUsuario = new Map(
    (analitico.data?.cargaEquipe ?? []).map((linha) => [linha.usuarioId, linha]),
  )
  const maiorCarga = Math.max(1, ...(analitico.data?.cargaEquipe ?? []).map((linha) => linha.ativos))

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Gestão"
        titulo="Equipe"
        descricao="Usuários com acesso ao painel administrativo e seus níveis de permissão."
        acoes={
          podeEditar && (
            <Button onClick={() => setCriando(true)}>
              <UserPlus aria-hidden="true" />
              Novo usuário
            </Button>
          )
        }
      />

      <Alert tom="privacidade" className="mb-4">
        Estes níveis controlam o que aparece na interface. A autorização efetiva de acesso aos dados
        é aplicada pelo backend e precisa ser configurada na integração.
      </Alert>

      <ResumoEquipe
        usuarios={equipe}
        carga={analitico.data?.cargaEquipe}
        carregando={consulta.isLoading || analitico.isLoading}
      />

      {consulta.isLoading ? (
        <Card>
          <EstadoCarregando rotulo="Carregando equipe" />
        </Card>
      ) : consulta.isError ? (
        <Card>
          <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
        </Card>
      ) : equipe.length === 0 ? (
        <Card>
          <EstadoVazio icone={UsersRound} titulo="Nenhum usuário cadastrado" compacto />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {equipe.map((usuario) => (
            <li key={usuario.id}>
              <CartaoPessoa
                usuario={usuario}
                carga={cargaPorUsuario.get(usuario.id)}
                maiorCarga={maiorCarga}
                podeEditar={podeEditar}
                aoEditar={() => setEmEdicao(usuario)}
              />
            </li>
          ))}
        </ul>
      )}

      <DialogoUsuario
        aberto={criando || emEdicao !== null}
        usuario={emEdicao}
        aoFechar={() => {
          setCriando(false)
          setEmEdicao(null)
        }}
      />
    </EntradaPagina>
  )
}

function DialogoUsuario({
  aberto,
  usuario,
  aoFechar,
}: {
  aberto: boolean
  usuario: Usuario | null
  aoFechar: () => void
}) {
  const clienteConsulta = useQueryClient()
  const papelAtual = usarSessao((estado) => estado.usuario?.papel)
  const papeis = papeisAtribuiveis(papelAtual).filter((item) => item !== 'cliente')

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DadosUsuario>({
    resolver: zodResolver(esquemaUsuario),
    defaultValues: { nome: '', email: '', telefone: '', papel: 'analista', cargo: '', ativo: true },
  })

  React.useEffect(() => {
    if (!aberto) return
    reset(
      usuario
        ? {
            nome: usuario.nome,
            email: usuario.email,
            telefone: usuario.telefone ?? '',
            papel: usuario.papel,
            cargo: usuario.cargo ?? '',
            ativo: usuario.ativo,
          }
        : { nome: '', email: '', telefone: '', papel: 'analista', cargo: '', ativo: true },
    )
  }, [aberto, usuario, reset])

  const salvar = useMutation({
    mutationFn: (dados: DadosUsuario) => {
      const payload = {
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone ? apenasDigitos(dados.telefone) : undefined,
        papel: dados.papel,
        cargo: dados.cargo || undefined,
        ativo: dados.ativo,
      }
      return usuario
        ? servicos.usuarios.atualizar(usuario.id, payload)
        : servicos.usuarios.criar(payload)
    },
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.usuarios.todos })
      toast.success(usuario ? 'Usuário atualizado' : 'Usuário criado', {
        description: usuario
          ? undefined
          : 'O convite e a definição de senha dependem do serviço de autenticação.',
      })
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && aoFechar()}>
      <DialogContent>
        <form onSubmit={handleSubmit((dados) => salvar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>{usuario ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
            <DialogDescription>
              As permissões abaixo definem o que cada pessoa enxerga no painel.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="py-3">
            <GrupoCampos titulo="Dados do usuário">
              <Campo rotulo="Nome" erro={errors.nome?.message} obrigatorio>
                {(campo) => <Input {...campo} {...register('nome')} autoComplete="name" />}
              </Campo>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="E-mail" erro={errors.email?.message} obrigatorio>
                  {(campo) => <Input {...campo} {...register('email')} type="email" />}
                </Campo>

                <Campo rotulo="Telefone" erro={errors.telefone?.message}>
                  {(campo) => (
                    <Controller
                      control={control}
                      name="telefone"
                      render={({ field }) => (
                        <InputTelefone {...campo} value={field.value ?? ''} onChange={field.onChange} />
                      )}
                    />
                  )}
                </Campo>
              </div>

              <Campo rotulo="Cargo" erro={errors.cargo?.message}>
                {(campo) => <Input {...campo} {...register('cargo')} placeholder="Ex.: Analista de processos" />}
              </Campo>

              <Campo rotulo="Nível de acesso" erro={errors.papel?.message} obrigatorio>
                {(campo) => (
                  <Controller
                    control={control}
                    name="papel"
                    render={({ field }) => (
                      <>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id={campo.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {papeis.map((item) => (
                              <SelectItem key={item} value={item}>
                                {ROTULO_PAPEL[item]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-snug">
                          {DESCRICAO_PAPEL[field.value]}
                        </p>
                      </>
                    )}
                  />
                )}
              </Campo>

              <Controller
                control={control}
                name="ativo"
                render={({ field }) => (
                  <CheckboxCampo
                    id="usuario-ativo"
                    rotulo="Acesso ativo"
                    descricao="Desmarque para suspender o acesso sem excluir o histórico."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </GrupoCampos>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Salvando">
              {usuario ? 'Salvar alterações' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
