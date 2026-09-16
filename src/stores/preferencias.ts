import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'claro' | 'escuro' | 'sistema'

interface EstadoPreferencias {
  tema: Tema
  sidebarRecolhida: boolean
  definirTema: (tema: Tema) => void
  alternarSidebar: () => void
  definirSidebarRecolhida: (recolhida: boolean) => void
}

/**
 * Preferências de interface.
 *
 * Só armazena escolhas visuais — nenhum dado pessoal, documento ou informação
 * de processo vai para o `localStorage`.
 */
export const usarPreferencias = create<EstadoPreferencias>()(
  persist(
    (definir) => ({
      tema: 'claro',
      sidebarRecolhida: false,
      definirTema: (tema) => definir({ tema }),
      alternarSidebar: () => definir((estado) => ({ sidebarRecolhida: !estado.sidebarRecolhida })),
      definirSidebarRecolhida: (sidebarRecolhida) => definir({ sidebarRecolhida }),
    }),
    { name: 'alcance:preferencias' },
  ),
)

/** Aplica o tema no elemento raiz, acompanhando a preferência do sistema. */
export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement
  const escuroNoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches
  const escuro = tema === 'escuro' || (tema === 'sistema' && escuroNoSistema)
  raiz.classList.toggle('dark', escuro)
  raiz.style.colorScheme = escuro ? 'dark' : 'light'
}
