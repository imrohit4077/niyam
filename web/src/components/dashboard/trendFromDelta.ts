export type TrendDirection = 'up' | 'down' | 'flat'

export function trendFromDelta(current: number, previous: number): { direction: TrendDirection; pct: number | null } {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: null }
  if (previous === 0) return { direction: current > 0 ? 'up' : 'flat', pct: current > 0 ? 100 : null }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { direction: 'up', pct }
  if (raw < -0.5) return { direction: 'down', pct }
  return { direction: 'flat', pct: 0 }
}
