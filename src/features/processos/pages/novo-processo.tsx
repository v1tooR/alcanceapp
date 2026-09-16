import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FolderPlus, Info } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { Campo, GrupoCampos } from '@/components/shared/campo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckboxCampo } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ResumoAbertura } from '@/features/processos/components/resumo-abertura'
import { CATALOGO_SUBPROCESSOS, ORDEM_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import { mensagemErroSegura } from '@/lib/privacidade'
import { ROTULO_PRIORIDADE, paraOpcoes } from '@/lib/rotulos'
import { esquemaProcesso, type DadosProcesso } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { TipoSubprocesso } from '@/types/domain'

export default function NovoProcesso() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const clienteConsulta = useQueryClient()
  const [erro, setErro] = React.useState<string | null>(null)

  const clientes = useQuery({
    queryKey: chaves.clientes.opcoes(),
    queryFn: () => servicos.clientes.opcoes(),
  })

  const equipe = useQuery({
    queryKey: chaves.usuarios.equipe(),
    queryFn: () => servicos.usuarios.listarEquipe(),
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DadosProcesso>({
    resolver: zodResolver(esquemaProcesso),
    defaultValues: {
      clienteId: parametros.get('cliente') ?? '',
      titulo: '',
      prioridade: 'normal',
      responsavelId: '',
      prazoFinal: '',
      resumoPublico: '',
      observacoesInternas: '',
      subprocessos: ['avaliacao_inicial'],
    },
  })

  const selecionados = watch('subprocessos') ?? []
  const clienteId = watch('clienteId')

  // Sugere um título assim que o cliente é escolhido, sem travar a edição.
  React.useEffect(() => {
    const cliente = clientes.data?.find((item) => item.id === clienteId)
    if (!cliente) return
    setValue('titulo', `Isenções — ${cliente.nome}`, { shouldValidate: true })
  }, [clienteId, clientes.data, setValue])

  function alternarSubprocesso(tipo: TipoSubprocesso, marcado: boolean) {
    const atuais = new Set(selecionados)
    if (marcado) atuais.add(tipo)
    else atuais.delete(tipo)
    setValue('subprocessos', [...atuais] as TipoSubprocesso[], { shouldValidate: true })
  }

  const criar = useMutation({
    mutationFn: (dados: DadosProcesso) =>
      servicos.processos.criar({
        clienteId: dados.clienteId,
        titulo: dados.titulo,
        prioridade: dados.prioridade,
        responsavelId: dados.responsavelId || undefined,
        prazoFinal: dados.prazoFinal || undefined,
        resumoPublico: dados.resumoPublico || undefined,
        observacoesInternas: dados.observacoesInternas || undefined,
        subprocessos: dados.subprocessos,
      }),
    onSuccess: (processo) => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.clientes.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.painel.todos })
      toast.success('Processo aberto', { description: `Código ${processo.codigo}.` })
      navegar(`/app/processos/${processo.id}`)
    },
    onError: (falha) => setErro(mensagemErroSegura(falha, 'Não foi possível abrir o processo.')),
  })

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Operação"
        titulo="Novo processo"
        descricao="Escolha o cliente e marque apenas os subprocessos que se aplicam ao caso."
        migalhas={[{ rotulo: 'Processos', para: '/app/processos' }, { rotulo: 'Novo processo' }]}
        voltarPara="/app/processos"
        voltarRotulo="Processos"
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        onSubmit={handleSubmit(async (dados) => {
          setErro(null)
          await criar.mutateAsync(dados)
        })}
        className="min-w-0 space-y-4"
        noValidate
      >
        {erro && <Alert tom="perigo">{erro}</Alert>}

        <Card>
          <CardContent className="pt-5">
            <GrupoCampos titulo="Dados do processo">
              <Campo rotulo="Cliente" erro={errors.clienteId?.message} obrigatorio>
                {(campo) => (
                  <Controller
                    control={control}
                    name="clienteId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={campo.id} aria-invalid={campo['aria-invalid']}>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.data?.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome} · {cliente.codigo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>

              <Campo rotulo="Título" erro={errors.titulo?.message} obrigatorio>
                {(campo) => <Input {...campo} {...register('titulo')} />}
              </Campo>

              <div className="grid gap-4 sm:grid-cols-3">
                <Campo rotulo="Prioridade" obrigatorio>
                  {(campo) => (
                    <Controller
                      control={control}
                      name="prioridade"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id={campo.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paraOpcoes(ROTULO_PRIORIDADE).map((opcao) => (
                              <SelectItem key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </Campo>

                <Campo rotulo="Responsável">
                  {(campo) => (
                    <Controller
                      control={control}
                      name="responsavelId"
                      render={({ field }) => (
                        <Select
                          value={field.value || 'nenhum'}
                          onValueChange={(valor) => field.onChange(valor === 'nenhum' ? '' : valor)}
                        >
                          <SelectTrigger id={campo.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nenhum">A definir</SelectItem>
                            {equipe.data?.map((usuario) => (
                              <SelectItem key={usuario.id} value={usuario.id}>
                                {usuario.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </Campo>

                <Campo rotulo="Prazo final">
                  {(campo) => <Input {...campo} {...register('prazoFinal')} type="date" />}
                </Campo>
              </div>
            </GrupoCampos>
          </CardContent>
        </Card>

        {/* Subprocessos */}
        <Card>
          <CardContent className="pt-5">
            <GrupoCampos
              titulo="Subprocessos aplicáveis"
              descricao="Nem todos se aplicam a todos os clientes. Marque apenas o que foi acordado no atendimento — é possível abrir outros depois."
            >
              {errors.subprocessos && (
                <Alert tom="perigo">{errors.subprocessos.message}</Alert>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {ORDEM_SUBPROCESSOS.map((tipo) => {
                  const definicao = CATALOGO_SUBPROCESSOS[tipo]
                  return (
                    <CheckboxCampo
                      key={tipo}
                      id={`sub-${tipo}`}
                      rotulo={definicao.nome}
                      descricao={
                        <>
                          {definicao.descricao}
                          <span className="mt-1 block text-[11px] italic">
                            {definicao.aplicabilidade}
                          </span>
                        </>
                      }
                      checked={selecionados.includes(tipo)}
                      onCheckedChange={(marcada) => alternarSubprocesso(tipo, marcada)}
                    />
                  )
                })}
              </div>

              <Alert tom="info" titulo="As etapas são um ponto de partida">
                Cada subprocesso marcado já nasce com uma sequência de etapas sugerida, totalmente
                editável. A sequência definitiva de cada serviço ainda depende de validação da
                equipe Alcance.
              </Alert>
            </GrupoCampos>
          </CardContent>
        </Card>

        {/* Comunicação */}
        <Card>
          <CardContent className="pt-5">
            <GrupoCampos titulo="Comunicação">
              <Campo
                rotulo="Resumo para o cliente"
                dica="Texto exibido na área do cliente. Escreva em linguagem simples."
                erro={errors.resumoPublico?.message}
              >
                {(campo) => <Textarea {...campo} {...register('resumoPublico')} rows={3} />}
              </Campo>

              <Campo
                rotulo="Observações internas"
                dica="Visível apenas para a equipe."
                erro={errors.observacoesInternas?.message}
              >
                {(campo) => <Textarea {...campo} {...register('observacoesInternas')} rows={3} />}
              </Campo>
            </GrupoCampos>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" aria-hidden="true" />
            {selecionados.length} subprocesso{selecionados.length === 1 ? '' : 's'} selecionado
            {selecionados.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variante="contorno" onClick={() => navegar('/app/processos')}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Abrindo processo">
              <FolderPlus aria-hidden="true" />
              Abrir processo
            </Button>
          </div>
        </div>
      </form>

        <ResumoAbertura tipos={selecionados} />
      </div>
    </EntradaPagina>
  )
}
