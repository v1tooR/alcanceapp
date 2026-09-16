import {
  Banknote,
  Bell,
  CalendarDays,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  UserCircle,
  Users,
  UsersRound,
} from 'lucide-react'
import type { Permissao } from '@/lib/permissoes'

export interface ItemNavegacao {
  para: string
  rotulo: string
  /** Rótulo curto para a barra inferior do celular. */
  rotuloCurto?: string
  icone: React.ComponentType<{ className?: string }>
  permissao?: Permissao
  /** Grupo usado para separar visualmente a lista. */
  grupo: 'operacao' | 'comunicacao' | 'gestao'
  /** Mostra contador de não lidas. */
  contadorNotificacoes?: boolean
  /** Aparece na barra inferior do celular. */
  noRodapeMovel?: boolean
  /** Rota exata (não marca ativo em subrotas). */
  exata?: boolean
}

export const NAVEGACAO_EQUIPE: ItemNavegacao[] = [
  {
    para: '/app',
    rotulo: 'Painel',
    icone: LayoutDashboard,
    grupo: 'operacao',
    noRodapeMovel: true,
    exata: true,
  },
  {
    para: '/app/clientes',
    rotulo: 'Clientes',
    icone: Users,
    permissao: 'clientes.ver',
    grupo: 'operacao',
    noRodapeMovel: true,
  },
  {
    para: '/app/processos',
    rotulo: 'Processos',
    icone: FolderKanban,
    permissao: 'processos.ver',
    grupo: 'operacao',
    noRodapeMovel: true,
  },
  {
    para: '/app/documentos',
    rotulo: 'Documentos',
    rotuloCurto: 'Docs',
    icone: FileText,
    permissao: 'documentos.ver',
    grupo: 'operacao',
    noRodapeMovel: true,
  },
  {
    para: '/app/calendario',
    rotulo: 'Calendário',
    rotuloCurto: 'Agenda',
    icone: CalendarDays,
    permissao: 'calendario.ver',
    grupo: 'comunicacao',
  },
  {
    para: '/app/notificacoes',
    rotulo: 'Notificações',
    icone: Bell,
    permissao: 'notificacoes.ver',
    grupo: 'comunicacao',
    contadorNotificacoes: true,
  },
  {
    para: '/app/financeiro',
    rotulo: 'Financeiro',
    icone: Banknote,
    permissao: 'financeiro.ver',
    grupo: 'gestao',
  },
  {
    para: '/app/equipe',
    rotulo: 'Equipe',
    icone: UsersRound,
    permissao: 'equipe.ver',
    grupo: 'gestao',
  },
  {
    para: '/app/configuracoes',
    rotulo: 'Configurações',
    rotuloCurto: 'Config.',
    icone: Settings,
    permissao: 'configuracoes.ver',
    grupo: 'gestao',
  },
]

export const NAVEGACAO_CLIENTE: ItemNavegacao[] = [
  {
    para: '/portal',
    rotulo: 'Início',
    icone: LayoutDashboard,
    grupo: 'operacao',
    noRodapeMovel: true,
    exata: true,
  },
  {
    para: '/portal/processos',
    rotulo: 'Meu processo',
    rotuloCurto: 'Processo',
    icone: FolderKanban,
    grupo: 'operacao',
    noRodapeMovel: true,
  },
  {
    para: '/portal/documentos',
    rotulo: 'Documentos',
    rotuloCurto: 'Docs',
    icone: FileText,
    grupo: 'operacao',
    noRodapeMovel: true,
  },
  {
    para: '/portal/notificacoes',
    rotulo: 'Avisos',
    icone: Bell,
    grupo: 'comunicacao',
    contadorNotificacoes: true,
    noRodapeMovel: true,
  },
  {
    para: '/portal/agenda',
    rotulo: 'Agenda',
    icone: CalendarDays,
    grupo: 'comunicacao',
  },
  {
    para: '/portal/perfil',
    rotulo: 'Meus dados',
    rotuloCurto: 'Perfil',
    icone: UserCircle,
    grupo: 'gestao',
  },
]

export const ROTULO_GRUPO: Record<ItemNavegacao['grupo'], string> = {
  operacao: 'Operação',
  comunicacao: 'Comunicação',
  gestao: 'Gestão',
}
