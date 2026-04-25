export type TrendDirection = 'up' | 'down' | 'flat'

export function trendFromPeriods(currentPeriod: number, previousPeriod: number): { direction: TrendDirection; pct: number | null } {
  if (previousPeriod === 0) {
    if (currentPeriod === 0) return { direction: 'flat', pct: 0 }
    return { direction: 'up', pct: null }
  }
  const raw = Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100)
  if (raw > 0) return { direction: 'up', pct: raw }
  if (raw < 0) return { direction: 'down', pct: Math.abs(raw) }
  return { direction: 'flat', pct: 0 }
}
