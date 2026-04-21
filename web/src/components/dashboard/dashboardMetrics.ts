/** Shared helpers for homepage dashboard metrics and trends. */

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendSnapshot = {
  direction: TrendDirection
  /** Whole-number percentage change vs prior period (0 if prior was 0). */
  percent: number
  /** Human label for the comparison window. */
  periodLabel: string
}

export function trendFromCounts(current: number, previous: number, periodLabel: string): TrendSnapshot {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', percent: 0, periodLabel }
  }
  if (previous === 0) {
    return { direction: 'up', percent: 100, periodLabel }
  }
  const raw = ((current - previous) / previous) * 100
  const percent = Math.round(Math.abs(raw))
  const direction: TrendDirection = raw > 0.5 ? 'up' : raw < -0.5 ? 'down' : 'flat'
  return { direction, percent, periodLabel }
}

export function countInDateRange(
  rows: { created_at?: string; updated_at?: string }[],
  field: 'created_at' | 'updated_at',
  start: Date,
  end: Date,
): number {
  const startMs = start.getTime()
  const endMs = end.getTime()
  return rows.filter(row => {
    const raw = row[field]
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= startMs && t < endMs
  }).length
}
