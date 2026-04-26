export type TrendDirection = 'up' | 'down' | 'flat'

export function formatTrendPercent(prev: number, curr: number): { direction: TrendDirection; label: string } {
  if (prev === 0 && curr === 0) return { direction: 'flat', label: '0%' }
  if (prev === 0 && curr > 0) return { direction: 'up', label: '+100%' }
  const raw = ((curr - prev) / prev) * 100
  const rounded = Math.round(raw * 10) / 10
  const direction: TrendDirection = rounded > 0.05 ? 'up' : rounded < -0.05 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, label: `${sign}${rounded}%` }
}
