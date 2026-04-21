import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export type TrendResult = {
  direction: TrendDirection
  label: string
  hint?: string
}

function ymdParts(d: Date) {
  return { y: d.getFullYear(), m: d.getMonth() }
}

function isInCalendarMonth(iso: string, ref: Date) {
  const d = new Date(iso)
  const { y, m } = ymdParts(ref)
  return d.getFullYear() === y && d.getMonth() === m
}

function isInCalendarMonthOffset(iso: string, ref: Date, monthDelta: number) {
  const d = new Date(ref.getFullYear(), ref.getMonth() + monthDelta, 1)
  return isInCalendarMonth(iso, d)
}

export function formatTrendPercent(numerator: number, denominator: number): TrendResult {
  if (denominator === 0 && numerator === 0) {
    return { direction: 'flat', label: '0%', hint: 'No change vs prior period' }
  }
  if (denominator === 0) {
    return { direction: 'up', label: '100%', hint: 'No comparable activity last period' }
  }
  const raw = Math.round(((numerator - denominator) / denominator) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  const label = `${raw > 0 ? '+' : ''}${raw}%`
  return { direction, label, hint: 'Compared to prior period' }
}

/** New applications this calendar month vs last. */
export function applicationPaceTrend(applications: Application[], ref = new Date()): TrendResult {
  const thisM = applications.filter(a => isInCalendarMonth(a.created_at, ref)).length
  const lastM = applications.filter(a => isInCalendarMonthOffset(a.created_at, ref, -1)).length
  return formatTrendPercent(thisM, lastM)
}

export function newOpenJobsTrend(jobs: Job[], ref = new Date()): TrendResult {
  const thisM = jobs.filter(j => j.status === 'open' && isInCalendarMonth(j.created_at, ref)).length
  const lastM = jobs.filter(j => j.status === 'open' && isInCalendarMonthOffset(j.created_at, ref, -1)).length
  return formatTrendPercent(thisM, lastM)
}

/** All jobs created in calendar month (any status) — hiring momentum signal for dashboards. */
export function newJobsListedTrend(jobs: Job[], ref = new Date()): TrendResult {
  const thisM = jobs.filter(j => isInCalendarMonth(j.created_at, ref)).length
  const lastM = jobs.filter(j => isInCalendarMonthOffset(j.created_at, ref, -1)).length
  return formatTrendPercent(thisM, lastM)
}

export function scheduledInterviewsTrend(rows: InterviewAssignmentRow[], ref = new Date()): TrendResult {
  const inMonth = (iso: string | null, delta: number) => {
    if (!iso) return false
    return isInCalendarMonthOffset(iso, ref, delta)
  }
  const thisM = rows.filter(
    r =>
      (r.status === 'scheduled' || r.status === 'pending') &&
      inMonth(r.scheduled_at, 0),
  ).length
  const lastM = rows.filter(
    r =>
      (r.status === 'scheduled' || r.status === 'pending') &&
      inMonth(r.scheduled_at, -1),
  ).length
  return formatTrendPercent(thisM, lastM)
}

/** Workspace applications in `offer` status with updated_at in month (proxy for offer activity). */
export function offersActivityTrend(applications: Application[], ref = new Date()): TrendResult {
  const inOffer = (a: Application) => a.status === 'offer'
  const thisM = applications.filter(a => inOffer(a) && isInCalendarMonth(a.updated_at, ref)).length
  const lastM = applications.filter(a => inOffer(a) && isInCalendarMonthOffset(a.updated_at, ref, -1)).length
  return formatTrendPercent(thisM, lastM)
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function workspaceFunnelCounts(applications: Application[]): number[] {
  const map: Record<string, number> = {}
  FUNNEL_STATUSES.forEach(s => {
    map[s] = 0
  })
  for (const a of applications) {
    const s = a.status
    if (s in map) map[s] += 1
  }
  return FUNNEL_STATUSES.map(key => map[key] ?? 0)
}

export function funnelLabels(): string[] {
  return ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']
}
