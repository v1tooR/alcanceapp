import { useQuery } from '@tanstack/react-query'
import { IdCard, Mail, MapPin, Phone } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardBarra, CardContent } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro } from '@/components/ui/estados'
import { Separator } from '@/components/ui/separator'
import { RadioCampo, RadioGroup } from '@/components/ui/radio-group'
import { formatarData } from '@/lib/formato'
import { mascararCep, mascararTelefone } from '@/lib/mascaras'
import { cpfParcial } from '@/lib/privacidade'
import { ROTULO_TIPO_CLIENTE } from '@/lib/rotulos'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarPreferencias, type Tema } from '@/stores/preferencias'
import { usarSessao } from '@/stores/sessao'

const OPCOES_TEMA: Array<{ valor: Tema; rotulo: string; descricao: string }> = [
  { valor: 'claro', rotulo: 'Claro', descricao: 'Fundo claro, padrão da Alcance.' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Menos brilho em ambientes com pouca luz.' },
  { valor: 'sistema', rotulo: 'Seguir o aparelho', descricao: 'Acompanha a configuração do seu celular ou computador.' },
]

export default function PortalPerfil() {
  const usuario = usarSessao((estado) => estado.usuario)
  const clienteId = usuario?.clienteId ?? ''
  const tema = usarPreferencias((estado) => estado.tema)
  const definirTema = usarPreferencias((estado) => estado.definirTema)

  const consulta = useQuery({
    queryKey: chaves.portal.visaoGeral(clienteId),
    queryFn: () => servicos.portal.visaoGeral(clienteId),
    enabled: Boolean(clienteId),
  })

  if (consulta.isLoading) return <EstadoCarregando rotulo="Carregando seus dados" />
  if (consulta.isError || !consulta.data) {
    return <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
  }

  const cliente = consulta.data.cliente

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Cadastro"
        titulo="Meus dados"
        descricao="Informações cadastradas no seu atendimento."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBarra titulo="Cadastro" />
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Avatar nome={cliente.nome} tamanho="lg" />
              <div className="min-w-0">
                <p className="font-bold leading-snug">{cliente.nome}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tom="contorno" tamanho="sm">
                    {cliente.codigo}
                  </Badge>
                  <Badge tom="contorno" tamanho="sm">
                    {ROTULO_TIPO_CLIENTE[cliente.tipo]}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <dl className="space-y-3.5">
              <Linha icone={IdCard} rotulo="CPF" valor={cpfParcial(cliente.cpf)} />
              <Linha icone={Mail} rotulo="E-mail" valor={cliente.email} />
              <Linha icone={Phone} rotulo="Telefone" valor={mascararTelefone(cliente.telefone)} />
              {cliente.dataNascimento && (
                <Linha
                  icone={IdCard}
                  rotulo="Data de nascimento"
                  valor={formatarData(cliente.dataNascimento)}
                />
              )}
              {cliente.endereco && (
                <Linha
                  icone={MapPin}
                  rotulo="Endereço"
                  valor={`${cliente.endereco.logradouro}, ${cliente.endereco.numero} — ${cliente.endereco.bairro}, ${cliente.endereco.cidade}/${cliente.endereco.uf} · ${mascararCep(cliente.endereco.cep)}`}
                />
              )}
            </dl>

            <Alert tom="info" className="mt-4">
              Precisa corrigir algum dado? Fale com a equipe Alcance — a atualização é feita pelo
              atendimento, para manter o histórico do seu processo consistente.
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardBarra titulo="Preferências de exibição" descricao="Valem apenas neste aparelho." />
          <CardContent className="pt-4">
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
                    id={`tema-portal-${opcao.valor}`}
                    value={opcao.valor}
                    rotulo={opcao.rotulo}
                    descricao={opcao.descricao}
                    selecionado={tema === opcao.valor}
                  />
                ))}
              </RadioGroup>
            </fieldset>

            <Alert tom="privacidade" className="mt-4" titulo="Privacidade">
              Você vê apenas o seu próprio processo. Nenhuma informação de outros clientes é
              acessível por esta área.
            </Alert>
          </CardContent>
        </Card>
      </div>
    </EntradaPagina>
  )
}

function Linha({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: React.ComponentType<{ className?: string }>
  rotulo: string
  valor: string
}) {
  return (
    <div className="flex gap-2.5">
      <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </dt>
        <dd className="mt-0.5 text-sm leading-snug break-words">{valor}</dd>
      </div>
    </div>
  )
}
