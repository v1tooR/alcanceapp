import type { Session } from '@supabase/supabase-js'
import { ErroDeServico } from '@/services/erros'
import type { ServicoAutenticacao } from '@/services/contratos'
import type { SessaoUsuario } from '@/types/domain'
import { supabase } from './cliente'
import { traduzirErro } from './erros'
import { paraUsuario } from './mapeadores'

const acessoDesativado = () =>
  new ErroDeServico('Este acesso está desativado. Fale com a coordenação.', 'nao_autorizado', 403)

/** Perfil da sessão; encerra a sessão se a conta não tem perfil ativo. */
async function montarSessao(sessao: Session): Promise<SessaoUsuario> {
  const { data: perfil, error } = await supabase()
    .from('profiles')
    .select('*')
    .eq('id', sessao.user.id)
    .maybeSingle()
  if (error) throw traduzirErro(error)
  if (!perfil || !perfil.active) {
    await supabase().auth.signOut()
    throw acessoDesativado()
  }
  return {
    usuario: paraUsuario(perfil),
    expiraEm: new Date((sessao.expires_at ?? 0) * 1000).toISOString(),
  }
}

export function criarAutenticacao(): ServicoAutenticacao {
  return {
    async entrar({ email, senha }) {
      const { data, error } = await supabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      })
      if (error || !data.session) {
        if (error?.code === 'user_banned') throw acessoDesativado()
        if (!error?.status) throw new ErroDeServico('Falha de conexão. Verifique sua internet.', 'indisponivel')
        // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta.
        throw new ErroDeServico('E-mail ou senha incorretos.', 'nao_autenticado', 401)
      }
      const sessao = await montarSessao(data.session)
      void supabase().rpc('touch_last_access')
      return sessao
    },

    async sair() {
      await supabase().auth.signOut()
    },

    async sessaoAtual() {
      const { data } = await supabase().auth.getSession()
      if (!data.session) return null
      try {
        return await montarSessao(data.session)
      } catch {
        return null
      }
    },

    async solicitarRecuperacaoSenha(email) {
      const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/definir-senha`,
      })
      // Resposta idêntica exista ou não o e-mail; só falha de rede aparece.
      if (error && !error.status) {
        throw new ErroDeServico('Falha de conexão. Verifique sua internet.', 'indisponivel')
      }
    },

    async definirNovaSenha(senha) {
      const { data: atual } = await supabase().auth.getSession()
      if (!atual.session) {
        throw new ErroDeServico(
          'O link expirou ou já foi usado. Peça um novo convite ou uma nova recuperação de senha.',
          'nao_autenticado',
          401,
        )
      }
      const { error } = await supabase().auth.updateUser({ password: senha })
      if (error) {
        if (error.code === 'weak_password') {
          throw new ErroDeServico('Senha fraca. Use ao menos 8 caracteres, misturando letras e números.', 'invalido', 422)
        }
        if (error.code === 'same_password') {
          throw new ErroDeServico('A nova senha deve ser diferente da atual.', 'invalido', 422)
        }
        throw new ErroDeServico('Não foi possível definir a senha. Tente novamente.', 'desconhecido')
      }
      const sessao = await montarSessao(atual.session)
      void supabase().rpc('touch_last_access')
      return sessao
    },
  }
}
