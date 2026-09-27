import { ErroDeServico } from '@/services/erros'
import { supabase } from './cliente'
import { invocar } from './funcoes'

/** Mesmos formatos aceitos pelo bucket `documents` e pelo banco. */
const MIME_POR_EXTENSAO: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
}

function extensaoDe(nome: string): string {
  return nome.split('.').pop()?.toLowerCase() ?? ''
}

/**
 * Envia o arquivo de um documento.
 *
 * 1. grava no bucket privado, em `<cliente>/<documento>/<aleatório>.<ext>` —
 *    a policy do Storage só aceita o cliente dono de um documento aberto para
 *    envio, ou a equipe;
 * 2. a Edge Function `document-upload` confere formato, tamanho e antivírus e
 *    registra o envio no banco (que dispara histórico e avisos).
 */
export async function enviarArquivoDocumento(clienteId: string, documentoId: string, arquivo: File): Promise<void> {
  const extensao = extensaoDe(arquivo.name)
  // Alguns sistemas não informam o tipo de fotos HEIC: deduz pela extensão.
  const mime = arquivo.type || MIME_POR_EXTENSAO[extensao] || ''
  if (!Object.values(MIME_POR_EXTENSAO).includes(mime)) {
    throw new ErroDeServico('Formato não aceito. Envie um PDF ou uma foto em JPG, PNG ou HEIC.', 'invalido', 422)
  }

  const caminho = `${clienteId}/${documentoId}/${crypto.randomUUID()}.${extensao || 'bin'}`
  const { error } = await supabase().storage.from('documents').upload(caminho, arquivo, {
    contentType: mime,
    upsert: false,
  })
  if (error) {
    const status = 'statusCode' in error ? String(error.statusCode) : ''
    if (status === '413' || /size|large/i.test(error.message)) {
      throw new ErroDeServico('O arquivo excede o limite de 10 MB.', 'invalido', 413)
    }
    if (/mime|type/i.test(error.message)) {
      throw new ErroDeServico('Formato não aceito. Envie um PDF ou uma foto em JPG, PNG ou HEIC.', 'invalido', 422)
    }
    if (status === '403' || /policy|security/i.test(error.message)) {
      throw new ErroDeServico('Este documento não está aberto para envio.', 'invalido', 422)
    }
    throw new ErroDeServico('Não foi possível enviar o arquivo.', 'desconhecido')
  }

  await invocar('document-upload', {
    documentoId,
    caminho,
    nome: arquivo.name,
    tamanhoBytes: arquivo.size,
    mime,
  })
}
