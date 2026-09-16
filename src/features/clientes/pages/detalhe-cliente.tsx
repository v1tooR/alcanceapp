import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  FileText,
  FolderKanban,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import {
  FaixaDestaque,
  MedidorMarca,
  MetricaMarca,
  SeloMarca,
  classeBotaoMarca,
  classeBotaoMarcaContorno,
} from '@/components/shared/faixa-destaque'
import { statusProcessoAtivo } from '@/lib/workflow'
import { STATUS_DOCUMENTO } from '@/types/domain'
import { EntradaPagina } from '@/components/shared/animacao'
import { DadoSensivel } from '@/components/shared/dado-sensivel'
import { DialogoConfirmacao } from '@/components/shared/confirmar'
import { StatusProcessoBadge, TipoSubprocessoBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBarra, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContador, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormularioCliente } from '@/features/clientes/components/formulario-cliente'
import { paraEntradaCliente, paraValoresFormulario } from '@/features/clientes/mapeadores'
import { formatarData, formatarDataHora } from '@/lib/formato'
import { mascararCep, mascararCpf, mascararTelefone } from '@/lib/mascaras'
import { mensagemErroSegura } from '@/lib/privacidade'
import {
  ROTULO_SITUACAO_CLIENTE,
  ROTULO_STATUS_DOCUMENTO,
  ROTULO_TIPO_CLIENTE,
  TOM_STATUS_DOCUMENTO,
} from '@/lib/rotulos'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { DadosCliente } from '@/schemas'

