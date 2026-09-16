import * as React from 'react'
import { Input, type InputProps } from '@/components/ui/input'
import {
  apenasDigitos,
  desmascararMoeda,
  mascararCep,
  mascararCpf,
  mascararMoeda,
  mascararRg,
  mascararTelefone,
} from '@/lib/mascaras'

/**
 * Campos com máscara de exibição.
 *
 * Contrato: `value` e `onChange` trabalham com o valor **sem máscara** (apenas
 * dígitos, ou número no caso de moeda). A máscara existe só na tela.
 */

type PropsBase = Omit<InputProps, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (valor: string) => void
}

function criarCampoMascarado(
  mascarar: (valor: string) => string,
  limparParaArmazenar: (valor: string) => string,
  padroes: Partial<InputProps>,
) {
  return React.forwardRef<HTMLInputElement, PropsBase>(function CampoMascarado(
    { value, onChange, ...props },
    ref,
  ) {
    return (
      <Input
        ref={ref}
        {...padroes}
        {...props}
        value={mascarar(value ?? '')}
        onChange={(evento) => onChange(limparParaArmazenar(evento.target.value))}
      />
    )
  })
}

export const InputCpf = criarCampoMascarado(mascararCpf, apenasDigitos, {
  inputMode: 'numeric',
  autoComplete: 'off',
  placeholder: '000.000.000-00',
})

export const InputTelefone = criarCampoMascarado(mascararTelefone, apenasDigitos, {
  inputMode: 'tel',
  autoComplete: 'tel',
  placeholder: '(00) 00000-0000',
})

export const InputCep = criarCampoMascarado(mascararCep, apenasDigitos, {
  inputMode: 'numeric',
  autoComplete: 'postal-code',
  placeholder: '00000-000',
})

export const InputRg = criarCampoMascarado(
  mascararRg,
  (valor) => valor.replace(/[^\dXx]/g, '').toUpperCase(),
  { autoComplete: 'off', placeholder: '00.000.000-0' },
)

export interface InputMoedaProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (valor: number) => void
}

/** Entrada monetária: o usuário digita centavos, a tela mostra `R$ 0,00`. */
export const InputMoeda = React.forwardRef<HTMLInputElement, InputMoedaProps>(function InputMoeda(
  { value, onChange, ...props },
  ref,
) {
  const centavos = Math.round((value ?? 0) * 100).toString()
  return (
    <Input
      ref={ref}
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      {...props}
      value={value ? mascararMoeda(centavos) : ''}
      onChange={(evento) => onChange(desmascararMoeda(mascararMoeda(evento.target.value)))}
    />
  )
})
