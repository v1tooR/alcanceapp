import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, FileClock, FileText, FileUp, Paperclip, ShieldCheck, Upload } from 'lucide-react'
import { Estatistica } from '@/components/graficos/estatistica'
import { PageHeader } from '@/components/shared/page-header'
import { EntradaPagina } from '@/components/shared/animacao'
import { StatusDocumentoBadge } from '@/components/shared/status-badge'
import { Prazo } from '@/components/shared/prazo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBarra } from '@/components/ui/card'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/ui/estados'
import { formatarData, formatarTamanhoArquivo } from '@/lib/formato'
import { mensagemErroSegura } from '@/lib/privacidade'
import { clientePodeEnviar } from '@/lib/workflow'
import { cn } from '@/lib/utils'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import { usarSessao } from '@/stores/sessao'
import type { Documento } from '@/types/domain'

/** Limites conferidos também no servidor — aqui servem de orientação ao usuário. */
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024
const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
const EXTENSOES = '.pdf,.jpg,.jpeg,.png,.heic'

export default function PortalDocumentos() {
  const clienteId = usarSessao((estado) => estado.usuario?.clienteId) ?? ''

  const consulta = useQuery({
    queryKey: chaves.portal.documentos(clienteId),
    queryFn: () => servicos.portal.documentos(clienteId),
    enabled: Boolean(clienteId),
  })

  if (consulta.isLoading) return <EstadoCarregando rotulo="Carregando documentos" />
  if (consulta.isError || !consulta.data) {
    return <EstadoErro aoTentarNovamente={() => void consulta.refetch()} />
  }

  const documentos = consulta.data
  const pendentes = documentos.filter((documento) => clientePodeEnviar(documento.status))
  const enviados = documentos.filter((documento) => !clientePodeEnviar(documento.status))
  const emAnalise = documentos.filter(
    (documento) => documento.status === 'enviado' || documento.status === 'em_analise',
  ).length
  const aprovados = documentos.filter((documento) => documento.status === 'aprovado').length

  return (
    <EntradaPagina>
      <PageHeader
        chapeu="Seus documentos"
        titulo="Documentos"
        descricao="Envie os documentos solicitados e acompanhe a análise de cada um."
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Estatistica
          rotulo="Para enviar"
          valor={pendentes.length}
          icone={FileUp}
          tom={pendentes.length > 0 ? 'alerta' : 'sucesso'}
          descricao={pendentes.length > 0 ? 'A equipe está aguardando' : 'Nada pendente do seu lado'}
        />
        <Estatistica
          rotulo="Em análise"
          valor={emAnalise}
          icone={FileClock}
          tom="info"
          descricao="Recebidos pela equipe"
        />
        <Estatistica
          rotulo="Aprovados"
          valor={aprovados}
          icone={CheckCircle2}
          tom="sucesso"
          descricao={`De ${documentos.length} documentos no total`}
        />
      </div>

      <Alert tom="privacidade" className="mb-4" titulo="Seus documentos são tratados com cuidado">
        Apenas a equipe Alcance tem acesso aos arquivos enviados. Envie somente o que foi pedido, em
        arquivo legível, de até {formatarTamanhoArquivo(TAMANHO_MAXIMO_BYTES)}.
      </Alert>

      {/* Pendentes */}
      <Card className="mb-4 overflow-hidden">
        <CardBarra
          titulo="Aguardando o seu envio"
          descricao={
            pendentes.length === 0
              ? 'Nenhum documento pendente.'
              : `${pendentes.length} documento${pendentes.length > 1 ? 's' : ''} para enviar.`
          }
        />

        {pendentes.length === 0 ? (
          <EstadoVazio
            icone={CheckCircle2}
            titulo="Tudo em dia"
            descricao="Não há documentos pendentes do seu lado no momento."
            compacto
          />
        ) : (
          <ul className="divide-y divide-border">
            {pendentes.map((documento) => (
              <li key={documento.id}>
                <ItemEnvio documento={documento} clienteId={clienteId} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Já enviados */}
      <Card className="overflow-hidden">
        <CardBarra titulo="Documentos enviados" descricao="Situação da análise pela equipe." />

        {enviados.length === 0 ? (
          <EstadoVazio
            icone={FileText}
            titulo="Nenhum documento enviado ainda"
            descricao="Os arquivos que você enviar aparecerão aqui com o resultado da análise."
            compacto
          />
        ) : (
          <ul className="divide-y divide-border">
            {enviados.map((documento) => (
              <li key={documento.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                  aria-hidden="true"
                >
                  <FileText className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{documento.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {documento.enviadoEm && <>Enviado em {formatarData(documento.enviadoEm)}</>}
                    {documento.arquivoTamanhoBytes && (
                      <> · {formatarTamanhoArquivo(documento.arquivoTamanhoBytes)}</>
                    )}
                  </p>
                  {documento.status === 'aprovado' && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-success">
                      <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
                      Aprovado pela equipe
                    </p>
                  )}
                </div>

                <StatusDocumentoBadge status={documento.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </EntradaPagina>
  )
}

function ItemEnvio({ documento, clienteId }: { documento: Documento; clienteId: string }) {
  const clienteConsulta = useQueryClient()
  const entradaRef = React.useRef<HTMLInputElement>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  const enviar = useMutation({
    mutationFn: (arquivo: File) =>
      servicos.portal.enviarDocumento(clienteId, documento.id, {
        nome: arquivo.name,
        tamanhoBytes: arquivo.size,
        mime: arquivo.type,
      }),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chaves.portal.todos })
      toast.success('Documento enviado', {
        description: 'A equipe será avisada e fará a análise.',
      })
    },
    onError: (falha) => setErro(mensagemErroSegura(falha, 'Não foi possível enviar o arquivo.')),
  })

  function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return

    setErro(null)

    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErro(
        `O arquivo tem ${formatarTamanhoArquivo(arquivo.size)}. O limite é ${formatarTamanhoArquivo(TAMANHO_MAXIMO_BYTES)}.`,
      )
      return
    }

    if (arquivo.type && !TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato não aceito. Envie um PDF ou uma foto em JPG, PNG ou HEIC.')
      return
    }

    enviar.mutate(arquivo)
  }

  const reenvio = documento.status === 'reenvio_solicitado'

  return (
    <div className={cn('px-4 py-4', reenvio && 'bg-warning-soft/30')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold leading-snug">{documento.titulo}</p>
            <StatusDocumentoBadge status={documento.status} />
          </div>

          {documento.prazoEnvio && (
            <div className="mt-1.5">
              <Prazo data={documento.prazoEnvio} />
            </div>
          )}

          {documento.motivoDevolucao && (
            <p className="mt-2 rounded-sm border border-warning/25 bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground leading-snug">
              <strong className="font-bold">A equipe pediu o reenvio: </strong>
              {documento.motivoDevolucao}
            </p>
          )}

          {erro && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger leading-snug">
              {erro}
            </p>
          )}
        </div>

        <div className="w-full shrink-0 sm:w-auto">
          <input
            ref={entradaRef}
            type="file"
            accept={EXTENSOES}
            onChange={aoEscolherArquivo}
            className="sr-only"
            id={`arquivo-${documento.id}`}
            aria-describedby={`ajuda-${documento.id}`}
          />
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => entradaRef.current?.click()}
            carregando={enviar.isPending}
            textoCarregando="Enviando arquivo"
          >
            <Upload aria-hidden="true" />
            {reenvio ? 'Reenviar' : 'Enviar arquivo'}
          </Button>
        </div>
      </div>

      <p
        id={`ajuda-${documento.id}`}
        className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"
      >
        <Paperclip className="size-3 shrink-0" aria-hidden="true" />
        PDF, JPG, PNG ou HEIC · até {formatarTamanhoArquivo(TAMANHO_MAXIMO_BYTES)}
      </p>
    </div>
  )
}
