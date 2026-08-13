import type { LotteryCard, LotteryResultRaw } from '@/types'

function firstPrizeValue(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'string') return val.trim() || null
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0] as Record<string, unknown> | string
    if (typeof first === 'string') return first.trim() || null
    const num = first?.decimo ?? first?.numero ?? first
    return num != null ? String(num).trim() : null
  }
  if (typeof val === 'object') {
    const obj = val as { decimo?: unknown; numero?: unknown }
    if (obj.decimo != null || obj.numero != null) {
      return String(obj.decimo ?? obj.numero).trim()
    }
  }
  return null
}

function formatNumber(num: string | number | null): string {
  if (num === null || num === undefined) return '—'
  const str = String(num).trim().padStart(5, '0')
  if (str.length >= 5) {
    return `${str.slice(0, 2)}.${str.slice(2)}`
  }
  return str
}

function reintegrosFromResult(result: Record<string, unknown> | null | undefined): string[] {
  const raw = result?.reintegros
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((r) => {
        if (r && typeof r === 'object') {
          const o = r as { decimo?: unknown; numero?: unknown }
          return o.decimo ?? o.numero ?? r
        }
        return r
      })
      .filter((n) => n != null)
      .map((n) => String(n))
  }
  if (typeof raw === 'string') {
    return raw.split('-').map((n) => n.trim()).filter(Boolean)
  }
  return []
}

export function formatDrawDate(value: string | null | undefined): string {
  if (!value) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function mapLotteryCard(lottery: LotteryResultRaw): LotteryCard {
  const result = lottery.result ?? null
  const first = firstPrizeValue(result?.primer_premio)
  const second = firstPrizeValue(result?.segundo_premio)

  return {
    id: lottery.id,
    name: lottery.name || `Sorteo ${lottery.id}`,
    dateLabel: formatDrawDate(lottery.draw_date),
    firstPrize: first ? formatNumber(first) : '—',
    secondPrize: second ? formatNumber(second) : '—',
    reintegros: reintegrosFromResult(result),
  }
}
