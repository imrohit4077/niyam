/** Count items whose date field falls in [start, end). */
export function countInDateRange<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  start: Date,
  end: Date,
): number {
  const s = start.getTime()
  const e = end.getTime()
  let n = 0
  for (const item of items) {
    const raw = getDate(item)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= s && t < e) n += 1
  }
  return n
}

export type TrendDirection = 'up' | 'down' | 'flat'

/** Compare last 7 days vs previous 7 days; returns direction and integer percent change. */
export function weekOverWeekTrend(currentCount: number, previousCount: number): {
  direction: TrendDirection
  percent: number | null
} {
  if (previousCount === 0 && currentCount === 0) return { direction: 'flat', percent: null }
  if (previousCount === 0 && currentCount > 0) return { direction: 'up', percent: 100 }
  const delta = ((currentCount - previousCount) / previousCount) * 100
  const rounded = Math.round(delta)
  if (rounded === 0) return { direction: 'flat', percent: 0 }
  return { direction: rounded > 0 ? 'up' : 'down', percent: Math.min(999, Math.abs(rounded)) }
}

export function rollingWeekBoundaries(now = new Date()) {
  const endCurrent = new Date(now)
  const startCurrent = new Date(now)
  startCurrent.setDate(startCurrent.getDate() - 7)

  const endPrevious = new Date(startCurrent)
  const startPrevious = new Date(startCurrent)
  startPrevious.setDate(startPrevious.getDate() - 7)

  return { startCurrent, endCurrent, startPrevious, endPrevious }
}
