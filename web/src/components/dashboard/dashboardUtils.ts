import type { DashboardSlice } from './dashboardTypes'

export const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

const FUNNEL_STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function buildFunnelStages(counts: Record<string, number>) {
  return FUNNEL_STAGE_ORDER.map((key, index) => ({
    key,
    label: key === 'applied' ? 'Applied' : key.charAt(0).toUpperCase() + key.slice(1),
    value: counts[key] ?? 0,
    color: ['#0ea5e9', '#38bdf8', '#3b82f6', '#6366f1', '#22c55e'][index] ?? '#64748b',
  }))
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
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
