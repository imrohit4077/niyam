export type TrendDirection = 'up' | 'down' | 'flat'

export function computeTrendPercent(current: number, previous: number): { pct: number; direction: TrendDirection } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, direction: 'flat' }
    return { pct: 100, direction: 'up' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { pct: Math.abs(raw), direction }
}