export default function DetalheCliente() {
  const { clienteId = '' } = useParams()
  const clienteConsulta = useQueryClient()
  const [editando, setEditando] = React.useState(false)
  const [confirmandoAcesso, setConfirmandoAcesso] = React.useState(false)
  const [erroEdicao, setErroEdicao] = React.useState<string | null>(null)

  const cliente = useQuery({
    queryKey: chaves.clientes.detalhe(clienteId),
    queryFn: () => servicos.clientes.obter(clienteId),
    enabled: Boolean(clienteId),
  })

  const processos = useQuery({
    queryKey: chaves.processos.lista({ clienteId }),
    queryFn: () => servicos.processos.listar({ clienteId, tamanhoPagina: 50 }),
    enabled: Boolean(clienteId),
  })

  const documentos = useQuery({
    queryKey: chaves.documentos.lista({ clienteId }),
    queryFn: () => servicos.documentos.listar({ clienteId, tamanhoPagina: 50 }),
    enabled: Boolean(clienteId),
  })

  const salvar = useMutation({
    mutationFn: (dados: DadosCliente) =>
      servicos.clientes.atualizar(clienteId, paraEntradaCliente(dados)),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.clientes.todos })
      setEditando(false)
      toast.success('Cadastro atualizado')
    },
    onError: (falha) => setErroEdicao(mensagemErroSegura(falha)),
  })

  const alternarAcesso = useMutation({
    mutationFn: (ativo: boolean) => servicos.clientes.definirAcessoPortal(clienteId, ativo),
    onSuccess: (atualizado) => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.clientes.todos })
      toast.success(
        atualizado.acessoPortalAtivo
          ? 'Acesso do cliente liberado'
          : 'Acesso do cliente suspenso',
      )
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  if (cliente.isLoading) return <EstadoCarregando rotulo="Carregando cliente" />
  if (cliente.isError || !cliente.data) {
    return (
      <EstadoErro
        titulo="Cliente não encontrado"
        descricao="O cadastro pode ter sido removido ou o endereço está incorreto."
        aoTentarNovamente={() => void cliente.refetch()}
      />
    )
  }

  const dados = cliente.data
  const listaProcessos = processos.data?.itens ?? []
  const listaDocumentos = documentos.data?.itens ?? []
  const processosEmAndamento = listaProcessos.filter((processo) => statusProcessoAtivo(processo.status))
  const andamentoMedio =
    processosEmAndamento.length === 0
      ? 0
      : Math.round(
          processosEmAndamento.reduce((soma, processo) => soma + processo.progresso, 0) /
            processosEmAndamento.length,
        )
  const contagemDocumentos = STATUS_DOCUMENTO.map((status) => ({
    status,
    total: listaDocumentos.filter((documento) => documento.status === status).length,
  })).filter((item) => item.total > 0)

  return (
    <EntradaPagina>
      <FaixaDestaque
        tamanho="medio"
        className="mb-5"
        chapeu={`Cliente · ${dados.codigo}`}
        titulo={dados.nome}
        migalhas={[{ rotulo: 'Clientes', para: '/app/clientes' }, { rotulo: dados.nome }]}
        voltarPara="/app/clientes"
        voltarRotulo="Clientes"
        meta={
          <>
            <SeloMarca>{ROTULO_SITUACAO_CLIENTE[dados.situacao]}</SeloMarca>
            <SeloMarca>{ROTULO_TIPO_CLIENTE[dados.tipo]}</SeloMarca>
            {dados.acessoPortalAtivo && (
              <SeloMarca>
                <ShieldCheck aria-hidden="true" />
                Acesso liberado
              </SeloMarca>
            )}
          </>
        }
        metricas={
          <>
            <MetricaMarca valor={dados.processosAtivos} rotulo="Processos ativos" principal />
            <MetricaMarca valor={dados.documentosPendentes} rotulo="Documentos pendentes" />
            {processosEmAndamento.length > 0 && (
              <MedidorMarca
                rotulo="Andamento médio"
                valor={andamentoMedio}
                maximo={100}
                legenda={`Média de ${processosEmAndamento.length} processo${processosEmAndamento.length > 1 ? 's' : ''} em andamento`}
              />
            )}
          </>
        }
        acoes={
          <>
            <Button
              variante="fantasma"
              className={classeBotaoMarcaContorno}
              onClick={() => setEditando(true)}
            >
              <Pencil aria-hidden="true" />
              Editar
            </Button>
            <Button asChild className={classeBotaoMarca}>
              <Link to={`/app/processos/novo?cliente=${dados.id}`}>
                <Plus aria-hidden="true" />
                Novo processo
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="processos">
            Processos <TabsContador valor={listaProcessos.length} />
          </TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos <TabsContador valor={listaDocumentos.length} />
          </TabsTrigger>
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardBarra titulo="Dados de contato" />
                <CardContent className="pt-4">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Informacao icone={IdCard} rotulo="CPF" valor={mascararCpf(dados.cpf)} />
                    <Informacao icone={IdCard} rotulo="RG" valor={dados.rg ?? '—'} />
                    <Informacao icone={Mail} rotulo="E-mail" valor={dados.email} />
                    <Informacao
                      icone={Phone}
                      rotulo="Telefone"
                      valor={mascararTelefone(dados.telefone)}
                    />
                    <Informacao
                      icone={IdCard}
                      rotulo="Nascimento"
                      valor={formatarData(dados.dataNascimento)}
                    />
                    <Informacao
                      icone={MapPin}
                      rotulo="Endereço"
                      valor={
                        dados.endereco
                          ? `${dados.endereco.logradouro}, ${dados.endereco.numero} — ${dados.endereco.bairro}, ${dados.endereco.cidade}/${dados.endereco.uf} · ${mascararCep(dados.endereco.cep)}`
                          : '—'
                      }
                    />
                  </dl>
                </CardContent>
              </Card>

              {/* Bloco sensível */}
              <Card>
                <CardBarra
                  titulo="Perfil assistido"
                  descricao="Informação pessoal sensível, restrita à equipe."
                />
                <CardContent className="pt-4">
                  <DadoSensivel rotulo="Dados de saúde e deficiência">
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Categorias
                        </dt>
                        <dd className="mt-1 flex flex-wrap gap-1.5">
                          {(dados.perfilAssistido?.categorias ?? []).length > 0 ? (
                            dados.perfilAssistido?.categorias.map((categoria) => (
                              <Badge key={categoria} tom="primario" tamanho="sm">
                                {categoria}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Não informado</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Laudo médico
                        </dt>
                        <dd className="mt-1">
                          {dados.perfilAssistido?.possuiLaudo ? (
                            <>
                              Possui laudo
                              {dados.perfilAssistido.laudoValidoAte && (
                                <> · válido até {formatarData(dados.perfilAssistido.laudoValidoAte)}</>
                              )}
                            </>
                          ) : (
                            'Não informado'
                          )}
                        </dd>
                      </div>
                      {dados.perfilAssistido?.observacoes && (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Observações
                          </dt>
                          <dd className="mt-1 leading-snug">{dados.perfilAssistido.observacoes}</dd>
                        </div>
                      )}
                    </dl>
                  </DadoSensivel>
                </CardContent>
              </Card>

              {dados.observacoesInternas && (
                <Card>
                  <CardBarra
                    titulo="Observações internas"
                    descricao="Nunca exibidas na área do cliente."
                  />
                  <CardContent className="pt-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {dados.observacoesInternas}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna lateral */}
            <div className="space-y-4">
              <Card>
                <CardBarra titulo="Atendimento" />
                <CardContent className="space-y-4 pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Responsável
                    </p>
                    {dados.responsavel ? (
                      <p className="mt-1.5 flex items-center gap-2 text-sm font-medium">
                        <Avatar nome={dados.responsavel.nome} tamanho="sm" />
                        {dados.responsavel.nome}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Sem responsável definido</p>
                    )}
                  </div>


                  <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                    Cadastrado em {formatarData(dados.criadoEm)}
                    {dados.ultimaMovimentacaoEm && (
                      <> · última movimentação em {formatarDataHora(dados.ultimaMovimentacaoEm)}</>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardBarra titulo="Área do cliente" />
                <CardContent className="pt-4">
                  <label className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Acesso liberado</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
                        Permite acompanhar o próprio processo e enviar documentos solicitados.
                      </span>
                    </span>
                    <Switch
                      checked={dados.acessoPortalAtivo}
                      onCheckedChange={(ativo) => {
                        if (!ativo) setConfirmandoAcesso(true)
                        else alternarAcesso.mutate(true)
                      }}
                      aria-label="Acesso do cliente à própria área"
                    />
                  </label>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Processos */}
        <TabsContent value="processos">
          <Card className="overflow-hidden">
            <CardBarra
              titulo="Processos do cliente"
              acoes={
                <Button tamanho="sm" asChild>
                  <Link to={`/app/processos/novo?cliente=${dados.id}`}>
                    <Plus aria-hidden="true" />
                    Abrir processo
                  </Link>
                </Button>
              }
            />
            {processos.isLoading ? (
              <EstadoCarregando rotulo="Carregando processos" />
            ) : listaProcessos.length === 0 ? (
              <EstadoVazio
                icone={FolderKanban}
                titulo="Nenhum processo aberto"
                descricao="Abra um processo e selecione os subprocessos aplicáveis a este cliente."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {listaProcessos.map((processo) => (
                  <li key={processo.id}>
                    <Link
                      to={`/app/processos/${processo.id}`}
                      className="block px-4 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{processo.titulo}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{processo.codigo}</p>
                        </div>
                        <StatusProcessoBadge status={processo.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {processo.tiposSubprocesso.map((tipo) => (
                          <TipoSubprocessoBadge key={tipo} tipo={tipo} />
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <Progress
                          valor={processo.progresso}
                          rotulo={`Progresso do processo ${processo.codigo}`}
                          className="max-w-56"
                        />
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {processo.progresso}%
                        </span>
                        {processo.prazoFinal && <Prazo data={processo.prazoFinal} />}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos">
          <Card className="overflow-hidden">
            <CardBarra titulo="Documentos do cliente" />
            {contagemDocumentos.length > 0 && (
              <ul className="flex flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-5" aria-label="Documentos por situação">
                {contagemDocumentos.map((item) => (
                  <li key={item.status}>
                    <Badge tom={TOM_STATUS_DOCUMENTO[item.status]} ponto>
                      {ROTULO_STATUS_DOCUMENTO[item.status]}
                      <span className="font-bold tabular-nums">{item.total}</span>
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {documentos.isLoading ? (
              <EstadoCarregando rotulo="Carregando documentos" />
            ) : listaDocumentos.length === 0 ? (
              <EstadoVazio
                icone={FileText}
                titulo="Nenhum documento"
                descricao="Os documentos solicitados e recebidos aparecerão aqui."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {listaDocumentos.map((documento) => (
                  <li key={documento.id} className="flex items-start gap-3 px-4 py-3.5">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{documento.titulo}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {documento.processoCodigo ?? 'Sem processo vinculado'}
                        {documento.sensivel && ' · informação sensível'}
                      </p>
                    </div>
                    <Badge tom={TOM_STATUS_DOCUMENTO[documento.status]} ponto tamanho="sm">
                      {ROTULO_STATUS_DOCUMENTO[documento.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edição */}
      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent largura="lg">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Alterações passam a valer imediatamente para a equipe e para a área do cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-5">
            <FormularioCliente
              valoresIniciais={paraValoresFormulario(dados)}
              erroServidor={erroEdicao}
              rotuloEnvio="Salvar alterações"
              aoCancelar={() => setEditando(false)}
              aoEnviar={async (valores) => {
                setErroEdicao(null)
                await salvar.mutateAsync(valores)
              }}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <DialogoConfirmacao
        aberto={confirmandoAcesso}
        aoMudarAberto={setConfirmandoAcesso}
        titulo="Suspender o acesso do cliente?"
        descricao={
          <>
            <span className="block">
              {dados.nome} deixará de acompanhar o processo e de enviar documentos pela área do
              cliente.
            </span>
            <span className="mt-2 block">O acesso pode ser liberado novamente a qualquer momento.</span>
          </>
        }
        rotuloConfirmar="Suspender acesso"
        variante="perigo"
        aoConfirmar={() => alternarAcesso.mutateAsync(false).then(() => undefined)}
      />
    </EntradaPagina>
  )
}

function Informacao({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: React.ComponentType<{ className?: string }>
  rotulo: string
  valor: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </dt>
        <dd className="mt-0.5 text-sm leading-snug break-words">{valor}</dd>
      </div>
    </div>
  )
}
