import * as React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useAutoAnimate } from '@formkit/auto-animate/react'

/**
 * Movimento funcional.
 *
 * Regra do projeto: a animação ajuda a perceber a mudança de estado, nunca
 * atrasa uma ação nem se repete a cada atualização de dados. A preferência do
 * dispositivo por movimento reduzido é sempre respeitada.
 *
 * Não aplique `Motion` e `AutoAnimate` ao mesmo elemento.
 */

/** Entrada discreta de página — roda uma vez, na montagem. */
export function EntradaPagina({ children }: { children: React.ReactNode }) {
  const movimentoReduzido = useReducedMotion()

  if (movimentoReduzido) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Entrada de cartões e painéis, com atraso opcional para escalonar. */
export function Entrada({
  children,
  atraso = 0,
  className,
}: {
  children: React.ReactNode
  atraso?: number
  className?: string
}) {
  const movimentoReduzido = useReducedMotion()

  if (movimentoReduzido) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: atraso, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Lista cujos itens entram, saem ou mudam de ordem.
 * Use apenas onde a movimentação automática ajuda a entender o que mudou.
 */
export function useListaAnimada<T extends HTMLElement>() {
  const [ref] = useAutoAnimate<T>({ duration: 180, easing: 'ease-out' })
  return ref
}

/** Contador que transiciona suavemente ao mudar de valor. */
export function ValorAnimado({ valor }: { valor: number }) {
  const movimentoReduzido = useReducedMotion()
  const [exibido, setExibido] = React.useState(valor)

  React.useEffect(() => {
    if (movimentoReduzido) {
      setExibido(valor)
      return
    }
    const inicio = exibido
    const delta = valor - inicio
    if (delta === 0) return

    const duracao = 400
    const tempoInicial = performance.now()
    let quadro = 0

    const passo = (agora: number) => {
      const progresso = Math.min((agora - tempoInicial) / duracao, 1)
      const suavizado = 1 - (1 - progresso) ** 3
      setExibido(Math.round(inicio + delta * suavizado))
      if (progresso < 1) quadro = requestAnimationFrame(passo)
    }

    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
    // `exibido` fica fora das dependências de propósito: incluí-lo reiniciaria a
    // animação a cada quadro.
  }, [valor, movimentoReduzido])

  return <>{exibido.toLocaleString('pt-BR')}</>
}
