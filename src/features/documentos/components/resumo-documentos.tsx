import { FileClock, FileInput, FileUp, RotateCcw } from 'lucide-react'
import { CartaoGrafico, TabelaDados } from '@/components/graficos/base'
import { Estatistica } from '@/components/graficos/estatistica'
import { Funil, Sparkline } from '@/components/graficos/marcas'
import { EstadoVazio } from '@/components/ui/estados'
import { percentualDe } from '@/lib/graficos'
import type { ResumoDocumentos } from '@/services/contratos'

/**
 * Bento da fila documental: o funil mostra onde os documentos param; os
 * cartões levam direto à lista já filtrada.
 */
export function ResumoDosDocumentos({
  resumo,
  carregando,
  erro,
  aoTentarNovamente,
}: {
  resumo?: ResumoDocumentos
  carregando: boolean
  erro: boolean
  aoTentarNovamente: () => void
}) {
  const etapas = resumo
    ? [
        { chave: 'solicitados', rotulo: 'Solicitados', valor: resumo.funil.solicitados },
        { chave: 'recebidos', rotulo: 'Recebidos', valor: resumo.funil.recebidos },
        { chave: 'analisados', rotulo: 'Analisados', valor: resumo.funil.analisados },
        { chave: 'aprovados', rotulo: 'Aprovados', valor: resumo.funil.aprovados },
      ]
    : []
  const recebidos12Meses = resumo?.recebidosPorMes.reduce((soma, ponto) => soma + ponto.valor, 0) ?? 0
  const tempoMedio =
    resumo?.tempoMedioAnaliseDias == null
      ? 'Sem análises concluídas ainda'
      : `Parecer em ${String(resumo.tempoMedioAnaliseDias).replace('.', ',')} dias, em média`

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <CartaoGrafico
        className="md:col-span-2 xl:row-span-2"
        titulo="Caminho dos documentos"
        descricao="Todos os documentos, do pedido à aprovação."
        escopo="Agora"
        carregando={carregando}
        erro={erro}
        aoTentarNovamente={aoTentarNovamente}
      >
        {(modo) =>
          !resumo || resumo.funil.solicitados === 0 ? (
            <EstadoVazio titulo="Nenhum documento solicitado" compacto />
          ) : modo === 'grafico' ? (
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
                conversao:
                  indice === 0 ? '—' : `${percentualDe(etapa.valor, etapas[indice - 1].valor)}%`,
              }))}
            />
          )
        }
      </CartaoGrafico>

      <Estatistica
        rotulo="Aguardando análise"
        valor={resumo?.aguardandoAnalise ?? 0}
        icone={FileClock}
        tom="info"
        carregando={carregando}
        descricao={tempoMedio}
        para="/app/documentos?aguardando=1"
      />

      <Estatistica
        rotulo="Aguardando o cliente"
        valor={resumo?.aguardandoCliente ?? 0}
        icone={FileUp}
        tom="neutro"
        carregando={carregando}
        descricao="Solicitados e ainda não enviados"
        para="/app/documentos?status=solicitado"
      />

      <Estatistica
        rotulo="Devolvidos ao cliente"
        valor={resumo?.devolvidos ?? 0}
        icone={RotateCcw}
        tom={(resumo?.devolvidos ?? 0) > 0 ? 'alerta' : 'sucesso'}
        carregando={carregando}
        descricao="Reprovados ou com reenvio pedido"
        para="/app/documentos?status=reenvio_solicitado"
      />

      <Estatistica
        rotulo="Recebidos neste mês"
        valor={resumo?.recebidosPorMes.at(-1)?.valor ?? 0}
        icone={FileInput}
        carregando={carregando}
        descricao={`${recebidos12Meses} nos últimos 12 meses`}
      >
        {resumo && <Sparkline valores={resumo.recebidosPorMes.map((ponto) => ponto.valor)} />}
      </Estatistica>
    </div>
  )
}
