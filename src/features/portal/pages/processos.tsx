import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FolderKanban } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Entrada, EntradaPagina } from '@/components/shared/animacao'
import { BarraSimples, Medidor } from '@/components/graficos/marcas'
import { StatusProcessoBadge, StatusSubprocessoBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { formatarData } from '@/lib/formato'
import { ROTULO_TIPO_SUBPROCESSO } from '@/lib/rotulos'
import { progressoSubprocesso } from '@/lib/workflow'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'

export default function PortalProcessos() {
  const clienteId = usarSessao((estado) => estado.usuario?.clienteId) ?? ''

  const consulta = useQuery({
    queryKey: chaves.portal.visaoGeral(clienteId),
    queryFn: () => servicos.portal.visaoGeral(clienteId),
    enabled: Boolean(clienteId),
  })

  if (consulta.isLoading) return <EstadoCarregando rotulo="Carregando seus processos" />
  if (consulta.isError || !consulta.data) {
    return <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
  }

  const processos = consulta.data.processos

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Acompanhamento"
        titulo="Meus processos"
        descricao="Cada processo reúne os serviços que a equipe está conduzindo para você."
      />

      {processos.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={FolderKanban}
            titulo="Nenhum processo aberto"
            descricao="Assim que a equipe abrir o seu processo, ele aparece aqui com todas as etapas."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {processos.map((processo, indice) => {
            const servicosAtivos = processo.subprocessos.filter((sub) => sub.status !== 'nao_aplicavel')
            return (
              <Entrada key={processo.id} atraso={indice * 0.05}>
                <Card className="overflow-hidden">
                  <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusProcessoBadge status={processo.status} />
                        <span className="text-xs text-muted-foreground">
                          {processo.codigo} · aberto em {formatarData(processo.abertoEm)}
                        </span>
                      </div>
                      <h2 className="alc-titulo-display mt-3 text-[1.5rem]">{processo.titulo}</h2>
                      {processo.resumoPublico && (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                          {processo.resumoPublico}
                        </p>
                      )}
                    </div>

                    {/* Andamento em destaque */}
                    <div className="flex flex-col justify-center rounded-lg bg-surface-muted p-4">
                      <p className="alc-numero text-[2.5rem]">{processo.progresso}%</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">concluído</p>
                      <Medidor
                        valor={processo.progresso}
                        maximo={100}
                        tom={processo.progresso === 100 ? 'sucesso' : 'primario'}
                        rotulo={`Andamento do processo ${processo.codigo}`}
                        className="mt-3"
                      />
                      {processo.prazoFinal && (
                        <div className="mt-3">
                          <Prazo data={processo.prazoFinal} />
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="grid gap-px border-t border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
                    {servicosAtivos.map((sub) => {
                      const etapas = progressoSubprocesso(sub.etapas)
                      return (
                        <li key={sub.id} className="bg-card px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{ROTULO_TIPO_SUBPROCESSO[sub.tipo]}</p>
                            <StatusSubprocessoBadge status={sub.status} />
                          </div>
                          {etapas.aplicaveis > 0 && (
                            <div className="mt-2.5 flex items-center gap-3">
                              <BarraSimples
                                valor={etapas.concluidas}
                                maximo={etapas.aplicaveis}
                                rotulo={`${ROTULO_TIPO_SUBPROCESSO[sub.tipo]}: ${etapas.concluidas} de ${etapas.aplicaveis} etapas`}
                              />
                              <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                                {etapas.concluidas}/{etapas.aplicaveis}
                              </span>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  <div className="border-t border-border p-4 sm:px-6">
                    <Button asChild>
                      <Link to={`/portal/processos/${processo.id}`}>
                        Ver etapas e histórico
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              </Entrada>
            )
          })}
        </div>
      )}
    </EntradaPagina>
  )
}
