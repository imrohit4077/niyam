import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat' | 'none'

export function trendDirectionFromDelta(delta: number): TrendDirection {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  if (delta === 0) return 'flat'
  return 'none'
}

/** Percent change vs previous period; null if both periods are empty (no trend). */
export function percentChangeVsPrevious(current: number, previous: number): { pct: number | null; direction: TrendDirection } {
  if (current === 0 && previous === 0) return { pct: null, direction: 'none' }
  if (previous === 0) return { pct: current > 0 ? 100 : 0, direction: trendDirectionFromDelta(current) }
  const raw = ((current - previous) / previous) * 100
  return { pct: raw, direction: trendDirectionFromDelta(current - previous) }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function countApplicationsCreatedInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(a => inRange(a.created_at, start, end)).length
}

export function countJobsCreatedInRange(jobs: Job[], start: Date, end: Date) {
  return jobs.filter(j => inRange(j.created_at, start, end)).length
}

export function countInterviewAssignmentsCreatedInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  return rows.filter(r => r.scheduled_at && inRange(r.created_at, start, end)).length
}

export function countStageHistoryEventsInRange(
  applications: Application[],
  stage: string,
  start: Date,
  end: Date,
): number {
  let n = 0
  for (const app of applications) {
    for (const ev of app.stage_history ?? []) {
      if (ev.stage === stage && inRange(ev.changed_at, start, end)) n += 1
    }
  }
  return n
}

/** Interviews with scheduled_at falling in [from, from + days) */
export function countInterviewsScheduledInForwardWindow(
  rows: InterviewAssignmentRow[],
  from: Date,
  days: number,
): number {
  const to = new Date(from.getTime() + days * 86400000)
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= from.getTime() && t < to.getTime()
  }).length
}
