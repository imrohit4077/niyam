/** Shared helpers for the home dashboard (formatting, trends, aggregates). */

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeDay(value: string) {
  const d = new Date(value)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (86400 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type TrendResult = {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "+12%" or "New" or "—" */
  label: string
}

/** Month-over-month percent change; handles zero previous month. */
export function monthOverMonthTrend(current: number, previous: number): TrendResult {
  if (current === 0 && previous === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: current > 0 ? 'up' : 'flat', label: current > 0 ? 'New' : '0%' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, label: `${sign}${rounded}%` }
}

export function calendarMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function countByMonth<T>(items: T[], getDate: (item: T) => string, predicate?: (item: T) => boolean) {
  const map = new Map<string, number>()
  for (const item of items) {
    if (predicate && !predicate(item)) continue
    const key = calendarMonthKey(new Date(getDate(item)))
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}
