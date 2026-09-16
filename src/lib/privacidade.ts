import type { Documento, PapelUsuario } from '@/types/domain'
import { apenasDigitos, mascararCpf } from '@/lib/mascaras'
import { ehEquipe } from '@/lib/permissoes'

/**
 * Regras de exposição de dado pessoal na interface.
 *
 * O sistema trata laudos, informações de saúde e documentos de identificação.
 * Estas funções reduzem exposição indevida em listagens, notificações, títulos
 * de página e mensagens de erro. Não substituem controle de acesso no backend.
 */

/** `123.***.***-09` — suficiente para conferência, sem expor o documento. */
export function cpfParcial(cpf: string): string {
  const d = apenasDigitos(cpf)
  if (d.length !== 11) return '—'
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`
}

/** CPF completo apenas para a equipe; parcial em qualquer outro contexto. */
export function exibirCpf(cpf: string, papel: PapelUsuario | undefined): string {
  return ehEquipe(papel) ? mascararCpf(cpf) : cpfParcial(cpf)
}

/** `ma***@provedor.com.br` */
export function emailParcial(email: string): string {
  const [usuario, dominio] = email.split('@')
  if (!dominio) return '—'
  const visivel = usuario.slice(0, 2)
  return `${visivel}${'*'.repeat(Math.max(usuario.length - 2, 1))}@${dominio}`
}

/** `(11) *****-4321` */
export function telefoneParcial(telefone: string): string {
  const d = apenasDigitos(telefone)
  if (d.length < 10) return '—'
  return `(${d.slice(0, 2)}) *****-${d.slice(-4)}`
}

/**
 * Documentos sensíveis (laudos, informações de saúde) não podem aparecer
 * automaticamente em pré-visualizações. A interface exige uma ação explícita.
 */
export function exigeAcaoParaVisualizar(documento: Pick<Documento, 'sensivel'>): boolean {
  return documento.sensivel
}

/**
 * Texto seguro para notificação, título de aba e mensagem de erro.
 * Substitui o nome do documento sensível por uma descrição genérica.
 */
export function descricaoSeguraDocumento(
  documento: Pick<Documento, 'titulo' | 'sensivel'>,
): string {
  return documento.sensivel ? 'Documento com informação sensível' : documento.titulo
}

/**
 * Mensagem de erro exibível. Erros vindos de serviços podem conter identificadores
 * ou trechos de dados; a interface mostra apenas mensagens previamente aprovadas.
 */
export function mensagemErroSegura(erro: unknown, padrao = 'Não foi possível concluir a ação.'): string {
  if (erro instanceof Error && erro.name === 'ErroDeServico') return erro.message
  return padrao
}

/** Primeiro nome — usado em saudações, evitando expor o nome completo em telas compartilhadas. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome
}
