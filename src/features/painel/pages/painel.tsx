import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { addDays, formatISO } from 'date-fns'
import { Activity, CheckCircle2, FileInput, FolderPlus } from 'lucide-react'
import { Entrada, EntradaPagina } from '@/components/shared/animacao'
import { ControleSegmentado } from '@/components/ui/controle-segmentado'
import { Abertura, AtencaoAgora } from '@/features/painel/components/abertura'
import {
  CartaoCargaEquipe,
  CartaoDocumentos,
  CartaoSituacao,
  CartaoSubprocessos,
  CartaoTendencia,
  type EstadoConsulta,
} from '@/features/painel/components/graficos-painel'
import { IndicadorPeriodo } from '@/features/painel/components/indicadores-periodo'
import {
  CartaoAtividade,
  CartaoCompromissos,
  CartaoPendencias,
} from '@/features/painel/components/listas-painel'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'

const PERIODOS = [
  { valor: '3', rotulo: '3 meses' },
  { valor: '6', rotulo: '6 meses' },
  { valor: '12', rotulo: '12 meses' },
] as const

type ValorPeriodo = (typeof PERIODOS)[number]['valor']

function lerPeriodo(bruto: string | null): ValorPeriodo {
  return PERIODOS.some((opcao) => opcao.valor === bruto) ? (bruto as ValorPeriodo) : '6'
}

/**
 * Painel inicial em grade "bento".
 *
 * Composição: abertura e riscos imediatos no topo; filtro de período numa
 * única linha acima de tudo que ele afeta; indicadores do período; gráficos;
 * filas de trabalho. Cartões marcados "Agora" são retratos atuais e não mudam
 * com o período — o selo deixa isso explícito.
 */
