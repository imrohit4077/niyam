/** Shared helpers for the home dashboard (workspace-level analytics). */

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
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

/** Percent change vs previous period; capped for display sanity. */
export function percentChange(current: number, previous: number): { direction: TrendDirection; pct: number } {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0 }
  if (previous === 0) return { direction: 'up', pct: 100 }
  const raw = Math.round(((current - previous) / previous) * 100)
  const capped = Math.min(999, Math.abs(raw))
  if (raw > 0) return { direction: 'up', pct: capped }
  if (raw < 0) return { direction: 'down', pct: capped }
  return { direction: 'flat', pct: 0 }
}

export function calendarMonthBounds(reference = new Date()) {
  const y = reference.getFullYear()
  const m = reference.getMonth()
  const startCurrent = new Date(y, m, 1)
  const startPrev = new Date(y, m - 1, 1)
  const endPrev = new Date(y, m, 0, 23, 59, 59, 999)
  return { startCurrent, startPrev, endPrev }
}
