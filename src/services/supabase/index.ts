import type { Servicos } from '@/services/contratos'
import { criarAutenticacao } from './autenticacao'
import { criarClientes } from './clientes'
import { criarCalendario, criarMovimentacoes, criarNotificacoes } from './comunicacao'
import { criarDocumentos } from './documentos'
import { criarFinanceiro, criarIntegracoes, criarPainel } from './gestao'
import { criarPortal } from './portal'
import { criarProcessos } from './processos'
import { criarTempoReal } from './tempo-real'
import { criarUsuarios } from './usuarios'

/**
 * Adaptador Supabase — implementa os contratos de src/services/contratos.ts.
 *
 * Onde cada operação acontece:
 *   * CRUD simples → tabelas via PostgREST, protegidas por RLS;
 *   * regras de fluxo, operações atômicas e resumos → RPCs (funções SQL);
 *   * contas do Auth, arquivos e integrações → Edge Functions.
 */
export function criarServicosSupabase(): Servicos {
  return {
    autenticacao: criarAutenticacao(),
    clientes: criarClientes(),
    processos: criarProcessos(),
    documentos: criarDocumentos(),
    movimentacoes: criarMovimentacoes(),
    notificacoes: criarNotificacoes(),
    calendario: criarCalendario(),
    financeiro: criarFinanceiro(),
    usuarios: criarUsuarios(),
    painel: criarPainel(),
    portal: criarPortal(),
    integracoes: criarIntegracoes(),
    tempoReal: criarTempoReal(),
  }
}
