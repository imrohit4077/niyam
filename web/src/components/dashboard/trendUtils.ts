import type { SummaryTrend, TrendDirection } from './SummaryStatCard'

/**
 * Compare two counts; returns a trend label suitable for KPI cards.
 * When previous is 0, avoids division blow-up.
 */
export function trendFromCounts(current: number, previous: number): SummaryTrend {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', label: 'New' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, label: `${sign}${rounded}%` }
}
