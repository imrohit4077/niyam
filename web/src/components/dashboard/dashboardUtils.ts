/** Inclusive start, exclusive end in ms. */
export function countByDateRange<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
  startMs: number,
  endMs: number,
): number {
  let n = 0
  for (const row of rows) {
    const raw = getDate(row)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (Number.isNaN(t)) continue
    if (t >= startMs && t < endMs) n += 1
  }
  return n
}

export type TrendParts = {
  /** 'up' | 'down' | 'flat' | 'neutral' when no comparison */
  direction: 'up' | 'down' | 'flat' | 'neutral'
  /** e.g. "12%" or "0%" */
  percentLabel: string
  /** Short caption under the arrow */
  caption: string
}

/**
 * Compares recent window vs previous window of equal length.
 * Returns neutral when both are zero.
 */
export function trendFromWindows(current: number, previous: number): TrendParts {
  if (current === 0 && previous === 0) {
    return { direction: 'neutral', percentLabel: '—', caption: 'vs prior period' }
  }
  if (previous === 0 && current > 0) {
    return { direction: 'up', percentLabel: 'New', caption: 'vs prior period' }
  }
  if (previous === 0) {
    return { direction: 'neutral', percentLabel: '—', caption: 'vs prior period' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return {
    direction,
    percentLabel: `${sign}${pct}%`,
    caption: 'vs prior 30 days',
  }
}

export const MS_PER_DAY = 86400000
