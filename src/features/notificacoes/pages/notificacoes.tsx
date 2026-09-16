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
import { Tabs, TabsContador, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatarDataHora, formatarTempoRelativo } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import { ROTULO_TIPO_NOTIFICACAO, TOM_TIPO_NOTIFICACAO } from '@/lib/rotulos'
import { cn } from '@/lib/utils'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'
import type { Notificacao } from '@/types/domain'

export default function Notificacoes() {
  const usuario = usarSessao((estado) => estado.usuario)
  const clienteConsulta = useQueryClient()

  const consulta = useQuery({
    queryKey: chaves.notificacoes.lista(usuario?.id ?? ''),
    queryFn: () => servicos.notificacoes.listar(usuario!.id),
    enabled: Boolean(usuario),
  })

  const marcarTodas = useMutation({
    mutationFn: () => servicos.notificacoes.marcarTodasComoLidas(usuario!.id),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos })
      toast.success('Todas as notificações foram marcadas como lidas')
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const todas = consulta.data ?? []
  const naoLidas = todas.filter((item) => !item.lida)

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Comunicação"
        titulo="Notificações"
        descricao="Avisos internos sobre documentos, prazos e movimentações."
        acoes={
          naoLidas.length > 0 && (
            <Button
              variante="contorno"
              onClick={() => marcarTodas.mutate()}
              carregando={marcarTodas.isPending}
            >
              <CheckCheck aria-hidden="true" />
              Marcar todas como lidas
            </Button>
          )
        }
      />

      <ResumoAvisos notificacoes={todas} carregando={consulta.isLoading} />

      <Tabs defaultValue="nao-lidas">
        <TabsList>
          <TabsTrigger value="nao-lidas">
            Não lidas <TabsContador valor={naoLidas.length} />
          </TabsTrigger>
          <TabsTrigger value="todas">
            Todas <TabsContador valor={todas.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nao-lidas">
          <ListaNotificacoes
            notificacoes={naoLidas}
            carregando={consulta.isLoading}
            erro={consulta.isError}
            aoTentarNovamente={() => void consulta.refetch()}
            tituloVazio="Nenhuma notificação não lida"
            descricaoVazio="Você está em dia com os avisos."
          />
        </TabsContent>

        <TabsContent value="todas">
          <ListaNotificacoes
            notificacoes={todas}
            carregando={consulta.isLoading}
            erro={consulta.isError}
            aoTentarNovamente={() => void consulta.refetch()}
            tituloVazio="Nenhuma notificação"
            descricaoVazio="Os avisos sobre documentos e prazos aparecerão aqui."
          />
        </TabsContent>
      </Tabs>
    </EntradaPagina>
  )
}

function ListaNotificacoes({
  notificacoes,
  carregando,
  erro,
  aoTentarNovamente,
  tituloVazio,
  descricaoVazio,
}: {
  notificacoes: Notificacao[]
  carregando: boolean
  erro: boolean
  aoTentarNovamente: () => void
  tituloVazio: string
  descricaoVazio: string
}) {
  const clienteConsulta = useQueryClient()
  const listaRef = useListaAnimada<HTMLUListElement>()

  const marcar = useMutation({
    mutationFn: (id: string) => servicos.notificacoes.marcarComoLida(id),
    onSuccess: () => clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos }),
  })

  if (carregando) {
    return (
      <Card>
        <EstadoCarregando rotulo="Carregando notificações" />
      </Card>
    )
  }

  if (erro) {
    return (
      <Card>
        <EstadoErro aoTentarNovamente={aoTentarNovamente} />
      </Card>
    )
  }

  if (notificacoes.length === 0) {
    return (
      <Card>
        <EstadoVazio icone={Bell} titulo={tituloVazio} descricao={descricaoVazio} />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
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
                  <Badge tom={TOM_TIPO_NOTIFICACAO[notificacao.tipo]} tamanho="sm">
                    {ROTULO_TIPO_NOTIFICACAO[notificacao.tipo]}
                  </Badge>
                  {!notificacao.lida && (
                    <Badge tom="destaque" tamanho="sm">
                      Nova
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
                  className={cn('flex gap-3 px-4 py-3.5', !notificacao.lida && 'bg-primary-soft/30')}
                >
                  {conteudo}
                  {!notificacao.lida && (
                    <Button
                      variante="fantasma"
                      tamanho="sm"
                      onClick={() => marcar.mutate(notificacao.id)}
                    >
                      Marcar como lida
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
