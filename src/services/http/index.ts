import { ErroDeServico, type CodigoErro } from '@/services/erros'
import type { Servicos } from '@/services/contratos'

/**
 * Adaptador HTTP — **esqueleto de integração**.
 *
 * Implementa os mesmos contratos do adaptador simulado sobre uma API REST. Serve
 * como especificação dos endpoints esperados pelo front-end: as páginas não
 * mudam ao trocar de adaptador.
 *
 * Pendências desta camada antes de ir a produção (ver `docs/integracoes.md`):
 * - autenticação real (cookie `httpOnly` ou SDK do provedor) e renovação de sessão;
 * - upload de arquivo com URL assinada, verificação de tipo/tamanho e antivírus;
 * - autorização por papel aplicada **no servidor**, não apenas na interface.
 */

const MAPA_STATUS: Record<number, CodigoErro> = {
  400: 'invalido',
  401: 'nao_autenticado',
  403: 'nao_autorizado',
  404: 'nao_encontrado',
  409: 'conflito',
  422: 'invalido',
  503: 'indisponivel',
}

export function criarServicosHttp(baseUrl: string): Servicos {
  async function requisitar<T>(
    caminho: string,
    opcoes: { metodo?: string; corpo?: unknown; consulta?: Record<string, unknown> } = {},
  ): Promise<T> {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}${caminho}`, window.location.origin)

    for (const [chave, valor] of Object.entries(opcoes.consulta ?? {})) {
      if (valor === undefined || valor === null || valor === '' || valor === 'todos') continue
      url.searchParams.set(chave, String(valor))
    }

    let resposta: Response
    try {
      resposta = await fetch(url, {
        method: opcoes.metodo ?? 'GET',
        // A sessão trafega em cookie `httpOnly`; nenhum token fica no navegador.
        credentials: 'include',
        headers: opcoes.corpo ? { 'Content-Type': 'application/json' } : undefined,
        body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
      })
    } catch {
      throw new ErroDeServico('Falha de conexão. Verifique sua internet.', 'indisponivel')
    }

    if (resposta.status === 204) return undefined as T

    if (!resposta.ok) {
      // A mensagem exibida vem do servidor apenas quando ele a marca como
      // apresentável; caso contrário usamos um texto genérico, para não expor
      // detalhes internos nem dados pessoais na tela.
      let mensagem = 'Não foi possível concluir a ação.'
      try {
        const corpo = (await resposta.json()) as { mensagem?: string; exibivel?: boolean }
        if (corpo.exibivel && corpo.mensagem) mensagem = corpo.mensagem
      } catch {
        /* resposta sem corpo JSON */
      }
      throw new ErroDeServico(mensagem, MAPA_STATUS[resposta.status] ?? 'desconhecido', resposta.status)
    }

    return (await resposta.json()) as T
  }

  const obter = <T,>(caminho: string, consulta?: Record<string, unknown>) =>
    requisitar<T>(caminho, { consulta })
  const enviar = <T,>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { metodo: 'POST', corpo })
  const alterar = <T,>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { metodo: 'PATCH', corpo })
  const excluir = (caminho: string) => requisitar<void>(caminho, { metodo: 'DELETE' })

  return {
    autenticacao: {
      entrar: (credenciais) => enviar('/auth/entrar', credenciais),
      sair: () => enviar('/auth/sair', {}),
      sessaoAtual: () => obter('/auth/sessao'),
      solicitarRecuperacaoSenha: (email) => enviar('/auth/recuperar-senha', { email }),
    },

    clientes: {
      resumo: () => obter('/clientes/resumo'),
      listar: (filtros) => obter('/clientes', { ...filtros }),
      obter: (id) => obter(`/clientes/${id}`),
      criar: (dados) => enviar('/clientes', dados),
      atualizar: (id, dados) => alterar(`/clientes/${id}`, dados),
      definirAcessoPortal: (id, ativo) => alterar(`/clientes/${id}/acesso-portal`, { ativo }),
      opcoes: () => obter('/clientes/opcoes'),
    },

    processos: {
      resumo: () => obter('/processos/resumo'),
      listar: (filtros) => obter('/processos', { ...filtros }),
      obter: (id) => obter(`/processos/${id}`),
      criar: (dados) => enviar('/processos', dados),
      atualizar: (id, dados) => alterar(`/processos/${id}`, dados),
      alterarStatus: (id, status, nota) => alterar(`/processos/${id}/status`, { status, nota }),
      adicionarSubprocesso: (dados) => enviar(`/processos/${dados.processoId}/subprocessos`, dados),
      atualizarSubprocesso: (id, dados) => alterar(`/subprocessos/${id}`, dados),
      alterarStatusSubprocesso: (id, status, nota) =>
        alterar(`/subprocessos/${id}/status`, { status, nota }),
      adicionarEtapa: (dados) => enviar(`/subprocessos/${dados.subprocessoId}/etapas`, dados),
      atualizarEtapa: (id, dados) => alterar(`/etapas/${id}`, dados),
      alterarStatusEtapa: (id, status, nota) => alterar(`/etapas/${id}/status`, { status, nota }),
      removerEtapa: (id) => excluir(`/etapas/${id}`),
    },

    documentos: {
      resumo: () => obter('/documentos/resumo'),
      listar: (filtros) => obter('/documentos', { ...filtros }),
      obter: (id) => obter(`/documentos/${id}`),
      solicitar: (dados) => enviar('/documentos', dados),
      // O arquivo em si sobe por URL assinada; aqui só confirmamos os metadados.
      registrarEnvio: (id, arquivo) => enviar(`/documentos/${id}/envio`, arquivo),
      colocarEmAnalise: (id) => alterar(`/documentos/${id}/status`, { status: 'em_analise' }),
      aprovar: (id, observacoesInternas) =>
        alterar(`/documentos/${id}/status`, { status: 'aprovado', observacoesInternas }),
      reprovar: (id, motivo) => alterar(`/documentos/${id}/status`, { status: 'reprovado', motivo }),
      solicitarReenvio: (id, motivo, novoPrazo) =>
        alterar(`/documentos/${id}/status`, { status: 'reenvio_solicitado', motivo, novoPrazo }),
      alterarVisibilidade: (id, visibilidade) =>
        alterar(`/documentos/${id}/visibilidade`, { visibilidade }),
    },

    movimentacoes: {
      listarPorProcesso: (processoId, apenasVisiveisAoCliente) =>
        obter(`/processos/${processoId}/movimentacoes`, { apenasVisiveisAoCliente }),
      registrar: (dados) => enviar(`/processos/${dados.processoId}/movimentacoes`, dados),
      recentes: (limite) => obter('/movimentacoes/recentes', { limite }),
    },

    notificacoes: {
      listar: (destinatarioId, apenasNaoLidas) =>
        obter('/notificacoes', { destinatarioId, apenasNaoLidas }),
      contarNaoLidas: (destinatarioId) =>
        obter<{ total: number }>('/notificacoes/nao-lidas', { destinatarioId }).then((r) => r.total),
      marcarComoLida: (id) => alterar(`/notificacoes/${id}`, { lida: true }),
      marcarTodasComoLidas: (destinatarioId) =>
        enviar('/notificacoes/marcar-todas', { destinatarioId }),
      enviar: (dados) => enviar('/notificacoes', dados),
    },

    calendario: {
      listar: (filtros) => obter('/calendario', { ...filtros }),
      criar: (dados) => enviar('/calendario', dados),
      atualizar: (id, dados) => alterar(`/calendario/${id}`, dados),
      alterarStatus: (id, status) => alterar(`/calendario/${id}/status`, { status }),
      remover: (id) => excluir(`/calendario/${id}`),
    },

    financeiro: {
      listar: (filtros) => obter('/financeiro', { ...filtros }),
      resumo: () => obter('/financeiro/resumo'),
      criar: (dados) => enviar('/financeiro', dados),
      atualizar: (id, dados) => alterar(`/financeiro/${id}`, dados),
      remover: (id) => excluir(`/financeiro/${id}`),
    },

    usuarios: {
      listar: () => obter('/usuarios'),
      listarEquipe: () => obter('/usuarios', { apenasEquipe: true }),
      obter: (id) => obter(`/usuarios/${id}`),
      criar: (dados) => enviar('/usuarios', dados),
      atualizar: (id, dados) => alterar(`/usuarios/${id}`, dados),
      definirAtivo: (id, ativo) => alterar(`/usuarios/${id}`, { ativo }),
    },

    painel: {
      resumo: () => obter('/painel/resumo'),
      pendencias: (limite) => obter('/painel/pendencias', { limite }),
      analitico: (meses) => obter('/painel/analitico', { meses }),
    },

    portal: {
      visaoGeral: () => obter('/portal/visao-geral'),
      processo: (_clienteId, processoId) => obter(`/portal/processos/${processoId}`),
      documentos: () => obter('/portal/documentos'),
      enviarDocumento: (_clienteId, documentoId, arquivo) =>
        enviar(`/portal/documentos/${documentoId}/envio`, arquivo),
    },
  }
}
