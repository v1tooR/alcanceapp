import { Database, Monitor, Moon, PanelLeft, Sun } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardBarra, CardContent } from '@/components/ui/card'
import { RadioCampo, RadioGroup } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { CATALOGO_SUBPROCESSOS, ORDEM_SUBPROCESSOS } from '@/lib/catalogo-subprocessos'
import { ROTULO_PAPEL } from '@/lib/rotulos'
import { MODO_DADOS, USANDO_DADOS_SIMULADOS } from '@/services'
import { usarPreferencias, type Tema } from '@/stores/preferencias'
import { usarSessao } from '@/stores/sessao'

const OPCOES_TEMA: Array<{ valor: Tema; rotulo: string; descricao: string; icone: typeof Sun }> = [
  { valor: 'claro', rotulo: 'Claro', descricao: 'Padrão da marca, melhor para o uso diurno.', icone: Sun },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Menos brilho em ambientes com pouca luz.', icone: Moon },
  { valor: 'sistema', rotulo: 'Seguir o sistema', descricao: 'Acompanha a preferência do dispositivo.', icone: Monitor },
]

export default function Configuracoes() {
  const usuario = usarSessao((estado) => estado.usuario)
  const tema = usarPreferencias((estado) => estado.tema)
  const definirTema = usarPreferencias((estado) => estado.definirTema)
  const sidebarRecolhida = usarPreferencias((estado) => estado.sidebarRecolhida)
  const definirSidebarRecolhida = usarPreferencias((estado) => estado.definirSidebarRecolhida)

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Sistema"
        titulo="Configurações"
        descricao="Preferências de interface e informações do ambiente."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Aparência */}
        <Card>
          <CardBarra titulo="Aparência" descricao="Aplicado apenas a este navegador." />
          <CardContent className="space-y-4 pt-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Tema</legend>
              <RadioGroup
                value={tema}
                onValueChange={(valor) => definirTema(valor as Tema)}
                aria-label="Tema da interface"
              >
                {OPCOES_TEMA.map((opcao) => (
                  <RadioCampo
                    key={opcao.valor}
                    id={`tema-${opcao.valor}`}
                    value={opcao.valor}
                    rotulo={opcao.rotulo}
                    descricao={opcao.descricao}
                    selecionado={tema === opcao.valor}
                  />
                ))}
              </RadioGroup>
            </fieldset>

            <label className="flex items-start justify-between gap-3 border-t border-border pt-4">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <PanelLeft className="size-4 text-muted-foreground" aria-hidden="true" />
                  Menu lateral recolhido
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
                  Mostra apenas os ícones, liberando espaço para as listagens.
                </span>
              </span>
              <Switch
                checked={sidebarRecolhida}
                onCheckedChange={definirSidebarRecolhida}
                aria-label="Recolher menu lateral"
              />
            </label>
          </CardContent>
        </Card>

        {/* Conta */}
        <Card>
          <CardBarra titulo="Minha conta" />
          <CardContent className="pt-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome
                </dt>
                <dd className="mt-0.5">{usuario?.nome}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  E-mail
                </dt>
                <dd className="mt-0.5 break-words">{usuario?.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nível de acesso
                </dt>
                <dd className="mt-0.5">
                  <Badge tom="primario" tamanho="sm">
                    {usuario ? ROTULO_PAPEL[usuario.papel] : '—'}
                  </Badge>
                </dd>
              </div>
            </dl>

            <Alert tom="info" className="mt-4">
              A troca de senha e a autenticação em duas etapas dependem do serviço de autenticação a
              ser integrado.
            </Alert>
          </CardContent>
        </Card>

        {/* Ambiente */}
        <Card className="lg:col-span-2">
          <CardBarra titulo="Ambiente" />
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Database className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Origem dos dados:{' '}
                  {USANDO_DADOS_SIMULADOS ? 'base fictícia de desenvolvimento' : 'API integrada'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  Definida por <code className="rounded-xs bg-muted px-1">VITE_MODO_DADOS</code>{' '}
                  (atual: <code className="rounded-xs bg-muted px-1">{MODO_DADOS}</code>).
                </p>
              </div>
              <Badge tom={USANDO_DADOS_SIMULADOS ? 'alerta' : 'sucesso'}>
                {USANDO_DADOS_SIMULADOS ? 'Demonstração' : 'Produção'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Catálogo de subprocessos */}
        <Card className="lg:col-span-2">
          <CardBarra
            titulo="Catálogo de subprocessos"
            descricao="Referência usada ao abrir um processo. As etapas são sugestões editáveis."
          />
          <CardContent className="pt-4">
            <Alert tom="alerta" className="mb-4" titulo="Pendente de validação">
              A sequência de etapas e a lista de documentos de cada subprocesso ainda precisam ser
              confirmadas pela equipe Alcance. Nada aqui foi presumido como regra definitiva.
            </Alert>

            <ul className="grid gap-3 sm:grid-cols-2">
              {ORDEM_SUBPROCESSOS.map((tipo) => {
                const definicao = CATALOGO_SUBPROCESSOS[tipo]
                return (
                  <li key={tipo} className="rounded-md border border-border p-3.5">
                    <p className="text-sm font-bold">{definicao.nome}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {definicao.descricao}
                    </p>
                    {definicao.orgaoSugerido && (
                      <p className="mt-1.5 text-xs">
                        <span className="font-semibold">Órgão sugerido:</span>{' '}
                        {definicao.orgaoSugerido}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] italic text-muted-foreground leading-snug">
                      {definicao.aplicabilidade}
                    </p>
                    <ol className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {definicao.etapasSugeridas.map((etapa, indice) => (
                        <li key={etapa}>
                          {indice + 1}. {etapa}
                        </li>
                      ))}
                    </ol>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </EntradaPagina>
  )
}
