import type { SummaryTrend } from './DashboardSummaryCards'

/** Compare two rolling counts into a compact trend for KPI cards. */
export function trendFromCounts(current: number, previous: number): SummaryTrend | undefined {
  if (current === 0 && previous === 0) return undefined
  if (previous === 0 && current > 0) {
    return { direction: 'up', label: current === 1 ? 'new' : `+${current}` }
  }
  if (previous > 0) {
    const pct = Math.round(((current - previous) / previous) * 100)
    if (pct === 0) return { direction: 'flat', label: '0%' }
    if (pct > 0) return { direction: 'up', label: `${pct}%` }
    return { direction: 'down', label: `${pct}%` }
  }
  if (current === 0 && previous > 0) {
    const pct = -100
    return { direction: 'down', label: `${pct}%` }
  }
  return undefined
}
