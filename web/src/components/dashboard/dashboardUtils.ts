export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type PeriodTrend = {
  direction: TrendDirection
  percent: number
  /** Human label, e.g. "vs prior 30d" */
  periodLabel: string
}

const MS_DAY = 86_400_000

export function rolling30DayWindows(now = new Date()) {
  const end = now.getTime()
  const currentStart = end - 30 * MS_DAY
  const previousStart = currentStart - 30 * MS_DAY
  return {
    current: { start: new Date(currentStart), end: new Date(end) },
    previous: { start: new Date(previousStart), end: new Date(currentStart) },
  }
}

export function isInRange(iso: string | null | undefined, start: Date, end: Date) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function computePeriodTrend(current: number, previous: number): PeriodTrend {
  const periodLabel = 'vs prior 30d'
  if (previous === 0 && current === 0) {
    return { direction: 'flat', percent: 0, periodLabel }
  }
  if (previous === 0) {
    return { direction: 'up', percent: 100, periodLabel }
  }
  const raw = ((current - previous) / previous) * 100
  const percent = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { direction: 'up', percent, periodLabel }
  if (raw < -0.5) return { direction: 'down', percent, periodLabel }
  return { direction: 'flat', percent: 0, periodLabel }
}
