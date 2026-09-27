/**
 * Gestão da equipe (tela Equipe) — somente administrador geral.
 *
 * POST { acao: 'criar', dados }            → convida por e-mail e cria o perfil
 * POST { acao: 'atualizar', id, dados }    → edita perfil (e e-mail de login)
 * POST { acao: 'definir_ativo', id, ativo } → ativa/desativa o acesso
 *
 * Fica em Edge Function porque mexe em contas do Auth (service role).
 */
import { ErroExibivel, emailValido, naoEncontrado, servir, texto, uuid } from '../_shared/http.ts'
import { obterEmail } from '../_shared/integrations/registro.ts'
import {
  type Chamador,
  type Papel,
  type Perfil,
  PAPEIS_EQUIPE,
  auditar,
  exigirPapel,
  identificarChamador,
} from '../_shared/supabase.ts'

const BLOQUEIO_INDETERMINADO = '876000h' // ~100 anos

interface DadosUsuario {
  nome?: string
  email?: string
  telefone?: string | null
  papel?: Papel
  cargo?: string | null
  ativo?: boolean
}

function validar(dados: Record<string, unknown>, parcial: boolean): DadosUsuario {
  const saida: DadosUsuario = {}
  if (!parcial || 'nome' in dados) saida.nome = texto(dados.nome, 'o nome', { min: 3, max: 160 })
  if (!parcial || 'email' in dados) {
    const email = texto(dados.email, 'o e-mail', { max: 254 })!.toLowerCase()
    if (!emailValido(email)) throw new ErroExibivel('E-mail inválido.', 422)
    saida.email = email
  }
  if ('telefone' in dados) {
    const telefone = String(dados.telefone ?? '').replace(/\D/g, '')
    if (telefone && !/^\d{10,11}$/.test(telefone)) throw new ErroExibivel('Telefone inválido.', 422)
    saida.telefone = telefone || null
  }
  if (!parcial || 'papel' in dados) {
    if (!PAPEIS_EQUIPE.includes(dados.papel as Papel)) throw new ErroExibivel('Nível de acesso inválido.', 422)
    saida.papel = dados.papel as Papel
  }
  if ('cargo' in dados) saida.cargo = texto(dados.cargo, 'o cargo', { max: 80, opcional: true }) ?? null
  if ('ativo' in dados) saida.ativo = Boolean(dados.ativo)
  return saida
}

async function carregarPerfil(chamador: Chamador, id: string): Promise<Perfil> {
  const { data } = await chamador.comoServico.from('profiles').select('*').eq('id', id).maybeSingle()
  if (!data || data.role === 'cliente') throw naoEncontrado('Usuário')
  return data as Perfil
}

/** Impede que o sistema fique sem nenhum administrador geral ativo. */
async function garantirOutroAdministrador(chamador: Chamador, id: string) {
  const { count } = await chamador.comoServico
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .eq('active', true)
    .neq('id', id)
  if (!count) throw new ErroExibivel('É preciso manter ao menos um administrador geral ativo.', 409)
}

async function emailEmUso(chamador: Chamador, email: string, excetoId?: string) {
  let consulta = chamador.comoServico.from('profiles').select('id', { count: 'exact', head: true }).eq('email', email)
  if (excetoId) consulta = consulta.neq('id', excetoId)
  const { count } = await consulta
  return Boolean(count)
}

async function definirBloqueio(chamador: Chamador, id: string, ativo: boolean) {
  const { error } = await chamador.comoServico.auth.admin.updateUserById(id, {
    ban_duration: ativo ? 'none' : BLOQUEIO_INDETERMINADO,
  })
  if (error) throw new Error(`Falha ao atualizar bloqueio: ${error.message}`)
}

