/**
 * Conclui o envio de um arquivo de documento — cliente (portal) ou equipe.
 *
 * O navegador grava o arquivo direto no bucket privado `documents` (a policy
 * do Storage só aceita o cliente dono de um documento aberto para envio, ou a
 * equipe) e depois chama esta função com o caminho gravado:
 *
 * POST { documentoId, caminho, nome, tamanhoBytes, mime }
 *
 * Aqui acontece o que não pode depender do navegador: verificação de
 * antivírus (quando a integração está ligada) e o registro no banco, que roda
 * com o JWT de quem enviou para as regras de acesso valerem.
 */
import { ErroExibivel, servir, texto, uuid } from '../_shared/http.ts'
import { obterAntivirus, obterArmazenamento } from '../_shared/integrations/registro.ts'
import { auditar, erroDoBanco, identificarChamador } from '../_shared/supabase.ts'

const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
const TAMANHO_MAXIMO = 10 * 1024 * 1024

servir(async (corpo, req) => {
  const chamador = await identificarChamador(req)

  const documentoId = uuid(corpo.documentoId, 'documento')
  const caminho = texto(corpo.caminho, 'o arquivo', { max: 500 })!
  const nome = texto(corpo.nome, 'o nome do arquivo', { max: 255 })!
  const tamanho = Number(corpo.tamanhoBytes)
  const mime = String(corpo.mime ?? '')

  const { provedor: armazenamento } = await obterArmazenamento(chamador.comoServico)

  const recusar = async (mensagem: string, status = 422): Promise<never> => {
    await armazenamento.remover(caminho)
    throw new ErroExibivel(mensagem, status)
  }

  // O prefixo completo (<cliente>/<documento>/) é conferido de novo no banco.
  if (caminho.split('/')[1] !== documentoId) {
    throw new ErroExibivel('Arquivo inválido para este documento.', 422)
  }
  if (!TIPOS_ACEITOS.includes(mime)) await recusar('Formato não aceito. Envie um PDF ou uma foto em JPG, PNG ou HEIC.')
  if (!(tamanho > 0 && tamanho <= TAMANHO_MAXIMO)) await recusar('O arquivo excede o limite de 10 MB.')

  const antivirus = await obterAntivirus(chamador.comoServico)
  if (antivirus) {
    const conteudo = await armazenamento.baixar(caminho)
    let resultado
    try {
      resultado = await antivirus.provedor.verificar(conteudo)
    } catch (erro) {
      console.error('Antivírus indisponível', erro)
      if (antivirus.registro.config.fail_closed !== false) {
        await recusar('A verificação de segurança está indisponível. Tente novamente em alguns minutos.', 503)
      }
    }
    if (resultado && !resultado.limpo) {
      await auditar(chamador, 'document.upload_blocked', 'documents', documentoId, { signature: resultado.assinatura })
      await recusar('O arquivo foi bloqueado pela verificação de segurança. Envie outro arquivo.')
    }
  }

  const { error } = await chamador.comoUsuario.rpc('register_document_upload', {
    p_id: documentoId,
    p_path: caminho,
    p_name: nome,
    p_size: tamanho,
    p_mime: mime,
  })
  if (error) {
    await armazenamento.remover(caminho)
    erroDoBanco(error)
  }

  return { ok: true }
})
