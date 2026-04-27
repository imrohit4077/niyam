export type TrendDirection = 'up' | 'down' | 'flat'

export function formatTrendPercent(current: number, previous: number): { direction: TrendDirection; label: string } {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '—' }
  if (previous === 0 && current > 0) return { direction: 'up', label: '↑ New' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { direction: 'up', label: `↑ ${pct}%` }
  if (pct < 0) return { direction: 'down', label: `↓ ${Math.abs(pct)}%` }
  return { direction: 'flat', label: '→ 0%' }
}
