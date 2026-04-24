export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export function formatTrendPercent(deltaPercent: number | null, labelWhenNull = '—'): { text: string; direction: TrendDirection } {
  if (deltaPercent == null || Number.isNaN(deltaPercent)) {
    return { text: labelWhenNull, direction: 'neutral' }
  }
  if (Math.abs(deltaPercent) < 0.05) {
    return { text: '0%', direction: 'flat' }
  }
  const rounded = Math.round(deltaPercent * 10) / 10
  const direction: TrendDirection = rounded > 0 ? 'up' : 'down'
  const text = `${rounded > 0 ? '↑' : '↓'} ${Math.abs(rounded)}%`
  return { text, direction }
}

export function deltaPercentVsPrior(current: number, prior: number): number | null {
  if (prior <= 0 && current <= 0) return null
  if (prior <= 0) return null
  return ((current - prior) / prior) * 100
}
