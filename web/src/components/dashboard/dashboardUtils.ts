/** Shared helpers for the home hiring dashboard. */

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
  const diffMs = now.getTime() - d.getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function computePercentChange(current: number, previous: number): { pct: number; direction: TrendDirection } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: 100, direction: current > 0 ? 'up' : 'flat' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  const direction: TrendDirection = raw > 0.5 ? 'up' : raw < -0.5 ? 'down' : 'flat'
  return { pct, direction }
}

export function monthBounds(offsetFromCurrent: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - offsetFromCurrent, 1)
  const end = new Date(now.getFullYear(), now.getMonth() - offsetFromCurrent + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function countInRange(isoDates: string[], start: Date, end: Date) {
  let n = 0
  for (const iso of isoDates) {
    const t = new Date(iso).getTime()
    if (t >= start.getTime() && t <= end.getTime()) n += 1
  }
  return n
}
