import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, Check, CircleDashed, CirclePlay, FileText, History } from 'lucide-react'
import {
  FaixaDestaque,
  MedidorMarca,
  MetricaMarca,
  SeloMarca,
} from '@/components/shared/faixa-destaque'
import { EntradaPagina } from '@/components/shared/animacao'
import { LinhaTempo } from '@/components/shared/linha-tempo'
import {
  StatusDocumentoBadge,
  StatusProcessoBadge,
  StatusSubprocessoBadge,
} from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardBarra, CardContent } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContador, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatarData } from '@/lib/formato'
import { ROTULO_TIPO_SUBPROCESSO } from '@/lib/rotulos'
import { cn } from '@/lib/utils'
import { progressoProcesso, progressoSubprocesso } from '@/lib/workflow'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'
import type { StatusEtapa } from '@/types/domain'

const ICONE_ETAPA: Record<StatusEtapa, typeof Check> = {
  pendente: CircleDashed,
  em_andamento: CirclePlay,
  concluida: Check,
  bloqueada: Ban,
  nao_aplicavel: CircleDashed,
}

export default function PortalDetalheProcesso() {
  const { processoId = '' } = useParams()
  const clienteId = usarSessao((estado) => estado.usuario?.clienteId) ?? ''

  const consulta = useQuery({
    queryKey: chaves.portal.processo(clienteId, processoId),
    queryFn: () => servicos.portal.processo(clienteId, processoId),
    enabled: Boolean(clienteId && processoId),
  })

  if (consulta.isLoading) return <EstadoCarregando rotulo="Carregando processo" />
  if (consulta.isError || !consulta.data) {
    return (
      <EstadoErro
        titulo="Processo não encontrado"
        descricao="Verifique o endereço ou volte para a lista dos seus processos."
        aoTentarNovamente={() => void consulta.refetch()}
      />
    )
  }

  const dados = consulta.data
  const progresso = progressoProcesso(dados.subprocessos)
  const etapasDoProcesso = progressoSubprocesso(
    dados.subprocessos
      .filter((sub) => sub.status !== 'nao_aplicavel' && sub.status !== 'cancelado')
      .flatMap((sub) => sub.etapas),
  )
  const documentosAprovados = dados.documentos.filter(
    (documento) => documento.status === 'aprovado',
  ).length

  return (
    <EntradaPagina>
      <FaixaDestaque
        tamanho="medio"
        className="mb-5"
        chapeu={`Seu processo · ${dados.codigo}`}
        titulo={dados.titulo}
        migalhas={[
          { rotulo: 'Meus processos', para: '/portal/processos' },
          { rotulo: dados.codigo },
        ]}
        voltarPara="/portal/processos"
        voltarRotulo="Meus processos"
        meta={
          <>
            <StatusProcessoBadge status={dados.status} />
            <SeloMarca>Aberto em {formatarData(dados.abertoEm)}</SeloMarca>
          </>
        }
        descricao={dados.resumoPublico}
        metricas={
          <>
            <MetricaMarca
              valor={`${progresso}%`}
              rotulo={`Concluído · ${etapasDoProcesso.concluidas} de ${etapasDoProcesso.aplicaveis} etapas`}
              principal
            />
            <MedidorMarca
              rotulo="Documentos aprovados"
              valor={documentosAprovados}
              maximo={dados.documentos.length}
              legenda={
                dados.documentos.length === 0
                  ? 'Nenhum documento pedido'
                  : `${documentosAprovados} de ${dados.documentos.length} documentos`
              }
            />
            {dados.prazoFinal && (
              <MetricaMarca valor={formatarData(dados.prazoFinal)} rotulo="Prazo final" />
            )}
          </>
        }
      />

      <Tabs defaultValue="etapas">
        <TabsList>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
          <TabsTrigger value="documentos">
            <FileText aria-hidden="true" />
            Documentos <TabsContador valor={dados.documentos.length} />
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History aria-hidden="true" />
            Histórico <TabsContador valor={dados.movimentacoes.length} />
          </TabsTrigger>
        </TabsList>

        {/* Etapas */}
        <TabsContent value="etapas">
          <div className="space-y-4">
            {dados.subprocessos
              .filter((sub) => sub.status !== 'nao_aplicavel')
              .map((sub) => {
                const progressoSub = progressoSubprocesso(sub.etapas)
                return (
                  <Card key={sub.id}>
                    <CardBarra
                      titulo={ROTULO_TIPO_SUBPROCESSO[sub.tipo]}
                      descricao={sub.orgao}
                      acoes={<StatusSubprocessoBadge status={sub.status} />}
                    />
                    <CardContent className="pt-4">
                      {sub.proximaAcao && (
                        <div className="mb-4 rounded-md border border-border bg-surface-muted p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Próximo passo
                          </p>
                          <p className="mt-1 text-sm leading-snug">{sub.proximaAcao}</p>
                          {sub.responsavelProximaAcao === 'cliente' && (
                            <Badge tom="destaque" tamanho="sm" className="mt-2">
                              Depende de você
                            </Badge>
                          )}
                        </div>
                      )}

                      {sub.etapas.length === 0 ? (
                        <EstadoVazio
                          titulo="Etapas ainda não definidas"
                          descricao="A equipe publicará as etapas assim que o serviço começar."
                          compacto
                        />
                      ) : (
                        <>
                          <div className="mb-3 flex items-center gap-2">
                            <Progress
                              valor={progressoSub.percentual}
                              rotulo={`Progresso de ${ROTULO_TIPO_SUBPROCESSO[sub.tipo]}`}
                              tom={progressoSub.percentual === 100 ? 'sucesso' : 'primario'}
                            />
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                              {progressoSub.concluidas}/{progressoSub.aplicaveis}
                            </span>
                          </div>

                          <ol className="space-y-1.5">
                            {sub.etapas.map((etapa) => {
                              const Icone = ICONE_ETAPA[etapa.status]
                              return (
                                <li
                                  key={etapa.id}
                                  className={cn(
                                    'flex items-start gap-2.5 rounded-md border border-border px-3 py-2.5',
                                    etapa.status === 'concluida' &&
                                      'border-success/20 bg-success-soft/40',
                                    etapa.status === 'bloqueada' &&
                                      'border-warning/25 bg-warning-soft/40',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                                      etapa.status === 'concluida'
                                        ? 'bg-success text-success-foreground'
                                        : etapa.status === 'em_andamento'
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground',
                                    )}
                                    aria-hidden="true"
                                  >
                                    <Icone className="size-3" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium leading-snug">
                                      {etapa.titulo}
                                    </span>
                                    {etapa.observacao && (
                                      <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
                                        {etapa.observacao}
                                      </span>
                                    )}
                                    {etapa.concluidaEm && (
                                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                        Concluída em {formatarData(etapa.concluidaEm)}
                                      </span>
                                    )}
                                  </span>
                                </li>
                              )
                            })}
                          </ol>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos">
          <Card className="overflow-hidden">
            <CardBarra titulo="Documentos deste processo" />
            {dados.documentos.length === 0 ? (
              <EstadoVazio
                icone={FileText}
                titulo="Nenhum documento"
                descricao="Quando a equipe solicitar um documento, ele aparece aqui."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {dados.documentos.map((documento) => (
                  <li key={documento.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{documento.titulo}</p>
                      {documento.motivoDevolucao && (
                        <p className="mt-1.5 rounded-sm border border-warning/25 bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground leading-snug">
                          {documento.motivoDevolucao}
                        </p>
                      )}
                    </div>
                    <StatusDocumentoBadge status={documento.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <Card>
            <CardBarra titulo="O que já aconteceu" />
            <CardContent className="pt-5">
              {dados.movimentacoes.length === 0 ? (
                <EstadoVazio
                  icone={History}
                  titulo="Nenhuma atualização ainda"
                  descricao="As movimentações do seu processo aparecerão aqui."
                  compacto
                />
              ) : (
                <LinhaTempo movimentacoes={dados.movimentacoes} mostrarVisibilidade={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </EntradaPagina>
  )
}
