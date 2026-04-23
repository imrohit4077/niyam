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

export type TrendDirection = 'up' | 'down' | 'neutral'

export type TrendDisplay = {
  direction: TrendDirection
  label: string
  /** 0–1 positive = up, negative = down */
  tone: 'positive' | 'negative' | 'muted'
}

/** Percent change from previous to current period; handles zero previous. */
export function trendFromCounts(current: number, previous: number): TrendDisplay {
  if (current === 0 && previous === 0) {
    return { direction: 'neutral', label: '0%', tone: 'muted' }
  }
  if (previous === 0) {
    return {
      direction: 'up',
      label: current > 0 ? 'New' : '0%',
      tone: current > 0 ? 'positive' : 'muted',
    }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) {
    return { direction: 'neutral', label: '0%', tone: 'muted' }
  }
  if (pct > 0) {
    return { direction: 'up', label: `↑ ${pct}%`, tone: 'positive' }
  }
  return { direction: 'down', label: `↓ ${Math.abs(pct)}%`, tone: 'negative' }
}

const MS_DAY = 86400000

export function countBetween<T>(items: T[], getTime: (item: T) => number | null, start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return items.filter(item => {
    const t = getTime(item)
    if (t == null || Number.isNaN(t)) return false
    return t >= a && t < b
  }).length
}

export function lastNDaysRange(n: number, endOffsetDays = 0) {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() - endOffsetDays)
  const start = new Date(end.getTime() - n * MS_DAY)
  return { start, end }
}
