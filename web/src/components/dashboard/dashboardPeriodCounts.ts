/** Count items whose date field falls in [start, end) (end exclusive). */
export function countInDateRange<T>(
  items: T[],
  getIsoDate: (item: T) => string | null | undefined,
  start: Date,
  end: Date,
): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return items.filter(item => {
    const raw = getIsoDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= t0 && t < t1
  }).length
}

export function last30dVsPrior30d<T>(
  items: T[],
  getIsoDate: (item: T) => string | null | undefined,
  now = new Date(),
): { current: number; previous: number } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startCurrent = new Date(end)
  startCurrent.setDate(startCurrent.getDate() - 30)
  const startPrevious = new Date(startCurrent)
  startPrevious.setDate(startPrevious.getDate() - 30)

  const current = countInDateRange(items, getIsoDate, startCurrent, end)
  const previous = countInDateRange(items, getIsoDate, startPrevious, startCurrent)
  return { current, previous }
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return null
    return 100
  }
  return Math.round(((current - previous) / previous) * 100)
}

export function formatTrendPercent(pct: number | null): string {
  if (pct === null) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}%`
}
