/** Shared helpers for the home dashboard (charts + KPI trends). */

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Whole-number percent change vs previous period (0–100+). */
  percent: number
  /** Human label like "+12%" or "0%" */
  label: string
}

/**
 * Compares count in the recent window vs the prior window of equal length.
 * Returns percent change of recent vs previous (not rate of change of ratio).
 */
export function comparePeriodCounts(recent: number, previous: number): TrendResult {
  if (previous === 0 && recent === 0) {
    return { direction: 'flat', percent: 0, label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', percent: 100, label: '+100%' }
  }
  const raw = Math.round(((recent - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  const label = `${raw > 0 ? '+' : ''}${raw}%`
  return { direction, percent: Math.abs(raw), label }
}

export function countInDateWindow(
  dates: Array<string | null | undefined>,
  windowEnd: Date,
  windowDays: number,
): number {
  const endMs = windowEnd.getTime()
  const startMs = endMs - windowDays * 86400000
  return dates.filter(d => {
    if (!d) return false
    const t = new Date(d).getTime()
    return t >= startMs && t <= endMs
  }).length
}
