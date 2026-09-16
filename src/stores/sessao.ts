import { create } from 'zustand'
import { servicos } from '@/services'
import type { Credenciais } from '@/services/contratos'
import type { Usuario } from '@/types/domain'

interface EstadoSessao {
  usuario: Usuario | null
  /** `true` enquanto a sessão inicial ainda não foi verificada. */
  inicializando: boolean
  entrando: boolean
  erro: string | null
  restaurar: () => Promise<void>
  entrar: (credenciais: Credenciais) => Promise<Usuario>
  sair: () => Promise<void>
  limparErro: () => void
}

/**
 * Sessão do usuário **em memória**.
 *
 * O adaptador simulado guarda apenas um identificador de sessão no
 * `sessionStorage` (some ao fechar a aba). Nenhum dado pessoal é persistido no
 * navegador. Na integração real, a sessão deve vir de cookie `httpOnly` ou do
 * SDK do provedor de autenticação — ver `docs/integracoes.md`.
 */
export const usarSessao = create<EstadoSessao>()((definir) => ({
  usuario: null,
  inicializando: true,
  entrando: false,
  erro: null,

  restaurar: async () => {
    try {
      const sessao = await servicos.autenticacao.sessaoAtual()
      definir({ usuario: sessao?.usuario ?? null, inicializando: false })
    } catch {
      definir({ usuario: null, inicializando: false })
    }
  },

  entrar: async (credenciais) => {
    definir({ entrando: true, erro: null })
    try {
      const sessao = await servicos.autenticacao.entrar(credenciais)
      definir({ usuario: sessao.usuario, entrando: false })
      return sessao.usuario
    } catch (erro) {
      const mensagem =
        erro instanceof Error && erro.name === 'ErroDeServico'
          ? erro.message
          : 'Não foi possível entrar. Tente novamente.'
      definir({ entrando: false, erro: mensagem })
      throw erro
    }
  },

  sair: async () => {
    await servicos.autenticacao.sair()
    definir({ usuario: null, erro: null })
  },

  limparErro: () => definir({ erro: null }),
}))

/** Atalho para o papel do usuário logado. */
export function usarPapel() {
  return usarSessao((estado) => estado.usuario?.papel)
}
