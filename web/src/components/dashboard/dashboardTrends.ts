import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { TrendDirection } from './SummaryKpiCard'

const MS_DAY = 86400000

function nowMs() {
  return Date.now()
}

function inRange(iso: string | null | undefined, startMs: number, endMs: number) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= startMs && t < endMs
}

export function computeTrend(current: number, previous: number): { percent: number | null; direction: TrendDirection } {
  if (current === 0 && previous === 0) return { percent: null, direction: 'flat' }
  if (previous === 0 && current > 0) return { percent: 100, direction: 'up' }
  if (previous === 0 && current === 0) return { percent: null, direction: 'flat' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const percent = Math.min(999, Math.abs(rounded) < 1 && raw !== 0 ? Math.sign(raw) : rounded)
  const direction: TrendDirection = current > previous ? 'up' : current < previous ? 'down' : 'flat'
  return { percent, direction }
}

/** Rolling windows: current = last 30d, previous = 30d before that */
function rollingWindows() {
  const end = nowMs()
  const currentStart = end - 30 * MS_DAY
  const previousStart = end - 60 * MS_DAY
  const previousEnd = currentStart
  return { currentStart, end, previousStart, previousEnd }
}

export function countApplicationsCreatedInWindows(applications: Application[]) {
  const { currentStart, end, previousStart, previousEnd } = rollingWindows()
  const current = applications.filter(a => inRange(a.created_at, currentStart, end)).length
  const previous = applications.filter(a => inRange(a.created_at, previousStart, previousEnd)).length
  return { current, previous }
}

/** New open jobs listed (created in window, still or ever open — use created + status open) */
export function countNewOpenJobsInWindows(jobs: Job[]) {
  const { currentStart, end, previousStart, previousEnd } = rollingWindows()
  const current = jobs.filter(j => j.status === 'open' && inRange(j.created_at, currentStart, end)).length
  const previous = jobs.filter(j => j.status === 'open' && inRange(j.created_at, previousStart, previousEnd)).length
  return { current, previous }
}

export function countScheduledInterviewsInWindows(rows: InterviewAssignmentRow[]) {
  const { currentStart, end, previousStart, previousEnd } = rollingWindows()
  const inWindow = (r: InterviewAssignmentRow, start: number, stop: number) =>
    (r.status === 'scheduled' || r.status === 'pending') && inRange(r.scheduled_at, start, stop)
  const current = rows.filter(r => inWindow(r, currentStart, end)).length
  const previous = rows.filter(r => inWindow(r, previousStart, previousEnd)).length
  return { current, previous }
}

export function countOffersTouchedInWindows(applications: Application[]) {
  const { currentStart, end, previousStart, previousEnd } = rollingWindows()
  const current = applications.filter(a => a.status === 'offer' && inRange(a.updated_at, currentStart, end)).length
  const previous = applications.filter(a => a.status === 'offer' && inRange(a.updated_at, previousStart, previousEnd)).length
  return { current, previous }
}
