/**
 * Liga e desliga o acesso de um cliente ao portal — equipe.
 *
 * POST { clienteId, ativo }
 *   ativo = true  → cria a conta e envia o convite (1ª vez) ou reativa a conta;
 *   ativo = false → desativa e bloqueia a conta, sem apagar nada.
 *
 * Fica em Edge Function porque cria contas no Auth (service role).
 */
import { ErroExibivel, naoEncontrado, servir, uuid } from '../_shared/http.ts'
import { obterEmail } from '../_shared/integrations/registro.ts'
import { PAPEIS_EQUIPE, auditar, exigirPapel, identificarChamador } from '../_shared/supabase.ts'

const BLOQUEIO_INDETERMINADO = '876000h'

servir(async (corpo, req) => {
  const chamador = await identificarChamador(req)
  exigirPapel(chamador, ...PAPEIS_EQUIPE)

  const clienteId = uuid(corpo.clienteId, 'cliente')
  const ativo = Boolean(corpo.ativo)
  const servico = chamador.comoServico

  const { data: cliente } = await servico
    .from('clients')
    .select('id, full_name, email, phone, portal_access_enabled')
    .eq('id', clienteId)
    .maybeSingle()
  if (!cliente) throw naoEncontrado('Cliente')

  const { data: conta } = await servico.from('profiles').select('*').eq('client_id', clienteId).maybeSingle()

  if (ativo) {
    if (conta) {
      // Mantém o login igual ao e-mail do cadastro.
      if (conta.email !== cliente.email) {
        const { count } = await servico
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('email', cliente.email)
          .neq('id', conta.id)
        if (count) throw new ErroExibivel('O e-mail deste cliente já é usado por outra conta de acesso.', 409)
        const { error } = await servico.auth.admin.updateUserById(conta.id, { email: cliente.email, email_confirm: true })
        if (error) throw new Error(`Falha ao trocar e-mail: ${error.message}`)
      }
      const { error } = await servico
        .from('profiles')
        .update({ active: true, email: cliente.email, full_name: cliente.full_name })
        .eq('id', conta.id)
      if (error) throw new Error(`Falha ao reativar: ${error.message}`)
      await servico.auth.admin.updateUserById(conta.id, { ban_duration: 'none' })
    } else {
      const { count } = await servico
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('email', cliente.email)
      if (count) throw new ErroExibivel('O e-mail deste cliente já é usado por outra conta de acesso.', 409)

      const { registro, provedor } = await obterEmail(servico)
      const caminho = String(registro.config.invite_redirect_path ?? '/definir-senha')
      const { usuarioId } = await provedor.convidar(cliente.email, {
        nome: cliente.full_name,
        redirecionarPara: `${Deno.env.get('SITE_URL')}${caminho}`,
      })

      const { error } = await servico.from('profiles').insert({
        id: usuarioId,
        full_name: cliente.full_name,
        email: cliente.email,
        phone: cliente.phone,
        role: 'cliente',
        client_id: clienteId,
        active: true,
      })
      if (error) {
        await servico.auth.admin.deleteUser(usuarioId)
        throw new Error(`Falha ao criar perfil do cliente: ${error.message}`)
      }
      await auditar(chamador, 'portal_access.invited', 'clients', clienteId)
    }
  } else if (conta) {
    const { error } = await servico.from('profiles').update({ active: false }).eq('id', conta.id)
    if (error) throw new Error(`Falha ao desativar: ${error.message}`)
    await servico.auth.admin.updateUserById(conta.id, { ban_duration: BLOQUEIO_INDETERMINADO })
  }

  const { data: atualizado, error } = await servico
    .from('clients')
    .update({ portal_access_enabled: ativo })
    .eq('id', clienteId)
    .select('id, portal_access_enabled')
    .single()
  if (error) throw new Error(`Falha ao atualizar cliente: ${error.message}`)
  return atualizado
})
