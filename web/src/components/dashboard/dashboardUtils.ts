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

export function pctChangeVsPrior(current: number, previous: number): { direction: TrendDirection; pct: number } {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0 }
  if (previous === 0) return { direction: 'up', pct: 100 }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { direction: 'up', pct }
  if (raw < -0.5) return { direction: 'down', pct }
  return { direction: 'flat', pct: 0 }
}

export function formatTrendLabel(direction: TrendDirection, pct: number): string {
  if (direction === 'flat') return '0%'
  const arrow = direction === 'up' ? '↑' : '↓'
  return `${arrow} ${pct}%`
}
