import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Banknote,
  ChevronDown,
  FileText,
  History,
  Layers,
  MessageSquarePlus,
  Paperclip,
  Plus,
  ShieldAlert,
} from 'lucide-react'
import {
  FaixaDestaque,
  MedidorMarca,
  MetricaMarca,
  SeloMarca,
  classeBotaoMarca,
  classeBotaoMarcaContorno,
} from '@/components/shared/faixa-destaque'
import { EntradaPagina } from '@/components/shared/animacao'
import { Campo } from '@/components/shared/campo'
import { LinhaTempo } from '@/components/shared/linha-tempo'
import { BlocoProximaAcao } from '@/components/shared/proxima-acao'
import { Prazo } from '@/components/shared/prazo'
import {
  PrioridadeBadge,
  StatusDocumentoBadge,
  StatusFinanceiroBadge,
  StatusProcessoBadge,
} from '@/components/shared/status-badge'
import { CartaoSubprocesso } from '@/features/processos/components/cartao-subprocesso'
import { AcoesDocumento } from '@/features/documentos/components/acoes-documento'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBarra, CardContent } from '@/components/ui/card'
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
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContador, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { CATALOGO_SUBPROCESSOS, ORDEM_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import { formatarData, formatarMoeda, formatarTamanhoArquivo } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import { temPermissao } from '@/lib/permissoes'
import { ROTULO_STATUS_PROCESSO, ROTULO_TIPO_SUBPROCESSO } from '@/lib/rotulos'
import {
  TRANSICOES_PROCESSO,
  progressoProcesso,
  progressoSubprocesso,
  statusSugeridoProcesso,
} from '@/lib/workflow'
import { esquemaMovimentacao, esquemaSubprocesso, type DadosMovimentacao, type DadosSubprocesso } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'
import type { StatusProcesso, TipoSubprocesso } from '@/types/domain'

export default function DetalheProcesso() {
  const { processoId = '' } = useParams()
  const clienteConsulta = useQueryClient()
  const papel = usarSessao((estado) => estado.usuario?.papel)
  const [registrandoMovimentacao, setRegistrandoMovimentacao] = React.useState(false)
  const [adicionandoSubprocesso, setAdicionandoSubprocesso] = React.useState(false)

  const processo = useQuery({
    queryKey: chaves.processos.detalhe(processoId),
    queryFn: () => servicos.processos.obter(processoId),
    enabled: Boolean(processoId),
  })

  const equipe = useQuery({
    queryKey: chaves.usuarios.equipe(),
    queryFn: () => servicos.usuarios.listarEquipe(),
  })

  const alterarStatus = useMutation({
    mutationFn: (status: StatusProcesso) => servicos.processos.alterarStatus(processoId, status),
    onSuccess: (atualizado) => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.painel.todos })
      toast.success(`Processo agora está: ${ROTULO_STATUS_PROCESSO[atualizado.status]}`)
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  if (processo.isLoading) return <EstadoCarregando rotulo="Carregando processo" />
  if (processo.isError || !processo.data) {
    return (
      <EstadoErro
        titulo="Processo não encontrado"
        descricao="O processo pode ter sido removido ou o endereço está incorreto."
        aoTentarNovamente={() => void processo.refetch()}
      />
    )
  }

  const dados = processo.data
  const listaEquipe = equipe.data ?? []
  const autores = Object.fromEntries(listaEquipe.map((usuario) => [usuario.id, usuario.nome]))
  const progresso = progressoProcesso(dados.subprocessos)
  const sugerido = statusSugeridoProcesso(dados.subprocessos)
  const transicoes = TRANSICOES_PROCESSO[dados.status]

  const documentosPendentes = dados.documentos.filter(
    (documento) => documento.status === 'solicitado' || documento.status === 'reenvio_solicitado',
  )
  const aguardandoAnalise = dados.documentos.filter(
    (documento) => documento.status === 'enviado' || documento.status === 'em_analise',
  )
  const documentosAprovados = dados.documentos.filter(
    (documento) => documento.status === 'aprovado',
  ).length

  // Etapas de serviços cancelados ou não aplicáveis não entram na conta.
  const etapas = progressoSubprocesso(
    dados.subprocessos
      .filter((sub) => sub.status !== 'nao_aplicavel' && sub.status !== 'cancelado')
      .flatMap((sub) => sub.etapas),
  )
  const decididos = dados.subprocessos.filter(
    (sub) => sub.status === 'deferido' || sub.status === 'indeferido',
  ).length

  const tiposDisponiveis = ORDEM_SUBPROCESSOS.filter(
    (tipo) =>
      !dados.subprocessos.some(
        (sub) =>
          sub.tipo === tipo &&
          sub.status !== 'cancelado' &&
          sub.status !== 'deferido' &&
          sub.status !== 'indeferido',
      ),
  )

  return (
    <EntradaPagina>
      <FaixaDestaque
        tamanho="medio"
        className="mb-5"
        chapeu={`Processo · ${dados.codigo}`}
        titulo={dados.titulo}
        migalhas={[
          { rotulo: 'Processos', para: '/app/processos' },
          { rotulo: dados.codigo },
        ]}
        voltarPara="/app/processos"
        voltarRotulo="Processos"
        meta={
          <>
            <StatusProcessoBadge status={dados.status} />
            <PrioridadeBadge prioridade={dados.prioridade} />
            <SeloMarca>
              <Link
                to={`/app/clientes/${dados.cliente.id}`}
                className="rounded-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-brand"
              >
                {dados.cliente.nome}
              </Link>
            </SeloMarca>
          </>
        }
        metricas={
          <>
            <MetricaMarca
              valor={`${progresso}%`}
              rotulo={`Andamento · ${etapas.concluidas} de ${etapas.aplicaveis} etapas`}
              principal
            />
            <MedidorMarca
              rotulo="Documentos aprovados"
              valor={documentosAprovados}
              maximo={dados.documentos.length}
              legenda={
                dados.documentos.length === 0
                  ? 'Nenhum documento solicitado'
                  : `${documentosAprovados} de ${dados.documentos.length} documentos`
              }
            />
            <MetricaMarca
              valor={`${decididos}/${dados.subprocessos.length}`}
              rotulo="Serviços decididos"
            />
          </>
        }
        acoes={
          <>
            <Button
              variante="fantasma"
              className={classeBotaoMarcaContorno}
              onClick={() => setRegistrandoMovimentacao(true)}
            >
              <MessageSquarePlus aria-hidden="true" />
              Registrar movimentação
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={classeBotaoMarca} disabled={transicoes.length === 0}>
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
                    <DropdownMenuItem key={status} onSelect={() => alterarStatus.mutate(status)}>
                      {ROTULO_STATUS_PROCESSO[status]}
                      {sugerido === status && (
                        <Badge tom="primario" tamanho="sm" className="ml-auto">
                          sugerido
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Situação geral */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <BlocoProximaAcao
              estado={<StatusProcessoBadge status={dados.status} />}
              proximaAcao={
                dados.subprocessos.find((sub) => sub.proximaAcao && sub.status !== 'deferido')
                  ?.proximaAcao
              }
              responsavel={
                documentosPendentes.length > 0
                  ? 'cliente'
                  : aguardandoAnalise.length > 0
                    ? 'equipe'
                    : undefined
              }
              responsavelNome={
                documentosPendentes.length > 0 ? dados.cliente.nome : dados.responsavel?.nome
              }
              prazo={dados.prazoFinal}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {documentosPendentes.length > 0 && (
                <Badge tom="alerta" tamanho="sm">
                  {documentosPendentes.length} documento
                  {documentosPendentes.length > 1 ? 's' : ''} com o cliente
                </Badge>
              )}
              {aguardandoAnalise.length > 0 && (
                <Badge tom="info" tamanho="sm">
                  {aguardandoAnalise.length} aguardando análise
                </Badge>
              )}
            </div>

            {sugerido && sugerido !== dados.status && (
              <Alert tom="info" className="mt-4">
                Pelo andamento dos subprocessos, o status sugerido é{' '}
                <strong className="font-bold">{ROTULO_STATUS_PROCESSO[sugerido]}</strong>. A mudança
                continua sendo uma decisão da equipe.
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardBarra titulo="Responsáveis" />
          <CardContent className="space-y-3 pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Responsável pelo processo
              </p>
              {dados.responsavel ? (
                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium">
                  <Avatar nome={dados.responsavel.nome} tamanho="sm" />
                  {dados.responsavel.nome}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">A definir</p>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cliente
              </p>
              <Link
                to={`/app/clientes/${dados.cliente.id}`}
                className="mt-1.5 flex items-center gap-2 rounded-sm text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Avatar nome={dados.cliente.nome} tamanho="sm" />
                {dados.cliente.nome}
              </Link>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Aberto em {formatarData(dados.abertoEm)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prazo final
                </span>
                <Prazo data={dados.prazoFinal} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {dados.observacoesInternas && (
        <Alert tom="alerta" titulo="Observações internas" className="mb-5">
          {dados.observacoesInternas}
        </Alert>
      )}

      <Tabs defaultValue="subprocessos">
        <TabsList>
          <TabsTrigger value="subprocessos">
            <Layers aria-hidden="true" />
            Subprocessos <TabsContador valor={dados.subprocessos.length} />
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FileText aria-hidden="true" />
            Documentos <TabsContador valor={dados.documentos.length} />
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History aria-hidden="true" />
            Histórico <TabsContador valor={dados.movimentacoes.length} />
          </TabsTrigger>
          {temPermissao(papel, 'financeiro.ver') && (
            <TabsTrigger value="financeiro">
              <Banknote aria-hidden="true" />
              Financeiro
            </TabsTrigger>
          )}
        </TabsList>

        {/* Subprocessos */}
        <TabsContent value="subprocessos">
          <div className="mb-3 flex justify-end">
            <Button
              variante="contorno"
              onClick={() => setAdicionandoSubprocesso(true)}
              disabled={tiposDisponiveis.length === 0}
            >
              <Plus aria-hidden="true" />
              Adicionar subprocesso
            </Button>
          </div>

          {dados.subprocessos.length === 0 ? (
            <Card>
              <EstadoVazio
                icone={Layers}
                titulo="Nenhum subprocesso aberto"
                descricao="Adicione os serviços aplicáveis a este cliente."
                acao={
                  <Button onClick={() => setAdicionandoSubprocesso(true)}>
                    <Plus aria-hidden="true" />
                    Adicionar subprocesso
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {dados.subprocessos.map((subprocesso) => (
                <CartaoSubprocesso
                  key={subprocesso.id}
                  subprocesso={subprocesso}
                  processoId={dados.id}
                  equipe={listaEquipe}
                  aoSolicitarDocumento={() => {
                    toast.info('Solicite o documento pela tela de Documentos', {
                      description: 'Lá é possível definir tipo, prazo e visibilidade.',
                      action: {
                        label: 'Abrir',
                        onClick: () => window.location.assign('/app/documentos'),
                      },
                    })
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos">
          <Card className="overflow-hidden">
            <CardBarra
              titulo="Documentos do processo"
              descricao="Solicitados, recebidos e analisados."
              acoes={
                <Button tamanho="sm" variante="contorno" asChild>
                  <Link to="/app/documentos">Ir para documentos</Link>
                </Button>
              }
            />
            {dados.documentos.length === 0 ? (
              <EstadoVazio
                icone={FileText}
                titulo="Nenhum documento vinculado"
                descricao="Solicite os documentos necessários aos subprocessos."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {dados.documentos.map((documento) => (
                  <li key={documento.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold leading-snug">{documento.titulo}</p>
                        <StatusDocumentoBadge status={documento.status} />
                        {documento.sensivel && (
                          <Badge tom="primario" tamanho="sm">
                            <ShieldAlert aria-hidden="true" />
                            Sensível
                          </Badge>
                        )}
                      </div>
                      {documento.arquivoNome && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {documento.sensivel ? 'Arquivo recebido' : documento.arquivoNome}
                          </span>
                          <span>· {formatarTamanhoArquivo(documento.arquivoTamanhoBytes)}</span>
                        </p>
                      )}
                      {documento.motivoDevolucao && (
                        <p className="mt-2 rounded-sm border border-warning/25 bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground leading-snug">
                          <strong className="font-bold">Motivo informado: </strong>
                          {documento.motivoDevolucao}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <AcoesDocumento documento={documento} compacto />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <Card>
            <CardBarra
              titulo="Histórico de movimentações"
              descricao="Itens marcados como internos não aparecem para o cliente."
              acoes={
                <Button tamanho="sm" variante="contorno" onClick={() => setRegistrandoMovimentacao(true)}>
                  <MessageSquarePlus aria-hidden="true" />
                  Registrar
                </Button>
              }
            />
            <CardContent className="pt-5">
              {dados.movimentacoes.length === 0 ? (
                <EstadoVazio icone={History} titulo="Nenhuma movimentação registrada" compacto />
              ) : (
                <LinhaTempo movimentacoes={dados.movimentacoes} autores={autores} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro */}
        {temPermissao(papel, 'financeiro.ver') && (
          <TabsContent value="financeiro">
            <Card className="overflow-hidden">
              <CardBarra
                titulo="Registros financeiros"
                descricao="Campos informativos — não substituem controle fiscal ou contábil."
              />
              {dados.financeiro.length === 0 ? (
                <EstadoVazio
                  icone={Banknote}
                  titulo="Nenhum registro financeiro"
                  descricao="Cadastre os valores combinados na tela de Financeiro."
                  compacto
                />
              ) : (
                <ul className="divide-y divide-border">
                  {dados.financeiro.map((registro) => (
                    <li key={registro.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{registro.descricao}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Líquido {formatarMoeda(registro.valorTotal - registro.desconto)} · pago{' '}
                          {formatarMoeda(registro.valorPago)}
                          {registro.vencimento && <> · vence {formatarData(registro.vencimento)}</>}
                        </p>
                      </div>
                      <StatusFinanceiroBadge status={registro.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <DialogoMovimentacao
        aberto={registrandoMovimentacao}
        aoFechar={() => setRegistrandoMovimentacao(false)}
        processoId={dados.id}
        subprocessos={dados.subprocessos.map((sub) => ({ id: sub.id, tipo: sub.tipo }))}
      />

      <DialogoNovoSubprocesso
        aberto={adicionandoSubprocesso}
        aoFechar={() => setAdicionandoSubprocesso(false)}
        processoId={dados.id}
        tiposDisponiveis={tiposDisponiveis}
        equipe={listaEquipe}
      />
    </EntradaPagina>
  )
}

/* -- Registrar movimentação ------------------------------------------------- */

function DialogoMovimentacao({
  aberto,
  aoFechar,
  processoId,
  subprocessos,
}: {
  aberto: boolean
  aoFechar: () => void
  processoId: string
  subprocessos: Array<{ id: string; tipo: TipoSubprocesso }>
}) {
  const clienteConsulta = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosMovimentacao>({
    resolver: zodResolver(esquemaMovimentacao),
    defaultValues: { titulo: '', descricao: '', subprocessoId: '', visivelCliente: true },
  })

  React.useEffect(() => {
    if (!aberto) reset()
  }, [aberto, reset])

  const visivel = watch('visivelCliente')

  const registrar = useMutation({
    mutationFn: (dados: DadosMovimentacao) =>
      servicos.movimentacoes.registrar({
        processoId,
        subprocessoId: dados.subprocessoId || undefined,
        titulo: dados.titulo,
        descricao: dados.descricao || undefined,
        visivelCliente: dados.visivelCliente,
      }),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.movimentacoes.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos })
      toast.success('Movimentação registrada')
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && aoFechar()}>
      <DialogContent largura="sm">
        <form onSubmit={handleSubmit((dados) => registrar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>Registrar movimentação</DialogTitle>
            <DialogDescription>
              Registre o que aconteceu no atendimento. Você escolhe se o cliente vê ou não.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-3">
            <Campo rotulo="Título" erro={errors.titulo?.message} obrigatorio>
              {(campo) => (
                <Input
                  {...campo}
                  {...register('titulo')}
                  autoFocus
                  placeholder="Ex.: Pedido protocolado na SEFAZ"
                />
              )}
            </Campo>

            <Campo rotulo="Descrição" erro={errors.descricao?.message}>
              {(campo) => <Textarea {...campo} {...register('descricao')} rows={3} />}
            </Campo>

            {subprocessos.length > 0 && (
              <Campo rotulo="Vincular a um subprocesso">
                {(campo) => (
                  <Controller
                    control={control}
                    name="subprocessoId"
                    render={({ field }) => (
                      <Select
                        value={field.value || 'nenhum'}
                        onValueChange={(valor) => field.onChange(valor === 'nenhum' ? '' : valor)}
                      >
                        <SelectTrigger id={campo.id}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Processo em geral</SelectItem>
                          {subprocessos.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {ROTULO_TIPO_SUBPROCESSO[sub.tipo]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>
            )}

            <Controller
              control={control}
              name="visivelCliente"
              render={({ field }) => (
                <CheckboxCampo
                  id="movimentacao-visivel"
                  rotulo="Exibir ao cliente"
                  descricao="O cliente recebe um aviso e vê este registro no histórico dele."
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            {visivel && (
              <Alert tom="privacidade">
                Escreva em linguagem simples e evite dados de saúde ou informações de terceiros.
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Registrando">
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -- Novo subprocesso ------------------------------------------------------- */

function DialogoNovoSubprocesso({
  aberto,
  aoFechar,
  processoId,
  tiposDisponiveis,
  equipe,
}: {
  aberto: boolean
  aoFechar: () => void
  processoId: string
  tiposDisponiveis: TipoSubprocesso[]
  equipe: Array<{ id: string; nome: string }>
}) {
  const clienteConsulta = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosSubprocesso>({
    resolver: zodResolver(esquemaSubprocesso),
    defaultValues: {
      tipo: tiposDisponiveis[0] ?? 'ipi',
      responsavelId: '',
      orgao: '',
      prazo: '',
      proximaAcao: '',
      observacoesInternas: '',
      criarEtapasSugeridas: true,
    },
  })

  React.useEffect(() => {
    if (aberto) reset({ ...{ tipo: tiposDisponiveis[0] ?? 'ipi' }, criarEtapasSugeridas: true })
  }, [aberto, tiposDisponiveis, reset])

  const tipo = watch('tipo')
  const definicao = tipo ? CATALOGO_SUBPROCESSOS[tipo] : undefined

  const criar = useMutation({
    mutationFn: (dados: DadosSubprocesso) =>
      servicos.processos.adicionarSubprocesso({
        processoId,
        tipo: dados.tipo,
        responsavelId: dados.responsavelId || undefined,
        orgao: dados.orgao || undefined,
        prazo: dados.prazo || undefined,
        proximaAcao: dados.proximaAcao || undefined,
        observacoesInternas: dados.observacoesInternas || undefined,
        criarEtapasSugeridas: dados.criarEtapasSugeridas,
      }),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.painel.todos })
      toast.success('Subprocesso adicionado')
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && aoFechar()}>
      <DialogContent largura="sm">
        <form onSubmit={handleSubmit((dados) => criar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>Adicionar subprocesso</DialogTitle>
            <DialogDescription>
              Abra apenas o que se aplica a este cliente.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-3">
            <Campo rotulo="Subprocesso" obrigatorio>
              {(campo) => (
                <Controller
                  control={control}
                  name="tipo"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={campo.id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposDisponiveis.map((item) => (
                          <SelectItem key={item} value={item}>
                            {ROTULO_TIPO_SUBPROCESSO[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Campo>

            {definicao && (
              <Alert tom="info" titulo={definicao.nome}>
                {definicao.descricao}
                <span className="mt-1.5 block italic">{definicao.aplicabilidade}</span>
              </Alert>
            )}

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
              name="criarEtapasSugeridas"
              render={({ field }) => (
                <CheckboxCampo
                  id="criar-etapas"
                  rotulo="Criar as etapas sugeridas"
                  descricao={
                    definicao
                      ? `${definicao.etapasSugeridas.length} etapas editáveis, como ponto de partida.`
                      : undefined
                  }
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
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
