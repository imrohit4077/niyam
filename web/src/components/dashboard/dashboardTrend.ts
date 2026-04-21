export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Percent change vs prior period, rounded; null when not meaningful */
  pct: number | null
  prior: number
  current: number
}

/**
 * Compares `current` vs `prior` counts for a prior window of the same length.
 * When prior is 0 and current > 0, pct is null (show as "new" in UI).
 */
export function computeTrend(current: number, prior: number): TrendResult {
  if (current === prior) {
    return { direction: 'flat', pct: 0, prior, current }
  }
  if (prior === 0) {
    return {
      direction: current > 0 ? 'up' : 'flat',
      pct: current > 0 ? null : 0,
      prior,
      current,
    }
  }
  const raw = ((current - prior) / prior) * 100
  const pct = Math.round(Math.abs(raw) >= 1 ? raw : Math.sign(raw) * Math.ceil(Math.abs(raw)))
  return {
    direction: current > prior ? 'up' : 'down',
    pct,
    prior,
    current,
  }
}

export function formatTrendLabel(t: TrendResult): string {
  if (t.direction === 'flat' && t.pct === 0) return '0%'
  if (t.pct === null && t.current > 0) return 'New'
  if (t.pct === null) return '—'
  const sign = t.pct > 0 ? '+' : ''
  return `${sign}${t.pct}%`
}
