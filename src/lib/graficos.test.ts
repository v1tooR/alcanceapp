import { describe, expect, it } from 'vitest'
import {
  caminhoMonotono,
  comSinal,
  compactarNumero,
  percentualDe,
  ticksLimpos,
  variacao,
} from '@/lib/graficos'

/** Extrai os pontos de controle de cada segmento cúbico do caminho SVG. */
function segmentos(caminho: string) {
  return [...caminho.matchAll(/C([^C]+)/g)].map(([, corpo]) => {
    const [x1, y1, x2, y2, x, y] = corpo.split(',').map(Number)
    return { y1, y2, x1, x2, x, y }
  })
}

describe('curva monotônica', () => {
  it('não ultrapassa os dados entre dois pontos', () => {
    const pontos = [
      { x: 0, y: 40 },
      { x: 10, y: 5 },
      { x: 20, y: 5 },
      { x: 30, y: 60 },
      { x: 40, y: 20 },
    ]
    const cubicos = segmentos(caminhoMonotono(pontos))
    expect(cubicos).toHaveLength(pontos.length - 1)

    cubicos.forEach((segmento, i) => {
      const menor = Math.min(pontos[i].y, pontos[i + 1].y)
      const maior = Math.max(pontos[i].y, pontos[i + 1].y)
      for (const y of [segmento.y1, segmento.y2]) {
        expect(y).toBeGreaterThanOrEqual(menor - 1e-9)
        expect(y).toBeLessThanOrEqual(maior + 1e-9)
      }
    })
  })

  it('mantém um platô reto — zero continua zero', () => {
    const cubicos = segmentos(
      caminhoMonotono([
        { x: 0, y: 10 },
        { x: 10, y: 30 },
        { x: 20, y: 30 },
        { x: 30, y: 10 },
      ]),
    )
    expect(cubicos[1].y1).toBe(30)
    expect(cubicos[1].y2).toBe(30)
  })

  it('trata casos com poucos pontos', () => {
    expect(caminhoMonotono([])).toBe('')
    expect(caminhoMonotono([{ x: 1, y: 2 }])).toBe('M1,2')
    expect(caminhoMonotono([{ x: 0, y: 0 }, { x: 5, y: 5 }])).toBe('M0,0L5,5')
  })
})

describe('marcas do eixo', () => {
  it('gera números redondos que cobrem o máximo', () => {
    expect(ticksLimpos(7)).toEqual([0, 2, 4, 6, 8])
    expect(ticksLimpos(23)).toEqual([0, 10, 20, 30])
    expect(ticksLimpos(3)).toEqual([0, 1, 2, 3])
  })

  it('nunca gera passo fracionário para contagens', () => {
    for (const maximo of [1, 2, 3, 9, 14, 48, 131]) {
      const ticks = ticksLimpos(maximo)
      expect(ticks.every(Number.isInteger)).toBe(true)
      expect(ticks.at(-1)).toBeGreaterThanOrEqual(maximo)
    }
  })

  it('tem um eixo válido mesmo sem dados', () => {
    expect(ticksLimpos(0)).toEqual([0, 1])
  })
})

describe('variação entre períodos', () => {
  it('calcula diferença, percentual e direção', () => {
    expect(variacao({ atual: 12, anterior: 8 })).toEqual({
      diferenca: 4,
      percentual: 50,
      direcao: 'alta',
    })
    expect(variacao({ atual: 5, anterior: 10 }).direcao).toBe('queda')
    expect(variacao({ atual: 4, anterior: 4 }).direcao).toBe('estavel')
  })

  it('não inventa percentual quando o período anterior é zero', () => {
    expect(variacao({ atual: 6, anterior: 0 }).percentual).toBeNull()
  })
})

describe('formatação de números', () => {
  const normalizar = (valor: string) => valor.replace(/\s/g, ' ')

  it('compacta apenas números grandes', () => {
    expect(compactarNumero(1284)).toBe('1.284')
    expect(normalizar(compactarNumero(12_900))).toBe('12,9 mil')
  })

  it('usa sinal de menos tipográfico', () => {
    expect(comSinal(3)).toBe('+3')
    expect(comSinal(-2)).toBe('−2')
    expect(comSinal(0)).toBe('0')
  })

  it('calcula percentual seguro', () => {
    expect(percentualDe(1, 3)).toBe(33)
    expect(percentualDe(5, 0)).toBe(0)
  })
})
