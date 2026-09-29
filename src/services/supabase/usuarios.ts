import type { ServicoUsuarios } from '@/services/contratos'
import type { Usuario } from '@/types/domain'
import type { Tables } from './database.types'
import { supabase } from './cliente'
import { conferir, exigir } from './erros'
import { invocar } from './funcoes'
import { paraUsuario } from './mapeadores'

/** Perfis por id, para montar `responsavel` nas listas. */
export async function carregarUsuarios(ids: Array<string | undefined>): Promise<Map<string, Usuario>> {
  const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (unicos.length === 0) return new Map()
  const linhas = exigir(await supabase().from('profiles').select('*').in('id', unicos))
  return new Map(linhas.map((linha) => [linha.id, paraUsuario(linha)]))
}

export function criarUsuarios(): ServicoUsuarios {
  return {
    async listar() {
      const linhas = exigir(await supabase().from('profiles').select('*').order('full_name'))
      return linhas.map(paraUsuario)
    },

    async listarEquipe() {
      const linhas = exigir(
        await supabase().from('profiles').select('*').neq('role', 'cliente').eq('active', true).order('full_name'),
      )
      return linhas.map(paraUsuario)
    },

    async obter(id) {
      return paraUsuario(exigir(await supabase().from('profiles').select('*').eq('id', id).maybeSingle()))
    },

    // Contas do Auth só pelo servidor: Edge Function `admin-users`.
    async criar(dados) {
      return paraUsuario(await invocar<Tables<'profiles'>>('admin-users', { acao: 'criar', dados }))
    },

    async atualizar(id, dados) {
      return paraUsuario(await invocar<Tables<'profiles'>>('admin-users', { acao: 'atualizar', id, dados }))
    },

    async definirAtivo(id, ativo) {
      return paraUsuario(await invocar<Tables<'profiles'>>('admin-users', { acao: 'definir_ativo', id, ativo }))
    },

    // Só o nome da própria conta; papel e ativação continuam com o administrador.
    async atualizarMeuNome(nome) {
      conferir(await supabase().rpc('update_my_profile', { p_full_name: nome.trim() }))
      const { data } = await supabase().auth.getUser()
      return paraUsuario(exigir(await supabase().from('profiles').select('*').eq('id', data.user?.id ?? '').maybeSingle()))
    },
  }
}
