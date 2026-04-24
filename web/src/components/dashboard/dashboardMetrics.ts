import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

/** Local calendar month bounds (consistent with dashboard monthly trend charts). */
export function monthStartLocal(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1, 0, 0, 0, 0)
}

export function monthEndLocal(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
}

export function countApplicationsCreatedInMonth(apps: Application[], year: number, monthIndex: number) {
  const start = monthStartLocal(year, monthIndex).getTime()
  const end = monthEndLocal(year, monthIndex).getTime()
  return apps.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= start && t <= end
  }).length
}

export function countOffersTouchedInMonth(apps: Application[], year: number, monthIndex: number) {
  const start = monthStartLocal(year, monthIndex).getTime()
  const end = monthEndLocal(year, monthIndex).getTime()
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= start && t <= end
  }).length
}

export function countInterviewsScheduledInMonth(rows: InterviewAssignmentRow[], year: number, monthIndex: number) {
  const start = monthStartLocal(year, monthIndex).getTime()
  const end = monthEndLocal(year, monthIndex).getTime()
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= start && t <= end
  }).length
}

export function countJobsCreatedInMonth(
  jobs: { created_at: string }[],
  year: number,
  monthIndex: number,
  filter?: (j: { created_at: string }) => boolean,
) {
  const start = monthStartLocal(year, monthIndex).getTime()
  const end = monthEndLocal(year, monthIndex).getTime()
  return jobs.filter(j => {
    if (filter && !filter(j)) return false
    const t = new Date(j.created_at).getTime()
    return t >= start && t <= end
  }).length
}

/** Percent change cur vs prev; null if prev is 0 (avoid misleading infinity). */
export function percentChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null
  return Math.round(((cur - prev) / prev) * 100)
}

export const PIPELINE_FUNNEL_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelKey = (typeof PIPELINE_FUNNEL_ORDER)[number]

export function funnelCountsFromApplications(apps: Application[]): Record<PipelineFunnelKey, number> {
  const base: Record<PipelineFunnelKey, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of apps) {
    const s = (a.status || '').toLowerCase()
    if (s in base) base[s as PipelineFunnelKey] += 1
  }
  return base
}
