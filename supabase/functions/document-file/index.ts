/**
 * Abre o arquivo de um documento — somente equipe.
 *
 * POST { documentoId } → { url, expiraEmSegundos }
 *
 * O bucket não tem leitura pela API pública: esta função confere a permissão,
 * registra o acesso na auditoria (dado sensível de saúde, LGPD) e devolve uma
 * URL assinada de curta duração.
 */
import { ErroExibivel, servir, uuid } from '../_shared/http.ts'
import { obterArmazenamento } from '../_shared/integrations/registro.ts'
import { PAPEIS_EQUIPE, auditar, exigirPapel, identificarChamador } from '../_shared/supabase.ts'

servir(async (corpo, req) => {
  const chamador = await identificarChamador(req)
  exigirPapel(chamador, ...PAPEIS_EQUIPE)

  const documentoId = uuid(corpo.documentoId, 'documento')

  // Leitura com o JWT da equipe: a RLS confirma o acesso ao documento.
  const { data: documento } = await chamador.comoUsuario
    .from('documents')
    .select('id, file_path, is_sensitive')
    .eq('id', documentoId)
    .maybeSingle()
  if (!documento) throw new ErroExibivel('Documento não encontrado.', 404)
  if (!documento.file_path) throw new ErroExibivel('Este documento não tem arquivo disponível.', 404)

  const { registro, provedor } = await obterArmazenamento(chamador.comoServico)
  const segundos = Math.min(Math.max(Number(registro.config.signed_url_ttl_seconds ?? 60), 10), 600)
  const url = await provedor.urlAssinada(documento.file_path, segundos)

  await auditar(chamador, 'document.file_accessed', 'documents', documentoId, {
    sensitive: documento.is_sensitive,
    ttl_seconds: segundos,
  })

  return { url, expiraEmSegundos: segundos }
})
