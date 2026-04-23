export type TrendDirection = 'up' | 'down' | 'neutral'

export function formatTrendPercent(delta: number, previous: number): { direction: TrendDirection; label: string } {
  if (previous === 0 && delta === 0) return { direction: 'neutral', label: '0%' }
  if (previous === 0 && delta > 0) return { direction: 'up', label: 'New' }
  if (previous === 0 && delta < 0) return { direction: 'down', label: '0%' }
  const pct = Math.round((delta / previous) * 100)
  if (pct === 0) return { direction: 'neutral', label: '0%' }
  return {
    direction: pct > 0 ? 'up' : 'down',
    label: `${pct > 0 ? '+' : ''}${pct}%`,
  }
}
