/**
 * Respostas HTTP das Edge Functions.
 *
 * Contrato de erro esperado pelo front-end (docs/integracoes.md):
 *   { "mensagem": "Texto já revisado para o usuário", "exibivel": true }
 * Sem `exibivel: true`, a interface mostra um texto genérico.
 */

export const cabecalhosCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Erro com mensagem já revisada para exibição. */
export class ErroExibivel extends Error {
  constructor(
    mensagem: string,
    readonly status = 400,
  ) {
    super(mensagem)
  }
}

export const naoAutorizado = () => new ErroExibivel('Você não tem permissão para esta ação.', 403)
export const naoAutenticado = () => new ErroExibivel('Sua sessão expirou. Entre novamente.', 401)
export const naoEncontrado = (recurso: string) => new ErroExibivel(`${recurso} não encontrado.`, 404)

export function responderJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
  })
}

/** Envolve o handler: CORS, método, corpo JSON e tradução de erros. */
export function servir(tratar: (corpo: Record<string, unknown>, req: Request) => Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosCors })
    if (req.method !== 'POST') return responderJson({ mensagem: 'Método não permitido.', exibivel: true }, 405)

    try {
      const corpo = (await req.json().catch(() => ({}))) as Record<string, unknown>
      return responderJson(await tratar(corpo, req))
    } catch (erro) {
      if (erro instanceof ErroExibivel) {
        return responderJson({ mensagem: erro.message, exibivel: true }, erro.status)
      }
      // Detalhes só no log do servidor; nunca na resposta.
      console.error(erro)
      return responderJson({ mensagem: 'Não foi possível concluir a ação.', exibivel: false }, 500)
    }
  })
}

/* -- Validação simples de entrada ------------------------------------------ */

export function texto(valor: unknown, campo: string, opcoes: { min?: number; max?: number; opcional?: boolean } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (opcoes.opcional) return undefined
    throw new ErroExibivel(`Informe ${campo}.`, 422)
  }
  if (typeof valor !== 'string') throw new ErroExibivel(`Valor inválido para ${campo}.`, 422)
  const limpo = valor.trim()
  if (opcoes.min && limpo.length < opcoes.min) throw new ErroExibivel(`Informe ${campo}.`, 422)
  if (opcoes.max && limpo.length > opcoes.max) throw new ErroExibivel(`${campo} muito longo.`, 422)
  return limpo
}

export function uuid(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !/^[0-9a-f-]{36}$/i.test(valor)) {
    throw new ErroExibivel(`Identificador inválido: ${campo}.`, 422)
  }
  return valor
}

export const emailValido = (valor: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor)
