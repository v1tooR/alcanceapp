import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ISODate, ISODateTime } from '@/types/domain'

const LOCALE = 'pt-BR'

function paraData(valor?: ISODate | ISODateTime | Date | null): Date | null {
  if (!valor) return null
  const data = valor instanceof Date ? valor : parseISO(valor)
  return isValid(data) ? data : null
}

/** `14/03/2026` */
export function formatarData(valor?: ISODate | ISODateTime | null): string {
  const data = paraData(valor)
  return data ? format(data, 'dd/MM/yyyy', { locale: ptBR }) : '—'
}

/** `14/03/2026 às 13:45` */
export function formatarDataHora(valor?: ISODateTime | null): string {
  const data = paraData(valor)
  return data ? format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'
}

/** `14 de março` */
export function formatarDataExtensa(valor?: ISODate | ISODateTime | null): string {
  const data = paraData(valor)
  return data ? format(data, "dd 'de' MMMM", { locale: ptBR }) : '—'
}

/** `março de 2026` */
export function formatarMesAno(valor?: ISODate | ISODateTime | null): string {
  const data = paraData(valor)
  return data ? format(data, "MMMM 'de' yyyy", { locale: ptBR }) : '—'
}

/** `13:45` */
export function formatarHora(valor?: string | null): string {
  if (!valor) return '—'
  return valor.slice(0, 5)
}

/** Tempo relativo curto: `agora`, `há 4 h`, `ontem`, `há 3 d`, ou a data. */
export function formatarTempoRelativo(valor?: ISODateTime | null): string {
  const data = paraData(valor)
  if (!data) return '—'
  const minutos = Math.floor((Date.now() - data.getTime()) / 60_000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return formatarData(valor)
}

/**
 * Descreve um prazo em relação a hoje.
 * `situacao` alimenta o tom visual do componente de prazo.
 */
export function descreverPrazo(valor?: ISODate | null): {
  texto: string
  dias: number | null
  situacao: 'sem_prazo' | 'vencido' | 'hoje' | 'proximo' | 'futuro'
} {
  const data = paraData(valor)
  if (!data) return { texto: 'Sem prazo', dias: null, situacao: 'sem_prazo' }

  const dias = differenceInCalendarDays(data, new Date())
  if (dias < 0) {
    const atraso = Math.abs(dias)
    return {
      texto: `${atraso} ${atraso === 1 ? 'dia' : 'dias'} em atraso`,
      dias,
      situacao: 'vencido',
    }
  }
  if (dias === 0) return { texto: 'Vence hoje', dias, situacao: 'hoje' }
  if (dias === 1) return { texto: 'Vence amanhã', dias, situacao: 'proximo' }
  if (dias <= 7) return { texto: `Vence em ${dias} dias`, dias, situacao: 'proximo' }
  return { texto: formatarData(valor), dias, situacao: 'futuro' }
}

/** `R$ 1.250,00` */
export function formatarMoeda(valor?: number | null): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' }).format(valor)
}

/** `1.250` */
export function formatarNumero(valor: number): string {
  return new Intl.NumberFormat(LOCALE).format(valor)
}

/** `2,4 MB` */
export function formatarTamanhoArquivo(bytes?: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1).replace('.', ',')} MB`
}

/** Converte `Date` para `yyyy-MM-dd` (formato aceito por `<input type="date">`). */
export function paraValorInputData(valor?: Date | ISODate | null): string {
  const data = paraData(valor)
  return data ? format(data, 'yyyy-MM-dd') : ''
}
