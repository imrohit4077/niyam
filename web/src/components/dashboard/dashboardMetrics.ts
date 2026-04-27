/** Shared dashboard math + date helpers (workspace-level, client-side). */

export type TrendResult = {
  /** Signed percentage change vs previous period (integer). */
  pct: number
  direction: 'up' | 'down' | 'flat'
}

export function trendVsPrevious(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: 100, direction: current > 0 ? 'up' : 'flat' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw) >= 1 ? raw : Math.sign(raw) * Math.min(1, Math.abs(raw)))
  if (pct > 0) return { pct, direction: 'up' }
  if (pct < 0) return { pct: Math.abs(pct), direction: 'down' }
  return { pct: 0, direction: 'flat' }
}

export function countInDateRange(
  dates: Array<string | null | undefined>,
  start: Date,
  end: Date,
): number {
  const s = start.getTime()
  const e = end.getTime()
  return dates.filter(d => {
    if (!d) return false
    const t = new Date(d).getTime()
    return t >= s && t < e
  }).length
}

export function lastTwoRolling30DayWindows(now = new Date()) {
  const endCurrent = new Date(now)
  const startCurrent = new Date(now)
  startCurrent.setDate(startCurrent.getDate() - 30)

  const endPrevious = new Date(startCurrent)
  const startPrevious = new Date(startCurrent)
  startPrevious.setDate(startPrevious.getDate() - 30)

  return {
    current: { start: startCurrent, end: endCurrent },
    previous: { start: startPrevious, end: endPrevious },
  }
}
