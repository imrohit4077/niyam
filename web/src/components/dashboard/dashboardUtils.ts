/** Shared helpers for the home dashboard analytics. */

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function isDateInMonth(iso: string, year: number, monthIndex: number) {
  const t = new Date(iso).getTime()
  const a = new Date(year, monthIndex, 1).getTime()
  const b = new Date(year, monthIndex + 1, 1).getTime()
  return t >= a && t < b
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function computeMonthOverMonthTrend(current: number, previous: number): {
  direction: TrendDirection
  percent: number | null
  label: string
} {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', percent: null, label: '—' }
  }
  if (previous === 0) {
    return { direction: 'up', percent: null, label: 'New' }
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
