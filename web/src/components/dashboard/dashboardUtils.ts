export const DASHBOARD_CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
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

export type TrendDirection = 'up' | 'down' | 'flat'

export function trendFromPeriods(current: number, previous: number): {
  direction: TrendDirection
  pct: number | null
  label: string
} {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: 0, label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', pct: null, label: 'New' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, pct: rounded, label: `${sign}${rounded}%` }
}

export function countInDateRange<T>(items: T[], getDate: (item: T) => string | null | undefined, start: Date, end: Date) {
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}
