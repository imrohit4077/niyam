export type TrendDirection = 'up' | 'down' | 'flat'

/** Percent change from previous to current; caps display for stability. */
export function percentChange(current: number, previous: number): { pct: number; direction: TrendDirection } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.max(-999, Math.round(raw)))
  if (pct > 0) return { pct, direction: 'up' }
  if (pct < 0) return { pct, direction: 'down' }
  return { pct: 0, direction: 'flat' }
}

export function formatTrendLabel(pct: number, direction: TrendDirection): string {
  if (direction === 'flat') return '0% vs prior period'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}% vs prior period`
}
