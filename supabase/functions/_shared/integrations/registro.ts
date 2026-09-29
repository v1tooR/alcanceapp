import type { SupabaseClient } from '@supabase/supabase-js'
import { criarClamAv } from './provedores/clamav.ts'
import { criarEmailSupabaseAuth } from './provedores/supabase-auth-email.ts'
import { criarArmazenamentoSupabase } from './provedores/supabase-storage.ts'
import type {
  ProvedorAntivirus,
  ProvedorArmazenamento,
  ProvedorEmail,
  RegistroIntegracao,
  SituacaoProvedor,
} from './tipos.ts'

/**
 * Registro central de integrações.
 *
 * Lê a linha da integração na tabela `integrations` e instancia o adapter do
 * provedor escolhido. Para adicionar um provedor: criar o adapter em
 * ./provedores, registrá-lo abaixo e apontar a coluna `provider` para ele.
 */

type Fabrica<T> = (servico: SupabaseClient, config: Record<string, unknown>) => T

const PROVEDORES_EMAIL: Record<string, Fabrica<ProvedorEmail>> = {
  supabase_auth: (servico) => criarEmailSupabaseAuth(servico),
}

const PROVEDORES_ARMAZENAMENTO: Record<string, Fabrica<ProvedorArmazenamento>> = {
  supabase_storage: (servico, config) => criarArmazenamentoSupabase(servico, config),
}

const PROVEDORES_ANTIVIRUS: Record<string, Fabrica<ProvedorAntivirus>> = {
  clamav: () => criarClamAv(),
}

export async function carregarIntegracao(servico: SupabaseClient, chave: string): Promise<RegistroIntegracao> {
  const { data, error } = await servico.from('integrations').select('*').eq('key', chave).maybeSingle()
  if (error || !data) throw new Error(`Integração "${chave}" não cadastrada.`)
  return data as RegistroIntegracao
}

export async function listarIntegracoes(servico: SupabaseClient): Promise<RegistroIntegracao[]> {
  const { data, error } = await servico.from('integrations').select('*').order('key')
  if (error) throw error
  return (data ?? []) as RegistroIntegracao[]
}

function instanciar<T>(
  mapa: Record<string, Fabrica<T>>,
  registro: RegistroIntegracao,
  servico: SupabaseClient,
): T {
  const fabrica = mapa[registro.provider]
  if (!fabrica) throw new Error(`Provedor "${registro.provider}" não implementado para "${registro.key}".`)
  return fabrica(servico, registro.config ?? {})
}

export async function obterEmail(servico: SupabaseClient) {
  const registro = await carregarIntegracao(servico, 'email')
  return { registro, provedor: instanciar(PROVEDORES_EMAIL, registro, servico) }
}

/**
 * Endereço de destino dos links de convite (`/definir-senha`).
 *
 * Docker local: variável SITE_URL do serviço de funções. Supabase hospedado:
 * `site_url` na configuração da integração de e-mail (o domínio não é segredo).
 */
export function linkDeConvite(registro: RegistroIntegracao): string {
  const site = Deno.env.get('SITE_URL') || String(registro.config.site_url ?? '')
  if (!site) throw new Error('Defina SITE_URL ou "site_url" na integração de e-mail.')
  const caminho = String(registro.config.invite_redirect_path ?? '/definir-senha')
  return `${site.replace(/\/$/, '')}${caminho}`
}

export async function obterArmazenamento(servico: SupabaseClient) {
  const registro = await carregarIntegracao(servico, 'storage')
  return { registro, provedor: instanciar(PROVEDORES_ARMAZENAMENTO, registro, servico) }
}

/** `null` quando o antivírus está desligado na tela de integrações. */
export async function obterAntivirus(servico: SupabaseClient) {
  const registro = await carregarIntegracao(servico, 'antivirus')
  if (!registro.enabled) return null
  return { registro, provedor: instanciar(PROVEDORES_ANTIVIRUS, registro, servico) }
}

/** Situação de uma integração qualquer, para a tela de administração. */
export async function situacaoDe(servico: SupabaseClient, registro: RegistroIntegracao): Promise<SituacaoProvedor> {
  const mapa: Record<string, Record<string, Fabrica<{ situacao(): Promise<SituacaoProvedor> }>>> = {
    email: PROVEDORES_EMAIL,
    storage: PROVEDORES_ARMAZENAMENTO,
    antivirus: PROVEDORES_ANTIVIRUS,
  }
  const fabrica = mapa[registro.category]?.[registro.provider]
  if (!fabrica) return { disponivel: false, detalhe: `Provedor "${registro.provider}" não implementado.` }
  return fabrica(servico, registro.config ?? {}).situacao()
}

/** Provedores implementados por categoria, para o seletor da tela. */
export const PROVEDORES_DISPONIVEIS: Record<RegistroIntegracao['category'], string[]> = {
  email: Object.keys(PROVEDORES_EMAIL),
  storage: Object.keys(PROVEDORES_ARMAZENAMENTO),
  antivirus: Object.keys(PROVEDORES_ANTIVIRUS),
}
