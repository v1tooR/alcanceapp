import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Ban,
  Check,
  ChevronDown,
  CircleDashed,
  CirclePlay,
  EyeOff,
  Hash,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Campo, GrupoCampos } from '@/components/shared/campo'
import { DialogoConfirmacao } from '@/components/shared/confirmar'
import { BlocoProximaAcao } from '@/components/shared/proxima-acao'
import { StatusEtapaBadge, StatusSubprocessoBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { useListaAnimada } from '@/components/shared/animacao'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dica } from '@/components/ui/tooltip'
import { CATALOGO_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import { formatarData } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import {
  ROTULO_RESPONSAVEL_ACAO,
  ROTULO_STATUS_ETAPA,
  ROTULO_STATUS_SUBPROCESSO,
} from '@/lib/rotulos'
import { cn } from '@/lib/utils'
import { TRANSICOES_ETAPA, TRANSICOES_SUBPROCESSO, progressoSubprocesso, proximaEtapa } from '@/lib/workflow'
import { esquemaEdicaoSubprocesso, esquemaEtapa, type DadosEdicaoSubprocesso, type DadosEtapa } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { RESPONSAVEIS_ACAO, type Etapa, type StatusEtapa, type SubprocessoComEtapas, type Usuario } from '@/types/domain'

const ICONE_STATUS_ETAPA: Record<StatusEtapa, typeof Check> = {
  pendente: CircleDashed,
  em_andamento: CirclePlay,
  concluida: Check,
  bloqueada: Ban,
  nao_aplicavel: EyeOff,
}

export interface CartaoSubprocessoProps {
  subprocesso: SubprocessoComEtapas
  processoId: string
  equipe: Usuario[]
  aoSolicitarDocumento: (subprocessoId: string) => void
}

export function CartaoSubprocesso({
  subprocesso,
  processoId,
  equipe,
  aoSolicitarDocumento,
}: CartaoSubprocessoProps) {
  const clienteConsulta = useQueryClient()
  const [expandido, setExpandido] = React.useState(subprocesso.status !== 'nao_iniciado')
  const [editando, setEditando] = React.useState(false)
  const [adicionandoEtapa, setAdicionandoEtapa] = React.useState(false)
  const [etapaParaRemover, setEtapaParaRemover] = React.useState<Etapa | null>(null)

  const definicao = CATALOGO_SUBPROCESSOS[subprocesso.tipo]
  const progresso = progressoSubprocesso(subprocesso.etapas)
  const proxima = proximaEtapa(subprocesso.etapas)
  const responsavel = equipe.find((usuario) => usuario.id === subprocesso.responsavelId)

  function invalidar(mensagem?: string) {
    void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
    void clienteConsulta.invalidateQueries({ queryKey: chaves.painel.todos })
    void clienteConsulta.invalidateQueries({ queryKey: chaves.movimentacoes.todos })
    if (mensagem) toast.success(mensagem)
  }

  const mudarStatus = useMutation({
    mutationFn: (status: SubprocessoComEtapas['status']) =>
      servicos.processos.alterarStatusSubprocesso(subprocesso.id, status),
    onSuccess: (atualizado) =>
      invalidar(`${definicao.nome}: ${ROTULO_STATUS_SUBPROCESSO[atualizado.status].toLowerCase()}`),
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const mudarStatusEtapa = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusEtapa }) =>
      servicos.processos.alterarStatusEtapa(id, status),
    onSuccess: () => invalidar(),
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const removerEtapa = useMutation({
    mutationFn: (id: string) => servicos.processos.removerEtapa(id),
    onSuccess: () => invalidar('Etapa removida'),
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const transicoes = TRANSICOES_SUBPROCESSO[subprocesso.status]
  const listaRef = useListaAnimada<HTMLUListElement>()

  return (
    <Card className="overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpandido((atual) => !atual)}
          aria-expanded={expandido}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn(
              'mt-1 size-4 shrink-0 text-muted-foreground transition-transform',
              !expandido && '-rotate-90',
            )}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold leading-snug">{definicao.nome}</span>
              <StatusSubprocessoBadge status={subprocesso.status} />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
              {subprocesso.orgao ?? definicao.descricao}
              {subprocesso.protocolo && (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Hash className="size-3" aria-hidden="true" />
                    {subprocesso.protocolo}
                  </span>
                </>
              )}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Dica texto="Editar dados do subprocesso">
            <Button variante="contorno" tamanho="iconeSm" onClick={() => setEditando(true)}>
              <Pencil aria-hidden="true" />
              <span className="sr-only">Editar {definicao.nome}</span>
            </Button>
          </Dica>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variante="contorno" tamanho="sm" disabled={transicoes.length === 0}>
                Alterar status
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Mudar para</DropdownMenuLabel>
              {transicoes.length === 0 ? (
                <DropdownMenuItem disabled>Situação final</DropdownMenuItem>
              ) : (
                transicoes.map((status) => (
                  <DropdownMenuItem key={status} onSelect={() => mudarStatus.mutate(status)}>
                    {ROTULO_STATUS_SUBPROCESSO[status]}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progresso */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
        <div className="flex min-w-40 flex-1 items-center gap-2 sm:max-w-72">
          <Progress
            valor={progresso.percentual}
            rotulo={`Progresso de ${definicao.nome}`}
            tom={progresso.percentual === 100 ? 'sucesso' : 'primario'}
          />
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {progresso.concluidas}/{progresso.aplicaveis}
          </span>
        </div>
        {subprocesso.prazo && <Prazo data={subprocesso.prazo} />}
        {responsavel && (
          <Badge tom="contorno" tamanho="sm">
            {responsavel.nome}
          </Badge>
        )}
      </div>

      {expandido && (
        <div className="space-y-4 border-t border-border p-4">
          <BlocoProximaAcao
            estado={<StatusSubprocessoBadge status={subprocesso.status} />}
            proximaAcao={subprocesso.proximaAcao ?? proxima?.titulo}
            responsavel={subprocesso.responsavelProximaAcao}
            responsavelNome={
              subprocesso.responsavelProximaAcao === 'equipe' ? responsavel?.nome : undefined
            }
            prazo={subprocesso.prazo}
          />

          {subprocesso.motivoBloqueio && (
            <p className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground leading-snug">
              <strong className="font-bold">Bloqueio: </strong>
              {subprocesso.motivoBloqueio}
            </p>
          )}

          {/* Etapas */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Etapas
              </h4>
              <div className="flex gap-1.5">
                <Button
                  variante="fantasma"
                  tamanho="sm"
                  onClick={() => aoSolicitarDocumento(subprocesso.id)}
                >
                  Solicitar documento
                </Button>
                <Button variante="contorno" tamanho="sm" onClick={() => setAdicionandoEtapa(true)}>
                  <Plus aria-hidden="true" />
                  Etapa
                </Button>
              </div>
            </div>

            {subprocesso.etapas.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhuma etapa cadastrada. Adicione as etapas deste subprocesso.
              </p>
            ) : (
              <ul ref={listaRef} className="space-y-1.5">
                {subprocesso.etapas.map((etapa) => {
                  const Icone = ICONE_STATUS_ETAPA[etapa.status]
                  const transicoesEtapa = TRANSICOES_ETAPA[etapa.status]

                  return (
                    <li
                      key={etapa.id}
                      className={cn(
                        'flex flex-wrap items-center gap-2.5 rounded-md border border-border px-3 py-2.5',
                        etapa.status === 'concluida' && 'bg-success-soft/40 border-success/20',
                        etapa.status === 'bloqueada' && 'bg-danger-soft/30 border-danger/20',
                        etapa.status === 'nao_aplicavel' && 'opacity-60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full',
                          etapa.status === 'concluida'
                            ? 'bg-success text-success-foreground'
                            : etapa.status === 'bloqueada'
                              ? 'bg-danger text-danger-foreground'
                              : etapa.status === 'em_andamento'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                        )}
                        aria-hidden="true"
                      >
                        <Icone className="size-3.5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-sm font-medium leading-snug',
                            etapa.status === 'concluida' && 'line-through decoration-1',
                          )}
                        >
                          {etapa.titulo}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <StatusEtapaBadge status={etapa.status} />
                          {etapa.prazo && <span>Prazo: {formatarData(etapa.prazo)}</span>}
                          {!etapa.visivelCliente && (
                            <Badge tom="contorno" tamanho="sm">
                              <EyeOff aria-hidden="true" />
                              Interna
                            </Badge>
                          )}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1">
                        {etapa.status !== 'concluida' && (
                          <Button
                            variante="fantasma"
                            tamanho="sm"
                            onClick={() =>
                              mudarStatusEtapa.mutate({ id: etapa.id, status: 'concluida' })
                            }
                          >
                            <Check aria-hidden="true" />
                            Concluir
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variante="fantasma" tamanho="iconeSm">
                              <ChevronDown aria-hidden="true" />
                              <span className="sr-only">Ações da etapa {etapa.titulo}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Mudar para</DropdownMenuLabel>
                            {transicoesEtapa.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onSelect={() => mudarStatusEtapa.mutate({ id: etapa.id, status })}
                              >
                                {ROTULO_STATUS_ETAPA[status]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem perigo onSelect={() => setEtapaParaRemover(etapa)}>
                              <Trash2 />
                              Remover etapa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {subprocesso.observacoesInternas && (
            <div className="rounded-md border border-border bg-surface-muted p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Observações internas
              </p>
              <p className="mt-1 text-sm leading-snug whitespace-pre-line">
                {subprocesso.observacoesInternas}
              </p>
            </div>
          )}
        </div>
      )}

      <DialogoEdicaoSubprocesso
        aberto={editando}
        aoFechar={() => setEditando(false)}
        subprocesso={subprocesso}
        equipe={equipe}
        aoSalvar={() => invalidar('Subprocesso atualizado')}
      />

      <DialogoNovaEtapa
        aberto={adicionandoEtapa}
        aoFechar={() => setAdicionandoEtapa(false)}
        subprocessoId={subprocesso.id}
        processoId={processoId}
        equipe={equipe}
        aoSalvar={() => invalidar('Etapa adicionada')}
      />

      <DialogoConfirmacao
        aberto={etapaParaRemover !== null}
        aoMudarAberto={(aberto) => !aberto && setEtapaParaRemover(null)}
        titulo="Remover esta etapa?"
        descricao={`A etapa “${etapaParaRemover?.titulo}” será excluída deste subprocesso. O histórico já registrado permanece.`}
        rotuloConfirmar="Remover etapa"
        variante="perigo"
        aoConfirmar={async () => {
          if (etapaParaRemover) await removerEtapa.mutateAsync(etapaParaRemover.id)
          setEtapaParaRemover(null)
        }}
      />
    </Card>
  )
}

/* -- Edição do subprocesso -------------------------------------------------- */

function DialogoEdicaoSubprocesso({
  aberto,
  aoFechar,
  subprocesso,
  equipe,
  aoSalvar,
}: {
  aberto: boolean
  aoFechar: () => void
  subprocesso: SubprocessoComEtapas
  equipe: Usuario[]
  aoSalvar: () => void
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DadosEdicaoSubprocesso>({
    resolver: zodResolver(esquemaEdicaoSubprocesso),
    defaultValues: {
      responsavelId: subprocesso.responsavelId ?? '',
      orgao: subprocesso.orgao ?? '',
      protocolo: subprocesso.protocolo ?? '',
      prazo: subprocesso.prazo ?? '',
      proximaAcao: subprocesso.proximaAcao ?? '',
      responsavelProximaAcao: subprocesso.responsavelProximaAcao,
      motivoBloqueio: subprocesso.motivoBloqueio ?? '',
      observacoesInternas: subprocesso.observacoesInternas ?? '',
    },
  })

  React.useEffect(() => {
    if (!aberto) return
    reset({
      responsavelId: subprocesso.responsavelId ?? '',
      orgao: subprocesso.orgao ?? '',
      protocolo: subprocesso.protocolo ?? '',
      prazo: subprocesso.prazo ?? '',
      proximaAcao: subprocesso.proximaAcao ?? '',
      responsavelProximaAcao: subprocesso.responsavelProximaAcao,
      motivoBloqueio: subprocesso.motivoBloqueio ?? '',
      observacoesInternas: subprocesso.observacoesInternas ?? '',
    })
  }, [aberto, subprocesso, reset])

  const salvar = useMutation({
    mutationFn: (dados: DadosEdicaoSubprocesso) =>
      servicos.processos.atualizarSubprocesso(subprocesso.id, {
        responsavelId: dados.responsavelId || undefined,
        orgao: dados.orgao || undefined,
        protocolo: dados.protocolo || undefined,
        prazo: dados.prazo || undefined,
        proximaAcao: dados.proximaAcao || undefined,
        responsavelProximaAcao: dados.responsavelProximaAcao,
        motivoBloqueio: dados.motivoBloqueio || undefined,
        observacoesInternas: dados.observacoesInternas || undefined,
      }),
    onSuccess: () => {
      aoSalvar()
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && aoFechar()}>
      <DialogContent>
        <form onSubmit={handleSubmit((dados) => salvar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>{CATALOGO_SUBPROCESSOS[subprocesso.tipo].nome}</DialogTitle>
            <DialogDescription>
              Registre protocolo, prazo e qual é o próximo passo deste subprocesso.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="py-3">
            <GrupoCampos titulo="Acompanhamento">
              <div className="grid gap-4 sm:grid-cols-2">
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
                            {equipe.map((usuario) => (
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

                <Campo rotulo="Prazo" erro={errors.prazo?.message}>
                  {(campo) => <Input {...campo} {...register('prazo')} type="date" />}
                </Campo>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="Órgão" erro={errors.orgao?.message}>
                  {(campo) => <Input {...campo} {...register('orgao')} />}
                </Campo>

                <Campo
                  rotulo="Protocolo"
                  dica="Ao salvar, o número é registrado no histórico."
                  erro={errors.protocolo?.message}
                >
                  {(campo) => <Input {...campo} {...register('protocolo')} />}
                </Campo>
              </div>

              <Campo
                rotulo="Próxima ação"
                dica="Aparece para a equipe e, quando aplicável, orienta o cliente."
                erro={errors.proximaAcao?.message}
              >
                {(campo) => <Textarea {...campo} {...register('proximaAcao')} rows={2} />}
              </Campo>

              <Campo rotulo="Quem precisa agir">
                {(campo) => (
                  <Controller
                    control={control}
                    name="responsavelProximaAcao"
                    render={({ field }) => (
                      <Select value={field.value ?? 'equipe'} onValueChange={field.onChange}>
                        <SelectTrigger id={campo.id}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESPONSAVEIS_ACAO.map((item) => (
                            <SelectItem key={item} value={item}>
                              {ROTULO_RESPONSAVEL_ACAO[item]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>

              <Campo rotulo="Motivo de bloqueio" erro={errors.motivoBloqueio?.message}>
                {(campo) => <Input {...campo} {...register('motivoBloqueio')} />}
              </Campo>

              <Campo
                rotulo="Observações internas"
                dica="Nunca exibidas na área do cliente."
                erro={errors.observacoesInternas?.message}
              >
                {(campo) => <Textarea {...campo} {...register('observacoesInternas')} rows={3} />}
              </Campo>
            </GrupoCampos>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Salvando">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -- Nova etapa ------------------------------------------------------------- */

function DialogoNovaEtapa({
  aberto,
  aoFechar,
  subprocessoId,
  equipe,
  aoSalvar,
}: {
  aberto: boolean
  aoFechar: () => void
  subprocessoId: string
  processoId: string
  equipe: Usuario[]
  aoSalvar: () => void
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DadosEtapa>({
    resolver: zodResolver(esquemaEtapa),
    defaultValues: {
      titulo: '',
      descricao: '',
      responsavelId: '',
      prazo: '',
      observacao: '',
      observacoesInternas: '',
      visivelCliente: true,
    },
  })

  React.useEffect(() => {
    if (!aberto) reset()
  }, [aberto, reset])

  const criar = useMutation({
    mutationFn: (dados: DadosEtapa) =>
      servicos.processos.adicionarEtapa({
        subprocessoId,
        titulo: dados.titulo,
        descricao: dados.descricao || undefined,
        responsavelId: dados.responsavelId || undefined,
        prazo: dados.prazo || undefined,
        visivelCliente: dados.visivelCliente,
      }),
    onSuccess: () => {
      aoSalvar()
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && aoFechar()}>
      <DialogContent largura="sm">
        <form onSubmit={handleSubmit((dados) => criar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>Nova etapa</DialogTitle>
            <DialogDescription>A etapa entra no fim da sequência atual.</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-3">
            <Campo rotulo="Título" erro={errors.titulo?.message} obrigatorio>
              {(campo) => <Input {...campo} {...register('titulo')} autoFocus />}
            </Campo>

            <Campo rotulo="Descrição" erro={errors.descricao?.message}>
              {(campo) => <Textarea {...campo} {...register('descricao')} rows={2} />}
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
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
                          {equipe.map((usuario) => (
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

              <Campo rotulo="Prazo" erro={errors.prazo?.message}>
                {(campo) => <Input {...campo} {...register('prazo')} type="date" />}
              </Campo>
            </div>

            <Controller
              control={control}
              name="visivelCliente"
              render={({ field }) => (
                <CheckboxCampo
                  id="etapa-visivel"
                  rotulo="Exibir esta etapa ao cliente"
                  descricao="Desmarque para etapas de controle interno."
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Adicionando">
              <Plus aria-hidden="true" />
              Adicionar etapa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
