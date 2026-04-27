export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const PIPELINE_FUNNEL_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
] as const

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function makeDashboardSlices(entries: Array<[string, number]>): DashboardSlice[] {
  return entries
    .filter(([, v]) => v > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export type TrendDirection = 'up' | 'down' | 'neutral'

export function formatTrendVsPrevious(current: number, previous: number): { direction: TrendDirection; label: string } {
  if (previous === 0) {
    if (current === 0) return { direction: 'neutral', label: '0%' }
    return { direction: 'up', label: 'New' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { direction: 'up', label: `↑ ${pct}%` }
  if (pct < 0) return { direction: 'down', label: `↓ ${Math.abs(pct)}%` }
  return { direction: 'neutral', label: '0%' }
}
