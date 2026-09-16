import type {
  FiltrosCalendario,
  FiltrosClientes,
  FiltrosDocumentos,
  FiltrosFinanceiro,
  FiltrosProcessos,
} from '@/services/contratos'
import type { ID } from '@/types/domain'

/**
 * Chaves de cache do TanStack Query.
 *
 * Centralizadas para que invalidações após uma mutação atinjam exatamente as
 * consultas afetadas.
 */
export const chaves = {
  painel: {
    todos: ['painel'] as const,
    resumo: () => [...chaves.painel.todos, 'resumo'] as const,
    pendencias: () => [...chaves.painel.todos, 'pendencias'] as const,
    analitico: (meses: number) => [...chaves.painel.todos, 'analitico', meses] as const,
  },
  clientes: {
    todos: ['clientes'] as const,
    lista: (filtros: FiltrosClientes) => [...chaves.clientes.todos, 'lista', filtros] as const,
    detalhe: (id: ID) => [...chaves.clientes.todos, 'detalhe', id] as const,
    opcoes: () => [...chaves.clientes.todos, 'opcoes'] as const,
    resumo: () => [...chaves.clientes.todos, 'resumo'] as const,
  },
  processos: {
    todos: ['processos'] as const,
    lista: (filtros: FiltrosProcessos) => [...chaves.processos.todos, 'lista', filtros] as const,
    detalhe: (id: ID) => [...chaves.processos.todos, 'detalhe', id] as const,
    resumo: () => [...chaves.processos.todos, 'resumo'] as const,
  },
  documentos: {
    todos: ['documentos'] as const,
    lista: (filtros: FiltrosDocumentos) => [...chaves.documentos.todos, 'lista', filtros] as const,
    resumo: () => [...chaves.documentos.todos, 'resumo'] as const,
  },
  movimentacoes: {
    todos: ['movimentacoes'] as const,
    porProcesso: (id: ID) => [...chaves.movimentacoes.todos, 'processo', id] as const,
    recentes: () => [...chaves.movimentacoes.todos, 'recentes'] as const,
  },
  notificacoes: {
    todos: ['notificacoes'] as const,
    lista: (usuarioId: ID) => [...chaves.notificacoes.todos, usuarioId] as const,
    naoLidas: (usuarioId: ID) => [...chaves.notificacoes.todos, usuarioId, 'nao-lidas'] as const,
  },
  calendario: {
    todos: ['calendario'] as const,
    lista: (filtros: FiltrosCalendario) => [...chaves.calendario.todos, filtros] as const,
  },
  financeiro: {
    todos: ['financeiro'] as const,
    lista: (filtros: FiltrosFinanceiro) => [...chaves.financeiro.todos, 'lista', filtros] as const,
    resumo: () => [...chaves.financeiro.todos, 'resumo'] as const,
  },
  usuarios: {
    todos: ['usuarios'] as const,
    lista: () => [...chaves.usuarios.todos, 'lista'] as const,
    equipe: () => [...chaves.usuarios.todos, 'equipe'] as const,
  },
  portal: {
    todos: ['portal'] as const,
    visaoGeral: (clienteId: ID) => [...chaves.portal.todos, 'visao-geral', clienteId] as const,
    processo: (clienteId: ID, processoId: ID) =>
      [...chaves.portal.todos, 'processo', clienteId, processoId] as const,
    documentos: (clienteId: ID) => [...chaves.portal.todos, 'documentos', clienteId] as const,
  },
} as const
