export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export function computeTrendPercent(current: number, previous: number): { direction: TrendDirection; label: string } {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0 && current > 0) return { direction: 'up', label: 'New' }
  if (previous === 0 && current < 0) return { direction: 'down', label: '—' }
  const raw = ((current - previous) / Math.abs(previous)) * 100
  const pct = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { direction: 'up', label: `↑ ${pct}%` }
  if (raw < -0.5) return { direction: 'down', label: `↓ ${pct}%` }
  return { direction: 'flat', label: '0%' }
}
