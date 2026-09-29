import type { SupabaseClient } from '@supabase/supabase-js'
import { ErroExibivel } from '../../http.ts'
import type { ProvedorEmail } from '../tipos.ts'

/**
 * E-mail pelo próprio Supabase Auth: o convite é enviado pelo SMTP configurado
 * no serviço de autenticação (GOTRUE_SMTP_*). Nenhum segredo passa por aqui.
 */
export function criarEmailSupabaseAuth(servico: SupabaseClient): ProvedorEmail {
  return {
    async convidar(email, { nome, redirecionarPara }) {
      const { data, error } = await servico.auth.admin.inviteUserByEmail(email, {
        data: { full_name: nome },
        redirectTo: redirecionarPara,
      })
      if (error || !data.user) {
        if (error?.status === 422 || /already/i.test(error?.message ?? '')) {
          throw new ErroExibivel('Já existe uma conta de acesso com este e-mail.', 409)
        }
        throw new Error(`Falha no convite: ${error?.message}`)
      }
      return { usuarioId: data.user.id }
    },

    async situacao() {
      // Docker local: o host SMTP é repassado às funções só para exibição.
      // Supabase hospedado: o SMTP fica no painel e não é visível daqui.
      const host = Deno.env.get('SMTP_HOST')
      return host
        ? { disponivel: true, detalhe: `SMTP configurado no serviço de autenticação (${host}).` }
        : {
            disponivel: true,
            detalhe: 'Envio pelo Supabase Auth. Confira o SMTP no painel do Supabase (Authentication → SMTP).',
          }
    },
  }
}
