import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, LogOut, Menu, Moon, Settings, Sun, UserCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { EstadoVazio } from '@/components/ui/estados'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/sidebar'
import { formatarTempoRelativo } from '@/lib/formato'
import { ROTULO_PAPEL, TOM_TIPO_NOTIFICACAO } from '@/lib/rotulos'
import { ehCliente } from '@/lib/permissoes'
import { cn } from '@/lib/utils'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { limparCache } from '@/app/query-client'
import { usarPreferencias } from '@/stores/preferencias'
import { usarSessao } from '@/stores/sessao'
import type { ItemNavegacao } from './navegacao'

export interface HeaderProps {
  itens: ItemNavegacao[]
  titulo: string
}

export function Header({ itens, titulo }: HeaderProps) {
  const usuario = usarSessao((estado) => estado.usuario)
  const sair = usarSessao((estado) => estado.sair)
  const navegar = useNavigate()
  const clienteConsulta = useQueryClient()
  const tema = usarPreferencias((estado) => estado.tema)
  const definirTema = usarPreferencias((estado) => estado.definirTema)
  const [menuAberto, setMenuAberto] = React.useState(false)

  const { data: notificacoes = [] } = useQuery({
    queryKey: chaves.notificacoes.lista(usuario?.id ?? ''),
    queryFn: () => servicos.notificacoes.listar(usuario!.id),
    enabled: Boolean(usuario),
  })

  const naoLidas = notificacoes.filter((item) => !item.lida)

  const marcarTodas = useMutation({
    mutationFn: () => servicos.notificacoes.marcarTodasComoLidas(usuario!.id),
    onSuccess: () => clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos }),
  })

  const marcarUma = useMutation({
    mutationFn: (id: string) => servicos.notificacoes.marcarComoLida(id),
    onSuccess: () => clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos }),
  })

  async function encerrarSessao() {
    await sair()
    limparCache()
    navegar('/entrar', { replace: true })
  }

  const rotaNotificacoes = ehCliente(usuario?.papel) ? '/portal/notificacoes' : '/app/notificacoes'
  const rotaPerfil = ehCliente(usuario?.papel) ? '/portal/perfil' : '/app/configuracoes'

  return (
    <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-4">
      {/* Menu lateral do celular */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetTrigger asChild>
          <Button variante="fantasma" tamanho="icone" className="lg:hidden">
            <Menu aria-hidden="true" />
            <span className="sr-only">Abrir menu de navegação</span>
          </Button>
        </SheetTrigger>
        <SheetContent lado="esquerda" className="w-72 p-0" ocultarFechar>
          <Sidebar
            itens={itens}
            naoLidas={naoLidas.length}
            modoMovel
            aoNavegar={() => setMenuAberto(false)}
          />
        </SheetContent>
      </Sheet>

      <h2 className="min-w-0 flex-1 truncate text-sm font-bold sm:text-base">{titulo}</h2>

      {/* Notificações */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variante="fantasma" tamanho="icone" className="relative">
            <Bell aria-hidden="true" />
            {naoLidas.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                {naoLidas.length > 9 ? '9+' : naoLidas.length}
              </span>
            )}
            <span className="sr-only">
              Notificações{naoLidas.length > 0 ? `, ${naoLidas.length} não lidas` : ''}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-88 p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-bold">Notificações</p>
            {naoLidas.length > 0 && (
              <Button
                variante="fantasma"
                tamanho="sm"
                onClick={() => marcarTodas.mutate()}
                carregando={marcarTodas.isPending}
              >
                <CheckCheck aria-hidden="true" />
                Marcar todas
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <EstadoVazio
                icone={Bell}
                titulo="Nenhuma notificação"
                descricao="Os avisos sobre documentos e prazos aparecerão aqui."
                compacto
              />
            ) : (
              <ul className="divide-y divide-border">
                {notificacoes.slice(0, 8).map((notificacao) => (
                  <li key={notificacao.id}>
                    <Link
                      to={notificacao.link ?? rotaNotificacoes}
                      onClick={() => !notificacao.lida && marcarUma.mutate(notificacao.id)}
                      className={cn(
                        'flex gap-2.5 px-3 py-3 transition-colors hover:bg-muted/70',
                        'focus-visible:outline-none focus-visible:bg-muted',
                        !notificacao.lida && 'bg-primary-soft/40',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          notificacao.lida ? 'bg-transparent' : 'bg-accent',
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold leading-snug">
                            {notificacao.titulo}
                          </span>
                          <Badge tom={TOM_TIPO_NOTIFICACAO[notificacao.tipo]} tamanho="sm">
                            {notificacao.tipo === 'documento' ? 'Documento' : 'Aviso'}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
                          {notificacao.mensagem}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatarTempoRelativo(notificacao.criadoEm)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border p-2">
            <Button variante="fantasma" tamanho="sm" largura="cheia" asChild>
              <Link to={rotaNotificacoes}>Ver todas as notificações</Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Conta */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Avatar nome={usuario?.nome ?? 'Usuário'} tamanho="sm" />
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-32 truncate text-xs font-semibold leading-tight">
                {usuario?.nome}
              </span>
              <span className="block text-[10px] leading-tight text-muted-foreground">
                {usuario ? ROTULO_PAPEL[usuario.papel] : ''}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link to={rotaPerfil}>
              {ehCliente(usuario?.papel) ? <UserCircle /> : <Settings />}
              {ehCliente(usuario?.papel) ? 'Meus dados' : 'Configurações'}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(evento) => {
              evento.preventDefault()
              definirTema(tema === 'escuro' ? 'claro' : 'escuro')
            }}
          >
            {tema === 'escuro' ? <Sun /> : <Moon />}
            {tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem perigo onSelect={encerrarSessao}>
            <LogOut />
            Sair da conta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
