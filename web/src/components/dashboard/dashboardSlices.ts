import { DASHBOARD_CHART_COLORS } from './dashboardConstants'
import { formatDashboardLabel } from './dashboardFormatters'

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
