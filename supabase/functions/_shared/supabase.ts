import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ErroExibivel, naoAutenticado, naoAutorizado } from './http.ts'

const URL = Deno.env.get('SUPABASE_URL')!
const CHAVE_ANONIMA = Deno.env.get('SUPABASE_ANON_KEY')!
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export type Papel = 'super_admin' | 'gestor' | 'analista' | 'cliente'

export interface Perfil {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: Papel
  job_title: string | null
  active: boolean
  client_id: string | null
  created_at: string
  last_access_at: string | null
}

export interface Chamador {
  perfil: Perfil
  /** Cliente com o JWT de quem chamou: a RLS vale como no front-end. */
  comoUsuario: SupabaseClient
  /** Cliente com service role; as escritas levam o autor para a auditoria. */
  comoServico: SupabaseClient
}

const semSessao = { auth: { persistSession: false, autoRefreshToken: false } }

/** Service role sem autor associado — só para leituras internas. */
export function clienteServico(autorId?: string): SupabaseClient {
  return createClient(URL, CHAVE_SERVICO, {
    ...semSessao,
    global: { headers: autorId ? { 'x-actor-id': autorId } : {} },
  })
}

/** Identifica quem chamou e confere se a conta está ativa. */
export async function identificarChamador(req: Request): Promise<Chamador> {
  const autorizacao = req.headers.get('Authorization') ?? ''
  const token = autorizacao.replace(/^Bearer\s+/i, '')
  if (!token) throw naoAutenticado()

  const servico = clienteServico()
  const { data, error } = await servico.auth.getUser(token)
  if (error || !data.user) throw naoAutenticado()

  const { data: perfil } = await servico.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  if (!perfil || !perfil.active) throw naoAutorizado()

  return {
    perfil: perfil as Perfil,
    comoUsuario: createClient(URL, CHAVE_ANONIMA, {
      ...semSessao,
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
    comoServico: clienteServico(data.user.id),
  }
}

export function exigirPapel(chamador: Chamador, ...papeis: Papel[]) {
  if (!papeis.includes(chamador.perfil.role)) throw naoAutorizado()
}

export const PAPEIS_EQUIPE: Papel[] = ['super_admin', 'gestor', 'analista']

/**
 * Converte um erro do PostgREST em erro exibível quando ele é uma regra de
 * negócio do banco (SQLSTATE da classe AL); o resto vira erro genérico.
 */
export function erroDoBanco(erro: { code?: string; message?: string } | null): never {
  const status: Record<string, number> = { AL403: 403, AL404: 404, AL409: 409, AL422: 422 }
  if (erro?.code && erro.code in status) throw new ErroExibivel(erro.message ?? 'Ação não permitida.', status[erro.code])
  throw new Error(`Erro do banco: ${erro?.code} ${erro?.message}`)
}

/** Registra um evento explícito na auditoria (autor vem do cabeçalho x-actor-id). */
export async function auditar(
  chamador: Chamador,
  acao: string,
  entidade: string,
  entidadeId: string,
  metadados?: Record<string, unknown>,
) {
  const { error } = await chamador.comoServico.rpc('audit_event', {
    p_action: acao,
    p_entity: entidade,
    p_entity_id: entidadeId,
    p_metadata: metadados ?? null,
  })
  if (error) console.error('Falha ao auditar', acao, error)
}
