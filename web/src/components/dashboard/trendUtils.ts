export type TrendDisplay = {
  arrow: '↑' | '↓' | '—'
  pctLabel: string
  /** True when movement is "good" for hiring (context-dependent) */
  favorable: boolean
}

/**
 * Compare current vs previous period counts into a compact trend line (↑ 12%).
 * When previous is 0, avoids division by zero.
 */
export function formatCountTrend(current: number, previous: number, higherIsBetter = true): TrendDisplay {
  if (current === previous) {
    return { arrow: '—', pctLabel: '0%', favorable: true }
  }
  if (previous === 0) {
    if (current === 0) return { arrow: '—', pctLabel: '0%', favorable: true }
    return {
      arrow: '↑',
      pctLabel: 'New',
      favorable: higherIsBetter,
    }
  }
  const rawPct = Math.round(((current - previous) / previous) * 100)
  const up = current > previous
  const arrow = up ? '↑' : '↓'
  const pctLabel = `${up ? '+' : ''}${rawPct}%`
  const favorable = higherIsBetter ? up : !up
  return { arrow, pctLabel, favorable }
}
