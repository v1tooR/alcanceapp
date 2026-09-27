import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Plug, Save } from 'lucide-react'
import { EntradaPagina } from '@/components/shared/animacao'
import { Campo } from '@/components/shared/campo'
import { PageHeader } from '@/components/shared/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBarra, CardContent } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { mensagemErroSegura } from '@/lib/privacidade'
import { servicos } from '@/services'
import { chaves } from '@/services/chaves'
import type { Integracao } from '@/types/domain'

const ROTULO_CATEGORIA: Record<Integracao['categoria'], string> = {
  email: 'E-mail',
  storage: 'Armazenamento',
  antivirus: 'Antivírus',
}

/**
 * Administração das integrações externas.
 *
 * Mostra provedor, situação observada no servidor e segredos esperados (só se
 * estão configurados — nunca o valor). Permite ligar/desligar e ajustar a
 * configuração não sensível. Segredos são definidos nas variáveis de ambiente
 * dos serviços, fora desta tela.
 */
export default function Integracoes() {
  const consulta = useQuery({
    queryKey: chaves.integracoes.todos,
    queryFn: () => servicos.integracoes.listar(),
  })

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Gestão"
        titulo="Integrações"
        descricao="Serviços externos usados pelo sistema. Chaves e senhas ficam nas variáveis de ambiente do servidor — nunca nesta tela nem no banco."
      />

      {consulta.isLoading ? (
        <EstadoCarregando rotulo="Carregando integrações" />
      ) : consulta.isError ? (
        <EstadoErro
          descricao={mensagemErroSegura(consulta.error, 'Não foi possível consultar as integrações.')}
          aoTentarNovamente={() => void consulta.refetch()}
        />
      ) : !consulta.data?.length ? (
        <EstadoVazio
          icone={Plug}
          titulo="Nenhuma integração cadastrada"
          descricao="As integrações são criadas pelo seed de produção do banco."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {consulta.data.map((integracao) => (
            <CartaoIntegracao key={integracao.id} integracao={integracao} />
          ))}
        </div>
      )}
    </EntradaPagina>
  )
}

function CartaoIntegracao({ integracao }: { integracao: Integracao }) {
  const clienteConsulta = useQueryClient()
  const [configuracao, setConfiguracao] = React.useState(() => JSON.stringify(integracao.configuracao, null, 2))
  const [erroConfiguracao, setErroConfiguracao] = React.useState<string | null>(null)

  React.useEffect(() => {
    setConfiguracao(JSON.stringify(integracao.configuracao, null, 2))
  }, [integracao.configuracao])

  const salvar = useMutation({
    mutationFn: (dados: Parameters<typeof servicos.integracoes.atualizar>[1]) =>
      servicos.integracoes.atualizar(integracao.id, dados),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.integracoes.todos })
      toast.success('Integração atualizada')
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  function salvarConfiguracao() {
    let valor: unknown
    try {
      valor = JSON.parse(configuracao)
    } catch {
      setErroConfiguracao('JSON inválido. Confira aspas, vírgulas e chaves.')
      return
    }
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
      setErroConfiguracao('A configuração deve ser um objeto JSON: { ... }.')
      return
    }
    setErroConfiguracao(null)
    salvar.mutate({ configuracao: valor as Record<string, unknown> })
  }

  const alterada = configuracao !== JSON.stringify(integracao.configuracao, null, 2)

  return (
    <Card>
      <CardBarra
        titulo={integracao.nome}
        descricao={integracao.descricao}
        acoes={
          <Badge tom={!integracao.habilitada ? 'neutro' : integracao.disponivel ? 'sucesso' : 'perigo'} ponto>
            {!integracao.habilitada ? 'Desligada' : integracao.disponivel ? 'Operando' : 'Com falha'}
          </Badge>
        }
      />
      <CardContent className="space-y-4 pt-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categoria</dt>
            <dd className="mt-0.5">{ROTULO_CATEGORIA[integracao.categoria]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provedor</dt>
            <dd className="mt-0.5">
              <code className="rounded-xs bg-muted px-1">{integracao.provedor}</code>
            </dd>
          </div>
        </dl>

        <Alert tom={integracao.disponivel ? 'info' : 'alerta'} titulo="Situação no servidor">
          {integracao.detalhe}
        </Alert>

        <label className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Integração ligada</span>
            <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
              Desligada, o sistema deixa de usar este serviço.
            </span>
          </span>
          <Switch
            checked={integracao.habilitada}
            disabled={salvar.isPending}
            onCheckedChange={(habilitada) => salvar.mutate({ habilitada })}
            aria-label={`Ligar ${integracao.nome}`}
          />
        </label>

        {integracao.segredos.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <KeyRound className="size-3.5" aria-hidden="true" />
              Segredos esperados
            </p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {integracao.segredos.map((segredo) => (
                <li key={segredo.nome} className="flex items-center justify-between gap-2">
                  <code className="rounded-xs bg-muted px-1">{segredo.nome}</code>
                  <Badge tom={segredo.configurado === null ? 'neutro' : segredo.configurado ? 'sucesso' : 'perigo'} tamanho="sm">
                    {segredo.configurado === null
                      ? 'Em outro serviço'
                      : segredo.configurado
                        ? 'Configurado'
                        : 'Ausente'}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Campo
          rotulo="Configuração (sem segredos)"
          dica="JSON com parâmetros não sensíveis. Chaves como senha, token ou api_key são recusadas pelo servidor."
          erro={erroConfiguracao ?? undefined}
        >
          {(campo) => (
            <Textarea
              {...campo}
              rows={4}
              spellCheck={false}
              className="font-mono text-xs"
              value={configuracao}
              onChange={(evento) => setConfiguracao(evento.target.value)}
            />
          )}
        </Campo>

        <div className="flex justify-end">
          <Button
            tamanho="sm"
            variante="contorno"
            disabled={!alterada}
            carregando={salvar.isPending}
            textoCarregando="Salvando"
            onClick={salvarConfiguracao}
          >
            <Save aria-hidden="true" />
            Salvar configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
