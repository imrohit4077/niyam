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

export function formatRelativeShort(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = Date.now()
  const diffMs = now - d.getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 14) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function periodTrend(current: number, previous: number): { direction: TrendDirection; label: string } {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: '+100%' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, label: `${sign}${rounded}%` }
}

export function countBetween<T>(items: T[], getDate: (item: T) => string | null | undefined, start: Date, end: Date) {
  const s = start.getTime()
  const e = end.getTime()
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= s && t < e
  }).length
}
