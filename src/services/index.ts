import type { Servicos } from '@/services/contratos'
import { criarServicosSupabase } from '@/services/supabase'

/**
 * Ponto único de acesso a dados.
 *
 * Nenhuma página importa o Supabase diretamente: elas dependem apenas dos
 * contratos em `contratos.ts`, implementados pelo adaptador em `supabase/`.
 * Configuração: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ver .env.example).
 */
export const servicos: Servicos = criarServicosSupabase()

export * from '@/services/contratos'
export { ErroDeServico } from '@/services/erros'
