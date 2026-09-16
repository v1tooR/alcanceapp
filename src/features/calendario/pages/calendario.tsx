import * as React from 'react'
import { Link } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatISO,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { ResumoDoMes } from '@/features/calendario/components/resumo-mes'
import { Campo, GrupoCampos } from '@/components/shared/campo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBarra } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { formatarHora } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import { ROTULO_TIPO_EVENTO, TOM_TIPO_EVENTO, paraOpcoes } from '@/lib/rotulos'
import { capitalizarPrimeira, cn } from '@/lib/utils'
import { esquemaEvento, type DadosEvento } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { EventoListado } from '@/services/contratos'
import type { TipoEvento } from '@/types/domain'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function Calendario() {
  const [mesReferencia, setMesReferencia] = React.useState(() => startOfMonth(new Date()))
  const [diaSelecionado, setDiaSelecionado] = React.useState<Date>(() => new Date())
  const [criando, setCriando] = React.useState(false)
  const [tipo, setTipo] = React.useState<TipoEvento | 'todos'>('todos')

  const inicioGrade = startOfWeek(mesReferencia, { locale: ptBR })
  const fimGrade = endOfWeek(endOfMonth(mesReferencia), { locale: ptBR })
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade })

  const consulta = useQuery({
    queryKey: chaves.calendario.lista({
      de: formatISO(inicioGrade, { representation: 'date' }),
      ate: formatISO(fimGrade, { representation: 'date' }),
      tipo,
    }),
    queryFn: () =>
      servicos.calendario.listar({
        de: formatISO(inicioGrade, { representation: 'date' }),
        ate: formatISO(fimGrade, { representation: 'date' }),
        tipo,
      }),
  })

  const eventos = consulta.data ?? []

  // Os totais ficam acima do filtro de tipo, então contam todos os compromissos.
  // Com o filtro em "todos", a chave é a mesma da consulta acima: sem nova requisição.
  const todosDoPeriodo = useQuery({
    queryKey: chaves.calendario.lista({
      de: formatISO(inicioGrade, { representation: 'date' }),
      ate: formatISO(fimGrade, { representation: 'date' }),
      tipo: 'todos',
    }),
    queryFn: () =>
      servicos.calendario.listar({
        de: formatISO(inicioGrade, { representation: 'date' }),
        ate: formatISO(fimGrade, { representation: 'date' }),
        tipo: 'todos',
      }),
  })

  const eventosPorDia = React.useMemo(() => {
    const mapa = new Map<string, EventoListado[]>()
    eventos.forEach((evento) => {
      const lista = mapa.get(evento.data) ?? []
      lista.push(evento)
      mapa.set(evento.data, lista)
    })
    return mapa
  }, [eventos])

  const eventosDoDia = eventosPorDia.get(formatISO(diaSelecionado, { representation: 'date' })) ?? []

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Agenda"
        titulo="Calendário"
        descricao="Compromissos, prazos e retornos vinculados a clientes e processos."
        acoes={
          <Button onClick={() => setCriando(true)}>
            <CalendarPlus aria-hidden="true" />
            Novo evento
          </Button>
        }
      />

      <ResumoDoMes
        eventos={todosDoPeriodo.data ?? []}
        mes={mesReferencia}
        carregando={todosDoPeriodo.isLoading}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="overflow-hidden">
          {/* Controles do mês */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-center gap-1.5">
              <Button
                variante="contorno"
                tamanho="iconeSm"
                onClick={() => setMesReferencia((atual) => subMonths(atual, 1))}
              >
                <ChevronLeft aria-hidden="true" />
                <span className="sr-only">Mês anterior</span>
              </Button>
              <p className="min-w-40 text-center text-sm font-bold" aria-live="polite">
                {capitalizarPrimeira(format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR }))}
              </p>
              <Button
                variante="contorno"
                tamanho="iconeSm"
                onClick={() => setMesReferencia((atual) => addMonths(atual, 1))}
              >
                <ChevronRight aria-hidden="true" />
                <span className="sr-only">Próximo mês</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variante="fantasma"
                tamanho="sm"
                onClick={() => {
                  const hoje = new Date()
                  setMesReferencia(startOfMonth(hoje))
                  setDiaSelecionado(hoje)
                }}
              >
                Hoje
              </Button>
              <Select value={tipo} onValueChange={(valor) => setTipo(valor as TipoEvento | 'todos')}>
                <SelectTrigger tamanho="sm" className="w-36" aria-label="Filtrar por tipo de evento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo tipo</SelectItem>
                  {paraOpcoes(ROTULO_TIPO_EVENTO).map((opcao) => (
                    <SelectItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {consulta.isLoading ? (
            <EstadoCarregando rotulo="Carregando eventos" />
          ) : consulta.isError ? (
            <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
          ) : (
            <div className="p-2 sm:p-3">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((dia) => (
                  <div
                    key={dia}
                    className="pb-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    <span aria-hidden="true">{dia}</span>
                  </div>
                ))}
              </div>

              {/* Grade do mês */}
              <div className="grid grid-cols-7 gap-1">
                {dias.map((dia) => {
                  const chave = formatISO(dia, { representation: 'date' })
                  const doDia = eventosPorDia.get(chave) ?? []
                  const foraDoMes = !isSameMonth(dia, mesReferencia)
                  const selecionado = isSameDay(dia, diaSelecionado)

                  return (
                    <button
                      key={chave}
                      type="button"
                      onClick={() => setDiaSelecionado(dia)}
                      aria-pressed={selecionado}
                      aria-label={`${format(dia, "d 'de' MMMM", { locale: ptBR })}, ${doDia.length} evento(s)`}
                      className={cn(
                        'flex min-h-16 flex-col items-start gap-1 rounded-sm border p-1.5 text-left transition-colors sm:min-h-24',
                        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selecionado
                          ? 'border-primary bg-primary-soft/60'
                          : 'border-transparent hover:bg-muted/60',
                        foraDoMes && 'opacity-40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                          isToday(dia) && 'bg-accent text-accent-foreground',
                        )}
                      >
                        {format(dia, 'd')}
                      </span>

                      <span className="flex w-full flex-col gap-0.5">
                        {doDia.slice(0, 2).map((evento) => (
                          <span
                            key={evento.id}
                            className="hidden truncate rounded-xs bg-surface px-1 py-0.5 text-[10px] font-medium leading-tight sm:block"
                          >
                            {evento.hora && (
                              <span className="tabular-nums">{formatarHora(evento.hora)} </span>
                            )}
                            {evento.titulo}
                          </span>
                        ))}
                        {doDia.length > 0 && (
                          <span className="flex gap-0.5 sm:hidden">
                            {doDia.slice(0, 3).map((evento) => (
                              <span
                                key={evento.id}
                                className="size-1.5 rounded-full bg-primary"
                                aria-hidden="true"
                              />
                            ))}
                          </span>
                        )}
                        {doDia.length > 2 && (
                          <span className="hidden text-[10px] text-muted-foreground sm:block">
                            +{doDia.length - 2}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Agenda do dia */}
        <Card className="overflow-hidden lg:sticky lg:top-20 lg:self-start">
          <CardBarra
            titulo={format(diaSelecionado, "d 'de' MMMM", { locale: ptBR })}
            descricao={`${eventosDoDia.length} evento${eventosDoDia.length === 1 ? '' : 's'}`}
          />

          {eventosDoDia.length === 0 ? (
            <EstadoVazio
              icone={CalendarDays}
              titulo="Nenhum evento"
              descricao="Não há compromissos registrados para este dia."
              compacto
            />
          ) : (
            <ul className="divide-y divide-border">
              {eventosDoDia.map((evento) => (
                <li key={evento.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {evento.hora && (
                      <span className="text-sm font-bold tabular-nums">
                        {formatarHora(evento.hora)}
                      </span>
                    )}
                    <Badge tom={TOM_TIPO_EVENTO[evento.tipo]} tamanho="sm">
                      {ROTULO_TIPO_EVENTO[evento.tipo]}
                    </Badge>
                    {evento.visibilidade === 'cliente' && (
                      <Badge tom="contorno" tamanho="sm">
                        Visível ao cliente
                      </Badge>
                    )}
                  </div>

                  <p className="mt-1 font-semibold leading-snug">{evento.titulo}</p>

                  {evento.descricao && (
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {evento.descricao}
                    </p>
                  )}

                  <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    {evento.clienteNome && <p className="truncate">{evento.clienteNome}</p>}
                    {evento.processoCodigo && evento.processoId && (
                      <p>
                        <Link
                          to={`/app/processos/${evento.processoId}`}
                          className="rounded-xs font-medium hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {evento.processoCodigo}
                        </Link>
                      </p>
                    )}
                    {evento.local && (
                      <p className="flex items-center gap-1">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        {evento.local}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DialogoEvento
        aberto={criando}
        aoFechar={() => setCriando(false)}
        dataPadrao={formatISO(diaSelecionado, { representation: 'date' })}
      />
    </EntradaPagina>
  )
}

function DialogoEvento({
  aberto,
  aoFechar,
  dataPadrao,
}: {
  aberto: boolean
  aoFechar: () => void
  dataPadrao: string
}) {
  const clienteConsulta = useQueryClient()

  const clientes = useQuery({
    queryKey: chaves.clientes.opcoes(),
    queryFn: () => servicos.clientes.opcoes(),
    enabled: aberto,
  })

  const equipe = useQuery({
    queryKey: chaves.usuarios.equipe(),
    queryFn: () => servicos.usuarios.listarEquipe(),
    enabled: aberto,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DadosEvento>({
    resolver: zodResolver(esquemaEvento),
    defaultValues: {
      titulo: '',
      descricao: '',
      data: dataPadrao,
      hora: '',
      tipo: 'reuniao',
      visibilidade: 'interno',
      clienteId: '',
      processoId: '',
      responsavelId: '',
      local: '',
    },
  })

  React.useEffect(() => {
    if (aberto) reset({ data: dataPadrao, tipo: 'reuniao', visibilidade: 'interno', titulo: '' })
  }, [aberto, dataPadrao, reset])

  const criar = useMutation({
    mutationFn: (dados: DadosEvento) =>
      servicos.calendario.criar({
        titulo: dados.titulo,
        descricao: dados.descricao || undefined,
        data: dados.data,
        hora: dados.hora || undefined,
        tipo: dados.tipo,
        visibilidade: dados.visibilidade,
        clienteId: dados.clienteId || undefined,
        responsavelId: dados.responsavelId || undefined,
        local: dados.local || undefined,
      }),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.calendario.todos })
      toast.success('Evento criado')
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && aoFechar()}>
      <DialogContent>
        <form onSubmit={handleSubmit((dados) => criar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>Novo evento</DialogTitle>
            <DialogDescription>
              Eventos marcados como visíveis aparecem na agenda do cliente.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="py-3">
            <GrupoCampos titulo="Evento">
              <Campo rotulo="Título" erro={errors.titulo?.message} obrigatorio>
                {(campo) => <Input {...campo} {...register('titulo')} autoFocus />}
              </Campo>

              <div className="grid gap-4 sm:grid-cols-3">
                <Campo rotulo="Data" erro={errors.data?.message} obrigatorio>
                  {(campo) => <Input {...campo} {...register('data')} type="date" />}
                </Campo>

                <Campo rotulo="Hora" erro={errors.hora?.message}>
                  {(campo) => <Input {...campo} {...register('hora')} type="time" />}
                </Campo>

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
                            {paraOpcoes(ROTULO_TIPO_EVENTO).map((opcao) => (
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="Cliente">
                  {(campo) => (
                    <Controller
                      control={control}
                      name="clienteId"
                      render={({ field }) => (
                        <Select
                          value={field.value || 'nenhum'}
                          onValueChange={(valor) => field.onChange(valor === 'nenhum' ? '' : valor)}
                        >
                          <SelectTrigger id={campo.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nenhum">Sem cliente</SelectItem>
                            {clientes.data?.map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nome}
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
              </div>

              <Campo rotulo="Local" erro={errors.local?.message}>
                {(campo) => <Input {...campo} {...register('local')} />}
              </Campo>

              <Campo rotulo="Descrição" erro={errors.descricao?.message}>
                {(campo) => <Textarea {...campo} {...register('descricao')} rows={2} />}
              </Campo>

              <Campo rotulo="Visibilidade" obrigatorio>
                {(campo) => (
                  <Controller
                    control={control}
                    name="visibilidade"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={campo.id}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interno">Somente a equipe</SelectItem>
                          <SelectItem value="cliente">Visível ao cliente</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Campo>
            </GrupoCampos>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Criando">
              <CalendarPlus aria-hidden="true" />
              Criar evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
