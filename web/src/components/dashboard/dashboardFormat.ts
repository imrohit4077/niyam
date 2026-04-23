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

/** Month key YYYY-MM */
export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export type TrendParts = {
  arrow: '↑' | '↓' | '→'
  pct: number
  label: string
}

export function trendFromCounts(current: number, previous: number): TrendParts {
  if (previous === 0 && current === 0) {
    return { arrow: '→', pct: 0, label: 'vs prior month' }
  }
  if (previous === 0) {
    return { arrow: '↑', pct: 100, label: 'vs prior month' }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  const arrow = raw > 0 ? '↑' : raw < 0 ? '↓' : '→'
  return { arrow, pct, label: 'vs prior month' }
}

export function trendFromWindow(current: number, previous: number): TrendParts {
  if (previous === 0 && current === 0) {
    return { arrow: '→', pct: 0, label: 'vs prior 30 days' }
  }
  if (previous === 0) {
    return { arrow: '↑', pct: 100, label: 'vs prior 30 days' }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  const arrow = raw > 0 ? '↑' : raw < 0 ? '↓' : '→'
  return { arrow, pct, label: 'vs prior 30 days' }
}
