export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryTrend = {
  direction: TrendDirection
  pct: number
}

export function computePeriodTrend(current: number, previous: number): SummaryTrend | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) {
    if (current === 0) return null
    return { direction: 'up', pct: 100 }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { direction: 'up', pct }
  if (raw < -0.5) return { direction: 'down', pct }
  return { direction: 'flat', pct: 0 }
}
