import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina, useListaAnimada } from '@/components/shared/animacao'
import { ResumoAvisos } from '@/features/notificacoes/components/resumo-avisos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { formatarDataHora, formatarTempoRelativo } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import { cn } from '@/lib/utils'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'

export default function PortalNotificacoes() {
  const usuario = usarSessao((estado) => estado.usuario)
  const clienteConsulta = useQueryClient()
  const listaRef = useListaAnimada<HTMLUListElement>()

  const consulta = useQuery({
    queryKey: chaves.notificacoes.lista(usuario?.id ?? ''),
    queryFn: () => servicos.notificacoes.listar(usuario!.id),
    enabled: Boolean(usuario),
  })

  const marcarTodas = useMutation({
    mutationFn: () => servicos.notificacoes.marcarTodasComoLidas(usuario!.id),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos })
      toast.success('Avisos marcados como lidos')
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const marcar = useMutation({
    mutationFn: (id: string) => servicos.notificacoes.marcarComoLida(id),
    onSuccess: () => clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos }),
  })

  const notificacoes = consulta.data ?? []
  const naoLidas = notificacoes.filter((item) => !item.lida)

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Comunicação"
        titulo="Avisos"
        descricao="Mensagens da equipe sobre o andamento do seu processo."
        acoes={
          naoLidas.length > 0 && (
            <Button
              variante="contorno"
              onClick={() => marcarTodas.mutate()}
              carregando={marcarTodas.isPending}
            >
              <CheckCheck aria-hidden="true" />
              Marcar como lidos
            </Button>
          )
        }
      />

      <ResumoAvisos notificacoes={notificacoes} carregando={consulta.isLoading} />

      <Card className="overflow-hidden">
        {consulta.isLoading ? (
          <EstadoCarregando rotulo="Carregando avisos" />
        ) : consulta.isError ? (
          <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
        ) : notificacoes.length === 0 ? (
          <EstadoVazio
            icone={Bell}
            titulo="Nenhum aviso"
            descricao="Quando houver novidade no seu processo, avisaremos por aqui."
          />
        ) : (
          <ul ref={listaRef} className="divide-y divide-border">
            {notificacoes.map((notificacao) => {
              const conteudo = (
                <>
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      notificacao.lida ? 'bg-transparent' : 'bg-accent',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold leading-snug">{notificacao.titulo}</span>
                      {!notificacao.lida && (
                        <Badge tom="destaque" tamanho="sm">
                          Novo
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground leading-snug">
                      {notificacao.mensagem}
                    </span>
                    <time
                      dateTime={notificacao.criadoEm}
                      title={formatarDataHora(notificacao.criadoEm)}
                      className="mt-1.5 block text-[11px] text-muted-foreground"
                    >
                      {formatarTempoRelativo(notificacao.criadoEm)}
                    </time>
                  </span>
                </>
              )

              return (
                <li key={notificacao.id}>
                  {notificacao.link ? (
                    <Link
                      to={notificacao.link}
                      onClick={() => !notificacao.lida && marcar.mutate(notificacao.id)}
                      className={cn(
                        'flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60',
                        'focus-visible:bg-muted focus-visible:outline-none',
                        !notificacao.lida && 'bg-primary-soft/30',
                      )}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <div
                      className={cn(
                        'flex gap-3 px-4 py-3.5',
                        !notificacao.lida && 'bg-primary-soft/30',
                      )}
                    >
                      {conteudo}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </EntradaPagina>
  )
}
