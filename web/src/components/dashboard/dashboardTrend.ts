export type TrendDirection = 'up' | 'down' | 'flat'

export function formatTrendPercent(prev: number, curr: number): { direction: TrendDirection; label: string } {
  if (prev === 0 && curr === 0) return { direction: 'flat', label: '0%' }
  if (prev === 0 && curr > 0) return { direction: 'up', label: '—' }
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct > 0) return { direction: 'up', label: `${pct}%` }
  if (pct < 0) return { direction: 'down', label: `${Math.abs(pct)}%` }
  return { direction: 'flat', label: '0%' }
}
