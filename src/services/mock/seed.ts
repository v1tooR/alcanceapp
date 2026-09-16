import { addDays, formatISO, subDays, subHours } from 'date-fns'
import { CATALOGO_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import type {
  Cliente,
  Documento,
  Etapa,
  EventoCalendario,
  ISODate,
  Movimentacao,
  Notificacao,
  RegistroFinanceiro,
  StatusDocumento,
  StatusEtapa,
  StatusSubprocesso,
  Subprocesso,
  TipoDocumento,
  TipoSubprocesso,
  Usuario,
} from '@/types/domain'
import type { Processo } from '@/types/domain'

/**
 * Dados de desenvolvimento — **fictícios**.
 *
 * Nomes, CPFs, endereços e valores são inventados e não correspondem a pessoas
 * reais. Não há senhas, laudos ou informações de saúde verdadeiras: o bloco
 * sensível traz apenas rótulos genéricos, suficientes para exercitar as regras
 * de exibição da interface.
 */

/* -- Aleatoriedade determinística ------------------------------------------ */
// Semente fixa: a base é idêntica a cada carregamento, o que torna a navegação
// previsível durante o desenvolvimento e os testes.
function criarAleatorio(semente: number) {
  let estado = semente
  return () => {
    estado |= 0
    estado = (estado + 0x6d2b79f5) | 0
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const aleatorio = criarAleatorio(20260312)

function escolher<T>(lista: readonly T[]): T {
  return lista[Math.floor(aleatorio() * lista.length)]
}

function inteiro(minimo: number, maximo: number): number {
  return Math.floor(aleatorio() * (maximo - minimo + 1)) + minimo
}

function talvez(probabilidade: number): boolean {
  return aleatorio() < probabilidade
}

const AGORA = new Date()
const iso = (data: Date): string => data.toISOString()
const dia = (data: Date): ISODate => formatISO(data, { representation: 'date' })
/** Datas derivadas (envio, análise) nunca podem cair no futuro. */
const limitarAHoje = (data: Date): Date => (data > AGORA ? AGORA : data)

/* -- Vocabulário fictício --------------------------------------------------- */

/** Os 18 primeiros nomes são fixos: as contas de demonstração dependem deles. */
const NOMES_BASE = [
  'Adriana Bastos Moreira', 'Carlos Eduardo Ferraz', 'Marina Lopes Cordeiro',
  'Rafael Nunes de Andrade', 'Juliana Prado Vasques', 'Otávio Meireles Pinto',
  'Beatriz Salgado Rocha', 'Henrique Tavares Lima', 'Camila Rezende Fontes',
  'Vinícius Barbosa Aguiar', 'Larissa Campos Teixeira', 'Fábio Queiroz Mendes',
  'Patrícia Vilela Nogueira', 'Gustavo Pacheco Brandão', 'Renata Coelho Farias',
  'Thiago Assunção Ribeiro', 'Eliane Martins Duarte', 'Marcelo Siqueira Paiva',
]

const PRIMEIROS_NOMES = [
  'Aline', 'Bruna', 'Caio', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Heloísa',
  'Igor', 'Jéssica', 'Leonardo', 'Mariana', 'Nícolas', 'Olívia', 'Paulo', 'Raquel',
  'Sérgio', 'Tatiana', 'Ulisses', 'Vanessa', 'Wagner', 'Yasmin', 'André', 'Bianca',
  'César', 'Débora', 'Evandro', 'Flávia',
]

const SOBRENOMES = [
  'Albuquerque', 'Bezerra', 'Cavalcanti', 'Dantas', 'Esteves', 'Figueiredo',
  'Guimarães', 'Holanda', 'Imbassahy', 'Junqueira', 'Leal', 'Macedo', 'Novaes',
  'Oliveira', 'Peixoto', 'Quintela', 'Rangel', 'Sarmento', 'Toledo', 'Valente',
  'Xavier', 'Zanetti', 'Amaral', 'Brito', 'Correia', 'Diniz',
]

// Combinação determinística; com 26 sobrenomes, os dois índices nunca coincidem.
const NOMES = [
  ...NOMES_BASE,
  ...PRIMEIROS_NOMES.map(
    (primeiro, i) =>
      `${primeiro} ${SOBRENOMES[i % SOBRENOMES.length]} ${SOBRENOMES[(i * 5 + 11) % SOBRENOMES.length]}`,
  ),
]

const CIDADES = [
  { cidade: 'São Paulo', uf: 'SP' as const },
  { cidade: 'Guarulhos', uf: 'SP' as const },
  { cidade: 'Campinas', uf: 'SP' as const },
  { cidade: 'Santo André', uf: 'SP' as const },
  { cidade: 'Osasco', uf: 'SP' as const },
] as const

const LOGRADOUROS = [
  'Rua das Acácias', 'Avenida Brigadeiro Faria', 'Rua Doutor Ozéas',
  'Travessa São Lucas', 'Alameda dos Ipês', 'Rua Coronel Meireles',
] as const

const BAIRROS = ['Centro', 'Vila Nova', 'Jardim Aurora', 'Santa Teresa', 'Parque União'] as const

/** Rótulos genéricos: nenhuma condição de saúde real é registrada aqui. */
const CATEGORIAS_ASSISTIDO = [
  'Mobilidade reduzida',
  'Deficiência física',
  'Deficiência auditiva',
  'Deficiência visual',
  'Transtorno do espectro autista',
] as const

/* -- Geradores -------------------------------------------------------------- */

let contador = 0
function proximoId(prefixo: string): string {
  contador += 1
  return `${prefixo}-${contador.toString().padStart(4, '0')}`
}

function gerarCpf(indice: number): string {
  // CPFs fictícios com dígitos verificadores válidos, para exercitar a validação.
  // Base variada e determinística (a semente é fixa); `indice` só desempata.
  const base = String(inteiro(100_000_000, 999_999_999) + indice).slice(0, 9)
  const calcular = (parcial: string, pesoInicial: number): number => {
    let soma = 0
    for (let i = 0; i < parcial.length; i += 1) soma += Number(parcial[i]) * (pesoInicial - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const d1 = calcular(base, 10)
  const d2 = calcular(`${base}${d1}`, 11)
  return `${base}${d1}${d2}`
}

function gerarTelefone(): string {
  return `11${inteiro(90000, 99999)}${inteiro(1000, 9999)}`
}

function emailDe(nome: string, indice: number): string {
  const [primeiro, ...resto] = nome.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').split(' ')
  const sobrenome = resto[resto.length - 1] ?? 'silva'
  return `${primeiro}.${sobrenome}${indice}@exemplo.com.br`
}

/* -- Equipe ----------------------------------------------------------------- */

export const USUARIOS_EQUIPE: Usuario[] = [
  {
    id: 'usr-0001',
    nome: 'Helena Corrêa',
    email: 'helena@alcanceisencoes.com.br',
    telefone: '11988110001',
    papel: 'super_admin',
    cargo: 'Coordenação geral',
    ativo: true,
    criadoEm: iso(subDays(AGORA, 420)),
    ultimoAcessoEm: iso(subHours(AGORA, 2)),
  },
  {
    id: 'usr-0002',
    nome: 'Bruno Sampaio',
    email: 'bruno@alcanceisencoes.com.br',
    telefone: '11988110002',
    papel: 'gestor',
    cargo: 'Gestão de atendimento',
    ativo: true,
    criadoEm: iso(subDays(AGORA, 380)),
    ultimoAcessoEm: iso(subHours(AGORA, 9)),
  },
  {
    id: 'usr-0003',
    nome: 'Tatiane Moraes',
    email: 'tatiane@alcanceisencoes.com.br',
    telefone: '11988110003',
    papel: 'analista',
    cargo: 'Analista de processos',
    ativo: true,
    criadoEm: iso(subDays(AGORA, 260)),
    ultimoAcessoEm: iso(subHours(AGORA, 26)),
  },
  {
    id: 'usr-0004',
    nome: 'Diego Ramalho',
    email: 'diego@alcanceisencoes.com.br',
    telefone: '11988110004',
    papel: 'analista',
    cargo: 'Analista de documentos',
    ativo: true,
    criadoEm: iso(subDays(AGORA, 190)),
    ultimoAcessoEm: iso(subHours(AGORA, 50)),
  },
  {
    id: 'usr-0005',
    nome: 'Sofia Antunes',
    email: 'sofia@alcanceisencoes.com.br',
    papel: 'analista',
    cargo: 'Apoio administrativo',
    ativo: false,
    criadoEm: iso(subDays(AGORA, 150)),
  },
]

const IDS_RESPONSAVEIS = ['usr-0002', 'usr-0003', 'usr-0004'] as const

/* -- Montagem da base ------------------------------------------------------- */

export interface BaseSimulada {
  usuarios: Usuario[]
  clientes: Cliente[]
  processos: Processo[]
  subprocessos: Subprocesso[]
  etapas: Etapa[]
  documentos: Documento[]
  movimentacoes: Movimentacao[]
  notificacoes: Notificacao[]
  eventos: EventoCalendario[]
  financeiro: RegistroFinanceiro[]
}

const COMBINACOES_SUBPROCESSOS: TipoSubprocesso[][] = [
  ['avaliacao_inicial', 'ipi', 'icms', 'ipva'],
  ['avaliacao_inicial', 'ipva', 'estacionamento_pcd'],
  ['avaliacao_inicial', 'ipi', 'iof', 'icms'],
  ['avaliacao_inicial', 'estacionamento_pcd'],
  ['avaliacao_inicial', 'ipva', 'rodizio'],
  ['avaliacao_inicial', 'ipi', 'icms', 'ipva', 'recurso'],
]

const STATUS_SUB_POR_PROGRESSO: StatusSubprocesso[] = [
  'nao_iniciado',
  'em_andamento',
  'aguardando_documentos',
  'aguardando_orgao',
  'deferido',
]

export function construirBase(): BaseSimulada {
  const usuarios: Usuario[] = [...USUARIOS_EQUIPE]
  const clientes: Cliente[] = []
  const processos: Processo[] = []
  const subprocessos: Subprocesso[] = []
  const etapas: Etapa[] = []
  const documentos: Documento[] = []
  const movimentacoes: Movimentacao[] = []
  const notificacoes: Notificacao[] = []
  const eventos: EventoCalendario[] = []
  const financeiro: RegistroFinanceiro[] = []

  NOMES.forEach((nome, indice) => {
    const clienteId = `cli-${(indice + 1).toString().padStart(4, '0')}`
    const local = escolher(CIDADES)
    const criadoEm = subDays(AGORA, inteiro(20, 400))
    const ativo = indice < NOMES.length - 2
    const acessoPortal = ativo && indice % 5 !== 0

    // Conta de acesso do cliente ao portal
    const usuarioClienteId = `usr-cli-${(indice + 1).toString().padStart(4, '0')}`
    if (acessoPortal) {
      usuarios.push({
        id: usuarioClienteId,
        nome,
        email: emailDe(nome, indice + 1),
        telefone: gerarTelefone(),
        papel: 'cliente',
        ativo: true,
        clienteId,
        criadoEm: iso(criadoEm),
        ultimoAcessoEm: talvez(0.7) ? iso(subHours(AGORA, inteiro(3, 200))) : undefined,
      })
    }

    clientes.push({
      id: clienteId,
      codigo: `CLI-${(indice + 1).toString().padStart(4, '0')}`,
      nome,
      cpf: gerarCpf(indice + 1),
      rg: `${inteiro(10, 49)}${inteiro(100000, 999999)}`,
      dataNascimento: dia(subDays(AGORA, inteiro(8000, 22000))),
      email: emailDe(nome, indice + 1),
      telefone: gerarTelefone(),
      tipo: talvez(0.55) ? 'condutor' : 'nao_condutor',
      situacao: ativo ? 'ativo' : 'inativo',
      endereco: {
        cep: `0${inteiro(1000, 9999)}${inteiro(100, 999)}`,
        logradouro: escolher(LOGRADOUROS),
        numero: String(inteiro(10, 2400)),
        bairro: escolher(BAIRROS),
        cidade: local.cidade,
        uf: local.uf,
      },
      responsavelId: escolher(IDS_RESPONSAVEIS),
      perfilAssistido: {
        categorias: [escolher(CATEGORIAS_ASSISTIDO)],
        possuiLaudo: talvez(0.75),
        laudoValidoAte: talvez(0.6) ? dia(addDays(AGORA, inteiro(30, 700))) : undefined,
        observacoes: 'Registro fictício para desenvolvimento.',
      },
      observacoesInternas: talvez(0.4)
        ? 'Cliente prefere contato por telefone no período da tarde.'
        : undefined,
      acessoPortalAtivo: acessoPortal,
      criadoEm: iso(criadoEm),
      atualizadoEm: iso(subDays(AGORA, inteiro(0, 18))),
    })
  })

  clientes.forEach((cliente, indiceCliente) => {
    if (cliente.situacao === 'inativo' && talvez(0.5)) return

    // Histórico espalhado por um ano, para os gráficos por período terem o que mostrar.
    const diasAberto = inteiro(8, 360)
    const abertoEm = subDays(AGORA, diasAberto)
    const processoId = `prc-${(indiceCliente + 1).toString().padStart(4, '0')}`
    const combinacao = COMBINACOES_SUBPROCESSOS[indiceCliente % COMBINACOES_SUBPROCESSOS.length]
    const responsavelId = cliente.responsavelId ?? escolher(IDS_RESPONSAVEIS)
    // Processo aberto há pouco tempo não pode já estar concluído.
    const avanco = diasAberto < 45 ? inteiro(0, 2) : inteiro(0, 4)

    const processo: Processo = {
      id: processoId,
      codigo: `PRC-2026-${(indiceCliente + 101).toString()}`,
      clienteId: cliente.id,
      titulo: `Isenções — ${cliente.nome.split(' ')[0]} ${cliente.nome.split(' ').slice(-1)}`,
      status:
        avanco === 4
          ? 'concluido'
          : avanco === 0
            ? 'em_avaliacao'
            : escolher(['em_andamento', 'aguardando_cliente', 'aguardando_orgao'] as const),
      prioridade: escolher(['baixa', 'normal', 'normal', 'alta', 'urgente'] as const),
      responsavelId,
      abertoEm: iso(abertoEm),
      prazoFinal: talvez(0.8) ? dia(addDays(AGORA, inteiro(-25, 90))) : undefined,
      concluidoEm:
        avanco === 4 ? iso(subDays(AGORA, inteiro(1, Math.max(1, diasAberto - 20)))) : undefined,
      resumoPublico:
        'Acompanhamento dos pedidos de isenção. As etapas concluídas aparecem marcadas abaixo.',
      observacoesInternas: talvez(0.5)
        ? 'Conferir documentação complementar antes do próximo protocolo.'
        : undefined,
      atualizadoEm: iso(subDays(AGORA, inteiro(0, 12))),
    }
    processos.push(processo)

    movimentacoes.push({
      id: proximoId('mov'),
      processoId,
      tipo: 'processo_criado',
      titulo: 'Processo aberto',
      descricao: 'Cadastro concluído e processo criado pela equipe.',
      autorId: responsavelId,
      visivelCliente: true,
      criadoEm: iso(abertoEm),
    })

    let houveIndeferimento = false

    combinacao.forEach((tipo, indiceSub) => {
      const definicao = CATALOGO_SUBPROCESSOS[tipo]
      const subprocessoId = proximoId('sub')
      // Processo concluído tem todos os serviços decididos.
      const posicao = avanco === 4 ? 4 : Math.max(0, Math.min(avanco - indiceSub + 1, 4))
      const situacaoBase: StatusSubprocesso =
        tipo === 'recurso' && avanco === 4 && !houveIndeferimento
          ? 'nao_aplicavel'
          : tipo === 'recurso' && avanco < 3
            ? 'nao_iniciado'
            : STATUS_SUB_POR_PROGRESSO[posicao]
      // Parte das decisões é desfavorável — é o que dá sentido ao subprocesso de recurso.
      const status: StatusSubprocesso =
        situacaoBase === 'deferido' && tipo !== 'recurso' && talvez(0.14)
          ? 'indeferido'
          : situacaoBase
      if (status === 'indeferido') houveIndeferimento = true
      const decidido = status === 'deferido' || status === 'indeferido'
      const naoAplicavel = status === 'nao_aplicavel'

      const subprocesso: Subprocesso = {
        id: subprocessoId,
        processoId,
        tipo,
        status,
        responsavelId: talvez(0.8) ? escolher(IDS_RESPONSAVEIS) : responsavelId,
        orgao: definicao.orgaoSugerido,
        protocolo:
          status === 'aguardando_orgao' || decidido
            ? `${inteiro(100000, 999999)}/${AGORA.getFullYear()}`
            : undefined,
        iniciadoEm:
          status === 'nao_iniciado' || naoAplicavel
            ? undefined
            : iso(addDays(abertoEm, indiceSub * 6)),
        concluidoEm: decidido
          ? iso(subDays(AGORA, inteiro(1, Math.max(1, diasAberto - 10))))
          : undefined,
        prazo: talvez(0.7) ? dia(addDays(AGORA, inteiro(-15, 60))) : undefined,
        proximaAcao:
          decidido || naoAplicavel
            ? undefined
            : status === 'aguardando_documentos'
              ? 'Aguardar o envio dos documentos solicitados ao cliente.'
              : status === 'aguardando_orgao'
                ? 'Acompanhar a análise e registrar a decisão quando publicada.'
                : status === 'nao_iniciado'
                  ? 'Confirmar aplicabilidade e iniciar o subprocesso.'
                  : 'Conferir a documentação e preparar o protocolo.',
        responsavelProximaAcao:
          status === 'aguardando_documentos'
            ? 'cliente'
            : status === 'aguardando_orgao'
              ? 'orgao'
              : 'equipe',
        observacoesInternas: talvez(0.3) ? 'Conferir exigências específicas do órgão.' : undefined,
        atualizadoEm: iso(subDays(AGORA, inteiro(0, 15))),
      }
      subprocessos.push(subprocesso)

      definicao.etapasSugeridas.forEach((titulo, ordem) => {
        // "concluidas" conta a etapa em andamento; decidido = todas concluídas.
        const concluidas = decidido ? definicao.etapasSugeridas.length + 1 : posicao + 1
        const statusEtapa: StatusEtapa = naoAplicavel
          ? 'nao_aplicavel'
          : status === 'nao_iniciado'
            ? 'pendente'
            : ordem < concluidas - 1
              ? 'concluida'
              : ordem === concluidas - 1
                ? status === 'aguardando_documentos'
                  ? 'bloqueada'
                  : 'em_andamento'
                : 'pendente'

        etapas.push({
          id: proximoId('etp'),
          subprocessoId,
          titulo,
          ordem,
          status: statusEtapa,
          responsavelId: subprocesso.responsavelId,
          prazo: talvez(0.5) ? dia(addDays(AGORA, inteiro(-10, 45))) : undefined,
          concluidaEm: statusEtapa === 'concluida' ? iso(subDays(AGORA, inteiro(2, 60))) : undefined,
          observacao: statusEtapa === 'concluida' ? 'Etapa concluída pela equipe.' : undefined,
          observacoesInternas: talvez(0.2) ? 'Anotação interna de acompanhamento.' : undefined,
          visivelCliente: true,
        })
      })

      // Serviço não aplicável não pede documentos nem gera movimentação.
      if (naoAplicavel) return

      // Documentos do subprocesso
      definicao.documentosSugeridos.slice(0, inteiro(2, 4)).forEach((tipoDocumento) => {
        const sensivel = tipoDocumento === 'laudo_medico'
        const statusDocumento: StatusDocumento = decidido
          ? 'aprovado'
          : status === 'aguardando_documentos'
            ? escolher(['solicitado', 'reenvio_solicitado'] as const)
            : escolher([
                'solicitado',
                'enviado',
                'em_analise',
                'aprovado',
                'aprovado',
                'aprovado',
                'reprovado',
              ] as const)

        const solicitadoEm = subDays(AGORA, inteiro(2, Math.max(3, diasAberto - 1)))
        const enviado = statusDocumento !== 'solicitado' && statusDocumento !== 'reenvio_solicitado'
        const analisado = statusDocumento === 'aprovado' || statusDocumento === 'reprovado'
        const enviadoData = limitarAHoje(addDays(solicitadoEm, inteiro(1, 10)))
        const analisadoData = limitarAHoje(addDays(enviadoData, inteiro(1, 6)))

        documentos.push({
          id: proximoId('doc'),
          clienteId: cliente.id,
          processoId,
          subprocessoId,
          tipo: tipoDocumento,
          titulo: rotuloDocumento(tipoDocumento),
          status: statusDocumento,
          visibilidade: 'cliente',
          sensivel,
          arquivoNome: enviado ? `${tipoDocumento}-${cliente.codigo}.pdf` : undefined,
          arquivoTamanhoBytes: enviado ? inteiro(180_000, 4_200_000) : undefined,
          arquivoMime: enviado ? 'application/pdf' : undefined,
          solicitadoEm: iso(solicitadoEm),
          solicitadoPorId: responsavelId,
          prazoEnvio: dia(addDays(solicitadoEm, inteiro(5, 25))),
          enviadoEm: enviado ? iso(enviadoData) : undefined,
          enviadoPorId: enviado ? cliente.id : undefined,
          analisadoEm: analisado ? iso(analisadoData) : undefined,
          analisadoPorId: analisado ? 'usr-0004' : undefined,
          motivoDevolucao:
            statusDocumento === 'reenvio_solicitado'
              ? 'O arquivo enviado está ilegível. Reenvie em melhor qualidade.'
              : statusDocumento === 'reprovado'
                ? 'O documento não atende à exigência do órgão. A equipe orientará o próximo passo.'
                : undefined,
          atualizadoEm: iso(subDays(AGORA, inteiro(0, 10))),
        })
      })

      if (status !== 'nao_iniciado') {
        movimentacoes.push({
          id: proximoId('mov'),
          processoId,
          subprocessoId,
          tipo: 'status_alterado',
          titulo: `${definicao.nome}: status atualizado`,
          descricao: subprocesso.proximaAcao,
          autorId: subprocesso.responsavelId,
          de: 'Não iniciado',
          para: definicao.nome,
          visivelCliente: true,
          criadoEm: iso(subDays(AGORA, inteiro(1, Math.max(2, diasAberto)))),
        })
      }
    })

    // Movimentações internas adicionais
    for (let i = 0; i < inteiro(1, 3); i += 1) {
      movimentacoes.push({
        id: proximoId('mov'),
        processoId,
        tipo: 'observacao',
        titulo: 'Observação interna registrada',
        descricao: 'Alinhamento da equipe sobre o andamento do atendimento.',
        autorId: escolher(IDS_RESPONSAVEIS),
        visivelCliente: false,
        criadoEm: iso(subDays(AGORA, inteiro(1, Math.max(2, diasAberto)))),
      })
    }

    // Financeiro informativo
    const valorTotal = inteiro(12, 48) * 100
    const desconto = talvez(0.3) ? inteiro(1, 4) * 100 : 0
    const pago = escolher([0, valorTotal - desconto, Math.round((valorTotal - desconto) / 2)])
    financeiro.push({
      id: proximoId('fin'),
      clienteId: cliente.id,
      processoId,
      descricao: 'Honorários de assessoria',
      valorTotal,
      desconto,
      valorPago: pago,
      status:
        pago === 0
          ? talvez(0.4)
            ? 'atrasado'
            : 'pendente'
          : pago >= valorTotal - desconto
            ? 'pago'
            : 'parcial',
      formaPagamento: escolher(['pix', 'cartao', 'boleto', 'transferencia'] as const),
      vencimento: dia(addDays(AGORA, inteiro(-30, 45))),
      // Data do pagamento mais recente — também nos parcialmente pagos.
      pagoEm: pago > 0 ? dia(subDays(AGORA, inteiro(1, Math.max(1, diasAberto - 5)))) : undefined,
      observacoes: 'Registro informativo — não substitui controle fiscal.',
      criadoEm: iso(abertoEm),
      atualizadoEm: iso(subDays(AGORA, inteiro(0, 20))),
    })

    // Eventos de calendário
    if (talvez(0.75)) {
      // Título e tipo sorteados juntos, para não gerar combinações incoerentes.
      const [titulo, tipo] = escolher([
        ['Reunião de alinhamento', 'reuniao'],
        ['Retorno ao cliente', 'retorno'],
        ['Prazo de protocolo', 'prazo'],
        ['Protocolo do pedido', 'protocolo'],
      ] as const)
      eventos.push({
        id: proximoId('evt'),
        titulo,
        descricao: 'Compromisso vinculado ao processo do cliente.',
        data: dia(addDays(AGORA, inteiro(-12, 28))),
        hora: `${String(inteiro(9, 17)).padStart(2, '0')}:${escolher(['00', '30'])}`,
        tipo,
        status: 'agendado',
        visibilidade: talvez(0.6) ? 'cliente' : 'interno',
        clienteId: cliente.id,
        processoId,
        responsavelId,
        local: talvez(0.4) ? 'Escritório Alcance' : undefined,
        criadoEm: iso(subDays(AGORA, inteiro(1, Math.max(2, diasAberto)))),
      })
    }
  })

  // Notificações da equipe
  const gestor = USUARIOS_EQUIPE[0]
  documentos
    .filter((documento) => documento.status === 'enviado')
    .slice(0, 6)
    .forEach((documento) => {
      const cliente = clientes.find((item) => item.id === documento.clienteId)
      notificacoes.push({
        id: proximoId('not'),
        destinatarioId: gestor.id,
        tipo: 'documento',
        titulo: 'Documento aguardando análise',
        // Documento sensível não tem o nome exposto na notificação.
        mensagem: `${cliente?.nome ?? 'Cliente'} enviou ${
          documento.sensivel ? 'um documento com informação sensível' : documento.titulo
        }.`,
        lida: talvez(0.4),
        clienteId: documento.clienteId,
        processoId: documento.processoId,
        link: `/app/documentos?documento=${documento.id}`,
        criadoEm: iso(subHours(AGORA, inteiro(1, 96))),
      })
    })

  // Notificações dos clientes com acesso ao portal
  usuarios
    .filter((usuario) => usuario.papel === 'cliente')
    .slice(0, 10)
    .forEach((usuario) => {
      const pendente = documentos.find(
        (documento) =>
          documento.clienteId === usuario.clienteId &&
          (documento.status === 'solicitado' || documento.status === 'reenvio_solicitado'),
      )
      if (!pendente) return
      notificacoes.push({
        id: proximoId('not'),
        destinatarioId: usuario.id,
        tipo: 'documento',
        titulo: 'Documento solicitado',
        mensagem: `A equipe solicitou o envio de ${
          pendente.sensivel ? 'um documento' : pendente.titulo
        }.`,
        lida: talvez(0.3),
        clienteId: usuario.clienteId,
        processoId: pendente.processoId,
        link: '/portal/documentos',
        criadoEm: iso(subHours(AGORA, inteiro(2, 120))),
      })
    })

  return {
    usuarios,
    clientes,
    processos,
    subprocessos,
    etapas,
    documentos,
    movimentacoes: movimentacoes.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    notificacoes: notificacoes.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    eventos,
    financeiro,
  }
}

function rotuloDocumento(tipo: TipoDocumento): string {
  const mapa: Record<TipoDocumento, string> = {
    rg: 'RG (frente e verso)',
    cpf: 'CPF',
    cnh: 'CNH',
    comprovante_endereco: 'Comprovante de endereço',
    laudo_medico: 'Laudo médico',
    nota_fiscal: 'Nota fiscal do veículo',
    crlv: 'CRLV do veículo',
    procuracao: 'Procuração assinada',
    declaracao: 'Declaração preenchida',
    comprovante_renda: 'Comprovante de renda',
    outro: 'Documento complementar',
  }
  return mapa[tipo]
}

/** Credenciais de demonstração — só existem no adaptador simulado. */
export const CREDENCIAIS_DEMO = [
  { email: 'helena@alcanceisencoes.com.br', papel: 'Administrador geral' },
  { email: 'bruno@alcanceisencoes.com.br', papel: 'Gestor' },
  { email: 'tatiane@alcanceisencoes.com.br', papel: 'Analista' },
] as const
