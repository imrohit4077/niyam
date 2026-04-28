export type TrendDirection = 'up' | 'down' | 'flat'

export function formatTrendPercent(deltaPercent: number | null): { label: string; direction: TrendDirection } {
  if (deltaPercent == null || Number.isNaN(deltaPercent)) {
    return { label: '—', direction: 'flat' }
  }
  if (deltaPercent > 0) return { label: `↑ ${deltaPercent}%`, direction: 'up' }
  if (deltaPercent < 0) return { label: `↓ ${Math.abs(deltaPercent)}%`, direction: 'down' }
  return { label: '0%', direction: 'flat' }
}

export function monthOverMonthPercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
}
