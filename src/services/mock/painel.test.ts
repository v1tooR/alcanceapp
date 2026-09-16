import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarServicosSimulados } from '@/services/mock'
import { statusProcessoAtivo, statusSubprocessoFinalizado } from '@/lib/workflow'

/**
 * Consistência dos números do painel.
 *
 * Um gráfico bonito com total errado é pior que nenhum gráfico. Estes testes
 * conferem que cada agregado bate com a soma das partes e com as listagens.
 */

beforeAll(() => {
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((executar: () => void) => {
    executar()
    return 0
  }) as unknown as typeof setTimeout)
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('painel analítico', () => {
  it('gera um ponto por mês do período', async () => {
    const servicos = criarServicosSimulados()
    for (const meses of [3, 6, 12]) {
      const analitico = await servicos.painel.analitico(meses)
      expect(analitico.serie).toHaveLength(meses)
      expect(new Set(analitico.serie.map((ponto) => ponto.chave)).size).toBe(meses)
    }
  })

  it('o total do período é a soma dos meses', async () => {
    const analitico = await criarServicosSimulados().painel.analitico(6)
    for (const chave of ['abertos', 'concluidos', 'documentosRecebidos', 'movimentacoes'] as const) {
      const soma = analitico.serie.reduce((total, ponto) => total + ponto[chave], 0)
      expect(analitico.comparativos[chave].atual).toBe(soma)
    }
  })

  it('a situação dos processos soma exatamente os processos ativos', async () => {
    const servicos = criarServicosSimulados()
    const analitico = await servicos.painel.analitico(6)
    const { itens } = await servicos.processos.listar({ tamanhoPagina: 1000 })

    const ativos = itens.filter((processo) => statusProcessoAtivo(processo.status)).length
    const soma = analitico.situacaoProcessos.reduce((total, item) => total + item.total, 0)
    expect(soma).toBe(ativos)
  })

  it('o funil de documentos nunca cresce de uma etapa para a seguinte', async () => {
    const servicos = criarServicosSimulados()
    for (const meses of [3, 6, 12]) {
      const { documentos } = await servicos.painel.analitico(meses)
      expect(documentos.recebidos).toBeLessThanOrEqual(documentos.solicitados)
      expect(documentos.analisados).toBeLessThanOrEqual(documentos.recebidos)
      expect(documentos.aprovados).toBeLessThanOrEqual(documentos.analisados)
    }
  })

  it('os prazos dividem os subprocessos ativos sem sobra nem repetição', async () => {
    const servicos = criarServicosSimulados()
    const { prazos, subprocessosPorTipo } = await servicos.painel.analitico(6)
    const { itens } = await servicos.processos.listar({ tamanhoPagina: 1000 })

    const detalhes = await Promise.all(itens.map((processo) => servicos.processos.obter(processo.id)))
    const ativos = detalhes
      .flatMap((processo) => processo.subprocessos)
      .filter((sub) => !statusSubprocessoFinalizado(sub.status)).length

    expect(prazos.vencidos + prazos.proximos7Dias + prazos.emDia + prazos.semPrazo).toBe(ativos)

    const emAndamentoNoGrafico = subprocessosPorTipo.reduce(
      (total, linha) =>
        total + linha.emAndamento + linha.aguardandoCliente + linha.aguardandoOrgao + linha.naoIniciado,
      0,
    )
    expect(emAndamentoNoGrafico).toBe(ativos)
  })

  it('a carga da equipe só lista quem tem trabalho e nunca mais atrasos que ativos', async () => {
    const { cargaEquipe } = await criarServicosSimulados().painel.analitico(6)
    expect(cargaEquipe.length).toBeGreaterThan(0)
    for (const linha of cargaEquipe) {
      expect(linha.ativos).toBeGreaterThan(0)
      expect(linha.atrasados).toBeLessThanOrEqual(linha.ativos)
    }
    const ordenada = [...cargaEquipe].sort((a, b) => b.ativos - a.ativos)
    expect(cargaEquipe).toEqual(ordenada)
  })

  it('a base simulada não gera datas incoerentes', async () => {
    const servicos = criarServicosSimulados()
    const { itens } = await servicos.processos.listar({ tamanhoPagina: 1000 })
    const agora = Date.now()

    for (const processo of itens) {
      if (processo.concluidoEm) {
        expect(new Date(processo.concluidoEm).getTime()).toBeGreaterThanOrEqual(
          new Date(processo.abertoEm).getTime(),
        )
      }
    }

    const { itens: documentos } = await servicos.documentos.listar({ tamanhoPagina: 5000 })
    for (const documento of documentos) {
      if (documento.enviadoEm) {
        expect(new Date(documento.enviadoEm).getTime()).toBeLessThanOrEqual(agora)
      }
    }
  })
})
