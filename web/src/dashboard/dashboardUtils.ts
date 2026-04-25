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

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  percent: number
  /** Human-readable comparison, e.g. "vs prior 30 days" */
  periodLabel: string
}

/**
 * Percent change from `previous` to `current` (can exceed 100% when previous is 0).
 */
export function trendFromCounts(current: number, previous: number, periodLabel: string): TrendResult {
  if (current === previous) {
    return { direction: 'flat', percent: 0, periodLabel }
  }
  if (previous <= 0 && current > 0) {
    return { direction: 'up', percent: 100, periodLabel }
  }
  if (previous <= 0 && current <= 0) {
    return { direction: 'flat', percent: 0, periodLabel }
  }
  const raw = ((current - previous) / previous) * 100
  const percent = Math.round(Math.abs(raw))
  return {
    direction: raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat',
    percent,
    periodLabel,
  }
}

export function countInDateRange(
  dates: Array<string | null | undefined>,
  startMs: number,
  endMs: number,
): number {
  let n = 0
  for (const d of dates) {
    if (!d) continue
    const t = new Date(d).getTime()
    if (t >= startMs && t < endMs) n += 1
  }
  return n
}

const MS_DAY = 86400000

export function lastTwoWindowsDays(now: Date, windowDays: number): { currentStart: number; currentEnd: number; prevStart: number; prevEnd: number } {
  const end = now.getTime()
  const currentStart = end - windowDays * MS_DAY
  const prevEnd = currentStart
  const prevStart = prevEnd - windowDays * MS_DAY
  return { currentStart, currentEnd: end, prevStart, prevEnd }
}
