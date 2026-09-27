import { supabase } from './cliente'
import { traduzirErroDeFuncao } from './erros'

/**
 * Chamada a uma Edge Function com a sessão atual.
 *
 * Edge Functions ficam só para o que não pode rodar com a chave pública:
 * contas do Auth (equipe e acesso ao portal), arquivos (antivírus, URL
 * assinada com auditoria) e diagnóstico das integrações.
 */
export async function invocar<T>(nome: string, corpo: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().functions.invoke<T>(nome, { body: corpo })
  if (error) throw await traduzirErroDeFuncao(error)
  return data as T
}
