/** Compare two calendar periods (e.g. last 30 days vs prior 30 days) for dashboard KPI trends. */

export type PeriodBounds = { start: Date; end: Date }

export function rollingPeriods(daysEach: number): { current: PeriodBounds; previous: PeriodBounds } {
  const end = new Date()
  const currentStart = new Date(end)
  currentStart.setDate(currentStart.getDate() - daysEach)
  const previousEnd = new Date(currentStart)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - daysEach)
  return {
    current: { start: currentStart, end },
    previous: { start: previousStart, end: previousEnd },
  }
}

function inRange(iso: string, { start, end }: PeriodBounds): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function countByCreatedAt<T extends { created_at: string }>(rows: T[], period: PeriodBounds): number {
  return rows.filter(row => inRange(row.created_at, period)).length
}

export function countByUpdatedAt<T extends { updated_at: string }>(rows: T[], period: PeriodBounds): number {
  return rows.filter(row => inRange(row.updated_at, period)).length
}

export type TrendDisplay = {
  label: string
  direction: 'up' | 'down' | 'flat'
  /** For styling: is this trend "good" for hiring (e.g. more candidates)? */
  favorable: boolean
}

/**
 * Percent change from previous period to current. When previous is 0, uses simple copy for edge cases.
 */
export function trendDisplay(current: number, previous: number, higherIsBetter = true): TrendDisplay {
  if (current === 0 && previous === 0) {
    return { label: '0%', direction: 'flat', favorable: true }
  }
  if (previous === 0) {
    const label = current > 0 ? '+100%' : '0%'
    const direction: TrendDisplay['direction'] = current > 0 ? 'up' : 'flat'
    if (direction === 'flat') return { label, direction, favorable: true }
    return { label, direction, favorable: higherIsBetter }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const label = `${rounded > 0 ? '+' : ''}${rounded}%`
  let direction: TrendDisplay['direction'] = 'flat'
  if (rounded > 0) direction = 'up'
  else if (rounded < 0) direction = 'down'
  const favorable = higherIsBetter ? direction !== 'down' : direction !== 'up'
  return { label, direction, favorable }
}
