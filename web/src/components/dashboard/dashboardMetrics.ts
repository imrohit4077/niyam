export function formatDashboardLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function comparePeriodCounts(current: number, previous: number): {
  direction: TrendDirection
  label: string
} {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: '—' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { direction: 'up', label: `${pct}%` }
  if (pct < 0) return { direction: 'down', label: `${Math.abs(pct)}%` }
  return { direction: 'flat', label: '0%' }
}

export function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isDateInRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}
