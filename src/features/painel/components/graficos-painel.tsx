import { Link } from 'react-router-dom'
import { BadgeCheck, FileClock, RotateCcw } from 'lucide-react'
import {
  CartaoGrafico,
  Legenda,
  TabelaDados,
  type ItemLegenda,
} from '@/components/graficos/base'
import { GraficoTendencia, type SerieTendencia } from '@/components/graficos/grafico-tendencia'
import {
  BarraEmpilhada,
  BarraSimples,
  Funil,
  LinhasEmpilhadas,
  Medidor,
  type Segmento,
} from '@/components/graficos/marcas'
import { Badge } from '@/components/ui/badge'
import { EstadoVazio } from '@/components/ui/estados'
import { COR_SITUACAO, COR_STATUS_PROCESSO_ATIVO, SERIE } from '@/lib/cores-graficos'
import { percentualDe } from '@/lib/graficos'
import { ROTULO_STATUS_PROCESSO, ROTULO_TIPO_SUBPROCESSO } from '@/lib/rotulos'
import { capitalizarPrimeira } from '@/lib/utils'
import type { PainelAnalitico, PontoSerieMensal } from '@/services/contratos'

export interface EstadoConsulta {
  dados?: PainelAnalitico
  carregando: boolean
  atualizando: boolean
  erro: boolean
  aoTentarNovamente: () => void
}

function propsCartao(consulta: EstadoConsulta) {
  return {
    carregando: consulta.carregando,
    atualizando: consulta.atualizando,
    erro: consulta.erro,
    aoTentarNovamente: consulta.aoTentarNovamente,
  }
}

/* -- Entradas e conclusões --------------------------------------------------- */

const SERIES_TENDENCIA: Array<SerieTendencia<PontoSerieMensal>> = [
  { chave: 'abertos', rotulo: 'Abertos', cor: SERIE[0] },
  { chave: 'concluidos', rotulo: 'Concluídos', cor: SERIE[1] },
]

export function CartaoTendencia({
  consulta,
  rotuloPeriodo,
  className,
}: {
  consulta: EstadoConsulta
  rotuloPeriodo: string
  className?: string
}) {
  const dados = consulta.dados

  return (
    <CartaoGrafico
      titulo="Entradas e conclusões"
      descricao="Processos abertos e concluídos a cada mês."
      escopo={rotuloPeriodo}
      alturaCarregando="h-[248px]"
      className={className}
      {...propsCartao(consulta)}
      legenda={
        dados && (
          <Legenda
            itens={SERIES_TENDENCIA.map<ItemLegenda>((serie) => ({
              rotulo: serie.rotulo,
              cor: serie.cor,
              forma: 'linha',
              valor: dados.comparativos[serie.chave].atual,
            }))}
          />
        )
      }
    >
      {(modo) =>
        dados &&
        (modo === 'grafico' ? (
          <GraficoTendencia dados={dados.serie} series={SERIES_TENDENCIA} />
        ) : (
          <TabelaDados
            legenda="Processos e documentos por mês"
            colunas={[
              { chave: 'mes', rotulo: 'Mês' },
              { chave: 'abertos', rotulo: 'Abertos', numerica: true },
              { chave: 'concluidos', rotulo: 'Concluídos', numerica: true },
              { chave: 'documentos', rotulo: 'Documentos recebidos', numerica: true },
            ]}
            linhas={dados.serie.map((ponto) => ({
              mes: `${capitalizarPrimeira(ponto.rotuloCompleto)}${ponto.parcial ? ' (em andamento)' : ''}`,
              abertos: ponto.abertos,
              concluidos: ponto.concluidos,
              documentos: ponto.documentosRecebidos,
            }))}
          />
        ))
      }
    </CartaoGrafico>
  )
}

/* -- Situação dos processos ativos ------------------------------------------- */

