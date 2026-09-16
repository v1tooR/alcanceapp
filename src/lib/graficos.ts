/**
 * Matemática dos gráficos. Funções puras, sem dependência de React, para poder
 * testar escala, curvas e variações isoladamente.
 */

export interface Ponto {
  x: number
  y: number
}

const arredondar = (valor: number) => Number(valor.toFixed(2))

/**
 * Curva monotônica (Fritsch–Carlson, a mesma ideia da `curveMonotoneX` do d3).
 *
 * Suaviza a linha sem inventar picos: entre dois pontos a curva nunca passa
 * acima do maior nem abaixo do menor. Uma curva spline comum "ultrapassaria"
 * os dados e poderia sugerir valor negativo onde há zero.
 */
export function caminhoMonotono(pontos: Ponto[]): string {
  const n = pontos.length
  if (n === 0) return ''
  const inicio = `M${arredondar(pontos[0].x)},${arredondar(pontos[0].y)}`
  if (n === 1) return inicio
  if (n === 2) return `${inicio}L${arredondar(pontos[1].x)},${arredondar(pontos[1].y)}`

  const dx: number[] = []
  const inclinacao: number[] = []
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(pontos[i + 1].x - pontos[i].x)
    inclinacao.push(dx[i] === 0 ? 0 : (pontos[i + 1].y - pontos[i].y) / dx[i])
  }

  const tangente = new Array<number>(n)
  tangente[0] = inclinacao[0]
  tangente[n - 1] = inclinacao[n - 2]
  for (let i = 1; i < n - 1; i += 1) {
    const antes = inclinacao[i - 1]
    const depois = inclinacao[i]
    if (antes * depois <= 0) {
      // Pico, vale ou platô: tangente horizontal evita ultrapassar o dado.
      tangente[i] = 0
    } else {
      const peso1 = 2 * dx[i] + dx[i - 1]
      const peso2 = dx[i] + 2 * dx[i - 1]
      tangente[i] = (peso1 + peso2) / (peso1 / antes + peso2 / depois)
    }
  }

  let caminho = inicio
  for (let i = 0; i < n - 1; i += 1) {
    const a = pontos[i]
    const b = pontos[i + 1]
    const terco = dx[i] / 3
    caminho +=
      `C${arredondar(a.x + terco)},${arredondar(a.y + tangente[i] * terco)},` +
      `${arredondar(b.x - terco)},${arredondar(b.y - tangente[i + 1] * terco)},` +
      `${arredondar(b.x)},${arredondar(b.y)}`
  }
  return caminho
}

/**
 * Marcas do eixo em números "redondos" (0, 5, 10…), sempre inteiros —
 * os gráficos do painel contam processos e documentos.
 */
export function ticksLimpos(maximo: number, quantidade = 4): number[] {
  if (!Number.isFinite(maximo) || maximo <= 0) return [0, 1]
  const bruto = maximo / quantidade
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 5, 10].map((fator) => fator * potencia).find((p) => p >= bruto) ?? potencia * 10
  const passoInteiro = Math.max(1, Math.ceil(passo))
  const topo = Math.ceil(maximo / passoInteiro) * passoInteiro
  return Array.from({ length: topo / passoInteiro + 1 }, (_, i) => i * passoInteiro)
}

export type Direcao = 'alta' | 'queda' | 'estavel'

export interface Variacao {
  diferenca: number
  /** `null` quando não há base de comparação (período anterior zerado). */
  percentual: number | null
  direcao: Direcao
}

export function variacao({ atual, anterior }: { atual: number; anterior: number }): Variacao {
  const diferenca = atual - anterior
  return {
    diferenca,
    percentual: anterior === 0 ? null : Math.round((diferenca / anterior) * 100),
    direcao: diferenca > 0 ? 'alta' : diferenca < 0 ? 'queda' : 'estavel',
  }
}

const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const INTEIRO = new Intl.NumberFormat('pt-BR')

/** `1.284`, `12,9 mil`, `4,2 mi` */
export function compactarNumero(valor: number): string {
  return Math.abs(valor) < 10_000 ? INTEIRO.format(valor) : COMPACTO.format(valor)
}

/** Percentual inteiro (0–100) de `parte` sobre `total`; 0 sem total. */
export function percentualDe(parte: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((parte / total) * 100)
}

/** `+3`, `−2`, `0` — com sinal de menos tipográfico. */
export function comSinal(valor: number): string {
  if (valor > 0) return `+${INTEIRO.format(valor)}`
  if (valor < 0) return `−${INTEIRO.format(Math.abs(valor))}`
  return '0'
}
