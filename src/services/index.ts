import type { Servicos } from '@/services/contratos'
import { criarServicosSimulados } from '@/services/mock'
import { criarServicosHttp } from '@/services/http'

/**
 * Ponto único de acesso a dados.
 *
 * Nenhuma página importa `mock` ou `http` diretamente: elas dependem apenas dos
 * contratos. Trocar `VITE_MODO_DADOS` para `api` liga o back-end real sem
 * alterar componentes.
 */

export type ModoDados = 'simulado' | 'api'

export const MODO_DADOS: ModoDados =
  (import.meta.env.VITE_MODO_DADOS as ModoDados | undefined) ?? 'simulado'

const URL_API = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export const servicos: Servicos =
  MODO_DADOS === 'api' ? criarServicosHttp(URL_API) : criarServicosSimulados()

/** `true` enquanto a aplicação roda sobre dados fictícios de desenvolvimento. */
export const USANDO_DADOS_SIMULADOS = MODO_DADOS === 'simulado'

export * from '@/services/contratos'
export { ErroDeServico } from '@/services/erros'