export default function Painel() {
  const usuario = usarSessao((estado) => estado.usuario)
  const [parametros, setParametros] = useSearchParams()
  const periodo = lerPeriodo(parametros.get('periodo'))
  const meses = Number(periodo)
  const rotuloPeriodo = `Últimos ${meses} meses`
  const rotuloComparacao = `${meses} meses anteriores`

  const resumo = useQuery({
    queryKey: chaves.painel.resumo(),
    queryFn: () => servicos.painel.resumo(),
  })

  // Ao trocar o período, os gráficos mantêm o desenho anterior esmaecido até os
  // dados novos chegarem: sem piscar e sem pular o layout.
  const analitico = useQuery({
    queryKey: chaves.painel.analitico(meses),
    queryFn: () => servicos.painel.analitico(meses),
    placeholderData: keepPreviousData,
  })

  const pendencias = useQuery({
    queryKey: chaves.painel.pendencias(),
    queryFn: () => servicos.painel.pendencias(6),
  })

  const recentes = useQuery({
    queryKey: chaves.movimentacoes.recentes(),
    queryFn: () => servicos.movimentacoes.recentes(6),
  })

  const hoje = formatISO(new Date(), { representation: 'date' })
  const emDuasSemanas = formatISO(addDays(new Date(), 14), { representation: 'date' })
  const compromissos = useQuery({
    queryKey: chaves.calendario.lista({ de: hoje, ate: emDuasSemanas }),
    queryFn: () => servicos.calendario.listar({ de: hoje, ate: emDuasSemanas }),
  })

  const estadoAnalitico: EstadoConsulta = {
    dados: analitico.data,
    carregando: analitico.isLoading,
    atualizando: analitico.isFetching && analitico.isPlaceholderData,
    erro: analitico.isError,
    aoTentarNovamente: () => void analitico.refetch(),
  }

  const serie = analitico.data?.serie
  const comparativos = analitico.data?.comparativos

  return (
    <EntradaPagina>
      {/* `grid-flow-row-dense`: em telas médias, cartões menores ocupam os vãos. */}
      <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
        {/* Abertura + riscos imediatos */}
        <div className="md:col-span-6 xl:col-span-8">
          <Abertura
            nome={usuario?.nome ?? ''}
            resumo={resumo.data}
            prazos={analitico.data?.prazos}
          />
        </div>
        <Entrada atraso={0.04} className="md:col-span-6 xl:col-span-4">
          <AtencaoAgora resumo={resumo.data} />
        </Entrada>

        {/* Filtro: uma linha, acima de tudo o que ele afeta */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 md:col-span-6 xl:col-span-12">
          <div>
            <h2 className="text-lg font-extrabold tracking-[-0.03em]">Desempenho da operação</h2>
            <p className="text-xs text-muted-foreground">
              Indicadores comparados ao período anterior de mesma duração.
            </p>
          </div>
          <ControleSegmentado
            rotulo="Período dos indicadores"
            valor={periodo}
            opcoes={[...PERIODOS]}
            aoMudar={(valor) =>
              setParametros(
                (atuais) => {
                  const proximos = new URLSearchParams(atuais)
                  proximos.set('periodo', valor)
                  return proximos
                },
                { replace: true },
              )
            }
          />
        </div>

        {/* Indicadores do período */}
        {(
          [
            {
              chave: 'abertos',
              rotulo: 'Processos abertos',
              icone: FolderPlus,
              sentido: 'neutro',
              para: '/app/processos',
            },
            {
              chave: 'concluidos',
              rotulo: 'Processos concluídos',
              icone: CheckCircle2,
              sentido: 'alta',
              para: '/app/processos?status=concluido',
            },
            {
              chave: 'documentosRecebidos',
              rotulo: 'Documentos recebidos',
              icone: FileInput,
              sentido: 'neutro',
              para: '/app/documentos',
            },
            {
              chave: 'movimentacoes',
              rotulo: 'Movimentações',
              icone: Activity,
              sentido: 'alta',
              para: '/app/processos',
            },
          ] as const
        ).map((indicador, indice) => (
          <Entrada
            key={indicador.chave}
            atraso={0.06 + indice * 0.03}
            className={
              analitico.isFetching && analitico.isPlaceholderData
                ? 'opacity-55 transition-opacity md:col-span-3 xl:col-span-3'
                : 'transition-opacity md:col-span-3 xl:col-span-3'
            }
          >
            <IndicadorPeriodo
              rotulo={indicador.rotulo}
              comparativo={comparativos?.[indicador.chave]}
              serie={serie?.map((ponto) => ponto[indicador.chave])}
              sentidoFavoravel={indicador.sentido}
              rotuloComparacao={rotuloComparacao}
              icone={indicador.icone}
              para={indicador.para}
            />
          </Entrada>
        ))}

        {/* Gráficos */}
        <Entrada atraso={0.12} className="md:col-span-6 xl:col-span-8">
          <CartaoTendencia consulta={estadoAnalitico} rotuloPeriodo={rotuloPeriodo} />
        </Entrada>
        <Entrada atraso={0.15} className="md:col-span-3 xl:col-span-4">
          <CartaoSituacao consulta={estadoAnalitico} />
        </Entrada>

        <Entrada atraso={0.18} className="md:col-span-6 xl:col-span-7">
          <CartaoSubprocessos consulta={estadoAnalitico} />
        </Entrada>
        <Entrada atraso={0.2} className="md:col-span-3 xl:col-span-5">
          <CartaoDocumentos consulta={estadoAnalitico} rotuloPeriodo={rotuloPeriodo} />
        </Entrada>

        {/* Filas de trabalho: duas pilhas independentes. O último cartão de
            cada pilha estica, então as duas colunas terminam alinhadas sem
            deixar cartão vazio esticado ao lado de uma lista longa. */}
        <div className="flex flex-col gap-4 md:col-span-6 xl:col-span-7">
          <Entrada atraso={0.22}>
            <CartaoPendencias
              pendencias={pendencias.data}
              carregando={pendencias.isLoading}
              erro={pendencias.isError}
              aoTentarNovamente={() => void pendencias.refetch()}
            />
          </Entrada>
          <Entrada atraso={0.26} className="flex-1">
            <CartaoAtividade movimentacoes={recentes.data} carregando={recentes.isLoading} />
          </Entrada>
        </div>
        <div className="flex flex-col gap-4 md:col-span-6 xl:col-span-5">
          <Entrada atraso={0.24}>
            <CartaoCargaEquipe consulta={estadoAnalitico} />
          </Entrada>
          <Entrada atraso={0.28} className="flex-1">
            <CartaoCompromissos
              eventos={compromissos.data?.slice(0, 6)}
              carregando={compromissos.isLoading}
            />
          </Entrada>
        </div>
      </div>
    </EntradaPagina>
  )
}
