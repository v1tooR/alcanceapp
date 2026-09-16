import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface DialogoConfirmacaoProps {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  titulo: string
  descricao: React.ReactNode
  rotuloConfirmar?: string
  rotuloCancelar?: string
  variante?: 'primario' | 'perigo'
  aoConfirmar: () => void | Promise<void>
}

/**
 * Confirmação para ações relevantes ou difíceis de desfazer.
 * Mantém o diálogo aberto enquanto a ação está em andamento.
 */
export function DialogoConfirmacao({
  aberto,
  aoMudarAberto,
  titulo,
  descricao,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  variante = 'primario',
  aoConfirmar,
}: DialogoConfirmacaoProps) {
  const [processando, setProcessando] = React.useState(false)

  async function confirmar(evento: React.MouseEvent) {
    evento.preventDefault()
    setProcessando(true)
    try {
      await aoConfirmar()
      aoMudarAberto(false)
    } finally {
      setProcessando(false)
    }
  }

  return (
    <AlertDialog
      open={aberto}
      onOpenChange={(proximo) => {
        if (!processando) aoMudarAberto(proximo)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processando}>{rotuloCancelar}</AlertDialogCancel>
          <AlertDialogAction variante={variante} onClick={confirmar} disabled={processando}>
            {processando ? 'Processando…' : rotuloConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Controla um único diálogo de confirmação por tela. */
export function useConfirmacao() {
  const [aberto, setAberto] = React.useState(false)
  const acaoRef = React.useRef<(() => void | Promise<void>) | null>(null)
  const [config, setConfig] = React.useState<
    Omit<DialogoConfirmacaoProps, 'aberto' | 'aoMudarAberto' | 'aoConfirmar'> | null
  >(null)

  const pedirConfirmacao = React.useCallback(
    (
      opcoes: Omit<DialogoConfirmacaoProps, 'aberto' | 'aoMudarAberto' | 'aoConfirmar'>,
      acao: () => void | Promise<void>,
    ) => {
      setConfig(opcoes)
      acaoRef.current = acao
      setAberto(true)
    },
    [],
  )

  const elemento = config ? (
    <DialogoConfirmacao
      {...config}
      aberto={aberto}
      aoMudarAberto={setAberto}
      aoConfirmar={async () => {
        await acaoRef.current?.()
      }}
    />
  ) : null

  return { pedirConfirmacao, elemento }
}
