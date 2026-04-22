export type TrendDirection = 'up' | 'down' | 'flat' | 'new'

export function formatTrendPercent(current: number, previous: number): { direction: TrendDirection; pctLabel: string } {
  if (previous === 0 && current === 0) return { direction: 'flat', pctLabel: '0%' }
  if (previous === 0 && current > 0) return { direction: 'new', pctLabel: 'New' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  if (rounded > 0) return { direction: 'up', pctLabel: `${rounded}%` }
  if (rounded < 0) return { direction: 'down', pctLabel: `${Math.abs(rounded)}%` }
  return { direction: 'flat', pctLabel: '0%' }
}
