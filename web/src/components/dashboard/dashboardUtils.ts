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

/** Monotonic funnel: each stage includes all who reached at least that stage (by application status). */
export function buildPipelineFunnelCounts(byStatus: Record<string, number>) {
  const applied = byStatus.applied ?? 0
  const screening = byStatus.screening ?? 0
  const interview = byStatus.interview ?? 0
  const offer = byStatus.offer ?? 0
  const hired = byStatus.hired ?? 0
  const pastApplied = applied + screening + interview + offer + hired
  const pastScreening = screening + interview + offer + hired
  const pastInterview = interview + offer + hired
  const pastOffer = offer + hired
  return {
    labels: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'],
    values: [pastApplied, pastScreening, pastInterview, pastOffer, hired],
  }
}

export type TrendParts = {
  direction: 'up' | 'down' | 'flat'
  symbol: string
  label: string
}

export function formatTrend(current: number, previous: number): TrendParts {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', symbol: '→', label: '0% vs prior mo.' }
  }
  if (previous === 0) {
    return { direction: 'up', symbol: '↑', label: 'New activity' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { direction: 'up', symbol: '↑', label: `${pct}% vs prior mo.` }
  if (pct < 0) return { direction: 'down', symbol: '↓', label: `${Math.abs(pct)}% vs prior mo.` }
  return { direction: 'flat', symbol: '→', label: '0% vs prior mo.' }
}

export function countInCalendarMonth<T>(items: T[], getDate: (item: T) => string | null, year: number, monthIndex: number) {
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    const d = new Date(raw)
    return d.getFullYear() === year && d.getMonth() === monthIndex
  }).length
}
