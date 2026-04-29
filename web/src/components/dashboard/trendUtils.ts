/** Month boundaries in local time for simple MoM comparisons. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function isInMonth(iso: string, ref: Date): boolean {
  const t = new Date(iso).getTime()
  const start = startOfMonth(ref).getTime()
  const end = startOfMonth(new Date(ref.getFullYear(), ref.getMonth() + 1, 1)).getTime()
  return t >= start && t < end
}

export function isInPreviousMonth(iso: string, ref: Date): boolean {
  const prev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)
  return isInMonth(iso, prev)
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function trendFromCounts(current: number, previous: number): {
  direction: TrendDirection
  percent: number | null
  label: string
} {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', percent: null, label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', percent: null, label: '—' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return {
    direction,
    percent: rounded,
    label: `${sign}${rounded}%`,
  }
}
