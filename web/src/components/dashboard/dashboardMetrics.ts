/** Shared helpers for dashboard KPI trends and date windows. */

export type WindowCounts = { current: number; previous: number }

const MS_DAY = 86400000

export function getWindowBounds(days: number) {
  const now = Date.now()
  const currentStart = now - days * MS_DAY
  const previousStart = now - 2 * days * MS_DAY
  return { currentStart, currentEnd: now, previousStart, previousEnd: currentStart }
}

export function countInDateWindow(
  dates: Array<string | null | undefined>,
  days: number,
): WindowCounts {
  const { currentStart, currentEnd, previousStart, previousEnd } = getWindowBounds(days)
  let current = 0
  let previous = 0
  for (const raw of dates) {
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (Number.isNaN(t)) continue
    if (t >= currentStart && t < currentEnd) current += 1
    else if (t >= previousStart && t < previousEnd) previous += 1
  }
  return { current, previous }
}

/** Percent change from previous to current; unbounded when previous is 0. */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

export function trendFromWindows(w: WindowCounts): { direction: 'up' | 'down' | 'flat'; pct: number; label: string } {
  const pct = percentChange(w.current, w.previous)
  if (pct > 0) return { direction: 'up', pct, label: `${pct > 0 ? '+' : ''}${pct}%` }
  if (pct < 0) return { direction: 'down', pct, label: `${pct}%` }
  return { direction: 'flat', pct: 0, label: '0%' }
}
