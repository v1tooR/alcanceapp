import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff, MoreVertical, RotateCcw, Search, XCircle } from 'lucide-react'
import { Campo } from '@/components/shared/campo'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { descricaoSeguraDocumento, mensagemErroSegura } from '@/lib/privacidade'
import { aguardaAnalise, podeMudarStatusDocumento } from '@/lib/workflow'
import { esquemaDevolucaoDocumento, type DadosDevolucaoDocumento } from '@/schemas'
import { chaves } from '@/services/chaves'
import { servicos } from '@/services'
import type { Documento } from '@/types/domain'

/**
 * Ações de análise de um documento.
 *
 * Reutilizado na tela de documentos e dentro do processo, para que a análise
 * tenha exatamente o mesmo comportamento nos dois lugares.
 */
export function AcoesDocumento({
  documento,
  compacto,
}: {
  documento: Documento
  compacto?: boolean
}) {
  const clienteConsulta = useQueryClient()
  const [devolucao, setDevolucao] = React.useState<'reprovar' | 'reenvio' | null>(null)

  function aoConcluir(mensagem: string) {
    void clienteConsulta.invalidateQueries({ queryKey: chaves.documentos.todos })
    void clienteConsulta.invalidateQueries({ queryKey: chaves.processos.todos })
    void clienteConsulta.invalidateQueries({ queryKey: chaves.painel.todos })
    void clienteConsulta.invalidateQueries({ queryKey: chaves.notificacoes.todos })
    toast.success(mensagem)
  }

  const analisar = useMutation({
    mutationFn: () => servicos.documentos.colocarEmAnalise(documento.id),
    onSuccess: () => aoConcluir('Documento marcado como em análise'),
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const aprovar = useMutation({
    mutationFn: () => servicos.documentos.aprovar(documento.id),
    onSuccess: () => aoConcluir('Documento aprovado'),
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const alternarVisibilidade = useMutation({
    mutationFn: () =>
      servicos.documentos.alterarVisibilidade(
        documento.id,
        documento.visibilidade === 'cliente' ? 'interno' : 'cliente',
      ),
    onSuccess: () =>
      aoConcluir(
        documento.visibilidade === 'cliente'
          ? 'Documento ocultado do cliente'
          : 'Documento liberado para o cliente',
      ),
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const podeAprovar = podeMudarStatusDocumento(documento.status, 'aprovado')
  const podeReprovar = podeMudarStatusDocumento(documento.status, 'reprovado')
  const podePedirReenvio = podeMudarStatusDocumento(documento.status, 'reenvio_solicitado')
  const podeAnalisar = podeMudarStatusDocumento(documento.status, 'em_analise')

  return (
    <>
      <div className="flex items-center gap-1.5">
        {aguardaAnalise(documento.status) && podeAprovar && (
          <Button
            tamanho="sm"
            onClick={() => aprovar.mutate()}
            carregando={aprovar.isPending}
            textoCarregando="Aprovando"
          >
            <CheckCircle2 aria-hidden="true" />
            {compacto ? 'Aprovar' : 'Aprovar documento'}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variante="contorno" tamanho="iconeSm">
              <MoreVertical aria-hidden="true" />
              <span className="sr-only">
                Mais ações para {descricaoSeguraDocumento(documento)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {podeAnalisar && documento.status === 'enviado' && (
              <DropdownMenuItem onSelect={() => analisar.mutate()}>
                <Search />
                Marcar como em análise
              </DropdownMenuItem>
            )}
            {podeAprovar && !aguardaAnalise(documento.status) && (
              <DropdownMenuItem onSelect={() => aprovar.mutate()}>
                <CheckCircle2 />
                Aprovar
              </DropdownMenuItem>
            )}
            {podePedirReenvio && (
              <DropdownMenuItem onSelect={() => setDevolucao('reenvio')}>
                <RotateCcw />
                Solicitar reenvio
              </DropdownMenuItem>
            )}
            {podeReprovar && (
              <DropdownMenuItem perigo onSelect={() => setDevolucao('reprovar')}>
                <XCircle />
                Reprovar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => alternarVisibilidade.mutate()}>
              {documento.visibilidade === 'cliente' ? <EyeOff /> : <Eye />}
              {documento.visibilidade === 'cliente'
                ? 'Ocultar do cliente'
                : 'Liberar para o cliente'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DialogoDevolucao
        documento={documento}
        modo={devolucao}
        aoFechar={() => setDevolucao(null)}
        aoConcluir={aoConcluir}
      />
    </>
  )
}

/** Diálogo de reprovação / pedido de reenvio — o motivo vai para o cliente. */
function DialogoDevolucao({
  documento,
  modo,
  aoFechar,
  aoConcluir,
}: {
  documento: Documento
  modo: 'reprovar' | 'reenvio' | null
  aoFechar: () => void
  aoConcluir: (mensagem: string) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DadosDevolucaoDocumento>({
    resolver: zodResolver(esquemaDevolucaoDocumento),
    defaultValues: { motivo: '', novoPrazo: '' },
  })

  React.useEffect(() => {
    if (modo) reset({ motivo: '', novoPrazo: '' })
  }, [modo, reset])

  const executar = useMutation({
    mutationFn: (dados: DadosDevolucaoDocumento) =>
      modo === 'reprovar'
        ? servicos.documentos.reprovar(documento.id, dados.motivo)
        : servicos.documentos.solicitarReenvio(
            documento.id,
            dados.motivo,
            dados.novoPrazo || undefined,
          ),
    onSuccess: () => {
      aoConcluir(modo === 'reprovar' ? 'Documento reprovado' : 'Reenvio solicitado ao cliente')
      aoFechar()
    },
    onError: (falha) => toast.error(mensagemErroSegura(falha)),
  })

  const reprovando = modo === 'reprovar'

  return (
    <Dialog open={modo !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent largura="sm">
        <form onSubmit={handleSubmit((dados) => executar.mutateAsync(dados))} noValidate>
          <DialogHeader>
            <DialogTitle>{reprovando ? 'Reprovar documento' : 'Solicitar reenvio'}</DialogTitle>
            <DialogDescription>
              {descricaoSeguraDocumento(documento)}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-3">
            <Alert tom="alerta">
              O motivo abaixo será exibido ao cliente. Escreva de forma objetiva e sem incluir
              dados pessoais de terceiros.
            </Alert>

            <Campo
              rotulo="Motivo"
              erro={errors.motivo?.message}
              obrigatorio
              dica="Ex.: “A foto está cortada; reenvie o documento inteiro e legível.”"
            >
              {(campo) => <Textarea {...campo} {...register('motivo')} rows={4} autoFocus />}
            </Campo>

            {!reprovando && (
              <Campo rotulo="Novo prazo de envio" erro={errors.novoPrazo?.message}>
                {(campo) => <Input {...campo} {...register('novoPrazo')} type="date" />}
              </Campo>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variante="contorno" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variante={reprovando ? 'perigo' : 'primario'}
              carregando={isSubmitting}
              textoCarregando="Enviando"
            >
              {reprovando ? 'Reprovar' : 'Solicitar reenvio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
