export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

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
  /** Whole number percentage change vs prior window; null if prior was 0 and current is 0 */
  pct: number | null
  label: string
}

function pctChange(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: null, label: 'No prior data' }
  }
  if (previous === 0) {
    return { direction: 'up', pct: 100, label: 'vs prior period' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { direction, pct: Math.abs(raw), label: 'vs prior period' }
}

export function trendForCreatedCounts(
  items: { created_at: string }[],
  days = 30,
): TrendResult {
  const now = new Date()
  const endCurrent = now.getTime()
  const startCurrent = endCurrent - days * 86400000
  const startPrevious = startCurrent - days * 86400000
  const current = items.filter(i => {
    const t = new Date(i.created_at).getTime()
    return t >= startCurrent && t <= endCurrent
  }).length
  const previous = items.filter(i => {
    const t = new Date(i.created_at).getTime()
    return t >= startPrevious && t < startCurrent
  }).length
  return pctChange(current, previous)
}

export function trendForStatusUpdated(
  items: { status: string; updated_at: string }[],
  status: string,
  days = 30,
): TrendResult {
  const now = new Date()
  const endCurrent = now.getTime()
  const startCurrent = endCurrent - days * 86400000
  const startPrevious = startCurrent - days * 86400000
  const current = items.filter(
    i =>
      i.status === status &&
      (() => {
        const t = new Date(i.updated_at).getTime()
        return t >= startCurrent && t <= endCurrent
      })(),
  ).length
  const previous = items.filter(
    i =>
      i.status === status &&
      (() => {
        const t = new Date(i.updated_at).getTime()
        return t >= startPrevious && t < startCurrent
      })(),
  ).length
  return pctChange(current, previous)
}

/** New jobs created (any status) in window — proxy for hiring momentum on the Active Jobs card */
export function trendForJobsCreated(
  jobs: { created_at: string }[],
  days = 30,
): TrendResult {
  const now = new Date()
  const endCurrent = now.getTime()
  const startCurrent = endCurrent - days * 86400000
  const startPrevious = startCurrent - days * 86400000
  const current = jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= startCurrent && t <= endCurrent
  }).length
  const previous = jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= startPrevious && t < startCurrent
  }).length
  return pctChange(current, previous)
}

export function trendForInterviewAssignments(
  rows: { created_at: string; status: string }[],
  days = 14,
): TrendResult {
  const now = new Date()
  const endCurrent = now.getTime()
  const startCurrent = endCurrent - days * 86400000
  const startPrevious = startCurrent - days * 86400000
  const active = (r: { status: string }) =>
    r.status === 'scheduled' || r.status === 'pending'
  const current = rows.filter(
    r =>
      active(r) &&
      (() => {
        const t = new Date(r.created_at).getTime()
        return t >= startCurrent && t <= endCurrent
      })(),
  ).length
  const previous = rows.filter(
    r =>
      active(r) &&
      (() => {
        const t = new Date(r.created_at).getTime()
        return t >= startPrevious && t < startCurrent
      })(),
  ).length
  return pctChange(current, previous)
}

/** Ordered funnel stages for workspace pipeline visualization */
export const PIPELINE_FUNNEL_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
