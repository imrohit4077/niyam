import type { TrendDirection } from './DashboardSummaryCard'

export type TrendInfo = { direction: TrendDirection; label: string }

/** Format a period-over-period percentage for display (↑ ↓ %). */
export function periodOverPeriodTrend(current: number, previous: number): TrendInfo {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: '+100%' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, label: `${sign}${rounded}%` }
}

export function countInDateRange(
  dates: string[],
  startMs: number,
  endMs: number,
): number {
  return dates.reduce((acc, iso) => {
    const t = new Date(iso).getTime()
    if (t >= startMs && t < endMs) return acc + 1
    return acc
  }, 0)
}
