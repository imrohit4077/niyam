export type TrendDirection = 'up' | 'down' | 'flat'

export function monthOverMonthPercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

export function formatTrendPercent(
  delta: number,
  invertGood = false,
): { direction: TrendDirection; text: string; positiveOutcome: boolean } {
  if (delta === 0 || Number.isNaN(delta)) {
    return { direction: 'flat', text: '0%', positiveOutcome: true }
  }
  const up = delta > 0
  const direction: TrendDirection = up ? 'up' : 'down'
  const abs = Math.abs(delta)
  const text = `${up ? '+' : ''}${abs}%`
  const moreIsBetter = !invertGood
  const positiveOutcome = moreIsBetter ? up : !up
  return { direction, text, positiveOutcome }
}