export function CartaoSituacao({
  consulta,
  className,
}: {
  consulta: EstadoConsulta
  className?: string
}) {
  const situacoes = consulta.dados?.situacaoProcessos ?? []
  const total = situacoes.reduce((soma, item) => soma + item.total, 0)
  const segmentos: Segmento[] = situacoes.map((item) => ({
    chave: item.status,
    rotulo: ROTULO_STATUS_PROCESSO[item.status],
    valor: item.total,
    cor: COR_STATUS_PROCESSO_ATIVO[item.status as keyof typeof COR_STATUS_PROCESSO_ATIVO],
  }))

  return (
    <CartaoGrafico
      titulo="Situação dos processos"
      descricao="Onde está cada processo ativo neste momento."
      escopo="Agora"
      className={className}
      {...propsCartao(consulta)}
    >
      {(modo) =>
        total === 0 ? (
          <EstadoVazio titulo="Nenhum processo ativo" compacto />
        ) : modo === 'grafico' ? (
          <div className="flex h-full flex-col">
            <p className="flex items-baseline gap-2">
              <span className="alc-numero text-[2.25rem]">{total}</span>
              <span className="text-sm text-muted-foreground">ativos</span>
            </p>
            <div className="mt-4">
              <BarraEmpilhada segmentos={segmentos} rotulo={`${total} processos ativos por situação`} espessura="h-6" />
            </div>
            {/* Legenda com valores: identidade nunca depende só da cor. */}
            <ul className="mt-5 space-y-2.5">
              {segmentos.map((segmento) => (
                <li key={segmento.chave}>
                  <Link
                    to={`/app/processos?status=${segmento.chave}`}
                    className="flex items-center gap-2.5 rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: segmento.cor }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{segmento.rotulo}</span>
                    <span className="font-semibold tabular-nums">{segmento.valor}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {percentualDe(segmento.valor, total)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <TabelaDados
            legenda="Processos ativos por situação"
            colunas={[
              { chave: 'situacao', rotulo: 'Situação' },
              { chave: 'total', rotulo: 'Processos', numerica: true },
              { chave: 'pct', rotulo: '%', numerica: true },
            ]}
            linhas={segmentos.map((segmento) => ({
              situacao: segmento.rotulo,
              total: segmento.valor,
              pct: `${percentualDe(segmento.valor, total)}%`,
            }))}
          />
        )
      }
    </CartaoGrafico>
  )
}

/* -- Subprocessos por serviço -------------------------------------------------- */

const SERIES_SUBPROCESSO = [
  { chave: 'emAndamento', rotulo: 'Em andamento', cor: COR_SITUACAO.emAndamento },
  { chave: 'aguardandoCliente', rotulo: 'Aguardando cliente', cor: COR_SITUACAO.aguardandoCliente },
  { chave: 'aguardandoOrgao', rotulo: 'Aguardando órgão', cor: COR_SITUACAO.aguardandoOrgao },
  { chave: 'naoIniciado', rotulo: 'Não iniciado', cor: COR_SITUACAO.inicial },
] as const

/** Rótulos que cabem na coluna do gráfico; a tabela mantém o nome completo. */
const ROTULO_SERVICO_GRAFICO = {
  ...ROTULO_TIPO_SUBPROCESSO,
  estacionamento_pcd: 'Estacionamento PCD',
}

export function CartaoSubprocessos({
  consulta,
  className,
}: {
  consulta: EstadoConsulta
  className?: string
}) {
  const linhas = consulta.dados?.subprocessosPorTipo ?? []
  const deferidos = linhas.reduce((soma, linha) => soma + linha.deferidos, 0)
  const decididos = linhas.reduce((soma, linha) => soma + linha.deferidos + linha.indeferidos, 0)
  const ativos = linhas.filter(
    (linha) => linha.emAndamento + linha.aguardandoCliente + linha.aguardandoOrgao + linha.naoIniciado > 0,
  )

  return (
    <CartaoGrafico
      titulo="Subprocessos por serviço"
      descricao="Em que pé está cada serviço em andamento."
      escopo="Agora"
      className={className}
      {...propsCartao(consulta)}
      legenda={
        <Legenda itens={SERIES_SUBPROCESSO.map((serie) => ({ rotulo: serie.rotulo, cor: serie.cor }))} />
      }
      rodape={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <BadgeCheck className="size-4 text-success" aria-hidden="true" />
            Taxa de deferimento
          </span>
          <Medidor
            valor={deferidos}
            maximo={Math.max(decididos, 1)}
            rotulo="Pedidos deferidos entre os já decididos"
            tom="sucesso"
            className="min-w-24 flex-1"
          />
          <span className="text-sm">
            <span className="font-bold">{decididos > 0 ? `${percentualDe(deferidos, decididos)}%` : '—'}</span>{' '}
            <span className="text-xs text-muted-foreground">
              {decididos > 0 ? `${deferidos} de ${decididos} decididos` : 'sem decisões ainda'}
            </span>
          </span>
        </div>
      }
    >
      {(modo) =>
        ativos.length === 0 ? (
          <EstadoVazio titulo="Nenhum subprocesso em andamento" compacto />
        ) : modo === 'grafico' ? (
          <LinhasEmpilhadas
            sufixoTotal="ativos"
            linhas={ativos.map((linha) => ({
              chave: linha.tipo,
              rotulo: ROTULO_SERVICO_GRAFICO[linha.tipo],
              segmentos: SERIES_SUBPROCESSO.map((serie) => ({
                chave: serie.chave,
                rotulo: serie.rotulo,
                valor: linha[serie.chave],
                cor: serie.cor,
              })),
            }))}
          />
        ) : (
          <TabelaDados
            legenda="Subprocessos por serviço e situação"
            colunas={[
              { chave: 'servico', rotulo: 'Serviço' },
              ...SERIES_SUBPROCESSO.map((serie) => ({ chave: serie.chave, rotulo: serie.rotulo, numerica: true })),
              { chave: 'deferidos', rotulo: 'Deferidos', numerica: true },
              { chave: 'indeferidos', rotulo: 'Indeferidos', numerica: true },
            ]}
            linhas={linhas.map((linha) => ({
              servico: ROTULO_TIPO_SUBPROCESSO[linha.tipo],
              emAndamento: linha.emAndamento,
              aguardandoCliente: linha.aguardandoCliente,
              aguardandoOrgao: linha.aguardandoOrgao,
              naoIniciado: linha.naoIniciado,
              deferidos: linha.deferidos,
              indeferidos: linha.indeferidos,
            }))}
          />
        )
      }
    </CartaoGrafico>
  )
}

/* -- Documentos ------------------------------------------------------------- */

export function CartaoDocumentos({
  consulta,
  rotuloPeriodo,
  className,
}: {
  consulta: EstadoConsulta
  rotuloPeriodo: string
  className?: string
}) {
  const documentos = consulta.dados?.documentos
  const etapas = documentos
    ? [
        { chave: 'solicitados', rotulo: 'Solicitados', valor: documentos.solicitados },
        { chave: 'recebidos', rotulo: 'Recebidos', valor: documentos.recebidos },
        { chave: 'analisados', rotulo: 'Analisados', valor: documentos.analisados },
        { chave: 'aprovados', rotulo: 'Aprovados', valor: documentos.aprovados },
      ]
    : []

  return (
    <CartaoGrafico
      titulo="Caminho dos documentos"
      descricao="Do pedido à aprovação, dos documentos solicitados no período."
      escopo={rotuloPeriodo}
      className={className}
      {...propsCartao(consulta)}
      rodape={
        documentos && (
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/app/documentos?aguardando=1"
              className="flex items-center gap-2.5 rounded-md p-1 -m-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-info-soft text-info" aria-hidden="true">
                <FileClock className="size-4" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-bold">{documentos.aguardandoAnalise}</span>
                <span className="block text-xs text-muted-foreground">Aguardando análise</span>
              </span>
            </Link>
            <Link
              to="/app/documentos?status=reenvio_solicitado"
              className="flex items-center gap-2.5 rounded-md p-1 -m-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning" aria-hidden="true">
                <RotateCcw className="size-4" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-bold">{documentos.devolvidos}</span>
                <span className="block text-xs text-muted-foreground">Devolvidos ao cliente</span>
              </span>
            </Link>
          </div>
        )
      }
    >
      {(modo) =>
        !documentos || documentos.solicitados === 0 ? (
          <EstadoVazio titulo="Nenhum documento solicitado no período" compacto />
        ) : modo === 'grafico' ? (
          // Centralizado: o cartão acompanha a altura do vizinho na mesma linha.
          <div className="my-auto">
            <Funil etapas={etapas} />
          </div>
        ) : (
          <TabelaDados
            legenda="Documentos por etapa"
            colunas={[
              { chave: 'etapa', rotulo: 'Etapa' },
              { chave: 'valor', rotulo: 'Documentos', numerica: true },
              { chave: 'conversao', rotulo: 'Da etapa anterior', numerica: true },
            ]}
            linhas={etapas.map((etapa, indice) => ({
              etapa: etapa.rotulo,
              valor: etapa.valor,
              conversao: indice === 0 ? '—' : `${percentualDe(etapa.valor, etapas[indice - 1].valor)}%`,
            }))}
          />
        )
      }
    </CartaoGrafico>
  )
}

/* -- Carga da equipe ----------------------------------------------------------- */

export function CartaoCargaEquipe({
  consulta,
  className,
}: {
  consulta: EstadoConsulta
  className?: string
}) {
  const carga = consulta.dados?.cargaEquipe ?? []
  const maximo = Math.max(1, ...carga.map((linha) => linha.ativos))

  return (
    <CartaoGrafico
      titulo="Carga da equipe"
      descricao="Subprocessos ativos sob responsabilidade de cada pessoa."
      escopo="Agora"
      className={className}
      {...propsCartao(consulta)}
    >
      {(modo) =>
        carga.length === 0 ? (
          <EstadoVazio titulo="Nenhum subprocesso atribuído" compacto />
        ) : modo === 'grafico' ? (
          <ul className="space-y-3.5">
            {carga.map((linha) => (
              <li key={linha.usuarioId}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold">{linha.nome}</span>
                  <span className="flex items-center gap-2">
                    {linha.atrasados > 0 && (
                      <Badge tom="perigo" tamanho="sm">
                        {linha.atrasados} em atraso
                      </Badge>
                    )}
                    <span className="text-sm font-bold tabular-nums">{linha.ativos}</span>
                  </span>
                </div>
                <BarraSimples
                  valor={linha.ativos}
                  maximo={maximo}
                  rotulo={`${linha.nome}: ${linha.ativos} subprocessos ativos`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <TabelaDados
            legenda="Subprocessos ativos por responsável"
            colunas={[
              { chave: 'nome', rotulo: 'Responsável' },
              { chave: 'ativos', rotulo: 'Ativos', numerica: true },
              { chave: 'atrasados', rotulo: 'Em atraso', numerica: true },
            ]}
            linhas={carga.map((linha) => ({
              nome: linha.nome,
              ativos: linha.ativos,
              atrasados: linha.atrasados,
            }))}
          />
        )
      }
    </CartaoGrafico>
  )
}
