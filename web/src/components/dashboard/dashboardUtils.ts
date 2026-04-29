/** Shared helpers for the home dashboard analytics. */

export type TrendDirection = 'up' | 'down' | 'flat'

export function trendFromPrevious(current: number, previous: number): { direction: TrendDirection; percent: number } {
  if (current === 0 && previous === 0) return { direction: 'flat', percent: 0 }
  if (previous === 0) return { direction: current > 0 ? 'up' : 'flat', percent: 100 }
  const raw = ((current - previous) / previous) * 100
  const percent = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { direction: 'up', percent }
  if (raw < -0.5) return { direction: 'down', percent }
  return { direction: 'flat', percent: 0 }
}

export function countCreatedInRange<T extends { created_at: string }>(
  rows: T[],
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    const t = new Date(row.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countUpdatedInRange<T extends { updated_at: string }>(
  rows: T[],
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    const t = new Date(row.updated_at).getTime()
    return t >= a && t < b
  }).length
}

export function countByDateFieldInRange<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    const d = getDate(row)
    if (!d) return false
    const t = new Date(d).getTime()
    return t >= a && t < b
  }).length
}

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStageKey = (typeof PIPELINE_ORDER)[number]

export function pipelineCountsFromStatuses(statusCounts: Record<string, number>): Record<PipelineStageKey, number> {
  const base: Record<PipelineStageKey, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const key of PIPELINE_ORDER) {
    base[key] = statusCounts[key] ?? 0
  }
  return base
}

export function dominantStatusForJob(
  applications: { job_id: number; status: string }[],
  jobId: number,
): string | null {
  const counts: Record<string, number> = {}
  for (const app of applications) {
    if (app.job_id !== jobId) continue
    counts[app.status] = (counts[app.status] ?? 0) + 1
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  entries.sort((x, y) => y[1] - x[1])
  return entries[0]?.[0] ?? null
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}
