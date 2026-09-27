import * as React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { CarregandoPagina, EstadoVazio } from '@/components/ui/estados'
import { ehCliente, ehEquipe, rotaInicial, temPermissao, type Permissao } from '@/lib/permissoes'
import { usarSessao } from '@/stores/sessao'

/**
 * Proteção **de interface** das rotas.
 *
 * Evita que o usuário chegue a telas que não pode usar e melhora a navegação.
 * A autorização real de acesso aos dados é aplicada pelo backend: o front-end
 * nunca é a última barreira.
 */
export function RotaProtegida({ area }: { area: 'equipe' | 'cliente' }) {
  const { usuario, inicializando } = usarSessao()
  const local = useLocation()

  if (inicializando) return <CarregandoPagina rotulo="Verificando seu acesso" />

  if (!usuario) {
    return <Navigate to="/entrar" state={{ de: local.pathname }} replace />
  }

  const permitido = area === 'equipe' ? ehEquipe(usuario.papel) : ehCliente(usuario.papel)
  if (!permitido) {
    return <Navigate to={rotaInicial(usuario.papel)} replace />
  }

  return <Outlet />
}

/** Redireciona quem já está autenticado para fora das telas públicas. */
export function RotaPublica({ children }: { children: React.ReactNode }) {
  const { usuario, inicializando } = usarSessao()

  if (inicializando) return <CarregandoPagina rotulo="Carregando" />
  if (usuario) return <Navigate to={rotaInicial(usuario.papel)} replace />

  return <>{children}</>
}

/**
 * Tela restrita a uma permissão (ex.: financeiro, equipe). Quem chega pela URL
 * sem permissão vê o aviso em vez de uma tela vazia — os dados já são negados
 * pela RLS no servidor.
 */
export function ExigePermissao({ permissao, children }: { permissao: Permissao; children: React.ReactNode }) {
  const papel = usarSessao((estado) => estado.usuario?.papel)
  if (!temPermissao(papel, permissao)) {
    return (
      <EstadoVazio
        icone={ShieldAlert}
        titulo="Acesso restrito"
        descricao="Seu nível de acesso não inclui esta área. Fale com a coordenação se precisar dela."
      />
    )
  }
  return <>{children}</>
}
