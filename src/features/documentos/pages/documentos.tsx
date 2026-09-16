import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, FilePlus2, Paperclip, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { CampoBusca } from '@/components/shared/busca'
import { Paginacao } from '@/components/shared/paginacao'
import { EntradaPagina } from '@/components/shared/animacao'
import { Campo, GrupoCampos } from '@/components/shared/campo'
import { StatusDocumentoBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { AcoesDocumento } from '@/features/documentos/components/acoes-documento'
import { ResumoDosDocumentos } from '@/features/documentos/components/resumo-documentos'
import { Alert } from '@/components/ui/alert'
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
import { EstadoCarregando, EstadoErro, EstadoSemResultado, EstadoVazio } from '@/components/ui/estados'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatarTamanhoArquivo, formatarTempoRelativo } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import { ROTULO_STATUS_DOCUMENTO, ROTULO_TIPO_DOCUMENTO, ROTULO_TIPO_SUBPROCESSO, paraOpcoes } from '@/lib/rotulos'
import { esquemaSolicitacaoDocumento, type DadosSolicitacaoDocumento } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { FiltrosDocumentos } from '@/services/contratos'
import type { StatusDocumento, TipoDocumento } from '@/types/domain'

const TAMANHO_PADRAO = 25

export default function Documentos() {
  const [parametros, setParametros] = useSearchParams()
  const [solicitando, setSolicitando] = React.useState(false)

  const filtros: FiltrosDocumentos = React.useMemo(
    () => ({
      termo: parametros.get('busca') ?? '',
      status: (parametros.get('status') as StatusDocumento | 'todos') ?? 'todos',
      tipo: (parametros.get('tipo') as TipoDocumento | 'todos') ?? 'todos',
      somenteAguardandoAnalise: parametros.get('aguardando') === '1',
      pagina: Number(parametros.get('pagina') ?? 1),
      tamanhoPagina: Number(parametros.get('tamanho') ?? TAMANHO_PADRAO),
      ordenarPor: 'atualizadoEm',
      ordem: 'desc',
    }),
    [parametros],
  )

  function definir(chave: string, valor: string) {
    setParametros((atuais) => {
      const proximos = new URLSearchParams(atuais)
      if (!valor || valor === 'todos' || valor === '0') proximos.delete(chave)
      else proximos.set(chave, valor)
      if (chave !== 'pagina') proximos.delete('pagina')
      return proximos
    })
  }

  const resumo = useQuery({
    queryKey: chaves.documentos.resumo(),
    queryFn: () => servicos.documentos.resumo(),
  })

  const consulta = useQuery({
    queryKey: chaves.documentos.lista(filtros),
    queryFn: () => servicos.documentos.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const temFiltro =
    Boolean(filtros.termo) ||
    filtros.status !== 'todos' ||
    filtros.tipo !== 'todos' ||
    filtros.somenteAguardandoAnalise === true

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Análise"
        titulo="Documentos"
        descricao="Solicitação, recebimento e análise dos documentos dos clientes."
        acoes={
          <Button onClick={() => setSolicitando(true)}>
            <FilePlus2 aria-hidden="true" />
            Solicitar documento
          </Button>
        }
      />

      <ResumoDosDocumentos
        resumo={resumo.data}
        carregando={resumo.isLoading}
        erro={resumo.isError}
        aoTentarNovamente={() => void resumo.refetch()}
      />

      <Alert tom="privacidade" className="mb-4">
        Documentos marcados como sensíveis (laudos e informações de saúde) não têm o conteúdo
        exibido automaticamente e aparecem de forma genérica em notificações e históricos.
      </Alert>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <CampoBusca
              rotulo="Buscar documentos por título, cliente ou processo"
              placeholder="Buscar por título, cliente ou processo…"
              valor={filtros.termo ?? ''}
              aoMudar={(valor) => definir('busca', valor)}
              className="lg:max-w-md lg:flex-1"
            />

            <div className="grid grid-cols-2 gap-2 lg:flex">
              <Select value={filtros.status} onValueChange={(valor) => definir('status', valor)}>
                <SelectTrigger className="lg:w-48" aria-label="Filtrar por status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo status</SelectItem>
                  {paraOpcoes(ROTULO_STATUS_DOCUMENTO).map((opcao) => (
                    <SelectItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtros.tipo} onValueChange={(valor) => definir('tipo', valor)}>
                <SelectTrigger className="lg:w-48" aria-label="Filtrar por tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo tipo</SelectItem>
                  {paraOpcoes(ROTULO_TIPO_DOCUMENTO).map((opcao) => (
                    <SelectItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3">
            <CheckboxCampo
              id="somente-aguardando"
              rotulo="Somente aguardando minha análise"
              descricao="Documentos já enviados pelo cliente, sem parecer da equipe."
              checked={filtros.somenteAguardandoAnalise === true}
              onCheckedChange={(marcada) => definir('aguardando', marcada ? '1' : '0')}
            />
          </div>
        </div>

        {consulta.isLoading ? (
          <EstadoCarregando rotulo="Carregando documentos" />
        ) : consulta.isError ? (
          <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
        ) : consulta.data && consulta.data.total === 0 ? (
          temFiltro ? (
            <EstadoSemResultado
              termo={filtros.termo || undefined}
              aoLimpar={() => setParametros(new URLSearchParams())}
            />
          ) : (
            <EstadoVazio
              icone={FileText}
              titulo="Nenhum documento"
              descricao="Solicite os documentos necessários para iniciar a análise de um subprocesso."
              acao={
                <Button onClick={() => setSolicitando(true)}>
                  <FilePlus2 aria-hidden="true" />
                  Solicitar documento
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-border">
              {consulta.data?.itens.map((documento) => (
                <li
                  key={documento.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start"
                >
                  <span
                    className="hidden size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex"
                    aria-hidden="true"
                  >
                    {documento.sensivel ? (
                      <ShieldAlert className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </span>

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
                      {documento.visibilidade === 'interno' && (
                        <Badge tom="contorno" tamanho="sm">
                          Interno
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {documento.clienteNome}
                      {documento.processoCodigo && (
                        <>
                          {' · '}
                          <Link
                            to={`/app/processos/${documento.processoId}`}
                            className="rounded-xs font-medium hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {documento.processoCodigo}
                          </Link>
                        </>
                      )}
                      {documento.subprocessoTipo && (
                        <> · {ROTULO_TIPO_SUBPROCESSO[documento.subprocessoTipo]}</>
                      )}
                    </p>

                    {documento.arquivoNome && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
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

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {documento.prazoEnvio &&
                        (documento.status === 'solicitado' ||
                          documento.status === 'reenvio_solicitado') && (
                          <Prazo data={documento.prazoEnvio} />
                        )}
                      <span className="text-[11px] text-muted-foreground">
                        Atualizado {formatarTempoRelativo(documento.atualizadoEm)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    <AcoesDocumento documento={documento} compacto />
                  </div>
                </li>
              ))}
            </ul>

            <Paginacao
              pagina={filtros.pagina ?? 1}
              tamanhoPagina={filtros.tamanhoPagina ?? TAMANHO_PADRAO}
              total={consulta.data?.total ?? 0}
              rotuloItens="documentos"
              aoMudarPagina={(pagina) => definir('pagina', String(pagina))}
              aoMudarTamanho={(tamanho) => definir('tamanho', String(tamanho))}
            />
          </>
        )}
      </Card>

      <DialogoSolicitacao aberto={solicitando} aoMudarAberto={setSolicitando} />
    </EntradaPagina>
  )
}

function DialogoSolicitacao({
  aberto,
  aoMudarAberto,
  clienteIdFixo,
  processoIdFixo,
  subprocessoIdFixo,
}: {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  clienteIdFixo?: string
  processoIdFixo?: string
  subprocessoIdFixo?: string
}) {
  const clienteConsulta = useQueryClient()

  const clientes = useQuery({
    queryKey: chaves.clientes.opcoes(),
    queryFn: () => servicos.clientes.opcoes(),
    enabled: aberto && !clienteIdFixo,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DadosSolicitacaoDocumento>({
    resolver: zodResolver(esquemaSolicitacaoDocumento),
    defaultValues: {
      clienteId: clienteIdFixo ?? '',
      processoId: processoIdFixo ?? '',
      subprocessoId: subprocessoIdFixo ?? '',
      tipo: 'rg',
      titulo: '',
      prazoEnvio: '',
      visibilidade: 'cliente',
      sensivel: false,
      observacoesInternas: '',
    },
  })

  const tipo = watch('tipo')

  // Laudos são tratados como sensíveis por padrão.
  React.useEffect(() => {
    setValue('sensivel', tipo === 'laudo_medico')
    setValue('titulo', ROTULO_TIPO_DOCUMENTO[tipo])
  }, [tipo, setValue])

  React.useEffect(() => {
    if (!aberto) reset()
  }, [aberto, reset])

  const solicitar = useMutation({
    mutationFn: (dados: DadosSolicitacaoDocumento) =>
      servicos.documentos.solicitar({
        clienteId: dados.clienteId,
        processoId: dados.processoId || undefined,
        subprocessoId: dados.subprocessoId || undefined,
        tipo: dados.tipo,
        titulo: dados.titulo,
        prazoEnvio: dados.prazoEnvio || undefined,
        visibilidade: dados.visibilidade,
        sensivel: dados.sensivel,
        observacoesInternas: dados.observacoesInternas || undefined,
      }),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.documentos.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.painel.todos })
      toast.success('Documento solicitado', {
        description: 'O cliente será avisado na área dele.',
      })
      aoMudarAberto(false)
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent>
        <form onSubmit={handleSubmit((dados) => solicitar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>Solicitar documento</DialogTitle>
            <DialogDescription>
              O cliente recebe um aviso e poderá enviar o arquivo pela área dele.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="py-3">
            <GrupoCampos titulo="Solicitação">
              {!clienteIdFixo && (
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
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="Tipo" obrigatorio>
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
                            {paraOpcoes(ROTULO_TIPO_DOCUMENTO).map((opcao) => (
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

                <Campo rotulo="Prazo de envio" erro={errors.prazoEnvio?.message}>
                  {(campo) => <Input {...campo} {...register('prazoEnvio')} type="date" />}
                </Campo>
              </div>

              <Campo
                rotulo="Título exibido ao cliente"
                erro={errors.titulo?.message}
                obrigatorio
                dica="Use um nome claro, como “RG (frente e verso)”."
              >
                {(campo) => <Input {...campo} {...register('titulo')} />}
              </Campo>

              <Controller
                control={control}
                name="sensivel"
                render={({ field }) => (
                  <CheckboxCampo
                    id="documento-sensivel"
                    rotulo="Contém informação sensível"
                    descricao="Laudos e dados de saúde. O nome do arquivo não aparece em notificações nem no histórico."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              <Campo rotulo="Observações internas" erro={errors.observacoesInternas?.message}>
                {(campo) => <Textarea {...campo} {...register('observacoesInternas')} rows={2} />}
              </Campo>
            </GrupoCampos>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={() => aoMudarAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Solicitando">
              <FilePlus2 aria-hidden="true" />
              Solicitar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
