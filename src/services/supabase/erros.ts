import { FunctionsFetchError, FunctionsHttpError, type PostgrestError } from '@supabase/supabase-js'
import {
  ROTULO_STATUS_DOCUMENTO,
  ROTULO_STATUS_ETAPA,
  ROTULO_STATUS_PROCESSO,
  ROTULO_STATUS_SUBPROCESSO,
} from '@/lib/rotulos'
import { ErroDeServico, transicaoInvalida, type CodigoErro } from '@/services/erros'

/**
 * Tradução de erros do Supabase para `ErroDeServico`.
 *
 * Só viram mensagem exibível as regras de negócio do banco (SQLSTATE da
 * classe `AL`, escritas para o usuário) e as respostas das Edge Functions
 * marcadas com `exibivel: true`. O resto vira texto genérico, para não vazar
 * detalhes internos nem dados pessoais — ver src/lib/privacidade.ts.
 */

const CODIGOS_NEGOCIO: Record<string, [CodigoErro, number]> = {
  AL403: ['nao_autorizado', 403],
  AL404: ['nao_encontrado', 404],
  AL409: ['conflito', 409],
  AL422: ['invalido', 422],
}

const ROTULOS_POR_ENTIDADE: Record<string, Record<string, string>> = {
  process: ROTULO_STATUS_PROCESSO,
  subprocess: ROTULO_STATUS_SUBPROCESSO,
  step: ROTULO_STATUS_ETAPA,
  document: ROTULO_STATUS_DOCUMENTO,
}

function ehErroPostgrest(erro: unknown): erro is PostgrestError {
  return typeof erro === 'object' && erro !== null && 'code' in erro && 'message' in erro && 'details' in erro
}

export function traduzirErro(erro: unknown): ErroDeServico {
  if (erro instanceof ErroDeServico) return erro

  if (ehErroPostgrest(erro)) {
    const negocio = CODIGOS_NEGOCIO[erro.code]
    if (negocio) {
      // Transição de status: a mensagem usa os rótulos da interface.
      try {
        const detalhe = JSON.parse(erro.details || '{}') as { entity?: string; from?: string; to?: string }
        const rotulos = detalhe.entity ? ROTULOS_POR_ENTIDADE[detalhe.entity] : undefined
        if (rotulos && detalhe.from && detalhe.to) {
          return transicaoInvalida(rotulos[detalhe.from] ?? detalhe.from, rotulos[detalhe.to] ?? detalhe.to)
        }
      } catch {
        // detalhe não é JSON: fica a mensagem do banco
      }
      return new ErroDeServico(erro.message, negocio[0], negocio[1])
    }

    switch (erro.code) {
      case 'PGRST116':
        return new ErroDeServico('Registro não encontrado.', 'nao_encontrado', 404)
      case '23505':
        return new ErroDeServico('Já existe um registro com estes dados.', 'conflito', 409)
      case '23514':
      case '23502':
      case '22P02':
      case '23503':
        return new ErroDeServico('Dados inválidos. Revise os campos e tente novamente.', 'invalido', 422)
      case '42501':
        return new ErroDeServico('Você não tem permissão para esta ação.', 'nao_autorizado', 403)
      case 'PGRST301':
      case 'PGRST303':
        return new ErroDeServico('Sua sessão expirou. Entre novamente.', 'nao_autenticado', 401)
    }
    return new ErroDeServico('Não foi possível concluir a ação.', 'desconhecido')
  }

  if (erro instanceof FunctionsFetchError || erro instanceof TypeError) {
    return new ErroDeServico('Falha de conexão. Verifique sua internet.', 'indisponivel')
  }

  return new ErroDeServico('Não foi possível concluir a ação.', 'desconhecido')
}

/** Resposta de erro de uma Edge Function: `{ mensagem, exibivel }`. */
export async function traduzirErroDeFuncao(erro: unknown): Promise<ErroDeServico> {
  if (erro instanceof FunctionsHttpError) {
    const resposta = erro.context as Response
    const status = resposta.status
    const codigo: CodigoErro =
      status === 401 ? 'nao_autenticado'
      : status === 403 ? 'nao_autorizado'
      : status === 404 ? 'nao_encontrado'
      : status === 409 ? 'conflito'
      : status === 422 ? 'invalido'
      : status === 503 ? 'indisponivel'
      : 'desconhecido'
    try {
      const corpo = (await resposta.json()) as { mensagem?: string; exibivel?: boolean }
      if (corpo.exibivel && corpo.mensagem) return new ErroDeServico(corpo.mensagem, codigo, status)
    } catch {
      // corpo não é JSON
    }
    return new ErroDeServico('Não foi possível concluir a ação.', codigo, status)
  }
  return traduzirErro(erro)
}

/** Devolve `data` ou lança o erro traduzido. */
export function exigir<T>(resultado: { data: T; error: unknown }): NonNullable<T> {
  if (resultado.error) throw traduzirErro(resultado.error)
  if (resultado.data === null || resultado.data === undefined) {
    throw new ErroDeServico('Registro não encontrado.', 'nao_encontrado', 404)
  }
  return resultado.data as NonNullable<T>
}

/** Só confere o erro (operações sem retorno). */
export function conferir(resultado: { error: unknown }): void {
  if (resultado.error) throw traduzirErro(resultado.error)
}
