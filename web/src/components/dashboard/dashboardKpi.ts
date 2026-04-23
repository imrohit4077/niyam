/** 30-day window comparison for KPI trend arrows. */
export type TrendDirection = 'up' | 'down' | 'flat'

export type KpiTrend = {
  direction: TrendDirection
  percent: number
  /** Human label, e.g. "vs prior 30 days" */
  periodLabel: string
}

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000

export function comparePeriodCounts(current: number, previous: number): KpiTrend {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', percent: 0, periodLabel: 'vs prior 30 days' }
  }
  if (previous === 0) {
    return { direction: 'up', percent: 100, periodLabel: 'vs prior 30 days' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { direction, percent: Math.abs(raw), periodLabel: 'vs prior 30 days' }
}

export function periodBoundaries(now = new Date()) {
  const end = now.getTime()
  const currentStart = end - PERIOD_MS
  const previousEnd = currentStart
  const previousStart = previousEnd - PERIOD_MS
  return { currentStart, currentEnd: end, previousStart, previousEnd }
}

export function inTimeRange(iso: string, startMs: number, endMs: number) {
  const t = new Date(iso).getTime()
  return t >= startMs && t < endMs
}

export function trendArrow(direction: TrendDirection) {
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  return '→'
}
