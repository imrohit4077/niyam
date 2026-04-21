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

export function formatRelativeTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export function computePercentChange(current: number, previous: number): { pct: number; direction: TrendDirection } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'neutral' }
  if (previous === 0) return { pct: 100, direction: 'up' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(raw)
  if (pct > 0) return { pct, direction: 'up' }
  if (pct < 0) return { pct, direction: 'down' }
  return { pct: 0, direction: 'flat' }
}
