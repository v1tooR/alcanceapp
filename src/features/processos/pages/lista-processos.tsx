import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlarmClock, FileWarning, FolderKanban, Gauge, Plus, X } from 'lucide-react'
import { Estatistica } from '@/components/graficos/estatistica'
import { BarraEmpilhada, Medidor } from '@/components/graficos/marcas'
import { Skeleton } from '@/components/ui/skeleton'
import { COR_STATUS_PROCESSO_ATIVO, type StatusProcessoAtivo } from '@/lib/cores-graficos'
import { cn } from '@/lib/utils'
import type { ResumoProcessos } from '@/services/contratos'
import { PageHeader } from '@/components/shared/page-header'
import { CampoBusca } from '@/components/shared/busca'
import { Paginacao } from '@/components/shared/paginacao'
import { EntradaPagina } from '@/components/shared/animacao'
import { PrioridadeBadge, StatusProcessoBadge, TipoSubprocessoBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckboxCampo } from '@/components/ui/checkbox'
import { EstadoCarregando, EstadoErro, EstadoSemResultado, EstadoVazio } from '@/components/ui/estados'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { formatarTempoRelativo } from '@/lib/formato'
import {
  ROTULO_PRIORIDADE,
  ROTULO_STATUS_PROCESSO,
  ROTULO_TIPO_SUBPROCESSO,
  paraOpcoes,
} from '@/lib/rotulos'
import { ORDEM_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { FiltrosProcessos } from '@/services/contratos'
import type { Prioridade, StatusProcesso, TipoSubprocesso } from '@/types/domain'

const TAMANHO_PADRAO = 25

export default function ListaProcessos() {
  const [parametros, setParametros] = useSearchParams()

  const filtros: FiltrosProcessos = React.useMemo(
    () => ({
      termo: parametros.get('busca') ?? '',
      status: (parametros.get('status') as StatusProcesso | 'todos') ?? 'todos',
      prioridade: (parametros.get('prioridade') as Prioridade | 'todos') ?? 'todos',
      responsavelId: parametros.get('responsavel') ?? 'todos',
      tipoSubprocesso: (parametros.get('subprocesso') as TipoSubprocesso | 'todos') ?? 'todos',
      somenteComPendencia: parametros.get('pendencia') === '1',
      somentePrazoVencido: parametros.get('prazo') === 'vencido',
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

  const equipe = useQuery({
    queryKey: chaves.usuarios.equipe(),
    queryFn: () => servicos.usuarios.listarEquipe(),
  })

  const resumo = useQuery({
    queryKey: chaves.processos.resumo(),
    queryFn: () => servicos.processos.resumo(),
  })

  const consulta = useQuery({
    queryKey: chaves.processos.lista(filtros),
    queryFn: () => servicos.processos.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const temFiltro =
    Boolean(filtros.termo) ||
    filtros.status !== 'todos' ||
    filtros.prioridade !== 'todos' ||
    filtros.responsavelId !== 'todos' ||
    filtros.tipoSubprocesso !== 'todos' ||
    filtros.somenteComPendencia === true ||
    filtros.somentePrazoVencido === true

  const controlesFiltro = (
    <>
      <Select value={filtros.status} onValueChange={(valor) => definir('status', valor)}>
        <SelectTrigger aria-label="Filtrar por status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todo status</SelectItem>
          {paraOpcoes(ROTULO_STATUS_PROCESSO).map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value}>
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.prioridade} onValueChange={(valor) => definir('prioridade', valor)}>
        <SelectTrigger aria-label="Filtrar por prioridade">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Toda prioridade</SelectItem>
          {paraOpcoes(ROTULO_PRIORIDADE).map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value}>
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.tipoSubprocesso} onValueChange={(valor) => definir('subprocesso', valor)}>
        <SelectTrigger aria-label="Filtrar por subprocesso">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todo subprocesso</SelectItem>
          {ORDEM_SUBPROCESSOS.map((tipo) => (
            <SelectItem key={tipo} value={tipo}>
              {ROTULO_TIPO_SUBPROCESSO[tipo]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.responsavelId} onValueChange={(valor) => definir('responsavel', valor)}>
        <SelectTrigger aria-label="Filtrar por responsável">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todo responsável</SelectItem>
          {equipe.data?.map((usuario) => (
            <SelectItem key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Operação"
        titulo="Processos"
        descricao="Acompanhamento dos atendimentos e dos subprocessos em andamento."
        acoes={
          <Button asChild>
            <Link to="/app/processos/novo">
              <Plus aria-hidden="true" />
              Novo processo
            </Link>
          </Button>
        }
      />

      <ResumoDosProcessos
        resumo={resumo.data}
        carregando={resumo.isLoading}
        statusSelecionado={filtros.status ?? 'todos'}
        aoFiltrarStatus={(status) => definir('status', status)}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <CampoBusca
              rotulo="Buscar processos por código, título ou cliente"
              placeholder="Buscar por código, título ou cliente…"
              valor={filtros.termo ?? ''}
              aoMudar={(valor) => definir('busca', valor)}
              className="lg:max-w-md lg:flex-1"
            />

            {/* Filtros: em linha no desktop, em painel no celular */}
            <div className="hidden gap-2 lg:grid lg:grid-cols-4 lg:flex-1">{controlesFiltro}</div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variante="contorno" className="lg:hidden">
                  Filtros
                  {temFiltro && (
                    <Badge tom="primario" tamanho="sm">
                      ativos
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <SheetBody className="space-y-3">{controlesFiltro}</SheetBody>
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-3">
            <CheckboxCampo
              id="somente-pendencia"
              rotulo="Somente processos que precisam de atenção"
              descricao="Com documento pendente do cliente ou prazo vencido."
              checked={filtros.somenteComPendencia === true}
              onCheckedChange={(marcada) => definir('pendencia', marcada ? '1' : '0')}
            />
            {filtros.somentePrazoVencido && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tom="perigo">
                  <AlarmClock aria-hidden="true" />
                  Somente com prazo final vencido
                </Badge>
                <Button variante="fantasma" tamanho="sm" onClick={() => definir('prazo', '')}>
                  <X aria-hidden="true" />
                  Remover filtro
                </Button>
              </div>
            )}
          </div>
        </div>

        {consulta.isLoading ? (
          <EstadoCarregando rotulo="Carregando processos" />
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
              icone={FolderKanban}
              titulo="Nenhum processo aberto"
              descricao="Cadastre o cliente e abra o primeiro processo com os subprocessos aplicáveis."
              acao={
                <Button asChild>
                  <Link to="/app/processos/novo">
                    <Plus aria-hidden="true" />
                    Novo processo
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-border">
              {consulta.data?.itens.map((processo) => (
                <li key={processo.id}>
                  <Link
                    to={`/app/processos/${processo.id}`}
                    className="block px-4 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{processo.titulo}</p>
                          <PrioridadeBadge prioridade={processo.prioridade} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {processo.codigo} · {processo.clienteNome}
                          {processo.responsavelNome && <> · {processo.responsavelNome}</>}
                        </p>
                      </div>
                      <StatusProcessoBadge status={processo.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {processo.tiposSubprocesso.slice(0, 5).map((tipo) => (
                        <TipoSubprocessoBadge key={tipo} tipo={tipo} />
                      ))}
                      {processo.tiposSubprocesso.length > 5 && (
                        <Badge tom="contorno" tamanho="sm">
                          +{processo.tiposSubprocesso.length - 5}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex min-w-40 flex-1 items-center gap-2 sm:max-w-64">
                        <Progress
                          valor={processo.progresso}
                          rotulo={`Progresso do processo ${processo.codigo}`}
                        />
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                          {processo.progresso}%
                        </span>
                      </div>

                      {processo.documentosPendentes > 0 && (
                        <Badge tom="alerta" tamanho="sm">
                          <FileWarning aria-hidden="true" />
                          {processo.documentosPendentes} documento
                          {processo.documentosPendentes > 1 ? 's' : ''} pendente
                          {processo.documentosPendentes > 1 ? 's' : ''}
                        </Badge>
                      )}

                      {processo.prazoFinal && <Prazo data={processo.prazoFinal} />}

                      <span className="ml-auto text-[11px] text-muted-foreground">
                        Atualizado {formatarTempoRelativo(processo.atualizadoEm)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Paginacao
              pagina={filtros.pagina ?? 1}
              tamanhoPagina={filtros.tamanhoPagina ?? TAMANHO_PADRAO}
              total={consulta.data?.total ?? 0}
              rotuloItens="processos"
              aoMudarPagina={(pagina) => definir('pagina', String(pagina))}
              aoMudarTamanho={(tamanho) => definir('tamanho', String(tamanho))}
            />
          </>
        )}
      </Card>
    </EntradaPagina>
  )
}

const STATUS_ATIVOS: StatusProcessoAtivo[] = [
  'em_andamento',
  'aguardando_cliente',
  'aguardando_orgao',
  'em_avaliacao',
]

/**
 * Resumo interativo: a barra mostra onde estão os processos ativos, e cada
 * situação da legenda filtra a lista abaixo.
 */
function ResumoDosProcessos({
  resumo,
  carregando,
  statusSelecionado,
  aoFiltrarStatus,
}: {
  resumo?: ResumoProcessos
  carregando: boolean
  statusSelecionado: string
  aoFiltrarStatus: (status: string) => void
}) {
  const totalDe = (status: string) => resumo?.porStatus.find((item) => item.status === status)?.total ?? 0
  const ativos = STATUS_ATIVOS.map((status) => ({ status, total: totalDe(status) }))
  const totalAtivos = ativos.reduce((soma, item) => soma + item.total, 0)
  const vencidos = resumo?.comPrazoVencido ?? 0

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <section
        aria-labelledby="titulo-situacao-processos"
        className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5 md:col-span-2"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 id="titulo-situacao-processos" className="text-[0.98rem] font-bold tracking-[-0.02em]">
              Situação dos processos ativos
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Toque numa situação para filtrar a lista.</p>
          </div>
          {!carregando && (
            <p className="flex items-baseline gap-1.5">
              <span className="alc-numero text-[1.9rem]">{totalAtivos}</span>
              <span className="text-xs text-muted-foreground">ativos · {totalDe('concluido')} concluídos</span>
            </p>
          )}
        </div>

        {carregando ? (
          <Skeleton className="mt-4 h-16 w-full" />
        ) : (
          <>
            <div className="mt-4">
              <BarraEmpilhada
                rotulo={`${totalAtivos} processos ativos por situação`}
                espessura="h-5"
                segmentos={ativos.map((item) => ({
                  chave: item.status,
                  rotulo: ROTULO_STATUS_PROCESSO[item.status],
                  valor: item.total,
                  cor: COR_STATUS_PROCESSO_ATIVO[item.status],
                }))}
              />
            </div>
            <ul className="mt-3.5 flex flex-wrap gap-2">
              {ativos.map((item) => {
                const selecionado = statusSelecionado === item.status
                return (
                  <li key={item.status}>
                    <button
                      type="button"
                      aria-pressed={selecionado}
                      onClick={() => aoFiltrarStatus(selecionado ? 'todos' : item.status)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-2 rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selecionado
                          ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      <span
                        className="size-2 rounded-[3px]"
                        style={{ background: COR_STATUS_PROCESSO_ATIVO[item.status] }}
                        aria-hidden="true"
                      />
                      {ROTULO_STATUS_PROCESSO[item.status]}
                      <span className="font-bold tabular-nums">{item.total}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <Estatistica
        rotulo="Prazo final vencido"
        valor={vencidos}
        icone={AlarmClock}
        tom={vencidos > 0 ? 'perigo' : 'sucesso'}
        carregando={carregando}
        descricao="Processos ativos com o prazo final ultrapassado"
        para="/app/processos?prazo=vencido"
      />

      <Estatistica
        rotulo="Andamento médio"
        valor={`${resumo?.progressoMedio ?? 0}%`}
        icone={Gauge}
        carregando={carregando}
        descricao="Etapas concluídas nos processos ativos"
      >
        <Medidor
          valor={resumo?.progressoMedio ?? 0}
          maximo={100}
          rotulo="Andamento médio dos processos ativos"
        />
      </Estatistica>
    </div>
  )
}
