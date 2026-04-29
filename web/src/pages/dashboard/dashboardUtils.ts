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

export function formatRelativeTime(value: string) {
  const d = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function computePercentTrend(current: number, previous: number): {
  direction: TrendDirection
  pct: number
  label: string
} {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: 0, label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', pct: 100, label: '+100%' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const capped = Math.min(999, Math.abs(raw))
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  const sign = raw > 0 ? '+' : raw < 0 ? '−' : ''
  return { direction, pct: capped, label: `${sign}${capped}%` }
}

export function dominantApplicationStageLabel(apps: { status: string }[]): string {
  if (apps.length === 0) return '—'
  const counts: Record<string, number> = {}
  apps.forEach(a => {
    counts[a.status] = (counts[a.status] ?? 0) + 1
  })
  let best = ''
  let max = 0
  Object.entries(counts).forEach(([k, v]) => {
    if (v > max) {
      max = v
      best = k
    }
  })
  return formatDashboardLabel(best)
}
