export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const DASHBOARD_BRAND_LINE = '#0ea5e9'
export const DASHBOARD_BRAND_FILL = 'rgba(14, 165, 233, 0.16)'

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

export type MonthOverMonth = {
  direction: TrendDirection
  /** Absolute percentage points change, e.g. 12 for +12%. Null when not meaningful. */
  percent: number | null
}

/** Compare current-period count to previous-period count (e.g. calendar months). */
export function monthOverMonthTrend(current: number, previous: number): MonthOverMonth {
  if (previous === 0 && current === 0) return { direction: 'flat', percent: 0 }
  if (previous === 0) return { direction: current > 0 ? 'up' : 'flat', percent: null }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  if (raw > 0.5) return { direction: 'up', percent: rounded }
  if (raw < -0.5) return { direction: 'down', percent: rounded }
  return { direction: 'flat', percent: 0 }
}

export function countInCalendarMonth(isoDates: string[], year: number, monthIndex0: number) {
  return isoDates.filter(iso => {
    const d = new Date(iso)
    return d.getFullYear() === year && d.getMonth() === monthIndex0
  }).length
}
