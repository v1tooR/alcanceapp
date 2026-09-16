export type CodigoErro =
  | 'nao_autenticado'
  | 'nao_autorizado'
  | 'nao_encontrado'
  | 'conflito'
  | 'invalido'
  | 'indisponivel'
  | 'desconhecido'

/**
 * Erro de serviço com mensagem já revisada para exibição.
 *
 * A interface só mostra ao usuário mensagens de `ErroDeServico`; qualquer outra
 * falha vira um texto genérico, para não vazar identificadores, caminhos ou
 * trechos de dados pessoais — ver `src/lib/privacidade.ts`.
 */
export class ErroDeServico extends Error {
  override readonly name = 'ErroDeServico'
  readonly codigo: CodigoErro
  readonly statusHttp?: number

  constructor(mensagem: string, codigo: CodigoErro = 'desconhecido', statusHttp?: number) {
    super(mensagem)
    this.codigo = codigo
    this.statusHttp = statusHttp
  }
}

export function naoEncontrado(recurso: string): ErroDeServico {
  return new ErroDeServico(`${recurso} não encontrado.`, 'nao_encontrado', 404)
}

export function naoAutorizado(): ErroDeServico {
  return new ErroDeServico('Você não tem permissão para esta ação.', 'nao_autorizado', 403)
}

export function transicaoInvalida(de: string, para: string): ErroDeServico {
  return new ErroDeServico(
    `Não é possível mudar de “${de}” para “${para}”.`,
    'invalido',
    422,
  )
}
