import type { PapelUsuario } from '@/types/domain'

/**
 * Permissões de **interface**.
 *
 * IMPORTANTE: estas regras melhoram a experiência escondendo o que o usuário
 * não pode usar. A autorização efetiva de acesso a dados é responsabilidade do
 * backend — nenhuma decisão de segurança pode depender só deste arquivo.
 */

export const PERMISSOES = [
  'clientes.ver',
  'clientes.criar',
  'clientes.editar',
  'processos.ver',
  'processos.criar',
  'processos.editar',
  'documentos.ver',
  'documentos.solicitar',
  'documentos.analisar',
  'movimentacoes.registrar',
  'calendario.ver',
  'calendario.editar',
  'notificacoes.ver',
  'notificacoes.enviar',
  'financeiro.ver',
  'financeiro.editar',
  'equipe.ver',
  'equipe.editar',
  'configuracoes.ver',
  'dados.internos.ver',
  'portal.ver',
] as const

export type Permissao = (typeof PERMISSOES)[number]

const PERMISSOES_OPERACIONAIS: Permissao[] = [
  'clientes.ver',
  'clientes.criar',
  'clientes.editar',
  'processos.ver',
  'processos.criar',
  'processos.editar',
  'documentos.ver',
  'documentos.solicitar',
  'documentos.analisar',
  'movimentacoes.registrar',
  'calendario.ver',
  'calendario.editar',
  'notificacoes.ver',
  'notificacoes.enviar',
  'dados.internos.ver',
]

const MAPA_PERMISSOES: Record<PapelUsuario, readonly Permissao[]> = {
  super_admin: PERMISSOES,
  gestor: [
    ...PERMISSOES_OPERACIONAIS,
    'financeiro.ver',
    'financeiro.editar',
    'equipe.ver',
  ],
  analista: PERMISSOES_OPERACIONAIS,
  cliente: ['portal.ver'],
}

export function temPermissao(papel: PapelUsuario | undefined, permissao: Permissao): boolean {
  if (!papel) return false
  return MAPA_PERMISSOES[papel].includes(permissao)
}

export function temAlgumaPermissao(
  papel: PapelUsuario | undefined,
  permissoes: Permissao[],
): boolean {
  return permissoes.some((permissao) => temPermissao(papel, permissao))
}

export function ehEquipe(papel: PapelUsuario | undefined): boolean {
  return papel === 'super_admin' || papel === 'gestor' || papel === 'analista'
}

export function ehCliente(papel: PapelUsuario | undefined): boolean {
  return papel === 'cliente'
}

/** Rota inicial de cada perfil após a autenticação. */
export function rotaInicial(papel: PapelUsuario | undefined): string {
  if (ehCliente(papel)) return '/portal'
  if (ehEquipe(papel)) return '/app'
  return '/entrar'
}

/** Papéis que um usuário pode atribuir a outro (nunca acima do próprio). */
export function papeisAtribuiveis(papel: PapelUsuario | undefined): PapelUsuario[] {
  if (papel === 'super_admin') return ['super_admin', 'gestor', 'analista', 'cliente']
  if (papel === 'gestor') return ['analista', 'cliente']
  return []
}
