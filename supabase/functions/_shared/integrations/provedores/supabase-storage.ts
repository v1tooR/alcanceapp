import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProvedorArmazenamento } from '../tipos.ts'

/** Arquivos no Supabase Storage, em bucket privado. */
export function criarArmazenamentoSupabase(
  servico: SupabaseClient,
  config: Record<string, unknown>,
): ProvedorArmazenamento {
  const bucket = typeof config.bucket === 'string' ? config.bucket : 'documents'
  const urlInterna = Deno.env.get('SUPABASE_URL')!
  const urlPublica = Deno.env.get('SUPABASE_PUBLIC_URL') ?? urlInterna

  return {
    async baixar(caminho) {
      const { data, error } = await servico.storage.from(bucket).download(caminho)
      if (error || !data) throw new Error(`Arquivo não encontrado no Storage: ${caminho}`)
      return new Uint8Array(await data.arrayBuffer())
    },

    async remover(caminho) {
      const { error } = await servico.storage.from(bucket).remove([caminho])
      if (error) console.error('Falha ao remover arquivo', caminho, error)
    },

    async urlAssinada(caminho, segundos) {
      const { data, error } = await servico.storage.from(bucket).createSignedUrl(caminho, segundos)
      if (error || !data) throw new Error(`Falha ao assinar URL: ${error?.message}`)
      // O Storage monta a URL com o endereço interno da rede Docker.
      return data.signedUrl.replace(urlInterna, urlPublica)
    },

    async situacao() {
      const { data, error } = await servico.storage.getBucket(bucket)
      if (error || !data) return { disponivel: false, detalhe: `Bucket "${bucket}" não encontrado.` }
      return {
        disponivel: true,
        detalhe: `Bucket "${bucket}" ${data.public ? 'PÚBLICO (revise!)' : 'privado'}, limite de ${Math.round((data.file_size_limit ?? 0) / 1048576)} MB.`,
      }
    },
  }
}
