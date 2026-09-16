import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Car, FileWarning, Plus, ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react'
import { Legenda } from '@/components/graficos/base'
import { Estatistica, GradeEstatisticas } from '@/components/graficos/estatistica'
import { BarraEmpilhada, Medidor, Sparkline } from '@/components/graficos/marcas'
import { SERIE } from '@/lib/cores-graficos'
import { percentualDe } from '@/lib/graficos'
import type { ResumoClientes } from '@/services/contratos'
import { PageHeader } from '@/components/shared/page-header'
import { CampoBusca } from '@/components/shared/busca'
import { Paginacao } from '@/components/shared/paginacao'
import { EntradaPagina } from '@/components/shared/animacao'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoSemResultado, EstadoVazio } from '@/components/ui/estados'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table'
import { formatarTempoRelativo } from '@/lib/formato'
import { cpfParcial } from '@/lib/privacidade'
import { ROTULO_SITUACAO_CLIENTE, ROTULO_TIPO_CLIENTE, TOM_SITUACAO_CLIENTE, paraOpcoes } from '@/lib/rotulos'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { FiltrosClientes } from '@/services/contratos'
import type { ClienteComResumo, SituacaoCliente, TipoCliente } from '@/types/domain'

const TAMANHO_PADRAO = 25

export default function ListaClientes() {
  const [parametros, setParametros] = useSearchParams()

  // Os filtros moram na URL: a tela pode ser compartilhada e o botão voltar
  // funciona como o usuário espera.
  const filtros: FiltrosClientes = React.useMemo(
    () => ({
      termo: parametros.get('busca') ?? '',
      situacao: (parametros.get('situacao') as SituacaoCliente | 'todos') ?? 'todos',
      tipo: (parametros.get('tipo') as TipoCliente | 'todos') ?? 'todos',
      responsavelId: parametros.get('responsavel') ?? 'todos',
      pagina: Number(parametros.get('pagina') ?? 1),
      tamanhoPagina: Number(parametros.get('tamanho') ?? TAMANHO_PADRAO),
      ordenarPor: 'nome',
      ordem: 'asc',
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

  const equipe = useQuery({
    queryKey: chaves.usuarios.equipe(),
    queryFn: () => servicos.usuarios.listarEquipe(),
  })

  const resumo = useQuery({
    queryKey: chaves.clientes.resumo(),
    queryFn: () => servicos.clientes.resumo(),
  })

  const consulta = useQuery({
    queryKey: chaves.clientes.lista(filtros),
    queryFn: () => servicos.clientes.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const temFiltro =
    Boolean(filtros.termo) ||
    filtros.situacao !== 'todos' ||
    filtros.tipo !== 'todos' ||
    filtros.responsavelId !== 'todos'

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Cadastro"
        titulo="Clientes"
        descricao="Cadastro, situação e acompanhamento das contas atendidas."
        acoes={
          <Button asChild>
            <Link to="/app/clientes/novo">
              <Plus aria-hidden="true" />
              Novo cliente
            </Link>
          </Button>
        }
      />

      <ResumoDaCarteira resumo={resumo.data} carregando={resumo.isLoading} />

      <Card className="overflow-hidden">
        {/* Filtros */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <CampoBusca
            rotulo="Buscar clientes por nome, código, e-mail ou CPF"
            placeholder="Buscar por nome, código ou e-mail…"
            valor={filtros.termo ?? ''}
            aoMudar={(valor) => definir('busca', valor)}
            className="lg:max-w-md lg:flex-1"
          />

          <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
            <Select value={filtros.situacao} onValueChange={(valor) => definir('situacao', valor)}>
              <SelectTrigger className="lg:w-36" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Toda situação</SelectItem>
                {paraOpcoes(ROTULO_SITUACAO_CLIENTE).map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.tipo} onValueChange={(valor) => definir('tipo', valor)}>
              <SelectTrigger className="lg:w-40" aria-label="Filtrar por perfil">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo perfil</SelectItem>
                {paraOpcoes(ROTULO_TIPO_CLIENTE).map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtros.responsavelId}
              onValueChange={(valor) => definir('responsavel', valor)}
            >
              <SelectTrigger className="col-span-2 lg:w-48" aria-label="Filtrar por responsável">
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
          </div>
        </div>

        {/* Conteúdo */}
        {consulta.isLoading ? (
          <EstadoCarregando rotulo="Carregando clientes" />
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
              icone={Users}
              titulo="Nenhum cliente cadastrado"
              descricao="Cadastre o primeiro cliente para começar a abrir processos."
              acao={
                <Button asChild>
                  <Link to="/app/clientes/novo">
                    <UserPlus aria-hidden="true" />
                    Cadastrar cliente
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            {/* Tabela — telas médias e grandes */}
            <div className="hidden md:block">
              <TableWrapper>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Processos</TableHead>
                      <TableHead>Pendências</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consulta.data?.itens.map((cliente) => (
                      <TableRow key={cliente.id} interativa>
                        <TableCell>
                          <Link
                            to={`/app/clientes/${cliente.id}`}
                            className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Avatar nome={cliente.nome} tamanho="sm" />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{cliente.nome}</span>
                              <span className="block text-xs text-muted-foreground">
                                {cliente.codigo}
                              </span>
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {cpfParcial(cliente.cpf)}
                        </TableCell>
                        <TableCell className="text-sm">{ROTULO_TIPO_CLIENTE[cliente.tipo]}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cliente.responsavel?.nome ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {cliente.processosAtivos}
                          <span className="text-muted-foreground"> / {cliente.totalProcessos}</span>
                        </TableCell>
                        <TableCell>
                          {cliente.documentosPendentes > 0 ? (
                            <Badge tom="alerta" tamanho="sm">
                              <FileWarning aria-hidden="true" />
                              {cliente.documentosPendentes}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge tom={TOM_SITUACAO_CLIENTE[cliente.situacao]} ponto tamanho="sm">
                            {ROTULO_SITUACAO_CLIENTE[cliente.situacao]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            </div>

            {/* Cartões — celular */}
            <ul className="divide-y divide-border md:hidden">
              {consulta.data?.itens.map((cliente) => (
                <li key={cliente.id}>
                  <CartaoCliente cliente={cliente} />
                </li>
              ))}
            </ul>

            <Paginacao
              pagina={filtros.pagina ?? 1}
              tamanhoPagina={filtros.tamanhoPagina ?? TAMANHO_PADRAO}
              total={consulta.data?.total ?? 0}
              rotuloItens="clientes"
              aoMudarPagina={(pagina) => definir('pagina', String(pagina))}
              aoMudarTamanho={(tamanho) => definir('tamanho', String(tamanho))}
            />
          </>
        )}
      </Card>
    </EntradaPagina>
  )
}

/** Bento de resumo: quem está ativo, quem já acessa a área e o que falta do cliente. */
function ResumoDaCarteira({ resumo, carregando }: { resumo?: ResumoClientes; carregando: boolean }) {
  const novos12Meses = resumo?.novosPorMes.reduce((soma, ponto) => soma + ponto.valor, 0) ?? 0
  const pendentes = resumo?.comDocumentosPendentes ?? 0
  const segmentosPerfil = resumo
    ? [
        { chave: 'condutor', rotulo: 'Condutor', valor: resumo.condutores, cor: SERIE[0] },
        { chave: 'nao-condutor', rotulo: 'Não condutor', valor: resumo.naoCondutores, cor: SERIE[1] },
      ]
    : []

  return (
    <GradeEstatisticas>
      <Estatistica
        rotulo="Clientes ativos"
        valor={resumo?.ativos ?? 0}
        icone={UserCheck}
        carregando={carregando}
        descricao={resumo && `${novos12Meses} novos nos últimos 12 meses · ${resumo.total} cadastrados`}
        para="/app/clientes?situacao=ativo"
      >
        {resumo && <Sparkline valores={resumo.novosPorMes.map((ponto) => ponto.valor)} />}
      </Estatistica>

      <Estatistica
        rotulo="Com acesso à área do cliente"
        valor={resumo?.comAcessoPortal ?? 0}
        icone={ShieldCheck}
        carregando={carregando}
        descricao={resumo && `${percentualDe(resumo.comAcessoPortal, resumo.ativos)}% dos clientes ativos`}
      >
        {resumo && (
          <Medidor
            valor={resumo.comAcessoPortal}
            maximo={Math.max(resumo.ativos, 1)}
            rotulo="Clientes ativos com acesso liberado"
          />
        )}
      </Estatistica>

      <Estatistica
        rotulo="Com documento pendente"
        valor={pendentes}
        icone={FileWarning}
        tom={pendentes > 0 ? 'alerta' : 'sucesso'}
        carregando={carregando}
        descricao="Aguardando envio pelo próprio cliente"
        para="/app/documentos?status=solicitado"
      />

      <Estatistica
        rotulo="Perfil dos ativos"
        valor={resumo ? `${percentualDe(resumo.condutores, resumo.ativos)}%` : '—'}
        icone={Car}
        carregando={carregando}
        descricao="são condutores do próprio veículo"
      >
        {resumo && (
          <>
            <BarraEmpilhada
              segmentos={segmentosPerfil}
              rotulo="Clientes ativos por perfil"
              espessura="h-3"
            />
            <Legenda
              className="mt-2.5"
              itens={segmentosPerfil.map((segmento) => ({
                rotulo: segmento.rotulo,
                cor: segmento.cor,
                valor: segmento.valor,
              }))}
            />
          </>
        )}
      </Estatistica>
    </GradeEstatisticas>
  )
}

function CartaoCliente({ cliente }: { cliente: ClienteComResumo }) {
  return (
    <Link
      to={`/app/clientes/${cliente.id}`}
      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
    >
      <Avatar nome={cliente.nome} tamanho="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-snug">{cliente.nome}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {cliente.codigo} · {ROTULO_TIPO_CLIENTE[cliente.tipo]}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tom={TOM_SITUACAO_CLIENTE[cliente.situacao]} ponto tamanho="sm">
            {ROTULO_SITUACAO_CLIENTE[cliente.situacao]}
          </Badge>
          {cliente.processosAtivos > 0 && (
            <Badge tom="contorno" tamanho="sm">
              {cliente.processosAtivos} ativo{cliente.processosAtivos > 1 ? 's' : ''}
            </Badge>
          )}
          {cliente.documentosPendentes > 0 && (
            <Badge tom="alerta" tamanho="sm">
              <FileWarning aria-hidden="true" />
              {cliente.documentosPendentes} pendente{cliente.documentosPendentes > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {cliente.ultimaMovimentacaoEm && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Última movimentação {formatarTempoRelativo(cliente.ultimaMovimentacaoEm)}
          </p>
        )}
      </div>
    </Link>
  )
}
