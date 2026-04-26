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
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function makeDashboardSlices(entries: Array<[string, number]>): DashboardSlice[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Human-readable e.g. "+12%" or "0%" */
  label: string
}

/** Compare count in last `windowDays` vs the prior window of equal length. */
export function trendFromDailyWindows(
  timestamps: string[],
  windowDays: number,
  now: Date = new Date(),
): TrendResult {
  const ms = windowDays * 86400000
  const curStart = new Date(now.getTime() - ms)
  const prevStart = new Date(now.getTime() - 2 * ms)
  const prevEnd = curStart

  const inRange = (iso: string, start: Date, end: Date) => {
    const t = new Date(iso).getTime()
    return t >= start.getTime() && t < end.getTime()
  }

  const current = timestamps.filter(ts => inRange(ts, curStart, now)).length
  const previous = timestamps.filter(ts => inRange(ts, prevStart, prevEnd)).length

  if (previous === 0 && current === 0) {
    return { direction: 'flat', label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', label: 'New' }
  }

  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { direction: 'flat', label: '0%' }
  const direction: TrendDirection = pct > 0 ? 'up' : 'down'
  const label = `${pct > 0 ? '+' : ''}${pct}%`
  return { direction, label }
}

/** Compare scalar now vs previous period (e.g. open job count). */
export function trendFromPreviousValue(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: 'New' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { direction: 'flat', label: '0%' }
  const direction: TrendDirection = pct > 0 ? 'up' : 'down'
  const label = `${pct > 0 ? '+' : ''}${pct}%`
  return { direction, label }
}
