import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileUp,
  FolderKanban,
  Layers,
} from 'lucide-react'
import { Entrada, EntradaPagina } from '@/components/shared/animacao'
import { BarraSimples } from '@/components/graficos/marcas'
import {
  Destaque,
  FaixaDestaque,
  MedidorMarca,
  MetricaMarca,
  classeBotaoMarca,
  classeBotaoMarcaContorno,
} from '@/components/shared/faixa-destaque'
import { StatusSubprocessoBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBarra } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { formatarData, formatarHora, formatarTempoRelativo } from '@/lib/formato'
import { progressoSubprocesso } from '@/lib/workflow'
import { primeiroNome } from '@/lib/privacidade'
import { ROTULO_STATUS_PROCESSO, ROTULO_TIPO_EVENTO, ROTULO_TIPO_SUBPROCESSO } from '@/lib/rotulos'
import { capitalizarPrimeira, cn } from '@/lib/utils'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'

export default function PortalInicio() {
  const usuario = usarSessao((estado) => estado.usuario)
  const clienteId = usuario?.clienteId ?? ''

  const consulta = useQuery({
    queryKey: chaves.portal.visaoGeral(clienteId),
    queryFn: () => servicos.portal.visaoGeral(clienteId),
    enabled: Boolean(clienteId),
  })

  const avisos = useQuery({
    queryKey: chaves.notificacoes.lista(usuario?.id ?? ''),
    queryFn: () => servicos.notificacoes.listar(usuario!.id),
    enabled: Boolean(usuario),
  })

  if (consulta.isLoading) return <EstadoCarregando rotulo="Carregando sua área" />
  if (consulta.isError || !consulta.data) {
    return <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
  }

  const { processos, documentosPendentes, proximosEventos } = consulta.data
  const principal = processos.find((processo) => processo.status !== 'arquivado') ?? processos[0]
  const servicosAtivos = principal?.subprocessos.filter((sub) => sub.status !== 'nao_aplicavel') ?? []
  const etapas = progressoSubprocesso(servicosAtivos.flatMap((sub) => sub.etapas))
  const servicosEmCurso = servicosAtivos.filter((sub) => sub.status !== 'cancelado')
  const servicosDecididos = servicosEmCurso.filter(
    (sub) => sub.status === 'deferido' || sub.status === 'indeferido',
  ).length
  const hoje = capitalizarPrimeira(format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }))

  const frase =
    documentosPendentes.length > 0
      ? `${documentosPendentes.length === 1 ? 'Há 1 documento' : `Há ${documentosPendentes.length} documentos`} aguardando o seu envio — é o que permite a equipe seguir com o seu processo.`
      : principal
        ? `Seu processo está ${ROTULO_STATUS_PROCESSO[principal.status].toLowerCase()}. Nenhuma pendência sua no momento.`
        : 'Assim que a equipe abrir o seu processo, o acompanhamento aparece aqui.'

  return (
    <EntradaPagina>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <FaixaDestaque
            chapeu={hoje}
            titulo={
              <>
                Olá, <Destaque>{primeiroNome(usuario?.nome ?? '')}</Destaque>
              </>
            }
            descricao={frase}
            metricas={
              principal && (
                <>
                  <MetricaMarca
                    valor={`${principal.progresso}%`}
                    rotulo={`Concluído · ${etapas.concluidas} de ${etapas.aplicaveis} etapas`}
                    principal
                  />
                  <MedidorMarca
                    rotulo="Serviços com resultado"
                    valor={servicosDecididos}
                    maximo={servicosEmCurso.length}
                    legenda={`${servicosDecididos} de ${servicosEmCurso.length} serviços`}
                  />
                  <MetricaMarca valor={documentosPendentes.length} rotulo="Documentos para enviar" />
                </>
              )
            }
            acoes={
              <>
                {documentosPendentes.length > 0 && (
                  <Button asChild className={classeBotaoMarca}>
                    <Link to="/portal/documentos">
                      <FileUp aria-hidden="true" />
                      Enviar documentos
                    </Link>
                  </Button>
                )}
                {principal && (
                  <Button asChild variante="fantasma" className={classeBotaoMarcaContorno}>
                    <Link to={`/portal/processos/${principal.id}`}>
                      Ver meu processo
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </>
            }
          />
        </div>

        {/* O que depende do cliente vem primeiro */}
        <Entrada atraso={0.05} className="lg:col-span-7">
          <Card className="h-full overflow-hidden">
            <CardBarra
              titulo="O que depende de você"
              descricao={
                documentosPendentes.length > 0
                  ? 'Documentos pedidos pela equipe.'
                  : 'Nada pendente do seu lado.'
              }
            />
            {documentosPendentes.length === 0 ? (
              <EstadoVazio
                icone={CheckCircle2}
                titulo="Tudo em dia"
                descricao="Quando a equipe precisar de um novo documento, o pedido aparece aqui e você recebe um aviso."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {documentosPendentes.slice(0, 4).map((documento) => (
                  <li key={documento.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"
                      aria-hidden="true"
                    >
                      <FileUp className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{documento.titulo}</p>
                      {documento.status === 'reenvio_solicitado' && (
                        <p className="mt-0.5 text-xs text-muted-foreground">A equipe pediu um novo envio.</p>
                      )}
                    </div>
                    {documento.prazoEnvio && <Prazo data={documento.prazoEnvio} />}
                  </li>
                ))}
              </ul>
            )}
            {documentosPendentes.length > 0 && (
              <div className="border-t border-border p-3 sm:px-5">
                <Button asChild largura="cheia" className="sm:w-auto">
                  <Link to="/portal/documentos">
                    <FileUp aria-hidden="true" />
                    Enviar agora
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        </Entrada>

        {/* Agenda */}
        <Entrada atraso={0.1} className="lg:col-span-5">
          <Card className="h-full overflow-hidden">
            <CardBarra
              titulo="Próximos compromissos"
              acoes={
                <Button variante="fantasma" tamanho="sm" asChild className="-mr-2">
                  <Link to="/portal/agenda">Agenda</Link>
                </Button>
              }
            />
            {proximosEventos.length === 0 ? (
              <EstadoVazio
                icone={CalendarDays}
                titulo="Nada agendado"
                descricao="Você será avisado quando houver um compromisso."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {proximosEventos.map((evento) => (
                  <li key={evento.id} className="flex gap-3 px-4 py-3 sm:px-5">
                    <span
                      className="flex w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary-soft py-1.5 text-primary-soft-foreground"
                      aria-hidden="true"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {format(new Date(`${evento.data}T12:00:00`), 'MMM', { locale: ptBR }).replace('.', '')}
                      </span>
                      <span className="alc-numero text-lg">{evento.data.slice(-2).replace(/^0/, '')}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{evento.titulo}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="sr-only">{formatarData(evento.data)}, </span>
                        {evento.hora ? formatarHora(evento.hora) : 'Dia todo'} ·{' '}
                        {ROTULO_TIPO_EVENTO[evento.tipo]}
                      </p>
                      {evento.local && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{evento.local}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Entrada>

        {/* Serviços */}
        <Entrada atraso={0.15} className="lg:col-span-7">
          <Card className="h-full overflow-hidden">
            <CardBarra
              titulo="Seus serviços"
              descricao="Cada serviço tem as próprias etapas e resultado."
              acoes={
                principal && (
                  <Button variante="fantasma" tamanho="sm" asChild className="-mr-2">
                    <Link to={`/portal/processos/${principal.id}`}>Ver etapas</Link>
                  </Button>
                )
              }
            />
            {servicosAtivos.length === 0 ? (
              <EstadoVazio
                icone={principal ? Layers : FolderKanban}
                titulo={principal ? 'Serviços ainda não definidos' : 'Nenhum processo aberto'}
                descricao="A equipe publica os serviços assim que o atendimento começa."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {servicosAtivos.map((sub) => {
                  const progresso = progressoSubprocesso(sub.etapas)
                  return (
                    <li key={sub.id} className="px-4 py-3.5 sm:px-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold leading-snug">{ROTULO_TIPO_SUBPROCESSO[sub.tipo]}</p>
                        <StatusSubprocessoBadge status={sub.status} />
                      </div>
                      {progresso.aplicaveis > 0 && (
                        <div className="mt-2 flex items-center gap-3">
                          <BarraSimples
                            valor={progresso.concluidas}
                            maximo={progresso.aplicaveis}
                            rotulo={`${ROTULO_TIPO_SUBPROCESSO[sub.tipo]}: ${progresso.concluidas} de ${progresso.aplicaveis} etapas`}
                          />
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                            {progresso.concluidas}/{progresso.aplicaveis}
                          </span>
                        </div>
                      )}
                      {sub.proximaAcao && sub.responsavelProximaAcao === 'cliente' && (
                        <Badge tom="destaque" tamanho="sm" className="mt-2">
                          Depende de você
                        </Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </Entrada>

        {/* Avisos */}
        <Entrada atraso={0.2} className="lg:col-span-5">
          <Card className="h-full overflow-hidden">
            <CardBarra
              titulo="Avisos recentes"
              acoes={
                <Button variante="fantasma" tamanho="sm" asChild className="-mr-2">
                  <Link to="/portal/notificacoes">Ver todos</Link>
                </Button>
              }
            />
            {avisos.isLoading ? (
              <EstadoCarregando rotulo="Carregando avisos" />
            ) : (avisos.data ?? []).length === 0 ? (
              <EstadoVazio icone={Bell} titulo="Nenhum aviso" compacto />
            ) : (
              <ul className="divide-y divide-border">
                {(avisos.data ?? []).slice(0, 4).map((aviso) => (
                  <li key={aviso.id} className="flex gap-3 px-4 py-3 sm:px-5">
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', aviso.lida ? 'bg-border-strong' : 'bg-accent')}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">
                        {aviso.titulo}
                        {!aviso.lida && <span className="sr-only"> (não lido)</span>}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{aviso.mensagem}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatarTempoRelativo(aviso.criadoEm)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Entrada>
      </div>

      <Alert tom="info" className="mt-4">
        <strong className="font-bold">Dúvidas?</strong> Fale com a equipe Alcance pelos canais de
        atendimento. Esta área mostra apenas as informações liberadas para você.
      </Alert>
    </EntradaPagina>
  )
}
