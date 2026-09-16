/**
 * Máscaras de entrada. Regra do projeto: **armazenar sem máscara, exibir com
 * máscara**. Todos os formulários gravam apenas dígitos.
 */

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function mascararRg(valor: string): string {
  const d = valor.replace(/[^\dXx]/g, '').slice(0, 9).toUpperCase()
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`
}

/** Entrada monetária em centavos: digitar `12550` produz `R$ 125,50`. */
export function mascararMoeda(valor: string): string {
  const d = apenasDigitos(valor)
  if (!d) return ''
  const centavos = Number.parseInt(d, 10)
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function desmascararMoeda(valor: string): number {
  const limpo = valor.replace(/[^\d,-]/g, '').replace(',', '.')
  const numero = Number.parseFloat(limpo)
  return Number.isNaN(numero) ? 0 : numero
}

/** Validação de CPF pelos dígitos verificadores. */
export function cpfValido(valor: string): boolean {
  const cpf = apenasDigitos(valor)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0
    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * (pesoInicial - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const digito1 = calcularDigito(cpf.slice(0, 9), 10)
  if (digito1 !== Number(cpf[9])) return false
  const digito2 = calcularDigito(cpf.slice(0, 10), 11)
  return digito2 === Number(cpf[10])
}

export function telefoneValido(valor: string): boolean {
  const d = apenasDigitos(valor)
  return d.length === 10 || d.length === 11
}

export function cepValido(valor: string): boolean {
  return apenasDigitos(valor).length === 8
}
