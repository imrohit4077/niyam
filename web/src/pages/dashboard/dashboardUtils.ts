import { DASHBOARD_CHART_COLORS } from './dashboardConstants'

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

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
  const now = Date.now()
  const diffMs = now - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

/** Count records whose `dateField` falls in [start, end). */
export function countInRange<T>(rows: T[], getDate: (row: T) => string | null | undefined, start: Date, end: Date) {
  const s = start.getTime()
  const e = end.getTime()
  return rows.filter(row => {
    const raw = getDate(row)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= s && t < e
  }).length
}

export type TrendParts = {
  direction: 'up' | 'down' | 'flat'
  percent: number | null
  label: string
}

/**
 * Rolling comparison: last `periodDays` vs the prior `periodDays`.
 * Returns null percent when prior is 0 and current is 0.
 */
export function rollingTrend(currentCount: number, previousCount: number): TrendParts {
  if (previousCount === 0 && currentCount === 0) {
    return { direction: 'flat', percent: null, label: 'No prior-period data' }
  }
  if (previousCount === 0) {
    return { direction: 'up', percent: null, label: 'New this period' }
  }
  const pct = Math.round(((currentCount - previousCount) / previousCount) * 100)
  if (pct > 0) return { direction: 'up', percent: pct, label: 'vs prior period' }
  if (pct < 0) return { direction: 'down', percent: Math.abs(pct), label: 'vs prior period' }
  return { direction: 'flat', percent: 0, label: 'vs prior period' }
}
