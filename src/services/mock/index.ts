import { addMonths, differenceInCalendarDays, format, isAfter, isBefore, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CATALOGO_SUBPROCESSOS, ORDEM_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import { ROTULO_STATUS_PROCESSO, ROTULO_STATUS_SUBPROCESSO, ROTULO_TIPO_SUBPROCESSO } from '@/lib/rotulos'
import { capitalizarPrimeira, contemTermo, paginar } from '@/lib/utils'
import {
  aguardaAnalise,
  documentoPendenteDoCliente,
  podeMudarStatusDocumento,
  podeMudarStatusEtapa,
  podeMudarStatusProcesso,
  podeMudarStatusSubprocesso,
  progressoSubprocesso,
  statusProcessoAtivo,
  statusSubprocessoFinalizado,
} from '@/lib/workflow'
import { ErroDeServico, naoEncontrado, transicaoInvalida } from '@/services/erros'
import {
  FORMAS_PAGAMENTO,
  STATUS_DOCUMENTO,
  STATUS_FINANCEIRO,
  STATUS_PROCESSO,
} from '@/types/domain'
import type {
  DocumentoListado,
  PontoMensal,
  EventoListado,
  Pagina,
  ProcessoListado,
  RegistroFinanceiroListado,
  Servicos,
} from '@/services/contratos'
import type {
  Cliente,
  ClienteComResumo,
  Documento,
  Etapa,
  ID,
  Movimentacao,
  Notificacao,
  PendenciaPainel,
  Processo,
  ProcessoDetalhado,
  Subprocesso,
  Usuario,
} from '@/types/domain'
import { construirBase, type BaseSimulada } from './seed'

/**
 * Adaptador de dados **simulado**, para desenvolvimento e demonstração.
 *
 * As mutações alteram a base em memória, de modo que os fluxos completos
 * (solicitar documento → cliente envia → equipe analisa → movimentação) possam
 * ser percorridos de verdade. Nada é persistido: ao recarregar, a base volta ao
 * estado inicial.
 */

const CHAVE_SESSAO = 'alcance:sessao'
const SENHA_DEMO = 'alcance2026'

function atraso(minimo = 120, maximo = 320): Promise<void> {
  const ms = minimo + Math.random() * (maximo - minimo)
  return new Promise((resolver) => setTimeout(resolver, ms))
}

function agora(): string {
  return new Date().toISOString()
}

function novoId(prefixo: string): string {
  return `${prefixo}-${Math.random().toString(36).slice(2, 10)}`
}

interface BaldeMensal {
  chave: string
  rotulo: string
  rotuloCompleto: string
  parcial: boolean
  de: Date
  ate: Date
}

/** Os últimos `meses` meses, terminando no mês corrente (parcial). */
function baldesMensais(meses: number): BaldeMensal[] {
  const inicio = subMonths(startOfMonth(new Date()), meses - 1)
  return Array.from({ length: meses }, (_, indice) => {
    const de = addMonths(inicio, indice)
    return {
      chave: format(de, 'yyyy-MM'),
      rotulo: capitalizarPrimeira(format(de, 'MMM', { locale: ptBR }).replace('.', '')),
      rotuloCompleto: format(de, "MMMM 'de' yyyy", { locale: ptBR }),
      parcial: indice === meses - 1,
      de,
      ate: addMonths(de, 1),
    }
  })
}

function noBalde(valor: string | undefined, balde: BaldeMensal): boolean {
  if (!valor) return false
  const data = parseISO(valor)
  return !isBefore(data, balde.de) && isBefore(data, balde.ate)
}

function pontoMensal(balde: BaldeMensal, valor: number): PontoMensal {
  const { chave, rotulo, rotuloCompleto, parcial } = balde
  return { chave, rotulo, rotuloCompleto, parcial, valor }
}

export function criarServicosSimulados(): Servicos {
  const base: BaseSimulada = construirBase()

  /* -- Consultas auxiliares ------------------------------------------------- */

  const usuarioPorId = (id?: ID) => base.usuarios.find((item) => item.id === id)
  const clientePorId = (id: ID) => base.clientes.find((item) => item.id === id)
  const processoPorId = (id: ID) => base.processos.find((item) => item.id === id)
  const subprocessoPorId = (id: ID) => base.subprocessos.find((item) => item.id === id)
  const etapaPorId = (id: ID) => base.etapas.find((item) => item.id === id)
  const documentoPorId = (id: ID) => base.documentos.find((item) => item.id === id)

  const subprocessosDe = (processoId: ID) =>
    base.subprocessos.filter((item) => item.processoId === processoId)
  const etapasDe = (subprocessoId: ID) =>
    base.etapas.filter((item) => item.subprocessoId === subprocessoId).sort((a, b) => a.ordem - b.ordem)
  const documentosDe = (processoId: ID) =>
    base.documentos.filter((item) => item.processoId === processoId)

  function registrarMovimentacao(dados: Omit<Movimentacao, 'id' | 'criadoEm'>): Movimentacao {
    const movimentacao: Movimentacao = { ...dados, id: novoId('mov'), criadoEm: agora() }
    base.movimentacoes.unshift(movimentacao)
    const processo = processoPorId(dados.processoId)
    if (processo) processo.atualizadoEm = movimentacao.criadoEm
    return movimentacao
  }

  function notificarCliente(
    clienteId: ID,
    dados: Omit<Notificacao, 'id' | 'criadoEm' | 'destinatarioId' | 'lida' | 'clienteId'>,
  ): void {
    const usuario = base.usuarios.find(
      (item) => item.papel === 'cliente' && item.clienteId === clienteId,
    )
    if (!usuario) return
    base.notificacoes.unshift({
      ...dados,
      id: novoId('not'),
      destinatarioId: usuario.id,
      clienteId,
      lida: false,
      criadoEm: agora(),
    })
  }

  function progressoDoProcesso(processoId: ID): number {
    const subs = subprocessosDe(processoId).filter(
      (sub) => sub.status !== 'nao_aplicavel' && sub.status !== 'cancelado',
    )
    const etapas = subs.flatMap((sub) => etapasDe(sub.id))
    return progressoSubprocesso(etapas).percentual
  }

  function montarClienteComResumo(cliente: Cliente): ClienteComResumo {
    const processosDoCliente = base.processos.filter((item) => item.clienteId === cliente.id)
    const movimentacoes = base.movimentacoes.filter((item) =>
      processosDoCliente.some((processo) => processo.id === item.processoId),
    )
    return {
      ...cliente,
      responsavel: usuarioPorId(cliente.responsavelId),
      totalProcessos: processosDoCliente.length,
      processosAtivos: processosDoCliente.filter((item) => statusProcessoAtivo(item.status)).length,
      documentosPendentes: base.documentos.filter(
        (item) => item.clienteId === cliente.id && documentoPendenteDoCliente(item.status),
      ).length,
      ultimaMovimentacaoEm: movimentacoes[0]?.criadoEm,
    }
  }

  function montarProcessoListado(processo: Processo): ProcessoListado {
    const cliente = clientePorId(processo.clienteId)
    const subs = subprocessosDe(processo.id)
    return {
      ...processo,
      clienteNome: cliente?.nome ?? 'Cliente removido',
      clienteCodigo: cliente?.codigo ?? '—',
      responsavelNome: usuarioPorId(processo.responsavelId)?.nome,
      totalSubprocessos: subs.length,
      subprocessosConcluidos: subs.filter((sub) => sub.status === 'deferido').length,
      documentosPendentes: documentosDe(processo.id).filter((documento) =>
        documentoPendenteDoCliente(documento.status),
      ).length,
      progresso: progressoDoProcesso(processo.id),
      tiposSubprocesso: subs.map((sub) => sub.tipo),
    }
  }

  function montarDocumentoListado(documento: Documento): DocumentoListado {
    return {
      ...documento,
      clienteNome: clientePorId(documento.clienteId)?.nome ?? 'Cliente removido',
      processoCodigo: documento.processoId ? processoPorId(documento.processoId)?.codigo : undefined,
      subprocessoTipo: documento.subprocessoId
        ? subprocessoPorId(documento.subprocessoId)?.tipo
        : undefined,
    }
  }

  function montarProcessoDetalhado(processo: Processo): ProcessoDetalhado {
    const cliente = clientePorId(processo.clienteId)
    if (!cliente) throw naoEncontrado('Cliente do processo')
    return {
      ...processo,
      cliente,
      responsavel: usuarioPorId(processo.responsavelId),
      subprocessos: subprocessosDe(processo.id).map((sub) => ({ ...sub, etapas: etapasDe(sub.id) })),
      documentos: documentosDe(processo.id),
      movimentacoes: base.movimentacoes.filter((item) => item.processoId === processo.id),
      financeiro: base.financeiro.filter((item) => item.processoId === processo.id),
    }
  }

  function empacotar<T>(itens: T[], pagina = 1, tamanhoPagina = 25): Pagina<T> {
    return { itens: paginar(itens, pagina, tamanhoPagina), total: itens.length, pagina, tamanhoPagina }
  }

  /* -- Serviços ------------------------------------------------------------- */

  return {
    autenticacao: {
      async entrar({ email, senha }) {
        await atraso(350, 650)
        const usuario = base.usuarios.find(
          (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
        )
        if (!usuario || senha !== SENHA_DEMO) {
          throw new ErroDeServico('E-mail ou senha incorretos.', 'nao_autenticado', 401)
        }
        if (!usuario.ativo) {
          throw new ErroDeServico('Este acesso está desativado. Fale com a coordenação.', 'nao_autorizado', 403)
        }
        usuario.ultimoAcessoEm = agora()
        // Apenas o identificador da sessão, em sessionStorage (some ao fechar a aba).
        window.sessionStorage.setItem(CHAVE_SESSAO, usuario.id)
        return { usuario, expiraEm: new Date(Date.now() + 8 * 3600_000).toISOString() }
      },

      async sair() {
        await atraso(80, 160)
        window.sessionStorage.removeItem(CHAVE_SESSAO)
      },

      async sessaoAtual() {
        await atraso(60, 140)
        const id = window.sessionStorage.getItem(CHAVE_SESSAO)
        if (!id) return null
        const usuario = base.usuarios.find((item) => item.id === id)
        if (!usuario?.ativo) return null
        return { usuario, expiraEm: new Date(Date.now() + 8 * 3600_000).toISOString() }
      },

      async solicitarRecuperacaoSenha() {
        await atraso(400, 700)
        // Resposta intencionalmente idêntica exista ou não o e-mail: não revela
        // quem tem conta no sistema.
      },
    },

    clientes: {
      async listar(filtros) {
        await atraso()
        const {
          termo,
          situacao = 'todos',
          tipo = 'todos',
          responsavelId = 'todos',
          ordenarPor = 'nome',
          ordem = 'asc',
          pagina = 1,
          tamanhoPagina = 25,
        } = filtros

        let itens = base.clientes.map(montarClienteComResumo)

        if (termo) itens = itens.filter((cliente) => contemTermo(termo, cliente.nome, cliente.codigo, cliente.email, cliente.cpf))
        if (situacao !== 'todos') itens = itens.filter((cliente) => cliente.situacao === situacao)
        if (tipo !== 'todos') itens = itens.filter((cliente) => cliente.tipo === tipo)
        if (responsavelId !== 'todos') itens = itens.filter((cliente) => cliente.responsavelId === responsavelId)

        itens.sort((a, b) => {
          const fator = ordem === 'asc' ? 1 : -1
          if (ordenarPor === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR') * fator
          if (ordenarPor === 'criadoEm') return a.criadoEm.localeCompare(b.criadoEm) * fator
          return (a.ultimaMovimentacaoEm ?? '').localeCompare(b.ultimaMovimentacaoEm ?? '') * fator
        })

        return empacotar(itens, pagina, tamanhoPagina)
      },

      async obter(id) {
        await atraso()
        const cliente = clientePorId(id)
        if (!cliente) throw naoEncontrado('Cliente')
        return montarClienteComResumo(cliente)
      },

      async criar(dados) {
        await atraso(300, 600)
        const duplicado = base.clientes.find((item) => item.cpf === dados.cpf)
        if (duplicado) {
          throw new ErroDeServico(
            `Já existe um cliente cadastrado com este CPF (${duplicado.codigo}).`,
            'conflito',
            409,
          )
        }
        const sequencia = base.clientes.length + 1
        const cliente: Cliente = {
          ...dados,
          id: novoId('cli'),
          codigo: `CLI-${sequencia.toString().padStart(4, '0')}`,
          criadoEm: agora(),
          atualizadoEm: agora(),
        }
        base.clientes.push(cliente)

        if (dados.acessoPortalAtivo) {
          base.usuarios.push({
            id: novoId('usr-cli'),
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.telefone,
            papel: 'cliente',
            ativo: true,
            clienteId: cliente.id,
            criadoEm: agora(),
          })
        }
        return cliente
      },

      async atualizar(id, dados) {
        await atraso(250, 500)
        const cliente = clientePorId(id)
        if (!cliente) throw naoEncontrado('Cliente')
        Object.assign(cliente, dados, { atualizadoEm: agora() })
        return cliente
      },

      async definirAcessoPortal(id, ativo) {
        await atraso(200, 400)
        const cliente = clientePorId(id)
        if (!cliente) throw naoEncontrado('Cliente')
        cliente.acessoPortalAtivo = ativo
        cliente.atualizadoEm = agora()

        const usuario = base.usuarios.find(
          (item) => item.papel === 'cliente' && item.clienteId === id,
        )
        if (usuario) {
          usuario.ativo = ativo
        } else if (ativo) {
          base.usuarios.push({
            id: novoId('usr-cli'),
            nome: cliente.nome,
            email: cliente.email,
            papel: 'cliente',
            ativo: true,
            clienteId: cliente.id,
            criadoEm: agora(),
          })
        }
        return cliente
      },

      async resumo() {
        await atraso(120, 260)
        const resumos = base.clientes.map(montarClienteComResumo)
        const ativos = resumos.filter((cliente) => cliente.situacao === 'ativo')
        return {
          total: resumos.length,
          ativos: ativos.length,
          comAcessoPortal: ativos.filter((cliente) => cliente.acessoPortalAtivo).length,
          comDocumentosPendentes: resumos.filter((cliente) => cliente.documentosPendentes > 0).length,
          condutores: ativos.filter((cliente) => cliente.tipo === 'condutor').length,
          naoCondutores: ativos.filter((cliente) => cliente.tipo === 'nao_condutor').length,
          novosPorMes: baldesMensais(12).map((balde) =>
            pontoMensal(balde, base.clientes.filter((cliente) => noBalde(cliente.criadoEm, balde)).length),
          ),
        }
      },

      async opcoes() {
        await atraso(60, 140)
        return base.clientes
          .filter((cliente) => cliente.situacao === 'ativo')
          .map((cliente) => ({ id: cliente.id, nome: cliente.nome, codigo: cliente.codigo }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      },
    },

    processos: {
      async listar(filtros) {
        await atraso()
        const {
          termo,
          status = 'todos',
          prioridade = 'todos',
          responsavelId = 'todos',
          clienteId,
          tipoSubprocesso = 'todos',
          somenteComPendencia,
          somentePrazoVencido,
          ordenarPor = 'atualizadoEm',
          ordem = 'desc',
          pagina = 1,
          tamanhoPagina = 25,
        } = filtros

        let itens = base.processos.map(montarProcessoListado)

        if (termo) itens = itens.filter((processo) => contemTermo(termo, processo.codigo, processo.titulo, processo.clienteNome, processo.clienteCodigo))
        if (status !== 'todos') itens = itens.filter((processo) => processo.status === status)
        if (prioridade !== 'todos') itens = itens.filter((processo) => processo.prioridade === prioridade)
        if (responsavelId !== 'todos') itens = itens.filter((processo) => processo.responsavelId === responsavelId)
        if (clienteId) itens = itens.filter((processo) => processo.clienteId === clienteId)
        if (tipoSubprocesso !== 'todos') itens = itens.filter((processo) => processo.tiposSubprocesso.includes(tipoSubprocesso))
        if (somenteComPendencia) {
          itens = itens.filter(
            (processo) =>
              processo.documentosPendentes > 0 ||
              (processo.prazoFinal ? differenceInCalendarDays(parseISO(processo.prazoFinal), new Date()) < 0 : false),
          )
        }

        if (somentePrazoVencido) {
          itens = itens.filter(
            (processo) =>
              statusProcessoAtivo(processo.status) &&
              (processo.prazoFinal
                ? differenceInCalendarDays(parseISO(processo.prazoFinal), new Date()) < 0
                : false),
          )
        }

        const pesoPrioridade = { urgente: 0, alta: 1, normal: 2, baixa: 3 } as const
        itens.sort((a, b) => {
          const fator = ordem === 'asc' ? 1 : -1
          if (ordenarPor === 'prioridade') return (pesoPrioridade[a.prioridade] - pesoPrioridade[b.prioridade]) * fator
          if (ordenarPor === 'prazoFinal') return (a.prazoFinal ?? '9999').localeCompare(b.prazoFinal ?? '9999') * fator
          if (ordenarPor === 'abertoEm') return a.abertoEm.localeCompare(b.abertoEm) * fator
          return a.atualizadoEm.localeCompare(b.atualizadoEm) * fator
        })

        return empacotar(itens, pagina, tamanhoPagina)
      },

      async obter(id) {
        await atraso()
        const processo = processoPorId(id)
        if (!processo) throw naoEncontrado('Processo')
        return montarProcessoDetalhado(processo)
      },

      async criar(dados) {
        await atraso(400, 700)
        const cliente = clientePorId(dados.clienteId)
        if (!cliente) throw naoEncontrado('Cliente')

        const sequencia = base.processos.length + 101
        const processo: Processo = {
          id: novoId('prc'),
          codigo: `PRC-${new Date().getFullYear()}-${sequencia}`,
          clienteId: dados.clienteId,
          titulo: dados.titulo,
          status: 'em_avaliacao',
          prioridade: dados.prioridade,
          responsavelId: dados.responsavelId,
          abertoEm: agora(),
          prazoFinal: dados.prazoFinal,
          resumoPublico: dados.resumoPublico,
          observacoesInternas: dados.observacoesInternas,
          atualizadoEm: agora(),
        }
        base.processos.push(processo)

        dados.subprocessos.forEach((tipo) => {
          const definicao = CATALOGO_SUBPROCESSOS[tipo]
          const subprocesso: Subprocesso = {
            id: novoId('sub'),
            processoId: processo.id,
            tipo,
            status: 'nao_iniciado',
            responsavelId: dados.responsavelId,
            orgao: definicao.orgaoSugerido,
            proximaAcao: 'Confirmar aplicabilidade e iniciar o subprocesso.',
            responsavelProximaAcao: 'equipe',
            atualizadoEm: agora(),
          }
          base.subprocessos.push(subprocesso)

          definicao.etapasSugeridas.forEach((titulo, ordem) => {
            base.etapas.push({
              id: novoId('etp'),
              subprocessoId: subprocesso.id,
              titulo,
              ordem,
              status: 'pendente',
              responsavelId: dados.responsavelId,
              visivelCliente: true,
            })
          })
        })

        registrarMovimentacao({
          processoId: processo.id,
          tipo: 'processo_criado',
          titulo: 'Processo aberto',
          descricao: `Subprocessos abertos: ${dados.subprocessos
            .map((tipo) => ROTULO_TIPO_SUBPROCESSO[tipo])
            .join(', ')}.`,
          autorId: dados.responsavelId,
          visivelCliente: true,
        })

        return processo
      },

      async atualizar(id, dados) {
        await atraso(250, 500)
        const processo = processoPorId(id)
        if (!processo) throw naoEncontrado('Processo')
        Object.assign(processo, dados, { atualizadoEm: agora() })
        return processo
      },

      async alterarStatus(id, status, nota) {
        await atraso(250, 500)
        const processo = processoPorId(id)
        if (!processo) throw naoEncontrado('Processo')
        if (!podeMudarStatusProcesso(processo.status, status)) {
          throw transicaoInvalida(
            ROTULO_STATUS_PROCESSO[processo.status],
            ROTULO_STATUS_PROCESSO[status],
          )
        }
        const anterior = processo.status
        processo.status = status
        processo.atualizadoEm = agora()
        if (status === 'concluido') processo.concluidoEm = agora()

        registrarMovimentacao({
          processoId: id,
          tipo: 'status_alterado',
          titulo: 'Status do processo atualizado',
          descricao: nota,
          de: ROTULO_STATUS_PROCESSO[anterior],
          para: ROTULO_STATUS_PROCESSO[status],
          visivelCliente: true,
        })
        return processo
      },

      async adicionarSubprocesso(dados) {
        await atraso(300, 550)
        const processo = processoPorId(dados.processoId)
        if (!processo) throw naoEncontrado('Processo')
        const jaExiste = subprocessosDe(dados.processoId).some(
          (sub) => sub.tipo === dados.tipo && !statusSubprocessoFinalizado(sub.status),
        )
        if (jaExiste) {
          throw new ErroDeServico(
            `Já existe um subprocesso de ${ROTULO_TIPO_SUBPROCESSO[dados.tipo]} em andamento neste processo.`,
            'conflito',
            409,
          )
        }

        const definicao = CATALOGO_SUBPROCESSOS[dados.tipo]
        const subprocesso: Subprocesso = {
          id: novoId('sub'),
          processoId: dados.processoId,
          tipo: dados.tipo,
          status: 'nao_iniciado',
          responsavelId: dados.responsavelId,
          orgao: dados.orgao ?? definicao.orgaoSugerido,
          prazo: dados.prazo,
          proximaAcao: dados.proximaAcao ?? 'Confirmar aplicabilidade e iniciar o subprocesso.',
          responsavelProximaAcao: 'equipe',
          observacoesInternas: dados.observacoesInternas,
          atualizadoEm: agora(),
        }
        base.subprocessos.push(subprocesso)

        if (dados.criarEtapasSugeridas) {
          definicao.etapasSugeridas.forEach((titulo, ordem) => {
            base.etapas.push({
              id: novoId('etp'),
              subprocessoId: subprocesso.id,
              titulo,
              ordem,
              status: 'pendente',
              responsavelId: dados.responsavelId,
              visivelCliente: true,
            })
          })
        }

        registrarMovimentacao({
          processoId: dados.processoId,
          subprocessoId: subprocesso.id,
          tipo: 'observacao',
          titulo: `Subprocesso aberto: ${definicao.nome}`,
          autorId: dados.responsavelId,
          visivelCliente: true,
        })
        return subprocesso
      },

      async atualizarSubprocesso(id, dados) {
        await atraso(220, 450)
        const subprocesso = subprocessoPorId(id)
        if (!subprocesso) throw naoEncontrado('Subprocesso')
        const protocoloAnterior = subprocesso.protocolo
        Object.assign(subprocesso, dados, { atualizadoEm: agora() })

        if (dados.protocolo && dados.protocolo !== protocoloAnterior) {
          registrarMovimentacao({
            processoId: subprocesso.processoId,
            subprocessoId: id,
            tipo: 'protocolo_registrado',
            titulo: `Protocolo registrado — ${ROTULO_TIPO_SUBPROCESSO[subprocesso.tipo]}`,
            descricao: `Número do protocolo: ${dados.protocolo}.`,
            visivelCliente: true,
          })
        }
        return subprocesso
      },

      async alterarStatusSubprocesso(id, status, nota) {
        await atraso(250, 500)
        const subprocesso = subprocessoPorId(id)
        if (!subprocesso) throw naoEncontrado('Subprocesso')
        if (!podeMudarStatusSubprocesso(subprocesso.status, status)) {
          throw transicaoInvalida(
            ROTULO_STATUS_SUBPROCESSO[subprocesso.status],
            ROTULO_STATUS_SUBPROCESSO[status],
          )
        }
        const anterior = subprocesso.status
        subprocesso.status = status
        subprocesso.atualizadoEm = agora()
        if (status !== 'nao_iniciado' && !subprocesso.iniciadoEm) subprocesso.iniciadoEm = agora()
        if (status === 'deferido' || status === 'indeferido') subprocesso.concluidoEm = agora()

        registrarMovimentacao({
          processoId: subprocesso.processoId,
          subprocessoId: id,
          tipo: 'status_alterado',
          titulo: `${ROTULO_TIPO_SUBPROCESSO[subprocesso.tipo]}: status atualizado`,
          descricao: nota,
          de: ROTULO_STATUS_SUBPROCESSO[anterior],
          para: ROTULO_STATUS_SUBPROCESSO[status],
          visivelCliente: true,
        })
        return subprocesso
      },

      async adicionarEtapa(dados) {
        await atraso(200, 420)
        const subprocesso = subprocessoPorId(dados.subprocessoId)
        if (!subprocesso) throw naoEncontrado('Subprocesso')
        const existentes = etapasDe(dados.subprocessoId)
        const etapa: Etapa = {
          id: novoId('etp'),
          subprocessoId: dados.subprocessoId,
          titulo: dados.titulo,
          descricao: dados.descricao,
          ordem: existentes.length,
          status: 'pendente',
          responsavelId: dados.responsavelId,
          prazo: dados.prazo,
          visivelCliente: dados.visivelCliente,
        }
        base.etapas.push(etapa)
        return etapa
      },

      async atualizarEtapa(id, dados) {
        await atraso(180, 380)
        const etapa = etapaPorId(id)
        if (!etapa) throw naoEncontrado('Etapa')
        Object.assign(etapa, dados)
        return etapa
      },

      async alterarStatusEtapa(id, status, nota) {
        await atraso(200, 400)
        const etapa = etapaPorId(id)
        if (!etapa) throw naoEncontrado('Etapa')
        if (!podeMudarStatusEtapa(etapa.status, status)) {
          throw transicaoInvalida(etapa.status, status)
        }
        etapa.status = status
        etapa.concluidaEm = status === 'concluida' ? agora() : undefined
        if (nota) etapa.observacao = nota

        const subprocesso = subprocessoPorId(etapa.subprocessoId)
        if (subprocesso && status === 'concluida') {
          registrarMovimentacao({
            processoId: subprocesso.processoId,
            subprocessoId: subprocesso.id,
            tipo: 'etapa_concluida',
            titulo: `Etapa concluída: ${etapa.titulo}`,
            descricao: nota,
            visivelCliente: etapa.visivelCliente,
          })
        }
        return etapa
      },

      async resumo() {
        await atraso(120, 260)
        const hoje = new Date()
        const ativos = base.processos.filter((processo) => statusProcessoAtivo(processo.status))
        const baldes = baldesMensais(12)
        return {
          total: base.processos.length,
          ativos: ativos.length,
          porStatus: STATUS_PROCESSO.map((status) => ({
            status,
            total: base.processos.filter((processo) => processo.status === status).length,
          })),
          comPrazoVencido: ativos.filter(
            (processo) =>
              processo.prazoFinal && differenceInCalendarDays(parseISO(processo.prazoFinal), hoje) < 0,
          ).length,
          progressoMedio:
            ativos.length === 0
              ? 0
              : Math.round(
                  ativos.reduce((soma, processo) => soma + progressoDoProcesso(processo.id), 0) /
                    ativos.length,
                ),
          abertosPorMes: baldes.map((balde) =>
            pontoMensal(balde, base.processos.filter((processo) => noBalde(processo.abertoEm, balde)).length),
          ),
          concluidosPorMes: baldes.map((balde) =>
            pontoMensal(
              balde,
              base.processos.filter((processo) => noBalde(processo.concluidoEm, balde)).length,
            ),
          ),
        }
      },

      async removerEtapa(id) {
        await atraso(180, 350)
        const indice = base.etapas.findIndex((item) => item.id === id)
        if (indice < 0) throw naoEncontrado('Etapa')
        base.etapas.splice(indice, 1)
      },
    },

    documentos: {
      async listar(filtros) {
        await atraso()
        const {
          termo,
          status = 'todos',
          tipo = 'todos',
          clienteId,
          processoId,
          subprocessoId,
          somenteAguardandoAnalise,
          ordenarPor = 'atualizadoEm',
          ordem = 'desc',
          pagina = 1,
          tamanhoPagina = 25,
        } = filtros

        let itens = base.documentos.map(montarDocumentoListado)

        if (termo) itens = itens.filter((documento) => contemTermo(termo, documento.titulo, documento.clienteNome, documento.processoCodigo))
        if (status !== 'todos') itens = itens.filter((documento) => documento.status === status)
        if (tipo !== 'todos') itens = itens.filter((documento) => documento.tipo === tipo)
        if (clienteId) itens = itens.filter((documento) => documento.clienteId === clienteId)
        if (processoId) itens = itens.filter((documento) => documento.processoId === processoId)
        if (subprocessoId) itens = itens.filter((documento) => documento.subprocessoId === subprocessoId)
        if (somenteAguardandoAnalise) itens = itens.filter((documento) => aguardaAnalise(documento.status))

        itens.sort((a, b) => {
          const fator = ordem === 'asc' ? 1 : -1
          if (ordenarPor === 'titulo') return a.titulo.localeCompare(b.titulo, 'pt-BR') * fator
          if (ordenarPor === 'prazoEnvio') return (a.prazoEnvio ?? '9999').localeCompare(b.prazoEnvio ?? '9999') * fator
          return a.atualizadoEm.localeCompare(b.atualizadoEm) * fator
        })

        return empacotar(itens, pagina, tamanhoPagina)
      },

      async obter(id) {
        await atraso(100, 200)
        const documento = documentoPorId(id)
        if (!documento) throw naoEncontrado('Documento')
        return montarDocumentoListado(documento)
      },

      async solicitar(dados) {
        await atraso(300, 550)
        const documento: Documento = {
          ...dados,
          id: novoId('doc'),
          status: 'solicitado',
          solicitadoEm: agora(),
          atualizadoEm: agora(),
        }
        base.documentos.push(documento)

        if (dados.processoId) {
          registrarMovimentacao({
            processoId: dados.processoId,
            subprocessoId: dados.subprocessoId,
            tipo: 'documento_solicitado',
            titulo: `Documento solicitado: ${dados.titulo}`,
            visivelCliente: dados.visibilidade === 'cliente',
          })
        }

        if (dados.visibilidade === 'cliente') {
          notificarCliente(dados.clienteId, {
            tipo: 'documento',
            titulo: 'Documento solicitado',
            mensagem: `A equipe solicitou o envio de ${dados.sensivel ? 'um documento' : dados.titulo}.`,
            processoId: dados.processoId,
            link: '/portal/documentos',
          })
        }
        return documento
      },

      async registrarEnvio(id, arquivo) {
        await atraso(500, 900)
        const documento = documentoPorId(id)
        if (!documento) throw naoEncontrado('Documento')
        if (!podeMudarStatusDocumento(documento.status, 'enviado')) {
          throw new ErroDeServico('Este documento não está aberto para envio.', 'invalido', 422)
        }
        documento.status = 'enviado'
        documento.arquivoNome = arquivo.nome
        documento.arquivoTamanhoBytes = arquivo.tamanhoBytes
        documento.arquivoMime = arquivo.mime
        documento.enviadoEm = agora()
        documento.enviadoPorId = documento.clienteId
        documento.motivoDevolucao = undefined
        documento.atualizadoEm = agora()

        if (documento.processoId) {
          registrarMovimentacao({
            processoId: documento.processoId,
            subprocessoId: documento.subprocessoId,
            tipo: 'documento_enviado',
            titulo: `Documento recebido: ${documento.sensivel ? 'documento com informação sensível' : documento.titulo}`,
            visivelCliente: true,
          })
        }
        return documento
      },

      async colocarEmAnalise(id) {
        await atraso(180, 350)
        const documento = documentoPorId(id)
        if (!documento) throw naoEncontrado('Documento')
        if (!podeMudarStatusDocumento(documento.status, 'em_analise')) {
          throw new ErroDeServico('Este documento não pode entrar em análise agora.', 'invalido', 422)
        }
        documento.status = 'em_analise'
        documento.atualizadoEm = agora()
        return documento
      },

      async aprovar(id, observacoesInternas) {
        await atraso(280, 500)
        const documento = documentoPorId(id)
        if (!documento) throw naoEncontrado('Documento')
        if (!podeMudarStatusDocumento(documento.status, 'aprovado')) {
          throw new ErroDeServico('Só é possível aprovar documentos já enviados.', 'invalido', 422)
        }
        documento.status = 'aprovado'
        documento.analisadoEm = agora()
        documento.motivoDevolucao = undefined
        if (observacoesInternas) documento.observacoesInternas = observacoesInternas
        documento.atualizadoEm = agora()

        if (documento.processoId) {
          registrarMovimentacao({
            processoId: documento.processoId,
            subprocessoId: documento.subprocessoId,
            tipo: 'documento_aprovado',
            titulo: `Documento aprovado: ${documento.sensivel ? 'documento com informação sensível' : documento.titulo}`,
            visivelCliente: true,
          })
        }
        notificarCliente(documento.clienteId, {
          tipo: 'sucesso',
          titulo: 'Documento aprovado',
          mensagem: 'Um dos documentos enviados foi aprovado pela equipe.',
          processoId: documento.processoId,
          link: '/portal/documentos',
        })
        return documento
      },

      async reprovar(id, motivo) {
        await atraso(280, 500)
        const documento = documentoPorId(id)
        if (!documento) throw naoEncontrado('Documento')
        if (!podeMudarStatusDocumento(documento.status, 'reprovado')) {
          throw new ErroDeServico('Só é possível reprovar documentos já enviados.', 'invalido', 422)
        }
        documento.status = 'reprovado'
        documento.analisadoEm = agora()
        documento.motivoDevolucao = motivo
        documento.atualizadoEm = agora()

        if (documento.processoId) {
          registrarMovimentacao({
            processoId: documento.processoId,
            subprocessoId: documento.subprocessoId,
            tipo: 'documento_reprovado',
            titulo: `Documento reprovado: ${documento.sensivel ? 'documento com informação sensível' : documento.titulo}`,
            descricao: motivo,
            visivelCliente: true,
          })
        }
        return documento
      },

      async solicitarReenvio(id, motivo, novoPrazo) {
        await atraso(280, 500)
        const documento = documentoPorId(id)
        if (!documento) throw naoEncontrado('Documento')
        if (!podeMudarStatusDocumento(documento.status, 'reenvio_solicitado')) {
          throw new ErroDeServico('Este documento não permite pedido de reenvio agora.', 'invalido', 422)
        }
        documento.status = 'reenvio_solicitado'
        documento.motivoDevolucao = motivo
        documento.prazoEnvio = novoPrazo ?? documento.prazoEnvio
        documento.atualizadoEm = agora()

        notificarCliente(documento.clienteId, {
          tipo: 'alerta',
          titulo: 'Reenvio solicitado',
          mensagem: 'A equipe pediu o reenvio de um documento. Veja o motivo na sua área.',
          processoId: documento.processoId,
          link: '/portal/documentos',
        })
        return documento
      },

      async resumo() {
        await atraso(120, 260)
        const documentos = base.documentos
        const com = (...status: Documento['status'][]) =>
          documentos.filter((documento) => status.includes(documento.status)).length
        const tempos = documentos
          .filter((documento) => documento.enviadoEm && documento.analisadoEm)
          .map((documento) =>
            differenceInCalendarDays(
              parseISO(documento.analisadoEm as string),
              parseISO(documento.enviadoEm as string),
            ),
          )

        return {
          total: documentos.length,
          porStatus: STATUS_DOCUMENTO.map((status) => ({
            status,
            total: documentos.filter((documento) => documento.status === status).length,
          })),
          funil: {
            solicitados: documentos.length,
            recebidos: documentos.filter((documento) => documento.enviadoEm).length,
            analisados: documentos.filter(
              (documento) =>
                documento.enviadoEm &&
                (documento.status === 'aprovado' ||
                  documento.status === 'reprovado' ||
                  documento.status === 'reenvio_solicitado'),
            ).length,
            aprovados: com('aprovado'),
          },
          sensiveis: documentos.filter((documento) => documento.sensivel).length,
          aguardandoAnalise: com('enviado', 'em_analise'),
          aguardandoCliente: com('solicitado', 'reenvio_solicitado'),
          devolvidos: com('reprovado', 'reenvio_solicitado'),
          recebidosPorMes: baldesMensais(12).map((balde) =>
            pontoMensal(balde, documentos.filter((documento) => noBalde(documento.enviadoEm, balde)).length),
          ),
          tempoMedioAnaliseDias:
            tempos.length === 0
              ? null
              : Math.round((tempos.reduce((soma, dias) => soma + dias, 0) / tempos.length) * 10) / 10,
        }
      },

      async alterarVisibilidade(id, visibilidade) {
        await atraso(150, 300)
        const documento = documentoPorId(id)
        if (!documento) throw naoEncontrado('Documento')
        documento.visibilidade = visibilidade
        documento.atualizadoEm = agora()
        return documento
      },
    },

    movimentacoes: {
      async listarPorProcesso(processoId, apenasVisiveisAoCliente) {
        await atraso(100, 220)
        return base.movimentacoes.filter(
          (item) =>
            item.processoId === processoId && (!apenasVisiveisAoCliente || item.visivelCliente),
        )
      },

      async registrar(dados) {
        await atraso(250, 450)
        const processo = processoPorId(dados.processoId)
        if (!processo) throw naoEncontrado('Processo')
        const movimentacao = registrarMovimentacao({
          ...dados,
          tipo: dados.visivelCliente ? 'mensagem_cliente' : 'observacao',
        })
        if (dados.visivelCliente) {
          notificarCliente(processo.clienteId, {
            tipo: 'info',
            titulo: 'Nova atualização no seu processo',
            mensagem: dados.titulo,
            processoId: dados.processoId,
            link: `/portal/processos/${dados.processoId}`,
          })
        }
        return movimentacao
      },

      async recentes(limite = 12) {
        await atraso(120, 260)
        return base.movimentacoes.slice(0, limite).map((movimentacao) => {
          const processo = processoPorId(movimentacao.processoId)
          const cliente = processo ? clientePorId(processo.clienteId) : undefined
          return {
            ...movimentacao,
            clienteNome: cliente?.nome ?? '—',
            processoCodigo: processo?.codigo ?? '—',
          }
        })
      },
    },

    notificacoes: {
      async listar(destinatarioId, apenasNaoLidas) {
        await atraso(100, 220)
        return base.notificacoes.filter(
          (item) => item.destinatarioId === destinatarioId && (!apenasNaoLidas || !item.lida),
        )
      },

      async contarNaoLidas(destinatarioId) {
        await atraso(60, 140)
        return base.notificacoes.filter((item) => item.destinatarioId === destinatarioId && !item.lida)
          .length
      },

      async marcarComoLida(id) {
        await atraso(80, 160)
        const notificacao = base.notificacoes.find((item) => item.id === id)
        if (!notificacao) throw naoEncontrado('Notificação')
        notificacao.lida = true
        return notificacao
      },

      async marcarTodasComoLidas(destinatarioId) {
        await atraso(150, 300)
        base.notificacoes
          .filter((item) => item.destinatarioId === destinatarioId)
          .forEach((item) => {
            item.lida = true
          })
      },

      async enviar(dados) {
        await atraso(250, 450)
        const notificacao: Notificacao = {
          ...dados,
          id: novoId('not'),
          lida: false,
          criadoEm: agora(),
        }
        base.notificacoes.unshift(notificacao)
        return notificacao
      },
    },

    calendario: {
      async listar(filtros) {
        await atraso(120, 260)
        const de = parseISO(filtros.de)
        const ate = parseISO(filtros.ate)

        return base.eventos
          .filter((evento) => {
            const data = parseISO(evento.data)
            if (isBefore(data, de) || isAfter(data, ate)) return false
            if (filtros.apenasVisiveisAoCliente && evento.visibilidade !== 'cliente') return false
            if (filtros.clienteId && evento.clienteId !== filtros.clienteId) return false
            if (filtros.tipo && filtros.tipo !== 'todos' && evento.tipo !== filtros.tipo) return false
            if (
              filtros.responsavelId &&
              filtros.responsavelId !== 'todos' &&
              evento.responsavelId !== filtros.responsavelId
            ) {
              return false
            }
            return true
          })
          .map<EventoListado>((evento) => ({
            ...evento,
            clienteNome: evento.clienteId ? clientePorId(evento.clienteId)?.nome : undefined,
            processoCodigo: evento.processoId ? processoPorId(evento.processoId)?.codigo : undefined,
            responsavelNome: usuarioPorId(evento.responsavelId)?.nome,
          }))
          .sort((a, b) => `${a.data}${a.hora ?? ''}`.localeCompare(`${b.data}${b.hora ?? ''}`))
      },

      async criar(dados) {
        await atraso(280, 500)
        const evento = { ...dados, id: novoId('evt'), status: 'agendado' as const, criadoEm: agora() }
        base.eventos.push(evento)
        return evento
      },

      async atualizar(id, dados) {
        await atraso(250, 450)
        const evento = base.eventos.find((item) => item.id === id)
        if (!evento) throw naoEncontrado('Evento')
        Object.assign(evento, dados)
        return evento
      },

      async alterarStatus(id, status) {
        await atraso(180, 320)
        const evento = base.eventos.find((item) => item.id === id)
        if (!evento) throw naoEncontrado('Evento')
        evento.status = status
        return evento
      },

      async remover(id) {
        await atraso(200, 380)
        const indice = base.eventos.findIndex((item) => item.id === id)
        if (indice < 0) throw naoEncontrado('Evento')
        base.eventos.splice(indice, 1)
      },
    },

    financeiro: {
      async listar(filtros) {
        await atraso()
        const { termo, status = 'todos', clienteId, processoId, pagina = 1, tamanhoPagina = 25 } = filtros

        let itens = base.financeiro.map<RegistroFinanceiroListado>((registro) => ({
          ...registro,
          clienteNome: clientePorId(registro.clienteId)?.nome ?? '—',
          processoCodigo: registro.processoId ? processoPorId(registro.processoId)?.codigo : undefined,
        }))

        if (termo) itens = itens.filter((registro) => contemTermo(termo, registro.descricao, registro.clienteNome, registro.processoCodigo))
        if (status !== 'todos') itens = itens.filter((registro) => registro.status === status)
        if (clienteId) itens = itens.filter((registro) => registro.clienteId === clienteId)
        if (processoId) itens = itens.filter((registro) => registro.processoId === processoId)

        itens.sort((a, b) => (b.vencimento ?? '').localeCompare(a.vencimento ?? ''))
        return empacotar(itens, pagina, tamanhoPagina)
      },

      async resumo() {
        await atraso(120, 260)
        // Cancelados ficam fora dos totais: não são valor a receber.
        const liquido = (item: (typeof base.financeiro)[number]) => item.valorTotal - item.desconto
        const validos = base.financeiro.filter((item) => item.status !== 'cancelado')
        const totalContratado = validos.reduce((soma, item) => soma + liquido(item), 0)
        const totalRecebido = validos.reduce((soma, item) => soma + item.valorPago, 0)
        const totalAtrasado = validos
          .filter((item) => item.status === 'atrasado')
          .reduce((soma, item) => soma + (liquido(item) - item.valorPago), 0)

        return {
          totalContratado,
          totalRecebido,
          totalEmAberto: totalContratado - totalRecebido,
          totalAtrasado,
          porStatus: STATUS_FINANCEIRO.map((status) => {
            const doStatus = base.financeiro.filter((item) => item.status === status)
            return {
              status,
              total: doStatus.length,
              valor: doStatus.reduce((soma, item) => soma + liquido(item), 0),
            }
          }),
          porForma: FORMAS_PAGAMENTO.map((forma) => {
            const daForma = validos.filter((item) => item.formaPagamento === forma)
            return {
              forma,
              total: daForma.length,
              valor: daForma.reduce((soma, item) => soma + item.valorPago, 0),
            }
          }),
          serieMensal: baldesMensais(12).map((balde) => ({
            chave: balde.chave,
            rotulo: balde.rotulo,
            rotuloCompleto: balde.rotuloCompleto,
            parcial: balde.parcial,
            contratado: validos
              .filter((item) => noBalde(item.criadoEm, balde))
              .reduce((soma, item) => soma + liquido(item), 0),
            recebido: validos
              .filter((item) => noBalde(item.pagoEm, balde))
              .reduce((soma, item) => soma + item.valorPago, 0),
          })),
        }
      },

      async criar(dados) {
        await atraso(300, 550)
        const registro = { ...dados, id: novoId('fin'), criadoEm: agora(), atualizadoEm: agora() }
        base.financeiro.push(registro)
        return registro
      },

      async atualizar(id, dados) {
        await atraso(250, 450)
        const registro = base.financeiro.find((item) => item.id === id)
        if (!registro) throw naoEncontrado('Registro financeiro')
        Object.assign(registro, dados, { atualizadoEm: agora() })
        return registro
      },

      async remover(id) {
        await atraso(200, 380)
        const indice = base.financeiro.findIndex((item) => item.id === id)
        if (indice < 0) throw naoEncontrado('Registro financeiro')
        base.financeiro.splice(indice, 1)
      },
    },

    usuarios: {
      async listar() {
        await atraso(120, 240)
        return [...base.usuarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      },

      async listarEquipe() {
        await atraso(80, 160)
        return base.usuarios
          .filter((usuario) => usuario.papel !== 'cliente' && usuario.ativo)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      },

      async obter(id) {
        await atraso(80, 160)
        const usuario = usuarioPorId(id)
        if (!usuario) throw naoEncontrado('Usuário')
        return usuario
      },

      async criar(dados) {
        await atraso(300, 550)
        if (base.usuarios.some((item) => item.email.toLowerCase() === dados.email.toLowerCase())) {
          throw new ErroDeServico('Já existe um usuário com este e-mail.', 'conflito', 409)
        }
        const usuario: Usuario = { ...dados, id: novoId('usr'), criadoEm: agora() }
        base.usuarios.push(usuario)
        return usuario
      },

      async atualizar(id, dados) {
        await atraso(250, 450)
        const usuario = usuarioPorId(id)
        if (!usuario) throw naoEncontrado('Usuário')
        Object.assign(usuario, dados)
        return usuario
      },

      async definirAtivo(id, ativo) {
        await atraso(200, 380)
        const usuario = usuarioPorId(id)
        if (!usuario) throw naoEncontrado('Usuário')
        usuario.ativo = ativo
        return usuario
      },
    },

    painel: {
      async resumo() {
        await atraso(150, 320)
        const hoje = new Date()
        const ativos = base.processos.filter((processo) => statusProcessoAtivo(processo.status))

        const prazosVencidos = base.subprocessos.filter(
          (sub) =>
            !statusSubprocessoFinalizado(sub.status) &&
            sub.prazo &&
            differenceInCalendarDays(parseISO(sub.prazo), hoje) < 0,
        ).length

        const prazosProximos = base.subprocessos.filter((sub) => {
          if (statusSubprocessoFinalizado(sub.status) || !sub.prazo) return false
          const dias = differenceInCalendarDays(parseISO(sub.prazo), hoje)
          return dias >= 0 && dias <= 7
        }).length

        const limite = subDays(hoje, 15).toISOString()
        const semMovimentacao = ativos.filter((processo) => {
          const ultima = base.movimentacoes.find((item) => item.processoId === processo.id)
          return !ultima || ultima.criadoEm < limite
        }).length

        return {
          clientesAtivos: base.clientes.filter((cliente) => cliente.situacao === 'ativo').length,
          processosAtivos: ativos.length,
          documentosAguardandoAnalise: base.documentos.filter((documento) => aguardaAnalise(documento.status)).length,
          prazosVencidos,
          prazosProximos7Dias: prazosProximos,
          processosSemMovimentacao: semMovimentacao,
        }
      },

      async pendencias(limite = 12) {
        await atraso(180, 360)
        const hoje = new Date()
        const pendencias: PendenciaPainel[] = []

        base.documentos
          .filter((documento) => aguardaAnalise(documento.status))
          .forEach((documento) => {
            const cliente = clientePorId(documento.clienteId)
            if (!cliente || !documento.processoId) return
            pendencias.push({
              id: `doc-${documento.id}`,
              tipo: 'documento',
              titulo: 'Documento aguardando análise',
              descricao: `${cliente.nome} — ${documento.sensivel ? 'documento com informação sensível' : documento.titulo}`,
              clienteId: cliente.id,
              clienteNome: cliente.nome,
              processoId: documento.processoId,
              subprocessoId: documento.subprocessoId,
              gravidade: 'media',
              link: `/app/documentos?documento=${documento.id}`,
            })
          })

        base.subprocessos
          .filter((sub) => !statusSubprocessoFinalizado(sub.status) && sub.prazo)
          .forEach((sub) => {
            const dias = differenceInCalendarDays(parseISO(sub.prazo as string), hoje)
            if (dias > 7) return
            const processo = processoPorId(sub.processoId)
            const cliente = processo ? clientePorId(processo.clienteId) : undefined
            if (!processo || !cliente) return
            pendencias.push({
              id: `prz-${sub.id}`,
              tipo: 'prazo',
              titulo: dias < 0 ? 'Prazo vencido' : 'Prazo próximo',
              descricao: `${ROTULO_TIPO_SUBPROCESSO[sub.tipo]} — ${cliente.nome}`,
              clienteId: cliente.id,
              clienteNome: cliente.nome,
              processoId: processo.id,
              subprocessoId: sub.id,
              prazo: sub.prazo,
              responsavelId: sub.responsavelId,
              gravidade: dias < 0 ? 'alta' : 'media',
              link: `/app/processos/${processo.id}`,
            })
          })

        const limiteData = subDays(hoje, 15).toISOString()
        base.processos
          .filter((processo) => statusProcessoAtivo(processo.status))
          .forEach((processo) => {
            const ultima = base.movimentacoes.find((item) => item.processoId === processo.id)
            if (ultima && ultima.criadoEm >= limiteData) return
            const cliente = clientePorId(processo.clienteId)
            if (!cliente) return
            pendencias.push({
              id: `mov-${processo.id}`,
              tipo: 'sem_movimentacao',
              titulo: 'Sem movimentação há mais de 15 dias',
              descricao: `${processo.codigo} — ${cliente.nome}`,
              clienteId: cliente.id,
              clienteNome: cliente.nome,
              processoId: processo.id,
              responsavelId: processo.responsavelId,
              gravidade: 'baixa',
              link: `/app/processos/${processo.id}`,
            })
          })

        const peso = { alta: 0, media: 1, baixa: 2 } as const
        return pendencias.sort((a, b) => peso[a.gravidade] - peso[b.gravidade]).slice(0, limite)
      },

      async analitico(meses) {
        await atraso(200, 420)
        const hoje = new Date()
        const referencia = startOfMonth(hoje)
        const inicioPeriodo = subMonths(referencia, meses - 1)
        const fimPeriodo = addMonths(referencia, 1)
        const inicioAnterior = subMonths(inicioPeriodo, meses)

        const entre = (valor: string | undefined, de: Date, ate: Date) => {
          if (!valor) return false
          const data = parseISO(valor)
          return !isBefore(data, de) && isBefore(data, ate)
        }

        const contar = {
          abertos: (de: Date, ate: Date) =>
            base.processos.filter((processo) => entre(processo.abertoEm, de, ate)).length,
          concluidos: (de: Date, ate: Date) =>
            base.processos.filter((processo) => entre(processo.concluidoEm, de, ate)).length,
          documentosRecebidos: (de: Date, ate: Date) =>
            base.documentos.filter((documento) => entre(documento.enviadoEm, de, ate)).length,
          movimentacoes: (de: Date, ate: Date) =>
            base.movimentacoes.filter((item) => entre(item.criadoEm, de, ate)).length,
        }

        const serie = Array.from({ length: meses }, (_, indice) => {
          const inicio = addMonths(inicioPeriodo, indice)
          const fim = addMonths(inicio, 1)
          return {
            chave: format(inicio, 'yyyy-MM'),
            rotulo: capitalizarPrimeira(format(inicio, 'MMM', { locale: ptBR }).replace('.', '')),
            rotuloCompleto: format(inicio, "MMMM 'de' yyyy", { locale: ptBR }),
            parcial: indice === meses - 1,
            abertos: contar.abertos(inicio, fim),
            concluidos: contar.concluidos(inicio, fim),
            documentosRecebidos: contar.documentosRecebidos(inicio, fim),
            movimentacoes: contar.movimentacoes(inicio, fim),
          }
        })

        const comparar = (funcao: (de: Date, ate: Date) => number) => ({
          atual: funcao(inicioPeriodo, fimPeriodo),
          anterior: funcao(inicioAnterior, inicioPeriodo),
        })

        const ativos = base.processos.filter((processo) => statusProcessoAtivo(processo.status))
        const subsAtivos = base.subprocessos.filter((sub) => !statusSubprocessoFinalizado(sub.status))
        const diasAtePrazo = (prazo?: string) =>
          prazo ? differenceInCalendarDays(parseISO(prazo), hoje) : null

        const documentosDoPeriodo = base.documentos.filter((documento) =>
          entre(documento.solicitadoEm, inicioPeriodo, fimPeriodo),
        )
        const comStatus = (...status: Documento['status'][]) =>
          documentosDoPeriodo.filter((documento) => status.includes(documento.status)).length

        return {
          meses,
          inicioPeriodo: format(inicioPeriodo, 'yyyy-MM-dd'),
          serie,
          comparativos: {
            abertos: comparar(contar.abertos),
            concluidos: comparar(contar.concluidos),
            documentosRecebidos: comparar(contar.documentosRecebidos),
            movimentacoes: comparar(contar.movimentacoes),
          },
          situacaoProcessos: (
            ['em_andamento', 'aguardando_cliente', 'aguardando_orgao', 'em_avaliacao'] as const
          ).map((status) => ({
            status,
            total: ativos.filter((processo) => processo.status === status).length,
          })),
          subprocessosPorTipo: ORDEM_SUBPROCESSOS.map((tipo) => {
            const doTipo = base.subprocessos.filter((sub) => sub.tipo === tipo)
            const com = (status: Subprocesso['status']) =>
              doTipo.filter((sub) => sub.status === status).length
            return {
              tipo,
              emAndamento: com('em_andamento'),
              aguardandoCliente: com('aguardando_documentos'),
              aguardandoOrgao: com('aguardando_orgao'),
              naoIniciado: com('nao_iniciado'),
              deferidos: com('deferido'),
              indeferidos: com('indeferido'),
            }
          }).filter(
            (linha) =>
              linha.emAndamento +
                linha.aguardandoCliente +
                linha.aguardandoOrgao +
                linha.naoIniciado +
                linha.deferidos +
                linha.indeferidos >
              0,
          ),
          documentos: {
            solicitados: documentosDoPeriodo.length,
            recebidos: documentosDoPeriodo.filter((documento) => documento.enviadoEm).length,
            analisados: documentosDoPeriodo.filter(
              (documento) =>
                documento.enviadoEm &&
                (documento.status === 'aprovado' ||
                  documento.status === 'reprovado' ||
                  documento.status === 'reenvio_solicitado'),
            ).length,
            aprovados: comStatus('aprovado'),
            devolvidos: comStatus('reprovado', 'reenvio_solicitado'),
            aguardandoAnalise: comStatus('enviado', 'em_analise'),
            aguardandoCliente: comStatus('solicitado', 'reenvio_solicitado'),
          },
          cargaEquipe: base.usuarios
            .filter((usuario) => usuario.papel !== 'cliente' && usuario.ativo)
            .map((usuario) => {
              const doResponsavel = subsAtivos.filter((sub) => sub.responsavelId === usuario.id)
              return {
                usuarioId: usuario.id,
                nome: usuario.nome,
                ativos: doResponsavel.length,
                atrasados: doResponsavel.filter((sub) => (diasAtePrazo(sub.prazo) ?? 0) < 0).length,
              }
            })
            .filter((linha) => linha.ativos > 0)
            .sort((a, b) => b.ativos - a.ativos),
          prazos: {
            vencidos: subsAtivos.filter((sub) => (diasAtePrazo(sub.prazo) ?? 0) < 0).length,
            proximos7Dias: subsAtivos.filter((sub) => {
              const dias = diasAtePrazo(sub.prazo)
              return dias !== null && dias >= 0 && dias <= 7
            }).length,
            emDia: subsAtivos.filter((sub) => (diasAtePrazo(sub.prazo) ?? -1) > 7).length,
            semPrazo: subsAtivos.filter((sub) => !sub.prazo).length,
          },
        }
      },
    },

    portal: {
      async visaoGeral(clienteId) {
        await atraso(200, 400)
        const cliente = clientePorId(clienteId)
        if (!cliente) throw naoEncontrado('Cliente')

        const processos = base.processos
          .filter((processo) => processo.clienteId === clienteId)
          .map((processo) => ({
            ...processo,
            // O cliente nunca recebe observações internas.
            observacoesInternas: undefined,
            subprocessos: subprocessosDe(processo.id).map((sub) => ({
              ...sub,
              observacoesInternas: undefined,
              etapas: etapasDe(sub.id).filter((etapa) => etapa.visivelCliente),
            })),
            progresso: progressoDoProcesso(processo.id),
          }))

        const usuario = base.usuarios.find(
          (item) => item.papel === 'cliente' && item.clienteId === clienteId,
        )

        return {
          cliente,
          processos,
          documentosPendentes: base.documentos.filter(
            (documento) =>
              documento.clienteId === clienteId &&
              documento.visibilidade === 'cliente' &&
              documentoPendenteDoCliente(documento.status),
          ),
          proximosEventos: base.eventos
            .filter(
              (evento) =>
                evento.clienteId === clienteId &&
                evento.visibilidade === 'cliente' &&
                evento.status === 'agendado' &&
                differenceInCalendarDays(parseISO(evento.data), new Date()) >= 0,
            )
            .sort((a, b) => a.data.localeCompare(b.data))
            .slice(0, 5),
          naoLidas: usuario
            ? base.notificacoes.filter((item) => item.destinatarioId === usuario.id && !item.lida).length
            : 0,
        }
      },

      async processo(clienteId, processoId) {
        await atraso(180, 360)
        const processo = processoPorId(processoId)
        if (!processo || processo.clienteId !== clienteId) throw naoEncontrado('Processo')

        const detalhado = montarProcessoDetalhado(processo)
        // Recorte do que o cliente pode ver.
        return {
          ...detalhado,
          observacoesInternas: undefined,
          subprocessos: detalhado.subprocessos.map((sub) => ({
            ...sub,
            observacoesInternas: undefined,
            etapas: sub.etapas
              .filter((etapa) => etapa.visivelCliente)
              .map((etapa) => ({ ...etapa, observacoesInternas: undefined })),
          })),
          documentos: detalhado.documentos
            .filter((documento) => documento.visibilidade === 'cliente')
            .map((documento) => ({ ...documento, observacoesInternas: undefined })),
          movimentacoes: detalhado.movimentacoes.filter((item) => item.visivelCliente),
          financeiro: [],
        }
      },

      async documentos(clienteId) {
        await atraso(150, 300)
        return base.documentos
          .filter(
            (documento) => documento.clienteId === clienteId && documento.visibilidade === 'cliente',
          )
          .map((documento) => ({ ...documento, observacoesInternas: undefined }))
          .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
      },

      async enviarDocumento(clienteId, documentoId, arquivo) {
        await atraso(600, 1100)
        const documento = documentoPorId(documentoId)
        if (!documento || documento.clienteId !== clienteId) throw naoEncontrado('Documento')
        if (documento.visibilidade !== 'cliente') throw naoEncontrado('Documento')
        if (!documentoPendenteDoCliente(documento.status)) {
          throw new ErroDeServico('Este documento não está aberto para envio.', 'invalido', 422)
        }

        documento.status = 'enviado'
        documento.arquivoNome = arquivo.nome
        documento.arquivoTamanhoBytes = arquivo.tamanhoBytes
        documento.arquivoMime = arquivo.mime
        documento.enviadoEm = agora()
        documento.enviadoPorId = clienteId
        documento.motivoDevolucao = undefined
        documento.atualizadoEm = agora()

        if (documento.processoId) {
          registrarMovimentacao({
            processoId: documento.processoId,
            subprocessoId: documento.subprocessoId,
            tipo: 'documento_enviado',
            titulo: `Documento recebido: ${documento.sensivel ? 'documento com informação sensível' : documento.titulo}`,
            visivelCliente: true,
          })
        }

        // Avisa a coordenação de que há material novo para analisar.
        base.notificacoes.unshift({
          id: novoId('not'),
          destinatarioId: base.usuarios[0].id,
          tipo: 'documento',
          titulo: 'Documento aguardando análise',
          mensagem: `${clientePorId(clienteId)?.nome ?? 'Cliente'} enviou um documento.`,
          lida: false,
          clienteId,
          processoId: documento.processoId,
          link: `/app/documentos?documento=${documento.id}`,
          criadoEm: agora(),
        })

        return documento
      },
    },
  }
}
