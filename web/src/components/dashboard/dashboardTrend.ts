import type { TrendDirection } from './DashboardSummaryCard'

/** Compare current to previous; returns direction and signed percent change (0–100 scale when sensible). */
export function computeTrend(current: number, previous: number): {
  direction: TrendDirection
  percent: number
  caption: string
} {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', percent: 0, caption: 'vs prior period' }
  }
  if (previous === 0) {
    return { direction: 'up', percent: 100, caption: 'vs prior period' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const magnitude = Math.min(999, Math.abs(rounded))
  return { direction, percent: direction === 'down' ? -magnitude : direction === 'up' ? magnitude : 0, caption: 'vs prior period' }
}
