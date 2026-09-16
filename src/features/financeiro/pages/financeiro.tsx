import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Banknote, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { CampoBusca } from '@/components/shared/busca'
import { Paginacao } from '@/components/shared/paginacao'
import { EntradaPagina } from '@/components/shared/animacao'
import { Campo, GrupoCampos } from '@/components/shared/campo'
import { PainelFinanceiro } from '@/features/financeiro/components/painel-financeiro'
import { InputMoeda } from '@/components/shared/campos-mascarados'
import { StatusFinanceiroBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { formatarMoeda } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_FINANCEIRO, paraOpcoes } from '@/lib/rotulos'
import { esquemaFinanceiro, type DadosFinanceiro } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { FiltrosFinanceiro, RegistroFinanceiroListado } from '@/services/contratos'
import type { StatusFinanceiro } from '@/types/domain'

const TAMANHO_PADRAO = 25

export default function Financeiro() {
  const [parametros, setParametros] = useSearchParams()
  const [emEdicao, setEmEdicao] = React.useState<RegistroFinanceiroListado | null>(null)
  const [criando, setCriando] = React.useState(false)

  const filtros: FiltrosFinanceiro = React.useMemo(
    () => ({
      termo: parametros.get('busca') ?? '',
      status: (parametros.get('status') as StatusFinanceiro | 'todos') ?? 'todos',
      pagina: Number(parametros.get('pagina') ?? 1),
      tamanhoPagina: Number(parametros.get('tamanho') ?? TAMANHO_PADRAO),
    }),
    [parametros],
  )

  function definir(chave: string, valor: string) {
    setParametros((atuais) => {
      const proximos = new URLSearchParams(atuais)
      if (!valor || valor === 'todos') proximos.delete(chave)
      else proximos.set(chave, valor)
      if (chave !== 'pagina') proximos.delete('pagina')
      return proximos
    })
  }

  const resumo = useQuery({
    queryKey: chaves.financeiro.resumo(),
    queryFn: () => servicos.financeiro.resumo(),
  })

  const consulta = useQuery({
    queryKey: chaves.financeiro.lista(filtros),
    queryFn: () => servicos.financeiro.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const temFiltro = Boolean(filtros.termo) || filtros.status !== 'todos'

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Gestão"
        titulo="Financeiro"
        descricao="Registro informativo dos valores combinados com cada cliente."
        acoes={
          <Button onClick={() => setCriando(true)}>
            <Plus aria-hidden="true" />
            Novo registro
          </Button>
        }
      />

      <Alert tom="info" className="mb-4" titulo="Módulo informativo">
        Estes campos servem apenas para consulta interna. Não emitem cobranças, boletos ou notas, e
        não substituem um sistema fiscal ou contábil.
      </Alert>

      <PainelFinanceiro
        resumo={resumo.data}
        carregando={resumo.isLoading}
        erro={resumo.isError}
        aoTentarNovamente={() => void resumo.refetch()}
        statusSelecionado={filtros.status ?? 'todos'}
        aoFiltrarStatus={(status) => definir('status', status)}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <CampoBusca
            rotulo="Buscar registros por descrição, cliente ou processo"
            placeholder="Buscar por descrição, cliente ou processo…"
            valor={filtros.termo ?? ''}
            aoMudar={(valor) => definir('busca', valor)}
            className="lg:max-w-md lg:flex-1"
          />

          <Select value={filtros.status} onValueChange={(valor) => definir('status', valor)}>
            <SelectTrigger className="lg:w-48" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo status</SelectItem>
              {paraOpcoes(ROTULO_STATUS_FINANCEIRO).map((opcao) => (
                <SelectItem key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {consulta.isLoading ? (
          <EstadoCarregando rotulo="Carregando registros" />
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
              icone={Banknote}
              titulo="Nenhum registro financeiro"
              descricao="Cadastre os valores combinados para acompanhar o que está em aberto."
              acao={
                <Button onClick={() => setCriando(true)}>
                  <Plus aria-hidden="true" />
                  Novo registro
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-border">
              {consulta.data?.itens.map((registro) => {
                const liquido = registro.valorTotal - registro.desconto
                return (
                  <li key={registro.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold leading-snug">{registro.descricao}</p>
                        <StatusFinanceiroBadge status={registro.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {registro.clienteNome}
                        {registro.processoCodigo && <> · {registro.processoCodigo}</>}
                        {registro.formaPagamento && (
                          <> · {ROTULO_FORMA_PAGAMENTO[registro.formaPagamento]}</>
                        )}
                      </p>
                      {registro.vencimento && registro.status !== 'pago' && (
                        <div className="mt-1.5">
                          <Prazo data={registro.vencimento} />
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-bold tabular-nums">{formatarMoeda(liquido)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        pago {formatarMoeda(registro.valorPago)}
                      </p>
                    </div>

                    <Button
                      variante="contorno"
                      tamanho="iconeSm"
                      onClick={() => setEmEdicao(registro)}
                    >
                      <Pencil aria-hidden="true" />
                      <span className="sr-only">Editar registro {registro.descricao}</span>
                    </Button>
                  </li>
                )
              })}
            </ul>

            <Paginacao
              pagina={filtros.pagina ?? 1}
              tamanhoPagina={filtros.tamanhoPagina ?? TAMANHO_PADRAO}
              total={consulta.data?.total ?? 0}
              rotuloItens="registros"
              aoMudarPagina={(pagina) => definir('pagina', String(pagina))}
              aoMudarTamanho={(tamanho) => definir('tamanho', String(tamanho))}
            />
          </>
        )}
      </Card>

      <DialogoRegistro
        aberto={criando || emEdicao !== null}
        registro={emEdicao}
        aoFechar={() => {
          setCriando(false)
          setEmEdicao(null)
        }}
      />
    </EntradaPagina>
  )
}

function DialogoRegistro({
  aberto,
  registro,
  aoFechar,
}: {
  aberto: boolean
  registro: RegistroFinanceiroListado | null
  aoFechar: () => void
}) {
  const clienteConsulta = useQueryClient()

  const clientes = useQuery({
    queryKey: chaves.clientes.opcoes(),
    queryFn: () => servicos.clientes.opcoes(),
    enabled: aberto,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DadosFinanceiro>({
    resolver: zodResolver(esquemaFinanceiro),
    defaultValues: {
      clienteId: '',
      descricao: 'Honorários de assessoria',
      valorTotal: 0,
      desconto: 0,
      valorPago: 0,
      status: 'pendente',
      vencimento: '',
      pagoEm: '',
      observacoes: '',
    },
  })

  React.useEffect(() => {
    if (!aberto) return
    reset(
      registro
        ? {
            clienteId: registro.clienteId,
            processoId: registro.processoId ?? '',
            descricao: registro.descricao,
            valorTotal: registro.valorTotal,
            desconto: registro.desconto,
            valorPago: registro.valorPago,
            status: registro.status,
            formaPagamento: registro.formaPagamento,
            vencimento: registro.vencimento ?? '',
            pagoEm: registro.pagoEm ?? '',
            observacoes: registro.observacoes ?? '',
          }
        : {
            clienteId: '',
            descricao: 'Honorários de assessoria',
            valorTotal: 0,
            desconto: 0,
            valorPago: 0,
            status: 'pendente',
            vencimento: '',
            pagoEm: '',
            observacoes: '',
          },
    )
  }, [aberto, registro, reset])

  const salvar = useMutation({
    mutationFn: (dados: DadosFinanceiro) => {
      const payload = {
        clienteId: dados.clienteId,
        processoId: dados.processoId || undefined,
        descricao: dados.descricao,
        valorTotal: dados.valorTotal,
        desconto: dados.desconto,
        valorPago: dados.valorPago,
        status: dados.status,
        formaPagamento: dados.formaPagamento,
        vencimento: dados.vencimento || undefined,
        pagoEm: dados.pagoEm || undefined,
        observacoes: dados.observacoes || undefined,
      }
      return registro
        ? servicos.financeiro.atualizar(registro.id, payload)
        : servicos.financeiro.criar(payload)
    },
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.financeiro.todos })
      void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
      toast.success(registro ? 'Registro atualizado' : 'Registro criado')
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && aoFechar()}>
      <DialogContent>
        <form onSubmit={handleSubmit((dados) => salvar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>{registro ? 'Editar registro' : 'Novo registro financeiro'}</DialogTitle>
            <DialogDescription>
              Informação interna de acompanhamento. Não gera cobrança.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="py-3">
            <GrupoCampos titulo="Valores">
              <Campo rotulo="Cliente" erro={errors.clienteId?.message} obrigatorio>
                {(campo) => (
                  <Controller
                    control={control}
                    name="clienteId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(registro)}>
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

              <Campo rotulo="Descrição" erro={errors.descricao?.message} obrigatorio>
                {(campo) => <Input {...campo} {...register('descricao')} />}
              </Campo>

              <div className="grid gap-4 sm:grid-cols-3">
                <Campo rotulo="Valor total" erro={errors.valorTotal?.message} obrigatorio>
                  {(campo) => (
                    <Controller
                      control={control}
                      name="valorTotal"
                      render={({ field }) => (
                        <InputMoeda {...campo} value={field.value} onChange={field.onChange} />
                      )}
                    />
                  )}
                </Campo>

                <Campo rotulo="Desconto" erro={errors.desconto?.message}>
                  {(campo) => (
                    <Controller
                      control={control}
                      name="desconto"
                      render={({ field }) => (
                        <InputMoeda {...campo} value={field.value} onChange={field.onChange} />
                      )}
                    />
                  )}
                </Campo>

                <Campo rotulo="Valor pago" erro={errors.valorPago?.message}>
                  {(campo) => (
                    <Controller
                      control={control}
                      name="valorPago"
                      render={({ field }) => (
                        <InputMoeda {...campo} value={field.value} onChange={field.onChange} />
                      )}
                    />
                  )}
                </Campo>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="Status" obrigatorio>
                  {(campo) => (
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id={campo.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paraOpcoes(ROTULO_STATUS_FINANCEIRO).map((opcao) => (
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

                <Campo rotulo="Forma de pagamento">
                  {(campo) => (
                    <Controller
                      control={control}
                      name="formaPagamento"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? 'nenhum'}
                          onValueChange={(valor) =>
                            field.onChange(valor === 'nenhum' ? undefined : valor)
                          }
                        >
                          <SelectTrigger id={campo.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nenhum">Não definida</SelectItem>
                            {paraOpcoes(ROTULO_FORMA_PAGAMENTO).map((opcao) => (
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
                <Campo rotulo="Vencimento" erro={errors.vencimento?.message}>
                  {(campo) => <Input {...campo} {...register('vencimento')} type="date" />}
                </Campo>

                <Campo rotulo="Pago em" erro={errors.pagoEm?.message}>
                  {(campo) => <Input {...campo} {...register('pagoEm')} type="date" />}
                </Campo>
              </div>

              <Campo rotulo="Observações" erro={errors.observacoes?.message}>
                {(campo) => <Textarea {...campo} {...register('observacoes')} rows={2} />}
              </Campo>
            </GrupoCampos>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" carregando={isSubmitting} textoCarregando="Salvando">
              {registro ? 'Salvar alterações' : 'Criar registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
