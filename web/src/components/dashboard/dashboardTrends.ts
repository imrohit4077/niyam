import type { SummaryTrend } from './DashboardSummaryCard'

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.min(999, Math.max(-999, n)))
}

/** Compare count in current window vs previous window of equal length. */
export function trendFromCounts(current: number, previous: number): SummaryTrend {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0 }
  if (previous === 0 && current > 0) return { direction: 'up', pct: 100 }
  const raw = ((current - previous) / previous) * 100
  const pct = clampPct(raw)
  if (pct === 0) return { direction: 'flat', pct: 0 }
  return { direction: pct > 0 ? 'up' : 'down', pct: Math.abs(pct) }
}

export function inUtcRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function rolling30DayWindows(now = new Date()): { current: { start: Date; end: Date }; previous: { start: Date; end: Date } } {
  const end = now
  const currentStart = new Date(end)
  currentStart.setUTCDate(currentStart.getUTCDate() - 30)
  const previousEnd = new Date(currentStart)
  const previousStart = new Date(previousEnd)
  previousStart.setUTCDate(previousStart.getUTCDate() - 30)
  return {
    current: { start: currentStart, end },
    previous: { start: previousStart, end: previousEnd },
  }
}
