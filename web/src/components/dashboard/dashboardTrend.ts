type TrendTone = 'up' | 'down' | 'neutral'

export type SummaryTrend = {
  arrow: string
  pctLabel: string
  tone: TrendTone
}

export function computeTrend(current: number, previous: number, upIsGood = true): SummaryTrend {
  if (current === previous) {
    return { arrow: '→', pctLabel: '0%', tone: 'neutral' }
  }
  if (previous === 0) {
    const up = current > 0
    return {
      arrow: up ? '↑' : '↓',
      pctLabel: up ? '+100%' : '0%',
      tone: up ? (upIsGood ? 'up' : 'down') : 'neutral',
    }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const up = current > previous
  const magnitude = `${raw > 0 ? '+' : ''}${raw}%`
  let tone: TrendTone = 'neutral'
  if (up) tone = upIsGood ? 'up' : 'down'
  else tone = upIsGood ? 'down' : 'up'
  return { arrow: up ? '↑' : '↓', pctLabel: magnitude, tone }
}
