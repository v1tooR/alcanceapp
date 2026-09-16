import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarServicosSimulados } from '@/services/mock'
import { construirBase } from '@/services/mock/seed'

/**
 * Os bentos de cada módulo mostram números resumidos. Estes testes garantem
 * que cada número bate com a listagem que o usuário encontra ao clicar nele.
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

const TUDO = { tamanhoPagina: 10_000 }

describe('resumo de clientes', () => {
  it('bate com a listagem de clientes', async () => {
    const servicos = criarServicosSimulados()
    const resumo = await servicos.clientes.resumo()
    const todos = await servicos.clientes.listar(TUDO)
    const ativos = await servicos.clientes.listar({ ...TUDO, situacao: 'ativo' })

    expect(resumo.total).toBe(todos.total)
    expect(resumo.ativos).toBe(ativos.total)
    expect(resumo.condutores + resumo.naoCondutores).toBe(resumo.ativos)
    expect(resumo.comAcessoPortal).toBeLessThanOrEqual(resumo.ativos)
    expect(resumo.comDocumentosPendentes).toBe(
      todos.itens.filter((cliente) => cliente.documentosPendentes > 0).length,
    )
    expect(resumo.novosPorMes).toHaveLength(12)
    expect(resumo.novosPorMes.filter((ponto) => ponto.parcial)).toHaveLength(1)
  })
})

describe('resumo de processos', () => {
  it('a situação por status soma todos os processos', async () => {
    const servicos = criarServicosSimulados()
    const resumo = await servicos.processos.resumo()
    const todos = await servicos.processos.listar(TUDO)

    expect(resumo.porStatus.reduce((soma, item) => soma + item.total, 0)).toBe(todos.total)
    expect(resumo.total).toBe(todos.total)
  })

  it('o cartão de prazo vencido leva a uma lista com o mesmo número', async () => {
    const servicos = criarServicosSimulados()
    const resumo = await servicos.processos.resumo()
    const vencidos = await servicos.processos.listar({ ...TUDO, somentePrazoVencido: true })

    expect(vencidos.total).toBe(resumo.comPrazoVencido)
  })

  it('o andamento médio é um percentual válido', async () => {
    const { progressoMedio } = await criarServicosSimulados().processos.resumo()
    expect(progressoMedio).toBeGreaterThanOrEqual(0)
    expect(progressoMedio).toBeLessThanOrEqual(100)
  })
})

describe('resumo de documentos', () => {
  it('bate com a listagem e com o filtro de análise', async () => {
    const servicos = criarServicosSimulados()
    const resumo = await servicos.documentos.resumo()
    const todos = await servicos.documentos.listar(TUDO)
    const aguardando = await servicos.documentos.listar({ ...TUDO, somenteAguardandoAnalise: true })

    expect(resumo.total).toBe(todos.total)
    expect(resumo.porStatus.reduce((soma, item) => soma + item.total, 0)).toBe(todos.total)
    expect(resumo.aguardandoAnalise).toBe(aguardando.total)
  })

  it('o funil nunca cresce de uma etapa para a seguinte', async () => {
    const { funil } = await criarServicosSimulados().documentos.resumo()
    expect(funil.recebidos).toBeLessThanOrEqual(funil.solicitados)
    expect(funil.analisados).toBeLessThanOrEqual(funil.recebidos)
    expect(funil.aprovados).toBeLessThanOrEqual(funil.analisados)
  })
})

describe('coerência da base simulada', () => {
  it('processo concluído não tem serviço em aberto nem documento pendente', () => {
    const base = construirBase()
    const concluidos = base.processos.filter((processo) => processo.status === 'concluido')
    expect(concluidos.length).toBeGreaterThan(0)

    for (const processo of concluidos) {
      const subprocessos = base.subprocessos.filter((sub) => sub.processoId === processo.id)
      for (const sub of subprocessos) {
        expect(['deferido', 'indeferido', 'nao_aplicavel', 'cancelado']).toContain(sub.status)
      }

      const pendentes = base.documentos.filter(
        (documento) =>
          documento.processoId === processo.id &&
          documento.status !== 'aprovado' &&
          documento.status !== 'reprovado',
      )
      expect(pendentes).toHaveLength(0)
    }
  })

  it('etapa só tem data de conclusão quando está concluída', () => {
    const { etapas } = construirBase()
    for (const etapa of etapas) {
      if (etapa.concluidaEm) expect(etapa.status).toBe('concluida')
    }
  })

  it('serviço decidido tem todas as etapas concluídas', () => {
    const { subprocessos, etapas } = construirBase()
    const decididos = subprocessos.filter(
      (sub) => sub.status === 'deferido' || sub.status === 'indeferido',
    )
    expect(decididos.length).toBeGreaterThan(0)
    for (const sub of decididos) {
      const doServico = etapas.filter((etapa) => etapa.subprocessoId === sub.id)
      expect(doServico.every((etapa) => etapa.status === 'concluida')).toBe(true)
    }
  })

  it('todo valor recebido tem data de pagamento, para entrar na série mensal', () => {
    const { financeiro } = construirBase()
    for (const registro of financeiro) {
      if (registro.valorPago > 0) expect(registro.pagoEm).toBeTruthy()
    }
  })
})

describe('resumo financeiro', () => {
  it('os totais fecham entre si', async () => {
    const resumo = await criarServicosSimulados().financeiro.resumo()

    expect(resumo.totalEmAberto).toBeCloseTo(resumo.totalContratado - resumo.totalRecebido)
    expect(resumo.totalAtrasado).toBeLessThanOrEqual(resumo.totalEmAberto)

    const contratadoPorStatus = resumo.porStatus
      .filter((item) => item.status !== 'cancelado')
      .reduce((soma, item) => soma + item.valor, 0)
    expect(contratadoPorStatus).toBeCloseTo(resumo.totalContratado)

    const recebidoPorForma = resumo.porForma.reduce((soma, item) => soma + item.valor, 0)
    expect(recebidoPorForma).toBeLessThanOrEqual(resumo.totalRecebido + 0.001)

    expect(resumo.serieMensal).toHaveLength(12)
  })
})
