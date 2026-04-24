export const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export type ChartSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function makeChartSlices(entries: Array<[string, number]>): ChartSlice[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export type TrendBadge = {
  direction: TrendDirection
  label: string
  /** Screen reader text */
  srLabel: string
}

/**
 * Compares two counts and returns a compact trend label (↑ 12%) for summary cards.
 */
export function trendFromCounts(current: number, previous: number): TrendBadge {
  if (previous === 0 && current === 0) {
    return { direction: 'neutral', label: '—', srLabel: 'No change data' }
  }
  if (previous === 0 && current > 0) {
    return { direction: 'up', label: '↑ New', srLabel: 'Up from zero' }
  }
  const delta = current - previous
  const pct = Math.round((delta / previous) * 100)
  if (delta === 0) {
    return { direction: 'flat', label: '→ 0%', srLabel: 'Flat versus prior period' }
  }
  if (delta > 0) {
    return {
      direction: 'up',
      label: `↑ ${Math.abs(pct)}%`,
      srLabel: `Up ${Math.abs(pct)} percent versus prior period`,
    }
  }
  return {
    direction: 'down',
    label: `↓ ${Math.abs(pct)}%`,
    srLabel: `Down ${Math.abs(pct)} percent versus prior period`,
  }
}

export function countInDateRange(
  items: { created_at: string }[],
  start: Date,
  end: Date,
): number {
  const s = start.getTime()
  const e = end.getTime()
  return items.filter(it => {
    const t = new Date(it.created_at).getTime()
    return t >= s && t < e
  }).length
}

export function countByUpdatedStatusInRange(
  items: { updated_at: string; status: string }[],
  status: string,
  start: Date,
  end: Date,
): number {
  const s = start.getTime()
  const e = end.getTime()
  return items.filter(it => {
    if (it.status !== status) return false
    const t = new Date(it.updated_at).getTime()
    return t >= s && t < e
  }).length
}
