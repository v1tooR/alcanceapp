import { describe, expect, it } from 'vitest'
import {
  apenasDigitos,
  cepValido,
  cpfValido,
  desmascararMoeda,
  mascararCep,
  mascararCpf,
  mascararMoeda,
  mascararTelefone,
  telefoneValido,
} from '@/lib/mascaras'

describe('máscara de CPF', () => {
  it('formata progressivamente enquanto o usuário digita', () => {
    expect(mascararCpf('123')).toBe('123')
    expect(mascararCpf('1234')).toBe('123.4')
    expect(mascararCpf('1234567')).toBe('123.456.7')
    expect(mascararCpf('12345678909')).toBe('123.456.789-09')
  })

  it('descarta dígitos além dos 11', () => {
    expect(mascararCpf('123456789091234')).toBe('123.456.789-09')
  })

  it('aceita entrada já mascarada sem duplicar separadores', () => {
    expect(mascararCpf('123.456.789-09')).toBe('123.456.789-09')
  })
})

describe('validação de CPF', () => {
  it('aceita um CPF com dígitos verificadores corretos', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
  })

  it('rejeita dígito verificador errado', () => {
    expect(cpfValido('529.982.247-26')).toBe(false)
  })

  it('rejeita sequências repetidas', () => {
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cpfValido('000.000.000-00')).toBe(false)
  })

  it('rejeita quantidade incorreta de dígitos', () => {
    expect(cpfValido('1234567890')).toBe(false)
    expect(cpfValido('')).toBe(false)
  })
})

describe('máscara de telefone', () => {
  it('formata celular com nove dígitos', () => {
    expect(mascararTelefone('11987654321')).toBe('(11) 98765-4321')
  })

  it('formata telefone fixo com oito dígitos', () => {
    expect(mascararTelefone('1133334444')).toBe('(11) 3333-4444')
  })

  it('valida somente 10 ou 11 dígitos', () => {
    expect(telefoneValido('1133334444')).toBe(true)
    expect(telefoneValido('11987654321')).toBe(true)
    expect(telefoneValido('119876543')).toBe(false)
  })
})

describe('máscara de CEP', () => {
  it('formata com hífen depois do quinto dígito', () => {
    expect(mascararCep('01310930')).toBe('01310-930')
  })

  it('valida oito dígitos', () => {
    expect(cepValido('01310-930')).toBe(true)
    expect(cepValido('0131093')).toBe(false)
  })
})

describe('máscara de moeda', () => {
  // `Intl` separa o símbolo do valor com espaço não separável (U+00A0).
  // Normalizamos para comparar o formato, não o tipo de espaço.
  const normalizar = (valor: string) => valor.replace(/\s/g, ' ')

  it('interpreta a digitação como centavos', () => {
    expect(normalizar(mascararMoeda('12550'))).toBe('R$ 125,50')
    expect(normalizar(mascararMoeda('5'))).toBe('R$ 0,05')
  })

  it('retorna vazio quando não há dígitos', () => {
    expect(mascararMoeda('')).toBe('')
    expect(mascararMoeda('abc')).toBe('')
  })

  it('desfaz a máscara devolvendo número', () => {
    expect(desmascararMoeda('R$ 1.250,00')).toBe(1250)
    expect(desmascararMoeda('R$ 0,05')).toBe(0.05)
    expect(desmascararMoeda('')).toBe(0)
  })
})

describe('apenasDigitos', () => {
  it('remove qualquer caractere não numérico', () => {
    expect(apenasDigitos('(11) 98765-4321')).toBe('11987654321')
  })
})
