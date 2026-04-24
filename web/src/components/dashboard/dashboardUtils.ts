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

/** Percent change from previous to current; returns null if not meaningful. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : null
  return Math.round(((current - previous) / previous) * 100)
}

export function formatTrendPercent(pct: number | null, current: number, previous: number): string {
  if (pct === null) {
    if (previous === 0 && current > 0) return 'New'
    return '—'
  }
  return `${pct > 0 ? '+' : ''}${pct}%`
}
