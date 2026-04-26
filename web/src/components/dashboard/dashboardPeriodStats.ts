/** Compare two rolling windows (e.g. last 30 days vs previous 30 days) for dashboard trends. */

export type PeriodWindow = { start: Date; end: Date }

export function rollingWindows(daysEach: number): { current: PeriodWindow; previous: PeriodWindow } {
  const end = new Date()
  const currentStart = new Date(end)
  currentStart.setDate(currentStart.getDate() - daysEach)
  const previousEnd = new Date(currentStart)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - daysEach)
  return {
    current: { start: currentStart, end },
    previous: { start: previousStart, end: previousEnd },
  }
}

export function isInRange(iso: string, range: PeriodWindow): boolean {
  const t = new Date(iso).getTime()
  return t >= range.start.getTime() && t < range.end.getTime()
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendVsPrior = {
  direction: TrendDirection
  /** Absolute percentage point change vs prior period (e.g. prior 5 → current 10 = +100%). */
  pct: number | null
}

/**
 * Percent change from prior to current counts.
 * When prior is 0 and current > 0, returns +100% up (conventional "infinite growth" cap).
 */
export function trendFromCounts(current: number, prior: number): TrendVsPrior {
  if (current === prior) return { direction: 'flat', pct: 0 }
  if (prior === 0) {
    if (current === 0) return { direction: 'flat', pct: null }
    return { direction: 'up', pct: 100 }
  }
  const raw = ((current - prior) / prior) * 100
  const rounded = Math.round(Math.abs(raw))
  if (raw > 0) return { direction: 'up', pct: rounded }
  if (raw < 0) return { direction: 'down', pct: rounded }
  return { direction: 'flat', pct: 0 }
}

export function formatTrendLabel(t: TrendVsPrior): string {
  if (t.pct === null) return '—'
  if (t.direction === 'flat') return '0%'
  const sign = t.direction === 'up' ? '+' : '−'
  return `${sign}${t.pct}%`
}
