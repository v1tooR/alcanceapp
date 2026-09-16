import { describe, expect, it } from 'vitest'
import {
  clientePodeEnviar,
  documentoPendenteDoCliente,
  aguardaAnalise,
  podeMudarStatusDocumento,
  podeMudarStatusEtapa,
  podeMudarStatusProcesso,
  podeMudarStatusSubprocesso,
  progressoProcesso,
  progressoSubprocesso,
  proximaEtapa,
  statusProcessoAtivo,
  statusSubprocessoFinalizado,
  statusSugeridoProcesso,
} from '@/lib/workflow'
import type { Etapa, StatusEtapa } from '@/types/domain'

function etapa(status: StatusEtapa, ordem = 0): Etapa {
  return {
    id: `etp-${ordem}-${status}`,
    subprocessoId: 'sub-1',
    titulo: `Etapa ${ordem}`,
    ordem,
    status,
    visivelCliente: true,
  }
}

describe('transições de processo', () => {
  it('permite avançar de em_avaliacao para em_andamento', () => {
    expect(podeMudarStatusProcesso('em_avaliacao', 'em_andamento')).toBe(true)
  })

  it('bloqueia reabrir um processo cancelado', () => {
    expect(podeMudarStatusProcesso('cancelado', 'em_andamento')).toBe(false)
  })

  it('considera o mesmo status como transição válida (operação idempotente)', () => {
    expect(podeMudarStatusProcesso('concluido', 'concluido')).toBe(true)
  })

  it('só permite arquivar depois de concluir', () => {
    expect(podeMudarStatusProcesso('concluido', 'arquivado')).toBe(true)
    expect(podeMudarStatusProcesso('aguardando_cliente', 'arquivado')).toBe(false)
  })

  it('classifica corretamente processos ativos', () => {
    expect(statusProcessoAtivo('em_andamento')).toBe(true)
    expect(statusProcessoAtivo('arquivado')).toBe(false)
  })
})

describe('transições de subprocesso', () => {
  it('não permite sair de deferido', () => {
    expect(podeMudarStatusSubprocesso('deferido', 'em_andamento')).toBe(false)
  })

  it('não reabre um indeferido — o recurso é um subprocesso próprio', () => {
    expect(podeMudarStatusSubprocesso('indeferido', 'em_andamento')).toBe(false)
    expect(podeMudarStatusSubprocesso('indeferido', 'aguardando_orgao')).toBe(false)
  })

  it('permite reativar um subprocesso marcado como não aplicável', () => {
    expect(podeMudarStatusSubprocesso('nao_aplicavel', 'nao_iniciado')).toBe(true)
  })

  it('reconhece os estados finais', () => {
    expect(statusSubprocessoFinalizado('deferido')).toBe(true)
    expect(statusSubprocessoFinalizado('nao_aplicavel')).toBe(true)
    expect(statusSubprocessoFinalizado('aguardando_orgao')).toBe(false)
  })
})

describe('transições de etapa', () => {
  it('permite reabrir uma etapa concluída por engano', () => {
    expect(podeMudarStatusEtapa('concluida', 'em_andamento')).toBe(true)
  })

  it('não permite pular de concluída direto para bloqueada', () => {
    expect(podeMudarStatusEtapa('concluida', 'bloqueada')).toBe(false)
  })
})

describe('transições de documento', () => {
  it('não deixa aprovar um documento apenas solicitado', () => {
    expect(podeMudarStatusDocumento('solicitado', 'aprovado')).toBe(false)
  })

  it('permite aprovar depois do envio', () => {
    expect(podeMudarStatusDocumento('enviado', 'aprovado')).toBe(true)
    expect(podeMudarStatusDocumento('em_analise', 'aprovado')).toBe(true)
  })

  it('só libera envio do cliente quando a equipe solicitou', () => {
    expect(clientePodeEnviar('solicitado')).toBe(true)
    expect(clientePodeEnviar('reenvio_solicitado')).toBe(true)
    expect(clientePodeEnviar('em_analise')).toBe(false)
    expect(clientePodeEnviar('aprovado')).toBe(false)
  })

  it('separa o que aguarda a equipe do que aguarda o cliente', () => {
    expect(aguardaAnalise('enviado')).toBe(true)
    expect(aguardaAnalise('solicitado')).toBe(false)
    expect(documentoPendenteDoCliente('reenvio_solicitado')).toBe(true)
    expect(documentoPendenteDoCliente('enviado')).toBe(false)
  })

  it('depois de reprovado, o caminho é pedir reenvio', () => {
    expect(podeMudarStatusDocumento('reprovado', 'reenvio_solicitado')).toBe(true)
    expect(podeMudarStatusDocumento('reprovado', 'aprovado')).toBe(false)
  })
})

describe('progresso', () => {
  it('ignora etapas não aplicáveis no numerador e no denominador', () => {
    const resultado = progressoSubprocesso([
      etapa('concluida', 0),
      etapa('nao_aplicavel', 1),
      etapa('pendente', 2),
    ])
    expect(resultado.aplicaveis).toBe(2)
    expect(resultado.concluidas).toBe(1)
    expect(resultado.percentual).toBe(50)
  })

  it('retorna zero quando não há etapas aplicáveis', () => {
    expect(progressoSubprocesso([etapa('nao_aplicavel', 0)]).percentual).toBe(0)
    expect(progressoSubprocesso([]).percentual).toBe(0)
  })

  it('desconsidera subprocessos cancelados no progresso do processo', () => {
    const progresso = progressoProcesso([
      { status: 'em_andamento', etapas: [etapa('concluida', 0), etapa('pendente', 1)] },
      { status: 'cancelado', etapas: [etapa('pendente', 0), etapa('pendente', 1)] },
    ])
    expect(progresso).toBe(50)
  })
})

describe('próxima etapa', () => {
  it('prioriza a etapa em andamento', () => {
    const etapas = [etapa('pendente', 0), etapa('em_andamento', 1)]
    expect(proximaEtapa(etapas)?.ordem).toBe(1)
  })

  it('cai para a primeira pendente quando nada está em andamento', () => {
    const etapas = [etapa('concluida', 0), etapa('pendente', 1), etapa('pendente', 2)]
    expect(proximaEtapa(etapas)?.ordem).toBe(1)
  })

  it('não retorna etapa quando tudo está concluído', () => {
    expect(proximaEtapa([etapa('concluida', 0)])).toBeUndefined()
  })
})

describe('status sugerido do processo', () => {
  it('sugere concluído quando todos os subprocessos terminaram', () => {
    expect(statusSugeridoProcesso([{ status: 'deferido' }, { status: 'nao_aplicavel' }])).toBe(
      'concluido',
    )
  })

  it('sugere aguardando cliente quando todos os ativos esperam documentos', () => {
    expect(
      statusSugeridoProcesso([{ status: 'aguardando_documentos' }, { status: 'deferido' }]),
    ).toBe('aguardando_cliente')
  })

  it('sugere aguardando órgão quando todos os ativos estão protocolados', () => {
    expect(statusSugeridoProcesso([{ status: 'aguardando_orgao' }])).toBe('aguardando_orgao')
  })

  it('sugere em andamento quando há situações misturadas', () => {
    expect(
      statusSugeridoProcesso([{ status: 'aguardando_documentos' }, { status: 'aguardando_orgao' }]),
    ).toBe('em_andamento')
  })

  it('não sugere nada para um processo sem subprocessos', () => {
    expect(statusSugeridoProcesso([])).toBeNull()
  })
})
