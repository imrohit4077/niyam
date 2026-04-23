export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Whole percent vs prior period, e.g. 12 or -5 */
  percent: number | null
}

/**
 * Compare current period count to prior period. Returns null percent when no meaningful baseline.
 */
export function comparePeriodTrend(current: number, previous: number): TrendResult {
  if (current === previous) return { direction: 'flat', percent: 0 }
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', percent: 0 }
    return { direction: 'up', percent: null }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  if (raw > 0) return { direction: 'up', percent: raw }
  if (raw < 0) return { direction: 'down', percent: raw }
  return { direction: 'flat', percent: 0 }
}

export function formatTrendLabel(t: TrendResult): string {
  if (t.percent === null) return t.direction === 'up' ? '↑ new' : '—'
  if (t.direction === 'flat') return '0%'
  const arrow = t.direction === 'up' ? '↑' : '↓'
  return `${arrow} ${Math.abs(t.percent)}%`
}

export function countApplicationsBetween(
  timestamps: string[],
  startMs: number,
  endMs: number,
): number {
  let n = 0
  for (const iso of timestamps) {
    const t = new Date(iso).getTime()
    if (t >= startMs && t < endMs) n += 1
  }
  return n
}
