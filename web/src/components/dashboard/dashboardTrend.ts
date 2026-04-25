export type TrendDirection = 'up' | 'down' | 'flat'

export function formatTrendPercent(current: number, previous: number): { direction: TrendDirection; label: string } {
  if (previous <= 0 && current <= 0) return { direction: 'flat', label: '0%' }
  if (previous <= 0 && current > 0) return { direction: 'up', label: '+100%' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  if (rounded === 0) return { direction: 'flat', label: '0%' }
  if (raw > 0) return { direction: 'up', label: `+${Math.abs(rounded)}%` }
  return { direction: 'down', label: `-${Math.abs(rounded)}%` }
}
