import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarServicosSimulados } from '@/services/mock'
import type { Servicos } from '@/services/contratos'

/**
 * Regras do fluxo principal, verificadas contra o adaptador simulado.
 *
 * Estes testes descrevem o comportamento que o backend real também precisa
 * garantir — em especial o isolamento entre clientes e a ocultação de dados
 * internos. Quando a API existir, os mesmos cenários devem ser repetidos contra
 * ela: aqui a garantia é só do adaptador de desenvolvimento.
 */

beforeAll(() => {
  // O adaptador simula latência de rede; nos testes ela só atrasaria a suíte.
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((executar: () => void) => {
    executar()
    return 0
  }) as unknown as typeof setTimeout)
})

afterAll(() => {
  vi.restoreAllMocks()
})

const ARQUIVO = { nome: 'arquivo.pdf', tamanhoBytes: 2048, mime: 'application/pdf' }

async function prepararCenario(servicos: Servicos) {
  const { itens: clientes } = await servicos.clientes.listar({ tamanhoPagina: 100 })
  const clienteA = clientes.find((cliente) => cliente.acessoPortalAtivo && cliente.totalProcessos > 0)
  const clienteB = clientes.find(
    (cliente) => cliente.id !== clienteA?.id && cliente.totalProcessos > 0,
  )
  if (!clienteA || !clienteB) throw new Error('Base simulada sem clientes suficientes')

  const [processoA] = (await servicos.processos.listar({ clienteId: clienteA.id })).itens
  const [processoB] = (await servicos.processos.listar({ clienteId: clienteB.id })).itens
  const usuarioA = (await servicos.usuarios.listar()).find(
    (usuario) => usuario.papel === 'cliente' && usuario.clienteId === clienteA.id,
  )
  if (!usuarioA) throw new Error('Cliente sem usuário de acesso')

  return { clienteA, clienteB, processoA, processoB, usuarioA }
}

describe('fluxo principal', () => {
  it('equipe solicita, cliente envia, equipe aprova e o cliente vê o resultado', async () => {
    const servicos = criarServicosSimulados()
    const { clienteA, processoA, usuarioA } = await prepararCenario(servicos)

    const solicitado = await servicos.documentos.solicitar({
      clienteId: clienteA.id,
      processoId: processoA.id,
      tipo: 'procuracao',
      titulo: 'Procuração assinada',
      visibilidade: 'cliente',
      sensivel: false,
    })
    expect(solicitado.status).toBe('solicitado')

    const naArea = await servicos.portal.documentos(clienteA.id)
    expect(naArea.find((documento) => documento.id === solicitado.id)?.status).toBe('solicitado')

    await servicos.portal.enviarDocumento(clienteA.id, solicitado.id, ARQUIVO)
    const aguardando = await servicos.documentos.listar({
      somenteAguardandoAnalise: true,
      tamanhoPagina: 500,
    })
    expect(aguardando.itens.some((documento) => documento.id === solicitado.id)).toBe(true)

    await servicos.documentos.aprovar(solicitado.id)

    const depois = await servicos.portal.documentos(clienteA.id)
    expect(depois.find((documento) => documento.id === solicitado.id)?.status).toBe('aprovado')

    const avisos = await servicos.notificacoes.listar(usuarioA.id)
    expect(avisos.some((aviso) => aviso.titulo === 'Documento aprovado')).toBe(true)

    const historico = await servicos.movimentacoes.listarPorProcesso(processoA.id, true)
    expect(historico.some((item) => item.tipo === 'documento_aprovado')).toBe(true)
  })

  it('pedido de reenvio reabre o envio e leva o motivo ao cliente', async () => {
    const servicos = criarServicosSimulados()
    const { clienteA, processoA } = await prepararCenario(servicos)

    const documento = await servicos.documentos.solicitar({
      clienteId: clienteA.id,
      processoId: processoA.id,
      tipo: 'rg',
      titulo: 'RG (frente e verso)',
      visibilidade: 'cliente',
      sensivel: false,
    })
    await servicos.portal.enviarDocumento(clienteA.id, documento.id, ARQUIVO)
    await servicos.documentos.solicitarReenvio(documento.id, 'A imagem está cortada.')

    const visto = (await servicos.portal.documentos(clienteA.id)).find(
      (item) => item.id === documento.id,
    )
    expect(visto?.status).toBe('reenvio_solicitado')
    expect(visto?.motivoDevolucao).toBe('A imagem está cortada.')

    await servicos.portal.enviarDocumento(clienteA.id, documento.id, ARQUIVO)
    const reenviado = (await servicos.portal.documentos(clienteA.id)).find(
      (item) => item.id === documento.id,
    )
    expect(reenviado?.status).toBe('enviado')
    expect(reenviado?.motivoDevolucao).toBeUndefined()
  })

  it('recusa transições fora do fluxo', async () => {
    const servicos = criarServicosSimulados()
    const { clienteA } = await prepararCenario(servicos)

    const documento = await servicos.documentos.solicitar({
      clienteId: clienteA.id,
      tipo: 'cpf',
      titulo: 'CPF',
      visibilidade: 'cliente',
      sensivel: false,
    })

    // Não há o que aprovar antes do envio.
    await expect(servicos.documentos.aprovar(documento.id)).rejects.toMatchObject({
      codigo: 'invalido',
    })

    await servicos.portal.enviarDocumento(clienteA.id, documento.id, ARQUIVO)
    // Depois de enviado, o cliente não pode sobrescrever o arquivo por conta própria.
    await expect(
      servicos.portal.enviarDocumento(clienteA.id, documento.id, ARQUIVO),
    ).rejects.toMatchObject({ codigo: 'invalido' })
  })
})

