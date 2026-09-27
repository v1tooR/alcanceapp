import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ErroDeServico } from '@/services/erros'
import type { Database } from './database.types'

/**
 * Cliente único do Supabase.
 *
 * A sessão fica no `sessionStorage`: some ao fechar a aba, como já era a regra
 * do app (nenhum dado pessoal persistido no navegador). Links de convite e de
 * recuperação de senha chegam com o token na URL (`detectSessionInUrl`).
 *
 * Criado sob demanda: sem as variáveis de ambiente, as telas mostram um erro
 * de configuração em vez de quebrar na importação.
 */

let instancia: SupabaseClient<Database> | null = null

export function supabase(): SupabaseClient<Database> {
  if (instancia) return instancia

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !chave) {
    throw new ErroDeServico(
      'O app não está configurado para acessar o servidor. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      'indisponivel',
    )
  }

  instancia = createClient<Database>(url, chave, {
    auth: {
      storage: typeof window === 'undefined' ? undefined : window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  })
  return instancia
}