servir(async (corpo, req) => {
  const chamador = await identificarChamador(req)
  exigirPapel(chamador, 'super_admin')

  switch (corpo.acao) {
    case 'criar': {
      const dados = validar((corpo.dados ?? {}) as Record<string, unknown>, false)
      if (await emailEmUso(chamador, dados.email!)) {
        throw new ErroExibivel('Já existe um usuário com este e-mail.', 409)
      }

      const { registro, provedor } = await obterEmail(chamador.comoServico)
      const caminho = String(registro.config.invite_redirect_path ?? '/definir-senha')
      const { usuarioId } = await provedor.convidar(dados.email!, {
        nome: dados.nome!,
        redirecionarPara: `${Deno.env.get('SITE_URL')}${caminho}`,
      })

      const ativo = dados.ativo ?? true
      const { data, error } = await chamador.comoServico
        .from('profiles')
        .insert({
          id: usuarioId,
          full_name: dados.nome,
          email: dados.email,
          phone: dados.telefone ?? null,
          role: dados.papel,
          job_title: dados.cargo ?? null,
          active: ativo,
        })
        .select()
        .single()
      if (error) {
        // Sem perfil, a conta do Auth não serve para nada: desfaz.
        await chamador.comoServico.auth.admin.deleteUser(usuarioId)
        throw new Error(`Falha ao criar perfil: ${error.message}`)
      }
      if (!ativo) await definirBloqueio(chamador, usuarioId, false)

      await auditar(chamador, 'team_member.invited', 'profiles', usuarioId, { role: dados.papel })
      return data
    }

    case 'atualizar': {
      const id = uuid(corpo.id, 'usuário')
      const atual = await carregarPerfil(chamador, id)
      const dados = validar((corpo.dados ?? {}) as Record<string, unknown>, true)

      if (dados.papel && dados.papel !== atual.role) {
        if (id === chamador.perfil.id) throw new ErroExibivel('Você não pode alterar o seu próprio nível de acesso.', 422)
        if (atual.role === 'super_admin') await garantirOutroAdministrador(chamador, id)
      }
      if (dados.ativo === false && atual.active) {
        if (id === chamador.perfil.id) throw new ErroExibivel('Você não pode desativar o seu próprio acesso.', 422)
        if (atual.role === 'super_admin') await garantirOutroAdministrador(chamador, id)
      }

      if (dados.email && dados.email !== atual.email) {
        if (await emailEmUso(chamador, dados.email, id)) throw new ErroExibivel('Já existe um usuário com este e-mail.', 409)
        const { error } = await chamador.comoServico.auth.admin.updateUserById(id, { email: dados.email, email_confirm: true })
        if (error) throw new Error(`Falha ao trocar e-mail: ${error.message}`)
      }

      const alteracoes: Record<string, unknown> = {}
      if (dados.nome !== undefined) alteracoes.full_name = dados.nome
      if (dados.email !== undefined) alteracoes.email = dados.email
      if (dados.telefone !== undefined) alteracoes.phone = dados.telefone
      if (dados.papel !== undefined) alteracoes.role = dados.papel
      if (dados.cargo !== undefined) alteracoes.job_title = dados.cargo
      if (dados.ativo !== undefined) alteracoes.active = dados.ativo

      const { data, error } = await chamador.comoServico.from('profiles').update(alteracoes).eq('id', id).select().single()
      if (error) throw new Error(`Falha ao atualizar perfil: ${error.message}`)
      if (dados.ativo !== undefined && dados.ativo !== atual.active) await definirBloqueio(chamador, id, dados.ativo)
      return data
    }

    case 'definir_ativo': {
      const id = uuid(corpo.id, 'usuário')
      const ativo = Boolean(corpo.ativo)
      const atual = await carregarPerfil(chamador, id)
      if (!ativo && atual.active) {
        if (id === chamador.perfil.id) throw new ErroExibivel('Você não pode desativar o seu próprio acesso.', 422)
        if (atual.role === 'super_admin') await garantirOutroAdministrador(chamador, id)
      }
      const { data, error } = await chamador.comoServico.from('profiles').update({ active: ativo }).eq('id', id).select().single()
      if (error) throw new Error(`Falha ao atualizar perfil: ${error.message}`)
      await definirBloqueio(chamador, id, ativo)
      return data
    }

    default:
      throw new ErroExibivel('Ação desconhecida.', 422)
  }
})
