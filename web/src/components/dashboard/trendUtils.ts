export type TrendDirection = 'up' | 'down' | 'flat'

export function formatTrendPercent(delta: number, base: number): { pct: number; direction: TrendDirection } {
  if (base <= 0) {
    if (delta > 0) return { pct: 100, direction: 'up' }
    if (delta < 0) return { pct: 0, direction: 'down' }
    return { pct: 0, direction: 'flat' }
  }
  const raw = (delta / base) * 100
  const pct = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { pct, direction: 'up' }
  if (raw < -0.5) return { pct, direction: 'down' }
  return { pct: 0, direction: 'flat' }
}