describe('isolamento da área do cliente', () => {
  it('o cliente não acessa processo nem documento de outro cliente', async () => {
    const servicos = criarServicosSimulados()
    const { clienteA, clienteB, processoB } = await prepararCenario(servicos)

    await expect(servicos.portal.processo(clienteA.id, processoB.id)).rejects.toMatchObject({
      codigo: 'nao_encontrado',
    })

    const documentoDeB = await servicos.documentos.solicitar({
      clienteId: clienteB.id,
      tipo: 'rg',
      titulo: 'RG',
      visibilidade: 'cliente',
      sensivel: false,
    })

    await expect(
      servicos.portal.enviarDocumento(clienteA.id, documentoDeB.id, ARQUIVO),
    ).rejects.toMatchObject({ codigo: 'nao_encontrado' })

    const documentosDeA = await servicos.portal.documentos(clienteA.id)
    expect(documentosDeA.every((documento) => documento.clienteId === clienteA.id)).toBe(true)
  })

  it('não entrega observações internas, histórico interno, financeiro nem documentos internos', async () => {
    const servicos = criarServicosSimulados()
    const { clienteA, processoA } = await prepararCenario(servicos)

    await servicos.processos.atualizar(processoA.id, { observacoesInternas: 'Anotação interna' })
    await servicos.movimentacoes.registrar({
      processoId: processoA.id,
      titulo: 'Alinhamento interno',
      visivelCliente: false,
    })
    const interno = await servicos.documentos.solicitar({
      clienteId: clienteA.id,
      processoId: processoA.id,
      tipo: 'declaracao',
      titulo: 'Controle interno',
      visibilidade: 'interno',
      sensivel: false,
    })

    const visto = await servicos.portal.processo(clienteA.id, processoA.id)

    expect(visto.observacoesInternas).toBeUndefined()
    expect(visto.subprocessos.every((sub) => sub.observacoesInternas === undefined)).toBe(true)
    expect(
      visto.subprocessos.every((sub) =>
        sub.etapas.every((etapa) => etapa.visivelCliente && etapa.observacoesInternas === undefined),
      ),
    ).toBe(true)
    expect(visto.movimentacoes.every((item) => item.visivelCliente)).toBe(true)
    expect(visto.documentos.some((documento) => documento.id === interno.id)).toBe(false)
    expect(visto.financeiro).toEqual([])

    const documentos = await servicos.portal.documentos(clienteA.id)
    expect(documentos.some((documento) => documento.id === interno.id)).toBe(false)
  })

  it('não permite ao cliente enviar arquivo para documento interno', async () => {
    const servicos = criarServicosSimulados()
    const { clienteA } = await prepararCenario(servicos)

    const interno = await servicos.documentos.solicitar({
      clienteId: clienteA.id,
      tipo: 'declaracao',
      titulo: 'Controle interno',
      visibilidade: 'interno',
      sensivel: false,
    })

    await expect(
      servicos.portal.enviarDocumento(clienteA.id, interno.id, ARQUIVO),
    ).rejects.toMatchObject({ codigo: 'nao_encontrado' })
  })
})

describe('autenticação simulada', () => {
  it('recusa senha errada e acesso desativado, e encerra a sessão ao sair', async () => {
    const servicos = criarServicosSimulados()
    window.sessionStorage.clear()

    await expect(
      servicos.autenticacao.entrar({ email: 'helena@alcanceisencoes.com.br', senha: 'errada' }),
    ).rejects.toMatchObject({ codigo: 'nao_autenticado' })

    await expect(
      servicos.autenticacao.entrar({ email: 'sofia@alcanceisencoes.com.br', senha: 'alcance2026' }),
    ).rejects.toMatchObject({ codigo: 'nao_autorizado' })

    const sessao = await servicos.autenticacao.entrar({
      email: 'helena@alcanceisencoes.com.br',
      senha: 'alcance2026',
    })
    expect(sessao.usuario.papel).toBe('super_admin')
    expect(await servicos.autenticacao.sessaoAtual()).not.toBeNull()

    await servicos.autenticacao.sair()
    expect(await servicos.autenticacao.sessaoAtual()).toBeNull()
  })
})
